// W8 — REAL BOLTS, AND THE LIGHT THEY CARRY.
//
// APEX resolved enemy fire with a dice roll — `chance = clamp(1.1 - dist/range,
// .15, .85)`, and crouching made you MORE likely to be hit — so cover was
// decorative and there was no such thing as dodging a bullet, only breaking line
// of sight. FLARE fires real travelling projectiles you can strafe out of.
//
// That is the first reason this file exists. The second is worth as much: EVERY
// BOLT CARRIES LIGHT, so incoming fire illuminates the fight. In a game whose
// premise is that the room is only as visible as you have made it, the thing
// shooting at you is also the thing showing you the floor — and a volley of six
// bolts crossing a dark room is the most information the player ever gets for
// free.
//
// THE SEPARATION RULE, written down so an art pass cannot quietly break it:
//
//     YOURS is warm, hitscan, and gone in 0.35 s.
//     THEIRS is cold and TRAVELLING.
//
// MOTION is the channel that separates them, never colour. The player has
// moderate deuteranomaly (CONTRACT §6), and the cold/warm split is a garnish on
// top of a difference they can already see: your shot is a line that was never
// there, theirs is an object crossing the room at 28 m/s. If a later art pass
// makes enemy bolts warm, nothing breaks. If it makes them instant, the game
// does — so the streak sprite's long axis is its own velocity, which is the one
// cue that survives greyscale, bloom, a 0.15x iris gain and peripheral vision.
//
// Four structural decisions, each of which cost something to get right:
//
//   1. SWEPT SEGMENT, SUBDIVIDED. Every fixed step tests the segment the bolt
//      travelled, not the point it arrived at. A segment test cannot tunnel at
//      any dt by construction; the 0.33 m subdivision (40 m/s at 1/120) is the
//      second guarantee, and it is what bounds the error of the ANALYTIC GROUND
//      march, which is the only sampled term in here.
//
//   2. AT CAP, REFUSE THE NEWEST. `Pool.take()` returns null and we count it.
//      "Recycle the oldest" is a silent drop, and in this game a dropped bolt is
//      a light vanishing out of the room for no reason the player can see —
//      which is indistinguishable, in the chair, from the renderer glitching.
//      `projectileSpawnDenied` is on the snapshot (GROUPED G8) so a build that
//      is refusing spawns says so instead of merely feeling thin.
//
//   3. NEGATIVE LIGHT LIVES IN ITS OWN SIGNED LIST. THE DAMP's darkbolt PUTS
//      LIGHT OUT. C2-F15's ruling is that folding an expiring negative entity
//      into the scar list would break the 140 cap, the merge rule and the
//      "every scar is in exactly the buckets its radius touches" field test all
//      at once, so `negLights` is a separate list with its own query and
//      `illuminationAt = max(0, Σscars − Σneg)`.
//
//   4. IMPACT IS THE ONLY DOOR. Nothing in this file spawns a ring, a particle,
//      a hitstop, a shake or a hit sound. `combat.impact()` / `combat.applyHit()`
//      do all of it, so a bolt hitting a wall and a bullet hitting a wall are
//      the same event in the same language.

import FEEL from '../feel.js';
import { rayAabb, rayCapsuleY } from '../core/math.js';
import { Pool } from '../core/pool.js';
import { GROUND, hasSurface } from '../world/ground.js';
import { makeImpact } from './impact.js';

const P = FEEL.projectiles;

/** The ONE frozen table this module owns. Balance lives in FEEL (CONTRACT §5). */
export const PROJECTILE_TABLE = Object.freeze({
  // ---- the sweep ---------------------------------------------------------
  // 40 m/s at FEEL.time.fixedDt is 0.333 m, so the subdivision is the fixed step
  // expressed in METRES rather than in seconds: it holds at any dt anyone ever
  // passes in, including a debug 1/30 or a chamber-load hitch.
  maxSweep: 0.33,
  groundSteps: 12,           // samples per swept segment against the analytic floor
  groundRefine: 10,          // bisections: 0.33 m / 2^10 = 0.3 mm
  skin: 0.02,                // pull the impact point back off the surface it hit

  // ---- the picture -------------------------------------------------------
  // Shape 2 is the streak, stretched 4x along its own direction by the additive
  // shader. That stretch IS the separation rule made visible.
  headAlpha: 0.85,
  headScale: 1.5,
  trailAlpha: 0.3,
  trailScale: 0.9,
  trailBack: 0.6,            // metres behind the head the trail sprite sits
  darkRingAlpha: 0.42,       // the darkbolt is a RING, not a blob: it emits nothing
  darkRingScale: 1.35,

  // ---- the light ---------------------------------------------------------
  coldKind: 3,               // LIGHT_KIND.COLD, without importing three into a
                             // module the headless gate has to load
  lightRange: FEEL.render.projectileLightRange,
  lightSlots: FEEL.render.lightReserve.projectiles,
  probeScale: 1.0,
  // The darkbolt's negative footprint is not a new number: it is exactly the
  // largest scar the field can hold in one place, so one darkbolt can null one
  // maximal scar and never more. FEEL.projectiles.darkbolt carries no negR/negI
  // of its own; a request to add them is filed in docs/HANDOFF.md.
  darkRadius: FEEL.field.radiusMax,
  darkIntensity: FEEL.field.intensityMax,

  // ---- misc --------------------------------------------------------------
  defaultDamage: 9,
  maxSubSteps: 64,           // guard on the subdivision loop; never reached in play
  eps: 1e-6,
});

const T = PROJECTILE_TABLE;
const COLD = FEEL.render.cold;

/** Ownership. A reflected bolt flips sides; that is the whole of the mechanic. */
export const OWNER = Object.freeze({ hostile: 0, player: 1 });

/** What a swept segment ran into. */
const HIT_NONE = 0, HIT_WORLD = 1, HIT_GROUND = 2, HIT_ACTOR = 3, HIT_PLAYER = 4;

/** The FEEL row for a kind. Unknown kinds fall back to the plain bolt. */
export const specOf = kind => (P[kind] && P[kind].speed ? P[kind] : P.bolt);

// ---------------------------------------------------------------------------
export function makeProjectiles(ctx, opts = {}) {
  const getWorld = opts.world
    ? (typeof opts.world === 'function' ? opts.world : () => opts.world)
    : () => ctx && ctx.world;

  // The impact language has ONE instance on the shipping page and it belongs to
  // W6's fire pipeline. Resolving it lazily means this module uses the page's
  // instance when there is one (so ring-pool pressure and the hit-kind counters
  // are the truth) and its own only when it is being driven standalone.
  const localCombat = makeImpact(ctx);
  const combatOf = () => ((ctx && ctx.weapons && ctx.weapons.combat) || localCombat);

  // ---- the pool. Fixed capacity, and it REFUSES rather than recycles. ------
  let serial = 0;
  const pool = new Pool(P.cap, () => ({
    serial: 0, kind: 'bolt', owner: OWNER.hostile,
    x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: -1,
    speed: 0, radius: 0, life: 0, age: 0, travelled: 0,
    glowI: 0, glowR: 0, negative: false,
    damage: 0, sourceId: -1, reflected: false, d2: 0,
  }));
  const live = pool.live;

  // C2-F15 — darkbolts are a SEPARATE SIGNED LIST. They are the same pooled
  // records, held in a second array so `negativeAt` walks three entries instead
  // of sixty-four, and so "the negative lights" is a thing that exists rather
  // than a flag somebody has to remember to test for.
  const negLights = [];

  // Nearest-N selection for the rover pool, preallocated (CONTRACT §4).
  const nearIdx = new Int32Array(P.cap);

  const stats = {
    spawned: 0, denied: 0, expired: 0,
    hitWorld: 0, hitGround: 0, hitActor: 0, hitPlayer: 0,
    reflected: 0, deflected: 0, killed: 0, damageToPlayer: 0,
    lightRequests: 0, probes: 0, sweeps: 0, maxSweepMetres: 0,
  };

  // NO SILENT DEFAULTS (C2-F8). A reflected bolt with no target list hits
  // nothing and looks exactly like a reflected bolt that missed.
  const EMPTY = Object.freeze([]);
  const defaulted = { targets: true };
  let targetProvider = null;
  let isReady = false;
  const targetsOf = () => (targetProvider ? (targetProvider() || EMPTY) : EMPTY);

  // Scratch. One hit record, resolved to completion before the next one starts.
  const _seg = { t: 0, what: HIT_NONE, actor: -1, hy: 0 };
  const _capOut = { hy: 0 };
  const _pos = { x: 0, y: 0, z: 0 };

  // See the ordering note on update(). True while THIS frame's transient probes
  // are still in ctx.light, which is what keeps illuminationAt() from counting
  // the same bolt twice. `probeMark` is the field's probe count when we finished
  // adding: main.js empties that list at the top of every frame, so a length
  // BELOW the mark proves the frame turned over even if nobody called step().
  let probesLive = false;
  let probeMark = 0;
  const probesStillInField = () => {
    if (!probesLive) return false;
    const f = ctx && ctx.light;
    return !!(f && f._probes && f._probes.length >= probeMark);
  };

  // -------------------------------------------------------------------------
  // SPAWN. Returns the record, or null at cap — and null is a REFUSAL that is
  // counted, never a quiet swap of somebody else's live light.
  // -------------------------------------------------------------------------
  function spawn(kind, x, y, z, dx, dy, dz, damage, sourceId, owner) {
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!(len > T.eps)) return null;

    const p = pool.take();
    if (!p) { stats.denied++; return null; }

    const k = P[kind] && P[kind].speed ? kind : 'bolt';
    const s = specOf(k);
    const inv = 1 / len;
    p.serial = ++serial;
    p.kind = k;
    p.owner = owner === undefined ? OWNER.hostile : owner;
    p.x = x; p.y = y; p.z = z;
    p.dx = dx * inv; p.dy = dy * inv; p.dz = dz * inv;
    p.speed = s.speed;
    p.radius = s.radius;
    p.life = s.life;
    p.age = 0;
    p.travelled = 0;
    p.d2 = 0;
    p.negative = !!s.negative;
    p.glowI = p.negative ? 0 : s.glowI;
    p.glowR = p.negative ? 0 : s.glowR;
    p.damage = damage === undefined ? T.defaultDamage : damage;
    p.sourceId = sourceId === undefined ? -1 : sourceId;
    p.reflected = false;
    if (p.negative) negLights.push(p);
    stats.spawned++;
    return p;
  }

  /** Convenience for W7: fire from A toward B. */
  function fire(kind, fx, fy, fz, tx, ty, tz, damage, sourceId) {
    return spawn(kind, fx, fy, fz, tx - fx, ty - fy, tz - fz, damage, sourceId, OWNER.hostile);
  }

  function kill(p) {
    if (p.negative) {
      const i = negLights.indexOf(p);
      if (i !== -1) { negLights[i] = negLights[negLights.length - 1]; negLights.pop(); }
    }
    pool.release(p);
  }

  // -------------------------------------------------------------------------
  // THE SWEEP. World colliders shrink a shared budget, then the analytic ground,
  // then actor capsules against the ALREADY-SHORTENED budget — the same shared
  // float that is W6's whole occlusion system, so a bolt is stopped by the same
  // pillar that stops a bullet, from the same data, with no second pass.
  // -------------------------------------------------------------------------
  function rayBox(set, i, ox, oy, oz, dx, dy, dz, until, pad) {
    const b3 = i * 3, b9 = i * 9;
    const rx = ox - set.c[b3], ry = oy - set.c[b3 + 1], rz = oz - set.c[b3 + 2];
    const a0x = set.ax[b9], a0y = set.ax[b9 + 1], a0z = set.ax[b9 + 2];
    const a1x = set.ax[b9 + 3], a1y = set.ax[b9 + 4], a1z = set.ax[b9 + 5];
    const a2x = set.ax[b9 + 6], a2y = set.ax[b9 + 7], a2z = set.ax[b9 + 8];
    // Minkowski: the box grows by the bolt's radius, so a SPHERE sweep becomes a
    // ray sweep. It rounds the corners off pessimistically (a bolt clips a corner
    // a few centimetres early), which is the correct direction for a projectile
    // whose size the player can see.
    return rayAabb(
      rx * a0x + ry * a0y + rz * a0z,
      rx * a1x + ry * a1y + rz * a1z,
      rx * a2x + ry * a2y + rz * a2z,
      dx * a0x + dy * a0y + dz * a0z,
      dx * a1x + dy * a1y + dz * a1z,
      dx * a2x + dy * a2y + dz * a2z,
      0, 0, 0,
      set.e[b3] + pad, set.e[b3 + 1] + pad, set.e[b3 + 2] + pad,
      until,
    );
  }

  function marchColliders(ox, oy, oz, dx, dy, dz, until, pad) {
    const world = getWorld();
    const set = world && world.colliders;
    if (!set || set.n === 0) return until;
    const ex = ox + dx * until, ey = oy + dy * until, ez = oz + dz * until;
    const n = set.query(
      Math.min(ox, ex) - pad, Math.min(oy, ey) - pad, Math.min(oz, ez) - pad,
      Math.max(ox, ex) + pad, Math.max(oy, ey) + pad, Math.max(oz, ez) + pad,
    );
    let best = until;
    for (let q = 0; q < n; q++) {
      const t = rayBox(set, set._hits[q], ox, oy, oz, dx, dy, dz, best, pad);
      if (t >= 0 && t < best) best = t;
    }
    return best;
  }

  /** Signed clearance between the bolt's underside and the analytic floor. */
  function groundGap(g, ox, oy, oz, dx, dy, dz, t, radius) {
    const y = oy + dy * t;
    const s = g.groundAt(ox + dx * t, oz + dz * t, y);
    return hasSurface(s) ? (y - radius) - s : 1;
  }

  function marchGround(ox, oy, oz, dx, dy, dz, until, radius) {
    const world = getWorld();
    const g = world && world.ground;
    if (!g || typeof g.groundAt !== 'function' || until <= 0) return until;
    if (groundGap(g, ox, oy, oz, dx, dy, dz, 0, radius) < 0) return until;   // already under it
    let prev = 0;
    for (let k = 1; k <= T.groundSteps; k++) {
      const t = until * (k / T.groundSteps);
      if (groundGap(g, ox, oy, oz, dx, dy, dz, t, radius) < 0) {
        let lo = prev, hi = t;
        for (let it = 0; it < T.groundRefine; it++) {
          const mid = (lo + hi) * 0.5;
          if (groundGap(g, ox, oy, oz, dx, dy, dz, mid, radius) < 0) hi = mid; else lo = mid;
        }
        return lo;    // the last sample still ABOVE the surface. Returning `hi`
                      // puts the impact millimetres UNDER the floor, and a decal
                      // below the floor z-fights it into the bullseye W1 measured.
      }
      prev = t;
    }
    return until;
  }

  function resolveSegment(p, seg) {
    const ox = p.x, oy = p.y, oz = p.z;
    const dx = p.dx, dy = p.dy, dz = p.dz;

    let best = marchColliders(ox, oy, oz, dx, dy, dz, seg, p.radius);
    let what = best < seg ? HIT_WORLD : HIT_NONE;

    const g = marchGround(ox, oy, oz, dx, dy, dz, best, p.radius);
    if (g < best) { best = g; what = HIT_GROUND; }

    let actor = -1, hy = 0;
    if (p.owner === OWNER.hostile) {
      const body = ctx && ctx.player && ctx.player.body;
      if (body) {
        const t = rayCapsuleY(ox, oy, oz, dx, dy, dz,
          body.x, body.y, body.z, body.radius + p.radius, body.height, best, _capOut);
        if (t >= 0 && t < best) { best = t; what = HIT_PLAYER; hy = _capOut.hy; }
      }
    } else {
      const list = targetsOf();
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (!a || a.dead || a.hp <= 0) continue;
        const t = rayCapsuleY(ox, oy, oz, dx, dy, dz,
          a.x, a.y, a.z, (a.radius || 0) + p.radius, a.height || 0, best, _capOut);
        if (t >= 0 && t < best) { best = t; what = HIT_ACTOR; actor = i; hy = _capOut.hy; }
      }
    }

    _seg.t = best;
    _seg.what = what;
    _seg.actor = actor;
    _seg.hy = hy;
    return _seg;
  }

  // -------------------------------------------------------------------------
  // REFLECT — the dash's other job.
  //
  // FEEL: radius 3.2, returned at 34 m/s with ownership flipped, and only while
  // DASH-invulnerable. Deliberately not `player.invulnerable()`, which is also
  // true during the 0.4 s hurt i-frames: reflecting for free after being shot
  // rewards the mistake, and the dash is supposed to be the verb.
  // -------------------------------------------------------------------------
  function dashInvulnerable() {
    const pl = ctx && ctx.player;
    if (!pl) return false;
    const c = pl.clocks && pl.clocks.dashIframe;
    return !!(c && c.running);
  }

  function tryReflect(p) {
    if (p.owner !== OWNER.hostile || !dashInvulnerable()) return false;
    const body = ctx.player.body;
    const cy = body.y + body.height * 0.5;
    const dx = p.x - body.x, dy = p.y - cy, dz = p.z - body.z;
    if (dx * dx + dy * dy + dz * dz > P.reflectRadius * P.reflectRadius) return false;

    // Sent BACK, not scattered: at the shooter if we can find them, otherwise
    // straight back down its own line. Either way the player can read where it
    // went, which is the difference between a mechanic and a firework.
    let rx = -p.dx, ry = -p.dy, rz = -p.dz;
    const list = targetsOf();
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a || a.dead || a.id !== p.sourceId) continue;
      const ax = a.x - p.x, ay = (a.y + (a.height || 0) * 0.5) - p.y, az = a.z - p.z;
      const l = Math.sqrt(ax * ax + ay * ay + az * az);
      if (l > T.eps) { rx = ax / l; ry = ay / l; rz = az / l; }
      break;
    }
    p.dx = rx; p.dy = ry; p.dz = rz;
    p.owner = OWNER.player;
    p.speed = P.reflectSpeed;
    p.reflected = true;
    p.age = 0;                       // a returned bolt gets its full life back
    stats.reflected++;

    // 'locked' is exactly the right grade and it already exists: an INWARD ring,
    // no freeze, a visibly lower light. "It refused" is the sentence.
    _pos.x = p.x; _pos.y = p.y; _pos.z = p.z;
    combatOf().impact('locked', _pos, COLD, p.sourceId);
    return true;
  }

  // -------------------------------------------------------------------------
  // RESOLUTION. Everything that can end a bolt ends it here, and every one of
  // those endings goes through impact().
  // -------------------------------------------------------------------------
  function resolveHit(p, what, actor) {
    _pos.x = p.x - p.dx * T.skin;
    _pos.y = p.y - p.dy * T.skin;
    _pos.z = p.z - p.dz * T.skin;
    const combat = combatOf();

    if (what === HIT_PLAYER) {
      stats.hitPlayer++;
      const pl = ctx.player;
      const taken = typeof pl.hurt === 'function' ? pl.hurt(p.damage) : 0;
      if (taken > 0) {
        stats.damageToPlayer += taken;
        combat.impact('hurt', _pos, COLD, p.sourceId);
      } else {
        // i-framed. It still LIT and it still rang — a shot that visibly
        // connects and does nothing at all is the most corrosive thing a
        // shooter can do, in either direction.
        stats.deflected++;
        combat.impact('locked', _pos, COLD, p.sourceId);
      }
      return;
    }

    if (what === HIT_ACTOR) {
      stats.hitActor++;
      const a = targetsOf()[actor];
      if (a) {
        // The full law, through the same door W6 uses: a floor of 1 hp, armour
        // halves, the 0.35 s light, the grade, the ring, the freeze.
        const r = combat.applyHit(a, p.damage, {
          x: _pos.x, y: _pos.y, z: _pos.z,
          dx: p.dx, dz: p.dz, tint: COLD, sourceId: p.sourceId,
        });
        if (r && r.killed) stats.killed++;
      }
      return;
    }

    if (what === HIT_GROUND) stats.hitGround++; else stats.hitWorld++;
    // A bolt splashing on concrete is a graze: 0.5 m ring, no freeze, twelve
    // sparks. It is a hit on the world, and the world does not flinch.
    combat.impact('graze', _pos, COLD, p.sourceId);
  }

  // -------------------------------------------------------------------------
  // STEP — fixed. This is the only place a projectile moves.
  // -------------------------------------------------------------------------
  function step(dt) {
    probesLive = false;
    if (!(dt > 0)) return;

    // Backwards, because a release swaps the last live item into the current
    // slot — the same reason Pool.forEachLive walks backwards, done inline so
    // the hot path does not mint a closure 120 times a second.
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      if (p.age >= p.life) { stats.expired++; kill(p); continue; }

      let remaining = p.speed * dt;
      let guard = T.maxSubSteps;
      while (remaining > T.eps && guard-- > 0) {
        const seg = remaining < T.maxSweep ? remaining : T.maxSweep;
        stats.sweeps++;
        if (seg > stats.maxSweepMetres) stats.maxSweepMetres = seg;

        const hit = resolveSegment(p, seg);
        const adv = hit.what === HIT_NONE ? seg : hit.t;
        p.x += p.dx * adv; p.y += p.dy * adv; p.z += p.dz * adv;
        p.travelled += adv;
        remaining -= adv;

        if (hit.what !== HIT_NONE) { resolveHit(p, hit.what, hit.actor); kill(p); break; }

        // The reflect test rides the SUBDIVIDED sweep, so the 3.2 m bubble is
        // never stepped over: at 0.33 m of travel per test it is sampled ten
        // times on the way in, at every frame rate.
        if (tryReflect(p)) break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // UPDATE — presentation. Sprites, probes and the rover pool.
  //
  // ORDERING NOTE, and it is a real one: main.js clears `ctx.light`'s transient
  // probe list at the TOP of the frame, and every system's step() runs before
  // every system's update(). So a probe added here is live for render() and for
  // nothing else — the next frame's steps see an empty list. That is why
  // `illuminationAt()` below exists, and why W7 should read it rather than
  // `ctx.light.illuminationAt` when it wants D3's trade to include incoming
  // fire. Filed in docs/HANDOFF.md; it is not mine to fix.
  // -------------------------------------------------------------------------
  function update() {
    const render = ctx && ctx.render;
    const add = render && render.additive;
    const lights = render && render.lights;
    const field = ctx && ctx.light;
    const cam = ctx && ctx.camera;
    const cx = cam ? cam.position.x : 0;
    const cy = cam ? cam.position.y : 0;
    const cz = cam ? cam.position.z : 0;

    // --- the picture, and the probes -------------------------------------
    let n = 0;
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      const ddx = p.x - cx, ddy = p.y - cy, ddz = p.z - cz;
      p.d2 = ddx * ddx + ddy * ddy + ddz * ddz;

      if (p.negative) {
        // It emits nothing, so it is drawn as a RING — an outline is the only
        // additive shape that reads as "a hole" rather than "a light".
        if (add) {
          add.sprite(p.x, p.y, p.z, p.radius * T.darkRingScale,
            COLD[0], COLD[1], COLD[2], T.darkRingAlpha, 1, 0, 0, 0);
        }
        continue;
      }

      if (add) {
        add.sprite(p.x, p.y, p.z, p.radius * T.headScale,
          COLD[0], COLD[1], COLD[2], T.headAlpha, 2, p.dx, p.dy, p.dz);
        add.sprite(p.x - p.dx * T.trailBack, p.y - p.dy * T.trailBack, p.z - p.dz * T.trailBack,
          p.radius * T.trailScale, COLD[0], COLD[1], COLD[2], T.trailAlpha, 2, p.dx, p.dy, p.dz);
      }
      // THE SECOND REASON THIS SYSTEM EXISTS. A bolt is a moving light source in
      // the SIMULATION, not only in the picture: the iris stops for it, the dust
      // catches it, and D3's trade reads it.
      if (field && field.addProbe) {
        field.addProbe(p.x, p.y, p.z, p.glowR, p.glowI * T.probeScale);
        stats.probes++;
      }
      if (lights) nearIdx[n++] = p._poolIndex;
    }

    // --- the rover pool: NEAREST 3, inside 18 m --------------------------
    // The pool reserves exactly three slots for this category and refuses
    // anything past its own 18 m range itself; selecting here as well keeps the
    // REQUEST count bounded, which is what stops sixty-four bolts from filling
    // the shared 64-entry request buffer and starving the muzzle.
    if (lights && n > 0) {
      const want = T.lightSlots < n ? T.lightSlots : n;
      const range2 = T.lightRange * T.lightRange;
      const kind = (render.LIGHT_KIND && render.LIGHT_KIND.COLD !== undefined)
        ? render.LIGHT_KIND.COLD : T.coldKind;
      for (let a = 0; a < want; a++) {
        let bestK = a;
        for (let b = a + 1; b < n; b++) {
          if (pool.items[nearIdx[b]].d2 < pool.items[nearIdx[bestK]].d2) bestK = b;
        }
        const tmp = nearIdx[a]; nearIdx[a] = nearIdx[bestK]; nearIdx[bestK] = tmp;
        const p = pool.items[nearIdx[a]];
        if (p.d2 > range2) break;
        // The key is the SPAWN SERIAL, not the pool index: a pool slot is reused
        // the instant a bolt dies, and hysteresis measured against a reused index
        // would treat two different bolts as one incumbent that teleported.
        if (lights.request('projectiles', p.serial, p.x, p.y, p.z, p.glowR, p.glowI, COLD, kind)) {
          stats.lightRequests++;
        }
      }
    }

    // --- the negative list ------------------------------------------------
    // Until `illuminationAt = max(0, Σscars − Σneg)` lands in lightfield.js
    // (requested in docs/HANDOFF.md) the only mechanism the page has is a
    // negative probe, and an UNCLAMPED one drives the shared query below zero
    // for five other consumers. So what is subtracted is clamped to the light
    // that is actually there, measured after the positives are in.
    if (field && field.addProbe) {
      for (let i = 0; i < negLights.length; i++) {
        const p = negLights[i];
        const here = field.illuminationAt(p.x, p.y, p.z);
        const amount = here < T.darkIntensity ? here : T.darkIntensity;
        if (amount > 0) field.addProbe(p.x, p.y, p.z, T.darkRadius, -amount);
      }
    }

    probesLive = true;
    probeMark = (field && field._probes) ? field._probes.length : 0;
  }

  // -------------------------------------------------------------------------
  // QUERIES. The bolt-inclusive, negative-inclusive illumination — this is what
  // W7 should read for D3's trade (see the ordering note above).
  // -------------------------------------------------------------------------
  function boltLightAt(x, y, z) {
    let sum = 0;
    for (let i = 0; i < live.length; i++) {
      const p = live[i];
      if (p.negative || p.glowI <= 0) continue;
      const dx = p.x - x, dy = p.y - y, dz = p.z - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const r2 = p.glowR * p.glowR;
      if (d2 >= r2) continue;
      const t = 1 - d2 / r2;
      sum += p.glowI * t * t;      // the SAME falloff illuminationAt uses
    }
    return sum;
  }

  function negativeAt(x, y, z) {
    let sum = 0;
    for (let i = 0; i < negLights.length; i++) {
      const p = negLights[i];
      const dx = p.x - x, dy = p.y - y, dz = p.z - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const r2 = T.darkRadius * T.darkRadius;
      if (d2 >= r2) continue;
      const t = 1 - d2 / r2;
      sum += T.darkIntensity * t * t;
    }
    return sum;
  }

  /**
   * max(0, Σscars + Σbolts − Σneg) — C2-F15's expression, with live fire in it.
   *
   * While this frame's probes are still in the field (between update() and the
   * next step()) the bolts are already inside `ctx.light.illuminationAt`, so
   * adding them again would double-count exactly the term this query exists to
   * supply. One flag, both orderings correct.
   */
  function illuminationAt(x, y, z) {
    const base = ctx && ctx.light ? ctx.light.illuminationAt(x, y, z) : 0;
    const v = probesStillInField() ? base : base + boltLightAt(x, y, z) - negativeAt(x, y, z);
    return v > 0 ? v : 0;
  }

  /** What every consumer reads (C2-F4). Never raw illumination. */
  const lightNorm = v => 1 - Math.exp(-v * FEEL.field.normK);

  // -------------------------------------------------------------------------
  function setTargets(fn) {
    targetProvider = typeof fn === 'function' ? fn : (Array.isArray(fn) ? () => fn : null);
    defaulted.targets = !targetProvider;
    return !!targetProvider;
  }

  function assertWired() {
    const errors = [];
    if (defaulted.targets) {
      errors.push('projectiles: setTargets() never called — a reflected bolt passes through every enemy in the room, which looks exactly like a bolt that missed');
    }
    return errors;
  }

  function ready() {
    const errors = assertWired();
    if (errors.length) {
      const e = new Error(errors.join(' | '));
      e.name = 'ProjectilesNotWired';
      throw e;
    }
    isReady = true;
    return true;
  }

  function reset() {
    for (let i = live.length - 1; i >= 0; i--) pool.release(live[i]);
    negLights.length = 0;
    serial = 0;
    probesLive = false;
    pool.denied = 0;
    for (const k of Object.keys(stats)) stats[k] = 0;
  }

  function snapshot() {
    return {
      build: 'w8-projectiles',
      live: pool.liveCount,
      capacity: pool.capacity,
      negative: negLights.length,
      /** GROUPED G8: the refusal is SURFACED. A silent drop is the bug. */
      projectileSpawnDenied: stats.denied,
      poolDenied: pool.denied,
      stats: { ...stats },
      errors: assertWired(),
      ready: isReady,
      targetProviderIsDefault: defaulted.targets,
      usesSharedImpact: !!(ctx && ctx.weapons && ctx.weapons.combat),
    };
  }

  /**
   * CONTRACT §2 — an observable assertion on the SHIPPING page. A bolt fired
   * across the real room must travel, must carry light with it, and must be
   * stopped by the real baked world rather than flying through it.
   */
  /**
   * Candidate firing positions, in the order a hostile would actually use them:
   * the chamber's own authored spawn portals first (W4 asserts every one of them
   * stands on legal ground), then its holding ground, then the player, then the
   * world origin. NOTHING here assumes an empty box — THE INTAKE's authored
   * player start currently faces a wall at 0.4 m and the body is pressed into
   * geometry (docs/HANDOFF.md, 2026-08-10), so an origin taken from the player
   * is inside a collider and every probe stops at t = 0.
   */
  function verifyOrigins(out) {
    out.length = 0;
    const ch = ctx && ctx.chamber;
    const world = getWorld();
    const g = world && world.ground;
    const stand = (x, z) => {
      const s = g ? g.groundAt(x, z, GROUND.top) : 0;
      return (hasSurface(s) ? s : 0) + FEEL.move.eye;
    };
    if (ch && ch.portals) {
      for (let i = 0; i < ch.portals.length && out.length < 4; i++) {
        const p = ch.portals[i];
        if (p && p.spawnX !== undefined) out.push(p.spawnX, stand(p.spawnX, p.spawnZ), p.spawnZ);
      }
    }
    if (ch && ch.holdingGround) {
      for (let i = 0; i < ch.holdingGround.length && out.length < 12; i++) {
        const h = ch.holdingGround[i];
        if (h) out.push(h.x, stand(h.x, h.z), h.z);
      }
    }
    const pl = ctx && ctx.player;
    if (pl) out.push(pl.body.x, pl.body.y + FEEL.move.eye, pl.body.z);
    out.push(0, stand(0, 0), 0);
    return out;
  }

  const _origins = [];
  function verify() {
    verifyOrigins(_origins);

    // PROBE for an open direction with the shipping sweep rather than assuming
    // one: a fixture that assumes an empty box is a fixture that will lie again
    // the next time the chamber moves.
    const probes = 12;
    let bestTravel = -1, bestSin = 0, bestCos = -1, bestO = 0, stopped = 0, tried = 0;
    for (let o = 0; o + 2 < _origins.length; o += 3) {
      for (let a = 0; a < probes; a++) {
        const th = (a / probes) * Math.PI * 2;
        const sx = Math.sin(th), sz = -Math.cos(th);
        const p = spawn('bolt', _origins[o], _origins[o + 1], _origins[o + 2], sx, 0, sz, 1, -1, OWNER.hostile);
        if (!p) break;
        tried++;
        for (let i = 0; i < 30 && p._live; i++) step(FEEL.time.fixedDt);
        if (!p._live) stopped++; else kill(p);
        if (p.travelled > bestTravel) { bestTravel = p.travelled; bestSin = sx; bestCos = sz; bestO = o; }
      }
      if (bestTravel > 1) break;
    }

    const p = spawn('bolt', _origins[bestO], _origins[bestO + 1], _origins[bestO + 2],
      bestSin, 0, bestCos, 1, -1, OWNER.hostile);
    if (!p) return { ok: false, detail: 'the pool refused a bolt on an idle page' };
    for (let i = 0; i < 6 && p._live; i++) step(FEEL.time.fixedDt);
    const glow = p._live ? boltLightAt(p.x, p.y, p.z) : 0;
    if (p._live) kill(p);

    const ok = tried >= probes && bestTravel > 1 && glow > 0;
    return {
      ok,
      origin: [_origins[bestO], _origins[bestO + 1], _origins[bestO + 2]],
      dir: [bestSin, 0, bestCos],
      travel: bestTravel,
      detail: `${tried} probes from ${_origins.length / 3} authored positions, best travel ${bestTravel.toFixed(2)} m, ${stopped} stopped by the real world, glow ${glow.toFixed(3)}`,
    };
  }

  return {
    id: 'projectiles',
    PROJECTILE_TABLE, OWNER,
    step, update, reset, snapshot, verify,
    spawn, fire, kill,
    setTargets, assertWired, ready,
    get isReady() { return isReady; },
    illuminationAt, boltLightAt, negativeAt, lightNorm,
    get live() { return pool.liveCount; },
    get capacity() { return pool.capacity; },
    get spawnDenied() { return stats.denied; },
    get negLights() { return negLights; },
    pool, stats,
    dispose() { reset(); },
  };
}

// ---------------------------------------------------------------------------
// THE SYSTEM. One manifest entry:
//   { id: 'projectiles', module: './combat/projectiles.js', needs: ['ground', 'render', 'player'] }
//
// It implements step(dt) AND update(rdt): the bolts move on the fixed clock (so
// the sweep is 0.33 m at 40 m/s regardless of frame rate) and the picture is
// submitted on the presentation clock — which is also what makes a bolt keep
// GLOWING through a hitstop while it stops travelling, so a freeze reads as the
// world holding its breath rather than as the lights going out.
// ---------------------------------------------------------------------------
export function create(ctx) {
  const api = makeProjectiles(ctx);
  ctx.projectiles = api;
  if (typeof window !== 'undefined' && window.__FLARE) window.__FLARE.projectiles = api;
  return api;
}

export default create;
