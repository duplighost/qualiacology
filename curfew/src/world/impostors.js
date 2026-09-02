// =============================================================================
// CURFEW - impostors: an 8-angle tree atlas baked AT BOOT from the same
// templates the near ring instances, plus the one merged camera-facing card
// mesh that draws every tree past CFG.flora.impostorFrom.
// Owner: flora. Written by flora.js only; nothing else constructs this.
// =============================================================================
//
// WHY THIS EXISTS AT ALL, AND WHY IT LANDS IN M0
// ----------------------------------------------
// DESIGN §8: "8-angle impostor atlas baked at boot from the templates, used
// from 180 m - no external tree art needed. Impostors and prefix culling land
// in M0, not later." 400 m of visible forest is the identity of the county at
// night; a 4x4 chunk group (256 m) of real instanced trees is thousands of
// draws' worth of geometry for pixels that are 70 px tall. One card mesh per
// 4x4 group makes that whole ring cost ~16 draw calls.
//
// The atlas is BAKED, not authored: each template is rendered from
// CFG.flora.impostorAngles yaw angles into one render target, so the impostor
// is, by construction, the same tree the near ring draws. There is no external
// tree art on this machine and there is not going to be any for M0.
//
// THE TWO FAULTS THIS FILE IS BUILT TO AVOID
// ------------------------------------------
// 1. ALPHA COVERAGE LOSS IN MIPS. A plain box mip of an alpha-cut foliage sheet
//    loses coverage every level, so a distant tree thins into nothing and the
//    horizon goes bald exactly where the impostor is supposed to be doing the
//    work. Fixed the way CINDERBLOOM fixes it: every mip level's alpha is
//    rescaled by a binary search so the fraction of texels above alphaTest is
//    the same as level 0's (cinderbloom/src/world/flora.js:517-548,
//    buildCoveragePreservingMips).
// 2. PER-INSTANCE POP. A card that appears the instant a tree crosses 180 m is
//    a visible line in the forest. The card material culls per instance with a
//    stable position hash against a smoothstep band, so the swap is hundreds of
//    trees changing representation at slightly different distances - a
//    dissolve, not a line (cinderbloom/src/world/flora.js:34-39, 1104-1116).
//    flora.js's tree material uses the EXACT SAME hash and band with the test
//    inverted, so every tree is drawn by exactly one of the two, never both and
//    never neither.
//
// COLOUR
// ------
// The bake scene carries its own hemisphere + directional + ambient lights that
// mirror the CFG.lights census values, and they are torn down before the first
// frame - they never enter ctx.scene, so the pinned light census is untouched.
// The card material is UNLIT (MeshBasicMaterial): the lighting is already in
// the texels, so lighting it again would double it. The card's `color` is
// re-tinted each frame by flora.js from the moon, which is what keeps a 200 m
// tree in step with a 100 m one as the night turns.
//
// THE COLOUR SPACE — corrected 2026-09-02 by measurement, and it was ART.md
// §2.7's whole "the far ring is 2.6x darker than the ring it replaces".
//
// This header used to say: "the renderer writes the bake gamma-encoded (its
// default output space) and the texture is tagged SRGBColorSpace so three
// decodes it back to linear on sample - the encode and the decode are a matched
// pair." Twice re-verified, and WRONG, because renderer.outputColorSpace applies
// to the CANVAS and not to a render target. Read it in the vendored bundle
// rather than believing either version of this comment:
//
//   outputColorSpace: null === U ? t.outputColorSpace
//                   : (true === U.isXRRenderTarget ? U.texture.colorSpace : qe)
//   ... where  qe = "srgb-linear"
//
// U is the current render target. For any target that is not an XR target, r161
// writes SRGB-LINEAR and does not consult rt.texture.colorSpace at all. The
// atlas bytes are therefore LINEAR, and tagging the DataTexture SRGBColorSpace
// made three sRGB-DECODE data that was never encoded - a second decode, applied
// to values that live at 0.03-0.06 linear, where the sRGB curve is steepest.
// That is a ~5x darkening, worst exactly in the darks a night forest is made of.
//
// Measured like-for-like at the handover band (the shared dissolve band driven
// to [20,30] so every tree past 30 m draws as a card, then to [400,500] so the
// SAME trees at the SAME distance under the SAME fog draw as geometry, and the
// pixels that differ compared - n = 20,173 in frame A):
//
//                                  frame A    frame B
//   card : geometry, SRGBColorSpace   0.203      0.204     far ring ~5x too dark
//   card : geometry, NoColorSpace     1.244      1.132     ART.md §2.7: 0.80-1.25
//
// No scalar correction is applied to the card colour and none is needed: §2.7
// allows one only if the bake cannot be matched, and it can. The far ring lands
// slightly ABOVE the geometry it hands over from, which is the right side of 1.0
// to be on - the bake carries no shadow map and no per-tree tint, so a baked
// tree is a fully lit one, and a far ring that takes on a little of the sky as
// it recedes is aerial perspective rather than a seam. Frame A at 1.244 is at
// the top of the gate; if a later round moves the mid ring, re-measure this
// before assuming it still passes.
//
// THE PRECISION ARGUMENT IS STILL REAL, and now points somewhere else. 8-bit
// LINEAR does quantise coarsely across the 0.02-0.10 albedo range: one code step
// near 0.04 linear is about three display codes after ACES and the grade. The
// place to fix that is the RENDER TARGET's type (HalfFloatType), not the
// texture's colour-space tag, because by the time readRenderTargetPixels()
// returns a Uint8Array the precision is already gone and no amount of re-tagging
// brings it back. Not done this round: the impostors are 150 m+, alpha-cut, and
// fogged, and a 4.9x value error is a worse picture than a quantised one. If
// banding shows up on the treeline, that is the lever.
//
// Two things this note does NOT change, both re-verified:
//   - The BAKE never reads the runtime moon. Its key is the local
//     DirectionalLight below, whose direction is position - target with the
//     default target at the origin, so it is exactly the authored
//     (0.45, 1.0, 0.35).
//   - The RUNTIME tint (setTint, driven from flora.present) is a function of the
//     moon's COLOUR and INTENSITY only, never its direction.
// =============================================================================

import * as THREE from 'three';
import CFG from '../config.js';

// Supersample factor for the bake. The atlas is rendered at CELL_SS and box-
// filtered down to CELL once, which is where the silhouette antialiasing comes
// from - a multisampled render target cannot be read back reliably here, and a
// hard-edged 128 px tree crawls in motion.
const CELL_SS = 256;
const CELL = 128;

// ART.md §2.5 wants CFG.flora.impostorFrom 180 -> 150. CONFIG IS NOT THIS
// LANE'S FILE, so the new value lives here until the integrator applies it, and
// it is requested under "CONFIG CHANGES FOR THE INTEGRATOR" in docs/HANDOFF.md.
// It is exported rather than duplicated because flora.js's tree material and
// this file's card material must agree BIT FOR BIT on the dissolve band - two
// copies of 150 that drift apart is a forest where trees are drawn twice or not
// at all. When the config key lands, delete this and read CFG in both places.
export const IMPOSTOR_FROM = 150;

// Module scratch. Nothing in here allocates once bake() has returned.
const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();
const _clearCol = new THREE.Color();
const _vp = new THREE.Vector4();
const _sc = new THREE.Vector4();

/**
 * Box-halve an RGBA byte image, weighting RGB by ALPHA. Returns { data, width, height }.
 *
 * THE THIRD FAULT, found by measurement on 2026-09-02 and the reason the far
 * ring was 5x too dark. A straight per-channel box average mixes the RGB of
 * transparent texels into the result. The bake clears to (0,0,0,0), so every
 * texel outside the silhouette is BLACK, and a foliage cell is mostly outside
 * the silhouette - so each mip level pulled the tree's colour toward zero
 * again, compounding all the way down. At the handover band the card samples a
 * coarse level, which is exactly where the darkening is worst.
 *
 * HONEST SCORE, because this was written as a hypothesis and then measured, and
 * the measurement did not agree. Like-for-like at the handover band (the shared
 * dissolve band driven to [20,30] so every tree past 30 m is a card, then to
 * [400,500] so the SAME trees at the SAME distance under the SAME fog are
 * geometry, and the pixels that differ compared):
 *     plain box average   card : geometry = 0.198   (n = 20,176, frame A)
 *     alpha-weighted      card : geometry = 0.203   (n = 20,173)
 * +2.5%, which is noise against a 5x fault. The 5x was the colour-space
 * round-trip - see the header. This filter is kept because black-into-foliage
 * bleed is a real artefact and this is the correct way to downsample a cutout
 * sheet, NOT because it fixed anything measurable. Alpha itself still averages
 * straight: coverage is a separate quantity and holdCoverage() rescales it.
 */
function boxHalf(src, w, h) {
  const nw = Math.max(1, w >> 1);
  const nh = Math.max(1, h >> 1);
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const y0 = Math.min(h - 1, y * 2), y1 = Math.min(h - 1, y * 2 + 1);
    for (let x = 0; x < nw; x++) {
      const x0 = Math.min(w - 1, x * 2), x1 = Math.min(w - 1, x * 2 + 1);
      const a = (y0 * w + x0) * 4, b = (y0 * w + x1) * 4;
      const c = (y1 * w + x0) * 4, d = (y1 * w + x1) * 4;
      const o = (y * nw + x) * 4;
      const wa = src[a + 3], wb = src[b + 3], wc = src[c + 3], wd = src[d + 3];
      const sum = wa + wb + wc + wd;
      if (sum > 0) {
        for (let k = 0; k < 3; k++) {
          out[o + k] = Math.min(255, Math.round(
            (src[a + k] * wa + src[b + k] * wb + src[c + k] * wc + src[d + k] * wd) / sum));
        }
      } else {
        for (let k = 0; k < 3; k++) out[o + k] = (src[a + k] + src[b + k] + src[c + k] + src[d + k] + 2) >> 2;
      }
      out[o + 3] = (wa + wb + wc + wd + 2) >> 2;
    }
  }
  return { data: out, width: nw, height: nh };
}

/** Fraction of texels whose alpha clears the cutoff. */
function coverageOf(data, cut) {
  let c = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] >= cut) c++;
  return c / (data.length >> 2);
}

/**
 * Rescale a level's alpha so its coverage matches `cov0`.
 * Binary search on a multiplier, 14 iterations - lifted from CINDERBLOOM
 * flora.js:530-545. Without this the horizon thins out with distance.
 */
function holdCoverage(data, cov0, cut) {
  if (cov0 <= 1e-5) return;
  let lo = 0.5, hi = 8.0;
  for (let it = 0; it < 14; it++) {
    const s = (lo + hi) * 0.5;
    let c = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] * s >= cut) c++;
    if (c / (data.length >> 2) > cov0) hi = s; else lo = s;
  }
  const s = (lo + hi) * 0.5;
  for (let i = 3; i < data.length; i += 4) data[i] = Math.min(255, Math.round(data[i] * s));
}

/**
 * Full mip chain down to 1x1, every level holding level 0's coverage.
 * The chain MUST reach 1x1: a texture with a mipmap min-filter and a missing
 * tail level is mipmap-incomplete in GLES3 and samples pure black.
 */
function coveragePreservingChain(base, w, h, cut) {
  const cov0 = coverageOf(base, cut);
  const mips = [{ data: base, width: w, height: h }];
  let cur = base, cw = w, ch = h;
  while (cw > 1 || ch > 1) {
    const m = boxHalf(cur, cw, ch);
    holdCoverage(m.data, cov0, cut);
    mips.push(m);
    cur = m.data; cw = m.width; ch = m.height;
  }
  return mips;
}

export class ImpostorBank {
  constructor(ctx) {
    this.ctx = ctx;
    this.angles = Math.max(2, CFG.flora.impostorAngles | 0);
    this.texture = null;
    this.material = null;
    this.baked = false;
    this.reason = 'not baked';
    // Per template: half-width and height in metres at scale 1, so a card can
    // be sized from the instance scale alone.
    this.sizes = [];
    this._proto = null;   // shared quad attributes for every card mesh
    this._meshes = new Set();
    // Distance band for the geometry -> card dissolve. flora.js reads these
    // back so the two materials cannot drift apart.
    const from = IMPOSTOR_FROM;          // was CFG.flora.impostorFrom; see the note above

    const hyst = CFG.flora.lodHysteresis;
    this.band = new THREE.Vector2(from * (1 - hyst), from * (1 + hyst));
  }

  /**
   * Render every template from `angles` yaw directions into one atlas.
   * templates: [{ geometry, halfWidth, height }] - geometry in local space,
   * base at the origin, growing +Y.
   */
  bake(templates) {
    const renderer = this.ctx.renderer;
    if (!renderer || !templates.length) {
      this.reason = renderer ? 'no templates' : 'no renderer at bake time';
      this._fallbackMaterial(templates.length);
      return false;
    }

    const cols = this.angles;
    const rows = templates.length;
    const wSS = cols * CELL_SS, hSS = rows * CELL_SS;

    const rt = new THREE.WebGLRenderTarget(wSS, hSS, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });

    // --- bake scene ---------------------------------------------------------
    // Its lights live and die inside this function. They are NOT part of the
    // census in gfx/lights.js and never reach ctx.scene.
    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(CFG.lights.hemi.sky, CFG.lights.hemi.ground, CFG.lights.hemi.intensity);
    const moon = new THREE.DirectionalLight(CFG.lights.moon.colour, CFG.lights.moon.intensity);
    // A high, slightly off-axis key so the bake carries a readable light/shade
    // split instead of a flat card. Direction is arbitrary but FIXED: every
    // angle of every template is baked under the same key, so the whole far
    // ring is internally consistent.
    //
    // This is a POSITION only because the default target sits at the origin and
    // never moves: three takes the direction as position - target.matrixWorld,
    // which here is exactly (0.45, 1.0, 0.35). That is why this line is safe
    // while the identical-looking read in flora.present() was not - the runtime
    // moon's target rides the PLAYER, so its position alone means nothing.
    moon.position.set(0.45, 1.0, 0.35).multiplyScalar(100);
    const amb = new THREE.AmbientLight(CFG.lights.ambient.colour, CFG.lights.ambient.intensity);
    scene.add(hemi, moon, amb);

    const bakeMat = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false });
    const holder = new THREE.Mesh(templates[0].geometry, bakeMat);
    scene.add(holder);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);

    // --- save every piece of renderer state we are about to touch -----------
    const prevRT = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    const prevTone = renderer.toneMapping;
    const prevScissorTest = renderer.getScissorTest();
    const prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(_clearCol);
    const prevShadow = renderer.shadowMap.enabled;
    renderer.getViewport(_vp);
    renderer.getScissor(_sc);
    const prevVp = _vp.clone();
    const prevSc = _sc.clone();

    renderer.setRenderTarget(rt);
    renderer.autoClear = false;
    // No tone mapping in the bake: post applies ACES to the card later, exactly
    // as it does to the real trees. Tone-mapping twice reads as washed-out
    // treeline that will not go away no matter what the grade does.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(0x000000, 0);
    renderer.setScissorTest(false);
    renderer.clear(true, true, false);
    renderer.setScissorTest(true);

    for (let r = 0; r < rows; r++) {
      const tpl = templates[r];
      holder.geometry = tpl.geometry;

      // Frame the template exactly. A 2% margin keeps the silhouette off the
      // cell edge so the mip chain cannot bleed one tree into its neighbour.
      const hw = Math.max(0.35, tpl.halfWidth) * 1.02;
      const ht = Math.max(0.5, tpl.height) * 1.02;
      this.sizes[r] = { halfWidth: hw, height: ht };

      cam.left = -hw; cam.right = hw;
      cam.top = ht; cam.bottom = 0;
      cam.near = 0.1; cam.far = 4000;

      for (let c = 0; c < cols; c++) {
        const yaw = (c / cols) * Math.PI * 2;
        // Camera sits on the ring at yaw and looks at the trunk mid-height.
        // atan2(dirToCamera.x, dirToCamera.z) recovers exactly this yaw in the
        // card shader, which is how a cell is chosen at draw time.
        const dist = Math.max(hw, ht) * 3 + 20;
        _v0.set(Math.sin(yaw) * dist, ht * 0.5, Math.cos(yaw) * dist);
        _v1.set(0, ht * 0.5, 0);
        cam.position.copy(_v0);
        cam.up.set(0, 1, 0);
        cam.lookAt(_v1);
        cam.updateProjectionMatrix();
        cam.updateMatrixWorld(true);

        const vx = c * CELL_SS, vy = r * CELL_SS;
        renderer.setViewport(vx, vy, CELL_SS, CELL_SS);
        renderer.setScissor(vx, vy, CELL_SS, CELL_SS);
        renderer.render(scene, cam);
      }
    }

    // --- read back, downsample once, build coverage-preserving mips ---------
    const raw = new Uint8Array(wSS * hSS * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, wSS, hSS, raw);

    // restore BEFORE any of the CPU work below, so a throw cannot strand the
    // renderer pointed at our render target.
    renderer.setScissorTest(prevScissorTest);
    renderer.setRenderTarget(prevRT);
    renderer.setViewport(prevVp);
    renderer.setScissor(prevSc);
    renderer.autoClear = prevAutoClear;
    renderer.toneMapping = prevTone;
    renderer.shadowMap.enabled = prevShadow;
    renderer.setClearColor(_clearCol, prevAlpha);
    rt.dispose();
    scene.remove(holder, hemi, moon, amb);
    hemi.dispose(); moon.dispose(); amb.dispose();
    bakeMat.dispose();

    const cut = CFG.flora.alphaTest * 255;
    const level0 = boxHalf(raw, wSS, hSS);
    holdCoverage(level0.data, coverageOf(raw, cut), cut);
    const mips = coveragePreservingChain(level0.data, level0.width, level0.height, cut);

    const tex = new THREE.DataTexture(mips[0].data, mips[0].width, mips[0].height, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.name = 'curfew-impostor-atlas';
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = false;
    tex.mipmaps = mips;
    // LINEAR, because the render target's contents ARE linear. See the header.
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;

    this.texture = tex;
    this.cols = cols;
    this.rows = rows;
    this.material = this._makeMaterial(cols, rows, tex);
    this.baked = true;
    this.reason = 'ok';
    this._buildProto();
    return true;
  }

  /**
   * If there is no renderer we still need a material so flora.js has one code
   * path. An untextured card would be the PALEHOLLOW black-rectangle bug at
   * 200 m, so this one is fully transparent instead: no far ring, but nothing
   * wrong on screen either. Reported through stats().
   */
  _fallbackMaterial(rows) {
    this.cols = this.angles;
    this.rows = Math.max(1, rows);
    this.material = new THREE.MeshBasicMaterial({ visible: false });
    this.material.name = 'curfew-impostor-null';
    this.baked = false;
    this._buildProto();
  }

  _makeMaterial(cols, rows, tex) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      vertexColors: true,      // instanced per-tree tint
      transparent: false,
      alphaTest: CFG.flora.alphaTest,
      side: THREE.DoubleSide,  // the card is one quad; both faces must draw
      fog: true,
      depthWrite: true,
    });
    mat.name = 'curfew-impostor';

    // Inset so a mip level cannot pull a neighbouring cell's texels across a
    // boundary. Half a texel at the coarsest level we actually sample.
    const eps = 1.5 / CELL;
    this.uniforms = {
      uAtlasStep: { value: new THREE.Vector2(1 / cols, 1 / rows) },
      uAtlasIn: { value: new THREE.Vector4(1 - eps * 2, 1 - eps * 2, eps, eps) },
      uFarBand: { value: this.band },
      uAngles: { value: cols },
    };

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uAtlasStep = this.uniforms.uAtlasStep;
      shader.uniforms.uAtlasIn = this.uniforms.uAtlasIn;
      shader.uniforms.uFarBand = this.uniforms.uFarBand;
      shader.uniforms.uAngles = this.uniforms.uAngles;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        [
          '#include <common>',
          'attribute vec3 aPos;',
          'attribute vec2 aSize;',
          'attribute float aYaw;',
          'attribute float aTpl;',
          'uniform vec2 uAtlasStep;',
          'uniform vec4 uAtlasIn;',
          'uniform vec2 uFarBand;',
          'uniform float uAngles;',
          'vec3 impFwd;',
        ].join('\n')
      );

      // The angle cell must be picked before the uv chunk has finished, so this
      // rides on <uv_vertex>. vMapUv exists because the material has a map.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        [
          '#include <uv_vertex>',
          '{',
          '  vec3 tcam = cameraPosition - aPos;',
          '  tcam.y = 0.0;',
          '  impFwd = normalize(tcam + vec3(1e-4, 0.0, 0.0));',
          '  float vang = atan(impFwd.x, impFwd.z) - aYaw;',
          '  float cell = floor(mod(vang * (uAngles / 6.28318530718) + 0.5, uAngles));',
          '  vMapUv = (vec2(cell, aTpl) + uAtlasIn.zw + vMapUv * uAtlasIn.xy) * uAtlasStep;',
          '}',
        ].join('\n')
      );

      // Cylindrical billboard: world up stays up so trunks never shear.
      // The per-instance hash is the same expression flora.js's tree material
      // uses, with the test inverted, so a tree is drawn by exactly one of the
      // two representations. Positions are wrapped to 512 m first so the sin()
      // argument stays small enough to be reproducible on both sides.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        [
          'vec3 transformed;',
          '{',
          '  float dcam = length(cameraPosition.xz - aPos.xz);',
          '  float sfar = smoothstep(uFarBand.x, uFarBand.y, dcam);',
          '  vec2 wp = mod(aPos.xz, 512.0);',
          '  float hfar = fract(sin(dot(wp, vec2(41.317, 289.113))) * 43758.5453);',
          '  if (sfar < hfar) {',
          '    transformed = vec3(0.0);',   // zero-area triangle: no fragments
          '  } else {',
          '    vec3 rgt = normalize(cross(vec3(0.0, 1.0, 0.0), impFwd));',
          '    transformed = aPos + rgt * (position.x * aSize.x) + vec3(0.0, position.y * aSize.y, 0.0);',
          '  }',
          '}',
        ].join('\n')
      );
    };

    // MANDATORY. Two materials with identical `parameters` share a program no
    // matter what onBeforeCompile did (cinderbloom/src/engine/renderer.js:753-757).
    mat.customProgramCacheKey = () => 'curfew-impostor-card';
    return mat;
  }

  /** Shared quad: x in [-0.5, 0.5], y in [0, 1], uv 0..1 with v=0 at the base. */
  _buildProto() {
    const base = new THREE.PlaneGeometry(1, 1);
    base.translate(0, 0.5, 0);
    this._proto = {
      index: base.index,
      position: base.attributes.position,
      uv: base.attributes.uv,
      normal: base.attributes.normal,
    };
    this._protoGeo = base;
  }

  /**
   * One merged card mesh for a whole 4x4 chunk group - ONE draw call for
   * 256 x 256 m of forest. flora.js packs the arrays; every one of them holds
   * exactly `count` entries at its own item size.
   *   pos   3f  world anchor at the tree BASE (must equal the tree's xz exactly,
   *             or the shared dissolve hash disagrees and trees blink)
   *   size  2f  half-width, height in metres, instance scale already applied
   *   yaw   1f  the tree's own Y rotation
   *   tpl   1f  template row in the atlas
   *   tint  3f  per-tree colour multiply (attribute name is 'color')
   * `bounds` is [minX,minY,minZ,maxX,maxY,maxZ] for the frustum sphere.
   * Returns a THREE.Mesh, or null when there is nothing to draw.
   */
  makeCardMesh(pos, size, yaw, tpl, tint, count, bounds) {
    if (!count || !this._proto) return null;
    const g = new THREE.InstancedBufferGeometry();
    g.index = this._proto.index;
    g.setAttribute('position', this._proto.position);
    g.setAttribute('uv', this._proto.uv);
    g.setAttribute('normal', this._proto.normal);
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 2));
    g.setAttribute('aYaw', new THREE.InstancedBufferAttribute(yaw, 1));
    g.setAttribute('aTpl', new THREE.InstancedBufferAttribute(tpl, 1));
    g.setAttribute('color', new THREE.InstancedBufferAttribute(tint, 3));
    g.instanceCount = count;

    // Hand-authored bounds: the quad's own positions are meaningless here
    // because the billboard is built in the vertex shader from aPos.
    _box.min.set(bounds[0], bounds[1], bounds[2]);
    _box.max.set(bounds[3], bounds[4], bounds[5]);
    _box.getBoundingSphere(_sphere);
    g.boundingBox = _box.clone();
    g.boundingSphere = _sphere.clone();

    const mesh = new THREE.Mesh(g, this.material);
    mesh.name = 'flora-impostors';
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // Far ring draws after the near geometry so the alpha-test kills are cheap.
    mesh.renderOrder = 1;
    this._meshes.add(mesh);
    return mesh;
  }

  releaseMesh(mesh) {
    if (!mesh) return;
    this._meshes.delete(mesh);
    // The prototype attributes are shared; only the instanced ones are ours.
    const g = mesh.geometry;
    for (const name of ['aPos', 'aSize', 'aYaw', 'aTpl', 'color']) {
      const a = g.getAttribute(name);
      if (a) g.deleteAttribute(name);
    }
    g.index = null;
    g.dispose();
  }

  /** Card tint follows the moon so a 200 m tree does not drift from a 100 m one. */
  setTint(r, g, b) {
    if (this.material && this.material.color) this.material.color.setRGB(r, g, b);
  }

  dispose() {
    for (const m of this._meshes) {
      if (m.parent) m.parent.remove(m);
      this.releaseMesh(m);
    }
    this._meshes.clear();
    if (this._protoGeo) { this._protoGeo.dispose(); this._protoGeo = null; }
    this._proto = null;
    if (this.material) { this.material.dispose(); this.material = null; }
    if (this.texture) { this.texture.dispose(); this.texture = null; }
  }
}

export default ImpostorBank;
