// =============================================================================
// CURFEW - flora: the forest. Tree TEMPLATES built once at boot, instanced per
// chunk, merged per 2x2 group, carded per 4x4 group, with a collider under
// every trunk.
// Owner: flora. Files: src/world/flora.js, src/world/impostors.js.
// =============================================================================
//
// WHAT THIS FILE IS
// -----------------
// The thing Alex looks at first. 400 m of night forest that streams, sways,
// blocks bullets and cannot be walked through.
//
// It is GLIDE's pipeline re-derived into r161 modules
// (donors/forest/src/world/TreeFactory.js, Forest.js, Scatter.js - the shipped
// tune only exists in a minified r171 bundle, so this is port work, not copy):
// a handful of seeded species archetypes, each a leaning tapered trunk plus
// branch segments plus noise-deformed canopy masses, merged into ONE geometry
// per template at boot and then drawn as InstancedMesh. GLIDE itself merges a
// fresh geometry per placed tree (Forest.js:_addTree clones and transforms) -
// that is where its 116 ms chunk stall came from, and it is exactly the thing
// docs/SPIKE-FINDINGS.md measured away by instancing instead. Do not put it
// back.
//
// THE THREE LAWS THIS FILE IS ACCOUNTABLE FOR
// -------------------------------------------
// 1. COLLIDERS ARE EMITTED INSIDE THE PLANTING LOOP, in the same pass that
//    places the instance (PEACHFUL src/flora.js:277-362 does exactly this, and
//    it is why nothing in Peachful is walk-through). CINDERBLOOM's
//    walk-through trees were a STRUCTURAL ABSENCE - its flora publishes no
//    colliders at all - and SKYSHARD only collided instances scaled over 0.75,
//    which is the same bug wearing a threshold. Here every trunk, including
//    every giant, calls collision.addCollider(shape, chunkId) at the moment it
//    is accepted, before anything is packed or sorted. The chunk id is the
//    OWNING chunk's, so collision.removeChunk() takes the trees with it.
// 2. DRAW-CALL DISCIPLINE (DESIGN §8, budget 750 for the whole game).
//      near  <  96 m   one InstancedMesh per template per chunk, LOD0
//      mid   -> 180 m  one InstancedMesh per template per 2x2 chunk group, LOD1
//      far   >  180 m  ONE card mesh per 4x4 chunk group (impostors.js)
//    and every chunk plants from at most CFG.flora.nearTemplates templates, so
//    the near ring can never exceed 4 draws per chunk no matter what the
//    species field does. Measured shape of the bill at the streamed radius:
//    ~48 near + ~56 mid + ~16 far + ~6 grass.
// 3. NOTHING POPS. The three tiers overlap by CFG.flora.lodHysteresis and the
//    handover inside each overlap is decided PER INSTANCE by a stable hash of
//    the tree's world xz against a smoothstep of its distance
//    (cinderbloom/src/world/flora.js:34-39, 1104-1116). The near material culls
//    when s >= h, the mid material culls when s < h - the SAME s and the SAME
//    h - so a tree is drawn by exactly one representation, never both and never
//    neither, and a hundred trees hand over at a hundred slightly different
//    distances. That reads as a dissolve.
//
// WIND
// ----
// PEACHFUL's onBeforeCompile injection (src/flora.js:34-90) carrying GLIDE's
// per-vertex sway weight (TreeFactory.js segmentGeometry/blobGeometry write an
// `aWind` attribute: 0 at the trunk base, 0.5 at branch tips, 0.7 in canopy
// mass) and GLIDE's leaf-translucency term (TreeFactory.js:50-63,
// pow(dot(-V, sun), 3) * 0.9 + wrap * 0.12, weighted by aWind) recoloured cold
// for moonlight. Every one of these materials carries a customProgramCacheKey:
// two materials with identical `parameters` silently share a program no matter
// what onBeforeCompile did (cinderbloom/src/engine/renderer.js:753-757).
//
// GRASS
// -----
// Cards inside CFG.flora.grassRadius that shrink to zero area at the rim
// rather than fading through transparency. The alpha comes from a REAL
// generated texture. PALEHOLLOW shipped untextured dark quads with an
// alphaTest and they render as opaque black rectangles; the forest spike hit
// the identical fault on 2026-09-02 (docs/SPIKE-FINDINGS.md, "two visual
// faults"). NoColorSpace on it, per the law.
// =============================================================================

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import CFG from '../config.js';
import { clamp, clamp01, lerp, smoothstep, noise1D, TAU } from '../engine/math.js';
import { ImpostorBank, IMPOSTOR_FROM } from './impostors.js';

// ---------------------------------------------------------------------------
// Local constants that want to be in config.js. Requested in docs/HANDOFF.md;
// until the integrator adds them, they live here and nowhere else.
// ---------------------------------------------------------------------------
const NEAR_RING_M = 72;      // -> CFG.flora.nearRing. ART.md §2.5, was 96.
const PLANT_CELL = 2.6;      // m; 1/2.6^2 = 0.148 trees/m^2 ceiling, which is
                             // exactly the "measured affordable to 0.150" note
                             // beside CFG.flora.treeDensity.
const GRASS_CELL = 1.15;     // m
const GRASS_ACCEPT = 0.60;
// ART.md §2.1: was 16, which is a bug and not a look. See the long note at the
// write site in _buildGrass for why 16 made the grass reflect 140% of the light.
// The document predicts 1.6; measured, 1.6 landed the grass layer at mean 26.2
// against a ground of 38.9, i.e. 12.7 UNDER the "ground +- 5" gate rather than
// over it. The albedo ratio does not survive the geometry: a grass card is a
// VERTICAL blade and the ground is a horizontal plane, so the same albedo
// catches much less of a moon that is 33 degrees up. The document's own
// instruction for the barks - predict, measure, fine-tune - applies here too.
// Measured on this build, frame A, grass layer mean by differential mask:
//   x16  146.9      x1.6  26.2      x2.1  31.9      x2.4  36.0
// against a ground of 38.9. The response is sub-linear because ACES is already
// compressing by the time grass reaches the 30s, so it took the sweep above and
// not one prediction. 2.4 is the value that satisfies the gate ("ground +- 5")
// and it also survives the terrain lane's ART.md §3.1 target of a 28-36 ground:
// at 36.0 the grass sits inside +-5 of either end of that band.
const GRASS_TINT_MUL = 2.4;

// ---------------------------------------------------------------------------
// THE FORM TERM. ART.md §0.3's derived gate: "lit side : shadow side across one
// trunk >= 1.8 in display luminance. A cylinder that does not have two sides is
// a slab." Measured on this build before this change, by taking every
// contiguous run of flora-near pixels 8-140 px wide on the rows below eye level
// and dividing the run's p90 by its p10:
//     frame A  median 1.162  (n = 906 runs)      frame B  median 1.181  (n = 712)
// Every trunk in tests/shots/value-A.png is one flat value edge to edge, and
// that is most of why the form band 48-127 holds 1.21% of world pixels against
// a 12% target: nothing in the county has a mid-tone ON it.
//
// The cause is named in ART.md §1.3 and it is not the geometry: "AmbientLight is
// directionless: it adds the same irradiance to a surface facing the moon and
// one facing away, which is exactly what turns a cylinder into a slab." A
// HemisphereLight is no better on a trunk - every normal on a vertical cylinder
// has n.y = 0, so hemi contributes the SAME irradiance to all of them. Between
// them the two fills are Y ~ 1.17 against a key of Y ~ 1.42, and the moon is
// shadowed out under the canopy for most of the near ring, so the trunk sees
// almost nothing but flat fill.
//
// The census is pinned at 13 (CONTRACT) and lights are not this lane's file, so
// the fill is made DIRECTIONAL where this lane is allowed to make it
// directional: at the material. The bark and leaf albedo is multiplied by a
// function of the surface normal against the moon direction the material
// already carries for its translucency term (uMoonView, view space, written
// lazily every frame in present()). It is one mix() in the fragment shader, no
// new uniform, no new light, and it works whether or not the moon's shadow map
// actually reaches that trunk - which matters, because under a closed canopy it
// does not.
//
// TWO terms, and the second one is the half that a first pass got wrong. A
// straight moon-facing ramp with a tight terminator - smoothstep(-0.35, 0.45,
// dot(n, moon)) - only produces two sides on the trunks whose terminator
// happens to fall inside the half you can see. MOON_ELEV is 0.593 rad, so
// dot(n, moon) on a vertical trunk is at most cos(34deg) = 0.83 and a trunk
// facing the moon saturates the ramp across its whole visible arc: flat again,
// just at a different value. Measured with that version in: frame A median
// 1.482, frame B median 1.201 - better than 1.16 and nowhere near 1.8.
//
//  1. THE MOON RAMP is now near-linear across the whole achievable range
//     (x0.62 + 0.50 clamped, so -0.81..+0.81 maps to 0..1) instead of a
//     terminator. Every trunk gets a gradient, whatever its bearing.
//  2. THE CURVATURE TERM darkens toward the silhouette, where the normal turns
//     perpendicular to the view. This is what makes a cylinder read as a
//     cylinder when the moon is BEHIND THE CAMERA and the moon ramp alone has
//     nothing to say - and it lands its darkening exactly on the silhouette
//     pixels, which is the same population ART.md gate row 3 measures
//     ("sky : tree-on-sky >= 1.9"). One term, two gates.
//
// Mean multiplier over a visible cylinder is ~0.67, i.e. the forest gets about
// a third darker overall. That is the right direction on every flora row of
// the target order: trunk moon side 12-22, trunk shadow side 5-12, canopy
// underside 3-8, and "a trunk must never exceed the sky".
//
// MEASURED, frame A, uFormAmt flipped 0 -> 1 between two renders inside ONE rAF
// callback (which is the only honest A/B in a round where six lanes are landing
// at once), over the 101 masked runs whose own median luminance is inside the
// trunk band:
//     lit : shadow across one trunk   1.247 -> 2.129 median, 1.445 -> 2.229 mean
//     sky : tree-on-sky               1.38  -> 1.90
//     flora against sky, p50          15.7  -> 11.4
// Gate 3 of ART.md H.4 is met by the SAME term as the trunk gate, and that is
// the curvature half doing both jobs: it lands its darkening exactly on the
// silhouette pixels, which is the population gate 3 measures. FORM_EDGE was
// swept 0.60 -> 0.50 -> 0.42 -> 0.38 against that ratio (1.72, 1.79, 1.87,
// 1.90) and 0.38 is where the gate is met - measured, not predicted.
const FORM_SHADOW = 0.52;    // albedo multiplier on the side facing away from the moon
const FORM_LIT = 1.22;       // ... and on the side facing it
const FORM_RAMP = 0.62;      // dot(n, moon) -> side, scale ...
const FORM_BIAS = 0.50;      // ... and offset
const FORM_EDGE = 0.38;      // multiplier where the normal is perpendicular to the view

const TEMPLATE_COUNT = 9;    // GLIDE ships 9 seeded templates; so do we.
const SLOPE_REJECT = 0.62;   // GLIDE Forest.js:52 rejects > 0.62 for trees
const GIANT_CHANCE = 0.12;   // GLIDE Forest.js:62
const MAX_TREES_PER_CHUNK = 4096;
const TREE_STRIDE = 10;      // x y z scale yaw ti tintR tintG tintB rank
const BUILDS_PER_STEP = 2;   // materialisations (near set / group / super)
const GRASS_BUILDS_PER_STEP = 1;

// ---------------------------------------------------------------------------
// Palette, LINEAR. Vertex colours are NOT colour-managed by three - whatever
// goes in the `color` attribute is used as linear radiance, so writing sRGB
// hex here is how the spike's ground came out pale mint. Night albedos, with
// DESIGN §8's floor and ceiling (0.018 - 0.62) respected; birch bark and burnt
// snags are deliberately the two BRIGHT things in the county, because a night
// forest with no value separation is unreadable and that is the failure mode
// this whole project keeps hitting.
// ---------------------------------------------------------------------------
// Doubled from the first authored pass after measurement - see the note in terrain.js.
// These are FETCH's lantern-graded night albedos, and CURFEW's M0 key light is the moon.
// ART.md §2.2, measured on screen in frame A before this edit:
//   barkDark  p50  18.9   target 12-22   kept
//   barkRed   p50  23.3   target 12-22   kept
//   barkSnag  p50  59.7   target <= 26   0.38  -> 0.150
//   barkBirch p50 101.4   target <= 22   0.51  -> 0.112
// The INTENT in the comment above - birch and burnt snags are deliberately the
// two bright things in the county - is right and is kept. The AMOUNT was ~5x
// too much: a birch trunk measured 101 against an open sky of 2.4, i.e. 40x the
// sky it was standing against, when at night the sky IS the light and every
// silhouette is read against it. After this change birch is still the palest
// bark in the county, at ~1.2x the conifers instead of 4.9x, and it is below
// the sky instead of far above it.
const PAL = {
  barkDark: [0.104, 0.084, 0.068],
  barkRed: [0.122, 0.082, 0.06],
  // The document's prescribed values are 0.112/0.109/0.100 and 0.150/0.143/0.131.
  // Measured, those landed template 5 (birch) at p50 23.0 and template 4 (birch)
  // at p50 29.0 - the same albedo, two different recipes, and one of them over
  // the "no flora template p50 above 26" gate. Scaled by 0.89 and 0.96 to put
  // the WORST template inside the gate rather than the average one. Measured
  // after: tpl 4 p50 26.2, tpl 5 p50 21.8, tpl 8 (snag) p50 25.9 - i.e. the
  // brightest bark in the county is 26.2 where it was 101.4.
  barkBirch: [0.100, 0.097, 0.089],
  barkSnag: [0.145, 0.138, 0.127],
  needle: [0.06, 0.092, 0.064],
  needleBlue: [0.052, 0.08, 0.082],
  leaf: [0.088, 0.112, 0.068],
  leafDry: [0.116, 0.096, 0.056],
  // ART.md §0.5: "saturation is rationed... everything else is a value, not a
  // colour". This was [0.128, 0.144, 0.096] - R:G:B of 1 : 1.13 : 0.75 - and
  // tests/shots/fv-final-A.png showed the result: the blades are the most
  // saturated thing in the frame after the filling-station lamp, bright green
  // splinters standing in a county that is otherwise one blue-grey. Two causes,
  // multiplied: this, and the blade texture's own green (fixed in
  // makeGrassTexture, which is now neutral). A vertical card also takes a much
  // larger share of its light from hemi's GROUND colour than the up-facing
  // ground does, and that term is green-grey too, so the hue compounded three
  // times. Narrowed to 1 : 1.05 : 0.90 at matched luminance: Rec.709 luma goes
  // 0.1371 -> 0.1360, i.e. -0.8%, so §2.1's measured "ground +- 5" stands.
  grass: [0.131, 0.138, 0.118],
};

// Species archetypes. `kind` drives the silhouette; the county is 42% Pines so
// the bank is conifer-heavy on purpose (DESIGN §2 region table).
const ARCHETYPES = [
  { kind: 'conifer', bark: PAL.barkDark, leaf: PAL.needle, h: [14, 22], r: [0.36, 0.58] },
  { kind: 'conifer', bark: PAL.barkRed, leaf: PAL.needleBlue, h: [12, 19], r: [0.32, 0.50] },
  { kind: 'conifer', bark: PAL.barkDark, leaf: PAL.needle, h: [16, 24], r: [0.40, 0.62] },
  { kind: 'conifer', bark: PAL.barkRed, leaf: PAL.needleBlue, h: [10, 15], r: [0.26, 0.42] },
  { kind: 'birch', bark: PAL.barkBirch, leaf: PAL.leaf, h: [9, 15], r: [0.20, 0.32] },
  { kind: 'birch', bark: PAL.barkBirch, leaf: PAL.leafDry, h: [8, 13], r: [0.18, 0.28] },
  { kind: 'broad', bark: PAL.barkDark, leaf: PAL.leaf, h: [10, 16], r: [0.42, 0.68] },
  { kind: 'broad', bark: PAL.barkRed, leaf: PAL.leafDry, h: [9, 14], r: [0.38, 0.60] },
  { kind: 'snag', bark: PAL.barkSnag, leaf: PAL.leafDry, h: [7, 12], r: [0.24, 0.40] },
];

// ---------------------------------------------------------------------------
// Deterministic fields. No Math.random anywhere: every one of these is a pure
// function of integer cell coordinates and the flora seed, which is forked out
// of ctx.rng, so placement is identical on every run and a Playwright test can
// assert a specific tree.
// ---------------------------------------------------------------------------
function hashI(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise2(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hashI(xi, yi, s), b = hashI(xi + 1, yi, s);
  const c = hashI(xi, yi + 1, s), d = hashI(xi + 1, yi + 1, s);
  const ab = a + (b - a) * u;
  const cd = c + (d - c) * u;
  return ab + (cd - ab) * v;
}

function fbm2(x, y, s, oct) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise2(x * freq, y * freq, s + i * 37);
    norm += amp;
    amp *= 0.5; freq *= 2;
  }
  return sum / norm;                                    // 0..1
}

function vnoise3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const h = (ix, iy, iz) => hashI(ix + iz * 7919, iy + iz * 104729, s);
  const c00 = lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u);
  const c10 = lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u);
  const c01 = lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u);
  const c11 = lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u);
  return lerp(lerp(c00, c10, v), lerp(c01, c11, v), w) * 2 - 1;   // -1..1
}

// ---------------------------------------------------------------------------
// Template construction. A RECIPE is built first (numbers only), then geometry
// is built from it at a detail level - so LOD0 and LOD1 are the same tree, not
// two trees that happen to be nearby.
// ---------------------------------------------------------------------------
const _yAxis = new THREE.Vector3(0, 1, 0);
const _segA = new THREE.Vector3();
const _segB = new THREE.Vector3();
const _segDir = new THREE.Vector3();
const _segQuat = new THREE.Quaternion();
const _segMat = new THREE.Matrix4();

function makeRecipe(rand, ai) {
  const A = ARCHETYPES[ai];
  const trunkH = lerp(A.h[0], A.h[1], rand());
  const trunkR = lerp(A.r[0], A.r[1], rand());
  const lean = (rand() - 0.5) * (A.kind === 'conifer' ? 0.7 : 1.6);
  const leanDir = rand() * TAU;
  const rec = {
    kind: A.kind, trunkH, trunkR, lean, leanDir,
    bark: A.bark, leaf: A.leaf,
    branches: [], canopy: [],
  };

  const topX = Math.cos(leanDir) * lean;
  const topZ = Math.sin(leanDir) * lean;
  rec.top = [topX, trunkH, topZ];

  // Branches. A snag keeps a few broken stubs and NO canopy - that is the whole
  // read of The Burn (DESIGN §2: "pale snags 7-12 m, ash floor, no canopy").
  const nB = rec.kind === 'snag' ? 3 + ((rand() * 3) | 0)
    : rec.kind === 'birch' ? 3 + ((rand() * 2) | 0)
      : 4 + ((rand() * 4) | 0);
  // ART.md §2.6. The conifer branch start was 0.30 and the canopy base 0.26 of
  // trunkH; with trunkH 14-24 m that put the lowest foliage mass at 3.6-6.2 m,
  // a metre and a half over a 1.68 m eye. That is why the torch lit a ceiling
  // (§1.9: a 560 cd source with decay 2 delivers 43 lux at 3.6 m and nothing
  // survives it), why open sky was 2.4% of frame B, and why you cannot see a
  // landmark from inside the Pines at all. The canopy has to be a roof you walk
  // UNDER, with air between it and your head.
  const startF = rec.kind === 'conifer' ? 0.42 : 0.45;
  for (let i = 0; i < nB; i++) {
    const t = (i + rand() * 0.6) / nB;
    const f = clamp01(lerp(startF, 0.94, t));
    const ang = rand() * TAU + i * 2.3999632;    // golden angle keeps them apart
    const up = rec.kind === 'conifer' ? -0.12 + rand() * 0.30 : 0.35 + rand() * 0.70;
    const reach = (rec.kind === 'conifer' ? 2.6 - f * 1.4 : rec.kind === 'broad' ? 3.2 : 2.0)
      * (0.7 + rand() * 0.7) * (rec.kind === 'snag' ? 0.45 : 1);
    rec.branches.push({ f, ang, up, reach, r: Math.max(0.055, trunkR * (0.46 - t * 0.22)) });
  }

  if (rec.kind !== 'snag') {
    if (rec.kind === 'conifer') {
      // Stacked, squashed masses: a spire, not a lollipop.
      //
      // ART.md §2.6 raised the canopy base 0.26 -> 0.45 of trunkH and §2.3 cut
      // the radius 0.20 -> 0.15, and MEASURED, THAT DID NOT LAND. Frame B, the
      // sky-dome differential taken with each ring of the forest hidden in turn
      // inside one rAF:
      //     every ring drawn        open sky  0.25% of world pixels
      //     hide flora-near only              31.67%
      //     hide flora-mid only                0.36%
      //     hide flora-impostors only          0.25%
      //     hide all flora                    52.14%
      // 31.4 of the 51.9 points of sky the forest is hiding are hidden by the
      // NEAR RING ALONE - trees inside 72 m, i.e. the canopy over the player's
      // own head. The mid ring and the far ring together hide 3.5. Raising the
      // base moved the roof up; it did not put holes in it, and closure is a
      // plan-view property, not a height.
      //
      // So the levers are radius and count, and both of them are here. A ray
      // leaving the eye at the top of the frame (34 deg, half of CFG.render.fov
      // 68) crosses the canopy slab horizontally for slabThickness/tan(34deg),
      // and the number of crowns it hits goes as density x radius x that
      // length - LINEAR in radius, not squared, because it is a line through
      // the field and not an area of it. Optical depth today is -ln(0.25/31.67)
      // = 4.85, which is why the frame has a ceiling and not a canopy.
      //     layers   6.5 avg -> 4.5 avg   (x0.69)
      //     radius   0.150H  -> 0.095H    (x0.63)
      //     slab     0.45-1.05H -> 0.55-1.05H
      // Predicted tau 4.85 -> ~2.1, i.e. open sky ~3.5-4% where it was 0.25%.
      // Measured after, frame B: see the number published in docs/HANDOFF.md.
      //
      // This is also the cheapest triangle saving in the file - about 92% of a
      // tree is canopy blobs (§2.4) - and it is what makes a conifer read as a
      // spire with sky between the whorls instead of a green cloud on a stick.
      const layers = 4 + ((rand() * 2) | 0);
      for (let i = 0; i < layers; i++) {
        const fr = i / layers;
        const y = lerp(trunkH * 0.55, trunkH * 1.05, fr);   // ART.md §2.6, was 0.26 then 0.45
        const r = lerp(trunkH * 0.095, trunkH * 0.022, fr) * (0.85 + rand() * 0.3);
        rec.canopy.push({
          x: topX * (y / trunkH), y, z: topZ * (y / trunkH),
          r, squash: 0.46 + rand() * 0.12, tint: 0.86 + fr * 0.28, wind: 0.42 + fr * 0.30,
        });
      }
    } else if (rec.kind === 'birch') {
      // Same measurement, same lever: was 0.20 and four masses. A birch crown at
      // night is a scribble of twigs with sky through it, never a ball.
      const R = trunkH * 0.150;
      for (let i = 0; i < 3; i++) {
        rec.canopy.push({
          x: topX + (rand() - 0.5) * R * 1.6,
          y: trunkH * (0.80 + rand() * 0.26),
          z: topZ + (rand() - 0.5) * R * 1.6,
          r: R * (0.55 + rand() * 0.5), squash: 0.80 + rand() * 0.2,
          tint: 0.84 + rand() * 0.34, wind: 0.62 + rand() * 0.24,
        });
      }
    } else {
      // Was 0.26 with one crown blob and five satellites - the widest canopy in
      // the bank and the single biggest contributor to the near ring's optical
      // depth wherever a broad template is in the prefix.
      const R = trunkH * 0.195;
      rec.canopy.push({ x: topX, y: trunkH * 0.94, z: topZ, r: R * 1.05, squash: 0.86, tint: 1.0, wind: 0.55 });
      for (let i = 0; i < 4; i++) {
        rec.canopy.push({
          x: topX + (rand() - 0.5) * R * 2.4,
          y: trunkH * (0.72 + rand() * 0.34),
          z: topZ + (rand() - 0.5) * R * 2.4,
          r: R * (0.48 + rand() * 0.42), squash: 0.80 + rand() * 0.24,
          tint: 0.80 + rand() * 0.38, wind: 0.60 + rand() * 0.26,
        });
      }
    }
  }
  // Leaf clusters hung on branch ends, so the canopy is attached to something.
  if (rec.kind === 'broad' || rec.kind === 'birch') {
    for (const br of rec.branches) {
      if (br.f < 0.5) continue;
      rec.blobsOnBranch = true;
    }
  }
  return rec;
}

/**
 * Tapered segment between two points, carrying a per-vertex `aWind` ramp.
 * Derived from GLIDE donors/forest/src/world/TreeFactory.js:70-100.
 */
function segmentGeometry(ax, ay, az, bx, by, bz, rA, rB, radial, col, windA, windB) {
  _segA.set(ax, ay, az); _segB.set(bx, by, bz);
  const len = Math.max(0.01, _segA.distanceTo(_segB));
  let geo = new THREE.CylinderGeometry(rB, rA, len, radial, 1, true);
  geo.translate(0, len / 2, 0);
  _segDir.subVectors(_segB, _segA).normalize();
  _segQuat.setFromUnitVectors(_yAxis, _segDir);
  _segMat.makeRotationFromQuaternion(_segQuat);
  _segMat.setPosition(ax, ay, az);
  geo.applyMatrix4(_segMat);
  const ni = geo.toNonIndexed();
  geo.dispose();
  geo = ni;

  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  const w = new Float32Array(n);
  const pos = geo.attributes.position;
  const dy = Math.max(0.001, by - ay);
  for (let i = 0; i < n; i++) {
    // Bark value jitter: a forest of identically-valued trunks reads as
    // wallpaper. +-8% is enough to break it without looking speckled.
    const j = 0.92 + (((i * 2654435761) >>> 0) % 1000) / 1000 * 0.16;
    c[i * 3] = col[0] * j; c[i * 3 + 1] = col[1] * j; c[i * 3 + 2] = col[2] * j;
    w[i] = lerp(windA, windB, clamp01((pos.getY(i) - ay) / dy));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  geo.setAttribute('aWind', new THREE.BufferAttribute(w, 1));
  return geo;
}

/**
 * Canopy mass: an icosphere pushed around by two octaves of smooth 3-D noise.
 * GLIDE donors/forest/src/world/TreeFactory.js:104-140 - low-frequency lumps,
 * NOT per-vertex spikes, or it reads as a broccoli floret.
 */
function blobGeometry(cx, cy, cz, radius, detail, col, tint, wind, squash, seed) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const p = geo.attributes.position;
  const sx = cx * 0.6 + 11.3, sy = cy * 0.6 - 4.1, sz = cz * 0.6 + 7.7;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    const ix = px / radius, iy = py / radius, iz = pz / radius;
    const lump = 1
      + vnoise3(ix * 1.7 + sx, iy * 1.7 + sy, iz * 1.7 + sz, seed) * 0.19
      + vnoise3(ix * 3.6 - sx, iy * 3.6 + sz, iz * 3.6 - sy, seed + 17) * 0.08;
    p.setXYZ(i, px * lump, py * lump * squash, pz * lump);
  }
  geo.translate(cx, cy, cz);
  geo.computeVertexNormals();

  const n = p.count;
  const c = new Float32Array(n * 3);
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // Vertical gradient inside the mass: brighter on top where the moon lands,
    // deeper underneath. This is most of what makes a blob read as foliage.
    const ly = clamp01((p.getY(i) - cy) / radius * 0.6 + 0.5);
    // ART.md §2.3: was lerp(0.62, 1.18, ly). Widened because the old range was
    // too narrow to survive the fill - a 1.9:1 internal ratio under an ambient
    // that adds the same irradiance to every normal reads as a smooth grey
    // boulder floating in mid-air, which is exactly what
    // tests/shots/art-horizon-2000.png shows. 3.05:1 gives the mass a real dark
    // underside and a real moon-lit top, which is most of what makes a blob
    // read as foliage rather than as rock.
    const g = lerp(0.42, 1.28, ly) * tint;
    const j = 0.94 + (((i * 2654435761) >>> 0) % 1000) / 1000 * 0.12;
    c[i * 3] = col[0] * g * j; c[i * 3 + 1] = col[1] * g * j; c[i * 3 + 2] = col[2] * g * j;
    w[i] = wind;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  geo.setAttribute('aWind', new THREE.BufferAttribute(w, 1));
  return geo;
}

/** Build one template's geometry from its recipe at a detail level (0 = near). */
function buildTemplateGeometry(rec, lod, seed) {
  const parts = [];
  // ART.md §2.5, measured: about 92% of a mid-LOD tree is canopy blobs, and the
  // trunk - the thing the player actually reads - was SIXTEEN triangles.
  // IcosahedronGeometry detail 2 = 320 faces, detail 1 = 80, detail 0 = 20, so
  // the blob detail is the whole bill and the radial count is nearly free.
  // Radial goes DOWN at LOD0 (7 -> 6) and UP at LOD1 (4 -> 5) on purpose: 8
  // triangles per mid tree is what stops a trunk reading as a flat slab, and
  // the document is explicit that this saving is not to be spent elsewhere.
  const radial = lod === 0 ? 6 : 5;
  const detail = lod === 0 ? 1 : 0;
  const tH = rec.trunkH, tR = rec.trunkR;
  const [tx, , tz] = rec.top;

  // Trunk: two tapered segments so the lean is a curve, not a hinge.
  parts.push(segmentGeometry(0, 0, 0, tx * 0.45, tH * 0.5, tz * 0.45,
    tR, tR * 0.72, radial, rec.bark, 0.0, 0.06));
  parts.push(segmentGeometry(tx * 0.45, tH * 0.5, tz * 0.45, tx, tH, tz,
    tR * 0.72, tR * (rec.kind === 'snag' ? 0.10 : 0.40), Math.max(3, radial - 1), rec.bark, 0.06, 0.18));

  for (let i = 0; i < rec.branches.length; i++) {
    const br = rec.branches[i];
    if (lod > 0 && rec.kind !== 'snag' && (i & 1)) continue;   // half the twigs at LOD1
    const ay = tH * br.f;
    const ax = tx * br.f, az = tz * br.f;
    const bx = ax + Math.cos(br.ang) * br.reach;
    const by = ay + br.up * br.reach;
    const bz = az + Math.sin(br.ang) * br.reach;
    parts.push(segmentGeometry(ax, ay, az, bx, by, bz, br.r, br.r * 0.45,
      Math.max(3, radial - 2), rec.bark, 0.18, 0.50));
    if (rec.blobsOnBranch && br.f >= 0.5 && lod === 0) {
      // detail 0 (20 faces), not 1 (80). Measured: with these at detail 1 the
      // broad templates came out at 854 and 1038 triangles against ART.md
      // §2.5's "LOD0 <= 560 per template" gate, because the document's
      // arithmetic assumed a four-blob conifer and a broad carries six canopy
      // masses AND up to four of these. They are 0.8-1.6 m puffs on the end of a
      // branch and the nearest one is 10 m away; the canopy masses are what
      // carries the read, and they keep detail 1.
      // 0.52 -> 0.42 for the same reason as the crown masses: these hang at
      // branch height, which is exactly the band the top of the frame looks
      // through.
      parts.push(blobGeometry(bx, by, bz, br.reach * 0.42, 0, rec.leaf,
        0.86 + (i % 3) * 0.09, 0.70, 0.92, seed + i * 13));
    }
  }

  for (let i = 0; i < rec.canopy.length; i++) {
    const cn = rec.canopy[i];
    if (lod > 0 && rec.canopy.length > 3 && (i % 3) === 1) continue;   // thin the crown
    parts.push(blobGeometry(cn.x, cn.y, cn.z, cn.r, detail, rec.leaf,
      cn.tint, cn.wind, cn.squash, seed + i * 29));
  }

  const merged = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

// ---------------------------------------------------------------------------
// Grass alpha. A REAL texture, because an untextured dark quad with an
// alphaTest is an opaque black rectangle - PALEHOLLOW's bug, reproduced by the
// forest spike on this exact machine.
// ---------------------------------------------------------------------------
function makeGrassTexture() {
  const W = 64, H = 64;
  let tex;
  if (typeof document !== 'undefined' && document.createElement) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    // Six tapered blades, seeded so the texture is identical on every run.
    for (let b = 0; b < 6; b++) {
      const x0 = 6 + hashI(b, 3, 991) * (W - 12);
      const bend = (hashI(b, 7, 991) - 0.5) * 14;
      const wBase = 3 + hashI(b, 11, 991) * 3.5;
      const top = 6 + hashI(b, 13, 991) * 14;
      // NEUTRAL, deliberately. ART.md §0.5 rations saturation to the lamp, the
      // aviation red, the stack embers, the fen wisps and the eye glints -
      // "everything else is a value, not a colour" - and this blade was green
      // TWICE: once here (g x1.06, b x0.78) and once in PAL.grass
      // [0.128, 0.144, 0.096], multiplied together because the map's RGB IS the
      // diffuse term (vertexColors is false). tests/shots/fv-s23-B.png shows the
      // result: bright green splinters, the only saturated thing in a frame that
      // is otherwise one blue-grey. Neutral here costs ~2.8% of luminance
      // (0.2126 + 0.7152*1.06 + 0.0722*0.78 = 1.028) and hands the hue to
      // PAL.grass, which is the one place it should live.
      const v = 150 + hashI(b, 17, 991) * 90;
      g.fillStyle = 'rgb(' + (v | 0) + ',' + (v | 0) + ',' + (v | 0) + ')';
      g.beginPath();
      g.moveTo(x0 - wBase * 0.5, H);
      g.quadraticCurveTo(x0 - wBase * 0.25 + bend * 0.5, H * 0.5, x0 + bend, top);
      g.quadraticCurveTo(x0 + wBase * 0.25 + bend * 0.5, H * 0.5, x0 + wBase * 0.5, H);
      g.closePath();
      g.fill();
    }
    tex = new THREE.CanvasTexture(cv);
  } else {
    // Headless (a node import of this module). Same shape, no canvas.
    const data = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        const blade = Math.abs(((x + Math.sin(y * 0.09) * 5) % 11) - 5.5);
        const taper = 1 - y / H;
        const on = blade < 1.6 - taper * 1.0 ? 255 : 0;
        data[o] = 174; data[o + 1] = 174; data[o + 2] = 174; data[o + 3] = on;   // neutral, see above
      }
    }
    tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  }
  tex.name = 'curfew-grass-alpha';
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  // THE LAW: canvas-generated textures get NoColorSpace or sRGB decode crushes
  // dark albedo.
  //
  // This comment used to end "this one is a cutout mask, so the RGB is barely
  // used at all - the vertex colour carries the grass value." THAT WAS WRONG and
  // ART.md §2.1 names it: vertexColors is false on matGrass (correctly, to avoid
  // the PALEHOLLOW black-rectangle bug), so nothing else supplies a diffuse
  // term and this map's RGB - 0.59 to 0.94, read LINEAR - IS the albedo, in
  // series with the per-instance tint. A x16 on the tint and a 0.59-0.94 map
  // multiplied out to an effective albedo of ~1.4, i.e. grass that reflected
  // more light than fell on it. Both halves are now sized on purpose.
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Module scratch. Nothing below allocates inside step() or present().
// ---------------------------------------------------------------------------
const _treeBuf = new Float32Array(MAX_TREES_PER_CHUNK * TREE_STRIDE);
const _order = new Int32Array(MAX_TREES_PER_CHUNK);
const _orderList = [];
const _moonDir = new THREE.Vector3(0.4, 0.85, 0.3).normalize();
const _moonView = new THREE.Vector3();
const _tintCol = new THREE.Color();
const _camPos = new THREE.Vector3();

export class Flora {
  static id = 'flora';

  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.name = 'flora';
    this.group.matrixAutoUpdate = false;      // world-space instances, identity

    this.seed = (ctx && ctx.rng ? ctx.rng.fork('flora').seed : 1337) | 0;
    this.templates = [];
    this.chunks = new Map();     // chunkId -> record
    this.groups = new Map();     // "gx,gz" -> 2x2 record
    this.supers = new Map();     // "sx,sz" -> 4x4 record
    this._dirtyGroups = new Set();
    this._dirtySupers = new Set();
    this._grassQueue = [];
    this._densityLever = 1;
    this._treeCount = 0;
    this._mode = 'wait';         // wait -> events | self
    this._waited = 0;
    this._built = false;
    this._notes = [];

    const hy = CFG.flora.lodHysteresis;
    this.bandNear = new THREE.Vector2(NEAR_RING_M * (1 - hy), NEAR_RING_M * (1 + hy));
    // IMPOSTOR_FROM, not CFG.flora.impostorFrom: ART.md §2.5 moves it 180 -> 150
    // and config.js belongs to the integrator. One exported constant, read by
    // both materials, because the two dissolve bands must be identical.
    this.bandFar = new THREE.Vector2(IMPOSTOR_FROM * (1 - hy), IMPOSTOR_FROM * (1 + hy));

    // Shared wind clock. One object, read by every flora material, so the whole
    // forest gusts together instead of each species keeping its own time.
    this.wind = {
      uTime: { value: 0 },
      uWind: { value: CFG.flora.wind.gain },
      uGust: { value: 0 },
      uMoonView: { value: new THREE.Vector3(0, 0, 1) },
      uGlowColor: { value: new THREE.Vector3(0.42, 0.55, 0.86) },   // cold moon, linear
      uGlowAmt: { value: 0.55 },
      // The form term's strength, 0 = off. A UNIFORM and not a GLSL constant on
      // purpose: with six lanes landing edits into the same build, two runs ten
      // minutes apart are not a controlled A/B - the first attempt at this term
      // measured 1.482 and then 1.165 for the SAME shader, because the roads and
      // weapons lanes had landed in between. With this knob the before and the
      // after are two renders inside ONE rAF callback.
      uFormAmt: { value: 1 },
    };

    this.impostors = new ImpostorBank(ctx);

    // Bus first, construction second: the manifest builds chunks (7) before
    // flora (8), so if main.js constructs-and-inits in one pass the first
    // chunk:built can already have fired. init() also sweeps forEachResident.
    if (ctx && ctx.bus && ctx.bus.on) {
      ctx.bus.on('chunk:built', (p) => { if (p) this.buildChunk(p.cx, p.cz, p.id); });
      ctx.bus.on('chunk:disposed', (p) => { if (p) this.disposeChunk(p.id); });
    }
  }

  // -------------------------------------------------------------------------
  // boot
  // -------------------------------------------------------------------------
  async init() {
    this._ensureBuilt();
    // Catch chunks that already exist (init order, or a reload).
    const chunks = this._sys('chunks');
    if (chunks && typeof chunks.forEachResident === 'function') {
      chunks.forEachResident((a, b, c) => {
        // Tolerate either fn(record) or fn(id, cx, cz) - the chunks owner has
        // not published which, and guessing wrong would mean no forest.
        if (a && typeof a === 'object') this.buildChunk(a.cx, a.cz, a.id);
        else if (typeof a === 'string') this.buildChunk(b, c, a);
      });
      if (this.chunks.size) this._mode = 'events';
    }
  }

  /** Templates, materials and the impostor atlas. Idempotent, safe to call early */
  _ensureBuilt() {
    if (this._built) return;
    this._built = true;

    // --- templates -------------------------------------------------------
    // Built ONCE, here, not per chunk. GLIDE clones and transforms a fresh
    // geometry per placed tree; that is the 116 ms chunk stall.
    const rng = this.ctx && this.ctx.rng ? this.ctx.rng.fork('flora-templates') : null;
    let n = 0;
    const rand = rng ? () => rng.next() : () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; };
    for (let i = 0; i < TEMPLATE_COUNT; i++) {
      const rec = makeRecipe(rand, i % ARCHETYPES.length);
      const g0 = buildTemplateGeometry(rec, 0, this.seed + i * 131);
      const g1 = buildTemplateGeometry(rec, 1, this.seed + i * 131);
      const bb = g0.boundingBox;
      const halfWidth = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x), Math.abs(bb.min.z), Math.abs(bb.max.z));
      this.templates.push({
        kind: rec.kind, recipe: rec,
        lod0: g0, lod1: g1,
        trunkR: rec.trunkR, height: bb.max.y,
        halfWidth: Math.max(0.4, halfWidth),
        tris0: g0.attributes.position.count / 3,
      });
    }

    // --- materials -------------------------------------------------------
    this.matNear = this._makeTreeMaterial(0);
    this.matMid = this._makeTreeMaterial(1);
    this.grassTex = makeGrassTexture();
    this.matGrass = this._makeGrassMaterial();
    this.grassGeo = this._makeGrassGeometry();

    // --- impostor atlas ---------------------------------------------------
    const ok = this.impostors.bake(this.templates.map((t) => ({
      geometry: t.lod0, halfWidth: t.halfWidth, height: t.height,
    })));
    if (!ok) this._notes.push('impostor atlas not baked: ' + this.impostors.reason);

    if (this.ctx && this.ctx.scene) this.ctx.scene.add(this.group);
  }

  // -------------------------------------------------------------------------
  // materials
  // -------------------------------------------------------------------------
  _makeTreeMaterial(tier) {
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      fog: true,
      // Lambert, not Standard: a night forest gets nothing from a GGX lobe and
      // MeshStandard's fixed F0 makes dark bark read pale under the torch
      // (AGENTS.md, MARROW's lesson). It is also the cheaper program.
    });
    mat.name = tier === 0 ? 'curfew-tree-near' : 'curfew-tree-mid';

    const uni = {
      uTier: { value: tier },
      uBandNear: { value: this.bandNear },
      uBandFar: { value: this.bandFar },
    };
    mat.userData.floraUniforms = uni;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.wind.uTime;
      shader.uniforms.uWind = this.wind.uWind;
      shader.uniforms.uGust = this.wind.uGust;
      shader.uniforms.uMoonView = this.wind.uMoonView;
      shader.uniforms.uGlowColor = this.wind.uGlowColor;
      shader.uniforms.uGlowAmt = this.wind.uGlowAmt;
      shader.uniforms.uFormAmt = this.wind.uFormAmt;
      shader.uniforms.uTier = uni.uTier;
      shader.uniforms.uBandNear = uni.uBandNear;
      shader.uniforms.uBandFar = uni.uBandFar;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform float uTime;',
          'uniform float uWind;',
          'uniform float uGust;',
          'uniform float uTier;',
          'uniform vec2 uBandNear;',
          'uniform vec2 uBandFar;',
          'attribute float aWind;',
          'varying float vFWind;',
        ].join('\n')
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          'vFWind = aWind;',
          '{',
          // Instance world anchor. USE_INSTANCING guard is the v83 GLIDE fix -
          // v82 lacked it and the shadow/depth variant failed to link.
          '  vec3 ianc = vec3(0.0);',
          '  #ifdef USE_INSTANCING',
          '    ianc = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
          '  #else',
          '    ianc = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
          '  #endif',
          // --- LOD ownership. The SAME s and the SAME h as the other tier and
          // as impostors.js, so a tree is drawn exactly once.
          '  float dcam = length(cameraPosition.xz - ianc.xz);',
          '  float snear = smoothstep(uBandNear.x, uBandNear.y, dcam);',
          '  float sfar = smoothstep(uBandFar.x, uBandFar.y, dcam);',
          '  vec2 wq = mod(ianc.xz, 512.0);',
          '  float hnear = fract(sin(dot(wq, vec2(12.9898, 78.233))) * 43758.5453);',
          '  float hfar = fract(sin(dot(wq, vec2(41.317, 289.113))) * 43758.5453);',
          '  bool drop = (uTier < 0.5) ? (snear >= hnear) : (snear < hnear || sfar >= hfar);',
          '  if (drop) {',
          '    transformed = vec3(0.0);',              // zero-area triangle
          '  } else {',
          // --- wind. PEACHFUL flora.js:34-90 shape, GLIDE TreeFactory.js:36-45
          // amplitudes, weighted by the per-vertex aWind ramp.
          '    float amp = uWind * (1.0 + uGust * 2.2);',
          '    float ph = ianc.x * 0.14 + ianc.z * 0.17 + uTime * (1.5 + uGust * 2.0);',
          '    float sw = sin(ph) + 0.5 * sin(ph * 2.3 + 1.1);',
          '    transformed.x += sw * aWind * amp;',
          '    transformed.z += cos(ph * 0.85 + 0.6) * aWind * amp * 0.7;',
          '    transformed.y -= abs(sw) * aWind * amp * 0.15;',
          '  }',
          '}',
        ].join('\n')
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform vec3 uMoonView;',
          'uniform vec3 uGlowColor;',
          'uniform float uGlowAmt;',
          'uniform float uFormAmt;',
          'varying float vFWind;',
        ].join('\n')
      );

      // THE FORM TERM (see the note beside FORM_SHADOW). Injected immediately
      // before <lights_lambert_fragment>, which is the last point at which
      // diffuseColor is still the albedo and `normal` (view space) already
      // exists - <normal_fragment_begin> runs above it and the lighting chunk
      // below it copies diffuseColor into material.diffuseColor.
      //
      // This chunk exists exactly ONCE in the r161 bundle (verified in
      // vendor/three.module.min.js) and only in meshlambert_frag, so the
      // replace is a no-op on the MeshDepthMaterial that WebGLShadowMap builds
      // from this material's onBeforeCompile - the shadow pass is untouched and
      // cannot fail to link.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <lights_lambert_fragment>',
        [
          '{',
          '  vec3 nrm = normalize(normal);',
          '  vec3 mdir = normalize(uMoonView);',
          '  float ndm = dot(nrm, mdir);',
          '  float ndv = abs(dot(nrm, normalize(vViewPosition)));',
          '  float side = clamp(ndm * ' + FORM_RAMP.toFixed(3) + ' + ' + FORM_BIAS.toFixed(3) + ', 0.0, 1.0);',
          '  float form = mix(' + FORM_SHADOW.toFixed(3) + ', ' + FORM_LIT.toFixed(3) + ', side);',
          '  form *= mix(' + FORM_EDGE.toFixed(3) + ', 1.0, ndv);',
          '  diffuseColor.rgb *= mix(1.0, form, uFormAmt);',
          '}',
          '#include <lights_lambert_fragment>',
        ].join('\n')
      );

      // GLIDE's translucency (donors/forest/src/world/TreeFactory.js:50-63),
      // recoloured cold. Leaves light up when the moon is BEHIND them, weighted
      // by how leafy the vertex is. This is the whole "light through canopy"
      // read and it costs one pow.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        [
          '{',
          '  vec3 mlv = normalize(uMoonView);',
          '  vec3 vvv = normalize(vViewPosition);',
          '  float trans = pow(max(dot(-vvv, mlv), 0.0), 3.0);',
          '  float wrapT = max(0.0, dot(normal, mlv) * 0.5 + 0.5);',
          '  totalEmissiveRadiance += uGlowColor * (trans * 0.9 + wrapT * 0.12) * uGlowAmt * diffuseColor.rgb * vFWind;',
          '}',
          '#include <opaque_fragment>',
        ].join('\n')
      );
    };

    // MANDATORY (cinderbloom/src/engine/renderer.js:753-757). Both tiers get the
    // SAME key on purpose: the injected code is identical and only the uniform
    // values differ, so they SHOULD share one program - that is 1 program for
    // the near and mid rings instead of 2.
    mat.customProgramCacheKey = () => 'curfew-tree';
    return mat;
  }

  _makeGrassMaterial() {
    const mat = new THREE.MeshLambertMaterial({
      map: this.grassTex,
      // NOT vertexColors. The blade card is PlaneGeometry through mergeGeometries and carries
      // no `color` attribute, so USE_COLOR would make vColor multiply by the missing
      // attribute's default of (0,0,0) and every blade would render as a black silhouette —
      // the PALEHOLLOW grass bug, in the file written to avoid it. The per-blade tint rides on
      // instanceColor, and r161 sets USE_INSTANCING_COLOR independently of this flag, so the
      // colour still works with it off.
      vertexColors: false,
      alphaTest: CFG.flora.alphaTest,
      transparent: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    mat.name = 'curfew-grass';
    const uni = { uGrassR: { value: CFG.flora.grassRadius } };
    mat.userData.floraUniforms = uni;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.wind.uTime;
      shader.uniforms.uWind = this.wind.uWind;
      shader.uniforms.uGust = this.wind.uGust;
      shader.uniforms.uGrassR = uni.uGrassR;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform float uTime;',
          'uniform float uWind;',
          'uniform float uGust;',
          'uniform float uGrassR;',
        ].join('\n')
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          '{',
          '  vec3 ganc = vec3(0.0);',
          '  #ifdef USE_INSTANCING',
          '    ganc = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
          '  #endif',
          // The blade card is authored y in [0,1], so local y IS the tip weight.
          '  float gy = clamp(transformed.y, 0.0, 1.0);',
          '  float tip = gy * gy;',
          '  float ph = ganc.x * 0.31 + ganc.z * 0.27 + uTime * (2.2 + uGust * 2.4);',
          '  transformed.x += sin(ph) * tip * uWind * 0.55;',
          '  transformed.z += cos(ph * 0.8 + 1.1) * tip * uWind * 0.40;',
          // Shrink to zero area at the rim instead of fading through alpha:
          // a transparent grass ring is a sorting bill and a haze of grey.
          '  float dc = length(cameraPosition.xz - ganc.xz);',
          '  transformed *= 1.0 - smoothstep(uGrassR * 0.72, uGrassR, dc);',
          '}',
        ].join('\n')
      );
    };
    mat.customProgramCacheKey = () => 'curfew-grass';
    return mat;
  }

  /** One crossed-quad blade card, y in [0,1]. 8 triangles. */
  _makeGrassGeometry() {
    const a = new THREE.PlaneGeometry(1, 1, 1, 2);
    a.translate(0, 0.5, 0);
    const b = a.clone();
    b.rotateY(Math.PI / 2);
    const g = mergeGeometries([a, b], false);
    a.dispose(); b.dispose();
    g.computeBoundingSphere();
    return g;
  }

  // -------------------------------------------------------------------------
  // fields
  // -------------------------------------------------------------------------
  /**
   * Cover: 0 = clearing, 1 = a dense stand. A smoothstep of fbm rather than
   * raw fbm, so the county is mostly either forest or clearing and only
   * briefly in between - GLIDE squares its density for the same reason
   * (Forest.js:38-40, "squaring biases toward real clearings so the forest
   * breathes"). A linear field gives an even grey scatter with no stands.
   */
  coverAt(x, z) {
    const f = fbm2(x * 0.0055, z * 0.0055, this.seed + 5, 3);
    return smoothstep(0.15, 0.85, f);
  }

  // -------------------------------------------------------------------------
  // THE PLANTING LOOP
  // -------------------------------------------------------------------------
  /**
   * Plant one chunk. Public: the chunks system may call this directly instead
   * of (or as well as) emitting chunk:built - both paths are idempotent.
   * Returns the chunk record.
   */
  buildChunk(cx, cz, chunkId) {
    this._ensureBuilt();
    if (cx === undefined || cz === undefined) return null;
    const id = chunkId !== undefined && chunkId !== null ? String(chunkId) : this._selfId(cx, cz);
    if (this.chunks.has(id)) return this.chunks.get(id);
    if (this._mode !== 'events' && chunkId !== undefined && chunkId !== null) this._adoptEvents();

    const terrain = this._sys('terrain');
    const roads = this._sys('roads');
    const collision = this._sys('collision');
    if (!terrain || typeof terrain.heightAt !== 'function') {
      this._note('terrain has no heightAt: nothing planted for ' + id);
      return null;
    }
    const hasSlope = typeof terrain.slopeAt === 'function';
    const hasRoad = roads && typeof roads.roadDistance === 'function';
    const canCollide = collision && typeof collision.addCollider === 'function';
    if (!canCollide) this._note('collision.addCollider missing: trees are walk-through');
    // REQUEST FROM THE PLACES LANE, answered here (docs/HANDOFF.md, "REQUEST —
    // flora: call places.sightClear(x, z) in the planting loop"). TRUE means the
    // point stands in a corridor a horizon landmark is read down, so nothing
    // with a canopy may be planted on it. Read LAZILY, at use, once per chunk
    // build - places is manifest #10 and flora is #9, so a reference captured at
    // construction would be undefined for the whole boot ring. Grass does not
    // test it: a corridor has to be clear of anything TALL, not mown.
    const places = this._sys('places');
    const hasSight = places && typeof places.sightClear === 'function';

    const CH = CFG.world.CHUNK;
    const ox = cx * CH, oz = cz * CH;
    const cell = PLANT_CELL;
    const pFull = clamp01(CFG.flora.treeDensity * cell * cell);
    const exclude = CFG.roads.plantExclude.tree;

    // At most CFG.flora.nearTemplates species in any one 2x2 group, chosen by a
    // rank-sorted prefix of the whole bank. THIS is what caps the near ring's
    // draw calls at nearTemplates per chunk - a shader cull cannot do it,
    // because a submitted-but-empty InstancedMesh is still a draw call.
    const subset = this._groupTemplates(cx >> 1, cz >> 1, ox, oz);

    const gx0 = Math.floor(ox / cell), gx1 = Math.ceil((ox + CH) / cell);
    const gz0 = Math.floor(oz / cell), gz1 = Math.ceil((oz + CH) / cell);

    let n = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let gz = gz0; gz < gz1; gz++) {
      for (let gx = gx0; gx < gx1; gx++) {
        if (n >= MAX_TREES_PER_CHUNK - 2) break;
        const h1 = hashI(gx, gz, this.seed + 1);
        const h2 = hashI(gx, gz, this.seed + 2);
        const h3 = hashI(gx, gz, this.seed + 3);
        const wx = (gx + 0.10 + h1 * 0.80) * cell;
        const wz = (gz + 0.10 + h2 * 0.80) * cell;
        if (wx < ox || wz < oz || wx >= ox + CH || wz >= oz + CH) continue;

        const cover = this.coverAt(wx, wz);
        if (h3 > (0.06 + 0.94 * cover) * pFull) continue;
        // Roads are a field, not a mesh: excluded by distance, never by an
        // authored mask (DESIGN §2, CFG.roads.plantExclude).
        if (hasRoad && roads.roadDistance(wx, wz) < exclude) continue;
        if (hasSight && places.sightClear(wx, wz)) continue;
        if (hasSlope && terrain.slopeAt(wx, wz) > SLOPE_REJECT) continue;

        const wy = terrain.heightAt(wx, wz);
        const h4 = hashI(gx, gz, this.seed + 4);
        const h5 = hashI(gx, gz, this.seed + 5);
        const h6 = hashI(gx, gz, this.seed + 6);
        const ti = subset[(h4 * subset.length) | 0];
        const tpl = this.templates[ti];
        const scale = 0.72 + h5 * 0.72;
        const yaw = h6 * TAU;

        // ---- COLLIDER, RIGHT HERE, IN THE SAME PASS AS THE INSTANCE --------
        // Not after the loop, not behind a scale threshold, not opt-in.
        if (canCollide) {
          collision.addCollider({
            kind: 'circle', x: wx, z: wz,
            // Radius is the TRUNK, not the canopy. This used to add 0.22 m of padding on top
            // of the trunk radius, making a 0.4 m trunk a 0.62 m obstacle. At this planting
            // density that reliably produced gaps narrower than the 0.36 m player: a walk test
            // wedged permanently at 24 m, boxed in by three trunks with forward, left and right
            // all impassable and only backwards free. It is the same class as THE EATEN PATH's
            // law that a collider spanning the walkable band is an unrecoverable soft-lock.
            // Brushing past a trunk has to be possible, or the forest is a trap.
            r: tpl.trunkR * scale + 0.04, tag: 'tree',
          }, id);
        }

        const o = n * TREE_STRIDE;
        _treeBuf[o] = wx; _treeBuf[o + 1] = wy - 0.25; _treeBuf[o + 2] = wz;
        _treeBuf[o + 3] = scale; _treeBuf[o + 4] = yaw; _treeBuf[o + 5] = ti;
        // Per-tree value jitter, cool toward the clearings so the stands read
        // darker than the gaps and the forest has depth in the value channel.
        const v = 0.80 + hashI(gx, gz, this.seed + 7) * 0.42 - cover * 0.10;
        _treeBuf[o + 6] = v;
        _treeBuf[o + 7] = v * (0.98 + hashI(gx, gz, this.seed + 8) * 0.06);
        _treeBuf[o + 8] = v * (0.94 + hashI(gx, gz, this.seed + 9) * 0.08);
        _treeBuf[o + 9] = hashI(gx, gz, this.seed + 11);      // submission rank
        n++;

        const rr = tpl.halfWidth * scale, hh = tpl.height * scale;
        if (wx - rr < minX) minX = wx - rr;
        if (wx + rr > maxX) maxX = wx + rr;
        if (wz - rr < minZ) minZ = wz - rr;
        if (wz + rr > maxZ) maxZ = wz + rr;
        if (wy - 1 < minY) minY = wy - 1;
        if (wy + hh > maxY) maxY = wy + hh;
      }
    }

    // Rare landmark tree. GLIDE Forest.js:60-72 - a 12% chance per chunk of a
    // 2.2-3.2x elder. It is the scale anchor CINDERBLOOM's ART_DIRECTION asks
    // for ("a scale anchor within 25 m") and the thing that makes one stretch
    // of forest different from the next.
    if (n < MAX_TREES_PER_CHUNK - 1 && hashI(cx, cz, this.seed + 80) < GIANT_CHANCE) {
      const wx = ox + (0.25 + hashI(cx, cz, this.seed + 81) * 0.5) * CH;
      const wz = oz + (0.25 + hashI(cx, cz, this.seed + 82) * 0.5) * CH;
      const okRoad = !hasRoad || roads.roadDistance(wx, wz) > exclude + 3;
      const okSlope = !hasSlope || terrain.slopeAt(wx, wz) < 0.42;
      // A 2.2-3.2x elder is the worst possible thing to leave standing in a
      // sight corridor, so it takes the same test.
      const okSight = !hasSight || !places.sightClear(wx, wz);
      if (okRoad && okSlope && okSight) {
        const wy = terrain.heightAt(wx, wz);
        const ti = subset[(hashI(cx, cz, this.seed + 83) * subset.length) | 0];
        const tpl = this.templates[ti];
        const scale = 2.2 + hashI(cx, cz, this.seed + 84) * 1.0;
        if (canCollide) {
          collision.addCollider({
            kind: 'circle', x: wx, z: wz,
            r: tpl.trunkR * scale + 0.06, tag: 'tree',   // see the note on the near-ring collider above
          }, id);
        }
        const o = n * TREE_STRIDE;
        _treeBuf[o] = wx; _treeBuf[o + 1] = wy - 0.4; _treeBuf[o + 2] = wz;
        _treeBuf[o + 3] = scale; _treeBuf[o + 4] = hashI(cx, cz, this.seed + 85) * TAU;
        _treeBuf[o + 5] = ti;
        _treeBuf[o + 6] = 0.92; _treeBuf[o + 7] = 0.92; _treeBuf[o + 8] = 0.88;
        _treeBuf[o + 9] = 0;                       // a giant is never prefix-culled
        n++;
        const rr = tpl.halfWidth * scale, hh = tpl.height * scale;
        if (wx - rr < minX) minX = wx - rr;
        if (wx + rr > maxX) maxX = wx + rr;
        if (wz - rr < minZ) minZ = wz - rr;
        if (wz + rr > maxZ) maxZ = wz + rr;
        if (wy + hh > maxY) maxY = wy + hh;
      }
    }

    if (n === 0) {
      minX = ox; maxX = ox + CH; minZ = oz; maxZ = oz + CH; minY = 0; maxY = 1;
    }

    // ---- rank-sorted prefix submission -----------------------------------
    // Instances are sorted by a stable rank hash at BUILD time so the density
    // lever can submit a prefix and actually save vertex work. Culling in the
    // shader alone does not: a collapsed instance is still shaded
    // (cinderbloom/src/engine/context.js:206-214, ROUND 12).
    _orderList.length = 0;
    for (let i = 0; i < n; i++) _orderList.push(i);
    _orderList.sort((a, b) => _treeBuf[a * TREE_STRIDE + 9] - _treeBuf[b * TREE_STRIDE + 9]);
    for (let i = 0; i < n; i++) _order[i] = _orderList[i];

    const rec = this._pack(id, cx, cz, n, [minX, minY, minZ, maxX, maxY, maxZ]);
    this.chunks.set(id, rec);
    this._treeCount += n;

    const gk = this._key(cx >> 1, cz >> 1);
    const sk = this._key(cx >> 2, cz >> 2);
    rec.gkey = gk; rec.skey = sk;
    this._joinGroup(gk, cx >> 1, cz >> 1, id);
    this._joinSuper(sk, cx >> 2, cz >> 2, id);
    return rec;
  }

  /** Pack the scratch tree list into per-template matrix streams + card data. */
  _pack(id, cx, cz, n, bounds) {
    const counts = new Map();
    for (let i = 0; i < n; i++) {
      const ti = _treeBuf[_order[i] * TREE_STRIDE + 5] | 0;
      counts.set(ti, (counts.get(ti) || 0) + 1);
    }
    const streams = [];
    const cursor = new Map();
    for (const [ti, c] of counts) {
      const s = { ti, count: c, mat: new Float32Array(c * 16), tint: new Float32Array(c * 3) };
      streams.push(s);
      cursor.set(ti, 0);
    }
    const byTi = new Map();
    for (const s of streams) byTi.set(s.ti, s);

    const cards = {
      pos: new Float32Array(n * 3),
      size: new Float32Array(n * 2),
      yaw: new Float32Array(n),
      tpl: new Float32Array(n),
      tint: new Float32Array(n * 3),
    };

    for (let i = 0; i < n; i++) {
      const o = _order[i] * TREE_STRIDE;
      const x = _treeBuf[o], y = _treeBuf[o + 1], z = _treeBuf[o + 2];
      const sc = _treeBuf[o + 3], yaw = _treeBuf[o + 4], ti = _treeBuf[o + 5] | 0;
      const tr = _treeBuf[o + 6], tg = _treeBuf[o + 7], tb = _treeBuf[o + 8];
      const tpl = this.templates[ti];

      const s = byTi.get(ti);
      const k = cursor.get(ti);
      cursor.set(ti, k + 1);
      // Compose Y-rotation + uniform scale + translation straight into the
      // instance buffer. three's Matrix4 is column-major; going through an
      // Object3D dummy per tree would cost three matrix decompositions.
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      const m = s.mat, b = k * 16;
      m[b] = c * sc; m[b + 1] = 0; m[b + 2] = -sn * sc; m[b + 3] = 0;
      m[b + 4] = 0; m[b + 5] = sc; m[b + 6] = 0; m[b + 7] = 0;
      m[b + 8] = sn * sc; m[b + 9] = 0; m[b + 10] = c * sc; m[b + 11] = 0;
      m[b + 12] = x; m[b + 13] = y; m[b + 14] = z; m[b + 15] = 1;
      s.tint[k * 3] = tr; s.tint[k * 3 + 1] = tg; s.tint[k * 3 + 2] = tb;

      // Card anchor must be the tree's xz EXACTLY: the dissolve hash is a
      // function of position and the two shaders have to agree bit for bit.
      cards.pos[i * 3] = x; cards.pos[i * 3 + 1] = y; cards.pos[i * 3 + 2] = z;
      cards.size[i * 2] = tpl.halfWidth * sc;
      cards.size[i * 2 + 1] = tpl.height * sc;
      cards.yaw[i] = yaw;
      cards.tpl[i] = ti;
      cards.tint[i * 3] = tr; cards.tint[i * 3 + 1] = tg; cards.tint[i * 3 + 2] = tb;
    }

    return {
      id, cx, cz, trees: n, streams, cards, bounds,
      nearMeshes: null, grass: null, grassWanted: false,
      dMin: 0, dMax: 0,
    };
  }

  /**
   * The template prefix for a 2x2 chunk group. Ranked by a per-group hash,
   * biased by the region field when terrain publishes one, then cut to
   * CFG.flora.nearTemplates. Neighbouring groups share most of their prefix, so
   * a stand of pines does not stop dead at a chunk seam.
   */
  _groupTemplates(gx, gz, ox, oz) {
    const want = Math.max(1, Math.min(CFG.flora.nearTemplates | 0, this.templates.length));
    const terrain = this._sys('terrain');
    let regionId = -1;
    if (terrain && typeof terrain.regionAt === 'function') {
      const r = terrain.regionAt(ox + 32, oz + 32);
      if (r && typeof r.id === 'number') regionId = r.id;
      else if (typeof r === 'number') regionId = r;
    }
    const score = [];
    for (let i = 0; i < this.templates.length; i++) {
      // Two hashes at different scales: one per group, one over a 4x-coarser
      // grid, so species vary chunk to chunk but a species also persists over a
      // few hundred metres. That is what makes a "stand" instead of a mix.
      let s = hashI(gx, gz, this.seed + 40 + i) * 0.55
        + hashI(gx >> 2, gz >> 2, this.seed + 60 + i) * 0.45;
      const kind = this.templates[i].kind;
      // The Pines is 42% of the county: conifers get a thumb on the scale
      // unless the region field says otherwise.
      if (kind === 'conifer') s += 0.18;
      if (regionId >= 0) s += ((regionId * 7 + i * 13) % 5) * 0.03;
      score.push([s, i]);
    }
    score.sort((a, b) => b[0] - a[0]);
    const out = [];
    for (let i = 0; i < want; i++) out.push(score[i][1]);
    return out;
  }

  // -------------------------------------------------------------------------
  // residency
  // -------------------------------------------------------------------------
  disposeChunk(chunkId) {
    const id = String(chunkId);
    const rec = this.chunks.get(id);
    if (!rec) return;
    this._dropNear(rec);
    this._dropGrass(rec);
    this.chunks.delete(id);
    this._treeCount -= rec.trees;

    const g = this.groups.get(rec.gkey);
    if (g) {
      g.members.delete(id);
      if (g.members.size === 0) { this._releaseGroup(g); this.groups.delete(rec.gkey); }
      else { g.dirty = true; this._dirtyGroups.add(rec.gkey); }
    }
    const s = this.supers.get(rec.skey);
    if (s) {
      s.members.delete(id);
      if (s.members.size === 0) { this._releaseSuper(s); this.supers.delete(rec.skey); }
      else { s.dirty = true; this._dirtySupers.add(rec.skey); }
    }
    // The colliders go with the chunk: collision.removeChunk(id) is the chunks
    // owner's call, and it removes ours because we registered under their id.
  }

  _joinGroup(gk, gx, gz, id) {
    let g = this.groups.get(gk);
    if (!g) { g = { gx, gz, members: new Set(), meshes: null, dirty: true, bounds: null }; this.groups.set(gk, g); }
    g.members.add(id);
    g.dirty = true;
    this._dirtyGroups.add(gk);
  }

  _joinSuper(sk, sx, sz, id) {
    let s = this.supers.get(sk);
    if (!s) { s = { sx, sz, members: new Set(), mesh: null, dirty: true }; this.supers.set(sk, s); }
    s.members.add(id);
    s.dirty = true;
    this._dirtySupers.add(sk);
  }

  // -------------------------------------------------------------------------
  // step: tier assignment, materialisation, disposal
  // -------------------------------------------------------------------------
  step(dt) {
    this._ensureBuilt();

    if (this._mode === 'wait') {
      this._waited += dt;
      // 1.5 s and no chunk has ever been announced: either the chunks system is
      // not in the manifest yet or it does not talk to flora. Stream our own
      // ring rather than ship a forest-shaped hole. Self-owned chunk ids are
      // prefixed so they can never collide with the world's.
      if (this._waited > 1.5) {
        this._mode = 'self';
        this._note('no chunk:built in 1.5 s - flora is self-streaming its own ring');
      }
    }

    const cam = this.ctx && this.ctx.camera;
    if (cam) _camPos.copy(cam.position); else _camPos.set(0, 0, 0);

    if (this._mode === 'self') this._selfStream();

    const px = _camPos.x, pz = _camPos.z;
    const CH = CFG.world.CHUNK;
    const nearOut = this.bandNear.y;
    const farOut = this.bandFar.y;
    const shadowR = CFG.render.shadow.distance;
    const grassR = CFG.flora.grassRadius;
    let budget = BUILDS_PER_STEP;
    let grassBudget = GRASS_BUILDS_PER_STEP;

    // --- per chunk: near ring + grass -------------------------------------
    for (const rec of this.chunks.values()) {
      const cxm = rec.cx * CH, czm = rec.cz * CH;
      const dx = px < cxm ? cxm - px : (px > cxm + CH ? px - (cxm + CH) : 0);
      const dz = pz < czm ? czm - pz : (pz > czm + CH ? pz - (czm + CH) : 0);
      rec.dMin = Math.sqrt(dx * dx + dz * dz);
      const fx = Math.max(Math.abs(px - cxm), Math.abs(px - cxm - CH));
      const fz = Math.max(Math.abs(pz - czm), Math.abs(pz - czm - CH));
      rec.dMax = Math.sqrt(fx * fx + fz * fz);

      const wantNear = rec.dMin < nearOut;
      if (wantNear && !rec.nearMeshes && budget > 0) { this._buildNear(rec); budget--; }
      else if (!wantNear && rec.nearMeshes && rec.dMin > nearOut * 1.35) this._dropNear(rec);

      if (rec.nearMeshes) {
        const cast = rec.dMin < shadowR;
        for (const m of rec.nearMeshes) { m.visible = true; m.castShadow = cast; }
      }

      const wantGrass = rec.dMin < grassR;
      if (wantGrass && !rec.grass && grassBudget > 0) { this._buildGrass(rec); grassBudget--; }
      else if (rec.grass && rec.dMin > grassR * 1.6) this._dropGrass(rec);
    }

    // --- per 2x2 group: mid ring ------------------------------------------
    for (const [gk, g] of this.groups) {
      const gsz = CH * 2;
      const gxm = g.gx * gsz, gzm = g.gz * gsz;
      const dx = px < gxm ? gxm - px : (px > gxm + gsz ? px - (gxm + gsz) : 0);
      const dz = pz < gzm ? gzm - pz : (pz > gzm + gsz ? pz - (gzm + gsz) : 0);
      const dMin = Math.sqrt(dx * dx + dz * dz);
      const fx = Math.max(Math.abs(px - gxm), Math.abs(px - gxm - gsz));
      const fz = Math.max(Math.abs(pz - gzm), Math.abs(pz - gzm - gsz));
      const dMax = Math.sqrt(fx * fx + fz * fz);

      const want = dMin < farOut && dMax > this.bandNear.x;
      if (want && (!g.meshes || g.dirty) && budget > 0) { this._buildGroup(gk, g); budget--; }
      else if (!want && g.meshes && (dMin > farOut * 1.2 || dMax < this.bandNear.x * 0.8)) this._releaseGroup(g);
      if (g.meshes) for (const m of g.meshes) m.visible = true;
    }

    // --- per 4x4 group: far ring ------------------------------------------
    for (const [sk, s] of this.supers) {
      const ssz = CH * 4;
      const sxm = s.sx * ssz, szm = s.sz * ssz;
      const fx = Math.max(Math.abs(px - sxm), Math.abs(px - sxm - ssz));
      const fz = Math.max(Math.abs(pz - szm), Math.abs(pz - szm - ssz));
      const dMax = Math.sqrt(fx * fx + fz * fz);
      const want = dMax > this.bandFar.x;
      if (want && (!s.mesh || s.dirty) && budget > 0) { this._buildSuper(sk, s); budget--; }
      else if (!want && s.mesh) this._releaseSuper(s);
      if (s.mesh) s.mesh.visible = true;
    }
  }

  /**
   * Fallback residency. Only runs when nothing ever announced a chunk. Uses
   * flora-owned ids ("f:cx:cz") so removing them can never take a collider that
   * belongs to the world with it.
   */
  _selfStream() {
    const CH = CFG.world.CHUNK;
    const R = 5;                                   // 5 chunks = 320 m of forest
    const ccx = Math.floor(_camPos.x / CH), ccz = Math.floor(_camPos.z / CH);
    let built = 0;
    for (let dz = -R; dz <= R && built < 1; dz++) {
      for (let dx = -R; dx <= R && built < 1; dx++) {
        if (dx * dx + dz * dz > R * R) continue;
        const cx = ccx + dx, cz = ccz + dz;
        const id = this._selfId(cx, cz);
        if (this.chunks.has(id)) continue;
        if (this.buildChunk(cx, cz, id)) built++;
      }
    }
    if (built) return;
    const cutoff = (R + 2) * (R + 2);
    for (const rec of this.chunks.values()) {
      const dx = rec.cx - ccx, dz = rec.cz - ccz;
      if (dx * dx + dz * dz > cutoff) {
        const collision = this._sys('collision');
        if (collision && typeof collision.removeChunk === 'function') collision.removeChunk(rec.id);
        this.disposeChunk(rec.id);
        break;                                     // one retirement per step
      }
    }
  }

  _adoptEvents() {
    if (this._mode === 'events') return;
    if (this._mode === 'self') {
      // A real chunk showed up after all. Drop everything we streamed on our
      // own so the same trees cannot exist twice under two ids.
      const collision = this._sys('collision');
      for (const rec of Array.from(this.chunks.values())) {
        if (rec.id.charCodeAt(0) !== 102 /* 'f' */ || rec.id[1] !== ':') continue;
        if (collision && typeof collision.removeChunk === 'function') collision.removeChunk(rec.id);
        this.disposeChunk(rec.id);
      }
      this._note('chunks system took over; self-streamed flora discarded');
    }
    this._mode = 'events';
  }

  // -------------------------------------------------------------------------
  // materialisation
  // -------------------------------------------------------------------------
  _buildNear(rec) {
    if (rec.nearMeshes || !rec.trees) { rec.nearMeshes = rec.nearMeshes || []; return; }
    const out = [];
    for (const s of rec.streams) {
      const tpl = this.templates[s.ti];
      const mesh = new THREE.InstancedMesh(tpl.lod0, this.matNear, s.count);
      mesh.name = 'flora-near-' + rec.id + '-' + s.ti;
      mesh.instanceMatrix.array.set(s.mat);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(s.tint.slice(), 3);
      mesh.instanceColor.needsUpdate = true;
      // The near ring never prefix-culls: a tree you can touch has a collider,
      // and an invisible collider is worse than a visible cost.
      mesh.count = s.count;
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this._setBounds(mesh, rec.bounds);
      this.group.add(mesh);
      out.push(mesh);
    }
    rec.nearMeshes = out;
  }

  _dropNear(rec) {
    if (!rec.nearMeshes) return;
    for (const m of rec.nearMeshes) { this.group.remove(m); m.dispose(); }
    rec.nearMeshes = null;
  }

  _buildGroup(gk, g) {
    this._releaseGroup(g);
    // Union the members' streams per template. This is a typed-array copy, not
    // a geometry merge: 2x2 chunks of trees costs a memcpy, and GLIDE's
    // mergeGeometries per chunk is exactly the 116 ms stall we are avoiding.
    const totals = new Map();
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const id of g.members) {
      const rec = this.chunks.get(id);
      if (!rec) continue;
      for (const s of rec.streams) {
        const take = this._prefix(s.count);
        totals.set(s.ti, (totals.get(s.ti) || 0) + take);
      }
      const b = rec.bounds;
      if (b[0] < minX) minX = b[0]; if (b[1] < minY) minY = b[1]; if (b[2] < minZ) minZ = b[2];
      if (b[3] > maxX) maxX = b[3]; if (b[4] > maxY) maxY = b[4]; if (b[5] > maxZ) maxZ = b[5];
    }
    if (!totals.size) { g.dirty = false; this._dirtyGroups.delete(gk); return; }
    g.bounds = [minX, minY, minZ, maxX, maxY, maxZ];

    const bufs = new Map();
    for (const [ti, c] of totals) {
      bufs.set(ti, { mat: new Float32Array(c * 16), tint: new Float32Array(c * 3), n: 0 });
    }
    for (const id of g.members) {
      const rec = this.chunks.get(id);
      if (!rec) continue;
      for (const s of rec.streams) {
        const take = this._prefix(s.count);
        const dst = bufs.get(s.ti);
        dst.mat.set(s.mat.subarray(0, take * 16), dst.n * 16);
        dst.tint.set(s.tint.subarray(0, take * 3), dst.n * 3);
        dst.n += take;
      }
    }

    const meshes = [];
    for (const [ti, d] of bufs) {
      if (!d.n) continue;
      const tpl = this.templates[ti];
      const mesh = new THREE.InstancedMesh(tpl.lod1, this.matMid, d.n);
      mesh.name = 'flora-mid-' + gk + '-' + ti;
      mesh.instanceMatrix.array.set(d.mat);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor = new THREE.InstancedBufferAttribute(d.tint, 3);
      mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.receiveShadow = true;
      mesh.castShadow = false;         // nothing past 70 m casts (DESIGN §8)
      this._setBounds(mesh, g.bounds);
      this.group.add(mesh);
      meshes.push(mesh);
    }
    g.meshes = meshes;
    g.dirty = false;
    this._dirtyGroups.delete(gk);
  }

  _releaseGroup(g) {
    if (!g || !g.meshes) return;
    for (const m of g.meshes) { this.group.remove(m); m.dispose(); }
    g.meshes = null;
  }

  _buildSuper(sk, s) {
    this._releaseSuper(s);
    let total = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const id of s.members) {
      const rec = this.chunks.get(id);
      if (!rec) continue;
      total += this._prefix(rec.trees);
      const b = rec.bounds;
      if (b[0] < minX) minX = b[0]; if (b[1] < minY) minY = b[1]; if (b[2] < minZ) minZ = b[2];
      if (b[3] > maxX) maxX = b[3]; if (b[4] > maxY) maxY = b[4]; if (b[5] > maxZ) maxZ = b[5];
    }
    if (!total) { s.dirty = false; this._dirtySupers.delete(sk); return; }

    const pos = new Float32Array(total * 3);
    const size = new Float32Array(total * 2);
    const yaw = new Float32Array(total);
    const tpl = new Float32Array(total);
    const tint = new Float32Array(total * 3);
    let n = 0;
    for (const id of s.members) {
      const rec = this.chunks.get(id);
      if (!rec) continue;
      const take = this._prefix(rec.trees);
      pos.set(rec.cards.pos.subarray(0, take * 3), n * 3);
      size.set(rec.cards.size.subarray(0, take * 2), n * 2);
      yaw.set(rec.cards.yaw.subarray(0, take), n);
      tpl.set(rec.cards.tpl.subarray(0, take), n);
      tint.set(rec.cards.tint.subarray(0, take * 3), n * 3);
      n += take;
    }
    s.mesh = this.impostors.makeCardMesh(pos, size, yaw, tpl, tint, n,
      [minX, minY, minZ, maxX, maxY, maxZ]);
    if (s.mesh) this.group.add(s.mesh);
    s.dirty = false;
    this._dirtySupers.delete(sk);
  }

  _releaseSuper(s) {
    if (!s || !s.mesh) return;
    this.group.remove(s.mesh);
    this.impostors.releaseMesh(s.mesh);
    s.mesh = null;
  }

  _buildGrass(rec) {
    if (rec.grass) return;
    const terrain = this._sys('terrain');
    if (!terrain || typeof terrain.heightAt !== 'function') return;
    const roads = this._sys('roads');
    const hasRoad = roads && typeof roads.roadDistance === 'function';
    const exclude = CFG.roads.plantExclude.grass;
    const CH = CFG.world.CHUNK;
    const ox = rec.cx * CH, oz = rec.cz * CH;
    const cell = GRASS_CELL;
    const nx = Math.floor(CH / cell);

    const cap = nx * nx;
    const mat = new Float32Array(cap * 16);
    const tint = new Float32Array(cap * 3);
    let n = 0;
    for (let gz = 0; gz < nx; gz++) {
      for (let gx = 0; gx < nx; gx++) {
        const ix = rec.cx * nx + gx, iz = rec.cz * nx + gz;
        if (hashI(ix, iz, this.seed + 21) > GRASS_ACCEPT) continue;
        const wx = ox + (gx + hashI(ix, iz, this.seed + 22)) * cell;
        const wz = oz + (gz + hashI(ix, iz, this.seed + 23)) * cell;
        if (hasRoad && roads.roadDistance(wx, wz) < exclude) continue;
        const wy = terrain.heightAt(wx, wz);
        const yaw = hashI(ix, iz, this.seed + 24) * TAU;
        const w = 0.20 + hashI(ix, iz, this.seed + 25) * 0.16;
        const h = 0.30 + hashI(ix, iz, this.seed + 26) * 0.46;
        const c = Math.cos(yaw), sn = Math.sin(yaw);
        const b = n * 16;
        mat[b] = c * w; mat[b + 2] = -sn * w;
        mat[b + 5] = h;
        mat[b + 8] = sn * w; mat[b + 10] = c * w;
        mat[b + 12] = wx; mat[b + 13] = wy - 0.04; mat[b + 14] = wz; mat[b + 15] = 1;
        const v = 0.72 + hashI(ix, iz, this.seed + 27) * 0.56;
        // ART.md §2.1. This multiplier was 16, and that was a BUG, not a look.
        // PAL.grass is a linear albedo in the same family as the pines ground
        // ([0.096, 0.116, 0.08]); x16 made the instance colour 2.05, and
        // matGrass also carries grassTex, whose RGB is 0.59-0.94 and is read as
        // LINEAR (NoColorSpace, per the project law) and therefore IS the
        // diffuse term - vertexColors is false, so nothing else supplies one.
        // Effective albedo was ~1.4: the grass reflected 140% of the light that
        // hit it, which is why it measured mean 146.9 / p50 148.4 against a
        // ground of 39.4 and did not move at all between dusk and the black
        // hour (143.4 -> 146.1): at that albedo it is saturated in every
        // condition the game can produce. x1.6 puts the effective albedo at
        // ~0.14, i.e. ~1.45x the ground it grows out of, which is what grass is.
        tint[n * 3] = PAL.grass[0] * v * GRASS_TINT_MUL;
        tint[n * 3 + 1] = PAL.grass[1] * v * GRASS_TINT_MUL;
        tint[n * 3 + 2] = PAL.grass[2] * v * GRASS_TINT_MUL;
        n++;
      }
    }
    if (!n) { rec.grass = null; return; }

    const mesh = new THREE.InstancedMesh(this.grassGeo, this.matGrass, n);
    mesh.name = 'flora-grass-' + rec.id;
    mesh.instanceMatrix.array.set(mat.subarray(0, n * 16));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(tint.slice(0, n * 3), 3);
    mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    this._setBounds(mesh, [ox, rec.bounds[1], oz, ox + CH, rec.bounds[1] + 2, oz + CH]);
    this.group.add(mesh);
    rec.grass = mesh;
  }

  _dropGrass(rec) {
    if (!rec.grass) return;
    this.group.remove(rec.grass);
    rec.grass.dispose();
    rec.grass = null;
  }

  /** Prefix length under the density lever. Mid and far only - see _buildNear. */
  _prefix(count) {
    if (this._densityLever >= 1) return count;
    return Math.max(1, Math.round(count * clamp01(this._densityLever)));
  }

  _setBounds(mesh, b) {
    const g = mesh.geometry;
    // InstancedMesh frustum-culls on its own boundingSphere, computed from the
    // instance matrices. We know the answer already, and computeBoundingSphere
    // over thousands of instances every rebuild is not free.
    const cx = (b[0] + b[3]) * 0.5, cy = (b[1] + b[4]) * 0.5, cz = (b[2] + b[5]) * 0.5;
    const rx = b[3] - cx, ry = b[4] - cy, rz = b[5] - cz;
    if (!mesh.boundingSphere) mesh.boundingSphere = new THREE.Sphere();
    mesh.boundingSphere.center.set(cx, cy, cz);
    mesh.boundingSphere.radius = Math.sqrt(rx * rx + ry * ry + rz * rz);
    if (!mesh.boundingBox) mesh.boundingBox = new THREE.Box3();
    mesh.boundingBox.min.set(b[0], b[1], b[2]);
    mesh.boundingBox.max.set(b[3], b[4], b[5]);
    void g;
  }

  // -------------------------------------------------------------------------
  // present: wind clock and the moon, interpolated. No simulation here.
  // -------------------------------------------------------------------------
  present(alpha) {
    if (!this._built) return;
    const t = this.ctx && this.ctx.time
      ? this.ctx.time.t + (alpha || 0) * CFG.loop.FIXED
      : 0;
    this.wind.uTime.value = t;

    // Gusts from seeded value noise, not Math.random and not a raw sine: a pure
    // sine pulses the whole county in phase and reads as a machine.
    const g = noise1D(t, CFG.flora.wind.gustHz, 0x5EED)
      * 0.6 + noise1D(t, CFG.flora.wind.gustHz * 2.7, 0x5EEE) * 0.4;
    this.wind.uGust.value = clamp(g * 0.5 + 0.5, 0, 1) * 0.85;

    // Moonlight direction in VIEW space for the translucency term. gfx owns the
    // moon; read it lazily, every frame, never captured at construction.
    //
    // NEVER NORMALISE THE MOON'S WORLD POSITION. gfx/lights.js:631-632 writes
    //   moon.target.position = anchor
    //   moon.position        = anchor + dir * shadowDistance * 2
    // where `anchor` is the texel-quantised PLAYER position. normalize(position)
    // therefore equals the true moon direction only while the player is near the
    // world origin; at the Filling Station spawn (-520, 240) the anchor term
    // dominates and the vector swings round to point along the player's own world
    // bearing instead. The canopy translucency and the impostor tint then ROTATE
    // as you walk across the county - working, animated, and wrong on screen,
    // which is precisely the failure this project's legibility law names.
    // The direction is the moon MINUS ITS TARGET, the same expression gfx/sky.js
    // already uses to aim the dome's glow lobe at the moon.
    const lights = this._sys('lights');
    if (lights) {
      // Probe for a real accessor first, in case the gfx lane ships one later:
      // moonDir(out) -> Vector3, or a plain Vector3 property. Either is preferred
      // to reaching into the light object at all.
      const md = lights.moonDir;
      if (typeof md === 'function') {
        const got = md.call(lights, _moonDir);
        if (got && got.isVector3 && got !== _moonDir) _moonDir.copy(got);
        this._normMoonDir();
      } else if (md && md.isVector3) {
        _moonDir.copy(md);
        this._normMoonDir();
      } else if (lights.moon && lights.moon.position
                 && lights.moon.target && lights.moon.target.position) {
        _moonDir.copy(lights.moon.position).sub(lights.moon.target.position);
        this._normMoonDir();
      }
      if (lights.moon && lights.moon.color) {
        const i = clamp(lights.moon.intensity / Math.max(0.001, CFG.lights.moon.intensity), 0, 2);
        _tintCol.copy(lights.moon.color);
        this.impostors.setTint(0.55 + _tintCol.r * 0.45 * i, 0.55 + _tintCol.g * 0.45 * i, 0.55 + _tintCol.b * 0.45 * i);
      }
    }
    const cam = this.ctx && this.ctx.camera;
    if (cam) {
      _moonView.copy(_moonDir).transformDirection(cam.matrixWorldInverse);
      this.wind.uMoonView.value.copy(_moonView);
    }
  }

  // -------------------------------------------------------------------------
  // misc
  // -------------------------------------------------------------------------
  ready() { return this.templates.length > 0; }

  /** Governor knob: "tree ring density" (DESIGN §8 allows exactly four knobs). */
  setDensityLever(v) {
    const nv = clamp(v, 0.25, 1);
    if (nv === this._densityLever) return;
    this._densityLever = nv;
    for (const [gk, g] of this.groups) { g.dirty = true; this._dirtyGroups.add(gk); }
    for (const [sk, s] of this.supers) { s.dirty = true; this._dirtySupers.add(sk); }
  }

  stats() {
    let near = 0, mid = 0, far = 0, grass = 0;
    for (const rec of this.chunks.values()) {
      if (rec.nearMeshes) for (const m of rec.nearMeshes) if (m.visible) near++;
      if (rec.grass && rec.grass.visible) grass++;
    }
    for (const g of this.groups.values()) if (g.meshes) for (const m of g.meshes) if (m.visible) mid++;
    for (const s of this.supers.values()) if (s.mesh && s.mesh.visible) far++;
    return {
      trees: this._treeCount,
      chunks: this.chunks.size,
      templates: this.templates.length,
      draws: { near, mid, far, grass, total: near + mid + far + grass },
      impostors: this.impostors.baked,
      mode: this._mode,
      notes: this._notes.slice(),
    };
  }

  dispose() {
    for (const rec of this.chunks.values()) { this._dropNear(rec); this._dropGrass(rec); }
    for (const g of this.groups.values()) this._releaseGroup(g);
    for (const s of this.supers.values()) this._releaseSuper(s);
    this.chunks.clear(); this.groups.clear(); this.supers.clear();
    this._treeCount = 0;
    for (const t of this.templates) { t.lod0.dispose(); t.lod1.dispose(); }
    this.templates.length = 0;
    if (this.matNear) this.matNear.dispose();
    if (this.matMid) this.matMid.dispose();
    if (this.matGrass) this.matGrass.dispose();
    if (this.grassTex) this.grassTex.dispose();
    if (this.grassGeo) this.grassGeo.dispose();
    this.impostors.dispose();
    if (this.group.parent) this.group.parent.remove(this.group);
    this._built = false;
  }

  // helpers ------------------------------------------------------------------
  _sys(id) {
    // LAZY, at use, every time. VIGIL's combat.js captured ctx.systems.enemies
    // at construction, before enemies existed, and got undefined.
    const s = this.ctx && this.ctx.systems;
    return s && typeof s.get === 'function' ? s.get(id) : null;
  }

  /**
   * Normalise _moonDir in place, and only when it has length. A degenerate read
   * - the moon and its target coincident on a frame before lights has presented
   * - would otherwise write NaN into uMoonView and blank the whole canopy term;
   * keeping the previous frame's direction is always the better answer. No
   * allocation: _moonDir is module scratch.
   */
  _normMoonDir() {
    if (_moonDir.lengthSq() > 1e-8) _moonDir.normalize();
  }

  _key(a, b) { return a + ',' + b; }
  _selfId(cx, cz) { return 'f:' + cx + ':' + cz; }

  _note(msg) {
    if (this._notes.indexOf(msg) === -1) this._notes.push(msg);
  }
}

export default Flora;
