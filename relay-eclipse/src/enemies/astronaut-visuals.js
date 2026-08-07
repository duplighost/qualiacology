// High-detail enemy impostors built from the commissioned astronaut renders.
//
// The expensive resources (textures, shaders, geometry, and the contact-shadow
// texture) live on AstronautVisualLibrary and are shared by every instance.
// Each AstronautVisual owns only a few Groups/Meshes and numeric animation
// state. update() intentionally performs no per-frame object/array allocation.

import * as THREE from 'three';

const FILES = Object.freeze({
  rusher: 'astronaut-rusher-v1.png',
  shooter: 'astronaut-shooter-v1.png',
  brute: 'astronaut-brute-v1.png',
  commander: 'astronaut-commander-v1.png',
  maw: 'eclipse-maw-v1.png',
});

export const ASTRONAUT_ASSET_URLS = Object.freeze(Object.fromEntries(
  Object.entries(FILES).map(([type, file]) => [
    type,
    new URL(`../../assets/art/${file}`, import.meta.url).href,
  ]),
));

// Cues are deliberately redundant: silhouette/scale + hue + luminance + gait.
// Cyan, yellow, and magenta/violet remain separable under deuteranopia, while
// the luminance values prevent any role from depending on hue alone.
export const ASTRONAUT_VISUAL_TYPES = Object.freeze({
  rusher: Object.freeze({
    height: 2.18, aspect: 1024 / 1536, widthScale: 1.08, groundOffset: 0,
    accent: 0xff48c8, cueLuminance: 0.92, lodDistance: 34, curveDepth: 0.055,
    shadowX: 0.72, shadowZ: 0.26, bobHz: 2.8, bobAmount: 0.045,
    legSwing: 0.145, armSwing: 0.078, bodyBounce: 0.075, bodySway: 0.045, attackKick: 0.11,
  }),
  shooter: Object.freeze({
    height: 2.28, aspect: 1024 / 1536, widthScale: 1.1, groundOffset: 0,
    accent: 0x37e7ff, cueLuminance: 1.0, lodDistance: 42, curveDepth: 0.06,
    shadowX: 0.78, shadowZ: 0.31, bobHz: 1.45, bobAmount: 0.018,
    legSwing: 0.115, armSwing: 0.028, bodyBounce: 0.065, bodySway: 0.034, attackKick: 0.085,
  }),
  brute: Object.freeze({
    height: 3.12, aspect: 1024 / 1536, widthScale: 1.08, groundOffset: 0,
    accent: 0xffd84a, cueLuminance: 1.08, lodDistance: 50, curveDepth: 0.085,
    shadowX: 0.92, shadowZ: 0.42, bobHz: 0.82, bobAmount: 0.025,
    legSwing: 0.095, armSwing: 0.052, bodyBounce: 0.095, bodySway: 0.038, attackKick: 0.13,
  }),
  commander: Object.freeze({
    height: 3.62, aspect: 1024 / 1536, widthScale: 1.2, groundOffset: 0.02,
    accent: 0xc77dff, cueLuminance: 1.02, lodDistance: 58, curveDepth: 0.095,
    shadowX: 1.02, shadowZ: 0.45, bobHz: 0.62, bobAmount: 0.035,
    legSwing: 0.078, armSwing: 0.042, bodyBounce: 0.088, bodySway: 0.032, attackKick: 0.15,
  }),
  maw: Object.freeze({
    height: 6.4, aspect: 1, widthScale: 1, groundOffset: 1.4,
    accent: 0xff52d6, cueLuminance: 1.05, lodDistance: 86, curveDepth: 0.16,
    shadowX: 0.72, shadowZ: 0.32, bobHz: 0.36, bobAmount: 0.16,
    legSwing: 0, armSwing: 0, bodyBounce: 0, bodySway: 0.018, attackKick: 0.06,
  }),
});

// Keep the current LOD until the camera crosses a separate enter/exit boundary.
// The gap prevents outline/mesh chatter when the player hovers near a cutoff.
const LOD_HYSTERESIS = 0.1;

// The source renders are single transparent images, not skeletons or sprite
// sheets. This vertex deformation makes the visible art itself articulate:
// opposite leg depth/lift, counter-swinging arms, torso weight transfer, and a
// state-driven anticipation and attack recoil. Both high and low LODs use it
// so phone quality scaling never turns moving enemies back into rigid cards.
const ANIMATED_IMPOSTOR_DEFORM = /* glsl */`
  uniform float uMotionPhase;
  uniform float uMotion;
  uniform float uWindup;
  uniform float uAttack;
  uniform float uLegSwing;
  uniform float uArmSwing;
  uniform float uBodySway;
  uniform float uAttackKick;

  vec3 deformAnimatedImpostor(vec3 p, vec2 texUv) {
    float x = texUv.x * 2.0 - 1.0;
    float side = x < 0.0 ? -1.0 : 1.0;
    float separated = smoothstep(0.035, 0.22, abs(x));
    float lower = (1.0 - smoothstep(0.38, 0.59, texUv.y)) * separated;

    // A sine ran both legs through the same motion in both halves of the
    // cycle, which means the planted foot slid backwards along the ground for
    // the whole stance — the loudest possible tell that a thing is not really
    // walking. Split the cycle instead. Through stance the foot tracks steadily
    // back at the rate the body passes over it; the shorter swing phase whips
    // it forward and lifts it clear. Stance is the longer half, as in a walk.
    const float STANCE = 0.62;
    float cyc = fract((uMotionPhase + (side > 0.0 ? 3.14159265 : 0.0)) / 6.2831853);
    float inStance = step(cyc, STANCE);
    float stanceT = cyc / STANCE;
    float swingT = (cyc - STANCE) / (1.0 - STANCE);
    float travel = mix(
      mix(-1.0, 1.0, smoothstep(0.0, 1.0, swingT)),
      mix(1.0, -1.0, stanceT),
      inStance);
    float lift = (1.0 - inStance) * sin(swingT * 3.14159265);

    // The leg travels in depth, lifts only while swinging, and opens slightly
    // at the foot. Deformation stays smooth around the pelvis so the detailed
    // source texture does not tear.
    p.z += lower * travel * uLegSwing * uMotion;
    p.y += lower * lift * uLegSwing * 0.82 * uMotion;
    p.x += lower * travel * uLegSwing * 0.34 * uMotion;

    float armBand = smoothstep(0.34, 0.62, abs(x))
      * smoothstep(0.34, 0.54, texUv.y)
      * (1.0 - smoothstep(0.82, 0.95, texUv.y));
    p.z -= armBand * travel * uArmSwing * uMotion;
    p.x -= armBand * travel * uArmSwing * 0.18 * uMotion;
    p.y += armBand * lift * uArmSwing * 0.34 * uMotion;

    float torso = smoothstep(0.34, 0.66, texUv.y);
    float transfer = sin(uMotionPhase);
    p.x += torso * transfer * uBodySway * uMotion;
    p.z += torso * cos(uMotionPhase) * uBodySway * 0.24 * uMotion;

    // Shoulders counter the hips. Because the impostor always faces you, the
    // leg travel above happens almost entirely in depth and is nearly invisible
    // — this counter-rotation is the clearest walk cue the frontal silhouette
    // actually has, so it carries more of the read than it would on a model.
    float shoulders = smoothstep(0.56, 0.88, texUv.y);
    p.x -= shoulders * transfer * uBodySway * 0.9 * uMotion;

    // Windup is deliberately screen-plane dominant: a modest shoulder brace
    // and crouch remain legible to the player without bending the baked weapon
    // into rubber. The containing group adds the broader anticipation squash.
    float upper = smoothstep(0.35, 0.72, texUv.y);
    float shoulderBrace = smoothstep(0.36, 0.54, texUv.y)
      * (1.0 - smoothstep(0.82, 0.95, texUv.y));
    p.x += side * shoulderBrace * uWindup * 0.012;
    p.y -= upper * uWindup * 0.018;

    // Attack remains the post-impact recoil channel. Most of its displacement
    // stays in depth, with only a restrained screen-plane release.
    p.z -= upper * uAttack * uAttackKick;
    p.y += upper * uAttack * uAttackKick * 0.18;
    p.x -= upper * x * uAttack * uAttackKick * 0.09;
    return p;
  }
`;

const MAIN_VERTEX = /* glsl */`
  varying vec2 vUv;
  uniform float uCurveDepth;
  ${ANIMATED_IMPOSTOR_DEFORM}

  void main() {
    vUv = uv;
    vec3 p = deformAnimatedImpostor(position, uv);
    float x = uv.x * 2.0 - 1.0;
    float y = uv.y * 2.0 - 1.0;
    // A shallow convex bow gives the cutout real depth parallax and a stable
    // depth silhouette without paying for a skinned model.
    p.z += (1.0 - x * x) * (0.78 + 0.22 * (1.0 - y * y)) * uCurveDepth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const MAIN_FRAGMENT = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uAccent;
  uniform float uCueLuminance;
  uniform float uHit;
  uniform float uOpacity;
  uniform float uPulse;
  uniform float uFrozen;
  uniform float uDistanceCue;
  varying vec2 vUv;

  void main() {
    vec4 texel = texture2D(uMap, vUv);
    float alphaCutoff = mix(0.055, 0.04, uDistanceCue);
    if (texel.a < alphaCutoff) discard;

    vec2 p = vUv * 2.0 - 1.0;
    // Low-cost spherical lighting across the image provides shape even when
    // the baked render is viewed in a very dark scene.
    float dome = sqrt(max(0.08, 1.0 - dot(p * vec2(0.58, 0.35), p * vec2(0.58, 0.35))));
    float key = 0.84 + dome * 0.19 + p.x * -0.045 + p.y * 0.025;
    vec3 color = texel.rgb * key;

    float luma = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
    float poweredDetail = smoothstep(0.63, 1.0, luma) * (0.035 + 0.035 * uPulse);
    color += uAccent * poweredDetail * uCueLuminance;

    // Range compensation is intentionally small and luminance-led. It keeps
    // the suit readable against the dusk without turning distant enemies into
    // neon pickups or relying on hue alone.
    float distanceLift = uDistanceCue * (0.012 + smoothstep(0.5, 1.0, luma) * 0.024);
    color += mix(vec3(0.86, 0.91, 0.96), uAccent, 0.18) * distanceLift * uCueLuminance;

    // Frozen feedback affects the visible cutout itself. A bright desaturated
    // blue-white body plus an alpha-edge glint survives deuteranopia and dark
    // backgrounds; it does not depend on the hidden procedural materials.
    float frozen = smoothstep(0.0, 1.0, uFrozen);
    float iceLuma = max(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0.66);
    vec3 iceColor = vec3(iceLuma * 0.88, iceLuma * 1.02, iceLuma * 1.12);
    float crystalEdge = smoothstep(0.07, 0.46, texel.a)
      * (1.0 - smoothstep(0.58, 0.96, texel.a));
    color = mix(color, iceColor, frozen * 0.82);
    color += vec3(0.72, 0.93, 1.0) * frozen * (crystalEdge * 0.7 + poweredDetail * 0.16);

    float hit = smoothstep(0.0, 1.0, uHit);
    color = mix(color, vec3(1.0, 0.97, 0.86) + uAccent * 0.16, hit * 0.9);
    color += uAccent * hit * 0.32;

    gl_FragColor = vec4(color, texel.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

const OUTLINE_VERTEX = /* glsl */`
  varying vec2 vUv;
  uniform float uCurveDepth;
  ${ANIMATED_IMPOSTOR_DEFORM}

  void main() {
    vUv = uv;
    vec3 p = deformAnimatedImpostor(position, uv);
    float x = uv.x * 2.0 - 1.0;
    p.z += (1.0 - x * x) * uCurveDepth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const OUTLINE_FRAGMENT = /* glsl */`
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform vec3 uAccent;
  uniform float uCueLuminance;
  uniform float uOpacity;
  uniform float uPulse;
  uniform float uHit;
  uniform float uFrozen;
  uniform float uDistanceCue;
  varying vec2 vUv;

  void main() {
    float a = texture2D(uMap, vUv).a;
    float n = texture2D(uMap, vUv + vec2(0.0, uTexel.y * 3.0)).a;
    float s = texture2D(uMap, vUv - vec2(0.0, uTexel.y * 3.0)).a;
    float e = texture2D(uMap, vUv + vec2(uTexel.x * 3.0, 0.0)).a;
    float w = texture2D(uMap, vUv - vec2(uTexel.x * 3.0, 0.0)).a;
    float outer = max(max(n, s), max(e, w));
    float line = max(0.0, outer - a);
    float frozen = smoothstep(0.0, 1.0, uFrozen);
    float energy = line * (0.28 + 0.16 * uPulse + 0.5 * uHit
      + 0.12 * uDistanceCue + 0.46 * frozen) * uCueLuminance;
    if (energy < 0.006) discard;
    vec3 edgeColor = mix(uAccent, vec3(0.72, 0.93, 1.0), frozen * 0.92);
    gl_FragColor = vec4(edgeColor * energy, energy * uOpacity);
    #include <colorspace_fragment>
  }
`;

const LOW_VERTEX = /* glsl */`
  varying vec2 vUv;
  ${ANIMATED_IMPOSTOR_DEFORM}
  void main() {
    vUv = uv;
    vec3 p = deformAnimatedImpostor(position, uv);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const LOW_FRAGMENT = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uAccent;
  uniform float uCueLuminance;
  uniform float uHit;
  uniform float uOpacity;
  uniform float uFrozen;
  uniform float uDistanceCue;
  varying vec2 vUv;

  void main() {
    vec4 texel = texture2D(uMap, vUv);
    float alphaCutoff = mix(0.085, 0.045, uDistanceCue);
    if (texel.a < alphaCutoff) discard;
    vec3 color = texel.rgb;
    color = mix(color, vec3(1.0, 0.96, 0.82) + uAccent * 0.12, uHit * 0.82);
    float luma = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
    color += uAccent * smoothstep(0.78, 1.0, luma) * 0.035 * uCueLuminance;
    color += mix(vec3(0.88, 0.93, 0.98), uAccent, 0.16)
      * uDistanceCue * (0.018 + smoothstep(0.55, 1.0, luma) * 0.025) * uCueLuminance;

    float frozen = smoothstep(0.0, 1.0, uFrozen);
    float iceLuma = max(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0.7);
    vec3 iceColor = vec3(iceLuma * 0.88, iceLuma * 1.02, iceLuma * 1.12);
    float crystalEdge = smoothstep(0.08, 0.5, texel.a)
      * (1.0 - smoothstep(0.6, 0.96, texel.a));
    color = mix(color, iceColor, frozen * 0.84);
    color += vec3(0.74, 0.94, 1.0) * frozen * crystalEdge * 0.62;
    gl_FragColor = vec4(color, texel.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function makeContactShadowTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  const half = size * 0.5;
  let o = 0;
  for (let y = 0; y < size; y++) {
    const py = (y + 0.5 - half) / half;
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5 - half) / half;
      const d = Math.sqrt(px * px + py * py);
      const a = clamp01(1 - d);
      data[o++] = 0;
      data[o++] = 0;
      data[o++] = 0;
      data[o++] = Math.round(a * a * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'astronaut-contact-shadow';
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function prepareTexture(texture, renderer) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  // Geometry LOD cannot prefilter a 1024x1536 color/alpha image. Trilinear
  // mipmapping keeps suit detail and cutout edges stable during minification;
  // anisotropy then has an actual mip chain to work with at oblique angles.
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = renderer
    ? Math.min(8, renderer.capabilities.getMaxAnisotropy())
    : 4;
  texture.needsUpdate = true;
  return texture;
}

function sharedUniforms(texture, def) {
  return {
    uMap: { value: texture },
    uAccent: { value: new THREE.Color(def.accent) },
    uCueLuminance: { value: def.cueLuminance },
    uHit: { value: 0 },
    uOpacity: { value: 1 },
    uPulse: { value: 0 },
    uCurveDepth: { value: def.curveDepth },
    uMotionPhase: { value: 0 },
    uMotion: { value: 0 },
    uWindup: { value: 0 },
    uAttack: { value: 0 },
    uFrozen: { value: 0 },
    uDistanceCue: { value: 0 },
    uLegSwing: { value: def.legSwing || 0 },
    uArmSwing: { value: def.armSwing || 0 },
    uBodySway: { value: def.bodySway || 0 },
    uAttackKick: { value: def.attackKick || 0 },
    uTexel: { value: new THREE.Vector2(1 / texture.image.width, 1 / texture.image.height) },
  };
}

function makeMainMaterial(texture, def) {
  return new THREE.ShaderMaterial({
    name: `astronaut-${texture.name || 'main'}-high`,
    uniforms: sharedUniforms(texture, def),
    vertexShader: MAIN_VERTEX,
    fragmentShader: MAIN_FRAGMENT,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
}

function makeOutlineMaterial(texture, def) {
  return new THREE.ShaderMaterial({
    name: `astronaut-${texture.name || 'main'}-rim`,
    uniforms: sharedUniforms(texture, def),
    vertexShader: OUTLINE_VERTEX,
    fragmentShader: OUTLINE_FRAGMENT,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    toneMapped: false,
  });
}

function makeLowMaterial(texture, def) {
  return new THREE.ShaderMaterial({
    name: `astronaut-${texture.name || 'main'}-low`,
    uniforms: sharedUniforms(texture, def),
    vertexShader: LOW_VERTEX,
    fragmentShader: LOW_FRAGMENT,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide,
    toneMapped: false,
  });
}

/**
 * Loads the five render textures once and returns a reusable visual library.
 *
 * @param {object} options
 * @param {THREE.WebGLRenderer} [options.renderer] Used only for anisotropy.
 * @param {THREE.LoadingManager} [options.loadingManager]
 * @param {string|URL} [options.baseUrl] Optional asset directory override.
 * @returns {Promise<AstronautVisualLibrary>}
 */
export async function loadAstronautVisuals(options = {}) {
  const loader = new THREE.TextureLoader(options.loadingManager);
  const types = Object.keys(FILES);
  const textures = {};
  const baseUrl = options.baseUrl ? new URL(options.baseUrl, import.meta.url) : null;
  const pending = types.map(async (type) => {
    const url = baseUrl ? new URL(FILES[type], baseUrl).href : ASTRONAUT_ASSET_URLS[type];
    const texture = await loader.loadAsync(url);
    texture.name = FILES[type];
    textures[type] = prepareTexture(texture, options.renderer);
  });
  await Promise.all(pending);
  const library = new AstronautVisualLibrary(textures);
  // Upload the large cutouts and compile every shared visual program while the
  // start card still owns the screen. Without this, the first mixed wave can
  // pay several one-time GPU upload/compile stalls in the middle of combat.
  if (options.renderer) library.prewarm(options.renderer);
  return library;
}

export class AstronautVisualLibrary {
  constructor(textures) {
    this.textures = textures;
    this._instances = new Set();
    this._disposed = false;
    this._quality = 'high';
    // Enough subdivisions for the gait deformation to bend the silhouette at
    // hips, knees, shoulders, and torso. The vertex cost is tiny compared with
    // the authored textures and remains shared across every enemy instance.
    this._highGeometry = new THREE.PlaneGeometry(1, 1, 14, 20);
    this._lowGeometry = new THREE.PlaneGeometry(1, 1, 6, 8);
    this._shadowGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    this._shadowTexture = makeContactShadowTexture();
    this._shadowMaterial = new THREE.MeshBasicMaterial({
      name: 'astronaut-contact-shadow',
      map: this._shadowTexture,
      color: 0x000000,
      transparent: true,
      opacity: 0.38,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      toneMapped: false,
    });
    this._materials = {};
    for (const type of Object.keys(FILES)) {
      const def = ASTRONAUT_VISUAL_TYPES[type];
      const texture = textures[type];
      if (!texture) throw new Error(`Missing astronaut visual texture: ${type}`);
      this._materials[type] = {
        high: makeMainMaterial(texture, def),
        outline: makeOutlineMaterial(texture, def),
        low: makeLowMaterial(texture, def),
      };
    }
    this._prewarmed = false;
  }

  /** Uploads shared textures and compiles all three LOD programs off-screen. */
  prewarm(renderer) {
    if (this._disposed) throw new Error('AstronautVisualLibrary has been disposed.');
    if (this._prewarmed || !renderer) return this;

    // initTexture is public on WebGLRenderer. Guard it so non-WebGL test
    // doubles can still construct the library and exercise its state logic.
    if (typeof renderer.initTexture === 'function') {
      for (const texture of Object.values(this.textures)) renderer.initTexture(texture);
      renderer.initTexture(this._shadowTexture);
    }

    if (typeof renderer.compile === 'function') {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 20);
      camera.position.z = 5;
      let column = -2;
      for (const type of Object.keys(this._materials)) {
        const materials = this._materials[type];
        const high = new THREE.Mesh(this._highGeometry, materials.high);
        const outline = new THREE.Mesh(this._highGeometry, materials.outline);
        const low = new THREE.Mesh(this._lowGeometry, materials.low);
        high.position.set(column, 0.8, 0);
        outline.position.set(column, 0.8, -0.02);
        low.position.set(column, -0.8, 0);
        scene.add(high, outline, low);
        column += 1;
      }
      const shadow = new THREE.Mesh(this._shadowGeometry, this._shadowMaterial);
      shadow.rotation.x = -Math.PI * 0.5;
      scene.add(shadow);
      renderer.compile(scene, camera);
      scene.clear();
    }

    this._prewarmed = true;
    return this;
  }

  /** Creates a lightweight visual instance. Add root to a scene or enemy node. */
  create(type, options = {}) {
    if (this._disposed) throw new Error('AstronautVisualLibrary has been disposed.');
    if (!ASTRONAUT_VISUAL_TYPES[type]) throw new Error(`Unknown astronaut visual type: ${type}`);
    const visual = new AstronautVisual(this, type, options);
    visual.setQuality(this._quality);
    this._instances.add(visual);
    if (options.parent) options.parent.add(visual.root);
    return visual;
  }

  setQuality(value = 'high') {
    const name = typeof value === 'string' ? value : (value && value.name) || 'high';
    this._quality = ['ultra', 'high', 'medium', 'low'].includes(name) ? name : 'high';
    for (const instance of this._instances) instance.setQuality(this._quality);
    return this;
  }

  dispose() {
    if (this._disposed) return;
    // dispose() removes each instance from this Set, so repeatedly consume the
    // first entry instead of copying the Set into a temporary array.
    while (this._instances.size) this._instances.values().next().value.dispose();
    this._highGeometry.dispose();
    this._lowGeometry.dispose();
    this._shadowGeometry.dispose();
    this._shadowMaterial.dispose();
    this._shadowTexture.dispose();
    for (const type of Object.keys(this._materials)) {
      this._materials[type].high.dispose();
      this._materials[type].outline.dispose();
      this._materials[type].low.dispose();
    }
    for (const type of Object.keys(this.textures)) this.textures[type].dispose();
    this._disposed = true;
  }
}

export class AstronautVisual {
  constructor(library, type, options = {}) {
    this.library = library;
    this.type = type;
    this.definition = ASTRONAUT_VISUAL_TYPES[type];
    this.root = new THREE.Group();
    this.root.name = `astronaut-visual-${type}`;
    this.object3d = this.root;

    this._scale = options.scale === undefined ? 1 : options.scale;
    this._lodDistance = options.lodDistance || this.definition.lodDistance;
    this._lodDistanceSq = this._lodDistance * this._lodDistance;
    this._lodEnterDistance = this._lodDistance * (1 - LOD_HYSTERESIS);
    this._lodExitDistance = this._lodDistance * (1 + LOD_HYSTERESIS);
    this._lodEnterDistanceSq = this._lodEnterDistance * this._lodEnterDistance;
    this._lodExitDistanceSq = this._lodExitDistance * this._lodExitDistance;
    this._lodInitialized = false;
    this._usingHighLod = true;
    this._lastCameraDistance = 0;
    this._distanceCue = 0;
    this._opacity = options.opacity === undefined ? 1 : clamp01(options.opacity);
    this._targetOpacity = this._opacity;
    this._hit = 0;
    this._pulse = 0;
    this._age = options.phase || Math.random() * Math.PI * 2;
    this._phase = this._age;
    this._pitch = 0;
    this._lean = 0;
    this._speed01 = 0;
    this._motion = 0;
    this._windup = 0;
    this._targetWindup = 0;
    this._attack = 0;
    this._targetAttack = 0;
    this._frozen = 0;
    this._poseLocked = false;
    this._motionPhase = this._phase;
    this._disposed = false;
    this._hasFacing = false;
    this._facingYaw = 0;
    this._quality = 'high';
    this._outlineEnabled = true;
    this._shadowEnabled = type !== 'maw';
    this._lodScale = 1;

    this._cameraWorld = new THREE.Vector3();
    this._targetWorld = new THREE.Vector3();
    this._worldPosition = new THREE.Vector3();
    this._parentWorldQuaternion = new THREE.Quaternion();
    this._worldFacingQuaternion = new THREE.Quaternion();
    this._inverseParentQuaternion = new THREE.Quaternion();
    this._up = new THREE.Vector3(0, 1, 0);

    const def = this.definition;
    const materials = library._materials[type];
    const height = def.height * this._scale;
    const width = height * def.aspect * def.widthScale;
    const centerY = def.groundOffset * this._scale + height * 0.5;

    this.high = new THREE.Group();
    this.high.name = `${type}-high-lod`;
    this.high.position.y = centerY;
    this.root.add(this.high);

    this.main = new THREE.Mesh(library._highGeometry, materials.high);
    this.main.name = `${type}-impostor`;
    this.main.scale.set(width, height, 1);
    this.main.renderOrder = 4;
    this.main.frustumCulled = true;
    this.main.castShadow = false;
    this.main.receiveShadow = false;
    this.main.onBeforeRender = () => this._setUniforms(materials.high);
    this.high.add(this.main);

    this.outline = new THREE.Mesh(library._highGeometry, materials.outline);
    this.outline.name = `${type}-energy-rim`;
    this.outline.scale.set(width * 1.018, height * 1.012, 1);
    this.outline.position.z = -0.012 * this._scale;
    this.outline.renderOrder = 3;
    this.outline.frustumCulled = true;
    this.outline.onBeforeRender = () => this._setUniforms(materials.outline);
    this.high.add(this.outline);

    this.low = new THREE.Mesh(library._lowGeometry, materials.low);
    this.low.name = `${type}-low-lod`;
    this.low.position.y = centerY;
    this.low.scale.set(width, height, 1);
    this._lowBaseWidth = width;
    this._lowBaseHeight = height;
    this.low.renderOrder = 4;
    this.low.visible = false;
    this.low.onBeforeRender = () => this._setUniforms(materials.low);
    this.root.add(this.low);

    this.shadow = new THREE.Mesh(library._shadowGeometry, library._shadowMaterial);
    this.shadow.name = `${type}-contact-shadow`;
    this.shadow.rotation.x = -Math.PI * 0.5;
    this.shadow.position.y = 0.018;
    this.shadow.scale.set(
      width * def.shadowX,
      width * def.shadowZ,
      1,
    );
    this.shadow.renderOrder = -3;
    this.shadow.onBeforeRender = () => {
      library._shadowMaterial.opacity = 0.38 * this._opacity;
    };
    this.root.add(this.shadow);

    // These tags make integration/raycast filtering straightforward without
    // creating new collision geometry or polluting the enemy's hit list.
    this.main.userData.astronautVisual = this;
    this.low.userData.astronautVisual = this;
    this.main.userData.visualRole = type;
    this.low.userData.visualRole = type;
    this.setQuality(options.quality || library._quality || 'high');
  }

  _setUniforms(material) {
    material.uniforms.uHit.value = this._hit;
    material.uniforms.uOpacity.value = this._opacity;
    if (material.uniforms.uPulse) material.uniforms.uPulse.value = this._pulse;
    if (material.uniforms.uMotionPhase) material.uniforms.uMotionPhase.value = this._motionPhase;
    if (material.uniforms.uMotion) material.uniforms.uMotion.value = this._motion;
    if (material.uniforms.uWindup) material.uniforms.uWindup.value = this._windup;
    if (material.uniforms.uAttack) material.uniforms.uAttack.value = this._attack;
    if (material.uniforms.uFrozen) material.uniforms.uFrozen.value = this._frozen;
    if (material.uniforms.uDistanceCue) material.uniforms.uDistanceCue.value = this._distanceCue;
  }

  /** White-hot emissive hit confirmation; strength is normalized to 0..1. */
  triggerHit(strength = 1) {
    this._hit = Math.max(this._hit, clamp01(strength));
    return this;
  }

  setOpacity(opacity, immediate = false) {
    this._targetOpacity = clamp01(opacity);
    if (immediate) this._opacity = this._targetOpacity;
    return this;
  }

  setVisible(visible) {
    this.root.visible = !!visible;
    return this;
  }

  setQuality(value = 'high') {
    const name = typeof value === 'string' ? value : (value && value.name) || 'high';
    this._quality = name;
    this._outlineEnabled = name === 'ultra' || name === 'high';
    this._shadowEnabled = this.type !== 'maw' && name !== 'low';
    this._lodScale = name === 'low' ? 0.62 : (name === 'medium' ? 0.78 : 1);
    const scaledLodDistance = this._lodDistance * this._lodScale;
    this._lodDistanceSq = scaledLodDistance * scaledLodDistance;
    this._lodEnterDistance = scaledLodDistance * (1 - LOD_HYSTERESIS);
    this._lodExitDistance = scaledLodDistance * (1 + LOD_HYSTERESIS);
    this._lodEnterDistanceSq = this._lodEnterDistance * this._lodEnterDistance;
    this._lodExitDistanceSq = this._lodExitDistance * this._lodExitDistance;
    this.shadow.visible = this._shadowEnabled;
    return this;
  }

  setPosition(position) {
    this.root.position.copy(position);
    return this;
  }

  /** Copies an Object3D's world position into this visual's current parent. */
  syncPositionFrom(object3d) {
    object3d.getWorldPosition(this._worldPosition);
    if (this.root.parent) this.root.parent.worldToLocal(this._worldPosition);
    this.root.position.copy(this._worldPosition);
    return this;
  }

  /**
   * Updates billboard facing, LOD, bob, hit feedback, and fade.
   *
   * @param {number} dt Seconds.
   * @param {THREE.Camera} camera Active world camera.
   * @param {THREE.Vector3|THREE.Object3D|null} target Optional enemy target;
   *   when omitted, the visual faces the camera.
   * @param {object|null} state Optional allocation-free state bag. Supported
   *   fields: hit, opacity, speed01, gaitPhase, windup, attack, frozen,
   *   poseLocked, pitch, lean, bob, pulse, visible.
   */
  update(dt, camera, target = null, state = null) {
    if (this._disposed || !camera) return;
    const step = Math.max(0, Math.min(dt, 0.1));
    this._age += step;

    // poseLocked and frozen describe current state rather than an impulse, so
    // omission means false. windup similarly returns to rest unless explicitly
    // driven by the caller on the current frame.
    this._poseLocked = Boolean(state && state.poseLocked);
    this._frozen = state && state.frozen !== undefined
      ? clamp01(state.frozen === true ? 1 : Number(state.frozen) || 0)
      : 0;
    this._targetWindup = state && state.windup !== undefined
      ? clamp01(state.windup === true ? 1 : Number(state.windup) || 0)
      : 0;

    if (state) {
      if (state.hit !== undefined) this._hit = Math.max(this._hit, clamp01(state.hit));
      if (state.opacity !== undefined) this._targetOpacity = clamp01(state.opacity);
      if (state.speed01 !== undefined) this._speed01 = clamp01(state.speed01);
      if (state.gaitPhase !== undefined && Number.isFinite(state.gaitPhase)) this._motionPhase = state.gaitPhase;
      if (state.attack !== undefined) this._targetAttack = clamp01(state.attack);
      if (state.pitch !== undefined) this._pitch = state.pitch;
      if (state.lean !== undefined) this._lean = state.lean;
      if (state.pulse !== undefined) this._pulse = clamp01(state.pulse);
      if (state.visible !== undefined) this.root.visible = !!state.visible;
    }

    this._hit = Math.max(0, this._hit - step * 7.5);
    this._opacity = damp(this._opacity, this._targetOpacity, 13, step);
    if (this._poseLocked) {
      // A frozen/stunned/pinned/dead pose must stop on this frame. Damping here
      // leaves half a second of ghost walking, especially obvious at low FPS.
      this._speed01 = 0;
      this._motion = 0;
      this._windup = 0;
      this._targetWindup = 0;
      this._attack = 0;
      this._targetAttack = 0;
    } else {
      this._motion = damp(this._motion, this._speed01, this._speed01 > this._motion ? 12 : 7, step);
      // The gameplay timer already supplies a smooth 0..1 anticipation curve.
      // Track it exactly so the short, dodgeable tell reaches its authored pose
      // before contact instead of losing strength to a second smoothing layer.
      this._windup = this._targetWindup;
      this._attack = damp(this._attack, this._targetAttack, this._targetAttack > this._attack ? 20 : 8, step);
    }

    camera.getWorldPosition(this._cameraWorld);
    if (target && target.isObject3D) target.getWorldPosition(this._targetWorld);
    else if (target && target.isVector3) this._targetWorld.copy(target);
    else if (target && target.position && target.position.isVector3) this._targetWorld.copy(target.position);
    else this._targetWorld.copy(this._cameraWorld);

    this.root.getWorldPosition(this._worldPosition);
    const worldX = this._worldPosition.x;
    const worldY = this._worldPosition.y;
    const worldZ = this._worldPosition.z;

    const cdx = this._cameraWorld.x - worldX;
    const cdy = this._cameraWorld.y - worldY;
    const cdz = this._cameraWorld.z - worldZ;
    const distanceSq = cdx * cdx + cdy * cdy + cdz * cdz;
    this._lastCameraDistance = Math.sqrt(distanceSq);
    if (!this._lodInitialized) {
      this._usingHighLod = distanceSq <= this._lodDistanceSq;
      this._lodInitialized = true;
    } else if (this._usingHighLod) {
      if (distanceSq > this._lodExitDistanceSq) this._usingHighLod = false;
    } else if (distanceSq < this._lodEnterDistanceSq) {
      this._usingHighLod = true;
    }
    const useHigh = this._usingHighLod;
    this.high.visible = useHigh;
    this.low.visible = !useHigh;
    this.outline.visible = useHigh && this._outlineEnabled;
    this.shadow.visible = this._shadowEnabled;

    const distanceCueStart = this._lodEnterDistance * 0.62;
    this._distanceCue = clamp01(
      (this._lastCameraDistance - distanceCueStart)
      / Math.max(0.001, this._lodExitDistance - distanceCueStart),
    );

    const dx = this._targetWorld.x - worldX;
    const dz = this._targetWorld.z - worldZ;
    if (dx * dx + dz * dz > 1e-8) {
      const desiredYaw = Math.atan2(dx, dz);
      if (!this._hasFacing) {
        this._facingYaw = desiredYaw;
        this._hasFacing = true;
      } else {
        let delta = desiredYaw - this._facingYaw;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        this._facingYaw += delta * (1 - Math.exp(-18 * step));
      }
      this._worldFacingQuaternion.setFromAxisAngle(this._up, this._facingYaw);
      if (this.root.parent) {
        this.root.parent.getWorldQuaternion(this._parentWorldQuaternion);
        this._inverseParentQuaternion.copy(this._parentWorldQuaternion).invert();
        this.root.quaternion.copy(this._inverseParentQuaternion).multiply(this._worldFacingQuaternion);
      } else {
        this.root.quaternion.copy(this._worldFacingQuaternion);
      }
    }

    const def = this.definition;
    if (!this._poseLocked) {
      this._phase += step * def.bobHz * Math.PI * 2 * (0.55 + this._speed01 * 0.45);
    }
    if (!state || state.gaitPhase === undefined || !Number.isFinite(state.gaitPhase)) this._motionPhase = this._phase;
    // Footfall. |cos| gives two events per stride, which was right, but the
    // body used to reach its HIGHEST point and its deepest squash on the same
    // beat — so it read as a wobbling jelly rather than weight arriving on a
    // leg. The plant is now the low point and the squash; mid-stride is the
    // high point and the stretch. That one phase relationship is most of what
    // separates walking from bobbing. The squash is also deep enough to see:
    // it used to be a little over two percent, which is nothing.
    const plant = Math.abs(Math.cos(this._motionPhase));   // 1 at footfall
    const airborne = 1 - plant;                            // 1 at mid-stride
    const heelStrike = Math.pow(plant, 8);                 // the jolt itself
    const gaitBob = (airborne - 0.45) * def.bodyBounce * 1.9 * this._motion
      - heelStrike * def.bodyBounce * 0.5 * this._motion;
    const bob = this._poseLocked
      ? 0
      : (state && state.bob !== undefined
        ? state.bob
        : Math.sin(this._phase) * def.bobAmount * (0.35 + this._motion * 0.65) + gaitBob);
    const centerY = def.groundOffset * this._scale + def.height * this._scale * 0.5;
    const gaitSway = Math.sin(this._motionPhase) * def.bodySway * this._motion;
    const squashDepth = def.bodyBounce * 0.9;
    const compression = (plant * 0.55 + heelStrike * 0.45) * this._motion * squashDepth
      - airborne * this._motion * squashDepth * 0.35;
    const attackCompression = this._attack * Math.min(0.035, def.attackKick * 0.24);
    const windupCrouch = this._windup * def.height * this._scale * 0.02;
    const windupWiden = this._windup * 0.032;
    const windupSquash = this._windup * 0.044;
    this.high.position.x = gaitSway;
    this.low.position.x = gaitSway;
    this.high.position.y = centerY + bob - windupCrouch;
    this.low.position.y = this.high.position.y;
    this.high.scale.set(
      1 + compression * 0.32 + attackCompression + windupWiden,
      1 - compression - attackCompression * 0.45 - windupSquash,
      1,
    );
    this.low.scale.set(
      this._lowBaseWidth * this.high.scale.x,
      this._lowBaseHeight * this.high.scale.y,
      1,
    );
    this.high.rotation.x = this._pitch;
    this.low.rotation.x = this._pitch;
    const visibleLean = this._lean + gaitSway * 0.62;
    this.high.rotation.z = visibleLean;
    this.low.rotation.z = visibleLean;
    if (!state || state.pulse === undefined) {
      this._pulse = 0.5 + Math.sin(this._age * 3.1 + this._phase * 0.13) * 0.5;
    }
  }

  debugAnimationSnapshot() {
    const texture = this.library.textures[this.type];
    return {
      type: this.type,
      quality: this._quality,
      motion: this._motion,
      windup: this._windup,
      windupTarget: this._targetWindup,
      attack: this._attack,
      attackTarget: this._targetAttack,
      frozen: this._frozen,
      poseLocked: this._poseLocked,
      phase: this._motionPhase,
      highVisible: this.high.visible,
      lowVisible: this.low.visible,
      distanceCue: this._distanceCue,
      lod: {
        initialized: this._lodInitialized,
        usingHigh: this._usingHighLod,
        cameraDistance: this._lastCameraDistance,
        baseDistance: this._lodDistance * this._lodScale,
        enterHighDistance: this._lodEnterDistance,
        exitHighDistance: this._lodExitDistance,
        hysteresis: LOD_HYSTERESIS,
      },
      sampler: {
        minFilter: texture.minFilter === THREE.LinearMipmapLinearFilter
          ? 'LinearMipmapLinearFilter'
          : texture.minFilter,
        magFilter: texture.magFilter === THREE.LinearFilter ? 'LinearFilter' : texture.magFilter,
        generateMipmaps: texture.generateMipmaps,
        anisotropy: texture.anisotropy,
      },
      position: [this.high.position.x, this.high.position.y, this.high.position.z],
      rotation: [this.high.rotation.x, this.high.rotation.y, this.high.rotation.z],
      scale: [this.high.scale.x, this.high.scale.y, this.high.scale.z],
      lowScale: [this.low.scale.x, this.low.scale.y, this.low.scale.z],
    };
  }

  dispose() {
    if (this._disposed) return;
    if (this.root.parent) this.root.parent.remove(this.root);
    this.main.onBeforeRender = null;
    this.outline.onBeforeRender = null;
    this.low.onBeforeRender = null;
    this.shadow.onBeforeRender = null;
    this.library._instances.delete(this);
    this._disposed = true;
  }
}
