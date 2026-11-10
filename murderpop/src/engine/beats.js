// Beat math over a song's beat map (SIDECHAIN's data/beats/<id>.json format):
// { duration, bpm, key, keyRoot, keyMode, downbeat, beats: [t...], energy:[], low:[], high:[] }
// Beats follow the drums (the tempo drifts), so everything here interpolates the real beat times.
// Bars are 4 beats; bar 1 beat 1 is beats[downbeat]. Bars/beats are 1-based like the musicians count;
// bars before the first downbeat are 0 or negative.

export class BeatMap {
  constructor(data) {
    this.data = data;
    this.beats = data.beats;
    this.n = this.beats.length;
    this.bpm = data.bpm;
    this.period = 60 / data.bpm;
    this.downbeat = data.downbeat || 0;
    this.duration = data.duration;
    this.energy = data.energy || [];
    this.low = data.low || [];
    this.high = data.high || [];
    this.keyRoot = data.keyRoot ?? 0;
    this.keyMode = data.keyMode || 'min';
    this._last = 0;
  }

  // fractional beat index at time t (extrapolates before the first and after the last beat)
  beatAt(t) {
    const b = this.beats, n = this.n;
    if (t <= b[0]) return (t - b[0]) / this.period;
    if (t >= b[n - 1]) return n - 1 + (t - b[n - 1]) / this.period;
    let i = this._last;
    if (i >= n - 1 || b[i] > t || b[i + 1] <= t) {
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m] <= t) lo = m; else hi = m; }
      i = lo;
    }
    this._last = i;
    return i + (t - b[i]) / (b[i + 1] - b[i]);
  }

  // time of a fractional beat index
  timeOf(beat) {
    const b = this.beats, n = this.n;
    if (beat <= 0) return b[0] + beat * this.period;
    if (beat >= n - 1) return b[n - 1] + (beat - (n - 1)) * this.period;
    const i = Math.floor(beat), f = beat - i;
    return b[i] + f * (b[i + 1] - b[i]);
  }

  // local beat length around time t (seconds)
  periodAt(t) {
    const i = Math.max(0, Math.min(this.n - 2, Math.floor(this.beatAt(t))));
    return this.beats[i + 1] - this.beats[i];
  }

  // beat index of bar.beat (bar 1 beat 1 = downbeat), fractional beats allowed: (17, 2.5)
  beatOfBar(bar, beat = 1) { return this.downbeat + (bar - 1) * 4 + (beat - 1); }
  timeOfBar(bar, beat = 1) { return this.timeOf(this.beatOfBar(bar, beat)); }

  // "17:3" or "17:3.5" or 17 -> time
  t(pos) {
    if (typeof pos === 'number') return this.timeOfBar(pos, 1);
    const [bar, beat] = String(pos).split(':').map(Number);
    return this.timeOfBar(bar, beat || 1);
  }

  // { bar, beat, phase } at time t; beat is 1..4 (fractional), phase 0..1 within the beat
  barAt(t) {
    const B = this.beatAt(t) - this.downbeat;
    const bar = Math.floor(B / 4) + 1;
    const inBar = B - (bar - 1) * 4;
    return { bar, beat: inBar + 1, phase: B - Math.floor(B) };
  }

  // nearest beat time to t, and the signed offset (t - beat) in seconds
  nearest(t, subdivision = 1) {
    const B = this.beatAt(t) * subdivision;
    const nb = Math.round(B) / subdivision;
    const bt = this.timeOf(nb);
    return { beat: nb, time: bt, offset: t - bt };
  }

  // the beat you strike on: every beat, or every other one counted from the downbeat when the song's beat is quick
  // (a song tracked at 180 is felt at 90). nearestStrike/nextStrike/strikePulse work on that grid.
  get strikeStep() { return this.period < 0.45 ? 2 : 1; }
  nearestStrike(t) {
    const st = this.strikeStep, k = Math.round((this.beatAt(t) - this.downbeat) / st) * st + this.downbeat, bt = this.timeOf(k);
    return { beat: k, time: bt, offset: t - bt, period: this.periodAt(t) * st };
  }
  nextStrike(t) { const st = this.strikeStep; return this.timeOf(Math.ceil((this.beatAt(t) - this.downbeat) / st) * st + this.downbeat); }
  strikePulse(t, sharp = 6) { const B = (this.beatAt(t) - this.downbeat) / this.strikeStep; return Math.exp(-(B - Math.floor(B)) * sharp); }

  // THE TICK: the pulse you fight on. Every strike lands on one. It's the song's beat where that's a good fighting
  // pace (0.26 to 0.52 s), half a beat in a slower song, two beats in a very quick one. Ticks count from the first
  // downbeat (tick 0); even ticks are the accents (the ones your foot taps).
  get tickDiv() { return this.period >= 0.52 ? 2 : this.period < 0.26 ? 0.5 : 1; }
  tickAt(t) { return (this.beatAt(t) - this.downbeat) * this.tickDiv; }
  tickTime(k) { return this.timeOf(k / this.tickDiv + this.downbeat); }
  tickPeriod(t) { return this.periodAt(t) / this.tickDiv; }
  // the first tick at least `lead` seconds after t: { k, time }
  nextTick(t, lead = 0) { const k = Math.ceil(this.tickAt(t + lead) - 1e-6); return { k, time: this.tickTime(k) }; }
  nearestTick(t) { const k = Math.round(this.tickAt(t)), time = this.tickTime(k); return { k, time, offset: t - time, accent: this.accent(k) }; }
  // an accent: the tick the kick drum is on (every other one; which of the two is measured from the song, see setAccents)
  accent(k) { return (((Math.round(k) % 2) + 2) % 2) === (this.accentParity || 0); }
  // The song as measured (data/accents/<id>.json, tools/accents.mjs): per tick, how hard the kick, the snare and the
  // whole band come in; the big hits; the dropouts; where the arrangement steps up. The fight leans on these: a strike
  // that lands with a drum lands harder, the room moves with the real drums, the camera feels the big hits.
  setAccents(acc) {
    if (!acc || !acc.kick) return;
    this.acc = acc;
    this._accOff = Math.floor(this.downbeat * this.tickDiv);       // file index = tick + this
    let e = 0, o = 0, ne = 0, no = 0;
    for (let i = 0; i < acc.n; i++) { const p = (((i - this._accOff) % 2) + 2) % 2; if (p) { o += acc.kick[i]; no++; } else { e += acc.kick[i]; ne++; } }
    this.accentParity = no && o / no > (e / Math.max(1, ne)) * 1.12 ? 1 : 0;
  }
  _acc(arr, k) { if (!arr) return 0.5; const i = Math.round(k) + this._accOff; return i >= 0 && i < arr.length ? arr[i] : 0; }
  // how hard the drums come in on tick k (0..1: the kick or the snare, whichever is there), and the band's level
  drumAt(k) { const a = this.acc; return a ? Math.max(this._acc(a.kick, k), this._acc(a.snare, k) * 0.9) : 0.5; }
  kickAt(k) { return this.acc ? this._acc(this.acc.kick, k) : 0.5; }
  loudAt(k) { return this.acc ? this._acc(this.acc.loud, k) : 0.6; }
  // the drums now: the tick's strength, falling away through the tick (for lights and anything that breathes)
  drumPulse(t, sharp = 6) { const B = this.tickAt(t), k = Math.floor(B); return Math.exp(-(B - k) * sharp) * (0.25 + 0.75 * this.drumAt(k)); }
  // 0..1, peaking on each tick (sub = 2: on each half tick)
  tickPulse(t, sharp = 6, sub = 1) { const B = this.tickAt(t) * sub; return Math.exp(-(B - Math.floor(B)) * sharp); }
  // 0..1 through the tick you're in
  tickPhase(t) { const B = this.tickAt(t); return B - Math.floor(B); }

  // 0..1 smooth pulse that peaks on each beat (for lights/UI breathing)
  pulse(t, sharp = 6) {
    const ph = this.beatAt(t); const f = ph - Math.floor(ph);
    return Math.exp(-f * sharp);
  }

  // per-beat energy (0..1) at time t, interpolated
  energyAt(t, arr = this.energy) {
    if (!arr.length) return 0.5;
    const B = Math.max(0, Math.min(arr.length - 1, this.beatAt(t)));
    const i = Math.floor(B), f = B - i;
    return arr[i] * (1 - f) + (arr[Math.min(arr.length - 1, i + 1)] ?? arr[i]) * f;
  }

  // frequency (Hz) of a scale degree in the song's key, for sounds that sit in the song
  // degree 0 = tonic; octave offsets via degree +/- 7
  note(degree = 0, octave = 4) {
    const major = [0, 2, 4, 5, 7, 9, 11], minor = [0, 2, 3, 5, 7, 8, 10];
    const sc = this.keyMode === 'maj' ? major : minor;
    const o = Math.floor(degree / 7), d = ((degree % 7) + 7) % 7;
    const semis = this.keyRoot + sc[d] + 12 * (octave + o - 4);
    return 261.6256 * Math.pow(2, (semis - 0) / 12); // C4 = 261.63 Hz, keyRoot 0 = C
  }
}

export async function loadBeatMap(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('beat map ' + url + ' ' + r.status);
  return new BeatMap(await r.json());
}
