// THE MATERIAL FAMILY — every shader program FLARE will ever link.
//
// docs/RENDER.md is binding here and it is refused-by-construction rather than
// avoided-by-discipline:
//
//   ZERO THREE.Light objects. ZERO shadow maps. ZERO MeshStandardMaterial.
//   ZERO PMREM. ZERO onBeforeCompile. ZERO #define-driven quality permutations.
//
// Every material below is a RawShaderMaterial. That single choice is what makes
// the 17-program budget a fact instead of a hope, and it is worth stating why,
// because it is not obvious:
//
//   r161's getProgramCacheKey() short-circuits for a raw material. For anything
//   else the key carries numPointLights, numDirLights, shadow counts, fog, every
//   boolean parameter AND renderer.outputColorSpace -- which is why adding one
//   light relinks every lit material in the scene, and why the same material
//   rendered to a target and then to the canvas can become two programs. For a
//   RawShaderMaterial the key is exactly:
//
//       [ customVertexShaderID, customFragmentShaderID, customProgramCacheKey ]
//
//   and those IDs come from WebGLShaderCache, which interns by SOURCE STRING.
//
// Two consequences we lean on everywhere:
//
//   1. A hundred materials built from the same source are ONE program. So each
//      mesh may own a material with its own colour/emissive uniforms and the
//      program count does not move. There is no material-per-variant trap here
//      (RENDER.md "A material-per-variant architecture"), because the variant is
//      a uniform, never a define.
//   2. Render target, colour space, light count and fog cannot fork a program.
//      The entire per-light recompile hazard class is unreachable.
//
// Measured on the target box before a line of this was written: two raw
// materials with identical source produced exactly 1 program, and rendering the
// same material to an RG16F target and then to the default framebuffer produced
// 0 additional programs.
//
// GLSL DISCIPLINE (docs/RENDER.md, paid for five times in the sibling repo):
//   - GLSL identifiers inside comments are quoted with "double quotes", NEVER
//     with backticks. A backtick silently closes the JS template literal and the
//     only symptom is a PAGEERROR naming a token with no file and no line.
//   - "flat", "half" and "sat" are never used as identifiers.
//   - No literal "#version" line: glslVersion GLSL3 makes three prepend it, and
//     writing it yourself is a duplicate-version link error that silently no-ops
//     every draw.
//   - Every loop bound that is not tiny is a UNIFORM. Constant bounds make
//     ANGLE/FXC attempt an unroll.
//   - No dynamically indexed uniform array anywhere. The rover lights live in an
//     RGBA32F DataTexture read with texelFetch (the X4000 dyn_index warning is
//     promoted to an error by the harness and names no file).
//
// WHERE THE SURFACE DETAIL LIVES. `src/render/surface.glsl.js` holds the noise,
// the triplanar micro-detail layer, the contact term and the roughness response
// as GLSL source only — no uniforms of its own, no imports, built from THIS
// file's table. It is the art pass, it is the largest and most re-tunable body
// of shader text in the project, and it spends ZERO extra programs because it is
// concatenated into the two surface fragment shaders that already existed.
// `tests/picture.mjs` is its gate.

import * as THREE from 'three';
import FEEL from '../feel.js';
import { makeSurfaceGlsl } from './surface.glsl.js';

// ---------------------------------------------------------------------------
// The one frozen table for this module (docs/PLAN.md, C2-F7 ruling). Anything
// with three or more significant digits lives here and is interpolated into the
// GLSL, so a tuning value can never hide inside a shader string.
// ---------------------------------------------------------------------------
export const MATERIAL_TABLE = Object.freeze({
  // The seventeen. This list IS the budget; docs/RENDER.md caps it at 18 and the
  // gate asserts equality at frame 60 and at end of run.
  programs: Object.freeze([
    'IRRADIANCE_SPLAT',
    'SURFACE_STATIC', 'SURFACE_INSTANCED', 'EMISSIVE_UNLIT',
    'SCAR_DECAL', 'CONTACT_BLOB',
    'ADDITIVE_INSTANCED', 'DUST_POINTS',
    'VIEWMODEL_SURFACE', 'VIEWMODEL_EMISSIVE',
    'BLOOM_DOWN', 'BLOOM_UP',
    'GRADE',
    'SMAA_EDGE', 'SMAA_WEIGHT', 'SMAA_BLEND',
    'BLIT',
  ]),

  // Scene layers. The frame graph is renderer.render() calls over ONE scene with
  // sortObjects disabled, filtered by camera.layers -- which is how the additive
  // bucket gets a fixed order at zero per-frame sorting cost (docs/RENDER.md P3).
  // WORLD is layer 0 so a mesh added by another workstream that never heard of
  // this file still lands in the opaque pass.
  //
  // BLOB is its own layer for one specific reason: additive commutes with
  // additive and multiply commutes with multiply, but additive does NOT commute
  // with multiply. Scar decals must be laid down before contact blobs darken
  // them, or a body standing in a light pool stops occluding it. With
  // sortObjects disabled three ignores renderOrder entirely and falls back to
  // INSERTION order, so leaving them on one layer would make a load-bearing
  // ordering depend on which workstream happened to call scene.add() first.
  // A separate layer makes it a property of the frame graph instead.
  layers: Object.freeze({ WORLD: 0, FLOOR: 1, ADDITIVE: 2, VIEWMODEL: 3, BLOB: 4 }),

  hashA: 127.1, hashB: 311.7, hashK: 43758.5453,
  detailScale: 0.37,        // world metres per detail-noise cell
  detailAmount: 0.22,       // how much the breakup term modulates albedo
  detailScale2: 1.91,

  // ---- THE ART PASS ------------------------------------------------------
  // Three detail bands, in METRES PER NOISE CELL, so a reader can check them
  // against the brief ("roughly 5 cm, 50 cm, 5 m") without doing arithmetic.
  // src/render/surface.glsl.js takes the reciprocals; the shader never sees a
  // number that is not from this block.
  microFine: 0.055,         // 5 cm  — near-field grain: relief + cavity/peak wear
  microMid: 0.52,           // 50 cm — relief + breakup, survives to the far wall
  microMacro: 5.3,          // 5 m   — stochastic macro breakup, VALUE only
  // One lattice rotation per band, in radians, deliberately incommensurate. A
  // square lattice is what value noise IS; three of them in register is a grid
  // the eye finds instantly (automatic failure #3) and the first capture of
  // tests/picture.mjs shows exactly that. Rotating them apart costs 8 ALU.
  microRotate: Object.freeze([0.37, 1.13, 2.29]),
  // Relief strengths are SLOPES, not heights: surface.glsl.js returns the noise
  // gradient in noise units rather than per metre, so a coefficient means the
  // same visual tilt in every band (see the long note there — the first build
  // scaled by 1/cell, which drove the 5 cm band 18x too hard and clamped a
  // quarter of the flash-lit floor to black). Raw |d(noise)/d(p)| peaks near 1.5,
  // so the worst-case tilt is atan(1.5 * (0.55 + 0.40) * 0.45) = 33 degrees and
  // the RMS tilt is roughly a third of that. reliefStrength is the one depth
  // dial; the per-band pair is the balance between them.
  microReliefFine: 0.55,
  microReliefMid: 0.40,
  reliefStrength: 0.45,
  // Breakup amplitudes. Every one of these is applied as (noise - 0.5) * k, so
  // each has mean EXACTLY zero and none of them can shift a chamber's authored
  // albedo. Sum of half-ranges is 0.31, i.e. a surface swings +-31% of its own
  // value at uDetail 1 — well inside the clamp, which therefore never binds and
  // never biases the mean.
  microBreakupMid: 0.14,
  microBreakupMacro: 0.22,
  microWearFine: 0.26,
  microAlbedoMin: 0.60, microAlbedoMax: 1.45,
  // Band limiting: an octave starts fading when a pixel covers bandLo of its
  // cell and is gone at bandHi. bandHi 0.55 is just past Nyquist for the cell,
  // which is where procedural detail stops being detail and starts being noise.
  bandLo: 0.15, bandHi: 0.55,
  // Contact darkening — the grounding term, driven by the irradiance splat's
  // own mean-scar-height channel. contactHeight is how far up a wall the
  // darkening reaches; contactLightK is how fast it fades in with pool energy.
  contactAmount: 0.55, contactHeight: 1.1, contactLightK: 1.6,
  // Roughness response. exp 5 -> 2 is W6-VIEWMODEL's filed request verbatim; at
  // roughViewmodel = 2/3 the exponent is EXACTLY 3.0, which is the rim the
  // viewmodel already shipped, so the gun's picture does not move until W6 asks.
  sheen: 0.75, roughExpSmooth: 5.0, roughExpRough: 2.0,
  // How much micro-relief a FULLY POLISHED surface keeps. This is the roughness
  // cue that actually works on world geometry: a Lambert world has no specular
  // lobe to widen, but "how much surface texture you can see" separates polished
  // from chalk instantly and costs one mix. At the default roughSurface 0.85 a
  // chamber keeps 0.89 of its relief, so nothing already authored moves.
  roughDetailFloor: 0.25,
  roughSurface: 0.85,        // concrete, oxidised metal: what a chamber gets by default
  roughViewmodel: 2 / 3,

  wrap: 0.35,               // Lambert wrap: how far light bends past the terminator
  irrFloorFacing: 0.18,     // an up-facing surface still takes this much floor light
  softenRadius: 0.35,       // FEEL.fire.flashFalloffEps, restated for the viewmodel
  decalSoftness: 0.55,
  ringWidth: 0.14,
  edgeWindow: 0.72,         // additive billboards must reach zero at their own edge
  dustSizePx: 2.6,
  dustFalloff: 26.0,
  // NOTE: the Rec.709 luma weights live in POST_TABLE and ONLY there. Two copies
  // of a coefficient triple in two owned modules is exactly the drift CONTRACT §5
  // exists to stop, and nothing in this file needs them.
});

const T = MATERIAL_TABLE;

/** GLSL float literal. Keeps every constant in the table and out of the shader text. */
const f = v => {
  const s = Number(v).toString();
  return (s.includes('.') || s.includes('e')) ? s : s + '.0';
};

// ---------------------------------------------------------------------------
// Shared GLSL chunks. Concatenated as plain strings; there is no chunk system,
// no injection point, and nothing three can substitute into.
// ---------------------------------------------------------------------------

const CHUNK_PRECISION = `
precision highp float;
precision highp int;
precision highp sampler2D;
`;

// Noise and the micro-detail layer live in src/render/surface.glsl.js — GLSL
// source only, no uniforms of its own, built from THIS table so a tuning value
// still cannot hide inside a shader string. Splitting it out is not cosmetic:
// the art pass is the largest single body of shader text in the project and it
// is the part most likely to be re-tuned, so it gets a file whose whole subject
// is "what a surface is made of".
const { CHUNK_NOISE, CHUNK_MICRO } = makeSurfaceGlsl(T, f);

// The irradiance fetch. ONE texture read and three ALU, and it is the same
// i*(1-d^2/r^2)^2 expression LightField.illuminationAt sums on the CPU -- the
// splat writes it, this reads it, so the simulation and the picture cannot drift.
// G/R is the intensity-weighted mean scar height, which is what lets a top-down
// projection survive THE HELIX's 34 m spiral instead of lighting the deck from
// two turns below.
const CHUNK_IRRADIANCE = `
uniform sampler2D uIrr;
uniform vec2  uIrrOrigin;
uniform vec2  uIrrScale;
uniform float uIrrInvHeight;
uniform float uIrrGain;

// x = the attenuated energy; y = the intensity-weighted mean scar HEIGHT, which
// is the height of the light pool at this xz. The pair is returned from ONE
// fetch because the surface shader wants both — the energy to light with and
// the height to ground against (flareContact). Splitting them into two calls
// would double the texture read that docs/RENDER.md budgets at exactly one.
vec2 flareIrradiancePair(vec3 wpos){
  vec2 uv = (wpos.xz - uIrrOrigin) * uIrrScale;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec2(0.0);
  vec2 rg = texture(uIrr, uv).rg;
  if (rg.r <= 0.0) return vec2(0.0);
  float meanY = rg.g / rg.r;
  return vec2(rg.r * exp(-abs(wpos.y - meanY) * uIrrInvHeight), meanY);
}
float flareIrradianceRaw(vec3 wpos){
  return flareIrradiancePair(wpos).x;
}
// The facing term, shared by every consumer so the floor share cannot drift.
float flareIrrFacing(vec3 n){
  return mix(${f(T.irrFloorFacing)}, 1.0, clamp(0.5 - 0.5 * n.y, 0.0, 1.0));
}
float flareIrradiance(vec3 wpos, vec3 n){
  float e = flareIrradianceRaw(wpos);
  if (e <= 0.0) return 0.0;
  // Floor pools arrive from below, so a down-facing normal takes the most and an
  // up-facing one still takes a floor share -- the scar's own ground is lit by
  // the decal layer (P2), not by this term.
  return e * flareIrrFacing(n) * uIrrGain;
}
`;

// The rover pool. Eight texels read with texelFetch behind a UNIFORM loop bound.
// Never a uniform vec4[N] (X4000 dyn_index), never a #define (FXC unrolls).
const CHUNK_ROVER = `
uniform sampler2D uLights;
uniform int uLightCount;

vec3 flareRover(vec3 wpos, vec3 n, float soften){
  vec3 acc = vec3(0.0);
  for (int i = 0; i < uLightCount; ++i) {
    vec4 a = texelFetch(uLights, ivec2(i * 2, 0), 0);
    vec4 b = texelFetch(uLights, ivec2(i * 2 + 1, 0), 0);
    vec3 d = a.xyz - wpos;
    float d2 = dot(d, d);
    if (d2 >= a.w) continue;
    float t = 1.0 - d2 / a.w;
    float atten = t * t / (1.0 + d2 * soften);
    float nl = dot(n, d * inversesqrt(max(d2, 1e-6)));
    acc += b.rgb * atten * clamp((nl + ${f(T.wrap)}) / (1.0 + ${f(T.wrap)}), 0.0, 1.0);
  }
  return acc;
}
`;

const CHUNK_FOG = `
uniform vec3  uFogColor;
uniform float uFogDensity;
float flareFog(float viewDist){
  float d = uFogDensity * viewDist;
  return 1.0 - exp(-d * d);
}
`;

const VS_WORLD_HEAD = `${CHUNK_PRECISION}
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;
in vec3 normal;
out vec3 vWorld;
out vec3 vNormal;
out float vViewDist;
`;

// ---------------------------------------------------------------------------
// 1. SURFACE_STATIC -- walls, floors, props. Lambert + wrap. No GGX, no envMap.
// ---------------------------------------------------------------------------
const VS_SURFACE = `${VS_WORLD_HEAD}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FS_SURFACE = `${CHUNK_PRECISION}${CHUNK_NOISE}${CHUNK_MICRO}${CHUNK_IRRADIANCE}${CHUNK_ROVER}${CHUNK_FOG}
uniform float uAmbient;
uniform float uHemi;
uniform vec3  uBaseColor;
uniform vec3  uEmissive;
uniform float uDetail;
uniform float uRough;
uniform float uSurfaceDetail;
uniform vec3  cameraPosition;
in vec3 vWorld;
in vec3 vNormal;
in float vViewDist;
out vec4 fragColor;

void main(){
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // Derivatives must be taken in UNIFORM control flow, before anything branches.
  float px = flareFootprint(vWorld);
  vec3 tri = flareTriWeights(n);

  // Breakup at two scales. CRITIC automatic failure 1 is "any untextured or
  // flat-shaded surface", and this is the cheapest defence that survives a dark
  // frame: it modulates albedo, never adds light, so it cannot lift the black.
  vec2 dp = (abs(n.y) > 0.7) ? vWorld.xz : (abs(n.x) > 0.7 ? vWorld.zy : vWorld.xy);
  float detail = 1.0 - uDetail * ${f(T.detailAmount)} * (1.0 - flareFbm2o(dp * ${f(T.detailScale)}));

  // THE ART PASS. Bends "n" (so it must run before anything lights with it) and
  // returns a VALUE-only albedo multiplier. uSurfaceDetail is the one runtime
  // knob for the whole layer and it is a UNIFORM, never a define -- the program
  // count cannot move, and the gate flips it to 0 to capture a byte-exact
  // "before" frame from the shipping page rather than from a second build.
  float amount = uDetail * uSurfaceDetail;
  float micro = flareMicro(vWorld, tri, px, amount, uRough, n);

  // One irradiance fetch, two answers: the energy to light with, and the height
  // of the pool to ground against.
  vec2 ir = flareIrradiancePair(vWorld);
  float contact = flareContact(vWorld, n, ir.x, ir.y, ${f(T.contactAmount)} * uSurfaceDetail);

  vec3 albedo = uBaseColor * detail * micro * contact;
  float hemi = uHemi * (0.5 + 0.5 * n.y);
  vec3 lit = albedo * (uAmbient + hemi + ir.x * flareIrrFacing(n) * uIrrGain);
  lit += albedo * flareRover(vWorld, n, 0.0);
  // Roughness. MULTIPLIES the diffuse term, so a polished surface gains a
  // grazing edge exactly where there is light and gains nothing in the dark.
  lit *= flareSheen(n, v, uRough, uSurfaceDetail);
  vec3 col = lit + uEmissive;
  col = mix(col, uFogColor, flareFog(vViewDist));
  // Alpha is the EMISSIVE-FAMILY FLAG the grade gates halation on. A surface is
  // never in that family, so halation can never warm a cold enemy core.
  fragColor = vec4(col, 0.0);
}
`;

// ---------------------------------------------------------------------------
// 2. SURFACE_INSTANCED -- the same lighting, one draw call, per-instance matrix
//    and tint. Distinct SOURCE, therefore exactly one extra program.
// ---------------------------------------------------------------------------
const VS_SURFACE_INSTANCED = `${CHUNK_PRECISION}
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
in vec3 position;
in vec3 normal;
in mat4 iMatrix;
in vec4 iTint;
out vec3 vWorld;
out vec3 vNormal;
out vec4 vTint;
out float vViewDist;
void main(){
  vec4 wp = iMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(iMatrix) * normal);
  vTint = iTint;
  vec4 mv = viewMatrix * wp;
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FS_SURFACE_INSTANCED = `${CHUNK_PRECISION}${CHUNK_NOISE}${CHUNK_MICRO}${CHUNK_IRRADIANCE}${CHUNK_ROVER}${CHUNK_FOG}
uniform float uAmbient;
uniform float uHemi;
uniform vec3  uBaseColor;
uniform float uDetail;
uniform float uRough;
uniform float uSurfaceDetail;
uniform vec3  cameraPosition;
in vec3 vWorld;
in vec3 vNormal;
in vec4 vTint;
in float vViewDist;
out vec4 fragColor;

void main(){
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float px = flareFootprint(vWorld);
  vec3 tri = flareTriWeights(n);

  vec2 dp = (abs(n.y) > 0.7) ? vWorld.xz : (abs(n.x) > 0.7 ? vWorld.zy : vWorld.xy);
  float detail = 1.0 - uDetail * ${f(T.detailAmount)} * (1.0 - flareFbm2o(dp * ${f(T.detailScale)}));

  // The instanced family keeps W4-BUILD's per-instance macro tint AND takes the
  // continuous 5 m band, and they do different jobs: the tint separates one
  // pillar from the next (automatic failure #10, "same rock, same angle"), the
  // 5 m band varies WITHIN a single pillar. Either alone leaves the other tell.
  float amount = uDetail * uSurfaceDetail;
  float micro = flareMicro(vWorld, tri, px, amount, uRough, n);

  vec2 ir = flareIrradiancePair(vWorld);
  float contact = flareContact(vWorld, n, ir.x, ir.y, ${f(T.contactAmount)} * uSurfaceDetail);

  vec3 albedo = uBaseColor * vTint.rgb * detail * micro * contact;
  float hemi = uHemi * (0.5 + 0.5 * n.y);
  vec3 lit = albedo * (uAmbient + hemi + ir.x * flareIrrFacing(n) * uIrrGain);
  lit += albedo * flareRover(vWorld, n, 0.0);
  lit *= flareSheen(n, v, uRough, uSurfaceDetail);
  vec3 col = mix(lit, uFogColor, flareFog(vViewDist));
  fragColor = vec4(col, 0.0);
}
`;

// ---------------------------------------------------------------------------
// 3. EMISSIVE_UNLIT -- the silhouette strips, vents, cores, lamps.
//    Radiance, not reflectance. It takes no light and it needs none, which is
//    exactly why C3-F4's shape-coded strip works in a game with no key light.
// ---------------------------------------------------------------------------
const VS_EMISSIVE = `${VS_WORLD_HEAD}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FS_EMISSIVE = `${CHUNK_PRECISION}${CHUNK_FOG}
uniform vec3  uEmissive;
uniform float uIntensity;
uniform float uDuty;
in vec3 vWorld;
in vec3 vNormal;
in float vViewDist;
out vec4 fragColor;
void main(){
  // uDuty is the health readout channel: C1-F10 moved wounded state from pulse
  // FREQUENCY (4-11 Hz, a photosensitivity hazard and an alias at the 45 fps
  // p95 floor) to DUTY CYCLE at 3 Hz maximum. The shader only reads the level.
  vec3 col = uEmissive * uIntensity * uDuty;
  col = mix(col, uFogColor, flareFog(vViewDist));
  fragColor = vec4(col, 1.0);
}
`;

// ---------------------------------------------------------------------------
// 4. SCAR_DECAL -- the beacons that ride on top of real irradiance.
//    Additive, instanced, ONE draw, fog-exempt (that is what makes them
//    navigable from anywhere) but distance-attenuated so they cannot sum to
//    white in the far field (C3-F6).
// ---------------------------------------------------------------------------
const VS_DECAL = `${CHUNK_PRECISION}
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uBreatheBase;
uniform float uBreatheAmp;
uniform float uBreatheHz;
in vec3 position;
in vec4 iA;      // xyz world centre, w radius
in vec4 iB;      // x intensity, y phase, z unused, w unused
out vec2 vLocal;
out float vI;
out float vDist;
void main(){
  float breathe = uBreatheBase + sin(uTime * uBreatheHz + iB.y * 6.2832) * uBreatheAmp;
  vec3 wp = iA.xyz + vec3(position.x, 0.0, position.y) * iA.w * breathe;
  vLocal = position.xy;
  vI = iB.x;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FS_DECAL = `${CHUNK_PRECISION}
uniform vec3 uColor;
uniform float uFadeFrom;
uniform float uFadeRange;
in vec2 vLocal;
in float vI;
in float vDist;
out vec4 fragColor;
void main(){
  float r2 = dot(vLocal, vLocal);
  if (r2 >= 1.0) discard;
  float t = 1.0 - r2;
  float a = vI * t * t * ${f(T.decalSoftness)};
  a *= clamp(uFadeFrom - vDist / uFadeRange, 0.0, 1.0);
  fragColor = vec4(uColor * a, a);
}
`;

// ---------------------------------------------------------------------------
// 5. CONTACT_BLOB -- grounding without a single shadow map (C2-F10 / C3-F10).
//    Multiply-blended, instanced, one draw, hue-free, works at every quality
//    tier. Correct in this game specifically: a blob only reads where there is
//    light to occlude, which is precisely the ground the player has lit.
// ---------------------------------------------------------------------------
const VS_BLOB = `${CHUNK_PRECISION}
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;
in vec4 iA;      // xyz ground point, w radius
in vec4 iB;      // x opacity
out vec2 vLocal;
out float vO;
void main(){
  vec3 wp = iA.xyz + vec3(position.x, 0.0, position.y) * iA.w;
  vLocal = position.xy;
  vO = iB.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const FS_BLOB = `${CHUNK_PRECISION}
in vec2 vLocal;
in float vO;
out vec4 fragColor;
void main(){
  float r2 = dot(vLocal, vLocal);
  if (r2 >= 1.0) discard;
  float t = 1.0 - r2;
  float occ = vO * t * t;
  // Multiply blend: rgb scales the destination, alpha is passed through
  // untouched so the emissive-family flag survives the floor layer.
  fragColor = vec4(vec3(1.0 - occ), 0.0);
}
`;

// ---------------------------------------------------------------------------
// 6. ADDITIVE_INSTANCED -- tracers, rings, particles, bolt glows. One draw for
//    the whole bucket, which is what actually removes the per-frame sort the
//    draft was paying over thousands of objects.
// ---------------------------------------------------------------------------
const VS_ADDITIVE = `${CHUNK_PRECISION}
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;
in vec4 iA;      // xyz world centre, w size
in vec4 iB;      // rgb colour, a alpha
in vec4 iC;      // xyz direction (streaks), w shape kind
out vec2 vLocal;
out vec4 vCol;
out float vShape;
void main(){
  vLocal = position.xy;
  vCol = iB;
  vShape = iC.w;
  vec4 mv = viewMatrix * vec4(iA.xyz, 1.0);
  vec2 o = position.xy * iA.w;
  if (iC.w > 1.5) {
    // Streak: stretch along the view-space projection of the world direction.
    vec3 dv = mat3(viewMatrix) * iC.xyz;
    vec2 ax = normalize(vec2(dv.x, dv.y) + vec2(1e-5, 0.0));
    vec2 pe = vec2(-ax.y, ax.x);
    o = (ax * position.y * iA.w * 4.0) + (pe * position.x * iA.w);
  }
  mv.xy += o;
  gl_Position = projectionMatrix * mv;
}
`;

const FS_ADDITIVE = `${CHUNK_PRECISION}
in vec2 vLocal;
in vec4 vCol;
in float vShape;
out vec4 fragColor;
void main(){
  float r2 = dot(vLocal, vLocal);
  if (r2 >= 1.0) discard;
  float r = sqrt(r2);
  float body;
  if (vShape > 0.5 && vShape < 1.5) {
    // Ring: radius and direction carry the impact grade, never hue. The four
    // impact kinds must be distinguishable in greyscale (docs/PLAN.md G1).
    float d = abs(r - 0.72);
    body = smoothstep(${f(T.ringWidth)}, 0.0, d);
  } else {
    body = (1.0 - r2) * (1.0 - r2);
  }
  // Reach zero at the quad's own edge. The sibling project shipped a hard-edged
  // bright RECTANGLE in two review vistas for its entire life because the flash
  // billboard still carried 1.46 of additive radiance at r = 1.
  body *= smoothstep(1.0, ${f(T.edgeWindow)}, r);
  float a = body * vCol.a;
  fragColor = vec4(vCol.rgb * a, a);
}
`;

// ---------------------------------------------------------------------------
// 7. DUST_POINTS -- the volumetrics. GROUPED G7: the motes stay, but their alpha
//    is gated by the irradiance fetch, so a mote only glows where there is light
//    for it to catch. That keeps the black black instead of veiling it, and it
//    turns the dust into a second readout of the light field.
// ---------------------------------------------------------------------------
const VS_DUST = `${CHUNK_PRECISION}${CHUNK_IRRADIANCE}
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uDustScale;
uniform float uDustGain;
uniform vec3 uDustDrift;
uniform float uSizePx;
in vec3 position;
in vec3 aSeed;   // per-mote phase so they do not move as a block
out float vA;
void main(){
  vec3 wp = position + uDustDrift * sin(uTime * aSeed.x + aSeed.y * 6.2832) * aSeed.z;
  float e = flareIrradianceRaw(wp);
  vA = clamp(e * uDustGain, 0.0, 1.0);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  float dist = max(-mv.z, 0.1);
  gl_PointSize = clamp(uSizePx * uDustScale * ${f(T.dustFalloff)} / dist, 1.0, 12.0);
  gl_Position = projectionMatrix * mv;
}
`;

const FS_DUST = `${CHUNK_PRECISION}
uniform vec3 uColor;
in float vA;
out vec4 fragColor;
void main(){
  if (vA <= 0.0) discard;
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 >= 1.0) discard;
  float a = vA * (1.0 - r2) * (1.0 - r2);
  fragColor = vec4(uColor * a, a);
}
`;

// ---------------------------------------------------------------------------
// 8/9. VIEWMODEL_SURFACE / VIEWMODEL_EMISSIVE -- P4, own camera at 48 degrees
//      while the world runs 68. Genuinely different shaders, not the world pair
//      with fog turned off:
//        - no fog (the gun is 0.25-0.6 m away; fogging it is meaningless)
//        - the rover falloff carries a SOFTEN term, because the muzzle flash is
//          a ~15 cm luminous volume 10 cm from the handguard and an unsoftened
//          inverse square there is the 26,000x overexposure the sibling project
//          shipped for four rounds of critique
//        - a rim term, because the viewmodel is the one object that must read as
//          modelled rather than as a grey box (CRITIC automatic failure 12)
// ---------------------------------------------------------------------------
const VS_VIEWMODEL = `${VS_WORLD_HEAD}
out vec3 vView;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = mv.xyz;
  vViewDist = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FS_VIEWMODEL_SURFACE = `${CHUNK_PRECISION}${CHUNK_IRRADIANCE}${CHUNK_ROVER}
uniform float uAmbient;
uniform float uHemi;
uniform vec3  uBaseColor;
uniform vec3  uEmissive;
uniform float uRim;
uniform float uRough;
uniform vec3  cameraPosition;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vView;
in float vViewDist;
out vec4 fragColor;
void main(){
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float hemi = uHemi * (0.5 + 0.5 * n.y);
  vec3 lit = uBaseColor * (uAmbient + hemi + flareIrradiance(vWorld, n));
  lit += uBaseColor * flareRover(vWorld, n, ${f(T.softenRadius)});
  // ROUGHNESS ON THE RIM EXPONENT, not only on its amplitude. W6-VIEWMODEL filed
  // this and stated the defect exactly: the gun is authored as three finishes
  // (polymer / parkerised steel / bright barrel steel) and amplitude alone
  // "makes a rough surface read as a dark surface rather than as a soft-edged
  // one". A uniform, never a define, so the seventeen stay seventeen. The
  // DEFAULT is roughViewmodel = 2/3, at which mix(5, 2, r) is exactly 3.0 — the
  // rim the viewmodel already ships — so this changes no pixel until W6 passes
  // a "rough" per finish.
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), mix(${f(T.roughExpSmooth)}, ${f(T.roughExpRough)}, uRough)) * uRim;
  // NEGATIVE alpha is the VIEWMODEL FLAG. docs/RENDER.md records this fix as
  // "correctly diagnosed, correctly scoped across three files, and NEVER BUILT",
  // and the consequence was that the sibling project's gun stayed measurably
  // orange in its dark biome to the end: the viewmodel is the brightest large
  // object in a dark frame, so a split-tone weighted by luminance hits it at
  // nearly full strength while the walls take almost none. The grade reads
  // max(-alpha, 0) and blends its look toward identity there. One sign bit, no
  // extra attachment, no MRT.
  fragColor = vec4(lit + uEmissive + uBaseColor * rim, -1.0);
}
`;

const FS_VIEWMODEL_EMISSIVE = `${CHUNK_PRECISION}
uniform vec3  uEmissive;
uniform float uIntensity;
uniform float uNotch;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vView;
in float vViewDist;
out vec4 fragColor;
void main(){
  // uNotch is C3-F12's discrete RESERVE readout: dark / one / two / three
  // segments, countable rather than continuous, so it survives a gain with a
  // 17x range and a colourblind viewer. Empty reserve goes fully dark.
  // Alpha negative: viewmodel, same flag as the surface above. The chamber glow
  // gives up halation to keep the gun out of the world's grade -- which is the
  // right trade, because being graded like a distant emissive is exactly what
  // turned the sibling project's receiver orange.
  fragColor = vec4(uEmissive * uIntensity * uNotch, -1.0);
}
`;

// ---------------------------------------------------------------------------
// 10. IRRADIANCE_SPLAT -- P0. One additive quad per deposit into the per-chamber
//     RG16F target, in the chamber's own top-down space. R is the SAME
//     i*(1-d^2/r^2)^2 the CPU sums; G is that contribution times the scar height,
//     so G/R comes back out as the intensity-weighted mean height.
// ---------------------------------------------------------------------------
const VS_SPLAT = `${CHUNK_PRECISION}
uniform vec2 uOrigin;
uniform vec2 uInvSize;
in vec3 position;
in vec4 iA;   // xyz world centre, w radius
in vec4 iB;   // x intensity
out vec2 vWorldXZ;
out vec4 vScar;
out float vI;
void main(){
  vec2 wxz = iA.xz + position.xy * iA.w;
  vWorldXZ = wxz;
  vScar = iA;
  vI = iB.x;
  vec2 uv = (wxz - uOrigin) * uInvSize;
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}
`;

const FS_SPLAT = `${CHUNK_PRECISION}
in vec2 vWorldXZ;
in vec4 vScar;
in float vI;
out vec4 fragColor;
void main(){
  vec2 d = vWorldXZ - vScar.xz;
  float d2 = dot(d, d);
  float r2 = vScar.w * vScar.w;
  if (d2 >= r2) discard;
  float t = 1.0 - d2 / r2;
  float e = vI * t * t;
  fragColor = vec4(e, e * vScar.y, 0.0, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Fullscreen-pass vertex shader, shared by every post program. A single
// triangle, no matrices, no culling.
// ---------------------------------------------------------------------------
export const VS_FULLSCREEN = `${CHUNK_PRECISION}
in vec3 position;
out vec2 vUv;
void main(){
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Construction helpers
// ---------------------------------------------------------------------------

function raw(vertexShader, fragmentShader, uniforms, opts = {}) {
  const m = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: opts.depthTest !== undefined ? opts.depthTest : true,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : true,
    side: opts.side || THREE.FrontSide,
    transparent: false,           // never: the transparent list is z-sorted, and
                                  // every blended family here is order-independent
  });
  if (opts.blend === 'add') {
    m.blending = THREE.CustomBlending;
    m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor; m.blendEquation = THREE.AddEquation;
    m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneFactor; m.blendEquationAlpha = THREE.AddEquation;
  } else if (opts.blend === 'multiply') {
    m.blending = THREE.CustomBlending;
    m.blendSrc = THREE.DstColorFactor; m.blendDst = THREE.ZeroFactor; m.blendEquation = THREE.AddEquation;
    // Alpha is the emissive-family flag. A blob must not touch it.
    m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.blendEquationAlpha = THREE.AddEquation;
  } else {
    m.blending = THREE.NoBlending;
  }
  if (opts.decal) {
    // Scar decals and contact blobs are COPLANAR with the ground they sit on.
    // Without a depth bias they z-fight it, and the artefact is not subtle: the
    // light pool renders as a bullseye of hard concentric rings, which reads as
    // a broken shader rather than as depth precision. Caught by eye in the first
    // lit screenshot; tests/render.mjs now measures it as scanline extrema.
    m.polygonOffset = true;
    m.polygonOffsetFactor = -4;
    m.polygonOffsetUnits = -4;
  }
  return m;
}

/**
 * The uniform bag shared by every world material. These are the SAME `{value}`
 * objects on every material, so one write updates the whole scene -- which is
 * how a hundred materials stay one program and still see one light field.
 */
export function makeSharedUniforms(THREE_, opts = {}) {
  const R = FEEL.render;
  return {
    uIrr: { value: opts.irradianceTexture || null },
    uIrrOrigin: { value: new THREE_.Vector2(0, 0) },
    uIrrScale: { value: new THREE_.Vector2(1, 1) },
    uIrrInvHeight: { value: 1 / FEEL.field.vertical },
    uIrrGain: { value: 1 },
    uLights: { value: opts.lightTexture || null },
    uLightCount: { value: 0 },
    uAmbient: { value: R.ambient },
    uHemi: { value: R.hemi },
    // THE ART PASS's one runtime knob, and the only uniform it adds to the
    // shared bag. 1 in the shipping page; the picture gate drives it to 0 to
    // capture a byte-exact "before" frame and asserts it is 1 everywhere else,
    // because a knob that can silently ship at 0 is a knob that eventually does.
    // A uniform and NOT a define: docs/RENDER.md's permutation budget is zero.
    uSurfaceDetail: { value: 1 },
    uFogColor: { value: new THREE_.Color(R.fogColor) },
    uFogDensity: { value: R.fogDensity },
    uTime: { value: 0 },
  };
}

const share = (shared, names) => {
  const out = {};
  for (const n of names) out[n] = shared[n];
  return out;
};

const SURFACE_SHARED = ['uIrr', 'uIrrOrigin', 'uIrrScale', 'uIrrInvHeight', 'uIrrGain', 'uLights', 'uLightCount', 'uAmbient', 'uHemi', 'uFogColor', 'uFogDensity', 'uSurfaceDetail'];
const VM_SHARED = ['uIrr', 'uIrrOrigin', 'uIrrScale', 'uIrrInvHeight', 'uIrrGain', 'uLights', 'uLightCount', 'uAmbient', 'uHemi'];

/**
 * The material factory handed to every other workstream. Each call mints a new
 * material with its own colour uniforms and adds ZERO programs, because the
 * source string is interned. Nobody outside this file writes a shader.
 */
export function makeFamily(shared) {
  const R = FEEL.render;

  // ---- THE LENDING LEDGER --------------------------------------------------
  // Every GPU program in this game is born in this file, and most of the
  // materials minted here are LENT to a workstream that did not create them:
  // world/build.js takes surfaceStatic/surfaceInstanced/emissiveUnlit for the
  // chamber, weapons/viewmodel.js takes the two viewmodel materials. three frees
  // a program when the LAST material referencing it is disposed, so one material
  // still held anywhere keeps a whole shader compile alive — and the render
  // system's own dispose() had no way to reach it. Measured before this ledger
  // existed: render.dispose() left FOUR of seventeen programs linked
  // (SURFACE_STATIC held by 2 chamber meshes, SURFACE_INSTANCED by 18,
  // VIEWMODEL_SURFACE and VIEWMODEL_EMISSIVE by the weapon rig).
  //
  // The borrower is the wrong place to fix that, because the invariant then
  // depends on five workstreams each remembering. The MINTER is the right place:
  // the family knows everything it handed out and can take it all back.
  //
  // The set prunes itself through each material's own dispose event, so a
  // borrower that DOES clean up after itself (build.js disposes its materials on
  // every chamber teardown) leaves nothing behind here either — this is a
  // backstop for teardown, never a second owner during play.
  const live = new Set();
  const track = (m) => {
    live.add(m);
    const gone = () => { live.delete(m); m.removeEventListener('dispose', gone); };
    m.addEventListener('dispose', gone);
    return m;
  };

  // `rough` is 0 (polished) .. 1 (chalk). It costs ZERO programs — it is a
  // uniform on a shared source string — so a chamber may hand a different one to
  // every surface it builds and the budget does not move. The default is
  // roughSurface, i.e. concrete: nobody who never heard of this parameter gets a
  // mirror by accident.
  const surfaceStatic = (o = {}) => track(raw(VS_SURFACE, FS_SURFACE, {
    ...share(shared, SURFACE_SHARED),
    uBaseColor: { value: new THREE.Color(o.color !== undefined ? o.color : R.drab) },
    uEmissive: { value: new THREE.Color(o.emissive !== undefined ? o.emissive : 0x000000) },
    uDetail: { value: o.detail !== undefined ? o.detail : 1 },
    uRough: { value: o.rough !== undefined ? o.rough : T.roughSurface },
  }, { side: o.side }));

  const surfaceInstanced = (o = {}) => track(raw(VS_SURFACE_INSTANCED, FS_SURFACE_INSTANCED, {
    ...share(shared, SURFACE_SHARED),
    uBaseColor: { value: new THREE.Color(o.color !== undefined ? o.color : R.drab) },
    uDetail: { value: o.detail !== undefined ? o.detail : 1 },
    uRough: { value: o.rough !== undefined ? o.rough : T.roughSurface },
  }, { side: o.side }));

  const emissiveUnlit = (o = {}) => track(raw(VS_EMISSIVE, FS_EMISSIVE, {
    ...share(shared, ['uFogColor', 'uFogDensity']),
    uEmissive: { value: new THREE.Color(o.emissive !== undefined ? o.emissive : 0xffffff) },
    uIntensity: { value: o.intensity !== undefined ? o.intensity : FEEL.enemies.stripEmissive.min },
    uDuty: { value: 1 },
  }, { side: o.side }));

  const scarDecal = () => track(raw(VS_DECAL, FS_DECAL, {
    ...share(shared, ['uTime']),
    uColor: { value: new THREE.Color().fromArray(R.warm) },
    uBreatheBase: { value: FEEL.field.breatheBase },
    uBreatheAmp: { value: FEEL.field.breatheAmp },
    uBreatheHz: { value: FEEL.field.breatheHz },
    uFadeFrom: { value: FEEL.field.decalFadeFrom },
    uFadeRange: { value: FEEL.field.decalFadeRange },
  }, { blend: 'add', depthWrite: false, side: THREE.DoubleSide, decal: true }));

  const contactBlob = () => track(raw(VS_BLOB, FS_BLOB, {}, {
    blend: 'multiply', depthWrite: false, side: THREE.DoubleSide, decal: true,
  }));

  const additiveInstanced = () => track(raw(VS_ADDITIVE, FS_ADDITIVE, {}, {
    blend: 'add', depthWrite: false, side: THREE.DoubleSide,
  }));

  const dustPoints = () => track(raw(VS_DUST, FS_DUST, {
    ...share(shared, ['uIrr', 'uIrrOrigin', 'uIrrScale', 'uIrrInvHeight', 'uIrrGain', 'uTime']),
    uColor: { value: new THREE.Color().fromArray(R.warm) },
    uDustScale: { value: 1 },
    uDustGain: { value: R.dustIrradianceScale },
    uDustDrift: { value: new THREE.Vector3(0.25, 0.12, 0.25) },
    uSizePx: { value: T.dustSizePx },
  }, { blend: 'add', depthWrite: false }));

  const viewmodelSurface = (o = {}) => track(raw(VS_VIEWMODEL, FS_VIEWMODEL_SURFACE, {
    ...share(shared, VM_SHARED),
    uBaseColor: { value: new THREE.Color(o.color !== undefined ? o.color : R.drab) },
    uEmissive: { value: new THREE.Color(o.emissive !== undefined ? o.emissive : 0x000000) },
    uRim: { value: o.rim !== undefined ? o.rim : 0.5 },
    uRough: { value: o.rough !== undefined ? o.rough : T.roughViewmodel },
  }, { side: o.side }));

  const viewmodelEmissive = (o = {}) => track(raw(VS_VIEWMODEL, FS_VIEWMODEL_EMISSIVE, {
    uEmissive: { value: new THREE.Color(o.emissive !== undefined ? o.emissive : 0xffffff) },
    uIntensity: { value: o.intensity !== undefined ? o.intensity : 1 },
    uNotch: { value: 1 },
  }, { side: o.side }));

  const irradianceSplat = () => track(raw(VS_SPLAT, FS_SPLAT, {
    uOrigin: { value: new THREE.Vector2(0, 0) },
    uInvSize: { value: new THREE.Vector2(1, 1) },
  }, { blend: 'add', depthTest: false, depthWrite: false, side: THREE.DoubleSide }));

  /**
   * Take back every material this family ever lent out, wherever it ended up.
   * Called by render's dispose() and by nothing else — during play a borrower
   * disposes its own materials on its own schedule and this set empties itself.
   *
   * Disposing twice is safe: three's material dispose listener removes itself
   * after the first call, and so does ours.
   *
   * Returns how many were still outstanding, which is the number a teardown test
   * wants to see reported rather than merely asserted away.
   */
  const disposeAll = () => {
    const outstanding = live.size;
    for (const m of Array.from(live)) m.dispose();
    live.clear();
    return outstanding;
  };

  return {
    surfaceStatic, surfaceInstanced, emissiveUnlit,
    scarDecal, contactBlob, additiveInstanced, dustPoints,
    viewmodelSurface, viewmodelEmissive, irradianceSplat,
    disposeAll,
    /** How many minted materials are still undisposed. QA only. */
    get liveCount() { return live.size; },
  };
}

// ---------------------------------------------------------------------------
// Geometry helpers. Instanced meshes MUST set frustumCulled = false: an
// InstancedBufferGeometry's bounding sphere is computed from the BASE geometry,
// so a bucket whose instances live out in the world is culled as if it sat at
// the origin. Measured on this box during the render probe -- an instanced quad
// pair vanished entirely until the flag was cleared.
// ---------------------------------------------------------------------------
export function makeQuadInstances(capacity, attrs) {
  const g = new THREE.InstancedBufferGeometry();
  // Corners at +-1, so a per-instance "size" is a RADIUS and the unit-disc test
  // in the fragment shader ("dot(vLocal, vLocal) >= 1.0") lines up with the world
  // radius exactly. At +-0.5 every splat, decal and blob is silently half the
  // size the simulation thinks it is, which is the kind of drift the irradiance
  // readback assertion exists to catch.
  const half = 1;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -half, -half, 0, half, -half, 0, half, half, 0, -half, half, 0,
  ]), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
  const arrays = {};
  for (const name of attrs) {
    const data = new Float32Array(capacity * 4);
    const attr = new THREE.InstancedBufferAttribute(data, 4);
    attr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(name, attr);
    arrays[name] = attr;
  }
  g.instanceCount = 0;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  return { geometry: g, arrays, capacity };
}

export function makeFullscreenGeometry() {
  const g = new THREE.BufferGeometry();
  // One oversized triangle. Cheaper than a quad and it has no diagonal seam.
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -1, -1, 0, 3, -1, 0, -1, 3, 0,
  ]), 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  return g;
}

export default makeFamily;
