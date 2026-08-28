// Authored material library. R6 adds dedicated biome-ground scans and one
// alpha-cut ground-cover family to the R5 surface/foliage set. Loading stays
// centralized so every system shares the same GPU textures and every optional
// asset can fall back without stopping boot.

import * as THREE from 'three';

const FILES = Object.freeze({
  forest: './assets/textures/r5-forest-bark-lichen.png',
  stone: './assets/textures/r5-weathered-ruin-stone.png',
  obsidian: './assets/textures/r5-obsidian-crust.png',
  ice: './assets/textures/r5-glacial-ice.png',
  mycel: './assets/textures/r5-mycelium-organic.png',
});

const FOLIAGE_FILES = Object.freeze({
  broadleaf: './assets/textures/r5-broadleaf-canopy.png',
  spruce: './assets/textures/r5-spruce-crown.png',
  mushroom: './assets/textures/r5-giant-mushroom-crown.png',
  cloud: './assets/textures/r5-cinematic-cloud-bank.png',
  groundcover: './assets/textures/r6-groundcover-sedge.png',
});

const GROUND_FILES = Object.freeze({
  vale: './assets/textures/r6-vale-ground.png',
  ember: './assets/textures/r6-ember-ground.png',
  frost: './assets/textures/r6-frost-ground.png',
  mycel: './assets/textures/r6-mycel-ground.png',
  shatter: './assets/textures/r6-shatter-ground.png',
});

const REPEAT = Object.freeze({
  forest: [2.4, 3.7],
  stone: [2.8, 2.8],
  obsidian: [2.25, 2.25],
  ice: [2.15, 2.15],
  mycel: [2.45, 2.45],
});

const surfaces = Object.create(null);
const foliage = Object.create(null);
const ground = Object.create(null);
let loading = null;

function configure(texture, key, renderer) {
  const [rx, ry] = REPEAT[key];
  texture.name = `r5-${key}-albedo`;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(rx, ry);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;

  // A luminance-derived bump is deliberately modest. The generated scans have
  // convincing microstructure, but large baked relief would fight the actual
  // mesh silhouette and look embossed at grazing angles.
  const bump = texture.clone();
  bump.name = `r5-${key}-bump`;
  bump.colorSpace = THREE.NoColorSpace;
  bump.needsUpdate = true;
  surfaces[key] = Object.freeze({ map: texture, bump });
}

function configureFoliage(texture, key, renderer) {
  texture.name = `r5-${key}-foliage`;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  foliage[key] = texture;
}

function configureGround(texture, key, renderer) {
  texture.name = `r6-${key}-ground`;
  // Mirrored repeat hides any residual edge bias in generated material scans;
  // the terrain shader also rotates a second scale so no tile reads as a stamp.
  texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  ground[key] = texture;
}

export async function loadWorldMaterials(renderer) {
  if (loading) return loading;
  const loader = new THREE.TextureLoader();
  const surfaceLoads = Object.entries(FILES).map(async ([key, url]) => {
    try {
      configure(await loader.loadAsync(url), key, renderer);
    } catch (error) {
      // Art assets are enhancement-only. The procedural fallback remains fully
      // playable if a browser cache or copied preview ever omits one file.
      console.warn(`[SKYSHARD] Optional ${key} material did not load`, error);
    }
  });
  const foliageLoads = Object.entries(FOLIAGE_FILES).map(async ([key, url]) => {
    try {
      configureFoliage(await loader.loadAsync(url), key, renderer);
    } catch (error) {
      console.warn(`[SKYSHARD] Optional ${key} foliage did not load`, error);
    }
  });
  const groundLoads = Object.entries(GROUND_FILES).map(async ([key, url]) => {
    try {
      configureGround(await loader.loadAsync(url), key, renderer);
    } catch (error) {
      console.warn(`[SKYSHARD] Optional ${key} ground material did not load`, error);
    }
  });
  loading = Promise.all([...surfaceLoads, ...foliageLoads, ...groundLoads]).then(() => surfaces);
  return loading;
}

export function worldSurface(key) {
  return surfaces[key] || null;
}

export function worldFoliage(key) {
  return foliage[key] || null;
}

export function worldGround(key) {
  return ground[key] || null;
}

// A lifted-detail cloud card keeps the photographic bank readable against the
// game's deep blue skies. Mapping source luminance into a controlled pastel
// range preserves its billows without letting the darker photographed folds
// turn into black cut-outs under night-biome grading.
export function cloudBillboardGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.5, 0, 0,  .5, 0, 0,  .5, 1, 0,
    -.5, 0, 0,  .5, 1, 0, -.5, 1, 0,
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
  ], 2));
  return geometry;
}

export function cloudBillboardMaterial(texture, options = {}) {
  const base = options.base || [.50, .64, .90];
  const peak = options.peak || [1.0, .98, .94];
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uOpacity: { value: options.opacity ?? .74 },
      uBase: { value: new THREE.Color(...base) },
      uPeak: { value: new THREE.Color(...peak) },
    },
    vertexShader: /* glsl */`
      varying vec2 vCloudUv;
      varying vec3 vInstanceTint;
      varying float vCloudVariant;
      void main() {
        vCloudUv = uv;
        #ifdef USE_INSTANCING_COLOR
          vInstanceTint = instanceColor;
        #else
          vInstanceTint = vec3(1.0);
        #endif
        #ifdef USE_INSTANCING
          vec4 worldOrigin = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vCloudVariant = fract(sin(dot(worldOrigin.xz, vec2(12.9898, 78.233))) * 43758.5453);
          vec4 viewPosition = viewMatrix * worldOrigin;
          vec2 instanceScale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
          viewPosition.xy += position.xy * instanceScale;
          gl_Position = projectionMatrix * viewPosition;
        #else
          vCloudVariant = 0.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #endif
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform vec3 uBase;
      uniform vec3 uPeak;
      varying vec2 vCloudUv;
      varying vec3 vInstanceTint;
      varying float vCloudVariant;
      void main() {
        vec2 cloudUv = vCloudUv;
        if (vCloudVariant > .5) cloudUv.x = 1.0 - cloudUv.x;
        vec4 sampleColor = texture2D(uMap, cloudUv);
        if (sampleColor.a < .055) discard;
        float luminance = dot(sampleColor.rgb, vec3(.299, .587, .114));
        vec3 lifted = mix(uBase, uPeak, smoothstep(.12, .86, luminance));
        lifted *= mix(.88, 1.08, vCloudVariant);
        gl_FragColor = vec4(lifted * vInstanceTint, sampleColor.a * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexColors: true,
    toneMapped: false,
  });
}

export const WORLD_MATERIAL_FILES = Object.freeze({ ...FILES, ...FOLIAGE_FILES, ...GROUND_FILES });
