// THE IMPACT LANGUAGE — and the only door into it.
//
// `impact(kind, pos, tint, sourceId)` is the ONLY function in this game that may
// spawn hit VFX, hit SFX, hitstop, shake or hit light. Not "should be". Is — a
// grep in tests/weapons.mjs fails the build if any module outside this file
// reaches for addHitStop, addTrauma, setSlowmo or the ring pool, with an explicit
// allowlist for the two non-impact trauma sources the design actually has
// (footfall and boss slam, which route through here as well when they exist).
//
// Four kinds:  break | hurt | graze | locked
//
// THE LOAD-BEARING CHANNEL IS TIME. break and hurt FREEZE THE SIM (.085 / .050);
// graze and locked never do (0 / 0). That is the whole grammar: the player learns
// "did that count?" from whether the world stopped, which survives a colourblind
// eye, a dark frame, a bloom-saturated muzzle and a 0.15x iris gain — all four of
// which the hue of a hit marker does not.
//
// THE ONE LAW, and it is fenced by a test that runs every kind against every
// target class:
//
//     A CONNECTING SHOT ALWAYS REMOVES AT LEAST 1 HP
//     AND LIGHTS ITS TARGET FOR AT LEAST 0.35 SECONDS.
//
// Armour HALVES and sparks; it never blocks. An invulnerable target DEFLECTS with
// an inward ring; it never ghosts — it still takes the floor, because a shot that
// visibly connects and changes nothing is the single most corrosive thing a
// shooter can do, and "the boss is invulnerable right now" is a sentence the
// player should read off the ring shape, not off a health bar that did not move.
// D9 is the reason the graze constant is 0.35 and not the draft's 0.20: 0.20 was
// on ARMOUR, i.e. on the enemy you can already see least.
//
// Nothing here carries meaning on hue (CONTRACT §6). The four kinds are told
// apart by RING RADIUS (2.2 / 1.1 / 0.5 / 0.62 m), RING DIRECTION (locked alone
// travels inward), TIME (freeze or no freeze) and AUDIO GAP. All four survive
// greyscale, which is what tests/legibility.mjs will assert against a Machado
// deuteranomaly matrix once archetypes exist.

import FEEL from '../feel.js';
import { clamp, clamp01 } from '../core/math.js';
import { Pool } from '../core/pool.js';

/** The ONE frozen table this module owns. Balance lives in FEEL; shape lives here. */
export const IMPACT_TABLE = Object.freeze({
  ringLife: 0.28,            // seconds a ring is on screen; the RADIUS is FEEL.law.ringRadius
  ringGrowFrom: 0.18,        // scale = r * (0.18 + eased * 0.82) — docs/FEEL.md
  ringGrowSpan: 0.82,
  ringOpacityOut: 0.70,
  ringOpacityIn: 0.85,       // inward rings are dimmer per-pixel but read longer
  ringProbeScale: 0.30,      // how much of the ring's light reaches illuminationAt
  ringProbeRadius: 1.4,
  burstLife: 0.20,
  burstSize: 0.085,
  burstSpeed: 5.2,
  burstAlpha: 0.9,
  burstCounts: Object.freeze({ break: 26, hurt: 14, graze: 12, locked: 8 }),
  reducedMotionBurst: 0.34,  // SAFETY.md 5: reduced motion pays out of PARTICLE
                             // counts, never out of the 0.35 s hit light
  headSlowmo: 0.10,          // seconds of FEEL.time.slowmo.headshot
  killSlowmo: 0.12,
  armourScale: 0.5,          // halves. NEVER blocks.
  damageFloor: 1,            // THE ONE LAW's floor, in hp
  particlePool: 96,
  weakPointBand: 0.22,       // top fraction of a capsule that counts as a weak point
});

const T = IMPACT_TABLE;
const LAW = FEEL.law;
const KINDS = Object.freeze(['break', 'hurt', 'graze', 'locked']);

// Module-scope scratch. CONTRACT §4: the hot path allocates nothing, and a hit is
// resolved to completion before the next one starts, so one record is enough.
const _result = {
  kind: 'hurt', damage: 0, killed: false, weakPoint: false,
  litFor: 0, litIntensity: 0, hitStop: 0, blocked: false,
};
const _pos = { x: 0, y: 0, z: 0 };
const _warm = [FEEL.render.warm[0], FEEL.render.warm[1], FEEL.render.warm[2]];
const _empty = Object.freeze({});

const px = p => (p === undefined || p === null ? 0 : (p.x !== undefined ? p.x : p[0]));
const py = p => (p === undefined || p === null ? 0 : (p.y !== undefined ? p.y : p[1]));
const pz = p => (p === undefined || p === null ? 0 : (p.z !== undefined ? p.z : p[2]));

export function makeImpact(ctx) {
  const rng = ctx.rng ? ctx.rng.fork('impact') : null;
  const rand = () => (rng ? rng.next() : 0.5);

  // Both pools are fixed-capacity and allocated here, once. `Pool.take()` returns
  // null at capacity rather than recycling the oldest — a recycled ring is a hit
  // marker that vanishes mid-flight, and this is the one system whose whole job is
  // telling the player their shot counted.
  const rings = new Pool(LAW.ringPool, () => ({
    x: 0, y: 0, z: 0, r: 1, age: 0, inward: 0, cr: 1, cg: 1, cb: 1,
  }));
  const bursts = new Pool(T.particlePool, () => ({
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, cr: 1, cg: 1, cb: 1,
  }));

  const counters = { break: 0, hurt: 0, graze: 0, locked: 0 };
  let calls = 0, ringsDenied = 0, burstsDenied = 0, lastKind = '';
  let clock = 0;

  const reduced = () => !!(ctx && (ctx.reducedMotion || ctx.flashSafe));

  /**
   * THE ONLY ENTRY POINT. Spawns the ring, the particles, the sound, the freeze,
   * the shake and the transient light for one hit.
   *
   * `pos`  any {x,y,z} (or [x,y,z]) — pass a pooled record, never a fresh one.
   * `tint` optional [r,g,b]; the picture is amber-on-black and the tint carries
   *        NO meaning, only warmth. Every kind is separated by radius, direction
   *        and time (CONTRACT §6).
   * `sourceId` whoever caused it, for the audio throttle and for QA attribution.
   */
  function impact(kind, pos, tint, sourceId) {
    const k = KINDS.indexOf(kind) >= 0 ? kind : 'hurt';
    const x = px(pos), y = py(pos), z = pz(pos);
    const cr = tint ? tint[0] : _warm[0];
    const cg = tint ? tint[1] : _warm[1];
    const cb = tint ? tint[2] : _warm[2];

    calls++;
    counters[k]++;
    lastKind = k;

    // ---- TIME. The channel that carries the grade. ------------------------
    const stop = FEEL.time.hitStop[k] || 0;
    if (stop > 0 && ctx.time && ctx.time.addHitStop) ctx.time.addHitStop(stop);
    if (k === 'break' && ctx.time && ctx.time.addTrauma) {
      ctx.time.addTrauma(FEEL.time.trauma.kill * (reduced() ? FEEL.safety.reducedMotionTrauma : 1));
    }

    // ---- RING. Radius and direction are the identifier, in METRES. --------
    const ring = rings.take();
    if (ring) {
      ring.x = x; ring.y = y; ring.z = z;
      ring.r = LAW.ringRadius[k];
      ring.age = 0;
      ring.inward = k === 'locked' ? 1 : 0;
      ring.cr = cr; ring.cg = cg; ring.cb = cb;
    } else ringsDenied++;

    // ---- PARTICLES. The ONLY thing prefers-reduced-motion is allowed to cut. --
    let n = T.burstCounts[k] || 0;
    if (reduced()) n = Math.round(n * T.reducedMotionBurst);
    for (let i = 0; i < n; i++) {
      const p = bursts.take();
      if (!p) { burstsDenied++; break; }
      // Uniform on a sphere, from our own stream so adding a particle never moves
      // the recoil pattern (CONTRACT §3).
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const sp = T.burstSpeed * (0.4 + rand() * 0.6);
      p.x = x; p.y = y; p.z = z;
      p.vx = Math.cos(th) * s * sp; p.vy = u * sp; p.vz = Math.sin(th) * s * sp;
      p.age = 0; p.cr = cr; p.cg = cg; p.cb = cb;
    }

    // ---- SOUND. One call; the punch EQ and the auditory reflex ride on it. --
    const audio = ctx.audio;
    if (audio && audio.gun) {
      const scale = ctx.time && ctx.time.scale > 0 ? ctx.time.scale : 1;
      if (!(audio.throttled && audio.throttled('enemyHit', scale))) {
        audio.gun.hit(k, x, y, z, audio.now);
      }
    }

    return k;
  }

  /**
   * THE ONE LAW, applied. Everything that decides how much damage a hit does
   * lives here, so that the floor and the light can never be applied in one
   * branch and skipped in another.
   *
   * `target` is duck-typed and owned by W7-ENEMIES:
   *   { hp, maxHp, armoured?, invulnerable?, facingX?, facingZ?, bodyMultiplier? }
   * We write `hp`, `litFor`, `litIntensity`, `hitFlash` and `lastHitAt`.
   *
   * Returns the shared `_result` record — read it, never retain it.
   */
  function applyHit(target, baseDamage, opts) {
    const o = opts || _empty;
    const weakPoint = !!o.weakPoint;
    const mul = o.multiplier === undefined ? 1 : o.multiplier;
    const front = o.frontness === undefined ? frontnessOf(target, o.dx, o.dz) : o.frontness;

    const armoured = !!target.armoured && front > LAW.armourCosMin;
    const invulnerable = !!target.invulnerable;

    let dmg = baseDamage * mul;
    if (weakPoint) dmg *= (o.headMultiplier === undefined ? 1 : o.headMultiplier);
    if (armoured) dmg *= T.armourScale;
    if (target.bodyMultiplier !== undefined && !weakPoint) dmg *= target.bodyMultiplier;

    // THE FLOOR. Rounded DOWN to whole hp and then floored at 1, so a hit can
    // never be worth 0.4 hp and read as nothing. Armour halves; the boss's 0.18
    // body multiplier scales; the floor is the one thing nothing scales past.
    dmg = Math.max(T.damageFloor, Math.floor(dmg));

    // The damage is ALWAYS removed, including from an invulnerable target. That is
    // deliberate and it is the difference between "it deflected" and "it ghosted":
    // invulnerability suppresses the KILL, never the hp. Clamping hp at 1 here was
    // the first draft and it breaks THE ONE LAW for any target already at 1 —
    // which is exactly the kind of edge that ships. W7 owns clearing the flag at
    // or before a phase gate; nothing in this file ever refuses a hit.
    const hpBefore = target.hp;
    target.hp = hpBefore - dmg;
    const killed = target.hp <= 0 && hpBefore > 0 && !invulnerable;

    // The grade is the OUTCOME, not the anatomy. `break` is reserved for the hit
    // that broke something — a kill, or a phase gate. A weak point gets its own
    // channel (the headshot cue and the slowmo) but stays `hurt`, because at
    // 720 rpm with an eye-height enemy nearly every shot lands high on the body,
    // and grading those as `break` would put a 0.085 s freeze on twelve hits a
    // second. Time is the load-bearing channel precisely because it is rare.
    let kind;
    if (invulnerable) kind = 'locked';
    else if (killed) kind = 'break';
    else if (armoured) kind = 'graze';
    else kind = 'hurt';

    // ---- THE LIGHT. Floored at 0.35 s on ALL FOUR KINDS (D9), and declared
    // EXEMPT from prefers-reduced-motion in FEEL: the hit light is information,
    // not motion, and it is the accessibility guarantee the design rests on.
    const up = LAW.lightUp[kind];
    const hold = Math.max(LAW.hitLightMin, up.hold);
    target.litFor = Math.max(target.litFor || 0, hold);
    target.litIntensity = Math.max(target.litIntensity || 0, up.i);
    target.hitFlash = LAW.hitFlashMs / 1e3;
    target.lastHitAt = clock;

    _pos.x = o.x === undefined ? target.x : o.x;
    _pos.y = o.y === undefined ? (target.y || 0) + (target.height || 0) * 0.5 : o.y;
    _pos.z = o.z === undefined ? target.z : o.z;
    impact(kind, _pos, o.tint, o.sourceId);

    if (weakPoint && ctx.audio && ctx.audio.gun) ctx.audio.gun.headshot(_pos.x, _pos.y, _pos.z, ctx.audio.now);
    if (weakPoint && ctx.time && ctx.time.setSlowmo) ctx.time.setSlowmo(FEEL.time.slowmo.headshot, T.headSlowmo);

    _result.kind = kind;
    _result.damage = dmg;
    _result.killed = killed;
    _result.weakPoint = weakPoint;
    _result.litFor = target.litFor;
    _result.litIntensity = target.litIntensity;
    _result.hitStop = FEEL.time.hitStop[kind] || 0;
    _result.blocked = false;          // nothing in this game blocks. Ever.
    return _result;
  }

  /** cos of the angle between the shot and the target's facing. 1 = dead front. */
  function frontnessOf(target, dx, dz) {
    const fx = target.facingX, fz = target.facingZ;
    if (fx === undefined || fz === undefined || dx === undefined) return 0;
    const l = Math.hypot(fx, fz) || 1;
    // The shot travels along (dx,dz); a frontal hit means it opposes the facing.
    return clamp((-dx * fx - dz * fz) / l, -1, 1);
  }

  /** Was this hit height inside the weak-point band of an upright capsule? */
  function isWeakPoint(hitY, footY, height) {
    if (!(height > 0)) return false;
    return hitY >= footY + height * (1 - T.weakPointBand);
  }

  /**
   * Presentation clock. Rings and particles keep integrating during hitstop —
   * FEEL.time.freezeScale is 0.18 for fx, which is what makes a hit PUNCH rather
   * than stall (core/time.js RULE 1). Everything is submitted to the render
   * system's shared additive bucket: no geometry is created here, ever.
   */
  function update(rdt) {
    clock += rdt;
    const add = ctx.render && ctx.render.additive ? ctx.render.additive : null;
    const field = ctx.light;
    const ringOpacityScale = reduced() ? FEEL.safety.reducedMotionRingOpacity : 1;

    rings.forEachLive(r => {
      r.age += rdt;
      const p = r.age / T.ringLife;
      if (p >= 1) { rings.release(r); return; }
      const eased = r.inward ? 1 - p : p;
      // Angular floor: a 2.2 m break ring neither swamps a small room nor
      // vanishes at 40 m, because it is never allowed under dist * 0.016.
      let world = r.r * (T.ringGrowFrom + eased * T.ringGrowSpan);
      if (ctx.camera) {
        const c = ctx.camera.position;
        const d = Math.hypot(r.x - c.x, r.y - c.y, r.z - c.z);
        world = Math.max(world, d * LAW.ringMinAngular);
      }
      const a = (1 - p) * (r.inward ? T.ringOpacityIn : T.ringOpacityOut) * ringOpacityScale;
      if (add) add.sprite(r.x, r.y, r.z, world, r.cr, r.cg, r.cb, a, 1, 0, 0, 0);
      if (field && field.addProbe) {
        field.addProbe(r.x, r.y, r.z, T.ringProbeRadius, a * T.ringProbeScale);
      }
    });

    bursts.forEachLive(b => {
      b.age += rdt;
      const p = b.age / T.burstLife;
      if (p >= 1) { bursts.release(b); return; }
      b.x += b.vx * rdt; b.y += b.vy * rdt; b.z += b.vz * rdt;
      b.vy -= FEEL.move.gravity * rdt;
      if (add) add.sprite(b.x, b.y, b.z, T.burstSize, b.cr, b.cg, b.cb, (1 - p) * T.burstAlpha, 0, 0, 0, 0);
    });
  }

  function snapshot() {
    return {
      calls, lastKind,
      counts: { break: counters.break, hurt: counters.hurt, graze: counters.graze, locked: counters.locked },
      ringsLive: rings.liveCount, ringsCapacity: rings.capacity, ringsDenied,
      burstsLive: bursts.liveCount, burstsCapacity: bursts.capacity, burstsDenied,
      hitStopTable: FEEL.time.hitStop,
    };
  }

  function reset() {
    rings.releaseAll();
    bursts.releaseAll();
    calls = 0; ringsDenied = 0; burstsDenied = 0; lastKind = '';
    counters.break = 0; counters.hurt = 0; counters.graze = 0; counters.locked = 0;
  }

  return { impact, applyHit, isWeakPoint, frontnessOf, update, snapshot, reset, rings, bursts, KINDS };
}

/** The four kinds, in grade order. Exported so nobody spells them by hand. */
export const IMPACT_KINDS = KINDS;

/**
 * The law, as a predicate, so a test can ask the question directly rather than
 * re-deriving it: did this resolution honour THE ONE LAW?
 */
export function honoursTheLaw(result) {
  return !!result
    && result.damage >= T.damageFloor
    && result.litFor >= LAW.hitLightMin
    && result.blocked === false
    && clamp01(result.litIntensity) > 0;
}

export default makeImpact;
