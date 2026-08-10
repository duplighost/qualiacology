// THE DIRECTOR — waves, placement, the surprise, and the chamber progression.
//
// This is the system that turns a room into a game. Nothing else spawns.
//
// THE CONTRACT, in one line: QUEUE LENGTH IS DURATION, CONCURRENCY IS PRESSURE.
// A chamber declares a queue (total bodies) and a cap (bodies alive at once).
// Every kill immediately pulls the next body off the queue, so on-screen threat
// is near-constant regardless of how fast the player kills — the encounter gets
// LONGER when you are slow, not THINNER. It ends only when the queue is empty
// AND nothing is alive. That separation is what gives a flat pressure line with
// a hard-capped render cost, and it is why the two numbers are never mixed.
//
// PLACEMENT. Portals, wave sets, holding ground, cover, routes and recovery
// nodes are all AUTHORED in the chamber and pre-validated by its own gate
// (`tests/world.mjs`, `tests/traversal.mjs`). This file reads them and never
// derives a position that a chamber could have authored. Two rules govern it:
//
//   THE VIEW-CONE VETO SURVIVES VERBATIM. A body may not appear inside the
//   player's 100 degree cone within the distance they can actually see — and
//   that distance GROWS with how much ground they have lit, because a spawn that
//   darkness used to hide is a spawn that a lit floor shows. Light buys the
//   player this; D3 charges them for it in accuracy. The trade runs both ways.
//
//   AUTHORED PORTALS ARE EXEMPT FROM THE ILLUMINATION VETO, AND ILLUMINATION
//   BECOMES A SCORE. A door is a door whether or not the floor in front of it is
//   lit, so refusing a lit portal would let a player seal a chamber by lighting
//   eight patches of concrete. Instead illumination is a PENALTY in the ranking,
//   so the director prefers the dark doors and only uses the lit ones when the
//   dark ones are vetoed — which reads, correctly, as the room having fewer
//   places left to hide things.
//
// A PORTAL IN A VERTICAL CHAMBER CARRIES A HEIGHT. Six of THE HELIX's nine
// portals stand on baked catwalk and gantry colliders and `groundAt` returns the
// lower floor (0.28) for all six. Placing by (x, z) alone drops every ramp and
// deck spawn 8 to 34 m. Every placement here resolves through `highestSupport`
// around the portal's declared `spawnY`.
//
// DEATH COSTS THE CHAMBER, NOT THE RUN, AND THE LIGHT STAYS (D6). That single
// ruling IS the difficulty system: the room you failed in is brighter next time,
// so you can see the fight coming, and everything in it shoots you better for
// standing in what you made. There is deliberately no second difficulty knob,
// no rubber band, no hidden damage scalar — adding one would make the light
// field's feedback loop unreadable, which is the one thing this game cannot
// afford.

import FEEL from '../feel.js';
import { clamp01 } from '../core/math.js';
import { highestSupport, lowestCeiling } from '../world/collide.js';
import { hasSurface, GROUND } from '../world/ground.js';
import { createTension } from './tension.js';
import { createDread, DREAD_TABLE } from './dread.js';

const DIR = FEEL.director;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. CONTRACT §5 — no use site below inlines
// a number. Everything FEEL.director already declares is READ from it; what is
// here is what FEEL does not carry, and every one is proposed for FEEL in
// docs/HANDOFF.md rather than kept as a private opinion.
// ---------------------------------------------------------------------------
export const WAVE_TABLE = Object.freeze({
  // The tower, in order. This is `ECONOMY_TABLE.chamberOrder` restated only in
  // the sense that both derive from the same five rooms; the director skips any
  // id the registry does not hold, so a build with three chambers ends after
  // three rather than throwing at a room that has not been authored yet.
  order: Object.freeze(['intake', 'helix', 'gallery', 'furnace', 'aperture']),

  // ---- the view-cone veto ------------------------------------------------
  minSpawnDist: 9,           // matches THE INTAKE's authored `approachClear`
  // CLOSE RANGE, derived rather than picked: it is the player's own authored
  // clearance extended by half again in the direction they are LOOKING, which
  // also puts it past the SIDEARM's 9 m flash radius — i.e. past the volume the
  // standard gun can light in front of you. Beyond it, in an unlit room, a
  // spawn is a growing point of light at a door, which is the design; inside
  // it, a spawn is a body appearing in your face, which is a bug the player
  // reads as one.
  //
  // It DOUBLES in a fully lit room, because a floor you have lit is a floor you
  // can see across. Light buys the player this; D3 charges them for it in
  // accuracy. That the trade runs both ways is the point.
  coneNear: 13.5,
  coneNearPerLit: 13.5,
  bodyClear: 1.25,           // never on top of a body that is already standing there
  // A door is a door, not a point. Bodies leave it spread across its width, so
  // three of them from a two-door wave are three arrivals rather than one
  // refusal — an UNAWARE creature does not patrol, so a body parked exactly on
  // its own spawn point would block that door until the player shot at it.
  portalSpread: 1.7,

  // ---- ground legality ----------------------------------------------------
  supportSpan: 1.2,          // ± the portal's declared spawnY (W9's number)
  headroom: 0.12,            // clearance above the archetype's own height

  // ---- the ranking --------------------------------------------------------
  // Illumination is the dominant term on purpose: the whole point of the
  // scoring version of the rule is that the director visibly prefers the dark.
  litPenalty: 3.4,
  distWeight: 0.045,
  preferDist: 22,
  repeatPenalty: 1.15,       // the same door twice running is a spawn closet
  jitter: 0.5,

  // ---- the surprise -------------------------------------------------------
  siteRetries: 12,           // "the siting loop retries up to 12 times"
  surgeCount: 5,
  surgeRange: 26,
  cacheRangeMin: 16,
  cacheRangeMax: 28,
  cacheLife: 26,
  cacheColumnRadius: 12,     // the light column's illumination radius. The 40 m
                             // in DESIGN is the column's HEIGHT in the picture;
                             // this is how far its pool reaches on the floor,
                             // and it is deliberately a real lit patch: standing
                             // under the cache costs accuracy exactly like
                             // standing in a kill scar does (D3).
  cacheColumnIntensity: 1.15,

  // ---- the telegraph ------------------------------------------------------
  // "a glyph and sparks, in the dark, is the most frightening and most fair
  // warning in the game". It is a growing point of light plus a rising tone:
  // brightness, position and TIMING, no hue (CONTRACT §6).
  telegraphLightRadius: 2.6,
  telegraphLightIntensity: 0.9,
  // The rover pool keys emitters by INTEGER (`req.key[n] = key | 0`), and the
  // key is what hysteresis is measured against — a string key silently becomes
  // 0, every telegraph in the room becomes "the same emitter", and the pool
  // holds one slot for all of them while reporting nothing wrong. This is the
  // director's own namespace, above W7's `arch.index * 4096 + id`.
  lightKeyBase: 0x400000,
  telegraphCuePeak: 0.045,
  telegraphCueHz: 210,
  telegraphCueGlide: 1.7,

  // ---- pressure telemetry -------------------------------------------------
  aliveBand: 2,              // the gate's ±2 of cap
});

const W = WAVE_TABLE;

// The phases, and there are deliberately only five. A state machine with a state
// per feeling is a state machine nobody can reason about; every one of these is
// a different answer to the two questions that matter — MAY SOMETHING SPAWN, and
// MAY A BEAT FIRE.
export const PHASE = Object.freeze({
  idle: 0, gap: 1, wave: 2, landing: 3, loading: 4, complete: 5,
});
const PHASE_NAME = Object.freeze(['idle', 'gap', 'wave', 'landing', 'loading', 'complete']);

/** Largest-remainder apportionment. The shares sum to `total`, exactly. */
export function apportion(total, weights, out) {
  const n = weights.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += weights[i];
  if (sum <= 0 || n === 0) return out;
  let given = 0;
  for (let i = 0; i < n; i++) {
    out[i] = Math.floor(total * weights[i] / sum);
    if (out[i] < 1) out[i] = 1;
    given += out[i];
  }
  // Hand the remainder to the biggest fractional parts, biggest first.
  let guard = 0;
  while (given < total && guard++ < total + n) {
    let best = -1, bestFrac = -1;
    for (let i = 0; i < n; i++) {
      const frac = total * weights[i] / sum - out[i];
      if (frac > bestFrac) { bestFrac = frac; best = i; }
    }
    out[best]++; given++;
  }
  // If the minimum-of-one floor overshot (a chamber with more waves than
  // bodies), take back from the largest until it balances.
  guard = 0;
  while (given > total && guard++ < given + n) {
    let best = -1, bestVal = 1;
    for (let i = 0; i < n; i++) if (out[i] > bestVal) { bestVal = out[i]; best = i; }
    if (best < 0) break;
    out[best]--; given--;
  }
  return out;
}

/**
 * The player's facing, in the PLAYER convention — forward is
 * (-sin yaw, -cos yaw), which is NOT the enemy convention (+sin, +cos). Getting
 * this backwards points the veto at the wall behind the player and produces a
 * cone test that passes for ever while spawning bodies straight into their face.
 */
export function inViewCone(px, pz, yaw, x, z, halfAngleRad, range) {
  const dx = x - px, dz = z - pz;
  const d2 = dx * dx + dz * dz;
  if (d2 > range * range) return false;
  if (d2 < 1e-9) return true;
  const d = Math.sqrt(d2);
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  return (dx * fx + dz * fz) / d >= Math.cos(halfAngleRad);
}

export function create(ctx) {
  // DETERMINISM (CONTRACT §3): `derive`, not `fork`. A chamber restart must
  // replay identically — fork() is memoised, so the second arming of a chamber
  // would continue the first one's stream and the "same" retry would not be.
  let rng = ctx.rng ? ctx.rng.derive('director') : null;
  let placeRng = rng ? rng.fork('place') : null;
  let rosterRng = rng ? rng.fork('roster') : null;
  let surpriseRng = rng ? rng.fork('surprise') : null;
  let dreadRng = rng ? rng.derive('dread') : null;

  const tension = createTension(ctx);
  const dread = createDread(ctx, tension, dreadRng);

  const halfCone = DIR.viewConeVeto * Math.PI / 360;

  // ---- state --------------------------------------------------------------
  let phase = PHASE.idle;
  let chamberId = null;
  let spec = null;
  let cap = DIR.chambers.intake.cap;
  let interval = DIR.chambers.intake.interval;
  let clock = 0;                 // sim seconds, monotonic (CONTRACT §5)
  let phaseT = 0;
  let gapDur = 0;
  let waveIndex = -1;
  let waveT = 0;
  let spawnTimer = 0;
  let spawnedThisWave = 0;
  let surpriseAt = -1;
  let surpriseFired = false;
  let surgeLeft = 0;
  let surgeX = 0, surgeZ = 0, surgeY = 0, surgeBearing = 0;
  let landingSec = DREAD_TABLE.landingSec;
  let loadTarget = null;
  let deadPending = false;

  const shares = new Int32Array(24);
  let waveCount = 0;

  // Per-chamber archetype weights, flattened once at arm() so the pick is a
  // single scan of two small arrays with no per-spawn allocation.
  const rosterIds = [];
  const rosterCum = new Float64Array(8);
  let rosterN = 0;

  // ---- the telegraph ring -------------------------------------------------
  // Fixed length, reused records. A spawn is a light and a sound BEFORE it is a
  // body; the ring is what makes "0.40 s of warning" a structural property
  // rather than a promise.
  const PENDING = DIR.hardAliveCap;
  const pending = new Array(PENDING);
  for (let i = 0; i < PENDING; i++) {
    pending[i] = { on: false, t: 0, x: 0, y: 0, z: 0, yaw: 0, type: '', portal: '', cued: false, serial: 0 };
  }
  let pendingSerial = 1;

  // ---- the cache (one at a time; the surprise is once per wave) -----------
  const cache = { on: false, t: 0, x: 0, y: 0, z: 0 };

  // ---- QA -----------------------------------------------------------------
  const stats = {
    spawned: 0, attempts: 0, refusals: 0, telegraphs: 0, waves: 0, chamberClears: 0,
    deaths: 0, surprises: 0, surges: 0, caches: 0, budgetHits: 0,
    aliveSamples: 0, aliveInBand: 0, aliveBreaches: 0, breachesWithReason: 0,
    peakAlive: 0, coneVetoes: 0, groundVetoes: 0, occupiedVetoes: 0, nearVetoes: 0,
    managerRefusals: 0, boundsVetoes: 0, widened: 0,
  };
  const refusalReasons = Object.create(null);
  const shortfallReasons = Object.create(null);
  let lastShortfall = '';
  let lastRefusal = '';
  const waveGaps = [];       // QA: the measured length of each designed silence

  // D6 — the light stays. One archive per chamber id, written at every exit
  // (death or clear) and restored on every entry.
  const archives = new Map();

  // ---- injected providers. NO SILENT DEFAULTS (C2-F8). --------------------
  const defaulted = { chambers: true, enemies: true };
  const provide = {
    chambers: () => ctx.chambers,
    enemies: () => ctx.enemies,
  };

  const _spot = { ok: false, x: 0, y: 0, z: 0, yaw: 0, portal: '', reason: '', score: 0 };
  const _cursor = { x: 0, y: 0, z: 0, yaw: 0 };

  // =========================================================================
  // READS OFF THE WORLD
  // =========================================================================
  function player(out) {
    const p = ctx.player;
    if (p && p.body) {
      out.x = p.body.x; out.y = p.body.y; out.z = p.body.z;
      out.yaw = p.state ? p.state.yaw : 0;
      return out;
    }
    const c = ctx.camera;
    if (c) {
      out.x = c.position.x; out.y = c.position.y - FEEL.move.eye; out.z = c.position.z;
      out.yaw = c.rotation ? c.rotation.y : 0;
      return out;
    }
    out.x = 0; out.y = 0; out.z = 0; out.yaw = 0;
    return out;
  }

  const em = () => provide.enemies();
  const aliveNow = () => { const e = em(); return e ? e.alive : 0; };

  function pendingCount() {
    let n = 0;
    for (let i = 0; i < PENDING; i++) if (pending[i].on) n++;
    return n;
  }

  /** How far a spawn must stay outside the cone, given how lit the player is. */
  function coneRange(px, py, pz) {
    const lit = ctx.light ? ctx.light.litAt(px, py + FEEL.move.eye, pz) : 0;
    return W.coneNear + W.coneNearPerLit * lit;
  }

  // =========================================================================
  // PLACEMENT
  //
  // One function decides whether a point is legal and one decides which legal
  // point is best. They are separate because the gate asserts them separately:
  // legality is a hard veto that must NEVER be crossed, ranking is a preference
  // that may be overridden by there being nowhere better.
  // =========================================================================

  /**
   * Ground legality. Returns the surface height, or GROUND.none.
   *
   * `refY` is the portal's declared `spawnY` (or, for a sited point, the
   * player's own feet) and the search is a ±1.2 m band around it — which is what
   * makes a deck portal land on the deck instead of 34 m below it on the floor
   * that `groundAt` would have handed back.
   */
  function supportAt(x, z, refY, radius, height) {
    const world = ctx.world;
    if (!world) return refY;                 // headless: the caller is the authority
    const y = highestSupport(world, x, z, radius, refY - W.supportSpan, refY + W.supportSpan);
    if (!hasSurface(y)) return GROUND.none;
    const ceil = lowestCeiling(world, x, z, radius, y + W.headroom, y + height + W.headroom);
    if (ceil < GROUND.top && ceil < y + height) return GROUND.none;
    return y;
  }

  function insideBounds(x, z) {
    const b = spec && spec.bounds;
    if (!b) return true;
    return x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
  }

  function occupied(x, y, z) {
    const e = em();
    if (!e || !e.list) return false;
    const list = e.list;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (!o || o.id < 0 || o.dead) continue;
      const dx = o.x - x, dz = o.z - z, dy = o.y - y;
      if (dx * dx + dz * dz < W.bodyClear * W.bodyClear && Math.abs(dy) < FEEL.move.height) return true;
    }
    // A point already claimed by a telegraph counts as occupied: two bodies
    // materialising inside one another is the one spawn artefact a player reads
    // as a bug rather than as a threat.
    for (let i = 0; i < PENDING; i++) {
      const p = pending[i];
      if (!p.on) continue;
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz < W.bodyClear * W.bodyClear) return true;
    }
    return false;
  }

  /**
   * THE HARD VETOES, in the order that makes a refusal reason useful. Writes
   * `_spot.reason` and returns the surface height, or GROUND.none.
   */
  function vetoes(x, z, refY, radius, height, px, py, pz, yaw, range) {
    if (!insideBounds(x, z)) { _spot.reason = 'bounds'; stats.boundsVetoes++; return GROUND.none; }
    const dx = x - px, dz = z - pz;
    if (dx * dx + dz * dz < W.minSpawnDist * W.minSpawnDist) { _spot.reason = 'too-near'; stats.nearVetoes++; return GROUND.none; }
    if (inViewCone(px, pz, yaw, x, z, halfCone, range)) { _spot.reason = 'view-cone'; stats.coneVetoes++; return GROUND.none; }
    const y = supportAt(x, z, refY, radius, height);
    if (!hasSurface(y)) { _spot.reason = 'no-ground'; stats.groundVetoes++; return GROUND.none; }
    if (occupied(x, y, z)) { _spot.reason = 'occupied'; stats.occupiedVetoes++; return GROUND.none; }
    _spot.reason = '';
    return y;
  }

  /**
   * Choose a portal from the current wave's authored set. ONE call is ONE
   * ATTEMPT: it scans every candidate and returns the best legal one, so a
   * refusal means the room genuinely had nowhere to put a body, not that the
   * first door it tried was busy. That is what makes "refusals under 15% of
   * attempts" a statement about the chamber rather than about the loop.
   */
  function placePortal(out, radius, height) {
    stats.attempts++;
    out.ok = false; out.reason = ''; out.portal = '';
    if (!spec) { out.reason = 'no-chamber'; return refuse(out); }

    const sets = spec.waveSpawns;
    const ids = (sets && sets[Math.min(Math.max(waveIndex, 0), sets.length - 1)]) || null;
    player(_cursor);
    const range = coneRange(_cursor.x, _cursor.y, _cursor.z);

    // PASS 1 — the wave's OWN doors. This is the chamber's authored escalation
    // and it is always the first answer.
    if (scanPortals(ids, radius, height, range)) return award(out);
    // PASS 2 — any authored door. A wave whose whole set is behind the player's
    // eyes must not stall the room: the escalation is a PREFERENCE, the cone
    // veto is a LAW, and when they collide the law wins and the preference
    // widens. THE INTAKE has eight doors on four walls against a 100 degree
    // cone, so there is always one somewhere the player is not looking — and
    // when there genuinely is not, the refusal below is the honest answer.
    if (ids && scanPortals(null, radius, height, range)) { stats.widened++; return award(out); }

    out.reason = _scan.reason || 'no-portal';
    return refuse(out);
  }

  const _scan = { score: Infinity, x: 0, y: 0, z: 0, yaw: 0, id: '', reason: '' };

  function scanPortals(ids, radius, height, range) {
    const portals = spec.portals || [];
    _scan.score = Infinity; _scan.reason = '';
    for (let i = 0; i < portals.length; i++) {
      const p = portals[i];
      if (ids && ids.indexOf(p.id) === -1) continue;
      const refY = p.spawnY !== undefined ? p.spawnY : (p.y || 0);
      // Spread across the doorway's width, along the wall rather than through
      // it: the tangent of the inward normal.
      const nx = p.nx || 0, nz = p.nz || 0;
      const spread = placeRng ? placeRng.jitter(W.portalSpread) : 0;
      const sx = (p.spawnX !== undefined ? p.spawnX : p.x) + (-nz) * spread;
      const sz = (p.spawnZ !== undefined ? p.spawnZ : p.z) + (nx) * spread;
      const y = vetoes(sx, sz, refY, radius, height, _cursor.x, _cursor.y, _cursor.z, _cursor.yaw, range);
      if (!hasSurface(y)) { if (!_scan.reason) _scan.reason = _spot.reason; continue; }

      // THE SCORE. Illumination first (the exemption is from the VETO, never
      // from the preference), then distance shaping, then a nudge so the same
      // door does not fire twice running, then a small deterministic jitter so
      // two identical rooms do not produce two identical fights.
      const lit = ctx.light ? ctx.light.litAt(sx, y + FEEL.move.eye, sz) : 0;
      const dx = sx - _cursor.x, dz = sz - _cursor.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const score = lit * W.litPenalty
        + Math.abs(d - W.preferDist) * W.distWeight
        + (p.id === lastPortalId ? W.repeatPenalty : 0)
        + (placeRng ? placeRng.next() * W.jitter : 0);
      if (score < _scan.score) {
        _scan.score = score; _scan.x = sx; _scan.y = y; _scan.z = sz;
        _scan.yaw = p.yaw || 0; _scan.id = p.id;
      }
    }
    return _scan.score < Infinity;
  }

  function award(out) {
    out.ok = true; out.x = _scan.x; out.y = _scan.y; out.z = _scan.z; out.yaw = _scan.yaw;
    out.portal = _scan.id; out.score = _scan.score; out.reason = '';
    return out;
  }

  let lastPortalId = '';

  /**
   * Site a point on a ring around the player — the surprise's placement. Up to
   * `siteRetries` bearings, rejecting points outside the play volume, inside
   * geometry, or already visible. Both surprise outcomes use this, which is why
   * both of them give a compass heading.
   */
  function placeSited(out, rMin, rMax, radius, height) {
    stats.attempts++;
    out.ok = false; out.reason = ''; out.portal = 'sited';
    player(_cursor);
    const range = coneRange(_cursor.x, _cursor.y, _cursor.z);
    let firstReason = '';
    for (let n = 0; n < W.siteRetries; n++) {
      const bearing = (surpriseRng ? surpriseRng.next() : 0.5) * Math.PI * 2;
      const r = rMin + (surpriseRng ? surpriseRng.next() : 0.5) * (rMax - rMin);
      const x = _cursor.x + Math.sin(bearing) * r;
      const z = _cursor.z + Math.cos(bearing) * r;
      const y = vetoes(x, z, _cursor.y, radius, height, _cursor.x, _cursor.y, _cursor.z, _cursor.yaw, range);
      if (!hasSurface(y)) { if (!firstReason) firstReason = _spot.reason; continue; }
      out.ok = true; out.x = x; out.y = y; out.z = z; out.reason = '';
      // Face the player: a surprise that arrives looking the wrong way is a
      // surprise the player walks past.
      out.yaw = Math.atan2(_cursor.x - x, _cursor.z - z);
      out.score = bearing;
      return out;
    }
    out.reason = firstReason || 'no-site';
    return refuse(out);
  }

  function refuse(out) {
    stats.refusals++;
    lastRefusal = out.reason || 'unknown';
    refusalReasons[lastRefusal] = (refusalReasons[lastRefusal] || 0) + 1;
    out.ok = false;
    return out;
  }

  // =========================================================================
  // THE ROSTER PICK — an explicit per-chamber weight table, never an
  // order-dependent if-ladder.
  // =========================================================================
  function buildRoster() {
    rosterIds.length = 0;
    rosterN = 0;
    const weights = (spec && spec.director && spec.director.weights) || {};
    const allowed = (spec && spec.roster) || Object.keys(weights);
    let sum = 0;
    for (const id of allowed) {
      const w = weights[id];
      if (!(w > 0)) continue;
      sum += w;
      rosterIds.push(id);
      rosterCum[rosterN++] = sum;
    }
    for (let i = 0; i < rosterN; i++) rosterCum[i] /= sum || 1;
  }

  function pickType() {
    if (rosterN === 0) return 'husk';
    const u = rosterRng ? rosterRng.next() : 0.5;
    for (let i = 0; i < rosterN; i++) if (u <= rosterCum[i]) return rosterIds[i];
    return rosterIds[rosterN - 1];
  }

  // =========================================================================
  // THE TELEGRAPH — 0.40 s of light and sound before the body exists
  // =========================================================================
  function telegraph(x, y, z, yaw, type, portalId) {
    for (let i = 0; i < PENDING; i++) {
      const p = pending[i];
      if (p.on) continue;
      p.on = true; p.t = 0; p.x = x; p.y = y; p.z = z; p.yaw = yaw;
      p.type = type; p.portal = portalId; p.cued = false; p.serial = pendingSerial++;
      stats.telegraphs++;
      lastPortalId = portalId;
      return p;
    }
    return null;
  }

  function hatch(p) {
    p.on = false;
    const e = em();
    if (!e || typeof e.spawn !== 'function') return null;
    const rec = e.spawn(p.type, p.x, p.y, p.z, p.yaw);
    if (!rec) {
      // The manager refuses past the hard alive cap and counts it. A silent drop
      // here would be a body the queue believes it spent.
      stats.managerRefusals++;
      stats.refusals++;
      refusalReasons['manager'] = (refusalReasons['manager'] || 0) + 1;
      lastRefusal = 'manager';
      return null;
    }
    stats.spawned++;
    spawnedThisWave++;
    const a = aliveNow();
    if (a > stats.peakAlive) stats.peakAlive = a;
    return rec;
  }

  function cueTelegraph(p) {
    const audio = ctx.audio;
    if (!audio || !audio.pool || typeof audio.pool.playAt !== 'function') return;
    const s = audio.pool.spec();
    s.when = audio.now;
    s.peak = W.telegraphCuePeak;
    s.attack = 0.006;
    s.dur = DIR.telegraph;
    s.decay = DIR.telegraph * 0.7;
    s.tone = 0.6;
    s.toneType = 'triangle';
    s.toneHz = W.telegraphCueHz;
    s.toneEnd = W.telegraphCueHz * W.telegraphCueGlide;
    s.noise = 0.4;
    s.filterHz = FEEL.audio.sfxLowpassHz;
    audio.pool.playAt('transient', p.x, p.y + 1.0, p.z, s);
  }

  // =========================================================================
  // THE WAVE
  // =========================================================================
  function planWaves() {
    const sets = (spec && spec.waveSpawns) || [];
    waveCount = Math.max(1, Math.min(shares.length, sets.length));
    const weights = new Array(waveCount);
    // THE ESCALATION IS THE CHAMBER'S OWN. A wave's share of the queue is
    // proportional to how many doors it opens, so INTAKE's 2/4/6/8 portal walk
    // outward becomes 3/5/8/10 bodies and the escalation the chamber authored in
    // geometry is the escalation the director spends bodies on. Nothing here
    // invents a curve.
    for (let i = 0; i < waveCount; i++) weights[i] = Math.max(1, (sets[i] || []).length);
    const out = new Array(waveCount);
    apportion(spec.director.queue, weights, out);
    for (let i = 0; i < waveCount; i++) shares[i] = out[i];
  }

  function queueLeft() {
    let n = 0;
    for (let i = waveIndex + 1; i < waveCount; i++) n += shares[i];
    if (waveIndex >= 0 && waveIndex < waveCount) n += Math.max(0, shares[waveIndex] - spawnedThisWave);
    return n;
  }

  function beginGap(dur) {
    phase = PHASE.gap;
    phaseT = 0;
    gapDur = dur;
  }

  function beginWave(i) {
    waveIndex = i;
    waveT = 0;
    spawnedThisWave = 0;
    spawnTimer = 0;
    surpriseFired = false;
    surgeLeft = 0;
    // ONE surprise per wave, at a random 12-22 s in, gated on there still being
    // a fight when it arrives.
    surpriseAt = DIR.surpriseMin + (surpriseRng ? surpriseRng.next() : 0.5) * (DIR.surpriseMax - DIR.surpriseMin);
    phase = PHASE.wave;
    phaseT = 0;
    stats.waves++;
  }

  function endWave() {
    // The LAST wave does not take its reward here. `economy.onChamberClear()`
    // calls `onWaveClear()` itself (GROUPED G4), so paying it twice would hand
    // the player a double heal and a double reserve top-up for finishing the
    // room — invisible in every screenshot and worth 15 hp exactly when the
    // chamber is supposed to have cost them something.
    if (waveIndex + 1 >= waveCount) { clearChamber(); return; }
    const econ = ctx.economy;
    if (econ && typeof econ.onWaveClear === 'function') econ.onWaveClear();
    beginGap(DIR.betweenWaves);
  }

  /**
   * The spawn leg. `want` is how far below the cap the room is; the interval is
   * the trickle rate and the per-frame budget is the hitch guard. A kill pulls
   * the next body immediately because the interval has, by then, always elapsed
   * — the timer only bites while the room is filling from empty.
   */
  function stepSpawning(dt) {
    if (spawnTimer > 0) spawnTimer -= dt;

    const alive = aliveNow();
    const inFlight = pendingCount();
    const left = Math.max(0, shares[waveIndex] - spawnedThisWave - inFlight);
    if (left <= 0) return 'queue-empty';

    const room = Math.min(cap, DIR.hardAliveCap) - alive - inFlight;
    if (room <= 0) return 'at-cap';
    if (spawnTimer > 0) return 'interval';

    let want = Math.min(room, left, DIR.spawnBudgetPerFrame);
    if (room > DIR.spawnBudgetPerFrame && left > DIR.spawnBudgetPerFrame) stats.budgetHits++;

    let started = 0;
    for (let n = 0; n < want; n++) {
      const type = pickType();
      const arch = archetypeSize(type);
      let spot;
      if (surgeLeft > 0) {
        // THE SURGE. Already sited, one bearing, and it crashes in as fast as
        // the per-frame budget allows rather than trickling — the cap is
        // untouched, so the pressure the player feels is the REFILL RATE, which
        // is the only knob that can move without breaking the ±2-of-cap
        // contract the whole spawner is measured against.
        _spot.ok = true; _spot.x = surgeX; _spot.y = surgeY; _spot.z = surgeZ;
        _spot.yaw = surgeBearing; _spot.portal = 'surge'; _spot.reason = '';
        spot = _spot;
      } else {
        spot = placePortal(_spot, arch.radius, arch.height);
      }
      if (!spot.ok) return 'refused:' + (spot.reason || 'unknown');
      if (!telegraph(spot.x, spot.y, spot.z, spot.yaw, type, spot.portal)) return 'telegraph-full';
      // The surge is spent at TELEGRAPH time, not at hatch: it is 0.40 s of
      // warning per body, and counting it 0.40 s late would let the loop
      // telegraph more than five of them into the same bearing.
      if (spot.portal === 'surge' && surgeLeft > 0) surgeLeft--;
      started++;
    }
    if (started > 0) spawnTimer = surgeLeft > 0 ? 0 : interval;
    return started > 0 ? '' : 'none';
  }

  function archetypeSize(type) {
    const a = FEEL.enemies[type];
    return a || FEEL.enemies.husk;
  }

  // =========================================================================
  // THE SURPRISE — both outcomes are DIRECTIONAL
  // =========================================================================
  function fireSurprise() {
    surpriseFired = true;
    stats.surprises++;
    const wantSurge = (surpriseRng ? surpriseRng.next() : 0.5) < 0.5;
    if (wantSurge) {
      const a = archetypeSize('husk');
      const s = placeSited(_spot, W.surgeRange * 0.85, W.surgeRange * 1.15, a.radius, a.height);
      if (!s.ok) return false;
      surgeX = s.x; surgeY = s.y; surgeZ = s.z; surgeBearing = s.yaw;
      surgeLeft = Math.min(W.surgeCount, Math.max(0, shares[waveIndex] - spawnedThisWave));
      spawnTimer = 0;
      stats.surges++;
      compass.kind = 'surge'; compass.x = s.x; compass.y = s.y; compass.z = s.z; compass.at = clock;
      thud(s.x, s.y, s.z, 0.16, 96);
      return true;
    }
    const a = archetypeSize('husk');
    const s = placeSited(_spot, W.cacheRangeMin, W.cacheRangeMax, a.radius, a.height);
    if (!s.ok) return false;
    cache.on = true; cache.t = W.cacheLife; cache.x = s.x; cache.y = s.y; cache.z = s.z;
    const econ = ctx.economy;
    if (econ && typeof econ.spawnPickup === 'function') econ.spawnPickup('ammo', s.x, s.y, s.z);
    stats.caches++;
    compass.kind = 'cache'; compass.x = s.x; compass.y = s.y; compass.z = s.z; compass.at = clock;
    thud(s.x, s.y, s.z, 0.20, 72);
    return true;
  }

  /** The compass heading, spoken in the one channel the dark cannot take away. */
  function thud(x, y, z, peak, hz) {
    const audio = ctx.audio;
    if (!audio || !audio.pool || typeof audio.pool.playAt !== 'function') return;
    const s = audio.pool.spec();
    s.when = audio.now;
    s.peak = peak;
    s.attack = 0.004;
    s.dur = 0.55;
    s.decay = 0.32;
    s.tone = 0.7;
    s.toneType = 'triangle';
    s.toneHz = hz;
    s.toneEnd = hz * 0.6;
    s.noise = 0.35;
    s.filterHz = FEEL.audio.sfxLowpassHz;
    audio.pool.playAt('transient', x, y + 0.6, z, s);
  }

  const compass = { kind: '', x: 0, y: 0, z: 0, at: -1 };

  // =========================================================================
  // D6 — THE LIGHT STAYS
  //
  // The chamber registry resets the field on dispose, and it is right to: THE
  // APERTURE inheriting THE INTAKE's floor would be nonsense. So per-chamber
  // persistence belongs HERE, and it is what makes "death costs the chamber, not
  // the run" a mechanic rather than a sentence.
  //
  // The round trip is EXACT, and it is exact for a structural reason rather than
  // by luck: `deposit` merges anything inside FIELD.mergeDist, so every scar in
  // the list was created with no other scar within 6 m and positions never move
  // — restoring them in any order therefore cannot merge, and each comes back
  // with the radius and intensity it had.
  // =========================================================================
  function archiveLight(id) {
    if (!ctx.light || !id) return 0;
    const src = ctx.light.scars;
    const out = new Array(src.length);
    for (let i = 0; i < src.length; i++) {
      const s = src[i];
      out[i] = { x: s.x, y: s.y, z: s.z, r: s.r, i: s.i };
    }
    archives.set(id, out);
    return out.length;
  }

  function restoreLight(id) {
    const arc = archives.get(id);
    if (!arc || !ctx.light) return 0;
    for (let i = 0; i < arc.length; i++) {
      const s = arc[i];
      ctx.light.deposit(s.x, s.y, s.z, s.r, s.i);
    }
    return arc.length;
  }

  // =========================================================================
  // CHAMBER PROGRESSION
  // =========================================================================
  function arm(id) {
    const reg = provide.chambers();
    spec = (reg && reg.specOf && reg.specOf(id)) || (ctx.chamber && ctx.chamber.id === id ? ctx.chamber.spec : null);
    if (!spec) throw new Error(`director: no chamber spec for "${id}"`);
    chamberId = id;
    cap = Math.min(spec.director.cap, DIR.hardAliveCap);
    interval = spec.director.interval;
    landingSec = (reg && reg.CHAMBERS && reg.CHAMBERS.landingSec) || DREAD_TABLE.landingSec;
    planWaves();
    buildRoster();
    waveIndex = -1;
    spawnedThisWave = 0;
    surgeLeft = 0;
    cache.on = false;
    lastPortalId = '';
    waveGaps.length = 0;
    tension.setChamber(spec);
    dread.cancelAll();
    // "Before each chamber's first wave, 2.6 s of engineered total silence with
    // all spawning suspended. The quiet is the telegraph."
    beginGap(DREAD_TABLE.preWaveSilence + DIR.firstWave);
    return spec;
  }

  function clearChamber() {
    stats.chamberClears++;
    const econ = ctx.economy;
    // GROUPED G4 — flares refill to full on every chamber clear, and the weak
    // wave-clear reward rides along. The rewards themselves are AUTHORED, in the
    // chamber (`spec.reward`) and in the economy's own chamber table; the
    // director grants them, it does not define them.
    if (econ && typeof econ.onChamberClear === 'function') econ.onChamberClear();
    archiveLight(chamberId);
    phase = PHASE.landing;
    phaseT = 0;
  }

  function nextChamberId(from) {
    const reg = provide.chambers();
    const i = W.order.indexOf(from);
    for (let n = i + 1; n < W.order.length; n++) {
      const id = W.order[n];
      if (!reg || typeof reg.has !== 'function' || reg.has(id)) return id;
    }
    return null;
  }

  /**
   * Leave for `id`. The fade, the dispose and the build all belong to the
   * chamber registry; this waits for it and then re-arms everything that is
   * per-chamber. Every pending dread payoff is cancelled FIRST — a stinger
   * scheduled in chamber 2 must never fire into chamber 3.
   */
  function beginLoad(id, opts) {
    dread.cancelAll();
    const e = em();
    if (e && typeof e.reset === 'function') e.reset();
    for (let i = 0; i < PENDING; i++) pending[i].on = false;
    cache.on = false;
    loadTarget = { id, restore: !!(opts && opts.restore), heal: !!(opts && opts.heal) };
    phase = PHASE.loading;
    phaseT = 0;
    const reg = provide.chambers();
    if (reg && typeof reg.load === 'function') reg.load(id);
    return loadTarget;
  }

  function finishLoad() {
    const t = loadTarget;
    loadTarget = null;
    if (!t) return false;
    // The field the registry just reset. D6: on a RETRY it comes back; on an
    // ADVANCE it does not, because the next room's floor is the next room's.
    if (t.restore) restoreLight(t.id);
    const econ = ctx.economy;
    if (econ && typeof econ.setChamber === 'function') econ.setChamber(t.id);
    const p = ctx.player;
    const start = (ctx.chamber && ctx.chamber.playerStart)
      || (provide.chambers() && provide.chambers().specOf ? (provide.chambers().specOf(t.id) || {}).playerStart : null);
    if (p) {
      if (t.heal && typeof p.reset === 'function') p.reset();
      if (start && typeof p.spawn === 'function') p.spawn(start.x, start.y, start.z, start.yaw);
    }
    arm(t.id);
    return true;
  }

  /** The player died. The chamber costs; the light does not. */
  function onDeath() {
    stats.deaths++;
    archiveLight(chamberId);
    beginLoad(chamberId, { restore: true, heal: true });
  }

  // =========================================================================
  // THE TICK
  // =========================================================================
  function step(dt) {
    clock += dt;
    phaseT += dt;

    // Telegraph clocks first: a body that is due this step should exist before
    // anything measures how many are alive.
    for (let i = 0; i < PENDING; i++) {
      const p = pending[i];
      if (!p.on) continue;
      p.t += dt;
      if (p.t >= DIR.telegraph) hatch(p);
    }

    if (cache.on) { cache.t -= dt; if (cache.t <= 0) cache.on = false; }

    // DEATH. Observed, never waited for — the controller does not know this
    // module exists and nothing should tell it.
    const pl = ctx.player;
    if (pl && pl.state && pl.state.alive === false && phase !== PHASE.loading && phase !== PHASE.idle && !deadPending) {
      deadPending = true;
      onDeath();
    }
    if (pl && pl.state && pl.state.alive) deadPending = false;

    // The scheduler is permitted ONLY in the landings and the pre-wave quiet.
    const permit = phase === PHASE.gap || phase === PHASE.landing;
    dread.step(dt, permit);

    switch (phase) {
      case PHASE.gap: {
        if (phaseT >= gapDur) {
          waveGaps.push(phaseT);
          beginWave(waveIndex + 1);
        }
        break;
      }
      case PHASE.wave: {
        waveT += dt;
        const reason = stepSpawning(dt);
        samplePressure(reason);

        if (!surpriseFired && waveT >= surpriseAt && aliveNow() > DIR.surpriseAliveMin) fireSurprise();

        const drained = spawnedThisWave >= shares[waveIndex] && pendingCount() === 0;
        if (drained && aliveNow() === 0) endWave();
        break;
      }
      case PHASE.landing: {
        if (phaseT >= landingSec) {
          const next = nextChamberId(chamberId);
          if (!next) { phase = PHASE.complete; break; }
          beginLoad(next, { restore: false, heal: false });
        }
        break;
      }
      case PHASE.loading: {
        const reg = provide.chambers();
        const live = !reg || !loadTarget ? false
          : (reg.state === undefined ? true : reg.state === 'live') && !!ctx.chamber && ctx.chamber.id === loadTarget.id;
        if (live) finishLoad();
        break;
      }
      default: break;
    }
    return phase;
  }

  /**
   * THE PRESSURE LINE, measured rather than believed. Concurrency is the design's
   * pressure knob, so the one thing this system must be able to prove is that it
   * held the cap — and when it could not, WHY. A shortfall with no reason is a
   * director quietly failing to do its job, which is exactly the failure that
   * cannot be seen in a screenshot.
   */
  function samplePressure(reason) {
    if (waveIndex < 0 || waveIndex >= waveCount) return;
    const alive = aliveNow();
    if (alive > stats.peakAlive) stats.peakAlive = alive;
    // Only judge the band while the wave COULD be at the cap. Two cases are
    // design, not shortfall, and counting them would make this metric measure
    // the chamber instead of the director: the TAIL of a wave is supposed to
    // run down to zero, and a wave whose whole share is smaller than the cap
    // (THE INTAKE's first wave is three bodies against a cap of six) can never
    // reach it by construction.
    const left = Math.max(0, shares[waveIndex] - spawnedThisWave);
    if (alive + left + pendingCount() < cap) return;
    stats.aliveSamples++;
    if (Math.abs(alive - cap) <= W.aliveBand) { stats.aliveInBand++; return; }
    stats.aliveBreaches++;
    const why = reason || (pendingCount() > 0 ? 'telegraph' : 'unknown');
    if (why) {
      stats.breachesWithReason++;
      lastShortfall = why;
      shortfallReasons[why] = (shortfallReasons[why] || 0) + 1;
    }
  }

  // =========================================================================
  // PRESENTATION — probes and lights, ONCE per frame. Adding a probe from
  // step() would add it once per substep and a 120 Hz sim under a 60 Hz frame
  // would light every telegraph twice as brightly as the tuning says.
  // =========================================================================
  function update(rdt, time) {
    wireLate();
    const dt = rdt > 0 ? rdt : 0;

    for (let i = 0; i < PENDING; i++) {
      const p = pending[i];
      if (!p.on) continue;
      if (!p.cued) { p.cued = true; cueTelegraph(p); }
      // The spark GROWS. Brightness and rate carry the warning, never hue.
      const a = clamp01(p.t / DIR.telegraph);
      const i2 = W.telegraphLightIntensity * a * a;
      if (ctx.light && typeof ctx.light.addProbe === 'function') {
        ctx.light.addProbe(p.x, p.y + 1.0, p.z, W.telegraphLightRadius, i2);
      }
      const render = ctx.render;
      if (render && render.lights && typeof render.lights.request === 'function') {
        render.lights.request('telegraph', W.lightKeyBase + p.serial, p.x, p.y + 1.0, p.z,
          W.telegraphLightRadius, i2, undefined, render.LIGHT_KIND ? render.LIGHT_KIND.POINT : 0);
      }
    }

    // THE CACHE'S LIGHT COLUMN. It is a real lit patch, not a marker: standing
    // under it costs accuracy exactly like standing in a kill scar does (D3), so
    // the decision the surprise offers is "is that ammo worth being visible for".
    if (cache.on && ctx.light && typeof ctx.light.addProbe === 'function') {
      const fade = clamp01(cache.t / W.cacheLife);
      ctx.light.addProbe(cache.x, cache.y + 1.0, cache.z, W.cacheColumnRadius, W.cacheColumnIntensity * fade);
    }

    dread.update(dt);
    tension.update(dt);
  }

  // =========================================================================
  // WIRING. Audio is LAST in the manifest, so `ctx.audio` does not exist when
  // this module is constructed; the audio half is wired on the first update,
  // which still runs before audio's own update in the same frame.
  // =========================================================================
  const wired = { audio: false, depositScale: false };

  function wireLate() {
    if (!wired.audio && ctx.audio && ctx.audio.score) {
      // The bus writes these every frame from now on; this only records that the
      // provider stopped being the rig's default, which is what its own
      // assertWired() inverts on.
      wired.audio = true;
    }
    if (!wired.depositScale && ctx.enemies && typeof ctx.enemies.inject === 'function' && ctx.economy) {
      // The combo multiplies the scar a kill leaves, and the multiplier is owned
      // by the economy's chain. Injecting it here rather than restating it means
      // there is one definition of the multiplier in the build.
      ctx.enemies.inject({ depositScale: () => ctx.economy.multiplier });
      wired.depositScale = true;
    }
  }

  function assertWired() {
    const missing = [];
    if (!ctx.chambers) missing.push('director: ctx.chambers — the director cannot arm a chamber it cannot read');
    if (!ctx.enemies) missing.push('director: ctx.enemies — nothing would spawn and the room would look finished');
    if (!ctx.player) missing.push('director: ctx.player — the view-cone veto has no cone and death is never noticed');
    return missing;
  }

  /**
   * Called by main.js at chamber-ready. The audio rig's own wiring is asserted
   * here because THIS system is what feeds it: an unwired tension provider
   * freezes the bed, the sub and the heart rate at zero and looks exactly like a
   * rig that is working (C2-F8).
   */
  function ready() {
    const missing = assertWired();
    if (missing.length) throw new Error('DirectorNotWired: ' + missing.join(' | '));
    if (ctx.chamber && ctx.chamber.id && phase === PHASE.idle) arm(ctx.chamber.id);
    return true;
  }

  // =========================================================================
  // QA
  // =========================================================================
  function snapshot() {
    return {
      build: 'w10-director',
      phase: PHASE_NAME[phase], phaseT, clock,
      chamber: chamberId,
      wave: waveIndex, waves: waveCount,
      shares: Array.from(shares.slice(0, waveCount)),
      spawnedThisWave, queueLeft: queueLeft(),
      cap, hardCap: DIR.hardAliveCap, interval,
      alive: aliveNow(), pending: pendingCount(),
      gapDur, waveGaps: waveGaps.slice(),
      surpriseAt, surpriseFired, surgeLeft,
      cache: cache.on ? { x: cache.x, y: cache.y, z: cache.z, t: cache.t } : null,
      compass: compass.at >= 0 ? { ...compass } : null,
      roster: rosterIds.slice(),
      archives: [...archives.keys()],
      archived: [...archives.entries()].map(([k, v]) => `${k}:${v.length}`),
      stats: { ...stats },
      refusalRate: stats.attempts > 0 ? stats.refusals / stats.attempts : 0,
      refusalReasons: { ...refusalReasons },
      shortfallReasons: { ...shortfallReasons },
      lastRefusal, lastShortfall,
      tension: tension.snapshot(),
      dread: dread.snapshot(),
      wired: { ...wired },
      errors: assertWired(),
    };
  }

  /**
   * CONTRACT §2 — an observable assertion on the SHIPPING page, never on a
   * scratch harness. The director arms the live chamber, telegraphs a body into
   * the live roster and moves the live tension uniform.
   */
  function verify() {
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
    const FIXED = FEEL.time.fixedDt;

    if (phase === PHASE.idle && ctx.chamber && ctx.chamber.id) arm(ctx.chamber.id);
    add('the director armed the live chamber', chamberId === (ctx.chamber && ctx.chamber.id), String(chamberId));
    add('the queue is apportioned across the authored wave sets',
      waveCount > 0 && sumShares() === spec.director.queue,
      `${Array.from(shares.slice(0, waveCount)).join('+')} = ${sumShares()} / ${spec.director.queue}`);

    const before = aliveNow();
    const t0 = ctx.tension || 0;
    // Past the pre-wave silence, into the first wave, and far enough for the
    // telegraph to become a body.
    const steps = Math.round((DREAD_TABLE.preWaveSilence + DIR.firstWave + DIR.telegraph + 0.2) / FIXED);
    for (let i = 0; i < steps; i++) { step(FIXED); if ((i % 2) === 0) update(FIXED * 2, ctx.time); }

    add('bodies reach the live roster', aliveNow() > before, `${before} -> ${aliveNow()}`);
    add('the telegraph precedes the body', stats.telegraphs >= stats.spawned && stats.telegraphs > 0,
      `${stats.telegraphs} telegraphs / ${stats.spawned} spawned`);
    add('the tension bus is publishing', tension.snapshot().writes > 0 && ctx.tension !== t0,
      `${t0.toFixed(3)} -> ${(ctx.tension || 0).toFixed(3)} over ${tension.snapshot().writes} writes`);
    add('placement refusals stay under 15% of attempts',
      stats.attempts === 0 || stats.refusals / stats.attempts < 0.15,
      `${stats.refusals}/${stats.attempts}`);

    return { ok: checks.every(c => c.ok), checks };
  }

  function sumShares() {
    let n = 0;
    for (let i = 0; i < waveCount; i++) n += shares[i];
    return n;
  }

  function reset() {
    dread.reset();
    tension.reset();
    for (let i = 0; i < PENDING; i++) pending[i].on = false;
    phase = PHASE.idle; phaseT = 0; clock = 0; waveIndex = -1; waveT = 0;
    spawnedThisWave = 0; spawnTimer = 0; surgeLeft = 0; surpriseFired = false;
    cache.on = false; loadTarget = null; deadPending = false;
    waveGaps.length = 0;
    lastRefusal = ''; lastShortfall = '';
    for (const k of Object.keys(stats)) stats[k] = 0;
    for (const k of Object.keys(refusalReasons)) delete refusalReasons[k];
    for (const k of Object.keys(shortfallReasons)) delete shortfallReasons[k];
    rng = ctx.rng ? ctx.rng.derive('director') : null;
    placeRng = rng ? rng.fork('place') : null;
    rosterRng = rng ? rng.fork('roster') : null;
    surpriseRng = rng ? rng.fork('surprise') : null;
    dreadRng = rng ? rng.derive('dread') : null;
  }

  function dispose() {
    dread.cancelAll();
    for (let i = 0; i < PENDING; i++) pending[i].on = false;
    archives.clear();
  }

  const api = {
    id: 'director',
    step, update, ready, dispose, verify, snapshot, reset, assertWired,
    WAVE_TABLE, PHASE,

    // the encounter
    arm, beginWave, endWave, clearChamber, beginLoad, finishLoad, onDeath,
    nextChamberId, planWaves,
    placePortal, placeSited, fireSurprise,
    archiveLight, restoreLight,

    // the two sub-systems, published so a test can address them by name
    tension, dread,

    get phase() { return PHASE_NAME[phase]; },
    get chamber() { return chamberId; },
    get wave() { return waveIndex; },
    get waveCount() { return waveCount; },
    get cap() { return cap; },
    get alive() { return aliveNow(); },
    get pending() { return pendingCount(); },
    get queueLeft() { return queueLeft(); },
    get compass() { return compass.at >= 0 ? compass : null; },
    get clock() { return clock; },
    shares: () => Array.from(shares.slice(0, waveCount)),
    waveGaps: () => waveGaps.slice(),
    stats,

    /** C2-F8: a test injects its own registry/roster; the page uses the real ones. */
    inject(p) {
      if (!p) return api;
      if (typeof p.chambers === 'function') { provide.chambers = p.chambers; defaulted.chambers = false; }
      if (typeof p.enemies === 'function') { provide.enemies = p.enemies; defaulted.enemies = false; }
      return api;
    },
  };

  ctx.director = api;
  if (typeof window !== 'undefined' && window.__FLARE) window.__FLARE.director = api;
  return api;
}

export default create;
