// THE AI — awareness, line of sight, the distance bands, and the keep-out ring.
//
// Pure functions over a creature record and a world. No three.js, no rendering,
// no pooling, no state of its own: everything here is testable headless, which is
// what lets the gate drive twelve RUNNERs at a player for twenty seconds in
// node and measure the intrusion in metres rather than in adjectives.
//
// FOUR THINGS IN THIS FILE ARE LOAD-BEARING.
//
// 1. LINE OF SIGHT IS A REAL RAY AGAINST THE COLLIDER BAKE.
//    Not a coarse raymarch. A 1.2 m step is thicker than several of THE INTAKE's
//    colliders — the 1.24 m cover blocks, the 1.10 m stubs — so a stepped march
//    lets a creature shoot you through the exact geometry the room put there for
//    you to hide behind, intermittently, at a rate set by where the samples
//    happen to land. `losClear` marches the broadphase and slab-tests every
//    oriented box it finds, which is the same primitive src/weapons/fire.js
//    shoots with, so cover means the same thing in both directions.
//
// 2. ON LOS FAILURE, COOL DOWN AND ADVANCE AT FULL SPEED.
//    This one line kills the classic behind-cover deadlock, where the player
//    stands behind a pillar and a room full of enemies stands still forever
//    holding an attack they can never legally start. `FEEL.enemies.losFailCooldown`
//    is 0.25 s; the advance is at FULL speed, not at the strafe's 0.70, because a
//    creature that cannot see you has nothing to be careful about.
//
// 3. THE KEEP-OUT RING IS A SWEPT VELOCITY CONSTRAINT, SOLVED BEFORE INTEGRATION.
//    Never a positional shove afterwards. A shove is how a creature ends up
//    inside a wall — the resolver has already run, so the push is unchecked — and
//    it is what the gate's `relocations === 0` is really measuring. Here the
//    desired displacement is CLIPPED so the post-step distance can never fall
//    below the ring, which means the ring is honoured by construction and the
//    only intrusion the game can produce is the player walking into it.
//
// 4. AWARENESS IS D4, AND IT IS THE MECHANISM BEHIND THE PITCH.
//    "Your gun is the only thing that gives you away" was decoration until
//    firing raised a disturbance with a radius. UNAWARE -> ALERTED knows a
//    BEARING; ALERTED -> HUNTING knows a POSITION. The dash-execute raises
//    nothing at all, and that silence is the whole reason closing is worth the
//    risk.

import FEEL from '../feel.js';
import { clamp, clamp01, angleDelta, rayAabb } from '../core/math.js';
import {
  ENEMY_TABLE as T, lightNorm, spotRange, huntPressure, hitChance, reactionTime,
} from './table.js';

const E = FEEL.enemies;
const S = T.state;

// Module-scope scratch. CONTRACT §4 — the hot path allocates nothing, and an AI
// tick is resolved to completion before the next one starts.
const _desire = { vx: 0, vz: 0, speed: 0, leg: 'idle' };
const _los = { clear: false, distance: 0, blockedAt: 0 };

// ---------------------------------------------------------------------------
// LINE OF SIGHT
// ---------------------------------------------------------------------------

/**
 * Slab test against ONE oriented box in the collider set, in the box's own
 * frame. Identical in shape to the one src/weapons/fire.js shoots with — the
 * player's bullets and the enemy's eyes must agree about what a wall is, or
 * cover is a lie in one direction. (Filed as a request to promote this into
 * core/math.js so there is one copy rather than two.)
 */
function rayOrientedBox(set, i, ox, oy, oz, dx, dy, dz, until) {
  const b3 = i * 3, b9 = i * 9;
  const rx = ox - set.c[b3], ry = oy - set.c[b3 + 1], rz = oz - set.c[b3 + 2];
  const a0x = set.ax[b9], a0y = set.ax[b9 + 1], a0z = set.ax[b9 + 2];
  const a1x = set.ax[b9 + 3], a1y = set.ax[b9 + 4], a1z = set.ax[b9 + 5];
  const a2x = set.ax[b9 + 6], a2y = set.ax[b9 + 7], a2z = set.ax[b9 + 8];
  return rayAabb(
    rx * a0x + ry * a0y + rz * a0z,
    rx * a1x + ry * a1y + rz * a1z,
    rx * a2x + ry * a2y + rz * a2z,
    dx * a0x + dy * a0y + dz * a0z,
    dx * a1x + dy * a1y + dz * a1z,
    dx * a2x + dy * a2y + dz * a2z,
    0, 0, 0,
    set.e[b3], set.e[b3 + 1], set.e[b3 + 2],
    until,
  );
}

/**
 * Is the segment a -> b unobstructed by baked geometry? Writes into the shared
 * `_los` record and returns it; read it, never retain it.
 *
 * The `until` budget shrinks as nearer hits are found, exactly as the shot
 * pipeline does, so the first box that blocks ends the query. Ceilings are
 * included: a creature on the far side of a floor slab genuinely cannot see you.
 */
export function lineOfSight(world, ax, ay, az, bx, by, bz) {
  let dx = bx - ax, dy = by - ay, dz = bz - az;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  _los.distance = dist;
  _los.blockedAt = dist;
  if (dist < 1e-6) { _los.clear = true; return _los; }
  const inv = 1 / dist;
  dx *= inv; dy *= inv; dz *= inv;

  const set = world && world.colliders;
  if (!set || set.n === 0) { _los.clear = true; return _los; }

  const n = set.query(
    Math.min(ax, bx), Math.min(ay, by), Math.min(az, bz),
    Math.max(ax, bx), Math.max(ay, by), Math.max(az, bz),
  );
  let best = dist;
  for (let q = 0; q < n; q++) {
    const t = rayOrientedBox(set, set._hits[q], ax, ay, az, dx, dy, dz, best);
    if (t >= 0 && t < best) best = t;
  }
  _los.blockedAt = best;
  _los.clear = best >= dist - 1e-4;
  return _los;
}

/** Convenience: a boolean, for the places that do not want the record. */
export const losClear = (world, ax, ay, az, bx, by, bz) =>
  lineOfSight(world, ax, ay, az, bx, by, bz).clear;

// ---------------------------------------------------------------------------
// AWARENESS — D4's three states and one event
// ---------------------------------------------------------------------------

/**
 * A disturbance at (x,y,z) with a radius. Applied to ONE creature; the manager
 * loops. Returns true if the creature's state changed.
 *
 *   UNAWARE inside the radius -> ALERTED, and it turns toward the BEARING.
 *   ALERTED inside the radius -> HUNTING, and it now knows a POSITION.
 *   HUNTING                   -> refreshes the position it already knows.
 *
 * A radius of 0 — the dash-execute — reaches nothing, ever. That is the game's
 * only silent kill and it is silent by arithmetic, not by a special case.
 */
export function disturb(e, x, y, z, radius, clock) {
  if (e.dead || !(radius > 0)) return false;
  const dx = x - e.x, dy = y - (e.y + e.height * 0.5), dz = z - e.z;
  if (dx * dx + dy * dy + dz * dz > radius * radius) return false;

  e.lastDisturbAt = clock;
  if (e.aware === S.unaware) {
    e.aware = S.alerted;
    e.bearing = Math.atan2(dx, dz);
    e.alertAt = clock;
    e.transitions++;
    return true;
  }
  if (e.aware === S.alerted) {
    e.aware = S.hunting;
    e.knownX = x; e.knownZ = z; e.knownAt = clock;
    e.bearing = Math.atan2(dx, dz);
    e.transitions++;
    return true;
  }
  // Already HUNTING: the noise refreshes what it knows, which is why a player
  // who keeps firing from one spot never gets to be forgotten.
  e.knownX = x; e.knownZ = z; e.knownAt = clock;
  return false;
}

/**
 * Sight. A creature that can SEE the player goes straight to HUNTING from any
 * state — hearing is a bearing, seeing is a position.
 *
 * `lit` is the light trade read at the PLAYER's position, so lighting a room
 * extends every creature's spot range by up to 90%. That is D3, and it is why
 * the scar field is a map of ground you have made dangerous for both of you.
 */
export function look(e, arch, world, px, py, pz, lit, clock) {
  if (e.dead) return false;
  const reach = spotRange(arch, lit);
  const dx = px - e.x, dz = pz - e.z;
  const d2 = dx * dx + dz * dz;
  if (d2 > reach * reach) return false;

  // An UNAWARE creature only sees what is in front of it. An ALERTED one has
  // already turned toward a bearing, and a HUNTING one is looking at you.
  if (e.aware === S.unaware) {
    const d = Math.sqrt(d2) || 1e-6;
    if ((dx / d) * e.facingX + (dz / d) * e.facingZ < T.spotConeCos) return false;
  }

  const eye = e.y + e.height * T.strikeHeight;
  if (!lineOfSight(world, e.x, eye, e.z, px, py, pz).clear) return false;

  const changed = e.aware !== S.hunting;
  if (changed) e.transitions++;
  e.aware = S.hunting;
  e.knownX = px; e.knownZ = pz; e.knownAt = clock;
  e.sawAt = clock;
  return changed;
}

/** Memory decay. HUNTING falls back to ALERTED, ALERTED stands down. */
export function forget(e, clock) {
  if (e.dead) return;
  if (e.aware === S.hunting && clock - e.knownAt > T.huntMemory) {
    e.aware = S.alerted;
    e.alertAt = clock;
    e.transitions++;
    return;
  }
  if (e.aware === S.alerted && clock - Math.max(e.alertAt, e.lastDisturbAt) > T.alertMemory) {
    e.aware = S.unaware;
    e.transitions++;
  }
}

// ---------------------------------------------------------------------------
// THE DISTANCE BANDS
// ---------------------------------------------------------------------------

/**
 * The movement leg for this tick. Writes into the shared `_desire` record.
 *
 *   d > advanceAbove   ADVANCE at full speed
 *   d < retreatBelow   RETREAT at speed * 0.85
 *   otherwise          STRAFE  at speed * 0.70
 *
 * Plus the one line that kills the deadlock: with no line of sight, the bands do
 * not apply at all — the creature advances at full speed until it has one.
 */
export function desiredVelocity(e, arch, tx, tz, hasLos, clock) {
  const dx = tx - e.x, dz = tz - e.z;
  const d = Math.sqrt(dx * dx + dz * dz) || 1e-6;
  const nx = dx / d, nz = dz / d;

  let speed = 0, leg = 'idle';
  let vx = 0, vz = 0;

  if (!hasLos) {
    // NO LINE OF SIGHT. Close, at full speed, and do not hold an attack you can
    // never legally start. `losFailCooldown` is applied by the caller.
    speed = arch.speed * huntPressure(d);
    vx = nx * speed; vz = nz * speed;
    leg = 'blind-advance';
  } else if (d > arch.advanceAbove) {
    speed = arch.speed * huntPressure(d);
    vx = nx * speed; vz = nz * speed;
    leg = 'advance';
  } else if (d < arch.retreatBelow) {
    speed = arch.speed * E.retreatScale;
    vx = -nx * speed; vz = -nz * speed;
    leg = 'retreat';
  } else {
    speed = arch.speed * E.strafeScale;
    // Strafe perpendicular, with a slow radial correction toward the preferred
    // distance so the band is a ring rather than a wall the creature slides
    // along forever.
    const sx = -nz * e.strafeDir, sz = nx * e.strafeDir;
    const pull = clamp((d - arch.prefer) / Math.max(1, E.bandAdvance), -1, 1) * 0.35;
    vx = (sx + nx * pull) * speed;
    vz = (sz + nz * pull) * speed;
    leg = 'strafe';
  }

  _desire.vx = vx; _desire.vz = vz; _desire.speed = speed; _desire.leg = leg;
  return _desire;
}

/**
 * Flip the strafe direction on a jittered schedule. A creature that strafes one
 * way forever is a creature the player solves once; six that flip in unison are
 * a chorus line.
 */
export function tickStrafe(e, dt, rand01) {
  e.strafeT -= dt;
  if (e.strafeT <= 0) {
    e.strafeDir = -e.strafeDir;
    e.strafeT = T.strafeFlipMin + rand01 * T.strafeFlipSpan;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// THE KEEP-OUT RING — a swept constraint, solved BEFORE integration
// ---------------------------------------------------------------------------

/**
 * Clip a desired displacement so the resulting position cannot be nearer to
 * (cx, cz) than `ring`. Returns the scale factor in [0, 1] to apply, and it is
 * exact: it solves |p + s*v - c| = ring for the smallest positive s, so the
 * creature stops ON the ring instead of oscillating around it.
 *
 * Already inside the ring (the player walked into it) is handled by REFUSING
 * any further inward motion rather than by teleporting outward — the outward
 * component is untouched, so the creature leaves under its own movement and the
 * resolver still gets to say no to a wall.
 */
export function clipToRing(px, pz, vx, vz, cx, cz, ring) {
  const rx = px - cx, rz = pz - cz;
  const r2 = rx * rx + rz * rz;
  const ring2 = ring * ring;
  const a = vx * vx + vz * vz;
  if (a < 1e-12) return 1;

  const b = 2 * (rx * vx + rz * vz);

  if (r2 <= ring2) {
    // Inside already. Allow only motion that does not decrease the radius.
    return b >= 0 ? 1 : 0;
  }

  const c = r2 - ring2;
  const disc = b * b - 4 * a * c;
  if (disc <= 0) return 1;                       // the path never reaches the ring
  const sq = Math.sqrt(disc);
  const s = (-b - sq) / (2 * a);                 // first crossing
  if (s <= 0 || s >= 1) return 1;
  return clamp01(s);
}

/**
 * Enemy-enemy separation, as a VELOCITY bias. Never a positional shove: with a
 * cap of fourteen bodies inside one keep-out ring the shoves fight each other
 * and the crowd shivers. A lateral steering term instead makes the second rank
 * find its own ring, which is what "they never stack on your face" actually
 * looks like in play.
 *
 * Writes into `out` {x, z} and returns it.
 */
export function separationBias(e, list, count, out) {
  let ax = 0, az = 0, n = 0;
  for (let i = 0; i < count; i++) {
    const o = list[i];
    if (o === e || o.dead) continue;
    const dx = e.x - o.x, dz = e.z - o.z;
    const d2 = dx * dx + dz * dz;
    const want = (e.radius + o.radius) * T.separation;
    if (d2 >= want * want || d2 < 1e-9) continue;
    const d = Math.sqrt(d2);
    const w = 1 - d / want;
    ax += (dx / d) * w; az += (dz / d) * w;
    n++;
  }
  if (n === 0) { out.x = 0; out.z = 0; return out; }
  const l = Math.sqrt(ax * ax + az * az) || 1e-6;
  out.x = (ax / l) * T.separationPush;
  out.z = (az / l) * T.separationPush;
  return out;
}

// ---------------------------------------------------------------------------
// FACING — a rate, never a snap
// ---------------------------------------------------------------------------

/**
 * Turn toward a bearing at a bounded rate. A creature that snaps to face you the
 * instant it is alerted has no wind-up the player can read, and the turn IS part
 * of the telegraph for everything that shoots.
 */
export function turnToward(e, targetYaw, dt, alerted) {
  const rate = alerted ? T.turnRate : T.turnRateIdle;
  const delta = angleDelta(e.yaw, targetYaw);
  const step = clamp(delta, -rate * dt, rate * dt);
  e.yaw += step;
  e.facingX = Math.sin(e.yaw);
  e.facingZ = Math.cos(e.yaw);
  return Math.abs(delta - step) < 1e-3;
}

// ---------------------------------------------------------------------------
// THE ATTACK ROLL
// ---------------------------------------------------------------------------

/**
 * Does this shot connect? The whole of D3's first term, in one call, so the
 * trade can be measured directly by a test rather than inferred from a hit count.
 */
export function rollHit(arch, distance, lit, playerSpeed, rand01) {
  return rand01 < hitChance(arch, distance, lit, playerSpeed);
}

export { lightNorm, reactionTime, hitChance, spotRange, huntPressure };
export const AWARE = S;
export default desiredVelocity;
