// audio.js — every sound here is synthesised from the state of the fire.
// No samples: noise through filters for the flame and the weather, a procedural
// impulse response for the room, and struck bells for the things you light.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const MODE = {
  strike: { root: 73.42, fifth: 1.5, colour: 0.30 },   // D2
  house: { root: 110.0, fifth: 1.5, colour: 0.42 },   // A2
  cellar: { root: 97.999, fifth: 1.5, colour: 0.20 },   // G2
  flue: { root: 110.0, fifth: 1.5, colour: 0.55 },
  storm: { root: 82.407, fifth: 1.5, colour: 0.36 },   // E2
  hands: { root: 73.42, fifth: 1.5, colour: 0.16 },
};
const PENTA = [1, 1.2, 1.3333, 1.5, 1.8, 2, 2.4, 2.6667, 3, 3.6];

export class Audio {
  constructor() {
    this.ok = false;
    this.ctx = null;
    this.started = false;
    this.master = null;
    this.muted = false;
    this.bellIndex = 0;
    this._crackleDebt = 0;
    this._lastFire = 0;
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  start() {
    if (this.started) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch { return; }
    this.started = true;
    const ctx = this.ctx;

    this.master = ctx.createGain(); this.master.gain.value = 0.0;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -9; this.limiter.knee.value = 12;
    this.limiter.ratio.value = 8; this.limiter.attack.value = 0.004; this.limiter.release.value = 0.22;
    this.master.connect(this.limiter).connect(ctx.destination);

    // ── room
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._ir(2.6, 0.62);
    this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.34;
    this.verb.connect(this.verbGain).connect(this.master);
    this.dry = ctx.createGain(); this.dry.gain.value = 1.0;
    this.dry.connect(this.master);
    this.send = (n, amt = 1) => { const g = ctx.createGain(); g.gain.value = amt; n.connect(g); g.connect(this.verb); };

    // ── noise source shared by flame, wind and breath
    this.noise = ctx.createBufferSource();
    this.noise.buffer = this._noise(5.0);
    this.noise.loop = true;
    this.noise.start();

    // flame body
    this.fireBP = ctx.createBiquadFilter(); this.fireBP.type = 'bandpass';
    this.fireBP.frequency.value = 520; this.fireBP.Q.value = 0.9;
    this.fireGain = ctx.createGain(); this.fireGain.gain.value = 0;
    this.noise.connect(this.fireBP).connect(this.fireGain).connect(this.dry);
    this.send(this.fireGain, 0.5);

    // deep roar under a big fire
    this.roarLP = ctx.createBiquadFilter(); this.roarLP.type = 'lowpass';
    this.roarLP.frequency.value = 150; this.roarLP.Q.value = 3.2;
    this.roarGain = ctx.createGain(); this.roarGain.gain.value = 0;
    this.noise.connect(this.roarLP).connect(this.roarGain).connect(this.dry);

    // wind
    this.windBP = ctx.createBiquadFilter(); this.windBP.type = 'bandpass';
    this.windBP.frequency.value = 700; this.windBP.Q.value = 1.6;
    this.windBP2 = ctx.createBiquadFilter(); this.windBP2.type = 'bandpass';
    this.windBP2.frequency.value = 1900; this.windBP2.Q.value = 3.0;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    this.windPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    this.noise.connect(this.windBP).connect(this.windGain);
    this.noise.connect(this.windBP2).connect(this.windGain);
    if (this.windPan) this.windGain.connect(this.windPan).connect(this.dry);
    else this.windGain.connect(this.dry);
    this.send(this.windGain, 0.4);

    // your breath, when you draw
    this.breathBP = ctx.createBiquadFilter(); this.breathBP.type = 'bandpass';
    this.breathBP.frequency.value = 900; this.breathBP.Q.value = 1.1;
    this.breathGain = ctx.createGain(); this.breathGain.gain.value = 0;
    this.noise.connect(this.breathBP).connect(this.breathGain).connect(this.dry);

    // rain
    this.rainHP = ctx.createBiquadFilter(); this.rainHP.type = 'highpass'; this.rainHP.frequency.value = 1400;
    this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
    this.noise.connect(this.rainHP).connect(this.rainGain).connect(this.dry);
    this.send(this.rainGain, 0.5);

    // ── drone
    this.droneGain = ctx.createGain(); this.droneGain.gain.value = 0;
    this.droneLP = ctx.createBiquadFilter(); this.droneLP.type = 'lowpass';
    this.droneLP.frequency.value = 620; this.droneLP.Q.value = 0.8;
    this.droneGain.connect(this.droneLP).connect(this.dry);
    this.send(this.droneGain, 0.75);
    this.drone = [];
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = i === 3 ? 'triangle' : 'sawtooth';
      const g = ctx.createGain(); g.gain.value = [0.34, 0.16, 0.10, 0.13][i];
      o.connect(g).connect(this.droneGain);
      o.start();
      this.drone.push({ o, g, ratio: [1, 1.5, 2.0, 4.0][i], detune: [0, 4, -5, 3][i] });
    }

    // ── a wordless voice, for the last movement
    this.voiceGain = ctx.createGain(); this.voiceGain.gain.value = 0;
    this.voiceGain.connect(this.dry); this.send(this.voiceGain, 1.1);
    this.voiceOsc = ctx.createOscillator(); this.voiceOsc.type = 'sawtooth';
    this.voiceAmp = ctx.createGain(); this.voiceAmp.gain.value = 0.09;
    this.voiceOsc.connect(this.voiceAmp);
    this.formants = [[620, 9], [1180, 11], [2600, 16]].map(([f, q]) => {
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q;
      this.voiceAmp.connect(b).connect(this.voiceGain);
      return b;
    });
    this.voiceOsc.start();

    // heartbeat when you are nearly out
    this.heart = ctx.createOscillator(); this.heart.type = 'sine'; this.heart.frequency.value = 48;
    this.heartGain = ctx.createGain(); this.heartGain.gain.value = 0;
    this.heart.connect(this.heartGain).connect(this.master);
    this.heart.start();
    this._heartPhase = 0;

    this.ok = true;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, ctx.currentTime, 0.6);
  }

  _noise(seconds) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.0990460;
        b1 = 0.96300 * b1 + w * 0.2965164;
        b2 = 0.57000 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.20;
      }
    }
    return buf;
  }

  _ir(seconds, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const env = Math.pow(1 - t, 2.4) * Math.exp(-t * decay * 5.5);
        d[i] = (Math.random() * 2 - 1) * env;
      }
      // a few early reflections give the space a size
      for (const [ms, a] of [[11, 0.5], [19, 0.38], [29, 0.3], [43, 0.22], [61, 0.16]]) {
        const k = Math.floor(ctx.sampleRate * ms * 0.001) + (c ? 37 : 0);
        if (k < n) d[k] += a;
      }
    }
    return buf;
  }

  setMovement(id) {
    if (!this.ok) return;
    const m = MODE[id] || MODE.house;
    this.mode = m;
    this.bellIndex = 0;
    const t = this.ctx.currentTime;
    for (const d of this.drone) {
      d.o.frequency.setTargetAtTime(m.root * d.ratio, t, 1.4);
      d.o.detune.setTargetAtTime(d.detune, t, 1.0);
    }
    this.voiceOsc.frequency.setTargetAtTime(m.root * 3, t, 1.2);
    this.droneLP.frequency.setTargetAtTime(380 + m.colour * 900, t, 1.5);
  }

  /** One struck bell, a step further up the mode each time. */
  bell(strength = 1, index = null) {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const i = index === null ? this.bellIndex++ : index;
    const base = (this.mode ? this.mode.root : 110) * 4 * PENTA[i % PENTA.length] * (i >= PENTA.length ? 2 : 1);
    const out = ctx.createGain(); out.gain.value = 0;
    out.connect(this.dry); this.send(out, 1.3);
    for (const [mul, amp, dur] of [[1, 0.30, 3.4], [2.01, 0.13, 2.0], [2.99, 0.08, 1.4], [5.43, 0.045, 0.9]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = base * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * strength, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + dur + 0.1);
    }
    out.gain.setValueAtTime(1, t);
    setTimeout(() => { try { out.disconnect(); } catch {} }, 4200);
  }

  /** A short filtered burst — a spit of sap, a spark landing. */
  crackle(strength = 1) {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise.buffer;
    src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = 700 + Math.random() * 3400; bp.Q.value = 4 + Math.random() * 10;
    const g = ctx.createGain();
    const dur = 0.03 + Math.random() * 0.09;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55 * strength * (0.4 + Math.random() * 0.9), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(bp).connect(g).connect(this.dry);
    this.send(g, 0.5);
    src.start(t, Math.random() * 4); src.stop(t + dur + 0.05);
    setTimeout(() => { try { g.disconnect(); } catch {} }, 400);
  }

  /** The whump when a whole surface catches. */
  flashover(strength = 1) {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise.buffer; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55 * strength, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.5);
    src.connect(lp).connect(g).connect(this.dry);
    this.send(g, 1.2);
    src.start(t, Math.random() * 3); src.stop(t + 1.6);
    const sub = ctx.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(90, t); sub.frequency.exponentialRampToValueAtTime(32, t + 0.9);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0, t);
    sg.gain.linearRampToValueAtTime(0.30 * strength, t + 0.03);
    sg.gain.exponentialRampToValueAtTime(0.0005, t + 1.2);
    sub.connect(sg).connect(this.master);
    sub.start(t); sub.stop(t + 1.3);
    setTimeout(() => { try { g.disconnect(); sg.disconnect(); } catch {} }, 2200);
  }

  /** The long fall when the ember goes out. */
  extinguish() {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise.buffer; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400, t); bp.frequency.exponentialRampToValueAtTime(240, t + 0.8);
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.34, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 1.0);
    src.connect(bp).connect(g).connect(this.dry); this.send(g, 1.4);
    src.start(t); src.stop(t + 1.1);
    setTimeout(() => { try { g.disconnect(); } catch {} }, 1600);
  }

  /**
   * @param s {fire, ember, wind, peril, breath, rain, voice, panning, dt}
   */
  update(s) {
    if (!this.ok) return;
    const ctx = this.ctx, t = ctx.currentTime, T = 0.10;
    const fire = clamp(s.fire, 0, 4);
    const ember = clamp(s.ember, 0, 1.5);

    this.fireGain.gain.setTargetAtTime(0.026 * fire + 0.030 * ember, t, T);
    this.fireBP.frequency.setTargetAtTime(360 + fire * 190 + ember * 210, t, T);
    this.fireBP.Q.setTargetAtTime(0.7 + Math.min(fire, 2) * 0.35, t, T);
    this.roarGain.gain.setTargetAtTime(0.055 * Math.max(0, fire - 0.5), t, 0.35);

    const w = clamp(s.wind / 130, 0, 1.6);
    this.windGain.gain.setTargetAtTime(0.030 * w * w, t, 0.14);
    this.windBP.frequency.setTargetAtTime(430 + w * 700, t, 0.2);
    this.windBP2.frequency.setTargetAtTime(1500 + w * 1500, t, 0.2);
    if (this.windPan) this.windPan.pan.setTargetAtTime(clamp(s.panning || 0, -1, 1), t, 0.2);

    this.breathGain.gain.setTargetAtTime(0.055 * clamp(s.breath, 0, 1), t, 0.07);
    this.breathBP.frequency.setTargetAtTime(620 + 900 * clamp(s.breath, 0, 1), t, 0.10);

    this.rainGain.gain.setTargetAtTime(0.020 * clamp(s.rain, 0, 1), t, 0.5);

    this.droneGain.gain.setTargetAtTime(0.055 + 0.030 * ember + 0.02 * clamp(s.peril, 0, 1), t, 0.9);
    this.voiceGain.gain.setTargetAtTime(0.42 * clamp(s.voice || 0, 0, 1), t, 1.6);

    // crackle rate follows how much is actually burning
    this._crackleDebt += (fire * 13 + ember * 3.5) * (s.dt || 0.016);
    let guard = 0;
    while (this._crackleDebt > 1 && guard++ < 6) { this._crackleDebt -= 1; this.crackle(0.35 + Math.min(fire, 2) * 0.3); }
    if (this._crackleDebt > 8) this._crackleDebt = 8;

    // heartbeat
    const peril = clamp(s.peril, 0, 1);
    if (peril > 0.05) {
      this._heartPhase += (s.dt || 0.016) * (0.85 + peril * 1.25);
      if (this._heartPhase >= 1) {
        this._heartPhase -= 1;
        const g = this.heartGain.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(0.0001, t);
        g.linearRampToValueAtTime(0.22 * peril, t + 0.035);
        g.exponentialRampToValueAtTime(0.0001, t + 0.34);
      }
    }
  }

  duck(amount, time = 0.5) {
    if (!this.ok || this.muted) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9 * amount, this.ctx.currentTime, time);
  }
  setMuted(m) {
    this.muted = m;
    if (this.ok) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.15);
  }
}
