import * as THREE from "../vendor/three.module.js";

// PASTA MORTALE is built around a compact combat nave, not a parkour house.
// These bounds are shared with movement, combat traces, sauce depth, and tests.
const WORLD_BOUNDS = Object.freeze({
  minX: -28.5,
  maxX: 28.5,
  minY: 0,
  maxY: 18,
  minZ: -31,
  maxZ: 26
});
const TRAVERSABLE_WINDOW_ZS = Object.freeze([-24, -4, 7]);
const WINDOW_OPENING_WIDTH = 3.8;
const WINDOW_SILL_Y = 4.28;
const WINDOW_HEAD_Y = 12.35;
const UPPER_DECK_Y = 9.85;
const PLAYER_RADIUS_HINT = 0.34;
const SURFACE_EPSILON = 0.045;
const FILL_RISE_RATE = 0.014;
const MAX_FILL_RISE_RATE = 0.038;
const UP = new THREE.Vector3(0, 1, 0);

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const lerp = (a, b, amount) => a + (b - a) * amount;

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

function makeFallbackTexture(seed, kind = "pasta") {
  const random = mulberry32(seed);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const sauce = kind === "sauce";
  context.fillStyle = sauce ? "#5b1008" : kind === "wall" ? "#5a2c0d" : "#a86623";
  context.fillRect(0, 0, 512, 512);
  context.lineCap = "round";
  context.lineJoin = "round";

  if (sauce) {
    for (let index = 0; index < 180; index += 1) {
      const x = random() * 512;
      const y = random() * 512;
      const radius = 6 + random() * 46;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(255,106,45,.42)");
      gradient.addColorStop(0.45, "rgba(159,28,8,.28)");
      gradient.addColorStop(1, "rgba(47,4,2,0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.ellipse(x, y, radius, radius * (0.3 + random() * 0.55), random() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }
  } else {
    for (let index = 0; index < 540; index += 1) {
      const x = random() * 560 - 24;
      const y = random() * 560 - 24;
      const length = 25 + random() * 120;
      const angle = random() * Math.PI * 2;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(
        x + Math.cos(angle + 0.7) * length * 0.4,
        y + Math.sin(angle + 0.7) * length * 0.4,
        endX + Math.sin(angle) * (random() - 0.5) * 70,
        endY - Math.cos(angle) * (random() - 0.5) * 70,
        endX,
        endY
      );
      context.shadowColor = "rgba(28,7,0,.7)";
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 3;
      context.strokeStyle = "hsl(" + (28 + random() * 12) + " 72% " + (39 + random() * 17) + "%)";
      context.lineWidth = 4 + random() * 5;
      context.stroke();
      context.shadowColor = "transparent";
      context.strokeStyle = "rgba(255,231,166,.24)";
      context.lineWidth = 1;
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRunoffTexture(seed) {
  const random = mulberry32(seed ^ 0x5a17c9e3);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = "round";
  context.lineJoin = "round";

  for (let stream = 0; stream < 30; stream += 1) {
    const x = 7 + random() * 242;
    const sway = 4 + random() * 16;
    const phase = random() * Math.PI * 2;
    const width = 3 + random() * 11;
    context.beginPath();
    context.moveTo(x + Math.sin(phase) * sway, -48);
    for (let step = 0; step <= 12; step += 1) {
      const y = step / 12 * 608 - 48;
      context.lineTo(x + Math.sin(step * 0.82 + phase) * sway, y);
    }
    context.setLineDash([28 + random() * 58, 12 + random() * 30]);
    context.lineDashOffset = random() * 90;
    context.strokeStyle = stream % 4 === 0
      ? `rgba(255,184,78,${0.42 + random() * 0.26})`
      : `rgba(${142 + Math.floor(random() * 66)},${24 + Math.floor(random() * 24)},8,${0.34 + random() * 0.3})`;
    context.lineWidth = width;
    context.shadowColor = "rgba(255,93,20,.48)";
    context.shadowBlur = 5;
    context.stroke();
    context.setLineDash([]);

    if (stream % 3 === 0) {
      context.strokeStyle = "rgba(255,226,150,.52)";
      context.lineWidth = Math.max(1, width * 0.16);
      context.shadowColor = "transparent";
      context.stroke();
    }
  }

  context.shadowColor = "transparent";
  for (let drop = 0; drop < 72; drop += 1) {
    const x = 6 + random() * 244;
    const y = random() * 512;
    const radius = 1.5 + random() * 4.5;
    context.fillStyle = drop % 5 === 0 ? "rgba(255,221,132,.8)" : "rgba(232,71,18,.62)";
    context.beginPath();
    context.ellipse(x, y, radius * 0.62, radius * (1.8 + random()), random() * 0.16, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.45, 3.2);
  texture.needsUpdate = true;
  return texture;
}

async function loadTexture(fileName, seed, kind) {
  try {
    return await new THREE.TextureLoader().loadAsync(new URL("../assets/" + fileName, import.meta.url).href);
  } catch (_error) {
    return makeFallbackTexture(seed, kind);
  }
}

function cloneTexture(base, repeatX, repeatY, anisotropy, colorTexture = true) {
  const texture = base.clone();
  texture.wrapS = THREE.MirroredRepeatWrapping;
  texture.wrapT = THREE.MirroredRepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = anisotropy;
  texture.colorSpace = colorTexture ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeSteamTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(48, 48, 3, 48, 48, 46);
  gradient.addColorStop(0, "rgba(255,246,223,.88)");
  gradient.addColorStop(0.28, "rgba(255,190,125,.3)");
  gradient.addColorStop(0.68, "rgba(133,47,17,.09)");
  gradient.addColorStop(1, "rgba(70,12,4,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRampGeometry(minX, maxX, minZ, maxZ, axis, yAtMin, yAtMax, thickness) {
  const topY = (x, z) => {
    const coordinate = axis === "x" ? x : z;
    const minimum = axis === "x" ? minX : minZ;
    const maximum = axis === "x" ? maxX : maxZ;
    return lerp(yAtMin, yAtMax, clamp((coordinate - minimum) / Math.max(0.0001, maximum - minimum), 0, 1));
  };
  const corners = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]];
  const positions = [];
  for (const [x, z] of corners) positions.push(x, topY(x, z), z);
  for (const [x, z] of corners) positions.push(x, topY(x, z) - thickness, z);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex([
    0, 2, 1, 0, 3, 2,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7
  ]);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

const segmentPosition = new THREE.Vector3();
const segmentDirection = new THREE.Vector3();
const segmentScale = new THREE.Vector3();
const segmentQuaternion = new THREE.Quaternion();
const segmentMatrix = new THREE.Matrix4();

function setSegmentMatrix(mesh, index, start, end, radius) {
  segmentDirection.subVectors(end, start);
  const length = Math.max(0.001, segmentDirection.length());
  segmentDirection.multiplyScalar(1 / length);
  segmentPosition.addVectors(start, end).multiplyScalar(0.5);
  segmentQuaternion.setFromUnitVectors(UP, segmentDirection);
  segmentScale.set(radius, length, radius);
  segmentMatrix.compose(segmentPosition, segmentQuaternion, segmentScale);
  mesh.setMatrixAt(index, segmentMatrix);
}

export async function createSpaghettiWorld({ scene, renderer, quality = "high", seed = 1337 }) {
  if (!scene?.isScene) throw new Error("createSpaghettiWorld requires a THREE.Scene");

  const normalizedQuality = quality === "low" ? "low" : quality === "medium" ? "medium" : "high";
  const lowQuality = normalizedQuality === "low";
  const highQuality = normalizedQuality === "high";
  const random = mulberry32(Number.isFinite(seed) ? seed : 1337);
  const root = new THREE.Group();
  root.name = "Basilica Della Marinara";
  scene.add(root);

  scene.background ||= new THREE.Color(0x0d0503);
  scene.fog = new THREE.FogExp2(0x150604, lowQuality ? 0.015 : 0.0105);

  const maximumAnisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 4;
  const anisotropy = Math.max(1, Math.min(highQuality ? 12 : 5, maximumAnisotropy));
  const [wallBase, surfaceBase, sauceBase, sanctumMatteBase] = await Promise.all([
    loadTexture("gothic-pasta-lattice.png", seed + 11, "wall"),
    loadTexture("spaghetti-surface.png", seed + 23, "surface"),
    loadTexture("marinara-noodle-floor.png", seed + 37, "sauce"),
    loadTexture("basilica-sanctum-matte.png", seed + 49, "wall")
  ]);
  sanctumMatteBase.colorSpace = THREE.SRGBColorSpace;
  sanctumMatteBase.anisotropy = anisotropy;
  sanctumMatteBase.needsUpdate = true;

  const physical = (parameters) => new THREE.MeshPhysicalMaterial({
    clearcoat: lowQuality ? 0.08 : 0.42,
    clearcoatRoughness: 0.22,
    ...parameters
  });
  const wallMaterial = physical({
    name: "dense gothic noodle masonry",
    map: cloneTexture(wallBase, 4, 5, anisotropy),
    bumpMap: cloneTexture(wallBase, 4, 5, anisotropy, false),
    bumpScale: highQuality ? 0.26 : 0.13,
    color: 0xe8b972,
    roughness: 0.52,
    metalness: 0.01
  });
  const shadowPastaMaterial = physical({
    name: "smoked pasta vaults",
    map: cloneTexture(wallBase, 3, 4, anisotropy),
    bumpMap: cloneTexture(wallBase, 3, 4, anisotropy, false),
    bumpScale: 0.18,
    color: 0x6f3c20,
    emissive: 0x130402,
    roughness: 0.72,
    clearcoat: 0.16
  });
  const noodleMaterial = physical({
    name: "wet individual spaghetti",
    color: 0xe8a33e,
    emissive: 0x6d2503,
    emissiveIntensity: lowQuality ? 0.18 : 0.3,
    roughness: 0.25,
    clearcoat: lowQuality ? 0.2 : 0.74,
    clearcoatRoughness: 0.13,
    vertexColors: true
  });
  const looseNoodleMaterial = physical({
    name: "loose sauce lacquered noodles",
    map: cloneTexture(surfaceBase, 1.6, 4.4, anisotropy),
    color: 0xffc45c,
    emissive: 0x3d0b00,
    emissiveIntensity: 0.2,
    roughness: 0.21,
    clearcoat: lowQuality ? 0.2 : 0.82,
    clearcoatRoughness: 0.1
  });
  const floorMaterial = physical({
    name: "compressed spaghetti flagstones",
    map: cloneTexture(surfaceBase, 7, 11, anisotropy),
    bumpMap: cloneTexture(surfaceBase, 7, 11, anisotropy, false),
    bumpScale: highQuality ? 0.22 : 0.11,
    color: 0xa66528,
    roughness: 0.54,
    clearcoat: 0.28
  });
  const routeMaterial = physical({
    name: "polished braided pasta",
    map: cloneTexture(surfaceBase, 2.2, 2.2, anisotropy),
    bumpMap: cloneTexture(surfaceBase, 2.2, 2.2, anisotropy, false),
    bumpScale: highQuality ? 0.2 : 0.1,
    color: 0xe2a34e,
    emissive: 0x2e0b00,
    emissiveIntensity: 0.22,
    roughness: 0.29,
    clearcoat: lowQuality ? 0.22 : 0.68,
    clearcoatRoughness: 0.12
  });
  const coverMaterial = physical({
    name: "marinara soaked pasta cover",
    map: cloneTexture(surfaceBase, 2.8, 1.3, anisotropy),
    bumpMap: cloneTexture(surfaceBase, 2.8, 1.3, anisotropy, false),
    bumpScale: 0.2,
    color: 0xa95125,
    emissive: 0x260300,
    emissiveIntensity: 0.18,
    roughness: 0.36,
    clearcoat: lowQuality ? 0.16 : 0.58
  });
  const sauceMaterial = physical({
    name: "deep wet marinara flood",
    map: cloneTexture(sauceBase, 6, 9, anisotropy),
    bumpMap: cloneTexture(sauceBase, 6, 9, anisotropy, false),
    bumpScale: highQuality ? 0.17 : 0.08,
    color: 0x9d210d,
    emissive: 0x2b0301,
    emissiveIntensity: 0.32,
    roughness: 0.18,
    metalness: 0.02,
    clearcoat: lowQuality ? 0.35 : 0.92,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide
  });
  const runoffTexture = makeRunoffTexture(seed + 0x51a7);
  runoffTexture.anisotropy = anisotropy;
  runoffTexture.needsUpdate = true;
  const runoffMaterial = physical({
    name: "animated downhill marinara runoff",
    map: runoffTexture,
    color: 0xff9b55,
    emissive: 0x731300,
    emissiveIntensity: lowQuality ? 0.48 : 0.72,
    roughness: 0.13,
    metalness: 0.01,
    clearcoat: lowQuality ? 0.54 : 0.96,
    clearcoatRoughness: 0.045,
    transparent: true,
    opacity: lowQuality ? 0.76 : 0.9,
    depthWrite: false,
    alphaTest: 0.035,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const flowNoodleMaterial = physical({
    name: "sliding sauce gloss spaghetti",
    color: 0xffbd65,
    emissive: 0x7a1900,
    emissiveIntensity: lowQuality ? 0.44 : 0.68,
    roughness: 0.14,
    clearcoat: lowQuality ? 0.42 : 0.94,
    clearcoatRoughness: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: 0.96
  });
  const ironMaterial = new THREE.MeshStandardMaterial({
    name: "blackened fork iron",
    color: 0x1e120d,
    roughness: 0.5,
    metalness: 0.72
  });
  const waxMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3d8a0,
    roughness: 0.82,
    emissive: 0x4b1f03,
    emissiveIntensity: 0.18
  });
  const flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coldGlassMaterial = new THREE.MeshBasicMaterial({
    color: 0x8ecbd6,
    transparent: true,
    opacity: lowQuality ? 0.12 : 0.23,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0xb8edf1,
    transparent: true,
    opacity: 0.66,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const gateLockMaterial = new THREE.MeshStandardMaterial({
    color: 0x55110a,
    emissive: 0x7a1808,
    emissiveIntensity: 0.42,
    roughness: 0.34,
    metalness: 0.02,
    transparent: true,
    opacity: 0.9
  });
  const lockedPortalColor = new THREE.Color(0x7a2517);
  const openPortalColor = new THREE.Color(0xb8edf1);

  const colliders = [];
  const meshByColliderId = new Map();
  const traversalPlatforms = [];
  const windowPassages = [];
  const traversalRoutes = [];
  const escapeRoutes = [];
  const rampFlowDescriptors = [];
  let exitOpen = false;
  let exitOpenAmount = 0;
  let exitLockTendrils = null;

  function addBoxCollider(id, type, x, y, z, width, height, depth, options = {}) {
    const collider = {
      id,
      type,
      shape: "box",
      x,
      y,
      z,
      width,
      height,
      depth,
      minX: x - width * 0.5,
      maxX: x + width * 0.5,
      minY: y - height * 0.5,
      maxY: y + height * 0.5,
      minZ: z - depth * 0.5,
      maxZ: z + depth * 0.5,
      solid: options.solid !== false,
      occludes: options.occludes !== false,
      walkable: options.walkable !== false,
      walkableTop: options.walkable !== false,
      solidSides: options.solidSides !== false,
      mantleable: options.mantleable !== false,
      tier: options.tier ?? 0,
      tag: options.tag || type
    };
    colliders.push(collider);
    return collider;
  }

  function addBox(name, x, y, z, width, height, depth, material, colliderType = null, options = {}) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = highQuality && options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    root.add(mesh);
    if (colliderType) {
      const collider = addBoxCollider(name, colliderType, x, y, z, width, height, depth, options);
      meshByColliderId.set(collider.id, mesh);
    }
    return mesh;
  }

  function addPlatform(id, x, z, width, depth, topY, thickness = 0.46, material = routeMaterial, options = {}) {
    return addBox(id, x, topY - thickness * 0.5, z, width, thickness, depth, material, options.type || "platform", {
      tier: options.tier ?? Math.floor(topY / 4),
      mantleable: options.mantleable !== false,
      walkable: options.walkable !== false,
      castShadow: options.castShadow,
      tag: options.tag || "route"
    });
  }

  function registerTraversalPlatform(id, x, z, width, depth, topY, kind = "platform") {
    const inset = Math.min(0.7, width * 0.08, depth * 0.08);
    traversalPlatforms.push({
      id,
      kind,
      x,
      z,
      width,
      depth,
      topY,
      area: width * depth,
      samples: [
        { x, y: topY, z },
        { x: x - width * 0.5 + inset, y: topY, z: z - depth * 0.5 + inset },
        { x: x + width * 0.5 - inset, y: topY, z: z - depth * 0.5 + inset },
        { x: x - width * 0.5 + inset, y: topY, z: z + depth * 0.5 - inset },
        { x: x + width * 0.5 - inset, y: topY, z: z + depth * 0.5 - inset }
      ]
    });
  }

  function addRamp(id, specification, material = routeMaterial) {
    const {
      minX, maxX, minZ, maxZ, axis, yAtMin, yAtMax,
      thickness = 0.34, tier = 0, tag = "stair", visualSteps = 0
    } = specification;
    const geometry = makeRampGeometry(minX, maxX, minZ, maxZ, axis, yAtMin, yAtMax, thickness);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = id;
    mesh.castShadow = highQuality;
    mesh.receiveShadow = true;
    root.add(mesh);
    const collider = {
      id,
      type: "ramp",
      shape: "ramp",
      axis,
      minX,
      maxX,
      minZ,
      maxZ,
      minY: Math.min(yAtMin, yAtMax) - thickness,
      maxY: Math.max(yAtMin, yAtMax),
      yAtMin,
      yAtMax,
      lowY: Math.min(yAtMin, yAtMax),
      highY: Math.max(yAtMin, yAtMax),
      direction: yAtMin <= yAtMax ? 1 : -1,
      thickness,
      solid: true,
      occludes: true,
      walkable: true,
      walkableTop: true,
      solidSides: true,
      mantleable: true,
      tier,
      tag,
      surfaceYAt(x, z) {
        const coordinate = axis === "x" ? x : z;
        const minimum = axis === "x" ? minX : minZ;
        const maximum = axis === "x" ? maxX : maxZ;
        return lerp(yAtMin, yAtMax, clamp((coordinate - minimum) / Math.max(0.0001, maximum - minimum), 0, 1));
      }
    };
    collider.x = (minX + maxX) * 0.5;
    collider.y = (collider.minY + collider.maxY) * 0.5;
    collider.z = (minZ + maxZ) * 0.5;
    collider.width = maxX - minX;
    collider.height = collider.maxY - collider.minY;
    collider.depth = maxZ - minZ;
    colliders.push(collider);
    meshByColliderId.set(collider.id, mesh);
    rampFlowDescriptors.push({
      id,
      tag,
      axis,
      minX,
      maxX,
      minZ,
      maxZ,
      yAtMin,
      yAtMax,
      visualSteps,
      downhillSign: yAtMin > yAtMax ? 1 : -1
    });
    return mesh;
  }

  function addWindowedSideWall(side) {
    const x = side * 21.72;
    const sideName = side < 0 ? "west" : "east";
    const wallMinZ = -31;
    const wallMaxZ = 26;
    const fullDepth = wallMaxZ - wallMinZ;
    const wallCenterZ = (wallMinZ + wallMaxZ) * 0.5;
    addBox(`${sideName} basilica sill wall`, x, WINDOW_SILL_Y * 0.5, wallCenterZ, 0.56, WINDOW_SILL_Y, fullDepth, wallMaterial, "wall", {
      walkable: false,
      mantleable: false,
      tag: "shell-sill"
    });
    addBox(`${sideName} basilica crown wall`, x, (WINDOW_HEAD_Y + 17.4) * 0.5, wallCenterZ, 0.56, 17.4 - WINDOW_HEAD_Y, fullDepth, wallMaterial, "wall", {
      walkable: false,
      mantleable: false,
      tag: "shell-crown"
    });

    const halfOpening = WINDOW_OPENING_WIDTH * 0.5;
    const verticalCenter = (WINDOW_SILL_Y + WINDOW_HEAD_Y) * 0.5;
    const verticalHeight = WINDOW_HEAD_Y - WINDOW_SILL_Y;
    let cursor = wallMinZ;
    for (const centerZ of [...TRAVERSABLE_WINDOW_ZS].sort((a, b) => a - b)) {
      const openingMin = centerZ - halfOpening;
      const openingMax = centerZ + halfOpening;
      if (openingMin > cursor) {
        addBox(
          `${sideName} basilica window pier ${cursor.toFixed(1)} ${openingMin.toFixed(1)}`,
          x,
          verticalCenter,
          (cursor + openingMin) * 0.5,
          0.56,
          verticalHeight,
          openingMin - cursor,
          wallMaterial,
          "wall",
          { walkable: false, mantleable: false, tag: "shell-pier" }
        );
      }
      cursor = openingMax;
    }
    if (cursor < wallMaxZ) {
      addBox(
        `${sideName} basilica window pier ${cursor.toFixed(1)} ${wallMaxZ.toFixed(1)}`,
        x,
        verticalCenter,
        (cursor + wallMaxZ) * 0.5,
        0.56,
        verticalHeight,
        wallMaxZ - cursor,
        wallMaterial,
        "wall",
        { walkable: false, mantleable: false, tag: "shell-pier" }
      );
    }
  }

  const noodleSegments = [];
  const ringInstances = [];
  const candleInstances = [];
  const flameInstances = [];
  const animatedLights = [];
  const knotMeshes = [];

  function pushSegment(start, end, radius = 0.05, tone = 0.5) {
    noodleSegments.push({
      start: start.clone ? start.clone() : new THREE.Vector3(start[0], start[1], start[2]),
      end: end.clone ? end.clone() : new THREE.Vector3(end[0], end[1], end[2]),
      radius,
      tone
    });
  }

  function pushPolyline(points, radius, tone = 0.5) {
    for (let index = 1; index < points.length; index += 1) {
      pushSegment(points[index - 1], points[index], radius, tone);
    }
  }

  function dressCoverFace(x, z, width, height, depth, seedOffset = 0) {
    const rows = highQuality ? 10 : lowQuality ? 4 : 7;
    const pieces = highQuality ? 7 : lowQuality ? 4 : 6;
    for (let row = 0; row < rows; row += 1) {
      const rowY = 0.12 + (row / Math.max(1, rows - 1)) * Math.max(0.16, height - 0.24);
      const points = [];
      for (let piece = 0; piece <= pieces; piece += 1) {
        const amount = piece / pieces;
        points.push(new THREE.Vector3(
          x + (amount - 0.5) * (width - 0.14),
          rowY + Math.sin(amount * 8.4 + row * 1.7 + seedOffset) * 0.055,
          z + depth * 0.5 + 0.035 + Math.cos(amount * 6.2 + row + seedOffset) * 0.025
        ));
      }
      pushPolyline(points, 0.033 + (row % 3) * 0.006, 0.55 + (row % 4) * 0.1);
    }
  }

  function pushCurve(curve, pieces, radius, tone = 0.5) {
    pushPolyline(curve.getPoints(pieces), radius, tone);
  }

  function pushRing(x, y, z, radius, rotationX = Math.PI * 0.5, rotationY = 0, rotationZ = 0, thicknessScale = 1) {
    ringInstances.push({ x, y, z, radius, rotationX, rotationY, rotationZ, thicknessScale });
  }

  function addArchAcrossNave(z, span, baseY, apexY, bundles = 3) {
    const steps = highQuality ? 14 : lowQuality ? 7 : 10;
    for (let strand = 0; strand < bundles; strand += 1) {
      const spread = (strand - (bundles - 1) * 0.5) * 0.18;
      const depth = z + spread;
      const radius = 0.075 + strand * 0.008;
      const left = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-span * 0.5, baseY, depth),
        new THREE.Vector3(-span * 0.27, apexY * 0.9, depth + Math.sin(strand) * 0.05),
        new THREE.Vector3(0, apexY, depth)
      );
      const right = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, apexY, depth),
        new THREE.Vector3(span * 0.27, apexY * 0.9, depth - Math.sin(strand) * 0.05),
        new THREE.Vector3(span * 0.5, baseY, depth)
      );
      pushCurve(left, steps, radius, 0.35 + strand * 0.15);
      pushCurve(right, steps, radius, 0.42 + strand * 0.15);
    }
  }

  function addSideArch(x, centerZ, span, baseY, apexY, facing = 1) {
    const steps = highQuality ? 12 : lowQuality ? 6 : 9;
    for (let strand = 0; strand < (lowQuality ? 1 : 2); strand += 1) {
      const sideOffset = facing * strand * 0.12;
      const curveA = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x + sideOffset, baseY, centerZ - span * 0.5),
        new THREE.Vector3(x + sideOffset, apexY * 0.88, centerZ - span * 0.23),
        new THREE.Vector3(x + sideOffset, apexY, centerZ)
      );
      const curveB = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x + sideOffset, apexY, centerZ),
        new THREE.Vector3(x + sideOffset, apexY * 0.88, centerZ + span * 0.23),
        new THREE.Vector3(x + sideOffset, baseY, centerZ + span * 0.5)
      );
      pushCurve(curveA, steps, 0.065 + strand * 0.015, 0.35);
      pushCurve(curveB, steps, 0.065 + strand * 0.015, 0.54);
    }
  }

  function addBraidedColumn(id, x, z, height = 15.2, radius = 0.72, solid = true) {
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.78, radius, height, highQuality ? 18 : 10, 2),
      shadowPastaMaterial
    );
    core.name = id + " dense core";
    core.position.set(x, height * 0.5, z);
    core.castShadow = highQuality;
    core.receiveShadow = true;
    root.add(core);

    const strandCount = highQuality ? 7 : lowQuality ? 3 : 5;
    const segments = highQuality ? 24 : lowQuality ? 11 : 17;
    for (let strand = 0; strand < strandCount; strand += 1) {
      const points = [];
      const phase = strand / strandCount * Math.PI * 2;
      for (let piece = 0; piece <= segments; piece += 1) {
        const amount = piece / segments;
        const angle = phase + amount * Math.PI * (4.5 + (strand % 2) * 0.5);
        const swell = radius * (0.9 + Math.sin(amount * Math.PI) * 0.1);
        points.push(new THREE.Vector3(
          x + Math.cos(angle) * swell,
          0.12 + amount * (height - 0.24),
          z + Math.sin(angle) * swell
        ));
      }
      pushPolyline(points, 0.055 + (strand % 2) * 0.014, 0.25 + strand / strandCount * 0.6);
    }
    pushRing(x, 0.22, z, radius * 1.28);
    pushRing(x, 0.46, z, radius * 1.12);
    pushRing(x, height - 0.48, z, radius * 1.12);
    pushRing(x, height - 0.22, z, radius * 1.3);
    if (solid) {
      addBoxCollider(id, "column", x, height * 0.5, z, radius * 1.68, height, radius * 1.68, {
        walkable: false,
        mantleable: false,
        tag: "column-cover"
      });
    }
  }

  function addCandleCluster(x, y, z, count = 5, spread = 0.75, lightColor = 0xff9b44) {
    for (let index = 0; index < count; index += 1) {
      const angle = index / Math.max(1, count) * Math.PI * 2 + random() * 0.35;
      const radius = index === 0 ? 0 : spread * (0.35 + random() * 0.65);
      const height = 0.25 + random() * 0.42;
      const px = x + Math.cos(angle) * radius;
      const pz = z + Math.sin(angle) * radius;
      candleInstances.push({ x: px, y: y + height * 0.5, z: pz, sx: 0.08 + random() * 0.035, sy: height, sz: 0.08 + random() * 0.035 });
      flameInstances.push({ x: px, y: y + height + 0.09, z: pz, sx: 0.07, sy: 0.16 + random() * 0.05, sz: 0.07 });
    }
    if (!lowQuality || animatedLights.length < 4) {
      const light = new THREE.PointLight(lightColor, lowQuality ? 4.5 : 8.5, lowQuality ? 5 : 7, 1.8);
      light.position.set(x, y + 1.15, z);
      light.userData.baseIntensity = light.intensity;
      light.userData.phase = random() * Math.PI * 2;
      animatedLights.push(light);
      root.add(light);
    }
  }

  function addCrownBeacon(id, x, y, z) {
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 1),
      coldGlassMaterial.clone()
    );
    beacon.name = id;
    beacon.position.set(x, y, z);
    beacon.scale.set(0.76, 2, 0.76);
    beacon.material.opacity = lowQuality ? 0.42 : 0.64;
    root.add(beacon);
    if (!lowQuality || animatedLights.length < 7) {
      const light = new THREE.PointLight(0x9beeff, lowQuality ? 3.2 : 6, 7.5, 1.7);
      light.position.set(x, y, z);
      light.userData.baseIntensity = light.intensity;
      light.userData.phase = random() * Math.PI * 2;
      animatedLights.push(light);
      root.add(light);
    }
  }

  function addChandelier(x, z, hangY = 11.5, ringRadius = 2.25) {
    pushSegment(new THREE.Vector3(x, 17.35, z), new THREE.Vector3(x, hangY + 1.25, z), 0.07, 0.3);
    pushRing(x, hangY, z, ringRadius, Math.PI * 0.5, 0, 0, 1.25);
    pushRing(x, hangY - 0.18, z, ringRadius * 0.74, Math.PI * 0.5, 0.32, 0, 0.85);
    for (let arm = 0; arm < 8; arm += 1) {
      const angle = arm / 8 * Math.PI * 2;
      const rim = new THREE.Vector3(x + Math.cos(angle) * ringRadius, hangY, z + Math.sin(angle) * ringRadius);
      pushSegment(new THREE.Vector3(x, hangY + 1.05, z), rim, 0.045, 0.5 + arm * 0.04);
      candleInstances.push({ x: rim.x, y: hangY + 0.2, z: rim.z, sx: 0.07, sy: 0.42, sz: 0.07 });
      flameInstances.push({ x: rim.x, y: hangY + 0.53, z: rim.z, sx: 0.07, sy: 0.18, sz: 0.07 });
    }
    const light = new THREE.PointLight(0xffa14d, lowQuality ? 11 : 24, 18, 1.7);
    light.position.set(x, hangY + 0.45, z);
    light.userData.baseIntensity = light.intensity;
    light.userData.phase = random() * Math.PI * 2;
    animatedLights.push(light);
    root.add(light);
  }

  function addKnotPile(name, x, y, z, scale, material = coverMaterial, collider = null) {
    const geometry = new THREE.TorusKnotGeometry(
      0.78,
      0.23,
      highQuality ? 88 : lowQuality ? 38 : 60,
      highQuality ? 10 : 7,
      2,
      5
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.rotation.set(random() * 0.8, random() * Math.PI, random() * 0.5);
    mesh.scale.set(scale * (0.9 + random() * 0.16), scale * (0.72 + random() * 0.2), scale);
    mesh.castShadow = highQuality;
    mesh.receiveShadow = true;
    root.add(mesh);
    knotMeshes.push(mesh);
    if (collider) {
      addBoxCollider(name, collider.type || "cover", x, collider.y, z, collider.width, collider.height, collider.depth, {
        walkable: collider.walkable === true,
        mantleable: collider.mantleable !== false,
        tag: collider.tag || "tangle-cover"
      });
    }
    return mesh;
  }

  // --- Authored combat shell ------------------------------------------------
  addBox("sauce nave floor", 0, -0.28, -2.5, 44, 0.56, 57, floorMaterial, "floor", {
    tier: 0,
    mantleable: false,
    tag: "ground"
  });
  addWindowedSideWall(-1);
  addWindowedSideWall(1);
  addBox("entry wall", 0, 8.7, 25.72, 44, 17.4, 0.56, wallMaterial, "wall", {
    walkable: false,
    mantleable: false,
    tag: "shell"
  });
  addBox("sanctum wall", 0, 8.7, -30.72, 44, 17.4, 0.56, shadowPastaMaterial, "wall", {
    walkable: false,
    mantleable: false,
    tag: "shell"
  });
  addBox("ribbed black pasta vault", 0, 17.75, -2.5, 44, 0.5, 57, shadowPastaMaterial, "ceiling", {
    walkable: false,
    mantleable: false,
    tag: "vault",
    castShadow: false
  });

  // A fogged environment matte extends the physical altar into the same dense,
  // photoreal noodle architecture as the reference. Real stairs, cover, arches,
  // lights, enemies, and collisions remain in front of it.
  const sanctumMatte = new THREE.Mesh(
    new THREE.PlaneGeometry(30.8, 17.32),
    new THREE.MeshBasicMaterial({
      name: "fogged photoreal spaghetti sanctum matte",
      map: sanctumMatteBase,
      color: 0xf2d2b4,
      toneMapped: true,
      fog: true,
      depthWrite: true
    })
  );
  sanctumMatte.name = "distant Basilica Della Marinara sanctum";
  sanctumMatte.position.set(0, 8.72, -30.39);
  sanctumMatte.receiveShadow = false;
  root.add(sanctumMatte);

  // Side galleries create elevated crossfire lanes without making the location
  // feel like a stack of floating parkour platforms.
  addPlatform("west choir gallery", -18.2, 1.5, 6.4, 30, 4.35, 0.52, routeMaterial, { tier: 1, tag: "gallery" });
  addPlatform("east choir gallery", 18.2, 1.5, 6.4, 30, 4.35, 0.52, routeMaterial, { tier: 1, tag: "gallery" });
  addRamp("west choir stair", {
    minX: -21.35, maxX: -15.4, minZ: 16.2, maxZ: 23.2,
    axis: "z", yAtMin: 4.35, yAtMax: 0, tier: 1, tag: "gallery-stair"
  });
  addRamp("east choir stair", {
    minX: 15.4, maxX: 21.35, minZ: 16.2, maxZ: 23.2,
    axis: "z", yAtMin: 4.35, yAtMax: 0, tier: 1, tag: "gallery-stair"
  });

  // The ascension deck is a real second arena rather than distant scenery.
  // Two broad ramps climb directly from the foyer. The original window loops
  // now feed twin outside causeways and a high apse, so the upper arena remains
  // a real extraction route after the lower altar disappears under the flood.
  addRamp("west ascension ramp", {
    minX: -12, maxX: -6, minZ: 10.5, maxZ: 24,
    axis: "z", yAtMin: UPPER_DECK_Y, yAtMax: 0, tier: 2, tag: "ascension-ramp"
  });
  addRamp("east ascension ramp", {
    minX: 6, maxX: 12, minZ: 10.5, maxZ: 24,
    axis: "z", yAtMin: UPPER_DECK_Y, yAtMax: 0, tier: 2, tag: "ascension-ramp"
  });
  addPlatform("ascension grand deck", 0, 1.5, 34, 18, UPPER_DECK_Y, 0.72, routeMaterial, {
    tier: 2,
    tag: "upper-arena"
  });
  registerTraversalPlatform("ascension grand deck", 0, 1.5, 34, 18, UPPER_DECK_Y, "upper-arena");

  for (const side of [-1, 1]) {
    const sideName = side < 0 ? "west" : "east";
    const balconyX = side * 24.45;
    addPlatform(`${sideName} lower exterior pasta balcony`, balconyX, 1.5, 5.35, 20.5, 4.35, 0.55, shadowPastaMaterial, {
      tier: 1,
      tag: "exterior-window-route"
    });
    addPlatform(`${sideName} upper exterior pasta balcony`, balconyX, 1.5, 5.35, 20.5, UPPER_DECK_Y, 0.62, routeMaterial, {
      tier: 2,
      tag: "upper-exterior-window-route"
    });
    registerTraversalPlatform(`${sideName} upper exterior pasta balcony`, balconyX, 1.5, 5.35, 20.5, UPPER_DECK_Y, "exterior-balcony");

    addPlatform(`${sideName} lower flying buttress causeway`, balconyX, -18.35, 5.35, 20.5, 4.35, 0.55, shadowPastaMaterial, {
      tier: 1,
      tag: "lower-flood-escape"
    });
    addPlatform(`${sideName} flood escape causeway`, balconyX, -18.35, 5.35, 20.5, UPPER_DECK_Y, 0.62, routeMaterial, {
      tier: 2,
      tag: "flood-escape"
    });
    registerTraversalPlatform(`${sideName} flood escape causeway`, balconyX, -18.35, 5.35, 20.5, UPPER_DECK_Y, "flood-escape-causeway");
    addSideArch(balconyX, -18.35, 20, 0.28, 9.18, side < 0 ? 1 : -1);

    addBox(`${sideName} lower exterior balustrade`, side * 27.28, 4.9, 1.5, 0.34, 1.1, 20.5, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tier: 1,
      tag: "exterior-rail"
    });
    addBox(`${sideName} upper exterior balustrade`, side * 27.28, UPPER_DECK_Y + 0.55, 1.5, 0.34, 1.1, 20.5, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tier: 2,
      tag: "upper-exterior-rail"
    });
    addBox(`${sideName} lower causeway balustrade`, side * 27.28, 4.9, -18.35, 0.34, 1.1, 20.5, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tier: 1,
      tag: "lower-flood-escape-rail"
    });
    addBox(`${sideName} upper causeway balustrade`, side * 27.28, UPPER_DECK_Y + 0.55, -18.35, 0.34, 1.1, 20.5, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tier: 2,
      tag: "flood-escape-rail"
    });
    addBox(`${sideName} lower causeway end rail`, balconyX, 4.9, -28.34, 5.35, 1.1, 0.34, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tier: 1,
      tag: "lower-flood-escape-rail"
    });
    addBox(`${sideName} upper causeway end rail`, balconyX, UPPER_DECK_Y + 0.55, -28.34, 5.35, 1.1, 0.34, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tier: 2,
      tag: "flood-escape-rail"
    });

    for (const [index, z] of [-11.5, -18.6, -25.1].entries()) {
      addCrownBeacon(`${sideName} crown route beacon ${index + 1}`, side * 26.42, UPPER_DECK_Y + 0.82, z);
    }

    for (const z of TRAVERSABLE_WINDOW_ZS) {
      addPlatform(`${sideName} lower window bridge ${z}`, side * 21.72, z, 1.7, WINDOW_OPENING_WIDTH - 0.3, 4.35, 0.48, routeMaterial, {
        tier: 1,
        tag: "window-bridge"
      });
      addPlatform(`${sideName} upper window transept ${z}`, side * 19.75, z, 5.6, WINDOW_OPENING_WIDTH - 0.3, UPPER_DECK_Y, 0.52, routeMaterial, {
        tier: 2,
        tag: "upper-window-bridge"
      });
      if (z === -24) {
        addPlatform(`${sideName} lower sanctum transept`, side * 19, z, 4.9, WINDOW_OPENING_WIDTH - 0.3, 4.35, 0.5, routeMaterial, {
          tier: 1,
          tag: "lower-sanctum-window-route"
        });
      }
      windowPassages.push({
        id: `${sideName}-lower-window-${z}`,
        side: sideName,
        level: "gallery",
        z,
        width: WINDOW_OPENING_WIDTH,
        height: WINDOW_HEAD_Y - WINDOW_SILL_Y,
        wallAxis: "x",
        wallCoordinate: side * 21.72,
        inside: { x: side * 20.92, y: 4.35, z },
        outside: { x: side * 22.52, y: 4.35, z }
      });
      windowPassages.push({
        id: `${sideName}-upper-window-${z}`,
        side: sideName,
        level: "ascension",
        z,
        width: WINDOW_OPENING_WIDTH,
        height: WINDOW_HEAD_Y - WINDOW_SILL_Y,
        wallAxis: "x",
        wallCoordinate: side * 21.72,
        inside: { x: side * 20.92, y: UPPER_DECK_Y, z },
        outside: { x: side * 22.52, y: UPPER_DECK_Y, z }
      });
    }
  }

  // A broad upper apse catches both exterior causeways through the new sanctum
  // windows. It hangs above the boss altar and reaches the upper band of the
  // same extraction gate without ever descending through the sauce.
  for (const side of [-1, 1]) {
    const sideName = side < 0 ? "west" : "east";
    addPlatform(`${sideName} upper apse wing`, side * 14, -25.6, 17.4, 9.2, UPPER_DECK_Y, 0.68, shadowPastaMaterial, {
      tier: 2,
      tag: "flood-escape-apse"
    });
    registerTraversalPlatform(`${sideName} upper apse wing`, side * 14, -25.6, 17.4, 9.2, UPPER_DECK_Y, "flood-escape-apse");
  }
  addPlatform("central crown extraction apse", 0, -25.6, 12.2, 9.2, UPPER_DECK_Y, 0.74, routeMaterial, {
    tier: 2,
    tag: "upper-extraction"
  });
  registerTraversalPlatform("central crown extraction apse", 0, -25.6, 12.2, 9.2, UPPER_DECK_Y, "upper-extraction");
  addBox("upper apse south west rail", -12.5, UPPER_DECK_Y + 0.56, -30.02, 20, 1.12, 0.34, coverMaterial, "cover", {
    walkable: false,
    mantleable: true,
    tier: 2,
    tag: "upper-extraction-rail"
  });
  addBox("upper apse south east rail", 12.5, UPPER_DECK_Y + 0.56, -30.02, 20, 1.12, 0.34, coverMaterial, "cover", {
    walkable: false,
    mantleable: true,
    tier: 2,
    tag: "upper-extraction-rail"
  });
  addCrownBeacon("west upper apse beacon", -5.15, UPPER_DECK_Y + 0.86, -27.2);
  addCrownBeacon("east upper apse beacon", 5.15, UPPER_DECK_Y + 0.86, -27.2);
  addCrownBeacon("west upper extraction beacon", -2.72, UPPER_DECK_Y + 1.02, -28.88);
  addCrownBeacon("east upper extraction beacon", 2.72, UPPER_DECK_Y + 1.02, -28.88);

  addBox("ascension altar cover", 0, UPPER_DECK_Y + 0.64, 2.1, 6.8, 1.28, 1.45, coverMaterial, "cover", {
    walkable: false,
    mantleable: true,
    tier: 2,
    tag: "upper-combat-cover"
  });
  addBox("west ascension reliquary", -10.8, UPPER_DECK_Y + 0.7, -3.2, 3.2, 1.4, 2.1, coverMaterial, "cover", {
    walkable: false,
    mantleable: true,
    tier: 2,
    tag: "upper-combat-cover"
  });
  addBox("east ascension reliquary", 10.8, UPPER_DECK_Y + 0.7, -3.2, 3.2, 1.4, 2.1, coverMaterial, "cover", {
    walkable: false,
    mantleable: true,
    tier: 2,
    tag: "upper-combat-cover"
  });
  for (const [id, x, z, width, depth] of [
    ["ascension south balustrade", 0, -7.28, 33.5, 0.34],
    ["ascension north west balustrade", -14.65, 10.28, 4.65, 0.34],
    ["ascension north center balustrade", 0, 10.28, 11.25, 0.34],
    ["ascension north east balustrade", 14.65, 10.28, 4.65, 0.34]
  ]) {
    addBox(id, x, UPPER_DECK_Y + 0.53, z, width, 1.06, depth, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tier: 2,
      tag: "upper-arena-rail"
    });
  }

  const upperRouteNodes = (x) => [
    { x, y: UPPER_DECK_Y, z: 10.35 },
    { x, y: 8.2, z: 12.75 },
    { x, y: 6.52, z: 15.05 },
    { x, y: 4.84, z: 17.35 },
    { x, y: 2.93, z: 19.98 },
    { x, y: 0.4, z: 23.45 },
    { x: x < 0 ? -5.2 : 5.2, y: 0, z: 24.05 }
  ];
  traversalRoutes.push({ id: "westUpper", waypoints: upperRouteNodes(-9) });
  traversalRoutes.push({ id: "eastUpper", waypoints: upperRouteNodes(9) });

  const floodEscapeNodes = (side) => [
    { x: side * 14.5, y: UPPER_DECK_Y, z: -4 },
    { x: side * 20.45, y: UPPER_DECK_Y, z: -4 },
    { x: side * 24.45, y: UPPER_DECK_Y, z: -4 },
    { x: side * 24.45, y: UPPER_DECK_Y, z: -11.5 },
    { x: side * 24.45, y: UPPER_DECK_Y, z: -18.5 },
    { x: side * 24.45, y: UPPER_DECK_Y, z: -24 },
    { x: side * 20.45, y: UPPER_DECK_Y, z: -24 },
    { x: side * 14, y: UPPER_DECK_Y, z: -24 },
    { x: side * 5.65, y: UPPER_DECK_Y, z: -24 },
    { x: 0, y: UPPER_DECK_Y, z: -26.2 },
    { x: 0, y: UPPER_DECK_Y, z: -29.25 }
  ];
  for (const side of [-1, 1]) {
    const sideName = side < 0 ? "west" : "east";
    const routeEntry = {
      id: `${sideName}FloodEscape`,
      side: sideName,
      exterior: true,
      minimumY: UPPER_DECK_Y,
      waypoints: floodEscapeNodes(side)
    };
    escapeRoutes.push(routeEntry);
    traversalRoutes.push(routeEntry);
  }

  // The visual stair is stepped, while one continuous ramp collider keeps the
  // FPS controller from snagging on sixteen tiny edges.
  addRamp("grand marinara stair collision", {
    minX: -5.4, maxX: 5.4, minZ: -22.2, maxZ: -11.2,
    axis: "z", yAtMin: 4.35, yAtMax: 0, tier: 1, tag: "grand-stair", visualSteps: 16
  }, shadowPastaMaterial);
  const grandStepCount = 16;
  const grandStepDepth = 11 / grandStepCount;
  for (let index = 0; index < grandStepCount; index += 1) {
    const top = (index + 1) / grandStepCount * 4.35;
    const southEdge = -11.2 - index * grandStepDepth;
    addBox(
      "grand pasta stair tread " + (index + 1),
      0,
      top * 0.5 + 0.018,
      southEdge - grandStepDepth * 0.5,
      10.82,
      top,
      grandStepDepth + 0.035,
      routeMaterial,
      null,
      { castShadow: index % 2 === 0 }
    );
    const lipBundles = highQuality ? 4 : lowQuality ? 1 : 2;
    for (let bundle = 0; bundle < lipBundles; bundle += 1) {
      const points = [];
      const pieces = highQuality ? 10 : lowQuality ? 5 : 7;
      for (let piece = 0; piece <= pieces; piece += 1) {
        const amount = piece / pieces;
        points.push(new THREE.Vector3(
          lerp(-5.25, 5.25, amount),
          top - 0.025 - bundle * 0.045 + Math.sin(amount * 9 + index + bundle) * 0.022,
          southEdge + 0.025 + Math.cos(amount * 7 + bundle) * 0.018
        ));
      }
      pushPolyline(points, 0.032 + bundle * 0.004, 0.68 + bundle * 0.07);
    }
  }
  // Braided side rails and balusters make the grand ascent read as constructed
  // pasta at first-person distance, not merely a staircase wearing a texture.
  for (const side of [-1, 1]) {
    for (let strand = 0; strand < (highQuality ? 4 : lowQuality ? 2 : 3); strand += 1) {
      const points = [];
      for (let piece = 0; piece <= grandStepCount; piece += 1) {
        const amount = piece / grandStepCount;
        points.push(new THREE.Vector3(
          side * (5.38 + strand * 0.055) + Math.sin(piece * 0.9 + strand) * 0.035,
          0.72 + amount * 4.35 + strand * 0.035,
          -11.2 - amount * 11
        ));
      }
      pushPolyline(points, 0.047 + strand * 0.006, 0.66 + strand * 0.08);
    }
    for (let step = 0; step <= grandStepCount; step += 2) {
      const amount = step / grandStepCount;
      const floorY = amount * 4.35;
      pushSegment(
        new THREE.Vector3(side * 5.42, floorY + 0.05, -11.2 - amount * 11),
        new THREE.Vector3(side * 5.42, floorY + 0.78, -11.2 - amount * 11),
        0.043,
        0.72
      );
    }
  }
  addPlatform("boss altar landing", 0, -26.25, 15.4, 8.4, 4.35, 0.55, routeMaterial, {
    tier: 1,
    tag: "altar"
  });
  addPlatform("west altar wing", -14.2, -24.2, 13, 12, 4.35, 0.52, shadowPastaMaterial, {
    tier: 1,
    tag: "altar-wing"
  });
  addPlatform("east altar wing", 14.2, -24.2, 13, 12, 4.35, 0.52, shadowPastaMaterial, {
    tier: 1,
    tag: "altar-wing"
  });

  // Gallery and altar balustrades are chest-high tactical cover.
  for (const x of [-15.25, 15.25]) {
    addBox("choir balustrade " + x, x, 4.9, 1.4, 0.34, 1.1, 29.5, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tier: 1,
      tag: "gallery-cover"
    });
  }
  addBox("west altar balustrade", -9.4, 4.92, -22.2, 8.2, 1.14, 0.42, coverMaterial, "cover", {
    walkable: false,
    tier: 1,
    tag: "altar-cover"
  });
  addBox("east altar balustrade", 9.4, 4.92, -22.2, 8.2, 1.14, 0.42, coverMaterial, "cover", {
    walkable: false,
    tier: 1,
    tag: "altar-cover"
  });

  // Deliberate cover clusters leave the central and two side lanes readable.
  addBox("debug-cover-braised-table", 0, 0.86, 7.6, 5.4, 1.72, 1.32, coverMaterial, "cover", {
    walkable: false,
    mantleable: true,
    tag: "debug-cover"
  });
  dressCoverFace(0, 7.6, 5.4, 1.72, 1.32, 1.8);
  addKnotPile("braised table spaghetti crown", 0, 1.64, 7.6, 1.45, looseNoodleMaterial);
  const coverData = [
    ["west ossuary pew one", -7.4, 0.58, 12.5, 4.1, 1.16, 1.15],
    ["east ossuary pew one", 7.4, 0.58, 12.5, 4.1, 1.16, 1.15],
    ["west ossuary pew two", -8.8, 0.68, 2.2, 4.8, 1.36, 1.3],
    ["east ossuary pew two", 8.8, 0.68, 2.2, 4.8, 1.36, 1.3],
    ["west ossuary pew three", -6.7, 0.63, -6.1, 4.4, 1.26, 1.25],
    ["east ossuary pew three", 6.7, 0.63, -6.1, 4.4, 1.26, 1.25],
    ["left sauce reliquary", -12.3, 0.82, -10.5, 2.8, 1.64, 2.2],
    ["right sauce reliquary", 12.3, 0.82, -10.5, 2.8, 1.64, 2.2]
  ];
  for (const [name, x, y, z, width, height, depth] of coverData) {
    addBox(name, x, y, z, width, height, depth, coverMaterial, "cover", {
      walkable: false,
      mantleable: true,
      tag: "combat-cover"
    });
    dressCoverFace(x, z, width, height, depth, x * 0.3 + z * 0.12);
    if (!lowQuality) {
      const coil = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.48, 0.12, highQuality ? 56 : 38, 7, 2, 5),
        looseNoodleMaterial
      );
      coil.position.set(x, y + height * 0.45, z);
      coil.rotation.set(Math.PI * 0.5, random() * Math.PI, 0);
      coil.scale.set(width * 0.52, 0.8, depth * 0.55);
      coil.castShadow = highQuality;
      root.add(coil);
      knotMeshes.push(coil);
    }
  }

  // Braided load-bearing columns dominate the silhouette at human scale.
  for (const z of [15.5, 5.2, -5.2, -15.4]) {
    addBraidedColumn("west nave bundle " + z, -13.8, z, 15.8, z === -15.4 ? 0.9 : 0.74);
    addBraidedColumn("east nave bundle " + z, 13.8, z, 15.8, z === -15.4 ? 0.9 : 0.74);
  }
  addBraidedColumn("west altar sentinel", -8.2, -25.4, 12.8, 0.82);
  addBraidedColumn("east altar sentinel", 8.2, -25.4, 12.8, 0.82);

  // Gothic pointed ribs make the nave read as an actual pasta cathedral.
  for (const z of [17.5, 7.1, -3.3, -13.7]) {
    addArchAcrossNave(z, 29.2, 0.35, 16.45, highQuality ? 4 : lowQuality ? 2 : 3);
  }
  // Nested lower arches give the sightline the dense, layered noodle depth of
  // the key art instead of leaving one enormous empty vaulted volume.
  for (const z of [8.2, -3.1, -14.2]) {
    addArchAcrossNave(z, 12.4, 0.28, 8.6, highQuality ? 3 : lowQuality ? 2 : 3);
  }
  for (const x of [-21.28, 21.28]) {
    const facing = x < 0 ? 1 : -1;
    for (const z of [18, 7, -4, -15, -25]) addSideArch(x, z, 9.1, 0.4, 10.8, facing);
  }

  // Hundreds of vertical/woven strands break the wall planes into genuine
  // noodle masonry close to the camera.
  const wallStrandSpacing = highQuality ? 0.52 : lowQuality ? 1.4 : 0.84;
  for (const x of [-21.35, 21.35]) {
    const strandCount = Math.floor(56 / wallStrandSpacing);
    for (let index = 0; index <= strandCount; index += 1) {
      const z = -30 + index * wallStrandSpacing;
      if (TRAVERSABLE_WINDOW_ZS.some((openingZ) => Math.abs(z - openingZ) < WINDOW_OPENING_WIDTH * 0.5)) continue;
      const points = [];
      const pieces = highQuality ? 9 : lowQuality ? 4 : 6;
      for (let piece = 0; piece <= pieces; piece += 1) {
        const amount = piece / pieces;
        points.push(new THREE.Vector3(
          x + Math.sin(index * 1.7 + amount * 9) * 0.055,
          0.1 + amount * 16.9,
          z + Math.cos(index * 0.8 + amount * 7) * 0.11
        ));
      }
      pushPolyline(points, 0.032 + (index % 4) * 0.006, 0.25 + (index % 7) / 10);
    }
  }
  const endWallCount = highQuality ? 74 : lowQuality ? 26 : 46;
  for (const z of [-30.36, 25.36]) {
    for (let index = 0; index <= endWallCount; index += 1) {
      const x = lerp(-21.2, 21.2, index / endWallCount);
      const points = [];
      const pieces = highQuality ? 8 : lowQuality ? 4 : 6;
      for (let piece = 0; piece <= pieces; piece += 1) {
        const amount = piece / pieces;
        points.push(new THREE.Vector3(
          x + Math.sin(index * 0.9 + amount * 8) * 0.1,
          0.1 + amount * 17,
          z + Math.cos(index * 1.2 + amount * 6) * 0.045
        ));
      }
      pushPolyline(points, 0.031 + (index % 3) * 0.007, 0.32 + (index % 5) * 0.1);
    }
  }

  // Cold windows create the blue depth visible behind the candle-lit pasta.
  const windowGeometry = new THREE.PlaneGeometry(WINDOW_OPENING_WIDTH - 0.34, WINDOW_HEAD_Y - WINDOW_SILL_Y - 0.32);
  for (const x of [-21.38, 21.38]) {
    const rotationY = x < 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    // -24 (not -25) is the third real wall opening (TRAVERSABLE_WINDOW_ZS), so
    // the pane row must land on it — otherwise that opening gets no membrane or
    // frame mullions and an opaque decorative pane floats inside the walkable gap.
    for (const z of [18, 7, -4, -15, -24]) {
      const pane = new THREE.Mesh(windowGeometry, coldGlassMaterial);
      const traversable = TRAVERSABLE_WINDOW_ZS.includes(z);
      pane.name = (traversable ? "traversable cold sauce membrane " : "cold sauce window ") + x + " " + z;
      pane.position.set(x, (WINDOW_SILL_Y + WINDOW_HEAD_Y) * 0.5, z);
      pane.rotation.y = rotationY;
      if (traversable) pane.material = coldGlassMaterial.clone();
      if (traversable) pane.material.opacity = lowQuality ? 0.055 : 0.1;
      root.add(pane);
      pushRing(x + (x < 0 ? 0.02 : -0.02), WINDOW_HEAD_Y - 0.22, z, WINDOW_OPENING_WIDTH * 0.5, 0, Math.PI * 0.5, 0, 0.9);
      if (traversable) {
        const frameX = x + (x < 0 ? 0.03 : -0.03);
        for (const edge of [-1, 1]) {
          pushSegment(
            new THREE.Vector3(frameX, WINDOW_SILL_Y, z + edge * WINDOW_OPENING_WIDTH * 0.5),
            new THREE.Vector3(frameX, WINDOW_HEAD_Y, z + edge * WINDOW_OPENING_WIDTH * 0.5),
            0.085,
            0.78
          );
        }
      }
    }
  }

  // Three chandelier crowns and floor candle islands reproduce the reference
  // image's layered pools of practical light.
  addChandelier(0, 12.6, 11.7, 2.4);
  addChandelier(-5.2, -1.4, 14.2, 1.8);
  addChandelier(5.2, -11.2, 11.2, 2.05);
  for (const [x, y, z, count, spread] of [
    [-11.5, 0.03, 19.5, 7, 0.65], [11.5, 0.03, 19.5, 7, 0.65],
    [-4.7, 0.03, 9.4, 6, 0.58], [4.7, 0.03, 9.4, 6, 0.58],
    [-11.4, 0.03, -2.5, 7, 0.72], [11.4, 0.03, -2.5, 7, 0.72],
    [-5.9, 2.18, -17.1, 7, 0.68], [5.9, 2.18, -17.1, 7, 0.68],
    [-7.6, 4.38, -25.2, 8, 0.72], [7.6, 4.38, -25.2, 8, 0.72],
    [0, 4.38, -28, 10, 0.95],
    [-14.2, UPPER_DECK_Y + 0.03, 8.2, 8, 0.76], [14.2, UPPER_DECK_Y + 0.03, 8.2, 8, 0.76],
    [-7.4, UPPER_DECK_Y + 0.03, -5.8, 7, 0.68], [7.4, UPPER_DECK_Y + 0.03, -5.8, 7, 0.68]
  ]) {
    addCandleCluster(x, y, z, lowQuality ? Math.max(3, Math.floor(count * 0.5)) : count, spread);
  }

  // Loose cooked strands lie in the sauce rather than merely appearing as a
  // photograph tiled over boxes.
  const looseCount = highQuality ? 30 : lowQuality ? 9 : 18;
  for (let index = 0; index < looseCount; index += 1) {
    let centerX = lerp(-19.5, 19.5, random());
    let centerZ = lerp(-27.5, 23, random());
    if (Math.abs(centerX) < 5.8 && centerZ < -10 && centerZ > -23) centerX += centerX < 0 ? -6 : 6;
    const length = 2.2 + random() * 4.8;
    const points = [];
    for (let piece = 0; piece < 7; piece += 1) {
      const amount = piece / 6;
      points.push(new THREE.Vector3(
        centerX + (amount - 0.5) * length + Math.sin(amount * 10 + index) * 0.35,
        0.075 + Math.sin(amount * Math.PI) * (0.03 + random() * 0.08),
        centerZ + Math.sin(amount * 5.8 + index * 0.7) * (0.35 + random() * 0.6)
      ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, highQuality ? 36 : 20, 0.038 + random() * 0.025, highQuality ? 7 : 5, false),
      looseNoodleMaterial
    );
    mesh.name = "loose floor spaghetti " + (index + 1);
    mesh.castShadow = highQuality;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // Hanging ceiling strands compress the vertical space and add silhouette
  // movement against the dark vault.
  const hangingCount = highQuality ? 82 : lowQuality ? 24 : 48;
  for (let index = 0; index < hangingCount; index += 1) {
    const x = lerp(-20.2, 20.2, random());
    const z = lerp(-28.5, 23.5, random());
    const length = 0.8 + Math.pow(random(), 1.8) * 5.2;
    const points = [];
    for (let piece = 0; piece <= 4; piece += 1) {
      const amount = piece / 4;
      points.push(new THREE.Vector3(
        x + Math.sin(index + amount * 4.7) * 0.22 * amount,
        17.45 - length * amount,
        z + Math.cos(index * 1.4 + amount * 5.1) * 0.22 * amount
      ));
    }
    pushPolyline(points, 0.025 + random() * 0.025, 0.28 + random() * 0.55);
  }

  // Every authored ramp gets its own unmistakable downhill sauce current. The
  // ribbons are one pooled draw call; their dedicated texture scrolls without
  // disturbing the shared floor/flood materials. Stepped stairs get separate
  // tread and riser quads so the runoff remains visible over the physical boxes.
  const runoffPositions = [];
  const runoffUvs = [];
  const runoffIndices = [];
  const runoffLanesPerRamp = lowQuality ? 2 : highQuality ? 5 : 3;
  let flowRibbonCount = 0;

  function sampleRampFlowPoint(ramp, flowProgress, lateral = 0, lift = 0.052, target = null) {
    const progress = clamp(flowProgress, 0, 1);
    const coordinateProgress = ramp.downhillSign > 0 ? progress : 1 - progress;
    const alongMinimum = ramp.axis === "x" ? ramp.minX : ramp.minZ;
    const alongMaximum = ramp.axis === "x" ? ramp.maxX : ramp.maxZ;
    const crossMinimum = ramp.axis === "x" ? ramp.minZ : ramp.minX;
    const crossMaximum = ramp.axis === "x" ? ramp.maxZ : ramp.maxX;
    const along = lerp(alongMinimum, alongMaximum, coordinateProgress);
    const cross = (crossMinimum + crossMaximum) * 0.5 + lateral;
    let y;
    if (ramp.visualSteps > 0) {
      const stepIndex = Math.min(ramp.visualSteps - 1, Math.floor(coordinateProgress * ramp.visualSteps));
      if (ramp.yAtMin > ramp.yAtMax) {
        y = ramp.yAtMax + (ramp.visualSteps - stepIndex) / ramp.visualSteps * (ramp.yAtMin - ramp.yAtMax);
      } else {
        y = ramp.yAtMin + (stepIndex + 1) / ramp.visualSteps * (ramp.yAtMax - ramp.yAtMin);
      }
    } else {
      y = lerp(ramp.yAtMin, ramp.yAtMax, coordinateProgress);
    }
    const px = ramp.axis === "x" ? along : cross;
    const pz = ramp.axis === "x" ? cross : along;
    // The per-frame runoff updater passes a scratch vector to avoid allocating
    // ~200 short-lived Vector3s every frame; the one-time build loop that needs
    // several simultaneous points omits it and gets a fresh vector.
    return target ? target.set(px, y + lift, pz) : new THREE.Vector3(px, y + lift, pz);
  }

  function pushRunoffQuad(a, b, c, d, v0, v1) {
    const base = runoffPositions.length / 3;
    for (const point of [a, b, c, d]) runoffPositions.push(point.x, point.y, point.z);
    runoffUvs.push(0, v0, 1, v0, 1, v1, 0, v1);
    runoffIndices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  for (let rampIndex = 0; rampIndex < rampFlowDescriptors.length; rampIndex += 1) {
    const ramp = rampFlowDescriptors[rampIndex];
    const crossWidth = ramp.axis === "x" ? ramp.maxZ - ramp.minZ : ramp.maxX - ramp.minX;
    const laneWidth = Math.min(0.52, Math.max(0.24, crossWidth / runoffLanesPerRamp * 0.2));
    for (let lane = 0; lane < runoffLanesPerRamp; lane += 1) {
      const laneAmount = (lane + 0.5) / runoffLanesPerRamp;
      const laneCenter = lerp(-crossWidth * 0.42, crossWidth * 0.42, laneAmount);
      const phase = rampIndex * 1.91 + lane * 2.37;
      const sections = ramp.visualSteps > 0 ? ramp.visualSteps : highQuality ? 20 : lowQuality ? 10 : 15;
      for (let section = 0; section < sections; section += 1) {
        const q0 = section / sections;
        const q1 = (section + 1) / sections;
        const inset = ramp.visualSteps > 0 ? 0.0015 : 0;
        const startProgress = q0 + inset;
        const endProgress = q1 - inset;
        const startCenter = laneCenter + Math.sin(q0 * 12.5 + phase) * 0.095;
        const endCenter = laneCenter + Math.sin(q1 * 12.5 + phase) * 0.095;
        const a = sampleRampFlowPoint(ramp, startProgress, startCenter - laneWidth * 0.5);
        const b = sampleRampFlowPoint(ramp, startProgress, startCenter + laneWidth * 0.5);
        const c = sampleRampFlowPoint(ramp, endProgress, endCenter + laneWidth * 0.5);
        const d = sampleRampFlowPoint(ramp, endProgress, endCenter - laneWidth * 0.5);
        pushRunoffQuad(a, b, c, d, q0 * 4.2, q1 * 4.2);

        if (ramp.visualSteps > 0 && section < sections - 1) {
          const upperLeft = sampleRampFlowPoint(ramp, q1 - inset, endCenter - laneWidth * 0.5, 0.045);
          const upperRight = sampleRampFlowPoint(ramp, q1 - inset, endCenter + laneWidth * 0.5, 0.045);
          const lowerLeft = sampleRampFlowPoint(ramp, q1 + inset, endCenter - laneWidth * 0.5, 0.045);
          const lowerRight = sampleRampFlowPoint(ramp, q1 + inset, endCenter + laneWidth * 0.5, 0.045);
          pushRunoffQuad(upperLeft, upperRight, lowerRight, lowerLeft, q1 * 4.2, q1 * 4.2 + 0.16);
        }
      }
      flowRibbonCount += 1;
    }
  }

  const runoffGeometry = new THREE.BufferGeometry();
  runoffGeometry.setAttribute("position", new THREE.Float32BufferAttribute(runoffPositions, 3));
  runoffGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(runoffUvs, 2));
  runoffGeometry.setIndex(runoffIndices);
  runoffGeometry.computeVertexNormals();
  runoffGeometry.computeBoundingBox();
  runoffGeometry.computeBoundingSphere();
  const runoffMesh = new THREE.Mesh(runoffGeometry, runoffMaterial);
  runoffMesh.name = "pooled animated downhill spaghetti stair runoff";
  runoffMesh.castShadow = false;
  runoffMesh.receiveShadow = true;
  runoffMesh.renderOrder = 6;
  root.add(runoffMesh);

  // Pool the thousands of noodle segments, pasta rings, and candles into a
  // handful of draw calls.
  const segmentGeometry = new THREE.CylinderGeometry(1, 1, 1, lowQuality ? 5 : 7, 1, false);
  const flowWormsPerRamp = lowQuality ? 2 : highQuality ? 5 : 3;
  const flowPiecesPerWorm = highQuality ? 4 : 3;
  const flowWorms = [];
  for (let rampIndex = 0; rampIndex < rampFlowDescriptors.length; rampIndex += 1) {
    const ramp = rampFlowDescriptors[rampIndex];
    const crossWidth = ramp.axis === "x" ? ramp.maxZ - ramp.minZ : ramp.maxX - ramp.minX;
    for (let worm = 0; worm < flowWormsPerRamp; worm += 1) {
      flowWorms.push({
        ramp,
        lateral: lerp(-crossWidth * 0.34, crossWidth * 0.34, (worm + 0.5) / flowWormsPerRamp),
        phase: random() * 1.32,
        wavePhase: random() * Math.PI * 2,
        speed: 0.14 + random() * 0.065,
        radius: 0.052 + random() * 0.019
      });
    }
  }
  const flowNoodleSegments = flowWorms.length * flowPiecesPerWorm;
  const flowNoodleMesh = new THREE.InstancedMesh(segmentGeometry, flowNoodleMaterial, flowNoodleSegments);
  flowNoodleMesh.name = "pooled spaghetti strands visibly sliding downhill";
  flowNoodleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flowNoodleMesh.castShadow = false;
  flowNoodleMesh.receiveShadow = true;
  flowNoodleMesh.frustumCulled = false;
  flowNoodleMesh.renderOrder = 7;
  let runoffElapsed = 0;
  // Allocated once and reused every frame by updateRunoffInstances.
  const runoffHidden = new THREE.Vector3(0, -100, 0);
  const runoffHiddenEnd = new THREE.Vector3(0, -99.999, 0);
  const runoffScratchStart = new THREE.Vector3();
  const runoffScratchEnd = new THREE.Vector3();

  function updateRunoffInstances(elapsed) {
    let instanceIndex = 0;
    for (const worm of flowWorms) {
      const chainStart = (elapsed * worm.speed + worm.phase) % 1.32 - 0.15;
      const pieceLength = worm.ramp.visualSteps > 0 ? 0.047 : 0.055;
      for (let piece = 0; piece < flowPiecesPerWorm; piece += 1) {
        const q0 = chainStart + piece * pieceLength;
        const q1 = q0 + pieceLength * 0.94;
        if (q0 < 0 || q1 > 1) {
          setSegmentMatrix(flowNoodleMesh, instanceIndex, runoffHidden, runoffHiddenEnd, 0.0001);
        } else {
          const lateralA = worm.lateral + Math.sin(q0 * 18 + worm.wavePhase + elapsed * 2.7) * 0.13;
          const lateralB = worm.lateral + Math.sin(q1 * 18 + worm.wavePhase + elapsed * 2.7) * 0.13;
          const start = sampleRampFlowPoint(worm.ramp, q0, lateralA, 0.09, runoffScratchStart);
          const end = sampleRampFlowPoint(worm.ramp, q1, lateralB, 0.09, runoffScratchEnd);
          setSegmentMatrix(flowNoodleMesh, instanceIndex, start, end, worm.radius);
        }
        if (elapsed === 0) {
          flowNoodleMesh.setColorAt(instanceIndex, new THREE.Color().setHSL(
            piece % 3 === 0 ? 0.035 : 0.095,
            piece % 3 === 0 ? 0.86 : 0.72,
            piece % 3 === 0 ? 0.5 : 0.68
          ));
        }
        instanceIndex += 1;
      }
    }
    flowNoodleMesh.instanceMatrix.needsUpdate = true;
    if (flowNoodleMesh.instanceColor) flowNoodleMesh.instanceColor.needsUpdate = true;
  }

  updateRunoffInstances(0);
  root.add(flowNoodleMesh);
  const strandMesh = new THREE.InstancedMesh(segmentGeometry, noodleMaterial, noodleSegments.length);
  strandMesh.name = "pooled volumetric gothic spaghetti";
  strandMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  for (let index = 0; index < noodleSegments.length; index += 1) {
    const segment = noodleSegments[index];
    setSegmentMatrix(strandMesh, index, segment.start, segment.end, segment.radius);
    const hue = 0.075 + segment.tone * 0.027 + random() * 0.009;
    const saturation = 0.55 + random() * 0.18;
    const lightness = 0.48 + segment.tone * 0.22 + random() * 0.08;
    strandMesh.setColorAt(index, new THREE.Color().setHSL(hue, saturation, clamp(lightness, 0.42, 0.78)));
  }
  strandMesh.instanceMatrix.needsUpdate = true;
  if (strandMesh.instanceColor) strandMesh.instanceColor.needsUpdate = true;
  strandMesh.castShadow = highQuality;
  strandMesh.receiveShadow = true;
  strandMesh.computeBoundingBox?.();
  strandMesh.computeBoundingSphere?.();
  root.add(strandMesh);

  const instancePosition = new THREE.Vector3();
  const instanceScale = new THREE.Vector3();
  const instanceQuaternion = new THREE.Quaternion();
  const instanceEuler = new THREE.Euler();
  const instanceMatrix = new THREE.Matrix4();
  const ringMesh = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1, 0.055, lowQuality ? 5 : 7, highQuality ? 28 : 18),
    looseNoodleMaterial,
    ringInstances.length
  );
  ringMesh.name = "pooled braided capitals arches and chandelier rings";
  for (let index = 0; index < ringInstances.length; index += 1) {
    const ring = ringInstances[index];
    instancePosition.set(ring.x, ring.y, ring.z);
    instanceEuler.set(ring.rotationX, ring.rotationY, ring.rotationZ, "XYZ");
    instanceQuaternion.setFromEuler(instanceEuler);
    instanceScale.set(ring.radius, ring.radius, ring.radius * ring.thicknessScale);
    instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale);
    ringMesh.setMatrixAt(index, instanceMatrix);
  }
  ringMesh.instanceMatrix.needsUpdate = true;
  ringMesh.castShadow = highQuality;
  ringMesh.receiveShadow = true;
  ringMesh.computeBoundingBox?.();
  ringMesh.computeBoundingSphere?.();
  root.add(ringMesh);

  function createInstanceBatch(name, geometry, material, instances) {
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
    mesh.name = name;
    for (let index = 0; index < instances.length; index += 1) {
      const item = instances[index];
      instancePosition.set(item.x, item.y, item.z);
      instanceQuaternion.identity();
      instanceScale.set(item.sx, item.sy, item.sz);
      instanceMatrix.compose(instancePosition, instanceQuaternion, instanceScale);
      mesh.setMatrixAt(index, instanceMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = highQuality;
    mesh.computeBoundingBox?.();
    mesh.computeBoundingSphere?.();
    root.add(mesh);
    return mesh;
  }
  createInstanceBatch(
    "pooled tallow candles",
    new THREE.CylinderGeometry(1, 0.92, 1, 7, 1),
    waxMaterial,
    candleInstances
  );
  const flameMesh = createInstanceBatch(
    "pooled candle flames",
    new THREE.SphereGeometry(1, 7, 5),
    flameMaterial,
    flameInstances
  );

  // One enormous extraction gate serves both the lower altar and the upper
  // crown route. Braided sauce tendrils visibly seal it until the boss dies.
  const portalShape = new THREE.Shape();
  portalShape.moveTo(-2.18, -4.44);
  portalShape.lineTo(-2.18, 0.56);
  portalShape.quadraticCurveTo(-2.02, 3.92, 0, 4.46);
  portalShape.quadraticCurveTo(2.02, 3.92, 2.18, 0.56);
  portalShape.lineTo(2.18, -4.44);
  portalShape.closePath();
  const portal = new THREE.Mesh(new THREE.ShapeGeometry(portalShape, highQuality ? 18 : 10), portalMaterial);
  portal.name = "basilica extraction gate";
  portal.position.set(0, 8.82, -30.34);
  root.add(portal);
  const exitArchLeft = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-2.35, 4.38, -30.2),
    new THREE.Vector3(-2.05, 12.85, -30.2),
    new THREE.Vector3(0, 13.42, -30.2)
  );
  const exitArchRight = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 13.42, -30.2),
    new THREE.Vector3(2.05, 12.85, -30.2),
    new THREE.Vector3(2.35, 4.38, -30.2)
  );
  for (let strand = 0; strand < 3; strand += 1) {
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(exitArchLeft, highQuality ? 34 : 20, 0.11 + strand * 0.025, 7, false),
      looseNoodleMaterial
    );
    mesh.position.z += strand * 0.1;
    root.add(mesh);
    const right = new THREE.Mesh(
      new THREE.TubeGeometry(exitArchRight, highQuality ? 34 : 20, 0.11 + strand * 0.025, 7, false),
      looseNoodleMaterial
    );
    right.position.z += strand * 0.1;
    root.add(right);
  }
  exitLockTendrils = new THREE.Group();
  exitLockTendrils.name = "sealed extraction gate tendrils";
  for (let strand = 0; strand < 7; strand += 1) {
    const amount = strand / 6;
    const baseX = lerp(-1.82, 1.82, amount);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(baseX, 4.48, -30.08 - strand * 0.012),
      new THREE.Vector3(baseX + Math.sin(strand * 1.7) * 0.42, 7.25, -30.05),
      new THREE.Vector3(baseX + Math.cos(strand * 1.3) * 0.38, 10.1, -30.05),
      new THREE.Vector3(baseX * -0.72, 13.08, -30.08 - strand * 0.012)
    ]);
    const tendril = new THREE.Mesh(
      new THREE.TubeGeometry(curve, highQuality ? 42 : lowQuality ? 18 : 28, 0.1 + (strand % 3) * 0.018, 7, false),
      gateLockMaterial
    );
    tendril.name = `gate lock tendril ${strand + 1}`;
    tendril.userData.openDirection = strand % 2 === 0 ? -1 : 1;
    tendril.castShadow = highQuality;
    exitLockTendrils.add(tendril);
  }
  root.add(exitLockTendrils);

  // --- Lighting -------------------------------------------------------------
  root.add(new THREE.HemisphereLight(0xe7c79d, 0x170502, lowQuality ? 0.7 : 1.05));
  root.add(new THREE.AmbientLight(0x843b20, lowQuality ? 0.48 : 0.62));
  const coldShaft = new THREE.DirectionalLight(0xa8d3dd, lowQuality ? 0.9 : 1.8);
  coldShaft.position.set(-18, 17, 17);
  root.add(coldShaft);
  const altarLight = new THREE.PointLight(0xbceaf0, lowQuality ? 18 : 36, 24, 1.5);
  altarLight.position.set(0, 8.4, -28.7);
  altarLight.userData.baseIntensity = altarLight.intensity;
  altarLight.userData.phase = 2.4;
  animatedLights.push(altarLight);
  root.add(altarLight);
  if (highQuality) {
    const key = new THREE.SpotLight(0xff7c30, 58, 48, Math.PI * 0.24, 0.62, 1.35);
    key.position.set(8, 15.8, 18);
    key.target.position.set(0, 0, -5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 48;
    root.add(key.target);
    root.add(key);
  }

  // --- Sauce rooms and volumetric steam ------------------------------------
  const roomDefinitions = [
    { id: "foyer", name: "Sauce-Slick Vestibule", minX: -21.45, maxX: 21.45, minZ: 12.5, maxZ: 25.45 },
    { id: "nave", name: "Grand Noodle Nave", minX: -21.45, maxX: 21.45, minZ: -12.5, maxZ: 12.5 },
    { id: "sanctum", name: "Marinara Sanctum", minX: -21.45, maxX: 21.45, minZ: -30.45, maxZ: -12.5 },
    { id: "west-exterior", name: "West Flying Buttress", minX: -28.15, maxX: -21.45, minZ: -30.45, maxZ: 12.25 },
    { id: "east-exterior", name: "East Flying Buttress", minX: 21.45, maxX: 28.15, minZ: -30.45, maxZ: 12.25 }
  ];
  let fillHeight = 0.055;
  const rooms = roomDefinitions.map((definition, roomIndex) => {
    const width = definition.maxX - definition.minX;
    const depth = definition.maxZ - definition.minZ;
    const segmentsX = highQuality ? 28 : lowQuality ? 8 : 16;
    const segmentsZ = highQuality ? Math.max(9, Math.round(depth * 0.8)) : lowQuality ? 5 : Math.max(7, Math.round(depth * 0.48));
    const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ);
    geometry.rotateX(-Math.PI * 0.5);
    const positions = geometry.getAttribute("position");
    const basePositions = new Float32Array(positions.array.length);
    basePositions.set(positions.array);
    geometry.userData.basePositions = basePositions;
    const surface = new THREE.Mesh(geometry, sauceMaterial);
    surface.name = definition.name + " living sauce";
    surface.position.set((definition.minX + definition.maxX) * 0.5, fillHeight, (definition.minZ + definition.maxZ) * 0.5);
    surface.receiveShadow = true;
    surface.frustumCulled = false;
    root.add(surface);
    return {
      ...definition,
      x: (definition.minX + definition.maxX) * 0.5,
      z: (definition.minZ + definition.maxZ) * 0.5,
      width,
      depth,
      area: width * depth,
      floorY: 0,
      ceilingY: WORLD_BOUNDS.maxY,
      initialLevel: fillHeight,
      level: fillHeight,
      volume: width * depth * fillHeight,
      surface,
      phase: roomIndex * 1.83
    };
  });

  const steamCount = highQuality ? 210 : lowQuality ? 60 : 120;
  const steamPositions = new Float32Array(steamCount * 3);
  const steamSpeeds = new Float32Array(steamCount);
  const steamSeeds = new Float32Array(steamCount);
  for (let index = 0; index < steamCount; index += 1) {
    steamPositions[index * 3] = lerp(-20.5, 20.5, random());
    steamPositions[index * 3 + 1] = fillHeight + 0.15 + random() * 11;
    steamPositions[index * 3 + 2] = lerp(-29, 24, random());
    steamSpeeds[index] = 0.18 + random() * 0.46;
    steamSeeds[index] = random() * Math.PI * 2;
  }
  const steamGeometry = new THREE.BufferGeometry();
  steamGeometry.setAttribute("position", new THREE.BufferAttribute(steamPositions, 3));
  const steamMaterial = new THREE.PointsMaterial({
    map: makeSteamTexture(),
    size: lowQuality ? 0.28 : 0.42,
    color: 0xf0a36f,
    transparent: true,
    opacity: lowQuality ? 0.14 : 0.23,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  const steam = new THREE.Points(steamGeometry, steamMaterial);
  steam.name = "marinara steam volume";
  steam.frustumCulled = false;
  root.add(steam);

  const spawn = Object.freeze({ x: 0, y: 0, z: 22.2, eyeY: 1.62, yaw: 0, pitch: 0 });
  const exitAccessPoints = Object.freeze([
    Object.freeze({
      id: "lower-altar-gate",
      level: "altar",
      minX: -2.1,
      maxX: 2.1,
      minY: 4.15,
      maxY: 7.65,
      minZ: -30.4,
      maxZ: -28.05
    }),
    Object.freeze({
      id: "upper-crown-gate",
      level: "crown",
      minX: -2.1,
      maxX: 2.1,
      minY: UPPER_DECK_Y - 0.3,
      maxY: UPPER_DECK_Y + 3.25,
      minZ: -30.4,
      maxZ: -28.05
    })
  ]);
  const exit = Object.freeze({
    id: "basilica-gate",
    x: 0,
    y: 4.35,
    upperY: UPPER_DECK_Y,
    z: -29.25,
    width: 4.2,
    height: 3.1,
    depth: 2.2,
    radius: 1.7,
    minX: -2.1,
    maxX: 2.1,
    minY: 4.15,
    maxY: UPPER_DECK_Y + 3.25,
    minZ: -30.4,
    maxZ: -28.05,
    thresholdZ: -28.05,
    roomId: "sanctum",
    accessPoints: exitAccessPoints
  });
  const checkpoints = [
    { id: "nave-threshold", tier: 1, x: 0, y: 0, z: 10.3, radius: 1.7, verticalRange: 1.4, label: "Grand nave" },
    { id: "grand-stair", tier: 2, x: 0, y: 0, z: -10.1, radius: 1.75, verticalRange: 1.5, label: "Marinara stair" },
    { id: "altar-landing", tier: 3, x: 0, y: 4.35, z: -24.4, radius: 2.1, verticalRange: 1.5, label: "Boss altar" },
    { id: "ascension-deck", tier: 4, x: 0, y: UPPER_DECK_Y, z: 1.5, radius: 3.4, verticalRange: 1.6, respawnDrop: 12.5, label: "Ascension deck" },
    { id: "upper-apse", tier: 5, x: 0, y: UPPER_DECK_Y, z: -26.2, radius: 3.1, verticalRange: 1.6, respawnDrop: 12.5, label: "Crown extraction apse" }
  ];
  const route = [
    { id: "spawn", x: spawn.x, y: spawn.y, z: spawn.z, tier: 0 },
    ...checkpoints,
    { id: exit.id, x: exit.x, y: exit.upperY, z: exit.z, tier: 6 }
  ];
  const debugCover = Object.freeze({
    id: "debug-cover-braised-table",
    coverId: "debug-cover-braised-table",
    blocker: Object.freeze({ x: 0, y: 0, z: 7.6 }),
    player: Object.freeze({ x: 0, y: 0, z: 10.15 }),
    target: Object.freeze({ x: 0, y: 0, z: 5.15 }),
    description: "Chest-high braised table blocks the center lane"
  });
  const combatData = Object.freeze({
    version: 2,
    arenaBounds: Object.freeze({
      minX: -27.35,
      maxX: 27.35,
      minY: 0,
      maxY: UPPER_DECK_Y,
      minZ: -29.7,
      maxZ: 24.7
    }),
    playerSpawn: Object.freeze({ x: spawn.x, y: spawn.y, z: spawn.z, yaw: spawn.yaw }),
    lanes: Object.freeze({
      left: Object.freeze([
        Object.freeze({ x: -10.2, y: 0, z: 8.4, role: "rifle" }),
        Object.freeze({ x: -11.2, y: 0, z: -7.8, role: "flanker" }),
        Object.freeze({ x: -18.2, y: 4.35, z: 2.4, role: "marksman" }),
        Object.freeze({ x: -9, y: UPPER_DECK_Y, z: 4, role: "upper-rusher" }),
        Object.freeze({ x: -14.1, y: 4.35, z: -24.2, role: "elite" })
      ]),
      center: Object.freeze([
        Object.freeze({ x: 0, y: 0, z: 4.8, role: "rifle" }),
        Object.freeze({ x: 0, y: 0, z: -8.8, role: "suppressor" }),
        Object.freeze({ x: 0, y: UPPER_DECK_Y, z: -4, role: "upper-hold" }),
        Object.freeze({ x: 0, y: 2.15, z: -16.6, role: "rusher" }),
        Object.freeze({ x: 0, y: 4.35, z: -26.2, role: "boss" })
      ]),
      right: Object.freeze([
        Object.freeze({ x: 10.2, y: 0, z: 8.4, role: "rifle" }),
        Object.freeze({ x: 11.2, y: 0, z: -7.8, role: "flanker" }),
        Object.freeze({ x: 18.2, y: 4.35, z: 2.4, role: "marksman" }),
        Object.freeze({ x: 9, y: UPPER_DECK_Y, z: 4, role: "upper-rusher" }),
        Object.freeze({ x: 14.1, y: 4.35, z: -24.2, role: "elite" })
      ])
    }),
    waveSpawns: Object.freeze([
      Object.freeze([
        Object.freeze({ x: -9.8, y: 0, z: 8.8, lane: "left", role: "rifle" }),
        Object.freeze({ x: 0, y: 0, z: 4.8, lane: "center", role: "suppressor" }),
        Object.freeze({ x: 9.8, y: 0, z: 8.8, lane: "right", role: "rifle" })
      ]),
      Object.freeze([
        Object.freeze({ x: -18.2, y: 4.35, z: 2.4, lane: "left", role: "marksman" }),
        Object.freeze({ x: -11.2, y: 0, z: -7.8, lane: "left", role: "flanker" }),
        Object.freeze({ x: 11.2, y: 0, z: -7.8, lane: "right", role: "flanker" }),
        Object.freeze({ x: 18.2, y: 4.35, z: 2.4, lane: "right", role: "marksman" })
      ]),
      Object.freeze([
        Object.freeze({ x: -9, y: UPPER_DECK_Y, z: 4, lane: "left", role: "rusher" }),
        Object.freeze({ x: -9.8, y: 0, z: -9.2, lane: "left", role: "suppressor" }),
        Object.freeze({ x: 0, y: 0, z: -8.8, lane: "center", role: "suppressor" }),
        Object.freeze({ x: 9, y: UPPER_DECK_Y, z: 4, lane: "right", role: "hold" }),
        Object.freeze({ x: 9.8, y: 0, z: -9.2, lane: "right", role: "suppressor" }),
        Object.freeze({ x: 0, y: UPPER_DECK_Y, z: -4, lane: "center", role: "rusher" })
      ])
    ]),
    navigationRoutes: Object.freeze({
      westGallery: Object.freeze([
        Object.freeze({ x: -18.2, y: 4.35, z: 14.8 }),
        Object.freeze({ x: -18.2, y: 4.35, z: 16.5 }),
        Object.freeze({ x: -18.2, y: 2.92, z: 18.5 }),
        Object.freeze({ x: -18.2, y: 1.3, z: 21.1 }),
        Object.freeze({ x: -18.2, y: 0, z: 23.75 }),
        Object.freeze({ x: -14.2, y: 0, z: 24.05 }),
        Object.freeze({ x: -12, y: 0, z: 20 })
      ]),
      eastGallery: Object.freeze([
        Object.freeze({ x: 18.2, y: 4.35, z: 14.8 }),
        Object.freeze({ x: 18.2, y: 4.35, z: 16.5 }),
        Object.freeze({ x: 18.2, y: 2.92, z: 18.5 }),
        Object.freeze({ x: 18.2, y: 1.3, z: 21.1 }),
        Object.freeze({ x: 18.2, y: 0, z: 23.75 }),
        Object.freeze({ x: 14.2, y: 0, z: 24.05 }),
        Object.freeze({ x: 12, y: 0, z: 20 })
      ]),
      westAltar: Object.freeze([
        Object.freeze({ x: -10, y: 4.35, z: -24 }),
        Object.freeze({ x: -6.7, y: 4.35, z: -24 }),
        Object.freeze({ x: 0, y: 4.35, z: -24 }),
        Object.freeze({ x: 0, y: 4.35, z: -22 }),
        Object.freeze({ x: 0, y: 2.15, z: -16.65 }),
        Object.freeze({ x: 0, y: 0, z: -11.1 })
      ]),
      eastAltar: Object.freeze([
        Object.freeze({ x: 10, y: 4.35, z: -24 }),
        Object.freeze({ x: 6.7, y: 4.35, z: -24 }),
        Object.freeze({ x: 0, y: 4.35, z: -24 }),
        Object.freeze({ x: 0, y: 4.35, z: -22 }),
        Object.freeze({ x: 0, y: 2.15, z: -16.65 }),
        Object.freeze({ x: 0, y: 0, z: -11.1 })
      ]),
      westUpper: Object.freeze(upperRouteNodes(-9).map((node) => Object.freeze({ ...node }))),
      eastUpper: Object.freeze(upperRouteNodes(9).map((node) => Object.freeze({ ...node }))),
      westFloodEscape: Object.freeze(floodEscapeNodes(-1).map((node) => Object.freeze({ ...node }))),
      eastFloodEscape: Object.freeze(floodEscapeNodes(1).map((node) => Object.freeze({ ...node })))
    }),
    recoveryNodes: Object.freeze([
      Object.freeze({ x: -9.8, y: 0, z: 8.8 }),
      Object.freeze({ x: 9.8, y: 0, z: 8.8 }),
      Object.freeze({ x: -11.2, y: 0, z: -7.8 }),
      Object.freeze({ x: 11.2, y: 0, z: -7.8 }),
      Object.freeze({ x: 0, y: 0, z: 4.8 }),
      Object.freeze({ x: 0, y: 0, z: -8.8 }),
      Object.freeze({ x: -9, y: UPPER_DECK_Y, z: 5.2 }),
      Object.freeze({ x: 9, y: UPPER_DECK_Y, z: 5.2 }),
      Object.freeze({ x: 0, y: UPPER_DECK_Y, z: -4.8 }),
      Object.freeze({ x: -24.45, y: UPPER_DECK_Y, z: -18.5 }),
      Object.freeze({ x: 24.45, y: UPPER_DECK_Y, z: -18.5 }),
      Object.freeze({ x: 0, y: UPPER_DECK_Y, z: -26.2 })
    ]),
    coverNodes: Object.freeze([
      Object.freeze({
        id: "debug-cover-braised-table",
        position: Object.freeze({ x: 0, y: 0, z: 5.55 }),
        normal: Object.freeze({ x: 0, z: 1 }),
        peekLeft: Object.freeze({ x: -3.35, y: 0, z: 6.6 }),
        peekRight: Object.freeze({ x: 3.35, y: 0, z: 6.6 }),
        height: 1.72,
        lane: "center"
      }),
      Object.freeze({
        id: "west ossuary pew two",
        position: Object.freeze({ x: -8.8, y: 0, z: 0.95 }),
        normal: Object.freeze({ x: 0, z: 1 }),
        peekLeft: Object.freeze({ x: -11.6, y: 0, z: 1.1 }),
        peekRight: Object.freeze({ x: -6.05, y: 0, z: 1.1 }),
        height: 1.36,
        lane: "left"
      }),
      Object.freeze({
        id: "east ossuary pew two",
        position: Object.freeze({ x: 8.8, y: 0, z: 0.95 }),
        normal: Object.freeze({ x: 0, z: 1 }),
        peekLeft: Object.freeze({ x: 6.05, y: 0, z: 1.1 }),
        peekRight: Object.freeze({ x: 11.6, y: 0, z: 1.1 }),
        height: 1.36,
        lane: "right"
      }),
      Object.freeze({
        id: "left sauce reliquary",
        position: Object.freeze({ x: -12.3, y: 0, z: -8.95 }),
        normal: Object.freeze({ x: 0, z: 1 }),
        peekLeft: Object.freeze({ x: -14.1, y: 0, z: -9.1 }),
        peekRight: Object.freeze({ x: -10.45, y: 0, z: -9.1 }),
        height: 1.64,
        lane: "left"
      }),
      Object.freeze({
        id: "right sauce reliquary",
        position: Object.freeze({ x: 12.3, y: 0, z: -8.95 }),
        normal: Object.freeze({ x: 0, z: 1 }),
        peekLeft: Object.freeze({ x: 10.45, y: 0, z: -9.1 }),
        peekRight: Object.freeze({ x: 14.1, y: 0, z: -9.1 }),
        height: 1.64,
        lane: "right"
      }),
      Object.freeze({
        id: "ascension altar cover",
        position: Object.freeze({ x: 0, y: UPPER_DECK_Y, z: 3.15 }),
        normal: Object.freeze({ x: 0, z: 1 }),
        peekLeft: Object.freeze({ x: -4.2, y: UPPER_DECK_Y, z: 3.35 }),
        peekRight: Object.freeze({ x: 4.2, y: UPPER_DECK_Y, z: 3.35 }),
        height: 1.28,
        lane: "upper"
      }),
      Object.freeze({
        id: "west ascension reliquary",
        position: Object.freeze({ x: -10.8, y: UPPER_DECK_Y, z: -1.85 }),
        normal: Object.freeze({ x: 0, z: 1 }),
        peekLeft: Object.freeze({ x: -13, y: UPPER_DECK_Y, z: -1.8 }),
        peekRight: Object.freeze({ x: -8.55, y: UPPER_DECK_Y, z: -1.8 }),
        height: 1.4,
        lane: "upper-left"
      }),
      Object.freeze({
        id: "east ascension reliquary",
        position: Object.freeze({ x: 10.8, y: UPPER_DECK_Y, z: -1.85 }),
        normal: Object.freeze({ x: 0, z: 1 }),
        peekLeft: Object.freeze({ x: 8.55, y: UPPER_DECK_Y, z: -1.8 }),
        peekRight: Object.freeze({ x: 13, y: UPPER_DECK_Y, z: -1.8 }),
        height: 1.4,
        lane: "upper-right"
      })
    ]),
    bossSpawn: Object.freeze({ x: 0, y: 4.35, z: -26.2, lane: "center", role: "boss" }),
    exit
  });

  function getCombatData() {
    return combatData;
  }

  function getTraversalData() {
    return {
      upperDeckY: UPPER_DECK_Y,
      exitOpen,
      exitOpenAmount,
      exitAccessPoints: exitAccessPoints.map((accessPoint) => ({ ...accessPoint })),
      platforms: traversalPlatforms.map((platform) => ({
        ...platform,
        samples: platform.samples.map((sample) => ({ ...sample }))
      })),
      windowPassages: windowPassages.map((passage) => ({
        ...passage,
        inside: { ...passage.inside },
        outside: { ...passage.outside }
      })),
      routes: traversalRoutes.map((route) => ({
        id: route.id,
        waypoints: route.waypoints.map((waypoint) => ({ ...waypoint }))
      })),
      escapeRoutes: escapeRoutes.map((route) => ({
        id: route.id,
        side: route.side,
        exterior: route.exterior,
        minimumY: route.minimumY,
        waypoints: route.waypoints.map((waypoint) => ({ ...waypoint }))
      }))
    };
  }

  let frameCounter = 0;
  let fillElapsed = 0;

  function getRoomAt(x, z) {
    if (typeof x === "object" && x) ({ x, z } = x);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    return rooms.find((room) => x >= room.minX && x <= room.maxX && z >= room.minZ && z <= room.maxZ) || null;
  }

  function sampleSurfaceY(x, z) {
    if (typeof x === "object" && x) ({ x, z } = x);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return 0;
    const room = getRoomAt(x, z);
    if (room) return room.level;
    return x >= WORLD_BOUNDS.minX && x <= WORLD_BOUNDS.maxX && z >= WORLD_BOUNDS.minZ && z <= WORLD_BOUNDS.maxZ ? fillHeight : 0;
  }

  const sampleLevel = sampleSurfaceY;

  function sampleDepth(x, z, y) {
    if (typeof x === "object" && x) ({ x, y, z } = x);
    if (!Number.isFinite(y)) y = 0;
    return Math.max(0, sampleSurfaceY(x, z) - y);
  }

  function horizontalOverlap(collider, x, z, radius = 0) {
    return x + radius >= collider.minX && x - radius <= collider.maxX &&
      z + radius >= collider.minZ && z - radius <= collider.maxZ;
  }

  function colliderSurfaceY(collider, x, z) {
    return collider.shape === "ramp" ? collider.surfaceYAt(x, z) : collider.maxY;
  }

  function normalizeBounds(boundsOrX, y, z, radius = PLAYER_RADIUS_HINT, height = 1.78) {
    if (typeof boundsOrX === "object" && boundsOrX) {
      if ([boundsOrX.minX, boundsOrX.maxX, boundsOrX.minY, boundsOrX.maxY, boundsOrX.minZ, boundsOrX.maxZ].every(Number.isFinite)) return boundsOrX;
      const pointRadius = Number.isFinite(boundsOrX.radius) ? boundsOrX.radius : radius;
      const pointHeight = Number.isFinite(boundsOrX.height) ? boundsOrX.height : height;
      const px = Number.isFinite(boundsOrX.x) ? boundsOrX.x : 0;
      const py = Number.isFinite(boundsOrX.y) ? boundsOrX.y : 0;
      const pz = Number.isFinite(boundsOrX.z) ? boundsOrX.z : 0;
      return {
        minX: px - pointRadius,
        maxX: px + pointRadius,
        minY: py,
        maxY: py + pointHeight,
        minZ: pz - pointRadius,
        maxZ: pz + pointRadius
      };
    }
    return {
      minX: boundsOrX - radius,
      maxX: boundsOrX + radius,
      minY: y,
      maxY: y + height,
      minZ: z - radius,
      maxZ: z + radius
    };
  }

  function querySolids(boundsOrX, y, z, radius = PLAYER_RADIUS_HINT, height = 1.78) {
    const bounds = normalizeBounds(boundsOrX, y, z, radius, height);
    return colliders.filter((collider) => collider.solid !== false &&
      bounds.maxX >= collider.minX && bounds.minX <= collider.maxX &&
      bounds.maxY >= collider.minY && bounds.minY <= collider.maxY &&
      bounds.maxZ >= collider.minZ && bounds.minZ <= collider.maxZ);
  }

  function getSupport(x, z, feetY, options = {}) {
    if (typeof x === "object" && x) {
      options = z || {};
      ({ x, z, y: feetY } = x);
    }
    if (typeof options === "number") options = { maxDrop: options };
    const radius = Number.isFinite(options.radius) ? options.radius : PLAYER_RADIUS_HINT;
    const maxDrop = Number.isFinite(options.maxDrop) ? options.maxDrop : 0.72;
    const maxRise = Number.isFinite(options.maxRise) ? options.maxRise : 0.42;
    let best = null;
    for (const collider of colliders) {
      if (!collider.walkable || !horizontalOverlap(collider, x, z, radius)) continue;
      const surfaceY = colliderSurfaceY(collider, x, z);
      if (surfaceY > feetY + maxRise || surfaceY < feetY - maxDrop) continue;
      if (!best || surfaceY > best.y) {
        const slope = collider.shape === "ramp"
          ? (collider.yAtMax - collider.yAtMin) / (collider.axis === "x" ? collider.maxX - collider.minX : collider.maxZ - collider.minZ)
          : 0;
        const normal = collider.shape === "ramp"
          ? new THREE.Vector3(collider.axis === "x" ? -slope : 0, 1, collider.axis === "z" ? -slope : 0).normalize()
          : new THREE.Vector3(0, 1, 0);
        best = {
          collider,
          y: surfaceY,
          surfaceY,
          distance: feetY - surfaceY,
          normal,
          type: collider.type
        };
      }
    }
    return best;
  }

  function findLanding(x, z, fromY, toY, radius = PLAYER_RADIUS_HINT) {
    if (typeof x === "object" && x) {
      const query = x;
      x = query.x;
      z = query.z;
      fromY = query.fromY ?? query.y;
      toY = query.toY ?? query.nextY;
      radius = query.radius ?? radius;
    }
    if (![x, z, fromY, toY].every(Number.isFinite)) return null;
    const upper = Math.max(fromY, toY) + 0.04;
    const lower = Math.min(fromY, toY) - 0.06;
    let best = null;
    for (const collider of colliders) {
      if (!collider.walkable || !horizontalOverlap(collider, x, z, radius)) continue;
      const surfaceY = colliderSurfaceY(collider, x, z);
      if (surfaceY < lower || surfaceY > upper) continue;
      if (!best || surfaceY > best.y) {
        best = {
          collider,
          y: surfaceY,
          surfaceY,
          normal: new THREE.Vector3(0, 1, 0),
          type: collider.type
        };
      }
    }
    return best;
  }

  function findCeiling(x, z, fromY, toY = fromY + 1.8, radius = PLAYER_RADIUS_HINT) {
    if (typeof x === "object" && x) {
      const query = x;
      x = query.x;
      z = query.z;
      fromY = query.fromY ?? query.y;
      toY = query.toY ?? query.headY ?? (fromY + (query.height || 1.8));
      radius = query.radius ?? radius;
    }
    if (![x, z, fromY, toY].every(Number.isFinite)) return null;
    const low = Math.min(fromY, toY);
    const high = Math.max(fromY, toY);
    let nearest = null;
    for (const collider of colliders) {
      if (!collider.solid || !horizontalOverlap(collider, x, z, radius)) continue;
      const bottomY = collider.shape === "ramp"
        ? colliderSurfaceY(collider, x, z) - Math.max(0.08, collider.thickness || 0.18)
        : collider.minY;
      if (bottomY < low - 0.02 || bottomY > high + 0.02) continue;
      if (!nearest || bottomY < nearest.y) nearest = { collider, y: bottomY, ceilingY: bottomY, type: collider.type };
    }
    return nearest;
  }

  function getCheckpointAt(x, y, z) {
    if (typeof x === "object" && x) ({ x, y, z } = x);
    if (![x, y, z].every(Number.isFinite)) return null;
    let match = null;
    for (const checkpoint of checkpoints) {
      const dx = x - checkpoint.x;
      const dz = z - checkpoint.z;
      if (dx * dx + dz * dz <= checkpoint.radius * checkpoint.radius && Math.abs(y - checkpoint.y) <= checkpoint.verticalRange) {
        if (!match || checkpoint.tier > match.tier) match = checkpoint;
      }
    }
    return match;
  }

  function isAtExit(x, y, z) {
    if (typeof x === "object" && x) ({ x, y, z } = x);
    if (![x, y, z].every(Number.isFinite)) return false;
    return exitAccessPoints.some((accessPoint) =>
      x >= accessPoint.minX && x <= accessPoint.maxX &&
      y >= accessPoint.minY && y <= accessPoint.maxY &&
      z >= accessPoint.minZ && z <= accessPoint.maxZ
    );
  }

  function setExitOpen(open) {
    exitOpen = Boolean(open);
    return exitOpen;
  }

  function isExitOpen() {
    return exitOpen;
  }

  function updateFillSurfaces(time, player) {
    const playerX = Number.isFinite(player?.x) ? player.x : 9999;
    const playerZ = Number.isFinite(player?.z) ? player.z : 9999;
    const playerSpeed = clamp(Number.isFinite(player?.speed) ? Math.abs(player.speed) : 0, 0, 12);
    const playerRoom = getRoomAt(playerX, playerZ);
    for (const room of rooms) {
      room.level = fillHeight;
      room.volume = room.area * fillHeight;
      room.surface.position.y = fillHeight;
      const position = room.surface.geometry.getAttribute("position");
      const base = room.surface.geometry.userData.basePositions;
      const active = room === playerRoom;
      for (let index = 0; index < position.count; index += 1) {
        const localX = base[index * 3];
        const localZ = base[index * 3 + 2];
        const worldX = room.x + localX;
        const worldZ = room.z + localZ;
        let wave =
          Math.sin(worldX * 0.54 + time * 0.82 + room.phase) * 0.032 +
          Math.cos(worldZ * 0.49 - time * 0.69) * 0.026 +
          Math.sin((worldX + worldZ) * 1.55 + time * 0.41) * 0.011;
        if (active) {
          const dx = worldX - playerX;
          const dz = worldZ - playerZ;
          const distance = Math.sqrt(dx * dx + dz * dz);
          wave -= Math.exp(-distance * distance * 1.7) * (0.028 + playerSpeed * 0.004);
          wave += Math.sin(distance * 8 - time * (4.2 + playerSpeed * 0.2)) * Math.exp(-distance * 1.15) * playerSpeed * 0.0037;
        }
        position.setY(index, base[index * 3 + 1] + wave);
      }
      position.needsUpdate = true;
      if (frameCounter % (lowQuality ? 9 : highQuality ? 3 : 5) === 0 && position.count) {
        room.surface.geometry.computeVertexNormals();
      }
      // No per-frame computeBoundingSphere: these surfaces have frustumCulled =
      // false and are never raycast, so the recomputed sphere was pure waste.
    }
  }

  function updateSteam(dt, time) {
    const positions = steamGeometry.getAttribute("position");
    for (let index = 0; index < steamCount; index += 1) {
      let x = positions.getX(index) + Math.sin(time * 0.35 + steamSeeds[index]) * dt * 0.09;
      let y = positions.getY(index) + steamSpeeds[index] * dt;
      let z = positions.getZ(index) + Math.cos(time * 0.29 + steamSeeds[index] * 1.4) * dt * 0.08;
      if (y > Math.min(17.2, fillHeight + 7 + (index % 9) * 0.7) || !Number.isFinite(y)) {
        x = lerp(-20.5, 20.5, random());
        y = fillHeight + 0.1 + random() * 0.45;
        z = lerp(-29, 24, random());
      }
      positions.setXYZ(index, x, y, z);
    }
    positions.needsUpdate = true;
  }

  function update(dt, time, player, fillMultiplier = 1) {
    const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
    const safeTime = Number.isFinite(time) ? time : 0;
    const multiplier = clamp(Number.isFinite(fillMultiplier) ? fillMultiplier : 1, 0, 60);
    fillElapsed += safeDt * multiplier;
    runoffElapsed += safeDt;
    runoffTexture.offset.y = -((runoffElapsed * 0.48) % 1);
    updateRunoffInstances(runoffElapsed);
    const acceleration = clamp((fillElapsed - 25) / 230, 0, 1);
    const riseRate = lerp(FILL_RISE_RATE, MAX_FILL_RISE_RATE, acceleration);
    fillHeight = clamp(fillHeight + riseRate * safeDt * multiplier, 0, WORLD_BOUNDS.maxY - SURFACE_EPSILON);
    frameCounter += 1;
    updateFillSurfaces(safeTime, player);
    updateSteam(safeDt, safeTime);
    for (const light of animatedLights) {
      light.intensity = light.userData.baseIntensity * (
        0.94 +
        Math.sin(safeTime * 2.2 + light.userData.phase) * 0.045 +
        Math.sin(safeTime * 12.4 + light.userData.phase * 1.7) * 0.018
      );
    }
    const exitTarget = exitOpen ? 1 : 0;
    exitOpenAmount += (exitTarget - exitOpenAmount) * (1 - Math.exp(-safeDt * 4.8));
    const gatePulse = Math.sin(safeTime * (exitOpen ? 3.1 : 1.45));
    portal.material.color.copy(lockedPortalColor).lerp(openPortalColor, exitOpenAmount);
    portal.material.opacity = lerp(0.13 + gatePulse * 0.025, 0.68 + gatePulse * 0.1, exitOpenAmount);
    gateLockMaterial.opacity = Math.max(0, 1 - exitOpenAmount) * (0.82 + gatePulse * 0.08);
    gateLockMaterial.emissiveIntensity = 0.34 + Math.max(0, gatePulse) * 0.22;
    if (exitLockTendrils) {
      exitLockTendrils.visible = exitOpenAmount < 0.995;
      for (const tendril of exitLockTendrils.children) {
        const direction = Number(tendril.userData.openDirection) || 1;
        tendril.position.x = direction * exitOpenAmount * 4.15;
        tendril.rotation.z = direction * exitOpenAmount * 0.24;
      }
    }
    flameMesh.material.opacity = 0.86 + Math.sin(safeTime * 15.1) * 0.08;
    for (let index = 0; index < Math.min(knotMeshes.length, 5); index += 1) {
      knotMeshes[index].rotation.y += safeDt * (index % 2 === 0 ? 0.025 : -0.018);
    }
  }

  function getFillLevels() {
    return Object.fromEntries(rooms.map((room) => [room.id, room.level]));
  }

  function getFillSurfaces() {
    return rooms.map((room) => ({
      id: room.id,
      level: room.level,
      minX: room.minX,
      maxX: room.maxX,
      minZ: room.minZ,
      maxZ: room.maxZ,
      mesh: room.surface
    }));
  }

  function setAllLevels(value) {
    fillHeight = clamp(Number.isFinite(value) ? value : 0, 0, WORLD_BOUNDS.maxY - SURFACE_EPSILON);
    for (const room of rooms) {
      room.level = fillHeight;
      room.volume = room.area * fillHeight;
      room.surface.position.y = fillHeight;
    }
  }

  function reset() {
    fillHeight = 0.055;
    fillElapsed = 0;
    runoffElapsed = 0;
    runoffTexture.offset.y = 0;
    updateRunoffInstances(0);
    frameCounter = 0;
    exitOpen = false;
    exitOpenAmount = 0;
    portal.material.color.copy(lockedPortalColor);
    portal.material.opacity = 0.13;
    gateLockMaterial.opacity = 0.9;
    if (exitLockTendrils) {
      exitLockTendrils.visible = true;
      for (const tendril of exitLockTendrils.children) {
        tendril.position.x = 0;
        tendril.rotation.z = 0;
      }
    }
    setAllLevels(fillHeight);
    updateFillSurfaces(0, spawn);
  }

  function getStairRunoffData() {
    return {
      animationTime: runoffElapsed,
      textureOffset: runoffTexture.offset.y,
      flowDirection: "downhill",
      ribbonCount: flowRibbonCount,
      noodleSegmentCount: flowNoodleSegments,
      ramps: rampFlowDescriptors.map((ramp) => {
        const centerX = (ramp.minX + ramp.maxX) * 0.5;
        const centerZ = (ramp.minZ + ramp.maxZ) * 0.5;
        const centerY = lerp(ramp.yAtMin, ramp.yAtMax, 0.5);
        return {
          id: ramp.id,
          tag: ramp.tag,
          axis: ramp.axis,
          flowDirection: "downhill",
          downhill: ramp.axis === "x"
            ? { x: ramp.downhillSign, z: 0 }
            : { x: 0, z: ramp.downhillSign },
          visualSteps: ramp.visualSteps,
          ribbonLanes: runoffLanesPerRamp,
          noodleWorms: flowWormsPerRamp,
          bounds: {
            minX: ramp.minX,
            maxX: ramp.maxX,
            minZ: ramp.minZ,
            maxZ: ramp.maxZ,
            yAtMin: ramp.yAtMin,
            yAtMax: ramp.yAtMax
          },
          midpoint: { x: centerX, y: centerY + 0.08, z: centerZ }
        };
      })
    };
  }

  function getStats() {
    let drawables = 0;
    root.traverse((object) => {
      if (object.visible && (object.isMesh || object.isPoints || object.isSprite)) drawables += 1;
    });
    return {
      quality: normalizedQuality,
      worldBounds: { ...WORLD_BOUNDS },
      width: WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX,
      depth: WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ,
      height: WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY,
      routeTiers: 6,
      rooms: rooms.length,
      colliders: colliders.length,
      ramps: colliders.filter((collider) => collider.shape === "ramp").length,
      slickRamps: rampFlowDescriptors.length,
      flowRibbons: flowRibbonCount,
      flowNoodleSegments,
      flowDirection: "downhill",
      runoffTextureOffset: runoffTexture.offset.y,
      checkpoints: checkpoints.length,
      visibleStrands: noodleSegments.length,
      strandSegments: noodleSegments.length,
      volumetricStrands: noodleSegments.length,
      looseStrands: looseCount,
      candles: candleInstances.length,
      gothicArches: 14,
      sanctumMatte: 1,
      braidedColumns: 10,
      ornaments: ringInstances.length + candleInstances.length + flameInstances.length + knotMeshes.length + looseCount,
      lights: animatedLights.length + 3 + (highQuality ? 1 : 0),
      coverCount: colliders.filter((collider) => String(collider.tag).includes("cover")).length,
      upperPlatforms: traversalPlatforms.filter((platform) => platform.topY >= 7.5).length,
      traversableWindows: windowPassages.length,
      floodEscapeRoutes: escapeRoutes.length,
      exitOpen,
      exitOpenAmount,
      steamMotes: steamCount,
      drawables,
      fillHeight,
      totalFillVolume: rooms.reduce((sum, room) => sum + room.volume, 0),
      maximumLevel: fillHeight,
      sourceRate: lerp(FILL_RISE_RATE, MAX_FILL_RISE_RATE, clamp((fillElapsed - 25) / 230, 0, 1)),
      fillElapsed
    };
  }

  root.userData.architecture = {
    location: "Basilica Della Marinara",
    style: "volumetric-gothic-spaghetti",
    combatLanes: 3,
    verticalCombatTiers: 3,
    traversableWindowRoutes: windowPassages.length,
    floodEscapeRoutes: escapeRoutes.length,
    noodleSegments: noodleSegments.length,
    candles: candleInstances.length,
    coverObjects: colliders.filter((collider) => String(collider.tag).includes("cover")).length
  };

  reset();

  return {
    root,
    worldBounds: WORLD_BOUNDS,
    rooms,
    colliders,
    spawn,
    exit,
    checkpoints,
    route,
    debugCover,
    combatData,
    getCombatData,
    getTraversalData,
    getStairRunoffData,
    update,
    sampleLevel,
    sampleSurfaceY,
    sampleDepth,
    getRoomAt,
    querySolids,
    getSupport,
    findLanding,
    findCeiling,
    getCheckpointAt,
    isAtExit,
    setExitOpen,
    isExitOpen,
    getFillLevels,
    getFillSurfaces,
    setAllLevels,
    reset,
    getStats
  };
}
