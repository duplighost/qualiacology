// =============================================================================
// CINDERBLOOM — temporal antialiasing. Order 70.
// Owner: taa agent. Spec: docs/RENDER_PLAN.md §3. Contract: docs/CONTRACT.md §5.
// =============================================================================
//
// Halton(2,3) jitter (applied by renderer.js, gated on this pass existing),
// closest-depth velocity dilation, 5-tap Catmull-Rom history, YCoCg variance
// clipping, three independent disocclusion rejections (offscreen / depth /
// flag), tonemap-weighted accumulation, an isolated-firefly clamp, and a
// clamped unsharp pass to give back the softness Catmull-Rom costs.
//
// ## How it plugs into the frame graph
//
// The resolve reads `gbuf.sceneHDR` (viewmodel already composited at order 60)
// and writes the history ping-pong. The sharpen reads the history and writes
// `taaOut`. We then REASSIGN `gbuf.sceneHDR` to our output texture, so motion
// blur / DOF / bloom / grade — and renderer.js's fallback ACES blit — all pick
// up the resolved image with no change on their side. renderer.js rebuilds
// `gbuf.sceneHDR` from the MRT at the top of every frame, so this is a
// per-frame retarget, not a mutation that leaks.
//
// ## Why the viewmodel does not smear
//
// Three mechanisms, in increasing order of how much they actually matter:
//   1. weapons.js is asked (HANDOFF) to build viewmodel materials with
//      `enrichMaterial(m, { flags: CB_FLAG.VIEWMODEL, dynamic: true })` +
//      `mat.userData.cbOwner = mesh`, which gives the gun real per-frame
//      velocity in `gVel.rg`.
//   2. Viewmodel texels get a tight variance gamma (0.75). They USED to get an
//      alpha floor of 0.35 as well; that floor is gone (round 10) and the note
//      at the modulation site says why in full. The short version: the floor
//      meant the gun re-injected 35% of a half-pixel-jittered point sample
//      every frame, so the gun — 30% of the screen — was never antialiased at
//      all, and it was the brightest thing in the still-frame boil heatmap. The
//      clip-driven alpha term now does the same job (converge fast where
//      history is demonstrably wrong) without charging every gun pixel for it.
//   3. THE ACTUAL FIX: the history's `.a` channel carries the VIEWMODEL bit of
//      the frame that wrote it, as 0 or 1. A mismatch is a hard reject. The
//      gun/world boundary is exactly where that bit changes, so history is
//      thrown away exactly there and nowhere else. This works even if the
//      viewmodel writes zero velocity. (RENDER_PLAN §3.6.3 says to compare the
//      whole `gVel.b` byte; that rejects wherever ANY flag differs, including
//      the SKY bit along every horizon in the frame, which leaves every sky
//      silhouette aliased. Reasoning in full at the rejection site.)
//
// Because renderer.js linearises `gViewZ` BEFORE order 60 (see its DEVIATIONS),
// `gViewZ` does NOT contain the viewmodel — gun pixels hold the depth of the
// world behind them. So for texels flagged VIEWMODEL we skip the depth
// rejection entirely and skip the closest-depth velocity dilation (which would
// otherwise hand a gun pixel the world's velocity). Mechanism 3 covers it.
//
// ## Sky
//
// The sky dome currently does not write velocity (renderer.js DEVIATION 4 masks
// its draw buffers, so `gVel` keeps the cleared `(0,0,SKY,0)`), which would ghost
// the sky on every mouse move. Until Sky.js writes it (filed in HANDOFF), we
// synthesise a camera-rotation-only velocity analytically here for texels that
// carry the SKY flag AND have exactly zero stored velocity. The moment Sky.js
// writes a real vector the fallback stops firing on its own.
//
// ## Knobs — `ctx.debug.taa`, debug flags — `ctx.debug.flags`
//
//   ctx.debug.taa.alpha           feedback of the current frame  (preset default)
//   ctx.debug.taa.varianceGamma   clip box width in sigmas       (1.25)
//   ctx.debug.taa.gammaFoliage    ...for CB_FLAG.FOLIAGE texels  (1.85)
//   ctx.debug.taa.gammaViewmodel  ...for CB_FLAG.VIEWMODEL       (0.75)
//   ctx.debug.taa.sharpen         unsharp amount                 (preset default)
//   ctx.debug.taa.jitterScale     writes renderer.jitterScale    (1.0)
//   ctx.debug.taa.fireflyClamp    lone-pixel luma ratio, 0 = off (3.0)
//   ctx.debug.taa.skyVelocityFallback                            (true)
//   ctx.debug.taa.currentFilter   jitter-aware reconstruction of the current
//                                 sample, 0 = point sample (1.0)
//   ctx.debug.taa.clipAlphaGain   extra alpha where the clip had to drag
//                                 history, i.e. where history is wrong (0.35)
//   ctx.debug.taa.vmAlphaFloor    viewmodel alpha floor; WAS 0.35 and hard-
//                                 coded, is now 0.0 — see the note at the
//                                 modulation site (0.0)
//   ctx.debug.taa.filterSign      sign of the jitter in the reconstruction. +1 is
//                                 correct for renderer.js's `elements[8] +=
//                                 2j/res` convention and is verified by A/B in
//                                 HANDOFF; the knob exists because getting it
//                                 backwards makes the pass sharpen the jitter
//                                 instead of removing it, and that is a silent
//                                 failure worth being able to test for.  (1.0)
//
//   ctx.debug.flags.taa           false disables the pass AND the jitter
//   ctx.debug.flags.taaRejection  paint rejected texels red
//   ctx.debug.flags.taaNoSharpen  resolve only, skip the sharpen pass
//
// `__CB.toggle('taa')` flips the first one; we seed it `true` at init so the
// first toggle is the useful direction (off), for A/B against a jittered-but-
// unresolved frame... which we also avoid: disabling the pass sets
// `pass.enabled = false`, and renderer.js's `jitterEnabled` reads exactly that,
// so the A/B is honest — TAA off means no jitter either.
// =============================================================================

import * as THREE from 'three';
import { CB_FLAG } from '../renderer.js';

const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Per-preset shape of the resolve. Everything here is a compile-time #define so
// `low` genuinely does less work rather than branching around it.
//
// The sharpen defaults are MEASURED, not the 0.25 RENDER_PLAN §3.5 suggests.
// Sweeping the amount against two metrics on `ridge` and `establish` — the
// share of high-contrast silhouette columns that still hold an intermediate
// value (edge resolution) and the peak per-pixel step across the edge
// (acutance) — puts the knee at ~0.10:
//
//   amount   0     0.08   0.12   0.16   0.20   0.25
//   gradPct  63.1  63.4   51.6   49.2   49.6   51.3     (ridge)
//   acutance 137.8 145.8  146.2  151.3  151.6  152.2
//
// 0.08 buys essentially all of the crispness (+6% acutance) for none of the
// edge resolution; past 0.12 we trade 12 points of anti-aliasing for 4% more
// acutance, which is the wrong side of the trade when crawling edges are the
// #1 automatic failure in docs/CRITIC.md.
//
// `lumaFilter` (the isolated-firefly clamp) is ON AT EVERY PRESET, deliberately.
// It used to be a high/ultra feature, which had it exactly backwards: `low`
// drops the 3x3 neighbourhood box, so its clip window is the 5-tap cross only
// and a lone hot texel has FEWER things stopping it reaching history there than
// at ultra. The clamp reuses the four cross taps the resolve has already
// fetched — five dot products and a branch, no extra bandwidth — so "cheaper"
// was never the trade. CONTRACT §7: low must still be correct.
const PRESETS = {
  low:    { neighborBox: 0, closestDepth: 0, catmullRom: 0, lumaFilter: 1, sharpenTaps: 0, alpha: 0.12, sharpen: 0.00 },
  medium: { neighborBox: 0, closestDepth: 1, catmullRom: 1, lumaFilter: 1, sharpenTaps: 5, alpha: 0.10, sharpen: 0.08 },
  high:   { neighborBox: 1, closestDepth: 2, catmullRom: 1, lumaFilter: 1, sharpenTaps: 5, alpha: 0.08, sharpen: 0.10 },
  ultra:  { neighborBox: 1, closestDepth: 2, catmullRom: 1, lumaFilter: 1, sharpenTaps: 9, alpha: 0.06, sharpen: 0.12 },
};

const COMMON = /* glsl */`
float cbLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// YCoCg. Variance clipping in RGB shifts hue on saturated colour; on a
// magenta-and-amber planet that is visible, which is why the whole neighbourhood
// constraint lives in this space.
vec3 cbRGBToYCoCg(vec3 c) {
  return vec3( 0.25 * c.r + 0.5 * c.g + 0.25 * c.b,
               0.5  * c.r            - 0.5  * c.b,
              -0.25 * c.r + 0.5 * c.g - 0.25 * c.b );
}
vec3 cbYCoCgToRGB(vec3 c) {
  float t = c.x - c.z;
  return vec3( t + c.y, c.x + c.z, t - c.y );
}
`;

const RESOLVE_FRAG = /* glsl */`
precision highp float;
precision highp sampler2D;

in vec2 vUv;

uniform sampler2D tCur;
uniform sampler2D tHist;
uniform sampler2D tVel;
uniform sampler2D tViewZ;
uniform sampler2D tViewZPrev;

uniform vec2 uTexel;      // 1 / render resolution
uniform vec2 uRes;        // render resolution, px
uniform vec4 uParams;     // x alpha, y gamma, z firstFrame, w skyFallback
uniform vec4 uParams2;    // x gammaFoliage, y gammaViewmodel, z fireflyRatio, w debugRejection
uniform vec4 uParams3;    // y clipAlphaGain, z vmAlphaFloor  (x/w are CPU-side only)
uniform mat3 uFilt;       // 3x3 reconstruction kernel, [xOff+1][yOff+1], solved CPU-side
uniform vec2 uProjFxFy;   // projUnjit m00, m11 (symmetric frustum)
uniform mat3 uSkyRot;     // mat3(prevView) * mat3(camera.matrixWorld)
uniform mat4 uCamWorld;   // camera.matrixWorld  (== inverse view)
uniform mat4 uPrevView;
uniform float uDebugView;

layout(location = 0) out vec4 outColor;

__COMMON__

// Karis' 5-tap reduction of the 9-tap bicubic B-spline. Bilinear history
// sampling throws away roughly a third of the sharpness TAA exists to keep.
vec3 cbCatmullRom(sampler2D tex, vec2 uv, vec2 res) {
  vec2 samplePos = uv * res;
  vec2 texPos1 = floor(samplePos - 0.5) + 0.5;
  vec2 f = samplePos - texPos1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 off12 = w2 / w12;
  vec2 p0 = (texPos1 - 1.0) / res;
  vec2 p3 = (texPos1 + 2.0) / res;
  vec2 p12 = (texPos1 + off12) / res;
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  float w;
  w = w12.x * w0.y;  acc += textureLod(tex, vec2(p12.x, p0.y), 0.0).rgb  * w; wsum += w;
  w = w0.x  * w12.y; acc += textureLod(tex, vec2(p0.x,  p12.y), 0.0).rgb * w; wsum += w;
  w = w12.x * w12.y; acc += textureLod(tex, vec2(p12.x, p12.y), 0.0).rgb * w; wsum += w;
  w = w3.x  * w12.y; acc += textureLod(tex, vec2(p3.x,  p12.y), 0.0).rgb * w; wsum += w;
  w = w12.x * w3.y;  acc += textureLod(tex, vec2(p12.x, p3.y), 0.0).rgb  * w; wsum += w;
  return acc / max(wsum, 1e-5);
}

vec3 cbFetch(vec2 uv) { return max(textureLod(tCur, uv, 0.0).rgb, vec3(0.0)); }

// NB: the reconstruction weights are NOT computed here. They depend only on the
// jitter, which is one vec2 for the whole frame, so nine exp() per pixel — 18.6
// million transcendentals at 1080p — would be nine exp() per FRAME's worth of
// work done 2 million times over. They are solved on the CPU in _execute and
// arrive pre-normalised in the uFilt mat3, which leaves this a plain weighted sum
// of taps we already had: nine multiply-adds, no transcendental, no divide.

void main() {
  vec2 uv = vUv;
  vec3 cur = cbFetch(uv);

  vec4 velC = textureLod(tVel, uv, 0.0);
  int curFlags = int(velC.b + 0.5);
  bool isVM  = (curFlags & ${CB_FLAG.VIEWMODEL}) != 0;
  bool isSky = (curFlags & ${CB_FLAG.SKY}) != 0;

  float zc = textureLod(tViewZ, uv, 0.0).r;

  // -------------------------------------------------------------------------
  // velocity: closest-depth 3x3 dilation (Karis). Without it a one-pixel halo
  // of stale colour trails every silhouette.
  // -------------------------------------------------------------------------
  vec2 vel = velC.rg;
#if CB_CLOSEST_DEPTH > 0
  if (!isVM) {
    float bestZ = zc;
    vec2 bestOff = vec2(0.0);
    #if CB_CLOSEST_DEPTH == 2
      const int R = 1;
      for (int y = -R; y <= R; y++) {
        for (int x = -R; x <= R; x++) {
          vec2 o = vec2(float(x), float(y)) * uTexel;
          float z = textureLod(tViewZ, uv + o, 0.0).r;
          if (z < bestZ) { bestZ = z; bestOff = o; }
        }
      }
    #else
      vec2 o1 = vec2(uTexel.x, 0.0), o2 = vec2(0.0, uTexel.y);
      float z1 = textureLod(tViewZ, uv - o1, 0.0).r; if (z1 < bestZ) { bestZ = z1; bestOff = -o1; }
      float z2 = textureLod(tViewZ, uv + o1, 0.0).r; if (z2 < bestZ) { bestZ = z2; bestOff =  o1; }
      float z3 = textureLod(tViewZ, uv - o2, 0.0).r; if (z3 < bestZ) { bestZ = z3; bestOff = -o2; }
      float z4 = textureLod(tViewZ, uv + o2, 0.0).r; if (z4 < bestZ) { bestZ = z4; bestOff =  o2; }
    #endif
    if (bestOff != vec2(0.0)) {
      vec4 vs = textureLod(tVel, uv + bestOff, 0.0);
      // gViewZ has no viewmodel in it, so a gun texel looks like the world
      // behind it. Never let one donate its velocity to a world texel.
      if ((int(vs.b + 0.5) & ${CB_FLAG.VIEWMODEL}) == 0) vel = vs.rg;
    }
  }
#endif

  // Sky velocity fallback — camera rotation only, direction reprojected through
  // last frame's view rotation. Retires itself when Sky.js writes a real vector.
  vec2 ndc = uv * 2.0 - 1.0;
  if (isSky && uParams.w > 0.5 && dot(vel, vel) < 1e-12) {
    vec3 d = vec3(ndc.x / uProjFxFy.x, ndc.y / uProjFxFy.y, -1.0);
    vec3 pd = uSkyRot * d;
    if (-pd.z > 1e-5) {
      vec2 ndcPrev = vec2(uProjFxFy.x * pd.x, uProjFxFy.y * pd.y) / (-pd.z);
      vel = (ndc - ndcPrev) * 0.5;
    }
  }

  // -------------------------------------------------------------------------
  // current-frame neighbourhood moments, YCoCg
  // -------------------------------------------------------------------------
  vec3 nL = cbFetch(uv - vec2(uTexel.x, 0.0));
  vec3 nR = cbFetch(uv + vec2(uTexel.x, 0.0));
  vec3 nD = cbFetch(uv - vec2(0.0, uTexel.y));
  vec3 nU = cbFetch(uv + vec2(0.0, uTexel.y));

#if CB_LUMA_FILTER
  // Isolated-firefly clamp. A single pixel several times brighter than every
  // one of its neighbours is a sampling accident, not an image feature; letting
  // it into history makes it flicker for a dozen frames. Real highlights (sun,
  // muzzle flash) are never one pixel wide, so they survive untouched.
  if (uParams2.z > 0.5) {
    float lc = cbLuma(cur);
    float lmax = max(max(cbLuma(nL), cbLuma(nR)), max(cbLuma(nD), cbLuma(nU)));
    float lim = lmax * uParams2.z;
    if (lc > lim && lc > 1e-4) cur *= lim / lc;
  }
#endif

#if CB_NEIGHBOR_BOX
  vec3 d00 = cbFetch(uv + vec2(-uTexel.x, -uTexel.y));
  vec3 d20 = cbFetch(uv + vec2( uTexel.x, -uTexel.y));
  vec3 d02 = cbFetch(uv + vec2(-uTexel.x,  uTexel.y));
  vec3 d22 = cbFetch(uv + vec2( uTexel.x,  uTexel.y));
#endif

  // -------------------------------------------------------------------------
  // FILTERED CURRENT SAMPLE  (knob currentFilter, kernel in uFilt)
  //
  // THE SINGLE LARGEST AA DEFECT THIS PASS HAD, and it is a still-frame defect:
  // with the camera locked, the sim paused and nothing in the world moving,
  // 0.14-0.93% of the frame was swinging by more than 24/255 EVERY FRAME
  // (tools/_aaboil.mjs, tools/_aatemp.mjs). Turning this pass off dropped that
  // to 0.000%. TAA was not failing to remove the shimmer, TAA WAS THE SHIMMER.
  //
  // Cause: cur was POINT-sampled. The jitter moves the scene by up to half a
  // pixel each frame, so the point sample at a silhouette is a different scene
  // point every frame and swings by the whole local contrast. Blending 8% of a
  // signal that swings 255 puts ~20 levels of ripple into the output forever;
  // no value of alpha fixes it, which is exactly what the sweep showed
  // (alpha 0.08 -> 0.02 moved ridge's boiling fraction 0.138% -> 0.141%).
  //
  // Fix, and it is what every shipped TAA does: RECONSTRUCT the pixel-centre
  // value from the taps we have already fetched, weighting each by where its
  // sample actually landed. renderer.js shifts NDC by -2j/res, so the fragment
  // at texel centre c carries the scene point at c + jitter (pixels, y up, the
  // same handedness as uv). A tap at texel offset o therefore sampled the scene
  // at o + jitter away from c, and the reconstruction weight is a Gaussian of
  // that distance. exp(-2.29 d^2) is the usual Blackman-Harris-3.3 stand-in.
  //
  // The nine weights are solved once per FRAME on the CPU (_solveFilter), so
  // this costs NINE MULTIPLY-ADDS AND NO EXTRA BANDWIDTH — every tap is one the
  // clip box already needed. It is not a blur: with zero jitter the centre
  // weight is 1.0 and the ring weights are exp(-2.29) = 0.101, so it is the
  // reconstruction filter the renderer should always have had, and it converts
  // near-Nyquist content into a stable slightly-softened signal instead of
  // feeding history a new random draw of it every frame.
  //
  // The clip box below is deliberately built from the RAW taps, curRaw
  // included: the box exists to say what values are plausible in this
  // neighbourhood, and narrowing it with an already-smoothed centre would clip
  // valid history harder — the opposite of what this change is for.
  // uFilt is the 3x3 kernel, indexed uFilt[xOffset+1][yOffset+1]. It arrives
  // already normalised AND already blended with currentFilter, so this is the
  // whole of it: no branch, no divide, and currentFilter = 0 falls out as the
  // identity kernel with no special case in the shader.
  vec3 curRaw = cur;
  cur = cur  * uFilt[1][1]
      + nL   * uFilt[0][1] + nR * uFilt[2][1]
      + nD   * uFilt[1][0] + nU * uFilt[1][2];
#if CB_NEIGHBOR_BOX
  cur += d00 * uFilt[0][0] + d20 * uFilt[2][0]
       + d02 * uFilt[0][2] + d22 * uFilt[2][2];
#endif
  cur = max(cur, vec3(0.0));

  vec3 cY = cbRGBToYCoCg(curRaw);
  vec3 yL = cbRGBToYCoCg(nL), yR = cbRGBToYCoCg(nR);
  vec3 yD = cbRGBToYCoCg(nD), yU = cbRGBToYCoCg(nU);

  vec3 m1 = cY + yL + yR + yD + yU;
  vec3 m2 = cY * cY + yL * yL + yR * yR + yD * yD + yU * yU;

#if CB_NEIGHBOR_BOX
  vec3 y00 = cbRGBToYCoCg(d00);
  vec3 y20 = cbRGBToYCoCg(d20);
  vec3 y02 = cbRGBToYCoCg(d02);
  vec3 y22 = cbRGBToYCoCg(d22);
  vec3 m1b = (m1 + y00 + y20 + y02 + y22) / 9.0;
  vec3 m2b = (m2 + y00 * y00 + y20 * y20 + y02 * y02 + y22 * y22) / 9.0;
  // Karis "rounded" variant: the pure 3x3 box is too permissive at corners.
  m1 = mix(m1b, m1 / 5.0, 0.5);
  m2 = mix(m2b, m2 / 5.0, 0.5);
#else
  m1 /= 5.0;
  m2 /= 5.0;
#endif

  vec3 sigma = sqrt(max(vec3(0.0), m2 - m1 * m1));

  // -------------------------------------------------------------------------
  // history fetch + the three rejections
  // -------------------------------------------------------------------------
  vec2 prevUv = uv - vel;
  float reject = 0.0;

  // 1. offscreen
  if (prevUv.x < 0.0 || prevUv.y < 0.0 || prevUv.x > 1.0 || prevUv.y > 1.0) reject = 1.0;

  vec4 histRaw = textureLod(tHist, clamp(prevUv, vec2(0.0), vec2(1.0)), 0.0);

  // 3. viewmodel-boundary mismatch — this is what actually kills gun ghosting.
  //    History .a stores ONLY the viewmodel bit (0 or 1), not the whole gVel.b
  //    byte, and this is a deliberate deviation from RENDER_PLAN §3.6.3.
  //    Comparing the whole byte rejects wherever ANY flag differs, and the SKY
  //    bit differs across every sky silhouette in the frame. Jitter flips
  //    coverage on those boundary texels every frame, so a whole-byte test
  //    throws away history on exactly the pixels TAA exists to resolve and
  //    every horizon edge stays a staircase. The other bits are only ever read
  //    from the CURRENT frame (they pick gamma and the alpha floor), so nothing
  //    needs them in history. Bilinear on a 0/1 channel also gives a soft
  //    partial-coverage boundary instead of a hard byte compare.
  if (abs(histRaw.a - (isVM ? 1.0 : 0.0)) > 0.5) reject = 1.0;

  // 2. depth mismatch: reproject this pixel's world position through last
  //    frame's view and compare against what last frame actually recorded.
  //    Skipped for sky (numerically hopeless at 1e6 m) and for the viewmodel
  //    (gViewZ predates order 60, so gun texels hold world depth).
  //    The comparison is the BEST of a 5-tap cross around prevUv, not the single
  //    texel. That matters more than it looks: jitter moves geometry by up to
  //    half a pixel every frame, so a silhouette texel flips between near and
  //    far depth frame to frame. A single-texel test then rejects history along
  //    every silhouette in the frame — i.e. exactly where TAA is supposed to be
  //    doing its work — and edges stay aliased. A real disocclusion has no
  //    matching depth anywhere nearby, so the cross still catches it.
  if (reject < 0.5 && !isSky && !isVM && zc < 1.0e5) {
    vec3 vpos = vec3(ndc.x / uProjFxFy.x, ndc.y / uProjFxFy.y, -1.0) * zc;
    vec4 wpos = uCamWorld * vec4(vpos, 1.0);
    float zExp = -(uPrevView * wpos).z;
    vec2 pu = clamp(prevUv, vec2(0.0), vec2(1.0));
    float dz = abs(zExp - textureLod(tViewZPrev, pu, 0.0).r);
    dz = min(dz, abs(zExp - textureLod(tViewZPrev, pu + vec2(uTexel.x, 0.0), 0.0).r));
    dz = min(dz, abs(zExp - textureLod(tViewZPrev, pu - vec2(uTexel.x, 0.0), 0.0).r));
    dz = min(dz, abs(zExp - textureLod(tViewZPrev, pu + vec2(0.0, uTexel.y), 0.0).r));
    dz = min(dz, abs(zExp - textureLod(tViewZPrev, pu - vec2(0.0, uTexel.y), 0.0).r));
    if (dz > 0.02 * abs(zExp) + 0.05) reject = 1.0;
  }

#if CB_CATMULL_ROM
  vec3 hist = max(cbCatmullRom(tHist, clamp(prevUv, vec2(0.0), vec2(1.0)), uRes), vec3(0.0));
#else
  vec3 hist = max(histRaw.rgb, vec3(0.0));
#endif

  vec3 histDbg = hist;
  // A NaN/Inf that reaches history never leaves it. Cheap insurance.
  float hs = dot(hist, hist);
  if (!(hs >= 0.0) || hs > 1.0e18) { hist = cur; reject = 1.0; }
  if (uParams.z > 0.5) { hist = cur; reject = 1.0; }

  // -------------------------------------------------------------------------
  // alpha + gamma modulation
  // -------------------------------------------------------------------------
  float velPx = length(vel * uRes);
  float alpha = uParams.x;
  float gamma = uParams.y;

  if ((curFlags & ${CB_FLAG.FOLIAGE}) != 0) gamma = uParams2.x;   // thin geometry undersamples
  // VIEWMODEL: gamma only. The 0.35 alpha FLOOR that used to live here is gone
  // and its removal is measured, not assumed. The gun is 30% of the screen and
  // it was the single brightest thing in the still-frame boil heatmap — every
  // edge of the receiver swinging every frame with the camera locked, because
  // alpha 0.35 means 35% of a half-pixel-jittered point sample is injected
  // fresh each frame and the gun is, by construction, never resolved. The floor
  // existed as insurance against a viewmodel that wrote no velocity; weapons.js
  // has written real per-frame velocity since round 4 (enrichMaterial with
  // dynamic:true, plus cbOwner), the .a-bit boundary reject below is what
  // actually stops ghosting, and the clip-driven term further down reacts to a
  // WRONG history in three frames wherever one does occur — which is strictly
  // better than paying for it on every gun pixel in every frame forever.
  if (isVM) { gamma = uParams2.y; alpha = max(alpha, uParams3.z); }
  if ((curFlags & ${CB_FLAG.NO_MOTION_BLUR}) != 0) alpha = max(alpha, 0.6);  // muzzle flash etc.

  // Under motion the eye cannot resolve detail; converge faster and clip harder.
  float fast = clamp((velPx - 6.0) / 24.0, 0.0, 1.0);
  gamma = mix(gamma, 0.90, fast);
  alpha = mix(alpha, 0.30, fast);

  // -------------------------------------------------------------------------
  // variance clip: move history along the segment toward m1, do NOT clamp
  // per channel (that shifts hue).
  // -------------------------------------------------------------------------
  vec3 ext = gamma * sigma;
  vec3 hY = cbRGBToYCoCg(hist);
  vec3 dY = hY - m1;
  vec3 t = abs(dY) / max(ext, vec3(1e-5));
  float mt = max(t.x, max(t.y, t.z));
  if (mt > 1.0) hY = m1 + dY / mt;
  hist = max(cbYCoCgToRGB(hY), vec3(0.0));

  // How far the clip had to drag history to make it plausible IS the confidence
  // signal, and it is free — we already computed it. A pixel whose history sits
  // inside the neighbourhood box is trustworthy and should keep accumulating at
  // the preset alpha; one that had to be dragged is stale (a wrong velocity, a
  // sub-pixel disocclusion the depth test did not catch, a gun swing weapons.js
  // did not report) and should converge in a few frames instead of a dozen.
  // This is what replaces the VIEWMODEL alpha floor (the NO_MOTION_BLUR one
  // above stays: a muzzle flash is a genuinely new signal every frame, not a
  // history that happens to be wrong). It costs nothing, it
  // fires only where history is actually wrong, and unlike a floor it does not
  // penalise a still frame — which is the case the still-boil metric measures
  // and the case a critic's screenshot is.
  alpha = max(alpha, uParams3.y * clamp(1.0 - 1.0 / max(mt, 1.0), 0.0, 1.0));
  alpha = mix(alpha, 1.0, reject);

  // -------------------------------------------------------------------------
  // tonemap-weighted accumulation (Karis) — one firefly cannot dominate.
  // -------------------------------------------------------------------------
  float wc = 1.0 / (1.0 + cbLuma(cur));
  float wh = 1.0 / (1.0 + cbLuma(hist));
  float a = alpha;
  vec3 res = (cur * wc * a + hist * wh * (1.0 - a)) / max(1e-5, wc * a + wh * (1.0 - a));
  res = max(res, vec3(0.0));

  if (uParams2.w > 0.5 && reject > 0.5) res = mix(res, vec3(4.0, 0.0, 0.0), 0.85);

  // Intermediate views, set ctx.debug.flags.taaDebugView = N. Everything except
  // 4 is a function of the current frame only, so feeding it back into history
  // is harmless; 4 is self-referential and is only honest for one frame after a
  // reset. 8/9 are the ones to reach for first when a frame goes wrong: they
  // catch a bad texel size (the single most destructive failure this pass can
  // have — see the gbuf.width note in _execute) before you debug anything else.
  //   1 rejection tint  2 current  3 neighbourhood mean  4 raw history
  //   5 velocity x200   6 sigma x4 7 reject mask         8 linear view depth
  //   9 flag bits      10 uTexel x1000  11 uRes x0.0005
  if (uDebugView > 0.5) {
    int dv = int(uDebugView + 0.5);
    if (dv == 2)       res = cur;
    else if (dv == 3)  res = cbYCoCgToRGB(m1);
    else if (dv == 4)  res = histDbg;
    else if (dv == 5)  res = vec3(abs(vel) * 200.0, 0.0);
    else if (dv == 6)  res = cbYCoCgToRGB(sigma) * 4.0;
    else if (dv == 7)  res = vec3(reject);
    else if (dv == 8)  res = vec3(zc * 0.002);
    else if (dv == 9)  res = vec3(float(curFlags) * 0.125);
    else if (dv == 10) res = vec3(uTexel * 1000.0, 0.0);
    else if (dv == 11) res = vec3(uRes * 0.0005, 0.0);
  }

  // .a carries this frame's viewmodel bit forward — the gun anti-ghost.
  outColor = vec4(res, isVM ? 1.0 : 0.0);
}
`;

const SHARPEN_FRAG = /* glsl */`
precision highp float;
precision highp sampler2D;

in vec2 vUv;
uniform sampler2D tSrc;
uniform sampler2D tVel;
uniform vec2 uTexel;
uniform vec2 uRes;
uniform float uAmount;
layout(location = 0) out vec4 outColor;

__COMMON__

vec3 cbT(vec2 uv) { return max(textureLod(tSrc, uv, 0.0).rgb, vec3(0.0)); }

void main() {
  vec2 uv = vUv;
  vec3 e = cbT(uv);
  vec3 l = cbT(uv - vec2(uTexel.x, 0.0));
  vec3 r = cbT(uv + vec2(uTexel.x, 0.0));
  vec3 d = cbT(uv - vec2(0.0, uTexel.y));
  vec3 u = cbT(uv + vec2(0.0, uTexel.y));

  // Sharpening a smear is how you get a crunchy smear. Fade it out with speed.
  vec2 vel = textureLod(tVel, uv, 0.0).rg * uRes;
  float amt = uAmount * (1.0 - clamp(length(vel) / 20.0, 0.0, 1.0));

#if CB_SHARPEN_TAPS == 9
  vec3 q0 = cbT(uv + vec2(-uTexel.x, -uTexel.y));
  vec3 q1 = cbT(uv + vec2( uTexel.x, -uTexel.y));
  vec3 q2 = cbT(uv + vec2(-uTexel.x,  uTexel.y));
  vec3 q3 = cbT(uv + vec2( uTexel.x,  uTexel.y));
  // isotropic ring: cross weighted 2, diagonals 1 -> less axis-aligned haloing
  vec3 ring = ((l + r + d + u) * 2.0 + (q0 + q1 + q2 + q3)) / 12.0;
  vec3 m1 = (e + l + r + d + u + q0 + q1 + q2 + q3) / 9.0;
  vec3 m2 = (e*e + l*l + r*r + d*d + u*u + q0*q0 + q1*q1 + q2*q2 + q3*q3) / 9.0;
#else
  vec3 ring = (l + r + d + u) * 0.25;
  vec3 m1 = (e + l + r + d + u) / 5.0;
  vec3 m2 = (e*e + l*l + r*r + d*d + u*u) / 5.0;
#endif

  vec3 s = e + (e - ring) * amt;
  // Clamp into the local variance box so the unsharp cannot ring into a halo.
  vec3 sg = sqrt(max(vec3(0.0), m2 - m1 * m1));
  s = clamp(s, m1 - 1.25 * sg, m1 + 1.25 * sg);
  s = max(s, vec3(0.0));

  outColor = vec4(s, 1.0);
}
`;

// -----------------------------------------------------------------------------

export class TAA {
  static id = 'taa';
  static deps = ['renderer'];

  constructor(ctx) {
    this.ctx = ctx;
    this.pass = null;
    this.renderer = null;
    this._resolve = null;
    this._sharpen = null;
    this._shape = null;
    this._needsReset = true;
    this._failed = false;

    // knobs (RENDER_PLAN §3.7)
    this.knobs = {
      alpha: 0.08,
      varianceGamma: 1.25,
      gammaFoliage: 1.85,
      gammaViewmodel: 0.75,
      sharpen: 0.10,
      jitterScale: 1.0,
      fireflyClamp: 3.0,
      skyVelocityFallback: true,
      currentFilter: 1.0,
      clipAlphaGain: 0.35,
      vmAlphaFloor: 0.0,
      filterSign: 1.0,
    };

    this._skyRot = new THREE.Matrix3();
    this._skyRotM4 = new THREE.Matrix4();
  }

  async init() {
    const { ctx } = this;
    try {
      this.renderer = ctx.sys.renderer;
      if (!this.renderer) throw new Error('renderer system missing');

      ctx.debug.taa = this.knobs;
      if (ctx.debug.flags.taa === undefined) ctx.debug.flags.taa = true;

      this._buildMaterials();

      this.pass = ctx.frameGraph.register({
        id: 'taa',
        order: 70,
        inputs: ['viewZ', 'viewZPrev'],
        outputs: ['taa'],
        enabled: this._wantEnabled(),
        execute: (target, gbuf, c) => this._execute(gbuf, c),
        reset: () => this.reset(),
      });

      ctx.bus.on('debugFlag', ({ flag }) => {
        if (flag === 'taa' || flag === 'taaRejection' || flag === 'taaNoSharpen') {
          this._syncEnabled();
          this.reset();
        }
      });
      ctx.bus.on('quality', () => this.onQuality());
      ctx.bus.on('rtResize', () => this.reset());
    } catch (e) {
      this._fail(e, 'init');
    }
  }

  // ---------------------------------------------------------------------------

  /** RENDER_PLAN §13 — every temporal pass exposes this; renderer.resetTemporal
   *  and __CB.gotoVista call it. Safe to call at any time. */
  resetTemporal() { this.reset(); }
  reset() { this._needsReset = true; }

  onQuality() {
    if (this._failed) return;
    try {
      this._buildMaterials();
      this._syncEnabled();
      this.reset();
    } catch (e) { this._fail(e, 'onQuality'); }
  }

  _wantEnabled() {
    const { ctx } = this;
    if (this._failed) return false;
    if (!ctx.quality.taa) return false;
    return ctx.debug.flags.taa !== false;
  }

  _syncEnabled() {
    if (!this.pass) return;
    const want = this._wantEnabled();
    if (this.pass.enabled !== want) {
      this.pass.enabled = want;
      // renderer.jitterEnabled reads pass.enabled, and _needs() is cached.
      this.ctx.frameGraph.invalidate?.();
    }
  }

  /**
   * Any failure degrades to a passthrough: the pass is disabled, which also
   * turns renderer.js's jitter off (it gates on an enabled 'taa' pass), so the
   * frame falls back to a clean un-jittered un-resolved image rather than a
   * jittered-but-unresolved wobble or a black screen.
   */
  _fail(e, where) {
    if (this._failed) return;
    this._failed = true;
    if (this.pass) { this.pass.enabled = false; this.ctx.frameGraph?.invalidate?.(); }
    console.error(`[taa] disabled after failure in ${where}:`, e && (e.stack || e.message) || e);
  }

  _shapeFor(preset) {
    return PRESETS[preset] || PRESETS.high;
  }

  /**
   * Solve the 3x3 reconstruction kernel for THIS frame's jitter.
   *
   * renderer.js jitters by `projection.elements[8] += 2*jx/width`, which shifts
   * NDC x by -2*jx/width, i.e. moves the scene LEFT by jx pixels. So the
   * fragment at texel centre `c` is showing the scene point that sits at
   * `c + jitter` in the unjittered image, and a tap at texel offset `o` sampled
   * the scene `o + jitter` away from this pixel's centre. Its reconstruction
   * weight is therefore a filter kernel evaluated at |o + jitter|.
   *
   * exp(-2.29 d^2) is the standard Gaussian stand-in for Blackman-Harris 3.3:
   * 1.0 at the centre, 0.101 at d = 1, 0.006 at d = 1.5. With zero jitter this
   * returns a near-identity kernel, so a frame rendered without jitter is not
   * blurred by a filter that has nothing to correct.
   *
   * Solved here rather than in the shader because it is ONE vec2 for the whole
   * frame: nine exp() per pixel would be 18.6 M transcendentals at 1080p to
   * recompute nine numbers two million times.
   *
   * `currentFilter` is folded in as a lerp toward the identity kernel, which is
   * algebraically the same as mixing the filtered and point-sampled colours but
   * costs the shader nothing.
   *
   * `ctx.matrices.jitter` is already scaled by jitterScale and is zeroed when
   * the jitter is off, so both of those cases handle themselves.
   */
  _solveFilter(jitter, out) {
    const k = this.knobs;
    const s = k.filterSign >= 0 ? 1 : -1;
    const jx = jitter.x * s, jy = jitter.y * s;
    const box = this._shape && this._shape.neighborBox;
    const e = out.elements;                       // column-major: e[i*3+j]
    let sum = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const ox = i - 1, oy = j - 1;
        // The corner taps do not exist in the 5-tap (low/medium) shader, so
        // they must not be given weight there or the kernel loses energy.
        const live = box || ox === 0 || oy === 0;
        const dx = ox + jx, dy = oy + jy;
        const w = live ? Math.exp(-2.29 * (dx * dx + dy * dy)) : 0;
        e[i * 3 + j] = w;
        sum += w;
      }
    }
    const inv = 1 / Math.max(sum, 1e-5);
    const f = Math.min(1, Math.max(0, k.currentFilter));
    for (let n = 0; n < 9; n++) e[n] *= inv * f;
    e[4] += 1 - f;                                // centre tap: lerp to identity
  }

  _buildMaterials() {
    const preset = this.ctx.quality.preset || 'high';
    const shape = this._shapeFor(preset);
    if (this._shape &&
        this._shape.neighborBox === shape.neighborBox &&
        this._shape.closestDepth === shape.closestDepth &&
        this._shape.catmullRom === shape.catmullRom &&
        this._shape.lumaFilter === shape.lumaFilter &&
        this._shape.sharpenTaps === shape.sharpenTaps) {
      this._applyPresetDefaults(shape);
      return;
    }
    this._shape = shape;
    this._applyPresetDefaults(shape);

    this._resolve?.dispose();
    this._sharpen?.dispose();

    const defs =
      `#define CB_NEIGHBOR_BOX ${shape.neighborBox}\n` +
      `#define CB_CLOSEST_DEPTH ${shape.closestDepth}\n` +
      `#define CB_CATMULL_ROM ${shape.catmullRom}\n` +
      `#define CB_LUMA_FILTER ${shape.lumaFilter}\n`;

    this._resolve = new THREE.RawShaderMaterial({
      // three prepends `#version 300 es` itself — writing it here is a link
      // error and every draw silently no-ops (HANDOFF trap 1).
      glslVersion: THREE.GLSL3,
      vertexShader: FS_VERT,
      fragmentShader: defs + RESOLVE_FRAG.replace('__COMMON__', COMMON),
      depthTest: false, depthWrite: false,
      uniforms: {
        tCur: { value: null }, tHist: { value: null }, tVel: { value: null },
        tViewZ: { value: null }, tViewZPrev: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uRes: { value: new THREE.Vector2() },
        uParams: { value: new THREE.Vector4(0.08, 1.25, 1, 1) },
        uParams2: { value: new THREE.Vector4(1.85, 0.75, 3.0, 0) },
        uParams3: { value: new THREE.Vector4(1.0, 0.35, 0.0, 1.0) },
        uFilt: { value: new THREE.Matrix3() },
        uProjFxFy: { value: new THREE.Vector2(1, 1) },
        uSkyRot: { value: new THREE.Matrix3() },
        uCamWorld: { value: new THREE.Matrix4() },
        uPrevView: { value: new THREE.Matrix4() },
        uDebugView: { value: 0 },
      },
    });

    this._sharpen = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FS_VERT,
      fragmentShader: `#define CB_SHARPEN_TAPS ${shape.sharpenTaps || 5}\n` +
                      SHARPEN_FRAG.replace('__COMMON__', COMMON),
      depthTest: false, depthWrite: false,
      uniforms: {
        tSrc: { value: null }, tVel: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uRes: { value: new THREE.Vector2() },
        uAmount: { value: 0.25 },
      },
    });
  }

  /**
   * Apply this preset's defaults, but do not stomp a knob the user has hand
   * tuned: we only overwrite a value that still equals what the last preset
   * put there. `ctx.debug.taa.alpha = 0.2` therefore survives a quality change.
   */
  _applyPresetDefaults(shape) {
    const k = this.knobs;
    const last = this._presetDefaults || {};
    const keep = (name, val) => {
      if (last[name] === undefined || k[name] === last[name]) k[name] = val;
    };
    const ff = shape.lumaFilter ? 3.0 : 0.0;
    keep('alpha', shape.alpha);
    keep('sharpen', shape.sharpen);
    keep('fireflyClamp', ff);
    // Record what the PRESET wanted, not what the knob ended up as, so a value
    // the user overrode stays overridden across further quality changes.
    this._presetDefaults = { alpha: shape.alpha, sharpen: shape.sharpen, fireflyClamp: ff };
  }

  // ---------------------------------------------------------------------------

  _execute(gbuf, ctx) {
    if (this._failed) return;
    try {
      this._syncEnabled();
      if (this.pass.enabled === false) return;

      const R = this.renderer;
      const sceneHDR = gbuf.sceneHDR;
      const vel = gbuf.gVel;
      const viewZ = gbuf.gViewZ;
      const viewZPrev = gbuf.gViewZPrev || gbuf.gViewZ;
      // Missing an input means the resource was not built this frame (the pass
      // was just re-enabled, or renderer.js changed shape). Passthrough for one
      // frame and re-seed history rather than resolving against garbage.
      if (!sceneHDR || !vel || !viewZ) { this._needsReset = true; return; }

      R.jitterScale = this.knobs.jitterScale;

      // NB: do NOT use gbuf.width / gbuf.height. They are stale at 1 in the
      // current renderer.js — main.js calls ctx.setSize() (which reaches
      // Renderer.resize -> _allocate and builds the MRT) BEFORE initAll(), so
      // by the time init() creates _gbufObj and calls _allocate again, the
      // `this.mrt && size unchanged` early-out fires and g.width/g.height/
      // g.texel/g.halfTexel/g.tilesW/g.tilesH keep their placeholder value of 1.
      // A one-texel neighbourhood then becomes a whole-screen neighbourhood and
      // TAA turns the frame into smeared soup. Filed in HANDOFF; every post pass
      // will hit this. renderer.width/height are the authoritative numbers.
      const w = R.width || gbuf.width, h = R.height || gbuf.height;
      const hist = R.pingpong('taaHist', {
        type: THREE.HalfFloatType, format: THREE.RGBAFormat, filter: THREE.LinearFilter,
      });

      const first = (this._needsReset || gbuf.firstFrame) ? 1 : 0;

      const u = this._resolve.uniforms;
      u.tCur.value = sceneHDR;
      u.tHist.value = hist.read.texture;
      u.tVel.value = vel;
      u.tViewZ.value = viewZ;
      u.tViewZPrev.value = viewZPrev;
      u.uTexel.value.set(1 / w, 1 / h);
      u.uRes.value.set(w, h);
      u.uParams.value.set(
        THREE.MathUtils.clamp(this.knobs.alpha, 0.01, 1.0),
        Math.max(0.05, this.knobs.varianceGamma),
        first,
        this.knobs.skyVelocityFallback ? 1 : 0,
      );
      u.uParams2.value.set(
        Math.max(0.05, this.knobs.gammaFoliage),
        Math.max(0.05, this.knobs.gammaViewmodel),
        Math.max(0, this.knobs.fireflyClamp),
        ctx.debug.flags.taaRejection ? 1 : 0,
      );

      u.uParams3.value.set(
        THREE.MathUtils.clamp(this.knobs.currentFilter, 0, 1),
        Math.max(0, this.knobs.clipAlphaGain),
        THREE.MathUtils.clamp(this.knobs.vmAlphaFloor, 0, 1),
        this.knobs.filterSign,
      );

      u.uDebugView.value = ctx.debug.flags.taaDebugView | 0;

      const m = ctx.matrices;
      this._solveFilter(m.jitter, u.uFilt.value);
      u.uProjFxFy.value.set(m.projUnjit.elements[0], m.projUnjit.elements[5]);
      u.uCamWorld.value.copy(ctx.camera.matrixWorld);
      u.uPrevView.value.copy(m.prevView);
      // mat3(prevView) * mat3(camera.matrixWorld): world direction -> previous
      // view space, translation-free. Both are rigid, so the 3x3 product is the
      // rotation composition.
      this._skyRotM4.multiplyMatrices(m.prevView, ctx.camera.matrixWorld);
      this._skyRot.setFromMatrix4(this._skyRotM4);
      u.uSkyRot.value.copy(this._skyRot);

      R.fullscreen(this._resolve, hist.write);
      hist.swap();                      // read == what we just wrote
      const resolved = hist.read;

      this._needsReset = false;

      const amount = ctx.debug.flags.taaNoSharpen ? 0 : this.knobs.sharpen;
      if (!(amount > 0.001) || !this._shape.sharpenTaps) {
        gbuf.sceneHDR = resolved.texture;
        gbuf.taa = resolved.texture;
        return;
      }

      const out = R.rt('taaOut', {
        type: THREE.HalfFloatType, format: THREE.RGBAFormat, filter: THREE.LinearFilter,
      });
      const s = this._sharpen.uniforms;
      s.tSrc.value = resolved.texture;
      s.tVel.value = vel;
      s.uTexel.value.set(1 / w, 1 / h);
      s.uRes.value.set(w, h);
      s.uAmount.value = amount;
      R.fullscreen(this._sharpen, out);

      gbuf.sceneHDR = out.texture;
      gbuf.taa = out.texture;
    } catch (e) {
      this._fail(e, 'execute');
    }
  }

  debugInfo() {
    return {
      enabled: this.pass ? this.pass.enabled !== false : false,
      failed: this._failed,
      preset: this.ctx.quality.preset,
      shape: this._shape,
      knobs: { ...this.knobs },
    };
  }

  dispose() {
    this._resolve?.dispose();
    this._sharpen?.dispose();
    this.ctx.frameGraph?.unregister?.('taa');
  }
}

export default TAA;
