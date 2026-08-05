// =============================================================================
// CINDERBLOOM — bokeh depth of field.   Owner: dof agent.  Frame graph order 90.
// Spec: docs/RENDER_PLAN.md §8.  Contract: docs/CONTRACT.md §4/§5.
// =============================================================================
//
// Pipeline (6 draws at `high`):
//
//   1  prefilter   half res   sceneHDR 2x2 box + signed CoC (thin lens) -> RGBA16F
//   2  tile max    1/20 res   per 20x20 full-res tile: max far CoC, min near CoC
//   3  tile dilate 1/20 res   3x3 neighbour max  -- THE HALO FIX (§8.2)
//   4  gather      half res   one ring loop, MRT: farColor + nearColor
//   5  feather     half res   near coverage dilate + blur (soft near silhouette)
//   6  composite   full res   sharp <- far <- near, writes `g.sceneHDR`
//
// ## The one invariant this pass must not break
//
// Step 4 early-outs on a TILE quantity (`radius`, 20 full-res px granularity).
// Every weight it gates must therefore be exactly zero at that radius, or the
// branch itself becomes visible as an axis-aligned 20 px staircase across the
// frame. `p.tileMinRadius` (half-res px) is the single source of truth: the
// near coverage fades in over [tileMinRadius, +nearOnsetWidth] on a PER-PIXEL
// peak CoC, and the far ramp is floored at tileMinRadius*2 full-res px. This
// shipped broken once and it read as "dark horizontal bands at 46% and 55% of
// frame height"; do not re-author either ramp independently of the branch.
//
// ## How this pass hands its result on
//
// `renderer.js` has no explicit colour chain: `g.sceneHDR` is re-pointed at
// `mrt.texture[0]` at the top of every `renderFrame()`, and the grade/blit reads
// whatever `g.sceneHDR` holds at the end. So a colour-transforming pass renders
// into its own pooled target and re-points `g.sceneHDR` (and the `g.color`
// alias) at it. Passes therefore compose by `order` with no wiring. Motion blur
// (80) and bloom (100) should do exactly the same thing. If your pass leaves
// `g.sceneHDR` alone, you are a no-op, which is the correct failure mode.
//
// ## Focus
//
// This file never reads `ctx.sys.weapons`. Weapons (or the director) call
// `ctx.sys.dof.setFocus(distance_m, fStop, ms)` or `setAiming(bool)`, or emit
// one of the bus events wired in `_wireBus()`. Default state is a near-
// hyperfocal hipfire lens: sharp from ~5 m to infinity, gentle near-field
// softening under 4 m. ADS pulls the world focus out to 26 m so the mid-ground
// goes soft while the target stays sharp, and the viewmodel is focused on its
// own separate plane so the gun stays sharp at the same time.
// Two focus planes is not a lens; it is what every shipped FPS does, and the
// alternative (one plane at the iron sight, as RENDER_PLAN §8.4's table asks
// for) puts the entire world past the CoC clamp and looks like a bug.
//
// ## THE FOCAL LENGTH IS PER STATE, AND THAT IS WHY ADS HAS A FAR FIELD AT ALL
//
// A blind critic on the review set: "in the shot named for DOF SEPARATION the far
// field has ZERO BLUR -- distant trunks and terrain are as sharp as the weapon,
// while the near boulder IS blurred. Near CoC works; FAR CoC IS NOT BEING
// APPLIED." That was true, it was not a shader bug, and no amount of staring at
// the gather finds it. It is one line of arithmetic in the LENS.
//
// The far field of a thin lens saturates. As z -> infinity,
//
//     CoC_inf(px) = f^2 / (N * (zf - f))  /  sensorH * H
//
// At the shipped ADS lens (f = 40 mm, N = 2.0, zf = 26 m, 24 mm sensor, 1080 px)
// that is 1.386 px, and it is a CEILING: nothing in the world, at any distance,
// can be blurrier than that. Measured down the ladder: 50 m 0.67 px, 120 m 1.09,
// 400 m 1.30, infinity 1.39. The composite's far ramp starts at 2.0 full-res px
// and the gather early-outs below the same 2.0 px, so every one of those samples
// was computed correctly and then discarded by both gates. Hipfire (40 mm f/3.5
// at 12 m) tops out at 1.72 px and the review set's landscape default (f/5.6 at
// 26 m) at 0.49 px -- i.e. NO vista in the build had ever had a far field.
//
// Lowering the gates is the wrong fix: they are pinned to the gather's early-out
// branch for the anti-staircase invariant above, and 1.4 px of blur is not
// separation, it is a soft filter.
//
// The right fix is that ADS is not the same lens. Aiming down a sight magnifies:
// the ADS camera really is a longer focal length, and every real marksman optic
// is. So `hipfire.focal` / `ads.focal` are separate knobs and the world focal
// length springs between them with the focus pull. At 85 mm f/2.0 focused at
// 26 m the same ladder reads 38 m 2.0 px (the ramp's foot), 72 m 4.0 px (fully
// applied), infinity 6.3 px -- the target stays sharp, the mid-ground softens,
// the far field separates. Nothing else in the pass changed.
//
// The VIEWMODEL keeps its own focal length (`viewmodelFocalLength`, 40 mm) and
// does not follow the world's. It is composited on its own plane against its own
// depth; letting the ADS magnification into it would blur the gun at exactly the
// moment the player is looking down it.
//
// ## Debug
//
//   __CB.toggle('dof')            -- A/B the whole pass (defaults on)
//   __CB.toggle('dofCoC')         -- false-colour the CoC field
//   ctx.debug.dof                 -- live knob object, see `this.p`
//   ctx.sys.dof.debugInfo()
// =============================================================================

import * as THREE from 'three';
import { Spring, clamp, TAU } from '../../util/math.js';
import { CB_FLAG } from '../renderer.js';

// three prepends `#version 300 es` for GLSL3 RawShaderMaterial (HANDOFF trap 1).
const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Shared CoC evaluation. Signed: <0 near field (in front of focus), >0 far.
// Result is in FULL-RES pixels. RENDER_PLAN §8.1.
const COC_CHUNK = /* glsl */`
#define SAT(x) clamp(x, 0.0, 1.0)
#define CB_FLAG_VIEWMODEL ${CB_FLAG.VIEWMODEL}.0
const float CB_PI = 3.141592653589793;
const float CB_TAU = 6.283185307179586;

uniform sampler2D tViewZ;
uniform sampler2D tVel;
uniform sampler2D tDepthVM;
uniform vec4 uLens;     // focal mm, f-stop, focus distance m, (unused)
uniform vec4 uVmLens;   // viewmodel: focal mm, f-stop, focus distance m, CoC scale
uniform vec4 uVm;       // viewmodel depth remap base m, scale, viewCam near, far
uniform vec4 uClamp;    // px, full res: world near, world far, viewmodel near, viewmodel far
uniform vec2 uSensor;   // sensor height mm, render height px
uniform float uHasVM;

float cbThinLens(float z, float f, float N, float zf) {
  float A = f / max(N, 0.05);
  float zmm  = max(z, 1.0e-4) * 1000.0;
  float zfmm = max(zf, 1.0e-3) * 1000.0;
  float cocmm = (A * f * (zmm - zfmm)) / (zmm * max(zfmm - f, 1.0));
  return (cocmm / uSensor.x) * uSensor.y;
}

// The near clamp is deliberately MUCH tighter than the far clamp. Physically a
// 40 mm lens focused at 12 m turns the ground two metres in front of the player
// into mush, and a player looks at close things constantly -- every shipped FPS
// dials the world's near field down hard. The far field has no such problem, so
// it keeps the full RENDER_PLAN §8.1 budget.
/**
 * 1.0 where this texel belongs to the viewmodel. The flag rides in gVel.b and
 * the renderer swaps the viewmodel camera's matrices in for the order-60 draw,
 * so it is set on every gun pixel and nowhere else. INTEGRATOR: the composite
 * needs this as well as cbCocAt did, so it is hoisted out.
 */
float cbVmBit(vec2 uv) {
  if (uHasVM < 0.5) return 0.0;
  return step(0.5, mod(floor(texture(tVel, uv).b / CB_FLAG_VIEWMODEL), 2.0));
}

float cbCocAt(vec2 uv) {
  float z = texture(tViewZ, uv).r;
  float coc = clamp(cbThinLens(z, uLens.x, uLens.y, uLens.z), -uClamp.x, uClamp.y);
  // Uniform branch -> fully coherent, effectively free when there is no gun.
  if (uHasVM > 0.5) {
    float bit = cbVmBit(uv);
    if (bit > 0.5) {
      // gViewZ is linearised before order 60, so it does NOT contain the
      // viewmodel; the gun's own depth buffer does. Remap it into world-camera
      // metres (RENDER_PLAN §8.4.1) before taking the lens equation.
      float d = texture(tDepthVM, uv).x;
      float vz = (uVm.z * uVm.w) / ((uVm.w - uVm.z) * d - uVm.w);
      float zr = uVm.x + max(-vz, 0.0) * uVm.y;
      coc = clamp(cbThinLens(zr, uVmLens.x, uVmLens.y, uVmLens.z) * uVmLens.w,
                  -uClamp.z, uClamp.w);
    }
  }
  return coc;
}
`;

// ---------------------------------------------------------------------------
// 1. prefilter: half-res colour + signed CoC (in HALF-res pixels) in .a
// ---------------------------------------------------------------------------
const PREFILTER_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tColor;
uniform vec2 uTexel;        // 1 / full res
uniform vec2 uHalfTexel;    // 1 / half res
layout(location = 0) out vec4 outColor;
${COC_CHUNK}
void main() {
  // centre of the top-left texel of this half-pixel's 2x2 full-res footprint
  vec2 p0 = (floor(vUv / uHalfTexel) * 2.0 + 0.5) * uTexel;
  vec2 o = uTexel;
  vec2 u0 = p0, u1 = p0 + vec2(o.x, 0.0), u2 = p0 + vec2(0.0, o.y), u3 = p0 + o;

  vec3 c = texture(tColor, u0).rgb + texture(tColor, u1).rgb
         + texture(tColor, u2).rgb + texture(tColor, u3).rgb;
  c *= 0.25;

  // Take the CoC of the NEAREST of the four. Conservative at silhouettes: a
  // sharp foreground texel keeps the half-pixel sharp and the tile-max path
  // (not this one) is what lets blurry neighbours bleed over it.
  float z0 = texture(tViewZ, u0).r, z1 = texture(tViewZ, u1).r;
  float z2 = texture(tViewZ, u2).r, z3 = texture(tViewZ, u3).r;
  vec2 bu = u0; float bz = z0;
  if (z1 < bz) { bz = z1; bu = u1; }
  if (z2 < bz) { bz = z2; bu = u2; }
  if (z3 < bz) { bz = z3; bu = u3; }

  outColor = vec4(c, cbCocAt(bu) * 0.5);   // full-res px -> half-res px
}
`;

// ---------------------------------------------------------------------------
// 2. tile max — 10 half-res px == 20 full-res px, matching the motion-blur grid
// ---------------------------------------------------------------------------
const TILE_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tPre;
uniform vec2 uHalfTexel;
layout(location = 0) out vec4 outColor;
void main() {
  vec2 base = floor(vUv / (uHalfTexel * 10.0)) * 10.0;
  float mx = 0.0, mn = 0.0;
  for (int y = 0; y < 10; y++) {
    for (int x = 0; x < 10; x++) {
      float c = texture(tPre, (base + vec2(float(x), float(y)) + 0.5) * uHalfTexel).a;
      mx = max(mx, c);
      mn = min(mn, c);
    }
  }
  outColor = vec4(mx, mn, 0.0, 1.0);
}
`;

// ---------------------------------------------------------------------------
// 3. tile dilate — 3x3 neighbour max. This is what stops the halo (§8.2).
// ---------------------------------------------------------------------------
const DILATE_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tTile;
uniform vec2 uTexel;
layout(location = 0) out vec4 outColor;
void main() {
  float mx = 0.0, mn = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 t = texture(tTile, vUv + vec2(float(x), float(y)) * uTexel).rg;
      mx = max(mx, t.r);
      mn = min(mn, t.g);
    }
  }
  outColor = vec4(mx, mn, 0.0, 1.0);
}
`;

// ---------------------------------------------------------------------------
// 4. gather — one ring loop, two accumulators, MRT out. RENDER_PLAN §8.3.
// ---------------------------------------------------------------------------
const GATHER_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tPre;
uniform sampler2D tTile;
uniform vec2 uHalfTexel;
uniform vec4 uBokeh;     // blades, bladeRotation, catEye, rimBoost
uniform float uJitter;   // radial stratification, in ring spacings
uniform vec2 uMinR;      // x = tile early-out radius, y = near fade-in top (half-res px)
layout(location = 0) out vec4 outFar;
layout(location = 1) out vec4 outNear;

#define SAT(x) clamp(x, 0.0, 1.0)
const float CB_PI = 3.141592653589793;
const float CB_TAU = 6.283185307179586;

// White-noise hash. NOT interleaved gradient noise: IGN is built to be resolved
// temporally, and DOF runs after TAA, so its structure survives to the screen as
// visible swirls in the bokeh. A decorrelated hash turns the same sampling error
// into fine grain, which reads as film.
float cbHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

// Unit disc -> regular n-gon. The rotation goes into the radius term only, so
// the polygon turns while the tap directions stay evenly spread (§8.3).
vec2 cbBlade(float r, float a, float n, float rot) {
  float seg = CB_TAU / n;
  float ar = a + rot;
  float rp = r * cos(CB_PI / n) / max(cos(ar - seg * floor(ar / seg + 0.5)), 1.0e-3);
  return rp * vec2(cos(a), sin(a));
}

void main() {
  vec4 centre = texture(tPre, vUv);
  vec2 tile = texture(tTile, vUv).rg;          // .r max far CoC, .g min near CoC
  float radius = max(tile.r, -tile.g);         // half-res px

  // Early out. On a hyperfocal hipfire frame this is 80-95% of the screen and
  // is the only reason the pass fits in its millisecond.
  //
  // THE STAIRCASE. This test is per TILE (10 half-res px, 3x3 dilated) but what
  // it gates — near coverage and far weight — used to ramp from ~0 CoC. So a
  // texel whose own CoC was, say, 1.5 px got FULL near replacement if its tile
  // happened to clear the threshold and NOTHING if the neighbouring tile did
  // not: a hard 0->1 step, axis-aligned, 20 full-res px on a side. That is the
  // dark horizontal banding across the establishing shot. Everything below is
  // written so the pass is continuous ACROSS this branch: nothing may have
  // non-zero weight at the radius where the early-out fires.
  if (radius < uMinR.x) {
    outFar = vec4(0.0);
    outNear = vec4(0.0);
    return;
  }

  // Frame-independent -> byte-identical every run (CONTRACT §3).
  float ign = cbHash(gl_FragCoord.xy);
  float ign2 = cbHash(gl_FragCoord.xy + vec2(23.7, 71.3));

  vec2 ndc = vUv * 2.0 - 1.0;
  vec2 rdir = normalize(ndc + vec2(1.0e-6));
  float squash = mix(1.0, uBokeh.z, SAT(length(ndc)));   // cat's-eye / optical vignetting

  // SAT(coc) on both accumulators means a perfectly in-focus sample carries
  // ZERO weight in either field, so a sharp region produces coverage 0 and the
  // composite leaves it untouched. Ramping (rather than step()) over the first
  // pixel of CoC keeps that from being a visible hard boundary.
  float cc = centre.a;
  float w0f = SAT(cc + 1.0) * SAT(cc);
  float w0n = SAT(-cc + 1.0) * SAT(-cc);
  vec3 farC = centre.rgb * w0f;
  float farW = w0f;
  vec3 nearC = centre.rgb * w0n;
  float nearW = w0n;
  float taps = 1.0;
  // Largest near CoC anywhere in this pixel's gather disc. PER-PIXEL, so unlike
  // "radius" it is not quantised to the tile grid — which is exactly what the
  // early-out fade below needs.
  float nearPeak = max(-cc, 0.0);

  for (int i = 1; i <= CB_RINGS; i++) {
    float fi = float(i);
    int n = 6 * i;
    float dA = CB_TAU / float(n);
    float ringRot = fi * 2.39996323 + ign * dA;
    for (int j = 0; j < 6 * CB_RINGS; j++) {
      if (j >= n) break;
      float a = float(j) * dA + ringRot;
      // Stratified radial jitter, INWARD only: fills the annulus between rings
      // (without it a small highlight lights only the taps that sit exactly on
      // a ring and the disc reads as a spiral of dots) while leaving the
      // outermost tap radius at 1.0 so the polygon rim stays crisp.
      float jit = fract(ign2 + float(j) * 0.6180339887 + fi * 0.3345);
      // The OUTERMOST ring is left (almost) unjittered: those taps sit on the
      // polygon boundary itself and are what makes the blade shape readable.
      // Jittering them too turns the rim into fuzz.
      float jitAmt = uJitter * (fi > float(CB_RINGS) - 0.5 ? 0.12 : 1.0);
      float rr = (fi - jitAmt * jit) / float(CB_RINGS);
      // Spherical aberration puts more energy on the rim of a real bokeh disc.
      // Ramped on the JITTERED radius, so it is a continuous radial gradient
      // that follows the polygon boundary -- this is what makes the blade shape
      // readable instead of a soft blob.
      float wRing = mix(1.0, 1.0 + uBokeh.w, rr * rr);
      vec2 p = cbBlade(rr, a, uBokeh.x, uBokeh.y);
      p -= rdir * dot(p, rdir) * (1.0 - squash);
      vec2 off = p * radius;
      float d = length(off);
      vec4 s = texture(tPre, vUv + off * uHalfTexel);
      float sc = s.a;

      // FAR: a sample contributes only if it is at least as blurry as it is far
      // away. This one line is what stops the background bleeding onto sharp
      // foreground (§8.3).
      float wf = SAT((sc - d) + 1.0) * SAT(sc) * wRing;
      farC += s.rgb * wf;
      farW += wf;

      // NEAR: same test against the near-field magnitude.
      float sn = max(-sc, 0.0);
      float wn = SAT((sn - d) + 1.0) * SAT(sn) * wRing;
      nearC += s.rgb * wn;
      nearW += wn;
      nearPeak = max(nearPeak, sn);

      taps += 1.0;
    }
  }

  outFar = vec4(farC / max(farW, 1.0e-4), step(1.0e-4, farW));
  // Coverage is the fraction of the (area-uniform) gather disc that reaches
  // this pixel -> a real 0..1 alpha that feathers the near silhouette.
  //
  // ...multiplied by a fade that is ZERO at the early-out radius. A texel can
  // only reach nearPeak >= uMinR.x if its own tile's max already cleared the
  // early-out, so no texel is ever dropped while carrying weight, and no texel
  // gains weight the instant its tile flips. That equality is the whole fix;
  // if you retune uMinR, keep the fade's low end pinned to the branch.
  float onset = smoothstep(uMinR.x, uMinR.y, nearPeak);
  outNear = vec4(nearC / max(nearW, 1.0e-4), SAT(nearW / max(taps, 1.0)) * onset);
}
`;

// ---------------------------------------------------------------------------
// 5. near feather — dilate coverage, blur colour. Without it the near field has
//    a hard edge and reads as a matte instead of a lens (§8.3).
// ---------------------------------------------------------------------------
const FEATHER_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tNear;
uniform vec2 uTexel;
layout(location = 0) out vec4 outColor;
void main() {
  vec3 c = vec3(0.0);
  float wsum = 0.0, ablur = 0.0, amax = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec4 s = texture(tNear, vUv + vec2(float(x), float(y)) * uTexel);
      // 1-2-1 tent, written without a const array (dynamic indexing of one
      // trips some ANGLE builds)
      float k = (0.5 - 0.25 * abs(float(x))) * (0.5 - 0.25 * abs(float(y)));
      ablur += s.a * k;
      amax = max(amax, s.a);
      // weight colour by coverage so empty neighbours do not wash the fringe out
      c += s.rgb * (k * s.a);
      wsum += k * s.a;
    }
  }
  outColor = vec4(c / max(wsum, 1.0e-4), min(amax, ablur * 0.5 + amax * 0.5));
}
`;

// ---------------------------------------------------------------------------
// 6. composite (full res)
// ---------------------------------------------------------------------------
const COMPOSITE_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSharp;
uniform sampler2D tFar;
uniform sampler2D tNear;
uniform vec2 uFarOnset;     // px where the far field starts / is fully applied
uniform float uNearScale;
uniform float uShowCoC;
layout(location = 0) out vec4 outColor;
${COC_CHUNK}
void main() {
  vec3 sharp = texture(tSharp, vUv).rgb;
  float coc = cbCocAt(vUv);

  vec4 far = texture(tFar, vUv);
  vec4 near = texture(tNear, vUv);

  // Blend the far field by THIS pixel's own CoC, not by the gather's coverage:
  // an in-focus pixel next to a blurry background must stay bit-sharp.
  // uFarOnset.x is forced to the gather's early-out radius (in FULL-res px) by
  // _execute, for the same continuity reason as the near fade — see the
  // early-out comment in GATHER_FRAG.
  float wf = smoothstep(uFarOnset.x, uFarOnset.y, max(coc, 0.0)) * far.a;
  vec3 c = mix(sharp, far.rgb, SAT(wf));

  // The near field is the opposite: it must bleed OVER whatever is behind it,
  // so it is driven by coverage alone.
  //
  // INTEGRATOR — except over the VIEWMODEL, and this is not a nicety: it is why
  // the gun was invisible in every gameplay vista for the whole project. The
  // near-field gather scatters by CoC magnitude and has no depth ordering, and
  // the world 1-3 m under the player's feet saturates the near clamp (-9 px at
  // 1080p). The gun sits in the bottom third of the frame, so that saturated
  // near field was composited at ~full coverage straight over it and the
  // viewmodel dissolved into the soft tan blob visible in tests/shots/hipfire.
  // The gun's own CoC was never the problem -- measured, it is -0.6 px, i.e.
  // sharp, exactly as the §8.4 remap intends. Nothing in the world can be in
  // front of the viewmodel by construction, so its bleed is always wrong.
  float vm = cbVmBit(vUv);
  c = mix(c, near.rgb, SAT(near.a * uNearScale) * (1.0 - vm));

  if (uShowCoC > 0.5) {
    float f = SAT(max(coc, 0.0) / max(uClamp.y, 1.0));
    float n = SAT(max(-coc, 0.0) / max(uClamp.x, 1.0));
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = vec3(l * 0.25) + vec3(f * 1.6, (1.0 - f - n) * 0.06, n * 1.6);
  }
  outColor = vec4(c, 1.0);
}
`;

// Rings per preset. taps = 1 + sum(6i). RENDER_PLAN §8.3.
const RINGS = { low: 0, medium: 2, high: 3, ultra: 4 };

export class DOF {
  static id = 'dof';
  static deps = ['renderer'];

  constructor(ctx) {
    this.ctx = ctx;
    this.pass = null;
    this.failed = false;
    this._mrt = null;
    this._mrtW = 0; this._mrtH = 0;
    this._rings = 3;

    // ------------------------------------------------------------------ knobs
    this.p = {
      enabled: true,
      // lens
      focalLength: 40.0,      // mm  -- NOT derived from the game FOV (§8.1).
                              // This is the WORLD lens and it springs between
                              // hipfire.focal and ads.focal; see the header.
      viewmodelFocalLength: 40.0,  // the gun's own lens, never follows the world's
      sensorHeight: 24.0,     // mm  (full-frame height)
      fStop: 3.5,
      focusDistance: 12.0,    // m
      // All CoC clamps are px at 1080p, scaled by H/1080 so the look is
      // resolution-independent. Near is deliberately ~2.5x tighter than far.
      maxCoC: 22.0,           // world far field (RENDER_PLAN §8.1)
      maxCoCNear: 9.0,        // world near field
      viewmodelMaxCoC: 16.0,  // the gun, both directions
      // bokeh
      blades: 7.0,
      bladeRotation: 0.40,    // rad
      catEye: 0.62,           // 1.0 = off
      rimBoost: 0.35,         // spherical-aberration rim; 0 = flat disc
      jitter: 0.9,            // radial stratification, in ring spacings
      rings: 0,               // 0 = follow quality preset
      // composite
      // farOnset[0] is a FLOOR of tileMinRadius*2 full-res px, enforced in
      // _execute. Authoring it lower does not buy softer near-focus geometry,
      // it buys the tile staircase back.
      farOnset: [2.0, 4.0],   // full-res px
      nearStrength: 1.0,
      // Tile early-out radius, in HALF-res px, and the top of the near fade-in.
      // Raising `tileMinRadius` is the perf knob (more of the frame takes the
      // early-out); the two ramps follow it automatically.
      tileMinRadius: 1.0,
      nearOnsetWidth: 0.75,   // fade spans [tileMinRadius, +this], half-res px
      // viewmodel (RENDER_PLAN §8.4)
      viewmodelDepthBase: 0.38,
      viewmodelDepthScale: 0.55,
      viewmodelCoCScale: 0.35,
      viewmodelFocus: 0.60,
      viewmodelFStop: 3.5,
      // Focus states. `focal` is the WORLD focal length in mm for that state —
      // ADS is a magnified optic, and it is the only thing that gives the far
      // field a CoC big enough to survive the composite ramp (see the header).
      // The far-field ceiling is f^2 / (N * (zf - f)) / sensorH * H px, so:
      //   hipfire  40 mm f/3.5 @ 12 m -> 1.7 px at infinity   (deep focus)
      //   ads      85 mm f/2.0 @ 26 m -> 6.3 px at infinity   (real separation)
      hipfire: { distance: 12.0, fStop: 3.5, focal: 40.0, vmFocus: 0.60, vmFStop: 3.5, vmScale: 0.35 },
      ads:     { distance: 26.0, fStop: 2.0, focal: 85.0, vmFocus: 0.55, vmFStop: 4.0, vmScale: 0.20 },
      focusMs: 120,
      debugShowCoC: false,
    };
    ctx.debug.dof = this.p;

    // Focus springs. Distance is sprung in log2 space — a focus pull from
    // 0.4 m to 26 m in linear metres reads as an instant snap then a crawl.
    this._logDist = new Spring(Math.log2(this.p.focusDistance), { freq: 6.3, damping: 1 });
    this._fStop = new Spring(this.p.fStop, { freq: 6.3, damping: 1 });
    // Focal length is sprung in log2 too: 40 -> 85 mm is a ratio, not a delta,
    // and a linear spring on it reads as a snap followed by a crawl exactly the
    // way a linear focus pull does.
    this._logFocal = new Spring(Math.log2(this.p.focalLength), { freq: 6.3, damping: 1 });
    this._vmFocus = new Spring(this.p.viewmodelFocus, { freq: 6.3, damping: 1 });
    this._vmFStop = new Spring(this.p.viewmodelFStop, { freq: 6.3, damping: 1 });
    this._vmScale = new Spring(this.p.viewmodelCoCScale, { freq: 6.3, damping: 1 });
    this._aiming = false;

    this._u = null;
    // Last values pushed into the springs, so editing `ctx.debug.dof` from a GUI
    // takes effect rather than being silently overwritten by the spring state.
    this._echo = { focusDistance: this.p.focusDistance, fStop: this.p.fStop,
                   focalLength: this.p.focalLength,
                   viewmodelFocus: this.p.viewmodelFocus, viewmodelFStop: this.p.viewmodelFStop,
                   viewmodelCoCScale: this.p.viewmodelCoCScale };
  }

  // ---------------------------------------------------------------------------

  async init() {
    const { ctx } = this;
    try {
      this._buildMaterials();
      this._wireBus();

      if (ctx.debug.flags.dof === undefined) ctx.debug.flags.dof = true;
      if (ctx.debug.flags.dofCoC === undefined) ctx.debug.flags.dofCoC = false;

      this.pass = ctx.frameGraph.register({
        id: 'dof',
        order: 90,
        inputs: ['viewZ'],
        outputs: ['color'],
        enabled: this._wantEnabled(),
        execute: (target, gbuf, c) => {
          // A failure here degrades to passthrough: leave g.sceneHDR alone and
          // the frame still reaches the screen (task brief, CONTRACT §5).
          if (this.failed) return;
          try {
            this._execute(gbuf, c);
          } catch (e) {
            this.failed = true;
            this.pass.enabled = false;
            c.frameGraph.invalidate?.();
            console.error('[dof] disabled after error:', e);
          }
        },
        reset: () => {},
      });
      this._refresh();
    } catch (e) {
      this.failed = true;
      console.error('[dof] init failed, pass not registered:', e);
    }
  }

  _wireBus() {
    const b = this.ctx.bus;
    // weapons.js / director.js may speak any of these; dof never reads them back.
    b.on('quality', () => this.onQuality());
    b.on('debugFlag', ({ flag }) => { if (flag === 'dof' || flag === 'dofCoC') this._refresh(); });
    b.on('ads', (e) => this.setAiming(typeof e === 'boolean' ? e : !!(e && (e.on ?? e.aiming ?? e.active))));
    b.on('weapon:ads', (e) => this.setAiming(typeof e === 'boolean' ? e : !!(e && (e.on ?? e.aiming ?? e.active))));
    b.on('weaponState', (e) => { if (e && 'ads' in e) this.setAiming(!!e.ads); });
    b.on('dof:focus', (e) => { if (e) this.setFocus(e.distance, e.fStop, e.ms); });
  }

  /**
   * Set the world focus plane. `weapons.js` / `director.js` call this; this file
   * never reads weapon state directly (RENDER_PLAN §8.4).
   * @param {number} distance metres
   * @param {number} [fStop]
   * @param {number} [ms] transition time to 95%
   * @param {number} [focal] world focal length in mm; omit to leave it alone.
   *   This is what sets the far-field CoC ceiling — see the header block.
   */
  setFocus(distance, fStop, ms, focal) {
    // Mirror the target into the knob object so ctx.debug.dof always shows the
    // truth and the update() echo does not yank focus back on the next frame.
    if (Number.isFinite(distance)) {
      this._logDist.target = Math.log2(Math.max(0.05, distance));
      this.p.focusDistance = this._echo.focusDistance = distance;
    }
    if (Number.isFinite(fStop)) {
      this._fStop.target = clamp(fStop, 0.7, 32);
      this.p.fStop = this._echo.fStop = fStop;
    }
    if (Number.isFinite(focal)) {
      this._logFocal.target = Math.log2(clamp(focal, 8, 400));
      this.p.focalLength = this._echo.focalLength = focal;
    }
    const t = Number.isFinite(ms) ? ms : this.p.focusMs;
    const freq = 4.744 / Math.max(0.016, t * 0.001) / TAU;
    this._logDist.freq = this._fStop.freq = this._logFocal.freq = freq;
    return this;
  }

  /** Focus the viewmodel's own plane (metres, in remapped world-camera space). */
  setViewmodelFocus(distance, fStop, cocScale, ms) {
    const p = this.p, e = this._echo;
    if (Number.isFinite(distance)) { this._vmFocus.target = Math.max(0.05, distance); p.viewmodelFocus = e.viewmodelFocus = distance; }
    if (Number.isFinite(fStop)) { this._vmFStop.target = clamp(fStop, 0.7, 32); p.viewmodelFStop = e.viewmodelFStop = fStop; }
    if (Number.isFinite(cocScale)) { this._vmScale.target = clamp(cocScale, 0, 4); p.viewmodelCoCScale = e.viewmodelCoCScale = cocScale; }
    const t = Number.isFinite(ms) ? ms : this.p.focusMs;
    const freq = 4.744 / Math.max(0.016, t * 0.001) / TAU;
    this._vmFocus.freq = this._vmFStop.freq = this._vmScale.freq = freq;
    return this;
  }

  /** Convenience: the hipfire <-> ADS pair in one call. */
  setAiming(on, ms) {
    on = !!on;
    if (on === this._aiming) return this;
    this._aiming = on;
    const s = on ? this.p.ads : this.p.hipfire;
    this.setFocus(s.distance, s.fStop, ms, s.focal);
    this.setViewmodelFocus(s.vmFocus, s.vmFStop, s.vmScale, ms);
    return this;
  }

  /**
   * Far-field CoC ceiling of the CURRENT world lens, in full-res px:
   * f^2 / (N * (zf - f)), the value CoC(z) approaches as z -> infinity. If this
   * is below `farOnset[0]` the pass has no far field at all, at any distance,
   * and no amount of tuning downstream of the lens will produce one.
   */
  farCoCCeilingPx() {
    const f = Math.pow(2, this._logFocal.value), N = this._fStop.value;
    const zf = Math.pow(2, this._logDist.value) * 1000;
    const H = this.ctx.sys.renderer?.height || 1080;
    return (f * f / Math.max(0.05, N) / Math.max(zf - f, 1)) / this.p.sensorHeight * H;
  }

  snapFocus() {
    this._logDist.set(this._logDist.target);
    this._fStop.set(this._fStop.target);
    this._logFocal.set(this._logFocal.target);
    this._vmFocus.set(this._vmFocus.target);
    this._vmFStop.set(this._vmFStop.target);
    this._vmScale.set(this._vmScale.target);
    return this;
  }

  update(dt) {
    // Pick up direct edits to ctx.debug.dof.* (a tuning GUI writes the params,
    // not the springs) without clobbering an in-flight setFocus.
    const p = this.p, e = this._echo;
    if (p.focusDistance !== e.focusDistance || p.fStop !== e.fStop || p.focalLength !== e.focalLength) {
      e.focusDistance = p.focusDistance; e.fStop = p.fStop; e.focalLength = p.focalLength;
      this.setFocus(p.focusDistance, p.fStop, undefined, p.focalLength);
    }
    if (p.viewmodelFocus !== e.viewmodelFocus || p.viewmodelFStop !== e.viewmodelFStop ||
        p.viewmodelCoCScale !== e.viewmodelCoCScale) {
      e.viewmodelFocus = p.viewmodelFocus; e.viewmodelFStop = p.viewmodelFStop;
      e.viewmodelCoCScale = p.viewmodelCoCScale;
      this.setViewmodelFocus(p.viewmodelFocus, p.viewmodelFStop, p.viewmodelCoCScale);
    }

    // dt is the fixed 1/60 step -> deterministic (CONTRACT §3).
    this._logDist.update(dt);
    this._fStop.update(dt);
    this._logFocal.update(dt);
    this._vmFocus.update(dt);
    this._vmFStop.update(dt);
    this._vmScale.update(dt);
  }

  onQuality() { this._refresh(); }

  _wantEnabled() {
    const q = this.ctx.quality;
    const f = this.ctx.debug.flags.dof;
    return !this.failed && this.p.enabled && q.dof !== false && f !== false && RINGS[q.preset] > 0;
  }

  _refresh() {
    if (!this.pass) return;
    const want = this._wantEnabled();
    if (this.pass.enabled !== want) {
      this.pass.enabled = want;
      this.ctx.frameGraph.invalidate?.();
    }
    const rings = this.p.rings || RINGS[this.ctx.quality.preset] || 3;
    if (rings !== this._rings) {
      this._rings = rings;
      this._gather.defines.CB_RINGS = rings;
      this._gather.needsUpdate = true;      // one recompile per preset change
    }
    // medium loses the cat's-eye squash (it needs the outer rings to read)
    this._mediumBokeh = this.ctx.quality.preset === 'medium';
  }

  // ---------------------------------------------------------------------------

  _mat(frag, uniforms, defines) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,   // three writes `#version 300 es` itself
      vertexShader: FS_VERT,
      fragmentShader: frag,
      // `defines: undefined` makes three log "parameter 'defines' has value of
      // undefined" once per material at boot. Harmless, but it is console noise
      // in a harness that treats console output as a signal.
      uniforms, defines: defines || {},
      depthTest: false, depthWrite: false,
    });
  }

  _buildMaterials() {
    // 1x1 stand-in so `tDepthVM` is never an unbound sampler before a viewmodel
    // exists. `uHasVM` gates every read of it anyway.
    this._nullDepth = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this._nullDepth.needsUpdate = true;

    // The CoC uniform block is shared BY REFERENCE between prefilter and
    // composite, so the per-frame write below updates both.
    const u = this._u = {
      tViewZ: { value: null },
      tVel: { value: null },
      tDepthVM: { value: this._nullDepth },
      uLens: { value: new THREE.Vector4(40, 3.5, 12, 0) },
      uVmLens: { value: new THREE.Vector4(40, 3.5, 0.6, 0.35) },
      uVm: { value: new THREE.Vector4(0.38, 0.55, 0.008, 12) },
      uClamp: { value: new THREE.Vector4(9, 22, 16, 16) },
      uSensor: { value: new THREE.Vector2(24, 1080) },
      uHasVM: { value: 0 },
    };

    this._prefilter = this._mat(PREFILTER_FRAG, {
      ...u,
      tColor: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uHalfTexel: { value: new THREE.Vector2() },
    });
    this._tile = this._mat(TILE_FRAG, {
      tPre: { value: null }, uHalfTexel: { value: new THREE.Vector2() },
    });
    this._dilate = this._mat(DILATE_FRAG, {
      tTile: { value: null }, uTexel: { value: new THREE.Vector2() },
    });
    this._gather = this._mat(GATHER_FRAG, {
      tPre: { value: null }, tTile: { value: null },
      uHalfTexel: { value: new THREE.Vector2() },
      uBokeh: { value: new THREE.Vector4(7, 0.4, 0.62, 0.35) },
      uJitter: { value: 0.9 },
      uMinR: { value: new THREE.Vector2(1.0, 1.75) },
    }, { CB_RINGS: 3 });
    this._feather = this._mat(FEATHER_FRAG, {
      tNear: { value: null }, uTexel: { value: new THREE.Vector2() },
    });
    this._composite = this._mat(COMPOSITE_FRAG, {
      ...u,
      tSharp: { value: null }, tFar: { value: null }, tNear: { value: null },
      uFarOnset: { value: new THREE.Vector2(0.6, 2.0) },
      uNearScale: { value: 1.0 },
      uShowCoC: { value: 0 },
    });
  }

  /** far + near in ONE ring loop. Worth hand-managing an MRT for: it halves the
   *  gather, which is ~85% of the pass. */
  _ensureMRT(w, h) {
    if (this._mrt && this._mrtW === w && this._mrtH === h) return this._mrt;
    this._mrt?.dispose();
    const m = new THREE.WebGLMultipleRenderTargets(w, h, 2, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false, samples: 0,
    });
    m.texture[0].name = 'dofFar';
    m.texture[1].name = 'dofNear';
    for (const t of m.texture) { t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; }
    this._mrt = m; this._mrtW = w; this._mrtH = h;
    return m;
  }

  _execute(g, ctx) {
    const R = ctx.sys.renderer;
    if (!g.gViewZ || !g.sceneHDR) return;   // viewZ not built -> passthrough

    // NB: `gbuf.width/height/halfWidth/halfHeight/texel` are STALE (1x1) in the
    // current renderer.js -- its first `_allocate()` runs from `resize()`, before
    // `_gbufObj` exists, and the second call early-outs on the size check so the
    // `if (g)` block never runs. The Renderer instance's own fields are correct.
    // Filed in HANDOFF ## requests; until it lands, take the size from there.
    const fw = R.width || g.width, fh = R.height || g.height;
    const hw = R.halfWidth || g.halfWidth, hh = R.halfHeight || g.halfHeight;
    const p = this.p;
    const u = this._u;

    // ---- uniforms ---------------------------------------------------------
    const s = fh / 1080;
    const worldFocal = Math.pow(2, this._logFocal.value);
    u.tViewZ.value = g.gViewZ;
    u.tVel.value = g.gVel;
    u.uLens.value.set(worldFocal, this._fStop.value, Math.pow(2, this._logDist.value), 0);
    u.uClamp.value.set(p.maxCoCNear * s, p.maxCoC * s, p.viewmodelMaxCoC * s, p.viewmodelMaxCoC * s);
    // The gun keeps the 40 mm lens whatever the world is doing (header block).
    u.uVmLens.value.set(p.viewmodelFocalLength || p.focalLength,
      this._vmFStop.value, this._vmFocus.value, this._vmScale.value);
    u.uSensor.value.set(p.sensorHeight, fh);

    const vmDepth = R.gDepthVM;
    const hasVM = !!(vmDepth && ctx.viewScene.children.length);
    u.uHasVM.value = hasVM ? 1 : 0;
    u.tDepthVM.value = hasVM ? vmDepth : this._nullDepth;
    u.uVm.value.set(p.viewmodelDepthBase, p.viewmodelDepthScale, ctx.viewCamera.near, ctx.viewCamera.far);

    // ---- 1. prefilter -----------------------------------------------------
    const pre = R.rt('dofPre', { scale: 0.5, format: THREE.RGBAFormat, type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    this._prefilter.uniforms.tColor.value = g.sceneHDR;
    this._prefilter.uniforms.uTexel.value.set(1 / fw, 1 / fh);
    this._prefilter.uniforms.uHalfTexel.value.set(1 / hw, 1 / hh);
    R.fullscreen(this._prefilter, pre);

    // ---- 2/3. tile max + 3x3 dilate ---------------------------------------
    const tw = Math.ceil(hw / 10), th = Math.ceil(hh / 10);
    const tileA = R.rt('dofTile', { w: tw, h: th, format: THREE.RGFormat, type: THREE.HalfFloatType, filter: THREE.NearestFilter });
    const tileB = R.rt('dofTileN', { w: tw, h: th, format: THREE.RGFormat, type: THREE.HalfFloatType, filter: THREE.NearestFilter });
    this._tile.uniforms.tPre.value = pre.texture;
    this._tile.uniforms.uHalfTexel.value.set(1 / hw, 1 / hh);
    R.fullscreen(this._tile, tileA);
    this._dilate.uniforms.tTile.value = tileA.texture;
    this._dilate.uniforms.uTexel.value.set(1 / tw, 1 / th);
    R.fullscreen(this._dilate, tileB);

    // ---- 4. gather --------------------------------------------------------
    const mrt = this._ensureMRT(hw, hh);
    this._gather.uniforms.tPre.value = pre.texture;
    this._gather.uniforms.tTile.value = tileB.texture;
    this._gather.uniforms.uHalfTexel.value.set(1 / hw, 1 / hh);
    this._gather.uniforms.uBokeh.value.set(
      p.blades, p.bladeRotation, this._mediumBokeh ? 0.80 : p.catEye, p.rimBoost);
    this._gather.uniforms.uJitter.value = p.jitter;
    // The gather's early-out radius and the two composite ramps are ONE number.
    // Keeping them in sync here (rather than trusting three authored constants
    // to agree) is what stops the 20 px tile staircase coming back.
    const minR = Math.max(0.25, p.tileMinRadius);
    this._gather.uniforms.uMinR.value.set(minR, minR + Math.max(0.1, p.nearOnsetWidth));
    R.fullscreen(this._gather, mrt);

    // ---- 5. near feather --------------------------------------------------
    const nearRT = R.rt('dofNearF', { scale: 0.5, format: THREE.RGBAFormat, type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    this._feather.uniforms.tNear.value = mrt.texture[1];
    this._feather.uniforms.uTexel.value.set(1 / hw, 1 / hh);
    R.fullscreen(this._feather, nearRT);
    let nearTex = nearRT.texture;
    if (this._rings >= 4) {   // ultra: a second feather pass, wider soft edge
      const nearRT2 = R.rt('dofNearF2', { scale: 0.5, format: THREE.RGBAFormat, type: THREE.HalfFloatType, filter: THREE.LinearFilter });
      this._feather.uniforms.tNear.value = nearTex;
      R.fullscreen(this._feather, nearRT2);
      nearTex = nearRT2.texture;
    }

    // ---- 6. composite -----------------------------------------------------
    const out = R.rt('dofOut', { format: THREE.RGBAFormat, type: THREE.HalfFloatType, filter: THREE.LinearFilter });
    this._composite.uniforms.tSharp.value = g.sceneHDR;
    this._composite.uniforms.tFar.value = mrt.texture[0];
    this._composite.uniforms.tNear.value = nearTex;
    // Far ramp, in FULL-res px: floored at the early-out radius (half-res px
    // -> x2) so no texel can carry far weight in a tile that took the branch.
    const farLo = Math.max(p.farOnset[0], minR * 2.0);
    this._composite.uniforms.uFarOnset.value.set(farLo, Math.max(p.farOnset[1], farLo + 0.8));
    this._composite.uniforms.uNearScale.value = p.nearStrength;
    this._composite.uniforms.uShowCoC.value =
      (p.debugShowCoC || ctx.debug.flags.dofCoC) ? 1 : 0;
    R.fullscreen(this._composite, out);

    // Hand the frame on. See the header block.
    g.sceneHDR = out.texture;
    g.color = out.texture;
  }

  // ---------------------------------------------------------------------------

  debugInfo() {
    const p = this.p;
    return {
      enabled: !!this.pass?.enabled,
      failed: this.failed,
      rings: this._rings,
      taps: 1 + 3 * this._rings * (this._rings + 1),
      focusDistance: Math.pow(2, this._logDist.value),
      fStop: this._fStop.value,
      focalLength: Math.pow(2, this._logFocal.value),
      // If this is below farOnset[0] the pass HAS no far field. It is the first
      // number to read when someone says "the background isn't blurring".
      farCoCCeilingPx: +this.farCoCCeilingPx().toFixed(2),
      aiming: this._aiming,
      viewmodel: { focus: this._vmFocus.value, fStop: this._vmFStop.value, cocScale: this._vmScale.value },
      maxCoCpx: [p.maxCoCNear, p.maxCoC],
      blades: p.blades,
      tileMinRadius: p.tileMinRadius,
      farOnset: [Math.max(p.farOnset[0], p.tileMinRadius * 2), p.farOnset[1]],
    };
  }

  dispose() {
    this.ctx.frameGraph?.unregister?.('dof');
    this._mrt?.dispose();
    this._nullDepth?.dispose();
    for (const m of [this._prefilter, this._tile, this._dilate, this._gather, this._feather, this._composite]) m?.dispose();
  }
}
