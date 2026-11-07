// Placeholder game sounds (synthesized, quiet, distinct) with the interface the fight calls.
// The full library (src/engine/sfx.js) replaces this when it's ready.
export class SfxLite {
  constructor(audio) { this.a = audio; this.key = { root: 0, minor: true }; }
  setKey(root, minor) { this.key = { root, minor }; }
  _p(pan) { return pan ? this.a.pan(pan) : this.a.sfx; }
  swing(s) { this.a.noiseBurst({ type: 'bandpass', f: s.heavy ? 900 : 1500, fTo: s.heavy ? 300 : 600, q: 1.2, d: 0.12, peak: 0.18 }); }
  hit({ heavy, onBeat, pan }) {
    const o = this._p(pan);
    this.a.noiseBurst({ type: 'highpass', f: 2500, d: 0.06, peak: 0.35, out: o });
    this.a.tone(heavy ? 110 : 150, { type: 'sine', d: heavy ? 0.22 : 0.12, peak: heavy ? 0.6 : 0.4, glideTo: 50, out: o });
    this.a.noiseBurst({ type: 'bandpass', f: 5200, q: 3, d: 0.09, peak: 0.22, out: o });
  }
  catch(q, pan) { const o = this._p(pan); this.a.noiseBurst({ type: 'bandpass', f: 3000, q: 4, d: 0.05, peak: 0.45, out: o }); this.a.tone(q === 'perfect' ? 1320 : 990, { type: 'triangle', d: 0.18, peak: 0.12, out: o }); }
  parry(q, pan) { this.catch(q, pan); this.a.tone(70, { d: 0.25, peak: 0.5, glideTo: 40 }); }
  returnHit(pan) { this.hit({ heavy: true, pan }); }
  ringThrow() { this.a.noiseBurst({ type: 'bandpass', f: 1800, fTo: 900, q: 2, d: 0.18, peak: 0.15 }); }
  ringRecall() {}
  ringCatch() { this.a.noiseBurst({ type: 'highpass', f: 4000, d: 0.03, peak: 0.25 }); this.a.tone(660, { type: 'triangle', d: 0.05, peak: 0.06 }); }
  dash() { this.a.noiseBurst({ type: 'bandpass', f: 700, fTo: 1800, q: 0.8, d: 0.14, peak: 0.16 }); }
  nearMiss() { this.a.noiseBurst({ type: 'highpass', f: 6000, d: 0.12, peak: 0.2 }); this.a.tone(1760, { type: 'sine', d: 0.25, peak: 0.05 }); }
  hurt(pan) { const o = this._p(pan); this.a.tone(220, { type: 'sawtooth', d: 0.2, peak: 0.25, glideTo: 90, out: o }); this.a.noiseBurst({ type: 'lowpass', f: 900, d: 0.25, peak: 0.4, out: o }); }
  cue(kind, pan) { const o = this._p(pan); this.a.tone(kind === 'pink' ? 1046 : 1568, { type: 'sine', d: 0.04, peak: 0.04, out: o }); }
  fire(shape, pan) { const o = this._p(pan); this.a.noiseBurst({ type: 'bandpass', f: 2400, q: 2, d: 0.05, peak: 0.08, out: o }); }
  impactArea(kind, pan, hit) { const o = this._p(pan); this.a.tone(90, { d: 0.14, peak: 0.25, glideTo: 45, out: o }); this.a.noiseBurst({ type: 'lowpass', f: 1500, d: 0.12, peak: 0.2, out: o }); }
  wave() { this.a.noiseBurst({ type: 'lowpass', f: 600, d: 0.3, peak: 0.25 }); }
  beam() { this.a.tone(220, { type: 'sawtooth', d: 0.4, peak: 0.05 }); }
  break(pan) { const o = this._p(pan); this.a.noiseBurst({ type: 'highpass', f: 1800, d: 0.35, peak: 0.55, out: o }); this.a.tone(80, { d: 0.4, peak: 0.6, glideTo: 35, out: o }); }
  deflect(pan) { this.a.tone(180, { type: 'square', d: 0.06, peak: 0.08, out: this._p(pan) }); this.a.noiseBurst({ type: 'lowpass', f: 400, d: 0.08, peak: 0.25 }); }
  shatter(pan) { for (let i = 0; i < 6; i++) this.a.noiseBurst({ type: 'highpass', f: 2000 + i * 900, d: 0.6 + i * 0.25, peak: 0.25, at: i * 0.03 }); this.a.tone(55, { d: 1.2, peak: 0.6, glideTo: 30 }); }
  spotlight() { this.a.noiseBurst({ type: 'lowpass', f: 300, d: 0.3, peak: 0.6 }); this.a.tone(110, { d: 0.6, peak: 0.25 }); }
  death() {}
  rewind() {}
  empty() {}
  glimmer(root, q, step, level) {
    const third = q === 'maj' ? 4 : 3, iv = [0, third, 7, 12][step % 4];
    const f = 261.6256 * Math.pow(2, (root + iv) / 12) * 4; // two octaves up: a glimmer, not a melody
    this.a.tone(f, { type: 'sine', a: 0.002, d: 0.5 + level * 0.2, peak: 0.035 + level * 0.015 });
  }
  ui() {}
  applause() {}
}
