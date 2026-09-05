// CURFEW — the ambient bed, and SUBTRACTION. Owner: audio.
//
// This is Alex's own horror law, written in his own design document for OFF-SEASON:
//
//   "The horror is subtraction, not addition... Dread is produced by removing things:
//    sounds, people, light, colour."
//   "insects cut mid-loop on Day 6 — mid-loop, AUDIBLY, once, while the player is outdoors."
//   "then the footsteps' reverb tail shortens, as if the world got smaller."
//   "The bell is the one ADDED sound in the back half. Added sound reads as grace precisely
//    because the mix taught the player that subtraction is the law."
//   donor: donors/offseason/README.md:235-242
//
// So the rules this file is built to keep, in order of how badly it goes if one is broken:
//
//  1. A CUT MUST BE AUDIBLE. A stem is cut MID-PHRASE — gain to zero on a setValueAtTime and
//     the source stopped on the same instant — and never faded. The cut IS the event. A
//     faded stem is a stem nobody noticed leaving, and then the silence it left reads as the
//     game being broken rather than as the world being emptied.
//  2. NO UN-AUTHORED SILENCE LONGER THAN 45 s. Authored silence (the Hush, the beat after a
//     kill) is a held breath; un-authored silence is a bug report. A watchdog counts and
//     answers at 40 s from whatever stems are still alive.
//  3. CRICKETS NEVER REACH ZERO WITHOUT A PRESSURE EVENT (the pacing law). If the crickets
//     stop, something is coming, every single time, so the player can trust their ears.
//  4. A CLAIMED REGION GETS EXACTLY ONE STEM BACK. One. More than one and the return is a
//     restoration; exactly one and it is grace.
//  5. THERE IS NO MUSIC IN THE COUNTY. The car radio is the only non-diegetic-sounding thing
//     out there and it is diegetic — it comes out of a dashboard, band-limited to 300-3400 Hz,
//     and it stops when you leave the car. ROUND 13: the pause card is outside the county. Its
//     piece (pause.js) plays only while the game is stopped and the card is up, on its own bus
//     above the mute, and it stops when the card goes.
//
// TWELVE STEMS: wind, insects, crickets, owl, frogs, farDog, traffic, worksHum, rain, canopy,
// radio, stepTail. Everything is synthesised — there is no audio file in this project.
//
// donor: fetch/src/audio.js:18-38 (the per-zone bed rack: one row of stem levels plus a
//   reverb character per zone, crossfaded rather than swapped).
// donor: eaten-path/src/audio.js:346-399 (the wandering wind target, the cricket density
//   accumulator that thins with depth, and the owl's 22-70 s re-arm).
// donor: cinderbloom/src/audio/audio.js:2112-2130 (loop -> tone -> occlusion LP -> LFO gain
//   emitter chain shape).

import { CFG } from '../config.js';
import { clamp, clamp01, lerp } from '../engine/math.js';
import {
  noiseFill, pinkFill, brownFill, biquad, biquadSweep, envAD, fadeOut,
  damped, sweepSine, grains, normalizeTo, mixInto, toAudioBuffer,
  CUE_THREAT, CUE_WORLD, CUE_FLAVOUR,
} from './audio.js';

/* --------------------------------------------------------------------------
   Numbers this file owns. CFG has no bed block; a request for CFG.audio.bed is
   filed in docs/HANDOFF.md and these locals are the interim home. Each one is
   either DESIGN's or OFF-SEASON's, cited.
   -------------------------------------------------------------------------- */

const TRAFFIC_DIES_M = 60;        // [DESIGN 5] "traffic dies at 60 m off the loop road"
const TRAFFIC_RETURNS_M = 44;     // hysteresis; a stem must not chatter on the boundary
const INSECT_TENSION = 0.50;      // [DESIGN 5] "insects cut mid-loop once when tension crosses 0.5"
const OWL_TENSION = 0.62;
const CANOPY_TENSION = 0.72;
const CANOPY_OFFROAD_M = 90;
const CRICKET_TENSION = 0.80;     // and only with a pressure event in the same breath
const DUSK_CUT_AT = 0.75;         // "gone before dusk ends" — three quarters through dusk
const TAIL_AFTER_CUTS = 5;        // the LAST subtraction, once five others have gone
const CUT_GAP_S = 8;              // one cut at a time; two in a second is not two events
const TAIL_SHORT = 0.34;          // the world got smaller
const MAX_SILENCE_S = 45;         // the law
const SILENCE_ANSWER_S = 40;      // answer before the law is broken, not after
const HUSH_R = 20;                // the Hush sphere's outer radius [DESIGN 5]

// The order a claimed region gives one back. Most-missed first — the crickets
// are the sound of the county being alive and they are the first thing anyone
// notices leaving.
const GRACE_ORDER = ['crickets', 'insects', 'frogs', 'owl', 'farDog', 'canopy', 'traffic', 'stepTail'];

// The twelve. `loop` stems run a permanent BufferSource; `event` stems are
// scheduled one-shots with their own re-arm timer; `virtual` is stepTail, which
// is a property of the reverb rather than a sound of its own.
const STEMS = [
  { key: 'wind', kind: 'loop', gain: 0.11, bus: 'world', permanent: true },
  { key: 'canopy', kind: 'loop', gain: 0.085, bus: 'world' },
  { key: 'traffic', kind: 'loop', gain: 0.055, bus: 'world' },
  { key: 'worksHum', kind: 'loop', gain: 0.05, bus: 'world', permanent: true },
  { key: 'rain', kind: 'loop', gain: 0.0, bus: 'world' },
  { key: 'insects', kind: 'loop', gain: 0.07, bus: 'world' },
  { key: 'radio', kind: 'loop', gain: 0.0, bus: 'world' },
  { key: 'crickets', kind: 'event', gain: 0.55, bus: 'world' },
  { key: 'owl', kind: 'event', gain: 0.7, bus: 'world' },
  { key: 'frogs', kind: 'event', gain: 0.5, bus: 'world' },
  { key: 'farDog', kind: 'event', gain: 0.6, bus: 'world' },
  { key: 'stepTail', kind: 'virtual', gain: 1, bus: 'world' },
];

export class Bed {
  constructor(ctx, audio) {
    this.ctx = ctx;
    this.A = audio;
    this.rng = ctx.rng.fork('ambient');
    this.rngStep = ctx.rng.fork('ambient:step');

    this.stem = Object.create(null);
    for (let i = 0; i < STEMS.length; i++) {
      const d = STEMS[i];
      this.stem[d.key] = {
        key: d.key, kind: d.kind, base: d.gain, bus: d.bus, permanent: !!d.permanent,
        alive: true, node: null, src: null, level: 0, target: 0,
        next: 0, voice: null, cutAt: -1, restoredAt: -1,
      };
    }

    this.cutCount = 0;
    this.cutLog = [];             // { key, t, why } — the pacing test reads this
    this.graceLog = [];
    this._tail = 1;
    this._inCar = false;
    this._hushUntil = 0;          // authored silence: the watchdog holds its breath
    this._quiet = 0;              // seconds since the last audible ambient event
    this._windT = 0; this._windTarget = 0.11;
    this._cricketAcc = 0;
    // THE PHASE VOCABULARY IS EXACTLY 'dusk' | 'night' | 'black' | 'dawn'.
    // There is no alias table here and there must never be one again: a
    // vocabulary that works by accident of which file reads which spelling is a
    // bug waiting for the next edit, and this file had three of them.
    this._phase = 'night'; this._phaseT = 0;
    this._offRoad = 0; this._region = 'pines'; this._inHush = false;
    this._started = false;
    this._radioSong = 0;
    this._pressure = false;          // armed by a dread stinger; gates the cricket cut
    this._trafficByDistance = false; // the one stem whose cut is geometry, not dread
    this.tension = 0;
    this._lastCutT = -1e9;
    this._px = 0; this._py = CFG.player.EYE; this._pz = 0;
    // The MIMIC beat is your own footstep, one beat late and 2.3 m behind you.
    // It only lands if it is literally the buffer your last step used — a
    // generic step behind you is a stranger, and a stranger is a different and
    // much weaker idea. audio.dread('mimic', ...) reads this.
    this._lastStep = 'step_duff0';
    this._lastStepRate = 1;
  }

  // The bed is band-limited: the highest content anywhere in it is the insect
  // shimmer at 5.6 kHz and the cricket chirp at 4.3 kHz. Baking at half the
  // device rate halves the bake and halves the memory, and an AudioBuffer
  // carries its own rate so the browser resamples it for free.
  get sr() { return Math.max(16000, Math.round(this.A.sr / 2)); }

  /* ---------------------------------------------------------------- bake -- */

  bake() {
    const A = this.A, sr = this.sr;
    const r = this.ctx.rng.fork('ambient:bake');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);
    // every buffer this function makes carries the HALF rate, not the device rate
    const reg = (n, ch) => A.reg(n, ch, sr);

    /**
     * A seamless loop: build 1.5x the length, then crossfade the overhang back
     * over the head. Without this every stem clicks once a cycle, and a click
     * once every six seconds is the most fatiguing sound a game can make.
     */
    const loopify = (b, xfadeSec) => {
      const x = Math.min(Math.round(xfadeSec * sr), (b.length / 3) | 0);
      const n = b.length - x;
      const out = new Float32Array(n);
      out.set(b.subarray(0, n));
      for (let i = 0; i < x; i++) {
        const t = i / x;
        out[i] = out[i] * t + b[n + i] * (1 - t);
      }
      return out;
    };

    // ---- WIND: brown noise with a wandering bandpass. The only stem that never
    //      goes. It is what is left when everything else has been taken.
    {
      const ch = [];
      for (let c = 0; c < 2; c++) {
        const b = new Float32Array(N(7.5));
        brownFill(b, rn, 1);
        biquad(b, sr, 'bp', 220 * (c ? 1.08 : 0.93), 0.45);
        biquad(b, sr, 'lp', 900, 0.6);
        // gusts: a slow amplitude field, three incommensurate rates so it never
        // repeats inside the loop
        for (let i = 0; i < b.length; i++) {
          const t = i / sr;
          const g = 0.55
            + 0.26 * Math.sin(t * 0.41 + c * 1.3)
            + 0.13 * Math.sin(t * 0.97 + 2.1)
            + 0.06 * Math.sin(t * 2.31 + 0.7);
          b[i] *= g;
        }
        ch.push(normalizeTo(loopify(b, 0.9), 0.85));
      }
      A.buf.stem_wind = toAudioBuffer(A.actx, ch, sr);
    }

    // ---- CANOPY: needles and leaves over your head. High, dry, directionless.
    {
      const ch = [];
      for (let c = 0; c < 2; c++) {
        const b = new Float32Array(N(5.5));
        noiseFill(b, rn, 0.5);
        biquad(b, sr, 'hp', 1800 * (c ? 1.05 : 0.95), 0.7);
        biquad(b, sr, 'lp', 7000, 0.6);
        for (let i = 0; i < b.length; i++) {
          const t = i / sr;
          b[i] *= 0.35 + 0.5 * Math.abs(Math.sin(t * 0.33 + c)) + 0.15 * Math.sin(t * 1.7);
        }
        // a few individual leaves letting go
        grains(b, sr, rn, { count: 22, from: 0.2, span: 5.0, len: [0.004, 0.016], hp: 2200, lp: 9000, amp: 0.22, decay: 0 });
        ch.push(normalizeTo(loopify(b, 0.7), 0.7));
      }
      A.buf.stem_canopy = toAudioBuffer(A.actx, ch, sr);
    }

    // ---- TRAFFIC: the loop road, two miles off, heard as a low moving hiss.
    //      This is the sound of other people existing.
    {
      const b = new Float32Array(N(6.0));
      pinkFill(b, rn, 1);
      biquad(b, sr, 'lp', 480, 0.7, 0, 2);
      biquad(b, sr, 'hp', 70, 0.7);
      // three passes, each a slow swell — a car going by at a distance
      for (let p = 0; p < 3; p++) {
        const at = 0.4 + p * 1.9, w = 0.9 + rn() * 0.6;
        const s0 = Math.round(at * sr), s1 = Math.round((at + w) * sr);
        for (let i = s0; i < s1 && i < b.length; i++) {
          const u = (i - s0) / (s1 - s0);
          b[i] *= 1 + 2.4 * Math.sin(u * Math.PI);
        }
      }
      A.buf.stem_traffic = toAudioBuffer(A.actx, [normalizeTo(loopify(b, 0.8), 0.6)], sr);
    }

    // ---- WORKS HUM: the sub-bass that is always there and is only FELT once
    //      everything else has gone. OFF-SEASON's Station hum, exactly.
    {
      const b = new Float32Array(N(4.0));
      sweepSine(b, sr, 51, 51, 0.01, 1e6, 0.6);
      sweepSine(b, sr, 102, 102, 0.01, 1e6, 0.18);
      sweepSine(b, sr, 153.3, 153.3, 0.01, 1e6, 0.07);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'lp', 220, 0.7, 0, 2);
      mixInto(b, n, 0.22);
      for (let i = 0; i < b.length; i++) b[i] *= 0.9 + 0.1 * Math.sin(i / sr * 0.7);
      A.buf.stem_worksHum = toAudioBuffer(A.actx, [normalizeTo(loopify(b, 0.5), 0.8)], sr);
    }

    // ---- RAIN
    {
      const ch = [];
      for (let c = 0; c < 2; c++) {
        const b = new Float32Array(N(4.5));
        noiseFill(b, rn, 0.6);
        biquad(b, sr, 'bp', 2400 * (c ? 1.04 : 0.96), 0.5);
        biquad(b, sr, 'hp', 400, 0.7);
        grains(b, sr, rn, { count: 160, from: 0, span: 4.4, len: [0.0008, 0.003], hp: 1800, lp: 11000, amp: 0.30, decay: 0 });
        ch.push(normalizeTo(loopify(b, 0.4), 0.75));
      }
      A.buf.stem_rain = toAudioBuffer(A.actx, ch, sr);
    }

    // ---- INSECTS: the continuous high shimmer, distinct from the crickets'
    //      discrete chirps. This is the one that cuts mid-phrase at tension 0.5.
    {
      const b = new Float32Array(N(4.0));
      noiseFill(b, rn, 0.4);
      biquad(b, sr, 'bp', 5600, 6.0);
      biquad(b, sr, 'bp', 5600, 6.0);
      for (let i = 0; i < b.length; i++) {
        const t = i / sr;
        b[i] *= 0.6 + 0.4 * Math.sin(t * 41.3) * Math.sin(t * 0.83);
      }
      A.buf.stem_insects = toAudioBuffer(A.actx, [normalizeTo(loopify(b, 0.35), 0.55)], sr);
    }

    // ---- THE CAR RADIO. The only music in the county, and it comes out of a
    //      dashboard: band-limited 300-3400 Hz, carrier hiss, a little clipping.
    //      Three "songs", deterministic, chosen by which car you are in.
    for (let song = 0; song < 3; song++) {
      const rs = this.ctx.rng.fork('radio:' + song);
      const rr = () => rs.next();
      const dur = 9.0;
      const b = new Float32Array(N(dur));
      // a slow minor-ish figure, one note every 0.75 s, plus a held drone
      const SCALE = [0, 3, 5, 7, 10, 12, 15];
      const root = 146.83 * (song === 1 ? 1.122 : song === 2 ? 0.891 : 1);   // D3-ish
      sweepSine(b, sr, root * 0.5, root * 0.5, 0.01, 1e6, 0.10);
      let last = 3;
      for (let n = 0; n < 12; n++) {
        const at = n * 0.75;
        last = (last + ((rr() * 5) | 0) - 2 + SCALE.length) % SCALE.length;
        const f = root * Math.pow(2, SCALE[last] / 12);
        damped(b, sr, f, 0.30, 0.55, 0, at);
        damped(b, sr, f * 2, 0.16, 0.16, 0, at);
        damped(b, sr, f * 3.01, 0.09, 0.07, 0, at);
        // brushed snare on the off-beat, so it reads as a band and not a synth
        if (n % 2 === 1) {
          grains(b, sr, rr, { count: 7, from: at + 0.37, span: 0.10, len: [0.001, 0.004], hp: 1800, lp: 6000, amp: 0.16, decay: 1.4 });
        }
      }
      // the transmission itself
      const hiss = new Float32Array(b.length);
      noiseFill(hiss, rr); biquad(hiss, sr, 'bp', 1800, 0.5);
      mixInto(b, hiss, 0.06);
      biquad(b, sr, 'hp', 300, 0.7, 0, 2);
      biquad(b, sr, 'lp', 3400, 0.7, 0, 2);
      A.buf['stem_radio' + song] = toAudioBuffer(A.actx, [normalizeTo(loopify(b, 0.6), 0.8)], sr);
    }
    A.buf.stem_radio = A.buf.stem_radio0;

    // ---- CRICKETS: discrete, positional, scattered around you.
    for (let v = 0; v < 4; v++) {
      const b = new Float32Array(N(0.34));
      // a chirp is a burst train, not a tone
      for (let p = 0; p < 5; p++) {
        const at = p * 0.045;
        const n = new Float32Array(N(0.018));
        noiseFill(n, rn);
        biquad(n, sr, 'bp', 4300 + v * 260, 9.0);
        biquad(n, sr, 'bp', 4300 + v * 260, 9.0);
        envAD(n, sr, 0.0015, 0.005, 0.002, 1);
        mixInto(b, n, 0.9 - p * 0.10, Math.round(at * sr));
      }
      fadeOut(b, sr, 0.02);
      reg('crickets' + v, [normalizeTo(b, 0.85)]);
    }

    // ---- OWL: two notes, the second lower. It is a question nobody answers.
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(1.5));
      const f = 420 + v * 38;
      sweepSine(b, sr, f * 1.06, f, 0.10, 0.16, 0.9, 0.02);
      sweepSine(b, sr, f * 0.80, f * 0.74, 0.12, 0.22, 0.8, 0.44);
      biquad(b, sr, 'lp', 1500, 0.7);
      biquad(b, sr, 'hp', 220, 0.7);
      fadeOut(b, sr, 0.10);
      reg('owl' + v, [normalizeTo(b, 0.8)]);
    }

    // ---- FROGS
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.36));
      const f = 240 + v * 55;
      for (let p = 0; p < 4; p++) {
        damped(b, sr, f * (1 + p * 0.01), 0.014, 0.7, 0, p * 0.055);
        damped(b, sr, f * 2.1, 0.008, 0.25, 0, p * 0.055);
      }
      biquad(b, sr, 'bp', f * 1.4, 1.4);
      fadeOut(b, sr, 0.03);
      reg('frogs' + v, [normalizeTo(b, 0.8)]);
    }

    // ---- THE FAR DOG. It answers you. Until the black hour, when it does not.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(1.4));
      for (let p = 0; p < 2 + v; p++) {
        const at = p * (0.34 + rn() * 0.10);
        const f = 300 + rn() * 60;
        const n = new Float32Array(N(0.24));
        noiseFill(n, rn);
        biquadSweep(n, sr, 'bp', f * 2.6, f, 1.1, 0.10, 1.4);
        envAD(n, sr, 0.010, 0.055, 0.01, 1);
        mixInto(b, n, 0.8, Math.round(at * sr));
        sweepSine(b, sr, f * 1.15, f * 0.86, 0.09, 0.08, 0.45, at);
      }
      biquad(b, sr, 'hp', 180, 0.7);
      biquad(b, sr, 'lp', 2600, 0.7);
      fadeOut(b, sr, 0.08);
      reg('farDog' + v, [normalizeTo(b, 0.8)]);
    }

    // ---- a wind gust, the watchdog's answer, and the one added sound a claim
    //      buys back if every stem is already alive.
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(2.6));
      noiseFill(b, rn, 0.7);
      biquadSweep(b, sr, 'bp', 380, 1400, 0.55, 1.2, 1.0);
      envAD(b, sr, 0.45, 0.9, 0.2, 1);
      biquad(b, sr, 'lp', 3000, 0.6);
      fadeOut(b, sr, 0.4);
      reg('gust' + v, [normalizeTo(b, 0.7)]);
    }

    // ---- the branch snap: the dread director's cheapest beat, and it lives
    //      here because it is made of the same wood the forest is.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.30));
      damped(b, sr, 900 + v * 180, 0.0025, 0.9);
      damped(b, sr, 2100 + v * 300, 0.0012, 0.45);
      grains(b, sr, rn, { count: 9, from: 0.004, span: 0.16, len: [0.001, 0.005], hp: 700, lp: 6000, amp: 0.5, decay: 1.8 });
      biquad(b, sr, 'hp', 300, 0.7);
      fadeOut(b, sr, 0.03);
      reg('snap' + v, [normalizeTo(b, 0.85)]);
    }
  }

  /* --------------------------------------------------------------- start -- */

  start() {
    const A = this.A;
    if (!A.actx || this._started) return;
    this._started = true;
    for (const k in this.stem) {
      const s = this.stem[k];
      if (s.kind !== 'loop') continue;
      s.node = A.actx.createGain();
      s.node.gain.value = 0;
      s.node.connect(A.busses[s.bus] || A.busWorld);
      this._startSource(s);
      s.target = s.base;
    }
    // Event stems arm on a first, short timer so the county is alive before the
    // player has walked ten metres — a bed that takes 40 s to start reads as a
    // bed that is broken.
    this.stem.crickets.next = 0.4;
    this.stem.owl.next = 6 + this.rng.next() * 12;
    this.stem.frogs.next = 2 + this.rng.next() * 4;
    this.stem.farDog.next = 14 + this.rng.next() * 30;
  }

  _startSource(s) {
    const A = this.A;
    if (!A.actx || !s.node) return;
    const name = s.key === 'radio' ? 'stem_radio' + this._radioSong : 'stem_' + s.key;
    const buf = A.buf[name];
    if (!buf) return;
    try {
      const src = A.actx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = 1;
      src.connect(s.node);
      src.start(A.actx.currentTime);
      s.src = src;
    } catch (e) { void e; }
  }

  stop() {
    for (const k in this.stem) {
      const s = this.stem[k];
      if (s.src) { try { s.src.stop(); } catch (e) { void e; } s.src = null; }
    }
    this._started = false;
  }

  /* ------------------------------------------------------------ THE CUT --- */

  /**
   * MID-PHRASE, NEVER A FADE. gain to zero on a setValueAtTime at the audio
   * clock's current instant and the source stopped on the same sample. If the
   * stem is an event stem, its live voice is stopped too — an owl cut off in
   * the middle of its second note is worth more than every fade in this file.
   */
  cut(key, why, immediate) {
    const s = this.stem[key];
    if (!s || !s.alive || s.permanent) return false;
    // ONE CUT AT A TIME. Two stems leaving in the same second is not two events,
    // it is one confusing one — and a stack of them inside a frame reads as the
    // audio dying rather than as the world being emptied. The rules re-evaluate
    // every step, so a refused cut simply lands at the next opening.
    // `immediate` is for the traffic, whose cut is geometry and not dread: it
    // must die the moment you are 60 m off the road or it is a lie about where
    // you are standing.
    if (!immediate && this.ctx.time.t - this._lastCutT < CUT_GAP_S) return false;
    this._lastCutT = this.ctx.time.t;
    const A = this.A;
    s.alive = false;
    s.cutAt = this.ctx.time.t;
    this.cutCount++;
    this.cutLog.push({ key, t: +this.ctx.time.t.toFixed(2), why: why || '' });
    if (A.actx) {
      const T = A.actx.currentTime;
      if (s.node) {
        s.node.gain.cancelScheduledValues(T);
        s.node.gain.setValueAtTime(0, T);
      }
      if (s.src) { try { s.src.stop(T); } catch (e) { void e; } s.src = null; }
      if (s.voice && s.voice.busy) A._hardRelease(s.voice);
    }
    s.voice = null;
    s.level = 0; s.target = 0;
    // The LAST subtraction, and the only one with no sound of its own: the
    // reverb of your own footsteps shortening, as if the world got smaller. One
    // DSP number, and the one thing in this file the player will never be able
    // to name. It arrives as its OWN event, a full gap after the fifth cut.
    if (key === 'stepTail') this._tail = TAIL_SHORT;
    // This used to emit `dread:beat`. It must not: that channel belongs to the
    // dread lane, and a second emitter on it means the dread director counts a
    // beat it did not schedule, spends its loud-gap budget on it, and then goes
    // quiet when it should have spoken. A subtraction IS an event, so it is
    // still recorded — in cutLog, which the pacing test reads — but it is
    // announced on nobody else's channel. This lane is a LISTENER of dread:beat
    // (audio.js `_wireBus`), never a speaker on it.
    return true;
  }

  /**
   * EXACTLY ONE stem back per claim. The added sound reads as grace precisely
   * because the mix taught the player that subtraction is the law. It comes back
   * mid-phrase too — it simply starts, audibly, the way it left.
   */
  restore(why) {
    for (let i = 0; i < GRACE_ORDER.length; i++) {
      const k = GRACE_ORDER[i];
      const s = this.stem[k];
      if (!s || s.alive) continue;
      s.alive = true;
      s.restoredAt = this.ctx.time.t;
      this.cutCount = Math.max(0, this.cutCount - 1);
      if (k === 'stepTail') this._tail = 1;
      if (s.kind === 'loop' && this.A.actx) {
        this._startSource(s);
        // No ramp on the way in either. It is a sound that was gone and now is
        // not, and the player should be able to say the moment it came back.
        s.node.gain.setValueAtTime(s.base * 0.9, this.A.actx.currentTime);
        s.level = s.base * 0.9; s.target = s.base;
      }
      if (s.kind === 'event') s.next = 0.6 + this.rng.next() * 1.6;
      this.graceLog.push({ key: k, t: +this.ctx.time.t.toFixed(2), why: why || '' });
      this._quiet = 0;
      return k;
    }
    // Everything is already alive: the grace is a single gust off the ridge, so
    // a claim is never silent.
    this._oneShot('gust' + (this.rng.next() < 0.5 ? 0 : 1), 0.35, 22, 5);
    return null;
  }

  /* ----------------------------------------------------------- the world -- */

  _sys(id) { return this.ctx.systems ? this.ctx.systems.get(id) : null; }

  _readWorld() {
    const p = this._sys('player');
    const roads = this._sys('roads');
    const terrain = this._sys('terrain');
    const clock = this._sys('clock');
    const sh = this.ctx.shared;

    this.tension = sh && typeof sh.tension === 'number' ? sh.tension : 0;
    if (clock && clock.phase !== undefined) { this._phase = clock.phase; this._phaseT = clock.phaseT || 0; }
    else if (sh && sh.phase !== undefined) { this._phase = sh.phase; this._phaseT = sh.phaseT || 0; }

    if (p && p.pos) {
      this._px = p.pos.x; this._py = p.pos.y; this._pz = p.pos.z;
      if (roads && roads.roadDistance) this._offRoad = roads.roadDistance(p.pos.x, p.pos.z);
      if (terrain && terrain.regionAt) {
        const rg = terrain.regionAt(p.pos.x, p.pos.z);
        if (rg && rg.key) this._region = rg.key;
      }
    } else { this._px = 0; this._py = 1.7; this._pz = 0; }

    // The Hush: a sphere where the bed drops to zero and the reverb dies. It is
    // AUTHORED silence, so the watchdog holds its breath inside one.
    const dread = this._sys('dread');
    this._inHush = !!(dread && dread.inHush && dread.inHush(this._px, this._pz, HUSH_R));
  }

  /* ------------------------------------------------------------ the step -- */

  step(dt) {
    const A = this.A;
    if (!A.enabled || !A.actx || !this._started) return;
    this._readWorld();
    const T = A.actx.currentTime;

    this._applyCutRules();
    this._mixLoops(dt, T);
    if (!A.silent) this._scheduleEvents(dt);
    this._watchdog(dt);
  }

  /**
   * THE SCHEDULE. Every one of these is a cut, once, permanent until a region is
   * claimed. Nothing here fades and nothing here is reversible by walking away
   * (except the traffic, which is geometry rather than dread).
   */
  _applyCutRules() {
    const t = this.tension;
    const S = this.stem;

    // 1. traffic dies 60 m off the loop road. This one is PHYSICS, not dread, so
    //    it is the only stem that comes back on its own — and it comes back the
    //    same way it left, with no ramp.
    if (S.traffic.alive && this._offRoad > TRAFFIC_DIES_M) {
      this.cut('traffic', 'off the loop road', true);
      this._trafficByDistance = true;
    } else if (!S.traffic.alive && this._trafficByDistance && this._offRoad < TRAFFIC_RETURNS_M) {
      S.traffic.alive = true;
      this.cutCount = Math.max(0, this.cutCount - 1);
      this._trafficByDistance = false;
      if (this.A.actx) {
        this._startSource(S.traffic);
        S.traffic.node.gain.setValueAtTime(S.traffic.base, this.A.actx.currentTime);
        S.traffic.level = S.traffic.base; S.traffic.target = S.traffic.base;
      }
    }

    // 2. insects cut MID-LOOP, once, the first time tension crosses 0.5.
    if (S.insects.alive && t >= INSECT_TENSION) this.cut('insects', 'tension crossed 0.5');

    // 3. gone before dusk ends.
    if (S.frogs.alive && this._phase === 'dusk' && this._phaseT >= DUSK_CUT_AT) {
      this.cut('frogs', 'before dusk ended');
    }

    // 4. the far dog stops answering at the black hour. He was the last thing
    //    out there that was on your side.
    if (S.farDog.alive && this._phase === 'black') this.cut('farDog', 'the black hour');

    // 5. the owl gives up.
    if (S.owl.alive && t >= OWL_TENSION) this.cut('owl', 'tension ' + OWL_TENSION);

    // 6. deep in the Pines with the tension high, the canopy stops moving.
    if (S.canopy.alive && t >= CANOPY_TENSION && this._offRoad > CANOPY_OFFROAD_M) {
      this.cut('canopy', 'deep off-road at high tension');
    }

    // 7. THE PACING LAW: the crickets never reach zero without a pressure event.
    //    If they stop, something is coming. Every time.
    if (S.crickets.alive && t >= CRICKET_TENSION && this._pressure) {
      if (this.cut('crickets', 'pressure')) this._pressure = false;
    }

    // 8. THE LAST ONE. Five stems gone, and then, a beat later, your own steps
    //    stop coming back off the trees.
    if (S.stepTail.alive && this.cutCount >= TAIL_AFTER_CUTS) {
      this.cut('stepTail', 'the world got smaller');
    }
  }

  /** Loop levels. Only region, phase, car and the Hush move these — never dread. */
  _mixLoops(dt, T) {
    const S = this.stem;
    const hush = this._inHush ? 0 : 1;
    const inside = this._inCar ? 0.55 : 1;   // the cab is a lid on the county

    // wind wanders. donor: eaten-path/src/audio.js:355-359
    this._windT -= dt;
    if (this._windT <= 0) {
      this._windT = 2 + this.rng.next() * 5;
      const open = this._region === 'ridge' || this._region === 'fields';
      this._windTarget = S.wind.base * (0.55 + this.rng.next() * (open ? 1.5 : 0.9));
    }
    S.wind.target = this._windTarget * hush * inside;

    S.canopy.target = S.canopy.base * (this._region === 'pines' ? 1.25 : this._region === 'ridge' ? 0.25 : 0.8) * hush * inside;
    S.traffic.target = S.traffic.base * clamp01(1 - this._offRoad / TRAFFIC_DIES_M) * hush;
    // The Works hum is always present and is FELT more as everything else leaves.
    // It also rises through False Dawn, which is the one spectacle that takes
    // nothing away.
    const humRise = this._phase === 'dawn' ? 1 + this._phaseT * 1.6 : 1;
    S.worksHum.target = S.worksHum.base * (this._region === 'works' ? 2.2 : 1) * humRise
      * (1 + 0.5 * clamp01(this.cutCount / 6));
    S.rain.target = S.rain.base * hush;
    S.insects.target = S.insects.base * (this._region === 'marsh' ? 1.3 : 1) * hush * inside;
    S.radio.target = this._inCar ? 0.16 : 0;

    for (const k in S) {
      const s = S[k];
      if (s.kind !== 'loop' || !s.node) continue;
      const target = s.alive ? s.target : 0;
      // A slow follow, because these are LEVELS, not events. The cut does not
      // come through here: cut() writes zero directly and stops the source.
      if (Math.abs(target - s.level) > 1e-4) {
        s.level = lerp(s.level, target, 1 - Math.pow(0.5, dt / 0.7));
        s.node.gain.setTargetAtTime(s.level, T, 0.25);
      }
    }
  }

  /** The discrete stems: crickets, owl, frogs, the far dog. */
  _scheduleEvents(dt) {
    const S = this.stem;
    const hush = this._inHush || this._inCar;

    // crickets: a density, not a timer. Thins with depth off-road.
    if (S.crickets.alive && !hush) {
      const density = (this._region === 'marsh' ? 3.0 : this._region === 'ridge' ? 0.5 : 2.0)
        * Math.max(0.10, 1 - this.tension * 0.55);
      this._cricketAcc += dt * density;
      while (this._cricketAcc > 1) {
        this._cricketAcc -= 1;
        const az = this.rng.next() * Math.PI * 2;
        const d = 8 + this.rng.next() * 22;
        S.crickets.voice = this._oneShot(
          'crickets' + ((this.rng.next() * 4) | 0),
          S.crickets.base * (0.55 + this.rng.next() * 0.5),
          d, 0.4, az, 0.9 + this.rng.next() * 0.2,
        );
        this._quiet = 0;
      }
    }

    const tick = (key, buf, nVar, lo, hi, dist, height, gain) => {
      const s = S[key];
      if (!s.alive || hush) return;
      s.next -= dt;
      if (s.next > 0) return;
      s.next = lo + this.rng.next() * (hi - lo);
      const az = this.rng.next() * Math.PI * 2;
      const d = dist[0] + this.rng.next() * (dist[1] - dist[0]);
      s.voice = this._oneShot(buf + ((this.rng.next() * nVar) | 0), gain, d, height, az,
        0.96 + this.rng.next() * 0.08);
      this._quiet = 0;
    };
    tick('owl', 'owl', 2, 16, 52, [18, 60], 7.5, S.owl.base);
    if (this._region === 'marsh' || this._region === 'pines') {
      tick('frogs', 'frogs', 3, 0.6, 2.6, [6, 26], 0.35, S.frogs.base);
    }
    tick('farDog', 'farDog', 3, 22, 64, [120, 260], 1.2, S.farDog.base);
  }

  /**
   * NO UN-AUTHORED SILENCE LONGER THAN 45 s. Answered at 40, from whatever is
   * still alive, so the law is kept with margin rather than tested.
   * Inside a Hush, or in the designed breath after a fight, the clock holds.
   */
  _watchdog(dt) {
    if (this._inHush || this.ctx.time.t < this._hushUntil) { this._quiet = 0; return; }
    this._quiet += dt;
    if (this._quiet < SILENCE_ANSWER_S) return;
    this._quiet = 0;
    // Wind first, because it never left. Then whatever else survives.
    const az = this.rng.next() * Math.PI * 2;
    this._oneShot('gust' + ((this.rng.next() * 2) | 0), 0.30, 16 + this.rng.next() * 20, 4, az);
  }

  /** One positional ambient, placed on a bearing around the player. */
  _oneShot(name, gain, dist, height, azimuth, rate) {
    const A = this.A;
    if (!A.baked || A.silent) return null;
    const az = azimuth === undefined ? this.rng.next() * Math.PI * 2 : azimuth;
    const s = A.spec();
    s.x = this._px + Math.cos(az) * dist;
    s.z = this._pz + Math.sin(az) * dist;
    s.y = this._py + (height || 0);
    s.bus = 'world';
    s.gain = gain;
    s.rate = rate || 1;
    s.send = 0.25;
    s.priority = 3;                    // the bed never takes a reserved ray
    s.cls = CUE_FLAVOUR;               // the county being alive. It is scenery.
    s.propagate = dist > 60;
    return A.play(name, s);
  }

  /* -------------------------------------------------------- player foley -- */

  /**
   * ONE stride clock drives camera bob, weapon bob and this. controller.js
   * publishes bobPhase and emits player:step on the half-cycle; we never run a
   * second timer, because two timers is what "floaty" means.
   */
  footstep(p) {
    const A = this.A;
    if (!A.baked || A.silent) return;
    const surf = this._surface();
    const v = (p.parity || 0) * 2 + ((this.rngStep.next() * 2) | 0);
    const hard = p.sprint ? 1.0 : p.crouch ? 0.34 : 0.68;
    const rate = 0.94 + this.rngStep.next() * 0.12;
    const px = p.pos ? p.pos.x : this._px, pz = p.pos ? p.pos.z : this._pz;
    const py = p.pos ? p.pos.y : this._py;

    // The heel is the leading transient; without it a step smears and reads as
    // late even when it is on the exact frame.
    const h = A.spec();
    h.x = px; h.y = py + 0.06; h.z = pz;
    h.bus = 'world'; h.gain = 0.30 * hard; h.rate = rate; h.send = 0.10 * this._tail;
    h.cls = CUE_WORLD;
    h.air = false; h.occl = false;
    A.play('heel' + (v % 3), h);

    const s = A.spec();
    s.x = px; s.y = py + 0.04; s.z = pz;
    s.bus = 'world'; s.gain = 0.55 * hard; s.rate = rate; s.cls = CUE_WORLD;
    // THE LAST SUBTRACTION lives here: the send is scaled by _tail, so once the
    // world got smaller your own steps stop coming back off the trees.
    s.send = 0.30 * this._tail;
    s.occl = false;
    const stepName = 'step_' + surf + (v % 4);
    this._lastStep = stepName; this._lastStepRate = rate;
    A.play(stepName, s);

    if (!p.crouch) {
      const g = A.spec();
      g.x = px; g.y = py + 1.1; g.z = pz;
      g.bus = 'world'; g.gain = 0.22 * hard; g.rate = 1 + this.rngStep.range(-0.06, 0.06);
      g.cls = CUE_WORLD;
      g.send = 0.14 * this._tail; g.occl = false;
      A.play('gear' + (v % 4), g);
    }

    this._quiet = 0;
    // THE FOOTSTEP `noise` EVENT IS NOT EMITTED HERE AND MUST NEVER BE AGAIN.
    // Everything above this line returns early the moment the audio lane is
    // disabled — no Web Audio, autoplay hard-blocked, or any headless test run —
    // so while this file owned the emit, the verb chain that makes crouching mean
    // something died with the sound: footsteps stopped waking enemies entirely and
    // a crouched player and a sprinting one were equally invisible to the AI.
    // A GAMEPLAY VERB MAY NEVER LIVE BEHIND AN AUDIO GUARD. src/player/controller.js
    // owns the `noise` emit for footfall and landing now (radius by stance is its
    // number); this lane plays the SOUND of a step and publishes nothing.
  }

  _surface() {
    const roads = this._sys('roads');
    if (roads && roads.onRoad && roads.onRoad(this._px, this._pz)) return 'asphalt';
    if (this._region === 'marsh') return 'water';
    if (this._region === 'ridge') return 'gravel';
    return 'duff';
  }

  land(p) {
    const A = this.A;
    if (!A.baked || A.silent) return;
    const sp = clamp01((p.speed || 0) / 12);
    const s = A.spec();
    s.x = this._px; s.y = this._py; s.z = this._pz;
    s.bus = 'world'; s.gain = 0.45 + 0.5 * sp; s.rate = 1 - sp * 0.12; s.cls = CUE_WORLD;
    s.send = 0.22 * this._tail; s.occl = false;
    A.play('land', s);
    this._quiet = 0;
    // No `noise` emit here either, and for the same reason as footstep(): a landing
    // that only wakes the county when the speakers happen to work is not a rule the
    // player can learn. player/controller.js emits it on 'player:land'.
  }

  /**
   * A HIT MUST SOUND LIKE A HIT. Alex's first playtest: he could not tell he was
   * being damaged except from the direction marks on screen. This used to be one
   * soft breath on the WORLD bus — behind the 1.6 kHz mix law, the reverb send
   * and the duck, mixed exactly like the wind. Three layers now, in this order,
   * and the order is the point:
   *
   *   1. THE ROOM STEPS BACK. Everything below the mix law drops 7 dB for a
   *      third of a second, and the ear's own reflex pulls the whole mix down
   *      the way a gunshot does. You do not hear this happen; you hear
   *      everything else stop.
   *   2. THE SIGNATURE lands in the hole that leaves — flat, centred, above the
   *      mix law, unmistakable, the one pure tone in the game.
   *   3. THE BREATH follows it, still on the world bus, still a body. It is now
   *      the colour on the hit rather than the whole of it.
   *
   * `p.hp` is the health remaining (controller.js:358 publishes it). It picks
   * the ring, so how long the ear rings after a blow IS how close you are to
   * dying — the readout he asked for, arriving where he does not have to look.
   */
  hurt(p) {
    const A = this.A;
    if (!A.baked || A.silent) return;
    const T = A.now;

    // 1. take the room, and spend the stapedius reflex on it
    A.threatDuck(undefined, T);
    if (A._reflexHit) A._reflexHit(T + 0.004);

    // 2. THE SIGNATURE. Flat voice, no panner, no air, no occlusion, no reverb:
    //    it happened to you, not somewhere.
    const amt = clamp01((p.amount || 10) / 40);
    const d = A.spec();
    d.bus = 'earshot';                 // above the mix law and above the duck
    d.gain = 0.78 + 0.30 * amt;
    d.rate = 1.03 - 0.10 * amt;        // a bigger blow is a lower one
    d.send = 0; d.air = false; d.occl = false;
    d.cls = CUE_THREAT;
    A.play('dmg', d);

    // 3. THE RING, chosen by what is left of you. 0.32 s while you are fine,
    //    1.9 s when you are nearly gone.
    const hp = (typeof p.hp === 'number' && isFinite(p.hp)) ? p.hp : 100;
    const ring = p.fatal || hp <= 30 ? 2 : hp <= 62 ? 1 : 0;
    const r = A.spec();
    r.bus = 'earshot';
    r.gain = 0.30 + 0.22 * ring + 0.10 * amt;
    r.rate = 1; r.send = 0; r.air = false; r.occl = false;
    r.delay = 0.035;                   // the blow lands, THEN the ear rings
    r.cls = CUE_THREAT;
    A.play('dmg_ring' + ring, r);

    // 4. the body under it, unchanged in character and no longer load-bearing
    const s = A.spec();
    s.bus = 'creatures';               // a body, not weather
    s.gain = clamp01(0.34 + (p.amount || 10) / 120); s.send = 0.22;
    s.rate = 0.95 + this.rngStep.next() * 0.1;
    s.cls = CUE_THREAT;
    A.play('hurt' + ((this.rngStep.next() * 3) | 0), s);
    this._quiet = 0;
  }

  /* ------------------------------------------------------------- signals -- */

  onPhase(phase, prev) {
    this._phase = phase || this._phase;
    this._phaseT = 0;
    // The black hour and false dawn are both events; neither is silence.
    if (phase === 'dawn') {
      // "every stem drops, the Works hum rises". It never takes anything away —
      // the drop is a LEVEL, not a cut, and it comes back with the phase.
      this._hushUntil = this.ctx.time.t + 6;
      this._oneShot('gust0', 0.5, 30, 8);
    }
    if (phase === 'black' && prev !== 'black') this._oneShot('gust1', 0.55, 26, 10);
  }

  onClaim(id) { return this.restore('claimed ' + id); }

  onDiscover() { this._quiet = 0; }

  /** The director asking for a beat that is made of forest. */
  stinger(kind) {
    if (kind === 'snap' || kind === undefined) {
      const az = this.rng.next() * Math.PI * 2;
      this._oneShot('snap' + ((this.rng.next() * 3) | 0), 0.6, 11 + this.rng.next() * 10, 0.9, az);
    } else if (kind === 'gust') {
      this._oneShot('gust' + ((this.rng.next() * 2) | 0), 0.45, 20, 6);
    }
    this.armPressure();
  }

  /**
   * THE PACING LAW, armed. The crickets never reach zero without a pressure
   * event, so that if they stop, something is coming — every single time, which
   * is what makes the player able to trust their ears. Every dread beat that is
   * actually a threat calls this; the decorative ones (a distant call, a door)
   * deliberately do not, or the law would mean nothing.
   */
  armPressure() {
    this._pressure = true;
    this._quiet = 0;
  }

  /** A dread beat sounded somewhere. The county is not silent; hold the watchdog. */
  onDreadBeat() { this._quiet = 0; }

  /** Called by audio.js when the director declares authored silence. */
  authorSilence(seconds) { this._hushUntil = this.ctx.time.t + (seconds || 7); }

  setInCar(on) {
    this._inCar = !!on;
    if (on) {
      this._radioSong = (this._radioSong + 1) % 3;
      const s = this.stem.radio;
      if (s.src) { try { s.src.stop(); } catch (e) { void e; } s.src = null; }
      this._startSource(s);
      s.alive = true;
    }
  }

  /** OFF-SEASON's last DSP trick, read by audio.js's reverb blend and by foley. */
  tailScale() { return this._tail; }

  /** The buffer your last footstep used. audio.dread('mimic') plays THIS one. */
  lastStepBuffer() { return this._lastStep; }

  config(p) {
    if (p.tail !== undefined) this._tail = clamp(p.tail, 0, 1);
    if (p.cut) this.cut(p.cut, 'config');
    if (p.restore) this.restore('config');
  }

  /**
   * The pacing test reads this: which stems are alive, when each one went, and
   * how long the county has been silent. "It seems the same" is a number.
   */
  state() {
    const alive = [];
    const gone = [];
    for (const k in this.stem) (this.stem[k].alive ? alive : gone).push(k);
    return {
      alive, gone, cuts: this.cutCount,
      cutLog: this.cutLog.slice(-12),
      graceLog: this.graceLog.slice(-6),
      quiet: +this._quiet.toFixed(1),
      maxSilence: MAX_SILENCE_S,
      tail: +this._tail.toFixed(2),
      tension: +(this.tension || 0).toFixed(2),
      phase: this._phase,
      offRoad: +this._offRoad.toFixed(1),
      region: this._region,
      inCar: this._inCar,
      inHush: this._inHush,
    };
  }
}

export default Bed;
