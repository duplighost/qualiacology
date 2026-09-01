const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.music = null;
    this.effects = null;
    this.windGain = null;
    this.windFilter = null;
    this.rainGain = null;
    this.nextBeat = 0;
    this.beat = 0;
    this.lastEvent = 0;
    this.unlocked = false;
    this.activeVoices = 0;
    this.peakVoices = 0;
    this.muted = false;
    try {
      this.muted = localStorage.getItem('falling-open-muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  async unlock() {
    if (!this.context) this._create();
    if (this.context?.state === 'suspended') await this.context.resume();
    this.unlocked = Boolean(this.context && this.context.state === 'running');
    return this.unlocked;
  }

  _create() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const ctx = new Context({ latencyHint: 'interactive' });
    this.context = ctx;
    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.effects = ctx.createGain();
    this.music.gain.value = 0.33;
    this.effects.gain.value = 0.68;
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.music.connect(this.master);
    this.effects.connect(this.master);
    this.master.connect(ctx.destination);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;
    let state = 0x91e10da5;
    for (let i = 0; i < channel.length; i += 1) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      const white = ((state >>> 0) / 4294967296) * 2 - 1;
      last = last * 0.985 + white * 0.015;
      channel[i] = last * 4.3;
    }

    const wind = ctx.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 680;
    this.windFilter.Q.value = 0.55;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.025;
    wind.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    wind.start();

    const rain = ctx.createBufferSource();
    rain.buffer = buffer;
    rain.loop = true;
    rain.playbackRate.value = 1.7;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 2600;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0.012;
    rain.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.master);
    rain.start();
    this.nextBeat = ctx.currentTime + 0.08;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.context.currentTime, 0.025);
    }
    try { localStorage.setItem('falling-open-muted', this.muted ? '1' : '0'); } catch { /* optional */ }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  async suspend() {
    if (this.context?.state === 'running') await this.context.suspend();
  }

  async resume() {
    if (this.context?.state === 'suspended') await this.context.resume();
    if (this.context) this.nextBeat = Math.max(this.nextBeat, this.context.currentTime + 0.04);
  }

  update(sim) {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const wind = Math.abs(sim.windAt(sim.player.y));
    const fall = Math.abs(sim.player.vy);
    const open = sim.player.open;
    this.windGain.gain.setTargetAtTime(0.016 + wind / 9500 + fall / 32000 + open * 0.018, now, 0.045);
    this.windFilter.frequency.setTargetAtTime(420 + wind * 1.9 + fall * 0.38, now, 0.06);
    this.rainGain.gain.setTargetAtTime(0.009 + clamp(sim.rain.length / 140, 0, 1) * 0.032, now, 0.08);

    if (sim.mode !== 'playing') return;
    const beatDuration = 60 / (sim.act === 4 ? 118 : 94) / 2;
    while (this.nextBeat < now + 0.12) {
      this._scheduleBeat(sim, this.nextBeat, this.beat);
      this.nextBeat += beatDuration;
      this.beat += 1;
    }
  }

  consume(events, sim) {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    for (const event of events) {
      if (event.seq <= this.lastEvent) continue;
      this.lastEvent = event.seq;
      const pan = Number.isFinite(event.x) ? clamp(event.x / 450 - 1, -0.88, 0.88) : 0;
      if (event.type === 'open') {
        this._tone(196, 0.09, now, { type: 'sine', volume: 0.05, pan, glide: 293.66 });
      } else if (event.type === 'catch') {
        const note = [659.25, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98][(event.count - 1) % 7];
        this._tone(note, 0.11, now, { type: 'triangle', volume: 0.1, pan, attack: 0.002 });
        this._tone(note * 2.01, 0.055, now + 0.012, { type: 'sine', volume: 0.035, pan });
      } else if (event.type === 'release') {
        const strength = clamp(event.count / 7, 0.12, 1);
        this._noiseHit(now, 0.12 + strength * 0.12, 1200 + strength * 1500, 0.11 + strength * 0.12, pan);
        this._tone(392 + strength * 196, 0.2, now, { type: 'sawtooth', volume: 0.07 + strength * 0.06, pan, glide: 196 });
      } else if (event.type === 'source-hit') {
        const ratio = event.hp / Math.max(1, event.maxHp);
        this._tone(98, 0.22, now, { type: 'sine', volume: 0.16, pan, glide: 68 });
        this._tone(523.25 + (1 - ratio) * 130, 0.16, now + 0.015, { type: 'triangle', volume: 0.1, pan });
        this._noiseHit(now, 0.09, 540, 0.18, pan);
      } else if (event.type === 'source-collapse') {
        this._noiseHit(now, 0.55, 920, 0.32, pan);
        const chord = event.act === 1 ? [146.83, 220, 293.66, 440]
          : event.act === 2 ? [164.81, 246.94, 329.63, 493.88]
            : [196, 293.66, 392, 587.33];
        chord.forEach((frequency, index) => {
          this._tone(frequency, 1.2 + index * 0.08, now + index * 0.035, {
            type: index % 2 ? 'triangle' : 'sine',
            volume: 0.09,
            pan: (index - 1.5) * 0.25,
            attack: 0.018
          });
        });
      } else if (event.type === 'damage' || event.type === 'overload') {
        this._noiseHit(now, 0.28, 330, 0.3, pan);
        this._tone(116.54, 0.38, now, { type: 'sawtooth', volume: 0.11, pan, glide: 58.27 });
      } else if (event.type === 'seam') {
        this._tone(82.41, 0.32, now, { type: 'sine', volume: 0.075, pan, glide: 73.42 });
      } else if (event.type === 'reverse') {
        [196, 246.94, 293.66, 392, 493.88, 587.33, 783.99].forEach((frequency, index) => {
          this._tone(frequency, 1.9, now + index * 0.09, {
            type: index % 2 ? 'triangle' : 'sine',
            volume: 0.1,
            pan: Math.sin(index * 2.1) * 0.5,
            attack: 0.025
          });
        });
        this._noiseHit(now, 1.1, 1900, 0.22, 0);
      } else if (event.type === 'victory') {
        [293.66, 392, 493.88, 587.33, 783.99].forEach((frequency, index) => {
          this._tone(frequency, 2.4, now + index * 0.12, { type: 'sine', volume: 0.09, pan: (index - 2) * 0.22, attack: 0.04 });
        });
      }
    }
  }

  metrics() {
    return Object.freeze({
      available: Boolean(this.context),
      state: this.context?.state ?? 'uninitialized',
      muted: this.muted,
      activeVoices: this.activeVoices,
      peakVoices: this.peakVoices
    });
  }

  _scheduleBeat(sim, when, beat) {
    const lights = sim.worldLights;
    const finale = sim.act === 4;
    const roots = finale ? [146.83, 174.61, 196, 220] : [73.42, 82.41, 65.41, 98];
    const root = roots[Math.floor(beat / 8) % roots.length];
    if (beat % 4 === 0) this._tone(root, 0.44, when, { type: 'sine', volume: 0.055, pan: -0.12, attack: 0.012, destination: this.music });
    if (lights >= 1 && beat % 2 === 1) {
      this._tone(root * (beat % 8 === 3 ? 3 : 2), 0.18, when, { type: 'triangle', volume: 0.032, pan: 0.34, destination: this.music });
    }
    if (lights >= 2 && beat % 4 === 2) {
      this._tone(root * 1.5, 0.3, when, { type: 'sine', volume: 0.04, pan: -0.44, destination: this.music });
    }
    if (lights >= 3 || finale) {
      const scale = [1, 1.25, 1.5, 2, 1.5, 2.5, 2, 3];
      this._tone(root * scale[beat % scale.length], 0.22, when, { type: 'triangle', volume: finale ? 0.052 : 0.036, pan: Math.sin(beat * 1.4) * 0.58, destination: this.music });
    }
  }

  _tone(frequency, duration, when, options = {}) {
    if (!this.context || this.activeVoices >= 42) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const attack = options.attack ?? 0.006;
    const volume = options.volume ?? 0.07;
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), when);
    if (options.glide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.glide), when + Math.max(0.03, duration));
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(attack + 0.02, duration));
    oscillator.connect(gain);
    if (panner) {
      panner.pan.value = clamp(options.pan ?? 0, -1, 1);
      gain.connect(panner);
      panner.connect(options.destination ?? this.effects);
    } else {
      gain.connect(options.destination ?? this.effects);
    }
    this.activeVoices += 1;
    this.peakVoices = Math.max(this.peakVoices, this.activeVoices);
    oscillator.addEventListener('ended', () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      oscillator.disconnect();
      gain.disconnect();
      panner?.disconnect();
    }, { once: true });
    oscillator.start(when);
    oscillator.stop(when + duration + 0.04);
  }

  _noiseHit(when, duration, frequency, volume, pan) {
    if (!this.context || this.activeVoices >= 42) return;
    const ctx = this.context;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let state = (Math.floor(when * 100000) ^ length ^ 0xa511e9b3) >>> 0;
    for (let i = 0; i < length; i += 1) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      data[i] = ((state >>> 0) / 4294967296 * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = clamp(pan ?? 0, -1, 1);
      gain.connect(panner);
      panner.connect(this.effects);
    } else gain.connect(this.effects);
    this.activeVoices += 1;
    this.peakVoices = Math.max(this.peakVoices, this.activeVoices);
    source.addEventListener('ended', () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner?.disconnect();
    }, { once: true });
    source.start(when);
  }
}

