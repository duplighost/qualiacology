/*
 * ECHO//SAINT procedural audio engine.
 *
 * The engine deliberately creates no AudioContext until `unlock()` is called
 * from a user gesture.  Its private pseudo-random generator never touches
 * Math.random(), so sound cannot perturb gameplay randomness.
 */

const EPSILON = 0.0001;
const MASTER_LEVEL = 0.72;

const SFX_COOLDOWNS = Object.freeze({
  shot: 0.034,
  hit: 0.045,
  kill: 0.075,
  graze: 0.1,
  closure: 0.16,
  break: 0.11,
  hurt: 0.28,
  boss: 0.65,
  phase: 0.32,
  select: 0.055,
  upgrade: 0.24,
  victory: 1.1,
  gameover: 1.1,
});

const STAGES = Object.freeze([
  Object.freeze({
    root: 45,
    tempo: 128,
    scale: Object.freeze([0, 3, 5, 7, 10, 12]),
    progression: Object.freeze([0, 5, 3, 7]),
    chord: Object.freeze([0, 3, 7, 10]),
  }),
  Object.freeze({
    root: 43,
    tempo: 138,
    scale: Object.freeze([0, 2, 3, 7, 8, 10, 12]),
    progression: Object.freeze([0, 3, 8, 5]),
    chord: Object.freeze([0, 3, 7, 12]),
  }),
  Object.freeze({
    root: 47,
    tempo: 146,
    scale: Object.freeze([0, 3, 5, 6, 10, 12]),
    progression: Object.freeze([0, -2, 3, 5]),
    chord: Object.freeze([0, 3, 6, 10]),
  }),
  Object.freeze({
    root: 41,
    tempo: 154,
    scale: Object.freeze([0, 1, 5, 7, 8, 12]),
    progression: Object.freeze([0, 7, 5, 1]),
    chord: Object.freeze([0, 5, 7, 12]),
  }),
]);

const ARP_PATTERN = Object.freeze([0, 2, 4, 1, 5, 3, 4, 2]);
const LEAD_PATTERN = Object.freeze([4, 7, 10, 14]);

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function audioConstructor() {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

export function createAudio() {
  let context = null;
  let unavailable = false;
  let unlocked = false;
  let muted = false;

  let masterGain = null;
  let musicBus = null;
  let musicFilter = null;
  let musicGain = null;
  let musicDelay = null;
  let delayFeedback = null;
  let delayWet = null;
  let sfxBus = null;
  let sfxGain = null;
  let noiseBuffer = null;

  let targetIntensity = 0;
  let intensity = 0;
  let stageIndex = 0;
  let sequenceStep = 0;
  let nextStepTime = 0;
  let randomState = 0xe0c05a17;

  const lastSfxTime = Object.create(null);

  function random() {
    // xorshift32: deterministic, local, and entirely cosmetic.
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  }

  function buildNoiseBuffer() {
    const length = Math.max(1, Math.floor(context.sampleRate * 2));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;

    for (let index = 0; index < length; index += 1) {
      // A small correlated component makes impacts fuller than raw white noise.
      const white = random() * 2 - 1;
      previous = previous * 0.18 + white * 0.82;
      samples[index] = previous;
    }

    return buffer;
  }

  function createContext() {
    if (context || unavailable) return context;

    const AudioContextClass = audioConstructor();
    if (!AudioContextClass) {
      unavailable = true;
      return null;
    }

    try {
      try {
        context = new AudioContextClass({ latencyHint: 'interactive' });
      } catch (_optionsError) {
        context = new AudioContextClass();
      }

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.22;

      masterGain = context.createGain();
      masterGain.gain.value = muted ? 0 : MASTER_LEVEL;
      masterGain.connect(compressor);
      compressor.connect(context.destination);

      musicBus = context.createGain();
      musicFilter = context.createBiquadFilter();
      musicFilter.type = 'lowpass';
      musicFilter.frequency.value = 900;
      musicFilter.Q.value = 0.7;
      musicGain = context.createGain();
      musicGain.gain.value = 0.22;

      musicDelay = context.createDelay(1);
      musicDelay.delayTime.value = (
        60 / STAGES[modulo(stageIndex, STAGES.length)].tempo
      ) * 0.75;
      delayFeedback = context.createGain();
      delayFeedback.gain.value = 0.18;
      delayWet = context.createGain();
      delayWet.gain.value = 0.1;

      musicBus.connect(musicFilter);
      musicFilter.connect(musicGain);
      musicFilter.connect(musicDelay);
      musicDelay.connect(delayFeedback);
      delayFeedback.connect(musicDelay);
      musicDelay.connect(delayWet);
      delayWet.connect(musicGain);
      musicGain.connect(masterGain);

      sfxBus = context.createGain();
      sfxGain = context.createGain();
      sfxGain.gain.value = 0.66;
      sfxBus.connect(sfxGain);
      sfxGain.connect(masterGain);

      noiseBuffer = buildNoiseBuffer();
      nextStepTime = context.currentTime + 0.04;
      return context;
    } catch (_creationError) {
      context = null;
      unavailable = true;
      return null;
    }
  }

  function setParamSmoothly(param, value, timeConstant = 0.025) {
    if (!context || !param) return;
    const now = context.currentTime;
    try {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, timeConstant);
    } catch (_parameterError) {
      // Very old Web Audio implementations can reject automation while
      // suspended. A direct assignment is a safe degradation.
      try {
        param.value = value;
      } catch (_ignored) {
        // Audio is optional; never let it take down the game loop.
      }
    }
  }

  function applyMute() {
    if (!context || !masterGain) return;
    const now = context.currentTime;
    const destination = muted ? 0 : MASTER_LEVEL;

    try {
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(destination, now + 0.035);
    } catch (_muteError) {
      masterGain.gain.value = destination;
    }
  }

  function unlock() {
    const audioContext = createContext();
    if (!audioContext || audioContext.state === 'closed') {
      return Promise.resolve(false);
    }

    const finish = () => {
      unlocked = audioContext.state === 'running';
      if (unlocked && nextStepTime < audioContext.currentTime - 0.2) {
        nextStepTime = audioContext.currentTime + 0.025;
      }
      applyMute();
      return unlocked;
    };

    if (audioContext.state === 'running') {
      return Promise.resolve(finish());
    }

    if (typeof audioContext.resume !== 'function') {
      return Promise.resolve(finish());
    }

    try {
      return Promise.resolve(audioContext.resume()).then(finish, () => false);
    } catch (_resumeError) {
      return Promise.resolve(false);
    }
  }

  function routeWithPan(source, destination, pan = 0) {
    if (typeof context.createStereoPanner !== 'function' || pan === 0) {
      source.connect(destination);
      return;
    }

    const panner = context.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    source.connect(panner);
    panner.connect(destination);
  }

  function tone({
    time,
    frequency,
    endFrequency = frequency,
    duration = 0.1,
    gain = 0.05,
    type = 'sine',
    attack = 0.003,
    release = 0.06,
    destination = sfxBus,
    filterFrequency = 0,
    filterType = 'lowpass',
    pan = 0,
    detune = 0,
  }) {
    if (!context || !destination || gain <= 0 || duration <= 0) return;

    const start = Math.max(context.currentTime, time);
    const end = start + duration;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const peakTime = Math.min(end - 0.002, start + Math.max(0.001, attack));
    const releaseTime = Math.max(peakTime, end - Math.max(0.004, release));

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        end,
      );
    }
    oscillator.detune.value = detune;

    envelope.gain.setValueAtTime(EPSILON, start);
    envelope.gain.linearRampToValueAtTime(Math.max(EPSILON, gain), peakTime);
    envelope.gain.setValueAtTime(Math.max(EPSILON, gain), releaseTime);
    envelope.gain.exponentialRampToValueAtTime(EPSILON, end);

    oscillator.connect(envelope);

    if (filterFrequency > 0) {
      const filter = context.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFrequency;
      filter.Q.value = filterType === 'bandpass' ? 1.2 : 0.65;
      envelope.connect(filter);
      routeWithPan(filter, destination, pan);
    } else {
      routeWithPan(envelope, destination, pan);
    }

    oscillator.start(start);
    oscillator.stop(end + 0.025);
  }

  function noise({
    time,
    duration = 0.08,
    gain = 0.04,
    frequency = 1600,
    type = 'bandpass',
    attack = 0.001,
    pan = 0,
    destination = sfxBus,
  }) {
    if (!context || !noiseBuffer || !destination || gain <= 0 || duration <= 0) {
      return;
    }

    const start = Math.max(context.currentTime, time);
    const end = start + duration;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const peak = Math.min(end - 0.002, start + Math.max(0.001, attack));

    source.buffer = noiseBuffer;
    source.playbackRate.value = 0.88 + random() * 0.24;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === 'bandpass' ? 0.9 : 0.45;

    envelope.gain.setValueAtTime(EPSILON, start);
    envelope.gain.linearRampToValueAtTime(Math.max(EPSILON, gain), peak);
    envelope.gain.exponentialRampToValueAtTime(EPSILON, end);

    source.connect(filter);
    filter.connect(envelope);
    routeWithPan(envelope, destination, pan);

    const maximumOffset = Math.max(0, noiseBuffer.duration - duration - 0.02);
    source.start(start, random() * maximumOffset);
    source.stop(end + 0.02);
  }

  function sfxShot(time, energy) {
    const pitch = 720 + energy * 180 + intensity * 90;
    tone({
      time,
      frequency: pitch,
      endFrequency: 245,
      duration: 0.06,
      gain: 0.038 * energy,
      type: 'square',
      release: 0.045,
      filterFrequency: 2900,
    });
    tone({
      time,
      frequency: pitch * 1.65,
      endFrequency: pitch * 0.86,
      duration: 0.032,
      gain: 0.018 * energy,
      type: 'sine',
    });
    noise({ time, duration: 0.018, gain: 0.018 * energy, frequency: 5200, type: 'highpass' });
  }

  function sfxHit(time, energy) {
    tone({
      time,
      frequency: 215 + energy * 55,
      endFrequency: 92,
      duration: 0.082,
      gain: 0.064 * energy,
      type: 'triangle',
      filterFrequency: 1300,
    });
    noise({ time, duration: 0.047, gain: 0.047 * energy, frequency: 1850, type: 'bandpass' });
  }

  function sfxKill(time, energy) {
    tone({
      time,
      frequency: 152,
      endFrequency: 54,
      duration: 0.18,
      gain: 0.078 * energy,
      type: 'sawtooth',
      filterFrequency: 720,
    });
    tone({
      time: time + 0.012,
      frequency: 480,
      endFrequency: 940,
      duration: 0.13,
      gain: 0.038 * energy,
      type: 'triangle',
      pan: random() * 0.7 - 0.35,
    });
    noise({ time, duration: 0.105, gain: 0.058 * energy, frequency: 1120, type: 'bandpass' });
  }

  function sfxGraze(time, energy) {
    const pan = random() < 0.5 ? -0.62 : 0.62;
    noise({ time, duration: 0.12, gain: 0.03 * energy, frequency: 4800, type: 'highpass', pan });
    tone({
      time: time + 0.008,
      frequency: 1280,
      endFrequency: 1840,
      duration: 0.09,
      gain: 0.027 * energy,
      type: 'sine',
      pan,
    });
  }

  function sfxClosure(time, energy) {
    tone({ time, frequency: 182, endFrequency: 132, duration: 0.16, gain: 0.06 * energy, type: 'triangle' });
    [330, 495, 825].forEach((frequency, index) => {
      tone({
        time: time + index * 0.037,
        frequency,
        endFrequency: frequency * 1.08,
        duration: 0.085,
        gain: 0.028 * energy,
        type: index === 2 ? 'sine' : 'triangle',
        pan: (index - 1) * 0.22,
      });
    });
  }

  function sfxBreak(time, energy) {
    tone({
      time,
      frequency: 104,
      endFrequency: 42,
      duration: 0.2,
      gain: 0.105 * energy,
      type: 'sine',
    });
    tone({
      time,
      frequency: 510,
      endFrequency: 116,
      duration: 0.095,
      gain: 0.038 * energy,
      type: 'square',
      filterFrequency: 1500,
    });
    noise({ time, duration: 0.19, gain: 0.09 * energy, frequency: 1750, type: 'lowpass' });
  }

  function sfxHurt(time, energy) {
    tone({
      time,
      frequency: 92,
      endFrequency: 41,
      duration: 0.31,
      gain: 0.13 * energy,
      type: 'sawtooth',
      filterFrequency: 620,
    });
    tone({
      time: time + 0.018,
      frequency: 158,
      endFrequency: 119,
      duration: 0.24,
      gain: 0.052 * energy,
      type: 'square',
      filterFrequency: 940,
      detune: -13,
    });
    noise({ time, duration: 0.21, gain: 0.077 * energy, frequency: 680, type: 'bandpass' });
  }

  function sfxBoss(time, energy) {
    noise({ time, duration: 0.58, gain: 0.06 * energy, frequency: 420, type: 'lowpass', attack: 0.035 });
    [46, 46.7, 69].forEach((frequency, index) => {
      tone({
        time: time + index * 0.018,
        frequency,
        endFrequency: frequency * (index === 2 ? 0.82 : 0.68),
        duration: 0.72 - index * 0.08,
        gain: (0.095 - index * 0.018) * energy,
        type: index === 1 ? 'square' : 'sawtooth',
        attack: 0.045,
        release: 0.28,
        filterFrequency: 520,
      });
    });
  }

  function sfxPhase(time, energy) {
    noise({ time, duration: 0.38, gain: 0.042 * energy, frequency: 3600, type: 'highpass', attack: 0.09 });
    [294, 392, 587, 880].forEach((frequency, index) => {
      tone({
        time: time + index * 0.052,
        frequency,
        endFrequency: frequency * 1.35,
        duration: 0.19,
        gain: 0.035 * energy,
        type: 'triangle',
        pan: (index - 1.5) * 0.24,
      });
    });
  }

  function sfxSelect(time, energy) {
    tone({
      time,
      frequency: 620,
      endFrequency: 910,
      duration: 0.058,
      gain: 0.039 * energy,
      type: 'sine',
      release: 0.035,
    });
  }

  function sfxUpgrade(time, energy) {
    const root = midiToFrequency(STAGES[modulo(stageIndex, STAGES.length)].root + 12);
    [1, 1.25, 1.5, 2, 2.5].forEach((ratio, index) => {
      tone({
        time: time + index * 0.058,
        frequency: root * ratio,
        endFrequency: root * ratio * 1.05,
        duration: 0.18,
        gain: 0.035 * energy,
        type: index % 2 ? 'sine' : 'triangle',
        pan: (index - 2) * 0.17,
      });
    });
  }

  function sfxVictory(time, energy) {
    const root = midiToFrequency(STAGES[modulo(stageIndex, STAGES.length)].root);
    [1, 1.25, 1.5, 2].forEach((ratio, index) => {
      tone({
        time: time + index * 0.105,
        frequency: root * ratio,
        endFrequency: root * ratio * 1.02,
        duration: 0.58,
        gain: 0.052 * energy,
        type: index === 3 ? 'sine' : 'triangle',
        attack: 0.012,
        release: 0.3,
        pan: (index - 1.5) * 0.2,
      });
    });
    noise({ time, duration: 0.62, gain: 0.025 * energy, frequency: 6200, type: 'highpass', attack: 0.22 });
  }

  function sfxGameover(time, energy) {
    [220, 196, 165, 110].forEach((frequency, index) => {
      tone({
        time: time + index * 0.17,
        frequency,
        endFrequency: frequency * 0.82,
        duration: 0.42,
        gain: 0.055 * energy,
        type: index === 3 ? 'sawtooth' : 'triangle',
        attack: 0.012,
        release: 0.24,
        filterFrequency: index === 3 ? 520 : 0,
      });
    });
  }

  const sfxPlayers = Object.freeze({
    shot: sfxShot,
    hit: sfxHit,
    kill: sfxKill,
    graze: sfxGraze,
    closure: sfxClosure,
    break: sfxBreak,
    hurt: sfxHurt,
    boss: sfxBoss,
    phase: sfxPhase,
    select: sfxSelect,
    upgrade: sfxUpgrade,
    victory: sfxVictory,
    gameover: sfxGameover,
  });

  function sfx(name, amount = 1) {
    if (typeof name !== 'string') return false;
    const soundName = name.toLowerCase();
    const player = sfxPlayers[soundName];
    if (!player || !context || !unlocked || muted || context.state !== 'running') {
      return false;
    }

    const now = context.currentTime;
    const previous = lastSfxTime[soundName] ?? -Infinity;
    if (now - previous < SFX_COOLDOWNS[soundName]) return false;

    const numericAmount = Number.isFinite(Number(amount)) ? Number(amount) : 1;
    const normalizedAmount = clamp(numericAmount, 0, 1.5) / 1.5;
    const energy = 0.48 + Math.sqrt(normalizedAmount) * 0.52;
    lastSfxTime[soundName] = now;

    try {
      player(now + 0.004, energy);
      return true;
    } catch (_soundError) {
      return false;
    }
  }

  function musicKick(time, strength) {
    tone({
      time,
      frequency: 126,
      endFrequency: 42,
      duration: 0.17,
      gain: 0.105 * strength,
      type: 'sine',
      release: 0.12,
      destination: musicBus,
    });
    noise({
      time,
      duration: 0.012,
      gain: 0.022 * strength,
      frequency: 5100,
      type: 'highpass',
      destination: musicBus,
    });
  }

  function musicSnare(time, strength) {
    noise({
      time,
      duration: 0.105,
      gain: 0.052 * strength,
      frequency: 1800,
      type: 'bandpass',
      destination: musicBus,
    });
    tone({
      time,
      frequency: 178,
      endFrequency: 104,
      duration: 0.09,
      gain: 0.025 * strength,
      type: 'triangle',
      destination: musicBus,
    });
  }

  function musicHat(time, strength, open = false) {
    noise({
      time,
      duration: open ? 0.085 : 0.024,
      gain: (open ? 0.025 : 0.017) * strength,
      frequency: 6100,
      type: 'highpass',
      pan: random() * 0.34 - 0.17,
      destination: musicBus,
    });
  }

  function musicBass(time, midi, duration, strength) {
    const frequency = midiToFrequency(midi);
    tone({
      time,
      frequency,
      endFrequency: frequency * 0.985,
      duration,
      gain: 0.054 * strength,
      type: 'sawtooth',
      attack: 0.006,
      release: Math.min(0.1, duration * 0.55),
      filterFrequency: 460 + intensity * 370,
      destination: musicBus,
    });
    tone({
      time,
      frequency: frequency * 0.5,
      duration,
      gain: 0.038 * strength,
      type: 'sine',
      release: Math.min(0.11, duration * 0.6),
      destination: musicBus,
    });
  }

  function musicArp(time, midi, duration, strength, pan) {
    const frequency = midiToFrequency(midi);
    tone({
      time,
      frequency,
      endFrequency: frequency * 1.008,
      duration,
      gain: 0.018 * strength,
      type: 'triangle',
      attack: 0.004,
      release: duration * 0.72,
      filterFrequency: 2300 + intensity * 2600,
      pan,
      destination: musicBus,
    });
  }

  function musicPad(time, stage, chordRoot, duration) {
    stage.chord.forEach((interval, index) => {
      const frequency = midiToFrequency(stage.root + chordRoot + interval);
      tone({
        time,
        frequency,
        endFrequency: frequency * (index % 2 ? 1.003 : 0.997),
        duration,
        gain: 0.015 + intensity * 0.003,
        type: index % 2 ? 'triangle' : 'sine',
        attack: 0.24,
        release: Math.min(0.9, duration * 0.45),
        filterFrequency: 1200 + intensity * 850,
        pan: (index - (stage.chord.length - 1) / 2) * 0.21,
        detune: index % 2 ? 4 : -4,
        destination: musicBus,
      });
    });
  }

  function scheduleMusicStep(time, absoluteStep, stepDuration) {
    const stage = STAGES[modulo(stageIndex, STAGES.length)];
    const step = modulo(absoluteStep, 16);
    const bar = Math.floor(absoluteStep / 16);
    const chordRoot = stage.progression[modulo(bar, stage.progression.length)];
    const drive = intensity;

    if (step === 0) {
      musicPad(time, stage, chordRoot, stepDuration * 15.7);
    }

    if (step === 0 || step === 8) {
      musicKick(time, 0.72 + drive * 0.28);
    } else if (drive > 0.47 && (step === 6 || step === 14)) {
      musicKick(time, 0.43 + drive * 0.2);
    } else if (drive > 0.82 && (step === 3 || step === 11)) {
      musicKick(time, 0.32);
    }

    if ((step === 4 || step === 12) && drive > 0.1) {
      musicSnare(time, 0.55 + drive * 0.4);
    }

    if (drive > 0.16) {
      const denseHats = drive > 0.68;
      if (denseHats || step % 2 === 1) {
        musicHat(time, 0.5 + drive * 0.42, drive > 0.78 && step === 14);
      }
    }

    if (step === 0 || step === 8 || (drive > 0.32 && (step === 6 || step === 14))) {
      const bassOffset = step === 14 && drive > 0.58 ? stage.scale[1] : 0;
      musicBass(
        time,
        stage.root + chordRoot + bassOffset - 12,
        stepDuration * (step === 0 ? 3.6 : 2.4),
        0.72 + drive * 0.25,
      );
    }

    if (drive > 0.25 && (drive > 0.72 || step % 2 === 0)) {
      const patternIndex = modulo(Math.floor(step / (drive > 0.72 ? 1 : 2)), ARP_PATTERN.length);
      const scaleIndex = ARP_PATTERN[patternIndex] % stage.scale.length;
      const octave = drive > 0.86 && step % 4 === 3 ? 12 : 0;
      musicArp(
        time,
        stage.root + chordRoot + 12 + stage.scale[scaleIndex] + octave,
        stepDuration * (drive > 0.72 ? 1.35 : 1.75),
        0.55 + drive * 0.5,
        (patternIndex % 4 - 1.5) * 0.22,
      );
    }

    if (drive > 0.76 && LEAD_PATTERN.includes(step)) {
      const leadIndex = LEAD_PATTERN.indexOf(step);
      const note = stage.root + chordRoot + 24 + stage.scale[(leadIndex + bar) % stage.scale.length];
      tone({
        time,
        frequency: midiToFrequency(note),
        endFrequency: midiToFrequency(note) * 1.012,
        duration: stepDuration * 2.2,
        gain: 0.014 + drive * 0.007,
        type: 'sine',
        attack: 0.012,
        release: stepDuration * 1.4,
        pan: leadIndex % 2 ? 0.28 : -0.28,
        destination: musicBus,
      });
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    applyMute();
    return muted;
  }

  function toggleMuted() {
    return setMuted(!muted);
  }

  function isMuted() {
    return muted;
  }

  function setIntensity(value) {
    const numericValue = Number(value);
    targetIntensity = Number.isFinite(numericValue)
      ? clamp(numericValue, 0, 1)
      : 0;
    return targetIntensity;
  }

  function setStage(index) {
    const numericIndex = Number(index);
    stageIndex = Number.isFinite(numericIndex) ? Math.max(0, Math.floor(numericIndex)) : 0;

    if (context && musicDelay) {
      const stage = STAGES[modulo(stageIndex, STAGES.length)];
      setParamSmoothly(musicDelay.delayTime, (60 / stage.tempo) * 0.75, 0.08);
    }

    return stageIndex;
  }

  function update(dt) {
    const numericDt = Number(dt);
    const frameTime = Number.isFinite(numericDt) ? clamp(numericDt, 0, 0.25) : 1 / 60;
    const blend = 1 - Math.exp(-frameTime * 4.5);
    intensity += (targetIntensity - intensity) * blend;

    if (!context || !unlocked || context.state !== 'running') return;

    setParamSmoothly(musicFilter.frequency, 820 + intensity * 5200, 0.045);
    setParamSmoothly(musicGain.gain, 0.2 + intensity * 0.055, 0.07);
    setParamSmoothly(delayFeedback.gain, 0.16 + intensity * 0.1, 0.08);
    setParamSmoothly(delayWet.gain, 0.085 + intensity * 0.055, 0.08);

    const stage = STAGES[modulo(stageIndex, STAGES.length)];
    const stepDuration = 60 / stage.tempo / 4;
    const now = context.currentTime;

    if (nextStepTime < now - 0.02) {
      const missedSteps = Math.max(1, Math.floor((now - nextStepTime) / stepDuration));
      sequenceStep += missedSteps;
      nextStepTime += missedSteps * stepDuration;
      if (nextStepTime < now) {
        sequenceStep += 1;
        nextStepTime += stepDuration;
      }
    }

    let scheduled = 0;
    const horizon = now + 0.11;
    while (nextStepTime <= horizon && scheduled < 12) {
      if (!muted) {
        try {
          scheduleMusicStep(nextStepTime, sequenceStep, stepDuration);
        } catch (_musicError) {
          // One failed voice should not interrupt the sequencer or game loop.
        }
      }
      sequenceStep += 1;
      nextStepTime += stepDuration;
      scheduled += 1;
    }
  }

  return Object.freeze({
    unlock,
    setMuted,
    toggleMuted,
    isMuted,
    setIntensity,
    setStage,
    update,
    sfx,
  });
}
