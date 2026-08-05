// =============================================================================
// CINDERBLOOM — frame graph, gbuffer, render-target management.
// Owner: renderer agent. See docs/CONTRACT.md §4/§5 and docs/RENDER_PLAN.md.
// =============================================================================
//
// ## THE ONE THING WORLD AGENTS NEED TO READ
//
// Every opaque material must write all four MRT attachments. You do NOT
// hand-roll that. You call:
//
//     import { enrichMaterial, CB_FLAG } from '../engine/renderer.js';
//     ...
//     this.material = enrichMaterial(new THREE.MeshStandardMaterial({...}), {
//       flags: CB_FLAG.FOLIAGE,     // optional, see CB_FLAG below
//       dynamic: false,             // true if the OBJECT moves (see below)
//       prevPosition: null,         // GLSL expr for last frame's `transformed`
//     });
//
// `enrichMaterial` mutates and returns the material. It is idempotent — calling
// it twice is a no-op. It chains onto any `onBeforeCompile` you already set and
// wraps your `customProgramCacheKey`, so it composes with your own injection.
// If you never call it, the renderer auto-enriches any un-enriched
// MeshStandard/MeshPhysical material it finds in `ctx.scene` on its periodic
// scene scan — so the default is correct, not broken. Call it explicitly when
// you need flags, vertex animation, or determinism about when it happens.
//
// ### MRT attachment layout (order 10, `mrtMain`)
//
//   location 0  sceneHDR      RGBA16F  scene-referred linear HDR radiance
//   location 1  gNormalRough  RGBA16F  .rgb world normal (signed unit), .a perceptual roughness
//   location 2  gVel          RGBA16F  .rg motion vector in UV units (prevUv = uv - vel), .b flag bits, .a 0
//   location 3  gSpec         RGBA8    .rgb F0 specular colour, .a specular occlusion
//
// NOTE this differs from RENDER_PLAN §1.2, which split these across MRT-A and
// MRT-B behind a depth prepass. See "DEVIATIONS" at the bottom of this header.
//
// If you write a RawShaderMaterial / ShaderMaterial for an opaque surface you
// must declare and write attachments 1..3 yourself, and set
// `material.userData.cbWritesGBuffer = true` so the scanner leaves you alone.
// A material that writes only location 0 leaves 1..3 undefined for its pixels,
// which on ANGLE/D3D11 is stale garbage and shows up as flickering SSR.
//
// ### Vertex-animated geometry (flora wind, water, skinning done in-shader)
//
// Velocity is computed from two positions. By default last frame's position is
// assumed equal to this frame's, which is correct for anything that does not
// displace vertices in the shader. If you DO displace, pass:
//
//     enrichMaterial(mat, { prevPosition: 'cbPrevTransformed' })
//
// and compute `vec3 cbPrevTransformed` before `#include <project_vertex>` using
// `uCbPrevTime` (published for you) instead of your own time uniform. Run your
// displacement twice. That is the entire cost of correct velocity.
//
// ### Objects that MOVE (enemies, debris, the viewmodel)
//
// Pass `{ dynamic: true }` and give the material exactly one owner mesh:
//
//     mat.userData.cbOwner = mesh;
//
// The renderer captures `mesh.matrixWorld` at the end of every frame and feeds
// it to `uCbPrevModelMatrix`. Because that uniform lives on the material, a
// dynamic material may not be shared by several moving objects — clone it.
// Sharing a *static* enriched material across thousands of objects is fine and
// costs nothing (the static path uses three's own `modelMatrix`).
//
// ### Frame graph
//
// Passes register themselves and never call `renderer.render()`:
//
//     ctx.frameGraph.register({
//       id: 'gtao', order: 8,
//       inputs: ['viewZ'], outputs: ['ao'],
//       execute(target, gbuf, ctx) { ... },
//       reset() { ... },                       // optional, temporal passes
//     });
//
// `inputs` is not decoration — the renderer only builds an optional resource
// (`viewZ`, `viewZPrev`, `hiZ`, `tiles`) when some enabled pass asks for it.
// Ask for what you read or you will read a stale texture.
//
// ### DEVIATIONS from docs/RENDER_PLAN.md (also filed in HANDOFF)
//
// 1. RENDER_PLAN §2 order 5 depth+velocity prepass is NOT implemented. We ship
//    the sanctioned Plan B (§2.4): one combined MRT pass at order 10, and GTAO
//    at order 8 consumes the PREVIOUS frame's `gViewZ`/`gVel`. Reasons: the
//    prepass requires a bit-identical second material per opaque material and a
//    depthFunc=EQUAL shading pass, which silently turns geometry black whenever
//    any of ~15 world agents' materials drift; it doubles the draw budget
//    against a 2600 gate; and its win is overdraw on foliage density that does
//    not exist yet. `_prepassEnabled` is stubbed for whoever revisits this.
// 2. `gViewZ` is therefore produced by a fullscreen linearise pass from the
//    hardware depth texture rather than as MRT-A slot 0. Double-buffered as the
//    plan requires. Cost ~0.12 ms at 1080p.
// 3. Attachment ORDER differs (see table above): velocity is location 2 and
//    gSpec is location 3, because they now live in one framebuffer.
// =============================================================================

import * as THREE from 'three';

/** Camera layers. RENDER_PLAN §1.6. */
export const CB_LAYER = { OPAQUE: 0, SKY: 1, TRANSPARENT: 2, VIEWMODEL: 3 };

/** `gVel.b` flag bits, stored as a float. RENDER_PLAN §1.3. */
export const CB_FLAG = { VIEWMODEL: 1, FOLIAGE: 2, NO_MOTION_BLUR: 4, SKY: 8 };

const OPAQUE_MASK = (1 << CB_LAYER.OPAQUE) | (1 << CB_LAYER.SKY);
const TRANSPARENT_MASK = (1 << CB_LAYER.TRANSPARENT);

// Halton(2,3) minus 0.5, in pixels. RENDER_PLAN §3.1. Precomputed — never
// generated at runtime, never from Math.random.
const HALTON8 = [
  [0.00000, -0.16667], [-0.25000, 0.16667], [0.25000, -0.38889], [-0.37500, -0.05556],
  [0.12500, 0.27778], [-0.12500, -0.27778], [0.37500, 0.05556], [-0.43750, 0.38889],
];
const HALTON16 = HALTON8.concat([
  [0.06250, -0.46296], [-0.31250, -0.12963], [0.18750, 0.20370], [-0.18750, -0.35185],
  [0.31250, -0.01852], [-0.06250, 0.31481], [0.43750, -0.24074], [-0.46875, 0.09259],
]);

const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Narkowicz ACES fit — the fallback output when no grade pass is registered.
// post/grade.js takes this over at order >= 106. Keep it working: it is what
// stops the build going black mid-refactor.
const BLIT_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform float uExposure;
layout(location = 0) out vec4 outColor;
vec3 aces(vec3 x){
  const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
}
void main(){
  vec3 hdr = texture(tSrc, vUv).rgb * uExposure;
  vec3 col = aces(hdr);
  col = pow(col, vec3(1.0/2.2));
  outColor = vec4(col, 1.0);
}
`;

// Straight HDR passthrough. Deliberately not BLIT_FRAG: that one tonemaps and
// gamma-encodes for the default framebuffer, which would crush the frame if it
// were used mid-chain.
const COPY_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
layout(location = 0) out vec4 outColor;
void main(){ outColor = texture(tSrc, vUv); }
`;

// Hardware depth -> positive linear view depth in metres. Sky (depth == 1) gets
// CB_SKY_DEPTH so downstream passes can test `z > 1e5` for "no geometry".
const LINEARIZE_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tDepth;
uniform vec2 uNearFar;
layout(location = 0) out vec4 outColor;
void main(){
  float d = texture(tDepth, vUv).x;
  float n = uNearFar.x, f = uNearFar.y;
  // three's perspectiveDepthToViewZ, negated into a positive distance
  float viewZ = (n * f) / ((f - n) * d - f);
  float z = -viewZ;
  outColor = vec4(d >= 0.999999 ? 1.0e6 : z, 0.0, 0.0, 1.0);
}
`;

// 4-tap min reduction for the Hi-Z pyramid (order 7, built on demand).
const HIZ_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uSrcTexel;
uniform float uLevel;
layout(location = 0) out vec4 outColor;
void main(){
  vec2 b = vUv - uSrcTexel * 0.5;
  float a0 = textureLod(tSrc, b, uLevel).r;
  float a1 = textureLod(tSrc, b + vec2(uSrcTexel.x, 0.0), uLevel).r;
  float a2 = textureLod(tSrc, b + vec2(0.0, uSrcTexel.y), uLevel).r;
  float a3 = textureLod(tSrc, b + uSrcTexel, uLevel).r;
  outColor = vec4(min(min(a0, a1), min(a2, a3)), 0.0, 0.0, 1.0);
}
`;

// 20x20 px velocity tile-max + CoC tile bounds (RENDER_PLAN §8.2 / §9.1).
const TILEMAX_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tVel;
uniform vec2 uTexel;      // 1 / full res
uniform float uTileSize;  // px
layout(location = 0) out vec4 outColor;
void main(){
  vec2 base = floor(vUv / (uTexel * uTileSize)) * uTileSize;
  vec2 best = vec2(0.0); float bestLen = -1.0;
  for (int y = 0; y < 20; y++) {
    for (int x = 0; x < 20; x++) {
      vec2 p = (base + vec2(float(x), float(y)) + 0.5) * uTexel;
      vec2 v = texture(tVel, p).rg;
      float l = dot(v, v);
      if (l > bestLen) { bestLen = l; best = v; }
    }
  }
  outColor = vec4(best, 0.0, 1.0);
}
`;

const NEIGHBOURMAX_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
layout(location = 0) out vec4 outColor;
void main(){
  vec2 best = vec2(0.0); float bestLen = -1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 v = texture(tSrc, vUv + vec2(float(x), float(y)) * uTexel).rg;
      float l = dot(v, v);
      if (l > bestLen) { bestLen = l; best = v; }
    }
  }
  outColor = vec4(best, 0.0, 1.0);
}
`;

// -----------------------------------------------------------------------------
// GLSL injected into every enriched material.
// -----------------------------------------------------------------------------

const CB_VERT_PARS = /* glsl */`
out vec4 vCbClipCur;
out vec4 vCbClipPrv;
out float vCbViewZ;
uniform mat4 uCbViewProjUnjit;
uniform mat4 uCbPrevViewProjUnjit;
uniform mat4 uCbPrevModelMatrix;
uniform float uCbPrevTime;
`;

const CB_VERT_BODY = /* glsl */`
{
  vec4 cbObj = vec4( transformed, 1.0 );
  vec4 cbObjPrev = vec4( CB_PREV_POSITION, 1.0 );
  #ifdef USE_BATCHING
    cbObj = batchingMatrix * cbObj; cbObjPrev = batchingMatrix * cbObjPrev;
  #endif
  #ifdef USE_INSTANCING
    cbObj = instanceMatrix * cbObj; cbObjPrev = instanceMatrix * cbObjPrev;
  #endif
  vCbClipCur = uCbViewProjUnjit * ( modelMatrix * cbObj );
  #ifdef CB_DYNAMIC
    vCbClipPrv = uCbPrevViewProjUnjit * ( uCbPrevModelMatrix * cbObjPrev );
  #else
    vCbClipPrv = uCbPrevViewProjUnjit * ( modelMatrix * cbObjPrev );
  #endif
  vCbViewZ = -mvPosition.z;
}
`;

const CB_FRAG_PARS = /* glsl */`
layout(location = 1) out vec4 gCbNormalRough;
layout(location = 2) out vec4 gCbVelocity;
layout(location = 3) out vec4 gCbSpec;
in vec4 vCbClipCur;
in vec4 vCbClipPrv;
in float vCbViewZ;
uniform sampler2D uCbAO;
uniform sampler2D uCbAODepth;
uniform vec4 uCbAOParams;    // x enabled, y intensity power, zw unused
uniform vec2 uCbAOTexel;     // 1 / half-res
uniform vec2 uCbTexelSize;   // 1 / full render res

// Jimenez GTAO multi-bounce. AO must tint toward albedo, never toward charcoal.
vec3 cbMultiBounce(float v, vec3 alb){
  vec3 a = 2.0404 * alb - 0.3324;
  vec3 b = -4.7951 * alb + 0.6417;
  vec3 c = 2.7552 * alb + 0.6903;
  // Jimenez's fit is a*v^3 + b*v^2 + c*v. b is already NEGATIVE for most
  // albedos, so the "- b" this used to have negated it twice: the polynomial
  // evaluated to ~4.5 at v=1 for a 0.5 albedo instead of 1.0, i.e. enabling AO
  // made the frame BRIGHTER and lifted occluded pixels. One character.
  return max(vec3(v), ((v * a + b) * v + c) * v);
}
// Frostbite analytic specular occlusion (used until gtao.js supplies bent normals).
float cbSpecularOcclusion(float vis, float NoV, float rough){
  return clamp(pow(NoV + vis, exp2(-16.0 * rough - 1.0)) - 1.0 + vis, 0.0, 1.0);
}
// Depth-aware bilinear upsample of the half-res AO field (RENDER_PLAN §4.6).
// Naive bilinear here haloes every silhouette; that is a top-3 "this is WebGL" tell.
vec4 cbSampleAOBilateral(vec2 uv, float z){
  vec2 f = uv / uCbAOTexel - 0.5;
  vec2 base = floor(f);
  vec2 fr = f - base;
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2(float(i & 1), float(i >> 1));
    vec2 tuv = (base + o + 0.5) * uCbAOTexel;
    float bw = mix(1.0 - fr.x, fr.x, o.x) * mix(1.0 - fr.y, fr.y, o.y);
    float zt = texture(uCbAODepth, tuv).r;
    float w = bw * exp(-abs(zt - z) / (0.02 * z + 0.03));
    acc += texture(uCbAO, tuv) * w;
    wsum += w;
  }
  return wsum > 1e-5 ? acc / wsum : texture(uCbAO, uv);
}
`;

const CB_AO_BODY = /* glsl */`
float cbVis = 1.0;
float cbSpecOcc = 1.0;
if (uCbAOParams.x > 0.5) {
  vec4 cbAo = cbSampleAOBilateral(gl_FragCoord.xy * uCbTexelSize, vCbViewZ);
  cbVis = pow(clamp(cbAo.a, 0.0, 1.0), uCbAOParams.y);
  reflectedLight.indirectDiffuse *= cbMultiBounce(cbVis, diffuseColor.rgb);
  cbSpecOcc = cbSpecularOcclusion(cbVis, saturate(dot(normal, geometryViewDir)), roughnessFactor);
  reflectedLight.indirectSpecular *= cbSpecOcc;
}
`;

const CB_AUX_BODY = /* glsl */`
{
  // viewMatrix is rigid, so right-multiplying is the inverse rotation: view -> world.
  vec3 cbNw = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  gCbNormalRough = vec4( cbNw, roughnessFactor );
  float cbWc = vCbClipCur.w; if (abs(cbWc) < 1e-6) cbWc = 1e-6;
  float cbWp = vCbClipPrv.w; if (abs(cbWp) < 1e-6) cbWp = 1e-6;
  vec2 cbNdcCur = vCbClipCur.xy / cbWc;
  vec2 cbNdcPrv = vCbClipPrv.xy / cbWp;
  gCbVelocity = vec4( (cbNdcCur - cbNdcPrv) * 0.5, CB_FLAGS, 0.0 );
  gCbSpec = vec4( material.specularColor, cbSpecOcc );
}
`;

// Module-singleton: lets world agents `import { enrichMaterial }` without
// plumbing a renderer reference through their constructor.
let ACTIVE = null;

/**
 * Make a MeshStandardMaterial (or Physical) gbuffer-correct. Idempotent.
 * @param {THREE.Material} mat
 * @param {{flags?:number, dynamic?:boolean, prevPosition?:string}} [opts]
 * @returns {THREE.Material} the same material
 */
export function enrichMaterial(mat, opts = {}) {
  if (!ACTIVE) throw new Error('enrichMaterial() before Renderer.init()');
  return ACTIVE.enrichMaterial(mat, opts);
}

/** RENDER_PLAN §1.5 spelling. Returns `{ shading, prepass }`; prepass is null (Plan B). */
export function registerGBufferMaterial(mat, opts = {}) {
  return { shading: enrichMaterial(mat, opts), prepass: null };
}

// -----------------------------------------------------------------------------

export class Renderer {
  static id = 'renderer';
  static deps = [];

  constructor(ctx) {
    this.ctx = ctx;
    ACTIVE = this;

    this.passes = [];
    this.width = 1; this.height = 1;
    this.halfWidth = 1; this.halfHeight = 1;

    this.exposure = 1.0;
    this.jitterScale = 1.0;
    this.tileSize = 20;

    this.mrt = null;
    this.mrtView = null;
    this.gDepthHW = null;
    this.gDepthVM = null;

    this._pool = new Map();
    this._enriched = new Set();
    this._dynamic = [];
    this._temporalDirty = true;
    this._frameIndex = 0;
    this._scanDue = 0;
    this._nonGBuffer = [];

    this._needCache = null;
    this._stats = { opaqueMs: 0, overBudget: {} };
    this._aoDepthOwned = false;
    // viewmodel camera's own unjittered viewProj pair — see _updateMatrices
    this._vmViewProj = new THREE.Matrix4();
    this._vmPrevViewProj = new THREE.Matrix4();
  }

  // ---------------------------------------------------------------------------
  // init / allocation
  // ---------------------------------------------------------------------------

  async init() {
    const { ctx } = this;

    // full-screen triangle — cheaper than a quad and no diagonal seam
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this._fsGeo = geo;
    this._fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._fsScene = new THREE.Scene();
    this._fsFallbackMat = new THREE.MeshBasicMaterial();
    this._fsMesh = new THREE.Mesh(geo, this._fsFallbackMat);
    this._fsMesh.frustumCulled = false;
    this._fsScene.add(this._fsMesh);

    this._blit = this._rawMat(BLIT_FRAG, { tSrc: { value: null }, uExposure: { value: 1.0 } });
    // Straight HDR copy — no tonemap, no gamma. Used only to rejoin a diverted
    // composition chain into attachment 0 before the order-60 viewmodel draw.
    this._copy = this._rawMat(COPY_FRAG, { tSrc: { value: null } });
    this._linearize = this._rawMat(LINEARIZE_FRAG, { tDepth: { value: null }, uNearFar: { value: new THREE.Vector2(0.05, 4000) } });
    this._hizMat = this._rawMat(HIZ_FRAG, { tSrc: { value: null }, uSrcTexel: { value: new THREE.Vector2() }, uLevel: { value: 0 } });
    this._tileMat = this._rawMat(TILEMAX_FRAG, { tVel: { value: null }, uTexel: { value: new THREE.Vector2() }, uTileSize: { value: 20 } });
    this._nborMat = this._rawMat(NEIGHBOURMAX_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });

    // 1x1 white stand-in so enriched materials never sample a null texture and
    // gtao.js can drop in without forcing a shader recompile.
    this._whiteAO = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    this._whiteAO.needsUpdate = true;
    this._blackDepth = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this._blackDepth.needsUpdate = true;

    // Uniform objects SHARED BY REFERENCE across every enriched material, so a
    // per-frame write here updates all of them with no traversal.
    this._u = {
      uCbViewProjUnjit: { value: new THREE.Matrix4() },
      uCbPrevViewProjUnjit: { value: new THREE.Matrix4() },
      uCbPrevTime: { value: 0 },
      uCbAO: { value: this._whiteAO },
      uCbAODepth: { value: this._blackDepth },
      uCbAOParams: { value: new THREE.Vector4(0, 1, 0, 0) },
      uCbAOTexel: { value: new THREE.Vector2(1, 1) },
      uCbTexelSize: { value: new THREE.Vector2(1, 1) },
    };

    // RENDER_PLAN §13 — exactly one prevViewProj in the process.
    ctx.matrices = {
      view: new THREE.Matrix4(),
      proj: new THREE.Matrix4(),
      projUnjit: new THREE.Matrix4(),
      viewProjUnjit: new THREE.Matrix4(),
      prevViewProjUnjit: new THREE.Matrix4(),
      invViewProjUnjit: new THREE.Matrix4(),
      invProjUnjit: new THREE.Matrix4(),
      prevView: new THREE.Matrix4(),
      jitter: new THREE.Vector2(),
      prevJitter: new THREE.Vector2(),
    };

    this._gbufObj = {
      // colour + aux
      sceneHDR: null, gNormalRough: null, gVel: null, gSpec: null, gDepthHW: null,
      gViewZ: null, gViewZPrev: null,
      gDepthVM: null, viewmodelPresent: false,
      hiZ: null, hiZLevels: 0, tiles: null, ao: null, vol: null, coc: null,
      // legacy aliases kept so nothing that already reads `gbuf.color` breaks
      color: null, depth: null, rt: null,
      width: 1, height: 1, halfWidth: 1, halfHeight: 1,
      texel: new THREE.Vector2(), halfTexel: new THREE.Vector2(),
      firstFrame: true, frame: 0, simFrame: 0,
      tileSize: this.tileSize, tilesW: 1, tilesH: 1,
      matrices: ctx.matrices,
    };

    ctx.frameGraph = {
      register: (pass) => {
        this.passes.push(pass);
        this.passes.sort((a, b) => a.order - b.order);
        this._needCache = null;
        return pass;
      },
      unregister: (id) => {
        const i = this.passes.findIndex(p => p.id === id);
        if (i >= 0) this.passes.splice(i, 1);
        this._needCache = null;
      },
      get: (id) => this.passes.find(p => p.id === id),
      list: () => this.passes.map(p => p.id),
      invalidate: () => { this._needCache = null; },
    };

    const gl = ctx.gl;
    this._dbFull = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2, gl.COLOR_ATTACHMENT3];
    this._dbMasked = [gl.COLOR_ATTACHMENT0, gl.NONE, gl.NONE, gl.NONE];

    ctx.bus.on('sceneDirty', () => { this._scanDue = 0; });

    // Initial boot must take the same quality-scaled path as every later
    // resize.  The pre-init Context resize cannot reach this system yet, and
    // allocating raw display pixels here made QUALITY.renderScale fictional
    // until the player manually changed a setting.  Medium therefore claimed
    // 0.66 while actually paying for a full-resolution MRT and post chain.
    this.resize(ctx.size.w * ctx.size.dpr, ctx.size.h * ctx.size.dpr);
  }

  _rawMat(frag, uniforms) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,   // three prepends `#version 300 es` — never write it (HANDOFF trap 1)
      vertexShader: FS_VERT,
      fragmentShader: frag,
      uniforms,
      depthTest: false, depthWrite: false,
    });
  }

  _allocate(w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const sameSize = this.width === w && this.height === h;
    this.width = w; this.height = h;
    this.halfWidth = Math.max(1, Math.ceil(w / 2));
    this.halfHeight = Math.max(1, Math.ceil(h / 2));

    // PUBLISH FIRST, ALLOCATE SECOND. This back-fill used to sit below the
    // early-return, and both `this._u` and `this._gbufObj` are created in
    // init() — which runs AFTER main.js's ctx.setSize() has already called
    // resize() -> _allocate(). So the one call that would have filled them ran
    // when they were undefined, and init()'s own call early-returned on the
    // size check. Result: gbuf.width/height/halfWidth/halfHeight/texel/
    // halfTexel/tilesW/tilesH pinned at 1 for the whole session, AND
    // uCbTexelSize/uCbAOTexel pinned at (1,1) so every enriched material
    // sampled the AO field at one corner texel. Four separate agents filed
    // this; it is the single most expensive bug in the repo.
    this._publish(w, h);
    if (this.mrt && sameSize) return;

    this._disposeTargets();

    // Shared hardware depth. Owned here; no pass may dispose it.
    this.gDepthHW = new THREE.DepthTexture(w, h, THREE.FloatType);
    this.gDepthHW.format = THREE.DepthFormat;
    this.gDepthHW.minFilter = THREE.NearestFilter;
    this.gDepthHW.magFilter = THREE.NearestFilter;

    const mrt = new THREE.WebGLMultipleRenderTargets(w, h, 4, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 0,
    });
    // Per-attachment formats MUST be set before the first bind (RENDER_PLAN §11).
    const t = mrt.texture;
    t[0].name = 'sceneHDR';
    t[0].colorSpace = THREE.LinearSRGBColorSpace;
    t[1].name = 'gNormalRough';
    t[1].minFilter = t[1].magFilter = THREE.NearestFilter;
    t[1].colorSpace = THREE.NoColorSpace;
    t[2].name = 'gVel';
    t[2].minFilter = t[2].magFilter = THREE.NearestFilter;
    t[2].colorSpace = THREE.NoColorSpace;
    t[3].name = 'gSpec';
    t[3].type = THREE.UnsignedByteType;
    t[3].format = THREE.RGBAFormat;
    t[3].minFilter = t[3].magFilter = THREE.NearestFilter;
    t[3].colorSpace = THREE.NoColorSpace;
    mrt.depthTexture = this.gDepthHW;
    this.mrt = mrt;

    // Everything else (viewZ ping-pong, hi-Z, tiles) is pool-allocated on
    // demand in _buildOptionalResources, so a build with no post passes
    // registered pays nothing for them.
    for (const rt of this._pool.values()) rt.dispose?.();   // §pp: entries are descriptors
    this._pool.clear();

    this._temporalDirty = true;
    this._scanDue = 0;
    this.ctx.bus.emit('rtResize', { w, h, halfW: this.halfWidth, halfH: this.halfHeight });
  }

  /**
   * Mirror the authoritative sizes onto the shared uniforms and the published
   * `gbuf` object. Safe to call before init() has built either; idempotent.
   * Also called from renderFrame() as a belt-and-braces guard so no future
   * ordering change can put them out of sync again.
   */
  _publish(w, h) {
    if (this._u) {
      this._u.uCbTexelSize.value.set(1 / w, 1 / h);
      this._u.uCbAOTexel.value.set(1 / this.halfWidth, 1 / this.halfHeight);
    }
    const g = this._gbufObj;
    if (g) {
      g.width = w; g.height = h;
      g.halfWidth = this.halfWidth; g.halfHeight = this.halfHeight;
      g.texel.set(1 / w, 1 / h);
      g.halfTexel.set(1 / this.halfWidth, 1 / this.halfHeight);
      g.tileSize = this.tileSize;
      g.tilesW = Math.ceil(w / this.tileSize);
      g.tilesH = Math.ceil(h / this.tileSize);
    }
  }

  _disposeTargets() {
    if (this.mrtView) { this.mrtView.texture = []; this.mrtView.dispose(); this.mrtView = null; }
    this._dropRejoin();
    this.mrt?.dispose();
    this.mrt = null;
    this.gDepthVM?.dispose();
    this.gDepthVM = null;
    this.gDepthHW = null;   // disposed with mrt
  }

  resize(w, h) {
    const s = this.ctx.quality.renderScale || 1;
    this._allocate(w * s, h * s);
  }

  onQuality() {
    this.resize(this.ctx.size.w * this.ctx.size.dpr, this.ctx.size.h * this.ctx.size.dpr);
    this.resetTemporal();
  }

  // ---------------------------------------------------------------------------
  // render-target pool — named, persistent, auto-resized. No per-frame allocs.
  // ---------------------------------------------------------------------------

  /**
   * Get (allocating once) a named render target sized relative to the render
   * resolution. Passes should use this rather than `new WebGLRenderTarget`, so
   * targets survive resizes and get freed with the renderer.
   * @param {string} name
   * @param {{scale?:number, w?:number, h?:number, format?:any, type?:any,
   *          filter?:any, wrap?:any, depth?:boolean, mips?:boolean}} [o]
   */
  rt(name, o = {}) {
    const scale = o.scale ?? 1;
    const w = Math.max(1, o.w ?? Math.ceil(this.width * scale));
    const h = Math.max(1, o.h ?? Math.ceil(this.height * scale));
    const type = o.type ?? THREE.HalfFloatType;
    const format = o.format ?? THREE.RGBAFormat;
    // R32F is not linearly filterable without OES_texture_float_linear.
    const filter = o.filter ?? ((type === THREE.FloatType) ? THREE.NearestFilter : THREE.LinearFilter);
    const key = `${name}|${w}x${h}|${format}|${type}|${filter}|${o.depth ? 1 : 0}|${o.mips ? 1 : 0}`;
    const existing = this._pool.get(name);
    if (existing && existing.__cbKey === key) return existing;
    existing?.dispose();
    const rt = new THREE.WebGLRenderTarget(w, h, {
      format, type,
      minFilter: o.mips ? THREE.LinearMipmapNearestFilter : filter,
      magFilter: filter,
      wrapS: o.wrap ?? THREE.ClampToEdgeWrapping,
      wrapT: o.wrap ?? THREE.ClampToEdgeWrapping,
      depthBuffer: !!o.depth,
      stencilBuffer: false,
      generateMipmaps: !!o.mips,
      colorSpace: THREE.NoColorSpace,
      samples: 0,
    });
    rt.texture.name = name;
    rt.__cbKey = key;
    this._pool.set(name, rt);
    return rt;
  }

  /** Two pooled targets with the same spec plus a swap. For temporal history. */
  pingpong(name, o = {}) {
    const a = this.rt(name + '#a', o);
    const b = this.rt(name + '#b', o);
    let s = this._pool.get('§pp:' + name);
    if (!s || s.a !== a || s.b !== b) {
      s = { a, b, flip: false, get read() { return this.flip ? this.a : this.b; },
            get write() { return this.flip ? this.b : this.a; },
            swap() { this.flip = !this.flip; } };
      this._pool.set('§pp:' + name, s);
    }
    return s;
  }

  // ---------------------------------------------------------------------------
  // material enrichment
  // ---------------------------------------------------------------------------

  enrichMaterial(mat, opts = {}) {
    if (!mat || mat.userData?.cbEnriched) return mat;
    if (mat.userData?.cbWritesGBuffer) return mat;   // agent handles MRT itself
    if (!(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) {
      // We can only inject into the physical shader chain. Anything else must
      // opt in via userData.cbWritesGBuffer.
      if (!mat.userData) mat.userData = {};
      mat.userData.cbUnsupported = true;
      return mat;
    }

    const flags = (opts.flags | 0) || 0;
    const dynamic = !!opts.dynamic;
    const prevPos = opts.prevPosition || 'transformed';
    const u = this._u;

    const prevCompile = mat.onBeforeCompile;
    const prevKey = mat.customProgramCacheKey;

    mat.onBeforeCompile = (shader, renderer) => {
      if (prevCompile) prevCompile.call(mat, shader, renderer);

      shader.uniforms.uCbViewProjUnjit = u.uCbViewProjUnjit;
      shader.uniforms.uCbPrevViewProjUnjit = u.uCbPrevViewProjUnjit;
      shader.uniforms.uCbPrevTime = u.uCbPrevTime;
      shader.uniforms.uCbAO = u.uCbAO;
      shader.uniforms.uCbAODepth = u.uCbAODepth;
      shader.uniforms.uCbAOParams = u.uCbAOParams;
      shader.uniforms.uCbAOTexel = u.uCbAOTexel;
      shader.uniforms.uCbTexelSize = u.uCbTexelSize;
      // per-material (not shared): last frame's object matrix
      shader.uniforms.uCbPrevModelMatrix = mat.userData.cbPrevModelMatrix;

      const defs =
        `#define CB_PREV_POSITION ${prevPos}\n` +
        `#define CB_FLAGS ${flags.toFixed(1)}\n` +
        (dynamic ? '#define CB_DYNAMIC\n' : '');

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\n' + defs + CB_VERT_PARS,
      ).replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n' + CB_VERT_BODY,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\n' + defs + CB_FRAG_PARS,
      ).replace(
        '#include <aomap_fragment>',
        '#include <aomap_fragment>\n' + CB_AO_BODY,
      ).replace(
        '#include <opaque_fragment>',
        '#include <opaque_fragment>\n' + CB_AUX_BODY,
      );
    };

    // MANDATORY: two materials with identical `parameters` share a program
    // regardless of what onBeforeCompile did (RENDER_PLAN §11).
    mat.customProgramCacheKey = () => {
      const base = prevKey ? prevKey.call(mat) : '';
      return `${base}|cbg1|${flags}|${dynamic ? 'd' : 's'}|${prevPos}`;
    };

    if (!mat.userData) mat.userData = {};
    mat.userData.cbPrevModelMatrix = mat.userData.cbPrevModelMatrix || { value: new THREE.Matrix4() };
    mat.userData.cbEnriched = true;
    mat.userData.cbFlags = flags;
    mat.userData.cbDynamic = dynamic;
    mat.userData.cbPrevPos = prevPos;
    // Recorded so the scene scan can notice if someone later reassigns
    // onBeforeCompile and blows our injection away — see _scanScene.
    mat.userData.cbCompileFn = mat.onBeforeCompile;
    mat.needsUpdate = true;

    this._enriched.add(mat);
    if (dynamic) this._dynamic.push(mat);
    return mat;
  }

  /** gtao.js calls this once. No recompile: the sampler is already bound. */
  setAOTexture(tex, { intensity = 1.0, depthTex = null } = {}) {
    this._u.uCbAO.value = tex || this._whiteAO;
    this._u.uCbAODepth.value = depthTex || this._gbufObj.gViewZPrev || this._blackDepth;
    this._aoDepthOwned = !!depthTex;
    this._u.uCbAOParams.value.set(tex ? 1 : 0, intensity, 0, 0);
  }

  /**
   * Walk ctx.scene, auto-enrich anything nobody enriched, and put a
   * draw-buffer mask around anything we cannot inject into.
   * Runs at most every 30 render frames, or immediately on bus 'sceneDirty'.
   *
   * WHY THE MASK: WebGL2 raises GL_INVALID_OPERATION and DROPS THE DRAW when a
   * shader does not write every active draw buffer. It is not "undefined
   * garbage in attachment 1" as RENDER_PLAN §1.5.4 assumes — the geometry
   * simply disappears. So any material that writes only `location 0` (the sky
   * dome today) gets `gl.drawBuffers([COLOR_ATTACHMENT0, NONE, NONE, NONE])`
   * around its draw call, and its aux attachments keep the cleared values,
   * which for a sky is exactly right. Owners should still upgrade their
   * shaders; this only stops the frame from being wrong in the meantime.
   */
  _scanScene() {
    const nonG = this._nonGBuffer;
    nonG.length = 0;
    let transparent = 0;
    this.ctx.scene.traverse((o) => {
      if (o.layers.mask & TRANSPARENT_MASK) transparent++;
      const m = o.material;
      if (!m) return;
      const list = Array.isArray(m) ? m : [m];
      let orphan = false;
      for (const mm of list) {
        if (!mm) continue;
        if (mm.userData?.cbWritesGBuffer) continue;
        if (mm.userData?.cbEnriched) {
          // Someone reassigned onBeforeCompile after we injected — our writes
          // are gone and the draw would now be rejected outright. Re-wrap.
          if (mm.onBeforeCompile !== mm.userData.cbCompileFn) this._reEnrich(mm);
          continue;
        }
        if (mm.isMeshStandardMaterial || mm.isMeshPhysicalMaterial) this.enrichMaterial(mm);
        else orphan = true;
      }
      if (orphan) { nonG.push(o); this._installMaskHook(o); }
    });
    this._transparentCount = transparent;
    this.ctx.debug.stats.gbufferOrphans = nonG.length;
  }

  _reEnrich(mat) {
    const ud = mat.userData;
    ud.cbEnriched = false;
    this._enriched.delete(mat);
    const i = this._dynamic.indexOf(mat);
    if (i >= 0) this._dynamic.splice(i, 1);
    this.enrichMaterial(mat, { flags: ud.cbFlags, dynamic: ud.cbDynamic, prevPosition: ud.cbPrevPos });
    console.warn('[renderer] re-enriched a material whose onBeforeCompile was replaced after registration:', mat.type, mat.name || '(unnamed)');
  }

  _installMaskHook(o) {
    const ud = o.userData;
    if (ud.__cbMaskBefore && o.onBeforeRender === ud.__cbMaskBefore) return;
    const self = this;
    // Re-wrap if the owner replaced the handler since our last scan.
    const prevBefore = (o.onBeforeRender === ud.__cbMaskBefore) ? ud.__cbPrevBefore : o.onBeforeRender;
    const prevAfter = (o.onAfterRender === ud.__cbMaskAfter) ? ud.__cbPrevAfter : o.onAfterRender;
    ud.__cbPrevBefore = prevBefore;
    ud.__cbPrevAfter = prevAfter;
    ud.__cbMaskBefore = function (r, s, c, g, m, grp) {
      prevBefore?.call(this, r, s, c, g, m, grp);
      self._maskDrawBuffers(true);
    };
    ud.__cbMaskAfter = function (r, s, c, g, m, grp) {
      self._maskDrawBuffers(false);
      prevAfter?.call(this, r, s, c, g, m, grp);
    };
    o.onBeforeRender = ud.__cbMaskBefore;
    o.onAfterRender = ud.__cbMaskAfter;
  }

  /**
   * Restricted/full draw buffers on the currently bound MRT. We call
   * `gl.drawBuffers` directly and always restore it to exactly what three
   * believes it is, so three's per-framebuffer cache stays coherent.
   */
  _maskDrawBuffers(on) {
    const rt = this.ctx.renderer.getRenderTarget();
    if (rt !== this.mrt && rt !== this.mrtView) return;
    this.ctx.gl.drawBuffers(on ? this._dbMasked : this._dbFull);
  }

  // ---------------------------------------------------------------------------
  // matrices + jitter
  // ---------------------------------------------------------------------------

  get jitterEnabled() {
    return !!(this.ctx.quality.taa && this._pass('taa'));
  }

  _pass(id) { return this.passes.find(p => p.id === id && p.enabled !== false); }

  _updateMatrices() {
    const { ctx } = this;
    const m = ctx.matrices;
    const cam = ctx.camera;

    m.prevViewProjUnjit.copy(m.viewProjUnjit);
    m.prevView.copy(m.view);
    m.prevJitter.copy(m.jitter);

    cam.updateMatrixWorld();
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();

    // Rebuild the clean projection every frame so jitter never compounds.
    cam.updateProjectionMatrix();
    m.projUnjit.copy(cam.projectionMatrix);
    m.view.copy(cam.matrixWorldInverse);
    m.viewProjUnjit.multiplyMatrices(m.projUnjit, m.view);
    m.invViewProjUnjit.copy(m.viewProjUnjit).invert();
    m.invProjUnjit.copy(m.projUnjit).invert();

    // --- viewmodel camera: its OWN unjittered viewProj pair -------------------
    // The gun is drawn at order 60 with ctx.viewCamera, but the shared velocity
    // uniforms were only ever filled from ctx.camera. Verified by readback: a
    // gun swinging 0.085 rad/frame wrote a UNIFORM velocity across all its
    // pixels — the camera's yaw, nothing to do with the gun. Anything using the
    // magnitude (motion blur's shutter, DOF's viewmodel CoC) was reading a
    // number about the wrong object.
    const vc = ctx.viewCamera;
    vc.updateMatrixWorld();
    vc.matrixWorldInverse.copy(vc.matrixWorld).invert();
    this._vmPrevViewProj.copy(this._vmViewProj);
    vc.updateProjectionMatrix();
    this._vmViewProj.multiplyMatrices(vc.projectionMatrix, vc.matrixWorldInverse);

    if (this.jitterEnabled) {
      const table = (this.ctx.quality.preset === 'ultra') ? HALTON16 : HALTON8;
      const ph = table[this._frameIndex % table.length];
      const jx = ph[0] * this.jitterScale;
      const jy = ph[1] * this.jitterScale;
      m.jitter.set(jx, jy);
      this._applyJitter(cam, jx, jy);
      // The viewmodel gets the SAME pixel offsets in its own projection so gun
      // and world edges antialias coherently (RENDER_PLAN §3.1).
      this._applyJitter(vc, jx, jy);
    } else {
      m.jitter.set(0, 0);
    }
    m.proj.copy(cam.projectionMatrix);
    if (this._temporalDirty) this._vmPrevViewProj.copy(this._vmViewProj);

    if (this._temporalDirty) {
      m.prevViewProjUnjit.copy(m.viewProjUnjit);
      m.prevView.copy(m.view);
      m.prevJitter.copy(m.jitter);
    }

    this._u.uCbViewProjUnjit.value.copy(m.viewProjUnjit);
    this._u.uCbPrevViewProjUnjit.value.copy(m.prevViewProjUnjit);
  }

  _applyJitter(cam, jx, jy) {
    const p = cam.projectionMatrix;
    p.elements[8] += (2.0 * jx) / this.width;
    p.elements[9] += (2.0 * jy) / this.height;
    cam.projectionMatrixInverse.copy(p).invert();
  }

  // ---------------------------------------------------------------------------
  // frame
  // ---------------------------------------------------------------------------

  resetTemporal() {
    this._temporalDirty = true;
    // The jitter PHASE is temporal state too. Without this the Halton index at
    // capture time depends on how many rAF frames happened to elapse since
    // boot, and a converged TAA image is a function of the phase sequence — two
    // runs of the same script differed by ~1e-4 mean luma.
    this._frameIndex = 0;
    for (const p of this.passes) p.reset?.();
  }

  /** Draw a full-screen pass with `material` into `target` (null = canvas). */
  fullscreen(material, target = null, rect = null) {
    const r = this.ctx.renderer;
    this._fsMesh.material = material;
    r.setRenderTarget(target);
    if (rect) {
      r.setViewport(rect.x, rect.y, rect.w, rect.h);
      r.setScissor(rect.x, rect.y, rect.w, rect.h);
      r.setScissorTest(true);
    }
    r.render(this._fsScene, this._fsCam);
    if (rect) {
      r.setScissorTest(false);
      const w = target ? target.width : this.ctx.size.w * this.ctx.size.dpr;
      const h = target ? target.height : this.ctx.size.h * this.ctx.size.dpr;
      r.setViewport(0, 0, w, h);
      r.setScissor(0, 0, w, h);
    }
  }

  /** True when some enabled registered pass declares `name` in its inputs. */
  _needs(name) {
    if (!this._needCache) {
      const s = new Set();
      for (const p of this.passes) {
        if (p.enabled === false) continue;
        for (const i of (p.inputs || [])) s.add(i);
      }
      this._needCache = s;
    }
    return this._needCache.has(name);
  }

  renderFrame() {
    const { ctx } = this;
    const r = ctx.renderer;
    const gl = ctx.gl;
    const profile = ctx.debug.profileNextFrame === true;
    const profileStarted = profile ? performance.now() : 0;
    let profileLast = profileStarted;
    const profileRows = [];
    const mark = name => {
      if (!profile) return;
      const now = performance.now();
      profileRows.push({ name, ms: +(now - profileLast).toFixed(1) });
      profileLast = now;
    };
    r.info.reset();

    this._frameIndex++;
    if (this._scanDue-- <= 0) { this._scanScene(); this._scanDue = 30; }
    this._publish(this.width, this.height);   // guard: sizes can never go stale
    this._updateMatrices();
    mark('prepare');

    const g = this._gbufObj;
    const mrt = this.mrt;
    g.sceneHDR = mrt.texture[0];
    g.gNormalRough = mrt.texture[1];
    g.gVel = mrt.texture[2];
    g.gSpec = mrt.texture[3];
    g.gDepthHW = this.gDepthHW;
    g.color = mrt.texture[0];        // legacy aliases
    g.depth = this.gDepthHW;
    g.rt = mrt;
    g.firstFrame = this._temporalDirty;
    g.frame = this._frameIndex;
    g.simFrame = ctx.time.frame;
    g.tileSize = this.tileSize;

    // --- order 0..4 : shadow cascades ---------------------------------------
    this._run(0, 4);
    mark('shadows');

    // --- order 5..9 -----------------------------------------------------------
    // Order 5 is where a geometry depth+velocity prepass would go if anyone
    // revisits Plan B (see header DEVIATIONS); the slot dispatches normally so
    // a pass registered there is not silently skipped. Everything running here
    // sees LAST frame's gViewZ/gVel — that is the whole Plan B trade, and GTAO
    // at order 8 is the pass it was made for.
    this._buildOptionalResources(true);
    this._run(5, 9);
    mark('pre-opaque resources/passes');

    // --- order 10 : opaque forward -> MRT ------------------------------------
    r.setRenderTarget(mrt);
    r.state.buffers.color.setMask(true);
    r.state.buffers.depth.setMask(true);
    r.setScissorTest(false);
    // Per-attachment clears. renderer.clear() would blast one colour into all
    // four; these are the correct "sky / nothing here" values per attachment.
    gl.clearBufferfv(gl.COLOR, 0, CLEAR_HDR);
    gl.clearBufferfv(gl.COLOR, 1, CLEAR_NORMAL);
    gl.clearBufferfv(gl.COLOR, 2, CLEAR_VEL);
    gl.clearBufferfv(gl.COLOR, 3, CLEAR_SPEC);
    gl.clearBufferfv(gl.DEPTH, 0, CLEAR_DEPTH);

    const camMask = ctx.camera.layers.mask;
    ctx.camera.layers.mask = OPAQUE_MASK;
    r.render(ctx.scene, ctx.camera);
    ctx.camera.layers.mask = camMask;
    mark('opaque world');

    // linear view depth for this frame — everything temporal reads it
    this._buildOptionalResources(false);
    mark('post-opaque resources');

    this._run(10, 49);
    mark('orders 10-49');

    // --- order 50 : transparent / water --------------------------------------
    if (this._hasTransparentLayer()) {
      r.setRenderTarget(mrt);
      ctx.camera.layers.mask = TRANSPARENT_MASK;
      r.render(ctx.scene, ctx.camera);
      ctx.camera.layers.mask = camMask;
    }
    this._run(50, 59);
    mark('transparent/orders 50-59');

    // --- order 60 : viewmodel, own depth range --------------------------------
    // INTEGRATOR — REJOIN THE CHAIN FIRST. Passes compose by re-pointing
    // `g.sceneHDR` at their own output (the convention dof/motionblur/bloom/
    // grade all follow), and `world/vfx.js`'s heat shimmer does it at order 55 —
    // i.e. BEFORE this draw. The viewmodel is rasterised into MRT-C, whose
    // colour attachments alias `mrt.texture`, so the moment anything in 10..59
    // re-points sceneHDR the gun is drawn into a texture nothing downstream
    // reads and the frame comes back with no weapon in it. That is exactly what
    // happened: `hipfire` fires, the muzzle sets a heat source, vfxHeat runs,
    // and the gun vanished from every gameplay vista in the review set — and it
    // stayed vanished for the NEXT vista too, because the heat decays over
    // seconds. Copy the chain's current head back into attachment 0 and hand
    // ownership back to the MRT. One full-res blit, and only on frames where a
    // pre-60 pass actually diverted the chain.
    if (g.sceneHDR !== mrt.texture[0]) {
      this._copy.uniforms.tSrc.value = g.sceneHDR;
      this.fullscreen(this._copy, this._rejoinTarget());
      g.sceneHDR = mrt.texture[0];
      g.color = mrt.texture[0];
    }
    mark('rejoin');
    g.viewmodelPresent = ctx.viewScene.children.length > 0;
    if (g.viewmodelPresent) {
      const vt = this._viewTarget();
      r.setRenderTarget(vt);
      r.state.buffers.depth.setMask(true);
      gl.clearBufferfv(gl.DEPTH, 0, CLEAR_DEPTH);
      // Swap the SHARED velocity uniforms to the viewmodel camera's pair for
      // the duration of this draw, then restore. The uniform objects are shared
      // by reference across every enriched material, so this is two matrix
      // copies, not a traversal.
      this._u.uCbViewProjUnjit.value.copy(this._vmViewProj);
      this._u.uCbPrevViewProjUnjit.value.copy(this._vmPrevViewProj);
      r.render(ctx.viewScene, ctx.viewCamera);
      this._u.uCbViewProjUnjit.value.copy(ctx.matrices.viewProjUnjit);
      this._u.uCbPrevViewProjUnjit.value.copy(ctx.matrices.prevViewProjUnjit);
      g.gDepthVM = this.gDepthVM;
    } else {
      g.gDepthVM = null;
    }
    mark('viewmodel');
    this._run(60, 105);
    mark('orders 60-105');

    // --- order 110 : output ---------------------------------------------------
    const grade = this.passes.find(p => p.order >= 106 && p.enabled !== false);
    if (grade) {
      grade.execute(null, g, ctx);
    } else {
      this._blit.uniforms.tSrc.value = g.sceneHDR;
      this._blit.uniforms.uExposure.value = this.exposure;
      this.fullscreen(this._blit, null);
    }
    r.setRenderTarget(null);
    mark('grade/output');

    this._capturePrevMatrices();
    this._temporalDirty = false;
    if (profile) {
      ctx.debug.profileNextFrame = false;
      ctx.debug.frameProfile = {
        totalMs: +(performance.now() - profileStarted).toFixed(1),
        rows: profileRows,
      };
    }
  }

  /**
   * Build the optional shared resources. `pre` = the pass before opaque
   * shading (produces nothing new; just rebinds last frame's viewZ so GTAO at
   * order 8 has an input); `!pre` = after opaque, linearise this frame's depth
   * and derive hi-Z / tiles from it.
   */
  _buildOptionalResources(pre) {
    const g = this._gbufObj;
    const wantViewZ = this._needs('viewZ') || this._needs('viewZPrev') ||
                      this._needs('hiZ') || this._needs('tiles');
    if (!wantViewZ) { g.gViewZ = g.gViewZPrev = null; g.hiZ = null; g.tiles = null; return; }

    const pp = this.pingpong('viewZ', { format: THREE.RedFormat, type: THREE.FloatType, filter: THREE.NearestFilter });
    if (pre) {
      // GTAO/anything at order 5..9 reads what pass 10 wrote LAST frame. The
      // ping-pong is swapped AFTER opaque, so at this moment `write` holds
      // frame N-1 and `read` holds N-2. Handing out `read` for both was a
      // two-frame-old depth, which under fast motion is a visible AO lag.
      g.gViewZ = pp.write.texture;
      g.gViewZPrev = pp.read.texture;
      return;
    }

    pp.swap();
    this._linearize.uniforms.tDepth.value = this.gDepthHW;
    this._linearize.uniforms.uNearFar.value.set(this.ctx.camera.near, this.ctx.camera.far);
    this.fullscreen(this._linearize, pp.write);
    g.gViewZ = pp.write.texture;
    g.gViewZPrev = pp.read.texture;
    // Only rebind when the AO owner did NOT supply its own depth. It used to be
    // unconditional, which clobbered the half-res depth setAOTexture() was
    // given while uCbAOTexel still said half-res — every bilateral tap then
    // landed on the wrong texel, worst of all for the viewmodel at order 60.
    if (this._u.uCbAOParams.value.x > 0.5 && !this._aoDepthOwned) this._u.uCbAODepth.value = g.gViewZPrev;

    if (this._needs('hiZ')) this._buildHiZ(g);
    if (this._needs('tiles')) this._buildTiles(g);
  }

  _buildHiZ(g) {
    // R32F min pyramid from half res. NearestFilter + textureLod with integer
    // levels only; linear filtering of R32F is not core WebGL2.
    const levels = 9;
    const rt = this.rt('hiZ', {
      w: this.halfWidth, h: this.halfHeight,
      format: THREE.RedFormat, type: THREE.FloatType,
      filter: THREE.NearestFilter,
    });
    // Level 0: downsample gViewZ. Subsequent levels: 4-tap min of the previous.
    this._hizMat.uniforms.tSrc.value = g.gViewZ;
    this._hizMat.uniforms.uSrcTexel.value.set(1 / this.width, 1 / this.height);
    this._hizMat.uniforms.uLevel.value = 0;
    this.fullscreen(this._hizMat, rt);
    let w = this.halfWidth, h = this.halfHeight;
    const mips = this._hizMips || (this._hizMips = []);
    mips.length = 0;
    mips.push(rt.texture);
    this._hizMat.uniforms.tSrc.value = rt.texture;
    this._hizMat.uniforms.uLevel.value = 0;
    for (let i = 1; i < levels; i++) {
      const pw = w, ph = h;
      w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
      const dst = this.rt('hiZ' + i, { w, h, format: THREE.RedFormat, type: THREE.FloatType, filter: THREE.NearestFilter });
      this._hizMat.uniforms.uSrcTexel.value.set(1 / pw, 1 / ph);
      this.fullscreen(this._hizMat, dst);
      this._hizMat.uniforms.tSrc.value = dst.texture;
      mips.push(dst.texture);
      if (w === 1 && h === 1) break;
    }
    // Separate targets rather than real mip levels: r161 cannot render into a
    // chosen mip of a WebGLRenderTarget, so `hiZMips[i]` is the pyramid.
    g.hiZ = rt.texture;
    g.hiZMips = mips;
    g.hiZLevels = mips.length;
  }

  _buildTiles(g) {
    const tw = Math.ceil(this.width / this.tileSize);
    const th = Math.ceil(this.height / this.tileSize);
    const a = this.rt('tileMax', { w: tw, h: th, format: THREE.RGFormat, type: THREE.HalfFloatType, filter: THREE.NearestFilter });
    const b = this.rt('tileNbor', { w: tw, h: th, format: THREE.RGFormat, type: THREE.HalfFloatType, filter: THREE.NearestFilter });
    this._tileMat.uniforms.tVel.value = g.gVel;
    this._tileMat.uniforms.uTexel.value.set(1 / this.width, 1 / this.height);
    this._tileMat.uniforms.uTileSize.value = this.tileSize;
    this.fullscreen(this._tileMat, a);
    this._nborMat.uniforms.tSrc.value = a.texture;
    this._nborMat.uniforms.uTexel.value.set(1 / tw, 1 / th);
    this.fullscreen(this._nborMat, b);
    g.tiles = b.texture;
    g.tileMax = a.texture;
    g.tilesW = tw; g.tilesH = th;
  }

  /**
   * MRT-C: the same four colour textures, a private depth texture, so the gun
   * gets its own depth range without wiping the world's (RENDER_PLAN §1.2).
   * Allocated lazily — nothing pays for it until a viewmodel exists.
   */
  _viewTarget() {
    if (this.mrtView && this.mrtView.width === this.width && this.mrtView.height === this.height) return this.mrtView;
    if (this.mrtView) { this.mrtView.texture = []; this.mrtView.dispose(); }
    this.gDepthVM?.dispose();
    this.gDepthVM = new THREE.DepthTexture(this.width, this.height, THREE.FloatType);
    this.gDepthVM.format = THREE.DepthFormat;
    this.gDepthVM.minFilter = this.gDepthVM.magFilter = THREE.NearestFilter;
    const v = new THREE.WebGLMultipleRenderTargets(this.width, this.height, 4, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthBuffer: true, stencilBuffer: false, generateMipmaps: false, samples: 0,
    });
    v.texture = this.mrt.texture.slice();   // alias the world's attachments
    v.depthTexture = this.gDepthVM;
    // Without this three re-runs texImage2D on the aliased textures when it
    // first sets this FBO up, which re-specifies their storage and blanks the
    // world for one frame. The flag makes it only call framebufferTexture2D.
    this.ctx.renderer.properties.get(v).__hasExternalTextures = true;
    this.mrtView = v;
    return v;
  }

  /**
   * A single-attachment view of `mrt.texture[0]`, no depth. Writing through the
   * 4-attachment MRT with a one-output shader leaves attachments 1..3 undefined,
   * which would wipe the normal/velocity/spec buffers every post pass reads, so
   * the rejoin blit needs its own framebuffer over the same storage.
   */
  /**
   * Free the rejoin FBO without freeing the borrowed attachments. three's
   * `deallocateRenderTarget` dereferences `renderTarget.texture` and
   * `.depthTexture` unconditionally, so they are swapped for a throwaway rather
   * than nulled — nulling throws the same WeakMap error, and leaving the alias
   * in place would delete the world's colour attachment out from under the MRT.
   */
  _dropRejoin() {
    const t = this._rejoin;
    if (!t) return;
    t.texture = new THREE.Texture();
    t.depthTexture = null;
    t.dispose();
    this._rejoin = null;
  }

  _rejoinTarget() {
    const src = this.mrt.texture[0];
    if (this._rejoin && this._rejoin.texture === src &&
        this._rejoin.width === this.width && this._rejoin.height === this.height) return this._rejoin;
    this._dropRejoin();
    const t = new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthBuffer: true, stencilBuffer: false, generateMipmaps: false, samples: 0,
    });
    t.texture = src;                       // alias, exactly as _viewTarget does
    // MUST carry a depthTexture even though the copy neither tests nor writes
    // depth: with `__hasExternalTextures` set, three's setRenderTarget takes the
    // `rebindTextures(rt, properties.get(rt.texture).__webglTexture,
    // properties.get(rt.depthTexture).__webglTexture)` branch on every frame
    // after the first, and `properties.get(null)` throws "Invalid value used as
    // weak map key" — a hard page error on frame 2, not a warning. `_viewTarget`
    // only escapes it because it happens to own a depth texture.
    t.depthTexture = this.gDepthHW;
    this.ctx.renderer.properties.get(t).__hasExternalTextures = true;
    this._rejoin = t;
    return t;
  }

  _hasTransparentLayer() { return this._transparentCount > 0; }

  _capturePrevMatrices() {
    // Only objects whose material asked for it — a full-scene traverse here
    // would be the single most expensive thing in the file.
    for (const mat of this._dynamic) {
      const owner = mat.userData.cbOwner;
      if (owner) mat.userData.cbPrevModelMatrix.value.copy(owner.matrixWorld);
    }
    this._u.uCbPrevTime.value = this.ctx.time.elapsed;
  }

  _run(lo, hi) {
    const g = this._gbufObj;
    const ctx = this.ctx;
    const passes = this.passes;
    for (let i = 0; i < passes.length; i++) {
      const p = passes[i];
      if (p.order < lo || p.order > hi) continue;
      if (p.enabled === false) continue;
      p.execute(p.target || null, g, ctx);
    }
  }

  // ---------------------------------------------------------------------------
  // debug
  // ---------------------------------------------------------------------------

  /** Read back one MRT attachment. Debug only — stalls the pipeline. */
  readAttachment(index, x = 0, y = 0, w = 1, h = 1) {
    const gl = this.ctx.gl;
    const props = this.ctx.renderer.properties.get(this.mrt);
    gl.bindFramebuffer(gl.FRAMEBUFFER, props.__webglFramebuffer);
    gl.readBuffer(gl.COLOR_ATTACHMENT0 + index);
    const buf = new Float32Array(w * h * 4);
    try { gl.readPixels(x, y, w, h, gl.RGBA, gl.FLOAT, buf); } catch (e) { /* RGBA8 attachment */ }
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.ctx.renderer.state.bindFramebuffer(gl.FRAMEBUFFER, null);
    return buf;
  }

  debugInfo() {
    // Preserve the long-standing string list for __CB.passes() and diagnostics,
    // while publishing structured health alongside it for hard release gates.
    const stats = this.ctx.debug.stats || {};
    const passStates = this.passes.map(p => {
      let owner = this.ctx.sys[p.id];
      if (p.id === 'skyAerial') owner = this.ctx.sys.sky;
      else if (p.id.startsWith('water')) owner = this.ctx.sys.water;
      else if (p.id.startsWith('vfx')) owner = this.ctx.sys.vfx;
      else if (p.id === 'gtaoDebug') owner = this.ctx.sys.gtao;

      let failed = p.failed;
      if (failed == null && p.id === 'skyAerial') failed = owner?._aerialFailed;
      else if (failed == null && p.id === 'vfxHeat') failed = owner?._heatOff;
      else if (failed == null) failed = owner?.failed ?? owner?._failed;

      const statKey = p.id.startsWith('water') ? 'water' : p.id;
      const stat = stats[statKey];
      if (!failed && typeof stat === 'string' && stat.startsWith('disabled:')) failed = true;
      return {
        id: p.id,
        order: p.order,
        enabled: p.enabled !== false,
        failed: !!failed,
      };
    });
    return {
      width: this.width, height: this.height,
      half: [this.halfWidth, this.halfHeight],
      passes: this.passes.map(p => `${p.order}:${p.id}`),
      passStates,
      enriched: this._enriched.size,
      gbufferOrphans: this._nonGBuffer.length,
      jitter: this.jitterEnabled,
      pool: [...this._pool.keys()].filter(k => !k.startsWith('§')),
      frame: this._frameIndex,
    };
  }

  dispose() {
    this._disposeTargets();
    for (const rt of this._pool.values()) rt.dispose?.();
    this._pool.clear();
    this._fsGeo?.dispose();
    this._fsGeo = null;
    this._fsFallbackMat?.dispose();
    this._fsFallbackMat = null;
    for (const key of ['_blit', '_copy', '_linearize', '_hizMat', '_tileMat', '_nborMat']) {
      this[key]?.dispose?.();
      this[key] = null;
    }
    this._whiteAO?.dispose();
    this._blackDepth?.dispose();
    if (ACTIVE === this) ACTIVE = null;
  }
}

// Clear values, allocated once. Sky/background defaults so that anything the
// geometry does not cover still holds a meaningful gbuffer value.
const CLEAR_HDR = new Float32Array([0, 0, 0, 1]);
const CLEAR_NORMAL = new Float32Array([0, 0, 0, 1]);            // no normal, roughness 1
const CLEAR_VEL = new Float32Array([0, 0, CB_FLAG.SKY, 0]);     // zero motion, sky flag
const CLEAR_SPEC = new Float32Array([0, 0, 0, 1]);              // no F0, unoccluded
const CLEAR_DEPTH = new Float32Array([1]);
