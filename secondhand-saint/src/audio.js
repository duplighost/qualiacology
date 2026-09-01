const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

const PHASE_MUSIC_GAIN = [0, .17, .205, .235];
const PHASE_BPM = [0, 108, 122, 136];
const ROOTS = [38, 39, 34, 33, 38, 41, 36, 33];
const PULSE_PATTERN = [12, 7, 15, 10, 12, 18, 7, 10];
const GLASS_PATTERN = [24, 19, 22, 15, 17, 27, 22, 19];

function stringHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(value) {
  let state = value >>> 0;
  state ^= state >>> 16;
  state = Math.imul(state, 0x7feb352d);
  state ^= state >>> 15;
  state = Math.imul(state, 0x846ca68b);
  state ^= state >>> 16;
  return (state >>> 0) / 4294967296;
}

export class AudioEngine {
  constructor({ muted = false } = {}) {
    this.muted = muted;
    this.started = false;
    this.phase = 1;
    this.step = 0;
    this.nextBeat = 0;
    this.lastUpdateTime = 0;
    this.voices = new Set();
    this.voiceMeta = new Map();
    this.maxVoices = 48;
    this.cooldowns = new Map();
    this.eventCounters = new Map();
    this.lastVariants = new Map();
    this.noiseCursor = 0;
    this.threat = 0;
    this.momentum = 0;
    this.stress = 0;
    this.ending = '';
    this.musicBaseGain = PHASE_MUSIC_GAIN[1];
  }

  async start() {
    if (!this.context) this._create();
    if (this.context.state === 'suspended') await this.context.resume();
    this.started = true;
    this.lastUpdateTime = this.context.currentTime;
    this.nextBeat = this.context.currentTime + .04;
  }

  _create() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 });
    this.master = this.context.createGain();
    this.music = this.context.createGain();
    this.sfx = this.context.createGain();
    this.sfxSpace = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.reverb = this.context.createConvolver();
    this.reverbReturn = this.context.createGain();
    this.musicVerbSend = this.context.createGain();
    this.sfxVerbSend = this.context.createGain();

    this.master.gain.value = this.muted ? 0 : .72;
    this.music.gain.value = this.musicBaseGain;
    this.sfx.gain.value = .82;
    this.sfxSpace.gain.value = 1;
    this.musicVerbSend.gain.value = .2;
    this.sfxVerbSend.gain.value = .12;
    this.reverbReturn.gain.value = .22;
    this.compressor.threshold.value = -13;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = .003;
    this.compressor.release.value = .18;

    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.sfxSpace.connect(this.sfx);
    this.sfxSpace.connect(this.sfxVerbSend);
    this.sfxVerbSend.connect(this.reverb);
    this.musicVerbSend.connect(this.reverb);
    this.reverb.connect(this.reverbReturn).connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(this.context.destination);

    this.reverb.buffer = this._createImpulse(1.45);
    this.noiseBuffer = this.context.createBuffer(1, 96000, 48000);
    const noise = this.noiseBuffer.getChannelData(0);
    let state = 0x5ec0d;
    for (let index = 0; index < noise.length; index += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      noise[index] = (state / 4294967296) * 2 - 1;
    }

    this.musicLayers = {
      low: this._createMusicLayer(.88),
      rhythm: this._createMusicLayer(.78),
      pulse: this._createMusicLayer(.68),
      glass: this._createMusicLayer(.58, true),
      air: this._createMusicLayer(.42, true),
    };
    this.musicDestinations = new Set([this.music, ...Object.values(this.musicLayers)]);
    this._setLayerTargets(this.phase, this.context.currentTime, true);
  }

  _createImpulse(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(2, length, this.context.sampleRate);
    let state = 0x91e10da5;
    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0;
        const random = (state / 4294967296) * 2 - 1;
        const decay = Math.pow(1 - index / length, 2.7);
        data[index] = random * decay * (index < this.context.sampleRate * .055 ? .34 : 1);
      }
    }
    return buffer;
  }

  _createMusicLayer(gain, spacious = false) {
    const layer = this.context.createGain();
    layer.gain.value = gain;
    layer.connect(this.music);
    if (spacious) layer.connect(this.musicVerbSend);
    return layer;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : .72, this.context.currentTime, .025);
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setPhase(phase) {
    this.phase = clamp(phase, 1, 3);
    this.musicBaseGain = PHASE_MUSIC_GAIN[this.phase];
    if (!this.context) return;
    const now = this.context.currentTime;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setTargetAtTime(this.musicBaseGain, now, .38);
    this._setLayerTargets(this.phase, now);
  }

  _setLayerTargets(phase, when, immediate = false) {
    if (!this.musicLayers) return;
    const targets = {
      low: [.88, .92, .96][phase - 1],
      rhythm: [.42, .76, .94][phase - 1],
      pulse: [.34, .7, .94][phase - 1],
      glass: [.54, .62, .72][phase - 1],
      air: [.25, .44, .64][phase - 1],
    };
    for (const [name, target] of Object.entries(targets)) {
      const parameter = this.musicLayers[name].gain;
      parameter.cancelScheduledValues(when);
      if (immediate) parameter.setValueAtTime(target, when);
      else parameter.setTargetAtTime(target, when, .45);
    }
  }

  _variant(key, count) {
    const current = this.eventCounters.get(key) || 0;
    this.eventCounters.set(key, current + 1);
    const seed = stringHash(key) ^ Math.imul(current + 1, 0x9e3779b1);
    const candidate = Math.floor(hashUnit(seed) * count) % count;
    const previous = this.lastVariants.get(key);
    const offset = count > 1 && candidate === previous
      ? 1 + Math.floor(hashUnit(seed ^ 0x85ebca6b) * (count - 1))
      : 0;
    const variant = (candidate + offset) % count;
    this.lastVariants.set(key, variant);
    return variant;
  }

  _musicVariation(step, salt = 0) {
    return hashUnit(Math.imul(step + 17, 0x45d9f3b) ^ Math.imul(salt + 31, 0x27d4eb2d));
  }

  _gate(key, interval) {
    if (!this.context || this.muted) return false;
    const now = this.context.currentTime;
    const previous = this.cooldowns.get(key) ?? -Infinity;
    if (now - previous < interval) return false;
    this.cooldowns.set(key, now);
    return true;
  }

  _bump({ threat = 0, momentum = 0, stress = 0 } = {}) {
    this.threat = clamp(this.threat + threat, 0, 1);
    this.momentum = clamp(this.momentum + momentum, 0, 1);
    this.stress = clamp(this.stress + stress, 0, 1);
  }

  _duckMusic(amount = .22, duration = .22) {
    if (!this.context || !this.music || this.muted) return;
    const now = this.context.currentTime;
    const low = Math.max(.025, this.musicBaseGain * (1 - amount));
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setValueAtTime(Math.min(this.music.gain.value, this.musicBaseGain), now);
    this.music.gain.linearRampToValueAtTime(low, now + .012);
    this.music.gain.exponentialRampToValueAtTime(Math.max(.001, this.musicBaseGain), now + duration);
  }

  _track(node, stopAt, priority = 1) {
    if (this.voices.size >= this.maxVoices) {
      let victim;
      let victimMeta;
      for (const voice of this.voices) {
        const meta = this.voiceMeta.get(voice) || { priority: 0, started: 0 };
        if (!victim || meta.priority < victimMeta.priority
          || (meta.priority === victimMeta.priority && meta.started < victimMeta.started)) {
          victim = voice;
          victimMeta = meta;
        }
      }
      // Never let a scheduled score note steal a live telegraph or impact.
      // Low-priority music is disposable when the combat mix is saturated.
      if (victimMeta && victimMeta.priority > priority) {
        try { node.stop(); } catch {}
        return node;
      }
      if (victim) {
        try { victim.stop(); } catch {}
        this.voices.delete(victim);
        this.voiceMeta.delete(victim);
      }
    }
    this.voices.add(node);
    this.voiceMeta.set(node, { priority, started: this.context?.currentTime || 0 });
    const remove = () => {
      this.voices.delete(node);
      this.voiceMeta.delete(node);
    };
    node.addEventListener?.('ended', remove, { once: true });
    if (stopAt) node.stop(stopAt);
    return node;
  }

  _tone({
    freq = 220, endFreq = freq, type = 'sine', duration = .12, gain = .12,
    attack = .008, when, pan = 0, detune = 0, destination, priority,
  } = {}) {
    if (!this.context || this.muted) return;
    const time = Math.max(this.context.currentTime, when ?? this.context.currentTime);
    const target = destination || this.sfx;
    const oscillator = this.context.createOscillator();
    const amplitude = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = type;
    oscillator.detune.setValueAtTime(detune, time);
    oscillator.frequency.setValueAtTime(Math.max(20, freq), time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + duration);
    amplitude.gain.setValueAtTime(.0001, time);
    amplitude.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), time + Math.min(attack, duration * .45));
    amplitude.gain.exponentialRampToValueAtTime(.0001, time + duration);
    panner.pan.value = clamp(pan, -1, 1);
    oscillator.connect(amplitude).connect(panner).connect(target);
    oscillator.start(time);
    this._track(oscillator, time + duration + .02,
      priority ?? (this.musicDestinations?.has(target) ? 0 : 2));
  }

  _noise({
    duration = .1, gain = .1, highpass = 300, lowpass = 16000,
    attack = 0, when, pan = 0, destination, priority,
  } = {}) {
    if (!this.context || this.muted) return;
    const time = Math.max(this.context.currentTime, when ?? this.context.currentTime);
    const target = destination || this.sfx;
    const source = this.context.createBufferSource();
    const high = this.context.createBiquadFilter();
    const low = this.context.createBiquadFilter();
    const amplitude = this.context.createGain();
    const panner = this.context.createStereoPanner();
    source.buffer = this.noiseBuffer;
    high.type = 'highpass';
    high.frequency.value = highpass;
    low.type = 'lowpass';
    low.frequency.value = Math.max(highpass + 40, lowpass);
    if (attack > 0) {
      amplitude.gain.setValueAtTime(.0001, time);
      amplitude.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), time + Math.min(attack, duration * .45));
    } else amplitude.gain.setValueAtTime(Math.max(.0002, gain), time);
    amplitude.gain.exponentialRampToValueAtTime(.0001, time + duration);
    panner.pan.value = clamp(pan, -1, 1);
    source.connect(high).connect(low).connect(amplitude).connect(panner).connect(target);
    const maximumOffset = Math.max(0, this.noiseBuffer.duration - duration - .01);
    const offset = hashUnit(Math.imul(++this.noiseCursor, 0x9e3779b1)) * maximumOffset;
    source.start(time, offset, Math.min(duration, this.noiseBuffer.duration - offset));
    this._track(source, time + duration + .02,
      priority ?? (this.musicDestinations?.has(target) ? 0 : 2));
  }

  _bandNoise({
    center = 900, q = 3, duration = .14, gain = .025, attack = .012,
    when, pan = 0, destination, priority = 2,
  } = {}) {
    if (!this.context || this.muted) return;
    const time = Math.max(this.context.currentTime, when ?? this.context.currentTime);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amplitude = this.context.createGain();
    const panner = this.context.createStereoPanner();
    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = center;
    filter.Q.value = q;
    amplitude.gain.setValueAtTime(.0001, time);
    amplitude.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), time + attack);
    amplitude.gain.exponentialRampToValueAtTime(.0001, time + duration);
    panner.pan.value = clamp(pan, -1, 1);
    source.connect(filter).connect(amplitude).connect(panner).connect(destination || this.sfx);
    const maximumOffset = Math.max(0, this.noiseBuffer.duration - duration - .01);
    const offset = hashUnit(Math.imul(++this.noiseCursor, 0x85ebca6b)) * maximumOffset;
    source.start(time, offset, Math.min(duration, this.noiseBuffer.duration - offset));
    this._track(source, time + duration + .02, priority);
  }

  _chime(frequency, when, gain = .02, duration = .42, destination, priority = 0) {
    const target = destination || this.musicLayers?.glass || this.music;
    this._tone({ freq: frequency, endFreq: frequency * .997, type: 'sine', duration, gain, attack: .006, when, destination: target, priority });
    this._tone({ freq: frequency * 2.012, endFreq: frequency * 1.994, type: 'triangle', duration: duration * .67, gain: gain * .34, attack: .004, when: when + .006, destination: target, priority });
  }

  update() {
    if (!this.started || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const elapsed = clamp(now - (this.lastUpdateTime || now), 0, .1);
    this.lastUpdateTime = now;
    this.threat = Math.max(0, this.threat - elapsed * .16);
    this.momentum = Math.max(0, this.momentum - elapsed * .095);
    this.stress = Math.max(0, this.stress - elapsed * .07);
    if (this.nextBeat < now - .5) this.nextBeat = now + .03;
    const horizon = now + .32;
    while (this.nextBeat < horizon) {
      this._musicStep(this.step++, this.nextBeat);
      this.nextBeat += 60 / PHASE_BPM[this.phase] / 2;
    }
  }

  _musicStep(step, when) {
    if (this.muted || this.ending || !this.musicLayers) return;
    const eighth = step % 8;
    const bar = Math.floor(step / 8);
    const phrase = Math.floor(step / 32);
    const rootMidi = ROOTS[bar % ROOTS.length];
    const root = midi(rootMidi);
    const intensity = clamp((this.phase - 1) * .28 + this.threat * .38
      + this.momentum * .24 + this.stress * .12, 0, 1);
    const phraseTurn = this._musicVariation(phrase, 1) > .5 ? 2 : -2;
    const time = when + (this._musicVariation(step, 4) - .5) * .008;

    if (eighth === 0 || (this.phase >= 2 && eighth === 4)) {
      const octave = eighth === 4 ? 2 : 1;
      this._tone({ freq: root * octave, endFreq: root * octave * .985, type: 'triangle', duration: this.phase === 3 ? .38 : .62, gain: .029 + intensity * .009, attack: .018, when: time, destination: this.musicLayers.low, priority: 0 });
      this._tone({ freq: root * octave * 1.498, endFreq: root * octave * 1.49, type: 'sine', duration: .52, gain: .009 + intensity * .004, attack: .025, when: time + .008, destination: this.musicLayers.low, priority: 0 });
    }

    const kickPattern = this.phase === 1 ? [0, 5] : this.phase === 2 ? [0, 3, 6] : [0, 2, 4, 6];
    if (kickPattern.includes(eighth) && (eighth === 0 || this._musicVariation(step, 7) > .13)) {
      this._tone({ freq: 76 + this.phase * 4, endFreq: 39, type: 'sine', duration: .12, gain: .024 + intensity * .012, attack: .002, when: time, destination: this.musicLayers.rhythm, priority: 0 });
      this._noise({ duration: .045, gain: .009 + intensity * .006, highpass: 70, lowpass: 420, when: time, destination: this.musicLayers.rhythm, priority: 0 });
    }

    const metalPattern = this.phase === 1 ? [3, 7] : this.phase === 2 ? [1, 3, 6, 7] : [1, 3, 5, 7];
    if (metalPattern.includes(eighth)) {
      const open = eighth === 7 && this._musicVariation(bar, 12) > .55;
      this._noise({ duration: open ? .12 : .035, gain: .005 + intensity * .004, highpass: 4100, lowpass: open ? 13200 : 9400, when: time, pan: (eighth % 4 - 1.5) * .11, destination: this.musicLayers.rhythm, priority: 0 });
    }

    if ((this.phase >= 2 || intensity > .52) && (this.phase === 3 || eighth % 2 === 0)) {
      const mutation = phrase % 3 === 2 && eighth === 6 ? phraseTurn : 0;
      const note = rootMidi + PULSE_PATTERN[(eighth + phrase) % PULSE_PATTERN.length] + mutation;
      const accent = eighth === 0 || eighth === 4;
      this._tone({ freq: midi(note), endFreq: midi(note - (accent ? 0 : 5)), type: this.phase === 3 ? 'sawtooth' : 'square', duration: this.phase === 3 ? .095 : .12, gain: (accent ? .011 : .0075) + intensity * .004, attack: .003, when: time, pan: eighth % 4 < 2 ? -.16 : .16, destination: this.musicLayers.pulse, priority: 0 });
    }

    const glassBeat = (bar + phrase) % 2 ? 2 : 5;
    if (eighth === glassBeat && this._musicVariation(bar, 20) > (this.phase === 1 ? .18 : .36)) {
      const note = rootMidi + GLASS_PATTERN[(bar + phrase) % GLASS_PATTERN.length]
        + (phrase % 4 === 3 ? phraseTurn : 0);
      this._chime(midi(note), time, .012 + this.momentum * .006, .36 + this.phase * .05);
    }

    if (this.phase === 3 && this.threat > .38 && (eighth === 1 || eighth === 6)) {
      const occult = root * (eighth === 1 ? Math.SQRT2 : 1.6818);
      this._tone({ freq: occult * 2, endFreq: occult * 1.82, type: 'triangle', duration: .17, gain: .007 + this.threat * .004, attack: .014, when: time, pan: eighth === 1 ? -.28 : .28, destination: this.musicLayers.air, priority: 0 });
    }
  }

  _playerEffort(kind, pan = 0, when) {
    const intervals = { quick: .38, heavy: .24, jump: .2, hurt: .12, special: .7 };
    if (!this._gate(`player-effort-${kind}`, intervals[kind] || .3)) return;
    const variant = this._variant(`effort-${kind}`, 4);
    const bases = {
      quick: [214, 228, 205, 238], heavy: [192, 205, 184, 216],
      jump: [226, 242, 218, 252], hurt: [178, 190, 166, 202],
      special: [204, 220, 196, 232],
    };
    const base = (bases[kind] || bases.quick)[variant];
    const duration = kind === 'special' ? .34 : kind === 'hurt' ? .25 : kind === 'heavy' ? .2 : .13;
    const endRatio = kind === 'jump' ? 1.24 : kind === 'hurt' ? .72 : kind === 'special' ? .82 : .88;
    const time = when ?? this.context.currentTime;
    this._tone({ freq: base, endFreq: base * endRatio, type: 'triangle', duration, gain: kind === 'hurt' ? .027 : .018, attack: .018, when: time, pan, destination: this.sfxSpace, priority: 2 });
    this._bandNoise({ center: 760 + variant * 85, q: 4.2, duration: duration * .86, gain: kind === 'hurt' ? .019 : .011, attack: .014, when: time + .012, pan, destination: this.sfxSpace, priority: 2 });
    this._bandNoise({ center: 1340 + variant * 105, q: 6, duration: duration * .72, gain: kind === 'hurt' ? .01 : .0065, attack: .018, when: time + .018, pan: -pan * .35, destination: this.sfxSpace, priority: 2 });
  }

  _bossIdentity(kind, phase, when, pan = 0) {
    const variant = this._variant(`boss-${kind}`, 4);
    const base = [61, 55, 48][clamp(phase, 1, 3) - 1] * [1, 1.06, .945, 1.122][variant];
    const duration = kind === 'cast' || kind === 'dive' ? .31 : .19;
    this._tone({ freq: base, endFreq: base * (kind === 'thrust' ? 1.35 : .7), type: 'sawtooth', duration, gain: .022 + phase * .004, attack: .018, when, pan, destination: this.sfxSpace, priority: 2 });
    this._tone({ freq: base * 1.414, endFreq: base * 1.31, type: 'triangle', duration: duration * 1.08, gain: .012 + phase * .002, attack: .025, when: when + .012, pan: -pan * .5, destination: this.sfxSpace, priority: 2 });
    this._bandNoise({ center: 330 + phase * 72, q: 5.5, duration: duration * .8, gain: .01 + phase * .002, attack: .025, when: when + .018, pan, destination: this.sfxSpace, priority: 2 });
  }

  quickSwing(pan = 0, delay = 0) {
    if (!this.context || !this._gate('quick-swing-core', .028)) return;
    const time = this.context.currentTime + Math.max(0, delay);
    const variant = this._variant('quick-swing', 4);
    const pitch = [1, 1.08, .94, 1.16][variant];
    this._noise({ duration: .075 + variant * .007, gain: .045, highpass: 1250 + variant * 180, lowpass: 9300, when: time, pan });
    this._tone({ freq: 470 * pitch, endFreq: 132 * pitch, type: 'sawtooth', duration: .095, gain: .022, attack: .002, when: time, pan });
    if (variant === 1 || variant === 3) this._playerEffort('quick', pan * .45, time - .012);
    this._bump({ momentum: .012 });
  }

  heavySwing(pan = 0, delay = 0) {
    if (!this.context || !this._gate('heavy-swing-core', .08)) return;
    const time = this.context.currentTime + Math.max(0, delay);
    const variant = this._variant('heavy-swing', 3);
    const pitch = [1, .9, 1.08][variant];
    this._noise({ duration: .19, gain: .075, highpass: 260, lowpass: 5500 + variant * 700, when: time, pan });
    this._tone({ freq: 194 * pitch, endFreq: 42, type: 'square', duration: .225, gain: .052, attack: .004, when: time, pan });
    this._tone({ freq: 760 * pitch, endFreq: 210, type: 'triangle', duration: .12, gain: .018, attack: .003, when: time + .014, pan: -pan * .35 });
    this._playerEffort('heavy', pan * .4, time - .035);
    this._bump({ momentum: .025 });
  }

  jump(secondJump = false) {
    if (!this.context || !this._gate(secondJump ? 'air-jump' : 'ground-jump', .12)) return;
    const time = this.context.currentTime;
    const variant = this._variant(secondJump ? 'air-jump-variant' : 'ground-jump-variant', 3);
    const pan = secondJump ? (variant - 1) * .13 : 0;
    this._noise({ duration: secondJump ? .105 : .085, gain: secondJump ? .044 : .034, highpass: secondJump ? 1200 : 310, lowpass: secondJump ? 11200 : 4200, when: time, pan });
    this._tone({ freq: secondJump ? 360 : 118, endFreq: secondJump ? 980 + variant * 90 : 205, type: secondJump ? 'triangle' : 'sine', duration: secondJump ? .18 : .14, gain: secondJump ? .038 : .03, attack: .004, when: time, pan, destination: secondJump ? this.sfxSpace : this.sfx, priority: 2 });
    if (secondJump) this._tone({ freq: 720, endFreq: 1420, type: 'sine', duration: .21, gain: .017, attack: .009, when: time + .018, pan: -pan, destination: this.sfxSpace, priority: 2 });
    this._playerEffort('jump', pan * .5, time - .008);
  }

  guard() {
    if (!this.context || !this._gate('guard', .055)) return;
    const time = this.context.currentTime;
    const variant = this._variant('guard', 3);
    this._tone({ freq: 330 + variant * 42, endFreq: 560 + variant * 55, type: 'triangle', duration: .12, gain: .034, attack: .003, when: time, destination: this.sfxSpace });
    this._noise({ duration: .046, gain: .028, highpass: 2300 + variant * 250, lowpass: 8200, when: time });
  }

  bossRelease(kind = 'arc', phase = 1) {
    if (!this.context || !this._gate(`boss-release-${kind}`, .035)) return;
    const time = this.context.currentTime;
    const area = ['aimAoe', 'lowRing', 'outer', 'lane', 'laneCross', 'sectors'].includes(kind);
    const variant = this._variant(`boss-release-${kind}-variant`, 4);
    if (area) {
      this._tone({ freq: 132 + phase * 17 + variant * 4, endFreq: 48 + variant * 3, type: 'triangle', duration: .16, gain: .04 + phase * .006, attack: .003, when: time });
      this._noise({ duration: .095, gain: .034 + phase * .006, highpass: 95, lowpass: 1380 + variant * 140, when: time });
      this._tone({ freq: 740 + variant * 90, endFreq: 1180, type: 'sine', duration: .085, gain: .013, attack: .002, when: time + .018, destination: this.sfxSpace });
    } else {
      this._noise({ duration: .058, gain: .038 + phase * .006, highpass: 1750 + variant * 180, lowpass: 11800, when: time });
      this._tone({ freq: 780 + phase * 84 + variant * 38, endFreq: 176 + variant * 12, type: 'sawtooth', duration: .082, gain: .024 + phase * .004, attack: .002, when: time });
      this._tone({ freq: 118, endFreq: 67, type: 'square', duration: .11, gain: .018, attack: .002, when: time + .006 });
    }
    this._bump({ threat: .12 + phase * .025 });
    this._duckMusic(.12 + phase * .03, .15);
  }

  missileCommit(side = 0, when) {
    if (!this.context || !this._gate(`missile-commit-${side < 0 ? 'l' : 'r'}`, .04)) return;
    const time = when ?? this.context.currentTime;
    const pan = clamp(Number.isFinite(side) ? side * .44 : 0, -.72, .72);
    const variant = this._variant('missile-commit', 3);
    this._tone({ freq: 138 + variant * 11, endFreq: 84, type: 'square', duration: .064, gain: .046, attack: .002, when: time, pan });
    this._noise({ duration: .038, gain: .037, highpass: 1700, lowpass: 6500 + variant * 500, when: time, pan });
    this._tone({ freq: 390 + variant * 26, endFreq: 980 + variant * 80, type: 'triangle', duration: .145, gain: .04, attack: .004, when: time + .015, pan, destination: this.sfxSpace });
    this._tone({ freq: 198, endFreq: 212, type: 'sine', duration: .19, gain: .014, attack: .015, when: time + .012, pan: -pan * .35, destination: this.sfxSpace });
    this._bump({ threat: .16 });
  }

  missileLaunch(side = 0) {
    if (!this.context || !this._gate(`missile-launch-${side < 0 ? 'l' : 'r'}`, .04)) return;
    const time = this.context.currentTime;
    const pan = clamp(Number.isFinite(side) ? side * .44 : 0, -.72, .72);
    const variant = this._variant('missile-launch', 4);
    this._noise({ duration: .18, gain: .09, highpass: 100, lowpass: 5100 + variant * 420, when: time, pan });
    this._tone({ freq: 182 + variant * 9, endFreq: 48 + variant * 2, type: 'sawtooth', duration: .25, gain: .074, attack: .003, when: time, pan });
    this._tone({ freq: 1260 + variant * 95, endFreq: 310 + variant * 25, type: 'sine', duration: .18, gain: .032, attack: .003, when: time + .024, pan, destination: this.sfxSpace });
    this._tone({ freq: 74, endFreq: 58, type: 'square', duration: .1, gain: .028, attack: .002, when: time + .012, pan });
    this._bump({ threat: .1 });
  }

  missileReflect(method = 'sword', pan = 0) {
    if (!this.context || !this._gate(`missile-reflect-${method}`, .035)) return;
    const time = this.context.currentTime;
    const precise = method === 'deflect';
    const empowered = method === 'meridian';
    const variant = this._variant(`missile-reflect-${method}-variant`, 3);
    const start = (empowered ? 530 : precise ? 930 : 690) * [1, 1.035, .97][variant];
    const end = empowered ? 2320 : precise ? 1840 : 1420;
    const gain = empowered ? .13 : precise ? .112 : .088;
    const stereo = clamp(Number.isFinite(pan) ? pan : 0, -.65, .65);
    this._noise({ duration: .068, gain: gain * .7, highpass: 3200, lowpass: 15500, when: time, pan: stereo });
    this._tone({ freq: start, endFreq: end, type: 'triangle', duration: .225, gain, attack: .002, when: time, pan: stereo, destination: this.sfxSpace, priority: 3 });
    this._tone({ freq: start * 1.505, endFreq: end * 1.27, type: 'sine', duration: .3, gain: gain * .55, attack: .004, when: time + .017, pan: -stereo * .45, destination: this.sfxSpace, priority: 3 });
    this._tone({ freq: 128, endFreq: 252, type: 'sine', duration: .19, gain: gain * .42, attack: .003, when: time + .01, pan: stereo });
    this._bump({ threat: -.2, momentum: precise ? .3 : .2 });
    this._duckMusic(.32, .24);
  }

  missileReturnHit(pan = 0) {
    if (!this.context || !this._gate('missile-return-hit', .045)) return;
    const time = this.context.currentTime;
    const stereo = clamp(Number.isFinite(pan) ? pan : 0, -.65, .65);
    const variant = this._variant('missile-return-impact', 3);
    this._noise({ duration: .255, gain: .155, highpass: 85, lowpass: 7600 + variant * 600, when: time, pan: stereo, priority: 3 });
    this._tone({ freq: 202 + variant * 12, endFreq: 34, type: 'sawtooth', duration: .35, gain: .132, attack: .002, when: time, pan: stereo, priority: 3 });
    this._tone({ freq: 790 + variant * 60, endFreq: 228, type: 'triangle', duration: .225, gain: .068, attack: .002, when: time, pan: stereo, destination: this.sfxSpace, priority: 3 });
    this._tone({ freq: 1580, endFreq: 2380 + variant * 90, type: 'sine', duration: .17, gain: .048, attack: .003, when: time + .022, pan: -stereo * .5, destination: this.sfxSpace, priority: 3 });
    this._bossIdentity('return', this.phase, time + .018, stereo * .35);
    this._bump({ threat: -.28, momentum: .34 });
    this._duckMusic(.48, .31);
  }

  hit(weight = 1, pan = 0) {
    if (!this.context || !this._gate('impact-core', .018)) return;
    const time = this.context.currentTime;
    const strength = clamp(weight, .35, 1.75);
    const variant = this._variant(strength > 1.1 ? 'heavy-impact' : 'blade-impact', 4);
    const bright = [1, 1.12, .94, 1.23][variant];
    this._noise({ duration: .065 + strength * .045, gain: .072 * strength, highpass: 470 + variant * 110, lowpass: 6500 + variant * 700, when: time, pan });
    this._tone({ freq: (108 + strength * 54) * bright, endFreq: 43, type: 'triangle', duration: .085 + strength * .075, gain: .062 * strength, attack: .002, when: time, pan });
    this._tone({ freq: (1040 + strength * 380) * bright, endFreq: 640 + variant * 35, type: 'sine', duration: .052 + strength * .012, gain: .023 * strength, attack: .0015, when: time, pan, destination: this.sfxSpace });
    if (strength > 1.1) this._tone({ freq: 286 + variant * 37, endFreq: 172, type: 'square', duration: .12, gain: .022 * strength, attack: .002, when: time + .008, pan: -pan * .4 });
    this._bump({ momentum: .05 * strength });
    this._duckMusic(.1 + strength * .08, .12 + strength * .05);
  }

  parry() {
    if (!this.context || !this._gate('parry-success', .045)) return;
    const time = this.context.currentTime;
    const variant = this._variant('parry-success-variant', 3);
    const detune = [0, 34, -27][variant];
    this._tone({ freq: 900, endFreq: 1390, type: 'sine', duration: .29, gain: .132, attack: .002, when: time, detune, destination: this.sfxSpace, priority: 3 });
    this._tone({ freq: 1350, endFreq: 1820, type: 'triangle', duration: .33, gain: .084, attack: .003, when: time + .016, detune: -detune * .4, destination: this.sfxSpace, priority: 3 });
    this._noise({ duration: .065, gain: .076, highpass: 3500 + variant * 240, lowpass: 15500, when: time, priority: 3 });
    this._tone({ freq: 122, endFreq: 188, type: 'sine', duration: .18, gain: .028, attack: .002, when: time + .006, priority: 3 });
    this._bump({ threat: -.16, momentum: .26 });
    this._duckMusic(.38, .27);
  }

  perfectDodge() {
    if (!this.context || !this._gate('perfect-dodge', .065)) return;
    const time = this.context.currentTime;
    const variant = this._variant('perfect-dodge-variant', 3);
    this._tone({ freq: 228 + variant * 18, endFreq: 1020 + variant * 90, type: 'sine', duration: .22, gain: .074, attack: .004, when: time, pan: -.24, destination: this.sfxSpace, priority: 3 });
    this._tone({ freq: 350 + variant * 24, endFreq: 1420 + variant * 105, type: 'sine', duration: .205, gain: .052, attack: .004, when: time + .024, pan: .24, destination: this.sfxSpace, priority: 3 });
    this._bandNoise({ center: 2800, q: 2.8, duration: .16, gain: .019, attack: .012, when: time, destination: this.sfxSpace, priority: 3 });
    this._bump({ threat: -.1, momentum: .18 });
  }

  playerHit() {
    if (!this.context || !this._gate('player-hit', .08)) return;
    const time = this.context.currentTime;
    const variant = this._variant('player-hit-variant', 3);
    this._noise({ duration: .21, gain: .13, highpass: 80, lowpass: 1650 + variant * 180, when: time, priority: 3 });
    this._tone({ freq: 126 + variant * 7, endFreq: 34, type: 'sawtooth', duration: .31, gain: .105, attack: .002, when: time, priority: 3 });
    this._playerEffort('hurt', (variant - 1) * .12, time + .015);
    this._bump({ momentum: -.25, stress: .34 });
    this._duckMusic(.44, .35);
  }

  telegraph(kind = 'cut') {
    if (!this.context || !this._gate(`telegraph-${kind}`, .04)) return;
    const profiles = {
      cut: { start: 510, end: 790, duration: .22, pulse: .07 },
      thrust: { start: 310, end: 1120, duration: .255, pulse: .04 },
      ring: { start: 238, end: 438, duration: .31, pulse: .11 },
      cast: { start: 174, end: 690, duration: .34, pulse: .13 },
      dive: { start: 142, end: 940, duration: .29, pulse: .06 },
    };
    const profile = profiles[kind] || profiles.cut;
    const time = this.context.currentTime;
    const variant = this._variant(`telegraph-${kind}-variant`, 4);
    const pitch = [1, 1.025, .978, 1.052][variant];
    this._noise({ duration: .026, gain: .03 + this.phase * .003, highpass: 2300, lowpass: 6900 + variant * 500, when: time, priority: 3 });
    this._tone({ freq: profile.start * pitch, endFreq: profile.end * pitch, type: 'triangle', duration: profile.duration, gain: .051 + this.phase * .004, attack: .004, when: time, destination: this.sfxSpace, priority: 3 });
    this._tone({ freq: profile.start * .5, endFreq: profile.end * .5, type: 'sine', duration: profile.duration + .08, gain: .022 + this.phase * .002, attack: .018, when: time + profile.pulse, destination: this.sfxSpace, priority: 3 });
    if (kind === 'ring' || kind === 'cast') this._tone({ freq: profile.start * 2.02, endFreq: profile.end * 1.49, type: 'sine', duration: .18, gain: .011, attack: .01, when: time + .035, destination: this.sfxSpace, priority: 2 });
    this._bossIdentity(kind, this.phase, time, variant % 2 ? -.12 : .12);
    this._bump({ threat: .2 + this.phase * .035 });
  }

  rupture() {
    if (!this.context || !this._gate('rupture', .11)) return;
    const time = this.context.currentTime;
    const variant = this._variant('rupture-variant', 3);
    this._noise({ duration: .42, gain: .17, highpass: 110, lowpass: 9300 + variant * 600, when: time, priority: 3 });
    for (let index = 0; index < 4; index += 1) {
      this._tone({ freq: (88 + variant * 3) * (index + 1), endFreq: 40 * (index + 1), type: index % 2 ? 'triangle' : 'sawtooth', duration: .33 + index * .04, gain: .067 / (1 + index * .34), attack: .003, when: time + index * .013, pan: (index - 1.5) * .16, destination: index > 1 ? this.sfxSpace : this.sfx, priority: 3 });
    }
    this._bandNoise({ center: 460, q: 2.2, duration: .46, gain: .046, attack: .06, when: time + .02, destination: this.sfxSpace, priority: 3 });
    this._bump({ threat: .28, stress: .16 });
    this._duckMusic(.52, .42);
  }

  transition(phase) {
    if (!this.context || !this._gate(`transition-${phase}`, .3)) {
      this.setPhase(phase);
      return;
    }
    const time = this.context.currentTime;
    const targetPhase = clamp(phase, 1, 3);
    const base = targetPhase === 3 ? 92.5 : 110;
    const ratios = targetPhase === 3
      ? [1, 1.189, 1.414, 1.782, 2.378, 2.828]
      : [1, 1.25, 1.5, 1.875, 2.25, 3];
    ratios.forEach((ratio, index) => {
      this._tone({ freq: base * ratio, endFreq: base * ratio * (targetPhase === 3 ? 1.62 : 2.1), type: index % 2 ? 'triangle' : 'sine', duration: .7 + index * .025, gain: .038 / (1 + index * .12), attack: .022, when: time + index * .052, pan: (index - 2.5) * .1, destination: this.sfxSpace, priority: 3 });
    });
    this._noise({ duration: .82, gain: .094, highpass: 55, lowpass: targetPhase === 3 ? 1500 : 1120, attack: .035, when: time, destination: this.sfxSpace, priority: 3 });
    this._bossIdentity('transition', targetPhase, time + .09);
    this._bump({ threat: .36, stress: .12 });
    this._duckMusic(.58, .56);
    this.setPhase(targetPhase);
  }

  special() {
    if (!this.context || !this._gate('player-special', .22)) return;
    const time = this.context.currentTime;
    const variant = this._variant('player-special-variant', 3);
    const ratios = variant === 0 ? [1, 1.5, 2, 3, 4.5]
      : variant === 1 ? [1, 1.25, 2.5, 3.75, 5]
        : [1, 1.6, 2.4, 3.2, 4.8];
    ratios.forEach((ratio, index) => {
      this._tone({ freq: 158 * ratio, endFreq: 76 * Math.pow(1.19, index), type: 'sine', duration: .49, gain: .07 / (1 + index * .27), attack: .006, when: time + index * .025, pan: (index - 2) * .12, destination: this.sfxSpace, priority: 3 });
    });
    this._noise({ duration: .23, gain: .145, highpass: 1700, lowpass: 15800, when: time + .125, destination: this.sfxSpace, priority: 3 });
    this._playerEffort('special', 0, time - .025);
    this._bump({ threat: -.18, momentum: .4 });
    this._duckMusic(.46, .42);
  }

  victory() {
    this.ending = 'victory';
    if (!this.context || !this._gate('victory', 1)) return;
    const time = this.context.currentTime;
    const melody = [62, 65, 69, 74, 72, 77];
    [38, 38, 41, 43].forEach((note, index) => {
      this._tone({ freq: midi(note), endFreq: midi(note) * .995, type: 'triangle', duration: 1.3, gain: .034, attack: .055, when: time + index * .34, destination: this.musicLayers?.low || this.music, priority: 3 });
    });
    melody.forEach((note, index) => {
      this._chime(midi(note), time + index * .17, .032 - index * .0018, 1.18 - index * .07, this.musicLayers?.glass || this.music, 3);
    });
    [50, 57, 62, 65].forEach((note, index) => {
      this._tone({ freq: midi(note), endFreq: midi(note), type: 'sine', duration: 1.65, gain: .022, attack: .12, when: time + .62 + index * .025, pan: (index - 1.5) * .18, destination: this.musicLayers?.air || this.music, priority: 3 });
    });
    this._noise({ duration: .42, gain: .025, highpass: 5200, lowpass: 14800, attack: .1, when: time + .72, destination: this.musicLayers?.air || this.music, priority: 1 });
    this._bump({ threat: -1, momentum: .5, stress: -1 });
  }

  defeat() {
    this.ending = 'defeat';
    if (!this.context || !this._gate('defeat', 1)) return;
    const time = this.context.currentTime;
    [220, 164.81, 116.54, 55].forEach((frequency, index) => {
      this._tone({ freq: frequency, endFreq: frequency * .46, type: index === 3 ? 'sine' : 'triangle', duration: .58 + index * .07, gain: .06 / (1 + index * .08), attack: .018, when: time + index * .12, pan: (1.5 - index) * .12, destination: index < 2 ? this.sfxSpace : this.musicLayers?.low || this.music, priority: 3 });
    });
    this._noise({ duration: .72, gain: .058, highpass: 65, lowpass: 720, attack: .08, when: time + .1, destination: this.sfxSpace, priority: 3 });
    this._playerEffort('hurt', 0, time + .02);
    this._duckMusic(.72, .7);
  }

  reset() {
    this.phase = 1;
    this.step = 0;
    this.noiseCursor = 0;
    this.threat = 0;
    this.momentum = 0;
    this.stress = 0;
    this.ending = '';
    this.cooldowns.clear();
    this.eventCounters.clear();
    this.lastVariants.clear();
    if (this.context) {
      this.nextBeat = this.context.currentTime + .05;
      this.lastUpdateTime = this.context.currentTime;
    }
    this.setPhase(1);
  }

  stopAll() {
    for (const voice of this.voices) {
      try { voice.stop(); } catch {}
    }
    this.voices.clear();
    this.voiceMeta.clear();
  }

  snapshot() {
    return {
      started: this.started,
      muted: this.muted,
      phase: this.phase,
      voices: this.voices.size,
      voiceLimit: this.maxVoices,
      musicStep: this.step,
      threat: Number(this.threat.toFixed(3)),
      momentum: Number(this.momentum.toFixed(3)),
      stress: Number(this.stress.toFixed(3)),
      ending: this.ending,
      contextState: this.context?.state || 'uninitialized',
    };
  }
}
