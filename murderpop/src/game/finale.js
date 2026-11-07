// THE FINALE. Her bar is empty: she's beaten, harmless, cracked, still performing, and the song plays on to its last hit.
// A gold ring closes on her through every bar: strike her on the one, as it closes, for the big points; each one in a
// row raises the finale's multiplier, and a ring let go, or three strikes off the beat in a row, take a step back. For the
// song's last few bars she's down on her knees and the rings come on every beat you strike on; the last one closes on
// the last hit: land that one and the shatter is yours, the FINAL BLOW. Her keepsake, taken back, doubles all of it.
// Alex, 7 Nov: the end was a wait ("i don't know what i should be doing there").

export const FINALE = { ringR: 3.4, window: 0.11, perRing: 150, perHit: 10, finalBlow: 2500, maxMult: 8, downS: 8 };

export class Finale {
  constructor(f) { this.f = f; this.reset(); }
  reset() {
    this.on = false; this.down = false; this.downAt = Infinity;
    this.bank = 0; this.mult = 1; this.streak = 0; this.kept = 1; this.dropT = -9; this.upT = -9; this.offRun = 0;
    this.rings = []; this.perfect = 0; this.total = 0; this.finalBlow = false; this.nextT1 = Infinity; this.lastT1 = 0;
  }
  start() {
    const f = this.f, bm = f.bm;
    if (this.on || !bm) return;
    this.on = true; this.t0 = f.t;
    // the last few bars (four at least, about eight seconds) she's on her knees
    const bar = 4 * bm.periodAt(f.lastHit), bars = Math.max(4, Math.ceil(FINALE.downS / bar));
    this.downAt = Math.max(f.t + bm.periodAt(f.t) * 2, bm.timeOf(Math.round(bm.beatAt(f.lastHit)) - 4 * bars));
    // the first ring closes on the first one you can see coming (at least two beats off)
    this.lastT1 = f.t; this.nextT1 = this._closeAfter(f.t + bm.periodAt(f.t) * 2);
  }
  // when the next ring closes: on each bar's one while she's up, on every beat you strike on once she's down, and the
  // last on the song's last hit
  _closeAfter(t) {
    const f = this.f, bm = f.bm, last = f.lastHit;
    let c;
    if (t < this.downAt - 0.05) {
      c = bm.timeOf(Math.ceil((bm.beatAt(t + 0.05) - bm.downbeat) / 4) * 4 + bm.downbeat);
      if (c >= this.downAt - 0.05) c = bm.nextStrike(this.downAt - 0.02);
    } else c = bm.nextStrike(t + 0.05);
    return c >= last - 0.15 ? last : c;
  }
  update() {
    if (!this.on) return;
    const f = this.f, t = f.t, b = f.boss;
    if (!this.down && t >= this.downAt) { this.down = true; f._finaleDown && f._finaleDown(); }
    // each ring opens as the one before it closes (the first a beat or so after her bar empties)
    let guard = 0;
    while (this.nextT1 !== Infinity && t >= this.lastT1 - 1e-3 && guard++ < 4) {
      const t1 = this.nextT1, last = t1 >= f.lastHit - 1e-3;
      const t0 = Math.max(this.lastT1, t1 - (t1 > this.downAt ? 1.2 : 3.2));
      // she's out of reach (vanished, gone): no ring for this one
      if (b.targetable) { this.rings.push({ t0, t1, last, hit: false, done: false }); this.total++; }
      this.lastT1 = t1; this.nextT1 = last ? Infinity : this._closeAfter(t1);
    }
    // one that closed with nothing on it: a step of the multiplier goes (not if she was out of reach). A strike pressed
    // on its beat may still be on its way (it lands as soon after the beat as it can): the ring waits for it.
    const pl = f.player, s = pl.state === 'strike' ? pl.strike : null;
    // the last one closes on the last hit, when she shatters: a strike pressed on it is the final blow as it's pressed
    // (swinging already, or waiting its turn behind the one before); it can't wait to land
    const lastR = this.rings.find((r) => r.last && !r.hit && !r.done);
    if (lastR && s && !s.finaleDone && this._onLast(s, lastR)) {
      s.finaleDone = true; f._finaleLast && f._finaleLast(this.struck(s, true, lastR.t1));
    }
    for (const r of this.rings) if (!r.hit && !r.done && t > r.t1 + (r.last ? 0.3 : FINALE.window)) {
      if (s && !s.hit && s.beatT != null && Math.abs(s.beatT - r.t1) < 0.045 && t < r.t1 + 0.45) continue;
      r.done = true;
      if (!r.last && b.targetable) this._drop();
    }
    this.rings = this.rings.filter((r) => t < r.t1 + 0.5);
  }
  // pressed on the last hit (it's the song's, not always on the beat: some songs end on the and)
  _onLast(s, r) { return s.pressT != null && s.pressT >= r.t1 - 0.13 && s.pressT <= r.t1 + 0.09; }
  _drop() { this.streak = 0; if (this.mult > 1) { this.mult--; this.dropT = this.f.t; } }
  // what's on the floor round her now: [{ x, z, r (metres), a (0..1), last, hit, rT }]
  drawList() {
    const f = this.f, t = f.t, b = f.boss, out = [];
    const rT = (b.radius || 0.85) * 0.95, tick = f.bm.pulse(t, 7);
    for (const r of this.rings) {
      if (t < r.t0) continue;
      const k = Math.min(1, Math.max(0, (t - r.t0) / Math.max(0.05, r.t1 - r.t0)));
      const R0 = r.last ? FINALE.ringR * 1.5 : FINALE.ringR, after = t - r.t1;
      const R = after > 0 ? rT + after * (r.hit ? 9 : 1.5) : R0 + (rT - R0) * k * k * (3 - 2 * k) * 0.35 + (rT - R0) * k * 0.65;
      // it ticks on each beat as it comes in; it bursts outward when you land it, and fades if you let it go
      const a = after > 0 ? Math.max(0, 1 - after / (r.hit ? 0.3 : 0.2)) * (r.hit ? 1 : 0.5) : Math.min(1, (t - r.t0) / 0.12) * (0.62 + 0.38 * tick);
      out.push({ x: b.x, z: b.z, r: Math.max(0.2, R), a, last: r.last, hit: r.hit, rT });
    }
    return out;
  }
  // a strike landed on her during the finale (at song time t): its points (already multiplied), and what it did.
  // A ring is landed by a strike pressed on the beat it closes on (it may land a moment later), or landing on it.
  struck(s, on, t, air = false) {
    const ring = this.rings.find((r) => !r.hit && !r.done && (r.last ? this._onLast(s, r) || Math.abs(t - r.t1) <= FINALE.window * 1.4 : on && ((s.beatT != null && Math.abs(s.beatT - r.t1) < 0.045) || Math.abs(t - r.t1) <= FINALE.window)));
    let pts, perfect = false, last = false, broke = false;
    if (ring) {
      ring.hit = true; perfect = true; last = ring.last;
      // three in a row: a step up (a miss costs one step, three more win it back)
      this.perfect++; this.streak++;
      if (this.streak % 3 === 0 && this.mult < FINALE.maxMult) { this.mult++; this.upT = this.f.t; }
      pts = (last ? FINALE.finalBlow : FINALE.perRing) * this.mult * this.kept * (s.finisher ? 2 : 1);
      if (last) this.finalBlow = true;
    } else if (!on) { pts = FINALE.perHit * this.kept; if (++this.offRun >= 3) { this.offRun = 0; broke = this.mult > 1; this._drop(); } }
    else pts = FINALE.perHit * this.mult * this.kept * (s.finisher ? 3 : 1.5);
    if (on) this.offRun = 0;
    if (air) pts *= 2;                     // (up in the air: a juggle is worth twice)
    pts = Math.round(pts);
    this.bank += pts;
    return { pts, perfect, last, broke };
  }
}
