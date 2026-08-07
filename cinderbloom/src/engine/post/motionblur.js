// =============================================================================
// CINDERBLOOM — camera + object motion blur. Frame graph order 80.
// Owner: motion-blur agent. Spec: docs/RENDER_PLAN.md §9. Contract: §5.
// =============================================================================
//
// Gather-based reconstruction (McGuire/Hennessy/Bukowski/Osman 2012, with
// Jimenez's CoD:AW alternating-direction refinement). Camera motion and object
// motion come from the SAME buffer — `gVel` already contains both, so there is
// no separate object pass and no per-object velocity geometry.
//
// ## Shape of the pass
//
//   1. `renderer.js` builds the 20 px velocity tile-max + 3x3 neighbour-max at
//      order ~9 (we declare `inputs: ['tiles']`, which is what makes it build
//      them at all — declare or you read nothing).
//   2. This pass reads `gbuf.sceneHDR` (TAA's resolve if TAA is registered,
//      otherwise MRT attachment 0), `gbuf.gVel`, `gbuf.gViewZ` and
//      `gbuf.tiles`, gathers along the tile's neighbour-max, and writes a
//      pooled full-res RGBA16F.
//   3. We then REASSIGN `gbuf.sceneHDR` to that texture. DOF (90), bloom (100)
//      and grade (110) — and renderer.js's fallback ACES blit — pick it up with
//      no change on their side. renderer.js rebuilds `gbuf.sceneHDR` from the
//      MRT at the top of every frame, so this is a per-frame retarget, not a
//      mutation that leaks.
//
// ## Shutter, in real units — a RECORDED DEVIATION from RENDER_PLAN §9.2
//
// `mb.shutterAngle` is degrees of a rotary shutter: 180° is the film standard
// and the default. Exposure time is `angle / 360 / 60` seconds
// (`mb.shutterSeconds` reports it — 8.3 ms at 180°).
//
// §9.2 claims "`gVel` is already per-frame, so no dt scaling — the blur length
// is frame-rate independent by construction". That is FALSE and it was the
// cause of the first human playtest report ("too much motion blur when turning
// on the higher graphics settings"): renderer.js copies `prevView` once per
// RENDERED frame, so `gVel` spans one rendered frame, and the fixed-1/60 sim
// takes SEVERAL steps between renders when the frame is slow. Measured with
// tools/_mbturn.mjs at a fixed 1.2 rad/s turn: the same turn that streaks
// 8.5 px at 60 fps streaks 25 px at 21.5 fps ('high' on Alex's machine) and
// pins the 48 px clamp at 12.5 fps — the heavier the preset, the slower the
// frame, the longer the smear. Exactly what the player reported.
//
// So the shutter is now TIME-based (`mb.shutterTimeBased`, default true): the
// velocity scale is `shutterSeconds / dtRendered` (capped at 1), where
// dtRendered is the sim time the current gVel actually spans, measured as the
// `ctx.time.elapsed` delta between executes. At 60 fps that is exactly the old
// `angle/360`; at 20 fps it is a third of it, and the streak length for a
// given rotation SPEED is the same at every frame rate. `false` restores the
// legacy frame-fraction shutter for A/B.
//
// ## Camera-rotation damping
//
// Shipped-FPS practice: look-around is the player's primary act and must stay
// crisp — camera-ROTATION blur is heavily damped while translation and object
// blur carry the effect. `mb.cameraRotationScale` (default 0.25) scales the
// rotational component only: the analytic rotation flow (`cbSkyVel`, which is
// depth-independent, so it is exact for every static texel, not just sky) is
// subtracted from the stored velocity at `1 - scale` strength. Translation
// flow and true object motion survive untouched. Viewmodel texels are exempt
// (their velocity is gun-local, order-60 camera swap — see renderer.js) and
// already run the shorter `viewmodelScale` shutter. 1.0 = off (legacy).
//
// Internally every velocity is carried as a HALF-EXTENT in pixels: the sample
// span is `[-hv, +hv]` around the pixel, so the visible streak length equals
// `mb.maxBlurPx` when clamped. That keeps §9.2's "48 px at 1080p = 4.4% of
// screen height" literally true.
//
// ## Why the gun is not blurry
//
// Three things, all required:
//   1. Viewmodel texels (flag bit 0) get their velocity multiplied by
//      `mb.viewmodelScale` (0.35) — a much shorter shutter, per §9.6. A gun
//      smearing at full strength through a reload reads as broken, not
//      cinematic.
//   2. A tap whose viewmodel bit differs from the centre's is rejected
//      outright (`w = 0`). That is the hard edge at the gun silhouette: the
//      world never smears into the gun and the gun never smears into the world.
//   3. renderer.js builds the tile grid BEFORE order 60, so the viewmodel's
//      velocity is not in the tile-max at all. Gun tiles therefore usually take
//      the early-out. We still take `max(tile, own)` per pixel so the reduced
//      viewmodel velocity is honoured when it is genuinely large.
//
// Flag bit 2 (NO_MOTION_BLUR — muzzle flash, decals, anything art already
// smeared) is both a passthrough for the pixel itself and a `w = 0` rejection
// as a source.
//
// ## Sky
//
// `sky.js` does not write velocity yet (renderer.js DEVIATION 4 masks the
// dome's draw buffers, so sky texels keep the cleared `(0,0,SKY,0)`). Without a
// fix the world would smear on a fast turn while the sky stayed razor sharp,
// which is far more obviously wrong than no blur at all. So, exactly as
// `taa.js` does, we synthesise a camera-rotation-only velocity analytically for
// texels that carry the SKY flag AND store exactly zero velocity. The moment
// sky.js writes a real vector the fallback stops firing on its own, with no
// change here. `mb.skyVelocityFallback = false` disables it.
//
// Because the tile grid is built from the stored (zero) sky velocity, sky tiles
// would early-out; the per-pixel `max(tile, own)` above is what rescues them.
//
// ## Knobs — `ctx.debug.mb` (also `ctx.debug.motionBlur`)
//
//   mb.enabled            master switch (mirrors ctx.debug.flags.motionBlur)
//   mb.shutterAngle       degrees, 180 = film standard                (180)
//   mb.shutterTimeBased   real-ms exposure, not frame-fraction       (true)
//   mb.cameraRotationScale  rotational blur multiplier, 1 = legacy   (0.25)
//   mb.maxBlurPx          clamp on velocity length, px at 1080p        (48)
//   mb.samples            0 = use the preset's tap count                (0)
//   mb.softZ              soft depth-compare extent, metres         (0.012)
//   mb.viewmodelScale     velocity multiplier for flag bit 0          (0.35)
//   mb.earlyOutPx         tile velocity below this is a passthrough    (1.5)
//   mb.centreMinPx        floor on the centre sample's weight divisor  (0.5)
//   mb.alternate          -1 = preset, 0 = off, 1 = Jimenez alternate  (-1)
//   mb.skyVelocityFallback                                           (true)
//   mb.debugShowTiles     legacy alias for ctx.debug.flags.mbTiles
//
// ## Debug flags — `ctx.debug.flags`
//
//   motionBlur   master A/B for the critic (aliases: `motionblur`, `mb`).
//                Seeded `true` at init so the FIRST `__CB.toggle('motionBlur')`
//                turns it OFF rather than being a no-op on an undefined flag.
//   mbTiles      visualise the neighbour-max tile field
//   mbVelocity   visualise per-pixel velocity (red = +x, green = +y)
//   mbAmount     heatmap of how far each pixel actually gathers
//
// Disabling the pass sets `pass.enabled = false`, which also stops renderer.js
// building the tile grid — so the A/B is honest about cost, not just pixels.
// =============================================================================

import * as THREE from 'three';

const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Per-preset shape. Tap counts are RENDER_PLAN §9.3. `alternate` is Jimenez's
// two-direction gather (half the taps follow the tile's dominant motion, half
// follow the pixel's own) — it is what stops a fast object's own trail being
// dragged sideways by a faster neighbour, and it costs nothing but a select.
const PRESETS = {
  low:    { samples: 0,  alternate: 0 },
  medium: { samples: 8,  alternate: 0 },
  high:   { samples: 12, alternate: 1 },
  ultra:  { samples: 16, alternate: 1 },
};

const COMMON = /* glsl */`
// Interleaved gradient noise, Jimenez's temporally-rotated form. Same generator
// as gtao.js so the two do not beat against each other. RENDER_PLAN §9.3 asks
// for scramble +vec2(53,7) and sequence frame*17+5; both are applied by the
// caller.
float cbIGN(vec2 p, int f) {
  p += 5.588238 * float(f & 63);
  return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y));
}

// McGuire's reconstruction kernels. v is a HALF-EXTENT in pixels.
float cbCone(float d, float v)     { return clamp(1.0 - d / max(v, 1e-4), 0.0, 1.0); }
float cbCylinder(float d, float v) { return 1.0 - smoothstep(0.95 * v, 1.05 * v + 1e-4, d); }
`;

const BLUR_FRAG = /* glsl */`
precision highp float;
precision highp sampler2D;

in vec2 vUv;

uniform sampler2D tColor;    // sceneHDR (post-TAA if TAA is registered)
uniform sampler2D tVel;      // gVel RGBA16F: .rg UV motion, .b flag bits
uniform sampler2D tViewZ;    // R32F positive linear view depth, metres
uniform sampler2D tNbor;     // RG16F neighbour-max, 20 px tiles

uniform vec2  uTexel;        // 1 / render resolution
uniform vec2  uRes;          // render resolution
uniform vec2  uProjFxFy;     // projUnjit[0][0], projUnjit[1][1]
uniform mat3  uSkyRot;       // mat3(prevView) * mat3(camera.matrixWorld)

// x shutterScale (time-based, see header)  y maxBlurPx  z softZ (m)  w viewmodelScale
uniform vec4  uParams;
// x earlyOutPx   y centreMinPx   z skyFallback (0/1)   w cameraRotationScale
uniform vec4  uParams2;
uniform int   uFrame;
uniform int   uDebug;        // 0 none, 1 tiles, 2 velocity, 3 gather amount

layout(location = 0) out vec4 outColor;

// NB: every fetch below is textureLod(..., 0.0), never texture(). These are 1:1
// fullscreen reads with no mips, and a plain texture() inside a varying-length
// loop makes ANGLE/D3D11 emit "X3595: gradient instruction used in a loop with
// varying iteration; partial derivatives may have undefined value" — which the
// test harness classifies as a console error and fails the smoke gate on.
__COMMON__

// Sky texels carry viewZ = 1e6 (renderer.js's linearise pass). No special case
// is needed for them in the depth compare: (zx - 1e6) / softZ saturates, so the
// sky is unambiguously "behind" everything, which is exactly right — a moving
// foreground correctly bleeds over it.

// Camera-rotation-only velocity, reconstructed analytically. Identical maths
// to taa.js's sky fallback so the two agree texel for texel. Rotational optical
// flow is DEPTH-INDEPENDENT, so this is exact for every static texel, not just
// sky — which is what makes the camera-rotation damping in cbVelPx legitimate:
// subtracting it removes exactly the rotation-induced part of any stored
// velocity and leaves translation + object motion behind.
vec2 cbSkyVel(vec2 uv) {
  vec3 d = vec3((uv.x * 2.0 - 1.0) / uProjFxFy.x,
                (uv.y * 2.0 - 1.0) / uProjFxFy.y,
                -1.0);
  vec3 dp = uSkyRot * d;              // same world ray, in the PREVIOUS view basis
  if (dp.z > -1e-6) return vec2(0.0); // rotated behind the previous camera
  vec2 pNdc = vec2(dp.x / -dp.z * uProjFxFy.x, dp.y / -dp.z * uProjFxFy.y);
  vec2 pUv = pNdc * 0.5 + 0.5;
  return uv - pUv;                    // convention: prevUv = uv - vel
}

/**
 * Fetch the velocity at uv as a HALF-EXTENT in pixels, plus its flag bits.
 * Applies the shutter, the viewmodel's shorter shutter, and the length clamp —
 * so every consumer below is already in the same, clamped, comparable space.
 */
vec2 cbVelPxRot(vec2 uv, vec2 rot, out int flags) {
  vec4 t = textureLod(tVel, uv, 0.0);
  flags = int(t.b + 0.5);
  vec2 v = t.rg;
  if ((flags & 1) == 0) {   // viewmodel velocity is gun-local; leave it alone
    if (uParams2.z > 0.5 && (flags & 8) != 0 && dot(v, v) == 0.0) v = rot;
    // Camera-rotation damping (see header): keep look-around crisp, keep
    // translation and object blur. For a sky-fallback texel this reduces to
    // v = uParams2.w * rot, so sky and static world stay in agreement.
    v -= (1.0 - uParams2.w) * rot;
  }
  vec2 px = v * uRes * uParams.x;
  if ((flags & 1) != 0) px *= uParams.w;       // viewmodel: much shorter shutter
  float l = length(px);
  if (l > uParams.y) px *= uParams.y / l;      // §9.2 clamp — no full-frame mush
  return px * 0.5;
}

vec2 cbVelPx(vec2 uv, out int flags) {
  return cbVelPxRot(uv, cbSkyVel(uv), flags);
}

void main() {
  vec4 centre = textureLod(tColor, vUv, 0.0);
  float softZ = max(uParams.z, 1e-5);

  int fc;
  // Rotation flow at the centre, computed once — shared by the centre fetch
  // and the tile guard below, so the early-out path pays for it exactly once.
  vec2 rotC = cbSkyVel(vUv);
  vec2 hvC = cbVelPxRot(vUv, rotC, fc);

  // Tile neighbour-max. Same shutter + clamp so it lives in the same space,
  // and the same camera-rotation damping — the tile grid is built from RAW
  // stored velocities, so during a turn every tile would otherwise defeat the
  // early-out that the damping is supposed to buy. Rotation flow is smooth at
  // 20 px tile scale, so the centre's flow stands in for the whole tile. The
  // dot-greater-than-zero guard is for SKY tiles, whose stored velocity is
  // zero (renderer DEVIATION 4): subtracting flow from zero would fabricate a
  // reversed velocity there; the per-pixel max(tile, own) below rescues them.
  vec2 vN = textureLod(tNbor, vUv, 0.0).rg;
  if (dot(vN, vN) > 0.0) vN -= (1.0 - uParams2.w) * rotC;
  vec2 hvN = vN * uRes * uParams.x;
  float nl = length(hvN);
  if (nl > uParams.y) hvN *= uParams.y / nl;
  hvN *= 0.5;

  // The tile grid is built from the stored velocity before the viewmodel draws
  // and before the sky fallback exists, so a pixel can legitimately move faster
  // than its tile claims. Cover the pixel's own motion.
  if (dot(hvC, hvC) > dot(hvN, hvN)) hvN = hvC;

  float lN = length(hvN);
  float lC = length(hvC);

  if (uDebug == 1) { outColor = vec4(vec3(lN * 2.0 / max(uParams.y, 1.0)), 1.0); return; }
  if (uDebug == 2) { outColor = vec4(hvC * 2.0 / max(uParams.y, 1.0) * 0.5 + 0.5, 0.0, 1.0); return; }

  // Flag bit 2: art already smeared this. Never blur it, never gather from it.
  if ((fc & 4) != 0) { outColor = centre; return; }

  // §9.5 early out. 70-85% of a typical frame lands here; it is the whole
  // reason this pass costs a fraction of a millisecond instead of 1.6 ms.
  if (lN * 2.0 < uParams2.x) {
    outColor = (uDebug == 3) ? vec4(0.0, 0.0, 0.0, 1.0) : centre;
    return;
  }
  if (uDebug == 3) { outColor = vec4(vec3(lN * 2.0 / max(uParams.y, 1.0)) * vec3(1.0, 0.35, 0.1), 1.0); return; }

  float zx = textureLod(tViewZ, vUv, 0.0).r;

  // Jitter breaks the tap ladder into noise. TAA runs BEFORE us (order 70) so
  // this never gets temporally resolved — accept slightly noisy blur; ordered
  // taps band visibly and that is much worse.
  float jitter = cbIGN(gl_FragCoord.xy + vec2(53.0, 7.0), uFrame * 17 + 5) - 0.5;

  vec2 dirN = hvN;
  // A near-static centre in a fast tile must gather along the TILE's motion —
  // that is how the background correctly receives the moving object's trail.
  // Only a pixel with real motion of its own gets the second direction.
  vec2 dirC = (lC > 1.0) ? hvC : dirN;

  // Centre weight: a fast-moving centre is itself smeared out and should
  // contribute less; a static one should dominate. Taps onto static neighbours
  // score ~0 (cone/cylinder of a zero-length velocity), so this self-regulates.
  float wC = 1.0 / max(lC, uParams2.y);
  vec3 sum = centre.rgb * wC;
  float total = wC;

  const float S = float(CB_SAMPLES);
  vec2 lo = uTexel * 0.5;
  vec2 hi = 1.0 - uTexel * 0.5;

  for (int i = 0; i < CB_SAMPLES; i++) {
    float t = mix(-1.0, 1.0, (float(i) + jitter + 1.0) / (S + 1.0));
    #if CB_ALTERNATE
      vec2 dir = ((i & 1) == 0) ? dirN : dirC;
    #else
      vec2 dir = dirN;
    #endif
    vec2 offPx = dir * t;
    vec2 uvY = clamp(vUv + offPx * uTexel, lo, hi);

    int fy;
    vec2 hvY = cbVelPx(uvY, fy);
    float lY = length(hvY);
    float d = length(offPx);

    float zy = textureLod(tViewZ, uvY, 0.0).r;
    // §9.4 soft depth compare — this is what makes the blur respect ordering.
    float fg = clamp(1.0 - (zy - zx) / softZ, 0.0, 1.0);   // tap in FRONT of centre
    float bg = clamp(1.0 - (zx - zy) / softZ, 0.0, 1.0);   // tap BEHIND centre

    float w = fg * cbCone(d, lY)
            + bg * cbCone(d, lC)
            + 2.0 * cbCylinder(d, lY) * cbCylinder(d, lC);

    // §9.6 flag rejections: never gather from art-smeared pixels, and never
    // gather across the viewmodel/world boundary in either direction.
    w *= ((fy & 4) != 0) ? 0.0 : 1.0;
    w *= (((fy ^ fc) & 1) != 0) ? 0.0 : 1.0;

    sum += textureLod(tColor, uvY, 0.0).rgb * w;
    total += w;
  }

  outColor = vec4(sum / max(total, 1e-4), centre.a);
}
`;

// -----------------------------------------------------------------------------

export class MotionBlur {
  static id = 'motionBlur';
  static deps = ['renderer'];

  constructor(ctx) {
    this.ctx = ctx;
    this.pass = null;
    this.renderer = null;
    this._mat = null;
    this._shape = null;
    this._failed = false;

    // RENDER_PLAN §9.7 knobs, plus the few the spec implies but does not name.
    this.knobs = {
      enabled: true,
      shutterAngle: 180,        // degrees. 180 = film standard.
      shutterTimeBased: true,   // exposure in real ms, not a frame fraction
      cameraRotationScale: 0.25, // rotational blur multiplier; 1 = legacy
      maxBlurPx: 48,            // at 1080p; scaled by height/1080 at execute
      samples: 0,               // 0 = follow the quality preset
      softZ: 0.012,             // metres
      viewmodelScale: 0.35,
      earlyOutPx: 1.5,
      centreMinPx: 0.5,
      alternate: -1,            // -1 = preset
      skyVelocityFallback: true,
      debugShowTiles: false,    // legacy alias for ctx.debug.flags.mbTiles
      get shutterSeconds() { return (this.shutterAngle / 360) / 60; },
    };

    this._skyRot = new THREE.Matrix3();
    this._skyRotM4 = new THREE.Matrix4();

    // Sim time the current gVel spans: `ctx.time.elapsed` delta between
    // executes. prevView is copied once per RENDERED frame (renderer.js
    // _updateMatrices), so this is exactly the exposure window the velocity
    // buffer describes. When no sim time passed (settle() renders, pause) the
    // delta is 0 — keep the last real span; the velocity is zero then anyway.
    this._lastElapsed = null;
    this._dtSpan = 1 / 60;
    this._lastShutterScale = 0.5;
  }

  async init() {
    const { ctx } = this;
    try {
      this.renderer = ctx.sys.renderer;
      if (!this.renderer) throw new Error('renderer system missing');

      ctx.debug.mb = this.knobs;
      ctx.debug.motionBlur = this.knobs;
      // Seeded true so __CB.toggle('motionBlur') turns it OFF first, which is
      // the direction a critic A/B-ing the pass actually wants.
      if (ctx.debug.flags.motionBlur === undefined) ctx.debug.flags.motionBlur = true;

      this._buildMaterial();

      this.pass = ctx.frameGraph.register({
        id: 'motionBlur',
        order: 80,
        inputs: ['viewZ', 'tiles'],
        outputs: ['motionBlur'],
        enabled: this._wantEnabled(),
        execute: (target, gbuf, c) => this._execute(gbuf, c),
        reset: () => {},
      });

      ctx.bus.on('debugFlag', ({ flag }) => {
        if (flag === 'motionBlur' || flag === 'motionblur' || flag === 'mb') {
          // Accept all three spellings; normalise onto the canonical one so
          // _wantEnabled only ever reads a single source of truth.
          if (flag !== 'motionBlur') ctx.debug.flags.motionBlur = ctx.debug.flags[flag];
          this._syncEnabled();
        }
      });
      ctx.bus.on('quality', () => this.onQuality());
    } catch (e) {
      this._fail(e, 'init');
    }
  }

  /** Temporal-pass contract (RENDER_PLAN §13). Only the dt tracker to clear:
   *  after a teleport/vista jump the elapsed delta is not an exposure window. */
  resetTemporal() { this._lastElapsed = null; }
  reset() { this._lastElapsed = null; }

  /**
   * Re-evaluate the enable state once per sim step.
   *
   * This is not redundant with the check inside `_execute`. `_execute` is only
   * called for an ENABLED pass, so once the pass disables itself it can never
   * observe the flag going back to true — a latch that only a `debugFlag` /
   * `quality` event could release. `__CB.toggle()` does emit that event, but
   * anything poking `ctx.debug.flags.motionBlur` or `ctx.debug.mb.enabled`
   * directly (a console session, another agent's harness) would silently kill
   * the pass for the rest of the run. Cost is one boolean compare.
   */
  lateUpdate() {
    if (this._failed) return;
    try {
      // Also makes the `samples` / `alternate` knobs live: both are #defines, so
      // changing one needs a rebuild. _buildMaterial early-outs on an unchanged
      // shape, so the steady-state cost is two integer compares.
      this._buildMaterial();
      this._syncEnabled();
    } catch (e) { this._fail(e, 'lateUpdate'); }
  }

  onQuality() {
    if (this._failed) return;
    try {
      this._buildMaterial();
      this._syncEnabled();
    } catch (e) { this._fail(e, 'onQuality'); }
  }

  _shapeFor(preset) {
    const p = PRESETS[preset] || PRESETS.high;
    const k = this.knobs;
    const samples = (k.samples | 0) > 0 ? Math.min(32, k.samples | 0) : p.samples;
    const alternate = k.alternate < 0 ? p.alternate : (k.alternate ? 1 : 0);
    return { samples, alternate };
  }

  _wantEnabled() {
    const { ctx } = this;
    if (this._failed) return false;
    if (!this.knobs.enabled) return false;
    if (ctx.quality.motionBlur === false) return false;      // 'low' turns it off
    if (ctx.debug.flags.motionBlur === false) return false;
    return (this._shape ? this._shape.samples : 0) > 0;
  }

  _syncEnabled() {
    if (!this.pass) return;
    const want = this._wantEnabled();
    if (this.pass.enabled !== want) {
      this.pass.enabled = want;
      // renderer._needs() is cached and gates whether the tile grid gets built
      // at all — without this, turning the pass off would keep paying for tiles
      // and turning it on would read a texture that was never produced.
      this.ctx.frameGraph.invalidate?.();
    }
  }

  /**
   * Any failure degrades to a passthrough: the pass is disabled and
   * `gbuf.sceneHDR` is left pointing at whatever produced it, so the frame
   * carries on unblurred rather than going black. Other agents are adding
   * passes to this same graph concurrently; nothing here may take the frame
   * down with it.
   */
  _fail(e, where) {
    if (this._failed) return;
    this._failed = true;
    if (this.pass) { this.pass.enabled = false; this.ctx.frameGraph?.invalidate?.(); }
    console.error(`[motionblur] disabled after failure in ${where}:`, (e && (e.stack || e.message)) || e);
  }

  _buildMaterial() {
    const preset = this.ctx.quality.preset || 'high';
    const shape = this._shapeFor(preset);
    if (this._mat && this._shape &&
        this._shape.samples === shape.samples &&
        this._shape.alternate === shape.alternate) return;
    this._shape = shape;

    this._mat?.dispose();
    this._mat = null;
    if (shape.samples <= 0) return;   // 'low': no material, no cost, pass disabled

    const defs = `#define CB_SAMPLES ${shape.samples}\n` +
                 `#define CB_ALTERNATE ${shape.alternate}\n`;

    this._mat = new THREE.RawShaderMaterial({
      // three prepends `#version 300 es` itself — writing it in the source is a
      // duplicate-version link error and every draw silently no-ops.
      glslVersion: THREE.GLSL3,
      vertexShader: FS_VERT,
      fragmentShader: defs + BLUR_FRAG.replace('__COMMON__', COMMON),
      depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: null }, tVel: { value: null },
        tViewZ: { value: null }, tNbor: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uRes: { value: new THREE.Vector2(1, 1) },
        uProjFxFy: { value: new THREE.Vector2(1, 1) },
        uSkyRot: { value: new THREE.Matrix3() },
        uParams: { value: new THREE.Vector4(0.5, 48, 0.012, 0.35) },
        uParams2: { value: new THREE.Vector4(1.5, 0.5, 1, 0) },
        uFrame: { value: 0 },
        uDebug: { value: 0 },
      },
    });
  }

  // ---------------------------------------------------------------------------

  _execute(gbuf, ctx) {
    if (this._failed) return;
    try {
      this._syncEnabled();
      if (this.pass.enabled === false || !this._mat) return;

      const R = this.renderer;
      const color = gbuf.sceneHDR;
      const vel = gbuf.gVel;
      const viewZ = gbuf.gViewZ;
      const tiles = gbuf.tiles;
      // A missing input means the resource was not built this frame (the pass
      // was just re-enabled and _needs() has not been re-evaluated, or the
      // renderer changed shape). Passthrough for one frame — never gather
      // against a stale or null texture.
      if (!color || !vel || !viewZ || !tiles) return;

      // NB: do NOT use gbuf.width/height/texel. They are stale at 1 in the
      // current renderer.js (main.js's ctx.setSize() reaches _allocate before
      // Renderer.init() creates _gbufObj, so the one call that would have
      // published them ran with `g` undefined and every later call early-outs).
      // A one-texel velocity would become a whole-screen smear. Filed in
      // HANDOFF; renderer.width/height are authoritative.
      const w = R.width || gbuf.width, h = R.height || gbuf.height;
      if (w < 2 || h < 2) return;

      const k = this.knobs;
      const u = this._mat.uniforms;

      u.tColor.value = color;
      u.tVel.value = vel;
      u.tViewZ.value = viewZ;
      u.tNbor.value = tiles;
      u.uTexel.value.set(1 / w, 1 / h);
      u.uRes.value.set(w, h);

      // Exposure window of THIS gVel: sim time elapsed since the last render.
      const el = ctx.time?.elapsed;
      if (typeof el === 'number') {
        if (this._lastElapsed !== null) {
          const d = el - this._lastElapsed;
          if (d > 1e-6) this._dtSpan = Math.min(d, 0.1);
        }
        this._lastElapsed = el;
      }

      const frac = THREE.MathUtils.clamp(k.shutterAngle, 0, 360) / 360;
      // Time-based shutter (see header): scale velocity so the streak covers
      // `shutterSeconds` of motion regardless of frame rate. At a 1/60 span
      // this is exactly the legacy `angle/360`; on a slow frame it shrinks
      // instead of smearing. Capped at 1 — never extrapolate past the frame's
      // real displacement.
      const shutter = k.shutterTimeBased
        ? Math.min(1, (frac / 60) / Math.max(this._dtSpan, 1 / 240))
        : frac;
      this._lastShutterScale = shutter;
      // §9.2: the clamp is authored at 1080p and scales with render height, so
      // the streak is the same fraction of the frame at every resolution.
      const maxPx = Math.max(2, k.maxBlurPx * (h / 1080));
      u.uParams.value.set(
        shutter,
        maxPx,
        Math.max(1e-5, k.softZ),
        THREE.MathUtils.clamp(k.viewmodelScale, 0, 1),
      );
      u.uParams2.value.set(
        Math.max(0.0, k.earlyOutPx),
        Math.max(0.05, k.centreMinPx),
        k.skyVelocityFallback ? 1 : 0,
        THREE.MathUtils.clamp(k.cameraRotationScale, 0, 1),
      );
      u.uFrame.value = gbuf.frame | 0;

      const f = ctx.debug.flags;
      u.uDebug.value = (f.mbTiles || k.debugShowTiles) ? 1 : (f.mbVelocity ? 2 : (f.mbAmount ? 3 : 0));

      const m = ctx.matrices;
      u.uProjFxFy.value.set(m.projUnjit.elements[0], m.projUnjit.elements[5]);
      // mat3(prevView) * mat3(camera.matrixWorld): a world ray expressed in the
      // current view basis, re-expressed in the previous one. Both are rigid,
      // so composing the 3x3 parts composes the rotations.
      this._skyRotM4.multiplyMatrices(m.prevView, ctx.camera.matrixWorld);
      this._skyRot.setFromMatrix4(this._skyRotM4);
      u.uSkyRot.value.copy(this._skyRot);

      const out = R.rt('mbOut', {
        type: THREE.HalfFloatType, format: THREE.RGBAFormat, filter: THREE.LinearFilter,
      });
      R.fullscreen(this._mat, out);

      gbuf.sceneHDR = out.texture;
      gbuf.motionBlur = out.texture;
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
      shutterSeconds: this.knobs.shutterSeconds,
      lastShutterScale: this._lastShutterScale,
      lastDtSpan: this._dtSpan,
      knobs: { ...this.knobs, shutterSeconds: this.knobs.shutterSeconds },
    };
  }

  dispose() {
    this._mat?.dispose();
    this._mat = null;
    this.ctx.frameGraph?.unregister?.('motionBlur');
  }
}

export default MotionBlur;
