// CURFEW — the county's ground. Manifest #4.
//
// ONE pure analytic height function is the single ground truth. The chunk meshes are
// BUILT from heightAt(); collision samples heightAt(); flora plants against heightAt();
// hitscan marches heightAt(). Nothing raycasts the terrain mesh — a Raycaster against a
// heightfield cost DUSKFALL a 125 ms shotgun hitch, and the mesh is a LOD approximation
// of this function anyway, so a mesh hit and a physics hit would disagree by up to a
// quad. (Discipline: SKYSHARD src/world/terrain.js:1-5, VIGIL src/world/terrain.js:1-4.)
//
// THIS FILE IMPORTS NO THREE, and it must stay that way. chunk-worker.js imports it, a
// Worker cannot resolve the page importmap, and world/roads.js is already three-free for
// the same reason. normalAt() therefore writes into a caller-supplied `out` and never
// constructs a Vector3 — it works with a THREE.Vector3, a Vector2-shaped {x,y,z}, or
// nothing at all.
//
// ORDERING IS LOAD-BEARING (CONTRACT manifest: terrain #4, roads #5).
//   terrain.js  imports the pure functions from roads.js and calls setRoadBaseSampler()
//               with a sampler that returns the PRE-ROAD, PRE-DETAIL height.
//   roads.js    uses that sampler in ensureRoadElevations() to place its spline, then
//               terrain.heightAt() calls roadFlatten() to pull the ground to the road.
// There is no import cycle: roads.js imports nothing from here. The injection happens at
// this module's scope (and again, guarded, in init()) so it is in place before any
// heightAt() call can reach roadFlatten().
//
// COMPOSITION of the 4 x 4 km valley:
//   broad + rolling fbm          (CFG.world.height)
//   three ridge crests           east / north / south — the walls of the valley
//   one reservoir basin          the fourth side, west: the county's low ground
//   the rim fence                past CFG.world.RIM_RADIUS the land RISES until you turn
//                                back. Never a fog wall, never an invisible collider.
//   FLATS discs                  applied INSIDE heightAt so every other system — mesh,
//                                collision, AI, placement, hitscan — gets them for free
//   road flatten                 roads.roadFlatten(), same reason
//
// heightAt() is called enormously often (every collision step, every flora candidate,
// every terrain vertex, every hitscan march sample). It allocates nothing, memoises
// nothing, and touches no state that could break determinism.

import { CFG } from '../config.js';
import { clamp, clamp01, lerp, smoothstep } from '../engine/math.js';
import {
  M0_SITES, roadFlatten, setRoadBaseSampler, ensureRoadElevations,
} from './roads.js';

/* ------------------------------------------------------------------ *
 * Noise. Deterministic value noise, allocation-free.
 * donor: Projects/vigil/src/world/terrain.js:15-27 (hash2 / vnoise), read 2026-09-02.
 * The seed is a module constant, NOT ctx.rng: the worker builds the same county on a
 * thread that never sees ctx, and a per-session seed would make the two disagree.
 * ------------------------------------------------------------------ */

const SEED = 20260902;

function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 2246822519) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz) * 2 - 1;
}

/** Plain (unwarped) fbm in [-1, 1]. GLIDE's 116 ms chunk stall was a WARPED 5-octave
 *  fbm sampled thousands of times per chunk; SPIKE-FINDINGS measured this shape at
 *  1.8 ms median instead. Do not warp it. */
function fbm2(x, z, oct, seed) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * freq, z * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;                 // non-harmonic, so octaves never phase-lock into grids
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ *
 * Landform constants.
 * ------------------------------------------------------------------ */

const H = CFG.world.height;
const RIM = CFG.world.RIM_RADIUS;          // 1900
export const WORLD_SIZE = CFG.world.SIZE;  // 4000

/** Mean elevation of the valley floor. Everything else is relative to this. */
const FLOOR_Y = 22;

// Three ridge crests, authored as line segments with a gaussian falloff. A crest is a
// LINE, not an angular sector: AFTERLIGHT ATLAS's pie-slice regions produced cliffs on
// every sector edge, and a sector-based landform has exactly the same fault.
// Peak gradient of A*exp(-(d/w)^2) is A*sqrt(2/e)/w, so 122/540 -> 0.194 (11 deg): a
// slope the county loop can climb and the car can drive.
const RIDGES = [
  { ax: 1620, az: -2100, bx: 1620, bz: 2100, amp: 122, width: 540 },   // east wall
  { ax: -2100, az: 1610, bx: 2100, bz: 1610, amp: 108, width: 520 },   // north wall
  { ax: -2100, az: -1585, bx: 2100, bz: -1585, amp: 116, width: 500 }, // south wall
];

// The fourth side. A reservoir basin: the lowest ground in the county, west of centre,
// clear of all three M0 sites and just inside the county loop's inner radius.
const BASIN = { x: -820, z: -120, r: 400, rim: 168, bedY: -4, pull: 0.86 };

// Rim fence. donor: Projects/vigil/src/world/terrain.js:59-63 —
//   if (d > PLAY_RADIUS) h += Math.min(((d - PLAY_RADIUS) / 25) ** 2 * 13, 24);
// The SHAPE is VIGIL's (a capped quadratic, so the rim reads as a valley edge with real
// sky above it rather than a fogged wall that becomes the sky). The CONSTANTS are
// rescaled from VIGIL's 82 m arena to this 1900 m county: 24 m of rise over 34 m would
// be a kerb here, and worse, at 0.4 m of climb per sprint step the player's own
// step-up rule (STEP_UP 0.52) would let them walk straight over it.
//   rise caps at d = RIM + 90*sqrt(320/240) = 2004 m, 320 m tall.
//   peak gradient 6.16 -> 0.68 m of climb per 0.11 m sprint step: the body stops.
const RIM_SCALE = 90;
const RIM_GAIN = 240;
const RIM_CAP = 320;

/* ------------------------------------------------------------------ *
 * Macro height: everything except the detail octave, the FLATS discs and the road.
 * ------------------------------------------------------------------ */

/** Squared distance from (x,z) to segment (ax,az)-(bx,bz). Allocation-free. */
function segDist(x, z, ax, az, bx, bz) {
  const ex = bx - ax, ez = bz - az;
  const len2 = ex * ex + ez * ez;
  let t = len2 > 0 ? ((x - ax) * ex + (z - az) * ez) / len2 : 0;
  t = clamp01(t);
  const dx = x - (ax + ex * t), dz = z - (az + ez * t);
  return Math.sqrt(dx * dx + dz * dz);
}

function macroHeight(x, z) {
  let h = FLOOR_Y;
  h += H.broad * fbm2(x * H.broadFreq, z * H.broadFreq, 4, SEED + 11);
  h += H.roll * fbm2(x * H.rollFreq, z * H.rollFreq, 3, SEED + 23);

  // --- the three walls -----------------------------------------------------
  // Distances first, then ONE low-frequency modulation shared by all three crests (so
  // the ridgeline has saddles and summits instead of reading as an extruded profile) —
  // and only if a crest is actually in reach. The whole valley floor, which is where
  // heightAt is called most, skips those two noise octaves entirely.
  let d0 = segDist(x, z, RIDGES[0].ax, RIDGES[0].az, RIDGES[0].bx, RIDGES[0].bz) / RIDGES[0].width;
  let d1 = segDist(x, z, RIDGES[1].ax, RIDGES[1].az, RIDGES[1].bx, RIDGES[1].bz) / RIDGES[1].width;
  let d2 = segDist(x, z, RIDGES[2].ax, RIDGES[2].az, RIDGES[2].bx, RIDGES[2].bz) / RIDGES[2].width;
  if (d0 < 3 || d1 < 3 || d2 < 3) {
    const crestMod = 0.70 + 0.30 * (0.5 + 0.5 * fbm2(x * 0.0016, z * 0.0016, 2, SEED + 37));
    if (d0 < 3) h += RIDGES[0].amp * crestMod * Math.exp(-d0 * d0);
    if (d1 < 3) h += RIDGES[1].amp * crestMod * Math.exp(-d1 * d1);
    if (d2 < 3) h += RIDGES[2].amp * crestMod * Math.exp(-d2 * d2);
  }

  // --- the fourth side: the reservoir basin --------------------------------
  const bdx = x - BASIN.x, bdz = z - BASIN.z;
  const bd = Math.sqrt(bdx * bdx + bdz * bdz);
  if (bd < BASIN.r) {
    // 1 at the middle, 0 at the lip. A dish, not a cylinder: the lip is the whole point,
    // it is what makes the basin read as water-cut ground rather than as a pit.
    const t = 1 - smoothstep(BASIN.rim, BASIN.r, bd);
    h = lerp(h, BASIN.bedY, t * BASIN.pull);
  }

  // --- the rim fence -------------------------------------------------------
  const d = Math.sqrt(x * x + z * z);
  if (d > RIM) {
    const u = (d - RIM) / RIM_SCALE;
    h += Math.min(u * u * RIM_GAIN, RIM_CAP);
  }
  return h;
}

/** The 1.2 m detail octave. Excluded from the road base on purpose (MOSSWAY's trick:
 *  road surface = smooth base + tiny noise, which is what makes a road drivable
 *  instead of corrugated — see roads.js setRoadBaseSampler's own comment). */
function detailHeight(x, z) {
  return H.detail * fbm2(x * H.detailFreq, z * H.detailFreq, 2, SEED + 53);
}

/* ------------------------------------------------------------------ *
 * FLATS — the destination pads.
 *
 * donor: Projects/qualiacology/skyshard/src/world/terrain.js:43-64 (FLATS / flatsHeight
 * and the site loop), read 2026-09-02. Same recursion: each disc's own level is sampled
 * with the EARLIER discs already applied, so an overlapping pad inherits the pad it sits
 * on instead of fighting it.
 *
 * Applied INSIDE heightAt, which is the whole reason it is here and not in a mesh
 * builder: collision, flora, the car, the AI and hitscan all get the pad for free and
 * cannot disagree with the mesh about where the yard is.
 * ------------------------------------------------------------------ */

const FLATS = [];      // { x, z, r, rim, y, id }

function applyFlats(h, x, z, upTo) {
  for (let i = 0; i < upTo; i++) {
    const f = FLATS[i];
    const dx = x - f.x, dz = z - f.z;
    const dd = Math.sqrt(dx * dx + dz * dz);
    if (dd < f.r) h = lerp(f.y, h, smoothstep(f.rim, f.r, dd));
  }
  return h;
}

// Anonymous discs get a monotonic id. It must never be derived from FLATS.length: a
// caller that registers, rolls its own discs back off the registry and registers again
// would then mint an id that already exists and the idempotency check below would eat
// the second registration silently.
let _anonFlats = 0;

/** Index of the disc with this id, or -1. The registry is a dozen entries; linear is right. */
function flatIndex(id) {
  for (let i = 0; i < FLATS.length; i++) if (FLATS[i].id === id) return i;
  return -1;
}

/**
 * Register a flattening disc. { id, x, z, radius, blend, y? }
 * `blend` is the inner fraction that is fully level (M0_SITES publishes 0.70..0.74);
 * `y` defaults to the macro height at the centre with every earlier disc applied.
 * Returns the disc's world Y so the caller can place a building on it.
 *
 * IDEMPOTENT BY ID. places.js registers nine destination pads from a constructor, and a
 * constructor can run twice (a re-init, a second lane asking for the same pad, a test
 * rebuilding the world). A duplicate disc would double-flatten the same ground and — far
 * worse — inflate the count that ready() and flatCount() report, so "how many pads exist"
 * would stop meaning "how many places have level ground". Re-registering an id is a no-op
 * that returns the pad's existing Y, so asking twice is always safe and never corrupting.
 */
export function addFlat(site) {
  const id = site.id || ('flat#' + (_anonFlats++));
  const seen = flatIndex(id);
  if (seen >= 0) return FLATS[seen].y;
  const r = Math.max(1, +site.radius || +site.r || 1);
  const blend = clamp(site.blend !== undefined ? +site.blend : 0.72, 0.05, 0.98);
  const y = site.y !== undefined ? +site.y
    : applyFlats(macroHeight(site.x, site.z), site.x, site.z, FLATS.length);
  FLATS.push({ id, x: +site.x, z: +site.z, r, rim: r * blend, y });
  return y;
}

// Seeded from M0_SITES — roads.js authors the destination list and two of the three sites
// ARE road control points, so "every destination has a road within 40 m" holds by
// construction. The pad and the road therefore agree about the ground.
for (let i = 0; i < M0_SITES.length; i++) addFlat(M0_SITES[i]);

/**
 * Install discs VERBATIM, by id, exactly as another realm's registry holds them.
 *
 * THE CHUNK WORKER'S ONLY DOOR, and the reason it exists: this module keeps FLATS in module
 * state, and world/chunk-worker.js imports its own copy of this module into the Worker realm.
 * That copy is seeded from M0_SITES and nothing else — it cannot see the fourteen destination
 * pads places.js registers on the main thread during init. The worker therefore built its
 * vertices off UNFLATTENED ground while collision, which is always main-thread heightAt, used
 * the pads. Whichever builder happened to win a chunk decided whether its ground was right.
 *
 * Values are copied, never recomputed: addFlat() would re-derive `y` and `rim` and the two
 * realms could round differently, which is the one thing this must not do.
 */
export function adoptFlats(list) {
  if (!Array.isArray(list)) return FLATS.length;
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    if (!f || typeof f.id !== 'string') continue;
    const rec = { id: f.id, x: +f.x, z: +f.z, r: +f.r, rim: +f.rim, y: +f.y };
    const seen = flatIndex(f.id);
    if (seen >= 0) FLATS[seen] = rec; else FLATS.push(rec);
  }
  return FLATS.length;
}

/** Read-only view of the disc registry (M1 will add interiors and monuments). */
export function flats() { return FLATS; }

/** How many discs are registered. Ask this, never `flats().length` — the array is the
 *  registry itself and a sibling counting it (or truncating it) is reaching inside this
 *  module's state. `has(id)` answers "is MY pad in there" without counting at all. */
export function flatCount() { return FLATS.length; }

/** True if a disc with this id is registered. */
export function hasFlat(id) { return flatIndex(id) >= 0; }

/** World Y of a named site's pad, or null. */
export function siteY(id) {
  for (let i = 0; i < FLATS.length; i++) if (FLATS[i].id === id) return FLATS[i].y;
  return null;
}

/* ------------------------------------------------------------------ *
 * Road base injection. See the header: this is the ordering contract.
 * ------------------------------------------------------------------ */

/** The PRE-ROAD, PRE-DETAIL ground: macro + FLATS. roads.js smooths its spline over
 *  this, which is why a road never inherits the 1.2 m detail octave's corrugation. */
function roadBase(x, z) {
  return applyFlats(macroHeight(x, z), x, z, FLATS.length);
}

let roadBaseInstalled = false;
/** Idempotent. Called at module scope (so no heightAt() can beat it to roadFlatten) and
 *  again from Terrain.init() (so the manifest ordering is explicit in the code). */
function installRoadBase() {
  if (roadBaseInstalled) return;
  roadBaseInstalled = true;
  setRoadBaseSampler(roadBase);
}
installRoadBase();

/* ------------------------------------------------------------------ *
 * THE interface (docs/CONTRACT.md).
 * ------------------------------------------------------------------ */

/** Metres. Pure, deterministic, allocation-free, finite everywhere on the plane. */
export function heightAt(x, z) {
  let h = applyFlats(macroHeight(x, z) + detailHeight(x, z), x, z, FLATS.length);
  const rf = roadFlatten(x, z);
  if (rf.blend > 0) h = lerp(h, rf.y, rf.blend);
  return h;
}

// Central-difference epsilon. 0.75 m is under the finest quad (1.6 m) so the gradient
// tracks the mesh the player is standing on, and wide enough that the detail octave
// (period ~18 m) does not alias into it.
const GRAD_E = 0.75;

/** 0..1, where 0 is level and 1 is vertical. 1 - normal.y, so flora's SLOPE_REJECT of
 *  0.62 means "steeper than 68 degrees" and its grass cutoff 0.42 means "steeper than
 *  55 degrees". */
export function slopeAt(x, z) {
  const hx = (heightAt(x + GRAD_E, z) - heightAt(x - GRAD_E, z)) / (2 * GRAD_E);
  const hz = (heightAt(x, z + GRAD_E) - heightAt(x, z - GRAD_E)) / (2 * GRAD_E);
  return 1 - 1 / Math.sqrt(hx * hx + hz * hz + 1);
}

const _n = { x: 0, y: 1, z: 0 };

/** Unit up-normal. Writes into `out` (THREE.Vector3 or anything with .set or x/y/z) and
 *  returns it; with no `out` it returns a shared scratch object — copy, never retain. */
export function normalAt(x, z, out) {
  const hx = (heightAt(x + GRAD_E, z) - heightAt(x - GRAD_E, z)) / (2 * GRAD_E);
  const hz = (heightAt(x, z + GRAD_E) - heightAt(x, z - GRAD_E)) / (2 * GRAD_E);
  const inv = 1 / Math.sqrt(hx * hx + hz * hz + 1);
  const nx = -hx * inv, ny = inv, nz = -hz * inv;
  if (!out) { _n.x = nx; _n.y = ny; _n.z = nz; return _n; }
  if (typeof out.set === 'function') out.set(nx, ny, nz);
  else { out.x = nx; out.y = ny; out.z = nz; }
  return out;
}

/* ------------------------------------------------------------------ *
 * groundDetail — the ground's MATERIAL identity, as a pure function of world position.
 *
 * ART.md 3.1.1 measured the whole visible floor of a 4 km county at a p05..p95 spread of
 * 13.9 luminance points and called it what it is: "a single flat navy sheet ... nothing to
 * say what you are walking on". The mean (38.7) was already right, and row 6 of ART.md 0.3
 * marks the ground DO NOT DARKEN, so the fix is variation and never exposure.
 *
 * It is a FUNCTION OF WORLD POSITION and nothing else — no chunk index, no build order, no
 * clock. That is not tidiness, it is the whole requirement: chunks.js rebuilds a chunk
 * whenever it re-tiers, and a break-up keyed to anything but world x/z would repaint the
 * ground under the player's feet every time the streaming ring moved. This shimmers by
 * construction if it is written any other way, so it is written here, once.
 *
 * Three octaves, not the two ART.md 3.1.1 names, and the third is the one that carries the
 * gate. The named 1.5 m and 6 m wavelengths are correct for what the ground feels like
 * underfoot, but a chunk vertex at tier 0 sits every 1.6 m, so the 1.5 m octave lands as
 * per-vertex grain and the 6 m octave averages out across the tens of metres of floor a
 * frame actually sees. The gate (spread >= 26) is measured over the whole visible ground,
 * and only a wavelength longer than the view can move it: PATCH_M puts dry and damp
 * ground in stretches you can see the edge of. Measured contribution in docs/HANDOFF.md.
 *
 * Returns roughly [-1, 1], centred on 0, so a caller multiplies by (1 + amp * detail) and
 * the county mean is unchanged by construction.
 * ------------------------------------------------------------------ */

// THESE THREE NUMBERS SURVIVED AN ATTEMPT TO CHANGE THEM, 2026-09-02. Do not repeat it
// without re-reading this, because the argument for changing them is a good one and it is
// wrong.
//
// The argument: a tier-0 chunk vertex sits every 1.6 m (CFG.world.tiers[0].quad), so the
// 1.5 m octave is sampled at its own period. It cannot become the shape it names — it
// aliases. Nearly a third of the break-up therefore looked like it was being spent on
// something the mesh physically cannot draw, and the obvious repair is to move that weight
// to 19 m and 68 m, wavelengths the frame can resolve at forty metres.
//
// Measured, A/B on ctx.debug.flags.flatGround inside one boot, standing on the county loop
// at (-1174.9, -569.2) where the floor is 28.6% of the frame and there is no place apron:
//
//   octaves                     albedo spread   near-ground sd, shaded vs flat
//   1.5 / 6 / 23 (shipped)          0.983         20.45 vs 18.56   (+1.89)
//   4.5 / 19 / 68 (the repair)      0.950         18.32 vs 17.89   (+0.43)
//
// The repair lost three quarters of the only on-screen contribution the break-up makes.
// The aliasing is real and it is the POINT: sampled at 1.6 m, a 1.5 m octave becomes
// per-vertex variation, and per-vertex variation on a 1.6 m quad grid is exactly the
// mottle you read as ground under your boots at four metres. A 68 m sweep is honest at
// forty metres and invisible: a deliberate +-45% sinusoid at 70 m, painted straight into
// the colour attribute of all 131 resident ground meshes, moved the near-ground sd by 0.34
// out of 24 (tests/shots/lane3b-wave-off.png / -on.png — open them, they are the same
// picture). The floor's on-screen value is dominated by cast shadow, distance and fog; no
// tasteful albedo wavelength longer than the view competes with that.
//
// So the weights stay as ART.md 3.1.1 wrote them. What the break-up cannot do is move
// ART.md gate row 7, and the reason is in docs/HANDOFF.md, not in this function.
const DETAIL_FINE_M = 1.5;    // ART.md 3.1.1's first wavelength — and see the note above
const DETAIL_MID_M = 6.0;     // ART.md 3.1.1's second
const DETAIL_PATCH_M = 23.0;  // the longest wavelength that still reads as ground

export function groundDetail(x, z) {
  return 0.30 * vnoise(x / DETAIL_FINE_M, z / DETAIL_FINE_M, SEED + 311)
    + 0.32 * vnoise(x / DETAIL_MID_M, z / DETAIL_MID_M, SEED + 419)
    + 0.38 * vnoise(x / DETAIL_PATCH_M, z / DETAIL_PATCH_M, SEED + 523);
}

/* ------------------------------------------------------------------ *
 * regionAt — a 2-D field of MOISTURE x ELEVATION with blended weights.
 *
 * NOT angular pie slices. SKYSHARD's regions.js:8-14 keys each land to an angular sector
 * around the island centre; AFTERLIGHT ATLAS did the same and every sector edge became a
 * cliff, because two neighbouring sectors drove two different height terms. Here the
 * field is two smooth scalars and the weights are gaussian kernels around four points in
 * that plane, normalised — so the weights are continuous everywhere and no border can be
 * a discontinuity even in principle.
 * ------------------------------------------------------------------ */

export const REGIONS = [
  // ground / cliff are LINEAR-space albedos, doubled from the first authored pass after
  // measurement. They started at the very floor of DESIGN section 8's 0.018-0.62 range,
  // which is FETCH's palette - and FETCH grades its albedos below a lantern the player
  // always carries. CURFEW's key light at M0 is the moon, so the same numbers rendered a
  // void: 98% of the lower frame under luminance 8. The grade cannot lift what the
  // albedo never reflected.
  //
  // ART.md 3.1.3, 2026-09-02: marsh and pines were within 4% of the same value, so two of
  // the county's four regions were one region as far as a player's eye was concerned. The
  // four are now a LADDER at roughly 1.4x per rung - marsh 0.055, pines 0.096, ridge
  // 0.136, fields 0.175 in the green channel - because "four regions must be four values a
  // player can name in a greyscale screenshot". Marsh went DOWN and fields went UP, so the
  // county mean is unmoved: ART.md 0.3 row 6 marks the ground "do not darken", and it is
  // the SPREAD that was missing, never the exposure.
  { id: 0, key: 'pines', moisture: 0.55, elevation: 0.35, bias: 1.30, ground: [0.096, 0.116, 0.08], cliff: [0.116, 0.108, 0.096] },
  { id: 1, key: 'fields', moisture: 0.22, elevation: 0.30, bias: 1.00, ground: [0.175, 0.166, 0.112], cliff: [0.150, 0.138, 0.112] },
  { id: 2, key: 'marsh', moisture: 0.86, elevation: 0.10, bias: 0.95, ground: [0.055, 0.068, 0.066], cliff: [0.070, 0.076, 0.074] },
  { id: 3, key: 'ridge', moisture: 0.45, elevation: 0.86, bias: 1.05, ground: [0.136, 0.132, 0.128], cliff: [0.148, 0.142, 0.136] },
];
export const REGION_COUNT = REGIONS.length;

const SIG_M = 0.30;    // moisture kernel width
const SIG_E = 0.32;    // elevation kernel width
const ELEV_LO = -6;    // heights below this read as fully "low"
const ELEV_HI = 150;   // and above this as fully "high"

/** Moisture 0..1 at (x,z): a low-frequency fbm, wetted toward the reservoir basin. */
export function moistureAt(x, z) {
  let m = 0.5 + 0.5 * fbm2(x * 0.0016, z * 0.0016, 3, SEED + 71);
  const dx = x - BASIN.x, dz = z - BASIN.z;
  const bd = Math.sqrt(dx * dx + dz * dz);
  m += 0.40 * (1 - smoothstep(BASIN.r * 0.5, BASIN.r * 2.3, bd));
  return clamp01(m);
}

/**
 * Blended region weights, normalised to sum 1, written into `out` (any indexable of
 * length >= REGION_COUNT). `h` is the height at (x,z); pass it if you already have it —
 * the terrain builder does, and it halves the cost of colouring a vertex.
 */
export function regionWeights(x, z, h, out) {
  const m = moistureAt(x, z);
  const e = clamp01((h - ELEV_LO) / (ELEV_HI - ELEV_LO));
  let total = 0;
  for (let i = 0; i < REGION_COUNT; i++) {
    const R = REGIONS[i];
    const dm = (m - R.moisture) / SIG_M;
    const de = (e - R.elevation) / SIG_E;
    const w = R.bias * Math.exp(-(dm * dm + de * de));
    out[i] = w;
    total += w;
  }
  const inv = total > 1e-9 ? 1 / total : 0;
  for (let i = 0; i < REGION_COUNT; i++) out[i] *= inv;
  return out;
}

// Shared scratch. Reused on every call — consume it before querying again.
const _regionW = new Float64Array(REGION_COUNT);
const _region = { id: 0, key: 'pines', weights: _regionW, moisture: 0, elevation: 0 };

/** { id, weights } per CONTRACT. `id` is the DOMINANT region as a number (flora.js reads
 *  `r.id` and requires a number); `weights` is the blended field. Shared scratch. */
export function regionAt(x, z) {
  const h = heightAt(x, z);
  regionWeights(x, z, h, _regionW);
  let best = 0;
  for (let i = 1; i < REGION_COUNT; i++) if (_regionW[i] > _regionW[best]) best = i;
  _region.id = REGIONS[best].id;
  _region.key = REGIONS[best].key;
  _region.moisture = moistureAt(x, z);
  _region.elevation = h;
  return _region;
}

/* ------------------------------------------------------------------ *
 * marchRay — hitscan against the ground.
 *
 * Adaptive march plus bisection against the height function. NOTHING may raycast the
 * terrain mesh: DUSKFALL's shotgun fired eight Raycaster pellets at a heightfield and
 * paid a 125 ms hitch for it, and the mesh is only a per-tier approximation of this
 * function so the two would disagree anyway.
 *
 * The march step is proportional to the current clearance (a conservative sphere-trace)
 * with a floor, so a ray skimming just above the ground still terminates: the iteration
 * count is hard-bounded and an exhausted march returns null rather than looping.
 * ------------------------------------------------------------------ */

const MARCH_MIN_STEP = 0.5;
const MARCH_MAX_STEP = 20;
const MARCH_SLOPE_GUARD = 0.5;   // terrain gradient reaches ~6 at the rim; 0.5 is safe
const MARCH_MAX_ITERS = 512;
const BISECT_ITERS = 20;

/** Distance in metres to the first ground intersection along a UNIT direction, or null.
 *  Returns 0 when the origin is already below the ground. */
export function marchRay(ox, oy, oz, dx, dy, dz, maxT) {
  const far = Math.min(maxT !== undefined ? maxT : 900, 4000);
  if (!(far > 0)) return null;

  let prevT = 0;
  let prevD = oy - heightAt(ox, oz);
  if (prevD <= 0) return 0;

  let t = 0;
  for (let i = 0; i < MARCH_MAX_ITERS; i++) {
    let step = prevD * MARCH_SLOPE_GUARD;
    if (step < MARCH_MIN_STEP) step = MARCH_MIN_STEP;
    else if (step > MARCH_MAX_STEP) step = MARCH_MAX_STEP;
    t = prevT + step;
    if (t >= far) {
      // Test the endpoint itself so a hit in the last partial step is not missed.
      const dEnd = (oy + dy * far) - heightAt(ox + dx * far, oz + dz * far);
      if (dEnd >= 0) return null;
      t = far;
    }
    const d = (oy + dy * t) - heightAt(ox + dx * t, oz + dz * t);
    if (d < 0) {
      let lo = prevT, hi = t;
      for (let k = 0; k < BISECT_ITERS; k++) {
        const mid = (lo + hi) * 0.5;
        const dm = (oy + dy * mid) - heightAt(ox + dx * mid, oz + dz * mid);
        if (dm < 0) hi = mid; else lo = mid;
      }
      return hi;
    }
    if (t >= far) return null;
    prevT = t; prevD = d;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * The system.
 * ------------------------------------------------------------------ */

export class Terrain {
  static id = 'terrain';

  constructor(ctx) {
    this.ctx = ctx;
    this.SIZE = CFG.world.SIZE;
    this.RIM = RIM;
    this.regions = REGIONS;
    // player/controller.js:310 reads terrain.playerStart. The filling station pad at the
    // end of the west gravel spur: level ground (it is a FLATS disc), beside a road, and
    // ~470 m from the county centre so the loop is a short walk in any direction.
    //
    // THE OFFSET IS NOT ARBITRARY, AND IT IS THE FIX FOR ART.md GATE ROW 19.
    //
    // Row 19 ("road crown : off-road ground >= 1.6") has read "n/a (0 px)" through three
    // rounds, and the previous round's diagnosis — inverted ribbon normals, a bank that
    // pushed a third of the ribbon under the terrain — was right, was fixed, and measured
    // 1.80 at a pose ON the county loop. It still read 0 px in frame A. Measured here
    // 2026-09-02, with the ribbon forced emissive red, depthTest OFF and renderOrder 9999
    // so nothing could hide it:
    //
    //   old start (+11, +7) = (-509, 247):  0 road pixels. Not occluded — ABSENT.
    //     The camera spawns at yaw 0 (camera.js:76, forward -Z). The west spur is an
    //     east-west dead end at the pad centre, so the nearest ribbon vertex sits 12.0 m
    //     away at 67.1 degrees off the view axis, and the most nearly straight-ahead
    //     vertex within 250 m is at 49.5 degrees — the frustum's own half-angle is 50.2.
    //     Frame D (six seconds forward) walks AWAY from it: 151 degrees, still 0 px.
    //   new start (+6, +18) = (-514, 258):  8,744 road pixels (1.08% of the frame),
    //     crown : off-road ground 1.97 over 76 screen rows, road mean 41.7 against a floor
    //     of 29.6. Same pad Y (16.43), slope 0.0000 — 26 m from the disc centre, inside
    //     the 27.4 m fully level core, so the ground under the player did not move at all.
    //
    // At the time of this measurement there was no minimap; Round 8 later added one. Roads
    // and physical landmarks still have to work as world-space wayfinding, and until this
    // line the player booted into a county whose only road was behind their shoulder. The lit
    // station canopy now reads dead ahead and the spur runs away west across the lower frame.
    //
    // If a later round wants the old pose back, the honest fix is a spawn HEADING —
    // camera.js:76 hardcodes `this.yaw = 0` and terrain has no way to ask for another. See
    // the request in docs/HANDOFF.md.
    this.playerStart = { x: M0_SITES[1].x + 6, z: M0_SITES[1].z + 18 };
  }

  async init() {
    // The ordering contract, stated where the manifest can see it. Guarded: the module
    // scope already installed the sampler, because heightAt() must be correct from the
    // first call and another system's constructor may beat init() to it.
    installRoadBase();
    // Force the spline elevation table now, at boot, so no gameplay frame ever pays the
    // one-off cost inside a heightAt(). Roads.init() calls this again and it early-outs.
    ensureRoadElevations();
  }

  step() { /* the ground is analytic and timeless; there is nothing to advance */ }

  // --- the CONTRACT interface, forwarded ------------------------------------
  heightAt(x, z) { return heightAt(x, z); }
  slopeAt(x, z) { return slopeAt(x, z); }
  normalAt(x, z, out) { return normalAt(x, z, out); }
  regionAt(x, z) { return regionAt(x, z); }
  marchRay(ox, oy, oz, dx, dy, dz, maxT) { return marchRay(ox, oy, oz, dx, dy, dz, maxT); }

  // --- extras other owners may find useful ----------------------------------
  regionWeights(x, z, h, out) { return regionWeights(x, z, h, out); }
  moistureAt(x, z) { return moistureAt(x, z); }
  flats() { return FLATS; }
  flatCount() { return FLATS.length; }
  hasFlat(id) { return hasFlat(id); }
  addFlat(site) { return addFlat(site); }
  siteY(id) { return siteY(id); }
  /** Metres of ground clearance at a world point; negative means inside the hill. */
  clearanceAt(x, y, z) { return y - heightAt(x, z); }
  /** True once past the rim's crest, where the fence has capped and the land plateaus. */
  beyondRim(x, z) { return Math.sqrt(x * x + z * z) > RIM + RIM_SCALE * Math.sqrt(RIM_CAP / RIM_GAIN); }

  state() {
    const p = this.playerStart;
    return { seed: SEED, flats: FLATS.length, regions: REGION_COUNT, start: [p.x, p.z] };
  }

  ready() {
    // A LOWER BOUND, never an equality. The M0 sites are the discs this module seeds for
    // itself and they must all be there; anyone else's pads are a surplus, not a fault.
    // As an equality this line failed the whole of M1: places.js registers nine
    // destination pads through addFlat() and then asks ready(), got false, and rolled its
    // own discs back off the registry — so the cathedral, the relay, the chapel, the
    // lighthouse and the mill all stood on raw hillside. places.js measured it: 0.07 m of
    // relief inside an 18 m footprint with the pads, up to 7.44 m without. A guard that
    // fails in the "safe" direction still shipped a cathedral on a slope.
    if (!roadBaseInstalled || FLATS.length < M0_SITES.length) return false;
    // Genuine wiring check: heightAt must be finite at the origin, at a site pad, and
    // out past the rim. A NaN in any of those puts the player under the world.
    const a = heightAt(0, 0);
    const b = heightAt(FLATS[0].x, FLATS[0].z);
    const c = heightAt(RIM + 300, 0);
    return Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && c > a;
  }

  dispose() { }
}

export default Terrain;
