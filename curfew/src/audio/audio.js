// CURFEW — audio engine. Owner: audio. Manifest #21, id 'audio'.
//
// EVERYTHING IS SYNTHESISED. There is not one audio file in this project and there will not
// be one. Every buffer below is baked from noise, biquads and damped sinusoids at boot.
//
// The shape, in one picture:
//
//   one-shot voice  ->  air LP (exp(-d/55))  ->  occlusion LP  ->  tone  ->  gain
//                          -> HRTF panner -> out -> BUS            \-> reverb send
//
//   busWeapons ---\                                     busEarshot ------------\
//   busCreatures --> bandCarve -> dipEQ -> mixLP(1.6k, 4th order) -> preMaster -+-> reflex
//   busWorld -> duck -/                                                         |
//   busBody -> bodyShelf ------------------------------------------------------/
//                                   preMaster -> reflexGain -> reflexLP -> comp -> clip ->
//                                   master -> destination
//
// Four things in that diagram are load-bearing and none of them are decoration:
//
//  1. THE 400 Hz PUNCH CARVE (`dipEQ`). Every player shot dips everything except its own
//     body layer by 3.5 dB at 400 Hz for 120 ms. It is scheduled at the SUB-FRAME instant
//     the trigger broke, not at the frame boundary — see guns.js.
//  2. THE AUDITORY REFLEX (`reflexGain` + `reflexLP`). The ear's own stapedius response:
//     each shot pulls the whole mix down 2.5 dB, recovering over 140 ms, and sustained fire
//     drops a 1.6 kHz lowpass over the top. This is what makes a gunfight in a forest feel
//     like your hearing is being spent.
//  3. THE MIX LAW (`mixLP`). 2.5-5.5 kHz belongs to EARSHOT and nothing else. The world and
//     creature busses run through a 4th-order 1.6 kHz lowpass and the weapons bus through a
//     -5 dB carve at 3.5 kHz, so the rear ticker never has to be loud to be heard.
//     `busEarshot` bypasses both, which is the whole point.
//  4. FAIL OPEN. A missed occlusion ray that muffles a sound is a bug you can hear; one that
//     does not is a bug you cannot. Every uncertain path here returns "unoccluded".
//
// Voices are reclaimed BY SCHEDULED END TIME, never by `onended`. `onended` is a task queued
// on the main thread: under a frame spike it arrives late and the pool reports itself full
// while most of it is silent. There is no `onended` handler anywhere in this lane.
//
// Browsers suspend the AudioContext on tab hide and DO NOT resume it on their own. resume()
// is armed on every pointer, key, visibility and bus event we can see, and update() retries
// it whenever the context is not running. "The sound stopped working" is always this.
//
// donor: cinderbloom/src/audio/audio.js:94-450 (the offline DSP toolkit: noiseFill, pinkFill,
//   brownFill, biquadCoeffs, biquad, biquadSweep, envAD, fadeOut, damped, sweepSine, grains,
//   saturate, normalizeTo, mixInto, toAudioBuffer, limitCurve, makeIR) — lifted near-verbatim.
// donor: cinderbloom/src/audio/audio.js:650-766 (_buildGraph, the master chain and the reverb
//   sends), :767-830 (_buildVoicePool), :831-875 (_acquire tiered reclaim / _release),
//   :876-892 (_armResume / resume), :1713-1780 (playBuf: air absorption, propagation delay,
//   occlusion), :2506-2630 (_probe, _rayHit, _occAt, _occludes), :2630-2690 (punch + reflex),
//   :2768-2782 (_updateListener).
// donor: fetch/src/audio.js:16-38 (ZONES bed rack + the VERB_XFADE_TAU crossfade rule that
//   stops a reverb character clicking when it is swapped).

import { CFG } from '../config.js';
import { clamp, clamp01, lerp } from '../engine/math.js';
import { GunAudio } from './guns.js';
import { Bed } from './bed.js';
import { Earshot } from './earshot.js';

export const dB = (x) => Math.pow(10, x / 20);
const sat = clamp01;

// ============================================================================
// DSP TOOLKIT — offline, on plain Float32Arrays at the device rate.
// Function declarations on purpose: guns.js and bed.js import them across a
// deliberate module cycle and a `const` arrow would hit a TDZ.
// donor: cinderbloom/src/audio/audio.js:103-350
// ============================================================================

export function noiseFill(out, rnd, amp = 1) {
  for (let i = 0; i < out.length; i++) out[i] = (rnd() * 2 - 1) * amp;
  return out;
}

/** Voss-ish pink noise: three octaves of decaying one-poles. */
export function pinkFill(out, rnd, amp = 1) {
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < out.length; i++) {
    const w = rnd() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.0990460;
    b1 = 0.96300 * b1 + w * 0.2965164;
    b2 = 0.57000 * b2 + w * 1.0526913;
    out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22 * amp;
  }
  return out;
}

/** Brown noise — integrated white with a leak. The bass of wind. */
export function brownFill(out, rnd, amp = 1) {
  let s = 0;
  for (let i = 0; i < out.length; i++) {
    s = s * 0.998 + (rnd() * 2 - 1) * 0.035;
    out[i] = s * 8 * amp;
  }
  return out;
}

/** RBJ cookbook coefficients. type: lp hp bp notch peak lowshelf highshelf */
export function biquadCoeffs(type, sr, f0, Q, dbGain = 0) {
  const w0 = 2 * Math.PI * clamp(f0, 8, sr * 0.48) / sr;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const A = Math.pow(10, dbGain / 40);
  const alpha = sw / (2 * Math.max(0.05, Q));
  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
  else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
  else if (type === 'bp') { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
  else if (type === 'notch') { b0 = 1; b1 = -2 * cw; b2 = 1; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; }
  else if (type === 'peak') { b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; }
  else if (type === 'lowshelf') {
    const s2 = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) - (A - 1) * cw + s2); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s2);
    a0 = (A + 1) + (A - 1) * cw + s2; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s2;
  } else if (type === 'highshelf') {
    const s2 = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) + (A - 1) * cw + s2); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s2);
    a0 = (A + 1) - (A - 1) * cw + s2; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s2;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

/** In-place biquad. `passes` 2 gives 24 dB/oct. */
export function biquad(buf, sr, type, f0, Q = 0.7071, dbGain = 0, passes = 1) {
  for (let p = 0; p < passes; p++) {
    const c = biquadCoeffs(type, sr, f0, Q, dbGain);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < buf.length; i++) {
      const x = buf[i];
      const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      buf[i] = y;
    }
  }
  return buf;
}

/**
 * Biquad whose cutoff sweeps f0 -> f1 over `sweepSec`, coefficients recomputed
 * every 32 samples. This downward spectral collapse IS the crack of a rifle; a
 * static filter reads as a noise burst.
 */
export function biquadSweep(buf, sr, type, f0, f1, Q, sweepSec, curve = 2.0) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const n = buf.length;
  const sweepN = Math.max(1, sweepSec * sr);
  let c = biquadCoeffs(type, sr, f0, Q);
  for (let i = 0; i < n; i++) {
    if ((i & 31) === 0) {
      const t = Math.pow(sat(i / sweepN), curve);
      c = biquadCoeffs(type, sr, f0 + (f1 - f0) * t, Q);
    }
    const x = buf[i];
    const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[i] = y;
  }
  return buf;
}

/** Attack / exponential-decay envelope. `tau` e-folds amplitude. */
export function envAD(buf, sr, attack, tau, hold = 0, shape = 1) {
  const aN = Math.max(1, attack * sr), hN = hold * sr;
  for (let i = 0; i < buf.length; i++) {
    let e;
    if (i < aN) e = Math.pow(i / aN, shape);
    else if (i < aN + hN) e = 1;
    else e = Math.exp(-(i - aN - hN) / (tau * sr));
    buf[i] *= e;
  }
  return buf;
}

/** Fade the tail so a buffer never clicks on its own end. */
export function fadeOut(buf, sr, sec = 0.008) {
  const n = Math.min(buf.length, Math.max(1, Math.round(sec * sr)));
  const s = buf.length - n;
  for (let i = 0; i < n; i++) buf[s + i] *= 1 - i / n;
  return buf;
}

/** Fade the head in, for loop stems that must not click at their seam. */
export function fadeIn(buf, sr, sec = 0.008) {
  const n = Math.min(buf.length, Math.max(1, Math.round(sec * sr)));
  for (let i = 0; i < n; i++) buf[i] *= i / n;
  return buf;
}

/**
 * Add an exponentially damped sine — the atom of every metallic ping. Rotating
 * phasor, so no Math.sin/Math.exp in the inner loop.
 */
export function damped(buf, sr, freq, tau, amp = 1, phase = 0, at = 0) {
  const s = Math.round(at * sr);
  if (s >= buf.length) return buf;
  const w = 2 * Math.PI * freq / sr;
  const cw = Math.cos(w), sw = Math.sin(w);
  const dec = Math.exp(-1 / (tau * sr));
  let re = Math.cos(phase), im = Math.sin(phase), e = amp;
  const floor = Math.abs(amp) * 1e-4;
  for (let i = s; i < buf.length; i++) {
    if (e < floor && e > -floor) break;
    buf[i] += im * e;
    const nr = re * cw - im * sw;
    im = re * sw + im * cw; re = nr;
    e *= dec;
  }
  return buf;
}

/** Add a swept sine (exponential glide). The low core of a shot, and every voice. */
export function sweepSine(buf, sr, f0, f1, sweepSec, tau, amp = 1, at = 0) {
  const s = Math.round(at * sr);
  if (s >= buf.length) return buf;
  const sweepN = Math.max(1, Math.round(sweepSec * sr));
  const dec = Math.exp(-1 / (tau * sr));
  const k2 = 2 * Math.PI / sr;
  let e = amp, re = 1, im = 0, cw = 1, sw = 0;
  const floor = Math.abs(amp) * 1e-4;
  for (let i = s; i < buf.length; i++) {
    const k = i - s;
    if ((k & 31) === 0) {
      const t = sat(k / sweepN);
      const f = f0 * Math.pow(f1 / f0, t);
      const w = k2 * f;
      cw = Math.cos(w); sw = Math.sin(w);
    }
    if (e < floor && e > -floor) break;
    buf[i] += im * e;
    const nr = re * cw - im * sw;
    im = re * sw + im * cw; re = nr;
    e *= dec;
  }
  return buf;
}

/**
 * Scatter short noise grains with a decaying density. A single filtered noise
 * burst reads as a hiss; grains read as PARTICLES, which is what a boot in
 * needle litter actually is. The first grain always lands on `from` — without
 * that the scatter leaves a random 0-40 ms hole at the head and the footstep
 * audibly trails the footfall.
 */
export function grains(buf, sr, rnd, o) {
  const count = o && o.count !== undefined ? o.count : 14;
  const from = o && o.from !== undefined ? o.from : 0;
  const span = o && o.span !== undefined ? o.span : 0.16;
  const l0 = o && o.len ? o.len[0] : 0.0018;
  const l1 = o && o.len ? o.len[1] : 0.006;
  const amp = o && o.amp !== undefined ? o.amp : 1;
  const decay = o && o.decay !== undefined ? o.decay : 1.6;
  const hp = o && o.hp !== undefined ? o.hp : 700;
  const lp = o && o.lp !== undefined ? o.lp : 6000;
  const tmp = new Float32Array(Math.ceil(l1 * sr) + 4);
  for (let g = 0; g < count; g++) {
    const u = g === 0 ? 0 : Math.pow(rnd(), 0.7);
    const at = from + u * span;
    const gl = Math.max(2, Math.round((l0 + rnd() * (l1 - l0)) * sr));
    const sub = tmp.subarray(0, gl);
    noiseFill(sub, rnd);
    envAD(sub, sr, 0.0004, (gl / sr) * 0.30);
    const f = hp * Math.pow(lp / hp, rnd());
    biquad(sub, sr, 'bp', f, 1.1 + rnd() * 2.0);
    const a = amp * Math.exp(-u * decay) * (0.45 + rnd() * 0.75);
    const s = Math.round(at * sr);
    for (let i = 0; i < gl && s + i < buf.length; i++) buf[s + i] += sub[i] * a;
  }
  return buf;
}

/** Pade-ish tanh. Math.tanh over ~1.5 M samples measured 100 ms of the bake. */
function ftanh(x) {
  if (x < -3) return -1;
  if (x > 3) return 1;
  const x2 = x * x;
  return x * (27 + x2) / (27 + 9 * x2);
}

export function saturate(buf, k = 2.0, mix = 1.0) {
  const inv = 1 / ftanh(k);
  for (let i = 0; i < buf.length; i++) {
    const d = ftanh(buf[i] * k) * inv;
    buf[i] = buf[i] * (1 - mix) + d * mix;
  }
  return buf;
}

export function peakOf(buf) {
  let p = 0;
  for (let i = 0; i < buf.length; i++) { const a = buf[i] < 0 ? -buf[i] : buf[i]; if (a > p) p = a; }
  return p;
}

export function normalizeTo(buf, peak = 0.95) {
  const p = peakOf(buf);
  if (p > 1e-9) { const k = peak / p; for (let i = 0; i < buf.length; i++) buf[i] *= k; }
  return buf;
}

export function gainBuf(buf, g) { for (let i = 0; i < buf.length; i++) buf[i] *= g; return buf; }

export function mixInto(dst, src, g = 1, atSamples = 0) {
  const n = Math.min(src.length, dst.length - atSamples);
  for (let i = 0; i < n; i++) dst[atSamples + i] += src[i] * g;
  return dst;
}

/** Wrap one or two Float32Arrays as an AudioBuffer. */
export function toAudioBuffer(actx, chans, sr) {
  const n = chans[0].length;
  const b = actx.createBuffer(chans.length, n, sr || actx.sampleRate);
  for (let c = 0; c < chans.length; c++) b.getChannelData(c).set(chans[c]);
  return b;
}

const LIMIT_HEADROOM = 1.35;

/**
 * Soft-knee ceiling for a WaveShaperNode. Zero latency, which a lookahead
 * limiter is not — and latency on a gunshot is the one thing you can hear.
 * donor: cinderbloom/src/audio/audio.js:378-400
 */
export function limitCurve(n = 8193, a = 0.55, C = 0.94, H = LIMIT_HEADROOM) {
  const c = new Float32Array(n);
  const k = (C - a) > 1e-6 ? 1 / (C - a) : 1;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const x = u * H;
    const ax = Math.abs(x);
    let y;
    if (ax <= a) y = ax;
    else {
      // C1-continuous soft knee: slope 1 at the knee, 0 at the ceiling.
      const t = Math.min(1, (ax - a) * k);
      y = a + (C - a) * (1 - (1 - t) * (1 - t));
    }
    c[i] = (x < 0 ? -y : y) / H;
  }
  return c;
}

/**
 * Baked stereo impulse response. Decorrelated channels, a handful of measured
 * early taps, then an exponentially decaying noise tail.
 * donor: cinderbloom/src/audio/audio.js:404-440
 */
export function makeIR(actx, sr, rnd, o) {
  const seconds = o.seconds, tau = o.tau;
  const damp = o.damp === undefined ? 4000 : o.damp;
  const lowCut = o.lowCut === undefined ? 60 : o.lowCut;
  const gain = o.gain === undefined ? 1 : o.gain;
  const early = o.early || [];
  const n = Math.max(16, Math.round(seconds * sr));
  const chans = [];
  for (let c = 0; c < 2; c++) {
    const b = new Float32Array(n);
    noiseFill(b, rnd);
    for (let i = 0; i < n; i++) b[i] *= Math.exp(-i / (tau * sr));
    biquad(b, sr, 'lp', damp * (c ? 0.94 : 1.06), 0.7);
    biquad(b, sr, 'hp', lowCut, 0.7);
    for (let e = 0; e < early.length; e++) {
      const at = Math.round(early[e][0] * sr * (c ? 1.03 : 1));
      if (at < n) b[at] += early[e][1] * (rnd() < 0.5 ? -1 : 1);
    }
    fadeOut(b, sr, Math.min(0.05, seconds * 0.15));
    gainBuf(b, gain);
    chans.push(b);
  }
  return toAudioBuffer(actx, chans, sr);
}

// ============================================================================
// Constants this file owns. CFG is frozen and does not carry them; each one is
// cited, and a request for a home is appended to docs/HANDOFF.md.
// ============================================================================

// 32 HRTF panners, per the audio brief. CFG.audio.voices (40) is used for what
// it actually names: the ceiling on voices sounding AT ONCE across both pools.
const POS_VOICES = 32;
const FLAT_VOICES = 32;
const RAY_BUDGET = 8;          // occlusion rays per frame [cinderbloom maxOcclusionRays]
const OCC_DB = 7.0;            // [cinderbloom occlusionDb]
const OCC_HZ = 900;            // [cinderbloom occlusionHz]
const PUNCH_DUCK_DB = 5.0;     // [cinderbloom COMBAT_FEEL 8]
const PUNCH_DIP_DB = 3.5;
const REFLEX_DB = 2.5;         // per-shot broadband dip [cinderbloom 5.4]
const REFLEX_CAP_DB = 6.0;
const MIX_LP_HZ = CFG.audio.earshot.lowpass;          // 1600
const BAND_LO = CFG.audio.earshot.band[0];            // 2500
const BAND_HI = CFG.audio.earshot.band[1];            // 5500
const BAND_CARVE_DB = -5.0;    // weapons keep their transient; the band is still ceded
const PROBE_PERIOD = 0.20;     // seconds between openness probes [cinderbloom lateUpdate]
const OCC_FLUSH_S = 0.25;
const OCC_FLUSH_M = 1.5;       // listener movement that invalidates the cache
const SPEC_RING = 24;          // pooled option objects; the hot path allocates nothing

/* --------------------------------------------------------------------------
   THE TENSION LINK. director/tension.js publishes one number and one corner:
   `setTension(t)` and `setBedLowpass(hz)`, from TENSION_TABLE's bedLowpassHi
   5200 / bedLowpassLo 900 — "the world going muffled and close", one of the six
   things the single tension number is supposed to drive.

   Both calls are guarded on the caller's side, neither method existed here, so
   nothing threw and nothing happened: the deadest kind of dead link.

   The corner cannot be used literally. Everything on the world bus is ALREADY
   behind the mix law's 4th-order 1.6 kHz lowpass, so a second lowpass anywhere
   above about 2 kHz is inaudible — the lower filter wins — and honouring 5200
   would leave the link exactly as dead as it was. So the published number is read
   as a POSITION between the director's open and closed corners and mapped, in the
   log domain, onto corners that BITE behind the mix law.
   -------------------------------------------------------------------------- */
const BED_LP_REF_HI = 5200;    // [director/tension.js TENSION_TABLE.bedLowpassHi]
const BED_LP_REF_LO = 900;     // [director/tension.js TENSION_TABLE.bedLowpassLo]
const BED_LP_OPEN = 20000;     // transparent; the mix law is the only ceiling
const BED_LP_CLOSED = 520;     // the wind loses its top and the county becomes a room
const BED_LP_TAU = 1.1;        // half-life of the move. NEVER stepped: a corner that
                               //   jumps reads as a filter being switched on, and a
                               //   corner that slides reads as the world coming in.
const WORLD_BUS_GAIN = 0.85;
const WORLD_DUCK_AT_T = 0.18;  // the county steps back as it closes in; creatures do not

/* ==========================================================================
   THE DREAD TABLE — one row per beat the dread director can ask for.
   ==========================================================================
   The dread lane calls `answer(kind, x, y, z, gain)` and, before this round,
   fell through to `playAt(kind, x, y, z, gain)` — which passes a NUMBER where
   playBuf expects an options object, so `o.bus` threw on a bare number and the
   whole beat was lost inside a try/catch. Every beat below is now a real baked
   sound with a real placement, because A BEAT WITH NO BAKE IS A SILENT BEAT and
   silence reads as the game being broken.

   Columns: n = buffer stem, v = variant count (0 = the stem is the whole name),
   gain = base level BEFORE the caller's scalar, bus, send = reverb, occl,
   pri = ray priority (1 reserves one of the eight), prop = propagation-delay
   distance in metres (0 = never), rlo/rhi = playbackRate spread, threat = arms
   the cricket pacing law.
   ========================================================================== */
const DREAD = {
  // the cheap one, and the one that has to be perfect: dry, close, wood
  branch:   { n: 'dr_branch',   v: 3, gain: 0.85, bus: 'world',     send: 0.30, occl: true,  pri: 2, prop: 0,  rlo: 0.94, rhi: 1.08, threat: false },
  // a distant animal or human. It is band-limited BY THE BAKE, so the distance
  // is in the sound and not only in the panner.
  call:     { n: 'dr_call',     v: 3, gain: 0.70, bus: 'world',     send: 0.50, occl: true,  pri: 3, prop: 60, rlo: 0.92, rhi: 1.10, threat: false },
  // cloth and breath: a presence tell, never a footstep
  watcher:  { n: 'dr_watcher',  v: 2, gain: 0.55, bus: 'creatures', send: 0.16, occl: true,  pri: 1, prop: 0,  rlo: 0.96, rhi: 1.05, threat: true },
  brush:    { n: 'dr_brush',    v: 3, gain: 0.90, bus: 'creatures', send: 0.24, occl: true,  pri: 1, prop: 0,  rlo: 0.93, rhi: 1.09, threat: true },
  // fires every 0.16 s while the runner runs, so it is short, cheap, takes no
  // reserved ray and is never occlusion-tested
  runstep:  { n: 'dr_runstep',  v: 4, gain: 0.42, bus: 'creatures', send: 0.12, occl: false, pri: 3, prop: 0,  rlo: 0.92, rhi: 1.12, threat: false },
  footfall: { n: 'dr_footfall', v: 3, gain: 0.70, bus: 'creatures', send: 0.18, occl: true,  pri: 1, prop: 0,  rlo: 0.94, rhi: 1.06, threat: true },
  // the loud beat. Short, low, and NOT a violin.
  stinger:  { n: 'dr_stinger',  v: 2, gain: 1.00, bus: 'world',     send: 0.35, occl: false, pri: 1, prop: 0,  rlo: 0.96, rhi: 1.04, threat: true },
  // the build that pays off in NOTHING
  collapse: { n: 'dr_collapse', v: 0, gain: 1.00, bus: 'world',     send: 0.50, occl: false, pri: 1, prop: 0,  rlo: 1.00, rhi: 1.00, threat: true },
  // ANIMALS KNOW FIRST: birds leaving, 10-40 s early
  tell:     { n: 'dr_tell',     v: 3, gain: 0.62, bus: 'world',     send: 0.36, occl: true,  pri: 2, prop: 60, rlo: 0.95, rhi: 1.07, threat: false },
  // the watcher being GONE, which is worse than the watcher
  withdraw: { n: 'dr_withdraw', v: 2, gain: 0.55, bus: 'creatures', send: 0.30, occl: true,  pri: 2, prop: 0,  rlo: 0.94, rhi: 1.06, threat: false },
  eyes:     { n: 'dr_eyes',     v: 3, gain: 0.42, bus: 'creatures', send: 0.10, occl: true,  pri: 2, prop: 0,  rlo: 0.94, rhi: 1.08, threat: false },
  lantern:  { n: 'dr_lantern',  v: 3, gain: 0.55, bus: 'world',     send: 0.30, occl: true,  pri: 2, prop: 0,  rlo: 0.96, rhi: 1.05, threat: false },
  // the same lantern, further off and dulled: the light that was there is not.
  // An alias with its own row, never a second bake — it IS that object leaving.
  lanternGone: { n: 'dr_lantern', v: 3, gain: 0.34, bus: 'world',  send: 0.42, occl: true,  pri: 2, prop: 0,  rlo: 0.84, rhi: 0.90, threat: false, lpHz: 1800 },
  door:     { n: 'dr_door',     v: 2, gain: 0.60, bus: 'world',     send: 0.40, occl: true,  pri: 2, prop: 0,  rlo: 0.94, rhi: 1.06, threat: false },
  // BEING CAUGHT LOOKING. director/auditor.js:488 fires this the instant the
  // player's viewport has held an active event for 1.5 s — the payoff of the whole
  // Auditor loop and the game's reward for CHOOSING to look at the frightening
  // thing, which is the design's entire theory of terror. Before this row it was
  // not in the table, fell through to DREAD.branch, and the payoff of looking
  // sounded exactly like the cheapest soft beat in the game: a twig.
  // It is dry, close and breathed — the thing you were watching noticing you back —
  // and it is NEVER occluded and never delayed: a payoff the ray budget can muffle
  // is a payoff the player learns not to trust.
  witnessed: { n: 'dr_witnessed', v: 3, gain: 0.80, bus: 'creatures', send: 0.14, occl: false, pri: 1, prop: 0, rlo: 0.97, rhi: 1.04, threat: true },
  // YOUR OWN footstep, one beat late, 2.3 m behind. The buffer is chosen at
  // call time from the step you actually just took — a generic step behind you
  // is a stranger, and a stranger is a much weaker idea than a copy of you.
  mimic:    { n: '', v: 0, gain: 0.50, bus: 'creatures', send: 0.20, occl: false, pri: 1, prop: 0, rlo: 0.97, rhi: 1.01, threat: true, mimic: true },
};
const DREAD_ALIAS = {
  'lantern-gone': 'lanternGone', lanterngone: 'lanternGone', snap: 'branch',
  // spellings the director lane has used for the witnessing in prose and in code
  witness: 'witnessed', caught: 'witnessed',
};

/**
 * Every name `dread()` will answer, for the gate. The dread lane's BEAT_SOUNDS list
 * is frozen in director/dread.js and a name on it that is missing from here is a
 * beat that plays the wrong sound — the failure this whole table exists to prevent.
 * A test intersects the two lists; `_stats.dreadUnknown` catches whatever slips
 * past the intersection at runtime.
 */
export const DREAD_NAMES = Object.freeze(
  Object.keys(DREAD).concat(Object.keys(DREAD_ALIAS)),
);

/* --------------------------------------------------------------------------
   THE WHISPER. A destination breathes its own name at 24 m and that is the
   game's ONLY naming mechanism — there are no captions anywhere in CURFEW — so
   it has to be a real pooled, HRTF-panned, occluded voice and not a second
   AudioContext with four fresh nodes per utterance and no resume path.

   It reads as a BREATHED WORD rather than a word: two formants (one bump is a
   filter, two bumps is a mouth), a fricative onset, one to three syllables,
   no pitch at all. Every formant is kept UNDER the 1.6 kHz mix lowpass and the
   fricatives under 2.5 kHz, because THE MIX LAW is not suspended for this: the
   2.5-5.5 kHz band belongs to EARSHOT and a whisper that shouted into it would
   cost the rear ticker the one channel that makes it work.
   -------------------------------------------------------------------------- */
const WHISPER_WORDS = 6;
const WHISPER_CLAIMS = 3;
// Whispered formant pairs, all below the mix lowpass. Rough /o/ /e/ /a/ /ə/.
const WH_FORMANTS = [[430, 900], [380, 1320], [700, 1180], [520, 1050], [340, 1460], [610, 1250]];

/* ==========================================================================
   THE SYSTEM
   ========================================================================== */

export class Audio {
  static id = 'audio';

  constructor(ctx) {
    this.ctx = ctx;
    this.actx = null;
    this.enabled = true;
    this.baked = false;
    this.silent = true;
    this.buf = Object.create(null);
    this.sr = 48000;

    // scheduler
    this.now = 0;
    this._sched = 0;
    this._accSim = 0; this._accWall = 0; this._lw = 0; this._rate = 1; this._tight = 0;

    // openness + occlusion
    this._open = 0.6; this._openTarget = 0.6;
    this._early = [[0.045, 0.30], [0.110, 0.16]];
    this._probeAge = 0;
    this._occCache = new Map();
    this._occAge = 0; this._occCx = 1e9; this._occCz = 1e9;
    this._rayBudget = RAY_BUDGET;

    // reflex
    this._reflexDb = 0; this._reflexLPHz = 20000; this._roundsRecent = [];

    // the tension link (see BED_LP_* above). Both start fully open, so a game
    // with no director at all sounds exactly as it did before this existed.
    this.tension = 0;
    this._bedLPHz = BED_LP_OPEN; this._bedLPTarget = BED_LP_OPEN;
    this._bedLPPublished = false;

    // scratch — nothing in step() or present() may allocate
    this._sp = new Array(SPEC_RING);
    for (let i = 0; i < SPEC_RING; i++) this._sp[i] = this._blankSpec();
    this._spi = 0;
    this._rayOrigin = { x: 0, y: 0, z: 0 };
    this._rayDir = { x: 0, y: 0, z: 0 };
    this._probeDirs = null;

    this._stats = {
      plays: 0, voices: 0, peakVoices: 0, steals: 0, reclaims: 0,
      rays: 0, occHits: 0, shots: 0, updMs: 0,
      dread: 0, dreadUnknown: 0, whispers: 0,
    };

    this.rng = ctx.rng.fork('audio');
    this.guns = new GunAudio(ctx, this);
    this.bed = new Bed(ctx, this);
    this.earshot = new Earshot(ctx, this);

    this._unsub = [];
    this._resumeHandler = null;
    this._domListeners = null;
    this._lastUnknownDread = '';
    // Every dread name that arrived without a row, and every row whose bake did
    // not land. Both are the same failure — a beat that makes the wrong sound, or
    // no sound — and both are meant to be LOUD once and then countable forever:
    // `_stats.dreadUnknown` is on state() so a gate can require it to be zero.
    this._unknownDread = Object.create(null);
    this._missingBakes = [];
  }

  /* ---------------------------------------------------------------- boot -- */

  async init() {
    if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) {
      // Node syntax checks and any browser without Web Audio: every method below
      // is a no-op and nothing else in the game notices.
      this.enabled = false;
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.actx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      this.enabled = false;
      return;
    }
    this.sr = this.actx.sampleRate;
    this._buildGraph();
    this._armResume();

    // Bake in four slices with a yield between them, so a slow machine reports
    // progress through boot:stage instead of appearing to hang.
    await this._slice('audio: reverb', () => this._bakeReverb());
    await this._slice('audio: foley', () => this._bakeFoley());
    await this._slice('audio: weapons', () => this.guns.bake());
    await this._slice('audio: world', () => { this.bed.bake(); this.earshot.bake(); });
    // The dread beats and the naming whisper. They are on the BOOT path, not on
    // requestIdleCallback with the spare guns: the dread director can ask for a
    // beat inside the first ten seconds and the first place you walk past has to
    // be able to say its own name. A beat with no bake is a silent beat.
    await this._slice('audio: dread', () => { this._bakeDread(); this._bakeWhisper(); });

    this.baked = true;
    this.bed.start();
    this._wireBus();

    // The rest of the armoury, off the boot path. It is ~90 ms per gun and none
    // of them are in your hands yet; shot() force-bakes on demand if this never
    // runs, so the worst case is paying for the second gun once.
    const rest = () => { try { this.guns.bakeRest(); } catch (e) { void e; } };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(rest, { timeout: 4000 });
    else if (typeof requestAnimationFrame === 'function') requestAnimationFrame(rest);
    else rest();
  }

  /**
   * One bake slice, then a yield to the frame so the boot bar can move. This is
   * the ONLY wall-clock wait in the lane and it lives in init(), never in game
   * logic — every beat after boot is dt-scoped so a test can step it.
   */
  async _slice(label, fn) {
    try { this.ctx.bus.emit('boot:stage', label); } catch (e) { void e; }
    fn();
    await new Promise((r) => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => r());
      else r();
    });
  }

  ready() { return true; }   // audio must never be the reason the game refuses to boot

  dispose() {
    for (let i = 0; i < this._unsub.length; i++) { try { this._unsub[i](); } catch (e) { void e; } }
    this._unsub.length = 0;
    if (this._domListeners) {
      for (let i = 0; i < this._domListeners.length; i++) {
        const L = this._domListeners[i];
        try { L[0].removeEventListener(L[1], L[2], L[3]); } catch (e) { void e; }
      }
      this._domListeners.length = 0;
    }
    this._resumeHandler = null;
    try { if (this.bed) this.bed.stop(); } catch (e) { void e; }
    try { if (this.actx) this.actx.close(); } catch (e) { void e; }
    this.actx = null; this.enabled = false;
  }

  /* --------------------------------------------------------------- graph -- */

  _buildGraph() {
    const c = this.actx;
    const g = (v) => { const n = c.createGain(); n.gain.value = v; return n; };

    this.master = g(0.85);
    this.master.connect(c.destination);

    // Zero-latency soft ceiling. `oversample` stays 'none': Chrome's oversample
    // path runs a polyphase filter and reintroduces exactly the latency this
    // node exists to avoid.
    this.clipTrim = g(1 / LIMIT_HEADROOM);
    this.clipper = c.createWaveShaper();
    this.clipper.curve = limitCurve();
    this.clipper.oversample = 'none';
    this.clipMakeup = g(LIMIT_HEADROOM);
    this.clipTrim.connect(this.clipper);
    this.clipper.connect(this.clipMakeup);
    this.clipMakeup.connect(this.master);

    // The one compressor. Glues a forest of quiet stems under a rifle.
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -10;
    this.comp.knee.value = 16;
    this.comp.ratio.value = 12;
    this.comp.attack.value = 0.002;
    this.comp.release.value = 0.18;
    this.comp.connect(this.clipTrim);

    // Auditory reflex.
    this.reflexLP = c.createBiquadFilter();
    this.reflexLP.type = 'lowpass';
    this.reflexLP.frequency.value = 20000;
    this.reflexLP.Q.value = 0.5;
    this.reflexLP.connect(this.comp);
    this.reflexGain = g(1);
    this.reflexGain.connect(this.reflexLP);

    this.preMaster = g(1);
    this.preMaster.connect(this.reflexGain);

    // THE MIX LAW. 4th order = two cascaded 12 dB/oct biquads.
    this.mixLP1 = c.createBiquadFilter();
    this.mixLP1.type = 'lowpass'; this.mixLP1.frequency.value = MIX_LP_HZ; this.mixLP1.Q.value = 0.541;
    this.mixLP2 = c.createBiquadFilter();
    this.mixLP2.type = 'lowpass'; this.mixLP2.frequency.value = MIX_LP_HZ; this.mixLP2.Q.value = 1.307;
    this.mixLP1.connect(this.mixLP2);
    this.mixLP2.connect(this.preMaster);

    // The 400 Hz punch carve. Everything except a player shot's own body.
    this.dipEQ = c.createBiquadFilter();
    this.dipEQ.type = 'peaking';
    this.dipEQ.frequency.value = 400;
    this.dipEQ.Q.value = 1.1;
    this.dipEQ.gain.value = 0;
    this.dipEQ.connect(this.mixLP1);

    // Weapons cede the pinna band without losing their leading edge: a broad
    // -5 dB scoop centred in 2.5-5.5 kHz rather than the world bus's brick LP.
    this.bandCarve = c.createBiquadFilter();
    this.bandCarve.type = 'peaking';
    this.bandCarve.frequency.value = Math.sqrt(BAND_LO * BAND_HI);   // 3708 Hz
    this.bandCarve.Q.value = 0.85;
    this.bandCarve.gain.value = BAND_CARVE_DB;
    this.bandCarve.connect(this.dipEQ);

    // The body layer of the player's own shot: +2 dB air, dip-bypassed. THAT is
    // the punch move — everything else steps out of the way of this one signal.
    this.bodyShelf = c.createBiquadFilter();
    this.bodyShelf.type = 'highshelf';
    this.bodyShelf.frequency.value = 3500;
    this.bodyShelf.gain.value = 2.0;
    this.bodyShelf.connect(this.preMaster);

    this.duck = g(1);                       // bed sidechain, ducked by punch()
    this.duck.connect(this.mixLP1);

    // THE TENSION CORNER. It sits on the world bus alone — the county, the
    // weather, the bed — and never on the creatures bus: what is close to you
    // must stay legible while the distance is taken away, or "muffled and close"
    // becomes "muffled", which is just quieter.
    this.bedLP = c.createBiquadFilter();
    this.bedLP.type = 'lowpass';
    this.bedLP.frequency.value = BED_LP_OPEN;
    this.bedLP.Q.value = 0.6;
    this.bedLP.connect(this.duck);

    this.busWeapons = g(1.0); this.busWeapons.connect(this.bandCarve);
    this.busCreatures = g(1.0); this.busCreatures.connect(this.mixLP1);
    this.busWorld = g(WORLD_BUS_GAIN); this.busWorld.connect(this.bedLP);
    this.busBody = g(1.0); this.busBody.connect(this.bodyShelf);
    // EARSHOT bypasses the lowpass and the carve. It is the only thing in
    // 2.5-5.5 kHz, which is why it can be quiet and still be the loudest cue
    // in the game.
    this.busEarshot = g(1.0); this.busEarshot.connect(this.preMaster);

    // --- reverb: three characters, crossfaded by the openness probe ---------
    this.reverbIn = g(1);
    this.revHi = c.createBiquadFilter();
    this.revHi.type = 'highshelf'; this.revHi.frequency.value = 3200; this.revHi.gain.value = 0;
    this.revLo = c.createBiquadFilter();
    this.revLo.type = 'lowshelf'; this.revLo.frequency.value = 170; this.revLo.gain.value = 0;
    this.reverbReturn = g(1.0);
    this.reverbReturn.connect(this.revHi);
    this.revHi.connect(this.revLo);
    this.revLo.connect(this.mixLP1);
    this.conv = {};
    for (const name of ['room', 'forest', 'open']) {
      const send = g(name === 'forest' ? 1 : 0);
      const cv = c.createConvolver();
      cv.normalize = true;
      const post = g(1);
      this.reverbIn.connect(send); send.connect(cv); cv.connect(post); post.connect(this.reverbReturn);
      this.conv[name] = { send, node: cv, post };
    }

    this.busses = {
      weapons: this.busWeapons, world: this.busWorld, creatures: this.busCreatures,
      body: this.busBody, earshot: this.busEarshot,
    };

    this._buildVoicePool();
  }

  /**
   * VOICE POOL. A BufferSourceNode is one-shot by spec, but everything
   * downstream of it is reusable: one allocation per sound instead of six.
   * A released voice is DISCONNECTED from its bus, and a disconnected subgraph
   * is not pulled by the audio thread, so 32 idle HRTF panners cost nothing.
   *
   * Every chain ends in a dedicated `out` gain whose ONLY edge is the bus:
   * _release calls out.disconnect(), and a bare disconnect() drops ALL outgoing
   * edges, so routing the reverb send off the same node would silently unwire
   * it after the first play.
   * donor: cinderbloom/src/audio/audio.js:767-812
   */
  _buildVoicePool() {
    const c = this.actx;
    const H = CFG.audio.hrtf;
    this.pool = []; this.flat = [];
    for (let i = 0; i < POS_VOICES; i++) {
      const air = c.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 20000; air.Q.value = 0.3;
      const occ = c.createBiquadFilter(); occ.type = 'lowpass'; occ.frequency.value = 20000; occ.Q.value = 0.4;
      const tone = c.createBiquadFilter(); tone.type = 'peaking'; tone.frequency.value = 1400; tone.Q.value = 2.2; tone.gain.value = 0;
      const gain = c.createGain(); gain.gain.value = 1;
      const pan = c.createPanner();
      pan.panningModel = 'HRTF';
      pan.distanceModel = 'inverse';
      pan.refDistance = H.refDistance; pan.rolloffFactor = H.rolloff; pan.maxDistance = H.maxDistance;
      const send = c.createGain(); send.gain.value = 0;
      const out = c.createGain(); out.gain.value = 1;
      air.connect(occ); occ.connect(tone); tone.connect(gain);
      gain.connect(pan); pan.connect(out);
      gain.connect(send); send.connect(this.reverbIn);
      this.pool.push({ air, occ, tone, gain, pan, send, out, head: air, busy: false, src: null, t: 0, until: 0 });
    }
    for (let i = 0; i < FLAT_VOICES; i++) {
      const air = c.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 20000; air.Q.value = 0.3;
      const tone = c.createBiquadFilter(); tone.type = 'peaking'; tone.frequency.value = 1400; tone.Q.value = 2.2; tone.gain.value = 0;
      const gain = c.createGain(); gain.gain.value = 1;
      const send = c.createGain(); send.gain.value = 0;
      const out = c.createGain(); out.gain.value = 1;
      air.connect(tone); tone.connect(gain); gain.connect(out);
      gain.connect(send); send.connect(this.reverbIn);
      this.flat.push({ air, tone, gain, send, out, head: air, busy: false, src: null, t: 0, until: 0 });
    }
  }

  /**
   * Three tiers: an idle voice; a voice whose SCHEDULED END has passed (a free
   * reclaim — there is nothing left to cut); then a genuine steal, which IS an
   * audible cut. Tier 2 is not an optimisation, it is the reason this lane has
   * no `onended` handler at all: onended is a main-thread task, so under a
   * frame spike it arrives late and the pool reports itself full while most of
   * it is silent.
   * donor: cinderbloom/src/audio/audio.js:831-868
   */
  _acquire(positional, bus) {
    const list = positional ? this.pool : this.flat;
    const now = this.now;
    let v = null, done = null, oldest = null;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c.busy) { v = c; break; }
      if (c.until <= now && (!done || c.until < done.until)) done = c;
      if (!oldest || c.t < oldest.t) oldest = c;
    }
    if (!v && done) { v = done; this._stats.reclaims++; }
    else if (!v) { v = oldest; this._stats.steals++; }
    if (!v) return null;
    if (v.busy) this._hardRelease(v);
    v.busy = true; v.t = now;
    v.out.connect(bus);
    this._stats.voices++;
    if (this._stats.voices > this._stats.peakVoices) this._stats.peakVoices = this._stats.voices;
    return v;
  }

  _hardRelease(v) {
    if (v.src) {
      // stop(WHEN), never a bare stop(): `this.now` runs ahead of currentTime by
      // the scheduler lookahead, so a bare stop truncates before the point the
      // mixer has already committed to.
      try { v.src.stop(Math.max(this.now, this.actx.currentTime)); } catch (e) { void e; }
    }
    this._release(v);
  }

  _release(v) {
    if (!v.busy) return;
    // Disconnect the source explicitly as well as dropping the reference. A
    // finished BufferSource is dereferenced by the implementation, but it stays
    // wired to this voice's head filter until it is, and 800 dead edges on one
    // biquad is not a thing worth finding out about the hard way.
    if (v.src) { try { v.src.disconnect(); } catch (e) { void e; } }
    v.busy = false; v.src = null;
    this._stats.voices--;
    try { v.out.disconnect(); } catch (e) { void e; }
  }

  /** Sweep finished voices. This is the ONLY reclaim path. Called once a frame. */
  _sweep() {
    const now = this.now;
    for (let i = 0; i < this.pool.length; i++) {
      const v = this.pool[i];
      if (v.busy && v.until <= now) this._release(v);
    }
    for (let i = 0; i < this.flat.length; i++) {
      const v = this.flat[i];
      if (v.busy && v.until <= now) this._release(v);
    }
  }

  /* -------------------------------------------------------------- resume -- */

  /**
   * Browsers suspend on tab hide and never resume on their own. Claw it back
   * from every event we can see, plus a retry inside update().
   * donor: cinderbloom/src/audio/audio.js:876-892
   */
  _armResume() {
    const try_ = () => this.resume();
    this._resumeHandler = try_;
    // CAPTURE phase, on the window. A game canvas that calls stopPropagation on
    // its own pointerdown (every pointer-lock shim does) would otherwise eat the
    // one gesture the browser will accept, and the context stays suspended
    // forever with no error anywhere. Capture runs before the target.
    // Every listener is recorded so dispose() can actually take it off again —
    // the old code removed 'visibilitychange' from `window`, where it had never
    // been added, and left the real one on `document` alive after dispose.
    this._domListeners = [];
    const arm = (target, ev, fn, opts) => {
      if (!target || !target.addEventListener) return;
      target.addEventListener(ev, fn, opts);
      this._domListeners.push([target, ev, fn, opts]);
    };
    const w = typeof window !== 'undefined' ? window : null;
    const OPT = { passive: true, capture: true };
    for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchstart', 'touchend']) {
      arm(w, ev, try_, OPT);
    }
    const d = typeof document !== 'undefined' ? document : null;
    // A context that was suspended BEFORE the first click comes back here: the
    // tab becoming visible again, or pointer lock being taken, both count as
    // activation on every browser this game runs on.
    const onVis = () => { if (!d.hidden) try_(); };
    arm(d, 'visibilitychange', onVis, false);
    arm(d, 'pointerlockchange', try_, false);
    arm(d, 'pointerlockerror', try_, false);
    arm(d, 'fullscreenchange', try_, false);
    const b = this.ctx.bus;
    this._unsub.push(b.on('boot:stage', try_));
    this._unsub.push(b.on('player:step', try_));
    this._unsub.push(b.on('weapon:fire', try_));
    try_();
  }

  resume() {
    if (!this.actx) return false;
    if (this.actx.state === 'suspended') { try { this.actx.resume(); } catch (e) { void e; } }
    return this.actx.state === 'running';
  }

  setMasterVolume(v) { if (this.master) this.master.gain.value = clamp(v, 0, 2); return v; }
  mute(b = true) { if (this.master) this.master.gain.value = b ? 0 : 0.85; }

  /* ------------------------------------------------------- the tension link -- */

  /**
   * director/tension.js:418. The single tension number, 0..1. It is a real move
   * in the mix and not a stored field: the county steps back as the corner comes
   * down (`_updateTension`), and if the director only ever calls this — never
   * setBedLowpass — the world still closes in, off the same curve.
   */
  setTension(t) {
    const v = (typeof t === 'number' && isFinite(t)) ? clamp01(t) : 0;
    this.tension = v;
    if (!this._bedLPPublished) this._bedLPTarget = this._bedCornerFor(v);
    return v;
  }

  /**
   * director/tension.js:419. The corner it wants the world closed to, in ITS
   * units (5200 open, 900 closed). Read as a position in that range and mapped
   * onto a corner that is audible behind the mix law — see BED_LP_* above.
   * Once the director has published one, it owns the corner and setTension no
   * longer drives it.
   */
  setBedLowpass(hz) {
    if (typeof hz !== 'number' || !isFinite(hz)) return this._bedLPTarget;
    this._bedLPPublished = true;
    this._bedLPTarget = this._bedCornerFor((BED_LP_REF_HI - hz) / (BED_LP_REF_HI - BED_LP_REF_LO));
    return this._bedLPTarget;
  }

  /** u = 0 open, 1 closed. Log interpolation: a corner is octaves, not hertz. */
  _bedCornerFor(u) {
    return BED_LP_OPEN * Math.pow(BED_LP_CLOSED / BED_LP_OPEN, clamp01(u));
  }

  /**
   * The corner SLIDES. A lowpass that steps to its new value reads as a filter
   * being switched on — a mixing desk, not a place — and the whole point of this
   * link is that the player never catches the world getting smaller, only ends up
   * inside a smaller one. The follow runs in the log domain for the same reason
   * the mapping does, and it runs even while `silent`, so a test that fast-forwards
   * a minute of tension resumes at the corner the sim actually reached.
   */
  _updateTension(dt) {
    if (!this.bedLP) return;
    const k = 1 - Math.pow(0.5, dt / BED_LP_TAU);
    const cur = Math.log(this._bedLPHz);
    this._bedLPHz = Math.exp(cur + (Math.log(this._bedLPTarget) - cur) * k);
    if (Math.abs(this._bedLPHz - this._bedLPTarget) < 1) this._bedLPHz = this._bedLPTarget;
    if (this.silent) return;
    const T = this.actx.currentTime;
    this.bedLP.frequency.setTargetAtTime(this._bedLPHz, T, 0.20);
    this.busWorld.gain.setTargetAtTime(WORLD_BUS_GAIN * (1 - WORLD_DUCK_AT_T * this.tension), T, 0.35);
  }

  /* ----------------------------------------------------------------- bus -- */

  /**
   * Every subscription is optional and every direct method still works if the
   * event is never emitted. Sibling lanes are being written at the same time as
   * this one, so nothing here may assume a payload field exists.
   */
  _wireBus() {
    const b = this.ctx.bus;
    const on = (k, fn) => this._unsub.push(b.on(k, (p) => { try { fn(p || {}); } catch (e) { void e; } }));

    on('weapon:fire', (p) => {
      // A shotgun emits weapon:fire once PER PELLET with one reused payload.
      // One trigger pull is one gunshot.
      if (p.pellet !== undefined && p.pellet !== 0) return;
      this.guns.shot(p);
      // THIS LANE EMITS NOTHING ON THE `noise` CHANNEL — not for a shot, not for
      // a footstep, not for a landing. weapon:fire already carries `loud` (the
      // alert radius) and the director owns that channel; two systems
      // broadcasting the same shot would make every gun twice as loud to the AI.
      // Footfall used to be emitted from bed.js, which was worse: every emitter
      // in this lane sits behind `enabled`/`silent`, so on a headless run or an
      // autoplay-blocked browser the footstep noise vanished and crouch stopped
      // meaning anything. player/controller.js owns the footfall emit now.
    });
    on('weapon:hit', (p) => this.guns.impact(p));
    on('weapon:reload', (p) => this.guns.reloadCue(p));
    on('player:step', (p) => this.bed.footstep(p));
    on('player:land', (p) => this.bed.land(p));
    on('player:hurt', (p) => this.bed.hurt(p));
    on('player:died', () => this.bed.hurt({ amount: 100, fatal: true }));
    on('enemy:spawned', (p) => this.earshot.attach(p.e || p));
    on('enemy:killed', (p) => this.earshot.detach(p.e || p, true));
    on('enemy:hurt', (p) => this.earshot.hurt(p.e || p, p));
    on('enemy:telegraph', (p) => this.earshot.telegraph(p.e || p, p.kind));
    on('phase:changed', (p) => this.bed.onPhase(p.phase, p.prev));
    on('place:claimed', (p) => this.bed.onClaim(p.id));
    on('place:discovered', (p) => this.bed.onDiscover(p.id));
    on('dread:stinger', (p) => this.bed.stinger(p.kind));
    // `dread:beat` is the DREAD LANE'S channel and this lane only listens on it.
    // It deliberately makes NO sound: dread.js `answer()` both emits this event
    // and calls audio.dread() directly, so sounding here would double every
    // beat in the game. What it does is tell the ambient bed that the county was
    // not silent, so the 40 s watchdog does not answer a beat with a gust.
    on('dread:beat', () => { if (this.bed) this.bed.onDreadBeat(); });
    on('car:entered', () => this.bed.setInCar(true));
    on('car:exited', () => this.bed.setInCar(false));
  }

  /* --------------------------------------------------------- option specs -- */

  _blankSpec() {
    return {
      x: null, y: 0, z: 0, gain: 1, rate: 1, bus: 'world', when: undefined, delay: 0,
      send: undefined, air: true, occl: true, lpHz: 0, filterHz: 1400, toneDb: 0,
      dur: undefined, offset: 0, propagate: false, priority: 3,
      ref: 0, roll: 0, maxDist: 0,
    };
  }

  /**
   * A pooled, reset options object. The hot path allocates nothing, so nobody
   * in this lane writes an object literal into play(). The ring is 24 deep:
   * one gunshot books six of these inside one call and never holds one across
   * a frame.
   */
  spec() {
    const s = this._sp[this._spi = (this._spi + 1) % SPEC_RING];
    s.x = null; s.y = 0; s.z = 0; s.gain = 1; s.rate = 1; s.bus = 'world';
    s.when = undefined; s.delay = 0; s.send = undefined; s.air = true; s.occl = true;
    s.lpHz = 0; s.filterHz = 1400; s.toneDb = 0; s.dur = undefined; s.offset = 0;
    s.propagate = false; s.priority = 3; s.ref = 0; s.roll = 0; s.maxDist = 0;
    return s;
  }

  /* ------------------------------------------------------------ playback -- */

  /**
   * The one place a sound is scheduled. Air absorption, propagation delay and
   * occlusion all live here so no caller can forget them.
   * donor: cinderbloom/src/audio/audio.js:1716-1777
   */
  playBuf(buffer, o) {
    if (!this.enabled || this.silent || !buffer) return null;
    if (this._stats.voices >= CFG.audio.voices + 24) return null;
    const positional = o.x !== null && o.x !== undefined;
    const bus = this.busses[o.bus] || this.busWorld;
    const v = this._acquire(positional, bus);
    if (!v) return null;

    const c = this.actx;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const rate = o.rate || 1;
    src.playbackRate.value = rate;
    v.src = src;

    let g = o.gain;
    let when = (o.when !== undefined ? o.when : this.now) + (o.delay || 0);

    if (positional) {
      const p = v.pan;
      const H = CFG.audio.hrtf;
      p.refDistance = o.ref || H.refDistance;
      p.rolloffFactor = o.roll || H.rolloff;
      p.maxDistance = o.maxDist || H.maxDistance;
      if (p.positionX) { p.positionX.value = o.x; p.positionY.value = o.y; p.positionZ.value = o.z; }
      else p.setPosition(o.x, o.y, o.z);
      const d = this.distToListener(o.x, o.y, o.z);
      // air absorption: cutoff 20000 * exp(-d/55) [CFG.audio.airAbsorption]
      let air = o.air === false ? 20000
        : clamp(20000 * Math.exp(-d / CFG.audio.airAbsorption), 220, 20000);
      if (o.lpHz) air = Math.min(air, o.lpHz);
      v.air.frequency.value = air;
      // propagation delay — a shot 200 m off arrives 0.58 s late, and that
      // lateness is most of what tells you it was not yours.
      if (o.propagate) when += d / CFG.audio.speedOfSound;
      let occHz = 20000;
      if (o.occl !== false && this._occAt(o.x, o.y, o.z, o.priority)) {
        occHz = OCC_HZ; g *= dB(-OCC_DB);
      }
      v.occ.frequency.value = occHz;
    } else {
      v.air.frequency.value = o.lpHz || 20000;
    }

    if (when < c.currentTime) when = c.currentTime;
    src.connect(v.head);
    v.tone.frequency.value = o.filterHz || 1400;
    v.tone.gain.value = o.toneDb || 0;
    v.gain.gain.value = g;
    v.send.gain.value = (o.send === undefined ? 0.12 : o.send);

    // When this voice is PROVABLY finished. +0.03 is slack for the panner and
    // convolver tail, and it must be generous: reclaiming one buffer-length too
    // early cuts a real sound, which is the failure the tier exists to avoid.
    v.until = when + (o.dur !== undefined ? o.dur : buffer.duration) / rate + 0.03;
    try {
      if (o.dur) src.start(when, o.offset || 0, o.dur);
      else src.start(when, o.offset || 0);
    } catch (e) { this._release(v); return null; }
    this._stats.plays++;
    return v;
  }

  play(name, o) { return this.playBuf(this.buf[name], o || this.spec()); }

  playAt(name, x, y, z, o) {
    const s = o || this.spec();
    s.x = x; s.y = y; s.z = z;
    return this.playBuf(this.buf[name], s);
  }

  has(name) { return !!this.buf[name]; }

  /* ------------------------------------------------------- the dread beat -- */

  /**
   * THE DREAD LANE'S ONE CALL. `director/dread.js:443` calls exactly this
   * signature and, without it, fell through to `playAt(kind, x, y, z, gain)` —
   * which hands playBuf a bare NUMBER where it expects the options object, so
   * `o.bus` threw inside the beat and every dread beat in the game was silent.
   *
   * `gain` is a SCALAR on the beat's own baked level, not an options bag. An
   * unknown kind still makes a sound (a branch) and is counted, because a beat
   * the director scheduled and nobody heard is indistinguishable from a bug.
   */
  dread(kind, x, y, z, gain) {
    if (!this.enabled || !this.baked || this.silent) return null;
    let d = DREAD[DREAD_ALIAS[kind] || kind];
    if (!d) {
      this._stats.dreadUnknown++;
      const k = String(kind);
      this._lastUnknownDread = k;
      // ONCE PER NAME, not once per beat: 'runstep' answers every 0.16 s and a
      // per-beat warning would bury the console it is meant to make legible.
      // The next missing bake has to be loud the first time it happens, because
      // the failure mode is not a crash — it is the payoff of the game's central
      // loop quietly playing a twig snap for a whole playtest.
      if (!this._unknownDread[k]) {
        this._unknownDread[k] = 1;
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[audio] dread beat "' + k + '" has no row in DREAD — playing a branch instead. '
            + 'Bake it in src/audio/audio.js (_bakeDread) and add its row, or alias it in DREAD_ALIAS.');
        }
      }
      d = DREAD.branch;
    }
    this._stats.dread++;

    const cam = this.ctx.camera;
    const cx = cam ? cam.position.x : 0, cy = cam ? cam.position.y : 0, cz = cam ? cam.position.z : 0;
    const px = (typeof x === 'number' && isFinite(x)) ? x : cx;
    const py = (typeof y === 'number' && isFinite(y)) ? y : cy;
    const pz = (typeof z === 'number' && isFinite(z)) ? z : cz;
    const g = (typeof gain === 'number' && isFinite(gain)) ? gain : 1;

    const r = this.rng;
    let name;
    if (d.mimic) {
      // your own last footstep, played back at you
      name = (this.bed && this.bed.lastStepBuffer) ? this.bed.lastStepBuffer() : 'step_duff0';
      if (!this.buf[name]) name = 'step_duff0';
    } else {
      name = d.v > 0 ? d.n + ((r.next() * d.v) | 0) : d.n;
    }

    const s = this.spec();
    s.x = px; s.y = py; s.z = pz;
    s.bus = d.bus;
    s.gain = d.gain * g;
    s.rate = d.rlo + r.next() * (d.rhi - d.rlo);
    // The mimic inherits the last subtraction: once the world got smaller, the
    // thing copying you stops coming back off the trees either.
    s.send = d.send * (d.mimic && this.bed ? this.bed.tailScale() : 1);
    s.occl = d.occl;
    s.priority = d.pri;
    s.lpHz = d.lpHz || 0;
    s.propagate = d.prop > 0 && this.distToListener(px, py, pz) > d.prop;
    const v = this.playBuf(this.buf[name], s);

    // --- what the beat does to the rest of the mix ---------------------------
    if (this.bed) {
      this.bed.onDreadBeat();
      // THE PACING LAW is armed only by beats that are actually a threat. A
      // door on its hinge is scenery; a thing in the brush is not.
      if (d.threat) this.bed.armPressure();
    }
    if (d === DREAD.stinger) {
      // it takes the room with it for a beat
      this._bedDuck(4.0, this.now, 0.06, 0.55);
    } else if (d === DREAD.collapse) {
      // THE SUBTRACTIVE WHUMP. The build pays off in nothing, so the county is
      // taken away underneath it and then handed back slowly, and the silence
      // it leaves is AUTHORED — the watchdog holds its breath rather than
      // answering it with a gust and spoiling the whole beat.
      this._bedDuck(26.0, this.now + 0.55, 0.030, 1.9);
      if (this.bed.authorSilence) this.bed.authorSilence(6);
    }
    return v;
  }

  /**
   * Duck the world bus by `db` starting at `T`, hold, then recover over `back`
   * seconds. Shares the same node the gunshot punch uses, so a stinger under a
   * firefight cannot fight the punch for the bed — the later schedule simply
   * wins, which is what you want.
   */
  _bedDuck(db, T0, attack, back) {
    if (!this.actx || this.silent) return;
    const T = Math.max(T0 || this.now, this.actx.currentTime);
    const gn = this.duck.gain;
    gn.cancelScheduledValues(T);
    gn.setTargetAtTime(dB(-db), T, attack);
    gn.setTargetAtTime(1, T + attack * 4 + 0.05, back / 3);
  }

  /* ---------------------------------------------------------- the whisper -- */

  /**
   * A place breathes its own name. `world/places.js:1093` calls exactly this
   * signature; before this round it found no whisper() here and opened A SECOND
   * AudioContext with four un-pooled nodes per utterance and no resume path, so
   * the naming mechanism was one autoplay policy away from never sounding at
   * all — and the game has no captions to fall back on.
   *
   * `name` selects the word deterministically, so a given place always breathes
   * the same shape: two places are told apart by ear, not by luck.
   */
  whisper(kind, name, x, y, z) {
    if (!this.enabled || !this.baked || this.silent) return null;
    // FNV-ish over the name. No allocation, and the same string always lands on
    // the same word, rate and mouth.
    let h = 2166136261;
    const str = name === undefined || name === null ? '' : String(name);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }

    const bell = kind === 'bell';
    const claim = kind === 'claim';
    let buf;
    if (bell) buf = 'wh_bell';
    else if (claim) buf = 'wh_claim' + (h % WHISPER_CLAIMS);
    else buf = 'wh_name' + (h % WHISPER_WORDS);
    if (!this.buf[buf]) return null;

    const cam = this.ctx.camera;
    const s = this.spec();
    s.x = (typeof x === 'number' && isFinite(x)) ? x : (cam ? cam.position.x : 0);
    s.y = (typeof y === 'number' && isFinite(y)) ? y : (cam ? cam.position.y : 0);
    s.z = (typeof z === 'number' && isFinite(z)) ? z : (cam ? cam.position.z : 0);
    s.bus = 'world';
    s.gain = bell ? 0.85 : claim ? 0.62 : 0.50;
    // The mouth: a small per-place shift of rate and of the formant emphasis.
    // Same name, same mouth, every time you walk back into it.
    s.rate = bell ? 1 : 0.93 + ((h >>> 8) % 17) / 17 * 0.15;
    s.filterHz = bell ? 520 : 900 + ((h >>> 13) % 11) * 55;
    s.toneDb = bell ? 0 : 2.5;
    s.send = bell ? 0.55 : 0.42;
    // It is a real place in a real forest: occluded behind the barn wall, ray
    // reserved, and delayed by the air only when it is genuinely far off.
    s.occl = true;
    s.priority = 1;
    s.propagate = this.distToListener(s.x, s.y, s.z) > 60;
    // Far enough out that a whisper at 24 m is a whisper and not a shout, and
    // still audible: the naming mechanism is not allowed to be inaudible.
    s.ref = bell ? 26 : 16;
    s.roll = bell ? 0.9 : 1.25;
    s.maxDist = bell ? 400 : 140;
    this._stats.whispers++;
    if (this.bed) this.bed.onDreadBeat();
    return this.playBuf(this.buf[buf], s);
  }

  /**
   * Register a baked buffer under a name. `sr` may be BELOW the device rate:
   * an AudioBuffer carries its own sample rate and the browser resamples it on
   * playback, so anything band-limited below 10 kHz — the whole ambient bed,
   * every creature loop, the car radio — is baked at half rate for half the
   * DSP cost and half the memory. MEASURED: the world bake went 1059 ms to
   * 318 ms on this machine for no audible difference, because none of those
   * buffers had content above 10 kHz to lose. Transients (the gun, the pinna
   * click) stay at the device rate, where the top octave IS the sound.
   */
  reg(name, chans, sr) {
    if (!this.actx) return null;
    const b = toAudioBuffer(this.actx, chans, sr || this.sr);
    this.buf[name] = b;
    return b;
  }

  distToListener(x, y, z) {
    const cam = this.ctx.camera;
    if (!cam) return 0;
    const p = cam.position;
    return Math.hypot(x - p.x, y - p.y, z - p.z);
  }

  /* ------------------------------------------------ probe and occlusion -- */

  _sys(id) { return this.ctx.systems ? this.ctx.systems.get(id) : null; }

  /**
   * Nearest hit distance along a ray, or -1. Terrain marchRay plus the collider
   * grid — NOTHING here raycasts a mesh. `margin` is the diffraction allowance:
   * a sound path grazing a low crest bends over it, light does not, and this
   * ray is otherwise asking the light question.
   * donor: cinderbloom/src/audio/audio.js:2560-2580
   */
  _rayHit(ox, oy, oz, dx, dy, dz, maxT, margin) {
    this._stats.rays++;
    let best = -1;
    const col = this._sys('collision');
    if (col && col.raycast) {
      const o = this._rayOrigin, d = this._rayDir;
      o.x = ox; o.y = oy; o.z = oz;
      d.x = dx; d.y = dy; d.z = dz;
      // MASK.SIGHT (4) only. An all-bits mask makes collision march the terrain
      // as well and every path comes back blocked — the same class of bug that
      // made combat label every ground hit as wood.
      const h = col.raycast(o, d, maxT, 4);
      if (h && h.hit) best = h.t;
    }
    const t = this._sys('terrain');
    if (t && t.heightAt) {
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const s = (i / steps) * maxT;
        if (best >= 0 && s > best) break;
        const y = oy + dy * s;
        if (t.heightAt(ox + dx * s, oz + dz * s) > y + (margin || 0)) {
          best = best < 0 ? s : Math.min(best, s);
          break;
        }
      }
    }
    return best;
  }

  /**
   * Six rays — straight up plus five at 60 degrees from vertical, 40 m each.
   * The averaged, distance-weighted hit fraction is the OPENNESS: it selects
   * the gunshot tail, the reverb blend and the footstep send, and the two
   * nearest hits become the shot's discrete slapback times, so a stand of pines
   * slaps back at its actual geometry rather than at a preset.
   * donor: cinderbloom/src/audio/audio.js:2515-2545
   */
  _probe() {
    const cam = this.ctx.camera;
    if (!cam) return;
    const ox = cam.position.x, oy = cam.position.y, oz = cam.position.z;
    let DIRS = this._probeDirs;
    if (!DIRS) {
      DIRS = this._probeDirs = [];
      DIRS.push(0, 1, 0);
      const el = Math.cos(Math.PI / 3), ho = Math.sin(Math.PI / 3);
      for (let i = 0; i < 5; i++) {
        const th = i * (Math.PI * 2 / 5);
        DIRS.push(Math.cos(th) * ho, el, Math.sin(th) * ho);
      }
    }
    let occ = 0, d1 = Infinity, d2 = Infinity;
    for (let i = 0; i < 6; i++) {
      const t = this._rayHit(ox, oy, oz, DIRS[i * 3], DIRS[i * 3 + 1], DIRS[i * 3 + 2], 40, 0);
      if (t > 0) {
        // Distance-weighted, not binary: a trunk at 3 m encloses you, a ridge at
        // 38 m barely does, and a binary probe cannot tell them apart.
        occ += 0.42 + 0.58 * (1 - clamp01(t / 40));
        if (t < d1) { d2 = d1; d1 = t; } else if (t < d2) d2 = t;
      }
    }
    this._openTarget = clamp01(1 - occ / 6);
    const t1 = clamp((isFinite(d1) ? d1 : 15) * 2 / CFG.audio.speedOfSound, 0.035, 0.30);
    const t2 = clamp((isFinite(d2) ? d2 : 36) * 2 / CFG.audio.speedOfSound, t1 + 0.03, 0.42);
    this._early[0][0] = t1; this._early[1][0] = t2;
    this._early[0][1] = clamp(3.0 / Math.max(3, isFinite(d1) ? d1 : 15), 0.05, 0.55);
    this._early[1][1] = clamp(2.2 / Math.max(3, isFinite(d2) ? d2 : 36), 0.03, 0.40);
  }

  /**
   * The ray budget, done properly. Cache the answer on a 2.5 m grid of the
   * SOURCE and reserve three of the eight rays for priority <= 1 (player shots,
   * whizz-bys, the nearest thing behind you). Without the cache a magazine's
   * worth of impacts a metre apart each buys its own identical ray and the
   * creature walking up behind you gets none.
   *
   * FAILING OPEN is deliberate and is the law of this file.
   * donor: cinderbloom/src/audio/audio.js:2602-2614
   */
  _occAt(x, y, z, priority) {
    const q = CFG.audio.occlusionGrid;
    const key = (Math.round(x / q) * 73856093) ^ (Math.round(y / q) * 19349663) ^ (Math.round(z / q) * 83492791);
    const hit = this._occCache.get(key);
    if (hit !== undefined) { this._stats.occHits++; return hit; }
    const pr = priority === undefined ? 3 : priority;
    if (this._rayBudget <= 0 || (pr > 1 && this._rayBudget <= 3)) return 0;
    const b = this._occludes(x, y, z) ? 1 : 0;
    if (this._occCache.size < 128) this._occCache.set(key, b);
    return b;
  }

  _occludes(x, y, z) {
    if (this._rayBudget <= 0) return false;
    this._rayBudget--;
    const cam = this.ctx.camera;
    if (!cam) return false;
    let dx = x - cam.position.x, dy = y - cam.position.y, dz = z - cam.position.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < 1.2) return false;
    dx /= d; dy /= d; dz /= d;
    const t = this._rayHit(cam.position.x, cam.position.y, cam.position.z, dx, dy, dz, d - 0.6, 0.45);
    return t > 0 && t < d - 0.6;
  }

  openness() { return this._open; }
  early() { return this._early; }

  /* --------------------------------------------- punch and the reflex ---- */

  /** Called by guns.js on every PLAYER shot, at the sub-frame instant. */
  punch(when) {
    if (!this.enabled || this.silent) return;
    const c = this.actx, T = Math.max(when || this.now, c.currentTime);
    // 1. duck the bed 5 dB, 6 ms attack, 190 ms release
    this.duck.gain.cancelScheduledValues(T);
    this.duck.gain.setTargetAtTime(dB(-PUNCH_DUCK_DB), T, 0.006);
    this.duck.gain.setTargetAtTime(1, T + 0.030, 0.190 / 3);
    // 2. THE MOVE: -3.5 dB at 400 Hz on everything but this shot's own body
    const g = this.dipEQ.gain;
    g.cancelScheduledValues(T);
    g.setValueAtTime(g.value, T);
    g.linearRampToValueAtTime(-PUNCH_DIP_DB, T + 0.008);
    g.setValueAtTime(-PUNCH_DIP_DB, T + 0.120);
    g.linearRampToValueAtTime(0, T + 0.190);
    // 3. the reflex, 12 ms later — the stapedius is not instantaneous
    this._roundsRecent.push(this.ctx.time.t);
    this._reflexHit(T + 0.012);
  }

  _reflexHit(T) {
    this._reflexDb = Math.min(REFLEX_CAP_DB, this._reflexDb + REFLEX_DB);
    this.reflexGain.gain.cancelScheduledValues(T);
    this.reflexGain.gain.setTargetAtTime(dB(-this._reflexDb), T, 0.010);
    const t = this.ctx.time.t;
    while (this._roundsRecent.length && t - this._roundsRecent[0] > 3) this._roundsRecent.shift();
    if (this._roundsRecent.length > 15) {
      this._reflexLPHz = 1600;
      this.reflexLP.frequency.setTargetAtTime(1600, T, 0.05);
    }
  }

  _updateReflex(dt) {
    if (this._reflexDb > 0.001) {
      this._reflexDb *= Math.pow(0.5, dt / 0.140);
      if (this._reflexDb < 0.02) this._reflexDb = 0;
      this.reflexGain.gain.setTargetAtTime(dB(-this._reflexDb), this.actx.currentTime, 0.05);
    }
    if (this._reflexLPHz < 19000) {
      this._reflexLPHz = lerp(this._reflexLPHz, 20000, 1 - Math.pow(0.5, dt / 0.45));
      if (this._reflexLPHz > 18500) this._reflexLPHz = 20000;
      this.reflexLP.frequency.setTargetAtTime(this._reflexLPHz, this.actx.currentTime, 0.1);
    }
  }

  /** Blend the three convolutions from the openness. Never hard-switch. */
  _updateReverb(dt) {
    this._open = lerp(this._open, this._openTarget, 1 - Math.pow(0.5, dt / 0.35));
    if (this.silent) return;
    const o = this._open, T = this.actx.currentTime;
    const room = sat((0.40 - o) / 0.32);
    const open = sat((o - 0.56) / 0.30);
    const forest = clamp(1 - room - open, 0, 1) + 0.12;
    // `_tail` is OFF-SEASON's last subtraction: the reverb of your own steps
    // shortening as if the world got smaller. bed.js owns the number.
    const tail = this.bed ? this.bed.tailScale() : 1;
    this.conv.room.send.gain.setTargetAtTime(room * 0.9 * tail, T, 0.25);
    this.conv.forest.send.gain.setTargetAtTime(forest * 0.8 * tail, T, 0.25);
    this.conv.open.send.gain.setTargetAtTime(open * 1.0 * tail, T, 0.25);
    // A canopy eats highs; open ridge does not. Two biquads buy every region
    // its own reverb tone, which is most of what tells you where you stand.
    this.revHi.gain.setTargetAtTime(lerp(-6.5, 1.5, o), T, 0.4);
    this.revLo.gain.setTargetAtTime(lerp(2.0, -1.5, o), T, 0.4);
  }

  /* ---------------------------------------------------------------- loop -- */

  /**
   * Sim-time scheduling clock. Tests step hundreds of sim frames inside one
   * wall frame; scheduling from those would queue minutes of audio in
   * milliseconds and blow the pool. Detect it and go silent.
   * donor: cinderbloom/src/audio/audio.js:2708-2725
   */
  _clock(dt) {
    const A = this.actx;
    const w = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
    const dw = this._lw ? Math.min(w - this._lw, 0.5) : 0;
    this._lw = w;
    this._accSim += dt; this._accWall += dw;
    if (this._accSim > 0.25) {
      this._rate = this._accSim / Math.max(1e-4, this._accWall);
      this._accSim = 0; this._accWall = 0;
    }
    if (dw < dt * 0.2) this._tight++; else this._tight = 0;
    const ff = this._tight > 4 || this._rate > 3;

    const base = A.currentTime + 0.012;
    if (ff || this._sched < base || this._sched > base + 0.25) this._sched = base;
    this.now = this._sched;
    this._sched += dt;
    this.silent = ff || A.state !== 'running' || !this.enabled || !this.baked;
    this._rayBudget = RAY_BUDGET;
  }

  step(dt) {
    if (!this.enabled || !this.actx) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    this._clock(dt);
    // The claw-back. A tab that was hidden comes back suspended and stays that
    // way unless something asks every frame.
    if (this.actx.state !== 'running') this.resume();
    this._sweep();
    this._updateTension(dt);
    if (this.baked) {
      this._updateReverb(dt);
      this._updateReflex(dt);
      this.bed.step(dt);
      this.earshot.step(dt);
    }
    this._stats.updMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  }

  /**
   * The listener rides the INTERPOLATED camera, so the sound stage does not
   * step at 60 Hz under a 144 Hz display. camera (#12) presents before audio
   * (#21), so ctx.camera.matrixWorld is already this frame's.
   * donor: cinderbloom/src/audio/audio.js:2768-2782
   */
  present(alpha) {
    if (!this.enabled || !this.actx || !this.baked) return;
    this._updateListener();
    this._probeAge += this.ctx.time.dt;
    if (this._probeAge > PROBE_PERIOD) { this._probeAge = 0; this._probe(); }
    const cam = this.ctx.camera;
    this._occAge += this.ctx.time.dt;
    // The occlusion answer changes when the LISTENER moves, so key the flush on
    // listener motion and not on a timer alone. 1.5 m is about half a stride
    // and is the coarsest distance that never lets a stale "unoccluded" survive
    // a step out from behind a trunk.
    if (this._occAge > OCC_FLUSH_S ||
        Math.abs(cam.position.x - this._occCx) > OCC_FLUSH_M ||
        Math.abs(cam.position.z - this._occCz) > OCC_FLUSH_M) {
      this._occAge = 0; this._occCx = cam.position.x; this._occCz = cam.position.z;
      this._occCache.clear();
    }
    if (this.earshot) this.earshot.present(alpha);
  }

  _updateListener() {
    const l = this.actx.listener, cam = this.ctx.camera;
    if (!cam) return;
    const m = cam.matrixWorld.elements;
    // three columns: X = 0..2, Y = 4..6, Z = 8..10. Forward is -Z.
    const fx = -m[8], fy = -m[9], fz = -m[10];
    const ux = m[4], uy = m[5], uz = m[6];
    if (l.positionX) {
      l.positionX.value = cam.position.x; l.positionY.value = cam.position.y; l.positionZ.value = cam.position.z;
      l.forwardX.value = fx; l.forwardY.value = fy; l.forwardZ.value = fz;
      l.upX.value = ux; l.upY.value = uy; l.upZ.value = uz;
    } else {
      l.setPosition(cam.position.x, cam.position.y, cam.position.z);
      l.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  /* --------------------------------------------------------------- bakes -- */

  _bakeReverb() {
    const r = this.ctx.rng.fork('audio:ir');
    const rn = () => r.next();
    // Short on purpose. Three 2.6 s stereo IRs at 48 kHz is 1.5 MB and a
    // measurable slice of boot; the forest is the only long one that earns it.
    this.conv.room.node.buffer = makeIR(this.actx, this.sr, rn, {
      seconds: 0.55, tau: 0.14, damp: 3400, lowCut: 110, gain: 0.75,
      early: [[0.007, 0.55], [0.017, 0.34], [0.029, 0.22]],
    });
    this.conv.forest.node.buffer = makeIR(this.actx, this.sr, rn, {
      seconds: 1.5, tau: 0.34, damp: 2300, lowCut: 80, gain: 0.62,
      early: [[0.019, 0.38], [0.041, 0.28], [0.072, 0.20], [0.105, 0.13]],
    });
    this.conv.open.node.buffer = makeIR(this.actx, this.sr, rn, {
      seconds: 2.4, tau: 0.62, damp: 1900, lowCut: 70, gain: 0.5,
      early: [[0.060, 0.16], [0.135, 0.11], [0.240, 0.07]],
    });
  }

  /**
   * Player foley that is not the bed and not the gun: the boots, the gear, the
   * body. Four surfaces so the ground under you is audible before it is
   * visible — needle duff, gravel, asphalt, water.
   */
  _bakeFoley() {
    const sr = this.sr;
    const r = this.ctx.rng.fork('audio:foley');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);
    const SURF = {
      duff: { hp: 300, lp: 3600, count: 22, span: 0.085, amp: 0.7, thump: 128 },
      gravel: { hp: 900, lp: 9000, count: 26, span: 0.070, amp: 0.9, thump: 168 },
      asphalt: { hp: 600, lp: 6200, count: 10, span: 0.040, amp: 0.8, thump: 148 },
      water: { hp: 250, lp: 5200, count: 30, span: 0.130, amp: 0.85, thump: 96 },
    };
    for (const k in SURF) {
      const S = SURF[k];
      for (let v = 0; v < 4; v++) {
        const b = new Float32Array(N(0.26));
        grains(b, sr, rn, {
          count: S.count, from: 0, span: S.span, len: [0.0012, 0.0055],
          hp: S.hp, lp: S.lp, amp: S.amp, decay: 2.1,
        });
        damped(b, sr, S.thump * (0.92 + rn() * 0.18), 0.026, 0.30);
        biquad(b, sr, 'hp', 90, 0.7);
        fadeOut(b, sr, 0.02);
        this.reg('step_' + k + v, [normalizeTo(b, 0.9)]);
      }
    }
    // heel — the leading transient that makes a step land rather than smear
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.06));
      noiseFill(b, rn);
      biquad(b, sr, 'bp', 1500 + v * 260, 1.1);
      envAD(b, sr, 0.0006, 0.010, 0, 1);
      fadeOut(b, sr, 0.01);
      this.reg('heel' + v, [normalizeTo(b, 0.7)]);
    }
    // gear — the strap, the buckle, the shell in the pocket
    for (let v = 0; v < 4; v++) {
      const b = new Float32Array(N(0.14));
      damped(b, sr, 2100 + v * 380, 0.0035, 0.5);
      damped(b, sr, 5200 + v * 500, 0.0016, 0.22);
      grains(b, sr, rn, { count: 4, span: 0.05, len: [0.0006, 0.002], hp: 2200, lp: 9000, amp: 0.35 });
      biquad(b, sr, 'hp', 900, 0.7);
      fadeOut(b, sr, 0.012);
      this.reg('gear' + v, [normalizeTo(b, 0.6)]);
    }
    // landing thud + the body
    {
      const b = new Float32Array(N(0.34));
      sweepSine(b, sr, 96, 44, 0.05, 0.070, 0.9);
      grains(b, sr, rn, { count: 18, span: 0.10, len: [0.0015, 0.006], hp: 260, lp: 3800, amp: 0.7 });
      biquad(b, sr, 'lp', 2600, 0.7);
      fadeOut(b, sr, 0.05);
      this.reg('land', [normalizeTo(b, 0.95)]);
    }
    // the player taking damage: a breath, not a grunt sample
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.46));
      noiseFill(b, rn);
      biquadSweep(b, sr, 'bp', 700 + v * 90, 260, 1.5, 0.22, 1.4);
      envAD(b, sr, 0.012, 0.16, 0.02, 1);
      sweepSine(b, sr, 150 + v * 14, 96, 0.14, 0.10, 0.35);
      biquad(b, sr, 'hp', 130, 0.7);
      fadeOut(b, sr, 0.05);
      this.reg('hurt' + v, [normalizeTo(b, 0.8)]);
    }
  }

  /* ---------------------------------------------------------- dread bakes -- */

  /**
   * One sound per row of the DREAD table. A BEAT WITH NO BAKE IS A SILENT BEAT.
   *
   * Baked at half the device rate like the rest of the world material: the
   * highest content in here is a branch crack at ~9 kHz and a bird alarm at
   * ~3.4 kHz, both well under the half-rate Nyquist, and an AudioBuffer carries
   * its own rate so the browser resamples it for free.
   */
  _bakeDread() {
    const sr = Math.max(16000, Math.round(this.sr / 2));
    const r = this.ctx.rng.fork('audio:dread');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);
    const reg = (n, ch) => this.reg(n, ch, sr);

    // ---- BRANCH: dry, close, WOOD. The cheapest beat in the game and the one
    //      that has to be perfect, because it is the one you hear the most.
    //      A snap is three things: fibre tearing, the crack, and the debris.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.24));
      grains(b, sr, rn, { count: 6, from: 0, span: 0.012, len: [0.0006, 0.002], hp: 1200, lp: 9000, amp: 0.35, decay: 0.5 });
      damped(b, sr, 1150 + v * 220, 0.0022, 1.0, 0, 0.012);
      damped(b, sr, 2650 + v * 380, 0.0011, 0.55, 0, 0.012);
      damped(b, sr, 430 + v * 60, 0.010, 0.30, 0, 0.012);   // the wood's own body
      grains(b, sr, rn, { count: 7, from: 0.018, span: 0.11, len: [0.001, 0.004], hp: 600, lp: 5200, amp: 0.30, decay: 2.6 });
      biquad(b, sr, 'hp', 260, 0.7);
      fadeOut(b, sr, 0.02);
      reg('dr_branch' + v, [normalizeTo(b, 0.92)]);
    }

    // ---- CALL: an animal or a person, far off. The distance is BAKED IN — the
    //      top of it is gone before it reaches you — so it stays distant even
    //      when the panner puts it close, which is what makes it uncanny.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(1.7));
      const f = 270 + v * 95;
      sweepSine(b, sr, f * 0.86, f * 1.14, 0.18, 0.40, 0.75, 0.02);
      sweepSine(b, sr, f * 2.02, f * 2.28, 0.18, 0.22, 0.24, 0.02);
      sweepSine(b, sr, f * 1.10, f * 0.72, 0.30, 0.30, 0.55, 0.38);   // the break in it
      sweepSine(b, sr, f * 2.20, f * 1.46, 0.30, 0.16, 0.16, 0.38);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'bp', f * 3.2, 1.2);
      mixInto(b, n, 0.08);
      biquad(b, sr, 'lp', 1500, 0.7, 0, 2);
      biquad(b, sr, 'hp', 180, 0.7);
      fadeOut(b, sr, 0.20);
      reg('dr_call' + v, [normalizeTo(b, 0.8)]);
    }

    // ---- WATCHER: cloth, then breath. Deliberately NOT a footstep: the beat
    //      says something is standing there, not that something is walking.
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(1.15));
      grains(b, sr, rn, { count: 26, from: 0, span: 0.30, len: [0.0008, 0.004], hp: 2000, lp: 8000, amp: 0.30, decay: 1.6 });
      const n = new Float32Array(N(0.78));
      noiseFill(n, rn);
      biquadSweep(n, sr, 'bp', 900 - v * 120, 320, 0.9, 0.45, 1.2);
      envAD(n, sr, 0.14, 0.26, 0.05, 1);
      mixInto(b, n, 0.55, Math.round(0.18 * sr));
      biquad(b, sr, 'hp', 200, 0.7);
      fadeOut(b, sr, 0.14);
      reg('dr_watcher' + v, [normalizeTo(b, 0.72)]);
    }

    // ---- BRUSH: undergrowth taking a body through it. The runner's entry and
    //      its exit are the same sound, which is the point — you cannot tell
    //      from the sound alone whether it is arriving or leaving.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.90));
      grains(b, sr, rn, { count: 44 + v * 8, from: 0, span: 0.55, len: [0.0015, 0.008], hp: 400, lp: 7000, amp: 0.85, decay: 1.1 });
      for (let p = 0; p < 5; p++) damped(b, sr, 320 + rn() * 700, 0.006, 0.30, 0, rn() * 0.40);
      biquad(b, sr, 'hp', 240, 0.7);
      fadeOut(b, sr, 0.14);
      reg('dr_brush' + v, [normalizeTo(b, 0.95)]);
    }

    // ---- RUNSTEP: fires every 0.16 s while something runs at you, so it is
    //      short and cheap by construction. Leaf litter is grains, not a hiss.
    for (let v = 0; v < 4; v++) {
      const b = new Float32Array(N(0.14));
      grains(b, sr, rn, { count: 13, from: 0, span: 0.045, len: [0.0008, 0.0035], hp: 700, lp: 8000, amp: 0.75, decay: 2.4 });
      damped(b, sr, 150 + v * 16, 0.014, 0.28);
      biquad(b, sr, 'hp', 180, 0.7);
      fadeOut(b, sr, 0.015);
      reg('dr_runstep' + v, [normalizeTo(b, 0.85)]);
    }

    // ---- FOOTFALL: one step you did not take. Heavier and wetter than yours,
    //      with the suction of the lift on the end of it.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.36));
      damped(b, sr, 84 + v * 9, 0.036, 0.85);
      damped(b, sr, 168 + v * 14, 0.016, 0.28);
      grains(b, sr, rn, { count: 20, from: 0.004, span: 0.12, len: [0.0015, 0.007], hp: 260, lp: 3400, amp: 0.60, decay: 1.8 });
      grains(b, sr, rn, { count: 5, from: 0.11, span: 0.09, len: [0.002, 0.009], hp: 500, lp: 2200, amp: 0.24, decay: 0.8 });
      biquad(b, sr, 'lp', 3600, 0.7);
      biquad(b, sr, 'hp', 60, 0.7);
      fadeOut(b, sr, 0.04);
      reg('dr_footfall' + v, [normalizeTo(b, 0.95)]);
    }

    // ---- STINGER: the loud beat. SHORT, LOW, and not a violin — a pitch drop
    //      with a crack on the front of it, driven into its own distortion,
    //      because loud IS distortion and a clean loud sound reads as a menu.
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(0.78));
      sweepSine(b, sr, 132 - v * 18, 34, 0.13, 0.20, 1.0);
      sweepSine(b, sr, 66 - v * 9, 26, 0.16, 0.26, 0.55);
      const n = new Float32Array(N(0.20));
      noiseFill(n, rn);
      biquadSweep(n, sr, 'bp', 1800, 240, 0.9, 0.12, 1.6);
      envAD(n, sr, 0.002, 0.06, 0, 1);
      mixInto(b, n, 0.55);
      saturate(b, 2.4, 0.7);
      biquad(b, sr, 'lp', 2200, 0.7);
      fadeOut(b, sr, 0.10);
      reg('dr_stinger' + v, [normalizeTo(b, 0.98)]);
    }

    // ---- COLLAPSE: the build that pays off in NOTHING.
    //      The shape is the argument. Every other sound in this game starts
    //      loud and decays; this one RISES for 550 ms into a low whump and then
    //      stops dead, with 120 ms of bright tail cut off mid-air. An inhale
    //      with no exhale reads as removal, and the duck scheduled alongside it
    //      in dread() takes the county away underneath it.
    {
      const b = new Float32Array(N(1.5));
      const head = Math.round(0.55 * sr);
      const n = new Float32Array(head);
      noiseFill(n, rn);
      biquad(n, sr, 'lp', 900, 0.7, 0, 2);
      for (let i = 0; i < head; i++) n[i] *= Math.pow(i / head, 2.2);
      mixInto(b, n, 0.55);
      sweepSine(b, sr, 58, 21, 0.10, 0.16, 1.0, 0.55);
      sweepSine(b, sr, 116, 42, 0.10, 0.09, 0.35, 0.55);
      const t = new Float32Array(Math.round(0.12 * sr));
      noiseFill(t, rn); biquad(t, sr, 'bp', 2600, 0.8); envAD(t, sr, 0.002, 0.030);
      mixInto(b, t, 0.18, Math.round(0.55 * sr));
      biquad(b, sr, 'lp', 3000, 0.7);
      fadeOut(b, sr, 0.12);
      reg('dr_collapse', [normalizeTo(b, 0.95)]);
    }

    // ---- TELL: ANIMALS KNOW FIRST. Birds leaving, 10-40 s before the event.
    //      Wing beats that thin as they go, and two alarm notes of which the
    //      second is already further away.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(1.6));
      const beats = 6 + v;
      for (let p = 0; p < beats; p++) {
        const at = 0.02 + p * (0.085 + p * 0.006);
        const a = 0.9 * Math.exp(-p * 0.22);
        grains(b, sr, rn, { count: 4, from: at, span: 0.020, len: [0.002, 0.008], hp: 300, lp: 2600, amp: 0.55 * a, decay: 0.6 });
        damped(b, sr, 120 + rn() * 90, 0.012, 0.30 * a, 0, at);
      }
      for (let p = 0; p < 2; p++) {
        sweepSine(b, sr, 3400 + v * 260, 2500 + v * 200, 0.05, 0.035, 0.42 * (p ? 0.55 : 1), 0.05 + p * 0.19);
      }
      biquad(b, sr, 'hp', 180, 0.7);
      fadeOut(b, sr, 0.20);
      reg('dr_tell' + v, [normalizeTo(b, 0.80)]);
    }

    // ---- WITHDRAW: the watcher being gone. The rustle recedes AND closes its
    //      own band as it goes, so it is leaving rather than merely quieter.
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(1.7));
      grains(b, sr, rn, { count: 40, from: 0, span: 1.30, len: [0.001, 0.006], hp: 600, lp: 7000, amp: 0.7, decay: 2.2 });
      biquadSweep(b, sr, 'lp', 6000, 700, 0.7, 1.30, 1.5);
      biquad(b, sr, 'hp', 280, 0.7);
      for (let i = 0; i < b.length; i++) b[i] *= Math.exp(-(i / sr) * 1.35);
      fadeOut(b, sr, 0.20);
      reg('dr_withdraw' + v, [normalizeTo(b, 0.70)]);
    }

    // ---- EYES: a wet blink, or a shift in a trunk hole. Two tiny clicks 18 ms
    //      apart IS a blink; one click is a twig.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.18));
      for (let p = 0; p < 2; p++) {
        const n = new Float32Array(Math.round(0.010 * sr));
        noiseFill(n, rn);
        biquad(n, sr, 'bp', 1500 + v * 260 + p * 400, 2.6);
        envAD(n, sr, 0.0004, 0.0035);
        mixInto(b, n, p ? 0.55 : 0.9, Math.round((0.004 + p * 0.018) * sr));
      }
      grains(b, sr, rn, { count: 4, from: 0.01, span: 0.07, len: [0.001, 0.004], hp: 400, lp: 3000, amp: 0.16, decay: 1.5 });
      biquad(b, sr, 'hp', 350, 0.7);
      fadeOut(b, sr, 0.012);
      reg('dr_eyes' + v, [normalizeTo(b, 0.55)]);
    }

    // ---- LANTERN: a swinging metal handle. The bail knocks the frame twice per
    //      swing and the swing decays, so the RHYTHM is what tells you it is
    //      hanging and not being carried.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(2.0));
      const f = 1650 + v * 230;
      const T = 0.62 + v * 0.05;
      for (let p = 0; p < 3; p++) {
        const at = 0.03 + p * T * 0.5;
        const a = Math.exp(-p * 0.35);
        damped(b, sr, f, 0.055, 0.55 * a, 0, at);
        damped(b, sr, f * 1.94, 0.030, 0.30 * a, 0, at);
        damped(b, sr, f * 3.11, 0.016, 0.14 * a, 0, at);
        damped(b, sr, f * 0.41, 0.020, 0.18 * a, 0, at);   // the tin it hangs off
        grains(b, sr, rn, { count: 2, from: at, span: 0.010, len: [0.0006, 0.002], hp: 2500, lp: 8000, amp: 0.12 * a });
      }
      biquad(b, sr, 'hp', 420, 0.7);
      fadeOut(b, sr, 0.20);
      reg('dr_lantern' + v, [normalizeTo(b, 0.70)]);
    }

    // ---- DOOR: a barn door drifting on its hinge. Stick-slip, which is an
    //      amplitude modulation on a narrow resonant band whose rate SLOWS as
    //      the door runs out of swing, then the frame takes it.
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(1.9));
      const n = new Float32Array(N(1.25));
      noiseFill(n, rn);
      biquadSweep(n, sr, 'bp', 520 + v * 90, 1180 + v * 140, 7.0, 1.0, 1.0);
      for (let i = 0; i < n.length; i++) {
        const t = i / sr;
        n[i] *= (0.25 + 0.75 * Math.pow(Math.abs(Math.sin(t * (30 - t * 11))), 1.6)) * Math.min(1, t * 6);
      }
      envAD(n, sr, 0.10, 0.55, 0.30, 1);
      mixInto(b, n, 0.85, Math.round(0.02 * sr));
      damped(b, sr, 140 + v * 20, 0.030, 0.45, 0, 1.20);
      grains(b, sr, rn, { count: 6, from: 1.20, span: 0.05, len: [0.001, 0.005], hp: 300, lp: 3200, amp: 0.30, decay: 1.4 });
      biquad(b, sr, 'hp', 180, 0.7);
      biquad(b, sr, 'lp', 5200, 0.7);
      fadeOut(b, sr, 0.16);
      reg('dr_door' + v, [normalizeTo(b, 0.80)]);
    }

    // ---- WITNESSED: it noticed you noticing it. The only beat in this table
    //      that is a REPLY. director/auditor.js fires it once the player's view
    //      has held an active event for 1.5 s, which makes it the payoff of the
    //      entire Auditor loop and the game's reward for CHOOSING to look at the
    //      frightening thing — so it may not sound like anything else in here,
    //      and until this bake existed it sounded like a twig snapping.
    //
    //      It is an INHALE. Every other breath in this game is an exhale: the
    //      watcher falls 900 Hz to 320, the creature stems all decay. A band
    //      rising under a rising envelope that then STOPS DEAD — a breath taken
    //      and never given back — is the sound of being seen, and the weight
    //      that lands under it at 200 ms is the thing turning its mass toward
    //      you. Close, dry, and on the creatures bus: it is a body, not weather.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.95));
      // (a) the catch of breath: the band sweeps UP, the amplitude rises with it,
      //     and then there is nothing where the exhale should be.
      {
        const n = new Float32Array(N(0.24));
        noiseFill(n, rn);
        biquadSweep(n, sr, 'bp', 240 + v * 30, 1080 + v * 90, 0.95, 0.185, 1.0);
        for (let i = 0; i < n.length; i++) n[i] *= Math.pow(i / n.length, 1.6);
        fadeOut(n, sr, 0.010);
        mixInto(b, n, 0.95);
      }
      // (b) the turn: cloth and a neck, two dry ticks under the top of the breath
      grains(b, sr, rn, { count: 6, from: 0.175, span: 0.055, len: [0.0008, 0.003], hp: 600, lp: 3800, amp: 0.34, decay: 2.0 });
      // (c) THE WEIGHT: a body settling toward you, 200 ms in, low enough to be
      //     felt through the 1.6 kHz mix lowpass the creatures bus sits behind.
      damped(b, sr, 57 + v * 8, 0.230, 0.90, 0, 0.200);
      damped(b, sr, 114 + v * 15, 0.120, 0.34, 0, 0.200);
      sweepSine(b, sr, 116 + v * 10, 52 + v * 5, 0.11, 0.170, 0.55, 0.198);
      // (d) and then what is standing there: a near, trembling, low presence that
      //     ends before you are ready for it to.
      {
        const n = new Float32Array(N(0.42));
        noiseFill(n, rn);
        biquad(n, sr, 'bp', 300 + v * 40, 0.8);
        biquad(n, sr, 'lp', 900, 0.7);
        for (let i = 0; i < n.length; i++) {
          const t = i / sr;
          n[i] *= (0.55 + 0.45 * Math.sin(t * 17.3 + v)) * Math.min(1, t * 8);
        }
        envAD(n, sr, 0.05, 0.16, 0.06, 1);
        mixInto(b, n, 0.30, Math.round(0.235 * sr));
      }
      saturate(b, 1.5, 0.35);        // close is never clean
      biquad(b, sr, 'hp', 52, 0.7);
      biquad(b, sr, 'lp', 4200, 0.7);
      fadeOut(b, sr, 0.05);
      reg('dr_witnessed' + v, [normalizeTo(b, 0.94)]);
    }

    // MIMIC has no bake of its own on purpose: it plays the exact buffer your
    // own last footstep used (bed.lastStepBuffer()), because a copy of you is a
    // far stronger idea than a stranger's step, and the copy has to be exact.

    this._verifyDread();
  }

  /**
   * EVERY ROW IN THE TABLE MUST HAVE LANDED. A row whose bake is missing plays
   * nothing at all, which is the same class of failure as a name with no row and
   * is even harder to see: `dreadUnknown` stays zero and the beat is simply
   * silent. Counted, named on state(), and warned once — never thrown, because
   * audio may not be the reason the game refuses to boot.
   */
  _verifyDread() {
    this._missingBakes.length = 0;
    for (const k in DREAD) {
      const d = DREAD[k];
      if (d.mimic) continue;                       // mimic borrows your footstep
      const n = d.v > 0 ? d.n + '0' : d.n;
      if (!this.buf[n]) this._missingBakes.push(k);
    }
    if (this._missingBakes.length && typeof console !== 'undefined' && console.warn) {
      console.warn('[audio] dread rows with no bake: ' + this._missingBakes.join(', ')
        + ' — a beat with no bake is a silent beat.');
    }
  }

  /* -------------------------------------------------------- whisper bakes -- */

  /**
   * A BREATHED WORD, not a word. Whispered speech has no pitch at all: it is
   * noise through a mouth, and what makes it read as language rather than as a
   * hiss is (a) two formants instead of one, (b) syllables that OPEN and CLOSE,
   * and (c) a fricative onset in front of each vowel.
   *
   * Everything here is kept under the 1.6 kHz mix lowpass, fricatives included.
   * THE MIX LAW is not suspended for the naming mechanism: 2.5-5.5 kHz belongs
   * to EARSHOT, and a whisper shouting into it would cost the rear ticker the
   * one channel that makes it work.
   */
  _bakeWhisper() {
    const sr = Math.max(16000, Math.round(this.sr / 2));
    const r = this.ctx.rng.fork('audio:whisper');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);
    const reg = (n, ch) => this.reg(n, ch, sr);

    // one syllable: a fricative, then a two-formant vowel that opens and shuts
    const syllable = (len, f1, f2, open) => {
      const n = N(len);
      const src = new Float32Array(n); noiseFill(src, rn);
      const a = new Float32Array(n); a.set(src);
      const c = new Float32Array(n); c.set(src);
      biquad(a, sr, 'bp', f1, 6.0); biquad(a, sr, 'bp', f1, 6.0);
      biquad(c, sr, 'bp', f2, 5.0); biquad(c, sr, 'bp', f2, 5.0);
      const out = new Float32Array(n);
      // F2 is the half that carries the vowel identity, so it is never a trim.
      for (let i = 0; i < n; i++) out[i] = a[i] + c[i] * 0.62;
      for (let i = 0; i < n; i++) {
        const u = i / n;
        out[i] *= Math.pow(Math.sin(Math.PI * u), open);
      }
      return out;
    };
    const fricative = (len, hz) => {
      const n = N(len);
      const f = new Float32Array(n); noiseFill(f, rn);
      biquad(f, sr, 'bp', hz, 1.1);
      envAD(f, sr, 0.006, len * 0.34);
      return f;
    };

    for (let v = 0; v < WHISPER_WORDS; v++) {
      const syll = 1 + (v % 3);
      const b = new Float32Array(N(0.30 + syll * 0.24));
      let at = 0.02;
      for (let s = 0; s < syll; s++) {
        const F = WH_FORMANTS[(v * 2 + s) % WH_FORMANTS.length];
        const len = 0.13 + rn() * 0.08;
        // the fricative sits UNDER 2.5 kHz: a whisper, not a hiss in EARSHOT's band
        mixInto(b, fricative(0.045, 1900 + rn() * 500), 0.30, Math.round(at * sr));
        mixInto(b, syllable(len, F[0], F[1], 1.1 + rn() * 0.5), 0.9 - s * 0.12, Math.round((at + 0.026) * sr));
        at += len + 0.055 + rn() * 0.035;
      }
      // the breath the word rode out on, still going after the word has stopped
      const tail = new Float32Array(N(0.26));
      noiseFill(tail, rn);
      biquad(tail, sr, 'bp', 620, 0.9);
      envAD(tail, sr, 0.05, 0.10);
      mixInto(b, tail, 0.16, Math.round(at * sr));
      biquad(b, sr, 'hp', 190, 0.7);
      biquad(b, sr, 'lp', 2400, 0.7, 0, 2);
      fadeOut(b, sr, 0.05);
      reg('wh_name' + v, [normalizeTo(b, 0.72)]);
    }

    // THE CLAIM. The same mouth, but it lands rather than trails: one long
    // syllable that falls, and a breath that finishes instead of hanging.
    for (let v = 0; v < WHISPER_CLAIMS; v++) {
      const b = new Float32Array(N(1.30));
      const F = WH_FORMANTS[(v * 3) % WH_FORMANTS.length];
      mixInto(b, fricative(0.06, 1700 + v * 260), 0.26, Math.round(0.02 * sr));
      mixInto(b, syllable(0.46, F[0], F[1], 0.85), 0.95, Math.round(0.05 * sr));
      // the fall: the second formant slides down, which is what "settled" sounds
      // like in a voice with no pitch to fall
      const s2 = syllable(0.40, F[0] * 0.86, F[1] * 0.70, 1.5);
      mixInto(b, s2, 0.65, Math.round(0.46 * sr));
      const tail = new Float32Array(N(0.36));
      noiseFill(tail, rn); biquad(tail, sr, 'bp', 520, 0.8);
      envAD(tail, sr, 0.08, 0.13);
      mixInto(b, tail, 0.20, Math.round(0.84 * sr));
      biquad(b, sr, 'hp', 170, 0.7);
      biquad(b, sr, 'lp', 2200, 0.7, 0, 2);
      fadeOut(b, sr, 0.10);
      reg('wh_claim' + v, [normalizeTo(b, 0.78)]);
    }

    // THE BELL. OFF-SEASON's law: "the bell is the one ADDED sound, and it reads
    // as grace precisely because the mix taught the player that subtraction is
    // the law." So it is the only thing in this lane that is allowed to be a
    // pitched, ringing, beautiful object — five inharmonic partials off a real
    // bell's ratios, with a strike transient and a hum that outlives all of it.
    {
      const b = new Float32Array(N(4.0));
      const f = 262;                                     // the prime
      const P = [[0.500, 0.55, 3.4], [1.000, 1.00, 2.6], [1.183, 0.42, 1.9],
                 [1.506, 0.30, 1.4], [2.000, 0.26, 1.0], [2.514, 0.14, 0.6]];
      for (let i = 0; i < P.length; i++) {
        damped(b, sr, f * P[i][0], P[i][2], P[i][1]);
        // a second, cent-detuned partner per partial IS the beating of a bell
        damped(b, sr, f * P[i][0] * 1.0018, P[i][2] * 0.92, P[i][1] * 0.55, 1.1);
      }
      const strike = new Float32Array(N(0.05));
      noiseFill(strike, rn);
      biquad(strike, sr, 'bp', 2100, 1.0);
      envAD(strike, sr, 0.0008, 0.010);
      mixInto(b, strike, 0.35);
      biquad(b, sr, 'hp', 110, 0.7);
      fadeOut(b, sr, 0.35);
      reg('wh_bell', [normalizeTo(b, 0.90)]);
    }
  }

  /* --------------------------------------------------------------- probes -- */

  // Aliases for the probes in tests/audio.mjs. `this.ctx` is the GAME ctx bag,
  // because CONTRACT says every system is `constructor(ctx) { this.ctx = ctx; }`
  // — the AudioContext is `actx`, and these three names all reach it.
  get audioCtx() { return this.actx; }
  get context() { return this.actx; }
  get panningModel() { return 'HRTF'; }

  /** Voices currently sounding, across both pools. */
  voiceCount() {
    let n = 0;
    if (!this.pool) return 0;
    for (let i = 0; i < this.pool.length; i++) if (this.pool[i].busy) n++;
    for (let i = 0; i < this.flat.length; i++) if (this.flat[i].busy) n++;
    return n;
  }

  /** Total sounds scheduled since boot — a shot that schedules nothing is silence. */
  scheduled() { return this._stats.plays; }

  /** Live tuning from __CURFEW.config({ audio: {...} }). Never a shipping default. */
  config(patch) {
    const a = patch && patch.audio;
    if (!a) return;
    if (a.master !== undefined) this.setMasterVolume(a.master);
    if (a.mute !== undefined) this.mute(!!a.mute);
    // A/B the tension link by hand: config({ audio: { tension: 0.8 } }) closes the
    // world in without waiting for the director to be frightened of anything.
    if (a.tension !== undefined) this.setTension(a.tension);
    if (a.bedLowpass !== undefined) this.setBedLowpass(a.bedLowpass);
    if (this.bed && a.bed) this.bed.config(a.bed);
  }

  /** The test surface. tests/audio.mjs reads exactly this. */
  state() {
    return {
      enabled: this.enabled,
      running: !!(this.actx && this.actx.state === 'running'),
      contextState: this.actx ? this.actx.state : 'none',
      baked: this.baked,
      silent: this.silent,
      voices: this._stats.voices,
      peakVoices: this._stats.peakVoices,
      steals: this._stats.steals,
      reclaims: this._stats.reclaims,
      plays: this._stats.plays,
      dread: this._stats.dread,
      // THE GATE READS THESE THREE. `dreadUnknown` must be zero: a beat the
      // director scheduled that this lane could not name played a branch snap
      // instead, and the names say which bake is missing. `dreadMissingBakes`
      // catches the other half — a row that exists but whose buffer never landed.
      dreadUnknown: this._stats.dreadUnknown,
      lastUnknownDread: this._lastUnknownDread,
      dreadUnknownNames: Object.keys(this._unknownDread),
      dreadMissingBakes: this._missingBakes.slice(),
      tension: +this.tension.toFixed(3),
      bedLpHz: Math.round(this._bedLPHz),
      bedLpTargetHz: Math.round(this._bedLPTarget),
      whispers: this._stats.whispers,
      rays: this._stats.rays,
      occHits: this._stats.occHits,
      openness: +this._open.toFixed(3),
      reflexDb: +this._reflexDb.toFixed(2),
      buffers: Object.keys(this.buf).length,
      updMs: +this._stats.updMs.toFixed(3),
      bed: this.bed ? this.bed.state() : null,
      earshot: this.earshot ? this.earshot.state() : null,
    };
  }
}

export default Audio;
