// =============================================================================
// CINDERBLOOM — VFX: atmospheric particulate, burn plumes, decals, impact FX.
// Owner: vfx agent (src/world/vfx.js). See docs/ART_DIRECTION.md §2.2, §3.4,
// §3.5, §5, §6.5 and docs/CONTRACT.md §4/§5.
// =============================================================================
//
// ## What is in here
//
//   1. AMBIENT FIELD  — one instanced draw, eight camera-relative particle
//      strata (soot motes / ash flake / far sheet / weather-driven storm /
//      lofted spark / quickfire fleck / ground ember drift / wind-borne grit).
//      Motion is ANALYTIC in the vertex shader and toroidally wrapped around
//      the camera, so the CPU cost is a handful of uniform writes per frame and
//      the field is infinite. Determinism comes free: everything is a function
//      of `ctx.time.elapsed` and a per-instance seed drawn from `ctx.rng`.
//   2. PLUMES         — one instanced draw, three authored burn columns. ART
//      §6.3 requires at least one visible at all times and §3.3 requires the
//      sky never be empty; this is that.
//   3. FX POOL        — one instanced draw, CPU-simulated transient particles
//      (sparks, dust, debris, smoke, embers) for combat. Surface-typed.
//   4. DECALS         — one draw, pooled terrain-conforming projected patches.
//   5. HEAT SHIMMER   — one optional fullscreen pass at order 55.
//
// Four draw calls of content plus one post pass, against ART §6.6's budget of
// twenty for VFX.
//
// ## gbuffer behaviour (renderer.js header, "transparent geometry")
//
// Every mesh here sits on `CB_LAYER.TRANSPARENT` and is drawn by the renderer's
// order-50 pass into the MRT. The materials are RawShaderMaterials that write
// ONLY `location 0`, which on WebGL2 would drop the draw outright — so they
// deliberately do NOT set `userData.cbWritesGBuffer`, which makes
// `Renderer._scanScene()` treat them as orphans and wrap each draw in
// `gl.drawBuffers([COLOR_ATTACHMENT0, NONE, NONE, NONE])`. That is the
// sanctioned path (the sky dome used it before it upgraded) and it is the
// CORRECT behaviour for particles: they leave `gNormalRough` / `gVel` / `gSpec`
// alone, so SSR, GTAO and the velocity tile grid never see a particle. We emit
// `sceneDirty` after building so the scan happens before the first draw.
//
// The consequence, stated plainly: particles carry no motion vector, so motion
// blur and TAA reproject them with whatever the geometry behind them is doing.
// The mitigation is the one every shipped engine uses — a minimum projected
// size (`minPx`) with energy conservation, so no particle is ever sub-pixel.
// Sub-pixel bright dots are what makes particulate crawl under TAA.
//
// ## Frame-graph slots claimed (CONTRACT §5 asks these be filed, not invented)
//
//   order 49  `vfxPrep`  — no drawing. Publishes this frame's `gViewZ` into the
//                          particle materials so soft-particle depth fade has a
//                          depth to read, and declares `inputs: ['viewZ']` so
//                          the renderer actually builds it. Runs in the 10..49
//                          block, i.e. immediately before the transparent draw.
//   order 55  `vfxHeat`   — refraction shimmer over heat sources. Self-disables
//                          on any error and is a true no-op at zero strength.
//
// Both are filed in docs/HANDOFF.md under `## requests`.
//
// ## Blending
//
// Everything is PREMULTIPLIED ALPHA (`src = ONE`, `dst = ONE_MINUS_SRC_ALPHA`).
// One blend mode covers both worlds: a dust flake writes `rgb = colour * a` with
// a moderate `a` and composites as normal "over"; a 1300 K spark writes a huge
// `rgb` with `a` near 0.03 and composites as effectively additive while still
// being correctly occluded. That is why there is one particle material and not
// three, and it is why the ember layers cost no extra draw call.
//
// ## Known-weak, read before extending
//
//  - Particles are not sorted against each other inside a mesh. Layer blocks are
//    ordered far-to-near in the instance buffer (sheet, plume, storm, flake,
//    grit, coal, spark, quick, mote) which gets the ordering right BETWEEN
//    strata; within a stratum it is arbitrary. At these alphas it is invisible.
//  - Particles are not shadowed. `shadows.js` publishes a one-tap entry point
//    (`cbCsmShadowWorld`) that `volumetrics.js` uses; wiring it here would make
//    storm particulate read the light shafts correctly. Filed.
// =============================================================================

import * as THREE from 'three';
import { GLSL_NOISE } from '../util/noise.js';
import { clamp, sat, lerp, smoothstep } from '../util/math.js';
import { SITES } from './terrain.js';
import { CB_LAYER } from '../engine/renderer.js';

// -----------------------------------------------------------------------------
// ART §2.1 albedo / §2.2 emissive, linear RGB. Never a hue, always a table row.
// -----------------------------------------------------------------------------
const A_ASH = [0.412, 0.386, 0.331];   // A4 bone ash — airborne flake
const A_MOTE = [0.340, 0.298, 0.248];   // near-field ash dust, between A4 and A7
const A_SOOT = [0.150, 0.126, 0.108];   // between A2 scorch and A3, warm soot
const A_GRIT = [0.300, 0.256, 0.204];   // A7-ish duff chips
const A_SPORE = [0.556, 0.512, 0.392];   // A9 vein cream — the seed wax
const A_RAIN = [0.300, 0.372, 0.402];   // the one cool state (ART §3.5 rain)
const A_SMOKE = [0.352, 0.330, 0.290];   // plume body

const E1 = [1.35, 0.20, 0.010];        //  900 K smoulder
const E2 = [4.20, 0.86, 0.062];        // 1050 K ember body
const E3 = [12.0, 3.10, 0.34];         // 1300 K ember core
const E4 = [34.0, 14.0, 2.2];          // 1900 K flare
const E5 = [0.09, 1.45, 1.22];         // quickfire fluorescence (rationed)

// ART §2.2 ends at E4 (1900 K), which is right for a flame tongue and too cool
// for the muzzle's own gas core. The critics ask for "a hot white core and a
// cooler ragged periphery", and §2.2's blackbody discipline says an artist may
// pick a TEMPERATURE, never a hue — so this is the Planckian locus at ~2900 K,
// peak-normalised the same way the table is, at a radiance a little above E4's
// because the core is denser as well as hotter. It is NOT desaturated E4: a
// white-mixed E4 would be off-locus and would read as sci-fi rather than fire.
const E4H = [55.0, 36.3, 18.2];        // ~2900 K muzzle gas core

const mul3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

// -----------------------------------------------------------------------------
// FLASH LIGHT RIG — units, and why they are anchored to the live sun
// -----------------------------------------------------------------------------
// A muzzle flash is COMBAT_FEEL §4.1's 22 000 cd. At 0.5 m that is ~88 klux,
// i.e. very close to one full-daylight irradiance — a flash at arm's length is
// genuinely about as bright as the sun, which is the whole reason it reads.
//
// The obvious implementation is a frozen candela-to-scene constant, and this
// repo has already been burned by exactly that. `weapons.js` derived
// `CD_TO_SCENE = 6.0e-5` against ART §3.1's sun irradiance of 4.2. `sky.js`
// subsequently multiplied the key by `SUN_GAIN = 5.08` to fix the missing
// shadow terminator, and nothing re-derived the constant. MEASURED at the
// `hipfire` vista on 2026-07-30: sun irradiance 14.67, muzzle point-light
// intensity at peak 0.0189, i.e. an irradiance of 0.076 at 0.5 m — **0.5% of
// sunlight where the spec asks for ~135%**. Filed in HANDOFF ## requests.
//
// So this file does not freeze a constant. It states the RATIO the spec asks
// for and reads the key every frame. If sky.js rescales again, this follows.
// `FLASH_E_FLOOR` is what keeps a night frame or the grotto (sun irradiance 0)
// from producing a flash that emits literally nothing.
const FLASH_REF_D = 0.5;      // metres — the distance the ratio is stated at
const FLASH_VS_SUN = 1.35;    // irradiance at FLASH_REF_D, as a fraction of key
const FLASH_E_FLOOR = 5.2;    // scene irradiance at FLASH_REF_D with the sun down
// Luma-normalised ~2400 K. Authored as a colour so the intensity knob stays a
// single scalar; multiplying this by an irradiance gives a warm flash whose
// LUMINANCE is the number asked for, not whose red channel is.
const FLASH_COL = [1.61, 0.88, 0.35];
const FLASH_RADIUS = 0.17;    // metres — the luminous VOLUME, used as a d^2 floor
const FLASH_TAU = 0.017;      // exponential decay constant, seconds
const FLASH_LIFE = 0.055;     // hard cut, seconds
const FLASH_SLOTS = 3;

// -----------------------------------------------------------------------------
// The eight ambient strata. Every field is a shader uniform; the weather and
// biome tables below only ever multiply or overwrite entries in here, so there
// is exactly one place a particle's identity is defined.
//
// box      wrap volume in metres, centred on the camera
// anchorY  vertical offset of that volume from the camera (or from the ground
//          under the camera when `groundLock` is 1)
// wind     multiplier on ctx.world.wind * windSpeed
// rise     m/s of vertical drift (negative falls)
// swirl    amplitude / frequency of the per-particle wander
// size     metres, min..max
// minPx    minimum projected diameter in pixels — the anti-crawl floor
// stretch  velocity-aligned elongation (0 = round billboard)
// emis     0 = lit by sun+sky, 1 = pure emissive on the Planckian locus
// spin     roll rad/s
// edge     sprite edge exponent, higher = softer core
// soft     soft-particle depth-fade distance in metres
// -----------------------------------------------------------------------------
// Boxes are sized from ART §6.5's stated volumetric densities, not by eye:
//   flake  0.02-0.2 /m^3   -> 46x26x46 m at 24% of the budget is 0.052 /m^3
//   mote   screen-space    -> a tight 9 m box so the layer lives where it can
//                             actually be RESOLVED (a mote at 20 m is a quarter
//                             of a pixel and contributes nothing but crawl)
//   spark  >=60 visible near an ember field -> 9% of budget in a 58 m box
// `inten` here is the WEATHER-level base; the biome table below multiplies it.
// A stratum that is meant to be biome-gated must therefore sit at 1.0 here and
// be zeroed by the biome, never the other way round — a base of 0 cannot be
// multiplied back up, which is exactly how the quickfire and coal layers
// shipped invisible in the first pass of this file.
// `brk` is the lobing + breakup amount consumed by GLSL_SPRITE_FRAG: 0 leaves a
// smooth radial gradient (correct for a point of incandescence), 1 gives a
// three-harmonic lobed silhouette and a tattered rim (correct for an ash flake).
// `fwd` is the forward-scatter gain applied to the transient flash lights — the
// far sheet is at 300 m and can never see a muzzle, so it pays nothing.
// `wrap` is the fragment shader's light-wrap strength: how much brighter the
// key-facing side of the sprite is than its far side. It is what makes a flake
// read as a solid object rather than as a decal, and it is zero on emissive
// strata by construction in the shader (a coal is its own light source).
// `core` is the second, tighter gaussian added to emissive sprites so a spark
// has a bright centre inside a warm halo instead of one flat blob.
//
// ROUND-8, MEASURED: `minPx` ON THE THREE EMISSIVE STRATA IS THE X-GLYPH KNOB.
// The X two critics filed against `grotto` is NOT drawn here and it is not
// dof.js's bokeh either (round 7 concluded that and it is wrong — the glyph
// survives with dof, taa, bloom, motion blur and volumetrics all off). It is
// grade.js's chroma-denoise kernel, whose taps are FOUR PURELY DIAGONAL fetches
// at +-1.5 texels plus four more at +-3.5 on high/ultra, and whose per-area
// luma term `dnLuma` is 0.50 on grotto and 0 on all eight other areas. A source
// that is compact enough to miss those taps gets eight 2x2 bilinear blocks
// stamped on its diagonals and nothing on its axes. Proof, measurement, and the
// request are in docs/HANDOFF.md; `tools/_vfxglyph8.mjs` prints the pixels.
//
// What this file owes the fix is to stop handing that kernel a delta function.
// The outer tap ring sits at 3.5 px, so an emissive sprite floored at ~7 px
// across COVERS its own tap ring: the ring then samples the ember instead of
// the dark rock beside it and there is nothing for the kernel to stamp. The
// energy-conserving `grow` in the vertex shader pays for the extra area out of
// alpha, so a coal is not brighter for being bigger — it is a soft coal instead
// of a hot pixel, which is also exactly what "real particle art, soft, shaped"
// asks for. 3.6 -> 6.0..7.0 measured below.
const STRATA = [
  { id: 'mote', share: 0.12, box: [7.5, 5.5, 7.5], anchorY: 0.3, wind: 0.10, rise: -0.012, swirl: 0.06, swirlF: 0.5, size: [0.005, 0.030], minPx: 2.4, stretch: 0.0, col: A_MOTE, alpha: 0.90, inten: 1.0, emis: 0, spin: 0.5, ground: 0, edge: 1.5, soft: 0.20, sun: 0.55, brk: 0.55, fwd: 0.95, wrap: 0.46, core: 0 },
  { id: 'flake', share: 0.19, box: [34, 20, 34], anchorY: 2.2, wind: 0.55, rise: -0.34, swirl: 0.34, swirlF: 0.31, size: [0.030, 0.110], minPx: 2.0, stretch: 0.0, col: A_ASH, alpha: 0.62, inten: 0.6, emis: 0, spin: 1.7, ground: 0, edge: 1.1, soft: 0.55, sun: 1.0, brk: 0.72, fwd: 0.85, wrap: 0.52, core: 0 },
  { id: 'sheet', share: 0.04, box: [760, 340, 760], anchorY: 86, wind: 0.95, rise: 0.0, swirl: 9.0, swirlF: 0.05, size: [22.0, 70.0], minPx: 4.0, stretch: 0.0, col: A_ASH, alpha: 0.042, inten: 1.0, emis: 0, spin: 0.03, ground: 0, edge: 0.6, soft: 26.0, sun: 1.0, brk: 0.85, fwd: 0.0, wrap: 0.30, core: 0 },
  { id: 'storm', share: 0.25, box: [40, 24, 40], anchorY: 1.8, wind: 2.4, rise: -0.12, swirl: 0.85, swirlF: 0.85, size: [0.018, 0.085], minPx: 2.0, stretch: 0.45, col: A_SPORE, alpha: 0.50, inten: 0.0, emis: 0, spin: 0.9, ground: 0, edge: 1.05, soft: 0.5, sun: 0.85, brk: 0.48, fwd: 0.75, wrap: 0.48, core: 0 },
  { id: 'spark', share: 0.09, box: [52, 22, 52], anchorY: 2.2, wind: 1.5, rise: 1.25, swirl: 0.55, swirlF: 1.5, size: [0.045, 0.105], minPx: 6.0, stretch: 1.5, col: mul3(E3, 0.20), alpha: 0.46, inten: 1.0, emis: 1, spin: 0.0, ground: 0, edge: 1.9, soft: 0.18, brk: 0.0, fwd: 0.0, wrap: 0, core: 0.85 },
  { id: 'quick', share: 0.06, box: [15, 1.7, 15], anchorY: 0.55, wind: 0.06, rise: 0.02, swirl: 0.10, swirlF: 0.5, size: [0.034, 0.078], minPx: 6.5, stretch: 0.0, col: mul3(E5, 0.22), alpha: 0.50, inten: 1.0, emis: 1, spin: 0.0, ground: 1, edge: 2.3, soft: 0.18, brk: 0.0, fwd: 0.0, wrap: 0, core: 0.60 },
  { id: 'coal', share: 0.12, box: [58, 2.4, 58], anchorY: 0.7, wind: 0.38, rise: 0.07, swirl: 0.22, swirlF: 0.7, size: [0.042, 0.100], minPx: 7.0, stretch: 0.0, col: mul3(E2, 0.12), alpha: 0.46, inten: 1.0, emis: 1, spin: 0.0, ground: 1, edge: 2.0, soft: 0.22, brk: 0.0, fwd: 0.0, wrap: 0, core: 0.72 },
  { id: 'grit', share: 0.13, box: [24, 15, 24], anchorY: 1.1, wind: 1.15, rise: -0.11, swirl: 0.50, swirlF: 0.76, size: [0.010, 0.034], minPx: 2.0, stretch: 0.22, col: A_GRIT, alpha: 0.55, inten: 0.9, emis: 0, spin: 1.5, ground: 0, edge: 1.25, soft: 0.32, sun: 0.8, brk: 0.66, fwd: 0.80, wrap: 0.44, core: 0 },
];
const T = {}; STRATA.forEach((s, i) => { T[s.id] = i; });
// Columns in the stratum parameter texture. Row 6 was added for `brk`/`fwd`.
const PARAM_COLS = 7;

// Far-to-near instance-buffer ordering, so the strata composite in roughly the
// right order without a per-frame sort (see header, "Known-weak").
const DRAW_ORDER = ['sheet', 'storm', 'flake', 'grit', 'coal', 'spark', 'quick', 'mote'];

// -----------------------------------------------------------------------------
// Weather. Keys are `sky.js`'s weather names; values patch STRATA entries.
// ART §3.5's table drives the character: spore is pale and luminous, storm is
// dark and fast, rain is the one cool state in the world.
// -----------------------------------------------------------------------------
const WEATHER = {
  clear: {
    flake: { inten: 0.55 }, grit: { inten: 0.85 }, sheet: { inten: 1.0 },
    storm: { inten: 0.0 }, mote: { inten: 1.0 },
  },
  haze: {
    flake: { inten: 0.9 }, grit: { inten: 1.25 }, sheet: { inten: 1.3 }, mote: { inten: 1.15 },
    storm: { inten: 0.30, col: A_ASH, alpha: 0.30, wind: 1.6, size: [0.02, 0.07] },
  },
  spore: {
    // ART §5.6 / §3.5: pale, luminous, near-whiteout. The spores are the wax
    // seed coat (A9) lofted by the thermals, so they are the BRIGHTEST thing in
    // the lower air and they scatter forward hard.
    flake: { inten: 0.75 }, grit: { inten: 1.2 }, sheet: { inten: 1.15 }, mote: { inten: 1.5 },
    spark: { inten: 0.55 },
    // Keep the wrap box TIGHT. An earlier revision widened it to 78 m for the
    // storm states, which cut the volumetric density 6x and turned a whiteout
    // into eight dots — the box is a density control, not a range control.
    storm: { inten: 1.0, col: A_SPORE, alpha: 0.46, wind: 1.7, rise: -0.06, size: [0.030, 0.130], swirl: 1.2, stretch: 0.35, box: [34, 21, 34] },
  },
  storm: {
    // The Draft. Dark brown, horizontal, oppressive; sparks streak sideways.
    flake: { inten: 1.0, wind: 1.5 }, grit: { inten: 1.6, wind: 2.2 }, sheet: { inten: 0.9 }, mote: { inten: 1.7 },
    spark: { inten: 1.0, wind: 4.2, rise: 0.35, stretch: 3.2, alpha: 0.42 },
    storm: { inten: 1.0, col: [0.205, 0.160, 0.122], alpha: 0.40, wind: 4.6, rise: -0.05, size: [0.022, 0.095], stretch: 1.3, swirl: 1.6, box: [38, 23, 38] },
  },
  rain: {
    flake: { inten: 0.18 }, grit: { inten: 0.35 }, sheet: { inten: 0.7 }, mote: { inten: 0.5 },
    spark: { inten: 0.12 }, coal: { inten: 0.25 },
    storm: { inten: 0.85, col: A_RAIN, alpha: 0.30, wind: 0.55, rise: -7.5, size: [0.006, 0.014], stretch: 5.5, swirl: 0.05, edge: 0.7 },
  },
};

// -----------------------------------------------------------------------------
// Biome weighting. Blended by distance from the authored sites in terrain.js, so
// walking into the Smoulderworks fades the coal bed up rather than switching it.
// Only the emissive strata and the near-field density change; the ash layers are
// global weather, not local.
// -----------------------------------------------------------------------------
const BIOME = {
  //          quick coal  spark mote  flake sheet
  neutral: { quick: 0.06, coal: 0.10, spark: 0.30, mote: 1.00, flake: 1.00, sheet: 1.00 },
  pocket: { quick: 0.14, coal: 0.85, spark: 0.55, mote: 1.05, flake: 1.00, sheet: 1.00 },
  duff: { quick: 0.60, coal: 0.40, spark: 0.40, mote: 1.20, flake: 0.85, sheet: 0.85 },
  // ART §5.5: the Smoulderworks is E2-uplit on black walls, with E5 *dripping*
  // from the roof cracks. Orange must out-number cyan or the cave reads as a
  // glow-worm cave, which §8 bans by name. The quickfire stratum is also
  // deliberately pinned to a 1.7 m ground-locked slab rather than filling the
  // air: ART §2.2 says E5 "must never appear as a volumetric glow, only as a
  // surface emission with a tight falloff", and a cave full of drifting cyan
  // specks is exactly the volumetric glow that rule forbids.
  grotto: { quick: 0.55, coal: 1.55, spark: 1.00, mote: 1.15, flake: 0.20, sheet: 0.00 },
  glass: { quick: 0.10, coal: 0.22, spark: 0.22, mote: 0.80, flake: 0.90, sheet: 1.00 },
};

// Authored burn columns (ART §6.3: at least one plume visible at all times).
// Positions chosen against main.js's VISTAS: `establish` looks toward +X+Z past
// The Prow, `ridge` looks back across the basin, `canopy` looks up-slope +X.
const PLUMES = [
  { x: 470, z: 430, h: 340, r0: 13, r1: 118, rate: 0.030, gain: 1.00 },
  { x: -420, z: 250, h: 285, r0: 11, r1: 96, rate: 0.026, gain: 0.85 },
  { x: 150, z: -560, h: 395, r0: 16, r1: 140, rate: 0.023, gain: 0.92 },
];

// Impact surfaces. `combat.js` passes one of these names; everything about how
// a hit looks lives here so the gameplay code never picks a colour.
const SURFACES = {
  ash: { dust: 11, dustCol: A_ASH, dustSize: [0.055, 0.175], spark: 0, debris: 4, debrisCol: A_SOOT, ember: 1, smoke: 2, decal: 'ash', decalSize: [0.20, 0.38], lift: 1.5 },
  rock: { dust: 7, dustCol: [0.36, 0.33, 0.29], dustSize: [0.045, 0.125], spark: 14, debris: 7, debrisCol: [0.24, 0.21, 0.19], ember: 0, smoke: 1, decal: 'chip', decalSize: [0.13, 0.24], lift: 1.1 },
  sinter: { dust: 6, dustCol: [0.50, 0.47, 0.42], dustSize: [0.040, 0.115], spark: 18, debris: 8, debrisCol: [0.44, 0.41, 0.37], ember: 0, smoke: 1, decal: 'chip', decalSize: [0.12, 0.22], lift: 1.1 },
  glass: { dust: 3, dustCol: [0.20, 0.22, 0.24], dustSize: [0.030, 0.085], spark: 24, debris: 10, debrisCol: [0.10, 0.12, 0.14], ember: 0, smoke: 0, decal: 'glass', decalSize: [0.16, 0.30], lift: 1.0 },
  flora: { dust: 5, dustCol: [0.32, 0.30, 0.24], dustSize: [0.035, 0.105], spark: 3, debris: 9, debrisCol: [0.16, 0.12, 0.08], ember: 6, smoke: 2, decal: 'scorch', decalSize: [0.10, 0.20], lift: 1.3 },
  coal: { dust: 5, dustCol: [0.10, 0.08, 0.07], dustSize: [0.045, 0.130], spark: 20, debris: 5, debrisCol: [0.05, 0.04, 0.04], ember: 14, smoke: 3, decal: 'scorch', decalSize: [0.16, 0.32], lift: 1.6 },
  metal: { dust: 2, dustCol: [0.22, 0.21, 0.20], dustSize: [0.025, 0.070], spark: 30, debris: 3, debrisCol: [0.20, 0.19, 0.18], ember: 0, smoke: 0, decal: 'chip', decalSize: [0.07, 0.13], lift: 0.9 },
  flesh: { dust: 4, dustCol: [0.22, 0.10, 0.09], dustSize: [0.035, 0.105], spark: 0, debris: 6, debrisCol: [0.16, 0.06, 0.06], ember: 0, smoke: 0, decal: 'splat', decalSize: [0.22, 0.44], lift: 1.2 },
};
const DECAL_KIND = { chip: 0, ash: 1, scorch: 2, glass: 3, splat: 4 };

// FX particle kinds, matching the CPU integrator in _stepFx.
// FLARE is the one emissive kind that keeps the colour it was emitted with:
// SPARK and EMBER are re-coloured every frame from the Planckian cooling ramp,
// which is right for a cooling particle and wrong for the muzzle's gas core.
const FX = { DUST: 0, SPARK: 1, DEBRIS: 2, SMOKE: 3, EMBER: 4, FLARE: 5 };

// =============================================================================
// GLSL
// =============================================================================

// Shared by every particle material: the phase function, the aerial-perspective
// tail, and the premultiplied sprite resolve. Kept in one string so the ambient
// field, the plumes and the transient pool cannot drift apart.
const GLSL_COMMON = /* glsl */`
// ---------------------------------------------------------------------------
// SCATTER NORMALISATION — the round-4 measurement, and the biggest single fix
// in this file.
//
// A particle's outgoing radiance is  albedo * E * p(theta) / 4pi,  where E is
// the irradiance arriving at it and p is the phase function normalised so that
// isotropic == 1 (which is exactly what hgPhase returns). The 1/4pi was never
// applied: PI4 was declared here and used nowhere. The shaders multiplied an
// albedo straight by an IRRADIANCE and called the result a radiance.
//
// What that costs, measured at the hipfire vista where sky.js reports a sun
// irradiance of 14.67:
//
//   dust puff, albedo 0.20, forward lobe clamped at 3.5
//     0.20 * (14.67 * (0.16 + 0.85*3.5) + 1.35)          = 9.46
//   near mote, albedo 0.34, sun gain 0.55
//     0.39 * (14.67 * (0.16 + 0.95*2.6) * 0.55 + 1.45)   = 8.83
//
// ART 2.2 anchors sunlit bone ash at 1.0. So every dust puff and every near
// mote in this game has been rendering at NINE TIMES WHITE — three and a bit
// stops over — which is why four rounds of critics have described particulate
// as "raw bloom sprites", "blown out", "a smudge", and why the muzzle FX read
// as one flat white ball. No amount of alpha or size tuning survives that; it
// is a units error, exactly like the muzzle-light one weapons.js found.
//
// uScatterGain is the ONE authored liberty on top of the physics: real thin
// particulate would be dimmer still, and a little over-scatter is what sells
// "there is stuff in the air". It is a knob (ctx.debug.vfx.scatterGain) so the
// next agent can A/B it instead of guessing.
// ---------------------------------------------------------------------------
const float PI4 = 12.566370614;
uniform float uScatterGain;

// Henyey-Greenstein, normalised so 1.0 means "isotropic". ART §3.5 sets g high
// (0.72 for the medium); particulate is a little tamer because a flake is not a
// point scatterer, but the asymmetry is the whole reason motes read as bright
// specks when you look toward Kiln and vanish when you look away.
float hgPhase(float mu, float g){
  float gg = g * g;
  float d = 1.0 + gg - 2.0 * g * mu;
  return (1.0 - gg) / max(1e-4, d * sqrt(max(1e-4, d)));
}

// Per-channel extinction over the particle's own distance (ART §3.5). This is
// what makes the far strata sit INSIDE the haze instead of floating in front of
// it, and it is the same sigma table sky.js and volumetrics.js march.
vec3 aerial(vec3 col, float dist, vec3 sigmaT, vec3 inscatter){
  vec3 t = exp(-sigmaT * dist);
  return col * t + inscatter * (1.0 - t);
}

// ---------------------------------------------------------------------------
// TRANSIENT FLASH LIGHTS (see the FLASH LIGHT RIG block in the JS below).
// Three slots. Slot 0 is the muzzle; 1-2 are impact / detonation flashes.
//
//   uFlashP[i]  xyz world position, w the flash's own radius SQUARED, used as
//               the minimum d^2 so a particle sitting inside the luminous
//               volume gets a finite irradiance instead of 1/eps. Skipping
//               this is precisely the 100x spike that washed the front of the
//               weapon flat when a point light was put 0.10 m from a handguard.
//   uFlashC[i]  rgb radiant intensity in SCENE units times m^2, so
//               irradiance = uFlashC / d^2 with no further conversion.
//   uFlashOn    0 when nothing is live. A coherent uniform branch, so a frame
//               with no shot fired pays nothing at all for this.
//
// Constant indices only. A loop here makes ANGLE emit its dyn_index_vec4 helper
// and an X4000 warning, and tests/lib/harness.mjs promotes shader warnings to
// harness errors — see the same note on uSrc in the heat shader.
// ---------------------------------------------------------------------------
uniform vec4 uFlashP[3];
uniform vec4 uFlashC[3];
uniform float uFlashOn;

// Returns the SCATTERED RADIANCE per unit albedo: multiply by the particle's
// own albedo and you have its outgoing radiance in scene units. The 1/4pi is
// the scattering normalisation — see SCATTER NORMALISATION below; getting it
// right here is what keeps a muzzle puff at ~1.1 instead of ~14.
vec3 flashOne(vec4 P, vec3 C, vec3 wp, vec3 V, float g, float fwd){
  vec3 dv = P.xyz - wp;
  float dd = dot(dv, dv);
  vec3 L = dv * inversesqrt(max(dd, 1e-8));
  // Same phase function the sun gets: -L is the direction the light PROPAGATES,
  // V is particle-to-camera, so mu = 1 means the flash is behind the puff and
  // shining through it at you. Smoke rimmed by its own muzzle flash is the
  // single most legible "this is a real engine" cue in a gunfight frame.
  float ph = min(hgPhase(dot(-L, V), g), 3.5);
  return C * ((0.20 + fwd * ph) / (max(dd, P.w) * PI4));
}

vec3 flashScatter(vec3 wp, vec3 V, float g, float fwd){
  if (uFlashOn < 0.5) return vec3(0.0);
  return flashOne(uFlashP[0], uFlashC[0].rgb, wp, V, g, fwd)
       + flashOne(uFlashP[1], uFlashC[1].rgb, wp, V, g, fwd)
       + flashOne(uFlashP[2], uFlashC[2].rgb, wp, V, g, fwd);
}
`;

const GLSL_SPRITE_FRAG = /* glsl */`
precision highp float;

in vec2 vUv;
in vec3 vCol;
in float vAlpha;
in float vViewZ;
in float vEdge;
in float vSoft;
in vec4 vShape;   // x lobing/breakup 0..1, y per-particle seed, z core boost, w erosion
in vec3 vLit;     // xy light direction in the SPRITE's own frame, z wrap strength

uniform sampler2D uDepth;
uniform vec2 uTexel;

layout(location = 0) out vec4 outColor;

// Cheap 2D value noise in the SPRITE's own rotating uv. Deliberately not in
// screen space and not in world space: a sprite-local field rotates and scales
// with the billboard, so it is rock stable under camera motion and adds no TAA
// crawl. A screen-space version of exactly this is what makes cheap smoke
// shimmer, and it is worth the two extra lines to avoid.
float sHash(vec2 p){
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x * 41.7);
}
float sNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = sHash(i), b = sHash(i + vec2(1.0, 0.0));
  float c = sHash(i + vec2(0.0, 1.0)), d = sHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 >= 1.0) discard;

  // ---- LOBED SILHOUETTE ---------------------------------------------------
  // ROUND-7 FINDING. pow(1 - r^2, edge) is a circle, and a circle is what two
  // blind critics called "WHITE-DISC SMOKE ... a placeholder". Rim-weighted
  // noise (the previous fix) tatters the EDGE but leaves the OUTLINE round, and
  // the outline is what the eye reads first — especially in the near field,
  // where dof.js convolves everything under ~18 px with its bokeh kernel and
  // intra-sprite noise is destroyed while the silhouette survives.
  //
  // ROUND-8 NOTE: this pass shipped and the disc came back anyway, and the
  // reason was not the shape at all — the puff was rendering at 1.93 against a
  // white point of 1.0, so every term in this shader was modulating a value
  // already past the tonemap's shoulder. The arithmetic is in GLSL_FX_VERT
  // under uPuffScatter. Shape terms are worth nothing until the exposure is
  // right; check the exposure FIRST next time.
  //
  // So the shape is authored at a scale the lens cannot erase: three angular
  // harmonics (2, 3 and 5 lobes) with a per-particle phase, which is a cheap
  // analytic stand-in for the cauliflower boundary of a real puff. Deliberately
  // ANALYTIC rather than a fourth noise octave — it is one atan and three sines
  // against four hashes, it is exactly controllable, and it cannot alias.
  //
  // The +0.80 bias is load-bearing: the perturbation may only ever push the
  // silhouette INWARD. A lobe that grew past the quad would be sliced off by
  // the r2 >= 1 discard and read as a hard circular crop, which is worse than
  // the disc it replaces.
  float lobe = 0.0;
  float r2w = r2;
  if (vShape.x > 0.002) {
    float th = atan(p.y, p.x);
    float s = vShape.y * 6.2831853;
    lobe = sin(th * 3.0 + s) * 0.34
         + sin(th * 5.0 - s * 1.73) * 0.19
         + sin(th * 2.0 + s * 2.31) * 0.27;
    r2w = r2 * (1.0 + (lobe + 0.80) * vShape.x * 0.44);
  }

  float dens = pow(max(0.0, 1.0 - r2w), vEdge);
  // A point of incandescence is a bright CORE inside a soft halo, not a single
  // gaussian. THREE scales, not two (round 8):
  //   core  a very tight gaussian — the incandescent grain itself
  //   body  the authored edge exponent
  //   halo  a wide, faint shoulder that reaches the rim of the quad
  // The halo is the round-8 addition and it is not decoration. With minPx
  // raised to 6-7 px on the emissive strata, a two-scale profile is a small hot
  // disc sitting inside a large empty quad — which is still a compact source as
  // far as grade.js's diagonal chroma taps at 3.5 px are concerned. The halo
  // puts real signal out at the rim, so the tap ring samples the ember rather
  // than the rock beside it, AND it is what makes a coal read as glowing
  // instead of as a lit dot. Amplitude is tied to the core boost so it exists
  // only on emissive sprites; ash flakes keep their hard silhouette.
  float halo = vShape.z * 0.62 * pow(max(0.0, 1.0 - r2), 0.80);
  dens = (dens + vShape.z * pow(max(0.0, 1.0 - r2), vEdge * 4.0 + 7.0) + halo)
       / (1.0 + vShape.z * 0.85);

  float shade = 1.0;
  if (vShape.x > 0.002) {
    // ---- internal density ---------------------------------------------------
    // Two octaves of sprite-local value noise, weighted toward the rim so the
    // CORE stays dense and only the edge tatters. Sprite-local (not screen, not
    // world) so it rotates with the billboard and adds no TAA crawl. Energy is
    // compensated (the *1.55) so a broken-up puff is not simply a dimmer puff.
    vec2 q = p * 2.1 + vShape.y * 53.0;
    float n = sNoise(q) * 0.62 + sNoise(q * 2.7 + 19.3) * 0.38;
    float rim = smoothstep(0.02, 0.92, r2);          // 0 at the core, 1 at the rim
    dens *= mix(1.0, clamp(n * 1.55, 0.0, 1.6), vShape.x * (0.30 + 0.70 * rim));

    // ---- erosion ------------------------------------------------------------
    // Smoke does not fade uniformly, it DISSIPATES: the thin parts go first and
    // the puff tears into wisps. Subtracting a rising floor from the density and
    // renormalising is that, for one mad. vShape.w ramps with age on the CPU.
    dens = max(0.0, dens - vShape.w) * (1.0 / max(1.0 - vShape.w, 1e-3));

    // ---- light wrap ---------------------------------------------------------
    // The single largest "volume, not decal" cue available for one dot product:
    // the side of the puff facing the key is bright and the far side is dark,
    // in the SPRITE's own frame, so it stays correct as the billboard rolls.
    // Modulated by the density noise so the gradient follows the lumps instead
    // of being a clean linear ramp across a disc. Multiplies RADIANCE only —
    // alpha is untouched, so the silhouette does not change with the sun.
    shade = 1.0 + vLit.z * dot(p, vLit.xy) * (0.55 + 0.75 * n);
  }

  float a = vAlpha * dens;

  // Soft particles. gViewZ is positive linear view depth in metres, with 1e6
  // written for sky, so a particle against the sky is never faded.
  float sceneZ = texture(uDepth, gl_FragCoord.xy * uTexel).r;
  a *= clamp((sceneZ - vViewZ) / max(vSoft, 1e-3), 0.0, 1.0);

  if (a <= 0.0018) discard;
  outColor = vec4(vCol * (a * max(shade, 0.0)), a);
}
`;

const GLSL_FIELD_VERT = /* glsl */`
precision highp float;

in vec3 position;
in vec2 uv;
in vec4 aSeed;     // four uniform randoms, drawn once from ctx.rng
in vec2 aMeta;     // x = stratum index, y = an INDEPENDENT random for culling

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;

uniform float uTime;
uniform float uBreath;
uniform vec3  uWind;
uniform float uWindSpeed;
uniform float uProjScaleY;   // pixels per metre at one metre
uniform float uScreenH;      // render height in pixels (screen-coverage guard)
uniform float uGroundY;
uniform float uDensity;      // global density knob (quality + debug)

// The stratum table lives in a 6x8 RGBA32F texture rather than in six
// "uniform vec4 x[8]" arrays. Reason, learned the expensive way: indexing a
// uniform vec4 array with a non-constant int makes ANGLE emit
// "X4000: use of potentially uninitialized variable (dyn_index_vec4_float4_int)",
// and tests/lib/harness.mjs promotes any shader warning to a harness error, so
// every agent's smoke run goes red. texelFetch has no such problem, costs the
// same, and scales past the 8 strata this started with.
//   row 0 box   xyz wrap volume, w vertical anchor offset
//   row 1 mot   x windMul, y rise, z swirlAmp, w swirlFreq
//   row 2 size  x sizeMin, y sizeMax, z minPixels, w stretch
//   row 3 col   rgb albedo or radiance, a alpha
//   row 4 misc  x intensity, y emissiveMix, z spin, w groundLock
//   row 5 shape x edgePow, y softDist, z sizeGain, w sunGain
//   row 6 extra x spriteBreakup, y flash forward-scatter gain,
//               z key light-wrap strength, w emissive core boost
uniform sampler2D uParams;

uniform vec3 uSunDir;    // points TOWARD Kiln
uniform vec3 uSunCol;    // colour * irradiance
uniform vec3 uSkyRad;    // hemisphere-averaged sky radiance
uniform vec3 uSigmaT;    // per metre
uniform vec3 uInscatter;
uniform float uDustGain;
uniform float uEmberGain;
uniform float uPeak;      // point-source guard, see GLSL_COMMON
uniform float uClump;     // 0 = uniform scatter, 1 = full ember clumping

out vec2 vUv;
out vec3 vCol;
out float vAlpha;
out float vViewZ;
out float vEdge;
out float vSoft;
out vec4 vShape;
out vec3 vLit;

${GLSL_COMMON}

// One octave of world-space value noise, evaluated per INSTANCE (four vertices),
// used to clump the emissive strata. See the CLUMPING block below.
float cHash(vec3 q){
  q = fract(q * 0.1031);
  q += dot(q, q.zyx + 31.32);
  return fract((q.x + q.y) * q.z);
}
float cNoise(vec3 q){
  vec3 i = floor(q), f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(cHash(i + vec3(0,0,0)), cHash(i + vec3(1,0,0)), f.x),
                mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y);
  float b = mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x),
                mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z);
}

void main(){
  int ti = int(aMeta.x + 0.5);
  // Fetch the intensity row FIRST and bail before touching the other five: the
  // field is allocated at the ultra budget so setQuality('ultra') is honest,
  // which means a low-preset frame culls most of these instances and should pay
  // one texel for the privilege, not six.
  vec4 X = texelFetch(uParams, ivec2(4, ti), 0);

  float inten = X.x * uDensity;
  // Per-instance stochastic culling: a stratum at 40% intensity draws 40% of its
  // instances at full brightness rather than all of them at 40% alpha. Fading a
  // whole layer to translucency reads as fog; dropping instances reads as fewer
  // particles, which is what "less ash in the air" actually looks like.
  // It MUST key off aMeta.y and not aSeed.y: aSeed is the particle's position in
  // the wrap box, so culling on it would survive only the particles in the
  // bottom slice of the volume.
  if (inten <= 0.0025 || aMeta.y > inten) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vUv = vec2(0.0); vCol = vec3(0.0); vAlpha = 0.0; vViewZ = 1.0; vEdge = 1.0; vSoft = 1.0;
    vShape = vec4(0.0); vLit = vec3(0.0, 1.0, 0.0);
    return;
  }

  vec4 B = texelFetch(uParams, ivec2(0, ti), 0);
  vec4 M = texelFetch(uParams, ivec2(1, ti), 0);
  vec4 S = texelFetch(uParams, ivec2(2, ti), 0);
  vec4 C = texelFetch(uParams, ivec2(3, ti), 0);
  vec4 H = texelFetch(uParams, ivec2(5, ti), 0);
  vec4 K = texelFetch(uParams, ivec2(6, ti), 0);

  vec3 box = B.xyz;
  vec3 anchor = cameraPosition + vec3(0.0, B.w, 0.0);
  anchor.y = mix(anchor.y, uGroundY + B.w, X.w);

  float sp = 0.55 + aSeed.w * 0.95;
  float ph = aSeed.w * 6.2831853 + aSeed.x * 17.31;

  vec3 base = (aSeed.xyz - 0.5) * box;
  vec3 vel = uWind * (M.x * uWindSpeed) + vec3(0.0, M.y, 0.0);
  vec3 drift = vel * (uTime * sp);
  float sf = M.w;
  vec3 swirl = M.z * vec3(
    sin(uTime * sf + ph),
    sin(uTime * sf * 0.73 + ph * 1.71),
    cos(uTime * sf * 0.61 + ph * 2.33));

  vec3 wp = base + drift + swirl;
  wp = mod(wp - anchor + box * 0.5, box) - box * 0.5 + anchor;

  vec3 toCam = cameraPosition - wp;
  float dist = max(length(toCam), 0.02);
  vec3 V = toCam / dist;

  // ---- shading ------------------------------------------------------------
  // Moved AHEAD of the projection this round: the point-source guard below has
  // to know how bright this particle is before it can decide how big it is.
  //
  // A flake is a Mie scatterer, so nearly all of its brightness is the forward
  // lobe. That asymmetry is not decoration: it is the reason particulate reads
  // as a blaze of specks toward Kiln and as dark grit away from it, and it is
  // most of what separates "there is stuff in the air" from "there is a texture
  // overlay on my screen".
  // Clamped: the un-clamped lobe peaks near 9x isotropic, which sends a mote
  // looking straight at Kiln to pure clipped white and reads as a sprite rather
  // than as ash. 2.6 keeps the blaze and stays inside the tonemap's shoulder.
  // H.w is a per-stratum sun gain — the near-field motes get less of it, or the
  // whole near third of the frame becomes a field of identical white discs.
  float mu = dot(-uSunDir, V);
  float phase = min(hgPhase(mu, 0.58), 2.6);
  // Per-particle albedo spread. Real fall is a mix of pale bone ash and black
  // char in the same air; one albedo for the whole stratum is what makes
  // particulate read as a texture overlay instead of as material.
  float aj = 0.45 + 1.15 * aSeed.x;
  // sun term: irradiance -> radiance (see SCATTER NORMALISATION).
  // sky term: uSkyRad is already a RADIANCE, so it is not divided again.
  vec3 lit = C.rgb * aj * (uSunCol * ((0.16 + 0.95 * phase) * H.w * uScatterGain / PI4) + uSkyRad * 1.45) * uDustGain;
  // A muzzle flash is a 22 kcd source at arm's length. Near-field ash lit by it
  // for 30 ms is what makes a gunfight frame read as lit rather than composited.
  lit += C.rgb * aj * flashScatter(wp, V, 0.58, K.y) * uDustGain;

  float fl = 0.62 + 0.38 * sin(uTime * (2.1 + aSeed.y * 3.4) + ph);
  vec3 emi = C.rgb * (0.70 + 0.60 * uBreath) * fl * uEmberGain;

  vec3 col = mix(lit, emi, X.y);
  vCol = aerial(col, dist, uSigmaT, uInscatter);

  // ---- CLUMPING -----------------------------------------------------------
  // ART §5.5 asks for a coal bed with E5 dripping from the roof cracks. A
  // uniform random scatter through a wrap box cannot express that, and it is
  // the reason grotto reads as confetti: every ember is the same distance from
  // its neighbours, which is a statistic no real emitter has. One octave of
  // WORLD-space value noise gates the emissive strata, so the drift clumps over
  // the seams and leaves dark air between them. World space (not box space) so
  // the clumps hold still as the player walks and the toroidal wrap slides the
  // particles through them. Faded, never culled — a hard threshold would pop.
  // Applied only where uClump asks for it; the ash strata stay uniform, because
  // fall really is uniform.
  float clump = 1.0;
  if (uClump > 0.001 && X.y > 0.5) {
    float cn = cNoise(wp * 0.145);
    clump = mix(1.0, smoothstep(0.34, 0.68, cn) * 1.75, uClump);
  }

  float size = mix(S.x, S.y, aSeed.z) * H.z;

  // Minimum projected size, with energy conserved. A particle smaller than a
  // pixel is the single biggest source of TAA crawl on particulate, so we grow
  // it to "minPx" and pay for the extra coverage out of its alpha.
  float px = size * uProjScaleY / dist;
  float grow = max(1.0, S.z / max(px, 1e-4));
  size *= grow;
  float energy = 1.0 / (grow * grow);

  // fade in from the near plane and out at the wrap boundary, so nothing pops
  float half_ = 0.5 * max(box.x, box.z);
  float edgeFade = 1.0 - smoothstep(0.74, 0.99, dist / max(half_, 1e-3));
  float nearFade = smoothstep(0.10, 0.42, dist);

  // SCREEN-COVERAGE GUARD — see the same block in the FX vertex shader. A near
  // mote grown past a fifth of the frame stops being particulate.
  float cov = (size * uProjScaleY / dist) / max(uScreenH, 1.0);
  float covFade = 1.0 - smoothstep(0.16, 0.46, cov);

  float alpha = C.a * energy * edgeFade * nearFade * covFade * clump;

  // ---- POINT-SOURCE GUARD -------------------------------------------------
  // ROUND 7 BLAMED dof.js FOR THE GROTTO X-GLYPH. THAT WAS WRONG — see the
  // round-8 entry in docs/HANDOFF.md. The glyph survives with dof, taa, bloom,
  // motion blur, volumetrics, the RCAS sharpen, the chroma denoise, chromatic
  // aberration and grain ALL disabled (tools/_vfxglyph6.mjs, which pins
  // ctx.time.elapsed — round 7's sweep did not, so every one of its variants
  // was looking at a different set of particles). It is grade.js's chroma
  // denoise, whose taps are four purely DIAGONAL fetches at +-1.5 texels and
  // four more at +-3.5: eight 2x2 bilinear blocks on the diagonals of any
  // compact bright source and nothing on its axes. tools/_vfxglyph8.mjs prints
  // the pixels; the request is filed for grade.js.
  //
  // This guard still earns its place, for the reason it was written: cap the
  // peak premultiplied radiance of any sprite and pay the excess in AREA rather
  // than in intensity, energy conserved (size *= sqrt(k), alpha /= k), so no
  // particle is ever a delta function for ANY kernel downstream to print. It is
  // not, however, what fixed the glyph — the minPx floor on the emissive
  // strata is (see the STRATA table), because in SCENE units a grotto coal
  // peaks around 0.23 and never trips this cap at all; the 250/255 it reaches
  // on screen is the area's ~60x auto-exposure, which this guard cannot see.
  float pk = max(max(vCol.r, vCol.g), vCol.b) * alpha;
  float over = max(1.0, pk / max(uPeak, 1e-3));
  size *= sqrt(over);
  alpha /= over;

  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  float ang = ph + uTime * X.z * sp;
  float ca = cos(ang), sa = sin(ang);
  // ---- PER-PARTICLE ASPECT (round 8) --------------------------------------
  // A circle is the one silhouette a lens cannot destroy and the eye reads
  // instantly. Every shaped sprite in this file was a circle with its rim
  // nibbled by noise, which is why "WHITE-DISC" survived a rim-breakup pass and
  // a three-harmonic lobing pass: both act at a scale dof.js's near kernel
  // erases, while the OUTLINE survives. An anisotropic quad does not act at any
  // scale — it changes the outline itself, it is exact, it costs two multiplies
  // in the vertex shader, and no amount of blur can turn an ellipse back into a
  // circle. Applied in the sprite's OWN frame (before the roll) so the major
  // axis lands at a random angle per particle rather than on a screen axis, and
  // area-preserving (sqrt / 1-over-sqrt) so a squashed puff is not a dimmer one.
  // Emissive strata are excluded by construction: a spark IS round.
  float aniso = mix(1.0 + 0.62 * (aSeed.y - 0.5), 1.0, X.y);
  float axr = sqrt(aniso), ayr = 1.0 / axr;
  vec2 pl = vec2(position.x * axr, position.y * ayr);
  vec2 qr = vec2(pl.x * ca - pl.y * sa, pl.x * sa + pl.y * ca);

  // velocity-aligned stretch (storm streaks, sparks, rain)
  vec3 sd = normalize(vel + uWind * 1e-3 + vec3(0.0, 1e-4, 0.0));
  vec2 d2 = normalize(vec2(dot(sd, camRight), dot(sd, camUp)) + vec2(1e-5, 1e-5));
  vec2 n2 = vec2(-d2.y, d2.x);
  vec2 qs = d2 * (position.y * (1.0 + S.w)) + n2 * (position.x / (1.0 + S.w * 0.45));
  float stretched = step(0.001, S.w);
  vec2 q = mix(qr, qs, stretched);

  vec3 wpos = wp + (camRight * q.x + camUp * q.y) * size;
  vec4 vpos = viewMatrix * vec4(wpos, 1.0);
  vViewZ = -vpos.z;
  gl_Position = projectionMatrix * vpos;
  vUv = uv;

  // ---- key direction in the SPRITE's own frame ----------------------------
  // The fragment shader's light wrap needs the sun expressed in the billboard's
  // local axes, which differ between the rolled and the velocity-stretched
  // build above. Computing it here costs four dot products and is what turns a
  // flat disc into something with a lit side. Emissive strata get no wrap: a
  // coal is its own light source.
  vec2 sun2 = vec2(dot(uSunDir, camRight), dot(uSunDir, camUp));
  sun2 = sun2 / max(length(sun2), 1e-4);
  vec2 lr = vec2(sun2.x * ca + sun2.y * sa, -sun2.x * sa + sun2.y * ca);
  vec2 lsq = vec2(dot(sun2, n2), dot(sun2, d2));
  vLit = vec3(mix(lr, lsq, stretched), K.z * (1.0 - X.y));

  vAlpha = alpha;
  vEdge = H.x;
  vSoft = H.y;
  vShape = vec4(K.x, aSeed.y, K.w, 0.0);
}
`;

const GLSL_PLUME_VERT = /* glsl */`
precision highp float;

in vec3 position;
in vec2 uv;
in vec4 aSeed;
in vec2 aMeta;      // x = plume index

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;

uniform float uTime;
uniform float uBreath;
uniform vec3  uWind;
uniform float uWindSpeed;
uniform float uProjScaleY;

// 2x4 RGBA32F, same reasoning as the field's uParams:
//   col 0  xyz base position, w gain (0 = off)
//   col 1  x height, y baseRadius, z topRadius, w riseRate
uniform sampler2D uPlumeTex;

uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyRad;
uniform vec3 uSigmaT;
uniform vec3 uInscatter;
uniform vec3 uSmoke;       // diffused ash albedo, high in the column
uniform vec3 uSoot;        // A1 clinker — fresh soot at the burn front
uniform vec3 uHot;         // 1050 K base radiance
uniform float uAlpha;

out vec2 vUv;
out vec3 vCol;
out float vAlpha;
out float vViewZ;
out float vEdge;
out float vSoft;
out vec4 vShape;
out vec3 vLit;

${GLSL_COMMON}

void main(){
  int pi = int(aMeta.x + 0.5);
  vec4 P = texelFetch(uPlumeTex, ivec2(0, pi), 0);
  vec4 Q = texelFetch(uPlumeTex, ivec2(1, pi), 0);

  if (P.w <= 0.001) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vUv = vec2(0.0); vCol = vec3(0.0); vAlpha = 0.0; vViewZ = 1.0; vEdge = 1.0; vSoft = 1.0;
    vShape = vec4(0.0); vLit = vec3(0.0, 1.0, 0.0);
    return;
  }

  // Age is the puff's fraction of the column. Everything else is a function of
  // it: radius, lean, opacity, and where the 1050 K base gives way to smoke.
  float age = fract(aSeed.x + uTime * Q.w);
  float th = aSeed.y * 6.2831853 + age * 3.1;
  float rr = sqrt(aSeed.z) * mix(Q.y, Q.z, pow(age, 0.8)) * 0.62;

  vec3 wp = P.xyz;
  wp.y += age * Q.x;
  wp.x += cos(th) * rr;
  wp.z += sin(th) * rr;
  // lean downwind, quadratic in age (the column bends more the higher it gets)
  wp += uWind * (age * age * Q.x * 0.85 * (0.6 + 0.5 * uWindSpeed));
  // slow wander so the column is not a cone of revolution
  wp.x += sin(uTime * 0.07 + aSeed.w * 6.28 + age * 4.0) * Q.z * 0.16;
  wp.z += cos(uTime * 0.061 + aSeed.w * 5.11 + age * 3.4) * Q.z * 0.16;

  float size = mix(Q.y * 1.35, Q.z * 1.05, pow(age, 0.72));

  vec3 toCam = cameraPosition - wp;
  float dist = max(length(toCam), 0.5);
  vec3 V = toCam / dist;

  float px = size * uProjScaleY / dist;
  float grow = max(1.0, 3.0 / max(px, 1e-4));
  size *= grow;
  float energy = 1.0 / (grow * grow);

  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float ang = aSeed.w * 6.2831853 + age * 1.7;
  float ca = cos(ang), sa = sin(ang);
  vec2 q = vec2(position.x * ca - position.y * sa, position.x * sa + position.y * ca);

  vec3 wpos = wp + (camRight * q.x + camUp * q.y) * size;
  vec4 vpos = viewMatrix * vec4(wpos, 1.0);
  vViewZ = -vpos.z;
  gl_Position = projectionMatrix * vpos;
  vUv = uv;

  float mu = dot(-uSunDir, V);
  float phase = hgPhase(mu, 0.48);
  // Self-shadowing stand-in: the sun-facing side of a puff is lit, the far side
  // sits in the column's own shadow. Cheap, and it is what stops a plume
  // reading as a flat grey smear.
  float side = 0.5 + 0.5 * dot(normalize(vec3(cos(th), 0.35, sin(th))), uSunDir);
  // NB the SCATTER NORMALISATION above is deliberately NOT applied here. The
  // plumes are 300-600 m out, so aerial() has already crushed them most of the
  // way to the inscatter colour, and their look was validated in the establish
  // and ridge shots — the two that two of four critics named as the strongest
  // in the set. Normalising them is a real follow-up (over-bright by the
  // same factor before extinction) but it must be re-tuned against those two
  // captures, not this file's. Filed in HANDOFF.
  // A burn column is nearly BLACK where it leaves the fire (A1 clinker soot,
  // optically thick) and pales as it dilutes into ash. Authoring it as one grey
  // made it land within a few percent of the sky radiance behind it, which is
  // to say invisible. The value ramp is the whole read.
  vec3 albedo = mix(uSoot, uSmoke, smoothstep(0.04, 0.62, age));
  vec3 smoke = albedo * (uSunCol * (0.16 + 0.58 * phase) * (0.30 + 0.90 * side) + uSkyRad * 1.15);
  vec3 hot = uHot * (0.70 + 0.60 * uBreath);
  vec3 col = mix(hot, smoke, smoothstep(0.0, 0.075, age));

  vCol = aerial(col, dist, uSigmaT, uInscatter);

  // opacity follows density: thick and tight at the throat, thin and wide aloft
  float dens = mix(1.9, 0.55, smoothstep(0.0, 0.6, age));
  float fade = smoothstep(0.0, 0.035, age) * (1.0 - smoothstep(0.55, 1.0, age));
  vAlpha = uAlpha * P.w * fade * dens * energy;
  vEdge = 0.85;
  vSoft = 12.0;
  // A 340 m burn column made of smooth radial gradients is a stack of grey
  // discs. The puffs tatter hard as they dilute, so lobing and breakup ramp
  // with age, and the erosion term (w) tears the top of the column apart
  // instead of dissolving it evenly.
  vShape = vec4(0.30 + 0.55 * age, aSeed.w, 0.0, 0.30 * smoothstep(0.45, 1.0, age));
  // The per-puff side term above already carries the column's self-shadow at
  // the COLUMN scale; this adds it at the PUFF scale, which is what gives the
  // silhouette of a plume its cauliflower read at 400 m.
  vec2 sun2 = vec2(dot(uSunDir, camRight), dot(uSunDir, camUp));
  sun2 = sun2 / max(length(sun2), 1e-4);
  vLit = vec3(sun2.x * ca + sun2.y * sa, -sun2.x * sa + sun2.y * ca, 0.42);
}
`;

const GLSL_FX_VERT = /* glsl */`
precision highp float;

in vec3 position;
in vec2 uv;
in vec4 aFxA;   // xyz world position, w size
in vec4 aFxB;   // rgb radiance, a alpha
in vec4 aFxC;   // xyz world velocity direction, w stretch
in vec4 aFxD;   // x roll, y edgePow, z softDist, w emissiveMix
in vec4 aFxE;   // x breakup/lobing, y seed, z core boost, w erosion

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform float uProjScaleY;
uniform float uScreenH;
uniform vec3 uSigmaT;
uniform vec3 uInscatter;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyRad;
uniform float uDustGain;
uniform float uPeak;         // point-source guard, see the field vertex shader
uniform float uPuffScatter;  // transient-pool scatter gain, see main() below

out vec2 vUv;
out vec3 vCol;
out float vAlpha;
out float vViewZ;
out float vEdge;
out float vSoft;
out vec4 vShape;
out vec3 vLit;

${GLSL_COMMON}

void main(){
  if (aFxB.a <= 0.0015 || aFxA.w <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vUv = vec2(0.0); vCol = vec3(0.0); vAlpha = 0.0; vViewZ = 1.0; vEdge = 1.0; vSoft = 1.0;
    vShape = vec4(0.0); vLit = vec3(0.0, 1.0, 0.0);
    return;
  }

  vec3 wp = aFxA.xyz;
  float size = aFxA.w;

  vec3 toCam = cameraPosition - wp;
  float dist = max(length(toCam), 0.05);

  // aFxB.rgb is an ALBEDO for dust/debris/smoke and a RADIANCE for sparks and
  // embers; aFxD.w picks. Shipping the first pass without this made every dust
  // puff render its 0.41 albedo as radiance, i.e. a white cartoon cloud.
  // Hoisted above the projection: the point-source guard needs the radiance.
  vec3 V = toCam / dist;
  float phase = min(hgPhase(dot(-uSunDir, V), 0.58), 3.5);
  // ---- WHY THE MUZZLE PUFF WAS WHITE, MEASURED --------------------------------
  // At the hipfire vista sky.js reports a sun irradiance of 14.67. With the
  // ambient field's authored over-scatter (uScatterGain 2.4) a muzzle puff of
  // albedo 0.20 sitting in the forward lobe renders
  //     0.20 * (14.67 * (0.16 + 0.85*3.5) * 2.4 / 4pi + 0.62 * 1.35) = 1.93
  // against ART 2.2's white point of 1.0. Nearly a stop over white, uniformly,
  // across a 130-220 px sprite. Everything this file authors INSIDE the sprite —
  // the lobing, the density noise, the erosion, the light wrap — is a modulation
  // of radiance, and a modulation of a value that is already past the tonemap's
  // shoulder is invisible. That is the whole mechanism behind "WHITE-DISC
  // SMOKE": not a missing texture, an exposure error. A puff has to land where
  // the tone curve still has slope or it is a white disc no matter what is
  // painted on it.
  //
  // The transient pool therefore gets its OWN scatter gain, separate from the
  // ambient field's. The field's 2.4 is a deliberate over-scatter that sells
  // "there is stuff in the air" at 20-300 m through heavy extinction; a puff at
  // 0.8 m has no extinction in front of it at all and needs none of it.
  // Knob: ctx.debug.vfx.puffScatter.
  vec3 lit = aFxB.rgb * (uSunCol * ((0.16 + 0.85 * phase) * uPuffScatter / PI4) + uSkyRad * 1.35) * uDustGain;
  // The muzzle flash lighting its own smoke. Forward gain 1.0 — a hit puff and
  // a muzzle puff are both directly between the flash and the camera, which is
  // the geometry the HG lobe is loudest in and the reason this reads at all.
  lit += aFxB.rgb * flashScatter(wp, V, 0.58, 1.0) * uDustGain;
  vec3 col = mix(lit, aFxB.rgb, aFxD.w);

  vCol = aerial(col, dist, uSigmaT, uInscatter);

  float px = size * uProjScaleY / dist;
  float grow = max(1.0, 2.0 / max(px, 1e-4));
  size *= grow;
  float energy = 1.0 / (grow * grow);

  // POINT-SOURCE GUARD — see the long note in the field vertex shader. Pay a
  // sprite's excess peak radiance in area, energy conserved, so a hot particle
  // is never a delta function for dof.js's bokeh kernel to print. uPeak is set
  // higher for this pool than for the ambient field: the muzzle flash's core is
  // SUPPOSED to clip, it is 1900 K gas at half a metre.
  float pkAlpha = aFxB.a * energy;
  float pk = max(max(vCol.r, vCol.g), vCol.b) * pkAlpha;
  float over = max(1.0, pk / max(uPeak, 1e-3));
  size *= sqrt(over);
  energy /= over;

  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  float ca = cos(aFxD.x), sa = sin(aFxD.x);
  // PER-PARTICLE ASPECT — see the long note in the field vertex shader. This is
  // the copy that matters most: the muzzle plume is authored 0.6-1.1 m from the
  // eye and projects 130-220 px, and it was those puffs, not the flash, that
  // read as "WHITE-DISC SMOKE".
  float fxAniso = mix(1.0 + 0.66 * (aFxE.y - 0.5), 1.0, aFxD.w);
  float fxAxr = sqrt(fxAniso);
  vec2 fxPl = vec2(position.x * fxAxr, position.y / fxAxr);
  vec2 qr = vec2(fxPl.x * ca - fxPl.y * sa, fxPl.x * sa + fxPl.y * ca);

  // Streaks orient along the particle's own world velocity, projected into the
  // camera basis — not along a stored 2D angle, which would swing wrongly as
  // the camera turns and is the classic "sparks all point the same way" tell.
  vec3 sd = aFxC.xyz + vec3(1e-5, 1e-5, 1e-5);
  vec2 d2 = normalize(vec2(dot(sd, camRight), dot(sd, camUp)) + vec2(1e-6, 1e-6));
  vec2 n2 = vec2(-d2.y, d2.x);
  // foreshorten: a spark flying at the camera must not stretch across the frame
  float fore = clamp(length(vec2(dot(sd, camRight), dot(sd, camUp))) / max(1e-4, length(sd)), 0.15, 1.0);
  float st = aFxC.w * fore;
  vec2 qs = d2 * (position.y * (1.0 + st)) + n2 * (position.x / (1.0 + st * 0.45));
  float stretched = step(0.001, aFxC.w);
  vec2 q = mix(qr, qs, stretched);

  vec3 wpos = wp + (camRight * q.x + camUp * q.y) * size;
  vec4 vpos = viewMatrix * vec4(wpos, 1.0);
  vViewZ = -vpos.z;
  gl_Position = projectionMatrix * vpos;
  vUv = uv;

  // Key direction in the sprite's own frame, for the fragment shader's light
  // wrap. Impact dust and muzzle smoke are the two places in a combat frame
  // where a puff is close enough for the eye to demand a lit side.
  vec2 sun2 = vec2(dot(uSunDir, camRight), dot(uSunDir, camUp));
  sun2 = sun2 / max(length(sun2), 1e-4);
  vec2 lr = vec2(sun2.x * ca + sun2.y * sa, -sun2.x * sa + sun2.y * ca);
  vec2 lsq = vec2(dot(sun2, n2), dot(sun2, d2));
  vLit = vec3(mix(lr, lsq, stretched), 0.50 * (1.0 - aFxD.w));

  // ---- SCREEN-COVERAGE GUARD ----------------------------------------------
  // MEASURED BUG, round 4. muzzle() spawned smoke at size 0.04-0.11 m with
  // grow 5.5, i.e. up to 0.71 m across, roughly 0.45 m from the camera. That
  // projects to ~850 px: ONE sprite covering the left third of hipfire as a
  // single smooth radial gradient. Both critics read it as the muzzle flash
  // ("a raw bloom sprite blowing out a quarter of the near frame"), and hiding
  // weapons.js's flash quad left it completely unchanged — it was never the
  // flash. The emission is retuned below, but a retune only fixes the one case;
  // this fades ANY sprite that grows past a fifth of the frame, which is what
  // every shipped engine does and what stops the next tuning pass from
  // reintroducing a lens smudge.
  float covPx = size * uProjScaleY / dist;
  float covFade = 1.0 - smoothstep(0.16, 0.46, covPx / max(uScreenH, 1.0));

  vAlpha = aFxB.a * energy * smoothstep(0.06, 0.22, dist) * covFade;
  vEdge = aFxD.y;
  vSoft = aFxD.z;
  vShape = aFxE;
}
`;

const GLSL_DECAL_VERT = /* glsl */`
precision highp float;

in vec3 position;
in vec3 normal;
in vec2 uv;
in vec4 aDec;    // x alpha, y kind, z seed, w size

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;

uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyRad;
uniform vec3 uSigmaT;
uniform vec3 uInscatter;

// Same three transient flash slots the particle shaders read. Declared here
// rather than pulled from GLSL_COMMON because a decal wants Lambert, not a
// phase function — see the JS FLASH LIGHT RIG block.
uniform vec4 uFlashP[3];
uniform vec4 uFlashC[3];
uniform float uFlashOn;

out vec2 vUv;
out float vAlpha;
out float vKind;
out float vSeed;
out vec3 vLight;
out vec3 vHaze;
out float vT;

vec3 flashLambert(vec4 P, vec3 C, vec3 wp, vec3 n){
  vec3 dv = P.xyz - wp;
  float dd = dot(dv, dv);
  vec3 L = dv * inversesqrt(max(dd, 1e-8));
  return C * (max(0.0, dot(n, L)) / max(dd, P.w));
}

void main(){
  vec4 vpos = viewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * vpos;
  vUv = uv;
  vAlpha = aDec.x;
  vKind = aDec.y;
  vSeed = aDec.z;

  float ndl = max(0.0, dot(normal, uSunDir));
  vLight = uSunCol * ndl + uSkyRad * 1.1;
  // The ground under the muzzle flaring on every shot. 5x5 verts across a
  // 0.2-0.4 m patch against a source a half-metre away is fine per-vertex.
  if (uFlashOn >= 0.5) {
    vLight += flashLambert(uFlashP[0], uFlashC[0].rgb, position, normal)
            + flashLambert(uFlashP[1], uFlashC[1].rgb, position, normal)
            + flashLambert(uFlashP[2], uFlashC[2].rgb, position, normal);
  }

  float dist = length(cameraPosition - position);
  vec3 t = exp(-uSigmaT * dist);
  vT = t.g;
  vHaze = uInscatter * (1.0 - t);
}
`;

const GLSL_DECAL_FRAG = /* glsl */`
precision highp float;

in vec2 vUv;
in float vAlpha;
in float vKind;
in float vSeed;
in vec3 vLight;
in vec3 vHaze;
in float vT;

layout(location = 0) out vec4 outColor;

${GLSL_NOISE}

void main(){
  if (vAlpha <= 0.002) discard;

  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r >= 1.0) discard;

  float ang = atan(p.y, p.x);
  float sd = vSeed * 91.7;

  // Irregular rim — nothing in this world is a clean circle (ART §4.4). Two
  // smooth harmonics, NOT a hash: a per-angle hash makes a radial starburst
  // with a hard spike every texel, which is what the first pass of this shader
  // shipped and it read as a cartoon splat.
  float wob = 0.88 + 0.13 * sin(ang * 3.0 + sd * 6.28) + 0.07 * sin(ang * 5.0 - sd * 11.1);
  float rr = clamp(r / wob, 0.0, 1.4);
  // a low-frequency mottle so the interior is not a smooth gradient
  float mott = 0.72 + 0.28 * hash12(floor(vUv * 7.0 + sd) + sd);

  int k = int(vKind + 0.5);

  vec3 albedo = vec3(0.02);
  float cover = 0.0;

  if (k == 0) {
    // chip: dark bruise with a SMALL pale conchoidal fracture at the centre
    float core = 1.0 - smoothstep(0.04, 0.20, rr);
    float bruise = (1.0 - smoothstep(0.10, 0.90, rr)) * mott;
    albedo = mix(vec3(0.026, 0.022, 0.020), vec3(0.30, 0.28, 0.25), core);
    cover = max(core * 0.9, bruise * 0.66);
  } else if (k == 1) {
    // ash crater: dark pit under a soft pale ejecta apron
    float pit = 1.0 - smoothstep(0.02, 0.30, rr);
    float apron = (smoothstep(0.20, 0.44, rr) * (1.0 - smoothstep(0.44, 1.05, rr))) * mott;
    albedo = mix(vec3(0.032, 0.028, 0.025), vec3(0.34, 0.315, 0.275), smoothstep(0.15, 0.9, apron));
    cover = max(pit * 0.80, apron * 0.26);
  } else if (k == 2) {
    // scorch: soft char, faint warm inner edge where the heat ran out
    float c = (1.0 - smoothstep(0.02, 0.92, rr)) * mott;
    float warm = smoothstep(0.42, 0.66, rr) * (1.0 - smoothstep(0.66, 0.94, rr));
    albedo = mix(vec3(0.019, 0.016, 0.015), vec3(0.070, 0.034, 0.019), warm);
    cover = c * 0.88;
  } else if (k == 3) {
    // fulgur glass: dark pit and a few smooth radial fractures
    float spokes = 0.5 + 0.5 * sin(ang * 6.0 + sd * 3.1);
    float star = smoothstep(0.80, 1.0, spokes) * (1.0 - smoothstep(0.06, 0.88, rr));
    float pit = 1.0 - smoothstep(0.01, 0.16, rr);
    albedo = mix(vec3(0.018, 0.021, 0.025), vec3(0.26, 0.28, 0.31), max(star * 0.7, pit * 0.5));
    cover = max(pit * 0.9, star * 0.55);
  } else {
    float c = (1.0 - smoothstep(0.08, 0.90, rr)) * mott;
    albedo = vec3(0.052, 0.016, 0.014);
    cover = c * 0.85;
  }

  // hard fade at the patch edge so a decal never shows its own quad
  cover *= 1.0 - smoothstep(0.86, 1.0, r);

  float a = vAlpha * cover;
  if (a <= 0.004) discard;

  vec3 col = albedo * vLight * vT + vHaze;
  outColor = vec4(col * a, a);
}
`;

// -----------------------------------------------------------------------------
// Heat shimmer (order 55). Screen-space refraction masked to heat sources.
// Deliberately cheap: 2D value noise, not simplex, and a coherent early-out so
// a frame with no heat in it pays for one texture fetch per pixel.
// -----------------------------------------------------------------------------
const GLSL_HEAT_FRAG = /* glsl */`
precision highp float;

in vec2 vUv;
uniform sampler2D tSrc;
uniform sampler2D tDepth;
uniform vec3 uCam;
uniform vec3 uCamFwd;
uniform mat4 uInvViewProj;
uniform vec4 uSrc[4];     // xyz world position, w radius (0 = unused)
uniform vec4 uSrcStr;     // per-source strength
uniform float uTime;
uniform float uAmp;       // pixels
uniform vec2 uTexel;

layout(location = 0) out vec4 outColor;

float vhash(vec2 p){
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x * 41.7);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = vhash(i), b = vhash(i + vec2(1.0, 0.0));
  float c = vhash(i + vec2(0.0, 1.0)), d = vhash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// a heat column: wide in plan, tall, decaying upward
float heatMask(vec3 wp, vec4 src){
  if (src.w <= 0.0) return 0.0;
  vec3 d = wp - src.xyz;
  float rad = length(d.xz) / src.w;
  float up = clamp(d.y / (src.w * 1.6), -0.35, 1.0);
  return (1.0 - smoothstep(0.25, 1.0, rad)) * (1.0 - smoothstep(0.0, 1.0, max(0.0, up)));
}

void main(){
  float z = texture(tDepth, vUv).r;

  // world position of this pixel
  vec4 ndc = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec4 w = uInvViewProj * ndc;
  vec3 dir = normalize(w.xyz / w.w - uCam);
  float zz = min(z, 400.0);
  vec3 wp = uCam + dir * (zz / max(0.05, dot(dir, uCamFwd)));

  // Unrolled by hand with constant indices: a loop over uSrc[i] makes ANGLE
  // emit its dyn_index_vec4 helper and an X4000 warning, which the harness
  // turns into a red gate for every agent in the repo.
  float mask = 0.0;
  mask += heatMask(wp, uSrc[0]) * uSrcStr.x;
  mask += heatMask(wp, uSrc[1]) * uSrcStr.y;
  mask += heatMask(wp, uSrc[2]) * uSrcStr.z;
  mask += heatMask(wp, uSrc[3]) * uSrcStr.w;
  mask = clamp(mask, 0.0, 1.0);

  if (mask <= 0.003) { outColor = texture(tSrc, vUv); return; }

  vec2 sp = vUv / uTexel;
  float n1 = vnoise(sp * 0.028 + vec2(0.0, uTime * 2.6));
  float n2 = vnoise(sp * 0.061 + vec2(uTime * 1.1, uTime * 3.7));
  vec2 off = (vec2(n1, n2) - 0.5) * 2.0 * uAmp * mask * uTexel;

  outColor = texture(tSrc, vUv + off);
}
`;

const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// =============================================================================
export class VFX {
  static id = 'vfx';
  static deps = ['renderer', 'sky', 'terrain'];

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng.fork('vfx');
    this.enabled = true;
    this._heatOff = false;

    this.knobs = ctx.debug.vfx = {
      density: 1.0,        // global instance-density multiplier
      dustGain: 1.0,       // lit particulate exposure
      emberGain: 1.0,      // emissive particulate exposure
      moteGain: 1.0,       // near-field mote density on top of `density`
      plumeAlpha: 0.16,    // per-puff opacity of the burn columns
      plumes: 1.0,         // master on/off for plumes
      fxGain: 1.0,         // impact-FX brightness
      decalFade: 1.0,      // decal lifetime multiplier
      heat: 1.0,           // heat-shimmer strength multiplier
      heatAmp: 5.5,        // peak refraction in pixels
      sizeGain: 1.0,       // global particle size multiplier
      breakup: 1.0,        // sprite internal-structure amount (0 = old smooth discs)
      scatterGain: 2.4,    // authored over-scatter on top of the 1/4pi physics
      // The transient pool's own scatter gain. The field's 2.4 buys visibility
      // through 20-300 m of extinction; an impact or muzzle puff at half a metre
      // has none in front of it, and at 2.4 it renders at 1.93 against a white
      // point of 1.0 (arithmetic in GLSL_FX_VERT). 1.0 puts it at ~0.80, on the
      // part of the curve that still has slope, which is what lets the sprite's
      // own shading be seen at all.
      puffScatter: 1.0,

      lightWrap: 1.0,      // per-sprite key/shade gradient (0 = flat discs)
      peak: 2.4,           // ambient-field point-source radiance cap (see guard)
      fxPeak: 3.0,         // same, for the impact/muzzle pool
      clump: 0.85,         // emissive-strata world-space clumping (0 = uniform)
      emberCore: 1.0,      // tight-core boost on emissive sprites (A/B knob)

      flashGain: 1.0,      // transient flash-light intensity multiplier
      flashLights: 1.0,    // master on/off for the flash rig (A/B)
      muzzleSmoke: 1.0,    // muzzle plume density
      muzzleFlash: 1.0,    // muzzle gas-core scale (0 = no flash sprite at all)
    };

    // FLASH LIGHT RIG state. Slot 0 is reserved for the muzzle so a burst never
    // ring-evicts its own light with an impact flash.
    this._fl = [];
    for (let i = 0; i < FLASH_SLOTS; i++) this._fl.push({ t0: -1e9, x: 0, y: 0, z: 0, e: 0, rad: FLASH_RADIUS, col: FLASH_COL });
    this._flNext = 1;
    this._flashOn = 0;
    this._qBreak = 1;

    // scratch
    this._v3 = new THREE.Vector3();
    this._biome = { quick: 0.06, coal: 0.10, spark: 0.30, mote: 1.0, flake: 1.0, sheet: 1.0 };
    this._biomeTarget = { ...this._biome };
    this._weather = null;
    this._heatSrc = [];
  }

  // ---------------------------------------------------------------------------
  async init() {
    const { ctx } = this;
    const q = ctx.quality;

    this.budget = Math.max(512, q.particleBudget | 0);
    // The instance buffer is sized for the ULTRA budget regardless of the boot
    // preset, because ultra is what the critic sees and `setQuality('ultra')`
    // must actually produce ultra's density. Lower presets scale `uDensity`,
    // which drives the vertex shader's stochastic cull — that drops instances
    // PROPORTIONALLY across every stratum. Truncating `instanceCount` instead
    // would have cut from the end of the buffer, and the buffer is ordered
    // far-to-near, so 'low' would have deleted the near-field motes first and
    // kept only the far haze sheets. Exactly backwards.
    this.builtBudget = Math.max(this.budget, 20000);
    this.fxBudget = clamp(Math.round(this.budget * 0.22), 192, 3000);
    this.decalBudget = q.preset === 'low' ? 48 : q.preset === 'medium' ? 80 : 128;

    this._sharedU = {
      uDepth: { value: this._nullDepth() },
      uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
      uTime: { value: 0 },
      uBreath: { value: 0.5 },
      uWind: { value: new THREE.Vector3(0.62, 0.05, -0.78).normalize() },
      uWindSpeed: { value: 1 },
      uProjScaleY: { value: 540 },
      uScreenH: { value: 1080 },
      uGroundY: { value: 0 },
      // FLASH LIGHT RIG. Shared by reference across every sprite material
      // (`_spriteMaterial` shallow-copies `_sharedU`, so the uniform OBJECTS are
      // the same ones) and passed explicitly to the decal material below.
      uFlashP: { value: [0, 1, 2].map(() => new THREE.Vector4(0, 0, 0, FLASH_RADIUS * FLASH_RADIUS)) },
      uFlashC: { value: [0, 1, 2].map(() => new THREE.Vector4(0, 0, 0, 0)) },
      uFlashOn: { value: 0 },
      uScatterGain: { value: 2.4 },
      uSunDir: { value: new THREE.Vector3(0.3, 0.5, 0.6).normalize() },
      uSunCol: { value: new THREE.Vector3(1, 0.65, 0.37) },
      uSkyRad: { value: new THREE.Vector3(0.62, 0.95, 0.90) },
      uSigmaT: { value: new THREE.Vector3(0.000193, 0.000208, 0.000242) },
      uInscatter: { value: new THREE.Vector3(0.5, 0.6, 0.55) },
    };

    ctx.boot.task('vfx:field', () => this._buildField(), 2);
    ctx.boot.task('vfx:plumes', () => this._buildPlumes(), 1);
    ctx.boot.task('vfx:fx', () => this._buildFxPool(), 1);
    ctx.boot.task('vfx:decals', () => this._buildDecals(), 1);
    ctx.boot.task('vfx:passes', () => { this._registerPasses(); this._syncStrata(); ctx.bus.emit('sceneDirty'); }, 1);

    // combat.js drives these without needing a reference to this system
    ctx.bus.on('impact', p => this.impact(p));
    ctx.bus.on('decal', p => this.decal(p));
    ctx.bus.on('muzzle', p => this.muzzle(p));
  }

  _nullDepth() {
    if (!this._nullTex) {
      const t = new THREE.DataTexture(new Float32Array([1e6, 0, 0, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType);
      t.needsUpdate = true;
      this._nullTex = t;
    }
    return this._nullTex;
  }

  _quadGeo() {
    // unit quad, corners in [-0.5, 0.5]
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    return g;
  }

  _spriteMaterial(vert, extraU) {
    const m = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: vert,
      fragmentShader: GLSL_SPRITE_FRAG,
      uniforms: Object.assign({}, this._sharedU, extraU),
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      blendEquation: THREE.AddEquation,
      side: THREE.DoubleSide,
    });
    // NOTE: deliberately NOT `userData.cbWritesGBuffer`. See the file header —
    // the renderer's scan wraps this draw in a draw-buffer mask, which is what
    // keeps a particle out of the velocity and normal attachments.
    return m;
  }

  // ---------------------------------------------------------------------------
  // 1. ambient field
  // ---------------------------------------------------------------------------
  _buildField() {
    const rng = this.rng.fork('field');
    const n = this.builtBudget;

    // allocate per stratum by share, in far-to-near buffer order
    const counts = {};
    let assigned = 0;
    for (const id of DRAW_ORDER) {
      const s = STRATA[T[id]];
      counts[id] = Math.max(8, Math.round(n * s.share));
      assigned += counts[id];
    }
    const total = assigned;

    const seed = new Float32Array(total * 4);
    const meta = new Float32Array(total * 2);
    let k = 0;
    for (const id of DRAW_ORDER) {
      const ti = T[id];
      for (let i = 0; i < counts[id]; i++, k++) {
        seed[k * 4 + 0] = rng.next();
        seed[k * 4 + 1] = rng.next();
        seed[k * 4 + 2] = rng.next();
        seed[k * 4 + 3] = rng.next();
        meta[k * 2 + 0] = ti;
        meta[k * 2 + 1] = rng.next();
      }
    }

    const g = this._quadGeo();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    g.setAttribute('aMeta', new THREE.InstancedBufferAttribute(meta, 2));
    g.instanceCount = total;

    this._paramData = new Float32Array(PARAM_COLS * 8 * 4);
    this._paramTex = new THREE.DataTexture(this._paramData, PARAM_COLS, 8, THREE.RGBAFormat, THREE.FloatType);
    this._paramTex.minFilter = this._paramTex.magFilter = THREE.NearestFilter;
    this._paramTex.wrapS = this._paramTex.wrapT = THREE.ClampToEdgeWrapping;
    this._paramTex.generateMipmaps = false;
    this._paramTex.needsUpdate = true;

    const u = {
      uParams: { value: this._paramTex },
      uDensity: { value: 1 },
      uDustGain: { value: 1 },
      uEmberGain: { value: 1 },
      // POINT-SOURCE GUARD. 2.4 is a little over twice the ART §2.2 white point,
      // so an ember still reads as the brightest thing in a night frame while
      // never being a two-pixel delta. Knob: ctx.debug.vfx.peak.
      uPeak: { value: 2.4 },
      uClump: { value: 0.85 },
    };
    this._fieldU = u;
    this.fieldMat = this._spriteMaterial(GLSL_FIELD_VERT, u);
    this.fieldMesh = new THREE.Mesh(g, this.fieldMat);
    this.fieldMesh.name = 'vfx.field';
    this.fieldMesh.frustumCulled = false;
    this.fieldMesh.renderOrder = 10;
    this.fieldMesh.layers.set(CB_LAYER.TRANSPARENT);
    this.ctx.scene.add(this.fieldMesh);
    this.fieldCount = total;
  }

  // ---------------------------------------------------------------------------
  // 2. burn plumes
  // ---------------------------------------------------------------------------
  _buildPlumes() {
    const rng = this.rng.fork('plume');
    const per = this.ctx.quality.preset === 'low' ? 46 : this.ctx.quality.preset === 'medium' ? 78 : 128;
    const total = per * PLUMES.length;

    const seed = new Float32Array(total * 4);
    const meta = new Float32Array(total * 2);
    let k = 0;
    for (let p = 0; p < PLUMES.length; p++) {
      for (let i = 0; i < per; i++, k++) {
        // stratified ages: an even column, not a clumped one
        seed[k * 4 + 0] = (i + rng.next()) / per;
        seed[k * 4 + 1] = rng.next();
        seed[k * 4 + 2] = rng.next();
        seed[k * 4 + 3] = rng.next();
        meta[k * 2 + 0] = p;
        meta[k * 2 + 1] = rng.next();
      }
    }

    const g = this._quadGeo();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    g.setAttribute('aMeta', new THREE.InstancedBufferAttribute(meta, 2));
    g.instanceCount = total;

    const terr = this.ctx.sys.terrain;
    this._plumeData = new Float32Array(2 * 4 * 4);
    this._plumeTex = new THREE.DataTexture(this._plumeData, 2, 4, THREE.RGBAFormat, THREE.FloatType);
    this._plumeTex.minFilter = this._plumeTex.magFilter = THREE.NearestFilter;
    this._plumeTex.wrapS = this._plumeTex.wrapT = THREE.ClampToEdgeWrapping;
    this._plumeTex.generateMipmaps = false;

    const u = {
      uPlumeTex: { value: this._plumeTex },
      uSmoke: { value: new THREE.Vector3(...A_SMOKE) },
      uSoot: { value: new THREE.Vector3(0.030, 0.026, 0.024) },   // A1 clinker
      uHot: { value: new THREE.Vector3(E2[0] * 0.30, E2[1] * 0.30, E2[2] * 0.30) },
      uAlpha: { value: 0.16 },
    };
    const pd = this._plumeData;
    for (let i = 0; i < 4; i++) {
      const P = PLUMES[i];
      const o = i * 8;                       // 2 texels of 4 floats per row
      if (!P) { pd[o] = 0; pd[o + 3] = 0; pd[o + 4] = 1; pd[o + 5] = 1; pd[o + 6] = 1; pd[o + 7] = 0.01; continue; }
      const y = terr?.heightAt ? terr.heightAt(P.x, P.z) : 0;
      pd[o] = P.x; pd[o + 1] = y - 4; pd[o + 2] = P.z; pd[o + 3] = P.gain;
      pd[o + 4] = P.h; pd[o + 5] = P.r0; pd[o + 6] = P.r1; pd[o + 7] = P.rate;
    }
    this._plumeTex.needsUpdate = true;
    this._plumeU = u;

    // Published for sky.js: ART §6.5 wants a plume's shadow cast across the sky
    // as an inverted crepuscular band, and that has to be a dome term.
    this.plumeSites = PLUMES.map((P, i) => ({
      x: P.x, y: pd[i * 8 + 1], z: P.z, h: P.h, r0: P.r0, r1: P.r1, gain: P.gain,
    }));

    this.plumeMat = this._spriteMaterial(GLSL_PLUME_VERT, u);
    this.plumeMesh = new THREE.Mesh(g, this.plumeMat);
    this.plumeMesh.name = 'vfx.plumes';
    this.plumeMesh.frustumCulled = false;
    this.plumeMesh.renderOrder = 0;
    this.plumeMesh.layers.set(CB_LAYER.TRANSPARENT);
    this.ctx.scene.add(this.plumeMesh);
  }

  // ---------------------------------------------------------------------------
  // 3. transient FX pool
  // ---------------------------------------------------------------------------
  _buildFxPool() {
    const n = this.fxBudget;
    this.fx = {
      n,
      live: 0,
      px: new Float32Array(n), py: new Float32Array(n), pz: new Float32Array(n),
      vx: new Float32Array(n), vy: new Float32Array(n), vz: new Float32Array(n),
      life: new Float32Array(n), max: new Float32Array(n),
      size0: new Float32Array(n), grow: new Float32Array(n),
      kind: new Uint8Array(n), drag: new Float32Array(n), buoy: new Float32Array(n),
      r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n),
      a0: new Float32Array(n), roll: new Float32Array(n), spin: new Float32Array(n),
      temp: new Float32Array(n), seed: new Float32Array(n),
    };

    this._fxA = new Float32Array(n * 4);
    this._fxB = new Float32Array(n * 4);
    this._fxC = new Float32Array(n * 4);
    this._fxD = new Float32Array(n * 4);
    this._fxE = new Float32Array(n * 4);

    const g = this._quadGeo();
    this._fxAttrA = new THREE.InstancedBufferAttribute(this._fxA, 4);
    this._fxAttrB = new THREE.InstancedBufferAttribute(this._fxB, 4);
    this._fxAttrC = new THREE.InstancedBufferAttribute(this._fxC, 4);
    this._fxAttrD = new THREE.InstancedBufferAttribute(this._fxD, 4);
    this._fxAttrE = new THREE.InstancedBufferAttribute(this._fxE, 4);
    this._fxAttrA.setUsage(THREE.DynamicDrawUsage);
    this._fxAttrB.setUsage(THREE.DynamicDrawUsage);
    this._fxAttrC.setUsage(THREE.DynamicDrawUsage);
    this._fxAttrD.setUsage(THREE.DynamicDrawUsage);
    this._fxAttrE.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aFxA', this._fxAttrA);
    g.setAttribute('aFxB', this._fxAttrB);
    g.setAttribute('aFxC', this._fxAttrC);
    g.setAttribute('aFxD', this._fxAttrD);
    g.setAttribute('aFxE', this._fxAttrE);
    g.instanceCount = 0;

    // uPeak 6.0: high enough that the muzzle flash's 1900 K core still clips (it
    // should — that is gas at 0.4 m), low enough that a three-pixel impact spark
    // is never a delta function for the lens to print. POINT-SOURCE GUARD.
    this.fxMat = this._spriteMaterial(GLSL_FX_VERT, {
      uDustGain: { value: 1 }, uPeak: { value: 3.0 }, uPuffScatter: { value: 1.0 },
    });
    this._fxU = this.fxMat.uniforms;
    this.fxMesh = new THREE.Mesh(g, this.fxMat);
    this.fxMesh.name = 'vfx.impacts';
    this.fxMesh.frustumCulled = false;
    this.fxMesh.renderOrder = 20;
    this.fxMesh.layers.set(CB_LAYER.TRANSPARENT);
    this.ctx.scene.add(this.fxMesh);
  }

  // ---------------------------------------------------------------------------
  // 4. decals
  // ---------------------------------------------------------------------------
  _buildDecals() {
    const N = this.decalBudget;
    const G = 5;                    // 5x5 vertex patch per decal
    const VP = G * G;
    this._decG = G; this._decVP = VP; this._decN = N;

    const pos = new Float32Array(N * VP * 3);
    const nrm = new Float32Array(N * VP * 3);
    const uvs = new Float32Array(N * VP * 2);
    const dec = new Float32Array(N * VP * 4);
    const idx = new Uint16Array(N * (G - 1) * (G - 1) * 6);

    let ii = 0;
    for (let d = 0; d < N; d++) {
      const b = d * VP;
      for (let j = 0; j < G; j++) {
        for (let i = 0; i < G; i++) {
          const v = b + j * G + i;
          uvs[v * 2] = i / (G - 1);
          uvs[v * 2 + 1] = j / (G - 1);
          nrm[v * 3 + 1] = 1;
        }
      }
      for (let j = 0; j < G - 1; j++) {
        for (let i = 0; i < G - 1; i++) {
          const a = b + j * G + i;
          idx[ii++] = a; idx[ii++] = a + 1; idx[ii++] = a + G + 1;
          idx[ii++] = a; idx[ii++] = a + G + 1; idx[ii++] = a + G;
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    this._decPos = new THREE.BufferAttribute(pos, 3); this._decPos.setUsage(THREE.DynamicDrawUsage);
    this._decNrm = new THREE.BufferAttribute(nrm, 3); this._decNrm.setUsage(THREE.DynamicDrawUsage);
    this._decAttr = new THREE.BufferAttribute(dec, 4); this._decAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this._decPos);
    geo.setAttribute('normal', this._decNrm);
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aDec', this._decAttr);
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    this._decGeo = geo;

    this.decalMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: GLSL_DECAL_VERT,
      fragmentShader: GLSL_DECAL_FRAG,
      uniforms: {
        uSunDir: this._sharedU.uSunDir,
        uSunCol: this._sharedU.uSunCol,
        uSkyRad: this._sharedU.uSkyRad,
        uSigmaT: this._sharedU.uSigmaT,
        uInscatter: this._sharedU.uInscatter,
        uFlashP: this._sharedU.uFlashP,
        uFlashC: this._sharedU.uFlashC,
        uFlashOn: this._sharedU.uFlashOn,
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      blendEquation: THREE.AddEquation,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });

    this.decalMesh = new THREE.Mesh(geo, this.decalMat);
    this.decalMesh.name = 'vfx.decals';
    this.decalMesh.frustumCulled = false;
    this.decalMesh.renderOrder = -10;
    this.decalMesh.layers.set(CB_LAYER.TRANSPARENT);
    this.ctx.scene.add(this.decalMesh);

    this.decals = [];
    for (let i = 0; i < N; i++) this.decals.push({ live: false, t: 0, life: 1, fade: 0.5, alpha: 1 });
    this._decNext = 0;
    this._decDirty = false;
  }

  // ---------------------------------------------------------------------------
  // 5. frame-graph passes
  // ---------------------------------------------------------------------------
  _registerPasses() {
    const { ctx } = this;
    const self = this;

    // order 49 — no drawing. Publishes this frame's linear depth to the particle
    // materials, and declares `viewZ` so the renderer builds it at all.
    ctx.frameGraph.register({
      id: 'vfxPrep',
      order: 49,
      inputs: ['viewZ'],
      outputs: [],
      execute(_t, gbuf) {
        const d = gbuf.gViewZ || self._nullDepth();
        self._sharedU.uDepth.value = d;
        const r = ctx.sys.renderer;
        self._sharedU.uTexel.value.set(1 / (r.width || 1), 1 / (r.height || 1));
      },
    });

    // order 55 — heat shimmer.
    this._heatU = {
      tSrc: { value: null },
      tDepth: { value: this._nullDepth() },
      uCam: { value: new THREE.Vector3() },
      uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
      uInvViewProj: { value: new THREE.Matrix4() },
      uSrc: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
      uSrcStr: { value: new THREE.Vector4() },
      uTime: { value: 0 },
      uAmp: { value: 5.5 },
      uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
    };
    this._heatMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FS_VERT,
      fragmentShader: GLSL_HEAT_FRAG,
      uniforms: this._heatU,
      depthTest: false, depthWrite: false,
    });

    ctx.frameGraph.register({
      id: 'vfxHeat',
      order: 55,
      inputs: ['viewZ'],
      outputs: [],
      execute(_t, gbuf, c) {
        if (self._heatOff) return;
        if (c.debug.flags.vfxHeat === false || c.debug.flags.vfx === false) return;
        const str = self._heatStrength;
        if (!str || str <= 0.002) return;      // true no-op, nothing allocated
        try {
          const r = c.sys.renderer;
          const rt = r.rt('vfxHeat', { type: THREE.HalfFloatType, format: THREE.RGBAFormat });
          const u = self._heatU;
          u.tSrc.value = gbuf.sceneHDR;
          u.tDepth.value = gbuf.gViewZ || self._nullDepth();
          u.uTexel.value.set(1 / r.width, 1 / r.height);
          u.uAmp.value = self.knobs.heatAmp;
          u.uTime.value = c.time.elapsed;
          u.uCam.value.copy(c.camera.position);
          c.camera.getWorldDirection(u.uCamFwd.value);
          u.uInvViewProj.value.copy(c.matrices.invViewProjUnjit);
          r.fullscreen(self._heatMat, rt);
          gbuf.sceneHDR = rt.texture;
          gbuf.color = rt.texture;
        } catch (e) {
          self._heatOff = true;
          console.warn('[vfx] heat shimmer disabled:', e && e.message);
        }
      },
    });
  }

  // ===========================================================================
  // per-frame
  // ===========================================================================

  update(dt) {
    if (!this.fx) return;
    this._stepFx(dt);
    this._stepDecals(dt);
  }

  lateUpdate() {
    const { ctx } = this;
    if (!this.fieldMat) return;

    const sky = ctx.sys.sky;
    const u = this._sharedU;
    const k = this.knobs;

    u.uTime.value = ctx.time.elapsed;
    u.uBreath.value = ctx.world?.breath ?? 0.5;
    if (ctx.world?.wind) u.uWind.value.copy(ctx.world.wind);
    u.uWindSpeed.value = ctx.world?.windSpeed ?? 1;

    const r = ctx.sys.renderer;
    const h = r?.height || (ctx.size.h * ctx.size.dpr);
    u.uProjScaleY.value = 0.5 * h * ctx.camera.projectionMatrix.elements[5];
    u.uScreenH.value = h;
    u.uTexel.value.set(1 / (r?.width || 1920), 1 / (r?.height || 1080));

    const cam = ctx.camera.position;
    const terr = ctx.sys.terrain;
    u.uGroundY.value = terr?.heightAt ? terr.heightAt(cam.x, cam.z) : 0;

    // --- light -----------------------------------------------------------
    if (sky) {
      const sd = sky.getSunDir();
      u.uSunDir.value.set(sd.x, sd.y, sd.z);
      const sc = sky.getSunColor(); const E = sky.getSunIrradiance();
      u.uSunCol.value.set(sc.r * E, sc.g * E, sc.b * E);
      const sr = sky.getSkyRadiance();
      u.uSkyRad.value.set(sr[0], sr[1], sr[2]);

      // ART §3.5 per-channel medium, straight from the same table the fog uses.
      const m = sky.getMedium();
      u.uSigmaT.value.set(m.sigmaT[0], m.sigmaT[1], m.sigmaT[2]);
      // single-scatter albedo * (sky + a little direct) = what the haze adds back
      const ss = [
        m.sigmaS[0] / Math.max(1e-9, m.sigmaT[0]),
        m.sigmaS[1] / Math.max(1e-9, m.sigmaT[1]),
        m.sigmaS[2] / Math.max(1e-9, m.sigmaT[2]),
      ];
      u.uInscatter.value.set(
        ss[0] * (sr[0] * 0.85 + sc.r * E * 0.055),
        ss[1] * (sr[1] * 0.85 + sc.g * E * 0.055),
        ss[2] * (sr[2] * 0.85 + sc.b * E * 0.055),
      );
    }

    // --- weather / biome --------------------------------------------------
    const w = sky?.weather || 'clear';
    if (w !== this._weather) { this._weather = w; this._syncStrata(); }
    this._updateBiome(cam);

    u.uScatterGain.value = k.scatterGain;
    this._fieldU.uDensity.value = k.density * Math.min(1, this.budget / this.builtBudget);
    this._fieldU.uDustGain.value = k.dustGain;
    this._fieldU.uEmberGain.value = k.emberGain;
    this._fieldU.uPeak.value = k.peak;
    this._fieldU.uClump.value = k.clump;
    if (this._fxU) {
      this._fxU.uDustGain.value = k.dustGain;
      this._fxU.uPeak.value = k.fxPeak;
      this._fxU.uPuffScatter.value = k.puffScatter;
    }
    if (this._plumeU) this._plumeU.uAlpha.value = k.plumeAlpha * k.plumes;

    this._updateFlashLights();
    this._updateHeat(cam);
    this._uploadFx();

    // __CB.toggle('vfx') A/B, plus per-layer flags for a critic pulling one
    // stratum at a time. Absent means on (main.js's toggle contract).
    const f = ctx.debug.flags;
    const on = f.vfx !== false;
    this.fieldMesh.visible = on && f.vfxField !== false;
    if (this.plumeMesh) this.plumeMesh.visible = on && f.vfxPlumes !== false;
    if (this.fxMesh) this.fxMesh.visible = on && f.vfxImpacts !== false;
    if (this.decalMesh) this.decalMesh.visible = on && f.vfxDecals !== false;
  }

  /**
   * Blend the biome weights by distance from terrain.js's authored sites, then
   * push the whole stratum table to the GPU. Distance-blended rather than
   * switched, so walking into the Smoulderworks fades the coal bed up.
   */
  _updateBiome(cam) {
    const t = this._biomeTarget;
    const base = BIOME.neutral;
    for (const key in base) t[key] = base[key];

    let best = 0;
    const mix = (name, wgt) => {
      const b = BIOME[name]; if (!b || wgt <= 0) return;
      for (const key in t) t[key] = lerp(t[key], b[key], wgt);
      best = Math.max(best, wgt);
    };
    for (const name of ['pocket', 'duff', 'glass', 'grotto']) {
      const s = SITES[name]; if (!s) continue;
      const dx = cam.x - s.x, dz = cam.z - s.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      let wgt = 1 - smoothstep(s.r * 0.55, s.r * 1.35, d);
      // the grotto is a pit — you have to actually be down in it
      if (name === 'grotto') wgt *= 1 - smoothstep(s.y + 8, s.y + 26, cam.y);
      mix(name, wgt);
    }
    void best;

    // damp so a teleport does not pop (and so it converges inside gotoVista's
    // 30 sim steps, which is what keeps captures reproducible)
    const b = this._biome;
    for (const key in b) b[key] = lerp(b[key], t[key], 0.22);

    this._pushStrata();
  }

  /** Rebuild the working stratum table from base + weather. */
  _syncStrata() {
    const W = WEATHER[this._weather] || WEATHER.clear;
    this._work = STRATA.map(s => ({ ...s, col: s.col.slice(), size: s.size.slice(), box: s.box.slice() }));
    for (const id in W) {
      const i = T[id]; if (i === undefined) continue;
      Object.assign(this._work[i], W[id]);
    }
    this._pushStrata();
  }

  _pushStrata() {
    if (!this._paramData || !this._work) return;
    const d = this._paramData, b = this._biome, k = this.knobs;
    const put = (row, ti, x, y, z, w) => {
      const o = (ti * PARAM_COLS + row) * 4;
      d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = w;
    };
    for (let i = 0; i < this._work.length; i++) {
      const s = this._work[i];
      let inten = s.inten;
      if (b[s.id] !== undefined) inten *= b[s.id];
      if (s.id === 'mote') inten *= k.moteGain;

      put(0, i, s.box[0], s.box[1], s.box[2], s.anchorY);
      put(1, i, s.wind, s.rise, s.swirl, s.swirlF);
      put(2, i, s.size[0], s.size[1], s.minPx, s.stretch);
      put(3, i, s.col[0], s.col[1], s.col[2], s.alpha);
      put(4, i, sat(inten), s.emis, s.spin, s.ground);
      put(5, i, s.edge, s.soft, k.sizeGain, s.sun ?? 1.0);
      put(6, i, (s.brk ?? 0) * k.breakup * (this._qBreak ?? 1), s.fwd ?? 0,
        (s.wrap ?? 0) * k.lightWrap, (s.core ?? 0) * k.emberCore);
    }
    this._paramTex.needsUpdate = true;
  }

  /**
   * Resolve the three transient flash slots into uniforms.
   *
   * Deliberately NOT a `THREE.PointLight`. Three lights every particle material
   * here is a RawShaderMaterial that three's lighting chunks never touch, so a
   * scene light is invisible to all of them; and adding lights to `ctx.scene`
   * bumps `numPointLights`, which recompiles every enriched material in the
   * world. `weapons.js` already owns the one scene-side muzzle light for the
   * OPAQUE world. This rig is the same flash, delivered to the four draws this
   * file owns, at the cost of two vec4 arrays.
   *
   * The envelope is `exp(-age / FLASH_TAU)` with a hard cut at `FLASH_LIFE`,
   * which is the same shape `weapons.js` uses for its flash quad, so the light
   * and the sprite rise and die together instead of beating against each other.
   */
  _updateFlashLights() {
    const u = this._sharedU;
    const k = this.knobs;
    const now = this.ctx.time.elapsed;
    const sky = this.ctx.sys.sky;

    // Anchored on the LIVE key, not on a frozen constant — see the FLASH LIGHT
    // RIG block at the top of this file for why that matters here specifically.
    const sunE = sky?.getSunIrradiance ? sky.getSunIrradiance() : 0;
    const refE = Math.max(sunE * FLASH_VS_SUN, FLASH_E_FLOOR);
    const I0 = refE * FLASH_REF_D * FLASH_REF_D * k.flashGain * k.flashLights;

    let live = 0;
    for (let i = 0; i < FLASH_SLOTS; i++) {
      const f = this._fl[i];
      const age = now - f.t0;
      const P = u.uFlashP.value[i], C = u.uFlashC.value[i];
      if (!(age >= 0) || age > FLASH_LIFE || f.e <= 0) {
        C.set(0, 0, 0, 0);
        // Park the position on the camera with a huge radius so a stale slot
        // cannot produce a hot spot even if the colour write is ever missed.
        P.set(0, -1e5, 0, 1e6);
        continue;
      }
      const env = Math.exp(-age / FLASH_TAU);
      const I = I0 * f.e * env;
      if (I <= 1e-4) { C.set(0, 0, 0, 0); P.set(0, -1e5, 0, 1e6); continue; }
      P.set(f.x, f.y, f.z, f.rad * f.rad);
      C.set(f.col[0] * I, f.col[1] * I, f.col[2] * I, 0);
      live++;
    }
    this._flashOn = live;
    u.uFlashOn.value = live > 0 ? 1 : 0;
  }

  _updateHeat(cam) {
    const k = this.knobs;
    const list = this._heatSrc;
    const u = this._heatU;
    if (!u) return;

    // the Smoulderworks coal bed is a permanent source; everything else is
    // transient and pushed by setHeatSource()
    const g = SITES.grotto;
    const dx = cam.x - g.x, dz = cam.z - g.z;
    const near = 1 - smoothstep(g.r * 0.9, g.r * 2.0, Math.sqrt(dx * dx + dz * dz));
    const below = 1 - smoothstep(g.y + 14, g.y + 34, cam.y);
    const grotto = near * below;

    let total = 0;
    const push = (i, x, y, z, rad, str) => {
      u.uSrc.value[i].set(x, y, z, rad);
      u.uSrcStr.value.setComponent(i, str);
      total += str;
    };
    push(0, g.x, g.y + 1.0, g.z, g.r * 0.85, grotto * k.heat);
    for (let i = 1; i < 4; i++) {
      const s = list[i - 1];
      if (s && s.str > 0.001) push(i, s.x, s.y, s.z, s.r, s.str * k.heat);
      else { u.uSrc.value[i].set(0, 0, 0, 0); u.uSrcStr.value.setComponent(i, 0); }
    }
    this._heatStrength = total;
  }

  // ===========================================================================
  // transient FX
  // ===========================================================================

  _stepFx(dt) {
    const f = this.fx;
    const G = -7.06;              // 0.72 g (ART §1)
    const wind = this.ctx.world?.wind || { x: 0, y: 0, z: 0 };
    const ws = this.ctx.world?.windSpeed ?? 1;
    const terr = this.ctx.sys.terrain;

    let live = 0;
    for (let i = 0; i < f.live; i++) {
      if (f.life[i] <= 0) continue;
      f.life[i] -= dt;
      if (f.life[i] <= 0) continue;

      const d = Math.exp(-f.drag[i] * dt);
      f.vx[i] = (f.vx[i] + wind.x * ws * f.drag[i] * dt * 0.35) * d;
      f.vz[i] = (f.vz[i] + wind.z * ws * f.drag[i] * dt * 0.35) * d;
      f.vy[i] = (f.vy[i] + (G * f.buoy[i]) * dt) * d;

      f.px[i] += f.vx[i] * dt;
      f.py[i] += f.vy[i] * dt;
      f.pz[i] += f.vz[i] * dt;
      f.roll[i] += f.spin[i] * dt;

      // only the heavy kinds pay for a heightfield lookup
      if (f.kind[i] === FX.DEBRIS && terr?.heightAt) {
        const gy = terr.heightAt(f.px[i], f.pz[i]) + 0.02;
        if (f.py[i] < gy) {
          f.py[i] = gy;
          f.vy[i] = Math.abs(f.vy[i]) * 0.28;
          f.vx[i] *= 0.55; f.vz[i] *= 0.55;
          f.spin[i] *= 0.5;
          if (Math.abs(f.vy[i]) < 0.25) { f.vy[i] = 0; f.buoy[i] = 0; f.drag[i] = 9; }
        }
      }
      live = i + 1;
    }
    // compact lazily: shuffle the tail down when the front third is dead
    this._compactFx();
    void live;
  }

  _compactFx() {
    const f = this.fx;
    let w = 0;
    for (let i = 0; i < f.live; i++) {
      if (f.life[i] <= 0) continue;
      if (w !== i) {
        f.px[w] = f.px[i]; f.py[w] = f.py[i]; f.pz[w] = f.pz[i];
        f.vx[w] = f.vx[i]; f.vy[w] = f.vy[i]; f.vz[w] = f.vz[i];
        f.life[w] = f.life[i]; f.max[w] = f.max[i];
        f.size0[w] = f.size0[i]; f.grow[w] = f.grow[i];
        f.kind[w] = f.kind[i]; f.drag[w] = f.drag[i]; f.buoy[w] = f.buoy[i];
        f.r[w] = f.r[i]; f.g[w] = f.g[i]; f.b[w] = f.b[i];
        f.a0[w] = f.a0[i]; f.roll[w] = f.roll[i]; f.spin[w] = f.spin[i];
        f.temp[w] = f.temp[i]; f.seed[w] = f.seed[i];
      }
      w++;
    }
    f.live = w;
  }

  _uploadFx() {
    const f = this.fx;
    if (!f || !this.fxMesh) return;
    const n = f.live;
    const A = this._fxA, B = this._fxB, C = this._fxC, D = this._fxD, E = this._fxE;
    const gain = this.knobs.fxGain;
    const brk = this.knobs.breakup * (this._qBreak ?? 1);

    for (let i = 0; i < n; i++) {
      const age = 1 - f.life[i] / Math.max(1e-4, f.max[i]);
      const size = f.size0[i] * (1 + f.grow[i] * age);
      A[i * 4] = f.px[i]; A[i * 4 + 1] = f.py[i]; A[i * 4 + 2] = f.pz[i]; A[i * 4 + 3] = size;

      let a = f.a0[i];
      let cr = f.r[i], cg = f.g[i], cb = f.b[i];
      const k = f.kind[i];
      if (k === FX.SPARK) {
        // a spark cools: 1900 K flare -> 1300 K core -> 900 K smoulder (ART §2.2)
        const t = sat(f.temp[i] * (1 - age * 0.92));
        const hot = t * t;
        cr = lerp(E1[0], E4[0], hot); cg = lerp(E1[1], E4[1], hot); cb = lerp(E1[2], E4[2], hot);
        a = f.a0[i] * (1 - age * age);
      } else if (k === FX.EMBER) {
        const t = sat(1 - age * 0.85);
        cr = lerp(E1[0], E2[0], t); cg = lerp(E1[1], E2[1], t); cb = lerp(E1[2], E2[2], t);
        a = f.a0[i] * (1 - smoothstep(0.55, 1.0, age));
      } else if (k === FX.FLARE) {
        // keeps its emitted radiance; the envelope is the flash's, not a cooling
        // curve, so it dies with the light instead of lingering as an orange dot
        const e = 1 - age;
        a = f.a0[i] * e * e * (0.35 + 0.65 * e);
      } else if (k === FX.SMOKE) {
        a = f.a0[i] * Math.sin(Math.min(1, age * 1.15) * Math.PI) * 1.1;
      } else {
        a = f.a0[i] * (1 - smoothstep(0.25, 1.0, age));
      }
      B[i * 4] = cr * gain; B[i * 4 + 1] = cg * gain; B[i * 4 + 2] = cb * gain;
      B[i * 4 + 3] = sat(a);

      const speed = Math.hypot(f.vx[i], f.vy[i], f.vz[i]);
      const stretch = (k === FX.SPARK) ? clamp(speed * 0.11, 0.4, 4.5)
        : (k === FX.FLARE) ? clamp(speed * 0.34, 0.6, 1.8) : 0;
      C[i * 4] = f.vx[i]; C[i * 4 + 1] = f.vy[i]; C[i * 4 + 2] = f.vz[i];
      C[i * 4 + 3] = stretch;
      D[i * 4] = f.roll[i];
      D[i * 4 + 1] = (k === FX.SPARK) ? 1.9 : (k === FX.SMOKE ? 0.7 : (k === FX.FLARE ? 1.35 : 1.15));
      D[i * 4 + 2] = (k === FX.SMOKE) ? 1.4 : (k === FX.FLARE ? 0.5 : 0.25);
      D[i * 4 + 3] = (k === FX.SPARK || k === FX.EMBER || k === FX.FLARE) ? 1 : 0;   // emissive?

      // ---- sprite shape (aFxE) ------------------------------------------------
      // x  lobing + internal breakup. Smoke tatters most, dust a lot, debris a
      //    little (it is a chip, its silhouette is the point), sparks and embers
      //    not at all — a point of incandescence really is a smooth core.
      // z  CORE BOOST: a second, much tighter gaussian added on top, so an
      //    emissive particle is a bright core inside a warm halo rather than one
      //    smooth blob. This is what gives a spark a profile at four pixels.
      // w  EROSION. Smoke does not fade uniformly, it tears into wisps. The
      //    fragment shader subtracts this from the density and renormalises, so
      //    the thin parts of the puff disappear first. Ramped hard over the back
      //    half of the life — a puff is dense, then lacy, then gone.
      let bk = 0;
      if (k === FX.SMOKE) bk = 0.92;
      else if (k === FX.DUST) bk = 0.80;
      else if (k === FX.DEBRIS) bk = 0.45;
      else if (k === FX.FLARE) bk = 0.62;   // petals, not a disc — see muzzle()
      // Smoke and dust erode as they age; a fresh puff is dense.
      if (bk > 0) bk *= 0.42 + 0.58 * Math.min(1, age * 1.6);
      const core = (k === FX.SPARK) ? 0.85 : (k === FX.EMBER) ? 0.70 : (k === FX.FLARE) ? 0.45 : 0;
      const erode = (k === FX.SMOKE) ? 0.62 * smoothstep(0.30, 1.0, age)
        : (k === FX.DUST) ? 0.48 * smoothstep(0.42, 1.0, age) : 0;
      E[i * 4] = bk * brk;
      E[i * 4 + 1] = f.seed[i];
      E[i * 4 + 2] = core;
      E[i * 4 + 3] = erode;
    }

    this._fxAttrA.needsUpdate = true;
    this._fxAttrB.needsUpdate = true;
    this._fxAttrC.needsUpdate = true;
    this._fxAttrD.needsUpdate = true;
    this._fxAttrE.needsUpdate = true;
    this.fxMesh.geometry.instanceCount = n;
  }

  _emit(kind, x, y, z, vx, vy, vz, opts) {
    const f = this.fx;
    if (!f) return;
    if (f.live >= f.n) {
      // the pool is full: recycle the oldest slot rather than dropping the hit,
      // so a burst always reads as a burst
      let oldest = 0, t = Infinity;
      for (let i = 0; i < f.n; i += 7) if (f.life[i] < t) { t = f.life[i]; oldest = i; }
      f.live = Math.max(f.live, oldest + 1);
      this._writeFx(oldest, kind, x, y, z, vx, vy, vz, opts);
      return;
    }
    this._writeFx(f.live++, kind, x, y, z, vx, vy, vz, opts);
  }

  _writeFx(i, kind, x, y, z, vx, vy, vz, o) {
    const f = this.fx;
    f.px[i] = x; f.py[i] = y; f.pz[i] = z;
    f.vx[i] = vx; f.vy[i] = vy; f.vz[i] = vz;
    f.kind[i] = kind;
    f.max[i] = o.life; f.life[i] = o.life;
    f.size0[i] = o.size; f.grow[i] = o.grow ?? 0;
    f.drag[i] = o.drag ?? 2; f.buoy[i] = o.buoy ?? 1;
    f.r[i] = o.col[0]; f.g[i] = o.col[1]; f.b[i] = o.col[2];
    f.a0[i] = o.alpha; f.roll[i] = o.roll ?? 0; f.spin[i] = o.spin ?? 0;
    f.temp[i] = o.temp ?? 1;
    f.seed[i] = this.rng.next();
  }

  // ===========================================================================
  // decals
  // ===========================================================================

  _stepDecals(dt) {
    if (!this.decals) return;
    const k = this.knobs.decalFade;
    let dirty = false;
    for (let i = 0; i < this.decals.length; i++) {
      const d = this.decals[i];
      if (!d.live) continue;
      d.t += dt;
      const L = d.life * k;
      let a;
      if (d.t < d.fade) a = d.t / d.fade;                       // pop in
      else if (d.t > L - 2.0) a = sat((L - d.t) / 2.0);         // fade out
      else a = 1;
      a *= d.alpha;
      if (d.t >= L) { this._releaseDecal(i); dirty = true; continue; }
      if (Math.abs(a - d._a) > 0.004) { this._setDecalAlpha(i, a); d._a = a; dirty = true; }
    }
    if (dirty) this._decAttr.needsUpdate = true;
  }

  _setDecalAlpha(slot, a) {
    const VP = this._decVP, arr = this._decAttr.array;
    const b = slot * VP;
    for (let v = 0; v < VP; v++) arr[(b + v) * 4] = a;
  }

  _releaseDecal(slot) {
    const d = this.decals[slot];
    d.live = false; d._a = 0;
    const VP = this._decVP, b = slot * VP;
    const pa = this._decPos.array, da = this._decAttr.array;
    for (let v = 0; v < VP; v++) {
      pa[(b + v) * 3] = 0; pa[(b + v) * 3 + 1] = -9999; pa[(b + v) * 3 + 2] = 0;
      da[(b + v) * 4] = 0;
    }
    this._decPos.needsUpdate = true;
    this._decAttr.needsUpdate = true;
  }

  // ===========================================================================
  // PUBLIC API — combat.js, weapons.js, enemies.js and director.js call these.
  // Everything is optional-chained on their side; nothing here throws.
  // ===========================================================================

  /**
   * Project a decal onto the world.
   * @param {{pos:THREE.Vector3|number[], normal?:THREE.Vector3|number[],
   *          kind?:string, size?:number, life?:number, rot?:number,
   *          alpha?:number, conform?:boolean}} o
   * @returns {number} slot index, or -1
   */
  decal(o) {
    if (!this.decals || !o) return -1;
    const p = o.pos.isVector3 ? o.pos : { x: o.pos[0], y: o.pos[1], z: o.pos[2] };
    const nIn = o.normal ? (o.normal.isVector3 ? o.normal : { x: o.normal[0], y: o.normal[1], z: o.normal[2] }) : { x: 0, y: 1, z: 0 };
    const kind = DECAL_KIND[o.kind] ?? 0;
    const size = o.size ?? 0.25;
    const rot = o.rot ?? this.rng.range(0, Math.PI * 2);
    const terr = this.ctx.sys.terrain;

    // pick a slot: first free, else the oldest
    let slot = -1;
    for (let i = 0; i < this.decals.length; i++) {
      const j = (this._decNext + i) % this.decals.length;
      if (!this.decals[j].live) { slot = j; break; }
    }
    if (slot < 0) {
      let bestT = -1;
      for (let i = 0; i < this.decals.length; i++) if (this.decals[i].t > bestT) { bestT = this.decals[i].t; slot = i; }
    }
    this._decNext = (slot + 1) % this.decals.length;

    const d = this.decals[slot];
    d.live = true; d.t = 0; d.life = o.life ?? 26; d.fade = 0.06; d.alpha = o.alpha ?? 1; d._a = 0;

    // tangent frame
    const n = new THREE.Vector3(nIn.x, nIn.y, nIn.z).normalize();
    const up = Math.abs(n.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const t1 = new THREE.Vector3().crossVectors(up, n).normalize();
    const t2 = new THREE.Vector3().crossVectors(n, t1);
    const c = Math.cos(rot), s = Math.sin(rot);
    const ax = t1.clone().multiplyScalar(c).addScaledVector(t2, s);
    const ay = t1.clone().multiplyScalar(-s).addScaledVector(t2, c);

    // conform to the heightfield when the surface is essentially ground
    const conform = o.conform !== undefined ? o.conform : (n.y > 0.55 && !!terr?.heightAt);

    const G = this._decG, VP = this._decVP;
    const pa = this._decPos.array, na = this._decNrm.array, da = this._decAttr.array;
    const base = slot * VP;
    const half = size * 0.5;
    const nrm = new THREE.Vector3();

    for (let j = 0; j < G; j++) {
      for (let i = 0; i < G; i++) {
        const v = base + j * G + i;
        const u = (i / (G - 1) - 0.5) * 2 * half;
        const w = (j / (G - 1) - 0.5) * 2 * half;
        let px = p.x + ax.x * u + ay.x * w;
        let py = p.y + ax.y * u + ay.y * w;
        let pz = p.z + ax.z * u + ay.z * w;
        if (conform) {
          py = terr.heightAt(px, pz) + 0.022;
          terr.normalAt(px, pz, nrm);
        } else {
          px += n.x * 0.018; py += n.y * 0.018; pz += n.z * 0.018;
          nrm.copy(n);
        }
        pa[v * 3] = px; pa[v * 3 + 1] = py; pa[v * 3 + 2] = pz;
        na[v * 3] = nrm.x; na[v * 3 + 1] = nrm.y; na[v * 3 + 2] = nrm.z;
        da[v * 4] = 0; da[v * 4 + 1] = kind; da[v * 4 + 2] = this.rng.next(); da[v * 4 + 3] = size;
      }
    }
    this._decPos.needsUpdate = true;
    this._decNrm.needsUpdate = true;
    this._decAttr.needsUpdate = true;
    return slot;
  }

  /**
   * The combat entry point. Spawns the whole hit: sparks, dust, debris, smoke,
   * embers and a decal, all typed by the surface that was hit.
   * @param {{pos:any, normal?:any, dir?:any, surface?:string, power?:number,
   *          decal?:boolean}} o
   */
  impact(o) {
    if (!this.fx || !o) return;
    const S = SURFACES[o.surface] || SURFACES.ash;
    const p = o.pos.isVector3 ? o.pos : { x: o.pos[0], y: o.pos[1], z: o.pos[2] };
    const nIn = o.normal ? (o.normal.isVector3 ? o.normal : { x: o.normal[0], y: o.normal[1], z: o.normal[2] }) : { x: 0, y: 1, z: 0 };
    const n = this._v3.set(nIn.x, nIn.y, nIn.z).normalize();
    const power = clamp(o.power ?? 1, 0.15, 4);
    const rng = this.rng;
    const q = this.ctx.quality.preset;
    const scale = q === 'low' ? 0.45 : q === 'medium' ? 0.72 : 1.0;

    const cone = (spread, speed) => {
      // a cosine-ish lobe around the surface normal
      const a = rng.range(0, Math.PI * 2);
      const r = Math.pow(rng.next(), 0.6) * spread;
      const sx = Math.cos(a) * r, sy = Math.sin(a) * r;
      const up = Math.abs(n.y) > 0.92 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
      const t1x = up.y * n.z - up.z * n.y, t1y = up.z * n.x - up.x * n.z, t1z = up.x * n.y - up.y * n.x;
      const l = Math.hypot(t1x, t1y, t1z) || 1;
      const ux = t1x / l, uy = t1y / l, uz = t1z / l;
      const vx = n.y * uz - n.z * uy, vy = n.z * ux - n.x * uz, vz = n.x * uy - n.y * ux;
      const dx = n.x + ux * sx + vx * sy, dy = n.y + uy * sx + vy * sy, dz = n.z + uz * sx + vz * sy;
      const dl = Math.hypot(dx, dy, dz) || 1;
      const sp = speed * rng.range(0.45, 1.0);
      return [dx / dl * sp, dy / dl * sp, dz / dl * sp];
    };

    const N = (c) => Math.max(0, Math.round(c * power * scale));

    // A bullet strike on rock or metal is a real, if small, light source: it is
    // what makes an impact read as a hit rather than as a decal appearing. Only
    // the spark-producing surfaces get one, and at a fraction of the muzzle's
    // energy, so a firefight does not turn into a strobe.
    if (S.spark >= 10) {
      this.flash({
        pos: [p.x + n.x * 0.05, p.y + n.y * 0.05, p.z + n.z * 0.05],
        e: 0.055 * (S.spark / 14) * power, radius: 0.10,
      });
    }

    // dust
    for (let i = 0, m = N(S.dust); i < m; i++) {
      const [vx, vy, vz] = cone(0.85, 2.6 * S.lift);
      this._emit(FX.DUST, p.x, p.y, p.z, vx, vy, vz, {
        life: rng.range(0.45, 1.15), size: rng.range(S.dustSize[0], S.dustSize[1]) * (0.75 + power * 0.3),
        grow: rng.range(1.1, 2.3), drag: rng.range(3.6, 6.0), buoy: rng.range(0.02, 0.14),
        col: S.dustCol, alpha: rng.range(0.10, 0.24), spin: rng.range(-2, 2), roll: rng.range(0, 6.28),
      });
    }
    // smoke
    for (let i = 0, m = N(S.smoke); i < m; i++) {
      const [vx, vy, vz] = cone(0.5, 1.1);
      this._emit(FX.SMOKE, p.x, p.y, p.z, vx, vy + 0.5, vz, {
        life: rng.range(1.3, 2.6), size: rng.range(0.10, 0.26),
        grow: rng.range(2.2, 4.2), drag: rng.range(1.4, 2.4), buoy: -0.06,
        col: [0.14, 0.12, 0.105], alpha: rng.range(0.09, 0.18), spin: rng.range(-0.8, 0.8), roll: rng.range(0, 6.28),
      });
    }
    // sparks
    for (let i = 0, m = N(S.spark); i < m; i++) {
      const [vx, vy, vz] = cone(1.25, 9.5);
      this._emit(FX.SPARK, p.x, p.y, p.z, vx, vy, vz, {
        life: rng.range(0.20, 0.75), size: rng.range(0.010, 0.026),
        grow: -0.35, drag: rng.range(0.6, 1.6), buoy: 1,
        col: E4, alpha: rng.range(0.16, 0.34), temp: rng.range(0.6, 1.0),
      });
    }
    // debris
    for (let i = 0, m = N(S.debris); i < m; i++) {
      const [vx, vy, vz] = cone(1.0, 5.5);
      this._emit(FX.DEBRIS, p.x, p.y, p.z, vx, vy, vz, {
        life: rng.range(0.9, 2.4), size: rng.range(0.012, 0.042),
        grow: 0, drag: rng.range(0.25, 0.7), buoy: 1,
        col: S.debrisCol, alpha: rng.range(0.6, 0.95), spin: rng.range(-9, 9), roll: rng.range(0, 6.28),
      });
    }
    // embers
    for (let i = 0, m = N(S.ember); i < m; i++) {
      const [vx, vy, vz] = cone(1.1, 2.2);
      this._emit(FX.EMBER, p.x, p.y, p.z, vx, vy + 0.6, vz, {
        life: rng.range(1.1, 3.0), size: rng.range(0.012, 0.030),
        grow: 0, drag: rng.range(1.0, 2.2), buoy: -0.18,
        col: E2, alpha: rng.range(0.14, 0.30),
      });
    }

    if (o.decal !== false) {
      this.decal({
        pos: p, normal: n, kind: S.decal,
        size: lerp(S.decalSize[0], S.decalSize[1], rng.next()) * (0.75 + power * 0.35),
        life: 26,
      });
    }
  }

  /**
   * Fire a transient flash light. Slot 0 is reserved for the muzzle; everything
   * else ring-allocates over slots 1..2.
   * @param {{pos:any, e?:number, radius?:number, col?:number[], muzzle?:boolean}} o
   */
  flash(o) {
    if (!this._fl || !o || !o.pos) return;
    const p = o.pos.isVector3 ? o.pos : { x: o.pos[0], y: o.pos[1], z: o.pos[2] };
    const i = o.muzzle ? 0 : (this._flNext = 1 + (this._flNext % (FLASH_SLOTS - 1)));
    const f = this._fl[i];
    f.x = p.x; f.y = p.y; f.z = p.z;
    f.e = clamp(o.e ?? 1, 0, 8);
    f.rad = Math.max(0.05, o.radius ?? FLASH_RADIUS);
    f.col = o.col || FLASH_COL;
    f.t0 = this.ctx.time.elapsed;
  }

  /**
   * Muzzle FX. `dir` is the barrel direction.
   *
   * Rewritten after the round-4 capture. Two measured problems, both here:
   *
   *  1. THE FLASH EMITTED NO LIGHT. It still does not light the opaque world —
   *     that is `weapons.js`'s scene light, and it is filed under HANDOFF
   *     `## requests` with the numbers — but it now lights every particle,
   *     decal and smoke puff this file draws, which is all the geometry that
   *     actually sits inside the flash's 1 m falloff.
   *  2. THE FLASH *WAS* THE SMUDGE. Smoke was emitted at 0.04-0.11 m with
   *     `grow: 5.5`, reaching 0.71 m across at ~0.45 m from the camera: one
   *     sprite, ~850 px wide, a perfectly smooth radial gradient, sitting on
   *     the lens. That is the "raw bloom sprite blowing out a quarter of the
   *     near frame" both critics filed as the muzzle flash. Hiding weapons.js's
   *     flash quad left it untouched; hiding THIS pool removed it entirely.
   *     The plume is now many small puffs with real velocity DOWNRANGE, so it
   *     clears the near plane instead of parking on it.
   */
  muzzle(o) {
    if (!this.fx || !o) return;
    const p = o.pos.isVector3 ? o.pos : { x: o.pos[0], y: o.pos[1], z: o.pos[2] };
    const d = o.dir ? (o.dir.isVector3 ? o.dir : { x: o.dir[0], y: o.dir[1], z: o.dir[2] }) : { x: 0, y: 0, z: -1 };
    const rng = this.rng;
    const power = clamp(o.power ?? 1, 0.2, 3);
    const smoke = this.knobs.muzzleSmoke;

    // a basis around the barrel, so the plume can be authored in bore space
    const up = Math.abs(d.y) > 0.92 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    let rx = up.y * d.z - up.z * d.y, ry = up.z * d.x - up.x * d.z, rz = up.x * d.y - up.y * d.x;
    const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const ux = d.y * rz - d.z * ry, uy = d.z * rx - d.x * rz, uz = d.x * ry - d.y * rx;

    // The light. Placed a little ahead of the crown, where the expanding gas
    // actually incandesces, rather than inside the brake.
    this.flash({
      pos: [p.x + d.x * 0.10, p.y + d.y * 0.10, p.z + d.z * 0.10],
      e: 0.55 + 0.45 * power, radius: FLASH_RADIUS, muzzle: true,
    });

    // ---- unburnt powder ------------------------------------------------------
    // Fast, tight, short-lived, and stretched by the FX shader's velocity
    // alignment. The count is up and the size is down: eighteen 1 cm streaks
    // read as a jet, nine 2 cm blobs read as a spray of orange dots.
    for (let i = 0, m = Math.round(16 * power); i < m; i++) {
      const sp = rng.range(4, 17);
      const s1 = rng.gauss(0, 1.15), s2 = rng.gauss(0, 1.15);
      this._emit(FX.SPARK,
        p.x + d.x * 0.03, p.y + d.y * 0.03, p.z + d.z * 0.03,
        d.x * sp + rx * s1 + ux * s2, d.y * sp + ry * s1 + uy * s2, d.z * sp + rz * s1 + uz * s2, {
        life: rng.range(0.05, 0.19), size: rng.range(0.006, 0.014),
        grow: -0.4, drag: 3.8, buoy: 1, col: E4, alpha: rng.range(0.22, 0.46), temp: 1,
      });
    }

    // =========================================================================
    // THE FLASH. Rebuilt in round 7 against "shape the muzzle flash with a hot
    // white core and a cooler ragged periphery, add smoke and ejecta".
    //
    // What was wrong with the round-4 version, measured in tests/shots/hipfire:
    // four lobes staggered along ONE axis with no lateral spread is a ball. The
    // frame showed a 250 px cream mass, 22.5% of it at 250+ codes, with no core
    // and no structure — because a stack of concentric lobes on the bore axis
    // has nothing to be asymmetric about, and because dof.js convolves the near
    // field with an ~18 px kernel that erases everything finer than the lobe
    // arrangement itself. So the shape has to be authored at 30-200 px, in the
    // ARRANGEMENT, not inside the sprites.
    //
    // Four layers, hottest and smallest first:
    //   1. the gas core   — 2900 K, tiny, 20 ms, one per shot
    //   2. petals         — 1900 K, radial, per-shot angular phase
    //   3. brake ports    — 1900 -> 1300 K, two lateral jets at ART §4.2's 78 deg
    //   4. the tip        — 1300 -> 1050 K, cool ragged gas at the front
    // Every colour is a row on the Planckian locus (ART §2.2). The temperature
    // FALLS outward, which is the whole "hot core, cooler periphery" note, and
    // it is physically what an expanding gas jet does.
    // =========================================================================
    const fs = this.knobs.muzzleFlash;
    // ONE angle per shot, shared by every layer, so the whole flash rotates as a
    // rigid object between shots instead of each lobe jittering independently.
    // That is the difference between "varied" and "noisy": a real flash is a
    // repeatable shape in a random ORIENTATION, set by where the gas found the
    // path of least resistance in the brake this time.
    const phi = rng.range(0, Math.PI * 2);
    // ...plus a small per-shot lateral bias, so it is never symmetric either.
    const bx = rng.gauss(0, 0.30), by = rng.gauss(0, 0.30);
    const lat = (a, r0) => ({           // a point at angle `a`, radius r0, in bore space
      x: rx * (Math.cos(a) * r0 + bx * r0) + ux * (Math.sin(a) * r0 + by * r0),
      y: ry * (Math.cos(a) * r0 + bx * r0) + uy * (Math.sin(a) * r0 + by * r0),
      z: rz * (Math.cos(a) * r0 + bx * r0) + uz * (Math.sin(a) * r0 + by * r0),
    });

    // ---- 1. the gas core ----------------------------------------------------
    // Small, very hot, very short. It is MEANT to clip — this is 2900 K gas
    // 40 cm from the eye — but the point-source guard in the FX vertex shader
    // pays its excess radiance in AREA rather than intensity, so instead of a
    // 20 px dot of flat 255 it becomes a ~55 px core with a real falloff into
    // the petals behind it. uPeak on the FX pool is the knob for that.
    if (fs > 0.001) {
      this._emit(FX.FLARE,
        p.x + d.x * 0.030, p.y + d.y * 0.030, p.z + d.z * 0.030,
        d.x * 1.6, d.y * 1.6, d.z * 1.6, {
        life: 0.046 + 0.008 * power, size: 0.022 * (0.85 + 0.30 * power) * fs,
        grow: 2.0, drag: 9.0, buoy: 0.05,
        col: E4H, alpha: 0.55,
      });
    }

    // ---- 2. petals ----------------------------------------------------------
    // Five lobes on a radial star, staggered down the bore, each pushed OUTWARD
    // as well as forward so the silhouette has points. The 5-lobe count and the
    // per-shot phase together give a shape that is recognisably the same flash
    // every time and never the same picture twice.
    for (let i = 0, m = Math.round(5 * fs); i < m; i++) {
      const a = phi + (i / 5) * Math.PI * 2 + rng.gauss(0, 0.22);
      const t = rng.range(0.05, 0.95);
      const ahead = 0.045 + t * 0.20;
      const r0 = (0.020 + t * 0.055) * (0.8 + 0.4 * power);
      const o = lat(a, r0);
      // temperature falls outward: 1900 K at the root, 1300 K at the petal tip
      const col = [lerp(E4[0], E3[0], t * 0.85), lerp(E4[1], E3[1], t * 0.85), lerp(E4[2], E3[2], t * 0.85)];
      this._emit(FX.FLARE,
        p.x + d.x * ahead + o.x, p.y + d.y * ahead + o.y, p.z + d.z * ahead + o.z,
        d.x * 3.1 + o.x * 22, d.y * 3.1 + o.y * 22, d.z * 3.1 + o.z * 22, {
        life: rng.range(0.042, 0.076), size: (0.016 + t * 0.036) * (0.8 + 0.35 * power) * fs,
        grow: 1.9, drag: 8.0, buoy: 0.1,
        col: mul3(col, 0.075), alpha: rng.range(0.30, 0.48) * (1 - t * 0.30),
        roll: rng.range(0, 6.28), spin: rng.range(-9, 9),
      });
    }

    // ---- 3. brake ports -----------------------------------------------------
    // The KV-7 has a brake, and a brake is a thing you can SEE fire: two short
    // lateral jets, one each side, vented back at ART §4.2's 78 deg vocabulary.
    // This is the detail that separates a generic fireball from a specific gun.
    for (let s = -1; s <= 1; s += 2) {
      if (fs < 0.001) break;
      const a = phi + (s > 0 ? 0 : Math.PI) + rng.gauss(0, 0.12);
      const o = lat(a, 1.0);
      const back = Math.cos(78 * Math.PI / 180);     // 0.208 — the vent's rearward tilt
      for (let i = 0; i < 2; i++) {
        const t = rng.range(0.1, 1.0);
        const ahead = 0.028 + t * 0.030;
        const rad = (0.028 + t * 0.055) * (0.8 + 0.4 * power);
        this._emit(FX.FLARE,
          p.x + d.x * ahead + o.x * rad, p.y + d.y * ahead + o.y * rad, p.z + d.z * ahead + o.z * rad,
          o.x * 5.4 - d.x * back * 2.1, o.y * 5.4 - d.y * back * 2.1, o.z * 5.4 - d.z * back * 2.1, {
          life: rng.range(0.034, 0.058), size: (0.013 + t * 0.024) * (0.8 + 0.35 * power) * fs,
          grow: 2.3, drag: 9.5, buoy: 0.1,
          col: mul3([lerp(E4[0], E3[0], t), lerp(E4[1], E3[1], t), lerp(E4[2], E3[2], t)], 0.048),
          alpha: rng.range(0.18, 0.32),
          roll: rng.range(0, 6.28), spin: rng.range(-12, 12),
        });
      }
    }

    // ---- 4. the cool ragged tip ---------------------------------------------
    // 1300 -> 1050 K gas at the front of the cone, wide, faint, heavily lobed,
    // and living about twice as long as the core. This is the "cooler ragged
    // periphery": the flash does not end at an edge, it frays into orange.
    for (let i = 0, m = Math.round(3 * fs); i < m; i++) {
      const t = rng.range(0.3, 1.0);
      const ahead = 0.16 + t * 0.26;
      const j = 0.034 * t;
      this._emit(FX.FLARE,
        p.x + d.x * ahead + rx * rng.gauss(0, j) + ux * rng.gauss(0, j),
        p.y + d.y * ahead + ry * rng.gauss(0, j) + uy * rng.gauss(0, j),
        p.z + d.z * ahead + rz * rng.gauss(0, j) + uz * rng.gauss(0, j),
        d.x * 4.2, d.y * 4.2, d.z * 4.2, {
        life: rng.range(0.060, 0.105), size: (0.040 + t * 0.055) * (0.8 + 0.35 * power) * fs,
        grow: 2.6, drag: 6.0, buoy: 0.2,
        col: mul3([lerp(E3[0], E2[0], t), lerp(E3[1], E2[1], t), lerp(E3[2], E2[2], t)], 0.155),
        alpha: rng.range(0.12, 0.22),
        roll: rng.range(0, 6.28), spin: rng.range(-6, 6),
      });
    }

    // ---- ejecta -------------------------------------------------------------
    // Unburnt propellant grains and carbon flakes. NOT emissive: they are dark
    // specks tumbling across the flash, and a dark thing crossing a bright thing
    // is a depth cue the flash cannot give on its own. They are also the only
    // part of the muzzle emission that survives long enough to be seen against
    // the ground, which is where a critic reads "ejecta" from.
    for (let i = 0, m = Math.round(5 * power); i < m; i++) {
      const sp = rng.range(1.6, 6.5);
      const s1 = rng.gauss(0, 1.5), s2 = rng.gauss(0, 1.5);
      this._emit(FX.DEBRIS,
        p.x + d.x * 0.05, p.y + d.y * 0.05, p.z + d.z * 0.05,
        d.x * sp + rx * s1 + ux * s2, d.y * sp + ry * s1 + uy * s2 + 0.8, d.z * sp + rz * s1 + uz * s2, {
        life: rng.range(0.35, 0.95), size: rng.range(0.004, 0.010),
        grow: 0, drag: 1.7, buoy: 1, col: A_SOOT, alpha: rng.range(0.45, 0.85),
        roll: rng.range(0, 6.28), spin: rng.range(-16, 16),
      });
    }

    // ---- the plume -----------------------------------------------------------
    // Small, numerous, moving DOWNRANGE, and — new in round 7 — EMITTED FURTHER
    // OUT. `dof.hipfire` focuses at 26 m and clamps the near circle of confusion
    // at 9 half-res px (18 full-res px at 1080p), so anything within ~0.5 m of
    // the eye is convolved with an 18 px kernel and cannot hold ANY detail: the
    // lobed silhouette, the erosion, the light wrap, all of it is erased and
    // what survives is a smooth pale disc. That is the mechanism behind the
    // "WHITE-DISC SMOKE" note, and no amount of shader work fixes a puff that is
    // authored inside the lens's blur radius. The plume now starts 0.14-0.60 m
    // AHEAD of the brake (i.e. 0.6-1.1 m from the eye, where the CoC is ~8 px
    // against a 60-120 px puff) and leaves at 3-7 m/s.
    for (let i = 0, m = Math.round(11 * power * smoke); i < m; i++) {
      const t = rng.next();
      const sp = rng.range(3.0, 7.0) * (1 - t * 0.40);
      const side = rng.gauss(0, 0.65);
      const vert = rng.gauss(0, 0.50) + 0.35;
      const ahead = 0.14 + t * 0.46;
      this._emit(FX.SMOKE,
        p.x + d.x * ahead, p.y + d.y * ahead, p.z + d.z * ahead,
        d.x * sp + rx * side + ux * vert,
        d.y * sp + ry * side + uy * vert,
        d.z * sp + rz * side + uz * vert, {
        life: rng.range(0.30, 0.80), size: rng.range(0.022, 0.052),
        grow: 2.2, drag: 4.6, buoy: -0.05, col: [0.20, 0.17, 0.15], alpha: rng.range(0.11, 0.23),
        spin: rng.range(-3.5, 3.5), roll: rng.range(0, 6.28),
      });
    }

    // ---- the hang -----------------------------------------------------------
    // MEASURED, and it is why the two combat shots looked like nobody had fired.
    // tests/lib/harness.mjs's shoot() lets ~0.5 s of sim run between gotoVista
    // and the screenshot, and setPose('fire') only holds the trigger for 30
    // steps, so the review frame lands 550 ms AFTER the last round (probe:
    // weapons._flashT = 0.567, vfx flash age = 0.550). The flash is long over by
    // then — that is filed for main.js — but at t+550 ms a real burst still has
    // a plainly visible plume hanging off the brake, and this file had none: the
    // whole muzzle emission was dead inside 0.9 s. This layer is that plume.
    // Slow, buoyant, wide, faint, and it survives the gap.
    for (let i = 0, m = Math.round(4 * power * smoke); i < m; i++) {
      const ahead = 0.28 + rng.next() * 0.50;
      this._emit(FX.SMOKE,
        p.x + d.x * ahead, p.y + d.y * ahead, p.z + d.z * ahead,
        d.x * rng.range(0.8, 2.0) + rx * rng.gauss(0, 0.28),
        d.y * rng.range(0.8, 2.0) + ry * rng.gauss(0, 0.28) + 0.30,
        d.z * rng.range(0.8, 2.0) + rz * rng.gauss(0, 0.28), {
        life: rng.range(0.95, 1.9), size: rng.range(0.026, 0.058),
        grow: 2.7, drag: 2.1, buoy: -0.14, col: [0.235, 0.205, 0.180],
        alpha: rng.range(0.055, 0.115), spin: rng.range(-1.4, 1.4), roll: rng.range(0, 6.28),
      });
    }
  }

  /** A free-standing puff, for footsteps / landings / explosions. */
  burst(pos, o = {}) {
    this.impact({ pos, normal: o.normal || [0, 1, 0], surface: o.surface || 'ash', power: o.power ?? 1, decal: o.decal ?? false });
  }

  /** Transient heat source for the shimmer pass. `i` is 0..2. */
  setHeatSource(i, pos, radius = 3, strength = 1) {
    this._heatSrc[i] = pos ? { x: pos.x ?? pos[0], y: pos.y ?? pos[1], z: pos.z ?? pos[2], r: radius, str: strength } : null;
  }

  clearDecals() {
    if (!this.decals) return;
    for (let i = 0; i < this.decals.length; i++) if (this.decals[i].live) this._releaseDecal(i);
  }

  clearFx() { if (this.fx) { this.fx.live = 0; this.fx.life.fill(0); this._uploadFx(); } }

  /** main.js __CB.resetAllTemporal() reaches this. Keeps captures reproducible. */
  resetTemporal() {
    this.clearFx();
    this.clearDecals();
    this._heatSrc.length = 0;
    for (const f of this._fl) { f.t0 = -1e9; f.e = 0; }
    this._flNext = 1;
    if (this._sharedU) {
      for (let i = 0; i < FLASH_SLOTS; i++) {
        this._sharedU.uFlashC.value[i].set(0, 0, 0, 0);
        this._sharedU.uFlashP.value[i].set(0, -1e5, 0, 1e6);
      }
      this._sharedU.uFlashOn.value = 0;
    }
  }

  onQuality(q) {
    // Density only. The instance buffer is never resized: see `builtBudget`.
    this.budget = Math.max(512, q.particleBudget | 0);
    // The sprite breakup is the one PER-PIXEL addition in this file (two
    // octaves of value noise on every particle fragment that asks for it), and
    // particulate is the highest-overdraw thing on the screen. It is a look
    // refinement, not a correctness term, so the bottom preset drops it.
    // NB it is scaled here, not written to knobs.breakup, so a debug override
    // survives a preset change.
    this._qBreak = q.preset === 'low' ? 0 : q.preset === 'medium' ? 0.7 : 1;
  }

  debugInfo() {
    return {
      budget: this.budget,
      fieldInstances: this.fieldMesh?.geometry.instanceCount ?? 0,
      fxLive: this.fx?.live ?? 0,
      decalsLive: this.decals ? this.decals.filter(d => d.live).length : 0,
      weather: this._weather,
      biome: { ...this._biome },
      heat: +(this._heatStrength || 0).toFixed(3),
      heatDisabled: this._heatOff,
      flashLive: this._flashOn || 0,
      // peak irradiance a surface at FLASH_REF_D sees from a full-strength
      // muzzle flash, in the same scene units as sky.getSunIrradiance()
      flashE: +(Math.max((this.ctx.sys.sky?.getSunIrradiance?.() ?? 0) * FLASH_VS_SUN, FLASH_E_FLOOR)
        * this.knobs.flashGain * this.knobs.flashLights).toFixed(3),
      flashIntensity: this._sharedU
        ? +this._sharedU.uFlashC.value[0].x.toFixed(4) : 0,
    };
  }

  dispose() {
    for (const m of [this.fieldMesh, this.plumeMesh, this.fxMesh, this.decalMesh]) {
      if (!m) continue;
      this.ctx.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this._nullTex?.dispose();
    this._paramTex?.dispose();
    this._plumeTex?.dispose();
    this._heatMat?.dispose();
    this.ctx.frameGraph?.unregister?.('vfxPrep');
    this.ctx.frameGraph?.unregister?.('vfxHeat');
  }
}

export default VFX;
