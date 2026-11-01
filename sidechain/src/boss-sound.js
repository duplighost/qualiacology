// A boss stage's sounds, made like the rest (audio.js, kit.js): synthesized, in the song's key,
// and each one put on its own moment in the song (a bottle smashing lands on the snare it lands
// on, the boards meeting on the downbeat), not on the frame it was noticed in.

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class BossSound {
  constructor(sound, kit) {
    this.s = sound; this.k = kit;
    const c = sound.ctx;
    this.out = c.createGain(); this.out.gain.value = 0.9;
    this.out.connect(sound.sfx);
    this.fuse = null;
  }
  get ctx() { return this.s.ctx; }
  // context time for a song time (or now, if that's gone)
  at(songT) { return Math.max(this.ctx.currentTime, this.s.t0 + songT); }
  _env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  _tone(f, t, peak, dec, type = 'sine', a = 0.003) {
    const c = this.ctx, o = c.createOscillator(); o.type = type; o.frequency.value = f;
    const g = c.createGain(); this._env(g, t, a, peak, dec);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + a + dec + 0.05);
    return o;
  }
  _noise(t, dur, type, freq, q, peak, a, d, f1 = 0) {
    const c = this.ctx, n = c.createBufferSource(); n.buffer = this.s._noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); this._env(g, t, a, peak, d);
    n.connect(f).connect(g).connect(this.out); n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
    return f;
  }
  // a note of the song's key (pentatonic degree, octave)
  hz(deg, oct = 2) { return this.s.note(deg, oct); }

  // ---------- the tags ----------
  // the beat before a ring closes: a soft woodblock, so you can count into it
  tick(songT, k = 1) { const t = this.at(songT); this._tone(1880, t, 0.03 * k, 0.04, 'triangle'); this._noise(t, 0.04, 'bandpass', 3400, 3, 0.035 * k, 0.001, 0.02); }
  // pressed on the ring: a bright zing going up (immediately: it's your press)
  zing(grade) {
    const t = this.ctx.currentTime, big = grade === 'perfect';
    const o = this._tone(this.hz(4, 2), t, big ? 0.05 : 0.035, 0.32, 'sine');
    o.frequency.exponentialRampToValueAtTime(this.hz(7, 2), t + 0.12);
    this._tone(this.hz(9, 3), t + 0.02, big ? 0.02 : 0.012, 0.25, 'triangle');
    this._noise(t, 0.08, 'highpass', 6000, 0.7, 0.05, 0.001, 0.05);
  }
  // the boards meeting, on the downbeat: a cymbal, a kick, a clang of metal and the root
  contact(songT, big = false) {
    const t = this.at(songT), k = this.k;
    k.crash(t, big ? 1 : 0.75); k.kick(t, big ? 1 : 0.8);
    for (const [m, p] of [[1, 0.06], [2.76, 0.035], [5.4, 0.016]]) this._tone(196 * m, t, p * (big ? 1.4 : 1), 0.5 / Math.sqrt(m), 'sine', 0.001);
    k.pluck(t, 0, big ? 1 : 0.8, 1); k.pluck(t + 0.005, 7, 0.6, 1);
    if (big) { [0, 4, 7, 12].forEach((s, i) => k.pluck(t + 0.012 * i, s % 12, 0.7, s >= 12 ? 2 : 1)); this._boom(t, 0.8); }
  }
  // missed her: a dull knock and air going away
  miss() { const t = this.ctx.currentTime; this._noise(t, 0.1, 'lowpass', 600, 0.7, 0.07, 0.002, 0.07); this._noise(t, 0.5, 'bandpass', 2200, 1.2, 0.05, 0.04, 0.4, 400); }

  // ---------- what's on the road ----------
  // a bottle leaving her hand: a little whistle of air
  throw(songT) { const t = this.at(songT); this._noise(t, 0.3, 'bandpass', 900, 1.6, 0.045, 0.06, 0.22, 3600); }
  // landing, on the snare: glass and fire for a bottle, a thud for a rock, a whoop of siren for a cop
  land(kind, songT, near = 1) {
    const t = this.at(songT), k = clamp01(near);
    if (kind === 'bottle') {
      this._noise(t, 0.2, 'highpass', 3400, 0.8, 0.1 * k, 0.001, 0.15);
      for (let i = 0; i < 5; i++) { const dt = 0.03 + i * 0.04 + Math.random() * 0.02; this._tone(this.hz([0, 4, 7, 9, 12][i], 3), t + dt, 0.014 * k, 0.18, 'sine', 0.002); }
      this._noise(t + 0.02, 0.5, 'lowpass', 900, 0.6, 0.08 * k, 0.03, 0.4, 300);    // the fire catching
    } else if (kind === 'rock') {
      const o = this._tone(110, t, 0.22 * k, 0.3, 'sine', 0.004); o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
      this._noise(t, 0.3, 'lowpass', 700, 0.7, 0.12 * k, 0.003, 0.25);
    } else if (kind === 'cop') {
      const o = this._tone(620, t, 0.045 * k, 0.28, 'square', 0.01); o.frequency.exponentialRampToValueAtTime(1240, t + 0.18);
    }
  }
  // a car coming the wrong way: its horn on the beat before it reaches you, on the key's root and
  // third; and the rush of it going by
  horn(songT, low = false) {
    const t = this.at(songT), c = this.ctx;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.032, t + 0.015); g.gain.setValueAtTime(0.032, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.8;
    lp.connect(g).connect(this.out);
    for (const d of low ? [0, 2] : [0, 2]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = this.hz(d, low ? 1 : 2); o.connect(lp); o.start(t); o.stop(t + 0.32); }
  }
  pass(songT, k = 1) { const t = this.at(songT - 0.12); this._noise(t, 0.4, 'bandpass', 2400, 1.1, 0.07 * k, 0.1, 0.28, 500); }
  // past it: a breath of air; close, a brighter one and a glint
  dodge(close) {
    const t = this.ctx.currentTime;
    this._noise(t, 0.22, 'bandpass', close ? 3000 : 1600, 1.3, close ? 0.05 : 0.025, 0.02, 0.18, close ? 6500 : 3000);
    if (close) this._tone(this.hz(7, 3), t + 0.03, 0.022, 0.3, 'sine');
  }
  // hit it
  hit() {
    const t = this.ctx.currentTime;
    this._noise(t, 0.7, 'lowpass', 3600, 0.7, 0.32, 0.002, 0.6, 200);
    const o = this._tone(90, t, 0.3, 0.35, 'sine', 0.003); o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
    this.s.duck(0.55, 1.0);
  }

  // ---------- the duel ----------
  // her bar: a bright bell-ish note on each beat she plays, going down the key
  call(songT, i) { const t = this.at(songT), f = this.hz([7, 4, 5, 2][i % 4], 2); this._tone(f, t, 0.05, 0.42, 'sine', 0.002); this._tone(f * 2.01, t, 0.016, 0.2, 'sine', 0.001); this._tone(f * 3.98, t, 0.008, 0.08, 'sine', 0.001); this.k.rim(t, 0.5); }
  // your answer, the same notes an octave down, on a clap (now: it's your press)
  answer(i, grade) {
    const t = this.ctx.currentTime, f = this.hz([7, 4, 5, 2][i % 4], 1);
    this._tone(f, t, grade === 'perfect' ? 0.06 : 0.04, 0.4, 'triangle', 0.002);
    this.k.clap(t, grade === 'perfect' ? 0.8 : 0.5); this.k.kick(t, 0.5);
  }

  // ---------- the pin ----------
  pull() {
    const t = this.ctx.currentTime;
    this._noise(t, 0.05, 'bandpass', 5200, 4, 0.12, 0.001, 0.03);
    this._tone(this.hz(9, 3), t + 0.01, 0.03, 0.5, 'sine', 0.001);
    this._tone(this.hz(9, 3) * 1.5, t + 0.012, 0.012, 0.3, 'sine', 0.001);
  }
  // the fuse burning while you hold it: a hiss rising to the drop (stopped by letting go)
  fuseOn(untilSong) {
    this.fuseOff(0.02);
    const c = this.ctx, t = c.currentTime, end = Math.max(t + 0.5, this.s.t0 + untilSong);
    const n = c.createBufferSource(); n.buffer = this.s._noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(5200, end);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.3); g.gain.exponentialRampToValueAtTime(0.04, end);
    n.connect(f).connect(g).connect(this.out); n.start(t, Math.random()); n.stop(end + 0.4);
    this.fuse = { n, g };
  }
  fuseOff(fade = 0.08) {
    if (!this.fuse) return;
    const t = this.ctx.currentTime, { n, g } = this.fuse; this.fuse = null;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    try { n.stop(t + fade + 0.02); } catch (e) { /* stopped */ }
  }
  // let go on the drop
  boom(songT, k = 1) { const t = this.at(songT); this._boom(t, k); this.k.crash(t, 1); }
  _boom(t, k) {
    const o = this._tone(70, t, 0.42 * k, 0.9, 'sine', 0.004); o.frequency.exponentialRampToValueAtTime(28, t + 0.8);
    this._noise(t, 1.1, 'lowpass', 2600, 0.6, 0.24 * k, 0.003, 1.0, 120);
  }
  // let go too soon: it fizzles
  fizzle() { const t = this.ctx.currentTime; this._noise(t, 0.5, 'bandpass', 1800, 1.4, 0.05, 0.01, 0.45, 300); }
}
