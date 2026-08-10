// THE VOICE POOL — allocated at boot, never grown.
//
// C2-F12 killed the draft's "mint a PannerNode per sound": 14 enemies x 2 stems
// plus 8 EARSHOT voices against a 16-panner cap is arithmetically impossible,
// and an HRTF panner is a convolution, not a knob. So the pool is fixed and
// classed:
//
//   8 HRTF  EARSHOT          — the rear channel never loses a slot
//   6 HRTF  identity stems   — the nearest six enemies, "what and where it is"
//   8 HRTF  transients       — impacts, deaths, spawns; recycled oldest-first
//   everything else equalpower — near-pressure stems (inside ~6 m ITD dominates
//                                and HRTF buys nothing), the crowd bus, and the
//                                PLAYER'S OWN GUN.
//
// That last one is the important line. The player's gun originates AT the
// listener, so HRTF there is both meaningless and numerically unstable — and a
// 720 rpm weapon with a 1.5 s panner life would eat ~20 HRTF slots by itself and
// starve EARSHOT during exactly the firefights EARSHOT exists for.
// Total HRTF panners: 8 + 6 + 8 = 22, which is the documented ceiling.
//
// ZERO CONSTRUCTION AFTER BOOT. A Web Audio source can only be start()ed once,
// so a "pool of AudioBufferSourceNodes" is a contradiction. Every voice here
// instead owns a source that runs FOREVER — a looping read of the one 1-second
// noise buffer, a looping stem, or a free-running oscillator — and a sound is an
// ENVELOPE on that source, not a new node. Idle voices disconnect their source
// from their own chain (a graph edge, not an allocation) so Chrome can skip the
// panner: an OscillatorNode never reports silence, so a permanently connected
// idle voice would convolve HRTF forever for nothing.

import { FEEL } from '../feel.js';
import { clamp } from '../core/math.js';
import { BUS } from './bus.js';

const A = FEEL.audio;

export const VOICES = Object.freeze({
  noiseSeconds: 1.0,          // ONE buffer. Every noise in the game reads it.
  noiseReaders: 6,            // ...at six different offsets, drifting apart, so
  readerDrift: 0.004,         // consecutive shots never phase-lock into a drone
  stemSeconds: 2.4,
  pressureSeconds: 1.1,
  loopFade: 0.040,            // seam crossfade for the tonal loops

  pool: Object.freeze({
    pressure: 4,              // equalpower by design: inside ~6 m ITD dominates
    flat: 6,                  // overflow / ambience / non-positional
    gun: 12,                  // click, tail and sub layers of the own-weapon shot
    gunBody: 6,               // the body layer only — it enters the bus past the carve
    crowd: 1,                 // >8 alive: far stems collapse to one centroid voice
  }),

  stealFade: 0.004,           // a stolen voice fades out rather than clicking
  tailFade: 0.003,            // ...and so does the end of every envelope. The env
                              // gain sits AFTER the weapon ladder, so a hard step
                              // to zero from the decay's residual is a broadband
                              // click that skips the ladder entirely and lands in
                              // EARSHOT's band. Measured: 6 dB of mix-law margin.
  releasePad: 0.120,          // filters ring after the envelope closes
  holdEpsilon: 0.004,         // a stem level that has not moved is not rescheduled

  // The two procedural stems, written as partials rather than as samples. Both
  // sit entirely below 1.6 kHz by construction — the MIX LAW is not something
  // the creature voices are allowed to negotiate with.
  stem: Object.freeze({ p1: 92, p2: 138, fm: 3.1, fmDepth: 0.6, breatheHz: 0.42, level: 0.5 }),
  pressure: Object.freeze({ hz: 61, fm: 7.3, fmDepth: 1.4, gateHz: 3.6, gateDuty: 0.7, floor: 0.35, level: 0.45 }),
});

/** A deterministic 1-second noise buffer. CONTRACT §3: never Math.random(). */
export function bakeNoise(actx, rng, seconds) {
  const n = Math.max(1, Math.round(actx.sampleRate * seconds));
  const buf = actx.createBuffer(1, n, actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = rng.next() * 2 - 1;
  return buf;
}

/**
 * A looping buffer baked from a closure over time-in-seconds, with the seam
 * crossfaded so the loop has no click. BEHIND YOU solved this in one line and
 * the whole soundscape there is ~60 lines and zero bytes of assets.
 */
export function bakeLoop(actx, seconds, sampler) {
  const sr = actx.sampleRate;
  const n = Math.max(1, Math.round(sr * seconds));
  const fade = Math.min(n >> 1, Math.round(sr * VOICES.loopFade));
  const buf = actx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = sampler(i / sr);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    const tail = sampler((n + i) / sr);
    d[i] = d[i] * t + tail * (1 - t);
  }
  return buf;
}

/**
 * One voice. Its shape is fixed at construction:
 *
 *   src ─ srcGain ─┐
 *                  ├─ [fA ─ fB] ─ env ─ pan ─ out
 *   osc ─ oscGain ─┘
 *
 * `play()` is only ever parameter automation on that shape.
 */
class Voice {
  constructor(nodes, spec, out, reader) {
    this.kind = spec.kind;
    this.hrtf = !!spec.hrtf;
    this.busyUntil = 0;
    this.armed = false;
    this.stolen = false;
    this.held = false;
    this.heldLevel = 0;
    this.claim = 0;

    this.pan = spec.hrtf ? nodes.panner() : nodes.stereo(0);
    this.env = nodes.gain(0);
    this.env.connect(this.pan);
    this.pan.connect(out);

    let head = this.env;
    if (spec.filters) {
      this.fB = nodes.filter('lowpass', BUS.bypassHz, BUS.butterQ[1]);
      this.fA = nodes.filter('lowpass', BUS.bypassHz, BUS.butterQ[0]);
      this.fA.connect(this.fB);
      this.fB.connect(this.env);
      head = this.fA;
    } else {
      this.fA = null;
      this.fB = null;
    }
    this.head = head;

    // The noise tap reads a shared, permanently looping reader — no per-voice
    // buffer source, no per-shot allocation, and a different offset per voice.
    // srcGain->head is connected by arm(), not here: a running source feeding a
    // gain of 0 still counts as signal, and Chrome would convolve the HRTF
    // panner behind it forever.
    if (spec.noise) {
      this.srcGain = nodes.gain(0);
      this.src = reader;             // shared; never disconnected
      this.ownsSrc = false;
    } else if (spec.loop) {
      this.src = nodes.source(spec.loop, true);
      this.srcGain = nodes.gain(0);
      this.src.connect(this.srcGain);
      this.ownsSrc = true;
    } else {
      this.src = null;
      this.srcGain = null;
      this.ownsSrc = false;
    }

    if (spec.osc) {
      this.osc = nodes.osc('sine', A.earshot.hz);
      this.oscGain = nodes.gain(0);
      this.osc.connect(this.oscGain);
    } else {
      this.osc = null;
      this.oscGain = null;
    }
  }

  start(when) {
    if (this.ownsSrc) this.src.start(when);
    if (this.osc) this.osc.start(when);
  }

  /** Connect the gated taps. A graph edge, never an allocation. */
  arm() {
    if (this.armed) return;
    this.armed = true;
    if (this.oscGain) this.oscGain.connect(this.head);
    if (this.srcGain) this.srcGain.connect(this.head);
  }

  idle() {
    if (!this.armed) return;
    this.armed = false;
    if (this.oscGain) { try { this.oscGain.disconnect(this.head); } catch { /* not connected */ } }
    if (this.srcGain) { try { this.srcGain.disconnect(this.head); } catch { /* not connected */ } }
  }

  setPosition(x, y, z) {
    const p = this.pan;
    if (p.positionX) {
      p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
    } else if (p.setPosition) {
      p.setPosition(x, y, z);
    }
  }

  setPan(v) { if (this.pan.pan) this.pan.pan.value = clamp(v, -1, 1); }

  setFilter(hz) {
    if (!this.fA) return;
    this.fA.frequency.value = hz;
    this.fB.frequency.value = hz;
  }

  setRate(r) {
    if (this.ownsSrc && this.src.playbackRate) this.src.playbackRate.value = r;
  }
}

// The one shot spec, reused. CONTRACT §4 — the hot path allocates nothing, and
// "nothing" includes the little options object that looks free until you are
// emitting four layers twelve times a second.
const S = {
  when: 0, peak: 1, attack: 0.002, dur: 0.12, decay: 0.030,
  noise: 0, tone: 0, toneType: 'sine', toneHz: 0, toneEnd: 0, glide: 0.040,
  filterHz: 0, rate: 1,
};

export class VoicePool {
  constructor(actx, nodes, bus, rng) {
    this.actx = actx;
    this.nodes = nodes;
    this.bus = bus;
    this.rng = rng;
    this.pools = new Map();
    this.hrtfCount = 0;
    this.stereoCount = 0;
    this._claim = 0;

    const noiseRng = rng.fork('noise');
    this.noiseBuffer = bakeNoise(actx, noiseRng, VOICES.noiseSeconds);

    // Identity and pressure stems. One buffer each: per-archetype identity is
    // playbackRate (FEEL.enemies[*].voice), which is what makes a WARDEN at 0.55
    // and a RUNNER at 1.70 the same creature heard through different bodies.
    this.stemBuffer = bakeLoop(actx, VOICES.stemSeconds, t => stemSample(t));
    this.pressureBuffer = bakeLoop(actx, VOICES.pressureSeconds, t => pressureSample(t));

    // The readers: one buffer, six offsets, six slightly different rates so they
    // drift apart forever instead of re-correlating into a machine-gun buzz.
    this.readers = [];
    for (let i = 0; i < VOICES.noiseReaders; i++) {
      const src = nodes.source(this.noiseBuffer, true);
      src.playbackRate.value = 1 + (i - (VOICES.noiseReaders - 1) / 2) * VOICES.readerDrift;
      this.readers.push(src);
    }

    this._build('earshot', A.voices.earshot, { hrtf: true, osc: true, filters: 0 }, bus.earshotIn);
    this._build('identity', A.voices.identity, { hrtf: true, loop: this.stemBuffer, filters: 2 }, bus.sfxIn);
    this._build('transient', A.voices.transient, { hrtf: true, noise: true, osc: true, filters: 2 }, bus.sfxIn);
    this._build('pressure', VOICES.pool.pressure, { loop: this.pressureBuffer, filters: 2 }, bus.sfxIn);
    this._build('flat', VOICES.pool.flat, { noise: true, osc: true, filters: 2 }, bus.sfxIn);
    this._build('gun', VOICES.pool.gun, { noise: true, osc: true, filters: 2 }, bus.sfxIn);
    this._build('gunBody', VOICES.pool.gunBody, { noise: true, osc: true, filters: 2 }, bus.bodyIn);
    this._build('crowd', VOICES.pool.crowd, { loop: this.stemBuffer, filters: 2 }, bus.sfxIn);
  }

  _build(kind, count, spec, out) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const reader = spec.noise ? this.readers[i % this.readers.length] : null;
      const v = new Voice(this.nodes, { kind, ...spec }, out, reader);
      if (spec.noise) reader.connect(v.srcGain);
      if (spec.hrtf) this.hrtfCount++; else this.stereoCount++;
      list.push(v);
    }
    this.pools.set(kind, list);
  }

  /** Sources run for the life of the context; nothing is ever start()ed twice. */
  startAll(when) {
    const t = when === undefined ? 0 : when;
    for (const r of this.readers) r.start(t);
    for (const list of this.pools.values()) for (const v of list) v.start(t);
  }

  /**
   * Take the least-recently-needed voice of a class. Never grows, never
   * allocates. A voice that was still sounding is marked stolen so `_apply`
   * pays a 4 ms de-click for it — and only for it.
   */
  take(kind, when) {
    const list = this.pools.get(kind);
    if (!list) return null;
    let best = list[0];
    for (let i = 1; i < list.length; i++) if (list[i].busyUntil < best.busyUntil) best = list[i];
    best.stolen = best.busyUntil > when;
    best.claim = ++this._claim;
    best.arm();
    return best;
  }

  /** Fill-and-forget spec. Reset every field; never allocate a new one. */
  spec() {
    S.when = 0; S.peak = 1; S.attack = 0.002; S.dur = 0.12; S.decay = 0.030;
    S.noise = 0; S.tone = 0; S.toneType = 'sine'; S.toneHz = 0; S.toneEnd = 0; S.glide = 0.040;
    S.filterHz = 0; S.rate = 1;
    return S;
  }

  /**
   * THE positional path. Everything in the world goes through here — in the
   * dark, an unpanned explosion is a lie about where the room is.
   */
  playAt(kind, x, y, z, s) {
    const v = this.take(kind, this.bus.at(s.when));
    if (!v) return null;
    v.setPosition(x, y, z);
    return this._apply(v, s);
  }

  /**
   * The scalar path — a cheap StereoPanner instead of an HRTF convolution.
   * ALLOWLIST: the player's own weapon (it originates at the listener, where
   * HRTF is meaningless and numerically unstable) and UI. Nothing else may call
   * this, and tests/audio.mjs greps for it.
   */
  playFlat(kind, pan, s) {
    const v = this.take(kind, this.bus.at(s.when));
    if (!v) return null;
    v.setPan(pan);
    return this._apply(v, s);
  }

  _apply(v, s) {
    const t = this.bus.at(s.when);
    const g = v.env.gain;

    v.setFilter(s.filterHz > 0 ? s.filterHz : BUS.bypassHz);
    v.setRate(s.rate);

    if (v.srcGain) v.srcGain.gain.setValueAtTime(s.noise, t);
    if (v.oscGain) v.oscGain.gain.setValueAtTime(s.tone, t);
    if (v.osc && s.tone > 0) {
      v.osc.type = s.toneType;
      v.osc.frequency.cancelScheduledValues(t);
      v.osc.frequency.setValueAtTime(s.toneHz, t);
      if (s.toneEnd > 0) v.osc.frequency.exponentialRampToValueAtTime(s.toneEnd, t + s.glide);
    }

    let t0 = t;
    if (v.stolen) {
      // Only a stolen voice pays the de-click, so the common case keeps its
      // sub-frame scheduling accuracy.
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else g.cancelScheduledValues(t);
      g.linearRampToValueAtTime(0, t + VOICES.stealFade);
      t0 = t + VOICES.stealFade;
    } else {
      g.cancelScheduledValues(t);
      g.setValueAtTime(0, t);
    }

    g.linearRampToValueAtTime(s.peak, t0 + s.attack);
    g.setTargetAtTime(0, t0 + s.attack, s.decay);
    const tEnd = t0 + s.attack + s.dur;
    // setTargetAtTime never actually reaches zero, so the envelope must be
    // closed explicitly — but as a RAMP, never a step. See VOICES.tailFade.
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(Math.max(t0 + s.attack, tEnd - VOICES.tailFade));
    g.linearRampToValueAtTime(0, tEnd);
    v.busyUntil = tEnd;
    v.stolen = false;
    return v;
  }

  /**
   * A held loop (an enemy stem) — no envelope close, held until released.
   * Re-scheduling an unchanged target every frame would push ~1300 automation
   * events a second into the timeline for nothing, so a hold that has not moved
   * is a no-op.
   */
  hold(v, level, when, tau) {
    v.arm();
    if (v.held && Math.abs(level - v.heldLevel) < VOICES.holdEpsilon) { v.busyUntil = Infinity; return; }
    const t = this.bus.at(when);
    if (v.srcGain && !v.held) v.srcGain.gain.setValueAtTime(1, t);
    v.env.gain.setTargetAtTime(level, t, tau);
    v.held = true;
    v.heldLevel = level;
    v.busyUntil = Infinity;
  }

  release(v, when, tau) {
    if (!v.held) return;
    const t = this.bus.at(when);
    v.env.gain.setTargetAtTime(0, t, tau);
    v.held = false;
    v.heldLevel = 0;
    v.busyUntil = t + tau * BUS.releaseDiv;
  }

  /** Hand back voices whose envelope and filter ring are both finished. */
  sweep(now) {
    for (const list of this.pools.values()) {
      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        if (v.armed && v.busyUntil + VOICES.releasePad < now) v.idle();
      }
    }
  }

  liveCount(now) {
    let n = 0;
    for (const list of this.pools.values()) for (const v of list) if (v.busyUntil > now) n++;
    return n;
  }

  count(kind) { const l = this.pools.get(kind); return l ? l.length : 0; }

  dispose() {
    for (const list of this.pools.values()) for (const v of list) {
      try { v.idle(); v.pan.disconnect(); } catch { /* already gone */ }
    }
  }
}

// --- the two procedural stems ----------------------------------------------
// Both live entirely below 1.6 kHz by construction (see the MIX LAW): the
// identity stem is a slow two-partial hum with a breathing amplitude, the
// pressure stem is a faster rasp. Neither is a sample; both are five lines.

const TAU = Math.PI * 2;

function stemSample(t) {
  const s = VOICES.stem;
  const base = Math.sin(t * TAU * s.p1) * 0.55
    + Math.sin(t * TAU * s.p2 + Math.sin(t * s.fm) * s.fmDepth) * 0.3;
  const breath = 0.55 + 0.45 * Math.sin(t * TAU * s.breatheHz);
  return base * breath * s.level;
}

function pressureSample(t) {
  const p = VOICES.pressure;
  const grind = Math.sin(t * TAU * p.hz + Math.sin(t * TAU * p.fm) * p.fmDepth);
  const gate = Math.sin(t * TAU * p.gateHz) > p.gateDuty ? 1 : p.floor;
  return grind * gate * p.level;
}

export function createVoicePool(actx, nodes, bus, rng) { return new VoicePool(actx, nodes, bus, rng); }
