// The rider. Height is the song's (course.js); speed is yours.
// Holding the button makes you heavy: heavy going down = faster, heavy going up
// = slower. So the only way to gain is to press into each dip and let go up the
// other side, which is the same thing as moving in time with the bar.
//
// Energy is kept like a rollercoaster: E = 1/2 speed^2 + G * height. Gravity
// alone never changes it. Pressing adds to it on the way down and takes more
// away on the way up. A landing loses only the part of your speed that hits the
// slope square-on, so a clean touchdown on a downslope keeps everything you fell.

import { G } from './course.js';

export const K_PRESS = 2.0;    // weight multiplier while pressing on the ground, going down
export const K_PRESS_UP = 2.7; // ... and going up: pressing uphill scrapes, it costs more than it ever pays
export const K_DIVE = 1.8;     // ... and in the air (dive onto the downslope)
export const V_MIN = 15;       // the song always carries you this fast
const DRAG = 2.4e-4;           // per-mass quadratic drag (sets top speed)
const STEP = 1 / 240;
const LAND_FREE = 3.6;         // m/s of square-on impact the knees take for free on rising ground
const LAND_FREE_DOWN = 9;      // ... and on falling ground: touching down on a downslope is how it's meant to go
const IMPACT = 3.0;            // extra speed^2 lost per (excess m/s)^2
const CRASH = 15;              // square-on m/s that throws you off the board

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class Rider {
  constructor(course) {
    this.course = course;
    this.s = {}; this.s2 = {};
    this.reset(0, 22);
  }

  reset(t, v = 22) {
    const s = this.course.sample(t, this.s);
    this.t = t; this.v = v; this.y = s.y; this.vy = s.vy; this.grounded = true;
    this.E = 0.5 * (v * v + s.vy * s.vy) + G * s.y;
    this.x = 0; this.vx = 0; this.lean = 0;
    this.press = false; this.pressT = 0; this.releaseT = 0;
    this.desc = 0; this.descP = 0; this.asc = 0; this.ascP = 0;
    this.prevAscFrac = 0;
    this.flow = 0.45;
    this.air = 0; this.airMax = 0;
    this.wipe = 0;           // seconds left of a wipeout
    this.compress = 0;       // 0..1 how squashed the legs are (for the pose/camera)
    this.vAvg = v;
    this.events = [];
    this.xz = { x: 0, z: 0 };
    this.lastVy = s.vy;
    this.stats = { valleys: 0, good: 0, perfect: 0, clean: 0, hard: 0, crashes: 0, notes: 0, notesTotal: 0, top: v, dist: 0, airTime: 0, flowSum: 0, flowN: 0 };
    this._noteIdx = 0;
    for (const n of this.course.notes) { n.got = false; n.gotT = undefined; }
  }

  // advance physics to song time tEnd
  advance(tEnd, input) {
    let guard = 0;
    while (this.t < tEnd && guard++ < 240) {
      const dt = Math.min(STEP, tEnd - this.t);
      this._step(dt, input);
    }
    if (this.t < tEnd) this.t = tEnd;   // fell far behind (tab hidden): skip ahead
  }

  // horizontal speed from energy, given where you are and how fast you're moving vertically
  _vFrom(E, y, vy) { return Math.sqrt(Math.max(V_MIN * V_MIN, 2 * (E - G * y) - vy * vy)); }

  _step(dt, input) {
    const c = this.course, s = c.sample(this.t + dt, this.s);
    const wiping = this.wipe > 0;
    const wantPress = !wiping && input.press;
    if (wantPress !== this.press) {
      this.press = wantPress;
      if (wantPress) this.pressT = this.t; else this.releaseT = this.t;
    }

    if (this.grounded) {
      const kHold = this.press ? K_PRESS : 1;
      if (s.ay < -kHold * G - 0.12) {
        // the ground falls away faster than you can follow it: you're flying.
        // (a launch's surface falls just faster than gravity, so letting go at the
        // lip flies you; holding keeps you on it, pumping the drop)
        this.grounded = false;
        this.air = 0; this.airMax = 0;
        this.vy = this.lastVy;
        this.y = c.sample(this.t, this.s2).y;
        this.events.push({ type: 'takeoff', t: this.t, vy: this.vy });
      } else {
        const vyPrev = this.lastVy;
        this.y = s.y; this.vy = s.vy;
        // pressing does work: + going down, - (more) going up
        if (this.press) this.E += -((s.vy > 0 ? K_PRESS_UP : K_PRESS) - 1) * G * s.vy * dt;
        // pump bookkeeping
        if (s.vy < -0.35) { this.desc += dt; if (this.press) this.descP += dt; }
        else if (s.vy > 0.35) {
          this.asc += dt;
          if (this.press) { this.ascP += dt; if (Math.random() < dt * 6) this.events.push({ type: 'scrape', amount: clamp(s.vy / 6, 0.2, 1) }); }
        }
        if (vyPrev < -0.35 && s.vy >= -0.35 && this.desc > 0.12) this._valley();
        if (vyPrev > 0.35 && s.vy <= 0.35) { this.prevAscFrac = this.asc > 0.1 ? this.ascP / this.asc : this.prevAscFrac; this.asc = 0; this.ascP = 0; }
        this.compress = Math.max(this.compress, clamp(s.ay / 40, 0, 1) * (this.press ? 1 : 0.6));
      }
    }

    if (!this.grounded) {
      const gEff = (this.press ? K_DIVE : 1) * G;
      const vy0 = this.vy;
      this.y += this.vy * dt - 0.5 * gEff * dt * dt;   // exact ballistic step
      this.vy -= gEff * dt;
      this.air += dt; this.stats.airTime += dt;
      this.airMax = Math.max(this.airMax, this.y - s.y);
      if (this.y <= s.y) {
        // just off a lip the two curves can touch by a hair: skim, don't land
        if (this.air < 0.12 && this.y > s.y - 0.06) this.y = s.y + 1e-4;
        else this._land(s);
      }
    }

    // after the last note: ease off and glide in to the place the song ends
    if (this.t > c.duration + 0.2 && this.grounded) {
      const vt = Math.max(8, this.v - 26 * dt);
      this.E = 0.5 * (vt * vt + s.vy * s.vy) + G * s.y;
    }
    // drag, then horizontal speed from what energy is left
    if (this.grounded) {
      const vNow = this._vFrom(this.E, s.y, s.vy);
      this.E -= DRAG * vNow * vNow * vNow * dt;
      if (wiping) { this.wipe -= dt; this.E -= 30 * vNow * dt; }
      // the floor: if you've bled below it, the song gives you the difference back
      const Emin = 0.5 * (V_MIN * V_MIN + s.vy * s.vy) + G * s.y;
      if (this.E < Emin) this.E = Emin;
      this.v = this._vFrom(this.E, s.y, s.vy);
    } else {
      // in the air horizontal speed is constant apart from drag
      this.v = Math.max(V_MIN, this.v - DRAG * this.v * this.v * dt);
      if (wiping) this.wipe -= dt;
      this.E = 0.5 * (this.v * this.v + this.vy * this.vy) + G * this.y;
    }

    // steering: a quick critically-damped spring toward where you point
    const w = s.width - 1.0;
    const target = clamp(input.steer, -1, 1) * w;
    const om = this.grounded ? 10 : 7.5;
    const ax = om * om * (target - this.x) - 2 * om * this.vx;
    this.vx += ax * dt; this.x += this.vx * dt;
    if (Math.abs(this.x) > w) { this.x = clamp(this.x, -w, w); this.vx *= -0.2; }
    this.lean += ((this.vx / 14) - this.lean) * Math.min(1, dt * 8);

    this.compress *= Math.exp(-dt * 7);

    // world position: integrate the horizontal path
    const dist = this.v * dt;
    this.xz.x += Math.sin(s.yaw) * dist;
    this.xz.z += Math.cos(s.yaw) * dist;
    this.stats.dist += dist;
    this.stats.top = Math.max(this.stats.top, this.v);
    this.vAvg += (this.v - this.vAvg) * (1 - Math.exp(-dt / 2.5));

    this.lastVy = s.vy;
    this.t += dt;
    this._notes();
  }

  _valley() {
    const descFrac = this.desc > 0 ? this.descP / this.desc : 0;
    const q = clamp(descFrac * (1 - this.prevAscFrac * 0.9), 0, 1);
    const sinceRelease = this.press ? -1 : this.t - this.releaseT;
    const onBeat = !this.press && sinceRelease >= 0 && sinceRelease < 0.11 ? 1 : (this.press ? 0.35 : 0);
    this.flow = clamp(this.flow * 0.66 + q * 0.34, 0, 1);
    this.stats.valleys++; if (q > 0.6) this.stats.good++; if (q > 0.85 && onBeat === 1) this.stats.perfect++;
    this.stats.flowSum += this.flow; this.stats.flowN++;
    this.compress = 1;
    this.events.push({ type: 'valley', q, onBeat, t: this.t });
    this.desc = 0; this.descP = 0;
  }

  _land(s) {
    // split your velocity into along-the-slope and square-on parts
    const v = this.v, vyR = this.vy;
    const phi = Math.atan2(s.vy, v);
    const cp = Math.cos(phi), sp = Math.sin(phi);
    const ut = v * cp + vyR * sp;          // along the slope: kept
    const un = -v * sp + vyR * cp;         // square-on (negative = into the ground): absorbed
    const impact = Math.max(0, -un);
    const free = s.vy < -0.6 ? LAND_FREE_DOWN : LAND_FREE;
    let vAlong = Math.max(0, ut);
    let quality = 0, hard = 0;
    if (impact > CRASH) {
      this.wipe = 0.9; this.flow *= 0.4; hard = 1;
      vAlong *= 0.5;
      this.stats.crashes++;
      this.events.push({ type: 'crash', t: this.t });
    } else if (impact > free) {
      const ex = impact - free;
      vAlong = Math.sqrt(Math.max(0, vAlong * vAlong - IMPACT * ex * ex));
      hard = clamp(ex / (CRASH - free), 0.08, 1);
      this.flow *= 1 - 0.35 * hard;
      this.stats.hard++;
    } else if (s.vy < -1.0 && this.air > 0.2) {
      // touched down on a downslope, matched: a clean skip
      quality = 1 - impact / free * 0.6;
      vAlong += 1.2 * quality;
      this.flow = clamp(this.flow + 0.1 * quality, 0, 1);
      this.stats.clean++;
    }
    this.grounded = true;
    this.y = s.y; this.vy = s.vy;
    // a hop skips the crest, so close the books on the ascent here
    if (s.vy < 0) { this.prevAscFrac = this.asc > 0.1 ? this.ascP / this.asc : 0; this.asc = 0; this.ascP = 0; }
    // back onto the ground: horizontal speed from the along-slope speed
    const vh = Math.max(V_MIN, vAlong * cp);
    this.v = vh;
    this.E = 0.5 * (vh * vh + s.vy * s.vy) + G * s.y;
    this.compress = clamp(0.5 + hard + impact / 20, 0, 1);
    this.events.push({ type: 'land', quality, hard, impact, air: this.air, t: this.t });
  }

  _notes() {
    const notes = this.course.notes;
    while (this._noteIdx < notes.length && notes[this._noteIdx].t < this.t - 0.05) {
      const n = notes[this._noteIdx++];
      this.stats.notesTotal++;
      const over = this.y - this.course.sample(n.t, this.s2).y;
      if (!n.got && Math.abs(this.x - n.x) < 1.7 && over < 4.2 && this.wipe <= 0) {
        n.got = true; n.gotT = this.t; this.stats.notes++;
        this.events.push({ type: 'note', degree: n.degree, bar: n.bar, note: n });
      }
    }
  }
}

// The autopilot (P in game; also what the simulator calls "perfect"): presses
// going down, lets go going up, and in the air dives only when floating on
// would bring it down on a rising slope.
export function autoPress(r, c) {
  const s = c.sample(r.t + 0.02);
  if (r.grounded) return s.vy < -0.3;
  if (c.sample(r.t).vy > 0.5) return false;           // never dive over the rising side
  const land = (dive) => {
    let y = r.y, vy = r.vy, t = r.t;
    const g = (dive ? K_DIVE : 1) * G, dt = 1 / 120;
    for (let i = 0; i < 360; i++) {
      t += dt; y += vy * dt - 0.5 * g * dt * dt; vy -= g * dt;
      const ss = c.sample(t);
      if (y <= ss.y) {
        const phi = Math.atan2(ss.vy, r.v);
        const un = -r.v * Math.sin(phi) + vy * Math.cos(phi);
        return { impact: Math.max(0, -un), down: ss.vy < -1 };
      }
    }
    return { impact: 99, down: false };
  };
  const a = land(false);
  if (a.down && a.impact < LAND_FREE_DOWN * 0.45) return false;
  const b = land(true);
  return b.impact < a.impact;
}
