// RELAY ECLIPSE cosmic environment.
//
// This module intentionally owns neither scene fog nor renderer exposure.  The
// calling world can keep its post-processing/tone-mapping policy while the sky
// remains readable: the panorama is colour-modulated below display white, the
// procedural stars use a capped shader, and the world lights are deliberately
// modest.  All sky geometry follows the supplied anchor so it behaves like an
// infinitely distant background without requiring a cubemap or a second scene.

import * as THREE from 'three';

export const PLANETARIUM_SKY_URL = new URL(
  '../../assets/art/planetarium-sky-v1.png',
  import.meta.url,
).href;

const TAU = Math.PI * 2;
const SKY_RADIUS = 610;

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smooth(current, target, speed, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * dt));
}

function makeStarLayer(count, radiusMin, radiusMax, seed, sizeScale, opacity) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const cyan = new THREE.Color(0x9de8ff);
  const white = new THREE.Color(0xe7efff);
  const violet = new THREE.Color(0xb9a7ff);
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Uniformly distribute points over the sphere.  A slight equatorial bias
    // makes the panorama feel deep without creating an obvious procedural ring.
    const y = random() * 2 - 1;
    const azimuth = random() * TAU;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const distance = THREE.MathUtils.lerp(radiusMin, radiusMax, random());
    positions[i * 3] = Math.cos(azimuth) * radial * distance;
    positions[i * 3 + 1] = y * distance;
    positions[i * 3 + 2] = Math.sin(azimuth) * radial * distance;

    const chroma = random();
    if (chroma < 0.28) color.copy(cyan).lerp(white, chroma / 0.28);
    else color.copy(white).lerp(violet, (chroma - 0.28) / 0.72);
    // Stars remain colour-distinct for cyan/violet readability but never exceed
    // the shader's capped peak, even under an aggressive ACES exposure.
    color.multiplyScalar(0.72 + random() * 0.22);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = sizeScale * (0.72 + Math.pow(random(), 5) * 2.15);
    phases[i] = random() * TAU;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.computeBoundingSphere();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;

      void main() {
        vColor = color;
        vTwinkle = 0.88 + 0.12 * sin(uTime * 0.72 + aPhase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float perspective = clamp(430.0 / max(120.0, -mvPosition.z), 0.58, 2.2);
        gl_PointSize = clamp(aSize * perspective, 0.75, 4.6);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uOpacity;

      void main() {
        vec2 delta = gl_PointCoord - vec2(0.5);
        float radius = length(delta) * 2.0;
        if (radius > 1.0) discard;
        float core = 1.0 - smoothstep(0.0, 0.58, radius);
        float halo = pow(max(0.0, 1.0 - radius), 3.0) * 0.34;
        float alpha = min(0.92, (core + halo) * uOpacity * vTwinkle);
        gl_FragColor = vec4(min(vColor * (0.72 + core * 0.28), vec3(0.94)), alpha);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -890;
  return points;
}

function makeTerminatorPlanet(radius, dayColor, nightColor, rimColor) {
  const geometry = new THREE.SphereGeometry(radius, 32, 20);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: new THREE.Color(dayColor) },
      uNight: { value: new THREE.Color(nightColor) },
      uRim: { value: new THREE.Color(rimColor) },
      uLightDir: { value: new THREE.Vector3(-0.72, 0.46, 0.51).normalize() },
      uPulse: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormalWorld;
      varying vec3 vViewWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vViewWorld = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      varying vec3 vNormalWorld;
      varying vec3 vViewWorld;
      uniform vec3 uDay;
      uniform vec3 uNight;
      uniform vec3 uRim;
      uniform vec3 uLightDir;
      uniform float uPulse;
      void main() {
        float diffuse = smoothstep(-0.16, 0.72, dot(vNormalWorld, uLightDir));
        float rim = pow(1.0 - max(0.0, dot(vNormalWorld, vViewWorld)), 3.4);
        vec3 color = mix(uNight, uDay, diffuse);
        color += uRim * rim * (0.34 + uPulse * 0.07);
        gl_FragColor = vec4(min(color, vec3(0.82)), 1.0);
      }
    `,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -895;
  return mesh;
}

function makeCorona(radius, color, opacity) {
  const geometry = new THREE.RingGeometry(radius * 1.02, radius * 1.42, 64);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uPulse: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPulse;
      void main() {
        float d = length(vUv - vec2(0.5)) * 2.0;
        float band = 1.0 - smoothstep(0.02, 0.18, abs(d - 0.86));
        float alpha = band * uOpacity * (0.92 + uPulse * 0.08);
        gl_FragColor = vec4(uColor * 0.72, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -897;
  return mesh;
}

/**
 * Build a camera-following, high-depth cosmic backdrop and restrained lighting.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer|null} renderer Kept for integration symmetry; no
 * renderer exposure/tone-mapping state is mutated.
 * @param {object} options
 * @returns {object} Cosmic environment API (see returned object below).
 */
export function buildCosmos(scene, renderer = null, options = {}) {
  const root = new THREE.Group();
  root.name = 'relay-eclipse-cosmos';
  root.matrixAutoUpdate = true;
  scene.add(root);

  const textureLoader = options.textureLoader || new THREE.TextureLoader();
  const skyTexture = textureLoader.load(options.skyUrl || PLANETARIUM_SKY_URL, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
  });
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.wrapS = THREE.RepeatWrapping;
  // The source art's seam is placed behind the default approach direction.
  skyTexture.offset.x = options.panoramaOffset ?? 0.19;

  const panoramaMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    color: new THREE.Color(options.panoramaTint || 0x7582a5),
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });
  const panorama = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_RADIUS, 48, 24),
    panoramaMaterial,
  );
  panorama.name = 'planetarium-panorama';
  panorama.rotation.y = options.panoramaYaw ?? -0.34;
  panorama.renderOrder = -1000;
  panorama.frustumCulled = false;
  root.add(panorama);

  const starLayers = [
    makeStarLayer(560, 235, 330, 0xa157d33f, 1.35, 0.54),
    makeStarLayer(260, 350, 455, 0x2cb679ad, 1.75, 0.62),
    makeStarLayer(90, 470, 565, 0x7e51c0de, 2.15, 0.68),
  ];
  starLayers.forEach((layer, index) => {
    layer.name = `procedural-star-depth-${index + 1}`;
    root.add(layer);
  });

  const iceGiant = makeTerminatorPlanet(48, 0x2e91a8, 0x071222, 0x79dfff);
  iceGiant.name = 'distant-ice-giant';
  iceGiant.position.set(-360, 146, -405);
  iceGiant.rotation.z = -0.24;
  root.add(iceGiant);

  const planetRing = new THREE.Mesh(
    new THREE.RingGeometry(61, 83, 64),
    new THREE.MeshBasicMaterial({
      color: 0x77cbe5,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    }),
  );
  planetRing.name = 'ice-giant-ring';
  planetRing.position.copy(iceGiant.position);
  planetRing.rotation.set(1.19, 0.08, -0.47);
  planetRing.renderOrder = -896;
  root.add(planetRing);

  const eclipse = makeTerminatorPlanet(35, 0x241a3a, 0x010207, 0x9d83ff);
  eclipse.name = 'distant-eclipse-body';
  eclipse.position.set(315, 118, -465);
  root.add(eclipse);
  const corona = makeCorona(35, 0xa88cff, 0.34);
  corona.name = 'distant-eclipse-corona';
  corona.position.copy(eclipse.position);
  corona.lookAt(0, 0, 0);
  root.add(corona);

  // Cool/cyan-violet world-lighting hooks.  These are ordinary scene lights so
  // callers can tune/disable them without reaching into shader internals.
  const lightingRoot = new THREE.Group();
  lightingRoot.name = 'relay-eclipse-cosmic-lighting';
  scene.add(lightingRoot);

  const hemisphere = new THREE.HemisphereLight(0x9bdcff, 0x140e26, 0.58);
  hemisphere.name = 'cosmic-hemisphere';
  lightingRoot.add(hemisphere);

  const cyanKey = new THREE.DirectionalLight(0xa6e8ff, 0.72);
  cyanKey.name = 'cosmic-cyan-key';
  cyanKey.position.set(-92, 136, 64);
  cyanKey.target.position.set(0, 8, 0);
  lightingRoot.add(cyanKey, cyanKey.target);

  const violetFill = new THREE.DirectionalLight(0x8c70d8, 0.24);
  violetFill.name = 'cosmic-violet-fill';
  violetFill.position.set(88, 54, -110);
  violetFill.target.position.set(0, 12, 0);
  lightingRoot.add(violetFill, violetFill.target);

  let elapsed = 0;
  let targetIntensity = THREE.MathUtils.clamp(options.intensity ?? 1, 0, 1.5);
  let currentIntensity = targetIntensity;
  let targetThreat = 0;
  let currentThreat = 0;
  const anchor = new THREE.Vector3();

  function setIntensity(value) {
    targetIntensity = THREE.MathUtils.clamp(value, 0, 1.5);
  }

  function setThreat(value) {
    targetThreat = THREE.MathUtils.clamp(value, 0, 1);
  }

  function setLightingEnabled(enabled) {
    lightingRoot.visible = Boolean(enabled);
  }

  function update(dt, cameraOrPosition = null, state = null) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    elapsed += dt;
    if (state && Number.isFinite(state.intensity)) setIntensity(state.intensity);
    if (state && Number.isFinite(state.threat)) setThreat(state.threat);

    if (cameraOrPosition) {
      const candidate = cameraOrPosition.isCamera ? cameraOrPosition.position : cameraOrPosition;
      if (candidate && candidate.isVector3) anchor.copy(candidate);
    }
    root.position.copy(anchor);

    currentIntensity = smooth(currentIntensity, targetIntensity, 3.4, dt);
    currentThreat = smooth(currentThreat, targetThreat, 2.1, dt);

    panoramaMaterial.color.setRGB(
      0.46 - currentThreat * 0.035,
      0.51 - currentThreat * 0.055,
      0.65 + currentThreat * 0.015,
    ).multiplyScalar(0.78 + currentIntensity * 0.22);

    starLayers[0].rotation.y = elapsed * 0.0019;
    starLayers[1].rotation.y = -elapsed * 0.0011;
    starLayers[1].rotation.x = Math.sin(elapsed * 0.007) * 0.006;
    starLayers[2].rotation.y = elapsed * 0.00055;
    for (const stars of starLayers) {
      stars.material.uniforms.uTime.value = elapsed;
      stars.material.uniforms.uOpacity.value = currentIntensity * (0.54 + currentThreat * 0.08);
    }

    iceGiant.rotation.y += dt * 0.004;
    eclipse.rotation.y -= dt * 0.003;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.43);
    iceGiant.material.uniforms.uPulse.value = pulse;
    eclipse.material.uniforms.uPulse.value = pulse + currentThreat * 0.35;
    corona.material.uniforms.uPulse.value = pulse + currentThreat * 0.45;
    corona.material.uniforms.uOpacity.value = (0.28 + currentThreat * 0.08) * currentIntensity;

    hemisphere.intensity = currentIntensity * (0.52 - currentThreat * 0.07);
    cyanKey.intensity = currentIntensity * (0.68 - currentThreat * 0.09);
    violetFill.intensity = currentIntensity * (0.22 + currentThreat * 0.08);
    lightingRoot.position.copy(anchor);
  }

  function dispose() {
    scene.remove(root, lightingRoot);
    panorama.geometry.dispose();
    panoramaMaterial.dispose();
    skyTexture.dispose();
    for (const stars of starLayers) {
      stars.geometry.dispose();
      stars.material.dispose();
    }
    iceGiant.geometry.dispose();
    iceGiant.material.dispose();
    eclipse.geometry.dispose();
    eclipse.material.dispose();
    planetRing.geometry.dispose();
    planetRing.material.dispose();
    corona.geometry.dispose();
    corona.material.dispose();
  }

  return {
    group: root,
    panorama,
    starLayers,
    celestialBodies: { iceGiant, planetRing, eclipse, corona },
    lighting: { group: lightingRoot, hemisphere, cyanKey, violetFill },
    setIntensity,
    setThreat,
    setLightingEnabled,
    update,
    dispose,
    metrics: Object.freeze({
      proceduralStars: 910,
      starDrawCalls: 3,
      celestialDrawCalls: 4,
      panoramaTriangles: 2304,
      mutatesRendererExposure: false,
      skyRadius: SKY_RADIUS,
    }),
    renderer,
  };
}
