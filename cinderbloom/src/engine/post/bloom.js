// =============================================================================
// CINDERBLOOM — physically-motivated bloom. Frame graph order 100.
// Owner: bloom agent. Spec: docs/RENDER_PLAN.md §7, docs/ART_DIRECTION.md §2.2.
// =============================================================================
//
// WHAT THIS IS
//
//   Progressive downsample / upsample glare (Jimenez, "Next Generation Post
//   Processing in Call of Duty: Advanced Warfare"), with:
//     * a 13-tap box-of-boxes downsample,
//     * the partial Karis average on the FIRST downsample only, which is the
//       specific fix for a single blown pixel becoming a flickering blob,
//     * a 3x3 tent upsample combined with an ENERGY-CONSERVING convex weight
//       (see "energy" below) rather than a raw add,
//     * NO luminance threshold by default. Thresholded bloom is a 2010 filter;
//       a lens scatters a fraction of *all* the light that hits it. A soft-knee
//       is available (`softThreshold`) and ships at 0.
//     * procedurally generated lens dirt (no downloaded texture, no data URI)
//       gated so it only shows when something genuinely bright is in frame,
//     * a restrained two/three-pass anamorphic streak.
//
// ENERGY
//
//   RENDER_PLAN §7.4 says "additive into the destination mip". Additive over 6
//   levels multiplies the pyramid's total energy by ~6, and `strength` then has
//   to undo that — which is exactly the non-energy-conserving behaviour the
//   brief forbids. Instead each upsample is a convex blend
//
//       dst = mix(dst, tent(src), scatter)
//
//   implemented as ordinary source-alpha blending with alpha = `scatter`, so
//   the pyramid output is  sum_i w_i * blur_i(scene)  with  sum_i w_i == 1 and
//   w_i = scatter^i * (1 - scatter). A geometric per-octave falloff of ~0.5 is
//   the mip-pyramid equivalent of a 1/theta^3 glare PSF, which is roughly what a
//   real coated lens does — hence `scatter` defaults to 0.55, not 0.5 or 0.9.
//
//   The final composite is then `mix(scene, bloom, strength)`: `strength` is
//   literally "the fraction of light the lens scatters out of the direct path".
//   Both halves of the frame's energy are accounted for; nothing is invented.
//
// DEGRADATION
//
//   Everything here is wrapped so that a failure degrades to a passthrough
//   rather than a black frame: if init throws, the pass is never registered; if
//   execute throws, it logs once, disables itself, and leaves `gbuf.sceneHDR`
//   pointing at the untouched MRT attachment. Other agents are adding passes to
//   this same frame graph right now.
//
// OUTPUT CONTRACT
//
//   Bloom does not write into the MRT (you cannot read and write attachment 0
//   in one draw). It composites into a pooled full-res RGBA16F and then
//   REBINDS `gbuf.sceneHDR` / `gbuf.color` to that texture, so post/grade.js at
//   order 110 — or the renderer's fallback ACES blit — picks it up with no
//   knowledge of this pass. When bloom is off, the rebind does not happen and
//   the frame is bit-identical to the no-bloom build.
//
// DEBUG
//
//   ctx.debug.flags.bloom      — false disables the whole pass (A/B for the critic)
//   ctx.debug.flags.bloomOnly  — show the bloom pyramid alone, no scene
//   ctx.debug.flags.bloomDirt  — show the generated lens-dirt texture fullscreen
//   ctx.debug.flags.bloomNoDirt   — glare chain only, dirt modulation off
//   ctx.debug.flags.bloomNoStreak — glare chain only, anamorphic streak off
//   ctx.debug.bloom            — live knob object, see `Bloom.params`
//   __CB.toggle('bloom')       — flips the first of those (initialised to true
//                                in init() so the first toggle turns it OFF)
// =============================================================================

import * as THREE from 'three';

// -----------------------------------------------------------------------------
// shaders
// -----------------------------------------------------------------------------

// Full-screen triangle. RawShaderMaterial declares nothing for us.
// HANDOFF trap 1: three prepends `#version 300 es` for GLSL3 — never write it.
const FS_VERT = /* glsl */`
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const LUMA = /* glsl */`
float cbLuma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

// 13-tap "box of boxes" downsample (RENDER_PLAN §7.2) with the optional partial
// Karis average (§7.3) and an optional soft-knee prefilter (§7.1, off by default).
const DOWN_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;    // 1 / SOURCE size
uniform float uKaris;   // >0.5 -> Karis-weighted (first downsample only)
uniform float uClamp;   // firefly / infinity clamp, scene-referred
uniform vec4 uKnee;     // x threshold, y threshold-knee, z 2*knee, w 1/(4*knee)
layout(location = 0) out vec4 outColor;
${LUMA}

vec3 cbKnee(vec3 c){
  if (uKnee.x <= 0.0) return c;                 // no threshold — the default
  float br = max(c.r, max(c.g, c.b));
  float s = clamp(br - uKnee.y, 0.0, uKnee.z);
  s = s * s * uKnee.w;
  return c * (max(s, br - uKnee.x) / max(br, 1e-5));
}

vec3 tap(vec2 uv){
  vec3 c = texture(tSrc, uv).rgb;
  // Guard: NaN/Inf from an upstream pass must not poison the whole pyramid.
  c = mix(vec3(0.0), c, vec3(greaterThanEqual(c, vec3(0.0))));
  c = min(c, vec3(uClamp));
  return cbKnee(c);
}

void main(){
  vec2 t = uTexel;
  vec3 a = tap(vUv + vec2(-2.0,-2.0)*t);
  vec3 b = tap(vUv + vec2( 0.0,-2.0)*t);
  vec3 c = tap(vUv + vec2( 2.0,-2.0)*t);
  vec3 d = tap(vUv + vec2(-2.0, 0.0)*t);
  vec3 e = tap(vUv);
  vec3 f = tap(vUv + vec2( 2.0, 0.0)*t);
  vec3 g = tap(vUv + vec2(-2.0, 2.0)*t);
  vec3 h = tap(vUv + vec2( 0.0, 2.0)*t);
  vec3 i = tap(vUv + vec2( 2.0, 2.0)*t);
  vec3 j = tap(vUv + vec2(-1.0,-1.0)*t);
  vec3 k = tap(vUv + vec2( 1.0,-1.0)*t);
  vec3 l = tap(vUv + vec2(-1.0, 1.0)*t);
  vec3 m = tap(vUv + vec2( 1.0, 1.0)*t);

  vec3 g0 = (a + b + d + e) * 0.25;
  vec3 g1 = (b + c + e + f) * 0.25;
  vec3 g2 = (d + e + g + h) * 0.25;
  vec3 g3 = (e + f + h + i) * 0.25;
  vec3 g4 = (j + k + l + m) * 0.25;

  // Flat weights: identical to §7.2's per-tap form (verified by expansion —
  // e lands on 0.125, outer corners 0.03125, edges 0.0625, inner 0.125).
  float w0 = 0.125, w1 = 0.125, w2 = 0.125, w3 = 0.125, w4 = 0.5;
  if (uKaris > 0.5) {
    w0 *= 1.0 / (1.0 + cbLuma(g0));
    w1 *= 1.0 / (1.0 + cbLuma(g1));
    w2 *= 1.0 / (1.0 + cbLuma(g2));
    w3 *= 1.0 / (1.0 + cbLuma(g3));
    w4 *= 1.0 / (1.0 + cbLuma(g4));
    float s = w0 + w1 + w2 + w3 + w4;
    outColor = vec4((g0*w0 + g1*w1 + g2*w2 + g3*w3 + g4*w4) / max(s, 1e-5), 1.0);
  } else {
    outColor = vec4(g0*w0 + g1*w1 + g2*w2 + g3*w3 + g4*w4, 1.0);
  }
}
`;

// 3x3 tent upsample (RENDER_PLAN §7.4) + lens dirt (§7.5).
// Written with alpha = scatter and blended (SRC_ALPHA, ONE_MINUS_SRC_ALPHA), so
// the hardware performs the energy-conserving convex blend for free.
const UP_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform sampler2D tDirt;
uniform vec2 uTexel;     // 1 / DESTINATION size
uniform float uRadius;   // destination texels
uniform float uScatter;  // convex blend weight -> alpha
uniform float uDirt;     // 0 = no dirt on this level
layout(location = 0) out vec4 outColor;
${LUMA}

void main(){
  vec2 o = uTexel * uRadius;
  vec3 s =
      texture(tSrc, vUv + vec2(-o.x, -o.y)).rgb
    + texture(tSrc, vUv + vec2( 0.0, -o.y)).rgb * 2.0
    + texture(tSrc, vUv + vec2( o.x, -o.y)).rgb
    + texture(tSrc, vUv + vec2(-o.x,  0.0)).rgb * 2.0
    + texture(tSrc, vUv                    ).rgb * 4.0
    + texture(tSrc, vUv + vec2( o.x,  0.0)).rgb * 2.0
    + texture(tSrc, vUv + vec2(-o.x,  o.y)).rgb
    + texture(tSrc, vUv + vec2( 0.0,  o.y)).rgb * 2.0
    + texture(tSrc, vUv + vec2( o.x,  o.y)).rgb;
  s *= 0.0625;
  if (uDirt > 0.0) {
    // The smoothstep gate is the whole point: a lens only shows its dirt when
    // something genuinely bright is behind it. Ungated dirt = permanently
    // filthy frame, which is the classic misuse of this effect.
    float d = texture(tDirt, vUv).r;
    s *= 1.0 + uDirt * d * smoothstep(1.0, 6.0, cbLuma(s));
  }
  outColor = vec4(s, uScatter);
}
`;

// Anamorphic streak source: mip2, high-pass gated so the sky never smears.
const STREAK_PRE_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uGate;     // lo, hi luma
layout(location = 0) out vec4 outColor;
${LUMA}
void main(){
  vec3 c = max(texture(tSrc, vUv).rgb, vec3(0.0));
  outColor = vec4(c * smoothstep(uGate.x, uGate.y, cbLuma(c)), 1.0);
}
`;

// One horizontal 13-tap gaussian. Two passes at stride 1 and 7 give a ~90-texel
// streak for 26 taps instead of 90 (RENDER_PLAN §7.6).
const STREAK_BLUR_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uStep;     // (stride / width, 0)
layout(location = 0) out vec4 outColor;
const float W[7] = float[7](0.137020, 0.129630, 0.109720, 0.083110, 0.056330, 0.034170, 0.018540);
void main(){
  vec3 s = texture(tSrc, vUv).rgb * W[0];
  for (int i = 1; i < 7; i++) {
    vec2 o = uStep * float(i);
    s += texture(tSrc, vUv + o).rgb * W[i];
    s += texture(tSrc, vUv - o).rgb * W[i];
  }
  outColor = vec4(s, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */`
precision highp float;
in vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform sampler2D tStreak;
uniform sampler2D tDirt;
uniform float uStrength;
uniform float uStreak;       // 0 disables the streak sample entirely
uniform vec3 uStreakTint;
uniform float uStreakHue;    // 0 = fully tinted, 1 = keep source hue
uniform float uMode;         // 0 normal, 1 bloom only, 2 dirt texture
layout(location = 0) out vec4 outColor;
${LUMA}
void main(){
  vec3 scene = texture(tScene, vUv).rgb;
  vec3 bloom = texture(tBloom, vUv).rgb;
  if (uMode > 1.5) { outColor = vec4(texture(tDirt, vUv).rgb, 1.0); return; }
  // Energy-conserving: strength is the fraction of light the lens scatters out
  // of the direct path and into the halo. Not an additive "glow" gain.
  vec3 c = mix(scene, bloom, uStrength);
  if (uMode > 0.5) c = bloom;
  if (uStreak > 0.0) {
    vec3 sk = texture(tStreak, vUv).rgb;
    c += mix(vec3(cbLuma(sk)) * uStreakTint, sk, uStreakHue) * uStreak;
  }
  outColor = vec4(c, 1.0);
}
`;

// -----------------------------------------------------------------------------

const QUALITY_BLOOM = {
  low:    { mips: 4, dirt: false, streak: 0, radius: 1.00 },
  medium: { mips: 5, dirt: true,  streak: 0, radius: 1.10 },
  high:   { mips: 6, dirt: true,  streak: 2, radius: 1.15 },
  ultra:  { mips: 7, dirt: true,  streak: 3, radius: 1.15 },
};

export class Bloom {
  static id = 'bloom';
  static deps = ['renderer'];

  constructor(ctx) {
    this.ctx = ctx;
    this.pass = null;
    this.failed = false;
    this._warned = false;
    this._mips = [];
    this._costMs = 0;

    /** Live knobs. Mirrored onto ctx.debug.bloom in init(). RENDER_PLAN §7.7. */
    this.params = {
      enabled: true,
      strength: 0.058,        // fraction of scene light the lens scatters
      scatter: 0.55,          // per-octave convex weight -> ~1/theta^3 glare PSF
      filterRadius: 1.15,     // tent radius, destination texels
      mips: 6,
      softThreshold: 0.0,     // NO threshold by default. See header.
      softKnee: 0.5,
      clamp: 160.0,           // firefly/infinity guard, scene-referred
      karisSteps: 1,          // Karis average on the first N downsamples
      dirtIntensity: 0.35,
      dirtLevels: 2,          // dirt modulates the widest N mips only
      dirtSize: 1024,
      streakIntensity: 0.065,
      streakTint: new THREE.Color(0.34, 0.52, 1.00),
      streakHue: 0.25,        // 0 = pure tint, 1 = keep the emitter's own hue
      streakGate: new THREE.Vector2(1.4, 2.6),
      streakPasses: 2,
      streakStrides: [1.0, 5.5, 22.0],
    };
  }

  // ---------------------------------------------------------------------------

  async init() {
    const { ctx } = this;
    try {
      this.r = ctx.sys.renderer;
      if (!this.r || !ctx.frameGraph) throw new Error('bloom requires renderer + frameGraph');

      this._down = this._mat(DOWN_FRAG, {
        tSrc: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uKaris: { value: 0 },
        uClamp: { value: this.params.clamp },
        uKnee: { value: new THREE.Vector4(0, 0, 0, 0) },
      });

      this._up = this._mat(UP_FRAG, {
        tSrc: { value: null },
        tDirt: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uRadius: { value: this.params.filterRadius },
        uScatter: { value: this.params.scatter },
        uDirt: { value: 0 },
      });
      // The convex blend, done by the blend unit: dst = src*a + dst*(1-a).
      // Note transparent MUST be true — three collapses NormalBlending to
      // NoBlending for opaque materials in WebGLState.setMaterial.
      this._up.transparent = true;
      this._up.blending = THREE.CustomBlending;
      this._up.blendEquation = THREE.AddEquation;
      this._up.blendSrc = THREE.SrcAlphaFactor;
      this._up.blendDst = THREE.OneMinusSrcAlphaFactor;

      this._streakPre = this._mat(STREAK_PRE_FRAG, {
        tSrc: { value: null },
        uGate: { value: this.params.streakGate.clone() },
      });
      this._streakBlur = this._mat(STREAK_BLUR_FRAG, {
        tSrc: { value: null },
        uStep: { value: new THREE.Vector2() },
      });

      this._comp = this._mat(COMPOSITE_FRAG, {
        tScene: { value: null },
        tBloom: { value: null },
        tStreak: { value: null },
        tDirt: { value: null },
        uStrength: { value: this.params.strength },
        uStreak: { value: 0 },
        uStreakTint: { value: new THREE.Vector3(0.34, 0.52, 1.0) },
        uStreakHue: { value: this.params.streakHue },
        uMode: { value: 0 },
      });

      this.dirt = this._buildLensDirt(this.params.dirtSize);
      this._up.uniforms.tDirt.value = this.dirt;
      this._comp.uniforms.tDirt.value = this.dirt;

      this._black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
      this._black.needsUpdate = true;
      this._comp.uniforms.tStreak.value = this._black;

      this.onQuality(ctx.quality);

      // Debug surface. Initialised to `true` so __CB.toggle('bloom') — which
      // flips whatever is there — turns the pass OFF on its first call rather
      // than being a no-op on an undefined flag.
      if (ctx.debug.flags.bloom === undefined) ctx.debug.flags.bloom = true;
      ctx.debug.bloom = this.params;

      this.pass = ctx.frameGraph.register({
        id: 'bloom',
        order: 100,
        inputs: [],
        outputs: ['bloom'],
        execute: (target, gbuf, c) => this._execute(gbuf, c),
        reset: () => {},
      });
    } catch (e) {
      // Never take the frame down with us.
      this.failed = true;
      console.warn('[bloom] disabled — init failed:', e && (e.message || e));
    }
  }

  _mat(frag, uniforms) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FS_VERT,
      fragmentShader: frag,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
  }

  onQuality(q = this.ctx.quality) {
    const p = this.params;
    const preset = QUALITY_BLOOM[q.preset] || QUALITY_BLOOM.high;
    p.mips = preset.mips;
    p.filterRadius = preset.radius;
    p.streakPasses = preset.streak;
    p.dirtIntensity = preset.dirt ? 0.35 : 0.0;
    // `quality.bloom === false` is an outright kill switch from context.js.
    this._presetEnabled = q.bloom !== false;
  }

  // ---------------------------------------------------------------------------
  // procedural lens dirt — RENDER_PLAN §7.5
  // ---------------------------------------------------------------------------

  /**
   * Radial smear streaks + dust specks + a few broad smudges, splatted into a
   * Uint8 buffer with ctx.rng (never Math.random — CONTRACT §3). Everything is
   * additive into a black map, so "clean lens" is the default and the mean stays
   * low; a dirt texture whose mean is 0.5 makes the whole frame look filthy.
   *
   * Cost is bounded by splatting only inside each feature's bounding box, so
   * this is ~0.4 Mpx of work at 1024^2 rather than 450 full-image passes.
   */
  _buildLensDirt(N) {
    const rng = this.ctx.rng.fork('bloom.lensdirt');
    const acc = new Float32Array(N * N);

    // power: 1 = f^2 (soft), 2 = f^3 (very soft). Nothing uses a linear falloff —
    // a linear edge on a low-amplitude blob quantises into visible contour rings.
    const splat = (cx, cy, rx, ry, rot, amp, power) => {
      const cs = Math.cos(-rot), sn = Math.sin(-rot);
      const ext = Math.ceil(Math.max(rx, ry)) + 1;
      const x0 = Math.max(0, Math.floor(cx - ext)), x1 = Math.min(N - 1, Math.ceil(cx + ext));
      const y0 = Math.max(0, Math.floor(cy - ext)), y1 = Math.min(N - 1, Math.ceil(cy + ext));
      const irx = 1 / Math.max(0.5, rx), iry = 1 / Math.max(0.5, ry);
      for (let y = y0; y <= y1; y++) {
        const dy = y - cy;
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const u = (dx * cs - dy * sn) * irx;
          const v = (dx * sn + dy * cs) * iry;
          const d2 = u * u + v * v;
          if (d2 >= 1) continue;
          const f = 1 - d2;
          acc[y * N + x] += amp * (power === 2 ? f * f * f : f * f);
        }
      }
    };

    const S = N / 1024;

    // 3 broad, very faint smudges — these are what actually survive the mip
    // reduction when the dirt is sampled at 60x33, so they carry the read.
    for (let i = 0; i < 3; i++) {
      const cx = rng.range(0.1, 0.9) * N, cy = rng.range(0.1, 0.9) * N;
      const r = rng.range(120, 260) * S;
      splat(cx, cy, r, r * rng.range(0.55, 1.0), rng.range(0, Math.PI), rng.range(0.05, 0.11), 2);
    }

    // 12-18 radial smear streaks: elongated, low contrast. Loosely radial — a
    // wiped lens smears roughly along the wipe, not on perfect spokes, so the
    // orientation gets a wide gaussian jitter or the map reads as a starburst.
    const nStreak = rng.int(12, 18);
    for (let i = 0; i < nStreak; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const rad = rng.range(0.12, 0.66);
      const cx = (0.5 + Math.cos(ang) * rad) * N;
      const cy = (0.5 + Math.sin(ang) * rad) * N;
      // Aspect matters more than absolute size: a 20:1 smear reads as a
      // scratch, a 6:1 smear reads as grease. Keep it fat and short.
      const len = rng.range(40, 120) * S;
      const wid = rng.range(9, 26) * S;
      const rot = ang + rng.gauss(0, 0.75);
      const amp = rng.range(0.05, 0.15);
      // Overlapping beads along the axis: breaks the clean-ellipse read and
      // gives the density variation a real smear has.
      const beads = 7 + ((len / (10 * S)) | 0);
      for (let b = 0; b < beads; b++) {
        const t = (b / (beads - 1) - 0.5);
        const px = cx + Math.cos(rot) * t * len * 2.0;
        const py = cy + Math.sin(rot) * t * len * 2.0;
        const fall = Math.max(0, 1 - t * t * 3.2);
        if (fall <= 0) continue;
        splat(px, py, len * 0.30, wid * rng.range(0.8, 1.3), rot,
              amp * fall * rng.range(0.7, 1.0), 2);
      }
    }

    // ~400 dust specks with soft falloff.
    for (let i = 0; i < 420; i++) {
      const r = rng.range(1.0, 4.2) * S;
      splat(rng.next() * N, rng.next() * N, r, r * rng.range(0.7, 1.4),
            rng.range(0, Math.PI), rng.range(0.25, 0.9), 2);
    }

    // A handful of larger flecks (fibre / grit).
    for (let i = 0; i < 26; i++) {
      const l = rng.range(6, 22) * S;
      splat(rng.next() * N, rng.next() * N, l, rng.range(1.0, 2.4) * S,
            rng.range(0, Math.PI), rng.range(0.20, 0.55), 1);
    }

    const data = new Uint8Array(N * N * 4);
    let sum = 0;
    for (let i = 0; i < N * N; i++) {
      const v = Math.min(1, acc[i]);
      sum += v;
      // Ordered-ish dither before the 8-bit quantise. The broad smudges are
      // amplitude ~0.06 across 250 px; without this they band into visible
      // contour rings, which is exactly the artifact a critic circles.
      const d = (((i * 2654435761) >>> 16) & 255) / 255 - 0.5;
      const q = Math.max(0, Math.min(255, Math.round(v * 255 + d)));
      data[i * 4] = q; data[i * 4 + 1] = q; data[i * 4 + 2] = q; data[i * 4 + 3] = 255;
    }
    this.dirtMean = sum / (N * N);

    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.name = 'bloomLensDirt';
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;   // sampled at 30x16 — mips are mandatory
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }

  // ---------------------------------------------------------------------------
  // the pass
  // ---------------------------------------------------------------------------

  get enabled() {
    if (this.failed) return false;
    if (!this._presetEnabled) return false;
    if (!this.params.enabled) return false;
    return this.ctx.debug.flags.bloom !== false;
  }

  _execute(gbuf, ctx) {
    if (!this.enabled || !gbuf || !gbuf.sceneHDR) return;
    try {
      this._run(gbuf);
    } catch (e) {
      this.failed = true;
      if (!this._warned) {
        this._warned = true;
        console.warn('[bloom] pass threw, degrading to passthrough:', e && (e.message || e));
      }
    }
  }

  _run(gbuf) {
    const r = this.r;
    const p = this.params;
    // NOTE: `gbuf.width/height` are unreliable — renderer.js's `_allocate()`
    // early-returns when the size is unchanged, and the very first call happens
    // from ctx.setSize() BEFORE `_gbufObj` exists, so the published gbuf
    // dimensions can stay pinned at 1x1 for the whole session. Filed under
    // HANDOFF `## requests`. `renderer.width/height` is the authoritative pair.
    const W = this.r.width || gbuf.width || 1;
    const H = this.r.height || gbuf.height || 1;

    // --- build the mip chain descriptors (half res, then /2 each level) ------
    const chain = this._mips;
    chain.length = 0;
    let w = Math.max(1, Math.ceil(W / 2));
    let h = Math.max(1, Math.ceil(H / 2));
    for (let i = 0; i < p.mips; i++) {
      if (i > 0) {
        const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1);
        // A 3x3 tent on a 5-px mip is noise, not glare. Stop early rather than
        // grinding out 1x1 levels that only add banding.
        if (Math.min(nw, nh) < 6) break;
        w = nw; h = nh;
      }
      chain.push(r.rt('bloomMip' + i, { w, h }));
    }
    if (!chain.length) return;

    // --- downsample ----------------------------------------------------------
    const dm = this._down.uniforms;
    dm.uClamp.value = p.clamp;
    const th = p.softThreshold;
    if (th > 0) {
      const knee = Math.max(1e-4, th * p.softKnee);
      dm.uKnee.value.set(th, th - knee, 2 * knee, 0.25 / knee);
    } else {
      dm.uKnee.value.set(0, 0, 0, 0);
    }

    let srcTex = gbuf.sceneHDR, srcW = W, srcH = H;
    for (let i = 0; i < chain.length; i++) {
      dm.tSrc.value = srcTex;
      dm.uTexel.value.set(1 / srcW, 1 / srcH);
      dm.uKaris.value = (i < p.karisSteps) ? 1 : 0;
      r.fullscreen(this._down, chain[i]);
      srcTex = chain[i].texture; srcW = chain[i].width; srcH = chain[i].height;
      // the knee is a prefilter: first downsample only
      if (i === 0) dm.uKnee.value.set(0, 0, 0, 0);
    }

    // --- anamorphic streak (sourced from mip2, before the upsample muddies it)
    const flags = this.ctx.debug.flags;
    let streakTex = null;
    if (p.streakPasses > 0 && p.streakIntensity > 0 && chain.length > 2 && !flags.bloomNoStreak) {
      streakTex = this._buildStreak(chain[2], W, H);
    }

    // --- upsample: tent + energy-conserving convex blend ---------------------
    const um = this._up.uniforms;
    um.uRadius.value = p.filterRadius;
    um.uScatter.value = THREE.MathUtils.clamp(p.scatter, 0.0, 1.0);
    const dirt = flags.bloomNoDirt ? 0.0 : p.dirtIntensity;
    for (let i = chain.length - 1; i > 0; i--) {
      const dst = chain[i - 1];
      um.tSrc.value = chain[i].texture;
      um.uTexel.value.set(1 / dst.width, 1 / dst.height);
      // Dirt modulates the widest `dirtLevels` mips only (§7.5).
      um.uDirt.value = (i >= chain.length - p.dirtLevels) ? dirt : 0.0;
      r.fullscreen(this._up, dst);
    }

    // --- composite -----------------------------------------------------------
    const out = r.rt('bloomOut', { w: W, h: H });
    const cm = this._comp.uniforms;
    cm.tScene.value = gbuf.sceneHDR;
    cm.tBloom.value = chain[0].texture;
    cm.tStreak.value = streakTex || this._black;
    cm.uStrength.value = THREE.MathUtils.clamp(p.strength, 0, 1);
    cm.uStreak.value = streakTex ? p.streakIntensity : 0.0;
    cm.uStreakTint.value.set(p.streakTint.r, p.streakTint.g, p.streakTint.b);
    cm.uStreakHue.value = p.streakHue;
    cm.uMode.value = flags.bloomDirt ? 2 : (flags.bloomOnly ? 1 : 0);
    r.fullscreen(this._comp, out);

    // Hand the composited frame downstream. grade.js (order 110) and the
    // renderer's fallback blit both read gbuf.sceneHDR and need no changes.
    gbuf.sceneHDR = out.texture;
    gbuf.color = out.texture;
    this.outputTexture = out.texture;
  }

  _buildStreak(srcRt, W, H) {
    const r = this.r;
    const p = this.params;
    // Quarter of the render resolution: wide enough to hold a 90-texel streak,
    // cheap enough that 3 passes cost less than one full-res tap.
    const sw = Math.max(8, Math.ceil(W / 4));
    const sh = Math.max(8, Math.ceil(H / 4));
    const a = r.rt('bloomStreakA', { w: sw, h: sh });
    const b = r.rt('bloomStreakB', { w: sw, h: sh });

    this._streakPre.uniforms.tSrc.value = srcRt.texture;
    this._streakPre.uniforms.uGate.value.copy(p.streakGate);
    r.fullscreen(this._streakPre, a);

    let read = a, write = b;
    const n = Math.min(p.streakPasses, p.streakStrides.length);
    for (let i = 0; i < n; i++) {
      this._streakBlur.uniforms.tSrc.value = read.texture;
      this._streakBlur.uniforms.uStep.value.set(p.streakStrides[i] / sw, 0);
      r.fullscreen(this._streakBlur, write);
      const t = read; read = write; write = t;
    }
    return read.texture;
  }

  // ---------------------------------------------------------------------------

  debugInfo() {
    return {
      enabled: this.enabled,
      failed: this.failed,
      preset: this.ctx.quality.preset,
      mips: this._mips.map(m => `${m.width}x${m.height}`),
      strength: this.params.strength,
      scatter: this.params.scatter,
      dirtMean: this.dirtMean,
      dirtSize: this.params.dirtSize,
      streakPasses: this.params.streakPasses,
    };
  }

  dispose() {
    this.ctx.frameGraph?.unregister?.('bloom');
    this._down?.dispose(); this._up?.dispose();
    this._streakPre?.dispose(); this._streakBlur?.dispose(); this._comp?.dispose();
    this.dirt?.dispose(); this._black?.dispose();
    // Render targets belong to the renderer's pool — never disposed here.
  }
}
