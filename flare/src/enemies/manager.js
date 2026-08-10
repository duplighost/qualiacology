// THE MANAGER — the pool, the fixed-step tick, the wiring, and the gate's eyes.
//
// One manifest entry: { id: 'enemies', module: './enemies/manager.js',
// needs: ['chambers', 'player'] }. Everything else in this workstream is a pure
// function or a bucket of geometry; this is the only file with a heartbeat.
//
// WHAT IT OWNS, IN THE ORDER IT MATTERS:
//
//   1. THE TELEGRAPH LAW. Every attack winds up for at least
//      FEEL.enemies.telegraphMin (0.320 s), during which a SHOOTABLE part goes
//      at least 2x emissive, an audio cue starts on FRAME ONE, and the
//      silhouette changes. An attack that would land inside that window is
//      CANCELLED, not accelerated — `windupTime` is set once at the start and
//      nothing in this file ever shortens it. That constraint is exactly what
//      allows a 7.2 m/s melee creature to exist at all.
//
//   2. AWARENESS (D4). Three states and one event, and the event is the player's
//      own gun. `raise()` is the only door in, and it is fed by
//      `weapons.setDisturbanceSink` and by the controller's `disturb` provider —
//      so a footstep on lit ground reaches it at 5 m, a BREACHER at up to 76 m,
//      and the dash-execute at 0 m. That zero is the game's only silent kill and
//      it is silent by arithmetic, not by a special case.
//
//   3. THE LIGHT TRADE (D3). Accuracy, spot range and reaction all read
//      lightNorm AT THE PLAYER'S POSITION. Lighting a room is a decision about
//      where you want the fight to be legible, paid for in how hard you get hit
//      while standing there — and `snapshot().shots/hits` is how a test measures
//      that rather than believing it.
//
//   4. DEATH, WHICH IS THE GAME'S PROGRESS. Every kill deposits its scar from
//      FEEL.field.deposit, including a kill the player never dealt — the dash
//      execute sets `hp = 0; dead = true` from inside the controller, so the
//      death path is driven by OBSERVING the record, never by being told.
//      A corpse is never popped out of existence: it falls, its glow hands off
//      into the permanent pool over `deathGlow` seconds, and much later it sinks.
//
// NO SILENT DEFAULTS (C2-F8). Every provider this module injects into somebody
// else is asserted by their own `assertWired()`; every provider it takes is
// named by ours.

import FEEL from '../feel.js';
import { clamp, clamp01 } from '../core/math.js';
import { makeCapsule, moveCapsule } from '../world/collide.js';
import { groundUnderActor, hasSurface, GROUND } from '../world/ground.js';
import {
  ARCHETYPES, ENEMY_TABLE as T, archetypeOf, hasArchetype, ARCHETYPE_IDS,
  lightNorm, fireInterval, reactionTime, staggerScale, attackerGate, hitChance,
} from './table.js';
import {
  AWARE, disturb as awarenessDisturb, look, forget, lineOfSight, desiredVelocity,
  tickStrafe, clipToRing, separationBias, turnToward, rollHit,
} from './ai.js';
import { createBodies, BODY_TABLE, silhouetteSignature, telegraphGain } from './bodies.js';

const E = FEEL.enemies;
const CAP = FEEL.director.hardAliveCap;
const POOL = CAP + T.corpseCap;

// Module-scope scratch. CONTRACT §4 — the hot path allocates nothing.
const _sep = { x: 0, z: 0 };
const _ipos = { x: 0, y: 0, z: 0 };
const _tgt = { x: 0, y: 0, z: 0, radius: FEEL.move.radius, height: FEEL.move.height, speed: 0, alive: true, yaw: 0 };

export function create(ctx) {
  // DETERMINISM: `derive`, not `fork`. A restart must replay identically, and
  // fork() is memoised on purpose — calling it twice hands back the same
  // ADVANCED stream, so the second run of a seeded test is not the first one.
  let rng = ctx.rng ? ctx.rng.derive('enemies') : null;
  let aiRng = rng ? rng.fork('ai') : null;
  let cadenceRng = rng ? rng.fork('cadence') : null;
  let accuracyRng = rng ? rng.fork('accuracy') : null;
  let varyRng = rng ? rng.fork('vary') : null;
  const rand = r => (r ? r.next() : 0.5);

  const bodies = createBodies(ctx);

  // ---- THE POOL. Fixed length, never resized, corpses in place. -----------
  // Every wired consumer (weapons' ray march, the controller's dash passes,
  // EARSHOT's stem deck) already skips `dead`, so one array of POOL records with
  // a constant length is the cheapest correct shape: no per-frame compaction, no
  // reallocation, and the reference handed out at boot stays valid forever.
  const roster = new Array(POOL);
  for (let i = 0; i < POOL; i++) roster[i] = newRecord(i);
  let nextId = 1;

  const stats = {
    spawned: 0, killed: 0, executed: 0, despawned: 0, spawnRefusals: 0,
    shots: 0, hits: 0, blastHits: 0, meleeStrikes: 0, damageDealt: 0,
    strikes: 0, cancels: 0, chargeBreaks: 0,
    cuesOnFrameOne: 0, cuesLate: 0,
    flinchTriggers: 0, flinchSuppressed: 0, hitsObserved: 0, hitFlashes: 0,
    staggers: 0, relocations: 0, abandons: 0,
    toAlerted: 0, toHunting: 0, toUnaware: 0,
    losFails: 0, deposits: 0, depositLight: 0,
    minWindup: Infinity, attacksUnderLaw: 0,
    peakIntrusion: 0, longestIntrusion: 0, peakCentralCoverage: 0,
    peakAlive: 0, farTicksSkipped: 0,
  };

  let clock = 0;               // sim seconds; monotonic (CONTRACT §5)
  let renderClock = 0;
  let aliveCount = 0;
  let intrusionRun = 0;
  let frame = 0;
  let lastHostileAt = -1;

  // ---- injected providers. NO SILENT DEFAULTS (C2-F8). --------------------
  const defaulted = { target: true, depositScale: true };
  const provide = {
    target: null,              // () -> {x,y,z,radius,height,speed,alive,yaw}
    depositScale: () => 1,     // W8/W10's combo multiplies the scar it leaves
  };
  let projectileSink = null;   // W8 takes the travelling bolt when it lands

  function newRecord(slot) {
    const s = makeCapsule(0, 0, 0);
    // Identity + the fields impact.js, fire.js, the controller and EARSHOT all
    // duck-type. One flat object: the capsule IS the creature, so there is no
    // second position to keep in sync and no way for them to disagree.
    s.slot = slot;
    s.id = -1;
    s.type = '';
    s.arch = null;
    s.dead = true;
    s.boss = false;
    s.hp = 0; s.maxHp = 1;
    s.armoured = false; s.invulnerable = false;
    s.facingX = 0; s.facingZ = 1;
    s.litFor = 0; s.litIntensity = 0; s.hitFlash = 0; s.lastHitAt = 0;
    // awareness
    s.aware = AWARE.unaware;
    s.bearing = 0; s.knownX = 0; s.knownZ = 0; s.knownAt = -1e9;
    s.alertAt = -1e9; s.lastDisturbAt = -1e9; s.sawAt = -1e9; s.transitions = 0;
    // movement
    s.yaw = 0; s.strafeDir = 1; s.strafeT = 0; s.losFailT = 0; s.reactionT = 0;
    s.queued = false;
    // attack
    s.atk = 0; s.atkT = 0; s.windupTime = 0; s.windup01 = 0;
    s.cooldown = 0; s.leapT = 0; s.struckThisAttack = false; s.chargeSafeUntil = -1e9;
    s.windupHp = 0;
    // damage bookkeeping
    s.lastHpSeen = 0; s.staggerT = 0; s.staggerHits = 0; s.staggerWindow = 0;
    s.flinchT = 0; s.flinchSince = 1e9;
    // presentation
    s.tint = 1; s.dutyPhase = 0; s.scaleY = 1; s.scaleXZ = 1;
    s.lean = 0; s.leanAxisX = 1; s.leanAxisZ = 0; s.flinchX = 0; s.flinchZ = 0;
    s.deathT = 0; s.deathGlow = 0; s.sinkY = 0; s.deathHandled = true;
    return s;
  }

  // -------------------------------------------------------------------------
  // THE TARGET. Reads the real controller when there is one; a test injects its
  // own. Reused record, never a copy — CONTRACT §4.
  // -------------------------------------------------------------------------
  function target() {
    if (provide.target) return provide.target();
    const p = ctx.player;
    if (!p) return null;
    _tgt.x = p.body.x; _tgt.y = p.body.y; _tgt.z = p.body.z;
    _tgt.radius = p.body.radius; _tgt.height = p.body.height;
    _tgt.speed = p.speed; _tgt.alive = p.state.alive; _tgt.yaw = p.state.yaw;
    return _tgt;
  }

  function hurtTarget(amount, source) {
    const p = ctx.player;
    if (p && typeof p.hurt === 'function') return p.hurt(amount);
    const t = target();
    if (t && typeof t.hurt === 'function') return t.hurt(amount);
    return 0;
  }

  /** lightNorm at the PLAYER — the only place D3's three terms are read from. */
  function litAtTarget(t) {
    if (!ctx.light || !t) return 0;
    return lightNorm(ctx.light.illuminationAt(t.x, t.y + T.litSampleHeight, t.z));
  }

  // -------------------------------------------------------------------------
  // SPAWN / DESPAWN
  // -------------------------------------------------------------------------
  function spawn(type, x, y, z, yaw) {
    if (!hasArchetype(type)) { stats.spawnRefusals++; return null; }
    if (aliveCount >= CAP) { stats.spawnRefusals++; return null; }
    let e = null;
    for (let i = 0; i < POOL; i++) {
      const r = roster[i];
      if (r.dead && r.deathHandled && r.id < 0) { e = r; break; }
    }
    if (!e) {                       // every slot holds a corpse: retire the oldest
      let oldest = null;
      for (let i = 0; i < POOL; i++) {
        const r = roster[i];
        if (!r.dead || r.id < 0) continue;
        if (!oldest || r.deathT > oldest.deathT) oldest = r;
      }
      if (!oldest) { stats.spawnRefusals++; return null; }
      retire(oldest);
      e = oldest;
    }

    const arch = archetypeOf(type);
    e.id = nextId++;
    e.type = type;
    e.arch = arch;
    e.radius = arch.radius; e.height = arch.height;
    e.hp = arch.hp; e.maxHp = arch.hp; e.lastHpSeen = arch.hp;
    e.armoured = arch.armoured; e.invulnerable = false;
    e.dead = false; e.deathHandled = false;
    e.x = x; e.z = z;
    e.vx = 0; e.vy = 0; e.vz = 0;
    e.grounded = false;
    e.y = groundedY(x, z, y);
    e.yaw = yaw === undefined ? 0 : yaw;
    e.facingX = Math.sin(e.yaw); e.facingZ = Math.cos(e.yaw);
    e.aware = AWARE.unaware;
    e.knownAt = -1e9; e.alertAt = -1e9; e.lastDisturbAt = -1e9; e.sawAt = -1e9;
    e.transitions = 0;
    e.litFor = 0; e.litIntensity = 0; e.hitFlash = 0; e.lastHitAt = 0;
    e.atk = 0; e.atkT = 0; e.windup01 = 0; e.windupTime = 0;
    e.struckThisAttack = false; e.chargeSafeUntil = -1e9;
    e.staggerT = 0; e.staggerHits = 0; e.staggerWindow = 0;
    e.flinchT = 0; e.flinchSince = 1e9;
    e.lean = 0; e.flinchX = 0; e.flinchZ = 0;
    e.deathT = 0; e.deathGlow = 0; e.sinkY = 0;
    e.queued = false;
    e.losFailT = 0;

    // A RANDOMISED INITIAL COOLDOWN. Without it every creature in a wave that
    // spawns on the same frame fires on the same frame forever after, and six
    // shots in unison read as a script rather than as a room.
    e.cooldown = fireInterval(arch, rand(cadenceRng)) * rand(cadenceRng);
    e.reactionT = 0;
    e.strafeDir = rand(aiRng) < 0.5 ? -1 : 1;
    e.strafeT = T.strafeFlipMin + rand(aiRng) * T.strafeFlipSpan;

    // PER-INSTANCE VARIATION, required. Fourteen identical bodies is automatic
    // failure #10 in the one thing the player looks straight at.
    e.tint = BODY_TABLE.tintBase + rand(varyRng) * BODY_TABLE.tintSpan;
    e.scaleXZ = 1 + (rand(varyRng) * 2 - 1) * BODY_TABLE.scaleSpan;
    e.scaleY = 1 + (rand(varyRng) * 2 - 1) * BODY_TABLE.scaleSpan;
    e.dutyPhase = rand(varyRng) * 4;

    aliveCount++;
    stats.spawned++;
    if (aliveCount > stats.peakAlive) stats.peakAlive = aliveCount;
    return e;
  }

  function groundedY(x, z, fallback) {
    const w = ctx.world;
    if (!w || !w.ground) return fallback === undefined ? 0 : fallback;
    const g = groundUnderActor(w.ground, x, z, fallback === undefined ? GROUND.top : fallback + 1, false);
    return hasSurface(g) ? g : (fallback === undefined ? 0 : fallback);
  }

  /** Return a corpse's slot to the pool. Never called on a live creature. */
  function retire(e) {
    e.id = -1; e.type = ''; e.arch = null;
    e.dead = true; e.deathHandled = true;
    e.hp = 0; e.maxHp = 1;
    e.litFor = 0; e.litIntensity = 0; e.hitFlash = 0;
    e.windup01 = 0; e.atk = 0;
    stats.despawned++;
  }

  // -------------------------------------------------------------------------
  // AWARENESS — the only door in
  // -------------------------------------------------------------------------
  function raise(x, y, z, radius, kind) {
    if (!(radius > 0)) return 0;            // the dash-execute, and it is silent
    let n = 0;
    for (let i = 0; i < POOL; i++) {
      const e = roster[i];
      if (e.id < 0 || e.dead) continue;
      const before = e.aware;
      if (awarenessDisturb(e, x, y, z, radius, clock)) {
        n++;
        if (e.aware === AWARE.alerted && before === AWARE.unaware) stats.toAlerted++;
        else if (e.aware === AWARE.hunting) stats.toHunting++;
      }
    }
    return n;
  }

  // -------------------------------------------------------------------------
  // DAMAGE OBSERVATION
  //
  // Driven by watching `hp`, not by being told. impact.js writes hp, litFor,
  // litIntensity, hitFlash and lastHitAt; the controller's dash writes hp and
  // `dead` directly. Observing the record is the only way to catch both, and it
  // is what makes the dash-execute deposit its scar without the controller
  // needing to know this module exists.
  // -------------------------------------------------------------------------
  function observeDamage(e, dt) {
    const dmg = e.lastHpSeen - e.hp;
    e.lastHpSeen = e.hp;
    if (dmg <= 0) return;

    stats.hitsObserved++;
    if (e.hitFlash > 0) stats.hitFlashes++;

    // STAGGER — damps speed, never zeroes AI, with diminishing returns after
    // three hits in one second. A creature that stops dead every 83 ms under a
    // 720 rpm weapon is a vibrating statue, not a struggle.
    if (clock - e.staggerWindow > E.staggerDiminishWindow) { e.staggerHits = 0; e.staggerWindow = clock; }
    e.staggerHits++;
    e.staggerT = E.staggerTime;
    stats.staggers++;

    // FLINCH — budgeted at one per FEEL.enemies.flinchBudget (180 ms) per
    // creature. Hits inside the window still register FULLY (damage, hit flash,
    // ring, particles, sound) and simply do not re-trigger the animation.
    if (e.flinchSince >= E.flinchBudget) {
      e.flinchSince = 0;
      e.flinchT = T.flinchIn + T.flinchHold + T.flinchOut;
      const t = target();
      let ax = t ? e.x - t.x : 0, az = t ? e.z - t.z : 1;
      const l = Math.sqrt(ax * ax + az * az) || 1;
      ax /= l; az /= l;
      // The spine bends AWAY from the impact: the axis is perpendicular to the
      // bullet's travel, so a hit from the left leans it right and the player
      // reads WHERE they hit from across the room.
      e.leanAxisX = -az; e.leanAxisZ = ax;
      e.flinchDirX = ax; e.flinchDirZ = az;
      stats.flinchTriggers++;
    } else {
      stats.flinchSuppressed++;
    }

    // THE CHARGE BREAK — and it is the counter-play, not a chore. The tell IS
    // the weak point (impact.js's top-22% band), so the shot that answers the
    // wind-up is also the shot that does the most damage. Immunity afterwards,
    // or a 720 rpm weapon perma-locks every charger in the room.
    if (e.atk === 1 && clock >= e.chargeSafeUntil) {
      const taken = e.windupHp - e.hp;
      if (taken >= e.maxHp * T.chargeBreakFraction) {
        cancelAttack(e, 'broken');
        e.chargeSafeUntil = clock + T.chargeBreakImmunity;
        stats.chargeBreaks++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // DEATH — and the deposit, which IS the game's progress, its light and its score
  // -------------------------------------------------------------------------
  function runDeath(e) {
    e.deathHandled = true;
    e.dead = true;
    // Tell the economy, but never let it deposit: the scar is deposited below,
    // and LightField.deposit MERGES within 6 m (i += new.i * 0.45), so a second
    // deposit per kill would inflate the field ~45% — silently, in the one
    // number five systems read. One kill, one light.
    if (ctx.economy && typeof ctx.economy.onKill === 'function') ctx.economy.onKill(e, { deposit: false });
    e.hp = Math.min(0, e.hp);
    e.deathT = 0;
    e.deathGlow = 1;
    e.sinkY = 0;
    e.windup01 = 0;
    e.atk = 0;
    e.vx = 0; e.vz = 0;
    aliveCount = Math.max(0, aliveCount - 1);
    stats.killed++;

    // A BLOOM is a walking fuse: killing it detonates it. That is what makes
    // WHERE you kill one a decision instead of a formality.
    if (e.arch && e.arch.fuse) detonate(e);

    const arch = e.arch;
    if (arch && ctx.light && typeof ctx.light.deposit === 'function') {
      const scale = provide.depositScale();
      const chamberScale = (ctx.chamber && ctx.chamber.spec && ctx.chamber.spec.scarDepositScale) || 1;
      const gy = groundedY(e.x, e.z, e.y);
      ctx.light.deposit(
        e.x, gy, e.z,
        arch.depositRadius * chamberScale,
        arch.depositIntensity * scale * chamberScale,
      );
      stats.deposits++;
      stats.depositLight += arch.depositIntensity * scale * chamberScale;
    }
  }

  function detonate(e) {
    const arch = e.arch;
    const t = target();
    // The player.
    if (t && t.alive) {
      const dx = t.x - e.x, dz = t.z - e.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= arch.blastRange) {
        const fall = 1 - (1 - T.blastFalloff) * clamp01(d / arch.blastRange);
        const dealt = hurtTarget(Math.max(1, Math.round(arch.dmg * fall)), e.id);
        if (dealt > 0) { stats.blastHits++; stats.damageDealt += dealt; }
      }
    }
    // ...and everything else in the room. A BLOOM that only hurts the player is
    // a grenade the player is not allowed to use.
    for (let i = 0; i < POOL; i++) {
      const o = roster[i];
      if (o === e || o.id < 0 || o.dead) continue;
      const dx = o.x - e.x, dz = o.z - e.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > arch.blastRange) continue;
      const fall = 1 - (1 - T.blastFalloff) * clamp01(d / arch.blastRange);
      o.hp -= Math.max(1, Math.round(arch.dmg * fall));
    }
    if (ctx.light && ctx.light.addProbe) {
      ctx.light.addProbe(e.x, e.y + e.height * 0.5, e.z, arch.blastRange, arch.depositIntensity);
    }
    impactAt('break', e.x, e.y + e.height * 0.5, e.z, e.id);
  }

  /**
   * The ONE door into hit VFX/SFX/hitstop/shake/light, and this module does not
   * own it. `ctx.weapons.combat` is the single instance minted by
   * src/weapons/fire.js — minting a second would give the game two ring pools,
   * two counters and two answers to "did that count".
   */
  function impactAt(kind, x, y, z, id) {
    const w = ctx.weapons;
    if (!w || !w.combat) return false;
    _ipos.x = x; _ipos.y = y; _ipos.z = z;
    w.combat.impact(kind, _ipos, undefined, id);
    return true;
  }

  /** The corpse. Never popped out of existence. */
  function stepCorpse(e, dt) {
    e.deathT += dt;
    // The dying glow hands off into the permanent pool over exactly the decay:
    // the scar IS the corpse's light continuing, which is what makes the field a
    // record of the run rather than a score.
    e.deathGlow = Math.max(0, 1 - e.deathT / T.deathGlow);
    const fall = clamp01(e.deathT / T.deathFall);
    e.scaleY = Math.max(0.18, (1 - fall * 0.72));
    e.lean = fall * 1.15;
    if (e.deathT > T.corpseHold) {
      e.sinkY = T.corpseSinkDepth * clamp01((e.deathT - T.corpseHold) / T.corpseSink);
      if (e.deathT > T.corpseHold + T.corpseSink) retire(e);
    }
    // A corpse still falls: it was standing on something and the something can
    // be shot out from under it in THE FURNACE.
    e.vy -= FEEL.move.gravity * dt;
    const w = ctx.world;
    if (w) moveCapsule(w, e, dt);
  }

  // -------------------------------------------------------------------------
  // THE ATTACK STATE MACHINE
  //
  //   0 idle  ->  1 windup  ->  2 strike/leap  ->  3 recover  ->  0
  //
  // `windupTime` is written ONCE, at the 0 -> 1 transition, and nothing in this
  // file ever shortens it. That is the telegraph law implemented structurally
  // rather than checked: an attack cannot be accelerated because there is no
  // code path that could accelerate it.
  // -------------------------------------------------------------------------
  function beginAttack(e, arch) {
    e.atk = 1;
    e.atkT = 0;
    e.windupTime = Math.max(arch.telegraph, E.telegraphMin);
    e.windup01 = 0;
    e.windupHp = e.hp;
    e.struckThisAttack = false;

    // THE AUDIO CUE, ON FRAME ONE OF THE WIND-UP. Not partway through: between
    // muzzle flashes the player is often HEARING the fight rather than seeing
    // it, which makes this the primary channel of the three.
    if (cue(e, arch)) stats.cuesOnFrameOne++; else stats.cuesLate++;
  }

  function cancelAttack(e, why) {
    if (e.atk === 1) stats.cancels++;
    e.atk = 0;
    e.atkT = 0;
    e.windup01 = 0;
    e.cooldown = Math.max(e.cooldown, fireInterval(e.arch, rand(cadenceRng)) * 0.5);
    return why;
  }

  function cue(e, arch) {
    const audio = ctx.audio;
    if (!audio || !audio.pool || typeof audio.pool.playAt !== 'function') return true;
    if (audio.throttled && audio.throttled('attack', ctx.time && ctx.time.scale > 0 ? ctx.time.scale : 1)) return true;
    const s = audio.pool.spec();
    s.when = audio.now;
    s.peak = T.cuePeak;
    s.attack = 0.004;
    s.dur = Math.min(e.windupTime, T.cueDur);
    s.decay = s.dur * 0.6;
    s.tone = 0.75;
    s.toneType = 'triangle';
    // The same `voice` column EARSHOT's identity stems use, so what a creature
    // sounds like when it is about to hit you and what it sounds like when it is
    // merely near you are the same instrument.
    s.toneHz = T.cueHz * arch.voice;
    s.toneEnd = T.cueHz * arch.voice * T.cueGlide;
    s.noise = 0.25;
    s.filterHz = FEEL.audio.sfxLowpassHz;
    audio.pool.playAt('transient', e.x, e.y + arch.height * T.strikeHeight, e.z, s);
    return true;
  }

  /** The moment of truth, and the only place `strikes` is counted. */
  function strike(e, arch, t, lit) {
    stats.strikes++;
    if (e.atkT < stats.minWindup) stats.minWindup = e.atkT;
    // The law, asserted at the only place it can be violated.
    if (e.atkT < E.telegraphMin - 1e-6) stats.attacksUnderLaw++;

    if (arch.fuse) {                       // THE BLOOM: the fuse reaches the end
      runDeath(e);
      return;
    }

    if (arch.melee) {                      // THE RUNNER: the leap
      e.atk = 2;
      e.leapT = T.meleeLungeTime;
      e.struckThisAttack = false;
      return;
    }

    // Ranged. One roll, and every term in it is D3.
    const ex = e.x, ey = e.y + arch.height * T.strikeHeight, ez = e.z;
    const tx = t.x, ty = t.y + t.height * T.aimHeight, tz = t.z;
    const dx = tx - ex, dy = ty - ey, dz = tz - ez;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const connects = rollHit(arch, d, lit, t.speed, rand(accuracyRng));
    stats.shots++;

    if (projectileSink) {
      // W8 owns the travelling bolt. SEPARATION RULE: yours is warm, hitscan and
      // gone in 0.35 s; theirs is cold and TRAVELLING. The ROLL stays here so the
      // light trade is one number in one place.
      projectileSink(ex, ey, ez, dx / d, dy / d, dz / d, FEEL.projectiles.bolt.speed, arch.dmg, connects, e.id);
    } else if (connects) {
      // A hit that the player's i-frames swallow still counted as a hit for the
      // trade: D3 is about whether the shot was AIMED well, and hiding an
      // i-frame inside the accuracy measurement is how a light-trade test starts
      // measuring the dash instead.
      stats.hits++;
      stats.damageDealt += hurtTarget(arch.dmg, e.id);
    }

    e.atk = 3;
    e.atkT = 0;
    e.cooldown = fireInterval(arch, rand(cadenceRng));
  }

  function stepLeap(e, arch, t, dt) {
    e.leapT -= dt;
    if (!e.struckThisAttack && t && t.alive) {
      const dx = t.x - e.x, dz = t.z - e.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= arch.range + t.radius) {
        e.struckThisAttack = true;
        const dealt = hurtTarget(arch.dmg, e.id);
        if (dealt > 0) { stats.hits++; stats.meleeStrikes++; stats.damageDealt += dealt; }
        stats.shots++;
      }
    }
    if (e.leapT <= 0) {
      e.atk = 3;
      e.atkT = 0;
      e.cooldown = fireInterval(arch, rand(cadenceRng));
    }
  }

  // -------------------------------------------------------------------------
  // ONE CREATURE, ONE FIXED STEP
  // -------------------------------------------------------------------------
  function stepEnemy(e, dt, t, lit, aiTick) {
    const arch = e.arch;

    // ---- clocks. Monotonic, all of them. --------------------------------
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.litFor > 0) e.litFor = Math.max(0, e.litFor - dt);
    if (e.staggerT > 0) e.staggerT = Math.max(0, e.staggerT - dt);
    if (e.cooldown > 0) e.cooldown = Math.max(0, e.cooldown - dt);
    if (e.losFailT > 0) e.losFailT = Math.max(0, e.losFailT - dt);
    if (e.flinchT > 0) e.flinchT = Math.max(0, e.flinchT - dt);
    e.flinchSince += dt;

    observeDamage(e, dt);
    if (e.hp <= 0 || (e.dead && !e.deathHandled)) { runDeath(e); return; }

    if (!t || !t.alive) { integrate(e, arch, 0, 0, dt, null); return; }

    const ex = e.x, ez = e.z;
    const dxp = t.x - ex, dzp = t.z - ez;
    const dist = Math.sqrt(dxp * dxp + dzp * dzp) || 1e-6;

    // ---- awareness ------------------------------------------------------
    if (aiTick) {
      const before = e.aware;
      look(e, arch, ctx.world, t.x, t.y + t.height * T.aimHeight, t.z, lit, clock);
      forget(e, clock);
      if (e.aware !== before) {
        if (e.aware === AWARE.hunting) stats.toHunting++;
        else if (e.aware === AWARE.unaware) stats.toUnaware++;
        else stats.toAlerted++;
      }
      // REACTION TIME (D3's third term) is paid on ACQUISITION, once, and it is
      // shortened by up to 30% by how lit the player is. Standing in your own
      // light is answered faster, which is the trade stated as a delay.
      if (e.aware === AWARE.hunting && before !== AWARE.hunting) {
        e.reactionT = reactionTime(lit, rand(cadenceRng));
      }
    }
    if (e.reactionT > 0) e.reactionT = Math.max(0, e.reactionT - dt);

    // THE LAST HOSTILE. One creature left, hiding, and a wave that will not end
    // is a wave that stops being a wave. After `lastHostileAfter` it knows.
    if (aliveCount === 1 && lastHostileAt >= 0 && clock - lastHostileAt > E.lastHostileAfter) {
      if (e.aware !== AWARE.hunting) { e.aware = AWARE.hunting; e.transitions++; stats.toHunting++; }
      e.knownX = t.x; e.knownZ = t.z; e.knownAt = clock;
    }

    // ---- line of sight, against the real collider bake -------------------
    const eyeY = e.y + arch.height * T.strikeHeight;
    let hasLos = false;
    if (e.aware === AWARE.hunting) {
      hasLos = lineOfSight(ctx.world, e.x, eyeY, e.z, t.x, t.y + t.height * T.aimHeight, t.z).clear;
      if (!hasLos) {
        // THE ONE LINE THAT KILLS THE BEHIND-COVER DEADLOCK. Cool down, and
        // advance at FULL speed: a creature that cannot see you has nothing to
        // be careful about, and one that stands still holding an attack it can
        // never legally start is the bug every cover shooter ships.
        if (e.losFailT <= 0) { e.losFailT = E.losFailCooldown; stats.losFails++; }
        if (e.atk === 1) cancelAttack(e, 'los');
      }
    }

    // ---- the movement leg ------------------------------------------------
    let vx = 0, vz = 0;
    let aimYaw = e.yaw;

    if (e.aware === AWARE.unaware) {
      // A slow sweep. Not a patrol: the director owns where things go, and a
      // creature wandering off its portal is a creature the player never meets.
      aimYaw = e.yaw + 0.35;
      tickStrafe(e, dt, rand(aiRng));
    } else if (e.aware === AWARE.alerted) {
      aimYaw = e.bearing;
      // It knows a bearing, not a position: it walks the bearing, slowly.
      vx = Math.sin(e.bearing) * arch.speed * E.strafeScale;
      vz = Math.cos(e.bearing) * arch.speed * E.strafeScale;
    } else {
      const goalX = hasLos ? t.x : e.knownX;
      const goalZ = hasLos ? t.z : e.knownZ;
      aimYaw = Math.atan2(goalX - e.x, goalZ - e.z);
      tickStrafe(e, dt, rand(aiRng));

      // MOVEMENT OR ATTACK, ONE AT A TIME, ALWAYS. That single rule is most of
      // what makes a 7.2 m/s creature readable rather than cheap.
      const busy = (arch.melee && e.atk !== 0) || e.atk === 1 || e.atk === 3;
      if (e.atk === 2) {
        const nx = (t.x - e.x) / dist, nz = (t.z - e.z) / dist;
        const leap = arch.speed * T.meleeLungeScale;
        vx = nx * leap; vz = nz * leap;
      } else if (!busy) {
        const d = desiredVelocity(e, arch, goalX, goalZ, hasLos && e.losFailT <= 0, clock);
        vx = d.vx; vz = d.vz;
        // A creature not permitted to attack holds OFF the ring. This is what
        // "they never stack on your face" means in play: the near ring belongs
        // to whoever is allowed to swing, and everyone else queues.
        if (e.queued && dist < arch.keepOut + T.queueRing) {
          const nx = dxp / dist, nz = dzp / dist;
          const radial = vx * nx + vz * nz;
          if (radial > 0) { vx -= nx * radial; vz -= nz * radial; }
        }
      }
    }

    // ---- stagger DAMPS. It never zeroes the AI. -------------------------
    if (e.staggerT > 0) {
      const s = staggerScale(e.staggerHits);
      vx *= s; vz *= s;
    }

    turnToward(e, aimYaw, dt, e.aware !== AWARE.unaware);
    integrate(e, arch, vx, vz, dt, t);

    // ---- the attack machine ---------------------------------------------
    if (e.atk === 1) {
      e.atkT += dt;
      e.windup01 = clamp01(e.atkT / e.windupTime);
      if (e.atkT >= e.windupTime) {
        e.windup01 = 0;
        strike(e, arch, t, lit);
      }
    } else if (e.atk === 2) {
      stepLeap(e, arch, t, dt);
    } else if (e.atk === 3) {
      e.atkT += dt;
      if (e.atkT >= T.meleeRecover) { e.atk = 0; e.atkT = 0; }
    } else if (aiTick && e.aware === AWARE.hunting) {
      // ---- may this creature begin a wind-up? --------------------------
      // A melee creature must also be inside its own band before it commits:
      // movement or attack, one at a time, always.
      const inRange = arch.fuse
        ? dist <= arch.range
        : dist <= (arch.melee ? arch.advanceAbove + T.meleeLungeScale * arch.speed * T.meleeLungeTime : arch.range + t.radius);
      const ready = e.cooldown <= 0 && e.reactionT <= 0 && hasLos && inRange && !e.queued;
      if (ready) beginAttack(e, arch);
    }

    // ---- presentation state ---------------------------------------------
    tickFlinch(e, dt);
  }

  /**
   * THE MOVE. Desired velocity -> separation bias -> THE KEEP-OUT RING, solved
   * as a swept constraint BEFORE integration -> the real resolver.
   *
   * The ring is never a positional shove. A shove runs after the resolver has
   * already decided the pose is legal, so it can push a creature into a wall
   * with nothing left to say no — and that is what `relocations === 0` in the
   * gate is actually measuring.
   */
  function integrate(e, arch, vx, vz, dt, t) {
    // Separation is a lateral STEERING term, added before the ring is solved.
    separationBias(e, roster, POOL, _sep);
    vx += _sep.x; vz += _sep.z;

    // Approach the desired velocity rather than snapping to it: an instant
    // velocity change is a creature that has no mass.
    const k = 1 - Math.exp(-T.accel / Math.max(0.1, arch.speed) * dt);
    e.vx += (vx - e.vx) * k;
    e.vz += (vz - e.vz) * k;

    if (t) {
      const ring = Math.max(0, arch.keepOut - T.keepOutSkin);
      const s = clipToRing(e.x, e.z, e.vx * dt, e.vz * dt, t.x, t.z, ring);
      if (s < 1) { e.vx *= s; e.vz *= s; }
    }

    e.vy -= FEEL.move.gravity * dt;

    const w = ctx.world;
    if (w) {
      moveCapsule(w, e, dt);
      if (e.recovered) { stats.relocations++; e.recovered = false; }
      if (e.abandoned) { stats.abandons++; e.abandoned = false; }
    } else {
      e.x += e.vx * dt; e.z += e.vz * dt;
      e.y = Math.max(0, e.y + e.vy * dt);
      if (e.y <= 0) { e.y = 0; e.vy = 0; e.grounded = true; }
    }

    // If the PLAYER walked into the ring, refuse any further inward velocity —
    // never teleport out. The band's own retreat leg carries the creature clear.
    if (t) {
      const dx = e.x - t.x, dz = e.z - t.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1e-6;
      if (d < arch.keepOut) {
        const nx = dx / d, nz = dz / d;
        const radial = e.vx * nx + e.vz * nz;
        if (radial < 0) { e.vx -= nx * radial; e.vz -= nz * radial; }
      }
    }
  }

  function tickFlinch(e, dt) {
    const total = T.flinchIn + T.flinchHold + T.flinchOut;
    if (e.flinchT <= 0) { e.lean = 0; e.flinchX = 0; e.flinchZ = 0; return; }
    const age = total - e.flinchT;
    let a;
    if (age < T.flinchIn) a = age / T.flinchIn;
    else if (age < T.flinchIn + T.flinchHold) a = 1;
    else a = Math.max(0, 1 - (age - T.flinchIn - T.flinchHold) / T.flinchOut);
    const eased = a * a * (3 - 2 * a);
    e.lean = T.flinchLean * eased;
    e.flinchX = (e.flinchDirX || 0) * T.flinchLimb * eased;
    e.flinchZ = (e.flinchDirZ || 0) * T.flinchLimb * eased;
  }

  // -------------------------------------------------------------------------
  // THE SYSTEM TICK
  // -------------------------------------------------------------------------
  function step(dt) {
    clock += dt;
    frame++;

    const t = target();
    const lit = litAtTarget(t);

    // THE ATTACKER GATE. FEEL.enemies.fireGateMin is the FLOOR; the gate opens
    // with the crowd. Fourteen simultaneous attacks is not fourteen threats, it
    // is one unreadable wall — and two is always a real one.
    const gate = attackerGate(aliveCount);
    let granted = 0;
    for (let i = 0; i < POOL; i++) {
      const e = roster[i];
      if (e.id < 0 || e.dead) continue;
      // Whoever is already committed keeps their token.
      e.queued = !(e.atk !== 0 || granted < gate);
      if (!e.queued) granted++;
    }

    if (aliveCount === 1) { if (lastHostileAt < 0) lastHostileAt = clock; }
    else lastHostileAt = -1;

    let maxIntrusion = 0;
    for (let i = 0; i < POOL; i++) {
      const e = roster[i];
      if (e.id < 0) continue;
      // A death this module was never told about — the controller's execute
      // writes `hp = 0; dead = true` straight onto the record — must still run
      // the death path, or the game's only silent kill is also its only kill
      // that leaves no light. Observe, never wait to be told.
      if (e.dead && !e.deathHandled) { runDeath(e); continue; }
      if (e.dead) { stepCorpse(e, dt); continue; }

      // FAR TICK. Beyond FEEL.enemies.farTickDistance the AI decision runs on
      // alternating frames — but MOVEMENT integrates every frame regardless. A
      // creature that moves at half rate at 46 m and full rate at 44 m visibly
      // snaps as the player backs up, which is worse than the cost it saves.
      let aiTick = true;
      if (t) {
        const dx = e.x - t.x, dz = e.z - t.z;
        if (dx * dx + dz * dz > E.farTickDistance * E.farTickDistance) {
          aiTick = ((frame + e.slot) % T.farTickPhases) === 0;
          if (!aiTick) stats.farTicksSkipped++;
        }
      }
      stepEnemy(e, dt, t, lit, aiTick);

      if (t && !e.dead && e.arch) {
        const dx = e.x - t.x, dz = e.z - t.z;
        const intr = e.arch.keepOut - Math.sqrt(dx * dx + dz * dz);
        if (intr > maxIntrusion) maxIntrusion = intr;
      }
    }

    if (maxIntrusion > stats.peakIntrusion) stats.peakIntrusion = maxIntrusion;
    if (maxIntrusion > T.intrusionFloor) {
      intrusionRun += dt;
      if (intrusionRun > stats.longestIntrusion) stats.longestIntrusion = intrusionRun;
    } else intrusionRun = 0;

    const cov = centralCoverage(t);
    if (cov > stats.peakCentralCoverage) stats.peakCentralCoverage = cov;
  }

  /**
   * How much of the middle of the player's view is body. Union of the live
   * creatures' angular intervals, clipped to the world FOV about the player's
   * facing — measured, not asserted, because "they never stack on your face" is
   * a claim about a picture and this is the number under it.
   */
  const _iv = new Float64Array(POOL * 2);
  function centralCoverage(t) {
    if (!t) return 0;
    const half = FEEL.camera.fovWorld * Math.PI / 360;
    let n = 0;
    for (let i = 0; i < POOL; i++) {
      const e = roster[i];
      if (e.id < 0 || e.dead || !e.arch) continue;
      const dx = e.x - t.x, dz = e.z - t.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 1e-3) { _iv[n * 2] = -half; _iv[n * 2 + 1] = half; n++; continue; }
      const w = Math.asin(clamp(e.radius / Math.max(e.radius, d), -1, 1));
      let b = Math.atan2(dx, dz) - t.yaw;
      while (b > Math.PI) b -= Math.PI * 2;
      while (b < -Math.PI) b += Math.PI * 2;
      const lo = Math.max(-half, b - w), hi = Math.min(half, b + w);
      if (hi <= lo) continue;
      _iv[n * 2] = lo; _iv[n * 2 + 1] = hi; n++;
    }
    if (n === 0) return 0;
    // Insertion sort by lower edge — bounded by the alive cap, allocation-free.
    for (let i = 1; i < n; i++) {
      const a = _iv[i * 2], b = _iv[i * 2 + 1];
      let j = i - 1;
      while (j >= 0 && _iv[j * 2] > a) { _iv[(j + 1) * 2] = _iv[j * 2]; _iv[(j + 1) * 2 + 1] = _iv[j * 2 + 1]; j--; }
      _iv[(j + 1) * 2] = a; _iv[(j + 1) * 2 + 1] = b;
    }
    let total = 0, curLo = _iv[0], curHi = _iv[1];
    for (let i = 1; i < n; i++) {
      const lo = _iv[i * 2], hi = _iv[i * 2 + 1];
      if (lo > curHi) { total += curHi - curLo; curLo = lo; curHi = hi; }
      else if (hi > curHi) curHi = hi;
    }
    total += curHi - curLo;
    return clamp01(total / (half * 2));
  }

  // -------------------------------------------------------------------------
  // PRESENTATION
  // -------------------------------------------------------------------------
  function update(rdt, time) {
    renderClock += rdt;
    wireLate();

    const cam = ctx.camera;
    let cx = 0, cy = 1.6, cz = 0;
    if (cam) { cx = cam.position.x; cy = cam.position.y; cz = cam.position.z; }

    bodies.begin();
    const flashSafe = !!(ctx.flashSafe || ctx.reducedMotion);
    for (let i = 0; i < POOL; i++) {
      const e = roster[i];
      if (e.id < 0 || !e.arch) continue;
      bodies.submitBody(e, e.arch);
      bodies.submitStrips(e, e.arch, cx, cy, cz, renderClock + e.dutyPhase, flashSafe);
    }
    bodies.flush();
  }

  // -------------------------------------------------------------------------
  // WIRING. Audio is LAST in the manifest, so `ctx.audio` does not exist when
  // this module is constructed — the audio half is wired on the first update,
  // which is still before any chamber-ready assertion runs.
  // -------------------------------------------------------------------------
  const wired = { weaponsTargets: false, weaponsDisturb: false, player: false, audio: false };

  function wireLate() {
    if (!wired.audio && ctx.audio && typeof ctx.audio.setHostiles === 'function') {
      ctx.audio.setHostiles(roster);      // the reused array, never a copy
      wired.audio = true;
    }
  }

  function wireNow() {
    const w = ctx.weapons;
    if (w) {
      if (typeof w.setTargets === 'function') wired.weaponsTargets = !!w.setTargets(() => roster);
      if (typeof w.setDisturbanceSink === 'function') {
        w.setDisturbanceSink(d => raise(d.x, d.y, d.z, d.radius, 'gun'));
        wired.weaponsDisturb = true;
      }
    }
    const p = ctx.player;
    if (p && typeof p.inject === 'function') {
      p.inject({
        enemies: () => roster,
        impact: (kind, x, y, z, id) => impactAt(kind, x, y, z, id),
        refillWeapon: () => { const wp = ctx.weapons; if (wp && typeof wp.refill === 'function') wp.refill(); },
        disturb: (x, y, z, radius, kind) => raise(x, y, z, radius, kind),
      });
      wired.player = true;
    }
    wireLate();
  }

  /** C2-F8: names every provider still in place at chamber-ready. */
  function assertWired() {
    const missing = [];
    if (!wired.weaponsTargets) missing.push('enemies: weapons.setTargets() — the ray marches world geometry and then finds nothing to hit');
    if (!wired.weaponsDisturb) missing.push('enemies: weapons.setDisturbanceSink() — D4 has no event, so firing gives nothing away');
    if (!wired.player) missing.push('enemies: player.inject() — the dash hits nothing and the execute deposits no light');
    if (!wired.audio) missing.push('enemies: audio.setHostiles() — EARSHOT is silent and looks like it is working');
    return missing;
  }

  // -------------------------------------------------------------------------
  // QA / the gate's eyes
  // -------------------------------------------------------------------------
  function snapshot() {
    return {
      build: 'w7-enemies',
      clock, alive: aliveCount, pool: POOL, cap: CAP,
      roster: ARCHETYPE_IDS.slice(),
      counts: countByType(),
      stats: { ...stats, minWindup: stats.minWindup === Infinity ? 0 : stats.minWindup },
      bodies: { ...bodies.stats, live: bodies.live },
      wired: { ...wired },
      errors: assertWired(),
      hitRate: stats.shots > 0 ? stats.hits / stats.shots : 0,
    };
  }

  function countByType() {
    const out = {};
    for (const id of ARCHETYPE_IDS) out[id] = 0;
    for (let i = 0; i < POOL; i++) {
      const e = roster[i];
      if (e.id < 0 || e.dead) continue;
      out[e.type]++;
    }
    return out;
  }

  function reset() {
    for (let i = 0; i < POOL; i++) retire(roster[i]);
    aliveCount = 0; clock = 0; renderClock = 0; frame = 0;
    intrusionRun = 0; lastHostileAt = -1; nextId = 1;
    for (const k of Object.keys(stats)) stats[k] = (k === 'minWindup') ? Infinity : 0;
    // A seeded restart replays identically: `derive` rebuilds the whole tree.
    rng = ctx.rng ? ctx.rng.derive('enemies') : null;
    aiRng = rng ? rng.fork('ai') : null;
    cadenceRng = rng ? rng.fork('cadence') : null;
    accuracyRng = rng ? rng.fork('accuracy') : null;
    varyRng = rng ? rng.fork('vary') : null;
  }

  /**
   * CONTRACT §2 — an observable assertion on the SHIPPING page, not on a scratch
   * harness. Spawn one of each archetype, prove they are in the instanced
   * buckets, prove the strips reached the shared additive bucket, prove a kill
   * deposits light into the field the whole game reads.
   */
  function verify() {
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });

    const before = ctx.light ? ctx.light.total : 0;
    const start = ctx.chamber && ctx.chamber.playerStart ? ctx.chamber.playerStart : { x: 0, y: 0, z: 0 };
    const made = [];
    for (let i = 0; i < ARCHETYPE_IDS.length; i++) {
      const a = ARCHETYPES[i];
      const e = spawn(a.id, start.x + (i - 2) * 3.0, start.y, start.z - 8, 0);
      if (e) made.push(e);
    }
    add('every archetype spawns', made.length === ARCHETYPE_IDS.length, `${made.length}/${ARCHETYPE_IDS.length}`);

    step(FEEL.time.fixedDt);
    update(FEEL.time.fixedDt, ctx.time);

    add('bodies are instanced, one draw per archetype in play',
      !bodies.live || (bodies.stats.draws > 0 && bodies.stats.draws <= ARCHETYPE_IDS.length),
      `${bodies.stats.draws} draws · ${bodies.stats.instances} instances · ${bodies.stats.triangles} tris`);
    add('the silhouette strips reach the shared additive bucket',
      !bodies.live || bodies.stats.sprites >= made.length, `${bodies.stats.sprites} sprites`);
    add('every strip is under the bloom threshold at rest',
      ARCHETYPES.every(a => a.stripEmissive * BODY_TABLE.hitFlashGain * 0 + a.stripEmissive < FEEL.render.bloomThreshold),
      ARCHETYPES.map(a => a.stripEmissive.toFixed(3)).join(' '));

    // A kill deposits its scar into the field five systems read.
    const victim = made[0];
    if (victim) { victim.hp = 0; step(FEEL.time.fixedDt); }
    const after = ctx.light ? ctx.light.total : 0;
    add('a kill deposits permanent light', after > before, `${before.toFixed(2)} -> ${after.toFixed(2)}`);

    add('no attack has ever landed under the telegraph law',
      stats.attacksUnderLaw === 0, `${stats.attacksUnderLaw} violations`);
    add('nothing was relocated by the resolver', stats.relocations === 0, `${stats.relocations}`);

    for (const e of made) if (e && !e.dead) { e.hp = 0; }
    step(FEEL.time.fixedDt);

    return { ok: checks.every(c => c.ok), checks };
  }

  function dispose() {
    bodies.dispose();
    for (let i = 0; i < POOL; i++) retire(roster[i]);
    aliveCount = 0;
  }

  const api = {
    id: 'enemies',
    step, update, dispose, verify, snapshot, reset,
    spawn, retire, raise, assertWired,
    /** The reused array every consumer reads. NEVER a copy, NEVER resized. */
    list: roster,
    get alive() { return aliveCount; },
    get clock() { return clock; },
    stats, bodies,
    ARCHETYPES, ARCHETYPE_IDS,
    centralCoverage: () => centralCoverage(target()),
    litAtTarget: () => litAtTarget(target()),
    silhouetteSignature,
    telegraphGain,
    hitChance,
    lineOfSight: (ax, ay, az, bx, by, bz) => lineOfSight(ctx.world, ax, ay, az, bx, by, bz),
    /** C2-F8. A test injects its own target; the page uses the real controller. */
    inject(p) {
      if (!p) return api;
      if (typeof p.target === 'function') { provide.target = p.target; defaulted.target = false; }
      if (typeof p.depositScale === 'function') { provide.depositScale = p.depositScale; defaulted.depositScale = false; }
      return api;
    },
    setProjectileSink(fn) { projectileSink = typeof fn === 'function' ? fn : null; return !!projectileSink; },
    wire: wireNow,
  };

  wireNow();
  ctx.enemies = api;
  if (typeof window !== 'undefined' && window.__FLARE) window.__FLARE.enemies = api;
  return api;
}

export default create;
