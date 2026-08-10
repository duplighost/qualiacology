// THE MIX IS THE MAP.
//
// In a game whose whole picture is a muzzle flash on black, the mix is not
// support — it is the second half of the map. This file owns the ONE fixed graph
// every sound in FLARE passes through, and the two structural decisions the mix
// law rests on:
//
//   1. A FIXED 4th-order 1.6 kHz LOWPASS on the whole sfx bus, and EARSHOT wired
//      POST-filter, direct to master. That is what makes "nothing but EARSHOT
//      lives in 2.5-5.5 kHz" achievable instead of aspirational. The draft's
//      "highpass" ladder put every shot inside EARSHOT's band; a 200 Hz highpass
//      does not make a shotgun chesty, it removes the chest (C2-F11).
//
//   2. EVERY node in this file is constructed once, at boot, and never again.
//      CONTRACT §4. The gate counts nodes at init and after a 2000-event storm
//      and fails if the number moved. `NodeFactory.seal()` turns any later
//      construction into a recorded violation rather than a silent leak.
//
// The graph:
//
//   sfxIn   ─ carve(400 Hz peak) ┐
//   bodyIn  ─ shelf(3.5 kHz)     ┴─ lpA ─ lpB ─ sfxGain ┐
//   musicIn ─ mood ─ duck ─ musicGain ─────────────────┴─ world ─ reflexLp ─┐
//   earshotIn ─ earshotGain ────────────────────────────────────────────────┴─ mix
//   mix ─ reflexGain ─ compressor ─ master ─ destination
//
// Note where the reflex LOWPASS is: on `world` only, never on EARSHOT. The
// auditory reflex drops a 900 Hz lowpass over the mix after 15 rounds in 3 s —
// putting a 3.2 kHz rear-threat ticker behind that filter would delete the rear
// channel during exactly the sustained fire it exists for. The broadband DIP
// does cover EARSHOT, because a level change preserves the balance the mix law
// is about; a spectral change does not. (Ruling recorded in docs/HANDOFF.md.)

import { FEEL } from '../feel.js';

const A = FEEL.audio;

export const BUS = Object.freeze({
  // A 4th-order Butterworth is two cascaded biquads whose section Qs are NOT
  // both 0.707. Two 0.707 sections sag ~6 dB at the corner and reach the
  // stopband slower, which is measured margin given away for nothing.
  butterQ: Object.freeze([0.54119610, 1.30656296]),

  bypassHz: 18000,          // "no filter" for a voice that must stay wideband
  schedulePad: 0.004,       // every envelope is scheduled at least this far ahead,
                            // so a connect() always lands before its own attack
  attackTau: 0.0015,
  releaseDiv: 3,            // setTargetAtTime reaches ~95% in 3 tau
  duckHold: 0.030,          // release starts this long after the duck attack
  moodQ: 0.70,
  bedQ: 0.60,
  reflexRestHz: 20000,      // "no lowpass"
  reflexAttackTau: 0.0040,
  reflexLpAttackTau: 0.0500,
  carveOutTau: 0.0300,
});

export const db2gain = db => Math.pow(10, db / 20);

/**
 * Every AudioNode in FLARE is minted here. Two reasons, both load-bearing:
 * the gate can count them, and `seal()` makes "the pool grew during a fight"
 * a recorded fact instead of a slow leak nobody notices until the frame rate
 * dies twenty minutes into a run.
 */
export class NodeFactory {
  constructor(actx) {
    this.actx = actx;
    this.count = 0;
    this.sealed = false;
    this.violations = [];
    this.byKind = new Map();
  }

  _mint(node, kind) {
    this.count++;
    this.byKind.set(kind, (this.byKind.get(kind) || 0) + 1);
    if (this.sealed) this.violations.push(kind);
    return node;
  }

  seal() { this.sealed = true; return this.count; }

  gain(v) { const n = this.actx.createGain(); n.gain.value = v; return this._mint(n, 'gain'); }

  filter(type, hz, q, gainDb) {
    const n = this.actx.createBiquadFilter();
    n.type = type;
    n.frequency.value = hz;
    if (q !== undefined) n.Q.value = q;
    if (gainDb !== undefined) n.gain.value = gainDb;
    return this._mint(n, 'filter');
  }

  osc(type, hz) {
    const n = this.actx.createOscillator();
    n.type = type;
    n.frequency.value = hz;
    return this._mint(n, 'osc');
  }

  source(buffer, loop) {
    const n = this.actx.createBufferSource();
    n.buffer = buffer;
    n.loop = !!loop;
    return this._mint(n, 'source');
  }

  panner() {
    const n = this.actx.createPanner();
    n.panningModel = 'HRTF';
    n.distanceModel = 'exponential';
    n.refDistance = A.earshot.refDist;
    n.rolloffFactor = A.earshot.rolloff;
    n.maxDistance = A.earshot.maxDistance;
    return this._mint(n, 'hrtf');
  }

  stereo(pan) {
    const n = this.actx.createStereoPanner();
    n.pan.value = pan || 0;
    return this._mint(n, 'stereo');
  }

  compressor() {
    const n = this.actx.createDynamicsCompressor();
    n.threshold.value = A.master.threshold;
    n.knee.value = A.master.knee;
    n.ratio.value = A.master.ratio;
    n.attack.value = A.master.attack;
    n.release.value = A.master.release;
    return this._mint(n, 'compressor');
  }
}

export class Bus {
  constructor(actx, nodes) {
    this.actx = actx;
    this.nodes = nodes;

    // --- master chain -------------------------------------------------------
    this.master = nodes.gain(A.master.gain);
    this.comp = nodes.compressor();
    this.reflexGain = nodes.gain(1);
    this.mix = nodes.gain(1);
    this.mix.connect(this.reflexGain);
    this.reflexGain.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(actx.destination);

    // --- the world (sfx + music) sits behind the reflex lowpass -------------
    this.reflexLp = nodes.filter('lowpass', BUS.reflexRestHz, BUS.butterQ[0]);
    this.world = nodes.gain(1);
    this.world.connect(this.reflexLp);
    this.reflexLp.connect(this.mix);

    // --- sfx: the fixed 4th-order 1.6 kHz lowpass ---------------------------
    this.sfxGain = nodes.gain(1);
    this.sfxLpB = nodes.filter('lowpass', A.sfxLowpassHz, BUS.butterQ[1]);
    this.sfxLpA = nodes.filter('lowpass', A.sfxLowpassHz, BUS.butterQ[0]);
    this.sfxLpA.connect(this.sfxLpB);
    this.sfxLpB.connect(this.sfxGain);
    this.sfxGain.connect(this.world);

    // Punch EQ, CINDERBLOOM §5.3: the 400 Hz carve is applied to everything
    // EXCEPT the shot's own body, so `bodyIn` is a second door into the same
    // lowpass that skips the carve and takes the +2 dB shelf instead. That one
    // split is the whole "reads as punch rather than loud" move.
    this.carve = nodes.filter('peaking', A.punch.carveHz, A.punch.carveQ, 0);
    this.sfxIn = nodes.gain(1);
    this.sfxIn.connect(this.carve);
    this.carve.connect(this.sfxLpA);

    this.shelf = nodes.filter('highshelf', A.punch.shelfHz, undefined, 0);
    this.bodyIn = nodes.gain(1);
    this.bodyIn.connect(this.shelf);
    this.shelf.connect(this.sfxLpA);

    // --- music: mood filter, band guard, then the sidechain duck ------------
    //
    // THE GUARD IS NOT OPTIONAL, and it is the one thing here that measurement
    // added to the design. The mood filter sweeps 700 -> 2600 Hz with the lit
    // fraction, and the bed filter opens to 2400 Hz at full tension — both are
    // 2nd-order, so in a fully lit chamber a 36.7 Hz sawtooth drone's harmonic
    // tail arrives in the 2.5-5.5 kHz pinna band essentially unattenuated.
    // Measured before this guard: the score ALONE sat 1.2 dB BELOW the EARSHOT
    // click in EARSHOT's own band — a total mix-law failure that hid only
    // because sustained fire ducks the music, i.e. it was inaudible in the test
    // and catastrophic in the one state EARSHOT exists for: standing still in
    // the dark, not shooting, listening.
    //
    // FEEL.md already ruled it: "weapons, creature voices, impacts AND THE BED
    // all live below 1.6 kHz". So the bed gets the same fixed 4th-order 1.6 kHz
    // corner the sfx bus has. The mood sweep survives intact — it does its work
    // from 700 Hz up to the ceiling, which is what a mood filter is for.
    this.musicGain = nodes.gain(0);
    this.musicDuck = nodes.gain(1);
    this.musicGuardB = nodes.filter('lowpass', A.sfxLowpassHz, BUS.butterQ[1]);
    this.musicGuardA = nodes.filter('lowpass', A.sfxLowpassHz, BUS.butterQ[0]);
    this.bedLp = nodes.filter('lowpass', FEEL.tension.moodLowpass.base, BUS.bedQ);
    this.mood = nodes.filter('lowpass', FEEL.tension.moodLowpass.base, BUS.moodQ);
    this.musicIn = nodes.gain(1);
    this.musicIn.connect(this.mood);
    this.mood.connect(this.bedLp);
    this.bedLp.connect(this.musicGuardA);
    this.musicGuardA.connect(this.musicGuardB);
    this.musicGuardB.connect(this.musicDuck);
    this.musicDuck.connect(this.musicGain);
    this.musicGain.connect(this.world);

    // --- EARSHOT: post-filter, direct to master -----------------------------
    this.earshotGain = nodes.gain(1);
    this.earshotIn = nodes.gain(1);
    this.earshotIn.connect(this.earshotGain);
    this.earshotGain.connect(this.mix);

    // reflex accumulator state (dB, <= 0)
    this._reflexDb = 0;
    this._reflexAt = 0;
    this._shotTimes = new Float64Array(A.reflex.burstCount * 2);
    this._shotHead = 0;
    this._shotCount = 0;
    this._lpOpen = true;
  }

  /** Everything is scheduled at least one graph mutation ahead of `now`. */
  at(when) {
    const now = this.actx.currentTime;
    const t = when === undefined ? now + BUS.schedulePad : when;
    return t < now + BUS.schedulePad ? now + BUS.schedulePad : t;
  }

  /**
   * The punch sidechain, fired once per player shot.
   * Duck music 5 dB, carve -4.5 dB at 400 Hz out of everything but the body,
   * lift the body +2 dB at 3.5 kHz.
   */
  punch(when) {
    const t = this.at(when);
    const p = A.punch;

    const duck = db2gain(-p.duckDb);
    this.musicDuck.gain.cancelScheduledValues(t);
    this.musicDuck.gain.setTargetAtTime(duck, t, p.duckAtk / BUS.releaseDiv);
    this.musicDuck.gain.setTargetAtTime(1, t + BUS.duckHold, p.duckRel / BUS.releaseDiv);

    this.carve.gain.cancelScheduledValues(t);
    this.carve.gain.setTargetAtTime(p.carveDb, t, p.duckAtk / BUS.releaseDiv);
    this.carve.gain.setTargetAtTime(0, t + p.carveMs, BUS.carveOutTau);

    this.shelf.gain.cancelScheduledValues(t);
    this.shelf.gain.setTargetAtTime(p.shelfDb, t, p.duckAtk / BUS.releaseDiv);
    this.shelf.gain.setTargetAtTime(0, t + p.carveMs, BUS.carveOutTau);
  }

  /**
   * The auditory reflex: -2.5 dB broadband 12 ms after each shot recovering over
   * 200 ms, accumulating to a -6 dB floor, plus a 900 Hz lowpass above 15 rounds
   * in 3 s. Free tinnitus — the mix behaving like an ear, so the moment after a
   * firefight when the world comes back is something you built rather than
   * something you sampled.
   */
  reflex(when) {
    const r = A.reflex;
    const t = this.at(when);

    const gap = Math.max(0, t - this._reflexAt);
    const decayed = this._reflexDb * Math.exp(-gap / (r.recoverMs / 1000));
    this._reflexDb = Math.max(r.accumDb, decayed + r.db);
    this._reflexAt = t;

    const delay = r.delayMs / 1000;
    this.reflexGain.gain.cancelScheduledValues(t);
    this.reflexGain.gain.setTargetAtTime(db2gain(this._reflexDb), t + delay, BUS.reflexAttackTau);
    this.reflexGain.gain.setTargetAtTime(1, t + delay + BUS.duckHold, (r.recoverMs / 1000) / BUS.releaseDiv);

    // Rolling window of shot times, fixed-size, no allocation.
    this._shotTimes[this._shotHead] = t;
    this._shotHead = (this._shotHead + 1) % this._shotTimes.length;
    this._shotCount++;

    let inWindow = 0;
    for (let i = 0; i < this._shotTimes.length; i++) {
      const s = this._shotTimes[i];
      if (s > 0 && t - s <= r.burstWindow) inWindow++;
    }

    if (inWindow >= r.burstCount) {
      if (this._lpOpen) {
        this.reflexLp.frequency.cancelScheduledValues(t);
        this._lpOpen = false;
      }
      this.reflexLp.frequency.setTargetAtTime(r.lowpassHz, t, BUS.reflexLpAttackTau);
    } else if (!this._lpOpen) {
      this._lpOpen = true;
      this.reflexLp.frequency.cancelScheduledValues(t);
      this.reflexLp.frequency.setTargetAtTime(BUS.reflexRestHz, t, r.lowpassRelease / BUS.releaseDiv);
    }
  }

  /** The one progress readout the iris cannot cancel: the room opens the score. */
  setMood(hz, when) {
    const t = this.at(when);
    this.mood.frequency.setTargetAtTime(hz, t, FEEL.tension.moodLowpass.tau);
  }

  /** Tension darkens the bed: colour + t^2 * 1500 Hz. */
  setBed(hz, when) {
    const t = this.at(when);
    this.bedLp.frequency.setTargetAtTime(hz, t, FEEL.tension.moodLowpass.tau);
  }

  setMusicLevel(g, tau, when) {
    const t = this.at(when);
    this.musicGain.gain.setTargetAtTime(g, t, tau);
  }

  get reflexDb() { return this._reflexDb; }
  get shotsCounted() { return this._shotCount; }

  dispose() {
    try { this.master.disconnect(); } catch { /* already gone */ }
  }
}

export function createBus(actx, nodes) { return new Bus(actx, nodes); }
