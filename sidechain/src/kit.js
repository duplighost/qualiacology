// The board's answers to you, as percussion that sits inside the song instead of chimes on
// top of it: soft hats and shakers for pickups, a kick and a clap for a pump in time, a rim
// for one that's close, a little fill when a run builds, a cymbal when a trick lands. Each one
// waits for its place on the song's own beat grid (a pickup lands on its beat, a pump on the
// bottom of its dip), so a good run plays a pattern with the band rather than over it.
// Pitched things stay on the song's root and fifth, which sit under any chord.

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class Kit {
  constructor(sound) {
    this.s = sound;
    const c = sound.ctx;
    // its own bus: a gentle lowpass so nothing is brighter than the record, into the effects bus
    this.out = c.createGain(); this.out.gain.value = 1;
    this.tone = c.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 9000; this.tone.Q.value = 0.4;
    this.out.connect(this.tone).connect(sound.sfx);
    this.grid = null;        // song time of every beat (the course's extended grid)
    this.energy = null;      // how loud the song is on each beat, 0..1
    this.level = 1;          // per-song trim
    this.bright = 1;         // how bright its hats are
    this._n = sound._noise;
    this._lastHat = -1;
  }

  setSong(beats, energy, opts = {}) { this.grid = beats; this.energy = energy; this.level = opts.level ?? 1; this.bright = opts.bright ?? 1; }

  // context time for a song time
  ctxAt(songT) { return this.s.t0 + songT; }

  _beatIndex(t) {
    const b = this.grid; let lo = 0, hi = b.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m] <= t) lo = m; else hi = m; }
    return lo;
  }
  // the song's loudness at song time t: quiet parts get quiet answers
  loudAt(t) {
    if (!this.grid || !this.energy) return 0.7;
    const i = this._beatIndex(t);
    return 0.55 + 0.45 * clamp01(this.energy[i] ?? 0.5);
  }
  // when to play something that happened at song time te: at the next point of the grid
  // (div per beat) if it's close, otherwise now. A time already gone plays now.
  when(te, div = 4, maxWait = 0.09) {
    const c = this.s.ctx, now = c.currentTime;
    if (!this.grid || !this.s.src) return now;
    const b = this.grid, i = this._beatIndex(te);
    const spb = Math.max(0.05, b[i + 1] - b[i]);
    const f = (te - b[i]) / spb;
    const k = Math.ceil(f * div - 0.2);
    const g = b[i] + spb * Math.max(0, k) / div;
    if (g - te > maxWait) return now;
    return Math.max(now, this.ctxAt(g));
  }
  // exactly at song time t (or now if it's gone)
  at(t) { return Math.max(this.s.ctx.currentTime, this.ctxAt(t)); }

  // ---------- voices ----------
  _env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  _noise(t, dur, type, freq, q, peak, a, d, to = this.out) {
    const c = this.s.ctx;
    const n = c.createBufferSource(); n.buffer = this._n;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); this._env(g, t, a, peak, d);
    n.connect(f).connect(g).connect(to); n.start(t, Math.random() * 1.5); n.stop(t + dur);
    return f;
  }
  // a soft sub kick: felt, not heard over the record's own
  kick(t, k = 1) {
    const c = this.s.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(118, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    const g = c.createGain(); this._env(g, t, 0.003, 0.32 * k * this.level, 0.17);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.3);
    this._noise(t, 0.03, 'bandpass', 2600, 1.2, 0.05 * k * this.level, 0.001, 0.012);
  }
  // a clap: three quick bursts and a short tail
  clap(t, k = 1) {
    for (const [dt, p] of [[0, 0.5], [0.011, 0.42], [0.023, 0.7]]) this._noise(t + dt, 0.05, 'bandpass', 1350, 1.4, 0.12 * p * k * this.level, 0.001, 0.016);
    this._noise(t + 0.03, 0.2, 'bandpass', 1150, 0.9, 0.07 * k * this.level, 0.002, 0.11);
  }
  // a rim: a click with a little pitch to it
  rim(t, k = 1) {
    const c = this.s.ctx;
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 1650;
    const g = c.createGain(); this._env(g, t, 0.001, 0.05 * k * this.level, 0.028);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.06);
    this._noise(t, 0.04, 'bandpass', 3200, 2.2, 0.07 * k * this.level, 0.001, 0.018);
  }
  // a closed hat (or open, longer)
  hat(t, k = 1, open = false) {
    this._noise(t, open ? 0.32 : 0.06, 'highpass', 7200 * this.bright, 0.7, (open ? 0.05 : 0.07) * k * this.level, 0.001, open ? 0.2 : 0.03);
  }
  // a shaker: a soft swish
  shaker(t, k = 1) { this._noise(t, 0.12, 'bandpass', 5600 * this.bright, 1.1, 0.045 * k * this.level, 0.014, 0.06); }
  // a tambourine: jingles over a hiss
  tamb(t, k = 1) {
    const c = this.s.ctx;
    for (const f of [6100, 7300, 8900]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * this.bright;
      const g = c.createGain(); this._env(g, t + Math.random() * 0.006, 0.002, 0.008 * k * this.level, 0.12);
      o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.2);
    }
    this._noise(t, 0.16, 'highpass', 8000 * this.bright, 0.8, 0.04 * k * this.level, 0.002, 0.1);
  }
  // a muted pluck on the song's root (0) or fifth (7), low and short
  pluck(t, semis = 0, k = 1, oct = 0) {
    const c = this.s.ctx;
    const f = 130.81 * Math.pow(2, (this.s.keyRoot + semis) / 12 + oct);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.18);
    const g = c.createGain(); this._env(g, t, 0.002, 0.07 * k * this.level, 0.26);
    const g2 = c.createGain(); g2.gain.value = 0.35;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(this.out);
    o.start(t); o.stop(t + 0.4); o2.start(t); o2.stop(t + 0.4);
  }
  // a soft cymbal: a long hiss, high, fading
  crash(t, k = 1) {
    this._noise(t, 1.4, 'highpass', 5200 * this.bright, 0.5, 0.06 * k * this.level, 0.004, 1.1);
    this._noise(t, 0.5, 'bandpass', 3400, 0.8, 0.03 * k * this.level, 0.002, 0.3);
  }
  // a low tom, pitched a fifth or a root down
  tom(t, semis = 0, k = 1) {
    const c = this.s.ctx;
    const f = 65.4 * Math.pow(2, (this.s.keyRoot + semis) / 12);
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    const g = c.createGain(); this._env(g, t, 0.002, 0.16 * k * this.level, 0.2);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.3);
  }

  // ---------- what the ride asks for ----------
  // a pickup: a hat on its beat; a run lays a shaker and then a tambourine under it,
  // and the bar's first one gets the root, low
  pickup(at, mult = 1, bar = false) {
    const t = this.at(at), k = this.loudAt(at);
    this.hat(t, k);
    if (mult >= 2) this.shaker(t, 0.8 * k);
    if (mult >= 3) this.tamb(t, 0.8 * k);
    if (bar && mult >= 2) this.pluck(t, 0, 0.8 * k, mult >= 4 ? 1 : 0);
  }
  // a pump let go in time: on the bottom of the dip it played (or now if that's gone)
  pump(grade, at, mult = 1, streak = 0) {
    const t = this.at(at), k = this.loudAt(at);
    if (grade === 'perfect') {
      this.kick(t, 0.9 * k);
      this.clap(t, (0.7 + 0.1 * mult) * k);
      // a run plays a pickup into it: a ghost rim a sixteenth before, then a flam
      if (mult >= 2) { const b = this.grid ? this.grid[this._beatIndex(at) + 1] - this.grid[this._beatIndex(at)] : 0.35; this.rim(Math.max(this.s.ctx.currentTime, t - b / 4), 0.45 * k); }
      if (mult >= 3) this.clap(t + 0.018, 0.35 * k);
    } else if (grade === 'good') {
      this.kick(t, 0.6 * k);
      this.rim(t, 0.9 * k);
    } else if (grade === 'early' || grade === 'late') {
      this._noise(this.s.ctx.currentTime, 0.1, 'lowpass', 650, 0.7, 0.06 * k * this.level, 0.002, 0.06);
    }
  }
  // the multiplier went up: a short fill of toms down the key, landing on the next beat
  fill(at, mult) {
    if (!this.grid) return;
    const i = this._beatIndex(at), spb = this.grid[i + 1] - this.grid[i];
    const t0 = this.grid[i + 1] - spb * 0.75;
    const notes = [7, 5, 0];
    notes.forEach((n, j) => this.tom(this.at(t0 + j * spb / 4), n, 0.8));
    this.crash(this.at(this.grid[i + 1]), 0.5 + 0.15 * mult);
  }
  // a trick landed clean: a cymbal on the next eighth, and the root an octave up
  trick(te, size = 1) {
    const t = this.when(te, 2, 0.12), k = this.loudAt(te);
    this.crash(t, (0.6 + 0.4 * size) * k);
    this.pluck(t, 0, 0.7 * k, 1); this.pluck(t + 0.004, 7, 0.45 * k, 1);
  }
  // a landing that wasn't hard: a soft thump on the next sixteenth
  land(te, quality) { const t = this.when(te, 4, 0.06); this.kick(t, 0.35 + 0.35 * quality); }
  // a beat on a rail: a ride-cymbal tick
  grind(te) { const t = this.at(te); this.hat(t, 0.8 * this.loudAt(te), false); this._noise(t, 0.12, 'bandpass', 4200, 6, 0.025 * this.level, 0.002, 0.08); }
  // off the end of a rail on the beat
  pop(te) { const t = this.when(te, 4, 0.08); this.clap(t, 0.6); this.hat(t, 0.6, true); }
  // ---------- the screens: soft, short, in the song's key ----------
  // the score counting up: a tiny tick
  tick(k = 1) { const t = this.s.ctx.currentTime; this._noise(t, 0.03, 'bandpass', 4200, 3, 0.025 * k, 0.001, 0.012); }
  // the grade landing: a kick, a clap, and the root and fifth (an octave on top for an S)
  grade(g) {
    const t = this.s.ctx.currentTime + 0.01, big = g === 'S' || g === 'A';
    this.kick(t, big ? 1 : 0.7); this.clap(t, big ? 0.8 : 0.5);
    this.pluck(t, 0, 0.8, 0); this.pluck(t + 0.01, 7, 0.6, 0);
    if (big) { this.pluck(t + 0.02, 0, 0.6, 1); this.crash(t, g === 'S' ? 0.9 : 0.5); }
  }
  // the level bar filling: a breath of noise rising, very quiet
  rise(dur = 1) {
    const c = this.s.ctx, t = c.currentTime;
    const f = this._noise(t, dur + 0.2, 'bandpass', 600, 2.5, 0.03, 0.08, dur);
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3200, t + dur);
  }
  // a new level: a cymbal and the root, fifth and octave
  levelUp() {
    const t = this.s.ctx.currentTime + 0.01;
    this.crash(t, 0.8); this.kick(t, 0.6);
    [0, 7, 12].forEach((n, i) => this.pluck(t + i * 0.09, n % 12, 0.8, n >= 12 ? 1 : 0));
  }

  // the count-in on the start line: sticks on the beats before the song
  stick(t, accent = false) {
    const c = this.s.ctx;
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = accent ? 2100 : 1750;
    const g = c.createGain(); this._env(g, t, 0.001, accent ? 0.07 : 0.05, 0.035);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.08);
    this._noise(t, 0.05, 'bandpass', 2900, 1.6, accent ? 0.12 : 0.09, 0.001, 0.02);
  }
}
