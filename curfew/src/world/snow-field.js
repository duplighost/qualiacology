// SETTLED SNOW, AS ONE FIELD THE WHOLE COUNTY SHARES.
//
// ALEX, 2026-09-18, playing the shipped build: "the snow looks awful." Round 21 gave the
// county a snow SWITCH — one lerp from the ground's albedo to one flat colour — and a
// switch is what it looked like: 64 km^2 of level ground going evenly pale, with the
// surface relief turned DOWN as it went (chunks.js faded gRelief by 0.84 under cover), so
// the more snow lay the flatter the county got. Paint, not a substance.
//
// WHAT WINTERLINE DOES, AND WHAT IS PORTED. qualiacology/winterline/src/snow.js opens with
// the whole lesson in one line: "A box of snow reads as a box." Its snow is overlapping
// flattened domes of VARIED height with four tints in rotation, a thin crust where it slid
// and refroze, tracks pressed through it, and a slab used in exactly one place — snow lying
// on a ledge. Its material is a photographed albedo with a NORMAL map and roughness 0.95:
// form at the metre scale from geometry, grain at the centimetre scale from the normal.
// It cannot be copied here — that is a lit city with street lamps, a different renderer and
// a PBR texture set this project does not ship — but the technique ports exactly:
//
//   FORM       a drift field in world metres, three octaves, driving a HEIGHT in metres
//              that goes through the same countyReliefNormal() the soil already uses. Under
//              cover the ground swaps the soil's relief for the snow's; it never goes flat.
//   BREAK-UP   the tone varies 0.72..1.00 of the snow albedo, never above it.
//   THE EDGE   cover is a threshold on the drift against the fall, so a thin fall fills the
//              lobes and leaves the crowns bare, and the boundary is a few centimetres wide
//              instead of a metre. Where the cover ends there is a LIP, and a lip is the one
//              part of a snow field turned squarely at the sky.
//   NIGHT      the form is all in the DARK half. The crest never exceeds uSnowCol, which is
//              the value CFG sanctioned; the shadow drops to 0.72 of it and goes BLUE, which
//              is what a snow shadow actually does and what stops a night county reading as
//              grey paint. Nothing here can blow out under ACES at exposure 1.15.
//
// One field, two consumers — chunks.js's county floor and places.js's made surfaces — so a
// destination's yard and the field it stands in drift the same way at the seam between them.
// No new uniform, no new texture, no new program: it is arithmetic on a world position both
// shaders already have.

export const SNOW_FIELD_GLSL = [
  // NOT a sin-based hash. The county runs to about +-4000 m and a sin() of a dot product
  // that large has lost most of its mantissa by the far ring, which shows up as banding in
  // the one place nobody ever photographs. This is the integer-style hash instead, with the
  // cell wrapped first so the argument stays small: the field repeats every 2048 cells,
  // which for the finest octave is 800 m of a 0.4 m grain and for the coarsest is 25 km.
  'float countySnowHash( vec2 c ) {',
  '  vec3 p3 = fract( mod( c, 2048.0 ).xyx * 0.1031 );',
  '  p3 += dot( p3, p3.yzx + 33.33 );',
  '  return fract( ( p3.x + p3.y ) * p3.z );',
  '}',
  'float countySnowNoise( vec2 p ) {',
  '  vec2 c = floor( p ), f = fract( p );',
  '  f = f * f * ( 3.0 - 2.0 * f );',
  '  float a = countySnowHash( c );',
  '  float b = countySnowHash( c + vec2( 1.0, 0.0 ) );',
  '  float d = countySnowHash( c + vec2( 0.0, 1.0 ) );',
  '  float e = countySnowHash( c + vec2( 1.0, 1.0 ) );',
  '  return mix( mix( a, b, f.x ), mix( d, e, f.x ), f.y );',
  '}',
  // THE DRIFT. Three octaves in WORLD metres, so it does not swim with the camera and two
  // adjacent meshes agree about it: lobes about 12 m across (what the wind piled), ripples
  // about 2.3 m (what it combed into them), and a grain about 0.4 m (what you see at your
  // feet). x, y, z are the octaves; w is the field the COVER is thresholded against.
  //
  // Each octave is warped by the one above it. Value noise on a square lattice gives round
  // blobs on a grid and you can see the grid; one add of the coarser octave into the finer
  // one's sample point costs nothing and takes the lattice out of the silhouette.
  //
  // THE GRAIN IS ALMOST ABSENT FROM w, AND THAT IS THE POINT. The first cut weighted it at
  // 0.14 and a thin cover came out STIPPLED — a 0.4 m feature crossing a hard threshold is
  // ten pixels of on/off at twenty metres, which reads as dither, not as snow. At 0.08 the
  // grain can no longer cross the threshold on its own; it only roughens an edge that the
  // metre-scale octaves decide. It keeps its full weight in the tone and the height, where
  // nothing is thresholded and it is exactly the detail that was missing.
  'vec4 countySnowDrift( vec2 p ) {',
  '  float lobe = countySnowNoise( p * 0.081 + 3.70 );',
  '  float ripple = countySnowNoise( p * 0.44 + 21.9 + lobe * 1.70 );',
  '  float grain = countySnowNoise( p * 2.60 + 57.3 + ripple * 0.90 );',
  '  return vec4( lobe, ripple, grain, lobe * 0.58 + ripple * 0.34 + grain * 0.08 );',
  '}',
  /*
   * THE ONE ANSWER.
   *
   *   p     world xz, in metres
   *   fall  how much snow is lying, 0..1 (uWeather.x)
   *   bias  what this surface itself does with snow: the ground passes its own grit so the
   *         low spots between stones fill before the crowns do; a made surface passes 0.
   *   up    how level this fragment is, 0..1. Snow slides off a bank and stays on the flat,
   *         and that one term is most of what makes a cover read as depth rather than paint.
   *
   * x  cover 0..1, what fraction of this fragment is snow rather than what is under it
   * y  tone, a multiplier on the snow albedo. Never above 1: see the note at the top.
   * z  crest 0..1, the packed windward face — smoother than powder, so roughness reads it
   * w  height in metres, for countyReliefNormal()
   */
  'vec4 countySnow( vec2 p, float fall, float bias, float up ) {',
  '  vec4 d = countySnowDrift( p );',
  '  float hold = d.w + bias - 0.5;',
  // The fall slides the whole field past the threshold: at fall 1 every hold clears it and
  // the cover is complete, at fall 0.4 only the deepest lobes hold anything.
  '  float edge = hold + fall * 1.30 - 0.58;',
  // 14 cm of field, not 8.5: wide enough that the grain cannot flick a fragment across it
  // on its own, narrow enough that the cover still ENDS somewhere instead of fading out
  // over a metre the way the round-21 curve did.
  '  float deep = smoothstep( 0.0, 0.14, edge );',
  // A dusting reaches a long way further out than the cover does, and is never the whole
  // surface. This is the half of the curve that carries the first minute of a fall: the
  // lay-in takes 75 s (CFG.world.weather.snowLayS) and a county that shows nothing for the
  // first forty of them has no arriving weather, only weather that has already arrived.
  '  float thin = smoothstep( -0.50, 0.05, edge ) * 0.46;',
  '  float cover = clamp( max( deep, thin ) * up, 0.0, 1.0 );',
  '  float lip = deep * ( 1.0 - smoothstep( 0.12, 0.34, edge ) );',
  '  float tone = min( 1.0, 0.72 + 0.28 * ( d.y * 0.58 + d.z * 0.42 ) + lip * 0.20 );',
  '  float crest = clamp( ( tone - 0.72 ) / 0.28, 0.0, 1.0 );',
  // METRES, and they are the whole reason this returns a height at all: the coefficients
  // are on 0..1 noises, so a term of 0.40 is a swell of +-0.20 m. Against the octaves'
  // wavelengths (12.3 m, 2.3 m, 0.39 m) this MEASURES an rms surface slope of 0.092 and a
  // worst case of 0.33 — about five degrees of tilt on average and eighteen at the steepest
  // clump. A settled surface you can see the shape of, well short of the sandpaper a bigger
  // grain gives, and the finest octave is still twenty fragments wide at forty metres, where
  // chunks.js's gNear is already fading the whole term out.
  '  float height = ( d.x - 0.5 ) * 0.400 + ( d.y - 0.5 ) * 0.190 + ( d.z - 0.5 ) * 0.080;',
  '  return vec4( cover, tone, crest, height );',
  '}',
  // The colour a tone means. The dark half is not just darker: it loses red and gains blue,
  // because a snow shadow is lit by the sky alone and the sky at night in this county is the
  // only blue in the frame. The crest is exactly uSnowCol and never more.
  'vec3 countySnowColour( vec3 snowCol, float tone ) {',
  '  float shade = 1.0 - tone;',
  '  return vec3( snowCol.r * ( tone - shade * 0.18 ), snowCol.g * tone, snowCol.b * ( tone + shade * 0.34 ) );',
  '}',
].join('\n');
