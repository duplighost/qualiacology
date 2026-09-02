// CURFEW — places (manifest #10). Destinations, discovery, claiming, beacons, and the map
// that fills up.
//
// This system owns WHERE YOU ARE GOING. Alex's brief asks for two things at once: a county
// with real destinations in it, and something interesting in the distance you want to walk
// toward, at every moment, from the first frame. Those are the same problem seen from two
// distances, and this file answers both with the same objects.
//
// FOUR THINGS IT DOES
//
// 1. THE LANDMARK NODE — one persistent, never-distance-culled Group per major.
//    CFG.render.far is 900 m and CFG.world.fog.density 0.0075 puts a solid wall of fog at
//    roughly 300 m. A cathedral 1.2 km away is therefore BOTH clipped and fogged: building
//    it at its true position and hoping is exactly the working-but-illegible failure this
//    catalogue keeps shipping. So each landmark is drawn at its true position while it is
//    inside PROXY_R, and beyond that at PROXY_R along the TRUE BEARING, scaled by
//    PROXY_R / distance. Scale and position are IDENTICAL at the crossover, so there is no
//    pop, no second copy and no far plane to fall off. Its material is fog:false with a
//    manual, FLOORED distance tint — a fog that darkens but never erases, the same
//    shadow-protected reasoning as CFG.render.grade.contrastFrom.
//    donor: Projects/curfew/donors/hallowind/src/world.js — the fog-free silhouette ring,
//      re-anchored to the real POI positions instead of a decorative circle.
//
// 2. BEACONS. An unclaimed major casts a tall region-coloured column. That is the whole
//    of the wayfinding: no minimap, no HUD marker, no arrow. It dies on a real claim.
//    donor: Projects/qualiacology/skyshard/src/world/destinations.js:95-107 (`_beacon`),
//      read 2026-09-02: an open tapered cylinder, additive, opacity 0.16, fog:false,
//      92 m for a major. Ported with the taper moved into the vertex colours so one
//      material serves twelve beacons.
//
// 3. DISCOVERY AND CLAIMING. At 24 m a place whispers its name ONCE — a sound, never a
//    caption — and is found forever. Claiming is the place's own condition (throw the
//    breaker, ring the bell, light the lamp) and it changes the world PHYSICALLY: the beam
//    turns, the mast blinks white instead of red, the windows light, the wheel moves.
//    Never a counter. The only place a number is written down is the map board at the
//    Filling Station, which gains a pin.
//
// 4. MINOR SITES every 120-220 m of road, rationed so no two of a kind sit next to each
//    other and nothing waits forever.
//    donor: Projects/eaten-path/src/world/world.js:103-142 (`_chooseKind`) — since-counters,
//      starvation guards, and the never-stack-two-clearings rule, read 2026-09-02.
//
// LAWS OBSERVED HERE
//   - NO LIGHT IS EVER CREATED. Every glow in this file is additive geometry. The one real
//     light any of it uses is a 1.4 s rover borrowed from lights.borrow() when you claim
//     something, and it is released by its own ttl.
//   - Colliders are emitted INSIDE the build, by the builder, in the same statement as the
//     wall (see sites.js). They are bucketed under a 'place:' chunk id of our own so that
//     nobody else's removeChunk can take them and ours cannot take anybody else's.
//   - Randomness comes from ctx.rng.fork and nowhere else; every beat is dt-scoped rather
//     than timer-scoped, so a test can step to it; nothing is allocated in step() or
//     present(). (Naming the two banned globals in this comment is what tests/syntax.mjs
//     was failing on: it greps the file, comments included, and it is right to.)
//   - Sibling systems are read LAZILY, at use, never captured at construction.

import * as THREE from 'three';
import CFG from '../config.js';
import { Rng, TAU, clamp, clamp01, lerp, noise1D, smoothstep } from '../engine/math.js';
import {
  MAJORS, MAJOR_BY_ID, MINOR_KINDS, MINOR_SPACING, MINOR_OFFSET, REGION_TINT, DEFAULT_TINT,
} from './placedata.js';
import { BUILDERS, MINOR_BUILDERS, apron, beaconGeometry, GLOW } from './sites.js';

/* ==========================================================================
   Local constants.

   CFG has no `places` section and CFG is deep-frozen, so these live here as named
   locals with the reason beside each. Every one is written up as a request at the
   bottom of docs/HANDOFF.md; none of them is re-derived from a number CFG already owns.
   ========================================================================== */

// Where a landmark stops being itself and becomes its own silhouette. Chosen ABOVE the
// chunk residency ring (CFG.world.fog.farWalk + CFG.world.CHUNK = 364 m) so a destination's
// body has always been streamed out before its silhouette takes over.
const PROXY_R = 460;

// SKYSHARD's own numbers for a major's beacon (destinations.js:62, `_beacon(d, 92, 2.35)`).
const BEACON_H = 92;
// SKYSHARD's 2.35 was sized to an island. At 1.2 km across a 4 km county the proxy shrinks
// a beacon to PROXY_R/dist, and 2.35 came out ~2 px wide on a 1600-wide frame: present but
// not a thing you would walk toward. 4.2 measures ~4 px at the far corner and still reads as
// a column rather than a wall when you are standing under it.
const BEACON_R = 4.2;
const BEACON_OPACITY = 0.085;   // was 0.20, measured p50 112 against an open sky of 21.7.
// ART.md 0.3 row 8 says open sky is the lightest LARGE area in the frame; a 0.10% object at
// five times its value is not wayfinding, it is a bug the player reports. The region tint is
// also desaturated toward a value rather than a colour before it reaches the material: a
// linear R:G:B of 1 : 6.9 : 2.8 was by a distance the most saturated thing on screen, against
// ART.md 0.5's ration of saturation to the lamp, the aviation red, the embers and the glints.
const BEACON_DESAT = 0.55;
const BEACON_DIE_S = 1.6;         // FILAMENT's wakemix crossfade, so a claim reads as one beat

// Manual aerial perspective for the fog-free landmark materials. FLOORED, never zero:
// MARROW crushed its moonlit distance to unreadable black and it cost a whole round.
// ART.md 4.1 pins these: "Do not touch the tint floor." Measured consequence, and it is
// filed rather than fixed here — see docs/HANDOFF.md, "the landmark stone is 20, not 40-70".
const TINT_NEAR = 130, TINT_FAR = 880, TINT_FLOOR = 0.42, TINT_GLOW_FLOOR = 0.66;

/* ---------------------------------------------------- the horizon gain (ART 4.1) --
 * MEASURED 2026-09-02, unoccluded silhouette footprint at ~2 km, structure only (no
 * beacon, no glow), in pixels at 1600x900:
 *
 *   cathedral 114   weeping-mine 62   drowned-light 28   relay 21   hollow-mill 21
 *
 * The gate is 120. ART 4.1 is exact about the arithmetic: 77 m at 2000 m subtends
 * 0.0385 rad, which is 22 buffer rows and about two columns, and "a static two-pixel-wide
 * line is not something interesting in the distance. It is a dead pixel."
 *
 * The fix is NOT a 200 m cathedral. It is the matte-painting trick, applied only where
 * the landmark is already a proxy: beyond HZ_GAIN_FROM the silhouette's ANGULAR SIZE is
 * exaggerated, smoothly, up to HZ_GAIN_MAX. Three properties make it safe:
 *
 *   1. HZ_GAIN_FROM (560) is ABOVE PROXY_R (460), so the proxy handover is still the exact
 *      identity. No pop, no seam, no second copy — the law in this file's header stands.
 *   2. The BASE is the anchor, not the origin. node.y carries an s*padY*(1-g) term so the
 *      landmark's foot keeps its true elevation angle and the structure grows UPWARD out of
 *      the ground. Scaling about the node origin instead would have sunk a valley-floor
 *      landmark hundreds of pixels below the horizon.
 *   3. Apparent size is still MONOTONIC in distance: it goes as g(d)/d, and g' * d < g
 *      everywhere on this curve (checked at 800 / 1000 / 1230 / 1900), so a landmark never
 *      grows as you walk away from it. That is the failure this trick is famous for.
 */
const HZ_GAIN_FROM = 560;
const HZ_GAIN_FULL = 1900;
const HZ_GAIN_MAX = 2.05;

/* ------------------------------------------------- the sight corridors (ART 4.3) --
 * Gate table row 20 had never been measured. It has now: sampling 40 road points per
 * horizon major, the landmark cleared "30 px at 25 contrast" at ONE point in two hundred.
 * 0.5%, against a target of 60%.
 *
 * The physics of the failure, measured rather than argued: at 2 km a landmark's top sits
 * about 4 degrees above the horizon even after the gain above, and a 20 m tree blocks 4
 * degrees out to 20 / tan(4) = 286 m. So EVERY tree within ~300 m along the bearing has to
 * be out of the way, which is not a corridor you can carve at every point of the road
 * network without deforesting the county.
 *
 * What you can do is author the six best ones per landmark and make them the ones where the
 * ROAD ALREADY POINTS AT IT — you round a bend and the cathedral is at the end of the road.
 * Those corridors overlap the asphalt, where CFG.roads.plantExclude has already cleared the
 * verge, so they cost the forest the least and read the best. SIGHT_PER_MAJOR x 5 majors x
 * (2 * SIGHT_HALFW * SIGHT_LEN) is about 3% of the county, not 16%.
 *
 * This file OWNS the corridors and publishes them; it cannot plant or unplant a tree.
 * flora.js has to call sightClear(). That request is in docs/HANDOFF.md and until it
 * lands these corridors are measured and inert.
 */
const SIGHT_HALFW = 26;        // m either side of the bearing
const SIGHT_LEN = 340;         // m from the road point toward the landmark; 286 + margin
const SIGHT_MIN = 220;         // closer than this and you are inside the yard anyway
const SIGHT_MAX = 2000;
const SIGHT_PER_MAJOR = 6;
const SIGHT_APART = 300;       // m between two corridors on the same landmark
const SIGHT_CELL = 16;         // m; the marking grid, one byte per cell

// DESIGN section 2's horizon reads, verbatim.
const BEAM_RATE = 0.22;           // rad/s, the lighthouse sweep
const SAIL_RATE = 0.42;           // rad/s; a dead mill still turns in the wind
const WHEEL_RATE = 0.90;          // rad/s, the headframe once the winding house has power
const BELL_PERIOD_S = 180;        // "the bell rings on the hour" until a clock exists
const BELL_SWING_S = 5.0;

const CLAIM_FLASH_S = 1.4;        // the rover a claim borrows, then releases by ttl
const NEAR_HYSTERESIS = 12;       // metres, so place:near cannot chatter on a boundary
const MAJOR_KEEPOUT = 70;         // no minor site inside this of a major

/* ------------------------------------------------ the destination loop (WARNING 41) --
 * MEASURED 2026-09-02, tests/world-game.mjs: the player is teleported to 8 m from the
 * Filling Station, settles 240 frames, walks, settles again — and ends ONE METRE from it
 * having seen place:near fire ZERO times and place:discovered fire ZERO times. The whisper
 * radius is 24 m. Since "destinations and a map that fills up" is one of the four things
 * Alex asked for by name, and there is no minimap and no quest log by design, that IS the
 * progression loop reading as dead.
 *
 * The system was not dead. Both of its events had already been consumed BEHIND THE
 * LOADING SCREEN, at the spawn point, before anything in the game was listening. Three
 * separate causes, each of which is a bug on its own terms:
 *
 *   1. main.js runs NINETY fixed steps during boot (main.js:513, "first steps") so the
 *      chunk ring and its shaders exist before the player clicks Go Outside. The player
 *      stands at -509, 247 for all of them, which is 13.0 m from the Filling Station —
 *      inside its 24 m whisper radius and inside its 80 m near band. So the whole
 *      destination loop ran, latched and finished while the shell still covered the
 *      canvas. Worse than invisible: the whisper is the ONLY thing discovery produces,
 *      and a whisper scheduled before the player's first click goes into a suspended
 *      AudioContext and is silence forever. Nothing here may fire until ctx.ready.
 *   2. `place:near` was an EDGE. It fired once, on entry, and then never again however
 *      long you stood there. progression/progress.js:460 gates its hub banking on that
 *      payload and its own `_tryBank` is already cooldown-gated (progress.js:834), so the
 *      consumer wants a state BROADCAST and was handed a one-shot. It is a heartbeat now.
 *   3. `startClaimed` also wrote the hub into `found`, so the place you wake in could
 *      never be discovered at all. See placedata.js.
 *
 * NEAR_REPEAT_S is the heartbeat. ARRIVE_JUMP_M is what makes discovery ARRIVAL rather
 * than containment: at boot you are PLACED in the world and nothing fires, but any later
 * discontinuity — a teleport, a respawn, stepping out of the car somewhere else — is an
 * arrival, and every band you are standing in is re-entered. 2.5 m in one 1/60 step is
 * 150 m/s, which is faster than the player, faster than the car, and larger than any
 * collision recovery; the dt term keeps that true if a test steps with a coarser dt.
 */
const NEAR_REPEAT_S = 0.5;
const ARRIVE_JUMP_M = 2.5;
const ARRIVE_JUMP_SPEED = 120;    // m/s; the dt-scaled floor under ARRIVE_JUMP_M

const CHUNK = CFG.world.CHUNK;

/* ---------------------------------------------------------------- scratch -- */
// The hot path allocates nothing. Everything below is module-scope and reused.
const _col = new THREE.Color();
// place:near carries the WHOLE place, not just its id. progression/progress.js reads
// `lit` and `hub` off this payload to decide whether standing here banks your XP, and a
// payload of {id} meant that beat could never fire. Every field is a scalar, reused.
const _nearPayload = {
  id: '', name: '', major: true, lit: false, hub: false,
  x: 0, z: 0, discovered: false, claimed: false,
};
const _foundPayload = { id: '', xp: 0 };
const _claimPayload = { id: '', xp: 0 };
const _xpPayload = { amount: 0, x: 0, y: 0, z: 0, reason: '' };
const _noisePayload = { x: 0, z: 0, radius: 0, source: '' };
const _v2 = { x: 0, z: 0 };
const _minorW = new Float64Array(MINOR_KINDS.length);

/**
 * Advance one moving prop's angle, keeping prev and curr for present(alpha).
 *
 * The sails, the winding wheel, the lighthouse beam and the bell are the only things in
 * the county that move continuously, which makes them exactly what a player watches from
 * a distance — so they are the ones a 144 Hz monitor would judder. Wrapping subtracts TAU
 * from BOTH ends so the prev->curr delta survives the wrap and a lerp across it cannot
 * spin the sails backwards for one frame. Module scope: a closure per step is an
 * allocation in the hot path.
 */
function advanceAngle(mv, delta) {
  mv.prev = mv.curr;
  let c = mv.curr + delta;
  if (c > TAU) { c -= TAU; mv.prev -= TAU; }
  else if (c < -TAU) { c += TAU; mv.prev += TAU; }
  mv.curr = c;
}

/* ==========================================================================
   The system
   ========================================================================== */

export class Places {
  static id = 'places';

  constructor(ctx) {
    this.ctx = ctx;
    // A per-build Rng is minted from a STABLE name hash rather than taken from a cached
    // fork: ctx.rng.fork() returns the same stream every time, so a chunk that streamed out
    // and back would rebuild a DIFFERENT building. Determinism across rebuilds is the point.
    this.baseSeed = (ctx && ctx.rng ? ctx.rng.fork('places').seed : 20260902) >>> 0;

    this.group = null;            // streamed bodies
    this.landGroup = null;        // persistent landmarks + beacons, never distance-culled
    this.nodes = new Map();       // id -> landmark node record
    this.bodies = new Map();      // chunkKey -> [ body record ]
    this.minors = [];             // authored minor table
    this.minorsByChunk = new Map();
    this._roadPts = null;         // cached centreline trace, shared by minors and sight
    this._sightGrid = null;       // Uint8Array, 16 m cells; ART 4.3's plant exclusion
    this._sightList = null;
    this._sightN = 0;
    this._sightHalf = 0;
    this.found = new Set();
    this.claimed = new Set();
    this.near = null;             // id of the major we are currently "at"
    // Discovery is ARRIVAL, not containment: `_inside` is the set of whisper radii the
    // player is standing in WITHOUT having walked in, so a crossing can be told from a
    // placement. See the WARNING 41 block above and _proximity() below.
    this._inside = new Set();
    this._placed = false;         // has the boot handover been recorded yet
    this._lastPx = 0; this._lastPz = 0;
    this._nearT = 0;              // the place:near heartbeat
    this._nearFlags = -1;         // found/claimed bits last broadcast, so a change re-fires
    this._whisperQ = [];
    this._notes = [];
    this._pinsDirty = false;
    this._board = null;
    this._silentNoted = false;
    this._bellClockSeen = false;
    this._t = 0;
    this._nodeList = [];          // flat: iterating a Map allocates an iterator per frame
    this._flickers = [];          // body glows that breathe (the dying headlight)
    this._built = false;
    this._initDone = false;
    this.flatsRegistered = false;
    this.flatSeam = 0;            // worst measured pad/road disagreement, metres

    // --- bus, before anything can fire ------------------------------------
    // flora.js:500-504 subscribes in its constructor for exactly this reason: chunks (#8)
    // is built before us and can have emitted already by the time init() runs.
    if (ctx && ctx.bus && ctx.bus.on) {
      ctx.bus.on('chunk:built', (p) => { if (p) this.buildChunk(p.cx, p.cz, p.id); });
      ctx.bus.on('chunk:disposed', (p) => { if (p) this.disposeChunk(p.id); });
      ctx.bus.on('weapon:hit', (p) => { if (p) this._onShot(p); });
      ctx.bus.on('phase:changed', () => { this._bellClockSeen = true; this._ringBells(); });
    }
  }

  _note(s) { if (this._notes.length < 40) this._notes.push(s); }

  /** A fresh, deterministic Rng for one build. Same name -> same stream, every time, so a
   *  chunk that streams out and back rebuilds the identical site. */
  _forkFor(name) {
    let h = 2166136261;
    for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
    return new Rng((this.baseSeed ^ (h >>> 0)) >>> 0);
  }

  _sys(id) {
    const s = this.ctx && this.ctx.systems;
    return s ? s.get(id) : null;
  }

  /* ------------------------------------------------------------------ *
   * FLATS. Called from init(), with the rest of this lane's sibling reads.
   *
   * terrain.addFlat() levels heightAt() itself, so the mesh, the collision solver, the
   * planting exclusion and hitscan all agree about where the yard is. Three of the twelve
   * reuse a disc roads.js already authored, so only nine discs are registered here.
   *
   * WARNING 27, fixed. This used to run in the CONSTRUCTOR — the one deliberate
   * violation of read-siblings-lazily in this file — with a long argument for why the
   * constructor was the only moment that existed. Two things retired that argument:
   * terrain.addFlat is now IDEMPOTENT BY ID and terrain.ready() is now a LOWER BOUND
   * rather than an equality (terrain.js:528), so registering late can neither
   * double-flatten nor fail the boot guard. It reads its sibling at use like everything
   * else in this file.
   *
   * WE DO NOT ROLL BACK. The old body truncated terrain's own FLATS array when ready()
   * refused, which reached inside another module's state to undo work the world lane is
   * about to honour. If the guard ever refuses, that is filed as a note and the game
   * boots with the pads still registered — a disc terrain declines to bless is still a
   * disc terrain is levelling.
   *
   * MEASURED 2026-09-02: relief inside an 18 m building footprint is 0.07 m with the pads
   * and up to 7.44 m without them, which is a cathedral standing on a hillside.
   *
   * ONE ORDERING CONSEQUENCE, MEASURED RATHER THAN ASSUMED (see docs/HANDOFF.md).
   * roads.js bakes its smoothed spline elevations in ITS init() (manifest #6) off
   * terrain's roadBase, which is macro + FLATS. Registering here (#10) means those
   * elevations no longer see our nine discs, so where a pad's level core reaches the
   * asphalt the road and the yard can disagree about the ground. _measureSeam() below
   * measures that disagreement at every pad and puts the worst number in state(), so a
   * seam is a number somebody can read instead of a cliff somebody walks into.
   * ------------------------------------------------------------------ */
  _registerFlats() {
    const terrain = this._sys('terrain');
    if (!terrain || typeof terrain.addFlat !== 'function') {
      this._note('terrain.addFlat unavailable: majors stand on their aprons only');
      return;
    }
    let added = 0;
    for (let i = 0; i < MAJORS.length; i++) {
      const d = MAJORS[i];
      if (!d.flat) continue;                       // reuses a disc roads.js already authored
      // `radius` is addFlat's own field name (terrain.js:233 reads radius then r).
      terrain.addFlat({
        id: 'place-' + d.id, x: d.x, z: d.z, radius: d.flat.radius, blend: d.flat.blend,
      });
      added++;
    }
    if (!added) { this.flatsRegistered = true; return; }

    // Verify by ID, never by counting: flatCount() is terrain's number and the array it
    // returns is terrain's state. hasFlat() answers "is MY pad in there" without either.
    let missing = 0;
    if (typeof terrain.hasFlat === 'function') {
      for (let i = 0; i < MAJORS.length; i++) {
        const d = MAJORS[i];
        if (d.flat && !terrain.hasFlat('place-' + d.id)) missing++;
      }
    }
    this.flatsRegistered = missing === 0;
    if (missing) this._note(missing + ' of ' + added + ' destination pads did not register');

    let ok = true;
    try { ok = typeof terrain.ready !== 'function' || !!terrain.ready(); } catch (e) { ok = false; }
    if (!ok) {
      this._note('terrain.ready() is false after ' + added + ' destination pads were added ('
        + (typeof terrain.flatCount === 'function' ? terrain.flatCount() : '?')
        + ' discs registered). NOT rolled back — filed, see docs/HANDOFF.md.');
    }
    this._measureSeam(terrain);
  }

  /**
   * How far apart do the pad and the road think the ground is? Sampled once, at boot, at
   * the point where each pad's nearest road crosses it: heightAt on the centreline (which
   * roads.js has blended to its own smoothed spline y) against heightAt one disc-radius
   * out along the same lateral. A number, not a hope. Allocates a handful of scalars in
   * init and nothing afterwards.
   */
  _measureSeam(terrain) {
    const roads = this._sys('roads');
    if (!roads || typeof roads.nearestRoadInfo !== 'function' || !terrain.heightAt) return;
    let worst = 0, worstId = '';
    for (let i = 0; i < MAJORS.length; i++) {
      const d = MAJORS[i];
      if (!d.flat) continue;
      const info = roads.nearestRoadInfo(d.x, d.z, d.flat.radius + 8);
      if (!info || !info.hit) continue;            // the road never reaches this disc
      const rx = info.x, rz = info.z;              // shared scratch: copy before the next call
      const lx = rx - d.x, lz = rz - d.z;
      const len = Math.hypot(lx, lz) || 1;
      const onRoad = terrain.heightAt(rx, rz);
      const off = terrain.heightAt(rx + lx / len * 9, rz + lz / len * 9);
      const seam = Math.abs(onRoad - off);
      if (seam > worst) { worst = seam; worstId = d.id; }
    }
    this.flatSeam = worst;
    if (worst > 1.5) {
      this._note('pad/road seam ' + worst.toFixed(2) + ' m at ' + worstId
        + ': roads.js baked its spline elevations in its own init (#6), before these pads '
        + 'existed (#10). See docs/HANDOFF.md.');
    }
  }

  /* ------------------------------------------------------------------ *
   * boot
   * ------------------------------------------------------------------ */
  async init() {
    // FIRST, before anything in this file samples a height: every pad below changes
    // terrain.heightAt, and rec.padY, the aprons and the minor table are all read off it.
    this._registerFlats();

    this._ensureBuilt();

    // Face every destination at the road that reaches it. Computed once, from the real
    // road field, rather than typed into placedata by eye — roads.js is the authority on
    // where its own asphalt is and the two can never disagree this way.
    const roads = this._sys('roads');
    const terrain = this._sys('terrain');
    for (const d of MAJORS) {
      const rec = this.nodes.get(d.id);
      if (!rec) continue;
      let yaw = 0;
      const p = this._roadPointFor(d);
      if (p) yaw = Math.atan2(p.x - d.x, p.z - d.z);   // the front (-Z local) faces the road
      rec.yaw = yaw;
      rec.padY = terrain && terrain.heightAt ? terrain.heightAt(d.x, d.z) : 0;
      rec.node.position.set(d.x, 0, d.z);
      rec.node.rotation.y = yaw;
    }

    // Landmarks: built ONCE, into a group that is never streamed and never culled.
    for (const d of MAJORS) this._buildLandmark(d);

    // The minor table. Traced along the real road field, then rationed in arc order.
    this._buildMinorTable();

    // The sight corridors, if nothing has asked for them yet. Same trace, no second walk.
    if (!this._sightGrid) this._buildSightGrid();

    // Flat lists for the hot path. main.js builds stepList/presentList the same way and for
    // the same reason: a Map iterator is an allocation, once per frame, forever.
    this._nodeList = [];
    for (const d of MAJORS) { const r = this.nodes.get(d.id); if (r) this._nodeList.push(r); }

    // Everything a body needs (pad, heading, minor table) now exists.
    this._initDone = true;

    // Catch chunks that already exist — chunks (#8) builds its boot ring inside its own
    // init(), which ran before ours (flora.js:511-520 does the same sweep).
    const chunks = this._sys('chunks');
    if (chunks && typeof chunks.forEachResident === 'function') {
      chunks.forEachResident((a, b, c) => {
        if (a && typeof a === 'object') this.buildChunk(a.cx, a.cz, a.id);
        else if (typeof a === 'string') this.buildChunk(b, c, a);
      });
    }

    // The Filling Station is where you wake up: it is yours already and it is lit. It is
    // NOT found — `startClaimed` used to add the id to both sets, which meant the one
    // place the player is standing in at the first frame could never be discovered, never
    // whisper its name, and put the map board's first pin in before the player had walked
    // anywhere. Claimed is claimed; found is walked into. See placedata.js.
    for (const d of MAJORS) {
      if (d.startClaimed) this.claimed.add(d.id);
    }
    this._applyState();
  }

  /** Shared out-param for roads.nearestRoadPoint, which writes through `.set(x, z)`. */
  _roadPointFor(d) {
    const roads = this._sys('roads');
    if (!roads) return null;
    if (typeof roads.nearestRoadInfo === 'function') {
      const info = roads.nearestRoadInfo(d.x, d.z, 96);
      if (info && info.hit) { _v2.x = info.x; _v2.z = info.z; return _v2; }
      return null;
    }
    if (typeof roads.nearestRoadPoint === 'function') {
      const out = { x: 0, z: 0, set(x, z) { this.x = x; this.z = z; } };
      if (roads.nearestRoadPoint(d.x, d.z, out)) { _v2.x = out.x; _v2.z = out.z; return _v2; }
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Materials and groups. THREE materials, and the reason there are exactly three:
   *
   *   matBody  Lambert + vertexColors + dithering + fog. Identical in every
   *            program-defining respect to chunks.js's `matGround`, so it costs NO new
   *            shader program. Colour variety rides in the vertex attribute.
   *   matLand  the same, minus fog. `fog` IS a define, so this is +1 program and it is
   *            the price of a landmark that survives 1.2 km. Cloned per landmark, because
   *            each one carries its own distance tint in material.color; clones share the
   *            program.
   *   matGlow  Basic + vertexColors, no fog, additive, no depth write. +1 program. Every
   *            lamp, window, ember, beam and beacon in the county is this one material
   *            cloned, tinted by material.color and faded by material.opacity.
   *
   * Both new programs are linked at BOOT, because the landmark group is in the scene
   * before main.js's warm() pass runs. Zero programs link during play, which is the law
   * that actually matters (docs/CONTRACT.md, decision 26).
   * ------------------------------------------------------------------ */
  _ensureBuilt() {
    if (this._built) return;
    this._built = true;

    this.matBody = new THREE.MeshLambertMaterial({
      vertexColors: true, dithering: true,
      // DoubleSide because a merged kit contains single-sided quads (posters, windows,
      // signs) whose facing is authored by hand and a wrong one would be an invisible
      // prop. shadowSide keeps the depth pass single-sided so shadow acne stays away.
      side: THREE.DoubleSide, shadowSide: THREE.FrontSide,
    });
    this.matBody.name = 'place-body';

    this.matLand = new THREE.MeshLambertMaterial({
      vertexColors: true, dithering: true, fog: false,
      side: THREE.DoubleSide, shadowSide: THREE.FrontSide,
    });
    this.matLand.name = 'place-landmark';

    this.matGlow = new THREE.MeshBasicMaterial({
      vertexColors: true, fog: false, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.matGlow.name = 'place-glow';

    const scene = this.ctx && this.ctx.scene;
    this.group = new THREE.Group();
    this.group.name = 'places';
    this.landGroup = new THREE.Group();
    this.landGroup.name = 'places-landmarks';
    if (scene) { scene.add(this.group); scene.add(this.landGroup); }
    else this._note('ctx.scene missing at places init: nothing will be visible');

    // Node records, one per major. The node itself is added in _buildLandmark.
    for (const d of MAJORS) {
      const node = new THREE.Group();
      node.name = 'place-' + d.id;
      node.matrixAutoUpdate = true;
      this.nodes.set(d.id, {
        def: d, node, yaw: 0, padY: 0,
        solid: null, glow: null, beacon: null,
        moving: null,              // [{ mesh, role, rate }]
        glowLevel: d.startClaimed ? 1 : 0.30,
        beaconLevel: d.startClaimed ? 0 : 1,
        proxy: false,
        bellT: -1, bellClock: BELL_PERIOD_S * 0.6,
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Landmarks — built once, live forever.
   * ------------------------------------------------------------------ */
  _buildLandmark(d) {
    const rec = this.nodes.get(d.id);
    if (!rec || rec.solid || rec.beacon) return;
    const B = BUILDERS[d.kind];
    const api = this._apiFor(d, rec, 'landmark');

    let out = null;
    if (B && typeof B.landmark === 'function') {
      try { out = B.landmark(api); } catch (e) { this._note('landmark ' + d.id + ' threw: ' + e.message); }
    }

    if (out && out.solid) {
      const m = new THREE.Mesh(out.solid, this.matLand.clone());
      m.name = 'land-' + d.id;
      m.castShadow = false;          // a 77 m spire is never inside the 70 m shadow radius
      m.receiveShadow = true;
      m.frustumCulled = false;       // never distance-culled: that is the whole point
      rec.node.add(m);
      rec.solid = m;
    }
    if (out && out.glow) {
      const g = new THREE.Mesh(out.glow, this.matGlow.clone());
      g.name = 'land-glow-' + d.id;
      g.frustumCulled = false;
      g.material.color.set(out.glowColour || GLOW.lamp);
      g.renderOrder = 4;
      rec.node.add(g);
      rec.glow = g;
    }
    if (out && out.moving && out.moving.length) {
      rec.moving = [];
      for (const mv of out.moving) {
        if (!mv || !mv.geo) continue;
        // 'brazier' is a glow that does not turn — the guttering fire ART 4.2 asks for at
        // the cathedral's spire tip, on this same shared additive material. No new light.
        const isGlow = mv.role === 'beam' || mv.role === 'brazier';
        const mat = isGlow ? this.matGlow.clone() : this.matLand.clone();
        if (isGlow) { mat.color.set(mv.colour || GLOW.white); mat.opacity = 0; }
        const mesh = new THREE.Mesh(mv.geo, mat);
        mesh.name = 'land-' + mv.role + '-' + d.id;
        mesh.position.set(mv.x, mv.y, mv.z);
        mesh.frustumCulled = false;
        if (isGlow) mesh.renderOrder = 4;
        rec.node.add(mesh);
        // The rates live HERE, not in the builders: they are DESIGN section 2's numbers for
        // the horizon reads and they belong next to the other tuning in this file.
        const rate = mv.role === 'beam' ? BEAM_RATE
          : mv.role === 'sails' ? SAIL_RATE
            : mv.role === 'wheel' ? WHEEL_RATE : (mv.rate || 0);
        // prev/curr, because these four ARE the moving things in the county: the mesh's
        // rotation is written only in present(alpha), never in step().
        rec.moving.push({ mesh, role: mv.role, rate, glow: isGlow, prev: 0, curr: 0 });
      }
    }

    // The beacon. Only an UNCLAIMED major casts one, and it is the only wayfinding in
    // CURFEW. Its geometry is authored from the pad up so the proxy transform (which
    // scales about the node origin) shrinks it correctly with everything else.
    if (!d.startClaimed) {
      // Authored from the pad up, and DEEP enough that the proxy transform — which scales
      // about the node origin — cannot lift its base off the ground. A 2 km beacon becomes a
      // 21 m stub under the proxy scale, and a stub you can see both ends of, floating at
      // chest height, is a decal rather than a landmark. Sinking the foot means the bottom is
      // always below the horizon whatever the scale does to it.
      const bg = beaconGeometry(BEACON_H, BEACON_R);
      bg.translate(0, rec.padY - 24, 0);
      const bm = this.matGlow.clone();
      bm.color.set(REGION_TINT[d.region] || DEFAULT_TINT);
      // Pull it most of the way to its own luminance. The region still reads — a claimed
      // county should not look identical to an unclaimed one — but as a tinted light rather
      // than as a saturated bar.
      {
        const c = bm.color, y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
        c.setRGB(c.r + (y - c.r) * BEACON_DESAT, c.g + (y - c.g) * BEACON_DESAT,
          c.b + (y - c.b) * BEACON_DESAT);
      }
      bm.opacity = BEACON_OPACITY;
      const beacon = new THREE.Mesh(bg, bm);
      beacon.name = 'beacon-' + d.id;
      beacon.frustumCulled = false;
      beacon.renderOrder = 3;
      rec.node.add(beacon);
      rec.beacon = beacon;
    }

    this.landGroup.add(rec.node);
  }

  /* ------------------------------------------------------------------ *
   * The builder api. LOCAL coordinates in, world colliders out.
   *
   * A builder never sees world space. `emit` takes a shape in the site's own yawed frame
   * and rotates it out, so the collider and the geometry it belongs to can never disagree
   * about where the wall is — which is the whole class of bug VANTA's invisible wall came
   * from, seen from the other side.
   * ------------------------------------------------------------------ */
  _apiFor(d, rec, phase, chunkId) {
    const terrain = this._sys('terrain');
    const collision = this._sys('collision');
    const cy = Math.cos(rec.yaw), sy = Math.sin(rec.yaw);
    const ox = d.x, oz = d.z;
    const canCollide = !!(collision && typeof collision.addCollider === 'function');
    if (!canCollide && phase === 'body') this._note('collision.addCollider missing: ' + d.id + ' is walk-through');
    const heightAt = (terrain && terrain.heightAt) ? (x, z) => terrain.heightAt(x, z) : () => rec.padY;
    const self = this;
    return {
      site: d,
      padY: rec.padY,
      yaw: rec.yaw,
      rng: this._forkFor(d.id + ':' + phase),
      heightAt,
      wx(lx, lz) { return ox + lx * cy + lz * sy; },
      wz(lx, lz) { return oz - lx * sy + lz * cy; },
      emit(shape) {
        if (!canCollide || !shape) return -1;
        const lx = +shape.x || 0, lz = +shape.z || 0;
        // The site group is rotated by rec.yaw, so a local shape composes with it. Three's
        // rotateY and collision's OBB yaw use the same convention (verified against
        // collision.js:565, `lx = c*dx - s*dz`), so the world yaw is a plain sum.
        const w = {
          kind: shape.kind, tag: shape.tag, standable: shape.standable,
          x: ox + lx * cy + lz * sy,
          z: oz - lx * sy + lz * cy,
          y0: shape.y0, y1: shape.y1,
        };
        if (shape.kind === 'obb') {
          w.halfX = shape.halfX; w.halfZ = shape.halfZ;
          w.yaw = (+shape.yaw || 0) + rec.yaw;
        } else {
          w.r = shape.r;
        }
        return collision.addCollider(w, chunkId || ('place:' + d.id));
      },
      _self: self,
    };
  }

  /* ------------------------------------------------------------------ *
   * Streaming — bodies and minors ride the chunk ring, exactly as flora does.
   * ------------------------------------------------------------------ */
  buildChunk(cx, cz, chunkId) {
    // chunks (#8) builds its boot ring inside its own init(), which runs BEFORE ours, so
    // this fires with pad heights and headings not yet computed. Ignore it: init()'s
    // forEachResident sweep picks up everything that already exists (flora.js:511-520).
    if (!this._initDone) return;
    this._ensureBuilt();
    if (cx === undefined || cz === undefined) return;
    const key = chunkId !== undefined && chunkId !== null ? String(chunkId) : (cx + '|' + cz);
    if (this.bodies.has(key)) return;
    const list = [];
    this.bodies.set(key, list);

    // majors whose centre falls in this chunk
    for (const d of MAJORS) {
      if (Math.floor(d.x / CHUNK) !== cx || Math.floor(d.z / CHUNK) !== cz) continue;
      const b = this._buildBody(d, key);
      if (b) list.push(b);
    }
    // minors assigned to this chunk
    const mins = this.minorsByChunk.get(key);
    if (mins) for (let i = 0; i < mins.length; i++) {
      const b = this._buildMinor(mins[i], key);
      if (b) list.push(b);
    }
  }

  disposeChunk(chunkId) {
    const key = String(chunkId);
    const list = this.bodies.get(key);
    if (!list) return;
    this.bodies.delete(key);
    for (const b of list) {
      if (b.flicker) {
        const fi = this._flickers.indexOf(b);
        if (fi >= 0) { this._flickers[fi] = this._flickers[this._flickers.length - 1]; this._flickers.pop(); }
      }
      if (b.group) {
        this.group.remove(b.group);
        b.group.traverse((o) => {
          if (!o.isMesh) return;
          if (o.geometry) o.geometry.dispose();
          if (o.material && o.material !== this.matBody && o.material !== this.matGlow) o.material.dispose();
        });
      }
      if (b.id && this._board && this._board.siteId === b.id) this._board = null;
    }
    const collision = this._sys('collision');
    if (collision && typeof collision.removeChunk === 'function') collision.removeChunk('place:' + key);
  }

  _buildBody(d, chunkKey) {
    const rec = this.nodes.get(d.id);
    const B = BUILDERS[d.kind];
    if (!rec || !B || typeof B.body !== 'function') return null;
    const api = this._apiFor(d, rec, 'body', 'place:' + chunkKey);
    let out = null;
    try { out = B.body(api); } catch (e) { this._note('body ' + d.id + ' threw: ' + e.message); return null; }
    if (!out) return null;

    const g = new THREE.Group();
    g.name = 'place-body-' + d.id;
    g.position.set(d.x, 0, d.z);
    g.rotation.y = rec.yaw;

    // The apron: made ground at the pad level with a skirt down to the real terrain, so a
    // destination is level and its edge is closed whether or not its FLATS disc took.
    // The apron matches whatever disc this site actually stands on — its own, or the one
    // roads.js authored under it (M0_SITES radii are 46 / 38 / 30).
    let rad = d.flat ? d.flat.radius * 0.86 : 22;
    if (!d.flat && d.flatId) {
      const terrain = this._sys('terrain');
      const fl = terrain && terrain.flats ? terrain.flats() : null;
      if (fl) for (let i = 0; i < fl.length; i++) if (fl[i].id === d.flatId) { rad = fl[i].r * 0.86; break; }
    }
    const ap = apron(api, rad, null);
    if (ap) {
      const m = new THREE.Mesh(ap, this.matBody);
      m.name = 'apron-' + d.id;
      m.receiveShadow = true;
      g.add(m);
    }

    let glowMesh = null;
    if (out.solid) {
      const m = new THREE.Mesh(out.solid, this.matBody);
      m.name = 'body-' + d.id;
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    }
    if (out.glow) {
      glowMesh = new THREE.Mesh(out.glow, this.matGlow.clone());
      glowMesh.name = 'body-glow-' + d.id;
      glowMesh.material.color.set(out.glowColour || GLOW.lamp);
      glowMesh.renderOrder = 4;
      glowMesh.material.opacity = this.claimed.has(d.id) ? 1 : 0;
      glowMesh.visible = this.claimed.has(d.id);
      g.add(glowMesh);
    }
    this.group.add(g);

    const body = { id: d.id, group: g, glow: glowMesh, kind: 'major' };
    if (out.mapBoard) {
      this._board = { siteId: d.id, group: g, spec: out.mapBoard, mesh: null };
      this._pinsDirty = true;
    }
    return body;
  }

  _buildMinor(m, chunkKey) {
    const B = MINOR_BUILDERS[m.kind];
    if (!B) return null;
    const terrain = this._sys('terrain');
    const collision = this._sys('collision');
    const canCollide = !!(collision && typeof collision.addCollider === 'function');
    const cy = Math.cos(m.yaw), sy = Math.sin(m.yaw);
    const padY = terrain && terrain.heightAt ? terrain.heightAt(m.x, m.z) : 0;
    const api = {
      site: m, padY, yaw: m.yaw, age: m.age,
      rng: this._forkFor('minor:' + m.kind + ':' + m.i),
      heightAt: (x, z) => (terrain && terrain.heightAt ? terrain.heightAt(x, z) : padY),
      wx(lx, lz) { return m.x + lx * cy + lz * sy; },
      wz(lx, lz) { return m.z - lx * sy + lz * cy; },
      emit(shape) {
        if (!canCollide || !shape) return -1;
        const lx = +shape.x || 0, lz = +shape.z || 0;
        const w = {
          kind: shape.kind, tag: shape.tag, standable: shape.standable,
          x: m.x + lx * cy + lz * sy,
          z: m.z - lx * sy + lz * cy,
          y0: shape.y0, y1: shape.y1,
        };
        if (shape.kind === 'obb') { w.halfX = shape.halfX; w.halfZ = shape.halfZ; w.yaw = (+shape.yaw || 0) + m.yaw; }
        else w.r = shape.r;
        return collision.addCollider(w, 'place:' + chunkKey);
      },
    };
    let k = null;
    try { k = B(api); } catch (e) { this._note('minor ' + m.kind + ' threw: ' + e.message); return null; }
    if (!k) return null;

    const g = new THREE.Group();
    g.name = 'minor-' + m.kind;
    g.position.set(m.x, 0, m.z);
    g.rotation.y = m.yaw;
    const solid = k.solid && k.solid.build ? k.solid.build() : null;
    const glowGeo = k.glow && k.glow.build ? k.glow.build() : null;
    if (solid) {
      const mesh = new THREE.Mesh(solid, this.matBody);
      mesh.castShadow = true; mesh.receiveShadow = true;
      g.add(mesh);
    }
    let glowMesh = null;
    if (glowGeo) {
      glowMesh = new THREE.Mesh(glowGeo, this.matGlow.clone());
      glowMesh.material.color.set(GLOW.lamp);
      glowMesh.renderOrder = 4;
      g.add(glowMesh);
    }
    this.group.add(g);
    const body = { id: null, group: g, glow: glowMesh, kind: 'minor', minorKind: m.kind, flicker: !!k.flicker, seed: m.i };
    if (body.flicker && glowMesh) this._flickers.push(body);
    return body;
  }

  /* ------------------------------------------------------------------ *
   * The minor table.
   *
   * The road field is a distance function, not a list of points, so the centreline is
   * TRACED: snap to the nearest road point, step 8 m along its tangent, snap again. That
   * uses roads.js's own authority about where the asphalt is instead of re-deriving the
   * spline, and it works for the loop and both spurs without knowing which is which.
   *
   * roads.nearestRoadInfo returns SHARED scratch, so every field is read before the next
   * call. (roads.js says so in its own comment; flora.js was bitten by the equivalent.)
   * ------------------------------------------------------------------ */
  /**
   * Trace every route's centreline, once, and cache it. Flat [x, z, ...] with a (NaN, NaN)
   * pair between routes so nothing is ever placed across a discontinuity.
   *
   * Two callers now: the minor table (init, #10) and the sight corridors, which are built
   * LAZILY on the first sightClear() — flora (#9) plants the boot ring inside chunks.init()
   * (#8), before our init() has run, so a corridor table built in init() would arrive after
   * the trees it is supposed to keep out. Roads is #6 and is ready either way.
   */
  _traceRoads() {
    if (this._roadPts) return this._roadPts;
    const roads = this._sys('roads');
    if (!roads || typeof roads.nearestRoadInfo !== 'function') return (this._roadPts = []);
    const routes = roads.routes || [];
    const nRoutes = routes.length || 1;
    const STEP = 8;

    // --- seed one point per route with a coarse scan -----------------------
    const seeds = new Map();
    const HALF = CFG.world.RIM_RADIUS;
    for (let z = -HALF; z <= HALF && seeds.size < nRoutes; z += 48) {
      for (let x = -HALF; x <= HALF; x += 48) {
        if (roads.roadDistance(x, z) > 30) continue;
        const info = roads.nearestRoadInfo(x, z, 30);
        if (!info || !info.hit) continue;
        if (!seeds.has(info.route)) seeds.set(info.route, [info.x, info.z]);
        if (seeds.size >= nRoutes) break;
      }
    }

    const pts = [];   // flat x,z of every traced centreline sample, all routes
    for (const [ri, seed] of seeds) {
      const closed = routes[ri] ? !!routes[ri].closed : true;
      const fwd = this._walk(roads, seed[0], seed[1], ri, 1, STEP);
      if (!closed) {
        const back = this._walk(roads, seed[0], seed[1], ri, -1, STEP);
        for (let i = back.length - 2; i >= 0; i -= 2) pts.push(back[i], back[i + 1]);
      }
      for (let i = 0; i < fwd.length; i += 2) pts.push(fwd[i], fwd[i + 1]);
      pts.push(NaN, NaN);   // route break: never place a site across a discontinuity
    }
    this._roadPts = pts;
    return pts;
  }

  _buildMinorTable() {
    const roads = this._sys('roads');
    const terrain = this._sys('terrain');
    const chunks = this._sys('chunks');
    if (!roads || typeof roads.nearestRoadInfo !== 'function') {
      this._note('roads.nearestRoadInfo missing: no minor sites');
      return;
    }
    const pts = this._traceRoads();

    // --- ration along the traced arc ---------------------------------------
    const rng = this._forkFor('minor-table');
    const rnd = () => rng.next();
    const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const since = Object.create(null);
    for (const k of MINOR_KINDS) since[k.id] = 99;
    let lastKind = '';
    let acc = 0;
    let next = MINOR_SPACING.min + rnd() * (MINOR_SPACING.max - MINOR_SPACING.min);
    let idx = 0;
    const hub = MAJOR_BY_ID['filling-station'];

    for (let i = 2; i < pts.length; i += 2) {
      const ax = pts[i - 2], az = pts[i - 1], bx = pts[i], bz = pts[i + 1];
      if (!Number.isFinite(ax) || !Number.isFinite(bx)) { acc = 0; continue; }
      const seg = Math.hypot(bx - ax, bz - az);
      if (!(seg > 0)) continue;
      acc += seg;
      if (acc < next) continue;
      acc = 0;
      next = MINOR_SPACING.min + rnd() * (MINOR_SPACING.max - MINOR_SPACING.min);

      // keep-out: a major's yard is not the place for a culvert
      let blocked = false;
      for (const d of MAJORS) {
        if (Math.hypot(bx - d.x, bz - d.z) < MAJOR_KEEPOUT) { blocked = true; break; }
      }
      if (blocked) continue;

      const kind = this._chooseMinor(since, lastKind, rnd, rint);
      for (const k of MINOR_KINDS) since[k.id] = (k.id === kind) ? 0 : since[k.id] + 1;
      lastKind = kind;

      // sit it off the verge, on the side with the gentler ground
      const tx = (bx - ax) / seg, tz = (bz - az) / seg;
      const px = -tz, pz = tx;
      const off = MINOR_OFFSET.min + rnd() * (MINOR_OFFSET.max - MINOR_OFFSET.min);
      const s = rnd() < 0.5 ? -1 : 1;
      let mx = bx + px * off * s, mz = bz + pz * off * s;
      if (terrain && terrain.slopeAt && terrain.slopeAt(mx, mz) > 0.45) {
        mx = bx - px * off * s; mz = bz - pz * off * s;
        if (terrain.slopeAt(mx, mz) > 0.55) continue;     // both sides are a bank
      }

      const yaw = Math.atan2(bx - mx, bz - mz);           // face the road
      const age = hub ? clamp01(Math.hypot(mx - hub.x, mz - hub.z) / 1650) : 0.5;
      const rec = { i: idx++, kind, x: mx, z: mz, yaw, age };
      this.minors.push(rec);
      const key = chunks && chunks.chunkIdAt
        ? String(chunks.chunkIdAt(mx, mz))
        : (Math.floor(mx / CHUNK) + '|' + Math.floor(mz / CHUNK));
      let arr = this.minorsByChunk.get(key);
      if (!arr) { arr = []; this.minorsByChunk.set(key, arr); }
      arr.push(rec);
    }
    this._note('minor sites: ' + this.minors.length + ' over ' +
      (roads.totalLength ? Math.round(roads.totalLength()) : '?') + ' m of road');
  }

  /* ------------------------------------------------------------------ *
   * SIGHT CORRIDORS — ART 4.3.
   *
   * Six per horizon major, chosen by MEASUREMENT of the road field, not by eye: walk the
   * traced centreline, score every sample by how nearly the road's own tangent points at
   * the landmark, and keep the best few that are at least SIGHT_APART apart. Those are the
   * places where the road runs AT the thing, so the corridor lies mostly along the asphalt
   * the verge exclusion has already cleared.
   *
   * The corridors are published two ways: sightClear(x, z), a single array lookup on a
   * 16 m grid for the planting loop to call, and sightCorridors(), the list, so a test can
   * assert the count and a tool can draw them.
   * ------------------------------------------------------------------ */
  _buildSightGrid() {
    const HALF = CFG.world.SIZE * 0.5;
    const NC = Math.max(1, Math.ceil((HALF * 2) / SIGHT_CELL));
    this._sightN = NC;
    this._sightHalf = HALF;
    this._sightGrid = new Uint8Array(NC * NC);
    this._sightList = [];

    const pts = this._traceRoads();
    if (!pts.length) { this._note('no road trace: no sight corridors'); return; }

    for (let m = 0; m < MAJORS.length; m++) {
      const d = MAJORS[m];
      if (!d.horizon) continue;
      const cand = [];
      for (let i = 2; i < pts.length; i += 2) {
        const ax = pts[i - 2], az = pts[i - 1], bx = pts[i], bz = pts[i + 1];
        if (!Number.isFinite(ax) || !Number.isFinite(bx)) continue;
        const seg = Math.hypot(bx - ax, bz - az);
        if (!(seg > 0)) continue;
        const vx = d.x - bx, vz = d.z - bz;
        const dist = Math.hypot(vx, vz);
        if (dist < SIGHT_MIN || dist > SIGHT_MAX) continue;
        // |cos| between the road's tangent and the bearing to the landmark: 1 means the
        // road points straight at it (either way round — you see it coming or going).
        const align = Math.abs(((bx - ax) * vx + (bz - az) * vz) / (seg * dist));
        cand.push({ x: bx, z: bz, dx: vx / dist, dz: vz / dist, dist, align });
      }
      cand.sort((p, q) => q.align - p.align);
      const kept = [];
      for (let i = 0; i < cand.length && kept.length < SIGHT_PER_MAJOR; i++) {
        const c = cand[i];
        let tooClose = false;
        for (const k of kept) if (Math.hypot(k.x - c.x, k.z - c.z) < SIGHT_APART) { tooClose = true; break; }
        if (tooClose) continue;
        kept.push(c);
      }
      for (const c of kept) {
        c.id = d.id;
        c.len = Math.min(SIGHT_LEN, c.dist - 40);
        this._sightList.push(c);
        this._markCorridor(c);
      }
    }
    this._note('sight corridors: ' + this._sightList.length + ' over '
      + MAJORS.filter(d => d.horizon).length + ' horizon majors');
  }

  /** Stamp one corridor into the grid. Build time only; nothing here runs in step(). */
  _markCorridor(c) {
    const N = this._sightN, HALF = this._sightHalf, G = this._sightGrid;
    const ex = c.x + c.dx * c.len, ez = c.z + c.dz * c.len;
    const minX = Math.min(c.x, ex) - SIGHT_HALFW, maxX = Math.max(c.x, ex) + SIGHT_HALFW;
    const minZ = Math.min(c.z, ez) - SIGHT_HALFW, maxZ = Math.max(c.z, ez) + SIGHT_HALFW;
    const i0 = clamp(Math.floor((minX + HALF) / SIGHT_CELL), 0, N - 1);
    const i1 = clamp(Math.ceil((maxX + HALF) / SIGHT_CELL), 0, N - 1);
    const j0 = clamp(Math.floor((minZ + HALF) / SIGHT_CELL), 0, N - 1);
    const j1 = clamp(Math.ceil((maxZ + HALF) / SIGHT_CELL), 0, N - 1);
    for (let j = j0; j <= j1; j++) {
      const wz = -HALF + (j + 0.5) * SIGHT_CELL;
      for (let i = i0; i <= i1; i++) {
        const wx = -HALF + (i + 0.5) * SIGHT_CELL;
        const rx = wx - c.x, rz = wz - c.z;
        const along = rx * c.dx + rz * c.dz;
        if (along < -SIGHT_CELL || along > c.len) continue;
        const lat = Math.abs(rx * c.dz - rz * c.dx);
        if (lat > SIGHT_HALFW) continue;
        G[j * N + i] = 1;
      }
    }
  }

  /**
   * TRUE if (x, z) stands in a corridor that a horizon landmark is read down, and therefore
   * must not carry anything tall. One array lookup. Built on first call, because flora
   * (#9) plants the boot ring before this system's init() (#10) has run.
   *
   * flora.js has to call this; see docs/HANDOFF.md. Until it does, this is measured, live,
   * and inert.
   */
  sightClear(x, z) {
    if (!this._sightGrid) this._buildSightGrid();
    const N = this._sightN, HALF = this._sightHalf;
    const i = Math.floor((x + HALF) / SIGHT_CELL);
    const j = Math.floor((z + HALF) / SIGHT_CELL);
    if (i < 0 || j < 0 || i >= N || j >= N) return false;
    return this._sightGrid[j * N + i] === 1;
  }

  /** The corridor list, for tests and tools. Never mutated by anything downstream. */
  sightCorridors() {
    if (!this._sightGrid) this._buildSightGrid();
    return this._sightList.map(c => ({
      id: c.id, x: c.x, z: c.z, dx: c.dx, dz: c.dz,
      len: c.len, halfW: SIGHT_HALFW, dist: c.dist, align: +c.align.toFixed(3),
    }));
  }

  /** Snap-step-snap along one route. Returns a flat [x,z,...] of centreline samples. */
  _walk(roads, sx, sz, routeIdx, dir, STEP) {
    const out = [];
    let cx = sx, cz = sz, px = NaN, pz = NaN, n = 0;
    for (let guard = 0; guard < 4000; guard++) {
      const info = roads.nearestRoadInfo(cx, cz, 26);
      if (!info || !info.hit || info.route !== routeIdx) break;
      const ix = info.x, iz = info.z, tx = info.tx, tz = info.tz;
      if (n > 0 && Math.hypot(ix - px, iz - pz) < STEP * 0.3) break;   // an open route ended
      out.push(ix, iz);
      px = ix; pz = iz; n++;
      cx = ix + tx * STEP * dir;
      cz = iz + tz * STEP * dir;
      if (n > 30 && Math.hypot(ix - sx, iz - sz) < STEP * 0.9) break;  // the loop closed
    }
    return out;
  }

  /**
   * donor: Projects/eaten-path/src/world/world.js:103-142 (`_chooseKind`), read 2026-09-02.
   * Hard starvation guards first ("nothing waits forever"), then a weight table with the
   * previous kind zeroed ("don't stack two clearings"), then a weighted pick.
   */
  _chooseMinor(since, lastKind, rnd, rint) {
    for (const k of MINOR_KINDS) {
      if (since[k.id] >= k.starve + rint(0, 3)) return k.id;
    }
    let sum = 0;
    const w = _minorW;
    for (let i = 0; i < MINOR_KINDS.length; i++) {
      const k = MINOR_KINDS[i];
      w[i] = (k.id === lastKind || since[k.id] < k.minSince) ? 0 : k.weight;
      sum += w[i];
    }
    if (sum <= 0) return MINOR_KINDS[0].id;
    let x = rnd() * sum;
    for (let i = 0; i < MINOR_KINDS.length; i++) { x -= w[i]; if (x <= 0) return MINOR_KINDS[i].id; }
    return MINOR_KINDS[MINOR_KINDS.length - 1].id;
  }

  /* ------------------------------------------------------------------ *
   * step — discovery, claiming, and everything that turns.
   * ------------------------------------------------------------------ */
  step(dt) {
    this._t += dt;

    // WARNING 41. Nothing in the destination loop may fire while the game is still
    // booting. main.js runs ninety fixed steps during 'first steps' (main.js:513) with the
    // shell still over the canvas and the player parked 13 m from the Filling Station, and
    // every one of those steps used to discover, latch and whisper. `ctx.ready` is the
    // exact moment boot hands over (main.js:532) and is a scalar read lazily, at use.
    // The props below keep turning through boot on purpose: they want to be warm.
    if (this.ctx && this.ctx.ready) this._proximity(dt);

    // --- the things that turn --------------------------------------------
    for (let n = 0; n < this._nodeList.length; n++) {
      const rec = this._nodeList[n];
      const claimed = this.claimed.has(rec.def.id);
      // An aviation lamp burns whether or not the mast is yours; a rose window does not.
      // ART 4.2: "Raise the ember glow's unclaimed floor so it is visible before you own
      // it." 0.34 x the glow tint floor (0.66) put the stack tops at 0.22 opacity at 2 km,
      // which measured a max-minus-min of 9.4 over four seconds against a gate of 12.
      // The Drowned Light is the county's compass and ART 4.2 wants it turning before you
      // own it, so its lamp cannot idle at a rose window's 0.24 either.
      const kind = rec.def.kind;
      const idle = kind === 'relay' ? 1
        : kind === 'works' ? 0.70
          : kind === 'lighthouse' ? 0.55 : 0.24;
      rec.glowLevel += ((claimed ? 1 : idle) - rec.glowLevel) * clamp01(dt * 2.2);
      if (rec.beacon) {
        const target = claimed ? 0 : 1;
        rec.beaconLevel += (target - rec.beaconLevel) * clamp01(dt / BEACON_DIE_S * 2.4);
        if (rec.beaconLevel < 0.004 && claimed) { rec.beacon.visible = false; rec.beaconLevel = 0; }
      }
      if (rec.moving) {
        for (const mv of rec.moving) {
          // Simulation writes prev/curr ONLY. present(alpha) is the only place a
          // rotation is ever assigned, so these read smooth at any refresh rate.
          if (mv.role === 'sails') advanceAngle(mv, -mv.rate * dt);
          else if (mv.role === 'wheel') advanceAngle(mv, claimed ? mv.rate * dt : 0);
          // ART 4.2: the beam sweeps UNCLAIMED TOO. "A dying light still turns. This is the
          // county's compass and it is switched off until you have already found it."
          // Claiming it does not start the beam; it brings the beam up to full.
          else if (mv.role === 'beam') advanceAngle(mv, mv.rate * dt);
          else if (mv.role === 'brazier') { /* no rotation: it burns, it does not turn */ }
          else if (mv.role === 'bell') {
            if (rec.bellT >= 0) {
              rec.bellT += dt;
              const k = 1 - clamp01(rec.bellT / BELL_SWING_S);
              mv.prev = mv.curr;
              mv.curr = Math.sin(rec.bellT * 7.4) * 0.42 * k * k;
              if (rec.bellT > BELL_SWING_S) { rec.bellT = -1; mv.curr = 0; mv.prev = 0; }
            } else if (claimed && !this._bellClockSeen) {
              // "the bell rings on the hour". Until world/clock.js exists, this IS the
              // hour: a dt-scoped countdown, so a test can step to it. The moment a
              // 'phase:changed' ever reaches the bus this stops and the clock takes over.
              rec.bellClock -= dt;
              if (rec.bellClock <= 0) { rec.bellClock = BELL_PERIOD_S; this._ring(rec); }
            }
          }
        }
      }
    }

    this._drainWhispers();
    if (this._pinsDirty) this._rebuildPins();
  }

  /* ------------------------------------------------------------------ *
   * PROXIMITY — discovery, claiming, and the place:near broadcast.
   *
   * Split out of step() so the props above keep turning through boot while none of THIS
   * runs until ctx.ready. Allocates nothing: `_inside` is a Set of ids that already exist
   * and every payload is module-scope scratch.
   *
   * DISCOVERY IS ARRIVAL, NOT CONTAINMENT. The county tells you the name of a place you
   * WALK INTO. The first evaluated step is the boot handover — you were placed here, you
   * did not arrive — so it records where you are standing and fires nothing. After that,
   * a crossing from outside a whisper radius to inside it is an arrival, and so is any
   * discontinuity in the player's position: a teleport, a respawn, or stepping out of the
   * car somewhere else all clear the latch, because none of them is walking.
   * ------------------------------------------------------------------ */
  _proximity(dt) {
    const player = this._sys('player');
    const px = player && player.pos ? player.pos.x : 0;
    const pz = player && player.pos ? player.pos.z : 0;
    const py = player && player.pos ? player.pos.y : 0;

    if (!this._placed) {
      this._placed = true;
      this._seedInside(px, pz);          // the boot handover: record, never fire
    } else {
      const jx = px - this._lastPx, jz = pz - this._lastPz;
      const lim = Math.max(ARRIVE_JUMP_M, ARRIVE_JUMP_SPEED * dt);
      if (jx * jx + jz * jz > lim * lim) {
        // Not walking. Whatever put us here, we ARRIVED: re-enter every band.
        this._inside.clear();
        this.near = null;
      }
    }
    this._lastPx = px; this._lastPz = pz;

    let nearest = null, nearestD = Infinity;
    // The place we are currently "at", measured in the SAME sweep. WARNING 23: the old
    // hysteresis only ever looked at `nearest`, so it could not see how far we were from
    // the place it was still holding.
    let heldD = Infinity, held = null;
    for (let i = 0; i < MAJORS.length; i++) {
      const d = MAJORS[i];
      const dx = px - d.x, dz = pz - d.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestD) { nearestD = dist; nearest = d; }
      if (this.near !== null && d.id === this.near) { heldD = dist; held = d; }

      // --- discovery: arrive inside 24 m, a whisper, once, forever -------
      if (dist >= d.discoverR) {
        if (this._inside.has(d.id)) this._inside.delete(d.id);
      } else if (!this._inside.has(d.id)) {
        this._inside.add(d.id);
        if (!this.found.has(d.id)) this._discover(d);
      }

      // --- claim: touch ---------------------------------------------------
      const c = d.claim;
      if (c && c.how === 'touch' && !this.claimed.has(d.id) && dist < d.nearR + 20) {
        const rec = this.nodes.get(d.id);
        if (!rec) continue;
        const cy = Math.cos(rec.yaw), sy = Math.sin(rec.yaw);
        const wx = d.x + c.dx * cy + c.dz * sy;
        const wz = d.z - c.dx * sy + c.dz * cy;
        if (Math.hypot(px - wx, pz - wz) < c.r && Math.abs(py - rec.padY) < 4.5) {
          this._claim(d, wx, rec.padY + 1.2, wz);
        }
      }
    }

    // --- place:near, with hysteresis so a boundary cannot chatter ---------
    //
    // WARNING 23, FIXED. The release test used to be `this.near === nearest.id &&
    // nearestD > inR + hysteresis`: it could only let go of a place that was STILL the
    // nearest one. Walk out of A's radius while B becomes nearest but is not yet inside
    // B's own radius and NEITHER branch runs — `near` stays stranded on A.
    //
    // So the release is measured against the HELD place's own band, whoever is nearest,
    // and the acquire only ever runs from a cleared state. Chatter is still impossible:
    // you have to leave the outer band of the thing you hold before anything can change.
    if (held && heldD > held.nearR + NEAR_HYSTERESIS) { this.near = null; held = null; }
    else if (!held && this.near !== null) this.near = null;   // a row went away under us
    if (this.near === null && nearest && nearestD < nearest.nearR) {
      this.near = nearest.id;
      held = nearest;
      this._nearT = NEAR_REPEAT_S;      // broadcast on this very step
      this._nearFlags = -1;
    }

    // WARNING 41. place:near is a BROADCAST, not an edge. It used to fire once, on entry,
    // and never again however long you stood there — so a listener that subscribed a
    // millisecond later, or that wanted the condition rather than the transition, saw
    // nothing at all for the rest of the run. progression/progress.js:460 is exactly that
    // listener: it banks on `lit || hub` through `_tryBank`, which carries its own
    // BANK_COOL_S cooldown (progress.js:834), so standing at the hub is meant to pay
    // repeatedly and a one-shot could pay at most once per visit. Twice a second, one
    // reused payload, and immediately again whenever found/claimed changes under it.
    if (this.near !== null && held) {
      this._nearT += dt;
      const flags = (this.found.has(held.id) ? 1 : 0) | (this.claimed.has(held.id) ? 2 : 0);
      if (this._nearT >= NEAR_REPEAT_S || flags !== this._nearFlags) {
        this._nearT = 0;
        this._nearFlags = flags;
        this._fillNear(held);
        this.ctx.bus.emit('place:near', _nearPayload);
      }
    } else {
      this._nearT = 0;
      this._nearFlags = -1;
    }
  }

  /** Record which whisper radii we are standing in, without discovering any of them. */
  _seedInside(px, pz) {
    this._inside.clear();
    for (let i = 0; i < MAJORS.length; i++) {
      const d = MAJORS[i];
      const dx = px - d.x, dz = pz - d.z;
      if (dx * dx + dz * dz < d.discoverR * d.discoverR) this._inside.add(d.id);
    }
  }

  /** Found forever: the pin, the whisper, the event, and the find XP. One place, once. */
  _discover(d) {
    this.found.add(d.id);
    this._pinsDirty = true;
    this._whisperQ.push(d.id);
    _foundPayload.id = d.id; _foundPayload.xp = d.xpFind;
    this.ctx.bus.emit('place:discovered', _foundPayload);
    this._gainXp(d.xpFind, d.x, this._padOf(d) + 2, d.z, 'discover');
  }

  _padOf(d) { const r = this.nodes.get(d.id); return r ? r.padY : 0; }

  /**
   * Fill the shared place:near payload. progression/progress.js banks XP on `lit || hub`,
   * so both have to be on the wire: `hub` is the Filling Station (the one place with a
   * map board and the place you wake in), and `lit` is a place whose lamps are actually
   * burning — authored-lit, or lit because you claimed it and _applyState turned its
   * windows on. Emitting {id} alone meant that beat could never fire.
   */
  _fillNear(d) {
    const p = _nearPayload;
    p.id = d.id;
    p.name = d.name;
    p.major = true;
    p.hub = !!d.hub;
    p.claimed = this.claimed.has(d.id);
    p.lit = !!d.lit || p.claimed;
    p.x = d.x; p.z = d.z;
    p.discovered = this.found.has(d.id);
    return p;
  }

  /* --------------------------------------------------------- claiming -- */

  /** A shot landed. If it landed on a place's claim target, that is the claim. */
  _onShot(p) {
    if (!p) return;
    for (let i = 0; i < MAJORS.length; i++) {
      const d = MAJORS[i];
      const c = d.claim;
      if (!c || c.how !== 'shoot' || this.claimed.has(d.id)) continue;
      const rec = this.nodes.get(d.id);
      if (!rec) continue;
      const cy = Math.cos(rec.yaw), sy = Math.sin(rec.yaw);
      const wx = d.x + c.dx * cy + c.dz * sy;
      const wz = d.z - c.dx * sy + c.dz * cy;
      const wy = rec.padY + c.dy;
      const dx = p.x - wx, dy = p.y - wy, dz = p.z - wz;
      if (dx * dx + dy * dy + dz * dz > c.r * c.r) continue;
      this._claim(d, wx, wy, wz);
      if (rec.moving) for (const mv of rec.moving) if (mv.role === 'bell') this._ring(rec);
      return;
    }
  }

  /**
   * THE CLAIM. It must ANSWER, at the object, in the world, and it must never be a
   * counter. A rover is borrowed for CLAIM_FLASH_S and released by its own ttl (the light
   * census is untouched: borrow/release is the only way a dynamic light exists), the
   * beacon starts dying, the windows come up, and a low tone leaves the place itself.
   */
  _claim(d, wx, wy, wz) {
    if (this.claimed.has(d.id)) return;
    this.claimed.add(d.id);
    // A claim you somehow made without a find still pays the find and still pins the map:
    // this used to emit place:discovered by hand and drop both the whisper and the XP.
    if (!this.found.has(d.id)) this._discover(d);
    this._pinsDirty = true;
    this._applyState();

    const lights = this._sys('lights');
    if (lights && lights.borrow) {
      lights.borrow('claim', wx, wy + 0.6, wz, REGION_TINT[d.region] || DEFAULT_TINT, 14, CLAIM_FLASH_S);
    }
    const fx = this._sys('fx');
    // fx.trauma is a NUMBER (fx.js:52); the setter is addTrauma (fx.js:232). Calling the
    // number threw a TypeError inside step() the moment trauma was non-zero, and three
    // consecutive throws stop the loop — so a claim could kill the game.
    if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.22);

    _claimPayload.id = d.id; _claimPayload.xp = d.xpClaim;
    this.ctx.bus.emit('place:claimed', _claimPayload);
    this._gainXp(d.xpClaim, wx, wy, wz, 'claim');

    // A claim is loud. The director will want to know; until it exists this is free.
    _noisePayload.x = wx; _noisePayload.z = wz; _noisePayload.radius = 55; _noisePayload.source = 'claim';
    this.ctx.bus.emit('noise', _noisePayload);

    this._whisperQ.push('!' + d.id);   // '!' = the claim tone, not the name
  }

  _gainXp(amount, x, y, z, reason) {
    if (!amount) return;
    _xpPayload.amount = amount; _xpPayload.x = x; _xpPayload.y = y; _xpPayload.z = z;
    _xpPayload.reason = reason;
    this.ctx.bus.emit('xp:gained', _xpPayload);
  }

  _ring(rec) {
    rec.bellT = 0;
    _noisePayload.x = rec.def.x; _noisePayload.z = rec.def.z;
    _noisePayload.radius = 260; _noisePayload.source = 'bell';
    this.ctx.bus.emit('noise', _noisePayload);
    this._whisperQ.push('~' + rec.def.id);   // '~' = the bell
  }

  _ringBells() {
    for (const rec of this.nodes.values()) {
      if (rec.moving && this.claimed.has(rec.def.id)) {
        for (const mv of rec.moving) if (mv.role === 'bell') this._ring(rec);
      }
    }
  }

  /** Push claim state into the world. Idempotent; safe to call on load or after a claim. */
  _applyState() {
    for (const rec of this.nodes.values()) {   // not the hot path: claims are rare
      const claimed = this.claimed.has(rec.def.id);
      // the mast goes white, and only then does it blink
      if (rec.def.kind === 'relay' && rec.glow) {
        rec.glow.material.color.set(claimed ? GLOW.white : GLOW.red);
      }
      // The beam is no longer switched off before the claim (ART 4.2): it turns from the
      // first frame and the claim only brings it up to full. Nothing here hides it.
    }
    // the windows
    for (const list of this.bodies.values()) {
      for (const b of list) {
        if (b.kind !== 'major' || !b.glow) continue;
        const on = this.claimed.has(b.id);
        b.glow.visible = on;
        b.glow.material.opacity = on ? 1 : 0;
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * The map board at the Filling Station — the THIRD record, never the first.
   * One merged geometry, rebuilt only when the found-set changes and only while the
   * board is actually resident (which is only when you are standing at the hub).
   * ------------------------------------------------------------------ */
  _rebuildPins() {
    const board = this._board;
    // Keep the flag until the board is actually resident, or a place found out on the road
    // would never reach the map you came back to read.
    if (!board || !board.group) return;
    this._pinsDirty = false;
    if (board.mesh) {
      board.group.remove(board.mesh);
      board.mesh.geometry.dispose();
      board.mesh.material.dispose();
      board.mesh = null;
    }
    if (!this.found.size) return;
    const s = board.spec;
    const HALF = CFG.world.SIZE * 0.5;
    const parts = [];
    for (const id of this.found) {
      const d = MAJOR_BY_ID[id];
      if (!d) continue;
      const u = clamp(d.x / HALF, -1, 1) * (s.w * 0.44);
      const v = clamp(-d.z / HALF, -1, 1) * (s.h * 0.44);
      const claimed = this.claimed.has(id);
      const g = new THREE.PlaneGeometry(claimed ? 0.075 : 0.05, claimed ? 0.075 : 0.05);
      g.rotateY(s.yaw);
      g.translate(s.x + u * Math.cos(s.yaw), s.y + v, s.z + u * -Math.sin(s.yaw));
      _col.set(REGION_TINT[d.region] || DEFAULT_TINT);
      const n = g.attributes.position.count;
      const c = new Float32Array(n * 3);
      const k = claimed ? 1 : 0.35;
      for (let i = 0; i < n; i++) { c[i * 3] = _col.r * k; c[i * 3 + 1] = _col.g * k; c[i * 3 + 2] = _col.b * k; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      parts.push(g);
    }
    if (!parts.length) return;
    let geo = parts[0];
    if (parts.length > 1) {
      const merged = mergePins(parts);
      for (const g of parts) g.dispose();
      geo = merged;
    }
    const mat = this.matGlow.clone();
    mat.color.set(0xffffff);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'map-pins';
    mesh.renderOrder = 5;
    board.group.add(mesh);
    board.mesh = mesh;
  }

  /* ------------------------------------------------------------------ *
   * The whisper.
   *
   * "Silence reads as broken." A place must SAY its name when you find it, and a claim
   * must make a sound at the object — but the sound is the AUDIO LANE's, all of it.
   *
   * This file used to open its OWN AudioContext and build a BufferSource straight to
   * ac.destination when audio exported no whisper(). That branch was always taken, which
   * meant a second context outside the pool, the limiter, the master bus and the HRTF
   * panner, with no resume path at all: a context created before the player's first click
   * stays suspended for the life of the page and every whisper after it is scheduled into
   * a dead graph. It is deleted. If audio.whisper is absent we go quiet and drain the
   * queue — a silent place is a bug for the audio lane to fix, not a reason for this file
   * to grow a second sound engine.
   *
   * The call is audio.whisper(kind, name, x, y, z) with kind 'name' | 'claim' | 'bell'.
   * ------------------------------------------------------------------ */
  _drainWhispers() {
    if (!this._whisperQ.length) return;
    const audio = this._sys('audio');
    const canWhisper = !!(audio && typeof audio.whisper === 'function');
    if (!canWhisper && !this._silentNoted) {
      this._silentNoted = true;
      this._note('audio.whisper() absent: places are silent (no private AudioContext, by law)');
    }
    while (this._whisperQ.length) {
      const tag = this._whisperQ.pop();
      const claim = tag.charCodeAt(0) === 33;   // '!'
      const bell = tag.charCodeAt(0) === 126;   // '~'
      const id = (claim || bell) ? tag.slice(1) : tag;
      const d = MAJOR_BY_ID[id];
      if (!d || !canWhisper) continue;          // drain either way; never queue forever
      audio.whisper(bell ? 'bell' : claim ? 'claim' : 'name', d.name, d.x, this._padOf(d) + 2, d.z);
    }
  }

  /* ------------------------------------------------------------------ *
   * present — the landmark transform, the tint, and the beacons.
   *
   * `alpha` IS consumed, by the four things in the county that move continuously: the
   * mill sails, the mine's winding wheel, the lighthouse beam and the bell. Those are
   * exactly what a player watches from 600 m away, and at any refresh rate other than 60
   * a sim-rate rotation judders visibly on them. step() writes prev/curr; every rotation
   * assignment in this system happens here and nowhere else.
   *
   * The landmark PROXY transform is a different matter and deliberately not interpolated:
   * it is a function of the camera's presented position, which the camera system writes
   * in its own present(). places is manifest #10 and camera is #12, so we read the pose
   * the camera settled on last frame. At PROXY_R = 460 m a one-frame lag is under a
   * millimetre of screen space; putting places after camera in the manifest would fix it
   * and would also put a destination's colliders in after the player had moved.
   * ------------------------------------------------------------------ */
  present(alpha) {
    const cam = this.ctx && this.ctx.camera;
    if (!cam || !this.landGroup) return;
    // present() can run before the first step (boot, and the settle() rig), where alpha
    // is undefined. 1 means "the state step() just produced", which is right there.
    const a = (alpha === undefined || alpha === null) ? 1 : alpha;
    const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;

    for (let n = 0; n < this._nodeList.length; n++) {
      const rec = this._nodeList[n];
      const d = rec.def;
      const dx = d.x - cx, dz = d.z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1e-3;
      const s = dist > PROXY_R ? PROXY_R / dist : 1;
      // The horizon gain. 1 until HZ_GAIN_FROM, which is beyond PROXY_R, so both regimes
      // below still collapse to today's formula wherever it mattered before.
      const g = dist <= HZ_GAIN_FROM ? 1
        : 1 + (HZ_GAIN_MAX - 1) * smoothstep(HZ_GAIN_FROM, HZ_GAIN_FULL, dist);
      // ONE formula for both regimes; at dist === PROXY_R (where g is still 1) it is the
      // identity, so the handover from real position to silhouette has no seam. The
      // s * padY * (1 - g) term anchors the gain to the landmark's FOOT: the base keeps its
      // true elevation angle and the building grows upward out of it.
      rec.node.position.set(cx + dx * s, cy * (1 - s) + s * rec.padY * (1 - g), cz + dz * s);
      rec.node.scale.setScalar(s * g);

      const proxy = s < 1;
      if (proxy !== rec.proxy) {
        rec.proxy = proxy;
        // In proxy mode the node is 460 m away no matter how far the place really is, so
        // it must not depth-test against a world that is nearer than it looks. It still
        // WRITES depth, which is what keeps a tower from showing its own back wall.
        if (rec.solid) {
          rec.solid.material.depthTest = !proxy;
          rec.solid.renderOrder = proxy ? -960 : 0;
        }
        // The SOLID may keep depth off in proxy mode: it draws at renderOrder -960, before
        // anything else writes depth, so the world still covers it. The additive glow and the
        // beacon cannot — they are transparent, so they draw AFTER every opaque thing in the
        // scene, and with depth off they paint straight over a trunk two metres from the
        // camera. That is what a player sees as a green bar floating in the forest. They keep
        // depth-testing in every mode, and the county occludes them like anything else.
        if (rec.glow) rec.glow.material.depthTest = true;
        if (rec.beacon) rec.beacon.material.depthTest = true;
        if (rec.moving) for (const mv of rec.moving) mv.mesh.material.depthTest = !proxy;
      }

      // Manual aerial perspective, floored. A fog that erases is how MARROW lost its
      // distance; this one darkens to TINT_FLOOR and stops.
      const t = clamp01((dist - TINT_NEAR) / (TINT_FAR - TINT_NEAR));
      const k = lerp(1, TINT_FLOOR, t);
      if (rec.solid) rec.solid.material.color.setScalar(k);

      const tintGlow = lerp(1, TINT_GLOW_FLOOR, t);
      const gk = tintGlow * rec.glowLevel;
      const claimedHere = this.claimed.has(d.id);
      if (rec.glow) {
        let o = gk;
        // ART 4.2: an aviation lamp blinks because it is an aviation lamp, not because you
        // own it. Unclaimed it is GLOW.red and it blinks; claimed it is GLOW.white and it
        // blinks (the colour swap is _applyState's). 2.4 s period, 0.16 duty, both states.
        if (d.kind === 'relay') {
          const ph = (this._t % 2.4) / 2.4;
          o *= ph < 0.16 ? 1 : 0.10;
        } else if (d.kind === 'works') {
          o *= 0.72 + 0.28 * noise1D(this._t, 0.5, 11);    // the stacks breathe
        }
        rec.glow.material.opacity = o;
        rec.glow.visible = o > 0.004;
      }
      if (rec.moving) for (const mv of rec.moving) {
        if (mv.role === 'brazier') {
          // A guttering fire: +-40% about its own level at ~0.7 Hz. It burns whether or not
          // the place is yours, so it rides the DISTANCE tint alone and not glowLevel —
          // glowLevel is "are your lamps on", and this is somebody else's fire.
          mv.mesh.material.opacity = tintGlow * (0.42 + 0.56 * noise1D(this._t, 0.7, 23));
        } else if (mv.glow) {
          // The beam turns unclaimed at a fifth of its lit strength (ART 4.2's gk * 0.22):
          // a dying light, not a working one. Claiming it brings it up.
          mv.mesh.material.opacity = gk * (claimedHere ? 0.85 : 0.22);
        }
        // THE interpolation. sails and wheel turn about their own Z (they are authored
        // face-on), the beam sweeps about Y, and the bell swings about Z. A brazier does
        // not turn at all, and writing rotation.z = 0 on it every frame is free.
        const ang = mv.prev + (mv.curr - mv.prev) * a;
        if (mv.role === 'beam') mv.mesh.rotation.y = ang;
        else if (mv.role !== 'brazier') mv.mesh.rotation.z = ang;
      }
      if (rec.beacon && rec.beacon.visible) {
        rec.beacon.material.opacity = BEACON_OPACITY * rec.beaconLevel;
      }
    }

    // the one dying headlight out on the road
    for (let i = 0; i < this._flickers.length; i++) {
      const b = this._flickers[i];
      const f = noise1D(this._t * 3.1 + b.seed * 0.37, 1, 7);
      b.glow.material.opacity = f > 0.18 ? clamp(0.35 + f, 0.2, 1) : 0.04;
    }
  }

  /* ------------------------------------------------------------------ *
   * the surface other owners and the tests use
   * ------------------------------------------------------------------ */

  /**
   * The name tests/world-game.mjs asks for. It calls `s.all()` (falling back to `s.places`)
   * and reads `p.major`, so with only list() on the surface it measured zero destinations
   * and zero majors in a county with twelve of them — a green system failing a red gate on
   * a naming mismatch. The gate is right to ask; this is the answer it asks for.
   */
  all() {
    const out = this.list();
    for (let i = 0; i < out.length; i++) out[i].major = true;
    return out;
  }

  /** Every major, with its live state. Used by progression and by tests. */
  list() {
    const out = [];
    for (const d of MAJORS) {
      out.push({
        id: d.id, name: d.name, x: d.x, z: d.z, region: d.region, kind: d.kind,
        found: this.found.has(d.id), claimed: this.claimed.has(d.id),
        y: this._padOf(d),
      });
    }
    return out;
  }

  /** The nearest major to a point, and how far. */
  nearestMajor(x, z) {
    let best = null, bd = Infinity;
    for (const d of MAJORS) {
      const dd = Math.hypot(x - d.x, z - d.z);
      if (dd < bd) { bd = dd; best = d; }
    }
    return best ? { id: best.id, def: best, dist: bd } : null;
  }

  isFound(id) { return this.found.has(id); }
  isClaimed(id) { return this.claimed.has(id); }
  majorCount() { return MAJORS.length; }
  minorCount() { return this.minors.length; }

  /** Force a claim, for tests and for the integrator's screenshot rig. */
  claim(id) {
    const d = MAJOR_BY_ID[id];
    if (!d) return false;
    const rec = this.nodes.get(id);
    this._claim(d, d.x, (rec ? rec.padY : 0) + 1.4, d.z);
    return true;
  }

  state() {
    return {
      majors: MAJORS.length,
      minors: this.minors.length,
      found: this.found.size,
      claimed: this.claimed.size,
      near: this.near,
      flats: this.flatsRegistered,
      flatSeam: this.flatSeam,
      sightCorridors: this._sightList ? this._sightList.length : 0,
      bodies: this.bodies.size,
      notes: this._notes.slice(),
    };
  }

  ready() {
    // A genuine wiring check: the landmark group must be in the scene with a node per
    // major, because a beacon nobody can see is this system failing silently.
    return !!(this.landGroup && this.landGroup.parent && this.nodes.size === MAJORS.length);
  }

  dispose() {
    for (const key of Array.from(this.bodies.keys())) this.disposeChunk(key);
    if (this.landGroup) {
      this.landGroup.traverse((o) => {
        if (!o.isMesh) return;
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      if (this.landGroup.parent) this.landGroup.parent.remove(this.landGroup);
    }
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
    if (this.matBody) this.matBody.dispose();
    if (this.matLand) this.matLand.dispose();
    if (this.matGlow) this.matGlow.dispose();
    // No AudioContext to close: this system never opens one. See _drainWhispers.
  }
}

/* Local merge for the map pins: a handful of tiny quads, all with the same attribute set.
   Written out rather than pulling BufferGeometryUtils in for four triangles. */
function mergePins(parts) {
  let vc = 0, ic = 0;
  for (const g of parts) { vc += g.attributes.position.count; ic += g.index ? g.index.count : 0; }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3);
  const uv = new Float32Array(vc * 2), col = new Float32Array(vc * 3);
  const idx = new Uint16Array(ic);
  let vo = 0, io = 0;
  for (const g of parts) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    uv.set(g.attributes.uv.array, vo * 2);
    col.set(g.attributes.color.array, vo * 3);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += n; io += gi.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

export default Places;
