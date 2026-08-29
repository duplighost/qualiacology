import * as THREE from 'three';
import { preloadBakedScoriaEnvironmentData } from './scoria-preloads.js';

export { preloadBakedScoriaEnvironmentData };

export const PLANET_ONE_TEXTURE_SIZE = 1024;

const TAU = Math.PI * 2;
const UINT32_RANGE = 4294967296;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const clamp01 = (value) => clamp(value, 0, 1);
const mix = (a, b, amount) => a + (b - a) * amount;
const fract = (value) => value - Math.floor(value);
const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

export function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const amount = clamp01((value - edge0) / (edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
}

export function normalizeSeed(seed = 1) {
  if (Number.isFinite(seed)) return (Math.trunc(seed) >>> 0) || 1;

  const text = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

export function createSeededRandom(seed = 1) {
  let state = normalizeSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function hash01(x, y, seed) {
  let value = seed ^ Math.imul(x | 0, 0x1f123bb5) ^ Math.imul(y | 0, 0x5f356495);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / UINT32_RANGE;
}

export function hash2D(x, y, seed = 1) {
  return hash01(Math.trunc(x), Math.trunc(y), normalizeSeed(seed));
}

function fade(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function valueNoisePeriodic(x, y, seed, periodX, periodY) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const px = Math.max(1, Math.round(periodX));
  const py = Math.max(1, Math.round(periodY));

  const a = hash01(positiveModulo(x0, px), positiveModulo(y0, py), seed);
  const b = hash01(positiveModulo(x1, px), positiveModulo(y0, py), seed);
  const c = hash01(positiveModulo(x0, px), positiveModulo(y1, py), seed);
  const d = hash01(positiveModulo(x1, px), positiveModulo(y1, py), seed);

  return mix(mix(a, b, tx), mix(c, d, tx), ty);
}

export function valueNoise2D(
  x,
  y,
  { seed = 1, periodX = 256, periodY = periodX } = {},
) {
  return valueNoisePeriodic(x, y, normalizeSeed(seed), periodX, periodY);
}

function fbmPeriodic(
  u,
  v,
  seed,
  octaves,
  frequencyX,
  frequencyY,
  gain,
  lacunarity,
) {
  let amplitude = 1;
  let total = 0;
  let weight = 0;
  let cellsX = Math.max(1, Math.round(frequencyX));
  let cellsY = Math.max(1, Math.round(frequencyY));

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoisePeriodic(u * cellsX, v * cellsY, seed + octave * 0x9e3779b1, cellsX, cellsY) * amplitude;
    weight += amplitude;
    amplitude *= gain;
    cellsX = Math.max(1, Math.round(cellsX * lacunarity));
    cellsY = Math.max(1, Math.round(cellsY * lacunarity));
  }

  return weight > 0 ? total / weight : 0;
}

export function fbm2D(
  u,
  v,
  {
    seed = 1,
    octaves = 5,
    frequencyX = 4,
    frequencyY = frequencyX,
    gain = 0.5,
    lacunarity = 2,
  } = {},
) {
  return fbmPeriodic(
    fract(u),
    fract(v),
    normalizeSeed(seed),
    Math.max(1, Math.trunc(octaves)),
    frequencyX,
    frequencyY,
    gain,
    lacunarity,
  );
}

export function ridgedFbm2D(u, v, options = {}) {
  const value = fbm2D(u, v, options);
  const ridge = 1 - Math.abs(value * 2 - 1);
  return ridge * ridge;
}

function sampleCellularPeriodic(u, v, seed, cellsX, cellsY, output) {
  const wrappedU = fract(u);
  const wrappedV = fract(v);
  const x = wrappedU * cellsX;
  const y = wrappedV * cellsY;
  const baseX = Math.floor(x);
  const baseY = Math.floor(y);
  let nearest = Number.POSITIVE_INFINITY;
  let secondNearest = Number.POSITIVE_INFINITY;
  let nearestCellValue = 0;

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const cellX = baseX + offsetX;
      const cellY = baseY + offsetY;
      const wrappedX = positiveModulo(cellX, cellsX);
      const wrappedY = positiveModulo(cellY, cellsY);
      const jitterX = 0.12 + hash01(wrappedX, wrappedY, seed) * 0.76;
      const jitterY = 0.12 + hash01(wrappedX, wrappedY, seed ^ 0x68bc21eb) * 0.76;
      const deltaX = cellX + jitterX - x;
      const deltaY = cellY + jitterY - y;
      const distance = deltaX * deltaX + deltaY * deltaY;

      if (distance < nearest) {
        secondNearest = nearest;
        nearest = distance;
        nearestCellValue = hash01(wrappedX, wrappedY, seed ^ 0x02e5be93);
      } else if (distance < secondNearest) {
        secondNearest = distance;
      }
    }
  }

  output.distance = Math.sqrt(nearest);
  output.edge = Math.sqrt(secondNearest) - output.distance;
  output.cellValue = nearestCellValue;
  return output;
}

export function createProceduralCanvas(width, height = width, canvasFactory) {
  const safeWidth = Math.max(1, Math.trunc(width));
  const safeHeight = Math.max(1, Math.trunc(height));
  let canvas;

  if (typeof canvasFactory === 'function') {
    canvas = canvasFactory(safeWidth, safeHeight);
  } else if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(safeWidth, safeHeight);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
  } else {
    throw new Error('Procedural canvas generation requires a browser canvas or a canvasFactory.');
  }

  canvas.width = safeWidth;
  canvas.height = safeHeight;
  return canvas;
}

export function canvasFromPixels(pixels, width, height, { canvasFactory } = {}) {
  const canvas = createProceduralCanvas(width, height, canvasFactory);
  const context = canvas.getContext('2d', { alpha: false }) || canvas.getContext('2d');
  if (!context) throw new Error('Unable to acquire a 2D context for procedural texture generation.');

  const image = context.createImageData(width, height);
  image.data.set(pixels);
  context.putImageData(image, 0, 0);
  return canvas;
}

function getCapabilities(rendererOrCapabilities) {
  return rendererOrCapabilities?.capabilities ?? rendererOrCapabilities ?? null;
}

export function resolveTextureAnisotropy(rendererOrCapabilities, requested = 12) {
  const capabilities = getCapabilities(rendererOrCapabilities);
  let maximum = 1;

  if (typeof capabilities?.getMaxAnisotropy === 'function') {
    maximum = capabilities.getMaxAnisotropy();
  } else if (Number.isFinite(capabilities?.maxAnisotropy)) {
    maximum = capabilities.maxAnisotropy;
  }

  return Math.max(1, Math.min(Math.trunc(requested), Math.trunc(maximum || 1)));
}

function configureSurfaceTexture(
  texture,
  {
    renderer,
    colorSpace = THREE.NoColorSpace,
    anisotropy = 12,
    repeat = [1, 1],
    offset = [0, 0],
    rotation = 0,
  } = {},
) {
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.offset.set(offset[0], offset[1]);
  texture.center.set(0.5, 0.5);
  texture.rotation = rotation;
  texture.anisotropy = resolveTextureAnisotropy(renderer, anisotropy);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function loadAuthoredSurfaceTexture(relativeUrl, {
  name,
  renderer,
  repeat = [1, 1],
  anisotropy = 12,
  colorSpace = THREE.SRGBColorSpace,
} = {}) {
  const sourceUrl = new URL(relativeUrl, import.meta.url).href;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const texture = new THREE.TextureLoader().load(
    sourceUrl,
    () => resolveReady(texture),
    undefined,
    (error) => rejectReady(new Error(`Unable to load authored surface texture ${sourceUrl}: ${error?.message ?? error}`)),
  );
  texture.name = name;
  texture.userData.authoredSource = {
    kind: 'generated-photoreal-material-scan',
    relativeUrl,
  };
  texture.userData.ready = ready;
  return configureSurfaceTexture(texture, {
    renderer,
    colorSpace,
    anisotropy,
    repeat,
  });
}

function loadBakedTextureSet({
  renderer,
  prefix,
  size,
  seed,
  repeat,
  anisotropy,
  sources,
  materialParameters,
}) {
  const load = (key, colorSpace) => loadAuthoredSurfaceTexture(sources[key], {
    name: `${prefix}-${key}`,
    renderer,
    repeat,
    anisotropy,
    colorSpace,
  });
  const map = load('map', THREE.SRGBColorSpace);
  const normalMap = load('normalMap', THREE.NoColorSpace);
  const roughnessMap = load('roughnessMap', THREE.NoColorSpace);
  const emissiveMap = load('emissiveMap', THREE.SRGBColorSpace);
  const textures = [map, normalMap, roughnessMap, emissiveMap];
  const ready = Promise.all(textures.map((texture) => texture.userData.ready)).then(() => undefined);
  let disposed = false;
  return {
    seed: normalizeSeed(seed),
    size,
    map,
    colorMap: map,
    normalMap,
    roughnessMap,
    emissiveMap,
    textures,
    ready,
    materialParameters: {
      map,
      normalMap,
      roughnessMap,
      emissiveMap,
      ...materialParameters,
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const texture of textures) texture.dispose();
    },
  };
}

function loadBakedTerrainResponse({
  renderer,
  size,
  repeat,
  anisotropy,
  sources,
}) {
  const names = {
    normalMap: 'scoria-authored-terrain-derived-normal-v1',
    roughnessMap: 'scoria-authored-terrain-derived-roughness-v1',
    emissiveMap: 'scoria-authored-terrain-derived-ember-mask-v1',
  };
  const load = (key, colorSpace) => {
    const texture = loadAuthoredSurfaceTexture(sources[key], {
      name: names[key],
      renderer,
      repeat,
      anisotropy,
      colorSpace,
    });
    texture.userData.authoredSource = {
      kind: 'lossless-baked-derived-terrain-response',
      relativeUrl: sources[key],
      generator: 'createAuthoredTerrainResponse',
      size,
    };
    return texture;
  };
  const normalMap = load('normalMap', THREE.NoColorSpace);
  const roughnessMap = load('roughnessMap', THREE.NoColorSpace);
  const emissiveMap = load('emissiveMap', THREE.SRGBColorSpace);
  const textures = [normalMap, roughnessMap, emissiveMap];
  return {
    normalMap,
    roughnessMap,
    emissiveMap,
    textures,
    ready: Promise.all(textures.map((texture) => texture.userData.ready)).then(() => undefined),
  };
}

// Exported so the shipping, losslessly baked response maps can be checked
// byte-for-byte against the deterministic authoring path. Production does not
// need to execute this 512px canvas analysis on the high-quality cold path.
export function createAuthoredTerrainResponse(sourceTexture, {
  renderer,
  size = 448,
  repeat = [5.5, 5.5],
  anisotropy = 10,
} = {}) {
  const safeSize = Math.max(128, Math.trunc(size));
  const samples = safeSize * safeSize;
  const neutralNormal = new Uint8ClampedArray(samples * 4);
  const neutralRoughness = new Uint8ClampedArray(samples * 4);
  const neutralEmissive = new Uint8ClampedArray(samples * 4);
  const height = new Float32Array(samples);
  for (let sample = 0; sample < samples; sample += 1) {
    const offset = sample * 4;
    neutralNormal[offset] = 128;
    neutralNormal[offset + 1] = 128;
    neutralNormal[offset + 2] = 255;
    neutralNormal[offset + 3] = 255;
    neutralRoughness[offset] = 235;
    neutralRoughness[offset + 1] = 235;
    neutralRoughness[offset + 2] = 235;
    neutralRoughness[offset + 3] = 255;
    neutralEmissive[offset + 3] = 255;
  }
  const shared = { renderer, repeat, anisotropy };
  const normalMap = canvasTextureFromPixels(neutralNormal, safeSize, safeSize, {
    ...shared,
    name: 'scoria-authored-terrain-derived-normal-v1',
    colorSpace: THREE.NoColorSpace,
  });
  const roughnessMap = canvasTextureFromPixels(neutralRoughness, safeSize, safeSize, {
    ...shared,
    name: 'scoria-authored-terrain-derived-roughness-v1',
    colorSpace: THREE.NoColorSpace,
  });
  const emissiveMap = canvasTextureFromPixels(neutralEmissive, safeSize, safeSize, {
    ...shared,
    name: 'scoria-authored-terrain-derived-ember-mask-v1',
    colorSpace: THREE.SRGBColorSpace,
  });

  const ready = sourceTexture.userData.ready.then(() => {
    const analysisCanvas = createProceduralCanvas(safeSize, safeSize);
    const context = analysisCanvas.getContext('2d', { alpha: false }) || analysisCanvas.getContext('2d');
    if (!context || !sourceTexture.image) throw new Error('Unable to derive Scoria terrain response maps.');
    context.drawImage(sourceTexture.image, 0, 0, safeSize, safeSize);
    const source = context.getImageData(0, 0, safeSize, safeSize).data;
    const roughness = new Uint8ClampedArray(samples * 4);
    const emissive = new Uint8ClampedArray(samples * 4);
    for (let sample = 0; sample < samples; sample += 1) {
      const offset = sample * 4;
      const red = source[offset] / 255;
      const green = source[offset + 1] / 255;
      const blue = source[offset + 2] / 255;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      // Dark stone bodies become the high side of this tactile field while
      // rust-red fines settle into the low channels. The deliberately modest
      // strength avoids embossing baked lighting into a second fake relief.
      height[sample] = clamp01((1 - luminance) * 0.72 + (red - blue) * -0.08);
      const grit = clamp01(Math.abs(red - green) * 1.4 + Math.abs(green - blue) * 0.8);
      setScalarPixel(roughness, offset, clamp01(0.84 + grit * 0.13 + (1 - luminance) * 0.035));
      // Only unusually warm, locally bright mineral seams emit at all. This
      // mask is intentionally two orders quieter than the explicit lava river.
      const warmth = clamp01((red - green * 1.32) * 2.8) * smoothstep(0.08, 0.32, luminance);
      setColorPixel(emissive, offset, warmth * 0.16, warmth * 0.025, warmth * 0.004);
    }
    // The authored scan is close to tileable but its opposite edges are not
    // pixel-identical. A wrapped derivative would turn that small albedo
    // mismatch into a repeated hard normal ridge. Crossfade paired edge
    // heights across a narrow band before deriving normals so the response
    // field itself is genuinely periodic without smearing the central grain.
    const edgeBand = Math.max(8, Math.round(safeSize * 0.035));
    const blendPair = (first, second, amount) => {
      const average = (height[first] + height[second]) * 0.5;
      height[first] = height[first] * (1 - amount) + average * amount;
      height[second] = height[second] * (1 - amount) + average * amount;
    };
    for (let offset = 0; offset < edgeBand; offset += 1) {
      const amount = 1 - smoothstep(0, edgeBand, offset);
      for (let y = 0; y < safeSize; y += 1) {
        blendPair(y * safeSize + offset, y * safeSize + (safeSize - 1 - offset), amount);
      }
      for (let x = 0; x < safeSize; x += 1) {
        blendPair(offset * safeSize + x, (safeSize - 1 - offset) * safeSize + x, amount);
      }
    }
    const normal = normalPixelsFromHeightField(height, safeSize, safeSize, 2.15);
    const upload = (texture, pixels) => {
      const uploadContext = texture.image.getContext('2d', { alpha: false }) || texture.image.getContext('2d');
      const image = uploadContext.createImageData(safeSize, safeSize);
      image.data.set(pixels);
      uploadContext.putImageData(image, 0, 0);
      texture.needsUpdate = true;
    };
    upload(normalMap, normal);
    upload(roughnessMap, roughness);
    upload(emissiveMap, emissive);
  });

  return {
    normalMap,
    roughnessMap,
    emissiveMap,
    textures: [normalMap, roughnessMap, emissiveMap],
    ready,
  };
}

export function canvasTextureFromPixels(
  pixels,
  width,
  height,
  {
    name = 'procedural-texture',
    canvasFactory,
    renderer,
    colorSpace = THREE.NoColorSpace,
    anisotropy = 12,
    repeat = [1, 1],
    offset = [0, 0],
    rotation = 0,
  } = {},
) {
  const canvas = canvasFromPixels(pixels, width, height, { canvasFactory });
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = name;
  return configureSurfaceTexture(texture, {
    renderer,
    colorSpace,
    anisotropy,
    repeat,
    offset,
    rotation,
  });
}

export function normalPixelsFromHeightField(heightField, width, height, strength = 4) {
  if (heightField.length !== width * height) {
    throw new RangeError('Height field dimensions do not match its sample count.');
  }

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const previousY = positiveModulo(y - 1, height);
    const nextY = positiveModulo(y + 1, height);
    for (let x = 0; x < width; x += 1) {
      const previousX = positiveModulo(x - 1, width);
      const nextX = positiveModulo(x + 1, width);
      const slopeX = (heightField[y * width + previousX] - heightField[y * width + nextX]) * strength;
      const slopeY = (heightField[previousY * width + x] - heightField[nextY * width + x]) * strength;
      const inverseLength = 1 / Math.hypot(slopeX, slopeY, 1);
      const offset = (y * width + x) * 4;

      pixels[offset] = Math.round((slopeX * inverseLength * 0.5 + 0.5) * 255);
      pixels[offset + 1] = Math.round((slopeY * inverseLength * 0.5 + 0.5) * 255);
      pixels[offset + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

function createSurfaceBuffers(size) {
  const sampleCount = size * size;
  return {
    height: new Float32Array(sampleCount),
    color: new Uint8ClampedArray(sampleCount * 4),
    roughness: new Uint8ClampedArray(sampleCount * 4),
    emissive: new Uint8ClampedArray(sampleCount * 4),
  };
}

function setColorPixel(buffer, offset, red, green, blue) {
  buffer[offset] = Math.round(clamp01(red) * 255);
  buffer[offset + 1] = Math.round(clamp01(green) * 255);
  buffer[offset + 2] = Math.round(clamp01(blue) * 255);
  buffer[offset + 3] = 255;
}

function setScalarPixel(buffer, offset, value) {
  const byte = Math.round(clamp01(value) * 255);
  buffer[offset] = byte;
  buffer[offset + 1] = byte;
  buffer[offset + 2] = byte;
  buffer[offset + 3] = 255;
}

function makeTextureSet(
  buffers,
  {
    prefix,
    size,
    renderer,
    anisotropy,
    repeat,
    canvasFactory,
    normalStrength,
    seed,
    materialParameters,
  },
) {
  const shared = { renderer, anisotropy, repeat, canvasFactory };
  const map = canvasTextureFromPixels(buffers.color, size, size, {
    ...shared,
    name: `${prefix}-color`,
    colorSpace: THREE.SRGBColorSpace,
  });
  const normalMap = canvasTextureFromPixels(
    normalPixelsFromHeightField(buffers.height, size, size, normalStrength),
    size,
    size,
    { ...shared, name: `${prefix}-normal`, colorSpace: THREE.NoColorSpace },
  );
  const roughnessMap = canvasTextureFromPixels(buffers.roughness, size, size, {
    ...shared,
    name: `${prefix}-roughness`,
    colorSpace: THREE.NoColorSpace,
  });
  const emissiveMap = canvasTextureFromPixels(buffers.emissive, size, size, {
    ...shared,
    name: `${prefix}-emissive`,
    colorSpace: THREE.SRGBColorSpace,
  });
  const textures = [map, normalMap, roughnessMap, emissiveMap];
  let disposed = false;

  for (const texture of textures) {
    texture.userData.procedural = { seed, size, set: prefix };
  }

  return {
    seed,
    size,
    map,
    colorMap: map,
    normalMap,
    roughnessMap,
    emissiveMap,
    textures,
    materialParameters: {
      map,
      normalMap,
      roughnessMap,
      emissiveMap,
      ...materialParameters,
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const texture of textures) texture.dispose();
    },
  };
}

function fillObsidianRoadBuffers(size, seed) {
  const buffers = createSurfaceBuffers(size);
  const cellular = { distance: 0, edge: 0, cellValue: 0 };

  for (let y = 0; y < size; y += 1) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const warpX = fbmPeriodic(u, v, seed ^ 0x6e624eb7, 3, 3, 5, 0.54, 2) - 0.5;
      const warpY = fbmPeriodic(u, v, seed ^ 0x7383ed49, 3, 5, 3, 0.54, 2) - 0.5;
      const warpedU = fract(u + warpX * 0.052);
      const warpedV = fract(v + warpY * 0.052);
      const macro = fbmPeriodic(warpedU, warpedV, seed ^ 0x2c1b3c6d, 5, 4, 7, 0.51, 2);
      const grain = fbmPeriodic(warpedU, warpedV, seed ^ 0x297a2d39, 3, 29, 47, 0.48, 2);
      const directionalWear = fbmPeriodic(
        fract(warpedU + warpedV * 0.081),
        warpedV,
        seed ^ 0x1b56c4e9,
        3,
        44,
        9,
        0.46,
        2,
      );
      sampleCellularPeriodic(warpedU, warpedV, seed ^ 0x7f4a7c15, 13, 19, cellular);

      const plateBoundary = 1 - smoothstep(0.018, 0.082, cellular.edge);
      const buriedHeat = fbmPeriodic(warpedU, warpedV, seed ^ 0x4f1bbcdc, 3, 8, 11, 0.5, 2);
      const fissureMask = smoothstep(0.62, 0.84, buriedHeat) * (0.4 + cellular.cellValue * 0.6);
      const fissure = clamp01(plateBoundary * fissureMask);
      const glassPocket = smoothstep(0.65, 0.9, macro) * smoothstep(0.52, 0.78, directionalWear);
      const abrasion = Math.abs(directionalWear - 0.5) * 2;
      const sample = y * size + x;
      const offset = sample * 4;

      buffers.height[sample] = clamp01(
        0.42 + macro * 0.28 + (grain - 0.5) * 0.1 - fissure * 0.3 - glassPocket * 0.025,
      );

      const mineralWarmth = smoothstep(0.48, 0.78, macro) * (0.35 + grain * 0.65);
      // This texture is multiplied by both authored vertex colour and the
      // physically-based light response in play.  A conventionally "dark"
      // albedo therefore collapsed into a black silhouette after ACES.  Keep
      // the source albedo in the pale-mineral range so the *rendered* result is
      // charcoal obsidian, with enough tonal headroom to read the crown,
      // plates and normal-map relief at hyperspeed.
      const platePatina = smoothstep(0.24, 0.78, cellular.cellValue)
        * smoothstep(0.17, 0.72, cellular.distance);
      const baseLuminance = 0.78
        + macro * 0.115
        + grain * 0.035
        + glassPocket * 0.045
        + platePatina * 0.015;
      setColorPixel(
        buffers.color,
        offset,
        baseLuminance * mix(0.95, 1.025, mineralWarmth) + fissure * 0.055,
        baseLuminance * mix(0.965, 0.91, mineralWarmth) + fissure * 0.012,
        baseLuminance * mix(1.005, 0.935, mineralWarmth) + fissure * 0.003,
      );

      const roughness = clamp01(
        0.57 + abrasion * 0.18 + grain * 0.12 + fissure * 0.08 - glassPocket * 0.31,
      );
      setScalarPixel(buffers.roughness, offset, roughness);

      const ember = fissure * smoothstep(0.7, 0.92, buriedHeat) * (0.38 + grain * 0.42);
      // Emission is a material mask, not a second copy of the albedo. Preserve
      // only a very low mineral afterglow beneath the genuinely hot fissures;
      // broad surface readability must come from the scene's physical light.
      const lavaBounce = 0.045 + macro * 0.035 + glassPocket * 0.025 + platePatina * 0.012;
      setColorPixel(
        buffers.emissive,
        offset,
        lavaBounce * 0.94 + ember * 0.72,
        lavaBounce * 0.78 + ember * 0.13,
        lavaBounce * 0.74 + ember * 0.012,
      );
    }
  }

  return buffers;
}

export function createObsidianRoadTextureSet({
  renderer,
  capabilities,
  seed = 'scoria-road-v1',
  size = PLANET_ONE_TEXTURE_SIZE,
  anisotropy = 12,
  repeat = [1.35, 8],
  canvasFactory,
} = {}) {
  const safeSize = Math.max(64, Math.trunc(size));
  const normalizedSeed = normalizeSeed(seed);
  const textureRenderer = renderer ?? capabilities;
  const buffers = fillObsidianRoadBuffers(safeSize, normalizedSeed);

  return makeTextureSet(buffers, {
    prefix: 'scoria-obsidian-road',
    size: safeSize,
    renderer: textureRenderer,
    anisotropy,
    repeat,
    canvasFactory,
    normalStrength: 5.2,
    seed: normalizedSeed,
    materialParameters: {
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.28,
      clearcoat: 0.38,
      clearcoatRoughness: 0.46,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.42,
      normalScale: new THREE.Vector2(0.72, 0.72),
    },
  });
}

function fillLavaCrustBuffers(size, seed) {
  const buffers = createSurfaceBuffers(size);
  const cellular = { distance: 0, edge: 0, cellValue: 0 };

  for (let y = 0; y < size; y += 1) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const warpX = fbmPeriodic(u, v, seed ^ 0x71e1f22d, 3, 3, 4, 0.53, 2) - 0.5;
      const warpY = fbmPeriodic(u, v, seed ^ 0x49d94e3b, 3, 4, 3, 0.53, 2) - 0.5;
      const warpedU = fract(u + warpX * 0.075);
      const warpedV = fract(v + warpY * 0.075);
      const crust = fbmPeriodic(warpedU, warpedV, seed ^ 0x5bd1e995, 5, 5, 6, 0.52, 2);
      const mineral = fbmPeriodic(warpedU, warpedV, seed ^ 0x27d4eb2f, 3, 31, 37, 0.47, 2);
      const heat = fbmPeriodic(warpedU, warpedV, seed ^ 0x165667b1, 4, 7, 9, 0.53, 2);
      sampleCellularPeriodic(warpedU, warpedV, seed ^ 0x85ebca77, 12, 15, cellular);

      const cellFracture = 1 - smoothstep(0.016, 0.105, cellular.edge);
      const branching = 1 - Math.abs(
        fbmPeriodic(warpedU, warpedV, seed ^ 0xc2b2ae3d, 4, 18, 21, 0.52, 2) * 2 - 1,
      );
      const branchFracture = smoothstep(0.9, 0.985, branching) * smoothstep(0.46, 0.72, heat);
      const fractureOcclusion = 0.38 + smoothstep(0.34, 0.78, heat) * 0.62;
      const fracture = clamp01(Math.max(cellFracture * fractureOcclusion, branchFracture * 0.74));
      const moltenPool = smoothstep(0.83, 0.94, heat) * smoothstep(0.62, 0.28, cellular.distance) * 0.68;
      const molten = clamp01(Math.max(fracture, moltenPool));
      const sample = y * size + x;
      const offset = sample * 4;

      buffers.height[sample] = clamp01(
        0.5 + crust * 0.34 + (mineral - 0.5) * 0.08 - molten * 0.54,
      );

      const cooledLuminance = 0.055 + crust * 0.105 + mineral * 0.035;
      const oxide = smoothstep(0.54, 0.84, crust) * (0.3 + cellular.cellValue * 0.7);
      setColorPixel(
        buffers.color,
        offset,
        cooledLuminance * mix(0.92, 1.38, oxide) + molten * 0.2,
        cooledLuminance * mix(0.86, 0.68, oxide) + molten * 0.026,
        cooledLuminance * mix(0.78, 0.54, oxide) + molten * 0.004,
      );

      const roughness = clamp01(0.78 + mineral * 0.17 + crust * 0.08 - molten * 0.68);
      setScalarPixel(buffers.roughness, offset, roughness);

      const temperature = smoothstep(0.38, 0.86, heat);
      const emission = Math.pow(molten, 0.8) * (0.56 + temperature * 0.44);
      setColorPixel(
        buffers.emissive,
        offset,
        emission,
        emission * mix(0.16, 0.62, temperature),
        emission * Math.pow(temperature, 5) * 0.12,
      );
    }
  }

  return buffers;
}

export function createLavaCrustTextureSet({
  renderer,
  capabilities,
  seed = 'scoria-lava-v1',
  size = PLANET_ONE_TEXTURE_SIZE,
  anisotropy = 12,
  repeat = [2, 2],
  canvasFactory,
} = {}) {
  const safeSize = Math.max(64, Math.trunc(size));
  const normalizedSeed = normalizeSeed(seed);
  const textureRenderer = renderer ?? capabilities;
  const buffers = fillLavaCrustBuffers(safeSize, normalizedSeed);

  return makeTextureSet(buffers, {
    prefix: 'scoria-lava-crust',
    size: safeSize,
    renderer: textureRenderer,
    anisotropy,
    repeat,
    canvasFactory,
    normalStrength: 6.8,
    seed: normalizedSeed,
    materialParameters: {
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.08,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.65,
      normalScale: new THREE.Vector2(0.9, 0.9),
    },
  });
}

function directionFromEquirectangular(u, v) {
  const polar = v * Math.PI;
  const azimuth = u * TAU;
  const polarSine = Math.sin(polar);
  return {
    x: polarSine * Math.cos(azimuth),
    y: Math.cos(polar),
    z: polarSine * Math.sin(azimuth),
  };
}

export function makeScoriaEnvironmentData(width, height, seed) {
  const data = new Float32Array(width * height * 4);
  const sunAzimuth = -2.18;
  const sunElevation = 0.19;
  const sunDirection = {
    x: Math.cos(sunElevation) * Math.cos(sunAzimuth),
    y: Math.sin(sunElevation),
    z: Math.cos(sunElevation) * Math.sin(sunAzimuth),
  };
  const sunDiscCosine = Math.cos(0.018);
  const sunHaloCosine = Math.cos(0.19);

  // The HDR formula below is unchanged, but its equirectangular direction and
  // four periodic value-noise lattices are separable. The previous version
  // allocated one direction object and repeated identical trig/modulo/hash
  // setup for every one of 204,800 high-quality texels. Cache those invariant
  // row/column terms while preserving the original arithmetic order inside
  // each interpolation; the resulting Float32 texture is byte-identical.
  const uValues = new Float64Array(width);
  const directionXScale = new Float64Array(width);
  const directionZScale = new Float64Array(width);
  for (let x = 0; x < width; x += 1) {
    const u = (x + 0.5) / width;
    const azimuth = u * TAU;
    uValues[x] = u;
    directionXScale[x] = Math.cos(azimuth);
    directionZScale[x] = Math.sin(azimuth);
  }
  const rowTerms = Array.from({ length: height }, (_, y) => {
    const v = (y + 0.5) / height;
    const polar = v * Math.PI;
    const polarSine = Math.sin(polar);
    const directionY = Math.cos(polar);
    return {
      v,
      polarSine,
      directionY,
      horizon: Math.exp(-Math.abs(directionY) * 8.5),
      lowerBounce: smoothstep(-0.02, -0.72, directionY),
      nebulaEnvelope: Math.exp(-Math.abs(directionY - 0.08) * 3.6),
      starEnvelope: smoothstep(0.05, 0.42, Math.abs(directionY)),
    };
  });
  const noiseOctaves = [];
  let amplitude = 1;
  let noiseWeight = 0;
  let cells = 3;
  const noiseSeed = seed ^ 0x9e3779b9;
  for (let octave = 0; octave < 4; octave += 1) {
    const x0 = new Uint8Array(width);
    const x1 = new Uint8Array(width);
    const tx = new Float64Array(width);
    const y0 = new Uint8Array(height);
    const y1 = new Uint8Array(height);
    const ty = new Float64Array(height);
    for (let x = 0; x < width; x += 1) {
      const coordinate = uValues[x] * cells;
      const base = Math.floor(coordinate);
      x0[x] = positiveModulo(base, cells);
      x1[x] = positiveModulo(base + 1, cells);
      tx[x] = fade(coordinate - base);
    }
    for (let y = 0; y < height; y += 1) {
      const coordinate = rowTerms[y].v * cells;
      const base = Math.floor(coordinate);
      y0[y] = positiveModulo(base, cells);
      y1[y] = positiveModulo(base + 1, cells);
      ty[y] = fade(coordinate - base);
    }
    const lattice = new Float64Array(cells * cells);
    const octaveSeed = noiseSeed + octave * 0x9e3779b1;
    for (let latticeY = 0; latticeY < cells; latticeY += 1) {
      for (let latticeX = 0; latticeX < cells; latticeX += 1) {
        lattice[latticeY * cells + latticeX] = hash01(latticeX, latticeY, octaveSeed);
      }
    }
    noiseOctaves.push({ cells, amplitude, x0, x1, tx, y0, y1, ty, lattice });
    noiseWeight += amplitude;
    amplitude *= 0.52;
    cells = Math.max(1, Math.round(cells * 2));
  }

  for (let y = 0; y < height; y += 1) {
    const row = rowTerms[y];
    const directionY = row.directionY;
    const polarSine = row.polarSine;
    const redBase = 0.0028 + row.horizon * 0.012 + row.lowerBounce * 0.016;
    const greenBase = 0.0034 + row.horizon * 0.005 + row.lowerBounce * 0.004;
    const blueBase = 0.0052 + row.horizon * 0.003 + row.lowerBounce * 0.0015;
    const octave0 = noiseOctaves[0];
    const octave1 = noiseOctaves[1];
    const octave2 = noiseOctaves[2];
    const octave3 = noiseOctaves[3];
    const octave0Top = octave0.y0[y] * octave0.cells;
    const octave0Bottom = octave0.y1[y] * octave0.cells;
    const octave1Top = octave1.y0[y] * octave1.cells;
    const octave1Bottom = octave1.y1[y] * octave1.cells;
    const octave2Top = octave2.y0[y] * octave2.cells;
    const octave2Bottom = octave2.y1[y] * octave2.cells;
    const octave3Top = octave3.y0[y] * octave3.cells;
    const octave3Bottom = octave3.y1[y] * octave3.cells;
    let offset = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const directionX = polarSine * directionXScale[x];
      const directionZ = polarSine * directionZScale[x];
      let nebulaTotal = 0;
      let top = mix(
        octave0.lattice[octave0Top + octave0.x0[x]],
        octave0.lattice[octave0Top + octave0.x1[x]],
        octave0.tx[x],
      );
      let bottom = mix(
        octave0.lattice[octave0Bottom + octave0.x0[x]],
        octave0.lattice[octave0Bottom + octave0.x1[x]],
        octave0.tx[x],
      );
      nebulaTotal += mix(top, bottom, octave0.ty[y]) * octave0.amplitude;
      top = mix(
        octave1.lattice[octave1Top + octave1.x0[x]],
        octave1.lattice[octave1Top + octave1.x1[x]],
        octave1.tx[x],
      );
      bottom = mix(
        octave1.lattice[octave1Bottom + octave1.x0[x]],
        octave1.lattice[octave1Bottom + octave1.x1[x]],
        octave1.tx[x],
      );
      nebulaTotal += mix(top, bottom, octave1.ty[y]) * octave1.amplitude;
      top = mix(
        octave2.lattice[octave2Top + octave2.x0[x]],
        octave2.lattice[octave2Top + octave2.x1[x]],
        octave2.tx[x],
      );
      bottom = mix(
        octave2.lattice[octave2Bottom + octave2.x0[x]],
        octave2.lattice[octave2Bottom + octave2.x1[x]],
        octave2.tx[x],
      );
      nebulaTotal += mix(top, bottom, octave2.ty[y]) * octave2.amplitude;
      top = mix(
        octave3.lattice[octave3Top + octave3.x0[x]],
        octave3.lattice[octave3Top + octave3.x1[x]],
        octave3.tx[x],
      );
      bottom = mix(
        octave3.lattice[octave3Bottom + octave3.x0[x]],
        octave3.lattice[octave3Bottom + octave3.x1[x]],
        octave3.tx[x],
      );
      nebulaTotal += mix(top, bottom, octave3.ty[y]) * octave3.amplitude;
      const nebulaNoise = nebulaTotal / noiseWeight;
      const nebula = Math.pow(smoothstep(0.5, 0.82, nebulaNoise), 1.5)
        * row.nebulaEnvelope;
      const sunDot = directionX * sunDirection.x
        + directionY * sunDirection.y
        + directionZ * sunDirection.z;
      const sunDisc = smoothstep(sunDiscCosine, 1, sunDot);
      const sunHalo = Math.pow(smoothstep(sunHaloCosine, 1, sunDot), 3.2);
      const starHash = hash01(x, y, seed ^ 0xa24baed5);
      const star = starHash > 0.99915
        ? Math.pow((starHash - 0.99915) / 0.00085, 2) * row.starEnvelope
        : 0;

      let red = redBase + nebula * 0.019;
      let green = greenBase + nebula * 0.005;
      let blue = blueBase + nebula * 0.003;

      red += sunHalo * 0.65 + sunDisc * 17;
      green += sunHalo * 0.18 + sunDisc * 8.4;
      blue += sunHalo * 0.035 + sunDisc * 2.1;
      if (star !== 0) {
        const starWarmth = hash01(x, y, seed ^ 0x3c6ef372);
        red += star * mix(0.72, 1.45, starWarmth);
        green += star * mix(0.82, 1.18, starWarmth);
        blue += star * mix(1.22, 0.86, starWarmth);
      }

      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 1;
      offset += 4;
    }
  }

  return data;
}

export function createScoriaEnvironment({
  renderer,
  seed = 'scoria-environment-v1',
  width = 1024,
  height = 512,
  pmrem = true,
  data: suppliedData = null,
} = {}) {
  const safeWidth = Math.max(64, Math.trunc(width));
  const safeHeight = Math.max(32, Math.trunc(height));
  const normalizedSeed = normalizeSeed(seed);
  const expectedValues = safeWidth * safeHeight * 4;
  if (suppliedData && (!(suppliedData instanceof Float32Array) || suppliedData.length !== expectedValues)) {
    throw new TypeError(`Scoria environment data must contain exactly ${expectedValues} Float32 values.`);
  }
  const data = suppliedData ?? makeScoriaEnvironmentData(safeWidth, safeHeight, normalizedSeed);
  const skyTexture = new THREE.DataTexture(
    data,
    safeWidth,
    safeHeight,
    THREE.RGBAFormat,
    THREE.FloatType,
  );

  skyTexture.name = 'scoria-dark-hdr-sky';
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  skyTexture.colorSpace = THREE.LinearSRGBColorSpace;
  skyTexture.wrapS = THREE.RepeatWrapping;
  skyTexture.wrapT = THREE.ClampToEdgeWrapping;
  skyTexture.minFilter = THREE.LinearFilter;
  skyTexture.magFilter = THREE.LinearFilter;
  skyTexture.generateMipmaps = false;
  skyTexture.unpackAlignment = 1;
  skyTexture.needsUpdate = true;
  skyTexture.userData.procedural = {
    seed: normalizedSeed,
    width: safeWidth,
    height: safeHeight,
    set: 'scoria-environment',
  };

  let pmremGenerator = null;
  let pmremTarget = null;
  if (pmrem && renderer?.isWebGLRenderer) {
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    pmremTarget = pmremGenerator.fromEquirectangular(skyTexture);
    pmremGenerator.dispose();
    pmremGenerator = null;
    pmremTarget.texture.name = 'scoria-dark-pmrem-environment';
  }

  const environmentTexture = pmremTarget?.texture ?? skyTexture;
  const textures = environmentTexture === skyTexture
    ? [skyTexture]
    : [skyTexture, environmentTexture];
  let disposed = false;

  return {
    seed: normalizedSeed,
    skyTexture,
    backgroundTexture: skyTexture,
    environmentTexture,
    pmremTarget,
    textures,
    suggestedBackgroundIntensity: 0.82,
    suggestedEnvironmentIntensity: 0.72,
    dispose() {
      if (disposed) return;
      disposed = true;
      pmremGenerator?.dispose();
      skyTexture.dispose();
      pmremTarget?.dispose();
    },
  };
}

export async function createPlanetOneArt({
  renderer,
  capabilities,
  road = {},
  lava = {},
  environment = {},
} = {}) {
  const startupStarted = performance.now();
  let startupLap = startupStarted;
  const startupStages = {};
  const recordStartupStage = (name) => {
    const now = performance.now();
    startupStages[name] = Number((now - startupLap).toFixed(3));
    startupLap = now;
  };
  const textureRenderer = renderer ?? capabilities;
  const environmentWidth = Math.max(64, Math.trunc(environment.width ?? 1024));
  const environmentHeight = Math.max(32, Math.trunc(environment.height ?? 512));
  const environmentSeed = environment.seed ?? 'scoria-environment-v1';
  const useBakedEnvironment = environmentWidth === 640
    && environmentHeight === 320
    && normalizeSeed(environmentSeed) === normalizeSeed('scoria-environment-v1');
  // Begin the exact raw Float32 fetch before constructing the authored PNG
  // texture vocabulary. Unlike an HDR image codec, this representation keeps
  // every source bit and requires no color conversion or quantization.
  const bakedEnvironmentData = useBakedEnvironment
    ? (environment.dataPromise ?? preloadBakedScoriaEnvironmentData())
    : Promise.resolve(null);
  // These lossless runtime maps are the exact deterministic 640px outputs of
  // createObsidianRoadTextureSet. Baking invariant pixels removes about a
  // second of hostile main-thread work without changing a texel or material
  // parameter. The procedural generator remains exported for authoring and
  // verification; production only pays image decode/upload.
  const roadTextures = loadBakedTextureSet({
    renderer: textureRenderer,
    prefix: 'scoria-road-runtime-v1',
    size: 640,
    seed: road.seed ?? 'scoria-road-v1',
    repeat: road.repeat ?? [1.35, 8],
    anisotropy: road.anisotropy ?? 12,
    sources: {
      map: '../assets/textures/scoria-road-ai-v1.webp',
      normalMap: '../assets/textures/runtime/scoria-road-normal-640.png',
      roughnessMap: '../assets/textures/runtime/scoria-road-roughness-640.png',
      emissiveMap: '../assets/textures/runtime/scoria-road-emissive-640.png',
    },
    materialParameters: {
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.28,
      clearcoat: 0.38,
      clearcoatRoughness: 0.46,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.42,
      normalScale: new THREE.Vector2(0.72, 0.72),
    },
  });
  recordStartupStage('roadBakedRequests');

  const terrainMap = loadAuthoredSurfaceTexture('../assets/textures/scoria-terrain-ai-v1.webp', {
    name: 'scoria-authored-terrain-color-v1',
    renderer: textureRenderer,
    repeat: environment.terrainRepeat ?? [5.5, 5.5],
    anisotropy: environment.anisotropy ?? 10,
  });
  const terrainResponseSize = Math.min(512, Math.max(256, environment.terrainResponseSize ?? environment.width ?? 448));
  const terrainResponseOptions = {
    renderer: textureRenderer,
    size: terrainResponseSize,
    repeat: environment.terrainRepeat ?? [5.5, 5.5],
    anisotropy: environment.anisotropy ?? 10,
  };
  const terrainResponse = terrainResponseSize === 512
    ? loadBakedTerrainResponse({
      ...terrainResponseOptions,
      sources: {
        normalMap: '../assets/textures/runtime/scoria-terrain-normal-512.png',
        roughnessMap: '../assets/textures/runtime/scoria-terrain-roughness-512.png',
        emissiveMap: '../assets/textures/runtime/scoria-terrain-emissive-512.png',
      },
    })
    : createAuthoredTerrainResponse(terrainMap, terrainResponseOptions);
  recordStartupStage(terrainResponseSize === 512 ? 'terrainBakedRequests' : 'terrainResponsePlaceholders');
  const terrainTextures = [terrainMap, ...terrainResponse.textures];
  const terrain = {
    map: terrainMap,
    colorMap: terrainMap,
    normalMap: terrainResponse.normalMap,
    roughnessMap: terrainResponse.roughnessMap,
    emissiveMap: terrainResponse.emissiveMap,
    textures: terrainTextures,
    dispose() {
      for (const texture of terrainTextures) texture.dispose();
    },
  };
  const shardCathedralMap = loadAuthoredSurfaceTexture('../assets/textures/shard-cathedral-rock-ai-v3.webp', {
    name: 'shard-cathedral-authored-rock-color-v3',
    renderer: textureRenderer,
    repeat: environment.shardRepeat ?? [2.75, 2.75],
    anisotropy: environment.anisotropy ?? 10,
  });
  const shardResponseOptions = {
    renderer: textureRenderer,
    size: terrainResponseSize,
    repeat: environment.shardRepeat ?? [2.75, 2.75],
    anisotropy: environment.anisotropy ?? 10,
  };
  const shardCathedralResponse = terrainResponseSize === 512
    ? loadBakedTerrainResponse({
      ...shardResponseOptions,
      sources: {
        normalMap: '../assets/textures/runtime/shard-cathedral-normal-512.png',
        roughnessMap: '../assets/textures/runtime/shard-cathedral-roughness-512.png',
        emissiveMap: '../assets/textures/runtime/shard-cathedral-emissive-512.png',
      },
    })
    : createAuthoredTerrainResponse(shardCathedralMap, shardResponseOptions);
  recordStartupStage(terrainResponseSize === 512 ? 'shardBakedRequests' : 'shardResponsePlaceholders');
  const shardCathedralTextures = [shardCathedralMap, ...shardCathedralResponse.textures];
  const shardCathedral = {
    map: shardCathedralMap,
    colorMap: shardCathedralMap,
    normalMap: shardCathedralResponse.normalMap,
    roughnessMap: shardCathedralResponse.roughnessMap,
    textures: shardCathedralTextures,
    dispose() {
      for (const texture of shardCathedralTextures) texture.dispose();
    },
  };
  const lavaTextures = loadBakedTextureSet({
    renderer: textureRenderer,
    prefix: 'scoria-lava-runtime-v1',
    size: 640,
    seed: lava.seed ?? 'scoria-lava-v1',
    repeat: lava.repeat ?? [2, 2],
    anisotropy: lava.anisotropy ?? 12,
    sources: {
      map: '../assets/textures/runtime/scoria-lava-color-640.png',
      normalMap: '../assets/textures/runtime/scoria-lava-normal-640.png',
      roughnessMap: '../assets/textures/runtime/scoria-lava-roughness-640.png',
      emissiveMap: '../assets/textures/runtime/scoria-lava-emissive-640.png',
    },
    materialParameters: {
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.08,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.65,
      normalScale: new THREE.Vector2(0.9, 0.9),
    },
  });
  recordStartupStage('lavaBakedRequests');
  const environmentWaitStarted = performance.now();
  const environmentRequest = await bakedEnvironmentData;
  const environmentWaitMs = performance.now() - environmentWaitStarted;
  const environmentData = environmentRequest?.data ?? environmentRequest;
  const environmentCreateStarted = performance.now();
  const scoriaEnvironment = createScoriaEnvironment({
    renderer,
    ...environment,
    data: environmentData ?? environment.data ?? null,
  });
  const environmentCreateMs = performance.now() - environmentCreateStarted;
  recordStartupStage('environment');
  const textures = [
    ...roadTextures.textures,
    ...terrainTextures,
    ...shardCathedralTextures,
    ...lavaTextures.textures,
    ...scoriaEnvironment.textures,
  ];
  let disposed = false;
  const ready = Promise.all([
    roadTextures.ready,
    terrainMap.userData.ready,
    terrainResponse.ready,
    shardCathedralMap.userData.ready,
    shardCathedralResponse.ready,
    lavaTextures.ready,
  ]).then(() => undefined);

  return {
    road: roadTextures,
    terrain,
    shardCathedral,
    lava: lavaTextures,
    environment: scoriaEnvironment,
    startupTimings: {
      totalMs: Number((performance.now() - startupStarted).toFixed(3)),
      stages: startupStages,
      environmentData: environmentRequest?.fetchMs == null ? null : {
        bytes: environmentRequest.bytes,
        fetchMs: Number(environmentRequest.fetchMs.toFixed(3)),
        waitMs: Number(environmentWaitMs.toFixed(3)),
        dataTextureAndPmremMs: Number(environmentCreateMs.toFixed(3)),
      },
    },
    textures,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      roadTextures.dispose();
      terrain.dispose();
      shardCathedral.dispose();
      lavaTextures.dispose();
      scoriaEnvironment.dispose();
    },
  };
}
