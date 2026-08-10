// THE TENSION BUS — one float, computed from live state, written everywhere.
//
// DESIGN's rule, and the reason this is a bus rather than a set of authored
// curves: "It is computed from live state, so it can never desync from what is
// actually happening." A scripted intensity curve is a second source of truth
// about how bad things are, and it goes wrong the first time a player kills a
// wave in nine seconds.
//
// WHAT IT DRIVES, simultaneously and from the same number: the grade's contrast,
// grain and tunnel crush (W1-RENDER reads `ctx.tension`), fog density and
// ambient, the bed's lowpass corner and dissonance cluster, the sub level, and
// the heart's resting BPM. Everything EASES at k = min(1, dt * 3.5); a transient
// that needs to arrive NOW goes through `kick()`, which writes on top and decays.
//
// THE PRIORITY STACK, decided on day one and implemented as an early return
// rather than as a convention: scripted > boss > bus > ambient. While a scripted
// beat owns the picture the bus must not write, or it stomps the beat back down
// every frame and the beat is invisible for reasons nobody can find.
//
// DARKNESS IS A TERM. That is the whole reason this bus belongs to this game and
// not to a generic horror kit: standing unlit with things near you is the most
// oppressive state available, and stepping into your own kill-light is a felt
// relief that costs you accuracy (D3). The oppression and the trade are the same
// number read twice.
//
// THE MOOD FILTER is the one progress readout the iris cannot compress — the
// music opens up as the room lights up. It reads litFraction against THE
// CHAMBER'S OWN lightGoal, because THE GALLERY (40 bodies, goal 28+) and THE
// INTAKE (26 bodies, goal 20) cannot share a constant and an audio module is the
// wrong home for a per-chamber quantity.

import FEEL from '../feel.js';
import { clamp01 } from '../core/math.js';

const T = FEEL.tension;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. CONTRACT §5 — nothing below inlines a
// number. Everything that FEEL.tension already declares is READ from there and
// never restated; what is here is what FEEL does not carry, and every one of
// them is proposed for FEEL in docs/HANDOFF.md rather than quietly kept local.
// ---------------------------------------------------------------------------
export const TENSION_TABLE = Object.freeze({
  // The 0..1 "how full is this fight" scalar the score's pulse rides on. It is
  // NOT the tension bus: combat is about the room being busy, tension is about
  // the room being frightening, and a quiet room at low health is the exact case
  // where the two have to disagree.
  combatDivisorFallback: FEEL.director.chambers.intake.cap,
  kickDecay: 2.4,             // per second; a transient is gone in well under a beat
  kickMax: 0.45,
  scriptedFade: 3.0,          // per second, back to the bus once a beat lets go
  bossFade: 1.5,
  // Reading illumination at the eye rather than at the feet: darkness is about
  // what the PLAYER can see, and a body standing in a pool it is not looking at
  // is not the relief the design means.
  sampleHeight: FEEL.move.eye,
});

const TT = TENSION_TABLE;

/**
 * The bus. `create(ctx)` on the director owns exactly one of these; nothing else
 * may mint a second, because two buses is two answers to "how bad is it" and the
 * picture and the mix would each believe a different one.
 */
export function createTension(ctx) {
  let value = 0;              // the eased, published scalar
  let raw = 0;                // this frame's computed target, before easing
  let floor = 0;              // the chamber's authored tension floor
  let combat = 0;
  let litFraction = 0;
  let boss = 0;               // 0..1; the boss term, faded rather than switched
  let bossWanted = 0;
  let scripted = -1;          // < 0 means "no beat owns the picture"
  let scriptedLevel = 0;
  let kick = 0;
  let alive30 = 0;
  let darkness = 1;
  let lowHealth = 0;
  let wrote = 0;              // how many frames this bus has published

  // Cached so the atmosphere write can COMPOSE with the quality governor rather
  // than overwrite it: the governor thickens fog on the low tier and the bus
  // thickens it with tension, and whoever writes the uniform last must carry
  // both terms or one of them silently stops existing.
  const base = {
    fog: FEEL.render.fogDensity,
    ambient: FEEL.render.ambient,
  };

  function setChamber(spec) {
    floor = spec && spec.tensionFloor > 0 ? spec.tensionFloor : 0;
    // Entering a chamber, the bus starts AT its floor rather than climbing to
    // it from zero. A room whose floor is 0.52 that opens at 0.00 spends its
    // first seconds telling the player it is safe, in the one chamber that is
    // not (THE FURNACE).
    if (value < floor) value = floor;
    raw = value;
  }

  function setBoss(on) { bossWanted = on ? 1 : 0; }

  /**
   * A scripted beat takes the picture. While `level >= 0` the bus computes but
   * does NOT publish its own value — priority stack, implemented as a branch.
   */
  function takeScripted(level) { scripted = clamp01(level); scriptedLevel = scripted; }
  function releaseScripted() { scripted = -1; }

  /** A transient. Rides ON TOP of whatever owns the picture, and decays. */
  function addKick(v) {
    kick += v;
    if (kick > TT.kickMax) kick = TT.kickMax;
  }

  /** The dread scheduler's per-beat decay, clamped to the chamber's floor. */
  function decayBeat(amount) {
    value = Math.max(floor, value - amount);
    return value;
  }

  /** Number of live hostiles inside FEEL.tension.aliveRadius of the player. */
  function countAliveWithin(px, pz) {
    const em = ctx.enemies;
    if (!em || !em.list) return 0;
    const r2 = T.aliveRadius * T.aliveRadius;
    let n = 0;
    const list = em.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e || e.id < 0 || e.dead) continue;
      const dx = e.x - px, dz = e.z - pz;
      if (dx * dx + dz * dz <= r2) n++;
    }
    return n;
  }

  /**
   * ONE frame. `rdt` is render dt on purpose: the bus is presentation, it keeps
   * easing through a hitstop, and a bus that froze with the sim would make every
   * kill briefly stop the music.
   */
  function update(rdt) {
    const dt = rdt > 0 ? rdt : 0;
    const k = Math.min(1, dt * T.easeK);

    // ---- where the player is, and how lit --------------------------------
    let px = 0, py = TT.sampleHeight, pz = 0, health = FEEL.economy.maxHealth;
    const p = ctx.player;
    if (p && p.body) {
      px = p.body.x; py = p.body.y + TT.sampleHeight; pz = p.body.z;
      health = p.state ? p.state.health : health;
    } else if (ctx.camera) {
      px = ctx.camera.position.x; py = ctx.camera.position.y; pz = ctx.camera.position.z;
    }

    const lit = ctx.light ? ctx.light.litAt(px, py, pz) : 0;
    darkness = 1 - lit;

    alive30 = countAliveWithin(px, pz);
    lowHealth = health < T.lowHealthBelow ? 1 : 0;

    boss += (bossWanted - boss) * Math.min(1, dt * TT.bossFade);

    // THE FORMULA. Every term is FEEL's, in FEEL's order, with no fifth term
    // smuggled in — the moment this grows a term nobody can predict the picture
    // from the fight any more, which is the whole property it exists to have.
    raw = clamp01(
      alive30 / T.aliveDivisor
      + boss * T.bossAdd
      + lowHealth * T.lowHealthAdd
      + darkness * T.darknessAdd,
    );
    if (raw < floor) raw = floor;

    // ---- the priority stack ----------------------------------------------
    if (scripted >= 0) {
      // A beat owns the picture. Ease TOWARD the scripted level so a beat still
      // arrives as a movement rather than as a cut, but never back toward the
      // bus while it is held.
      value += (scriptedLevel - value) * Math.min(1, dt * TT.scriptedFade);
    } else {
      value += (raw - value) * k;
    }

    if (kick > 0) {
      kick -= TT.kickDecay * dt;
      if (kick < 0) kick = 0;
    }

    const published = clamp01(value + kick);

    // ---- the progress readout the iris cannot compress --------------------
    const goal = ctx.chamber && ctx.chamber.lightGoal > 0 ? ctx.chamber.lightGoal : 0;
    litFraction = goal > 0 && ctx.light ? clamp01(ctx.light.total / goal) : 0;

    const cap = ctx.chamber && ctx.chamber.director && ctx.chamber.director.cap > 0
      ? ctx.chamber.director.cap
      : TT.combatDivisorFallback;
    combat = clamp01(alive30 / cap);

    publish(published);
    wrote++;
    return published;
  }

  /**
   * The write. Three consumers, and each of them is reached only through the
   * surface its owner published — nothing here reaches into another module's
   * internals except the two uniforms W1-RENDER has no setter for yet, which is
   * filed as a request in docs/HANDOFF.md.
   */
  function publish(t) {
    const render = ctx.render;
    if (render) {
      if (typeof render.setTension === 'function') render.setTension(t);
      else ctx.tension = t;

      // FOG and AMBIENT. FEEL.tension.fogPerT and ambientPerT exist and were
      // read by nothing; without this they are two numbers in the tuning block
      // that describe a behaviour the game does not have.
      //
      // COMPOSED with the governor, never overwriting it: the low quality tier
      // multiplies fog by 1.25 to hide its shorter draw distance, and a bus that
      // wrote FEEL.render.fogDensity * (1 + t*0.20) would delete that every
      // frame and the tier would silently stop working.
      const shared = render.shared;
      if (shared) {
        const gov = render.governor;
        const fogScale = gov && typeof gov.fogScale === 'number' ? gov.fogScale : 1;
        if (shared.uFogDensity) shared.uFogDensity.value = base.fog * fogScale * (1 + t * T.fogPerT);
        if (shared.uAmbient) shared.uAmbient.value = base.ambient * (1 + t * T.ambientPerT);
      }
    } else {
      ctx.tension = t;
    }

    const audio = ctx.audio;
    if (audio && audio.score) {
      // Both of these are named by the audio rig's own assertWired(): an unwired
      // tension provider freezes the bed, the sub AND the heart rate at zero and
      // looks exactly like a rig that is working.
      audio.score.setTension(t);
      audio.score.setCombat(combat);
      // The mood filter. `Score.litFractionOf` divides by a constant 26 that
      // predates the chambers; this is the same quantity read against the room
      // the player is actually in. The audio system recomputes `lit` from that
      // constant in its own update, which runs after this one — the request to
      // read `ctx.litFraction` instead is in docs/HANDOFF.md, and until it lands
      // this value is published rather than merely computed so the difference is
      // visible in a snapshot instead of invisible in a filter corner.
      if (typeof audio.score.setLit === 'function') audio.score.setLit(litFraction);
    }
    ctx.litFraction = litFraction;
    ctx.tension = t;
  }

  /** The mood filter's corner, in Hz. Published so a test can read the claim. */
  function moodHz() { return T.moodLowpass.base + litFraction * T.moodLowpass.perLit; }

  /** The heart's resting rate at the current bus value. */
  function heartBpm() { return T.heartBpm.base + clamp01(value + kick) * T.heartBpm.per; }

  function reset() {
    value = floor; raw = floor; kick = 0; boss = 0; bossWanted = 0;
    scripted = -1; scriptedLevel = 0; wrote = 0;
  }

  function snapshot() {
    return {
      value: clamp01(value + kick), raw, floor, kick, combat, litFraction,
      moodHz: moodHz(), heartBpm: heartBpm(),
      alive30, darkness, lowHealth, boss,
      scripted: scripted >= 0 ? scriptedLevel : -1,
      writes: wrote,
      fog: base.fog * (1 + clamp01(value + kick) * T.fogPerT),
      ambient: base.ambient * (1 + clamp01(value + kick) * T.ambientPerT),
    };
  }

  return {
    update, publish, reset, snapshot, setChamber, setBoss,
    takeScripted, releaseScripted, addKick, decayBeat, moodHz, heartBpm,
    get value() { return clamp01(value + kick); },
    get bare() { return value; },
    get target() { return raw; },
    get floor() { return floor; },
    get combat() { return combat; },
    get litFraction() { return litFraction; },
    get scriptedOwns() { return scripted >= 0; },
  };
}

export default createTension;
