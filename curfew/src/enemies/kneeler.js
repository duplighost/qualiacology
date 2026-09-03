// CURFEW — the Kneeler (manifest 'kneeler'). ROUND 6, lane C. Owner: the boss lane.
//
// Alex, fifth playtest: "I hope there are bosses somewhere." and "I've heard there's other
// guns in the game. I wish I could find them. Those would be great rewards for completing
// areas." DESIGN section 4 has always had one: a 4.40 m folded body, weight on one side,
// dormant until you are close and loud, a ground rumble 1.4 s before it stands, a 480 ms
// sweep telegraph, hp 900 with plate x0.55 and two dorsal vents x2.4 that open 1.1 s per
// 4.5 s, 600 XP on the kill (DESIGN section 6). "You walked past it once and it was
// kneeling."
//
// It is its OWN system, outside the pressure pool: the director never spawns it, the alive
// cap never counts it, lane A's release logic never touches it, and it never leaves the
// place it guards. It reads `boss: 'kneeler'` off world/placedata.js rows and stands one
// body at each — the Garden of Rest, the Cathedral of Unlight, the Weeping Mine — 6-10 m
// from the claim point on the road side, so going for the claim means going past it.
//
// THE STATES, dt-scoped on the fixed step, interpolated on present:
//   dormant  kneeling, motionless, breathing (4 s cycle, 3 cm). Part of the site.
//   stir     1.4 s of ground rumble: fx trauma at low amplitude, the sub rumble, the
//            vents flicker once. Entered by: the player inside 16 m; a noise > 0.6 inside
//            30 m; a shot on it. `boss:woke {id}` goes out on entry.
//   stand    1.1 s, it unfolds to 4.40 m. A wet crack.
//   hunt     chase 6.20 m/s (under sprint 6.60 — you CAN run) inside a 60 m leash from
//            its post. The vents open 1.1 s in every 4.5 s. In the car it does not chase:
//            it stands and watches, and sweeps the car inside 4 m.
//   sweep    it PLANTS. 480 ms telegraph on the raised arm (the whoosh is on the telegraph
//            frame), the strike point is committed at the end of the telegraph, the arm
//            comes across at 0.62 s: 45 damage through the controller's own hurt() and a
//            4 m throw. Never chase-struck.
//   recover  0.9 s. Then hunt.
//   return   the player has been past the leash for 20 s: it walks back to its post.
//   kneel    1.4 s fold back down. Then dormant, hp kept.
//   die      hp 900 gone: it folds forward over 1.4 s. `boss:killed {id, xp: 600}` and an
//            enemy:killed-shaped payload so progression pays it.
//   corpse   a landmark. It never sinks.
//
// donor: Projects/qualiacology/fetch/src/enemies.js:18-22 (KIND.kneeler: h 4.4, chase 6.2,
//   windup 2.2, strike 1.02, strikeRadius 1.48; the hit ladder) and :1787-1791 (the
//   kneeler's slower, heavier animation rate and game.shake(0.09) on its windup — the
//   rumble here is that shake, spread over the 1.4 s DESIGN gives it).
// donor: src/enemies/enemies.js raycast() :622-664 (the sphere-zone ray, and the SHARED
//   result record combat.js consumes synchronously), damage() :670-742 (THE ONE LAW: never
//   less than 1 hp; the flash on every hit), _kill() :1822-1854 (every field on every
//   emit), present() :2252-2360 (the reveal budget driven at render time).

import * as THREE from 'three';
import { CFG } from '../config.js';
import { MAJORS } from '../world/placedata.js';
import { REVEAL } from './bodies.js';
import { buildKneelerRig, poseFrame, ZONES, KNEELER_HEIGHT } from './kneeler-body.js';

/* --------------------------------------------------------------------------
   The numbers. DESIGN section 4's Kneeler row, plus the round-6 brief's leash
   and sweep geometry. CFG has no enemies block (species.js says the same) so
   they live here, each with its reason.
   -------------------------------------------------------------------------- */
const K = Object.freeze({
  height: KNEELER_HEIGHT,     // 4.40 m [DESIGN 4]
  hp: 900,                    // [DESIGN 4]
  xp: 600,                    // [DESIGN 6]
  chase: 6.20,                // m/s, under sprint 6.60 [DESIGN 4] — the escape rail
  returnMul: 0.70,            // it walks home slower than it hunts
  radius: 1.30,               // body radius: the FETCH kneeler was r 0.9 at 2.4x scale
  wakeDist: 16,               // d < 16 m [DESIGN 4]
  noiseDist: 30,              // a noise > 0.6 inside 30 m [brief]
  noiseMin: 0.6,              // on the director's scale, where the shotgun (38 m) is 1.0
  noiseRef: 38,               // director.js:134 NOISE_REF
  stirS: 1.4,                 // ground rumble before it stands [DESIGN 4]
  standS: 1.1,                // the unfold [brief]
  sweepTele: 0.48,            // 480 ms telegraph [DESIGN 4]
  sweepAt: 0.62,              // the arm lands 140 ms into the swing
  sweepS: 0.80,               // telegraph + swing
  recoverS: 0.90,             // the breath after
  sweepCommit: 2.90,          // metres from its centre at which it plants and raises the arm
  sweepArc: 2.60,             // the 2.6 m arc [DESIGN 4]: the arm's reach past the hide
  sweepLunge: 1.40,           // the step it takes INTO the swing (the swing is the step)
  sweepDmg: 45,               // [brief]
  throwM: 4.0,                // metres the player is thrown [brief]
  carSweep: 4.0,              // it sweeps the car inside this [brief]
  ventEvery: 4.5,             // the vent cycle [DESIGN 4]
  ventOpen: 1.1,              // open for this long, x2.4 [DESIGN 4]
  leash: 60,                  // never past this from its post [brief]
  leashGraceS: 20,            // beyond the leash this long and it goes home [brief]
  kneelS: 1.4,                // the fold back down
  dieS: 1.4,                  // the death fold [brief]
  breathS: 4.0, breathM: 0.03,// a 4 s cycle of 3 cm [brief]
  standOff: [6, 10],          // metres from the claim point [brief]
  flashS: 0.35,               // THE ONE LAW's floor: a hit lights the zone this long
  stirTrauma: 0.30,           // fx.addTrauma per second while it stirs, at 16 m
});

/* The species record the rest of the game can read off a Kneeler the way it
   reads e.def off a pressure body. progress/_onKill reads species + xp; earshot
   reads pos; the HUD reads zone and killed off weapon:hit. */
const DEF = Object.freeze({
  id: 'kneeler', owner: 'pressure', xp: K.xp, hp: K.hp, dmg: K.sweepDmg,
  height: K.height, radius: K.radius, mass: 900, speed: K.chase,
  telegraph: K.sweepTele, attack: K.sweepS - K.sweepTele, strikeAt: K.sweepAt - K.sweepTele,
  strikeRange: K.sweepArc, standoff: 0, deathNoise: 40,
});

/* module scratch — nothing below allocates inside step() or present() */
const _hit = { t: 0, enemy: null, zone: 'plate', point: new THREE.Vector3(), boss: true };
const _frame = { pelvisY: 0, pitch: 0 };
const _dir = new THREE.Vector3();
const _noise = { x: 0, z: 0, radius: 0, source: 'boss' };
const _woke = { id: '', x: 0, z: 0, by: '' };
const _killed = { id: '', xp: K.xp, x: 0, y: 0, z: 0 };
const _evt = {
  e: null, x: 0, y: 0, z: 0, xp: 0, dmg: 0, zone: '', kind: '', species: 'kneeler',
  owner: 'pressure', rear: false, melee: false,
};
const _a = { stand: 0, fold: 0, sweep: 0, swing: 0, side: 1, gait: 0, moveAmp: 0, breath: 0 };
const _zw = { x: 0, y: 0, z: 0, r: 0, zone: '' };

// bearings off the line to him, the SAME side first (k.slideSide), then the other side
const SLIDE = [0, 0.35, 0.7, 1.05, 1.4, 1.75, -0.35, -0.7, -1.05, -1.4, -1.75];
const SLIDE_ALL = SLIDE.concat([2.1, 2.5, -2.1, -2.5, Math.PI]);
const NAV_LOOK = 2.4;        // metres of lookahead a whisker must clear (nav.js LOOKAHEAD is speed-scaled)
const NAV_HOLD = 0.45;       // seconds a detour heading is held before the whiskers are asked again
const FAR_MAX = 16;          // road points 36-48 m from the claim that a candidate post is judged from

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

export class Kneeler {
  static id = 'kneeler';

  constructor(ctx) {
    this.ctx = ctx;
    this.rng = ctx.rng.fork('kneeler');
    this.all = [];
    this._built = false;
    this._stir = true;             // the test knob: config({ kneeler: { stir: false } })
    this._unsub = [];
    this._voiced = 0;              // playAt calls that were given a voice
    this._voiceTried = 0;
    this._pendingSettle = false;
    // A noise the bus carries reaches a dormant body inside 30 m if it is louder than
    // 0.6 on the director's scale (38 m = 1.0). Stored as a flag; the step reads it.
    const bus = ctx.bus;
    if (bus && bus.on) {
      const off = bus.on('noise', (p) => {
        if (!p || !(p.radius >= K.noiseRef * K.noiseMin)) return;
        for (let i = 0; i < this.all.length; i++) {
          const k = this.all[i];
          if (k.state !== 'dormant') continue;
          const dx = p.x - k.pos.x, dz = p.z - k.pos.z;
          if (dx * dx + dz * dz <= K.noiseDist * K.noiseDist) k.heard = true;
        }
      });
      if (typeof off === 'function') this._unsub.push(off);
      // A site streaming in brings its colliders with it: re-check the post is still
      // legal ground the next step. Cheap (a few canOccupy calls) and only while dormant.
      const off2 = bus.on('chunk:built', () => { this._pendingSettle = true; });
      if (typeof off2 === 'function') this._unsub.push(off2);
    }
  }

  _sys(id) { return this.ctx.systems ? this.ctx.systems.get(id) : null; }

  async init() {
    if (typeof window === 'undefined') return;   // node syntax checks build nothing
    const scene = this.ctx.scene;
    if (!scene) return;
    let idx = 0;
    for (const d of MAJORS) {
      if (d.boss !== 'kneeler') continue;
      const rig = buildKneelerRig(this.rng);
      const k = this._record(idx++, d, rig);
      this._settlePost(k);
      rig.root.visible = true;
      scene.add(rig.root);
      this.all.push(k);
    }
    this._built = this.all.length > 0;

    const T = (window.__CURFEW = window.__CURFEW || {});
    T.kneeler = {
      list: () => this.list(),
      state: () => this.state(),
      wake: (i, by) => { const k = this.all[i]; if (k) this._stirUp(k, by || 'test'); return !!k; },
      setStir: (on) => { this._stir = !!on; return this._stir; },
      openVents: (i, on) => { const k = this.all[i]; if (!k) return false; k.ventForce = on === null || on === undefined ? 0 : (on ? 1 : -1); this._vents(k, true); return k.ventsOpen; },
      zoneWorld: (i, zone, which) => this.zoneWorld(i, zone, which || 0),
      damage: (i, n, zone) => { const k = this.all[i]; return k ? this.damage(k, n, { zone: zone || 'plate' }) : null; },
      constants: () => K,
    };
  }

  ready() { return true; }

  dispose() {
    for (let i = 0; i < this._unsub.length; i++) { try { this._unsub[i](); } catch (e) { void e; } }
    this._unsub.length = 0;
    for (let i = 0; i < this.all.length; i++) {
      const k = this.all[i];
      this._unseat(k);
      if (k.rig.root.parent) k.rig.root.parent.remove(k.rig.root);
      k.rig.dispose();
    }
    this.all.length = 0;
  }

  config(patch) {
    const p = patch && patch.kneeler;
    if (!p) return;
    if (p.stir !== undefined) this._stir = !!p.stir;
  }

  /* ------------------------------------------------------------ the record -- */

  _record(i, d, rig) {
    return {
      id: i, placeId: d.id, place: d, species: 'kneeler', owner: 'pressure', def: DEF,
      rig, alive: true, dead: false, state: 'dormant', stateT: 0, hp: K.hp,
      pos: new THREE.Vector3(), prevPos: new THREE.Vector3(), currPos: new THREE.Vector3(),
      yaw: 0, prevYaw: 0, currYaw: 0,
      post: { x: d.x, z: d.z, yaw: 0 }, postSettled: false, claimX: d.x, claimZ: d.z,
      roadX: d.x, roadZ: d.z, hasRoad: false, placeTries: 0, resettled: 0, padY: 0, roadSight: false,
      farRoadX: d.x, farRoadZ: d.z, hasFarRoad: false,
      farPts: new Float64Array(FAR_MAX * 2), farN: 0,   // road points 36-48 m from the claim, spread
      stuckT: 0, slideSide: 1,
      // the pose, twice, so present() can interpolate it
      curr: { stand: 0, fold: 0, sweep: 0, swing: 0, gait: 0, moveAmp: 0, breath: 0, vent: 0 },
      prev: { stand: 0, fold: 0, sweep: 0, swing: 0, gait: 0, moveAmp: 0, breath: 0, vent: 0 },
      side: 1,
      ventT: 0, ventsOpen: false, ventForce: 0, ventSaid: false,
      flashT: 99, lastZone: 'plate', telegraphCharge: 0, committed: false,
      awayT: 0, heard: false, stirBy: '', wokeT: -1, stoodT: -1,
      struck: false, strikeX: 0, strikeZ: 0, strikeBx: 0, strikeBz: 0, lungeLeft: 0,
      colChunk: 'kneeler:' + i, colX: 0, colZ: 0, colOn: false,
      reveal: 1, sweeps: 0, landed: 0, misses: 0, hits: 0, voiced: 0, stands: 0,
      audioId: 0, breathT: 0, time: 0, dist: 1e9,
      // the post is provisional until the site's own colliders have streamed in
      // (see _recheck); `sightFinal` says the road-sight answer was taken with them present
      sightFinal: false, navYaw: 0, navT: 0, navOn: false,
    };
  }

  /* ------------------------------------------------------------- the place -- */

  /**
   * Stand it 6-10 m from the claim point on the ROAD side of it, on legal ground:
   * terrain height, off the pad's colliders (collision.canOccupy), off the road.
   * Facing the road. Refuses a spot rather than clipping; falls back to the ideal
   * point only when every candidate refuses, and says so on the record.
   */
  _settlePost(k) {
    const d = k.place;
    const places = this._sys('places');
    const roads = this._sys('roads');
    const terrain = this._sys('terrain');
    const collision = this._sys('collision');

    // the claim point, in the site's yawed frame (places.js _proximity :1385-1387)
    let yaw = 0;
    const rec = places && places.nodes && places.nodes.get ? places.nodes.get(d.id) : null;
    if (rec && typeof rec.yaw === 'number') yaw = rec.yaw;
    const c = d.claim || { dx: 0, dz: 0 };
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cx = d.x + (c.dx || 0) * cy + (c.dz || 0) * sy;
    const cz = d.z - (c.dx || 0) * sy + (c.dz || 0) * cy;
    k.claimX = cx; k.claimZ = cz;

    // the road: the direction the player comes from
    let ux = -sy, uz = -cy;      // the site's front (-Z local), if the road cannot be found
    if (roads && typeof roads.nearestRoadInfo === 'function') {
      const info = roads.nearestRoadInfo(cx, cz, 140);
      if (info && info.hit) {
        k.roadX = info.x; k.roadZ = info.z; k.hasRoad = true;
        const dx = info.x - cx, dz = info.z - cz;
        const L = Math.hypot(dx, dz) || 1;
        ux = dx / L; uz = dz / L;
      }
    }
    const padY = terrain && terrain.heightAt ? terrain.heightAt(cx, cz) : 0;
    k.padY = padY;
    // "Visible from the road at 40 m" is answered from points ON THE ROAD 36-48 m out, not
    // from the nearest asphalt (at the Garden that is 9 m away and 5.5 m up, and sees over a
    // wall the road at 36 m cannot). Up to FAR_MAX of them, at least 6 m apart, so a
    // candidate post is judged from the whole stretch of road and not from the first patch
    // of asphalt the scan met — MEASURED 2026-09-03 (tests/artifacts/probe-c2.mjs): at the
    // Cathedral the first patch was behind a wall at 7 m while a point 36 m out on the same
    // road had every ray clear. Sampled here, off the hot path (boot and one re-settle).
    k.hasFarRoad = false; k.farN = 0;
    if (roads && typeof roads.roadDistance === 'function') {
      for (let r = 36; r <= 48 && k.farN < FAR_MAX; r += 4) {
        for (let a = 0; a < Math.PI * 2 && k.farN < FAR_MAX; a += 0.13) {
          const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
          if (roads.roadDistance(x, z) >= 2.5) continue;
          let apart = true;
          for (let j = 0; j < k.farN && apart; j++) {
            const ex = k.farPts[j * 2] - x, ez = k.farPts[j * 2 + 1] - z;
            if (ex * ex + ez * ez < 36) apart = false;
          }
          if (!apart) continue;
          k.farPts[k.farN * 2] = x; k.farPts[k.farN * 2 + 1] = z; k.farN++;
        }
      }
      if (k.farN > 0) { k.farRoadX = k.farPts[0]; k.farRoadZ = k.farPts[1]; k.hasFarRoad = true; }
    }
    const legal = (x, z) => this._legal(x, z, padY);

    this._unseat(k);                 // its own SOLID would fail its own test
    // MEASURED 2026-09-03 (tests/artifacts/probe-boss2.mjs): the first pass chose the first
    // LEGAL spot, which at the Garden was inside the walled avenue — legal, and hidden from
    // the road behind a 1.5 m wall at every distance past 10 m (0 px changed at 25 and 45 m
    // with the body toggled off). "Dormant it is part of the site's silhouette" needs a line
    // from the road to the hump, so the search prefers a legal spot the road can SEE and
    // falls back to any legal spot only when the site offers none (k.roadSight says which).
    const RADII = [8, 7, 9, 6, 10];
    const ANGLES = [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.1, -2.1, 2.6, -2.6, Math.PI];
    let found = false, seen = false, fx = cx + ux * 8, fz = cz + uz * 8;
    for (let ri = 0; ri < RADII.length && !seen; ri++) {
      for (let ai = 0; ai < ANGLES.length && !seen; ai++) {
        const a = ANGLES[ai];
        const ca = Math.cos(a), sa = Math.sin(a);
        const vx = ux * ca - uz * sa, vz = ux * sa + uz * ca;
        const x = cx + vx * RADII[ri], z = cz + vz * RADII[ri];
        if (!legal(x, z)) continue;
        if (!found) { fx = x; fz = z; found = true; }
        // seen from ANY of the far road points (the one that sees it is recorded as THE far
        // point, for the suite and the report); the nearest asphalt only decides the facing
        const far = k.farN > 0 ? this._anyFarSees(k, x, z) : (k.hasRoad ? this._roadSees(k, x, z, k.roadX, k.roadZ) : true);
        if (far) { fx = x; fz = z; seen = true; }
      }
    }
    k.placeTries++;
    k.postSettled = found;
    k.roadSight = seen;
    k.post.x = fx; k.post.z = fz;
    // facing the road
    const tx = k.hasRoad ? k.roadX : cx + ux * 40, tz = k.hasRoad ? k.roadZ : cz + uz * 40;
    k.post.yaw = Math.atan2(-(tx - fx), -(tz - fz));
    if (k.state === 'dormant' || k.state === 'corpse') {
      k.pos.set(fx, this._ground(fx, fz), fz);
      k.yaw = k.post.yaw;
      k.prevPos.copy(k.pos); k.currPos.copy(k.pos);
      k.prevYaw = k.currYaw = k.yaw;
      this._seat(k);
    }
  }

  /**
   * Legal ground for a 4.40 m body: off the road, on the pad's level, and clear of every
   * collider that EXISTS RIGHT NOW. That last clause is the trap: a site's colliders arrive
   * with its chunk (places.js buildChunk), so at boot the Cathedral and the Mine said yes to
   * a spot inside their own walls. Measured 2026-09-03 with tests/artifacts/probe-boss.mjs:
   * two of three posts were inside a building. The 'chunk:built' listener re-asks.
   */
  _legal(x, z, padY) {
    const roads = this._sys('roads');
    const terrain = this._sys('terrain');
    const collision = this._sys('collision');
    if (roads && typeof roads.roadDistance === 'function' && roads.roadDistance(x, z) < CFG.roads.width * 0.5 + 1.6) return false;
    if (terrain && terrain.heightAt && Math.abs(terrain.heightAt(x, z) - padY) > 6) return false;
    if (collision && typeof collision.canOccupy === 'function' && !collision.canOccupy(x, z, K.radius, K.height)) return false;
    return true;
  }

  /**
   * A chunk built: is a dormant body's post still legal with the colliders that now exist?
   * And ONCE, the moment the site's own colliders are present, the post is settled again
   * from scratch — MEASURED 2026-09-03 (tests/artifacts/probe-c2.mjs): the boot-time search
   * said the road saw all three posts, and with the walls streamed in the Mine's post was
   * behind the winding house from every road point (a wall 3 m in front of it on every
   * ray). A road-sight answer taken before the walls exist is not an answer.
   */
  _recheck(k) {
    if (k.state !== 'dormant' || k.placeTries >= 40) return;
    // its own collider is SOLID and would fail its own test: lift it for the ask
    this._unseat(k);
    if (!k.sightFinal && this._siteStreamed(k)) {
      k.sightFinal = true;
      k.resettled++;
      this._settlePost(k);
      return;
    }
    const ok = this._legal(k.post.x, k.post.z, k.padY);
    if (ok) { this._seat(k); return; }
    k.resettled++;
    this._settlePost(k);
  }

  /** Does any of the sampled road points 36-48 m out see a body kneeling at (x, z)? The
      first that does becomes k.farRoadX/Z. Boot and re-settle only. */
  _anyFarSees(k, x, z) {
    for (let j = 0; j < k.farN; j++) {
      const ox = k.farPts[j * 2], oz = k.farPts[j * 2 + 1];
      if (this._roadSees(k, x, z, ox, oz)) { k.farRoadX = ox; k.farRoadZ = oz; return true; }
    }
    return false;
  }

  /**
   * Have the site's own colliders arrived? places.js buildChunk builds a major's body (and
   * emits its colliders) when the chunk holding the site's CENTRE builds, and records it in
   * `places.bodies` under that chunk's key — so the owner is asked. MEASURED 2026-09-03
   * (tests/artifacts/probe-c4.mjs): the first cut asked for any collider within 25 m of the
   * claim and a tree from the neighbouring chunk answered before the walls existed, so the
   * Mine's post was finalised behind its own winding house. Guarded fallback: an OBB near the
   * claim (sites are walls and buildings; trunks are circles). Chunk:built only.
   */
  _siteStreamed(k) {
    const places = this._sys('places');
    const chunks = this._sys('chunks');
    if (places && places.bodies && typeof places.bodies.get === 'function'
      && chunks && typeof chunks.chunkIdAt === 'function') {
      const list = places.bodies.get(String(chunks.chunkIdAt(k.place.x, k.place.z)));
      return !!(list && list.length > 0);
    }
    const col = this._sys('collision');
    if (!col || typeof col.debugNearest !== 'function') return false;
    const n = col.debugNearest(k.claimX, k.claimZ, 25);
    return !!(n && n.kind === 'obb');
  }

  /**
   * Is a body kneeling at (x, z) a SHAPE from an eye on the road at (ox, oz)? Four SIGHT
   * rays through collision plus the terrain march, at 0.8 / 1.6 / 2.4 / 3.2 m above its
   * feet; three must clear. MEASURED 2026-09-03 (tests/artifacts/probe-c3.mjs): one ray to
   * the hump top said yes at the Garden's far road point while the picture held a 5 x 3 px
   * speck over the road crest — the top of the hump and nothing else. A sliver is not a
   * shape.
   */
  _roadSees(k, x, z, ox, oz) {
    const col = this._sys('collision');
    if (!col || typeof col.raycast !== 'function') return true;
    const oy = this._ground(ox, oz) + CFG.player.EYE;
    const gy = this._ground(x, z);
    const mask = col.MASK ? (col.MASK.SIGHT | col.MASK.GROUND) : 12;
    let clear = 0;
    for (let i = 0; i < 4; i++) {
      const ty = gy + 0.8 + i * 0.8;
      _dir.set(x - ox, ty - oy, z - oz);
      const L = _dir.length() || 1;
      _dir.multiplyScalar(1 / L);
      _hit.point.set(ox, oy, oz);
      const h = col.raycast(_hit.point, _dir, L - 1.2, mask);
      if (!(h && h.hit !== false)) clear++;
    }
    return clear >= 3;
  }

  /** A clear line from its chest to his: it never sweeps through a wall. */
  _seesPlayer(k, px, py, pz) {
    const col = this._sys('collision');
    if (!col || typeof col.raycast !== 'function') return true;
    const oy = k.pos.y + 2.4, ty = py + CFG.player.EYE * 0.6;
    _dir.set(px - k.pos.x, ty - oy, pz - k.pos.z);
    const L = _dir.length() || 1;
    _dir.multiplyScalar(1 / L);
    _hit.point.set(k.pos.x, oy, k.pos.z);
    const mask = col.MASK ? col.MASK.SIGHT : 4;
    const h = col.raycast(_hit.point, _dir, L - 0.5, mask);
    return !(h && h.hit !== false);
  }

  _ground(x, z) {
    const t = this._sys('terrain');
    return t && t.heightAt ? t.heightAt(x, z) : 0;
  }

  /* ------------------------------------------------------- the collider -- */

  /** A stationary Kneeler is a SOLID the player cannot walk through, and NOT a
      shot-blocker: the zones own the bullets (MASK.SOLID only). */
  _seat(k) {
    const col = this._sys('collision');
    if (!col || typeof col.addCollider !== 'function') return;
    if (k.colOn && Math.abs(k.colX - k.pos.x) < 0.3 && Math.abs(k.colZ - k.pos.z) < 0.3) return;
    if (typeof col.removeChunk === 'function') col.removeChunk(k.colChunk);
    const g = k.pos.y;
    const mask = col.MASK && col.MASK.SOLID ? col.MASK.SOLID : 1;
    col.addCollider({
      kind: 'circle', x: k.pos.x, z: k.pos.z, r: K.radius, tag: 'kneeler', mask,
      y0: g - 0.2, y1: g + K.height, authored: true,
    }, k.colChunk);
    k.colOn = true; k.colX = k.pos.x; k.colZ = k.pos.z;
  }

  _unseat(k) {
    if (!k.colOn) return;
    const col = this._sys('collision');
    if (col && typeof col.removeChunk === 'function') col.removeChunk(k.colChunk);
    k.colOn = false;
  }

  /* ------------------------------------------------------------- the voice -- */

  _voice(k, name, gain, ref) {
    const a = this._sys('audio');
    this._voiceTried++;
    if (!a || typeof a.playAt !== 'function' || typeof a.has !== 'function' || !a.has(name)) return null;
    const s = a.spec();
    s.bus = 'creatures'; s.cls = 'threat'; s.gain = gain; s.ref = ref || 18;
    s.priority = 1; s.send = 0.35; s.propagate = false;
    const v = a.playAt(name, k.pos.x, k.pos.y + 1.8, k.pos.z, s);
    if (v) { this._voiced++; k.voiced++; }
    return v;
  }

  _noiseOut(k, radius, source) {
    _noise.x = k.pos.x; _noise.z = k.pos.z; _noise.radius = radius; _noise.source = source;
    this.ctx.bus.emit('noise', _noise);
  }

  /* -------------------------------------------------------------- states -- */

  _enter(k, state) {
    k.state = state;
    k.stateT = 0;
  }

  _stirUp(k, by) {
    if (!k.alive || k.state !== 'dormant') return;
    k.stirBy = by;
    k.heard = false;
    k.wokeT = k.time;
    k.stoodT = -1;
    k.ventT = 0;
    this._enter(k, 'stir');
    this._voice(k, 'kn_rumble', 1.0, 26);
    _woke.id = k.placeId; _woke.x = k.pos.x; _woke.z = k.pos.z; _woke.by = by;
    this.ctx.bus.emit('boss:woke', _woke);
  }

  _telegraph(k, kind) {
    _evt.e = k; _evt.kind = kind; _evt.x = k.pos.x; _evt.y = k.pos.y + K.height * 0.6; _evt.z = k.pos.z;
    _evt.xp = 0; _evt.dmg = 0; _evt.zone = ''; _evt.rear = false; _evt.melee = false;
    this.ctx.bus.emit('enemy:telegraph', _evt);
  }

  _kill(k, dmg, zone) {
    k.alive = false;
    k.dead = true;
    this._enter(k, 'die');
    k.curr.sweep = 0; k.curr.swing = 0; k.curr.moveAmp = 0;
    k.ventForce = 0; this._vents(k, true);
    this._unseat(k);
    this._voice(k, 'kn_death', 1.0, 30);
    this._noiseOut(k, DEF.deathNoise, 'boss');
    _killed.id = k.placeId; _killed.xp = K.xp;
    _killed.x = k.pos.x; _killed.y = k.pos.y + K.height * 0.5; _killed.z = k.pos.z;
    this.ctx.bus.emit('boss:killed', _killed);
    _evt.e = k; _evt.kind = 'kill'; _evt.xp = K.xp; _evt.dmg = dmg; _evt.zone = zone || k.lastZone || 'plate';
    _evt.x = k.pos.x; _evt.y = k.pos.y + K.height * 0.5; _evt.z = k.pos.z; _evt.rear = false; _evt.melee = false;
    this.ctx.bus.emit('enemy:killed', _evt);
  }

  /** The vents: open 1.1 s in every 4.5 s while it hunts. `ventForce` is the test
      knob (1 open, -1 shut, 0 the cycle). */
  _vents(k, silent) {
    let open;
    if (k.ventForce !== 0) open = k.ventForce > 0;
    else if (!k.alive || k.state === 'dormant' || k.state === 'stir' || k.state === 'kneel') open = false;
    else {
      const ph = k.ventT % K.ventEvery;
      open = ph >= K.ventEvery - K.ventOpen;
    }
    if (open && !k.ventsOpen && !silent) this._voice(k, 'kn_vent', 0.7, 14);
    k.ventsOpen = open;
    return open;
  }

  /* ---------------------------------------------------------------- step -- */

  step(dt) {
    if (!this._built) return;
    const p = this._sys('player');
    const shared = this.ctx.shared || null;
    const inCar = !!(shared && shared.inCar);
    const car = inCar ? this._sys('car') : null;
    const px = p && p.pos ? p.pos.x : 0, pz = p && p.pos ? p.pos.z : 0, py = p && p.pos ? p.pos.y : 0;
    const pdead = !!(p && p.dead);
    const carPos = car && car.pos ? car.pos : null;
    const cx = carPos ? carPos.x : px, cz = carPos ? carPos.z : pz;

    for (let i = 0; i < this.all.length; i++) {
      const k = this.all[i];
      k.time += dt;
      k.stateT += dt;
      // prev <- curr, for present()
      k.prevPos.copy(k.currPos); k.prevYaw = k.currYaw;
      const pr = k.prev, cu = k.curr;
      pr.stand = cu.stand; pr.fold = cu.fold; pr.sweep = cu.sweep; pr.swing = cu.swing;
      pr.gait = cu.gait; pr.moveAmp = cu.moveAmp; pr.breath = cu.breath; pr.vent = cu.vent;

      if (k.flashT < 99) k.flashT += dt;

      // the target: the car when he is in it, else him
      const tx = inCar ? cx : px, tz = inCar ? cz : pz;
      const dx = tx - k.pos.x, dz = tz - k.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      k.dist = dist;
      const postD = Math.hypot(px - k.post.x, pz - k.post.z);
      let moveAmp = 0;

      switch (k.state) {
        case 'dormant': {
          if (this._pendingSettle) this._recheck(k);
          k.breathT += dt;
          cu.breath = K.breathM * 0.5 * (1 + Math.sin(k.breathT * Math.PI * 2 / K.breathS));
          cu.stand = 0; cu.fold = 0; cu.sweep = 0; cu.swing = 0; cu.vent = 0;
          if (this._stir && !pdead) {
            const loud = shared && typeof shared.noise === 'number' ? shared.noise : 0;
            if (dist < K.wakeDist) this._stirUp(k, 'near');
            else if (loud > K.noiseMin && dist < K.noiseDist) this._stirUp(k, 'noise');
            else if (k.heard) this._stirUp(k, 'noise');
          }
          k.heard = false;
          break;
        }
        case 'stir': {
          const fx = this._sys('fx');
          if (fx && typeof fx.addTrauma === 'function') {
            const near = clamp01(1 - (dist - K.wakeDist) / 30);
            fx.addTrauma(K.stirTrauma * dt * (0.35 + 0.65 * near));
          }
          // the vents flicker ONCE, at the top of the rumble
          const t = k.stateT;
          cu.vent = t > 0.55 && t < 0.95 ? Math.sin((t - 0.55) / 0.40 * Math.PI) : 0;
          cu.breath = K.breathM * (1 + Math.sin(t * 22) * 0.4);
          cu.stand = 0;
          if (k.stateT >= K.stirS) {
            this._enter(k, 'stand');
            this._voice(k, 'kn_stand', 1.0, 22);
            this._noiseOut(k, 30, 'boss');
            this._telegraph(k, 'rise');
            cu.vent = 0;
          }
          break;
        }
        case 'stand': {
          cu.stand = clamp01(k.stateT / K.standS);
          cu.breath = 0;
          // face him as it rises
          k.yaw = this._turnToward(k.yaw, dx, dz, dt, 2.2);
          if (k.stateT >= K.standS) {
            cu.stand = 1;
            k.stoodT = k.time;
            k.stands++;
            this._enter(k, 'hunt');
            this._unseat(k);
          }
          break;
        }
        case 'hunt': {
          cu.stand = 1;
          k.ventT += dt;
          cu.vent = this._vents(k, false) ? 1 : 0;
          k.yaw = this._turnToward(k.yaw, dx, dz, dt, 3.4);
          // the leash: he has been past it for 20 s, or is dead -> home
          if (postD > K.leash + 6 || pdead) k.awayT += dt; else k.awayT = 0;
          if (k.awayT >= K.leashGraceS) { this._enter(k, 'return'); break; }
          if (inCar) {
            // it cannot catch a car: it stands and watches, and sweeps the car inside 4 m
            if (dist <= K.carSweep + 1.2) this._beginSweep(k, dx, dz);
            break;
          }
          if (!pdead && dist <= K.sweepCommit + CFG.player.RADIUS && this._seesPlayer(k, px, py, pz)) { this._beginSweep(k, dx, dz); break; }
          if (!pdead) moveAmp = this._moveToward(k, px, pz, K.chase, dt, true);
          break;
        }
        case 'sweep': {
          cu.stand = 1;
          k.ventT += dt;
          cu.vent = this._vents(k, false) ? 1 : 0;
          const t = k.stateT;
          if (t < K.sweepTele) {
            cu.sweep = t / K.sweepTele;
            cu.swing = 0;
            k.telegraphCharge = cu.sweep;
            // it PLANTS: no motion, but it keeps turning toward him until it commits
            k.yaw = this._turnToward(k.yaw, dx, dz, dt, 2.6);
          } else {
            if (!k.committed) {
              // the strike point, fixed at the end of the telegraph (enemies.js:1573-1580)
              k.committed = true;
              k.strikeX = tx; k.strikeZ = tz;
              const L = dist || 1;
              k.strikeBx = dx / L; k.strikeBz = dz / L;
              k.lungeLeft = K.sweepLunge;
              this._unseat(k);                       // or its own collider blocks the step
            }
            cu.sweep = 1;
            cu.swing = clamp01((t - K.sweepTele) / (K.sweepS - K.sweepTele));
            // the step INTO the swing, along the committed bearing, over the 140 ms
            if (k.lungeLeft > 0 && t < K.sweepAt) {
              const stepM = Math.min(k.lungeLeft, K.sweepLunge * dt / (K.sweepAt - K.sweepTele));
              const nx = k.pos.x + k.strikeBx * stepM, nz = k.pos.z + k.strikeBz * stepM;
              if (this._canStand(nx, nz)) { k.pos.x = nx; k.pos.z = nz; k.pos.y = this._ground(nx, nz); }
              k.lungeLeft -= stepM;
            }
            if (!k.struck && t >= K.sweepAt) {
              k.struck = true;
              this._land(k, p, inCar, car, px, py, pz, cx, cz);
            }
          }
          if (t >= K.sweepS) { this._enter(k, 'recover'); k.telegraphCharge = 0; this._seat(k); }
          break;
        }
        case 'recover': {
          cu.stand = 1;
          k.ventT += dt;
          cu.vent = this._vents(k, false) ? 1 : 0;
          const u = clamp01(k.stateT / K.recoverS);
          cu.sweep = 1 - u; cu.swing = 1 - u;
          if (k.stateT >= K.recoverS) { cu.sweep = 0; cu.swing = 0; this._enter(k, 'hunt'); this._unseat(k); }
          break;
        }
        case 'return': {
          cu.stand = 1; cu.vent = 0; k.ventsOpen = false;
          // he came back, or hit it: hunt again
          if (!pdead && (dist < K.wakeDist || k.heard)) { k.heard = false; k.awayT = 0; this._enter(k, 'hunt'); break; }
          const hx = k.post.x - k.pos.x, hz = k.post.z - k.pos.z;
          if (Math.hypot(hx, hz) < 1.0) {
            k.pos.x = k.post.x; k.pos.z = k.post.z; k.pos.y = this._ground(k.pos.x, k.pos.z);
            k.yaw = k.post.yaw;
            this._enter(k, 'kneel');
            this._seat(k);
            break;
          }
          k.yaw = this._turnToward(k.yaw, hx, hz, dt, 3.0);
          moveAmp = this._moveToward(k, k.post.x, k.post.z, K.chase * K.returnMul, dt, false);
          break;
        }
        case 'kneel': {
          cu.stand = 1 - clamp01(k.stateT / K.kneelS);
          cu.vent = 0;
          if (!pdead && (dist < K.wakeDist || k.heard)) {
            // disturbed mid-fold: it comes back up from where it is
            k.heard = false;
            this._enter(k, 'stand');
            k.stateT = cu.stand * K.standS;     // resume the unfold from where the fold got to
            break;
          }
          if (k.stateT >= K.kneelS) {
            cu.stand = 0; k.awayT = 0; k.breathT = 0; k.heard = false;
            this._enter(k, 'dormant');
          }
          break;
        }
        case 'die': {
          cu.fold = clamp01(k.stateT / K.dieS);
          cu.sweep = 0; cu.swing = 0; cu.vent = 0; k.ventsOpen = false;
          if (k.stateT >= K.dieS) { cu.fold = 1; this._enter(k, 'corpse'); this._seat(k); }
          break;
        }
        case 'corpse': {
          cu.fold = 1; cu.vent = 0;
          break;
        }
        default: break;
      }

      cu.moveAmp = moveAmp;
      if (moveAmp > 0) cu.gait += dt * (K.chase * moveAmp) * 0.95;
      k.currPos.copy(k.pos);
      k.currYaw = k.yaw;
    }
    this._pendingSettle = false;
  }

  _turnToward(yaw, dx, dz, dt, rate) {
    if (dx * dx + dz * dz < 1e-4) return yaw;
    const want = Math.atan2(-dx, -dz);      // the rig faces -Z at yaw 0
    let d = want - yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const m = rate * dt;
    if (d > m) d = m; else if (d < -m) d = -m;
    return yaw + d;
  }

  _canStand(x, z) {
    const col = this._sys('collision');
    if (!col || typeof col.canOccupy !== 'function') return true;
    // 0.75 m, not the body's 1.3: a shape this size has to fit through a gate a player fits
    // through, or every walled site is a pen it cannot leave (measured: the Garden's avenue).
    return col.canOccupy(x, z, 0.75, 3.0);
  }

  /**
   * Walk toward (tx, tz) at `speed`, never past the leash. Whiskers either side of the
   * line, each probed at a half and a full lookahead (NAV_LOOK) and at the step itself, the
   * first clear one HELD for NAV_HOLD seconds so a wall is walked along instead of
   * dithered at (the pool's nav.js steer() does the same with a probe stagger; this body
   * is alone and probes every step). Returns the move amplitude 0..1 for the gait.
   * MEASURED 2026-09-03 (tests/artifacts/probe-c1.mjs): the step-only slide held the
   * Garden's body against a 7.7 m wall for 12 s, jittering 0.1 m either way.
   */
  _moveToward(k, tx, tz, speed, dt, leashed) {
    const dx = tx - k.pos.x, dz = tz - k.pos.z;
    const L = Math.hypot(dx, dz);
    if (L < 0.05) return 0;
    const ux = dx / L, uz = dz / L;
    const stepM = Math.min(speed * dt, L);
    const base = Math.atan2(uz, ux);
    if (k.stuckT > 2.5) { k.slideSide = -k.slideSide; k.stuckT = 1.01; k.navOn = false; }
    // a held heading first: keep it while its own step is clear and the line is not
    if (k.navOn) {
      k.navT -= dt;
      if (k.navT <= 0) k.navOn = false;
      else if (this._probe(k, ux, uz, stepM, NAV_LOOK, leashed)) { k.navOn = false; }   // the line is open again
      else {
        const cx = Math.cos(k.navYaw), cz = Math.sin(k.navYaw);
        if (this._probe(k, cx, cz, stepM, NAV_LOOK * 0.5, leashed)) {
          k.pos.x += cx * stepM; k.pos.z += cz * stepM; k.pos.y = this._ground(k.pos.x, k.pos.z);
          k.stuckT = Math.max(0, k.stuckT - dt * 0.5);
          return 0.8;
        }
        k.navOn = false;
      }
    }
    // the whiskers, the held side first; past a second of no progress the reverse opens
    const tries = k.stuckT > 1.0 ? SLIDE_ALL : SLIDE;
    for (let pass = 0; pass < 2; pass++) {
      // pass 0: clear at the lookahead too. pass 1: clear at the step only (grind forward)
      const look = pass === 0 ? NAV_LOOK : 0;
      for (let i = 0; i < tries.length; i++) {
        const a = base + tries[i] * k.slideSide;
        const vx = Math.cos(a), vz = Math.sin(a);
        if (!this._probe(k, vx, vz, stepM, look, leashed)) continue;
        k.pos.x += vx * stepM; k.pos.z += vz * stepM; k.pos.y = this._ground(k.pos.x, k.pos.z);
        if (i === 0) { k.stuckT = 0; k.navOn = false; return 1; }
        k.stuckT = Math.max(0, k.stuckT - dt * 0.5);
        if (pass === 0) { k.navOn = true; k.navYaw = a; k.navT = NAV_HOLD; }
        return 0.7;
      }
    }
    k.stuckT += dt;
    return 0;
  }

  /** The step along (vx, vz) is legal, and so is the ground `look` metres on (half and full). */
  _probe(k, vx, vz, stepM, look, leashed) {
    const nx = k.pos.x + vx * stepM, nz = k.pos.z + vz * stepM;
    if (leashed) {
      const px = nx - k.post.x, pz = nz - k.post.z;
      if (px * px + pz * pz > K.leash * K.leash) return false;   // the leash holds
    }
    if (!this._canStand(nx, nz)) return false;
    if (look > 0) {
      if (!this._canStand(k.pos.x + vx * look * 0.5, k.pos.z + vz * look * 0.5)) return false;
      if (!this._canStand(k.pos.x + vx * look, k.pos.z + vz * look)) return false;
    }
    return true;
  }

  _beginSweep(k, dx, dz) {
    this._enter(k, 'sweep');
    k.committed = false; k.struck = false; k.lungeLeft = 0;
    k.side = this.rng.next() < 0.5 ? -1 : 1;
    k.telegraphCharge = 0.001;
    k.sweeps++;
    this._seat(k);                                  // it plants
    this._voice(k, 'kn_sweep', 0.95, 20);            // the whoosh is on the TELEGRAPH frame
    this._telegraph(k, 'windup');
  }

  /** The arm comes across. 45 through the controller's own hurt(); the car is swept
      (a noise and the shake — car.js owns its own wear); a miss is as loud as a hit. */
  _land(k, p, inCar, car, px, py, pz, cx, cz) {
    const fx = this._sys('fx');
    if (inCar) {
      const d = Math.hypot(cx - k.pos.x, cz - k.pos.z);
      if (d <= K.carSweep + 1.6) {
        k.landed++;
        this._noiseOut(k, 30, 'boss');
        if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.6);
        return;
      }
      k.misses++;
      this._noiseOut(k, 9, 'boss');
      return;
    }
    const dx = px - k.pos.x, dz = pz - k.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const facing = (dx / d) * k.strikeBx + (dz / d) * k.strikeBz;
    const reach = K.radius + K.sweepArc + CFG.player.RADIUS;
    const dy = Math.abs(py - k.pos.y);
    // MEASURED 2026-09-03 (tests/boss.mjs (e), first run): a player walking INTO the sweep
    // slides round the planted body on the collider and is on its flank at 0.62 s; a +-75
    // degree arc missed him twice. The arm comes ACROSS the front, so the arc is +-100
    // degrees, and inside arm's length of the hide there is no flank to hide on.
    const inArc = facing > -0.17 || d <= K.radius + 1.0;
    if (p && typeof p.hurt === 'function' && !p.dead && d <= reach && inArc && dy < 3.5) {
      _dir.set(dx / d, 0, dz / d);
      const hpBefore = p.hp;
      p.hurt(K.sweepDmg, _dir);
      if (p.hp < hpBefore) {
        k.landed++;
        // THE THROW: 4 m along the arm. controller.js _stepGround takes speed * FRICTION * dt
        // off the speed every fixed step (linear per step, not exp), so with no key held an
        // impulse v0 coasts v0 * dt * (1 - f) / f metres where f = FRICTION * dt, and the
        // STOP_SNAP tail under 1.2 m/s eats ~0.07 m of that. MEASURED 2026-09-03
        // (tests/artifacts/probe-c1.mjs): throwM * FRICTION (46 m/s) coasted 3.16 m on open
        // road; the discrete form below is what 4 m actually costs. It is his velocity,
        // written once; a held key caps it the next step (docs/ROUND-6/HANDOFF-C.md).
        if (p.vel) {
          const sdt = CFG.loop.FIXED, f = CFG.player.FRICTION * sdt;
          const v = (K.throwM + 0.07) * f / (sdt * (1 - f));
          p.vel.x += _dir.x * v; p.vel.z += _dir.z * v;
        }
        if (fx && typeof fx.addTrauma === 'function') fx.addTrauma(0.55);
        this._noiseOut(k, 11, 'boss:strike');
      } else {
        k.misses++;   // the grace window; the arm still went by
      }
    } else {
      k.misses++;
      // A miss must be as loud as a hit or the player never learns the dodge.
      this._noiseOut(k, 9, 'boss');
      if (fx && typeof fx.impact === 'function') {
        _hit.point.set(k.strikeX, this._ground(k.strikeX, k.strikeZ) + 0.05, k.strikeZ);
        _dir.set(0, 1, 0);
        fx.impact('dirt', _hit.point, _dir, 1.3);
      }
    }
  }

  /* --------------------------------------------------------------- hits -- */

  /**
   * Ray vs the sphere hit zones, in the SAME shape as enemies.raycast: returns
   * the SHARED result or null; combat.js consumes it synchronously and keeps
   * nothing. Zones are transformed by the same pelvis height and torso pitch
   * present() draws with, so a hit is where the pixels are.
   */
  raycast(origin, dir, maxT) {
    if (!this._built) return null;
    let bestT = maxT, found = null, foundZone = 'plate';
    const ox = origin.x, oy = origin.y, oz = origin.z;
    const dx = dir.x, dy = dir.y, dz = dir.z;
    for (let i = 0; i < this.all.length; i++) {
      const k = this.all[i];
      // a corpse still takes the round (a decal and the light): nothing ghosts
      const bx = k.pos.x - ox, by = (k.pos.y + K.height * 0.45) - oy, bz = k.pos.z - oz;
      const bt = bx * dx + by * dy + bz * dz;
      if (bt < -K.height || bt > bestT + K.height) continue;
      const bd2 = bx * bx + by * by + bz * bz - bt * bt;
      const br = K.height * 0.75;
      if (bd2 > br * br) continue;

      poseFrame(k.curr.stand, k.curr.fold, _frame);
      const cp = Math.cos(_frame.pitch), sp = Math.sin(_frame.pitch);
      const cy = Math.cos(k.yaw), sy = Math.sin(k.yaw);
      for (let z = 0; z < ZONES.length; z++) {
        const zn = ZONES[z];
        // torso-local -> pelvis frame (pitch about X) -> world (yaw about Y)
        const ly = zn.y * cp - zn.z * sp;
        const lz = zn.y * sp + zn.z * cp;
        const lx = zn.x;
        const wx = k.pos.x + lx * cy + lz * sy;
        const wy = k.pos.y + _frame.pelvisY + k.curr.breath + ly;
        const wz = k.pos.z - lx * sy + lz * cy;
        const px = wx - ox, py = wy - oy, pz = wz - oz;
        const tca = px * dx + py * dy + pz * dz;
        if (tca < 0 || tca > bestT) continue;
        const r = zn.r;
        const d2 = px * px + py * py + pz * pz - tca * tca;
        if (d2 > r * r) continue;
        const t = tca - Math.sqrt(r * r - d2);
        if (t < 0 || t >= bestT) continue;
        bestT = t; found = k;
        foundZone = zn.zone === 'vent' && !k.ventsOpen ? 'plate' : zn.zone;
      }
    }
    if (!found) return null;
    _hit.t = bestT;
    _hit.enemy = found;
    _hit.zone = foundZone;
    _hit.boss = true;
    _hit.point.set(ox + dx * bestT, oy + dy * bestT, oz + dz * bestT);
    return _hit;
  }

  /** A zone's world sphere, for the test: which = the n-th zone of that name. */
  zoneWorld(i, zone, which) {
    const k = this.all[i];
    if (!k) return null;
    poseFrame(k.curr.stand, k.curr.fold, _frame);
    const cp = Math.cos(_frame.pitch), sp = Math.sin(_frame.pitch);
    const cy = Math.cos(k.yaw), sy = Math.sin(k.yaw);
    let n = 0;
    for (let z = 0; z < ZONES.length; z++) {
      const zn = ZONES[z];
      if (zn.zone !== zone) continue;
      if (n++ !== which) continue;
      const ly = zn.y * cp - zn.z * sp, lz = zn.y * sp + zn.z * cp, lx = zn.x;
      _zw.x = k.pos.x + lx * cy + lz * sy;
      _zw.y = k.pos.y + _frame.pelvisY + k.curr.breath + ly;
      _zw.z = k.pos.z - lx * sy + lz * cy;
      _zw.r = zn.r; _zw.zone = zn.zone;
      return { x: _zw.x, y: _zw.y, z: _zw.z, r: _zw.r, zone: _zw.zone };
    }
    return null;
  }

  /**
   * Take damage. combat.js calls this directly and reads `.killed` off the
   * return. THE ONE LAW: never less than 1, and the zone lights (flashT) for
   * 0.35 s on every hit. A dormant Kneeler that is shot RISES.
   */
  damage(k, amount, info) {
    if (!k || !k.alive) return { killed: false, hpFrac: 0, species: 'kneeler' };
    const zone = info && info.zone ? info.zone : 'plate';
    const dmg = Math.max(1, Math.round(amount));
    k.hp -= dmg;
    k.hits++;
    k.flashT = 0;
    k.lastZone = zone;
    if (k.state === 'dormant') this._stirUp(k, 'shot');
    else if (k.state === 'return' || k.state === 'kneel') k.heard = true;   // it turns back on you
    if (k.hp <= 0) {
      this._kill(k, dmg, zone);
      return { killed: true, hpFrac: 0, species: 'kneeler' };
    }
    return { killed: false, hpFrac: clamp01(k.hp / K.hp), species: 'kneeler' };
  }

  /* ------------------------------------------------------------- present -- */

  present(alpha) {
    if (!this._built) return;
    const cam = this.ctx.camera;
    const camX = cam ? cam.position.x : 0, camY = cam ? cam.position.y : 0, camZ = cam ? cam.position.z : 0;
    for (let i = 0; i < this.all.length; i++) {
      const k = this.all[i];
      const rig = k.rig;
      const pr = k.prev, cu = k.curr;
      const x = k.prevPos.x + (k.currPos.x - k.prevPos.x) * alpha;
      const y = k.prevPos.y + (k.currPos.y - k.prevPos.y) * alpha;
      const z = k.prevPos.z + (k.currPos.z - k.prevPos.z) * alpha;
      let dyaw = k.currYaw - k.prevYaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      const yaw = k.prevYaw + dyaw * alpha;

      rig.root.position.set(x, y, z);
      rig.root.rotation.y = yaw;

      _a.stand = lerp(pr.stand, cu.stand, alpha);
      _a.fold = lerp(pr.fold, cu.fold, alpha);
      _a.sweep = lerp(pr.sweep, cu.sweep, alpha);
      _a.swing = lerp(pr.swing, cu.swing, alpha);
      _a.gait = lerp(pr.gait, cu.gait, alpha);
      _a.moveAmp = lerp(pr.moveAmp, cu.moveAmp, alpha);
      _a.breath = lerp(pr.breath, cu.breath, alpha);
      _a.side = k.side;
      rig.pose(_a);
      rig.vents(lerp(pr.vent, cu.vent, alpha));

      // THE REVEAL BUDGET. Held back inside 6 m unless committed to the strike (bodies.js
      // REVEAL, DESIGN section 4), and then THE TORCH'S OWN FALLOFF on top of it. The species
      // law was measured on a 1.10 m hound; a 4.40 m hide fills the frame at 2.6 m, where the
      // torch (decay 2, lights.js) is (6 / 2.6)^2 = 5.3x what it is at 6 m and 9.5x what it
      // is at 8 m. MEASURED 2026-09-03 (tests/artifacts/r1-commit-reveal.mjs, mid-sweep at
      // 2.6 m, torch on, the body's mean luminance): committed at reveal 1 it was 83.8 at the
      // Cathedral and 67.6 at the Garden - a khaki mannequin, the picture Alex would see every
      // time the arm lands with his torch on; the species floor 0.34 still gave 50.9 / 49.5
      // (tan); 0.19 gave 39.0 / 42.7 (a dark hide, the bone bands and the rim read); 0 gave
      // 28.9 / 29.5 (rim only). So inside NEAR the budget is scaled by (dist / NEAR)^2 -
      // the inverse square the torch obeys - committed or not: at 2.6 m the commit still lifts
      // the hide 3x (0.064 -> 0.19) under a rim x3 and eyes x3.4, the torch picture is the
      // same at 1.7 m as at 5 m by construction, and past 6 m nothing changes (every 8 / 10 /
      // 15 / 25 / 45 m number in tests/boss.mjs is taken at near = 1). His words, DESIGN 4:
      // partial bodies scare, the fully revealed shape does not.
      const ddx = x - camX, ddy = (y + K.height * 0.45) - camY, ddz = z - camZ;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
      const committed = (k.state === 'sweep' && k.telegraphCharge > 0.45) || _a.swing > 0.01;
      const t = clamp01((dist - REVEAL.NEAR) / (REVEAL.FAR - REVEAL.NEAR));
      const near = dist < REVEAL.NEAR ? (dist / REVEAL.NEAR) * (dist / REVEAL.NEAR) : 1;
      const want = (committed ? 1 : REVEAL.FLOOR + (1 - REVEAL.FLOOR) * t) * near;
      if (Math.abs(want - k.reveal) > 0.004) {
        k.reveal += (want - k.reveal) * 0.22;
        rig.reveal(k.reveal);
      }

      // the telegraph on the rim + the eyes, and the hit flash on top of it
      let tv = k.state === 'sweep' ? k.telegraphCharge : 0;
      if (k.flashT < K.flashS) tv = Math.max(tv, 1 - k.flashT / K.flashS);
      if (k.alive) rig.telegraph(tv);
      else rig.deathGlow(1 - _a.fold);
    }
  }

  /* ---------------------------------------------------------- the readout -- */

  /** Every body, for a suite. Allocates; never called from the loop. */
  list() {
    const out = [];
    for (let i = 0; i < this.all.length; i++) {
      const k = this.all[i];
      out.push({
        i, id: k.placeId, x: k.pos.x, y: k.pos.y, z: k.pos.z, yaw: k.yaw,
        state: k.state, stateT: k.stateT, hp: k.hp, alive: k.alive,
        stand: k.curr.stand, fold: k.curr.fold, sweep: k.curr.sweep, swing: k.curr.swing,
        ventsOpen: k.ventsOpen, ventT: k.ventT, dist: k.dist,
        post: { x: k.post.x, z: k.post.z, yaw: k.post.yaw, settled: k.postSettled, roadSight: k.roadSight, sightFinal: k.sightFinal },
        claim: { x: k.claimX, z: k.claimZ },
        road: { x: k.roadX, z: k.roadZ, has: k.hasRoad, farX: k.farRoadX, farZ: k.farRoadZ, hasFar: k.hasFarRoad },
        claimDist: Math.hypot(k.post.x - k.claimX, k.post.z - k.claimZ),
        resettled: k.resettled, placeTries: k.placeTries,
        postDist: Math.hypot(k.pos.x - k.post.x, k.pos.z - k.post.z),
        sweeps: k.sweeps, landed: k.landed, misses: k.misses, hits: k.hits, voiced: k.voiced, stands: k.stands,
        wokeT: k.wokeT, stoodT: k.stoodT, time: k.time, stirBy: k.stirBy, colOn: k.colOn,
        draws: k.rig.drawCount, shellDraws: k.rig.shellDraws, visible: k.rig.root.visible,
        reveal: k.reveal, flashT: k.flashT, lastZone: k.lastZone,
      });
    }
    return out;
  }

  state() {
    return {
      count: this.all.length, built: this._built, stir: this._stir,
      voiced: this._voiced, voiceTried: this._voiceTried,
      bodies: this.list(),
    };
  }
}

export default Kneeler;
