// Points: what a ride is worth. A plain module (no three.js, no DOM) so the simulator
// scores a ride exactly the way the game does, and the grades come from that.
//
// Everything you do well is worth points, times the multiplier your run of pumps in
// time has built: x1, then x2 at 8 in a row, x3 at 16, x4 at 24. One pump out of time
// and it's back to x1. Groovy (rider.js) doubles whatever it is until a pump is missed.

export const MULT_STEP = 8;
export const MULT_MAX = 4;
export const multOf = (streak) => 1 + Math.min(MULT_MAX - 1, Math.floor(Math.max(0, streak) / MULT_STEP));

export const POINTS = {
  perfect: 100, good: 40,          // a pump, by how it was timed: the heart of it
  note: 20,                        // a pickup
  landing: 20, landingQ: 30,       // a clean landing on a downslope (plus up to landingQ for how clean)
  airPerSec: 30,                   // time in the air, paid on a landing that isn't hard
  grind: 25, grindPop: 100,        // every beat on a rail; popping off its end on the beat
  railTrick: { perfect: 80, good: 35 },   // a pump let go on the beat while grinding: the board flicked round on the rail
  gap: 250,                        // clearing a gap
  trick: { grab: 120, spin: 150, roll: 180, flip: 220 },
};
export const GRADES = ['S', 'A', 'B', 'C', 'D'];
// a grade by the share of what the autopilot (who never misses a pump, and goes Groovy whenever it
// can) scores on the same song. The multiplier makes that share steep (a miss drops the run to x1), so
// the marks sit low: someone pressing down every slope a little late mostly gets an A or a B, and an S
// takes riding in time. (27 Oct 2026: the wider windows kept late riders' runs going, so S and A went
// up from 0.65 and 0.45; a rider with a typical spread, about 30 ms late give or take 70, gets an S on
// 16 of 35 songs, 11 before)
export const GRADE_AT = { S: 0.70, A: 0.48, B: 0.30, C: 0.16 };

export class Score {
  constructor() { this.reset(); }
  reset() {
    this.points = 0; this.mult = 1; this.last = 0; this.k = 1;
    this.parts = { pumps: 0, notes: 0, air: 0, tricks: 0, rails: 0, gaps: 0 };
    this.tricks = 0; this.grinds = 0; this.gaps = 0;
  }
  _add(part, base, streak) {
    const m = multOf(streak) * this.k;
    const p = Math.round(base * m);
    this.points += p; this.parts[part] += p; this.last = p;
    return p;
  }
  // feed it each of the rider's events; returns the points it was worth (0 for most)
  event(e, rider) {
    const streak = rider.streak;
    this.k = rider.groovyX2 ? 2 : 1;
    this.mult = multOf(streak) * this.k;
    switch (e.type) {
      case 'judge':
        if (e.grade === 'perfect') return this._add('pumps', POINTS.perfect, e.streak);
        if (e.grade === 'good') return this._add('pumps', POINTS.good, e.streak);
        return 0;
      case 'note': return this._add('notes', POINTS.note, streak);
      case 'land': {
        if (e.hard > 0.05 || e.air < 0.25) return 0;
        let base = POINTS.airPerSec * e.air;
        if (e.quality > 0) base += POINTS.landing + POINTS.landingQ * e.quality;
        return this._add('air', base, streak);
      }
      case 'trick': {
        if (!e.landed) return 0;
        this.tricks++;
        const per = POINTS.trick[e.kind] ?? 150;
        const size = 0.6 + 0.4 * Math.min(1, (e.air ?? 1) / 1.2);
        return this._add('tricks', per * (e.kind === 'spin' ? Math.max(1, e.turns) : 1) * (e.combo ? 1.5 : 1) * size, streak);
      }
      case 'grind': return this._add('rails', POINTS.grind, streak);
      case 'railTrick': return this._add('rails', POINTS.railTrick[e.grade] ?? 0, streak);
      case 'grindEnd': this.grinds++; return e.onBeat ? this._add('rails', POINTS.grindPop, streak) : 0;
      case 'gap': this.gaps++; return this._add('gaps', POINTS.gap, streak);
    }
    return 0;
  }
}

export function gradeOf(points, perfect) {
  if (!perfect) return 'D';
  const f = points / perfect;
  for (const g of ['S', 'A', 'B', 'C']) if (f >= GRADE_AT[g]) return g;
  return 'D';
}
