// BREAKWATER: original score and sound design. Recorded layers: ../assets/audio/sources.json.
// Everything is local. An AudioContext is created only by the user's unlock gesture.

const TAU = Math.PI * 2;
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const FILES = [
  ...Array.from({ length: 4 }, (_, i) => `step-${i}.wav`),
  ...Array.from({ length: 3 }, (_, i) => `metal-${i}.ogg`),
  ...Array.from({ length: 3 }, (_, i) => `punch-${i}.ogg`),
  'glass-0.ogg', 'glass-1.ogg', 'cloth-0.ogg', 'cloth-1.ogg',
];

// Four-chord, eight-bar phrases; each district has its own harmony, voicing,
// syncopation and instrumentation. District changes happen on a measure boundary.
const SCORES = [
  { name: 'quay', bpm: 134, root: 38, color: .34, air: 950,
    chords: [[0, 3, 7, 14], [-5, -2, 2, 9], [3, 7, 10, 14], [-2, 2, 5, 12]],
    motif: [0, 7, 12, 14, 10, 7, 3, 7], bass: [0, 0, 7, 0, 0, 12, 7, 10],
    kick: [0, 6, 8, 14], snare: [4, 12], arp: [0, 3, 6, 8, 11, 14], hat: 2, pad: 'warm', lead: 'glass' },
  { name: 'transit', bpm: 146, root: 41, color: .66, air: 1650,
    chords: [[0, 3, 7, 10], [-2, 2, 5, 12], [-5, -2, 2, 7], [-7, -3, 0, 5]],
    motif: [0, 3, 7, 10, 12, 7, 10, 14], bass: [0, 0, 12, 0, 7, 0, 10, 7],
    kick: [0, 3, 8, 10, 14], snare: [4, 12], arp: [0, 2, 5, 7, 8, 10, 13, 15], hat: 1, pad: 'hollow', lead: 'pulse' },
  { name: 'garden', bpm: 124, root: 45, color: .15, air: 2400,
    chords: [[0, 4, 7, 14], [-5, -1, 2, 9], [2, 5, 9, 16], [-2, 2, 5, 12]],
    motif: [0, 7, 14, 16, 19, 14, 11, 7], bass: [0, 7, 0, 12, 0, 7, 2, 7],
    kick: [0, 7, 10], snare: [4, 12], arp: [0, 3, 5, 8, 11, 13], hat: 2, pad: 'air', lead: 'bell' },
  { name: 'foundry', bpm: 144, root: 40, color: .93, air: 580,
    chords: [[0, 3, 7, 12], [1, 5, 8, 13], [-5, -2, 2, 7], [0, 1, 7, 13]],
    motif: [0, 1, 7, 12, 13, 7, 3, 1], bass: [0, 0, 1, 0, 0, 7, 1, 12],
    kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], arp: [0, 3, 6, 8, 11, 14], hat: 1, pad: 'hollow', lead: 'iron' },
  { name: 'spillway', bpm: 132, root: 35, color: .42, air: 1900,
    chords: [[0, 3, 7, 14], [3, 7, 10, 17], [-2, 2, 5, 12], [-5, -2, 2, 9]],
    motif: [0, 7, 14, 12, 10, 14, 7, 3], bass: [0, 7, 12, 0, 7, 3, 10, 7],
    kick: [0, 6, 10], snare: [8], arp: [0, 3, 6, 9, 12, 14], hat: 2, pad: 'air', lead: 'glass' },
  { name: 'crown', bpm: 140, root: 38, color: .56, air: 1300,
    chords: [[0, 3, 7, 14], [-4, 0, 3, 10], [3, 7, 10, 17], [-2, 2, 5, 11]],
    motif: [0, 7, 12, 15, 19, 14, 11, 7], bass: [0, 12, 7, 0, 3, 12, 7, 11],
    kick: [0, 6, 8, 14], snare: [8], arp: [0, 2, 4, 7, 8, 10, 12, 15], hat: 1, pad: 'choir', lead: 'bell' },
];

const EFFECTS = {
  throw: [.25, .64, .045], recall: [.46, .48, .1], catch: [.2, .6, .06],
  perfect: [.78, .49, .1], hit: [.19, .48, .025], kill: [.5, .55, .035],
  dash: [.36, .45, .11], jump: [.2, .2, .12], land: [.26, .4, .1],
  step: [.14, .13, .095], parry: [.74, .53, .055], hurt: [.42, .49, .08],
  death: [1.3, .56, .7], charge: [.7, .28, .3], secret: [1.35, .34, .4],
  level: [1.55, .42, .4], boss: [1.5, .6, .55], telegraph: [.28, .28, .045],
  shot: [.19, .33, .025], impact: [.34, .46, .035], gate: [1.2, .38, .35],
  complete: [2.1, .4, .6], ui: [.07, .12, .035],
};

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

function hold(param, value, time, smoothing = .06) {
  if (!param) return;
  param.cancelScheduledValues(time);
  param.setTargetAtTime(value, time, smoothing);
}

export class AudioSystem {
  constructor() {
    this.context = null;
    this.unlocked = false;
    this.disposed = false;
    this.paused = false;
    this.underwater = false;
    this.masterVolume = .75;
    this.musicVolume = .5;
    this.intensity = 0;
    this.district = 0;
    this.pendingDistrict = null;
    this.samples = new Map();
    this.synth = new Map();
    this.instruments = new Map();
    this.voices = new Set();
    this.maxVoices = 56;
    this.failedSamples = [];
    this.last = new Map();
    this.player = { x: 0, y: 1.7, z: 0 };
    this.stepNumber = 0;
    this.nextStepTime = 0;
    this.foot = 0;
    this.variant = 0;
    this.lastMix = -1;
    this.duckUntil = 0;
    this.random = seeded(0xb4ea7);
    this._unlocking = null;
    this._sampleAbort = null;
    this._timer = null;
    this._warmGeneration = 0;
    this._warmTarget = null;
    this._forcePad = false;
  }

  async unlock() {
    if (this.disposed) return false;
    if (this._unlocking) return this._unlocking;
    this._unlocking = this._unlock();
    try { return await this._unlocking; }
    finally { this._unlocking = null; }
  }

  async _unlock() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    try {
      if (!this.context) {
        this.context = new Context({ latencyHint: 'interactive' });
        this._buildGraph();
        this._buildSynth();
        this.ready = this._loadSamples();
        this._warmDistrict(this.district);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      if (this.disposed) return false;
      this.unlocked = this.context.state === 'running';
      if (this.unlocked && !this._timer) {
        this.nextStepTime = this.context.currentTime + .16;
        this._timer = setInterval(() => this._schedule(), 25);
        this._schedule();
      }
      return this.unlocked;
    } catch (error) {
      // Missing or blocked audio must never prevent play. A later gesture can retry.
      console.warn('BREAKWATER audio could not start:', error.message);
      return false;
    }
  }

  _buildGraph() {
    const c = this.context;
    this.output = c.createGain();
    this.output.gain.value = this.masterVolume * .8;
    this.output.connect(c.destination);
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 16;
    this.limiter.ratio.value = 5;
    this.limiter.attack.value = .003;
    this.limiter.release.value = .16;
    this.limiter.connect(this.output);
    this.pauseBus = c.createGain();
    this.pauseBus.gain.value = this.paused ? 0 : 1;
    this.gameplayFilter = c.createBiquadFilter();
    this.gameplayFilter.type = 'lowpass';
    this.gameplayFilter.Q.value = .707;
    this.gameplayFilter.frequency.value = this.underwater ? 950 : Math.min(20000, c.sampleRate * .45);
    this.gameplayGain = c.createGain();
    this.gameplayGain.gain.value = this.underwater ? .72 : 1;
    this.pauseBus.connect(this.gameplayFilter);
    this.gameplayFilter.connect(this.gameplayGain);
    this.gameplayGain.connect(this.limiter);
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = .82;
    this.sfxBus.connect(this.pauseBus);
    // Explicit menu/death/ending feedback remains audible while simulation and
    // music are paused. It still passes through the limiter and master slider.
    this.uiBus = c.createGain();
    this.uiBus.gain.value = .78;
    this.uiBus.connect(this.limiter);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.musicVolume * .68;
    this.musicBus.connect(this.pauseBus);
    this.stems = {};
    for (const name of ['pad', 'pulse', 'drums', 'hats', 'lead', 'accent', 'air']) {
      const gain = c.createGain();
      gain.gain.value = 0;
      gain.connect(this.musicBus);
      this.stems[name] = gain;
    }
    this.reverb = c.createConvolver();
    const response = c.createBuffer(2, Math.ceil(c.sampleRate * 1.6), c.sampleRate);
    const rand = seeded(47579);
    for (let channel = 0; channel < 2; channel++) {
      const data = response.getChannelData(channel);
      let low = 0;
      for (let i = 0; i < data.length; i++) {
        low = low * .45 + (rand() * 2 - 1) * .55;
        data[i] = low * (1 - i / data.length) ** 3.4 * .5;
      }
    }
    this.reverb.buffer = response;
    this.reverbReturn = c.createGain();
    this.reverbReturn.gain.value = .2;
    this.reverb.connect(this.reverbReturn);
    // Separate wet feeds preserve the music slider all the way through the effect.
    this.reverbReturn.connect(this.pauseBus);
    this.musicReverb = c.createConvolver();
    this.musicReverb.buffer = response;
    const musicWet = c.createGain();
    musicWet.gain.value = .23;
    this.musicReverb.connect(musicWet);
    musicWet.connect(this.musicBus);
    this.uiReverb = c.createConvolver();
    this.uiReverb.buffer = response;
    const uiWet = c.createGain();
    uiWet.gain.value = .18;
    this.uiReverb.connect(uiWet);
    uiWet.connect(this.uiBus);
    this._buildAir();
    this._mix(true);
  }

  _buffer(seconds, sample, seed = 293, sampleRate = Math.min(this.context.sampleRate, 32000)) {
    const c = this.context;
    const buffer = c.createBuffer(1, Math.ceil(seconds * sampleRate), sampleRate);
    const data = buffer.getChannelData(0);
    const random = seeded(seed);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const fade = Math.min(1, t / .0015, (seconds - t) / .012);
      const value = sample(t, i, random);
      data[i] = Math.tanh(value) * Math.max(0, fade);
    }
    return buffer;
  }

  _buildSynth() {
    for (const [name, [duration]] of Object.entries(EFFECTS)) {
      let previous = 0;
      this.synth.set(name, this._buffer(duration, (t, i, random) => {
        const n = random() * 2 - 1;
        previous = previous * .74 + n * .26;
        const hiss = n - previous;
        const sine = f => Math.sin(TAU * f * t);
        const decay = (speed, delay = 0) => t < delay ? 0 : Math.exp(-(t - delay) * speed);
        switch (name) {
          case 'throw': return .65 * hiss * decay(24) + .72 * Math.sin(TAU * (110 * t + 6 * (1 - Math.exp(-t * 30)))) * decay(19) + .12 * sine(1220) * decay(35);
          case 'recall': return Math.sin(TAU * (180 * t + 960 * t * t)) * Math.sin(Math.PI * t / duration) * .3 + hiss * Math.sin(Math.PI * t / duration) * .17;
          case 'catch': return .75 * sine(126) * decay(36) + .2 * sine(1720) * decay(55) + .4 * hiss * decay(80);
          case 'perfect': return .4 * sine(587.33) * decay(7) + .24 * sine(880) * decay(6) + .16 * sine(1174.66) * decay(9) + .36 * sine(110) * decay(26) + .13 * hiss * decay(36);
          case 'hit': return .56 * previous * decay(27) + .56 * Math.sin(TAU * (70 * t + 2 * (1 - Math.exp(-t * 45)))) * decay(32);
          case 'kill': return .65 * sine(61.74) * decay(14) + .23 * sine(185) * decay(22) + .28 * hiss * decay(24);
          case 'dash': return .63 * hiss * Math.sin(Math.PI * t / duration) ** 2 * Math.exp(-t * 4) + .3 * previous * decay(12);
          case 'jump': return .23 * previous * decay(19) + .14 * sine(90) * decay(26);
          case 'land': return .65 * sine(62) * decay(24) + .32 * previous * decay(23);
          case 'step': return .26 * previous * decay(32) + .15 * sine(116) * decay(35);
          case 'parry': return (.3 * sine(1174.66) + .2 * sine(1760) + .13 * sine(2349.3)) * decay(10) + .42 * hiss * decay(85) + .5 * sine(156) * decay(25);
          case 'hurt': return .55 * sine(54) * decay(12) + .43 * previous * decay(25) + .13 * sine(130) * decay(17);
          case 'death': return .4 * Math.sin(TAU * (110 * t - 28 * t * t)) * decay(2.8) + .36 * previous * decay(5);
          case 'charge': return (Math.sin(TAU * (130 * t + 470 * t * t)) * .19 + Math.sin(TAU * (195 * t + 705 * t * t)) * .09) * Math.sin(Math.PI * t / duration) + .07 * hiss * t;
          case 'telegraph': return (.48 * sine(880) + .2 * sine(1320)) * Math.max(0, Math.cos(t * Math.PI * 12)) ** 5 * decay(5);
          case 'shot': return .48 * hiss * decay(32) + .45 * Math.sin(TAU * (95 * t + 2 * (1 - Math.exp(-t * 35)))) * decay(24);
          case 'impact': return .45 * previous * decay(20) + .5 * sine(75) * decay(19);
          case 'gate': return .29 * previous * Math.sin(Math.PI * t / duration) + .13 * sine(72 + 3 * Math.sin(t * 7)) * Math.sin(Math.PI * t / duration);
          case 'boss': return .5 * sine(46.25) * decay(3.6) + .21 * sine(69.3) * decay(4) + .24 * previous * decay(5);
          case 'ui': return .33 * sine(1320) * decay(90) + .2 * hiss * decay(110);
          case 'secret': case 'level': case 'complete': {
            const notes = name === 'secret' ? [74, 81, 86, 88] : name === 'level' ? [62, 69, 74, 77, 81] : [50, 57, 62, 65, 69, 74];
            let sum = 0;
            notes.forEach((note, index) => {
              const nt = t - index * .095;
              if (nt >= 0) sum += Math.sin(TAU * hz(note) * nt) * Math.exp(-nt * 4.5) * .2;
            });
            return sum;
          }
          default: return 0;
        }
      }, 11000 + name.length * 293));
    }
    this.synth.set('kick', this._buffer(.36, t => Math.sin(TAU * (45 * t + 5.1 * (1 - Math.exp(-t * 44)))) * Math.exp(-t * 18) * 1.15));
    this.synth.set('snare', this._buffer(.24, (t, i, r) => (r() * 2 - 1) * Math.exp(-t * 24) * .72 + Math.sin(TAU * 178 * t) * Math.exp(-t * 35) * .26));
    let low = 0;
    this.synth.set('hat', this._buffer(.1, (t, i, r) => { const n = r() * 2 - 1; low = low * .55 + n * .45; return (n - low) * Math.exp(-t * 54) * .8; }));
    this.synth.set('openhat', this._buffer(.23, (t, i, r) => (r() * 2 - 1) * Math.exp(-t * 20) * .32));
    this.synth.set('tom', this._buffer(.26, t => Math.sin(TAU * (76 * t + 1.8 * (1 - Math.exp(-t * 30)))) * Math.exp(-t * 18) * .8));
  }

  async _loadSamples() {
    this._sampleAbort = new AbortController();
    await Promise.all(FILES.map(async file => {
      try {
        const url = new URL(`../assets/audio/${file}`, import.meta.url);
        const response = await fetch(url, { signal: this._sampleAbort.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.arrayBuffer();
        if (this.disposed) return;
        const buffer = await this.context.decodeAudioData(data);
        if (!this.disposed) this.samples.set(file.replace(/\.[^.]+$/, ''), buffer);
      } catch (error) {
        if (!this.disposed && error.name !== 'AbortError') this.failedSamples.push(file);
      }
    }));
    // The procedural layer remains playable when a browser cannot decode an asset.
    return this.samples.size;
  }

  _buildAir() {
    const c = this.context;
    const buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
    const data = buffer.getChannelData(0);
    const rand = seeded(974);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + (rand() * 2 - 1) * .015) / 1.012;
      // A sinusoidal window gives a click-free loop under the long reverb bed.
      data[i] = brown * Math.sin(Math.PI * i / data.length) ** 2;
    }
    this.air = c.createBufferSource();
    this.air.buffer = buffer;
    this.air.loop = true;
    this.airFilter = c.createBiquadFilter();
    this.airFilter.type = 'lowpass';
    this.airFilter.frequency.value = SCORES[this.district].air;
    this.air.connect(this.airFilter);
    this.airFilter.connect(this.stems.air);
    this.air.start();
  }

  setVolume(master, music) {
    this.masterVolume = clamp(master);
    this.musicVolume = clamp(music);
    if (!this.context || this.disposed) return;
    hold(this.output.gain, this.masterVolume * .8, this.context.currentTime, .03);
    this._mix(true);
  }

  setUnderwater(value) {
    if (this.disposed) return;
    const underwater = Boolean(value);
    if (underwater === this.underwater) return;
    this.underwater = underwater;
    if (!this.context) return;
    const time = this.context.currentTime;
    // Filtering the shared gameplay path includes music, spatial effects and
    // room tails. The separate menu/ending bus deliberately remains clear.
    hold(this.gameplayFilter.frequency, underwater ? 950 : Math.min(20000, this.context.sampleRate * .45), time, underwater ? .09 : .1);
    hold(this.gameplayGain.gain, underwater ? .72 : 1, time, .09);
  }

  setDistrict(index) {
    const next = Math.floor(clamp(Number(index), 0, SCORES.length - 1));
    if (!this.unlocked || this.paused) {
      this.district = next;
      this.pendingDistrict = null;
      if (this.context) hold(this.airFilter.frequency, SCORES[next].air, this.context.currentTime, .8);
    } else if (next !== this.district) this.pendingDistrict = next;
    else this.pendingDistrict = null;
    if (this.context && !this.disposed) this._warmDistrict(next);
  }

  setIntensity(value) {
    this.intensity = clamp(value);
    this._mix();
  }

  _mix(force = false) {
    if (!this.context || this.disposed) return;
    const c = this.context;
    const value = this.intensity;
    const duck = c.currentTime < this.duckUntil ? .66 : 1;
    if (!force && Math.abs(this.lastMix - value) < .01 && this.lastDuck === duck) return;
    this.lastMix = value;
    this.lastDuck = duck;
    const levels = {
      pad: .48 - value * .17,
      pulse: .1 + value * .55,
      drums: clamp((value - .09) / .65) * .79,
      hats: clamp((value - .22) / .6) * .42,
      lead: .075 + clamp((value - .32) / .6) * .33,
      accent: clamp((value - .64) / .35) * .3,
      air: .16 - value * .1,
    };
    for (const [name, level] of Object.entries(levels)) hold(this.stems[name].gain, level, c.currentTime, .35);
    hold(this.musicBus.gain, this.musicVolume * .68 * duck, c.currentTime, .08);
  }

  _instrument(kind, note, seconds, color) {
    const duration = Math.round(seconds * 10) / 10;
    const key = `${kind}:${note}:${duration}:${color}`;
    if (this.instruments.has(key)) return this.instruments.get(key);
    const f = hz(note);
    const buffer = this._buffer(duration, t => {
      const p = TAU * f * t;
      const end = clamp((duration - t) / Math.min(.7, duration * .4));
      if (kind === 'bass') {
        const envelope = (1 - Math.exp(-t * 130)) * Math.exp(-t * 8) * end;
        return (Math.sin(p) * .68 + Math.sin(2 * p) * .19 + Math.sin(3 * p) * .1 * color + Math.sin(5 * p) * .08 * color) * envelope;
      }
      if (['warm', 'hollow', 'air', 'choir'].includes(kind)) {
        const attack = 1 - Math.exp(-t * 2.8);
        const sway = .82 + .18 * Math.sin(t * 1.2 + note);
        const bright = kind === 'choir' ? .29 : kind === 'hollow' ? .32 : .13;
        return (Math.sin(p) * .34 + Math.sin(p * 1.003) * .23 + Math.sin(2 * p) * .13 + Math.sin(3 * p) * bright + Math.sin(5 * p) * bright * .32) * attack * end * sway;
      }
      const rate = kind === 'bell' ? 5 : kind === 'glass' ? 9 : kind === 'iron' ? 15 : 13;
      const envelope = (1 - Math.exp(-t * 650)) * Math.exp(-t * rate) * end;
      if (kind === 'bell') return (Math.sin(p) * .5 + Math.sin(p * 2.003) * .2 * Math.exp(-t * 7) + Math.sin(p * 3.996) * .12 * Math.exp(-t * 14)) * envelope;
      if (kind === 'glass') return (Math.sin(p) * .6 + Math.sin(p * 2) * .19 + Math.sin(p * 4.01) * .11) * envelope;
      if (kind === 'iron') return (Math.sin(p) * .5 + Math.sin(p * 3) * .23 + Math.sin(p * 7) * .13) * envelope;
      return (Math.sin(p) * .6 + Math.sin(p * 2) * .2 + Math.sin(p * 3) * .17 + Math.sin(p * 5) * .07) * envelope;
    }, note * 43, ['warm', 'hollow', 'air', 'choir'].includes(kind) ? 16000 : 24000);
    // Bound retained PCM across long campaigns. Playing sources retain their buffer.
    if (this.instruments.size >= 96) this.instruments.delete(this.instruments.keys().next().value);
    this.instruments.set(key, buffer);
    return buffer;
  }

  async _warmDistrict(index) {
    if (this.disposed || this._warmTarget === index) return;
    this._warmTarget = index;
    const generation = ++this._warmGeneration;
    const score = SCORES[index];
    const beat = 60 / score.bpm;
    const queue = [];
    for (const chord of score.chords) {
      for (const note of chord) queue.push([score.pad, score.root + 12 + note, beat * 8 + .25, score.color]);
      for (const note of new Set(score.bass)) queue.push(['bass', score.root + chord[0] + note, beat * .7, score.color]);
      for (const note of new Set(score.motif)) queue.push([score.lead, score.root + 24 + chord[0] + note, beat * 1.8, score.color]);
    }
    // Prepare PCM in small batches between frames, rather than compiling a whole
    // score on an encounter's first frame. Repeated notes share cached buffers.
    while (queue.length && !this.disposed && generation === this._warmGeneration) {
      this._instrument(...queue.shift());
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  _schedule() {
    if (!this.unlocked || this.disposed || this.paused || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    // Never replay a backlog after a hidden tab, debugger pause, or interrupted device.
    if (this.nextStepTime < now - .12) this.nextStepTime = now + .025;
    let scheduled = 0;
    while (this.nextStepTime < now + .14 && scheduled++ < 8) {
      if (this.stepNumber % 16 === 0 && this.pendingDistrict !== null) {
        this.district = this.pendingDistrict;
        this.pendingDistrict = null;
        this._forcePad = true;
        for (const voice of this.voices) if (voice.music && voice.end > this.nextStepTime) this._stopVoice(voice, .32);
        hold(this.airFilter.frequency, SCORES[this.district].air, now, 1.1);
      }
      this._musicStep(this.stepNumber, this.nextStepTime);
      this.nextStepTime += 60 / SCORES[this.district].bpm / 4;
      this.stepNumber++;
    }
    this._mix();
  }

  _musicStep(step, time) {
    const score = SCORES[this.district];
    const beat = 60 / score.bpm;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const chord = score.chords[Math.floor(bar / 2) % score.chords.length];
    const phrase = Math.floor(bar / 8);
    const play = (buffer, stem, gain, rate = 1, pan = 0) => this._play(buffer, { time, bus: this.stems[stem], gain, rate, pan, music: true, priority: stem === 'pad' ? 1 : 0, wet: stem === 'lead' || stem === 'pad' ? .25 : .025 });
    if (s === 0 && (bar % 2 === 0 || step < 16 || this._forcePad)) {
      chord.forEach((interval, index) => play(this._instrument(score.pad, score.root + 12 + interval, beat * 8 + .25, score.color), 'pad', .14, 1, (index - 1.5) * .3));
      this._forcePad = false;
    }
    const breath = bar % 8 === 7 && s >= 12;
    if (s % 2 === 0) {
      const index = s / 2;
      const variation = phrase % 3 === 1 && index === 7 ? 12 : 0;
      const note = score.root + chord[0] + score.bass[index] + variation;
      play(this._instrument('bass', note, beat * .7, score.color), 'pulse', s % 4 === 0 ? .58 : .42);
    }
    if (score.kick.includes(s) && !breath) play(this.synth.get('kick'), 'drums', .64);
    if (score.snare.includes(s) && !breath) {
      play(this.synth.get('snare'), 'drums', .43, this.district === 3 ? .8 : 1, .08);
      if (this.district === 3 && this.samples.has('metal-0')) play(this.samples.get('metal-0'), 'accent', .08, .6, -.25);
    }
    if (s % score.hat === 0 && !breath) play(this.synth.get(s === 14 ? 'openhat' : 'hat'), 'hats', s % 4 === 2 ? .36 : .2, 1 + (s % 3) * .025, s % 4 < 2 ? -.3 : .3);
    if (score.arp.includes(s)) {
      const offset = (score.arp.indexOf(s) + (bar % 2) * 3 + (phrase % 2) * 2) % score.motif.length;
      const note = score.root + 24 + chord[0] + score.motif[offset];
      play(this._instrument(score.lead, note, beat * 1.8, score.color), 'lead', .23, 1, Math.sin(s * .63) * .55);
      if (phrase % 2 === 1 && s === 0) play(this._instrument('bell', note + 12, beat * 2.5, score.color), 'accent', .13, 1, -.4);
    }
    // Authored turnarounds avoid a single unchanging four-beat loop.
    if (bar % 4 === 3 && s >= 12 && s % 2 === 0) play(this.synth.get('tom'), 'accent', .36, s === 12 ? 1.2 : .8, s === 12 ? -.4 : .4);
    if (bar % 8 === 7 && s === 15) play(this.synth.get('snare'), 'drums', .2, 1.18, -.15);
  }

  _play(buffer, options = {}) {
    if (!buffer || !this.context || this.disposed || this.paused && !options.bypassPause) return null;
    const c = this.context;
    const { bus = this.sfxBus, gain = 1, rate = 1, pan = 0, position = null, music = false, priority = 2, wet = 0 } = options;
    const time = Math.max(c.currentTime, options.time ?? c.currentTime);
    if (this.voices.size >= this.maxVoices) {
      let victim = null;
      for (const voice of this.voices) {
        if (voice.priority <= priority && (!victim || voice.priority < victim.priority || voice.priority === victim.priority && voice.end < victim.end)) victim = voice;
      }
      if (!victim) return null;
      this._stopVoice(victim, .01);
    }
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = clamp(rate, .25, 3);
    const volume = c.createGain();
    volume.gain.value = clamp(gain, 0, 2);
    source.connect(volume);
    let spatial = null;
    if (position) {
      spatial = c.createPanner();
      spatial.panningModel = 'equalpower';
      spatial.distanceModel = 'inverse';
      spatial.refDistance = 5;
      spatial.maxDistance = 90;
      spatial.rolloffFactor = 1.35;
      spatial.positionX.value = position.x;
      spatial.positionY.value = position.y;
      spatial.positionZ.value = position.z;
    } else if (pan && c.createStereoPanner) {
      spatial = c.createStereoPanner();
      spatial.pan.value = clamp(pan, -1, 1);
    }
    const tail = spatial || volume;
    if (spatial) volume.connect(spatial);
    tail.connect(bus);
    let send = null;
    if (wet > 0) {
      send = c.createGain();
      send.gain.value = wet;
      // Music send follows its adaptive stem gain, including the music volume.
      // Per-note pad/lead wet levels are intentionally modest and always musical.
      tail.connect(send);
      send.connect(options.bypassPause ? this.uiReverb : music ? this.musicReverb : this.reverb);
      if (music) send.gain.value *= this.lastMix >= 0 ? .15 + this.intensity * .4 : .2;
    }
    const end = time + buffer.duration / source.playbackRate.value;
    const voice = { source, gain: volume, spatial, send, end, music, priority, stopped: false };
    this.voices.add(voice);
    source.onended = () => {
      this.voices.delete(voice);
      source.disconnect(); volume.disconnect(); spatial?.disconnect(); send?.disconnect();
    };
    source.start(time);
    return voice;
  }

  _stopVoice(voice, fade = .02) {
    if (voice.stopped) return;
    voice.stopped = true;
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, Math.max(.002, fade / 3));
    try { voice.source.stop(now + fade); } catch { /* already ended */ }
    // Release the slot immediately; onended still disconnects the graph.
    this.voices.delete(voice);
  }

  sfx(name, position = null, strength = 1) {
    const feedback = this.paused && ['ui', 'level', 'death', 'complete'].includes(name);
    if (!this.unlocked || this.paused && !feedback || this.disposed || !EFFECTS[name]) return;
    if (this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const [, base, cooldown] = EFFECTS[name];
    const cooldownKey = feedback ? `feedback:${name}` : name;
    if (now - (this.last.get(cooldownKey) ?? -100) < cooldown) return;
    this.last.set(cooldownKey, now);
    let pos = null;
    if (position && [position.x, position.y, position.z].every(Number.isFinite)) {
      pos = { x: position.x, y: position.y, z: position.z };
      const distance = Math.hypot(pos.x - this.player.x, pos.y - this.player.y, pos.z - this.player.z);
      if (distance > 100 && !['boss', 'complete'].includes(name)) return;
    }
    const power = clamp(strength, .05, 2);
    const v = this.variant++ % 3;
    const pitch = .97 + this.random() * .06;
    const isNotice = ['perfect', 'parry', 'secret', 'level', 'complete', 'boss'].includes(name);
    const opts = { position: pos, gain: base * power, rate: isNotice ? 1 : pitch, priority: feedback ? 4 : ['step', 'jump'].includes(name) ? 0 : isNotice ? 3 : 2, wet: isNotice ? .32 : name === 'shot' || name === 'hit' ? .13 : .04, bus: feedback ? this.uiBus : this.sfxBus, bypassPause: feedback };
    const layer = (key, level, rate = pitch, delay = 0) => this._play(this.samples.get(key), { ...opts, time: now + delay, gain: level * power, rate });
    if (name === 'step') {
      // Alternate feet and recordings, avoiding the same take on consecutive steps.
      const take = (this.foot++ + (this.foot % 2 ? 0 : 2)) % 4;
      if (this.samples.has(`step-${take}`)) layer(`step-${take}`, .18, .94 + this.random() * .12);
      else this._play(this.synth.get('step'), opts);
      if (this.district === 1 || this.district === 3) layer(`metal-${v}`, .018, .68 + this.random() * .08);
      return;
    }
    this._play(this.synth.get(name), opts);
    switch (name) {
      case 'throw': layer(`cloth-${v % 2}`, .16, 1.28); layer(`metal-${v}`, .1, 1.35); break;
      case 'recall': layer(`cloth-${v % 2}`, .17, .8); break;
      case 'catch': case 'perfect': layer(`metal-${v}`, .3, .78); layer(`punch-${v}`, .15, 1.2); break;
      case 'hit': layer(`metal-${v}`, .34); layer(`punch-${v}`, .27, .85); break;
      case 'kill': layer(`punch-${v}`, .4, .73); layer(`glass-${v % 2}`, .19, .86, .035); break;
      case 'parry': layer(`metal-${v}`, .44, 1.22); break;
      case 'land': layer(`step-${this.foot++ % 4}`, .24, .72); layer(`cloth-${v % 2}`, .12, .8); break;
      case 'jump': case 'dash': layer(`cloth-${v % 2}`, name === 'dash' ? .26 : .13, name === 'dash' ? 1.2 : .92); break;
      case 'hurt': layer(`punch-${v}`, .38, .78); this.duckUntil = now + .34; this._mix(true); break;
      case 'impact': layer(`metal-${v}`, .4, .75); layer(`punch-${v}`, .22, .7); break;
      case 'gate': layer(`metal-${v}`, .3, .5); layer(`metal-${(v + 1) % 3}`, .24, .6, .32); break;
      case 'boss': layer(`metal-${v}`, .4, .4); break;
      default: break;
    }
  }

  update(dt, playerPosition, playerDirection) {
    if (!this.context || !this.unlocked || this.disposed) return;
    if (playerPosition && [playerPosition.x, playerPosition.y, playerPosition.z].every(Number.isFinite)) {
      this.player.x = playerPosition.x;
      this.player.y = playerPosition.y;
      this.player.z = playerPosition.z;
    }
    const listener = this.context.listener;
    const time = this.context.currentTime;
    if (listener.positionX) {
      listener.positionX.setValueAtTime(this.player.x, time);
      listener.positionY.setValueAtTime(this.player.y, time);
      listener.positionZ.setValueAtTime(this.player.z, time);
    } else listener.setPosition(this.player.x, this.player.y, this.player.z);
    if (playerDirection && [playerDirection.x, playerDirection.y, playerDirection.z].every(Number.isFinite)) {
      const { x, y, z } = playerDirection;
      const length = Math.hypot(x, y, z);
      if (length > .001) {
        const fx = x / length, fy = y / length, fz = z / length;
        const flat = Math.hypot(fx, fz);
        const rx = flat > .001 ? -fz / flat : 1;
        const rz = flat > .001 ? fx / flat : 0;
        const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
        if (listener.forwardX) {
          listener.forwardX.setValueAtTime(fx, time); listener.forwardY.setValueAtTime(fy, time); listener.forwardZ.setValueAtTime(fz, time);
          listener.upX.setValueAtTime(ux, time); listener.upY.setValueAtTime(uy, time); listener.upZ.setValueAtTime(uz, time);
        } else listener.setOrientation(fx, fy, fz, ux, uy, uz);
      }
    }
    this._mix();
  }

  pause(value) {
    const paused = Boolean(value);
    if (this.paused === paused || this.disposed) return;
    this.paused = paused;
    if (!this.context) return;
    hold(this.pauseBus.gain, paused ? 0 : 1, this.context.currentTime, paused ? .012 : .07);
    if (paused) {
      for (const voice of [...this.voices]) this._stopVoice(voice, .06);
    } else {
      this.nextStepTime = this.context.currentTime + .08;
      // Resume with harmony present, without resetting phrase progress to bar zero.
      this.stepNumber = Math.ceil(this.stepNumber / 32) * 32;
      this.last.clear();
      this._schedule();
    }
  }

  getStats() {
    return {
      unlocked: this.unlocked, paused: this.paused, state: this.context?.state ?? 'locked',
      district: SCORES[this.district].name, pendingDistrict: this.pendingDistrict,
      intensity: this.intensity, voices: this.voices.size, maxVoices: this.maxVoices,
      loadedSamples: this.samples.size, expectedSamples: FILES.length,
      failedSamples: [...this.failedSamples], transportStep: this.stepNumber,
      instrumentBuffers: this.instruments.size,
      underwater: this.underwater,
      gameplayCutoff: this.gameplayFilter?.frequency.value ?? 0,
      gameplayGain: this.gameplayGain?.gain.value ?? 1,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unlocked = false;
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this._sampleAbort?.abort();
    if (this.context) {
      for (const voice of [...this.voices]) this._stopVoice(voice, .01);
      try { this.air?.stop(); } catch { /* already stopped */ }
      this.context.close().catch(() => {});
    }
    this.voices.clear();
    this.samples.clear();
    this.synth.clear();
    this.instruments.clear();
  }
}
