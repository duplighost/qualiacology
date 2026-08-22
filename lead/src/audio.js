/* WebAudio kit: buses, a limiter, a real convolver reverb built from noise,
 * a tempo-locked lookahead scheduler, and a small set of synth voices.
 *
 * Everything is procedural — no files to load, nothing to go missing. The
 * scheduler runs on audioContext time, not rAF, so the music does not stutter
 * when a frame is long. */

export class Audio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.bus = {};
    this.tempo = 96;          // bpm
    this.step = 0;            // 16th-note counter since start
    this.nextTime = 0;
    this.lookahead = 0.10;    // seconds scheduled ahead
    this._timer = null;
    this._layers = [];        // {gain, fn(step, time)}
  }

  /* Browsers require a gesture. Call from the first key/click. */
  boot() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8; limiter.knee.value = 6;
    limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.18;

    const master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(limiter); limiter.connect(ctx.destination);
    this.master = master;

    /* Reverb: a decaying noise burst is a perfectly good hall. */
    const verb = ctx.createConvolver();
    verb.buffer = this._impulse(2.6, 2.4);
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.9;
    verb.connect(verbGain); verbGain.connect(master);
    this.verb = verb;

    /* A tempo-synced delay for anything that wants to trail. */
    const dly = ctx.createDelay(1.5);
    dly.delayTime.value = 60 / this.tempo * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.36;
    const dampen = ctx.createBiquadFilter();
    dampen.type = 'lowpass'; dampen.frequency.value = 2400;
    dly.connect(dampen); dampen.connect(fb); fb.connect(dly);
    const dlyOut = ctx.createGain(); dlyOut.gain.value = 0.8;
    dly.connect(dlyOut); dlyOut.connect(master);
    this.delay = dly;

    for (const name of ['music', 'sfx', 'world']) {
      const g = ctx.createGain(); g.gain.value = 1; g.connect(master);
      const send = ctx.createGain(); send.gain.value = 0.16; g.connect(send); send.connect(verb);
      this.bus[name] = { gain: g, send };
    }
    this.bus.music.send.gain.value = 0.24;

    this.ready = true;
    this.nextTime = ctx.currentTime + 0.06;
    this._tick();
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        /* Slight pre-delay shaping keeps it from sounding like a gunshot. */
        const env = Math.pow(1 - t, decay) * Math.min(1, t * 60);
        d[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return buf;
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }
  spb() { return 60 / this.tempo; }

  setTempo(bpm) {
    this.tempo = bpm;
    if (this.delay) this.delay.delayTime.value = 60 / bpm * 0.75;
  }

  /* --- scheduler ------------------------------------------------------- */

  addLayer(fn, volume = 1) {
    if (!this.ctx) return null;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(this.bus.music.gain);
    const L = { gain: g, fn, target: volume, on: false };
    this._layers.push(L);
    return L;
  }

  layerOn(L, seconds = 0.6, level = null) {
    if (!L || !this.ctx) return;
    L.on = true;
    const v = level == null ? L.target : level;
    L.gain.gain.cancelScheduledValues(this.now());
    L.gain.gain.setTargetAtTime(v, this.now(), seconds / 3);
  }

  layerOff(L, seconds = 0.5) {
    if (!L || !this.ctx) return;
    L.on = false;
    L.gain.gain.cancelScheduledValues(this.now());
    L.gain.gain.setTargetAtTime(0, this.now(), seconds / 3);
  }

  /* Cut every layer immediately (dry death), leaving reverb/delay tails. */
  cutMusic() {
    for (const L of this._layers) {
      L.on = false;
      L.gain.gain.cancelScheduledValues(this.now());
      L.gain.gain.setValueAtTime(L.gain.gain.value, this.now());
      L.gain.gain.linearRampToValueAtTime(0, this.now() + 0.02);
    }
  }

  _tick() {
    if (!this.ctx) return;
    const sixteenth = this.spb() / 4;
    while (this.nextTime < this.ctx.currentTime + this.lookahead) {
      for (const L of this._layers) {
        if (L.on) { try { L.fn(this.step, this.nextTime, L.gain); } catch (e) { /* keep the clock */ } }
      }
      this.step++;
      this.nextTime += sixteenth;
    }
    this._timer = setTimeout(() => this._tick(), 25);
  }

  /* --- voices ---------------------------------------------------------- */

  /* All voices take an explicit start time so they can be scheduled ahead. */

  /* Every voice reaches its bus through here, so a sound can be placed in the
   * field without four copies of the same three lines. The dog is the only
   * thing in this game that gets away from you; the ear should know when it
   * has. Equal-power, so folding down to a phone speaker loses nothing. */
  _out(node, dest, bus, pan) {
    const to = dest || this.bus[bus].gain;
    if (!pan) { node.connect(to); return; }
    const sp = this.ctx.createStereoPanner();
    sp.pan.value = pan < -1 ? -1 : pan > 1 ? 1 : pan;
    node.connect(sp); sp.connect(to);
  }

  tone(t, {
    freq = 440, dur = 0.25, type = 'triangle', gain = 0.3, bus = 'sfx',
    attack = 0.004, release = null, detune = 0, glide = 0, filter = null, dest = null, pan = 0
  } = {}) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t + dur);
    const g = ctx.createGain();
    const rel = release == null ? dur * 0.9 : release;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + rel);
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.setValueAtTime(filter.freq || 1200, t);
      if (filter.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, filter.to), t + dur);
      f.Q.value = filter.q || 1;
      node.connect(f); node = f;
    }
    node.connect(g);
    this._out(g, dest, bus, pan);
    o.start(t); o.stop(t + attack + rel + 0.05);
    return g;
  }

  noise(t, {
    dur = 0.2, gain = 0.3, bus = 'sfx', type = 'lowpass',
    freq = 1800, to = null, q = 1, attack = 0.002, dest = null, pan = 0
  } = {}) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); this._out(g, dest, bus, pan);
    s.start(t); s.stop(t + dur + 0.02);
    return g;
  }

  /* A struck-string-ish pluck: two detuned saws through a falling filter. */
  pluck(t, freq, { gain = 0.22, dur = 0.7, bus = 'music', bright = 5, dest = null, pan = 0 } = {}) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(freq * bright + 400, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 1.2), t + dur * 0.7);
    for (const det of [-6, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.detune.value = det;
      o.frequency.setValueAtTime(freq, t);
      o.connect(f); o.start(t); o.stop(t + dur + 0.05);
    }
    f.connect(g); this._out(g, dest, bus, pan);
    return g;
  }

  /* A bell/glass tone: inharmonic partials, long tail. */
  bell(t, freq, { gain = 0.16, dur = 2.2, bus = 'music', dest = null, pan = 0 } = {}) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const out = ctx.createGain(); out.gain.value = 1;
    this._out(out, dest, bus, pan);
    const partials = [[1, 1], [2.01, 0.5], [3.01, 0.28], [4.17, 0.16], [5.43, 0.1]];
    for (const [mul, amp] of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = freq * mul;
      const g = ctx.createGain();
      const d = dur * (1 - 0.11 * Math.log2(mul + 1));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * amp), t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + d + 0.05);
    }
    return out;
  }

  kick(t, { gain = 0.7, freq = 150, dur = 0.32, bus = 'music' } = {}) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(38, t + dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.bus[bus].gain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /* Immediate one-shots for gameplay: schedule at "now + a hair". */
  fire(name, opts) { const f = this[name]; if (f) f.call(this, this.now() + 0.005, opts); }

  duck(bus, amount = 0.4, seconds = 0.35) {
    if (!this.ready) return;
    const g = this.bus[bus].gain.gain;
    g.cancelScheduledValues(this.now());
    g.setValueAtTime(g.value, this.now());
    g.linearRampToValueAtTime(amount, this.now() + 0.03);
    g.setTargetAtTime(1, this.now() + 0.05, seconds / 3);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.now(), 0.05);
  }
}

/* Equal temperament from a MIDI-ish note number, A4 = 69 = 440Hz. */
export const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
