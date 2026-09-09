// CURFEW — the chunk streamer. Manifest #7.
//
// 64 m chunks keyed `${cx}|${cz}`, three terrain LOD tiers with a skirt on every chunk,
// a build queue biased toward where you are GOING, a hide-before-dispose ring, and the
// two bus events the rest of the world hangs off.
//
// FOUR THINGS THIS FILE EXISTS TO GET RIGHT, each of them a receipt from a shipped game:
//
//  1. IT DISPOSES. SKYSHARD only ever set far chunks invisible and its geometry count
//     grew monotonically for as long as you walked. Here a chunk past ring+2 has its
//     geometry disposed and its collider bucket dropped, and tests/perf.mjs asserts
//     bounded renderer.info.memory.geometries over a 45 s sprint.
//  2. IT ANNOUNCES. flora.js listens for 'chunk:built' and will self-stream its own
//     fallback ring if nothing arrives within 1.5 s. That fallback firing is a FAILURE,
//     not a feature, so the boot ring is built synchronously inside init() — before
//     flora is even constructed — and flora's init() sweep of forEachResident finds a
//     county already standing.
//  3. THE ROAD RIBBON IS NAMED SO THE COLLIDER BAKE SKIPS IT. VANTA//9's
//     traversalColliderRole (donors/vanta9/vanta-engine.ts:1264-1274, read 2026-09-02)
//     returns null for its route ribbons because "a single geometry AABB would turn the
//     whole winding route into a giant wall". collision.js already carries the matching
//     rejection (NON_PHYSICAL_NAME at collision.js:77 matches /^road[-_ .0-9]/), so the
//     mesh is named 'road-ribbon:<key>' and flagged userData.nonPhysical. Nothing bakes
//     meshes in M0 — flora emits its colliders inside its planting loop — so this is
//     belt and braces, and it is the cheapest brace in the project.
//  4. IT NEVER STALLS ON THE WORKER. chunk-worker.js is a pure ACCELERATOR: nothing is
//     dispatched to it until it answers a handshake, a dispatched chunk stays in the
//     queue and is built on the main thread if the worker has not answered in 90 frames,
//     and if the Worker constructor throws the streamer simply never notices. GLIDE's
//     116 ms chunk stall is the reason a worker is wanted; a hung worker that silently
//     stops the world is the reason it can never be load-bearing.
//
//  5. IT CAN BE MADE DETERMINISTIC. Interactive play spends a millisecond budget, which
//     means the work a fixed step does depends on the machine. Set
//     ctx.debug.flags.deterministicChunks and the budget becomes a fixed COUNT per step
//     with no clock read and no worker — see DET_BUILDS_PER_STEP.
//
// MEASURED ON THIS MACHINE, 2026-09-02, node, warm (numbers in docs/HANDOFF.md):
//   tier-0 chunk, open ground  1.63 ms   |  tier-1  0.61 ms  |  tier-2  0.06 ms
//   tier-0 chunk, road crossing 8.4 ms (5% of the county; see HANDOFF)

import * as THREE from 'three';
import { CFG } from '../config.js';
import { buildChunkData, TIERS, MAX_CHUNK_SEG } from './chunk-worker.js';
import { groundDetail, frostAt, heightAt, normalAt, flats, flatCount } from './terrain.js';

const CHUNK = CFG.world.CHUNK;                       // 64 m

// Full residency out to here. See docs/HANDOFF.md for why this is not
// CFG.world.tiers[2].radius: at CFG.world.fog.density 0.0075, FogExp2 leaves 0.6% of a
// surface visible at 300 m and 1e-5 at 450 m, so ground past ~400 m cannot be seen at
// all — and a 2500 m ring is 4,800 resident chunks, which is 4,800 draw calls against a
// 750 budget. This is the ring SPIKE-FINDINGS measured (ring 6, 416 m, 2.4 ms/frame).
// M0 is on foot: fog.farWalk 300 + one chunk of margin. The car (fog.farDrive 520) is
// M1's, and widens it with setViewRing() rather than by editing this line.
const DEFAULT_RING_M = CFG.world.fog.farWalk + CHUNK;

const HIDE_BAND_M = CHUNK * 2;      // hidden between ring and ring+2, disposed past it
const BUDGET_MS = CFG.world.buildBudgetMs;           // 3
const MAX_SYNC_PER_FRAME = 4;
const MAX_FINALIZE_PER_FRAME = 8;
const MAX_ACTIVATE_PER_FRAME = 8;
const WORKER_INFLIGHT = 4;
const STALE_FRAMES = 90;            // ~1.5 s: the same patience flora gives us
const LEAD_S = 2.0;                 // queue sorted toward pos + vel*2s

// DETERMINISTIC MODE — ctx.debug.flags.deterministicChunks.
// The wall clock inside step() is right for interactive play (spend the frame you have,
// no more) and wrong for anything that has to REPRODUCE: with a millisecond budget the
// number of chunks a fixed step produces depends on the machine, on thermal state, and on
// whether the step came from a real frame or from a headless __CURFEW.step(). That made
// the streamer the one non-deterministic part of a simulation whose whole discipline is
// that a fixed step is a fixed step. Under the flag the budget becomes a COUNT: exactly
// this many synchronous builds per step, no clock read, and no worker dispatch (a worker
// answers when it answers, which is the same non-determinism arriving by another door).
// Four is the interactive cap too, so a deterministic step matches an unloaded frame.
const DET_BUILDS_PER_STEP = 4;

const nowMs = (typeof performance !== 'undefined' && performance && typeof performance.now === 'function')
  ? () => performance.now()
  : () => Date.now();

// Reused bus payloads. Same convention weapons.js uses for weapon:fire / weapon:hit:
// consume synchronously, retain nothing. flora.js's listeners read .cx/.cz/.id and
// return, which is the whole contract.
const _built = { id: '', cx: 0, cz: 0 };
const _dropped = { id: '', cx: 0, cz: 0 };

/* ------------------------------------------------------------------ *
 * ART.md 3 — THE GROUND'S MATERIAL IDENTITY AND THE ROAD.
 *
 * Two measured faults, both of them "working but illegible":
 *
 *  3.1 the whole visible floor of a 4 km county measured a p05..p95 spread of 13.9
 *      luminance points. A surface with no variation is a stage floor, and the screenshot
 *      showed exactly that: one flat navy sheet. The mean (38.7) was already right and
 *      ART.md 0.3 row 6 marks it DO NOT DARKEN, so everything below is VARIATION and
 *      nothing below is exposure.
 *  3.2 the road contributed ZERO measurable pixels. At that measured point there was no
 *      minimap; Round 8 later added one, but roads, physical landmarks and the map board remain
 *      the world-space wayfinding system, and the road itself was not on screen.
 *
 * Everything here rides the vertex-colour channel that already exists plus ONE 128x256
 * profile texture on the road material, so it costs zero draws and zero shader programs
 * (measured 64 before and 64 after — CFG.render.budget.programsMax is the budget and it
 * did not move). And every term is a pure function of WORLD POSITION: a chunk is rebuilt
 * whenever it re-tiers, so a break-up keyed to anything else would repaint the ground
 * under the player's feet each time the streaming ring moved.
 * ------------------------------------------------------------------ */

// Value break-up. terrain.groundDetail() is the field (three octaves, world-space); this
// is how hard it is pushed. Sweep measured on frame R (standing on the county loop, the
// only canonical pose where chunk ground is most of the floor rather than a place apron):
// see docs/HANDOFF.md.
const DETAIL_AMP = 0.55;

// Curvature, from the analytic normals the builder already produced — free ambient
// occlusion with no extra height samples. Hollows collect shadow and water; crowns catch
// the moon. This is NOT ART.md 3.1.2's trunk-root darkening, which needs flora to publish
// its planted positions to the chunk builder (see the request in docs/HANDOFF.md); it is
// the half of "the cheapest depth cue in the game" that this lane can pay for on its own.
const AO_GAIN = 0.34;       // a hollow darkens by up to 34%
const CROWN_GAIN = 0.16;    // a convexity lifts by up to 16%
const AO_K = 4.0;           // normal divergence that saturates the term
const WET_GAIN = 0.20;      // and the same hollow goes COOL: standing water is sky-coloured
// ROUND 18: frost. See CFG.world.frost for what each of these is, and why the colour is cold
// rather than white. Read once here so the per-vertex loop never touches CFG.
const FROST = CFG.world.frost ? CFG.world.frost.colour : [0.15, 0.164, 0.188];
const FROST_AMOUNT = CFG.world.frost ? CFG.world.frost.amount : 0;
const FROST_HOLLOW = CFG.world.frost ? CFG.world.frost.hollowBias : 0.5;
// Curvature needs the four grid neighbours, and a chunk's edge vertex has none outside it.
// Clamping there would put a one-vertex ridge along every 64 m border; instead the term
// fades to exactly 0 at the border, so two neighbouring chunks — at the same tier or at
// different ones — agree on their shared edge by construction.
const AO_FADE_QUADS = 3;
const SHADE_FLOOR = 0.15;   // no multiplier may take a region albedo to black

// ROUND 7 — THE CANOPY ON THE FLOOR. ART 3.1.2's trunk-root darkening, which the note above
// says "needs flora to publish its planted positions to the chunk builder". It does not. What
// a forest floor at night actually wants is not a ring under each trunk, it is the LARGE-SCALE
// answer to "is there a canopy over me" — and flora already publishes that as a pure
// deterministic field, `coverAt(x, z)`, the same smoothstep-of-fbm it plants its own stands
// from (flora.js coverAt). So the two agree by construction: where flora put a dense stand the
// floor under it is dark, and where it left a clearing the floor is open to the moon.
//
// This is the term ART 3.1 row 6 was asking for. The ground is 25.6% of the frame and it was
// the only large area in it with no value structure at all — one flat sheet at mean 38.7 with
// a +-10% grain nobody can see at that mean. Lane E, round 7, after the sky, the fog, the mist
// and the trunk lean were all in: "the ground is the only large area in the frame with nothing
// on it." A clearing that reads as brighter than the stand around it is also, for free, the
// wayfinding cue his brief asks for twice — "there should always be something interesting the
// player is going towards in the distance."
//
// Cost: one coverAt per ground vertex, 1,681 on a tier-0 chunk, at build time only. Nothing in
// step(). Sampled at the vertex, so it costs no texture, no draw call and no program.
const CANOPY_AO = 0.48;     // a dense stand darkens its floor by up to 48% (ROUND 13: was 42%;
                            // the darker-forest ask is met under the trees, not in the clearings.
                            // 0.52 measured a night canopy floor p50 of 7.7 luma, under the 8 gate;
                            // 0.48 keeps the floor in the 8-10 band ART.md 1.3 asks for)
const CANOPY_WARM = 0.10;   // and goes slightly warm: needles, not sky. Blue only, downward.

/* ------------------------------------------------------------------ *
 * ROUND 16 — WHAT IS UNDER YOUR BOOTS.
 *
 * Everything above this line is PER VERTEX, and a tier-0 vertex sits every 1.6 m. Stand
 * still and look down and the finest thing the county could draw was a 1.6 m quad of one
 * flat colour: no grit, no gravel, no wet stone, nothing at the scale a foot occupies. It
 * is the most obviously untextured surface in the game and no amount of vertex work can
 * reach it, because the mesh has no vertices there to carry it.
 *
 * So: ONE tiling detail map on the ONE shared matGround, sampled from WORLD POSITION in
 * the shader. Three constraints shaped every choice here.
 *
 *  - THE BUILDER EMITS NO `uv` ATTRIBUTE and must not start: the payload is a transfer
 *    list shared with a Worker and adding an attribute changes that contract. The UV is
 *    therefore derived in the vertex shader from (modelMatrix * position).xz, which is
 *    exact — chunk meshes carry a pure translation — and costs one mat4 multiply.
 *  - ONE PROGRAM, AND NO NEW ONES. matGround is a single shared instance across all three
 *    LOD tiers, so there is only one program to begin with; customProgramCacheKey pins it
 *    so it stays that way even if a future tier wanted its own material. MEASURED, live,
 *    with the map in, over three boots: 72-75 at ready, 75 after entering the world, and
 *    still 75 after fourteen poses and three full rebuildAll()s — the same 75 this project
 *    has carried all round, against a CFG.render.budget.programsMax of 78, and
 *    tests/smoke.mjs passes 12/0 reporting 75. NOTHING links during play. Two of the 75
 *    carry the curfew-ground-1 key and
 *    that is NOT a split by tier: their cache keys differ only in the output colour space
 *    (`srgb` and `srgb-linear`), which is the post chain's target versus the canvas, and
 *    both existed before this map did.
 *  - IT MUST NOT DARKEN. ART.md 0.3 row 6 marks the ground DO NOT DARKEN, and a symmetric
 *    multiplier is not enough to satisfy that: the tone curve is concave, so equal
 *    excursions up and down lose mean luminance. The gains are asymmetric instead, and the
 *    A/B measures the frame mean going UP with the map on — see GROUND_AMP_UP.
 *
 * TWO LAYERS AT DIFFERENT SCALES, the second with its axes swapped (a quarter turn) and
 * reading a DIFFERENT CHANNEL of the same tile, because one tiling layer at 2.35 m is a
 * visible grid the moment you look along the ground. The scales are in a deliberately
 * non-integer ratio (3.96x) so the two grids beat over tens of metres instead of locking.
 *
 * AND IT FADES OUT WITH DISTANCE — full inside 18 m, gone by 80 m. The fade is computed in
 * the vertex shader (one varying; three declares cameraPosition in the vertex prefix and
 * not in the fragment one) so the fragment stage costs one multiply. It is wide on purpose:
 * a short fade puts a visible ring on open ground, and the texture fetch is paid either way.
 * ------------------------------------------------------------------ */
const GROUND_TEX = 256;           // px; 2.35 m / 256 = 9.2 mm per texel at the fine layer
const GROUND_FINE_M = 1.80;       // metres per tile, layer A. ROUND 20: was 2.35 — see GRIT below
const GROUND_COARSE_M = 7.15;     // metres per tile, layer B — 3.97x, never an integer
// THE FIRST VERSION OF THIS WAS INVISIBLE AND THE A/B SAID SO. Measured in one boot,
// forest floor at the player's feet, detail amplitude 0.30 vs 0 with nothing else moved:
// near-patch sd 1.53 vs 1.64 — i.e. NOTHING, and slightly the wrong way. The arithmetic
// says why. The tile was normalised so its widest EXCURSION was +-0.48, but the
// distribution is peaky, so its standard deviation was only 0.123; mixing two such
// channels dropped it to 0.088; and 1 + 0.30 * (2t - 1) then had a standard deviation of
// 5.3% on the albedo. Five percent of a forest floor at luminance 11 is half a level.
// So the tile is now normalised BY ITS STANDARD DEVIATION (a soft tanh limiter keeps the
// tails inside the byte without clipping and without moving the mean) and the two layers
// are SUMMED in signed space instead of mixed, which adds their variances instead of
// averaging them.
const GROUND_TARGET_SD = 0.25;    // per channel, in the texture's own 0..1 range
const GROUND_W_FINE = 0.66, GROUND_W_COARSE = 0.54;   // signed weights; sd adds in quadrature
// ASYMMETRIC ON PURPOSE, and this is the physics of the picture rather than a fudge: the
// bright half of that field is wet grit catching a cold sky and it can be strong, while the
// dark half is only the shadow between stones and must never reach the black the canopy
// term already owns. It also carries its own exposure compensation — a mean-1 multiplier
// LOSES mean luminance through a concave tone curve, which is why the first version came
// back 0.2 luma darker, and the +-difference here puts about +4% back.
const GROUND_AMP_UP = 0.68;
const GROUND_AMP_DOWN = 0.37;
const GROUND_FADE_NEAR = 18.0;    // full strength inside this
const GROUND_FADE_FAR = 80.0;     // and gone by here. Wide, so the falloff cannot read as a
                                  // ring on open ground; the sample is paid for either way.

/* EXPOSED SOIL. _shadeGround was a pure multiplier chain, so every term it had could only
 * make the region albedo lighter or darker — it could never make the ground a DIFFERENT
 * MATERIAL. A county of forest floor with no bare earth anywhere in it is why the ground
 * reads as one substance painted four values.
 *
 * Bare earth appears where water leaves and traffic or weather scrubs the litter off:
 * ground that is CONVEX (it sheds), OPEN (no canopy dropping needles on it) and DRY. The
 * first two are already computed per vertex here — the curvature term and the cover field —
 * and the third is read off the groundDetail sample the value break-up already takes, which
 * is the same field the wet/dry patches are keyed to. So this costs no new sample.
 *
 * TUNED AGAINST THE MEASURED DISTRIBUTION, not against the shape of the numbers. The first
 * pass used a convexity scale of 0.45 and a dry threshold of 0.12..0.62, and over 105,903
 * tier-0 vertices in the 63 chunks around the Filling Station that selected 0.95% of the
 * county at a MEAN WEIGHT OF 0.0019 — which is nothing, and the in-boot A/B duly measured
 * nothing. The reason is in the field itself: the curvature term's p95 is 0.135 and its p99
 * is 0.226, so dividing by 0.45 and then smoothstepping put almost every vertex at zero,
 * and groundDetail's p95 is 0.412, so an upper dry threshold of 0.62 was off the end of the
 * distribution. Re-scaled to the field: 0.02..0.40 dry, 0.08 convex. Same 105,903 vertices,
 * measured again: mean weight 0.032, 12.0% of the ground over 0.05, 7.6% over 0.15, 4.3%
 * over 0.30. That is scattered patches of bare earth a few metres across, which is what it
 * is meant to be.
 *
 * The albedo is warm and sits at luminance 0.161 linear — just under the fields floor
 * (0.164), well over ridge (0.132) and pines (0.109). It has to be up there: bare earth
 * only appears where the ground is OPEN, and open ground is the fields and the ridge, so
 * an albedo tuned against the pines floor could only ever DARKEN the places it actually
 * lands on. The first pass made exactly that mistake and the A/B caught it — frame mean
 * 18.21 with the term off, 16.86 with it on. What separates it from the ground it sits in
 * is HUE, not value: r/b is 1.81 against the fields' 1.56 and the pines' 1.20.
 */
const SOIL = [0.196, 0.156, 0.108];
const SOIL_MAX = 0.62;      // never a full replacement: it is exposed earth, not a road
const SOIL_DRY_LO = 0.02, SOIL_DRY_HI = 0.40;    // on groundDetail, whose p05..p95 is +-0.41
const SOIL_CONVEX_HI = 0.08;                     // on the curvature term, whose p95 is 0.135

// The road. matRoad's colour is the CROWN's linear albedo and the profile texture scales
// down from it across the ribbon. ART.md 3.2.2: "a road at night is legible because it
// reflects the sky, not because it is a different grey" — so the crown is cool, and it is
// the one place in the county where the ground is allowed above the region albedo.
const ROAD_CROWN = [0.180, 0.190, 0.215];
const ROAD_CROWN_HALF_M = 0.60;   // ART.md 3.2.2's 1.2 m strip, as a half-width
const ROAD_CROWN_FALL_M = 0.55;   // and how far it takes to fall to the shoulder
const ROAD_SHOULDER = 0.53;       // crown : shoulder = 1.89, ART.md 3.2.2's 1.9x
// ROUND 16: 0.37 -> 0.31 and 0.60 m -> 0.80 m. ART.md 3.2.3 wanted this strip so "the road
// has an EDGE instead of a seam", and with the county's verge DARK it had nothing to be an
// edge against. It does now: the pale gravel shoulder outside the ribbon measures 0.163
// luminance against the asphalt's 0.101, so a dark lip on the tarmac is the line between
// them. Judged in tests/shots/ground-r16b/road-feet.png, where the asphalt met the gravel
// as a bare polygon boundary with no lip visible at all.
const ROAD_EDGE = 0.31;
const ROAD_EDGE_M = 0.80;
// ROUND 16: 128 x 256, up from 64 x 128. MEASURED, with the ribbon finally rasterising
// (tools/road-probe.mjs: 60.1% of the frame red, against 0.13% before the winding was
// reversed): standing on the county loop the road owns 34-57% of the picture and it is a
// PERFECTLY FLAT SHEET. The crown reads, the value reads — there is simply no surface on
// it. The profile texture is the only per-texel channel the ribbon has (the vertex colour
// can be nothing but a ramp across a two-vertex cross-section), and at 64 x 128 one texel
// was 8.9 cm across a 5.7 m road, which is blurred to nothing three metres from the camera.
// At 128 x 256 a texel is 4.5 cm by 3.1 cm — the size of the aggregate in the tarmac. The
// texture is 128 KB and it is one upload at boot.
const ROAD_TEX_W = 128, ROAD_TEX_H = 256;
const ROAD_GRAIN = 0.13;          // per-texel aggregate, off the crown
const ROAD_GRAIN_CROWN = 0.05;    // and much less on it: a wet crown is wet all the way
// ROUND 16: 0.18 -> 0.30. This is the ribbon's only NON-REPEATING channel — the profile
// tiles every 8 m, so anything that must not repeat over a two-kilometre straight has to
// ride here. "A tired station light reflected in only a few patches of asphalt" is the art
// direction's own sentence and it is a world-space patch, not a texture.
const ROAD_DETAIL_AMP = 0.30;
const ROAD_WET_G = 0.07, ROAD_WET_B = 0.22;   // and those patches go COOL: they are sky

// Roads and collision now share the terrain field. The finalizer projects the ribbon
// onto the rendered LOD triangles with a small asphalt offset. The old 0.24--1.2 m
// blanket lift compensated for banked ribbons and coarse aprons; it buried tyres and
// left road edges visibly detached. Near-road ground is now refined to 0.8 m.
const RIBBON_CLEAR = 0.045; // clears the 2.5 cm made-ground apron

// Scratch for the skirt walk. Sized off the finest tier once, never per build.
const MAX_SEG = MAX_CHUNK_SEG;
const _ring = new Int32Array(4 * MAX_SEG);

export function chunkKey(cx, cz) { return cx + '|' + cz; }

// The two shapes _buildOpts can return, allocated once. See _buildOpts.
const OPTS_PLACE = Object.freeze({ placement: true });

export class Chunks {
  static id = 'chunks';

  constructor(ctx) {
    this.ctx = ctx;
    this.group = null;
    this.matGround = null;
    this.matRoad = null;
    this.roadTex = null;
    this.groundTex = null;

    this.records = new Map();     // key -> record
    this.queue = [];              // build entries, sorted toward pos + vel*2s
    this.queued = new Map();      // key -> entry (the authority on "is this wanted")
    this.inflight = new Set();    // keys handed to the worker
    this.inbox = [];              // finished payloads awaiting finalize
    this.activate = [];           // hidden records coming back into the ring

    this.worker = null;
    this.workerReady = false;
    this.workerNote = 'not started';
    this._flatsSynced = -1;       // disc count last sent to the worker; -1 = never

    this.viewRing = DEFAULT_RING_M;
    this._frame = 0;
    this._dirtyCount = false;
    this._px = 0; this._pz = 0; this._vx = 0; this._vz = 0;
    this._stats = {
      resident: 0, visible: 0, queued: 0, inflight: 0,
      built: 0, disposed: 0, rebuilt: 0, workerBuilds: 0, syncBuilds: 0,
      tris: 0, worker: false, ring: this.viewRing, deterministic: false,
    };
    this._notes = [];
    this._keyCache = new Map();   // numeric cell -> chunk key string, see _keyOf
  }

  /* ---------------------------------------------------------------- *
   * boot
   * ---------------------------------------------------------------- */

  async init() {
    const scene = this.ctx.scene;
    if (!scene) throw new Error('chunks: ctx.scene missing (gfx must be manifest #1)');

    this.group = new THREE.Group();
    this.group.name = 'chunks';
    this.group.matrixAutoUpdate = false;      // chunk meshes carry their own matrices
    this.group.updateMatrix();
    scene.add(this.group);

    // TWO materials for the whole county, and both are SHARED — never disposed with a
    // chunk. Three bakes the light census into every program, so each extra material
    // variant is a permanent line on the shader-program budget. That budget is ONE number
    // and it lives in CFG.render.budget.programsMax — this comment used to assert its own
    // figure, four files asserted four different ones, and none of them matched config.
    // One vertex-coloured Lambert covers all three terrain tiers; splitting it per tier,
    // as the PLAN's variant census allows for, would buy nothing and cost two programs.
    this.matGround = new THREE.MeshLambertMaterial({
      vertexColors: true,
      dithering: true,          // near-black gradients band badly on an 8-bit target
    });
    this.matGround.name = 'ground';
    // ROUND 16 — the detail map. Built and installed here so every chunk mesh ever made
    // shares the one material and the one program. If the canvas is unavailable (node, a
    // test realm) the material is left exactly as it was: unshaded ground is a downgrade,
    // a crash is a failure.
    this.groundTex = this._buildGroundDetail();
    if (this.groundTex) this._installGroundDetail(this.matGround, this.groundTex);

    // THE ROAD. It used to be a flat 0x14161a with no vertex colours and no map, which is
    // a linear albedo of about 0.007 — six times DARKER than the verge beside it and
    // fourteen times darker than the pines floor. ART.md's gate table row 19 could not
    // even find road pixels to sample, and a differential mask standing ON the county loop
    // found ELEVEN. The county's only navigation aid was not on screen.
    //
    // Three parts, all of them ART.md 3.2:
    //   1. vertexColors, so the ribbon shares the ground's channel and takes the same
    //      world-space field the county floor does — a long straight is not a uniform grey
    //      stripe, and it costs no new program.
    //   2. a wet CROWN down the centre at 1.9x the shoulder. A road at night is found
    //      because it reflects the sky. THIS CANNOT BE A VERTEX COLOUR: roads.js emits two
    //      vertices per cross-section (u = 0 and u = 1) so the only shape a vertex colour
    //      can make across a ribbon is a straight ramp. It is a 128x256 profile texture.
    //   3. a darker strip at each edge, so the road has an EDGE instead of a seam.
    // material.color is the crown's albedo and the texture scales down from it, so the
    // profile keeps eight bits of precision instead of quantising 0.007 into two of them.
    this.matRoad = new THREE.MeshLambertMaterial({
      vertexColors: true,
      dithering: true,
      // ROUND 15, MEASURED, AND THEN MEASURED AGAIN.
      //
      // This material set no `side`, so it was FrontSide — and the note at _ribbonNormals
      // below records that computeVertexNormals() "pointed every road normal at the floor".
      // That is a statement about the WINDING, and back-face culling reads the winding, not
      // the normal attribute that was overridden to fix the shading. So the county's asphalt
      // was culled from above and could only ever be seen from underneath: tools/road-probe.mjs,
      // standing on a road looking down at it with the ribbon painted unlit and over-bright,
      // measured 0.13% of the frame. The thing that has read as a road in every screenshot
      // this project has ever taken is the GROUND either side of it.
      //
      // DoubleSide was the first fix and it was the WRONG one — three flips the normal for a
      // back-facing fragment, so the road came back lit from underneath and rendered as a
      // black ramp (tests/shots/holdfast-first/road-220.png). The winding is reversed at the
      // source instead, in _ribbonIndices, and this material stays FrontSide.
      polygonOffset: true,      // the ribbon rides 6 cm over ground it is projected onto
      polygonOffsetFactor: -1.5,
      polygonOffsetUnits: -2,
    });
    // LINEAR, explicitly. Every albedo in this lane is linear (REGIONS in terrain.js are,
    // and a colour BufferAttribute is read as working-space); a hex would be decoded from
    // sRGB and land somewhere else entirely.
    this.matRoad.color.setRGB(ROAD_CROWN[0], ROAD_CROWN[1], ROAD_CROWN[2], THREE.LinearSRGBColorSpace);
    this.roadTex = this._buildRoadProfile();
    if (this.roadTex) this.matRoad.map = this.roadTex;
    this.matRoad.name = 'road-ribbon';

    this._startWorker();

    // The boot ring, built synchronously and on purpose. flora.js gives us 1.5 s before
    // it decides we do not exist; this makes the answer "already done" rather than
    // "in about a hundred frames".
    const s = this._startPoint();
    this._px = s.x; this._pz = s.z;
    this._buildBootRing(s.x, s.z);
  }

  _startPoint() {
    const t = this._sys('terrain');
    const p = t && t.playerStart;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) return p;
    const cam = this.ctx.camera;
    if (cam && cam.position) return { x: cam.position.x, z: cam.position.z };
    return { x: 0, z: 0 };
  }

  /** Everything inside the finest tier's radius plus a chunk, built now, no budget. */
  _buildBootRing(px, pz) {
    const R = Math.ceil((TIERS[0].radius + CHUNK) / CHUNK);
    const lim = TIERS[0].radius + CHUNK;
    const lim2 = lim * lim;
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
    const list = [];
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const cx = ccx + dx, cz = ccz + dz;
        const mx = (cx + 0.5) * CHUNK - px, mz = (cz + 0.5) * CHUNK - pz;
        const d2 = mx * mx + mz * mz;
        if (d2 > lim2) continue;
        list.push([d2, cx, cz]);
      }
    }
    list.sort((a, b) => a[0] - b[0]);        // nearest first: the ground underfoot exists
    for (let i = 0; i < list.length; i++) {
      const cx = list[i][1], cz = list[i][2];
      const tier = this._tierFor(Math.sqrt(list[i][0]));
      this._finalize(buildChunkData(cx, cz, tier, this._buildOpts()));
      this._stats.syncBuilds++;
    }
    this._recount();
  }

  /* ---------------------------------------------------------------- *
   * the worker
   * ---------------------------------------------------------------- */

  _startWorker() {
    if (typeof Worker === 'undefined') { this.workerNote = 'no Worker in this environment'; return; }
    try {
      const url = new URL('./chunk-worker.js', import.meta.url);
      const w = new Worker(url, { type: 'module' });
      w.onmessage = (ev) => this._onWorkerMessage(ev && ev.data);
      w.onerror = (e) => this._killWorker('worker error: ' + ((e && e.message) || 'unknown'));
      w.onmessageerror = () => this._killWorker('worker message error');
      this.worker = w;
      this.workerNote = 'handshaking';
      this._flatsSynced = -1;     // a fresh realm knows nothing; re-send before it builds
      // Nothing is dispatched until this comes back. That single rule is what keeps a
      // dead or slow worker from ever being able to stall the streamer.
      w.postMessage({ op: 'hello' });
    } catch (e) {
      this._killWorker('worker unavailable: ' + ((e && e.message) || e));
    }
  }

  _onWorkerMessage(m) {
    if (!m) return;
    if (m.op === 'hello') {
      this.workerReady = true;
      this.workerNote = 'ready';
      this._stats.worker = true;
      return;
    }
    if (m.op === 'fail') {
      this.inflight.delete(m.key);
      const e = this.queued.get(m.key);
      if (e) e.dispatched = -1;              // let the main thread pick it up
      this._note('worker build failed for ' + m.key + ': ' + m.error);
      return;
    }
    if (m.op === 'chunk') {
      this.inflight.delete(m.key);
      this.inbox.push(m);
    }
  }

  _killWorker(why) {
    this.workerReady = false;
    this._stats.worker = false;
    this.workerNote = why;
    this._note(why);
    if (this.worker) {
      try { this.worker.terminate(); } catch (e) { /* already gone */ }
      this.worker = null;
    }
    // Every in-flight key is still in `queued`; clearing dispatched hands it back to the
    // synchronous builder on the very next frame. Nothing is lost and nothing stalls.
    for (const key of this.inflight) {
      const e = this.queued.get(key);
      if (e) e.dispatched = -1;
    }
    this.inflight.clear();
  }

  _buildOpts() {
    // The placement list is produced only when something will read it. flora.js owns
    // planting in M0 with its own rng fork and its own hash grid, so this stays off and
    // the builder skips the pass entirely — see the note in chunk-worker.js step 7.
    const f = this._sys('flora');
    return (f && typeof f.acceptPlacement === 'function') ? OPTS_PLACE : null;
  }

  /**
   * Chunk key, memoised. The residency scan asks for ~225 of these every single frame
   * and `cx + '|' + cz` allocates a string every time — which is the hot-path allocation
   * law broken 13,500 times a second. The cache is bounded by the county (about 4,900
   * cells at 64 m over 4 km) and is cold exactly once per cell.
   */
  _keyOf(cx, cz) {
    const n = (cx + 40000) * 100000 + (cz + 40000);
    let s = this._keyCache.get(n);
    if (s === undefined) { s = cx + '|' + cz; this._keyCache.set(n, s); }
    return s;
  }

  /* ---------------------------------------------------------------- *
   * the frame
   * ---------------------------------------------------------------- */

  /** Read LAZILY, at use, every step: a test turns the flag on after boot. */
  _deterministic() {
    const d = this.ctx && this.ctx.debug;
    return !!(d && d.flags && d.flags.deterministicChunks);
  }

  step(dt) {
    if (!this.group) return;
    this._frame++;
    this._readAnchor();

    // In deterministic mode the clock is never read at all — not even here — so the mode
    // cannot be "mostly deterministic with one sample of jitter at the top of the step".
    const det = this._deterministic();
    const t0 = det ? 0 : nowMs();
    this._updateResidency();
    this._drainInbox(t0, det);
    this._drainActivate();
    this._buildSync(t0, det);
    if (!det) this._dispatch();

    if (this._dirtyCount) this._recount();
    // The authority on "still wanted", same number queuedCount() reports. The queue ARRAY
    // carries dead slots until the next residency pass compacts them, so it reads high.
    this._stats.queued = this.queued.size;
    this._stats.inflight = this.inflight.size;
    this._stats.ring = this.viewRing;
    this._stats.deterministic = det;
  }

  /** The ground does not move, so there is nothing to interpolate. Declared, not
   *  omitted, so nobody adds a write to Object3D.position outside interp later. */
  present(alpha) { }

  _readAnchor() {
    // Lazily, at use — never captured at construction (VIGIL's combat.js captured
    // ctx.systems.enemies before enemies existed and got undefined).
    const p = this._sys('player');
    if (p && p.pos && Number.isFinite(p.pos.x)) {
      this._px = p.pos.x; this._pz = p.pos.z;
      const v = p.vel;
      this._vx = (v && Number.isFinite(v.x)) ? v.x : 0;
      this._vz = (v && Number.isFinite(v.z)) ? v.z : 0;
      return;
    }
    const cam = this.ctx.camera;
    if (cam && cam.position && Number.isFinite(cam.position.x)) {
      this._px = cam.position.x; this._pz = cam.position.z;
      this._vx = 0; this._vz = 0;
    }
  }

  _updateResidency() {
    const px = this._px, pz = this._pz;
    const ring = this.viewRing;
    const ring2 = ring * ring;
    const hide2 = (ring + HIDE_BAND_M) * (ring + HIDE_BAND_M);

    // --- 1. residency of what already exists: show / hide / dispose / re-tier ---------
    for (const rec of this.records.values()) {
      const mx = (rec.cx + 0.5) * CHUNK - px, mz = (rec.cz + 0.5) * CHUNK - pz;
      const d2 = mx * mx + mz * mz;
      if (d2 <= ring2) {
        if (!rec.visible && !rec.pendingActivate) {
          rec.pendingActivate = true;
          this.activate.push(rec);
        }
        // LOD refinement, with CFG.flora.lodHysteresis so a chunk sitting on a tier
        // boundary cannot thrash between two rebuilds forever.
        const want = this._tierFor(Math.sqrt(d2), rec.tier);
        if (want !== rec.tier && !this.queued.has(rec.key)) {
          this._enqueue(rec.cx, rec.cz, want, true);
        }
      } else if (d2 <= hide2) {
        if (rec.visible) this._hide(rec);
      } else {
        this._disposeRecord(rec);
      }
    }

    // --- 2. enqueue what is missing --------------------------------------------------
    const R = Math.ceil(ring / CHUNK) + 1;
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const cx = ccx + dx, cz = ccz + dz;
        const mx = (cx + 0.5) * CHUNK - px, mz = (cz + 0.5) * CHUNK - pz;
        const d2 = mx * mx + mz * mz;
        if (d2 > ring2) continue;
        const key = this._keyOf(cx, cz);
        if (this.records.has(key) || this.queued.has(key)) continue;
        this._enqueue(cx, cz, this._tierFor(Math.sqrt(d2)), false);
      }
    }

    // --- 3. prune and sort -----------------------------------------------------------
    // donor: Projects/filament/src/world/terrain.js:118-127 (drop queued work that fell
    // out of the ring, then sort by distance to where you'll BE), read 2026-09-02.
    // Compacted in place: a .filter() here would allocate an array every frame.
    const ax = px + this._vx * LEAD_S, az = pz + this._vz * LEAD_S;
    let w = 0;
    for (let i = 0; i < this.queue.length; i++) {
      const e = this.queue[i];
      // `queued` is the authority on what is still wanted: an entry finalized this frame
      // (by the worker or by the main thread) is already gone from it, and its dead
      // queue slot dies here rather than in an allocating splice on the hot path.
      if (this.queued.get(e.key) !== e) { this.inflight.delete(e.key); continue; }
      const mx = (e.cx + 0.5) * CHUNK, mz = (e.cz + 0.5) * CHUNK;
      const dx = mx - px, dz = mz - pz;
      if (dx * dx + dz * dz > ring2 && !this.records.has(e.key)) {
        this.queued.delete(e.key);
        this.inflight.delete(e.key);
        continue;
      }
      const bx = mx - ax, bz = mz - az;
      e.d2 = bx * bx + bz * bz;
      this.queue[w++] = e;
    }
    this.queue.length = w;
    if (w > 1) this.queue.sort(sortByD2);
  }

  _enqueue(cx, cz, tier, rebuild) {
    const key = this._keyOf(cx, cz);
    const prev = this.queued.get(key);
    if (prev) { prev.tier = tier; return prev; }
    const e = { key, cx, cz, tier, rebuild: !!rebuild, d2: 0, dispatched: -1 };
    this.queued.set(key, e);
    this.queue.push(e);
    return e;
  }

  _tierFor(d, current) {
    const hy = CFG.flora.lodHysteresis;
    if (current !== undefined && current >= 0 && current < TIERS.length) {
      const hi = TIERS[current].radius * (1 + hy);
      const lo = current > 0 ? TIERS[current - 1].radius * (1 - hy) : 0;
      if (d <= hi && d >= lo) return current;
    }
    for (let i = 0; i < TIERS.length; i++) if (d <= TIERS[i].radius) return i;
    return TIERS.length - 1;
  }

  /** Finished worker payloads. Cheap (a BufferGeometry over arrays that already exist),
   *  so this runs before the synchronous builder and usually leaves the budget unspent. */
  _drainInbox(t0, det) {
    let n = 0;
    while (this.inbox.length && n < MAX_FINALIZE_PER_FRAME) {
      const m = this.inbox.shift();
      if (!this.queued.has(m.key)) continue;  // pruned, or the main thread beat us to it
      this.queued.delete(m.key);
      this._finalize(m);
      this._stats.workerBuilds++;
      n++;
      if (!det && nowMs() - t0 >= BUDGET_MS) break;
    }
  }

  /** The activate queue: hidden chunks coming back inside the ring. A hidden chunk keeps
   *  its geometry, its colliders and its trees, so coming back is a visibility flip and
   *  not a rebuild — which is the entire point of hiding before disposing. */
  _drainActivate() {
    let n = 0;
    while (this.activate.length && n < MAX_ACTIVATE_PER_FRAME) {
      const rec = this.activate.shift();
      rec.pendingActivate = false;
      if (!this.records.has(rec.key)) continue;
      this._show(rec);
      n++;
    }
  }

  /** donor: Projects/filament/src/world/terrain.js:128-135 — one build is mandatory so
   *  streaming always advances, further builds only while the frame budget holds. */
  _buildSync(t0, det) {
    const cap = det ? DET_BUILDS_PER_STEP : MAX_SYNC_PER_FRAME;
    let built = 0;
    while (this.queue.length && built < cap) {
      if (!det && built > 0 && nowMs() - t0 >= BUDGET_MS) break;
      const e = this._nextSyncEntry(det);
      if (!e) break;
      this.queued.delete(e.key);
      this.inflight.delete(e.key);
      this._finalize(buildChunkData(e.cx, e.cz, e.tier, this._buildOpts()));
      this._stats.syncBuilds++;
      built++;
    }
  }

  _nextSyncEntry(det) {
    for (let i = 0; i < this.queue.length; i++) {
      const e = this.queue[i];
      if (this.queued.get(e.key) !== e) continue;          // already finalized this frame
      // Deterministic mode takes dispatched work straight back rather than waiting out
      // STALE_FRAMES: the flag may have been raised with keys already at the worker, and
      // waiting for them is exactly the wall-clock dependency the mode exists to remove.
      // A late payload for a key we rebuilt here is dropped by _drainInbox's queued check.
      if (e.dispatched >= 0 && !det) {
        // In flight. Leave it to the worker unless the worker has gone quiet: 90 frames
        // is the same 1.5 s of patience flora extends to us, and after it the main
        // thread takes the work back rather than leaving a hole in the ground.
        if (this._frame - e.dispatched <= STALE_FRAMES) continue;
        this._note('worker stalled on ' + e.key + '; building on the main thread');
      }
      return e;
    }
    return null;
  }

  /**
   * THE PADS, INTO THE WORKER'S REALM, BEFORE IT IS ASKED TO BUILD ANYTHING.
   *
   * terrain.js keeps its disc registry in module state and the worker imports its own copy of
   * that module, seeded from M0_SITES alone. It never saw the fourteen destination pads
   * places.js registers on the main thread, so it built ground that had never been levelled
   * while collision — always main-thread heightAt — used the pads. Both builders are live, so
   * whichever one happened to win a chunk decided whether its ground was right, and the answer
   * changed run to run. Measured at the Cathedral before this: two neighbouring chunks meeting
   * at one world point 10.08 m apart, the walkable ground agreeing with neither.
   *
   * Registration happens once, in places.init() (manifest #10), and _dispatch() first runs
   * from step() — after every init. So this sends once and then costs one integer compare.
   */
  _syncFlats() {
    const n = flatCount();
    if (n === this._flatsSynced) return;
    this.worker.postMessage({ op: 'flats', flats: flats() });
    this._flatsSynced = n;
  }

  _dispatch() {
    if (!this.workerReady || !this.worker) return;
    this._syncFlats();
    for (let i = 0; i < this.queue.length && this.inflight.size < WORKER_INFLIGHT; i++) {
      const e = this.queue[i];
      if (e.dispatched >= 0 || this.queued.get(e.key) !== e) continue;
      e.dispatched = this._frame;
      this.inflight.add(e.key);
      const opts = this._buildOpts();
      this.worker.postMessage({
        op: 'build', key: e.key, cx: e.cx, cz: e.cz, tier: e.tier,
        placement: !!(opts && opts.placement),
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * ART.md 3 — the ground's identity and the road's crown
   * ---------------------------------------------------------------- */

  /**
   * ART.md 3.1. Multiply the region albedo the builder produced by two world-space terms,
   * IN PLACE on the payload's own colour array, before it becomes a BufferAttribute.
   *
   * This lives here and not in chunk-worker.js for one reason worth writing down: the
   * builder is shared with a Worker and its colour pass is the region/cliff/verge blend,
   * which is the county's PALETTE. This is the county's MATERIAL — how broken up, how
   * occluded, how wet — and it is a different question with a different owner. Both are
   * pure functions of world position, so a chunk built on either thread and rebuilt at any
   * tier gets the same answer; that is the only property that matters here.
   *
   * Cost, measured: 1,681 interior vertices at tier 0, three value-noise octaves and four
   * array reads each. See docs/HANDOFF.md for the build-time delta.
   */
  _shadeGround(data) {
    // Read LAZILY, every build. Five other lanes are editing this frame today, so the only
    // honest way to measure what THIS lane did is to A/B it inside one boot: set the flag,
    // call rebuildAll(), measure, clear it, rebuild, measure. A before/after taken from two
    // separate runs would be measuring the whole round.
    const d = this.ctx && this.ctx.debug;
    if (d && d.flags && d.flags.flatGround) return;
    // ROUND 16: the same discipline one step finer. flatGround turns off this whole chain,
    // which cannot answer "what did the SOIL term do" — five other lanes are editing today
    // and a before/after from two boots would be measuring the round, not the term.
    const noSoil = !!(d && d.flags && d.flags.noSoil);

    const seg = data.seg, n = seg + 1, quad = data.quad;
    const col = data.colors, nrm = data.normals;
    const x0 = data.x0, z0 = data.z0;
    // Lazily, once per chunk, never per vertex, and never at construction: flora (#9) is built
    // after this system (#8) and its boot ring is laid inside our own init(). A chunk built
    // before flora exists simply gets no canopy term and is re-shaded when it re-tiers.
    const flora = this._sys ? this._sys('flora') : null;
    const coverAt = flora && typeof flora.coverAt === 'function' ? flora : null;
    const fade = Math.max(1, Math.min(AO_FADE_QUADS, seg * 0.25));
    const kdiv = AO_K / (2 * quad);

    for (let iz = 0; iz <= seg; iz++) {
      const wz = z0 + iz * quad;
      const rowUp = (iz < seg ? iz + 1 : seg) * n;
      const rowDn = (iz > 0 ? iz - 1 : 0) * n;
      for (let ix = 0; ix <= seg; ix++) {
        const wx = x0 + ix * quad;
        const o = (iz * n + ix) * 3;

        // 1. VALUE BREAK-UP. Centred on 0, so the county mean does not move.
        const detail = groundDetail(wx, wz);
        let m = 1 + DETAIL_AMP * detail;

        // 1b. THE CANOPY. Dark under a stand, open in a clearing. See CANOPY_AO.
        let canopy = 0;
        if (coverAt) {
          canopy = coverAt.coverAt(wx, wz);
          if (canopy > 0) m *= 1 - CANOPY_AO * canopy;
        }

        // 2. CURVATURE. The normal field's divergence is minus the height Laplacian, so
        //    a negative value is a hollow and a positive one is a crown. Faded to zero at
        //    the chunk border — see the note on AO_FADE_QUADS.
        const edgeIn = Math.min(ix, iz, seg - ix, seg - iz);
        let hollow = 0, crown = 0;
        if (edgeIn > 0) {
          const a = (iz * n + (ix < seg ? ix + 1 : seg)) * 3;
          const b = (iz * n + (ix > 0 ? ix - 1 : 0)) * 3;
          const c = (rowUp + ix) * 3;
          const d = (rowDn + ix) * 3;
          let div = (nrm[a] - nrm[b] + nrm[c + 2] - nrm[d + 2]) * kdiv;
          if (div > 1) div = 1; else if (div < -1) div = -1;
          const taper = edgeIn < fade ? edgeIn / fade : 1;
          div *= taper;
          if (div > 0) { crown = div; m *= 1 + CROWN_GAIN * div; }
          else { hollow = -div; m *= 1 - AO_GAIN * hollow; }
        }

        // 2b. EXPOSED SOIL — the one term in this chain that is not a multiplier.
        //     Everything else here can only make the region albedo lighter or darker; this
        //     makes it a DIFFERENT MATERIAL, which is the whole difference between a county
        //     painted four values and a county made of two substances. Convex (it sheds
        //     water), open (nothing dropping litter on it) and dry (the high tail of the
        //     same groundDetail field the break-up above already sampled — no new noise).
        //     It runs BEFORE the multiply, so a patch of bare earth still takes the canopy,
        //     the curvature and the break-up like any other ground.
        if (!noSoil && crown > 0 && detail > SOIL_DRY_LO) {
          let s = (detail - SOIL_DRY_LO) / (SOIL_DRY_HI - SOIL_DRY_LO);
          if (s > 1) s = 1;
          s *= s * (3 - 2 * s);
          let c = crown / SOIL_CONVEX_HI;
          if (c > 1) c = 1;
          c *= c * (3 - 2 * c);
          const soil = SOIL_MAX * s * c * (1 - canopy);
          if (soil > 0) {
            col[o] += (SOIL[0] - col[o]) * soil;
            col[o + 1] += (SOIL[1] - col[o + 1]) * soil;
            col[o + 2] += (SOIL[2] - col[o + 2]) * soil;
          }
        }

        // 2c. FROST. A MATERIAL, like the soil above it and for the same reason: it has to make
        //     the ground a different substance, not a lighter version of the same one. It runs
        //     BEFORE the multiply, so a frosted patch still takes the canopy, the curvature and
        //     the break-up, and cannot read as a decal laid over the county.
        //
        //     Three terms, and only the first is the field. WHERE (the area). OPEN TO THE SKY:
        //     frost forms where the sky can see the ground, so none of it under a closed stand.
        //     And HOLLOWS: cold air pools, a frost hollow is a real thing, and it is the exact
        //     opposite of where the bare soil goes above — so the two terms never fight over the
        //     same vertex, which is what would have made both of them look like noise.
        if (FROST_AMOUNT > 0) {
          const area = frostAt(wx, wz);
          if (area > 0) {
            const k = FROST_AMOUNT * area * (1 - canopy)
              * (1 - FROST_HOLLOW + FROST_HOLLOW * hollow);
            if (k > 0) {
              col[o] += (FROST[0] - col[o]) * k;
              col[o + 1] += (FROST[1] - col[o + 1]) * k;
              col[o + 2] += (FROST[2] - col[o + 2]) * k;
            }
          }
        }

        if (m < SHADE_FLOOR) m = SHADE_FLOOR;
        col[o] *= m;
        col[o + 1] *= m;
        col[o + 2] *= m;

        // 3. WETNESS. The same hollow that darkens also goes cool: water pools where the
        //    ground is concave, and water at night is the colour of the sky above it. Blue
        //    and green only, so the hollow reads as damp rather than as a lighting bug.
        if (hollow > 0) {
          const w = WET_GAIN * hollow;
          col[o + 1] *= 1 + w * 0.55;
          col[o + 2] *= 1 + w;
        }

        // 4. AND THE CANOPY GOES THE OTHER WAY. A hollow is lit by the sky and goes cool; a
        //    floor under a stand is lit by nothing and what colour it keeps is its own —
        //    needle litter, not sky. Taking blue DOWN is the whole move; adding warmth would
        //    spend saturation the county does not ration (ART 0.5).
        if (canopy > 0) col[o + 2] *= 1 - CANOPY_WARM * canopy;
      }
    }

    // The skirt copies its ring vertex, exactly as the builder does — same traversal, or
    // the hem of every chunk would be the unshaded colour and each chunk would wear a
    // bright rim wherever a tier edge showed.
    const ringLen = 4 * seg;
    let k = 0;
    for (let ix = 0; ix < seg; ix++) _ring[k++] = 0 * n + ix;
    for (let iz = 0; iz < seg; iz++) _ring[k++] = iz * n + seg;
    for (let ix = seg; ix > 0; ix--) _ring[k++] = seg * n + ix;
    for (let iz = seg; iz > 0; iz--) _ring[k++] = iz * n + 0;
    const skirtBase = n * n;
    for (let j = 0; j < ringLen; j++) {
      const s = _ring[j] * 3, d = (skirtBase + j) * 3;
      col[d] = col[s]; col[d + 1] = col[s + 1]; col[d + 2] = col[s + 2];
    }
  }

  /** Project every ribbon vertex onto the actual rendered terrain before upload. */
  _liftRibbon(rib, quad) {
    const pos = rib.positions;
    // Match the actual terrain triangles, including their LOD, instead of raising
    // the road by a quarter metre and burying tyres in its non-colliding surface.
    for (let i = 0; i < pos.length; i += 3) {
      const x=pos[i],z=pos[i+2],gx=Math.floor(x/quad)*quad,gz=Math.floor(z/quad)*quad;
      const u=(x-gx)/quad,v=(z-gz)/quad;
      const a=heightAt(gx,gz),b=heightAt(gx+quad,gz),c=heightAt(gx,gz+quad);
      const meshY=u+v<=1 ? a+(b-a)*u+(c-a)*v
        : heightAt(gx+quad,gz+quad)*(u+v-1)+b*(1-v)+c*(1-u);
      pos[i+1]=Math.max(heightAt(x,z),meshY)+RIBBON_CLEAR;
    }
  }

  /**
   * THE ROAD WAS LIT FROM BELOW. Measured 2026-09-02: the ribbon's vertex normals had a
   * mean Y of **-0.991** while the ground beside them measured **+0.992**. The ribbon
   * geometry used to take its normals from computeVertexNormals(), and roads.js's winding
   * (emitRun: `idx.push(a, c, b, b, c, d)` with the two edge vertices emitted s = -1 then
   * s = +1) makes every face normal point at the floor. The moon is the county's only key
   * light and it is above, so the road received essentially none of it: it was lit by the
   * hemisphere's GROUND term and the ambient floor and nothing else.
   *
   * That is the real reason ART.md's gate row 19 read "n/a (0 px)". It was never the
   * asphalt colour. Measured at (-1174.9, -569.2) looking down the county loop, before this
   * fix the road's own pixels sat at 0.43x the ground beside them WITH a crown albedo of
   * 0.268 against a ground of 0.071 — a surface four times more reflective reading at less
   * than half the value is not a palette problem, it is a lighting bug.
   *
   * The normals are taken from terrain.normalAt() rather than flipped, because that is what
   * the surface actually is: the ribbon is projected onto heightAt, so the ground's normal
   * IS the road's normal, and a road on a slope then shades like the slope it is on.
   */
  /**
   * ROUND 15: the winding, reversed once, here. roads.js emits its triangles clockwise seen
   * from above, which makes every road in the county a back face to a player standing on it.
   * Reversing the index order is one pass over a few thousand shorts at chunk-build time and
   * it leaves the material FrontSide, the normals as authored, and the shadow pass honest —
   * all three of which DoubleSide would have quietly broken.
   */
  _ribbonIndices(rib) {
    const src = rib.indices;
    const out = new src.constructor(src.length);
    for (let i = 0; i + 2 < src.length; i += 3) {
      out[i] = src[i + 2]; out[i + 1] = src[i + 1]; out[i + 2] = src[i];
    }
    return out;
  }

  _ribbonNormals(rib) {
    const pos = rib.positions;
    const nv = pos.length / 3;
    const nrm = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      const o = i * 3;
      const n = normalAt(pos[o], pos[o + 2]);   // shared scratch — copied out immediately
      nrm[o] = n.x; nrm[o + 1] = n.y; nrm[o + 2] = n.z;
    }
    return nrm;
  }

  /** ART.md 3.2.1 — the ribbon takes the county's own world-space field, so a two-kilometre
   *  straight is not a uniform stripe. The CROWN is the texture's job, not this one: with
   *  two vertices per cross-section a vertex colour can only ever be a ramp across a road. */
  _ribbonColors(rib) {
    const pos = rib.positions;
    const nv = pos.length / 3;
    const col = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      const o = i * 3;
      const d = groundDetail(pos[o], pos[o + 2]);
      const m = 1 + ROAD_DETAIL_AMP * d;
      // ROUND 16 — THE FEW PATCHES. Only the top of the field, and only upward: a patch of
      // standing water on asphalt is brighter AND colder than the asphalt around it, and
      // there is no such thing as a patch that is darker than dry tarmac at night. Roads.js
      // emits a cross-section every CFG.roads.sample (2 m), so this is a two-metre-resolved
      // term along the ribbon and a constant across it — which is exactly right, because
      // water lies in the length of a road, not in a stripe across it.
      let wet = (d - 0.25) / 0.45;
      if (wet < 0) wet = 0; else if (wet > 1) wet = 1;
      wet *= wet * (3 - 2 * wet);
      col[o] = m;
      col[o + 1] = m * (1 + ROAD_WET_G * wet);
      col[o + 2] = m * (1 + ROAD_WET_B * wet);
    }
    return col;
  }

  /**
   * ROUND 16 — the ground's detail map. ONE 256 x 256 tile carrying TWO independent
   * seamless fields, so the two layers the shader mixes are genuinely different noise
   * rather than the same tile shown twice at different sizes (which is a visible grid, and
   * the whole reason a single tiling layer looks cheap).
   *
   *   R — GRIT. Four octaves of periodic value noise plus a bright-blob pass (wet stone
   *       catching the sky) and a dark-blob pass (leaf litter, oil, damp). Read at 2.35 m
   *       per tile: at 256 px that is 9.4 mm per texel, which is the scale a boot occupies.
   *   G — MOTTLE. Three low octaves only. Read at 9.30 m per tile with the axes swapped,
   *       so it is the same texture memory doing a completely different job.
   *
   * Both channels are RENORMALISED to a mean of exactly 0.5 and a half-range of at most
   * 0.48, by an affine map about the measured mean. That is what makes the shader's
   * 1 + amp * (2t - 1) mean-neutral, which is what ART.md 0.3 row 6 requires.
   *
   * Deterministic: one integer hash of the lattice cell, no Math.random anywhere (project
   * law), so the tile is identical on every machine and in every run.
   *
   * COST, measured on this machine in node: 108 ms to bake, once, inside init(). Boot with
   * it in measures 9.4 s (tests/smoke.mjs), against the 15 s cold-boot law. Nothing in
   * step() touches it and the upload is one 256 KB texture with its mip chain.
   *
   * NoColorSpace, per the project law for canvas textures: this is a profile, not a picture.
   */
  _buildGroundDetail() {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const cv = document.createElement('canvas');
    cv.width = GROUND_TEX; cv.height = GROUND_TEX;
    const g2 = cv.getContext('2d');
    if (!g2) return null;

    const N = GROUND_TEX;
    // Integer hash of a lattice cell. Same shape as chunk-worker's grain(), different
    // constants, and it never sees a float — so the tile is bit-identical everywhere.
    const gh = (ix, iz, salt) => {
      let h = (ix * 374761393 + iz * 668265263 + salt * 1013904223) | 0;
      h = (h ^ (h >>> 13)) | 0;
      h = Math.imul(h, 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    // Periodic value noise: P lattice cells across the tile, wrapped, so ANY integer P
    // tiles seamlessly. Smoothstep interpolation, so the mips do not show the lattice.
    const pn = (u, v, P, salt) => {
      const x = u * P, z = v * P;
      const xi = Math.floor(x), zi = Math.floor(z);
      const fx = x - xi, fz = z - zi;
      const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
      const i0 = ((xi % P) + P) % P, i1 = (i0 + 1) % P;
      const j0 = ((zi % P) + P) % P, j1 = (j0 + 1) % P;
      const a = gh(i0, j0, salt), b = gh(i1, j0, salt);
      const c = gh(i0, j1, salt), e = gh(i1, j1, salt);
      const lo = a + (b - a) * sx, hi = c + (e - c) * sx;
      return lo + (hi - lo) * sz;
    };

    const R = new Float32Array(N * N), G = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      const v = (y + 0.5) / N;
      for (let x = 0; x < N; x++) {
        const u = (x + 0.5) / N;
        const i = y * N + x;

        // GRIT. The three coarser octaves are the shape of the ground; the 61-cell octave
        // is the grain, and at 7.0 mm per texel it is the only thing in this project that
        // draws at the scale of a stone.
        //
        // ROUND 20 — THE WEIGHTS WERE UPSIDE DOWN. 0.34 / 0.27 / 0.23 / 0.16 puts most of
        // the amplitude on the SEVEN-cell octave, which at the old 2.35 m tile is a 34 cm
        // blob. Photographed under the torch (tests/shots/vis-bark2/40-bark-torch.png) the
        // forest floor is a soft cloud of half-metre patches: the grain is present and is
        // the quietest thing in the mix, so at two metres there is still nothing at the
        // scale of a boot. Reweighted toward the fine end and the tile shrunk 2.35 -> 1.80,
        // which moves the grain octave from 3.9 cm to 3.0 cm and the blob octave from 34 cm
        // to 26 cm. The far fade at 80 m and the mips own the aliasing question.
        let r = 0.22 * pn(u, v, 7, 311)
          + 0.24 * pn(u, v, 13, 419)
          + 0.28 * pn(u, v, 29, 523)
          + 0.26 * pn(u, v, 61, 631);
        // Wet stone: connected blobs where a separate fine field runs high. Blobs, not
        // single texels — a one-texel speck is gone by the second mip.
        const stone = pn(u, v, 43, 733);
        if (stone > 0.62) r += 0.34 * ((stone - 0.62) / 0.38);
        // Litter and damp: the other tail of a separate field, going down.
        const litter = pn(u, v, 11, 839);
        if (litter < 0.34) r -= 0.26 * ((0.34 - litter) / 0.34);
        R[i] = r;

        // MOTTLE. Low octaves only: read at 9.3 m this is metres-wide damp and dry, and
        // anything finer in it would just fight the grit layer.
        G[i] = 0.50 * pn(u, v, 3, 947)
          + 0.32 * pn(u, v, 7, 1051)
          + 0.18 * pn(u, v, 17, 1153);
      }
    }

    // Renormalise each channel BY ITS STANDARD DEVIATION, not by its widest excursion.
    // Normalising by the excursion is what made the first version of this invisible: the
    // distribution is peaky, so pinning the extremes to +-0.48 left a standard deviation of
    // 0.123 and the shader modulated the albedo by five percent. See the note on
    // GROUND_TARGET_SD.
    //
    // The tails are then folded in with tanh rather than clamped. A clamp piles mass on the
    // two end bytes and moves the mean off 0.5, and the mean landing on 0.5 is the entire
    // reason this multiplier is allowed near ART.md 0.3 row 6. tanh is odd but the input is
    // not symmetric, so the mean is re-measured and removed afterwards.
    const fit = (A) => {
      let sum = 0;
      for (let i = 0; i < A.length; i++) sum += A[i];
      const mean = sum / A.length;
      let q = 0;
      for (let i = 0; i < A.length; i++) { const d = A[i] - mean; q += d * d; }
      const sd = Math.sqrt(q / A.length) || 1e-6;
      const k = GROUND_TARGET_SD / sd;
      let s2 = 0;
      for (let i = 0; i < A.length; i++) {
        const x = 0.48 * Math.tanh((A[i] - mean) * k / 0.48);
        A[i] = x; s2 += x;
      }
      const off = s2 / A.length;
      let lo = 1, hi = 0, s3 = 0;
      for (let i = 0; i < A.length; i++) {
        let x = 0.5 + A[i] - off;
        if (x < 0.004) x = 0.004; else if (x > 0.996) x = 0.996;
        A[i] = x; s3 += x;
        if (x < lo) lo = x; if (x > hi) hi = x;
      }
      return { mean, sd, k, out: s3 / A.length, lo, hi };
    };
    this._groundFit = { r: fit(R), g: fit(G) };

    const img = g2.createImageData(N, N);
    const D = img.data;
    for (let i = 0, o = 0; i < N * N; i++, o += 4) {
      D[o] = Math.round(R[i] * 255);
      D[o + 1] = Math.round(G[i] * 255);
      D[o + 2] = 128;
      D[o + 3] = 255;
    }
    g2.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;      // project law: every canvas texture, always
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.name = 'ground-detail';
    // The ground is seen at a grazing angle by definition — it is the floor. Without
    // anisotropy the mip chain eats the grain at exactly two metres out, which is where
    // this whole thing is aimed.
    const caps = this.ctx && this.ctx.renderer && this.ctx.renderer.capabilities;
    tex.anisotropy = (caps && typeof caps.getMaxAnisotropy === 'function')
      ? caps.getMaxAnisotropy() : 1;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * ROUND 16 — install the detail map on the ONE shared ground material.
   *
   * NOT material.map. Setting `map` would define USE_MAP, which declares `attribute vec2 uv`
   * and makes the stock uv_vertex write vMapUv from an attribute the builder does not emit
   * and must not start emitting. Instead the sampler is our own uniform, the UV is derived
   * from world position in the vertex shader, and the two stock chunks are replaced:
   *
   *   <uv_vertex>    -> world xz into a varying, plus the distance fade weight. `modelMatrix`
   *                     and `cameraPosition` are both in three's own vertex prefix, and a
   *                     chunk mesh's matrix is a pure translation, so (modelMatrix * position).xz
   *                     is the exact world position with no extra attribute and no CPU work.
   *   <map_fragment> -> the two-layer multiply. It sits before <color_fragment>, so it
   *                     multiplies `diffuse` (white) and the vertex colour arrives after;
   *                     a multiply does not care about the order.
   *
   * GLSL as an array of strings joined with backslash-n, exactly as flora.js's
   * _makeGrassMaterial does it: there is no backtick anywhere in a shader in this project
   * (a backtick inside a template literal closes the JS string and the page dies with a
   * lineless error naming no file).
   *
   * customProgramCacheKey is CONSTANT. matGround is one shared instance across all three
   * LOD tiers so there is only ever one program; the key pins that so a future tier-local
   * material could not split it. frameStats().programs must not move, and it did not.
   */
  _installGroundDetail(mat, tex) {
    const uni = {
      uGroundMap: { value: tex },
      // x = 1/fine metres, y = 1/coarse metres, z = amplitude UP, w = amplitude DOWN
      uGroundParams: { value: new THREE.Vector4(
        1 / GROUND_FINE_M, 1 / GROUND_COARSE_M, GROUND_AMP_UP, GROUND_AMP_DOWN) },
      uGroundFade: { value: new THREE.Vector2(GROUND_FADE_NEAR, GROUND_FADE_FAR) },
      // signed layer weights, so the two variances add instead of averaging
      uGroundMix: { value: new THREE.Vector2(GROUND_W_FINE, GROUND_W_COARSE) },
    };
    mat.userData.groundUniforms = uni;

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uGroundMap = uni.uGroundMap;
      shader.uniforms.uGroundParams = uni.uGroundParams;
      shader.uniforms.uGroundFade = uni.uGroundFade;
      shader.uniforms.uGroundMix = uni.uGroundMix;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform vec2 uGroundFade;',
          'varying vec3 vGroundD;',
        ].join('\n')
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        [
          '#include <uv_vertex>',
          '{',
          '  vec4 gwp = modelMatrix * vec4( position, 1.0 );',
          '  vGroundD.xy = gwp.xz;',
          '  float gdist = length( cameraPosition.xz - gwp.xz );',
          '  vGroundD.z = 1.0 - smoothstep( uGroundFade.x, uGroundFade.y, gdist );',
          '}',
        ].join('\n')
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        [
          '#include <common>',
          'uniform sampler2D uGroundMap;',
          'uniform vec4 uGroundParams;',
          'uniform vec2 uGroundMix;',
          'varying vec3 vGroundD;',
        ].join('\n')
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        [
          '#include <map_fragment>',
          '{',
          // Layer A is the grit, read straight. Layer B is the mottle, read with the world
          // axes SWAPPED (a quarter turn) and offset, so the two tilings never line up.
          // Both are taken into SIGNED space and SUMMED: mixing them would average their
          // variances away, which is exactly how the first version of this vanished.
          '  float gGrit = texture2D( uGroundMap, vGroundD.xy * uGroundParams.x ).r * 2.0 - 1.0;',
          '  float gMott = texture2D( uGroundMap, vGroundD.yx * uGroundParams.y + 0.37 ).g * 2.0 - 1.0;',
          '  float gT = gGrit * uGroundMix.x + gMott * uGroundMix.y;',
          '  float gNear = vGroundD.z;',
          // Asymmetric: wet grit catching the sky can be strong, the shadow between stones
          // must not reach the black the canopy term already owns. The difference between
          // the two gains is also what pays back the mean a concave tone curve takes off a
          // symmetric multiplier — see the note on GROUND_AMP_UP.
          '  float gUp = max( gT, 0.0 ), gDn = min( gT, 0.0 );',
          '  diffuseColor.rgb *= 1.0 + gNear * ( uGroundParams.z * gUp + uGroundParams.w * gDn );',
          // And the bright half is WET: the only thing down there reflecting the sky, so it
          // goes cool. Upward only, so nothing here can darken the ground.
          '  float gWet = gUp * gNear;',
          '  diffuseColor.g *= 1.0 + 0.06 * gWet;',
          '  diffuseColor.b *= 1.0 + 0.20 * gWet;',
          '}',
        ].join('\n')
      );

      // A SELF-CHECK THAT SURVIVES THE SESSION. Both of these replacements are string
      // matches against three's own chunk names, and a silent miss is not a crash — it is a
      // varying that is declared, never written, reads as zero, and produces a perfectly
      // lit county with no detail on it at all. That is this project's whole failure mode,
      // so the answer is recorded where a probe can read it back:
      //   __CURFEW.ctx.systems.get('chunks').matGround.userData.groundShaderPatched
      mat.userData.groundShaderPatched = {
        uv: shader.vertexShader.indexOf('vGroundD.xy = gwp.xz') > -1,
        map: shader.fragmentShader.indexOf('uGroundParams.z * gUp') > -1,
      };
    };
    mat.customProgramCacheKey = () => 'curfew-ground-1';
    mat.needsUpdate = true;
  }

  /**
   * ART.md 3.2.2 and 3.2.3 — the road's cross-section, as a 128x256 profile texture.
   * u runs across the ribbon (roads.js emits u = 0 and u = 1 at the two edges), v runs
   * along it and repeats every 8 m (roads.js emits v = arc / 8), so the longitudinal term
   * must be periodic in v or every 8 m of road would show a seam.
   *
   * The texture is a MULTIPLIER on matRoad.color, which carries the crown's albedo. It is
   * NoColorSpace per the project law for canvas-generated textures — it is a profile, not
   * a picture, and an sRGB decode would bend it.
   */
  _buildRoadProfile() {
    if (typeof document === 'undefined' || !document.createElement) return null;
    const cv = document.createElement('canvas');
    cv.width = ROAD_TEX_W; cv.height = ROAD_TEX_H;
    const g2 = cv.getContext('2d');
    if (!g2) return null;
    const img = g2.createImageData(ROAD_TEX_W, ROAD_TEX_H);
    const D = img.data;
    const halfM = CFG.roads.width * 0.5;                 // 2.85 m
    const edgeAt = Math.max(ROAD_CROWN_HALF_M + ROAD_CROWN_FALL_M + 0.1, halfM - ROAD_EDGE_M);

    for (let y = 0; y < ROAD_TEX_H; y++) {
      // Periodic in v, so the 8 m tile is seamless. Two harmonics is enough to stop the
      // crown reading as a ruled line without turning the road into a texture swatch.
      const v = (y + 0.5) / ROAD_TEX_H * Math.PI * 2;
      const wear = 1 + 0.085 * Math.sin(v) + 0.055 * Math.sin(v * 3 + 1.1);
      for (let x = 0; x < ROAD_TEX_W; x++) {
        const u = (x + 0.5) / ROAD_TEX_W;
        const dm = Math.abs(u - 0.5) * CFG.roads.width;  // metres from the centreline
        let p;
        if (dm <= ROAD_CROWN_HALF_M) p = 1;
        else if (dm < ROAD_CROWN_HALF_M + ROAD_CROWN_FALL_M) {
          const t = (dm - ROAD_CROWN_HALF_M) / ROAD_CROWN_FALL_M;
          p = 1 + (ROAD_SHOULDER - 1) * (t * t * (3 - 2 * t));
        } else if (dm < edgeAt) p = ROAD_SHOULDER;
        else {
          const t = Math.min(1, (dm - edgeAt) / Math.max(0.05, halfM - edgeAt));
          p = ROAD_SHOULDER + (ROAD_EDGE - ROAD_SHOULDER) * (t * t * (3 - 2 * t));
        }
        // The wear rides the shoulder, never the crown: a wet crown is wet all the way.
        let q = p * (dm <= ROAD_CROWN_HALF_M ? 1 : wear);
        // ROUND 16 — THE AGGREGATE. One deterministic hash per texel, 4.5 cm x 3.1 cm of
        // road each, which is the size of the stone in the tarmac. It is the only thing on
        // the ribbon at that scale and without it the road is a sheet of paper. It TILES
        // every 8 m along and that is invisible at this frequency; the thing that must not
        // repeat over a long straight rides the vertex colour instead (see _ribbonColors).
        // Zero-mean by construction — (h - 0.5) — so the road's value does not move.
        const gk = dm <= ROAD_CROWN_HALF_M ? ROAD_GRAIN_CROWN : ROAD_GRAIN;
        let h = (x * 1597334677 + y * 3812015801 + 1013904223) | 0;
        h = (h ^ (h >>> 15)) | 0;
        h = Math.imul(h, 2246822519);
        const hf = ((h ^ (h >>> 13)) >>> 0) / 4294967296;
        q *= 1 + gk * (hf - 0.5) * 2;
        q = Math.max(0, Math.min(1, q));
        const o = (y * ROAD_TEX_W + x) * 4;
        const b = Math.round(q * 255);
        D[o] = b; D[o + 1] = b; D[o + 2] = b; D[o + 3] = 255;
      }
    }
    g2.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;       // project law: every canvas texture, always
    tex.wrapS = THREE.ClampToEdgeWrapping;     // u is the ribbon's width, and it never tiles
    tex.wrapT = THREE.RepeatWrapping;          // v is 8 m of road, and it always does
    tex.name = 'road-profile';
    // A road runs to the horizon, so the crown is seen at a grazing angle for most of its
    // length. Without anisotropy the mip chain eats the crown at exactly the distance the
    // player needs it — which would be this whole directive implemented and then thrown away.
    const caps = this.ctx.renderer && this.ctx.renderer.capabilities;
    tex.anisotropy = (caps && typeof caps.getMaxAnisotropy === 'function')
      ? caps.getMaxAnisotropy() : 1;
    tex.needsUpdate = true;
    return tex;
  }

  /* ---------------------------------------------------------------- *
   * meshes
   * ---------------------------------------------------------------- */

  /** Turn a payload (from either thread) into meshes. If a record already exists for the
   *  key this is a re-tier: the chunk keeps its identity, its trees and its colliders and
   *  only the ground geometry is swapped. */
  _finalize(data) {
    const key = data.key || chunkKey(data.cx, data.cz);
    const prev = this.records.get(key);

    // ART.md 3.1, before the arrays become a geometry and while they are still ours.
    this._shadeGround(data);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, this.matGround);
    mesh.name = 'ground:' + key;
    // Positions are LOCAL in x/z and absolute in y; the matrix carries the chunk origin.
    mesh.position.set(data.x0, 0, data.z0);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    // PINNED at creation, never toggled: three bakes receiveShadow into the program, so
    // flipping it per chunk would compile a second ground program mid-frame.
    mesh.receiveShadow = true;
    mesh.castShadow = false;

    let ribbon = null;
    if (data.rib) {
      this._liftRibbon(data.rib, data.quad);
      const rg = new THREE.BufferGeometry();
      // Ribbon vertices are WORLD-space (roads.js emits them that way), so the mesh sits
      // at the origin with an identity matrix.
      rg.setAttribute('position', new THREE.BufferAttribute(data.rib.positions, 3));
      rg.setAttribute('uv', new THREE.BufferAttribute(data.rib.uvs, 2));
      rg.setAttribute('color', new THREE.BufferAttribute(this._ribbonColors(data.rib), 3));
      rg.setIndex(new THREE.BufferAttribute(this._ribbonIndices(data.rib), 1));
      // NOT computeVertexNormals() — see _ribbonNormals. That call pointed every road
      // normal at the floor and the county's only key light is above it.
      rg.setAttribute('normal', new THREE.BufferAttribute(this._ribbonNormals(data.rib), 3));
      rg.computeBoundingSphere();
      ribbon = new THREE.Mesh(rg, this.matRoad);
      // THE NAME IS LOAD-BEARING. collision.js:77 rejects any collider whose name starts
      // 'road'; VANTA//9 learned the hard way what one AABB over a winding route does.
      ribbon.name = 'road-ribbon:' + key;
      ribbon.userData.nonPhysical = true;
      ribbon.userData.tag = 'road';
      ribbon.matrixAutoUpdate = false;
      ribbon.updateMatrix();
      ribbon.receiveShadow = true;
      ribbon.castShadow = false;
    }

    if (prev) {
      // A re-tier. The chunk's identity, its trees and its colliders all survive: only
      // the ground geometry changes, so NO chunk:disposed / chunk:built pair is emitted.
      this._releaseMeshes(prev);
      prev.tier = data.tier;
      prev.mesh = mesh;
      prev.ribbon = ribbon;
      prev.tris = data.tris + (data.rib ? data.rib.indices.length / 3 : 0);
      mesh.visible = prev.visible;
      if (ribbon) ribbon.visible = prev.visible;
      this.group.add(mesh);
      if (ribbon) this.group.add(ribbon);
      this._stats.rebuilt++;
      this._dirtyCount = true;
      this._handPlacement(prev, data);
      return prev;
    }

    const rec = {
      key, id: key, cx: data.cx, cz: data.cz, tier: data.tier,
      x0: data.x0, z0: data.z0,
      minY: data.minY, maxY: data.maxY,
      tris: data.tris + (data.rib ? data.rib.indices.length / 3 : 0),
      mesh, ribbon, visible: true, pendingActivate: false,
    };
    this.records.set(key, rec);
    this.group.add(mesh);
    if (ribbon) this.group.add(ribbon);
    this._stats.built++;
    this._dirtyCount = true;
    this._handPlacement(rec, data);

    // flora.js is listening. The payload is reused — consume it synchronously.
    _built.id = key; _built.cx = rec.cx; _built.cz = rec.cz;
    if (this.ctx.bus && this.ctx.bus.emit) this.ctx.bus.emit('chunk:built', _built);
    return rec;
  }

  _handPlacement(rec, data) {
    if (!data.place || !data.placeCount) return;
    const f = this._sys('flora');
    if (f && typeof f.acceptPlacement === 'function') {
      f.acceptPlacement(rec.id, rec.cx, rec.cz, data.place, data.placeCount);
    }
    data.place = null;      // never retained: the arrays are the payload's, not ours
  }

  _releaseMeshes(rec) {
    if (rec.mesh) {
      this.group.remove(rec.mesh);
      rec.mesh.geometry.dispose();
      // Materials are disposed only when the chunk OWNS them. matGround / matRoad are
      // shared across the whole county and are disposed once, in dispose().
      const m = rec.mesh.material;
      if (m && m.userData && m.userData.ownedByChunk) m.dispose();
      rec.mesh = null;
    }
    if (rec.ribbon) {
      this.group.remove(rec.ribbon);
      rec.ribbon.geometry.dispose();
      const m = rec.ribbon.material;
      if (m && m.userData && m.userData.ownedByChunk) m.dispose();
      rec.ribbon = null;
    }
  }

  _show(rec) {
    rec.visible = true;
    if (rec.mesh) rec.mesh.visible = true;
    if (rec.ribbon) rec.ribbon.visible = true;
    this._dirtyCount = true;
  }

  _hide(rec) {
    rec.visible = false;
    if (rec.mesh) rec.mesh.visible = false;
    if (rec.ribbon) rec.ribbon.visible = false;
    this._dirtyCount = true;
  }

  _disposeRecord(rec) {
    this._releaseMeshes(rec);
    this.records.delete(rec.key);
    this._stats.disposed++;

    // Announce BEFORE the colliders go: flora drops its instances on this event, and
    // collision.removeChunk() then takes the tree colliders flora registered under our
    // id (flora.js:1059 states that ordering as its own assumption).
    _dropped.id = rec.key; _dropped.cx = rec.cx; _dropped.cz = rec.cz;
    if (this.ctx.bus && this.ctx.bus.emit) this.ctx.bus.emit('chunk:disposed', _dropped);

    const col = this._sys('collision');
    if (col && typeof col.removeChunk === 'function') col.removeChunk(rec.key);
    this._dirtyCount = true;
  }

  /** Once per frame at most, never once per show / hide / build. */
  _recount() {
    this._dirtyCount = false;
    let vis = 0, tris = 0;
    for (const rec of this.records.values()) {
      if (rec.visible) { vis++; tris += rec.tris; }
    }
    this._stats.resident = this.records.size;
    this._stats.visible = vis;
    this._stats.tris = tris;
  }

  /* ---------------------------------------------------------------- *
   * the CONTRACT interface
   * ---------------------------------------------------------------- */

  chunkIdAt(x, z) { return this._keyOf(Math.floor(x / CHUNK), Math.floor(z / CHUNK)); }

  /** fn(record, cx, cz). The record carries { id, cx, cz, tier, x0, z0, minY, maxY,
   *  visible } — flora.js accepts either fn(record) or fn(id, cx, cz), and this is the
   *  first shape (flora.js:513-517). */
  forEachResident(fn) {
    for (const rec of this.records.values()) fn(rec, rec.cx, rec.cz);
  }

  /* ---------------------------------------------------------------- *
   * extras: test surface and M1 hooks
   * ---------------------------------------------------------------- */

  /** A plain NUMBER, exactly as engine asked for in docs/HANDOFF.md C.1 — so
   *  `__CURFEW.state().chunks` is `chunks.residentCount` and the probe chain goes away. */
  get residentCount() { return this.records.size; }
  get count() { return this.records.size; }

  /**
   * How much streaming work is still outstanding: chunks wanted but not yet standing,
   * including the ones at the worker and the ones whose payload is waiting to be turned
   * into meshes (both keep their key in `queued` until _finalize runs). Zero means the
   * ring has settled and another step would build nothing.
   *
   * A METHOD, on purpose. main.js's boot early-out used to probe
   * `typeof chunksSys.queued === 'function'` — `queued` is a Map, typeof a Map is
   * 'object', so the guard was never true and every boot paid all ninety fixed steps at
   * up to CFG.world.buildBudgetMs each: about a second of cold start on every load, for a
   * ring that had settled by step 25. Reading `.queued.size` from outside would work and
   * would also make a sibling depend on the shape of this file's private state; this is
   * the honest question, so this is the answer. `this.queue.length` is NOT it — that array
   * carries dead slots until the next residency pass compacts them.
   */
  queuedCount() { return this.queued.size; }
  visibleCount() { return this._stats.visible; }
  hasChunk(id) { return this.records.has(String(id)); }
  chunkAt(x, z) { return this.records.get(this.chunkIdAt(x, z)) || null; }

  /** Widen or narrow full residency, in metres. M1's car raises this to
   *  CFG.world.fog.farDrive; a test can raise it past CFG.world.tiers[1].radius to
   *  exercise tier 2, which M0's 364 m ring never reaches. */
  setViewRing(metres) {
    this.viewRing = Math.max(CHUNK * 2, Math.min(+metres || DEFAULT_RING_M, 2600));
    return this.viewRing;
  }

  /** donor: Projects/filament/src/world/terrain.js:149 (buildAllPending). Drains the
   *  whole queue with no budget — for tests and for a deterministic screenshot. */
  buildAllPending(limit = 4096) {
    let n = 0;
    while (this.queue.length && n < limit) {
      // Always takes in-flight work back: "drain the queue now" cannot mean "and then wait
      // 90 frames for a worker", least of all in the screenshot path.
      const e = this._nextSyncEntry(true);
      if (!e) break;
      this.queued.delete(e.key);
      this.inflight.delete(e.key);
      this._finalize(buildChunkData(e.cx, e.cz, e.tier, this._buildOpts()));
      this._stats.syncBuilds++;
      n++;
    }
    return n;
  }

  /** Rebuild every resident chunk's ground at its current tier, right now, with no budget.
   *  For the ART.md 3.1 A/B (see the note in _shadeGround) and for a deterministic
   *  screenshot after a live tune. Identity, trees and colliders all survive: _finalize on
   *  an existing key is a re-tier, which swaps geometry and emits no bus event. */
  rebuildAll() {
    let n = 0;
    for (const rec of Array.from(this.records.values())) {
      this._finalize(buildChunkData(rec.cx, rec.cz, rec.tier, this._buildOpts()));
      n++;
    }
    this._recount();
    return n;
  }

  /** Live A/B tuning, per engine's ctx.tune contract. `{ world: { ring: metres } }` is the
   *  only knob that means anything here — everything else is CFG and CFG is frozen. */
  config(patch) {
    const w = patch && patch.world;
    if (w && w.ring !== undefined) this.setViewRing(w.ring);
  }

  stats() { if (this._dirtyCount) this._recount(); return this._stats; }

  state() {
    if (this._dirtyCount) this._recount();
    return {
      chunks: this.records.size,
      visible: this._stats.visible,
      queued: this.queued.size,
      inflight: this.inflight.size,
      deterministic: this._deterministic(),
      tris: this._stats.tris,
      ring: this.viewRing,
      worker: this.workerReady ? 'ready' : this.workerNote,
      built: this._stats.built,
      disposed: this._stats.disposed,
      rebuilt: this._stats.rebuilt,
    };
  }

  notes() { return this._notes; }

  ready() {
    const t = this._sys('terrain');
    if (!t || typeof t.heightAt !== 'function') return false;
    // A real wiring check, not a tautology: the boot ring must actually stand, or flora
    // gets nothing to plant and its 1.5 s fallback fires.
    return !!this.group && this.records.size > 0 && !!this.matGround;
  }

  dispose() {
    if (this.worker) { try { this.worker.terminate(); } catch (e) { /* gone */ } this.worker = null; }
    this.workerReady = false;
    for (const rec of Array.from(this.records.values())) this._releaseMeshes(rec);
    this.records.clear();
    this.queue.length = 0;
    this.queued.clear();
    this.inflight.clear();
    this.inbox.length = 0;
    this.activate.length = 0;
    this._keyCache.clear();
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
    if (this.matGround) { this.matGround.dispose(); this.matGround = null; }
    if (this.matRoad) { this.matRoad.dispose(); this.matRoad = null; }
    if (this.roadTex) { this.roadTex.dispose(); this.roadTex = null; }
    if (this.groundTex) { this.groundTex.dispose(); this.groundTex = null; }
    this.group = null;
  }

  /* ---------------------------------------------------------------- */

  _sys(id) {
    const s = this.ctx && this.ctx.systems;
    return (s && typeof s.get === 'function') ? s.get(id) : null;
  }

  _note(msg) {
    this._notes.push(msg);
    if (this._notes.length > 32) this._notes.shift();
  }
}

function sortByD2(a, b) { return a.d2 - b.d2; }

export default Chunks;
