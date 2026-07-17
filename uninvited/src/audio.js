// All sound is synthesised: wind, thunder, creaks, whispers, footsteps,
// a heartbeat, a spectral piano. No audio files exist.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.started = false;
    this.heartbeatOn = false;
    this._hbTimer = null;
    this._creakTimer = null;
  }

  start() {
    if (this.started) return;
    this.started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    this.startWind();
    this.startRain();
    this.startDrone();
    this.scheduleCreaks();
  }

  startRain() {
    // steady rain on the roof and windows — high hiss with a slow swell
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(3);
    src.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1700;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 6800;
    const g = this.ctx.createGain();
    g.gain.value = 0.02;
    src.connect(hp).connect(lp).connect(g).connect(this.master);
    src.start();
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lg = this.ctx.createGain();
    lg.gain.value = 0.006;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
    this.rainGain = g;
    this.rainLfoGain = lg;
  }

  now() { return this.ctx.currentTime; }

  noiseBuffer(seconds = 2) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ---------- beds ---------- */

  startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 300;
    bp.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(bp).connect(g).connect(this.master);
    src.start();
    // slow gusting
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lg = this.ctx.createGain();
    lg.gain.value = 0.028;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
    this.windLfoGain = lg;   // dawn() must ramp this too, or the gusts outlive the wind
    const lfo2 = this.ctx.createOscillator();
    lfo2.frequency.value = 0.11;
    const lg2 = this.ctx.createGain();
    lg2.gain.value = 90;
    lfo2.connect(lg2).connect(bp.frequency);
    lfo2.start();
    this.windGain = g;
  }

  startDrone() {
    // a very low, slightly beating pad — the house breathing. Kept subliminal.
    const g = this.ctx.createGain();
    g.gain.value = 0.016;
    for (const f of [55, 55.7, 82.4]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const og = this.ctx.createGain();
      og.gain.value = 0.33;
      o.connect(og).connect(g);
      o.start();
    }
    g.connect(this.master);
    this.droneGain = g;
  }

  scheduleCreaks() {
    const loop = () => {
      const delay = 9000 + Math.random() * 22000;
      this._creakTimer = setTimeout(() => { this.creak(0.35 + Math.random() * 0.4); loop(); }, delay);
    };
    loop();
  }

  /* ---------- one-shots ---------- */

  env(g, t0, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  creak(vol = 0.5) {
    if (!this.started) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = 90 + Math.random() * 160;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * (0.6 + Math.random() * 0.3), t + 0.7);
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 700;
    const g = this.ctx.createGain();
    this.env(g, t, 0.12, vol * 0.06, 0.8);
    o.connect(flt).connect(g).connect(this.master);
    o.start(t); o.stop(t + 1.1);
  }

  thunder(vol = 1) {
    if (!this.started) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(3.5);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(60, t + 2.8);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.12 * vol, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
  }

  footstep(running, level) {
    if (!this.started) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.12);
    const stoney = level === 'basement';
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = stoney ? 900 : 480;
    const g = this.ctx.createGain();
    this.env(g, t, 0.005, running ? 0.09 : 0.055, 0.09);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
    // wooden floors answer with a low knock
    if (!stoney) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(70 + Math.random() * 20, t);
      const og = this.ctx.createGain();
      this.env(og, t, 0.004, 0.05, 0.07);
      o.connect(og).connect(this.master);
      o.start(t); o.stop(t + 0.12);
    }
  }

  // a real hinge: a thin wavering squeak falling as the door swings, plus air
  doorOpen(heavy) {
    if (!this.started) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    // a heavy door groans low and slow; an ordinary one squeaks high
    if (heavy) {
      o.frequency.setValueAtTime(420 + Math.random() * 90, t);
      o.frequency.linearRampToValueAtTime(230 + Math.random() * 50, t + 0.8);
    } else {
      o.frequency.setValueAtTime(1150 + Math.random() * 250, t);
      o.frequency.linearRampToValueAtTime(700 + Math.random() * 120, t + 0.5);
    }
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 13;
    const vg = this.ctx.createGain();
    vg.gain.value = 42;
    vib.connect(vg).connect(o.frequency);
    const g = this.ctx.createGain();
    this.env(g, t, 0.05, 0.032, 0.55);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.7);
    vib.start(t); vib.stop(t + 0.7);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.6);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380;
    const g2 = this.ctx.createGain();
    this.env(g2, t, 0.12, 0.045, 0.45);
    src.connect(lp).connect(g2).connect(this.master);
    src.start(t);
  }
  doorClose(heavy) {
    if (!this.started) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = heavy ? 38 : 55;
    const g = this.ctx.createGain();
    this.env(g, t, 0.004, heavy ? 0.38 : 0.22, heavy ? 0.26 : 0.18);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + (heavy ? 0.45 : 0.25));
  }
  // a tap running into a basin — filtered noise with a slow wobble
  waterRun(dur = 1.4) {
    if (!this.started) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf || (this.noiseBuf = this.makeNoise?.() || null);
    if (!src.buffer) {
      const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b; src.buffer = b;
    }
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 1.1;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 6;
    const lg = this.ctx.createGain(); lg.gain.value = 220;
    lfo.connect(lg).connect(bp.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.12);
    g.gain.setValueAtTime(0.08, t + dur - 0.25);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  // a dog whining behind a door — thin sine sweeps with vibrato
  whineDog() {
    if (!this.started) return;
    const t = this.now();
    for (const [dt, f0, f1, dur] of [[0, 620, 880, 0.5], [0.75, 700, 520, 0.42]]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t + dt);
      o.frequency.linearRampToValueAtTime(f1, t + dt + dur);
      const vib = this.ctx.createOscillator(); vib.frequency.value = 9;
      const vg = this.ctx.createGain(); vg.gain.value = 22;
      vib.connect(vg).connect(o.frequency);
      const g = this.ctx.createGain();
      this.env(g, t + dt, 0.06, dur * 0.7, 0.05);
      o.connect(g).connect(this.master);
      o.start(t + dt); o.stop(t + dt + dur + 0.1);
      vib.start(t + dt); vib.stop(t + dt + dur + 0.1);
    }
  }
  // one tick-tock pair of a hall clock
  tick() {
    if (!this.started) return;
    const t = this.now();
    for (const [dt, f] of [[0, 2100], [0.5, 1750]]) {
      const o = this.ctx.createOscillator();
      o.frequency.value = f;
      const g = this.ctx.createGain();
      this.env(g, t + dt, 0.001, 0.03, 0.07);
      o.connect(g).connect(this.master);
      o.start(t + dt); o.stop(t + dt + 0.06);
    }
  }
  // a page turned — one soft high swish
  pageTurn() {
    if (!this.started) return;
    const t = this.now();
    if (!this.noiseBuf) {
      const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2400;
    const g = this.ctx.createGain();
    this.env(g, t, 0.02, 0.1, 0.05);
    src.connect(hp).connect(g).connect(this.master);
    src.start(t); src.stop(t + 0.18);
  }
  // two soft knuckle-thumps from somewhere in the house
  knock() {
    if (!this.started) return;
    const t = this.now();
    for (const dt of [0, 0.18]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(95, t + dt);
      o.frequency.exponentialRampToValueAtTime(55, t + dt + 0.1);
      const g = this.ctx.createGain();
      this.env(g, t + dt, 0.003, 0.12, 0.22);
      o.connect(g).connect(this.master);
      o.start(t + dt); o.stop(t + dt + 0.16);
    }
  }
  doorSlam() {
    if (!this.started) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.4);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 250;
    const g = this.ctx.createGain();
    this.env(g, t, 0.005, 0.7, 0.35);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
    this.thunderRumbleTail(t);
  }
  thunderRumbleTail(t) {
    const o = this.ctx.createOscillator();
    o.frequency.value = 40;
    const g = this.ctx.createGain();
    this.env(g, t + 0.05, 0.01, 0.18, 0.9);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 1.2);
  }
  lockedRattle() {
    if (!this.started) return;
    for (let i = 0; i < 3; i++) {
      const t = this.now() + i * 0.09;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer(0.05);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2200;
      const g = this.ctx.createGain();
      this.env(g, t, 0.003, 0.07, 0.05);
      src.connect(bp).connect(g).connect(this.master);
      src.start(t);
    }
  }
  unlock() {
    if (!this.started) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 1400;
    const g = this.ctx.createGain();
    this.env(g, t, 0.002, 0.05, 0.05);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.08);
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 300;
    const g2 = this.ctx.createGain();
    this.env(g2, t + 0.09, 0.004, 0.1, 0.12);
    o2.connect(g2).connect(this.master);
    o2.start(t + 0.09); o2.stop(t + 0.3);
  }
  metalDrop() {
    if (!this.started) return;
    const t = this.now();
    for (const [dt, f] of [[0, 2600], [0.12, 2200], [0.2, 2400]]) {
      const o = this.ctx.createOscillator();
      o.frequency.value = f;
      const g = this.ctx.createGain();
      this.env(g, t + dt, 0.002, 0.04, 0.08);
      o.connect(g).connect(this.master);
      o.start(t + dt); o.stop(t + dt + 0.12);
    }
  }
  stoneGrind() {
    if (!this.started) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2.2);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(120, t);
    bp.frequency.linearRampToValueAtTime(200, t + 1.8);
    bp.Q.value = 2;
    const g = this.ctx.createGain();
    this.env(g, t, 0.3, 0.25, 1.8);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
  }

  whisper() {
    if (!this.started) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(1.6);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1200, t);
    bp.frequency.linearRampToValueAtTime(2400, t + 0.5);
    bp.frequency.linearRampToValueAtTime(900, t + 1.4);
    bp.Q.value = 8;
    const g = this.ctx.createGain();
    // syllable-ish pulses
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 6; i++) {
      const tt = t + i * 0.22;
      g.gain.exponentialRampToValueAtTime(0.05, tt + 0.08);
      g.gain.exponentialRampToValueAtTime(0.004, tt + 0.2);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
  }

  // a voice through the walls — low, muffled, wordless. In hindsight: people
  // talking. pitch ~0.7 (a man) .. 1.7 (a child).
  murmur(pitch = 1) {
    if (!this.started) return;
    const t = this.now();
    const f0 = 150 * pitch;
    // two detuned voices through a heavy wall (lowpass)
    const o1 = this.ctx.createOscillator(); o1.type = 'triangle';
    const o2 = this.ctx.createOscillator(); o2.type = 'sine';
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 460; lp.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    o1.frequency.setValueAtTime(f0, t);
    o2.frequency.setValueAtTime(f0 * 2.01, t);
    // syllables: gentle pitch drifts with swells, like speech heard from another room
    const syll = 3 + Math.floor(Math.random() * 3);
    let tt = t;
    for (let i = 0; i < syll; i++) {
      const dur = 0.15 + Math.random() * 0.12;
      const drift = f0 * (0.86 + Math.random() * 0.34);
      o1.frequency.linearRampToValueAtTime(drift, tt + dur);
      o2.frequency.linearRampToValueAtTime(drift * 2.01, tt + dur);
      g.gain.exponentialRampToValueAtTime(0.042, tt + dur * 0.4);
      g.gain.exponentialRampToValueAtTime(0.005, tt + dur);
      tt += dur + 0.05;
    }
    // sentences fall at the end
    o1.frequency.linearRampToValueAtTime(f0 * 0.78, tt + 0.16);
    o2.frequency.linearRampToValueAtTime(f0 * 1.56, tt + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.22);
    o1.connect(lp); o2.connect(lp);
    lp.connect(g).connect(this.master);
    o1.start(t); o2.start(t);
    o1.stop(tt + 0.3); o2.stop(tt + 0.3);
  }

  // a child's laugh, far away — three small falling notes, muffled
  giggle() {
    if (!this.started) return;
    const t = this.now();
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.14;
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(620 - i * 55, tt);
      o.frequency.exponentialRampToValueAtTime(470 - i * 45, tt + 0.09);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = this.ctx.createGain();
      this.env(g, tt, 0.012, 0.032, 0.1);
      o.connect(lp).connect(g).connect(this.master);
      o.start(tt); o.stop(tt + 0.18);
    }
  }

  // a television waking to static: stuttering hiss over a mains hum
  static(vol = 0.13, dur = 1.0) {
    if (!this.started) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur + 0.3);
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1300;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 7; i++) {
      const tt = t + i * (dur / 7);
      g.gain.setValueAtTime(vol * (0.35 + Math.random() * 0.65), tt);
      g.gain.exponentialRampToValueAtTime(0.003, tt + (dur / 7) * 0.85);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(g).connect(this.master); src.start(t);
    const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
    const olp = this.ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 260;
    const og = this.ctx.createGain(); this.env(og, t, 0.02, vol * 0.5, dur);
    o.connect(olp).connect(og).connect(this.master); o.start(t); o.stop(t + dur + 0.1);
  }

  // a music box, somewhere upstairs — a short, slightly out-of-tune lullaby in
  // bell tones. Volume is set by the caller from distance to the far bedroom.
  musicBox(vol = 0.15) {
    if (!this.started || vol < 0.006) return;
    const t = this.now();
    const notes = [0, 3, 7, 5, 3, 0, -2, 0];      // minor-ish phrase, semitone offsets
    const base = 523.25;                          // C5
    notes.forEach((n, i) => {
      const tt = t + i * 0.34;
      const f = base * Math.pow(2, n / 12) * (1 + (Math.random() - 0.5) * 0.008);   // detune = wrong
      for (const [mult, g0] of [[1, 1], [2.01, 0.4], [3.0, 0.16]]) {                 // bell partials
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mult;
        const g = this.ctx.createGain();
        this.env(g, tt, 0.004, vol * g0, 0.5);
        o.connect(g).connect(this.master); o.start(tt); o.stop(tt + 0.65);
      }
    });
  }

  // the whole house comes on at once: breaker THUNK, relay clack, mains hum
  lightsOn() {
    if (!this.started) return;
    const t = this.now();
    // breaker thunk
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const g = this.ctx.createGain();
    this.env(g, t, 0.004, 0.6, 0.28);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.5);
    // relay clack
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.12);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1800;
    const g2 = this.ctx.createGain();
    this.env(g2, t, 0.001, 0.22, 0.07);
    src.connect(hp).connect(g2).connect(this.master);
    src.start(t);
    // mains hum swells in, then settles under everything
    const hum = this.ctx.createOscillator();
    hum.type = 'sawtooth'; hum.frequency.value = 100;
    const hlp = this.ctx.createBiquadFilter();
    hlp.type = 'lowpass'; hlp.frequency.value = 320;
    const hg = this.ctx.createGain();
    hg.gain.setValueAtTime(0.0001, t + 0.06);
    hg.gain.exponentialRampToValueAtTime(0.04, t + 0.5);
    hg.gain.exponentialRampToValueAtTime(0.011, t + 3.2);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    hum.connect(hlp).connect(hg).connect(this.master);
    hum.start(t + 0.06); hum.stop(t + 6.1);
  }

  // "someone is right there" — a low sub-swell under a sharp breath-transient.
  presence() {
    if (!this.started) return;
    const t = this.now();
    // sub swell
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(72, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.9);
    const g = this.ctx.createGain();
    this.env(g, t, 0.02, 0.5, 0.95);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 1.2);
    // sharp close transient (a caught breath)
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.5);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 1.6;
    const g2 = this.ctx.createGain();
    this.env(g2, t, 0.006, 0.14, 0.28);
    src.connect(bp).connect(g2).connect(this.master);
    src.start(t);
  }

  ghostChord(vol = 0.14) {
    if (!this.started) return;
    const t = this.now();
    for (const f of [220, 261.6, 311.1, 466.2]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * 0.5;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol / 4, t + 2.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + 7.2);
    }
  }

  pianoNote(freq = 392, vol = 0.2) {
    if (!this.started) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.001;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2).connect(g);
    g.connect(this.master);
    o.start(t); o.stop(t + 2.8);
    o2.start(t); o2.stop(t + 2.8);
  }

  // "Lavender's Blue" fragment, slow and wrong
  lavenders() {
    if (!this.started) return;
    const notes = [392, 392, 349.2, 392, 440, 466.2, 440, 392];
    notes.forEach((f, i) => {
      setTimeout(() => this.pianoNote(f, 0.12), i * 650 + Math.random() * 120);
    });
  }

  heartbeat(on) {
    if (!this.started) return;
    if (on === this.heartbeatOn) return;
    this.heartbeatOn = on;
    if (!on) { clearTimeout(this._hbTimer); return; }
    const beat = () => {
      if (!this.heartbeatOn) return;
      const t = this.now();
      for (const dt of [0, 0.18]) {
        const o = this.ctx.createOscillator();
        o.frequency.value = 48;
        const g = this.ctx.createGain();
        this.env(g, t + dt, 0.01, dt === 0 ? 0.4 : 0.25, 0.16);
        o.connect(g).connect(this.master);
        o.start(t + dt); o.stop(t + dt + 0.3);
      }
      this._hbTimer = setTimeout(beat, 780);
    };
    beat();
  }

  bell() {
    if (!this.started) return;
    const t = this.now();
    for (const [f, v] of [[660, 0.08], [1320, 0.03], [1980, 0.015]]) {
      const o = this.ctx.createOscillator();
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.01);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + 3.6);
    }
  }

  dawn() {
    // the ending: wind dies, drone resolves upward
    if (!this.started) return;
    const t = this.now();
    this.windGain?.gain.linearRampToValueAtTime(0.008, t + 6);
    this.windLfoGain?.gain.linearRampToValueAtTime(0.002, t + 6);  // still the gusts too
    this.droneGain?.gain.linearRampToValueAtTime(0.0, t + 8);
    // the rain stays — softer. The dread was never real; the rain always was.
    this.rainGain?.gain.linearRampToValueAtTime(0.012, t + 6);
    this.rainLfoGain?.gain.linearRampToValueAtTime(0.002, t + 6);
    clearTimeout(this._creakTimer);
    for (const [f, dt] of [[261.6, 0], [329.6, 1.2], [392, 2.4], [523.2, 4.0]]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.05, t + dt + 2.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 9);
      o.connect(g).connect(this.master);
      o.start(t + dt); o.stop(t + dt + 9.2);
    }
  }
}
