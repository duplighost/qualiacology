// CURFEW — how the things in the trees LOOK.
//
// There is no character art on this machine and no skinning pipeline, so this
// file is the whole answer to "will Alex believe it". Five rules govern every
// line below, and each of them is a mistake somebody already made:
//
//  1. RIGID-PART RIGS WITH REAL JOINTS. Block torso, shoulder caps, capsule
//     limbs, elbow and knee PIVOTS. Cylinder people were rejected outright.
//     donor: uninvited/src/npc.js:12-157 (figure(): stacked blocks, shoulder
//     caps, shoulder -> upper -> ELBOW -> forearm + hand, hip -> thigh ->
//     KNEE -> shin + foot)
//
//  2. THE SCARY-SILHOUETTE RECIPE. A lightless sculpted head CAVITY in a
//     near-black material, mirrored hood folds, a pointed brow, and a SHALLOW
//     mask so the sockets read as dark holes rather than burying themselves.
//     donor: secondhand-saint/src/characters.js:4446-4530 ('lightless hood
//     cavity', the two mirrored 'deep reliquary hood fold's, 'armoured pointed
//     hood brow', and the comment at :4501 explaining why the mask is shallow)
//
//  3. LAMBERT, NEVER MeshStandard, for cloth and flesh. Standard's fixed F0
//     specular makes dark cloth read PALE under a lamp; Lambert has no specular
//     term at all. Albedos live below the torch.
//     donor: fetch/src/outside.js:4450-4480 ('what was pale was never the
//     albedo ... the answer was to stop being glossy') plus the FOUR-VALUE law
//     at :4461-4467 — bodies differ by VALUE, not by hue.
//
//  4. ONE PROGRAM PER MATERIAL CLASS. Every shell material is built by the same
//     factory with the same onBeforeCompile and a constant customProgramCacheKey,
//     so forty-six bodies cost ONE program. CINDERBLOOM's 55-second compile was
//     per-enemy materials that differed textually.
//     donor: donors/dagger/src/enemies.js:13-36 ('All clones share one compiled
//     program (identical onBeforeCompile), so cloning per-enemy is cheap.')
//
//  5. THE REVEAL BUDGET. No body is fully lit closer than 6 m unless it is
//     committed to a strike. That is not a lighting note, it is a uniform:
//     uReveal multiplies the albedo, enemies.js drives it, and a body that
//     looks bad in full light therefore never stands in full light.
//
// Two programs total: a Lambert shell (vertexColors + the reveal/rim hooks) and
// ONE MeshBasic config shared by the eye glints, the contact shadow and the far
// impostor card. Everything is textually identical so the three share a program.
// castShadow is FALSE on every body on purpose — see the note by CONTACT_TEX.

import * as THREE from 'three';
import { TAU } from '../engine/math.js';
import { SPECIES, FORM } from './species.js';

/* ==========================================================================
   Palette. Values, not hues — a greyscale photograph is the only place this
   game's reads are allowed to live (FETCH). VOID is the head cavity: it must
   sit under everything else by a wide margin or the sockets stop being holes.
   ========================================================================== */
const VOID = 0x040406;      // the lightless cavity. Nothing may be darker.
const SEAM = 0x08090a;

/* Reveal budget, DESIGN section 4. Local consts: CFG has no enemies block yet
   and docs/HANDOFF.md carries the request. */
const REVEAL_NEAR = 6.0;    // metres: inside this a body is held back
const REVEAL_FAR = 11.0;    // metres: past this it is fully lit
const REVEAL_FLOOR = 0.34;  // albedo multiplier at point-blank, uncommitted
const RIM_GAIN = 0.055;     // how much cold edge light holds the silhouette
const RIM_TELEGRAPH = 2.0;  // x2 on the windup — THE TELEGRAPH LAW's emissive half

/* THE GLINT, and it is the one number in this file that was measured wrong.
   ART.md 0.4 asks that "the two eye glints are the only pixels on it above 150"
   and 5.2 gates them at ">= 6 px at 16 m". Measured 2026-09-02 with the reveal
   instrument (one hound, clear line of sight, torch off, buffer 1200x675):

     3 m: 0 px   6 m: 2 px, max 147.9   10 m: 1 px, max 143.9   16 m: 1 px, 142.7

   Two causes, and neither of them is the eye hex — species.js's ladder is right
   and ART 0.6 pins it.

   1. SIZE. The glint spheres were 34 mm across. At 16 m over a 675-row buffer at
      fov 68 one pixel is 32 mm, so a glint was ONE pixel wide and the rasterizer
      was as likely to miss it as hit it. ART asks for 6 px, which is a 2 px
      diameter, which is 64 mm at 16 m. GLINT_SCALE 1.45 takes the hound to
      52 mm; the rest of the read has to come from the second cause.
   2. THE BLOOM THRESHOLD. CFG.render.bloom.threshold is 1.05 and is one of the
      four untouchable numbers. Every eye hex in species.js has a peak channel of
      exactly 1.0 in the linear working space, so the one thing in the game built
      to be resolved at range sat 0.05 UNDER the line that would let it spread —
      which is why it measured 143 and not 200, and why it owned one pixel and
      not six. A glint is a true emissive: it is what that threshold exists to
      let through, and this is the same call weapons made for the reticle
      (viewmodel.js, Color(3.2, 0.92, 0.16), toneMapped false — ART 6.2 keeps it).
      EYE_EMISSIVE scales the MATERIAL, never the hex: every species' eye is
      multiplied by the same number, so every eye:bone ratio in the pinned ladder
      keeps its place in the order and only the whole rung moves.

   The two causes are not independent, and that is why 1.45 was not enough. At
   52 mm a glint projects to 1.6 px at 16 m; the rasterizer covers no pixel
   FULLY, so the one covered pixel is a blend of glint and the near-black body
   behind it, its luma lands back under the threshold, and it neither resolves
   nor spreads. Measured at GLINT_SCALE 1.45 with EYE_EMISSIVE 1.35: still 0-3 px
   at 16 m. 2.0 takes the glint to 68-72 mm, just over two pixels at 16 m, which
   is the first size at which one whole pixel is glint and nothing else. Bloom
   cannot rescue a sub-pixel emissive, only a covered one. */
const GLINT_SCALE = 2.0;

/* EYE_EMISSIVE is sized against the metric UnrealBloomPass actually uses, which
   is Rec.709 LUMA, not the peak channel. Every eye hex peaks at 1.0 in the red
   or blue channel but its LUMA is only 0.63-0.87, so a gain that merely cleared
   1.0 still left every glint under CFG.render.bloom.threshold 1.05 — measured,
   and it is why a first pass at 1.35 moved the glint count from 1 px to 3 px and
   no further. At 1.85 the luma of each eye is:

     hound 1.36   pallbearer 1.17   hunter 1.60   poacher 1.25   pale 1.61
     THE STANDING KIND 0.13

   The five monsters clear the threshold and bloom; the Standing Kind, whose eye
   hex species.js deliberately holds at 2.9x its own bone because "it is a PERSON
   and must not beacon", stays an order of magnitude under it and does not. The
   pinned ladder decides who glows, which is the whole point of pinning it. For
   scale, ART 6.2's reticle — the one above-1.0 emissive the document approves —
   sits at luma 1.35, exactly where the hound now is. */
const EYE_EMISSIVE = 1.85;

/* The hard ceiling on a per-instance shell tint. See buildBody(): the crowd
   spread is 0.78..1.14 and the palest body in the roster still lands well under
   the post-ART-1.1 sky at the top of it. Raising this without re-measuring
   body:backdrop is how a body walks up into the sky's value band. */
const TINT_CEIL = 1.14;

/* ==========================================================================
   THE TWO PROGRAMS
   ========================================================================== */

// A constant cache key so every shell material in the game links exactly once.
const SHELL_CACHE_KEY = 'curfew-body-shell-v1';

// GLSL. No backtick appears anywhere inside these template literals, not even
// in a comment (the project law). No identifier named flat, half or sat.
const SHELL_DECL = `#include <common>
uniform vec3 uRim;
uniform float uRimGain;
uniform float uReveal;`;

const SHELL_REVEAL = `#include <color_fragment>
diffuseColor.rgb *= uReveal;`;

// vNormal and vViewPosition are both real here: meshlambert_vert writes
// vViewPosition and lights_lambert_pars_fragment declares it (verified against
// vendor/three.module.min.js on 2026-09-02), and vNormal exists because these
// materials never set flatShading.
const SHELL_RIM = `#include <emissivemap_fragment>
float rimF = 1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
rimF = rimF * rimF * rimF;
totalEmissiveRadiance += uRim * rimF * uRimGain;`;

function shellCompile(shader) {
  const ud = this.userData;
  shader.uniforms.uRim = { value: ud.rim };
  shader.uniforms.uRimGain = { value: ud.rimGain };
  shader.uniforms.uReveal = { value: ud.reveal };
  ud.uniforms = shader.uniforms;          // the live handle: reveal is driven per frame
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', SHELL_DECL)
    .replace('#include <color_fragment>', SHELL_REVEAL)
    .replace('#include <emissivemap_fragment>', SHELL_RIM);
}

function shellCacheKey() { return SHELL_CACHE_KEY; }

/**
 * One shell material. Built per BODY (so tint and reveal are per body) but
 * textually identical to every other, so they all share one program.
 * `rim` is a cold edge colour, never the species' own hue: the rim exists to
 * separate a silhouette from the trees, not to make a neon toy.
 */
function makeShell(tintR, tintG, tintB) {
  const m = new THREE.MeshLambertMaterial({
    color: new THREE.Color(tintR, tintG, tintB),
    vertexColors: true,          // EVERY geometry fed to this MUST carry `color`
    emissive: 0x000000,
    fog: true,
  });
  // THE RIM COLOUR — ART.md 5.4, the one directive on hue in this section.
  // It used to be (0.62, 0.70, 0.86), which is the hemi sky (0x6b82ad) with the
  // saturation left in: the edge light that is supposed to LIFT a silhouette out
  // of the fill was the same blue as the fill, so it added value and no
  // information. (0.49, 0.755, 0.715) is a paler, greener cold at the same
  // luminance — Rec.709 Y 0.6958 against the old 0.6945, a 0.2% difference, so
  // this is a hue rotation and not a brightening. Blue still exceeds red, so the
  // rim stays cold; green now exceeds blue, so it is not the sky's hue.
  // RIM_GAIN stays 0.055 exactly as 5.4 requires.
  m.userData.rim = new THREE.Color(0.49, 0.755, 0.715);
  m.userData.rimGain = RIM_GAIN;
  m.userData.reveal = 1;
  m.onBeforeCompile = shellCompile;
  m.customProgramCacheKey = shellCacheKey;
  return m;
}

/** Write the reveal uniform, before or after the program has linked. */
function setReveal(mat, v) {
  mat.userData.reveal = v;
  const u = mat.userData.uniforms;
  if (u) u.uReveal.value = v;
}
function setRimGain(mat, v) {
  mat.userData.rimGain = v;
  const u = mat.userData.uniforms;
  if (u) u.uRimGain.value = v;
}

/* --- the single MeshBasic config: eyes, contact shadow, impostor card ------
   All three take a map, are transparent, do not write depth and are not tone
   mapped. Identical parameters means ONE program for all of them. Bodies do
   NOT cast shadows: a per-body shadow-depth variant is another program against
   CFG.render.budget.programsMax, and a painted contact disc reads as weight on
   the ground for one draw and no shader.

   THE PROGRAM BUDGET LIVES IN ONE PLACE (integrator decision 1, 2026-09-02):
   CFG.render.budget.programsMax. This file used to assert its own number in
   this comment and it disagreed with config, which is how a budget stops being
   a budget. No file in this lane states a program count again — the integrator
   measures the real one and sets it there. */
export function makeBasic(map, colour) {
  return new THREE.MeshBasicMaterial({
    map,
    color: colour === undefined ? 0xffffff : colour,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: true,
  });
}

/* ==========================================================================
   Canvas textures. THE LAW: NoColorSpace on every canvas-generated texture, or
   the sRGB decode crushes them (flora.js:438-441 states the same law).
   ========================================================================== */

let WHITE_TEX = null;
export function whiteTex() {
  if (WHITE_TEX) return WHITE_TEX;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  WHITE_TEX = t;
  return t;
}

let CONTACT_TEX = null;
function contactTex() {
  if (CONTACT_TEX) return CONTACT_TEX;
  const N = 64;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  // Opaque-ish core falling to nothing: the one part of a body the light
  // genuinely cannot reach. donor: fetch/src/outside.js:4481-4487 (contactMat)
  grad.addColorStop(0.0, 'rgba(255,255,255,0.80)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.34)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, N, N);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  CONTACT_TEX = t;
  return t;
}

/* --- impostor cards -------------------------------------------------------
   Past 40 m a body is one camera-facing card, so "a lot of enemies" costs one
   instanced draw per species instead of ten meshes each. The card is PAINTED,
   not baked from a render target: baking needs the renderer driven at boot and
   an atlas, and at 40 m through CFG.world.fog a painted silhouette with two
   glints is indistinguishable from one. Reduced on purpose; noted in HANDOFF. */
const IMPOSTOR_TEX = new Map();

/* How much of its authored value the painted card keeps, now that the card is
   painted in the right space at all — see linearByte() below. Measured 2026-09-02
   with the reveal instrument sampling either side of the 40 m LOD line, which is
   the measurement the previous comment here said it was waiting for. */
const CARD_VALUE = 1.00;

/* The impostor material's colour, and it is a CARRIER, not a brightness. An
   8-bit texture cannot hold a 0.006 body and a 1.35 glint at once in the linear
   space this sampler reads; multiplying the whole card by CARD_MUL and dividing
   every painted byte by it buys back the range. It is EYE_EMISSIVE exactly, so a
   card's glint and a rig's glint are the same emissive and neither steps at the
   LOD line. */
const CARD_MUL = EYE_EMISSIVE;

function srgbToLinear(u) {
  return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
}

/** Rec.709 relative luminance of an authored sRGB hex, in the linear space the
    renderer actually works in. species.js quotes its ladder in exactly this
    unit, so this is the one function that can ask "how high up the ladder is
    this species" without re-deriving the ladder. */
function clothLuma(hex) {
  return 0.2126 * srgbToLinear(((hex >> 16) & 255) / 255)
    + 0.7152 * srgbToLinear(((hex >> 8) & 255) / 255)
    + 0.0722 * srgbToLinear((hex & 255) / 255);
}

/**
 * Paint one authored hex as the LINEAR value the sampler will actually read.
 *
 * THE BUG THIS FIXES, measured 2026-09-02 and it is the largest single error in
 * this file. Canvas textures carry NoColorSpace by project law (flora.js:438-441
 * says the same), which means the eight-bit bytes are handed to the shader as
 * LINEAR. The card was painted with the authored sRGB bytes. So a hound's coat,
 * authored at 0x121110 = linear 0.0056, was drawn as byte 13 and read back as
 * linear 0.048 — EIGHT AND A HALF TIMES its own albedo. Every species:
 *
 *   hound x8.6   pallbearer x7.7   hunter x8.9   poacher x7.7   standing x8.1
 *   pale x2.1  (the Pale is pale enough that the gamma error is smaller)
 *
 * Measured on screen, torch off, the same clear line of sight: a hound's rig at
 * 24 m had body mean 16.2 against its backdrop; its card at 40 m had body mean
 * 33.1. A BODY GOT TWICE AS BRIGHT AS IT WALKED AWAY, and pallbearer, poacher
 * and hunter got 3.7-4.9x brighter. That is precisely the inversion CARD_VALUE
 * was introduced to prevent, arriving through a colour space instead of through
 * a lighting model, and no value of CARD_VALUE could ever have fixed it because
 * the error is a gamma curve, not a scalar.
 *
 * @param hex authored sRGB hex, straight off species.js
 * @param k   a multiplier applied in LINEAR space (CARD_VALUE, or a glint gain)
 */
function linearByte(hex, k) {
  const ch = (shift) => {
    const lin = srgbToLinear(((hex >> shift) & 255) / 255) * k / CARD_MUL;
    return Math.max(0, Math.min(255, Math.round(lin * 255)));
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

function impostorTexture(key) {
  const cached = IMPOSTOR_TEX.get(key);
  if (cached) return cached;
  const def = SPECIES[key];
  const W = 96, H = 192;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  // The card is drawn UNLIT (MeshBasic, toneMapped false), while the rig two
  // metres nearer is a tone-mapped Lambert standing in moonlight. Every byte
  // written into this canvas is read back as LINEAR (NoColorSpace, below), so
  // linearByte() is the only correct way to put an authored sRGB hex on it —
  // see its comment for the 8.6x error this replaces. The glints are painted at
  // EYE_EMISSIVE, exactly what the rig's glint material carries, so nothing
  // steps at the LOD line: at 40-90 m the glints are the whole read.
  const body = '#' + ('000000' + linearByte(def.cloth, CARD_VALUE).toString(16)).slice(-6);
  g.fillStyle = body;
  g.strokeStyle = body;
  g.lineJoin = 'round';
  g.lineCap = 'round';

  const px = (u) => u * W;
  const py = (v) => (1 - v) * H;   // v = 0 at the feet, 1 at the crown

  if (def.form === FORM.QUADRUPED) {
    // long low body, dropped head, four legs
    g.lineWidth = W * 0.16;
    g.beginPath();
    g.moveTo(px(0.16), py(0.62)); g.lineTo(px(0.74), py(0.70));
    g.stroke();
    g.lineWidth = W * 0.09;
    g.beginPath();
    g.moveTo(px(0.74), py(0.70)); g.lineTo(px(0.90), py(0.52));   // jaw
    g.moveTo(px(0.16), py(0.62)); g.lineTo(px(0.03), py(0.80));   // tail
    g.moveTo(px(0.28), py(0.58)); g.lineTo(px(0.26), py(0.02));
    g.moveTo(px(0.38), py(0.58)); g.lineTo(px(0.42), py(0.02));
    g.moveTo(px(0.62), py(0.64)); g.lineTo(px(0.60), py(0.02));
    g.moveTo(px(0.70), py(0.64)); g.lineTo(px(0.76), py(0.02));
    g.stroke();
  } else if (def.form === FORM.SHROUD) {
    // a bell of cloth with a head on top and no legs at all
    g.beginPath();
    g.moveTo(px(0.50), py(0.98));
    g.lineTo(px(0.70), py(0.62));
    g.lineTo(px(0.84), py(0.02));
    g.lineTo(px(0.16), py(0.02));
    g.lineTo(px(0.30), py(0.62));
    g.closePath();
    g.fill();
    // The shroud had NO head on its card, so its two glints were painted onto
    // transparent canvas above the bell's apex and floated free of it. The rig
    // has a hooded head at 1.76 of 2.05 m; the card gets one too.
    g.beginPath();
    g.arc(px(0.50), py(0.930), W * 0.088, 0, TAU);
    g.fill();
  } else {
    // an upright person: head, shoulders, taper, two legs
    const shoulder = def.form === FORM.GAUNT ? 0.86 : 0.84;
    g.beginPath();
    g.arc(px(0.50), py(0.945), W * 0.10, 0, TAU);
    g.fill();
    g.lineWidth = W * 0.055;
    g.beginPath();
    g.moveTo(px(0.50), py(0.895)); g.lineTo(px(0.50), py(0.50));
    g.stroke();
    g.lineWidth = W * 0.20;
    g.beginPath();
    g.moveTo(px(0.50), py(shoulder)); g.lineTo(px(0.50), py(0.52));
    g.stroke();
    g.lineWidth = def.form === FORM.GAUNT ? W * 0.055 : W * 0.075;
    g.beginPath();
    // gaunt arms hang far too long; everyone else's stop at the hip
    const armEnd = def.form === FORM.GAUNT ? 0.16 : 0.40;
    g.moveTo(px(0.40), py(shoulder - 0.02)); g.lineTo(px(0.31), py(armEnd));
    g.moveTo(px(0.60), py(shoulder - 0.02)); g.lineTo(px(0.69), py(armEnd));
    g.moveTo(px(0.44), py(0.52)); g.lineTo(px(0.41), py(0.02));
    g.moveTo(px(0.56), py(0.52)); g.lineTo(px(0.59), py(0.02));
    g.stroke();
  }

  // THE CAVITY. sculptHead() builds every rig head around a lightless VOID
  // ovoid with two sockets sunk into it, and the card had no equivalent: it
  // painted a SOLID disc of cloth exactly where the rig has a hole. Measured at
  // 40 m, torch off, the same line of sight: a hunter's card read 0.851 of its
  // backdrop where the rig it takes over from read 0.444. A card cannot be made
  // darker than one byte of an eight-bit texture, so the value has to come from
  // the shape — which is what it is on the rig too.
  const cavity = '#' + ('000000' + linearByte(VOID, 1).toString(16)).slice(-6);
  g.fillStyle = cavity;
  g.beginPath();
  if (def.form === FORM.QUADRUPED) g.ellipse(px(0.84), py(0.60), W * 0.070, W * 0.052, 0, 0, TAU);
  else g.ellipse(px(0.50), py(0.945), W * 0.068, W * 0.082, 0, 0, TAU);
  g.fill();

  // THE GLINTS. They are the only thing on the card that is not the body, and
  // they are why a shape at 60 m reads as ALIVE — the art note's whole point is
  // that the player resolves these BEFORE the silhouette.
  //
  // They are painted twice. The 2.1 px dot at W * 0.022 was the entire glint,
  // and this texture mips down to 12 x 24 for a card that is a few pixels tall
  // at 80 m: at that level a 2 px dot is averaged into the body it sits on and
  // the read is gone precisely at the range it was built for. So: a soft halo
  // first, at a third value, wide enough to survive two mip levels, and the
  // hard core on top of it. The core stays small so the near read is a point of
  // light and not a headlamp.
  const eyeHex = '#' + ('000000' + linearByte(def.eye, EYE_EMISSIVE).toString(16)).slice(-6);
  const haloHex = '#' + ('000000' + linearByte(def.eye, EYE_EMISSIVE * 0.34).toString(16)).slice(-6);
  const ey = def.form === FORM.QUADRUPED ? 0.60 : 0.945;
  const ex = def.form === FORM.QUADRUPED ? 0.84 : 0.50;
  const sp = def.form === FORM.QUADRUPED ? 0.03 : 0.045;
  g.fillStyle = haloHex;
  g.beginPath(); g.arc(px(ex - sp), py(ey), W * 0.058, 0, TAU); g.fill();
  g.beginPath(); g.arc(px(ex + sp), py(ey), W * 0.058, 0, TAU); g.fill();
  g.fillStyle = eyeHex;
  g.beginPath(); g.arc(px(ex - sp), py(ey), W * 0.026, 0, TAU); g.fill();
  g.beginPath(); g.arc(px(ex + sp), py(ey), W * 0.026, 0, TAU); g.fill();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  IMPOSTOR_TEX.set(key, t);
  return t;
}

/* ==========================================================================
   Weld — merge a pile of primitives into ONE geometry with a baked colour
   attribute. This is what makes a 14-part body ONE draw call, and the colour
   attribute is what lets a single shared shell material carry bone, cloth and
   the lightless cavity at once.

   Boot-time only. It allocates freely and then never runs again: the geometry
   set is cached per species and every pooled instance of that species points at
   the same buffers.
   ========================================================================== */

const _wm = new THREE.Matrix4();
const _we = new THREE.Euler();
const _wq = new THREE.Quaternion();
const _wp = new THREE.Vector3();
const _ws = new THREE.Vector3();
const _wc = new THREE.Color();

class Weld {
  constructor() { this.pos = []; this.nrm = []; this.col = []; this.uv = []; }

  /**
   * @param geo   a primitive BufferGeometry (never retained)
   * @param x,y,z position
   * @param colour hex
   * @param opt   { rx, ry, rz, sx, sy, sz }
   */
  add(geo, x, y, z, colour, opt) {
    const o = opt || EMPTY;
    _wp.set(x, y, z);
    _we.set(o.rx || 0, o.ry || 0, o.rz || 0);
    _wq.setFromEuler(_we);
    _ws.set(o.sx === undefined ? 1 : o.sx, o.sy === undefined ? 1 : o.sy, o.sz === undefined ? 1 : o.sz);
    _wm.compose(_wp, _wq, _ws);
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(_wm);            // three transforms normals by the normal matrix too
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    // uv is carried through even though nothing here samples a map: the eye
    // glints share a MeshBasic config that DOES declare one, and a program that
    // references an attribute the geometry does not have is exactly the kind of
    // fragility nobody would ever find again.
    const uv = g.attributes.uv ? g.attributes.uv.array : null;
    _wc.setHex(colour);
    for (let i = 0, j = 0; i < p.length; i += 3, j += 2) {
      this.pos.push(p[i], p[i + 1], p[i + 2]);
      this.nrm.push(n[i], n[i + 1], n[i + 2]);
      this.col.push(_wc.r, _wc.g, _wc.b);
      this.uv.push(uv ? uv[j] : 0.5, uv ? uv[j + 1] : 0.5);
    }
    g.dispose();
    return this;
  }

  /** Never returns a geometry without a colour attribute — the PALEHOLLOW
      black-rectangle bug is exactly a vertexColors material fed geometry with
      no `color`, and it has already cost this project a round. */
  geometry(name) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    g.name = name;
    return g;
  }
  get empty() { return this.pos.length === 0; }
}
const EMPTY = {};

/* Shared primitives, built once. Low segment counts: a body is ~500 triangles
   and there may be 24 of them. */
const P = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(0.5, 10, 8),
  sphLo: new THREE.SphereGeometry(0.5, 8, 6),
  cap: new THREE.CapsuleGeometry(0.5, 1, 3, 7),
  cone: new THREE.ConeGeometry(0.5, 1, 7),
  cone3: new THREE.ConeGeometry(0.5, 1, 3),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 7),
};

/* ==========================================================================
   THE HEAD. Rule 2, and the single thing Alex will react to.
   ========================================================================== */

/**
 * Sculpt a head into a Weld at local (0, y, 0), facing -Z.
 * @param w      the Weld
 * @param y      crown-of-neck height
 * @param s      scale
 * @param spec   { cavity, hood, brow, mask, bone, cloth }
 *
 * The order matters: a lightless CAVITY first, mirrored hood folds around it,
 * a pointed brow above, and only then a SHALLOW mask in front. The mask being
 * shallow is the whole trick — a deep one buries its own sockets and the head
 * collapses to a pale teardrop at gameplay distance.
 * donor: secondhand-saint/src/characters.js:4446-4530
 */
function sculptHead(w, y, s, spec) {
  const bone = spec.bone;
  const cloth = spec.cloth;

  // 1. the lightless cavity: a tall ovoid of VOID, set slightly back
  w.add(P.sph, 0, y, 0.012 * s, VOID, {
    sx: 0.270 * s, sy: 0.320 * s, sz: 0.245 * s,
  });

  // 2. mirrored hood folds, angled forward so they frame the cavity
  if (spec.hood) {
    for (const side of [-1, 1]) {
      w.add(P.cone3, side * 0.115 * s, y + 0.030 * s, 0.020 * s, cloth, {
        rx: 0.24, ry: side * 0.30, rz: side * 0.16,
        sx: 0.185 * s, sy: 0.420 * s, sz: 0.230 * s,
      });
    }
    // rear cowl: the hood has a BACK, which is what stops it reading as a cone
    w.add(P.sph, 0, y - 0.020 * s, 0.090 * s, cloth, {
      sx: 0.300 * s, sy: 0.330 * s, sz: 0.240 * s,
    });
  }

  // 3. the pointed brow, proud and above: the one hard edge on the head
  if (spec.brow) {
    w.add(P.cone3, 0, y + 0.115 * s, -0.045 * s, bone, {
      rx: 1.28, rz: Math.PI,
      sx: 0.235 * s, sy: 0.135 * s, sz: 0.150 * s,
    });
  }

  // 4. the SHALLOW mask. Depth 0.05, not 0.20.
  if (spec.mask) {
    w.add(P.sph, 0, y - 0.005 * s, -0.105 * s, bone, {
      sx: 0.185 * s, sy: 0.265 * s, sz: 0.055 * s,
    });
    // a nasal void and a mouth cleft, both in VOID, so the mask has holes
    w.add(P.cone3, 0, y - 0.055 * s, -0.133 * s, VOID, {
      rx: -1.57, sx: 0.048 * s, sy: 0.030 * s, sz: 0.070 * s,
    });
    w.add(P.box, 0, y - 0.115 * s, -0.130 * s, VOID, {
      sx: 0.100 * s, sy: 0.020 * s, sz: 0.020 * s,
    });
  } else if (spec.face) {
    // an ORDINARY head — the Standing Kind and the poacher are PEOPLE
    w.add(P.sph, 0, y, -0.030 * s, spec.skin || bone, {
      sx: 0.235 * s, sy: 0.285 * s, sz: 0.235 * s,
    });
    if (spec.cap) {
      w.add(P.cyl, 0, y + 0.120 * s, -0.010 * s, cloth, {
        sx: 0.270 * s, sy: 0.090 * s, sz: 0.270 * s,
      });
      w.add(P.cyl, 0, y + 0.082 * s, -0.075 * s, cloth, {
        sx: 0.330 * s, sy: 0.026 * s, sz: 0.330 * s,
      });
    }
  } else if (spec.smooth) {
    // THE PALE: porcelain, and the face is simply not there
    w.add(P.sph, 0, y, -0.015 * s, bone, {
      sx: 0.250 * s, sy: 0.300 * s, sz: 0.240 * s,
    });
  }

  // 5. the sockets. VOID, sunk INTO the front, so the eye glints have holes to
  //    sit in. Without these the glints float on a face and read as jewellery.
  const sockZ = spec.mask ? -0.135 : (spec.smooth || spec.face ? -0.150 : -0.115);
  for (const side of [-1, 1]) {
    w.add(P.sphLo, side * 0.062 * s, y + 0.030 * s, sockZ * s, VOID, {
      sx: 0.090 * s, sy: 0.070 * s, sz: 0.045 * s,
    });
  }
  return sockZ;
}

/* Eye glints: their own tiny mesh on the shared MeshBasic program, proud of the
   sockets so they catch a light in full dark. Two spheres, ~40 triangles. */
function eyeGeometry(y, s, sockZ, spread) {
  const w = new Weld();
  const G = GLINT_SCALE;
  for (const side of [-1, 1]) {
    w.add(P.sphLo, side * spread * s, y + 0.030 * s, (sockZ - 0.028) * s, 0xffffff, {
      sx: 0.034 * G * s, sy: 0.030 * G * s, sz: 0.024 * G * s,
    });
  }
  return w.geometry('eyes');
}

/* ==========================================================================
   Limb kit. A limb is authored hanging DOWN from its own pivot at the origin,
   so the pivot Group can rotate it like a joint. Upper and fore are separate
   geometries because the elbow is between them, and the elbow is what makes a
   pose read as human instead of an oar swinging from a shoulder.
   donor: uninvited/src/npc.js:85-121
   ========================================================================== */

function limbGeo(len, rTop, rBot, colour, endGeo) {
  const w = new Weld();
  w.add(P.cap, 0, -len * 0.5, 0, colour, {
    sx: rTop * 2, sy: len * 0.62, sz: rTop * 2,
  });
  if (endGeo) {
    w.add(P.sphLo, 0, -len - rBot * 0.4, endGeo.z || 0, endGeo.colour, {
      sx: rBot * 2.0, sy: rBot * 2.4, sz: rBot * 2.2,
    });
  }
  return w.geometry('limb');
}

function footGeo(len, colour, toe) {
  const w = new Weld();
  w.add(P.cap, 0, -len * 0.5, 0, colour, { sx: 0.115, sy: len * 0.60, sz: 0.115 });
  w.add(P.box, 0, -len - 0.028, -0.045, toe, { sx: 0.105, sy: 0.058, sz: 0.220 });
  return w.geometry('shin');
}

/* ==========================================================================
   The six builds. Each returns a GEOMETRY SET, cached per species; instances
   share the buffers and differ only by material tint and group scale.
   ========================================================================== */

const GEO_CACHE = new Map();

function geoSetFor(key) {
  const cached = GEO_CACHE.get(key);
  if (cached) return cached;
  const def = SPECIES[key];
  let set;
  switch (def.form) {
    case FORM.QUADRUPED: set = buildHound(def); break;
    case FORM.SHROUD: set = buildPallbearer(def); break;
    case FORM.GAUNT: set = buildHunter(def); break;
    case FORM.HUMAN: set = buildPoacher(def); break;
    case FORM.PORCELAIN: set = buildPale(def); break;
    default: set = buildStanding(def); break;
  }
  set.key = key;
  GEO_CACHE.set(key, set);
  return set;
}

/* ------------------------------------------------------------------ HOUND --
   1.10 m, ribs, a long jaw. Four legs, no elbows — a quadruped's leg is one
   swinging line and pretending otherwise costs draws for nothing. The spine
   bloom is a shootable weak zone and it is the telegraph surface. */
function buildHound(def) {
  const s = def.height / 1.10;
  const w = new Weld();
  const cloth = def.cloth, skin = def.skin, bone = def.bone;
  const backY = 0.66 * s;

  // barrel chest tapering to the hips: a WEDGE, not a tube
  w.add(P.box, 0, backY, -0.16 * s, cloth, { sx: 0.42 * s, sy: 0.40 * s, sz: 0.52 * s });
  w.add(P.box, 0, backY - 0.02 * s, 0.30 * s, cloth, { sx: 0.33 * s, sy: 0.32 * s, sz: 0.48 * s });
  // ribs: four shallow bands so the flank has an edge to catch a torch
  for (let i = 0; i < 4; i++) {
    w.add(P.box, 0, backY - 0.02 * s, (-0.30 + i * 0.15) * s, bone,
      { sx: 0.435 * s, sy: 0.24 * s, sz: 0.028 * s });
  }
  // the spine bloom — a raised dorsal ridge. Shootable ('vent'), and it is the
  // part that brightens on the windup.
  w.add(P.box, 0, backY + 0.21 * s, 0.02 * s, bone, { sx: 0.075 * s, sy: 0.075 * s, sz: 0.80 * s });
  // neck and the long jaw
  w.add(P.cap, 0, backY + 0.04 * s, -0.46 * s, skin, { rx: 1.35, sx: 0.20 * s, sy: 0.18 * s, sz: 0.20 * s });
  const headY = backY + 0.06 * s;
  w.add(P.sph, 0, headY, -0.66 * s, skin, { sx: 0.215 * s, sy: 0.205 * s, sz: 0.250 * s });
  w.add(P.box, 0, headY - 0.055 * s, -0.83 * s, skin, { sx: 0.135 * s, sy: 0.095 * s, sz: 0.280 * s });
  w.add(P.box, 0, headY - 0.098 * s, -0.83 * s, VOID, { sx: 0.120 * s, sy: 0.030 * s, sz: 0.265 * s });
  // sockets
  for (const side of [-1, 1]) {
    w.add(P.sphLo, side * 0.078 * s, headY + 0.045 * s, -0.760 * s, VOID,
      { sx: 0.085 * s, sy: 0.070 * s, sz: 0.050 * s });
  }
  // tail
  w.add(P.cone, 0, backY - 0.02 * s, 0.62 * s, cloth, { rx: -1.45, sx: 0.11 * s, sy: 0.52 * s, sz: 0.11 * s });

  const eyesW = new Weld();
  for (const side of [-1, 1]) {
    eyesW.add(P.sphLo, side * 0.078 * s, headY + 0.048 * s, -0.786 * s, 0xffffff,
      { sx: 0.036 * GLINT_SCALE * s, sy: 0.032 * GLINT_SCALE * s, sz: 0.026 * GLINT_SCALE * s });
  }

  const legL = limbGeo(0.62 * s, 0.062 * s, 0.052 * s, skin,
    { colour: bone, z: -0.02 * s });

  return {
    shell: w.geometry('hound-shell'),
    eyes: eyesW.geometry('hound-eyes'),
    limb: legL,
    fore: null,
    joints: [
      // four hips, front pair then rear pair. y is the pivot height.
      { x: -0.20 * s, y: 0.62 * s, z: -0.34 * s },
      { x: 0.20 * s, y: 0.62 * s, z: -0.34 * s },
      { x: -0.21 * s, y: 0.60 * s, z: 0.34 * s },
      { x: 0.21 * s, y: 0.60 * s, z: 0.34 * s },
    ],
    zones: [
      { x: 0, y: headY, z: -0.72 * s, r: 0.24 * s, zone: 'head' },
      { x: 0, y: backY + 0.24 * s, z: 0.02 * s, r: 0.19 * s, zone: 'vent' },
      { x: 0, y: backY, z: -0.10 * s, r: 0.42 * s, zone: 'torso' },
      { x: 0, y: backY - 0.02 * s, z: 0.32 * s, r: 0.31 * s, zone: 'limb' },
    ],
    gait: 'trot',
  };
}

/* ------------------------------------------------------------- PALLBEARER --
   2.05 m, shroud, NO LEGS, bone mask. It has arms and it has a bell of cloth
   and nothing in between, which is why it drags rather than walks. */
function buildPallbearer(def) {
  const s = def.height / 2.05;
  const w = new Weld();
  const cloth = def.cloth, bone = def.bone;
  const shoulderY = 1.52 * s, headY = 1.76 * s;

  // the bell: two stacked cones, wide at the ground, so no legs are needed
  w.add(P.cone, 0, 0.42 * s, 0, cloth, { sx: 1.10 * s, sy: 0.94 * s, sz: 0.98 * s });
  w.add(P.cone, 0, 1.02 * s, 0, cloth, { sx: 0.78 * s, sy: 0.80 * s, sz: 0.72 * s });
  // hem: a darker band so the body meets the ground instead of hovering over it
  w.add(P.cyl, 0, 0.055 * s, 0, SEAM, { sx: 1.06 * s, sy: 0.11 * s, sz: 0.96 * s });
  // chest block + shoulder caps (UNINVITED's silhouette rule)
  w.add(P.box, 0, shoulderY - 0.16 * s, 0, cloth, { sx: 0.50 * s, sy: 0.38 * s, sz: 0.28 * s });
  for (const side of [-1, 1]) {
    w.add(P.sph, side * 0.245 * s, shoulderY - 0.02 * s, 0, cloth,
      { sx: 0.215 * s, sy: 0.200 * s, sz: 0.205 * s });
  }
  const sockZ = sculptHead(w, headY, s, { hood: true, brow: true, mask: true, bone, cloth });

  const armGeo = limbGeo(0.34 * s, 0.062 * s, 0.05 * s, cloth, null);
  const foreGeo = limbGeo(0.30 * s, 0.050 * s, 0.052 * s, cloth, { colour: bone });

  return {
    shell: w.geometry('pallbearer-shell'),
    eyes: eyeGeometry(headY, s, sockZ, 0.062),
    limb: armGeo,
    fore: foreGeo,
    joints: [
      { x: -0.245 * s, y: shoulderY - 0.03 * s, z: 0, fore: -0.34 * s },
      { x: 0.245 * s, y: shoulderY - 0.03 * s, z: 0, fore: -0.34 * s },
    ],
    zones: [
      { x: 0, y: headY, z: -0.10 * s, r: 0.25 * s, zone: 'head' },
      { x: 0, y: shoulderY - 0.14 * s, z: 0, r: 0.36 * s, zone: 'torso' },
      { x: 0, y: 0.98 * s, z: 0, r: 0.40 * s, zone: 'torso' },
      { x: 0, y: 0.40 * s, z: 0, r: 0.52 * s, zone: 'limb' },
    ],
    gait: 'drag',
  };
}

/* ----------------------------------------------------------------- HUNTER --
   2.20 m, gaunt, arms TOO LONG, no face at all. Its head is nothing but the
   cavity and the brow: no mask, so there is a hole where a face should be. */
function buildHunter(def) {
  const s = def.height / 2.20;
  const w = new Weld();
  const cloth = def.cloth, skin = def.skin, bone = def.bone;
  const hipY = 1.02 * s, shoulderY = 1.78 * s, headY = 1.99 * s;

  w.add(P.box, 0, hipY, 0, skin, { sx: 0.28 * s, sy: 0.22 * s, sz: 0.20 * s });
  w.add(P.box, 0, hipY + 0.30 * s, 0, skin, { sx: 0.26 * s, sy: 0.42 * s, sz: 0.19 * s });
  // narrow chest, wide clavicle: the wrongness is in the proportion
  w.add(P.box, 0, shoulderY - 0.20 * s, 0, skin, { sx: 0.50 * s, sy: 0.34 * s, sz: 0.22 * s });
  for (let i = 0; i < 5; i++) {
    w.add(P.box, 0, (hipY + 0.30 + i * 0.115) * s, -0.075 * s, bone,
      { sx: 0.245 * s, sy: 0.028 * s, sz: 0.105 * s });
  }
  for (const side of [-1, 1]) {
    w.add(P.sph, side * 0.255 * s, shoulderY - 0.03 * s, 0, skin,
      { sx: 0.185 * s, sy: 0.175 * s, sz: 0.180 * s });
  }
  w.add(P.cap, 0, shoulderY + 0.09 * s, 0, skin, { sx: 0.10 * s, sy: 0.11 * s, sz: 0.10 * s });
  const sockZ = sculptHead(w, headY, s, { hood: false, brow: true, mask: false, bone, cloth });

  // arms too long: 0.52 upper + 0.54 fore against a 2.20 m body
  const armGeo = limbGeo(0.52 * s, 0.058 * s, 0.05 * s, skin, null);
  const foreGeo = limbGeo(0.54 * s, 0.046 * s, 0.060 * s, skin, { colour: bone });
  const thighGeo = limbGeo(0.52 * s, 0.075 * s, 0.06 * s, skin, null);
  const shinGeo = footGeo(0.50 * s, skin, SEAM);

  return {
    shell: w.geometry('hunter-shell'),
    eyes: eyeGeometry(headY, s, sockZ, 0.062),
    limb: armGeo, fore: foreGeo,
    thigh: thighGeo, shin: shinGeo,
    joints: [
      { x: -0.255 * s, y: shoulderY - 0.04 * s, z: 0, fore: -0.52 * s },
      { x: 0.255 * s, y: shoulderY - 0.04 * s, z: 0, fore: -0.52 * s },
    ],
    hips: [
      { x: -0.105 * s, y: hipY - 0.06 * s, z: 0, knee: -0.52 * s },
      { x: 0.105 * s, y: hipY - 0.06 * s, z: 0, knee: -0.52 * s },
    ],
    zones: [
      { x: 0, y: headY, z: -0.06 * s, r: 0.24 * s, zone: 'head' },
      { x: 0, y: shoulderY - 0.18 * s, z: 0, r: 0.31 * s, zone: 'torso' },
      { x: 0, y: hipY + 0.28 * s, z: 0, r: 0.27 * s, zone: 'torso' },
      { x: 0, y: hipY - 0.34 * s, z: 0, r: 0.30 * s, zone: 'limb' },
    ],
    gait: 'stride',
  };
}

/* ---------------------------------------------------------------- POACHER --
   1.80 m, coat, a rifle with a glint. A PERSON: an ordinary head with a face,
   because "a person with a light who has seen yours" only lands if it is
   unmistakably a person at 40 m. */
function buildPoacher(def) {
  const s = def.height / 1.80;
  const w = new Weld();
  const cloth = def.cloth, skin = def.skin, bone = def.bone;
  const hipY = 0.92 * s, shoulderY = 1.42 * s, headY = 1.62 * s;

  w.add(P.box, 0, hipY - 0.02 * s, 0, cloth, { sx: 0.34 * s, sy: 0.20 * s, sz: 0.23 * s });
  w.add(P.box, 0, hipY + 0.19 * s, 0, cloth, { sx: 0.32 * s, sy: 0.26 * s, sz: 0.22 * s });
  w.add(P.box, 0, shoulderY - 0.14 * s, 0, cloth, { sx: 0.46 * s, sy: 0.34 * s, sz: 0.24 * s });
  // the coat: a skirt of cloth to the knee, which is the read at distance
  w.add(P.cone, 0, hipY - 0.28 * s, 0, cloth, { sx: 0.56 * s, sy: 0.78 * s, sz: 0.46 * s });
  for (const side of [-1, 1]) {
    w.add(P.sph, side * 0.215 * s, shoulderY - 0.03 * s, 0, cloth,
      { sx: 0.190 * s, sy: 0.180 * s, sz: 0.185 * s });
  }
  w.add(P.cyl, 0, shoulderY + 0.06 * s, 0, skin, { sx: 0.11 * s, sy: 0.11 * s, sz: 0.11 * s });
  const sockZ = sculptHead(w, headY, s, { face: true, cap: true, bone, cloth, skin });

  // the rifle, slung across the chest. The BARREL is the glint that reads
  // before the body does, so it is bone-bright against a very dark coat.
  w.add(P.box, 0.10 * s, shoulderY - 0.24 * s, -0.20 * s, bone,
    { rx: 0.16, ry: -0.30, sx: 0.030 * s, sy: 0.030 * s, sz: 1.05 * s });
  w.add(P.box, 0.06 * s, shoulderY - 0.34 * s, 0.10 * s, SEAM,
    { rx: 0.16, ry: -0.30, sx: 0.055 * s, sy: 0.110 * s, sz: 0.30 * s });

  const armGeo = limbGeo(0.30 * s, 0.058 * s, 0.05 * s, cloth, null);
  const foreGeo = limbGeo(0.28 * s, 0.046 * s, 0.050 * s, cloth, { colour: skin });
  const thighGeo = limbGeo(0.42 * s, 0.078 * s, 0.06 * s, cloth, null);
  const shinGeo = footGeo(0.44 * s, cloth, SEAM);

  return {
    shell: w.geometry('poacher-shell'),
    eyes: eyeGeometry(headY, s, sockZ, 0.050),
    limb: armGeo, fore: foreGeo,
    thigh: thighGeo, shin: shinGeo,
    joints: [
      { x: -0.215 * s, y: shoulderY - 0.04 * s, z: 0, fore: -0.30 * s },
      { x: 0.215 * s, y: shoulderY - 0.04 * s, z: 0, fore: -0.30 * s },
    ],
    hips: [
      { x: -0.095 * s, y: hipY - 0.04 * s, z: 0, knee: -0.42 * s },
      { x: 0.095 * s, y: hipY - 0.04 * s, z: 0, knee: -0.42 * s },
    ],
    zones: [
      { x: 0, y: headY, z: -0.04 * s, r: 0.22 * s, zone: 'head' },
      { x: 0, y: shoulderY - 0.14 * s, z: 0, r: 0.30 * s, zone: 'torso' },
      { x: 0, y: hipY + 0.06 * s, z: 0, r: 0.28 * s, zone: 'torso' },
      { x: 0, y: hipY - 0.42 * s, z: 0, r: 0.28 * s, zone: 'limb' },
    ],
    gait: 'walk',
    muzzle: { x: 0.28 * s, y: shoulderY - 0.12 * s, z: -0.52 * s },
  };
}

/* ------------------------------------------------------------------- PALE --
   Porcelain, no face, doll joints. Rigid arms held slightly out, no elbow: the
   stiffness IS the horror, and a doll that gestures is a puppet instead. */
function buildPale(def) {
  const s = 1;
  const w = new Weld();
  const bone = def.bone, cloth = def.cloth;
  const hipY = 0.88, shoulderY = 1.36, headY = 1.56;

  w.add(P.cap, 0, 1.06, 0, cloth, { sx: 0.30, sy: 0.42, sz: 0.24 });
  w.add(P.cone, 0, 0.44, 0, cloth, { sx: 0.46, sy: 0.92, sz: 0.38 });
  for (const side of [-1, 1]) {
    w.add(P.sph, side * 0.165, shoulderY - 0.02, 0, bone, { sx: 0.130, sy: 0.125, sz: 0.128 });
  }
  w.add(P.cyl, 0, shoulderY + 0.06, 0, bone, { sx: 0.075, sy: 0.115, sz: 0.075 });
  const sockZ = sculptHead(w, headY, s, { smooth: true, bone, cloth });

  const armGeo = limbGeo(0.44, 0.045, 0.045, bone, { colour: bone });
  const legGeo = limbGeo(0.46, 0.052, 0.05, bone, { colour: bone });

  return {
    shell: w.geometry('pale-shell'),
    eyes: eyeGeometry(headY, s, sockZ, 0.058),
    limb: armGeo, fore: null,
    thigh: legGeo, shin: null,
    joints: [
      { x: -0.165, y: shoulderY - 0.03, z: 0 },
      { x: 0.165, y: shoulderY - 0.03, z: 0 },
    ],
    hips: [
      { x: -0.078, y: hipY - 0.10, z: 0 },
      { x: 0.078, y: hipY - 0.10, z: 0 },
    ],
    zones: [
      { x: 0, y: headY, z: -0.04, r: 0.20, zone: 'head' },
      { x: 0, y: 1.10, z: 0, r: 0.26, zone: 'torso' },
      { x: 0, y: 0.52, z: 0, r: 0.30, zone: 'limb' },
    ],
    gait: 'creep',
  };
}

/* --------------------------------------------------------- STANDING KIND --
   An ordinary body. Ordinary clothes, an ordinary head with an ordinary face,
   and the only thing wrong with it is that it is not where it was. Nothing on
   this build may look monstrous — the whole scare is that it does not. */
function buildStanding(def) {
  const s = def.height / 1.78;
  const w = new Weld();
  const cloth = def.cloth, skin = def.skin, bone = def.bone;
  const hipY = 0.90 * s, shoulderY = 1.40 * s, headY = 1.60 * s;

  w.add(P.box, 0, hipY - 0.02 * s, 0, cloth, { sx: 0.33 * s, sy: 0.20 * s, sz: 0.22 * s });
  w.add(P.box, 0, hipY + 0.19 * s, 0, cloth, { sx: 0.30 * s, sy: 0.26 * s, sz: 0.21 * s });
  w.add(P.box, 0, shoulderY - 0.14 * s, 0, cloth, { sx: 0.43 * s, sy: 0.32 * s, sz: 0.23 * s });
  for (const side of [-1, 1]) {
    w.add(P.sph, side * 0.200 * s, shoulderY - 0.03 * s, 0, cloth,
      { sx: 0.180 * s, sy: 0.172 * s, sz: 0.175 * s });
  }
  w.add(P.cyl, 0, shoulderY + 0.06 * s, 0, skin, { sx: 0.10 * s, sy: 0.11 * s, sz: 0.10 * s });
  const sockZ = sculptHead(w, headY, s, { face: true, bone, cloth, skin });

  const armGeo = limbGeo(0.30 * s, 0.056 * s, 0.048 * s, cloth, null);
  const foreGeo = limbGeo(0.28 * s, 0.044 * s, 0.048 * s, cloth, { colour: skin });
  const thighGeo = limbGeo(0.42 * s, 0.076 * s, 0.058 * s, cloth, null);
  const shinGeo = footGeo(0.44 * s, cloth, SEAM);

  return {
    shell: w.geometry('standing-shell'),
    eyes: eyeGeometry(headY, s, sockZ, 0.050),
    limb: armGeo, fore: foreGeo,
    thigh: thighGeo, shin: shinGeo,
    joints: [
      { x: -0.200 * s, y: shoulderY - 0.04 * s, z: 0, fore: -0.30 * s },
      { x: 0.200 * s, y: shoulderY - 0.04 * s, z: 0, fore: -0.30 * s },
    ],
    hips: [
      { x: -0.092 * s, y: hipY - 0.04 * s, z: 0, knee: -0.42 * s },
      { x: 0.092 * s, y: hipY - 0.04 * s, z: 0, knee: -0.42 * s },
    ],
    zones: [
      { x: 0, y: headY, z: -0.04 * s, r: 0.21 * s, zone: 'head' },
      { x: 0, y: shoulderY - 0.14 * s, z: 0, r: 0.29 * s, zone: 'torso' },
      { x: 0, y: hipY + 0.06 * s, z: 0, r: 0.27 * s, zone: 'torso' },
      { x: 0, y: hipY - 0.42 * s, z: 0, r: 0.27 * s, zone: 'limb' },
    ],
    gait: 'walk',
  };
}

/* ==========================================================================
   Instancing a body.
   ========================================================================== */

/**
 * @param key    species id
 * @param rng    a forked Rng (never Math.random)
 * @returns a `built` record: enemies.js owns the group's world transform, this
 *          owns everything inside it.
 */
export function buildBody(key, rng) {
  const def = SPECIES[key];
  const set = geoSetFor(key);

  // Per-instance tint: a spread of VALUE, plus a whisper of hue, so a crowd is
  // not one object repeated. The spread is deliberately in value, because value
  // is the only channel that survives a night scene.
  //
  // The range was 0.58..1.00, downward-only, after the fix that removed a
  // clamp01() which had been silently pinning the ~52% of bodies that drew
  // k > 1 to exactly 1.0. That fix was right; its CENTRE was not, and the
  // reveal instrument caught it: mean k 0.79 means the shipped crowd presents
  // 79% of the species.js ladder that ART 0.6 pins as "already measured and
  // correct". The ladder was authored as hexes, so a 21% darkening applied on
  // top of it is not the ladder.
  //
  // Measured, one hound, clear line of sight, torch off, 16 m: body mean 9.7
  // against a backdrop of 37.8 — a body:backdrop of 0.257 where ART.md gate 21
  // wants 0.35-0.75. A body is meant to be a HOLE, not an absence.
  //
  // 0.78..1.14 keeps the full 36% spread and re-centres it on 0.96. The old
  // comment's "never brighter than authored" was this lane's own rule, stricter
  // than the law it was serving: species.js's night-value law says a body must
  // sit under the SKY, and after ART 1.1 the sky is 26-34 while the palest body
  // in the roster (the Pale, cloth Y 0.145) reaches Y 0.165 at k = 1.14 — still
  // far under it. Nothing here may go above 1.14 without re-measuring that.
  //
  // ONE EXCEPTION, and it is measured. The upward half of the window exists to
  // undo a 21% darkening of a ladder that is already correct. A species whose
  // cloth is ALREADY above its backdrop does not need undoing: the Pale reads
  // 1.04 / 1.22 / 1.72 of its backdrop at 10 / 16 / 24 m where gate 21 wants
  // 0.35-0.75, so lifting it is lifting the wrong body. Its ceiling is therefore
  // its authored value exactly, and its spread runs downward from there. The
  // threshold is on relative luminance and only the Pale (cloth Y 0.144) is over
  // it; every other cloth in the roster sits at Y 0.005-0.008.
  const ceil = clothLuma(def.cloth) > 0.05 ? 1.0 : TINT_CEIL;
  const k = 0.78 + rng.next() * (ceil - 0.78);
  const hue = (rng.next() * 2 - 1) * 0.035;
  // TINT_CEIL, not clamp01. clamp01 was the reason the previous spread did not
  // exist — every draw above 1.0 landed on exactly 1.0 — and re-centring the
  // range on 0.96 would have walked straight back into it: 61% of bodies would
  // have been pinned to the identical tint. The ceiling is the number the
  // comment above reasons about, so it is written once, here, and nowhere else.
  const tint = (v) => (v < 0 ? 0 : (v > ceil ? ceil : v));
  const shell = makeShell(
    tint(k * (1 + hue)),
    tint(k),
    tint(k * (1 - hue * 0.6)),
  );

  const group = new THREE.Group();
  group.name = 'enemy:' + key;
  group.visible = false;
  group.matrixAutoUpdate = true;

  const shellMesh = new THREE.Mesh(set.shell, shell);
  shellMesh.castShadow = false;
  shellMesh.receiveShadow = false;
  shellMesh.frustumCulled = true;
  group.add(shellMesh);

  // The glint is the ONE above-1.0 emissive a body is allowed. `def.eye` is read
  // as sRGB and converted into the linear working space by setHex, and every eye
  // in the roster peaks at exactly 1.0 there; EYE_EMISSIVE lifts that peak over
  // CFG.render.bloom.threshold 1.05 so the glint spreads instead of vanishing.
  // The hex, and therefore the hue and the ladder's ordering, is untouched.
  const eyeMat = makeBasic(whiteTex(), new THREE.Color(def.eye).multiplyScalar(EYE_EMISSIVE));
  const eyeMesh = new THREE.Mesh(set.eyes, eyeMat);
  eyeMesh.frustumCulled = true;
  group.add(eyeMesh);

  // contact shadow: unlit, dark, depth-write off. It is what stops a body from
  // hovering. donor: fetch/src/outside.js:4481-4487
  const contactMat = makeBasic(contactTex(), 0x000000);
  contactMat.opacity = 0.72;
  const contact = new THREE.Mesh(CONTACT_GEO(), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.035;
  contact.scale.setScalar(def.radius * 4.6);
  contact.frustumCulled = true;
  group.add(contact);

  const parts = { shellMesh, eyeMesh, contact, limbs: [], legs: [] };

  // arms (or, for the hound, all four legs)
  for (let i = 0; i < set.joints.length; i++) {
    const j = set.joints[i];
    const pivot = new THREE.Group();
    pivot.position.set(j.x, j.y, j.z);
    group.add(pivot);
    const upper = new THREE.Mesh(set.limb, shell);
    upper.castShadow = false;
    pivot.add(upper);
    let elbow = null;
    if (set.fore && j.fore !== undefined) {
      elbow = new THREE.Group();
      elbow.position.y = j.fore;
      elbow.rotation.x = -0.22;               // a natural resting bend (UNINVITED)
      pivot.add(elbow);
      const fore = new THREE.Mesh(set.fore, shell);
      fore.castShadow = false;
      elbow.add(fore);
    }
    parts.limbs.push({ pivot, elbow, base: pivot.rotation.x });
  }

  // legs, when the species has any
  if (set.hips) {
    for (let i = 0; i < set.hips.length; i++) {
      const h = set.hips[i];
      const pivot = new THREE.Group();
      pivot.position.set(h.x, h.y, h.z);
      group.add(pivot);
      const thigh = new THREE.Mesh(set.thigh, shell);
      thigh.castShadow = false;
      pivot.add(thigh);
      let knee = null;
      if (set.shin && h.knee !== undefined) {
        knee = new THREE.Group();
        knee.position.y = h.knee;
        pivot.add(knee);
        const shin = new THREE.Mesh(set.shin, shell);
        shin.castShadow = false;
        knee.add(shin);
      }
      parts.legs.push({ pivot, knee });
    }
  }

  const eyeBase = eyeMat.color.clone();

  // How many draw calls this body costs while it is inside the LOD line. It is
  // reported through enemies.telemetry() so the draw budget is a MEASURED
  // number rather than an argument about how many parts a rig has.
  let drawCount = 0;
  group.traverse((o) => { if (o.isMesh) drawCount++; });

  return {
    key,
    drawCount,
    group,
    parts,
    zones: set.zones,
    gait: set.gait,
    muzzle: set.muzzle || null,
    scale: 1 + (rng.next() * 2 - 1) * 0.09,     // +-9% per instance
    shellMat: shell,
    eyeMat,
    contactMat,
    eyeBase,

    /** 0 = held back in the dark, 1 = fully lit. THE REVEAL BUDGET. */
    reveal(v) { setReveal(shell, v); },

    /** 0..1 windup charge: x2 emissive on the shootable part + the eyes. */
    telegraph(v) {
      setRimGain(shell, RIM_GAIN * (1 + v * (RIM_TELEGRAPH - 1) * 3.0));
      const g = 1 + v * 2.4;
      eyeMat.color.setRGB(eyeBase.r * g, eyeBase.g * g, eyeBase.b * g);
    },

    /** 1 -> 0 over 2.6 s so dead reads against alive across a field. */
    deathGlow(v) {
      eyeMat.color.setRGB(eyeBase.r * v, eyeBase.g * v, eyeBase.b * v);
      eyeMat.opacity = v;
      contactMat.opacity = 0.72 * (0.4 + 0.6 * v);
    },

    animate(a) { ANIMATE[set.gait](parts, a); },

    dispose() {
      shell.dispose();
      eyeMat.dispose();
      contactMat.dispose();
    },
  };
}

let _contactGeo = null;
function CONTACT_GEO() {
  if (!_contactGeo) _contactGeo = new THREE.PlaneGeometry(1, 1);
  return _contactGeo;
}

/* ==========================================================================
   Animation. Every gait is a pure function of (gait phase, move amplitude,
   coil, bank) — no state, no allocation, and every one of them stops moving
   when moveAmp is 0, which is what makes the burst gait legible.
   ========================================================================== */

const ANIMATE = {
  trot(parts, a) {
    for (let i = 0; i < parts.limbs.length; i++) {
      const ph = a.gait + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : Math.PI * 0.5);
      parts.limbs[i].pivot.rotation.x = Math.sin(ph) * 0.62 * a.moveAmp;
    }
    // the coil: it draws BACK before it lunges, which is the silhouette change
    parts.shellMesh.position.z = a.coil * 0.24;
    parts.shellMesh.rotation.x = a.coil * -0.34 + Math.sin(a.gait * 2) * 0.035 * a.moveAmp;
    parts.eyeMesh.position.z = parts.shellMesh.position.z;
    parts.eyeMesh.rotation.x = parts.shellMesh.rotation.x;
  },

  drag(parts, a) {
    // no legs: the bell sways and the arms reach. The strike is a two-handed
    // downward commit, so the windup lifts BOTH arms above the shoulder.
    const sway = Math.sin(a.gait * 0.8) * 0.055 * a.moveAmp;
    parts.shellMesh.rotation.z = sway + a.bank * 0.25;
    parts.eyeMesh.rotation.z = parts.shellMesh.rotation.z;
    for (let i = 0; i < parts.limbs.length; i++) {
      const L = parts.limbs[i];
      const side = i === 0 ? -1 : 1;
      L.pivot.rotation.x = -a.coil * 2.2 - Math.abs(sway) * 2 + a.swing * 2.6;
      L.pivot.rotation.z = side * (0.22 + a.coil * 0.35);
      if (L.elbow) L.elbow.rotation.x = -0.22 - a.coil * 0.7;
    }
  },

  stride(parts, a) {
    // the arms are too long, so they swing WIDE and the hands pass the knee
    for (let i = 0; i < parts.limbs.length; i++) {
      const L = parts.limbs[i];
      const ph = a.gait + (i ? Math.PI : 0);
      L.pivot.rotation.x = Math.sin(ph) * 0.75 * a.moveAmp - a.coil * 1.9 + a.swing * 2.2;
      L.pivot.rotation.z = (i ? 1 : -1) * (0.12 + a.coil * 0.30);
      if (L.elbow) L.elbow.rotation.x = -0.30 - Math.abs(Math.sin(ph)) * 0.30 * a.moveAmp - a.coil * 0.5;
    }
    for (let i = 0; i < parts.legs.length; i++) {
      const L = parts.legs[i];
      const ph = a.gait + (i ? 0 : Math.PI);
      L.pivot.rotation.x = Math.sin(ph) * 0.72 * a.moveAmp;
      if (L.knee) L.knee.rotation.x = Math.max(0, -Math.sin(ph - 0.7)) * 0.85 * a.moveAmp;
    }
    parts.shellMesh.rotation.x = -0.10 * a.moveAmp - a.coil * 0.22;
    parts.eyeMesh.rotation.x = parts.shellMesh.rotation.x;
  },

  walk(parts, a) {
    for (let i = 0; i < parts.limbs.length; i++) {
      const L = parts.limbs[i];
      const ph = a.gait + (i ? Math.PI : 0);
      L.pivot.rotation.x = Math.sin(ph) * 0.42 * a.moveAmp + a.aim * (i ? -1.42 : -0.95);
      L.pivot.rotation.z = (i ? 1 : -1) * (0.06 + a.aim * 0.18);
      if (L.elbow) L.elbow.rotation.x = -0.22 - Math.abs(Math.sin(ph)) * 0.24 * a.moveAmp - a.aim * 0.9;
    }
    for (let i = 0; i < parts.legs.length; i++) {
      const L = parts.legs[i];
      const ph = a.gait + (i ? 0 : Math.PI);
      L.pivot.rotation.x = Math.sin(ph) * 0.58 * a.moveAmp;
      if (L.knee) L.knee.rotation.x = Math.max(0, -Math.sin(ph - 0.7)) * 0.75 * a.moveAmp;
    }
    parts.shellMesh.rotation.z = a.bank * 0.22;
    parts.eyeMesh.rotation.z = parts.shellMesh.rotation.z;
  },

  creep(parts, a) {
    // rigid. The joints tick rather than swing: a doll that gestures is a
    // puppet, and a puppet is not frightening.
    const tick = a.tick;
    for (let i = 0; i < parts.limbs.length; i++) {
      parts.limbs[i].pivot.rotation.x = -0.10 - tick * 0.12;
      parts.limbs[i].pivot.rotation.z = (i ? 1 : -1) * (0.20 + a.coil * 0.9);
    }
    for (let i = 0; i < parts.legs.length; i++) {
      parts.legs[i].pivot.rotation.x = ((i ? 1 : -1) * tick) * 0.30 * a.moveAmp;
    }
    parts.shellMesh.rotation.z = tick * 0.035;
    parts.eyeMesh.rotation.z = parts.shellMesh.rotation.z;
  },
};

/* ==========================================================================
   Impostors. One InstancedMesh per species; every body past the LOD line is an
   instance in it, so "a lot of enemies" is six draws no matter how many.
   ========================================================================== */

export function makeImpostor(key, capacity) {
  const def = SPECIES[key];
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);                 // pivot at the feet
  // CARD_MUL is the carrier, not a brightness: every byte in the texture was
  // divided by it in linearByte(), so this multiplication puts the card back
  // exactly where it was authored and buys the glint its room above 1.0.
  const mat = makeBasic(impostorTexture(key), new THREE.Color(CARD_MUL, CARD_MUL, CARD_MUL));
  const mesh = new THREE.InstancedMesh(geo, mat, capacity);
  mesh.frustumCulled = false;               // we cull by LOD, not by the card
  mesh.count = 0;
  mesh.name = 'enemy-impostor:' + key;
  mesh.renderOrder = -1;
  mesh.userData.aspect = def.form === FORM.QUADRUPED ? 1.9 : 0.62;
  return mesh;
}

export const REVEAL = Object.freeze({
  NEAR: REVEAL_NEAR, FAR: REVEAL_FAR, FLOOR: REVEAL_FLOOR,
});

export default { buildBody, makeImpostor, REVEAL };
