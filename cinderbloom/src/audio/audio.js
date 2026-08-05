// =============================================================================
// CINDERBLOOM — AUDIO GRAPH, HRTF, REVERB ZONES, OCCLUSION, MIXING, AMBIENCE
// src/audio/audio.js   (owner: audio agent — CONTRACT §4)
// Implements docs/COMBAT_FEEL.md §5. Weapon layers live in ./guns.js.
//
// EVERYTHING IS SYNTHESISED. There are no sample files and none may be fetched
// (CONTRACT §1). Every buffer in this process is a Float32Array filled by the
// DSP toolkit at the bottom-of-boot bake task, from ctx.rng forks only.
//
// -----------------------------------------------------------------------------
// THE GRAPH
// -----------------------------------------------------------------------------
//
//   [ voices ] --+--> busWeapons --------------------------+
//                +--> busWorld ----> duck ----------------+|
//                +--> busCreatures -----------------------+|
//                +--> busUI ------> uiDuck ---------------+|
//                                                          v
//                                                    dipEQ (400 Hz, Q 1.1)
//                                                          |
//   [ shot BODY layer only ] --> bodyShelf (+2 dB 3k5) --> preMaster
//   [ reverb returns ] ----------------------------------> preMaster
//                                                          |
//                              reflexGain (auditory reflex, §5.4)
//                                                          |
//                              reflexLP  (1.6 kHz under sustained fire)
//                                                          |
//                       clipper (zero-latency soft-knee ceiling; see limitCurve)
//                                                          |
//                              master --> destination
//
// The body layer bypasses `dipEQ` on purpose: §5.3's "punch move" carves 3.5 dB
// at 400 Hz out of EVERYTHING EXCEPT the shot's own body for 120 ms. That is
// what makes a gunshot read as punch rather than as loud, and routing it any
// other way silently deletes the highest-value line item in §5.
//
// Reverb: three convolution sends (small 0.4 s / medium 1.1 s / open 2.4 s),
// blended per frame from the same 6-ray openness probe that selects the gunshot
// tail (§5.2/§5.5). IRs are synthesised at boot.
//
// -----------------------------------------------------------------------------
// PUBLIC API  (ctx.sys.audio)
// -----------------------------------------------------------------------------
//   resume()                              — kick the AudioContext (needs a gesture)
//   shot(o)                               — see guns.js; o = {x,y,z,weapon,ammo,
//                                           subT,player,indoorHint}
//   impact(surface, x,y,z, o)             — §4.5 surface-specific impact
//   ricochet(x,y,z), whizz(x,y,z,dist)
//   reloadCue(name, o)                    — 'magRelease'|'magDrop'|'magIn'|
//                                           'magSeat'|'boltRelease'|'boltLock'|
//                                           'tug'|'dryClick'|'swapOut'|'swapIn'
//   hitmarker(kind)                       — 'hit'|'weak'|'deflect'|'kill'
//   footstep(o)                           — normally self-driven from the bob phase
//   land(vy), jump(), turnFoley(), weaponFoley()
//   vocal(kind, x,y,z, o)                 — creature calls, HRTF-panned
//   creatureStep(kind, pos, weightKg, landing)  — mass-classed creature footfall
//   creatureStrike(kind,pos,o) / creatureSpit(kind,pos,o) / creaturePain(kind,pos,o)
//   playerHit(amount, o)                  — the player taking damage; o.fatal for death
//   rumble(ms, gain)                      — director ground event
//   cue(name, o)                          — director cue names -> sounds
//   setTension(0..1)                      — director intensity; drives the drone bed
//   play(name, o)                         — generic one-shot by buffer name
//   playAt(name, x,y,z, o)                — generic positional one-shot
//   setMasterVolume(v) / mute(b)
//   openness()                            — 0..1, live
//   surfaceAt(x,z)                        — 'ash'|'rock'|'duff'|'glass'|'mud'|'water'|'metal'
//   debugInfo() / analyse(name) / bufferNames()
//   renderProbe({seconds,script,ambient}) — OFFLINE render of the real graph
//   measureRender(buf, windows)           — numbers out of a rendered probe
//   magazineTest({n,rpm,weapon})          — §5.1's anti-machine-gun rule, measured
//
// The last three are the only way anyone can evaluate this file: the harness
// runs Chrome with --mute-audio and nobody will ever hear the build. See
// renderProbe's own comment, and tools/audioprobe.mjs.
//
// KNOBS: ctx.debug.audio (see _knobs() below). Live-editable, no reload.
//
// -----------------------------------------------------------------------------
// DETERMINISM AND THE HARNESS
// -----------------------------------------------------------------------------
// `__CB.advance(n)` runs hundreds of sim steps inside one wall-clock frame, and
// `gotoVista` runs 30. Scheduling audio from those would queue minutes of sound
// in milliseconds. `_clock()` detects the fast-forward (sim time outrunning wall
// time) and sets `this.silent`, so state machines still advance and nothing is
// scheduled. That is also why a smoke run is quiet: this is deliberate.
//
// All randomness is ctx.rng.fork(...). Audio never touches the root stream, so
// adding a layer here cannot shift the recoil pattern or the flora scatter.
// =============================================================================
import * as THREE from 'three';
import { clamp, sat, lerp } from '../util/math.js';
import { GunAudio } from './guns.js';

export const dB = (x) => Math.pow(10, x / 20);

// =============================================================================
// DSP TOOLKIT — offline, operates on plain Float32Arrays at the device rate.
// Exported as *function declarations* so guns.js can import them across the
// (deliberate, two-file) module cycle without hitting a TDZ.
// =============================================================================

/** Deterministic white noise into an existing array. */
export function noiseFill(out, rnd, amp = 1) {
  for (let i = 0; i < out.length; i++) out[i] = (rnd() * 2 - 1) * amp;
  return out;
}

/** Voss-ish pink noise (3 octaves of decaying one-poles). Cheap and good. */
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

/** Brown/red noise — integrated white with a leak. The bass of wind. */
export function brownFill(out, rnd, amp = 1) {
  let s = 0;
  for (let i = 0; i < out.length; i++) {
    s = s * 0.998 + (rnd() * 2 - 1) * 0.035;
    out[i] = s * 8 * amp;
  }
  return out;
}

/** RBJ cookbook biquad coefficients. type: lp hp bp notch peak lowshelf highshelf */
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

/** In-place biquad. Runs twice when `passes` is 2 (24 dB/oct). */
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
 * In-place biquad whose cutoff sweeps f0 -> f1 over `sweepSec` (then holds f1).
 * Coefficients are recomputed every 32 samples — inaudible stepping, ~30x
 * cheaper than per-sample. This is what gives the gunshot body its downward
 * spectral collapse; a static filter reads as a noise burst.
 */
export function biquadSweep(buf, sr, type, f0, f1, Q, sweepSec, curve = 2.0) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const n = buf.length, blk = 32;
  const sweepN = Math.max(1, sweepSec * sr);
  let c = biquadCoeffs(type, sr, f0, Q);
  for (let i = 0; i < n; i++) {
    if ((i & (blk - 1)) === 0) {
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

/**
 * Attack/exponential-decay envelope, in place.
 * `tau` is the decay time constant in seconds (amplitude e-folds).
 * `hold` delays the decay. `shape` > 1 sharpens the attack.
 */
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

/** Fade the last `sec` to zero so a buffer never clicks on its own tail. */
export function fadeOut(buf, sr, sec = 0.008) {
  const n = Math.min(buf.length, Math.max(1, Math.round(sec * sr)));
  const s = buf.length - n;
  for (let i = 0; i < n; i++) buf[s + i] *= 1 - i / n;
  return buf;
}

/**
 * Add an exponentially damped sine — the atom of every metallic ping.
 * Inner loop is a rotating phasor plus one multiply: no Math.sin, no Math.exp
 * per sample. Over 900+ of these at boot that is the difference between a
 * 1.4 s bake and a 0.4 s one, and the phasor's amplitude drift over 100 k
 * samples is ~1e-11 in doubles.
 */
export function damped(buf, sr, freq, tau, amp = 1, phase = 0, at = 0) {
  const s = Math.round(at * sr);
  if (s >= buf.length) return buf;
  const w = 2 * Math.PI * freq / sr;
  const cw = Math.cos(w), sw = Math.sin(w);
  const dec = Math.exp(-1 / (tau * sr));
  let re = Math.cos(phase), im = Math.sin(phase), e = amp;
  const floor = amp * 1e-4;
  for (let i = s; i < buf.length; i++) {
    if (e < floor && e > -floor) break;
    buf[i] += im * e;
    const nr = re * cw - im * sw;
    im = re * sw + im * cw; re = nr;
    e *= dec;
  }
  return buf;
}

/**
 * Add a swept sine (exponential frequency glide). The low core of a gunshot and
 * the whole voice of every creature. Frequency is stepped once per 32-sample
 * block — inaudible, and it keeps Math.pow out of the inner loop.
 */
export function sweepSine(buf, sr, f0, f1, sweepSec, tau, amp = 1, at = 0) {
  const s = Math.round(at * sr);
  if (s >= buf.length) return buf;
  const sweepN = Math.max(1, Math.round(sweepSec * sr));
  const dec = Math.exp(-1 / (tau * sr));
  const k2 = 2 * Math.PI / sr;
  let e = amp, re = 1, im = 0, cw = 1, sw = 0;
  const floor = amp * 1e-4;
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
 * Scatter `count` short noise grains with a decaying density. This is how every
 * granular surface in the game is made — ash crunch, duff, clinker, gear
 * rattle. A single filtered noise burst reads as a hiss; grains read as
 * *particles*, which is what a boot on volcanic ash actually is.
 */
export function grains(buf, sr, rnd, {
  count = 14, from = 0, span = 0.16, len = [0.0018, 0.006],
  amp = 1, decay = 1.6, hp = 700, lp = 6000,
} = {}) {
  const tmp = new Float32Array(Math.ceil(len[1] * sr) + 4);
  for (let g = 0; g < count; g++) {
    // The FIRST grain always lands on `from`. Without this the scatter leaves a
    // random 0-40 ms hole at the head and a footstep audibly trails the
    // footfall by two frames — measured at 35 ms on `step_ash` before the fix,
    // which is exactly the kind of thing that reads as "floaty" (§1.4).
    const u = g === 0 ? 0 : Math.pow(rnd(), 0.7);
    const at = from + u * span;
    const gl = Math.max(2, Math.round((len[0] + rnd() * (len[1] - len[0])) * sr));
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

/**
 * tanh drive — a real gunshot is a clipped acoustic event, not a clean sum.
 * Padé-ish tanh: Math.tanh is ~100 ns and this runs over ~1.5 M samples at
 * boot, which measured as 100 ms of the bake for no audible benefit.
 */
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

export function rmsOf(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, buf.length));
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

/**
 * Soft-knee limiter curve for a WaveShaperNode.
 *
 * Chrome's `DynamicsCompressorNode` carries a fixed ~6 ms pre-delay — measured,
 * not assumed: `tools/audioprobe.mjs shot` schedules a shot at 208.7 ms and the
 * first energy leaves the master at 214.69 ms. That is a third of a frame added
 * to EVERY sound in the game, on a build whose gunfire is scheduled to the
 * sub-frame because COMBAT_FEEL §3.2 says that is "worth more to perceived
 * quality than any single graphics feature in this repo". A WaveShaper is a
 * static nonlinearity and has none.
 *
 * The curve is the identity below `a` (so ordinary material passes through
 * bit-exact — this is not a distortion box) and then bends onto an exponential
 * approach to the ceiling `C`. Continuous in value AND in slope at `a`, which
 * is what stops the knee from being audible as a click on the transient that
 * crosses it.
 */
export const LIMIT_HEADROOM = 3;      // +9.5 dBFS of overshoot handled smoothly

export function limitCurve(n = 8193, a = 0.55, C = 0.94, H = LIMIT_HEADROOM) {
  const out = new Float32Array(n);
  // A WaveShaper's curve domain is EXACTLY [-1, 1]; inputs outside it are
  // clamped to the endpoints. So the headroom cannot live inside the curve —
  // it has to be a trim gain in front (1/H) and a makeup gain behind (H), with
  // the curve written in trimmed units. Putting the /H inside the curve instead
  // silently multiplies the whole mix by H: the first version of this function
  // did exactly that, and `tools/audioprobe.mjs mag` caught it as +7.7 dB of
  // RMS, every shot pinned to an identical -1.91 dBFS peak, and — the real
  // damage — §5.4's auditory reflex measuring 0.06 dB of accumulation over 30
  // rounds instead of the specified 6 dB, because a limiter riding the ceiling
  // erases any gain change upstream of it.
  const aU = a / H, k = C / H - aU;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const s = u < 0 ? -1 : 1, au = Math.abs(u);
    out[i] = s * (au <= aU ? au : aU + k * (1 - Math.exp(-(au - aU) / k)));
  }
  return out;
}

/**
 * Synthesised impulse response: a handful of early reflections over an
 * exponentially decaying, frequency-damped noise cloud, decorrelated L/R.
 * `early` is a list of [timeSec, gain] taps measured from the openness probe.
 */
export function makeIR(actx, sr, rnd, {
  seconds = 1.1, tau = 0.24, damp = 5200, lowCut = 90, early = [], diffusion = 0.020, gain = 1,
} = {}) {
  const n = Math.max(16, Math.round(seconds * sr));
  const ch = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) {
    const b = ch[c];
    noiseFill(b, rnd);
    // Diffusion build: real rooms do not start at full density.
    const bN = Math.max(1, diffusion * sr);
    for (let i = 0; i < n; i++) {
      const build = i < bN ? (i / bN) * (i / bN) : 1;
      b[i] *= build * Math.exp(-i / (tau * sr));
    }
    biquad(b, sr, 'lp', damp * (c ? 0.94 : 1.06), 0.7);
    biquad(b, sr, 'hp', lowCut, 0.7);
    for (const [t, g] of early) {
      const s = Math.round(t * sr * (c ? 1.011 : 1.0));
      if (s < n - 8) {
        // a tap is a short filtered burst, not a naked click
        for (let i = 0; i < 40 && s + i < n; i++) {
          b[s + i] += (rnd() * 2 - 1) * g * Math.exp(-i / 9);
        }
      }
    }
    fadeOut(b, sr, Math.min(0.05, seconds * 0.15));
    gainBuf(b, gain);
  }
  return toAudioBuffer(actx, ch, sr);
}

// =============================================================================
// SURFACE TABLE — what the ground sounds like. Keys are used by footsteps and
// by combat.js's impact routing (§4.5). Kept small on purpose: a player has to
// be able to hear the difference, and seven is already generous.
// =============================================================================
export const SURFACES = ['ash', 'rock', 'duff', 'glass', 'mud', 'water', 'metal'];

// terrain biome id -> footstep surface. Six biomes, see world/terrain.js BIOMES.
const BIOME_SURFACE = ['ash', 'duff', 'rock', 'glass', 'ash', 'ash'];

// Per-surface footstep trim (playtest 2026-08-01: "footsteps too loud SOME of
// the time" — the some is state- and surface-dependent). Every surface buffer
// is normalised to the same PEAK, but equal peak is not equal loudness: the
// audioprobe `step` battery measured mud +3.3 dB peak / +4.8 dB rms over ash,
// metal +1.9/+2.5, duff +1.9/+1.6, water +1.8/+2.1. These trims bring every
// surface back to the ash reference; they are measured numbers, not taste.
const STEP_TRIM = { ash: 1.0, rock: 0.93, duff: 0.82, glass: 0.95, mud: 0.63, water: 0.79, metal: 0.78 };

// =============================================================================
export class Audio {
  static id = 'audio';
  static deps = [];

  constructor(ctx) {
    this.ctx = ctx;
    this.enabled = false;
    this.baked = false;
    this.silent = true;
    this.now = 0;

    this.actx = null;
    this.buf = Object.create(null);        // name -> AudioBuffer
    this.guns = null;

    this._sched = 0;
    this._lw = 0;
    this._tight = 0;
    this._accSim = 0; this._accWall = 0; this._rate = 1;

    // stride / footsteps
    this._tc = 0;                 // our own copy of the bob phase clock (§1.4)
    this._lastFootPhase = 0;
    this._stepCount = 0;
    this._ownStride = true;       // false once player.js publishes a phase

    // foley rate limits
    this._turnCool = 0; this._swayCool = 0; this._stepCool = 0;

    // own-footstep situational duck (playtest 2026-08-01): the player's own
    // noise must never mask threat audio. Stamped by punch() and by every
    // creature sound that actually plays.
    this._lastShotT = -999; this._lastThreatT = -999;

    // per-creature idle-vocal cadence (ear-tracking; see _updateCreatureCalls)
    this._ccall = new Map(); this._ccallSweep = 0;

    // auditory reflex (§5.4)
    this._reflexDb = 0; this._roundsRecent = []; this._reflexLPHz = 20000;

    // openness probe (§5.2)
    this._open = 0.55; this._openTarget = 0.55;
    this._early = [[0.090, 0.30], [0.210, 0.18]];
    this._probeAge = 999;

    // ambience state
    this._amb = null;
    this._weather = 'clear';
    this._biome = 'basin';
    this._wetness = 0; this._waterNear = 999;
    this._callTimer = 6.0;

    // scratch — zero allocation in the hot path
    this._v = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._hit = {};
    this._bq = { w: new Float32Array(6) };
    this._occCache = new Map();
    this._occAge = 0; this._occCx = 1e9; this._occCz = 1e9;
    this._rayBudget = 0;
    this._tension = 0; this._tensionTarget = 0;
    this._emit = null;                     // positional ambient emitters
    this._emitT = 0;
    this._stats = {
      voices: 0, peakVoices: 0, plays: 0, shots: 0, steps: 0, rays: 0,
      steals: 0, reclaims: 0, occHits: 0, updMs: 0,
    };
  }

  // ---------------------------------------------------------------------------
  async init() {
    const ctx = this.ctx;
    this.terrain = ctx.sys.terrain || null;
    this.props = ctx.sys.props || null;
    this.water = ctx.sys.water || null;
    this.player = ctx.sys.player || null;
    this.sky = ctx.sys.sky || null;
    this.weapons = ctx.sys.weapons || null;

    this.rng = ctx.rng.fork('audio');
    this.rngCall = ctx.rng.fork('audioCalls');
    this.rngStep = ctx.rng.fork('audioSteps');

    this._knobs();

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('[audio] WebAudio unavailable — audio disabled'); return; }
    try {
      this.actx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      console.warn('[audio] AudioContext construction failed:', e && e.message);
      return;
    }
    this.sr = this.actx.sampleRate;
    this.enabled = true;

    this._buildGraph();
    this.guns = new GunAudio(this);

    // Autoplay policy: the context boots suspended unless the page has a
    // gesture (or Chrome is launched with --autoplay-policy). Never throw here.
    this._armResume();

    // Heavy synthesis goes on the budgeted boot queue, not in init(), so the
    // loading bar stays honest (CONTRACT §1).
    // Split across four queue items on purpose: BootQueue awaits a rAF between
    // items, so the loading bar keeps painting instead of the tab hanging for
    // ~700 ms in one block (CONTRACT §1, "budgeted async task queue").
    const P = this.bakeParts = {};
    let t0 = 0;
    const part = (label, fn, w) => ctx.boot.task('audio: ' + label, async () => {
      if (!t0) t0 = performance.now();
      const a = performance.now(); fn(); P[label] = +(performance.now() - a).toFixed(1);
      this.bakeMs = +(performance.now() - t0).toFixed(1);
    }, w);
    part('ambience', () => { this._bakeAmbient(); this._bakeUI(); }, 1);
    part('foley', () => { this._bakeFootsteps(); this._bakeVocals(); }, 1);
    part('creatures', () => this._bakeCreatures(), 1);
    part('loops', () => this._bakeWorld(), 1);
    part('weapons', () => this.guns.bake(), 2);
    part('reverb', () => {
      this._bakeIRs();
      this._startAmbient();
      this._startEmitters();
      this.baked = true;
    }, 1);

    this._wireBus();

    // The rest of the armoury, after the loading bar is gone. See
    // guns.js:bake() — this is 340 ms of the boot budget that does not have to
    // be spent before the first frame, and `shot()` force-bakes on demand if
    // something fires a marksman rifle in the first two seconds anyway.
    this.ctx.bus.on('ready', () => {
      if (this._armouryDone) return;
      this._armouryDone = true;
      const go = () => { try { this.armouryMs = this.guns.bakeArmoury(); } catch (e) { void e; } };
      if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 2500 });
      else setTimeout(go, 400);
    });
  }

  // ---------------------------------------------------------------------------
  _knobs() {
    const k = this.ctx.debug.audio = this.ctx.debug.audio || {};
    const d = (n, v) => { if (k[n] === undefined) k[n] = v; };
    d('master', 0.85);
    d('mute', false);
    d('weapons', 1.0); d('world', 0.85); d('creatures', 1.0); d('ui', 0.9);
    d('ambient', 1.0);
    d('reverb', 1.0);
    d('punchDuckDb', 5.0);      // COMBAT_FEEL §8
    d('punchDipDb', 3.5);
    d('reflexDb', 2.5);         // §5.4 per-shot broadband dip
    d('reflexCapDb', 6.0);
    d('footstepGain', 1.0);
    d('gearGain', 1.0);
    // Own-footstep mix policy (playtest 2026-08-01). Shipped-FPS practice: own
    // steps sit 6-10 dB below "realistic" because the player's brain supplies
    // them. stepOwnDb is the standing trim; the duck knobs are SITUATIONAL and
    // stack on it — combat = player fired within 2.5 s, threat = any creature
    // sound audible within 2.0 s. Own noise must never mask threat audio.
    d('stepOwnDb', 4.0);
    d('stepCombatDuckDb', 6.0);
    d('stepThreatDuckDb', 3.5);
    d('creatureCallRate', 1.0);  // live-creature vocal cadence; 0 disables
    d('creatureGain', 1.0);     // creature foley (steps/strike/pain), not vocals
    d('emitterGain', 1.0);      // positional ambient emitters
    d('tensionGain', 1.0);      // director tension bed; 0 removes it entirely
    d('biomeReverb', 1.0);      // per-biome reverb-return tone shaping, 0..1
    d('occlusionDb', 7.0);
    d('occlusionHz', 900);
    d('airAbsorption', 55.0);   // metres; cutoff = 20000*exp(-d/K)
    d('hrtf', true);
    // 'clip' = zero-latency WaveShaper ceiling (default). 'comp' = Chrome's
    // DynamicsCompressor, gentler under a sustained wall of tails but it adds a
    // MEASURED 6.0 ms of pre-delay to every sound in the game. Read at graph
    // build time only — set it before boot, or call _buildGraph again.
    d('limiter', 'clip');
    d('maxOcclusionRays', 8);
    d('voiceLimit', 40);
    d('propagation', true);     // +d/343 s for non-player shooters
    // Additive push on the 6-ray openness probe, -1..+1. Thessaly-9 has no
    // enclosed volumes yet, so the probe never reaches the < 0.25 "indoor"
    // band on its own; a scripted interior sets this (or passes
    // `shot({indoor})`) until there is geometry that measures as one.
    d('opennessBias', 0);
    d('callRate', 1.0);         // distant creature call density
    return k;
  }

  get K() { return this.ctx.debug.audio; }

  // ---------------------------------------------------------------------------
  // Graph
  // ---------------------------------------------------------------------------
  _buildGraph() {
    const c = this.actx;
    const g = (v) => { const n = c.createGain(); n.gain.value = v; return n; };

    this.master = g(this.K.master);
    // Zero-latency soft-knee ceiling (see limitCurve). `oversample` stays
    // 'none' deliberately: Chrome's oversampling path runs a polyphase filter
    // and reintroduces exactly the latency this node exists to avoid, and with
    // a C1-continuous soft knee there is almost nothing to alias.
    this.clipTrim = g(1 / LIMIT_HEADROOM);
    this.clipper = c.createWaveShaper();
    this.clipper.curve = limitCurve();
    this.clipper.oversample = 'none';
    this.clipMakeup = g(LIMIT_HEADROOM);
    this.clipTrim.connect(this.clipper);
    this.clipper.connect(this.clipMakeup);
    // The transparent-but-late alternative, kept because it IS gentler on a
    // sustained 30-round wall of tails; ctx.debug.audio.limiter = 'comp'.
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -7;
    this.limiter.knee.value = 2;
    this.limiter.ratio.value = 16;
    this.limiter.attack.value = 0.0025;
    this.limiter.release.value = 0.16;

    this.reflexLP = c.createBiquadFilter();
    this.reflexLP.type = 'lowpass';
    this.reflexLP.frequency.value = 20000;
    this.reflexLP.Q.value = 0.5;

    this.reflexGain = g(1);
    this.preMaster = g(1);

    // The 400 Hz punch carve. Everything except a shot's own body goes here.
    this.dipEQ = c.createBiquadFilter();
    this.dipEQ.type = 'peaking';
    this.dipEQ.frequency.value = 400;
    this.dipEQ.Q.value = 1.1;
    this.dipEQ.gain.value = 0;

    // +2 dB shelf at 3.5 kHz, body layer only (§5.3 item 3).
    this.bodyShelf = c.createBiquadFilter();
    this.bodyShelf.type = 'highshelf';
    this.bodyShelf.frequency.value = 3500;
    this.bodyShelf.gain.value = 2.0;

    this.busWeapons = g(this.K.weapons);
    this.busWorld = g(this.K.world);
    this.busCreatures = g(this.K.creatures);
    this.busUI = g(this.K.ui);
    this.duck = g(1);       // §5.3 item 1 — ambience/music sidechain
    this.uiDuck = g(1);     // §4.6 — hitmarkers ducked under sustained fire
    this.busBody = g(1);    // shot body layers, dip-bypassed

    this.master.connect(c.destination);
    if (this.K.limiter === 'comp') {
      this.limiter.connect(this.clipTrim);
      this.reflexLP.connect(this.limiter);
    } else {
      this.reflexLP.connect(this.clipTrim);
    }
    this.clipMakeup.connect(this.master);
    this.reflexGain.connect(this.reflexLP);
    this.preMaster.connect(this.reflexGain);
    this.dipEQ.connect(this.preMaster);
    this.bodyShelf.connect(this.preMaster);

    this.busWeapons.connect(this.dipEQ);
    this.busCreatures.connect(this.dipEQ);
    this.busWorld.connect(this.duck); this.duck.connect(this.dipEQ);
    this.busUI.connect(this.uiDuck); this.uiDuck.connect(this.dipEQ);
    this.busBody.connect(this.bodyShelf);

    // --- reverb sends -------------------------------------------------------
    // Two shelves on the RETURN give every biome its own reverb tone for the
    // price of two biquads. Openness alone (which is all that selects the IR
    // blend) cannot tell a wick stand from a rock bench: both measure ~0.5 and
    // both got the identical medium convolution, so the forest and the open
    // basin sounded like the same room. A canopy absorbs high frequencies and
    // blackglass does the opposite; that difference is most of what a listener
    // uses to know where they are standing.
    this.reverbIn = g(1);
    this.revHi = c.createBiquadFilter();
    this.revHi.type = 'highshelf'; this.revHi.frequency.value = 3200; this.revHi.gain.value = 0;
    this.revLo = c.createBiquadFilter();
    this.revLo.type = 'lowshelf'; this.revLo.frequency.value = 170; this.revLo.gain.value = 0;
    this.reverbReturn = g(this.K.reverb);
    this.reverbReturn.connect(this.revHi);
    this.revHi.connect(this.revLo);
    this.revLo.connect(this.dipEQ);
    this.conv = {};
    for (const name of ['small', 'medium', 'open']) {
      const send = g(name === 'medium' ? 1 : 0);
      const cv = c.createConvolver();
      cv.normalize = true;
      const post = g(1);
      this.reverbIn.connect(send); send.connect(cv); cv.connect(post); post.connect(this.reverbReturn);
      this.conv[name] = { send, node: cv, post };
    }

    this._buildVoicePool(this._poolOverride ? this._poolOverride[0] : undefined,
      this._poolOverride ? this._poolOverride[1] : undefined);
    this.busses = {
      weapons: this.busWeapons, world: this.busWorld,
      creatures: this.busCreatures, ui: this.busUI, body: this.busBody,
    };
  }

  /**
   * VOICE POOL. A BufferSourceNode is one-shot by spec and must be allocated per
   * play, but everything downstream of it can be reused: that is 1 allocation
   * per sound instead of 6, which is what keeps the impact chain inside §4's
   * 0.30 ms budget and inside acceptance test 8's 64 KB.
   *
   * A released voice is DISCONNECTED from its bus. A disconnected subgraph is
   * not pulled by the audio thread, so 32 idle HRTF panners cost nothing.
   */
  _buildVoicePool(nPos = 40, nFlat = 48) {
    const c = this.actx;
    this.pool = []; this.flat = [];
    // NB: every chain ends in a dedicated `out` gain whose ONLY connection is
    // the bus. `_release` calls out.disconnect(), and disconnect() with no
    // argument drops *all* outgoing edges — routing the reverb send off the
    // same node would silently unwire it after the first play.
    // 40 positional / 32 flat. Sustained fire at 725 RPM holds ~30 voices at
    // once (a 1.25 s open tail overlaps 15 shots), and a burst plus impacts
    // plus footsteps plus creature calls measured a peak of 45.
    for (let i = 0; i < nPos; i++) {
      const air = c.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 20000; air.Q.value = 0.3;
      const occ = c.createBiquadFilter(); occ.type = 'lowpass'; occ.frequency.value = 20000; occ.Q.value = 0.4;
      const tone = c.createBiquadFilter(); tone.type = 'peaking'; tone.frequency.value = 1400; tone.Q.value = 2.2; tone.gain.value = 0;
      const gain = c.createGain(); gain.gain.value = 1;
      const pan = c.createPanner();
      pan.panningModel = 'HRTF';
      pan.distanceModel = 'inverse';
      pan.refDistance = 3.0; pan.rolloffFactor = 1.05; pan.maxDistance = 900;
      const send = c.createGain(); send.gain.value = 0;
      const out = c.createGain(); out.gain.value = 1;
      air.connect(occ); occ.connect(tone); tone.connect(gain);
      gain.connect(pan); pan.connect(out);
      gain.connect(send); send.connect(this.reverbIn);
      this.pool.push({ air, occ, tone, gain, pan, send, out, head: air, busy: false, id: i, t: 0, until: 0 });
    }
    // The flat pool is the BIGGER one: the local player's own weapon is
    // non-positional (it is at the listener), and one shot books body + up to
    // two crossfaded tails + two slapbacks + sub + mechanical = 7 flat voices
    // that live up to 1.25 s. At 725 RPM that is ~34 concurrent; 32 measured
    // 25 steals over a single magazine and a steal is an audible cut.
    for (let i = 0; i < nFlat; i++) {
      const air = c.createBiquadFilter(); air.type = 'lowpass'; air.frequency.value = 20000; air.Q.value = 0.3;
      const tone = c.createBiquadFilter(); tone.type = 'peaking'; tone.frequency.value = 1400; tone.Q.value = 2.2; tone.gain.value = 0;
      const gain = c.createGain(); gain.gain.value = 1;
      const send = c.createGain(); send.gain.value = 0;
      const out = c.createGain(); out.gain.value = 1;
      air.connect(tone); tone.connect(gain); gain.connect(out);
      gain.connect(send); send.connect(this.reverbIn);
      this.flat.push({ air, tone, gain, send, out, head: air, busy: false, id: i, t: 0, until: 0 });
    }
    this._applyQuality();
  }

  /**
   * Acquire a voice. Three tiers, in order:
   *
   *   1. an idle voice;
   *   2. a voice whose SCHEDULED END has already passed — finished, but still
   *      flagged busy because its `onended` has not been delivered yet. This is
   *      a free reclaim: nothing is cut, because there is nothing left to cut.
   *   3. a genuine steal of the oldest, which IS an audible cut.
   *
   * Tier 2 is not an optimisation, it is a correctness fix. `onended` is not a
   * guarantee — it is a task queued on the main thread, so under a frame spike
   * it arrives late and the pool reports itself full while most of it is silent;
   * and in an OfflineAudioContext (`renderProbe`) it never arrives at all, so
   * without tier 2 an offline 30-round magazine exhausted 48 voices after eight
   * rounds and then DELETED the first eight shots — a stolen offline voice is
   * `stop()`ped at currentTime 0, before rendering has begun. That artefact is
   * how this was found: the probe reported the carbine as a phase-locked drone
   * (waveCorr 0.80) while the two other weapons measured perfectly decorrelated.
   * The gun was fine. The pool was lying.
   */
  _acquire(positional, bus) {
    const list = positional ? this.pool : this.flat;
    const now = this.now;
    let v = null, done = null, oldest = null;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c.busy) { v = c; break; }
      if (c.until !== undefined && c.until <= now && (!done || c.until < done.until)) done = c;
      if (!oldest || c.t < oldest.t) oldest = c;
    }
    if (!v && done) { v = done; this._stats.reclaims++; }
    else if (!v) { v = oldest; this._stats.steals++; }
    if (!v) return null;
    if (v.busy) {
      // `onended` MUST be cleared before stop(): otherwise the old source's
      // ended callback fires a frame later, sees busy === true (it is — for the
      // NEW sound) and releases a voice that is mid-playback, double-
      // decrementing the counter and cutting a live layer.
      // stop(WHEN), never stop(). A bare stop() means "at currentTime", and
      // `this.now` runs ahead of currentTime by the scheduler's lookahead — so a
      // bare stop truncates the voice slightly BEFORE the point the mixer has
      // already committed to. Offline it is worse than slightly: currentTime is
      // 0 until rendering starts, so a bare stop retroactively erases the whole
      // sound from a render that has not happened yet.
      if (v.src) {
        v.src.onended = null;
        try { v.src.stop(Math.max(this.now, this.actx.currentTime)); } catch (e) { void e; }
      }
      try { v.out.disconnect(); } catch (e) { void e; }
      v.busy = false; v.src = null; this._stats.voices--;
    }
    v.busy = true; v.t = this.now;
    v.out.connect(bus);
    this._stats.voices++;
    if (this._stats.voices > this._stats.peakVoices) this._stats.peakVoices = this._stats.voices;
    return v;
  }

  _release(v) {
    if (!v.busy) return;
    v.busy = false; v.src = null;
    this._stats.voices--;
    try { v.out.disconnect(); } catch (e) { void e; }
  }

  _armResume() {
    const try_ = () => this.resume();
    this._resumeHandler = try_;
    for (const ev of ['pointerdown', 'keydown', 'mousedown', 'touchstart']) {
      window.addEventListener(ev, try_, { passive: true });
    }
    this.ctx.bus.on('pointerlock', try_);
    // `ready` and initial boot are lifecycle events, not trusted gestures.
    // Calling resume() from either one makes Chrome correctly reject autoplay
    // and leaves a warning in the console. The listeners above resume the
    // already-built context on the player's first real interaction instead.
  }

  resume() {
    if (!this.actx) return false;
    if (this.actx.state === 'suspended') this.actx.resume().catch(() => {});
    return this.actx.state === 'running';
  }

  setMasterVolume(v) { this.K.master = clamp(v, 0, 2); if (this.master) this.master.gain.value = this.K.mute ? 0 : this.K.master; return v; }
  mute(b = true) { this.K.mute = !!b; if (this.master) this.master.gain.value = b ? 0 : this.K.master; }

  // ---------------------------------------------------------------------------
  // Bus wiring. Sibling systems are being written concurrently; every one of
  // these is optional and the direct method calls work whether or not the event
  // is ever emitted. Names are documented in HANDOFF "## requests".
  // ---------------------------------------------------------------------------
  /**
   * BUS WIRING — and the single most expensive lesson in this file.
   *
   * Audio subscribed to a vocabulary it invented (`impact`, `hitmarker`,
   * `enemy:death`, `reload`) while weapons.js / combat.js / enemies.js /
   * director.js emitted a completely different one (`combat:impact`,
   * `combat:hitmarker`, `enemyDeath`, `weapon:beat`). Both sides were correct
   * in isolation, both sides had passing tests, and the result was a build in
   * which the ONLY audible thing in a firefight was the gunshot: every impact,
   * every hit marker, every reload beat, every creature vocalisation and every
   * footfall of a 900 kg carapace walking up behind you was wired to an event
   * name nobody emitted. Nothing failed. Nothing logged. There is no test in
   * this repo that could have caught it, because a muted harness cannot hear
   * silence.
   *
   * So this table subscribes to BOTH vocabularies, and every handler
   * normalises: `pos` (a Vector3) and `x,y,z` are both accepted, because
   * enemies.js emits the former and combat.js the latter. Adding a listener is
   * free; a missing one is inaudible.
   */
  _wireBus() {
    const b = this.ctx.bus;
    const on = (k, fn) => b.on(k, (p) => { try { fn(p || {}); } catch (e) { void e; } });
    // Accept {x,y,z} or {pos:Vector3} or {pos:[x,y,z]}, in that order.
    const P = (p, key) => {
      const s = key ? p[key] : (p.pos || p.point || p.at);
      if (s) {
        if (s.x !== undefined) return s;
        if (s.length >= 3) return { x: s[0], y: s[1], z: s[2] };
      }
      return p.x !== undefined ? p : null;
    };

    // ---- weapons.js ---------------------------------------------------------
    on('shot', p => this.shot(p));
    on('weapon:fire', p => this.shot(p));                 // {muzzle,subT,ammo,weapon}
    on('weapon:dryfire', () => this.reloadCue('dryClick'));
    on('weapon:empty', () => this.reloadCue('dryClick'));
    on('weapon:reloadCue', p => this.reloadCue(p.name, p));
    // weapons.js announces the reload's emptiness ONCE, then streams beats with
    // no state on them — so latch it, or an empty reload's mag hits the ground
    // sounding full.
    on('weapon:reload', p => { this._reloadEmpty = !!p.empty; });
    on('weapon:beat', p => this.reloadCue(p.name, { empty: this._reloadEmpty }));
    on('reload', p => this.reloadCue(p.name || 'magSeat', p));
    on('weapon:swap', p => this.reloadCue(p.out ? 'swapOut' : 'swapIn', p));
    on('weapon:inspect', () => this.reloadCue('inspectOut'));
    on('casing', p => { const q = P(p); if (q) this.casing(q.x, q.y, q.z, p); });
    on('weapon:casing', p => { const q = P(p); if (q) this.casing(q.x, q.y, q.z, p); });

    // ---- combat.js ---------------------------------------------------------
    const imp = p => { const q = P(p); if (q) this.impact(p.surface || 'rock', q.x, q.y, q.z, p); };
    on('impact', imp);
    on('combat:impact', imp);
    on('ricochet', p => { const q = P(p); if (q) this.ricochet(q.x, q.y, q.z, p); });
    on('whizz', p => { const q = P(p); if (q) this.whizz(q.x, q.y, q.z, p.dist ?? p.miss ?? 1.2, p); });
    on('combat:whizz', p => { const q = P(p); if (q) this.whizz(q.x, q.y, q.z, p.dist ?? p.miss ?? 1.2, p); });
    let lastKillConfirmT = -1e9;
    const killConfirm = () => {
      const t = this.ctx.time.elapsed;
      // combat emits hitmarker(kind=kill) and combat:kill in the same sim step.
      // They are two semantic records but one audible confirmation.
      if (t - lastKillConfirmT < 1 / 120) return;
      lastKillConfirmT = t;
      this.hitmarker('kill');
    };
    const mark = p => {
      const kind = p && (p.kind || p.result) || 'hit';
      if (kind === 'kill') killConfirm();
      else this.hitmarker(kind === 'normal' ? 'hit' : kind);
    };
    on('hitmarker', mark);
    on('combat:hitmarker', mark);
    on('kill', killConfirm);
    on('combat:kill', killConfirm);
    on('explosion', p => { const q = P(p); if (q) this.explosion(q.x, q.y, q.z, p); });
    on('player:damage', p => this.playerHit(p.amount ?? 10, p));
    on('playerDamage', p => this.playerHit(p.amount ?? 10, p));
    // Director owns the death consequence and publishes player:death once.
    on('player:death', () => this.playerHit(60, { fatal: true }));

    // ---- player.js ---------------------------------------------------------
    on('footstep', p => this.footstep(p));
    on('land', p => this.land(p.vy ?? p.speed ?? 5, p));
    on('jump', () => this.jump());

    // ---- enemies.js -------------------------------------------------------
    const kindOf = p => (p.kind || 'skitter');
    on('enemy:vocal', p => { const q = P(p); this.vocal(kindOf(p), q?.x, q?.y, q?.z, p); });
    // The alert is its OWN sound (voxSkitterAlert/...), not the idle vocal —
    // "it has seen you" has to be tellable from "it is there" without looking.
    on('enemyAlert', p => { const q = P(p); this.vocal(kindOf(p) + 'Alert', q?.x, q?.y, q?.z, { gain: 1.1 }); });
    on('enemySpawn', p => { const q = P(p); this.vocal(kindOf(p), q?.x, q?.y, q?.z, { gain: 0.7 }); });
    on('enemy:telegraph', p => { const q = P(p); this.vocal(kindOf(p) + 'Charge', q?.x, q?.y, q?.z, p); });
    // §6.2 is explicit that the telegraph cue lands on FRAME 1 of the wind-up
    // and the strike is a separate, shorter sound. Two phases, two sounds.
    on('enemyAttack', p => {
      const q = P(p);
      if (p.phase === 'strike') this.creatureStrike(kindOf(p), q, p);
      else this.vocal(kindOf(p) + 'Charge', q?.x, q?.y, q?.z, p);
    });
    on('enemyHit', p => { const q = P(p); this.creaturePain(kindOf(p), q, p); });
    on('enemyStagger', p => { const q = P(p); this.creaturePain(kindOf(p), q, { gain: 1.25, stagger: true }); });
    on('enemy:death', p => { const q = P(p); this.vocal(kindOf(p) + 'Death', q?.x, q?.y, q?.z, p); });
    on('enemyDeath', p => { const q = P(p); this.vocal(kindOf(p) + 'Death', q?.x, q?.y, q?.z, p); });
    on('enemyStep', p => { const q = P(p); this.creatureStep(kindOf(p), q, p.weight ?? 60); });
    on('enemyLand', p => { const q = P(p); this.creatureStep(kindOf(p), q, 900, true); });
    on('enemyProjectile', p => { const q = P(p); this.creatureSpit(kindOf(p), q); });

    // ---- director.js ------------------------------------------------------
    on('audio:tension', p => this.setTension(p.intensity ?? p.value ?? 0, p));
    on('audio:cue', p => this.cue(p.name, p));
    on('rumble', p => this.rumble(p.ms ?? 600, p.gain ?? 1));

    // ---- ui / engine ------------------------------------------------------
    on('ui:click', () => this.play('uiClick', { bus: 'ui', gain: 0.5 }));
    on('quality', () => this._applyQuality());
    on('vista', () => this.resetTemporal());
  }

  _applyQuality() {
    // HRTF everywhere except 'low' (was high/ultra only). Playtest 2026-08-01:
    // locating creatures BY EAR is a mechanic, and equalpower panning has no
    // elevation and no front/back — dropping HRTF changes the game, not the
    // fidelity. Idle panners are disconnected and cost nothing (see pool note);
    // the audible cost is only the ~dozen busy voices.
    const hrtf = this.K.hrtf && this.ctx.quality.preset !== 'low';
    const m = hrtf ? 'HRTF' : 'equalpower';
    for (const v of this.pool) v.pan.panningModel = m;
    // The four emitters are SUSTAINED HRTF convolutions — unlike the one-shot
    // pool they are always running, so they are the audio thread's steady-state
    // cost and the first thing to drop at 'low'.
    if (this._emit) for (const e of this._emit) e.pan.panningModel = m;
  }

  // ===========================================================================
  // BAKE — every buffer in the process
  // ===========================================================================
  _reg(name, chans) { this.buf[name] = toAudioBuffer(this.actx, chans, this.sr); return this.buf[name]; }

  _bakeAmbient() {
    const sr = this.sr, r = this.rng.fork('amb');
    const rn = () => r.next();
    const N = (sec) => Math.round(sec * sr);
    const mk = (sec, fill) => {
      const L = new Float32Array(N(sec)), R = new Float32Array(N(sec));
      fill(L, rn); fill(R, rn);
      // seamless loop: crossfade the last 250 ms over the head
      const x = Math.min(N(0.25), L.length >> 2);
      for (const ch of [L, R]) {
        for (let i = 0; i < x; i++) {
          const t = i / x;
          const j = ch.length - x + i;
          ch[i] = ch[i] * t + ch[j] * (1 - t);
        }
        for (let i = 0; i < x; i++) ch[ch.length - x + i] = ch[i];
      }
      return [L, R];
    };
    this._reg('nWhite', mk(3.0, (b, rr) => normalizeTo(noiseFill(b, rr), 0.7)));
    this._reg('nPink', mk(5.0, (b, rr) => normalizeTo(pinkFill(b, rr), 0.7)));
    this._reg('nBrown', mk(7.0, (b, rr) => normalizeTo(brownFill(b, rr), 0.7)));

    // Sparse ember crackle bed for the smoulder biome — grains, not hiss.
    {
      const L = new Float32Array(N(6)), R = new Float32Array(N(6));
      for (const ch of [L, R]) {
        for (let g = 0; g < 90; g++) {
          const at = r.next() * 5.6;
          grains(ch, sr, () => r.next(), {
            count: 2 + (r.next() * 3 | 0), from: at, span: 0.05,
            len: [0.001, 0.004], amp: 0.5 + r.next() * 0.5, hp: 900, lp: 7000, decay: 0.6,
          });
        }
        normalizeTo(ch, 0.55);
      }
      this._reg('emberBed', [L, R]);
    }
  }

  _bakeFootsteps() {
    const sr = this.sr, r = this.rng.fork('feet');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);

    // --- heel: 60-200 Hz thump, the body's mass arriving (§5.6)
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.11));
      sweepSine(b, sr, 168 * (0.94 + v * 0.05), 62, 0.045, 0.026, 0.85);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'lp', 260, 0.9, 0, 2); envAD(n, sr, 0.0012, 0.020);
      mixInto(b, n, 0.5);
      biquad(b, sr, 'hp', 42, 0.7);
      envAD(b, sr, 0.0009, 0.032, 0, 1.4);
      fadeOut(b, sr, 0.02);
      this._reg('heel' + v, [normalizeTo(b, 0.9)]);
    }

    // --- gear: 4-11 kHz buckle/sling/mag rattle. Cut this layer and the player
    // becomes a floating eye (§5.6). It is the cheapest identity in the mix.
    for (let v = 0; v < 4; v++) {
      const b = new Float32Array(N(0.17));
      grains(b, sr, rn, { count: 11, span: 0.13, len: [0.0009, 0.0035], hp: 3800, lp: 11500, amp: 1, decay: 1.9 });
      damped(b, sr, 5200 + v * 380, 0.010, 0.22, 0, 0.004);
      damped(b, sr, 7900 - v * 260, 0.006, 0.14, 0, 0.030);
      biquad(b, sr, 'hp', 2600, 0.7);
      fadeOut(b, sr, 0.02);
      this._reg('gear' + v, [normalizeTo(b, 0.62)]);
    }
    // armour settle — the longer version, for landings
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(0.30));
      grains(b, sr, rn, { count: 22, span: 0.26, len: [0.001, 0.005], hp: 2400, lp: 10500, amp: 1, decay: 1.1 });
      damped(b, sr, 3100 + v * 220, 0.022, 0.20, 0, 0.010);
      biquad(b, sr, 'hp', 1600, 0.7);
      fadeOut(b, sr, 0.04);
      this._reg('settle' + v, [normalizeTo(b, 0.7)]);
    }
    // sling rattle for turn foley + weapon cloth shift
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.20));
      grains(b, sr, rn, { count: 7, span: 0.15, len: [0.0012, 0.005], hp: 2200, lp: 9000, amp: 1, decay: 1.3 });
      biquad(b, sr, 'hp', 1400, 0.7); fadeOut(b, sr, 0.03);
      this._reg('sling' + v, [normalizeTo(b, 0.5)]);
      const c = new Float32Array(N(0.16));
      grains(c, sr, rn, { count: 9, span: 0.12, len: [0.002, 0.010], hp: 500, lp: 3200, amp: 1, decay: 1.5 });
      biquad(c, sr, 'bp', 1100, 0.8); fadeOut(c, sr, 0.03);
      this._reg('cloth' + v, [normalizeTo(c, 0.4)]);
    }
    // body thud for hard landings
    {
      const b = new Float32Array(N(0.22));
      sweepSine(b, sr, 78, 44, 0.06, 0.045, 1.0);
      envAD(b, sr, 0.004, 0.055);
      biquad(b, sr, 'lp', 180, 0.8); fadeOut(b, sr, 0.03);
      this._reg('bodyThud', [normalizeTo(b, 0.95)]);
    }

    // --- surface layer, per material, 4 variants each
    const SURF = {
      ash: (b) => { // volcanic ash: dense, dry, mid-heavy crunch that collapses
        grains(b, sr, rn, { count: 26, span: 0.16, len: [0.0012, 0.0055], hp: 500, lp: 5200, amp: 1, decay: 1.8 });
        biquad(b, sr, 'bp', 1500, 0.55);
        biquad(b, sr, 'lp', 6200, 0.7);
      },
      rock: (b) => { // basalt scuff: bright, short, gritty
        grains(b, sr, rn, { count: 16, span: 0.09, len: [0.0008, 0.003], hp: 1600, lp: 9500, amp: 1, decay: 2.6 });
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 5200, 1800, 1.4, 0.06); envAD(n, sr, 0.0008, 0.028);
        mixInto(b, n, 0.55);
        biquad(b, sr, 'hp', 700, 0.7);
      },
      duff: (b) => { // forest litter under the wick stands: soft, papery, damped
        grains(b, sr, rn, { count: 30, span: 0.20, len: [0.0015, 0.008], hp: 380, lp: 3400, amp: 1, decay: 1.2 });
        biquad(b, sr, 'lp', 3800, 0.7, 0, 2);
        biquad(b, sr, 'peak', 700, 1.2, 3.0);
      },
      glass: (b) => { // blackglass clinker: tinkle over the crunch
        grains(b, sr, rn, { count: 18, span: 0.14, len: [0.0008, 0.003], hp: 2200, lp: 12000, amp: 1, decay: 1.7 });
        damped(b, sr, 2900, 0.020, 0.16, 0, 0.006);
        damped(b, sr, 4350, 0.014, 0.12, 0, 0.021);
        damped(b, sr, 6100, 0.009, 0.08, 0, 0.038);
        biquad(b, sr, 'hp', 900, 0.7);
      },
      mud: (b) => { // damp channel silt: suction, low, wet
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 320, 900, 2.4, 0.10); envAD(n, sr, 0.003, 0.060);
        mixInto(b, n, 1.0);
        grains(b, sr, rn, { count: 8, span: 0.10, len: [0.002, 0.009], hp: 260, lp: 1800, amp: 0.6, decay: 1.4 });
        biquad(b, sr, 'lp', 2200, 0.8);
      },
      water: (b) => { // shallow splash
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 600, 3400, 0.9, 0.05); envAD(n, sr, 0.0015, 0.075);
        mixInto(b, n, 1.0);
        for (let k = 0; k < 6; k++) damped(b, sr, 1800 + rn() * 3200, 0.006, 0.10, 0, 0.02 + rn() * 0.12);
        biquad(b, sr, 'hp', 260, 0.7);
      },
      metal: (b) => { // expedition decking
        damped(b, sr, 240, 0.070, 0.55); damped(b, sr, 478, 0.045, 0.35);
        damped(b, sr, 913, 0.028, 0.22); damped(b, sr, 1571, 0.016, 0.14);
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquad(n, sr, 'bp', 3200, 1.0); envAD(n, sr, 0.0006, 0.010);
        mixInto(b, n, 0.5);
        biquad(b, sr, 'hp', 150, 0.7);
      },
    };
    for (const key of SURFACES) {
      for (let v = 0; v < 4; v++) {
        const b = new Float32Array(N(key === 'metal' ? 0.34 : 0.26));
        SURF[key](b);
        fadeOut(b, sr, 0.03);
        this._reg('step_' + key + v, [normalizeTo(b, 0.85)]);
      }
    }
  }

  _bakeUI() {
    const sr = this.sr, N = (s) => Math.round(s * sr);
    const r = this.rng.fork('ui');
    // §4.6 hit-marker audio, "all 12 ms attack". The carrier is generated with
    // a long internal tau and the AUDIBLE shape comes from one envAD pass —
    // otherwise the damped-sine decay and the envelope decay multiply and a
    // 16 ms marker becomes an 8 ms one that the 12 ms attack has already eaten.
    const tick = (freq, tau, dur, shimmer) => {
      const b = new Float32Array(N(dur));
      damped(b, sr, freq, 0.30, 0.9);
      damped(b, sr, freq * 1.51, 0.24, 0.25);
      if (shimmer) {
        const n = new Float32Array(b.length);
        noiseFill(n, () => r.next()); biquad(n, sr, 'bp', freq * 1.9, 3.0); envAD(n, sr, 0.004, 0.014, 0.012);
        mixInto(b, n, 0.35);
      }
      envAD(b, sr, 0.012, tau, 0, 0.75);
      fadeOut(b, sr, 0.01);
      return normalizeTo(b, 0.9);
    };
    this._reg('hmHit', [tick(2400, 0.016, 0.07, false)]);
    this._reg('hmWeak', [tick(3100, 0.020, 0.10, true)]);
    this._reg('hmDeflect', [(() => {
      const b = new Float32Array(N(0.12));
      damped(b, sr, 900, 0.30, 0.9); damped(b, sr, 1340, 0.10, 0.30);
      biquad(b, sr, 'lp', 2200, 0.8);
      envAD(b, sr, 0.012, 0.026, 0, 0.75); fadeOut(b, sr, 0.01);
      return normalizeTo(b, 0.85);
    })()]);
    this._reg('hmKill', [(() => {
      // two notes, 1.9 -> 2.6 kHz, 90 ms apart (§4.6)
      const b = new Float32Array(N(0.26));
      const a = new Float32Array(N(0.09)); damped(a, sr, 1900, 0.30, 0.9); envAD(a, sr, 0.012, 0.020, 0, 0.75);
      const c = new Float32Array(N(0.12)); damped(c, sr, 2600, 0.30, 0.9); envAD(c, sr, 0.012, 0.026, 0, 0.75);
      fadeOut(a, sr, 0.01); fadeOut(c, sr, 0.01);
      mixInto(b, a, 1.0, 0);
      mixInto(b, c, 1.0, N(0.090));
      fadeOut(b, sr, 0.02);
      return normalizeTo(b, 0.92);
    })()]);
    this._reg('uiClick', [tick(1800, 0.012, 0.06, false)]);
  }

  _bakeVocals() {
    const sr = this.sr, N = (s) => Math.round(s * sr);
    const r = this.rng.fork('vox');
    const rn = () => r.next();

    // SKITTER — a dry insect chitter. Bursts of very short formant clicks.
    for (let v = 0; v < 4; v++) {
      const b = new Float32Array(N(0.42));
      const n = 7 + (rn() * 5 | 0);
      for (let i = 0; i < n; i++) {
        const at = i * (0.020 + rn() * 0.020);
        const f = 1500 + rn() * 1700;
        damped(b, sr, f, 0.0035 + rn() * 0.004, 0.55 + rn() * 0.4, 0, at);
        damped(b, sr, f * 1.94, 0.0018, 0.20, 0, at);
      }
      grains(b, sr, rn, { count: 10, span: 0.30, len: [0.0007, 0.0025], hp: 2600, lp: 9500, amp: 0.35, decay: 0.5 });
      biquad(b, sr, 'bp', 2600, 0.55);
      fadeOut(b, sr, 0.03);
      this._reg('voxSkitter' + v, [normalizeTo(b, 0.8)]);
    }
    // Skitter leap telegraph — a rising rasp (§6.2: cue on frame 1 of the wind-up)
    {
      const b = new Float32Array(N(0.34));
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquadSweep(n, sr, 'bp', 900, 3200, 3.0, 0.30, 1.2);
      envAD(n, sr, 0.010, 0.16, 0.10);
      mixInto(b, n, 1.0);
      sweepSine(b, sr, 220, 520, 0.28, 0.14, 0.30);
      fadeOut(b, sr, 0.04);
      this._reg('voxSkitterCharge', [normalizeTo(b, 0.85)]);
    }
    // BLOOMSPITTER — a wet, resonant, two-formant moan.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(1.10));
      const f0 = 96 + v * 9;
      for (let h = 1; h <= 9; h++) {
        sweepSine(b, sr, f0 * h * 0.92, f0 * h * 1.10, 0.55, 0.34, 0.55 / (h * h * 0.55 + 1));
      }
      biquad(b, sr, 'peak', 520 + v * 60, 3.5, 8);
      biquad(b, sr, 'peak', 1180, 4.0, 6);
      biquad(b, sr, 'lp', 3000, 0.8);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'bp', 1600, 1.4); envAD(n, sr, 0.05, 0.28, 0.10);
      mixInto(b, n, 0.10);
      envAD(b, sr, 0.070, 0.30, 0.22, 1.2);
      fadeOut(b, sr, 0.08);
      this._reg('voxBloomspitter' + v, [normalizeTo(b, 0.85)]);
    }
    {
      const b = new Float32Array(N(0.90));
      for (let h = 1; h <= 7; h++) sweepSine(b, sr, 120 * h, 300 * h, 0.80, 0.42, 0.5 / (h * h * 0.5 + 1));
      biquad(b, sr, 'peak', 900, 3.0, 9); biquad(b, sr, 'lp', 4200, 0.8);
      envAD(b, sr, 0.05, 0.40, 0.35, 1.1); fadeOut(b, sr, 0.06);
      this._reg('voxBloomspitterCharge', [normalizeTo(b, 0.9)]);
    }
    // CARAPACE — subsonic-leaning rumble plus a chitin scrape. This is the
    // §6.6 ANCHOR telegraph and it has to be felt before it is seen.
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(1.60));
      for (let h = 1; h <= 6; h++) sweepSine(b, sr, 41 * h * (1 + v * 0.06), 33 * h, 1.2, 0.55, 0.7 / (h * 1.4));
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'bp', 380, 0.8); envAD(n, sr, 0.15, 0.55, 0.2);
      mixInto(b, n, 0.20);
      biquad(b, sr, 'lp', 900, 0.8);
      envAD(b, sr, 0.10, 0.55, 0.5, 1.0); fadeOut(b, sr, 0.12);
      this._reg('voxCarapace' + v, [normalizeTo(b, 0.95)]);
    }
    {
      const b = new Float32Array(N(1.40));  // ground rumble, §6.6 ANCHOR, 1.4 s
      for (let h = 1; h <= 4; h++) sweepSine(b, sr, 27 * h, 22 * h, 1.3, 0.70, 0.8 / h);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'lp', 140, 0.9, 0, 2); envAD(n, sr, 0.30, 0.60, 0.3);
      mixInto(b, n, 0.55);
      envAD(b, sr, 0.25, 0.60, 0.4); fadeOut(b, sr, 0.15);
      this._reg('voxRumble', [normalizeTo(b, 1.0)]);
    }
    // deaths — the vocal collapses and the bioluminescence vent vents
    for (const [name, f0, dur] of [['voxSkitterDeath', 900, 0.5], ['voxBloomspitterDeath', 190, 0.9], ['voxCarapaceDeath', 62, 1.5]]) {
      const b = new Float32Array(N(dur));
      for (let h = 1; h <= 6; h++) sweepSine(b, sr, f0 * h, f0 * h * 0.42, dur * 0.7, dur * 0.30, 0.6 / h);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquadSweep(n, sr, 'bp', 3200, 500, 1.2, dur * 0.6); envAD(n, sr, 0.004, dur * 0.25);
      mixInto(b, n, 0.45);
      envAD(b, sr, 0.004, dur * 0.30, 0, 1.3); fadeOut(b, sr, 0.05);
      this._reg(name, [normalizeTo(b, 0.9)]);
    }
    // ALERT CALLS — one per creature, DISTINCT from the idle vocal (playtest
    // 2026-08-01: tracking by ear needs "a distinct alert call"). The idle says
    // "something is there"; the alert says "it has seen you", and the player
    // must be able to tell without looking.
    {
      // Skitter: a hard rising double-burst — the idle chitter is loose and
      // wandering, the alert is two tight clusters snapping upward.
      const b = new Float32Array(N(0.30));
      for (let burst = 0; burst < 2; burst++) {
        const at0 = burst * 0.115;
        for (let i = 0; i < 6; i++) {
          const f = (2100 + burst * 700) + i * 260;
          damped(b, sr, f, 0.003, 0.6, 0, at0 + i * 0.011);
          damped(b, sr, f * 1.9, 0.0015, 0.22, 0, at0 + i * 0.011);
        }
      }
      biquad(b, sr, 'bp', 3100, 0.7);
      fadeOut(b, sr, 0.02);
      this._reg('voxSkitterAlert', [normalizeTo(b, 0.85)]);
    }
    {
      // Bloomspitter: the moan compressed to a bark — same formants, a quarter
      // the length, hard attack.
      const b = new Float32Array(N(0.40));
      const f0 = 110;
      for (let h = 1; h <= 8; h++) sweepSine(b, sr, f0 * h * 1.15, f0 * h * 0.92, 0.20, 0.11, 0.6 / (h * h * 0.5 + 1));
      biquad(b, sr, 'peak', 640, 3.2, 9);
      biquad(b, sr, 'peak', 1300, 4.0, 6);
      biquad(b, sr, 'lp', 3400, 0.8);
      envAD(b, sr, 0.012, 0.11, 0.05, 1.6);
      fadeOut(b, sr, 0.04);
      this._reg('voxBloomspitterAlert', [normalizeTo(b, 0.88)]);
    }
    {
      // Carapace: the rumble plus a dry chitin scrape on top — the scrape is
      // what separates "it is here" from the idle "it exists" rumble.
      const b = new Float32Array(N(0.95));
      for (let h = 1; h <= 5; h++) sweepSine(b, sr, 46 * h, 36 * h, 0.7, 0.34, 0.7 / (h * 1.3));
      const n = new Float32Array(N(0.45));
      noiseFill(n, rn); biquadSweep(n, sr, 'bp', 900, 2400, 1.4, 0.30, 1.2);
      envAD(n, sr, 0.030, 0.16, 0.08);
      mixInto(b, n, 0.35, N(0.10));
      biquad(b, sr, 'lp', 3200, 0.8);
      envAD(b, sr, 0.030, 0.34, 0.30); fadeOut(b, sr, 0.08);
      this._reg('voxCarapaceAlert', [normalizeTo(b, 0.95)]);
    }
    {
      // Carapace ATTACK TELEGRAPH. This buffer not existing was a real bug:
      // vocal('carapaceCharge') fell through its fallback chain to voxSkitter0,
      // so a 2.4 m creature's 480 ms sweep wind-up (§6.2, cue on frame 1)
      // announced itself as an insect chitter. A rising armour creak over a
      // rumble swell — crescendo, so it reads as "incoming", not ambience.
      const b = new Float32Array(N(0.60));
      for (let h = 1; h <= 4; h++) sweepSine(b, sr, 40 * h, 62 * h, 0.5, 0.30, 0.55 / h);
      // stick-slip creak riding up in pitch as the limb loads
      const cr = new Float32Array(N(0.5));
      damped(cr, sr, 210, 0.5, 0.8);
      const rate = 26;
      for (let i = 0; i < cr.length; i++) cr[i] *= 0.3 + 0.7 * Math.abs(Math.sin(i / sr * Math.PI * rate * (1 + i / cr.length)));
      biquadSweep(cr, sr, 'bp', 480, 1600, 1.6, 0.45, 1.0);
      mixInto(b, cr, 0.5, N(0.04));
      // crescendo: inverted decay — the sound GROWS into the strike
      for (let i = 0; i < b.length; i++) b[i] *= 0.25 + 0.75 * Math.pow(i / b.length, 1.4);
      fadeOut(b, sr, 0.03);
      this._reg('voxCarapaceCharge', [normalizeTo(b, 0.95)]);
    }

    // distant flock — the "inhabited" cue in the ambient bed
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(1.8));
      for (let i = 0; i < 5; i++) {
        const at = rn() * 1.1, f = 640 + rn() * 900;
        sweepSine(b, sr, f, f * (0.6 + rn() * 0.9), 0.22, 0.16, 0.45, at);
      }
      biquad(b, sr, 'bp', 1200, 0.7); biquad(b, sr, 'lp', 3400, 0.8);
      fadeOut(b, sr, 0.15);
      this._reg('voxFar' + v, [normalizeTo(b, 0.7)]);
    }
  }

  /**
   * CREATURE FOLEY — the part of §6 that is audio's and not enemies'.
   *
   * The roster is three creatures at 46 kg, 140 kg and 900 kg (enemies.js
   * SPECS), and mass is the only thing the player needs to hear: a skitter's
   * footfall is a dry tick and a carapace's is a ground event you feel through
   * the floor. §6.6 makes the carapace the encounter ANCHOR, "felt before it is
   * seen" — that is this bake, not a vocal.
   */
  _bakeCreatures() {
    const sr = this.sr, N = (s) => Math.round(s * sr);
    const r = this.rng.fork('creature');
    const rn = () => r.next();

    // --- footfalls, three mass classes -------------------------------------
    // LIGHT (skitter, 46 kg): chitin points on ash. A tick and a scrape, no
    // body at all. Four legs at speed, so it must be short enough to machine-gun
    // without smearing.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.10));
      damped(b, sr, 2400 + v * 260, 0.0025, 0.55);
      damped(b, sr, 4700 - v * 300, 0.0013, 0.26);
      grains(b, sr, rn, { count: 7, span: 0.055, len: [0.0006, 0.0025], hp: 1400, lp: 9000, amp: 0.6, decay: 2.2 });
      sweepSine(b, sr, 190, 120, 0.014, 0.010, 0.18);
      biquad(b, sr, 'hp', 500, 0.7); fadeOut(b, sr, 0.012);
      this._reg('cstepLight' + v, [normalizeTo(b, 0.62)]);
    }
    // MID (bloomspitter, 140 kg): a soft pad landing — damp, fleshy, with a
    // little suction. Slow gait, so it can be longer.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.24));
      sweepSine(b, sr, 118 + v * 8, 54, 0.038, 0.030, 0.75);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquadSweep(n, sr, 'bp', 420, 1200, 1.6, 0.070); envAD(n, sr, 0.0025, 0.045);
      mixInto(b, n, 0.55);
      grains(b, sr, rn, { count: 12, from: 0.006, span: 0.13, len: [0.0012, 0.006], hp: 320, lp: 2600, amp: 0.30, decay: 1.3 });
      biquad(b, sr, 'lp', 3200, 0.8); biquad(b, sr, 'hp', 46, 0.7);
      fadeOut(b, sr, 0.03);
      this._reg('cstepMid' + v, [normalizeTo(b, 0.78)]);
    }
    // HEAVY (carapace, 900 kg): three simultaneous events — the ground taking
    // the load (a 34 Hz sweep), the plate itself (a 90 Hz knock) and the
    // creature's own armour creaking as the weight transfers. The 34 Hz layer is
    // what makes it arrive before it is visible.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.62));
      sweepSine(b, sr, 62 * (1 + v * 0.05), 29, 0.075, 0.075, 1.0);
      sweepSine(b, sr, 96, 44, 0.030, 0.032, 0.55);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'lp', 220, 0.9, 0, 2); envAD(n, sr, 0.0022, 0.060);
      mixInto(b, n, 0.60);
      // grit thrown out sideways
      grains(b, sr, rn, { count: 22, from: 0.010, span: 0.30, len: [0.001, 0.006], hp: 400, lp: 4800, amp: 0.26, decay: 1.0 });
      // armour creak, 120 ms in — the load transferring
      damped(b, sr, 340 + v * 40, 0.030, 0.16, 0, 0.115);
      damped(b, sr, 197, 0.045, 0.13, 0, 0.130);
      saturate(b, 1.5, 0.35);
      biquad(b, sr, 'hp', 24, 0.7); fadeOut(b, sr, 0.06);
      this._reg('cstepHeavy' + v, [normalizeTo(b, 0.98)]);
    }

    // --- strike / attack: air moving, then contact. §6.2 wants the strike to be
    //     a DIFFERENT sound from the telegraph or the tell teaches nothing.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.26));
      // the whoosh: a bandpass sweeping up then down as the limb passes
      const n = new Float32Array(N(0.14));
      noiseFill(n, rn);
      biquadSweep(n, sr, 'bp', 380, 2600, 1.3, 0.075, 1.1);
      envAD(n, sr, 0.020, 0.045, 0.020, 1.6);
      mixInto(b, n, 1.0);
      // the chitin snap at the end of the arc
      damped(b, sr, 1500 + v * 400, 0.0045, 0.55, 0, 0.105);
      damped(b, sr, 3100, 0.0022, 0.28, 0, 0.105);
      biquad(b, sr, 'hp', 220, 0.7); fadeOut(b, sr, 0.03);
      this._reg('cstrike' + v, [normalizeTo(b, 0.85)]);
    }
    // spit launch — a pressurised wet POP with a rising trail (the bolus)
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(0.30));
      const n = new Float32Array(N(0.05));
      noiseFill(n, rn); biquadSweep(n, sr, 'bp', 900, 2800, 1.2, 0.025); envAD(n, sr, 0.0008, 0.012);
      mixInto(b, n, 1.0);
      sweepSine(b, sr, 240, 700, 0.045, 0.030, 0.45);
      // the wet trail leaving the vent
      const t = new Float32Array(b.length);
      noiseFill(t, rn); biquadSweep(t, sr, 'bp', 1800, 600, 2.2, 0.16); envAD(t, sr, 0.010, 0.075, 0.02);
      mixInto(b, t, 0.35);
      biquad(b, sr, 'hp', 260, 0.7); fadeOut(b, sr, 0.04);
      this._reg('cspit' + v, [normalizeTo(b, 0.8)]);
    }
    // pain — one short vocal per creature, pitched from its body size. Not a
    // scream: a hit that costs the creature air.
    for (const [name, f0, dur, br] of [
      ['painSkitter', 1450, 0.16, 0.55], ['painBloomspitter', 300, 0.30, 0.40], ['painCarapace', 78, 0.46, 0.30],
    ]) {
      for (let v = 0; v < 2; v++) {
        const b = new Float32Array(N(dur));
        for (let h = 1; h <= 5; h++) {
          sweepSine(b, sr, f0 * h * (1 + v * 0.04), f0 * h * 0.66, dur * 0.55, dur * 0.28, 0.62 / (h * 0.9 + 0.4));
        }
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquad(n, sr, 'bp', f0 * 2.2, 1.2); envAD(n, sr, 0.002, dur * 0.20);
        mixInto(b, n, br);
        biquad(b, sr, 'peak', f0 * 3.1, 3.0, 5);
        envAD(b, sr, 0.003, dur * 0.26, 0, 1.3);
        biquad(b, sr, 'hp', Math.min(400, f0 * 0.55), 0.7);
        fadeOut(b, sr, 0.03);
        this._reg(name + v, [normalizeTo(b, 0.85)]);
      }
    }

    // --- the player taking a hit. There is no §-number for this and it is the
    //     single loudest absence in the mix: without it, damage is a red vignette
    //     with no sound and the player does not know they are dying.
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.42));
      // armour/plate taking it
      damped(b, sr, 210 + v * 45, 0.022, 0.55);
      damped(b, sr, 620, 0.010, 0.28);
      sweepSine(b, sr, 96, 42, 0.030, 0.038, 0.85);
      const n = new Float32Array(N(0.07));
      noiseFill(n, rn); biquadSweep(n, sr, 'bp', 2600, 700, 1.0, 0.030); envAD(n, sr, 0.0006, 0.016);
      mixInto(b, n, 0.75);
      // the breath knocked out, 90 ms later — this is the layer that makes it a
      // person and not a collision event
      const g = new Float32Array(b.length);
      noiseFill(g, rn); biquadSweep(g, sr, 'bp', 700, 1900, 2.6, 0.16, 1.2);
      envAD(g, sr, 0.016, 0.11, 0.030);
      mixInto(b, g, 0.30, N(0.090));
      saturate(b, 1.7, 0.4);
      biquad(b, sr, 'hp', 40, 0.7); fadeOut(b, sr, 0.05);
      this._reg('hurt' + v, [normalizeTo(b, 0.92)]);
    }
    {
      // player death: everything falls away. A long downward filtered collapse
      // plus the body arriving. Deliberately un-dramatic.
      const b = new Float32Array(N(2.4));
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquadSweep(n, sr, 'lp', 2600, 90, 0.9, 1.5, 1.4);
      envAD(n, sr, 0.010, 0.75, 0.05);
      mixInto(b, n, 0.55);
      for (let h = 1; h <= 4; h++) sweepSine(b, sr, 74 * h, 26 * h, 1.4, 0.55, 0.55 / h);
      damped(b, sr, 130, 0.070, 0.6, 0, 0.30);
      biquad(b, sr, 'lp', 1800, 0.8); biquad(b, sr, 'hp', 28, 0.7);
      fadeOut(b, sr, 0.30);
      this._reg('pDeath', [normalizeTo(b, 0.95)]);
    }
  }

  /**
   * WORLD LOOPS for the positional ambient emitters (see _startEmitters).
   *
   * The non-positional bed says "there is weather"; these say "there is a
   * stream 30 m to your left and a stand of wick trees behind you". Direction is
   * what turns a bed into a place, and it is the cheapest inhabitedness in the
   * build: four looping mono buffers and four panners.
   */
  _bakeWorld() {
    // BAKED AT HALF RATE ON PURPOSE. An AudioBufferSourceNode resamples any
    // buffer whose sampleRate differs from the context's, preserving duration
    // and pitch, so a 24 kHz bake plays back identically — and every one of
    // these five loops is band-limited well under 12 kHz by its own filters
    // anyway. It halves the synthesis cost (this was 1.4 s of a 6 s boot budget)
    // and halves the 12 MB these buffers occupy. Do NOT do this for anything
    // percussive: resampling a 0.1 ms transient costs you the transient.
    const sr = Math.round(this.sr / 2), N = (s) => Math.round(s * sr);
    const reg = (name, chans) => { this.buf[name] = toAudioBuffer(this.actx, chans, sr); };
    const r = this.rng.fork('world');
    const rn = () => r.next();
    // Seamless loop: crossfade the tail over the head. A positional loop that
    // clicks once every 6 s is worse than no positional loop, because the click
    // is transient-shaped and the HRTF panner localises it perfectly.
    const seam = (b, sec = 0.35) => {
      const x = Math.min(Math.round(sec * sr), b.length >> 2);
      for (let i = 0; i < x; i++) {
        const t = i / x, j = b.length - x + i;
        b[i] = b[i] * t + b[j] * (1 - t);
      }
      for (let i = 0; i < x; i++) b[b.length - x + i] = b[i];
      return b;
    };

    // LIQUID — a burble, not a hiss. Bubbles are discrete events: a short
    // rising sine per bubble over a filtered-noise flow bed.
    {
      const b = new Float32Array(N(4.0));
      const flow = new Float32Array(b.length);
      pinkFill(flow, rn);
      biquad(flow, sr, 'bp', 1100, 0.6);
      mixInto(b, flow, 0.55);
      for (let k = 0; k < 150; k++) {
        const at = rn() * 3.6, f = 380 + rn() * 1500;
        sweepSine(b, sr, f, f * (1.5 + rn()), 0.012 + rn() * 0.02, 0.006 + rn() * 0.010, 0.10 + rn() * 0.16, at);
      }
      biquad(b, sr, 'hp', 220, 0.7);
      reg('loopLiquid', [normalizeTo(seam(b), 0.55)]);
    }
    // FLORA — wind IN something. A broadband rustle whose brightness wanders,
    // with occasional harder gust bursts. Static-filtered noise reads as a hiss
    // and is the classic "there is a wind layer" tell.
    {
      const b = new Float32Array(N(4.0));
      noiseFill(b, rn);
      biquadSweep(b, sr, 'bp', 2200, 4200, 0.55, 3.0, 1.0);
      // slow amplitude wander baked in (on top of the runtime LFO)
      for (let i = 0; i < b.length; i++) {
        const t = i / sr;
        b[i] *= 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.83 + Math.sin(t * 0.31) * 1.7));
      }
      for (let k = 0; k < 20; k++) {
        const at = rn() * 3.4;
        grains(b, sr, rn, { count: 12, from: at, span: 0.35, len: [0.0008, 0.004], hp: 2200, lp: 11000, amp: 0.30, decay: 0.6 });
      }
      biquad(b, sr, 'hp', 900, 0.7);
      reg('loopFlora', [normalizeTo(seam(b), 0.5)]);
    }
    // VENT — a fumarole. Low hiss with irregular chuffs; ART's smoulder biome.
    {
      const b = new Float32Array(N(4.0));
      brownFill(b, rn, 0.8);
      biquad(b, sr, 'bp', 320, 0.7);
      for (let k = 0; k < 24; k++) {
        const at = rn() * 3.5;
        const n = new Float32Array(N(0.30));
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 180, 900, 1.1, 0.16, 1.3);
        envAD(n, sr, 0.030, 0.10, 0.02);
        mixInto(b, n, 0.30 + rn() * 0.5, Math.round(at * sr));
      }
      biquad(b, sr, 'lp', 2400, 0.8); biquad(b, sr, 'hp', 55, 0.7);
      reg('loopVent', [normalizeTo(seam(b), 0.55)]);
    }
    // CREAK — the wick stands loading and unloading under the wind. Sparse,
    // pitched, structural. This is the layer that makes a forest feel like it
    // is made of something.
    {
      const b = new Float32Array(N(6.0));
      for (let k = 0; k < 22; k++) {
        const at = rn() * 5.3, f = 90 + rn() * 380;
        // a creak is a slow stick-slip: an amplitude-rippled damped tone
        const n = new Float32Array(N(0.5 + rn() * 0.7));
        damped(n, sr, f, 0.20, 0.9);
        damped(n, sr, f * 2.02, 0.10, 0.30);
        const rate = 14 + rn() * 26;
        for (let i = 0; i < n.length; i++) n[i] *= 0.35 + 0.65 * Math.abs(Math.sin(i / sr * Math.PI * rate));
        envAD(n, sr, 0.06, 0.20, 0.06);
        fadeOut(n, sr, 0.08);
        mixInto(b, n, 0.35 + rn() * 0.5, Math.round(at * sr));
      }
      biquad(b, sr, 'hp', 70, 0.7); biquad(b, sr, 'lp', 3000, 0.8);
      reg('loopCreak', [normalizeTo(seam(b, 0.5), 0.5)]);
    }
    // TENSION — the director's intensity, without music. A pair of low tones a
    // semitone apart beating against each other, plus a high airy shimmer. It
    // is not a stinger and it never resolves; it just gets denser.
    {
      const b = new Float32Array(N(6.0));
      const F = 52;
      // `damped` with a huge tau is a rotating phasor: two multiplies per
      // sample and no Math.sin in the loop. Four raw sine loops over 300 k
      // samples measured as most of this buffer's cost for no benefit.
      for (const [f, a] of [[F, 0.9], [F * 1.0595, 0.7], [F * 1.5, 0.35], [F * 2, 0.22]]) {
        damped(b, sr, f, 1e6, a, rn() * 6.28);
      }
      const air = new Float32Array(b.length);
      noiseFill(air, rn); biquad(air, sr, 'bp', 4200, 0.9);
      for (let i = 0; i < air.length; i++) air[i] *= 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(i / sr * 0.41));
      mixInto(b, air, 0.10);
      biquad(b, sr, 'lp', 6000, 0.8);
      reg('loopTension', [normalizeTo(seam(b, 0.6), 0.6)]);
    }
  }

  /**
   * Three convolution reverbs (§5.5). The DIFFUSE decay is baked once; the
   * early-reflection structure that actually carries a space's geometry is NOT
   * in these buffers — it is scheduled per-event as discrete slapback voices at
   * `2d/343` from the live probe's measured wall distances (guns.js `_tail`).
   * That is deliberate: rebuilding a 2.4 s stereo IR costs ~120 ms of main
   * thread and would have to happen every time the player walked into a canyon.
   * (An earlier revision of this comment claimed the taps came from the probe.
   * They did not, and never had.)
   */
  _bakeIRs() {
    const r = this.rng.fork('ir'), rn = () => r.next();
    const q = this.ctx.quality.preset;
    const long = (q === 'low' || q === 'medium') ? 1.6 : 2.4;
    this.conv.small.node.buffer = makeIR(this.actx, this.sr, rn, {
      seconds: 0.42, tau: 0.075, damp: 3400, lowCut: 140, diffusion: 0.004, gain: 1.0,
      early: [[0.006, 0.55], [0.013, 0.40], [0.021, 0.30], [0.034, 0.20]],
    });
    this.conv.medium.node.buffer = makeIR(this.actx, this.sr, rn, {
      seconds: 1.15, tau: 0.21, damp: 4600, lowCut: 100, diffusion: 0.016, gain: 0.85,
      early: [[0.019, 0.38], [0.041, 0.28], [0.072, 0.20], [0.105, 0.13]],
    });
    this.conv.open.node.buffer = makeIR(this.actx, this.sr, rn, {
      seconds: long, tau: long * 0.24, damp: 2100, lowCut: 70, diffusion: 0.055, gain: 0.55,
      early: [[0.060, 0.16], [0.135, 0.11], [0.240, 0.07]],
    });
  }

  // ===========================================================================
  // PLAYBACK
  // ===========================================================================
  /**
   * The one place a sound is scheduled. Everything above funnels here.
   * o: { x,y,z, gain, rate, bus, when, send, pan, air, occl, tone, toneDb,
   *      delay, dur, filterHz }
   */
  playBuf(buffer, o) {
    if (!this.enabled || this.silent || !buffer) return null;
    const K = this.K;
    const positional = o.x !== undefined && o.x !== null;
    const busName = o.bus || 'world';
    const bus = this.busses[busName] || this.busWorld;
    const v = this._acquire(positional, bus);
    if (!v) return null;

    const c = this.actx;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = o.rate || 1;
    v.src = src;

    let g = (o.gain === undefined ? 1 : o.gain);
    let when = (o.when !== undefined ? o.when : this.now) + (o.delay || 0);
    if (when < c.currentTime) when = c.currentTime;

    if (positional) {
      const p = v.pan;
      if (p.positionX) { p.positionX.value = o.x; p.positionY.value = o.y; p.positionZ.value = o.z; }
      else p.setPosition(o.x, o.y, o.z);
      const d = this._distToListener(o.x, o.y, o.z);
      // air absorption: one-pole-ish LP, cutoff 20000*exp(-d/K) (§5.2)
      let air = o.air === false ? 20000 : clamp(20000 * Math.exp(-d / K.airAbsorption), 220, 20000);
      if (o.lpHz) air = Math.min(air, o.lpHz);
      v.air.frequency.value = air;
      // propagation delay for anything that is not the player's own weapon
      if (o.propagate && K.propagation) when += d / 343;
      // occlusion (one ray, budgeted, cached — see _occAt)
      let occHz = 20000, occG = 1;
      if (o.occl !== false && this._occAt(o.x, o.y, o.z, o.priority === undefined ? 3 : o.priority)) {
        occHz = K.occlusionHz; occG = dB(-K.occlusionDb);
      }
      v.occ.frequency.value = occHz;
      g *= occG;
    } else {
      v.air.frequency.value = o.lpHz || 20000;
    }
    src.connect(v.head);

    v.tone.frequency.value = o.filterHz || 1400;
    v.tone.gain.value = o.toneDb || 0;
    v.gain.gain.value = g;
    v.send.gain.value = (o.send === undefined ? 0.12 : o.send) * K.reverb;

    // When this voice is provably finished — see _acquire tier 2. `+0.03` is
    // slack for the panner/convolver tail, and it must be generous: reclaiming
    // one buffer-length too early cuts a real sound, which is the failure this
    // whole mechanism exists to avoid.
    const rate = o.rate || 1;
    v.until = when + (o.dur !== undefined ? o.dur : buffer.duration) / rate + 0.03;
    src.onended = () => this._release(v);
    try {
      if (o.dur) src.start(when, o.offset || 0, o.dur);
      else src.start(when, o.offset || 0);
    } catch (e) { this._release(v); return null; }
    this._stats.plays++;
    return v;
  }

  play(name, o = {}) { return this.playBuf(this.buf[name], o); }
  playAt(name, x, y, z, o = {}) { o.x = x; o.y = y; o.z = z; return this.playBuf(this.buf[name], o); }

  _distToListener(x, y, z) {
    const c = this.ctx.camera;
    return Math.hypot(x - c.position.x, y - c.position.y, z - c.position.z);
  }

  // ===========================================================================
  // WEAPON / COMBAT ENTRY POINTS (implementations mostly in guns.js)
  // ===========================================================================
  shot(o = {}) { return this.guns ? this.guns.shot(o) : null; }
  impact(surface, x, y, z, o = {}) { return this.guns ? this.guns.impact(surface, x, y, z, o) : null; }
  ricochet(x, y, z, o = {}) { return this.guns ? this.guns.ricochet(x, y, z, o) : null; }
  whizz(x, y, z, dist = 1.2, o = {}) { return this.guns ? this.guns.whizz(x, y, z, dist, o) : null; }
  reloadCue(name, o = {}) { return this.guns ? this.guns.reloadCue(name, o) : null; }
  casing(x, y, z, o = {}) { return this.guns ? this.guns.casing(x, y, z, o) : null; }
  explosion(x, y, z, o = {}) { return this.guns ? this.guns.explosion(x, y, z, o) : null; }

  hitmarker(kind = 'hit') {
    const n = kind === 'kill' ? 'hmKill' : kind === 'weak' ? 'hmWeak' : kind === 'deflect' ? 'hmDeflect' : 'hmHit';
    // §4.6: ducked to -9 dB during sustained fire, or the HUD becomes a fax machine
    const sustained = this._markersRecent(0.4) >= 3;
    this._markerT = this._markerT || [];
    this._markerT.push(this.ctx.time.elapsed);
    return this.play(n, { bus: 'ui', gain: (sustained ? dB(-9) : 1) * (kind === 'kill' ? 1.0 : 0.75), send: 0.05 });
  }

  _markersRecent(win) {
    const t = this.ctx.time.elapsed, a = this._markerT;
    if (!a) return 0;
    while (a.length && t - a[0] > win) a.shift();
    return a.length;
  }

  vocal(kind, x, y, z, o = {}) {
    const key = 'vox' + kind.charAt(0).toUpperCase() + kind.slice(1);
    let name = key;
    if (!this.buf[name]) {
      // variant-suffixed families
      for (let v = 0; v < 4; v++) if (this.buf[key + v]) { name = key + this.rngCall.int(0, 3); break; }
    }
    if (!this.buf[name]) name = 'voxSkitter0';
    const positional = x !== undefined && x !== null;
    const d = positional ? this._distToListener(x, y, z) : 24;
    // A wet vocal is an un-localisable vocal: the convolver return is diffuse
    // stereo, so at high send levels the reverb bed swamps the HRTF cues that
    // ear-tracking depends on. Physically the direct:reverberant ratio falls
    // with distance anyway — so the send RIDES distance: near-dry (25% at
    // <8 m), full wet by ~40 m. Localisation where it matters, depth where it
    // doesn't.
    const v = this.playAt(name, x, y, z, {
      bus: 'creatures',
      gain: (o.gain ?? 1) * 0.85,
      rate: (o.rate ?? 1) * (1 + this.rngCall.range(-0.07, 0.07)),
      send: 0.32 * (0.25 + 0.75 * sat((d - 8) / 32)),
      propagate: true,
      priority: 1,   // §5.5 priority order: threat audio gets occlusion rays
    });
    // threat stamp: a creature is audible -> own footsteps duck (see footstep)
    if (v && positional && d < 70) this._lastThreatT = this.ctx.time.elapsed;
    return v;
  }

  // ===========================================================================
  // FOOTSTEPS AND FOLEY (§5.6)
  // ===========================================================================
  /**
   * Three layers, always: heel (mass), surface (material), gear (soldier).
   * o: { surface, gain, sprint, ads, crouch, x,y,z, left }
   */
  footstep(o = {}) {
    if (!this.baked) return null;
    const p = this.player;
    const x = o.x ?? (p ? p.pos.x : this.ctx.camera.position.x);
    const z = o.z ?? (p ? p.pos.z : this.ctx.camera.position.z);
    const y = o.y ?? ((p ? p.pos.y - 1.68 : this.ctx.camera.position.y - 1.68) + 0.06);
    const surf = o.surface || this.surfaceAt(x, z);
    const K = this.K;

    const sprint = !!o.sprint, ads = !!o.ads, crouch = !!o.crouch;
    // §5.6: sprint 1.5x louder / 25% faster decay / 4% down. ADS 0.55x, gear 0.35x.
    // `o.gain` MUST be honoured: `land()` scales the surface layer by impact
    // velocity through it (0.9 -> 1.5), and dropping it — which is what this
    // line did before — is why a 12 m fall and a walking step put the same
    // amount of grit under the boot. §1.5's landing weight lives here.
    let g = K.footstepGain * (sprint ? 1.5 : ads ? 0.55 : crouch ? 0.42 : 1.0) * (o.gain ?? 1);
    // Own-step mix policy (playtest 2026-08-01: "too loud some of the time").
    // stepOwnDb is the standing shipped-FPS trim; on top of it the step ducks
    // while the player is shooting or while any creature is audible, so own
    // noise never masks threat audio. The §5.6 stance RATIOS above are the
    // spec and are untouched — sprint is still 1.5x its walk counterpart.
    // STEP_TRIM equalises per-surface loudness (measured, see its comment).
    {
      const t = this.ctx.time.elapsed;
      const combat = t - this._lastShotT < 2.5;
      const threat = t - this._lastThreatT < 2.0;
      const duckDb = K.stepOwnDb + (combat ? K.stepCombatDuckDb : threat ? K.stepThreatDuckDb : 0);
      g *= dB(-duckDb) * (STEP_TRIM[surf] ?? 1);
    }
    const rate = (sprint ? 0.96 : 1.0) * (1 + this.rngStep.range(-0.05, 0.05));
    const gearG = K.gearGain * g * (ads ? 0.35 : sprint ? 1.15 : 0.75);
    const send = 0.16 + 0.24 * this._open;
    const vi = this.rngStep.int(0, 3);

    this.play('heel' + (vi % 3), { x, y, z, bus: 'world', gain: 0.55 * g, rate, send: send * 0.4, air: false });
    this.play('step_' + surf + vi, {
      x, y, z, bus: 'world', gain: 0.85 * g, rate,
      send, dur: sprint ? 0.20 : undefined,
    });
    this.play('gear' + (vi % 4), { x, y: y + 1.1, z, bus: 'world', gain: 0.55 * gearG, rate: 1 + this.rngStep.range(-0.06, 0.06), send: send * 0.6 });
    this._stats.steps++;
    this.ctx.bus.emit('audio:footstep', { surface: surf, x, y, z });
    return surf;
  }

  /** §1.5 / §5.6 — landing. vy is the downward speed in m/s (positive number). */
  land(vy = 5, o = {}) {
    if (!this.baked) return;
    const p = this.player;
    const x = o.x ?? (p ? p.pos.x : 0), z = o.z ?? (p ? p.pos.z : 0);
    const y = o.y ?? (p ? p.pos.y - 1.68 : 0);
    const s = clamp(vy / 12, 0.2, 1.6);
    this.footstep({ x, y, z, gain: 0.9 + s * 0.6, surface: o.surface });
    if (vy > 3) {
      this.play('bodyThud', { x, y, z, bus: 'world', gain: 0.55 * s, rate: 1 - s * 0.10, send: 0.12, air: false });
      this.play('settle' + (this.rngStep.int(0, 1)), { x, y: y + 1.0, z, bus: 'world', gain: 0.6 * s, send: 0.2 });
    }
    if (vy > 12) {
      // hard landing: the 140 ms sub-bass thump (§1.5)
      this.play('bodyThud', { bus: 'world', gain: 0.7, rate: 0.62, send: 0 });
    }
  }

  jump() {
    if (!this.baked) return;
    this.play('cloth' + this.rngStep.int(0, 2), { bus: 'world', gain: 0.30 * this.K.gearGain, send: 0.1 });
  }

  /** Turn foley — camera angular velocity > 130 deg/s, at most once per 240 ms. */
  turnFoley(strength = 1) {
    if (this._turnCool > 0 || !this.baked) return;
    this._turnCool = 0.24;
    this.play('sling' + this.rngStep.int(0, 2), { bus: 'world', gain: 0.30 * strength * this.K.gearGain, send: 0.12 });
  }

  /** Weapon foley — the viewmodel's sway spring moving, at most once per 320 ms. */
  weaponFoley(strength = 1) {
    if (this._swayCool > 0 || !this.baked) return;
    this._swayCool = 0.32;
    this.play('cloth' + this.rngStep.int(0, 2), { bus: 'weapons', gain: 0.22 * strength * this.K.gearGain, send: 0.08 });
  }

  // ===========================================================================
  // CREATURE FOLEY + PLAYER DAMAGE (§6, and the gap §6 leaves)
  // ===========================================================================
  /** enemies.js `enemyStep`. `weight` is spec.mass in kg — that is the whole mix. */
  creatureStep(kind, p, weight = 60, landing = false) {
    if (!this.baked || this.silent || !p) return null;
    const K = this.K;
    const heavy = weight > 400, mid = weight > 90;
    const name = heavy ? 'cstepHeavy' : mid ? 'cstepMid' : 'cstepLight';
    const v = this.rngStep.int(0, 2);
    const d = this._distToListener(p.x, p.y, p.z);
    // A 900 kg footfall carries 60 m and a 46 kg one does not carry 15. Without
    // this the skitter's ticks are audible across the basin and the anchor
    // creature has no approach.
    const reach = heavy ? 70 : mid ? 34 : 20;
    if (d > reach) return null;
    // Light steps 0.62 -> 0.95 (playtest 2026-08-01): the skitter is the
    // creature the player most needs to track by ear at 0-15 m and its tick
    // was the quietest event in the creature set. Measured (equalpower probe,
    // deterministic): -10.9 dBFS peak at 8 m after this change — just above
    // an own walking step (-13.7), which is the intended hierarchy. The reach
    // gate above still keeps it out of the far field.
    const g = (landing ? 1.6 : 1.0) * (heavy ? 1.0 : mid ? 0.8 : 0.95) * K.creatureGain;
    const out = this.play(name + v, {
      x: p.x, y: p.y, z: p.z, bus: 'creatures',
      gain: g, rate: 1 + this.rngStep.range(-0.07, 0.07),
      // near-dry, like vocal(): reverb smears the ITD/ILD cues ear-tracking uses
      send: (0.14 + 0.26 * this._open) * (0.3 + 0.7 * sat((d - 6) / 26)),
      propagate: true, priority: 2,
    });
    if (out) this._lastThreatT = this.ctx.time.elapsed;
    // §6.6: the anchor is FELT before it is seen. The sub layer of a heavy
    // footfall is non-positional on purpose — you feel it through the ground,
    // and localising it would make it smaller.
    if (heavy && d < 42) {
      this.play('cstepHeavy' + v, {
        bus: 'creatures', gain: 0.30 * (1 - d / 42) * K.creatureGain,
        rate: 0.62, send: 0, lpHz: 90,
      });
    }
    return out;
  }

  /** enemies.js `enemyAttack` phase 'strike'. */
  creatureStrike(kind, p, o = {}) {
    if (!this.baked || this.silent) return null;
    const v = this.rngCall.int(0, 2);
    const q = {
      bus: 'creatures', gain: (o.gain ?? 1) * 0.9 * this.K.creatureGain,
      rate: kind === 'carapace' ? 0.72 : kind === 'bloomspitter' ? 0.88 : 1.08,
      send: 0.18, propagate: true, priority: 1,
    };
    if (p) { q.x = p.x; q.y = p.y; q.z = p.z; }
    const out = this.play('cstrike' + v, q);
    if (out) this._lastThreatT = this.ctx.time.elapsed;
    return out;
  }

  /** enemies.js `enemyProjectile` — the bloomspitter's vent firing. */
  creatureSpit(kind, p, o = {}) {
    if (!this.baked || this.silent) return null;
    const q = {
      bus: 'creatures', gain: (o.gain ?? 1) * 0.85 * this.K.creatureGain,
      rate: 1 + this.rngCall.range(-0.08, 0.08), send: 0.24, propagate: true, priority: 1,
    };
    if (p) { q.x = p.x; q.y = p.y; q.z = p.z; }
    const out = this.play('cspit' + this.rngCall.int(0, 1), q);
    if (out) this._lastThreatT = this.ctx.time.elapsed;
    return out;
  }

  /**
   * enemies.js `enemyHit` / `enemyStagger`. Rate-limited per creature kind:
   * a 725 RPM stream into one target fires this 12 times a second and a pain
   * vocal on every round turns the creature into a siren.
   */
  creaturePain(kind, p, o = {}) {
    if (!this.baked || this.silent) return null;
    const key = 'pain' + kind.charAt(0).toUpperCase() + kind.slice(1);
    const name = this.buf[key + '0'] ? key : 'painSkitter';
    const t = this.ctx.time.elapsed;
    this._painT = this._painT || Object.create(null);
    const lim = o.stagger ? 0 : 0.22;
    if (this._painT[kind] !== undefined && t - this._painT[kind] < lim) return null;
    this._painT[kind] = t;
    const q = {
      bus: 'creatures', gain: (o.gain ?? 1) * 0.7 * this.K.creatureGain,
      rate: 1 + this.rngCall.range(-0.09, 0.09), send: 0.20, propagate: true, priority: 2,
    };
    if (p) { q.x = p.x; q.y = p.y; q.z = p.z; }
    const out = this.play(name + this.rngCall.int(0, 1), q);
    if (out) this._lastThreatT = this.ctx.time.elapsed;
    return out;
  }

  /**
   * The player taking damage. Non-positional (it is happening TO the listener)
   * and it borrows §5.3's carve in reverse: dip the world bus for 180 ms so the
   * hit occupies the mix alone. Getting shot should interrupt the planet.
   */
  playerHit(amount = 10, o = {}) {
    if (!this.baked || this.silent) return null;
    const s = clamp(amount / 28, 0.35, 1.5);
    if (o.fatal) {
      this.play('pDeath', { bus: 'world', gain: 1.0, send: 0.35 });
      const T = Math.max(this.now, this.actx.currentTime);
      this.duck.gain.cancelScheduledValues(T);
      this.duck.gain.setTargetAtTime(dB(-9), T, 0.05);
      this.duck.gain.setTargetAtTime(1, T + 2.2, 0.6);
      return true;
    }
    this.play('hurt' + this.rngStep.int(0, 2), {
      bus: 'world', gain: 0.85 * s, rate: 1 - 0.10 * (s - 1), send: 0.16,
    });
    const T = Math.max(this.now, this.actx.currentTime);
    this.duck.gain.cancelScheduledValues(T);
    this.duck.gain.setTargetAtTime(dB(-4 * s), T, 0.008);
    this.duck.gain.setTargetAtTime(1, T + 0.060, 0.18 / 3);
    return true;
  }

  /** director.js `rumble` — a distant sub event. Not positional; it is the ground. */
  rumble(ms = 600, gain = 1) {
    if (!this.baked || this.silent) return null;
    return this.play('voxRumble', {
      bus: 'world', gain: 0.75 * gain, send: 0.30,
      rate: clamp(1400 / Math.max(200, ms), 0.6, 1.8), lpHz: 260,
    });
  }

  /**
   * director.js `_cue(name, pt, gain)` and `audio:cue`. The director invents
   * cue names; this maps the ones it actually emits and degrades to a distant
   * call for anything new rather than going silent (director.js grew three new
   * cue names during this build and a hard map would have dropped all three).
   */
  cue(name, o = {}) {
    if (!this.baked || this.silent || typeof name !== 'string') return null;
    const n = name.toLowerCase();
    const has = (k) => n.indexOf(k) >= 0;
    const p = o.x !== undefined ? o : null;
    const g = o.gain ?? 1;
    if (has('rumble') || has('quake')) return this.rumble(1200, g);
    if (has('player_death') || has('death') && !has('enemy')) return this.playerHit(99, { fatal: true });
    if (has('carapace')) {
      this.rumble(1400, g * 0.8);
      return this.vocal('carapace', p?.x, p?.y, p?.z, { gain: g });
    }
    if (has('bloomspitter')) return this.vocal('bloomspitter', p?.x, p?.y, p?.z, { gain: g });
    if (has('skitter') || has('chitter')) return this.vocal('skitter', p?.x, p?.y, p?.z, { gain: g });
    if (has('checkpoint') || has('objective')) return this.play('hmKill', { bus: 'ui', gain: 0.5 * g, send: 0.1 });
    // unknown cue: a distant call in the given direction. Better than nothing,
    // and it keeps a new director beat from being inaudible.
    return this.playAt('voxFar' + this.rngCall.int(0, 2), p ? p.x : 0, p ? p.y : 0, p ? p.z : 0, {
      bus: 'creatures', gain: 0.5 * g, send: 0.5, propagate: true, occl: false,
    });
  }

  /**
   * director.js tension, 0..1. There is no music in this build and there is not
   * going to be; what the director's intensity drives instead is a low beating
   * drone bed plus a widening of the reverb and a small lift of the creature
   * bus. It never resolves and it has no melodic content, so it cannot fight
   * the gunfire for the 400 Hz band §5.3 is protecting.
   */
  setTension(v, o = {}) {
    this._tensionTarget = clamp(v || 0, 0, 1);
    void o;
    return this._tensionTarget;
  }

  // ===========================================================================
  // POSITIONAL AMBIENT EMITTERS — direction is what makes a bed a place
  // ===========================================================================
  /**
   * Four looping HRTF-panned emitters, re-aimed at whatever world feature is
   * nearest every 0.5 s: liquid, flora, a fumarole, and the wick stands
   * creaking. The non-positional bed can only say "windy"; these say "the
   * stream is on your left and the forest is behind you", which is the whole
   * difference between an ambience and a place.
   *
   * Each is: loop -> tone -> occlusion LP (glided 60 ms, §5.5) -> LFO gain ->
   * gain -> HRTF panner -> world bus, plus a reverb send. Nothing is ever
   * restarted; everything after boot is AudioParam automation at 2 Hz.
   */
  _startEmitters() {
    const c = this.actx;
    const SPEC = [
      { id: 'liquid', buf: 'loopLiquid', f: 1300, q: 0.5, lfo: 0.09, depth: 0.18, send: 0.28, ref: 6 },
      { id: 'flora', buf: 'loopFlora', f: 3100, q: 0.55, lfo: 0.14, depth: 0.50, send: 0.22, ref: 9 },
      { id: 'vent', buf: 'loopVent', f: 620, q: 0.7, lfo: 0.06, depth: 0.42, send: 0.34, ref: 8 },
      { id: 'creak', buf: 'loopCreak', f: 540, q: 0.8, lfo: 0.05, depth: 0.30, send: 0.38, ref: 10 },
    ];
    this._emit = [];
    for (const s of SPEC) {
      const buf = this.buf[s.buf];
      if (!buf) continue;
      const src = c.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.playbackRate.value = 1;
      const tone = c.createBiquadFilter();
      tone.type = 'bandpass'; tone.frequency.value = s.f; tone.Q.value = s.q;
      const occ = c.createBiquadFilter();
      occ.type = 'lowpass'; occ.frequency.value = 20000; occ.Q.value = 0.4;
      const lfoG = c.createGain(); lfoG.gain.value = 1 - s.depth * 0.5;
      const lfo = c.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = s.lfo;
      const lfoAmt = c.createGain(); lfoAmt.gain.value = s.depth * 0.5;
      lfo.connect(lfoAmt); lfoAmt.connect(lfoG.gain);
      const gain = c.createGain(); gain.gain.value = 0;
      const pan = c.createPanner();
      pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse';
      pan.refDistance = s.ref; pan.rolloffFactor = 0.9; pan.maxDistance = 400;
      const send = c.createGain(); send.gain.value = s.send;
      src.connect(tone); tone.connect(occ); occ.connect(lfoG); lfoG.connect(gain);
      gain.connect(pan); pan.connect(this.busWorld);
      gain.connect(send); send.connect(this.reverbIn);
      try { src.start(0); lfo.start(0); } catch (e) { void e; }
      this._emit.push({
        ...s, src, tone, occ, gain, pan, send, lfo,
        g: 0, target: 0, x: 0, y: 0, z: 0, feature: null, occHz: 20000,
      });
    }
    // the tension bed — non-positional, straight to the world bus so §5.3's
    // duck applies to it (a gunshot must cut through the tension, not fight it)
    if (this.buf.loopTension) {
      const src = c.createBufferSource();
      src.buffer = this.buf.loopTension; src.loop = true;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 0.7;
      const g = c.createGain(); g.gain.value = 0;
      const send = c.createGain(); send.gain.value = 0.20;
      src.connect(lp); lp.connect(g); g.connect(this.busWorld);
      g.connect(send); send.connect(this.reverbIn);
      try { src.start(0); } catch (e) { void e; }
      this._tens = { src, lp, g, send };
    }
  }

  /**
   * Re-aim the emitters. Runs at 2 Hz and spends at most ONE occlusion ray per
   * call (round-robin), so four emitters cost 2 rays/s against §5.5's 8/frame
   * budget. The search is a 12-point ring at three radii — 36 cheap field
   * lookups, no allocation.
   */
  _updateEmitters(dt) {
    const E = this._emit;
    if (!E || !E.length) return;
    this._emitT -= dt;
    const T = this.actx.currentTime;
    const K = this.K, cam = this.ctx.camera;
    if (this._emitT <= 0) {
      this._emitT = 0.5;
      const t = this.terrain, w = this.water;
      const cx = cam.position.x, cz = cam.position.z;
      for (const e of E) {
        let bestS = 0, bx = cx, bz = cz + 12;
        for (let ri = 0; ri < 3; ri++) {
          const rad = [11, 26, 52][ri];
          for (let i = 0; i < 12; i++) {
            const a = i * (Math.PI / 6) + ri * 0.26;
            const x = cx + Math.cos(a) * rad, z = cz + Math.sin(a) * rad;
            let s = 0;
            if (e.id === 'liquid') s = w && w.getDepthAt ? sat(w.getDepthAt(x, z) * 2.2) : 0;
            else if (e.id === 'flora' || e.id === 'creak') s = t && t.biomeWeightAt ? t.biomeWeightAt(x, z, 'wick') : 0;
            else if (e.id === 'vent') s = t && t.biomeWeightAt ? t.biomeWeightAt(x, z, 'smoulder') : 0;
            // near is louder, but not so much that it never looks outward
            s *= 1 - 0.45 * (rad / 52);
            if (s > bestS) { bestS = s; bx = x; bz = z; }
          }
        }
        e.target = bestS * (e.id === 'creak' ? 0.55 : 1) * K.ambient * K.emitterGain;
        e.x = bx; e.z = bz;
        e.y = (t && t.heightAt ? t.heightAt(bx, bz) : 0) + (e.id === 'creak' ? 5.5 : e.id === 'vent' ? 0.8 : 0.35);
        if (e.pan.positionX) {
          e.pan.positionX.setTargetAtTime(e.x, T, 0.25);
          e.pan.positionY.setTargetAtTime(e.y, T, 0.25);
          e.pan.positionZ.setTargetAtTime(e.z, T, 0.25);
        } else e.pan.setPosition(e.x, e.y, e.z);
      }
      // one occlusion ray per call, round-robin (§5.5 priority: emitters last)
      this._emitRR = ((this._emitRR || 0) + 1) % E.length;
      const e = E[this._emitRR];
      if (e.target > 0.005 && this._rayBudget > 0) {
        const hz = this._occludes(e.x, e.y, e.z) ? K.occlusionHz * 1.4 : 20000;
        if (hz !== e.occHz) {
          e.occHz = hz;
          // §5.5's 60 ms glide. Setting .value would chatter every time the
          // player strafed behind a boulder, which is the failure the spec
          // calls out by name.
          e.occ.frequency.setTargetAtTime(hz, T, 0.020);
        }
      }
    }
    for (const e of E) {
      // 1.2 s glide on level so walking into a stand fades in rather than pops
      const k = 1 - Math.pow(0.5, dt / 0.5);
      e.g += (e.target - e.g) * k;
      e.gain.gain.setTargetAtTime(e.g, T, 0.12);
    }
    // tension bed
    this._tension += (this._tensionTarget - this._tension) * (1 - Math.pow(0.5, dt / 1.1));
    if (this._tens) {
      const v = this._tension;
      this._tens.g.gain.setTargetAtTime(v * v * 0.16 * K.ambient * K.tensionGain, T, 0.35);
      this._tens.lp.frequency.setTargetAtTime(320 + 900 * v, T, 0.35);
    }
  }

  /** Which material is under a world point. */
  surfaceAt(x, z) {
    const t = this.terrain, w = this.water;
    if (w && w.getDepthAt) {
      const d = w.getDepthAt(x, z);
      if (d > 0.03) return 'water';
      if (d > 0.0 || (w.getWetnessAt && w.getWetnessAt(x, z) > 0.55)) return 'mud';
    }
    if (this.props && this.props.surfaceAt) {
      const py = this.props.surfaceAt(x, z, (t ? t.heightAt(x, z) : 0) + 2.2);
      if (py !== null && t && py > t.heightAt(x, z) + 0.12) return 'rock';
    }
    if (t && t.biomeAt) {
      const b = t.biomeAt(x, z, this._bq);
      if (t.slopeAt && t.slopeAt(x, z) > 0.42) return 'rock';
      return BIOME_SURFACE[b.id] || 'ash';
    }
    return 'ash';
  }

  // ===========================================================================
  // THE AMBIENT BED — what makes the planet sound inhabited
  // ===========================================================================
  /**
   * Eight persistent layers, started once, never restarted. Everything after
   * this is AudioParam automation at 10 Hz, so the bed costs ~0 on the main
   * thread and a handful of filters on the audio thread.
   *
   * Layers: wind low body / wind mid / flora hiss / ground drone / liquid /
   * weather hiss / weather moan / ember crackle.
   */
  _startAmbient() {
    const c = this.actx;
    const mk = (bufName, { lp, hp, type = 'bp', f = 1000, q = 0.7, gain = 0, rate = 1 }) => {
      const src = c.createBufferSource();
      src.buffer = this.buf[bufName];
      src.loop = true;
      src.playbackRate.value = rate;
      const filt = c.createBiquadFilter();
      filt.type = type === 'bp' ? 'bandpass' : type;
      filt.frequency.value = f; filt.Q.value = q;
      const g = c.createGain(); g.gain.value = gain;
      const send = c.createGain(); send.gain.value = 0.10;
      src.connect(filt); filt.connect(g); g.connect(this.busWorld); g.connect(send); send.connect(this.reverbIn);
      void lp; void hp;
      try { src.start(0); } catch (e) { void e; }
      return { src, filt, g, send };
    };
    this._amb = {
      windLow: mk('nBrown', { type: 'lowpass', f: 220, q: 0.6, gain: 0.0, rate: 0.85 }),
      windMid: mk('nPink', { type: 'bp', f: 620, q: 0.55, gain: 0.0, rate: 1.0 }),
      floraHiss: mk('nWhite', { type: 'bp', f: 3400, q: 0.5, gain: 0.0, rate: 0.9 }),
      drone: mk('nBrown', { type: 'lowpass', f: 70, q: 1.6, gain: 0.0, rate: 0.55 }),
      liquid: mk('nWhite', { type: 'bp', f: 1500, q: 0.9, gain: 0.0, rate: 0.75 }),
      wxHiss: mk('nWhite', { type: 'bp', f: 6200, q: 0.45, gain: 0.0, rate: 1.15 }),
      wxMoan: mk('nBrown', { type: 'bp', f: 130, q: 1.1, gain: 0.0, rate: 0.7 }),
      ember: mk('emberBed', { type: 'bp', f: 2600, q: 0.6, gain: 0.0, rate: 1.0 }),
    };
    this._ambT = 0;
  }

  /**
   * Per-biome / per-weather target levels. This is the whole "the planet is
   * alive and it is a DIFFERENT place over there" mechanism, and it is the
   * cheapest identity in the build: eight gains and eight cutoffs.
   */
  _updateAmbient(dt) {
    const A = this._amb;
    if (!A) return;
    this._ambT -= dt;
    if (this._ambT > 0) return;
    this._ambT = 0.1;                     // 10 Hz automation
    // Never queue automation while the clock is frozen (suspended context) or
    // fast-forwarded: `advance(10)` would push 2 500 events onto every
    // AudioParam at the same timestamp and the event lists grow without bound.
    if (this.silent) return;
    const c = this.actx, T = c.currentTime, tc = 0.14;
    const K = this.K, w = this.ctx.world;
    const cam = this.ctx.camera;
    const amb = K.ambient * (this.K.mute ? 0 : 1);

    // --- world state
    const weather = (this.sky && this.sky.weather) || 'clear';
    this._weather = weather;
    let bw = null;
    if (this.terrain && this.terrain.biomeAt) {
      bw = this.terrain.biomeAt(cam.position.x, cam.position.z, this._bq);
      this._biome = bw.name;
    }
    const W = bw ? bw.w : null;
    const wick = W ? W[1] : 0;        // wick forest
    const glass = W ? W[3] : 0;       // blackglass
    const smoulder = W ? W[4] : 0;
    const draft = W ? W[5] : 0;
    const bench = W ? W[2] : 0;

    // wind speed from the ONE global gust signal so ambience breathes in phase
    // with the foliage shaders and the volumetric advection (ART §3.4)
    const gust = w ? w.windSpeed : 1.0;
    const breath = w ? w.breath : 0.5;
    // Exposure: benches and the draft steppe are open and windy; the grotto and
    // the wick stands are sheltered.
    const exposure = clamp(0.45 + draft * 0.55 + bench * 0.35 - wick * 0.35 + glass * 0.10, 0.1, 1.2);
    const wxWind = weather === 'storm' ? 2.3 : weather === 'spore' ? 1.35 : weather === 'rain' ? 1.25 : weather === 'haze' ? 0.8 : 1.0;

    // --- liquid proximity
    let waterG = 0;
    if (this.water && this.water.getDepthAt) {
      let best = 0;
      for (let i = 0; i < 8; i++) {
        const a = i * (Math.PI / 4), r = 9;
        const d = this.water.getDepthAt(cam.position.x + Math.cos(a) * r, cam.position.z + Math.sin(a) * r);
        if (d > best) best = d;
      }
      const here = this.water.getDepthAt(cam.position.x, cam.position.z);
      waterG = sat(Math.max(here * 3, best * 1.6));
      this._waterNear = waterG;
    }

    const set = (p, v) => p.setTargetAtTime(v, T, tc);
    const g = (layer, v) => set(A[layer].g.gain, Math.max(0, v) * amb);
    const f = (layer, v) => set(A[layer].filt.frequency, v);

    g('windLow', (0.055 + 0.075 * gust) * exposure * wxWind);
    f('windLow', 150 + 130 * breath);

    g('windMid', (0.030 + 0.070 * gust) * exposure * wxWind * (1 - 0.35 * wick));
    f('windMid', 420 + 520 * breath + 260 * exposure);
    set(A.windMid.filt.Q, 0.45 + 0.5 * (1 - breath));

    // wind THROUGH the flora: only exists where there is flora to be in
    g('floraHiss', (0.012 + 0.055 * gust) * (0.25 + wick * 1.35 + bench * 0.25));
    f('floraHiss', 2600 + 1900 * breath);

    // the planet's floor tone — biome-tinted, always present, never noticed
    g('drone', 0.055 + smoulder * 0.05 + glass * 0.02);
    f('drone', 48 + smoulder * 26 + glass * 18);

    g('liquid', waterG * 0.16);
    f('liquid', 900 + waterG * 1400);

    // weather
    const spore = weather === 'spore' ? 1 : 0, storm = weather === 'storm' ? 1 : 0, rain = weather === 'rain' ? 1 : 0;
    g('wxHiss', spore * 0.055 + storm * 0.14 + rain * 0.11);
    f('wxHiss', spore ? 5200 : storm ? 3400 : 4600);
    g('wxMoan', spore * 0.045 + storm * 0.16 + (weather === 'haze' ? 0.02 : 0));
    f('wxMoan', 105 + 60 * breath + storm * 40);

    g('ember', smoulder * 0.22);

    // --- per-biome reverb tone (see _buildGraph). Six biomes, two shelves.
    //   wick     canopy + duff: high frequencies absorbed, low mid retained
    //   glass    obsidian pavement: hard and bright, the one reflective biome
    //   smoulder hot, dust-laden air: dull and heavy
    //   draft    open steppe: thin, no low end to reflect off
    const bq = this.K.biomeReverb;
    const hiDb = (-7.5 * wick + 5.0 * glass - 3.5 * smoulder - 1.5 * draft) * bq;
    const loDb = (2.2 * wick - 1.5 * glass + 3.0 * smoulder - 3.5 * draft) * bq;
    set(this.revHi.gain, clamp(hiDb, -12, 8));
    set(this.revLo.gain, clamp(loDb, -8, 6));
    // A canopy is also less reverberant overall — foliage is an absorber, and
    // without this the wick stands read as a cathedral made of leaves.
    set(this.reverbReturn.gain, K.reverb * (1 - 0.30 * wick + 0.15 * glass));

    // bus trim
    this.busWorld.gain.setTargetAtTime(K.world, T, 0.1);
    this.busWeapons.gain.setTargetAtTime(K.weapons, T, 0.1);
    this.busCreatures.gain.setTargetAtTime(K.creatures, T, 0.1);
    this.busUI.gain.setTargetAtTime(K.ui, T, 0.1);
    if (this.master.gain.value !== (K.mute ? 0 : K.master)) this.master.gain.value = K.mute ? 0 : K.master;
  }

  /**
   * Distant creature calls. Not decoration: this is §7's 0:12 beat — a chitter
   * from behind-left with no enemy visible does more for tension than a
   * scripted event, and it costs one scheduled buffer.
   */
  _updateCalls(dt) {
    if (!this.baked) return;
    this._callTimer -= dt * this.K.callRate;
    if (this._callTimer > 0) return;
    const r = this.rngCall;
    const weather = this._weather;
    // Denser in the wick stands and under spore weather, sparse on the steppe.
    const base = weather === 'storm' ? 16 : this._biome === 'wick' ? 5.5 : this._biome === 'draft' ? 13 : 8.0;
    this._callTimer = base * r.range(0.55, 1.6);
    if (this.silent) return;
    // A FAKE distant call while a REAL creature is in earshot actively misleads
    // the ear-tracking the playtest asked for — the player would turn toward a
    // sound that is nothing. The 0:12 tension beat (§7) only exists when the
    // basin is actually empty, so suppress fakes whenever a live creature is
    // within hearing. (Timer above is already re-armed, so cadence and the rng
    // stream are unchanged.)
    const en = this.ctx.sys.enemies;
    if (en && en.live) {
      for (let i = 0; i < en.live.length; i++) {
        const c = en.live[i];
        if (c.alive && c.pos && this._distToListener(c.pos.x, c.pos.y, c.pos.z) < 70) return;
      }
    }
    const cam = this.ctx.camera;
    const a = r.range(0, Math.PI * 2), d = r.range(38, 130);
    const x = cam.position.x + Math.cos(a) * d;
    const z = cam.position.z + Math.sin(a) * d;
    const y = (this.terrain ? this.terrain.heightAt(x, z) : 0) + r.range(0.6, 14);
    const pick = r.next();
    const name = pick < 0.45 ? 'voxFar' + r.int(0, 2)
      : pick < 0.78 ? 'voxSkitter' + r.int(0, 3)
        : pick < 0.94 ? 'voxBloomspitter' + r.int(0, 2)
          : 'voxCarapace' + r.int(0, 1);
    this.playAt(name, x, y, z, {
      bus: 'creatures', gain: r.range(0.35, 0.85), rate: r.range(0.88, 1.12),
      send: 0.55, propagate: true, occl: false,
    });
  }

  /**
   * LIVE-CREATURE VOCAL CADENCE (playtest 2026-08-01, item 2).
   *
   * enemies.js emits alert/telegraph/hit/death/step events but nothing PERIODIC
   * — a creature that is merely present and stalking is silent, and a player
   * cannot track a silent creature by ear. This polls `ctx.sys.enemies.live`
   * (a per-frame read of a sibling's public state, CONTRACT §2 — no edit to
   * enemies.js) and gives every live creature an idle-vocal clock:
   *
   *   skitter       chitter every ~5.5 s idle, ~2 s alerted
   *   bloomspitter  moan    every ~8 s        ~3 s
   *   carapace      rumble  every ~11 s       ~4 s
   *
   * Alerted creatures call ~2.6x as often — DURING a fight is when tracking
   * matters most. Every call goes through vocal(): HRTF-panned, air-absorbed,
   * occlusion-tested at priority 1, near-dry reverb. The proper home for these
   * triggers (animation-synced, per-creature phase) is enemies.js; filed in
   * HANDOFF ## requests. This is the audio-side floor, not the ceiling.
   */
  _updateCreatureCalls(dt) {
    const K = this.K;
    if (K.creatureCallRate <= 0) return;
    const en = this.ctx.sys.enemies;
    if (!en || !en.live || !en.live.length) { if (this._ccall.size) this._ccall.clear(); return; }
    const M = this._ccall;
    // sweep dead/despawned entries once a second (creatures are pooled objects)
    this._ccallSweep += dt;
    if (this._ccallSweep > 1) {
      this._ccallSweep = 0;
      for (const k of M.keys()) if (!k.alive || en.live.indexOf(k) < 0) M.delete(k);
    }
    for (let i = 0; i < en.live.length; i++) {
      const c = en.live[i];
      if (!c.alive || !c.pos) continue;
      let s = M.get(c);
      if (!s) { s = { t: this.rngCall.range(0.3, 2.5) }; M.set(c, s); }
      s.t -= dt * K.creatureCallRate * (c.alerted ? 2.6 : 1);
      if (s.t > 0) continue;
      const base = c.kind === 'carapace' ? 11 : c.kind === 'bloomspitter' ? 8 : 5.5;
      s.t = base * this.rngCall.range(0.55, 1.45);
      const d = this._distToListener(c.pos.x, c.pos.y, c.pos.z);
      if (this.silent || d > 64) continue;
      // vocal from the body, not the feet — elevation is a real HRTF cue and a
      // carapace's voice comes from 1.7 m up
      const h = (c.spec && c.spec.height ? c.spec.height : 1.1) * 0.7;
      this.vocal(c.kind, c.pos.x, c.pos.y + h, c.pos.z, { gain: c.alerted ? 0.9 : 0.6 });
    }
  }

  // ===========================================================================
  // OPENNESS PROBE + OCCLUSION (§5.2, §5.5)
  // ===========================================================================
  /**
   * Six rays — straight up plus five at 60 deg from vertical — 40 m each. The
   * averaged hit fraction is the openness, which selects the gunshot tail, the
   * reverb blend, and the footstep send. The two nearest hits become the basin
   * tail's discrete slapback times, so a canyon's slapback is its ACTUAL
   * geometry rather than a preset.
   */
  _probe() {
    const cam = this.ctx.camera;
    const ox = cam.position.x, oy = cam.position.y, oz = cam.position.z;
    const DIRS = this._probeDirs || (this._probeDirs = (() => {
      const a = [[0, 1, 0]];
      const el = Math.cos(Math.PI / 3), ho = Math.sin(Math.PI / 3);
      for (let i = 0; i < 5; i++) {
        const th = i * (Math.PI * 2 / 5);
        a.push([Math.cos(th) * ho, el, Math.sin(th) * ho]);
      }
      return a;
    })());
    let occ = 0;
    let d1 = Infinity, d2 = Infinity;
    for (let i = 0; i < DIRS.length; i++) {
      const t = this._rayHit(ox, oy, oz, DIRS[i][0], DIRS[i][1], DIRS[i][2], 40);
      if (t > 0) {
        // Distance-weighted, not binary: a wall at 3 m encloses you and a ridge
        // at 38 m barely does, and a binary probe cannot tell them apart. The
        // 0.42 floor keeps a far hit meaningful (it is still not sky).
        occ += 0.42 + 0.58 * (1 - clamp(t / 40, 0, 1));
        if (t < d1) { d2 = d1; d1 = t; } else if (t < d2) d2 = t;
      }
    }
    this._openTarget = clamp(1 - occ / DIRS.length + (this.K.opennessBias || 0), 0, 1);
    // slapback = round trip / speed of sound, floored so it never flams the body
    const t1 = clamp((isFinite(d1) ? d1 : 15) * 2 / 343, 0.035, 0.30);
    const t2 = clamp((isFinite(d2) ? d2 : 36) * 2 / 343, t1 + 0.03, 0.42);
    this._early[0][0] = t1; this._early[1][0] = t2;
    this._early[0][1] = clamp(3.0 / Math.max(3, isFinite(d1) ? d1 : 15), 0.05, 0.55);
    this._early[1][1] = clamp(2.2 / Math.max(3, isFinite(d2) ? d2 : 36), 0.03, 0.40);
  }

  /**
   * Nearest hit distance along a ray, or -1. Terrain march + prop DDA.
   * `margin` is a vertical clearance the terrain must EXCEED to count as a
   * hit. The openness probe casts upward and passes 0 — its rays climb away
   * from the ground and the margin is irrelevant. Occlusion passes 0.45 m: a
   * diffraction allowance, because a sound path grazing a low crest is bent
   * over it, not blocked, and the binary -7 dB + 900 Hz verdict is too severe
   * for near-tangent terrain. MEASURED HONESTLY: on the boot-pose basin a
   * 120-point ring test at skitter height found only 5/120 terrain occlusions
   * and the margin changed none of them — flat ground was never the problem
   * (an earlier draft blamed it for a level deficit that turned out to be the
   * offline HRTF loader racing the render — see tools/_audloc.mjs header).
   * The margin only matters where a creature walks just under a dune crest or
   * ridgeline, where per-play binary occlusion would otherwise flicker.
   * Real blockers — prop boulders (29% of that ring test), true ridges —
   * exceed 0.45 m by metres and still occlude.
   */
  _rayHit(ox, oy, oz, dx, dy, dz, maxT, margin = 0) {
    this._stats.rays++;
    let best = -1;
    if (this.props && this.props.raycastColliders) {
      const h = this.props.raycastColliders(ox, oy, oz, dx, dy, dz, maxT, this._hit);
      if (h) best = h.t;
    }
    const t = this.terrain;
    if (t && t.heightAt) {
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const s = (i / steps) * maxT;
        if (best >= 0 && s > best) break;
        const y = oy + dy * s;
        if (t.heightAt(ox + dx * s, oz + dz * s) > y + margin) { best = best < 0 ? s : Math.min(best, s); break; }
      }
    }
    return best;
  }

  /**
   * §5.5's ray budget, done properly.
   *
   * The naive version — one ray per positional play, first come first served —
   * has two failures. (1) A 30-round magazine's impacts all land within a few
   * metres of each other and each one paid for its own identical raycast, so a
   * burst spent the entire 8-ray budget on redundant tests of the same wall and
   * the creature walking up behind you got no occlusion at all. (2) Whoever
   * happened to call play() first that frame won the budget, which is not the
   * documented priority order.
   *
   * So: cache the answer on a 2.5 m grid of the SOURCE (invalidated whenever
   * the listener moves 1.5 m or every 250 ms, because that is what changes the
   * answer), and reserve 3 of the 8 rays for priority <= 1 — player shots,
   * whizz-bys, the nearest creature. Failing open (unoccluded) is deliberate:
   * a missed ray that muffles a sound is a bug you can hear, a missed ray that
   * doesn't is one you cannot.
   */
  _occAt(x, y, z, priority) {
    const K = this.K;
    if (K.occlusionDb <= 0) return 0;
    const q = 2.5;
    const key = (Math.round(x / q) * 73856093) ^ (Math.round(y / q) * 19349663) ^ (Math.round(z / q) * 83492791);
    const hit = this._occCache.get(key);
    if (hit !== undefined) { this._stats.occHits++; return hit; }
    if (this._rayBudget <= 0 || (priority > 1 && this._rayBudget <= 3)) return 0;
    const b = this._occludes(x, y, z) ? 1 : 0;
    if (this._occCache.size < 128) this._occCache.set(key, b);
    return b;
  }

  /** One listener-to-source ray. True when the path is blocked (§5.5). */
  _occludes(x, y, z) {
    if (this._rayBudget <= 0) return false;
    this._rayBudget--;
    const cam = this.ctx.camera;
    let dx = x - cam.position.x, dy = y - cam.position.y, dz = z - cam.position.z;
    const d = Math.hypot(dx, dy, dz);
    if (d < 1.2) return false;
    dx /= d; dy /= d; dz /= d;
    // 0.45 m grazing clearance — see _rayHit. Sound diffracts over a bump;
    // light does not, and this ray is asking the light question.
    const t = this._rayHit(cam.position.x, cam.position.y, cam.position.z, dx, dy, dz, d - 0.6, 0.45);
    return t > 0 && t < d - 0.6;
  }

  openness() { return this._open; }

  // ===========================================================================
  // THE PUNCH MOVE AND THE AUDITORY REFLEX (§5.3, §5.4)
  // ===========================================================================
  /** Called by guns.js on every PLAYER shot. */
  punch(when) {
    if (!this.enabled || this.silent) return;
    this._lastShotT = this.ctx.time.elapsed;   // own-footstep combat duck
    const K = this.K, c = this.actx, T = Math.max(when || this.now, c.currentTime);
    // 1. duck the ambience/music bus 5 dB, 6 ms attack, 190 ms release
    const d = dB(-K.punchDuckDb);
    this.duck.gain.cancelScheduledValues(T);
    this.duck.gain.setTargetAtTime(d, T, 0.006);
    this.duck.gain.setTargetAtTime(1, T + 0.030, 0.190 / 3);
    // 2. THE MOVE: -3.5 dB at 400 Hz on everything but this shot's body, 120 ms
    const g = this.dipEQ.gain;
    g.cancelScheduledValues(T);
    g.setValueAtTime(g.value, T);
    g.linearRampToValueAtTime(-K.punchDipDb, T + 0.008);
    g.setValueAtTime(-K.punchDipDb, T + 0.120);
    g.linearRampToValueAtTime(0, T + 0.190);
    // 3. hit-marker duck under sustained fire
    this.uiDuck.gain.setTargetAtTime(this._markersRecent(0.4) >= 3 ? dB(-9) : 1, T, 0.06);
    // 4. auditory reflex, 12 ms later
    this._roundsRecent.push(this.ctx.time.elapsed);
    this._reflexHit(T + 0.012);
  }

  _reflexHit(T) {
    const K = this.K;
    this._reflexDb = Math.min(K.reflexCapDb, this._reflexDb + K.reflexDb);
    this.reflexGain.gain.cancelScheduledValues(T);
    this.reflexGain.gain.setTargetAtTime(dB(-this._reflexDb), T, 0.010);
    // >15 rounds in 3 s adds a 1.6 kHz low-pass releasing over 900 ms
    const t = this.ctx.time.elapsed;
    while (this._roundsRecent.length && t - this._roundsRecent[0] > 3) this._roundsRecent.shift();
    if (this._roundsRecent.length > 15) {
      this._reflexLPHz = 1600;
      this.reflexLP.frequency.setTargetAtTime(1600, T, 0.05);
    }
  }

  _updateReflex(dt) {
    if (!this.enabled || this.silent) return;
    if (this._reflexDb > 0.001) {
      // recover over 200 ms
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

  /** Blend the three convolution sends from the openness (§5.5). */
  _updateReverb(dt) {
    this._open = lerp(this._open, this._openTarget, 1 - Math.pow(0.5, dt / 0.35));
    if (this.silent) return;
    const o = this._open, T = this.actx.currentTime;
    // small dominates below 0.25, medium in the middle, open above 0.70
    const small = sat((0.40 - o) / 0.32);
    const open = sat((o - 0.56) / 0.30);
    const med = clamp(1 - small - open, 0, 1) + 0.12;
    this.conv.small.send.gain.setTargetAtTime(small * 0.9, T, 0.25);
    this.conv.medium.send.gain.setTargetAtTime(med * 0.8, T, 0.25);
    this.conv.open.send.gain.setTargetAtTime(open * 1.0, T, 0.25);
  }

  // ===========================================================================
  // FRAME
  // ===========================================================================
  /**
   * Sim-time clock. `advance()` and `gotoVista()` run hundreds of steps inside
   * one wall frame; scheduling from those would queue minutes of audio in
   * milliseconds and blow the voice pool. Detect it and go silent.
   */
  _clock(dt) {
    const A = this.actx;
    const w = performance.now() * 0.001;
    const dw = this._lw ? Math.min(w - this._lw, 0.5) : 0;
    this._lw = w;
    this._accSim += dt; this._accWall += dw;
    if (this._accSim > 0.25) { this._rate = this._accSim / Math.max(1e-4, this._accWall); this._accSim = 0; this._accWall = 0; }
    if (dw < dt * 0.2) this._tight++; else this._tight = 0;
    const ff = this._tight > 4 || this._rate > 3;

    const base = A.currentTime + 0.012;
    if (ff || this._sched < base || this._sched > base + 0.25) this._sched = base;
    this.now = this._sched;
    this._sched += dt;
    this.silent = ff || A.state !== 'running' || !this.enabled || !this.baked || this.K.mute;
    this._rayBudget = this.K.maxOcclusionRays;
  }

  update(dt) {
    if (!this.enabled) return;
    const t0 = performance.now();
    this._clock(dt);
    this._turnCool = Math.max(0, this._turnCool - dt);
    this._swayCool = Math.max(0, this._swayCool - dt);
    this._stepCool = Math.max(0, this._stepCool - dt);
    if (this.baked) {
      this._updateAmbient(dt);
      this._updateReverb(dt);
      this._updateReflex(dt);
      this._updateCalls(dt);
      this._updateCreatureCalls(dt);
      this._stride(dt);
      if (!this.silent) this._updateEmitters(dt);
    }
    this._stats.updMs = performance.now() - t0;
  }

  lateUpdate(dt) {
    if (!this.enabled) return;
    const t0 = performance.now();
    this._updateListener();
    this._probeAge += dt;
    if (this._probeAge > 0.2) { this._probeAge = 0; this._probe(); }
    // Occlusion cache lifetime: the answer changes when the LISTENER moves, so
    // key the flush on listener motion, not on a timer alone. 1.5 m is about
    // half a stride and is the coarsest distance that never lets a stale
    // "unoccluded" survive a step out from behind a rock.
    const cam = this.ctx.camera;
    this._occAge += dt;
    if (this._occAge > 0.25 ||
        Math.abs(cam.position.x - this._occCx) > 1.5 || Math.abs(cam.position.z - this._occCz) > 1.5) {
      this._occAge = 0; this._occCx = cam.position.x; this._occCz = cam.position.z;
      this._occCache.clear();
    }
    this._foley(dt);
    this._stats.updMs += performance.now() - t0;
  }

  _updateListener() {
    const l = this.actx.listener, cam = this.ctx.camera;
    const m = cam.matrixWorld.elements;
    // three.js columns: X = 0..2, Y = 4..6, Z = 8..10. Forward is -Z.
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

  /**
   * THE STRIDE CLOCK (§1.4). One phase drives camera bob, weapon bob and
   * footsteps; two timers is what "floaty" means and COMBAT_FEEL says so twice.
   *
   * player.js does not publish a phase yet (it has a private `bobT` on the wrong
   * coefficient). Until it does, we run the SPEC's clock here — same formula,
   * omega = 2*pi*v/strideLength — and switch to the player's the moment one of
   * `strideT` / `bobPhase` / `strideClock` appears. Filed under HANDOFF requests.
   */
  _stride(dt) {
    const p = this.player;
    // player.js is owned by a sibling and is mid-rewrite; `pos`/`vel` are not
    // guaranteed to exist on every revision that lands. update() has no
    // try/catch around it, so one missing field here takes the whole sim step
    // down and the failure reads as "audio broke the game".
    if (!p || !p.pos || !p.vel) return;
    const pub = p.strideT ?? p.bobPhase ?? p.strideClock;
    if (pub !== undefined && pub !== null) {
      if (this._ownStride) { this._ownStride = false; this._tc = pub; }
      const prev = this._tc;
      this._tc = pub;
      this._checkFootfall(prev, this._tc, p);
      return;
    }
    const inp = this.ctx.sys.input;
    const v = Math.hypot(p.vel.x, p.vel.z);
    const grounded = p.grounded !== false;
    if (!grounded || v < 0.45) { return; }
    const crouch = inp ? !!inp.crouch : false;
    const sprint = inp ? (!!inp.sprint && !crouch && v > 5.0) : v > 5.0;
    const stride = crouch ? 1.18 : sprint ? 1.86 : 1.42;
    const w = 2 * Math.PI * (v / stride);
    const prev = this._tc;
    this._tc = (this._tc + w * dt) % (Math.PI * 2);
    this._checkFootfall(prev, this._tc, p, { sprint, crouch, v });
  }

  _checkFootfall(prev, cur, p, st) {
    // crossings of 0 (left) and PI (right)
    const wrapped = cur < prev;
    const crossedPi = (prev < Math.PI && cur >= Math.PI);
    if (!wrapped && !crossedPi) return;
    if (this._stepCool > 0) return;
    this._stepCool = 0.09;
    const inp = this.ctx.sys.input;
    const v = st ? st.v : Math.hypot(p.vel.x, p.vel.z);
    const ads = inp ? !!inp.aim : false;
    this.footstep({
      sprint: st ? st.sprint : v > 5.0,
      crouch: st ? st.crouch : (inp ? !!inp.crouch : false),
      ads,
      left: wrapped,
    });
    this._stepCount++;
  }

  /**
   * §5.6 turn foley + weapon foley, both rate-limited.
   *
   * Angular velocity is measured from the camera's WORLD FORWARD VECTOR, not
   * from `camera.rotation`. Euler differencing is wrong here in three ways that
   * all bite: the pitch/yaw pair is order-dependent, it gimbals when the player
   * looks near straight up (which is where the sky is, so people do), and it
   * cannot see the roll the bob and lean springs add. The angle between two
   * unit forwards is the actual thing §5.6 means by "the camera's angular
   * velocity" and it costs one dot product.
   */
  _foley(dt) {
    if (!this.baked || this.silent) return;
    const m = this.ctx.camera.matrixWorld.elements;
    const fx = -m[8], fy = -m[9], fz = -m[10];
    const p = this._lastFwd || (this._lastFwd = { x: fx, y: fy, z: fz, has: false });
    if (!p.has) { p.x = fx; p.y = fy; p.z = fz; p.has = true; return; }
    const dot = clamp(fx * p.x + fy * p.y + fz * p.z, -1, 1);
    p.x = fx; p.y = fy; p.z = fz;
    const angVel = Math.acos(dot) / Math.max(1e-4, dt) * (180 / Math.PI);
    if (angVel > 130) this.turnFoley(clamp(angVel / 400, 0.4, 1.4));
    else if (angVel > 26) this.weaponFoley(clamp(angVel / 160, 0.25, 1.0));
  }

  // ===========================================================================
  // DEBUG / VERIFICATION
  // ===========================================================================
  /**
   * `__CB.gotoVista` -> `resetAllTemporal()` calls this on every system. Audio
   * has three temporal integrators of its own (the openness glide, the reverb
   * blend and the auditory-reflex accumulator) and without this a shot taken
   * one frame after a teleport into the grotto is still wearing the basin's
   * reverb — the capture would be a lie in exactly the way CONTRACT §6 forbids.
   */
  resetTemporal() {
    if (!this.enabled) return;
    // Forget the fast-forward history. `gotoVista` runs 30 sim steps in a tight
    // loop, which is exactly what `_clock` is built to detect — but the 0.25 s
    // rate window then keeps the mixer muted for a quarter second AFTER the
    // teleport, and a harness that teleports and immediately fires gets
    // silence. A vista change is the one moment it is correct to forget.
    this._tight = 0; this._rate = 1; this._accSim = 0; this._accWall = 0; this._lw = 0;
    this._probeAge = 999;
    this._probe();
    this._open = this._openTarget;
    this._reflexDb = 0; this._reflexLPHz = 20000; this._roundsRecent.length = 0;
    this._markerT = [];
    this._tc = 0; this._ownStride = true;
    this._lastShotT = -999; this._lastThreatT = -999;
    this._ccall.clear(); this._ccallSweep = 0;
    if (this._lastFwd) this._lastFwd.has = false;
    this._occCache.clear();
    if (this._emit) for (const e of this._emit) { e.feature = null; e.g = 0; e.target = 0; }
    if (this.actx) {
      const T = this.actx.currentTime, o = this._open;
      const small = sat((0.40 - o) / 0.32), open = sat((o - 0.56) / 0.30);
      const med = clamp(1 - small - open, 0, 1) + 0.12;
      this.conv.small.send.gain.setValueAtTime(small * 0.9, T);
      this.conv.medium.send.gain.setValueAtTime(med * 0.8, T);
      this.conv.open.send.gain.setValueAtTime(open * 1.0, T);
      this.reflexGain.gain.setValueAtTime(1, T);
      this.reflexLP.frequency.setValueAtTime(20000, T);
      this.dipEQ.gain.setValueAtTime(0, T);
      this.duck.gain.setValueAtTime(1, T);
    }
    this._ambT = 0;
  }

  // ===========================================================================
  // THE OFFLINE RENDER PROBE — the ear, for a harness that runs --mute-audio
  // ===========================================================================
  /**
   * `tests/*.mjs` launch Chrome with `--mute-audio`, so nobody — no agent, no
   * critic, no CI — can ever LISTEN to this build. Inspecting individual baked
   * buffers (`analyse()`) tells you a gunshot's body layer is 34 ms and centred
   * at 1.4 kHz, and tells you nothing about whether the four layers arrive
   * together, whether the punch carve fires before or after the transient,
   * whether the limiter is eating the sub, or whether thirty rounds phase-lock
   * into a drone. Those are all MIX questions and they only exist downstream of
   * the graph.
   *
   * So: re-target this instance at an OfflineAudioContext, rebuild the real
   * master chain on it, copy the baked buffers across, run a script through the
   * REAL shot()/footstep()/impact() code paths, and render. What comes back is
   * what the player would hear, as numbers. Every defect this pass fixed in
   * guns.js was found with it and none of them were visible in the buffers.
   *
   * The live graph is untouched: the node references are stashed and restored,
   * and the live nodes are never disconnected.
   *
   *   script(A, at)  — `at(t)` sets the schedule clock to t seconds; then call
   *                    any public method on `A`.
   */
  async renderProbe({ seconds = 2.0, script = null, ambient = false } = {}) {
    if (!this.enabled || !this.baked || this._probing) return null;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return null;
    const sr = this.sr;
    // Finish the deferred armoury on the LIVE context first, so every weapon's
    // buffers exist to be copied. Otherwise the probe lazily bakes them into the
    // offline dict, they vanish with it, and the next render finds nothing.
    if (this.guns) { try { this.guns.bakeArmoury(); } catch (e) { void e; } }
    const off = new OAC(2, Math.max(256, Math.ceil(seconds * sr)), sr);
    const KEYS = [
      'actx', 'buf', 'now', '_sched', 'silent', '_stats', '_probing',
      'master', 'limiter', 'reflexLP', 'reflexGain', 'preMaster', 'dipEQ', 'bodyShelf',
      'busWeapons', 'busWorld', 'busCreatures', 'busUI', 'duck', 'uiDuck', 'busBody',
      'reverbIn', 'reverbReturn', 'revHi', 'revLo', 'conv', 'pool', 'flat', 'busses',
      '_amb', '_emit', '_tens', '_reflexDb', '_reflexLPHz',
    ];
    const save = {};
    for (const k of KEYS) save[k] = this[k];
    this._probing = true;
    let rendered = null;
    try {
      const ob = Object.create(null);
      for (const k in this.buf) {
        const b = this.buf[k];
        const n = off.createBuffer(b.numberOfChannels, b.length, sr);
        for (let ch = 0; ch < b.numberOfChannels; ch++) n.copyToChannel(b.getChannelData(ch), ch);
        ob[k] = n;
      }
      this.actx = off;
      this.buf = ob;
      this._stats = {
        voices: 0, peakVoices: 0, plays: 0, shots: 0, steps: 0, rays: 0,
        steals: 0, reclaims: 0, occHits: 0, updMs: 0,
      };
      this._amb = null; this._emit = null; this._tens = null;
      this._reflexDb = 0; this._reflexLPHz = 20000;
      // A DELIBERATELY OVERSIZED offline pool. Voice reuse is impossible in an
      // OfflineAudioContext: `_release`/`_acquire` call `out.disconnect()`, and
      // a disconnect performed during script setup applies to the ENTIRE render,
      // so recycling a voice erases every sound that already went through it.
      // Sizing the pool so reuse never happens is the only correct answer;
      // `probeStats.steals`/`.reclaims` must both read 0 for a render to be
      // trustworthy, and the probe reports them for exactly that reason.
      this._poolOverride = [256, 768];
      this._buildGraph();
      this._poolOverride = null;
      this._bakeIRs();
      if (ambient) { this._startAmbient(); this._startEmitters(); this._ambT = 0; this._emitT = 0; }
      this.silent = false;
      this.now = 0.010; this._sched = this.now;
      this._updateListener();
      if (ambient) { this._updateAmbient(0.1); this._updateEmitters(0.1); }
      if (script) {
        await script(this, (t) => { this.now = Math.max(0.001, t); this._sched = this.now; });
      }
      rendered = await off.startRendering();
    } catch (e) {
      console.warn('[audio] renderProbe failed:', e && e.message);
    } finally {
      // The probe's own counters, captured BEFORE the restore — reading
      // `this._stats` afterwards returns the live game's numbers and the two
      // have nothing to do with each other. `steals` here is the number that
      // says whether the probe's voice pool starved and therefore whether the
      // rendered audio can be trusted at all.
      this.probeStats = this._stats;
      for (const k of KEYS) this[k] = save[k];
      this._probing = false;
    }
    return rendered;
  }

  /**
   * Numeric read of a rendered probe. `windows` is `[[label, t0, t1], ...]`.
   * dB values are dBFS. `attackMs` is time-to-90%-of-window-peak measured from
   * the window start, which is the number that says whether a transient is a
   * transient.
   */
  measureRender(rendered, windows = []) {
    if (!rendered) return null;
    const sr = rendered.sampleRate;
    const L = rendered.getChannelData(0);
    const R = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : L;
    const db = (v) => (v > 1e-7 ? +(20 * Math.log10(v)).toFixed(2) : -140);
    let clipped = 0, dc = 0, sLL = 0, sRR = 0, sLR = 0;
    for (let i = 0; i < L.length; i++) {
      const a = L[i], b = R[i];
      if (a > 0.999 || a < -0.999 || b > 0.999 || b < -0.999) clipped++;
      dc += a; sLL += a * a; sRR += b * b; sLR += a * b;
    }
    const corr = (sLL > 1e-12 && sRR > 1e-12) ? sLR / Math.sqrt(sLL * sRR) : 1;
    const pk = Math.max(peakOf(L), peakOf(R));
    const rm = rmsOf(L);
    const out = {
      ms: +(rendered.duration * 1000).toFixed(1), sr,
      peak: +pk.toFixed(4), peakDb: db(pk),
      rms: +rm.toFixed(5), rmsDb: db(rm),
      crestDb: +(db(pk) - db(rm)).toFixed(2),
      clipped, dcOffset: +(dc / L.length).toFixed(5),
      stereoCorr: +corr.toFixed(3),
      windows: {},
    };
    const BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
    for (const [label, t0, t1] of windows) {
      const a = Math.max(0, Math.round(t0 * sr)), b = Math.min(L.length, Math.round(t1 * sr));
      if (b - a < 8) continue;
      const seg = L.slice(a, b);
      const p = peakOf(seg), rr = rmsOf(seg);
      let att = 0;
      for (let i = 0; i < seg.length; i++) if (Math.abs(seg[i]) >= p * 0.9) { att = i; break; }
      const e = [];
      for (const f of BANDS) {
        const cpy = Float32Array.from(seg);
        biquad(cpy, sr, 'bp', f, 0.9);
        e.push(rmsOf(cpy));
      }
      const tot = e.reduce((s, v) => s + v, 0) || 1;
      let cen = 0;
      for (let i = 0; i < BANDS.length; i++) cen += BANDS[i] * (e[i] / tot);
      out.windows[label] = {
        peak: +p.toFixed(4), peakDb: db(p), rmsDb: db(rr),
        attackMs: +(att / sr * 1000).toFixed(2),
        centroidHz: Math.round(cen),
        bandsDb: e.map(v => db(v)),
      };
    }
    return out;
  }

  /**
   * §5.1's anti-machine-gun rule, as a number.
   *
   * Renders `n` rounds at `rpm` through the real graph and asks two separate
   * questions about consecutive rounds:
   *
   *   waveCorr        normalised cross-correlation of the first 55 ms of shot i
   *                   against shot i+1, measured on a BODY-LAYER-ONLY render.
   *                   THIS is the drone metric: replaying one identical buffer
   *                   gives 1.00 and the result phase-locks into a buzz. Under
   *                   0.35 is decorrelated.
   *                   It has to be body-only. Measured on the full mix the
   *                   number sits at 0.57-0.67 no matter what the gun does,
   *                   because at 725 RPM every 55 ms window also contains the
   *                   summed tails of the previous fifteen rounds — a bed which
   *                   is genuinely stationary and correctly so. That confounder
   *                   makes the full-mix figure useless as a verdict on §5.1.
   *   spectralSpread  mean pairwise cosine distance between 8-band energy
   *                   vectors — how much the TIMBRE moves shot to shot. Wants to
   *                   be non-zero but small; large would mean the gun does not
   *                   sound like one gun.
   *
   * (An earlier revision measured envelope autocorrelation at the shot period.
   * That number is ~0.9 for ANY evenly-spaced rhythm including a perfectly
   * decorrelated one — it measures the fire rate, not the artefact.)
   *
   * `subT` is set to `dt` so `when === now` and the windows land on the shots;
   * getting that wrong silently shifts every window by one period and makes the
   * whole table read as noise.
   */
  async magazineTest({ n = 30, rpm = 725, weapon = 'cinder' } = {}) {
    const per = 60 / rpm;
    const t0 = 0.05;
    const r = await this.renderProbe({
      seconds: n * per + 1.6,
      script: (A, at) => {
        for (let i = 0; i < n; i++) {
          at(t0 + i * per);
          A.shot({ weapon, ammo: 30 - i, player: true, dt: 1 / 60, subT: 1 / 60 });
        }
      },
    });
    if (!r) return null;
    const full = this.probeStats;
    // Second render, body layer alone — see waveCorr above.
    const rb = await this.renderProbe({
      seconds: n * per + 0.6,
      script: (A, at) => {
        for (const k of ['weapons', 'world', 'creatures', 'ui']) A.busses[k].gain.value = 0;
        A.reverbReturn.gain.value = 0;
        for (let i = 0; i < n; i++) {
          at(t0 + i * per);
          A.shot({ weapon, ammo: 30 - i, player: true, dt: 1 / 60, subT: 1 / 60 });
        }
      },
    });
    const sr = r.sampleRate, L = r.getChannelData(0);
    const B = rb ? rb.getChannelData(0) : L;
    const BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
    const wN = Math.round(Math.min(0.055, per * 0.9) * sr);
    const vecs = [], peaks = [], segs = [];
    for (let i = 0; i < n; i++) {
      const a = Math.round((t0 + i * per) * sr);
      const b = Math.min(L.length, a + Math.round(per * sr));
      if (b - a < 64) break;
      const seg = L.slice(a, b);
      peaks.push(peakOf(seg));
      segs.push(B.slice(Math.min(B.length, a), Math.min(B.length, a + wN)));
      const e = [];
      for (const f of BANDS) { const c = Float32Array.from(seg); biquad(c, sr, 'bp', f, 0.9); e.push(rmsOf(c)); }
      const norm = Math.hypot(...e) || 1;
      vecs.push(e.map(v => v / norm));
    }
    let sum = 0, cnt = 0;
    for (let i = 0; i < vecs.length; i++) {
      for (let j = i + 1; j < vecs.length; j++) {
        let d = 0;
        for (let k = 0; k < 8; k++) d += vecs[i][k] * vecs[j][k];
        sum += 1 - d; cnt++;
      }
    }
    // Windows quieter than -70 dBFS are SKIPPED, not scored. Two silent windows
    // cross-correlate to a meaningless 1.0 and that false positive is exactly
    // what made this metric accuse a working gun of droning; `silentWindows`
    // is reported so a starved voice pool can never hide inside the average.
    let wc = 0, wcN = 0, wcMax = 0, quiet = 0;
    for (let i = 0; i + 1 < segs.length; i++) {
      const a = segs[i], b = segs[i + 1];
      if (peakOf(a) < 3.2e-4 || peakOf(b) < 3.2e-4) { quiet++; continue; }
      const m = Math.min(a.length, b.length);
      let ab = 0, aa = 0, bb = 0;
      for (let k = 0; k < m; k++) { ab += a[k] * b[k]; aa += a[k] * a[k]; bb += b[k] * b[k]; }
      const c = Math.abs(ab / Math.sqrt(aa * bb));
      wc += c; wcN++;
      if (c > wcMax) wcMax = c;
    }
    const pm = peaks.reduce((s, v) => s + v, 0) / Math.max(1, peaks.length);
    const pv = Math.sqrt(peaks.reduce((s, v) => s + (v - pm) * (v - pm), 0) / Math.max(1, peaks.length));
    const last = peaks.length - 1;
    return {
      rounds: peaks.length, rpm,
      pairsScored: wcN, silentWindows: quiet,
      steals: full ? full.steals : -1,
      reclaims: full ? full.reclaims : -1,
      peakVoices: full ? full.peakVoices : -1,
      waveCorr: +(wc / Math.max(1, wcN)).toFixed(4),
      waveCorrMax: +wcMax.toFixed(4),
      spectralSpread: +(sum / Math.max(1, cnt)).toFixed(5),
      peakMean: +pm.toFixed(4), peakStd: +pv.toFixed(4),
      peakSpreadPct: +(100 * pv / Math.max(1e-6, pm)).toFixed(2),
      mix: this.measureRender(r, [
        ['first', t0, t0 + per],
        ['last', t0 + last * per, t0 + (last + 1) * per],
      ]),
    };
  }

  bufferNames() { return Object.keys(this.buf).sort(); }

  /** Numeric read of a baked buffer — the harness runs muted, so this is the ear. */
  analyse(name) {
    const b = this.buf[name];
    if (!b) return null;
    const d = b.getChannelData(0);
    const sr = b.sampleRate;
    // crude spectral centroid via 8 octave bands on a copy
    const bands = [80, 160, 320, 640, 1280, 2560, 5120, 10240];
    const e = [];
    for (let i = 0; i < bands.length; i++) {
      const c = Float32Array.from(d);
      biquad(c, sr, 'bp', bands[i], 0.9);
      e.push(rmsOf(c));
    }
    const tot = e.reduce((s, v) => s + v, 0) || 1;
    let cen = 0;
    for (let i = 0; i < bands.length; i++) cen += bands[i] * (e[i] / tot);
    // onset: first sample above 1% of peak (does the sound START on time?)
    // attack: samples to 90% of peak (where the energy actually lands)
    const pk = peakOf(d);
    let att = 0, ons = 0;
    for (let i = 0; i < d.length; i++) { if (Math.abs(d[i]) >= pk * 0.9) { att = i; break; } }
    for (let i = 0; i < d.length; i++) { if (Math.abs(d[i]) >= pk * 0.01) { ons = i; break; } }
    // decay: last sample above -40 dB of peak
    let dec = 0;
    for (let i = d.length - 1; i >= 0; i--) { if (Math.abs(d[i]) > pk * 0.01) { dec = i; break; } }
    return {
      name, ch: b.numberOfChannels, sr, ms: +(b.duration * 1000).toFixed(1),
      peak: +pk.toFixed(4), rms: +rmsOf(d).toFixed(5),
      onsetMs: +(ons / sr * 1000).toFixed(2),
      attackMs: +(att / sr * 1000).toFixed(2),
      decayMs: +(dec / sr * 1000).toFixed(1),
      centroidHz: Math.round(cen),
      bandRms: e.map(v => +v.toFixed(5)),
    };
  }

  debugInfo() {
    return {
      enabled: this.enabled,
      baked: this.baked,
      state: this.actx ? this.actx.state : 'none',
      sampleRate: this.sr || 0,
      silent: this.silent,
      bakeMs: this.bakeMs || 0,
      buffers: Object.keys(this.buf).length,
      bufferSamples: Object.values(this.buf).reduce((s, b) => s + b.length * b.numberOfChannels, 0),
      voices: this._stats.voices, peakVoices: this._stats.peakVoices,
      pool: [this.pool.length, this.flat.length], steals: this._stats.steals, reclaims: this._stats.reclaims,
      plays: this._stats.plays, shots: this._stats.shots, steps: this._stats.steps,
      rays: this._stats.rays,
      updMs: +this._stats.updMs.toFixed(3),
      openness: +this._open.toFixed(3),
      early: this._early.map(e => [+e[0].toFixed(3), +e[1].toFixed(3)]),
      reverb: {
        small: +this.conv.small.send.gain.value.toFixed(3),
        medium: +this.conv.medium.send.gain.value.toFixed(3),
        open: +this.conv.open.send.gain.value.toFixed(3),
        irMs: ['small', 'medium', 'open'].map(k => this.conv[k].node.buffer ? Math.round(this.conv[k].node.buffer.duration * 1000) : 0),
      },
      revTone: [+this.revHi.gain.value.toFixed(2), +this.revLo.gain.value.toFixed(2)],
      emitters: this._emit ? this._emit.map(e => ({
        id: e.id, g: +e.g.toFixed(4), target: +e.target.toFixed(4),
        at: [Math.round(e.x), Math.round(e.y), Math.round(e.z)], occHz: Math.round(e.occHz),
      })) : null,
      tension: +this._tension.toFixed(3),
      occCache: this._occCache.size, occHits: this._stats.occHits,
      armouryMs: this.armouryMs || 0,
      biome: this._biome, weather: this._weather,
      surface: this.terrain ? this.surfaceAt(this.ctx.camera.position.x, this.ctx.camera.position.z) : 'n/a',
      stride: { phase: +this._tc.toFixed(3), steps: this._stepCount, own: this._ownStride },
      stepDuck: {
        ownDb: this.K.stepOwnDb,
        combat: this.ctx.time.elapsed - this._lastShotT < 2.5,
        threat: this.ctx.time.elapsed - this._lastThreatT < 2.0,
      },
      creatureCalls: this._ccall.size,
      reflexDb: +this._reflexDb.toFixed(2),
      dipDb: +this.dipEQ.gain.value.toFixed(2),
      duck: +this.duck.gain.value.toFixed(3),
      guns: this.guns ? this.guns.debugInfo() : null,
    };
  }

  dispose() {
    if (this._resumeHandler) {
      for (const ev of ['pointerdown', 'keydown', 'mousedown', 'touchstart']) {
        window.removeEventListener(ev, this._resumeHandler);
      }
    }
    if (this.actx) this.actx.close().catch(() => {});
    this.enabled = false;
  }
}

export default Audio;
