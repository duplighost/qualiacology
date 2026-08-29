import * as THREE from 'three';
import { writeTrackSurfaceLocalContactFrame } from './surface-frame.js';

/**
 * Authored Stormglass touchdown zone for the first ~800 logical metres of Planet 2.
 *
 * Construction requires the Planet 2 `segment` and the existing pure
 * `sampleTrack(segment, distance)` function. Per frame call `update()` with:
 * `{ active, time, dt, progress, speed, camera, visibility }`, where `progress`
 * is the renderer's unscaled/logical segment progress. The module owns only art;
 * the renderer remains authoritative for physics, road collision, and camera.
 * No geometry, materials, scene objects, or random values are created in update().
 */

const TAU = Math.PI * 2;
const EPSILON = 1e-6;
// Begin far enough before the mathematical planet boundary that the actual
// Stormglass surface is already visible beneath the rocket during descent.
// This negative runway is presentation-only; collision remains in renderer/sim.
const ZONE_START = -280;
const ZONE_END = 870;

const QUALITY = Object.freeze({
  low: Object.freeze({
    roadRows: 40, roadColumns: 9, oceanRows: 30, cliffs: 14,
    studPairs: 26, rain: 72, bolts: 4,
  }),
  medium: Object.freeze({
    roadRows: 54, roadColumns: 15, oceanRows: 38, cliffs: 20,
    studPairs: 34, rain: 112, bolts: 5,
  }),
  high: Object.freeze({
    roadRows: 72, roadColumns: 15, oceanRows: 50, cliffs: 28,
    studPairs: 42, rain: 168, bolts: 6,
  }),
});

const DEFAULT_PALETTE = Object.freeze({
  roadAbyss: 0x07151b,
  roadGlass: 0x16414a,
  roadWear: 0x28636d,
  edge: 0x79dce5,
  oceanDeep: 0x01060a,
  oceanGlass: 0x072a35,
  foam: 0x569ba6,
  cliff: 0x030d13,
  cliffWet: 0x244a57,
  rain: 0x8ad9e5,
  lightning: 0xe7ffff,
  cloud: 0x07131d,
});

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const saturate = (value) => clamp(Number.isFinite(value) ? value : 0, 0, 1);
const lerp = (a, b, amount) => a + (b - a) * amount;
const fract = (value) => value - Math.floor(value);
const smoothstep01 = (value) => {
  const t = saturate(value);
  return t * t * (3 - 2 * t);
};
const smoothRange = (start, end, value) => smoothstep01((value - start) / Math.max(EPSILON, end - start));

function hash32(value) {
  let x = value >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function makeRng(seed) {
  let state = hash32(seed || 1);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function makeIndexedGeometry(positions, normals, uvs, fades, distances, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('zoneFade', new THREE.Float32BufferAttribute(fades, 1));
  geometry.setAttribute('courseDistance', new THREE.Float32BufferAttribute(distances, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function makeRoadGeometry(segment, sampleTrack, rows, columns) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const fades = [];
  const distances = [];
  const indices = [];

  for (let row = 0; row < rows; row += 1) {
    const rowAmount = row / Math.max(1, rows - 1);
    const distance = lerp(ZONE_START, ZONE_END, rowAmount);
    const sampleDistance = clamp(distance, 0, segment.length);
    const sample = sampleTrack(segment, sampleDistance);
    const next = sampleTrack(segment, Math.min(segment.length, sampleDistance + 2));
    const cos = Math.cos(sample.bank);
    const sin = Math.sin(sample.bank);
    const normalXRaw = -sin * 2;
    const normalYRaw = cos * 2;
    const normalZRaw = cos * (next.y - sample.y) - sin * (next.x - sample.x);
    const normalLength = Math.hypot(normalXRaw, normalYRaw, normalZRaw) || 1;
    const zoneFade = smoothRange(ZONE_START, -12, distance) * (1 - smoothRange(748, ZONE_END, distance));

    for (let column = 0; column < columns; column += 1) {
      const across = column / Math.max(1, columns - 1);
      const u = across * 2 - 1;
      const edge = Math.abs(u);
      // This is the exact renderer/surface-frame road column contract. The
      // authored touchdown strip is already the visible collision surface
      // during reentry, so even a small independent profile here produces a
      // false wheel gap or a buried sill at the S1 -> P2 handoff.
      const crown = (1 - Math.pow(edge, 1.45)) * 0.13;
      const shoulder = smoothRange(0.78, 1, edge) * 0.22;
      const surfaceHeight = crown - shoulder;
      const lateral = u * sample.width;
      positions.push(
        sample.x + lateral * cos - surfaceHeight * sin,
        sample.y + lateral * sin + surfaceHeight * cos - 0.52,
        -distance,
      );
      normals.push(normalXRaw / normalLength, normalYRaw / normalLength, normalZRaw / normalLength);
      uvs.push(across, rowAmount);
      fades.push(zoneFade);
      distances.push(distance);
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      indices.push(a, a + columns, a + 1, a + columns, a + columns + 1, a + 1);
    }
  }
  return makeIndexedGeometry(positions, normals, uvs, fades, distances, indices);
}

function makeOceanGeometry(segment, sampleTrack, rows) {
  const columns = 3;
  const positions = [];
  const normals = [];
  const uvs = [];
  const fades = [];
  const distances = [];
  const indices = [];

  for (const side of [-1, 1]) {
    const sideBase = positions.length / 3;
    for (let row = 0; row < rows; row += 1) {
      const rowAmount = row / Math.max(1, rows - 1);
      const distance = lerp(ZONE_START, ZONE_END + 80, rowAmount);
      const sampleDistance = clamp(distance, 0, segment.length);
      const sample = sampleTrack(segment, sampleDistance);
      const zoneFade = smoothRange(ZONE_START, -18, distance) * (1 - smoothRange(760, ZONE_END + 60, distance));
      for (let column = 0; column < columns; column += 1) {
        const outward = column / (columns - 1);
        const bankInfluence = 1 - outward;
        const lateral = side * (sample.width * 1.03 + outward * (148 + 18 * Math.sin(distance * 0.0067 + side)));
        const wave = Math.sin(distance * 0.021 + outward * 5.1 + side * 1.7) * (0.09 + outward * 0.23);
        positions.push(
          sample.x + lateral * Math.cos(sample.bank * bankInfluence),
          sample.y + lateral * Math.sin(sample.bank) * bankInfluence - 2.05 - outward * 3.65 + wave,
          -distance,
        );
        normals.push(0, 1, 0);
        uvs.push(outward, distance / 74);
        fades.push(zoneFade);
        distances.push(distance);
      }
    }
    for (let row = 0; row < rows - 1; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const a = sideBase + row * columns + column;
        indices.push(a, a + columns, a + 1, a + columns, a + columns + 1, a + 1);
      }
    }
  }
  return makeIndexedGeometry(positions, normals, uvs, fades, distances, indices);
}

function createRoadMaterial(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      visibility: { value: 0 },
      lightning: { value: 0 },
      abyssColor: { value: new THREE.Color(palette.roadAbyss) },
      glassColor: { value: new THREE.Color(palette.roadGlass) },
      wearColor: { value: new THREE.Color(palette.roadWear) },
      edgeColor: { value: new THREE.Color(palette.edge) },
    },
    vertexShader: `
      attribute float zoneFade;
      attribute float courseDistance;
      varying vec2 vUv;
      varying float vFade;
      varying float vDistance;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        vFade = zoneFade;
        vDistance = courseDistance;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float visibility;
      uniform float lightning;
      uniform vec3 abyssColor;
      uniform vec3 glassColor;
      uniform vec3 wearColor;
      uniform vec3 edgeColor;
      varying vec2 vUv;
      varying float vFade;
      varying float vDistance;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 cell = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), f.x),
          mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        float lateral = abs(vUv.x - 0.5) * 2.0;
        float grain = noise2(vec2(vUv.x * 38.0, vDistance * 0.047));
        float fineGrain = noise2(vec2(vUv.x * 116.0 + 17.0, vDistance * 0.16));
        float longNoise = noise2(vec2(vUv.x * 7.5 + sin(vDistance * 0.007) * 0.3, vDistance * 0.018));
        float broadPuddle = 0.5 + 0.5 * sin(vDistance * 0.028 + sin(vUv.x * 12.0) * 1.36);
        float longBreak = smoothstep(0.3, 0.76,
          longNoise * 0.7 + (0.5 + 0.5 * sin(vDistance * 0.046 + vUv.x * 2.4)) * 0.3);
        float wheelPaths = exp(-pow((lateral - 0.39) / 0.095, 2.0));
        float wanderingMirror = exp(-pow((lateral - (0.21 + sin(vDistance * 0.012) * 0.052)) / 0.105, 2.0));
        float centerDrain = exp(-pow(lateral / 0.022, 2.0));
        float transverseJoint = 1.0 - smoothstep(0.015, 0.055, abs(fract(vDistance / 31.0) - 0.5));
        float edgeGlass = smoothstep(0.927, 0.982, lateral) * (1.0 - smoothstep(0.982, 1.0, lateral));
        float flow = 0.5 + 0.5 * sin(vDistance * 0.27 - time * 2.2 + vUv.x * 17.0);

        vec3 n = normalize(vWorldNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        vec3 lightDirection = normalize(vec3(-0.42, 0.74, 0.52));
        float diffuse = 0.62 + max(dot(n, lightDirection), 0.0) * 0.16;
        float fresnel = pow(1.0 - max(dot(n, viewDirection), 0.0), 3.2);
        float specular = pow(max(dot(reflect(-lightDirection, n), viewDirection), 0.0), 54.0);
        float mirrorBand = clamp(
          wanderingMirror * (0.06 + longBreak * 0.32)
          + wheelPaths * (0.04 + (1.0 - longBreak) * 0.11)
          + fresnel * broadPuddle * 0.025,
          0.0, 1.0);
        float wetness = clamp(0.31 + broadPuddle * 0.19 + wheelPaths * 0.14 + flow * 0.025, 0.0, 1.0);

        vec3 color = mix(abyssColor, glassColor, 0.105 + broadPuddle * 0.055 + grain * 0.025);
        color *= diffuse;
        color += glassColor * (0.035 + grain * 0.025);
        color = mix(color, wearColor, mirrorBand * (0.08 + fresnel * 0.1));
        color *= 1.0 - wheelPaths * (0.045 + fineGrain * 0.05);
        color += edgeColor * edgeGlass * (0.095 + lightning * 0.085);
        color += edgeColor * centerDrain * 0.006;
        color -= color * transverseJoint * 0.11;
        color += edgeColor * specular * (0.12 + wetness * 0.19);
        color += edgeColor * mirrorBand * (0.012 + fresnel * 0.03);
        color += edgeColor * lightning * (mirrorBand * 0.045 + specular * 0.11 + edgeGlass * 0.03);

        float alpha = visibility * vFade;
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

function createOceanMaterial(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      visibility: { value: 0 },
      lightning: { value: 0 },
      deepColor: { value: new THREE.Color(palette.oceanDeep) },
      glassColor: { value: new THREE.Color(palette.oceanGlass) },
      foamColor: { value: new THREE.Color(palette.foam) },
    },
    vertexShader: `
      attribute float zoneFade;
      attribute float courseDistance;
      varying vec2 vUv;
      varying float vFade;
      varying float vDistance;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vFade = zoneFade;
        vDistance = courseDistance;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float visibility;
      uniform float lightning;
      uniform vec3 deepColor;
      uniform vec3 glassColor;
      uniform vec3 foamColor;
      varying vec2 vUv;
      varying float vFade;
      varying float vDistance;
      varying vec3 vWorldPosition;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      void main() {
        float waveA = 0.5 + 0.5 * sin(vDistance * 0.21 - time * 2.1 + vUv.x * 15.0);
        float waveB = 0.5 + 0.5 * sin(vDistance * 0.087 + time * 1.35 - vUv.x * 29.0);
        float cells = hash21(floor(vec2(vDistance * 0.31, vUv.x * 27.0)));
        float nearShore = 1.0 - smoothstep(0.01, 0.22, vUv.x);
        float brokenFoam = nearShore * smoothstep(0.67, 0.94, waveA * 0.58 + waveB * 0.29 + cells * 0.18);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float grazing = pow(1.0 - max(viewDirection.y, 0.0), 2.35);
        float reflectedSky = 0.025 + grazing * 0.16 + waveA * 0.018;

        vec3 color = mix(deepColor, glassColor, reflectedSky);
        color += foamColor * brokenFoam * 0.095;
        color += foamColor * lightning * (0.028 + waveB * 0.065) * (0.28 + grazing * 0.42);
        color *= 0.64 + waveA * 0.055 + waveB * 0.035;
        float alpha = visibility * vFade * 0.94;
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

function createCloudMaterial(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      visibility: { value: 0 },
      lightning: { value: 0 },
      cloudColor: { value: new THREE.Color(palette.cloud) },
      flashColor: { value: new THREE.Color(palette.lightning) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float visibility;
      uniform float lightning;
      uniform vec3 cloudColor;
      uniform vec3 flashColor;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float noise2(vec2 p) {
        vec2 cell = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(cell), hash21(cell + vec2(1.0, 0.0)), f.x),
          mix(hash21(cell + vec2(0.0, 1.0)), hash21(cell + vec2(1.0, 1.0)), f.x), f.y);
      }

      void main() {
        vec2 p = vUv * vec2(7.0, 8.5) + vec2(time * 0.009, -time * 0.004);
        float broad = noise2(p) * 0.62 + noise2(p * 2.13 + 7.7) * 0.27 + noise2(p * 4.4) * 0.11;
        float density = smoothstep(0.31, 0.78, broad);
        vec2 centered = abs(vUv - 0.5) * 2.0;
        float edgeFade = 1.0 - smoothstep(0.68, 1.0, max(centered.x, centered.y));
        vec3 color = mix(cloudColor * 0.62, cloudColor * 1.3, broad);
        color = mix(color, flashColor, lightning * (0.08 + density * 0.23));
        float alpha = density * edgeFade * visibility * (0.5 + lightning * 0.12);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
}

function makeCliffGeometry() {
  // A low, open-bottom ridgeline replaces the usual faceted boulder primitive.
  // Instances overlap in three depth bands, so their silhouettes read as eroded
  // continental shelves rather than isolated game-prop rocks. It remains 34
  // triangles (under the former 36-triangle dodecahedron budget).
  const xSteps = [-1, -0.66, -0.28, 0.12, 0.55, 1];
  const crest = [-0.38, 0.3, 0.64, 0.25, 0.47, -0.42];
  const positions = [];
  const colors = [];
  const indices = [];
  for (let index = 0; index < xSteps.length; index += 1) {
    const x = xSteps[index];
    const y = crest[index];
    positions.push(
      x, y, 0.48,
      x, y * 0.92 - 0.05, -0.48,
      x, -0.72, 0.57,
      x, -0.72, -0.57,
    );
    colors.push(
      0.92, 0.92, 0.92,
      0.77, 0.77, 0.77,
      0.61, 0.61, 0.61,
      0.49, 0.49, 0.49,
    );
  }
  for (let index = 0; index < xSteps.length - 1; index += 1) {
    const a = index * 4;
    const b = (index + 1) * 4;
    indices.push(
      a, b, a + 1, b, b + 1, a + 1,
      a + 2, b + 2, a, b + 2, b, a,
      a + 1, b + 1, a + 3, b + 1, b + 3, a + 3,
    );
  }
  const last = (xSteps.length - 1) * 4;
  indices.push(
    0, 1, 2, 1, 3, 2,
    last, last + 2, last + 1, last + 1, last + 2, last + 3,
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.rotateY(Math.PI * 0.08);
  return geometry;
}

function makeLightningGeometry(segment, sampleTrack, boltCount, rng) {
  const positions = [];
  const colors = [];
  const boltIds = [];
  const bolts = [];

  for (let boltIndex = 0; boltIndex < boltCount; boltIndex += 1) {
    const distance = lerp(90, 815, (boltIndex + 0.25 + rng() * 0.5) / boltCount);
    const sample = sampleTrack(segment, distance);
    const side = boltIndex % 2 === 0 ? -1 : 1;
    const groundX = sample.x + side * lerp(48, 112, rng());
    const groundY = sample.y + lerp(1, 8, rng());
    const groundZ = -distance + lerp(-28, 24, rng());
    const height = lerp(44, 82, rng());
    const steps = 9;
    let previous = null;
    const points = [];
    for (let step = 0; step <= steps; step += 1) {
      const amount = step / steps;
      const taper = Math.sin(amount * Math.PI);
      const point = new THREE.Vector3(
        groundX + side * lerp(8, 0, amount) + (rng() * 2 - 1) * 4.4 * taper,
        groundY + height * (1 - amount),
        groundZ + (rng() * 2 - 1) * 3.2 * taper,
      );
      points.push(point);
      if (previous) {
        positions.push(previous.x, previous.y, previous.z, point.x, point.y, point.z);
        colors.push(0, 0, 0, 0, 0, 0);
        boltIds.push(boltIndex, boltIndex);
      }
      previous = point;
    }
    for (const branchStep of [3, 6]) {
      const origin = points[branchStep];
      const branch = origin.clone().add(new THREE.Vector3(
        side * lerp(7, 14, rng()),
        -lerp(5, 12, rng()),
        lerp(-8, 8, rng()),
      ));
      positions.push(origin.x, origin.y, origin.z, branch.x, branch.y, branch.z);
      colors.push(0, 0, 0, 0, 0, 0);
      boltIds.push(boltIndex, boltIndex);
    }
    bolts.push({
      distance,
      phase: rng(),
      cycle: lerp(2.4, 4.8, rng()),
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return { geometry, boltIds, bolts };
}

function disposeRoots(roots, resources) {
  for (const root of roots) if (root?.parent) root.parent.remove(root);
  for (const resource of resources) resource.dispose();
  resources.clear();
}

export class TouchdownArt {
  constructor({
    scene,
    root = scene,
    segment,
    sampleTrack,
    quality = 'high',
    seed = 0x4a2719d3,
    palette = {},
  } = {}) {
    if (!scene?.isScene) throw new TypeError('TouchdownArt requires a Three.js Scene.');
    if (!root?.isObject3D) throw new TypeError('TouchdownArt root must be a Three.js Object3D.');
    if (!segment || segment.type !== 'planet') throw new TypeError('TouchdownArt requires the Planet 2 segment.');
    if (typeof sampleTrack !== 'function') throw new TypeError('TouchdownArt requires sampleTrack(segment, distance).');

    this.scene = scene;
    this.rootParent = root;
    this.segment = segment;
    this.sampleTrack = sampleTrack;
    this.quality = QUALITY[quality] ? quality : 'high';
    this.config = QUALITY[this.quality];
    this.seed = hash32(seed);
    this.palette = { ...DEFAULT_PALETTE, ...palette };
    this.resources = new Set();
    this.elapsed = 0;
    this.disposed = false;
    this.active = false;
    this.currentFlash = 0;
    this.visibility = 0;
    this.progress = ZONE_START;
    this.contactAge = Number.POSITIVE_INFINITY;
    this.contactStrength = 0;
    this.contactFrame = {
      x: 0,
      y: 0,
      z: 0,
      bank: 0,
      unitLateral: 0,
      roadVertical: 0,
      normalClearance: 0.02,
    };

    this.root = new THREE.Group();
    this.root.name = 'stormglass-touchdown-course-art';
    this.root.visible = false;
    root.add(this.root);

    this.weatherRoot = new THREE.Group();
    this.weatherRoot.name = 'stormglass-touchdown-weather';
    this.weatherRoot.visible = false;
    root.add(this.weatherRoot);

    this.dummy = new THREE.Object3D();
    this.createOcean();
    this.createRoad();
    this.createCliffs();
    this.createEdgeStuds();
    this.createLightning();
    this.createCloudCeiling();
    this.createRain();
    this.createContactBeat();

    this.budget = Object.freeze({
      drawCalls: 8,
      triangles: this.estimateTriangles() + 1024,
      lineSegments: this.config.rain + this.config.bolts * 11,
      textures: 0,
      runtimeAllocations: 0,
    });
  }

  register(...resources) {
    for (const resource of resources) if (resource?.dispose) this.resources.add(resource);
  }

  createRoad() {
    const geometry = makeRoadGeometry(
      this.segment,
      this.sampleTrack,
      this.config.roadRows,
      this.config.roadColumns,
    );
    const material = createRoadMaterial(this.palette);
    this.register(geometry, material);
    this.road = new THREE.Mesh(geometry, material);
    this.road.name = 'stormglass-wet-charcoal-touchdown-strip';
    this.road.renderOrder = 2;
    this.root.add(this.road);
  }

  createOcean() {
    const geometry = makeOceanGeometry(this.segment, this.sampleTrack, this.config.oceanRows);
    const material = createOceanMaterial(this.palette);
    this.register(geometry, material);
    this.ocean = new THREE.Mesh(geometry, material);
    this.ocean.name = 'stormglass-black-ocean-shelves';
    this.ocean.renderOrder = 0;
    this.root.add(this.ocean);
  }

  createCliffs() {
    const geometry = makeCliffGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      toneMapped: true,
    });
    this.register(geometry, material);
    this.cliffs = new THREE.InstancedMesh(geometry, material, this.config.cliffs);
    this.cliffs.name = 'stormglass-ocean-cliff-silhouettes';
    this.cliffs.frustumCulled = false;
    this.root.add(this.cliffs);

    const rng = makeRng(this.seed ^ 0x27e2a641);
    const dark = new THREE.Color(this.palette.cliff);
    const wet = new THREE.Color(this.palette.cliffWet);
    const layerCounts = Math.ceil(this.config.cliffs / 3);
    for (let index = 0; index < this.config.cliffs; index += 1) {
      const layer = index % 3;
      const inLayer = Math.floor(index / 3);
      const distance = lerp(230, 858, (inLayer + 0.18 + rng() * 0.58) / layerCounts);
      const sample = this.sampleTrack(this.segment, distance);
      const side = index % 2 === 0 ? -1 : 1;
      const lateralRanges = [[54, 78], [84, 122], [130, 178]];
      const range = lateralRanges[layer];
      const lateral = side * (sample.width + lerp(range[0], range[1], rng()));
      const scaleX = lerp(10 + layer * 8, 21 + layer * 15, rng());
      const scaleY = lerp(5.2 - layer * 0.45, 13.5 - layer * 1.2, rng());
      const scaleZ = lerp(13 + layer * 11, 29 + layer * 23, rng());
      this.dummy.position.set(
        sample.x + lateral,
        sample.y - 4.2 + scaleY * 0.54,
        -distance + lerp(-24 - layer * 10, 24 + layer * 10, rng()),
      );
      this.dummy.rotation.set(lerp(-0.055, 0.055, rng()), lerp(-Math.PI, Math.PI, rng()), side * lerp(-0.045, 0.045, rng()));
      this.dummy.scale.set(scaleX, scaleY, scaleZ);
      this.dummy.updateMatrix();
      this.cliffs.setMatrixAt(index, this.dummy.matrix);
      this.cliffs.setColorAt(index, dark.clone().lerp(wet, lerp(0.2 + layer * 0.2, 0.34 + layer * 0.19, rng())));
    }
    this.cliffs.instanceMatrix.needsUpdate = true;
    if (this.cliffs.instanceColor) this.cliffs.instanceColor.needsUpdate = true;
  }

  createEdgeStuds() {
    const geometry = new THREE.BoxGeometry(0.66, 0.12, 1.8);
    geometry.translate(0, 0.06, 0);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      toneMapped: false,
    });
    this.register(geometry, material);
    this.edgeStuds = new THREE.InstancedMesh(geometry, material, this.config.studPairs * 2);
    this.edgeStuds.name = 'stormglass-grounded-runway-edge-studs';
    this.edgeStuds.frustumCulled = false;
    this.edgeStuds.renderOrder = 3;
    this.root.add(this.edgeStuds);

    const white = new THREE.Color(0xc5fbff).multiplyScalar(0.62);
    const cyan = new THREE.Color(this.palette.edge).multiplyScalar(0.52);
    for (let pair = 0; pair < this.config.studPairs; pair += 1) {
      const amount = pair / Math.max(1, this.config.studPairs - 1);
      const distance = lerp(-38, 845, amount);
      const sample = this.sampleTrack(this.segment, clamp(distance, 0, this.segment.length));
      for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
        const side = sideIndex === 0 ? -1 : 1;
        const index = pair * 2 + sideIndex;
        const lateral = side * sample.width * 0.945;
        this.dummy.position.set(
          sample.x + lateral * Math.cos(sample.bank),
          sample.y + lateral * Math.sin(sample.bank) - 0.35,
          -distance,
        );
        this.dummy.rotation.set(0, 0, sample.bank);
        const touchdownWeight = 1 - smoothRange(120, 360, distance);
        this.dummy.scale.set(1 + touchdownWeight * 0.28, 1, 1.1 + touchdownWeight * 0.2);
        this.dummy.updateMatrix();
        this.edgeStuds.setMatrixAt(index, this.dummy.matrix);
        this.edgeStuds.setColorAt(index, (pair % 5 === 0 ? white : cyan));
      }
    }
    this.edgeStuds.instanceMatrix.needsUpdate = true;
    if (this.edgeStuds.instanceColor) this.edgeStuds.instanceColor.needsUpdate = true;
  }

  createLightning() {
    const rng = makeRng(this.seed ^ 0x914ca8e5);
    const lightning = makeLightningGeometry(this.segment, this.sampleTrack, this.config.bolts, rng);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.register(lightning.geometry, material);
    this.lightning = new THREE.LineSegments(lightning.geometry, material);
    this.lightning.name = 'stormglass-spatial-lightning';
    this.lightning.renderOrder = 6;
    this.lightning.frustumCulled = false;
    this.root.add(this.lightning);
    this.lightningBoltIds = lightning.boltIds;
    this.lightningData = lightning.bolts;
    this.lightningIntensities = new Float32Array(this.lightningData.length);
    this.lightningColor = new THREE.Color(this.palette.lightning);
  }

  createCloudCeiling() {
    const geometry = new THREE.PlaneGeometry(920, 1040, 1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = createCloudMaterial(this.palette);
    this.register(geometry, material);
    this.cloudCeiling = new THREE.Mesh(geometry, material);
    this.cloudCeiling.name = 'stormglass-low-thunderhead-ceiling';
    this.cloudCeiling.position.set(0, 72, -390);
    this.cloudCeiling.renderOrder = -2;
    this.weatherRoot.add(this.cloudCeiling);
  }

  createRain() {
    const positions = new Float32Array(this.config.rain * 2 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.LineBasicMaterial({
      color: this.palette.rain,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: true,
    });
    this.register(geometry, material);
    this.rain = new THREE.LineSegments(geometry, material);
    this.rain.name = 'stormglass-speed-sheared-rain';
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 8;
    this.weatherRoot.add(this.rain);

    const rng = makeRng(this.seed ^ 0x3f6ac2d7);
    this.rainData = Array.from({ length: this.config.rain }, () => {
      const x = lerp(-46, 46, rng());
      const y = lerp(0.4, 30, rng());
      const z = lerp(-340, 38, rng());
      return {
        x,
        y,
        z,
        initialX: x,
        initialY: y,
        initialZ: z,
        fall: lerp(31, 58, rng()),
        shear: lerp(0.54, 0.96, rng()),
        length: lerp(0.85, 2.15, rng()),
      };
    });
  }

  createContactBeat() {
    // One pooled world-space shockwave is cheaper and more spatially honest
    // than a screen flash: it visibly runs across the Stormglass road from the
    // tyre contact patch while steering/camera control remain uninterrupted.
    const geometry = new THREE.RingGeometry(0.86, 1, 64);
    const material = new THREE.MeshBasicMaterial({
      color: this.palette.edge,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.register(geometry, material);
    this.contactRing = new THREE.Mesh(geometry, material);
    this.contactRing.name = 'stormglass-touchdown-contact-wave';
    this.contactRing.rotation.x = Math.PI / 2;
    this.contactRing.position.set(0, 0.22, -2.4);
    this.contactRing.visible = false;
    this.contactRing.renderOrder = 9;
    this.root.add(this.contactRing);
  }

  estimateTriangles() {
    const road = (this.config.roadRows - 1) * (this.config.roadColumns - 1) * 2;
    const ocean = (this.config.oceanRows - 1) * 2 * 2 * 2;
    const cliffs = this.config.cliffs * 36;
    const studs = this.config.studPairs * 2 * 12;
    const contactWave = 64 * 2;
    return road + ocean + cliffs + studs + contactWave;
  }

  updateLightning(time, progress, visibility) {
    const color = this.lightning.geometry.attributes.color;
    let strongest = 0;
    for (let index = 0; index < this.lightningData.length; index += 1) {
      const bolt = this.lightningData[index];
      const localZ = -(bolt.distance - progress);
      if (localZ > 110 || localZ < -980) {
        this.lightningIntensities[index] = 0;
        continue;
      }
      const phase = fract(time / bolt.cycle + bolt.phase);
      const strike = Math.exp(-phase * 58);
      const returnStroke = Math.exp(-Math.abs(phase - 0.052) * 96) * 0.34;
      const distanceEnvelope = smoothRange(-980, -620, localZ) * (1 - smoothRange(48, 110, localZ));
      const intensity = saturate((strike + returnStroke) * distanceEnvelope);
      strongest = Math.max(strongest, intensity);
      this.lightningIntensities[index] = intensity;
    }

    for (let vertex = 0; vertex < this.lightningBoltIds.length; vertex += 1) {
      const intensity = this.lightningIntensities[this.lightningBoltIds[vertex]] * visibility;
      color.setXYZ(
        vertex,
        this.lightningColor.r * intensity,
        this.lightningColor.g * intensity,
        this.lightningColor.b * intensity,
      );
    }
    color.needsUpdate = true;
    this.lightning.material.opacity = visibility > 0.002 ? 0.96 : 0;
    this.currentFlash = strongest * visibility;
  }

  updateRain(dt, speed, visibility, camera) {
    const positions = this.rain.geometry.attributes.position;
    const motion = clamp(speed, 180, 1100) * dt;
    for (let index = 0; index < this.rainData.length; index += 1) {
      const drop = this.rainData[index];
      drop.z += motion * drop.shear;
      drop.y -= drop.fall * dt;
      drop.x -= dt * 4.8;
      if (drop.z > 42) drop.z -= 382;
      if (drop.y < -1.5) drop.y += 32;
      if (drop.x < -48) drop.x += 96;
      const vertex = index * 2;
      const tail = 4.15 + motion * 0.043;
      positions.setXYZ(vertex, drop.x, drop.y, drop.z);
      positions.setXYZ(
        vertex + 1,
        drop.x + drop.length * 0.38,
        drop.y + drop.length * 0.76,
        drop.z - tail * drop.length,
      );
    }
    positions.needsUpdate = true;
    this.rain.material.opacity = visibility * (0.22 + saturate(speed / 760) * 0.13);
    this.weatherRoot.position.x = Number.isFinite(camera?.position?.x) ? camera.position.x * 0.64 : 0;
  }

  updateContactBeat(dt, contact, visibility, progress, current, lateral) {
    // Give the event frame a visible attack instead of spending its only
    // contact sample at exact zero opacity.
    if (contact) this.contactAge = Math.max(dt, 1 / 120);
    else this.contactAge = Math.min(4, this.contactAge + dt);
    const attack = smoothRange(0, 0.035, this.contactAge);
    const release = 1 - smoothRange(0.14, 0.68, this.contactAge);
    const strength = attack * release * visibility;
    this.contactStrength = strength;
    this.contactRing.visible = strength > 0.002;
    if (!this.contactRing.visible) return;
    const expansion = smoothRange(0.02, 0.72, this.contactAge);
    // The course-art root is already counter-translated by the current sample.
    // Include that sample in the ring's local point so the two transforms
    // cancel in world space, then apply the anti-z-fight clearance along the
    // bank normal. The old +11 m sample put the wave around the rival ahead.
    const frame = writeTrackSurfaceLocalContactFrame(this.contactFrame, {
      currentX: current.x,
      currentY: current.y,
      width: current.width,
      bank: current.bank,
      lateral: Number.isFinite(lateral) ? lateral : 0,
      progress,
      roadColumns: this.config.roadColumns,
      normalClearance: 0.02,
    });
    this.contactRing.position.set(frame.x, frame.y, frame.z);
    this.contactRing.rotation.z = frame.bank;
    this.contactRing.scale.setScalar(7.2 + expansion * 26);
    this.contactRing.material.opacity = strength * 0.76;
  }

  update({
    active = true,
    time = this.elapsed,
    dt = 1 / 60,
    progress = 0,
    speed = 500,
    camera = null,
    visibility = 1,
    contact = false,
    lateral = 0,
  } = {}) {
    if (this.disposed) return;
    const safeProgress = Number.isFinite(progress) ? progress : 0;
    const safeDt = clamp(Number.isFinite(dt) ? dt : 1 / 60, 0, 0.05);
    const safeSpeed = Number.isFinite(speed) ? speed : 500;
    this.elapsed = Number.isFinite(time) ? time : this.elapsed + safeDt;
    const zoneEnvelope = 1 - smoothRange(710, 855, safeProgress);
    const envelope = saturate(visibility) * zoneEnvelope;
    this.visibility = envelope;
    this.progress = safeProgress;
    this.active = Boolean(active) && envelope > 0.001;
    this.root.visible = this.active;
    this.weatherRoot.visible = this.active;
    const current = this.sampleTrack(this.segment, clamp(safeProgress, 0, this.segment.length));
    this.root.position.set(-current.x, -current.y, safeProgress);
    this.updateContactBeat(safeDt, Boolean(contact), envelope, safeProgress, current, lateral);
    if (!this.active) return;

    this.updateLightning(this.elapsed, safeProgress, envelope);
    this.updateRain(safeDt, safeSpeed, envelope, camera);
    this.road.material.uniforms.time.value = this.elapsed;
    this.road.material.uniforms.visibility.value = envelope;
    const contactFlash = this.contactStrength * 0.78;
    this.road.material.uniforms.lightning.value = Math.max(this.currentFlash, contactFlash);
    this.ocean.material.uniforms.time.value = this.elapsed;
    this.ocean.material.uniforms.visibility.value = envelope;
    this.ocean.material.uniforms.lightning.value = Math.max(this.currentFlash, contactFlash * 0.46);
    this.cloudCeiling.material.uniforms.time.value = this.elapsed;
    this.cloudCeiling.material.uniforms.visibility.value = envelope;
    this.cloudCeiling.material.uniforms.lightning.value = this.currentFlash;
    this.cliffs.material.opacity = envelope * 0.82;
    this.edgeStuds.material.opacity = envelope * 0.68;
  }

  resetPresentation() {
    if (this.disposed) return false;
    this.elapsed = 0;
    this.active = false;
    this.currentFlash = 0;
    this.visibility = 0;
    this.progress = ZONE_START;
    this.contactAge = Number.POSITIVE_INFINITY;
    this.contactStrength = 0;
    Object.assign(this.contactFrame, {
      x: 0,
      y: 0,
      z: 0,
      bank: 0,
      unitLateral: 0,
      roadVertical: 0,
      normalClearance: 0.02,
    });
    this.root.visible = false;
    this.root.position.set(0, 0, 0);
    this.root.quaternion.identity();
    this.weatherRoot.visible = false;
    this.weatherRoot.position.set(0, 0, 0);
    this.weatherRoot.quaternion.identity();
    for (const drop of this.rainData) {
      drop.x = drop.initialX;
      drop.y = drop.initialY;
      drop.z = drop.initialZ;
    }
    this.updateRain(0, 180, 0, null);
    this.lightningIntensities.fill(0);
    this.lightning.geometry.attributes.color.array.fill(0);
    this.lightning.geometry.attributes.color.needsUpdate = true;
    this.lightning.material.opacity = 0;
    this.contactRing.visible = false;
    this.contactRing.position.set(0, 0.22, -2.4);
    this.contactRing.rotation.set(Math.PI / 2, 0, 0);
    this.contactRing.scale.setScalar(1);
    this.contactRing.material.opacity = 0;
    this.road.material.uniforms.time.value = 0;
    this.road.material.uniforms.visibility.value = 0;
    this.road.material.uniforms.lightning.value = 0;
    this.ocean.material.uniforms.time.value = 0;
    this.ocean.material.uniforms.visibility.value = 0;
    this.ocean.material.uniforms.lightning.value = 0;
    this.cloudCeiling.material.uniforms.time.value = 0;
    this.cloudCeiling.material.uniforms.visibility.value = 0;
    this.cloudCeiling.material.uniforms.lightning.value = 0;
    this.cliffs.material.opacity = 0;
    this.edgeStuds.material.opacity = 0;
    return true;
  }

  diagnostics() {
    let rainXSum = 0;
    let rainYSum = 0;
    let rainZSum = 0;
    for (const drop of this.rainData) {
      rainXSum += drop.x;
      rainYSum += drop.y;
      rainZSum += drop.z;
    }
    const contactWorld = {
      x: Number((this.contactFrame.x + this.root.position.x).toFixed(6)),
      y: Number((this.contactFrame.y + this.root.position.y).toFixed(6)),
      z: Number((this.contactFrame.z + this.root.position.z).toFixed(6)),
      bank: Number(this.contactFrame.bank.toFixed(6)),
      unitLateral: Number(this.contactFrame.unitLateral.toFixed(6)),
      roadVertical: Number(this.contactFrame.roadVertical.toFixed(6)),
      normalClearance: Number(this.contactFrame.normalClearance.toFixed(6)),
    };
    return {
      active: this.active,
      progress: Number(this.progress.toFixed(2)),
      visibility: Number(this.visibility.toFixed(4)),
      surfaceEstablished: this.active && this.visibility >= 0.16,
      contactActive: this.contactRing?.visible ?? false,
      contactStrength: Number(this.contactStrength.toFixed(4)),
      contactAge: Number.isFinite(this.contactAge) ? Number(this.contactAge.toFixed(6)) : null,
      rainState: {
        count: this.rainData.length,
        xSum: Number(rainXSum.toFixed(4)),
        ySum: Number(rainYSum.toFixed(4)),
        zSum: Number(rainZSum.toFixed(4)),
      },
      contactWorld,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    disposeRoots([this.root, this.weatherRoot], this.resources);
    this.rainData.length = 0;
    this.lightningData.length = 0;
    this.lightningBoltIds.length = 0;
    this.lightningIntensities = null;
  }
}

export function createTouchdownArt(options) {
  return new TouchdownArt(options);
}
