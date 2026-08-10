// SURFACE DETAIL — the procedural material layer.
//
// THE PROBLEM THIS FILE EXISTS FOR. Before it, every surface in the game was a
// single flat albedo modulated by one 2.7 m / 1.4 m noise. In the dark that is
// invisible and the game looks good; the moment a muzzle flash or a scar lights
// a wall it reads as untextured geometry — docs/RENDER.md's automatic failure #1
// ("nothing in a AAA frame is one colour. Ever."), #3 (no detail-scale
// variation), and the material-response axis outright.
//
// WHAT IT ADDS, and the whole of it lives inside the two surface programs that
// already existed — ZERO new programs, and the seventeen are still seventeen:
//
//   1. TRIPLANAR DETAIL NORMALS at 5 cm and 50 cm, from value noise evaluated
//      WITH its analytic gradient (one evaluation gives both the height and the
//      slope, so a relief map costs no more taps than a breakup map).
//   2. STOCHASTIC MACRO BREAKUP at 5 m, and every breakup term in this file is
//      a SCALAR multiplying albedo — it moves VALUE and never hue, because the
//      player has moderate deuteranomaly and docs/RENDER.md's palette law puts
//      the whole signal on the blue/yellow axis. A hue-varying breakup would
//      pass a trichromat screenshot and vanish in the simulated one.
//   3. CAVITY AND PEAK WEAR read from the SAME field that bent the normal, so
//      the albedo and the relief agree. Disagreeing ones are the single most
//      recognisable "normal map bolted onto a flat colour" tell.
//   4. CONTACT DARKENING with no shadow map anywhere in this game (below).
//   5. A ROUGHNESS response, so a rough surface reads as SOFT-EDGED rather than
//      as merely darker (W6-VIEWMODEL filed exactly this request).
//
// THREE RULES IT NEVER BREAKS.
//
//   NOTHING HERE ADDS LIGHT. Every term is a multiplier on albedo or a rotation
//   of the normal, so all of it is exactly zero in an unlit frame. docs/RENDER.md
//   records the sibling project's dark biome carrying 4-18x the chroma
//   high-frequency energy of any other frame because small ABSOLUTE per-pixel
//   perturbations were written into sceneHDR at 54x exposure: "a hash dither, a
//   detail-noise term, an interleaved-gradient offset or a normal-map jitter on
//   a near-black albedo all do this." A multiplicative term cannot.
//
//   EVERY BREAKUP TERM IS ZERO-MEAN. Value noise with smoothstep interpolation
//   has mean 0.5, so `(v - 0.5) * k` has mean 0 and a wall keeps the albedo the
//   chamber authored. That is not tidiness: tests/world.mjs asserts THE INTAKE's
//   unlit floor stays inferable at a measured 13.5% against a 12% floor, and a
//   breakup term that quietly darkened the world by 6% would spend that margin.
//
//   EVERY OCTAVE IS BAND-LIMITED AGAINST ITS OWN NYQUIST, using the world-space
//   size of a pixel from screen derivatives. 5 cm noise on a wall 30 m away is
//   not detail, it is aliasing — automatic failure #2, "crawling / shimmering
//   edges", which is the one this project cannot buy back with TAA because D11
//   ruled SMAA and there is no history buffer to filter with.
//
// GLSL DISCIPLINE (docs/RENDER.md, paid for five times in the sibling repo):
// identifiers inside comments are quoted with "double quotes" and NEVER with
// backticks; "flat", "half" and "sat" are never identifiers; no literal version
// directive; no dynamically indexed uniform array; loop-free fixed octaves.
//
// This file exports GLSL SOURCE ONLY. It builds no material, holds no state and
// imports nothing — materials.js owns the one frozen table for the module and
// hands it in, so a tuning value still cannot hide inside a shader string
// (CONTRACT §5). It declares NO uniform of its own: every knob arrives as a
// function parameter, which is what lets the viewmodel take the roughness
// response without taking the triplanar cost.

/**
 * Build the two shared GLSL chunks.
 * @param {object} T   MATERIAL_TABLE — the one frozen table, owned by materials.js
 * @param {(v:number)=>string} f   GLSL float literal formatter
 */
export function makeSurfaceGlsl(T, f) {
  // Derived literals, computed HERE in JavaScript rather than in the shader:
  // a reciprocal per fragment is free, but a reciprocal per fragment that FXC
  // has to prove is loop-invariant is not, and the table stays the only place a
  // human reads a number.
  const invFine = f(1 / T.microFine);
  const invMid = f(1 / T.microMid);
  const invMacro = f(1 / T.microMacro);
  const bandLo = f(T.microFine * T.bandLo);
  const bandHi = f(T.microFine * T.bandHi);
  // Each band samples its noise on a lattice rotated by its own angle. Without
  // this the three bands' square grids line up into ONE visible grid — CRITIC
  // automatic failure #3, "visible tiling in a ground or wall texture" — and it
  // is plainly there in the first capture this gate took. Precomputed here so
  // the shader carries two literals per band rather than a sin and a cos.
  const rot = a => `vec2(${f(Math.cos(a))}, ${f(Math.sin(a))})`;
  const rotFine = rot(T.microRotate[0]);
  const rotMid = rot(T.microRotate[1]);
  const rotMacro = rot(T.microRotate[2]);

  // -------------------------------------------------------------------------
  // NOISE. One implementation, and it returns the gradient because everything
  // above it wants both. docs/RENDER.md: a breaking-loop fbm cost one sibling
  // material OVER A MINUTE of link time, so octaves are fixed and unrolled by
  // hand, never counted by a uniform.
  // -------------------------------------------------------------------------
  const CHUNK_NOISE = `
float flareHash(vec2 p){
  return fract(sin(dot(p, vec2(${f(T.hashA)}, ${f(T.hashB)}))) * ${f(T.hashK)});
}

// Value noise AND its analytic gradient in one evaluation.
//   .x  = value in 0..1, mean exactly 0.5
//   .yz = d(value)/d(p.x), d(value)/d(p.y)
// The gradient is the whole reason detail normals are affordable here. Deriving
// a normal by finite differences costs three noise evaluations per plane per
// scale; this costs one, because the interpolant has a closed-form derivative
// and the bilinear form is a polynomial whose partials are two more
// multiply-adds. Four hashes, either way.
//
// THE INTERPOLANT IS QUINTIC, NOT SMOOTHSTEP, and for a relief map that is not
// a refinement — it is the difference between a surface and a grid. The cubic
// "g*g*(3-2g)" is C1: its SECOND derivative jumps at every cell boundary, which
// is invisible in a value used as albedo and glaringly visible in a value whose
// GRADIENT becomes a normal. The first capture from tests/picture.mjs showed the
// near floor as a field of soft squares for exactly this reason. Perlin's
// quintic "6t^5 - 15t^4 + 10t^3" is C2, so the normal is continuous across cells
// and the lattice stops being a thing the eye can find. It costs two multiplies.
vec3 flareNoiseD(vec2 p){
  vec2 i = floor(p);
  vec2 g = fract(p);
  vec2 u = g * g * g * (g * (g * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * g * g * (g * (g - 2.0) + 1.0);
  float a = flareHash(i);
  float b = flareHash(i + vec2(1.0, 0.0));
  float c = flareHash(i + vec2(0.0, 1.0));
  float d = flareHash(i + vec2(1.0, 1.0));
  float k1 = b - a;
  float k2 = c - a;
  float k3 = a - b - c + d;
  return vec3(
    a + k1 * u.x + k2 * u.y + k3 * u.x * u.y,
    du.x * (k1 + k3 * u.y),
    du.y * (k2 + k3 * u.x)
  );
}

float flareValueNoise(vec2 p){ return flareNoiseD(p).x; }

// Loop-free, fixed octave count. The octaves, the weights and the cell sizes are
// EXACTLY the ones the chambers were authored against ("uDetail", floored at
// BUILD.detailFloor) — re-tuning somebody else's authored surface while adding
// to it is how an art pass becomes a regression nobody can bisect.
//
// One honest caveat: it now shares the quintic interpolant above, where it used
// to have its own cubic. That is a real change to a term this file did not
// author. It is a strictly smoother curve with the same mean, the same cells and
// the same amplitude, on a 2.7 m / 1.4 m albedo modulation where the difference
// is far under a code value; keeping a second interpolant alive purely to
// preserve bit-exactness would have meant a second noise function in every
// surface program. Flagged rather than hidden, because it means the gate's
// "before" frame is the shipping shader with the art pass switched off, not a
// byte-exact replay of the previous build.
float flareFbm2o(vec2 p){
  return flareValueNoise(p) * 0.65 + flareValueNoise(p * ${f(T.detailScale2)} + vec2(11.0, 7.0)) * 0.35;
}
`;

  // -------------------------------------------------------------------------
  // THE MICRO LAYER.
  // -------------------------------------------------------------------------
  const CHUNK_MICRO = `
// Triplanar weights, |n|^4, written as two squarings rather than a "pow".
// The exponent is a SHAPE decision (how hard the projection snaps to the
// dominant axis), not a tuning value, so it is spelled out as multiplication
// instead of sitting in the table looking adjustable.
vec3 flareTriWeights(vec3 n){
  vec3 w = abs(n);
  w = w * w;
  w = w * w;
  return w / max(w.x + w.y + w.z, 1e-5);
}

// The world-space size of ONE PIXEL on this surface. Every octave below is
// faded out against this, which is the whole anti-aliasing story for procedural
// detail in a renderer with no TAA and no mip chain to fall back on. Must be
// called from top-level control flow: a derivative inside a branch is undefined.
float flareFootprint(vec3 wp){
  vec3 ax = dFdx(wp);
  vec3 ay = dFdy(wp);
  return max(length(ax), length(ay));
}

// One octave, projected on all three planes and blended by the triplanar
// weights. Returns the value in .x and the WORLD-SPACE gradient of that value
// in .yzw, so octaves at different scales compose by simple addition.
//
// The per-plane gradient mapping is the part that is easy to get wrong and
// impossible to see when it is wrong (a transposed pair reads as "the relief
// lights from the side", which looks deliberate):
//   plane ZY  (x-facing)  p = (z, y)  ->  d/dz = .y,  d/dy = .z
//   plane XZ  (y-facing)  p = (x, z)  ->  d/dx = .y,  d/dz = .z
//   plane XY  (z-facing)  p = (x, y)  ->  d/dx = .y,  d/dy = .z
//
// EACH PLANE IS GATED ON ITS OWN WEIGHT, and on this game's geometry that is
// most of the cost. With weights raised to the fourth power, an axis-aligned
// face has one weight at 1.0 and two at ~0, so a wall or a floor evaluates ONE
// projection instead of three; only the genuinely oblique surfaces (THE HELIX's
// ramp, a canted slab) pay for two or three. The branch is uniform across whole
// primitives, which is the cheap kind. Measured on the shipping INTAKE: the
// whole art pass went from +1.14 ms to well under half that, with no visible
// difference, because the dropped planes were contributing <0.4% of the value.
// The threshold is what makes that true, and it is the reason this is a gate and
// not a "skip if small" hack: 0.004 of a term whose own range is +-0.5 is below
// a quarter of an 8-bit code value at any exposure this game reaches.
// THE GRADIENT IS RETURNED IN NOISE UNITS, NOT PER METRE, and that is a
// deliberate choice that cost this file its first version. The true world
// gradient is d(value)/d(metre) = d(value)/d(p) * s, and at s = 1/0.055 that is
// eighteen times larger than the same slope at 1 m cells — so a coefficient
// tuned for the 50 cm band drives the 5 cm band eighteen times too hard. The
// first build did exactly that: relief gradients reached ~27 per metre, the
// perturbed normal was essentially random, a QUARTER of the flash-lit floor
// clamped to black behind the terminator, and the region lost 34% of its mean
// luminance. It looked, in a screenshot, like a slightly noisy floor.
//
// Leaving out the "* s" makes each band's relief SELF-SIMILAR: the bump height
// scales with the cell size, which is both the correct model for a fractal
// surface and the behaviour an artist expects — a coefficient means the same
// visual slope in every band. The amplitude of the relief is then a slope, and
// the caller's coefficients read directly as one.
// Value and gradient on a lattice ROTATED by "rot" = (cos a, sin a). The value
// is sampled at "R p" and the gradient is brought back to p-space through the
// transpose, which for a rotation is the inverse. Getting that transpose wrong
// is silent: the relief still looks like relief, it is just lit from an angle
// that no light in the scene occupies.
vec3 flareRotNoiseD(vec2 p, vec2 rot){
  vec2 q = vec2(p.x * rot.x - p.y * rot.y, p.x * rot.y + p.y * rot.x);
  vec3 a = flareNoiseD(q);
  return vec3(a.x, a.y * rot.x + a.z * rot.y, a.z * rot.x - a.y * rot.y);
}

vec4 flareTriNoise(vec3 wp, vec3 w, float s, vec2 rot){
  vec4 acc = vec4(0.0);
  if (w.x > 0.004) { vec3 a = flareRotNoiseD(wp.zy * s, rot); acc += vec4(a.x, 0.0, a.z, a.y) * w.x; }
  if (w.y > 0.004) { vec3 a = flareRotNoiseD(wp.xz * s, rot); acc += vec4(a.x, a.y, 0.0, a.z) * w.y; }
  if (w.z > 0.004) { vec3 a = flareRotNoiseD(wp.xy * s, rot); acc += vec4(a.x, a.y, a.z, 0.0) * w.z; }
  return acc;
}

// THE MICRO LAYER. Bends the normal at 50 cm and 5 cm, breaks albedo up on the
// VALUE axis at 5 cm / 50 cm / 5 m, and returns the albedo multiplier.
// "amount" is the product of the material's own uDetail and the one runtime
// knob; at zero this function is a no-op and the surface is bit-for-bit the one
// that shipped before this file existed, which is what makes the gate's
// before/after A/B an honest comparison rather than two different pictures.
float flareMicro(vec3 wp, vec3 w, float px, float amount, float rough, inout vec3 n){
  // ROUGHNESS IS THE AMOUNT OF MICRO-RELIEF, and this is the strongest and
  // cheapest roughness cue available to a renderer with no GGX: a polished slab
  // has almost no visible surface relief and a chalk wall has all of it. W6
  // filed the rim-exponent half of the roughness request; this is the half that
  // works on the world, where there is no rim term at all. It costs one mix.
  amount *= mix(${f(T.roughDetailFloor)}, 1.0, rough);
  if (amount <= 0.0) return 1.0;

  // ---- 50 cm. The band that carries relief all the way to the far wall: at
  // this frame's ~1.6 mrad per pixel it does not reach its own Nyquist until
  // about 170 m, and the longest sightline in the game is 70 m.
  vec4 mid = flareTriNoise(wp, w, ${invMid}, ${rotMid});
  vec3 grad = mid.yzw * ${f(T.microReliefMid)};
  float value = (mid.x - 0.5) * ${f(T.microBreakupMid)};

  // ---- 5 m. Stochastic macro breakup, VALUE ONLY: a stain has no relief, and
  // giving it one is what makes a wall read as bubblewrap. This is the scale
  // W4-BUILD had to fake with a CPU per-instance tint because "the family has
  // no texture uniform and materials.js is not mine to change" — it is real now,
  // it is continuous across a surface instead of constant per instance, and it
  // works on the static walls the per-instance trick could never reach.
  value += (flareTriNoise(wp, w, ${invMacro}, ${rotMacro}).x - 0.5) * ${f(T.microBreakupMacro)};

  // ---- 5 cm. The near-field grain, faded against its own Nyquist and BRANCHED
  // OUT past it. The branch is distance-coherent, so it is close to free; but
  // the fade is not an optimisation, it is correctness. Unfiltered 5 cm noise in
  // the far field is automatic failure #2 and there is no TAA here to hide it.
  float grain = 1.0 - smoothstep(${bandLo}, ${bandHi}, px);
  if (grain > 0.002) {
    vec4 fine = flareTriNoise(wp, w, ${invFine}, ${rotFine});
    grad += fine.yzw * (${f(T.microReliefFine)} * grain);
    // Cavity and peak, from the SAME field that bent the normal: valleys grime
    // down, ridges wear bright. Zero-mean, so this cannot darken a chamber.
    value += (fine.x - 0.5) * (${f(T.microWearFine)} * grain);
  }

  // Surface-gradient normal bend (Mikkelsen): project the gradient onto the
  // tangent plane and lean the normal downhill. Two properties earn it over the
  // usual tangent-space blend — the perturbed normal cannot drift off the
  // surface however many octaves are added, and octaves at different scales sum
  // linearly, which is why "grad" above could just accumulate.
  vec3 tang = grad - n * dot(grad, n);
  n = normalize(n - tang * (${f(T.reliefStrength)} * amount));

  return clamp(1.0 + value * amount, ${f(T.microAlbedoMin)}, ${f(T.microAlbedoMax)});
}

// CONTACT DARKENING, in a renderer with ZERO shadow maps.
//
// The irradiance splat already stores, per texel, R = the summed scar energy and
// G = that energy times the scar height — so G/R is the intensity-weighted mean
// scar HEIGHT, which is the height of the light pool this fragment is standing
// in, i.e. the floor, wherever the floor happens to be. That makes this correct
// on THE HELIX's 34 m spiral, where an absolute world Y would be nonsense.
//
// It is gated three ways, and each gate is load-bearing:
//   * by the pool's own energy, so it only appears where there is light to
//     occlude — the same argument that makes the contact blobs honest;
//   * by (1 - n.y), so the FLOOR does not occlude itself (an ungated version
//     paints a dark disc under every light pool, which reads as a broken decal);
//   * by height above the pool, so it is a contact term and not a fog.
float flareContact(vec3 wp, vec3 n, float e, float meanY, float amount){
  if (e <= 0.0 || amount <= 0.0) return 1.0;
  float upright = 1.0 - clamp(n.y, 0.0, 1.0);
  float atFloor = 1.0 - smoothstep(0.0, ${f(T.contactHeight)}, wp.y - meanY);
  float pool = clamp(e * ${f(T.contactLightK)}, 0.0, 1.0);
  return 1.0 - amount * upright * atFloor * pool;
}

// MATERIAL RESPONSE. There is no GGX in this game and there will not be one, but
// most of what separates a polished slab from a chalk wall happens at grazing
// incidence — so roughness drives BOTH the width of a Fresnel-shaped sheen and
// its amplitude. W6-VIEWMODEL's filed request is the exponent half of this:
// "amplitude alone makes a rough surface read as a dark surface rather than as a
// soft-edged one." The return value MULTIPLIES the diffuse term, so like
// everything else in this file it is exactly 1.0 where there is no light.
float flareSheen(vec3 n, vec3 v, float rough, float amount){
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fres = pow(1.0 - ndv, mix(${f(T.roughExpSmooth)}, ${f(T.roughExpRough)}, rough));
  return 1.0 + fres * (${f(T.sheen)} * amount) * (1.0 - rough);
}
`;

  return { CHUNK_NOISE, CHUNK_MICRO };
}

export default makeSurfaceGlsl;
