// The time system: fixed-step accumulator, hitstop, slow-motion, and trauma.
//
// Time is the load-bearing feedback channel in this game (KICK BALL's impact
// language: break and hurt freeze the sim, graze and locked never do). That makes
// this module gameplay code, not plumbing, and it has two rules that are easy to
// get wrong and nearly undiagnosable when you do:
//
// RULE 1 — DUAL DT. A freeze must stop the SIMULATION, not the PRESENTATION.
// Camera, particles and post keep integrating at a fraction of real dt during a
// freeze, which is what makes a hit punch instead of stall. Systems take both:
//   update(dt, rdt)   dt = sim seconds (0 during hitstop), rdt = render seconds.
//
// RULE 2 — LATCH EDGE INPUTS ABOVE THE FREEZE. Fire/jump/dash/reload presses must
// be latched before any `if (frozen) return`, or taps issued during impact frames
// vanish. That only happens while things are dying, i.e. exactly when the player
// is pressing buttons, and it reads as "the game dropped my input" with no
// reproducible case. See CONTRACT §3.

import { clamp, clamp01, damp } from './math.js';

export const FIXED_DT = 1 / 120;      // sim step
const MAX_FRAME = 0.25;               // never simulate more than a quarter second of backlog

export class TimeSystem {
  constructor(rng) {
    this.rng = rng ? rng.fork('trauma') : null;
    this.accum = 0;
    this.elapsed = 0;          // sim seconds since start, monotonic
    this.frame = 0;

    this.hitStop = 0;          // seconds of remaining freeze
    this.slowmo = 1;           // multiplier target, 1 = normal
    this.slowmoTimer = 0;
    this.trauma = 0;           // 0..1, drives shake; decays

    this.freezeScale = 0.18;   // presentation still moves this much during a freeze
    this.lastSimDt = 0;
    this.lastRenderDt = 0;
  }

  /**
   * Combinators, not setters. `max` is the correct merge for both: a big hit
   * landing during a small hit's freeze must not shorten it, and two hits in the
   * same frame must not stack into a stall.
   */
  addHitStop(seconds) { this.hitStop = Math.max(this.hitStop, seconds); }
  addTrauma(amount) { this.trauma = Math.min(1, Math.max(this.trauma, amount)); }

  setSlowmo(scale, seconds) {
    // A stronger slowdown wins; an equal one refreshes the timer.
    if (scale <= this.slowmo) { this.slowmo = scale; this.slowmoTimer = Math.max(this.slowmoTimer, seconds); }
  }

  get frozen() { return this.hitStop > 0; }

  /**
   * Consume one real frame. Returns how many fixed sim steps to run and the
   * render dt to hand to presentation systems. Callers run:
   *   const { steps, rdt } = time.begin(realDt);
   *   for (let i = 0; i < steps; i++) world.step(FIXED_DT * time.scale);
   *   presentation.update(rdt);
   */
  begin(realDt) {
    const dt = Math.min(realDt, MAX_FRAME);
    this.frame++;

    // Hitstop burns real time, never sim time.
    let simScale = this.slowmo;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      simScale = 0;
    }

    if (this.slowmoTimer > 0) {
      this.slowmoTimer = Math.max(0, this.slowmoTimer - dt);
      if (this.slowmoTimer === 0) this.slowmo = 1;
    }

    this.scale = simScale;
    this.accum += dt * simScale;

    let steps = 0;
    while (this.accum >= FIXED_DT) { this.accum -= FIXED_DT; steps++; if (steps >= 8) { this.accum = 0; break; } }
    this.elapsed += steps * FIXED_DT;

    // Presentation dt: full real dt normally, a slice of it during a freeze.
    const rdt = simScale === 0 ? dt * this.freezeScale : dt;
    this.lastSimDt = steps * FIXED_DT;
    this.lastRenderDt = rdt;

    // Trauma decays on the render clock so a freeze does not hold the shake.
    this.trauma = Math.max(0, this.trauma - 1.85 * rdt);

    return { steps, rdt, dt };
  }

  /** Shake amplitude. Quadratic so small trauma is genuinely small (KICK BALL). */
  get shake() { return this.trauma * this.trauma; }

  reset() {
    this.accum = 0; this.elapsed = 0; this.frame = 0;
    this.hitStop = 0; this.slowmo = 1; this.slowmoTimer = 0; this.trauma = 0;
  }
}

/**
 * A monotonic countdown. CONTRACT §5: no input and no state change may rewind a
 * clock the player is reading. This wrapper makes that structural — `tick` only
 * ever decreases, and `arm` refuses to extend an already-running clock unless
 * explicitly told to restart.
 */
export class Countdown {
  constructor() { this.remaining = 0; this.duration = 0; }
  arm(seconds, { restart = false } = {}) {
    if (!restart && this.remaining > 0) return false;
    this.remaining = seconds; this.duration = seconds; return true;
  }
  tick(dt) { if (this.remaining > 0) this.remaining = Math.max(0, this.remaining - dt); return this.remaining; }
  get running() { return this.remaining > 0; }
  get progress() { return this.duration > 0 ? clamp01(1 - this.remaining / this.duration) : 1; }
  clear() { this.remaining = 0; this.duration = 0; }
}

export { clamp, clamp01, damp };
