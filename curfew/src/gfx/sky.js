// sky — the night the county sits under. Manifest #3.
//
// A camera-following BackSide dome plus one star layer, and the fog that ends the world.
//
// THE FOG LAW (FETCH director.js: fog colour EQUALS the background): the far distance must
// dissolve into the same value the sky's horizon band holds, so the world ends in a wall of
// dark instead of in a visible geometry horizon with sky above it. Here the background
// Color object is literally SHARED with FogExp2's colour and with the dome's horizon
// uniform, so the three can never drift apart in a later edit.
//
// The gradient is computed in the shader from THREE.Color uniforms rather than painted into
// a canvas texture (VIGIL cosmos.js:14-55 paints one). Two reasons, both about this game
// being dark: an 8-bit canvas holding near-black values quantises to two or three distinct
// levels and the sky bands in visible rings, and a canvas texture would have to be
// NoColorSpace per the project law, which would force us to author linear values into 8-bit
// bytes — the same banding, worse. Uniform Colors are converted sRGB->linear by three at
// full float precision.
//
// GLIDE's donors/forest/src/world/Sky.js STOPS table keyed to sun elevation is the shape of
// setPhase(); M0 hard-codes deep night and never advances it.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { TAU, clamp01, lerp } from '../engine/math.js';

const SKY_RADIUS = 620;      // inside CFG.render.far (900), outside any fog-visible range
const STAR_COUNT = 900;

// Night phases. t is 0..1 across the whole cycle; the clock (M1) drives it.
// Deep night is where M0 lives and every other stop is authored relative to it.
// ART.md 1.1 — THE SINGLE HIGHEST-LEVERAGE CHANGE IN THE DOCUMENT, landed 2026-09-02.
//
// The county's headline fault was a VALUE INVERSION: a tree silhouetted against open sky
// measured 3.5x LIGHTER than the sky it stood against. At night the sky IS the light and
// every silhouette in a night forest is read against it. The old table put deep-night
// zenith at 0x04060e, which measures luminance 2.1 on screen — below every trunk, every
// blade of grass and every stone in the county.
//
// Calibration measured on this build (open-sky differential mask, ART.md 1.1):
//   0x04060e -> 2.1    0x0c1220 -> 3.4    0x121a28 -> 15.9
//   0x1a2333 -> 26.6   0x222c3f -> 38.6
//
// Because scene.background, FogExp2.color and the dome's uHorizon are ONE shared Color
// (the fog law above), raising the horizon raises the fog with it: the far distance stops
// dissolving into black and the county finally has aerial perspective. That is ART.md 1.2
// arriving for free, and it is why 1.1 lands before anything else in section 1.
// THE SKY IS THE LIGHT IN A NIGHT FRAME, and this table was 1.65x too dark for the job.
//
// Measured with tools/lightsweep.mjs, which scores a whole lighting candidate in one boot
// because these numbers pull against each other and none can be judged alone. Open sky sat at
// p50 21.7 against ART.md 0.3 row 8's 26-34 for the horizon band — BELOW its own gate — while
// the band 48-127, where roundness and material live, held 5.3% of world pixels against a 12%
// target. The county was two clusters and nothing between them.
//
// The sweep also killed the obvious hypothesis. Raising the moon key and cutting the fill,
// which is how you would light a scene with a visible sun, made the form band WORSE at every
// step (5.3 -> 1.5 -> 3.8 -> 4.5%) and the forest darker, because a dense canopy blocks the
// directional moon almost entirely: the floor and the trunk shadow sides are lit by fill or
// they are lit by nothing. More fill, not less, is what a forest interior wants.
//
// Chosen row, of eighteen scored: hemi 6.8, ambient 1.55, sky x1.65.
//   form band  5.3% -> 36.0%   (gate >= 12)
//   near-black 15.4% -> 12.6%  (it got darker where it should be, not lighter everywhere)
//   open sky   21.7 -> 32.5    (gate 26-34)
//
// APPLIED AND RE-MEASURED: scaling the STOPS by 1.65 put open sky at 48, not the 32.5 the
// sweep predicted — the sweep scaled the DOME UNIFORMS live and setPhase rebuilds them from
// this table through the fog blend, so the lift compounded to 2.21x on screen. The table is
// therefore lifted 1.10x in total, not 1.65x. Predicting a number and applying it is not the
// same as applying it and measuring: measure after, every time.
//   sky:tree   1.92 -> 2.17    (gate >= 1.9 — a trunk must never exceed the sky)
//   frame max  135 -> 136      (gate <= 160)
const STOPS = [
  // t,    horizon,   mid,       zenith,    starOpacity, fogMul
  { t: 0.00, horizon: 0x51627b, mid: 0x3d4d69, zenith: 0x2d3a53, stars: 0.35, fogMul: 0.80 }, // dusk
  { t: 0.30, horizon: 0x404f65, mid: 0x303e57, zenith: 0x232e43, stars: 1.00, fogMul: 1.00 }, // deep night
  { t: 0.70, horizon: 0x323f53, mid: 0x233047, zenith: 0x182334, stars: 0.55, fogMul: 1.35 }, // the black hour
  { t: 1.00, horizon: 0x596d8b, mid: 0x435677, zenith: 0x313f62, stars: 0.30, fogMul: 0.90 }, // false dawn
];

// ART.md 1.2 — fog density 0.0075 -> 0.010.
// CFG.world.fog.density lives in the engine owner's file, so this local constant is the
// working value until the integrator applies the CONFIG CHANGE recorded in docs/HANDOFF.md.
// Once CFG.world.fog.density IS 0.010, delete this and read CFG again.
//
// Fog was nearly inert before 1.1 landed because the fog COLOUR was black: a density sweep
// moved the treeline band by 4 luminance points across a 5x range. With the horizon raised
// the fog is now the depth cue that carries the sky's value into the distance. It does NOT
// go past 0.012: EATEN PATH runs 0.055 but its whole world is 55 m deep, and CURFEW is
// 4 km wide with five horizon reads to protect (ART.md 4).
const FOG_DENSITY = 0.010;
const DEEP_NIGHT = 0.30;

// Module-level scratch. The hot path allocates nothing.
const _a = new THREE.Color();
const _b = new THREE.Color();

export class Sky {
  static id = 'sky';

  constructor(ctx) {
    this.ctx = ctx;
    this.root = null;
    this.dome = null;
    this.stars = null;
    this.phase = DEEP_NIGHT;
    // ONE Color, shared by scene.background, scene.fog.color and the dome's horizon
    // uniform. Sharing is the enforcement of the fog law above.
    this.horizon = new THREE.Color(0x313c4d);
    this._t = 0;
  }

  async init() {
    const scene = this.ctx.scene;
    if (!scene) throw new Error('sky: ctx.scene missing (gfx must be manifest #1)');
    this.scene = scene;

    const root = new THREE.Group();
    root.name = 'sky';
    root.frustumCulled = false;
    this.root = root;

    /* ---- the dome ---------------------------------------------------------- */
    const domeMat = new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: this.horizon },
        uMid: { value: new THREE.Color(0x242f42) },
        uZenith: { value: new THREE.Color(0x1a2333) },
        uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
        uMoonGlow: { value: 0.18 },
      },
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vDir;
        uniform vec3 uHorizon, uMid, uZenith, uMoonDir;
        uniform float uMoonGlow;
        void main() {
          float up = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          // Two-segment ramp. The horizon band is deliberately WIDE and slow: a tight
          // ramp puts a hard line where the terrain silhouette meets the sky and the
          // county stops reading as one space.
          float k = smoothstep(0.46, 0.62, up);
          vec3 col = mix(mix(uHorizon, uMid, smoothstep(0.40, 0.55, up)), uZenith, k);
          // A soft lobe around the moon so the sky has a direction. No disc: the moon
          // itself is a light, not a sprite, and a bright disc under bloom becomes a
          // second sun.
          float lobe = max(0.0, dot(normalize(vDir), normalize(uMoonDir)));
          col += vec3(0.09, 0.11, 0.15) * uMoonGlow * pow(lobe, 6.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,     // drawn first at renderOrder -1000, everything paints over it
      fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 20), domeMat);
    dome.renderOrder = -1000;
    dome.frustumCulled = false;
    this.dome = dome;
    root.add(dome);

    /* ---- one star layer ---------------------------------------------------- */
    // One layer, not VIGIL's three: three counter-rotating layers is a planetarium, and
    // this is a county sky seen through haze. One program instead of three.
    const rng = this.ctx.rng.fork('sky.stars');
    const pos = new Float32Array(STAR_COUNT * 3);
    const col = new Float32Array(STAR_COUNT * 3);
    const attr = new Float32Array(STAR_COUNT * 2);   // size, twinkle phase
    const warm = new THREE.Color(0xffe7c4), cold = new THREE.Color(0xcfe0ff);
    for (let i = 0; i < STAR_COUNT; i++) {
      // biased above the horizon; stars below it are never seen and cost the same
      const theta = rng.next() * TAU;
      const phi = Math.acos(1 - 1.35 * rng.next());
      const r = SKY_RADIUS * 0.94;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.92 + 8;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      _a.copy(cold).lerp(warm, rng.next() * rng.next());
      const b = 0.55 + rng.next() * 0.40;
      col[i * 3] = _a.r * b; col[i * 3 + 1] = _a.g * b; col[i * 3 + 2] = _a.b * b;
      // pow(rand, 5) — a handful of bright ones, a haze of faint ones [vigil cosmos.js:77]
      attr[i * 2] = 0.80 + Math.pow(rng.next(), 5) * 2.0;
      attr[i * 2 + 1] = rng.next() * TAU;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aStar', new THREE.BufferAttribute(attr, 2));
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
      vertexShader: /* glsl */`
        attribute vec2 aStar;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        void main() {
          vColor = color;
          vTwinkle = 0.86 + 0.14 * sin(uTime * 0.7 + aStar.y);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aStar.x, 0.7, 3.4);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uOpacity;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float r = length(p) * 2.0;
          float core = 1.0 - smoothstep(0.0, 0.62, r);
          float halo = pow(max(0.0, 1.0 - r), 3.0) * 0.30;
          float a = min((core + halo) * uOpacity * vTwinkle, 0.85);
          if (a < 0.004) discard;
          // capped so ACES + bloom can never turn the star field into a white haze
          gl_FragColor = vec4(min(vColor, vec3(0.9)) * a, a);
        }`,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const stars = new THREE.Points(geo, starMat);
    stars.renderOrder = -990;
    stars.frustumCulled = false;
    this.stars = stars;
    root.add(stars);

    scene.add(root);

    /* ---- background and fog, sharing one Color ----------------------------- */
    scene.background = this.horizon;
    scene.fog = new THREE.FogExp2(this.horizon, FOG_DENSITY);

    this.setPhase(DEEP_NIGHT);   // M0 is deep night and stays there
  }

  /**
   * M1's clock drives this. t is 0..1 across the night: 0 dusk, 0.30 deep night,
   * 0.70 the black hour, 1 false dawn. M0 never calls it after init.
   */
  setPhase(t) {
    const p = clamp01(t);
    this.phase = p;
    let i = 0;
    while (i < STOPS.length - 2 && STOPS[i + 1].t < p) i++;
    const s0 = STOPS[i], s1 = STOPS[i + 1];
    const k = clamp01((p - s0.t) / Math.max(1e-6, s1.t - s0.t));

    const u = this.dome.material.uniforms;
    _a.set(s0.horizon); _b.set(s1.horizon);
    this.horizon.copy(_a).lerp(_b, k);        // background + fog + dome horizon, one object
    _a.set(s0.mid); _b.set(s1.mid);
    u.uMid.value.copy(_a).lerp(_b, k);
    _a.set(s0.zenith); _b.set(s1.zenith);
    u.uZenith.value.copy(_a).lerp(_b, k);

    this.stars.material.uniforms.uOpacity.value = lerp(s0.stars, s1.stars, k);
    if (this.scene.fog) {
      this.scene.fog.density = FOG_DENSITY * lerp(s0.fogMul, s1.fogMul, k);
    }
  }

  /** Escape hatch for the M1 speed-keyed fog (CFG.world.fog.farWalk/farDrive). */
  setFogDensity(d) { if (this.scene.fog) this.scene.fog.density = d; }

  step(dt) {
    this._t += dt;
  }

  present(alpha) {
    const camera = this.ctx.camera;
    if (!camera) return;
    // The sky is infinitely distant: it rides the camera so it can never be approached.
    this.root.position.copy(camera.position);
    this.stars.material.uniforms.uTime.value = this._t;
    // Point the dome's glow lobe at the moon, read lazily — lights is manifest #2 but we
    // still never capture it at construction.
    const lights = this.ctx.systems && this.ctx.systems.get('lights');
    if (lights && lights.moon) {
      const u = this.dome.material.uniforms.uMoonDir.value;
      u.copy(lights.moon.position).sub(lights.moon.target.position).normalize();
    }
  }

  ready() { return !!(this.root && this.scene && this.scene.fog && this.scene.background === this.horizon); }

  dispose() {
    if (this.root) this.root.removeFromParent();
    if (this.dome) { this.dome.geometry.dispose(); this.dome.material.dispose(); }
    if (this.stars) { this.stars.geometry.dispose(); this.stars.material.dispose(); }
  }
}

export default Sky;
