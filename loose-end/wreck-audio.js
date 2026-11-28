/* LOOSE END — After Hours. Original, deterministic sound design and adaptive score.
 * Audio observes the simulation; it never writes to it. No dependency or asset is
 * required to play. Generated effects are cached, and the score loads after input.
 */
(function (root) {
  'use strict';

  const VERSION = '5.3.0';
  const TAU = Math.PI * 2;
  const RATE = 22050;
  const MAX_VOICES = 36;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
  const round = n => Math.round(finite(n) * 10000) / 10000;
  const defaults = { muted: false, musicVolume: .48, effectsVolume: .82, ambienceVolume: .34 };

  function seeded(text) {
    let a = 2166136261;
    for (let i = 0; i < text.length; i++) a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return (a >>> 0) / 4294967296; };
  }
  function disconnect(node) { try { node.disconnect(); } catch (_) { /* already disconnected */ } }
  function stop(source, at) { try { source.stop(at); } catch (_) { /* already stopped */ } }
  function settingValues(input, current = defaults) {
    const values = { ...current };
    if (input && typeof input === 'object') {
      if ('muted' in input) values.muted = !!input.muted;
      for (const key of ['musicVolume', 'effectsVolume', 'ambienceVolume']) {
        if (Number.isFinite(input[key])) values[key] = clamp(input[key], 0, 1);
      }
    }
    return values;
  }

  // These are damped material resonances, impulses and friction, rather than a
  // general purpose oscillator played at a different pitch for every event.
  // A mode is [frequency, amplitude, decay, onset, frequencyChangePerSecond].
  // A noise layer is [colour, amplitude, decay, onset, attack].
  function definition(name) {
    const d = { length: .5, modes: [], noise: [], body: [] };
    const body = (hz, end, amp, decay, delay = 0) => d.body.push([hz, end, amp, decay, delay]);
    const mode = (hz, amp, decay, delay = 0, glide = 0) => d.modes.push([hz, amp, decay, delay, glide]);
    const noise = (colour, amp, decay, delay = 0, attack = .001) => d.noise.push([colour, amp, decay, delay, attack]);
    if (name === 'iron' || name === 'brass' || name === 'machine-break') {
      d.length = name === 'machine-break' ? .84 : .43;
      body(136, 47, .62, .065);
      mode(213, .22, .085); mode(479, .21, .052); mode(937, .10, .043); mode(1811, .05, .018);
      noise('band', .27, .018); noise('low', .35, .028);
      if (name === 'brass') { mode(651, .16, .073); mode(1423, .06, .06); }
      if (name === 'machine-break') {
        body(99, 41, .31, .10, .13); body(83, 36, .18, .065, .32);
        for (const [t, f] of [[.055, 751], [.16, 503], [.24, 1013], [.39, 397], [.53, 813]]) {
          mode(f, .10, .035, t); noise('band', .11, .018, t);
        }
        noise('low', .19, .19, .035, .02);
      }
    } else if (name === 'glass' || name === 'glass-break' || name === 'porcelain') {
      const breaking = name === 'glass-break';
      d.length = breaking ? .68 : .31;
      body(166, 61, .32, .034); noise('band', .30, .013);
      mode(name === 'porcelain' ? 731 : 1517, .22, .028);
      mode(name === 'porcelain' ? 1271 : 2639, .15, .021);
      noise('high', .23, .024);
      if (breaking) {
        for (const [t, f, a] of [[.024, 3531, .13], [.067, 1789, .17], [.12, 4357, .10], [.19, 2243, .12], [.28, 3109, .065], [.39, 1601, .055]]) {
          mode(f, a, .022, t); noise('high', a * 1.1, .023, t);
        }
        noise('band', .16, .085, .035, .003);
      }
    } else if (name === 'wood' || name === 'wood-break') {
      d.length = name === 'wood-break' ? .57 : .24;
      body(151, 84, .50, .041); mode(277, .21, .026); mode(621, .16, .017);
      noise('band', .49, .014); noise('low', .24, .022);
      if (name === 'wood-break') {
        noise('band', .35, .020, .045); mode(383, .20, .024, .045);
        for (const t of [.09, .16, .25, .35]) { noise('high', .14, .016, t); mode(530 + t * 900, .09, .015, t); }
      }
    } else if (name === 'barrel' || name === 'barrel-break') {
      d.length = name === 'barrel-break' ? .62 : .37;
      body(115, 49, .68, .11); mode(204, .29, .058); mode(417, .12, .027);
      noise('low', .28, .028); noise('band', .19, .014);
      if (name === 'barrel-break') {
        noise('band', .24, .075, .045); mode(583, .17, .040, .075);
        body(97, 52, .18, .046, .22); noise('high', .08, .026, .31);
      }
    } else if (name === 'block') {
      d.length = .35; body(193, 81, .40, .037);
      mode(389, .28, .051); mode(873, .25, .033); mode(1669, .09, .020);
      noise('band', .41, .021); noise('low', .20, .031);
      mode(593, .075, .055, .032, -750);
    } else if (name === 'reflect') {
      d.length = .47; body(138, 66, .43, .052);
      // A steel rake rises into a tightly damped D/A/D grip: short, recognisable,
      // and safely below the piercing frequencies of a coin or bell pickup.
      mode(287, .18, .13, .012, 2400); mode(461, .10, .09, .025, 3300);
      mode(146.83, .25, .10, .045); mode(220, .19, .09, .055); mode(293.66, .14, .08, .065);
      noise('band', .32, .075, .005, .018); noise('high', .09, .045, .03);
    } else if (name === 'dash') {
      d.length = .26; body(111, 35, .28, .049); noise('low', .30, .055, 0, .011);
      noise('band', .23, .045, .012, .009); noise('high', .075, .035, .018, .01);
    } else if (name.startsWith('foot-')) {
      d.length = .145; body(106, 65, .33, .021); noise('low', .26, .022);
      if (name === 'foot-midway') { mode(193, .21, .027); mode(377, .10, .017); noise('band', .13, .015); }
      else if (name === 'foot-baths') { mode(547, .17, .014); noise('band', .22, .009); noise('high', .12, .011, .012); }
      else { noise('band', .24, .017); noise('high', .14, .022, .009); }
    } else if (name === 'warning-topiarist' || name === 'warning-guard') {
      d.length = .76; mode(161, .18, .38, 0, 145); mode(329, .09, .24, .07, -120);
      noise('band', .15, .28, .018, .08); noise('low', .17, .34, .01, .065);
      for (const [t, a] of [[.02, .25], [.19, .15], [.34, .12], [.47, .10], [.57, .08]]) {
        mode(473, a, .016, t); noise('band', a, .011, t);
      }
    } else if (name === 'warning-bathmaster' || name === 'warning-steam' || name === 'warning-thrower') {
      d.length = .71; body(126, 94, .20, .045); mode(283, .13, .27, .035, 170);
      noise('low', .29, .31, .035, .12); noise('band', .24, .30, .055, .15);
      mode(613, .10, .023, .29); noise('band', .13, .025, .30);
    } else if (name === 'warning-carousel') {
      d.length = .87; mode(83, .21, .45, 0, 95); mode(239, .16, .36, .05, 210);
      noise('low', .17, .38, .02, .12); noise('band', .11, .31, .05, .10);
      for (const t of [.045, .24, .395, .515, .605, .675]) {
        mode(463, .13, .019, t); noise('band', .17, .013, t);
      }
    } else if (name === 'warning-rusher') {
      d.length = .53; mode(431, .19, .11, 0, -500); mode(713, .10, .08, .04, 850);
      noise('band', .19, .09, .02, .015); body(137, 94, .17, .06, .09);
      noise('high', .11, .015, .25);
    } else if (name === 'shot-pearl' || name === 'shot-spike') {
      d.length = .37; body(name === 'shot-pearl' ? 159 : 201, 51, .36, .048);
      noise('low', .33, .055); noise('band', .23, .044, .012, .012);
      mode(name === 'shot-pearl' ? 359 : 723, .19, .055, .005, -700);
      if (name === 'shot-spike') noise('high', .16, .025, .01);
    } else if (name === 'steam-on' || name === 'steam-off' || name === 'shutter') {
      d.length = name === 'shutter' ? .65 : .49;
      noise('band', .37, name === 'steam-off' ? .11 : .14, 0, name === 'steam-on' ? .012 : .03);
      noise('low', .33, .11, 0, .016); noise('high', .10, .065, .01, .02);
      body(139, 49, .20, .052);
      if (name === 'shutter') for (const t of [.02, .10, .19, .33]) { mode(317, .14, .027, t); noise('band', .15, .022, t); }
    } else if (name === 'charge' || name === 'sweep' || name === 'pulse') {
      d.length = name === 'sweep' ? .6 : .42;
      body(name === 'pulse' ? 91 : 122, 33, .56, .082);
      noise('low', .30, .12, .005, .016); noise('band', .21, .075, .018, .025);
      mode(217, .13, .06); if (name === 'sweep') mode(391, .10, .18, .035, 510);
    } else if (name === 'collapse' || name === 'part-break') {
      const full = name === 'collapse'; d.length = full ? 1.75 : .83;
      body(119, 30, .70, .14); mode(179, .30, .10); mode(437, .18, .07);
      noise('low', .39, .22, .012, .018); noise('band', .27, .095);
      for (const [t, hz, a] of [[.09, 83, .23], [.24, 103, .31], [.43, 68, .26], [.66, 76, .15], [.92, 51, .12]]) {
        if (!full && t > .5) continue;
        body(hz, hz * .55, a, .075, t); mode(239 + t * 350, a * .54, .041, t);
        noise('band', a * .7, .034, t); noise('low', a, .067, t);
      }
      if (full) { noise('band', .11, .20, .51, .035); noise('low', .16, .21, .84, .018); }
    } else if (name === 'hurt' || name === 'dead') {
      d.length = name === 'dead' ? 1.05 : .43;
      body(107, 33, .52, .105); noise('low', .32, .08); noise('band', .23, .024);
      mode(181, .20, .095, .01, -170); mode(259, .11, .06, .018, -200);
      if (name === 'dead') { body(79, 31, .22, .17, .2); noise('low', .13, .21, .22, .02); }
    } else if (name === 'win' || name === 'exit') {
      d.length = name === 'win' ? 1.22 : .59;
      body(103, 61, .22, .07); noise('low', .13, .06); noise('band', .09, .02);
      const chord = name === 'win' ? [146.83, 220, 293.66, 349.23] : [146.83, 220, 293.66];
      chord.forEach((f, i) => { mode(f, .16 - i * .019, name === 'win' ? .22 : .12, i * .045); mode(f * 2.01, .028, .045, i * .045); });
      if (name === 'win') noise('low', .08, .16, .23, .025);
    } else { // Tactile UI: a soft latch, with no tonal bleeps.
      d.length = .10; body(name === 'ui-close' ? 117 : 164, 90, .27, .013);
      noise('band', .19, .008); noise('low', .17, .011); mode(349, .07, .012);
    }
    return d;
  }

  function makeEffect(ctx, name, variant) {
    const d = definition(name), random = seeded(name + ':' + variant);
    const detune = .965 + random() * .07;
    const frames = Math.ceil(d.length * RATE), buffer = ctx.createBuffer(1, frames, RATE), samples = buffer.getChannelData(0);
    const sin = Math.sin, exp = Math.exp, min = Math.min, max = Math.max, abs = Math.abs;
    const colours = { low: new Float32Array(frames), band: new Float32Array(frames), high: new Float32Array(frames) };
    const phases = d.modes.map(() => random() * .13);
    let low = 0, upper = 0;
    for (let i = 0; i < frames; i++) {
      const white = random() * 2 - 1;
      low += .046 * (white - low); upper += .48 * (white - upper);
      colours.low[i] = low * 2.35; colours.band[i] = (upper - low) * 1.3; colours.high[i] = (white - upper) * .80;
    }
    // Render only each component's audible window. Recursive envelopes avoid
    // thousands of exp() calls and keep first-use effects out of the frame budget.
    for (const [hz, end, amp, decay, delay] of d.body) {
      const first = Math.ceil(delay * RATE), last = min(frames, Math.ceil((delay + decay * 8) * RATE));
      const sweep = decay * .45, decayStep = exp(-1 / (RATE * decay)), sweepStep = exp(-1 / (RATE * sweep));
      let age = first / RATE - delay, envelope = amp * exp(-age / decay), frequencyEnvelope = exp(-age / sweep);
      let phase = TAU * detune * (end * age + (hz - end) * sweep * (1 - frequencyEnvelope));
      for (let i = first; i < last; i++, age += 1 / RATE) {
        samples[i] += sin(phase) * envelope * min(1, age / .0018);
        phase += TAU * detune * (end + (hz - end) * frequencyEnvelope) / RATE;
        frequencyEnvelope *= sweepStep; envelope *= decayStep;
      }
    }
    for (let j = 0; j < d.modes.length; j++) {
      const [hz, amp, decay, delay, glide] = d.modes[j];
      const first = Math.ceil(delay * RATE), last = min(frames, Math.ceil((delay + decay * 8) * RATE));
      const decayStep = exp(-1 / (RATE * decay)), acceleration = TAU * detune * glide / (RATE * RATE);
      let age = first / RATE - delay, envelope = amp * exp(-age / decay);
      let phase = TAU * detune * (hz * age + glide * age * age / 2) + phases[j];
      let phaseStep = TAU * detune * (hz + glide * age + glide / (2 * RATE)) / RATE;
      for (let i = first; i < last; i++, age += 1 / RATE) {
        samples[i] += sin(phase) * envelope * min(1, age / .0012);
        phase += phaseStep; phaseStep += acceleration; envelope *= decayStep;
      }
    }
    for (const [colour, amp, decay, delay, attack] of d.noise) {
      const first = Math.ceil(delay * RATE), last = min(frames, Math.ceil((delay + decay * 8) * RATE)), data = colours[colour];
      const decayStep = exp(-1 / (RATE * decay));
      let age = first / RATE - delay, envelope = amp * exp(-age / decay);
      for (let i = first; i < last; i++, age += 1 / RATE) {
        samples[i] += data[i] * envelope * min(1, age / attack); envelope *= decayStep;
      }
    }
    let peak = .001, lastIn = 0, lastOut = 0;
    for (let i = 0; i < frames; i++) {
      // A sub-audible DC blocker removes impact asymmetry without thinning its body.
      const input = samples[i], output = input - lastIn + .995 * lastOut;
      lastIn = input; lastOut = output;
      samples[i] = output * min(1, (frames - i) / (RATE * .012));
      peak = max(peak, abs(samples[i]));
    }
    const normalize = .88 / peak;
    for (let i = 0; i < frames; i++) samples[i] *= normalize;
    return buffer;
  }

  function makeTexture(ctx, kind) {
    const length = kind.startsWith('amb-') ? 8 : 2.83;
    const sin = Math.sin, pow = Math.pow, max = Math.max;
    const frames = Math.floor(length * RATE), buffer = ctx.createBuffer(2, frames, RATE);
    for (let channel = 0; channel < 2; channel++) {
      const random = seeded(kind + ':' + channel), data = buffer.getChannelData(channel);
      let low = 0, mid = 0, drift = 0;
      for (let i = 0; i < frames; i++) {
        const t = i / RATE, white = random() * 2 - 1;
        low += .017 * (white - low); mid += .18 * (white - mid); drift += .0004 * (white - drift);
        if (kind === 'swing') data[i] = (mid - low) * .75 + low * .20;
        else if (kind === 'chain') {
          const pulse = pow(max(0, sin(t * 71 + .5 * sin(t * 43))), 18);
          data[i] = (mid - low) * pulse * .35 + sin(t * 1781) * pulse * .026;
        } else if (kind === 'steam') data[i] = (mid - low) * .62 + low * .25;
        else {
          const wave = .54 + .21 * sin(TAU * t / length + channel) + .14 * sin(TAU * t * 3 / length);
          if (kind === 'amb-baths') data[i] = low * wave * .75 + sin(TAU * 48 * t) * .015 * wave + drift * .45;
          else if (kind === 'amb-midway') data[i] = low * wave * .83 + sin(TAU * 36 * t) * .011 * wave + (mid - low) * .025;
          else data[i] = low * wave * .95 + (mid - low) * .055 * wave;
        }
      }
      // Overlap the loop ends; no sudden random-sample discontinuity at wrap.
      const fade = Math.floor(.055 * RATE);
      for (let i = 0; i < fade; i++) {
        const k = i / fade;
        data[frames - fade + i] = data[frames - fade + i] * (1 - k) + data[i] * k;
      }
    }
    return buffer;
  }

  // Used only if a score asset fails. A quiet original 8-bar bed gives the game
  // a graceful offline path; it does not make network or autoplay failures fatal.
  function makeFallbackScore(ctx, theme) {
    const scoreRate = 11025, sin = Math.sin, exp = Math.exp, min = Math.min, floor = Math.floor;
    const bpm = theme === 'baths' ? 94 : theme === 'midway' ? 128 : 124;
    const beat = 60 / bpm, duration = beat * 32, frames = Math.ceil(duration * scoreRate);
    const buffer = ctx.createBuffer(2, frames, scoreRate), random = seeded('fallback-' + theme);
    const roots = [73.416, 58.27, 65.406, 73.416], intervals = [[1, 1.2, 1.5], [1, 1.25, 1.5], [1, 1.25, 1.5], [1, 1.2, 1.5]];
    const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
    let low = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / scoreRate, bar = floor(t / (beat * 8)), rootHz = roots[bar % 4];
      const chordAge = t % (beat * 8), chordEnvelope = min(1, chordAge / .08) * min(1, (beat * 8 - chordAge) / .18);
      let chord = 0;
      for (const ratio of intervals[bar % 4]) chord += (sin(TAU * rootHz * 2 * ratio * t) + .13 * sin(TAU * rootHz * 4.01 * ratio * t)) * .026;
      const step = floor(t / beat), age = t % beat;
      const bass = sin(TAU * rootHz * age) * exp(-age * 10) * .12;
      const thump = step % 2 === 0 ? sin(TAU * (43 * age + 5.5 * (1 - exp(-age * 40)))) * exp(-age * 25) * .11 : 0;
      const noteAge = t % (beat * 2), note = rootHz * [2, 3, 2.4, 3][floor(t / (beat * 2)) % 4];
      const pluck = (sin(TAU * note * noteAge) + .15 * sin(TAU * note * 2.02 * noteAge)) * exp(-noteAge * 12) * .04;
      low += .12 * (random() * 2 - 1 - low);
      const brush = step % 4 === 2 ? low * exp(-age * 38) * .05 : 0;
      const value = chord * chordEnvelope + bass + thump + pluck + brush;
      const edge = min(1, t / .018, (duration - t) / .025);
      left[i] = value * edge;
      right[i] = (value + sin(TAU * rootHz * 3.003 * t) * .008 * chordEnvelope) * edge;
    }
    return { buffer, bpm, title: 'After Hours — offline chamber study', loopStart: 0, loopEnd: duration, gain: .66, fallback: true };
  }

  class WreckAudio {
    constructor(settings = {}) {
      this.settings = settingValues(settings);
      this.scene = 'menu'; this.state = null; this.view = null; this.context = null;
      this.supported = !!(root.AudioContext || root.webkitAudioContext);
      this.unlocked = false; this.destroyed = false;
      this._voices = new Map(); this._tails = new Set(); this._buffers = new Map(); this._loopNodes = new Map();
      this._tracks = new Map(); this._loading = new Map(); this._failed = new Set(); this._errors = [];
      this._hazards = new Map(); this._cooldowns = new Map(); this._variants = new Map(); this._targets = new WeakMap();
      this._music = null; this._fadingMusic = null; this._desiredTrack = null; this._musicRequest = null;
      this._resumePositions = new Map(); this._parkedMusic = null; this._previewActive = false; this._previewTimer = null;
      this._musicDuck = 1; this._duckUntil = 0; this._duckAmount = 1; this._voiceSerial = 0;
      this._lastPlayer = null; this._lastRoom = null; this._lastState = null; this._lastSimTime = 0;
      this._lastPosition = null; this._walkDistance = 0; this._footSide = 0; this._hidden = !!(root.document && root.document.hidden);
      this._continuous = { swing: 0, chain: 0, steam: 0, ambience: 0 };
      this._counters = { events: 0, played: 0, dropped: 0, throttled: 0, footsteps: 0, reflections: 0, warnings: 0,
        musicStarts: 0, musicCrossfades: 0, musicFailures: 0, combatResets: 0, peakVoices: 0 };
      this._eventCounts = Object.create(null);
      this._visibilityHandler = () => {
        this._hidden = !!root.document.hidden;
        if (this._hidden) this._endPreview();
        if (this._hidden) this._resetCombat();
        this._applyMix(); this._reconcileContext();
        if (!this._hidden) this._syncMusic();
      };
      if (root.document) root.document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    unlock() {
      if (this.destroyed || !this.supported) return Promise.resolve(false);
      if (!this.context) {
        try { this._buildGraph(); }
        catch (error) { this.supported = false; this._error('audio', error); return Promise.resolve(false); }
      }
      this.unlocked = true;
      this._applyMix(); this._syncMusic();
      return this._reconcileContext().then(() => this.context && this.context.state === 'running');
    }

    _buildGraph() {
      const Context = root.AudioContext || root.webkitAudioContext;
      const ctx = this.context = new Context({ latencyHint: 'interactive' });
      const gain = value => { const n = ctx.createGain(); n.gain.value = value; return n; };
      const analyse = () => { const n = ctx.createAnalyser(); n.fftSize = 512; n.smoothingTimeConstant = .6; return n; };
      this._masterInput = gain(.84);
      this._limiter = ctx.createDynamicsCompressor();
      this._limiter.threshold.value = -8; this._limiter.knee.value = 5; this._limiter.ratio.value = 16;
      this._limiter.attack.value = .003; this._limiter.release.value = .13;
      this._masterGain = gain(this.settings.muted ? 0 : .86); this._masterAnalyser = analyse();
      this._masterInput.connect(this._limiter); this._limiter.connect(this._masterGain);
      this._masterGain.connect(this._masterAnalyser); this._masterAnalyser.connect(ctx.destination);
      this._buses = {};
      for (const name of ['music', 'effects', 'ambience']) {
        const input = gain(0), analyser = analyse();
        if (name === 'music') {
          this._musicFilter = ctx.createBiquadFilter(); this._musicFilter.type = 'lowpass';
          this._musicFilter.frequency.value = 9500; this._musicFilter.Q.value = .5;
          this._musicDuckGain = gain(1);
          input.connect(this._musicFilter); this._musicFilter.connect(this._musicDuckGain); this._musicDuckGain.connect(analyser);
        } else input.connect(analyser);
        analyser.connect(this._masterInput); this._buses[name] = { input, analyser, samples: new Float32Array(512) };
      }
      this._masterSamples = new Float32Array(512);
      this._impactBus = gain(1); this._impactBus.connect(this._buses.effects.input);
      this._cueBus = gain(1); this._cueBus.connect(this._buses.effects.input);
    }

    setSettings(settings = {}) {
      this.settings = settingValues(settings, this.settings);
      this._applyMix();
      return { ...this.settings };
    }

    _param(param, value, seconds = .035) {
      if (!param || !this.context) return;
      value = finite(value);
      if (Math.abs((this._targets.get(param) ?? Infinity) - value) < .0001) return;
      this._targets.set(param, value);
      const now = this.context.currentTime;
      if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
      else param.cancelScheduledValues(now);
      if (seconds <= 0) param.setValueAtTime(value, now);
      else if (value === 0) param.linearRampToValueAtTime(0, now + Math.min(.12, seconds * 3));
      else param.setTargetAtTime(value, now, seconds);
    }

    _paused() { return this._hidden || this.scene === 'pause'; }
    _reconcileContext() {
      const ctx = this.context;
      if (!ctx || this.destroyed || ctx.state === 'closed') return Promise.resolve();
      const target = this._hidden || (this._paused() && !this._previewActive) || !this.unlocked ? 'suspended' : 'running';
      if (this._contextPending) return this._contextPending;
      if (ctx.state === target) return Promise.resolve();
      try {
        const operation = target === 'suspended' ? ctx.suspend() : ctx.resume();
        let failed = false;
        this._contextPending = Promise.resolve(operation).catch(error => { failed = true; this._error('context', error); }).finally(() => {
          this._contextPending = null;
          const wanted = this._hidden || (this._paused() && !this._previewActive) ? 'suspended' : 'running';
          if (!this.destroyed && !failed && wanted !== ctx.state) this._reconcileContext();
        });
        return this._contextPending;
      } catch (error) { this._error('context', error); return Promise.resolve(); }
    }

    _applyMix() {
      if (!this.context) return;
      const s = this.settings, paused = this._paused();
      this._param(this._masterGain.gain, s.muted || this._hidden || (paused && !this._previewActive) ? 0 : .86, paused && !this._previewActive ? 0 : .018);
      const engaged = this.scene === 'play' && this.state && this.state.boss && this.state.boss.engaged && !this.state.boss.destroyed;
      const sceneLevel = this.scene === 'play' || this._previewActive ? (engaged ? 1.04 : .95) : this.scene === 'over' ? .56 : .46;
      this._param(this._buses.music.input.gain, s.musicVolume * sceneLevel, s.musicVolume === 0 ? .012 : .28);
      this._param(this._buses.effects.input.gain, s.effectsVolume, .025);
      this._param(this._buses.ambience.input.gain, s.ambienceVolume, .08);
      this._param(this._musicFilter.frequency, this.scene === 'play' ? (engaged ? 14800 : 11600) : 4200, .32);
    }

    _error(kind, error) {
      const message = error && error.message ? error.message : String(error);
      this._errors.push({ kind, message: message.slice(0, 180) });
      if (this._errors.length > 10) this._errors.shift();
    }

    _buffer(name) {
      const variant = this._variants.get(name) || 0;
      this._variants.set(name, (variant + 1) % 4);
      const key = name + ':' + variant;
      if (!this._buffers.has(key)) this._buffers.set(key, makeEffect(this.context, name, variant));
      return this._buffers.get(key);
    }

    _pan(x) {
      if (!Number.isFinite(x)) return 0;
      const v = this.view;
      if (v && Number.isFinite(v.left) && Number.isFinite(v.right) && v.right > v.left) {
        return clamp((x - (v.left + v.right) * .5) / ((v.right - v.left) * .60), -.82, .82);
      }
      return clamp((x - finite(this.state && this.state.player && this.state.player.x, 800)) / 720, -.75, .75);
    }

    _play(name, options = {}) {
      if (!this.context || !this.unlocked || this.destroyed || this._hidden || (this._paused() && !options.preview) || this.settings.muted || this.settings.effectsVolume === 0) return null;
      const now = this.context.currentTime, priority = options.priority ?? 2;
      if (options.key) {
        const last = this._cooldowns.get(options.key);
        if (last !== undefined && now - last < (options.cooldown ?? .065)) { this._counters.throttled++; return null; }
        this._cooldowns.set(options.key, now);
      }
      if (this._voices.size >= MAX_VOICES) {
        const candidate = Array.from(this._voices.values()).sort((a, b) => a.priority - b.priority || a.started - b.started)[0];
        if (!candidate || candidate.priority > priority) { this._counters.dropped++; return null; }
        this._stopVoice(candidate, 0); this._counters.dropped++;
      }
      const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
      source.buffer = this._buffer(name); source.playbackRate.value = clamp(finite(options.rate, 1), .45, 2.4);
      gain.gain.value = clamp(finite(options.gain, .3), 0, 1); pan.pan.value = this._pan(options.x);
      source.connect(gain); gain.connect(pan); pan.connect(options.category === 'warning' || priority >= 7 ? this._cueBus : this._impactBus);
      const id = ++this._voiceSerial;
      const voice = { id, source, gain, pan, name, priority, category: options.category || 'combat', group: options.group || null, started: now };
      const cleanup = () => {
        this._voices.delete(id); this._tails.delete(voice); disconnect(source); disconnect(gain); disconnect(pan);
      };
      voice.cleanup = cleanup; source.onended = cleanup; this._voices.set(id, voice);
      source.start(now + Math.max(0, finite(options.delay)));
      this._counters.played++; this._counters.peakVoices = Math.max(this._counters.peakVoices, this._voices.size + this._tails.size);
      if (options.category === 'warning') this._counters.warnings++;
      return voice;
    }

    _stopVoice(voice, fade = .018) {
      if (!voice || !this.context) return;
      this._voices.delete(voice.id);
      if (fade > 0 && this.context.state === 'running' && this._tails.size < 8) {
        this._tails.add(voice); this._param(voice.gain.gain, 0, fade * .23); stop(voice.source, this.context.currentTime + fade);
      } else { stop(voice.source, this.context.currentTime); voice.cleanup(); }
    }

    _stopGroup(group, fade = .018) {
      for (const voice of Array.from(this._voices.values())) if (voice.group === group) this._stopVoice(voice, fade);
    }

    _resetCombat(keepResults = false) {
      this._counters.combatResets++;
      for (const voice of Array.from(this._voices.values())) {
        if (!(keepResults && voice.category === 'result')) this._stopVoice(voice, 0);
      }
      for (const voice of Array.from(this._tails)) { stop(voice.source, this.context ? this.context.currentTime : 0); voice.cleanup(); }
      this._hazards.clear(); this._cooldowns.clear(); this._walkDistance = 0; this._lastPosition = null;
      this._duckUntil = 0; this._duckAmount = 1;
      for (const name of ['swing', 'chain', 'steam']) this._loopLevel(name, 0);
      if (this.context) { this._param(this._impactBus.gain, 1, .03); this._param(this._musicDuckGain.gain, 1, .14); }
    }

    _duck(amount, duration) {
      if (!this.context || this.settings.effectsVolume === 0) return;
      this._duckAmount = Math.min(this._duckUntil > this.context.currentTime ? this._duckAmount : 1, amount);
      this._duckUntil = Math.max(this._duckUntil, this.context.currentTime + duration);
    }

    _loop(name) {
      if (this._loopNodes.has(name)) return this._loopNodes.get(name);
      const ctx = this.context, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter(), pan = ctx.createStereoPanner();
      const key = 'texture:' + name;
      if (!this._buffers.has(key)) this._buffers.set(key, makeTexture(ctx, name));
      source.buffer = this._buffers.get(key); source.loop = true; source.loopStart = .055; source.loopEnd = source.buffer.duration; gain.gain.value = 0;
      filter.type = 'lowpass'; filter.frequency.value = name === 'chain' ? 4400 : name === 'swing' ? 1600 : 3100; filter.Q.value = .4;
      source.connect(filter); filter.connect(gain); gain.connect(pan);
      pan.connect(name.startsWith('amb-') ? this._buses.ambience.input : this._impactBus);
      source.start(this.context.currentTime, .055);
      const node = { source, gain, filter, pan, level: 0 }; this._loopNodes.set(name, node); return node;
    }

    _loopLevel(name, level, options = {}) {
      if (!this.context || this.destroyed) return;
      const node = level > .0001 ? this._loop(name) : this._loopNodes.get(name);
      if (!node) return;
      node.level = level; this._param(node.gain.gain, level, options.time || .045);
      if (options.frequency) this._param(node.filter.frequency, options.frequency, .055);
      if (options.rate) this._param(node.source.playbackRate, options.rate, .08);
      if (Number.isFinite(options.x)) this._param(node.pan.pan, this._pan(options.x), .045);
      if (name in this._continuous) this._continuous[name] = level;
    }

    update(state, options = {}) {
      if (this.destroyed) return;
      const previousScene = this.scene, nextScene = options.scene || this.scene;
      const nextPlayer = state && state.player;
      const changedRoom = !!state && (state !== this._lastState || state.roomIndex !== this._lastRoom || nextPlayer !== this._lastPlayer || finite(state.time) + .01 < this._lastSimTime);
      this.state = state || this.state; this.scene = nextScene; this.view = options.view || this.view;
      this._hidden = !!(root.document && root.document.hidden);
      if (previousScene !== nextScene) this._endPreview();
      if (changedRoom) this._resetCombat();
      if (previousScene !== nextScene && nextScene !== 'play') this._resetCombat(nextScene === 'over');
      if (state) { this._lastState = state; this._lastRoom = state.roomIndex; this._lastPlayer = nextPlayer; this._lastSimTime = finite(state.time); }
      if (!this.context) return;
      this._applyMix(); this._reconcileContext(); this._syncMusic();
      const playing = this.scene === 'play' && !this._paused() && state && state.phase === 'play';
      const theme = state && ['garden', 'baths', 'midway'].includes(state.theme) ? state.theme : 'garden';
      for (const other of ['garden', 'baths', 'midway']) this._loopLevel('amb-' + other, other === theme && !this._paused() ? (playing ? .22 : .12) : 0, { time: .6 });
      this._continuous.ambience = this._paused() ? 0 : playing ? .22 : .12;
      if (playing && nextPlayer) {
        this._updateMotion(nextPlayer, theme); this._updateHazards(state); this._cleanWarnings(state);
      } else {
        for (const name of ['swing', 'chain', 'steam']) this._loopLevel(name, 0);
        this._lastPosition = null; this._walkDistance = 0;
      }
      const warningCount = Array.from(this._voices.values()).filter(v => v.category === 'warning').length;
      const targetDuck = this._duckUntil > this.context.currentTime ? this._duckAmount : warningCount ? .60 : 1;
      this._musicDuck = targetDuck; this._param(this._musicDuckGain.gain, targetDuck, targetDuck < 1 ? .025 : .30);
      this._param(this._impactBus.gain, warningCount ? .67 : 1, .04);
      if (this._cooldowns.size > 160) for (const [key, time] of this._cooldowns) if (time < this.context.currentTime - 2) this._cooldowns.delete(key);
    }

    _updateMotion(p, theme) {
      const speed = Math.hypot(finite(p.headVX) - finite(p.vx) * .35, finite(p.headVY) - finite(p.vy) * .35);
      const motion = Math.pow(clamp((speed - 320) / 2900, 0, 1), .85);
      const tension = clamp(finite(p.tension), 0, 1);
      this._loopLevel('swing', motion * .155, { x: p.headX, frequency: 700 + motion * 2800, rate: .72 + motion * .75 });
      this._loopLevel('chain', motion * (.008 + tension * .105), { x: p.headX, frequency: 2400 + motion * 2600, rate: .75 + motion * 1.0 });
      if (this._lastPosition) {
        const distance = Math.hypot(p.x - this._lastPosition.x, p.y - this._lastPosition.y);
        if (distance < 150 && !(p.dashTime > 0)) this._walkDistance += distance;
        else this._walkDistance = 0;
        if (this._walkDistance >= 105) {
          this._walkDistance %= 105; this._footSide ^= 1;
          const walkSpeed = Math.hypot(finite(p.vx), finite(p.vy));
          const v = this._play('foot-' + theme, { gain: .105 + clamp(walkSpeed / 470, 0, 1) * .055, rate: this._footSide ? 1.035 : .965,
            x: p.x + (this._footSide ? 10 : -10), priority: 0, key: 'footstep', cooldown: .14 });
          if (v) this._counters.footsteps++;
        }
      }
      this._lastPosition = { x: p.x, y: p.y };
    }

    _updateHazards(state) {
      const seen = new Set(); let active = 0, position = 0;
      for (const h of state.hazards || []) {
        seen.add(h.id);
        const previous = this._hazards.get(h.id);
        if (h.phase !== previous) {
          this._stopGroup('hazard:' + h.id);
          if (!h.disabled && h.phase === 'warning') this._warning('steam', h, Math.max(.2, finite(h.timer, .8)), 'hazard:' + h.id);
          else if (!h.disabled && h.phase === 'active') this._play('steam-on', { gain: .26, x: h.x, priority: 5, key: 'steam-on', cooldown: .08 });
          else if (previous === 'active') this._play('steam-off', { gain: .14, x: h.x, priority: 2, key: 'steam-off', cooldown: .12 });
        }
        this._hazards.set(h.id, h.phase);
        if (!h.disabled && h.phase === 'active') { active++; position += h.x; }
      }
      for (const [id, phase] of this._hazards) if (!seen.has(id)) {
        this._stopGroup('hazard:' + id);
        if (phase === 'active') this._play('steam-off', { gain: .12, priority: 2, key: 'steam-off', cooldown: .12 });
        this._hazards.delete(id);
      }
      this._loopLevel('steam', active ? Math.min(.22, .10 + active * .028) : 0, { x: active ? position / active : undefined, frequency: 2300, time: .07 });
    }

    _cleanWarnings(state) {
      for (const voice of Array.from(this._voices.values())) {
        if (voice.category !== 'warning' || !voice.group) continue;
        if (voice.group.startsWith('enemy:')) {
          const e = (state.enemies || []).find(enemy => 'enemy:' + enemy.id === voice.group);
          if (!e || e.destroyed || e.hp <= 0 || !['windup', 'aim'].includes(e.phase)) this._stopVoice(voice);
        } else if (voice.group === 'boss' && (!state.boss || state.boss.destroyed || !['windup', 'sweep-windup', 'pulse-windup', 'aim'].includes(state.boss.phase))) this._stopVoice(voice);
      }
    }

    _warning(kind, event, duration, group) {
      this._stopGroup(group);
      const name = 'warning-' + kind;
      const sourceDuration = definition(name).length;
      const voice = this._play(name, { gain: kind === 'steam' ? .27 : group === 'boss' ? .47 : .32,
        rate: clamp(sourceDuration / Math.max(.23, duration * .96), .55, 2), x: event.x ?? (this.state && this.state.boss && this.state.boss.x),
        priority: 8, category: 'warning', group, key: 'warning:' + group, cooldown: .04 });
      if (voice) this._duck(.55, Math.min(1.1, duration));
    }

    event(event, state) {
      if (!event || this.destroyed) return;
      if (state) this.state = state;
      const type = event.type;
      this._counters.events++; this._eventCounts[type] = (this._eventCounts[type] || 0) + 1;
      if (type === 'room') { this._resetCombat(); this._syncMusic(); return; }
      if (this.scene !== 'play') return;
      const power = clamp(finite(event.power, .6), 0, 1), x = event.x, gain = .22 + .30 * power;
      if (type === 'hit' || type === 'break') {
        if (type === 'hit' && event.hp === 0) return;
        const broken = type === 'break';
        let material = event.kind === 'crate' ? 'wood' : event.kind === 'glass' ? 'glass' : event.kind === 'barrel' ? 'barrel' :
          event.kind === 'core' ? 'porcelain' : event.kind === 'drone' ? (event.archetype === 'guard' ? 'brass' : 'porcelain') : 'iron';
        if (broken) {
          if (['glass', 'wood', 'barrel'].includes(material)) material += '-break';
          else material = event.kind === 'drone' && event.archetype !== 'guard' ? 'glass-break' : 'machine-break';
          this._stopGroup('enemy:' + event.id);
        }
        this._play(material, { gain: gain * (broken ? 1.06 : .85), x, rate: .96 + power * .08, priority: broken ? 4 : 3,
          key: type + ':' + event.id, cooldown: .05 });
        if (broken && power > .78) this._duck(.78, .14);
      } else if (type === 'enemy-windup') {
        this._warning(event.archetype || 'rusher', event, event.duration || .85, 'enemy:' + event.id);
      } else if (type === 'boss-phase') {
        this._stopGroup('boss');
        if (['windup', 'sweep-windup', 'pulse-windup', 'aim'].includes(event.phase)) this._warning(event.kind, event, event.duration || .85, 'boss');
        else if (['charge', 'sweep', 'pulse'].includes(event.phase)) this._play(event.phase, { gain: .38, x: this.state && this.state.boss && this.state.boss.x, priority: 6 });
      } else if (type === 'boss-shot' || type === 'enemy-shot') {
        this._stopGroup(type === 'boss-shot' ? 'boss' : 'enemy:' + event.ownerId);
        this._play(event.reflectable === false ? 'shot-spike' : 'shot-pearl', { gain: type === 'boss-shot' ? .37 : .27, x, priority: 6,
          key: 'shot:' + event.ownerId, cooldown: .04 });
      } else if (type === 'boss-block' || type === 'enemy-block') {
        this._play('block', { gain: gain * .81, x, priority: 3, key: 'block:' + (event.id || event.kind), cooldown: .11 });
      } else if (type === 'boss-hit') {
        if (event.hp > 0) this._play('iron', { gain: gain * 1.10, x, priority: 5, key: 'boss-hit:' + event.id, cooldown: .055 });
        this._duck(.68, .19);
      } else if (type === 'boss-part') {
        this._play('part-break', { gain: .53, x, priority: 7, key: 'part:' + event.id, cooldown: .2 }); this._duck(.52, .4);
      } else if (type === 'boss-break') {
        this._stopGroup('boss');
        for (const voice of Array.from(this._voices.values())) if (voice.category === 'warning') this._stopVoice(voice, 0);
        this._play('collapse', { gain: .67, x, priority: 10, category: 'resolution', key: 'boss-break', cooldown: 1.2 }); this._duck(.34, 1.1);
      } else if (type === 'reflect') {
        const voice = this._play('reflect', { gain: .53, x, priority: 8, key: 'reflect:' + event.id, cooldown: .065 });
        if (voice) this._counters.reflections++; this._duck(.61, .23);
      } else if (type === 'boss-open') {
        this._stopGroup('boss'); this._play('shutter', { gain: .37, x, priority: 6 });
      } else if (type === 'hazard-disabled') {
        this._stopGroup('hazard:' + event.id); this._hazards.set(event.id, 'disabled');
        this._play('shutter', { gain: .28, x, rate: .82, priority: 5 });
      } else if (type === 'danger') {
        // update() observes both permanent and transient vents. Mark this one so
        // the immediately following render does not duplicate its anticipation.
        this._hazards.set(event.id, 'warning'); this._warning('steam', event, event.warning || .9, 'hazard:' + event.id);
      } else if (type === 'dash') {
        this._walkDistance = 0; this._play('dash', { gain: .34, x, priority: 3, key: 'dash', cooldown: .16 });
      } else if (type === 'hurt') {
        this._play('hurt', { gain: .53, x, priority: 9, key: 'hurt', cooldown: .11 }); this._duck(.32, .48);
      } else if (type === 'dead' || type === 'win') {
        this._resetCombat(); this._play(type, { gain: type === 'win' ? .42 : .52, x, priority: 10, category: 'result', key: 'result', cooldown: .8 });
        this._duck(.46, .7);
      } else if (type === 'exit') {
        // A boss collapse already supplies the release; avoid stacking a jingle.
        if (!state || state.roomType !== 'boss') this._play('exit', { gain: .24, x, priority: 4, key: 'exit', cooldown: 1 });
      } else if (type === 'boss-engaged') {
        this._play('charge', { gain: .23, x: this.state && this.state.boss && this.state.boss.x, rate: .72, priority: 5, key: 'engaged', cooldown: 1 });
      }
    }

    ui(kind = 'select') {
      if (kind === 'win' || kind === 'dead') return; // Results are simulation events.
      if (kind === 'preview') {
        if (!this.context || !this.unlocked || this.settings.muted || this._hidden || this.destroyed) return;
        if (this._previewTimer !== null) root.clearTimeout(this._previewTimer);
        if (this.scene === 'pause' && !this._previewActive) {
          // Audition a copy. Preserve the transport position of the real score.
          if (this._music) {
            const track = this._music;
            this._resumePositions.set(track.identity, this._trackPosition(track)); this._parkedMusic = track;
            this._stopTrack(track);
          }
          this._stopTrack(this._fadingMusic);
          for (const node of this._loopNodes.values()) this._param(node.gain.gain, 0, 0);
        }
        this._previewActive = true; this._stopGroup('preview', 0);
        if (this._previewMusic) { stop(this._previewMusic.source, this.context.currentTime); disconnect(this._previewMusic.gain); this._previewMusic = null; }
        if (this.scene === 'pause' && this._parkedMusic) {
          const original = this._parkedMusic, source = this.context.createBufferSource(), gain = this.context.createGain();
          source.buffer = original.buffer; source.loop = true; source.loopStart = original.loopStart; source.loopEnd = original.loopEnd;
          gain.gain.value = original.gain ? original.gain.gain.value : 1;
          source.connect(gain); gain.connect(this._buses.music.input);
          this._previewMusic = { source, gain }; source.start(this.context.currentTime, this._resumePositions.get(original.identity));
        }
        this._applyMix(); this._reconcileContext();
        this._play('iron', { gain: .43, priority: 7, category: 'ui', group: 'preview', preview: true });
        this._play('glass-break', { gain: .32, priority: 7, category: 'ui', group: 'preview', delay: .24, x: this.state && this.state.player ? this.state.player.x - 80 : undefined, preview: true });
        this._play('reflect', { gain: .43, priority: 8, category: 'ui', group: 'preview', delay: .62, preview: true });
        this._previewTimer = root.setTimeout(() => this._endPreview(), 1350);
        return;
      }
      this._play(kind === 'close' || kind === 'back' ? 'ui-close' : 'ui-open', { gain: .17, priority: 6, category: 'ui', key: 'ui', cooldown: .055 });
    }

    _endPreview() {
      if (!this._previewActive) return;
      this._previewActive = false;
      if (this._previewTimer !== null) root.clearTimeout(this._previewTimer);
      this._previewTimer = null; this._stopGroup('preview', 0);
      if (this._previewMusic) { stop(this._previewMusic.source, this.context.currentTime); disconnect(this._previewMusic.source); disconnect(this._previewMusic.gain); this._previewMusic = null; }
      this._applyMix(); this._reconcileContext();
    }

    _resolveTrack() {
      const state = this.state, theme = state && ['garden', 'baths', 'midway'].includes(state.theme) ? state.theme : 'garden';
      const score = root.LOOSE_END_SCORE || {};
      const boss = state && state.roomType === 'boss' && (this.scene === 'play' || this.scene === 'over');
      const key = boss && score[theme + '-boss'] ? theme + '-boss' : theme;
      const descriptor = score[key];
      return { key, theme, descriptor, identity: key + ':' + (descriptor && descriptor.src || 'fallback') };
    }

    _syncMusic() {
      if (!this.context || !this.unlocked || this.destroyed) return;
      const wanted = this._desiredTrack = this._resolveTrack();
      if (this._paused()) return;
      if (this._music && this._music.identity === wanted.identity) return;
      if (this._tracks.has(wanted.identity)) { this._startTrack(wanted, this._tracks.get(wanted.identity)); return; }
      if (this._loading.has(wanted.identity)) return;
      const descriptor = wanted.descriptor;
      if (!descriptor || !descriptor.src || this._failed.has(wanted.identity)) {
        const track = makeFallbackScore(this.context, wanted.theme); this._tracks.set(wanted.identity, track);
        this._startTrack(wanted, track); return;
      }
      this._loadTrack(wanted);
    }

    _loadTrack(wanted) {
      const controller = typeof root.AbortController === 'function' ? new root.AbortController() : null;
      const timeout = controller ? root.setTimeout(() => controller.abort(), 15000) : null;
      const request = { controller, promise: null };
      this._loading.set(wanted.identity, request);
      request.promise = Promise.resolve().then(async () => {
        const response = await root.fetch(wanted.descriptor.src, { cache: 'force-cache', ...(controller ? { signal: controller.signal } : {}) });
        if (!response.ok) throw new Error('Score HTTP ' + response.status);
        const bytes = await response.arrayBuffer();
        if (this.destroyed) return;
        const buffer = await this.context.decodeAudioData(bytes);
        if (this.destroyed) return;
        const duration = buffer.duration, start = clamp(finite(wanted.descriptor.loopStart), 0, Math.max(0, duration - .5));
        const end = clamp(finite(wanted.descriptor.loopEnd, duration), start + Math.min(.4, duration - start), duration);
        if (!(duration > .1 && end > start)) throw new Error('Score is empty or has invalid loop points');
        this._tracks.set(wanted.identity, { buffer, title: wanted.descriptor.title || wanted.key, bpm: finite(wanted.descriptor.bpm),
          loopStart: start, loopEnd: end, gain: clamp(finite(wanted.descriptor.gain, 1), 0, 1.5), fallback: false });
      }).catch(error => {
        if (!this.destroyed) { this._failed.add(wanted.identity); this._counters.musicFailures++; this._error('score:' + wanted.key, error); }
      }).finally(() => {
        if (timeout !== null) root.clearTimeout(timeout);
        this._loading.delete(wanted.identity);
        if (!this.destroyed) { this._evictTracks(); this._syncMusic(); }
      });
    }

    _startTrack(wanted, track) {
      if (this.destroyed || this._paused() || (this._music && this._music.identity === wanted.identity)) return;
      const ctx = this.context, now = ctx.currentTime;
      if (this._fadingMusic) this._stopTrack(this._fadingMusic);
      const previous = this._music;
      if (previous) {
        this._fadingMusic = previous;
        previous.gain.gain.cancelScheduledValues(now); previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
        previous.gain.gain.linearRampToValueAtTime(0, now + 1.45); stop(previous.source, now + 1.5);
        this._counters.musicCrossfades++;
      }
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = track.buffer; source.loop = true; source.loopStart = track.loopStart; source.loopEnd = track.loopEnd;
      gain.gain.value = 0; gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(track.gain, now + (previous ? 1.45 : 1.2));
      source.connect(gain); gain.connect(this._buses.music.input);
      const resumeOffset = this._resumePositions.get(wanted.identity);
      const playing = { ...wanted, ...track, source, gain, started: now, offset: Number.isFinite(resumeOffset) ? resumeOffset : track.loopStart };
      source.onended = () => {
        disconnect(source); disconnect(gain);
        if (this._fadingMusic === playing) this._fadingMusic = null;
        if (this._music === playing) this._music = null;
      };
      this._music = playing; this._parkedMusic = null; this._resumePositions.delete(wanted.identity);
      source.start(now, playing.offset); this._counters.musicStarts++; this._evictTracks();
    }

    _stopTrack(track) {
      if (!track || !this.context) return;
      stop(track.source, this.context.currentTime); disconnect(track.source); disconnect(track.gain);
      if (this._music === track) this._music = null;
      if (this._fadingMusic === track) this._fadingMusic = null;
    }

    _evictTracks() {
      if (this._tracks.size <= 3) return;
      for (const key of this._tracks.keys()) {
        if (this._tracks.size <= 3) break;
        if (key !== (this._music && this._music.identity) && key !== (this._fadingMusic && this._fadingMusic.identity) && key !== (this._desiredTrack && this._desiredTrack.identity)) this._tracks.delete(key);
      }
    }

    _level(analyser, samples) {
      if (!analyser || !samples || !this.context || this.context.state !== 'running' || this.settings.muted || this._hidden || (this._paused() && !this._previewActive)) return { rms: 0, peak: 0 };
      analyser.getFloatTimeDomainData(samples);
      let sum = 0, peak = 0;
      for (const value of samples) { sum += value * value; peak = Math.max(peak, Math.abs(value)); }
      return { rms: round(Math.sqrt(sum / samples.length)), peak: round(peak) };
    }

    _trackPosition(track) {
      const span = track.loopEnd - track.loopStart;
      return track.loopStart + ((this.context.currentTime - track.started + track.offset - track.loopStart) % span + span) % span;
    }

    inspect() {
      const master = this._level(this._masterAnalyser, this._masterSamples), rms = { master: master.rms, music: 0, effects: 0, ambience: 0 };
      if (this._buses) for (const name of ['music', 'effects', 'ambience']) rms[name] = this._level(this._buses[name].analyser, this._buses[name].samples).rms;
      let currentTrack = null;
      if ((this._music || this._parkedMusic) && this.context) {
        const m = this._music || this._parkedMusic;
        const position = this._music ? this._trackPosition(m) : this._resumePositions.get(m.identity);
        currentTrack = { key: m.key, title: m.title, theme: m.theme, bpm: m.bpm, position: round(position), loopStart: round(m.loopStart), loopEnd: round(m.loopEnd), fallback: m.fallback };
      }
      return { version: VERSION, supported: this.supported, unlocked: this.unlocked, contextState: this.context ? this.context.state : 'locked',
        scene: this.scene, hidden: this._hidden, settings: { ...this.settings }, currentTrack,
        loading: Array.from(this._loading.keys()), loadedTracks: Array.from(this._tracks.keys()), errors: this._errors.map(e => ({ ...e })),
        activeVoices: this._voices.size + this._tails.size, activeMusicSources: (this._music ? 1 : 0) + (this._fadingMusic ? 1 : 0) + (this._previewMusic ? 1 : 0),
        warningCount: Array.from(this._voices.values()).filter(v => v.category === 'warning').length,
        cachedEffects: this._buffers.size, counters: { ...this._counters }, eventCounts: { ...this._eventCounts },
        rms, peak: master.peak, duck: round(this._musicDuck), continuous: { ...this._continuous }, captureActive: !!this._capture, previewActive: this._previewActive };
    }

    // Explicit QA opt-in only. Nothing records or allocates a stream in normal
    // play. The caller owns MediaRecorder and any resulting file.
    createCaptureStream() {
      if (!this.context || this.destroyed || typeof this.context.createMediaStreamDestination !== 'function') return null;
      if (!this._capture) { this._capture = this.context.createMediaStreamDestination(); this._masterAnalyser.connect(this._capture); }
      return this._capture.stream;
    }

    releaseCaptureStream() {
      if (!this._capture) return;
      try { this._masterAnalyser.disconnect(this._capture); } catch (_) { /* already disconnected */ }
      for (const track of this._capture.stream.getTracks()) track.stop(); this._capture = null;
    }

    destroy() {
      if (this.destroyed) return;
      this._endPreview();
      this._resetCombat(); this.destroyed = true;
      if (root.document) root.document.removeEventListener('visibilitychange', this._visibilityHandler);
      this.releaseCaptureStream();
      for (const request of this._loading.values()) if (request.controller) request.controller.abort();
      this._stopTrack(this._music); this._stopTrack(this._fadingMusic);
      for (const node of this._loopNodes.values()) { stop(node.source, this.context.currentTime); disconnect(node.source); disconnect(node.gain); disconnect(node.filter); disconnect(node.pan); }
      this._loopNodes.clear(); this._buffers.clear(); this._tracks.clear();
      if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    }
  }
  root.WreckAudio = WreckAudio;
})(typeof window !== 'undefined' ? window : globalThis);
