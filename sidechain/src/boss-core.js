// A boss stage's rules. Pure (no three.js, no DOM), so the simulator and the par score ride a
// boss stage exactly as the game does; boss.js draws it and plays it.
//
// The rival rides the same course as you, a little ahead in song time: her lead, in seconds of
// song (metres = lead x your speed). She pumps every dip in time, so up the road she shows you
// the rhythm. What she does is the stage's script, bar by bar: chase (the better you ride, the
// nearer she is), ahead (far enough to throw things back at you), beside (close enough to tag),
// race (side on: your pumps decide who's in front), duel (face to face), flee (gone).
//
// A tag: a ring closes on her on the crest of a hill. Press as it closes (which is also the start
// of the pump down that hill) and your board meets hers on the next downbeat. The duel: she plays
// a bar, you answer it. The pin: press on "pin", hold through the quiet, let go on the drop. The
// kiss: the last tag, on the song's last big hit. Everything she throws lands on the snare, and
// you pass it two beats later: steer round it.

import { Rider, autoPress, autoSteer } from './rider.js';
import { RATE } from './course.js';

export const TAG_PERFECT = 0.11, TAG_GOOD = 0.2;   // a press either side of the moment (a pump's release has the same)
const EARLY_FAIL = 0.42;          // a press this close before a tag's moment (and outside its window) spends it
const SHOW = 2.4;                 // seconds before a tag that its ring starts closing
const RIDER_W = 0.45;             // half her board's width, for hazards
const CLOSE = 0.75;               // metres of clearance that still count as close

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// the rival: never takes your pickups, scores nothing
class Rival extends Rider {
  _notes() {}
  _emit(e) { this.events.push(e); }
}

// a time in the song by bar and beat (beat 1..4, fractions for the eighths between)
export function barTime(course, bar, beat = 1) {
  return course.timeOfBeat(course.beatOffset + (course.chart.downbeat || 0) + 4 * bar + (beat - 1));
}

export class BossCore {
  constructor(course, script) {
    this.c = course; this.s = script;
    const B = (bar, beat = 1) => barTime(course, bar, beat);
    const at = (v) => (Array.isArray(v) ? B(v[0], v[1] ?? 1) : B(v, 1));
    this.B = B;
    // what she does, from bar to bar
    this.moves = (script.moves || []).map((m) => ({ ...m, t: at(m.bar) })).sort((a, b) => a.t - b.t);
    // tags: on a crest (the nearest to beat 3 of the bar), or at a set beat in the air; the boards
    // meet on the next gate (the bottom of that hill), or for one in the air where she lands
    const nextGate = (t) => { for (const g of course.gates) if (g > t + 0.12) return g; return t + 0.7; };
    const nearestCrest = (t) => { let best = t, d = 1e9; for (const c of course.crests) { const e = Math.abs(c - t); if (e < d) { d = e; best = c; } } return d < 0.45 ? best : t; };
    this.tags = (script.tags || []).map((q, i) => {
      const t = q.air ? B(q.bar, q.beat ?? 3) : nearestCrest(B(q.bar, q.beat ?? 3));
      const contact = q.contact ? at(q.contact) : nextGate(t);
      return { i, t, contact, air: !!q.air, kiss: !!q.kiss, side: q.side ?? 0, done: false, grade: null, pressed: null, met: false };
    }).sort((a, b) => a.t - b.t);
    // hazards: each passes you at `pass`; what's thrown or rolled lands two beats before that and
    // left her hand two beats before that (so a throw, a landing and the pass are all on the snare)
    this.hazards = (script.hazards || []).map((h, i) => {
      const tp = at(h.pass);
      const ib = course.beatAt(tp);
      const tl = h.kind === 'car' || h.kind === 'barrier' ? tp : course.timeOfBeat(ib - (h.land ?? 2));
      const t0 = h.kind === 'car' ? tp - 4.5 : h.kind === 'barrier' ? tp - 12 : course.timeOfBeat(ib - (h.land ?? 2) - (h.fly ?? 2));
      const w = h.w ?? ({ bottle: 1.05, rock: 1.25, car: 1.2, barrier: 1.15, cop: 1.25 }[h.kind] ?? 1.1);
      return { i, kind: h.kind, tp, tl, t0, x: h.x ?? 0, aim: h.aim ?? 0, homing: !!h.homing, w, side: h.side ?? -1, armed: false, landed: false, done: false, hit: false, close: false };
    }).sort((a, b) => a.tp - b.tp);
    // the duel: rounds of a bar she plays and a bar you answer, on the same beats
    this.duel = (script.duel || []).map((r) => ({
      callBar: r.call, answerBar: r.answer,
      call: r.beats.map((b) => B(r.call, b)),
      answer: r.beats.map((b) => ({ t: B(r.answer, b), done: false, grade: null })),
      from: B(r.answer, 1) - TAG_GOOD - 0.05, to: B(r.answer + 1, 1) - 0.1,
      ok: 0, done: false,
    }));
    this.duelSpan = this.duel.length ? [B(this.duel[0].callBar, 1) - 0.4, B(this.duel[this.duel.length - 1].answerBar + 1, 1)] : null;
    // the pin: press on it, hold, let go on the drop. The road shows it the way it shows every hold:
    // the hold colour from the press to the drop, and the line to let go on there (made here, before
    // the road is: track.js reads the zones and the gates once a song)
    const pn = script.pin;
    this.pin = pn ? { tp: at(pn.press), tr: at(pn.release), pressed: false, pressGrade: null, done: false, grade: null, fail: null } : null;
    if (this.pin && !course._pinZone) {
      course._pinZone = true;
      const i0 = Math.ceil((this.pin.tp - course.t0) * RATE), i1 = Math.floor((this.pin.tr - course.t0) * RATE);
      for (let i = i0; i <= i1; i++) course.hold[i] = (i - i0) / Math.max(1, i1 - i0);
      course.crests.push(this.pin.tp); course.crests.sort((a, b) => a - b);
      course.gates.push(this.pin.tr); course.gates.sort((a, b) => a - b);
    }
    // the side-on race
    this.race = script.race ? { from: B(script.race.from), to: B(script.race.to), lead: script.race.start ?? 0.04, won: null } : null;
    this.cams = (script.cams || []).map((c) => ({ ...c, from: at(c.from), to: at(c.to) }));
    // her: a heart in pieces, one for every tag, duel round and the pin
    this.parts = this.tags.length + this.duel.length + (this.pin ? 1 : 0);
    this.taken = 0;
    // pickups don't sit where something lands or where the stage holds you still
    this._clearPickups();
    this.rival = new Rival(course);
    this.reset(course.t0 + 0.5);
  }

  // where nothing should be picked up: a hazard's pass, the race and the duel
  _clearPickups() {
    const c = this.c, keep = [];
    for (const n of c.notes) {
      let drop = false;
      for (const h of this.hazards) if (Math.abs(n.t - h.tp) < 0.3 && (h.homing || Math.abs(n.x - h.x) < h.w + 1.6)) { drop = true; break; }
      if (this.race && n.t > this.race.from - 0.2 && n.t < this.race.to) drop = true;
      if (this.duelSpan && n.t > this.duelSpan[0] && n.t < this.duelSpan[1]) drop = true;
      // (nor where the camera's off to one side: one could hang between it and you)
      for (const cm of this.cams) if (n.t > cm.from - 0.3 && n.t < cm.to + 0.5) drop = true;
      if (!drop) keep.push(n);
    }
    c.notes = keep;
  }

  reset(t) {
    const r = this.rival;
    r.reset(t, 22);
    this.lead = 0; this.leadV = 0; this.side = -1;
    this.events = [];
    this._downId = undefined; this._upId = undefined; this._was = false; this._lastT = t;
    this.stopping = false; this.gone = 0; this.taken = 0; this.fled = false;
    // a ride from partway in (?t=): what's behind the start is over and done with, quietly
    for (const q of this.tags) { const past = q.t + TAG_GOOD < t; q.done = past; q.grade = past ? 'skip' : null; q.met = past; q.pressed = null; }
    for (const h of this.hazards) { const past = h.tp < t; h.done = past; h.armed = past || h.t0 <= t && !h.homing; h.landed = h.tl <= t; h.hit = false; h.close = false; delete h._from; }
    for (const d of this.duel) { for (const n of d.answer) { n.done = n.t + TAG_GOOD < t; n.grade = n.done ? 'skip' : null; } d.ok = 0; d.done = d.answer.every((n) => n.done); }
    if (this.pin) { const p = this.pin, past = p.tr < t; Object.assign(p, { pressed: false, pressGrade: null, done: past || p.tp + TAG_GOOD < t, grade: past ? 'skip' : null, fail: null }); }
    if (this.race) { this.race.lead = this.s.race.start ?? 0.04; this.race.won = this.race.to < t ? false : null; }
  }

  // the move she's on at song time t
  moveAt(t) { let m = this.moves[0]; for (const x of this.moves) { if (x.t <= t) m = x; else break; } return m || { mode: 'chase', lead: 1.2 }; }
  camAt(t) { for (const c of this.cams) if (t >= c.from && t < c.to) return c; return null; }
  inRace(t) { return !!this.race && t >= this.race.from && t < this.race.to; }
  inDuel(t) { return !!this.duelSpan && t >= this.duelSpan[0] && t < this.duelSpan[1]; }
  holdingPin(t) { const p = this.pin; return !!p && p.pressed && !p.done; }
  // where your board is held across the road (the race and the duel), or null: in the race on the
  // right (the camera's side), in the duel on the left (her on yours)
  lockX(t) { if (this.inRace(t)) return 2.3; if (this.inDuel(t)) return -2.3; return null; }

  // ---------- before the physics: your presses, and what of them reaches the board ----------
  // inp: { press, steer, pressAt, releaseAt, downId, upId } (the autopilot sends only press)
  frame(rider, inp) {
    const t = rider.t;
    // press and release edges, each at its own moment in the song
    const downs = [], ups = [];
    if (inp.downId !== undefined) {
      if (this._downId === undefined) { this._downId = inp.downId; this._upId = inp.upId; }
      if (inp.downId !== this._downId) { this._downId = inp.downId; downs.push(inp.pressAt ?? t); }
      if (inp.upId !== this._upId) { this._upId = inp.upId; ups.push(inp.releaseAt ?? t); }
    } else {
      if (inp.press && !this._was) downs.push(t);
      if (!inp.press && this._was) ups.push(t);
    }
    this._was = !!inp.press;
    // (what your hand is doing, whatever reaches the board: the road and the spray show a hold as held)
    rider.heldIn = !!inp.press;
    // (a tap inside one frame: the press first)
    for (const p of downs) this._press(rider, p);
    for (const r of ups) this._release(rider, r);
    // the duel and the held pin take the button: it isn't the board's then (no scraping uphill
    // while you answer her, no dive)
    const lock = this.lockX(t);
    const out = { ...inp };
    if (this.inDuel(t) || this.holdingPin(t) || (this.pin && !this.pin.pressed && Math.abs(t - this.pin.tp) < 0.3)) out.press = false;
    if (lock !== null) { const w = Math.max(1, this.c.sample(t).width - 1); out.steer = lock / w; }
    return out;
  }

  _press(rider, p) {
    // the duel: the next answer close enough; a press in an answer bar that isn't one spends the next
    for (const r of this.duel) {
      if (p < r.from || p > r.to + TAG_GOOD) continue;
      let best = null, d = 1e9;
      for (const n of r.answer) if (!n.done) { const e = Math.abs(p - n.t); if (e < d) { d = e; best = n; } }
      if (!best) return;
      if (d <= TAG_GOOD) { this._duelNote(rider, r, best, d <= TAG_PERFECT ? 'perfect' : 'good', p - best.t); return; }
      // too far off any: the nearest still to come goes
      const next = r.answer.find((n) => !n.done && n.t > p);
      if (next && next.t - p < 0.5) { next.done = true; next.grade = 'miss'; rider.bossMiss('duel', { note: next, err: p - next.t }); this._ev('duelMiss', { note: next, round: r }); this._duelEnd(rider, r); }
      return;
    }
    // the pin
    const pn = this.pin;
    if (pn && !pn.pressed && !pn.done) {
      const e = p - pn.tp;
      if (Math.abs(e) <= TAG_GOOD) { pn.pressed = true; pn.pressGrade = Math.abs(e) <= TAG_PERFECT ? 'perfect' : 'good'; this._ev('pinPull', { grade: pn.pressGrade, err: e }); return; }
      if (e < -TAG_GOOD && e > -EARLY_FAIL) { this._pinFail(rider, 'early'); return; }
    }
    // a tag (or the kiss)
    for (const q of this.tags) {
      if (q.done) continue;
      const e = p - q.t;
      if (e > TAG_GOOD) continue;
      if (Math.abs(e) <= TAG_GOOD) { this._tag(rider, q, Math.abs(e) <= TAG_PERFECT ? 'perfect' : 'good', e); return; }
      if (e < -TAG_GOOD && e > -EARLY_FAIL) { this._tagMiss(rider, q, 'early', e); return; }
      break;
    }
  }

  _release(rider, r) {
    const pn = this.pin;
    if (!pn || !pn.pressed || pn.done) return;
    const e = r - pn.tr;
    if (Math.abs(e) <= TAG_GOOD) {
      const g = Math.abs(e) <= TAG_PERFECT && pn.pressGrade === 'perfect' ? 'perfect' : 'good';
      pn.done = true; pn.grade = g;
      this.taken++;
      rider.bossHit('pin', g, { err: e });
      this._ev('pin', { grade: g, err: e });
    } else if (e < -TAG_GOOD) this._pinFail(rider, 'early');
  }

  _pinFail(rider, why) {
    const pn = this.pin; pn.done = true; pn.fail = why; pn.grade = 'miss';
    rider.bossMiss('pin', { why });
    this._ev('pinFail', { why });
  }

  _tag(rider, q, grade, err) {
    q.done = true; q.grade = grade; q.pressed = rider.t;
    this.taken++;
    rider.bossHit(q.kiss ? 'kiss' : 'tag', grade, { q, err });
    this._ev(q.kiss ? 'kiss' : 'tag', { q, grade, err });
  }
  _tagMiss(rider, q, why, err = 0) {
    q.done = true; q.grade = 'miss';
    rider.bossMiss(q.kiss ? 'kiss' : 'tag', { q, why, err });
    this._ev(q.kiss ? 'kissMiss' : 'tagMiss', { q, why });
  }

  _duelNote(rider, r, n, grade, err) {
    n.done = true; n.grade = grade;
    r.ok++;
    rider.bossHit('duel', grade, { note: n, err });
    this._ev('duelHit', { note: n, grade, round: r });
    this._duelEnd(rider, r);
  }
  _duelEnd(rider, r) {
    if (r.done || r.answer.some((n) => !n.done)) return;
    r.done = true;
    if (r.ok === r.answer.length) { this.taken++; rider.bossBonus('duelRound', { round: r }); this._ev('duelRound', { round: r }); }
  }

  _ev(type, o = {}) { this.events.push({ type, ...o }); }

  // ---------- after the physics: what you passed, what you missed, and her ----------
  after(rider, dt) {
    const c = this.c, t = rider.t, t0 = this._lastT;
    this._lastT = t;
    // tags and the kiss that went by unpressed; the boards meeting
    for (const q of this.tags) {
      if (!q.done && t > q.t + TAG_GOOD) this._tagMiss(rider, q, 'none');
      if (q.done && q.grade !== 'miss' && !q.met && t >= q.contact) { q.met = true; this._ev('contact', { q }); }
    }
    for (const r of this.duel) for (const n of r.answer) if (!n.done && t > n.t + TAG_GOOD) { n.done = true; n.grade = 'miss'; rider.bossMiss('duel', { note: n }); this._ev('duelMiss', { note: n, round: r }); this._duelEnd(rider, r); }
    const pn = this.pin;
    if (pn && !pn.done) {
      if (!pn.pressed && t > pn.tp + TAG_GOOD) this._pinFail(rider, 'none');
      else if (pn.pressed && t > pn.tr + TAG_GOOD) this._pinFail(rider, 'late');
    }
    // hazards
    for (const h of this.hazards) {
      if (h.done) continue;
      if (!h.armed && t >= h.t0) {
        h.armed = true;
        // a throw goes where you are (and a little to one side, if it says)
        if (h.homing) { const w = c.sample(h.tp).width - 1.2; h.x = clamp(rider.x + h.aim, -w, w); }
        this._ev('arm', { h });
      }
      if (!h.landed && t >= h.tl) { h.landed = true; this._ev('land', { h }); }
      if (t0 < h.tp && t >= h.tp) {
        h.done = true;
        const over = rider.y - c.sample(t).y;
        const gap = Math.abs(rider.x - h.x) - h.w - RIDER_W;
        if (over < 2.2 && gap < 0 && rider.wipe <= 0) {
          h.hit = true;
          rider.stumble(0.55);
          rider.bossMiss('hazard', { h });
          this._ev('hit', { h });
        } else {
          h.close = over < 2.2 && gap < CLOSE;
          rider.bossBonus(h.close ? 'close' : 'dodge', { h });
          this._ev('dodge', { h, close: h.close });
        }
      }
    }
    // the race: who's in front, by how your pumps land
    if (this.race) {
      const rc = this.race;
      if (t >= rc.from && t < rc.to) for (const e of rider.events) if (e.type === 'judge') {
        const d = { perfect: -0.055, good: -0.018, early: 0.05, late: 0.05, miss: e.lost ? 0.08 : 0 }[e.grade] ?? 0;
        rc.lead = clamp(rc.lead + d, -0.24, 0.24);
      }
      if (rc.won === null && t >= rc.to) {
        rc.won = rc.lead < -0.02;
        if (rc.won) rider.bossBonus('race', {});
        this._ev('raceEnd', { won: rc.won });
      }
    }
    this._her(rider, dt);
  }

  // ---------- her ----------
  // how far ahead she wants to be now
  targetLead(rider) {
    const t = rider.t, m = this.moveAt(t);
    if (this.fled) return 5;
    for (const q of this.tags) {
      // the kiss: missed, she's gone up the road without you; landed, she stays
      if (q.kiss && q.done && t >= q.t) return q.grade === 'miss' ? 5 : 0.02;
      // a tag coming: she drops back beside you (from before its ring starts, to just after the boards meet)
      if (t > q.t - SHOW - 0.9 && t < Math.max(q.t, q.contact) + 0.35 && q.grade !== 'miss') return q.air ? 0.0 : 0.045;
      // one you missed: she's off up the road for a bar, laughing
      if (q.grade === 'miss' && t > q.t && t < q.t + 1.6) return 0.9;
    }
    if (this.inRace(t)) return this.race.lead;
    if (this.inDuel(t)) return 0.0;
    switch (m.mode) {
      case 'start': return 0;
      case 'beside': return m.lead ?? 0.04;
      case 'ahead': return m.lead ?? 1.2;
      case 'flee': return 5;
      case 'chase': default: {
        // the better your run, the nearer she is
        const f = clamp((rider.flow - 0.35) / 0.55, 0, 1);
        return (m.lead ?? 1.6) - ((m.lead ?? 1.6) - (m.near ?? 0.6)) * f;
      }
    }
  }

  // where she wants to be across the road (x, metres)
  _herX(rider, tH) {
    const c = this.c, t = rider.t, w = Math.max(1, c.sample(tH).width - 1.3);
    const m = this.moveAt(t);
    let x;
    const lead = this.lead;
    if (this.inRace(t)) x = -2.3;
    else if (this.inDuel(t)) x = 2.3;
    else if (Math.abs(lead) < 0.35 || m.mode === 'beside' || m.mode === 'start') {
      // beside you, on whichever side has room, sticking to it
      const gap = 2.4;
      if (this.side < 0 && rider.x - gap < -w) this.side = 1;
      else if (this.side > 0 && rider.x + gap > w) this.side = -1;
      x = rider.x + this.side * gap;
    } else {
      const s = autoSteer(this.rival, c);
      x = s * Math.max(1, c.sample(this.rival.t + 0.03).width - 1);
    }
    // rails side by side: she takes the one you're not on
    const rails = c.rails.filter((rl) => tH > rl.t0 - 1.1 && tH < rl.t1 - 0.3);
    if (rails.length > 1) { let far = rails[0]; for (const rl of rails) if (Math.abs(rl.x - rider.x) > Math.abs(far.x - rider.x)) far = rl; x = far.x; }
    // and round anything on the road near her (she's never the one hit)
    x = this.clearX(tH - 0.05, x, this.rival.x, w, 1.0, 0.45);
    return clamp(x, -w, w);
  }

  _her(rider, dt) {
    const c = this.c, r = this.rival;
    if (this.stopping) return;
    const want = this.targetLead(rider);
    // a quick spring, never so quick she'd go backwards along the road
    const w = 3.4;
    const acc = w * w * (want - this.lead) - 2 * w * this.leadV;
    this.leadV = clamp(this.leadV + acc * dt, -0.8, 1.6);
    this.lead += this.leadV * dt;
    if (this.moveAt(rider.t).mode === 'flee') this.gone = Math.min(1, this.gone + dt * 0.5);
    const tH = Math.max(r.t, rider.t + this.lead);
    const x = this._herX(rider, tH);
    const wd = Math.max(1, c.sample(tH).width - 1);
    // in the duel she plays her bars on the board (a crouch on each note); otherwise she pumps
    let press = autoPress(r, c);
    if (this.inDuel(rider.t)) { press = false; for (const d of this.duel) for (const ct of d.call) if (tH >= ct - 0.02 && tH < ct + 0.16) press = true; }
    r.advance(tH, { press, steer: x / wd, groovy: false });
    r.events.length = 0;
  }

  // the end of the song: she comes to a stop beside you (if she's still there)
  stopWith(rider) {
    const r = this.rival;
    this.stopping = true;
    r.stopping = true; r.stopV0 = rider.stopV0; r.stopVel = rider.stopVel;
    const tH = Math.max(r.t, rider.t + Math.max(0, this.lead) * 0.2);
    r.advance(tH, { press: false, steer: 0 });
    r.x += ((rider.x + 2.2 * (this.side || 1)) - r.x) * 0.05;
    r.events.length = 0;
  }

  // ---------- the autopilot's hands for the stage ----------
  // presses: the duel's answers, the pin held, a tag in the air; the rest is pumping
  autoPress(r) {
    const t = r.t;
    for (const d of this.duel) for (const n of d.answer) if (t >= n.t - 0.012 && t < n.t + 0.08) return true;
    if (this.inDuel(t)) return false;
    const pn = this.pin;
    if (pn && t >= pn.tp - 0.012 && t < pn.tr - 0.005) return true;
    if (pn && t >= pn.tr - 0.005 && t < pn.tr + 0.25) return false;
    for (const q of this.tags) if (q.air && t >= q.t - 0.012 && t < q.t + 0.08) return true;
    return autoPress(r, this.c);
  }
  // steering: through the next thing coming (the nearest free place to where it wants to be), else
  // at the pickups
  autoSteer(r) {
    const c = this.c, t = r.t;
    const lock = this.lockX(t);
    const w = Math.max(1, c.sample(t + 0.03).width - 1);
    if (lock !== null) return lock / w;
    // (by more than a close call: the bar the grades are measured against isn't set by near misses)
    const x = this.clearX(t, autoSteer(r, c) * w, r.x, w, 1.3, CLOSE + 0.15);
    return clamp(x / w, -1, 1);
  }
  // the nearest place to `want` (from `from`) clear of the next group of hazards passing within
  // `ahead` seconds of t, with `margin` metres to spare
  clearX(t, want, from, w, ahead = 1.3, margin = 0.5) {
    let g = null;
    for (const h of this.hazards) {
      if (h.done || h.tp < t || h.tp > t + ahead || (h.homing && !h.armed)) continue;
      if (g === null) g = h.tp;
      if (h.tp > g + 0.06) break;
    }
    if (g === null) return want;
    const blocked = [];
    for (const h of this.hazards) if (!h.done && Math.abs(h.tp - g) <= 0.06 && (!h.homing || h.armed)) blocked.push([h.x - h.w - RIDER_W - margin, h.x + h.w + RIDER_W + margin]);
    blocked.sort((a, b) => a[0] - b[0]);
    // the free stretches across the road
    const free = []; let lo = -w;
    for (const [a, b] of blocked) { if (a > lo) free.push([lo, a]); lo = Math.max(lo, b); }
    if (lo < w) free.push([lo, w]);
    if (!free.length) return want;
    // the nearest point of the nearest stretch, counting the way from where she is now as well
    let best = want, bd = 1e9;
    for (const [a, b] of free) {
      const mid = (a + b) / 2, half = Math.max(0, (b - a) / 2 - 0.15);
      const x = clamp(want, mid - half, mid + half);
      const d = Math.abs(x - want) + 0.6 * Math.abs(x - from) - 0.3 * Math.min(2, b - a);
      if (d < bd) { bd = d; best = x; }
    }
    return best;
  }
}

// What the autopilot scores on a boss stage: the bar its grades are measured against
export function bossPar(course, script) {
  const r = new Rider(course);
  const core = new BossCore(course, script);
  r.reset(0, 22);
  core.reset(0);
  const DT = 1 / 60;
  for (let t = 0; t < course.duration; t += DT) {
    const inp = core.frame(r, { press: core.autoPress(r), steer: core.autoSteer(r), groovy: r.groovyReady });
    r.advance(t + DT, inp);
    core.after(r, DT);
    r.events.length = 0;
    core.events.length = 0;
  }
  const p = r.score.points;
  for (const n of course.notes) { n.got = false; n.gotT = undefined; n.mag = false; n.magT = undefined; }
  return p;
}
