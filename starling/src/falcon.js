/* The peregrine.
 *
 * It hunts the calmest dense part of the flock, which is the single decision
 * that turns the wave from a light show into a mechanic. An indiscriminate
 * falcon would be beaten by wagging the flock constantly and never looking;
 * this one goes where the alarm is not, so a wave is only worth anything if it
 * arrives at the place it is actually about to hit. You cannot cover the flock,
 * only guess it, and the guess is the game.
 */

import { TAU, clamp, wrapAngle } from "./math.js";

const MARK = 1.55;    /* seconds hanging over the chosen spot before the dive */
const STOOP = 1.0;    /* seconds of dive */
const STRIKE_R = 118; /* how wide the killing pass is */
const ARMED = 0.30;   /* alarm at or above this and the bird lives */

export class Falcon {
  constructor(world, rng) {
    this.world = world;
    this.rng = rng;
    this.x = world.w * 0.5;
    this.y = -160;
    this.dir = 0;
    this.active = false;   /* read by flock.js: are the birds allowed to see it */
    this.phase = "away";   /* away | mark | stoop | pass | climb */
    this.t = 0;
    this.tx = 0; this.ty = 0;
    this.sx = 0; this.sy = 0;
    this.kills = 0;
    this.lastKill = 0;
    this.stoops = 0;
    this.shake = 0;
    /* Coarse map used once per hunt to choose a target. 12x8 over the world. */
    this.mw = 12; this.mh = 8;
    this.mCount = new Int32Array(this.mw * this.mh);
    this.mAlarm = new Float32Array(this.mw * this.mh);
  }

  /* Where is the flock fat and unbothered? One O(n) pass, once per stoop. */
  choose(flock) {
    const { mw, mh, mCount, mAlarm, world } = this;
    mCount.fill(0); mAlarm.fill(0);
    for (let i = 0; i < flock.n; i++) {
      if (!flock.alive[i] || flock.roosted[i]) continue;
      let gx = ((flock.x[i] / world.w) * mw) | 0;
      let gy = ((flock.y[i] / world.h) * mh) | 0;
      gx = clamp(gx, 0, mw - 1); gy = clamp(gy, 0, mh - 1);
      const c = gy * mw + gx;
      mCount[c]++;
      mAlarm[c] += flock.alarm[i];
    }
    let best = -1, bx = world.w * 0.5, by = world.h * 0.4;
    for (let gy = 0; gy < mh; gy++) {
      for (let gx = 0; gx < mw; gx++) {
        const c = gy * mw + gx;
        const n = mCount[c];
        if (n < 24) continue;             /* not worth a stoop */
        const calm = 1 - mAlarm[c] / n;
        /* Density counts, but calm counts more — squared, so a slightly
         * thinner patch that nobody is watching still wins. */
        const score = n * calm * calm;
        if (score > best) {
          best = score;
          bx = (gx + 0.5) / mw * world.w;
          by = (gy + 0.5) / mh * world.h;
        }
      }
    }
    /* A little scatter so a perfect reader of this function still has to
     * cover an area rather than a pixel. */
    bx += (this.rng() - 0.5) * 70;
    by += (this.rng() - 0.5) * 55;
    this.tx = bx; this.ty = by;
    return best > 0;
  }

  /* Average drift of the birds under the mark, so the aim goes where they are
   * going. Every ninth bird is plenty for a mean and costs a ninth as much. */
  track(flock, dt) {
    let vx = 0, vy = 0, n = 0;
    const r2 = 170 * 170;
    for (let i = 0; i < flock.n; i += 9) {
      if (!flock.alive[i] || flock.roosted[i]) continue;
      const dx = flock.x[i] - this.tx, dy = flock.y[i] - this.ty;
      if (dx * dx + dy * dy > r2) continue;
      vx += flock.vx[i]; vy += flock.vy[i]; n++;
    }
    if (n < 3) return;
    this.tx += (vx / n) * dt * 0.9;
    this.ty += (vy / n) * dt * 0.9;
  }

  begin(flock) {
    if (!this.choose(flock)) return false;
    this.phase = "mark";
    this.t = 0;
    /* It comes in high and to one side, so the dive line reads as a line. */
    const side = this.rng() < 0.5 ? -1 : 1;
    this.sx = clamp(this.tx + side * (150 + this.rng() * 120), 60, this.world.w - 60);
    /* It has to be visible while it marks — that hang is the player's entire
     * warning. Clamped into frame rather than left wherever the geometry put
     * it, which for a high target was above the top of the sky. */
    this.sy = clamp(this.ty - (300 + this.rng() * 90), 58, this.world.h * 0.46);
    this.x = this.sx; this.y = this.sy;
    this.active = true;
    this.stoops++;
    return true;
  }

  step(dt, flock, onStrike, onShriek) {
    this.shake = Math.max(0, this.shake - dt * 3.2);
    if (this.phase === "away") return;
    this.t += dt;

    if (this.phase === "mark") {
      /* Hangs, treading the air, tracking the spot it has picked. This is the
       * whole of the player's warning, so it is long enough to cross the flock
       * with a wave and no longer.
       *
       * It tracks the drift of the birds under it while it hangs. Without this
       * it aimed at a fixed point and struck two and a half seconds later, by
       * which time the flock had moved on and the dive landed in empty sky —
       * a falcon that never caught anything and a game with nothing at stake.
       * The aim locks the instant it commits to the dive, so what the player
       * reads during the mark stays true. */
      this.track(flock, dt);
      const hover = Math.sin(this.t * 5.2) * 7;
      this.x = this.sx + Math.sin(this.t * 1.7) * 16;
      this.y = this.sy + hover;
      this.dir = Math.atan2(this.ty - this.y, this.tx - this.x);
      if (this.t >= MARK) { this.phase = "stoop"; this.t = 0; onShriek && onShriek(); }
      return;
    }

    if (this.phase === "stoop") {
      const k = clamp(this.t / STOOP, 0, 1);
      /* Accelerating, not linear — a stoop is gravity plus intent. */
      const e = k * k * (3 - 2 * k) * 0.35 + k * k * 0.65;
      const nx = this.sx + (this.tx - this.sx) * e;
      const ny = this.sy + (this.ty - this.sy) * e;
      this.dir = Math.atan2(ny - this.y, nx - this.x);
      this.x = nx; this.y = ny;
      if (k >= 1) {
        this.resolve(flock, onStrike);
        this.phase = "pass";
        this.t = 0;
      }
      return;
    }

    if (this.phase === "pass") {
      /* Carries through on the same line rather than stopping dead. */
      this.x += Math.cos(this.dir) * 430 * dt;
      this.y += Math.sin(this.dir) * 430 * dt;
      if (this.t > 0.55) { this.phase = "climb"; this.t = 0; }
      return;
    }

    if (this.phase === "climb") {
      this.y -= 300 * dt;
      this.x += Math.cos(this.dir) * 90 * dt;
      this.dir = wrapAngle(this.dir + (-Math.PI / 2 - this.dir) * Math.min(1, dt * 2));
      if (this.y < -180) { this.phase = "away"; this.active = false; }
      return;
    }
  }

  /* The rule the whole game is built to teach, in one loop: a bird that knows
   * lives, a bird that does not, does not. Nothing about position, nothing
   * about the player's skill at flying — only whether the news arrived. */
  resolve(flock, onStrike) {
    let killed = 0;
    const r2 = STRIKE_R * STRIKE_R;
    const cap = 96;
    for (let i = 0; i < flock.n; i++) {
      if (!flock.alive[i] || flock.roosted[i]) continue;
      const dx = flock.x[i] - this.tx, dy = flock.y[i] - this.ty;
      if (dx * dx + dy * dy > r2) continue;
      if (flock.alarm[i] >= ARMED) continue;
      flock.alive[i] = 0;
      flock.aliveCount--;
      killed++;
      if (killed >= cap) break;
    }
    this.kills += killed;
    this.lastKill = killed;
    this.shake = killed > 0 ? Math.min(1, killed / 55) : 0;
    onStrike && onStrike(killed, this.tx, this.ty);
  }
}

export { STRIKE_R, MARK, STOOP, ARMED };
