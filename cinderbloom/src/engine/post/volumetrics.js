// =============================================================================
// CINDERBLOOM — raymarched volumetrics: god rays, height fog, particulate haze.
// Owner: volumetrics agent. Frame-graph order 40 (CONTRACT §5, RENDER_PLAN §5).
// =============================================================================
//
// Three passes, all guarded so a failure degrades to a passthrough:
//
//   40.0  march      volScale-res, front-to-back, IGN-dithered, HG two-lobe
//                    phase, CSM-shadowed, exponential height + 3D-noise density.
//                    -> RGBA16F  (.rgb in-scattered radiance, .a transmittance)
//   40.1  resolve    temporal accumulate against a reprojected history with a
//                    3x3 neighbourhood clamp and depth/off-screen rejection.
//   40.2  composite  full-res, depth-aware bilateral upsample, blended straight
//                    into sceneHDR with GL blending: dst = dst*T + inscatter.
//
// ## What this pass owns
//
// Extinction and in-scatter for d < `vol.maxDist` (600 m). Per RENDER_PLAN §5.7
// `Sky.js` gates its analytic aerial perspective by
// `smoothstep(0.85*maxDist, maxDist, d)` so the two do not double-count. That
// landed, and `scene.fog` is gone (main.js sets it null — a single-channel
// FogExp2 cannot express ART §3.5's per-channel sigma and was the strongest
// "this is Earth" cue in the build), so this pass is no longer tuned to sit
// under anything. The paragraph that said otherwise was stale for six rounds.
//
// ROUND 12 — THE TWO PASSES ARE ONE MEDIUM AGAIN, MECHANICALLY. Both headers
// have always claimed it; both files kept their own copy of the sigmas, and the
// copies diverged the moment Sky.js re-derived its medium onto the Thessaly teal
// (PALETTE_TARGET) and could not legally edit this file. For one round the near
// haze ran a warm, red-heavy albedo in front of a cyan sky. This pass now reads
// `sky.getMedium()` and `sky.getSkyRadiance()` instead of local tables. DO NOT
// reintroduce a local sigma table or a local sky-radiance table here; if this
// file and Sky.js disagree about the air, Sky.js is right by definition.
//
// ## Shadows
//
// Preferred and default path: `ctx.sys.shadows.GLSL_CSM_SAMPLE` +
// `getSharedUniforms()`, calling its `cbCsmShadowWorld(worldPos, viewZ)` — the
// one-tap, no-PCF entry point that system documents as being for this pass
// (RENDER_PLAN §5.4). The march material is rebuilt whenever that GLSL string
// changes (cascade count / PCF taps move with the quality preset).
//
// Fallback, if `shadows.js` is absent or has failed: up to 4 discrete shadow
// maps from a `getCascades()` or from Sky.js's own `DirectionalLight.shadow`,
// unpacked with three's RGBA depth constants (`depthPacking: 3201`, verified in
// the r161 bundle). If neither exists the fog is simply unshadowed — never an
// error, never a black frame.
//
// One tap per step either way: the IGN dither plus temporal accumulation is the
// filter, and PCF per step would be 64x the shadow cost.
//
// ## Compositing into the MRT
//
// `sceneHDR` is attachment 0 of a 4-attachment MRT. A fragment shader that does
// not write every *active* draw buffer gets its draw dropped outright on
// ANGLE/D3D11 (HANDOFF DEVIATION 4). So the composite masks the draw buffers to
// `[COLOR_ATTACHMENT0, NONE, NONE, NONE]` around its own draw and restores them
// to exactly what three believes they are — the same mechanism `renderer.js`
// uses for the sky dome.
//
// ## Knobs — `ctx.debug.vol` (RENDER_PLAN §5.9) and `ctx.debug.flags.vol`
//
//   flags.vol        master on/off, for A/B (`__CB.toggle('vol')`)
//   flags.volDebug   show in-scatter only, no scene underneath
//   flags.volTransmittance  show transmittance as greyscale
//
//   enabled          same as flags.vol, from code                       true
//   density          global multiplier on both sigmas                   1.0
//   groundDensity    extra sigma factor at the bottom of the boundary
//                    layer; the single biggest "how thick is the air"
//                    knob. 8 => ~300 m visibility in clear weather.       8.0
//   nearFade         art-directed fog start distance, m. See the comment
//                    at the march loop — this is the knob that trades
//                    near-field haze against near-field surface detail.    55
//   heightFalloff    global scale height, m (ART §3.5)                  340
//   groundFalloff    boundary-layer scale height, m                      16
//   floor            y of the basin floor, the density reference, m      -6
//   maxDist          march range cap, m (RENDER_PLAN §5.2)              600
//   steps            override quality.volSteps                         null
//   scale            override quality.volScale                         null
//   anisotropy       forward lobe g1                                   0.72
//   backLobe         backward lobe g2                                 -0.28
//   backWeight       weight of the backward lobe                       0.30
//   msGain           flat multiple-scattering floor added to the phase
//                    function, in phase units (isotropic = 0.0796).
//                    Shadowed like the direct term, so shafts read away
//                    from the sun instead of only straight at it.      0.085
//   noiseAmp         wisp amplitude                                    0.55
//   noiseScaleLow    low-frequency noise, 1/m                        0.0062
//   noiseScaleHigh   detail noise, 1/m                                0.031
//   noiseHiDist      drop the detail octave past this, m                 90
//   wind             THREE.Vector3, m/s (uses ctx.world.wind if present)
//   deckY0/deckY1    inversion-layer heights, m (ART §3.5)          20 / 52
//   deckWidth        half-thickness of a deck transition, m               3
//   deckStrength     density step across a deck                        1.55
//   temporalAlpha    history blend (RENDER_PLAN §5.5)                  0.10
//   intensity        final in-scatter gain                             1.0
//   ambient          sky in-scatter gain                              0.70
//   skyOcclusion     how hard the layer above a sample shadows the sky
//                    ambient. 0 = flat white card in heavy weather.     2.5
//   shadowDist       stop shadow-sampling past this, m (also clamped
//                    to the last CSM split)                             260
//   shadowBias       fallback path only                              0.0016
// =============================================================================

import * as THREE from 'three';

const MAX_CASCADES = 4;

// ART_DIRECTION §3.5, converted from per-km to per-metre. These are the numbers
// that make the far field warm ochre-grey instead of Earth blue.
const SIGMA_S = [0.152e-3, 0.140e-3, 0.124e-3];   // ash Mie, near-grey
const SIGMA_A = [0.041e-3, 0.068e-3, 0.118e-3];   // soot, blue-heavy absorption

// ART_DIRECTION §3.5 weather table. `s`/`a` are the sigma multipliers straight
// from the doc — they already carry the whole visibility change, so `ground`
// (the extra boundary-layer factor) stays near 1.0. Compounding the two is what
// turned `storm` into a white card on the first pass.
const WEATHER = {
  clear: { s: 1.0, a: 1.0, g: 0.72, ground: 1.00, noise: 1.00, deck: 1.55 },
  haze:  { s: 2.1, a: 1.8, g: 0.75, ground: 1.10, noise: 1.15, deck: 1.85 },
  spore: { s: 5.5, a: 1.6, g: 0.35, ground: 1.15, noise: 1.55, deck: 1.30 },
  storm: { s: 7.0, a: 3.4, g: 0.55, ground: 1.20, noise: 1.75, deck: 2.10 },
  rain:  { s: 1.4, a: 0.5, g: 0.62, ground: 1.05, noise: 0.80, deck: 1.20 },
};

// ART_DIRECTION §3.3 sky radiance, hemisphere-averaged, for the isotropic
// ambient in-scatter term. This is what stops the fog going black away from the
// sun — and, if it does not track sun elevation all the way down, what turns a
// dusk frame into flat grey. Four anchors by `sunDir.y`, monotone-interpolated.
//
// ROUND 12: THIS IS NOW THE FALLBACK ONLY. `sky.getSkyRadiance()` is the live
// hemispheric average and is used whenever a sky exists — see the long note at
// the uSkyRadiance assignment for why reading a stale copy of these four numbers
// was the single largest contributor to the milky haze. Do not re-promote this
// table; if it disagrees with the sky, the sky is right by definition.
const SKY_KEYS = [
  [-0.20, [0.048, 0.021, 0.013]],   // night: the horizon glow of the burn fields
  [-0.06, [0.052, 0.043, 0.041]],   // -3 deg, key off
  [0.070, [0.260, 0.300, 0.310]],   // 4 deg
  [0.340, [0.830, 0.980, 0.840]],   // 20 deg
];

// Sky.js's SKY_GAIN. The anchors above are the RAW ART §3.3 field; Sky.js scales
// the whole scattered field by this before anything sees it ("the scattered
// field drops 2.2x", Sky.js's own derivation). Applied to the fallback so that
// path is not a second opinion about how bright the sky is either.
const SKY_KEYS_GAIN = 0.457;

const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const COMMON = /* glsl */`
precision highp float;
precision highp sampler3D;
in vec2 vUv;
const float FOUR_PI = 12.566370614;

// Henyey-Greenstein. The forward lobe is what makes god rays read at all.
float hgPhase(float c, float g){
  float g2 = g * g;
  float d = max(1.0 + g2 - 2.0 * g * c, 1e-4);
  return (1.0 - g2) / (FOUR_PI * d * sqrt(d));
}

// Interleaved gradient noise, temporally rotated (Jimenez). Same family as
// GTAO's but a different scramble so the two do not resonate into a moire.
float ignT(vec2 p, float frame){
  p += 5.588238 * mod(frame, 64.0);
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
`;

// three r161 packs shadow depth with MeshDepthMaterial(depthPacking: 3201).
// These are three's own UnpackFactors, verified against the bundle.
const UNPACK = /* glsl */`
const vec4 CB_UNPACK = vec4(255.0/256.0) / vec4(16777216.0, 65536.0, 256.0, 1.0);
float cbUnpackDepth(vec4 v){ return dot(v, CB_UNPACK); }
`;

// -----------------------------------------------------------------------------
// 40.0 — the march
// -----------------------------------------------------------------------------
// Fallback shadow path, used only when `engine/shadows.js` exposes no cascades:
// up to 4 discrete maps in three's RGBA-packed depth format.
const FALLBACK_SHADOW = /* glsl */`
${UNPACK}
uniform sampler2D uShadow0;
uniform sampler2D uShadow1;
uniform sampler2D uShadow2;
uniform sampler2D uShadow3;
uniform mat4  uShadowMat[${MAX_CASCADES}];
uniform vec4  uCascadeFar;
uniform float uCascadeCount;
uniform float uShadowBias;

float cascadeTap(sampler2D map, mat4 m, vec3 wp){
  vec4 sc = m * vec4(wp, 1.0);
  vec3 c = sc.xyz / max(sc.w, 1e-6);
  // outside this cascade's box -> let the caller try the next one
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z < 0.0 || c.z > 1.0) return -1.0;
  // textureLod, not texture: an implicit-LOD fetch inside a varying-length loop
  // makes the HLSL backend warn X3595 about undefined partial derivatives.
  return step(c.z - uShadowBias, cbUnpackDepth(textureLod(map, c.xy, 0.0)));
}

// Cascade selection by view distance with a 12% cross-fade. Without the fade the
// seams read as vertical bands in the fog, which is far more visible than a
// cascade seam on a surface.
//
// Fully unrolled with constant sampler/array indices on purpose: dynamic
// indexing of a vec4 and a sampler-returning helper both make the HLSL backend
// emit X4000 "potentially uninitialized variable", and the smoke harness counts
// any GL warning as a failure.
float cbVolShadow(vec3 wp, float viewZ){
  float n = uCascadeCount;
  if (n < 0.5) return 1.0;
  float s = -1.0;

  if (viewZ <= uCascadeFar.x || n < 1.5) {
    s = cascadeTap(uShadow0, uShadowMat[0], wp);
    if (s >= 0.0 && n > 1.5 && viewZ > uCascadeFar.x * 0.88) {
      float s2 = cascadeTap(uShadow1, uShadowMat[1], wp);
      if (s2 >= 0.0) s = mix(s, s2, smoothstep(uCascadeFar.x * 0.88, uCascadeFar.x, viewZ));
    }
  }
  if (s < 0.0 && n > 1.5 && (viewZ <= uCascadeFar.y || n < 2.5)) {
    s = cascadeTap(uShadow1, uShadowMat[1], wp);
    if (s >= 0.0 && n > 2.5 && viewZ > uCascadeFar.y * 0.88) {
      float s2 = cascadeTap(uShadow2, uShadowMat[2], wp);
      if (s2 >= 0.0) s = mix(s, s2, smoothstep(uCascadeFar.y * 0.88, uCascadeFar.y, viewZ));
    }
  }
  if (s < 0.0 && n > 2.5 && (viewZ <= uCascadeFar.z || n < 3.5)) {
    s = cascadeTap(uShadow2, uShadowMat[2], wp);
    if (s >= 0.0 && n > 3.5 && viewZ > uCascadeFar.z * 0.88) {
      float s2 = cascadeTap(uShadow3, uShadowMat[3], wp);
      if (s2 >= 0.0) s = mix(s, s2, smoothstep(uCascadeFar.z * 0.88, uCascadeFar.z, viewZ));
    }
  }
  if (s < 0.0 && n > 3.5) s = cascadeTap(uShadow3, uShadowMat[3], wp);

  return s < 0.0 ? 1.0 : s;
}
`;

// `shadowsGLSL` is `ctx.sys.shadows.GLSL_CSM_SAMPLE` when that system is up: it
// brings its own uniform block plus `cbCsmShadowWorld(worldPos, viewZ)`, the
// one-tap entry point it documents as being for this pass (RENDER_PLAN §5.4).
const marchFrag = (shadowsGLSL) => /* glsl */`
${COMMON}
${shadowsGLSL
    ? shadowsGLSL + '\nfloat cbVolShadow(vec3 wp, float vz){ return cbCsmShadowWorld(wp, vz); }\n'
    : FALLBACK_SHADOW}

uniform sampler2D uViewZ;
uniform sampler3D uNoise;
uniform mat4  uInvViewProj;
uniform float uShadowDist;
uniform vec3  uCamPos;
uniform vec3  uCamFwd;
uniform vec3  uSigmaS;        // per metre, already weather- and density-scaled
uniform vec3  uSigmaT;
uniform vec3  uSunDir;        // toward the sun
uniform vec3  uSunRadiance;   // colour * irradiance
uniform vec3  uSkyRadiance;   // hemisphere-averaged sky, isotropic in-scatter
uniform vec4  uPhase;         // g1, g2, back-lobe weight, multiple-scatter gain
uniform vec4  uHeight;        // floor y, 1/H_global, 1/H_ground, groundDensity
uniform vec4  uDeck;          // y0, y1, strength, half-width
uniform vec4  uNoiseP;        // scaleLow, scaleHigh, amp, hi-freq cutoff dist
uniform vec3  uAmb;           // skyOcclusion strength, H_ground (m), H_global (m)
uniform vec3  uWindLow;
uniform vec3  uWindHigh;
uniform vec3  uRange;         // tNear, tFar (volMaxDist), nearFade (m)
uniform float uFrame;
uniform float uBreath;

layout(location = 0) out vec4 outColor;

// Exponential height falloff + a denser boundary layer + two inversion decks.
// The decks (ART §3.5) render as flat-bottomed horizontal bands across distant
// terrain; nothing on Earth is that sharp and they fill the dead middle distance.
//
// Returns .x density, .y sky visibility. The second value is what keeps heavy
// weather from turning the frame into a uniform white card: sky light has to
// reach the sample point THROUGH the layer above it, and the vertical optical
// depth of an exponential profile is analytic, so it costs two exps we have
// already paid for. Without it, spore and storm saturate at
// (sigmaS/sigmaT)*skyRadiance everywhere and the frame is a flat 0.9.
vec2 densityAt(vec3 p, float dist){
  float dy = max(p.y - uHeight.x, 0.0);
  float eG = exp(-dy * uHeight.y);
  float eg = exp(-dy * uHeight.z);
  float base = eG + uHeight.w * eg;

  float vertOD = uAmb.z * eG + uHeight.w * uAmb.y * eg;
  float skyVis = exp(-uSigmaT.g * vertOD * uAmb.x);

  float w = uDeck.w;
  base *= mix(uDeck.z, 1.0, smoothstep(uDeck.x - w, uDeck.x + w, p.y));
  base *= mix(uDeck.z, 1.0, smoothstep(uDeck.y - w, uDeck.y + w, p.y));

  float n = textureLod(uNoise, p * uNoiseP.x + uWindLow, 0.0).r * 2.0 - 1.0;
  #ifdef VOL_NOISE_HI
  if (dist < uNoiseP.w) {
    float h = textureLod(uNoise, p * uNoiseP.y + uWindHigh, 0.0).g * 2.0 - 1.0;
    n = n * 0.68 + h * 0.44 * (1.0 - dist / uNoiseP.w);
  }
  #endif
  float mod_ = 1.0 + uNoiseP.z * n * (0.85 + 0.30 * uBreath);
  return vec2(max(base, 0.0) * max(mod_, 0.0), skyVis);
}

void main(){
  vec2 uv = vUv;

  // world-space ray through this pixel
  vec4 fp = uInvViewProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(fp.xyz / fp.w - uCamPos);

  // scene distance along the ray. gViewZ is view-space depth, not ray length.
  float vz = texture(uViewZ, uv).r;
  float cosT = max(dot(dir, uCamFwd), 1e-3);
  float tScene = (vz > 1.0e5) ? uRange.y : min(vz / cosT, uRange.y);

  float tNear = uRange.x;
  float tFar = max(tScene, tNear + 0.02);
  float ratio = tFar / tNear;

  float cosSun = dot(dir, uSunDir);
  // Two-lobe HG plus a flat multiple-scattering floor. The floor matters: with
  // single scattering only, HG(0.72) is ~0.006 away from the sun, so the sun
  // term vanishes and the shadow map stops modulating anything — the fog goes
  // to a dead grey veil with no shafts anywhere except straight at the sun.
  // The floor is shadowed like the direct term, so light shafts read in every
  // direction, which is what real dusty air does and what the reference frames show.
  float phase = mix(hgPhase(cosSun, uPhase.x), hgPhase(cosSun, uPhase.y), uPhase.z) + uPhase.w;

  float jitter = ignT(gl_FragCoord.xy + vec2(11.0, 29.0), uFrame * 13.0 + 7.0);

  vec3 acc = vec3(0.0);
  vec3 T = vec3(1.0);
  float invN = 1.0 / float(VOL_STEPS);

  // Blended linear/geometric step distribution (RENDER_PLAN §5.2): 75% geometric
  // keeps near-field wisps dense while still reaching maxDist in 64 steps.
  float t0 = tNear;
  for (int i = 0; i < VOL_STEPS; i++) {
    float x1 = float(i + 1) * invN;
    float t1 = mix(tNear + (tFar - tNear) * x1, tNear * pow(ratio, x1), 0.75);
    float dt = t1 - t0;
    float ts = t0 + dt * jitter;
    t0 = t1;
    if (dt <= 0.0) continue;

    vec3 p = uCamPos + dir * ts;
    vec2 dv = densityAt(p, ts);
    // Art-directed fog start distance, applied to the whole medium. Measured on
    // this build, near-field EXTINCTION is what eats surface texture and the
    // frame's colour depth — more than the in-scatter veil does — so ramping
    // only the in-scatter (tried, measured, rejected) recovers less for the same
    // loss of near-field fog. Drop vol.nearFade toward ~10 once the near field
    // has real geometry to cast shafts and the terrain stops reading near-black.
    float nearRamp = smoothstep(0.0, uRange.z, ts);
    float d = dv.x * nearRamp;
    if (d > 1e-5) {
      vec3 sigS = uSigmaS * d;
      vec3 sigT = max(uSigmaT * d, vec3(1e-9));
      // cbCsmShadowWorld selects its cascade by VIEW depth, not ray length
      float vzs = ts * cosT;
      float sh = (vzs < uShadowDist) ? cbVolShadow(p, vzs) : 1.0;
      vec3 S = sigS * (uSunRadiance * (phase * sh) + uSkyRadiance * dv.y);
      vec3 Tr = exp(-sigT * dt);
      // analytic integral of in-scatter over the segment — no banding from
      // treating the segment as a point sample
      acc += T * (S - S * Tr) / sigT;
      T *= Tr;
      if (max(T.r, max(T.g, T.b)) < 0.004) break;
    }
  }

  // Transmittance is stored as a scalar (green channel). Across a 600 m march
  // the per-channel spread is under 3% even in storm; the world's chromatic
  // extinction is a kilometre-scale effect and belongs to Sky.js.
  outColor = vec4(acc, clamp(T.g, 0.0, 1.0));
}
`;

// -----------------------------------------------------------------------------
// 40.1 — temporal resolve
// -----------------------------------------------------------------------------
const RESOLVE_FRAG = /* glsl */`
${COMMON}

uniform sampler2D uCur;
uniform sampler2D uHist;
uniform sampler2D uVel;
uniform sampler2D uViewZ;
uniform sampler2D uViewZPrev;
uniform mat4  uInvViewProj;
uniform mat4  uPrevViewProjRot;   // prev view (translation zeroed) * proj
uniform vec3  uCamPos;
uniform vec2  uTexel;
uniform float uAlpha;
uniform float uReset;

layout(location = 0) out vec4 outColor;

void main(){
  vec2 uv = vUv;
  vec4 cur = texture(uCur, uv);

  if (uReset > 0.5) { outColor = cur; return; }

  float z = texture(uViewZ, uv).r;

  vec2 prevUv;
  if (z > 1.0e5) {
    // The sky writes zero velocity (renderer clear value), so reproject it
    // analytically from camera rotation or the horizon haze smears on every
    // mouse movement — which is exactly where this pass lives.
    vec4 fp = uInvViewProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    vec3 dir = normalize(fp.xyz / fp.w - uCamPos);
    vec4 pc = uPrevViewProjRot * vec4(dir, 0.0);
    prevUv = (pc.w > 1e-6) ? (pc.xy / pc.w) * 0.5 + 0.5 : uv;
  } else {
    prevUv = uv - texture(uVel, uv).rg;
  }

  float a = uAlpha;
  if (prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0) {
    a = 1.0;
  } else if (z < 1.0e5) {
    float zp = texture(uViewZPrev, prevUv).r;
    // looser than TAA's rejection — fog is low frequency
    if (abs(zp - z) > 0.06 * z + 0.10) a = 1.0;
  }

  vec4 hist = texture(uHist, prevUv);

  // Clamp history to the current 3x3. This is what stops fog smearing off
  // moving silhouettes; without it the god rays trail behind every edge.
  vec4 mn = cur, mx = cur;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      vec4 s = texture(uCur, uv + vec2(float(x), float(y)) * uTexel);
      mn = min(mn, s); mx = max(mx, s);
    }
  }
  hist = clamp(hist, mn, mx);
  // NaN/Inf guard without isnan() — the HLSL backend warns on isnan under /Gis
  // and the smoke harness treats GL warnings as failures. A NaN fails both
  // comparisons, so the negated conjunction catches it.
  float hsum = dot(abs(hist), vec4(1.0));
  if (!(hsum >= 0.0 && hsum < 1.0e8)) a = 1.0;

  outColor = mix(hist, cur, clamp(a, 0.0, 1.0));
}
`;

// -----------------------------------------------------------------------------
// 40.2 — depth-aware composite
// -----------------------------------------------------------------------------
const COMPOSITE_FRAG = /* glsl */`
${COMMON}

uniform sampler2D uVol;
uniform sampler2D uViewZ;
uniform vec2  uVolTexel;      // 1 / volumetric resolution
uniform float uIntensity;
uniform float uDebug;

layout(location = 0) out vec4 outColor;

// Identical kernel to renderer.js's cbSampleAOBilateral (RENDER_PLAN §4.6/§5.6).
// Naive bilinear here haloes every silhouette with fog and looks terrible; it is
// one of the top "this is WebGL" tells.
vec4 sampleVol(vec2 uv, float z){
  vec2 f = uv / uVolTexel - 0.5;
  vec2 base = floor(f);
  vec2 fr = f - base;
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2(float(i & 1), float(i >> 1));
    vec2 tuv = (base + o + 0.5) * uVolTexel;
    float bw = mix(1.0 - fr.x, fr.x, o.x) * mix(1.0 - fr.y, fr.y, o.y);
    float zt = texture(uViewZ, tuv).r;
    float w = bw * exp(-abs(min(zt, 1.0e5) - min(z, 1.0e5)) / (0.03 * z + 0.06));
    acc += texture(uVol, tuv) * w;
    wsum += w;
  }
  return wsum > 1e-5 ? acc / wsum : texture(uVol, uv);
}

void main(){
  float z = max(texture(uViewZ, vUv).r, 1e-3);
  vec4 v = sampleVol(vUv, z);
  vec3 inscatter = max(v.rgb, vec3(0.0)) * uIntensity;
  float T = clamp(v.a, 0.0, 1.0);
  // blending is CustomBlending(ONE, SRC_ALPHA):  dst = inscatter + dst * T
  if (uDebug > 1.5)      outColor = vec4(vec3(T), 0.0);        // transmittance
  else if (uDebug > 0.5) outColor = vec4(inscatter, 0.0);      // in-scatter only
  else                   outColor = vec4(inscatter, T);
}
`;

// =============================================================================

export class Volumetrics {
  static id = 'volumetrics';
  static deps = ['renderer', 'sky', 'shadows'];

  constructor(ctx) {
    this.ctx = ctx;
    this.pass = null;
    this.failed = false;
    this._reset = true;
    this._steps = -1;
    this._noiseHi = null;
    this._volW = 0; this._volH = 0;

    // RENDER_PLAN §5.9 knobs.
    this.knobs = ctx.debug.vol = {
      enabled: true,
      density: 1.0,
      groundDensity: 8.0,
      heightFalloff: 340.0,
      groundFalloff: 16.0,
      floor: -6.0,
      msGain: 0.085,
      maxDist: 600.0,
      steps: null,
      scale: null,
      anisotropy: 0.72,
      backLobe: -0.28,
      backWeight: 0.30,
      noiseAmp: 0.55,
      noiseScaleLow: 0.0062,
      noiseScaleHigh: 0.031,
      noiseHiDist: 90.0,
      wind: new THREE.Vector3(2.4, 0.0, -1.1),
      // ART §3.5 puts the inversion decks at 90 m and 340 m. This terrain tops
      // out at ~46 m, so decks up there only ever band empty sky. Scaled to the
      // world we actually have; noted in HANDOFF.
      deckY0: 20.0,
      deckY1: 52.0,
      deckWidth: 3.0,
      deckStrength: 1.55,
      temporalAlpha: 0.10,
      intensity: 1.0,
      ambient: 0.70,
      skyOcclusion: 2.5,
      shadowDist: 260.0,
      nearFade: 55.0,
      shadowBias: 0.0016,
    };
  }

  // ---------------------------------------------------------------------------

  async init() {
    const { ctx } = this;
    try {
      this.rd = ctx.sys.renderer;
      if (!this.rd) throw new Error('renderer system missing');
      this.gl = ctx.gl;

      // Debug flags: default the master switch ON so `__CB.toggle('vol')` flips
      // it OFF on the first call, which is what an A/B actually needs.
      if (ctx.debug.flags.vol === undefined) ctx.debug.flags.vol = true;
      if (ctx.debug.flags.volDebug === undefined) ctx.debug.flags.volDebug = false;
      if (ctx.debug.flags.volTransmittance === undefined) ctx.debug.flags.volTransmittance = false;

      this._buildQuad();
      this._buildNoise();

      this._white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      this._white.needsUpdate = true;

      this._shadowMats = [];
      for (let i = 0; i < MAX_CASCADES; i++) this._shadowMats.push(new THREE.Matrix4());

      this._u = {
        vol: { value: null },
        volTexel: { value: new THREE.Vector2(1, 1) },
        maxDist: { value: this.knobs.maxDist },
      };

      this._makeMarch();
      this._makeResolve();
      this._makeComposite();

      this._dbFull = [this.gl.COLOR_ATTACHMENT0, this.gl.COLOR_ATTACHMENT1,
        this.gl.COLOR_ATTACHMENT2, this.gl.COLOR_ATTACHMENT3];
      this._dbMasked = [this.gl.COLOR_ATTACHMENT0, this.gl.NONE, this.gl.NONE, this.gl.NONE];

      ctx.bus.on('rtResize', () => { this._reset = true; });
      ctx.bus.on('quality', () => { this._reset = true; });

      this.pass = {
        id: 'volumetrics',
        order: 40,
        inputs: ['viewZ', 'viewZPrev'],
        outputs: ['vol'],
        enabled: true,
        execute: (target, gbuf, c) => {
          if (this.failed) return;
          try { this._execute(gbuf, c); } catch (e) { this._disable(e); }
        },
        reset: () => { this._reset = true; },
      };
      ctx.frameGraph.register(this.pass);
    } catch (e) {
      this._disable(e);
    }
  }

  /** Degrade to a passthrough rather than blacking out the frame. */
  _disable(e) {
    if (this.failed) return;
    this.failed = true;
    if (this.pass) this.pass.enabled = false;
    this.ctx.frameGraph?.invalidate?.();
    this.ctx.debug.stats.volumetrics = 'disabled: ' + (e && e.message || e);
    console.warn('[volumetrics] pass disabled, frame falls back to no fog:', e);
  }

  onQuality() { this._reset = true; this._syncSteps(); }
  resize() { this._reset = true; }
  reset() { this._reset = true; }

  /** RENDER_PLAN §5.8 — water/vfx sample the same texture at their own depth. */
  getSharedUniforms() {
    return { uVolTex: this._u.vol, uVolTexel: this._u.volTexel, uVolMaxDist: this._u.maxDist };
  }

  // ---------------------------------------------------------------------------
  // resources
  // ---------------------------------------------------------------------------

  _buildQuad() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this._geo = geo;
    this._cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._scene = new THREE.Scene();
    this._quad = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this._quad.frustumCulled = false;
    this._scene.add(this._quad);
  }

  /**
   * 64^3 tiling value-noise volume, RGBA8. Two usable octaves live in .r and .g
   * at different lattice resolutions; the march samples them at two world scales
   * so the wisps do not repeat visibly. Built from `ctx.rng.fork` — never
   * Math.random, and forking leaves the shared stream untouched.
   */
  _buildNoise() {
    const N = 64;
    const rng = this.ctx.rng.fork('volumetrics/noise');
    const lat = (R) => { const a = new Float32Array(R * R * R); for (let i = 0; i < a.length; i++) a[i] = rng.next(); return a; };
    const L = [lat(4), lat(8), lat(16)];
    const RS = [4, 8, 16];
    const sm = (t) => t * t * (3 - 2 * t);

    const samp = (a, R, x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const fx = sm(x - xi), fy = sm(y - yi), fz = sm(z - zi);
      const x0 = ((xi % R) + R) % R, y0 = ((yi % R) + R) % R, z0 = ((zi % R) + R) % R;
      const x1 = (x0 + 1) % R, y1 = (y0 + 1) % R, z1 = (z0 + 1) % R;
      const r0 = y0 * R, r1 = y1 * R;
      const p0 = z0 * R * R, p1 = z1 * R * R;
      const c000 = a[p0 + r0 + x0], c100 = a[p0 + r0 + x1];
      const c010 = a[p0 + r1 + x0], c110 = a[p0 + r1 + x1];
      const c001 = a[p1 + r0 + x0], c101 = a[p1 + r0 + x1];
      const c011 = a[p1 + r1 + x0], c111 = a[p1 + r1 + x1];
      const a00 = c000 + (c100 - c000) * fx, a10 = c010 + (c110 - c010) * fx;
      const a01 = c001 + (c101 - c001) * fx, a11 = c011 + (c111 - c011) * fx;
      const b0 = a00 + (a10 - a00) * fy, b1 = a01 + (a11 - a01) * fy;
      return b0 + (b1 - b0) * fz;
    };

    const data = new Uint8Array(N * N * N * 4);
    const inv = 1 / N;
    for (let z = 0; z < N; z++) {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const u = x * inv, v = y * inv, w = z * inv;
          let o0 = 0, o1 = 0, o2 = 0;
          for (let k = 0; k < 3; k++) {
            const R = RS[k];
            const s = samp(L[k], R, u * R, v * R, w * R);
            o0 += s * [0.55, 0.30, 0.15][k];
            o1 += s * [0.20, 0.36, 0.44][k];
            o2 += Math.abs(s * 2 - 1) * [0.5, 0.3, 0.2][k];
          }
          const i = ((z * N + y) * N + x) * 4;
          data[i] = Math.max(0, Math.min(255, o0 * 255)) | 0;
          data[i + 1] = Math.max(0, Math.min(255, o1 * 255)) | 0;
          data[i + 2] = Math.max(0, Math.min(255, (1 - o2) * 255)) | 0;
          data[i + 3] = 255;
        }
      }
    }

    const tex = new THREE.Data3DTexture(data, N, N, N);
    tex.format = THREE.RGBAFormat;
    tex.type = THREE.UnsignedByteType;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    this._noise = tex;
  }

  _rawMat(frag, uniforms, defines = {}) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,   // three prepends `#version 300 es` (HANDOFF trap 1)
      vertexShader: FS_VERT,
      fragmentShader: frag,
      uniforms, defines,
      depthTest: false, depthWrite: false,
    });
  }

  _syncSteps() {
    const q = this.ctx.quality;
    const steps = Math.max(8, Math.min(128, this.knobs.steps || q.volSteps || 64));
    const hi = q.preset !== 'low';
    if (steps === this._steps && hi === this._noiseHi) return;
    this._steps = steps; this._noiseHi = hi;
    if (!this.march) return;
    this.march.defines.VOL_STEPS = steps;
    if (hi) this.march.defines.VOL_NOISE_HI = 1; else delete this.march.defines.VOL_NOISE_HI;
    this.march.needsUpdate = true;
  }

  /**
   * `engine/shadows.js` publishes `GLSL_CSM_SAMPLE` + `getSharedUniforms()` and
   * rebuilds the GLSL when cascade count / PCF taps change. Rebuild the march
   * material whenever that string changes; fall back to the discrete-map path
   * (and, ultimately, unshadowed fog) when the system is absent or failed.
   */
  _syncShadowSource() {
    const sh = this.ctx.sys.shadows;
    let glsl = '';
    try { glsl = (sh && sh.GLSL_CSM_SAMPLE) || ''; } catch { glsl = ''; }
    if (glsl === this._csmGlsl && this.march) return false;
    this._csmGlsl = glsl;
    this._usingCsm = !!glsl;
    if (this.march) {
      this.march.fragmentShader = marchFrag(glsl);
      if (glsl) { try { Object.assign(this.march.uniforms, sh.getSharedUniforms()); } catch { /* keep ours */ } }
      this.march.needsUpdate = true;
    }
    return true;
  }

  _makeMarch() {
    const mats = [];
    for (let i = 0; i < MAX_CASCADES; i++) mats.push(new THREE.Matrix4());
    const sh = this.ctx.sys.shadows;
    let glsl = '';
    try { glsl = (sh && sh.GLSL_CSM_SAMPLE) || ''; } catch { glsl = ''; }
    this._csmGlsl = glsl;
    this._usingCsm = !!glsl;
    this.march = this._rawMat(marchFrag(glsl), {
      uViewZ: { value: null },
      uNoise: { value: this._noise },
      uShadow0: { value: null }, uShadow1: { value: null },
      uShadow2: { value: null }, uShadow3: { value: null },
      uInvViewProj: { value: new THREE.Matrix4() },
      uShadowMat: { value: mats },
      uCascadeFar: { value: new THREE.Vector4(1e6, 1e6, 1e6, 1e6) },
      uCascadeCount: { value: 0 },
      uShadowBias: { value: 0.0016 },
      uShadowDist: { value: 260 },
      uCamPos: { value: new THREE.Vector3() },
      uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
      uSigmaS: { value: new THREE.Vector3() },
      uSigmaT: { value: new THREE.Vector3() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunRadiance: { value: new THREE.Vector3() },
      uSkyRadiance: { value: new THREE.Vector3() },
      uPhase: { value: new THREE.Vector4(0.72, -0.28, 0.30, 0.10) },
      uHeight: { value: new THREE.Vector4() },
      uDeck: { value: new THREE.Vector4() },
      uNoiseP: { value: new THREE.Vector4() },
      uAmb: { value: new THREE.Vector3(2.5, 16, 340) },
      uWindLow: { value: new THREE.Vector3() },
      uWindHigh: { value: new THREE.Vector3() },
      uRange: { value: new THREE.Vector3(0.35, 600, 55) },
      uFrame: { value: 0 },
      uBreath: { value: 0 },
    }, { VOL_STEPS: 64, VOL_NOISE_HI: 1 });
    if (glsl) { try { Object.assign(this.march.uniforms, sh.getSharedUniforms()); } catch { /* keep ours */ } }
    this._steps = 64; this._noiseHi = true;
    this._syncSteps();
  }

  _makeResolve() {
    this.resolve = this._rawMat(RESOLVE_FRAG, {
      uCur: { value: null },
      uHist: { value: null },
      uVel: { value: null },
      uViewZ: { value: null },
      uViewZPrev: { value: null },
      uInvViewProj: { value: new THREE.Matrix4() },
      uPrevViewProjRot: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() },
      uTexel: { value: new THREE.Vector2() },
      uAlpha: { value: 0.1 },
      uReset: { value: 1 },
    });
  }

  _makeComposite() {
    this.composite = this._rawMat(COMPOSITE_FRAG, {
      uVol: { value: null },
      uViewZ: { value: null },
      uVolTexel: { value: new THREE.Vector2() },
      uIntensity: { value: 1 },
      uDebug: { value: 0 },
    });
    // dst = src.rgb * 1 + dst * src.a   ->   sceneHDR = inscatter + sceneHDR * T
    this.composite.transparent = true;
    this.composite.blending = THREE.CustomBlending;
    this.composite.blendEquation = THREE.AddEquation;
    this.composite.blendSrc = THREE.OneFactor;
    this.composite.blendDst = THREE.SrcAlphaFactor;
    this.composite.blendEquationAlpha = THREE.AddEquation;
    this.composite.blendSrcAlpha = THREE.ZeroFactor;
    this.composite.blendDstAlpha = THREE.OneFactor;
  }

  _draw(mat, target) {
    const r = this.ctx.renderer;
    this._quad.material = mat;
    r.setRenderTarget(target);
    r.render(this._scene, this._cam);
  }

  // ---------------------------------------------------------------------------
  // per-frame
  // ---------------------------------------------------------------------------

  /**
   * Only used when `shadows.js` exposes no CSM GLSL. Discovers up to 4 discrete
   * shadow maps, either from a `getCascades()` the shadows agent may add later
   * or from Sky.js's own single `DirectionalLight.shadow`.
   */
  _gatherCascades() {
    const u = this.march.uniforms;
    const sh = this.ctx.sys.shadows;
    let list = null;
    if (sh && typeof sh.getCascades === 'function') {
      try { list = sh.getCascades(); } catch { list = null; }
    }
    if (!list || !list.length) {
      const sun = this.ctx.sys.sky?.sun;
      const s = sun?.shadow;
      if (sun?.castShadow && s && s.map && s.map.texture) {
        list = [{ map: s.map.texture, matrix: s.matrix, far: s.camera?.far ?? 400 }];
      }
    }
    const n = Math.min(MAX_CASCADES, list ? list.length : 0);
    u.uCascadeCount.value = n;
    const far = u.uCascadeFar.value;
    for (let i = 0; i < MAX_CASCADES; i++) {
      const c = i < n ? list[i] : null;
      const tex = c ? (c.map?.isTexture ? c.map : c.map?.texture) : null;
      u['uShadow' + i].value = tex || this._white;
      if (c) {
        u.uShadowMat.value[i].copy(c.matrix);
        far.setComponent(i, c.far ?? 1e6);
      } else {
        far.setComponent(i, 1e6);
      }
    }
    return n;
  }

  _execute(gbuf, ctx) {
    const k = this.knobs;
    const flags = ctx.debug.flags;
    if (!k.enabled || flags.vol === false) { gbuf.vol = null; this._u.vol.value = null; this._reset = true; return; }
    if (!gbuf.gViewZ) throw new Error('gViewZ not built — declare it in inputs');

    const q = ctx.quality;
    this._syncSteps();

    // resolution
    let scale = k.scale || q.volScale || 0.5;
    if (!k.scale && q.preset === 'low') scale = Math.min(scale, 0.25);
    scale = Math.max(0.1, Math.min(1.0, scale));

    const raw = this.rd.rt('volRaw', { scale, type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    const hist = this.rd.pingpong('volHist', { scale, type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    if (raw.width !== this._volW || raw.height !== this._volH) {
      this._volW = raw.width; this._volH = raw.height;
      this._reset = true;
    }

    // ---- media parameters ---------------------------------------------------
    const sky = ctx.sys.sky;
    const w = WEATHER[sky?.weather] || WEATHER.clear;
    const dens = k.density;
    const mu = this.march.uniforms;

    // ---- ONE MEDIUM, ROUND 12. `sky.getMedium()` already applies the weather
    // multipliers, so this must NOT apply `w.s`/`w.a` on top of it — only the
    // local `density` knob, which is this pass's own.
    //
    // WHY THIS STOPPED BEING TWO TABLES. This pass owns extinction inside 600 m
    // and Sky.js owns it beyond, with a smoothstep handover at 0.85*maxDist, and
    // the header of both passes has claimed since the scaffold that they are one
    // medium. Round 11 re-derived Sky.js's sigmas onto the Thessaly teal and
    // could not touch this file, so for one round the near haze ran a red-heavy
    // albedo — ssa (0.787, 0.673, 0.512) — in front of a sky that had gone cyan.
    // That is why `draft` and `storm`, whose entire depth budget is inside the
    // march, came out sepia in a teal world while `ridge`, whose distance is
    // beyond it, came out milky cyan: two different atmospheres, one frame.
    // Reading the function instead of copying the constants makes the claim
    // structural. SIGMA_S/SIGMA_A below survive only as the no-sky fallback.
    const med = sky?.getMedium?.();
    const sS = med ? med.sigmaS : [SIGMA_S[0] * w.s, SIGMA_S[1] * w.s, SIGMA_S[2] * w.s];
    const sT = med ? med.sigmaT : [
      SIGMA_S[0] * w.s + SIGMA_A[0] * w.a,
      SIGMA_S[1] * w.s + SIGMA_A[1] * w.a,
      SIGMA_S[2] * w.s + SIGMA_A[2] * w.a,
    ];
    mu.uSigmaS.value.set(sS[0] * dens, sS[1] * dens, sS[2] * dens);
    mu.uSigmaT.value.set(sT[0] * dens, sT[1] * dens, sT[2] * dens);
    mu.uPhase.value.set(w.g * (k.anisotropy / 0.72), k.backLobe, k.backWeight, k.msGain);

    // sun: irradiance straight off the DirectionalLight Sky.js drives
    const sun = sky?.sun;
    const sunDir = sky?.getSunDir?.() || new THREE.Vector3(0, 1, 0);
    mu.uSunDir.value.copy(sunDir).normalize();
    const sc = sun ? sun.color : (sky?.getSunColor?.() || { r: 1, g: 1, b: 1 });
    const si = sun ? sun.intensity : 1.0;
    mu.uSunRadiance.value.set(sc.r * si, sc.g * si, sc.b * si);

    // ---- THE FOG'S AMBIENT, AND THE BIGGEST SINGLE CAUSE OF THE MILKY HAZE.
    // ROUND 12.
    //
    // This term is the isotropic in-scatter: sky radiance times sigmaS, at every
    // sample, in every direction. It is what a hazy frame IS. It was read off
    // SKY_KEYS below — four ART §3.3 anchors, transcribed when this file was
    // written and never touched since — and Sky.js has meanwhile put a global
    // SKY_GAIN = 0.457 on the scattered field, with its own derivation block
    // saying in as many words: "the scattered field drops 2.2x".
    //
    // SKY_KEYS never got that memo. So the fog has been lit by a sky 2.19x
    // brighter than the sky that is drawn, in every vista, at every elevation —
    // and unlike the aerial pass this one reaches the NEAR field, which is why
    // the wash showed up on close-ups (`mat-flora`, `reload`) that have no
    // distance in them at all. Measured at 20 deg sun: SKY_KEYS luma 0.938
    // against the real hemispheric average's ~0.43.
    //
    // `sky.getSkyRadiance()` is `_avgSky`, the cosine-weighted hemisphere
    // average Sky.js computes from the same table it renders, gain included.
    // Its own doc comment has asked this file to read it instead. It also tracks
    // elevation continuously rather than at four keys, so dusk stops stepping,
    // and it carries the burn deck, the bioluminescent airglow and the Nail —
    // meaning the night fog is finally lit by the night sky rather than by a
    // constant that predates all three.
    //
    // SKY_KEYS stays as the fallback for a failed/absent sky, scaled by the same
    // gain so the fallback is not a second opinion either.
    const live = sky?.getSkyRadiance?.();
    let sr;
    if (live && live.length === 3) {
      sr = live;
    } else {
      const y = sunDir.y;
      let lo = SKY_KEYS[0], hi = SKY_KEYS[SKY_KEYS.length - 1];
      for (let i = 0; i < SKY_KEYS.length - 1; i++) {
        if (y >= SKY_KEYS[i][0] && y <= SKY_KEYS[i + 1][0]) { lo = SKY_KEYS[i]; hi = SKY_KEYS[i + 1]; break; }
        if (y < SKY_KEYS[0][0]) { lo = hi = SKY_KEYS[0]; break; }
        if (y > SKY_KEYS[SKY_KEYS.length - 1][0]) { lo = hi = SKY_KEYS[SKY_KEYS.length - 1]; break; }
      }
      const span = hi[0] - lo[0];
      const f = span > 1e-6 ? Math.max(0, Math.min(1, (y - lo[0]) / span)) : 0;
      sr = [
        (lo[1][0] + (hi[1][0] - lo[1][0]) * f) * SKY_KEYS_GAIN,
        (lo[1][1] + (hi[1][1] - lo[1][1]) * f) * SKY_KEYS_GAIN,
        (lo[1][2] + (hi[1][2] - lo[1][2]) * f) * SKY_KEYS_GAIN,
      ];
    }
    const amb = k.ambient;
    mu.uSkyRadiance.value.set(sr[0] * amb, sr[1] * amb, sr[2] * amb);
    mu.uAmb.value.set(k.skyOcclusion, Math.max(1, k.groundFalloff), Math.max(1, k.heightFalloff));

    mu.uHeight.value.set(k.floor, 1 / Math.max(1, k.heightFalloff), 1 / Math.max(1, k.groundFalloff), k.groundDensity * w.ground);
    mu.uDeck.value.set(k.deckY0, k.deckY1, k.deckStrength * (w.deck / 1.55), k.deckWidth);
    mu.uNoiseP.value.set(k.noiseScaleLow, k.noiseScaleHigh, k.noiseAmp * w.noise, k.noiseHiDist);

    // wind advection — deterministic, driven by ctx.time.elapsed
    const wind = ctx.world?.wind || k.wind;
    const t = ctx.time.elapsed;
    mu.uWindLow.value.set(wind.x, wind.y, wind.z).multiplyScalar(-t * k.noiseScaleLow * 0.35);
    mu.uWindHigh.value.set(wind.x, wind.y, wind.z).multiplyScalar(-t * k.noiseScaleHigh * 0.9);
    mu.uBreath.value = ctx.world?.breath ?? 0.5;

    // camera + range
    const cam = ctx.camera;
    mu.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
    mu.uCamFwd.value.set(0, 0, -1).applyQuaternion(cam.quaternion).normalize();
    mu.uInvViewProj.value.copy(ctx.matrices.invViewProjUnjit);
    mu.uRange.value.set(Math.max(0.25, cam.near), Math.max(2, k.maxDist), Math.max(0.001, k.nearFade));
    mu.uFrame.value = gbuf.frame % 4096;
    mu.uViewZ.value = gbuf.gViewZ;
    mu.uShadowBias.value = k.shadowBias;

    // Shadow source: prefer the real CSM. `uShadowDist` is a pure early-out —
    // past the last cascade there is nothing to sample, so skip the fetch.
    this._syncShadowSource();
    let shadowDist = k.shadowDist;
    const shSys = ctx.sys.shadows;
    if (this._usingCsm) {
      try {
        const sp = shSys.getSplits?.();
        if (sp && sp.length) shadowDist = Math.min(shadowDist, sp[sp.length - 1] + 1);
      } catch { /* keep the knob */ }
    } else {
      this._gatherCascades();
    }
    mu.uShadowDist.value = shadowDist;

    // ---- 40.0 march ---------------------------------------------------------
    this._draw(this.march, raw);

    // ---- 40.1 temporal resolve ----------------------------------------------
    const ru = this.resolve.uniforms;
    ru.uCur.value = raw.texture;
    ru.uHist.value = hist.read.texture;
    ru.uVel.value = gbuf.gVel;
    ru.uViewZ.value = gbuf.gViewZ;
    ru.uViewZPrev.value = gbuf.gViewZPrev || gbuf.gViewZ;
    ru.uInvViewProj.value.copy(ctx.matrices.invViewProjUnjit);
    ru.uCamPos.value.copy(mu.uCamPos.value);
    ru.uTexel.value.set(1 / raw.width, 1 / raw.height);
    ru.uAlpha.value = Math.max(0.02, Math.min(1, k.temporalAlpha));
    ru.uReset.value = (this._reset || gbuf.firstFrame) ? 1 : 0;

    // prev view with translation zeroed, for sky-pixel reprojection
    const pv = this._prevRot || (this._prevRot = new THREE.Matrix4());
    pv.copy(ctx.matrices.prevView);
    pv.elements[12] = 0; pv.elements[13] = 0; pv.elements[14] = 0;
    ru.uPrevViewProjRot.value.multiplyMatrices(ctx.matrices.projUnjit, pv);

    // Draw into `write`, read from `read`, THEN swap. Swapping first binds the
    // texture we are about to render into as `uHist` — a real feedback loop that
    // ANGLE resolves by dropping the draw, leaving uninitialised transmittance
    // and a completely black frame.
    this._draw(this.resolve, hist.write);
    this._reset = false;

    const volTex = hist.write.texture;
    gbuf.vol = volTex;
    this._u.vol.value = volTex;
    this._u.volTexel.value.set(1 / raw.width, 1 / raw.height);
    this._u.maxDist.value = k.maxDist;

    // ---- 40.2 composite into sceneHDR ---------------------------------------
    const cu = this.composite.uniforms;
    cu.uVol.value = volTex;
    cu.uViewZ.value = gbuf.gViewZ;
    cu.uVolTexel.value.set(1 / raw.width, 1 / raw.height);
    cu.uIntensity.value = k.intensity;
    const dbg = flags.volTransmittance ? 2 : (flags.volDebug ? 1 : 0);
    cu.uDebug.value = dbg;
    this.composite.blending = dbg ? THREE.NoBlending : THREE.CustomBlending;

    const r = ctx.renderer;
    const gl = this.gl;
    // Only touch draw buffers when the target really is the multi-attachment
    // gbuffer we expect; if renderer.js ever hands us something else, blending
    // into it plainly is still correct.
    const masked = gbuf.rt === this.rd.mrt && Array.isArray(gbuf.rt?.texture) && gbuf.rt.texture.length > 1;
    r.setRenderTarget(gbuf.rt);
    // A shader that does not write every ACTIVE draw buffer has its draw dropped
    // on ANGLE/D3D11 (HANDOFF DEVIATION 4). Mask to attachment 0 for our draw and
    // restore to exactly what three believes, so its cache stays coherent.
    if (masked) gl.drawBuffers(this._dbMasked);
    this._draw(this.composite, gbuf.rt);
    if (masked) gl.drawBuffers(this._dbFull);

    hist.swap();
  }

  // ---------------------------------------------------------------------------

  debugInfo() {
    return {
      enabled: !this.failed && this.knobs.enabled && this.ctx.debug.flags.vol !== false,
      steps: this._steps,
      res: [this._volW, this._volH],
      shadowSource: this._usingCsm ? 'csm' : (this.march?.uniforms.uCascadeCount.value ? 'directional' : 'none'),
      shadowDist: this.march?.uniforms.uShadowDist.value,
      weather: this.ctx.sys.sky?.weather,
      failed: this.failed,
    };
  }

  dispose() {
    this._noise?.dispose();
    this._white?.dispose();
    this._geo?.dispose();
    this.march?.dispose();
    this.resolve?.dispose();
    this.composite?.dispose();
    this.ctx.frameGraph?.unregister?.('volumetrics');
  }
}

export default Volumetrics;
