const NOTES = [261.63, 329.63, 392.0];

export class SoundGarden {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.fx = null;
    this.startedAt = performance.now() / 1000;
    this.bpm = 78;
    this.muted = false;
    this.paused = false;
    this.homeCount = 0;
    this.voices = [];
    this.lastBeat = -1;
    this.padNodes = [];
    this.failed = false;
  }

  async init() {
    if (this.ctx || this.failed) return !!this.ctx;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio unavailable');
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.fx = this.ctx.createGain();
      const compressor = this.ctx.createDynamicsCompressor();
      const wet = this.ctx.createGain();
      const reverb = this.ctx.createConvolver();
      reverb.buffer = this.makeImpulse(2.8, 2.7);
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.music.gain.value = 0.5;
      this.fx.gain.value = 0.7;
      wet.gain.value = 0.28;
      this.music.connect(this.master);
      this.fx.connect(this.master);
      this.music.connect(reverb);
      this.fx.connect(reverb);
      reverb.connect(wet);
      wet.connect(this.master);
      this.master.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.startedAt = this.ctx.currentTime;
      this.startPad();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return true;
    } catch (error) {
      try { await this.ctx?.close?.(); } catch (_) {}
      this.ctx = null;
      this.master = null;
      this.music = null;
      this.fx = null;
      this.failed = true;
      console.warn('Audio could not start:', error?.message || error);
      return false;
    }
  }

  makeImpulse(seconds, decay) {
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  startPad() {
    const now = this.ctx.currentTime;
    [65.41, 98.0, 130.81].forEach((frequency, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = index === 1 ? 'sine' : 'triangle';
      osc.frequency.value = frequency;
      osc.detune.value = index === 2 ? 5 : index === 0 ? -4 : 0;
      filter.type = 'lowpass';
      filter.frequency.value = 520 + index * 160;
      gain.gain.value = index === 1 ? 0.045 : 0.024;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.music);
      osc.start(now);
      this.padNodes.push({ osc, gain, filter });
    });
  }

  get time() {
    return this.ctx ? this.ctx.currentTime - this.startedAt : performance.now() / 1000 - this.startedAt;
  }

  get beatLength() { return 60 / this.bpm; }

  getBeatPhase() {
    const raw = (this.time / this.beatLength) % 1;
    return raw < 0 ? raw + 1 : raw;
  }

  getBeatWindow() {
    const p = this.getBeatPhase();
    return Math.min(p, 1 - p);
  }

  update(homeCount = this.homeCount) {
    this.homeCount = homeCount;
    const beat = Math.floor(this.time / this.beatLength);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (this.ctx && !this.muted) this.musicBeat(beat);
    }
    if (this.ctx) {
      const glow = Math.min(1, homeCount / 9);
      for (let i = 0; i < this.padNodes.length; i++) {
        const node = this.padNodes[i];
        node.filter.frequency.setTargetAtTime(520 + glow * 920 + i * 170, this.ctx.currentTime, 0.6);
        node.gain.gain.setTargetAtTime((i === 1 ? 0.045 : 0.024) + glow * 0.012, this.ctx.currentTime, 0.7);
      }
    }
  }

  musicBeat(beat) {
    const voices = Math.max(1, Math.min(9, this.voices.length || this.homeCount));
    const index = beat % voices;
    const voice = this.voices[index];
    const root = voice
      ? (NOTES[voice.note] || NOTES[0]) * (voice.ratio || 1)
      : NOTES[index % 3] * (index > 5 ? 2 : 1);
    const timbre = voice?.timbre || (index % 2 ? 'sine' : 'triangle');
    this.pluck(root, 0.035 + voices * 0.002, 0.55 + (voice?.ratio || 1) * 0.08, this.music, timbre);
    if (this.homeCount >= 3 && beat % 2 === 0) this.pluck(root / 2, 0.025, 1.1, this.music, 'sine');
    if (this.homeCount >= 6 && beat % 4 === 3) this.pluck(root * 1.5, 0.018, 1.35, this.music, 'sine');
  }

  addVoice(voice) {
    if (!voice || this.voices.some((item) => item.id === voice.id)) return false;
    this.voices.push({
      id: voice.id || `voice-${this.voices.length}`,
      note: Math.max(0, Math.min(2, Number(voice.note) || 0)),
      ratio: Math.max(0.5, Math.min(2.5, Number(voice.ratio) || 1)),
      timbre: ['sine', 'triangle', 'square', 'sawtooth'].includes(voice.timbre) ? voice.timbre : 'sine',
    });
    return true;
  }

  pluck(frequency, volume = 0.08, duration = 0.6, destination = this.fx, type = 'sine', sweep = 1) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, frequency), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * sweep), now + duration);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(640, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  noise(volume = 0.04, duration = 0.25, highpass = 500) {
    if (!this.ctx || this.muted) return;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2);
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.fx);
    source.start();
  }

  resonate(note, success = false) {
    const f = NOTES[note] || NOTES[0];
    this.pluck(f, success ? 0.12 : 0.055, success ? 1.15 : 0.48, this.fx, 'sine', success ? 2 : 1.08);
    if (success) this.pluck(f * 1.5, 0.045, 1.4, this.music, 'triangle', 1.01);
  }

  bond(note) {
    const f = NOTES[note] || NOTES[0];
    this.pluck(f, 0.14, 1.8, this.music, 'sine', 2);
    this.pluck(f * 1.25, 0.06, 2.1, this.music, 'triangle', 1.5);
  }

  home(note, count) {
    const f = (NOTES[note] || NOTES[0]) * (count > 6 ? 2 : 1);
    [1, 1.25, 1.5, 2].forEach((ratio, i) => setTimeout(() => this.pluck(f * ratio, 0.075, 1.25, this.music, 'sine', 1.01), i * 85));
  }

  dash() {
    this.noise(0.055, 0.2, 1200);
    this.pluck(130.81, 0.045, 0.22, this.fx, 'sawtooth', 2.4);
  }

  repel() {
    this.noise(0.08, 0.36, 260);
    this.pluck(82.41, 0.05, 0.5, this.fx, 'sawtooth', 0.55);
  }

  seed(count) {
    const base = 523.25 * (1 + count * 0.125);
    [1, 1.5, 2.5].forEach((ratio, i) => setTimeout(() => this.pluck(base * ratio, 0.055, 1.2, this.music, 'sine'), i * 70));
  }

  finalChord() {
    [130.81, 196.0, 261.63, 329.63, 392.0, 523.25].forEach((f, i) => {
      setTimeout(() => this.pluck(f, 0.065, 5.5, this.music, i % 2 ? 'sine' : 'triangle', 1.005), i * 110);
    });
  }

  toggle(force) {
    this.muted = typeof force === 'boolean' ? !force : !this.muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.paused ? 0.08 : 0.72, this.ctx.currentTime, 0.04);
    return !this.muted;
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.ctx || this.muted) return;
    this.master.gain.setTargetAtTime(paused ? 0.08 : 0.72, this.ctx.currentTime, 0.08);
  }
}
