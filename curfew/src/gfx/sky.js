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
//
// ---------------------------------------------------------------------------
// ROUND 7, LANE E — THE NIGHT.
//
// Alex's brief asks for a "Gigantic BEAUTIFUL Gameworld" and for "something interesting the
// player is going towards in the distance they want to see". Before this round the sky was
// ONE flat wash with 900 evenly scattered points on it. Measured, frame A: open sky owned
// 3.9% of the frame at p50 33.4, and every pixel of it was within 6 luminance points of
// every other. There was no horizon in this game at all.
//
// A night sky is not a colour. It has five things in it, and this file now draws all five
// INSIDE THE ONE DOME PROGRAM THAT WAS ALREADY BEING PAID FOR — no new draw call, no new
// light, no new program for any of the four sky items:
//
//  1. THE MOON AS A THING YOU CAN SEE. It has always been a light — lights.js's single
//     shadow caster — and it has never been a disc. Now: a gibbous disc with limb
//     darkening, maria mottling and a two-stage halo, at MOON_ANG_R radians. That is about
//     4x the real moon, which is what every game does; the real thing is nine pixels across
//     at this FOV and reads as a dead pixel, which is exactly ART.md 4.1's complaint about
//     the Cathedral at 2 km. It is occluded by the cloud deck, which is the cheapest
//     weather tell there is.
//  2. CLOUD THAT MOVES. Four-octave fbm on a PROJECTED CLOUD PLANE (vDir.xz / vDir.y), so
//     the deck crowds toward the horizon the way a real overcast does, drifting on uTime.
//     A moonlit cloud is PALER than the sky behind it and a cloud away from the moon is
//     darker than it, so the deck is where the top of the frame finally gets mid-tones.
//  3. A RIDGE LINE ON EVERY BEARING. Two fbm profiles sampled ON THE UNIT CIRCLE (so there
//     is no seam at the azimuth wrap) painted as silhouettes just above the true horizon: a
//     pale far range and a darker near one that crosses it. This is the direct answer to
//     "something interesting in the distance, always" — it is there from every point in the
//     county, it costs nothing, and the fog wall at ~300 m stands in front of it so it reads
//     as land BEYOND the county rather than as a painted backdrop.
//  4. A MILKY WAY. Uniform-on-the-sphere is the one distribution a real sky never has. 44%
//     of the stars are now drawn into a band on a tilted great circle, the rest carry a
//     density weighting, and the dome paints a faint mottled glow along the same band.
//  5. MIST IN THE HOLLOWS. Two camera-following horizontal sheets with scrolling fbm,
//     DEPTH-TESTED so the terrain and the trunks occlude them, riding a slowly damped ground
//     height. The lag is the whole effect: walk up out of a hollow and the sheet stays down
//     there for a couple of seconds while you look across the top of it. This is the one new
//     program the lane adds, and it is also "the moon actually reaching through it" — the
//     sheet brightens toward the moon bearing.
//
// The gradient ramp was re-keyed at the same time. It used to place the uHorizon STOP below
// the horizon line, where nothing can ever see it, and put an unplanned blend of horizon and
// mid at the place a player actually looks. The ramp now lands uHorizon AT vDir.y = 0, which
// is what the STOPS table was always authored to mean.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { TAU, clamp01, lerp, damp } from '../engine/math.js';

const SKY_RADIUS = 620;      // inside CFG.render.far (900), outside any fog-visible range
const STAR_COUNT = 1500;     // ROUND 7 lane E: was 900. One Points draw either way.

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
  { t: 0.00, horizon: 0x465873, mid: 0x34445f, zenith: 0x26344d, stars: 0.25, fogMul: 0.78 }, // last dusk
  { t: 0.30, horizon: 0x29374d, mid: 0x1b283b, zenith: 0x111b2b, stars: 1.00, fogMul: 1.00 }, // deep night
  { t: 0.70, horizon: 0x172235, mid: 0x0d1725, zenith: 0x070e19, stars: 0.45, fogMul: 1.28 }, // the black hour
  { t: 1.00, horizon: 0x3a4e6c, mid: 0x293b58, zenith: 0x1c2b45, stars: 0.24, fogMul: 0.88 }, // false dawn
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

/* ---- ROUND 7 lane E constants ---------------------------------------------
 * MOON_ANG_R: the disc's angular RADIUS in radians. The real moon is 0.0047 rad, which at
 * CFG.render.fov 68 over a 675-row buffer is a nine-pixel dot — measured, not guessed, and
 * it is the same failure ART.md 4.1 records for the Cathedral of Unlight at 2 km ("a static
 * two-pixel-wide line is not something interesting in the distance. It is a dead pixel").
 * 0.030 rad puts the disc at ~17 px radius, ~900 px of frame, i.e. 0.11% — inside ART.md's
 * row 12 allowance for glows (<= 1.5% of the frame) with an order of magnitude to spare,
 * and it is unmistakably a moon.
 *
 * MOON_PEAK is linear radiance at the centre of the disc BEFORE ACES. Above
 * CFG.render.bloom.threshold (1.05) on purpose and it is the only thing in the county
 * authored to be: a moon that does not bloom is a paper cut-out. ART.md H.4 gate 10 says
 * "frame max, torch off <= 160"; a visible moon breaks that gate by design and the proposed
 * ART edit is written out in docs/ROUND-7/HANDOFF-E.md — the moon is the one object allowed
 * above it, capped by AREA rather than by value.
 */
const MOON_ANG_R = 0.036;
const MOON_PEAK = 2.60;
// WAXING GIBBOUS. The sign matters and the first pass had it inverted: the terminator test
// is (u + phase * sqrt(1 - v*v)) > 0, so a NEGATIVE phase lights only u > 0.42, which is a
// thin crescent, and at a 17 px disc that crescent is invisible. Positive lights everything
// outside u < -0.42 — about 71% of the face, which is a gibbous moon.
const MOON_PHASE = 0.42;
const MOON_DISC_COL = 0xe6eefb;

// The galactic band. A tilted great circle: the axis is its POLE, so the band is every
// direction perpendicular to this. Chosen to cross the sky diagonally from the default
// spawn heading rather than to sit level, because a level band reads as a rendering seam.
const BAND_AXIS = new THREE.Vector3(0.46, 0.38, -0.80).normalize();

/* MIST. Two flat sheets at an INVERSION ALTITUDE.
 *
 * THE FIRST VERSION OF THIS RODE THE GROUND UNDER THE CAMERA WITH A LONG LAG AND IT WAS
 * WRONG, and the picture said so before any number did: tests/shots/E-moon.png, first pass,
 * is a pale wall across the entire frame with the moon, the cloud and the stars all behind
 * it. A single horizontal plane cannot follow terrain. Chasing the ground with a lag put the
 * sheet 20 m OVER THE CAMERA'S HEAD on a descent, and a plane above your eye is not mist,
 * it is a ceiling.
 *
 * The physics is the fix and it is also cheaper. Valley fog has a FLAT TOP at a fixed
 * altitude — that is what an inversion layer is, and it is exactly why fog collects in
 * hollows and not on ridges. So the sheet sits at (the lowest ground within MIST_RING metres)
 * + MIST_DEPTH, and two clamps keep it honest:
 *   - it may never be more than MIST_HEAD metres above the ground under YOUR feet, so
 *     standing in the bottom of a hollow you are knee-deep in it rather than inside it;
 *   - present() then hard-clamps it below the camera's own eye, so it is never a ceiling
 *     under any circumstance, including a lift, a roof, a tower platform or a car.
 * From a rise you look DOWN on a sea of fog lying in the valley, which is the shot this
 * whole item exists for, and the terrain occludes the sheet everywhere it rises through it.
 *
 * MIST_LAG is the damping RATE in 1/s (engine/math.js damp is 1 - exp(-lambda*dt), so lambda
 * is a rate and NOT a time constant; getting that backwards makes the sheet snap and the
 * effect disappears). 1.5/s is a ~0.7 s settle, which is only there to stop the altitude
 * popping as the ring finds a new low — the beauty is in the altitude, not in the lag. */
const MIST_R = 190;              // sheet radius, m. uFar below fades it out well inside this
const MIST_LAG = 1.5;
const MIST_RING = 58;            // m: the radius the local valley floor is searched over
const MIST_DEPTH = 3.4;          // m: how deep the fog lies over that floor
const MIST_HEAD = 1.05;          // m: it may never be more than this above your own ground
const MIST_LAYERS = [
  { yOff: 0.00, aMax: 0.42, scale: 0.0165, drift: [0.85, 0.30], far: 150 },
  { yOff: 1.35, aMax: 0.24, scale: 0.0088, drift: [-0.42, 0.62], far: 175 },
];

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
    this.mist = null;
    this.mistGeo = null;
    this._mistYPrev = null;
    this._mistYCurr = null;
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
        // ROUND 7 lane E
        uTime: { value: 0 },
        uMoonCol: { value: new THREE.Color(MOON_DISC_COL) },
        uMoonR: { value: MOON_ANG_R },
        uMoonPeak: { value: MOON_PEAK },
        uMoonPhase: { value: MOON_PHASE },
        uCloud: { value: 1.0 },      // 0 clears the deck; the clock may drive it later
        uRidge: { value: 1.0 },
        uBand: { value: 0.055 },
        uBandAxis: { value: BAND_AXIS.clone() },
      },
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      // GLSL LAWS HONOURED HERE: no backtick anywhere inside this literal, not even in a
      // comment (it closes the JS string and the page dies with a lineless error naming no
      // file), and no identifier called flat, half or sat.
      fragmentShader: /* glsl */`
        varying vec3 vDir;
        uniform vec3 uHorizon, uMid, uZenith, uMoonDir, uMoonCol, uBandAxis;
        uniform float uMoonGlow, uTime, uMoonR, uMoonPeak, uMoonPhase;
        uniform float uCloud, uRidge, uBand;

        float h21(vec2 p) {
          p = fract(p * vec2(127.31, 311.77));
          p += dot(p, p + 41.53);
          return fract(p.x * p.y);
        }
        float vn2(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = h21(i), b = h21(i + vec2(1.0, 0.0));
          float c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm3(vec2 p) {
          float s = 0.0, a = 0.56;
          for (int i = 0; i < 3; i++) { s += a * vn2(p); p = p * 2.07 + 17.3; a *= 0.5; }
          return s;
        }
        float fbm4(vec2 p) {
          float s = 0.0, a = 0.53;
          for (int i = 0; i < 4; i++) { s += a * vn2(p); p = p * 2.03 + 11.7; a *= 0.5; }
          return s;
        }

        void main() {
          vec3 d = normalize(vDir);
          float e = d.y;                                  // elevation, -1..1
          float up = clamp(e * 0.5 + 0.5, 0.0, 1.0);

          // Two-segment ramp, RE-KEYED so uHorizon lands at e = 0 rather than below it.
          // The band is still deliberately wide and slow: a tight ramp puts a hard line
          // where the terrain silhouette meets the sky and the county stops reading as one
          // space.
          vec3 col = mix(uHorizon, uMid, smoothstep(0.500, 0.618, up));
          col = mix(col, uZenith, smoothstep(0.566, 0.880, up));

          vec3 md = normalize(uMoonDir);
          float ml = max(0.0, dot(d, md));

          // A dome drawn at depthTest false has no early-z, so every pixel of the lower
          // hemisphere would otherwise pay for weather it can never show. This branch is
          // screen-coherent (it is a horizontal line across the frame) and costs nothing.
          if (e > -0.09) {
            vec2 circ = normalize(vec2(d.x, d.z) + vec2(1e-5, 0.0));

            /* ---- THE CLOUD DECK ------------------------------------------------
             * Projected onto a plane: xz / (y + k) crowds the deck toward the horizon
             * exactly the way a real overcast does, and the +k keeps the projection from
             * exploding to infinity along the horizon line. */
            vec2 cp = vec2(d.x, d.z) / max(0.105, e + 0.105);
            float cd = fbm4(cp * 3.4 + vec2(uTime * 0.0075, uTime * 0.0034));
            // fbm4's amplitudes sum to 0.994, so cd is already 0..1 with a mean near 0.5 —
            // which is why the threshold band straddles 0.5 instead of sitting above it. A
            // band authored at 0.435-0.815 (the first pass) showed 2% coverage: measured on
            // screen the sky came back completely flat, and that is the arithmetic of it.
            float cov = smoothstep(0.455, 0.720, cd) * uCloud;
            cov *= smoothstep(0.005, 0.105, e);           // into the haze at the horizon
            // A moonlit cloud is paler than the sky; one away from the moon is darker.
            //
            // MEASURED, and the first pass had this badly wrong: at cloudLit uMoonCol * 0.26
            // and a coverage band of 0.395-0.665 the deck owned about 70% of the sky at a
            // band mean of 74 against ART.md 0.3 row 8's 26-34, and tests/shots/E-moon.png
            // read as an overcast AFTERNOON. A cloud at night is barely brighter than the sky
            // it hides; the pale only arrives within a few degrees of the moon itself.
            vec3 cloudDark = mix(uZenith, uHorizon, 0.25) * 0.66;
            vec3 cloudLit = uMoonCol * 0.155;
            vec3 cloudCol = mix(cloudDark, cloudLit, pow(ml, 2.2));
            // the silver lining: the thin edge of a bank in front of the moon
            cloudCol += uMoonCol * 0.17 * pow(ml, 9.0) * smoothstep(0.60, 0.44, cd);

            /* ---- THE MILKY WAY -------------------------------------------------
             * uBandAxis is the POLE of the band, so the band is every direction
             * perpendicular to it. Occluded by the deck, like everything else up there. */
            float gd = abs(dot(d, normalize(uBandAxis)));
            float band = 1.0 - smoothstep(0.03, 0.31, gd);
            float mott = fbm3(vec2(d.x + d.y * 0.7, d.z - d.y * 0.4) * 3.4);
            col += uMoonCol * uBand * band * (0.30 + 0.70 * mott)
                 * smoothstep(-0.02, 0.26, e) * (1.0 - cov * 0.9);

            /* ---- THE MOON -------------------------------------------------------
             * A disc, not a sprite: no geometry, no second draw, no texture. */
            if (ml > 0.9) {
              float ang = acos(clamp(ml, -1.0, 1.0));
              float rr = ang / uMoonR;
              float disc = 1.0 - smoothstep(0.965, 1.015, rr);
              if (disc > 0.0) {
                vec3 mu = normalize(cross(md, vec3(0.0, 1.0, 0.0)));
                vec3 mv = cross(mu, md);
                float u = dot(d, mu) / uMoonR;
                float v = dot(d, mv) / uMoonR;
                float term = smoothstep(-0.09, 0.13,
                                        u + uMoonPhase * sqrt(max(0.0, 1.0 - v * v)));
                float limb = 0.70 + 0.30 * sqrt(max(0.0, 1.0 - min(1.0, rr * rr)));
                float maria = 0.84 + 0.16 * fbm3(vec2(u, v) * 2.7 + 4.0);
                float seas = mix(1.0, 0.76, smoothstep(0.46, 0.63, vn2(vec2(u, v) * 1.3 + 9.0)));
                vec3 moon = uMoonCol * (uMoonPeak * limb * maria * seas);
                col = mix(col, moon, disc * term * (1.0 - cov * 0.85));
              }
            }
            // Two-stage halo: a tight ring that reads as glare on the eye, and a wide one
            // that is the moon lighting the haze it sits in.
            float halo = pow(ml, 700.0) * 0.42 + pow(ml, 60.0) * 0.055;
            col += uMoonCol * halo * uMoonGlow * 3.4 * (1.0 - cov * 0.75);

            // the deck goes on LAST so it can hide the moon, the band and the halo
            col = mix(col, cloudCol, cov);

            /* ---- THE RIDGE LINES ------------------------------------------------
             * Sampled on the unit circle, so the profile is seamless where azimuth wraps.
             * The far range is painted first and the near one crosses it. */
            float base = smoothstep(-0.070, -0.018, e) * uRidge;
            if (base > 0.0) {
              float rFar = vn2(circ * 2.6) * 0.60 + vn2(circ * 6.1 + 21.0) * 0.27
                         + vn2(circ * 13.4 + 53.0) * 0.13;
              float rNear = vn2(circ * 1.7 + 71.0) * 0.64 + vn2(circ * 4.3 + 97.0) * 0.25
                          + vn2(circ * 9.9 + 131.0) * 0.11;
              float crestF = 0.022 + rFar * 0.082;
              float crestN = 0.006 + rNear * 0.049;
              float kF = (1.0 - smoothstep(crestF - 0.0060, crestF + 0.0035, e)) * base;
              float kN = (1.0 - smoothstep(crestN - 0.0050, crestN + 0.0030, e)) * base;
              col = mix(col, mix(uHorizon, uZenith, 0.30) * 0.70, kF * 0.86);
              col = mix(col, mix(uHorizon, uZenith, 0.55) * 0.40, kN * 0.90);
            }
          }

          // The original wide directional lobe. It is what gives the whole dome a bearing
          // even when the moon itself is behind the canopy.
          col += vec3(0.09, 0.11, 0.15) * uMoonGlow * pow(ml, 6.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      // ROUND 7 lane E — THE DOME IS DRAWN LAST AMONG THE OPAQUES, NOT FIRST.
      //
      // It used to be depthTest false at renderOrder -1000: drawn before everything, with
      // the whole world painting over it. That is correct output and it is the most
      // expensive possible schedule, because it means EVERY PIXEL OF THE FRAME runs the sky
      // fragment shader whether or not a tree is going to cover it. With a flat two-mix
      // gradient that cost nothing. With cloud, ridge, band and moon on it, it cost the
      // frame: measured, tests/perf.mjs went 8.5-9.0 ms median on master to 12.70 ms.
      //
      // depthTest true plus renderOrder 900 puts it at the END of the opaque list, where
      // early-z rejects every pixel the forest already owns — 60-90% of a CURFEW frame.
      // depthWrite stays false so it can never occlude anything itself, and the sphere sits
      // at SKY_RADIUS 620 against CFG.render.far 900, so the only geometry it can hide is
      // terrain past 620 m, which FogExp2 at 0.010 has already taken to exactly the dome's
      // own horizon colour (1 - exp(-6.2^2) = 1.000). The fog law is what makes this safe.
      depthTest: true,
      fog: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 20), domeMat);
    dome.renderOrder = 900;      // last in the OPAQUE list — see depthTest above
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
    // ROUND 7 lane E — THE ONE DISTRIBUTION A REAL SKY NEVER HAS IS THE UNIFORM ONE.
    // BAND_FRAC of the stars are drawn into the galactic band instead: an orthonormal basis
    // (bu, bv) is built on the plane whose pole is BAND_AXIS, a star takes a uniform angle
    // around that circle and a near-Gaussian offset toward the pole (sum of three uniforms,
    // which is the cheap CLT trick and needs no log/cos pair). The rest keep the old
    // above-the-horizon bias, weighted once more by a value-noise density field so the open
    // sky has thin patches and crowded ones instead of an even sprinkle.
    const BAND_FRAC = 0.44;
    const bu = new THREE.Vector3();
    const bv = new THREE.Vector3();
    bu.set(0, 1, 0).cross(BAND_AXIS).normalize();
    bv.copy(BAND_AXIS).cross(bu).normalize();
    const r = SKY_RADIUS * 0.94;
    for (let i = 0; i < STAR_COUNT; i++) {
      let x, y, z, gain = 1;
      if (rng.next() < BAND_FRAC) {
        const a = rng.next() * TAU;
        const off = (rng.next() + rng.next() + rng.next() - 1.5) * 0.20;
        x = bu.x * Math.cos(a) + bv.x * Math.sin(a) + BAND_AXIS.x * off;
        y = bu.y * Math.cos(a) + bv.y * Math.sin(a) + BAND_AXIS.y * off;
        z = bu.z * Math.cos(a) + bv.z * Math.sin(a) + BAND_AXIS.z * off;
        const inv = 1 / Math.max(1e-4, Math.hypot(x, y, z));
        x *= inv; y *= inv; z *= inv;
        gain = 0.82;                     // band stars are the faint haze, not the bright ones
      } else {
        const theta = rng.next() * TAU;
        const phi = Math.acos(1 - 1.35 * rng.next());
        x = Math.sin(phi) * Math.cos(theta);
        y = Math.abs(Math.cos(phi)) * 0.92;
        z = Math.sin(phi) * Math.sin(theta);
        // density field: two coarse cells of value noise, so the open sky is patchy
        const dn = 0.55 + 0.45 * (
          0.5 + 0.5 * Math.sin(x * 5.1 + z * 3.7) * Math.cos(y * 4.3 - x * 2.9));
        gain = dn;
      }
      pos[i * 3] = r * x;
      pos[i * 3 + 1] = r * Math.abs(y) + 8;   // below the horizon is never seen and costs the same
      pos[i * 3 + 2] = r * z;
      _a.copy(cold).lerp(warm, rng.next() * rng.next());
      const b = (0.50 + rng.next() * 0.42) * gain;
      col[i * 3] = _a.r * b; col[i * 3 + 1] = _a.g * b; col[i * 3 + 2] = _a.b * b;
      // pow(rand, 5) — a handful of bright ones, a haze of faint ones [vigil cosmos.js:77]
      attr[i * 2] = 0.72 + Math.pow(rng.next(), 5) * 2.2;
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
      // depthTest true now that the dome is drawn last among the opaques. Stars are
      // transparent, so three draws them after every opaque including the dome; the depth
      // test is against the WORLD's depth, which means a trunk occludes a star instead of a
      // star burning through a tree. That was already the outcome (geometry painted over
      // them) and it is now the mechanism.
      depthTest: true,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const stars = new THREE.Points(geo, starMat);
    stars.renderOrder = -990;
    stars.frustumCulled = false;
    this.stars = stars;
    root.add(stars);

    scene.add(root);

    this._buildMist(scene);

    /* ---- background and fog, sharing one Color ----------------------------- */
    scene.background = this.horizon;
    scene.fog = new THREE.FogExp2(this.horizon, FOG_DENSITY);

    this.setPhase(DEEP_NIGHT);   // M0 is deep night and stays there
  }

  /* ------------------------------------------------------------------ mist -- */
  /**
   * ROUND 7 lane E — MIST IN THE HOLLOWS. Fog is the cheapest beauty in a forest game, and
   * FogExp2 alone cannot do this one: it is uniform in height, so it can separate a near
   * trunk from a far one and it can never put a sheet of white in the bottom of a valley.
   *
   * Two horizontal sheets, two triangles each, added to the SCENE rather than to this
   * system's camera-following root — because the root carries the camera's Y and the whole
   * point is that these do not. They follow in X and Z and ride their own damped height.
   *
   * DEPTH TEST IS ON. That is what makes this read as geography instead of as a filter: a
   * rise in the terrain, a trunk, a wall, a car all occlude the sheet, so the mist is
   * genuinely BEHIND things and genuinely absent where the ground is above it.
   *
   * ONE PROGRAM FOR BOTH. The second material is a clone, and three's program cache keys on
   * the shader source, so a clone links nothing new. Measured with tools/programs.mjs.
   */
  _buildMist(scene) {
    const geo = new THREE.PlaneGeometry(MIST_R * 2, MIST_R * 2, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.mistGeo = geo;

    const base = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
        // shares the sky's ONE horizon Color, so the mist can never drift away from the
        // fog and the background it is meant to be made of (the fog law, one level down)
        uCol: { value: this.horizon },
        uMoonCol: { value: new THREE.Color(MOON_DISC_COL) },
        uAmt: { value: MIST_LAYERS[0].aMax },
        uScale: { value: MIST_LAYERS[0].scale },
        uDrift: { value: new THREE.Vector2(MIST_LAYERS[0].drift[0], MIST_LAYERS[0].drift[1]) },
        uFar: { value: MIST_LAYERS[0].far },
        uNear: { value: 7.0 },
      },
      vertexShader: /* glsl */`
        varying vec3 vW;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vW;
        uniform vec3 uCam, uMoonDir, uCol, uMoonCol;
        uniform vec2 uDrift;
        uniform float uTime, uAmt, uScale, uFar, uNear;

        float h21(vec2 p) {
          p = fract(p * vec2(127.31, 311.77));
          p += dot(p, p + 41.53);
          return fract(p.x * p.y);
        }
        float vn2(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = h21(i), b = h21(i + vec2(1.0, 0.0));
          float c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec3 rel = vW - uCam;
          float dist = length(rel);
          if (dist > uFar) discard;

          // banks, not a sheet: one coarse octave decides WHERE there is mist at all and a
          // finer one gives its edge a shape. Two noise reads, not four — this shader runs
          // over a large part of the lower frame and Alex plays on a phone.
          vec2 p = vW.xz * uScale + uDrift * uTime * 0.010;
          float bank = vn2(p * 0.34 - uDrift * uTime * 0.0035);
          float grain = vn2(p * 1.9);
          float dens = smoothstep(0.34, 0.74, bank * 0.78 + grain * 0.40);

          float a = dens * uAmt;
          // never white out the lens: the sheet dissolves as it comes up to eye height
          a *= smoothstep(0.14, 1.05, abs(uCam.y - vW.y));
          a *= smoothstep(uNear * 0.30, uNear, dist);
          // THE FAR END IS AN EXPONENTIAL, NOT A RING. A smoothstep fade put a hard
          // horizontal seam right along the ground horizon in tests/shots/forest.png: on
          // flat ground the sheet's far ring projects to one screen row and reads as a
          // ruled line. This curve is FogExp2's own shape at the scene's own density, so
          // the sheet dissolves into the fog it is made of at exactly the rate the fog
          // takes over — the material is fog:false, so it has to carry that itself.
          a *= exp(-(dist * 0.0085) * (dist * 0.0085));
          if (a < 0.004) discard;

          // AND THE MOON REACHES THROUGH IT. Looking toward the moon the bank is lit from
          // behind and goes pale; looking away it is the same value as the fog it belongs to.
          float ml = max(0.0, dot(rel / max(dist, 1e-3), normalize(uMoonDir)));
          vec3 col = mix(uCol * 0.86, uMoonCol * 0.60, pow(ml, 3.0) * 0.75);
          gl_FragColor = vec4(col, a);
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      fog: false,
    });

    this.mist = [];
    for (let i = 0; i < MIST_LAYERS.length; i++) {
      const L = MIST_LAYERS[i];
      const mat = i === 0 ? base : base.clone();
      if (i > 0) {
        // a clone gets fresh uniform objects; the shared horizon Color must be re-shared
        mat.uniforms.uCol.value = this.horizon;
        mat.uniforms.uAmt.value = L.aMax;
        mat.uniforms.uScale.value = L.scale;
        mat.uniforms.uDrift.value.set(L.drift[0], L.drift[1]);
        mat.uniforms.uFar.value = L.far;
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'mist' + i;
      mesh.renderOrder = 12;        // after the opaque world, before the fx overlays
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = true;
      mesh.position.set(0, -1000, 0);
      scene.add(mesh);
      this.mist.push({ mesh, mat, yOff: L.yOff });
    }
    // The damped ground height the sheets ride. prev/curr because it is a VISIBLE transform
    // and the CONTRACT's loop law has no exceptions: simulate in step, present in present.
    this._mistYPrev = null;
    this._mistYCurr = null;
  }

  /** 0 clears the mist entirely; the governor and the interior lanes may want that door. */
  setMistScale(k) {
    if (!this.mist) return;
    for (let i = 0; i < this.mist.length; i++) {
      this.mist[i].mat.uniforms.uAmt.value = MIST_LAYERS[i].aMax * Math.max(0, k);
    }
  }

  /** Weather knobs, for the clock or a test. Both are 0..1 multipliers on what is authored. */
  setCloud(k) { if (this.dome) this.dome.material.uniforms.uCloud.value = Math.max(0, k); }
  setRidge(k) { if (this.dome) this.dome.material.uniforms.uRidge.value = Math.max(0, k); }

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

    // THE MIST'S HEIGHT IS SIMULATED HERE, NOT IN present(). It is a visible transform and
    // the CONTRACT's loop law has no exceptions; present() only lerps prev -> curr.
    //
    // The damping is the whole effect. terrain.heightAt() is the county's ONE ground truth
    // (nothing raycasts the mesh) and it is read lazily, at use, never captured — terrain is
    // manifest #4 and we are #3, so it does not exist while we are being constructed.
    if (!this.mist) return;
    const camera = this.ctx.camera;
    const terrain = this.ctx.systems && this.ctx.systems.get('terrain');
    if (!camera || !terrain || typeof terrain.heightAt !== 'function') return;
    const cx = camera.position.x, cz = camera.position.z;
    const g = terrain.heightAt(cx, cz);
    if (!isFinite(g)) return;
    // The local valley floor: eight probes on a ring plus the centre. Nine heightAt calls a
    // step, against the hundreds the collision sweep already makes — this is not the hot
    // path's problem. The ring angles are fixed, so the result is deterministic and a test
    // can assert it.
    let low = g;
    for (let i = 0; i < 8; i++) {
      const a = i * (TAU / 8);
      const h = terrain.heightAt(cx + Math.cos(a) * MIST_RING, cz + Math.sin(a) * MIST_RING);
      if (isFinite(h) && h < low) low = h;
    }
    const target = Math.min(low + MIST_DEPTH, g + MIST_HEAD);
    if (this._mistYCurr === null) { this._mistYCurr = target; this._mistYPrev = target; }
    this._mistYPrev = this._mistYCurr;
    this._mistYCurr = damp(this._mistYCurr, target, MIST_LAG, dt);
  }

  present(alpha) {
    const camera = this.ctx.camera;
    if (!camera) return;
    // The sky is infinitely distant: it rides the camera so it can never be approached.
    this.root.position.copy(camera.position);
    this.stars.material.uniforms.uTime.value = this._t;
    // Point the dome's glow lobe at the moon, read lazily — lights is manifest #2 but we
    // still never capture it at construction.
    const du = this.dome.material.uniforms;
    du.uTime.value = this._t;
    const lights = this.ctx.systems && this.ctx.systems.get('lights');
    if (lights && lights.moon) {
      du.uMoonDir.value.copy(lights.moon.position).sub(lights.moon.target.position).normalize();
    }

    if (!this.mist || this._mistYCurr === null) return;
    const y = lerp(this._mistYPrev, this._mistYCurr, clamp01(alpha));
    // THE CEILING CLAMP. Whatever the terrain says, a mist sheet above the eye is not mist.
    // This is the one line that stops the first pass's pale wall from ever coming back, and
    // it also covers every case terrain.heightAt() cannot know about: a tower platform, the
    // manor's upper floor, the lighthouse gallery, the inside of the car.
    const ceil = camera.position.y - 0.30;
    for (let i = 0; i < this.mist.length; i++) {
      const m = this.mist[i];
      m.mesh.position.set(camera.position.x, Math.min(y + m.yOff, ceil), camera.position.z);
      const u = m.mat.uniforms;
      u.uTime.value = this._t;
      u.uCam.value.copy(camera.position);
      u.uMoonDir.value.copy(du.uMoonDir.value);
    }
  }

  ready() { return !!(this.root && this.scene && this.scene.fog && this.scene.background === this.horizon); }

  dispose() {
    if (this.root) this.root.removeFromParent();
    if (this.dome) { this.dome.geometry.dispose(); this.dome.material.dispose(); }
    if (this.stars) { this.stars.geometry.dispose(); this.stars.material.dispose(); }
    if (this.mist) {
      for (const m of this.mist) { m.mesh.removeFromParent(); m.mat.dispose(); }
      this.mist = null;
    }
    if (this.mistGeo) { this.mistGeo.dispose(); this.mistGeo = null; }
  }

  /**
   * Link the mist program behind the title fade rather than on the first frame of play.
   * main.js calls every warmup() in manifest order; the mist is the only material this
   * system owns that is not on screen at boot (it is parked at y -1000 until the first
   * present), so it is the only one that could link during play.
   */
  warmup() {
    const r = this.ctx.renderer;
    if (!r || !this.mist || !this.ctx.camera) return;
    r.compile(this.scene, this.ctx.camera);
  }
}

export default Sky;
