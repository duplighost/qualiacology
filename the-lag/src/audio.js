// Procedural audio. No files. The core trick: a feedback-delay "space" whose tail
// LENGTHENS as the lag grows, so the room audibly gets bigger and wronger before
// you consciously see it. Your footsteps go dry-and-wet; the wet copy IS the double.
export class Audio {
  constructor() {
    this.ctx = null; this.master = null; this.enabled = false;
    this._lag = 0.22; this._boxTimer = 0; this._boxDetune = 0;
    this.space = null; this.drone = null; this.lantern = null;
    this._silence = 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    this.enabled = true;
    this._buildSpace();
    this._buildDrone();
    this._buildLantern();
  }
  now() { return this.ctx ? this.ctx.currentTime : 0; }

  _noiseBuf(dur) {
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- the "space": a feedback delay that grows with lag ----
  _buildSpace() {
    const send = this.ctx.createGain(); send.gain.value = 1;
    const delay = this.ctx.createDelay(3.0); delay.delayTime.value = 0.22;
    const fb = this.ctx.createGain(); fb.gain.value = 0.35;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    const wet = this.ctx.createGain(); wet.gain.value = 0.6;
    send.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(this.master);
    this.space = { send, delay, fb, lp, wet };
  }

  _buildDrone() {
    const t = this.now();
    const g = this.ctx.createGain(); g.gain.value = 0.06; g.connect(this.master);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.connect(g);
    const o1 = this.ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 38.9;
    const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 49;
    o1.connect(lp); o2.connect(lp); o1.start(t); o2.start(t);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 40;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(t);
    this.drone = { g, lp, o1, o2 };
  }

  _buildLantern() {
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(2.0); src.loop = true;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.value = 0.015;
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(this.now());
    this.lantern = { src, bp, g, base: 0.015 };
  }

  // dry click + wet echo (the wet copy is the reflection's footstep)
  footstep(strength = 1) {
    if (!this.enabled) return;
    const t = this.now();
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(0.05);
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 240 + Math.random() * 60; bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * strength, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(bp); bp.connect(g); g.connect(this.master); g.connect(this.space.send);
    src.start(t); src.stop(t + 0.1);
  }

  flare() {
    if (!this.enabled) return;
    const t = this.now();
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(3200, t + 0.05);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.16);
  }

  groan() { // a mirror about to diverge — a fair, learnable warning
    if (!this.enabled) return;
    const t = this.now();
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(52, t + 1.1);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(lp); lp.connect(g); g.connect(this.master); g.connect(this.space.send); o.start(t); o.stop(t + 1.25);
  }

  // detuning celesta from decaying sine partials
  musicBox() {
    if (!this.enabled) return;
    this._boxTimer = 25; this._boxDetune = 0;
    const notes = [0, 4, 7, 11, 12, 7, 4, 0, 2, 5, 9, 4];
    const base = 523.25;
    let t = this.now() + 0.05;
    for (let i = 0; i < notes.length; i++) {
      const detune = 1 - i * 0.004; // flattens over the phrase
      const f = base * Math.pow(2, notes[i] / 12) * detune;
      this._chime(f, t, 0.5, 0.05);
      t += 0.34 + i * 0.01; // slows down
    }
  }
  _chime(freq, t, dur, peak) {
    for (let p = 1; p <= 3; p++) {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * p;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak / p, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1.2 - p * 0.2));
      o.connect(g); g.connect(this.master); g.connect(this.space.send);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }

  shatter() {
    if (!this.enabled) return;
    const t = this.now();
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(0.6);
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    src.connect(hp); hp.connect(g); g.connect(this.master); g.connect(this.space.send);
    src.start(t); src.stop(t + 0.6);
    for (let i = 0; i < 5; i++) {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1400 + Math.random() * 2600;
      const og = this.ctx.createGain(); og.gain.setValueAtTime(0.06, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.3 + Math.random() * 0.3);
      o.connect(og); og.connect(this.master); o.start(t); o.stop(t + 0.7);
    }
  }

  // a second, colder lantern hum for the escaped double (call once on break-out)
  spawnColdHum() {
    if (!this.enabled || this._cold) return;
    const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf(2.0); src.loop = true;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 640; bp.Q.value = 1.1;
    const g = this.ctx.createGain(); g.gain.value = 0.0001;
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(this.now());
    this._cold = { src, bp, g };
  }
  setColdNear(x) { // 0..1 how close the double is
    if (this._cold) this._cold.g.gain.setTargetAtTime(0.002 + 0.05 * x, this.now(), 0.2);
  }

  // silence just before the reflection does something wrong
  hush(dur = 0.5) { this._silence = dur; }

  setLag(sec) { this._lag = sec; }
  setLanternOpen(x) { if (this.lantern) this.lantern.g.gain.setTargetAtTime(this.lantern.base * (0.15 + 0.85 * x), this.now(), 0.08); }

  update(dt) {
    if (!this.enabled) return;
    // space grows with lag
    const lag = this._lag;
    if (this.space) {
      this.space.delay.delayTime.setTargetAtTime(Math.min(1.4, 0.16 + lag * 0.42), this.now(), 0.3);
      this.space.fb.gain.setTargetAtTime(Math.min(0.72, 0.3 + lag * 0.16), this.now(), 0.3);
      this.space.wet.gain.setTargetAtTime(0.4 + lag * 0.12, this.now(), 0.3);
    }
    // silence duck
    if (this._silence > 0) {
      this._silence -= dt;
      if (this.drone) this.drone.g.gain.setTargetAtTime(0.0005, this.now(), 0.04);
    } else if (this.drone) {
      this.drone.g.gain.setTargetAtTime(0.06, this.now(), 0.4);
    }
    if (this._boxTimer > 0) this._boxTimer -= dt;
  }
}
