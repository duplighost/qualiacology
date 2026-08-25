const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / Math.max(1e-6, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const BOOST_EVENTS = new Set([
  'thermal-sling', 'lightning-ride', 'vine-cut', 'ice-bloom',
  'magnetic-throw', 'worm-surf', 'gravity-lean', 'echo-break',
  'crown-ring', 'gate-boost', 'space-gate', 'wall-kiss',
]);

const FAILURE_EVENTS = new Set([
  'vent-burst', 'ice-crack', 'worm-pass', 'sun-skim',
  'space-near-miss', 'rail-touch',
]);

const MORPH_LATCH_THRESHOLDS = Object.freeze([0.25, 0.55, 0.82]);
const LANDING_DUCK_GAIN = 10 ** (-2.5 / 20);
const AMBIENCE_GIMMICKS = new Set([
  'thermal-vent-slings',
  'asteroid-cathedral',
  'lightning-rails',
]);

export const COMBAT_ONE_SHOT_VOICE_DEMAND = Object.freeze({
  'rival-shot': Object.freeze({ tone: 1, noise: 1 }),
  'player-hit': Object.freeze({ tone: 2, noise: 1 }),
  'incoming-dodge': Object.freeze({ tone: 2, noise: 1 }),
  'incoming-whiff': Object.freeze({ tone: 0, noise: 1 }),
});

// The synchronized first-loop route currently schedules 17 combat tones and
// 13 combat noise bursts. These event reservations provide more than twice
// that measured concurrency. The sources are persistent, gain-gated voices:
// they start once with the prepared engine graph, then retrigger indefinitely
// through AudioParam automation. Web Audio source nodes are never constructed
// in the reciprocal-combat trigger path.
export const COMBAT_ONE_SHOT_EVENT_RESERVATION = Object.freeze({
  'rival-shot': 16,
  'player-hit': 8,
  'incoming-dodge': 4,
  'incoming-whiff': 4,
});

export function countCombatOneShotVoices(eventCounts = {}) {
  const total = { tone: 0, noise: 0 };
  for (const [eventType, demand] of Object.entries(COMBAT_ONE_SHOT_VOICE_DEMAND)) {
    const count = Math.max(0, Math.floor(Number(eventCounts[eventType]) || 0));
    total.tone += demand.tone * count;
    total.noise += demand.noise * count;
  }
  return total;
}

export const COMBAT_ONE_SHOT_POOL_CAPACITY = Object.freeze(
  countCombatOneShotVoices(COMBAT_ONE_SHOT_EVENT_RESERVATION),
);

function stableUnit(value, salt = 0) {
  const text = `${value ?? ''}:${salt}`;
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return (hash >>> 0) / 4294967296;
}

function eventVariation(event, salt = 0) {
  const quantizedTime = Math.round((Number(event?.time) || 0) * 120);
  return stableUnit(`${event?.type}:${event?.targetId ?? event?.sourceId ?? ''}:${quantizedTime}`, salt);
}

function fillDeterministicNoise(buffer, seed = 0x91e10da5) {
  const data = buffer.getChannelData(0);
  let value = seed >>> 0;
  for (let i = 0; i < data.length; i += 1) {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    data[i] = ((value >>> 0) / 2147483648 - 1) * 0.92;
  }
}

export class AudioDirector {
  constructor({ muted = false } = {}) {
    this.muted = muted;
    this.outputLevel = 0.68;
    this.context = null;
    this.master = null;
    this.limiter = null;
    this.captureDestination = null;

    this.engineGain = null;
    this.engineFilter = null;
    this.engineVoices = [];
    this.carGain = null;
    this.rocketGain = null;
    this.rocketFilter = null;
    this.rocketVoices = [];
    this.rocketNoiseGain = null;
    this.rocketNoiseFilter = null;
    this.windGain = null;
    this.windFilter = null;
    this.boostToneGain = null;
    this.boostTone = null;
    this.driftGain = null;
    this.driftFilter = null;
    this.driftToneGain = null;
    this.driftTone = null;
    this.driftPanner = null;
    this.morphGain = null;
    this.morphFilter = null;
    this.morphToneGain = null;
    this.morphTone = null;

    this.musicGain = null;
    this.musicOsc = null;
    this.musicFifth = null;
    this.noiseBuffer = null;
    this.noiseSource = null;

    this.ready = false;
    this.stageIndex = -1;
    this.nextBeat = 0;
    this.beatIndex = 0;
    this.previousSpeed = null;
    this.previousBoost = 0;
    this.previousSurge = false;
    this.thrustEnvelope = 0;
    this.touchdownEnvelope = 0;
    this.silentArmed = false;
    this.ignitionPlayed = false;
    this.pendingEngineBloomAt = 0;
    this.pendingEngineBloomStrength = 0;
    this.landingDuckUntil = 0;
    this.foldKey = null;
    this.previousFoldProgress = 0;
    this.morphLatchMask = 0;
    this.nextMorphLatchAt = 0;
    this.ambienceKey = null;
    this.ambienceSerial = 0;
    this.nextAmbienceAt = 0;
    this.musicBaseGain = 0.018;
    this.cueCounts = Object.create(null);
    this.lastCueAt = Object.create(null);
    this.preparedSources = [];
    this.sourcesStarted = false;
    this.combatOneShotPool = { tone: [], noise: [] };
    this.combatOneShotCursor = { tone: 0, noise: 0 };
    this.combatOneShotStats = {
      target: { ...COMBAT_ONE_SHOT_POOL_CAPACITY },
      created: { tone: 0, noise: 0 },
      used: { tone: 0, noise: 0 },
      overflowFallback: { tone: 0, noise: 0 },
      active: { tone: 0, noise: 0 },
      retired: { tone: 0, noise: 0 },
      retriggered: { tone: 0, noise: 0 },
      steals: { tone: 0, noise: 0 },
      peakActive: { tone: 0, noise: 0 },
      scheduleFailures: { tone: 0, noise: 0 },
      preallocationFailures: { tone: 0, noise: 0 },
    };
  }

  async prepare() {
    if (this.ready) return true;
    await this.start({ ignite: false, resumeContext: false });
    // AudioContexts normally begin suspended before a user gesture, but an
    // origin with autoplay permission may create one running. Preparation is
    // deliberately silent and must not spend the user's first input suspending
    // or constructing the graph, so normalize that uncommon case here.
    if (this.context?.state === 'running') {
      try { await this.context.suspend(); } catch { /* suspension is best-effort */ }
    }
    return this.ready;
  }

  async start({ ignite = true, resumeContext = true } = {}) {
    if (this.ready) {
      const resumePromise = resumeContext ? this.resume() : Promise.resolve();
      if (ignite) {
        this._startPreparedSources();
        this.silentArmed = false;
        this._applyMasterLevel(0.012);
        if (!this.ignitionPlayed) this.playIgnition();
      }
      await resumePromise;
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor({ latencyHint: 'interactive' });
    const master = context.createGain();
    this.silentArmed = !ignite;
    master.gain.value = this.muted || this.silentArmed ? 0 : this.outputLevel;
    master.connect(context.destination);
    const captureDestination = context.createMediaStreamDestination?.() ?? null;
    if (captureDestination) master.connect(captureDestination);

    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 10;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.19;
    limiter.connect(master);

    const engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 1700;
    engineFilter.Q.value = 0.78;
    const engineGain = context.createGain();
    engineGain.gain.value = 0.12;
    engineFilter.connect(engineGain).connect(limiter);

    const carGain = context.createGain();
    carGain.gain.value = 1;
    carGain.connect(engineFilter);
    const engineVoices = [
      { type: 'triangle', ratio: 0.5, gain: 0.29, detune: -4 },
      { type: 'sawtooth', ratio: 1, gain: 0.085, detune: 3 },
      { type: 'sine', ratio: 2.005, gain: 0.065, detune: 0 },
    ].map((spec) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = spec.type;
      oscillator.frequency.value = 58;
      oscillator.detune.value = spec.detune;
      gain.gain.value = spec.gain;
      oscillator.connect(gain).connect(carGain);
      return { ...spec, oscillator, gain };
    });

    const rocketFilter = context.createBiquadFilter();
    rocketFilter.type = 'lowpass';
    rocketFilter.frequency.value = 2200;
    rocketFilter.Q.value = 0.64;
    const rocketGain = context.createGain();
    rocketGain.gain.value = 0.0001;
    rocketFilter.connect(rocketGain).connect(engineFilter);
    const rocketVoices = [
      { type: 'triangle', ratio: 0.25, gain: 0.34, detune: -7 },
      { type: 'sawtooth', ratio: 0.5, gain: 0.12, detune: 5 },
      { type: 'sine', ratio: 1.505, gain: 0.055, detune: 0 },
    ].map((spec) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = spec.type;
      oscillator.frequency.value = 82;
      oscillator.detune.value = spec.detune;
      gain.gain.value = spec.gain;
      oscillator.connect(gain).connect(rocketFilter);
      return { ...spec, oscillator, gain };
    });

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    fillDeterministicNoise(noiseBuffer);
    const noiseSource = context.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const windFilter = context.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 1250;
    windFilter.Q.value = 0.5;
    const windGain = context.createGain();
    windGain.gain.value = 0.015;
    noiseSource.connect(windFilter).connect(windGain).connect(limiter);

    const rocketNoiseFilter = context.createBiquadFilter();
    rocketNoiseFilter.type = 'lowpass';
    rocketNoiseFilter.frequency.value = 330;
    rocketNoiseFilter.Q.value = 0.72;
    const rocketNoiseGain = context.createGain();
    rocketNoiseGain.gain.value = 0.0001;
    noiseSource.connect(rocketNoiseFilter).connect(rocketNoiseGain).connect(engineGain);

    const driftFilter = context.createBiquadFilter();
    driftFilter.type = 'bandpass';
    driftFilter.frequency.value = 620;
    driftFilter.Q.value = 0.72;
    const driftGain = context.createGain();
    driftGain.gain.value = 0.0001;
    const driftPanner = context.createStereoPanner?.();
    if (driftPanner) noiseSource.connect(driftFilter).connect(driftGain).connect(driftPanner).connect(limiter);
    else noiseSource.connect(driftFilter).connect(driftGain).connect(limiter);

    const driftTone = context.createOscillator();
    driftTone.type = 'sine';
    driftTone.frequency.value = 210;
    const driftToneGain = context.createGain();
    driftToneGain.gain.value = 0.0001;
    if (driftPanner) driftTone.connect(driftToneGain).connect(driftPanner);
    else driftTone.connect(driftToneGain).connect(limiter);

    const morphFilter = context.createBiquadFilter();
    morphFilter.type = 'bandpass';
    morphFilter.frequency.value = 900;
    morphFilter.Q.value = 0.4;
    const morphGain = context.createGain();
    morphGain.gain.value = 0.0001;
    noiseSource.connect(morphFilter).connect(morphGain).connect(limiter);
    const morphTone = context.createOscillator();
    morphTone.type = 'sine';
    morphTone.frequency.value = 285;
    const morphToneGain = context.createGain();
    morphToneGain.gain.value = 0.0001;
    morphTone.connect(morphToneGain).connect(limiter);

    const boostTone = context.createOscillator();
    boostTone.type = 'sine';
    boostTone.frequency.value = 480;
    const boostToneFilter = context.createBiquadFilter();
    boostToneFilter.type = 'bandpass';
    boostToneFilter.frequency.value = 820;
    boostToneFilter.Q.value = 0.55;
    const boostToneGain = context.createGain();
    boostToneGain.gain.value = 0.0001;
    boostTone.connect(boostToneFilter).connect(boostToneGain).connect(limiter);

    // Ignition is the player's first audible consequence, so its voices and
    // graph already exist before the trusted click. The source nodes begin in
    // that trusted gesture instead of during calibration: this preserves the
    // hitch-free parameter-automation path without generating one autoplay
    // warning per oscillator on every cold load.
    const ignitionLow = context.createOscillator();
    ignitionLow.type = 'sine';
    ignitionLow.frequency.value = 38;
    const ignitionLowGain = context.createGain();
    ignitionLowGain.gain.value = 0;
    ignitionLow.connect(ignitionLowGain).connect(limiter);

    const ignitionHigh = context.createOscillator();
    ignitionHigh.type = 'triangle';
    ignitionHigh.frequency.value = 112;
    const ignitionHighGain = context.createGain();
    ignitionHighGain.gain.value = 0;
    ignitionHigh.connect(ignitionHighGain).connect(limiter);

    const ignitionNoiseFilter = context.createBiquadFilter();
    ignitionNoiseFilter.type = 'bandpass';
    ignitionNoiseFilter.frequency.value = 980;
    ignitionNoiseFilter.Q.value = 0.7;
    const ignitionNoiseGain = context.createGain();
    ignitionNoiseGain.gain.value = 0;
    noiseSource.connect(ignitionNoiseFilter).connect(ignitionNoiseGain).connect(limiter);


    const musicGain = context.createGain();
    musicGain.gain.value = 0.018;
    musicGain.connect(limiter);
    const musicFilter = context.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 690;
    musicFilter.Q.value = 0.45;
    musicFilter.connect(musicGain);
    const musicOsc = context.createOscillator();
    musicOsc.type = 'triangle';
    musicOsc.frequency.value = 43.65;
    musicOsc.connect(musicFilter);
    const musicFifth = context.createOscillator();
    musicFifth.type = 'sine';
    musicFifth.frequency.value = 65.475;
    const musicFifthGain = context.createGain();
    musicFifthGain.gain.value = 0.28;
    musicFifth.connect(musicFifthGain).connect(musicFilter);

    Object.assign(this, {
      context, master, limiter, engineGain, engineFilter, engineVoices,
      carGain, rocketGain, rocketFilter, rocketVoices, windGain, windFilter,
      rocketNoiseGain, rocketNoiseFilter, driftGain, driftFilter, driftToneGain,
      driftTone, driftPanner, morphGain, morphFilter, morphToneGain, morphTone,
      boostToneGain, boostTone, musicGain, musicOsc, musicFifth, noiseBuffer,
      noiseSource, ignitionLow, ignitionLowGain, ignitionHigh,
      ignitionHighGain, ignitionNoiseFilter, ignitionNoiseGain,
      captureDestination,
      preparedSources: [
        ...engineVoices.map((voice) => voice.oscillator),
        ...rocketVoices.map((voice) => voice.oscillator),
        driftTone,
        morphTone,
        boostTone,
        ignitionLow,
        ignitionHigh,
        noiseSource,
        musicOsc,
        musicFifth,
      ],
    });
    this._prepareCombatOneShotPool();
    this.ready = true;
    this.nextBeat = context.currentTime + 0.04;
    if (ignite) this._startPreparedSources();
    if (resumeContext) await context.resume();
    if (ignite) this.playIgnition();
  }

  _startPreparedSources() {
    if (this.sourcesStarted) return;
    for (const source of this.preparedSources) source.start();
    this.sourcesStarted = true;
  }

  _createToneOneShot(reserved = false) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner?.() ?? null;
    if (panner) oscillator.connect(gain).connect(panner).connect(this.limiter);
    else oscillator.connect(gain).connect(this.limiter);
    return this._armOneShotRetirement({
      kind: 'tone',
      reserved,
      source: oscillator,
      oscillator,
      gain,
      panner,
      nodes: [oscillator, gain, panner].filter(Boolean),
    });
  }

  _createNoiseOneShot(reserved = false) {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner?.() ?? null;
    if (panner) source.connect(filter).connect(gain).connect(panner).connect(this.limiter);
    else source.connect(filter).connect(gain).connect(this.limiter);
    return this._armOneShotRetirement({
      kind: 'noise',
      reserved,
      source,
      filter,
      gain,
      panner,
      nodes: [source, filter, gain, panner].filter(Boolean),
    });
  }

  _createCombatToneVoice(index) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner?.() ?? null;
    oscillator.type = 'sine';
    oscillator.frequency.value = 220;
    gain.gain.value = 0;
    if (panner) oscillator.connect(gain).connect(panner).connect(this.limiter);
    else oscillator.connect(gain).connect(this.limiter);
    return {
      kind: 'tone',
      index,
      source: oscillator,
      oscillator,
      gain,
      panner,
      busyUntil: Number.NEGATIVE_INFINITY,
      useCount: 0,
      generation: 0,
      combatTracked: false,
    };
  }

  _createCombatNoiseVoice(index) {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.55;
    const gain = this.context.createGain();
    gain.gain.value = 0;
    const panner = this.context.createStereoPanner?.() ?? null;
    if (panner) source.connect(filter).connect(gain).connect(panner).connect(this.limiter);
    else source.connect(filter).connect(gain).connect(this.limiter);
    return {
      kind: 'noise',
      index,
      source,
      filter,
      gain,
      panner,
      busyUntil: Number.NEGATIVE_INFINITY,
      useCount: 0,
      generation: 0,
      combatTracked: false,
    };
  }

  _armOneShotRetirement(voice) {
    voice.combatTracked = false;
    voice.retired = false;
    voice.source.onended = () => {
      voice.source.onended = null;
      this._retireOneShotVoice(voice);
    };
    return voice;
  }

  _retireOneShotVoice(voice) {
    if (!voice || voice.retired) return;
    voice.retired = true;
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* already disconnected or unavailable */ }
    }
    if (voice.combatTracked) {
      const stats = this.combatOneShotStats;
      stats.active[voice.kind] = Math.max(0, stats.active[voice.kind] - 1);
      stats.retired[voice.kind] += 1;
    }
  }

  _prepareCombatOneShotPool() {
    for (const kind of ['tone', 'noise']) {
      const target = this.combatOneShotStats.target[kind];
      for (let index = 0; index < target; index += 1) {
        try {
          const voice = kind === 'tone'
            ? this._createCombatToneVoice(index)
            : this._createCombatNoiseVoice(index);
          this.combatOneShotPool[kind].push(voice);
          this.preparedSources.push(voice.source);
          this.combatOneShotStats.created[kind] += 1;
        } catch {
          // A partial bank can still use deterministic stealing, but the
          // shortfall remains an explicit hard diagnostic. Critical gameplay
          // never falls back to allocating a one-shot source on demand.
          this.combatOneShotStats.preallocationFailures[kind] += target - index;
          break;
        }
      }
    }
  }

  _refreshCombatOneShotStats(now = this.context?.currentTime ?? 0) {
    for (const kind of ['tone', 'noise']) {
      let active = 0;
      for (const voice of this.combatOneShotPool[kind]) {
        if (voice.combatTracked && voice.busyUntil <= now + 1e-6) {
          voice.combatTracked = false;
          this.combatOneShotStats.retired[kind] += 1;
        }
        if (voice.combatTracked) active += 1;
      }
      this.combatOneShotStats.active[kind] = active;
      this.combatOneShotStats.peakActive[kind] = Math.max(
        this.combatOneShotStats.peakActive[kind],
        active,
      );
    }
  }

  _takeCombatOneShot(kind, requestedAt, durationWithTail) {
    const pool = this.combatOneShotPool[kind];
    if (!pool?.length) throw new Error(`Reusable combat ${kind} bank is unavailable`);

    const now = this.context.currentTime;
    this._refreshCombatOneShotStats(now);
    const cursor = this.combatOneShotCursor[kind] % pool.length;
    let voice = null;
    for (let offset = 0; offset < pool.length; offset += 1) {
      const candidate = pool[(cursor + offset) % pool.length];
      if (candidate.busyUntil <= now + 1e-6) {
        voice = candidate;
        break;
      }
    }

    let stolen = false;
    if (!voice) {
      stolen = true;
      voice = pool[0];
      for (let index = 1; index < pool.length; index += 1) {
        const candidate = pool[index];
        if (candidate.busyUntil < voice.busyUntil - 1e-9
          || (Math.abs(candidate.busyUntil - voice.busyUntil) <= 1e-9
            && candidate.index < voice.index)) {
          voice = candidate;
        }
      }
      this.combatOneShotStats.steals[kind] += 1;
      if (voice.combatTracked) {
        voice.combatTracked = false;
        this.combatOneShotStats.retired[kind] += 1;
      }
    }

    if (voice.useCount > 0) this.combatOneShotStats.retriggered[kind] += 1;
    voice.useCount += 1;
    voice.generation += 1;
    voice.combatTracked = true;
    this.combatOneShotStats.used[kind] += 1;
    const at = Math.max(now + (stolen ? 0.002 : 0), requestedAt);
    voice.busyUntil = at + durationWithTail;
    this.combatOneShotCursor[kind] = (voice.index + 1) % pool.length;
    this._refreshCombatOneShotStats(now);
    return { voice, at, stolen };
  }

  _scheduleToneVoice(voice, frequency, duration, options = {}) {
    const at = Math.max(this.context.currentTime, options.at ?? this.context.currentTime);
    const oscillator = voice.oscillator;
    oscillator.type = options.type ?? 'sine';
    const startFrequency = Math.max(20, frequency);
    oscillator.frequency.setValueAtTime(startFrequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, startFrequency * (options.slide ?? 1)), at + duration);
    const peak = Math.max(0.0002, options.gain ?? 0.05);
    const attack = clamp(options.attack ?? 0.004, 0.001, Math.max(0.001, duration * 0.42));
    voice.gain.gain.setValueAtTime(0.0001, at);
    voice.gain.gain.exponentialRampToValueAtTime(peak, at + attack);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    if (voice.panner) voice.panner.pan.value = clamp(options.pan ?? 0, -1, 1);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.03);
  }

  _scheduleNoiseVoice(voice, duration, gainAmount, frequency, options = {}) {
    const at = Math.max(this.context.currentTime, options.at ?? this.context.currentTime);
    const variation = clamp(options.variation ?? 0.5, 0, 1);
    voice.source.playbackRate.value = 0.92 + variation * 0.16;
    voice.filter.type = options.filterType ?? 'bandpass';
    voice.filter.frequency.value = Math.max(30, frequency);
    voice.filter.Q.value = options.q ?? 0.55;
    const attack = clamp(options.attack ?? 0.002, 0.001, Math.max(0.001, duration * 0.35));
    voice.gain.gain.setValueAtTime(0.0001, at);
    voice.gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), at + attack);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    if (voice.panner) voice.panner.pan.value = clamp(options.pan ?? 0, -1, 1);
    voice.source.start(at, variation * this.noiseBuffer.duration);
    voice.source.stop(at + duration + 0.01);
  }

  _resetReusableCombatVoice(voice, at, stolen) {
    const now = this.context.currentTime;
    const gainParam = voice.gain.gain;
    if (stolen && typeof gainParam.cancelAndHoldAtTime === 'function') {
      gainParam.cancelAndHoldAtTime(now);
    } else {
      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(stolen ? Math.max(0, Number(gainParam.value) || 0) : 0, now);
    }
    if (stolen && at > now) gainParam.linearRampToValueAtTime(0, at);
    else gainParam.setValueAtTime(0, at);

    const resetParam = (param) => {
      if (!param) return;
      param.cancelScheduledValues(now);
    };
    if (voice.kind === 'tone') resetParam(voice.oscillator.frequency);
    else {
      resetParam(voice.source.playbackRate);
      resetParam(voice.filter.frequency);
      resetParam(voice.filter.Q);
    }
    resetParam(voice.panner?.pan);
  }

  _scheduleReusableCombatTone(allocation, frequency, duration, options = {}) {
    const { voice, at, stolen } = allocation;
    this._resetReusableCombatVoice(voice, at, stolen);
    const oscillator = voice.oscillator;
    oscillator.type = options.type ?? 'sine';
    const startFrequency = Math.max(20, frequency);
    oscillator.frequency.setValueAtTime(startFrequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, startFrequency * (options.slide ?? 1)),
      at + duration,
    );
    const peak = Math.max(0.0002, options.gain ?? 0.05);
    const attack = clamp(options.attack ?? 0.004, 0.001, Math.max(0.001, duration * 0.42));
    voice.gain.gain.setValueAtTime(0.0001, at);
    voice.gain.gain.exponentialRampToValueAtTime(peak, at + attack);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    voice.gain.gain.setValueAtTime(0, at + duration + 0.001);
    if (voice.panner) voice.panner.pan.setValueAtTime(clamp(options.pan ?? 0, -1, 1), at);
  }

  _scheduleReusableCombatNoise(allocation, duration, gainAmount, frequency, options = {}) {
    const { voice, at, stolen } = allocation;
    this._resetReusableCombatVoice(voice, at, stolen);
    const variation = clamp(options.variation ?? 0.5, 0, 1);
    voice.source.playbackRate.setValueAtTime(0.92 + variation * 0.16, at);
    voice.filter.type = options.filterType ?? 'bandpass';
    voice.filter.frequency.setValueAtTime(Math.max(30, frequency), at);
    voice.filter.Q.setValueAtTime(options.q ?? 0.55, at);
    const attack = clamp(options.attack ?? 0.002, 0.001, Math.max(0.001, duration * 0.35));
    voice.gain.gain.setValueAtTime(0.0001, at);
    voice.gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), at + attack);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    voice.gain.gain.setValueAtTime(0, at + duration + 0.001);
    if (voice.panner) voice.panner.pan.setValueAtTime(clamp(options.pan ?? 0, -1, 1), at);
  }

  _abortReusableCombatVoice(voice) {
    const kind = voice.kind;
    if (voice.combatTracked) {
      voice.combatTracked = false;
      this.combatOneShotStats.retired[kind] += 1;
    }
    voice.busyUntil = Number.NEGATIVE_INFINITY;
    this.combatOneShotStats.scheduleFailures[kind] += 1;
    this._refreshCombatOneShotStats(this.context.currentTime);
  }

  _combatTone(frequency, duration, options = {}) {
    if (!this.context || !this.limiter) return;
    const requestedAt = Math.max(this.context.currentTime, options.at ?? this.context.currentTime);
    const allocation = this._takeCombatOneShot('tone', requestedAt, duration + 0.03);
    try {
      this._scheduleReusableCombatTone(allocation, frequency, duration, options);
    } catch (error) {
      this._abortReusableCombatVoice(allocation.voice);
      throw error;
    }
    return allocation.voice;
  }

  _combatNoiseBurst(duration, gainAmount, frequency, options = {}) {
    if (!this.context || !this.limiter || !this.noiseBuffer) return;
    const requestedAt = Math.max(this.context.currentTime, options.at ?? this.context.currentTime);
    const allocation = this._takeCombatOneShot('noise', requestedAt, duration + 0.01);
    try {
      this._scheduleReusableCombatNoise(allocation, duration, gainAmount, frequency, options);
    } catch (error) {
      this._abortReusableCombatVoice(allocation.voice);
      throw error;
    }
    return allocation.voice;
  }

  _applyMasterLevel(timeConstant = 0.025) {
    if (!this.master || !this.context) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted || this.silentArmed ? 0 : this.outputLevel, now, timeConstant);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this._applyMasterLevel(0.025);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  captureStream() {
    return this.captureDestination?.stream ?? null;
  }

  async suspend() {
    if (this.context?.state === 'running') await this.context.suspend();
  }

  async resume() {
    if (this.context?.state === 'suspended' && document.visibilityState === 'visible') {
      try { await this.context.resume(); } catch { /* gesture may still be required */ }
    }
  }

  _countCue(name, at = this.context?.currentTime ?? 0) {
    this.cueCounts[name] = (this.cueCounts[name] ?? 0) + 1;
    this.lastCueAt[name] = Number(at) || 0;
  }

  diagnostics() {
    this._refreshCombatOneShotStats(this.context?.currentTime ?? 0);
    const now = this.context?.currentTime ?? 0;
    return {
      ready: this.ready,
      contextState: this.context?.state ?? 'unavailable',
      silentArmed: this.silentArmed,
      ignitionPlayed: this.ignitionPlayed,
      outputLevel: this.outputLevel,
      muted: this.muted,
      landingDuckDb: 2.5,
      cueCounts: { ...this.cueCounts },
      lastCueAt: { ...this.lastCueAt },
      combatOneShots: {
        reservations: { ...COMBAT_ONE_SHOT_EVENT_RESERVATION },
        target: { ...this.combatOneShotStats.target },
        created: { ...this.combatOneShotStats.created },
        available: {
          tone: this.combatOneShotPool.tone.filter((voice) => voice.busyUntil <= now + 1e-6).length,
          noise: this.combatOneShotPool.noise.filter((voice) => voice.busyUntil <= now + 1e-6).length,
        },
        used: { ...this.combatOneShotStats.used },
        overflowFallback: { ...this.combatOneShotStats.overflowFallback },
        active: { ...this.combatOneShotStats.active },
        retired: { ...this.combatOneShotStats.retired },
        retriggered: { ...this.combatOneShotStats.retriggered },
        steals: { ...this.combatOneShotStats.steals },
        peakActive: { ...this.combatOneShotStats.peakActive },
        scheduleFailures: { ...this.combatOneShotStats.scheduleFailures },
        preallocationFailures: { ...this.combatOneShotStats.preallocationFailures },
      },
    };
  }

  _landingBedGain(now) {
    const remaining = this.landingDuckUntil - now;
    if (remaining <= 0) return 1;
    if (remaining >= 0.05) return LANDING_DUCK_GAIN;
    return lerp(1, LANDING_DUCK_GAIN, remaining / 0.05);
  }

  _scheduleMorphLatches(segment, foldProgress, now) {
    const foldKey = `${segment.id}:${segment.type}`;
    if (foldKey !== this.foldKey) {
      this.foldKey = foldKey;
      this.previousFoldProgress = foldProgress;
      this.morphLatchMask = 0;
      this.nextMorphLatchAt = now;
      return;
    }

    const previous = this.previousFoldProgress;
    MORPH_LATCH_THRESHOLDS.forEach((threshold, index) => {
      const bit = 1 << index;
      if ((this.morphLatchMask & bit) || previous >= threshold || foldProgress < threshold) return;
      const at = Math.max(now, this.nextMorphLatchAt);
      const reentry = segment.type === 'space';
      const pan = (index - 1) * 0.19;
      this.tone(reentry ? 610 - index * 88 : 315 + index * 126, 0.064, {
        at,
        type: index === 1 ? 'triangle' : 'sine',
        gain: 0.012 + index * 0.002,
        slide: reentry ? 0.78 : 1.22,
        pan,
        attack: 0.002,
      });
      this.noiseBurst(0.026, 0.0055 + index * 0.0012, 1380 + index * 620, {
        at,
        pan: -pan,
        variation: stableUnit(foldKey, index),
        q: 1.25,
      });
      this.morphLatchMask |= bit;
      this.nextMorphLatchAt = at + 0.048;
      this._countCue('morphLatch', at);
    });
    this.previousFoldProgress = foldProgress;
  }

  _schedulePlaceAmbience(segment, state, events, transitionBusy, now) {
    const gimmick = segment.gimmick?.id;
    const key = `${segment.id}:${gimmick}`;
    if (key !== this.ambienceKey) {
      this.ambienceKey = key;
      this.ambienceSerial = 0;
      const initialDelay = gimmick === 'lightning-rails' ? 0.48 : 0.72;
      this.nextAmbienceAt = now + initialDelay + stableUnit(key, 0) * 0.36;
    }
    if (!AMBIENCE_GIMMICKS.has(gimmick) || now < this.nextAmbienceAt) return;
    if (transitionBusy || events.length > 0 || state.drifting) {
      this.nextAmbienceAt = now + 0.42;
      return;
    }

    const serial = this.ambienceSerial;
    const variation = stableUnit(key, serial + 1);
    const pan = (stableUnit(key, serial + 17) - 0.5) * 1.25;
    if (gimmick === 'thermal-vent-slings') {
      const count = 2 + (variation > 0.56 ? 1 : 0);
      for (let index = 0; index < count; index += 1) {
        this.noiseBurst(0.018 + index * 0.007, 0.0058 + index * 0.0014, 1580 + variation * 1700, {
          at: now + index * 0.036,
          pan: clamp(pan + index * 0.11, -0.8, 0.8),
          variation: stableUnit(key, serial * 5 + index),
          q: 1.3,
        });
      }
      this._countCue('ambience:scoria-crackle', now);
      this.nextAmbienceAt = now + 2.9 + stableUnit(key, serial + 31) * 1.9;
    } else if (gimmick === 'asteroid-cathedral') {
      const root = 510 + variation * 170;
      this.tone(root, 0.34, { at: now, gain: 0.012, slide: 1.006, pan, attack: 0.008 });
      this.tone(root * 0.75, 0.42, {
        at: now + 0.235,
        gain: 0.0058,
        slide: 0.995,
        pan: -pan * 0.72,
        attack: 0.012,
      });
      this._countCue('ambience:cathedral-ping', now);
      this.nextAmbienceAt = now + 3.35 + stableUnit(key, serial + 31) * 2.15;
    } else if (gimmick === 'lightning-rails') {
      this.noiseBurst(0.62, 0.0165, 92 + variation * 38, {
        at: now,
        pan: pan * 0.65,
        variation,
        q: 0.5,
        filterType: 'lowpass',
        attack: 0.06,
      });
      this.tone(34 + variation * 9, 0.48, {
        at: now + 0.025,
        type: 'sine',
        gain: 0.018,
        slide: 0.76,
        pan: pan * 0.45,
        attack: 0.055,
      });
      this._countCue('ambience:thunderglass-thunder', now);
      this.nextAmbienceAt = now + 4.4 + stableUnit(key, serial + 31) * 2.5;
    }
    this.ambienceSerial += 1;
  }

  update(state, events, segment, dt) {
    if (!this.ready || !this.context || !state?.started || !segment) return;
    const now = this.context.currentTime;
    const safeDt = clamp(Number(dt) || 1 / 60, 1 / 240, 0.08);
    const length = Math.max(1, segment.length * (state.short ? 0.075 : 1));
    const fraction = clamp(state.segmentProgress / length, 0, 1);
    const localSpeed = clamp((state.speed - segment.baseSpeed) / Math.max(120, segment.maxSpeed - segment.baseSpeed), 0, 1);
    const speedNorm = clamp((state.speed - 280) / 780, 0, 1);
    const boost = clamp(state.boost, 0, 1);
    const surge = Boolean(state.lastInput?.surge);
    const launchFold = segment.type === 'planet' ? smoothstep(0.81, 0.968, fraction) : 0;
    const reentryFold = segment.type === 'space' ? smoothstep(0.80, 0.985, fraction) : 0;
    const rocketAmount = segment.type === 'space' ? 1 - reentryFold : launchFold;
    const launchTension = segment.type === 'planet' ? smoothstep(0.715, 1, fraction) : 0;
    const reentryHeat = segment.type === 'space' ? smoothstep(0.755, 1, fraction) : 0;
    const foldProgress = segment.type === 'space' ? reentryFold : launchFold;
    const foldMotion = Math.sin(Math.PI * clamp(foldProgress, 0, 1));

    if (events.some((event) => event.type === 'landing')) {
      this.landingDuckUntil = Math.max(this.landingDuckUntil, now + 0.15);
      this._countCue('landingDuck', now);
    }
    const bedGain = this._landingBedGain(now);
    const hitRewardThisFrame = events.some((event) => event.type === 'shot-hit');

    const previousSpeed = this.previousSpeed ?? state.speed;
    const acceleration = clamp((state.speed - previousSpeed) / safeDt / 150, 0, 1);
    const boostKick = Math.min(hitRewardThisFrame ? 0.18 : 1, clamp((boost - this.previousBoost) * 4.8, 0, 1));
    const surgeKick = surge && !this.previousSurge ? 0.28 : 0;
    this.thrustEnvelope = Math.max(this.thrustEnvelope * Math.exp(-4.8 * safeDt), acceleration, boostKick, surgeKick);
    this.touchdownEnvelope *= Math.exp(-5.2 * safeDt);
    if (this.pendingEngineBloomAt > 0 && now >= this.pendingEngineBloomAt) {
      const bloomStrength = clamp(this.pendingEngineBloomStrength || 1, 0.4, 1);
      this.thrustEnvelope = Math.max(this.thrustEnvelope, bloomStrength);
      this.tone(72, 0.24, { at: now, type: 'triangle', gain: 0.026 * bloomStrength, slide: 1.58, attack: 0.012 });
      this.tone(286, 0.17, { at: now + 0.022, type: 'sine', gain: 0.015 * bloomStrength, slide: 1.32, attack: 0.007 });
      this._countCue('hitEngineBloom', now);
      this.pendingEngineBloomAt = 0;
      this.pendingEngineBloomStrength = 0;
    }

    const carBase = 48 + speedNorm * 104 + localSpeed * 18 + boost * 46 + this.thrustEnvelope * 22;
    for (let i = 0; i < this.engineVoices.length; i += 1) {
      const voice = this.engineVoices[i];
      voice.oscillator.frequency.setTargetAtTime(carBase * voice.ratio, now, i === 0 ? 0.035 : 0.022);
      voice.oscillator.detune.setTargetAtTime(voice.detune + Math.sin(state.time * (0.7 + i * 0.17)) * 1.7, now, 0.12);
    }

    const rocketBase = 76 + speedNorm * 116 + localSpeed * 26 + boost * 62 + this.thrustEnvelope * 31;
    for (let i = 0; i < this.rocketVoices.length; i += 1) {
      const voice = this.rocketVoices[i];
      voice.oscillator.frequency.setTargetAtTime(rocketBase * voice.ratio, now, i === 0 ? 0.055 : 0.032);
      voice.oscillator.detune.setTargetAtTime(voice.detune + Math.sin(state.time * (0.43 + i * 0.13)) * 2.3, now, 0.15);
    }

    const equalPowerCar = Math.cos(rocketAmount * Math.PI * 0.5);
    const equalPowerRocket = Math.sin(rocketAmount * Math.PI * 0.5);
    this.carGain.gain.setTargetAtTime(Math.max(0.0001, equalPowerCar), now, 0.045);
    this.rocketGain.gain.setTargetAtTime(Math.max(0.0001, equalPowerRocket * 1.04), now, 0.055);
    this.engineGain.gain.setTargetAtTime(
      (0.105 + speedNorm * 0.07 + boost * 0.052 + this.thrustEnvelope * 0.026) * bedGain,
      now, 0.035,
    );
    this.engineFilter.frequency.setTargetAtTime(
      980 + speedNorm * 1900 + boost * 1250 + this.thrustEnvelope * 720 + rocketAmount * 450,
      now, 0.045,
    );
    this.rocketFilter.frequency.setTargetAtTime(1250 + speedNorm * 1450 + boost * 1250, now, 0.06);
    this.rocketNoiseGain.gain.setTargetAtTime(
      Math.max(0.0001, rocketAmount * (0.018 + speedNorm * 0.027 + boost * 0.025)), now, 0.075,
    );
    this.rocketNoiseFilter.frequency.setTargetAtTime(220 + speedNorm * 210 + boost * 180, now, 0.08);

    this.windGain.gain.setTargetAtTime(
      (0.012 + speedNorm * 0.055 + boost * 0.025 + rocketAmount * 0.012 + reentryHeat * 0.03) * bedGain, now, 0.07,
    );
    this.windFilter.frequency.setTargetAtTime(780 + speedNorm * 1700 + boost * 780 + reentryHeat * 1050, now, 0.09);

    const boostWhine = boost * boost * (0.011 + speedNorm * 0.012) + this.thrustEnvelope * 0.01;
    this.boostToneGain.gain.setTargetAtTime(Math.max(0.0001, boostWhine * bedGain), now, 0.06);
    this.boostTone.frequency.setTargetAtTime(420 + speedNorm * 310 + boost * 610 + rocketAmount * 110, now, 0.055);

    const driftCharge = state.drifting ? clamp(state.driftCharge, 0, 1) : 0;
    const railSkim = Boolean(state.railSkimming);
    const scrub = (state.drifting ? 0.018 + driftCharge * 0.056 + Math.abs(state.lateralVelocity) * 0.0012 : 0)
      + (railSkim ? 0.021 + speedNorm * 0.009 : 0);
    this.driftGain.gain.setTargetAtTime(Math.max(0.0001, scrub * bedGain), now, state.drifting || railSkim ? 0.026 : 0.07);
    this.driftFilter.frequency.setTargetAtTime(
      510 + driftCharge * 1550 + Math.abs(state.lateralVelocity) * 19 + (railSkim ? 980 : 0),
      now,
      0.045,
    );
    this.driftFilter.Q.setTargetAtTime(0.58 + driftCharge * 0.62 + (railSkim ? 0.22 : 0), now, 0.08);
    this.driftToneGain.gain.setTargetAtTime(
      Math.max(0.0001, ((state.drifting ? 0.006 + driftCharge * driftCharge * 0.024 : 0) + (railSkim ? 0.006 : 0)) * bedGain),
      now,
      0.045,
    );
    this.driftTone.frequency.setTargetAtTime(165 + driftCharge * 465 + speedNorm * 95 + (railSkim ? 190 : 0), now, 0.05);
    if (this.driftPanner) {
      const scrubSide = railSkim ? state.wallContactSide : state.driftSide;
      this.driftPanner.pan.setTargetAtTime(clamp((scrubSide || 0) * 0.52, -0.65, 0.65), now, 0.05);
    }

    const transitionNoise = foldMotion * 0.052 + launchTension * launchTension * 0.016 + reentryHeat * reentryHeat * 0.034;
    this.morphGain.gain.setTargetAtTime(Math.max(0.0001, transitionNoise * bedGain), now, 0.04);
    this.morphFilter.frequency.setTargetAtTime(520 + foldProgress * 2050 + reentryHeat * 900, now, 0.055);
    this.morphToneGain.gain.setTargetAtTime(Math.max(0.0001, (foldMotion * 0.024 + launchTension * launchTension * 0.008) * bedGain), now, 0.04);
    this.morphTone.frequency.setTargetAtTime(220 + foldProgress * 780 + launchTension * 240, now, 0.045);

    if (state.segmentIndex !== this.stageIndex) {
      this.stageIndex = state.segmentIndex;
      const roots = [43.65, 46.25, 49, 51.91, 55, 58.27, 61.74, 65.41, 69.3];
      const root = roots[segment.index - 1] ?? 43.65;
      const modeRatio = segment.type === 'space' ? 1.5 : 1;
      this.musicBaseGain = segment.type === 'space' ? 0.022 : 0.018;
      this.musicOsc.frequency.setTargetAtTime(root * modeRatio, now, 0.6);
      this.musicFifth.frequency.setTargetAtTime(root * modeRatio * 1.5, now, 0.7);
      this.nextBeat = now + 0.05;
      this.beatIndex = 0;
    }

    this.musicGain.gain.setTargetAtTime(this.musicBaseGain * bedGain, now, this.landingDuckUntil > now ? 0.025 : 0.18);
    this._scheduleMorphLatches(segment, foldProgress, now);
    this._schedulePlaceAmbience(
      segment,
      state,
      events,
      launchTension > 0.18 || reentryHeat > 0.16 || foldMotion > 0.12,
      now,
    );

    this.schedulePulse(state, segment);
    for (const event of events) this.handleEvent(event, segment);
    this.previousSpeed = state.speed;
    this.previousBoost = boost;
    this.previousSurge = surge;
  }

  schedulePulse(state, segment) {
    const now = this.context.currentTime;
    const tempo = 116 + segment.index * 3 + state.boost * 20 + (segment.type === 'space' ? 12 : 0);
    const interval = 60 / tempo / 2;
    while (this.nextBeat < now + 0.12) {
      const root = 46 + segment.index * 2.1;
      const surfacePattern = [1, 1.5, 2, 1.25, 1, 2, 1.5, 2.5];
      const spacePattern = [1, 2, 1.5, 3, 1.25, 2, 1.5, 2.5];
      const pattern = segment.type === 'space' ? spacePattern : surfacePattern;
      const ratio = pattern[this.beatIndex % pattern.length];
      const accented = this.beatIndex % 4 === 0;
      this.tone(root * ratio, accented ? 0.105 : 0.062, {
        at: this.nextBeat, type: accented ? 'triangle' : 'sine',
        gain: accented ? 0.021 : 0.0095, attack: 0.006,
        slide: accented ? 0.94 : 1,
        pan: Math.sin((this.beatIndex + segment.index * 2) * 1.37) * 0.18,
      });
      this.nextBeat += interval;
      this.beatIndex += 1;
    }
  }

  handleEvent(event, segment) {
    const now = this.context.currentTime;
    const intensity = clamp(event.intensity ?? 0.55, 0.15, 1);
    const variation = eventVariation(event);
    this._countCue(`event:${event.type}`, now);
    if (BOOST_EVENTS.has(event.type)) {
      const root = 104 + segment.index * 7 + variation * 18;
      this.surgeChord(root, intensity, { pan: clamp((event.side ?? 0) * 0.28, -0.4, 0.4) });
      this.thrustEnvelope = Math.max(this.thrustEnvelope, 0.55 + intensity * 0.45);
      return;
    }
    if (FAILURE_EVENTS.has(event.type)) {
      const pan = clamp((event.side ?? Math.sign((event.target ?? 0) - 0.001)) * 0.48, -0.65, 0.65);
      this.noiseBurst(0.08 + intensity * 0.07, 0.014 + intensity * 0.025, 920 + variation * 1250, { pan, variation, q: 0.8 });
      this.tone(118 + variation * 36, 0.11, { type: 'triangle', gain: 0.018 + intensity * 0.018, slide: 0.7, pan });
      return;
    }

    switch (event.type) {
      case 'drift-release': {
        const charge = clamp(Number(event.charge) || 0, 0, 1);
        const chargeFloor = 0.22 + charge * 0.78;
        const releaseIntensity = clamp(Math.max(Number(event.intensity) || 0, chargeFloor), 0.22, 1);
        const pan = clamp((event.side ?? 0) * 0.42, -0.6, 0.6);
        this.noiseBurst(
          0.09 + releaseIntensity * 0.13,
          0.009 + releaseIntensity * 0.051,
          980 + releaseIntensity * 1390,
          { at: now, pan, variation, q: 0.7 },
        );
        this.tone(126 + releaseIntensity * 38, 0.22, {
          type: 'triangle', gain: 0.045 * releaseIntensity, slide: 1.62, pan: pan * 0.55,
        });
        this.tone(252 + releaseIntensity * 72, 0.18, {
          at: now + 0.025, type: 'sine', gain: 0.029 * releaseIntensity, slide: 1.5, pan: -pan * 0.25,
        });
        this.thrustEnvelope = Math.max(this.thrustEnvelope, 0.12 + releaseIntensity * 0.88);
        break;
      }
      case 'space-slip': {
        const pan = clamp((event.side ?? 0) * 0.62, -0.75, 0.75);
        this.noiseBurst(0.16, 0.032, 1850, { pan, variation, q: 0.48 });
        this.tone(340, 0.13, { type: 'sine', gain: 0.024, slide: 1.45, pan });
        break;
      }
      case 'shot': {
        const pan = (variation - 0.5) * 0.08;
        this.tone(650 + variation * 105, 0.047, { type: 'triangle', gain: 0.041, slide: 0.48, pan, attack: 0.001 });
        this.tone(118 + variation * 20, 0.07, { type: 'sine', gain: 0.022, slide: 0.76, pan: -pan });
        this.noiseBurst(0.028, 0.018, 3600 + variation * 700, { pan, variation, q: 1.2 });
        if (event.hit === false) {
          const missSide = stableUnit(`${event.targetId ?? 'open-space'}:${event.time ?? 0}`, 23) < 0.5 ? -1 : 1;
          const flybyAt = now + 0.125 + variation * 0.024;
          this.noiseBurst(0.11, 0.017, 2350 + variation * 900, {
            at: flybyAt,
            pan: missSide * 0.72,
            variation: 1 - variation,
            q: 0.82,
            attack: 0.008,
          });
          this.tone(530 + variation * 85, 0.13, {
            at: flybyAt + 0.006,
            type: 'sine',
            gain: 0.016,
            slide: 0.61,
            pan: missSide * 0.78,
            attack: 0.006,
          });
          this._countCue('missFlyby', flybyAt);
        }
        break;
      }
      case 'shot-hit': {
        const pan = (stableUnit(event.targetId, 4) - 0.5) * 0.75;
        const impactAt = now + 0.105;
        const returnAt = impactAt + 0.024;
        // The simulation awards boost immediately, so retain a tiny tactile
        // tick now. The substantial sounds wait for the visible bolt, target
        // impact, return signal, and nozzle bloom instead of spoiling them.
        this.tone(880 + variation * 90, 0.032, {
          at: now,
          type: 'sine',
          gain: 0.009,
          slide: 1.12,
          pan: pan * 0.35,
          attack: 0.001,
        });
        this.noiseBurst(0.095, 0.055, 1180 + variation * 520, { at: impactAt, pan, variation, q: 0.62 });
        this.tone(116 + variation * 24, 0.18, { at: impactAt, type: 'triangle', gain: 0.062, slide: 0.63, pan });
        this.tone(610 + variation * 90, 0.13, { at: impactAt, type: 'sine', gain: 0.047, slide: 1.72, pan });
        [1, 1.5, 2].forEach((ratio, index) => this.tone((190 + segment.index * 8) * ratio, 0.15, {
          at: returnAt + index * 0.018, type: index === 0 ? 'triangle' : 'sine',
          gain: 0.031 - index * 0.005, slide: 1.16,
          pan: lerp(pan, 0, (index + 1) / 3),
        }));
        const bloomAt = now + 0.38;
        if (this.pendingEngineBloomAt <= 0) this.pendingEngineBloomAt = bloomAt;
        else this.pendingEngineBloomAt = Math.min(this.pendingEngineBloomAt, bloomAt);
        this.pendingEngineBloomStrength = Math.max(this.pendingEngineBloomStrength, intensity);
        this._countCue('hitImmediateTick', now);
        this._countCue('hitImpact', impactAt);
        this._countCue('hitReturn', returnAt);
        break;
      }
      case 'echo-hit': {
        const pan = (stableUnit(event.targetId, 9) - 0.5) * 0.7;
        this.tone(475, 0.24, { at: now + 0.07, type: 'sine', gain: 0.036, slide: 2.02, pan });
        this.tone(238, 0.26, { at: now + 0.12, type: 'triangle', gain: 0.028, slide: 1.5, pan: -pan });
        break;
      }
      case 'rival-shot': {
        const pan = (stableUnit(event.sourceId, 2) - 0.5) * 1.25;
        this._combatTone(250 + variation * 45, 0.07, { type: 'triangle', gain: 0.021, slide: 0.56, pan });
        this._combatNoiseBurst(0.04, 0.01, 2450, { pan, variation, q: 1 });
        break;
      }
      case 'player-hit': {
        const pan = Math.sign(event.side || 1) * 0.34;
        this._combatNoiseBurst(0.18, 0.07, 740 + variation * 260, { pan, variation, q: 0.55, attack: 0.002 });
        this._combatTone(82, 0.24, { type: 'triangle', gain: 0.072, slide: 0.54, pan, attack: 0.002 });
        this._combatTone(420 + variation * 70, 0.16, { type: 'sawtooth', gain: 0.026, slide: 0.42, pan: -pan });
        break;
      }
      case 'incoming-dodge': {
        const pan = Math.sign(event.side || 1) * 0.48;
        this._combatNoiseBurst(0.12, 0.024, 3200, { pan, variation, q: 1.2, attack: 0.001 });
        this._combatTone(360, 0.18, { type: 'sine', gain: 0.035, slide: 2.7, pan, attack: 0.002 });
        this._combatTone(720, 0.13, { at: now + 0.025, type: 'triangle', gain: 0.025, slide: 1.55, pan: -pan });
        this.thrustEnvelope = Math.max(this.thrustEnvelope, 0.78);
        break;
      }
      case 'incoming-whiff': {
        const pan = Math.sign(event.side || 1) * 0.72;
        this._combatNoiseBurst(0.09, 0.014, 2800, { pan, variation, q: 0.92, attack: 0.002 });
        break;
      }
      case 'launch':
        this.noiseBurst(0.95, 0.075, 520, { variation, q: 0.42, attack: 0.025 });
        this.noiseBurst(0.48, 0.045, 2350, { at: now + 0.045, variation: 1 - variation, q: 0.46, attack: 0.018 });
        this.tone(42, 0.92, { type: 'sine', gain: 0.11, slide: 0.72, attack: 0.018 });
        this.tone(86, 0.7, { at: now + 0.035, type: 'triangle', gain: 0.072, slide: 2.15, attack: 0.012 });
        this.tone(410, 0.46, { at: now + 0.12, type: 'sine', gain: 0.036, slide: 1.82, pan: 0.08 });
        this.thrustEnvelope = 1;
        break;
      case 'landing':
        this.noiseBurst(0.36, 0.085, 330, { variation, q: 0.5, attack: 0.003 });
        this.noiseBurst(0.19, 0.042, 1320, { at: now + 0.012, variation: 1 - variation, q: 0.72, attack: 0.002 });
        this.tone(39, 0.66, { type: 'sine', gain: 0.13, slide: 0.54, attack: 0.004 });
        this.tone(74, 0.3, { at: now + 0.025, type: 'triangle', gain: 0.07, slide: 0.66, attack: 0.003 });
        this.tone(52, 0.26, { at: now + 0.17, type: 'sine', gain: 0.052, slide: 0.83, attack: 0.006 });
        this.touchdownEnvelope = 1;
        break;
      case 'finish':
        [1, 1.25, 1.5, 2, 2.5].forEach((ratio, index) => {
          this.tone(110 * ratio, 1.08, {
            at: now + index * 0.07, type: index < 2 ? 'triangle' : 'sine',
            gain: 0.075, attack: 0.008,
          });
        });
        break;
      default:
        break;
    }
  }

  playIgnition() {
    if (!this.context || !this.ignitionLow || this.ignitionPlayed) return;
    this.ignitionPlayed = true;
    const now = this.context.currentTime + 0.025;
    this._countCue('ignition', now);
    const envelope = (param, at, peak, attack, duration) => {
      param.cancelScheduledValues(at);
      param.setValueAtTime(0.0001, at);
      param.exponentialRampToValueAtTime(peak, at + attack);
      param.exponentialRampToValueAtTime(0.0001, at + duration);
      param.setValueAtTime(0, at + duration + 0.01);
    };
    this.ignitionLow.frequency.cancelScheduledValues(now);
    this.ignitionLow.frequency.setValueAtTime(38, now);
    this.ignitionLow.frequency.exponentialRampToValueAtTime(57, now + 0.58);
    envelope(this.ignitionLowGain.gain, now, 0.072, 0.018, 0.58);

    const highAt = now + 0.07;
    this.ignitionHigh.frequency.cancelScheduledValues(highAt);
    this.ignitionHigh.frequency.setValueAtTime(112, highAt);
    this.ignitionHigh.frequency.exponentialRampToValueAtTime(159.04, highAt + 0.38);
    envelope(this.ignitionHighGain.gain, highAt, 0.04, 0.012, 0.38);

    const noiseAt = now + 0.05;
    this.ignitionNoiseFilter.frequency.setValueAtTime(980, noiseAt);
    this.ignitionNoiseFilter.Q.setValueAtTime(0.7, noiseAt);
    envelope(this.ignitionNoiseGain.gain, noiseAt, 0.025, 0.018, 0.22);
  }

  surgeChord(root, intensity = 0.7, options = {}) {
    const now = this.context.currentTime;
    [1, 1.5, 2].forEach((ratio, index) => this.tone(root * ratio, 0.17 + index * 0.035, {
      at: now + index * 0.014, type: index === 0 ? 'triangle' : 'sine',
      gain: (0.034 - index * 0.003) * intensity, slide: 1.26,
      pan: clamp((options.pan ?? 0) + (index - 1) * 0.12, -0.75, 0.75),
    }));
  }

  tone(frequency, duration, options = {}) {
    if (!this.context || !this.limiter) return;
    const voice = this._createToneOneShot(false);
    this._scheduleToneVoice(voice, frequency, duration, options);
  }

  noiseBurst(duration, gainAmount, frequency, options = {}) {
    if (!this.context || !this.limiter || !this.noiseBuffer) return;
    const voice = this._createNoiseOneShot(false);
    this._scheduleNoiseVoice(voice, duration, gainAmount, frequency, options);
  }
}
