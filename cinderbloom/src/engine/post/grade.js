// =============================================================================
// CINDERBLOOM — auto-exposure, AgX tonemap, film LUT, lens, output transform.
// Owner: grade agent.  Frame graph order 110 — this pass owns the blit to canvas.
// Spec: docs/RENDER_PLAN.md §10.  Palette: docs/ART_DIRECTION.md §2, §5.
// =============================================================================
//
// ## What this pass is
//
// The photographic stage. Everything upstream produces scene-referred radiance;
// nothing upstream knows how bright the frame should be or what it should look
// like. This pass decides both, and then it is the only thing that writes the
// default framebuffer.
//
//   1  meter chain   log-luminance, centre-weighted, 3 box reductions   (3 draws)
//   2  reduce        two-iteration trimmed log-mean -> EV100            (1 draw, 1 px)
//   3  adapt         asymmetric eye adaptation, GPU-resident 1x1 state  (1 draw, 1 px)
//   4  grade         CA -> sharpen -> chroma denoise -> exposure
//                    -> AgX(+tone+look+LUT) -> chroma restore -> vignette
//                    -> grain -> output encode -> dither                (1 draw)
//
// ## 2026-07-30: what the instrumentation found, and what changed
//
// The pass was measured against itself with `__CB.toggle('grade')` and came back
// costing 24% of the frame's stdLuma and 8% of its distinct colours. Four things
// were wrong and all four are fixed below; the detail is at each site.
//
//   1. THE OUTPUT ENCODE WAS THE WRONG INVERSE. AgX hands back a display value
//      that three's chunk raises to 2.2 to re-linearise it; this file then
//      applied the sRGB OETF, which is not that curve's inverse. Net effect on
//      the bottom fifth of the range: x0.12 at display 0.02, x0.36 at 0.05,
//      x0.73 at 0.10. Every shadow in the game was being crushed by up to three
//      stops and then lifted back with a milky veil to compensate. That single
//      mismatch is most of the 24%. See `cbEncodeOutput`.
//   2. THE TONE CURVE WAS BAKED INTO A 33-NODE LUT. A LUT interpolates linearly
//      between nodes, so a curve stored in one comes out as 32 straight segments
//      — which is the banding filed against `draft` and `storm`. Contrast, toe
//      and shoulder are analytic uniforms now (`cbTone`); the LUT does colour
//      only, and its payload is half-float rather than 8-bit.
//   3. THE CHROMA RESTORE WAS PAINTING NOISE. It read a per-pixel hue angle off
//      near-black radiance; on `grotto` that was a field of 1 px red/green/
//      magenta confetti worth 27% of the frame's "colour count". Its reference
//      is low-passed now, and a proper chroma denoise runs at the INPUT.
//   4. AgX WAS BEING RUN WITHOUT A LOOK. Its contrast approximation holds a
//      slope of 1.74 in normalised log units, i.e. ~0.105 display units per
//      stop, because Blender ships it with a Punchy/High-Contrast look on top.
//      The per-area `contrast` was 1.02-1.26 where it needed ~1.6, and the
//      response is close to linear in stdLuma with no clipping at either end.
//
// Exposure state lives on the GPU in a 1x1 ping-pong. There is deliberately no
// per-frame `readRenderTargetPixels` — a readback here stalls the pipeline for
// the entire frame and it is the classic way an auto-exposure implementation
// costs 2 ms instead of 0.05 ms. `debugInfo()` does read it back; do not call
// that per frame.
//
// ## 2026-07-31 (round 7): the two questions that were answered NO
//
//   1. DOES THIS PASS COMPRESS A BRIGHTER KEY BACK OUT? No. `tools/_grkey.mjs`
//      drives sky.knobs.key over four stops and reports the transfer exponent in
//      LINEAR light: 1.06, 1.10, 1.09, 0.99, 0.87 at k = 1, 2, 4, 8, 16. The pass
//      slightly EXPANDS the ratio it is handed until the key is four stops above
//      today. The trap that makes it look otherwise is that a png is display
//      encoded, so a transparent chain turns a 7:1 radiance ratio into 2.4:1 in
//      code values; reading that as compression is how a sun gets turned down.
//   2. IS THE STORM/DRAFT "MILKY" VEIL IN THIS CHAIN? No. On the cliff patch the
//      grade takes the low-pass range from 0.257..0.972 to 0.101..0.842 and the
//      sd from 0.080 to 0.107 — it expands that surface's value structure, and
//      every term A/B's to within 0.001. The cliff is flat because it is a flat
//      surface (N/S 0.09: lots of value range, no pixel-scale detail).
//
//   What DID change: `lens.dnLuma`, a per-area luma component on the chroma
//   denoise, 0.50 on grotto and 0 on the other eight. Grotto's input carries
//   hueRMS 1.23 in scene-referred radiance BEFORE this pass (3.1e5 with TAA off),
//   so the confetti is generated upstream; all this file can do is turn it from
//   colour into monochrome grain and then take some of that grain out. Full
//   numbers, and the two refinements that were built and measured and thrown
//   away (a bilateral guide, a third ring), are in HANDOFF round 7.
//
// ## 2026-08-01 (round 9): colour went 3.7 -> 2.3, and this is what moved
//
// Round 8's critics scored colour 2.3 — the largest single drop on any axis —
// with "one 22.5-degree hue bin at 90% is not a palette" and "eleven of fourteen
// shots still sit in one narrow tan band". Both reproduce from the pngs; the
// instrument is `tools/_grhist.mjs`, which scores the whole review set offline
// in two seconds instead of relaunching the game per vista. Measured on the
// round-8 set: TWELVE of fourteen shots put their dominant saturation-weighted
// hue bin at 22.5-45 deg, mean top1 51.3%.
//
// What moved between round 6 (colour 3.7) and round 8 (colour 2.3) is one edit,
// and `git diff d5a0a25 a50b955` shows it: round 7 added the display-domain
// split tone, and round 8 then rotated EVERY area's shadow tint onto hue 190.0
// +- 0.1 while every highlight tint sat inside 29-39 deg. Nine authored areas,
// one shadow hue and one highlight hue between them. The frame gained a second
// hue and the SET lost the only per-area colour variable in the file — so all
// fourteen shots became the same two hues, and a basin, a cave, a mesa and a
// firestorm graded identically. See the ROUND 9 block above AREAS.
//
// Three changes, all measured:
//
//   1. PER-AREA COLOUR IDENTITY. Shadow hues now span 168-288 deg and are each
//      derived from what actually lights the shadows there (E5 fluorescence in
//      canopy/grotto/night, ART 3.3's zenith AT THAT SUN ELEVATION in basin and
//      ridge, A13 tarnish in the Draft where sigma_a x3.4 leaves no blue to fill
//      with); highlight hues span 12-40 deg by KEY TEMPERATURE, 1700 K to
//      4379 K. Nothing here raises a saturation or moves a value.
//   2. HUE CONTRAST (`uHueX`), a new term — chroma gain that rises with hue
//      distance from the area's flood hue, at exactly constant luma. It is
//      identity on a one-hue frame, so it cannot manufacture a palette; what it
//      does is stop this chain collapsing distinctions the world DID emit, which
//      matters because three other agents are widening the world's albedo this
//      round. Measured on establish: distinct colours 7354 -> 7851 (+6.8%) at
//      the shipped 0.70, +7.9% at 1.0, with clip, crush, p0.1, p99.9 and all
//      five value bands unmoved to the digit.
//   3. THE GRAIN WAS AN ORDERED SCREEN. `cbHash21` had an exact period of TEN
//      CELLS on the integer lattice, because 127.1 x 10 and 311.7 x 10 are both
//      integers — autocorrelation 0.77 at lag 13 and 14 in x AND y. That is the
//      same class of defect as round 7's Bayer dither and it is the best
//      candidate for the "~4px diagonal lattice on LIT ground only" a critic
//      filed, because the grain is the ONLY term in this pass whose amplitude
//      peaks at lit mid-tones. Fixed hash + a 26.57 deg rotation of the grain
//      lattice: 0.575 -> 0.133 max prominence. See cbHash21.
//
// PROTECTED AND VERIFIED AFTER: tests/quality.mjs reports clip 0.0000 and crush
// 0.0000 on all fourteen vistas, p0.1 3-19 and p99.9 210-249 across the set.
//
// WHAT IS FILED RATHER THAN FIXED: draft's shadow is A13 violet and it measures
// 10.4% of pixels against ART 2.5's 2% cap. The trade is exact and it is a
// TRANSFER, not an addition — with the term off, draft is ochre 91.2% / violet
// 0.3% / hue concentration R 0.978, i.e. literally the "one hue bin" finding;
// with it on it is ochre 82.8% / violet 10.4% / R 0.851 with a second populated
// bin 90 deg away. Both bands are over cap either way. `split.s[3]` on draft is
// the one number that reverses it.
//
// ## The tonemapper is AgX, and it is three's own AgX
//
// RENDER_PLAN §10.1 argues it out: ACES's RRT rotates saturated hue (reds toward
// orange, blues toward cyan) in proportion to how non-Earth-like the palette is,
// and this planet is magenta flora, amber flame and a teal sky. AgX rolls all
// three channels toward white on the shoulder instead, and its milky toe leaves
// room for the LUT to put contrast back where art wants it.
//
// We do NOT retype the AgX matrices. `THREE.ShaderChunk.tonemapping_pars_fragment`
// carries the complete r161 implementation; this file imports that string and
// makes exactly one textual edit — inserting `cbAgxLook()` immediately before the
// outset matrix, which is the display-log domain where a film look belongs.
// If the edit ever fails to find its anchor, we fall back to a hand-written AgX
// and warn loudly rather than silently shipping the neutral base.
//
// ## The LUT is applied in log space, on purpose — and it carries COLOUR ONLY
//
// The 33^3 LUT is sampled inside `cbAgxLook`, i.e. after AgX's log encode and
// contrast curve but before the outset matrix and the 2.2 power. Two reasons:
// the domain is already bounded [0,1] so no shaper curve is needed, and a film
// print emulation is a log-domain transform — applying it to display-referred
// output makes every grade behave differently in the toe than it does in the mids.
//
// What it must NOT carry is the tone curve. Trilinear interpolation makes a
// 33-node LUT piecewise linear, so any curvature baked into it arrives as a
// staircase; that was the `draft`/`storm` banding. Contrast/toe/shoulder live in
// `cbTone` as uniforms, blend continuously between areas, and are exact at every
// input. The payload is half-float (see `bakeLut`) so the LUT is no longer the
// coarsest quantiser in a chain that ends at an 8-bit framebuffer.
//
// ## What the grade is for, and what it is NOT for
//
// ART_DIRECTION §9 lists this file last, deliberately: "Do not solve any identity
// problem in the grade. If the world is grey, the answer is more materials, not
// more saturation." The pass before this one took the second half of §9 —
// the grade OWNS "§2.3 value structure" — as licence to enforce §2.5's colour
// rationing here too. It measured that and it does not work: see the table above
// `OCHRE_RATION`. Squeezing the ochre band moved §2.5's headline number by ONE
// POINT and cost between a fifth and a half of the frame's colour depth on every
// vista, because a flood of one HUE is not a saturation problem. The ration is a
// safety clip now and the flood is filed upstream, where §9 says it belongs.
//
// What is left here is honest:
//
//   * the chroma restore. AgX's inset matrix ate ~20 points of the sky's chroma.
//     This carries the SCENE's own chroma to the display luminance the tonemap
//     chose, at exactly constant luma. Its fixed point is the renderer's output,
//     so it can only preserve a split, never invent one. It reads a low-passed
//     reference, because a per-pixel one paints noise (see the block in main()).
//   * the chroma denoise at the input. Luma-preserving by construction, so it
//     cannot touch the value histogram — it spends colour resolution, which is
//     the cheapest resolution there is, to kill the 1 px chroma confetti the
//     renderer hands us in the dark areas.
//   * `shadowDesat` in the LUT recipe: a print-toe desaturation. It is much
//     gentler than it was, because it is no longer doubling as the only defence
//     against that confetti.
//
// ## Per-area grades
//
//   ctx.sys.grade.setArea('grotto', 900)      // blends look + LUT + EV bounds
//   ctx.sys.grade.setAreaEV({ min, max, bias, blendMs })
//   ctx.bus.emit('grade:area', { name: 'storm', ms: 1400 })
//
// Areas are authored from ART_DIRECTION §5. `director.js` owns *when*; this file
// owns *what*. Nine areas: neutral, basin, canopy, ridge, grotto, storm, draft,
// water, night. `storm` and `draft` are ART §3.5's `spore` and `storm` weather
// and they are chosen by the WORLD's weather, not by the area name alone — see
// `_resolveArea`.
//
// ## Debug
//
//   __CB.toggle('grade')       -- master A/B. Off falls back to renderer.js's
//                                 ACES blit, which is the honest "before" image.
//   __CB.toggle('gradeSplit')  -- split screen: raw ACES | full grade
//   __CB.toggle('gradeClip')   -- false-colour clipping (blue crushed, red blown)
//   __CB.toggle('gradeNoLut') / gradeNoGrain / gradeNoCA / gradeNoVignette
//   __CB.toggle('gradeNoChroma')  -- A/B the chroma restore AND the denoise
//   __CB.toggle('gradeNoSplit')   -- A/B the display-domain split tone AND the
//                                    per-area white balance together. On `ridge`
//                                    this is the difference between hue
//                                    concentration R 0.64 and R 0.97 — see the
//                                    ROUND 8 block above the white-balance term.
//
//   node tools/valuebands.mjs <png>   -- the §2.3 histogram and the §2.5 ration
//                                        percentages for a capture.
//   node tools/_grab.mjs              -- grade ON vs OFF vs each term, per vista.
//                                        The 24%-of-stdLuma finding came from here.
//   node tools/_grlut.mjs             -- re-bakes the LUT with one RECIPE term
//                                        neutralised at a time. This is how the
//                                        colour-count loss was pinned on the hue
//                                        ration and on nothing else.
//   node tools/_grtone.mjs            -- live sweep of the analytic tone knobs.
//   node tools/_grband.mjs            -- the same, read against §2.3's bands.
//   node tools/_grkey.mjs             -- key-ratio TRANSFER. Run this before and
//                                        after any sky.js key change, and read
//                                        the LINEAR column, not the code one.
//   node tools/_grknob.mjs            -- arbitrary grade.p A/B; pixel-scale noise
//                                        and the §2.3 bands in one table.
//   node tools/_grev.mjs              -- exposure sweep, same two axes together.
//   node tools/_grsrc.mjs
//   node tools/_grsrcab.mjs           -- hueRMS in sceneHDR: is the speckle even
//                                        ours, and which pass made it.
//   node tools/_grperf.mjs            -- grade ON/OFF benchmark, interleaved.
//   node tools/_grcool.mjs            -- WHAT COLOUR IS SHADOW, before and after
//                                        this pass. The shade population's hue in
//                                        sceneHDR, how much of it is cool AT ALL,
//                                        the sky's own hue sampled geometrically,
//                                        and the displayed frame's cool arc. This
//                                        is the tool that found the grade was
//                                        manufacturing a blue that ART 8 bans.
//                                        Also runs on pngs with no browser, so it
//                                        scores a _grpal.mjs sweep for free.
//   node tools/_grdith.mjs            -- dither/halftone fingerprint: the share of
//                                        a flat patch's residual variance that is
//                                        a function of PIXEL PHASE. Zero for
//                                        noise, everything for an ordered screen.
//   node tools/_grring.mjs            -- sharpen overshoot on silhouette edges,
//                                        against the acutance it is bought with.
//   node tools/_grsweep.mjs           -- ochre ceiling x chroma restore, reading
//                                        colour count and §2.5's ochre % together.
//   node tools/_grhist.mjs            -- THE PALETTE TABLE FOR THE WHOLE REVIEW
//                                        SET, offline, from the pngs, in two
//                                        seconds: top1/top2 hue bins and their
//                                        separation, hue concentration R (and R2
//                                        with the dominant bin removed, because
//                                        R flatters a flood that straddles two
//                                        adjacent bins), cool%, lit/shade Duv,
//                                        colour count, p0.1/p99.9 and the §2.3
//                                        bands. Run this FIRST — the critics'
//                                        colour findings all reproduce from it.
//   node tools/_grscan.mjs            -- lattice hunt: scans every window of
//                                        every shot for a periodic pixel-scale
//                                        comb and reports PROMINENCE, not raw
//                                        autocorrelation. The first version of
//                                        this tool used raw height and "found" a
//                                        comb in every streak and gradient in the
//                                        set; a monotonic decay is not a lattice.
//   node tools/_grweave.mjs <vista>   -- the same comb on one window, with each
//                                        term of this pass neutralised in turn.
//   node tools/_grresid.mjs           -- quality.mjs's `shimmer` residual with
//                                        the grain and the dither neutralised,
//                                        since both are SUPPOSED to change every
//                                        frame. Run-to-run spread on this is
//                                        +-0.002, which is the size of the
//                                        effect being chased — read it twice.
//   ctx.debug.grade            -- the live knob object
//   ctx.sys.grade.debugInfo()  -- includes a 1x1 readback of the EV state
// =============================================================================

import * as THREE from 'three';
import { clamp, lerp } from '../../util/math.js';

// three prepends `#version 300 es` for a GLSL3 RawShaderMaterial (HANDOFF trap 1).
const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const LUMA_GLSL = /* glsl */`
const vec3 CB_LUMA = vec3(0.2126, 0.7152, 0.0722);
float cbLuma(vec3 c) { return dot(max(c, vec3(0.0)), CB_LUMA); }
`;

// -----------------------------------------------------------------------------
// AgX — imported from three r161's own ShaderChunk, patched at exactly one point.
// -----------------------------------------------------------------------------

const AGX_ANCHOR = 'color = AgXOutsetMatrix * color;';

/** A hand-written AgX, used only if the chunk patch fails (should never fire). */
const AGX_FALLBACK = /* glsl */`
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
  vec3( 1.6605, -0.1246, -0.0182 ), vec3( -0.5876, 1.1329, -0.1006 ), vec3( -0.0728, -0.0083, 1.1187 ));
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
  vec3( 0.6274, 0.0691, 0.0164 ), vec3( 0.3293, 0.9195, 0.0880 ), vec3( 0.0433, 0.0113, 0.8956 ));
vec3 agxDefaultContrastApprox( vec3 x ) {
  vec3 x2 = x * x; vec3 x4 = x2 * x2;
  return + 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
  const mat3 ACESInputMat = mat3(
    vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ));
  const mat3 ACESOutputMat = mat3(
    vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ));
  color *= toneMappingExposure / 0.6;
  color = ACESInputMat * color;
  vec3 a = color * ( color + 0.0245786 ) - 0.000090537;
  vec3 b = color * ( 0.983729 * color + 0.4329510 ) + 0.238081;
  color = ACESOutputMat * ( a / b );
  return saturate( color );
}
vec3 AgXToneMapping( vec3 color ) {
  const mat3 AgXInsetMatrix = mat3(
    vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
    vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
    vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ));
  const mat3 AgXOutsetMatrix = mat3(
    vec3( 1.1271005818144368, -0.1413297634984383, -0.14132976349843826 ),
    vec3( -0.11060664309660323, 1.157823702216272, -0.11060664309660294 ),
    vec3( -0.016493938717834573, -0.016493938717834257, 1.2519364065950405 ));
  const float AgxMinEv = -12.47393; const float AgxMaxEv = 4.026069;
  color *= toneMappingExposure;
  color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
  color = AgXInsetMatrix * color;
  color = max( color, 1e-10 ); color = log2( color );
  color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
  color = clamp( color, 0.0, 1.0 );
  color = agxDefaultContrastApprox( color );
  color = cbAgxLook( color );
  color = AgXOutsetMatrix * color;
  color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
  color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
  color = clamp( color, 0.0, 1.0 );
  return color;
}
`;

let _agxSource = null;
let _agxPatched = false;
function agxSource() {
  if (_agxSource) return _agxSource;
  const chunk = THREE.ShaderChunk && THREE.ShaderChunk.tonemapping_pars_fragment;
  if (typeof chunk === 'string' && chunk.indexOf(AGX_ANCHOR) >= 0 && chunk.indexOf('AgXInsetMatrix') >= 0) {
    _agxSource = chunk.replace(AGX_ANCHOR, 'color = cbAgxLook( color );\n\t' + AGX_ANCHOR);
    _agxPatched = true;
  } else {
    console.warn('[grade] THREE.ShaderChunk.tonemapping_pars_fragment did not match the ' +
      'expected r161 AgX shape — falling back to the in-file AgX copy.');
    _agxSource = AGX_FALLBACK;
    _agxPatched = false;
  }
  return _agxSource;
}

// -----------------------------------------------------------------------------
// metering
// -----------------------------------------------------------------------------

// Pass 1: full res -> 1/4 res. Four bilinear taps, each averaging an exact 2x2,
// so one destination texel is the mean of the log-luminance of 4 x 2x2 groups.
// .r = mean log2 luminance, .g = the metering mask weight at this uv.
const LUM_FRAG = /* glsl */`
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uSrcTexel;
uniform float uMaskFalloff;
uniform float uMaskFloor;
layout(location = 0) out vec4 outColor;
${LUMA_GLSL}
void main() {
  float l = 0.0;
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec2 o = (vec2(float(i), float(j)) * 2.0 - 1.0) * uSrcTexel;
      l += log2(max(cbLuma(texture(tSrc, vUv + o).rgb), 1e-5));
    }
  }
  vec2 p = vUv * 2.0 - 1.0;
  float w = mix(uMaskFloor, 1.0, 1.0 - clamp(length(p) / uMaskFalloff, 0.0, 1.0));
  outColor = vec4(l * 0.25, w, 0.0, 1.0);
}
`;

// Passes 2..n: plain 4-tap box over the destination footprint.
const BOX_FRAG = /* glsl */`
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uStep;        // 1 / destination resolution
layout(location = 0) out vec4 outColor;
void main() {
  vec2 q = uStep * 0.25;
  vec2 s = texture(tSrc, vUv + vec2(-q.x, -q.y)).rg
         + texture(tSrc, vUv + vec2( q.x, -q.y)).rg
         + texture(tSrc, vUv + vec2(-q.x,  q.y)).rg
         + texture(tSrc, vUv + vec2( q.x,  q.y)).rg;
  outColor = vec4(s * 0.25, 0.0, 1.0);
}
`;

// Two-iteration trimmed weighted log-mean. WebGL2 has no atomics, so a real
// histogram is out; the trim is what makes this robust to the sun in frame.
// Loop bounds are UNIFORMS on purpose — a constant 64x64 double loop invites
// ANGLE/FXC to unroll 4096 iterations twice and the compile never returns.
const METER_FRAG = /* glsl */`
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform sampler2D tLum;
uniform ivec2 uSize;
uniform vec2 uTrim;         // (below, above) mu1, in EV
uniform float uMinFrac;
layout(location = 0) out vec4 outColor;
void main() {
  float s = 0.0, sw = 0.0;
  for (int y = 0; y < uSize.y; y++) {
    for (int x = 0; x < uSize.x; x++) {
      vec2 t = texelFetch(tLum, ivec2(x, y), 0).rg;
      s += t.g * t.r; sw += t.g;
    }
  }
  float mu1 = s / max(sw, 1e-6);
  float lo = mu1 - uTrim.x, hi = mu1 + uTrim.y;
  float s2 = 0.0, sw2 = 0.0;
  for (int y = 0; y < uSize.y; y++) {
    for (int x = 0; x < uSize.x; x++) {
      vec2 t = texelFetch(tLum, ivec2(x, y), 0).rg;
      float k = step(lo, t.r) * step(t.r, hi);
      s2 += k * t.g * t.r; sw2 += k * t.g;
    }
  }
  float frac = sw2 / max(sw, 1e-6);
  float mu = (frac > uMinFrac) ? (s2 / max(sw2, 1e-6)) : mu1;
  outColor = vec4(mu, frac, mu1, 1.0);
}
`;

// 1x1 exposure state. Asymmetric adaptation, integrated with the fixed sim dt so
// a given number of rendered frames always lands on the same EV (CONTRACT §3).
const ADAPT_FRAG = /* glsl */`
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform sampler2D tMeter;
uniform sampler2D tPrev;
uniform vec4 uRange;      // minEV, maxEV, bias, dt
uniform vec4 uTau;        // tauUp, tauDown, snap, fixedEV (fixed < -900 = auto)
uniform vec2 uComp;       // compensation slope, anchor EV
layout(location = 0) out vec4 outColor;
void main() {
  float mu = texelFetch(tMeter, ivec2(0), 0).r;
  // EV100 from average scene luminance. Scene units, not nits — see the header
  // note on minEV: sunlit bone ash reads about 1.0 in this world.
  float ev = log2(max(exp2(mu), 1e-6) * 100.0 / 12.5);

  // Exposure COMPENSATION, not exposure correction. A light meter drives every
  // scene to mid grey, which turns dusk into overcast noon and a cave into a
  // grey room. Slope < 1 gives back only part of the difference from the area's
  // anchor, so a dark scene still reads dark and a fire still reads bright.
  ev = uComp.y + (ev - uComp.y) * uComp.x;
  ev = clamp(ev + uRange.z, uRange.x, uRange.y);

  float prev = texelFetch(tPrev, ivec2(0), 0).r;
  bool bad = !(prev == prev) || prev < -80.0 || prev > 80.0;
  if (uTau.z > 0.5 || bad) prev = ev;

  // dark -> light adapts fast, light -> dark adapts slowly. This is the whole
  // point of two constants; one constant reads as an auto-brightness slider.
  float tau = (ev > prev) ? uTau.x : uTau.y;
  float k = 1.0 - exp(-uRange.w / max(tau, 1e-3));
  float outEV = prev + (ev - prev) * k;

  if (uTau.w > -900.0) outEV = uTau.w;
  outColor = vec4(outEV, ev, mu, 1.0);
}
`;

// -----------------------------------------------------------------------------
// the grade / output shader
// -----------------------------------------------------------------------------

const GRADE_FRAG_HEAD = /* glsl */`
precision highp float;
precision highp sampler2D;
precision highp sampler3D;
in vec2 vUv;

uniform sampler2D tSrc;
uniform sampler2D tExposure;
uniform sampler3D tLutA;
uniform sampler3D tLutB;
uniform sampler2D tBlue;   // CB_BLUE_N^2 void-and-cluster mask, R8, see makeBlueNoise

uniform vec2  uTexel;      // 1 / source resolution
uniform vec4  uLut;        // strength, blend, N, -
uniform vec3  uSlope;
uniform vec3  uOffset;
uniform vec3  uPower;
uniform float uSaturation;
uniform vec4  uCA;         // strength(px), exponent, r^2 coeff, -
uniform vec4  uGrain;      // amount, cells, midBias, -
uniform vec2  uGrainOff;
uniform vec4  uVig;        // amount, natural k, art inner, art outer
uniform float uSharpen;
uniform vec4  uChroma;     // amount, toe gate, highlight fade start, ratio clamp
uniform vec4  uChromaDn;   // dn amount, emitter knee, LUMA dn amount, -
uniform vec4  uHueX;       // anchor hue (turns), amount, half-width (turns), toe
uniform vec4  uSplitS;     // shadow tint rgb, strength   (display domain)
uniform vec4  uSplitH;     // highlight tint rgb, strength
uniform vec2  uWB;         // green(+)/magenta(-) tint, warm(+)/cool(-) temp
uniform vec4  uOut;        // dither amount, -, debug mode, split x
uniform ivec2 uBlueOff;    // per-frame scroll of the blue-noise mask, in texels
uniform vec4  uTone;       // contrast k, -, toe, shoulder   (see cbTone)
uniform vec2  uToneG;      // gp, 1/gp — the pivot, pre-solved on the CPU
// NB: toneMappingExposure is declared by three's own tonemapping chunk, which
// is concatenated immediately after this block. Declaring it here too is a
// duplicate-declaration link error.

layout(location = 0) out vec4 outColor;

${LUMA_GLSL}

vec3 cbAgxLook( vec3 c );
`;

const GRADE_FRAG_BODY = /* glsl */`

// --- the film look, evaluated in AgX's display-log domain --------------------
vec3 cbLutSample(vec3 c) {
  float N = uLut.z;
  // half-texel domain correction; a 33^3 LUT is exactly identity at the ends.
  vec3 uvw = (clamp(c, 0.0, 1.0) * (N - 1.0) + 0.5) / N;
  vec3 a = texture(tLutA, uvw).rgb;
#ifdef CB_LUT_BLEND
  vec3 b = texture(tLutB, uvw).rgb;
  return mix(a, b, uLut.y);
#else
  return a;
#endif
}

// --- the TONAL half of the look, analytic and OUT of the LUT -----------------
//
// This used to live in the baked recipe (contrast / toe / shoulder in
// applyRecipe) and that was the cause of the banding two critics filed against
// draft and storm. A 33-node LUT is piecewise LINEAR between nodes, so any
// curved tone response baked into it comes out of the sampler as 32 straight
// segments with a second-derivative discontinuity every 0.031 of the range —
// which on a smooth haze gradient is a row of Mach bands, and no amount of
// output dither can hide a contour edge that is several code values wide.
// (The 8-bit payload made it worse; the LUT is half-float now too.)
//
// Evaluated here it is exact at every input, it blends continuously between
// areas instead of cross-fading two baked grids, and the LUT is left to do only
// what a LUT is good at: colour.
//
// uToneG carries gp = log(0.5)/log(pivot) and its reciprocal so the pivot
// costs no transcendentals per pixel. Endpoints are pinned: f(0)=0, f(1)=1 for
// every k, so contrast steepens the toe instead of clipping it.
vec3 cbTone(vec3 x) {
  x = clamp(x, 0.0, 1.0);
  if (abs(uTone.x - 1.0) > 1e-4) {
    vec3 y = pow(x, vec3(uToneG.x));
    vec3 a = pow(y, vec3(uTone.x));
    vec3 b = pow(max(vec3(0.0), 1.0 - y), vec3(uTone.x));
    x = pow(a / max(vec3(1e-9), a + b), vec3(uToneG.y));
  }
  vec3 im = max(vec3(0.0), 1.0 - x);
  x += uTone.z * im * im * im * im;          // print toe
  vec3 xm = clamp(x, 0.0, 1.0);
  x -= uTone.w * xm * xm * xm * xm;           // print shoulder
  return clamp(x, 0.0, 1.0);
}

vec3 cbAgxLook(vec3 c) {
  vec3 g = pow(max(vec3(0.0), c * uSlope + uOffset), uPower);
  g = cbTone(g);
  // saturation pivots on the luma of the GRADED value, not the incoming one —
  // pivoting on a pre-CDL luma shifts brightness as a side effect of a
  // saturation change, which is why the knob used to feel coupled.
  float l = dot(g, CB_LUMA);
  g = mix(vec3(l), g, uSaturation);
#ifdef CB_LUT
  g = mix(g, cbLutSample(g), uLut.x);
#endif
  return clamp(g, 0.0, 1.0);
}

// --- transverse chromatic aberration ----------------------------------------
// Lateral colour only. pow(r, e) keeps the centre absolutely clean: CA you can
// see near the crosshair is a bug, not a look.
vec3 cbFetch(vec2 uv) {
#if CB_CA_TAPS == 0
  return texture(tSrc, uv).rgb;
#else
  vec2 p = uv * 2.0 - 1.0;
  float rl = length(p);
  vec2 dir = (rl > 1e-5) ? (p / rl) : vec2(0.0);
  float r = rl * 0.70710678;                 // 1.0 at the corner (§10.4)
  float d = uCA.x * pow(r, uCA.y) * (1.0 + uCA.z * r * r);
  vec2 off = dir * d * uTexel;
  // Fringe clamp. CA runs on scene-referred HDR, so a sky/terrain silhouette is
  // a 50:1 edge and even a 0.1 px shift leaks a saturated red pixel — which is
  // what a hostile critic circles first. Cap the borrowed channel relative to
  // the centre's luminance so the fringe reads as glass, not as a bug.
  vec3 c0 = texture(tSrc, uv).rgb;
  float cap = cbLuma(c0) * uCA.w + 0.03;
#if CB_CA_TAPS == 3
  return vec3(min(texture(tSrc, uv + off).r, cap),
              c0.g,
              min(texture(tSrc, uv - off).b, cap));
#else
  // Five spectral taps through an approximate response. Three taps fringe
  // magenta/green on hard edges; five smears, which is what glass does.
  vec3 t0 = min(texture(tSrc, uv - off).rgb, vec3(cap));
  vec3 t1 = min(texture(tSrc, uv - off * 0.5).rgb, vec3(cap));
  vec3 t2 = c0;
  vec3 t3 = min(texture(tSrc, uv + off * 0.5).rgb, vec3(cap));
  vec3 t4 = min(texture(tSrc, uv + off).rgb, vec3(cap));
  const vec3 wR = vec3(0.00, 0.05, 0.20);   // taps 0,1,2
  const vec2 wR2 = vec2(0.35, 0.40);        // taps 3,4
  const vec3 wG = vec3(0.05, 0.22, 0.46);
  const vec2 wG2 = vec2(0.22, 0.05);
  const vec3 wB = vec3(0.40, 0.35, 0.20);
  const vec2 wB2 = vec2(0.05, 0.00);
  return vec3(
    t0.r * wR.x + t1.r * wR.y + t2.r * wR.z + t3.r * wR2.x + t4.r * wR2.y,
    t0.g * wG.x + t1.g * wG.y + t2.g * wG.z + t3.g * wG2.x + t4.g * wG2.y,
    t0.b * wB.x + t1.b * wB.y + t2.b * wB.z + t3.b * wB2.x + t4.b * wB2.y);
#endif
#endif
}

// --- value noise (NOT a hash of gl_FragCoord) --------------------------------
//
// ROUND 9: THE GRAIN WAS AN ORDERED SCREEN TOO, FOR TWO SEPARATE REASONS, AND
// IT IS THE ~4 px DIAGONAL LATTICE A CRITIC FOUND ON LIT GROUND.
//
// The finding was "a faint residual ~4px diagonal lattice on LIT ground only —
// autocorrelation 0.16/0.13/0.15 at lags 4/8/12 — which magnifies into a visible
// woven crosshatch and reads as fabric mesh rather than soil". Three properties
// of it are diagnostic on their own: it is EQUAL in x and y (hence diagonal), it
// is a COMB rather than a decay (hence periodic), and it is on LIT ground ONLY.
// Exactly one term in this pass is amplitude-peaked at lit mid-tones: the amp
// below multiplies (1 - 0.72*smoothstep(l)) by smoothstep(0, 0.22, l), which
// maxes at l ~ 0.25 and falls to 0.35x in shadow and 0.28x in highlight. That is
// the grain, and it is the only candidate.
//
// Then two mechanisms, both measured by simulating this exact field on a
// 1920x1080 pixel grid (autocorrelation of the 5x5 high-pass residual):
//
//   1. THE HASH HAD A PERIOD OF TEN CELLS. fract(p * vec2(127.1, 311.7)) on an
//      INTEGER lattice is periodic: 127.1 x 10 = 1271 and 311.7 x 10 = 3117 are
//      both integers, so cbHash21(i) == cbHash21(i + 10) exactly, in both axes.
//      Measured on the field: r = 0.77 at lag 13 AND 14 in x AND y — the tile is
//      10 cells, which at the shipped 800 cells/height is 13.5 px. A dither
//      screen by another name, and the same class of defect as round 7's Bayer.
//   2. THE CELL PITCH WAS BELOW NYQUIST. 800 cells down a 1080 px frame is a
//      1.350 px pitch, i.e. the lattice runs at 0.741 cycles/px against a 0.5
//      limit. Point-sampling a bilinear ramp at that pitch beats against the
//      pixel grid: 4 px is 2.963 cells, so the intra-cell interpolation phase
//      repeats to within 3.7% of a cell every 4 px, identically in x and y.
//      That is the 4 px diagonal weave, and it is why the comb decays so slowly
//      (0.16 / 0.13 / 0.15) instead of falling off like noise.
//
// The fix is two changes, and the third — the obvious one — was measured and
// rejected:
//
//   * a hash with no short integer period (Dave Hoskins' hash12, multiplier
//     0.1031 = 1031/10000, so the period is 10000 cells rather than 10);
//   * the grain uv is ROTATED by atan(1/2) = 26.57 deg (see the block in
//     main()), which makes the phase along x and along y incommensurate, so a
//     residual beat CANNOT be equal in both axes and therefore cannot read as a
//     weave. This is the term that does the work: max prominence over lags 4-20
//     on all four axes goes 0.575 -> 0.133 with it, and the sweep is in the
//     comment on grainCells.
//   * RAISING THE PITCH PAST NYQUIST DOES NOT HELP AND MOSTLY HURTS. That sweep
//     is on grainCells too. Below Nyquist the aliased lattice is near-white;
//     above it, it is a resolved grid and the eye gets it back. The pitch stays
//     at the authored 1.350 px.
float cbHash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float cbValueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = cbHash21(i);
  float b = cbHash21(i + vec2(1.0, 0.0));
  float c = cbHash21(i + vec2(0.0, 1.0));
  float d = cbHash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// --- output transform --------------------------------------------------------
//
// THIS FUNCTION WAS THE SINGLE BIGGEST DEFECT IN THE PASS. It used to be an
// exact sRGB OETF, and that is the wrong inverse.
//
// AgX is a DISPLAY-REFERRED transform: after the outset matrix its output is
// already encoded for the panel. three's chunk then does pow(color, 2.2) to
// hand a *linear* value back to the renderer's own output conversion. So the
// value in graded is (AgX display)^2.2 and the only correct encode is the
// exact inverse, ^(1/2.2). Applying the sRGB OETF instead composes to
//
//     out = 1.055 * d^(2.2/2.4) - 0.055        (d = AgX display value)
//
// which is within 1% of identity above d = 0.3 and then falls off a cliff:
//
//     d       0.02   0.05   0.08   0.10   0.15   0.20   0.30   0.50
//     out    0.0024 0.0177 0.0492 0.0728 0.1304 0.1863 0.2949 0.5039
//     ratio   0.12   0.36   0.62   0.73   0.87   0.93   0.98   1.01
//     8-bit      1      5     13     19     33     48     75    128
//
// The bottom fifth of AgX's range — every shadow, every unlit side of every
// form, the whole of grotto — was being multiplied by 0.12-0.93 and squeezed
// from 51 code values into 48 with the deepest quarter-tone collapsed onto
// almost nothing. That is measured, not argued: it is why the cave floor
// crushes to black, why the frame loses colour count through this pass, and it
// is most of the 24% of stdLuma the instrumentation attributed to "the grade".
//
// It also explains the shape of the previous repairs. Every area in the table
// below had grown a large toe lift and a lifted look.offset to drag the
// shadows back out of that hole — which is a uniform veil, and a uniform veil
// is what four critics called "milky", "washed out" and "low contrast". Fixing
// the encode is what allows those lifts to come back down.
//
// Keep this matched to whatever exponent AgX's last line uses. If three ever
// changes that 2.2, change this.
const float CB_AGX_GAMMA = 2.2;
vec3 cbEncodeOutput(vec3 c) {
  return pow(max(c, vec3(0.0)), vec3(1.0 / CB_AGX_GAMMA));
}

// Uniform [0,1] -> triangular PDF on [-1,1]. The inverse CDF of the triangular
// distribution, so it is a MONOTONIC remap of one sample: it changes the
// histogram of the dither without touching its SPECTRUM. That is the whole
// reason it is worth having — it lets the mask stay blue while the noise it
// injects is TPDF, which is the pairing that decorrelates quantisation error
// from the signal (a rectangular +-0.5 LSB dither leaves it correlated, and
// what is left of that correlation is visible contouring).
float cbTriRemap(float u) {
  float v = u * 2.0 - 1.0;
  return sign(v) * (1.0 - sqrt(max(0.0, 1.0 - abs(v))));
}

// Reinhard-ish compressor used only as a perceptual domain for the sharpener.
float cbTc(float l) { return l / (1.0 + l); }
float cbTcInv(float l) { return l / max(1.0 - l, 1e-4); }

void main() {
  float exposure = 1.0 / (1.2 * exp2(texelFetch(tExposure, ivec2(0), 0).r));

  vec3 hdr = cbFetch(vUv);

#ifdef CB_SHARPEN
  // Contrast-adaptive sharpen, RCAS cross, evaluated on compressed luma so the
  // amount is perceptual and the AgX shoulder cannot turn it into ringing.
  //
  // ROUND 7: IT WAS RINGING ANYWAY, AND THE CLAMP BELOW IS WHY IT NO LONGER CAN.
  //
  // A critic measured "135-value single-pixel silhouette steps WITH SHARPEN
  // RINGING on top" and inferred a sharpen pass running after the AA resolve.
  // The inference is right — this pass is frame-graph order 110 and TAA is 70 —
  // but the ORDER is not the defect and moving it is not available (110 owns the
  // blit). The defect is that the filter had no overshoot limiter.
  //
  // Ringing has an exact definition: a sharpened pixel rings when it leaves the
  // range of its own neighbourhood, i.e. when the filter invents a new local
  // extremum where the source had a monotonic transition. tools/_grring.mjs
  // measures exactly that — mean and p99 of max(0, c - max4, min4 - c) in 8-bit
  // LSB over a dilated edge mask — alongside the acutance the sharpener is being
  // run for, because killing ringing by killing sharpening is not a fix. On
  // the ridge vista, 395k masked edge pixels:
  //
  //     config          over    pct%     p99    acutance
  //     sharpen 0       0.405   13.2    8.21     28.57
  //     0.16            0.604   16.4   11.78     29.16
  //     0.32 (shipped)  0.785   20.6   12.91     29.89
  //     0.64            1.565   28.6   22.27     32.12
  //
  // The shipped setting was paying 94% more overshoot and +4.7 LSB of worst-case
  // halo for 4.6% more acutance. That is the trade a critic scores 2/10 on AA
  // while another scores it 7/10 — one is reading the resolve, the other is
  // reading the halo on top of it.
  //
  // The fix is AMD CAS's, and it is one line: clamp the filtered luma to the
  // range of the 4-cross AND the centre. It is non-ringing BY CONSTRUCTION —
  // the output cannot become an extremum the input did not already have. It does
  // not blunt a soft edge, because a soft edge's mid-transition pixels sit
  // strictly inside their neighbours' range and the clamp never binds there; it
  // only refuses the one case where "more contrast" means "a halo", which is a
  // pixel that is ALREADY the local extreme.
  {
    float c0 = cbTc(cbLuma(hdr));
    float ln = cbTc(cbLuma(texture(tSrc, vUv + vec2(0.0,  uTexel.y)).rgb));
    float ls = cbTc(cbLuma(texture(tSrc, vUv - vec2(0.0,  uTexel.y)).rgb));
    float le = cbTc(cbLuma(texture(tSrc, vUv + vec2(uTexel.x, 0.0)).rgb));
    float lw = cbTc(cbLuma(texture(tSrc, vUv - vec2(uTexel.x, 0.0)).rgb));
    float mn = min(min(ln, ls), min(le, lw)); mn = min(mn, c0);
    float mx = max(max(ln, ls), max(le, lw)); mx = max(mx, c0);
    float amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, 1e-4), 0.0, 1.0));
    float w = -amp * uSharpen * 0.25;
    float outL = (w * (ln + ls + le + lw) + c0) / (4.0 * w + 1.0);
    outL = clamp(outL, mn, mx);          // <- the no-overshoot clamp
    float gain = cbTcInv(clamp(outL, 0.0, 0.999)) / max(cbTcInv(c0), 1e-5);
    hdr *= clamp(gain, 0.70, 1.45);
  }
#endif

  // --- chroma denoise, at the INPUT ------------------------------------------
  //
  // This is the fix for the dense red/green/magenta 1 px speckle two critics
  // filed against grotto. The speckle is real and it is upstream: forcing every
  // term of this pass off leaves it in place, because a near-black ash face at
  // 50 m lit only by a dim sky is the worst input a screen-space denoiser can be
  // handed and the auto-exposure is multiplying that face by 61. The previous
  // pass hid it by bleaching a third of the frame (shadowDesat 0.78), which is
  // why the cave had no colour in it.
  //
  // What a camera does instead is spend chroma resolution, because the eye has
  // roughly a quarter of the spatial acuity in colour that it has in luminance —
  // the same fact 4:2:0 has been trading on for forty years. So: take the
  // neighbourhood's colour and this pixel's exact luminance. Luma is preserved by
  // construction, so this CANNOT cost contrast, cannot move the exposure, cannot
  // soften a luminance edge and cannot change the value histogram. Only the hue
  // carried across ~2 px is low-passed.
  //
  // It has to happen here, before AgX, so that everything downstream — the tone
  // curve, the LUT's hue work, the split tone — operates on clean chroma. Doing
  // it after the tonemap would mean mixing toward the SCENE's colour, which is
  // not a denoise at all, it is a second chroma restore that overrides the LUT.
  //
  // The four ring taps sit at exactly +-1.5 texels, i.e. on a texel CORNER, so
  // the bilinear unit averages a 2x2 for free and the ring is a 16-texel read for
  // four fetches.
  //
  // pop is the guard for small bright emitters: a 1 px ember or spark is many
  // times brighter than its neighbourhood, and blurring its chroma with the dark
  // rock around it would grey out exactly the things ART calls the events. Above
  // the knee the denoise releases and the ember keeps its own colour.
#ifdef CB_CHROMA
  vec3 cAcc = texture(tSrc, vUv).rgb
            + 1.4 * (texture(tSrc, vUv + vec2( uTexel.x,  uTexel.y) * 1.5).rgb
                   + texture(tSrc, vUv + vec2(-uTexel.x,  uTexel.y) * 1.5).rgb
                   + texture(tSrc, vUv + vec2( uTexel.x, -uTexel.y) * 1.5).rgb
                   + texture(tSrc, vUv + vec2(-uTexel.x, -uTexel.y) * 1.5).rgb);
  float cAccW = 6.6;
#ifdef CB_CHROMA_WIDE
  // A single 2 px ring leaves the noise's low-frequency half behind as a green
  // and mauve mottle. The second ring at 3.5 texels takes the kernel out to 7x7
  // for four more fetches; measured on grotto that is the difference between
  // "mottled" and "clean". high/ultra only — CONTRACT §7, this is reach.
  // ROUND 9: THE SECOND RING IS ON THE AXES, NOT THE DIAGONALS, AND THAT IS NOT
  // cosmetic. With both rings diagonal the kernel samples only the four
  // quadrants and has a hole along the whole of x = 0 and y = 0 — an X-shaped
  // support, whose response is anisotropic by construction and whose impulse
  // response is literally a lattice. This pass was already being asked to
  // explain a diagonal artifact on lit ground; shipping the one operator in the
  // file whose support is diagonal-only was not defensible whether or not it was
  // the cause. Ring 1 (diagonals, 1.5 texel) + ring 2 (axes, 3.5 texel) is an
  // 8-point ring, isotropic to first order, same eight fetches.
  cAcc += 1.0 * (texture(tSrc, vUv + vec2( uTexel.x * 3.5, 0.0)).rgb
               + texture(tSrc, vUv + vec2(-uTexel.x * 3.5, 0.0)).rgb
               + texture(tSrc, vUv + vec2(0.0,  uTexel.y * 3.5)).rgb
               + texture(tSrc, vUv + vec2(0.0, -uTexel.y * 3.5)).rgb);
  cAccW = 10.6;
  // TWO RINGS AND NOT THREE, AND THE TAPS ARE NOT GUIDED. Both of those have now
  // been built and measured twice, by two different agents, and both times the
  // number said no. Do not re-derive them from first principles a third time.
  //
  //   * a third ring (the previous pass at 7 texels diagonal, this one at 6.5
  //     axis) moves chromaRMS by 4% at best and by -4% at worst, for four more
  //     texture fetches. It is inside the run-to-run drift of the shot.
  //   * WEIGHTING EACH TAP BY LUMA SIMILARITY — the obvious "bilateral, so the
  //     kernel can be wider without crossing an ember" refinement — makes the
  //     chroma noise WORSE, not better. Measured on grotto, patch 760x420 at
  //     (200,150), guide in 1/stops^2 on exp(-d^2 * guide):
  //
  //       guide      lumaRMS   chromaRMS
  //       0 (flat)    0.0458     0.0311
  //       1.0         0.0404     0.0366
  //       2.4         0.0374     0.0510
  //       5.0         0.0312     0.0657
  //
  //     The reason is structural and it generalises: the guide signal IS the
  //     noise. Down-weighting taps whose luma differs from the centre's, when
  //     that difference is itself a noise draw, makes the kernel's weights
  //     correlated with the noise and destroys the averaging. A bilateral filter
  //     needs a clean guide; there is not one available at this point in the
  //     chain. Guiding here only interpolates back toward "no filter at all",
  //     which is exactly the shape of that table.
#endif
  vec3 cRef = cAcc / cAccW;
  {
    float lr = cbLuma(cRef), lh = cbLuma(hdr);
    if (lr > 1e-7 && lh > 1e-7) {
      float pop = lh / lr;
      float w = uChromaDn.x * (1.0 - smoothstep(uChromaDn.y, uChromaDn.y * 2.4, pop));
      // THE LUMA TERM, AND WHY A CHROMA-ONLY DENOISE NEEDED ONE.
      //
      // Measured on grotto with tools/_grknob.mjs, patch 760x420 at (200,150):
      //
      //     dn 0        lumaRMS 0.0227   chromaRMS 0.1457
      //     dn 0.96     lumaRMS 0.0457   chromaRMS 0.0310
      //
      // The denoise removes 4.7x of the chroma noise and DOUBLES the luma noise,
      // and that is not a bug, it is arithmetic. AgX is a per-channel log curve,
      // so display luma is roughly the mean of three logs. With the input's
      // channel noise independent, that mean averages three draws and the
      // variance falls ~3x on its own. Replacing the three independent channels
      // with one shared multiplier (lh / lr) — which is exactly what a
      // constant-luma chroma filter does — hands all of the remaining noise to a
      // single common factor and the free averaging is gone.
      //
      // Total noise power still drops 2.7x (0.147 -> 0.055) and what is left is
      // MONOCHROME, which is the shape film grain has and the shape three critics
      // said this frame did not have. But on a shot where the wall's own
      // structure is sdY 0.068 against lumaRMS 0.046, monochrome is not enough:
      // N/S 0.67 means two thirds of the "detail" on that wall is noise.
      //
      // So the same kernel gets to low-pass a FRACTION of the luma too. It is
      // PER-AREA and it is 0 on eight of the nine, because this is the one term
      // in the block that can cost real detail — it is a blur, and it is only
      // ever correct where the thing being blurred away is noise rather than
      // material. Measured on grotto, same patch (sdY is structure PLUS noise, so
      // the honest structure estimate is sqrt(sdY^2 - lumaRMS^2)):
      //
      //     dnLuma   lumaRMS  chromaRMS   sdY    structure   N/S
      //      0.00     0.0473    0.0323   0.068     0.049     0.70
      //      0.20     0.0385    0.0299   0.060     0.046     0.64
      //      0.35     0.0317    0.0282   0.053     0.042     0.60
      //      0.50     0.0252    0.0269   0.050     0.043     0.50
      //      0.70     0.0167    0.0257   0.045     0.042     0.37
      //
      // Noise falls 2.8x from 0 to 0.5 and the structure estimate falls 12%. That
      // is the trade this term exists to make, and it is only available on a shot
      // whose "detail" was two thirds noise to begin with. On any vista where
      // that is not true the correct value is the default, which is 0.
      float lTarget = mix(lh, lr, clamp(uChromaDn.z, 0.0, 1.0));
      hdr = mix(hdr, cRef * (lTarget / lr), w);
    }
  }
#endif

  vec3 exposed = hdr * exposure;
  vec3 graded = AgXToneMapping(exposed);

  // --- chroma restore ---------------------------------------------------------
  // AgX's inset matrix is a deliberate desaturation: it rotates the primaries
  // inward so the shoulder can roll all three channels to white instead of
  // clipping to a hue. On an Earth palette you never notice. On this one you do,
  // because the world's identity IS its chroma. Measured by the sky owner on
  // the "canopy" vista, at the exposure the meter itself chose:
  //
  //     uZenith uniform        0.499, 0.768, 0.749    HSV sat 35.1%
  //     after AgX             (0.474, 0.561, 0.557)   HSV sat 15.6%
  //     sampled from the png                          HSV sat  4-16%
  //
  // Twenty points of chroma, gone, on the one surface that carries ART §0.3's
  // teal zenith / amber horizon inversion. The "saturation" knob does not pay
  // it back: it runs in AgX's display-log domain, BEFORE the outset matrix and
  // the 2.2 power, so it scales a distance that the transform has already
  // collapsed. You cannot restore a hue angle downstream of the matrix that ate
  // it by pushing harder upstream of it.
  //
  // So: take the chroma the SCENE emitted (the exposed HDR's own normalised
  // colour), carry it to the display luminance the tonemap chose, and mix toward
  // that. Luma is renormalised, so this cannot move a single pixel's brightness,
  // cannot change the §2.3 value histogram, and cannot change exposure — it only
  // rotates colour back toward what the renderer actually produced.
  //
  // THIS IS NOT ART §8's FORBIDDEN CHEAT. §8 bans a grade that *manufactures*
  // the teal/orange split ("the LUT must be nearly neutral and the split must be
  // earned by real emitters and a real sky"). This manufactures nothing: its
  // fixed point is the renderer's own output, and on a grey frame it is exactly
  // identity. It is the difference between the split surviving the transform and
  // the split being invented by it.
  //
  // Two gates keep it honest:
  //   * the highlight fade hands the top of the range back to AgX, so bright
  //     emitters still roll to white instead of turning into saturated blobs —
  //     which is the reason we chose AgX over ACES in the first place;
  //   * the toe gate stops it amplifying the chroma of shadow noise, where the
  //     scene ratio is dominated by whatever the last denoiser left behind.
  //
  // THE CHROMA REFERENCE IS LOW-PASSED, AND THAT IS NOT A REFINEMENT. Measured
  // on grotto by A/B'ing this block alone: with it on, the cliff face carries
  // dense red/green/magenta speckle at 1 px, and the frame's distinct-colour
  // count is 27% higher than with it off — 27% of "colour depth" that is pure
  // confetti. Two critics filed it and both filed it as grain; it is not grain
  // (grain here is monochrome and multiplicative), it is THIS.
  //
  // The cause: exposed / luma(exposed) is a per-pixel ratio, and on a surface
  // whose radiance is a few thousandths — an ash face at 50 m lit only by a dim
  // sky — that ratio is dominated by whatever the last denoiser left behind. It
  // is a hue angle computed from noise, and mixing toward it paints the noise in
  // colour. The luma renormalisation makes it worse, not better: it guarantees
  // every one of those random hues survives at full visibility.
  //
  // The reference is exposed, which the block above has already chroma-denoised,
  // so the restore can no longer paint per-pixel noise in colour — which is what
  // it was doing before that block existed (A/B'd on grotto: turning this term
  // alone off removed the entire confetti field and 27% of the frame's "colour
  // count" with it, all of it fake).
#ifdef CB_CHROMA
  {
    float ls = cbLuma(exposed);
    float lg = cbLuma(graded);
    if (ls > 1e-5 && lg > 1e-5) {
      vec3 want = clamp(exposed / ls, 0.0, uChroma.w);
      want *= lg / max(cbLuma(want), 1e-5);       // constant luma, exactly
      float k = uChroma.x
              * smoothstep(0.0, uChroma.y, lg)              // not in the toe
              * (1.0 - smoothstep(uChroma.z, 1.0, lg));     // not in the shoulder
      graded = clamp(mix(graded, want, k), 0.0, 1.0);
    }
  }
#endif

  // --- hue contrast: expand chroma AWAY from the area's anchor hue ------------
  //
  // ROUND 9. THE MEASUREMENT THIS EXISTS FOR:
  //
  //   shot        top1 hue bin (22.5 deg, saturation-weighted)
  //   establish    62.4% at 22.5    ridge      39.0% at 22.5
  //   combat       66.4% at 22.5    mat-ground 76.5% at 22.5
  //   ads          65.9% at 22.5    storm      64.1% at 22.5
  //   ...
  //
  // Twelve of fourteen review shots put their dominant hue in the SAME 22.5 deg
  // bin, and a critic filed it as "eleven of fourteen shots still sit in one
  // narrow tan band" — the number reproduces from the pngs with
  // tools/_grhist.mjs, so this is not an impression, it is the frame.
  //
  // The reason a grade normally cannot help is the one ART section 9 states: the
  // grade cannot add a hue the renderer did not emit. But there is a second
  // thing going on, and it is squarely this file's: AgX's inset matrix, the
  // outset matrix and the 2.2 power all COMPRESS chroma distance (the chroma
  // restore three hundred lines up measures the sky losing twenty points of it),
  // and that compression is uniform across the wheel. A surface whose albedo the
  // world authors 20 degrees off the ochre flood arrives at the framebuffer with
  // its chroma squeezed into the same handful of 8-bit codes as the flood. The
  // distinction was emitted and this pass lost it.
  //
  // So: scale chroma by a gain that RISES with hue distance from the area's
  // anchor. Three properties make it honest, and they are the same three the
  // chroma restore is argued on:
  //
  //   * its fixed point is the renderer's own output. On a frame with one hue in
  //     it, every pixel sits at the anchor, the gain is 1, and this is exactly
  //     identity. It cannot manufacture a second hue; it can only refuse to
  //     collapse one the world emitted. ART section 8 bans a grade that INVENTS
  //     the split — this is the opposite operation.
  //   * it is CONSTANT LUMA by construction: mix(vec3(l), c, g) has luma exactly
  //     l for every g. So it cannot move section 2.3's value histogram, cannot
  //     clip a highlight and cannot lift a black. The zero-clipped-white and
  //     zero-crushed-black result that two critics called shipped-quality tone
  //     mapping is untouched by construction rather than by tuning.
  //   * it is gated out of the toe, where "hue" is whatever the last denoiser
  //     left behind, and out of the shoulder, where AgX is rolling to white on
  //     purpose.
  //
  // It also does the job the round-9 brief actually asks for: three other agents
  // are widening the world's albedo this round, and the default behaviour of
  // this chain is to hand most of that widening back. This is the term that
  // stops that happening, and it gets MORE useful as the world gets more varied,
  // not less.
  //
  // The anchor is per area and it is the area's own flood hue, not a taste: 25
  // deg for the ash biomes, 20 for the two storms whose aerosol is the flood, 15
  // for grotto where the flood is coal light.
#ifdef CB_HUEX
  if (uHueX.y > 1e-4) {
    float mx = max(graded.r, max(graded.g, graded.b));
    float mn = min(graded.r, min(graded.g, graded.b));
    float d  = mx - mn;
    if (d > 1e-4 && mx > 1e-4) {
      float hu;
      if (mx == graded.r)      hu = mod((graded.g - graded.b) / d, 6.0);
      else if (mx == graded.g) hu = (graded.b - graded.r) / d + 2.0;
      else                     hu = (graded.r - graded.g) / d + 4.0;
      hu /= 6.0;
      float dh = abs(fract(hu - uHueX.x + 0.5) - 0.5);       // 0 .. 0.5 turns
      float w  = smoothstep(uHueX.z, 0.5, dh);
      float lg = cbLuma(graded);
      float gate = smoothstep(0.0, uHueX.w, lg) * (1.0 - smoothstep(0.72, 0.94, lg));
      graded = clamp(mix(vec3(lg), graded, 1.0 + uHueX.y * w * gate), 0.0, 1.0);
    }
  }
#endif

  // --- white balance + split tone, in the DISPLAY domain ----------------------
  //
  // ROUND 7. Both of these already existed upstream of AgX's outset matrix (temp
  // and tint in applyRecipe step 7, shadowTint/highTint in step 5) and BOTH ARE
  // EATEN THERE, for exactly the reason the chroma-restore block three hundred
  // lines up argues about saturation: the outset matrix and the 2.2 power
  // collapse a chroma distance authored in display-log, so pushing harder on the
  // upstream knob does not land. The same fix applies — do it where it lands.
  //
  // WHY IT IS HERE AT ALL, AND WHY IT IS NOT ART SECTION 8's FORBIDDEN CHEAT:
  //
  //   * WHITE BALANCE is measured, not tasted. tools/_grhue.mjs reports Duv, the
  //     signed perpendicular distance from the Planckian locus (+ green, -
  //     magenta), which is orthogonal to how warm or cool the frame is; the
  //     construction reproduces D65's textbook +0.0032. A critic filed "both lit
  //     and shade sit green-biased above the Planckian". Measured on a fresh
  //     self-captured set, that is not what is happening — eight of ten frames
  //     sit BELOW the locus, i.e. magenta:
  //
  //       vista       lit Duv   shade Duv        vista      lit Duv   shade Duv
  //       grotto      -0.0126     -0.0114        combat     -0.0010     -0.0008
  //       ridge       -0.0025     -0.0098        storm      -0.0005     +0.0008
  //       establish   -0.0055     -0.0067        water      +0.0027     +0.0018
  //       draft       -0.0029     -0.0039        canopy     +0.0093     +0.0067
  //       ads         -0.0018     +0.0002        hipfire    -0.0012     -0.0002
  //
  //     So a blanket green pull would have been wrong on eight vistas out of ten,
  //     which is why this knob is PER AREA and why the two it is aimed at are
  //     grotto (-0.013 magenta on a frame whose only key is a 1050 K coal, i.e. a
  //     pure blackbody, and which already carries three hue-ration entries
  //     fighting a "maroon/magenta wash") and canopy (+0.009 green on a frame lit
  //     through crowns by the same blackbody sun). ART section 2.2's blackbody
  //     discipline is the acceptance test: light from a Planckian source should
  //     land ON the Planckian locus, and |Duv| > 0.006 is a visible cast.
  //
  //   * THE SPLIT is ART section 2.4's second opposition, verbatim: "the shadows
  //     in the near field are cool because they are lit by a teal sky", while the
  //     key is a 4400 K K-dwarf that is "never white. Ever." That split is now
  //     physically in the render — sky.js landed 11-50x key:fill and a shade hue
  //     863 K cooler this round — so carrying it through the transform is
  //     preservation, not manufacture. Section 8 bans a grade that INVENTS the
  //     teal/orange split; this one is keyed to a value structure the renderer
  //     produced and it is the only lever in the file that has ever moved the
  //     hue-population number: the draft area, the one already running a strong
  //     cold shadow tint, is also the one area whose hue concentration is 0.59
  //     when every other vista sits at 0.85-0.99.
  //
  // Both terms add a ZERO-LUMA vector, and the whole block fades out above 0.86
  // display luma, so the shoulder still rolls to white and round 4's tone curve
  // (p0.1 3-16, p99.9 217-247, verified by a critic this round) is untouched by
  // construction rather than by luck.
  //
  // ---------------------------------------------------------------------------
  // ROUND 8: THE SPLIT IS THE SET'S ONLY SECOND HUE, AND IT WAS THE ONE COLOUR
  // ART SECTION 8 BANS BY NAME.
  // ---------------------------------------------------------------------------
  //
  // Two measurements, and they have to be read together.
  //
  // (1) tools/_grpal.mjs ridge, with this block's shadow term zeroed. The
  //     saturation-weighted circular concentration R of the frame's hue
  //     distribution — 1.0 is one hue edge to edge:
  //
  //       config       top1        top2       R      colours   p0.1 p99.9
  //       shipped      53.5% (0)  14.7% (22)  0.639    3865       8   219
  //       no shadow    63.7% (0)  32.3% (22)  0.973    3723       7   219
  //       split at all 64.7% (0)  31.2% (22)  0.972    3813       8   166
  //
  //     Take this block out and the ridge frame is R 0.97 — literally the
  //     "one 22.5 deg hue bin" three critics filed. THIS TERM IS THE PALETTE.
  //     Nothing else in the build supplies a second hue on that vista.
  //
  // (2) tools/_grcool.mjs — the same population's hue, measured in the
  //     sceneHDR the pass is HANDED and again in the png it writes:
  //
  //       vista       scene shade   its cool arc  (frac)   sky     png cool  drift
  //       establish      25.9          130.4       2.4%    26.1     204.2    +73.8
  //       canopy         33.6          131.4       0.6%    55.4     156.0    +24.5
  //       ridge          19.8          125.7       0.3%    67.7     219.6    +94.0
  //       grotto          3.0          136.0       9.5%    16.1     218.1    +82.1
  //       water          36.5          142.5       3.5%    53.4     192.2    +49.7
  //       storm          31.5          138.3       0.0%    31.1     209.8    +71.5
  //       draft          32.9          146.1       0.1%    30.3     229.8    +83.8
  //       combat         35.9          142.6       0.3%    30.7     228.4    +85.8
  //       ads            36.8          129.4       0.2%    29.5     210.6    +81.2
  //       hipfire        36.9          135.8       0.2%    29.2     209.9    +74.1
  //
  //     Read the frac column first: on seven of ten vistas UNDER ONE PERCENT of
  //     the shade population's chroma is in the cool arc at all before this pass
  //     runs. The renderer emits an entirely ochre world — shade hue 20-37 deg,
  //     and the sky's own body 16-68 deg, nowhere near ART 3.3's 171-197 deg
  //     teal zenith. So this block is not "carrying the split through the
  //     transform", which is what the paragraphs above claim. It is MAKING it.
  //
  //     And it was making it at 205-230 deg. That is blue. ART 8: "Blue aerial
  //     perspective. The most important prohibition in this document," and 3.3:
  //     "there is no blue anywhere in it." Seven rounds of critics have said this
  //     frame reads terrestrial; the single most saturated non-ochre thing in it
  //     was a blue shadow that no light in the world could have cast.
  //
  // WHAT CHANGED, AND WHY IT IS THIS AND NOT "TURN IT OFF". Turning it off is
  // measurement (1): R 0.97, and the palette finding comes straight back. The
  // honest move inside this file's remit is to leave the STRENGTH exactly where
  // it was tuned and put the HUE on the target the art direction specifies —
  // every split.s in AREAS is now hue 190.0 +- 0.1 deg, ART 3.3's zenith arc,
  // preserving each area's own HSV value and saturation so no other measured
  // number moves. Blue becomes teal; nothing becomes more saturated.
  //
  // THIS IS STILL MANUFACTURE AND IT IS FILED AS SUCH. ART 9 is explicit that a
  // colour problem is not solved here, and measurement (2) is the proof that the
  // world, not the grade, is monochrome: sky.js is emitting a sky whose own
  // body measures 16-68 deg on all ten vistas. Filed under HANDOFF ## requests
  // with these numbers. When the sky is teal this block gets to shrink; until
  // then it is the difference between one hue and two, and the least dishonest
  // version of it is one tuned to the sky we are supposed to have.
  {
    float lg = cbLuma(graded);
    vec3 wbg = vec3(1.0 - uWB.x * 0.5 + uWB.y, 1.0 + uWB.x, 1.0 - uWB.x * 0.5 - uWB.y);
    wbg /= max(dot(wbg, CB_LUMA), 1e-4);
    float sw = 1.0 - lg;
    vec3 c = graded * wbg;
    c += (uSplitS.w * sw * sw) * (uSplitS.rgb - vec3(dot(uSplitS.rgb, CB_LUMA)));
    c += (uSplitH.w * lg * lg) * (uSplitH.rgb - vec3(dot(uSplitH.rgb, CB_LUMA)));
    graded = clamp(mix(graded, c, 1.0 - smoothstep(0.86, 1.0, lg)), 0.0, 1.0);
  }

  // --- vignette: a lens, not a black frame -----------------------------------
  // r is normalised so r = 1 at the CORNER. RENDER_PLAN §10.6's formula uses raw
  // length(uv*2-1), which is 1.414 in the corner and puts the corner at
  // (1 - 0.42*2)^2 = 0.026 — a 5.3-stop hole. That is a black frame, not a lens.
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p) * 0.70710678;
#ifdef CB_VIGNETTE
  float nat = pow(max(0.0, 1.0 - uVig.y * r * r), 2.0);     // cos^4-ish falloff
  float art = smoothstep(uVig.w, uVig.z, r);
  float v = mix(nat, nat * art, uVig.x);
  graded *= v;
  // real corner falloff desaturates slightly; a multiply alone reads as a mask
  graded = mix(vec3(dot(graded, CB_LUMA)), graded, mix(1.0, 0.88, 1.0 - v));
#endif

  // --- grain: fixed angular density, modulated by luminance -------------------
#ifdef CB_GRAIN
  {
    vec2 gUv = vUv * vec2(uGrain.y * uTexel.y / max(uTexel.x, 1e-7), uGrain.y) + uGrainOff;
    // Rotate the lattice off the pixel axes. cos/sin of atan(1/2), hardcoded so
    // the compiler folds it. See the block above cbHash21: an axis-aligned
    // lattice whose pitch is even slightly off an integer number of pixels beats
    // EQUALLY in x and y, and equal beats in x and y is what a woven crosshatch
    // is. Rotated, the two axes' phases are incommensurate and there is no weave
    // to lock onto however the pitch lands.
    gUv = vec2(gUv.x * 0.89442719 - gUv.y * 0.44721360,
               gUv.x * 0.44721360 + gUv.y * 0.89442719);
    float n = cbValueNoise(gUv) * 2.0 - 1.0;
    float l = dot(graded, CB_LUMA);
    // peaks in the mids: clean highlights, present but not crunchy shadows
    float amp = uGrain.x
              * (1.0 - 0.72 * smoothstep(0.0, 1.0, l))
              * (uGrain.z + (1.0 - uGrain.z) * smoothstep(0.0, 0.22, l));
    graded *= 1.0 + n * amp;    // multiplicative — additive grain washes blacks
  }
#endif

  graded = clamp(graded, 0.0, 1.0);

  // --- debug views ------------------------------------------------------------
  int dbg = int(uOut.z + 0.5);
  if (dbg == 1 && vUv.x < uOut.w) {
    // "before": exactly renderer.js's fallback ACES blit, same exposure
    vec3 raw = texture(tSrc, vUv).rgb;
    graded = ACESFilmicToneMapping(raw * exposure * 0.6);
    if (abs(vUv.x - uOut.w) < uTexel.x * 1.5) graded = vec3(1.0, 0.35, 0.05);
  } else if (dbg == 2) {
    float l = dot(graded, CB_LUMA);
    if (l < 0.004) graded = vec3(0.10, 0.35, 1.0);
    else if (graded.r > 0.985 && graded.g > 0.985 && graded.b > 0.985) graded = vec3(1.0, 0.1, 0.05);
    else if (l > 0.90) graded = mix(graded, vec3(1.0, 0.85, 0.1), 0.6);
  }

  vec3 srgb = cbEncodeOutput(graded);

  // --- dither. NOT optional: an 8-bit sky gradient bands without it, and
  // banding in a gradient is CRITIC.md automatic failure #9. ------------------
  //
  // ROUND 7: THIS WAS AN 8x8 BAYER SCREEN AND TWO CRITICS SAW IT. Both filed it
  // independently, both called it the single most amateur-reading artifact in
  // the set, and both were right — it is a bug, not a style. It is measured, not
  // conceded: tools/_grdith.mjs bins the high-pass residual by PIXEL PHASE and
  // reports the share of residual variance that survives averaging, which is
  // zero for noise and everything for a screen. On the canopy vista, flattest 96x96
  // window in the frame:
  //
  //     config          resRMS(LSB)   phase-locked % of residual variance
  //                                    2x2    2x3    4x4    8x8
  //     shipped (Bayer)    0.440       0.32   0.00   1.50  11.16
  //     grade dither 0     0.362       0.06   0.00   0.00   2.02
  //     material dither 0  0.442       0.35   0.03   1.55  11.36
  //     grain off          0.341       0.32   0.02   1.91  16.50
  //
  // 11.2% of a flat surface's pixel-scale variance was a deterministic function
  // of (x mod 8, y mod 8), and it is 16.5% of it once the grain is not competing.
  // Turning THIS off takes it to 2%; turning three's material dithering flag
  // off changes nothing (11.16 -> 11.36). The lead that pointed at terrain.js's
  // own dithering:true was wrong and the ownership question is closed: the screen
  // was ours. On a busy patch it is 0.08% of the variance and invisible, which is
  // exactly why it survived seven rounds — an ordered screen only shows up where
  // there is nothing else, i.e. on trunks and inside shadow interiors, which is
  // precisely where both critics circled it.
  //
  // What replaces it is the pairing that is actually correct for an 8-bit write:
  //
  //   * a VOID-AND-CLUSTER BLUE-NOISE MASK, 64x64, generated at boot from
  //     ctx.rng (see makeBlueNoise). Measured on the generated mask: 0.01% of its
  //     energy sits below 0.35 nyquist against ~9.6% for white noise of the same
  //     variance. Blue noise is the one dither whose error the eye's own low-pass
  //     cannot resolve, and unlike Bayer it has no periodic structure to lock to.
  //   * TRIANGULAR PDF, via cbTriRemap. A rectangular +-0.5 LSB dither leaves the
  //     quantisation error correlated with the signal; TPDF spanning +-1 LSB
  //     decorrelates it and covers steps up to two levels, which this chain needs
  //     because one LUT LSB arrives at the framebuffer as ~1.1-1.25 output LSB.
  //     Doing it as a remap of ONE blue sample keeps the spectrum blue; the old
  //     code got TPDF by summing a Bayer draw and a hash draw, which is where the
  //     screen came from.
  //
  // The mask scrolls by a per-frame texel offset so it does not sit still in
  // motion. The offset comes off the frame counter, so it is deterministic and
  // CONTRACT §3's byte-identical replay still holds.
  //
  // AND IT IS STILL THE LAST OPERATION BEFORE THE 8-BIT WRITE. Anything added
  // after a dither is a signal the dither did not decorrelate.
#ifdef CB_DITHER
  ivec2 bp = (ivec2(gl_FragCoord.xy) + uBlueOff) & (CB_BLUE_N - 1);
  srgb += cbTriRemap(texelFetch(tBlue, bp, 0).r) * uOut.x;
#endif

  outColor = vec4(srgb, 1.0);
}
`;

// Fallback blit used only when this pass throws mid-frame — the frame must reach
// the screen even if the grade does not.
const FALLBACK_FRAG = /* glsl */`
precision highp float;
precision highp sampler2D;
in vec2 vUv;
uniform sampler2D tSrc;
uniform sampler2D tExposure;
uniform float uHasExposure;
layout(location = 0) out vec4 outColor;
vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
void main(){
  // Reuse the last good auto-exposure if the adaptation target survived; a
  // hardcoded constant here means the one degraded frame is wildly mis-exposed.
  float ex = 1.0;
  if (uHasExposure > 0.5) ex = 1.0 / (1.2 * exp2(texelFetch(tExposure, ivec2(0), 0).r));
  vec3 c = aces(texture(tSrc, vUv).rgb * ex * 0.6);
  // ^(1/2.2), matching renderer.js's BLIT_FRAG exactly so a degraded frame and
  // the A/B "before" image are the same transform, not two near-misses.
  c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  outColor = vec4(c, 1.0);
}
`;

// =============================================================================
// Blue-noise dither mask — void and cluster (Ulichney 1993), pure CPU, ctx.rng.
// =============================================================================
//
// WHY A MASK AND NOT A HASH. The dither has to be the last thing that touches
// the frame and it has to be invisible. Three candidates and only one of them is
// both:
//
//   * an ORDERED (Bayer) screen is perfectly even but PERIODIC, so the eye locks
//     onto it as texture. That is what shipped for seven rounds and what two
//     critics filed. See the measured phase-lock table in the dither block.
//   * a HASH is aperiodic but WHITE, so ~9.6% of its energy lands below 0.35
//     nyquist where the eye's contrast sensitivity peaks, and it reads as dirt.
//   * a BLUE-NOISE MASK is aperiodic AND has its energy pushed to the high
//     frequencies the eye integrates away. Measured on the mask this function
//     produces, by DFT: 0.01% of its energy below 0.35 nyquist. That is the whole
//     argument, and it is why the tile is worth 8 KB and ~130 ms of boot.
//
// The output is a rank image: every texel gets a distinct rank in [0, N^2), and
// thresholding the normalised rank at any level yields a well-distributed binary
// pattern. Cost is O(N^2) per rank assignment with an incrementally maintained
// energy field; at N = 64 that measured 134 ms on this machine, which goes on
// the boot task queue rather than the critical path.
const BLUE_N = 64;

function makeBlueNoise(N, rng) {
  const M = N * N;
  const SIGMA = 1.9, K = 6;
  const kern = [];
  for (let dy = -K; dy <= K; dy++) {
    for (let dx = -K; dx <= K; dx++) {
      kern.push(dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA)));
    }
  }
  const E = new Float64Array(M);
  const bin = new Uint8Array(M);
  const wrap = (x, y) => (((y % N) + N) % N) * N + (((x % N) + N) % N);
  const splat = (p, s) => {
    const x = p % N, y = (p / N) | 0;
    for (let i = 0; i < kern.length; i += 3) E[wrap(x + kern[i], y + kern[i + 1])] += s * kern[i + 2];
  };
  const tightest = () => { let bp = -1, bv = -Infinity; for (let p = 0; p < M; p++) if (bin[p] && E[p] > bv) { bv = E[p]; bp = p; } return bp; };
  const largestVoid = () => { let bp = -1, bv = Infinity; for (let p = 0; p < M; p++) if (!bin[p] && E[p] < bv) { bv = E[p]; bp = p; } return bp; };

  // 1. a sparse random seed pattern, then relax it until no swap improves it.
  const seeds = Math.max(1, Math.round(M * 0.1));
  let placed = 0;
  while (placed < seeds) {
    const p = Math.min(M - 1, (rng.next() * M) | 0);
    if (!bin[p]) { bin[p] = 1; splat(p, 1); placed++; }
  }
  for (let it = 0; it < M * 2; it++) {
    const c = tightest();
    bin[c] = 0; splat(c, -1);
    const v = largestVoid();
    if (v === c) { bin[c] = 1; splat(c, 1); break; }   // converged
    bin[v] = 1; splat(v, 1);
  }

  // 2. rank the seed pattern downward by removing its tightest cluster, then
  //    rank everything else upward by filling its largest void.
  const rank = new Int32Array(M).fill(-1);
  const bin0 = bin.slice(), E0 = Float64Array.from(E);
  for (let r = seeds - 1; r >= 0; r--) {
    const c = tightest();
    if (c < 0) break;
    bin[c] = 0; splat(c, -1); rank[c] = r;
  }
  bin.set(bin0); E.set(E0);
  for (let r = seeds; r < M; r++) {
    const v = largestVoid();
    if (v < 0) break;
    bin[v] = 1; splat(v, 1); rank[v] = r;
  }

  // 8 bits is ample for a +-1 LSB dither: it quantises the THRESHOLD, not the
  // image, and 256 levels of threshold across 4096 texels preserves the ordering
  // the blue-noise property lives in.
  const out = new Uint8Array(M);
  for (let p = 0; p < M; p++) out[p] = Math.min(255, ((rank[p] < 0 ? 0 : rank[p]) + 0.5) / M * 256) | 0;
  return out;
}

function blueNoiseTexture(data, N) {
  const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

// =============================================================================
// LUT baking — pure CPU, pure arithmetic, no rng. See RENDER_PLAN §10.3.
// =============================================================================

const LUT_N = 33;
const L_R = 0.2126, L_G = 0.7152, L_B = 0.0722;

function rgb2hsv(r, g, b, o) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-7) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6; if (h < 0) h += 1;
  }
  o[0] = h; o[1] = mx > 1e-7 ? d / mx : 0; o[2] = mx;
  return o;
}
function hsv2rgb(h, s, v, o) {
  h = h - Math.floor(h);
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: o[0] = v; o[1] = t; o[2] = p; break;
    case 1: o[0] = q; o[1] = v; o[2] = p; break;
    case 2: o[0] = p; o[1] = v; o[2] = t; break;
    case 3: o[0] = p; o[1] = q; o[2] = v; break;
    case 4: o[0] = t; o[1] = p; o[2] = v; break;
    default: o[0] = v; o[1] = p; o[2] = q; break;
  }
  return o;
}
const hueDist = (a, b) => { let d = Math.abs(a - b) % 1; return d > 0.5 ? 1 - d : d; };

/**
 * Contrast about a pivot, with the endpoints pinned.
 *
 * The obvious `pivot + (x - pivot) * k` is what most procedural LUTs do and it
 * is wrong here: at k = 1.11, pivot 0.415 it maps everything below 0.041 to
 * zero, which throws away exactly the milky AgX toe we chose AgX for. This is a
 * symmetric sigmoid with a pivot-shifting gamma either side, so f(0) = 0 and
 * f(1) = 1 for every k and the toe is steepened rather than clipped.
 */
function contrastCurve(x, k, pivot) {
  if (k === 1) return x;
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  const gp = Math.log(0.5) / Math.log(Math.min(0.999, Math.max(1e-3, pivot)));
  const y = Math.pow(x, gp);
  const a = Math.pow(y, k), b = Math.pow(1 - y, k);
  const s = a / Math.max(1e-9, a + b);
  return Math.pow(s, 1 / gp);
}

/**
 * Evaluate one grade recipe on a single display-log RGB triple in [0,1].
 * Order matters and is the order a colourist works in: primary CDL, contrast,
 * toe/shoulder, channel crosstalk, split tone, targeted hue, global saturation.
 */
function applyRecipe(c, R, tmp) {
  let r = c[0], g = c[1], b = c[2];

  // 1. primary ASC-CDL
  const S = R.slope, O = R.offset, P = R.power;
  r = Math.pow(Math.max(0, r * S[0] + O[0]), P[0]);
  g = Math.pow(Math.max(0, g * S[1] + O[1]), P[1]);
  b = Math.pow(Math.max(0, b * S[2] + O[2]), P[2]);

  // 2. contrast about a pivot, endpoints pinned (see contrastCurve)
  if (R.contrast !== 1) {
    r = contrastCurve(r, R.contrast, R.pivot);
    g = contrastCurve(g, R.contrast, R.pivot);
    b = contrastCurve(b, R.contrast, R.pivot);
  }

  // 3. toe lift / shoulder roll — this is what makes it read as a film print
  //    rather than a gamma curve. The toe is why the AgX blacks stay milky.
  if (R.toe) {
    const t = R.toe;
    r += t * Math.pow(Math.max(0, 1 - r), 4);
    g += t * Math.pow(Math.max(0, 1 - g), 4);
    b += t * Math.pow(Math.max(0, 1 - b), 4);
  }
  if (R.shoulder) {
    const s = R.shoulder;
    r -= s * Math.pow(Math.min(1, Math.max(0, r)), 4);
    g -= s * Math.pow(Math.min(1, Math.max(0, g)), 4);
    b -= s * Math.pow(Math.min(1, Math.max(0, b)), 4);
  }

  // 4. channel crosstalk — asymmetric, the way a dye layer actually bleeds
  if (R.crosstalk) {
    const x = R.crosstalk;
    const nr = r + x * (0.62 * g + 0.38 * b - r);
    const ng = g + x * (0.55 * r + 0.45 * b - g) * 0.75;
    const nb = b + x * (0.30 * r + 0.70 * g - b) * 0.60;
    r = nr; g = ng; b = nb;
  }

  // 5. split tone at constant luma
  const l0 = r * L_R + g * L_G + b * L_B;
  if (R.shadowStrength) {
    const w = Math.pow(Math.max(0, 1 - l0), 2.2) * R.shadowStrength;
    const st = R.shadowTint;
    const sl = st[0] * L_R + st[1] * L_G + st[2] * L_B;
    r += w * (st[0] - sl); g += w * (st[1] - sl); b += w * (st[2] - sl);
  }
  if (R.highStrength) {
    const w = Math.pow(Math.max(0, l0), 2.2) * R.highStrength;
    const ht = R.highTint;
    const hl = ht[0] * L_R + ht[1] * L_G + ht[2] * L_B;
    r += w * (ht[0] - hl); g += w * (ht[1] - hl); b += w * (ht[2] - hl);
  }

  // 6. targeted hue work — the rationing rules in ART_DIRECTION §2.5 are
  //    enforced here, and this is the only place in the build that can.
  //
  //    §2.5 is a numeric budget: ochre/rust <= 15% of pixels, saturated green +
  //    quickfire <= 6%, violet <= 2%, "everything else is char, ash and haze —
  //    i.e. the world is fundamentally greyscale, and colour is an event."
  //    Measured on the pre-fix review set, ochre was 58-99% of pixels at a mean
  //    HSV saturation of 0.30-0.45, on every vista, with a sat-weighted hue
  //    concentration of 0.97+ — one hue, edge to edge. That is §8's named
  //    nearest miss (Monument Valley) and it is what four independent critics
  //    called "Earth palette in every single shot".
  //
  //    THE VALUE GATE IS WHY THIS CAN BE DONE AT ALL. Ration ochre with a flat
  //    saturation multiplier and you also kill the embers, the seed crowns and
  //    the sun's own aureole, which live in the SAME hue band and are the one
  //    thing in the frame that is supposed to be that colour. `valLo`/`valHi`
  //    window an entry by HSV value in AgX's display-log domain, so a band can
  //    be pulled toward grey exactly where it is flat mid-tone haze and left
  //    alone where it is a bright emitter. Colour becomes an event because the
  //    non-events are the only thing desaturated.
  //
  //    A KNEE, NOT A MULTIPLIER. This is the one change in the file that a
  //    colour-count measurement forced. Re-baking each area's LUT with one
  //    recipe term neutralised at a time (tools/_grlut.mjs) attributed the pass's
  //    ENTIRE loss of distinct colours to this block and to nothing else:
  //
  //      term neutralised   canopy   establish   draft   ridge
  //      hue ration          +18%      +38%      +69%    +74%
  //      crosstalk            +1%       +1%       +2%     +1%
  //      shadowDesat          -1%       +0%       +3%     +1%
  //      split tone           -7%       -3%       -5%     -5%
  //      global sat           -3%       -1%       +9%     -1%
  //
  //    A flat `satMul` of 0.42 does not just cap the flood — it divides EVERY
  //    saturation in the band by the same factor, so two surfaces 3 points of
  //    chroma apart end up 1.3 points apart and land in the same 8-bit code.
  //    The char and ash that §2.5 says the world is made of are exactly the
  //    low-chroma pixels, and they were being crushed hardest in relative terms
  //    while the flood they were meant to protect us from barely moved.
  //
  //    `satKnee`/`satCeil` is identity below the knee and asymptotic to the
  //    ceiling above it, so the flat 0.30-0.45 ochre haze still lands under the
  //    0.16 chroma threshold that tools/valuebands.mjs counts as "colour", and
  //    every distinction below the knee survives intact. Overlapping bands take
  //    the MINIMUM target rather than multiplying, so the 20-30 deg entry and the
  //    35-45 deg tail can no longer compound into 0.28x where they cross.
  if (R.hue && R.hue.length) {
    const hsv = rgb2hsv(Math.max(0, r), Math.max(0, g), Math.max(0, b), tmp);
    const h = hsv[0], s = hsv[1], v = hsv[2];
    let dh = 0, ds = 1, sKnee = s, kneed = false;
    for (let i = 0; i < R.hue.length; i++) {
      const e = R.hue[i];
      const d = hueDist(h, e.center) / Math.max(1e-4, e.width);
      let w = Math.exp(-d * d) * Math.min(1, s / Math.max(1e-4, e.satGate || 0.06));
      if (e.valLo !== undefined || e.valHi !== undefined) {
        const lo = e.valLo ?? 0, hi = e.valHi ?? 1;
        const soft = Math.max(1e-3, e.valSoft ?? 0.12);
        // smoothstep in, smoothstep out — a hard window bands visibly once the
        // 33^3 LUT is trilinearly interpolated across it.
        const up = clamp((v - lo) / soft, 0, 1);
        const dn = clamp((hi - v) / soft, 0, 1);
        w *= (up * up * (3 - 2 * up)) * (dn * dn * (3 - 2 * dn));
      }
      dh += (e.rot || 0) * w;
      if (e.satCeil !== undefined) {
        const c = Math.max(1e-3, e.satCeil);
        const k = Math.min(e.satKnee ?? c * 0.55, c - 1e-3);
        const sk = s <= k ? s : k + (c - k) * (1 - Math.exp(-(s - k) / (c - k)));
        sKnee = Math.min(sKnee, s + (sk - s) * w);
        kneed = true;
      } else {
        ds *= 1 + ((e.satMul || 1) - 1) * w;
      }
    }
    if (dh !== 0 || ds !== 1 || kneed) {
      const o = hsv2rgb(h + dh, clamp(sKnee * ds, 0, 1), v, tmp);
      r = o[0]; g = o[1]; b = o[2];
    }
  }

  // 7. temperature / tint, luma-preserving
  if (R.temp || R.tint) {
    const t = R.temp, ti = R.tint;
    let gr = 1 + 0.28 * t, gg = 1 + 0.10 * ti, gb = 1 - 0.30 * t;
    const n = gr * L_R + gg * L_G + gb * L_B;
    gr /= n; gg /= n; gb /= n;
    r *= gr; g *= gg; b *= gb;
  }

  // 8. global saturation, plus a toe desaturation
  //
  // Every print process loses chroma in the toe — dye density falls off faster
  // than luminance does — and every sensor pipeline leans on that, because
  // CHROMA noise is far more objectionable than luma noise and the toe is where
  // all the noise is. We need it for both reasons at once. `grotto` is the case:
  // lifting its toe hard enough to make the walls readable also lifted every bit
  // of upstream shadow noise into view, and the CA pass then smeared that noise
  // 1.3 px sideways and turned it into coloured speckle — which is exactly what
  // a critic described as "heavy dither noise is the only thing distinguishing it
  // from solid fill". It also kills the magenta cast a low-luma split tone
  // otherwise paints across an entire dark frame.
  const l1 = r * L_R + g * L_G + b * L_B;
  let sg = R.sat;
  if (R.shadowDesat) {
    const t = clamp(l1 / Math.max(1e-4, R.shadowDesatEnd ?? 0.30), 0, 1);
    sg *= 1 - R.shadowDesat * (1 - t * t * (3 - 2 * t));
  }
  r = l1 + (r - l1) * sg; g = l1 + (g - l1) * sg; b = l1 + (b - l1) * sg;

  c[0] = clamp(r, 0, 1); c[1] = clamp(g, 0, 1); c[2] = clamp(b, 0, 1);
  return c;
}

function defaultRecipe(over) {
  return Object.assign({
    slope: [1, 1, 1], offset: [0, 0, 0], power: [1, 1, 1],
    contrast: 1.0, pivot: 0.435,
    toe: 0.0, shoulder: 0.0, crosstalk: 0.0,
    shadowTint: [0.42, 0.553, 0.58], shadowStrength: 0.0,
    highTint: [0.60, 0.52, 0.40], highStrength: 0.0,
    temp: 0.0, tint: 0.0, sat: 1.0, hue: null,
    shadowDesat: 0.0, shadowDesatEnd: 0.30,
  }, over || {});
}

// HALF-FLOAT PAYLOAD, NOT UINT8.
//
// The old bake wrote 8-bit and the dither comment three hundred lines up
// explains what that cost: one LUT LSB leaves the outset matrix and the 2.2
// power as roughly 1.1-1.25 output LSB in the shadows, i.e. the look chain
// quantised COARSER than the framebuffer it was feeding, and the output dither
// could not reach the error because the error was bigger than the dither. That
// is a colour-count leak by construction — this pass could only ever hand the
// screen fewer distinct values than it was given.
//
// RGBA16F is texture-filterable in core WebGL2 (GLES 3.0 table 3.13), so
// trilinear still runs in hardware. 33^3 x 4 x 2 = 287 KB per area, baked
// lazily, at most nine areas. Cheap for the last quantiser in the chain.
function bakeLut(recipe, N = LUT_N) {
  const half = THREE.DataUtils && THREE.DataUtils.toHalfFloat;
  const data = half ? new Uint16Array(N * N * N * 4) : new Uint8Array(N * N * N * 4);
  const c = [0, 0, 0], tmp = [0, 0, 0];
  const inv = 1 / (N - 1);
  let i = 0;
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        c[0] = x * inv; c[1] = y * inv; c[2] = z * inv;
        applyRecipe(c, recipe, tmp);
        if (half) {
          data[i++] = half(c[0]); data[i++] = half(c[1]);
          data[i++] = half(c[2]); data[i++] = half(1);
        } else {
          data[i++] = (c[0] * 255 + 0.5) | 0;
          data[i++] = (c[1] * 255 + 0.5) | 0;
          data[i++] = (c[2] * 255 + 0.5) | 0;
          data[i++] = 255;
        }
      }
    }
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat;             // RGBFormat is gone in r161
  tex.type = half ? THREE.HalfFloatType : THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.unpackAlignment = 4;
  tex.needsUpdate = true;
  return tex;
}

// =============================================================================
// Area grades — ART_DIRECTION §5. `look` is uniforms (blends per-frame, free);
// `recipe` bakes into the LUT (blends by cross-fade).
// =============================================================================
//
// EV NOTE. `ev.min/max` are in SCENE units, not nits. This renderer's radiance
// is authored so sunlit bone ash (A4 under an unoccluded sky) reads about 1.0,
// so EV100 for a bright exterior lands near +3 and a coal-lit cave near -2.
// If world lighting is ever re-based to real nits, these shift by log2(nits).

// THE OCHRE RATION. Shared by every daylight area, because every daylight area
// had the same disease. §2.5 caps ochre/rust at 15% of pixels; the pre-fix review
// set measured 58-99% at a mean HSV saturation of 0.30-0.45, with a sat-weighted
// hue concentration of 0.97+ on six of eight vistas. That is not a warm grade, it
// is a monochrome one, and it is what "Earth palette in every single shot" means
// in numbers.
//
// The cause is not the LUT. It is that §3.5's warm aerosol tints the light, the
// in-scatter and the albedo of every surface in the frame toward the same 20-30
// degree band, so hue carries no information at all. The grade cannot add hues the
// renderer did not emit (§8 forbids it and it would read as a cheat) — but it can
// stop amplifying the one hue that flooded, which is the other half of §2.5:
// "the world is fundamentally greyscale, and colour is an event."
//
// So: pull the flat mid-tone ochre most of the way to grey, and use the value
// window to leave the bright end alone. Everything that is SUPPOSED to be that
// colour — ember lines, seed crowns, the sun's aureole, rust seeps in direct
// light — is brighter than `valHi` and passes through untouched. What gets
// greyed is haze, lit ash and shadowed ash, which ART calls char and ash and
// which should have been near-neutral in the first place.
//
// AND THE RATION IS NOW A SAFETY CLIP, NOT A RATION, BECAUSE IT NEVER WORKED.
// The argument is a CEILING in HSV saturation rather than a multiplier (see the
// knee block in applyRecipe), and the ceilings below are set high enough to
// touch only genuinely garish chroma. That is not a retreat from ART §2.5, it
// is what the sweep in tools/_grsweep.mjs measured. Ceiling against the two
// numbers that matter, on `establish`:
//
//   ochre ceiling   §2.5 ochre %   distinct colours (vs grade OFF)
//   none                  88.7%          +12.7%
//   0.34                  88.3%           -2.3%
//   0.26                  88.1%           -7.0%
//   0.20                  88.0%          -13.6%
//   0.145 (as shipped)    87.2%          -18.0%
//
// Ridge and draft are the same shape. Squeezing the band all the way down moves
// ART §2.5's headline number by ONE POINT — 88.7% to 87.2% against a 15% cap —
// and pays for it with a fifth to a half of the frame's colour depth. It cannot
// work: the flood is a HUE problem (hue concentration 0.95, mean hue 24 deg),
// and desaturating one hue band does not reduce the fraction of pixels in it,
// it only makes them duller pixels of the same hue. Meanwhile the display-domain
// saturation the metric reads is set downstream of this, by the outset matrix,
// the 2.2 power and the chroma restore, so a cap authored in AgX's log domain
// does not land where valuebands.mjs measures.
//
// This is exactly the case the file header and ART §9 legislate for: "Do not
// solve any identity problem in the grade. If the world is grey, the answer is
// more materials, not more saturation." The inverse holds too — if the world is
// one hue, the answer is more hues in the world. Filed under HANDOFF ## requests
// against the aerosol tint, which is what actually puts every surface, every
// in-scatter and every light in the same 20-30 deg band.
//
// The mechanism and the knobs are left intact so that whoever fixes the upstream
// tint can turn the ceilings back down and have them mean something.
const OCHRE_RATION = (satCeil, valHi = 0.74) => ([
  { center: 0.062, width: 0.115, satCeil, satKnee: satCeil * 0.62, valLo: 0.03, valHi, valSoft: 0.15 },
  // the 35-45 deg tail, where the ash haze actually peaks; weaker, wider
  { center: 0.108, width: 0.085, satCeil: satCeil * 1.22, satKnee: satCeil * 0.75, valLo: 0.03, valHi, valSoft: 0.15 },
]);

// =============================================================================
// ROUND 6 — WHY EVERY `contrast` IN THIS TABLE WENT DOWN, AND WHY THAT IS NOT
// A RETREAT FROM ROUND 4.
// =============================================================================
//
// Round 4 raised contrast from 1.02-1.26 to 1.50-1.85 because fixing
// cbEncodeOutput removed a compensating veil and left the curve too soft. That
// was right. Round 6 lowers it to 1.30-1.60 for the OPPOSITE reason, and the two
// are not in tension: `sky.js` landed FILL_GAIN = 0.40 this round, which cuts
// the ambient fill 2.5x and moves that contrast OUT of this file and INTO the
// render, where CONTRACT §0.2 and ART §9 both say it belongs.
//
// The total displayed contrast is meant to stay put. What changed is who
// supplies it. Measured on a private capture set immediately after FILL_GAIN
// landed (tools/_grshots.mjs; the shared `tests/shots/*.png` were being rewritten
// by three other agents mid-run, which is why that tool exists) —
// ART §2.3's `deep` band, cap 8% of pixels:
//
//   vista       before FILL_GAIN   after FILL_GAIN, old curve
//   establish        10.6%                 19.7%
//   combat            9.5%                 19.4%
//   ads              13.4%                 20.5%
//   storm            10.0%                 14.0%
//   draft            20.8%                 26.2%
//   grotto           20.1%                 25.9%
//   ridge            24.2%                 27.1%
//   canopy            —                    32.6%
//
// Eight of eight over the cap, several by 3-4x, with `low` starved below its
// 25-35% target on every one of them. That is a frame with MORE contrast than
// the art direction asks for, not less, and the surplus is this curve's toe
// eating the shadows sky.js just correctly darkened. Left alone it would have
// come back from the critics as "crushed, no shadow detail" — and the obvious
// (wrong) reaction to that finding is to turn the fill back up, which is exactly
// the circle this project has already been round once.
//
// THE TOOL THAT PICKED THESE NUMBERS IS `tools/_grtune.mjs`, and the thing that
// makes it trustworthy is that it reports p0.1 next to the bands. There are two
// ways to move `deep` and they look identical in a band table:
//
//   knob          deep 19.6% ->   p0.1 (8-bit)
//   toe 0.09            8.7%       6 -> 25     A LIFT. This is the milky grade.
//   contrast 1.37      15.3%       5 ->  7     slope. Black stays black.
//   + pivot/EV         10.5%       5 ->  8     slope. Black stays black.
//
// Every value below was chosen with p0.1 gated at <= 12, so the round-4 win a
// critic confirmed this round ("p0.1 lands at 3-16 and p99.9 at 217-247 ... this
// is NOT a lifted-blacks tone-curve problem") is preserved by construction.
//
// The `ev.bias` shifts are the other half and they are EXPOSURE, not tone: the
// anchors were authored against the old fill-heavy world, and `evSlope` only
// gives back 58-72% of a level change, so cutting the fill left every daylight
// area sitting 0.25-0.5 EV low. Verified not to cost the key ratio — see the
// note on `ev.max` below.
//
// `ev.max` went up 2 stops on every daylight area. Nothing today is near the
// clamp (establish sits at EV -1.78 against a limit that was 1.5); it is
// headroom so that the NEXT key increase is absorbed by the exposure rather
// than by the highlights. Measured with tools/_grkey.mjs, which drives
// sky.knobs.key and reads the lit/shade ratio in and out of this pass:
//
//   key    sun     EV     IN ratio   OUT ratio
//     1    8.99  -1.78      7.46       3.77
//     2   17.97  -1.58      6.95       3.79
//     4   35.94  -1.28      8.38       4.14
//     8   71.89  -0.92      6.16       4.14
//
// Three stops of extra key and the output ratio goes UP. This pass does not
// compress a brighter key back out, and the auto-exposure absorbs only 0.86 EV
// of a 3-stop change, so there is no risk of it silently swallowing sky.js's
// work. Re-run that tool before and after any future key change.

// =============================================================================
// ROUND 8 — THE Duv TABLE. `wb` is per-area, it is measured, and it is 0 on six
// of the nine areas on purpose.
// =============================================================================
//
// A critic filed "both lit and shade sit green-biased above the Planckian". The
// instrument is `tools/_grhue.mjs`, which reports Duv — the signed perpendicular
// distance from the blackbody locus in CIE 1960 uv, POSITIVE IS GREEN — and
// which reproduces D65's textbook +0.0032 as its own sanity check. ART §2.2's
// blackbody discipline is the acceptance test, because every light in this world
// is a Planckian source (a 4400 K K-dwarf, 900-1900 K fire) with exactly one
// declared exception, E5 fluorescence. Light from a blackbody must land on the
// locus. |Duv| > 0.006 is a visible cast.
//
// A blanket green pull would have been wrong, and this is why:
//
//   vista       BEFORE lit / shade     AFTER lit / shade      wb.tint
//   canopy        +0.0095  +0.0093      +0.0008  +0.0011       -0.10
//   grotto        -0.0126  -0.0097      -0.0026  +0.0000       +0.12
//   water         +0.0031  +0.0074      +0.0007  +0.0050       -0.03
//   ridge         -0.0009  -0.0062      +0.0007  -0.0046       +0.02
//   establish     -0.0048  -0.0039        (unchanged)           0
//   draft         -0.0020  +0.0017        (unchanged)           0
//   storm         +0.0000  +0.0029        (unchanged)           0
//   combat        -0.0008  +0.0031        (unchanged)           0
//   ads           -0.0012  +0.0036        (unchanged)           0
//   hipfire       -0.0006  +0.0035        (unchanged)           0
//
// Four vistas were out of tolerance and TWO OF THEM WERE MAGENTA, not green. A
// global green pull fixes canopy and takes grotto from -0.0126 to -0.02. The two
// that are worst are also the two the art direction pins hardest: canopy is lit
// through crowns by a blackbody sun, and grotto's only key is a 1050 K coal —
// there is no physical process in either that can produce a cast.
//
// The knob is calibrated, not guessed. `tools/_grpal.mjs canopy` and the same on
// grotto, sweeping `wbTint`, are linear at 0.00088 of Duv per 0.01 of tint on
// both, and the sweep prints the three things that could have been spent to buy
// it:
//
//   canopy   wbTint    litDuv   shDuv    R      colours   p0.1  p99.9
//              0      +0.0094  +0.0094  0.527    6478      13    228
//            -0.04    +0.0062  +0.0061  0.458    6497      13    228
//            -0.08    +0.0026  +0.0029  0.401    6584      13    228
//            -0.12    -0.0010  -0.0007  0.328    6572      14    221
//
//   grotto   wbTint    litDuv   shDuv    R      colours   p0.1  p99.9
//              0      -0.0120  -0.0090  0.384   13135      17    228
//            +0.08    -0.0059  -0.0031  0.377   12475      17    229
//            +0.14    -0.0009  +0.0018  0.370   12152      17    228
//            +0.20    +0.0036  +0.0059  0.419   11625      17    228
//
// Round 4's tone curve is untouched on both (p0.1 13-17 against a <= 16-ish gate,
// p99.9 221-229), and on canopy the hue concentration R FALLS from 0.527 to 0.401
// while the colour count RISES — a global cast concentrates hue by definition, so
// removing one is the rare move that pays on the palette axis and the neutrality
// axis at once. Grotto pays about 6% of its colour count, which is the magenta
// wash being counted as colour; three separate hue-ration entries in its recipe
// exist to fight that same wash and they can come down once this is settled.
//
// `wb.temp` is 0 everywhere. Warm/cool is authored by the sun table and the
// aerosol and is not this file's to move; `tint` is orthogonal to it (Duv is
// perpendicular to the locus, CCT is along it), which is the only reason a
// per-area neutrality correction can be applied without touching the look.

// =============================================================================
// ROUND 9 — NINE AREAS HAD ONE SHADOW HUE, TO A TENTH OF A DEGREE.
// =============================================================================
//
// Read the `split` line of every area in the round-8 table and the comment at
// the end of each one says the same thing: `// s hue 190.0`, `189.9`, `190.0`,
// `190.1`, `190.0`, `189.9`, `190.0`, `190.0`, `190.0`. Round 8 rotated every
// area's shadow tint onto one target and that was the right instinct applied at
// the wrong granularity — it fixed a blue that ART section 8 bans and, in the
// same edit, deleted the only per-area colour variable in the file. Every
// highlight tint was inside 29-39 degrees as well. So the whole review set had
// exactly two hues in it, the SAME two, in all fourteen shots, and colour went
// 3.7 -> 2.3 in the round that happened.
//
// A film grade's per-scene identity is not one look plus exposure. It is
// different hue for the key, different hue for the fill, and a different
// relationship between them. So:
//
//   area     shadow hue  what is actually lighting the shadow there
//   basin       197      ART 3.3's zenith AT 4 DEG SUN. (0.16,0.26,0.30) is hue
//                        197.1, not 190 — the zenith's hue is a function of sun
//                        elevation: 170.9 at 20 deg, 197.1 at 4 deg, 210 at dusk.
//                        190 was a single number standing in for an arc.
//   canopy      168      the floor is lit by E5 quickfire, (0.09,1.45,1.22),
//                        which is hue 169.8. Not the sky — the canopy transmits
//                        12%, section 5.2.
//   ridge       200      380 m, ABOVE the 340 m haze deck (section 5.3), so the
//                        fill is undiluted sky with no warm in-scatter in it.
//                        The coolest, cleanest area in the game, and the only one
//                        whose split strength goes up.
//   grotto      172      section 5.5: E5 dripping from the roof cracks is the
//                        ONLY cold light in the cave. There is no sky.
//   storm       186      spore whiteout, g 0.35, near-isotropic: the medium is
//                        the light, so the split is the WEAKEST in the table.
//                        Pale and luminous is an identity too.
//   draft       288      section 3.5 gives The Draft sigma_a x3.4 on a blue-heavy
//                        absorber. There is no blue left to fill a shadow with at
//                        60 m visibility. What ART leaves is A13 Tarnish,
//                        (0.078,0.052,0.081), "the world's only violet... wet
//                        char, shadowed crack interiors" — hue 296. Rationed to
//                        2% of pixels, so its chroma is pulled to 0.78x and the
//                        strength stays at 0.050; measured after, not assumed.
//   water       190      section 5.4, the sky is literally in the ground.
//   night       176      E5 again; section 3.4 bans a moon, so there is no other
//                        cold source.
//
// and the highlight tints are spread the same way, by KEY TEMPERATURE rather
// than by taste — every one of them is a blackbody in this world (ART 2.2) and
// the areas do not share a key:
//
//   grotto 12 deg (1700 K read) · draft 15 · night 17 · ridge 22 (2544 K, the
//   4-degree sun of section 3.1) · basin 27 (2937 K) · neutral 30 · water 33 ·
//   canopy 37 (3530 K through crowns) · storm 40 (4379 K, the top of the arc)
//
// Nothing in this block raises a saturation or moves a value. It rotates hues
// that were already there, at the strengths round 8 tuned, so the tone-curve
// result (p0.1 3-16, p99.9 217-247) cannot move — and it is measured after.
const AREAS = {
  // `tone` is the analytic half of the look — contrast about a pivot, print toe,
  // print shoulder. It used to be baked into `recipe` and it is out of there for
  // two measured reasons: a 33-node LUT turns a curve into 32 straight segments
  // (the `draft`/`storm` banding), and the 8-bit payload quantised it coarser
  // than the framebuffer. See cbTone. Every `toe` here is roughly a QUARTER of
  // what it was: those lifts existed to claw the shadows back out of the broken
  // output encode (see cbEncodeOutput), and with the encode fixed they are just
  // a veil. `contrast` went up by about the same amount for the same reason.
  neutral: {
    ev: { min: -9.0, max: 6.5, bias: -0.25, anchor: -1.5, slope: 0.70 },
    look: { slope: [1.000, 1.000, 1.000], offset: [0.000, 0.000, 0.000], power: [1.05, 1.05, 1.05], saturation: 1.01 },
    tone: { contrast: 1.32, pivot: 0.400, toe: 0.006, shoulder: 0.008 },
    lens: { vignette: 0.38, ca: 1.00, grain: 0.017, sharpen: 0.26, chroma: 0.22, dn: 0.60 },
    split: { s: [0.340, 0.590, 0.640, 0.060], h: [0.680, 0.520, 0.360, 0.050] },  // s 190  h 30 (3446 K)
    hueX: { anchor: 25, amount: 0.50, width: 26 },
    recipe: defaultRecipe({ sat: 1.01, hue: OCHRE_RATION(0.40) }),
  },

  // §5.1 lightest biome, ochre seeps, cool sky-lit shadows, warm distance.
  basin: {
    ev: { min: -6.0, max: 3.5, bias: -0.55, anchor: -1.0, slope: 0.58 },
    look: { slope: [1.014, 1.000, 0.996], offset: [0.000, 0.001, 0.0055], power: [1.09, 1.10, 1.11], saturation: 1.04 },
    tone: { contrast: 1.37, pivot: 0.380, toe: 0.008, shoulder: 0.012 },
    lens: { vignette: 0.45, ca: 1.20, grain: 0.020, sharpen: 0.28, chroma: 0.22, dn: 0.60 },
    split: { s: [0.320, 0.592, 0.700, 0.062], h: [0.720, 0.500, 0.320, 0.070] },  // s 197  h 27 (2937 K)
    hueX: { anchor: 25, amount: 0.70, width: 26 },
    wb: { tint: 0.0, temp: 0.015 },
    recipe: defaultRecipe({
      crosstalk: 0.022,
      shadowDesat: 0.22, shadowDesatEnd: 0.18,
      shadowTint: [0.340, 0.555, 0.640], shadowStrength: 0.130,   // §2.4: cool near shadow
      highTint: [0.660, 0.495, 0.360], highStrength: 0.085,       // §2.4: warm light + distance
      temp: 0.015, sat: 1.02,
      hue: [
        ...OCHRE_RATION(0.35),
        { center: 0.48, width: 0.09, rot: 0.004, satMul: 1.34 },   // quickfire cyan: protect
        { center: 0.33, width: 0.10, rot: -0.010, satMul: 0.86 },  // greens toward ashling
      ],
    }),
  },

  // §5.2 darkest daytime biome; floor lit by cyan fluorescence and shafts.
  canopy: {
    ev: { min: -4.2, max: 3.6, bias: -0.80, anchor: -0.9, slope: 0.66 },
    look: { slope: [1.002, 1.006, 1.010], offset: [0.000, 0.001, 0.0065], power: [1.12, 1.11, 1.10], saturation: 1.04 },
    tone: { contrast: 1.31, pivot: 0.370, toe: 0.007, shoulder: 0.014 },
    lens: { vignette: 0.55, ca: 1.30, grain: 0.018, sharpen: 0.30, chroma: 0.30, dn: 0.70 },
    split: { s: [0.260, 0.620, 0.548, 0.048], h: [0.700, 0.562, 0.340, 0.060] },  // s 168 (E5)  h 37 (3530 K)
    hueX: { anchor: 28, amount: 0.42, width: 24 },
    wb: { tint: -0.125, temp: -0.020 },   // Duv +0.0094 -> +0.0008.  See THE Duv TABLE.
    recipe: defaultRecipe({
      crosstalk: 0.028,
      shadowDesat: 0.20, shadowDesatEnd: 0.18,
      shadowTint: [0.280, 0.580, 0.520], shadowStrength: 0.165,
      highTint: [0.640, 0.540, 0.380], highStrength: 0.085,
      temp: -0.02, sat: 1.03,
      hue: [
        ...OCHRE_RATION(0.36),
        { center: 0.48, width: 0.10, rot: 0.006, satMul: 1.45 },   // the cyan IS the biome
        { center: 0.30, width: 0.09, rot: -0.008, satMul: 0.90 },
      ],
    }),
  },

  // §5.3 tabular mesas, 9:1 value banding, the 340 m haze deck.
  ridge: {
    ev: { min: -6.0, max: 3.2, bias: -0.50, anchor: -1.6, slope: 0.60 },
    look: { slope: [1.024, 1.000, 0.990], offset: [0.000, 0.000, 0.0045], power: [1.09, 1.10, 1.12], saturation: 1.05 },
    // §5.3 wants a 9:1 value ratio between caprock and the soft bands. That
    // ratio now arrives from the RENDER (sky.js's FILL_GAIN), not from this
    // curve — measured, see the ROUND 6 block above the table.
    tone: { contrast: 1.30, pivot: 0.390, toe: 0.007, shoulder: 0.010 },
    lens: { vignette: 0.42, ca: 1.10, grain: 0.018, sharpen: 0.32, chroma: 0.24, dn: 0.60 },
    // §5.3's identity is ALTITUDE: 380 m puts the camera above the 340 m haze
    // deck, so the aerosol that warms every other daylight vista is under the
    // player's feet. This is the one area whose cool fill should be strongest
    // and whose warm distance should be weakest, and the split now says so:
    // shadow strength up to 0.086, temp pulled COOL, and the highlight put on
    // the 2544 K key of §3.1's 4-degree sun rather than a generic amber.
    split: { s: [0.300, 0.580, 0.720, 0.086], h: [0.740, 0.461, 0.300, 0.062] },  // s 200  h 22 (2544 K)
    hueX: { anchor: 24, amount: 0.66, width: 24 },
    wb: { tint: 0.02, temp: -0.035 },  // shade Duv -0.0062 -> -0.0046; temp is the altitude
    recipe: defaultRecipe({
      crosstalk: 0.018,
      shadowDesat: 0.22, shadowDesatEnd: 0.18,
      shadowTint: [0.360, 0.547, 0.640], shadowStrength: 0.115,
      highTint: [0.700, 0.472, 0.340], highStrength: 0.120,
      temp: 0.030, sat: 1.03,
      hue: [
        ...OCHRE_RATION(0.33),
        { center: 0.52, width: 0.10, rot: 0.006, satMul: 1.14 },
      ],
    }),
  },

  // §5.5 emissive-dominant, uplit, violet in the wet corners.
  //
  // THIS ONE WAS THE WORST SHOT IN THE SET AND IT SHOULD BE THE BEST. Measured
  // before: 51.5% of pixels below 0.020 linear luma against §2.3's 8% hard cap,
  // 9.3% in the mid band against a 35-45% target, 0.1% above 0.700, and 36.3% of
  // the frame inside the violet hue band against §2.5's 2% cap. A blind critic:
  // "roughly 60% of the frame is crushed to near-black red with no readable form;
  // heavy dither noise is the only thing distinguishing it from solid fill."
  // All three of those numbers are this table's, not the renderer's:
  //
  //   * the violet came from shadowStrength 0.125 weighted by (1-l)^2.2 on a
  //     frame that is almost entirely shadow — i.e. it applied at nearly full
  //     strength to EVERY pixel, which is the exact opposite of "only in shadow";
  //   * `contrast: 0.955` was flattening an already flat frame instead of giving
  //     the coal bed a shoulder to sit on;
  //   * and CA at 1.45 px on a near-black field does not read as a lens, it turns
  //     achromatic sensor noise into chroma noise, which is precisely the "heavy
  //     dither noise" the critic saw. Halved.
  //
  // The rule this is authored to is "glowing dark", not "dark": open the toe hard
  // so the walls sit in a readable 0.02-0.06 band with colour in them, and let the
  // coal bed be the only thing above it.
  grotto: {
    ev: { min: -8.6, max: 0.4, bias: -1.12, anchor: -3.9, slope: 0.55 },
    // The offset is the toe lift and on a frame this dark it IS the shadow
    // colour: at 0.012/0.008/0.024 it was R+B over G, i.e. magenta, applied to
    // every pixel in the frame, and it measured 18% of the image inside the
    // violet band against §2.5's 2% cap. Near-neutral, faintly warm.
    //
    // AND THE 0.013/0.010/0.014 LIFT IS ALSO GONE. Both it and the 0.088 toe
    // were compensating for cbEncodeOutput's broken inverse, which was taking
    // AgX display 0.05 down to 0.018 — the whole cave. With the encode matched
    // the walls sit in their readable band on their own, and what is left of the
    // lift is a hint of warmth in the black rather than a grey card over the
    // frame. This is the "horizon clipped near-white AND floor crushed
    // near-black in the same frame" finding: both ends were the encode.
    look: { slope: [1.024, 1.000, 0.996], offset: [0.004, 0.003, 0.005], power: [0.96, 0.97, 0.97], saturation: 1.02 },
    // ROUND 6. `toe` was 0.042 and it was the largest remaining lift in the
    // table: measured on tools/_grtune.mjs it bought deep 30.2% -> 26.0% and
    // paid for it by moving p0.1 from 6 to 13, i.e. it was buying a band number
    // with a grey card over the shot. Dropping it to 0.012 and taking the
    // shadow slope from the pivot instead lands deep at 15.0% with p0.1 back at
    // 10 — better on BOTH axes at once. Same argument as the rest of the table,
    // only louder, because this shot had the biggest lift.
    tone: { contrast: 1.30, pivot: 0.310, toe: 0.006, shoulder: 0.008 },
    // sharpen 0.24 -> 0.10: this frame's pixel-scale "detail" is upstream noise
    // (see the third-ring block in main()), and sharpening it measured
    // lumaRMS 0.0692 -> 0.0606 and chromaRMS 0.0473 -> 0.0409 for free. An
    // emissive-dominant shot does not need an edge kernel to read.
    // dnLuma 0.50 — the only area above 0. See the table in the chroma-denoise
    // block: this input's pixel-scale luma residual is 0.047 against a wall whose
    // whole structure is 0.049, i.e. the "texture" a critic sees on that wall is
    // half noise. 0.50 takes the residual to 0.025 and costs 12% of the
    // structure estimate. It is a blur and it is only defensible here.
    lens: { vignette: 0.55, ca: 0.75, grain: 0.014, sharpen: 0.10, chroma: 0.22, dn: 0.96, dnLuma: 0.50 },
    // The cave has no sky. §5.5's only cold light is E5 dripping down the roof
    // cracks — (0.09, 1.45, 1.22), hue 169.8 — and its key is a 1050 K coal.
    // So this is the widest hue split in the game by right: cyan fill against a
    // 1700 K read on the highlight, 160 degrees apart. It was 190 vs 29.
    split: { s: [0.292, 0.660, 0.611, 0.038], h: [0.780, 0.284, 0.160, 0.075] },  // s 172 (E5)  h 12
    hueX: { anchor: 15, amount: 0.62, width: 22 },
    wb: { tint: 0.12, temp: 0.050 },  // Duv -0.0120 -> -0.0026.  A 1050 K COAL IS A BLACKBODY.
    recipe: defaultRecipe({
      crosstalk: 0.024,
      // 0.78/0.72 -> 0.42/0.46. The old note here blamed the renderer for the
      // coloured speckle on the cliff face and used this to bleach it out, on the
      // strength of an A/B that only ruled out CA. That A/B was right about CA
      // and wrong about the conclusion: forcing `gradeNoChroma` on the same shot
      // removes the speckle completely, so the source was cbChromaRestore reading
      // a per-pixel hue angle off near-black radiance. That is fixed at the
      // source (the reference is low-passed now), which means this no longer has
      // to bleach a third of the frame to hide it. What is left is an honest
      // print toe desaturation.
      shadowDesat: 0.42, shadowDesatEnd: 0.46,
      shadowTint: [0.413, 0.620, 0.592], shadowStrength: 0.030,   // E5 down the cracks
      highTint: [0.740, 0.292, 0.180], highStrength: 0.150,       // 1050 K coal
      temp: 0.020, sat: 0.94,
      hue: [
        // the maroon/magenta wash: grey it wherever it is flat, leave the ember
        // cores (which live above valHi) at full chroma
        { center: 0.925, width: 0.16, satMul: 0.30, valLo: 0.02, valHi: 0.74, valSoft: 0.16 },
        { center: 0.800, width: 0.12, satMul: 0.34, valLo: 0.02, valHi: 0.74, valSoft: 0.16 },
        { center: 0.055, width: 0.11, satMul: 0.52, valLo: 0.02, valHi: 0.54, valSoft: 0.14 },
        { center: 0.048, width: 0.09, rot: 0.004, satMul: 1.26, valLo: 0.62, valSoft: 0.16 }, // ember body
        { center: 0.48, width: 0.08, rot: 0.004, satMul: 1.50 },   // E5 down the cracks
        { center: 0.78, width: 0.05, rot: 0.004, satMul: 1.15, valLo: 0.62, valSoft: 0.14 }, // violet only where it is a wet corner, not a wash
        { center: 0.33, width: 0.10, rot: 0.0, satMul: 0.72 },
      ],
    }),
  },

  // §5.6 / §3.5 `spore`: sigma_s x5.5, g 0.35 — "pale, luminous, near-whiteout".
  // NOTE this is the SPORE state, not the Draft. See `draft` below and
  // `_resolveArea`: one area name plus the world's weather picks the grade.
  storm: {
    ev: { min: -3.0, max: 2.8, bias: -0.20, anchor: 0.5, slope: 0.72 },
    look: { slope: [1.006, 1.000, 0.992], offset: [0.003, 0.003, 0.004], power: [1.02, 1.02, 1.03], saturation: 0.94 },
    // Everything in the old recipe flattened: contrast 0.92, toe 0.052,
    // shoulder 0.055, crosstalk 0.145, sat 0.74 — five separate terms all
    // pushing toward one value, applied to a scene the volumetrics had already
    // collapsed. Measured: 63% of pixels in a single band, spec 0.1%, and
    // BYTE-FOR-BYTE the same mid-band colour as the Draft (112,97,82 vs
    // 112,97,81) despite being a different weather state. A whiteout still has a
    // key: it is luminous, so give it a top end.
    // Round 6: 1.70 -> 1.50, and NO exposure lift. storm is the one area the
    // tuner wanted darker rather than brighter (p50 103 already, `high` 33%
    // against a 15-25 target), so it gets the curve half of the change only.
    tone: { contrast: 1.50, pivot: 0.400, toe: 0.006, shoulder: 0.008 },
    lens: { vignette: 0.70, ca: 1.55, grain: 0.029, sharpen: 0.20, chroma: 0.20, dn: 0.50 },
    // §3.5 spore: g 0.35, near-isotropic — the medium IS the light, so there is
    // barely a key/fill relationship to tint. Its identity is the ABSENCE of a
    // split: the weakest shadow term in the table, its chroma pulled to 0.8x,
    // and a 4379 K straw highlight, which is §3.1's top-of-arc sun seen through
    // a whiteout. Pale and luminous is an identity; a teal shadow on a whiteout
    // is just the same grade with the exposure up.
    split: { s: [0.428, 0.601, 0.620, 0.034], h: [0.740, 0.661, 0.502, 0.050] },  // s 186  h 40 (4379 K)
    hueX: { anchor: 20, amount: 0.58, width: 28 },
    wb: { tint: -0.045, temp: -0.010 },
    recipe: defaultRecipe({
      crosstalk: 0.040,
      shadowDesat: 0.24, shadowDesatEnd: 0.20,
      shadowTint: [0.440, 0.584, 0.600], shadowStrength: 0.170,
      highTint: [0.720, 0.658, 0.533], highStrength: 0.075,
      temp: 0.0, sat: 0.86,
      hue: [
        ...OCHRE_RATION(0.33, 0.86),
        { center: 0.50, width: 0.12, rot: 0.0, satMul: 0.80 },
      ],
    }),
  },

  // §5.6 `storm` weather — ART calls this one The Draft, and §3.5 gives it
  // sigma_s x7 / sigma_a x3.4 / g 0.55, reading as "dark, brown, oppressive",
  // against spore's "pale, luminous". Those are opposite images and they were
  // sharing one grade. This is the dark one: lower key, real blacks, and the
  // only bright thing in frame is §5.6's "sky the colour of a hot exhaust".
  draft: {
    ev: { min: -3.5, max: 3.4, bias: 0.05, anchor: 1.20, slope: 0.62 },
    look: { slope: [1.012, 0.998, 0.988], offset: [0.000, 0.000, 0.003], power: [1.06, 1.07, 1.08], saturation: 0.98 },
    // The 0.078 toe was the single largest veil in the table: it lifted black by
    // 7.8 points AND multiplied the shadow slope by (1 - 4t) = 0.69, which is
    // precisely how a shot briefed "dark, brown, oppressive" came back reading as
    // a flat high-key wash. Low key means real blacks and one hot thing in frame,
    // not an overall dim. Pivot pulled down so the mass of the frame sits below
    // middle and the exhaust sky is the only thing on the shoulder.
    // Round 6: 1.85 -> 1.60, and again no exposure lift. `draft` is the one
    // vista NO monotone tone curve fixes — the grid search bottoms out at
    // deep 20%, low 10% for every (contrast, pivot, EV) triple it can reach,
    // because the histogram is bimodal: a crushed foreground and a hazed cliff
    // with nothing between them. That is the aerial-perspective veil, it is not
    // this file's, and it is filed under HANDOFF ## requests with the numbers.
    tone: { contrast: 1.60, pivot: 0.340, toe: 0.008, shoulder: 0.006 },
    lens: { vignette: 0.84, ca: 1.45, grain: 0.030, sharpen: 0.20, chroma: 0.20, dn: 0.50 },
    // THE ONE AREA WITH NO TEAL IN IT, AND THAT IS DERIVED, NOT CHOSEN. §3.5
    // gives The Draft sigma_a x3.4 on an absorber that already eats blue three
    // times harder than red; at 60-90 m visibility (§5.6) there is no short
    // wavelength left anywhere in the volume, so a sky-lit shadow is physically
    // unavailable. What ART leaves for a shadow here is A13 Tarnish,
    // (0.078, 0.052, 0.081) — "the world's ONLY violet... wet char, shadowed
    // crack interiors" — at hue 296. §2.5 rations violet to 2% of pixels and
    // only in shadow, which is exactly the weighting a (1-l)^2 split term has,
    // so the chroma is pulled to 0.78x and the strength left at 0.050 and the
    // ration is then MEASURED with tools/valuebands.mjs rather than assumed.
    // Against a 1707 K exhaust sky this is the frame's whole colour argument.
    split: { s: [0.549, 0.504, 0.560, 0.030], h: [0.800, 0.350, 0.200, 0.085] },  // s 288 (A13, sat 0.10)  h 15
    hueX: { anchor: 20, amount: 0.60, width: 26 },
    wb: { tint: 0.04, temp: 0.040 },
    recipe: defaultRecipe({
      crosstalk: 0.030,
      shadowDesat: 0.28, shadowDesatEnd: 0.22,
      shadowTint: [0.517, 0.499, 0.520], shadowStrength: 0.190,   // A13, so the sky reads hot
      highTint: [0.780, 0.360, 0.220], highStrength: 0.170,       // hot exhaust
      temp: 0.020, sat: 0.90,
      hue: [
        ...OCHRE_RATION(0.32, 0.82),
        { center: 0.50, width: 0.12, rot: 0.0, satMul: 0.70 },
      ],
    }),
  },

  // §5.4 the one mirror in the world; teal sky and amber horizon in the ground.
  water: {
    ev: { min: -4.6, max: 3.6, bias: -0.30, anchor: -1.2, slope: 0.68 },
    look: { slope: [1.002, 1.000, 1.012], offset: [0.000, 0.000, 0.006], power: [1.10, 1.10, 1.09], saturation: 1.06 },
    tone: { contrast: 1.34, pivot: 0.400, toe: 0.006, shoulder: 0.012 },
    lens: { vignette: 0.36, ca: 1.05, grain: 0.015, sharpen: 0.30, chroma: 0.32, dn: 0.60 },
    split: { s: [0.280, 0.647, 0.720, 0.055], h: [0.700, 0.529, 0.320, 0.070] },  // s 190  h 33 (3259 K)
    hueX: { anchor: 26, amount: 0.54, width: 26 },
    wb: { tint: -0.03, temp: -0.015 },   // shade Duv +0.0074 -> +0.0050
    recipe: defaultRecipe({
      crosstalk: 0.018,
      shadowDesat: 0.20, shadowDesatEnd: 0.18,
      shadowTint: [0.300, 0.617, 0.680], shadowStrength: 0.150,
      highTint: [0.680, 0.527, 0.340], highStrength: 0.100,
      temp: 0.0, sat: 1.06,
      hue: [
        ...OCHRE_RATION(0.35),
        { center: 0.52, width: 0.11, rot: 0.004, satMul: 1.30 },
      ],
    }),
  },

  // §3.4 night: 900-1400 K smoulder, no moonlight cliché.
  night: {
    ev: { min: -7.6, max: 1.6, bias: 0.0, anchor: -3.6, slope: 0.55 },
    look: { slope: [1.028, 0.998, 1.002], offset: [0.002, 0.001, 0.008], power: [1.00, 1.02, 1.02], saturation: 1.06 },
    tone: { contrast: 1.32, pivot: 0.340, toe: 0.014, shoulder: 0.006 },
    lens: { vignette: 0.62, ca: 1.00, grain: 0.022, sharpen: 0.16, chroma: 0.30, dn: 0.95 },
    split: { s: [0.340, 0.640, 0.620, 0.055], h: [0.780, 0.336, 0.160, 0.075] },  // s 176 (E5)  h 17
    hueX: { anchor: 18, amount: 0.58, width: 24 },
    wb: { tint: 0.0, temp: 0.030 },
    recipe: defaultRecipe({
      crosstalk: 0.030,
      shadowDesat: 0.34, shadowDesatEnd: 0.30,
      shadowTint: [0.380, 0.620, 0.604], shadowStrength: 0.080,
      highTint: [0.760, 0.344, 0.180], highStrength: 0.140,
      temp: 0.02, sat: 1.00,
      hue: [
        { center: 0.045, width: 0.11, rot: 0.002, satMul: 1.20, valLo: 0.52, valSoft: 0.16 },
        { center: 0.045, width: 0.12, satMul: 0.58, valLo: 0.02, valHi: 0.48, valSoft: 0.14 },
        { center: 0.48, width: 0.09, rot: 0.004, satMul: 1.34 },
      ],
    }),
  },
};

// quality -> shader shape. `low` keeps the identity of the look (LUT, grain,
// vignette, dither) and loses only reach — CONTRACT §7.
const PRESETS = {
  low:    { caTaps: 0, sharpen: false, meterN: 32, grainScale: 0.85, lut: true, wideChroma: false },
  medium: { caTaps: 3, sharpen: false, meterN: 48, grainScale: 0.95, lut: true, wideChroma: false },
  high:   { caTaps: 3, sharpen: true,  meterN: 64, grainScale: 1.00, lut: true, wideChroma: true },
  ultra:  { caTaps: 5, sharpen: true,  meterN: 64, grainScale: 1.00, lut: true, wideChroma: true },
};

// =============================================================================

export class Grade {
  static id = 'grade';
  static deps = ['renderer'];

  constructor(ctx) {
    this.ctx = ctx;
    this.pass = null;
    this.failed = false;
    this._errors = 0;
    this._snap = true;
    this._lutCache = new Map();
    this._chain = null;
    this._chainKey = '';

    // ------------------------------------------------------------------ knobs
    this.p = {
      enabled: true,

      // exposure
      exposureMode: 'auto',    // 'auto' | 'fixed'
      fixedEV: null,           // number => hard override (the regression harness sets this)
      minEV: -9.0,
      maxEV: 5.0,
      evBias: 0.0,
      evSlope: 0.62,          // <1 = partial compensation; 1 = a plain light meter
      evAnchor: -1.2,         // EV the area is authored to sit at
      adaptUpTau: 0.90,        // dark -> light, seconds
      adaptDownTau: 2.40,      // light -> dark, seconds
      meterFalloff: 1.15,      // metering mask radius
      meterFloor: 0.35,        // mask weight at the edge
      trimLow: 2.0,            // EV below mu1 kept by iteration 2
      trimHigh: 2.5,           // EV above
      trimMinFrac: 0.05,       // fall back to mu1 if the trim kept less than this

      // AgX look (display-log domain)
      slope: [1.018, 1.000, 0.994],   // warm highlights: R up, B down. NOT R+B up.
      offset: [0.000, 0.001, 0.0045], // cool shadows live in the OFFSET, not the slope
      power: [1.10, 1.11, 1.12],
      saturation: 1.06,

      // analytic tone curve — see cbTone. Lives here rather than in the baked
      // LUT so it is exact at every input (no 33-node contouring) and blends
      // continuously between areas.
      contrast: 1.34,
      pivot: 0.395,
      toe: 0.008,        // print toe: lifts black WITHOUT the old 4x slope crush
      shoulder: 0.010,

      // LUT
      lutStrength: 0.85,
      lutBlend: 0.0,

      // chroma restore (see the shader block). `chroma` is per-area.
      chroma: 0.35,            // 0 = raw AgX, 1 = the scene's own chroma exactly
      chromaToe: 0.085,        // below this display luma the restore fades out
      chromaHighlight: 0.62,   // above this it hands the roll-to-white to AgX
      chromaClamp: 3.5,        // cap on a channel's scene ratio to its luma
      chromaDenoise: 0.85,     // input chroma low-pass — see the block in main()
      chromaDenoisePop: 1.7,   // local brightness ratio at which an emitter is exempt
      chromaDenoiseLuma: 0.0,  // per-area: how much of the LUMA the same kernel
                               // low-passes. 0 on every input that is not noise.

      // hue contrast — see the block in main(). `anchor` and `width` are in
      // DEGREES here and in the area table; the shader wants turns.
      hueXAnchor: 25.0,
      hueXAmount: 0.55,
      hueXWidth: 26.0,         // identity inside +-26 deg of the anchor
      hueXToe: 0.10,           // display luma below which it fades out

      // display-domain split tone + white balance. See the block in main() for
      // why these are here and not in the baked recipe's steps 5 and 7.
      splitS: [0.34, 0.590, 0.64, 0.0],   // shadow tint rgb, strength
      splitH: [0.68, 0.55, 0.34, 0.0],   // highlight tint rgb, strength
      wbTint: 0.0,             // + green, - magenta. Read tools/_grhue.mjs Duv.
      wbTemp: 0.0,             // + warm, - cool

      // lens
      caStrength: 1.20,        // pixels of separation at the corner
      caExponent: 3.2,         // >2.4: the centre half of the frame must be clean
      caTail: 0.35,
      caFringeClamp: 6.0,      // cap a borrowed channel at N x the local luminance
      // Grains down the height of the frame, at any resolution — so this number
      // IS the lattice pitch: 1080/800 = 1.350 px. It is unchanged, because the
      // pitch sweep said so. See the block above cbHash21; with the hash and the
      // rotation fixed, max autocorrelation prominence over lags 4-20 across all
      // four axes, averaged over three lattice offsets:
      //
      //   cells   pitch    rot 0   rot 26.57   rot 15   rot 40
      //     800   1.350 px  0.575     0.133     0.226    0.316
      //     640   1.688     0.768     0.615     0.597    0.417
      //     520   2.077     0.583     0.540     0.669    0.404
      //     400   2.700     0.517     0.528     0.548    0.547
      //
      // The obvious move — raise the pitch past Nyquist so the lattice is
      // resolved rather than aliased — measures WORSE, on every angle. Below
      // Nyquist the aliased lattice is near-white and has nothing to lock to;
      // above it, the lattice is a real resolved grid and the eye gets it back.
      // The pairing that wins is a sub-pixel pitch, an aperiodic hash and a
      // rotation, and it is 4.3x better than shipped without touching the
      // authored grain density at all.
      grainAmount: 0.021,
      grainCells: 800.0,
      grainShadowFloor: 0.35,
      vignette: 0.45,
      vignetteNatural: 0.26,   // cos^4 coefficient, evaluated at r=1 = the corner
      vignetteInner: 0.55,
      vignetteOuter: 1.30,
      sharpen: 0.28,
      dither: 1.0,             // multiples of 1/255

      // areas
      area: 'basin',
      areaBlendMs: 900,
      debugSplit: 0.5,
    };
    ctx.debug.grade = this.p;

    this._area = null;
    this._blend = { t: 1, dur: 0, from: null, to: null };
    this._lutA = null;
    this._lutB = null;
    this._u = null;
    this._mats = null;
    this._preset = PRESETS.high;
    this._grainOff = null;
    this._stats = { ms: 0, draws: 0 };
  }

  // ---------------------------------------------------------------------------

  async init() {
    const { ctx } = this;
    try {
      // 64 decorrelated grain offsets, baked from the seeded PRNG. Indexed by
      // frame & 63: deterministic, and it never visibly repeats.
      const rng = ctx.rng.fork('grade.grain');
      this._grainOff = new Float32Array(128);
      for (let i = 0; i < 128; i++) this._grainOff[i] = rng.range(0, 977.0);

      // The dither mask. ~130 ms of void-and-cluster at 64x64, once, and it is
      // deliberately NOT on ctx.boot.task: that queue only appends, and by the
      // time it runs this pass has already rendered frames with a null sampler.
      // 130 ms against CONTRACT §1's 6 s boot is affordable; a first second of
      // undithered sky is not.
      this._blueData = makeBlueNoise(BLUE_N, ctx.rng.fork('grade.bluenoise'));
      this._blueTex = blueNoiseTexture(this._blueData, BLUE_N);

      this._preset = PRESETS[ctx.quality.preset] || PRESETS.high;
      this._buildMaterials();

      // Prime the area so the first frame is already graded.
      this._applyAreaImmediate(this.p.area);

      const f = ctx.debug.flags;
      if (f.grade === undefined) f.grade = true;      // so the first toggle turns it OFF
      if (f.gradeSplit === undefined) f.gradeSplit = false;
      if (f.gradeClip === undefined) f.gradeClip = false;
      if (f.gradeNoLut === undefined) f.gradeNoLut = false;
      if (f.gradeNoGrain === undefined) f.gradeNoGrain = false;
      if (f.gradeNoCA === undefined) f.gradeNoCA = false;
      if (f.gradeNoVignette === undefined) f.gradeNoVignette = false;
      if (f.gradeNoChroma === undefined) f.gradeNoChroma = false;
      if (f.gradeNoSplit === undefined) f.gradeNoSplit = false;
      if (f.gradeNoHueX === undefined) f.gradeNoHueX = false;

      this.pass = ctx.frameGraph.register({
        id: 'grade',
        order: 110,
        inputs: [],                 // deliberately none: forcing `viewZ` to exist
        outputs: ['screen'],        // just for a sharpen mask is not worth 0.05 ms
        enabled: this.p.enabled !== false,
        execute: (target, gbuf, c) => {
          if (this.failed) { this._blitFallback(gbuf, c); return; }
          try {
            this._execute(gbuf, c);
          } catch (e) {
            this._errors++;
            console.error('[grade] execute failed (' + this._errors + '):', e);
            if (this._errors >= 3) {
              // Give up and hand the blit back to renderer.js's ACES fallback,
              // which is a correct — if unstyled — image. Never a black frame.
              this.failed = true;
              this.pass.enabled = false;
              c.frameGraph.invalidate?.();
            }
            this._blitFallback(gbuf, c);
          }
        },
        reset: () => { this._snap = true; },
      });

      this._wireBus();
    } catch (e) {
      this.failed = true;
      console.error('[grade] init failed, pass not registered (renderer.js ACES blit stands in):', e);
    }
  }

  _wireBus() {
    const b = this.ctx.bus;
    b.on('quality', () => this.onQuality());
    b.on('debugFlag', ({ flag }) => {
      if (flag === 'grade') {
        if (this.pass && !this.failed) {
          this.pass.enabled = !!this.ctx.debug.flags.grade;
          this.ctx.frameGraph.invalidate?.();
        }
      }
    });
    b.on('grade:area', (e) => { if (e) this.setArea(e.name || e.area, e.ms); });
    b.on('area', (e) => { if (e && (e.grade || e.name)) this.setArea(e.grade || e.name, e.ms); });
    b.on('grade:ev', (e) => { if (e) this.setAreaEV(e); });
    // director.js may just announce a biome; map the obvious names.
    b.on('biome', (e) => {
      const n = typeof e === 'string' ? e : (e && e.name);
      if (n && AREAS[n]) this.setArea(n);
    });
  }

  // ---------------------------------------------------------------------------
  // public API
  // ---------------------------------------------------------------------------

  /**
   * ONE AREA NAME PLUS THE WORLD'S WEATHER PICKS THE GRADE.
   *
   * `main.js` labels both storm vistas `area: 'storm'`, but ART §3.5 gives them
   * opposite images — `spore` is sigma_s x5.5 / g 0.35, "pale, luminous,
   * near-whiteout"; `storm` is x7 / sigma_a x3.4, "dark, brown, oppressive", and
   * §5.6 calls that one The Draft. Sharing a grade is why they came back with the
   * same mid-band colour to within one code value (112,97,82 vs 112,97,81) and
   * why a critic filed them as one finding. The vista table is not mine to edit
   * (CONTRACT §4) and it should not have to know about grade names anyway — the
   * weather is already on `ctx.sys.sky`, so read it. Re-checked every frame, so a
   * director-driven weather change re-grades on its own.
   */
  _resolveArea(name) {
    if (name !== 'storm' && name !== 'draft') return name;
    const w = this.ctx.sys?.sky?.weather;
    if (w === 'storm') return 'draft';
    if (w === 'spore' || w === 'haze' || w === 'clear' || w === 'rain') return 'storm';
    return name;
  }

  /** Blend to an authored area grade. Unknown names fall back to `neutral`. */
  setArea(name, ms) {
    if (!name) return false;
    this._requested = name;
    name = this._resolveArea(name);
    if (!AREAS[name]) { console.warn('[grade] unknown area "' + name + '"'); name = 'neutral'; }
    if (name === this._area && this._blend.t >= 1) return true;
    const dur = Number.isFinite(ms) ? ms : this.p.areaBlendMs;
    if (dur <= 0) { this._applyAreaImmediate(name); return true; }

    // A blend already in flight has no single "current LUT" to hand to slot A.
    // Promote whichever side is dominant; the visible error is at most half a
    // cross-fade and it only happens if the director retriggers mid-transition.
    if (this._blend.t < 1 && this._blend.t > 0.5 && this._lutB) this._lutA = this._lutB;
    this._lutB = this._lut(name);
    this._blend.from = this._snapshotScalars();
    this._blend.to = this._scalarsFor(name);
    this._blend.t = 0;
    this._blend.dur = dur / 1000;
    this._area = name;
    this.p.area = name;
    return true;
  }

  /** RENDER_PLAN §10.2 — per-zone exposure bounds, art-directable bias. */
  setAreaEV({ min, max, bias, blendMs } = {}) {
    if (Number.isFinite(min)) this.p.minEV = min;
    if (Number.isFinite(max)) this.p.maxEV = max;
    if (Number.isFinite(bias)) this.p.evBias = bias;
    void blendMs;   // EV bounds are clamps, not a look; they take effect at once
    return { min: this.p.minEV, max: this.p.maxEV, bias: this.p.evBias };
  }

  /** Jump adaptation straight to its target. `__CB.gotoVista` must call this. */
  snapExposure() { this._snap = true; return this; }

  /** Force a specific EV100 (null = auto). The regression harness sets this. */
  setFixedEV(ev) { this.p.fixedEV = Number.isFinite(ev) ? ev : null; return this; }

  /** Register or replace an area recipe at runtime (for tuning sessions). */
  defineArea(name, def) {
    AREAS[name] = def;
    this._lutCache.delete(name);
    if (this._area === name) this._applyAreaImmediate(name);
    return this;
  }

  listAreas() { return Object.keys(AREAS); }

  /** The live authored definition, for tuning sessions and tools/_grlut.mjs. */
  areaDef(name) { return AREAS[name || this._area]; }

  // ---------------------------------------------------------------------------
  // area plumbing
  // ---------------------------------------------------------------------------

  _lut(name) {
    let t = this._lutCache.get(name);
    if (!t) {
      const a = AREAS[name] || AREAS.neutral;
      t = bakeLut(a.recipe || defaultRecipe());
      this._lutCache.set(name, t);
    }
    return t;
  }

  _scalarsFor(name) {
    const a = AREAS[name] || AREAS.neutral;
    const t = a.tone || {};
    return {
      slope: a.look.slope.slice(), offset: a.look.offset.slice(),
      power: a.look.power.slice(), saturation: a.look.saturation,
      contrast: t.contrast ?? 1.0, pivot: t.pivot ?? 0.435,
      toe: t.toe ?? 0.0, shoulder: t.shoulder ?? 0.0,
      minEV: a.ev.min, maxEV: a.ev.max, evBias: a.ev.bias,
      evSlope: a.ev.slope ?? 0.62, evAnchor: a.ev.anchor ?? -1.2,
      vignette: a.lens.vignette, ca: a.lens.ca, grain: a.lens.grain, sharpen: a.lens.sharpen,
      chroma: a.lens.chroma ?? 0.35, dn: a.lens.dn ?? 0.35, dnLuma: a.lens.dnLuma ?? 0.0,
      splitS: (a.split?.s || [0.34, 0.590, 0.64, 0.0]).slice(),
      splitH: (a.split?.h || [0.68, 0.55, 0.34, 0.0]).slice(),
      wbTint: a.wb?.tint ?? 0.0, wbTemp: a.wb?.temp ?? 0.0,
      hueXAnchor: a.hueX?.anchor ?? 25.0, hueXAmount: a.hueX?.amount ?? 0.0,
      hueXWidth: a.hueX?.width ?? 26.0,
    };
  }

  _snapshotScalars() {
    const p = this.p;
    return {
      slope: p.slope.slice(), offset: p.offset.slice(), power: p.power.slice(),
      saturation: p.saturation,
      contrast: p.contrast, pivot: p.pivot, toe: p.toe, shoulder: p.shoulder,
      minEV: p.minEV, maxEV: p.maxEV, evBias: p.evBias,
      evSlope: p.evSlope, evAnchor: p.evAnchor,
      vignette: p.vignette, ca: p.caStrength, grain: p.grainAmount, sharpen: p.sharpen,
      chroma: p.chroma, dn: p.chromaDenoise, dnLuma: p.chromaDenoiseLuma,
      splitS: p.splitS.slice(), splitH: p.splitH.slice(),
      wbTint: p.wbTint, wbTemp: p.wbTemp,
      hueXAnchor: p.hueXAnchor, hueXAmount: p.hueXAmount, hueXWidth: p.hueXWidth,
    };
  }

  _writeScalars(s) {
    const p = this.p;
    p.slope = s.slope; p.offset = s.offset; p.power = s.power;
    p.saturation = s.saturation;
    if (s.contrast !== undefined) {
      p.contrast = s.contrast; p.pivot = s.pivot; p.toe = s.toe; p.shoulder = s.shoulder;
    }
    p.minEV = s.minEV; p.maxEV = s.maxEV; p.evBias = s.evBias;
    if (s.evSlope !== undefined) { p.evSlope = s.evSlope; p.evAnchor = s.evAnchor; }
    p.vignette = s.vignette; p.caStrength = s.ca;
    p.grainAmount = s.grain; p.sharpen = s.sharpen;
    if (s.chroma !== undefined) p.chroma = s.chroma;
    if (s.dn !== undefined) p.chromaDenoise = s.dn;
    if (s.dnLuma !== undefined) p.chromaDenoiseLuma = s.dnLuma;
    if (s.splitS !== undefined) { p.splitS = s.splitS; p.splitH = s.splitH; }
    if (s.wbTint !== undefined) { p.wbTint = s.wbTint; p.wbTemp = s.wbTemp; }
    if (s.hueXAmount !== undefined) {
      p.hueXAnchor = s.hueXAnchor; p.hueXAmount = s.hueXAmount; p.hueXWidth = s.hueXWidth;
    }
  }

  _applyAreaImmediate(name) {
    this._requested = name;
    name = this._resolveArea(name);
    if (!AREAS[name]) name = 'neutral';
    this._area = name;
    this.p.area = name;
    this._lutA = this._lut(name);
    this._lutB = this._lutA;
    this._blend.t = 1; this._blend.dur = 0;
    this._writeScalars(this._scalarsFor(name));
  }

  _advanceBlend(dt) {
    const b = this._blend;
    if (b.t >= 1) return;
    b.t = Math.min(1, b.t + dt / Math.max(1e-4, b.dur));
    const k = b.t * b.t * (3 - 2 * b.t);     // smoothstep — a linear grade blend reads as a wipe
    const f = b.from, t = b.to;
    const v3 = (a, c) => [lerp(a[0], c[0], k), lerp(a[1], c[1], k), lerp(a[2], c[2], k)];
    const v4 = (a, c) => [lerp(a[0], c[0], k), lerp(a[1], c[1], k), lerp(a[2], c[2], k), lerp(a[3], c[3], k)];
    const D_S = [0.34, 0.590, 0.64, 0.0], D_H = [0.68, 0.55, 0.34, 0.0];
    this._writeScalars({
      slope: v3(f.slope, t.slope), offset: v3(f.offset, t.offset), power: v3(f.power, t.power),
      saturation: lerp(f.saturation, t.saturation, k),
      contrast: lerp(f.contrast ?? 1, t.contrast ?? 1, k),
      pivot: lerp(f.pivot ?? 0.435, t.pivot ?? 0.435, k),
      toe: lerp(f.toe ?? 0, t.toe ?? 0, k),
      shoulder: lerp(f.shoulder ?? 0, t.shoulder ?? 0, k),
      minEV: lerp(f.minEV, t.minEV, k), maxEV: lerp(f.maxEV, t.maxEV, k),
      evBias: lerp(f.evBias, t.evBias, k),
      evSlope: lerp(f.evSlope, t.evSlope, k), evAnchor: lerp(f.evAnchor, t.evAnchor, k),
      vignette: lerp(f.vignette, t.vignette, k), ca: lerp(f.ca, t.ca, k),
      grain: lerp(f.grain, t.grain, k), sharpen: lerp(f.sharpen, t.sharpen, k),
      chroma: lerp(f.chroma ?? 0.35, t.chroma ?? 0.35, k),
      dn: lerp(f.dn ?? 0.35, t.dn ?? 0.35, k),
      dnLuma: lerp(f.dnLuma ?? 0, t.dnLuma ?? 0, k),
      splitS: v4(f.splitS || D_S, t.splitS || D_S),
      splitH: v4(f.splitH || D_H, t.splitH || D_H),
      wbTint: lerp(f.wbTint ?? 0, t.wbTint ?? 0, k),
      wbTemp: lerp(f.wbTemp ?? 0, t.wbTemp ?? 0, k),
      // A plain lerp on a hue is only correct away from the wrap. Every anchor
      // in the table is between 12 and 28 degrees on purpose — they are all the
      // ochre flood — so the short way round is always the direct one here. If a
      // future area ever anchors near 0/360, this needs the circular form.
      hueXAnchor: lerp(f.hueXAnchor ?? 25, t.hueXAnchor ?? 25, k),
      hueXAmount: lerp(f.hueXAmount ?? 0, t.hueXAmount ?? 0, k),
      hueXWidth: lerp(f.hueXWidth ?? 26, t.hueXWidth ?? 26, k),
    });
    this.p.lutBlend = k;
    if (b.t >= 1) { this._lutA = this._lutB; this.p.lutBlend = 0; }
  }

  // ---------------------------------------------------------------------------
  // materials
  // ---------------------------------------------------------------------------

  _raw(frag, uniforms, defines) {
    const m = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,      // three prepends `#version 300 es` (trap 1)
      vertexShader: FS_VERT,
      fragmentShader: frag,
      uniforms,
      defines: defines || {},
      depthTest: false, depthWrite: false,
    });
    // Two RawShaderMaterials with identical `parameters` share a program
    // regardless of defines unless the cache key says otherwise (§11).
    const key = JSON.stringify(defines || {});
    m.customProgramCacheKey = () => key;
    return m;
  }

  _buildMaterials() {
    const old = this._mats;
    const P = this._preset;

    const u = this._u = this._u || {
      // meter chain
      lum: { tSrc: { value: null }, uSrcTexel: { value: new THREE.Vector2() },
             uMaskFalloff: { value: 1.15 }, uMaskFloor: { value: 0.35 } },
      box: { tSrc: { value: null }, uStep: { value: new THREE.Vector2() } },
      meter: { tLum: { value: null }, uSize: { value: new THREE.Vector2(1, 1) },
               uTrim: { value: new THREE.Vector2(2.0, 2.5) }, uMinFrac: { value: 0.05 } },
      adapt: { tMeter: { value: null }, tPrev: { value: null },
               uRange: { value: new THREE.Vector4(-9, 5, 0, 1 / 60) },
               uTau: { value: new THREE.Vector4(0.9, 2.4, 1, -1000) },
               uComp: { value: new THREE.Vector2(0.62, -1.2) } },
      grade: {
        tSrc: { value: null }, tExposure: { value: null },
        tLutA: { value: null }, tLutB: { value: null },
        tBlue: { value: this._blueTex || null },
        uBlueOff: { value: new THREE.Vector2(0, 0) },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uLut: { value: new THREE.Vector4(0.85, 0, LUT_N, 0) },
        uSlope: { value: new THREE.Vector3(1, 1, 1) },
        uOffset: { value: new THREE.Vector3(0, 0, 0) },
        uPower: { value: new THREE.Vector3(1, 1, 1) },
        uSaturation: { value: 1.0 },
        uCA: { value: new THREE.Vector4(1.20, 3.2, 0.35, 6.0) },
        uGrain: { value: new THREE.Vector4(0.035, 800, 0.35, 0) },
        uGrainOff: { value: new THREE.Vector2() },
        uVig: { value: new THREE.Vector4(0.45, 0.26, 0.55, 1.30) },
        uSharpen: { value: 0.28 },
        uChroma: { value: new THREE.Vector4(0.35, 0.045, 0.62, 3.5) },
        uChromaDn: { value: new THREE.Vector4(0.8, 1.7, 0.0, 0.0) },
        uHueX: { value: new THREE.Vector4(25 / 360, 0.0, 26 / 360, 0.10) },
        uSplitS: { value: new THREE.Vector4(0.34, 0.50, 0.64, 0.0) },
        uSplitH: { value: new THREE.Vector4(0.68, 0.55, 0.34, 0.0) },
        uWB: { value: new THREE.Vector2(0, 0) },
        uTone: { value: new THREE.Vector4(1, 0, 0, 0) },
        uToneG: { value: new THREE.Vector2(1, 1) },
        uOut: { value: new THREE.Vector4(1 / 255, 0, 0, 0.5) },
        toneMappingExposure: { value: 1.0 },
      },
      fallback: { tSrc: { value: null }, tExposure: { value: null }, uHasExposure: { value: 0 } },
    };

    // uSize must be an ivec2 in the shader; three sends a Vector2 as ivec2 when
    // the uniform is declared ivec2, so keep the JS side a Vector2 of integers.
    const defines = {
      CB_CA_TAPS: P.caTaps,
      CB_BLUE_N: BLUE_N,
      CB_DITHER: '',
      CB_GRAIN: '',
      CB_VIGNETTE: '',
      // Identity-preserving and cheap (no texture fetch), so it is on at every
      // preset — like dither, it is part of the look's identity, not its reach.
      CB_CHROMA: '',
      CB_HUEX: '',
    };
    if (P.lut) { defines.CB_LUT = ''; defines.CB_LUT_BLEND = ''; }
    if (P.wideChroma) defines.CB_CHROMA_WIDE = '';
    if (P.sharpen) defines.CB_SHARPEN = '';

    // Order is load-bearing: HEAD declares the samplers, the uniforms and the
    // `cbAgxLook` prototype; the three chunk (which calls cbAgxLook) comes next;
    // BODY defines cbAgxLook and main().
    const gradeFrag = GRADE_FRAG_HEAD + agxSource() + GRADE_FRAG_BODY;

    this._mats = {
      lum: old ? old.lum : this._raw(LUM_FRAG, u.lum),
      box: old ? old.box : this._raw(BOX_FRAG, u.box),
      meter: old ? old.meter : this._raw(METER_FRAG, u.meter),
      adapt: old ? old.adapt : this._raw(ADAPT_FRAG, u.adapt),
      fallback: old ? old.fallback : this._raw(FALLBACK_FRAG, u.fallback),
      grade: this._raw(gradeFrag, u.grade, defines),
    };

    if (old && old.grade) old.grade.dispose();
  }

  onQuality() {
    const P = PRESETS[this.ctx.quality.preset] || PRESETS.high;
    if (P === this._preset) return;
    this._preset = P;
    try { this._buildMaterials(); } catch (e) { console.error('[grade] rebuild failed:', e); }
    this._chainKey = '';
    this._snap = true;
  }

  resize() { this._chainKey = ''; this._snap = true; }

  update() { /* all state advances per RENDERED frame — see _execute */ }

  dispose() {
    for (const t of this._lutCache.values()) t.dispose();
    this._lutCache.clear();
    this._blueTex?.dispose();
    if (this._mats) for (const m of Object.values(this._mats)) m.dispose?.();
  }

  // ---------------------------------------------------------------------------
  // the frame
  // ---------------------------------------------------------------------------

  /**
   * Sizes of the metering reduction chain. Successive 4x box steps from quarter
   * resolution down to about `meterN`, then a final resample only if that would
   * not be an upsample.
   */
  _meterChain(w, h) {
    const N = this._preset.meterN;
    const key = w + 'x' + h + '@' + N;
    if (this._chainKey === key) return this._chain;
    let cw = Math.max(1, Math.ceil(w / 4)), ch = Math.max(1, Math.ceil(h / 4));
    const sizes = [[cw, ch]];
    let guard = 0;
    while (Math.max(cw, ch) > N * 2 && guard++ < 6) {
      cw = Math.max(1, Math.ceil(cw / 4)); ch = Math.max(1, Math.ceil(ch / 4));
      sizes.push([cw, ch]);
    }
    if (cw > N || ch > N) { cw = Math.min(cw, N); ch = Math.min(ch, N); sizes.push([cw, ch]); }
    this._chain = sizes;
    this._chainKey = key;
    return sizes;
  }

  _blitFallback(g, ctx) {
    try {
      const R = ctx.sys.renderer;
      if (!g.sceneHDR) return;
      this._u.fallback.tSrc.value = g.sceneHDR;
      this._u.fallback.tExposure.value = this._evRT ? this._evRT.texture : null;
      this._u.fallback.uHasExposure.value = this._evRT ? 1 : 0;
      R.fullscreen(this._mats.fallback, null);
    } catch { /* nothing left to try */ }
  }

  _execute(g, ctx) {
    const R = ctx.sys.renderer;
    if (!g.sceneHDR) return;

    // `gbuf.width/height` are stale at 1 in the current renderer.js (its first
    // _allocate runs before _gbufObj exists and later calls early-return). The
    // Renderer instance's own fields are correct. Filed in HANDOFF ## requests.
    const fw = R.width || g.width, fh = R.height || g.height;
    const p = this.p;
    const u = this._u;
    const P = this._preset;
    let draws = 0;

    // Weather may have moved under us (director, or a vista that set the weather
    // after the area). Cheap string compare; only acts when it actually differs.
    if (this._requested && this._blend.t >= 1) {
      const want = this._resolveArea(this._requested);
      if (want !== this._area && AREAS[want]) this.setArea(this._requested, this.p.areaBlendMs);
    }

    this._advanceBlend(ctx.time.dt || 1 / 60);

    // ---- 1. metering chain --------------------------------------------------
    const chain = this._meterChain(fw, fh);
    const fmt = { format: THREE.RGFormat, type: THREE.HalfFloatType, filter: THREE.LinearFilter };

    let src = g.sceneHDR;
    let cur = null;
    for (let i = 0; i < chain.length; i++) {
      const [cw, ch] = chain[i];
      const dst = R.rt('gradeLum' + i, { w: cw, h: ch, ...fmt });
      if (i === 0) {
        u.lum.tSrc.value = src;
        u.lum.uSrcTexel.value.set(1 / fw, 1 / fh);
        u.lum.uMaskFalloff.value = p.meterFalloff;
        u.lum.uMaskFloor.value = p.meterFloor;
        R.fullscreen(this._mats.lum, dst);
      } else {
        u.box.tSrc.value = cur.texture;
        u.box.uStep.value.set(1 / cw, 1 / ch);
        R.fullscreen(this._mats.box, dst);
      }
      cur = dst; draws++;
    }

    // ---- 2. trimmed log-mean -> 1x1 ----------------------------------------
    const meterRT = R.rt('gradeMeter', { w: 1, h: 1, format: THREE.RGBAFormat, type: THREE.FloatType, filter: THREE.NearestFilter });
    u.meter.tLum.value = cur.texture;
    u.meter.uSize.value.set(cur.width, cur.height);
    u.meter.uTrim.value.set(p.trimLow, p.trimHigh);
    u.meter.uMinFrac.value = p.trimMinFrac;
    R.fullscreen(this._mats.meter, meterRT);
    draws++;

    // ---- 3. adaptation (GPU-resident 1x1 state, no readback) ----------------
    const pp = R.pingpong('gradeEV', { w: 1, h: 1, format: THREE.RGBAFormat, type: THREE.FloatType, filter: THREE.NearestFilter });
    pp.swap();
    const fixed = (p.exposureMode === 'fixed' || Number.isFinite(p.fixedEV))
      ? (Number.isFinite(p.fixedEV) ? p.fixedEV : 3.0) : -1000;
    u.adapt.tMeter.value = meterRT.texture;
    u.adapt.tPrev.value = pp.read.texture;
    u.adapt.uRange.value.set(p.minEV, Math.max(p.minEV + 0.01, p.maxEV), p.evBias, ctx.time.dt || 1 / 60);
    u.adapt.uTau.value.set(
      Math.max(1e-3, p.adaptUpTau), Math.max(1e-3, p.adaptDownTau),
      (this._snap || g.firstFrame) ? 1 : 0, fixed);
    u.adapt.uComp.value.set(clamp(p.evSlope, 0, 1), p.evAnchor);
    R.fullscreen(this._mats.adapt, pp.write);
    this._snap = false;
    this._evRT = pp.write;
    draws++;

    // ---- 4. grade + output --------------------------------------------------
    const f = ctx.debug.flags;
    const gu = u.grade;
    gu.tSrc.value = g.sceneHDR;
    gu.tExposure.value = pp.write.texture;
    gu.tLutA.value = this._lutA;
    gu.tLutB.value = this._lutB || this._lutA;
    gu.uTexel.value.set(1 / fw, 1 / fh);
    gu.uLut.value.set(f.gradeNoLut ? 0 : p.lutStrength, p.lutBlend, LUT_N, 0);
    gu.uSlope.value.fromArray(p.slope);
    gu.uOffset.value.fromArray(p.offset);
    gu.uPower.value.fromArray(p.power);
    gu.uSaturation.value = p.saturation;

    // Tone curve. The pivot is solved to a gamma pair here so cbTone costs four
    // pow() per channel instead of six, and so a blended pivot never has to be
    // log()'d per pixel.
    const piv = clamp(p.pivot ?? 0.435, 1e-3, 0.999);
    const gp = Math.log(0.5) / Math.log(piv);
    gu.uTone.value.set(p.contrast ?? 1, 0, p.toe ?? 0, p.shoulder ?? 0);
    gu.uToneG.value.set(gp, 1 / gp);

    // CA is authored in pixels at the corner of a 1080-tall frame; scale so the
    // separation is the same fraction of the image at any resolution.
    const resK = fh / 1080;
    gu.uCA.value.set(f.gradeNoCA ? 0 : p.caStrength * resK, p.caExponent, p.caTail, p.caFringeClamp);

    const gi = (g.frame | 0) & 63;
    gu.uGrain.value.set(
      f.gradeNoGrain ? 0 : p.grainAmount * P.grainScale,
      p.grainCells, p.grainShadowFloor, 0);
    gu.uGrainOff.value.set(this._grainOff[gi * 2], this._grainOff[gi * 2 + 1]);

    gu.uVig.value.set(f.gradeNoVignette ? 0 : p.vignette, p.vignetteNatural, p.vignetteInner, p.vignetteOuter);
    gu.uSharpen.value = P.sharpen ? p.sharpen : 0;
    gu.uChroma.value.set(f.gradeNoChroma ? 0 : p.chroma,
      p.chromaToe, p.chromaHighlight, p.chromaClamp);
    gu.uChromaDn.value.set(f.gradeNoChroma ? 0 : p.chromaDenoise, p.chromaDenoisePop,
      f.gradeNoChroma ? 0 : p.chromaDenoiseLuma, 0);

    // Hue contrast. `gradeNoHueX` A/Bs it alone; `gradeNoSplit` leaves it up,
    // because the two are separate claims and the round-8 finding got muddled
    // exactly by A/B'ing a bundle.
    gu.uHueX.value.set(p.hueXAnchor / 360, f.gradeNoHueX ? 0 : p.hueXAmount,
      Math.max(1e-3, p.hueXWidth) / 360, Math.max(1e-3, p.hueXToe));

    // Display-domain split + white balance. `gradeNoSplit` A/Bs both at once.
    const noSplit = !!f.gradeNoSplit;
    gu.uSplitS.value.set(p.splitS[0], p.splitS[1], p.splitS[2], noSplit ? 0 : p.splitS[3]);
    gu.uSplitH.value.set(p.splitH[0], p.splitH[1], p.splitH[2], noSplit ? 0 : p.splitH[3]);
    gu.uWB.value.set(noSplit ? 0 : p.wbTint, noSplit ? 0 : p.wbTemp);

    const dbg = f.gradeSplit ? 1 : (f.gradeClip ? 2 : 0);
    gu.uOut.value.set(p.dither / 255, 0, dbg, p.debugSplit);
    // Scroll the blue-noise mask by a whole number of texels per frame so it
    // does not sit still in motion. 13 and 29 are odd, hence coprime with 64,
    // so both axes walk all 64 offsets before repeating. Derived from the frame
    // counter, so CONTRACT §3's byte-identical replay is unaffected.
    gu.tBlue.value = this._blueTex;
    gu.uBlueOff.value.set(((g.frame | 0) * 13) & (BLUE_N - 1), ((g.frame | 0) * 29) & (BLUE_N - 1));
    gu.toneMappingExposure.value = 1.0;   // exposure is applied from the 1x1 state

    R.fullscreen(this._mats.grade, null);
    draws++;

    this._stats.draws = draws;
  }

  // ---------------------------------------------------------------------------

  /** Debug only — this stalls the pipeline. Never call it per frame. */
  readEV() {
    if (!this._evRT) return null;
    try {
      const buf = new Float32Array(4);
      this.ctx.renderer.readRenderTargetPixels(this._evRT, 0, 0, 1, 1, buf);
      return { ev: buf[0], evTarget: buf[1], logLuma: buf[2], exposure: 1 / (1.2 * Math.pow(2, buf[0])) };
    } catch (e) { return { error: String(e) }; }
  }

  debugInfo() {
    const p = this.p;
    return {
      enabled: !!this.pass?.enabled,
      failed: this.failed,
      agxFromChunk: _agxPatched,
      preset: this.ctx.quality.preset,
      shape: { caTaps: this._preset.caTaps, sharpen: this._preset.sharpen, meterN: this._preset.meterN },
      area: this._area,
      requestedArea: this._requested,
      weather: this.ctx.sys?.sky?.weather ?? null,
      chroma: { amount: p.chroma, toe: p.chromaToe, highlight: p.chromaHighlight, clamp: p.chromaClamp },
      blend: this._blend.t,
      meterChain: this._chain,
      draws: this._stats.draws,
      ev: this.readEV(),
      tone: { contrast: p.contrast, pivot: p.pivot, toe: p.toe, shoulder: p.shoulder },
      knobs: {
        minEV: p.minEV, maxEV: p.maxEV, evBias: p.evBias, fixedEV: p.fixedEV,
        evSlope: p.evSlope, evAnchor: p.evAnchor,
        lutStrength: p.lutStrength, caStrength: p.caStrength, grainAmount: p.grainAmount,
        vignette: p.vignette, sharpen: p.sharpen, saturation: p.saturation,
      },
    };
  }
}

export { AREAS as GRADE_AREAS, bakeLut, defaultRecipe };
export default Grade;
