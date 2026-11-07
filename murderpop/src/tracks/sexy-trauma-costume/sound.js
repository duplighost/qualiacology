// The back room's own sounds, small and synthesized (WebAudio through the game's sfx bus), plus the shared library's
// recordings where one fits (cloth, page, latch). Each sound is placed where it comes from; nothing loud or shrill.
// The song is never touched.
// Levels (measured offline, the loudest 50 ms before the bus gain): a light hit is about -20 dB and the shared impact
// slam -11. The warnings that rise to an impact (stretch, zip, motors) and the set's moments (pops, ticks, rattle,
// the bell) sit at -29 to -36, so they're heard under the hits, never over them.

const C_SHARP = 277.18;

export class Sound {
  constructor(f) { this.f = f; }
  get a() { return this.f.audio; }
  get lib() { return this.f.sfx && this.f.sfx.s; }
  _ok() { return this.f.state === 'play' && this.a && this.a.ctx && this.a.ctx.state === 'running'; }
  _out(x) { const p = this.f.pan(x ?? 0); if (!Number.isFinite(p)) { if (!this._warned) { this._warned = true; console.warn('stc sound: no pan', x, this.f.cam.focus.x, this.f.player.x, this.f.boss.x); } return this.a.pan(0); } return this.a.pan(p); }
  _play(key, x, o = {}) { const L = this.lib; const p = this.f.pan(x ?? 0); if (L && L.play) L.play(key, { pan: Number.isFinite(p) ? p : 0, ...o }); }

  // a fabric stretch through a telegraph's fill, rising to a hard stop on the impact
  stretch(t0, t1, k = 1) {
    if (!this._ok()) return;
    const f = this.f, now = f.t, lead = Math.max(0.05, t1 - now), sw = Math.min(0.45, lead);
    const out = this._out(f.boss.x);
    this.a.noiseBurst({ a: sw, d: 0.04, peak: 0.42 * k, type: 'bandpass', f: 700, fTo: 2600, q: 2.2, at: lead - sw, out });
  }
  // the floor cut: a rip along the lane from her end to the far end
  rip(sh) {
    if (!this._ok()) return;
    const out = this._out(sh.x);
    this.a.noiseBurst({ a: 0.01, d: 0.3, peak: 0.3, type: 'bandpass', f: 600, fTo: 3000, q: 1.4, out });
    this._play('k-cloth', sh.x, { gain: 0.8 });
  }
  // a package lands: a soft cardboard thump and a crackle of blister plastic
  land(sh) { if (!this._ok()) return; const out = this._out(sh.x); this.a.noiseBurst({ a: 0.002, d: 0.08, peak: 0.35, type: 'lowpass', f: 900, out }); this.a.noiseBurst({ a: 0.001, d: 0.05, peak: 0.15, type: 'highpass', f: 5000, at: 0.02, out }); }
  // the tape measure pulled out: a ratchet of clicks, then the crack on the impact
  zip(t0, t1) {
    if (!this._ok()) return;
    const f = this.f, out = this._out(f.boss.x), lead = Math.max(0.05, t1 - f.t);
    for (let i = 0; i < 9; i++) this.a.noiseBurst({ a: 0.001, d: 0.012, peak: 0.25, type: 'bandpass', f: 3200, q: 3, at: Math.max(0, lead - 0.42) + i * (0.03 + i * 0.002), out });
    this.a.noiseBurst({ a: 0.002, d: 0.07, peak: 0.6, type: 'bandpass', f: 2000, fTo: 800, q: 1.2, at: lead, out });
  }
  cloth(x) { this._play('k-cloth', x, { gain: 0.6 }); }
  porcelain(x) { this._play('chip', x, { gain: 0.9 }); }
  wire(x) { if (!this._ok()) return; const out = this._out(x); this.a.noiseBurst({ a: 0.001, d: 0.18, peak: 0.2, type: 'bandpass', f: 2400, q: 6, out }); this._play('k-page', x, { gain: 0.6 }); }
  glass(x) { this._play('shatter', x, { gain: 0.7 }); if (!this._ok()) return; const out = this._out(x); for (let i = 0; i < 3; i++) this.a.noiseBurst({ a: 0.001, d: 0.25, peak: 0.06, type: 'highpass', f: 4000 + i * 800, at: i * 0.06, out }); }
  // one porcelain tick per mask, panned, as they all turn at once
  ticks(xs) {
    if (!this._ok()) return;
    xs.forEach((x, i) => { if (i % 3) return; const out = this._out(x); this.a.tone(2600 + (i % 5) * 140, { type: 'triangle', a: 0.001, d: 0.025, peak: 0.1, at: Math.random() * 0.03, out }); });
  }
  rattle() { if (!this._ok()) return; const out = this._out(11); for (let i = 0; i < 12; i++) this.a.noiseBurst({ a: 0.001, d: 0.04, peak: 0.25, type: 'bandpass', f: 1200, q: 2, at: i * 0.05, out }); this.a.noiseBurst({ a: 0.002, d: 0.3, peak: 0.45, type: 'lowpass', f: 500, at: 0.63, out }); }
  // the register's bell: once, softly, pitched to the chord (C#), decaying fast
  bell() {
    if (!this._ok()) return;
    const out = this._out(1.8);
    for (const [m, p] of [[2, 0.08], [4.2, 0.029], [6.8, 0.013]]) this.a.tone(C_SHARP * m, { type: 'sine', a: 0.002, d: 0.9, peak: p, out });
  }
  pop() { if (!this._ok()) return; for (const x of [-10, 10]) { const out = this._out(x); this.a.noiseBurst({ a: 0.001, d: 0.12, peak: 0.38, type: 'lowpass', f: 1400, out }); } }
  whoosh() { if (!this._ok()) return; const out = this._out(this.f.boss.x); this.a.noiseBurst({ a: 0.03, d: 0.25, peak: 0.5, type: 'bandpass', f: 400, fTo: 1600, q: 0.8, out }); }
  // (several at once, e.g. the walkers bursting together, are one thoom, not a stack of sub-bass)
  thoom() { if (!this._ok() || Math.abs(this.f.t - (this._thoomT ?? -9)) < 0.1) return; this._thoomT = this.f.t; const out = this._out(this.f.boss.x); this.a.tone(55, { type: 'sine', a: 0.004, d: 0.4, peak: 0.185, glideTo: 38, out }); this.a.noiseBurst({ a: 0.002, d: 0.2, peak: 0.06, type: 'highpass', f: 3000, out }); }
  // the moving heads' motors, whining in from the four corners
  motors(t0, t1) {
    if (!this._ok()) return;
    const lead = Math.max(0.1, t1 - this.f.t);
    for (const x of [-10, 10]) this.a.tone(180, { type: 'sawtooth', a: lead * 0.9, d: 0.08, peak: 0.047, glideTo: 420, out: this._out(x) });
  }
  // the thermal printer buzzing through a receipt's fill (soft: a square wave is harsh)
  printer(t0, t1) { if (!this._ok()) return; const lead = Math.max(0.05, t1 - this.f.t), out = this._out(2.3); this.a.tone(2500, { type: 'square', a: Math.min(0.4, lead), d: 0.05, peak: 0.035, at: Math.max(0, lead - 0.4), out }); }
  // a cardboard thud (a FINAL SALE you tried to catch)
  thud(x) { if (!this._ok()) return; const out = this._out(x); this.a.tone(90, { type: 'sine', a: 0.002, d: 0.12, peak: 0.2, out }); this.a.noiseBurst({ a: 0.001, d: 0.06, peak: 0.06, type: 'lowpass', f: 600, out }); }
  latch(x) { this._play('k-latch', x, { gain: 0.7 }); }
  // a soft gas "pfft" as a tag blinks out (very quiet)
  pfft(x) { if (!this._ok()) return; this.a.noiseBurst({ peak: 0.23, d: 0.08, f: 500, q: 0.6, type: 'lowpass', out: this._out(x) }); }
  // eight quick rising ticks chasing down the runner
  runway(lead) { if (!this._ok()) return; const out = this._out(0); for (let i = 0; i < 8; i++) this.a.tone(900 + i * 110, { type: 'triangle', a: 0.001, d: 0.05, peak: 0.1, at: Math.max(0, lead) + i * 0.07, out }); }
  hum(on) {}
}
