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
import { buildChunkData, TIERS } from './chunk-worker.js';
import { groundDetail, heightAt, normalAt, flats, flatCount } from './terrain.js';

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
 * Everything here rides the vertex-colour channel that already exists plus ONE 64x128
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
const CANOPY_AO = 0.42;     // a dense stand darkens its floor by up to 42%
const CANOPY_WARM = 0.10;   // and goes slightly warm: needles, not sky. Blue only, downward.

// The road. matRoad's colour is the CROWN's linear albedo and the profile texture scales
// down from it across the ribbon. ART.md 3.2.2: "a road at night is legible because it
// reflects the sky, not because it is a different grey" — so the crown is cool, and it is
// the one place in the county where the ground is allowed above the region albedo.
const ROAD_CROWN = [0.180, 0.190, 0.215];
const ROAD_CROWN_HALF_M = 0.60;   // ART.md 3.2.2's 1.2 m strip, as a half-width
const ROAD_CROWN_FALL_M = 0.55;   // and how far it takes to fall to the shoulder
const ROAD_SHOULDER = 0.53;       // crown : shoulder = 1.89, ART.md 3.2.2's 1.9x
const ROAD_EDGE = 0.37;           // ART.md 3.2.3, the outer strip: 30% under the shoulder
const ROAD_EDGE_M = 0.60;
const ROAD_TEX_W = 64, ROAD_TEX_H = 128;
const ROAD_DETAIL_AMP = 0.18;     // the ribbon takes the county's own field, gently

// AND THE REASON THE ROAD WAS INVISIBLE IN THE FIRST PLACE — measured, not reasoned.
// roads.js emitRun banks the ribbon: y = heightAt + 0.06 + bank * half * s, with
// CFG.roads.bank.max 0.12 and half 2.85, so the LOW edge of every curve is pushed up to
// 0.34 m BELOW the ground it is projected onto. Sampled at -970.3, 256.4 (player standing
// 1.7 cm from the centreline), ribbon-Y minus heightAt over every vertex within 70 m ran
// from -0.174 to +0.294: a third of the ribbon is under the terrain. With the ribbon
// forced emissive red the whole near road is gone and the only red pixels in the frame are
// a strip 100 m out where the ground falls away (tests/shots/lane3-diag-red.png). That is
// ART.md's gate row 19 — "n/a (0 px)" — and it was never a colour problem at all.
//
// The fix here lifts each CROSS-SECTION PAIR by whatever its lower vertex needs to clear
// the height function, so the bank's shape survives exactly and only the section is
// translated. The real fix is in roads.js's emitRun (bank the ribbon about its own centre
// instead of about zero) or in CFG.roads.bank.max; neither file is this lane's, and both
// are written up in docs/HANDOFF.md.
// AND THE THIRD THING EATING THE ROAD, measured 2026-09-02 with the ribbon forced
// emissive red and the aprons toggled inside one rAF: at the spawn, road pixels went
// 8,430 with everything drawn -> 15,011 with `apron-filling-station` hidden -> 17,653 with
// depthTest off entirely. **The place apron was covering 44% of the road on screen.** The
// apron is a 113-vertex disc over a 38 m radius sitting at heightAt + 0.08; its triangles
// are up to 20 m across, so between its own vertices it rides well above the height
// function the ribbon is projected onto, and it wins the depth test. That is places.js's
// mesh and places.js's fix (see the request in docs/HANDOFF.md) — what this lane can do is
// clear it. 0.14 -> 0.24 recovers 8,430 -> 10,446 road pixels and takes the crown ratio
// from 1.76 to 1.96. Not further: _liftRibbon translates a whole banked cross-section, so
// every metre of clearance also raises the HIGH edge of a curve, and the worst ribbon
// vertex within 60 m of the player went 0.732 m over the ground to 0.832 m. Past that the
// road starts to float, and the honest fix is the roads.js bank request, not more lift.
const RIBBON_CLEAR = 0.24;        // metres over heightAt at tier 0
// The ground MESH is a piecewise-linear approximation of that function, and its worst
// deviation above it grows with the square of the quad: 1.6 m quads are ~5 cm, 6.4 m quads
// are ~0.8 m. Capped, because at tier 2 (640 m and out) a metre of lift is under a pixel.
const RIBBON_CLEAR_QUAD = 0.012;
const RIBBON_CLEAR_MAX = 1.20;

// Scratch for the skirt walk. Sized off the finest tier once, never per build.
const MAX_SEG = TIERS.reduce((m, t) => Math.max(m, t.seg), 0);
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
    //      can make across a ribbon is a straight ramp. It is a 64x128 profile texture.
    //   3. a darker strip at each edge, so the road has an EDGE instead of a seam.
    // material.color is the crown's albedo and the texture scales down from it, so the
    // profile keeps eight bits of precision instead of quantising 0.007 into two of them.
    this.matRoad = new THREE.MeshLambertMaterial({
      vertexColors: true,
      dithering: true,
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
        let m = 1 + DETAIL_AMP * groundDetail(wx, wz);

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
        let hollow = 0;
        if (edgeIn > 0) {
          const a = (iz * n + (ix < seg ? ix + 1 : seg)) * 3;
          const b = (iz * n + (ix > 0 ? ix - 1 : 0)) * 3;
          const c = (rowUp + ix) * 3;
          const d = (rowDn + ix) * 3;
          let div = (nrm[a] - nrm[b] + nrm[c + 2] - nrm[d + 2]) * kdiv;
          if (div > 1) div = 1; else if (div < -1) div = -1;
          const taper = edgeIn < fade ? edgeIn / fade : 1;
          div *= taper;
          if (div > 0) m *= 1 + CROWN_GAIN * div;
          else { hollow = -div; m *= 1 - AO_GAIN * hollow; }
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

  /** Lift every buried cross-section until its LOWER vertex clears the height function —
   *  see the note on RIBBON_CLEAR. roads.js emits the two edge vertices of a section
   *  consecutively (emitRun's `for s = -1; s <= 1; s += 2`), so a pair is (2i, 2i+1) and
   *  translating both by the same amount keeps the bank angle untouched.
   *  In place, on the payload's own array, before it becomes a geometry. */
  _liftRibbon(rib, quad) {
    const pos = rib.positions;
    const need = Math.min(RIBBON_CLEAR_MAX, RIBBON_CLEAR + RIBBON_CLEAR_QUAD * quad * quad);
    for (let i = 0; i + 5 < pos.length; i += 6) {
      const dA = heightAt(pos[i], pos[i + 2]) + need - pos[i + 1];
      const dB = heightAt(pos[i + 3], pos[i + 5]) + need - pos[i + 4];
      const d = dA > dB ? dA : dB;
      if (d > 0) { pos[i + 1] += d; pos[i + 4] += d; }
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
      const m = 1 + ROAD_DETAIL_AMP * groundDetail(pos[o], pos[o + 2]);
      col[o] = m; col[o + 1] = m; col[o + 2] = m;
    }
    return col;
  }

  /**
   * ART.md 3.2.2 and 3.2.3 — the road's cross-section, as a 64x128 profile texture.
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
        const q = Math.max(0, Math.min(1, p * (dm <= ROAD_CROWN_HALF_M ? 1 : wear)));
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
      rg.setIndex(new THREE.BufferAttribute(data.rib.indices, 1));
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
