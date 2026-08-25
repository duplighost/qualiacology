import * as THREE from 'three';

/**
 * Tangential arrival art for the Shard Cathedral -> Thunderglass handoff.
 *
 * Integration contract (the renderer owns all gameplay state):
 *
 *   this.arrivalArt = createArrivalArt({
 *     scene: this.scene,
 *     root: this.worldRoot,
 *     player: this.playerVehicle,
 *     quality: this.quality,
 *     seed: 0x9f0d21,
 *   });
 *
 *   this.arrivalArt.update({
 *     active: segment.shortId === 'space-1',
 *     time: state.time,
 *     dt,
 *     approach: getSegmentFraction(state), // full space-sector progress, 0..1
 *     reentry: morph.landing,               // aerodynamic transition, 0..1
 *     speed: state.speed,
 *     lateral: state.lateral,
 *     roll: state.roll,
 *     camera: this.camera,
 *   });
 *
 * The existing destination planet, reentry shell/trail, and reentry point-cloud
 * should be hidden while this system is active. The normal dynamic track may
 * fade in over this system's runway preview at reentry ~= 0.72. Call dispose()
 * before discarding or rebuilding the renderer. No random values, allocations,
 * geometry rebuilds, or new scene objects are created during update().
 */

const TAU = Math.PI * 2;
const EPSILON = 1e-6;

const QUALITY = Object.freeze({
  low: Object.freeze({ sphereX: 40, sphereY: 26, streaks: 24, bolts: 4, haze: 2, runwayLights: 20 }),
  medium: Object.freeze({ sphereX: 64, sphereY: 40, streaks: 38, bolts: 6, haze: 3, runwayLights: 28 }),
  high: Object.freeze({ sphereX: 88, sphereY: 56, streaks: 56, bolts: 9, haze: 4, runwayLights: 36 }),
});

const DEFAULT_PALETTE = Object.freeze({
  abyss: 0x010713,
  night: 0x03131f,
  deep: 0x08283a,
  storm: 0x0f6780,
  glass: 0x55e7f3,
  cloud: 0xc9f7ff,
  lightning: 0xeaffff,
  runway: 0x0a2735,
  runwayEdge: 0x7cecf5,
  plasmaHot: 0xff8b2c,
  plasmaWhite: 0xfff2ce,
  plasmaCool: 0x80edff,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const saturate = (value) => clamp(Number.isFinite(value) ? value : 0, 0, 1);
const lerp = (a, b, amount) => a + (b - a) * amount;
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
  let value = hash32(seed || 1);
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStreakTexture(width = 128, height = 32) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const cross = Math.pow(Math.max(0, Math.sin(v * Math.PI)), 2.35);
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const along = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.7);
      const filament = 0.72 + 0.28 * Math.sin(u * 31.7 + v * 9.1) ** 2;
      const alpha = Math.round(255 * cross * along * filament);
      const index = (y * width + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = alpha;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function makeHazeTexture(width = 128, height = 64, seed = 1) {
  const data = new Uint8Array(width * height * 4);
  const rng = makeRng(seed);
  const cellsX = 18;
  const cellsY = 10;
  const values = new Float32Array((cellsX + 1) * (cellsY + 1));
  for (let i = 0; i < values.length; i += 1) values[i] = rng();

  const sample = (x, y) => {
    const px = (x / Math.max(1, width - 1)) * cellsX;
    const py = (y / Math.max(1, height - 1)) * cellsY;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.min(cellsX, x0 + 1);
    const y1 = Math.min(cellsY, y0 + 1);
    const txRaw = px - x0;
    const tyRaw = py - y0;
    const tx = txRaw * txRaw * (3 - 2 * txRaw);
    const ty = tyRaw * tyRaw * (3 - 2 * tyRaw);
    const a = lerp(values[y0 * (cellsX + 1) + x0], values[y0 * (cellsX + 1) + x1], tx);
    const b = lerp(values[y1 * (cellsX + 1) + x0], values[y1 * (cellsX + 1) + x1], tx);
    return lerp(a, b, ty);
  };

  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const vertical = Math.pow(Math.sin(v * Math.PI), 1.25);
    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const horizontal = Math.pow(Math.sin(u * Math.PI), 0.28);
      const first = sample(x, y);
      const second = sample((x * 2.13 + 31) % width, (y * 1.71 + 9) % height);
      const density = smoothRange(0.41, 0.76, first * 0.72 + second * 0.28);
      const alpha = Math.round(255 * density * vertical * horizontal);
      const index = (y * width + x) * 4;
      data[index] = 218;
      data[index + 1] = 242;
      data[index + 2] = 255;
      data[index + 3] = alpha;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createStormSurfaceMaterial(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      nightColor: { value: new THREE.Color(palette.night) },
      deepColor: { value: new THREE.Color(palette.deep) },
      stormColor: { value: new THREE.Color(palette.storm) },
      glassColor: { value: new THREE.Color(palette.glass) },
      lightDirection: { value: new THREE.Vector3(-0.84, 0.16, -0.52).normalize() },
    },
    vertexShader: `
      varying vec3 vObjectPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vObjectPosition = position;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 nightColor;
      uniform vec3 deepColor;
      uniform vec3 stormColor;
      uniform vec3 glassColor;
      uniform vec3 lightDirection;
      varying vec3 vObjectPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p) {
        vec3 cell = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash31(cell + vec3(0,0,0)), hash31(cell + vec3(1,0,0)), f.x),
              mix(hash31(cell + vec3(0,1,0)), hash31(cell + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash31(cell + vec3(0,0,1)), hash31(cell + vec3(1,0,1)), f.x),
              mix(hash31(cell + vec3(0,1,1)), hash31(cell + vec3(1,1,1)), f.x), f.y), f.z);
      }

      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += noise3(p) * amplitude;
          p = p * 2.03 + vec3(17.1, 9.7, 13.3);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 p = normalize(vObjectPosition);
        float longitude = atan(p.z, p.x);
        float latitude = asin(clamp(p.y, -1.0, 1.0));
        float warp = fbm(vec3(longitude * 0.85, latitude * 6.5, time * 0.006));
        float bands = 0.5 + 0.5 * sin(latitude * 22.0 + warp * 13.0 + sin(longitude * 4.6) * 2.7);
        float cells = fbm(p * 11.0 + vec3(time * 0.004, 0.0, 0.0));
        float brightBand = smoothstep(0.67, 0.95, bands) * smoothstep(0.38, 0.76, cells);
        float darkBand = smoothstep(0.48, 0.15, bands);

        vec3 n = normalize(vWorldNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float light = dot(n, normalize(lightDirection));
        float terminator = smoothstep(-0.035, 0.095, light);
        float reflected = max(dot(reflect(-normalize(lightDirection), n), viewDirection), 0.0);
        float limb = pow(1.0 - max(dot(n, viewDirection), 0.0), 3.0);

        vec3 day = mix(deepColor, stormColor, bands * 0.72 + cells * 0.18);
        day = mix(day, glassColor, brightBand * 0.44);
        day *= 0.46 + max(light, 0.0) * 0.74;
        vec3 night = nightColor * (0.2 + cells * 0.1);
        night += stormColor * darkBand * 0.035;
        vec3 color = mix(night, day, terminator);
        color += glassColor * pow(reflected, 34.0) * 0.28;
        color += glassColor * limb * terminator * 0.055;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function createCloudShellMaterial(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      opacity: { value: 0.58 },
      color: { value: new THREE.Color(palette.cloud) },
      lightDirection: { value: new THREE.Vector3(-0.84, 0.16, -0.52).normalize() },
    },
    vertexShader: `
      varying vec3 vObjectPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vObjectPosition = position;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float opacity;
      uniform vec3 color;
      uniform vec3 lightDirection;
      varying vec3 vObjectPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
              mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
              mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      void main() {
        vec3 p = normalize(vObjectPosition);
        float longitude = atan(p.z, p.x);
        float latitude = asin(clamp(p.y, -1.0, 1.0));
        vec3 samplePosition = vec3(longitude * 1.1 - time * 0.009, latitude * 9.0, p.z * 2.5);
        float broad = noise3(samplePosition * 1.25);
        float detail = noise3(samplePosition * 4.1 + 17.0);
        float band = 0.5 + 0.5 * sin(latitude * 24.0 + broad * 17.0 + longitude * 4.6);
        float density = smoothstep(0.61, 0.84, broad * 0.66 + detail * 0.2 + band * 0.25);
        vec3 n = normalize(vWorldNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float day = smoothstep(-0.025, 0.11, dot(n, normalize(lightDirection)));
        float rim = pow(1.0 - max(dot(n, viewDirection), 0.0), 1.7);
        float alpha = density * opacity * (0.1 + day * 0.9) * (1.0 - rim * 0.37);
        gl_FragColor = vec4(color * (0.58 + day * 0.67), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function createAtmosphereMaterial(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(palette.glass) },
      lightDirection: { value: new THREE.Vector3(-0.84, 0.16, -0.52).normalize() },
      intensity: { value: 0.82 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform vec3 lightDirection;
      uniform float intensity;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float rim = pow(1.0 - max(dot(n, viewDirection), 0.0), 2.45);
        float sunlight = smoothstep(-0.3, 0.28, dot(n, normalize(lightDirection)));
        float crescent = rim * (0.13 + sunlight * 0.95);
        gl_FragColor = vec4(color * (0.62 + sunlight * 1.05), crescent * intensity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  });
}

function createRunwayMaterial(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      reveal: { value: 0 },
      opacity: { value: 0 },
      roadColor: { value: new THREE.Color(palette.runway) },
      edgeColor: { value: new THREE.Color(palette.runwayEdge) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vDepth = -position.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float reveal;
      uniform float opacity;
      uniform vec3 roadColor;
      uniform vec3 edgeColor;
      varying vec2 vUv;
      varying float vDepth;
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      void main() {
        float lateral = abs(vUv.x - 0.5) * 2.0;
        float edge = smoothstep(0.91, 0.975, lateral) * (1.0 - smoothstep(0.975, 1.0, lateral));
        float seam = 1.0 - smoothstep(0.006, 0.018, abs(fract(vUv.y * 37.0 - time * 0.012) - 0.5));
        float vectorLine = 1.0 - smoothstep(0.012, 0.043, abs(vUv.x - 0.5));
        float vectorDash = smoothstep(0.14, 0.32, sin(vUv.y * 176.0 - time * 2.8) * 0.5 + 0.5);
        float centralWear = pow(1.0 - lateral, 3.0);
        float grain = hash21(floor(vUv * vec2(92.0, 680.0)));
        float wet = 0.82 + centralWear * 0.24 + seam * 0.025 + grain * 0.035;
        vec3 color = roadColor * wet + edgeColor * centralWear * (0.018 + grain * 0.014);
        color = mix(color, edgeColor * 1.12, edge * (0.72 + centralWear * 0.08));
        color += edgeColor * vectorLine * vectorDash * 0.42;
        float forwardReveal = smoothstep(1.03, 0.48, vUv.y - reveal * 0.52);
        float cockpitClear = smoothstep(0.025, 0.13, vUv.y);
        // Reentry needs a readable landing vector, not an opaque road card
        // painted over the approaching planet. Preserve the edge rails and
        // dashed centre vector while letting the physical world remain visible
        // through every quiet interior pixel.
        float vectorMask = max(edge, vectorLine * vectorDash);
        float alpha = opacity * forwardReveal * cockpitClear * vectorMask;
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
}

function createPlasmaMaterial(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      intensity: { value: 0 },
      cooling: { value: 0 },
      hotColor: { value: new THREE.Color(palette.plasmaHot) },
      whiteColor: { value: new THREE.Color(palette.plasmaWhite) },
      coolColor: { value: new THREE.Color(palette.plasmaCool) },
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
      uniform float intensity;
      uniform float cooling;
      uniform vec3 hotColor;
      uniform vec3 whiteColor;
      uniform vec3 coolColor;
      varying vec2 vUv;
      void main() {
        float cross = sin(clamp(vUv.x, 0.0, 1.0) * 3.14159265);
        float lengthFade = pow(1.0 - clamp(vUv.y, 0.0, 1.0), 1.12);
        float lick = 0.72 + 0.28 * sin(vUv.y * 39.0 - time * 31.0 + vUv.x * 8.0);
        float alpha = cross * lengthFade * lick * intensity;
        vec3 thermal = mix(hotColor, whiteColor, cross * lengthFade * 0.7);
        vec3 color = mix(thermal, coolColor, cooling * (0.48 + vUv.y * 0.52));
        gl_FragColor = vec4(color * (0.8 + cross * 1.15), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function createShockArcGeometry(segments = 28) {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const theta = lerp(-Math.PI * 0.54, Math.PI * 0.54, t);
    const x = Math.sin(theta) * 2.36;
    const y = 0.16 + Math.cos(theta) * 0.74;
    const z = -3.75 - Math.cos(theta) * 0.16;
    const width = 0.035 + Math.sin(t * Math.PI) * 0.075;
    const index = i * 6;
    positions[index] = x;
    positions[index + 1] = y - width;
    positions[index + 2] = z;
    positions[index + 3] = x;
    positions[index + 4] = y + width;
    positions[index + 5] = z;
    const uv = i * 4;
    uvs[uv] = 0;
    uvs[uv + 1] = Math.abs(t * 2 - 1);
    uvs[uv + 2] = 1;
    uvs[uv + 3] = Math.abs(t * 2 - 1);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createPlasmaRibbonGeometry(side = 1, verticalBias = 0) {
  const rows = 15;
  const positions = new Float32Array(rows * 2 * 3);
  const uvs = new Float32Array(rows * 2 * 2);
  const indices = [];
  for (let row = 0; row < rows; row += 1) {
    const t = row / (rows - 1);
    const centerX = side * (1.2 + t * (0.24 + 0.08 * Math.sin(t * 4.3)));
    const centerY = 0.03 + verticalBias + Math.sin(t * Math.PI) * 0.1;
    const z = -3.05 + t * 4.35;
    const width = lerp(0.12, 0.018, t);
    const index = row * 6;
    positions[index] = centerX - width;
    positions[index + 1] = centerY;
    positions[index + 2] = z;
    positions[index + 3] = centerX + width;
    positions[index + 4] = centerY + width * 0.28;
    positions[index + 5] = z;
    const uv = row * 4;
    uvs[uv] = 0;
    uvs[uv + 1] = t;
    uvs[uv + 2] = 1;
    uvs[uv + 3] = t;
    if (row < rows - 1) {
      const a = row * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createLightningGeometry(rng) {
  const positions = [];
  const startX = lerp(-0.54, 0.46, rng());
  const startY = lerp(-0.44, 0.55, rng());
  const angle = lerp(-1.1, 1.1, rng());
  const length = lerp(0.24, 0.52, rng());
  const segments = 10;
  let previous = null;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const jitter = (rng() * 2 - 1) * 0.032 * Math.sin(t * Math.PI);
    const x = startX + Math.cos(angle) * length * (t - 0.5) + jitter;
    const y = startY + Math.sin(angle) * length * (t - 0.5) + (rng() * 2 - 1) * 0.018;
    const radial = Math.min(0.94, x * x + y * y);
    const z = Math.sqrt(Math.max(0.03, 1 - radial)) * 1.014;
    const current = [x, y, z];
    if (previous) positions.push(...previous, ...current);
    if (i > 2 && i < segments - 1 && i % 3 === 0) {
      const branchX = x + (rng() * 2 - 1) * 0.1;
      const branchY = y + (rng() * 2 - 1) * 0.1;
      const branchRadial = Math.min(0.94, branchX * branchX + branchY * branchY);
      positions.push(x, y, z, branchX, branchY, Math.sqrt(Math.max(0.03, 1 - branchRadial)) * 1.015);
    }
    previous = current;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function createRunwayLightGeometry() {
  const geometry = new THREE.SphereGeometry(0.2, 6, 4);
  geometry.scale(2.25, 0.42, 1.35);
  return geometry;
}

const runwayPathX = (progress) => 152 * smoothstep01(progress);
const runwayPathY = (progress) => lerp(-4.6, -122, Math.pow(saturate(progress), 0.9));
const runwayPathZ = (progress) => lerp(-18, -1050, saturate(progress));
const runwayHalfWidth = (progress) => 5.2 + Math.sin(saturate(progress) * Math.PI) * 15;

function createTangentialRunwayGeometry(segments = 36) {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const progress = i / segments;
    const centerX = runwayPathX(progress);
    const centerY = runwayPathY(progress);
    const centerZ = runwayPathZ(progress);
    const halfWidth = runwayHalfWidth(progress);
    const positionOffset = i * 6;
    positions[positionOffset] = centerX - halfWidth;
    positions[positionOffset + 1] = centerY;
    positions[positionOffset + 2] = centerZ;
    positions[positionOffset + 3] = centerX + halfWidth;
    positions[positionOffset + 4] = centerY;
    positions[positionOffset + 5] = centerZ;
    const uvOffset = i * 4;
    uvs[uvOffset] = 0;
    uvs[uvOffset + 1] = progress;
    uvs[uvOffset + 2] = 1;
    uvs[uvOffset + 3] = progress;
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function disposeObjectTree(root, resources) {
  if (root?.parent) root.parent.remove(root);
  for (const resource of resources) resource.dispose();
  resources.clear();
}

export class ArrivalArt {
  constructor({
    scene,
    root = scene,
    player = null,
    quality = 'high',
    seed = 0x9f0d21,
    palette = {},
  } = {}) {
    if (!scene?.isScene) throw new TypeError('ArrivalArt requires a Three.js Scene.');
    if (!root?.isObject3D) throw new TypeError('ArrivalArt root must be a Three.js Object3D.');
    if (player && !player.isObject3D) throw new TypeError('ArrivalArt player must be a Three.js Object3D.');

    this.scene = scene;
    this.rootParent = root;
    this.player = player;
    this.quality = QUALITY[quality] ? quality : 'high';
    this.config = QUALITY[this.quality];
    this.seed = hash32(seed);
    this.palette = { ...DEFAULT_PALETTE, ...palette };
    this.resources = new Set();
    this.elapsed = 0;
    this.active = false;
    this.disposed = false;
    this.approach = 0;
    this.reentry = 0;
    this.planetRadius = 0;
    this.planetApparentRadius = 0;
    this.runwayOpacity = 0;
    this.surfaceEstablished = false;

    this.root = new THREE.Group();
    this.root.name = 'arrival-art-world';
    this.root.visible = false;
    root.add(this.root);

    this.planetRoot = new THREE.Group();
    this.planetRoot.name = 'arrival-stormglass-limb';
    this.root.add(this.planetRoot);
    this.createPlanet();
    this.createCloudStreaks();
    this.createRunway();
    this.createHaze();
    this.createPlasma();

    this.dummy = new THREE.Object3D();
    this.tempQuaternion = new THREE.Quaternion();
  }

  register(...resources) {
    for (const resource of resources) if (resource?.dispose) this.resources.add(resource);
  }

  createPlanet() {
    const { sphereX, sphereY, bolts } = this.config;
    const sphereGeometry = new THREE.SphereGeometry(1, sphereX, sphereY);
    const cloudGeometry = new THREE.SphereGeometry(1.018, sphereX, sphereY);
    const atmosphereGeometry = new THREE.SphereGeometry(1.045, Math.max(28, sphereX - 8), Math.max(18, sphereY - 6));
    const surfaceMaterial = createStormSurfaceMaterial(this.palette);
    const cloudMaterial = createCloudShellMaterial(this.palette);
    const atmosphereMaterial = createAtmosphereMaterial(this.palette);
    this.register(sphereGeometry, cloudGeometry, atmosphereGeometry, surfaceMaterial, cloudMaterial, atmosphereMaterial);

    this.planetSurface = new THREE.Mesh(sphereGeometry, surfaceMaterial);
    this.planetSurface.name = 'stormglass-surface';
    this.planetSurface.rotation.z = -0.17;
    this.planetRoot.add(this.planetSurface);

    this.planetClouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.planetClouds.name = 'stormglass-banded-cloud-shell';
    this.planetClouds.renderOrder = 2;
    this.planetRoot.add(this.planetClouds);

    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.atmosphere.name = 'stormglass-crescent-atmosphere';
    this.atmosphere.renderOrder = 3;
    this.planetRoot.add(this.atmosphere);

    this.lightning = [];
    const rng = makeRng(this.seed ^ 0x81ac229d);
    for (let i = 0; i < bolts; i += 1) {
      const geometry = createLightningGeometry(rng);
      const material = new THREE.LineBasicMaterial({
        color: this.palette.lightning,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const bolt = new THREE.LineSegments(geometry, material);
      bolt.name = `stormglass-lightning-${i}`;
      bolt.renderOrder = 4;
      this.planetRoot.add(bolt);
      this.lightning.push({
        mesh: bolt,
        material,
        phase: rng() * 12,
        cadence: lerp(0.62, 1.31, rng()),
        threshold: lerp(0.915, 0.975, rng()),
      });
      this.register(geometry, material);
    }
  }

  createCloudStreaks() {
    const texture = makeStreakTexture();
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: texture,
      alphaMap: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: true,
      toneMapped: true,
    });
    this.register(texture, geometry, material);
    this.cloudStreaks = new THREE.InstancedMesh(geometry, material, this.config.streaks);
    this.cloudStreaks.name = 'arrival-small-spatial-cloud-streaks';
    this.cloudStreaks.frustumCulled = false;
    this.cloudStreaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cloudStreaks.renderOrder = 8;
    this.root.add(this.cloudStreaks);

    const rng = makeRng(this.seed ^ 0x4f21c713);
    this.cloudData = Array.from({ length: this.config.streaks }, (_, index) => {
      const depth = rng();
      const color = new THREE.Color(this.palette.cloud).lerp(new THREE.Color(this.palette.glass), rng() * 0.3);
      this.cloudStreaks.setColorAt(index, color.multiplyScalar(lerp(0.48, 0.95, rng())));
      return {
        // Leave a readable flight corridor through the middle. These are
        // spatial wisps at the periphery, not full-screen speed smears.
        x: (rng() < 0.5 ? -1 : 1) * lerp(7.5, 15.5, depth)
          + (rng() * 2 - 1) * lerp(5, 28, depth),
        y: (rng() * 2 - 1) * lerp(3.5, 13, depth) + lerp(2, 8, depth),
        z: -55 - depth * 820,
        initialZ: -55 - depth * 820,
        speed: lerp(0.34, 0.66, rng()),
        length: lerp(1.15, 3.35, rng()) * lerp(0.72, 1.12, depth),
        width: lerp(0.12, 0.43, rng()),
        angle: lerp(-0.2, 0.2, rng()),
        phase: rng() * TAU,
      };
    });
    if (this.cloudStreaks.instanceColor) this.cloudStreaks.instanceColor.needsUpdate = true;
  }

  createRunway() {
    this.runwayRoot = new THREE.Group();
    this.runwayRoot.name = 'arrival-tangential-runway-preview';
    this.runwayRoot.position.set(0, 0, 0);
    this.root.add(this.runwayRoot);

    const geometry = createTangentialRunwayGeometry(this.quality === 'low' ? 24 : 36);
    const material = createRunwayMaterial(this.palette);
    this.register(geometry, material);
    this.runway = new THREE.Mesh(geometry, material);
    this.runway.name = 'stormglass-runway-through-haze';
    this.runway.renderOrder = 6;
    this.runwayRoot.add(this.runway);

    const lightGeometry = createRunwayLightGeometry();
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: this.palette.runwayEdge,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.register(lightGeometry, lightMaterial);
    this.runwayLights = new THREE.InstancedMesh(lightGeometry, lightMaterial, this.config.runwayLights * 2);
    this.runwayLights.name = 'stormglass-runway-depth-beacons';
    this.runwayLights.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.runwayLights.frustumCulled = false;
    this.runwayRoot.add(this.runwayLights);
  }

  createHaze() {
    const texture = makeHazeTexture(128, 64, this.seed ^ 0xa9c3354d);
    this.register(texture);
    this.hazeLayers = [];
    for (let i = 0; i < this.config.haze; i += 1) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.palette.cloud).lerp(new THREE.Color(this.palette.deep), 0.46 + i * 0.08),
        map: texture,
        alphaMap: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const depth = 180 + i * 168;
      const side = i % 2 === 0 ? -1 : 1;
      const baseX = side * (36 + i * 6);
      mesh.name = `arrival-haze-curtain-${i}`;
      mesh.position.set(baseX, 7 + i * 4, -depth);
      mesh.scale.set(44 + i * 6, 12 + i * 3, 1);
      mesh.renderOrder = 7;
      this.root.add(mesh);
      this.hazeLayers.push({
        mesh,
        material,
        baseX,
        drift: 1.8 + i * 0.55,
        phase: i * 1.71,
      });
      this.register(geometry, material);
    }
  }

  createPlasma() {
    this.plasmaRoot = new THREE.Group();
    this.plasmaRoot.name = 'arrival-leading-edge-plasma';
    this.plasmaRoot.visible = false;
    (this.player ?? this.root).add(this.plasmaRoot);

    this.plasmaMaterial = createPlasmaMaterial(this.palette);
    const arcGeometry = createShockArcGeometry(this.quality === 'low' ? 20 : 32);
    this.register(this.plasmaMaterial, arcGeometry);
    this.shockArc = new THREE.Mesh(arcGeometry, this.plasmaMaterial);
    this.shockArc.name = 'reentry-bow-shock-arc';
    this.shockArc.renderOrder = 12;
    this.plasmaRoot.add(this.shockArc);

    this.plasmaRibbons = [];
    for (const side of [-1, 1]) {
      const geometry = createPlasmaRibbonGeometry(side, -0.03);
      const ribbon = new THREE.Mesh(geometry, this.plasmaMaterial);
      ribbon.name = side < 0 ? 'reentry-port-plasma-ribbon' : 'reentry-starboard-plasma-ribbon';
      ribbon.renderOrder = 11;
      this.plasmaRoot.add(ribbon);
      this.plasmaRibbons.push(ribbon);
      this.register(geometry);
    }
  }

  updatePlanet(time, approach, reentry) {
    const arrival = smoothstep01(approach);
    const capture = smoothRange(0.48, 0.94, approach);
    const entry = smoothstep01(reentry);
    const descent = smoothRange(0.12, 0.96, reentry);
    // Drive the last limb drop from route approach itself. Reentry is a nested
    // easing curve and compressed the entire globe-to-horizon handoff into a
    // few frames around .93-.95, briefly making the camera look enclosed by a
    // glass sphere. This direct terminal window begins lower and moves evenly.
    const terminalDescent = smoothRange(0.9, 0.98, approach);
    // The world stops behaving like a decorative sky marble during reentry.
    // It first grows as a complete destination, then drops beneath the flight
    // vector until only its immense limb remains.  Keeping the nearest point
    // hundreds of world units ahead avoids enclosing the camera while the
    // authored runway and surface can visibly meet the same horizon.
    const radius = 64 + arrival * 108 + capture * capture * 104 + descent * 194;
    const planetX = 300 - arrival * 104 - capture * 86 - descent * 72;
    const planetY = 80 - arrival * 58 - capture * 76 - descent * 286 - terminalDescent * 330;
    const planetZ = -1540 + arrival * 296 + capture * 218 + descent * 274;
    this.planetRoot.position.set(
      planetX,
      planetY,
      planetZ,
    );
    this.planetRoot.scale.setScalar(radius);
    this.planetRoot.rotation.z = -0.16 - arrival * 0.08 - entry * 0.09;
    this.planetRadius = radius;
    this.planetApparentRadius = radius / Math.max(1, Math.abs(planetZ));
    this.surfaceEstablished = this.planetApparentRadius >= 0.18 || descent >= 0.22;
    this.planetSurface.rotation.y = time * 0.0021;
    this.planetClouds.rotation.y = -time * 0.0037;
    this.planetClouds.rotation.z = 0.11 + Math.sin(time * 0.013) * 0.018;
    this.planetSurface.material.uniforms.time.value = time;
    this.planetClouds.material.uniforms.time.value = time;
    this.planetClouds.material.uniforms.opacity.value = lerp(0.27, 0.36, arrival);
    this.atmosphere.material.uniforms.intensity.value = 0.18 + arrival * 0.08 + entry * 0.05;

    for (let i = 0; i < this.lightning.length; i += 1) {
      const bolt = this.lightning[i];
      const wave = Math.sin((time + bolt.phase) * TAU * bolt.cadence) * 0.5 + 0.5;
      const strike = smoothRange(bolt.threshold, 1, wave);
      const doubleStrike = smoothRange(0.965, 1, Math.sin((time + bolt.phase * 0.37) * 23.7) * 0.5 + 0.5);
      bolt.material.opacity = (strike * 0.78 + doubleStrike * 0.24) * (0.22 + arrival * 0.78);
    }
  }

  updateCloudStreaks(time, dt, speed, reentry, camera) {
    const cloudEnvelope = smoothRange(0.17, 0.5, reentry) * (1 - smoothRange(0.9, 0.985, reentry));
    this.cloudStreaks.material.opacity = cloudEnvelope * 0.17;
    this.cloudStreaks.visible = cloudEnvelope > 0.002;
    if (!this.cloudStreaks.visible) return;

    const cameraQuaternion = camera?.quaternion ?? this.tempQuaternion.identity();
    const motion = clamp(speed, 180, 1200) * dt;
    for (let i = 0; i < this.cloudData.length; i += 1) {
      const cloud = this.cloudData[i];
      cloud.z += motion * cloud.speed;
      if (cloud.z > 34) cloud.z -= 920;
      this.dummy.position.set(
        cloud.x + Math.sin(time * 0.17 + cloud.phase) * 1.8,
        cloud.y + Math.sin(time * 0.23 + cloud.phase * 1.7) * 0.72,
        cloud.z,
      );
      this.dummy.quaternion.copy(cameraQuaternion);
      this.dummy.rotateZ(cloud.angle + Math.sin(time * 0.11 + cloud.phase) * 0.035);
      const depthScale = lerp(0.7, 1.25, saturate((cloud.z + 920) / 954));
      this.dummy.scale.set(cloud.length * depthScale, cloud.width * depthScale, 1);
      this.dummy.updateMatrix();
      this.cloudStreaks.setMatrixAt(i, this.dummy.matrix);
    }
    this.cloudStreaks.instanceMatrix.needsUpdate = true;
  }

  updateRunway(time, approach, reentry, lateral) {
    // A faint vector appears before the aerodynamic morph. The player should
    // understand where they are going before plasma or clouds announce impact.
    const captureSignal = smoothRange(0.3, 0.74, approach);
    const entryReveal = smoothRange(0.18, 0.78, reentry);
    const reveal = Math.max(captureSignal * 0.62, entryReveal);
    // Keep the preview readable as a vector painted into the atmosphere, not
    // an opaque replacement road. TouchdownArt owns the solid surface.
    const opacity = Math.max(captureSignal * 0.2, entryReveal * 0.68);
    this.runway.visible = opacity > 0.001;
    this.runway.material.uniforms.time.value = time;
    this.runway.material.uniforms.reveal.value = reveal;
    this.runway.material.uniforms.opacity.value = opacity * 0.9;
    this.runwayRoot.position.x = -lateral * 0.08;
    this.runwayRoot.position.y = 0;
    this.runwayRoot.position.z = 0;
    this.runwayRoot.rotation.set(0, 0, 0);
    this.runwayOpacity = opacity * 0.9;
    this.runwayLights.material.opacity = Math.max(
      captureSignal * 0.26,
      smoothRange(0.32, 0.82, reentry) * 0.82,
    );
    this.runwayLights.visible = this.runwayLights.material.opacity > 0.001;

    if (!this.runwayLights.visible) return;
    const pairs = this.config.runwayLights;
    for (let i = 0; i < pairs; i += 1) {
      const progress = i / Math.max(1, pairs - 1);
      const centerX = runwayPathX(progress);
      const centerY = runwayPathY(progress);
      const z = runwayPathZ(progress);
      const halfWidth = runwayHalfWidth(progress);
      const pulse = 0.74 + 0.26 * Math.sin(time * 6.4 - progress * 22.0) ** 2;
      for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
        const side = sideIndex === 0 ? -1 : 1;
        this.dummy.position.set(centerX + side * halfWidth, centerY + 0.16, z);
        this.dummy.quaternion.identity();
        this.dummy.scale.setScalar(pulse * lerp(0.72, 1.25, progress));
        this.dummy.updateMatrix();
        this.runwayLights.setMatrixAt(i * 2 + sideIndex, this.dummy.matrix);
      }
    }
    this.runwayLights.instanceMatrix.needsUpdate = true;
  }

  updateHaze(time, reentry, camera) {
    const envelope = smoothRange(0.34, 0.7, reentry) * (1 - smoothRange(0.94, 1, reentry) * 0.86);
    for (let i = 0; i < this.hazeLayers.length; i += 1) {
      const layer = this.hazeLayers[i];
      layer.mesh.visible = envelope > 0.001;
      layer.material.opacity = envelope * (0.021 + i * 0.004);
      layer.mesh.position.x = layer.baseX + Math.sin(time * 0.09 + layer.phase) * layer.drift;
      // Derive orientation from the current camera/time on every call. A
      // zero-time checkpoint may be published more than once and must remain
      // pixel-idempotent rather than accumulating an Euler increment.
      if (camera) layer.mesh.quaternion.copy(camera.quaternion);
      else layer.mesh.quaternion.identity();
      layer.mesh.rotateZ(Math.sin(time * 0.03 + layer.phase) * 0.00004);
    }
  }

  updatePlasma(time, reentry, roll) {
    const heatUp = smoothRange(0.025, 0.26, reentry);
    const coolDown = smoothRange(0.72, 0.985, reentry);
    const intensity = heatUp * (1 - coolDown) * 0.6;
    this.plasmaRoot.visible = intensity > 0.002;
    this.plasmaRoot.rotation.z = -roll * 0.12;
    this.plasmaMaterial.uniforms.time.value = time;
    this.plasmaMaterial.uniforms.intensity.value = intensity;
    this.plasmaMaterial.uniforms.cooling.value = smoothRange(0.54, 0.91, reentry);
    this.shockArc.scale.set(1 + intensity * 0.12, 1 + intensity * 0.06, 1);
    for (let i = 0; i < this.plasmaRibbons.length; i += 1) {
      this.plasmaRibbons[i].scale.z = 0.78 + intensity * 0.42 + Math.sin(time * 17 + i * 2.3) * 0.035;
    }
  }

  /**
   * Advances the pooled effect. All inputs are optional and finite-clamped.
   * `approach` is intentionally distinct from `reentry`: the planet should be
   * established for most of the space sector, while plasma/haze/runway happen
   * only during the final aerodynamic morph.
   */
  update({
    active = true,
    time = this.elapsed,
    dt = 1 / 60,
    approach = 0,
    reentry = 0,
    speed = 500,
    lateral = 0,
    roll = 0,
    camera = null,
  } = {}) {
    if (this.disposed) return;
    this.active = Boolean(active);
    this.root.visible = this.active;
    if (!this.active) {
      this.plasmaRoot.visible = false;
      return;
    }

    const safeDt = clamp(Number.isFinite(dt) ? dt : 1 / 60, 0, 0.05);
    this.elapsed = Number.isFinite(time) ? time : this.elapsed + safeDt;
    const a = saturate(approach);
    const r = saturate(reentry);
    const safeSpeed = Number.isFinite(speed) ? speed : 500;
    const safeLateral = Number.isFinite(lateral) ? lateral : 0;
    const safeRoll = Number.isFinite(roll) ? roll : 0;
    this.approach = a;
    this.reentry = r;

    this.updatePlanet(this.elapsed, a, r);
    this.updateCloudStreaks(this.elapsed, safeDt, safeSpeed, r, camera);
    this.updateRunway(this.elapsed, a, r, safeLateral);
    this.updateHaze(this.elapsed, r, camera);
    this.updatePlasma(this.elapsed, r, safeRoll);
  }

  resetPresentation() {
    if (this.disposed) return false;
    this.elapsed = 0;
    this.active = false;
    this.approach = 0;
    this.reentry = 0;
    this.planetRadius = 0;
    this.planetApparentRadius = 0;
    this.runwayOpacity = 0;
    this.surfaceEstablished = false;
    this.root.visible = false;
    this.root.position.set(0, 0, 0);
    this.root.quaternion.identity();
    this.planetRoot.position.set(0, 0, 0);
    this.planetRoot.quaternion.identity();
    this.planetRoot.scale.setScalar(1);
    this.planetSurface.rotation.y = 0;
    this.planetClouds.rotation.set(0, 0, 0);
    for (const bolt of this.lightning) bolt.material.opacity = 0;
    for (const cloud of this.cloudData) cloud.z = cloud.initialZ;
    this.cloudStreaks.visible = false;
    this.cloudStreaks.material.opacity = 0;
    this.runway.visible = false;
    this.runway.material.uniforms.time.value = 0;
    this.runway.material.uniforms.reveal.value = 0;
    this.runway.material.uniforms.opacity.value = 0;
    this.runwayRoot.position.set(0, 0, 0);
    this.runwayRoot.quaternion.identity();
    this.runwayLights.visible = false;
    this.runwayLights.material.opacity = 0;
    for (const layer of this.hazeLayers) {
      layer.mesh.visible = false;
      layer.mesh.position.x = layer.baseX;
      layer.mesh.quaternion.identity();
      layer.material.opacity = 0;
    }
    this.plasmaRoot.visible = false;
    this.plasmaRoot.position.set(0, 0, 0);
    this.plasmaRoot.quaternion.identity();
    this.plasmaRoot.scale.setScalar(1);
    this.plasmaMaterial.uniforms.time.value = 0;
    this.plasmaMaterial.uniforms.intensity.value = 0;
    this.plasmaMaterial.uniforms.cooling.value = 0;
    return true;
  }

  diagnostics() {
    let cloudZSum = 0;
    let cloudZMin = Number.POSITIVE_INFINITY;
    let cloudZMax = Number.NEGATIVE_INFINITY;
    for (const cloud of this.cloudData) {
      cloudZSum += cloud.z;
      cloudZMin = Math.min(cloudZMin, cloud.z);
      cloudZMax = Math.max(cloudZMax, cloud.z);
    }
    return {
      active: this.active,
      approach: Number(this.approach.toFixed(4)),
      reentry: Number(this.reentry.toFixed(4)),
      planetRadius: Number(this.planetRadius.toFixed(2)),
      planetApparentRadius: Number(this.planetApparentRadius.toFixed(4)),
      surfaceEstablished: this.surfaceEstablished,
      runwayVisible: Boolean(this.runway?.visible),
      runwayOpacity: Number(this.runwayOpacity.toFixed(4)),
      cloudStreaksVisible: Boolean(this.cloudStreaks?.visible),
      cloudState: {
        count: this.cloudData.length,
        zSum: Number(cloudZSum.toFixed(4)),
        zMin: Number((Number.isFinite(cloudZMin) ? cloudZMin : 0).toFixed(4)),
        zMax: Number((Number.isFinite(cloudZMax) ? cloudZMax : 0).toFixed(4)),
      },
      plasmaVisible: Boolean(this.plasmaRoot?.visible),
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.plasmaRoot.parent) this.plasmaRoot.parent.remove(this.plasmaRoot);
    disposeObjectTree(this.root, this.resources);
    this.cloudData.length = 0;
    this.hazeLayers.length = 0;
    this.lightning.length = 0;
    this.plasmaRibbons.length = 0;
  }
}

export function createArrivalArt(options) {
  return new ArrivalArt(options);
}
