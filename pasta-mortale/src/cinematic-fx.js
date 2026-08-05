import * as THREE from "../vendor/three.module.js?v=r165";

const QUALITY_PROFILES = Object.freeze({
  low: Object.freeze({ embers: 42, steam: 14, burstEmbers: 36, burstSteam: 18, droplets: 46, rings: 8, sheenSegments: 8 }),
  medium: Object.freeze({ embers: 92, steam: 30, burstEmbers: 72, burstSteam: 32, droplets: 84, rings: 14, sheenSegments: 14 }),
  high: Object.freeze({ embers: 164, steam: 54, burstEmbers: 118, burstSteam: 52, droplets: 132, rings: 22, sheenSegments: 22 })
});

const UP = new THREE.Vector3(0, 1, 0);
const PLANE_NORMAL = new THREE.Vector3(0, 0, 1);
const HIDDEN_POSITION = -10000;
const clamp = THREE.MathUtils.clamp;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

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

function normalizeQuality(value) {
  return value === "low" ? "low" : value === "medium" ? "medium" : "high";
}

function normalizeBounds(value = {}) {
  const minX = finite(value.minX ?? value.xMin, -24);
  const maxX = finite(value.maxX ?? value.xMax, 24);
  const minZ = finite(value.minZ ?? value.zMin, -30);
  const maxZ = finite(value.maxZ ?? value.zMax, 30);
  const minY = finite(value.minY ?? value.yMin, 0.04);
  const maxY = finite(value.maxY ?? value.yMax, 15);
  return {
    minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY), maxY: Math.max(minY, maxY),
    minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ)
  };
}

function vectorFrom(value, fallback = null) {
  if (value?.isVector3) return value.clone();
  if (Array.isArray(value)) {
    return new THREE.Vector3(finite(value[0]), finite(value[1]), finite(value[2]));
  }
  if (value && typeof value === "object") {
    return new THREE.Vector3(finite(value.x), finite(value.y), finite(value.z));
  }
  return fallback?.clone?.() || new THREE.Vector3();
}

function normalizeAnchors(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => {
    const position = vectorFrom(entry?.position || entry);
    return {
      position,
      radius: Math.max(0.04, finite(entry?.radius, 0.26)),
      height: Math.max(0.25, finite(entry?.height, 3.1)),
      intensity: Math.max(0, finite(entry?.intensity, 1)),
      phase: finite(entry?.phase)
    };
  });
}

function makeParticleTexture(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(32, 32, kind === "steam" ? 1 : 0, 32, 32, 31);
  if (kind === "steam") {
    gradient.addColorStop(0, "rgba(255,255,255,.82)");
    gradient.addColorStop(0.18, "rgba(255,246,226,.58)");
    gradient.addColorStop(0.55, "rgba(237,209,173,.16)");
    gradient.addColorStop(1, "rgba(230,188,140,0)");
  } else if (kind === "sauce") {
    gradient.addColorStop(0, "rgba(255,207,122,1)");
    gradient.addColorStop(0.18, "rgba(222,60,20,.96)");
    gradient.addColorStop(0.62, "rgba(118,10,5,.58)");
    gradient.addColorStop(1, "rgba(79,3,2,0)");
  } else {
    gradient.addColorStop(0, "rgba(255,255,220,1)");
    gradient.addColorStop(0.16, "rgba(255,219,97,1)");
    gradient.addColorStop(0.48, "rgba(255,104,18,.68)");
    gradient.addColorStop(1, "rgba(140,20,1,0)");
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function makePointCloud({ name, count, texture, blending, opacity = 1, depthTest = true }) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const phases = new Float32Array(count);
  positions.fill(HIDDEN_POSITION);
  colors.fill(1);
  sizes.fill(0.05);
  phases.fill(0);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setDrawRange(0, count);

  const material = new THREE.ShaderMaterial({
    name: `${name} material`,
    uniforms: {
      uMap: { value: texture },
      uOpacity: { value: opacity },
      uPixelRatio: { value: 1 },
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aAlpha;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vPhase;
      uniform float uPixelRatio;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        float perspective = clamp(250.0 / max(0.1, -viewPosition.z), 1.0, 48.0);
        gl_PointSize = clamp(aSize * perspective * uPixelRatio, 1.0, 80.0);
        gl_Position = projectionMatrix * viewPosition;
        vColor = aColor;
        vAlpha = aAlpha;
        vPhase = aPhase;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vPhase;
      void main() {
        vec2 uv = gl_PointCoord;
        float breathe = 0.88 + sin(uTime * 4.1 + vPhase) * 0.12;
        vec4 mask = texture2D(uMap, uv);
        float alpha = mask.a * vAlpha * uOpacity * breathe;
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(vColor * mask.rgb, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest,
    blending,
    toneMapped: false
  });

  const points = new THREE.Points(geometry, material);
  points.name = name;
  points.frustumCulled = false;
  points.renderOrder = blending === THREE.AdditiveBlending ? 8 : 5;
  return { points, geometry, material, positions, colors, sizes, alphas, phases, count };
}

function setCloudColor(cloud, index, color) {
  const offset = index * 3;
  cloud.colors[offset] = color.r;
  cloud.colors[offset + 1] = color.g;
  cloud.colors[offset + 2] = color.b;
}

function setCloudPosition(cloud, index, position) {
  const offset = index * 3;
  cloud.positions[offset] = position.x;
  cloud.positions[offset + 1] = position.y;
  cloud.positions[offset + 2] = position.z;
}

function hideCloudParticle(cloud, index) {
  const offset = index * 3;
  cloud.positions[offset] = HIDDEN_POSITION;
  cloud.positions[offset + 1] = HIDDEN_POSITION;
  cloud.positions[offset + 2] = HIDDEN_POSITION;
  cloud.alphas[index] = 0;
}

function markCloudDirty(cloud, positionOnly = false) {
  cloud.geometry.attributes.position.needsUpdate = true;
  cloud.geometry.attributes.aAlpha.needsUpdate = true;
  cloud.geometry.attributes.aSize.needsUpdate = true;
  if (!positionOnly) {
    cloud.geometry.attributes.aColor.needsUpdate = true;
    cloud.geometry.attributes.aPhase.needsUpdate = true;
  }
}

function createTransientPool(cloud, random) {
  const particles = Array.from({ length: cloud.count }, () => ({
    active: false,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    age: 0,
    lifetime: 1,
    baseSize: 0.06,
    growth: 0,
    gravity: 0,
    buoyancy: 0,
    drag: 0,
    floorY: -Infinity,
    bounce: 0,
    kind: "particle"
  }));
  let cursor = 0;

  function emit(config = {}) {
    let selected = -1;
    for (let attempt = 0; attempt < particles.length; attempt += 1) {
      const index = (cursor + attempt) % particles.length;
      if (!particles[index].active) {
        selected = index;
        break;
      }
    }
    if (selected < 0) selected = cursor;
    cursor = (selected + 1) % particles.length;
    const particle = particles[selected];
    particle.active = true;
    particle.position.copy(vectorFrom(config.position));
    particle.velocity.copy(vectorFrom(config.velocity));
    particle.age = 0;
    particle.lifetime = Math.max(0.04, finite(config.lifetime, 1));
    particle.baseSize = Math.max(0.003, finite(config.size, 0.06));
    particle.growth = finite(config.growth);
    particle.gravity = finite(config.gravity);
    particle.buoyancy = finite(config.buoyancy);
    particle.drag = Math.max(0, finite(config.drag));
    particle.floorY = finite(config.floorY, -Infinity);
    particle.bounce = clamp(finite(config.bounce), 0, 0.9);
    particle.kind = String(config.kind || "particle");
    const color = config.color?.isColor ? config.color : new THREE.Color(config.color ?? 0xffffff);
    setCloudPosition(cloud, selected, particle.position);
    setCloudColor(cloud, selected, color);
    cloud.sizes[selected] = particle.baseSize;
    cloud.alphas[selected] = Math.max(0, finite(config.alpha, 1));
    cloud.phases[selected] = random() * Math.PI * 2;
    return particle;
  }

  function update(dt) {
    let active = 0;
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.age += dt;
      const progress = particle.age / particle.lifetime;
      if (progress >= 1) {
        particle.active = false;
        hideCloudParticle(cloud, index);
        continue;
      }
      active += 1;
      const damping = Math.exp(-particle.drag * dt);
      particle.velocity.multiplyScalar(damping);
      particle.velocity.y += (particle.buoyancy - particle.gravity) * dt;
      particle.position.addScaledVector(particle.velocity, dt);
      if (particle.position.y < particle.floorY) {
        if (particle.bounce > 0.02 && Math.abs(particle.velocity.y) > 0.32) {
          particle.position.y = particle.floorY;
          particle.velocity.y = Math.abs(particle.velocity.y) * particle.bounce;
          particle.velocity.x *= 0.68;
          particle.velocity.z *= 0.68;
          particle.bounce *= 0.48;
        } else {
          particle.active = false;
          hideCloudParticle(cloud, index);
          continue;
        }
      }
      const fadeIn = clamp(progress / 0.12, 0, 1);
      const fadeOut = clamp((1 - progress) / 0.34, 0, 1);
      cloud.alphas[index] = fadeIn * fadeOut;
      cloud.sizes[index] = particle.baseSize * Math.max(0.1, 1 + particle.growth * progress);
      setCloudPosition(cloud, index, particle.position);
    }
    markCloudDirty(cloud, true);
    return active;
  }

  function clear() {
    for (let index = 0; index < particles.length; index += 1) {
      particles[index].active = false;
      hideCloudParticle(cloud, index);
    }
    markCloudDirty(cloud, true);
  }

  return { emit, update, clear, particles };
}

/**
 * Lightweight cinematic atmosphere for the spaghetti FPS.
 *
 * The returned object owns everything it adds to `scene`. Integrators can use
 * the ambient fields alone, add sauce sheen planes, register flickering world
 * lights, and feed combat/rain events into the spawn hooks.
 */
export function createCinematicFX(options = {}) {
  const scene = options.scene;
  if (!scene?.isScene) throw new Error("createCinematicFX requires a THREE.Scene");

  const renderer = options.renderer || null;
  const camera = options.camera?.isCamera ? options.camera : null;
  const quality = normalizeQuality(options.quality);
  const profile = QUALITY_PROFILES[quality];
  const random = mulberry32(finite(options.seed, 72431));
  const bounds = normalizeBounds(options.bounds || options.worldBounds);
  const root = new THREE.Group();
  root.name = "Pasta Mortale cinematic atmosphere";
  scene.add(root);

  const textures = {
    ember: makeParticleTexture("ember"),
    steam: makeParticleTexture("steam"),
    sauce: makeParticleTexture("sauce")
  };
  const ambientEmbers = makePointCloud({
    name: "Candle embers and fire motes",
    count: profile.embers,
    texture: textures.ember,
    blending: THREE.AdditiveBlending,
    opacity: quality === "low" ? 0.72 : 0.9
  });
  const ambientSteam = makePointCloud({
    name: "Slow kitchen steam wisps",
    count: profile.steam,
    texture: textures.steam,
    blending: THREE.NormalBlending,
    opacity: quality === "low" ? 0.2 : 0.3
  });
  const burstEmberCloud = makePointCloud({
    name: "Transient fire and bullet motes",
    count: profile.burstEmbers,
    texture: textures.ember,
    blending: THREE.AdditiveBlending,
    opacity: 1
  });
  const burstSteamCloud = makePointCloud({
    name: "Transient steam bursts",
    count: profile.burstSteam,
    texture: textures.steam,
    blending: THREE.NormalBlending,
    opacity: 0.46
  });
  const dropletCloud = makePointCloud({
    name: "Marinara splash droplets",
    count: profile.droplets,
    texture: textures.sauce,
    blending: THREE.NormalBlending,
    opacity: 0.96
  });
  root.add(ambientSteam.points, ambientEmbers.points, burstSteamCloud.points, burstEmberCloud.points, dropletCloud.points);

  const emberBursts = createTransientPool(burstEmberCloud, random);
  const steamBursts = createTransientPool(burstSteamCloud, random);
  const droplets = createTransientPool(dropletCloud, random);
  const trackedLights = [];
  const sheens = [];
  const sauceColor = new THREE.Color(options.sauceColor ?? 0x9a180d);
  const hotSauceColor = new THREE.Color(options.hotSauceColor ?? 0xe64818);
  let fireAnchors = normalizeAnchors(options.fireAnchors || options.candleAnchors);
  let steamAnchors = normalizeAnchors(options.steamAnchors);
  let sauceLevel = finite(options.sauceY ?? options.sauceLevel, bounds.minY + 0.035);
  let intensity = clamp(finite(options.intensity, 1), 0, 2);
  let enabled = options.enabled !== false;
  let internalTime = 0;
  let heatPulse = 0;
  let heatPulseDuration = 0;
  let combatIntensity = 0;
  let lastImpactPosition = new THREE.Vector3();
  const lastPlayerPosition = new THREE.Vector3(
    (bounds.minX + bounds.maxX) * 0.5,
    bounds.minY + 1.55,
    (bounds.minZ + bounds.maxZ) * 0.5
  );
  let lastPlayerYaw = 0;
  const observedCombat = { initialized: false, shots: 0, hits: 0, kills: 0, damageTaken: 0 };
  const autoCombatEvents = options.autoCombatEvents !== false;
  let impactCount = 0;
  let activeBurstEmbers = 0;
  let activeBurstSteam = 0;
  let activeDroplets = 0;
  let disposed = false;

  const emberState = Array.from({ length: profile.embers }, () => ({ position: new THREE.Vector3(), speed: 0, radius: 0, phase: 0, source: 0 }));
  const steamState = Array.from({ length: profile.steam }, () => ({ position: new THREE.Vector3(), speed: 0, drift: 0, phase: 0, source: 0, height: 1 }));
  const ringGeometry = new THREE.RingGeometry(0.21, 0.34, quality === "low" ? 14 : 28);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: hotSauceColor,
    transparent: true,
    opacity: quality === "low" ? 0.34 : 0.46,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: false
  });
  const rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, profile.rings);
  rings.name = "Marinara impact ripples";
  rings.frustumCulled = false;
  rings.renderOrder = 7;
  root.add(rings);
  const ringState = Array.from({ length: profile.rings }, () => ({
    active: false,
    position: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    age: 0,
    lifetime: 0.58,
    radius: 1,
    phase: 0
  }));
  const ringMatrix = new THREE.Matrix4();
  const ringScale = new THREE.Vector3();
  const ringQuaternion = new THREE.Quaternion();
  const ringHidden = new THREE.Matrix4().makeScale(0, 0, 0);
  let ringCursor = 0;
  for (let index = 0; index < ringState.length; index += 1) rings.setMatrixAt(index, ringHidden);
  rings.instanceMatrix.needsUpdate = true;

  let heatLight = null;
  let heatLightBaseIntensity = 0;
  let ownedHeatLight = false;
  if (options.heatLight) {
    const config = options.heatLight === true ? {} : options.heatLight;
    heatLight = new THREE.PointLight(
      config.color ?? 0xff6a20,
      Math.max(0, finite(config.intensity, quality === "low" ? 0.32 : 0.52)),
      Math.max(0, finite(config.distance, 8.5)),
      Math.max(0, finite(config.decay, 2))
    );
    heatLight.name = "Player sauce heat bounce";
    heatLight.position.set(0, 2.1, 0);
    heatLightBaseIntensity = heatLight.intensity;
    root.add(heatLight);
    ownedHeatLight = true;
  }

  const baseExposure = renderer ? finite(renderer.toneMappingExposure, 1) : 1;
  const modulateExposure = Boolean(options.modulateExposure && renderer);

  function randomPointInBounds(target, y = null) {
    target.set(
      THREE.MathUtils.lerp(bounds.minX, bounds.maxX, random()),
      y == null ? THREE.MathUtils.lerp(bounds.minY, bounds.maxY, random()) : y,
      THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, random())
    );
    return target;
  }

  function fallbackAnchor(kind, index) {
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    const phase = (index * 0.61803398875) % 1;
    return {
      position: new THREE.Vector3(
        bounds.minX + width * (0.08 + ((phase * 3.1) % 0.84)),
        kind === "fire" ? bounds.minY + 0.6 + ((index * 1.7) % Math.max(1, (bounds.maxY - bounds.minY) * 0.55)) : sauceLevel,
        bounds.minZ + depth * (0.1 + ((phase * 5.3) % 0.8))
      ),
      radius: kind === "fire" ? 0.32 : Math.max(0.55, Math.min(width, depth) * 0.045),
      height: kind === "fire" ? 3.4 : 4.6,
      intensity: 0.72,
      phase: index
    };
  }

  function getAnchor(kind, index) {
    const list = kind === "fire" ? fireAnchors : steamAnchors;
    return list.length > 0 ? list[index % list.length] : fallbackAnchor(kind, index);
  }

  // Reused across every ember/steam recycle so re-randomizing a particle's hue
  // does not allocate a fresh THREE.Color each time. setCloudColor only reads
  // r/g/b, so sharing this instance is safe.
  const ambientColorScratch = new THREE.Color();

  function resetAmbientEmber(index) {
    const state = emberState[index];
    const anchor = getAnchor("fire", index);
    state.source = index % Math.max(1, fireAnchors.length || 8);
    state.position.copy(anchor.position);
    state.position.x += (random() - 0.5) * anchor.radius * 2;
    state.position.y += random() * Math.max(0.2, anchor.height);
    state.position.z += (random() - 0.5) * anchor.radius * 2;
    state.speed = (0.12 + random() * 0.54) * anchor.intensity;
    state.radius = 0.03 + random() * 0.14;
    state.phase = random() * Math.PI * 2;
    setCloudPosition(ambientEmbers, index, state.position);
    setCloudColor(ambientEmbers, index, ambientColorScratch.setHSL(0.035 + random() * 0.075, 0.93, 0.54 + random() * 0.18));
    ambientEmbers.sizes[index] = 0.018 + random() * 0.05;
    ambientEmbers.alphas[index] = (0.25 + random() * 0.75) * Math.min(1.35, anchor.intensity);
    ambientEmbers.phases[index] = state.phase;
  }

  function resetAmbientSteam(index) {
    const state = steamState[index];
    const anchor = getAnchor("steam", index);
    state.source = index % Math.max(1, steamAnchors.length || 7);
    state.position.copy(anchor.position);
    state.position.x += (random() - 0.5) * anchor.radius * 2;
    state.position.y += random() * Math.max(0.2, anchor.height);
    state.position.z += (random() - 0.5) * anchor.radius * 2;
    state.speed = (0.12 + random() * 0.29) * Math.max(0.25, anchor.intensity);
    state.drift = 0.08 + random() * 0.23;
    state.phase = random() * Math.PI * 2;
    state.height = Math.max(0.3, anchor.height);
    setCloudPosition(ambientSteam, index, state.position);
    setCloudColor(ambientSteam, index, ambientColorScratch.setRGB(0.68 + random() * 0.12, 0.51 + random() * 0.12, 0.35 + random() * 0.1));
    ambientSteam.sizes[index] = 0.48 + random() * 0.88;
    ambientSteam.alphas[index] = (0.08 + random() * 0.18) * Math.min(1.2, anchor.intensity);
    ambientSteam.phases[index] = state.phase;
  }

  for (let index = 0; index < emberState.length; index += 1) resetAmbientEmber(index);
  for (let index = 0; index < steamState.length; index += 1) resetAmbientSteam(index);
  markCloudDirty(ambientEmbers);
  markCloudDirty(ambientSteam);

  function createSauceSheen(config = {}) {
    if (disposed) return null;
    const width = Math.max(0.2, finite(config.width ?? config.sizeX ?? config.size, bounds.maxX - bounds.minX));
    const depth = Math.max(0.2, finite(config.depth ?? config.sizeZ ?? config.size, bounds.maxZ - bounds.minZ));
    const geometry = new THREE.PlaneGeometry(1, 1, profile.sheenSegments, profile.sheenSegments);
    const base = config.color?.isColor ? config.color.clone() : new THREE.Color(config.color ?? sauceColor);
    const hot = config.highlightColor?.isColor ? config.highlightColor.clone() : new THREE.Color(config.highlightColor ?? 0xff9a48);
    const material = new THREE.ShaderMaterial({
      name: "Wet marinara sheen",
      uniforms: {
        uTime: { value: internalTime },
        uOpacity: { value: clamp(finite(config.opacity, quality === "low" ? 0.14 : 0.22), 0, 1) },
        uColor: { value: base },
        uHighlight: { value: hot },
        uImpact: { value: new THREE.Vector4(0, 0, 0, 99) },
        uRippleStrength: { value: 0 }
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 transformed = position;
          float broad = sin((uv.x * 7.0 + uv.y * 4.1) + uTime * 0.58) * 0.0045;
          float cross = sin((uv.x * 18.0 - uv.y * 13.0) - uTime * 0.81) * 0.0022;
          transformed.z += broad + cross;
          vec4 world = modelMatrix * vec4(transformed, 1.0);
          vWorld = world.xyz;
          vWave = broad + cross;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        uniform vec3 uHighlight;
        uniform vec4 uImpact;
        uniform float uRippleStrength;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying float vWave;
        void main() {
          vec3 toEye = normalize(cameraPosition - vWorld);
          float fresnel = pow(1.0 - abs(toEye.y), 2.4);
          float threadA = sin(vUv.x * 88.0 + sin(vUv.y * 23.0) * 3.0 + uTime * 0.52);
          float threadB = sin(vUv.y * 71.0 - vUv.x * 18.0 - uTime * 0.34);
          float streak = smoothstep(0.78, 1.0, threadA * 0.58 + threadB * 0.42);
          float distanceToImpact = distance(vWorld.xz, uImpact.xy);
          float ring = sin(distanceToImpact * 12.0 - uImpact.w * 10.0) * exp(-distanceToImpact * 0.34) * exp(-uImpact.w * 2.8);
          ring = max(0.0, ring) * uRippleStrength;
          float glint = clamp(fresnel * 0.72 + streak * 0.2 + ring * 0.7 + abs(vWave) * 14.0, 0.0, 1.0);
          vec3 color = mix(uColor, uHighlight, glint);
          float alpha = uOpacity * (0.52 + glint * 0.74);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      toneMapped: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = config.name || "Procedural wet sauce sheen";
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(
      finite(config.x ?? config.center?.x, (bounds.minX + bounds.maxX) * 0.5),
      finite(config.y ?? config.center?.y, sauceLevel + 0.018),
      finite(config.z ?? config.center?.z, (bounds.minZ + bounds.maxZ) * 0.5)
    );
    mesh.scale.set(width, depth, 1);
    mesh.renderOrder = finite(config.renderOrder, 3);
    mesh.frustumCulled = true;
    root.add(mesh);
    const record = { mesh, material, geometry, baseY: mesh.position.y, followsSauceLevel: config.followsSauceLevel !== false };
    sheens.push(record);
    return mesh;
  }

  function removeSauceSheen(mesh) {
    const index = sheens.findIndex((entry) => entry.mesh === mesh);
    if (index < 0) return false;
    const [record] = sheens.splice(index, 1);
    record.mesh.parent?.remove(record.mesh);
    record.geometry.dispose();
    record.material.dispose();
    return true;
  }

  function setAnchors(config = {}) {
    if (config.fire || config.candles || config.fireAnchors) {
      fireAnchors = normalizeAnchors(config.fire || config.candles || config.fireAnchors);
      for (let index = 0; index < emberState.length; index += 1) resetAmbientEmber(index);
      markCloudDirty(ambientEmbers);
    }
    if (config.steam || config.steamAnchors) {
      steamAnchors = normalizeAnchors(config.steam || config.steamAnchors);
      for (let index = 0; index < steamState.length; index += 1) resetAmbientSteam(index);
      markCloudDirty(ambientSteam);
    }
    return { fire: fireAnchors.length, steam: steamAnchors.length };
  }

  function setSauceLevel(value) {
    const next = finite(value, sauceLevel);
    const delta = next - sauceLevel;
    sauceLevel = next;
    for (const record of sheens) {
      if (!record.followsSauceLevel) continue;
      record.baseY += delta;
      record.mesh.position.y += delta;
    }
    return sauceLevel;
  }

  function registerLight(light, config = {}) {
    if (!light?.isLight) return null;
    const existing = trackedLights.find((entry) => entry.light === light);
    if (existing) return existing;
    const record = {
      light,
      baseIntensity: Math.max(0, finite(config.baseIntensity, light.intensity)),
      amount: clamp(finite(config.amount ?? config.flicker, 0.12), 0, 0.75),
      speed: Math.max(0.05, finite(config.speed, 6.5)),
      phase: finite(config.phase, random() * Math.PI * 2),
      pulseResponse: clamp(finite(config.pulseResponse, 0.24), 0, 1)
    };
    trackedLights.push(record);
    return record;
  }

  function unregisterLight(light, restore = true) {
    const index = trackedLights.findIndex((entry) => entry.light === light);
    if (index < 0) return false;
    const [record] = trackedLights.splice(index, 1);
    if (restore && record.light) record.light.intensity = record.baseIntensity;
    return true;
  }

  function emitRing(position, normal, intensityValue) {
    const index = ringCursor;
    ringCursor = (ringCursor + 1) % ringState.length;
    const ring = ringState[index];
    ring.active = true;
    ring.position.copy(position).addScaledVector(normal, 0.018);
    ring.normal.copy(normal).normalize();
    ring.age = 0;
    ring.lifetime = 0.42 + random() * 0.34;
    ring.radius = 0.65 + intensityValue * 0.95;
    ring.phase = random() * Math.PI * 2;
  }

  function fallbackDirection() {
    const direction = new THREE.Vector3();
    if (camera) {
      camera.updateMatrixWorld?.();
      camera.getWorldDirection(direction);
    } else {
      direction.set(-Math.sin(lastPlayerYaw), 0, -Math.cos(lastPlayerYaw));
    }
    if (direction.lengthSq() < 0.001) direction.set(0, 0, -1);
    return direction.normalize();
  }

  function fallbackWorldPoint(distance = 0, jitter = 0) {
    const position = lastPlayerPosition.clone();
    if (camera) camera.getWorldPosition(position);
    const direction = fallbackDirection();
    position.addScaledVector(direction, distance);
    if (jitter > 0) {
      const right = new THREE.Vector3().crossVectors(direction, UP);
      if (right.lengthSq() < 0.001) right.set(1, 0, 0);
      right.normalize();
      const up = new THREE.Vector3().crossVectors(right, direction).normalize();
      position.addScaledVector(right, (random() - 0.5) * jitter * 2);
      position.addScaledVector(up, (random() - 0.5) * jitter);
    }
    return position;
  }

  function spawnEmbers(positionOrConfig, maybeConfig = {}) {
    const config = positionOrConfig?.position ? positionOrConfig : { ...maybeConfig, position: positionOrConfig };
    const position = vectorFrom(config.position);
    const intensityValue = clamp(finite(config.intensity, 1), 0.05, 3);
    const requested = Math.round(finite(config.count, 5 + intensityValue * 7) * intensity);
    const count = clamp(requested, 1, quality === "low" ? 12 : 28);
    const spread = Math.max(0.01, finite(config.spread, 0.75));
    const velocity = vectorFrom(config.velocity, new THREE.Vector3(0, 1.5, 0));
    for (let index = 0; index < count; index += 1) {
      const direction = new THREE.Vector3(random() - 0.5, random() * 0.85 + 0.15, random() - 0.5).normalize();
      emberBursts.emit({
        position,
        velocity: velocity.clone().addScaledVector(direction, spread * (0.42 + random() * 1.1)),
        lifetime: 0.3 + random() * 0.75,
        size: 0.018 + random() * 0.055 * intensityValue,
        growth: -0.72,
        buoyancy: 0.65 + random() * 0.9,
        drag: 0.8,
        color: config.color ?? new THREE.Color().setHSL(0.035 + random() * 0.08, 1, 0.58 + random() * 0.16),
        kind: "ember"
      });
    }
    pulseHeat(0.08 * intensityValue, 0.18 + intensityValue * 0.08);
    return count;
  }

  function spawnSteam(positionOrConfig, maybeConfig = {}) {
    const config = positionOrConfig?.position ? positionOrConfig : { ...maybeConfig, position: positionOrConfig };
    const position = vectorFrom(config.position);
    const intensityValue = clamp(finite(config.intensity, 1), 0.05, 3);
    const requested = Math.round(finite(config.count, 3 + intensityValue * 5) * intensity);
    const count = clamp(requested, 1, quality === "low" ? 7 : 16);
    const spread = Math.max(0.01, finite(config.spread, 0.46));
    const velocity = vectorFrom(config.velocity, new THREE.Vector3(0, 0.42, 0));
    for (let index = 0; index < count; index += 1) {
      steamBursts.emit({
        position: position.clone().add(new THREE.Vector3((random() - 0.5) * spread, random() * spread * 0.25, (random() - 0.5) * spread)),
        velocity: velocity.clone().add(new THREE.Vector3((random() - 0.5) * 0.34, random() * 0.38, (random() - 0.5) * 0.34)),
        lifetime: 0.8 + random() * 1.6,
        size: (0.38 + random() * 0.8) * Math.sqrt(intensityValue),
        growth: 1.35 + random() * 0.8,
        buoyancy: 0.18 + random() * 0.25,
        drag: 0.72,
        color: config.color ?? 0xd6b17f,
        kind: "steam"
      });
    }
    return count;
  }

  function spawnSauceImpact(positionOrConfig, maybeConfig = {}) {
    const config = positionOrConfig?.position ? positionOrConfig : { ...maybeConfig, position: positionOrConfig };
    const position = vectorFrom(config.position);
    const normal = vectorFrom(config.normal, UP);
    if (normal.lengthSq() < 0.001) normal.copy(UP);
    normal.normalize();
    const intensityValue = clamp(finite(config.intensity, 1), 0.08, 3);
    const requested = Math.round(finite(config.count, 7 + intensityValue * 9) * intensity);
    const count = clamp(requested, 2, quality === "low" ? 12 : 28);
    const tangent = new THREE.Vector3().crossVectors(normal, Math.abs(normal.y) > 0.82 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const launch = Math.max(0.1, finite(config.launch, 1.25)) * Math.sqrt(intensityValue);
    const floorY = finite(config.floorY, sauceLevel);
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const radial = 0.25 + random() * 0.9;
      const velocity = normal.clone().multiplyScalar(launch * (0.35 + random() * 0.7));
      velocity.addScaledVector(tangent, Math.cos(angle) * launch * radial);
      velocity.addScaledVector(bitangent, Math.sin(angle) * launch * radial);
      if (normal.y > 0.45) velocity.y += 0.35 + random() * 1.1;
      droplets.emit({
        position: position.clone().addScaledVector(normal, 0.025),
        velocity,
        lifetime: 0.42 + random() * 0.78,
        size: (0.025 + random() * 0.072) * Math.sqrt(intensityValue),
        growth: -0.48,
        gravity: 5.8 + random() * 3.8,
        drag: 0.3,
        floorY,
        bounce: 0.16 + random() * 0.22,
        color: config.color ?? (random() > 0.38 ? hotSauceColor : sauceColor),
        kind: "sauce"
      });
    }
    emitRing(position, normal, intensityValue);
    lastImpactPosition.copy(position);
    impactCount += 1;
    for (const record of sheens) {
      record.material.uniforms.uImpact.value.set(position.x, position.z, intensityValue, 0);
      record.material.uniforms.uRippleStrength.value = Math.min(1.6, intensityValue);
    }
    if (config.steam !== false && intensityValue > 0.38) {
      spawnSteam({ position, count: Math.ceil(count * 0.2), intensity: intensityValue * 0.45, spread: 0.22 });
    }
    pulseHeat(0.05 * intensityValue, 0.24 + intensityValue * 0.08);
    return count;
  }

  function spawnImpact(config = {}) {
    const kind = String(config.kind || config.type || "sauce").toLowerCase();
    if (kind.includes("steam") || kind.includes("smoke")) return spawnSteam(config);
    if (kind.includes("fire") || kind.includes("ember") || kind.includes("spark") || kind.includes("bullet")) {
      return spawnEmbers(config);
    }
    return spawnSauceImpact(config);
  }

  function onShot(origin = null, direction = null, intensityValue = 1) {
    const shotOrigin = origin ? vectorFrom(origin?.position || origin) : fallbackWorldPoint(0.48, 0.025);
    const shotDirection = direction ? vectorFrom(direction) : fallbackDirection();
    if (shotDirection.lengthSq() < 0.001) shotDirection.copy(fallbackDirection());
    shotDirection.normalize();
    const strength = clamp(finite(intensityValue, 1), 0.1, 3);
    const emitted = spawnEmbers({
      position: shotOrigin,
      velocity: shotDirection.multiplyScalar(2.2 + strength * 0.7).add(new THREE.Vector3(0, 0.28, 0)),
      spread: 0.34 + strength * 0.08,
      count: 3 + Math.ceil(strength * 3),
      intensity: 0.65 + strength * 0.35
    });
    pulseHeat(0.11 * strength, 0.12 + strength * 0.045);
    return emitted;
  }

  function onHit(position = null, intensityValue = 1, sauce = true) {
    const hitPosition = position ? vectorFrom(position?.position || position) : fallbackWorldPoint(4.2, 0.6);
    const strength = clamp(finite(intensityValue, 1), 0.1, 3);
    const sauceAmount = sauce === false ? 0 : sauce === true || sauce == null ? 1 : clamp(finite(sauce), 0, 2);
    if (sauceAmount > 0.03) {
      return spawnSauceImpact({
        position: hitPosition,
        normal: position?.normal || UP,
        intensity: strength * (0.64 + sauceAmount * 0.36),
        count: 5 + Math.ceil(strength * 6),
        steam: sauceAmount > 0.32
      });
    }
    return spawnEmbers({ position: hitPosition, intensity: strength * 0.72, count: 3 + Math.ceil(strength * 4), spread: 0.46 });
  }

  function onKill(position = null, intensityValue = 1) {
    const killPosition = position ? vectorFrom(position?.position || position) : fallbackWorldPoint(5.6, 0.9);
    const strength = clamp(finite(intensityValue, 1), 0.25, 3);
    const dropletsEmitted = spawnSauceImpact({
      position: killPosition,
      normal: UP,
      intensity: 1.2 + strength * 0.62,
      count: 14 + Math.ceil(strength * 7),
      launch: 1.65,
      steam: false
    });
    spawnSteam({ position: killPosition, intensity: 0.8 + strength * 0.42, count: 5 + Math.ceil(strength * 3), spread: 0.58 });
    spawnEmbers({ position: killPosition, intensity: 0.6 + strength * 0.38, count: 4 + Math.ceil(strength * 4), spread: 0.92 });
    pulseHeat(0.28 + strength * 0.12, 0.42);
    return dropletsEmitted;
  }

  function onDamage(amount = 1, position = null) {
    const strength = clamp(Math.sqrt(Math.max(0.1, finite(amount, 1)) / 10), 0.22, 1.8);
    const damagePosition = position ? vectorFrom(position?.position || position) : fallbackWorldPoint(0.72, 0.12);
    const direction = fallbackDirection().multiplyScalar(-1);
    const normal = new THREE.Vector3(direction.x, Math.max(0.18, direction.y), direction.z).normalize();
    const emitted = spawnSauceImpact({
      position: damagePosition,
      normal,
      intensity: 0.36 + strength * 0.48,
      count: 3 + Math.ceil(strength * 4),
      launch: 0.58,
      steam: false,
      floorY: bounds.minY
    });
    pulseHeat(0.12 + strength * 0.16, 0.3);
    return emitted;
  }

  function consumeCombatState(state) {
    if (!state || typeof state !== "object") return 0;
    const stats = state.stats || {};
    const next = {
      shots: Math.max(0, finite(stats.shotsFired ?? stats.shots ?? state.shots)),
      hits: Math.max(0, finite(stats.hitsLanded ?? stats.hits ?? state.hits)),
      kills: Math.max(0, finite(stats.kills ?? state.kills)),
      damageTaken: Math.max(0, finite(stats.damageTaken ?? state.damageTaken))
    };
    if (!observedCombat.initialized || next.shots < observedCombat.shots || next.kills < observedCombat.kills) {
      Object.assign(observedCombat, next, { initialized: true });
    } else if (autoCombatEvents) {
      const shotDelta = Math.min(3, Math.floor(next.shots - observedCombat.shots));
      const hitDelta = Math.min(3, Math.floor(next.hits - observedCombat.hits));
      const killDelta = Math.min(3, Math.floor(next.kills - observedCombat.kills));
      const damageDelta = next.damageTaken - observedCombat.damageTaken;
      for (let index = 0; index < shotDelta; index += 1) onShot();
      for (let index = 0; index < hitDelta; index += 1) onHit(null, 0.62, true);
      for (let index = 0; index < killDelta; index += 1) onKill(null, 0.9);
      if (damageDelta > 0.01) onDamage(damageDelta);
      Object.assign(observedCombat, next);
    } else {
      Object.assign(observedCombat, next);
    }
    const living = Math.max(0, finite(state.livingEnemies ?? state.enemyCount ?? state.enemies?.length));
    const firingBoost = state.firing || state.weapon?.firing ? 0.28 : 0;
    const bossBoost = state.boss?.active || state.boss?.alive ? 0.22 : 0;
    return clamp(living / 7 + firingBoost + bossBoost, 0, 1.35);
  }

  function spawn(kindOrConfig, position, config = {}) {
    if (kindOrConfig && typeof kindOrConfig === "object") return spawnImpact(kindOrConfig);
    return spawnImpact({ ...config, kind: kindOrConfig, position });
  }

  function pulseHeat(amount = 0.25, duration = 0.3) {
    heatPulse = Math.max(heatPulse, clamp(finite(amount, 0.25), 0, 2));
    heatPulseDuration = Math.max(heatPulseDuration, Math.max(0.02, finite(duration, 0.3)));
    return heatPulse;
  }

  function updateAmbientEmbers(dt, time) {
    let recycled = false;
    for (let index = 0; index < emberState.length; index += 1) {
      const state = emberState[index];
      const anchor = getAnchor("fire", index);
      state.position.y += state.speed * dt;
      state.position.x += Math.sin(time * 1.9 + state.phase) * state.radius * dt;
      state.position.z += Math.cos(time * 1.43 + state.phase * 1.7) * state.radius * dt;
      const height = state.position.y - anchor.position.y;
      if (height > anchor.height || state.position.y > bounds.maxY + 1) {
        resetAmbientEmber(index);
        recycled = true;
      }
      const lifeFade = clamp(1 - Math.max(0, height) / Math.max(0.1, anchor.height), 0.05, 1);
      ambientEmbers.alphas[index] = intensity * (1 + combatIntensity * 0.18) * lifeFade *
        (0.42 + Math.sin(time * 7.2 + state.phase) * 0.17 + anchor.intensity * 0.36);
      setCloudPosition(ambientEmbers, index, state.position);
    }
    // Re-upload aColor/aPhase only on frames where a particle actually recycled,
    // so the freshly randomized hue/phase reach the GPU instead of being lost.
    markCloudDirty(ambientEmbers, !recycled);
  }

  function updateAmbientSteam(dt, time) {
    let recycled = false;
    for (let index = 0; index < steamState.length; index += 1) {
      const state = steamState[index];
      const anchor = getAnchor("steam", index);
      state.position.y += state.speed * dt;
      state.position.x += Math.sin(time * 0.52 + state.phase) * state.drift * dt;
      state.position.z += Math.cos(time * 0.41 + state.phase * 1.31) * state.drift * dt;
      const height = state.position.y - anchor.position.y;
      if (height > state.height || state.position.y > bounds.maxY + 2) {
        resetAmbientSteam(index);
        recycled = true;
      }
      const normalized = clamp(height / Math.max(0.1, state.height), 0, 1);
      const envelope = Math.sin(normalized * Math.PI);
      ambientSteam.alphas[index] = intensity * (1 + combatIntensity * 0.1) *
        (0.035 + envelope * 0.17) * Math.min(1.2, anchor.intensity);
      ambientSteam.sizes[index] = (0.46 + normalized * 1.4) * (0.84 + Math.sin(time * 0.73 + state.phase) * 0.16);
      setCloudPosition(ambientSteam, index, state.position);
    }
    markCloudDirty(ambientSteam, !recycled);
  }

  function updateRings(dt) {
    let dirty = false;
    for (let index = 0; index < ringState.length; index += 1) {
      const ring = ringState[index];
      if (!ring.active) continue;
      ring.age += dt;
      const progress = ring.age / ring.lifetime;
      if (progress >= 1) {
        ring.active = false;
        rings.setMatrixAt(index, ringHidden);
        dirty = true;
        continue;
      }
      const ease = 1 - Math.pow(1 - progress, 3);
      const fadeScale = clamp((1 - progress) / 0.18, 0, 1);
      const size = ring.radius * (0.36 + ease * 1.45) * fadeScale;
      // RingGeometry is authored in XY, so its face normal is +Z.
      ringQuaternion.setFromUnitVectors(PLANE_NORMAL, ring.normal);
      ringScale.set(size, size, size);
      ringMatrix.compose(ring.position, ringQuaternion, ringScale);
      rings.setMatrixAt(index, ringMatrix);
      dirty = true;
    }
    if (dirty) rings.instanceMatrix.needsUpdate = true;
  }

  function updateLights(dt, time, player) {
    const pulse = heatPulse;
    for (const record of trackedLights) {
      if (!record.light) continue;
      const wave = Math.sin(time * record.speed + record.phase) * 0.62 +
        Math.sin(time * record.speed * 2.73 + record.phase * 1.7) * 0.28 +
        Math.sin(time * record.speed * 0.37 + record.phase * 4.1) * 0.1;
      record.light.intensity = Math.max(0, record.baseIntensity * (1 + wave * record.amount + pulse * record.pulseResponse));
    }
    if (heatLight && player) {
      const px = finite(player.x ?? player.position?.x);
      const py = finite(player.y ?? player.position?.y);
      const pz = finite(player.z ?? player.position?.z);
      const response = 1 - Math.exp(-5.5 * dt);
      heatLight.position.x = THREE.MathUtils.lerp(heatLight.position.x, px, response);
      heatLight.position.y = THREE.MathUtils.lerp(heatLight.position.y, py + 1.4, response);
      heatLight.position.z = THREE.MathUtils.lerp(heatLight.position.z, pz + 0.35, response);
      heatLight.intensity = heatLightBaseIntensity *
        (0.94 + Math.sin(time * 3.4) * 0.04 + pulse * 0.22 + combatIntensity * 0.08);
    }
    if (heatPulseDuration > 0) {
      heatPulseDuration = Math.max(0, heatPulseDuration - dt);
      heatPulse *= Math.exp(-5.5 * dt);
    } else {
      heatPulse *= Math.exp(-10 * dt);
    }
    if (modulateExposure) {
      renderer.toneMappingExposure = baseExposure * (1 + Math.sin(time * 0.41) * 0.006 + heatPulse * 0.016);
    }
  }

  function update(dtValue, timeValue, playerOrContext = null, suppliedCombatState = null) {
    if (disposed) return getStats();
    const dt = enabled ? clamp(finite(dtValue), 0, 0.05) : 0;
    internalTime = Number.isFinite(Number(timeValue)) ? Number(timeValue) : internalTime + dt;
    let player = playerOrContext;
    let combatState = suppliedCombatState;
    if (playerOrContext?.player && (playerOrContext.combat || playerOrContext.combatState || playerOrContext.state)) {
      player = playerOrContext.player;
      combatState = suppliedCombatState || playerOrContext.combatState || playerOrContext.combat || playerOrContext.state;
    }
    if (player) {
      lastPlayerPosition.set(
        finite(player.x ?? player.position?.x, lastPlayerPosition.x),
        finite(player.y ?? player.position?.y, lastPlayerPosition.y),
        finite(player.z ?? player.position?.z, lastPlayerPosition.z)
      );
      lastPlayerYaw = finite(player.yaw, lastPlayerYaw);
    }
    const combatTarget = combatState ? consumeCombatState(combatState) : 0;
    combatIntensity = THREE.MathUtils.lerp(combatIntensity, combatTarget, 1 - Math.exp(-2.6 * dt));
    root.visible = enabled && intensity > 0.001;
    if (!root.visible) return getStats();

    for (const cloud of [ambientEmbers, ambientSteam, burstEmberCloud, burstSteamCloud, dropletCloud]) {
      cloud.material.uniforms.uTime.value = internalTime;
      cloud.material.uniforms.uOpacity.value = intensity * (cloud === ambientSteam ? (quality === "low" ? 0.2 : 0.3) : cloud === burstSteamCloud ? 0.46 : 1);
    }
    updateAmbientEmbers(dt, internalTime);
    updateAmbientSteam(dt, internalTime);
    activeBurstEmbers = emberBursts.update(dt);
    activeBurstSteam = steamBursts.update(dt);
    activeDroplets = droplets.update(dt);
    updateRings(dt);
    updateLights(dt, internalTime, player);

    for (const record of sheens) {
      const uniforms = record.material.uniforms;
      uniforms.uTime.value = internalTime;
      if (uniforms.uImpact.value.w < 99) uniforms.uImpact.value.w += dt;
      uniforms.uRippleStrength.value *= Math.exp(-2.4 * dt);
    }
    return getStats();
  }

  function resize(pixelRatio = null) {
    const ratio = clamp(finite(pixelRatio, renderer?.getPixelRatio?.() || globalThis.devicePixelRatio || 1), 0.5, 2);
    for (const cloud of [ambientEmbers, ambientSteam, burstEmberCloud, burstSteamCloud, dropletCloud]) {
      cloud.material.uniforms.uPixelRatio.value = ratio;
    }
    return ratio;
  }

  function setIntensity(value) {
    intensity = clamp(finite(value, intensity), 0, 2);
    root.visible = enabled && intensity > 0.001;
    return intensity;
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    root.visible = enabled && intensity > 0.001;
    return enabled;
  }

  function clearBursts() {
    emberBursts.clear();
    steamBursts.clear();
    droplets.clear();
    for (let index = 0; index < ringState.length; index += 1) {
      ringState[index].active = false;
      rings.setMatrixAt(index, ringHidden);
    }
    rings.instanceMatrix.needsUpdate = true;
    activeBurstEmbers = 0;
    activeBurstSteam = 0;
    activeDroplets = 0;
  }

  function reset() {
    clearBursts();
    heatPulse = 0;
    heatPulseDuration = 0;
    combatIntensity = 0;
    impactCount = 0;
    lastImpactPosition.set(0, 0, 0);
    Object.assign(observedCombat, { initialized: false, shots: 0, hits: 0, kills: 0, damageTaken: 0 });
    for (let index = 0; index < emberState.length; index += 1) resetAmbientEmber(index);
    for (let index = 0; index < steamState.length; index += 1) resetAmbientSteam(index);
    markCloudDirty(ambientEmbers);
    markCloudDirty(ambientSteam);
    for (const record of sheens) {
      record.material.uniforms.uImpact.value.set(0, 0, 0, 99);
      record.material.uniforms.uRippleStrength.value = 0;
    }
    for (const record of trackedLights) {
      if (record.light) record.light.intensity = record.baseIntensity;
    }
    if (heatLight) heatLight.intensity = heatLightBaseIntensity;
    if (renderer && modulateExposure) renderer.toneMappingExposure = baseExposure;
    root.visible = enabled && intensity > 0.001;
    return getStats();
  }

  function getStats() {
    return {
      quality,
      enabled,
      intensity,
      ambientEmbers: ambientEmbers.count,
      ambientSteam: ambientSteam.count,
      burstEmbers: activeBurstEmbers,
      burstSteam: activeBurstSteam,
      sauceDroplets: activeDroplets,
      sauceSheens: sheens.length,
      impactRings: ringState.filter((entry) => entry.active).length,
      trackedLights: trackedLights.length,
      fireAnchors: fireAnchors.length,
      steamAnchors: steamAnchors.length,
      impactCount,
      lastImpact: { x: lastImpactPosition.x, y: lastImpactPosition.y, z: lastImpactPosition.z },
      sauceLevel,
      heatPulse,
      combatIntensity
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clearBursts();
    for (const record of trackedLights) {
      if (record.light) record.light.intensity = record.baseIntensity;
    }
    trackedLights.length = 0;
    if (renderer && modulateExposure) renderer.toneMappingExposure = baseExposure;
    for (const record of sheens.splice(0)) {
      record.mesh.parent?.remove(record.mesh);
      record.geometry.dispose();
      record.material.dispose();
    }
    root.parent?.remove(root);
    for (const cloud of [ambientEmbers, ambientSteam, burstEmberCloud, burstSteamCloud, dropletCloud]) {
      cloud.geometry.dispose();
      cloud.material.dispose();
    }
    ringGeometry.dispose();
    ringMaterial.dispose();
    for (const texture of Object.values(textures)) texture.dispose();
    if (ownedHeatLight) heatLight?.dispose?.();
  }

  if (Array.isArray(options.lights)) {
    for (const entry of options.lights) registerLight(entry?.light || entry, entry?.light ? entry : {});
  }
  if (options.sauceSheen) {
    const configs = Array.isArray(options.sauceSheen) ? options.sauceSheen : [options.sauceSheen === true ? {} : options.sauceSheen];
    for (const config of configs) createSauceSheen(config);
  }
  resize();

  return {
    root,
    quality,
    update,
    resize,
    reset,
    dispose,
    getStats,
    inspect: getStats,
    setEnabled,
    setIntensity,
    setAnchors,
    setSauceLevel,
    createSauceSheen,
    removeSauceSheen,
    registerLight,
    unregisterLight,
    trackLight: registerLight,
    untrackLight: unregisterLight,
    spawn,
    spawnImpact,
    impact: spawnImpact,
    spawnEmbers,
    spawnSteam,
    spawnSauceImpact,
    spawnSauceSplash: spawnSauceImpact,
    onShot,
    onHit,
    onKill,
    onDamage,
    consumeCombatState,
    pulseHeat,
    clearBursts
  };
}
