// =============================================================================
// CINDERBLOOM — GTAO (ground-truth ambient occlusion)
// Owner: gtao agent.  Frame graph order 8 (RENDER_PLAN §2.1, §4).
// =============================================================================
//
// Jimenez et al. 2016 "Practical Realtime Strategies for Accurate Indirect
// Occlusion", implemented in the XeGTAO shape: N slices x M steps of horizon
// search per direction, closed-form cosine-weighted visibility integral, bent
// normal as a by-product.  Half resolution, interleaved-gradient noise, three
// denoise stages (4x4 tile gather -> 3x3 cross bilateral -> temporal), and a
// depth-aware bilateral upsample that happens inside the forward shader
// (renderer.js `cbSampleAOBilateral`, fed from here).
//
// ## What this pass does NOT do
//
// It never touches direct light.  The visibility term is handed to
// `renderer.setAOTexture()` and the injected forward-shader chunk multiplies it
// into `reflectedLight.indirectDiffuse` (via Jimenez multi-bounce) and
// `indirectSpecular` (via Frostbite specular occlusion) only.  AO applied to the
// composite is the "dirty frame" mistake; we are not making it.
//
// ## Plan B timing — read this before debugging a one-frame offset
//
// renderer.js ships RENDER_PLAN §2.4 Plan B: there is no order-5 depth prepass,
// so at order 8 the only depth that exists is the PREVIOUS frame's.  Everything
// this pass touches is therefore consistently one frame behind, and that turns
// out to be self-consistent:
//
//   * `viewZ` ping-pong `.write`   -> frame N-1 linear depth  (what we trace)
//   * `gbuf.gViewZPrev`            -> frame N-2 linear depth  (history's depth)
//   * `gbuf.gVel`                  -> frame N-1 velocity, mapping N-1 -> N-2
//
// so `prevUv = uv - vel` reprojects our current AO field onto our AO history
// exactly, with no extra matrix work.  The one real cost is that the AO handed
// to shading at order 10 of frame N was traced against frame N-1's depth: one
// frame of AO lag, sanctioned by RENDER_PLAN §2.4.  See "weak" notes in HANDOFF.
//
// NOTE we deliberately read the ping-pong's `.write`, not `gbuf.gViewZ`.
// `_buildOptionalResources(pre)` hands out `pp.read`, which at that point in the
// frame is TWO frames stale (the swap happens after opaque).  Filed in HANDOFF
// under `## requests`; until it is fixed we grab the pooled pair ourselves,
// which is a read-only use of the public `renderer.pingpong()` API.
//
// ## Resolution contract — do not change
//
// The AO field is ALWAYS half render resolution, at every quality preset.
// `renderer.js` publishes `uCbAOTexel = 1/halfRes` to every enriched material
// and the in-shader bilateral upsample locates its four taps with it.  Rendering
// AO at any other fraction silently corrupts that upsample.  Quality scales
// slices / steps / denoise / bent normals, never resolution.
//
// ## Knobs — `ctx.debug.gtao` (and `ctx.sys.gtao.knobs`)
//
//   enabled          master on/off (also `__CB.toggle('gtao')`)
//   radius           world-space search radius, metres
//   intensity        power curve on visibility, 1.0 = ground truth
//   thickness        0..1 thin-occluder heuristic
//   falloff          fraction of radius where falloff starts (0.72)
//   bias             cosine bias against depth-precision self-occlusion
//   slices / steps   0 = follow the quality preset, >0 = override
//   temporalAlpha    history blend, 0.12
//   bentNormals      write world-space bent normal into .rgb
//   denoise          0 none, 1 tile only, 2 tile + cross bilateral
//   maxRadiusPx      screen-space clamp, half-res pixels (96)
//   stepExp          step distribution exponent, >1 packs samples near the pixel
//   debugView        0 off, 1 visibility, 2 bent normal, 3 spatial-only (no temporal)
//
// =============================================================================

import * as THREE from 'three';

const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Shared helpers. `uProjInfo` = (tan(hfov/2), tan(vfov/2)); the view-space
// reconstruction is exact for a perspective camera and needs no matrix.
const COMMON = /* glsl */`
const float CB_PI = 3.14159265359;
const float CB_HALF_PI = 1.57079632679;
const float CB_SKY_Z = 5.0e4;   // prep is RGBA16F: half-float saturates at 65504, so 1e6 is not representable. Camera far is 4000 m, so 50000 is unambiguous.

vec3 cbViewPos(vec2 uv, float z, vec2 projInfo) {
  return vec3((uv * 2.0 - 1.0) * projInfo * z, -z);
}

// Interleaved gradient noise, Jimenez's temporally-rotated form (RENDER_PLAN
// §4.4). Tiles at 4x4 in space, which is precisely why the 4x4 denoise below is
// variance reduction rather than a blur.
float cbIGN(vec2 p, int f) {
  p += 5.588238 * float(f & 63);
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}
`;

// -----------------------------------------------------------------------------
// 1. PREP — half-res (viewZ, viewNormal) from the full-res linear depth.
// Normals are reconstructed from depth, never sampled from gNormalRough: the
// normal-mapped normal disagrees with the depth field and haloes every crease.
// "Best of four" (Herubel): pick the closer neighbour on each axis, so the
// derivative never straddles a silhouette. RENDER_PLAN §4.2.
// -----------------------------------------------------------------------------
const PREP_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tViewZ;
uniform vec2 uFullTexel;
uniform vec2 uProjInfo;
layout(location = 0) out vec4 outPrep;
${COMMON}

void main() {
  // The 2x2 full-res block under this half-res texel. Take the nearest of the
  // four: AO wants the foreground surface, and a depth average across a
  // silhouette is a surface that does not exist.
  vec2 c = vUv;
  float z0 = textureLod(tViewZ, c + uFullTexel * vec2(-0.5, -0.5), 0.0).r;
  float z1 = textureLod(tViewZ, c + uFullTexel * vec2( 0.5, -0.5), 0.0).r;
  float z2 = textureLod(tViewZ, c + uFullTexel * vec2(-0.5,  0.5), 0.0).r;
  float z3 = textureLod(tViewZ, c + uFullTexel * vec2( 0.5,  0.5), 0.0).r;
  float zc = min(min(z0, z1), min(z2, z3));

  // uv of the winning full-res texel, so the normal derivatives are taken about
  // a real sample rather than between four of them.
  vec2 off = (zc == z0) ? vec2(-0.5, -0.5)
           : (zc == z1) ? vec2( 0.5, -0.5)
           : (zc == z2) ? vec2(-0.5,  0.5)
                        : vec2( 0.5,  0.5);
  vec2 uvc = c + uFullTexel * off;

  if (zc >= CB_SKY_Z) { outPrep = vec4(6.0e4, 0.0, 0.0, 1.0); return; }

  float zl = textureLod(tViewZ, uvc - vec2(uFullTexel.x, 0.0), 0.0).r;
  float zr = textureLod(tViewZ, uvc + vec2(uFullTexel.x, 0.0), 0.0).r;
  float zd = textureLod(tViewZ, uvc - vec2(0.0, uFullTexel.y), 0.0).r;
  float zu = textureLod(tViewZ, uvc + vec2(0.0, uFullTexel.y), 0.0).r;

  vec3 P  = cbViewPos(uvc, zc, uProjInfo);
  vec3 Pl = cbViewPos(uvc - vec2(uFullTexel.x, 0.0), zl, uProjInfo);
  vec3 Pr = cbViewPos(uvc + vec2(uFullTexel.x, 0.0), zr, uProjInfo);
  vec3 Pd = cbViewPos(uvc - vec2(0.0, uFullTexel.y), zd, uProjInfo);
  vec3 Pu = cbViewPos(uvc + vec2(0.0, uFullTexel.y), zu, uProjInfo);

  vec3 dx = (abs(zr - zc) < abs(zl - zc)) ? (Pr - P) : (P - Pl);
  vec3 dy = (abs(zu - zc) < abs(zd - zc)) ? (Pu - P) : (P - Pd);

  vec3 n = cross(dx, dy);
  float nl = length(n);
  vec3 N = (nl > 1e-9) ? n / nl : vec3(0.0, 0.0, 1.0);
  // Guard against a degenerate/back-facing reconstruction at extreme grazing.
  if (dot(N, normalize(-P)) < 0.0) N = -N;

  outPrep = vec4(zc, N);
}
`;

// -----------------------------------------------------------------------------
// 2. TRACE — the GTAO integral itself.
// -----------------------------------------------------------------------------
const TRACE_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tPrep;
uniform vec2 uHalfTexel;
uniform vec2 uProjInfo;
uniform float uProjScale;     // half-res pixels per metre at z = 1
uniform float uRadius;
uniform float uFalloffStart;
uniform float uThickness;
uniform float uBias;
uniform float uMaxRadiusPx;
uniform float uStepExp;
uniform int   uFrame;
layout(location = 0) out vec4 outAO;
${COMMON}

#ifndef CB_SLICES
  #define CB_SLICES 3
#endif
#ifndef CB_STEPS
  #define CB_STEPS 6
#endif
#ifndef CB_BENT
  #define CB_BENT 1
#endif

void main() {
  vec4 prep = textureLod(tPrep, vUv, 0.0);
  float z = prep.r;

  // Sky / nothing: fully visible, bent normal = view direction.
  if (z >= CB_SKY_Z) { outAO = vec4(0.0, 0.0, 1.0, 1.0); return; }

  vec3 N = normalize(prep.gba);
  vec3 P = cbViewPos(vUv, z, uProjInfo);
  vec3 V = normalize(-P);

  // Screen-space search radius. Clamped so a wall in your face does not turn
  // into a full-screen gather (RENDER_PLAN §4.3).
  float radiusPx = clamp(uRadius * uProjScale / max(z, 1e-3), 2.0, uMaxRadiusPx);
  float falloffMul = 1.0 / max(uRadius - uFalloffStart, 1e-4);

  vec2 fc = gl_FragCoord.xy;
  float rotN  = cbIGN(fc, uFrame);
  float stepN = fract(cbIGN(fc + vec2(37.0, 17.0), uFrame * 7 + 3) + 0.5);

  float visibility = 0.0;
  vec3 bent = vec3(0.0);
  float bentW = 0.0;

  for (int slice = 0; slice < CB_SLICES; slice++) {
    // Slices span pi; the per-pixel rotation is what the 4x4 denoise recovers.
    float phi = (float(slice) + rotN) * (CB_PI / float(CB_SLICES));
    vec2 omega = vec2(cos(phi), sin(phi));
    vec3 dirVS = vec3(omega, 0.0);

    // Basis of the slice plane: V and the component of the slice direction
    // orthogonal to it.
    vec3 orthoDir = dirVS - dot(dirVS, V) * V;
    float orthoLen = length(orthoDir);
    if (orthoLen < 1e-5) continue;
    vec3 orthoN = orthoDir / orthoLen;

    // Project the surface normal into the slice plane.
    vec3 axis = cross(dirVS, V);
    float axisLen = length(axis);
    if (axisLen < 1e-5) continue;
    axis /= axisLen;
    vec3 projN = N - axis * dot(N, axis);
    float projNLen = length(projN);
    if (projNLen < 1e-4) continue;

    float cosN = clamp(dot(projN, V) / projNLen, -1.0, 1.0);
    float n = sign(dot(projN, orthoN)) * acos(cosN);
    float sinN = sin(n);
    float cosNn = cos(n);

    float inner = 0.0;
    float hA = 0.0, hB = 0.0;

    for (int side = 0; side < 2; side++) {
      float sgn = (side == 0) ? -1.0 : 1.0;
      // The horizon of an UNOCCLUDED surface in this slice: the tangent plane.
      // Both the initial value and the target every attenuated sample fades
      // back to. Fading toward -1 instead (the obvious-looking choice) is what
      // XeGTAO explicitly does not do, and it under-occludes at grazing angles.
      float lowHorizon = cos(n + sgn * CB_HALF_PI);
      float cosH = lowHorizon;

      for (int s = 0; s < CB_STEPS; s++) {
        // Non-linear step distribution. The tap COUNT is fixed, so the screen
        // radius only changes the stride, not the cost -- but a linear stride
        // over a large radius steps straight over the near crease that carries
        // most of the occlusion. uStepExp > 1 packs samples near the pixel while
        // the last step still reaches the full radius.
        float t = pow((float(s) + stepN) / float(CB_STEPS), uStepExp);
        float px = max(1.5, t * radiusPx);
        vec2 suv = vUv + sgn * omega * px * uHalfTexel;
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) break;

        float sz = textureLod(tPrep, suv, 0.0).r;
        if (sz >= CB_SKY_Z) continue;

        vec3 D = cbViewPos(suv, sz, uProjInfo) - P;
        float dist = length(D);
        if (dist < 1e-4) continue;

        float shc = dot(D, V) / dist - uBias;

        // 3D distance falloff: begins at uFalloffStart, dead at uRadius.
        float fo = clamp((dist - uFalloffStart) * falloffMul, 0.0, 1.0);

        // Finite-thickness assumption (RENDER_PLAN §4.3). A depth buffer has no
        // back face, so an occluder is otherwise infinitely deep and a thin
        // blade of foliage shadows everything behind it forever. Assume every
        // occluder is thickness*radius deep: once we are further behind its
        // front surface than that, it stops occluding.
        float th = uThickness * uRadius;
        float fz = (th > 1e-4) ? clamp((max(0.0, z - sz) - th) / th, 0.0, 1.0) : 0.0;

        shc = mix(shc, lowHorizon, max(fo, fz));

        // Plain max. NOT a running blend: dragging the horizon down on every
        // non-maximal sample decays it geometrically over the march and costs
        // ~70% of the occlusion (measured: min visibility 0.50 -> 0.15 when
        // this was fixed).
        cosH = max(cosH, shc);
      }

      float h = sgn * acos(clamp(cosH, -1.0, 1.0));
      h = n + clamp(h - n, -CB_HALF_PI, CB_HALF_PI);
      // Closed-form cosine-weighted arc integral (Jimenez eq. 7).
      inner += 0.25 * (-cos(2.0 * h - n) + cosNn + 2.0 * h * sinN);
      if (side == 0) hA = h; else hB = h;
    }

    visibility += projNLen * inner;

    #if CB_BENT
      float tb = (hA + hB) * 0.5;
      bent += (V * cos(tb) + orthoN * sin(tb)) * (projNLen * inner);
      bentW += projNLen * inner;
    #endif
  }

  visibility = clamp(visibility / float(CB_SLICES), 0.0, 1.0);

  vec3 bentOut = N;
  #if CB_BENT
    bentOut = (bentW > 1e-4) ? normalize(bent / bentW) : N;
  #endif

  outAO = vec4(bentOut, visibility);
}
`;

// -----------------------------------------------------------------------------
// 3. DENOISE A — 4x4 IGN tile gather (RENDER_PLAN §4.5.1).
// Every pixel in a 4x4 block used a different slice rotation and step offset, so
// this recovers ~16x the sample count. It is variance reduction, not blur — the
// depth weight is what keeps it from being one.
// -----------------------------------------------------------------------------
const DENOISE_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tAO;
uniform sampler2D tPrep;
uniform vec2 uHalfTexel;
uniform float uRadiusTexels;   // 1.5 -> 4x4 gather, 1.0 -> 3x3
layout(location = 0) out vec4 outAO;
${COMMON}

void main() {
  float zc = textureLod(tPrep, vUv, 0.0).r;
  vec4 c = textureLod(tAO, vUv, 0.0);
  if (zc >= CB_SKY_Z) { outAO = c; return; }

  int r = int(uRadiusTexels + 0.5);
  vec4 acc = vec4(0.0);
  float wsum = 0.0;
  float sigma = 0.015 * zc + 0.02;

  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      if (abs(x) > r || abs(y) > r) continue;
      vec2 uv = vUv + vec2(float(x), float(y)) * uHalfTexel;
      float zt = textureLod(tPrep, uv, 0.0).r;
      if (zt >= CB_SKY_Z) continue;
      float w = exp(-abs(zt - zc) / sigma);
      acc += textureLod(tAO, uv, 0.0) * w;
      wsum += w;
    }
  }
  outAO = (wsum > 1e-5) ? acc / wsum : c;
}
`;

// -----------------------------------------------------------------------------
// 4. TEMPORAL — reproject by gVel, variance-clamp, accumulate (RENDER_PLAN §4.5.3).
// The clamp is what stops AO smearing off a moving object; without it this is a
// ghost machine. Cooperates with TAA instead of fighting it: same reprojection
// source (gVel), same closest-depth dilation, and a much slower alpha, so TAA
// never sees a signal that jumps under it.
// -----------------------------------------------------------------------------
const TEMPORAL_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tAO;        // this frame, denoised
uniform sampler2D tHistory;
uniform sampler2D tPrep;      // half-res (z, n)
uniform sampler2D tVel;       // full-res RGBA16F, .rg uv motion
uniform sampler2D tViewZFull; // full-res depth matching THIS frame
uniform sampler2D tViewZPrev; // full-res depth matching the HISTORY frame
uniform vec2 uHalfTexel;
uniform vec2 uFullTexel;
uniform float uAlpha;
uniform float uValid;         // 0 on the first frame / after a reset
layout(location = 0) out vec4 outAO;
${COMMON}

void main() {
  vec4 cur = textureLod(tAO, vUv, 0.0);
  float zc = textureLod(tPrep, vUv, 0.0).r;

  if (uValid < 0.5 || zc >= CB_SKY_Z) { outAO = cur; return; }

  // Closest-depth velocity dilation (RENDER_PLAN §3.3): sampling velocity at the
  // centre of a half-res texel picks a background pixel half the time along a
  // silhouette, which drags the occluder's AO into the background.
  vec2 bestUv = vUv;
  float bestZ = 1.0e9;
  for (int i = 0; i < 5; i++) {
    vec2 o = (i == 0) ? vec2(0.0)
           : (i == 1) ? vec2(-1.0, -1.0)
           : (i == 2) ? vec2( 1.0, -1.0)
           : (i == 3) ? vec2(-1.0,  1.0)
                      : vec2( 1.0,  1.0);
    vec2 uv = vUv + o * uFullTexel;
    float zt = textureLod(tViewZFull, uv, 0.0).r;
    if (zt < bestZ) { bestZ = zt; bestUv = uv; }
  }
  vec2 vel = textureLod(tVel, bestUv, 0.0).rg;
  vec2 prevUv = vUv - vel;

  if (prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0) {
    outAO = cur; return;
  }

  // Disocclusion: the history frame's own depth at the reprojected point must
  // still describe the same surface.
  float zPrev = textureLod(tViewZPrev, prevUv, 0.0).r;
  if (zPrev >= CB_SKY_Z || abs(zPrev - zc) > 0.03 * zc + 0.05) { outAO = cur; return; }

  vec4 hist = textureLod(tHistory, prevUv, 0.0);

  // 3x3 neighbourhood of the CURRENT field bounds what history is allowed to be.
  float mn = 1.0, mx = 0.0;
  vec3 bmn = vec3( 1.0), bmx = vec3(-1.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 so = vec2(float(x), float(y)) * uHalfTexel;
      vec4 s = textureLod(tAO, vUv + so, 0.0);
      mn = min(mn, s.a); mx = max(mx, s.a);
      bmn = min(bmn, s.rgb); bmx = max(bmx, s.rgb);
    }
  }
  hist.a = clamp(hist.a, mn, mx);
  hist.rgb = clamp(hist.rgb, bmn, bmx);

  vec4 res = mix(hist, cur, uAlpha);
  res.rgb = normalize(res.rgb + 1e-6);
  outAO = res;
}
`;

// -----------------------------------------------------------------------------
// 5. DEBUG VIEW — overwrite sceneHDR at order 105 so the critic can A/B the
// field itself. All four attachments are written because WebGL2 drops any draw
// that leaves an active draw buffer unwritten (renderer.js DEVIATION 4).
// -----------------------------------------------------------------------------
const DEBUG_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tAO;
uniform sampler2D tRaw;   // spatially denoised, pre-temporal
uniform mat3 uViewToWorld;
uniform float uMode;
uniform float uExposure;
uniform vec2 uRange;      // visibility window stretched across 0..1
uniform float uInvert;    // 1 = pre-invert the fallback ACES blit
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
layout(location = 3) out vec4 o3;

// Analytic inverse of the Narkowicz ACES fit renderer.js blits with. Without
// it every debug view is a washed-out white page and a 0.98-vs-1.00 AO field is
// literally invisible -- which is the entire job of this view.
float cbInvAces(float y) {
  y = clamp(y, 0.0, 0.9999);
  float A = 2.51 - 2.43 * y;
  float B = 0.03 - 0.59 * y;
  float C = -0.14 * y;
  float d = max(B * B - 4.0 * A * C, 0.0);
  return max((-B + sqrt(d)) / (2.0 * A), 0.0);
}

void main() {
  vec4 a = (uMode > 2.5) ? textureLod(tRaw, vUv, 0.0) : textureLod(tAO, vUv, 0.0);
  vec3 col;
  if (uMode > 1.5 && uMode < 2.5) {
    col = uViewToWorld * normalize(a.rgb) * 0.5 + 0.5;
  } else {
    // A ground-truth AO field over open terrain lives in roughly 0.85..1.0.
    // Shown raw through the ACES fallback blit that is a flat white page, so the
    // window is stretched -- knobs.debugRange moves it.
    col = vec3(clamp((a.a - uRange.x) / max(uRange.y - uRange.x, 1e-4), 0.0, 1.0));
  }
  if (uInvert > 0.5) {
    col = vec3(cbInvAces(pow(col.r, 2.2)), cbInvAces(pow(col.g, 2.2)), cbInvAces(pow(col.b, 2.2)));
  }
  o0 = vec4(col * uExposure, 1.0);
  o1 = vec4(0.0, 0.0, 0.0, 1.0);
  o2 = vec4(0.0, 0.0, 8.0, 0.0);
  o3 = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

// -----------------------------------------------------------------------------

/** slices / steps / denoise stages / bent normals per quality preset. §4.3. */
const PRESETS = {
  low:    { on: false, slices: 2, steps: 4, radius: 1.4, denoise: 1, bent: false },
  medium: { on: true,  slices: 2, steps: 4, radius: 1.4, denoise: 1, bent: false },
  high:   { on: true,  slices: 3, steps: 6, radius: 1.6, denoise: 2, bent: true  },
  ultra:  { on: true,  slices: 4, steps: 8, radius: 1.8, denoise: 2, bent: true  },
};

export class GTAO {
  static id = 'gtao';
  static deps = ['renderer'];

  constructor(ctx) {
    this.ctx = ctx;
    this.pass = null;
    this.debugPass = null;
    this.ok = false;             // false => hard passthrough, never a black frame
    this._histValid = false;
    this._phase = 0;
    this._failed = 0;
    this._lastDefs = '';
    this._aoTex = null;
    this._rawTex = null;

    // Public knob block. Also mirrored at ctx.debug.gtao.
    this.knobs = {
      enabled: true,
      radius: 1.6,
      intensity: 1.0,
      thickness: 0.28,
      falloff: 0.72,
      bias: 0.02,
      slices: 0,          // 0 = follow preset
      steps: 0,
      temporalAlpha: 0.12,
      bentNormals: true,
      denoise: 2,
      maxRadiusPx: 96,
      stepExp: 1.5,
      debugView: 0,
      debugRange: [0.0, 1.0],
    };
  }

  async init() {
    const { ctx } = this;
    try {
      this._build();
      this._applyQuality(ctx.quality);

      ctx.debug.gtao = this.knobs;
      // Seed the flag so the FIRST `__CB.toggle('gtao')` turns the pass OFF.
      // (`toggle` flips whatever is there, and undefined would flip to `true`,
      //  i.e. no visible change — useless for an A/B.)
      if (ctx.debug.flags.gtao === undefined) ctx.debug.flags.gtao = true;

      this.pass = {
        id: 'gtao',
        order: 8,
        inputs: ['viewZ', 'viewZPrev'],
        outputs: ['ao'],
        enabled: true,
        execute: (target, gbuf, c) => this._execute(gbuf, c),
        reset: () => { this._histValid = false; this._phase = 0; },
      };
      ctx.frameGraph.register(this.pass);

      this.debugPass = {
        id: 'gtaoDebug',
        order: 105,
        inputs: [],
        outputs: [],
        enabled: false,
        execute: (target, gbuf, c) => this._executeDebug(gbuf, c),
      };
      ctx.frameGraph.register(this.debugPass);

      ctx.bus.on('quality', (q) => this._applyQuality(q));
      ctx.bus.on('rtResize', () => { this._histValid = false; this._phase = 0; });
      ctx.bus.on('debugFlag', ({ flag }) => {
        if (flag === 'gtao') this._syncEnabled();
      });

      this.ok = true;
    } catch (e) {
      console.warn('[gtao] init failed, running as passthrough:', e && (e.stack || e.message));
      this.ok = false;
      this._disable();
    }
  }

  // ---------------------------------------------------------------------------

  _mat(frag, uniforms, defines) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,   // three prepends `#version 300 es` (HANDOFF trap 1)
      vertexShader: FS_VERT,
      fragmentShader: frag,
      uniforms,
      defines: defines || {},
      depthTest: false,
      depthWrite: false,
    });
  }

  _build() {
    const V2 = () => new THREE.Vector2();
    this.mPrep = this._mat(PREP_FRAG, {
      tViewZ: { value: null }, uFullTexel: { value: V2() }, uProjInfo: { value: V2() },
    });
    this.mTrace = this._mat(TRACE_FRAG, {
      tPrep: { value: null }, uHalfTexel: { value: V2() }, uProjInfo: { value: V2() },
      uProjScale: { value: 1 }, uRadius: { value: 1.6 }, uFalloffStart: { value: 1.15 },
      uThickness: { value: 0.28 }, uBias: { value: 0.02 }, uMaxRadiusPx: { value: 96 },
      uStepExp: { value: 1.5 },
      uFrame: { value: 0 },
    }, { CB_SLICES: 3, CB_STEPS: 6, CB_BENT: 1 });
    this.mDenoise = this._mat(DENOISE_FRAG, {
      tAO: { value: null }, tPrep: { value: null }, uHalfTexel: { value: V2() },
      uRadiusTexels: { value: 1.5 },
    });
    this.mTemporal = this._mat(TEMPORAL_FRAG, {
      tAO: { value: null }, tHistory: { value: null }, tPrep: { value: null },
      tVel: { value: null }, tViewZFull: { value: null }, tViewZPrev: { value: null },
      uHalfTexel: { value: V2() }, uFullTexel: { value: V2() },
      uAlpha: { value: 0.12 }, uValid: { value: 0 },
    });
    this.mDebug = this._mat(DEBUG_FRAG, {
      tAO: { value: null }, tRaw: { value: null },
      uViewToWorld: { value: new THREE.Matrix3() }, uMode: { value: 1 },
      uExposure: { value: 1 }, uRange: { value: new THREE.Vector2(0, 1) },
      uInvert: { value: 1 },
    });
  }

  _applyQuality(q) {
    const p = PRESETS[q.preset] || PRESETS.high;
    this._preset = p;
    const k = this.knobs;
    k.radius = p.radius;
    k.denoise = p.denoise;
    // context.js does not publish `gtaoBentNormals` yet (requested in HANDOFF);
    // fall back to the preset table when it is absent.
    k.bentNormals = (q.gtaoBentNormals !== undefined) ? !!q.gtaoBentNormals : p.bent;
    this._presetOn = p.on && q.gtao !== false;
    this._histValid = false;
    this._phase = 0;
    this._syncEnabled();
  }

  _wanted() {
    const f = this.ctx.debug.flags.gtao;
    return this.ok && this._presetOn && this.knobs.enabled && f !== false;
  }

  _syncEnabled() {
    if (!this.pass) return;
    const on = this._wanted();
    if (this.pass.enabled === on) return;
    this.pass.enabled = on;
    this.ctx.frameGraph.invalidate();
    if (!on) this._disable();
    else this._histValid = false;
  }

  /** Hand the forward shader a 1x1 white AO field: exactly a no-op multiply. */
  _disable() {
    try {
      this.ctx.sys.renderer?.setAOTexture?.(null);
      const g = this.ctx.sys.renderer?._gbufObj;
      if (g) g.ao = null;
    } catch { /* renderer may not exist during a failed boot */ }
    if (this.debugPass) this.debugPass.enabled = false;
    this._aoTex = null;
  }

  _syncDefines() {
    const k = this.knobs, p = this._preset || PRESETS.high;
    const slices = Math.max(1, Math.min(8, k.slices > 0 ? k.slices : p.slices));
    const steps = Math.max(1, Math.min(16, k.steps > 0 ? k.steps : p.steps));
    const bent = k.bentNormals ? 1 : 0;
    const sig = `${slices}|${steps}|${bent}`;
    if (sig === this._lastDefs) return;
    this._lastDefs = sig;
    this.mTrace.defines.CB_SLICES = slices;
    this.mTrace.defines.CB_STEPS = steps;
    this.mTrace.defines.CB_BENT = bent;
    this.mTrace.needsUpdate = true;
  }

  // ---------------------------------------------------------------------------

  /**
   * The frame-graph entry point. Every failure path here degrades to
   * passthrough — a thrown exception inside `_run` would take the whole frame
   * down, and several other agents are registering into this graph right now.
   */
  _execute(gbuf, ctx) {
    if (!this._wanted()) { this._disable(); return; }
    try {
      this._trace(gbuf, ctx);
    } catch (e) {
      if (this._failed++ === 0) console.warn('[gtao] pass failed, degrading to passthrough:', e && (e.stack || e.message));
      if (this._failed > 3) { this.ok = false; this._syncEnabled(); }
      this._disable();
    }
  }

  _trace(gbuf, ctx) {
    const r = ctx.sys.renderer;
    const cam = ctx.camera;
    const k = this.knobs;

    // Dimensions come from the Renderer instance, NOT from `gbuf`.
    // `ctx.setSize()` runs before `initAll()`, so `renderer.resize()` allocates
    // the MRT before `_gbufObj` exists; `init()`'s own `_allocate()` call then
    // early-outs on "same size" and never back-fills gbuf.width/halfWidth, which
    // stay at their placeholder 1. `renderer.width/halfWidth` are correct in both
    // paths. Filed in HANDOFF `## requests`; this guard is cheap insurance
    // regardless of whether it gets fixed.
    const fw = r.width || gbuf.width, fh = r.height || gbuf.height;
    const hw = r.halfWidth || gbuf.halfWidth, hh = r.halfHeight || gbuf.halfHeight;
    if (hw < 2 || hh < 2) throw new Error(`degenerate AO resolution ${hw}x${hh}`);

    // --- source depth ---------------------------------------------------------
    // See the Plan B note in the header: `gbuf.gViewZ` is two frames stale at
    // order 8; the ping-pong's write side is the freshest complete frame.
    let viewZ = gbuf.gViewZ;
    let viewZPrev = gbuf.gViewZPrev || viewZ;
    const pp = r.pingpong('viewZ', {
      format: THREE.RedFormat, type: THREE.FloatType, filter: THREE.NearestFilter,
    });
    if (pp && pp.write && pp.write.width === fw) {
      viewZ = pp.write.texture;
      viewZPrev = pp.read.texture;
    }
    if (!viewZ) throw new Error('no viewZ; declare inputs:["viewZ"]');

    const rtOpts = {
      w: hw, h: hh, format: THREE.RGBAFormat, type: THREE.HalfFloatType,
      filter: THREE.NearestFilter,
    };
    const prep = r.rt('gtaoPrep', rtOpts);
    const raw = r.rt('gtaoRaw', rtOpts);
    // `gtaoDen` is only touched when a denoise stage runs; `renderer.rt()`
    // allocates on first call, so asking for it unconditionally would cost a
    // 960x540 RGBA16F that `denoise: 0` never reads.
    const den = (k.denoise >= 1) ? r.rt('gtaoDen', rtOpts) : null;
    // The field the forward shader samples: LinearFilter, because
    // `cbSampleAOBilateral` falls back to a plain `texture()` fetch when its
    // depth weights collapse.
    const hist = r.pingpong('gtaoHist', { ...rtOpts, filter: THREE.LinearFilter });

    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5);
    const tanH = tanV * cam.aspect;
    const projScale = hh / tanV;     // half-res pixels per metre at z = 1

    // --- 1. prep --------------------------------------------------------------
    const up = this.mPrep.uniforms;
    up.tViewZ.value = viewZ;
    up.uFullTexel.value.set(1 / fw, 1 / fh);
    up.uProjInfo.value.set(tanH, tanV);
    r.fullscreen(this.mPrep, prep);

    // --- 2. trace -------------------------------------------------------------
    this._syncDefines();
    const ut = this.mTrace.uniforms;
    ut.tPrep.value = prep.texture;
    ut.uHalfTexel.value.set(1 / hw, 1 / hh);
    ut.uProjInfo.value.set(tanH, tanV);
    ut.uProjScale.value = projScale;
    ut.uRadius.value = k.radius;
    ut.uFalloffStart.value = k.radius * Math.min(0.95, Math.max(0, k.falloff));
    ut.uThickness.value = k.thickness;
    ut.uBias.value = k.bias;
    ut.uMaxRadiusPx.value = k.maxRadiusPx;
    ut.uStepExp.value = Math.max(0.5, Math.min(4, k.stepExp));
    // Noise phase. NOT the sim frame: `__CB.settle()` renders without stepping
    // the sim, so a sim-keyed rotation would repeat one noise pattern for every
    // settle frame and never converge. NOT the renderer's global frame counter
    // either: that makes a vista's converged image depend on how many vistas
    // were captured before it, so `shots.mjs establish ridge` and
    // `shots.mjs ridge` disagree and visual regression is worthless. It is a
    // private counter zeroed by `reset()`, which `resetTemporal()` -- and
    // therefore `__CB.gotoVista()` -- calls. Same vista + same settle count ==
    // same pixels, every run, in any order.
    ut.uFrame.value = this._phase & 63;
    this._phase = (this._phase + 1) & 1023;
    r.fullscreen(this.mTrace, raw);

    // --- 3. spatial denoise ---------------------------------------------------
    let cur = raw;
    const ud = this.mDenoise.uniforms;
    ud.tPrep.value = prep.texture;
    ud.uHalfTexel.value.set(1 / hw, 1 / hh);
    if (k.denoise >= 1) {
      ud.tAO.value = cur.texture;
      ud.uRadiusTexels.value = 2.0;      // 5x5 window over the 4x4 IGN tile
      r.fullscreen(this.mDenoise, den);
      cur = den;
    }
    if (k.denoise >= 2) {
      // Second, tighter pass removes the residual tile edge. Ping into prep's
      // sibling rather than allocating: use raw as the scratch (already read).
      ud.tAO.value = cur.texture;
      ud.uRadiusTexels.value = 1.0;
      r.fullscreen(this.mDenoise, raw);
      cur = raw;
    }

    // --- 4. temporal ----------------------------------------------------------
    hist.swap();
    const um = this.mTemporal.uniforms;
    um.tAO.value = cur.texture;
    um.tHistory.value = hist.read.texture;
    um.tPrep.value = prep.texture;
    um.tVel.value = gbuf.gVel;
    um.tViewZFull.value = viewZ;
    um.tViewZPrev.value = viewZPrev;
    um.uHalfTexel.value.set(1 / hw, 1 / hh);
    um.uFullTexel.value.set(1 / fw, 1 / fh);
    um.uAlpha.value = THREE.MathUtils.clamp(k.temporalAlpha, 0.02, 1.0);
    um.uValid.value = (this._histValid && !gbuf.firstFrame && gbuf.gVel) ? 1 : 0;
    r.fullscreen(this.mTemporal, hist.write);
    this._histValid = true;

    // --- 5. publish -----------------------------------------------------------
    this._aoTex = hist.write.texture;
    this._rawTex = cur.texture;   // spatially denoised, pre-temporal (debugView 3)
    gbuf.ao = this._aoTex;
    // `depthTex` is our own half-res depth (prep .r == view z), which is what
    // `cbSampleAOBilateral` must weight against: it locates its four taps with
    // `uCbAOTexel` (half res). renderer.js otherwise rebinds a FULL-res depth
    // after the opaque pass, which would mis-locate every tap.
    r.setAOTexture(this._aoTex, { intensity: k.intensity, depthTex: prep.texture });

    // debug view follows the knob, but never survives a failure
    const dv = k.debugView | 0;
    if (this.debugPass) this.debugPass.enabled = dv > 0;
  }

  _executeDebug(gbuf, ctx) {
    try {
      const r = ctx.sys.renderer;
      if (!this._aoTex || !gbuf.rt) return;
      const u = this.mDebug.uniforms;
      u.tAO.value = this._aoTex;
      u.tRaw.value = this._rawTex || this._aoTex;
      u.uMode.value = this.knobs.debugView | 0;
      const dr = this.knobs.debugRange || [0, 1];
      u.uRange.value.set(dr[0], dr[1]);
      // Pre-invert only the renderer's ACES fallback. Once post/grade.js exists
      // (order >= 106) it owns the output transform and this would be wrong.
      u.uInvert.value = ctx.frameGraph.list().some(id => {
        const p = ctx.frameGraph.get(id);
        return p && p.order >= 106 && p.enabled !== false;
      }) ? 0 : 1;
      // sceneHDR is scene-referred; the fallback blit tonemaps it, so push the
      // 0..1 AO up to something that survives ACES rather than reading grey.
      u.uExposure.value = 1.0 / Math.max(0.05, r.exposure || 1);
      const m = ctx.matrices ? ctx.matrices.prevView : null;
      if (m) u.uViewToWorld.value.setFromMatrix4(m).transpose();
      r.fullscreen(this.mDebug, gbuf.rt);
    } catch (e) {
      if (this._failed++ === 0) console.warn('[gtao] debug view failed:', e && e.message);
      this.debugPass.enabled = false;
      this.knobs.debugView = 0;
    }
  }

  // ---------------------------------------------------------------------------

  debugInfo() {
    return {
      enabled: !!(this.pass && this.pass.enabled),
      ok: this.ok,
      preset: this._preset,
      defines: this._lastDefs,
      knobs: { ...this.knobs },
      histValid: this._histValid,
      failures: this._failed,
    };
  }

  dispose() {
    for (const m of [this.mPrep, this.mTrace, this.mDenoise, this.mTemporal, this.mDebug]) m?.dispose?.();
    this._disable();
  }
}

export default GTAO;
