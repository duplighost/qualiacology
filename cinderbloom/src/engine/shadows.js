// =============================================================================
// CINDERBLOOM — cascaded shadow maps + screen-space contact shadows.
// Owner: shadows agent. CONTRACT §4/§5 (order 0), RENDER_PLAN §2.1 (2.00 ms).
// =============================================================================
//
// ## WHAT THIS IS
//
// three's own directional shadow is disabled on `ctx.sys.sky.sun`
// (`sun.castShadow = false`, `renderer.shadowMap.autoUpdate = false`). This
// system replaces it with:
//
//   * 2–4 stabilised cascades rendered into ONE depth atlas at frame-graph
//     order 0. Each cascade is fitted to the bounding SPHERE of its view
//     frustum slice (constant extent under camera rotation) and its centre is
//     snapped to whole shadow texels in light space, so the shadow does not
//     swim when the camera moves. `__CB.toggle('csmFreeze')` freezes the fit so
//     you can prove it.
//   * PCSS-style variable penumbra: a blocker search sized by the sun's angular
//     radius, then a rotated 16-point Poisson PCF at the derived radius, so
//     contact is tight and a 20 m spire's shadow edge is soft.
//   * Normal-offset + slope-scaled depth bias, both expressed in *shadow texels
//     of the cascade doing the lookup*, so one number is correct at every
//     cascade scale. This is what buys "no acne on 60° ash slopes AND no
//     peter-panning".
//   * A screen-space contact-shadow trace against last frame's linear depth,
//     applied inside the forward shader so it multiplies DIRECT light only.
//     This is what will make foliage sit on the ground instead of floating.
//
// ## HOW MATERIALS GET IT
//
// Nothing. This system walks `ctx.scene` (every 30 render frames, and
// immediately on `ctx.bus.emit('sceneDirty')`) and chains an `onBeforeCompile`
// onto every MeshStandard/MeshPhysical material, exactly the way
// `renderer.js:enrichMaterial` does, and updates `material.userData.cbCompileFn`
// so the renderer's own scan does not think its injection was clobbered and
// re-enrich (which would double-inject and fail to link).
//
// If you write a RawShaderMaterial for an opaque surface, take the GLSL from
// `ctx.sys.shadows.GLSL_CSM_SAMPLE` and the uniforms from
// `ctx.sys.shadows.getSharedUniforms()` — the same strings volumetrics uses
// (RENDER_PLAN §5.4).
//
// ## CASTERS
//
// Everything opaque casts by default. Opt out with `mesh.userData.cbNoShadow`,
// or by setting `castShadow = false` on an object bigger than the shadowed world
// (see `_fitsShadowedWorld`). The sky dome, transparent materials,
// `depthWrite:false` materials, points, lines and sprites are excluded
// automatically.
//
// ## DIAGNOSIS 2026-07-30 — "shadows dim instead of shaping" (finding B)
//
// The measurement that opened this: on `establish`, shadows ON gives
// meanLuma 0.335 / stdLuma 0.139 and shadows OFF gives 0.421 / 0.172. Enabling
// shadows RAISED mean-relative flatness, which is the signature of a broad
// uniform dim rather than a carve. Four hypotheses were on the table (everything
// self-shadowing; runaway penumbra; `strength` applied as a global multiply;
// the shadow attenuating ambient as well as direct).
//
// All four were tested and three are dead:
//
//   * `tools/shadowdiag.mjs` reads the shadow term straight off the GPU through
//     `GLSL_CSM_SAMPLE`. The histogram is BIMODAL — 42% at 0.0, 57.5% at 1.0,
//     under 1% in between. The penumbra is not runaway and `strength` is not a
//     global lerp. Killing the contact trace moves meanS by 0.001, so it is not
//     the screen-space term either.
//   * `CSM_APPLY` multiplies `directLight.color` inside three's unrolled
//     directional loop, so it cannot touch the IBL. `cbCsm*` appears in no other
//     file (grep), so nothing else re-applies it. Hypothesis 4 is architecturally
//     impossible here.
//   * `tools/shadowdelta.mjs` reports the raw comparison in metres. Cascade 0's
//     1st percentile is -0.33 m — nothing sits near zero, so there is no acne and
//     the bias/normal-offset are not the cause. Removing the normal offset
//     entirely changes the occluded fraction by 0.2%.
//
// What is true is the EFFECT of hypothesis 1, for a reason that is not a bug in
// this file: 96.3% of SUN-FACING pixels on `establish` come back fully occluded,
// so the term collapses to a near-constant 0 and multiplying by it is a uniform
// dim. `tools/sunconsist.mjs` marches `terrain.heightAt` toward the sun on the
// CPU, with no involvement from this renderer at all, and independently agrees:
// at the sun elevation the review vistas actually run at, 0.3% of the ground on
// `establish` has line of sight to the sun (6% on `mat-ground`, 0% on `ridge`,
// where the sun is 0.44 deg BELOW the horizon). The cascades are faithfully
// reporting a world the key light never reaches.
//
// `tools/sunsweepshadow.mjs` proves the system is capable of the terminator the
// critics want — sweep the sun and everything moves the right way:
//
//     elev   7 deg -> 2.7% of sun-facing pixels fully lit, frame stdLuma 0.144
//     elev  20 deg -> 12.4%                                          0.205
//     elev  30 deg -> 31.7%                                          0.229
//     elev  45 deg -> 48.5%                                          0.222
//
// stdLuma rises WITH the lit fraction, which is the numeric signature the brief
// asked for; it is the sun elevation, not the cascades, that is withholding it.
// The vista sim times (`main.js:gotoVista`) and the elevation curve
// (`Sky.js:setTimeOfDay`) own that. Filed under `## requests` in HANDOFF.md with
// the full table. Do NOT "fix" it in here by shortening `casterDistance` or
// lifting `strength`: both are lies that produce peter-panning at 250 m.
//
// Alpha-tested or vertex-animated casters (foliage!) MUST set
// `mesh.customDepthMaterial` — three's standard convention. We honour it with a
// second render phase. Without it, your wind sway and your leaf cutouts do not
// exist in the shadow map and the shadow will be a solid rectangle that does not
// move with the plant.
//
// =============================================================================

import * as THREE from 'three';
import { enrichMaterial } from './renderer.js';

// 16-point Poisson disk (Nvidia PCSS reference set). Rotated per pixel, so the
// fixed pattern never shows up as a repeating structure.
const POISSON = `const vec2 CB_POISSON[16] = vec2[16](
  vec2(-0.94201624,-0.39906216), vec2( 0.94558609,-0.76890725),
  vec2(-0.09418410,-0.92938870), vec2( 0.34495938, 0.29387760),
  vec2(-0.91588581, 0.45771432), vec2(-0.81544232,-0.87912464),
  vec2(-0.38277543, 0.27676845), vec2( 0.97484398, 0.75648379),
  vec2( 0.44323325,-0.97511554), vec2( 0.53742981,-0.47373420),
  vec2(-0.26496911,-0.41893023), vec2( 0.79197514, 0.19090188),
  vec2(-0.24188840, 0.99706507), vec2(-0.81409955, 0.91437590),
  vec2( 0.19984126, 0.78641367), vec2( 0.14383161,-0.14100790));`;

/**
 * Shared GLSL. `n` cascades, `pcf` PCF taps, `blocker` blocker-search taps
 * (0 = fixed-radius PCF, no PCSS), `contact` contact-trace steps (0 = off).
 */
function csmGLSL({ n, pcf, blocker, contact, index }) {
  return /* glsl */`
#define CB_CSM_N ${n}
#define CB_CSM_PCF ${pcf}
#define CB_CSM_BLOCKER ${blocker}
#define CB_CSM_CONTACT ${contact}
#define CB_CSM_INDEX ${index}

uniform sampler2D uCsmAtlas;
uniform mat4  uCsmMat[CB_CSM_N];
uniform vec4  uCsmSplit;      // far view-depth (m) of cascades 0..3
uniform vec4  uCsmTexel;      // world size (m) of one shadow texel, per cascade
uniform vec4  uCsmRange;      // ortho depth range (m), per cascade
uniform vec4  uCsmA;          // x enabled, y normalOffset(texels), z penumbraScale, w strength
uniform vec4  uCsmB;          // x constBias(texels), y slopeBias(texels), z tanSunHalf, w maxPenumbra(texels)
uniform vec4  uCsmFade;       // x shadowDist, y blendRatio, z minPenumbra(texels), w unused
uniform vec4  uCsmGrid;       // x cols, y rows, z 1/cols, w 1/rows
uniform vec2  uCsmAtlasTexel; // 1 / atlas size
uniform vec4  uCsmContact;    // x length(m), y thickness(m), z intensity, w maxDist(m)
uniform vec4  uCsmDbg;        // x cascadeTint, y temporal noise offset, zw unused
uniform mat4  uCsmProj;       // camera projection, for the screen-space trace
uniform sampler2D uCsmSceneZ; // last frame's linear view depth (metres)

${POISSON}

vec3 cbCsmTint_ = vec3(1.0);

float cbCsmSel(vec4 v, int i){ return i == 0 ? v.x : (i == 1 ? v.y : (i == 2 ? v.z : v.w)); }

// Interleaved gradient noise (Jimenez). Deterministic: the caller feeds a
// simulation frame index, never wall time, never Math.random.
float cbCsmIGN(vec2 p){
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

vec2 cbCsmTileMin(int c){
  int cols = int(uCsmGrid.x + 0.5);
  int ty = c / cols;
  return vec2(float(c - ty * cols) * uCsmGrid.z, float(ty) * uCsmGrid.w);
}

// textureLod, never texture(): these run inside loops with data-dependent trip
// counts, and an implicit-derivative fetch there is undefined behaviour (D3D
// warns X3595 and the harness treats gl warnings as failures). The atlas has no
// mips and NearestFilter, so level 0 is bit-identical to the implicit fetch.
float cbCsmTap(vec2 uv, vec2 tmin, vec2 tmax){
  return textureLod(uCsmAtlas, clamp(uv, tmin, tmax), 0.0).r;
}

float cbCsmLookup(int c, vec3 wpos, vec3 wnrm, float NoL, mat2 rot){
  float texel = cbCsmSel(uCsmTexel, c);
  float range = max(cbCsmSel(uCsmRange, c), 1e-3);
  float sinT  = sqrt(max(0.0, 1.0 - NoL * NoL));

  // Normal offset: push the sample point off the surface by a fraction of a
  // shadow texel, more at grazing incidence. Kills acne without the depth-bias
  // detachment that reads as peter-panning.
  vec3 p = wpos + wnrm * (texel * uCsmA.y * (0.55 + 1.85 * sinT));

  vec4 sc = uCsmMat[c] * vec4(p, 1.0);
  vec3 suv = sc.xyz / max(sc.w, 1e-6);

  vec2 tmin = cbCsmTileMin(c);
  vec2 tsz  = vec2(uCsmGrid.z, uCsmGrid.w);
  if (any(lessThan(suv.xy, tmin)) || any(greaterThan(suv.xy, tmin + tsz))) return 1.0;
  if (suv.z >= 1.0 || suv.z <= 0.0) return 1.0;
  tmin += uCsmAtlasTexel;
  vec2 tmax = tmin + tsz - uCsmAtlasTexel * 2.0;

  float tanT = clamp(sinT / max(NoL, 1e-3), 0.0, 4.0);
  float bias = texel * (uCsmB.x + uCsmB.y * tanT) / range;

  float radius = uCsmFade.z;

#if CB_CSM_BLOCKER > 0
  // --- PCSS blocker search: how far above me is the thing casting on me? ---
  float search = clamp(uCsmB.w * 1.3, 2.0, 28.0);
  vec2  sscale = uCsmAtlasTexel * search;
  float bSum = 0.0, bCount = 0.0;
  for (int i = 0; i < CB_CSM_BLOCKER; i++) {
    float d = cbCsmTap(suv.xy + rot * CB_POISSON[i] * sscale, tmin, tmax);
    float hit = step(d, suv.z - bias);
    bSum += d * hit; bCount += hit;
  }
  if (bCount < 0.5) return 1.0;                 // fully lit — the cheap exit
  float distM = max(0.0, (suv.z - bSum / bCount) * range);
  radius = clamp(distM * uCsmB.z * uCsmA.z / texel, uCsmFade.z, uCsmB.w);
#endif

  vec2 pscale = uCsmAtlasTexel * radius;
  float lit = 0.0;
  for (int i = 0; i < CB_CSM_PCF; i++) {
    float d = cbCsmTap(suv.xy + rot * CB_POISSON[i] * pscale, tmin, tmax);
    lit += step(suv.z - bias, d);
  }
  return lit / float(CB_CSM_PCF);
}

// One-tap world-space lookup with cascade cross-fade. This is the entry point
// volumetrics uses (RENDER_PLAN §5.4) — one tap per march step, no PCF.
float cbCsmShadowWorld(vec3 wpos, float viewZ){
  if (uCsmA.x < 0.5) return 1.0;
  if (viewZ >= uCsmFade.x) return 1.0;
  int c = 0;
  if (viewZ > uCsmSplit.x) c = 1;
  if (viewZ > uCsmSplit.y) c = 2;
  if (viewZ > uCsmSplit.z) c = 3;
  c = min(c, CB_CSM_N - 1);
  vec2 tsz = vec2(uCsmGrid.z, uCsmGrid.w);
  float s = 1.0;
  for (int k = 0; k < 2; k++) {
    int ci = min(c + k, CB_CSM_N - 1);
    vec4 sc = uCsmMat[ci] * vec4(wpos, 1.0);
    vec3 suv = sc.xyz / max(sc.w, 1e-6);
    vec2 tmin = cbCsmTileMin(ci);
    float v = 1.0;
    if (!(any(lessThan(suv.xy, tmin)) || any(greaterThan(suv.xy, tmin + tsz)) || suv.z >= 1.0)) {
      float bias = cbCsmSel(uCsmTexel, ci) * uCsmB.x * 1.5 / max(cbCsmSel(uCsmRange, ci), 1e-3);
      v = step(suv.z - bias, textureLod(uCsmAtlas, suv.xy, 0.0).r);
    }
    if (k == 0) { s = v; }
    else if (c < CB_CSM_N - 1) {
      float far = cbCsmSel(uCsmSplit, c);
      float n0  = c == 0 ? 0.0 : cbCsmSel(uCsmSplit, c - 1);
      float band = max((far - n0) * uCsmFade.y, 1e-4);
      s = mix(s, v, clamp((viewZ - (far - band)) / band, 0.0, 1.0));
    }
  }
  return mix(1.0, s, uCsmA.w);
}

// Screen-space contact shadow. Marches last frame's linear depth toward the
// sun. Catches the small-scale occlusion the cascades' texel size cannot: the
// dark seam where a stem meets the ash.
float cbCsmContactTrace(vec3 viewPos, vec3 L, vec2 fc){
#if CB_CSM_CONTACT > 0
  if (uCsmContact.z <= 0.0) return 1.0;
  float z0 = -viewPos.z;
  float fade = 1.0 - smoothstep(uCsmContact.w * 0.6, uCsmContact.w, z0);
  if (fade <= 0.002) return 1.0;
  float stepLen = uCsmContact.x / float(CB_CSM_CONTACT);
  float jit = cbCsmIGN(fc + uCsmDbg.y);
  float occ = 0.0;
  for (int s = 1; s <= CB_CSM_CONTACT; s++) {
    vec3 q = viewPos + L * (stepLen * (float(s) - jit));
    vec4 cp = uCsmProj * vec4(q, 1.0);
    if (cp.w <= 1e-4) break;
    vec2 uv = cp.xy / cp.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
    float sceneZ = textureLod(uCsmSceneZ, uv, 0.0).r;
    float rayZ = -q.z;
    float d = rayZ - sceneZ;
    float thick = uCsmContact.y + rayZ * 0.035;
    float bias  = 0.035 + rayZ * 0.014;
    if (d > bias && d < thick) {
      // A hard 0/1 hit turns the per-pixel ray jitter into salt-and-pepper
      // speckle. Weight the hit by how solidly it sits inside the thickness
      // window: marginal hits contribute partially, so neighbouring pixels with
      // different jitter phases produce a gradient instead of noise. TAA still
      // does the real cleanup, but this keeps a still frame presentable.
      float centred = smoothstep(bias, bias + (thick - bias) * 0.35, d)
                    * (1.0 - smoothstep(thick * 0.55, thick, d));
      float tail = 1.0 - smoothstep(0.7, 1.0, float(s) / float(CB_CSM_CONTACT)) * 0.6;
      occ = centred * tail;
      break;
    }
  }
  return 1.0 - occ * uCsmContact.z * fade;
#else
  return 1.0;
#endif
}

float cbCsmEvaluate(vec3 wpos, vec3 wnrm, vec3 viewPos, vec3 Lview, vec3 nView, vec2 fc){
  cbCsmTint_ = vec3(1.0);
  if (uCsmA.x < 0.5) return 1.0;
  float NoL = dot(nView, Lview);
  if (NoL <= 0.0) return 1.0;              // N·L already kills it; save the taps

  float z = -viewPos.z;
  float s = 1.0;
  float keep = 1.0 - smoothstep(uCsmFade.x * 0.86, uCsmFade.x, z);
  if (keep > 0.002) {
    float ang = cbCsmIGN(fc + uCsmDbg.y) * 6.2831853;
    float ca = cos(ang), sa = sin(ang);
    mat2 rot = mat2(ca, sa, -sa, ca);

    int c = 0;
    if (z > uCsmSplit.x) c = 1;
    if (z > uCsmSplit.y) c = 2;
    if (z > uCsmSplit.z) c = 3;
    c = min(c, CB_CSM_N - 1);

    s = cbCsmLookup(c, wpos, wnrm, NoL, rot);

    if (c < CB_CSM_N - 1) {
      float far = cbCsmSel(uCsmSplit, c);
      float n0  = c == 0 ? 0.0 : cbCsmSel(uCsmSplit, c - 1);
      float band = max((far - n0) * uCsmFade.y, 1e-4);
      float t = (z - (far - band)) / band;
      if (t > 0.0) s = mix(s, cbCsmLookup(c + 1, wpos, wnrm, NoL, rot), clamp(t, 0.0, 1.0));
    }
    s = mix(1.0, s, keep);
    if (uCsmDbg.x > 0.5) {
      cbCsmTint_ = c == 0 ? vec3(1.0, 0.35, 0.35)
                 : c == 1 ? vec3(0.35, 1.0, 0.40)
                 : c == 2 ? vec3(0.40, 0.55, 1.0)
                          : vec3(1.0, 0.90, 0.35);
    }
  }

  s = min(s, cbCsmContactTrace(viewPos, Lview, fc));
  return mix(1.0, s, uCsmA.w);
}
`;
}

const CSM_PREAMBLE = /* glsl */`
vec3 cbCsmViewPos_ = -vViewPosition;
vec3 cbCsmWorldPos_ = cameraPosition + ( vec4( cbCsmViewPos_, 0.0 ) * viewMatrix ).xyz;
vec3 cbCsmGeoNW_ = normalize( ( vec4( nonPerturbedNormal, 0.0 ) * viewMatrix ).xyz );
`;

// Injected immediately after getDirectionalLightInfo() inside three's unrolled
// directional-light loop, so it multiplies DIRECT irradiance only — never the
// indirect/IBL term (which is GTAO's job, RENDER_PLAN §2).
const CSM_APPLY = /* glsl */`
#if ( UNROLLED_LOOP_INDEX == CB_CSM_INDEX )
  {
    float cbCsmS_ = cbCsmEvaluate( cbCsmWorldPos_, cbCsmGeoNW_, cbCsmViewPos_,
                                   directLight.direction, nonPerturbedNormal, gl_FragCoord.xy );
    directLight.color *= cbCsmS_;
    if ( uCsmDbg.x > 0.5 ) directLight.color *= cbCsmTint_;
  }
#endif
`;

const PRESET = {
  low:    { pcf: 4,  blocker: 0,  contact: 0,  blend: 0.10 },
  medium: { pcf: 8,  blocker: 0,  contact: 6,  blend: 0.11 },
  high:   { pcf: 12, blocker: 8,  contact: 10, blend: 0.12 },
  ultra:  { pcf: 16, blocker: 12, contact: 16, blend: 0.12 },
};

export class Shadows {
  static id = 'shadows';
  static deps = ['renderer', 'sky'];

  constructor(ctx) {
    this.ctx = ctx;

    // ---- knobs (ctx.debug.shadows mirrors this object) ----------------------
    this.enabled = true;
    this.splitLambda = 0.85;      // 0 = uniform splits, 1 = logarithmic
    this.shadowNear = 0.35;       // start of cascade 0 (m) — not camera.near, that wastes cascade 0
    this.casterDistance = 240;    // how far behind a slice we still gather casters (m)
    this.normalOffset = 1.55;     // shadow texels
    this.constBias = 0.9;         // shadow texels of depth
    this.slopeBias = 2.2;         // shadow texels of depth per unit slope
    this.sunAngularRadius = 0.305 * Math.PI / 180;  // ART §3.1: 0.61° disc
    this.penumbraScale = 1.6;     // artistic multiplier over the physical penumbra
    this.minPenumbraTexels = 0.85;
    this.maxPenumbraTexels = 9.0;
    this.strength = 1.0;
    this.contactLength = 0.6;     // m of screen-space ray
    this.contactThickness = 0.45; // m — how deep an occluder is assumed to be
    this.contactIntensity = 0.85;
    this.contactMaxDist = 45;     // m — contact shadows are a near-field effect
    this.maxAtlasSize = 8192;
    this.temporalRotation = true; // rotate the kernel per sim frame (TAA averages it)

    // ---- state --------------------------------------------------------------
    this.cascades = 0;
    this.resolution = 0;
    this.atlas = null;
    this.cams = [];
    this.viewports = [];
    this._splits = [];
    this._scanDue = 0;
    this._casters = [];
    this._customCasters = [];
    this._hidden = [];
    this._materials = new Set();
    this._probe = null;
    this._probeOn = false;
    this._castTris = 0;
    this._failed = false;
    this._variant = '';
    this._lastFlags = '';
    this.cost = { fitMs: 0, renderMs: 0, draws: 0 };

    // Cascade 0 is rendered every frame. More distant cascades are staggered,
    // but their camera + sampling matrix remain frozen with the tile
    // they produced. Updating a matrix without updating its depth tile is not a
    // temporal optimization; it is a corrupt shadow lookup.
    this._shadowFrame = 0;
    this._lastFullRefreshFrame = -1;
    this._updateMask = [];
    this._cascadeValid = [];
    this._cascadeUpdates = [];
    this._cascadeSkips = [];
    this._cascadeLastFrame = [];
    this._cascadeLastReason = [];
    this._updatedThisFrame = [];
    this._lastSubmittedTris = 0;
    this._fullRefreshes = 0;
    this._partialRefreshes = 0;
    this._forcedRefreshes = 0;
    this._forceRequests = 0;
    this._forceAllPending = true;
    this._pendingForceReason = 'initial';
    this._lastForceReason = null;
    this._wasOn = null;
    this._wasFrozen = false;

    // Last rendered-frame state, used only to identify cuts/teleports. Ordinary
    // walking and sun motion are allowed the intended one-frame far-field lag.
    this._frameStateValid = false;
    this._lastCameraPosition = new THREE.Vector3();
    this._lastCameraQuaternion = new THREE.Quaternion();
    this._lastSunDirection = new THREE.Vector3(0, 1, 0);
    this._lastFov = 0;
    this._lastZoom = 1;
    this._lastAspect = 1;
    this._lastNear = 0;

    this._tmp = {
      lx: new THREE.Vector3(), ly: new THREE.Vector3(), lz: new THREE.Vector3(),
      up: new THREE.Vector3(), c: new THREE.Vector3(), eye: new THREE.Vector3(),
      fwd: new THREE.Vector3(), m: new THREE.Matrix4(), m2: new THREE.Matrix4(),
    };
  }

  // ---------------------------------------------------------------------------
  // init
  // ---------------------------------------------------------------------------

  async init() {
    const { ctx } = this;

    // Take over three's directional shadow. Everything below replaces it.
    const sky = ctx.sys.sky;
    this.sun = sky?.sun || null;
    if (this.sun) {
      this.sun.castShadow = false;
      this.sun.shadow?.dispose?.();
    }
    ctx.renderer.shadowMap.autoUpdate = false;
    ctx.renderer.shadowMap.needsUpdate = false;
    ctx.renderer.shadowMap.enabled = false;

    // Cache the patched copy of three's own chunk. Built from ShaderChunk at
    // runtime rather than pasted, so an r161 point release cannot silently
    // desync us from the real lighting loop.
    const base = THREE.ShaderChunk.lights_fragment_begin;
    const anchor = 'getDirectionalLightInfo( directionalLight, directLight );';
    if (base.indexOf(anchor) < 0) throw new Error('shadows: lights_fragment_begin anchor missing (three version drift)');
    this._patchedChunk = base.replace(anchor, anchor + '\n' + CSM_APPLY);

    this.uniforms = {
      uCsmAtlas: { value: null },
      uCsmMat: { value: [] },
      uCsmSplit: { value: new THREE.Vector4(1e9, 1e9, 1e9, 1e9) },
      uCsmTexel: { value: new THREE.Vector4(1, 1, 1, 1) },
      uCsmRange: { value: new THREE.Vector4(1, 1, 1, 1) },
      uCsmA: { value: new THREE.Vector4(0, this.normalOffset, this.penumbraScale, this.strength) },
      uCsmB: { value: new THREE.Vector4(this.constBias, this.slopeBias, Math.tan(this.sunAngularRadius), this.maxPenumbraTexels) },
      uCsmFade: { value: new THREE.Vector4(220, 0.12, this.minPenumbraTexels, 0) },
      uCsmGrid: { value: new THREE.Vector4(2, 2, 0.5, 0.5) },
      uCsmAtlasTexel: { value: new THREE.Vector2(1, 1) },
      uCsmContact: { value: new THREE.Vector4(this.contactLength, this.contactThickness, this.contactIntensity, this.contactMaxDist) },
      uCsmDbg: { value: new THREE.Vector4(0, 0, 0, 0) },
      uCsmProj: { value: new THREE.Matrix4() },
      uCsmSceneZ: { value: null },
    };

    // 1x1 stand-in so the contact trace never samples a null texture before the
    // renderer has produced a gViewZ (and so it reads "sky", i.e. no occluder).
    this._noZ = new THREE.DataTexture(new Float32Array([1e6, 0, 0, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType);
    this._noZ.needsUpdate = true;
    this.uniforms.uCsmSceneZ.value = this._noZ;

    this._depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking });
    this._depthMat.colorWrite = false;   // the atlas' colour attachment is vestigial; only depth matters
    this._depthMat.side = THREE.FrontSide;

    this._allocate();
    this._configure();

    ctx.debug.flags.shadows = true;
    ctx.debug.flags.contactShadows = true;
    ctx.debug.flags.csmDebug = false;
    ctx.debug.flags.csmFreeze = false;
    ctx.debug.flags.shadowProbe = false;
    ctx.debug.shadows = this;

    ctx.bus.on('sceneDirty', () => {
      this._scanDue = 0;
      this._forceAllCascades('scene-dirty');
    });
    ctx.bus.on('rtResize', () => this._forceAllCascades('resize'));

    // Order 0 per CONTRACT §5. `inputs:['viewZ']` makes renderer.js build the
    // linear-depth ping-pong we trace contact shadows against; we read it at
    // order 0, which is LAST frame's — one frame of lag on a 0.55 m ray.
    this.pass = {
      id: 'shadows',
      order: 0,
      inputs: ['viewZ'],
      outputs: ['shadowAtlas'],
      execute: (target, gbuf, c) => this._execute(gbuf, c),
      reset: () => {
        this._scanDue = 0;
        this._forceAllCascades('temporal-reset');
      },
    };
    ctx.frameGraph.register(this.pass);
  }

  // ---------------------------------------------------------------------------
  // allocation + quality
  // ---------------------------------------------------------------------------

  _allocate() {
    const q = this.ctx.quality;
    const n = Math.max(1, Math.min(4, q.cascades | 0 || 4));
    const cols = n <= 2 ? n : 2;
    const rows = Math.ceil(n / cols);
    let res = Math.max(256, q.shadowRes | 0 || 2048);
    // keep the atlas inside the driver's (and our own) ceiling
    const cap = Math.min(this.maxAtlasSize, this.ctx.renderer.capabilities.maxTextureSize || 8192);
    while (cols * res > cap || rows * res > cap) res >>= 1;

    if (this.atlas && this.cascades === n && this.resolution === res) return;

    this.cascades = n;
    this.resolution = res;
    this._cols = cols; this._rows = rows;

    this.atlas?.depthTexture?.dispose();
    this.atlas?.dispose();

    const w = cols * res, h = rows * res;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      format: THREE.RedFormat, type: THREE.UnsignedByteType,   // 1 B/px, never written (colorWrite=false)
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: true, stencilBuffer: false, generateMipmaps: false,
      colorSpace: THREE.NoColorSpace, samples: 0,
    });
    const dt = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);   // DEPTH_COMPONENT24
    dt.format = THREE.DepthFormat;
    dt.minFilter = dt.magFilter = THREE.NearestFilter;
    dt.compareFunction = null;      // we do our own comparison; PCSS needs raw depth
    dt.name = 'csmAtlas';
    rt.depthTexture = dt;
    this.atlas = rt;

    this.cams = [];
    this.viewports = [];
    for (let i = 0; i < n; i++) {
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
      cam.matrixAutoUpdate = false;
      cam.matrixWorldAutoUpdate = false;
      this.cams.push(cam);
      const tx = i % cols, ty = (i / cols) | 0;
      this.viewports.push(new THREE.Vector4(tx * res, ty * res, res, res));
    }

    this.uniforms.uCsmAtlas.value = dt;
    this.uniforms.uCsmAtlasTexel.value.set(1 / w, 1 / h);
    this.uniforms.uCsmGrid.value.set(cols, rows, 1 / cols, 1 / rows);
    const mats = this.uniforms.uCsmMat.value;
    mats.length = 0;
    for (let i = 0; i < n; i++) mats.push(new THREE.Matrix4());

    this._splits = new Array(n + 1).fill(0);
    this._updateMask = new Array(n).fill(true);
    this._cascadeValid = new Array(n).fill(false);
    this._cascadeUpdates = new Array(n).fill(0);
    this._cascadeSkips = new Array(n).fill(0);
    this._cascadeLastFrame = new Array(n).fill(-1);
    this._cascadeLastReason = new Array(n).fill('never');
    this._updatedThisFrame = new Array(n).fill(false);
    this._lastFullRefreshFrame = -1;
    this._forceAllCascades('atlas-allocation');
    this.ctx.debug.stats.csmAtlas = `${w}x${h}`;
  }

  _configure() {
    const q = this.ctx.quality;
    const p = PRESET[q.preset] || PRESET.high;
    const contact = this.ctx.debug.flags.contactShadows === false ? 0 : p.contact;
    const v = `${this.cascades}|${p.pcf}|${p.blocker}|${contact}`;
    this.uniforms.uCsmFade.value.y = p.blend;
    this._preset = p;
    if (v === this._variant) return;
    this._variant = v;
    this._glsl = csmGLSL({ n: this.cascades, pcf: p.pcf, blocker: p.blocker, contact, index: this._sunIndex | 0 });
    // recompile everything already wearing our injection
    for (const m of this._materials) m.needsUpdate = true;
    // only ask renderer.js for the linear-depth pyramid when we actually trace
    if (this.pass) {
      this.pass.inputs = contact > 0 ? ['viewZ'] : [];
      this.ctx.frameGraph.invalidate?.();
    }
  }

  onQuality() {
    this._allocate();
    this._configure();
    this._scanDue = 0;
    this._forceAllCascades('quality-change');
  }

  // ---------------------------------------------------------------------------
  // material injection
  // ---------------------------------------------------------------------------

  _applyToMaterial(mat) {
    if (!mat || mat.userData?.cbCsm) return;
    if (!(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) return;
    if (mat.userData?.cbNoShadowRecv) return;

    const self = this;
    const prevCompile = mat.onBeforeCompile;
    const prevKey = mat.customProgramCacheKey;

    mat.onBeforeCompile = function (shader, renderer) {
      if (prevCompile) prevCompile.call(this, shader, renderer);
      Object.assign(shader.uniforms, self.uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + self._glsl)
        .replace('#include <lights_fragment_begin>', CSM_PREAMBLE + self._patchedChunk);
    };
    mat.customProgramCacheKey = function () {
      const b = prevKey ? prevKey.call(this) : '';
      return `${b}|cbcsm1|${self._variant}`;
    };

    if (!mat.userData) mat.userData = {};
    mat.userData.cbCsm = true;
    // renderer.js's scene scan compares onBeforeCompile against this. Keeping it
    // in sync is what stops it re-enriching (which would inject its gbuffer
    // block twice and fail to link).
    if (mat.userData.cbEnriched) mat.userData.cbCompileFn = mat.onBeforeCompile;
    mat.needsUpdate = true;
    this._materials.add(mat);
  }

  // ---------------------------------------------------------------------------
  // scene scan — casters, receivers, exclusions
  // ---------------------------------------------------------------------------

  _scan() {
    const { ctx } = this;
    const casters = this._casters; casters.length = 0;
    const custom = this._customCasters; custom.length = 0;
    const hidden = this._hidden; hidden.length = 0;
    const skyMesh = ctx.sys.sky?.mesh || null;
    let seen = 0, sunSeen = -1, tris = 0;

    ctx.scene.traverse((o) => {
      if (o.isDirectionalLight) { if (o === this.sun) sunSeen = seen; seen++; }
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      const m = o.material;
      const list = Array.isArray(m) ? m : (m ? [m] : []);
      for (const mm of list) this._applyToMaterial(mm);

      let cast = o.castShadow === true;
      if (!cast) {
        cast = o.isMesh
          && !o.userData?.cbNoShadow
          && o !== skyMesh
          && !(o.layers.mask & 2)          // CB_LAYER.SKY
          && list.length > 0
          && !list.some(mm => mm.transparent === true || mm.depthWrite === false)
          && this._fitsShadowedWorld(o);
      }
      if (cast) {
        tris += this._triCount(o);
        if (o.customDepthMaterial) custom.push(o); else casters.push(o);
      } else {
        hidden.push(o);
      }
    });

    // Which slot the sun occupies in three's directional-light array decides
    // which unrolled iteration we patch. It is 0 in every sane scene, but a
    // second directional light would silently shift it.
    const idx = sunSeen < 0 ? 0 : sunSeen;
    if (idx !== (this._sunIndex | 0)) {
      this._sunIndex = idx;
      this._variant = '';           // force a rebuild of the GLSL + recompile
      this._configure();
    }
    this._castTris = tris;
    ctx.debug.stats.csmCasters = casters.length + custom.length;
    ctx.debug.stats.csmCastTris = tris;
  }

  /** Triangles one caster contributes to EVERY cascade. Diagnostic only. */
  _triCount(o) {
    const g = o.geometry;
    if (!g) return 0;
    const n = g.index ? g.index.count / 3 : (g.attributes?.position?.count || 0) / 3;
    return (n * (o.isInstancedMesh ? Math.max(1, o.count) : 1)) | 0;
  }

  /**
   * Gate on the implicit-caster fallback in `_scan`.
   *
   * The documented default is "everything opaque casts", and that is right for
   * world geometry. It is wrong for an object whose bounding sphere is larger
   * than the entire shadowed distance: that is a far-field LOD shell or a
   * background plane, it cannot produce a meaningful cascade shadow, and its
   * owner has already said `castShadow = false` — which the old code threw away,
   * because `castShadow === false` is also the Object3D default and the fallback
   * could not tell "opted out" from "never touched it".
   *
   * Measured on `establish`, 2026-07-30 (`tools/shadowcasters.mjs`): the fallback
   * was opting in `terrain-ring-4608` (bounding radius 3262 m, 67584 tris),
   * `terrain-ring-1536` (1095 m, 67584 tris) and `liquid` (266 m, 2934 tris),
   * all three of which set `castShadow = false` in their own files. That is
   * 138k triangles re-rendered in each of 4 cascades, every frame, to produce a
   * 4.6 km LOD ring's silhouette inside a 25 m cascade. A/B via
   * `tools/shadowab.mjs` confirms excluding them moves the shadow term by
   * <= 0.001, so this is pure waste, not a look change.
   *
   * The size gate keeps the fallback working for anything world-scale, so a
   * system that simply forgets to set `castShadow` still casts as documented.
   */
  _fitsShadowedWorld(o) {
    const g = o.geometry;
    if (!g) return true;
    if (!g.boundingSphere) {
      try { g.computeBoundingSphere(); } catch { return true; }
    }
    const bs = g.boundingSphere;
    if (!bs || !isFinite(bs.radius)) return true;
    const s = o.scale ? Math.max(Math.abs(o.scale.x), Math.abs(o.scale.y), Math.abs(o.scale.z)) : 1;
    // never smaller than 64 m, so a low shadowDist preset cannot start culling
    // legitimate terrain tiles out of the cascades
    const limit = Math.max(64, this.ctx.quality.shadowDist || 220);
    return bs.radius * s <= limit;
  }

  // ---------------------------------------------------------------------------
  // temporal cascade cadence
  // ---------------------------------------------------------------------------

  _forceAllCascades(reason) {
    this._forceAllPending = true;
    this._pendingForceReason = reason || 'unspecified';
    this._forceRequests++;
  }

  /**
   * Detect a discontinuity between rendered frames, not normal motion. The
   * thresholds are deliberately generous: staggered cascades may lag by a few
   * rendered frames while walking or turning, but never across a camera cut,
   * teleport, abrupt lens change, or sun-direction jump.
   */
  _detectDiscontinuity() {
    const cam = this.ctx.camera;
    const t = this._tmp;
    const liveSun = this.ctx.sys.sky?.getSunDir?.();
    if (liveSun && liveSun.lengthSq() > 1e-8) t.lz.copy(liveSun).normalize();
    else t.lz.set(0.3, 0.6, 0.4).normalize();

    const fov = Number.isFinite(cam.fov) ? cam.fov : 50;
    const zoom = Number.isFinite(cam.zoom) && cam.zoom > 0 ? cam.zoom : 1;
    const aspect = Number.isFinite(cam.aspect) && cam.aspect > 0 ? cam.aspect : 1;
    const near = Number.isFinite(cam.near) ? cam.near : 0.1;

    if (!this._frameStateValid) {
      this._lastCameraPosition.copy(cam.position);
      this._lastCameraQuaternion.copy(cam.quaternion);
      this._lastSunDirection.copy(t.lz);
      this._lastFov = fov;
      this._lastZoom = zoom;
      this._lastAspect = aspect;
      this._lastNear = near;
      this._frameStateValid = true;
      return null;
    }

    let reason = null;
    if (this._lastCameraPosition.distanceToSquared(cam.position) > 16) {
      reason = 'camera-teleport';                  // > 4 m in one rendered frame
    } else {
      const qdot = Math.min(1, Math.abs(this._lastCameraQuaternion.dot(cam.quaternion)));
      if (qdot < Math.cos(12 * Math.PI / 360)) reason = 'camera-cut'; // > 12 degrees
      else if (this._lastSunDirection.dot(t.lz) < Math.cos(1.5 * Math.PI / 180)) reason = 'light-cut';
      else if (Math.abs(fov - this._lastFov) > 4
        || Math.abs(Math.log(zoom / this._lastZoom)) > 0.08
        || Math.abs(aspect - this._lastAspect) > 0.08
        // Near participates in every PSSM split, so even a small change must
        // not leave current split thresholds paired with an older far tile.
        || Math.abs(near - this._lastNear) > 1e-4) reason = 'projection-cut';
    }

    this._lastCameraPosition.copy(cam.position);
    this._lastCameraQuaternion.copy(cam.quaternion);
    this._lastSunDirection.copy(t.lz);
    this._lastFov = fov;
    this._lastZoom = zoom;
    this._lastAspect = aspect;
    this._lastNear = near;
    return reason;
  }

  _selectUpdateMask(forceAll) {
    const mask = this._updateMask;
    const outer = this.cascades - 1;
    // On the shipping low/medium ladder the far cascade is a 20 Hz temporal
    // field. It covers distant, haze-softened receivers and is stabilized in
    // world texels; updating it every other frame made GPU time alternate
    // ~20/31 ms and turned half of all frames into misses. High/ultra retain
    // half-rate far fields. Cuts, teleports and scene changes still force all.
    const farPeriod = (this.ctx.quality.preset === 'low' || this.ctx.quality.preset === 'medium') ? 3 : 2;
    const phase = this._lastFullRefreshFrame < 0
      ? 0
      : this._shadowFrame - this._lastFullRefreshFrame;

    for (let i = 0; i < this.cascades; i++) {
      // Cascade 0 is always current. Farther cascades stagger phase so a
      // three-cascade preset submits two cascades per ordinary frame rather
      // than oscillating between one and three.
      const cadenceDue = i === 0 || ((phase + outer - i) % farPeriod) === 0;
      mask[i] = forceAll || !this._cascadeValid[i] || cadenceDue;
    }
    return mask;
  }

  _recordCascadeUpdates(mask, forceAll, forceReason) {
    let updated = 0;
    for (let i = 0; i < this.cascades; i++) {
      const didUpdate = !!mask[i];
      this._updatedThisFrame[i] = didUpdate;
      if (didUpdate) {
        updated++;
        this._cascadeUpdates[i]++;
        this._cascadeLastFrame[i] = this._shadowFrame;
        this._cascadeLastReason[i] = forceAll ? `forced:${forceReason}` : (i === 0 ? 'near-current' : 'staggered');
      } else {
        this._cascadeSkips[i]++;
      }
    }

    this._lastSubmittedTris = this._castTris * updated;
    if (updated === this.cascades) {
      this._fullRefreshes++;
      this._lastFullRefreshFrame = this._shadowFrame;
    } else {
      this._partialRefreshes++;
    }
    if (forceAll) {
      this._forcedRefreshes++;
      this._lastForceReason = forceReason;
      this._forceAllPending = false;
      this._pendingForceReason = null;
    }
    this._shadowFrame++;
  }

  // ---------------------------------------------------------------------------
  // cascade fitting — stabilised, texel-snapped
  // ---------------------------------------------------------------------------

  _fit(updateMask) {
    const { ctx } = this;
    const cam = ctx.camera;
    const t = this._tmp;
    const n = this.cascades;
    const q = ctx.quality;
    const dist = Math.max(20, q.shadowDist || 220);
    const near = Math.max(this.shadowNear, cam.near);

    // practical (PSSM) split distribution
    this._splits[0] = near;
    for (let i = 1; i < n; i++) {
      const p = i / n;
      const log = near * Math.pow(dist / near, p);
      const uni = near + (dist - near) * p;
      this._splits[i] = uni + (log - uni) * this.splitLambda;
    }
    this._splits[n] = dist;

    // light basis: lz points TOWARD the sun
    const sunDir = ctx.sys.sky?.getSunDir?.() || t.lz.set(0.3, 0.6, 0.4).normalize();
    t.lz.copy(sunDir).normalize();
    if (t.lz.lengthSq() < 1e-6) t.lz.set(0, 1, 0);
    t.up.set(0, 1, 0);
    if (Math.abs(t.lz.y) > 0.985) t.up.set(0, 0, 1);
    t.lx.crossVectors(t.up, t.lz).normalize();
    t.ly.crossVectors(t.lz, t.lx).normalize();

    cam.getWorldDirection(t.fwd);
    const camPos = cam.position;
    // must match PerspectiveCamera.updateProjectionMatrix exactly, zoom included,
    // or an ADS zoom silently oversizes every cascade.
    const tanY = Math.tan(cam.fov * Math.PI / 360) / (cam.zoom || 1);
    const aspect = cam.aspect || 1;
    const k2 = tanY * tanY * (1 + aspect * aspect);

    const splitU = this.uniforms.uCsmSplit.value;
    const texelU = this.uniforms.uCsmTexel.value;
    const rangeU = this.uniforms.uCsmRange.value;
    splitU.set(1e9, 1e9, 1e9, 1e9);

    // Cascade selection is always current. Camera/matrix/texel state below is
    // updated only with the matching atlas tile, keeping every skipped tile a
    // coherent snapshot rather than pairing old depth with a new transform.
    for (let i = 0; i < n; i++) {
      const far = this._splits[i + 1];
      if (i === 0) { splitU.x = far; } else if (i === 1) { splitU.y = far; }
      else if (i === 2) { splitU.z = far; } else { splitU.w = far; }
    }

    for (let i = 0; i < n; i++) {
      if (!updateMask[i]) continue;
      const zn = this._splits[i], zf = this._splits[i + 1];

      // Bounding SPHERE of the frustum slice. Its radius depends only on the
      // split distances, never on camera orientation — that invariance is half
      // of "shadows do not swim"; texel snapping below is the other half.
      let z0 = (zn + zf) * (k2 + 1) * 0.5;
      let radius;
      if (z0 >= zf) { z0 = zf; radius = zf * Math.sqrt(k2); }
      else { radius = Math.sqrt(k2 * zn * zn + (z0 - zn) * (z0 - zn)); }
      radius = Math.max(radius, 0.05);

      t.c.copy(t.fwd).multiplyScalar(z0).add(camPos);

      const texel = (2 * radius) / this.resolution;
      // snap the centre to whole shadow texels in the light's own basis
      let cx = t.c.dot(t.lx), cy = t.c.dot(t.ly), cz = t.c.dot(t.lz);
      cx = Math.floor(cx / texel) * texel;
      cy = Math.floor(cy / texel) * texel;
      cz = Math.floor(cz / texel) * texel;
      t.c.set(0, 0, 0)
        .addScaledVector(t.lx, cx)
        .addScaledVector(t.ly, cy)
        .addScaledVector(t.lz, cz);

      const back = radius + this.casterDistance;
      t.eye.copy(t.c).addScaledVector(t.lz, back);

      const c = this.cams[i];
      c.left = -radius; c.right = radius; c.top = radius; c.bottom = -radius;
      c.near = 0.05; c.far = back + radius;
      c.updateProjectionMatrix();

      t.m.makeBasis(t.lx, t.ly, t.lz);   // camera looks down -lz, i.e. along the light
      t.m.setPosition(t.eye);
      c.matrixWorld.copy(t.m);
      c.matrix.copy(t.m);
      c.matrixWorldInverse.copy(t.m).invert();

      // world -> atlas UV + [0,1] depth
      const sx = 1 / this._cols, sy = 1 / this._rows;
      const ox = (i % this._cols) * sx, oy = ((i / this._cols) | 0) * sy;
      const M = this.uniforms.uCsmMat.value[i];
      M.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
      t.m2.set(
        0.5 * sx, 0, 0, 0.5 * sx + ox,
        0, 0.5 * sy, 0, 0.5 * sy + oy,
        0, 0, 0.5, 0.5,
        0, 0, 0, 1,
      );
      M.premultiply(t.m2);

      if (i === 0) { texelU.x = texel; rangeU.x = c.far - c.near; }
      else if (i === 1) { texelU.y = texel; rangeU.y = c.far - c.near; }
      else if (i === 2) { texelU.z = texel; rangeU.z = c.far - c.near; }
      else { texelU.w = texel; rangeU.w = c.far - c.near; }
      this._cascadeValid[i] = true;
    }

    this.uniforms.uCsmFade.value.x = dist;
  }

  // ---------------------------------------------------------------------------
  // the pass
  // ---------------------------------------------------------------------------

  _execute(gbuf, ctx) {
    if (this._failed) return;
    try {
      this._executeInner(gbuf, ctx);
    } catch (e) {
      // Degrade to "everything lit" rather than taking the frame down with us.
      this._failed = true;
      this.uniforms.uCsmA.value.x = 0;
      this.pass.enabled = false;
      ctx.frameGraph.invalidate?.();
      console.warn('[shadows] pass disabled after error:', e && e.message || e);
    }
  }

  _executeInner(gbuf, ctx) {
    const flags = ctx.debug.flags;
    const key = `${flags.shadows !== false}|${flags.contactShadows !== false}|${!!flags.csmDebug}|${!!flags.shadowProbe}`;
    if (key !== this._lastFlags) {
      this._lastFlags = key;
      this._configure();
      this._syncProbe(!!flags.shadowProbe);
    }

    const on = this.enabled && flags.shadows !== false && !!this.sun;
    const frozen = !!flags.csmFreeze;
    if (on && this._wasOn === false) this._forceAllCascades('reenabled');
    if (this._wasFrozen && !frozen) this._forceAllCascades('unfreeze');
    this._wasOn = on;
    this._wasFrozen = frozen;
    const u = this.uniforms;
    u.uCsmA.value.set(on ? 1 : 0, this.normalOffset, this.penumbraScale, this.strength);
    u.uCsmB.value.set(this.constBias, this.slopeBias, Math.tan(this.sunAngularRadius), this.maxPenumbraTexels);
    u.uCsmFade.value.z = this.minPenumbraTexels;
    u.uCsmContact.value.set(this.contactLength, this.contactThickness,
      flags.contactShadows === false ? 0 : this.contactIntensity, this.contactMaxDist);
    u.uCsmDbg.value.x = flags.csmDebug ? 1 : 0;
    u.uCsmDbg.value.y = this.temporalRotation ? 5.588238 * (gbuf.simFrame & 63) : 0;
    u.uCsmProj.value.copy(ctx.matrices.proj);
    u.uCsmSceneZ.value = gbuf.gViewZ || this._noZ;

    // Scan even when disabled: the injection is uniform-gated, so a material
    // that appears while shadows are off must still carry it or it pops
    // unshadowed for up to half a second when they come back on.
    if (this._scanDue-- <= 0) { this._scan(); this._scanDue = 30; }
    if (!on) {
      this._updatedThisFrame.fill(false);
      return;
    }

    const discontinuity = this._detectDiscontinuity();
    if (discontinuity) this._forceAllCascades(discontinuity);
    const forceAll = this._forceAllPending;
    const forceReason = this._pendingForceReason || 'unspecified';
    const updateMask = this._selectUpdateMask(forceAll);

    const t0 = performance.now();
    // A newly allocated atlas has no valid frozen camera state. Fit it once even
    // if the diagnostic freeze flag happened to be left on across a quality
    // change; after that, freeze retains its original meaning.
    const needsInitialFit = updateMask.some((v, i) => v && !this._cascadeValid[i]);
    if (!frozen || needsInitialFit) this._fit(updateMask);
    const t1 = performance.now();

    this._render(ctx, updateMask);
    const t2 = performance.now();
    this._recordCascadeUpdates(updateMask, forceAll, forceReason);
    this.cost.fitMs = t1 - t0;
    this.cost.renderMs = t2 - t1;
  }

  _render(ctx, updateMask) {
    const r = ctx.renderer;
    const scene = ctx.scene;
    const atlas = this.atlas;
    const prevTarget = r.getRenderTarget();
    const prevOverride = scene.overrideMaterial;
    const prevFog = scene.fog;
    const drawsBefore = r.info.render.calls;

    const hidden = this._hidden;
    const plain = this._casters;
    const custom = this._customCasters;
    let phaseB = false;

    // Save/restore the ORIGINAL visibility of everything we touch. Blindly
    // setting `visible = true` afterwards would un-hide objects their owner
    // deliberately hid, which is a bug that surfaces days later as "why is the
    // dead enemy back".
    scene.fog = null;
    for (let i = 0; i < hidden.length; i++) { hidden[i].__cbVis = hidden[i].visible; hidden[i].visible = false; }
    for (let i = 0; i < custom.length; i++) { custom[i].__cbVis = custom[i].visible; custom[i].visible = false; }

    try {
      r.setRenderTarget(atlas);
      r.state.buffers.depth.setMask(true);
      // autoClear is false engine-wide. Clear only the tiles being replaced;
      // a full-atlas clear here would erase every staggered cascade one frame
      // before it is redrawn.
      this._clearCascades(r, atlas, updateMask);

      // --- phase A: everything that can share one depth material -------------
      scene.overrideMaterial = this._depthMat;
      this._drawCascades(r, scene, updateMask);

      // --- phase B: alpha-tested / vertex-animated casters -------------------
      if (custom.length) {
        phaseB = true;
        for (let i = 0; i < plain.length; i++) { plain[i].__cbVis = plain[i].visible; plain[i].visible = false; }
        for (let i = 0; i < custom.length; i++) {
          const o = custom[i];
          o.visible = o.__cbVis;
          o.__cbMat = o.material;
          o.material = o.customDepthMaterial;
        }
        scene.overrideMaterial = null;
        this._drawCascades(r, scene, updateMask);
      }
    } finally {
      // Every restore lives here, not at the end of the try. A throw anywhere in
      // phase B used to leave `plain` (the terrain, the props, most of the
      // world) with visible = false and its material swapped for a depth
      // material, and _execute's catch would then disable the pass and leave the
      // scene permanently gutted rather than merely unshadowed.
      if (phaseB) {
        for (let i = 0; i < custom.length; i++) {
          const o = custom[i];
          if (o.__cbMat) { o.material = o.__cbMat; o.__cbMat = null; }
        }
        for (let i = 0; i < plain.length; i++) plain[i].visible = plain[i].__cbVis;
      }
      scene.overrideMaterial = prevOverride;
      scene.fog = prevFog;
      atlas.scissorTest = false;
      for (let i = 0; i < hidden.length; i++) hidden[i].visible = hidden[i].__cbVis;
      for (let i = 0; i < custom.length; i++) custom[i].visible = custom[i].__cbVis;
      r.setScissorTest(false);
      r.setRenderTarget(prevTarget);
    }
    this.cost.draws = r.info.render.calls - drawsBefore;
  }

  _setCascadeViewport(r, atlas, i) {
    const vp = this.viewports[i];
    atlas.viewport.copy(vp);
    atlas.scissor.copy(vp);
    atlas.scissorTest = true;
    r.setRenderTarget(atlas);
    r.state.viewport(vp);
    r.state.scissor(vp);
    r.state.setScissorTest(true);
  }

  _clearCascades(r, atlas, updateMask) {
    for (let i = 0; i < this.cascades; i++) {
      if (!updateMask[i]) continue;
      this._setCascadeViewport(r, atlas, i);
      r.clear(false, true, false);
    }
  }

  _drawCascades(r, scene, updateMask) {
    const atlas = this.atlas;
    for (let i = 0; i < this.cascades; i++) {
      if (!updateMask[i]) continue;
      this._setCascadeViewport(r, atlas, i);
      r.render(scene, this.cams[i]);
    }
  }

  /**
   * Queue the real shadow-depth program families through the driver's parallel
   * compiler. WebGLRenderer.compileAsync(scene, camera) never sees
   * scene.overrideMaterial or customDepthMaterial, which otherwise leaves the
   * CSM variants to block the first shipping frame.
   */
  compileAsync() {
    const r = this.ctx.renderer;
    if (!r?.compileAsync || !this.atlas || !this.cams?.[0]) return Promise.resolve();
    this._scan();

    const makeScene = (objects, materialFor) => {
      const scene = new THREE.Scene();
      for (const object of objects) {
        let clone;
        try { clone = object.clone(false); } catch { continue; }
        clone.material = materialFor(object);
        if (!clone.material) continue;
        // Preserve the real object/geometry program parameters (including
        // instancing) while escaping invisible pool parents and frustum culls.
        clone.visible = true;
        clone.frustumCulled = false;
        clone.layers.mask = 0xffffffff;
        scene.add(clone);
      }
      return scene;
    };

    const shared = makeScene(this._casters, () => this._depthMat);
    const custom = makeScene(this._customCasters, object => object.customDepthMaterial);
    const cam = this.cams[0];
    const oldMask = cam.layers.mask;
    const oldTarget = r.getRenderTarget();
    const jobs = [];
    try {
      cam.layers.mask = 0xffffffff;
      r.setRenderTarget(this.atlas);
      // `targetScene` supplies the shipping light-state signature. Three puts
      // light counts into every program cache key, including MeshDepthMaterial;
      // compiling against the empty temporary scene would create valid but
      // unusable zero-light variants and still block on the real ones later.
      if (shared.children.length) jobs.push(r.compileAsync(shared, cam, this.ctx.scene));
      if (custom.children.length) jobs.push(r.compileAsync(custom, cam, this.ctx.scene));
    } finally {
      cam.layers.mask = oldMask;
      r.setRenderTarget(oldTarget);
    }
    return Promise.all(jobs);
  }

  // ---------------------------------------------------------------------------
  // debug probe — a handful of casters so shadow quality is judgeable before
  // props/flora exist. Off by default: `__CB.toggle('shadowProbe')`.
  // ---------------------------------------------------------------------------

  _syncProbe(on) {
    if (on === this._probeOn) return;
    this._probeOn = on;
    const { ctx } = this;

    if (this._probe) {
      ctx.scene.remove(this._probe);
      this._probe.traverse(o => {
        if (o.material) this._materials.delete(o.material);   // do not leak into the recompile set
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
      this._probe = null;
    }
    if (!on) { ctx.bus.emit('sceneDirty'); return; }

    // Rebuilt (not cached) on every enable so it lands wherever the camera is
    // now — vistas teleport.
    const g = new THREE.Group();
    g.name = 'csmProbe';
    const rng = ctx.rng.fork('csmProbe');
    const box = new THREE.BoxGeometry(1, 1, 1);
    const pole = new THREE.CylinderGeometry(0.05, 0.08, 3.4, 10);
    const ball = new THREE.SphereGeometry(0.5, 20, 14);
    const cam = ctx.camera;
    const fx = -Math.sin(cam.rotation.y), fz = -Math.cos(cam.rotation.y);
    const cx = cam.position.x + fx * 7, cz = cam.position.z + fz * 7;
    const mk = (geo, x, z, y, sc) => {
      // enrich NOW, not on the renderer's next 30-frame scan: we are being
      // called from inside renderFrame, after its scan has already run, and an
      // un-enriched material at order 10 writes only attachment 0 — which
      // WebGL2 rejects outright (HANDOFF DEVIATION 4).
      const mat = enrichMaterial(new THREE.MeshStandardMaterial({ color: 0xb8ada0, roughness: 0.85, metalness: 0 }));
      this._applyToMaterial(mat);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, (ctx.sys.terrain?.heightAt?.(x, z) ?? 0) + y * sc, z);
      m.scale.setScalar(sc);
      g.add(m);
      return m;
    };
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.3;
      const rr = 1.5 + rng.next() * 7;
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      const k = i % 3;
      if (k === 0) mk(pole, x, z, 1.7, 0.7 + rng.next() * 0.8);
      else if (k === 1) mk(ball, x, z, 0.5 + rng.next() * 2.2, 0.5 + rng.next() * 0.7);
      else mk(box, x, z, 0.5, 0.5 + rng.next() * 1.1).rotation.y = rng.next() * 3.1;
    }
    this._probe = g;
    ctx.scene.add(g);
    this._scanDue = 0;
    ctx.bus.emit('sceneDirty');
  }

  // ---------------------------------------------------------------------------
  // public surface
  // ---------------------------------------------------------------------------

  /** GLSL for anyone sampling the cascades outside a MeshStandardMaterial. */
  get GLSL_CSM_SAMPLE() { return this._glsl || ''; }

  /** Uniform objects to Object.assign into your own shader. Shared by reference. */
  getSharedUniforms() { return this.uniforms; }

  /** Cascade split distances in metres, [near, s1, .., shadowDist]. */
  getSplits() { return this._splits.slice(); }

  debugInfo() {
    return {
      cascades: this.cascades,
      resolution: this.resolution,
      atlas: this.atlas ? `${this.atlas.width}x${this.atlas.height}` : null,
      splits: this._splits.map(v => +v.toFixed(2)),
      texelWorld: [this.uniforms.uCsmTexel.value.x, this.uniforms.uCsmTexel.value.y,
                   this.uniforms.uCsmTexel.value.z, this.uniforms.uCsmTexel.value.w].map(v => +v.toFixed(4)),
      casters: this._casters.length, customCasters: this._customCasters.length,
      // Triangles in one cascade's caster set; the temporal telemetry below
      // reports the actual last-frame multiplier.
      castTris: this._castTris | 0,
      cascadeUpdates: {
        frame: this._shadowFrame - 1,
        targetRate: Array.from({ length: this.cascades }, (_, i) => i === 0 ? 1 :
          ((this.ctx.quality.preset === 'low' || this.ctx.quality.preset === 'medium') ? 1 / 3 : 0.5)),
        updatedThisFrame: this._updatedThisFrame.slice(),
        count: this._cascadeUpdates.slice(),
        skipped: this._cascadeSkips.slice(),
        lastFrame: this._cascadeLastFrame.slice(),
        lastReason: this._cascadeLastReason.slice(),
        valid: this._cascadeValid.slice(),
        submittedTris: this._lastSubmittedTris,
        fullFrames: this._fullRefreshes,
        partialFrames: this._partialRefreshes,
        forcedFrames: this._forcedRefreshes,
        forceRequests: this._forceRequests,
        forcePending: this._forceAllPending,
        pendingReason: this._pendingForceReason,
        lastForceReason: this._lastForceReason,
      },
      hidden: this._hidden.length, materials: this._materials.size,
      variant: this._variant, sunIndex: this._sunIndex | 0,
      cost: { fitMs: +this.cost.fitMs.toFixed(3), renderMs: +this.cost.renderMs.toFixed(3), draws: this.cost.draws },
      failed: this._failed,
    };
  }

  update() {}

  dispose() {
    this.atlas?.depthTexture?.dispose();
    this.atlas?.dispose();
    this._depthMat?.dispose();
    this._noZ?.dispose();
  }
}
