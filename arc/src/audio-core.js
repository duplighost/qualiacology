// Audio substrate. 100% synthesized WebAudio, zero sample files (house standard).
// Buses: master -> compressor -> destination. music (dry, cuttable) + musicSend (delay tail
// that rings after a hard cut, the RALLY rule), fx, ambient. A 16th-note lookahead scheduler
// drives a caller-supplied step callback so a game can author its own music law.
export class AudioCore {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.layers = {};
    this.step = 0;
    this.bar = 0;
    this.bpm = 112;
    this.next16 = 0;
    this.playing = false;
    this.onStep = null;
    this.onBar = null;
    this._timer = null;
    this._musicLevel = 1;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  init() {
    if (this.ctx) return this.ctx;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4; this.comp.attack.value = 0.004; this.comp.release.value = 0.24;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);

    this.fx = ctx.createGain(); this.fx.gain.value = 0.85; this.fx.connect(this.master);
    this.ambient = ctx.createGain(); this.ambient.gain.value = 0.7; this.ambient.connect(this.master);

    this.musicDry = ctx.createGain(); this.musicDry.gain.value = 1; this.musicDry.connect(this.master);
    this.musicSend = ctx.createGain(); this.musicSend.gain.value = 0.32;
    this.delay = ctx.createDelay(1.5); this.delay.delayTime.value = 0.31;
    this.delayFb = ctx.createGain(); this.delayFb.gain.value = 0.5;
    this.delayFilter = ctx.createBiquadFilter(); this.delayFilter.type = 'lowpass'; this.delayFilter.frequency.value = 1700;
    this.musicSend.connect(this.delay); this.delay.connect(this.delayFilter); this.delayFilter.connect(this.delayFb);
    this.delayFb.connect(this.delay); this.delayFilter.connect(this.master);

    // spatial listener lives at the camera; games update it per frame
    this.listener = ctx.listener;

    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.now, 0.03);
  }

  layer(name, initial = 0) {
    if (this.layers[name]) return this.layers[name];
    const g = this.ctx.createGain(); g.gain.value = initial;
    g.connect(this.musicDry); g.connect(this.musicSend);
    this.layers[name] = g;
    return g;
  }

  setLayer(name, level, tc = 0.12) {
    const g = this.layers[name] || this.layer(name);
    g.gain.setTargetAtTime(level * this._musicLevel, this.now, tc);
  }

  setMusicLevel(level, tc = 0.2) {
    this._musicLevel = level;
    this.musicDry.gain.setTargetAtTime(level, this.now, tc);
  }

  // ---- primitives -------------------------------------------------------
  tone(t, freq, { type = 'sine', peak = 0.2, a = 0.005, dec = 0.3, dest = null, detune = 0, sustain = 0, rel = 0.08, pan = null, freqEnd = null, tcut = 0.0 } = {}) {
    const ctx = this.ctx; if (!ctx) return null;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dec);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    if (sustain > 0) {
      g.gain.setValueAtTime(peak, t + a + sustain);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + sustain + rel);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    }
    o.connect(g);
    let out = g;
    if (pan !== null && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; }
    out.connect(dest || this.fx);
    o.start(t); o.stop(t + a + (sustain > 0 ? sustain + rel : dec) + 0.05);
    return o;
  }

  noise(t, { peak = 0.2, a = 0.002, dec = 0.15, freq = 1200, q = 0.7, type = 'bandpass', dest = null, rate = 1, pan = null, freqEnd = null } = {}) {
    const ctx = this.ctx; if (!ctx) return null;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dec);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    s.connect(f); f.connect(g);
    let out = g;
    if (pan !== null && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; }
    out.connect(dest || this.fx);
    s.start(t); s.stop(t + a + dec + 0.05);
    return s;
  }

  // A held drone you can steer: returns {set(freq, gain, tc), stop()}
  drone({ type = 'sawtooth', freq = 55, gain = 0, dest = null, lp = 600 } = {}) {
    const ctx = this.ctx; if (!ctx) return { set() {}, stop() {} };
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = gain;
    o.connect(f); f.connect(g); g.connect(dest || this.ambient); o.start();
    return {
      set: (hz, level, tc = 0.05, cutoff = null) => { o.frequency.setTargetAtTime(hz, ctx.currentTime, tc); g.gain.setTargetAtTime(level, ctx.currentTime, tc); if (cutoff) f.frequency.setTargetAtTime(cutoff, ctx.currentTime, tc); },
      stop: () => { g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => { try { o.stop(); } catch { /* */ } }, 400); },
      osc: o, gain: g, filter: f,
    };
  }

  // ---- scheduler -----------------------------------------------------------
  startClock() {
    if (!this.ctx) return;
    this.playing = true;
    this.next16 = this.ctx.currentTime + 0.05;
    this.step = 0; this.bar = 0;
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => this._schedule(), 25);
  }

  stopClock() { this.playing = false; if (this._timer) clearInterval(this._timer); this._timer = null; }

  _schedule() {
    if (!this.playing || !this.ctx) return;
    const spb = 60 / this.bpm / 4; // seconds per 16th
    while (this.next16 < this.ctx.currentTime + 0.12) {
      const t = this.next16;
      if (this.onStep) this.onStep(t, this.step % 16, this.bar, spb);
      this.step++;
      if (this.step % 16 === 0) { this.bar++; if (this.onBar) this.onBar(this.bar, t); }
      this.next16 += spb;
    }
  }

  // Hard cut the dry music; the delay tail rings on. RALLY's rule.
  hardCut(tc = 0.02) {
    if (!this.ctx) return;
    for (const g of Object.values(this.layers)) g.gain.setTargetAtTime(0, this.now, tc);
  }
}

export const NOTE = (semi, base = 440) => base * Math.pow(2, semi / 12);
export const SCALES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minorPent: [0, 3, 5, 7, 10],
  majorPent: [0, 2, 4, 7, 9],
};
export function degreeToSemi(scale, degree, octave = 0) {
  const n = scale.length;
  const d = ((degree % n) + n) % n;
  const o = Math.floor(degree / n) + octave;
  return scale[d] + o * 12;
}
