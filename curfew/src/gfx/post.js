// post — VIGIL's measured chain, with STILL's shadow-protected grade on the end.
// Manifest #15, so it is constructed after everything that draws.
//
//   HalfFloat MSAA x4 render target
//     -> RenderPass
//     -> OverlayPass       (ART.md 1.8 / 6.1: the gun, INSIDE the chain — see OverlayPass)
//     -> UnrealBloomPass   (CFG.render.bloom: threshold 1.05, so ONLY true emissives bloom)
//     -> OutputPass        (ACES + sRGB; reads renderer.toneMapping/exposure)
//     -> ShaderPass GRADE  (display space: split tone, contrast, floor, grain, vignette, dither)
//
// Chain lifted from vigil/src/gfx/post.js:45-66; GRADE lifted from
// still/src/game/postfx.js:12-57.
//
// THE GRADE IS SHADOW-PROTECTED. Contrast is applied only from luma
// CFG.render.grade.contrastFrom (0.03) UP to contrastTo (0.30), so the shadows keep their
// raw values. A plain pivot-0.5 filmic curve steals what little light the dim scenery has —
// everything under ~0.2 sinks toward black — which is exactly MARROW's unreadable moonlit
// distance and cost a round to find. Dark must read as SHAPE, not as void.
//
// The Bayer dither is not decoration: a frame that is almost entirely between 0 and 0.05
// quantises to two or three distinct 8-bit levels and bands in visible rings.
//
// GLSL laws honoured here: no backtick anywhere inside a template literal (it closes the JS
// string and the page dies with a lineless error naming no file), and no identifier named
// flat, half or sat.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { CFG } from '../config.js';

const G = CFG.render.grade;

/* ---- ART.md 1.7 — the contrast window ---------------------------------------
 * contrastFrom (0.03) and blackFloor (0.006) are on the UNTOUCHABLE list (ART.md 0.6):
 * STILL and MARROW's shadow-protected curve, and a plain pivot-0.5 filmic crushed MARROW's
 * moonlit distance and cost a whole round to find. contrastTo and contrast MAY move, and
 * ART.md 1.7 says where to: 0.30 -> 0.42 and 1.10 -> 1.16.
 *
 * ART.md 1.7 GATES THIS ON 2.1, 2.2 AND 1.1 HAVING LANDED FIRST, and the order is the whole
 * point: nothing added at the end of the chain can put values into a band the scene never
 * generated (ART.md 0.2). Checked on disk before applying — flora.js now carries
 * GRASS_TINT_MUL in place of the * 16, barkBirch [0.100,0.097,0.089] and barkSnag
 * [0.145,0.138,0.127]; 1.1 is in this lane's sky.js. All three preconditions met.
 *
 * MEASURED, frame A, world columns, one rAF, grain zeroed, all three lanes' work in:
 *
 *     contrastTo/contrast   48-127   below 8   ground band   over 200
 *     0.30 / 1.10 (was)      1.02%     13.6%       34.4         0.75%
 *     0.42 / 1.16 (ART 1.7)  1.19%     13.6%       35.2         1.12%
 *     0.55 / 1.22 (probe)    2.06%     13.6%       36.1         1.48%
 *
 * AND THE HONEST READING OF THAT TABLE: the window is not the fault. 1.19% against a target
 * of 12% is the histogram barely moving, which ART.md 1.7 itself names as the tell — the
 * scene is still not generating mid-tones. It does not COST anything (below 8 is unmoved and
 * the ground band stays inside 28-36), so 1.7 is applied as written; but the missing eleven
 * points live in ART.md 3.1's ground break-up and 2.6's canopy, not here. The probe row is
 * left in deliberately: going further buys 0.9 more points of form and 0.36 more points of
 * blown highlight, which is a bad trade, and 0.42 is the right stopping place.
 */
const CONTRAST_TO = 0.42;     // ART.md 1.7, was CFG.render.grade.contrastTo 0.30
const CONTRAST = 1.16;        // ART.md 1.7, was CFG.render.grade.contrast 1.10

/**
 * ART.md 1.8 / 6.1 — THE VIGNETTE MUST NOT STOP AT THE GUN.
 *
 * The viewmodel used to be drawn by main.js AFTER the whole composite (weapons/viewmodel.js
 * render(), hooked through ctx.overlays). Sitting in the corner of the frame where the
 * vignette is strongest, it received no vignette (0.28), no black floor, no contrast curve
 * and no grain — and the grain stopping dead at the gun's silhouette is a tell you cannot
 * unsee once you have looked for it.
 *
 * gfx owns the pass order, so the fix is here rather than in the weapons lane's file: the
 * overlays are drawn INTO THE HDR TARGET, with depth cleared, between RenderPass and
 * UnrealBloomPass. From there the gun gets the same ACES, the same bloom threshold, the same
 * grade, the same vignette and the same grain as everything else.
 *
 * Three facts this depends on, all checked rather than assumed:
 *  1. RenderPass.needsSwap is false and it renders into readBuffer (vendor/jsm RenderPass.js
 *     :22, :62), so readBuffer is where the world is when we run — including its depth.
 *  2. three applies renderer.toneMapping IN THE MATERIAL only while the current render
 *     target is null (vendor/three.module.min.js: s.toneMapped && (null!==U && ...|| vt =
 *     t.toneMapping). Drawing to screen, the gun was ACES'd in its own shader; drawing
 *     into the target it is not, and OutputPass ACES's it with the world instead. One tone
 *     curve either way — no double-grade.
 *  3. viewmodel.render() is idempotent per frame (it early-returns on ctx.time.frame), so
 *     main.js's own post-composite call becomes a no-op and NOTHING in the weapons lane's
 *     file has to change. If post is disabled, main.js draws the gun exactly as before.
 *
 * The overlay does its own autoClear/clearDepth dance; all this pass owns is WHICH BUFFER.
 */
class OverlayPass extends Pass {
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.needsSwap = false;     // we draw onto the world, we do not consume and replace it
  }

  render(renderer, writeBuffer, readBuffer) {
    const ov = this.ctx.overlays;
    if (!ov || ov.length === 0) return;
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    for (let i = 0; i < ov.length; i++) ov[i]();
    renderer.setRenderTarget(prevTarget);
  }
}

const GradeShader = {
  name: 'CurfewGrade',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    // emotion channels, all 0 in M0 and driven by the director in M1
    uDread: { value: 0 },
    uPulse: { value: 0 },
    uTunnel: { value: 0 },
    // the grade proper
    uContrastFrom: { value: G.contrastFrom },
    uContrastTo: { value: CONTRAST_TO },
    uContrast: { value: CONTRAST },
    // ROUND 7, LANE E — THE SHOULDER WAS FLATTENING EVERY LIGHT IN THE GAME.
    //
    // These were 0.30 and 0.70, and that is a 1.4:1 compression applied to the ENTIRE top
    // half of the display range. Arithmetic, and it is the whole finding:
    //
    //     in     old (0.30/0.70)     new (0.50/0.90)
    //      77          77                  77
    //     128         111                 128
    //     179         128                 162
    //     217         136                 175
    //     255         141                 184
    //
    // Everything from 128 to 255 came out between 111 and 141. NOTHING IN CURFEW COULD BE
    // BRIGHT. That single curve is a large part of three separate entries on docs/NEXT.md:
    // B2 (the claim lever and the Bell Tower glint never reach the screen), B6 ("everything
    // is one flat blue except the lamp cones and the pumps, and the pumps are the brightest
    // objects in the frame"), and B4 (the boss reads "fully lit" with no value on it). A
    // lamp, a muzzle flash, a glint, a claimed place's lit windows and the moon all landed
    // within thirty luminance points of each other, which is the definition of no value
    // structure at the top end.
    //
    // The shoulder is still here and it is still doing its job — ART.md 1.9's torch, which
    // reached a near-ground p95 of 211.6 and clipped at 252.6, is what it was built for. It
    // is a SHOULDER now instead of a ceiling: nothing clips to paper (255 still lands at
    // 184) and the range from 128 up is available again. Measured after, frame by frame, in
    // docs/ROUND-7/HANDOFF-E.md.
    uKnee: { value: 0.50 },
    uShoulder: { value: 0.90 },
    uBlackFloor: { value: G.blackFloor },
    uGrain: { value: G.grain },
    uVignette: { value: G.vignette },
    // ROUND 7 lane E: local contrast. See the shader.
    uLocal: { value: 0.34 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime, uDread, uPulse, uTunnel;
    uniform float uContrastFrom, uContrastTo, uContrast, uBlackFloor, uGrain, uVignette;
    uniform float uKnee, uShoulder, uLocal;

    float hash12(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // 4x4 ordered Bayer, built from floats only. GLSL ES 1.00 forbids dynamic indexing of
    // a local array and has no integer bit ops, so the usual lookup table is not portable.
    float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
    float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));

      // --- LOCAL CONTRAST: the torch must CARVE, not wash -----------------------
      // Four diagonal taps at ~2.6 px, averaged, subtracted, added back. This is the one
      // operator that can put edge separation into a frame whose whole problem is that
      // large areas sit at the same value: a trunk against the fog behind it, the boss
      // against the wall it is standing on, the near ground under the torch hotspot. A
      // global contrast curve cannot do it — it moves both sides of the edge together, and
      // ART.md 1.7 measured exactly that (the 48-127 band moved 1.02% -> 1.19% for a whole
      // window widening).
      //
      // WEIGHTED, on purpose, at both ends. In the near-black it would amplify the grain
      // and the dither into crawling static; at the top it would ring a white halo around
      // the moon and the lamps. So it lives in the mid tones, which is where shape lives.
      vec2 tap = 2.6 / max(uResolution, vec2(1.0));
      vec3 blur = texture2D(tDiffuse, vUv + vec2( tap.x,  tap.y)).rgb
                + texture2D(tDiffuse, vUv + vec2(-tap.x,  tap.y)).rgb
                + texture2D(tDiffuse, vUv + vec2( tap.x, -tap.y)).rgb
                + texture2D(tDiffuse, vUv + vec2(-tap.x, -tap.y)).rgb;
      float localW = smoothstep(0.030, 0.150, lum) * (1.0 - smoothstep(0.56, 0.92, lum));
      col += (col - blur * 0.25) * uLocal * localW;
      col = max(col, vec3(0.0));
      lum = dot(col, vec3(0.2126, 0.7152, 0.0722));

      // --- shadow-protected filmic contrast -------------------------------------
      vec3 curved = (col - 0.5) * (uContrast + uPulse * 0.06 + uDread * 0.10) + 0.5;
      col = mix(col, curved, smoothstep(uContrastFrom, uContrastTo, lum));

      // --- highlight shoulder ---------------------------------------------------
      // The mirror image of the shadow protection above, and the answer to the one thing
      // MARROW is remembered for: "all I see is the flashlight on the wall". The torch's
      // 560 candela are Alex's approved numbers and are pinned (ART.md 0.6), so a lamp that
      // blows out at three metres cannot be fixed by dimming it — measured, the near ground
      // under the torch reached p95 218 against a 170 ceiling and the frame clipped at 254.
      // Everything below the knee passes through untouched, which is the whole point of the
      // shadow-protected curve; above it, the excess is compressed toward uShoulder on a
      // smooth Reinhard rolloff, so a lit surface keeps its shape instead of clipping to
      // paper. It is applied to the LUMINANCE and scaled back onto the colour, so the
      // torch's warmth survives the compression.
      float over = max(0.0, lum - uKnee);
      if (over > 0.0) {
        float headroom = max(1e-3, uShoulder - uKnee);
        float rolled = headroom * over / (over + headroom);
        col *= (uKnee + rolled) / max(lum, 1e-4);
        lum = uKnee + rolled;
      }

      // --- split tone: cool shadows, warm highlights [still postfx.js:32-34] ----
      float hi = smoothstep(0.28, 0.88, lum);
      col = mix(col * vec3(0.90, 0.95, 1.07), col * vec3(1.07, 1.01, 0.90), hi);

      // --- halation on the brightest spots only --------------------------------
      col += vec3(1.0, 0.72, 0.42) * smoothstep(0.66, 1.10, lum) * (0.02 + uPulse * 0.10);

      // --- black floor: nothing ever reaches a dead zero ------------------------
      col = max(col, vec3(uBlackFloor));

      // --- vignette, AND IT IS NOT A BLACK RING --------------------------------
      // A plain multiply is a black ring: it takes the corner to zero and the corner stops
      // holding shape, which in a game this dark means the outer sixth of the frame is
      // simply gone. A lens does not do that. It loses a little light, it loses
      // SATURATION, and what is left goes cooler because the coating passes blue at the
      // edge of the field. So: desaturate 45% toward a cold neutral, then take 62% of the
      // authored darkening. Total corner loss is ~17% instead of ~28%, and the corner still
      // reads.
      vec2 p = vUv - 0.5;
      float r = length(p) * (1.0 + uTunnel * 0.55);
      float vg = smoothstep(0.22, 0.92, r);
      float amt = uVignette * vg;
      float vl = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 edge = mix(col, vec3(vl) * vec3(0.84, 0.91, 1.10), 0.45) * (1.0 - amt * 0.62);
      col = mix(col, edge, vg);
      col = mix(col, vec3(0.05, 0.0, 0.02), uDread * smoothstep(0.35, 0.85, r) * 0.5);

      // --- grain: FILM GRAIN, NOT VIDEO NOISE, then dither ----------------------
      // Two things separate one from the other, and the old single per-pixel hash had
      // neither. (1) A CELL. Grain is silver crystals, not pixels; at renderScale 0.75 a
      // one-pixel hash is resampled to the display and reads as shimmer. Most of the weight
      // goes on a 1.6 px cell, the rest on the per-pixel hash so the cell never shows its
      // grid. (2) A CURVE. Film has no grain in the clear base and very little in the
      // shoulder; it is loudest in the mid tones. Weighting it that way is also what stops
      // it from crawling in the 40% of a CURFEW frame that sits under luminance 15, which
      // is where an even grain looks like broken hardware.
      vec2 cell = floor(gl_FragCoord.xy / 1.6);
      float g1 = hash12(cell + vec2(uTime * 53.0, uTime * 31.0));
      float g2 = hash12(gl_FragCoord.xy + vec2(uTime * 97.0, uTime * 23.0));
      float gr = (g1 - 0.5) * 0.74 + (g2 - 0.5) * 0.26;
      float gw = 0.26 + 0.96 * smoothstep(0.012, 0.13, lum) * (1.0 - smoothstep(0.40, 0.92, lum));
      col += gr * (uGrain + uDread * 0.045) * gw;
      col += (bayer4(gl_FragCoord.xy) - 0.5) / 255.0;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export class Post {
  static id = 'post';

  constructor(ctx) {
    this.ctx = ctx;
    this.enabled = true;
    this.composer = null;
    this.bloom = null;
    this.grade = null;
    this.overlay = null;
    this.renderPass = null;
    this.target = null;
    this._unsub = null;
    this._size = new THREE.Vector2();
  }

  async init() {
    // gfx is read here at init, never captured at construction.
    const gfx = this.ctx.systems.get('gfx');
    if (!gfx) throw new Error('post: gfx system missing');
    const renderer = this.ctx.renderer;
    renderer.getDrawingBufferSize(this._size);
    const w = Math.max(1, this._size.x);
    const h = Math.max(1, this._size.y);

    // HalfFloat so bloom has real HDR headroom above 1.0; samples 4 is the MSAA that the
    // WebGL context does NOT ask for (renderer.js opens with antialias:false).
    this.target = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.target.texture.name = 'curfew.hdr';

    const composer = new EffectComposer(renderer, this.target);
    this.renderPass = new RenderPass(this.ctx.scene, this.ctx.camera);
    composer.addPass(this.renderPass);

    // ART.md 1.8 — the gun joins the frame here, before bloom and before the grade.
    this.overlay = new OverlayPass(this.ctx);
    composer.addPass(this.overlay);

    const B = CFG.render.bloom;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), B.strength, B.radius, B.threshold);
    composer.addPass(this.bloom);

    composer.addPass(new OutputPass());

    this.grade = new ShaderPass(GradeShader);
    composer.addPass(this.grade);

    this.composer = composer;

    // gfx owns resize; we only listen. onResize fires immediately with the current size,
    // so the first frame is never mis-sized.
    this._unsub = gfx.onResize((pw, ph) => {
      this.composer.setSize(pw, ph);
      this.grade.uniforms.uResolution.value.set(pw, ph);
    });
  }

  /**
   * TRUE while this post chain will warm every overlay system's programs against its own HDR
   * buffer (see _warmOverlays). An overlay owner may skip its own unbound compile when this
   * is true and save the duplicate screen-variant programs: measured 64 -> 69 at boot today,
   * five dead programs against a CFG.render.budget.programsMax of 72. Requested of the
   * weapons lane in docs/HANDOFF.md; harmless either way.
   */
  willWarmOverlays() { return !!this.composer; }

  /** The HDR buffer the world and the overlays are composited into. Read-only handle. */
  hdrTarget() { return this.composer ? this.composer.readBuffer : null; }

  /** M1's channels. Kept as one door so the director never reaches into uniforms. */
  setDread(v) { this.grade.uniforms.uDread.value = v; }
  setPulse(v) { this.grade.uniforms.uPulse.value = v; }
  setTunnel(v) { this.grade.uniforms.uTunnel.value = v; }
  setEnabled(on) { this.enabled = !!on; }

  /**
   * ART.md 1.7's door. contrastFrom and blackFloor are NOT here and never will be: they are
   * on the untouchable list (ART.md 0.6). Pass either value as undefined to leave it.
   * A live-tune knob for the round that lands flora 2.1/2.2 — not a shipping default.
   */
  setGrade(contrastTo, contrast) {
    const u = this.grade.uniforms;
    if (typeof contrastTo === 'number' && isFinite(contrastTo)) u.uContrastTo.value = contrastTo;
    if (typeof contrast === 'number' && isFinite(contrast)) u.uContrast.value = contrast;
  }

  present(alpha) {
    // Grain must crawl on wall-clock time or it freezes into a static texture during
    // hitstop and reads as a dropped frame.
    this.grade.uniforms.uTime.value = this.ctx.time ? this.ctx.time.t : 0;
  }

  /** Called by gfx.render(). Never call this and renderer.render() in the same frame. */
  render() {
    const dt = (this.ctx.time && this.ctx.time.dt) || CFG.loop.FIXED;
    // Re-read the live camera every frame. RenderPass would otherwise hold whatever
    // camera existed at init, and a system that REPLACED ctx.camera instead of mutating
    // it would render from a corpse. (ctx.camera must be mutated, never replaced —
    // see HANDOFF.md.)
    this.renderPass.camera = this.ctx.camera;
    this.renderPass.scene = this.ctx.scene;
    this.composer.render(dt);
  }

  /**
   * One full pass through the chain so every post program is linked behind the title
   * fade rather than on the first frame of play (DESIGN §8: zero links after frame 60).
   *
   * ART.md 1.8 made this job bigger. three bakes the render target into a program: it
   * applies renderer.toneMapping in the material only while the current target is null, so
   * a material compiled while drawing to the SCREEN is a different program from the same
   * material drawn into the HDR buffer. An overlay system warms itself (main.js calls every
   * warmup() in manifest order) while nothing is bound, which linked the screen variants —
   * and then the first frame of play drew it into our buffer and linked the target variants
   * instead. Measured by tests/lights.mjs: 68 -> 69 programs DURING PLAY, which is the
   * multi-hundred-millisecond freeze that test exists to catch. So we bind the buffer and
   * ask every overlay-shaped system to warm again.
   */
  warmup() {
    this._warmOverlays();
    this.composer.render(CFG.loop.FIXED);
  }

  /**
   * Re-run the warmup of every system that draws its own private Scene, with our HDR buffer
   * bound, so its programs link against the target the OverlayPass will actually draw into.
   *
   * The test is structural rather than a name: a system that owns a Scene which is NOT
   * ctx.scene, plus its own camera, is by definition one that renders itself rather than
   * being rendered by RenderPass — which is exactly what an overlay is. Nothing here knows
   * that the weapons lane exists, and a lane that adds a second overlay is warmed for free.
   *
   * Its own warmup() is called rather than renderer.compile() directly, because compile()
   * walks traverseVisible and a pooled or hidden object (a muzzle flash) is skipped: only
   * the owner knows what to reveal first. That is MARROW's lesson, already written into
   * main.js:404-405, applied one level down.
   */
  _warmOverlays() {
    const r = this.ctx.renderer;
    const systems = this.ctx.systems;
    if (!r || !systems || !this.composer) return;
    const prev = r.getRenderTarget();
    try {
      r.setRenderTarget(this.composer.readBuffer);
      for (const s of systems.values()) {
        if (s === this || !s || typeof s.warmup !== 'function') continue;
        const sc = s.scene, cam = s.camera;
        if (!sc || !sc.isScene || sc === this.ctx.scene) continue;
        if (!cam || !cam.isCamera) continue;
        s.warmup();
      }
    } finally {
      r.setRenderTarget(prev);
    }
  }

  ready() { return !!(this.composer && this.grade && this.bloom && this.overlay); }

  dispose() {
    if (this._unsub) this._unsub();
    if (this.composer) this.composer.dispose();
    if (this.bloom) this.bloom.dispose();
    if (this.grade) this.grade.dispose();
    if (this.target) this.target.dispose();
  }
}

export default Post;
