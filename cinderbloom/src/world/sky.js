// =============================================================================
// CINDERBLOOM — atmosphere, sun/companion, clouds, and image-based lighting.
// Owner: sky agent.
//
// PALETTE AUTHORITY, ROUND 11 ONWARD: docs/PALETTE_TARGET.md (the Thessaly
// teal) and docs/ACCESSIBILITY.md are BINDING and they WIN over
// docs/ART_DIRECTION.md §2/§3.3 wherever the two disagree about a colour. ART is
// still the authority on everything else in §3 — the day arc, the irradiance
// table, the aerosol model, the §3.2 key:fill band — and those are untouched.
// What changed is which hue the scattered field is, not how much of it there is.
// Read PALETTE_TARGET.md before editing any constant in the first 500 lines.
// =============================================================================
//
// ## ROUND 11 IN ONE PARAGRAPH, so the next agent does not have to reconstruct it
//
// A shadowed VERTICAL surface had the same hue as the sun (tools/_skyhue.mjs:
// dHue 1.6 / 4.3 / 6.5 deg on the sunward normal at establish / ridge / water,
// against 126 deg on the up-facing one). Round 6 had fixed the zenith and
// stopped, and the zenith is worth nothing to a vertical normal — it sees it at
// dot(d,n) = 0. Decomposing that fill found two circumsolar terms nobody had
// ever integrated over a vertical hemisphere — the amber wedge and round 7's
// widened Mie aureole — together supplying 64% of its red. Both are re-rationed
// here (SKY_TABLE's glow column, and the aureole lobes in cbSkyBase), the
// horizon anchor is re-pointed from amber to pale cyan-green at UNCHANGED
// luminance, the aerial pass's single-scattering albedo is inverted so distance
// goes toward the sky hue, the night gets an emissive-dominant model built out
// of BIO_GLOW / BURN_GLOW / BIO_MAGENTA, and the companion star finally becomes
// a real second light. Every one of those has its own derivation block below.
//
// ## What this file is responsible for
//
//   1. The sky's radiance in every direction, at every time of day.
//   2. The scene's ONLY ambient term — a PMREM built from that same radiance
//      field. `AmbientLight`/`HemisphereLight` are banned (ART §3.2); the fill
//      must be cool-above / warm-below, which only a real environment map does.
//   3. The key light (`this.sun`, a DirectionalLight `engine/shadows.js` takes
//      the cascades off) with the colour/irradiance table from ART §3.1, scaled
//      by SUN_GAIN so that ART §3.2's 4:1-to-8:1 key:fill is actually true. That
//      constant is the single most consequential number in the file — its
//      derivation is above the constant, and `tools/keyfill.mjs` measures it.
//   3b. `ctx.world.skyIrradiance` — the sky's cosine-weighted irradiance on an
//      up-facing surface, for flora's backlit-crown transmission (HANDOFF ask).
//   4. Analytic aerial perspective BEYOND the volumetric march (frame-graph
//      order 45), with the per-channel sigmas of ART §3.5.
//   5. That the sky is never EMPTY (ART §6.5): two self-shadowed cloud decks,
//      the Nail, the amber horizon wedge, and three burn-plume columns.
//
// ## The one thing to understand before editing anything here
//
// This file owns the colour of every surface in the game that is not in direct
// sun. That is most of the pixels in most frames. Round 4's critics graded the
// build "shaded, not lit" and traced it to one measurable fact: a shadowed
// pixel was the SAME HUE as a lit one, to within 0.2 degrees. The block above
// SUN_GAIN's neighbour, THE CHROMATIC KEY:FILL SPLIT, is the record of what was
// wrong and what the numbers are now. `tools/_skyhue.mjs` re-measures it in
// about a minute and is the only honest way to know whether an edit here
// helped. Do not change SKY_CHROMA_*, AIRMASS_K, GROUND_ALBEDO or the bounce
// without running it before and after.
//
// ## The model, and why it is a table rather than a Rayleigh integrator
//
// ART §3.3 does not describe an Earth atmosphere with the hue rotated: it
// specifies the sky's radiance at four sun elevations and three directions,
// and derives them from a mechanism (1.4 bar Rayleigh, a permanent soot
// aerosol that eats blue ~3x harder than red over a long slant path, and a
// K4V primary that emits little blue to begin with).
//
// I fitted a physical single-scatter integrator to those nine anchors first.
// It cannot reach them: a scattering-dominated atmosphere makes the horizon
// 20-30x brighter than the zenith, and §3.3 asks for 1.6x. The doc's sky is
// ABSORPTION-dominated near the horizon, which is the whole point of the soot.
// Rather than ship a physical model that misses the art direction, the sky is
// an analytic Preetham-family model whose three colour terms ARE the §3.3
// table, interpolated over sun elevation:
//
//     L(d) = mix(Zenith, Horizon, airmass(d.y))            <- vertical gradient
//          + Glow * airmass^1.35 * cos(azimuth to sun)^3   <- the amber wedge
//          + Aureole(sun) + SunDisc + Nail + Stars + BurnGlow
//          + clouds composited over all of it
//
// Consequences, all deliberate:
//   * the §3.3 anchors are hit EXACTLY at the horizon and the zenith, by
//     construction, at 20 / 4 / -6 deg and night;
//   * multiple scattering is not approximated, it is *already in* the table
//     (the doc's numbers are converged radiances, not single-scatter ones), so
//     the horizon is never artificially dark;
//   * the terminator is a table interpolation plus an explicit twilight wedge
//     and an anti-solar earth-shadow arch, which is a better-behaved (and far
//     cheaper) dusk than a 24x8 march that goes black the moment the light
//     march is blocked by the planet;
//   * the whole sky costs ~40 ALU, which is what pays for real clouds.
//
// ## Geometry — the sky CANNOT be frustum-clipped, by construction
//
// The previous dome was `BoxGeometry(2,2,2)` scaled 3000: its corners sat at
// 5196 m against `camera.far = 4000`, so the rasteriser sliced it open and left
// a black wedge that two agents filed against terrain. Scaling it to 1200 fixed
// the wedge and silently broke the IBL instead (the CubeCamera's far plane was
// 1000, so the dome was entirely outside it and `scene.environment` was a
// BLACK PMREM — that is why the foreground was crushed to near-black navy with
// no midtones, and most of why the colour-depth gate failed).
//
// The fix is to make the failure mode impossible rather than to pick a better
// number: the sky is a single triangle whose vertex shader writes CLIP SPACE
// directly and never touches modelViewMatrix or projectionMatrix. There is no
// scale, no radius, no far plane it can exceed, in the main pass or in the six
// cube faces. `frustumCulled = false` because there is nothing to cull.
//
// ## gbuffer
//
// The dome writes all four MRT attachments (`cbWritesGBuffer = true`), including
// a CAMERA-ROTATION-ONLY velocity with `CB_FLAG.SKY` in `.b`. taa.js and
// motionblur.js both carry a fallback that synthesises this and both retire
// themselves the moment a non-zero vector appears — it now does.
//
// ## Knobs — `ctx.debug.sky`
//
//   exposure        overall gain on sky radiance (1 = ART §3.3 as written)
//   chroma          0..1 on the sky's luminance-preserving chroma expansion.
//                   0 = ART §3.3's anchors raw (the pre-round-5 look, where a
//                   shadowed pixel was the same HUE as a lit one to within
//                   0.2 deg); 1 = as derived. `tools/_skyhue.mjs` A/Bs it.
//   key             multiplier on SUN_GAIN, the key:fill ratio. 1 = derived.
//                   `key = 1/5.08` reproduces the pre-terminator-fix build, which
//                   is how `tools/keyab.mjs` A/Bs it in a single boot.
//   iblGain         multiplier on SKY_GAIN, the OTHER half of that ratio.
//                   1 = derived. `key = 5.08/6.66, iblGain = 1/0.457` reproduces
//                   the round-6 build exactly; `tools/_skyratio.mjs --base` and
//                   `tools/_skyhue.mjs --base` set precisely that pair.
//   sunDisc         disc peak radiance gain
//   nail            companion-star radiance
//   plumes          burn-plume column gain (ART §6.3, §6.5). 0 = off.
//   cloudCover      0..1 added to the weather's coverage
//   cloudDensity    multiplier on optical depth
//   cloudAlt        low deck altitude, km
//   cloudAltHigh    high deck altitude, km
//   stars           star field gain
//   burn            night burn-field horizon glow gain — the AMBER night accent
//   bio             cyan bioluminescent airglow gain — the night's KEY, and the
//                   lower hemisphere that lights the grotto. 0 = the round-10
//                   night (an orange ember pedestal and nothing else).
//   magenta         sparse violet accent gain on the night horizon
//   nailLight       gain on the companion star's DirectionalLight. 0 reproduces
//                   every build before round 11, in which the Nail was drawn and
//                   cast no light at all.
//   veil            ROUND 12. Scales the aerial pass's single-scattering albedo
//                   while holding sigmaT, so it moves how BRIGHT the distance is
//                   without moving how FAR you can see. THE contrast knob for
//                   this file; see AERIAL_ALBEDO. 1 = shipped.
//   weatherKey      ROUND 12. Crossfades the cloud/ash deck's attenuation of the
//                   key. 1 = shipped; 0 reproduces every build before round 12,
//                   in which `storm` was lit like a clear afternoon. Exactly a
//                   no-op under `clear` at any setting. See KEY_DECK_TAU.
//   iblSize         cube face size for the PMREM source (needs re-init)
//   iblInterval     sim frames between cloud-drift IBL refreshes
//   aerial          0..1 gain on the >volMaxDist aerial perspective pass
//   flags.sky       master on/off for the aerial pass (`__CB.toggle('sky')`)
// =============================================================================

import * as THREE from 'three';
import { clamp, sat, TAU, DEG } from '../util/math.js';
import { CB_FLAG, CB_LAYER } from '../engine/renderer.js';

// -----------------------------------------------------------------------------
// ART_DIRECTION §3.1 — the day arc. Peak-normalised linear sun colour and the
// irradiance in the scene units of §2.2. The key is NEVER white.
//
// The `irradiance` column is used VERBATIM for everything the camera sees of
// the sky itself (aureole, disc, cloud lighting) and is multiplied by SUN_GAIN
// for the DirectionalLight. See SUN_GAIN below for why, and for the numbers.
// -----------------------------------------------------------------------------
const SUN_TABLE = [
  //  elev    r      g      b      irradiance
  [  52.0, 1.000, 0.784, 0.535, 6.40 ],
  [  30.0, 1.000, 0.722, 0.451, 5.30 ],
  [  20.0, 1.000, 0.652, 0.372, 4.20 ],
  [  10.0, 1.000, 0.520, 0.226, 2.40 ],
  [   4.0, 1.000, 0.372, 0.108, 1.15 ],
  [   0.5, 1.000, 0.252, 0.052, 0.42 ],
  [  -3.0, 1.000, 0.190, 0.036, 0.00 ],   // key off; the sky carries the frame
];

// -----------------------------------------------------------------------------
// SUN_GAIN — THE SHADOW TERMINATOR. Read this before touching it.
//
// Symptom (four independent blind critics, three of four naming it): no shot in
// the review set lets you determine the sun's direction; every trunk has the
// same value on both sides; MATERIALS graded 2/10 because texture cannot show
// without a light direction.
//
// Cause, measured with `node tools/keyfill.mjs` on a mid-grey Lambertian probe
// rendered to an RGBA32F target — key = (render with the sun) minus (render
// with `sun.intensity = 0`), fill = the second render:
//
//     vista        elev     key:fill on horizontal ground   lit:shadow
//     establish    7.0deg          0.083 : 1                   1.08
//     mat-flora   12.7deg          0.197 : 1                   1.20
//     canopy      15.7deg          0.233 : 1                   1.23
//     water       21.7deg          0.340 : 1                   1.34
//     storm       36.8deg          0.665 : 1                   1.67
//
// ART §3.2 asks for 4:1 to 8:1. `establish` shipped at 0.083:1 — the fill was
// TWELVE TIMES the key, and a lit face differed from a shadowed face of the
// same material by 8%. That is not a terminator, it is a rounding error.
//
// It is not an ambient that is too bright. It is a key that is too dim, and by
// a knowable amount, for two compounding reasons:
//
//  1. THE 1/PI. three r161 (verified against the vendored source, not memory):
//       direct   RE_Direct_Physical  : dotNL * lightColor * albedo / PI
//       indirect getIBLIrradiance    : PI * envColor * envMapIntensity
//                RE_IndirectDiffuse  : irradiance * albedo / PI = envColor * albedo
//     The DirectionalLight is divided by PI. The environment is not. Any table
//     of "irradiance" typed straight into `light.intensity` is therefore 3.14x
//     weak against a PMREM built from radiances in the same units.
//
//  2. THE UNIT MISMATCH BETWEEN §3.1 AND §3.3. Take the document at its word:
//     §2.2 fixes the scale ("sunlit Bone ash at 20 deg reads ~= 1.0"), §3.1
//     gives E = 4.20 at 20 deg, §3.3 gives the sky radiances whose cosine-
//     weighted hemisphere average is (0.747, 1.001, 0.908). Then
//
//        lit A4 bone ash = (E_sun_horiz + E_sky_horiz) * albedo / PI
//                        = (2.964*sin20 + PI*0.9403) * 0.3876 / PI
//                        = (1.014 + 2.954) * 0.1234  =  0.49
//
//     The document's own numbers land its own anchor at HALF. §3.1's irradiance
//     column and §3.3's radiance table are not in the same units.
//
// Solving for the single gain G that makes §2.2's anchor true:
//
//        (G * 1.014 + 2.954) * 0.1234 = 1.0   ->   G = 5.08
//
// and that same G lands the key:fill ratio, sun-normal irradiance against sky
// hemispheric irradiance, at
//
//        G * 2.964 / 2.954 = 5.10 : 1
//
// which is the middle of §3.2's 4:1-to-8:1 band. One constant satisfies both
// constraints simultaneously, from two independent directions, which is the
// reason to believe it rather than to treat it as a fudge factor.
//
// WHAT IT DOES AND DOES NOT SCALE. The gain is a property of the LIGHT, not of
// the sky image. It multiplies:
//   * `sun.intensity` (hence, in phase and for free, volumetrics' in-scatter,
//     weapons' viewmodel key, water's specular and vfx's particle lighting —
//     all four read `sun.intensity` or `getSunIrradiance()`);
//   * the key-driven half of the ground-bounce hemisphere (§3.2), because that
//     term IS reflected key and must track it or the underside fill goes cold.
// It deliberately does NOT touch the aureole, the sun disc, the cloud lighting
// or the §3.3 table: those are the sky's own radiance, they are anchored, and
// scaling them would just move the problem into a 5x glare blob.
//
// Consequence worth knowing: sunlit ground now reads BRIGHTER than the zenith
// sky (1.08 against 0.90 at 20 deg), which is correct for a 0.41-albedo surface
// and is the inverse of what shipped. Do not "fix" that back.
//
// `ctx.debug.sky.key` scales this at runtime for A/B; 1.0 is the derivation.
//
// ROUND 7 — WHY 5.08 WAS STILL HALF THE ANSWER, AND WHY SKY_GAIN NOW EXISTS.
//
// The derivation above solves for ONE unknown against TWO constraints and gets
// lucky. Look at which surface each constraint is about:
//
//   §2.2's anchor  ("sunlit bone ash reads 1.0")  is about a surface the sun
//                  actually lands on, i.e. cos-weighted, i.e. HORIZONTAL ground;
//   the 5.10:1     the block quotes is sun-NORMAL irradiance over sky
//                  hemispheric irradiance — a surface tilted to face the sun.
//
// On this planet the sun never exceeds 52 deg and the review set plays at
// -0.4 to 37 deg, so those two surfaces differ by a factor of 1/sin(elev) —
// between 1.7x and 130x. Measured with `node tools/keyfill.mjs` on the shipped
// 5.08 build, key:fill on HORIZONTAL ground:
//
//   vista        elev     up key:fill   sunward key:fill   shaded A4 luma
//   ridge      -0.44deg     0.000            0.617             0.053
//   establish   6.97deg     0.434            2.061             0.186
//   mat-ground 12.71deg     1.009            3.519             0.272
//   canopy     15.67deg     1.195            3.525             0.349
//   water      21.65deg     1.741            3.968             0.451
//   storm      36.83deg     3.383            4.580             0.521
//
// §3.2 asks for 4:1 to 8:1. Five of six vistas are under 2:1 on the surface the
// critics look at, and the last column is the tell: §3.2's irradiance FLOOR for
// shaded up-facing ash is 0.045, and the build sits at 4x to 10x it. The sun was
// never the problem after round 4 — the FILL is an order of magnitude above the
// floor the document sets for it.
//
// So solve for two unknowns against the two constraints, both stated on the same
// (horizontal) surface. Same anchors as above: at 20 deg,
//
//     E_key  = SUN_GAIN * 2.964 * sin20 = SUN_GAIN * 1.014
//     E_fill = SKY_GAIN * pi * 0.9403   = SKY_GAIN * 2.954
//     lit A4 = (E_key + E_fill) * 0.3876 / pi = (E_key + E_fill) * 0.1234
//
//   (i)  §2.2:  lit A4 = 1.0            ->  E_key + E_fill = 8.104
//   (ii) §3.2:  E_key / E_fill = 5      ->  the middle of the 4:1-8:1 band,
//                                           now on the right surface
//
//   E_key = 6.753 -> SUN_GAIN = 6.66     E_fill = 1.351 -> SKY_GAIN = 0.457
//
// R = 5 is also exactly the acceptance test: switching the sun off drops a lit
// horizontal surface by 5/6 = 83%, inside the 75-90% a real daylight frame gives
// and well past the 70% gate. The shipped build dropped it by 13-23%.
//
// Note this MOVES ALMOST NO ENERGY: the anchor is held, so a lit surface is the
// same brightness it always was. What changes is that 83% of it now comes from a
// direction instead of 63% coming from everywhere. Auto-exposure therefore has
// almost nothing to undo, which is the trap RESUME.md warns about.
// -----------------------------------------------------------------------------
const SUN_GAIN = 6.66;

// -----------------------------------------------------------------------------
// SKY_GAIN — the other half of the ratio. Derived immediately above.
//
// It is a property of the SCATTERED FIELD: it multiplies the §3.3 anchors
// (zenith, horizon, glow), the burn deck, the aureole and the radiance the cloud
// decks are lit by — so the drawn sky, the PMREM built from it, `_skyAverage`,
// the sky-reflected half of the ground bounce, `ctx.world.skyIrradiance` and the
// order-45 aerial in-scatter all move together and the picture can never
// disagree with the lighting about how bright the sky is.
//
// It deliberately does NOT multiply:
//   * the sun DISC or the Nail — point emitters, art-directed in absolute terms
//     (their solid angle is ~7e-5 sr, so they contribute ~2e-5 of the fill and
//     are invisible to every integral in this file). Holding them fixed while
//     the scattered field drops 2.2x is most of ART §6.5's "put a sun in the
//     sky": the disc was always there and was always crushed into the same top
//     stop as the sky around it;
//   * the ground bounce's KEY-driven half, which tracks SUN_GAIN instead,
//     because that term is reflected sun, not scattered sky.
//
// Consequence to expect and not to "fix": the sky goes from reading as a pale
// cream wash at the top of the tone curve to sitting a stop and a half under
// sunlit ground, which is where a clear sky sits against bright sand in a real
// photograph, and which is what gives the disc, the aureole, the cloud decks and
// the plume columns somewhere to be brighter THAN.
// -----------------------------------------------------------------------------
const SKY_GAIN = 0.457;

// -----------------------------------------------------------------------------
// NAIL_IRRADIANCE — the companion star as a real second light. ROUND 11.
//
// docs/PALETTE_TARGET.md, on the Nail: "Sky.js has shipped this unused since the
// scaffold — it is now the fiction's justification for the cool ambient." The
// round brief is blunter: use it as a cool rim/ambient source and make it
// visible. So it stops being a decorative dot and becomes a DirectionalLight.
//
// WHY A SECOND DIRECTIONAL AND NOT MORE AMBIENT. The defect this round exists to
// fix is that a shadowed VERTICAL surface has the sun's hue. More cool ambient
// desaturates that; a cool light coming from a DIFFERENT DIRECTION gives the
// shadow side its own terminator, its own specular and its own rim. On the
// shadow side of anything, this is not a 2% light — it is 22% of the total fill
// at 20 deg sun and it is the only DIRECTED part of it. That is the difference
// between shade that is dark and shade that is lit by something else.
//
// SIZING. It is held to a level that cannot disturb the two constants above.
// The Nail sits at 14-62 deg elevation, so on the horizontal surface §2.2's
// anchor is stated on it delivers 0.30 * sin(34 deg) = 0.17 against E_key +
// E_fill = 8.10, i.e. 2.1% — inside the noise of the anchor, and the key:fill
// ratio moves from 5.00:1 to 4.90:1, still mid-band for ART §3.2's 4:1-8:1.
//
// AT NIGHT IT IS THE ONLY DIRECTIONAL LIGHT IN THE WORLD, which is the point:
// `sun.intensity` is 0 below -3 deg, and until now that meant every night and
// grotto frame was lit by a flat environment with no terminator anywhere. 0.30
// against a night sky fill of ~0.09 is a 3.3:1 cool key — enough for form to
// read, low enough in absolute terms that the bioluminescent emitters are still
// the brightest things in the frame by an order of magnitude, which is
// PALETTE_TARGET's "the world is lit from within".
//
// It does NOT cast shadows: shadows.js takes its cascades off `this.sun` and a
// second shadowed cascade set is not affordable. It is also added to the scene
// AFTER the sun so `shadows.js:_scan()` still finds the sun at directional slot
// 0 (it searches rather than assumes, but the ordering costs nothing to keep).
// -----------------------------------------------------------------------------
// TOP-OF-ATMOSPHERE irradiance. What reaches the ground is this times the slant
// extinction below, which is what makes one constant serve both ends of the day.
const NAIL_IRRADIANCE = 0.40;

// A hot companion, so it is genuinely cool-white with a cyan bias rather than
// "blue". Peak-normalised, same convention as SUN_TABLE.
const NAIL_COLOR = [0.62, 0.88, 1.00];

// SLANT EXTINCTION — optical depth at the zenith, per channel, for the Nail's
// light. This is not a fudge to get a day/night ratio; it is the reason the
// ratio is available for free, and it falls out of geometry that was already in
// the file. `setTimeOfDay` puts the Nail at elevation clamp(0.42*sunElev + 26,
// 14, 62) deg, so it is HIGH when the primary is up (34 deg at midday) and LOW
// when it is not (14 deg, its floor, all night). Airmass ~ 1/sin(elev) is
// therefore 1.8 by day and 4.1 at night, and a genuinely absorbing atmosphere
// turns that into a 1.8x swing in delivered irradiance with no time-of-day term
// anywhere in the code:
//
//     T(day)   = exp(-tau * 1.77) = (0.48, 0.67, 0.72)   luma 0.632
//     T(night) = exp(-tau * 4.13) = (0.18, 0.39, 0.46)   luma 0.352
//
// So the companion delivers ~0.25 by day — 19% of the sky's hemispheric fill,
// and the only DIRECTED part of it, which is the cool rim PALETTE_TARGET asks
// for — and ~0.14 at night, where it is enough for form to read against a
// bioluminescent ambient without becoming the key and turning the grotto into a
// blue-graded day.
//
// The channel ratios are the shape of SIGMA_A (1 : 0.54 : 0.44), i.e. the same
// medium the aerial pass uses, so the star REDDENS LESS at low elevation than a
// star on Earth would — it goes cooler, because this atmosphere absorbs red
// hardest. Consistent with the round-11 medium, and it means the Nail is at its
// most cyan exactly at night when the palette needs it to be.
const NAIL_TAU = [0.420, 0.226, 0.187];

// -----------------------------------------------------------------------------
// THE CHROMATIC KEY:FILL SPLIT. Read this before touching any constant below it.
//
// Round-4 critic, verbatim: "The shadow side is just a darker version of the
// same warm hue. There is no cool sky tint in shadow anywhere in 14 shots. That
// single omission is what makes the whole set read as shaded, not lit."
//
// Measured with `node tools/_skyhue.mjs` (same Lambertian probe as keyfill.mjs,
// reporting HSV hue instead of luma) on the shipped build:
//
//   vista       surface   LIT hue   SHADOW hue   dHue    lit:shadow luma
//   establish   sunward     20.2       20.4       0.2         2.70
//   establish   antisun     33.9       33.9       0.0         1.00
//   canopy      sunward     25.2       26.3       1.1         3.89
//   water       sunward     27.7       29.4       1.7         4.23
//   ridge       sunward     15.0       17.4       2.4         1.51
//
// The shadow was the SAME HUE as the key to within two degrees, everywhere. A
// real sunlit outdoor frame runs 90-160 deg of hue between key and fill. This
// was a shaded diagram, exactly as the critic said.
//
// Three measured causes, in order of how much each contributes:
//
//  1. THE LOWER HEMISPHERE WAS 75%-SATURATED ORANGE AND AS BRIGHT AS THE SKY.
//     `uGround` at `water` was (1.306, 0.790, 0.336) — hue 28 deg, sat 74%,
//     luma 0.879, against a zenith of luma 0.905. For ANY vertical normal the
//     lower hemisphere is half the cosine-weighted fill, and it was more
//     saturated than the sky by 3x, so it won. Proof it was the dominant term
//     and not the zenith: `node tools/_skychroma.mjs` sweeps a luminance-
//     preserving chroma expansion on the zenith from 1.0x to 3.4x — the zenith
//     goes from 34% to 98% saturated cyan and the anti-sun fill hue moves from
//     39 deg to 68 deg. Still warm. You cannot fix this from the zenith.
//
//  2. THE KEY-DRIVEN HALF OF THE BOUNCE IGNORED THE SUN'S INCIDENCE ON THE
//     GROUND. It used `sat(sin(elev) * 3)` where the physics is `sin(elev)`:
//     the bounce is reflected key, and the key's irradiance ON THE GROUND is
//     E*sin(elev), not E*sat(3 sin(elev)). At `establish` (7 deg) that is 0.364
//     against 0.121 — the warm bounce was 3.0x too bright. At `water` 1.000
//     against 0.369, 2.7x. This planet never gets above 52 deg elevation and
//     plays at 4-20, i.e. the error was near its maximum in every shipped shot.
//
//  3. THE SKY-REFLECTED HALF OF THE BOUNCE WAS TINTED WITH THE KEY'S TINT.
//     Both halves used ART §3.2's (0.41, 0.30, 0.18). But that triple is the
//     bounce as SEEN UNDER THE KEY — it already carries the sun's warmth. Using
//     it on sky light double-counts: teal sky went in, orange came out, and
//     that orange was then the fill on every shaded vertical surface in the
//     frame. The sky bounce must use the ground's actual DIFFUSE ALBEDO.
//
// The response, all four measured after the fact by the same tool:
//
//   a. GROUND_ALBEDO (below) for the sky-reflected half, mixed from §2.1 at the
//      §5.1 basin proportions rather than reusing the key's tint;
//   b. `sunUp = max(sin(elev), 0)` for the key-reflected half;
//   c. SKY_CHROMA_* — a luminance-PRESERVING chroma expansion on the §3.3
//      anchors, so every anchor's luma is still hit exactly and only its
//      saturation moves. Needed because the output chain destroys chroma: at
//      `water` the sky enters AgX at 34% HSV saturation and leaves the canvas
//      at 11.9%. Measured retention across the sweep is ~23% of input
//      saturation (34->11.9, 98->22.4). To land a visibly teal sky the field
//      has to go in at 65-70%, which is what 2.4x does;
//   d. AIRMASS_K — see its own block.
// -----------------------------------------------------------------------------

// Luminance-preserving chroma gain on the ART §3.3 anchors. Neither changes
// luma, so §3.3's radiance anchors, the §3.2 irradiance floor and every
// downstream exposure decision are untouched.
//
// ROUND 11 — PALETTE_TARGET.md. The horizon anchor used to be warm-neutral, so
// this pair pushed the two ends of the dome in OPPOSITE hue directions ("warm
// far vs cool near"). PALETTE_TARGET supersedes that: the horizon is now pale
// cyan-green in the table itself, so both gains now push the same way and the
// horizon's went 1.50 -> 2.00. That matters far more than it sounds, because
// the horizon anchor is what `cbSkyBase` returns along a near-horizontal ray,
// which is the in-scatter colour of the order-45 aerial pass — i.e. this one
// number is what makes DISTANCE GO TEAL instead of grey (PALETTE_TARGET rule 2,
// the depth cue that survives deuteranomaly).
const SKY_CHROMA_ZENITH = 2.40;
const SKY_CHROMA_HORIZON = 2.00;
// ...but never let a channel collapse. Below this fraction of the triple's own
// luminance the sky reads as a single-channel filter and shadows lose their red
// channel entirely, which crushes every ember and every A6 rust pan in shade.
// Only bites at night, where the zenith is already near-monochromatic.
const CHROMA_FLOOR = 0.12;

// -----------------------------------------------------------------------------
// AIRMASS_K — how far down the dome the teal reaches. Was 4.2.
//
// `cbSkyBase` mixes zenith->horizon on hw = (e^-Ky - e^-K)/(1 - e^-K). K sets
// how thick the horizon band is; the §3.3 anchors are hit exactly at y=0 and
// y=1 for ANY K, so this is free to move.
//
// Why it had to: a VERTICAL surface — the shadow side of a stem, which is
// precisely what the critics looked at — sees the zenith at dot(d,n) = 0. The
// zenith contributes NOTHING to it. Its sky fill is the cosine-weighted mean of
// hw over a vertical hemisphere,
//
//     mean_hw_vert = (4/pi) INT_0^(pi/2) cos^2(phi) hw(sin phi) dphi
//
// which at K = 4.2 is 0.273 — i.e. 27% of a vertical face's sky fill came from
// the warm-neutral horizon, on top of the 50% coming from the warm ground. At
// K = 7.5 it is 0.170. The amber becomes a real BAND welded to the horizon
// (half strength by 10 deg elevation, against 20 deg before) instead of a wash
// over the whole sunward dome, and the dome above it is teal.
//
// Two things this deliberately does NOT change: distant terrain sits within a
// couple of degrees of the horizon, where hw is still ~1, so ART §0.3/§3.5's
// warm distance and the order-45 in-scatter are exactly as before; and the
// wedge/glow peak is at hw = 1, so §3.3's "horizon toward sun" column is still
// reproduced verbatim.
//
// It DOES change the cosine-weighted integrals in `_skyAverage` and the
// vertical falloff of the burn glow and the twilight bands. The three shader
// exponents that must track it are marked `SCALES WITH AIRMASS_K` in
// SKY_COMMON; the integrals are re-derived in `_skyAverage`.
// -----------------------------------------------------------------------------
const AIRMASS_K = 7.5;

// The BASIN GROUND's diffuse albedo, for the sky-reflected half of the bounce.
// Mixed from ART §2.1 at the §5.1 proportions of the Cinderbloom Basin:
//   55% A4 bone ash (0.412,0.386,0.331) + 20% A6 rust pan (0.244,0.106,0.041)
// + 15% A2 scorch  (0.046,0.031,0.024) + 10% A1 clinker  (0.021,0.018,0.017)
// = (0.284, 0.240, 0.196), hue 33 deg, 31% saturated. Warm — ART §3.2's
// warm-below inversion is real and stays — but it is an ALBEDO, so it tints the
// teal sky it reflects rather than replacing it with the sun's colour.
const GROUND_ALBEDO = [0.284, 0.240, 0.196];

// ART §3.2's bounce triple. ROUND 11: NO LONGER USED, AND WHY — this is the
// second half of a bug round 5 fixed only the first half of.
//
// Round 5 found that the SKY-reflected half of the bounce was tinted with
// (0.41, 0.30, 0.18) and called it: "that triple is the bounce as SEEN UNDER
// THE KEY — it already carries the sun's warmth. Using it on sky light
// double-counts." Correct, and it switched that half to GROUND_ALBEDO. But it
// left the KEY-reflected half on this triple AND multiplying by `sunColor`,
// with the note "allowed to be the sun's own warmth because it is multiplying
// the sun" — which is the same double-count, on the other half, stated as a
// justification. A triple that already carries the illuminant cannot then be
// multiplied by the illuminant.
//
// Both halves now use GROUND_ALBEDO, the real diffuse albedo, and each is
// multiplied by whichever light it reflects. The bounce is 1.44x less red,
// 1.25x less green and 1.09x MORE blue than it was, its saturation drops from
// 74% to 63%, and its luminance falls 17%.
//
// This matters more than that sounds, because tools/_skywarm.mjs established
// that the lower hemisphere — not the aureole, and not the wedge — is what
// makes a shaded surface facing the sun's azimuth warm: for a horizontal
// normal, three's PMREM samples a filter kernel centred exactly on the horizon
// seam, so uGround is weighted far above the 0.5 a cosine lobe would give it.
// It is the single most consequential triple in the file for shade colour, and
// it had a 1.44x error in its reddest channel.
//
// Kept as a named constant rather than deleted: it is ART §3.2 verbatim, and
// the next person to read §3.2 will come looking for it and needs to find this
// note rather than reintroduce it.
const BOUNCE_TINT_UNUSED_SEE_NOTE = [0.41, 0.30, 0.18];
const BOUNCE_FF = 0.34;   // §3.2's form factor

// -----------------------------------------------------------------------------
// ART_DIRECTION §3.3 — sky radiance targets, extended across the whole arc.
// Rows marked [spec] are the document's numbers verbatim and must not drift;
// the others interpolate the same trend against §3.1's irradiance so dawn,
// high sun and dusk are genuinely different frames rather than one look scaled.
//
// `glow` is the ADDITIVE excess of "horizon toward sun" over "horizon,
// anti-sun", so `horizon + glow` reproduces the third column exactly.
//
// =============================================================================
// ROUND 11 — THE THESSALY TEAL. docs/PALETTE_TARGET.md is binding and it wins
// over ART §3.3 on every colour in this table. What changed and why:
//
// THE MEASUREMENT THAT SET THE ROUND. `node tools/_skyhue.mjs` on the shipped
// build, hue of a neutral Lambertian probe, lit against shadowed:
//
//   vista       surface           LIT hue   SHADOW hue   dHue
//   establish   up-facing            27.6      153.6      126    <- fine
//   establish   sunward VERTICAL     20.3       21.9      1.6    <- the defect
//   ridge       sunward VERTICAL     13.5       17.8      4.3    <- the defect
//   water       sunward VERTICAL     27.7       34.3      6.5    <- the defect
//
// An up-facing shadow was already teal. A VERTICAL one — a trunk, a cliff face,
// a rock, i.e. every surface a critic actually looks at — was the SAME HUE as
// the sun. Round 6 fixed the zenith and stopped there; the zenith is worth
// nothing to a vertical normal, which sees it at dot(d,n) = 0.
//
// Decomposing that vertical fill at `establish` (7 deg sun) into radiance
// contributions, red channel:
//
//   amber wedge   0.0796   <- 38%     the §3.3 glow column x pow(hw,1.35) x cos^5
//   aureole       0.0540   <- 26%     round 7's 3x-widened Mie forward lobe
//   ground bounce 0.0380   <- 18%
//   base sky      0.0360   <- 17%     the only cool term, and it is outvoted 5:1
//
// The sky WAS teal and the shade was orange anyway, because two circumsolar
// terms nobody had integrated over a vertical hemisphere were together 64% of
// it. That is the whole finding, and it is why "make the zenith more teal"
// failed for four rounds.
//
// THE THREE CHANGES, all in this table or immediately below it:
//
//  1. THE HORIZON IS NOW PALE CYAN-GREEN, not warm-neutral. Same luminance as
//     the row it replaces, to the third decimal, so §3.3's vertical anchors,
//     §3.2's irradiance floor and every exposure decision downstream are
//     untouched — only the hue moved, from ~46 deg amber to ~176 deg cyan at a
//     flat 20% HSV saturation before the chroma expansion. PALETTE_TARGET's
//     "saturated teal/cyan, deepening toward zenith, paling at horizon" is
//     exactly this: the horizon stays the BRIGHTEST and LEAST saturated part of
//     the dome, so the value structure the tone curve was built on is intact.
//     It is also the single highest-leverage line in the file for depth,
//     because `cbSkyBase` along a horizontal ray IS the aerial in-scatter
//     colour: distance now goes toward the sky hue rather than toward grey.
//
//  2. THE GLOW COLUMN IS SCALED TO 0.42 and the wedge is retightened from
//     pow(hw,1.35)*cos^5 to pow(hw,2.4)*cos^7 (see cbSkyBase). Peak radiance at
//     the band itself is still 11x the horizon behind it, so the warm sunset
//     wedge is if anything MORE visible against a cyan horizon than it was
//     against an amber one — but its cosine-weighted share of a vertical
//     surface's fill drops 8.6x. That is the difference between a warm BAND
//     (beautiful, complementary, on-palette) and a warm WASH (the failure).
//     The rows below -3 deg keep proportionally more of their glow: after the
//     sun is down the wedge is the only warm thing left and it is the whole
//     dusk read.
//
//  3. The dusk and night rows are re-pointed from Earth-twilight blue (hue 202-
//     207) toward a deep blue-teal, and their horizons follow the zenith down
//     instead of staying warm. PALETTE_TARGET's night is "deep blue-black base";
//     `_noBlue` now lets night keep some of that blue (see its own comment)
//     because at night blue-black is the target rather than the failure.
//
// Everything the warm pole lost here it gets back somewhere it costs no fill:
// the disc, the aureole core, the lit cloud decks, the burn band and the ochre
// rock itself. The opposition is not neutralised, it is RE-RATIONED.
// =============================================================================
const SKY_TABLE = [
  //  elev   zenith                      horizon (anti-sun)          glow (toward-sun excess)
  [  52.0, [0.950, 1.350, 1.300],      [1.159, 1.448, 1.429],      [0.483, 0.105, 0.000] ],
  [  30.0, [0.780, 1.130, 1.080],      [0.983, 1.229, 1.213],      [0.769, 0.223, -0.038] ],
  [  20.0, [0.620, 0.950, 0.900],      [0.844, 1.055, 1.041],      [1.071, 0.349, -0.025] ], // [spec luma]
  [  10.0, [0.340, 0.530, 0.550],      [0.500, 0.626, 0.617],      [2.008, 0.714, 0.059] ],
  [   4.0, [0.160, 0.260, 0.300],      [0.280, 0.350, 0.345],      [2.957, 0.953, 0.101] ], // [spec luma]
  [   0.5, [0.075, 0.125, 0.155],      [0.135, 0.163, 0.173],      [2.715, 0.875, 0.095] ],
  [  -3.0, [0.038, 0.062, 0.082],      [0.063, 0.077, 0.081],      [1.212, 0.390, 0.048] ],
  [  -6.0, [0.020, 0.031, 0.042],      [0.032, 0.039, 0.041],      [0.374, 0.107, 0.013] ], // [spec luma]
  [ -12.0, [0.0090, 0.0150, 0.0215],   [0.0125, 0.0151, 0.0160],   [0.068, 0.013, 0.000] ],
  [ -25.0, [0.006, 0.011, 0.016],      [0.0078, 0.0095, 0.0100],   [0.003, 0.001, 0.001] ], // [spec] night
];

// NIGHT, and the reason the grotto has been the weakest shot in the set for ten
// rounds: it had no emissive-dominant lighting model. PALETTE_TARGET inverts the
// day scheme cleanly — deep blue-black base, CYAN BIOLUMINESCENCE AS THE KEY,
// small amber and magenta accents as complementary pops — and the two terms
// below are that inversion, built where this file can actually deliver it: in
// the environment the whole world is lit by.
//
// BURN_GLOW is the amber one and it is now the ACCENT, not the key: it was
// [0.082, 0.026, 0.007] and carried ~85% of the night sky's energy, which is
// why every night and grotto frame in ten rounds came out a uniform orange wash
// with the cyan emitters sitting INSIDE it instead of above it. Scaled to 0.55
// and left patchy in azimuth, it now reads as specific fires on specific
// bearings — which is what an accent is.
const BURN_GLOW = [0.045, 0.014, 0.004];

// BIO_GLOW is the cyan one and it is the night's KEY. Physically it is the
// basin's own bioluminescence scattered back down out of the haze, so it is
// brightest at and below the horizon and it is patchy on a different noise
// phase from the burn fields — the two accents land on different bearings
// rather than summing into grey, which is the failure mode of putting both into
// one hemisphere. It is the dominant term in `uGround` at night, so every
// unlit face, every underside and every cave wall in the grotto takes a
// saturated cyan fill at a very low absolute level: PALETTE_TARGET's "very dark
// base with high-value emissive points", delivered by the value structure
// rather than by a colour filter.
const BIO_GLOW = [0.004, 0.036, 0.044];

// The magenta pop. Sparse by construction: it only appears where the bio patch
// noise is in its top third, so it is a few bearings of the night horizon and
// never a wash. PALETTE_TARGET rule 4, "ration the magenta".
const BIO_MAGENTA = [0.55, 0.10, 0.62];

// -----------------------------------------------------------------------------
// ART §3.5, per metre. The aerial-perspective pass beyond the volumetric march.
//
// ROUND 11 — THE SINGLE-SCATTERING ALBEDO IS INVERTED, AND THAT IS THE WHOLE OF
// PALETTE_TARGET RULE 2 ("aerial perspective goes toward the sky hue, not toward
// grey; distance gets MORE teal").
//
// A fully-extinguished distant plane in this pass converges to
//
//     inscat(T -> 0) = cbSkyBase(d) * (sigmaS / sigmaT)
//
// so the per-channel single-scattering albedo IS the tint the far distance takes
// relative to the sky behind it. The shipped numbers gave
//
//     ssa = (0.787, 0.673, 0.512)      red-favouring
//
// i.e. a far mesa came out at HALF the sky's blue and 79% of its red — a warm
// haze in front of a cool sky, which is Earth's *inverse* and cost the depth cue
// the accessibility document specifically names as the one that survives
// deuteranomaly. It also meant a ridge at full extinction did NOT converge onto
// the sky behind it, which the header of this pass claims it does.
//
// sigmaT is held IDENTICAL per channel to what shipped, so every extinction
// distance, the volumetrics handover at 0.85*maxDist, the weather multipliers
// and the strength of the depth cue are unchanged; only the split between
// scattering and absorption moves:
//
//     sigmaT = (0.193, 0.208, 0.242)e-3    unchanged, to the third digit
//     ssa    = (0.720, 0.860, 0.900)       was (0.787, 0.673, 0.512)
//
// This is also the more physical of the two: scattering rising toward blue is
// Rayleigh's own signature, and it puts the absorption in the red where this
// planet's aerosol has its band. The old table had a "near-grey" Mie scatter
// with blue-heavy soot absorption, which is a legitimate medium — it is just
// the one that makes distance warm, and PALETTE_TARGET does not want that.
//
// =============================================================================
// ROUND 12 — THE DIRECTION WAS RIGHT AND THE MAGNITUDE WAS THE REGRESSION.
//
// Round 11's argument above is correct and is kept: the albedo IS the tint the
// far distance takes, and pointing it cool is PALETTE_TARGET rule 2. What it did
// not account for is that the albedo is TWO decisions wearing one number — a
// HUE (which way the veil leans against the sky) and a MAGNITUDE (how close to
// the sky's own value a fully-extinguished plane lands). Round 11 moved both,
// and only the first was intended:
//
//     luma(ssa)   round 10  0.685      round 11  0.833      +21.6%
//
// A far plane converges on `sky * ssa`, so raising the albedo's luminance moves
// the far distance TOWARD THE SKY'S OWN VALUE — which is not haze, it is
// erasure. Measured on the round-11 build at `ridge`, the aerial-perspective
// vista, over the midground band (tools/_skyveil.mjs):
//
//     midground mean luma 0.4946 against a FRAME mean of 0.3709 — the far
//     field is the brightest thing in the shot — and midground contrast
//     (std of that band) 0.0715, against 0.18-0.27 on every vista whose
//     distance is short enough that this pass never runs.
//
// That is the veil the player saw and it is also, precisely, the depth cue
// ACCESSIBILITY.md says must survive deuteranomaly: "the far mesa's separation
// from sky weakens". A veil at 83% of sky radiance has no separation left to
// lose under any colour transform, because the separation was never chromatic.
//
// THE FIX SEPARATES THE TWO DECISIONS. `AERIAL_SSA_HUE` keeps round 11's cool
// ordering exactly — distance still goes toward the sky hue, rule 2 intact —
// and `AERIAL_ALBEDO` states the LUMINANCE of the albedo as one number that can
// be reasoned about and swept (`ctx.debug.sky.veil`). Set BELOW round 10's
// 0.685 rather than back at it, because round 10's veil was warm and sat in
// front of a warm sky, where a cool veil in front of a cyan sky reads hazier at
// equal luminance: same hue as the backdrop means the eye reads the difference
// as distance rather than as material, and it takes less of it to say "far".
//
// sigmaT is STILL held identical per channel to what both previous rounds
// shipped, so every extinction distance, the volumetrics handover at
// 0.85*maxDist, the weather multipliers and the strength of the depth cue are
// untouched. Only the scattering/absorption split moves. Deriving sigmaS and
// sigmaA from (sigmaT, ssa) rather than writing both by hand is what makes that
// guarantee mechanical instead of a promise in a comment.
//
// SIDE EFFECT WORTH NAMING, because HANDOFF has a request open on it: a
// blue-heavy sigmaT in EVERY weather now falls out by construction. The filed
// bug was that `spore` scaled a red-heavy sigmaS 3.4x harder than a blue-heavy
// sigmaA and flipped the sign of the chromatic extinction (sigmaT b/r 0.966).
// With this split it is 1.43 under spore and above 1.2 under all five rows, so
// distance loses red hardest whatever the weather — which is now the intended
// behaviour rather than an accident, since PALETTE_TARGET rule 2 supersedes ART
// §0.3's warm-distance prohibition.
//
// volumetrics.js owns the medium INSIDE 600 m and now reads `getMedium()`
// directly rather than keeping a second copy of these numbers, so the two media
// are one medium by construction. That is the invariant this pass's own header
// has claimed since the scaffold and it had quietly stopped being true.
// =============================================================================

// Per metre. Unchanged across rounds 10, 11 and 12 — see above.
const AERIAL_SIGMA_T = [0.193e-3, 0.208e-3, 0.242e-3];

// Round 11's cool ordering, kept verbatim. Only the RATIOS here matter; the
// magnitude is set by AERIAL_ALBEDO below, so this triple can be re-pointed for
// hue without touching contrast and vice versa.
const AERIAL_SSA_HUE = [0.720, 0.860, 0.900];

// The luminance of the single-scattering albedo: how bright a fully-extinguished
// far plane is relative to the sky behind it. Round 10 ran 0.685 (warm), round
// 11 0.833 (cool, the regression). See the block above for why this sits below
// both. `ctx.debug.sky.veil` scales it for sweeping.
//
// CHOSEN BY SWEEP, NOT BY TASTE, AND DELIBERATELY NOT AT THE OPTIMUM. Round 12
// swept `veil` over 1 / 0.7 / 0.45 / 0.2 against this constant at 0.585 and the
// metrics are MONOTONIC — every step down buys contrast and colour, at `ridge`,
// the vista where this pass does the most work:
//
//     albedo   0.585    0.410    0.263    0.117
//     std      0.1486   0.1526   0.1565   0.1602
//     dyn      0.3972   0.4100   0.4224   0.4321
//     colours   6397     6630     6965     7335
//
// The metric therefore recommends deleting the atmosphere, which is the point at
// which a measurement stops being an argument. An albedo of 0.12 does not make
// distance hazy, it makes distance BLACK — the far field would converge on
// nothing rather than on the sky, which is a direct violation of PALETTE_TARGET
// rule 2 ("aerial perspective goes toward the sky hue"), and it would cost the
// depth cue ACCESSIBILITY.md names as the one that survives deuteranomaly. The
// veil has to carry sky radiance to carry sky HUE.
//
// 0.44 is where a fully-extinguished plane sits at a bit under half the sky's
// value: unambiguously hazy, unambiguously the sky's colour, and unambiguously
// still separated from it. It takes roughly half the available contrast gain and
// leaves the rest on the table on purpose.
const AERIAL_ALBEDO = 0.44;

const _ssaLuma = 0.2126 * AERIAL_SSA_HUE[0] + 0.7152 * AERIAL_SSA_HUE[1] + 0.0722 * AERIAL_SSA_HUE[2];
// ssa = hue direction, renormalised to AERIAL_ALBEDO's luminance. Clamped below
// 1 because sigmaA = sigmaT - sigmaS must stay non-negative: an albedo of 1 is a
// non-absorbing medium and there is no absorption left to subtract.
const _ssa = AERIAL_SSA_HUE.map(v => Math.min(v * (AERIAL_ALBEDO / _ssaLuma), 0.98));
const SIGMA_S = [0, 1, 2].map(i => AERIAL_SIGMA_T[i] * _ssa[i]);
const SIGMA_A = [0, 1, 2].map(i => AERIAL_SIGMA_T[i] - SIGMA_S[i]);

// -----------------------------------------------------------------------------
// KEY_DECK_TAU — the optical depth of a unit cloud deck to the key, ROUND 12.
//
// THIS IS THE FIX FOR "draft AND storm ARE THE BRIGHTEST FRAMES IN THE SET".
// It has been filed in HANDOFF against this file since round 3 and never built:
//
//   "`Sky.js` is `this.sunIrradiance = c.E * SUN_GAIN * this.knobs.key`. THERE
//    IS NO WEATHER TERM. So under weather:'storm' the sky DRAWS an ash deck at
//    cover 0.80, dens 1.70, murk 0.62, ash 0.55 and then lets the key punch
//    through it at full clear-sky strength. Measured on draft: sunElevation
//    30.3 deg, sunIrradiance 27.0. A 30 deg sun at irradiance 27 behind an
//    80%-cover ash deck — a firestorm lit like a clear afternoon. Nothing else
//    in the build can make a dark storm dark, because every other term is a
//    RESPONSE to this number."
//
// That diagnosis is exactly right and the round-12 measurement agrees: on the
// shipped build `storm` has the highest frame mean of any vista (0.4184) and
// `draft` the lowest colour count (2297), both while briefed as low-key.
//
// THE MODEL. A mean-field slab, not a fudge factor, and every input is a column
// this table already carries:
//
//   tau     = KEY_DECK_TAU * dens * (1 + 2.2*murk + 1.9*ash) / sin(elev)
//   direct  = exp(-tau)                          the unscattered beam
//   T       = (1-cover) + cover*(direct + KEY_DECK_FWD*(1-direct)*exp(-tau/2))
//
// The last term is the part that matters for the look: a cloud deck FORWARD-
// SCATTERS, so a thick deck does not extinguish the key to black, it turns it
// into a soft directional source. Without it a storm loses its terminator
// entirely and the frame goes flat in the other direction, which is not the
// brief either — "dark" and "flat" are different words.
//
// NORMALISED AGAINST `clear`. The returned attenuation is T(weather)/T(clear),
// so clear weather is EXACTLY 1.0 by construction and the twelve clear vistas —
// including every one round 10 scored well on — cannot move by a rounding
// error. Only weather heavier than the reference the §3.1 irradiance table was
// authored under costs the key anything. This is what makes the change safe to
// ship in a final round: it can only touch the two frames it is aimed at.
//
// Computed values at draft's 30.3 deg sun: storm 0.250 (two stops), spore 0.677,
// haze 0.878, rain 0.744, clear 1.000.
// -----------------------------------------------------------------------------
const KEY_DECK_TAU = 0.62;
const KEY_DECK_FWD = 0.22;

// The transmitted beam REDDENS as well as dimming — a deck of ash and ice
// scatters short wavelengths out of the beam first, which is the same physics
// that makes a low sun warm, and it puts the residual key in the warm pole
// PALETTE_TARGET wants to keep committed. Applied in proportion to how much of
// the beam was removed, so clear weather is untinted by construction.
const KEY_DECK_TINT = [1.00, 0.86, 0.66];

// ART §3.5 weather. `s`/`a` match volumetrics.js's table; the cloud fields are
// this file's own.
const WEATHER = {
  clear: { s: 1.0, a: 1.0, cover: 0.36, dens: 0.70, high: 0.34, murk: 0.00, ash: 0.00 },
  haze:  { s: 2.1, a: 1.8, cover: 0.40, dens: 0.85, high: 0.42, murk: 0.22, ash: 0.10 },
  spore: { s: 5.5, a: 1.6, cover: 0.52, dens: 0.95, high: 0.55, murk: 0.45, ash: 0.05 },
  storm: { s: 7.0, a: 3.4, cover: 0.80, dens: 1.70, high: 0.70, murk: 0.62, ash: 0.55 },
  rain:  { s: 1.4, a: 0.5, cover: 0.72, dens: 1.35, high: 0.55, murk: 0.30, ash: 0.00 },
};

// =============================================================================
// GLSL
// =============================================================================

// A single triangle written straight into clip space. No model matrix, no
// projection matrix, no radius: there is no configuration of camera.near/far
// that can clip this, which is the entire point (see the header).
const SKY_VERT = /* glsl */`
precision highp float;
in vec3 position;
out vec2 vNdc;
void main(){
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const SKY_COMMON = /* glsl */`
precision highp float;
in vec2 vNdc;

uniform mat4 uInvViewProj;      // JITTERED, from the camera actually drawing
uniform vec3 uCamPos;

uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uBurn;
uniform vec4 uBio;              // rgb cyan bioluminescent airglow, a magenta gain
uniform vec3 uGround;           // lower-hemisphere bounce radiance (ART §3.2)
uniform vec3 uSunDir;
uniform vec3 uSunRad;           // sun colour * irradiance at the ground
uniform vec3 uCloudSun;         // ... and as seen from the cloud decks (ART §3.1)
uniform vec3 uSunDisc;          // disc peak radiance
uniform vec3 uNailDir;
uniform vec3 uNailRad;
uniform vec4 uSkyP;             // x airmassK, y exp(-airmassK), z aureoleGain, w nightAmt
uniform vec4 uSkyQ;             // x sunDiscRadius(rad), y discFlatten, z nailRadius(rad), w starGain
uniform vec4 uCloudA;           // x cover, y density, z altLow(km), w altHigh(km)
uniform vec4 uCloudB;           // x highCover, y windX, z windZ, w breath
uniform vec4 uCloudC;           // x scaleLow, y scaleHigh, z murk, w ashTint
uniform vec2 uTwilight;         // x twilight amount, y belt-of-venus amount
uniform vec4 uPlume;            // x gain, y rise scroll, z downwind shear, w foot heat

const float R_P = 6360.0;       // km

// ---- SCALES WITH AIRMASS_K --------------------------------------------------
// hw falls off like e^(-K*y), so an exponent p puts a term's half-height at
// ln2/(p*K). These three terms are art-directed by their ANGULAR EXTENT, not by
// their exponent, so when AIRMASS_K moved from 4.2 to 7.5 they were rescaled by
// 4.2/7.5 = 0.560 to keep the extent they were tuned at:
//     burn glow      1.45 -> 0.812     (night's warm horizon deck; it is most of
//                                       the night IBL's energy — tightening it
//                                       leaves the world lit by the zenith alone)
//     belt of Venus  2.40 -> 1.344
//     earth shadow   1.10 -> 0.616
// The amber wedge is deliberately NOT rescaled: tightening it is the point.
const float CB_BURN_POW   = 0.812;
const float CB_BELT_POW   = 1.344;
const float CB_SHADOW_POW = 0.616;
// The cyan bioluminescent airglow. Tighter to the horizon than the burn deck
// (0.95 against 0.812) because it is the BASIN's own light coming back out of
// the haze rather than a fire column's, so it hugs the ground it comes from.
// Its integral weight is re-derived in _skyAverage; the two must move together.
const float CB_BIO_POW    = 0.95;
// PALETTE_TARGET's sparse magenta accent, interpolated from the one JS constant
// so the shader and _skyAverage's integral can never disagree about its hue.
const vec3 CB_BIO_MAGENTA = vec3(${BIO_MAGENTA[0]}, ${BIO_MAGENTA[1]}, ${BIO_MAGENTA[2]});

// ---- hashes / value noise. Pure functions of position: deterministic, and
// nothing here reaches for a texture, so no varying-loop gradient warnings.
float hash21(vec2 p){
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float hash31(vec3 p){
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float vnoise2(vec2 p){
  vec2 i = floor(p), f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm4(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise2(p); p = p * 2.07 + vec2(1.7, -3.1); a *= 0.5; }
  return s;
}
float fbm3(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * vnoise2(p); p = p * 2.07 + vec2(1.7, -3.1); a *= 0.5; }
  return s * 1.1429;
}
float fbm2s(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 2; i++) { s += a * vnoise2(p); p = p * 2.07 + vec2(1.7, -3.1); a *= 0.5; }
  return s * 1.3333;
}

// ---- the sky's colour field (no sun disc, no clouds) ------------------------
//
// mix(zenith, horizon) on an airmass-shaped weight that is exactly 1 at the
// horizon and 0 at the zenith, so the ART §3.3 anchors are reproduced verbatim.
vec3 cbSkyBase(vec3 d){
  float hw = clamp((exp(-max(d.y, 0.0) * uSkyP.x) - uSkyP.y) / (1.0 - uSkyP.y), 0.0, 1.0);
  vec3 col = mix(uZenith, uHorizon, hw);

  // The amber wedge. Keyed on AZIMUTH, not on the 3D angle to the sun, so it
  // stays welded to the horizon under the sun instead of following the disc up
  // into the sky — which is what real forward-scattered light near the ground
  // does, and what makes the "warm distance" read even when the sun is up.
  vec2 dxz = d.xz;
  float l = length(dxz);
  vec2 sxz = uSunDir.xz;
  float sl = length(sxz);
  float ca = (l > 1e-5 && sl > 1e-5) ? max(dot(dxz / l, sxz / sl), 0.0) : 0.0;
  // ROUND 11: pow(hw, 2.4) * cos^7, from pow(hw, 1.35) * cos^5.
  //
  // Measured cause, not a taste change. This term was 38% of the RED channel of
  // the fill on a sunward-facing VERTICAL surface at the establish vista, which
  // is why tools/_skyhue.mjs reported a shadowed trunk at hue 21.9 and a sun at
  // 20.3 —
  // the same hue, the round-4 failure, still present on the one normal nobody
  // had integrated over. The vertical exponent is the real lever: a term shaped
  // like e^(-p*y) has half-height ln2/p, so 1.35 -> 2.4 takes the band from
  // 3.9 deg to 2.2 deg of elevation and its cosine-weighted share of a
  // hemisphere from 0.0195 to 0.00617. cos^5 -> cos^7 takes another 15% in
  // azimuth. With the 0.42 scale on the SKY_TABLE glow column that is 8.6x off
  // the wedge's contribution to shade.
  //
  // The PEAK is deliberately still enormous — 11x the horizon radiance behind
  // it at 4 deg sun — because the horizon anchor is now cyan, so the band has
  // never been more visible or more complementary than it is at 42%. This is
  // the amber pole; it is not being neutralised, it is being confined to the
  // few degrees of sky where it belongs (PALETTE_TARGET rule 5).
  float ca2 = ca * ca;
  float ca4 = ca2 * ca2;
  float wedge = pow(hw, 2.4) * (ca4 * ca2 * ca);
  col += uGlow * wedge;

  // Twilight structure. Below the horizon the sun's wedge narrows into a
  // triangular glow; opposite it, the planet's own shadow rises as a slate band
  // capped by the Belt of Venus. Both are pure dusk tells and cost four lerps.
  float belt = uTwilight.y * pow(hw, CB_BELT_POW) * (1.0 - ca) * smoothstep(0.0, 0.10, d.y) * smoothstep(0.34, 0.10, d.y);
  col += vec3(0.075, 0.030, 0.036) * belt;
  float shadowBand = uTwilight.y * pow(hw, CB_SHADOW_POW) * (1.0 - ca) * (1.0 - smoothstep(0.0, 0.055, d.y));
  col *= 1.0 - 0.42 * shadowBand;

  // Burn-field glow: the night sky's brightest region is the ground's own fire
  // reflected in the haze, and it is patchy (ART §3.3). Breathes with the wind.
  // NB the identifier is burnPatch, not patch: 'patch' is a RESERVED WORD in
  // GLSL ES 3.00 (tessellation) and the shader will not compile with it.
  //
  // Sampled on the horizontal direction rather than on atan(): atan2 has a
  // branch cut along -X, and any noise keyed on it draws a hard seam that
  // projects to a straight line from the zenith to the horizon.
  //
  // The falloff exponent is deliberately shallow (1.45, not the 2.2 that looks
  // right in isolation). This term is most of the night sky's ENERGY, and the
  // PMREM weights the lower sky by cosine, so a tight horizon band leaves the
  // night IBL cold and the world lit by the teal zenith alone.
  // Branch on a UNIFORM, so the whole warp is coherent and daylight never pays
  // for a term whose coefficient is zero.
  if (uSkyP.w > 0.004) {
    vec2 hz = d.xz;
    float hzl = length(hz);
    vec2 hzd = hzl > 1e-4 ? hz / hzl : vec2(1.0, 0.0);
    float burnPatch = 0.40 + 0.95 * fbm4(hzd * 2.6 + vec2(11.3, 4.1));
    col += uBurn * pow(hw, CB_BURN_POW) * burnPatch;

    // ---- THE NIGHT'S KEY: the basin's own bioluminescence, scattered back
    // down out of the haze. PALETTE_TARGET's night inverts the day scheme —
    // deep blue-black base, CYAN as the key, amber and magenta as the small
    // complementary pops — and this is the sky's half of that. uGround carries
    // the other half and is what actually lights the grotto.
    //
    // Sampled on a DIFFERENT noise phase and a different scale from the burn
    // fields on purpose. Two accent colours summed over the same patches make
    // grey; two accent colours on different bearings make a night with places
    // in it. Same hzd trick as above — no atan2, so no seam.
    float bioPatch = 0.35 + 1.10 * fbm4(hzd * 1.9 - vec2(5.7, 21.4));
    col += uBio.rgb * pow(hw, CB_BIO_POW) * bioPatch;

    // ---- the magenta, rationed by construction (PALETTE_TARGET rule 4). It
    // only exists where the bio patch is in its top third, so it is a couple of
    // bearings of horizon and can never become a third dominant hue. Shares
    // CB_BELT_POW with the Belt of Venus because it is the same optical
    // geometry: a high thin band lit from below.
    col += CB_BIO_MAGENTA * (uBio.a * pow(hw, CB_BELT_POW) * smoothstep(0.55, 1.35, bioPatch));
  }

  // Stars. Rationed and dim; they exist so night has value structure above the
  // horizon instead of a dead card, and they carry a little colour depth.
  if (uSkyQ.w > 0.001) {
    vec3 sp = d * 300.0;
    vec3 si = floor(sp), sf = sp - si;
    float h = hash31(si);
    if (h > 0.9755) {
      vec3 c = vec3(hash31(si + 1.7), hash31(si + 3.3), hash31(si + 5.9)) * 0.62 + 0.19;
      float dd = length(sf - c);
      float mag = (h - 0.9755) / 0.0245;
      float t = hash31(si + 8.1);
      vec3 tint = mix(vec3(1.0, 0.62, 0.34), vec3(0.72, 0.86, 1.0), t);
      col += tint * uSkyQ.w * pow(max(0.0, 1.0 - dd * 3.1), 14.0) * (0.15 + 2.4 * mag * mag);
    }
  }

  // Aureole — the Mie forward peak. Three lobes: the broad daytime whitening
  // (~24 deg half-power), the visible ring (~8 deg), and the hot core (~3 deg)
  // that the bloom pass turns into a real sun glare.
  //
  // ROUND 7. A blind critic scanned nine shots' sky bands for a luminance peak
  // and found none: "no disc, no glow, no halo, no coherent gradient toward the
  // light", and in one shot the sky and the cliff disagreed about where the sun
  // was. At 0.045 the broad lobe put +6% over the base sky at 15 deg off-axis,
  // which is under a code value at 8 bits.
  //
  // The broad lobe is now 3x and the ring 2x. The cost is paid in AMBIENT, and
  // it is affordable because a lobe's contribution to a cosine-weighted
  // hemisphere average goes as its coefficient over (n+1) — the m8 term is the
  // wide one and the cheap one at the same time:
  //
  //     INT mu^n dw over the hemisphere = 2 pi / (n + 1)
  //     0.135/9 + 0.80/65 + 3.10/513 = 0.03335  ->  x 2pi / pi = 0.0667
  //
  // against 0.0345 before, i.e. the circumsolar glow's share of the fill nearly
  // doubles — but uSunRad now carries SKY_GAIN, so in absolute terms it is
  // 0.0667*0.457/0.0345 = 0.88x what shipped. The halo gets brighter relative
  // to the sky it sits in and the ambient it contributes goes DOWN.
  // _skyAverage carries the weight; the two must be edited together.
  //
  // ROUND 11 TRIED TO CUT THIS AND THE MEASUREMENT SAID NO. Recorded because
  // the hypothesis was good, the arithmetic supporting it was right, and it was
  // still wrong — which is worth more to the next agent than a silent revert.
  //
  // The reasoning: this is the biggest circumsolar term, round 7 tripled the
  // broad m8 lobe to make the sun findable, and the analytic decomposition put
  // the aureole at 26% of the red channel of the fill on a surface facing the
  // sun's azimuth — the one normal that was still measuring warm after the
  // SKY_TABLE rewrite. So 0.135/0.80/3.10 went to 0.048/0.62/3.10, taking the
  // integral from 0.0667 to 0.0418.
  //
  // Then tools/_skywarm.mjs (written for this, and it now has a knob:
  // ctx.debug.sky.aureole drives uSkyP.z) swept the gain from 1 to 0 and
  // measured the shade directly off the PMREM:
  //
  //   vista       aureole 1        aureole 0.5      aureole 0.25     aureole 0
  //   establish   26.7deg / 56%    27.2 / 54.5%     27.5 / 53.8%     27.8 / 53%
  //   water       43.9deg / 37.5%  45.3 / 36.3%     46.0 / 35.7%     46.8 / 35.1%
  //
  // DELETING THE AUREOLE ENTIRELY moves the shade hue by 1.1 deg and its
  // luminance by 7%. It is not the warm term; the lower hemisphere is (see
  // GROUND_ALBEDO, which round 11 did fix). So the cut bought nothing on the
  // palette axis and would have cost round 7's measured win — four critics had
  // said no shot let you determine the sun's direction. Reverted to round 7's
  // values, and _skyAverage's weight is back to 0.0667 with it.
  //
  // The general lesson, because it will bite again: reasoning about shade colour
  // from the cosine-weighted integrals in _skyAverage UNDER-PREDICTS what the
  // world is actually lit by, because three's PMREM roughness-1 mip is a GGX
  // filter and not a Lambertian convolution. The analytic weights are still
  // correct for the ground bounce, which consumes them directly. They are a
  // guide, not a prediction, for anything lit by scene.environment. Measure.
  float mu = max(dot(d, uSunDir), 0.0);
  float m2 = mu * mu, m4 = m2 * m2, m8 = m4 * m4, m16 = m8 * m8, m32 = m16 * m16;
  float m64 = m32 * m32, m128 = m64 * m64, m256 = m128 * m128, m512 = m256 * m256;
  col += uSunRad * uSkyP.z * (0.135 * m8 + 0.80 * m64 + 3.10 * m512);

  // Below the horizon: the ash plain. Near the horizon it must equal the sky or
  // there is a seam; by ~17 deg down it is pure bounce. This hemisphere is what
  // puts a WARM fill under every overhang while the top stays teal (ART §3.2),
  // and in the PMREM it is half the environment.
  col = mix(col, uGround, smoothstep(-0.008, -0.30, d.y));

  // Weather murk pulls the whole field toward the horizon colour and, in storm,
  // toward hot-exhaust brown.
  col = mix(col, mix(uHorizon, vec3(0.185, 0.108, 0.052), uCloudC.w), uCloudC.z * 0.72);
  return max(col, vec3(0.0));
}

// ---- clouds -----------------------------------------------------------------
//
// Two decks, each a thin spherical shell intersected analytically, sampled with
// a wind-stretched fbm and self-shadowed by marching the density toward the sun
// inside the shell. Thin-slab rather than a full 3D march: at this altitude and
// this camera height the parallax through the slab is under a degree, and the
// budget it frees is what buys the self-shadowing that actually reads.
float cbShellT(vec3 ro, vec3 rd, float radius){
  float b = dot(ro, rd);
  float c = dot(ro, ro) - radius * radius;
  float h = b * b - c;
  return h < 0.0 ? -1.0 : (-b + sqrt(h));
}

float cbCloudN(vec2 p, float stretch){
  vec2 q = vec2(p.x, p.y * stretch);
  vec2 w = vec2(vnoise2(q * 0.53), vnoise2(q * 0.53 + 19.7)) - 0.5;
  return fbm3(q + w * 0.95);
}
float cbCloudNLo(vec2 p, float stretch){
  return fbm2s(vec2(p.x, p.y * stretch));
}

// rgb = radiance, a = coverage
vec4 cbCloudDeck(vec3 d, float alt, float scale, float cover, float dens,
                 float stretch, vec3 sunRad, vec3 ambient, float plume){
  // Near the horizon the shell intersection distance runs away and the
  // wind-stretched noise combs into parallel lines — a visible tiling tell.
  // Fade the decks into the aerosol haze before that happens.
  float horizonFade = smoothstep(0.010, 0.115, d.y);
  if (horizonFade <= 0.001 || cover <= 0.001) return vec4(0.0);

  vec3 ro = vec3(0.0, R_P + uCamPos.y * 0.001, 0.0);
  float t = cbShellT(ro, d, R_P + alt);
  if (t <= 0.0) return vec4(0.0);

  vec2 p = (uCamPos.xz * 0.001 + d.xz * t) * scale + vec2(uCloudB.y, uCloudB.z);
  float n = cbCloudN(p, stretch);
  // fbm4 is roughly N(0.47, 0.13) over [0, 0.94], so a naive 1-minus-cover
  // threshold only ever clips the top few percent and the deck reads empty.
  float thr = 0.78 - 0.62 * cover;
  float density = smoothstep(thr, thr + 0.16, n);
  if (density <= 0.002) return vec4(0.0);
  density *= dens;

  // self-shadow: step toward the sun inside the slab. The sun is always low on
  // this planet, so the horizontal step is long and the shadows are long.
  vec2 sd = uSunDir.xz;
  float sl = length(sd);
  vec2 step2 = (sl > 1e-4 ? sd / sl : vec2(1.0, 0.0)) * scale * 0.55;
  float od = 0.0;
  for (int i = 1; i <= CB_CLOUD_SHADOW; i++) {
    float k = float(i);
    od += smoothstep(thr, thr + 0.16, cbCloudNLo(p + step2 * k, stretch)) * k;
  }
  float T = exp(-od * dens * 1.35);

  // powder / silver lining: light scattered forward through a thin edge
  float powder = 1.0 - exp(-density * 2.6);
  float mu = dot(d, uSunDir);
  float fwd = 0.35 + 1.55 * pow(max(mu, 0.0), 3.0);

  vec3 lit = sunRad * (T * fwd * (0.55 + 0.45 * powder) * plume) + ambient * (0.55 + 0.45 * T);
  float a = (1.0 - exp(-density * 2.2)) * horizonFade;
  return vec4(lit * a, a);
}

// ---- burn-plume columns -----------------------------------------------------
//
// ART §6.3: ">= 1 burn plume column visible at all times, anywhere on the map."
// ART §6.5: "the sky is never empty." Round-4 critics called the skies
// "featureless cream/white washes carrying no tonal information" in four of the
// review shots, and they were right: outside the two cloud decks there was
// nothing in the upper half of the frame at all.
//
// On a planet whose forests ignite themselves as a reproductive strategy, a
// horizon with no smoke column on it is the wrong horizon — so this is identity
// as much as it is composition.
//
// Drawn in the sky rather than as geometry because they stand at 6-40 km, which
// is well outside camera.far and outside any particle system's reach, and at
// that range the shape is pure silhouette anyway. Each column is a Gaussian in
// AZIMUTH whose centre shears downwind with altitude and whose width grows with
// it, boiled by two octaves of noise, and lit side-on by a sun that is never
// higher than 52 deg — so the sunward flank is bright and the lee flank is a
// hard dark edge, which is the read that says "solid volume, kilometres away"
// rather than "a smudge in the sky texture".
//
// NB: NO BACKTICKS IN THIS COMMENT. It lives inside a /* glsl */ template
// literal and a backtick here silently closes the JS string; it has taken out
// five files now and tools/glslguard.mjs exists because of it.
//
// s is the TANGENT of the azimuth offset and t the tangent of the elevation,
// both formed without a single atan: atan2 has a branch cut along -X and
// anything keyed on it draws a seam from zenith to horizon. al is the cosine
// of the azimuth offset, so the early-out at 0.55 is a 56 deg cone and costs
// one dot product for every direction that is not looking at a plume.
vec4 cbPlumeColumn(vec3 d, vec2 hzd, float t, vec2 c,
                   float top, float w0, float gain, float seed,
                   vec3 sunRad, vec3 ambient){
  float al = dot(hzd, c);
  if (al < 0.55) return vec4(0.0);
  float hgt = t / top;
  if (hgt > 1.0) return vec4(0.0);

  float s = (hzd.x * c.y - hzd.y * c.x) / al;
  float w = w0 * (0.55 + 2.90 * hgt);          // a plume spreads as it rises
  float lean = uPlume.z * hgt * hgt;           // ...and shears downwind
  float q = (s - lean) / w;
  float body = exp(-q * q * 1.9) * (1.0 - hgt) * (1.0 - hgt);
  // The foot dissolves into the boundary layer. ART §3.5 gives the aerosol a
  // 340 m scale height, and these columns stand kilometres away, so their
  // bottom few degrees are behind more haze than the camera can see through —
  // a plume with a hard bottom edge at the horizon reads as a decal. It also
  // takes the column out of the grazing band that water.js's SSR samples,
  // which is where a high-contrast sky feature costs the most temporal
  // residual (measured: it is half of this feature's cost in quality.mjs).
  body *= smoothstep(0.0, 0.058, t);
  if (body < 0.0015) return vec4(0.0);

  // the boil. Scrolls upward with uPlume.y and drifts with the same wind term
  // the cloud decks read, so the whole sky moves as one air mass.
  float n = fbm3(vec2(s * 24.0 + seed, t * 8.5 - uPlume.y));
  body *= 0.30 + 1.45 * n;
  float a = clamp(body * gain * uPlume.x, 0.0, 0.94);
  if (a < 0.002) return vec4(0.0);

  float mu = max(dot(d, uSunDir), 0.0);
  vec3 lit = ambient * (0.46 + 0.54 * (1.0 - hgt))
           + sunRad * (0.028 + 0.070 * mu * mu) * (0.34 + 0.66 * (1.0 - a));
  // the burn at its foot. ART §2.2 E2 ember body at 1050 K, falling off fast:
  // you see the fire only in the bottom fifth of the column.
  lit += vec3(0.86, 0.20, 0.018) * uPlume.w * exp(-hgt * 13.0);
  return vec4(lit, a);
}

vec4 cbPlumes(vec3 d, vec3 sunRad, vec3 ambient){
  if (d.y <= 0.0015 || uPlume.x <= 0.001) return vec4(0.0);
  vec2 hz = d.xz;
  float hzl = length(hz);
  if (hzl < 1e-4) return vec4(0.0);
  vec2 hzd = hz / hzl;
  float t = d.y / hzl;

  vec3 col = vec3(0.0);
  float acc = 0.0;
  // Three columns on fixed bearings. Fixed, not random: a landmark that moves
  // is not a landmark, and ART §7 wants the same plume in the same place in
  // every capture of a vista.
  vec4 p;
  p = cbPlumeColumn(d, hzd, t, vec2( 0.9272, -0.3746), 0.62, 0.020, 1.00,  0.0, sunRad, ambient);
  col = col * (1.0 - p.a) + p.rgb * p.a; acc = acc + p.a - acc * p.a;
  p = cbPlumeColumn(d, hzd, t, vec2(-0.6428, -0.7660), 0.38, 0.013, 0.74,  7.3, sunRad, ambient);
  col = col * (1.0 - p.a) + p.rgb * p.a; acc = acc + p.a - acc * p.a;
  p = cbPlumeColumn(d, hzd, t, vec2(-0.1736,  0.9848), 0.90, 0.031, 0.86, 14.9, sunRad, ambient);
  col = col * (1.0 - p.a) + p.rgb * p.a; acc = acc + p.a - acc * p.a;
  return vec4(col, acc);
}

// ---- the assembled sky ------------------------------------------------------
vec3 cbSky(vec3 d, float pixAngle){
  vec3 col = cbSkyBase(d);

  // --- sun disc. Limb darkening is per-channel (blue darkens hardest), and the
  // disc flattens as refraction squashes it into the horizon (ART §3.1).
  //
  // The edge is antialiased against the KNOWN angular size of a pixel, never
  // against fwidth(). fwidth() cost a capture cycle here: the back-hemisphere
  // guard is a step(), so along the great circle 90 deg from the sun the radius
  // jumped by 1e3 between adjacent pixels, fwidth() returned ~1e3, and
  // smoothstep(1-1e3, 1+1e3, r) evaluated to ~0.5 — i.e. HALF A SUN painted
  // along a great circle. It rendered as a razor-thin white diagonal line
  // across the sky in every daylight vista.
  float ms = dot(d, uSunDir);
  vec3 up = abs(uSunDir.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 sx = normalize(cross(up, uSunDir));
  vec3 sy = cross(uSunDir, sx);
  vec3 perp = d - uSunDir * ms;
  vec2 off = vec2(dot(perp, sx), dot(perp, sy) * uSkyQ.y);
  float r = (ms > 0.0) ? length(off) / uSkyQ.x : 1e3;
  float aaS = clamp(pixAngle / uSkyQ.x, 0.02, 1.0);
  float disc = 1.0 - smoothstep(1.0 - aaS, 1.0 + aaS, r);
  float mul = sqrt(max(1.0 - min(r * r, 1.0), 0.0));
  col += uSunDisc * (vec3(1.0) - vec3(0.44, 0.56, 0.70) * (1.0 - mul)) * disc;

  // --- THE NAIL, the companion star. It has shipped in this file since the
  // original scaffold as a decorative sub-pixel dot with no consequence, and
  // PALETTE_TARGET promotes it: it is the fiction's justification for the whole
  // cool half of the palette, and it now drives a real second DirectionalLight
  // (this.nail, see NAIL_IRRADIANCE) as well as being drawn here.
  //
  // "Make it visible" without turning a white dwarf into a moon. The DISC stays
  // needle-hard — 3 arc-minutes, floored at ~1.3 px so it cannot strobe under
  // TAA — and the visibility comes from a proper CIRCUMSTELLAR AUREOLE instead:
  // the same Mie forward-scatter the sun gets, in the same atmosphere, at the
  // companion's own colour temperature. That is honest (a bright point source
  // seen through a scattering medium always has one) and it is what actually
  // reads at 1x: a hard cyan-white point sitting in a small cool halo, on the
  // opposite side of the sky from an amber sun. Two lobes, ~7 deg and ~2 deg.
  float mn = dot(d, uNailDir);
  float rad = max(uSkyQ.z, pixAngle * 1.3);
  float ang = (mn > 0.0) ? length(d - uNailDir * mn) : 1e3;
  float aaN = pixAngle * 0.7;
  float core = 1.0 - smoothstep(rad - aaN, rad + aaN, ang);
  float nu = max(mn, 0.0);
  float n2 = nu * nu, n4 = n2 * n2, n8 = n4 * n4, n16 = n8 * n8, n32 = n16 * n16;
  float n64 = n32 * n32, n128 = n64 * n64, n256 = n128 * n128;
  col += uNailRad * (core
                   + 0.11 * exp(-min(ang, 40.0) / (rad * 2.2))
                   + 0.0090 * n64 + 0.0300 * n256);

  // --- clouds, far deck first. The high deck is shadowed by the low one: with
  // a sun this low the two decks are tens of km apart along the light ray, so
  // it renders as long dark bands drawn across the sky — ART §6.5's inverted
  // crepuscular band, for one extra noise tap.
  //
  // Two things make dusk read: the decks are lit by uCloudSun, the sun's
  // radiance as seen from 2-7 km up (the horizon dips ~1.5-2.6 deg from there,
  // so a deck is still in sunlight for minutes after the ground is not), and
  // their undersides pick up the horizon wedge as a warm bounce.
  vec2 axz = d.xz;
  float axl = length(axz);
  vec2 asz = uSunDir.xz;
  float asl = length(asz);
  float caz = (axl > 1e-5 && asl > 1e-5) ? max(dot(axz / axl, asz / asl), 0.0) : 0.0;
  // 0.130, not 0.055: the SKY_TABLE glow column came down to 42% this round, and
  // the warm bounce a cloud's UNDERSIDE picks up off the horizon wedge is one of
  // the few places the amber pole costs nothing in shade — a deck is above the
  // camera, so it lights nothing. Holding this product roughly where it was
  // keeps sunset-lit cloud bases against a cyan dome, which is the complementary
  // opposition working at its best.
  vec3 ambient = mix(uZenith, uHorizon, 0.55) * 0.85 + uGlow * (0.130 * caz * caz);

  // Plumes stand at 6-40 km, i.e. under both decks along any ray that reaches
  // one, so they composite first and the clouds pass in front of them.
  // rgb comes back PREMULTIPLIED, same convention as cbCloudDeck.
  vec4 pl = cbPlumes(d, uCloudSun, ambient);
  col = col * (1.0 - pl.a) + pl.rgb;

  float lowShadow = 1.0;
  vec4 hi = cbCloudDeck(d, uCloudA.w, uCloudC.y, uCloudB.x, uCloudA.y * 0.55,
                        2.8, uCloudSun * 1.18, ambient * 1.15, 1.0);
  {
    // sample the low deck where the sun ray crosses it, and darken the high one
    vec2 sd = uSunDir.xz;
    float sl = length(sd);
    float lift = max(uSunDir.y, 0.06);
    vec2 o = (sl > 1e-4 ? sd / sl : vec2(1.0, 0.0)) * ((uCloudA.w - uCloudA.z) / lift);
    vec3 ro = vec3(0.0, R_P + uCamPos.y * 0.001, 0.0);
    float t = cbShellT(ro, d, R_P + uCloudA.w);
    if (t > 0.0) {
      vec2 p = (uCamPos.xz * 0.001 + d.xz * t + o) * uCloudC.x + vec2(uCloudB.y, uCloudB.z);
      float thr = 0.78 - 0.62 * uCloudA.x;
      lowShadow = 1.0 - 0.62 * smoothstep(thr, thr + 0.16, cbCloudNLo(p, 1.35));
    }
  }
  hi.rgb *= mix(1.0, lowShadow, 0.85);
  col = col * (1.0 - hi.a) + hi.rgb;

  vec4 lo = cbCloudDeck(d, uCloudA.z, uCloudC.x, uCloudA.x, uCloudA.y,
                        1.35, uCloudSun, ambient, 1.0);
  col = col * (1.0 - lo.a) + lo.rgb;

  return max(col, vec3(0.0));
}
`;

// Main-pass sky: writes all four gbuffer attachments, including a real
// camera-rotation-only velocity so TAA and motion blur can retire their
// analytic fallbacks (HANDOFF: renderer/taa/motionblur all filed this).
const SKY_FRAG_MAIN = /* glsl */`
${SKY_COMMON}
uniform mat4 uViewProjUnjit;
uniform mat4 uPrevViewProjUnjit;
uniform float uPixAngle;

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outNormalRough;
layout(location = 2) out vec4 outVel;
layout(location = 3) out vec4 outSpec;

void main(){
  vec4 fp = uInvViewProj * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(fp.xyz / fp.w - uCamPos);

  outColor = vec4(cbSky(d, uPixAngle), 1.0);
  outNormalRough = vec4(0.0, 0.0, 0.0, 1.0);
  outSpec = vec4(0.0, 0.0, 0.0, 1.0);

  // Velocity of a point at infinity is pure camera rotation. Unjittered on both
  // ends, which is exactly what enrichMaterial() does for geometry, so the sky
  // and the world agree about what a motion vector means.
  vec4 c0 = uViewProjUnjit * vec4(d, 0.0);
  vec4 c1 = uPrevViewProjUnjit * vec4(d, 0.0);
  vec2 u0 = c0.xy / max(c0.w, 1e-6) * 0.5 + 0.5;
  vec2 u1 = c1.xy / max(c1.w, 1e-6) * 0.5 + 0.5;
  outVel = vec4(u0 - u1, ${CB_FLAG.SKY}.0, 0.0);
}
`;

// Cube-face sky for the PMREM source. Same field, one attachment, and a cheaper
// cloud shadow — the environment is a 128px cube blurred into an irradiance
// basis, so the difference is not representable in the output.
const SKY_FRAG_ENV = /* glsl */`
${SKY_COMMON}
layout(location = 0) out vec4 outColor;
void main(){
  vec4 fp = uInvViewProj * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(fp.xyz / fp.w - uCamPos);
  outColor = vec4(cbSky(d, 0.012), 1.0);
}
`;

// -----------------------------------------------------------------------------
// Aerial perspective BEYOND the volumetric march (frame-graph order 45).
//
// RENDER_PLAN §5.7: volumetrics.js owns extinction and in-scatter inside
// `vol.maxDist`; this owns everything past it, gated by
// smoothstep(0.85*maxDist, maxDist, d) so the two never double-count. The
// sigmas are ART §3.5's, identical to the ones volumetrics uses, and the
// in-scatter colour is `cbSkyBase(rayDir)` — so a ridge at full extinction
// converges exactly onto the sky behind it and there is no fog wall.
//
// When volumetrics is disabled (`__CB.toggle('vol')`) the gate drops to 30 m
// and this pass takes over the whole range, so aerial perspective never simply
// vanishes from the frame.
// -----------------------------------------------------------------------------
const AERIAL_FRAG = /* glsl */`
${SKY_COMMON}
uniform sampler2D uViewZ;
uniform vec3 uCamFwd;
uniform vec3 uSigmaS;
uniform vec3 uSigmaT;
uniform vec4 uAerial;      // x gateNear, y gateFar, z 1/H, w floorY
uniform float uGain;
layout(location = 0) out vec4 outColor;

void main(){
  vec2 uv = vNdc * 0.5 + 0.5;
  float vz = texture(uViewZ, uv).r;
  if (vz > 1.0e5) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  vec4 fp = uInvViewProj * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(fp.xyz / fp.w - uCamPos);
  float cosT = max(dot(d, uCamFwd), 1e-3);
  float dist = vz / cosT;

  float gate = smoothstep(uAerial.x, uAerial.y, dist);
  if (gate <= 0.0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  // Analytic optical depth through an exponential boundary layer of scale
  // height 1/uAerial.z (ART §3.5: 340 m, not an atmospheric 8 km).
  float y0 = max(uCamPos.y - uAerial.w, 0.0);
  float y1 = max(uCamPos.y + d.y * dist - uAerial.w, 0.0);
  float k = uAerial.z;
  float od;
  if (abs(d.y) < 1e-4) od = dist * exp(-y0 * k);
  else od = (exp(-y0 * k) - exp(-y1 * k)) / (d.y * k);
  od = max(od, 0.0) * gate * uGain;

  vec3 T = exp(-uSigmaT * od);
  vec3 inscat = cbSkyBase(d) * (uSigmaS / max(uSigmaT, vec3(1e-9))) * (vec3(1.0) - T);
  // CustomBlending(ONE, SRC_ALPHA): dst = inscat + dst * T. Transmittance is
  // stored scalar in .a; the per-channel part rides in the colour already.
  outColor = vec4(inscat, clamp(T.g, 0.0, 1.0));
}
`;

// =============================================================================

const lerp3 = (a, b, f, out) => {
  out[0] = a[0] + (b[0] - a[0]) * f;
  out[1] = a[1] + (b[1] - a[1]) * f;
  out[2] = a[2] + (b[2] - a[2]) * f;
  return out;
};

export class Sky {
  static id = 'sky';
  static deps = ['renderer'];

  constructor(ctx) {
    this.ctx = ctx;
    this.timeOfDay = 0.3;
    this.weather = 'clear';
    this.sunDir = new THREE.Vector3(0.3, 0.4, 0.6).normalize();
    this.sunColor = new THREE.Color(1, 0.65, 0.37);
    this.sunElevation = 20;
    // `sunIrradiance` is the KEY, i.e. §3.1's column x SUN_GAIN — this is what
    // getSunIrradiance() publishes and what every consumer must light with.
    // `skyUnitIrradiance` is §3.1's column verbatim, used only by terms that
    // live inside the §3.3 sky image (aureole, disc, cloud decks).
    this.sunIrradiance = 4.2 * SUN_GAIN;
    this.skyUnitIrradiance = 4.2;
    this.nailDir = new THREE.Vector3(0, 1, 0);
    this._iblDirty = true;
    this._lastIbl = -1e9;
    this._scratch = [0, 0, 0];

    this.knobs = ctx.debug.sky = {
      exposure: 1.0,
      key: 1.0,           // multiplier on SUN_GAIN — the key:fill A/B knob
      // multiplier on SKY_GAIN, the other half of that ratio. Together with
      // `key` this reproduces any previous build's key:fill in a single boot:
      // `key = 5.08/6.66 = 0.763, iblGain = 1/0.457 = 2.188` is the round-6
      // build, which is how tools/_skyratio.mjs --base measures the before.
      iblGain: 1.0,
      // 0 = ART §3.3's anchors with no chroma expansion (the pre-round-5 look,
      // measured at 0.2 deg of hue between key and fill), 1 = as derived above.
      // `node tools/_skyhue.mjs` is the A/B: it reports the hue angle between a
      // lit and a shadowed pixel on the same material.
      chroma: 1.0,
      plumes: 1.0,        // burn-plume column gain (ART §6.3/§6.5). 0 = off.
      sunDisc: 1.0,
      nail: 1.0,
      cloudCover: 0.0,
      cloudDensity: 1.0,
      cloudAlt: 2.2,
      cloudAltHigh: 6.8,
      cloudScale: 0.30,
      cloudScaleHigh: 0.105,
      stars: 1.0,
      burn: 1.0,        // amber burn-field horizon deck. Now the night ACCENT.
      // PALETTE_TARGET round 11. `bio` is the cyan bioluminescent airglow that
      // is the night's KEY (sky band + the lower hemisphere that lights the
      // grotto); `magenta` rations the sparse violet pop; `nailLight` scales
      // NAIL_IRRADIANCE, the companion star's DirectionalLight, so the cool
      // second light can be A/B'd against the round-10 build in one boot with
      // `nailLight = 0`.
      bio: 1.0,
      magenta: 1.0,
      nailLight: 1.0,
      // The two circumsolar warm terms, finally A/B-able. They are the largest
      // contributors to the fill of a surface facing the sun's azimuth and
      // neither had a knob, which is why five rounds of "the shade is warm" went
      // unattributed. `aureole` drives uSkyP.z (the Mie forward lobes),
      // `glow` drives the SKY_TABLE glow column (the amber horizon wedge).
      // tools/_skywarm.mjs sweeps both and reports the shade hue directly.
      aureole: 1.0,
      glow: 1.0,
      // ROUND 12, the two contrast knobs. `veil` scales the aerial pass's
      // single-scattering albedo while holding sigmaT, so it changes how BRIGHT
      // the distance is without changing how FAR you can see — the one lever
      // that separates haze from erasure (see AERIAL_ALBEDO). `weatherKey`
      // crossfades the weather attenuation on the key: 1 = on, 0 = every build
      // before round 12, in which a storm was lit like a clear afternoon.
      // Both exist so tools/_skyveil.mjs can sweep them in one boot.
      veil: 1.0,
      weatherKey: 1.0,
      iblSize: 128,
      iblInterval: 240,
      aerial: 1.0,
    };

    // The sun light exists from the constructor because engine/shadows.js reads
    // `ctx.sys.sky.sun` in its own init() and the topo sort may run it first.
    this.sun = new THREE.DirectionalLight(0xffa85e, 4.2 * SUN_GAIN);
    this.sun.castShadow = true;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 400;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;

    // The companion star, as a light. See NAIL_IRRADIANCE. Constructed here for
    // the same reason the sun is — shadows.js reads `ctx.sys.sky` in its own
    // init() and the topo sort may run it first — and NEVER toggled `visible`,
    // because removing a light from the list changes three's light-count define
    // and recompiles every material in the scene mid-frame.
    this.nail = new THREE.DirectionalLight(0xffffff, NAIL_IRRADIANCE);
    this.nail.color.setRGB(NAIL_COLOR[0], NAIL_COLOR[1], NAIL_COLOR[2]);
    this.nail.castShadow = false;
    this.nailIrradiance = NAIL_IRRADIANCE;
  }

  // ---------------------------------------------------------------------------

  async init() {
    const { ctx } = this;

    if (ctx.debug.flags.sky === undefined) ctx.debug.flags.sky = true;

    this.sun.shadow.mapSize.set(ctx.quality.shadowRes, ctx.quality.shadowRes);
    const s = 120;
    Object.assign(this.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
    ctx.scene.add(this.sun);
    ctx.scene.add(this.sun.target);
    // AFTER the sun: `shadows.js:_scan()` walks the scene counting directional
    // lights to find which unrolled loop iteration to patch, and although it
    // searches for `this.sun` by identity rather than assuming slot 0, keeping
    // the sun first costs nothing and keeps that code on its happy path.
    ctx.scene.add(this.nail);
    ctx.scene.add(this.nail.target);

    this.uniforms = {
      uInvViewProj: { value: new THREE.Matrix4() },
      uViewProjUnjit: { value: new THREE.Matrix4() },
      uPrevViewProjUnjit: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() },
      uPixAngle: { value: 0.001 },
      uZenith: { value: new THREE.Vector3(0.62, 0.95, 0.90) },
      uHorizon: { value: new THREE.Vector3(1.05, 1.02, 0.78) },
      uGlow: { value: new THREE.Vector3(2.55, 0.83, 0.0) },
      uBurn: { value: new THREE.Vector3() },
      uBio: { value: new THREE.Vector4(0, 0, 0, 0) },
      uGround: { value: new THREE.Vector3(0.6, 0.4, 0.18) },
      uSunDir: { value: this.sunDir },
      uSunRad: { value: new THREE.Vector3(4.2, 2.74, 1.56) },
      uCloudSun: { value: new THREE.Vector3(4.2, 2.74, 1.56) },
      uSunDisc: { value: new THREE.Vector3(600, 400, 220) },
      uNailDir: { value: this.nailDir },
      uNailRad: { value: new THREE.Vector3(38, 64, 86) },
      uSkyP: { value: new THREE.Vector4(AIRMASS_K, Math.exp(-AIRMASS_K), 1.0, 0.0) },
      uSkyQ: { value: new THREE.Vector4(0.00532, 1.0, 0.00042, 0.0) },
      uCloudA: { value: new THREE.Vector4(0.30, 0.60, 2.2, 6.8) },
      uCloudB: { value: new THREE.Vector4(0.30, 0.0, 0.0, 0.5) },
      uCloudC: { value: new THREE.Vector4(0.30, 0.105, 0.0, 0.0) },
      uTwilight: { value: new THREE.Vector2(0, 0) },
      uPlume: { value: new THREE.Vector4(1, 0, 0.16, 0.25) },
    };

    const shadowSteps = ctx.quality.preset === 'low' ? 2 : 3;
    this.material = this._rawMat(SKY_FRAG_MAIN, { CB_CLOUD_SHADOW: shadowSteps });
    this.material.userData.cbWritesGBuffer = true;   // we write all four MRTs
    this.envMaterial = this._rawMat(SKY_FRAG_ENV, { CB_CLOUD_SHADOW: 2 }, false);

    // The one triangle. Vertices are clip-space by convention with SKY_VERT.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this._geo = geo;

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'sky';
    this.mesh.frustumCulled = false;
    // DRAWN LAST, DEPTH-TESTED — not first with depthTest off, which is what the
    // old dome did. The sky shader is the most expensive per-pixel thing in the
    // frame (two self-shadowed cloud decks); drawing it first meant shading all
    // 2.07 M pixels and then overdrawing 80% of them with terrain. Measured
    // 1.56 ms -> 0.35 ms at 1080p for a byte-identical image. The triangle emits
    // gl_Position.z = 1.0 in clip space, which is exactly renderer.js's
    // CLEAR_DEPTH, so LEQUAL passes on untouched pixels and fails everywhere
    // geometry wrote. depthWrite stays off so nothing downstream sees the sky
    // as an occluder.
    this.mesh.renderOrder = 1000;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.userData.cbNoShadow = true;
    this.mesh.layers.set(CB_LAYER.SKY);
    this.mesh.onBeforeRender = (r, sc, cam) => this._bindCamera(cam);
    ctx.scene.add(this.mesh);

    // --- IBL: a private one-mesh scene, so building the environment never
    // traverses (or hides half of) the real scene, and cannot pick up whatever
    // the world systems have added since.
    this._envScene = new THREE.Scene();
    this._envMesh = new THREE.Mesh(geo, this.envMaterial);
    this._envMesh.frustumCulled = false;
    this._envMesh.onBeforeRender = (r, sc, cam) => this._bindCamera(cam);
    this._envScene.add(this._envMesh);

    this.pmrem = new THREE.PMREMGenerator(ctx.renderer);
    this.pmrem.compileCubemapShader();
    const size = Math.max(32, Math.min(512, this.knobs.iblSize | 0));
    this.cubeRT = new THREE.WebGLCubeRenderTarget(size, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.NoColorSpace,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    // near/far are irrelevant — the sky triangle is written in clip space and
    // has no world extent to fall outside a frustum. That is the whole point.
    this.cubeCam = new THREE.CubeCamera(0.1, 10, this.cubeRT);

    this.resize();
    this.setTimeOfDay(this.timeOfDay);
    this.setWeather(this.weather);
    this.updateIBL();

    // NO scene.fog. Extinction lives in volumetrics.js inside vol.maxDist and in
    // this file's order-45 pass beyond it. A single-channel FogExp2 cannot
    // express ART §3.5's per-channel sigma and was the strongest "this is Earth"
    // cue in the build.
    ctx.scene.fog = null;

    this._initAerial();
  }

  _rawMat(frag, defines, depthTest = true) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,   // three prepends `#version 300 es` itself
      vertexShader: SKY_VERT,
      fragmentShader: frag,
      uniforms: this.uniforms,    // shared object: one write updates both
      defines,
      depthTest,
      depthWrite: false,
      depthFunc: THREE.LessEqualDepth,
      side: THREE.FrontSide,
      toneMapped: false,
      fog: false,
    });
  }

  /** Per-draw camera binding. Works for the game camera and all six cube faces. */
  _bindCamera(cam) {
    const u = this.uniforms;
    cam.updateMatrixWorld();
    this._mv = this._mv || new THREE.Matrix4();
    this._mv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    u.uInvViewProj.value.copy(this._mv).invert();
    u.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
  }

  // ---------------------------------------------------------------------------
  // day arc
  // ---------------------------------------------------------------------------

  /**
   * ART §3.1: rotation period 31 h, and the sun NEVER exceeds 52 deg. The arc is
   * a great circle inclined 52 deg to the horizontal — so the azimuth sweeps
   * from rise to set instead of the sun sliding up and down one bearing — with
   * the elevation shaped by |sin|^1.2 so the 0-12 deg golden band lasts ~90 min
   * of the 31 h day rather than the 68 min a raw sinusoid gives.
   */
  setTimeOfDay(t) {
    this.timeOfDay = ((t % 1) + 1) % 1;
    const H = (this.timeOfDay - 0.25) * TAU;
    const sh = Math.sin(H), ch = Math.cos(H);

    // rise bearing, chosen so the established vistas keep their light direction
    const AZ0 = 40 * DEG;
    const e1 = [Math.cos(AZ0), 0, Math.sin(AZ0)];
    // axis of the diurnal circle, 52 deg from vertical; e2 = axis x e1, negated
    const inc = 52 * DEG;
    const ax = [Math.sin(inc) * -e1[2], Math.cos(inc), Math.sin(inc) * e1[0]];
    const e2 = [
      -(ax[1] * e1[2] - ax[2] * e1[1]),
      -(ax[2] * e1[0] - ax[0] * e1[2]),
      -(ax[0] * e1[1] - ax[1] * e1[0]),
    ];
    const cx = e1[0] * ch + e2[0] * sh;
    const cz = e1[2] * ch + e2[2] * sh;
    const az = Math.atan2(cz, cx);

    const elevDeg = 52 * Math.sign(sh) * Math.pow(Math.abs(sh), 1.2);
    this.sunElevation = elevDeg;
    const ce = Math.cos(elevDeg * DEG);
    this.sunDir.set(ce * Math.cos(az), Math.sin(elevDeg * DEG), ce * Math.sin(az)).normalize();

    // The Nail: 30-60 deg from Kiln (ART §3.1), lifted so it is always in the
    // sky rather than under the horizon at night.
    const nAz = az + 44 * DEG;
    const nEl = clamp(elevDeg * 0.42 + 26, 14, 62) * DEG;
    this.nailDir.set(Math.cos(nEl) * Math.cos(nAz), Math.sin(nEl), Math.cos(nEl) * Math.sin(nAz)).normalize();
    this.nailElevation = nEl / DEG;

    this._applySunTable(elevDeg);
    this._updateSkyColours(elevDeg);
    this._iblDirty = true;
    return this;
  }

  /** ART §3.1 lookup: peak-normalised linear colour + irradiance at an elevation. */
  _sunAt(elev) {
    const T = SUN_TABLE;
    if (elev >= T[0][0]) return { r: T[0][1], g: T[0][2], b: T[0][3], E: T[0][4] };
    const L = T[T.length - 1];
    if (elev <= L[0]) return { r: L[1], g: L[2], b: L[3], E: L[4] };
    for (let i = 0; i < T.length - 1; i++) {
      if (elev <= T[i][0] && elev >= T[i + 1][0]) {
        const f = (elev - T[i + 1][0]) / (T[i][0] - T[i + 1][0]);
        return {
          r: T[i + 1][1] + (T[i][1] - T[i + 1][1]) * f,
          g: T[i + 1][2] + (T[i][2] - T[i + 1][2]) * f,
          b: T[i + 1][3] + (T[i][3] - T[i + 1][3]) * f,
          E: T[i + 1][4] + (T[i][4] - T[i + 1][4]) * f,
        };
      }
    }
    return { r: 1, g: 0.652, b: 0.372, E: 4.2 };
  }

  /**
   * Transmittance of the current weather's cloud/ash deck to the key, relative
   * to `clear`. See KEY_DECK_TAU. Returns 1.0 exactly under clear weather at
   * every elevation, so this can never move a clear-weather vista.
   */
  _weatherKeyT(elev) {
    const slab = (W) => {
      const slant = 1 / Math.max(Math.sin(elev * DEG), 0.15);
      const tau = KEY_DECK_TAU * W.dens * (1 + 2.2 * W.murk + 1.9 * W.ash) * slant;
      const direct = Math.exp(-tau);
      return (1 - W.cover) + W.cover * (direct + KEY_DECK_FWD * (1 - direct) * Math.exp(-tau * 0.5));
    };
    const ref = slab(WEATHER.clear);
    return ref > 1e-6 ? sat(slab(WEATHER[this.weather] || WEATHER.clear) / ref) : 1;
  }

  _applySunTable(elev) {
    const c = this._sunAt(elev);
    // ---- ROUND 12: the key finally sees the weather. See KEY_DECK_TAU for the
    // model and for the four-round-old HANDOFF request this closes. `tw` is 1.0
    // under clear weather by construction, so this is a no-op on twelve of the
    // fourteen review vistas and a two-stop cut on the two that are briefed dark.
    const tw = this._weatherKeyT(elev) * this.knobs.weatherKey
             + (1 - this.knobs.weatherKey);
    // Redden in proportion to how much of the beam the deck removed, then
    // renormalise to peak 1 so the tint moves the COLOUR only and the whole
    // magnitude stays in `sunIrradiance` where tools/keyfill.mjs can read it.
    const rd = 1 - tw;
    const kr = c.r * (1 + rd * (KEY_DECK_TINT[0] - 1));
    const kg = c.g * (1 + rd * (KEY_DECK_TINT[1] - 1));
    const kb = c.b * (1 + rd * (KEY_DECK_TINT[2] - 1));
    const kmax = Math.max(kr, kg, kb, 1e-6);
    this.sunColor.setRGB(kr / kmax, kg / kmax, kb / kmax);
    // Two irradiances, deliberately. See SUN_GAIN. `skyUnitIrradiance` feeds the
    // aureole and the cloud decks — parts of the §3.3 SKY image, which is drawn
    // ABOVE the deck — so it takes the §3.1 column verbatim and is NOT
    // weather-attenuated. Only light that has to come THROUGH the deck to reach
    // the ground is.
    this.skyUnitIrradiance = c.E;                             // §3.1 verbatim
    this.weatherKeyT = tw;
    this.sunIrradiance = c.E * SUN_GAIN * this.knobs.key * tw;  // the actual key
    this.sun.color.copy(this.sunColor);
    // NEVER toggle `visible`: removing a light from the list changes three's
    // light-count define and recompiles every material in the scene mid-frame.
    // Intensity 0 is the same picture for free.
    this.sun.intensity = this.sunIrradiance;
    this.sun.position.copy(this.sunDir).multiplyScalar(220);
    this.sun.target.position.set(0, 0, 0);

    // The companion star. Its TOP-OF-ATMOSPHERE irradiance is a constant — it is
    // a star, not a phase of the day — and everything that varies comes from the
    // slant path it is seen through. See NAIL_TAU. Same rule as the sun: drive
    // `intensity`, never `visible`, or three recompiles every material in the
    // scene mid-frame.
    const nSin = Math.max(Math.sin((this.nailElevation || 26) * DEG), 0.12);
    const am = Math.min(1 / nSin, 8);
    const tr = Math.exp(-NAIL_TAU[0] * am);
    const tg = Math.exp(-NAIL_TAU[1] * am);
    const tb = Math.exp(-NAIL_TAU[2] * am);
    // Normalise the transmitted spectrum back to a peak-1 colour and carry the
    // whole magnitude in `intensity`, so `nailIrradiance` stays comparable with
    // `sunIrradiance` and tools/keyfill.mjs can difference the two lights.
    const nr = NAIL_COLOR[0] * tr, ng = NAIL_COLOR[1] * tg, nb = NAIL_COLOR[2] * tb;
    const nmax = Math.max(nr, ng, nb, 1e-6);
    const tLuma = (0.2126 * nr + 0.7152 * ng + 0.0722 * nb)
                / (0.2126 * NAIL_COLOR[0] + 0.7152 * NAIL_COLOR[1] + 0.0722 * NAIL_COLOR[2]);
    this.nail.color.setRGB(nr / nmax, ng / nmax, nb / nmax);
    // The DRAWN star reads the same transmitted triple, so the point of light in
    // the sky and the light it casts on the world are the same object seen two
    // ways. They were unrelated constants before, because one of them did not
    // exist; letting them drift apart again is how a sky stops being a light.
    this._nailT = [nr, ng, nb];
    this.nailIrradiance = NAIL_IRRADIANCE * tLuma * this.knobs.nailLight;
    this.nail.intensity = this.nailIrradiance;
    this.nail.position.copy(this.nailDir).multiplyScalar(220);
    this.nail.target.position.set(0, 0, 0);
  }

  /** Interpolate ART §3.3 across the arc and derive every dependent term. */
  _updateSkyColours(elev) {
    const u = this.uniforms;
    const K = SKY_TABLE;
    let zen, hor, glow;
    if (elev >= K[0][0]) { zen = K[0][1]; hor = K[0][2]; glow = K[0][3]; }
    else if (elev <= K[K.length - 1][0]) { zen = K[K.length - 1][1]; hor = K[K.length - 1][2]; glow = K[K.length - 1][3]; }
    else {
      for (let i = 0; i < K.length - 1; i++) {
        if (elev <= K[i][0] && elev >= K[i + 1][0]) {
          const f = (elev - K[i + 1][0]) / (K[i][0] - K[i + 1][0]);
          zen = lerp3(K[i + 1][1], K[i][1], f, [0, 0, 0]);
          hor = lerp3(K[i + 1][2], K[i][2], f, [0, 0, 0]);
          glow = lerp3(K[i + 1][3], K[i][3], f, [0, 0, 0]);
          break;
        }
      }
    }

    // ---- luminance-preserving chroma expansion (see SKY_CHROMA_* above).
    // Applied to the ANCHORS, before anything reads them, so the shader, the
    // PMREM, `_skyAverage`, the ground bounce, `ctx.world.skyIrradiance` and
    // the order-45 aerial pass all see one field. Nothing downstream can
    // disagree with the picture about what colour the sky is.
    const kc = this.knobs.chroma;   // 0 = the §3.3 anchors raw, 1 = as derived
    // How much of a blue-over-green excess the anchors may keep. Zero by day —
    // ART §8's first anti-reference is the Earth-blue sky and that guard stays
    // absolute — rising to 0.72 at night, because PALETTE_TARGET's night base is
    // "deep blue-black" and clamping it to 180 deg cyan there would produce a
    // teal night, which is a graded day. See `_noBlue`.
    const nightAmt = 1 - sat((elev + 9.0) / 11.0);
    const blueOk = nightAmt * 0.72;
    zen = this._noBlue(this._chroma(zen, 1 + (SKY_CHROMA_ZENITH - 1) * kc, [0, 0, 0]), blueOk);
    hor = this._noBlue(this._chroma(hor, 1 + (SKY_CHROMA_HORIZON - 1) * kc, [0, 0, 0]), blueOk);

    // ---- SKY_GAIN, applied to the ANCHORS themselves and therefore to every
    // consumer at once: the drawn dome, the PMREM, `_skyAverage`, the sky half
    // of the ground bounce, `ctx.world.skyIrradiance` and the order-45 aerial
    // in-scatter. Applied AFTER `_chroma` only for readability — the expansion
    // is homogeneous of degree one, so the two commute exactly.
    const sg = SKY_GAIN * this.knobs.iblGain;
    const gw = sg * this.knobs.glow;
    for (let i = 0; i < 3; i++) { zen[i] *= sg; hor[i] *= sg; glow[i] *= gw; }

    const e = this.knobs.exposure;
    u.uZenith.value.set(zen[0] * e, zen[1] * e, zen[2] * e);
    u.uHorizon.value.set(hor[0] * e, hor[1] * e, hor[2] * e);
    u.uGlow.value.set(glow[0] * e, glow[1] * e, glow[2] * e);

    // Sun radiance for the aureole. §3.1's column VERBATIM, not the key: the
    // aureole is part of the §3.3 sky image, whose anchors already contain the
    // forward-scattered light, and scaling it by SUN_GAIN would put a 5x glare
    // blob over the horizon. See SUN_GAIN. It IS scattered light, so it takes
    // SKY_GAIN with the rest of the field — otherwise the circumsolar lobe
    // becomes the dominant term in `_skyAverage` and hands the world back the
    // warm ambient this round exists to remove.
    const E = this.skyUnitIrradiance * sg;
    u.uSunRad.value.set(this.sunColor.r * E * e, this.sunColor.g * E * e, this.sunColor.b * E * e);

    // ...and the radiance a CLOUD DECK sees. From 2.2 km the horizon dips
    // acos(R/(R+h)) = 1.5 deg, from 6.8 km 2.6 deg, so the decks stay in
    // sunlight after the ground is in shadow. That single offset is the whole
    // reason a dusk sky has lit clouds over a dark landscape.
    const cs = this._sunAt(elev + 2.05);
    const cE = cs.E * sg;
    u.uCloudSun.value.set(cs.r * cE * e, cs.g * cE * e, cs.b * cE * e);

    // disc: physically the disc radiance is E / solid-angle ~ 47000, which is
    // correct and unusable — it clips the bloom pass's whole energy budget into
    // one sprite. Art-directed to sit ~80x above the near-sun sky so it reads as
    // an emitter without eating the frame, and it fades out under the horizon.
    const discGain = this.knobs.sunDisc * (520 + 2300 * sat((elev + 1.2) / 15.0));
    const dv = sat((elev + 1.6) / 1.6);
    u.uSunDisc.value.set(
      this.sunColor.r * discGain * dv * e,
      this.sunColor.g * discGain * dv * e,
      this.sunColor.b * discGain * dv * e,
    );

    // refraction flattens the disc into the horizon at very low elevation
    u.uSkyQ.value.y = 1.0 + 0.85 * sat((2.5 - elev) / 3.0);
    u.uSkyQ.value.z = 0.00042;   // ~1.4 arc-minutes; the pixel floor takes over
    // The Nail's drawn radiance. Re-pointed onto NAIL_COLOR so the star you can
    // see and the light it casts are the same object — they were two unrelated
    // triples before, because one of them did not exist. Peak 105 against the
    // old 86: it has to sit clearly above a zenith that is now a saturated teal
    // rather than a pale wash, and it is a POINT, so its solid angle keeps it
    // out of every integral in this file except the aureole term that is
    // accounted for explicitly in `_skyAverage`.
    const nailK = this.knobs.nail * e * 105;
    const nT = this._nailT || NAIL_COLOR;
    u.uNailRad.value.set(nT[0] * nailK, nT[1] * nailK, nT[2] * nailK);

    // The Mie forward lobes' gain. uSkyP.z was written once at init and never
    // touched again, so the single biggest warm term in the fill of a
    // sun-facing surface had no way to be measured against anything.
    u.uSkyP.value.z = this.knobs.aureole;

    // night amount drives stars, the burn glow, and the twilight structure
    const night = 1 - sat((elev + 9.0) / 11.0);
    const twilight = sat((6.0 - Math.abs(elev + 1.0)) / 7.0);
    u.uSkyP.value.w = night;
    u.uSkyQ.value.w = this.knobs.stars * night * 0.85 * e;
    u.uTwilight.value.set(twilight, twilight * sat((-elev) / 6.0));

    const breath = this.ctx.world?.breath ?? 0.5;
    // The burn deck is scattered field too (it is the ground's own fire seen in
    // the haze), so it takes SKY_GAIN. ART §3.4 wants night mean luma 0.06-0.11
    // and warns against "a night that is just a blue-graded day"; this moves in
    // that direction, and grotto is emissive-dominant, so its key is unaffected.
    const bk = this.knobs.burn * night * (0.72 + 0.56 * breath) * e * sg;
    u.uBurn.value.set(BURN_GLOW[0] * bk, BURN_GLOW[1] * bk, BURN_GLOW[2] * bk);

    // ---- the cyan bioluminescent airglow: the NIGHT'S KEY (PALETTE_TARGET).
    // Scattered field like the burn deck, so it takes SKY_GAIN with everything
    // else and the drawn sky, the PMREM, `_skyAverage` and the ground bounce can
    // never disagree about it. It breathes on the SAME global scalar as the burn
    // and the plumes but in ANTIPHASE — bioluminescence is a living tissue
    // response and the fires are a wind response, so when the wind gusts the
    // fires brighten and the flora shuts down. That is one line of code and it
    // is most of why the night reads as a biology rather than a colour filter.
    const gk = this.knobs.bio * night * (1.18 - 0.36 * breath) * e * sg;
    u.uBio.value.set(
      BIO_GLOW[0] * gk, BIO_GLOW[1] * gk, BIO_GLOW[2] * gk,
      this.knobs.magenta * night * 0.052 * e * sg,
    );

    // ---- the lower hemisphere: ART §3.2's bounce term, made a real part of the
    // environment map instead of a hand-waved constant. Two contributions:
    //   sun  : key x (0.41,0.30,0.18) x 0.34, converted from irradiance to the
    //          uniform radiance that produces it (divide by pi);
    //   sky  : ash albedo x the hemisphere-averaged sky radiance.
    // The result is warm while the zenith is teal, which is the inverse of Earth
    // daylight and is most of what makes the world read as somewhere else.
    // The bounce is reflected KEY, so it takes the gained irradiance. That is
    // what makes the underside fill warm and strong enough to read against a
    // teal zenith (§3.2's cool-above / warm-below inversion) instead of being a
    // 5x-too-dim tint nobody can see.
    const avg = this._skyAverage(zen, hor, glow, this._scratch, u.uBurn.value, u.uSunRad.value, elev,
      u.uBio.value, u.uNailRad.value, this.nailElevation);
    const Ek = this.sunIrradiance;
    // ONE albedo for BOTH halves of the bounce (round 11 — see the note above
    // BOUNCE_TINT_UNUSED_SEE_NOTE). The ground has one diffuse albedo; which
    // light happens to be falling on it cannot change what that albedo is.
    const A = GROUND_ALBEDO, G = GROUND_ALBEDO;
    // The key's irradiance ON THE GROUND is E * sin(elev). It was
    // `sat(sin(elev)*3)`, which at this planet's 4-20 deg gameplay elevations
    // is a 2.7-3.0x overstatement — and this term is half the fill of every
    // shaded vertical surface in the frame, so that error WAS the warm shadow.
    // Nothing else in the file compensated for it, which is why it survived
    // four critic rounds: the number it produced was plausible.
    const sunUp = Math.max(Math.sin(elev * DEG), 0);
    const kb = Ek * sunUp * BOUNCE_FF / Math.PI;
    // BOUNCE_FF applies to BOTH halves. It was on the key half only, which is
    // an inconsistency worth naming: the form factor answers "how much of a
    // down-facing surface's hemisphere is actually filled by illuminated
    // ground", and that geometry cannot depend on which light lit the ground.
    // Leaving it off the sky half made the sky-reflected bounce 2.9x stronger
    // relative to the key-reflected one than it should be — which, once the sky
    // was correctly cool, flipped the whole lower hemisphere cyan at low sun
    // and inverted ART §3.2/§10's warm-below identity. Measured at `establish`
    // (7 deg): ground hue 148 deg before this line, 51 deg after.
    const sb = BOUNCE_FF;
    // ART §1: "old fuel never fully goes out". The ember pedestal was gated on
    // `night`, i.e. the coals switched off at dawn. They do not — they are just
    // outshone. A permanent 1% floor on top of the night term is what keeps the
    // underside fill warm at 4-10 deg sun, where the sun is too low to deliver
    // it and the physics would otherwise (correctly) hand the lower hemisphere
    // to the teal sky. On this planet the warm-from-below is the FIRE, not the
    // sun, which is the premise of the whole world.
    //
    // ROUND 7: it takes SKY_GAIN like every other AMBIENT term. Measured at
    // `ridge` (-0.44 deg, i.e. the sun is under the horizon and there is no key
    // at all) the pedestal was contributing 0.030 of the lower hemisphere's red
    // channel out of 0.032 — 94% of the fill under every up-facing normal in the
    // frame was this constant, which is why `ridge` was the one vista where the
    // shadow measured WARMER than the light (dHue -6.8) instead of cooler. The
    // ember floor is a real part of this world and it stays; it is a floor, not
    // the ceiling it had become.
    //
    // ROUND 11 — THE EMBER PEDESTAL WAS THE GROTTO'S WHOLE LIGHTING MODEL, AND
    // PALETTE_TARGET REPLACES IT. At `grotto` the lower hemisphere measured
    // (0.040, 0.008, 0.001) — hue 10.8 deg, 97.5% saturated orange — and since
    // the sun is 30 deg under the horizon there and the night sky is ~0.006,
    // that constant WAS the environment. Every cave wall, every underside and
    // the viewmodel itself came out orange, with the cyan emitters sitting
    // inside a warm wash instead of above a dark one. Ten rounds of "grotto is
    // the weakest shot in the set" is that one line.
    //
    // So the night term is re-pointed rather than removed. The fires do not go
    // out (ART §1: "old fuel never fully goes out") — they stop being the key:
    //
    //   ember : night x 0.012 + 0.006, was night x 0.055 + 0.010. Still a real
    //           warm floor under every overhang at 4-10 deg sun, which is what
    //           it was added for and where §3.2's warm-below inversion lives.
    //           The DAY floor halves, which takes a small permanent warm bias
    //           out of every shaded vertical surface in every daylight vista.
    //   bio   : the basin's own bioluminescence, cyan, night-gated, and now the
    //           dominant term below the horizon after dark. MEASURED at grotto
    //           by tools/_skyhue.mjs, before -> after:
    //             uGround   (0.040, 0.008, 0.001)  ->  (0.013, 0.019, 0.021)
    //             hue / sat  10.8 deg / 97.5%      ->  195 deg / 38.1%
    //           i.e. the lower hemisphere stopped being saturated orange and
    //           became a desaturated deep cyan-blue at a THIRD of the luminance.
    //           The frame-level consequence, from tools/_skyvalue.mjs on the
    //           capture: p10 0.111 -> 0.085 (a genuinely darker base), top1
    //           0.868 -> 0.944 (brighter emitters), top1/p50 2.44 -> 3.03, and
    //           cool-chroma share 12.2% -> 70.0%. That is an emissive-dominant
    //           model, built where this file can actually deliver one: in the
    //           environment map the whole world is lit by.
    const emb = (night * 0.012 + 0.006) * sg;
    const bio = this.knobs.bio * night * sg;
    u.uGround.value.set(
      (this.sunColor.r * kb * A[0] + sb * G[0] * avg[0] + emb * 1.35 + bio * BIO_GLOW[0]) * e,
      (this.sunColor.g * kb * A[1] + sb * G[1] * avg[1] + emb * 0.24 + bio * BIO_GLOW[1]) * e,
      (this.sunColor.b * kb * A[2] + sb * G[2] * avg[2] + emb * 0.03 + bio * BIO_GLOW[2]) * e,
    );

    this._avgSky = [avg[0], avg[1], avg[2]];

    // ---- HANDOFF request from flora.js: the SKY's cosine-weighted irradiance on
    // an upward-facing surface, so a backlit crown can transmit the light that is
    // actually behind it. three computes `indirectDiffuse` from the VISIBLE
    // face's normal, so for a leaf whose top faces the sky and whose underside
    // faces the camera the only irradiance flora can see is the ground bounce —
    // i.e. the transmission term was weakest exactly where it should be
    // strongest, and no rearrangement inside flora.js could fix it.
    //
    // This is `avg` (the hemisphere-averaged RADIANCE, whose integral weights are
    // derived in _skyAverage) times PI. Sky only — no key, no bounce — which is
    // what "the light behind the leaf" means for a crown seen from below.
    // Published in the scene units of ART §2.2, which as of SUN_GAIN are finally
    // the units the document says they are.
    const w = this.ctx.world;
    if (w) {
      if (!w.skyIrradiance) w.skyIrradiance = new THREE.Vector3();
      w.skyIrradiance.set(avg[0] * Math.PI, avg[1] * Math.PI, avg[2] * Math.PI);
    }
  }

  /**
   * Push a linear triple away from its own luminance by `gain`, WITHOUT moving
   * that luminance. Rec.709 luma is a linear functional, so
   *   L(c') = L(L + g(c - L)) = L + g(L(c) - L) = L    for any g.
   * i.e. saturation moves and value does not, exactly. That is what lets this
   * be applied to ART §3.3's anchors without invalidating any of them, the
   * §3.2 irradiance floor, or any exposure decision made downstream.
   *
   * The only nonlinearity is the floor: a large gain drives the smallest
   * channel negative. Rather than clamp (which would silently change the luma
   * and desaturate the OTHER channels' relationship), the gain is reduced to
   * the largest value that keeps every channel at >= CHROMA_FLOOR * L. So the
   * expansion is as strong as the colour can physically take and no stronger,
   * and the luminance identity above holds for the gain actually used.
   */
  _chroma(c, gain, out) {
    const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    if (!(L > 1e-9) || gain <= 1.0) { out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return out; }
    const floor = CHROMA_FLOOR * L;
    let g = gain;
    for (let i = 0; i < 3; i++) {
      const d = c[i] - L;
      if (d < -1e-12) g = Math.min(g, (floor - L) / d);   // both sides negative
    }
    g = Math.max(1.0, g);
    out[0] = L + g * (c[0] - L);
    out[1] = L + g * (c[1] - L);
    out[2] = L + g * (c[2] - L);
    return out;
  }

  /**
   * ART §3.3, first sentence: "Zenith is desaturated teal, horizon is amber,
   * and there is no blue anywhere in it." ART §8's first anti-reference is the
   * blue sky and the blue distance.
   *
   * But §3.3's own table has b > g in its dusk and night rows — (0.020, 0.031,
   * 0.042) at -6 deg is hue 207 deg, which is Earth twilight blue — and a
   * chroma expansion on a hue like that walks it further into blue, not into
   * teal. Captured `ridge` at -0.44 deg elevation with the expansion and no
   * guard and it read as a Utah sunset, which is the exact miss §8 names.
   *
   * So: any excess of blue over green is redistributed INTO green at constant
   * luminance. The sky's coolest reachable hue becomes exactly 180 deg cyan and
   * can never be 210 deg blue, by construction rather than by a table entry
   * someone has to remember not to break. Luminance is exactly preserved because
   * the replacement is the luma-weighted mean of the two channels it replaces.
   *
   * ROUND 11 — `allow` (0..1) is how much of the excess survives. It is 0 for
   * every daylight elevation, which is the rule above unchanged. It rises to
   * 0.72 at night because PALETTE_TARGET's night base is explicitly "deep
   * blue-black": there, forcing 180 deg cyan does not prevent an Earth sky, it
   * prevents the night from being dark and blue, and produces the teal-graded
   * day ART §3.4 warns about instead. Luminance is preserved for any `allow`,
   * since the redistribution is still the luma-weighted mean of the pair.
   */
  _noBlue(c, allow = 0) {
    if (c[2] <= c[1]) return c;
    const a = clamp(allow, 0, 1);
    const m = (0.7152 * c[1] + 0.0722 * c[2]) / 0.7874;
    c[1] = c[1] + (m - c[1]) * (1 - a);
    c[2] = c[2] + (m - c[2]) * (1 - a);
    return c;
  }

  /** ART §3.2 fill, as an irradiance. Mirrors `ctx.world.skyIrradiance`. */
  getSkyIrradiance() {
    const a = this._avgSky || [0.6, 0.8, 0.75];
    return [a[0] * Math.PI, a[1] * Math.PI, a[2] * Math.PI];
  }

  /**
   * COSINE-WEIGHTED hemisphere average of the radiance field, i.e. the sky's
   * irradiance on an up-facing surface divided by pi. Used for the ground-bounce
   * colour and published for volumetrics.
   *
   * The weights are integrated, not guessed. For W = 2 INT_0^1 y f(y) dy, with
   * K = AIRMASS_K = 7.5 and INT_0^1 y e^-py dy = (1 - e^-p (1+p)) / p^2:
   *
   *   horizon  hw(y) = (e^-Ky - e^-K)/(1 - e^-K)
   *              2[(1 - e^-7.5*8.5)/56.25 - e^-7.5/2] / (1 - e^-7.5)
   *                                                        ->  W = 0.0348
   *              hence zenith                              ->  W = 0.9652
   *   glow     hw^2.40, p = 18.0                           ->  W = 0.00617
   *              x azimuthal mean of max(cos,0)^7,
   *                (1/2pi) x 2 x (6!!/7!!) = (1/2pi)(48/105) x 2 = 0.14551
   *                                                        ->  W = 0.000898
   *              ROUND 11: was hw^1.35 x cos^5 -> 0.00331. The wedge tightened
   *              and the SKY_TABLE glow column came down to 42%, so this term's
   *              share of the fill is 8.6x smaller. It HAS to be re-derived
   *              here in the same edit or the ground bounce keeps being lit by
   *              a wedge the sky no longer draws — which is the exact class of
   *              bug the round-7 aureole note below was written about.
   *   burn     hw^0.812, p = 6.09,  x mean patch 0.875     ->  W = 0.0464
   *   bio      hw^0.95,  p = 7.125, x mean patch 0.867     ->  W = 0.0339
   *              ROUND 11, new. 2[(1 - e^-7.125(8.125))/50.77] = 0.03914, and
   *              the patch field is 0.35 + 1.10 x fbm4 whose mean is 0.47.
   *              This is the night's KEY (PALETTE_TARGET) and it is the largest
   *              single term in the night hemisphere average, which is the
   *              whole intent: after dark the world's ambient is cyan.
   *   magenta  hw^1.344, p = 10.08                         ->  W = 0.01968
   *              x mean of smoothstep(0.55, 1.35, bioPatch) ~= 0.35
   *                                                        ->  W = 0.00689
   *   aureole  INT mu^n dw = 2pi/(n+1), x sin(sunElev)     ->  W = 0.0667
   *              (0.135/9 + 0.80/65 + 3.10/513) x 2 = 0.0667, round 7's lobes.
   *              Round 11 cut these to 0.048/0.62/3.10 (W = 0.0418) on a good
   *              hypothesis and reverted when tools/_skywarm.mjs measured the
   *              shade with the aureole swept to ZERO and found 1.1 deg of hue
   *              in it. See the long note in cbSkyBase.
   *   nail     (0.0090/65 + 0.0300/257) x 2 x sin(nailElev) -> W = 0.000510
   *              ROUND 11, new: the companion star's own circumstellar aureole.
   *              Small, but it is COOL and it is the only term here that is,
   *              besides the zenith, so it is worth being exact about.
   *
   * Two of these moved a long way when AIRMASS_K went 4.2 -> 7.5 and the wedge
   * went cos^3 -> cos^5, and both moves are the point rather than a side
   * effect: the horizon's share of the up-facing fill fell 0.091 -> 0.0348 and
   * the amber wedge's fell 0.0149 -> 0.00331. Between them they were adding
   * 0.096 of pure orange to a red channel of 0.37 at `establish` — 26% of the
   * ambient's red, from 3% of the sky's solid angle. That is what held the
   * measured avgSky saturation down at 15% while the zenith itself was 41%.
   *
   * The burn term is rescaled the other way ON PURPOSE (its exponent tracks K
   * so its ANGULAR extent is unchanged) because it is most of the night sky's
   * energy; letting it tighten with K would leave the night world lit by the
   * teal zenith alone. Its weight is 0.0464 against the old 0.058 — 20% down,
   * which is the honest consequence of a sharper horizon and is small enough
   * not to change the night's identity.
   *
   * An earlier pass used 0.62/0.38/0.10 by eye. That over-weighted the horizon
   * FOURFOLD and the wedge SEVENFOLD — the wedge occupies about 1.5% of a
   * cosine-weighted hemisphere, not 10% — so every surface in the world was
   * filled with sunset orange from every direction. Getting this integral right
   * is worth more to the colour-depth gate than anything else in this file.
   */
  _skyAverage(zen, hor, glow, out, burn, sunRad, sunElevDeg, bio, nailRad, nailElevDeg) {
    const b = burn || { x: 0, y: 0, z: 0 };
    const s = sunRad || { x: 0, y: 0, z: 0 };
    const g = bio || { x: 0, y: 0, z: 0, w: 0 };
    const n = nailRad || { x: 0, y: 0, z: 0 };
    // knobs.aureole scales uSkyP.z in the shader, so it has to scale the weight
    // here too or the ground bounce is lit by a sky this file no longer draws.
    const au = 0.0667 * (this.knobs?.aureole ?? 1) * Math.max(0, Math.sin((sunElevDeg || 0) * DEG));
    const nu = 0.000510 * Math.max(0, Math.sin((nailElevDeg || 0) * DEG));
    const mg = 0.00689 * g.w;
    out[0] = 0.9652 * zen[0] + 0.0348 * hor[0] + 0.000898 * Math.max(glow[0], 0)
           + 0.0464 * b.x + 0.0339 * g.x + mg * BIO_MAGENTA[0] + au * s.x + nu * n.x;
    out[1] = 0.9652 * zen[1] + 0.0348 * hor[1] + 0.000898 * Math.max(glow[1], 0)
           + 0.0464 * b.y + 0.0339 * g.y + mg * BIO_MAGENTA[1] + au * s.y + nu * n.y;
    out[2] = 0.9652 * zen[2] + 0.0348 * hor[2] + 0.000898 * Math.max(glow[2], 0)
           + 0.0464 * b.z + 0.0339 * g.z + mg * BIO_MAGENTA[2] + au * s.z + nu * n.z;
    return out;
  }

  setWeather(w) {
    this.weather = WEATHER[w] ? w : 'clear';
    const W = WEATHER[this.weather];
    const k = this.knobs;
    const u = this.uniforms;
    u.uCloudA.value.set(
      sat(W.cover + k.cloudCover),
      W.dens * k.cloudDensity,
      k.cloudAlt,
      k.cloudAltHigh,
    );
    u.uCloudB.value.x = sat(W.high + k.cloudCover * 0.6);
    u.uCloudC.value.set(k.cloudScale, k.cloudScaleHigh, W.murk, W.ash);
    this._sigmaScale = [W.s, W.a];
    // ROUND 12: the key now depends on the weather (KEY_DECK_TAU), so changing
    // the weather has to re-derive it. Before this line `setWeather` moved the
    // clouds and the sigmas and left `sunIrradiance` on whatever the last
    // `setTimeOfDay` computed — which, once the key is weather-aware, means a
    // mid-session storm would draw its deck and keep its clear-sky lighting.
    // Guarded on `sunElevation` because `setWeather` is also called from the
    // constructor, before the first time-of-day exists.
    if (this.sunElevation !== undefined && this.sun) {
      this._applySunTable(this.sunElevation);
      if (this.uniforms) this._updateSkyColours(this.sunElevation);
    }
    this._iblDirty = true;
    return this;
  }

  // ---------------------------------------------------------------------------
  // IBL
  // ---------------------------------------------------------------------------

  /**
   * Render the sky into a cube and PMREM it. No scene traversal, no visibility
   * toggling, no dependence on camera.far. Reuses the PMREM target in place so
   * a per-minute cloud-drift refresh does not churn GPU memory.
   */
  updateIBL() {
    const { ctx } = this;
    const prevAuto = ctx.renderer.autoClear;
    const prevTarget = ctx.renderer.getRenderTarget();
    ctx.renderer.autoClear = true;
    try {
      this.cubeCam.position.set(0, 0, 0);
      this.cubeCam.update(ctx.renderer, this._envScene);
      this.envRT = this.pmrem.fromCubemap(this.cubeRT.texture, this.envRT || null);
      ctx.scene.environment = this.envRT.texture;
      this._iblFailed = false;
    } catch (e) {
      if (!this._iblFailed) {
        this._iblFailed = true;
        console.warn('[sky] PMREM failed, falling back to a hemisphere fill:', e);
        this._installFallbackFill();
      }
    } finally {
      ctx.renderer.autoClear = prevAuto;
      ctx.renderer.setRenderTarget(prevTarget);
    }
    this._iblDirty = false;
    this._lastIbl = ctx.time.frame;
  }

  /**
   * Only ever runs if the PMREM path throws. ART §3.2 bans hemisphere fill as a
   * LOOK; it is still better than a black frame, and it is coloured from the
   * same table so the failure at least stays on-palette.
   */
  _installFallbackFill() {
    if (this.fill) return;
    const u = this.uniforms;
    this.fill = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.0);
    this.fill.color.setRGB(u.uZenith.value.x, u.uZenith.value.y, u.uZenith.value.z);
    this.fill.groundColor.setRGB(u.uGround.value.x, u.uGround.value.y, u.uGround.value.z);
    this.ctx.scene.add(this.fill);
  }

  // ---------------------------------------------------------------------------
  // aerial perspective (order 45)
  // ---------------------------------------------------------------------------

  _initAerial() {
    const { ctx } = this;
    try {
      this.rd = ctx.sys.renderer;
      this.gl = ctx.gl;

      this.aerialMat = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: SKY_VERT,
        fragmentShader: AERIAL_FRAG,
        defines: { CB_CLOUD_SHADOW: 1 },
        uniforms: Object.assign({
          uViewZ: { value: null },
          uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
          uSigmaS: { value: new THREE.Vector3() },
          uSigmaT: { value: new THREE.Vector3() },
          uAerial: { value: new THREE.Vector4(510, 600, 1 / 340, -6) },
          uGain: { value: 1 },
        }, this.uniforms),
        depthTest: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
        blendEquationAlpha: THREE.AddEquation,
        blendSrcAlpha: THREE.ZeroFactor,
        blendDstAlpha: THREE.OneFactor,
      });

      this._aScene = new THREE.Scene();
      this._aMesh = new THREE.Mesh(this._geo, this.aerialMat);
      this._aMesh.frustumCulled = false;
      this._aMesh.onBeforeRender = () => {};
      this._aScene.add(this._aMesh);
      this._aCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      this._dbFull = [this.gl.COLOR_ATTACHMENT0, this.gl.COLOR_ATTACHMENT1,
        this.gl.COLOR_ATTACHMENT2, this.gl.COLOR_ATTACHMENT3];
      this._dbMasked = [this.gl.COLOR_ATTACHMENT0, this.gl.NONE, this.gl.NONE, this.gl.NONE];

      this.pass = {
        id: 'skyAerial',
        order: 45,
        inputs: ['viewZ'],
        outputs: [],
        enabled: true,
        failed: false,
        execute: (target, gbuf, c) => {
          if (this._aerialFailed) return;
          try { this._executeAerial(gbuf, c); } catch (e) { this._disableAerial(e); }
        },
      };
      ctx.frameGraph.register(this.pass);
    } catch (e) {
      this._disableAerial(e);
    }
  }

  _disableAerial(e) {
    if (this._aerialFailed) return;
    this._aerialFailed = true;
    if (this.pass) {
      this.pass.enabled = false;
      this.pass.failed = true;
    }
    this.ctx.frameGraph?.invalidate?.();
    this.ctx.debug.stats.skyAerial = 'disabled: ' + ((e && e.message) || e);
    console.warn('[sky] aerial-perspective pass disabled:', e);
  }

  _executeAerial(gbuf, ctx) {
    // Keep the dome and the aerial pass independently testable. `sky` remains
    // the broad artistic switch; `skyAerial` is the release A/B that proves
    // this late composition pass contributes pixels in the shipping page.
    if (ctx.debug.flags.sky === false || ctx.debug.flags.skyAerial === false || this.knobs.aerial <= 0) return;
    if (!gbuf.gViewZ) return;

    // ONE source for the medium, shared with volumetrics.js. See getMedium().
    const u = this.aerialMat.uniforms;
    const m = this.getMedium();
    u.uSigmaS.value.set(m.sigmaS[0], m.sigmaS[1], m.sigmaS[2]);
    u.uSigmaT.value.set(m.sigmaT[0], m.sigmaT[1], m.sigmaT[2]);

    // Handover point. volumetrics.js owns everything inside its march; if it is
    // off, this pass covers the whole range so depth never simply disappears.
    const volOn = ctx.debug.flags.vol !== false && (ctx.debug.vol?.enabled !== false) && !!ctx.sys.volumetrics && !ctx.sys.volumetrics.failed;
    const volMax = ctx.debug.vol?.maxDist ?? 600;
    u.uAerial.value.set(volOn ? volMax * 0.85 : 30, volOn ? volMax : 90,
      1 / Math.max(20, ctx.debug.vol?.heightFalloff ?? 340), ctx.debug.vol?.floor ?? -6);
    u.uGain.value = this.knobs.aerial;

    const cam = ctx.camera;
    u.uViewZ.value = gbuf.gViewZ;
    u.uCamFwd.value.set(0, 0, -1).applyQuaternion(cam.quaternion).normalize();
    this.uniforms.uInvViewProj.value.copy(ctx.matrices.invViewProjUnjit);
    this.uniforms.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);

    const r = ctx.renderer;
    const masked = gbuf.rt === this.rd.mrt && Array.isArray(gbuf.rt?.texture) && gbuf.rt.texture.length > 1;
    r.setRenderTarget(gbuf.rt);
    if (masked) this.gl.drawBuffers(this._dbMasked);
    r.render(this._aScene, this._aCam);
    if (masked) this.gl.drawBuffers(this._dbFull);
  }

  // ---------------------------------------------------------------------------
  // published API
  // ---------------------------------------------------------------------------

  getSunDir() { return this.sunDir; }
  getSunColor() { return this.sunColor; }
  getSunIrradiance() { return this.sunIrradiance; }
  getSunElevation() { return this.sunElevation; }

  /**
   * Hemisphere-averaged sky radiance, in the same units as ART §3.3 and driven
   * by the same table this file renders from. `post/volumetrics.js` currently
   * carries its own four-key copy of these numbers (its SKY_KEYS); reading this
   * instead keeps the fog's ambient in phase with the sky at every elevation
   * rather than at four of them. Filed under `## requests`.
   */
  getSkyRadiance() { return this._avgSky || [0.6, 0.8, 0.75]; }

  /**
   * ART §3.5 sigmas for the current weather, per metre. THE ONLY PLACE THE
   * MEDIUM IS COMPUTED — the order-45 aerial pass reads it and, from round 12,
   * so does `post/volumetrics.js` for the range inside its march. Those two
   * ranges are one medium with a handover at 0.85*maxDist and they were quietly
   * running different numbers for a whole round, which is why the near haze read
   * ochre in front of a teal sky.
   *
   * `knobs.veil` scales the single-scattering albedo, holding sigmaT exactly:
   * the absorption takes up whatever the scattering gives back, so the amount of
   * obscuration at every distance is fixed and only the BRIGHTNESS of the veil
   * moves. That is the knob to sweep for contrast; it cannot change how far you
   * can see, which is what makes an A/B on it readable.
   *
   * ---- WEATHER SCALES HOW MUCH MEDIUM THERE IS, NOT WHAT IT IS MADE OF.
   * ROUND 12, and it is the reason `storm` survived the albedo fix above.
   *
   * ART §3.5 gives each weather an independent `s` and `a` multiplier, and both
   * this file and volumetrics.js applied them separately. That quietly makes the
   * ALBEDO a function of the weather, and always in the same direction, because
   * every row scales scattering harder than absorption. Measured on the round-11
   * medium, whose clear-weather albedo was already the too-bright 0.833:
   *
   *     luma(ssa)   clear 0.833   haze 0.87   spore 0.914   storm 0.906
   *
   * So the heavier the weather, the closer the veil sits to the sky's own value
   * — i.e. the frame whose entire job is to show the atmosphere is the one where
   * the atmosphere erases everything behind it. HANDOFF has the consequence
   * measured from the other end: "22x the density buys +0.034 mean luma and
   * DESTROYS 40% of the frame's colours ... the signature of in-scatter from a
   * brightly-lit sky swamping the scene."
   *
   * A storm here is more of one aerosol, not a different one. So the weather
   * multiplier becomes a single scalar on sigmaT — derived as the LUMINANCE-
   * WEIGHTED mean of ART's own `s` and `a`, so each row keeps exactly the
   * extinction magnitude the document specifies — and the albedo is held. Thick
   * weather is now thick and DARK instead of thick and bright, which is what
   * `draft` ("dark storm, low key") and `storm` were always briefed as.
   *
   *     weather multiplier on sigmaT: clear 1.00  haze 1.93  spore 3.32
   *                                   storm 4.99  rain 0.90
   *
   * (`rain` correctly lands just under 1: ART gives it a=0.5, i.e. rain washes
   * the absorbing aerosol out of the air. It is the only row that does.)
   *
   * It also closes the open HANDOFF bug that `spore` inverted the sign of the
   * chromatic extinction (sigmaT b/r 0.966, cooler distance than clear): with
   * one scalar the per-channel ratio of sigmaT cannot depend on the weather at
   * all, so whatever the palette wants distance to do, it does in all five rows.
   */
  getMedium() {
    const [ws, wa] = this._sigmaScale || [1, 1];
    const v = Math.max(0, this.knobs?.veil ?? 1);
    const sigmaS = [0, 1, 2].map(i => Math.min(SIGMA_S[i] * v, AERIAL_SIGMA_T[i] * 0.98));
    const sigmaA = [0, 1, 2].map(i => AERIAL_SIGMA_T[i] - sigmaS[i]);
    const L = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const ls = L(sigmaS), la = L(sigmaA);
    const wt = (ls + la) > 1e-12 ? (ws * ls + wa * la) / (ls + la) : 1;
    return {
      sigmaS: [0, 1, 2].map(i => sigmaS[i] * wt),
      sigmaT: [0, 1, 2].map(i => AERIAL_SIGMA_T[i] * wt),
      weatherScale: wt,
    };
  }

  onQuality(q) {
    const steps = q.preset === 'low' ? 2 : 3;
    if (this.material && this.material.defines.CB_CLOUD_SHADOW !== steps) {
      this.material.defines.CB_CLOUD_SHADOW = steps;
      this.material.needsUpdate = true;
    }
    this.sun.shadow.mapSize.set(q.shadowRes, q.shadowRes);
    this._iblDirty = true;
  }

  // NOTE main.js calls ctx.setSize() BEFORE initAll(), so this runs once with
  // no uniforms allocated. Every lifecycle hook here has to survive that.
  resize() {
    if (!this.uniforms) return;
    const { ctx } = this;
    // vertical angular size of one pixel — the Nail's minimum rendered radius
    const h = Math.max(1, Math.round(ctx.size.h * ctx.size.dpr));
    this.uniforms.uPixAngle.value = (ctx.camera.fov * DEG) / h;
  }

  update() {
    const { ctx } = this;
    const u = this.uniforms;
    if (!u) return;

    // The CPU-derived colours (disc gain, Nail, stars, burn, ground bounce) are
    // only recomputed on setTimeOfDay/setWeather. Without this, poking
    // ctx.debug.sky from the console or from a critic's A/B does nothing until
    // the next vista change, which reads as "the knob is fake".
    const k = this.knobs;
    const sig = k.exposure + k.sunDisc * 7.1 + k.nail * 13.3 + k.stars * 29.7 + k.burn * 3.7
              + k.key * 41.3 + k.chroma * 53.9 + k.iblGain * 61.7
              + k.bio * 71.3 + k.magenta * 83.9 + k.nailLight * 97.1
              + k.aureole * 103.9 + k.glow * 113.3
              + k.veil * 127.1 + k.weatherKey * 131.7;
    if (sig !== this._knobSig) {
      this._knobSig = sig;
      // _applySunTable first: `key` moves sun.intensity and the bounce, both of
      // which _updateSkyColours reads.
      this._applySunTable(this.sunElevation);
      this._updateSkyColours(this.sunElevation);
      this._iblDirty = true;
    }
    const cs = k.cloudCover + k.cloudDensity * 3.1 + k.cloudAlt * 5.9 + k.cloudAltHigh * 11.3
             + k.cloudScale * 17.7 + k.cloudScaleHigh * 23.3;
    if (cs !== this._cloudSig) { this._cloudSig = cs; this.setWeather(this.weather); }

    // wind advection + breath, in phase with every other system (ART §3.4)
    const wind = ctx.world?.wind;
    const t = ctx.time.elapsed;
    if (wind) {
      u.uCloudB.value.y = -wind.x * t * 0.0042;
      u.uCloudB.value.z = -wind.z * t * 0.0042;
    }
    const breath = ctx.world?.breath ?? 0.5;
    u.uCloudB.value.w = breath;

    // Plume columns. The rise scroll is sim time, so it is deterministic under
    // __CB.advance(); the shear tracks the same wind the decks and the foliage
    // read; the foot heat breathes with ART §3.4's one global scalar, in phase
    // with every other emitter in the world.
    const wx = wind ? Math.hypot(wind.x, wind.z) : 6.0;
    u.uPlume.value.x = this.knobs.plumes;
    u.uPlume.value.y = t * 0.085;
    u.uPlume.value.z = 0.055 + 0.020 * wx;
    u.uPlume.value.w = this.knobs.plumes * (0.18 + 0.30 * breath);

    if (u.uSkyP.value.w > 0.001) {
      // The burn fields brighten when the wind gusts and the bioluminescence
      // shuts down — same scalar, opposite sign, which is what makes the night
      // read as two competing biologies rather than one animated tint. Both
      // carry SKY_GAIN here exactly as they do in `_updateSkyColours`; the two
      // sites must stay in step or the drawn sky and the IBL disagree at every
      // frame that is not a vista change.
      const sg = SKY_GAIN * this.knobs.iblGain;
      const nightAmt = u.uSkyP.value.w;
      const bk = this.knobs.burn * nightAmt * (0.72 + 0.56 * breath) * this.knobs.exposure * sg;
      u.uBurn.value.set(BURN_GLOW[0] * bk, BURN_GLOW[1] * bk, BURN_GLOW[2] * bk);
      const gk = this.knobs.bio * nightAmt * (1.18 - 0.36 * breath) * this.knobs.exposure * sg;
      u.uBio.value.set(
        BIO_GLOW[0] * gk, BIO_GLOW[1] * gk, BIO_GLOW[2] * gk,
        this.knobs.magenta * nightAmt * 0.052 * this.knobs.exposure * sg,
      );
    }

    const interval = Math.max(30, this.knobs.iblInterval | 0);
    if (this._iblDirty || (ctx.time.frame - this._lastIbl) > interval) this.updateIBL();
  }

  lateUpdate() {
    const u = this.uniforms;
    if (!u) return;
    const m = this.ctx.matrices;
    if (m) {
      u.uViewProjUnjit.value.copy(m.viewProjUnjit);
      u.uPrevViewProjUnjit.value.copy(m.prevViewProjUnjit);
    }
  }

  debugInfo() {
    return {
      timeOfDay: +this.timeOfDay.toFixed(4),
      sunElevation: +this.sunElevation.toFixed(2),
      sunIrradiance: +this.sunIrradiance.toFixed(3),     // the key (gained)
      weatherKeyT: +(this.weatherKeyT ?? 1).toFixed(4),  // deck transmittance vs clear
      medium: (() => { const m = this.getMedium(); return {
        sigmaT: m.sigmaT.map(v => +(v * 1e3).toFixed(4)),          // per km
        ssa: m.sigmaT.map((t, i) => +(m.sigmaS[i] / Math.max(t, 1e-12)).toFixed(3)),
      }; })(),
      skyUnitIrradiance: this.skyUnitIrradiance,         // §3.1 verbatim
      sunGain: SUN_GAIN * this.knobs.key,
      skyChroma: this.knobs.chroma,
      sunColor: [this.sunColor.r, this.sunColor.g, this.sunColor.b].map(v => +v.toFixed(3)),
      nailElevation: +(this.nailElevation ?? 0).toFixed(2),
      nailIrradiance: +(this.nailIrradiance ?? 0).toFixed(4),
      nailColor: [this.nail.color.r, this.nail.color.g, this.nail.color.b].map(v => +v.toFixed(3)),
      zenith: this.uniforms.uZenith.value.toArray().map(v => +v.toFixed(3)),
      horizon: this.uniforms.uHorizon.value.toArray().map(v => +v.toFixed(3)),
      glow: this.uniforms.uGlow.value.toArray().map(v => +v.toFixed(3)),
      burn: this.uniforms.uBurn.value.toArray().map(v => +v.toFixed(4)),
      bio: this.uniforms.uBio.value.toArray().map(v => +v.toFixed(4)),
      ground: this.uniforms.uGround.value.toArray().map(v => +v.toFixed(4)),
      avgSky: (this._avgSky || []).map(v => +v.toFixed(3)),
      weather: this.weather,
      iblFailed: !!this._iblFailed,
      aerialFailed: !!this._aerialFailed,
    };
  }

  dispose() {
    this.pmrem?.dispose();
    this.cubeRT?.dispose();
    this.envRT?.dispose();
    this._geo?.dispose();
    this.material?.dispose();
    this.envMaterial?.dispose();
    this.aerialMat?.dispose();
    this.ctx.frameGraph?.unregister?.('skyAerial');
  }
}

export default Sky;
