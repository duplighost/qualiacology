// THE SCORE — three synth layers through one mood lowpass.
//
// There are no stingers in FLARE. Nothing in the music is triggered by an event;
// every layer is always sounding and only its LEVEL moves, cross-faded from live
// state on 1.0-1.5 s time constants with `setTargetAtTime` and never a linear
// ramp. A score that cross-fades from live state cannot desync from what is
// actually happening, and a score that never stings cannot lie about it either.
//
// The mood filter is the one progress readout the iris cannot cancel. Its cutoff
// is 700 + litFraction * 1900 Hz, so the music PHYSICALLY OPENS as the room
// lights: clearing a chamber sounds like a filter sweep you earned rather than a
// cue somebody scripted. The iris compresses the picture's brightness by up to
// 2.5x (C1-F8) — it cannot touch this.
//
// Everything here is below 1.6 kHz by construction and sits behind the sfx bus's
// own lowpass anyway. THE MIX LAW: the 2.5-5.5 kHz pinna band belongs to EARSHOT
// alone, and the bed is the layer most likely to creep into it if a later pass
// reaches for "air".

import { FEEL } from '../feel.js';
import { clamp01 } from '../core/math.js';

const T = FEEL.tension;

export const SCORE = Object.freeze({
  root: 36.71,                 // low D. The tower hums in one key and never modulates.
  droneDetune: 7,              // cents — two saws a whisker apart is the whole trick
  droneGain: 0.055,

  // THE DRONE IS BAND-LIMITED AT THE OSCILLATOR, not at a filter, and this is
  // the single most important number in this file. A raw 36.71 Hz sawtooth puts
  // roughly eighty harmonics inside 2.5-5.5 kHz; because sawtooth power falls as
  // 1/n^2 that energy piles up at the band's LOW edge, where even a 4th-order
  // 1.6 kHz guard is only ~15 dB down. Measured: a raw-sawtooth drone put the
  // score 16.6 dB from the EARSHOT click in EARSHOT's own band — a mix-law
  // failure in the exact state the system exists for (standing in the dark, not
  // shooting, listening). 32 partials keeps every one of them under 1.2 kHz, so
  // the law holds by construction and the drone still buzzes.
  dronePartials: 32,

  fifth: 1.5,
  octave: 2,
  minorSecond: 1.0594631,      // the dissonance cluster: octave + m2 + tritone
  tritone: 1.4142136,

  // DESIGN's layer gains were authored for one oscillator per layer; every layer
  // here is a stack of three, and two of them (sub, heart) are driven by tension
  // bus CONTROL values in 0..0.48 that are not gains at all. Untrimmed the music
  // peaked at 0.62 — above the master compressor's own threshold, so the bed was
  // doing the compressing before a shot was ever fired, and 3.5x louder than a
  // REPEATER round. Calibrated by measurement so the loudest the bed ever gets
  // (combat 1, tension 1, lit 1) still sits under the QUIETEST weapon: in a game
  // whose whole premise is the gun, nothing may sit on top of the gun.
  trim: 0.10,

  tensionBase: 0.015,
  tensionPer: 0.11,
  tensionTau: 1.2,

  pulseHzBase: 1.5,
  pulseHzPer: 2.4,
  pulseTau: 1.5,
  pulseGainPer: 0.12,
  pulseGainTau: 1.0,
  pulseDepth: 0.5,

  masterBase: 0.34,
  masterPer: 0.32,
  masterTau: 1.5,
  quietLevel: 0.04,            // the 2.6 s of engineered silence before a wave
  quietTau: 0.45,

  bedBase: 900,                // "bed lowpass = colour + t^2 * 1500"
  subTau: 1.4,

  heartHz: 48,
  heartPeak: 0.30,
  heartAttack: 0.006,
  heartDur: 0.130,
  heartDecay: 0.045,
  heartDubDelay: 0.170,        // lub ... dub
  heartDubScale: 0.62,
  heartLead: 0.120,            // schedule this far ahead of the beat

  litGoal: 26,                 // scar-light total that counts as a fully lit chamber
  fadeInTau: 2.5,
});

export class Score {
  constructor(actx, nodes, bus) {
    this.actx = actx;
    this.bus = bus;
    this.combat = 0;
    this.tension = 0;
    this.lit = 0;
    this.quiet = false;
    this.timeScale = 1;
    this.combatProviderIsDefault = true;
    this.tensionProviderIsDefault = true;
    this._nextBeat = 0;

    const r = SCORE.root;

    // A sawtooth spectrum truncated at SCORE.dronePartials — a band-limited saw.
    // Not an AudioNode; it costs nothing at runtime and it is what makes the mix
    // law structural instead of a filter's problem.
    const n = SCORE.dronePartials;
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) imag[k] = 1 / k;
    this.sawWave = actx.createPeriodicWave(real, imag);

    // --- layer 1: DRONE — two saws a whisker apart, plus the fifth ----------
    this.droneGain = nodes.gain(SCORE.droneGain * SCORE.trim);
    this.droneGain.connect(bus.musicIn);
    this.droneA = nodes.osc('sine', r);
    this.droneB = nodes.osc('sine', r);
    this.droneA.setPeriodicWave(this.sawWave);
    this.droneB.setPeriodicWave(this.sawWave);
    this.droneB.detune.value = SCORE.droneDetune;
    this.droneC = nodes.osc('triangle', r * SCORE.fifth);
    this.droneA.connect(this.droneGain);
    this.droneB.connect(this.droneGain);
    this.droneC.connect(this.droneGain);

    // --- layer 2: TENSION SHIMMER — a dissonance cluster, gain t^2 * 0.95 ---
    this.tensionGain = nodes.gain(SCORE.tensionBase * SCORE.trim);
    this.tensionGain.connect(bus.musicIn);
    this.shimA = nodes.osc('triangle', r * SCORE.octave);
    this.shimB = nodes.osc('triangle', r * SCORE.octave * SCORE.minorSecond);
    this.shimC = nodes.osc('sine', r * SCORE.octave * SCORE.tritone);
    this.shimA.connect(this.tensionGain);
    this.shimB.connect(this.tensionGain);
    this.shimC.connect(this.tensionGain);

    // --- layer 3: PULSE THROB — a real LFO on a gain, not a per-frame write --
    this.pulseLevel = nodes.gain(0);
    this.pulseLevel.connect(bus.musicIn);
    this.pulseGate = nodes.gain(SCORE.pulseDepth);
    this.pulseGate.connect(this.pulseLevel);
    this.pulseOsc = nodes.osc('sine', r * SCORE.octave);
    this.pulseOsc.connect(this.pulseGate);
    this.lfo = nodes.osc('sine', SCORE.pulseHzBase);
    this.lfoDepth = nodes.gain(SCORE.pulseDepth);
    this.lfo.connect(this.lfoDepth);
    this.lfoDepth.connect(this.pulseGate.gain);

    // --- the sub and the heart ---------------------------------------------
    this.subGain = nodes.gain(T.sub.base * SCORE.trim);
    this.subGain.connect(bus.musicIn);
    this.subOsc = nodes.osc('sine', r / SCORE.octave);
    this.subOsc.connect(this.subGain);

    this.heartEnv = nodes.gain(0);
    this.heartEnv.connect(bus.musicIn);
    this.heartOsc = nodes.osc('sine', SCORE.heartHz);
    this.heartOsc.connect(this.heartEnv);
  }

  start(when) {
    const t = when === undefined ? 0 : when;
    this.droneA.start(t); this.droneB.start(t); this.droneC.start(t);
    this.shimA.start(t); this.shimB.start(t); this.shimC.start(t);
    this.pulseOsc.start(t); this.lfo.start(t);
    this.subOsc.start(t); this.heartOsc.start(t);
    this._nextBeat = t;
    this.bus.setMusicLevel(SCORE.masterBase, SCORE.fadeInTau, t);
  }

  /** Live director state. No-silent-default rule: the wiring must be proved. */
  setCombat(x) { this.combat = clamp01(x); this.combatProviderIsDefault = false; }
  setTension(t) { this.tension = clamp01(t); this.tensionProviderIsDefault = false; }
  setLit(f) { this.lit = clamp01(f); }
  setQuiet(on) { this.quiet = !!on; }
  setTimeScale(s) { this.timeScale = s > 0 ? s : 1; }

  update(when) {
    const t = this.bus.at(when);
    const x = this.combat;
    const ten = this.tension;

    this.tensionGain.gain.setTargetAtTime(
      (SCORE.tensionBase + x * SCORE.tensionPer + ten * ten * T.dissonance * SCORE.tensionPer) * SCORE.trim,
      t, SCORE.tensionTau);

    this.lfo.frequency.setTargetAtTime(
      (SCORE.pulseHzBase + x * SCORE.pulseHzPer) * this.timeScale, t, SCORE.pulseTau);
    this.pulseLevel.gain.setTargetAtTime(x * SCORE.pulseGainPer * SCORE.trim, t, SCORE.pulseGainTau);

    this.subGain.gain.setTargetAtTime((T.sub.base + ten * T.sub.per) * SCORE.trim, t, SCORE.subTau);

    const level = this.quiet ? SCORE.quietLevel : SCORE.masterBase + x * SCORE.masterPer;
    this.bus.setMusicLevel(level, this.quiet ? SCORE.quietTau : SCORE.masterTau, t);

    // THE progress readout: the room opens the filter.
    this.bus.setMood(T.moodLowpass.base + this.lit * T.moodLowpass.perLit, t);
    this.bus.setBed(SCORE.bedBase + ten * ten * T.bedLowpassPerT2, t);

    this._beat(t);
  }

  /** Heart rate is the readout — resting 52 BPM, 98 at full tension. */
  _beat(t) {
    const bpm = (T.heartBpm.base + this.tension * T.heartBpm.per) * this.timeScale;
    const period = 60 / bpm;
    if (this._nextBeat <= 0) this._nextBeat = t;
    let guard = 0;
    while (this._nextBeat < t + SCORE.heartLead && guard++ < 4) {
      const b = Math.max(this._nextBeat, t);
      const g = this.heartEnv.gain;
      const peak = SCORE.heartPeak * SCORE.trim;
      // Ramps, never steps: this env sits after the mood filter but its own
      // discontinuities would be broadband, and broadband is EARSHOT's band too.
      g.linearRampToValueAtTime(0, b);
      g.linearRampToValueAtTime(peak, b + SCORE.heartAttack);
      g.setTargetAtTime(0, b + SCORE.heartAttack, SCORE.heartDecay);
      const d = b + SCORE.heartDubDelay;
      g.linearRampToValueAtTime(peak * SCORE.heartDubScale, d + SCORE.heartAttack);
      g.setTargetAtTime(0, d + SCORE.heartAttack, SCORE.heartDecay);
      g.linearRampToValueAtTime(0, d + SCORE.heartDur);
      this._nextBeat = b + period;
    }
  }

  /** litFraction from the light field's own total. The director may override. */
  static litFractionOf(lightTotal) { return clamp01(lightTotal / SCORE.litGoal); }
}

export function createScore(actx, nodes, bus) { return new Score(actx, nodes, bus); }
