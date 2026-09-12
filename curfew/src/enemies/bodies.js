// Shared character geometry and articulated rigs. Enemy controllers own combat,
// hit zones and timing; this module owns anatomy, surfaces and their presentation.
// PBR tissue keeps its detail under nearby lights through readableSurface.
import * as THREE from 'three';
import { TAU } from '../engine/math.js';
import { SPECIES, FORM } from './species.js';
import { buildHuman } from '../art/people.js';
import { buildMarrow } from './marrow-body.js';
import { loft, tendon, boneHorn, wornPlate, wingMembrane, characterMaps } from '../art/character-sculpt.js';
import { readableSurface } from '../art/surface-light.js';
import { fracturedMask } from '../art/character-faces.js';

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
const SHELL_CACHE_KEY = 'curfew-body-shell-v2-pbr';

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
  this.userData.surfaceCompile.call(this, shader);
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
export function makeShell(tintR, tintG, tintB) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tintR, tintG, tintB),
    vertexColors: true,          // EVERY geometry fed to this MUST carry `color`
    ...characterMaps('hide'),
    bumpScale: 0.013,
    roughness: 1,
    metalness: 0,
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
  readableSurface(m);
  m.userData.surfaceCompile=m.onBeforeCompile;
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
  const t = new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
  t.needsUpdate=true;
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  WHITE_TEX = t;
  return t;
}

let CONTACT_TEX = null;
/** The soft radial disc every body stands on. Exported because the boss needs the SAME
    texture for its contact and for its painted cast shadow: a second canvas would be a
    second texture upload for a picture nobody could tell apart. (docs/ROUND-6/HANDOFF-C.md
    item 1 asked for this and for makeShell; both are exported now, so kneeler-body.js no
    longer builds a whole hound at boot just to steal its materials.) */
export function contactTex() {
  if (CONTACT_TEX) return CONTACT_TEX;
  const N = 64;
  const pixels=new Uint8Array(N*N*4);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const d=Math.hypot((x+.5-N/2)/(N/2),(y+.5-N/2)/(N/2));
    const alpha=d<.55?.80-(d/.55)*.46:.34*(1-Math.min(1,(d-.55)/.45));
    const k=(y*N+x)*4;pixels[k]=pixels[k+1]=pixels[k+2]=255;pixels[k+3]=Math.round(alpha*255);
  }
  const t = new THREE.DataTexture(pixels,N,N);
  t.generateMipmaps=true;t.needsUpdate=true;
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
  // metres nearer is a tone-mapped PBR surface standing in moonlight. Every byte
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

// Cached sculpted forms. Curvature is in the mesh, while fine relief is material detail.
const P = {
  box: wornPlate(),
  sph: new THREE.SphereGeometry(0.5, 24, 16),
  sphLo: new THREE.SphereGeometry(0.5, 16, 10),
  cap: loft([[-1,.005,.005],[-.83,.29,.28],[-.52,.43,.40],[-.08,.47,.43],[.36,.43,.41],[.72,.30,.28],[1,.005,.005]],{segments:20,subdivisions:2,folds:.035}),
  cone: boneHorn(),
  cone3: boneHorn(),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  torus: new THREE.TorusGeometry(0.5, 0.10, 10, 28),
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
  // A head is not always ON TOP of the shoulders. `spec.dz` pushes the whole head forward
  // (negative) or back along the body's own -Z, which is how the hunter's skull comes to hang
  // in FRONT of and BELOW its shoulder blades. Every z below is relative to it, and the socket
  // depth returned at the end carries it, so eyeGeometry lands the glints in the right holes.
  const dz = spec.dz || 0;
  const w0 = w;
  w = {
    add(g, x, yy, z, c, o) { w0.add(g, x, yy, z + dz, c, o); return w; },
  };

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
      sx: 0.105 * s, sy: 0.062 * s, sz: 0.050 * s,
    });
  }
  return sockZ + dz / s;
}

/* Eye glints: their own tiny mesh on the shared MeshBasic program, proud of the
   sockets so they catch a light in full dark. Two lozenges, ~40 triangles.

   THEY ARE SLITS, NOT DISCS, AND THAT IS ROUND 7's DOING. Measured 2026-09-03 with
   tools/bodylook.mjs at 3 m: every body in the roster wore two round white 68 mm eyeballs
   the size of coins (tests/shots/bodylook/before-pale-3m-approach-moon.png, and the
   pallbearer's are worse). A pair of big round symmetric front-facing lights is what a
   CARTOON face is made of, and five of the six species were wearing one. The Pale read as a
   Halloween cutout and the pallbearer as a chess pawn with googly eyes.

   The fix cannot be "make them smaller": the whole reason GLINT_SCALE is 2.0 is that below
   68 mm no pixel at 16 m is fully covered by glint, the covered pixel blends with the black
   body behind it, its luma drops back under CFG.render.bloom.threshold and the glint neither
   resolves nor spreads. So the size is kept in the axis that owns that argument — WIDTH —
   and spent in the axis that owns the cartoon: HEIGHT.

     was  68 x 60 mm  -> 2.1 x 1.9 px at 16 m, and a coin at 3 m
     now  76 x 12 mm  -> 2.4 x 0.4 px at 16 m, and a cut at 3 m

   Two cuts together still own roughly five pre-bloom pixels at 16 m, and the threshold spreads
   their horizontal axis instead of inflating their height back into eyeballs. tools/bodylook.mjs
   reports the over-150 pixel count per cell and it is how this was checked at both ends. */
function eyeGeometry(y, s, sockZ, spread) {
  const w = new Weld();
  const G = GLINT_SCALE;
  for (const side of [-1, 1]) {
    w.add(P.sphLo, side * spread * s, y + 0.030 * s, (sockZ - 0.026) * s, 0xffffff, {
      sx: 0.038 * G * s, sy: 0.006 * G * s, sz: 0.014 * G * s,
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
    if (endGeo.claw) {
      // A HAND, NOT A KNOB. Measured 2026-09-03 (tools/bodylook.mjs, and it is the loudest
      // thing in tests/shots/bodylook/before-hunter-3m-approach-torch.png): every limb in the
      // roster ended in a pale BONE ball 2.4x the wrist, and under a torch those balls are the
      // brightest thing on the body — two wooden doorknobs hanging off a mannequin. A hand is
      // a narrow palm and long fingers, and long fingers are also the ONE proportion cue that
      // survives at 20 m.
      const c = endGeo.claw;
      w.add(P.box, 0, -len - rBot * 0.9, -rBot * 0.5, colour, {
        sx: rBot * 1.7, sy: rBot * 1.9, sz: rBot * 2.6,
      });
      for (let i = -1; i <= 1; i++) {
        w.add(P.cone3, i * rBot * 0.95, -len - rBot * 1.5, -rBot * 1.5, endGeo.colour, {
          rx: -1.30 - Math.abs(i) * 0.12, rz: i * 0.24,
          sx: rBot * 0.52, sy: c * (i === 0 ? 1.18 : 1), sz: rBot * 0.52,
        });
      }
    } else {
      w.add(P.sphLo, 0, -len - rBot * 0.4, endGeo.z || 0, endGeo.colour, {
        sx: rBot * 2.0, sy: rBot * 2.4, sz: rBot * 2.2,
      });
    }
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
    case FORM.MOTH: set = buildMoth(def); break;
    case FORM.SPIDER: set = buildSpider(def); break;
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

  // A flayed cage, not a coffee table. Five complete ribs stand proud of a
  // pinched hide core; from the front they make a broad bony vault and from
  // either flank they disclose the empty depth between each ring.
  const trunk=loft([[-.47,.025,.04],[-.36,.18,.205],[-.21,.252,.236],[-.02,.242,.215],
    [.18,.169,.158,.01,.01],[.36,.157,.142,.024,-.04],[.55,.075,.074,.027,-.018],[.59,.003,.003]],
  {segments:32,subdivisions:4,folds:.045,seed:2});
  trunk.rotateX(Math.PI/2);w.add(trunk,0,backY,0,skin,{sx:s,sy:s,sz:s});trunk.dispose();
  // Ribs wrap from spine around the actual chest. Separate roots and tapering
  // sternum tips read as anatomy instead of five complete metal hoops.
  for (let i=0;i<6;i++)for(const side of [-1,1]) {
    const z=-.33+i*.102,rx=.267-i*.012;
    const rib=tendon([[0,backY/s+.207,z],[side*rx*.70,backY/s+.168,z-.018],
      [side*rx,backY/s-.015,z-.032],[side*rx*.63,backY/s-.179,z+.011],[side*.035,backY/s-.17,z+.056]],
    .027-i*.0015,.009,24,9);
    w.add(rib,0,0,0,bone,{sx:s,sy:s,sz:s});rib.dispose();
  }
  // Knife scapulae and an uneven vertebral saw remain legible after every
  // surface detail has collapsed into a single dark pixel.
  for (const side of [-1, 1]) {
    w.add(P.cone3, side * 0.36 * s, backY + 0.19 * s, -0.28 * s, bone,
      { rx: -0.28, rz: side * 0.72, sx: 0.10 * s, sy: 0.56 * s, sz: 0.10 * s });
    for (let i = 0; i < 3; i++) {
      w.add(P.cone3, side * (0.48 - i * 0.025) * s,
        (backY + 0.10 - i * 0.10) * s, (-0.18 + i * 0.20) * s, bone,
        { rx: -0.25 + i * 0.18, rz: side * (1.18 - i * 0.12),
          sx: 0.055 * s, sy: (0.34 - i * 0.035) * s, sz: 0.055 * s });
    }
  }
  for (let i = 0; i < 7; i++) {
    w.add(P.cone3, (i % 2 ? 0.025 : -0.035) * s,
      backY + (0.24 + (i % 3) * 0.025) * s, (-0.43 + i * 0.135) * s, bone,
      { rx: -0.38 + i * 0.045, rz: (i % 2 ? 0.18 : -0.24),
        sx: 0.050 * s, sy: (0.20 + (i % 3) * 0.055) * s, sz: 0.050 * s });
  }

  // The neck funnels into a black facial cavity. Broken cheek plates frame it;
  // nothing round and flesh-coloured remains on the front of this animal.
  w.add(P.cap, 0, backY + 0.02 * s, -0.48 * s, skin,
    { rx: 1.24, sx: 0.23 * s, sy: 0.22 * s, sz: 0.23 * s });
  const headY = backY - 0.055 * s;
  w.add(P.sph, 0, headY + 0.02 * s, -0.70 * s, VOID,
    { sx: 0.30 * s, sy: 0.25 * s, sz: 0.34 * s });
  for (const side of [-1, 1]) {
    w.add(P.cone3, side * 0.13 * s, headY + 0.045 * s, -0.905 * s, bone,
      { rx: -0.22, rz: side * 0.26, sx: 0.14 * s, sy: 0.34 * s, sz: 0.09 * s });
    // A two-joint antler hook: enormous at eight metres, but swept sideways so
    // it never reads as a cute pair of upright ears.
    w.add(P.cone3, side * 0.37 * s, headY + 0.17 * s, -0.72 * s, bone,
      { rx: -0.26, rz: side * 0.88, sx: 0.075 * s, sy: 0.48 * s, sz: 0.075 * s });
    w.add(P.cone3, side * 0.56 * s, headY + 0.31 * s, -0.68 * s, bone,
      { rx: 0.18, rz: side * -0.46, sx: 0.060 * s, sy: 0.34 * s, sz: 0.060 * s });
    w.add(P.sphLo, side * 0.102 * s, headY + 0.055 * s, -0.875 * s, VOID,
      { sx: 0.105 * s, sy: 0.074 * s, sz: 0.040 * s });
  }
  w.add(P.cone3, -0.065 * s, headY + 0.16 * s, -0.925 * s, bone,
    { rx: 1.34, rz: 2.98, sx: 0.19 * s, sy: 0.19 * s, sz: 0.11 * s });
  w.add(P.box, 0.075 * s, headY - 0.025 * s, -0.938 * s, bone,
    { rz: -0.20, ry: 0.06, sx: 0.095 * s, sy: 0.22 * s, sz: 0.050 * s });
  // Two jaw rails leave a genuine central gulf rather than a black line painted
  // on a snout. Their tips splay like a trap sprung halfway shut.
  for (const side of [-1, 1]) {
    w.add(P.cone, side * 0.080 * s, headY - 0.13 * s, -0.99 * s, bone,
      { rx: -1.42, ry: side * 0.08, rz: side * 0.08,
        sx: 0.095 * s, sy: 0.58 * s, sz: 0.095 * s });
    for (let i = 0; i < 4; i++) {
      w.add(P.cone3, side * (0.048 + i * 0.008) * s, headY - 0.075 * s,
        (-0.84 - i * 0.105) * s, bone,
        { rx: Math.PI, sx: 0.026 * s, sy: (0.072 + (i % 2) * 0.035) * s, sz: 0.026 * s });
    }
  }
  w.add(P.cone3, 0.03 * s, backY - 0.01 * s, 0.70 * s, cloth,
    { rx: -1.32, rz: -0.15, sx: 0.10 * s, sy: 0.64 * s, sz: 0.10 * s });

  const eyesW = new Weld();
  for (const side of [-1, 1]) {
    // slits, not discs — see eyeGeometry()'s note. A hound's are angled inward and down,
    // which is the one line on this body that makes it read as an animal that means it.
    eyesW.add(P.sphLo, side * 0.102 * s, headY + 0.055 * s, -0.910 * s, 0xffffff,
      { rz: side * 0.42,
        sx: 0.040 * GLINT_SCALE * s, sy: 0.005 * GLINT_SCALE * s, sz: 0.014 * GLINT_SCALE * s });
  }

  // Two real joints support each quarter of the body. The femur loads the
  // knee; the narrow lower leg folds behind it during the airborne half-step.
  const leg=new Weld(),lower=new Weld();
  const upperLeg=loft([[.02,.041,.042],[0,.064,.07],[-.11,.077,.079,0,.035],
    [-.23,.052,.059,0,.09],[-.34,.037,.041,0,.10]],{segments:20,subdivisions:3,folds:.035});
  leg.add(upperLeg,0,0,0,skin,{sx:s,sy:s,sz:s});upperLeg.dispose();
  const lowerLeg=loft([[.022,.034,.04],[0,.047,.048],[-.075,.031,.033,0,-.03],
    [-.19,.022,.026,0,-.11],[-.28,.024,.030,0,-.20]],{segments:18,subdivisions:3,folds:.025});
  lower.add(lowerLeg,0,0,0,skin,{sx:s,sy:s,sz:s});lowerLeg.dispose();
  lower.add(P.sphLo,0,0,0,bone,{sx:.10*s,sy:.085*s,sz:.11*s});
  lower.add(P.sphLo,0,-.29*s,-.21*s,bone,{sx:.15*s,sy:.065*s,sz:.22*s});
  for(let i=-1;i<=1;i++){
    const toe=tendon([[i*.044,-.286,-.23],[i*.055,-.30,-.33],[i*.054,-.304,-.41+Math.abs(i)*.028]],.016,.0025,15,7);
    lower.add(toe,0,0,0,bone,{sx:s,sy:s,sz:s});toe.dispose();
  }

  // ROUND 22: THE RUNNER is this same animal STRETCHED along its spine (species.js
  // `stretch`, 1.35 for the runner, absent = 1 for the hound). The welded shell and the eyes
  // are scaled in z before they are ever uploaded, and the hip pivots and hit zones move with
  // them, so a low long body comes out of the one builder with no new geometry code and —
  // the law that matters — no new material and no new program. Legs are not stretched: a
  // long body on the same legs is exactly the silhouette that reads as "not a hound".
  const st = def.stretch > 0 ? def.stretch : 1;
  const shell = w.geometry('hound-shell');
  const eyes = eyesW.geometry('hound-eyes');
  if (st !== 1) { shell.scale(1, 1, st); eyes.scale(1, 1, st); }
  return {
    shell,
    eyes,
    limb: leg.geometry('hound-leg'),
    fore: lower.geometry('hound-lower-leg'),
    joints: [
      // four hips, front pair then rear pair. y is the pivot height.
      { x: -0.20 * s, y: 0.62 * s, z: -0.34 * s * st, fore: -.34*s, foreZ: .10*s },
      { x: 0.20 * s, y: 0.62 * s, z: -0.34 * s * st, fore: -.34*s, foreZ: .10*s },
      { x: -0.21 * s, y: 0.60 * s, z: 0.34 * s * st, fore: -.34*s, foreZ: .10*s },
      { x: 0.21 * s, y: 0.60 * s, z: 0.34 * s * st, fore: -.34*s, foreZ: .10*s },
    ],
    zones: [
      { x: 0, y: headY, z: -0.74 * s * st, r: 0.26 * s, zone: 'head' },
      { x: 0, y: backY + 0.24 * s, z: 0.02 * s * st, r: 0.19 * s, zone: 'vent' },
      { x: 0, y: backY, z: -0.10 * s * st, r: 0.42 * s, zone: 'torso' },
      { x: 0, y: backY - 0.02 * s, z: 0.32 * s * st, r: 0.31 * s, zone: 'limb' },
    ],
    gait: def.gait || 'trot',
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

  // A funeral bier is lashed to its back: four crooked rails and a shoulder
  // yoke make the silhouette readable before the robe is. It looks burdened by
  // something much larger than a body, rather than like a person in a dress.
  for (const side of [-1, 1]) {
    const lift = side < 0 ? 0.08 : -0.04;
    w.add(P.box, side * 0.42 * s, (1.10 + lift) * s, 0.16 * s, bone,
      { rz: side * -0.10, rx: 0.05, sx: 0.075 * s, sy: 1.72 * s, sz: 0.075 * s });
    w.add(P.cone3, side * 0.48 * s, 1.98 * s, 0.16 * s, bone,
      { rz: side * -0.22, sx: 0.085 * s, sy: 0.42 * s, sz: 0.085 * s });
  }
  w.add(P.box, -0.02 * s, 1.82 * s, 0.16 * s, bone,
    { rz: -0.055, sx: 1.10 * s, sy: 0.075 * s, sz: 0.075 * s });
  w.add(P.box, 0.06 * s, 0.80 * s, 0.17 * s, bone,
    { rz: 0.07, sx: 0.88 * s, sy: 0.060 * s, sz: 0.060 * s });

  // Layered hanging cloth with real gaps between the tongues. These pieces are
  // deliberately different lengths; a single cone always turns back into a
  // pawn as soon as it is seen head-on.
  const shroud=loft([[.10,.37,.235,.025,.025],[.24,.34,.229],[.48,.288,.203],
    [.78,.239,.161,-.018,.01],[1.06,.21,.148,-.027,.01],[1.30,.28,.155,-.03,0],
    [1.49,.286,.13,-.03,0],[1.60,.133,.089,-.02,0],[1.62,.07,.06]],
  {segments:40,subdivisions:4,folds:.15,seed:4});
  w.add(shroud,0,0,0,cloth,{sx:s,sy:s,sz:s});shroud.dispose();
  const panels = [
    [-0.34, 0.57, 0.12, 0.31, 0.98, 0.10],
    [-0.13, 0.48, -0.04, 0.28, 1.12, -0.04],
    [0.12, 0.55, 0.05, 0.30, 0.98, 0.07],
    [0.35, 0.66, -0.02, 0.27, 0.82, -0.10],
  ];
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    const hem=loft([[-.45,.004,.006],[-.34,.09,.035],[-.1,.11,.034],[.23,.12,.030],[.48,.035,.01]],
    {segments:16,subdivisions:3,folds:.12,seed:i*1.7});
    w.add(hem,p[0]*s,p[1]*s,p[2]*s-.155*s,i%2?SEAM:cloth,{rz:p[5],sx:s,sy:p[4]*s,sz:s});hem.dispose();
  }
  // Exposed cage bars show through the parted shroud.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      w.add(P.cone3, side * (0.16 + i * 0.07) * s, (0.96 + i * 0.15) * s, -0.20 * s, bone,
        { rz: side * (1.08 - i * 0.11), rx: -0.20,
          sx: 0.040 * s, sy: (0.34 - i * 0.045) * s, sz: 0.040 * s });
    }
  }
  // One shoulder is swallowed by cloth; the other is a bare angular hook.
  w.add(P.sph, -0.30 * s, shoulderY - 0.01 * s, 0, cloth,
    { rz: -0.26, sx: 0.32 * s, sy: 0.26 * s, sz: 0.25 * s });
  w.add(P.cone3, 0.32 * s, shoulderY + 0.04 * s, 0, bone,
    { rz: -1.18, sx: 0.13 * s, sy: 0.46 * s, sz: 0.13 * s });

  // A deep hood with a broken two-piece mortuary mask. The black vertical
  // chasm between the plates is broad enough to survive the 8 m screenshot.
  w.add(P.sph, -0.02 * s, headY, 0.025 * s, VOID,
    { sx: 0.34 * s, sy: 0.38 * s, sz: 0.28 * s });
  for (const side of [-1, 1]) {
    w.add(P.cone3, side * 0.14 * s, headY + 0.02 * s, 0.045 * s, cloth,
      { rx: 0.25, ry: side * 0.26, rz: side * 0.18,
        sx: 0.22 * s, sy: 0.54 * s, sz: 0.28 * s });
  }
  w.add(P.box, -0.105 * s, headY - 0.005 * s, -0.225 * s, bone,
    { rz: 0.12, ry: -0.08, sx: 0.135 * s, sy: 0.31 * s, sz: 0.055 * s });
  w.add(P.box, 0.105 * s, headY - 0.055 * s, -0.215 * s, bone,
    { rz: -0.18, ry: 0.10, sx: 0.115 * s, sy: 0.25 * s, sz: 0.052 * s });
  w.add(P.box, 0, headY - 0.035 * s, -0.244 * s, VOID,
    { sx: 0.055 * s, sy: 0.29 * s, sz: 0.025 * s });
  for (const side of [-1, 1]) {
    w.add(P.sphLo, side * 0.083 * s, headY + 0.055 * s, -0.258 * s, VOID,
      { sx: 0.088 * s, sy: 0.052 * s, sz: 0.035 * s });
  }
  const sockZ = -0.270;

  const upper = new Weld();
  upper.add(P.cap, 0, -0.19 * s, 0, cloth,
    { rz: -0.10, sx: 0.15 * s, sy: 0.30 * s, sz: 0.14 * s });
  upper.add(P.cone3, 0.08 * s, -0.26 * s, 0.02 * s, bone,
    { rz: -0.74, sx: 0.055 * s, sy: 0.30 * s, sz: 0.055 * s });
  const fore = new Weld();
  fore.add(P.cap, 0, -0.20 * s, 0, cloth,
    { rz: 0.08, sx: 0.12 * s, sy: 0.31 * s, sz: 0.11 * s });
  fore.add(P.box, 0, -0.37 * s, -0.04 * s, bone,
    { sx: 0.15 * s, sy: 0.09 * s, sz: 0.20 * s });
  for (let i = -1; i <= 1; i++) {
    fore.add(P.cone3, i * 0.055 * s, -0.42 * s, -0.18 * s, bone,
      { rx: -1.30, rz: i * 0.19, sx: 0.032 * s,
        sy: (0.29 - Math.abs(i) * 0.04) * s, sz: 0.032 * s });
  }

  return {
    shell: w.geometry('pallbearer-shell'),
    eyes: eyeGeometry(headY, s, sockZ, 0.083),
    limb: upper.geometry('pallbearer-upper'),
    fore: fore.geometry('pallbearer-fore'),
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
  const hipY = 1.02 * s, shoulderY = 1.72 * s, headY = 1.73 * s;

  // A waist like a cable beneath an exposed thoracic cage. The repeated full
  // hoops are large enough to read as anatomy instead of decorative pixels.
  const torso=loft([[.91,.052,.045,-.01,0],[1.00,.154,.111,-.027,.01],
    [1.12,.109,.077,.013,.029],[1.26,.166,.093,.024,.018],[1.42,.22,.128,.012,.005],
    [1.58,.253,.139,-.013,.01],[1.72,.241,.112,-.025,.029],[1.79,.126,.092,-.018,.04],
    [1.82,.034,.03,-.017,.028]],{segments:36,subdivisions:4,folds:.042});
  w.add(torso,0,0,0,skin,{sx:s,sy:s,sz:s});torso.dispose();
  for(let i=0;i<6;i++)for(const side of [-1,1]){
    const y=1.21+i*.083,rx=.167+i*.014;
    const rib=tendon([[side*.034,y+.062,.116],[side*rx*.85,y+.04,.082],
      [side*rx,y,-.034],[side*rx*.64,y-.030,-.117],[side*.025,y-.052,-.122]],
    .022,.008,24,9);
    w.add(rib,0,0,0,bone,{sx:s,sy:s,sz:s});rib.dispose();
  }
  const spine=tendon([[0,1.02,.095],[.045,1.22,.127],[.021,1.48,.153],[-.026,1.76,.13]],.045,.026,28,10);
  w.add(spine,0,0,0,bone,{sx:s,sy:s,sz:s});spine.dispose();

  // Four scapular blades turn the top half into a closing insect trap. The
  // inner pair rises above the head; the outer pair hooks down toward the arms.
  for (const side of [-1, 1]) {
    w.add(P.cone3, side * 0.20 * s, shoulderY + 0.22 * s, 0.08 * s, skin,
      { rz: side * -0.30, rx: -0.14, sx: 0.16 * s, sy: 0.78 * s, sz: 0.12 * s });
    w.add(P.cone3, side * 0.39 * s, shoulderY + 0.02 * s, 0.04 * s, bone,
      { rz: side * 0.78, rx: 0.12, sx: 0.12 * s, sy: 0.70 * s, sz: 0.10 * s });
    w.add(P.cone3, side * 0.50 * s, shoulderY - 0.06 * s, -0.01 * s, bone,
      { rz: side * -0.72, rx: -0.18, sx: 0.075 * s, sy: 0.45 * s, sz: 0.075 * s });
  }

  // A human cranial structure stretched under the shoulder blades. The face
  // still has a nose and cheek bones, but its jaw has split away and the eye
  // apertures see into an unlit interior.
  const neck=tendon([[0,shoulderY/s+.015,.016],[.015,shoulderY/s-.01,-.14],[0,headY/s-.04,-.255]],.070,.046,24,12);
  w.add(neck,0,0,0,skin,{sx:s,sy:s,sz:s});neck.dispose();
  const mask=fracturedMask({variant:0,origin:[0,headY/s,-.235],scale:[1.66,2.36,1.55],fracture:.021,mouth:.031});
  w.add(mask.innerGeometry,0,0,0,VOID,{sx:s,sy:s,sz:s});mask.innerGeometry.dispose();
  w.add(mask.geometry,0,0,0,bone,{sx:s,sy:s,sz:s});mask.geometry.dispose();
  const hunterEyes=new Weld();
  for(const [x,y,z] of mask.eyes){
    hunterEyes.add(P.sphLo,x*s,y*s,(z-.01)*s,0xffffff,{sx:.033*s,sy:.006*s,sz:.011*s});
  }

  // Muscle narrows into visible tendons at the elbow and wrist. Hands are
  // narrow palms with four crooked fingers, continuous with the forearm.
  const upper=new Weld(),fore=new Weld(),thigh=new Weld(),shin=new Weld();
  const armShape=loft([[.025,.038,.035],[0,.089,.081],[-.12,.086,.066,.01,0],
    [-.28,.067,.052,.007,.006],[-.44,.041,.040],[-.52,.037,.038]],
    {segments:24,subdivisions:3,folds:.045});
  upper.add(armShape,0,0,0,skin,{sx:s,sy:s,sz:s});armShape.dispose();
  const foreShape=loft([[.02,.037,.039],[-.075,.053,.046],[-.21,.040,.034],[-.38,.026,.023,0,-.012],
    [-.51,.023,.022,0,-.02],[-.57,.049,.029,0,-.03],[-.64,.042,.025,0,-.044]],
    {segments:24,subdivisions:3,folds:.035});
  fore.add(foreShape,0,0,0,skin,{sx:s,sy:s,sz:s});foreShape.dispose();
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.025,len=.21-Math.abs(i-1.5)*.03;
    const digit=tendon([[x,-.618,-.043],[x*1.25,-.67,-.058],[x*1.3,-.68-len*.6,-.106],
      [x*1.10,-.68-len,-.09]],.015,.0035,22,8);
    fore.add(digit,0,0,0,bone,{sx:s,sy:s,sz:s});digit.dispose();
  }
  const thighShape=loft([[.015,.051,.047],[-.08,.090,.076],[-.24,.071,.055,0,.009],
    [-.41,.046,.043,0,.025],[-.51,.039,.041,0,.028]],{segments:24,subdivisions:3,folds:.035});
  thigh.add(thighShape,0,0,0,skin,{sx:s,sy:s,sz:s});thighShape.dispose();
  const shinShape=loft([[.02,.037,.04,0,.028],[-.10,.059,.050,0,.018],[-.28,.036,.033,0,-.018],
    [-.43,.026,.032,0,-.061],[-.51,.04,.07,0,-.096]],{segments:22,subdivisions:3,folds:.035});
  shin.add(shinShape,0,0,0,skin,{sx:s,sy:s,sz:s});shinShape.dispose();
  for(let i=-1;i<=1;i++){
    const toe=tendon([[i*.023,-.50,-.105],[i*.036,-.52,-.182],[i*.04,-.53,-.253+Math.abs(i)*.02]],.018,.004,18,8);
    shin.add(toe,0,0,0,bone,{sx:s,sy:s,sz:s});toe.dispose();
  }

  return {
    shell: w.geometry('hunter-shell'),
    eyes: hunterEyes.geometry('hunter-eyes'),
    limb: upper.geometry('hunter-upper'), fore: fore.geometry('hunter-fore'),
    thigh: thigh.geometry('hunter-thigh'), shin: shin.geometry('hunter-shin'),
    joints: [
      { x: -0.255 * s, y: shoulderY - 0.04 * s, z: 0, fore: -0.52 * s },
      { x: 0.255 * s, y: shoulderY - 0.04 * s, z: 0, fore: -0.52 * s },
    ],
    hips: [
      { x: -0.105 * s, y: hipY - 0.06 * s, z: 0, knee: -0.52 * s },
      { x: 0.105 * s, y: hipY - 0.06 * s, z: 0, knee: -0.52 * s },
    ],
    zones: [
      { x: 0, y: headY, z: -0.21 * s, r: 0.24 * s, zone: 'head' },
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

  // Heavy field coat, split and wind-chewed. One tail is longer and one lapel
  // hangs loose, so the human silhouette remains readable without becoming a
  // mannequin made from three stacked boxes.
  w.add(P.cap, -0.015 * s, 1.17 * s, 0, cloth,
    { rz: -0.035, sx: 0.48 * s, sy: 0.61 * s, sz: 0.32 * s });
  w.add(P.cone3, -0.18 * s, 0.76 * s, 0.02 * s, cloth,
    { rx: Math.PI, rz: 0.08, sx: 0.38 * s, sy: 0.78 * s, sz: 0.34 * s });
  w.add(P.cone3, 0.19 * s, 0.82 * s, -0.01 * s, SEAM,
    { rx: Math.PI, rz: -0.11, sx: 0.35 * s, sy: 0.66 * s, sz: 0.32 * s });
  w.add(P.box, -0.13 * s, 1.26 * s, -0.19 * s, bone,
    { rz: -0.52, rx: -0.10, sx: 0.09 * s, sy: 0.62 * s, sz: 0.045 * s });
  w.add(P.box, 0.12 * s, 1.21 * s, -0.19 * s, bone,
    { rz: 0.42, rx: -0.12, sx: 0.075 * s, sy: 0.55 * s, sz: 0.045 * s });

  // Pack, bedroll and trap hoops break up the back and shoulders. They are
  // mundane poacher equipment arranged into a threatening outline, not horns
  // grown from a human enemy.
  w.add(P.box, 0.04 * s, 1.20 * s, 0.24 * s, SEAM,
    { rz: 0.06, sx: 0.48 * s, sy: 0.52 * s, sz: 0.22 * s });
  w.add(P.cyl, -0.02 * s, 1.50 * s, 0.25 * s, cloth,
    { rz: 1.57, sx: 0.16 * s, sy: 0.55 * s, sz: 0.16 * s });
  w.add(P.torus, 0.34 * s, 1.22 * s, 0.19 * s, bone,
    { ry: -0.34, rz: 0.13, sx: 0.38 * s, sy: 0.58 * s, sz: 0.32 * s });
  for (const side of [-1, 1]) {
    w.add(P.sphLo, side * 0.245 * s, shoulderY - (side < 0 ? -0.025 : 0.07) * s, 0, cloth,
      { sx: (side < 0 ? 0.25 : 0.20) * s, sy: 0.20 * s, sz: 0.21 * s });
  }

  // Deep hood, wrapped face and a projecting respirator made from scavenged
  // metal. This is still unmistakably a person with a gun, just one the player
  // does not want turning its head toward the torch.
  w.add(P.sph, 0.02 * s, headY, 0, VOID,
    { sx: 0.29 * s, sy: 0.31 * s, sz: 0.25 * s });
  for (const side of [-1, 1]) {
    w.add(P.cone3, side * 0.12 * s, headY + 0.025 * s, 0.025 * s, cloth,
      { rx: 0.22, ry: side * 0.24, rz: side * 0.16,
        sx: 0.20 * s, sy: 0.43 * s, sz: 0.25 * s });
    w.add(P.sphLo, side * 0.071 * s, headY + 0.045 * s, -0.245 * s, VOID,
      { sx: 0.082 * s, sy: 0.047 * s, sz: 0.034 * s });
  }
  w.add(P.box, 0, headY - 0.035 * s, -0.235 * s, skin,
    { rx: -0.14, sx: 0.19 * s, sy: 0.21 * s, sz: 0.052 * s });
  w.add(P.cone3, 0, headY - 0.115 * s, -0.33 * s, bone,
    { rx: -1.57, sx: 0.11 * s, sy: 0.19 * s, sz: 0.11 * s });
  w.add(P.box, 0, headY - 0.13 * s, -0.351 * s, VOID,
    { sx: 0.12 * s, sy: 0.025 * s, sz: 0.015 * s });
  const sockZ = -0.26;

  // Rifle drawn across the FRONT in screen space: barrel, stock, receiver and
  // sight all live in the one merged shell, so its identity no longer vanishes
  // when the player is looking straight at the shooter.
  w.add(P.box, 0.08 * s, 1.15 * s, -0.30 * s, bone,
    { rz: -0.54, rx: -0.04, sx: 0.052 * s, sy: 1.18 * s, sz: 0.052 * s });
  w.add(P.box, -0.17 * s, 0.77 * s, -0.30 * s, SEAM,
    { rz: -0.54, sx: 0.15 * s, sy: 0.35 * s, sz: 0.12 * s });
  w.add(P.box, 0.03 * s, 1.05 * s, -0.34 * s, bone,
    { rz: -0.54, sx: 0.13 * s, sy: 0.22 * s, sz: 0.10 * s });
  w.add(P.box, 0.30 * s, 1.40 * s, -0.34 * s, bone,
    { rz: -0.54, sx: 0.035 * s, sy: 0.18 * s, sz: 0.04 * s });

  const upper = new Weld();
  upper.add(P.cap, 0, -0.15 * s, 0, cloth,
    { sx: 0.18 * s, sy: 0.24 * s, sz: 0.16 * s });
  upper.add(P.box, 0.08 * s, -0.15 * s, 0.015 * s, SEAM,
    { rz: -0.30, sx: 0.05 * s, sy: 0.28 * s, sz: 0.08 * s });
  const fore = new Weld();
  fore.add(P.cap, 0, -0.14 * s, 0, cloth,
    { sx: 0.14 * s, sy: 0.23 * s, sz: 0.13 * s });
  fore.add(P.box, 0, -0.29 * s, -0.035 * s, skin,
    { sx: 0.13 * s, sy: 0.09 * s, sz: 0.18 * s });
  const thigh = new Weld();
  thigh.add(P.cap, 0, -0.21 * s, 0, cloth,
    { sx: 0.19 * s, sy: 0.34 * s, sz: 0.17 * s });
  const shin = new Weld();
  shin.add(P.cap, 0, -0.20 * s, 0, cloth,
    { sx: 0.16 * s, sy: 0.33 * s, sz: 0.145 * s });
  shin.add(P.box, 0, -0.43 * s, -0.065 * s, SEAM,
    { sx: 0.20 * s, sy: 0.11 * s, sz: 0.31 * s });

  return {
    shell: w.geometry('poacher-shell'),
    eyes: eyeGeometry(headY, s, sockZ, 0.071),
    limb: upper.geometry('poacher-upper'), fore: fore.geometry('poacher-fore'),
    thigh: thigh.geometry('poacher-thigh'), shin: shin.geometry('poacher-shin'),
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

  // The Pale is a cracked devotional doll: a black wicker core with porcelain
  // plates tied over it. Large gaps between the plates prevent the torch from
  // turning the whole body into one beige plastic toy.
  const shroud = 0x343330;
  const garment=loft([[.70,.107,.08,.015,.018],[.82,.166,.104],[.94,.138,.086],
    [1.08,.133,.104],[1.25,.184,.108,-.013,0],[1.34,.190,.087,-.02,0],
    [1.42,.085,.067,-.008,0],[1.44,.04,.04]],{segments:32,subdivisions:3,folds:.11,seed:5});
  w.add(garment,0,0,0,shroud);garment.dispose();
  // collar and separated rib plates
  const collar=tendon([[-.17,1.32,-.037],[-.075,1.35,-.099],[0,1.30,-.117],[.071,1.34,-.101],[.17,1.31,-.037]],.022,.014,26,9);
  w.add(collar,0,0,0,bone);collar.dispose();
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      w.add(P.cone3, side * (0.11 + i * 0.014), 1.09 + i * 0.095, -0.20, bone,
        { rz: side * (1.12 - i * 0.10), rx: -0.16,
          sx: 0.038, sy: 0.25 - i * 0.018, sz: 0.040 });
    }
  }
  for (let i = 0; i < 3; i++) {
    w.add(P.cone3, -0.30 - i * 0.045, 1.12 + i * 0.12, -0.04, bone,
      { rx: -0.12, rz: -1.05 + i * 0.12, sx: 0.050,
        sy: 0.38 - i * 0.045, sz: 0.050 });
  }
  // Socketed shoulders at visibly different heights, one capped and one split.
  w.add(P.sphLo, -0.19, shoulderY + 0.035, 0, bone,
    { rz: -0.18, sx: 0.18, sy: 0.16, sz: 0.16 });
  w.add(P.cone3, 0.19, shoulderY - 0.045, 0, bone,
    { rz: -1.20, sx: 0.14, sy: 0.37, sz: 0.14 });
  for (const side of [-1, 1]) {
    w.add(P.cyl, side * 0.145, shoulderY + (side < 0 ? 0.03 : -0.04), 0, VOID,
      { rz: 1.57, sx: 0.13, sy: 0.038, sz: 0.13 });
  }

  // A broken anatomical face. One cheek has slipped down its fracture, and
  // the eye and mouth apertures look into a real recessed cavity.
  const mask=fracturedMask({variant:2,origin:[-.005,headY,-.04],scale:[1.70,1.90,1.55],fracture:.027,mouth:.026});
  w.add(mask.innerGeometry,0,0,0,VOID);mask.innerGeometry.dispose();
  w.add(mask.geometry,0,0,0,bone);mask.geometry.dispose();
  const eyes=new Weld();
  for(const [x,y,z] of mask.eyes){
    eyes.add(P.sphLo,x,y,z-.009,0xffffff,{sx:.027,sy:.0055,sz:.009});
  }
  // Slender roots have grown through the back of the effigy, leaving its face
  // recognizable until the light catches the holes in it.
  for(let i=0;i<5;i++){
    const x=(i-2)*.061;
    const root=tendon([[x*.7,1.67,.016],[x,1.81,.028],[x*1.45,1.91+(i%2)*.08,.002],
      [x*1.65,1.96+(i%2)*.08,-.054]],.014,.002,22,8);
    w.add(root,0,0,0,i%2?cloth:bone);root.dispose();
  }

  const arm = new Weld();
  const upper=loft([[.01,.026,.025],[-.05,.046,.043],[-.18,.041,.034],[-.32,.027,.03],[-.35,.012,.014]],{segments:20,subdivisions:3,folds:.045});
  arm.add(upper,0,0,0,bone);upper.dispose();
  arm.add(P.sphLo, 0.02, -0.36, 0, VOID,
    { sx: 0.070, sy: 0.075, sz: 0.065 });
  const forearm=loft([[-.38,.016,.018,.02,0],[-.44,.035,.038,.02,-.006],[-.57,.027,.025,.018,-.015],[-.66,.021,.018,.016,-.03]],{segments:20,subdivisions:3,folds:.06});
  arm.add(forearm,0,0,0,cloth);forearm.dispose();
  arm.add(P.sphLo,.016,-.665,-.035,bone,{sx:.066,sy:.075,sz:.04});
  for(let i=-1;i<=1;i++){
    const digit=tendon([[.016+i*.021,-.68,-.034],[.016+i*.027,-.737,-.050],
      [.016+i*.029,-.792+Math.abs(i)*.015,-.074]],.010,.003,17,7);
    arm.add(digit,0,0,0,bone);digit.dispose();
  }
  const leg = new Weld();
  const thigh=loft([[.006,.034,.03],[-.08,.052,.049],[-.22,.044,.04],[-.39,.029,.03],[-.44,.017,.02]],{segments:20,subdivisions:3,folds:.05});
  leg.add(thigh,0,0,0,bone);thigh.dispose();
  leg.add(P.sphLo, 0.025, -0.46, 0.015, VOID,
    { sx: 0.075, sy: 0.065, sz: 0.065 });
  const shin=loft([[-.49,.025,.025,.02,0],[-.55,.04,.038,.02,-.006],[-.66,.027,.026,.02,-.025],[-.74,.025,.027,.02,-.025]],{segments:20,subdivisions:3,folds:.05});
  leg.add(shin,0,0,0,cloth);shin.dispose();
  leg.add(P.box, 0.02, -0.74, -0.085, bone,
    { sx: 0.14, sy: 0.075, sz: 0.28 });

  return {
    shell: w.geometry('pale-shell'),
    eyes: eyes.geometry('pale-eyes'),
    limb: arm.geometry('pale-arm'), fore: null,
    thigh: leg.geometry('pale-leg'), shin: null,
    joints: [
      { x: -0.235, y: shoulderY + 0.070, z: 0, scaleY: 1.55 },
      { x: 0.175, y: shoulderY - 0.095, z: 0, scaleY: 0.70 },
    ],
    hips: [
      { x: -0.078, y: hipY - 0.10, z: 0 },
      { x: 0.078, y: hipY - 0.10, z: 0 },
    ],
    zones: [
      { x: 0, y: headY, z: -0.04, r: 0.25, zone: 'head' },
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

  // Still recognisably a rural person: a soaked overcoat, scarf, boots and a
  // shoulder satchel. The horror is wrong posture and an unreadable face, not
  // fantasy anatomy. Thick overlapping layers finally give it human weight.
  w.add(P.cap, -0.01 * s, 1.16 * s, 0, cloth,
    { rz: 0.025, sx: 0.47 * s, sy: 0.58 * s, sz: 0.31 * s });
  w.add(P.cone3, -0.16 * s, 0.79 * s, 0.01 * s, cloth,
    { rx: Math.PI, rz: 0.05, sx: 0.35 * s, sy: 0.65 * s, sz: 0.30 * s });
  w.add(P.cone3, 0.17 * s, 0.82 * s, 0, SEAM,
    { rx: Math.PI, rz: -0.07, sx: 0.33 * s, sy: 0.59 * s, sz: 0.29 * s });
  // scarf tail and satchel strap are ordinary details large enough to stop the
  // chest becoming a featureless black rectangle.
  w.add(P.torus, 0, 1.43 * s, -0.01 * s, bone,
    { rx: 1.57, rz: -0.06, sx: 0.43 * s, sy: 0.36 * s, sz: 0.42 * s });
  w.add(P.box, -0.12 * s, 1.17 * s, -0.185 * s, bone,
    { rz: -0.47, rx: -0.08, sx: 0.065 * s, sy: 0.68 * s, sz: 0.035 * s });
  w.add(P.box, 0.25 * s, 0.98 * s, 0.12 * s, SEAM,
    { rz: -0.08, sx: 0.23 * s, sy: 0.29 * s, sz: 0.16 * s });
  w.add(P.box, 0.12 * s, 1.14 * s, 0.18 * s, cloth,
    { rz: 0.10, sx: 0.35 * s, sy: 0.44 * s, sz: 0.15 * s });
  w.add(P.sphLo, -0.23 * s, shoulderY + 0.015 * s, 0, cloth,
    { rz: -0.12, sx: 0.24 * s, sy: 0.21 * s, sz: 0.21 * s });
  w.add(P.sphLo, 0.22 * s, shoulderY - 0.075 * s, 0, cloth,
    { rz: 0.15, sx: 0.21 * s, sy: 0.19 * s, sz: 0.20 * s });

  // The hood is tipped and the head sits too low between uneven shoulders. A
  // shallow fragment of an otherwise normal face catches the torch; most of
  // it remains a cavity. No monster crown, no beacon eyes.
  w.add(P.sph, -0.025 * s, headY - 0.015 * s, -0.005 * s, VOID,
    { rz: 0.06, sx: 0.29 * s, sy: 0.31 * s, sz: 0.25 * s });
  w.add(P.sph, -0.035 * s, headY + 0.055 * s, 0.035 * s, cloth,
    { rz: 0.08, sx: 0.35 * s, sy: 0.29 * s, sz: 0.29 * s });
  w.add(P.box, -0.03 * s, headY + 0.06 * s, -0.245 * s, cloth,
    { rz: 0.07, rx: -0.18, sx: 0.34 * s, sy: 0.075 * s, sz: 0.16 * s });
  w.add(P.box, -0.055 * s, headY - 0.045 * s, -0.263 * s, skin,
    { rz: 0.08, ry: -0.08, sx: 0.20 * s, sy: 0.22 * s, sz: 0.042 * s });
  w.add(P.box, 0.075 * s, headY - 0.075 * s, -0.267 * s, VOID,
    { rz: -0.12, sx: 0.09 * s, sy: 0.20 * s, sz: 0.025 * s });
  for (const side of [-1, 1]) {
    w.add(P.sphLo, side * 0.057 * s - 0.035 * s, headY + 0.015 * s, -0.290 * s, VOID,
      { sx: 0.068 * s, sy: 0.037 * s, sz: 0.025 * s });
  }
  const sockZ = -0.30;

  const upper = new Weld();
  upper.add(P.cap, 0, -0.15 * s, 0, cloth,
    { sx: 0.18 * s, sy: 0.25 * s, sz: 0.16 * s });
  upper.add(P.box, 0.07 * s, -0.15 * s, -0.01 * s, SEAM,
    { rz: -0.22, sx: 0.045 * s, sy: 0.27 * s, sz: 0.075 * s });
  const fore = new Weld();
  fore.add(P.cap, 0, -0.14 * s, 0, cloth,
    { sx: 0.145 * s, sy: 0.23 * s, sz: 0.135 * s });
  fore.add(P.box, 0, -0.29 * s, -0.025 * s, skin,
    { sx: 0.13 * s, sy: 0.09 * s, sz: 0.17 * s });
  const thigh = new Weld();
  thigh.add(P.cap, 0, -0.21 * s, 0, cloth,
    { sx: 0.20 * s, sy: 0.34 * s, sz: 0.18 * s });
  const shin = new Weld();
  shin.add(P.cap, 0, -0.20 * s, 0, cloth,
    { sx: 0.17 * s, sy: 0.33 * s, sz: 0.15 * s });
  shin.add(P.box, 0, -0.43 * s, -0.07 * s, SEAM,
    { sx: 0.21 * s, sy: 0.11 * s, sz: 0.32 * s });

  return {
    shell: w.geometry('standing-shell'),
    eyes: eyeGeometry(headY, s, sockZ, 0.057),
    limb: upper.geometry('standing-upper'), fore: fore.geometry('standing-fore'),
    thigh: thigh.geometry('standing-thigh'), shin: shin.geometry('standing-shin'),
    joints: [
      { x: -0.225 * s, y: shoulderY - 0.015 * s, z: 0, fore: -0.30 * s },
      { x: 0.215 * s, y: shoulderY - 0.085 * s, z: 0, fore: -0.30 * s },
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


/* ------------------------------------------------------------------- MOTH --
   ROUND 18. ALEX: "A freaky horror moth that kinds of blends into trees in the forest.
   And then can fly. Not too high. But fly."

   THE READ, in order, at four distances:
     40 m  nothing. It is a dark patch on a dark trunk.
     14 m  a shape with a texture that does not match the bark behind it.
      6 m  the wings open and it is enormous — 2.4 m across, against a 1.15 m body.
      2 m  a face, and the face is the wrong shape for anything that should be flying.

   The wings are the whole animal. They are big triangular sheets hinged at the thorax, and
   they are the LIMBS — bodies.js's rig gives every joint a pivot and an optional elbow, so
   a wing is one pivot (the shoulder) and one fore section (the outer half), and the
   'flutter' gait beats them. Four limb joints, one geometry, four draws: no more than the
   hound's legs cost.

   Every value here is under the night-value law. The wings sit at bark, and the eye is the
   dullest in the roster on purpose. It is HIDING. */
function buildMoth(def) {
  const s = def.height / 1.15;
  const w = new Weld();
  const cloth = def.cloth, skin = def.skin, bone = def.bone;
  const bodyY = 0.58 * s;

  // A furred thorax and a long segmented abdomen trailing behind it. The abdomen is what
  // makes it an INSECT at silhouette range instead of a bird.
  w.add(P.sph, 0, bodyY, -0.02 * s, skin,
    { sx: 0.34 * s, sy: 0.36 * s, sz: 0.46 * s });
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    w.add(P.sph, 0, bodyY - t * 0.10 * s, (0.26 + i * 0.16) * s, i % 2 ? cloth : skin,
      { sx: (0.28 - t * 0.13) * s, sy: (0.26 - t * 0.12) * s, sz: 0.20 * s });
  }
  // Collar: fur where the wings meet the body, so the hinge is not a seam.
  //
  // MEASURED and REPLACED. The first cut was a RING of eight cones round the thorax, and
  // photographed at 6 m (tools/bodylook.mjs) it read as a sunburst — a radial fan of spikes
  // with the wings lost inside it, which is a sea urchin and not a moth. A moth's silhouette
  // is TWO PAIRS OF SHEETS and nothing else may compete with that. So: a squashed collar and
  // a short tuft over the shoulders only, all of it behind the wing line.
  w.add(P.sph, 0, bodyY + 0.08 * s, -0.14 * s, bone,
    { sx: 0.36 * s, sy: 0.30 * s, sz: 0.20 * s });
  for (const side of [-1, 1]) {
    w.add(P.cone3, side * 0.19 * s, bodyY + 0.19 * s, -0.06 * s, bone,
      { rx: -0.95, rz: side * 0.45, sx: 0.12 * s, sy: 0.24 * s, sz: 0.10 * s });
  }

  // THE HEAD. Not a moth's head. Two plumed antennae, a blunt face and no mouth you can
  // find — the "freaky horror" half of the ask is that it is built like an insect and
  // looks at you like a person.
  const headY = bodyY + 0.10 * s;
  w.add(P.sph, 0, headY, -0.40 * s, skin, { sx: 0.25 * s, sy: 0.25 * s, sz: 0.26 * s });
  w.add(P.sph, 0, headY - 0.02 * s, -0.53 * s, VOID, { sx: 0.19 * s, sy: 0.17 * s, sz: 0.14 * s });
  for (const side of [-1, 1]) {
    // The plume: five short barbs down a curving shaft, sweeping BACK over the thorax and
    // kept LOW. Seven long ones stood up over the head and were half of what made the
    // folded moth read as a fan of spikes; an antenna is a detail you find at 3 m, not a
    // second silhouette competing with the wings at 30.
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      w.add(P.cone3, side * (0.09 + t * 0.20) * s, headY + (0.11 + t * 0.10) * s,
        (-0.44 + t * 0.30) * s, bone,
        { rx: -0.9 + t * 0.5, rz: side * (0.95 + t * 0.35),
          sx: 0.030 * s, sy: (0.16 - t * 0.05) * s, sz: 0.018 * s });
    }
    // palps either side of the face, hooked inward
    w.add(P.cone3, side * 0.13 * s, headY - 0.13 * s, -0.50 * s, bone,
      { rx: -1.10, rz: side * -0.34, sx: 0.055 * s, sy: 0.24 * s, sz: 0.055 * s });
  }

  // Six hooked legs, TUCKED UNDER. They are welded, not jointed: the limb slots are spent on
  // the wings, and a flying thing's legs do not swing — they hang.
  //
  // MEASURED, and this is what the sea-urchin actually was. The first cut splayed them at
  // 0.85 and 1.45 rad — 49 and 83 degrees off the body — in `bone`, the palest colour on the
  // animal. Twelve pale blades radiating from the thorax is the fan the photographs kept
  // showing, and it survived two fixes aimed at the wings and the collar because the wings
  // were never the problem. Now: half the splay, two thirds the length, and in `cloth`, so
  // the legs are something you find at 3 m rather than the first thing you see at 30.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = (-0.14 + i * 0.20) * s;
      w.add(P.cap, side * 0.17 * s, bodyY - 0.23 * s, z, cloth,
        { rz: side * 0.42, rx: -0.15 + i * 0.15, sx: 0.045 * s, sy: 0.22 * s, sz: 0.045 * s });
      w.add(P.cone3, side * 0.25 * s, bodyY - 0.38 * s, z + 0.02 * s, cloth,
        { rz: side * 0.72, rx: 0.30, sx: 0.032 * s, sy: 0.17 * s, sz: 0.032 * s });
    }
  }

  const eyesW = new Weld();
  for (const side of [-1, 1]) {
    // Two compound domes, wide apart and low — the wrong spacing for a face, which is
    // the thing you notice before you notice what it is.
    eyesW.add(P.sphLo, side * 0.155 * s, headY + 0.01 * s, -0.50 * s, 0xffffff,
      { sx: 0.070 * GLINT_SCALE * s, sy: 0.055 * GLINT_SCALE * s, sz: 0.030 * GLINT_SCALE * s });
  }

  // THE WING, built once and instanced four times (fore pair, hind pair). It runs out along
  // +Y from its pivot, because the rig rotates a limb about x at the pivot and the `fore`
  // section hangs off `j.fore` metres along that same axis.
  //
  // THE SHEET IS THE SHAPE, AND THE VEINS ARE DARKER THAN IT. The first cut had it the other
  // way round — a near-black `cloth` sheet with three `bone` veins across it — and at 5 m
  // the veins were the only thing bright enough to see, so four wings photographed as twelve
  // pale blades radiating out of the thorax. Every fix aimed at the pose left that alone
  // because the pose was never the fault. The sheet is `skin` now (still Y 0.007, still far
  // under the sky) and the veins are `cloth`, so what you resolve first is a WING.
  const wing = new Weld();
  const membrane=wingMembrane();
  wing.add(membrane,0,0,0,skin,{sx:s,sy:s,sz:s});
  // two veins THROUGH the sheet, darker than it, so it is a wing and not a paddle
  for(let i=0;i<5;i++){
    const x=-.26+i*.112;
    const vein=tendon([[0,.03,.012],[x*.48,.30,.035],[x,.60+(.20-Math.abs(x)*.5),.026]],.006,.0025,20,6);
    wing.add(vein,0,0,0,cloth,{sx:s,sy:s,sz:s});vein.dispose();
  }
  const wingFore = new Weld();
  wingFore.add(membrane,0,0,0,skin,{sx:s*.85,sy:s*.83,sz:s});membrane.dispose();
  // The one pale mark on the whole animal: an eyespot near the tip, which is a real moth's
  // trick and reads at exactly the distance the wings first open.
  wingFore.add(P.sphLo, 0.11 * s, 0.42 * s, 0.030 * s, bone,
    { sx: 0.14 * s, sy: 0.17 * s, sz: 0.02 * s });
  wingFore.add(P.sphLo,.11*s,.42*s,.043*s,cloth,{sx:.083*s,sy:.105*s,sz:.011*s});
  wingFore.add(P.box, 0, 0.20 * s, 0.012 * s, cloth,
    { sx: 0.030 * s, sy: 0.42 * s, sz: 0.020 * s });

  return {
    shell: w.geometry('moth-shell'),
    eyes: eyesW.geometry('moth-eyes'),
    limb: wing.geometry('moth-wing'),
    fore: wingFore.geometry('moth-wing-outer'),
    joints: [
      // forewings, then hindwings. `fore` is where the outer section hinges.
      { x: -0.26 * s, y: bodyY + 0.12 * s, z: -0.10 * s, fore: 0.62 * s },
      { x: 0.26 * s, y: bodyY + 0.12 * s, z: -0.10 * s, fore: 0.62 * s },
      { x: -0.24 * s, y: bodyY + 0.02 * s, z: 0.18 * s, fore: 0.52 * s },
      { x: 0.24 * s, y: bodyY + 0.02 * s, z: 0.18 * s, fore: 0.52 * s },
    ],
    zones: [
      { x: 0, y: headY, z: -0.46 * s, r: 0.24 * s, zone: 'head' },
      { x: 0, y: bodyY, z: 0, r: 0.34 * s, zone: 'torso' },
      { x: 0, y: bodyY - 0.04 * s, z: 0.52 * s, r: 0.26 * s, zone: 'vent' },
    ],
    gait: 'flutter',
  };
}

/* ----------------------------------------------------------------- SPIDER --
   ROUND 18. ALEX: "a giant spider that crawls on ceiling and drops off."

   Eight legs on four joint slots. The rig gives one pivot and one elbow per slot, and a
   spider's leg is exactly that shape (femur out and UP, tibia back down off the knee), so
   each slot carries a MIRRORED PAIR welded into one geometry rather than eight slots.
   The body is low and wide — a 1.44 m span on a 1.05 m height — so hanging over you it
   fills a doorway.

   It is built to be seen FROM UNDERNEATH, which is the only angle that matters for a thing
   on a ceiling: the pale sternum plate, the leg sockets and the fangs are all on the belly. */
function buildSpider(def) {
  const s = def.height / 1.05;
  const w = new Weld();
  const cloth = def.cloth, skin = def.skin, bone = def.bone;
  const bodyY = 0.46 * s;

  // Abdomen behind, cephalothorax in front, joined by a visible waist.
  w.add(P.sph, 0, bodyY + 0.04 * s, 0.34 * s, cloth,
    { sx: 0.66 * s, sy: 0.54 * s, sz: 0.78 * s });
  w.add(P.cyl, 0, bodyY, 0.02 * s, bone, { rx: 1.57, sx: 0.16 * s, sy: 0.22 * s, sz: 0.16 * s });
  w.add(P.sph, 0, bodyY, -0.28 * s, skin, { sx: 0.56 * s, sy: 0.40 * s, sz: 0.56 * s });
  // The belly plate: bone, and the thing you are looking straight at while it is overhead.
  w.add(P.sph, 0, bodyY - 0.16 * s, -0.24 * s, bone,
    { sx: 0.40 * s, sy: 0.12 * s, sz: 0.40 * s });
  for (let i = 0; i < 4; i++) {
    w.add(P.box, 0, bodyY - 0.20 * s, (0.12 + i * 0.17) * s, bone,
      { sx: (0.30 - i * 0.05) * s, sy: 0.05 * s, sz: 0.09 * s });
  }
  // Spinnerets at the back of the abdomen.
  for (const side of [-1, 1]) {
    w.add(P.cone3, side * 0.09 * s, bodyY - 0.05 * s, 0.72 * s, bone,
      { rx: 1.30, rz: side * 0.2, sx: 0.075 * s, sy: 0.20 * s, sz: 0.075 * s });
  }
  // Fangs, folded in, and the palps either side of them.
  for (const side of [-1, 1]) {
    w.add(P.cone, side * 0.11 * s, bodyY - 0.14 * s, -0.52 * s, bone,
      { rx: -2.30, rz: side * 0.16, sx: 0.085 * s, sy: 0.40 * s, sz: 0.085 * s });
    w.add(P.cap, side * 0.27 * s, bodyY - 0.06 * s, -0.44 * s, skin,
      { rx: -1.05, rz: side * 0.30, sx: 0.085 * s, sy: 0.26 * s, sz: 0.085 * s });
  }

  const eyesW = new Weld();
  // EIGHT EYES, in the real arrangement: a row of four across the front, two pairs above.
  // It is the one part of this animal that is unmistakable at a glance.
  for (let i = 0; i < 4; i++) {
    const x = (-0.135 + i * 0.09) * s;
    const big = i === 1 || i === 2;
    eyesW.add(P.sphLo, x, bodyY + 0.10 * s, -0.50 * s, 0xffffff,
      { sx: (big ? 0.042 : 0.030) * GLINT_SCALE * s,
        sy: (big ? 0.042 : 0.030) * GLINT_SCALE * s,
        sz: 0.020 * GLINT_SCALE * s });
  }
  for (const side of [-1, 1]) {
    eyesW.add(P.sphLo, side * 0.075 * s, bodyY + 0.20 * s, -0.46 * s, 0xffffff,
      { sx: 0.036 * GLINT_SCALE * s, sy: 0.036 * GLINT_SCALE * s, sz: 0.020 * GLINT_SCALE * s });
    eyesW.add(P.sphLo, side * 0.175 * s, bodyY + 0.16 * s, -0.42 * s, 0xffffff,
      { sx: 0.028 * GLINT_SCALE * s, sy: 0.028 * GLINT_SCALE * s, sz: 0.018 * GLINT_SCALE * s });
  }

  // ONE LEG PAIR per joint slot: femur running out and up from the socket, so the knee is
  // ABOVE the body the way a spider's is, and the tibia comes back down off the elbow.
  // MEASURED, from the first frame of it standing on the station forecourt: the first cut
  // put the femur at 0.62 rad off vertical and the whole animal read as a sea urchin —
  // eight spikes going up and nothing reaching the ground. A spider's femur is nearly
  // HORIZONTAL and the knee is only just proud of the body; the length is in the tibia,
  // which is what comes down to the floor. 1.02 rad and a longer, straighter shin.
  const femur = new Weld();
  for (const fs of [-1, 1]) {
    femur.add(P.cap, fs * 0.34 * s, 0.20 * s, 0, skin,
      { rz: fs * -1.02, sx: 0.085 * s, sy: 0.82 * s, sz: 0.085 * s });
    // a hard knee knuckle, so the joint is a joint and not a bend in a tube
    femur.add(P.sphLo, fs * 0.62 * s, 0.34 * s, 0, bone,
      { sx: 0.085 * s, sy: 0.085 * s, sz: 0.085 * s });
  }
  const tibia = new Weld();
  for (const side of [-1, 1]) {
    tibia.add(P.cap, side * 0.62 * s, -0.34 * s, 0, cloth,
      { rz: side * -0.14, sx: 0.058 * s, sy: 0.96 * s, sz: 0.058 * s });
    // the foot hook, which is what it hangs off the ceiling by
    tibia.add(P.cone3, side * 0.70 * s, -0.80 * s, 0, bone,
      { rz: side * -1.9, rx: 0.25, sx: 0.042 * s, sy: 0.22 * s, sz: 0.042 * s });
  }

  return {
    shell: w.geometry('spider-shell'),
    eyes: eyesW.geometry('spider-eyes'),
    limb: femur.geometry('spider-femur'),
    fore: tibia.geometry('spider-tibia'),
    joints: [
      // Four sockets down the flank; each carries a mirrored pair, so eight legs. The
      // elbow sits at the knee knuckle the femur weld puts at 0.34 up, and the fore
      // section hangs from there — that is where the shin has to start or the leg has a
      // visible break in it.
      { x: 0, y: bodyY, z: -0.30 * s, fore: 0.34 * s },
      { x: 0, y: bodyY, z: -0.10 * s, fore: 0.34 * s },
      { x: 0, y: bodyY, z: 0.10 * s, fore: 0.34 * s },
      { x: 0, y: bodyY, z: 0.30 * s, fore: 0.34 * s },
    ],
    zones: [
      { x: 0, y: bodyY + 0.10 * s, z: -0.36 * s, r: 0.30 * s, zone: 'head' },
      { x: 0, y: bodyY + 0.04 * s, z: 0.34 * s, r: 0.42 * s, zone: 'torso' },
      { x: 0, y: bodyY - 0.16 * s, z: -0.24 * s, r: 0.22 * s, zone: 'vent' },
    ],
    gait: 'scuttle',
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
  if(key==='marrow')return buildMarrow(rng);
  const def = SPECIES[key];
  if (def.human) return buildHuman(key, Math.floor(rng.next()*4), def.height);
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
    if (j.scaleY) pivot.scale.y = j.scaleY;
    group.add(pivot);
    const upper = new THREE.Mesh(set.limb, shell);
    upper.castShadow = false;
    pivot.add(upper);
    let elbow = null;
    if (set.fore && j.fore !== undefined) {
      elbow = new THREE.Group();
      elbow.position.y = j.fore;
      elbow.position.z = j.foreZ || 0;
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

    animate(a) { ANIMATE[set.gait](parts, a); if (a.limp > 0) limpen(parts, a); },

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

/* ROUND 18, THE LIMP PASS. Alex: "I want more ragdolling."
 *
 * `a.limp` is 0 while alive and walks to 1 over about 200 ms once the body is a corpse.
 * Every gait below runs first and then hands its result to this, which drags each joint
 * toward a slack, hanging pose and adds a slow swing off `a.time` so the limbs keep
 * moving after the body has stopped. It is the cheapest honest ragdoll there is: no
 * solver, no constraints, no per-body allocation — the joints simply stop being held.
 *
 * The pose it goes to is DOWN and slightly splayed, because a dropped arm hangs behind
 * the shoulder and a dropped leg trails. A rig frozen in its last live pose is what made
 * a kill look like somebody switching a puppet off, which is the note. */
function limpen(parts, a) {
  const k = a.limp;
  if (!(k > 0)) return;
  const t = a.time || 0;
  for (let i = 0; i < parts.limbs.length; i++) {
    const L = parts.limbs[i], side = i % 2 ? 1 : -1;
    // hang, plus a swing that is slower and wider on one side than the other so the two
    // arms never agree — two arms that agree is a doll, and this is meant to be a body.
    const sw = Math.sin(t * (2.1 + i * 0.37) + i * 1.9) * 0.30 * k;
    L.pivot.rotation.x += ((0.24 + sw) - L.pivot.rotation.x) * k;
    L.pivot.rotation.z += ((side * 0.42) - L.pivot.rotation.z) * k;
    if (L.elbow) L.elbow.rotation.x += ((-0.85 + sw * 0.6) - L.elbow.rotation.x) * k;
  }
  for (let i = 0; i < parts.legs.length; i++) {
    const L = parts.legs[i];
    const sw = Math.sin(t * (1.7 + i * 0.29) + i * 2.4) * 0.22 * k;
    L.pivot.rotation.x += ((-0.30 + sw) - L.pivot.rotation.x) * k;
    if (L.knee) L.knee.rotation.x += ((0.55 - sw * 0.5) - L.knee.rotation.x) * k;
  }
  // the head/torso drops with everything else
  parts.shellMesh.rotation.x += (0.20 - parts.shellMesh.rotation.x) * k;
  parts.eyeMesh.rotation.x = parts.shellMesh.rotation.x;
}

const ANIMATE = {
  trot(parts, a) {
    for (let i = 0; i < parts.limbs.length; i++) {
      const ph = a.gait + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : Math.PI * 0.5);
      const limb=parts.limbs[i],step=Math.sin(ph);
      limb.pivot.rotation.x = step*.50*a.moveAmp+a.coil*.16;
      if(limb.elbow)limb.elbow.rotation.x=-Math.max(0,-Math.sin(ph-.30))*.95*a.moveAmp-a.coil*.22;
    }
    // the coil: it draws BACK before it lunges, which is the silhouette change
    parts.shellMesh.position.z = a.coil * 0.24;
    parts.shellMesh.rotation.x = a.coil * -0.34 + Math.sin(a.gait * 2) * 0.035 * a.moveAmp;
    parts.shellMesh.scale.y=1+Math.sin((a.time||0)*2.2)*.007*(1-a.moveAmp);
    parts.eyeMesh.position.z = parts.shellMesh.position.z;
    parts.eyeMesh.rotation.x = parts.shellMesh.rotation.x;
    parts.eyeMesh.scale.y=parts.shellMesh.scale.y;
  },

  /* ROUND 22. THE RUNNER. The trot's legs at a faster cycle, and two things the hound does
     not do: the telegraph is a CROUCH — the body drops and the nose goes down, which is the
     silhouette change that buys its 0.38 s — and the dash STRETCHES the shell along its own
     spine (swing, fed by enemies.js present() for attackKind 'dash'), so at 13.5 m/s it reads
     as something pouring past you rather than a hound played fast. */
  dash(parts, a) {
    for (let i = 0; i < parts.limbs.length; i++) {
      const ph = a.gait * 1.35 + (i % 2 ? Math.PI : 0) + (i < 2 ? 0 : Math.PI * 0.5);
      const limb=parts.limbs[i];
      limb.pivot.rotation.x = Math.sin(ph)*.76*a.moveAmp+a.coil*.28;
      if(limb.elbow)limb.elbow.rotation.x=-Math.max(0,-Math.sin(ph-.22))*1.18*a.moveAmp-a.coil*.42;
    }
    const sh = parts.shellMesh;
    sh.position.y = -a.coil * 0.16;
    sh.position.z = a.coil * 0.10;
    sh.rotation.x = -a.coil * 0.50 + Math.sin(a.gait * 2) * 0.03 * a.moveAmp + a.swing * 0.12;
    sh.scale.z = 1 + a.swing * 0.15;
    const ey = parts.eyeMesh;
    ey.position.y = sh.position.y; ey.position.z = sh.position.z;
    ey.rotation.x = sh.rotation.x; ey.scale.z = sh.scale.z;
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
      const tension=Math.sin((a.time||0)*(i?7.1:5.3)+i)*.012*(1-a.moveAmp);
      L.pivot.rotation.z = (i ? 1 : -1) * (0.12 + a.coil * (i?.26:.34))+tension;
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

  /* ROUND 18. THE MOTH. The four limbs are its wings, and the whole read of the animal is
     which of two states they are in:
       CLOSED  (moveAmp 0, coil 0) — folded flat back over the abdomen, which is the shape
               that disappears against a trunk. This is the resting pose and it is what you
               are looking at without knowing it.
       BEATING (moveAmp > 0)      — a fast, shallow, slightly irregular beat. The forewings
               and hindwings run a quarter-cycle apart so the pair never snaps like a
               shutter, and the amplitude is keyed to how fast it is actually going.
     The windup (coil) is the wings coming UP AND HELD, over the back, which is a silhouette
     change legible at range in the dark — that is what buys this thing its 0.46 s telegraph. */
  flutter(parts, a) {
    const beat = a.time * 15.5;
    // MEASURED at 6 m with tools/bodylook.mjs, twice. The first two cuts of the FOLDED pose
    // splayed the four wings apart (rotation.y +-0.55, rotation.z +-0.22) and the moth
    // photographed as a radial fan of blades — a sea urchin, not a moth at rest. A resting
    // moth is a NARROW TENT: the wings lie back flat along the abdomen, nearly on top of one
    // another, and the whole animal is a slim wedge you could mistake for a knot in bark.
    // That mistake is the entire point of the species, so the folded pose is the one that
    // has to be right, not the flying one.
    for (let i = 0; i < parts.limbs.length; i++) {
      const L = parts.limbs[i];
      const side = i % 2 ? 1 : -1;
      const hind = i > 1;
      const open = Math.max(a.moveAmp, a.coil * 0.8, a.swing);
      const flap = Math.sin(beat + (hind ? 1.55 : 0) + i * 0.11) * (0.34 + 0.30 * a.moveAmp);
      const shut = 1 - open;
      // closed: 8-10 degrees off the spine. open: out to the side, beating.
      L.pivot.rotation.z = side * (shut * (hind ? 0.10 : 0.16) + open * (hind ? 1.06 : 1.30)
        + flap * open);
      // closed: laid back 78 degrees so the sheets run down over the abdomen.
      L.pivot.rotation.x = shut * 1.36 - 0.15 * open + a.coil * -1.15 + a.swing * 0.5;
      L.pivot.rotation.y = side * shut * 0.14;
      if (L.elbow) L.elbow.rotation.x = -0.20 - shut * 0.30 + flap * open * 0.55;
    }
    // The thorax pitches nose-down as it drives forward, and rears back on the windup.
    parts.shellMesh.rotation.x = a.moveAmp * 0.24 - a.coil * 0.46 + a.swing * 0.34;
    parts.shellMesh.rotation.z = a.bank * 0.55;
    parts.eyeMesh.rotation.x = parts.shellMesh.rotation.x;
    parts.eyeMesh.rotation.z = parts.shellMesh.rotation.z;
  },

  /* ROUND 18. THE SPIDER. Four joint slots, each a mirrored pair, so the phase pattern has
     to make eight legs out of four numbers: alternating tetrapod, which is what a real
     spider does — slots 0 and 2 swing while 1 and 3 plant. The knee stays ABOVE the body
     throughout, because a spider whose legs hang below it is a crab. */
  scuttle(parts, a) {
    for (let i = 0; i < parts.limbs.length; i++) {
      const L = parts.limbs[i];
      const ph = a.gait * 1.6 + (i % 2 ? Math.PI : 0);
      const step = Math.sin(ph) * 0.52 * a.moveAmp;
      L.pivot.rotation.x = step - a.coil * 0.30;
      // the reach: the knee lifts on the swing half and drops on the stance half
      L.pivot.rotation.z = Math.max(0, Math.cos(ph)) * 0.34 * a.moveAmp + a.coil * 0.55;
      if (L.elbow) L.elbow.rotation.x = -0.28 - Math.max(0, -Math.sin(ph)) * 0.62 * a.moveAmp;
    }
    // It crouches to strike and the fangs come round with the body.
    parts.shellMesh.rotation.x = -a.coil * 0.34 + a.swing * 0.72;
    parts.shellMesh.rotation.z = a.bank * 0.28;
    parts.shellMesh.position.y = -a.coil * 0.10;
    parts.eyeMesh.rotation.x = parts.shellMesh.rotation.x;
    parts.eyeMesh.rotation.z = parts.shellMesh.rotation.z;
    parts.eyeMesh.position.y = parts.shellMesh.position.y;
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
