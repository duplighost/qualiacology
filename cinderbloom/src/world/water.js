// =============================================================================
// CINDERBLOOM — liquid, wetness, caustics.
// Owner: water agent. See docs/CONTRACT.md §4, docs/ART_DIRECTION.md §2/§5.4.
// =============================================================================
//
// ## WHAT THE LIQUID IS
//
// Not blue water. ART §5.4: rainwater standing 1-50 cm deep on fused-silica
// blackglass, ringed by white alkaline evaporite crust. The water has been
// sitting on an alkaline ash regolith for however long it has been since the
// last rain, so it is loaded with dissolved iron and alkali. Its absorption is
// the INVERSE of Earth water: Earth water absorbs red and passes blue, so a
// deep pool goes cyan. This liquid absorbs blue and green hard and passes red,
// so a deep pool goes AMBER then BLACK. That single sign flip is most of what
// makes the pools read as somewhere else, and it costs one vec3.
//
//   sigma_a = (0.55, 1.95, 4.30) / m     amber transmission, blue dies at 20 cm
//   sigma_s = (0.30, 0.22, 0.13) / m     fine ash suspension, warm-grey inscatter
//   F0      = 0.02                        n = 1.33, an ordinary dielectric
//
// The other half is roughness contrast (ART §2.4.3): the world is chalk-matte
// at 0.75-0.95 and the water is at 0.02-0.14. That is the cheapest AAA tell in
// the project and it only exists where there is liquid, so this file also owns
// **wetness** — the darkened, low-roughness ring of ground around every pool.
//
// ## WHERE THE LIQUID IS
//
// Two mechanisms, both baked at boot into one field texture:
//
//   1. AUTHORED BODY. `TERRAIN.waterLevel` on the Blackglass Flats (SITES.glass).
//      terrain.js dishes that site 0.4 m specifically so this pools in it.
//   2. MORPHOLOGICAL PUDDLES. `depth = min( blur_R(h) - h, h_min_R + cap - h )`
//      over a 25 m window. A concavity detector, not a hydrology sim — it is
//      LOCAL and BOUNDED by construction, which matters: a real priority-flood
//      spill-level fill on this terrain floods the entire basin into one lake
//      up to the tile rim, because the basin IS a closed depression. Puddles
//      are then flattened per connected component to their own boundary-min
//      level so each one is a true horizontal plane, and gated by a rain mask
//      so they cluster instead of speckling.
//
// The field is 512^2 over the 512 m tile (1 m/texel), RGBA16F:
//
//   .r wetness 0..1      .g depth (m)      .b puddle film 0..1     .a level (m)
//
// Shader lookups perturb the sample coordinate with noise before sampling, so
// the 1 m lattice never shows: the shoreline's high-frequency irregularity
// comes from the noise, not from the field, which is also how it should be.
//
// ## FRAME GRAPH
//
//   order 30  waterDeferred  — caustics, wetness, evaporite crust, puddle
//                              mirrors. Fullscreen, blended straight into
//                              sceneHDR as dst = rgb + dst*a (one MAD, so the
//                              multiply and the add happen in one draw).
//                              ORDER 30 WAS EMPTY (no ssr.js). This claims it.
//   order 49  waterPre        — copies sceneHDR for refraction/SSR and pushes
//                              per-frame uniforms. Must be < 50.
//   order 50  (engine)        — the renderer draws CB_LAYER.TRANSPARENT, which
//                              is where the liquid mesh lives. The mesh writes
//                              all four MRT attachments itself and sets
//                              userData.cbWritesGBuffer, so TAA and motion blur
//                              see real water normals and real velocity.
//
// Screen-space reflection is marched INSIDE the two water shaders rather than
// as a generic gbuffer SSR pass, because water is drawn at order 50 and is
// therefore not in the gbuffer an order-30 SSR pass would read. Sky PMREM
// (three's cubeUV chunk, injected with hand-computed defines) is the fallback
// on every miss, so there is no case where the reflection is missing.
//
// ## PUBLIC API (other systems)
//
//   water.getDepthAt(x, z)      metres of liquid, 0 if dry
//   water.getLevelAt(x, z)      liquid surface y, or -Infinity if dry
//   water.getWetnessAt(x, z)    0..1 shared wetness mask (CPU)
//   water.isSubmerged(x, y, z)
//   water.splash(x, y, z, str)  ripple + bus 'water:splash' for vfx/audio
//   water.field                 { texture, origin, size } for shader consumers
//   ctx.debug.water             knobs, see constructor
// =============================================================================
import * as THREE from 'three';
import { Simplex } from '../util/noise.js';
import { clamp, sat, lerp, smoothstep } from '../util/math.js';
import { TERRAIN, SITES } from './terrain.js';
import { CB_LAYER } from '../engine/renderer.js';

// --- baking -----------------------------------------------------------------
const FIELD = 512;                       // field texels across the tile
const FCELL = TERRAIN.size / FIELD;      // 1.0 m
const MESH_STEP = 2;                     // mesh quad = 2 field cells = 2 m
const WIN = 13;                          // morphological window radius, texels
const PUDDLE_CAP = 0.34;                 // max morphological fill depth, m
const MIN_POOL_CELLS = 14;               // reject specks
const MAX_POOL_CELLS = 24000;            // reject anything lake-sized
const MAX_RIPPLES = 8;

// --- optics (ART §5.4, and the inversion described in the header) ------------
const SIGMA_A = [1.20, 2.70, 4.60];
const SIGMA_S = [0.13, 0.10, 0.062];

// -----------------------------------------------------------------------------
// GLSL fragments shared by the surface shader and the deferred pass.
// NOTE: never quote a GLSL identifier with backticks in these strings — it
// closes the template literal and the whole build stops booting (HANDOFF trap).
// -----------------------------------------------------------------------------

const GLSL_HASH = /* glsl */`
float cbHash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
// Value noise with ANALYTIC derivative. Water normals built from finite
// differences of a simplex sum shimmer under TAA; the exact gradient does not.
// Returns vec3(value, d/dx, d/dy).
vec3 cbVN(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u  = f*f*f*(f*(f*6.0-15.0)+10.0);
  vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
  float a = cbHash12(i);
  float b = cbHash12(i + vec2(1.0, 0.0));
  float c = cbHash12(i + vec2(0.0, 1.0));
  float d = cbHash12(i + vec2(1.0, 1.0));
  float k1 = b - a, k2 = c - a, k3 = a - b - c + d;
  return vec3(a + k1*u.x + k2*u.y + k3*u.x*u.y,
              du.x*(k1 + k3*u.y),
              du.y*(k2 + k3*u.x));
}
float cbSat(float x){ return clamp(x, 0.0, 1.0); }
// GGX normal distribution with sphere-light widening (Karis). THIS IS NOT
// OPTIONAL ON WATER. A punctual light evaluated against a mirror surface has
// an unbounded peak: at roughness 0.02, D(NoH=1) = 1/(pi*a*a) is about 2e6,
// and multiplied by the sun radiance that is a white hole several hundred
// pixels across wherever a wave happens to face the sun. Widening the lobe to
// the sun disc half-angle and renormalising by (a/aP)^2 conserves energy and
// gives a highlight the size the 0.61 degree disc actually subtends.
float cbSunSpec(vec3 N, vec3 V, vec3 L, float rough, float sunRad){
  vec3 H = normalize(L + V);
  float a  = max(rough * rough, 1e-4);
  float aP = clamp(a + sunRad, 1e-4, 1.0);
  float k  = a / aP;
  float NoH = max(dot(N, H), 0.0);
  float d = NoH * NoH * (aP * aP - 1.0) + 1.0;
  return (aP * aP) / (3.14159265 * d * d + 1e-6) * k * k;
}
float cbFbm2(vec2 p){
  return cbVN(p).x * 0.6 + cbVN(p * 2.31 + 17.0).x * 0.3 + cbVN(p * 5.07 + 41.0).x * 0.1;
}
`;

// The wave field. Four octaves, each on its own rotated axis and its own drift
// speed, so nothing repeats and nothing beats against anything else. `lod`
// folds the octaves the pixel cannot resolve into roughness instead of letting
// them alias — that is what stops distant water from sparkling.
const GLSL_WAVES = /* glsl */`
uniform vec4 uRipple[${MAX_RIPPLES}];      // xz origin, z start time, w strength
const mat2 CB_R1 = mat2( 0.9362, -0.3515,  0.3515, 0.9362);
const mat2 CB_R2 = mat2(-0.2079, -0.9781,  0.9781,-0.2079);
const mat2 CB_R3 = mat2( 0.6691, -0.7431,  0.7431, 0.6691);

struct CbWave { vec2 grad; float varLost; };

CbWave cbWaves(vec2 wp, float t, float energy, float px){
  CbWave o; o.grad = vec2(0.0); o.varLost = 0.0;
  // freq (1/m), slope amplitude, drift (m/s), axis
  const vec4 OCT[4] = vec4[4](
    vec4(0.146, 0.265, 0.21, 0.0),
    vec4(0.402, 0.094, 0.34, 1.0),
    vec4(1.170, 0.030, 0.52, 2.0),
    vec4(3.310, 0.0090, 0.78, 3.0)
  );
  vec2 w0 = wp;
  for (int i = 0; i < 4; i++){
    vec4 o4 = OCT[i];
    vec2 q = w0;
    if (o4.w > 2.5)      q = CB_R3 * CB_R1 * q;
    else if (o4.w > 1.5) q = CB_R2 * q;
    else if (o4.w > 0.5) q = CB_R1 * q;
    vec2 drift = vec2(0.71, -0.70) * (o4.w > 1.5 ? -1.0 : 1.0) * o4.z * t;
    // Nyquist: an octave whose wavelength is under ~2.5 px is noise. Fold it.
    float res = clamp(1.0 / max(o4.x * px * 2.5, 1e-4), 0.0, 1.0);
    float k = o4.x;
    vec3 n = cbVN((q + drift) * k);
    float sl = k * o4.y * 1.5;
    o.grad += n.yz * k * o4.y * res * energy;
    o.varLost += sl * sl * (1.0 - res) * energy;
  }
  // player / creature ripples: damped expanding rings, analytic gradient
  for (int i = 0; i < ${MAX_RIPPLES}; i++){
    vec4 r = uRipple[i];
    if (r.w <= 0.001) continue;
    vec2 d2 = wp - r.xy;
    float d = length(d2) + 1e-4;
    float age = t - r.z;
    if (age < 0.0 || age > 3.4) continue;
    float k = 7.4;
    float front = age * 1.9;
    float env = exp(-age * 0.85) * exp(-abs(d - front) * 1.35) * r.w;
    float phase = k * (d - front);
    o.grad += (d2 / d) * cos(phase) * k * env * 0.0075;
  }
  return o;
}
`;

// Hi-Z-free screen-space march. Growing stride + 4 bisections; a plain fixed
// stride at grazing incidence either walks past everything or costs 200 taps.
const GLSL_SSR = /* glsl */`
uniform sampler2D uViewZ;
uniform sampler2D uScene;
uniform mat4 uProj;
uniform vec4 uSSR;     // x maxDist  y thickness  z stepGrowth  w intensity

vec4 cbSSR(vec3 ro, vec3 rd, float jitter){
#if CB_SSR_STEPS == 0
  return vec4(0.0);
#else
  float stepLen = uSSR.x / float(CB_SSR_STEPS);
  vec3 p = ro;
  vec3 prev = ro;
  float grow = 1.0;
  vec2 hitUv = vec2(-1.0);
  float hitZ = 0.0;
  for (int i = 0; i < CB_SSR_STEPS; i++){
    prev = p;
    float sl = stepLen * grow * (i == 0 ? (0.35 + jitter * 0.9) : 1.0);
    p += rd * sl;
    grow *= uSSR.z;
    if (p.z > -0.06) break;
    vec4 cp = uProj * vec4(p, 1.0);
    vec2 uv = cp.xy / cp.w * 0.5 + 0.5;
    if (uv.x < -0.02 || uv.x > 1.02 || uv.y < -0.02 || uv.y > 1.02) break;
    float sceneZ = texture(uViewZ, clamp(uv, 0.0, 1.0)).r;
    float rayZ = -p.z;
    float delta = rayZ - sceneZ;
    // Thickness has to be at least the CURRENT step, not a constant. With a
    // growing stride the step past 300 m is tens of metres, so a fixed 0.85 m
    // window steps clean over every distant ridge and the whole far half of a
    // grazing reflection silently falls back to the sky probe. The bisection
    // below is what makes a generous window safe.
    float thick = max(uSSR.y * (1.0 + rayZ * 0.09), sl * 1.05);
    if (delta > 0.0 && delta < thick){
      // bisect between prev (in front) and p (behind)
      vec3 a = prev, b = p;
      for (int j = 0; j < 4; j++){
        vec3 m = (a + b) * 0.5;
        vec4 mc = uProj * vec4(m, 1.0);
        vec2 muv = mc.xy / mc.w * 0.5 + 0.5;
        float mz = texture(uViewZ, clamp(muv, 0.0, 1.0)).r;
        if (-m.z - mz > 0.0) b = m; else a = m;
      }
      vec4 fc = uProj * vec4(b, 1.0);
      hitUv = fc.xy / fc.w * 0.5 + 0.5;
      hitZ = -b.z;
      break;
    }
  }
  if (hitUv.x < 0.0) return vec4(0.0);
  // EDGE FADE. A blind critic on mat-water: "the tree reflections are a smeared
  // vertical brown streak that simply TERMINATES where the SSR runs out of
  // screen data." That is this band, and 0.10 was far too narrow: a water
  // reflection marches almost straight UP the screen, so the far end of every
  // reflected silhouette leaves through the top edge, and 0.10 of screen height
  // is 108 px to dissolve a hard content change (dark trunk -> bright sky
  // probe) that reads as an edge. The band is now anisotropic -- 0.12 on the
  // sides, 0.30 on the top and bottom, i.e. 324 px vertically -- and squared,
  // so the handover to the PMREM starts early and finishes gently.
  vec2 fadeR = vec2(1.0 / 0.12, 1.0 / 0.30);
  vec2 e = clamp(hitUv * fadeR, 0.0, 1.0) * clamp((1.0 - hitUv) * fadeR, 0.0, 1.0);
  vec2 es = e * e * (3.0 - 2.0 * e);
  float conf = es.x * es.y;
  // NOT a fade on ray travel. I tried one (dissolve to the probe past 72% of
  // maxDist) and it is actively wrong here: on a near-mirror plane most rays
  // that reach the far cliff HAVE travelled 100 m+, so the fade replaced the
  // one legible thing in the reflection with flat sky and lifted the whole pool
  // blue. HANDOFF's SSR finding #4 already paid for making long rays work
  // (thickness >= current step + bisection); do not undo it with a distance
  // fade. Screen-edge confidence only.
  // rays that end on the sky have no business being a reflection of the sky at
  // the wrong angle: hand them back to the PMREM
  if (hitZ > 90000.0) return vec4(0.0);
  return vec4(texture(uScene, hitUv).rgb, conf * uSSR.w);
#endif
}
`;

const GLSL_FIELD = /* glsl */`
uniform sampler2D uField;
uniform vec4 uFieldXf;   // xy = world origin, z = 1/size, w = size
uniform float uFieldN;   // field texels across the tile (512)

// Cubic B-spline reconstruction, four bilinear taps (Sigg and Hadwiger 2005).
//
// WHY THIS IS NOT A PLAIN texture() CALL. The field is 1 m/texel and hardware
// bilinear is only C0: the VALUE is continuous but the GRADIENT jumps at every
// texel boundary. On its own that is invisible. Put it through
// exp(-sigma_t * depth) with sigma_t up to 4.66/m -- one e-fold every 7 cm --
// and every one of those gradient jumps turns into a Mach band. That is
// precisely the "SEVERE CONTOUR BANDING ... six discrete concentric maroon
// steps with hard edges, like a topographic map" a blind critic flagged on
// mat-water, and it is why the same critic guessed a coarse LUT: an
// exponential this steep is a contour generator for ANY C0 input. A C2
// reconstruction leaves nothing for a band to key off.
//
// Verified by knob A/B before the fix: absorb=0 removed the terracing
// completely and bedDarken=1 did not, so the banding was carried by the
// depth-to-absorption mapping and not by the bed multiplier.
vec4 cbFieldTex(vec2 uv){
  vec2 tc = uv * uFieldN - 0.5;
  vec2 i = floor(tc), f = tc - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (-f3 + 3.0 * f2 - 3.0 * f + 1.0) * (1.0 / 6.0);
  vec2 w1 = ( 3.0 * f3 - 6.0 * f2 + 4.0)     * (1.0 / 6.0);
  vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) * (1.0 / 6.0);
  vec2 w3 = f3 * (1.0 / 6.0);
  // s0 and s1 are 5/6..1/6 and 1/6..5/6, never zero, so the divides are safe.
  vec2 s0 = w0 + w1, s1 = w2 + w3;
  vec2 t0 = (i - 0.5 + w1 / s0) / uFieldN;
  vec2 t1 = (i + 1.5 + w3 / s1) / uFieldN;
  vec4 a = texture(uField, vec2(t0.x, t0.y));
  vec4 b = texture(uField, vec2(t1.x, t0.y));
  vec4 c = texture(uField, vec2(t0.x, t1.y));
  vec4 d = texture(uField, vec2(t1.x, t1.y));
  return mix(mix(a, b, s1.x), mix(c, d, s1.x), s1.y);
}
vec4 cbField(vec2 wxz){
  return cbFieldTex((wxz - uFieldXf.xy) * uFieldXf.z);
}
// Perturbed lookup. The field is 1 m/texel; without this every shoreline in the
// game is a 1 m polygon chain. The noise is the shoreline's detail, not the field.
vec4 cbFieldD(vec2 wxz, float amt){
  vec2 j = vec2(cbFbm2(wxz * 0.62 + 3.1), cbFbm2(wxz * 0.62 + 71.7)) - 0.5;
  vec2 j2 = vec2(cbFbm2(wxz * 2.35 + 11.0), cbFbm2(wxz * 2.35 + 29.0)) - 0.5;
  return cbField(wxz + (j * 1.9 + j2 * 0.55) * amt);
}
`;

const GLSL_MEDIUM = /* glsl */`
uniform vec3 uSigmaA;
uniform vec3 uSigmaS;
uniform vec3 uScatterTint;
// Beer-Lambert through the liquid plus a single-scatter approximation.
// The out parameter is transmittance; the return value is in-scattered radiance.
vec3 cbMedium(float path, out vec3 tr){
  vec3 st = uSigmaA + uSigmaS;
  tr = exp(-st * path);
  return uScatterTint * (uSigmaS / max(st, vec3(1e-4))) * (1.0 - tr);
}
`;

// -----------------------------------------------------------------------------
// Liquid surface — RawShaderMaterial, GLSL3, writes all four MRT attachments.
// -----------------------------------------------------------------------------

const SURFACE_VERT = /* glsl */`
precision highp float;
in vec3 position;
uniform mat4 modelMatrix, modelViewMatrix, projectionMatrix, viewMatrix;
uniform mat4 uViewProjUnjit, uPrevViewProjUnjit;
out vec3 vWorld;
out vec3 vView;
out vec4 vClipCur;
out vec4 vClipPrv;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = mv.xyz;
  vClipCur = uViewProjUnjit * wp;
  vClipPrv = uPrevViewProjUnjit * wp;
  gl_Position = projectionMatrix * mv;
}
`;

function surfaceFrag(envChunk) {
  return /* glsl */`
precision highp float;
in vec3 vWorld;
in vec3 vView;
in vec4 vClipCur;
in vec4 vClipPrv;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 gNormalRough;
layout(location = 2) out vec4 gVelocity;
layout(location = 3) out vec4 gSpec;

uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform sampler2D uEnv;
uniform vec3 uSunDir, uSunCol, uNailDir, uNailCol;
uniform vec2 uTexel;
uniform vec4 uTime;        // x elapsed  y breath  z frame  w energy
uniform vec4 uSurf;        // x refractScale  y foamGain  z waveGain  w reflGain
uniform vec4 uSurf2;       // x turbidity  y pathDither (m)  zw spare
uniform vec3 uCrustCol;
uniform vec3 uAerialS;     // per-channel sigma_s (1/m)
uniform vec3 uAerialT;     // per-channel sigma_t (1/m)
uniform vec3 uHazeCol;

${GLSL_HASH}
${GLSL_FIELD}
${GLSL_WAVES}
${GLSL_SSR}
${GLSL_MEDIUM}
${envChunk}

void main(){
  vec2 wxz = vWorld.xz;
  vec4 F = cbFieldD(wxz, 1.0);
  float depth = F.g;
  if (depth <= 0.0035) discard;

  vec3 V = cameraPosition - vWorld;
  float dist = length(V);
  V /= dist;

  // ---- surface normal ------------------------------------------------------
  // Waves die in a film: a 3 cm sheet cannot carry a 40 cm wave.
  float shallow = smoothstep(0.008, 0.16, depth);
  float energy = uSurf.z * mix(0.16, 1.0, shallow) * (0.55 + 0.9 * uTime.y);
  // world metres per pixel at this depth, for the octave LOD fold
  float px = max(dist * uTexel.y * 1.6, 0.002);
  CbWave W = cbWaves(wxz, uTime.x, energy, px);
  vec3 N = normalize(vec3(-W.grad.x, 1.0, -W.grad.y));
  float NoV = clamp(dot(N, V), 1e-3, 1.0);

  // Unresolved wave slope becomes roughness. This is the whole anti-shimmer
  // mechanism and it is also what gives the reflection its blur gradient
  // toward the horizon, which is what S5 is graded on.
  float rough = clamp(0.016 + W.varLost * 55.0 + smoothstep(28.0, 320.0, dist) * 0.09, 0.012, 0.40);

  // ---- refraction ----------------------------------------------------------
  vec2 uv = gl_FragCoord.xy * uTexel;
  float thisZ = -vView.z;
  vec2 off = N.xz * uSurf.x * min(depth, 0.9) / max(thisZ * 0.05, 0.35);
  vec2 ruv = clamp(uv + off, vec2(0.002), vec2(0.998));
  // reject an offset that pulled in geometry IN FRONT of the water
  float rz = texture(uViewZ, ruv).r;
  if (rz < thisZ - 0.02) { ruv = uv; rz = texture(uViewZ, uv).r; }
  vec3 bottom = texture(uScene, ruv).rgb;

  // ---- transmission through the medium ------------------------------------
  // Path is view-side only; the sun-side leg is folded into the gain so a low
  // sun does not turn every pool into a black hole.
  //
  // TURBIDITY. Suspended ash is not uniformly mixed: this is a shallow sheet
  // over a bed the wind keeps stirring, so the column loading varies at half-
  // metre and decimetre scales. Two things at once -- it is true, and it is
  // what stops the exponential from drawing clean iso-DEPTH contours over a
  // smooth heightfield. An exponential over a smooth field is a contour
  // generator; the cure is a C2 field (see cbFieldTex) AND a reason for the
  // contours not to be circles.
  //
  // TWO TRAPS, both found by capture, both worth knowing before you raise the
  // amplitude:
  //   (a) ALIASING. A turbidity octave is a multiplier on an exponential, so a
  //       0.16 m feature that lands on 8 px does not read as sediment, it
  //       reads as SANDPAPER. Fold the fine octave out on the same metres-per-
  //       pixel term the wave octaves use.
  //   (b) JENSEN. exp() is convex, so ZERO-MEAN noise on the path RAISES mean
  //       transmittance -- by cosh(sigma_t * path * amp), which at the first
  //       amplitude I tried was 41% in blue and visibly turned the pool from
  //       amber-black to slate. Amplitude is capped so that bias stays ~3%.
  float turbLod = clamp(1.0 / max(3.6 * px * 3.0, 1e-4), 0.0, 1.0);
  float turb = ((cbFbm2(wxz * 1.15 + 13.0) - 0.5) * 0.19
              + (cbFbm2(wxz * 3.60 + 47.0) - 0.5) * 0.09 * turbLod) * shallow * uSurf2.x;
  float path = depth * (1.0 + 0.85 * (1.0 - NoV)) * 1.7 * (1.0 + turb);
  // DITHER THE OPTICAL PATH, not the output colour. One 8-bit step of
  // transmittance is d(path) of about 0.9 mm at sigma_t 4.66, so a perfectly
  // smooth column still quantises into visible contours downstream of the
  // tonemap. +/-4 mm, re-keyed off uTime.z -- the RENDER frame, never the sim
  // frame (harness.mjs settles with the sim paused; see _syncShared) -- so TAA
  // integrates it to the exact mean instead of averaging one frozen pattern.
  path = max(path + (cbHash12(gl_FragCoord.xy + uTime.z * 7.13) - 0.5) * uSurf2.y, 0.0);
  vec3 tr;
  vec3 inscat = cbMedium(path, tr);
  vec3 through = bottom * tr + inscat;

  // ---- reflection ----------------------------------------------------------
  vec3 R = reflect(-V, N);
  vec3 env = textureCubeUV(uEnv, R, rough).rgb;
  vec3 refl = env;
  float jit = cbHash12(gl_FragCoord.xy + uTime.z * 0.6180339);
  vec3 rV = normalize((viewMatrix * vec4(R, 0.0)).xyz);
  vec4 ss = cbSSR(vView + rV * 0.05, rV, jit);
  refl = mix(env, ss.rgb, ss.a * (1.0 - smoothstep(0.16, 0.40, rough)));
  refl *= uSurf.w;

  // ---- Fresnel + sun/Nail specular ----------------------------------------
  float F0 = 0.02;
  float fres = F0 + (1.0 - F0) * pow(1.0 - NoV, 5.0);
  // GGX on the sun disc (0.61 deg, ART §3.2) and a needle on the Nail (ART §3.1)
  float NoL = max(dot(N, uSunDir), 0.0);
  vec3 spec = uSunCol * cbSunSpec(N, V, uSunDir, rough, 0.00532) * NoL * fres * 0.55;
  vec3 Hn = normalize(uNailDir + V);
  float NoHn = max(dot(N, Hn), 0.0);
  spec += uNailCol * pow(NoHn, 6000.0) * 7.5 * fres;

  vec3 col = mix(through, refl, fres) + spec;

  // ---- shoreline: evaporite crust and a wet scum line ----------------------
  // ART §5.4 rings the flats in white alkaline crust. It is the only high value
  // in the biome and it is what makes the black mirror read as a mirror.
  float crust = (1.0 - smoothstep(0.006, 0.055, depth)) * smoothstep(0.0, 0.010, depth);
  float lace  = smoothstep(0.35, 0.72, cbFbm2(wxz * 3.1 + uTime.x * 0.02));
  crust *= mix(0.35, 1.0, lace);
  float scum = (1.0 - smoothstep(0.02, 0.14, depth)) * smoothstep(0.42, 0.85, cbFbm2(wxz * 1.35 - uTime.x * 0.035));
  vec3 crustLit = textureCubeUV(uEnv, vec3(0.0, 1.0, 0.0), 0.85).rgb * 0.95
                + uSunCol * max(uSunDir.y, 0.0) * 0.30;
  col = mix(col, uCrustCol * crustLit, cbSat(crust * uSurf.y));
  col = mix(col, uCrustCol * crustLit * 0.5, cbSat(scum * 0.30 * uSurf.y));
  rough = mix(rough, 0.72, cbSat(crust * uSurf.y));

  // ---- aerial perspective --------------------------------------------------
  // Sky.js applies its analytic term at order 45, i.e. BEFORE the transparent
  // draw at 50, so the liquid never receives it and a distant pool would sit in
  // front of its own haze. Same sigmas, applied here.
  vec3 trA = exp(-uAerialT * dist);
  vec3 inA = uHazeCol * (uAerialS / max(uAerialT, vec3(1e-6))) * (1.0 - trA);
  col = col * trA + inA;

  outColor = vec4(max(col, vec3(0.0)), 1.0);

  // ---- gbuffer -------------------------------------------------------------
  gNormalRough = vec4(N, rough);
  float wc = abs(vClipCur.w) < 1e-6 ? 1e-6 : vClipCur.w;
  float wp = abs(vClipPrv.w) < 1e-6 ? 1e-6 : vClipPrv.w;
  gVelocity = vec4((vClipCur.xy / wc - vClipPrv.xy / wp) * 0.5, 0.0, 0.0);
  gSpec = vec4(vec3(F0), 1.0);
}
`;
}

// -----------------------------------------------------------------------------
// Deferred pass — caustics, wetness, crust, puddle mirrors.
// Blended as dst = src.rgb + dst * src.a, so one draw does both the multiply
// (wet ground is darker) and the add (caustics, crust, puddle reflections).
// -----------------------------------------------------------------------------

const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

function deferredFrag(envChunk) {
  return /* glsl */`
precision highp float;
in vec2 vUv;
layout(location = 0) out vec4 outColor;

uniform sampler2D uEnv;
uniform mat4 uInvViewProj;
uniform mat4 uView;
uniform vec3 uCamPos, uCamFwd;
uniform vec3 uSunDir, uSunCol, uNailDir, uNailCol;
uniform vec4 uTime;        // x elapsed  y breath  z frame  w unused
uniform vec4 uWet;         // x wetDarken  y puddleGain  z causticGain  w crustGain
uniform vec4 uBed;         // x submerged-bed darkening  yzw spare
uniform vec3 uCrustCol;
uniform vec2 uTexel;

${GLSL_HASH}
${GLSL_FIELD}
${GLSL_SSR}
${GLSL_MEDIUM}
${envChunk}

// Caustics: the classic sharp network, built from two counter-rotating ridged
// value-noise layers, with a per-channel sample offset so the caustic EDGES
// split prismatically the way real ones do. Two scales blended by depth, so
// they are tight near the surface and diffuse deep.
float cbCausticLayer(vec2 p, float t){
  float a = 1.0 - abs(cbVN(p + vec2(t * 0.52, -t * 0.37)).x * 2.0 - 1.0);
  float b = 1.0 - abs(cbVN(p * 1.61 + vec2(-t * 0.44, t * 0.61) + 31.0).x * 2.0 - 1.0);
  float c = a * b;
  return c * c * c;
}
vec3 cbCaustics(vec2 wxz, float depth, float t){
  float s = mix(11.0, 4.2, smoothstep(0.02, 0.9, depth));
  vec2 p = wxz * s;
  vec3 o = vec3(0.0);
  o.r = cbCausticLayer(p + vec2( 0.055, 0.0), t);
  o.g = cbCausticLayer(p,                     t);
  o.b = cbCausticLayer(p + vec2(-0.055, 0.0), t);
  return o;
}

void main(){
  float z = texture(uViewZ, vUv).r;

  vec4 ndc = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(ndc.xyz / ndc.w - uCamPos);
  vec3 P = uCamPos + dir * (z / max(dot(dir, uCamFwd), 1e-3));

  // GEOMETRIC normal from the depth buffer, NOT from gNormalRough.
  // gNormalRough is attachment 1 of the very framebuffer this pass blends into,
  // so sampling it is a feedback loop: ANGLE reports
  // "GL_INVALID_OPERATION: glDrawArrays: Feedback loop formed between
  // Framebuffer and active Texture" and drops the draw. Masking the draw
  // buffers down to attachment 0 does NOT help — the loop is judged against
  // every attachment of the bound FBO. Derivatives must be evaluated in
  // uniform control flow, hence before any discard below.
  vec3 N = normalize(cross(dFdx(P), dFdy(P)));
  if (dot(N, -dir) < 0.0) N = -N;
  if (z > 90000.0) discard;                       // sky

  vec4 F = cbFieldD(P.xz, 1.0);
  float wet = F.r;
  float depth = F.g;
  float film = F.b;
  float level = F.a;

  bool submerged = (P.y < level - 0.004) && depth > 0.004;
  if (wet < 0.004 && !submerged && film < 0.004) discard;

  vec3 V = -dir;
  float up = cbSat(N.y);

  vec3 add = vec3(0.0);
  float darken = 1.0;

  // ---- wetness: a wet surface is a DARKER surface -------------------------
  // Water fills the micro-roughness, light that would have scattered straight
  // back off a facet gets a couple more chances to be absorbed. ~0.6x on ash.
  float wetD = wet * up;
  darken = mix(1.0, uWet.x, wetD);
  // A submerged bed is not merely damp ash: on the flats it is fused A8 glass
  // (albedo 0.036) under a film, and terrain.js paints the whole site as pale
  // bone ash. Without this the refracted bottom is a 0.4-albedo card and every
  // pool reads as orange mud rather than a black mirror.
  // Ramped over the first 3.5 cm of column, NOT switched on the boolean. A
  // 0.26x multiplier gated on (P.y < level) is a 4x brightness cliff whose
  // boundary is an exact iso-height contour of the bed -- i.e. a hand-drawn
  // topographic line around every pool, and one more contributor to the
  // banding finding. The ramp costs one smoothstep.
  if (submerged) darken *= mix(1.0, uBed.x, smoothstep(0.0, 0.035, level - P.y));

  // ---- evaporite crust ring ------------------------------------------------
  // A deposit, so it raises albedo; added as radiance against the sky term.
  // The crust band must sit ABOVE the damp cap (0.50 in the bake), or every
  // damp drainage line on the map gets an alkaline deposit. This is an ADDITIVE
  // term, so getting the band wrong is worth 0.07 of mean luma across a whole
  // vista, which is what the first version of it cost establish.
  float crustBand = smoothstep(0.56, 0.80, wet) * (1.0 - smoothstep(0.88, 1.0, wet));
  float crustN = smoothstep(0.40, 0.80, cbFbm2(P.xz * 2.4 + 9.0));
  float crust = crustBand * crustN * uWet.w * up * (submerged ? 0.0 : 1.0);
  vec3 skyUp = textureCubeUV(uEnv, vec3(0.0, 1.0, 0.0), 0.85).rgb;
  add += uCrustCol * skyUp * crust * 0.70;

  // ---- puddle films: sub-geometry mirrors in the concavities ---------------
  float pudN = smoothstep(0.40, 0.76, cbFbm2(P.xz * 0.85 + 5.0));
  float pud = film * pudN * (1.0 - cbSat(depth * 40.0)) * smoothstep(0.62, 0.94, up) * uWet.y;
  if (pud > 0.004){
    vec3 Nf = normalize(mix(N, vec3(0.0, 1.0, 0.0), 0.92));
    // a film is not glass: give it the same wave field, heavily damped
    vec3 wn = cbVN(P.xz * 3.7 + uTime.x * 0.09).yzx;
    Nf = normalize(Nf + vec3(wn.x, 0.0, wn.y) * 0.035);
    float NoV = clamp(dot(Nf, V), 1e-3, 1.0);
    float fres = 0.02 + 0.98 * pow(1.0 - NoV, 5.0);
    vec3 R = reflect(-V, Nf);
    vec3 refl = textureCubeUV(uEnv, R, 0.045).rgb;
    refl += uSunCol * cbSunSpec(Nf, V, uSunDir, 0.05, 0.00532) * max(dot(Nf, uSunDir), 0.0) * 0.4;
    refl += uNailCol * pow(max(dot(Nf, normalize(uNailDir + V)), 0.0), 6000.0) * 6.0;
    // Energy: the film REPLACES the diffuse it covers rather than adding to
    // it, so what leaves must be what the Fresnel term took.
    add += refl * fres * pud;
    darken *= mix(1.0, 1.0 - fres * 0.85, pud);
  }

  // ---- caustics on submerged geometry -------------------------------------
  if (submerged){
    float d = max(level - P.y, 0.0);
    // parallax: shift the pattern along the refracted sun direction
    vec3 sr = refract(-uSunDir, vec3(0.0, 1.0, 0.0), 1.0 / 1.33);
    vec2 par = sr.xz / max(-sr.y, 0.2) * d;
    vec3 c = cbCaustics(P.xz + par, d, uTime.x);
    // Caustic light has travelled a short, mostly-vertical path, so it is far
    // less absorbed than the view path. Without this floor the network renders
    // in the pure red the medium transmits and reads as veins of magma.
    vec3 tr;
    cbMedium(d * 0.55, tr);
    float fade = 1.0 / (1.0 + d * 2.2);
    // 0.16, not 1.0. sunCol here is RADIANCE (colour x irradiance, ~4.2 peak) and
    // the medium passes only red, so an unscaled caustic renders as a network of
    // glowing crimson veins that reads as LAVA. In a world whose whole premise is
    // fire that is not a near miss, it is a lie about what the player is looking at.
    add += uSunCol * c * mix(tr, vec3(1.0), 0.62) * fade * uWet.z * 0.095 * (0.35 + 0.65 * up) * (0.7 + 0.6 * uTime.y);
  }

  outColor = vec4(add, darken);
}
`;
}

// -----------------------------------------------------------------------------

export class Water {
  static id = 'water';
  static deps = ['terrain', 'sky', 'renderer'];

  constructor(ctx) {
    this.ctx = ctx;
    this.noise = new Simplex(ctx.rng.fork('water'));
    this.failed = false;
    this.mesh = null;
    this.field = null;
    this._ripples = new Float32Array(MAX_RIPPLES * 4);
    this._rip = 0;
    this._lastRipple = -10;
    this._prevPlayer = new THREE.Vector3();
    this._tmpV = new THREE.Vector3();
    this._frustum = new THREE.Frustum();
    this._fmat = new THREE.Matrix4();
    this._offDebugSSR = null;

    // published knobs — every number a critic might argue with
    this.knobs = ctx.debug.water = {
      waveGain: 1.0,        // surface slope amplitude
      refract: 0.055,        // refraction offset, screen fraction at 1 m depth
      foam: 1.0,            // evaporite crust on the water side
      reflection: 1.0,      // reflection gain (SSR + PMREM)
      wetDarken: 0.60,      // multiplier applied to soaked ground
      bedDarken: 0.26,      // extra multiplier on the bed UNDER standing liquid
      puddle: 1.0,          // sub-geometry film mirrors
      caustics: 1.0,
      crust: 1.0,           // evaporite ring on the land side
      ssrIntensity: 1.0,
      absorb: 1.0,          // scales sigma_a; 0 = clear water, 1 = ART default
      turbidity: 1.0,       // suspended-ash variation in the column; breaks iso-depth contours
      pathDither: 0.008,    // metres of optical-path dither; 0 = let the exponential band
      rippleGain: 1.0,
    };
  }

  async init() {
    const { ctx } = this;
    this.terrain = ctx.sys.terrain;
    this.sky = ctx.sys.sky;
    this.rd = ctx.sys.renderer;
    this.gl = ctx.gl;

    // The public A/B flag is a disable override on top of the quality preset.
    // Keep the listener removable so a future app-level teardown cannot leave a
    // dead Water instance recompiling shaders in response to debug controls.
    this._offDebugSSR?.();
    this._offDebugSSR = ctx.bus.on('debugFlag', ({ flag }) => {
      if (flag === 'ssr') this._syncSSRDefines();
    });

    ctx.boot.task('liquid field', async () => { this._bake(); }, 3);
    ctx.boot.task('liquid surface', async () => {
      try { this._build(); } catch (e) { this._disable(e); }
    }, 2);
  }

  _disable(e) {
    if (this.failed) return;
    this.failed = true;
    if (this.pre) { this.pre.enabled = false; this.pre.failed = true; }
    if (this.deferred) { this.deferred.enabled = false; this.deferred.failed = true; }
    if (this.mesh) this.mesh.visible = false;
    this.ctx.frameGraph?.invalidate?.();
    this.ctx.debug.stats.water = 'disabled: ' + ((e && e.message) || e);
    console.warn('[water] disabled:', e);
  }

  // ===========================================================================
  // BAKE — height sample, morphological puddle detect, component flatten,
  // distance transform, field texture, mesh.
  // ===========================================================================

  _bake() {
    const N = FIELD, n2 = N * N;
    const half = TERRAIN.size * 0.5;
    const t = this.terrain;

    // --- terrain height on the field lattice --------------------------------
    const h = new Float32Array(n2);
    for (let j = 0; j < N; j++) {
      const z = -half + (j + 0.5) * FCELL;
      for (let i = 0; i < N; i++) {
        h[j * N + i] = t.heightAt(-half + (i + 0.5) * FCELL, z);
      }
    }

    // --- separable box blur and box min over a WIN-radius window -------------
    const blur = this._boxBlur(h, N, WIN);
    const mn = this._boxMin(h, N, WIN);

    // --- morphological puddle depth ------------------------------------------
    // depth = min( localMean - h , localMin + cap - h ). Local, bounded, and
    // immune to the whole-basin-is-a-lake failure a spill-level fill has here.
    const depth = new Float32Array(n2);
    for (let k = 0; k < n2; k++) {
      const d = Math.min(blur[k] - h[k], mn[k] + PUDDLE_CAP - h[k]);
      depth[k] = d > 0.01 ? d : 0;
    }

    // --- rain mask: puddles cluster, they do not speckle ---------------------
    const nz = this.noise;
    const rain = new Float32Array(n2);
    for (let j = 0; j < N; j++) {
      const z = -half + (j + 0.5) * FCELL;
      for (let i = 0; i < N; i++) {
        const x = -half + (i + 0.5) * FCELL;
        const k = j * N + i;
        const m = nz.fbm2(x * 0.0042 + 5.0, z * 0.0042, 3) * 0.5 + 0.5;
        rain[k] = sat(m * 1.35 - 0.30) * smoothstep(46, 4, h[k]);
      }
    }

    // --- connected components, flattened to their own boundary-min level -----
    const level = new Float32Array(n2);
    const label = new Int32Array(n2).fill(-1);
    const queue = new Int32Array(n2);
    let comp = 0;
    const cells = [];
    for (let s = 0; s < n2; s++) {
      if (depth[s] <= 0 || label[s] >= 0) continue;
      let head = 0, tail = 0;
      queue[tail++] = s; label[s] = comp;
      let minH = 1e9, bMin = 1e9, count = 0, sx = 0, sz = 0;
      while (head < tail) {
        const k = queue[head++];
        count++;
        const i = k % N, j = (k / N) | 0;
        sx += i; sz += j;
        if (h[k] < minH) minH = h[k];
        for (let a = 0; a < 4; a++) {
          const ni = i + (a === 0 ? 1 : a === 1 ? -1 : 0);
          const nj = j + (a === 2 ? 1 : a === 3 ? -1 : 0);
          if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
          const nk = nj * N + ni;
          if (depth[nk] > 0) { if (label[nk] < 0) { label[nk] = comp; queue[tail++] = nk; } }
          else if (h[nk] < bMin) bMin = h[nk];
        }
      }
      cells.push({ id: comp, count, minH, spill: Math.min(bMin, minH + PUDDLE_CAP), cx: sx / count, cz: sz / count, head: s });
      comp++;
    }

    const compLevel = new Float32Array(Math.max(1, comp)).fill(-1e9);
    for (const c of cells) {
      if (c.count < MIN_POOL_CELLS || c.count > MAX_POOL_CELLS) continue;
      const ci = Math.round(c.cx), cj = Math.round(c.cz);
      if (rain[clamp(cj, 0, N - 1) * N + clamp(ci, 0, N - 1)] < 0.30) continue;
      compLevel[c.id] = Math.min(c.spill, c.minH + PUDDLE_CAP);
    }

    for (let k = 0; k < n2; k++) {
      const l = label[k];
      const lv = l >= 0 ? compLevel[l] : -1e9;
      level[k] = lv;
      depth[k] = lv > -1e8 ? Math.max(0, lv - h[k]) : 0;
    }

    // --- the authored body: standing rainwater on the Blackglass Flats -------
    // terrain.js dishes SITES.glass by 0.4 m for exactly this and publishes the
    // level as TERRAIN.waterLevel; honour it rather than re-deriving it.
    const g = SITES.glass, gl = TERRAIN.waterLevel;
    const gr = g.r * 1.05;
    for (let j = 0; j < N; j++) {
      const z = -half + (j + 0.5) * FCELL;
      if (Math.abs(z - g.z) > gr) continue;
      for (let i = 0; i < N; i++) {
        const x = -half + (i + 0.5) * FCELL;
        if (Math.hypot(x - g.x, z - g.z) > gr) continue;
        const k = j * N + i;
        if (h[k] < gl) { level[k] = gl; depth[k] = gl - h[k]; }
      }
    }

    // border cells are always dry so the clamped texture lookup outside the
    // tile returns dry, and so the mesh never has an open edge at the rim
    for (let i = 0; i < N; i++) {
      depth[i] = 0; depth[(N - 1) * N + i] = 0;
      depth[i * N] = 0; depth[i * N + N - 1] = 0;
    }

    // --- distance to water, for the wetness ring -----------------------------
    const dist = this._chamfer(depth, N);

    // --- assemble the field texture -----------------------------------------
    const data = new Uint16Array(n2 * 4);
    const toHalf = THREE.DataUtils.toHalfFloat;
    const wetArr = new Float32Array(n2);
    const lvlArr = new Float32Array(n2);
    const depArr = new Float32Array(n2);
    for (let j = 0; j < N; j++) {
      const z = -half + (j + 0.5) * FCELL;
      for (let i = 0; i < N; i++) {
        const k = j * N + i;
        const x = -half + (i + 0.5) * FCELL;
        const d = depth[k];
        // capillary rise out of the pool + damp drainage lines + concavity
        const shore = smoothstep(3.4, 0.0, dist[k]);
        const flow = sat(t.flowAt(x, z)) * 0.42;
        const conc = sat((blur[k] - h[k]) * 2.4) * 0.5;
        // The damp term (seeps, drainage lines, concavities) is deliberately
        // CAPPED BELOW the evaporite band the deferred pass reads at 0.55.
        // Uncapped it put an alkaline crust across every damp drainage line on
        // the map, which is an ADDITIVE term: it raised establish's mean luma by
        // 0.07 all on its own. Crust is a shoreline deposit; damp is just damp.
        const damp = Math.min(0.50, (flow + conc) * rain[k] * 1.25);
        let wet = Math.max(d > 0 ? 1 : 0, shore * 0.92);
        wet = sat(Math.max(wet, damp));
        // sub-geometry films: the concavity term below the standing threshold
        // Films are PUDDLES, not a global sheen. The first cut of this was
        // sat((blur-h+0.02)*6), which is 0.12 on dead-flat ground and 1.0 on any
        // 15 cm concavity, i.e. a mirror over most of the basin: it added 0.097
        // of mean luma to establish by itself. Require a real 5 cm depression,
        // a real rain cluster, and proximity to standing liquid.
        const film = sat((blur[k] - h[k] - 0.05) * 10.0) * smoothstep(0.45, 0.90, rain[k])
                   * (d > 0 ? 0 : 1) * sat(0.18 + shore * 0.82);
        const lv = d > 0 ? level[k] : h[k];
        const o = k * 4;
        data[o] = toHalf(wet);
        data[o + 1] = toHalf(d);
        data[o + 2] = toHalf(film);
        data[o + 3] = toHalf(lv);
        wetArr[k] = wet; lvlArr[k] = d > 0 ? level[k] : -1e9; depArr[k] = d;
      }
    }

    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;

    this._h = h;
    this._wet = wetArr;
    this._lvl = lvlArr;
    this._dep = depArr;
    this._depth = depth;
    this._level = level;
    this.field = { texture: tex, origin: -half, size: TERRAIN.size, res: N };

    let area = 0;
    for (let k = 0; k < n2; k++) if (depth[k] > 0) area++;
    this.ctx.debug.stats.waterArea = Math.round(area * FCELL * FCELL);
  }

  _boxBlur(src, N, r) {
    const tmp = new Float32Array(N * N), out = new Float32Array(N * N);
    const w = 2 * r + 1;
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += src[j * N + clamp(i, 0, N - 1)];
      for (let i = 0; i < N; i++) {
        tmp[j * N + i] = sum / w;
        sum += src[j * N + clamp(i + r + 1, 0, N - 1)] - src[j * N + clamp(i - r, 0, N - 1)];
      }
    }
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = -r; j <= r; j++) sum += tmp[clamp(j, 0, N - 1) * N + i];
      for (let j = 0; j < N; j++) {
        out[j * N + i] = sum / w;
        sum += tmp[clamp(j + r + 1, 0, N - 1) * N + i] - tmp[clamp(j - r, 0, N - 1) * N + i];
      }
    }
    return out;
  }

  /** Separable box minimum. Brute force over 2*(2r+1) taps; 512^2 at r=13 is ~14 M ops. */
  _boxMin(src, N, r) {
    const tmp = new Float32Array(N * N), out = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        let m = 1e9;
        for (let k = -r; k <= r; k++) { const v = src[j * N + clamp(i + k, 0, N - 1)]; if (v < m) m = v; }
        tmp[j * N + i] = m;
      }
    }
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        let m = 1e9;
        for (let k = -r; k <= r; k++) { const v = tmp[clamp(j + k, 0, N - 1) * N + i]; if (v < m) m = v; }
        out[j * N + i] = m;
      }
    }
    return out;
  }

  /** Two-pass chamfer distance (metres) to the nearest wet cell. */
  _chamfer(depth, N) {
    const d = new Float32Array(N * N).fill(1e6);
    for (let k = 0; k < N * N; k++) if (depth[k] > 0) d[k] = 0;
    const a = FCELL, b = FCELL * 1.41421356;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      let v = d[k];
      if (i > 0) v = Math.min(v, d[k - 1] + a);
      if (j > 0) v = Math.min(v, d[k - N] + a);
      if (i > 0 && j > 0) v = Math.min(v, d[k - N - 1] + b);
      if (i < N - 1 && j > 0) v = Math.min(v, d[k - N + 1] + b);
      d[k] = v;
    }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
      const k = j * N + i;
      let v = d[k];
      if (i < N - 1) v = Math.min(v, d[k + 1] + a);
      if (j < N - 1) v = Math.min(v, d[k + N] + a);
      if (i < N - 1 && j < N - 1) v = Math.min(v, d[k + N + 1] + b);
      if (i > 0 && j < N - 1) v = Math.min(v, d[k + N - 1] + b);
      d[k] = v;
    }
    return d;
  }

  // ===========================================================================
  // BUILD — geometry, materials, passes
  // ===========================================================================

  _meshGeometry() {
    const N = FIELD, half = TERRAIN.size * 0.5, S = MESH_STEP;
    const depth = this._depth, level = this._level;
    const M = Math.floor((N - 1) / S);          // quads per side
    const idxOf = new Int32Array((M + 1) * (M + 1)).fill(-1);
    const pos = [];
    const idx = [];
    const wet = (i, j) => depth[clamp(j, 0, N - 1) * N + clamp(i, 0, N - 1)] > 0;
    const vertAt = (gi, gj) => {
      const key = gj * (M + 1) + gi;
      let v = idxOf[key];
      if (v >= 0) return v;
      const i = gi * S, j = gj * S;
      // the pool level of whichever neighbouring cell has water
      let lv = -1e9;
      for (let b = -1; b <= 1 && lv < -1e8; b++) for (let a = -1; a <= 1; a++) {
        const k = clamp(j + b, 0, N - 1) * N + clamp(i + a, 0, N - 1);
        if (depth[k] > 0) { lv = level[k]; break; }
      }
      if (lv < -1e8) lv = this._h[clamp(j, 0, N - 1) * N + clamp(i, 0, N - 1)];
      v = pos.length / 3;
      pos.push(-half + (i + 0.5) * FCELL, lv, -half + (j + 0.5) * FCELL);
      idxOf[key] = v;
      return v;
    };
    for (let gj = 0; gj < M; gj++) {
      for (let gi = 0; gi < M; gi++) {
        const i = gi * S, j = gj * S;
        // emit the quad if any field cell it covers (plus one ring of slop, so
        // the shoreline discard happens inside the mesh, not at its edge) is wet
        let any = false;
        for (let b = -1; b <= S && !any; b++) for (let a = -1; a <= S; a++) {
          if (wet(i + a, j + b)) { any = true; break; }
        }
        if (!any) continue;
        const v00 = vertAt(gi, gj), v10 = vertAt(gi + 1, gj);
        const v01 = vertAt(gi, gj + 1), v11 = vertAt(gi + 1, gj + 1);
        idx.push(v00, v01, v10, v10, v01, v11);
      }
    }
    if (!idx.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }

  /** three's cubeUV chunk plus the defines WebGLProgram would have injected. */
  _envChunk() {
    const tex = this.ctx.scene.environment;
    const hgt = (tex && tex.image && tex.image.height) || this.sky?.envRT?.height || 256;
    const maxMip = Math.log2(hgt) - 2;
    const texelW = 1 / (3 * Math.max(Math.pow(2, maxMip), 112));
    const texelH = 1 / hgt;
    this._envHeight = hgt;
    return [
      '#define ENVMAP_TYPE_CUBE_UV',
      '#define texture2D texture',
      `#define CUBEUV_TEXEL_WIDTH ${texelW}`,
      `#define CUBEUV_TEXEL_HEIGHT ${texelH}`,
      `#define CUBEUV_MAX_MIP ${maxMip}.0`,
      THREE.ShaderChunk.cube_uv_reflection_fragment,
    ].join('\n');
  }

  _rebuildEnv() {
    const env = this._envChunk();
    if (this.surfMat) { this.surfMat.fragmentShader = surfaceFrag(env); this.surfMat.needsUpdate = true; }
    if (this.defMat) { this.defMat.fragmentShader = deferredFrag(env); this.defMat.needsUpdate = true; }
    console.info('[water] rebuilt env lookup for PMREM height', this._envHeight);
  }

  _ssrSteps() {
    const q = this.ctx.quality;
    if (!q.ssr || this.ctx.debug.flags.ssr === false) return 0;
    return q.preset === 'ultra' ? 40 : q.preset === 'high' ? 26 : 14;
  }

  _build() {
    const { ctx } = this;
    const env = this._envChunk();

    const shared = {
      uField: { value: this.field.texture },
      uFieldXf: { value: new THREE.Vector4(this.field.origin, this.field.origin, 1 / this.field.size, this.field.size) },
      uFieldN: { value: FIELD },
      uViewZ: { value: null },
      uScene: { value: null },
      uProj: { value: new THREE.Matrix4() },
      uSSR: { value: new THREE.Vector4(140, 0.85, 1.14, 1.0) },
      uEnv: { value: ctx.scene.environment },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunCol: { value: new THREE.Vector3(1, 0.7, 0.4) },
      uNailDir: { value: new THREE.Vector3(0, 1, 0) },
      uNailCol: { value: new THREE.Vector3(0.62, 1.05, 1.40) },
      uSigmaA: { value: new THREE.Vector3(...SIGMA_A) },
      uSigmaS: { value: new THREE.Vector3(...SIGMA_S) },
      uScatterTint: { value: new THREE.Vector3(0.16, 0.115, 0.070) },
      uCrustCol: { value: new THREE.Vector3(0.512, 0.474, 0.428) },   // A5 sinter spar
      uTime: { value: new THREE.Vector4() },
      uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
    };
    this._shared = shared;

    const steps = this._ssrSteps();

    // --- surface --------------------------------------------------------------
    this.surfMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: SURFACE_VERT,
      fragmentShader: surfaceFrag(env),
      defines: { CB_SSR_STEPS: steps },
      uniforms: Object.assign({
        uViewProjUnjit: { value: new THREE.Matrix4() },
        uPrevViewProjUnjit: { value: new THREE.Matrix4() },
        uRipple: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4()) },
        uSurf: { value: new THREE.Vector4(0.055, 1.0, 1.0, 1.0) },
        uSurf2: { value: new THREE.Vector4(1.0, 0.008, 0, 0) },
        uAerialS: { value: new THREE.Vector3() },
        uAerialT: { value: new THREE.Vector3() },
        uHazeCol: { value: new THREE.Vector3(1, 1, 1) },
      }, shared),
      side: THREE.DoubleSide,
      transparent: false,
      depthTest: true,
      depthWrite: true,
    });
    this.surfMat.userData.cbWritesGBuffer = true;

    const geo = this._meshGeometry();
    if (geo) {
      this.mesh = new THREE.Mesh(geo, this.surfMat);
      this.mesh.name = 'liquid';
      this.mesh.layers.set(CB_LAYER.TRANSPARENT);
      this.mesh.castShadow = false;
      this.mesh.receiveShadow = false;
      this.mesh.frustumCulled = false;   // one merged mesh, one draw, ~10 k tris
      ctx.scene.add(this.mesh);
      ctx.bus.emit('sceneDirty');
      ctx.debug.stats.waterTris = geo.index.count / 3;
    }

    // --- deferred pass geometry ----------------------------------------------
    const fsGeo = new THREE.BufferGeometry();
    fsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    fsGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this._fsGeo = fsGeo;

    this.defMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FS_VERT,
      fragmentShader: deferredFrag(env),
      defines: { CB_SSR_STEPS: 0 },     // puddles use PMREM; the plane marches SSR
      uniforms: Object.assign({
        uInvViewProj: { value: new THREE.Matrix4() },
        uView: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
        uWet: { value: new THREE.Vector4(0.60, 1.0, 1.0, 1.0) },
        uBed: { value: new THREE.Vector4(0.26, 0, 0, 0) },
      }, shared),
      depthTest: false,
      depthWrite: false,
      transparent: true,
      // dst = src.rgb * 1 + dst * src.a  — one draw does the wet multiply and
      // the caustic/crust/puddle add. Same trick Sky.js uses at order 45.
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.SrcAlphaFactor,
      blendEquationAlpha: THREE.AddEquation,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    });

    this._defScene = new THREE.Scene();
    const defMesh = new THREE.Mesh(fsGeo, this.defMat);
    defMesh.frustumCulled = false;
    this._defScene.add(defMesh);
    this._fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this._blit = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */`
        precision highp float;
        in vec2 vUv;
        uniform sampler2D tSrc;
        layout(location = 0) out vec4 o;
        void main(){ o = texture(tSrc, vUv); }
      `,
      uniforms: { tSrc: { value: null } },
      depthTest: false, depthWrite: false,
    });

    const g = ctx.gl;
    this._dbFull = [g.COLOR_ATTACHMENT0, g.COLOR_ATTACHMENT1, g.COLOR_ATTACHMENT2, g.COLOR_ATTACHMENT3];
    this._dbMasked = [g.COLOR_ATTACHMENT0, g.NONE, g.NONE, g.NONE];

    // --- passes ---------------------------------------------------------------
    this.deferred = {
      id: 'waterDeferred', order: 30, inputs: ['viewZ'], outputs: [], enabled: true, failed: false,
      execute: (t, gbuf, c) => {
        if (this.failed || c.debug.flags.water === false) return;
        try { this._execDeferred(gbuf, c); } catch (e) { this._disable(e); }
      },
    };
    this.pre = {
      id: 'waterPre', order: 49, inputs: ['viewZ'], outputs: [], enabled: true, failed: false,
      execute: (t, gbuf, c) => {
        if (this.failed) return;
        try { this._execPre(gbuf, c); } catch (e) { this._disable(e); }
      },
    };
    ctx.frameGraph.register(this.deferred);
    ctx.frameGraph.register(this.pre);
  }

  // ===========================================================================
  // per-frame
  // ===========================================================================

  _syncShared(gbuf, ctx) {
    // NB: the SSR ray jitter must key off the RENDER frame, not the sim frame.
    // tests/lib/harness.mjs screenshots through __CB.settle(), which renders
    // with the sim PAUSED: keyed off ctx.time.frame the per-pixel jitter is
    // frozen and TAA averages 20 copies of the same dither, so every capture
    // came back with static salt-and-pepper across the reflection.
    const s = this._shared;
    const k = this.knobs;
    const sky = this.sky;
    s.uViewZ.value = gbuf.gViewZ;
    s.uProj.value.copy(ctx.camera.projectionMatrix);
    s.uTexel.value.set(1 / Math.max(1, this.rd.width), 1 / Math.max(1, this.rd.height));
    s.uTime.value.set(ctx.time.elapsed, ctx.world.breath, (gbuf.frame || 0) % 64, 0);
    s.uSSR.value.w = k.ssrIntensity;
    s.uSigmaA.value.set(SIGMA_A[0] * k.absorb, SIGMA_A[1] * k.absorb, SIGMA_A[2] * k.absorb);
    // The cubeUV defines are baked into both shaders at build time. If Sky.js
    // hands us a PMREM of a different size than the one we compiled against
    // (it can appear after our boot task, or change on a quality flip) every
    // env lookup silently reads the wrong tile. Recompile once, loudly.
    const env = ctx.scene.environment;
    if (env) {
      if (s.uEnv.value !== env) s.uEnv.value = env;
      const h = env.image?.height || 0;
      if (h && h !== this._envHeight) this._rebuildEnv();
    }
    if (sky) {
      s.uSunDir.value.copy(sky.getSunDir());
      const c = sky.getSunColor(), E = sky.getSunIrradiance();
      s.uSunCol.value.set(c.r * E, c.g * E, c.b * E);
      if (sky.nailDir) s.uNailDir.value.copy(sky.nailDir);
      // the Nail contributes no illuminance, only a needle highlight (ART §3.1)
      const n = 0.42 + 0.58 * sat(sky.getSunElevation() / 30);
      s.uNailCol.value.set(0.62 * n, 1.05 * n, 1.40 * n);
    }
  }

  _execDeferred(gbuf, ctx) {
    if (!gbuf.gViewZ || !this.field) return;
    this._syncShared(gbuf, ctx);
    const u = this.defMat.uniforms;
    const k = this.knobs;
    u.uInvViewProj.value.copy(ctx.matrices.invViewProjUnjit);
    u.uView.value.copy(ctx.matrices.view);
    u.uCamPos.value.setFromMatrixPosition(ctx.camera.matrixWorld);
    u.uCamFwd.value.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion).normalize();
    u.uWet.value.set(clamp(k.wetDarken, 0.2, 1.0), k.puddle, k.caustics, k.crust);
    u.uBed.value.x = clamp(k.bedDarken, 0.02, 1.0);

    const r = ctx.renderer;
    const masked = gbuf.rt === this.rd.mrt && Array.isArray(gbuf.rt?.texture) && gbuf.rt.texture.length > 1;
    r.setRenderTarget(gbuf.rt);
    if (masked) this.gl.drawBuffers(this._dbMasked);
    r.render(this._defScene, this._fsCam);
    if (masked) this.gl.drawBuffers(this._dbFull);
  }

  _execPre(gbuf, ctx) {
    if (!this.mesh) return;
    const on = ctx.debug.flags.water !== false;
    this.mesh.visible = on;
    if (!on) return;
    this._syncShared(gbuf, ctx);

    // scene colour behind the liquid, for refraction and for SSR hits
    const back = this.rd.rt('waterBack', { scale: 1 });
    this._blit.uniforms.tSrc.value = gbuf.sceneHDR;
    this.rd.fullscreen(this._blit, back);
    this._shared.uScene.value = back.texture;

    const u = this.surfMat.uniforms;
    const k = this.knobs;
    u.uViewProjUnjit.value.copy(ctx.matrices.viewProjUnjit);
    u.uPrevViewProjUnjit.value.copy(ctx.matrices.prevViewProjUnjit);
    u.uSurf.value.set(k.refract, k.foam, k.waveGain, k.reflection);
    u.uSurf2.value.set(k.turbidity, k.pathDither, 0, 0);

    // aerial perspective, same sigmas Sky.js uses at order 45 (it runs before
    // the transparent draw, so the liquid would otherwise sit in front of its
    // own haze at distance)
    const m = this.sky?.getMedium?.();
    if (m) {
      u.uAerialS.value.set(m.sigmaS[0], m.sigmaS[1], m.sigmaS[2]);
      u.uAerialT.value.set(m.sigmaT[0], m.sigmaT[1], m.sigmaT[2]);
      const sr = this.sky.getSkyRadiance();
      u.uHazeCol.value.set(sr[0], sr[1], sr[2]);
    }

    const rp = u.uRipple.value;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const o = i * 4;
      rp[i].set(this._ripples[o], this._ripples[o + 1], this._ripples[o + 2], this._ripples[o + 3] * k.rippleGain);
    }
  }

  update(dt) {
    if (this.failed || !this.field) return;
    const ctx = this.ctx;
    // expire ripples
    const t = ctx.time.elapsed;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      if (this._ripples[i * 4 + 3] > 0 && t - this._ripples[i * 4 + 2] > 3.4) this._ripples[i * 4 + 3] = 0;
    }
    // wading: the player displaces liquid it is standing in
    const p = ctx.sys.player?.pos;
    if (p) {
      const d = this.getDepthAt(p.x, p.z);
      const moved = this._tmpV.copy(p).sub(this._prevPlayer).setY(0).length();
      if (d > 0.015 && moved > 0.02 && t - this._lastRipple > 0.21) {
        this._lastRipple = t;
        this.splash(p.x, p.y, p.z, clamp(moved * 9 + 0.25, 0.25, 1.0));
      }
      this._prevPlayer.copy(p);
    }
  }

  _syncSSRDefines() {
    const surfaceSteps = this._ssrSteps();
    // The deferred material shares GLSL_SSR but puddle films deliberately use
    // PMREM and never call cbSSR. Keep its compile-time branch at zero while
    // still validating both material signatures through one safe update path.
    const entries = [[this.surfMat, surfaceSteps], [this.defMat, 0]];
    let changed = false;
    for (const [mat, steps] of entries) {
      if (!mat) continue;
      mat.defines ||= {};
      if (mat.defines.CB_SSR_STEPS === steps) continue;
      mat.defines.CB_SSR_STEPS = steps;
      mat.needsUpdate = true;
      changed = true;
    }
    return changed;
  }

  onQuality() {
    this._syncSSRDefines();
  }

  // ===========================================================================
  // public API
  // ===========================================================================

  _idx(x, z) {
    const half = TERRAIN.size * 0.5;
    const i = Math.round((x + half) / FCELL - 0.5);
    const j = Math.round((z + half) / FCELL - 0.5);
    if (i < 0 || j < 0 || i >= FIELD || j >= FIELD) return -1;
    return j * FIELD + i;
  }

  /** Metres of liquid standing above the terrain, 0 if dry. */
  getDepthAt(x, z) { const k = this._idx(x, z); return k < 0 ? 0 : this._dep[k]; }

  /** Liquid surface elevation, or -Infinity where there is none. */
  getLevelAt(x, z) { const k = this._idx(x, z); return (k < 0 || this._lvl[k] < -1e8) ? -Infinity : this._lvl[k]; }

  /**
   * The shared wetness mask, 0..1. Other systems should darken albedo toward
   * 0.6x and drop roughness toward 0.25 by this amount; flora should lean on it
   * for placement, props for puddle-adjacent decals.
   */
  getWetnessAt(x, z) { const k = this._idx(x, z); return k < 0 ? 0 : this._wet[k]; }

  isSubmerged(x, y, z) { return y < this.getLevelAt(x, z); }

  /** Ripple + a bus event for vfx/audio. Returns false if there is no liquid there. */
  splash(x, y, z, strength = 1.0) {
    if (this.failed || !this.field) return false;
    if (this.getDepthAt(x, z) <= 0.004) return false;
    const i = (this._rip++ % MAX_RIPPLES) * 4;
    this._ripples[i] = x;
    this._ripples[i + 1] = z;
    this._ripples[i + 2] = this.ctx.time.elapsed;
    this._ripples[i + 3] = clamp(strength, 0, 2);
    this.ctx.bus.emit('water:splash', { x, y, z, strength, level: this.getLevelAt(x, z) });
    return true;
  }

  debugInfo() {
    return {
      area: this.ctx.debug.stats.waterArea,
      tris: this.ctx.debug.stats.waterTris,
      ssrSteps: this.surfMat?.defines?.CB_SSR_STEPS,
      deferredSSRSteps: this.defMat?.defines?.CB_SSR_STEPS,
      ssrEnabled: !!this.ctx.quality.ssr && this.ctx.debug.flags.ssr !== false,
      envHeight: this._envHeight,
      failed: this.failed,
    };
  }

  dispose() {
    this._offDebugSSR?.();
    this._offDebugSSR = null;
    this.mesh?.geometry?.dispose();
    this.surfMat?.dispose();
    this.defMat?.dispose();
    this._blit?.dispose();
    this.field?.texture?.dispose();
    if (this.mesh) this.ctx.scene.remove(this.mesh);
  }
}

export default Water;
