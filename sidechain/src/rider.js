// The rider. Height is the song's (course.js); speed is yours.
// Holding the button makes you heavy: heavy going down = faster, heavy going up
// = slower. So the only way to gain is to press into each dip and let go up the
// other side, which is the same thing as moving in time with the bar.
//
// Energy is kept like a rollercoaster: E = 1/2 speed^2 + G * height. Gravity
// alone never changes it. Pressing adds to it on the way down and takes more
// away on the way up. A landing loses only the part of your speed that hits the
// slope square-on, so a clean touchdown on a downslope keeps everything you fell.
//
// Tricks, rails and gaps live here too, so the simulator rides them exactly as the
// game does: a run of pumps in time turns a long flight into a trick; a rail you're
// close to takes you and runs you along it to its end, where you pop off; at a gap
// the road ends at the lip and everyone flies, and over the hole nobody can dive.

import { G } from './course.js';
import { Score, MULT_STEP, MULT_MAX } from './score.js';

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
const RAIL_SNAP = 1.0;         // metres either side of a rail that it takes you
const RAIL_LEAVE = 2.4;        // steer this far off it and you hop off
const RAIL_POP = 4.6;          // m/s up off a rail you steer off
const RAIL_POP_END = 8.2;      // ... and off its end, on the beat: enough air for a trick
// letting go at the bottom of a dip, seconds either side of it (the bottom is on the beat).
// (27 Oct 2026, Alex: "widen the time window a bit for perfect and good to make things more fun";
// they were 0.085 and 0.16)
export const WIN_PERFECT = 0.11;
export const WIN_GOOD = 0.2;
// Groovy (27 Oct 2026, Alex): at x4 a button sends the run Groovy until the bar line nearest ten
// seconds on. The multiplier doubles until a pump is missed; the trip (the screen, the pickups
// flying to her) lasts the whole time either way. Ready again eight more in a row after it ends.
export const GROOVY_AT = MULT_STEP * (MULT_MAX - 1);
export const GROOVY_SECS = 10;
export const GROOVY_PULL = 0.9;   // seconds ahead that a pickup is pulled in from

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class Rider {
  constructor(course) {
    this.course = course;
    this.s = {}; this.s2 = {};
    this.score = new Score();
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
    this.stopping = false; this.stopV0 = 0; this.stopVel = 0;   // the stop at the end of a song
    this.lastVy = s.vy;
    this.stats = { valleys: 0, good: 0, perfect: 0, clean: 0, hard: 0, crashes: 0, notes: 0, notesTotal: 0, top: v, dist: 0, airTime: 0, flowSum: 0, flowN: 0,
      judged: 0, hits: 0, perfects: 0, goods: 0, bestStreak: 0, tricks: 0, grinds: 0, gaps: 0 };
    this.streak = 0; this.pend = null;
    this.trick = null; this.trickN = 0;
    this.rail = null; this.railBeat = -1; this.railK = 0; this.railTricks = 0;
    this.gapOn = null;
    this.groovyOn = false; this.groovyX2 = false; this.groovyT0 = -1; this.groovyEnd = -1; this.groovyArm = GROOVY_AT; this.groovies = 0;
    this._noteIdx = 0; this._magIdx = 0;
    while (this._noteIdx < this.course.notes.length && this.course.notes[this._noteIdx].t < t) this._noteIdx++;
    for (const n of this.course.notes) { n.got = false; n.gotT = undefined; n.mag = false; n.magT = undefined; }
    this.score.reset();
  }

  _emit(e) { e.points = this.score.event(e, this); this.events.push(e); }

  get groovyReady() { return !this.groovyOn && !this.stopping && this.wipe <= 0 && this.streak >= this.groovyArm; }
  // the button: at x4, go Groovy (until the bar line nearest ten seconds on, never under eight)
  goGroovy() {
    if (!this.groovyReady) return false;
    const c = this.course, t = this.t, ph = c.barPhase || 0;
    const k = Math.round((c.beatAt(t + GROOVY_SECS) - ph) / 4) * 4 + ph;
    let end = c.timeOfBeat(k);
    if (end < t + 8) end = c.timeOfBeat(k + 4);
    this.groovyOn = true; this.groovyX2 = true; this.groovyT0 = t; this.groovyEnd = end; this.groovies++;
    this._emit({ type: 'groovy', t, end });
    return true;
  }
  _groovyOff() {
    // (the run unbroken: eight more in a row; broken on the way, x4 has to be won again)
    this.groovyArm = this.groovyX2 ? this.streak + MULT_STEP : GROOVY_AT;
    this.groovyOn = false; this.groovyX2 = false;
    this._emit({ type: 'groovyEnd', t: this.t });
  }

  // advance physics to song time tEnd
  advance(tEnd, input) {
    if (input.groovy) this.goGroovy();
    let guard = 0;
    while (this.t < tEnd && guard++ < 240) {
      const dt = Math.min(STEP, tEnd - this.t);
      this._step(dt, input);
    }
    if (this.t < tEnd) this.t = tEnd;   // fell far behind: skip ahead
  }

  // horizontal speed from energy, given where you are and how fast you're moving vertically
  _vFrom(E, y, vy) { return Math.sqrt(Math.max(V_MIN * V_MIN, 2 * (E - G * y) - vy * vy)); }

  // how long she'll be in the air from here (diving, or not)
  airTimeAhead(dive = false) {
    const c = this.course;
    let y = this.y, vy = this.vy, t = this.t;
    const dt = 1 / 120, g = (dive ? K_DIVE : 1) * G;
    for (let i = 0; i < 480; i++) {
      t += dt; y += vy * dt - 0.5 * g * dt * dt; vy -= g * dt;
      if (y <= c.sample(t, this.s2).y && i > 2) return t - this.t;
    }
    return 4;
  }

  // off the ground: on a run of pumps in time, a long flight gets a trick
  _takeoff(vy, why) {
    this.grounded = false;
    this.air = 0; this.airMax = 0;
    this.vy = vy;
    let trick = null;
    if (why === 'pop' && !this.stopping && this.wipe <= 0) {
      // popped off the end of a rail: always something, bigger on a run
      const T = this.airTimeAhead();
      this.trickN++;
      const kind = this.streak >= 8 ? (this.trickN % 2 ? 'flip' : 'roll') : 'spin';
      trick = { kind, turns: kind === 'spin' && T > 0.9 ? 2 : 1, combo: false, dur: Math.max(0.32, T * 0.8) };
    } else if (this.streak >= 3 && !this.stopping && this.wipe <= 0) {
      const T = this.airTimeAhead();
      if (T > 0.5) {
        const big = this.streak >= 16;
        const list = T > 1.6 ? (big ? [['flip', 1], ['spin', 2], ['roll', 1], ['flip', 1, true]] : [['flip', 1], ['spin', 2], ['roll', 1]])
          : T > 1.3 ? [['flip', 1], ['spin', 2], ['roll', 1]]
          : T > 0.85 ? (big ? [['spin', 1, true], ['roll', 1], ['grab', 1]] : [['spin', 1], ['roll', 1], ['grab', 1]])
          : [['grab', 1], ['spin', 1]];
        this.trickN++;
        const [kind, turns, combo] = list[this.trickN % list.length];
        trick = { kind, turns, combo: !!combo, dur: Math.max(0.32, T * (kind === 'grab' ? 0.9 : 0.78)) };
      }
    }
    this.trick = trick;
    this._emit({ type: 'takeoff', t: this.t, vy: this.vy, trick, why });
  }

  _step(dt, input) {
    const c = this.course, s = c.sample(this.t + dt, this.s);
    if (this.groovyOn && (this.t >= this.groovyEnd || this.stopping)) this._groovyOff();
    if (this.stopping) {
      // the song is over: board across, edge in, she brakes to a stop. Song time slows
      // with her (main.js), and the road ahead stays laid out at the speed she had, so
      // here a song second is still stopV0 metres; her own speed is stopVel.
      this.y = s.y; this.vy = s.vy; this.grounded = true; this.press = false; this.air = 0;
      if (this.rail) { this.rail = null; }
      this.vx *= Math.exp(-dt * 6); this.x += this.vx * dt;
      const dist = this.stopV0 * dt;
      this.xz.x += Math.sin(s.yaw) * dist; this.xz.z += Math.cos(s.yaw) * dist;
      this.v = this.stopVel;
      this.lastVy = s.vy;
      this.t += dt;
      return;
    }
    const wiping = this.wipe > 0;
    const wantPress = !wiping && input.press;
    if (wantPress !== this.press) {
      this.press = wantPress;
      // the input's own timestamp when we have it, so judging isn't a frame late
      if (wantPress) this.pressT = Math.min(this.t, input.pressAt ?? this.t);
      else {
        this.releaseT = Math.min(this.t, input.releaseAt ?? this.t);
        if (this.pend) this._judge(this.releaseT - this.pend.t);
      }
    }
    // still holding well past the bottom: that one's late
    if (this.pend && this.t - this.pend.t > WIN_GOOD) this._judge(this.t - this.pend.t);

    // a gap: the road ends at the lip and you fly, whatever you're doing; over the hole there's no diving
    const gap = c.gapAt(this.t + dt);
    if (this.grounded) {
      const lip = c.lipBetween(this.t, this.t + dt);
      const kHold = this.press ? K_PRESS : 1;
      // (a rail holds you through a sharp crest: you grind over it, you don't fly off it)
      if (lip || gap || (!this.rail && s.ay < -kHold * G - 0.12)) {
        // the ground falls away faster than you can follow it: you're flying.
        // (a launch's surface falls just faster than gravity, so letting go at the
        // lip flies you; holding keeps you on it, pumping the drop)
        if (this.rail) this._railOff(false);
        if (lip) this.gapOn = lip;
        this.y = c.sample(this.t, this.s2).y;
        this._takeoff(this.lastVy, lip ? 'gap' : 'lip');
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
        // (judged only at a gate, the bottom of a dip with a hold zone into it, so what's judged is
        // what the road shows: a launch's landing with no zone on it, or a flat moment partway down a
        // zone, was judged as a dip, and holding on to the gate as shown came out LATE)
        if (vyPrev < -0.35 && s.vy >= -0.35 && this.desc > 0.12 && Math.abs(c.gateDist(this.t + dt)) < 0.2) this._valley();
        if (vyPrev > 0.35 && s.vy <= 0.35) { this.prevAscFrac = this.asc > 0.1 ? this.ascP / this.asc : this.prevAscFrac; this.asc = 0; this.ascP = 0; }
        this.compress = Math.max(this.compress, clamp(s.ay / 40, 0, 1) * (this.press ? 1 : 0.6));
      }
    }

    if (!this.grounded) {
      const gEff = (this.press && !gap ? K_DIVE : 1) * G;
      this.y += this.vy * dt - 0.5 * gEff * dt * dt;   // exact ballistic step
      this.vy -= gEff * dt;
      this.air += dt; this.stats.airTime += dt;
      this.airMax = Math.max(this.airMax, this.y - s.y);
      if (this.y <= s.y) {
        // just off a lip the two curves can touch by a hair: skim, don't land; and nobody lands in a hole
        if ((this.air < 0.12 && this.y > s.y - 0.06) || gap) { this.y = s.y + 1e-4; if (gap) this.vy = Math.max(this.vy, s.vy); }
        else this._land(s);
      }
    }

    // rails: on one, it holds you; near one on the ribbon, it takes you
    this._rails(dt, input, s);

    // after the last note: ease off and glide in to the place the song ends
    if (this.t > c.duration + 0.2 && this.grounded) {
      const vt = Math.max(8, this.v - 26 * dt);
      this.E = 0.5 * (vt * vt + s.vy * s.vy) + G * s.y;
    }
    // drag, then horizontal speed from what energy is left (a rail has none)
    if (this.grounded) {
      const vNow = this._vFrom(this.E, s.y, s.vy);
      if (!this.rail) this.E -= DRAG * vNow * vNow * vNow * dt;
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

    // steering: a quick critically-damped spring toward where you point (on a rail, toward the rail)
    const w = s.width - 1.0;
    const target = this.rail ? this.rail.x : clamp(input.steer, -1, 1) * w;
    const om = this.rail ? 22 : this.grounded ? 13 : 9;
    const ax = om * om * (target - this.x) - 2 * om * this.vx;
    this.vx += ax * dt; this.x += this.vx * dt;
    if (Math.abs(this.x) > w) { this.x = clamp(this.x, -w, w); this.vx *= -0.2; }
    this.lean += ((this.vx / 14) - this.lean) * Math.min(1, dt * 8);

    this.compress *= Math.exp(-dt * 7);
    this.railK += ((this.rail ? 1 : 0) - this.railK) * Math.min(1, dt * 16);

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

  _rails(dt, input, s) {
    const c = this.course;
    if (this.rail) {
      const r = this.rail;
      // a beat on the rail: sparks and a few points
      const bi = Math.floor(c.beatAt(this.t + dt) + 0.02);
      if (bi > this.railBeat) { this.railBeat = bi; this._emit({ type: 'grind', t: this.t, beat: bi }); }
      const want = clamp(input.steer, -1, 1) * (s.width - 1.0);
      if (this.t + dt >= r.t1) this._railOff(true, s);
      else if (Math.abs(want - r.x) > RAIL_LEAVE || this.wipe > 0) this._railOff(false, s);
      return;
    }
    if (!this.grounded || this.wipe > 0 || !c.rails.length) return;
    for (const r of c.rails) {
      if (this.t < r.t0 - 0.06 || this.t > r.t1 - 0.35) continue;
      if (Math.abs(this.x - r.x) > RAIL_SNAP) continue;
      this.rail = r; this.railBeat = Math.floor(c.beatAt(this.t) + 0.02);
      this._emit({ type: 'grindStart', t: this.t, rail: r });
      break;
    }
  }

  // off the end of the rail (on the beat: a pop, high enough for a trick), or steered off it (a hop)
  _railOff(end, s) {
    const r = this.rail; this.rail = null;
    this.stats.grinds++;
    this._emit({ type: 'grindEnd', t: this.t, rail: r, onBeat: end });
    if (s && this.grounded) {
      this.y = s.y;
      this._takeoff(end ? this._popVy(s) : Math.max(0, s.vy) + RAIL_POP * 0.6, end ? 'pop' : 'rail');
    }
  }
  // the pop off a rail's end is aimed: over the next crest, down onto the slope after it a third of
  // the way down, so the trick lands clean and she's straight into the next pump. (A rail ends on a
  // beat, usually at the bottom of a dip: a fixed pop came down on the rise and bailed.)
  _popVy(s) {
    const c = this.course, t = this.t;
    let crest = null;
    for (const ct of c.crests) if (ct > t + 0.15) { crest = ct; break; }
    if (crest !== null) {
      let val = null;
      for (const vt of c.valleys) if (vt > crest + 0.05) { val = vt; break; }
      if (val !== null) {
        const tL = crest + 0.33 * (val - crest), T = tL - t;
        if (T > 0.45 && T < 1.7 && !c.gapAt(tL)) {
          const vy = (c.sample(tL, this.s2).y - this.y) / T + 0.5 * G * T;
          if (vy > 5 && vy < 16) return vy;
        }
      }
    }
    return Math.max(0, s.vy) + RAIL_POP_END;
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
    // judge the pump when you let go: already let go, or wait a moment for it
    this.pend = { t: this.t, q };
    if (!this.press) this._judge(this.releaseT - this.t);
  }

  // one pump, graded on how much of the way down you held and when you let go
  _judge(err) {
    const q = this.pend.q, at = this.pend.t; this.pend = null;
    const ae = Math.abs(err);
    let grade;
    if (q < 0.3) grade = 'miss';
    else if (ae <= WIN_PERFECT && q >= 0.62) grade = 'perfect';
    else if (ae <= WIN_GOOD && q >= 0.4) grade = 'good';
    else grade = err < 0 ? 'early' : 'late';
    const st = this.stats;
    const lost = this.streak;
    if (grade === 'perfect' || grade === 'good') {
      this.streak++; st.hits++; st.judged++;
      if (grade === 'perfect') st.perfects++; else st.goods++;
      st.bestStreak = Math.max(st.bestStreak, this.streak);
      // on a rail, letting go on the beat flicks the board round under her on it
      if (this.rail) { this.railTricks = (this.railTricks || 0) + 1; this._emit({ type: 'railTrick', t: this.t, grade, kind: this.railTricks % 2 ? 'kickflip' : 'shuvit' }); }
      // a clean hit kicks you on a little
      if (this.grounded) {
        const v = this.v, k = Math.max(0, 1 - v / 95);
        this.E += (grade === 'perfect' ? 0.011 : 0.004) * k * v * v;
      }
    } else if (grade !== 'miss' || this.streak > 0) {
      st.judged++; this.streak = 0;
      // a broken run: Groovy's doubling is gone (the trip plays on), and x4 has to be won again
      this.groovyArm = GROOVY_AT;
      if (this.groovyX2) { this.groovyX2 = false; this._emit({ type: 'groovyBreak', t: this.t }); }
    }
    this._emit({ type: 'judge', grade, err, q, streak: this.streak, lost, t: this.t, at });
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
    const air = this.air;
    this._emit({ type: 'land', quality, hard, impact, air, t: this.t });
    // the trick she was doing (diving only makes her finish it quicker): landed if the landing was clean
    if (this.trick) {
      const tr = this.trick; this.trick = null;
      const landed = hard <= 0.05;
      if (landed) this.stats.tricks++;
      this._emit({ type: 'trick', kind: tr.kind, turns: tr.turns, combo: tr.combo, landed, air, t: this.t });
    }
    if (this.gapOn) { this.gapOn = null; this.stats.gaps++; this._emit({ type: 'gap', t: this.t, clean: hard <= 0.05 }); }
  }

  // a pickup is decided as she reaches it, so its sound can land on its own beat
  _notes() {
    const notes = this.course.notes;
    // Groovy: the ones coming up are pulled in to her, wherever they are. Each is claimed as it comes
    // within reach, so one already on its way still arrives when the trip ends
    if (this.groovyOn && this.wipe <= 0) {
      let i = Math.max(this._magIdx, this._noteIdx);
      for (; i < notes.length && notes[i].t < this.t + GROOVY_PULL; i++) { const n = notes[i]; if (!n.got && !n.mag) { n.mag = true; n.magT = this.t; } }
      this._magIdx = i;
    }
    while (this._noteIdx < notes.length && notes[this._noteIdx].t < this.t + 0.02) {
      const n = notes[this._noteIdx++];
      this.stats.notesTotal++;
      const over = this.y - this.course.sample(n.t, this.s2).y;
      if (!n.got && (n.mag || (Math.abs(this.x - n.x) < 1.7 && over < 4.2)) && this.wipe <= 0) {
        n.got = true; n.gotT = n.t; this.stats.notes++;
        this._emit({ type: 'note', degree: n.degree, bar: n.bar, note: n, at: n.t });
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
  if (c.gapAt(r.t)) return false;
  if (c.sample(r.t).vy > 0.5) return false;           // never dive over the rising side
  const land = (dive) => {
    let y = r.y, vy = r.vy, t = r.t;
    const g = (dive ? K_DIVE : 1) * G, dt = 1 / 120;
    for (let i = 0; i < 360; i++) {
      t += dt; y += vy * dt - 0.5 * g * dt * dt; vy -= g * dt;
      const ss = c.sample(t);
      if (y <= ss.y && !c.gapAt(t)) {
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

// where the autopilot steers: onto a rail coming up, else to the next pickup
export function autoSteer(r, c) {
  const s = c.sample(r.t + 0.03);
  const w = Math.max(1, s.width - 1.0);
  if (r.rail) return clamp(r.rail.x / w, -1, 1);
  for (const rl of c.rails) if (rl.t0 > r.t - 0.3 && rl.t0 < r.t + 1.6 && rl.t1 > r.t + 0.5) return clamp(rl.x / w, -1, 1);
  for (const n of c.notes) if (n.t > r.t + 0.02 && !n.got) return clamp(n.x / w, -1, 1);
  return 0;
}

// What the autopilot scores on this course: the bar the grades are measured against.
// The same ride the simulator calls "perfect" (tools/sim.mjs), so the game and the tools agree.
export function parScore(course) {
  const r = new Rider(course);
  r.reset(0, 22);
  const DT = 1 / 60;
  for (let t = 0; t < course.duration; t += DT) {
    r.advance(t + DT, { press: autoPress(r, course), steer: autoSteer(r, course), groovy: autoGroovy(r) });
    r.events.length = 0;
  }
  const p = r.score.points;
  for (const n of course.notes) { n.got = false; n.gotT = undefined; n.mag = false; n.magT = undefined; }
  return p;
}

// the autopilot goes Groovy the moment it can
export function autoGroovy(r) { return r.groovyReady; }
