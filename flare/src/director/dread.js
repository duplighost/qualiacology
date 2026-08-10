// THE DREAD DIRECTOR — the loud cooldown, and the engineered silences.
//
// THE THESIS, and the reason this is a system rather than a sound cue: MOST
// BEATS ARE QUIET. The chamber occasionally builds, and the build pays off with
// a real hit ONLY if a global loud cooldown allows; otherwise it COLLAPSES INTO
// SILENCE. The player is always braced and rarely actually hit. Restraint is the
// mechanic — a scheduler that always pays off is a metronome, and a metronome is
// the one thing that cannot frighten anybody twice.
//
// WHERE IT IS ALLOWED TO RUN, which is the part the brief was explicit about and
// the part that is easy to get wrong: THE BEAT SCHEDULER RUNS ONLY IN THE
// LANDINGS AND THE 2.6 s PRE-WAVE SILENCE. During a wave the fight IS the dread,
// and a stinger landing on top of six live hostiles is two loud things fighting
// each other for the same 200 ms. The TENSION BUS, by contrast, runs always —
// they are different systems with different clocks and only one of them is
// allowed to stop.
//
// THE BETWEEN-WAVE QUIET IS A DESIGNED ELEMENT WITH THE SAME WEIGHT AS ANYTHING
// ELSE. A wave that never ends stops feeling like a wave: the gap is what makes
// the next spawn a beginning instead of more of the same, and it is the only
// place in a chamber where the player can hear the room they have been lighting.
// It is asserted by name and by duration in tests/director.mjs, because "we
// removed the pause to keep the pressure up" is the note that deletes it.
//
// EVERY DELAYED PAYOFF IS CANCELLABLE, and they are all cancelled on chamber
// change. A beat scheduled in chamber 2 that fires a stinger into chamber 3 is
// the failure this file is shaped around; the timer ring is fixed-size, runs on
// the SIM clock (never setTimeout — that is neither deterministic nor
// cancellable by a chamber that has already been disposed), and `cancelAll()` is
// called from exactly one place.

import FEEL from '../feel.js';
import { clamp01 } from '../core/math.js';

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. CONTRACT §5.
//
// These are docs/DESIGN.md's Dread Director numbers, verbatim. They are NOT in
// FEEL because FEEL.tension carries the bus and FEEL.director carries the
// spawner and neither has a home for them; every one is proposed for a
// `FEEL.dread` block in docs/HANDOFF.md so this table can become a derivation
// like every other module's.
// ---------------------------------------------------------------------------
export const DREAD_TABLE = Object.freeze({
  loudGap: 26,               // minimum seconds between full stingers
  softRoll: 0.76,            // rand < this -> soft beat
  softIfSinceLoud: 13,       // ...and a build is impossible this soon after one
  timerBase: 11,             // dreadTimer = (11 + rand*11) - tension*3.2
  timerSpan: 11,
  timerPerTension: 3.2,
  timerMin: 2.0,             // the subtraction must not be able to reach zero and
                             // turn a scheduler into a per-frame event
  postLoudQuiet: 3.2,        // enforced silence after a stinger lands
  tensionPerBeat: 0.06,      // every beat bleeds the bus down toward its floor

  buildRise: 1.35,           // seconds the build takes to reach its held level
  buildLevel: 0.34,          // ...above the bus's current value, clamped to 1
  buildHold: 1.10,           // then the payoff resolves
  stingerKick: 0.30,         // the transient the bus carries on a real hit

  preWaveSilence: 2.6,       // "before each chamber's first wave, 2.6 s of
                             // engineered total silence with all spawning
                             // suspended. The quiet is the telegraph."
  landingSec: 20,            // the dark landing between chambers, if the chamber
                             // registry does not publish its own

  timers: 8,                 // the ring. Eight is four more than any beat uses.

  // The soft beat: a small positional tick somewhere in the room, at a bearing.
  // It is the cheapest possible "something moved over there" and it is the one
  // that fires most often, so it must never be a stinger at low volume.
  softRadiusMin: 11,
  softRadiusMax: 21,
  softPeak: 0.055,
  softHz: 128,
  softGlide: 0.72,
  softDur: 0.34,

  stingerPeak: 0.34,
  stingerHz: 74,
  stingerGlide: 0.55,
  stingerDur: 0.85,
  stingerLightR: 7.0,
  stingerLightI: 0.55,
  stingerLightSec: 0.30,
  // The rover pool keys emitters by INTEGER (`req.key[n] = key | 0`). A string
  // key becomes 0 and quietly collides with every other 0 in the pool.
  stingerLightKey: 0x3fffff,
});

const D = DREAD_TABLE;

// Beat kinds, as small ints so the ring never holds a string.
export const BEAT = Object.freeze({ none: 0, soft: 1, build: 2, stinger: 3, collapse: 4 });

/**
 * `tension` is the bus this scheduler nudges; `rng` is a stream OF ITS OWN.
 * Sharing a stream with the spawner would mean that adding one spawn shifts
 * every dread roll for the rest of the run (CONTRACT §3).
 */
export function createDread(ctx, tension, rng) {
  const rand = () => (rng ? rng.next() : 0.5);

  let clock = 0;             // sim seconds. Monotonic; never rewound (CONTRACT §5).
  let active = false;        // is the scheduler permitted to run right now
  let timer = -1;            // seconds of PERMITTED quiet until the next beat roll
  let lastLoud = -1e9;
  let quietUntil = -1e9;
  let lastBeat = BEAT.none;
  let lastBeatAt = -1e9;
  let building = false;

  const stats = {
    beats: 0, soft: 0, builds: 0, stingers: 0, collapses: 0,
    suppressedByGap: 0, suppressedByQuiet: 0,
    scheduled: 0, fired: 0, cancelled: 0, activeSeconds: 0,
  };

  // ---- the cancellable payoff ring ---------------------------------------
  // Fixed length, reused records, never resized. A Set of closures was the
  // brief's shape; the ring is the same guarantee without an allocation per beat
  // in a system that runs for the length of a run.
  const timers = new Array(D.timers);
  for (let i = 0; i < D.timers; i++) timers[i] = { on: false, t: 0, tag: 0, fn: null, serial: 0 };
  let serial = 1;

  const TAG = Object.freeze({ none: 0, payoff: 1, buildHold: 2, user: 3 });

  /**
   * Schedule a payoff `seconds` from now. Returns a handle that `cancel` takes.
   * `fn` is optional and is only used by tests and by future beats that need a
   * one-off; the internal beats all dispatch by TAG so the hot path holds no
   * closure.
   */
  function after(tag, seconds, fn) {
    for (let i = 0; i < D.timers; i++) {
      const s = timers[i];
      if (s.on) continue;
      s.on = true; s.t = seconds; s.tag = tag; s.fn = fn || null; s.serial = serial++;
      stats.scheduled++;
      return s.serial;
    }
    // Refusing loudly beats overwriting a live payoff. Eight slots against four
    // live at the absolute worst means this cannot happen without a leak, and a
    // leak should be visible rather than absorbed.
    stats.cancelled++;
    return 0;
  }

  function cancel(handle) {
    for (let i = 0; i < D.timers; i++) {
      const s = timers[i];
      if (!s.on || s.serial !== handle) continue;
      s.on = false; s.fn = null; s.tag = TAG.none;
      stats.cancelled++;
      return true;
    }
    return false;
  }

  /**
   * THE line this file exists for. Called on every chamber change, every death,
   * and every dispose — a beat scheduled in chamber 2 must never fire a white
   * flash into chamber 3.
   */
  function cancelAll() {
    let n = 0;
    for (let i = 0; i < D.timers; i++) {
      const s = timers[i];
      if (!s.on) continue;
      s.on = false; s.fn = null; s.tag = TAG.none;
      n++;
    }
    stats.cancelled += n;
    if (building) { building = false; tension.releaseScripted(); }
    return n;
  }

  function pendingCount() {
    let n = 0;
    for (let i = 0; i < D.timers; i++) if (timers[i].on) n++;
    return n;
  }

  // ---- the beats ----------------------------------------------------------
  function playerPos(out) {
    const p = ctx.player;
    if (p && p.body) { out.x = p.body.x; out.y = p.body.y; out.z = p.body.z; return out; }
    const c = ctx.camera;
    if (c) { out.x = c.position.x; out.y = c.position.y - FEEL.move.eye; out.z = c.position.z; return out; }
    out.x = 0; out.y = 0; out.z = 0;
    return out;
  }

  const _p = { x: 0, y: 0, z: 0 };

  /**
   * The quiet beat. Something at a bearing, far enough away to be a room and not
   * a threat. It goes through the POSITIONAL path — in the dark, an unpanned
   * noise is a lie about where the room is.
   */
  function softBeat() {
    stats.soft++;
    lastBeat = BEAT.soft; lastBeatAt = clock;
    tension.decayBeat(D.tensionPerBeat);

    const audio = ctx.audio;
    if (!audio || !audio.pool || typeof audio.pool.playAt !== 'function') return;
    playerPos(_p);
    const bearing = rand() * Math.PI * 2;
    const r = D.softRadiusMin + rand() * (D.softRadiusMax - D.softRadiusMin);
    const s = audio.pool.spec();
    s.when = audio.now;
    s.peak = D.softPeak;
    s.attack = 0.010;
    s.dur = D.softDur;
    s.decay = D.softDur * 0.55;
    s.tone = 0.55;
    s.toneType = 'triangle';
    s.toneHz = D.softHz;
    s.toneEnd = D.softHz * D.softGlide;
    s.noise = 0.35;
    s.filterHz = FEEL.audio.sfxLowpassHz;
    audio.pool.playAt('transient', _p.x + Math.sin(bearing) * r, _p.y + 1.2, _p.z + Math.cos(bearing) * r, s);
  }

  /** The build. Takes the picture, holds it, and then finds out if it pays. */
  function startBuild() {
    stats.builds++;
    building = true;
    lastBeat = BEAT.build; lastBeatAt = clock;
    tension.takeScripted(clamp01(tension.bare + D.buildLevel));
    after(TAG.payoff, D.buildRise + D.buildHold);
  }

  /**
   * THE PAYOFF, and it is a coin the player never sees flipped. The loud
   * cooldown is global and it is the whole restraint mechanic: if a stinger has
   * landed inside LOUD_GAP the build simply stops, and the absence is louder
   * than the hit would have been.
   */
  function resolveBuild() {
    building = false;
    if (clock - lastLoud < D.loudGap) {
      stats.collapses++;
      stats.suppressedByGap++;
      lastBeat = BEAT.collapse; lastBeatAt = clock;
      tension.releaseScripted();
      return BEAT.collapse;
    }
    stinger();
    return BEAT.stinger;
  }

  /** The real hit. Rate-limited by construction, and flash-safe by clamp. */
  function stinger() {
    stats.stingers++;
    lastLoud = clock;
    quietUntil = clock + D.postLoudQuiet;
    lastBeat = BEAT.stinger; lastBeatAt = clock;
    tension.releaseScripted();
    tension.addKick(D.stingerKick);

    playerPos(_p);
    const audio = ctx.audio;
    if (audio && audio.pool && typeof audio.pool.playAt === 'function') {
      const s = audio.pool.spec();
      s.when = audio.now;
      s.peak = D.stingerPeak;
      s.attack = 0.004;
      s.dur = D.stingerDur;
      s.decay = D.stingerDur * 0.6;
      s.tone = 0.7;
      s.toneType = 'triangle';
      s.toneHz = D.stingerHz;
      s.toneEnd = D.stingerHz * D.stingerGlide;
      s.noise = 0.30;
      s.filterHz = FEEL.audio.sfxLowpassHz;
      audio.pool.playAt('transient', _p.x, _p.y + FEEL.move.eye, _p.z, s);
    }
    // The light. SAFETY.md rule 4: FLASH-SAFE removes the exposure transient, so
    // the clamp is applied here rather than left to the iris to absorb — and at
    // one stinger per 26 s this is three orders of magnitude under the 3/s
    // ceiling either way.
    stingerLightT = D.stingerLightSec;
  }

  let stingerLightT = 0;

  // ---- the tick -----------------------------------------------------------
  /**
   * `permit` is the director's answer to "is the scheduler allowed to run right
   * now" — true in a landing and in the pre-wave silence, false during a wave.
   * The bus is stepped by the director itself and is deliberately not touched
   * here except through the two beat effects.
   */
  function step(dt, permit) {
    clock += dt;

    // Payoffs run whether or not the scheduler is permitted: a build that was
    // legally started must be allowed to resolve, and cancelling it is what
    // `cancelAll` is for. A payoff that could be stranded by a state change is a
    // scripted beat that owns the picture for ever.
    for (let i = 0; i < D.timers; i++) {
      const s = timers[i];
      if (!s.on) continue;
      s.t -= dt;
      if (s.t > 0) continue;
      s.on = false;
      const tag = s.tag;
      const fn = s.fn;
      s.fn = null; s.tag = TAG.none;
      stats.fired++;
      if (tag === TAG.payoff) resolveBuild();
      else if (fn) fn();
    }

    active = !!permit;
    if (active) stats.activeSeconds += dt;
    // THE TIMER PAUSES, IT DOES NOT RESTART. Re-rolling it on every rising edge
    // was this file's one real bug and it had no symptom: the between-wave quiet
    // is 4 s and the interval is 11-22 s, so a restarting timer could NEVER fire
    // in a gap and every beat in the game would happen in a landing. The
    // scheduler would look alive, the stats would look plausible, and the beats
    // would all be in the one place the player is least braced for them.
    // Accumulating across quiet stretches is what makes 4 s of silence a real
    // slice of the budget rather than a reset button.
    if (!active) return lastBeat;

    if (clock < quietUntil) { stats.suppressedByQuiet++; return lastBeat; }
    if (building) return lastBeat;

    timer -= dt;
    if (timer > 0) return lastBeat;
    timer = nextInterval();
    stats.beats++;

    // THE ROLL. `rand < 0.76` OR `sinceLoud < 13` -> soft. Restraint is the
    // default and the build is the exception, which is the inversion that makes
    // the build mean anything at all.
    const sinceLoud = clock - lastLoud;
    if (rand() < D.softRoll || sinceLoud < D.softIfSinceLoud) softBeat();
    else startBuild();
    return lastBeat;
  }

  /** Presentation. The stinger's light lives here — one request, one frame. */
  function update(rdt) {
    if (stingerLightT <= 0) return;
    stingerLightT = Math.max(0, stingerLightT - (rdt > 0 ? rdt : 0));
    const a = stingerLightT / D.stingerLightSec;
    const safe = (ctx.flashSafe || ctx.reducedMotion) ? FEEL.safety.flashSafeClamp : 1;
    const i = D.stingerLightI * a * a * safe;
    if (i <= 0) return;
    playerPos(_p);
    if (ctx.light && typeof ctx.light.addProbe === 'function') {
      ctx.light.addProbe(_p.x, _p.y + FEEL.move.eye, _p.z, D.stingerLightR, i);
    }
    const render = ctx.render;
    if (render && render.lights && typeof render.lights.request === 'function') {
      render.lights.request('telegraph', D.stingerLightKey, _p.x, _p.y + FEEL.move.eye, _p.z,
        D.stingerLightR, i, undefined, render.LIGHT_KIND ? render.LIGHT_KIND.POINT : 0);
    }
  }

  function nextInterval() {
    const t = tension ? tension.value : 0;
    return Math.max(D.timerMin, D.timerBase + rand() * D.timerSpan - t * D.timerPerTension);
  }

  function reset() {
    cancelAll();
    clock = 0; active = false; building = false;
    lastLoud = -1e9; quietUntil = -1e9; lastBeat = BEAT.none; lastBeatAt = -1e9;
    stingerLightT = 0;
    for (const k of Object.keys(stats)) stats[k] = 0;
    timer = nextInterval();
  }

  function snapshot() {
    return {
      clock, active, building, timer,
      lastBeat, lastBeatAt,
      sinceLoud: lastLoud < -1e8 ? -1 : clock - lastLoud,
      quietFor: Math.max(0, quietUntil - clock),
      pending: pendingCount(),
      stats: { ...stats },
    };
  }

  timer = nextInterval();

  return {
    step, update, reset, snapshot, cancelAll, after, cancel,
    softBeat, startBuild, stinger, resolveBuild,
    TAG, BEAT, DREAD_TABLE: D,
    get clock() { return clock; },
    get active() { return active; },
    get building() { return building; },
    get pending() { return pendingCount(); },
    get lastBeat() { return lastBeat; },
    get sinceLoud() { return lastLoud < -1e8 ? Infinity : clock - lastLoud; },
    stats,
  };
}

export default createDread;
