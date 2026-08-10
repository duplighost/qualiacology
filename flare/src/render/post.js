// POST — bloom, the single GRADE pass, SMAA 1x, the blit, the IRIS, and the
// photosensitivity brake.
//
// The grade's internal order is load-bearing and it is written down because two
// of its steps were rulings, not preferences:
//
//   bloom combine
//   -> grain, scaled by LOCAL LUMINANCE and applied BEFORE the gain multiply
//      (D10: +-0.050-0.078 of grain applied AFTER the iris multiply, on top of an
//      unlit world sitting at ~0.018-0.05, buried the exact signal the low-mids
//      contrast fix existed to protect)
//   -> iris gain
//   -> cold/warm split
//   -> filmic, masked by smoothstep(0.03, 0.30, luma), with a max(col, 0.006)
//      floor (this is THE contrast fix; the game lives in the toe)
//   -> tension grade
//   -> halation, gated on the EMISSIVE-FAMILY FLAG and never on luma (GROUPED G8:
//      halation keyed on luma warms the cold enemy family, which is the one
//      colour separation the design cannot lose)
//   -> vignette
//   -> exact piecewise sRGB OETF
//   -> 8x8 Bayer dither at +-0.5/255
//
// ORDER NOTE, deliberate: docs/RENDER.md's P6 arrow-list writes "dither -> OETF"
// but GROUPED G6 rules "the mandatory 1/255 Bayer dither ... is applied after the
// exact piecewise sRGB OETF, not after pow(1/2.2) — the difference is visible
// precisely in the toe, which is where this entire game lives." G6 is the ruling
// and dithering is only correct in the quantised output space anyway, so the
// dither runs last. Recorded here so the next reader does not "fix" it back.
//
// D11 stands: SMAA, never TAA. TAA needs motion vectors and a history buffer,
// smears a viewmodel that moves every frame, and its ghosting is worst on exactly
// the high-contrast thin emissives this game is made of.

import * as THREE from 'three';
import FEEL from '../feel.js';
import { VS_FULLSCREEN } from './materials.js';

export const POST_TABLE = Object.freeze({
  luma: Object.freeze([0.2126, 0.7152, 0.0722]),      // Rec.709, LINEAR light
  // Narkowicz ACES approximation. Cheap, monotone, and it is only ever applied
  // through the low-mids mask, so its toe never touches the dark world.
  filmic: Object.freeze({ a: 2.51, b: 0.03, c: 2.43, d: 0.59, e: 0.14 }),
  srgb: Object.freeze({ cut: 0.0031308, slope: 12.92, scale: 1.055, offset: 0.055, gamma: 2.4 }),
  gradePivot: 0.18,
  grainHashA: 12.9898, grainHashB: 78.233, grainHashK: 43758.5453,
  // The bloom chain length lives in PASS_TABLE, which owns the targets. One home.
  smaaThreshold: 0.055,
  smaaAdapt: 0.5,
  smaaSearchSteps: 8,
  smaaMaxBlend: 0.5,
  shotRing: 64,
  flashWindowSeconds: 1.0,
});

const P = POST_TABLE;
const f = v => { const s = Number(v).toString(); return (s.includes('.') || s.includes('e')) ? s : s + '.0'; };
const LUMA = `vec3(${f(P.luma[0])}, ${f(P.luma[1])}, ${f(P.luma[2])})`;

// ---------------------------------------------------------------------------
// THE IRIS — the trade, and the photosensitivity brake. No GPU, no allocation.
// ---------------------------------------------------------------------------
//
// D2 got the direction right and C1-F2 got the magnitude: the cost is
// DARK-ADAPTATION, and you only have adaptation to lose when your eyes are
// already open. So the stop is MULTIPLICATIVE and scales with how open the iris
// currently is:
//
//     gain = max(FLOOR, gain * (1 - stopW * (gain/CEIL) * (ads ? 0.6 : 1)))
//
// Fully dark-adapted, a BREACHER shot takes 2.60 -> 0.572, a 4.5x stop. In a lit
// room the same shot costs 31%, because there was little adaptation to spend.
//
// C1-F8 bounds the ambient term's AUTHORITY rather than deleting it: the target
// is clamp(2.60 - lit*1.55, 1.05, 2.60), a 2.5x gain compression against a scene
// whose own luminance rises far more than 2.5x, so net composite brightness still
// climbs monotonically with the scar field. The FLOOR is light-dependent too --
// a lit room is a forgiving room.
export function makeIris(ctx) {
  const I = FEEL.iris;
  const S = FEEL.safety;

  let gain = I.ceil;
  let target = I.ceil;
  let floorValue = I.floorBase;
  let overshoot = 0;
  let clock = 0;

  const shotTimes = new Float32Array(P.shotRing);
  const flashTimes = new Float32Array(P.shotRing);
  let shotHead = 0, shotCount = 0;
  let flashHead = 0, flashCount = 0;
  let lastFlashGain = 1;
  let stops = 0;
  let clamped = 0;
  let pinned = false;
  let pinnedValue = I.ceil;

  const countWithin = (arr, n, head, window) => {
    let c = 0;
    for (let k = 0; k < n; k++) {
      const idx = (head - 1 - k + P.shotRing * 2) % P.shotRing;
      if (clock - arr[idx] <= window) c++; else break;
    }
    return c;
  };

  const push = (arr, head) => { arr[head] = clock; return (head + 1) % P.shotRing; };

  /**
   * A shot fired. Returns the flash gain the muzzle light must be scaled by.
   * SAFETY.md rule 2 is the primary brake and it is also the better mechanic:
   * the FIRST shot of a burst is the one that shows you the room, so tapping
   * reads the space and spraying does not.
   */
  function shot(stopW, ads) {
    const n = countWithin(shotTimes, shotCount, shotHead, S.burstWindow);
    shotHead = push(shotTimes, shotHead);
    shotCount = Math.min(P.shotRing, shotCount + 1);

    let flashGain = 1 / (1 + n * S.burstDecay);

    // Third brake, and it is predictive rather than reactive: if this flash would
    // be the fourth qualifying transition inside a second, it is clamped BEFORE
    // it is drawn. WCAG 2.3.1 allows three.
    const recentFlashes = countWithin(flashTimes, flashCount, flashHead, P.flashWindowSeconds);
    if (flashGain >= S.flashLumaDelta && recentFlashes >= S.maxFlashesPerSecond) {
      flashGain = Math.min(flashGain, S.flashSafeClamp);
      clamped++;
    }
    if (flashGain >= S.flashLumaDelta) {
      flashHead = push(flashTimes, flashHead);
      flashCount = Math.min(P.shotRing, flashCount + 1);
    }

    if (ctx.flashSafe) {
      // FLASH-SAFE removes the per-shot exposure transient ENTIRELY and clamps
      // the flash. The game stays fully playable because every signal in it is
      // required to be redundant anyway (CONTRACT §6).
      flashGain = Math.min(flashGain, S.flashSafeClamp);
      lastFlashGain = flashGain;
      return flashGain;
    }

    const scale = ads ? I.adsScale : 1;
    const before = gain;
    gain = Math.max(floorValue, gain * (1 - stopW * (gain / I.ceil) * scale));
    const depth = before > 0 ? (before - gain) / before : 0;
    overshoot = Math.max(overshoot, I.overshoot * depth);
    stops++;
    lastFlashGain = flashGain;
    return flashGain;
  }

  /** A whole-frame slam: a BLOOM detonation, or THE DAMP. */
  function slam(amount) {
    if (ctx.flashSafe) return;
    gain = Math.max(floorValue, gain * (1 - amount));
  }

  function update(rdt, litFraction) {
    clock += rdt;
    const lit = litFraction || 0;
    target = Math.min(I.ceil, Math.max(I.targetMin, I.ceil - lit * I.targetLitAuthority));
    floorValue = I.floorBase + I.floorPerLit * lit;

    // Pinned: the QA determinism hook. The sibling repo's rule, ported — an
    // adaptive exposure makes every A/B compare two different frames, so the
    // regression harness must be able to freeze it (their grade.fixedEV). It is
    // never set during play; iris.pinned is published on the snapshot so a build
    // that shipped with it on is visible.
    if (pinned) { gain = pinnedValue; return; }

    const k = 1 - Math.exp(-I.recoveryLambda * rdt);
    overshoot *= Math.exp(-I.recoveryLambda * rdt);
    // The overshoot rebounds PAST the target and settles back onto it, which is
    // what dark adaptation does. The aim, not the endpoint, carries it.
    const aim = target * (1 + overshoot);
    gain += (aim - gain) * k;
    if (gain < floorValue) gain = floorValue;
    const hardCeil = I.ceil * (1 + I.overshoot);
    if (gain > hardCeil) gain = hardCeil;
  }

  function reset() {
    gain = I.ceil; target = I.ceil; overshoot = 0; clock = 0;
    shotHead = 0; shotCount = 0; flashHead = 0; flashCount = 0;
    stops = 0; clamped = 0; lastFlashGain = 1;
  }

  /** QA only: freeze the gain so a regression capture compares like with like. */
  function pin(value) { pinned = true; pinnedValue = value === undefined ? gain : value; gain = pinnedValue; }
  function unpin() { pinned = false; }

  return {
    shot, slam, update, reset, pin, unpin,
    get pinned() { return pinned; },
    get gain() { return gain; },
    get target() { return target; },
    get floor() { return floorValue; },
    get flashGain() { return lastFlashGain; },
    get burstCount() { return countWithin(shotTimes, shotCount, shotHead, FEEL.safety.burstWindow); },
    get flashesInWindow() { return countWithin(flashTimes, flashCount, flashHead, P.flashWindowSeconds); },
    snapshot() {
      return {
        gain, target, floor: floorValue, flashGain: lastFlashGain,
        burst: countWithin(shotTimes, shotCount, shotHead, FEEL.safety.burstWindow),
        flashesInWindow: countWithin(flashTimes, flashCount, flashHead, P.flashWindowSeconds),
        stops, safetyClamps: clamped, flashSafe: !!ctx.flashSafe, pinned,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const HEAD = `
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
`;

const FS_BLOOM_DOWN = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uThresholdOn;
void main(){
  // 4-tap bilinear box. Cheap, and at half res the extra taps of a 13-tap kernel
  // buy nothing this frame can show.
  vec4 a = texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSrc, vUv + uTexel * vec2( 1.0, -1.0));
  vec4 c = texture(uSrc, vUv + uTexel * vec2(-1.0,  1.0));
  vec4 d = texture(uSrc, vUv + uTexel * vec2( 1.0,  1.0));
  vec4 s = (a + b + c + d) * 0.25;
  if (uThresholdOn > 0.5) {
    float l = dot(s.rgb, ${LUMA});
    float k = max(0.0, l - uThreshold) / max(l, 1e-4);
    s.rgb *= k;
    // Alpha carries the EMISSIVE-FAMILY FLAG through the whole chain, which is
    // what lets the grade gate halation on the flag instead of on luma. The
    // clamp to [0,1] is load-bearing: viewmodel fragments write NEGATIVE alpha,
    // and letting that into the blur would subtract halation from whatever the
    // gun happens to be standing in front of.
    s.a = clamp(s.a, 0.0, 1.0) * k;
  }
  fragColor = s;
}
`;

const FS_BLOOM_UP = `${HEAD}
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uRadius;
void main(){
  vec2 o = uTexel * uRadius;
  vec4 s = texture(uSrc, vUv + vec2(-o.x,  o.y)) + texture(uSrc, vUv + vec2(0.0,  o.y)) * 2.0 + texture(uSrc, vUv + vec2(o.x,  o.y));
  s += texture(uSrc, vUv + vec2(-o.x, 0.0)) * 2.0 + texture(uSrc, vUv) * 4.0 + texture(uSrc, vUv + vec2(o.x, 0.0)) * 2.0;
  s += texture(uSrc, vUv + vec2(-o.x, -o.y)) + texture(uSrc, vUv + vec2(0.0, -o.y)) * 2.0 + texture(uSrc, vUv + vec2(o.x, -o.y));
  fragColor = s * 0.0625;
}
`;

const FS_GRADE = `${HEAD}
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uGain;
uniform vec3  uCold;
uniform vec3  uWarm;
uniform vec2  uSplit;
uniform vec2  uContrastMask;
uniform float uBlackFloor;
uniform float uContrast;
uniform vec3  uHalation;
uniform float uHalationStrength;
uniform vec2  uVignette;
uniform float uTunnel;
uniform float uDither;
uniform float uGammaTrim;
uniform float uFrame;
uniform vec2  uResolution;

float gradeHash(vec2 p){
  return fract(sin(dot(p, vec2(${f(P.grainHashA)}, ${f(P.grainHashB)}))) * ${f(P.grainHashK)});
}

vec3 filmic(vec3 x){
  vec3 n = x * (x * ${f(P.filmic.a)} + ${f(P.filmic.b)});
  vec3 d = x * (x * ${f(P.filmic.c)} + ${f(P.filmic.d)}) + ${f(P.filmic.e)};
  return clamp(n / d, 0.0, 1.0);
}

vec3 srgbOetf(vec3 c){
  c = max(c, vec3(0.0));
  vec3 lo = c * ${f(P.srgb.slope)};
  vec3 hi = ${f(P.srgb.scale)} * pow(c, vec3(1.0 / ${f(P.srgb.gamma)})) - ${f(P.srgb.offset)};
  return mix(lo, hi, step(vec3(${f(P.srgb.cut)}), c));
}

// 8x8 Bayer, generated by bit interleave rather than read from a const array:
// a dynamically indexed array is the exact shape ANGLE/D3D11 lowers to a
// generated helper with the X4000 warning the harness promotes to an error.
float bayer8(ivec2 p){
  int x = p.x & 7;
  int y = p.y & 7;
  int v = 0;
  for (int i = 2; i >= 0; --i) {
    int bx = (x >> i) & 1;
    int by = (y >> i) & 1;
    v = (v << 2) | ((bx ^ by) << 1) | by;
  }
  return float(v) / 64.0;
}

void main(){
  vec4 scene = texture(uScene, vUv);
  vec4 bloom = texture(uBloom, vUv);

  // 1 — bloom combine. Bloom is the picture here, not a garnish.
  vec3 col = scene.rgb + bloom.rgb * uBloomStrength;

  // 2 — grain, BEFORE the gain multiply and scaled by LOCAL luminance (D10), so
  //     it textures what is lit and cannot invent detail in the black.
  float localLuma = dot(col, ${LUMA});
  float g = gradeHash(vUv * uResolution + vec2(uFrame, uFrame * 1.7)) - 0.5;
  col += g * 2.0 * uGrain * localLuma;

  // 3 — the iris.
  col *= uGain;

  // The VIEWMODEL MASK, written as negative alpha by the P4 materials. The gun
  // is 30% of the screen and the brightest large object in a dark frame, so
  // every luminance-weighted look term lands on it at full strength and on the
  // world at almost none. Blending those terms toward identity here is the fix
  // the sibling project scoped across three files and never built.
  float vm = clamp(-scene.a, 0.0, 1.0);

  // 4 — cold/warm split. Separation lives on the blue-yellow axis, which is the
  //     axis moderate deuteranomaly leaves intact.
  float sl = dot(col, ${LUMA});
  vec3 tint = mix(uCold, uWarm, smoothstep(uSplit.x, uSplit.y, sl));
  col *= mix(tint, vec3(1.0), vm);

  // 5 — filmic, masked to the highlights only, with a black floor. Everything
  //     below the mask stays linear, which is the entire contrast fix.
  col = max(col, vec3(uBlackFloor));
  float ml = dot(col, ${LUMA});
  col = mix(col, filmic(col), smoothstep(uContrastMask.x, uContrastMask.y, ml));

  // 6 — tension grade, also held off the viewmodel.
  col = (col - ${f(P.gradePivot)}) * mix(uContrast, 1.0, vm) + ${f(P.gradePivot)};

  // 7 — halation, gated on the emissive-family flag carried in bloom alpha.
  col += uHalation * bloom.a * uHalationStrength;

  // 8 — vignette. Capped tunnel crush: peripheral motion is a colourblind
  //     player's strongest channel and the draft was removing it at exactly the
  //     tension where it matters most (GROUPED G7).
  float r = length(vUv - 0.5) * 1.41421356;
  float vig = smoothstep(uVignette.x, uVignette.y, r);
  col *= mix(1.0, vig, uTunnel);

  // 9 — exact piecewise sRGB OETF, then the display trim from the start screen's
  //     calibration card, then dither. NOT pow(1/2.2): the difference is visible
  //     in the toe and the toe is where this game lives.
  col = clamp(col, 0.0, 1.0);
  col = srgbOetf(col);
  col = pow(col, vec3(uGammaTrim));

  // 10 — 8x8 Bayer at +-0.5/255, rotated per frame so the pattern cannot fix in
  //      place. An 8-bit gradient without dither bands, and banding is the single
  //      most reliable "this is WebGL" tell in the book.
  ivec2 dp = ivec2(gl_FragCoord.xy) + ivec2(int(uFrame) & 3, (int(uFrame) >> 2) & 3);
  col += (bayer8(dp) - 0.5) * uDither;

  fragColor = vec4(col, 1.0);
}
`;

// --- SMAA 1x, orthogonal. -----------------------------------------------------
// Deliberate reduction, named so nobody has to reverse-engineer it: this is the
// three-pass SMAA 1x structure (edge detection -> blend weights -> neighbourhood
// blending) with ORTHOGONAL patterns only. No diagonal search, no corner
// rounding, and therefore no 160x560 area LUT and no 64x16 search LUT — roughly
// 90 KB of base64 and two texture uploads that buy diagonal coverage this frame
// does not need. What it does cover is exactly what D11 asked for: the stepping
// on thin high-contrast emissives over black.
const FS_SMAA_EDGE = `${HEAD}
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uAdapt;
void main(){
  float L  = dot(texture(uTex, vUv).rgb, ${LUMA});
  float Ll = dot(texture(uTex, vUv - vec2(uTexel.x, 0.0)).rgb, ${LUMA});
  float Lt = dot(texture(uTex, vUv - vec2(0.0, uTexel.y)).rgb, ${LUMA});
  float Lr = dot(texture(uTex, vUv + vec2(uTexel.x, 0.0)).rgb, ${LUMA});
  float Lb = dot(texture(uTex, vUv + vec2(0.0, uTexel.y)).rgb, ${LUMA});
  vec4 delta = abs(vec4(L) - vec4(Ll, Lt, Lr, Lb));
  vec2 edges = step(vec2(uThreshold), delta.xy);
  if (edges.x + edges.y == 0.0) { fragColor = vec4(0.0); return; }
  // Local contrast adaptation: suppress an edge that is dwarfed by a stronger
  // one next to it, which is what stops SMAA eating fine texture.
  float maxDelta = max(max(delta.x, delta.y), max(delta.z, delta.w));
  edges *= step(maxDelta * uAdapt, delta.xy);
  fragColor = vec4(edges, 0.0, 1.0);
}
`;

const FS_SMAA_WEIGHT = `${HEAD}
uniform sampler2D uEdges;
uniform vec2 uTexel;
uniform int uSearchSteps;

float edgeAt(vec2 uv, int channel){
  vec2 e = texture(uEdges, uv).rg;
  return channel == 0 ? e.r : e.g;
}

// Run length along an edge in one direction, bounded by a UNIFORM step count.
// Constant bounds make ANGLE/FXC attempt an unroll, which is how the sibling
// project got a compile that did not return.
float runLength(vec2 uv, vec2 dir, int channel){
  float d = 0.0;
  for (int i = 1; i <= uSearchSteps; ++i) {
    if (edgeAt(uv + dir * float(i), channel) < 0.5) break;
    d += 1.0;
  }
  return d;
}

// MLAA trapezoid coverage. cov is this pixel's position along the run; a step at
// the near end pulls coverage below the half-pixel line, a step at the far end
// pushes it above, and a run stepped at both ends is the symmetric bow-tie.
vec2 orthoWeights(float d1, float d2, float c1, float c2){
  float len = d1 + d2 + 1.0;
  float cov = (d1 + 0.5) / len;
  float wNear = c1 > 0.5 ? clamp(0.5 - cov, 0.0, 0.5) : 0.0;
  float wFar  = c2 > 0.5 ? clamp(cov - 0.5, 0.0, 0.5) : 0.0;
  return vec2(wNear, wFar);
}

void main(){
  vec2 e = texture(uEdges, vUv).rg;
  vec4 w = vec4(0.0);   // up, down, left, right

  if (e.g > 0.5) {
    // Horizontal edge: search left/right along it, crossings are vertical edges.
    vec2 dx = vec2(uTexel.x, 0.0);
    float d1 = runLength(vUv, -dx, 1);
    float d2 = runLength(vUv,  dx, 1);
    float c1 = edgeAt(vUv - dx * (d1 + 1.0), 0);
    float c2 = edgeAt(vUv + dx * (d2 + 1.0), 0);
    vec2 o = orthoWeights(d1, d2, c1, c2);
    float amount = o.x + o.y;
    w.x = amount;
  }
  if (e.r > 0.5) {
    // Vertical edge: search up/down, crossings are horizontal edges.
    vec2 dy = vec2(0.0, uTexel.y);
    float d1 = runLength(vUv, -dy, 0);
    float d2 = runLength(vUv,  dy, 0);
    float c1 = edgeAt(vUv - dy * (d1 + 1.0), 1);
    float c2 = edgeAt(vUv + dy * (d2 + 1.0), 1);
    vec2 o = orthoWeights(d1, d2, c1, c2);
    w.z = o.x + o.y;
  }
  fragColor = w;
}
`;

const FS_SMAA_BLEND = `${HEAD}
uniform sampler2D uTex;
uniform sampler2D uWeights;
uniform vec2 uTexel;
uniform float uMaxBlend;
void main(){
  vec4 w = texture(uWeights, vUv);
  vec3 base = texture(uTex, vUv).rgb;
  float wv = min(w.x, uMaxBlend);
  float wh = min(w.z, uMaxBlend);
  if (wv + wh <= 0.0) { fragColor = vec4(base, 1.0); return; }
  vec3 up = texture(uTex, vUv - vec2(0.0, uTexel.y)).rgb;
  vec3 dn = texture(uTex, vUv + vec2(0.0, uTexel.y)).rgb;
  vec3 lf = texture(uTex, vUv - vec2(uTexel.x, 0.0)).rgb;
  vec3 rt = texture(uTex, vUv + vec2(uTexel.x, 0.0)).rgb;
  vec3 col = base;
  col = mix(col, (up + dn) * 0.5, wv);
  col = mix(col, (lf + rt) * 0.5, wh);
  fragColor = vec4(col, 1.0);
}
`;

const FS_BLIT = `${HEAD}
uniform sampler2D uTex;
uniform float uOpacity;
void main(){
  fragColor = vec4(texture(uTex, vUv).rgb * uOpacity, 1.0);
}
`;

// ---------------------------------------------------------------------------

function rawPost(fragmentShader, uniforms) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VS_FULLSCREEN,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    blending: THREE.NoBlending,
  });
}

export function makePostMaterials(ctx) {
  const R = FEEL.render;

  const bloomDown = rawPost(FS_BLOOM_DOWN, {
    uSrc: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uThreshold: { value: R.bloomThreshold },
    uThresholdOn: { value: 0 },
  });

  const bloomUp = rawPost(FS_BLOOM_UP, {
    uSrc: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uRadius: { value: R.bloomRadius * 4 },
  });
  bloomUp.blending = THREE.CustomBlending;
  bloomUp.blendSrc = THREE.OneFactor; bloomUp.blendDst = THREE.OneFactor; bloomUp.blendEquation = THREE.AddEquation;
  bloomUp.blendSrcAlpha = THREE.OneFactor; bloomUp.blendDstAlpha = THREE.OneFactor; bloomUp.blendEquationAlpha = THREE.AddEquation;

  const grade = rawPost(FS_GRADE, {
    uScene: { value: null },
    uBloom: { value: null },
    uBloomStrength: { value: R.bloomStrength },
    uGrain: { value: R.grainBase },
    uGain: { value: FEEL.iris.ceil },
    uCold: { value: new THREE.Vector3().fromArray(R.cold) },
    uWarm: { value: new THREE.Vector3().fromArray(R.warm) },
    uSplit: { value: new THREE.Vector2(R.splitMask.lo, R.splitMask.hi) },
    uContrastMask: { value: new THREE.Vector2(R.contrastMask.lo, R.contrastMask.hi) },
    uBlackFloor: { value: R.blackFloor },
    uContrast: { value: R.contrast },
    uHalation: { value: new THREE.Vector3().fromArray(R.halation) },
    uHalationStrength: { value: 1 },
    uVignette: { value: new THREE.Vector2(R.vignette.lo, R.vignette.hi) },
    uTunnel: { value: R.tunnelMax },
    uDither: { value: R.ditherAmplitude },
    uGammaTrim: { value: 1 },
    uFrame: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  });

  const smaaEdge = rawPost(FS_SMAA_EDGE, {
    uTex: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uThreshold: { value: P.smaaThreshold },
    uAdapt: { value: P.smaaAdapt },
  });

  const smaaWeight = rawPost(FS_SMAA_WEIGHT, {
    uEdges: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uSearchSteps: { value: P.smaaSearchSteps },
  });

  const smaaBlend = rawPost(FS_SMAA_BLEND, {
    uTex: { value: null },
    uWeights: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uMaxBlend: { value: P.smaaMaxBlend },
  });

  const blit = rawPost(FS_BLIT, {
    uTex: { value: null },
    uOpacity: { value: 1 },
  });

  return { bloomDown, bloomUp, grade, smaaEdge, smaaWeight, smaaBlend, blit };
}

export default makePostMaterials;
