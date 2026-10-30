// AL DENTE: all of the game's sound, synthesized live with the Web Audio API.
// No sample files, no libraries, no network.
//
// Nothing creates or resumes an AudioContext until unlock() is called from a key or pointer
// handler. Every public method is a silent no-op before that, never throws, and costs little.
//
// How it works. Every sound is built from noise, tiny resonators and bubbles (see the _v*
// builders below). Right after unlock, each event family is rendered once, in the background,
// into a small bank of variants through an OfflineAudioContext (same builders), and every
// variant is normalized to the same loudness. During play an event is then one buffer source
// through a pooled filter/gain/pan strip, with a random variant, pitch, gain, filter and pan,
// so repeats never sound identical and a footstep costs a few microseconds. Until a family's
// bank is ready (the first moments after unlock) the builders play live instead.
//
// Palette (foley, not game beeps):
//   cooked pasta  low-mid and damped: soft pats, wet squelch, sticky crackle, bubble plops
//   dry pasta     bright and clicky: small modal "tick-tack" knocks, sharp cracks, splinters
//   pastina       granular crunch and pour
//   dry tortellini  hollow ring ticks when they roll, a hollow crack and a rattle when they shatter
//   opening screen  pulled noodles: a wet, creaky tension loop, a wet thwip when one snaps, a jiggle
//   the bay       starchy water: plops and spray, swim strokes and bubbles, the shell's gush, a
//                 squid; under water the game mix is muffled and a low, slow bed comes up
//   the mountain  orzo snow: a soft squeaky crunch, a whumpf into a drift, clumps off the pines;
//                 the wet lasagna bobsled run: hiss, rumble, scrape and a rubbery squeal; cold
//                 wind with slow gusts in place of the summer air
//   tone          only where it's needed: a muted plucked strand (spring), a soft cadence (star)
//
// Levels: LV is the loudness of each event at full intensity (dB, loudest 30 ms, before the
// master volume). _test/audio-test.html renders everything offline and prints the numbers.

const TAU = Math.PI * 2;
const R = Math.random;
const rr = (a, b) => a + (b - a) * R();
const ri = (a, b) => Math.floor(a + (b - a + 1) * R());
const pick = (a) => a[Math.floor(R() * a.length)];
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const fin = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const c01 = (x, d) => clamp(fin(x, d), 0, 1);
const dB = (d) => Math.pow(10, d / 20);
const semi = (s) => Math.pow(2, s / 12);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const surf = (x) => {
  const s = typeof x === 'string' ? x.toLowerCase() : '';
  if (s === 'dry') return 'dry';
  if (s === 'grain' || s === 'pastina') return 'grain';
  if (s === 'sand') return 'sand';
  if (s === 'snow') return 'snow';
  if (s === 'slick') return 'slick';
  return 'cooked';
};
// BiquadFilter Q is in dB for lowpass/highpass and linear for the rest.
const qv = (type, q) => (type === 'lowpass' || type === 'highpass' ? 20 * Math.log10(Math.max(q, 0.05)) : q);

// Loudness at full intensity: dB of the loudest 30 ms, before the master volume (0.7 = -3 dB).
// (slide, stretch, wind, air, room, uwBed, shore, sled and mtn are raw gains on their loops;
// simmer on its bubbles.)
const LV = {
  step_cooked: -33, step_dry: -34, step_grain: -34, jump: -38,
  land_cooked: -22, land_dry: -22, land_grain: -22, stick: -23, leap: -26, creak: -27,
  snap: -21, clatter: -28, spring: -22, bonk: -24, collect: -25, sink: -24, respawn: -26, star: -24,
  strandSnap: -26, wobble: -33, roll: -33, shatter: -20, enter: -25,
  step_sand: -34, land_sand: -22, splash: -20, emerge: -26, paddle: -37, bubble: -41, burst: -23,
  squid_pulse: -33, squid_bonk: -23, squid_ink: -31,
  step_snow: -34, land_snow: -22.5, step_slick: -34, land_slick: -22, launch: -29, thump: -27,
  slide: -17.5, stretch: -23, wind: -30, air: -49, simmer: -38, room: -36, uwBed: -32.5, shore: -24,
  sled: -23.5, mtn: -32, music: -30.5,
};
const WHISTLE = 5.5; // the summit whistle's narrow bands, relative to the mountain wind's body

// Event families. slot: seconds per rendered variant; ps: intensities rendered; n: variants per
// intensity; ch: channels; v: live builder; cal: builder's own loudness (dB), for the live path;
// j: per-play randomization (rate +/-, gain +/- dB, pan +/-, time jitter s, lowpass range Hz).
const FAM = {
  step_cooked: { slot: 0.14, ps: [0.35, 1], n: 8, ch: 1, v: '_vStepCooked', cal: -28.4, j: { r: 0.06, g: 1.5, p: 0.08, t: 0.005, lp: [4500, 11000] } },
  step_dry: { slot: 0.15, ps: [0.35, 1], n: 8, ch: 1, v: '_vStepDry', cal: -21.9, j: { r: 0.06, g: 1.5, p: 0.08, t: 0.005, lp: [8000, 16000] } },
  step_grain: { slot: 0.15, ps: [0.35, 1], n: 8, ch: 1, v: '_vStepGrain', cal: -29.2, j: { r: 0.06, g: 1.5, p: 0.08, t: 0.005, lp: [7000, 16000] } },
  jump: { slot: 0.16, ps: [1], n: 6, ch: 1, v: '_vJump', cal: -24.8, j: { r: 0.06, g: 1, p: 0.05, t: 0, lp: [6000, 14000] } },
  land_cooked: { slot: 0.6, ps: [0.2, 0.55, 1], n: 3, ch: 1, v: '_vLandCooked', cal: -22.4, j: { r: 0.04, g: 1, p: 0.1, t: 0, lp: [5000, 14000] } },
  land_dry: { slot: 0.36, ps: [0.2, 0.55, 1], n: 3, ch: 2, v: '_vLandDry', cal: -16.2, j: { r: 0.04, g: 1, p: 0.1, t: 0, lp: [9000, 18000] } },
  land_grain: { slot: 0.6, ps: [0.2, 0.55, 1], n: 3, ch: 1, v: '_vLandGrain', cal: -25.3, j: { r: 0.04, g: 1, p: 0.1, t: 0, lp: [8000, 18000] } },
  stick: { slot: 0.6, ps: [0.25, 0.6, 1], n: 3, ch: 1, v: '_vStick', cal: -23.7, j: { r: 0.05, g: 1, p: 0.1, t: 0, lp: [7000, 16000] } },
  leap: { slot: 0.5, ps: [1], n: 6, ch: 1, v: '_vLeap', cal: -20.9, j: { r: 0.05, g: 1, p: 0.08, t: 0, lp: [8000, 16000] } },
  creak: { slot: 0.6, ps: [0.2, 0.55, 1], n: 3, ch: 1, v: '_vCreak', cal: -18.8, j: { r: 0.08, g: 1, p: 0.25, t: 0, lp: [7000, 14000] } },
  snap: { slot: 0.8, ps: [0.2, 0.6, 1], n: 3, ch: 2, v: '_vSnap', cal: -16.1, j: { r: 0.06, g: 0.8, p: 0.1, t: 0, lp: [10000, 18000] } },
  spring: { slot: 0.8, ps: [0.3, 1], n: 3, ch: 1, v: '_vSpring', cal: -17.6, j: { r: 0.03, g: 1, p: 0.05, t: 0, lp: null } },
  bonk: { slot: 0.32, ps: [1], n: 6, ch: 1, v: '_vBonk', cal: -9, j: { r: 0.05, g: 1, p: 0.15, t: 0, lp: null } },
  sink: { slot: 1.6, ps: [1], n: 3, ch: 1, v: '_vSink', cal: -23.4, j: { r: 0.04, g: 0.8, p: 0.05, t: 0, lp: null } },
  respawn: { slot: 0.5, ps: [1], n: 4, ch: 1, v: '_vRespawn', cal: -11.2, j: { r: 0.05, g: 0.8, p: 0.05, t: 0, lp: null } },
  star: { slot: 3.9, ps: [1], n: 2, ch: 2, v: '_vStar', cal: -20.4, j: { r: 0, g: 0, p: 0, t: 0, lp: null } },
  wobble: { slot: 0.8, ps: [0.4, 1], n: 3, ch: 1, v: '_vWobble', cal: -16.6, j: { r: 0.06, g: 1, p: 0.08, t: 0, lp: null } },
  strandSnap: { slot: 0.45, ps: [1], n: 6, ch: 1, v: '_vStrandSnap', cal: -21.8, j: { r: 0.06, g: 1, p: 0.1, t: 0, lp: [7000, 14000] } },
  shatter: { slot: 1.0, ps: [0.35, 1], n: 3, ch: 2, v: '_vShatter', cal: -14.3, j: { r: 0.05, g: 0.8, p: 0.1, t: 0, lp: [10000, 18000] } },
  enter: { slot: 0.9, ps: [1], n: 3, ch: 2, v: '_vEnter', cal: -15.6, j: { r: 0.03, g: 0.8, p: 0, t: 0, lp: null } },
  // The bay. bus 'w': sounds voiced as heard under water skip the underwater low-pass.
  step_sand: { slot: 0.17, ps: [0.35, 1], n: 8, ch: 1, v: '_vStepSand', cal: -26.7, j: { r: 0.06, g: 1.5, p: 0.08, t: 0.005, lp: [5000, 11000] } },
  land_sand: { slot: 0.6, ps: [0.2, 0.55, 1], n: 3, ch: 1, v: '_vLandSand', cal: -20.3, j: { r: 0.04, g: 1, p: 0.1, t: 0, lp: [6000, 14000] } },
  splash: { slot: 1.2, ps: [0.3, 1], n: 3, ch: 2, v: '_vSplash', cal: -14, j: { r: 0.05, g: 1, p: 0.1, t: 0, lp: [9000, 16000] } },
  emerge: { slot: 1.2, ps: [0.4, 1], n: 3, ch: 1, v: '_vEmerge', cal: -19.9, j: { r: 0.05, g: 1, p: 0.1, t: 0, lp: [8000, 16000] } },
  paddle: { slot: 0.5, ps: [0.4, 1], n: 6, ch: 1, v: '_vPaddle', cal: -15.8, bus: 'w', j: { r: 0.07, g: 1.5, p: 0.12, t: 0.015, lp: [1500, 3500] } },
  burst: { slot: 2.0, ps: [0.5, 1], n: 2, ch: 2, v: '_vBurst', cal: -9.2, bus: 'w', j: { r: 0.04, g: 0.8, p: 0.1, t: 0, lp: null } },
  squid_pulse: { slot: 0.6, ps: [1], n: 5, ch: 1, v: '_vSquidPulse', cal: -12.7, bus: 'w', j: { r: 0.06, g: 1, p: 0.2, t: 0, lp: [1200, 2500] } },
  squid_bonk: { slot: 0.6, ps: [1], n: 5, ch: 1, v: '_vSquidBonk', cal: -13.5, bus: 'w', j: { r: 0.06, g: 1, p: 0.15, t: 0, lp: [3000, 7000] } },
  squid_ink: { slot: 0.9, ps: [1], n: 4, ch: 1, v: '_vSquidInk', cal: -12.8, bus: 'w', j: { r: 0.05, g: 1, p: 0.2, t: 0, lp: [1200, 2400] } },
  // The mountain.
  step_snow: { slot: 0.24, ps: [0.35, 1], n: 8, ch: 1, v: '_vStepSnow', cal: -24, j: { r: 0.06, g: 1.5, p: 0.08, t: 0.005, lp: [6000, 12000] } },
  land_snow: { slot: 0.6, ps: [0.2, 0.55, 1], n: 3, ch: 1, v: '_vLandSnow', cal: -22.3, j: { r: 0.04, g: 1, p: 0.1, t: 0, lp: [5000, 12000] } },
  step_slick: { slot: 0.16, ps: [0.35, 1], n: 8, ch: 1, v: '_vStepSlick', cal: -26.5, j: { r: 0.06, g: 1.5, p: 0.08, t: 0.005, lp: [6000, 14000] } },
  land_slick: { slot: 0.5, ps: [0.2, 0.55, 1], n: 3, ch: 1, v: '_vLandSlick', cal: -21.3, j: { r: 0.04, g: 1, p: 0.1, t: 0, lp: [7000, 16000] } },
  launch: { slot: 0.85, ps: [0.4, 1], n: 4, ch: 1, v: '_vLaunch', cal: -16, j: { r: 0.05, g: 1, p: 0.1, t: 0, lp: [8000, 16000] } },
  thump: { slot: 1.1, ps: [0.4, 1], n: 3, ch: 1, v: '_vThump', cal: -24.7, j: { r: 0.05, g: 1, p: 0.3, t: 0, lp: [6000, 12000] } },
};
// Render order after unlock: the opening screen's sounds first, the later stages' last.
const ORDER = ['wobble', 'strandSnap', 'enter', 'step_cooked', 'step_dry', 'step_grain', 'jump', 'land_cooked', 'land_dry',
  'land_grain', 'stick', 'leap', 'bonk', 'snap', 'sink', 'respawn', 'creak', 'spring', 'star', 'shatter',
  'step_sand', 'land_sand', 'splash', 'paddle', 'emerge', 'squid_pulse', 'squid_bonk', 'squid_ink', 'burst',
  'step_snow', 'land_snow', 'step_slick', 'land_slick', 'launch', 'thump'];

const MAXV = 48; // live-builder voices before low-priority events are dropped
const STRIPS = 12; // pooled playback strips made at unlock; grows on demand up to 24 (32 for important events)
const LOOKAHEAD = 0.008; // seconds; keeps envelopes from starting in the past
const TRIM = 0.76; // master trim: cancels the compressor's built-in makeup gain (+2.4 dB, measured)
const SHARED = new Map(); // offline rendering only: buffers + banks per sample rate, built once

// ---------------------------------------------------------------------------------------------
// Sample-level generators (fast: xorshift noise and a sine table).

const RS = new Int32Array([(Math.random() * 2147483647) | 1]); // xorshift32 state
function nr() { let x = RS[0]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; RS[0] = x; return x / 2147483648; }
const SIN_N = 4096;
const SIN = new Float32Array(SIN_N + 1);
for (let i = 0; i <= SIN_N; i++) SIN[i] = Math.sin((i / SIN_N) * TAU);

function mkbuf(ctx, sec, ch) {
  return ctx.createBuffer(ch || 1, Math.max(2, Math.floor(sec * ctx.sampleRate)), ctx.sampleRate);
}
function normPeak(d, p) {
  let m = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > m) m = a; }
  if (m > 0) { const k = p / m; for (let i = 0; i < d.length; i++) d[i] *= k; }
}
function normRms(d, r) {
  let s = 0;
  for (let i = 0; i < d.length; i++) s += d[i] * d[i];
  const m = Math.sqrt(s / d.length);
  if (m > 0) { const k = r / m; for (let i = 0; i < d.length; i++) d[i] *= k; }
}
function fadeTail(d, n) {
  const L = d.length;
  n = Math.min(n, L);
  for (let k = 0; k < n; k++) d[L - 1 - k] *= k / n;
}
function dcBlock(d, sr, fc) {
  const a = 1 / (1 + (TAU * fc) / sr);
  let x1 = 0, y1 = 0;
  for (let i = 0; i < d.length; i++) { const x = d[i]; const y = a * (y1 + x - x1); x1 = x; y1 = y; d[i] = y; }
}
// Loudest 30 ms RMS over all channels of [a, a + len) (a running window). Returns linear RMS.
function loud(chs, a, len, sr) {
  const W = Math.max(1, Math.round(0.03 * sr)), C = chs.length, end = a + len, w0 = Math.min(end, a + W);
  const L = chs[0], Rr = C > 1 ? chs[1] : null;
  let sum = 0, best = 0;
  if (Rr) {
    for (let i = a; i < w0; i++) sum += L[i] * L[i] + Rr[i] * Rr[i];
    best = sum;
    for (let i = a + W, j = a; i < end; i++, j++) {
      sum += L[i] * L[i] + Rr[i] * Rr[i] - L[j] * L[j] - Rr[j] * Rr[j];
      if (sum > best) best = sum;
    }
  } else {
    for (let i = a; i < w0; i++) sum += L[i] * L[i];
    best = sum;
    for (let i = a + W, j = a; i < end; i++, j++) { sum += L[i] * L[i] - L[j] * L[j]; if (sum > best) best = sum; }
  }
  return Math.sqrt(Math.max(0, best) / (W * C));
}
// Cyclic Catmull-Rom through random control points: a smooth random walk that loops seamlessly.
function cyc(ctrl) {
  const K = ctrl.length;
  return (u) => {
    const x = (u - Math.floor(u)) * K, i = Math.floor(x), t = x - i;
    const p0 = ctrl[(i - 1 + K) % K], p1 = ctrl[i % K], p2 = ctrl[(i + 1) % K], p3 = ctrl[(i + 2) % K];
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
  };
}
// One damped mode (sine start, so no click): r^n sin(wn).
function addMode(d, len, f, amp, t60, sr) {
  if (f >= sr * 0.45) return;
  const w = (TAU * f) / sr, r = Math.pow(0.001, 1 / (t60 * sr)), c = 2 * r * Math.cos(w), r2 = r * r;
  let y2 = 0, y1 = r * Math.sin(w) * amp;
  for (let k = 1; k < len; k++) { d[k] += y1; const y = c * y1 - r2 * y2; y2 = y1; y1 = y; }
}
// A crisp contact click: differentiated noise with a fast decay.
function addClick(d, sr, dur, amp) {
  const n = Math.min(d.length, Math.ceil(dur * sr)), k1 = Math.exp(-1 / Math.max(1, sr * dur * 0.3));
  let prev = 0, e = 1;
  for (let k = 0; k < n; k++) { const w = nr() * e; d[k] += amp * (w - prev); prev = w; e *= k1; }
}
// A tick that rings briefly at f. The input is scaled so the ring peaks near amp.
function ring(d, n, at, f, amp, tauS, sr, wrap) {
  const w = (TAU * f) / sr, r = Math.exp(-1 / tauS), c = 2 * r * Math.cos(w), r2 = r * r, L = Math.ceil(tauS * 6);
  let y1 = 0, y2 = 0, i = at;
  for (let k = 0; k < L; k++, i++) {
    const y = (k === 0 ? amp * Math.sin(w) : 0) + c * y1 - r2 * y2; y2 = y1; y1 = y;
    if (i >= n) { if (!wrap) break; i -= n; }
    d[i] += y;
  }
}
// A bubble (van den Doel's liquid model): a damped sine whose pitch rises as it closes.
function bubble(d, n, at, f0, amp, sr, xi, dampK, maxLen, wrap) {
  const dec = (0.13 * f0 + 0.0072 * Math.pow(f0, 1.5)) * dampK;
  const len = Math.max(8, Math.min(Math.ceil((5 / dec) * sr), Math.ceil(maxLen * sr)));
  const k1 = Math.exp(-dec / sr), fadeN = Math.max(1, Math.floor(len * 0.25)), fadeAt = len - fadeN, fk = 1 / fadeN;
  const dinc = (f0 * xi * dec) / (sr * sr), S = SIN, SN = SIN_N;
  let ph = 0, inc = f0 / sr, env = amp, i = at;
  for (let k = 0; k < len; k++, i++) {
    if (i >= n) { if (!wrap) break; i -= n; }
    const x = ph * SN, j = x | 0, s = S[j] + (S[j + 1] - S[j]) * (x - j);
    d[i] += (k < fadeAt ? env : env * (len - k) * fk) * s;
    ph += inc; if (ph >= 1) ph -= 1;
    inc += dinc; env *= k1;
  }
}
function poisson(rate, sr) { return Math.max(1, Math.round((-Math.log(1 - R()) / rate) * sr)); }

// The heavier generators are JS generator functions: they yield every millisecond or so of work,
// so the warm-up after unlock can run in short slices between frames. run() drives one to the end.
function run(g) { let r = g.next(); while (!r.done) r = g.next(); return r.value; }

function* gWhite(ctx, sec, ch) {
  const b = mkbuf(ctx, sec, ch);
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i0 = 0; i0 < d.length; i0 += 65536) {
      const e = Math.min(d.length, i0 + 65536);
      let x = RS[0];
      for (let i = i0; i < e; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; d[i] = x / 2147483648; }
      RS[0] = x;
      yield;
    }
  }
  return b;
}
function* gPink(ctx, sec) {
  const b = mkbuf(ctx, sec), d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i0 = 0; i0 < d.length; i0 += 65536) {
    const e = Math.min(d.length, i0 + 65536);
    let x = RS[0];
    for (let i = i0; i < e; i++) {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      const w = x / 2147483648;
      b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = b0 + b1 + b2 + w * 0.1848;
    }
    RS[0] = x;
    yield;
  }
  dcBlock(d, ctx.sampleRate, 15); normRms(d, 0.3);
  return b;
}
// Dense, even, crisp ticks: grains, sticky adhesion letting go, debris.
function* gCrackle(ctx, sec, rate) {
  const sr = ctx.sampleRate, b = mkbuf(ctx, sec), d = b.getChannelData(0), n = d.length;
  let k = 0;
  for (let pos = poisson(rate, sr); pos < n - 64; pos += poisson(rate, sr)) {
    ring(d, n, pos, rr(1800, 6000), (0.4 + 0.6 * R()) * (R() < 0.5 ? -1 : 1), rr(0.00012, 0.0004) * sr, sr, false);
    if (++k % 400 === 0) yield;
  }
  dcBlock(d, sr, 40); normPeak(d, 0.9);
  return b;
}
// Dense micro-bubbles: the raw material of every wet sound.
function* gWet(ctx, sec) {
  const sr = ctx.sampleRate, b = mkbuf(ctx, sec), d = b.getChannelData(0), n = d.length;
  const lo = Math.log(280), hi = Math.log(2200);
  let k = 0;
  for (let pos = poisson(170, sr); pos < n; pos += poisson(170, sr)) {
    bubble(d, n, pos, Math.exp(rr(lo, hi)), Math.pow(rr(0.15, 1), 1.5), sr, rr(0.1, 0.4), 1, 0.04, false);
    if (++k % 40 === 0) yield;
  }
  normRms(d, 0.25);
  return b;
}
// Seamless loop for a strand sliding down a starchy wall: slow bubbles, stick-slip ticks, swells.
function* gSmear(ctx, sec) {
  const sr = ctx.sampleRate, b = mkbuf(ctx, sec), d = b.getChannelData(0), n = d.length;
  const lo = Math.log(220), hi = Math.log(1500);
  let k = 0;
  for (let pos = poisson(95, sr); pos < n; pos += poisson(95, sr)) {
    bubble(d, n, pos, Math.exp(rr(lo, hi)), Math.pow(rr(0.15, 1), 2), sr, rr(0.1, 0.3), 1, 0.05, true);
    if (++k % 40 === 0) yield;
  }
  for (let pos = poisson(28, sr); pos < n; pos += poisson(28, sr)) {
    ring(d, n, pos, rr(1200, 3200), rr(0.05, 0.15) * (R() < 0.5 ? -1 : 1), rr(0.0002, 0.0006) * sr, sr, true);
  }
  yield;
  const am = cyc(Array.from({ length: Math.max(8, Math.round(sec / 0.06)) }, () => Math.pow(R(), 0.7)));
  for (let i0 = 0; i0 < n; i0 += 64) {
    const a0 = 0.25 + 0.75 * clamp(am(i0 / n), 0, 1.2), a1 = 0.25 + 0.75 * clamp(am(Math.min(n, i0 + 64) / n), 0, 1.2);
    for (let j = 0, i = i0; j < 64 && i < n; j++, i++) d[i] *= a0 + ((a1 - a0) * j) / 64;
  }
  normRms(d, 0.25);
  return b;
}
// Small dry-pasta knocks, low (woody tock) to high (glassy tink). Free-bar mode ratios.
function* gTicks(ctx, N) {
  const sr = ctx.sampleRate, out = [];
  const ratios = [1, 2.756, 5.404, 8.933];
  for (let i = 0; i < N; i++) {
    const f1 = 480 * Math.pow(4200 / 480, i / (N - 1)) * rr(0.97, 1.03);
    const T0 = clamp(0.1 * Math.pow(480 / f1, 0.45), 0.025, 0.12);
    const len = Math.ceil(sr * (T0 + 0.012)), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const amps = [1, rr(0.3, 0.75), rr(0.12, 0.45), rr(0.04, 0.2)];
    for (let m = 0; m < 4; m++) {
      const f = f1 * ratios[m] * rr(0.985, 1.015);
      addMode(d, len, f, amps[m], T0 * Math.pow(f1 / f, 0.75), sr);
    }
    addClick(d, sr, 0.0012, rr(0.35, 0.7));
    fadeTail(d, Math.ceil(sr * 0.003)); normPeak(d, 0.9);
    out.push(b);
    if (i % 3 === 2) yield;
  }
  return out;
}
// Pitched dry tick for pickups, tuned to 1 kHz (play at rate = hz / 1000).
function genWood(ctx, count) {
  const sr = ctx.sampleRate, out = [];
  for (let v = 0; v < count; v++) {
    const len = Math.ceil(sr * 0.22), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    addMode(d, len, 1000, 1, 0.16 * rr(0.9, 1.1), sr);
    addMode(d, len, 3930 * rr(0.99, 1.01), rr(0.15, 0.28), 0.055, sr);
    addMode(d, len, 9200 * rr(0.98, 1.02), rr(0.03, 0.07), 0.022, sr);
    addClick(d, sr, 0.0006, rr(0.15, 0.25));
    fadeTail(d, Math.ceil(sr * 0.004)); normPeak(d, 0.9);
    out.push(b);
  }
  return out;
}
// Droplet plips for spatter.
function genDrops(ctx, count) {
  const sr = ctx.sampleRate, out = [];
  for (let i = 0; i < count; i++) {
    const len = Math.ceil(sr * 0.05), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    bubble(d, len, 0, rr(900, 2400), 1, sr, rr(0.2, 0.45), 0.45, 0.05, false);
    addClick(d, sr, 0.0003, 0.12);
    fadeTail(d, Math.ceil(sr * 0.004)); normPeak(d, 0.9);
    out.push(b);
  }
  return out;
}
// Stick-slip creak: an irregular pulse train through a few woody resonances.
function* gCreaks(ctx, count) {
  const sr = ctx.sampleRate, out = [];
  for (let v = 0; v < count; v++) {
    const sec = 0.5, len = Math.ceil(sr * sec), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const x = new Float32Array(len), P = rr(0.0065, 0.011);
    const mod = cyc(Array.from({ length: 16 }, () => R()));
    for (let pos = Math.ceil(0.004 * sr); pos < len;) {
      const u = pos / len, env = Math.min(1, u / 0.08) * Math.min(1, (1 - u) / 0.25);
      x[pos] += env * rr(0.3, 1) * (R() < 0.85 ? 1 : -1);
      pos += Math.max(8, Math.round(P * (1 + 0.7 * (mod(u) - 0.5)) * rr(0.85, 1.15) * sr));
    }
    const res = [[rr(480, 650), 0.035, 1], [rr(1050, 1400), 0.022, 0.8], [rr(2100, 2800), 0.012, 0.45]];
    for (const [f, t60, gain] of res) {
      const w = (TAU * f) / sr, r = Math.pow(0.001, 1 / (t60 * sr)), c = 2 * r * Math.cos(w), r2 = r * r, s = Math.sin(w) * gain;
      let y1 = 0, y2 = 0;
      for (let k = 0; k < len; k++) { const y = s * x[k] + c * y1 - r2 * y2; y2 = y1; y1 = y; d[k] += y; }
    }
    dcBlock(d, sr, 30); fadeTail(d, Math.ceil(sr * 0.01)); normPeak(d, 0.9);
    out.push(b);
    yield;
  }
  return out;
}
// Karplus-Strong pluck. damp = one-pole lowpass in the loop (higher = more muted).
function* gPluck(ctx, f0, sec, damp, t60, pickPos, exLP) {
  const sr = ctx.sampleRate, n = Math.floor(sec * sr), b = ctx.createBuffer(1, n, sr), y = b.getChannelData(0);
  const D = sr / f0 - damp / (1 - damp);
  let L = Math.floor(D), frac = D - L;
  if (frac < 0.1) { L -= 1; frac += 1; }
  const C = (1 - frac) / (1 + frac), g = Math.pow(0.001, 1 / (t60 * f0));
  const ex = new Float32Array(L);
  let lp = 0, mean = 0;
  for (let k = 0; k < L; k++) { lp += (1 - exLP) * (nr() - lp); ex[k] = lp; }
  const P = Math.max(1, Math.round(pickPos * L));
  for (let k = L - 1; k >= P; k--) ex[k] -= ex[k - P];
  for (let k = 0; k < L; k++) mean += ex[k];
  mean /= L;
  for (let k = 0; k < L; k++) ex[k] -= mean;
  let s = 0, apX = 0, apY = 0;
  for (let k0 = 0; k0 < n; k0 += 32768) {
    const e = Math.min(n, k0 + 32768);
    for (let k = k0; k < e; k++) {
      let v = k < L ? ex[k] : 0;
      if (k >= L) {
        s = (1 - damp) * y[k - L] + damp * s;
        const ap = C * s + apX - C * apY; apX = s; apY = ap;
        v += g * ap;
      }
      y[k] = v;
    }
    yield;
  }
  dcBlock(y, sr, 20); fadeTail(y, Math.ceil(sr * 0.05)); normPeak(y, 0.9);
  return b;
}
// Far-off simmer: single bubbles (some quick doubles), one per buffer. update() scatters them
// at a slowly wandering rate, so the simmer never loops.
function* gBubbles(ctx, count) {
  const sr = ctx.sampleRate, out = [], lo = Math.log(140), hi = Math.log(900);
  for (let i = 0; i < count; i++) {
    const len = Math.ceil(sr * 0.14), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    const f0 = Math.exp(rr(lo, hi)), amp = 0.5 * dB(rr(-12, 0)) * Math.pow(300 / f0, 0.3);
    bubble(d, len, 0, f0, amp, sr, rr(0.08, 0.25), 1, 0.07, false);
    if (R() < 0.25) bubble(d, len, Math.round(rr(0.03, 0.06) * sr), f0 * rr(0.9, 1.15), amp * rr(0.5, 0.9), sr, rr(0.08, 0.25), 1, 0.07, false);
    fadeTail(d, Math.ceil(sr * 0.005));
    out.push(b);
    if (i % 4 === 3) yield;
  }
  return out;
}
// Slow starchy creak for a stretched noodle: a soft stick-slip pulse train at a wandering rate
// through low, damped resonances. Seamless: the pulses are zero-mean and the filters run twice
// around the loop, so the end flows into the start.
function* gStarch(ctx, sec) {
  const sr = ctx.sampleRate, b = mkbuf(ctx, sec), d = b.getChannelData(0), n = d.length, x = new Float32Array(n);
  const rate = cyc(Array.from({ length: 10 }, () => R())), swell = cyc(Array.from({ length: 7 }, () => R()));
  let mean = 0;
  for (let pos = 0; pos < n;) {
    const u = pos / n, a = (0.25 + 0.75 * clamp(swell(u), 0, 1)) * rr(0.5, 1) * (R() < 0.9 ? 1 : -1);
    x[pos] += a;
    mean += a;
    pos += Math.max(24, Math.round((sr / (18 + 42 * clamp(rate(u), 0, 1))) * rr(0.75, 1.25)));
  }
  mean /= n;
  for (let i = 0; i < n; i++) x[i] -= mean;
  yield;
  for (const [f, t60, gain] of [[rr(260, 360), 0.045, 1], [rr(620, 820), 0.028, 0.55], [rr(1300, 1700), 0.016, 0.22]]) {
    const w = (TAU * f) / sr, r = Math.pow(0.001, 1 / (t60 * sr)), c = 2 * r * Math.cos(w), r2 = r * r, s = Math.sin(w) * gain;
    let y1 = 0, y2 = 0;
    for (let k = 0; k < 2 * n; k++) {
      const y = s * x[k < n ? k : k - n] + c * y1 - r2 * y2;
      y2 = y1; y1 = y;
      if (k >= n) d[k - n] += y;
      if ((k & 32767) === 32767) yield;
    }
  }
  normRms(d, 0.2);
  return b;
}
// Hollow tortellino ticks for rolling: a ring's bending modes (1 : 2.83 : 5.42), a dull cavity
// "tok" under them and a soft contact click. Short, so a stream of them reads as rolling.
function* gRoll(ctx, N) {
  const sr = ctx.sampleRate, out = [];
  for (let i = 0; i < N; i++) {
    const f1 = 900 * Math.pow(2600 / 900, i / (N - 1)) * rr(0.97, 1.03);
    const T0 = rr(0.03, 0.045) * Math.pow(900 / f1, 0.3);
    const len = Math.ceil(sr * (Math.max(T0, 0.03) + 0.02)), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    addMode(d, len, f1, 1, T0, sr);
    addMode(d, len, f1 * 2.83 * rr(0.98, 1.02), rr(0.25, 0.45), T0 * 0.55, sr);
    addMode(d, len, f1 * 5.42 * rr(0.98, 1.02), rr(0.06, 0.15), T0 * 0.3, sr);
    addMode(d, len, f1 * rr(0.38, 0.46), rr(0.5, 0.8), rr(0.02, 0.03), sr);
    addClick(d, sr, 0.0008, rr(0.15, 0.3));
    fadeTail(d, Math.ceil(sr * 0.004)); normPeak(d, 0.9);
    out.push(b);
    if (i % 4 === 3) yield;
  }
  return out;
}
// Small water bubbles for bubble(), swim strokes and the shell's gush, from small and high
// (index 0) to big and low. Each rings briefly and rises in pitch as it closes.
function* gBlips(ctx, N) {
  const sr = ctx.sampleRate, out = [];
  for (let i = 0; i < N; i++) {
    const f0 = 2400 * Math.pow(380 / 2400, i / (N - 1)) * rr(0.96, 1.04);
    const len = Math.ceil(sr * 0.13), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    // small ones ring a little longer than nature would, so they read as bubbles, not ticks
    bubble(d, len, Math.ceil(sr * 0.001), f0, 1, sr, rr(0.15, 0.35), rr(0.3, 0.45) + 0.25 * (i / (N - 1)), 0.12, false);
    const fi = Math.ceil(sr * 0.0025);
    for (let k = 0; k < fi; k++) d[k] *= k / fi;
    fadeTail(d, Math.ceil(sr * 0.004)); normPeak(d, 0.9);
    out.push(b);
    if (i % 6 === 5) yield;
  }
  return out;
}
// Stick-slip squeal: wet pasta rubbing on wet pasta. A pulse train at a wandering rate (the
// squeal's pitch, 220-520 Hz) that chatters in and out, through a few damped resonances. The
// bobsled's carve, and the little squeaks on the run and in cold snow. Seamless, like gStarch.
function* gSqueal(ctx, sec) {
  const sr = ctx.sampleRate, b = mkbuf(ctx, sec), d = b.getChannelData(0), n = d.length, x = new Float32Array(n);
  const rate = cyc(Array.from({ length: Math.round(sec * 6) }, () => R())), chat = cyc(Array.from({ length: Math.round(sec * 20) }, () => R()));
  let mean = 0;
  for (let pos = 0; pos < n;) {
    const u = pos / n, c = clamp(chat(u), 0, 1), a = (0.15 + 0.85 * c * c) * rr(0.75, 1);
    x[pos] += a;
    mean += a;
    pos += Math.max(16, Math.round((sr / (220 + 300 * clamp(rate(u), 0, 1))) * rr(0.9, 1.1)));
  }
  mean /= n;
  for (let i = 0; i < n; i++) x[i] -= mean;
  yield;
  for (const [f, t60, gain] of [[rr(1000, 1250), 0.012, 1], [rr(2050, 2450), 0.008, 0.55], [rr(3300, 3900), 0.005, 0.25]]) {
    const w = (TAU * f) / sr, r = Math.pow(0.001, 1 / (t60 * sr)), c = 2 * r * Math.cos(w), r2 = r * r, s = Math.sin(w) * gain;
    let y1 = 0, y2 = 0;
    for (let k = 0; k < 2 * n; k++) {
      const y = s * x[k < n ? k : k - n] + c * y1 - r2 * y2;
      y2 = y1; y1 = y;
      if (k >= n) d[k - n] += y;
      if ((k & 32767) === 32767) yield;
    }
  }
  normRms(d, 0.2);
  return b;
}
// ---------------------------------------------------------------------------------------------
// Music: instruments, made after unlock like the textures above.

// RBJ biquad run over a buffer in place: 'lp', 'hp' or 'bp' (band-pass, 0 dB at the centre).
function biq(d, type, f, q, sr) {
  const w = (TAU * f) / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; } else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) { const x = d[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; d[i] = y; }
}
// The "pasta marimba": tuned bars (modes near 1 : 4 : 9.2, like a marimba's) with a soft mallet
// click, one per pitch in mids; the music plays each within two semitones of its own.
function* gMallet(ctx, mids) {
  const sr = ctx.sampleRate, out = [];
  for (const m of mids) {
    const f = 440 * Math.pow(2, (m - 69) / 12), T = clamp(1.6 * Math.pow(262 / f, 0.55), 0.3, 2.4);
    const len = Math.ceil(sr * Math.min(2.6, T + 0.08)), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
    addMode(d, len, f, 1, T, sr);
    yield;
    addMode(d, len, f * 3.93, 0.11, T * 0.22, sr);
    addMode(d, len, f * 9.15, 0.035, T * 0.08, sr);
    addClick(d, sr, 0.0016, 0.12);
    const fi = Math.ceil(sr * 0.0012);
    for (let k = 0; k < fi; k++) d[k] *= k / fi;
    fadeTail(d, Math.ceil(sr * 0.02)); normPeak(d, 0.9);
    out.push(b);
    yield;
  }
  return out;
}
// Brushes (swishes and taps), a soft felt kick, sleigh-bell shakes.
function* gMusPerc(ctx) {
  const sr = ctx.sampleRate, out = { swish: [], tap: [], kick: [], bell: [] };
  for (let v = 0; v < 3; v++) {
    const b = mkbuf(ctx, 0.34), d = b.getChannelData(0), a = rr(0.03, 0.055), tau = rr(0.06, 0.09);
    for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = nr() * (t < a ? t / a : Math.exp(-(t - a) / tau)); }
    biq(d, 'hp', rr(900, 1300), 0.7, sr); biq(d, 'lp', rr(5500, 7500), 0.7, sr);
    fadeTail(d, Math.ceil(sr * 0.02)); normPeak(d, 0.9);
    out.swish.push(b);
    yield;
  }
  for (let v = 0; v < 4; v++) {
    const b = mkbuf(ctx, 0.16), d = b.getChannelData(0), n = d.length, tau = rr(0.016, 0.026), tw = rr(0.035, 0.05), x = new Float32Array(n), on = sr * 0.0008;
    for (let i = 0; i < n; i++) { const t = i / sr; d[i] = nr() * Math.exp(-t / tau) * Math.min(1, i / on); x[i] = nr() * Math.exp(-t / tw) * 0.35; }
    biq(d, 'bp', rr(3200, 4400), 0.9, sr); biq(x, 'bp', rr(5000, 6500), 1.2, sr);
    for (let i = 0; i < n; i++) d[i] += x[i];
    fadeTail(d, Math.ceil(sr * 0.01)); normPeak(d, 0.9);
    out.tap.push(b);
    yield;
  }
  for (let v = 0; v < 2; v++) {
    const b = mkbuf(ctx, 0.36), d = b.getChannelData(0), f0 = rr(46, 52), f1 = rr(95, 115);
    let ph = 0;
    for (let i = 0; i < d.length; i++) { const t = i / sr; ph += (f0 + (f1 - f0) * Math.exp(-t / 0.03)) / sr; d[i] = Math.sin(TAU * ph) * Math.min(1, t / 0.002) * Math.exp(-t / 0.07); }
    addClick(d, sr, 0.0015, 0.08); biq(d, 'lp', 2500, 0.7, sr);
    fadeTail(d, Math.ceil(sr * 0.02)); normPeak(d, 0.9);
    out.kick.push(b);
    yield;
  }
  for (let v = 0; v < 4; v++) {
    const b = mkbuf(ctx, 0.42), d = b.getChannelData(0), n = d.length;
    for (let j = 0, J = v < 2 ? ri(12, 16) : ri(7, 10); j < J; j++) {
      const at = Math.floor(sr * Math.pow(R(), 1.6) * 0.05), f = rr(4600, 7600), amp = rr(0.35, 1), tau = rr(0.012, 0.03) * sr;
      ring(d, n, at, f, amp, tau, sr, false);
      ring(d, n, at, f * 1.47, amp * 0.55, tau * 0.8, sr, false);
      ring(d, n, at, f * 2.09, amp * 0.3, tau * 0.6, sr, false);
      if (j % 4 === 3) yield;
    }
    biq(d, 'hp', 2500, 0.7, sr);
    fadeTail(d, Math.ceil(sr * 0.03)); normPeak(d, 0.9);
    out.bell.push(b);
    yield;
  }
  return out;
}
// A small warm room for the music: decaying noise, darker as it fades, a few early reflections,
// different in each ear.
function* gIR(ctx, sec) {
  const sr = ctx.sampleRate, b = mkbuf(ctx, sec, 2), n = b.length, pre = Math.floor(sr * 0.012), tau = (1.25 / 6.91) * sr;
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i0 = pre; i0 < n; i0 += 16384) {
      for (let i = i0, e = Math.min(n, i0 + 16384); i < e; i++) {
        const u = (i - pre) / (n - pre), a = 1 - Math.exp((-TAU * 8000 * Math.pow(0.22, u)) / sr);
        lp += a * (nr() - lp);
        d[i] = lp * Math.exp(-(i - pre) / tau);
      }
      yield;
    }
    for (let k = 0; k < 9; k++) { const i = pre + Math.floor(sr * rr(0.004, 0.05)); if (i < n) d[i] += rr(-0.6, 0.6); }
    fadeTail(d, Math.floor(sr * 0.05));
  }
  return b;
}

// ---------------------------------------------------------------------------------------------
// Music: the score. One AL DENTE theme, arranged for each place. A1 and A2 are the tune (A2
// ends home), B the bridge in D minor: eight bars each of 4/4 in F major with swung eighths.
// A note is [beat in its bar, length in beats, MIDI]; a bar has one chord, or two.
const TH = {
  A1: {
    ch: ['F', 'F6', 'Gm7', 'C7', 'Am7', 'D7', 'Gm7', 'C7'],
    mel: [
      [[0, 1, 69], [1, 0.5, 67], [1.5, 0.5, 60], [2, 1, 72], [3, 1, 70]],
      [[0, 0.5, 69], [0.5, 0.5, 67], [1, 0.5, 65], [1.5, 0.5, 69], [2, 1.5, 72], [3.5, 0.5, 74]],
      [[0, 1, 74], [1, 0.5, 72], [1.5, 0.5, 70], [2, 1, 67], [3, 0.5, 65], [3.5, 0.5, 67]],
      [[0, 1.5, 70], [1.5, 0.5, 69], [2, 1.5, 67], [3.5, 0.5, 64]],
      [[0, 1, 72], [1, 0.5, 71], [1.5, 0.5, 64], [2, 1, 76], [3, 0.5, 74], [3.5, 0.5, 72]],
      [[0, 0.5, 74], [0.5, 0.5, 72], [1, 0.5, 69], [1.5, 0.5, 66], [2, 1.5, 69], [3.5, 0.5, 72]],
      [[0, 1.5, 70], [1.5, 0.5, 69], [2, 0.5, 67], [2.5, 0.5, 65], [3, 0.5, 67], [3.5, 0.5, 69]],
      [[0, 1, 70], [1, 1, 67], [2, 1.5, 64]],
    ],
  },
  A2: {
    ch: ['F', 'F7', 'Bb', 'Bbm6', 'F/C', 'D7', ['Gm7', 'C7'], 'F'],
    mel: [
      [[0, 1, 69], [1, 0.5, 67], [1.5, 0.5, 60], [2, 1, 72], [3, 1, 70]],
      [[0, 0.5, 69], [0.5, 0.5, 67], [1, 0.5, 65], [1.5, 0.5, 69], [2, 1, 72], [3, 1, 75]],
      [[0, 1.5, 74], [1.5, 0.5, 72], [2, 0.5, 70], [2.5, 0.5, 72], [3, 0.5, 74], [3.5, 0.5, 77]],
      [[0, 1, 79], [1, 0.5, 77], [1.5, 0.5, 73], [2, 2, 72]],
      [[0, 1, 69], [1, 0.5, 72], [1.5, 0.5, 77], [2, 1, 76], [3, 0.5, 74], [3.5, 0.5, 72]],
      [[0, 1, 72], [1, 0.5, 69], [1.5, 0.5, 66], [2, 0.5, 67], [2.5, 0.5, 69], [3, 0.5, 70], [3.5, 0.5, 71]],
      [[0, 1, 72], [1, 0.5, 70], [1.5, 0.5, 69], [2, 0.5, 67], [2.5, 0.5, 64], [3, 0.5, 67], [3.5, 0.5, 70]],
      [[0, 1, 69], [1, 0.5, 67], [1.5, 2, 65]],
    ],
  },
  B: {
    ch: ['Dm', 'Dm/C#', 'Dm7/C', 'G7/B', 'Bbmaj7', 'A7', 'Dm', 'C7'],
    mel: [
      [[0, 1.5, 77], [1.5, 0.5, 76], [2, 1, 74], [3, 1, 69]],
      [[0, 1.5, 69], [1.5, 0.5, 67], [2, 1, 69], [3, 1, 64]],
      [[0, 1.5, 65], [1.5, 0.5, 67], [2, 1, 69], [3, 1, 74]],
      [[0, 2, 77], [2, 1, 74], [3, 1, 71]],
      [[0, 3, 74], [3, 0.5, 72], [3.5, 0.5, 70]],
      [[0, 2, 73], [2, 1, 76], [3, 1, 79]],
      [[0, 1.5, 77], [1.5, 0.5, 76], [2, 2, 74]],
      [[0, 1, 72], [1, 1, 70], [2, 1, 67], [3, 0.5, 64]],
    ],
  },
};
const LIFT = 1; // an event that only plays while the sled is flying
// Each place: tempo, swing (0.5 straight, 2/3 a full triplet lilt), key (semitones from F), the
// intro's chords, the form, and who plays what in each section of each of the two passes.
const STY = {
  // the face screen: the theme's first statement, sparse and playful, on the marimba
  title: { bpm: 92, sw: 0.58, key: 0, intro: ['F'], form: ['A1', 'A2'], send: 0.26, lvl: 1.1,
    introFx: (E) => { [65, 69, 72].forEach((m, i) => E(i * 0.05, 1.5, 'mar', m, 0.42, -0.18)); },
    mel: (s, p) => (p === 0 ? [['mar', 0, 0.85]] : s === 'A1' ? [['mar', 12, 0.62]] : [['plk', 0, 0.8]]),
    bass: (s, p) => (p === 0 && s === 'A1' ? 'root' : 'two'),
    comp: (s, p) => (p === 0 && s === 'A1' ? null : 'chuck'),
    pad: (s, p) => (p === 1 && s === 'A2' ? 0.4 : 0),
    perc: () => 'ticks',
    ctr: (s, p) => (p === 1 && s === 'A2' ? ['mar', 0.36] : null) },
  // the nest island: the theme, relaxed, in B flat
  select: { bpm: 100, sw: 0.6, key: -7, intro: ['F', 'F'], form: ['A1', 'A2', 'B'], send: 0.3, lvl: 1, introPad: 0.45,
    mel: (s, p) => (p === 0 ? (s === 'B' ? [['lead', 0, 0.7]] : [['plk', 0, 0.85]]) : s === 'A1' ? [['lead', 0, 0.7]] : s === 'A2' ? [['mar', 12, 0.62]] : [['plk', 0, 0.85]]),
    bass: () => 'two',
    comp: (s, p) => ((p === 0 && s !== 'B') || (p === 1 && s === 'B') ? 'arp8' : 'chuck'),
    pad: () => 0.45,
    perc: (s, p) => (p === 0 ? 'brushlite' : 'brush') },
  // the meadow: the whole theme, bright and pastoral, with a band
  meadow: { bpm: 116, sw: 0.62, key: 0, intro: ['F6', 'F6'], form: ['A1', 'A2', 'B', 'A2'], send: 0.22, lvl: 1,
    mel: (s, p, si) => (p === 0 ? (s === 'B' ? [['plk', 0, 0.85], ['mar', 12, 0.42]] : si === 3 ? [['lead', 0, 0.8], ['mar', 12, 0.36]] : [['lead', 0, 0.8]])
      : s === 'A1' ? [['mar', 12, 0.7], ['plk', 0, 0.55]] : [['lead', 0, 0.8]]),
    bass: (s, p) => (s === 'B' || p === 1 ? 'walk' : 'two'),
    comp: (s, p) => (s === 'B' ? (p === 0 ? null : 'arp8') : 'chuck'),
    pad: (s, p) => (s === 'A1' && p === 0 ? 0 : 0.42),
    perc: () => 'brush',
    ctr: (s, p, si) => (p === 1 && si === 3 ? ['flute', 0.5] : null) },
  // the dry fortress: a light march in C, the tune on a dry-pasta xylophone
  fortress: { bpm: 120, sw: 0.5, key: -5, intro: ['F', 'F'], form: ['A1', 'A2', 'B', 'A2'], send: 0.12, lvl: 0.98,
    mel: (s, p, si) => (s === 'B' ? [['lead', 0, 0.75]] : p === 0 ? (si === 0 ? [['xyl', 12, 0.8]] : [['xyl', 12, 0.75], ['lead', 0, 0.5]])
      : si === 0 ? [['lead', 0, 0.75], ['xyl', 12, 0.4]] : [['xyl', 12, 0.8], ['plk', 0, 0.45]]),
    bass: () => 'oompah',
    comp: (s) => (s === 'B' ? 'chuck' : 'pah'),
    pad: (s) => (s === 'B' ? 0.38 : 0),
    perc: () => 'march' },
  // the bay: slow, dreamy and wide, in D flat; a harp under a low flute
  bay: { bpm: 72, sw: 0.5, key: -4, intro: ['F', 'F'], form: ['A1', 'A2', 'B'], send: 0.5, lvl: 1.1, introPad: 0.5,
    mel: (s, p) => (p === 0 ? (s === 'B' ? [['plk', 12, 0.66]] : [['flute', 0, 0.75]]) : s === 'A1' ? [['mar', 0, 0.62]] : [['flute', 0, 0.75]]),
    bass: () => 'long',
    comp: () => 'harp',
    pad: () => 0.5,
    perc: () => 'wave' },
  // the mountain: crisp and brisk, in G, a sleigh-ride lilt; with the sled flying, more bells
  // and the tune doubled an octave up
  mountain: { bpm: 96, sw: 2 / 3, key: 2, intro: ['F', 'F'], form: ['A1', 'A2', 'B', 'A2'], send: 0.18, lvl: 1.2,
    mel: (s, p, si) => (s === 'B' ? [['lead', 0, 0.72]] : p === 0 || si === 3 ? [['mar', 0, 0.75], ['plk', 0, 0.48], ['mar', 12, 0.3, LIFT]]
      : [['lead', 0, 0.72], ['mar', 12, 0.3, LIFT]]),
    bass: () => 'gallop',
    comp: () => 'trip',
    pad: (s) => (s === 'B' ? 0.4 : 0),
    perc: () => 'bells' },
};
const MUSIC_IDS = ['title', 'select', 'meadow', 'fortress', 'bay', 'mountain', 'won'];
const PCN = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const QLT = { '': [0, 4, 7], 6: [0, 4, 7, 9], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m: [0, 3, 7], m6: [0, 3, 7, 9], m7: [0, 3, 7, 10] };
const md12 = (x) => ((x % 12) + 12) % 12;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const bnote = (pc) => 36 + md12(pc - 36); // a bass root between C2 and B2
function chordOf(sym, key) {
  const m = /^([A-G][b#]?)([^/]*)(?:\/([A-G][b#]?))?$/.exec(sym), r = md12(PCN[m[1]] + key), iv = QLT[m[2]] || QLT[''];
  return { r, iv, pcs: iv.map((i) => md12(r + i)), b: m[3] ? md12(PCN[m[3]] + key) : r };
}
// A close voicing of the chord between lo and hi (four-note chords lose their root when n is 3),
// the one that moves least from the previous voicing.
function voice(c, lo, hi, prev, n) {
  const pcs = n === 3 && c.pcs.length === 4 ? c.pcs.slice(1) : c.pcs;
  let best = null, bs = Infinity;
  for (let k = 0; k < pcs.length; k++) {
    for (let o = 0; o < 2; o++) {
      const v = [lo + md12(pcs[k] - lo) + 12 * o];
      for (let j = 1; j < pcs.length; j++) { const d = md12(pcs[(k + j) % pcs.length] - v[j - 1]); v.push(v[j - 1] + (d || 12)); }
      if (v[v.length - 1] > hi) continue;
      let s = 0;
      if (prev && prev.length === v.length) for (let j = 0; j < v.length; j++) s += Math.abs(v[j] - prev[j]);
      else s = Math.abs(v[0] + v[v.length - 1] - lo - hi);
      if (s < bs) { bs = s; best = v; }
    }
  }
  return best || [lo + md12(pcs[0] - lo)];
}
// Turn the score into one place's music: an intro, then two passes of the form that loop. An
// event is [time s, instrument, MIDI, length s, velocity, pan, flags].
function* gArrange(id) {
  const S = STY[id], key = S.key, nI = S.intro.length, intro = [], cyc = [], bars = [];
  S.intro.forEach((c) => bars.push({ sec: S.form[0], si: 0, bi: -1, pass: -1, ch: [c], mel: [] }));
  for (let pass = 0; pass < 2; pass++) S.form.forEach((sec, si) => TH[sec].ch.forEach((c, bi) => bars.push({ sec, si, bi, pass, ch: Array.isArray(c) ? c : [c], mel: TH[sec].mel[bi] })));
  let pC = null, pP = null, pK = 64 + key;
  for (let k = 0; k < bars.length; k++) {
    if (k % 8 === 7) yield;
    const bar = bars[k], nx = bars[k + 1] || bars[nI], live = bar.pass >= 0, L = live ? cyc : intro, sec = bar.sec, ps = Math.max(0, bar.pass);
    const B = (live ? k - nI : k) * 4, end = bar.bi === 7 || (!live && k === nI - 1);
    const E = (b, d, inst, m, v, pan, fl) => L.push([B + b, d, inst, m, v, pan || 0, fl || 0]);
    const segs = bar.ch.map((sym, j, a) => ({ c: chordOf(sym, key), b0: j * (4 / a.length), len: 4 / a.length }));
    const nroot = chordOf(nx.ch[0], key).b;
    // the tune, and its pickup into an A section (played by whoever has the next tune)
    const mel = (n, list) => {
      for (const [inst, oct, v, fl] of list) {
        const [b, d, m] = n;
        E(b, inst === 'xyl' ? Math.min(d, 0.45) : d, inst, m + key + oct, v * (b % 1 ? 0.84 : b % 2 ? 0.93 : 1), inst === 'mar' || inst === 'xyl' ? -0.18 : inst === 'plk' ? 0.12 : -0.04, fl);
      }
    };
    if (live) for (const n of bar.mel) mel(n, S.mel(sec, ps, bar.si));
    if (end && nx.bi === 0 && nx.sec[0] === 'A') mel([3.5, 0.5, 60], S.mel(nx.sec, Math.max(0, nx.pass), nx.si));
    if (!live && S.introFx) S.introFx(E, key);
    // bass
    const bs = S.bass(sec, ps);
    segs.forEach((g, j) => {
      const r = bnote(g.c.b), f5 = r + 7 > 52 ? r - 5 : r + 7, nr = bnote(j < segs.length - 1 ? segs[j + 1].c.b : nroot), ap = nr > r ? nr - 1 : nr + 1, b0 = g.b0;
      const t3 = r + md12(g.c.pcs[1] - r), t5 = r + md12(g.c.pcs[2] - r);
      if (bs === 'root') E(b0, Math.min(2, g.len), 'bas', r, 0.72);
      else if (bs === 'two') { E(b0, Math.min(1.5, g.len - 0.1), 'bas', r, 0.8); if (g.len === 4) { E(2, 1.4, 'bas', f5, 0.7); if (nr !== r && k % 2) E(3.5, 0.45, 'bas', ap, 0.5); } }
      else if (bs === 'walk') { if (g.len === 4) { E(0, 0.9, 'bas', r, 0.8); E(1, 0.9, 'bas', t3, 0.62); E(2, 0.9, 'bas', t5, 0.7); E(3, 0.9, 'bas', ap, 0.6); } else { E(b0, 0.9, 'bas', r, 0.8); E(b0 + 1, 0.9, 'bas', ap, 0.6); } }
      else if (bs === 'oompah') { E(b0, 0.45, 'bas', r, 0.85); if (g.len === 4) E(2, 0.45, 'bas', f5, 0.75); }
      else if (bs === 'gallop') { E(b0, 0.9, 'bas', r, 0.85); E(b0 + 1.5, 0.4, 'bas', r, 0.4); if (g.len === 4) { E(2, 0.9, 'bas', f5, 0.72); E(3.5, 0.4, 'bas', ap, 0.45); } }
      else if (bs === 'long') { E(b0, g.len - 0.25, 'bas', r, 0.62); if (g.len === 4 && sec === 'B') E(2, 1.6, 'bas', f5, 0.45); }
    });
    // chords on plucked strings or the marimba
    const cs = S.comp(sec, ps);
    segs.forEach((g) => {
      const vo = voice(g.c, 55, 68, pC, 3), b0 = g.b0, inSeg = (b) => b >= b0 && b < b0 + g.len;
      pC = vo;
      if (cs === 'chuck' || cs === 'pah') for (const b of [1, 3]) if (inSeg(b)) vo.forEach((m, i) => E(b + i * 0.02, cs === 'pah' ? 0.3 : 0.45, 'plk', m, (b === 1 ? 0.3 : 0.27) * (1 - 0.08 * i), 0.26));
      if (cs === 'arp8') { const tn = [vo[0], vo[1], vo[2], vo[0] + 12], sq = [0, 1, 2, 3, 2, 1, 2, 1]; for (let e = 0; e < g.len * 2; e++) E(b0 + e * 0.5, 0.5, 'mar', tn[sq[e % 8]], e % 2 ? 0.26 : 0.32, -0.3 + 0.6 * ((e % 8) / 7)); }
      if (cs === 'harp') {
        const lo = bnote(g.c.r) + 12, tn = [];
        for (let m = lo; m <= lo + 26; m++) if (g.c.pcs.includes(md12(m))) tn.push(m);
        const sq = tn.concat(tn.slice(1, -1).reverse());
        for (let e = 0; e < g.len * 2; e++) { const q = e % sq.length; E(b0 + e * 0.5, 1.6, 'plk', sq[q], e % 4 ? 0.26 : 0.32, -0.6 + 1.2 * (q / Math.max(1, sq.length - 1))); }
      }
      if (cs === 'trip') for (let b = b0; b < b0 + g.len; b++) vo.forEach((m, i) => (b % 2 === 0 ? E(b + i * 0.25, 0.35, 'plk', m, 0.3 - 0.03 * i, 0.22) : E(b + i * 0.015, 0.3, 'plk', m, 0.32, 0.22)));
    });
    // the reed pad, and on some repeats a slow counter-line on the 3rds and 7ths
    const pv = live ? S.pad(sec, ps) : S.introPad || 0;
    if (pv) segs.forEach((g) => { const vo = voice(g.c, 53, 67, pP, 3); pP = vo; vo.forEach((m, i) => E(g.b0, g.len - 0.06, 'reed', m, pv, [-0.32, 0.04, 0.34][i])); });
    const ct = live && S.ctr ? S.ctr(sec, ps, bar.si) : null;
    if (ct) segs.forEach((g) => {
      let best = pK, bd = 99;
      for (const pc of [g.c.pcs[1], g.c.pcs[g.c.pcs.length - 1]]) for (let m = 57; m <= 70; m++) if (md12(m) === pc && Math.abs(m - pK) < bd) { bd = Math.abs(m - pK); best = m; }
      pK = best;
      E(g.b0, g.len - 0.1, ct[0], best, ct[1], 0.32);
    });
    // percussion
    const pc = S.perc(sec, ps);
    if (pc === 'brush' || pc === 'brushlite') { E(1, 0.4, 'swish', 0, pc === 'brush' ? 0.3 : 0.22, -0.15); E(3, 0.4, 'swish', 0, pc === 'brush' ? 0.28 : 0.2, -0.15); }
    if (pc === 'brush') { for (const b of [0, 0.5, 1.5, 2.5, 3.5]) E(b, 0.1, 'tap', 0, b === 3.5 ? 0.22 : b ? 0.15 : 0.1, 0.18); if (end) { E(3, 0.1, 'tap', 0, 0.2, 0.18); E(3.25, 0.1, 'tap', 0, 0.16, 0.18); } }
    if (pc === 'march') {
      E(0, 0.3, 'kick', 0, 0.55, 0); E(2, 0.3, 'kick', 0, 0.42, 0);
      for (let e = 0; e < (end ? 4 : 8); e++) E(e * 0.5, 0.1, 'tap', 0, e === 2 || e === 6 ? 0.42 : 0.12, 0.12);
      if (end) for (let e = 0; e < 8; e++) E(2 + e * 0.25, 0.08, 'tap', 0, 0.12 + 0.045 * e, 0.12);
    }
    if (pc === 'bells') for (let b = 0; b < 4; b++) { E(b, 0.3, 'bell', 0, b % 2 ? 0.24 : 0.34, 0.32); E(b + 0.5, 0.2, 'bell', 0, 0.11, 0.32); E(b + 0.25, 0.1, 'tick', 0, 0.12, -0.32); E(b + 0.25, 0.2, 'bell', 0, 0.15, 0.32, LIFT); }
    if (pc === 'ticks' && bar.bi >= 0) { if (bar.bi % 2) E(3.5, 0.1, 'tick', 0, 0.2, 0.35); if (bar.bi % 4 === 2) E(1.5, 0.1, 'tick', 0, 0.14, -0.35); }
    if (pc === 'wave' && bar.bi % 2 === 0) E(0, 2, 'swish', 0, 0.12, 0);
  }
  const spb = 60 / S.bpm, sw = S.sw, ts = (b) => { const w = Math.floor(b), f = b - w; return (w + (f < 0.5 ? f * 2 * sw : sw + (f - 0.5) * 2 * (1 - sw))) * spb; };
  const conv = (L) => L.map((e) => [ts(e[0]), e[2], e[3], Math.max(0.04, ts(e[0] + e[1]) - ts(e[0])), e[4], e[5], e[6]]).sort((a, b) => a[0] - b[0]);
  return { id, key, bpm: S.bpm, send: S.send, lvl: S.lvl, intro: conv(intro), cyc: conv(cyc), introSec: nI * 4 * spb, cycSec: (bars.length - nI) * 4 * spb };
}
// The star: IV, V7, I in the key of whatever was playing, the tune climbing home and a little
// marimba sparkle on top. Plays once.
function arrangeWon(key, bpm) {
  const spb = 60 / clamp(bpm, 90, 116), ev = [], E = (b, d, inst, m, v, pan) => ev.push([b * spb, inst, m, d * spb, v, pan || 0, 0]);
  let pv = null;
  for (const [sym, b0, len] of [['Bb', 0, 2], ['C7', 2, 2], ['F', 4, 4]]) {
    const c = chordOf(sym, key), vo = voice(c, 55, 68, pv, 3);
    pv = vo;
    E(b0, len === 4 ? 3.5 : 1.8, 'bas', bnote(c.b), 0.8);
    vo.forEach((m, i) => { E(b0 + i * 0.04, len === 4 ? 3 : 1, 'plk', m, 0.45, 0.25); E(b0, len === 4 ? 3.6 : len - 0.05, 'reed', m, 0.45, [-0.3, 0.04, 0.32][i]); });
  }
  for (const [b, d, m] of [[0, 1, 74], [1, 0.5, 77], [1.5, 0.5, 74], [2, 1.5, 76], [3.5, 0.5, 79], [4, 3, 77]]) { E(b, d, 'lead', m + key, 0.8, -0.04); E(b, d, 'mar', m + key, 0.38, -0.18); }
  [72, 77, 81, 84].forEach((m, i) => E(4.5 + i * 0.25, 1, 'mar', m + key, 0.34, 0.3 - 0.2 * i));
  E(4, 0.4, 'swish', 0, 0.25, -0.15);
  return { id: 'won', key, bpm, send: 0.3, lvl: 1, intro: ev.sort((a, b) => a[0] - b[0]), cyc: null, introSec: 8 * spb, cycSec: 0 };
}
// Live voices: harmonic recipes for the reed (accordion-like), the woodwind lead and the flute.
const WV = {
  reed: [1, 0.62, 0.5, 0.38, 0.33, 0.26, 0.22, 0.18, 0.15, 0.12, 0.1, 0.08, 0.065, 0.05, 0.04, 0.03],
  lead: [1, 0.05, 0.55, 0.04, 0.34, 0.03, 0.22, 0.02, 0.13, 0.015, 0.08, 0.01, 0.05, 0.008, 0.03],
  flute: [1, 0.22, 0.08, 0.035, 0.015],
};
// Each instrument's level in the music mix.
const MG = { lead: 0.345, flute: 0.275, reed: 0.12, plk: 1.7, mar: 0.585, xyl: 0.64, bas: 1.3, swish: 0.96, tap: 1.3, kick: 0.55, bell: 1.3, tick: 3.5 };

// Final safety: linear to 0.6, then a smooth tanh knee that never exceeds 0.95.
// The shaper is fed x/2, so the curve covers +/-2 (6 dB over full scale) before it flattens.
function softClipCurve() {
  const n = 4097, cv = new Float32Array(n), k = 0.6, h = 0.35;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 4 - 2, a = Math.abs(x);
    cv[i] = a <= k ? x : Math.sign(x) * (k + h * Math.tanh((a - k) / h));
  }
  return cv;
}
function prune(arr, t) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > t) arr[w++] = arr[i];
  arr.length = w;
  return w;
}

// ---------------------------------------------------------------------------------------------

export class PastaAudio {
  // opts (optional): { volume = 0.7, muted = false, ambience = 1, simmer = true }
  constructor(opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    this._ctx = null;
    this._ok = false;
    this._offline = false;
    this._vol = c01(o.volume, 0.7);
    this._muted = !!o.muted;
    this._ambLevel = clamp(fin(o.ambience, 1), 0, 2);
    this._simmerOn = o.simmer !== false;
    this._windOn = o.wind === false ? 0 : 1; // test hook: measure the simmer alone
    this._tAt = -1;
    this._last = Object.create(null);
    this._lastVar = Object.create(null);
    this._ends = [];
    this._capEnds = [];
    this._nv = 0; // live-builder voices whose nodes are still connected
    this._bank = {};
    this._strips = [];
    this._sl = null;
    this._st = null; // stretch loop
    this._rollEnds = [];
    this._lastRoll = -1;
    this._A = null;
    this._menu = 0;
    this._menuSent = -1;
    this._stripsW = []; // playback strips on the water bus
    this._bubEnds = [];
    this._uw = 0; // camera under water 0..1, depth, nearness to the shore
    this._uwSent = 0;
    this._depth = 0;
    this._shore = 0;
    this._shoreSent = 0;
    this._nextCreak = 0;
    this._nextTrickle = 0;
    this._nextLap = 0;
    this._sd = null; // bobsled loop
    this._wind = 0; // on the mountain 0..1 (0 = not on it, 1 = the summit)
    this._windSent = 0;
    this._gst = { on: false, t0: 0, rise: 1, hold: 0, fall: 1, peak: 0, fl: 0.5 }; // the current gust
    this._nextGust = 0;
    this._mOn = o.music !== false; // music: on/off, the place asked for, what plays, what fades
    this._mWant = null;
    this._mCur = null;
    this._mRun = null;
    this._mFade = [];
    this._mPrev = null;
    this._mWonT = -9;
    this._mKey = 0;
    this._mBus = null;
    this._mLvlSent = -1;
    this._mLpSent = -1;
    this._lift = 0; // the sled's speed, for the mountain's music
    this._liftT = 0;
    this._lastUpd = undefined;
    this._h = 0;
    this._sp = 0;
    this._tube = 0;
    this._tubeSent = -1;
    this._walk = { gust: rr(0.3, 0.6), lp: rr(0.3, 0.7), howl: rr(0.3, 0.7), sim: rr(0.3, 0.7), rate: rr(0.15, 0.85) };
    this.stats = { contextMs: 0, buildMs: 0, warmMs: 0, slices: 0, over4: 0, maxSliceMs: 0, maxSliceTask: '', banksReadyMs: 0, banks: 0 };
  }

  // ----- lifecycle -----------------------------------------------------------------------------

  unlock() {
    try {
      if (!this._ctx) {
        const g = typeof window !== 'undefined' ? window : globalThis;
        const AC = g.AudioContext || g.webkitAudioContext;
        if (!AC) return;
        const t0 = now();
        let c;
        try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { c = new AC(); }
        this.stats.contextMs = now() - t0;
        this._ctx = c;
        this._build(c, false, { ambience: true });
      }
      const c = this._ctx;
      if (c && c.state !== 'running' && c.state !== 'closed' && typeof c.resume === 'function') {
        const p = c.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (e) { /* never throw */ }
  }

  get ready() {
    const c = this._ctx;
    return !!(this._ok && c && (this._offline || c.state === 'running'));
  }

  setMuted(muted) {
    try { this._muted = !!muted; if (this._ok) this._applyMaster(0.08); } catch (e) {}
  }

  // Extra: master volume 0..1 (default 0.7).
  setVolume(v) {
    try { this._vol = c01(v, this._vol); if (this._ok) this._applyMaster(0.05); } catch (e) {}
  }

  // Extra: ambience level 0..2 (default 1), and the far-off simmer on/off.
  setAmbience(level) {
    try {
      this._ambLevel = clamp(fin(level, this._ambLevel), 0, 2);
      if (this._A) this._A.lvl.gain.setTargetAtTime(this._ambLevel, this._ctx.currentTime, 0.4);
    } catch (e) {}
  }
  setSimmer(on) {
    try {
      this._simmerOn = !!on;
      if (this._A) this._A.gS.gain.setTargetAtTime(on ? dB(LV.simmer) : 0, this._ctx.currentTime, 0.6);
    } catch (e) {}
  }

  // Extra, for offline rendering and tests: run fn(this) with events scheduled at context time t.
  at(t, fn) {
    const prev = this._tAt;
    try { this._tAt = Math.max(0, fin(t, 0)); if (typeof fn === 'function') fn(this); } catch (e) {} finally { this._tAt = prev; }
    return this;
  }

  // Extra, for tests: render a script into an OfflineAudioContext. Resolves to an AudioBuffer.
  // script(audio) schedules events with audio.at(t, a => a.step(...)).
  // opts: { sampleRate = 48000, ambience = false, bypass = false (no compressor or clipper),
  //         banks = true (false: use the live builders), plus the constructor's opts }
  static async renderOffline(seconds, script, opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const sr = fin(o.sampleRate, 48000);
    const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    let shared = SHARED.get(sr);
    if (!shared) {
      const host = new PastaAudio();
      host._build(new OAC(1, 128, sr), true, { warm: false });
      shared = host._warmAll().then(() => ({ b: host._b, bank: host._bank }));
      SHARED.set(sr, shared);
    }
    const S = await shared;
    const c = new OAC(2, Math.max(1, Math.ceil(fin(seconds, 1) * sr)), sr);
    const a = new PastaAudio(o);
    a._build(c, true, { ambience: !!o.ambience, bypass: !!o.bypass, shared: S, banks: o.banks !== false });
    if (typeof script === 'function') script(a);
    return c.startRendering();
  }

  _now() {
    return this._tAt >= 0 ? this._tAt : this._ctx.currentTime + (this._offline ? 0 : LOOKAHEAD);
  }

  _build(c, offline, o) {
    const t0 = now();
    this._ctx = c;
    this._offline = offline;
    this._sr = c.sampleRate;
    this._bank = o.shared && o.banks ? o.shared.bank : {};
    const b = (this._b = o.shared ? o.shared.b : {});
    if (!b.white) {
      // Only what a first footstep or jump needs; everything else is made in the background.
      b.silent = c.createBuffer(1, 2, c.sampleRate);
      b.white = run(gWhite(c, 1.5, 1));
      b.crackle = run(gCrackle(c, 1.5, 800));
    }

    // Master: volume/mute -> DC/sub highpass -> light compressor -> soft clip -> out.
    const m = (this._m = c.createGain());
    m.gain.value = 0;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 30; hp.Q.value = qv('highpass', 0.707);
    m.connect(hp);
    if (o.bypass) hp.connect(c.destination);
    else {
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 12; comp.ratio.value = 3;
      comp.attack.value = 0.003; comp.release.value = 0.25;
      const pre = c.createGain();
      pre.gain.value = 0.5;
      const ws = c.createWaveShaper();
      ws.curve = softClipCurve(); ws.oversample = '2x';
      hp.connect(comp); comp.connect(pre); pre.connect(ws); ws.connect(c.destination);
    }
    // The game mix reaches the master through an under-water split: _uwDry stays at exactly 1
    // until the camera goes under, and the muffled path is only built the first time it does.
    this._uwIn = c.createGain();
    this._uwDry = c.createGain();
    this._uwIn.connect(this._uwDry); this._uwDry.connect(m);
    this._sfx = c.createGain();
    this._sfx.connect(this._uwIn);
    // Water sounds (strokes, bubbles, the shell, the squid) are voiced as heard under water, so
    // they skip the muffling.
    this._sfxW = c.createGain();
    this._sfxW.connect(m);
    for (let i = 0; i < STRIPS; i++) this._strips.push(this._newStrip());
    this._buildTube();
    this._ok = true;
    this._applyMaster(0.03);
    this.stats.buildMs = now() - t0;
    if (o.shared) {
      if (o.ambience) this._startAmbience();
      return;
    }
    if (o.warm !== false) this._warm(!!o.ambience);
  }

  // Background warm-up after unlock: textures, the ambience, then one bank per family. Each task
  // is a generator that yields often; _drive runs it in ~3 ms slices between frames and awaits
  // any promise it yields (the bank rendering itself runs off the main thread).
  _tasks(amb) {
    const c = this._ctx, b = this._b, self = this, T = [];
    const norm1 = (bs) => bs.map((x) => 1 / Math.max(1e-4, loud([x.getChannelData(0)], 0, x.length, x.sampleRate)));
    T.push(function* ticks() { if (!b.ticks) { const t = yield* gTicks(c, 12); b.tickN = norm1(t); b.ticks = t; } });
    T.push(function* wet() { if (!b.wet) b.wet = yield* gWet(c, 2); });
    T.push(function* smear() { if (!b.smear) b.smear = yield* gSmear(c, 3.3); });
    T.push(function* starch() { if (!b.starch) b.starch = yield* gStarch(c, 3.1); });
    T.push(function* drops() { if (!b.drops) b.drops = genDrops(c, 6); });
    T.push(function* pink() { if (!b.pink) b.pink = yield* gPink(c, 2); });
    T.push(function* wood() { if (!b.wood) { const w = genWood(c, 3); b.woodN = norm1(w); b.wood = w; } });
    T.push(function* wind() { if (!b.wind) b.wind = yield* gWhite(c, 6.1, 2); });
    T.push(function* ambience() { if (amb) self._whenRunning(() => self._startAmbience()); });
    // the music's instruments and score, early: the face screen's music waits for them
    T.push(function* musMallet() { const M = (b.mus = b.mus || {}); if (!M.mar) M.mar = { m0: 53, step: 4, b: yield* gMallet(c, [53, 57, 61, 65, 69, 73, 77, 81, 85, 89]) }; });
    T.push(function* musBass() {
      const M = (b.mus = b.mus || {});
      if (M.bas) return;
      const L = [];
      for (const m of [31, 35, 39, 43, 47, 51]) { const f = mtof(m), t60 = clamp(1.1 * Math.pow(65 / f, 0.3), 0.6, 1.4); L.push(yield* gPluck(c, f, t60 + 0.15, 0.62, t60, 0.28, 0.6)); }
      M.bas = { m0: 31, step: 4, b: L };
    });
    T.push(function* musPluck() {
      const M = (b.mus = b.mus || {});
      if (M.plk) return;
      const L = [];
      for (const m of [52, 56, 60, 64, 68, 72, 76, 80, 84]) { const f = mtof(m), t60 = clamp(2.4 * Math.pow(165 / f, 0.55), 0.6, 2.6); L.push(yield* gPluck(c, f, Math.min(2.4, 0.9 * t60 + 0.2), 0.32, t60, 0.16, 0.42)); }
      M.plk = { m0: 52, step: 4, b: L };
    });
    T.push(function* musPerc() { const M = (b.mus = b.mus || {}); if (!M.swish) Object.assign(M, yield* gMusPerc(c)); });
    T.push(function* musRoom() { const M = (b.mus = b.mus || {}); if (!M.ir) M.ir = yield* gIR(c, 1.3); });
    T.push(function* musScore() {
      const M = (b.mus = b.mus || {});
      if (!M.pieces) { const P = {}; for (const id of ['title', 'select', 'meadow', 'fortress', 'bay', 'mountain']) { P[id] = yield* gArrange(id); } M.pieces = P; }
      M.ready = true;
    });
    T.push(function* musBus() { if (!self._offline && !self._mBus) yield* self._gBuild(); });
    T.push(function* bubbles() { if (!b.bub) b.bub = yield* gBubbles(c, 32); });
    T.push(function* roll() { if (!b.roll) { const r = yield* gRoll(c, 12); b.rollN = norm1(r); b.roll = r; } });
    T.push(function* blips() { if (!b.blip) { const x = yield* gBlips(c, 24); b.blipN = norm1(x); b.blip = x; } });
    T.push(function* squeal() { if (!b.squeal) b.squeal = yield* gSqueal(c, 3.7); });
    for (const name of ORDER) {
      if (name === 'creak') T.push(function* creaks() { if (!b.creak) b.creak = yield* gCreaks(c, 3); });
      if (name === 'spring') T.push(function* twang() { if (!b.twang) b.twang = yield* gPluck(c, 110, 1.0, 0.6, 0.55, 0.22, 0.5); });
      if (name === 'star') T.push(function* pluck() { if (!b.pluck) b.pluck = yield* gPluck(c, 261.63, 2.6, 0.25, 1.9, 0.13, 0.35); });
      T.push(Object.defineProperty(() => self._family(name), 'name', { value: name }));
    }
    return T;
  }

  async _drive(task, budget) {
    let g;
    const t00 = now();
    try { g = task(); } catch (e) { return; }
    if (!g || typeof g.next !== 'function') { this._slice(t00, task.name); return; }
    let send, t0 = t00;
    for (;;) {
      let r;
      try { r = g.next(send); } catch (e) { break; }
      send = undefined;
      if (r.done) break;
      const v = r.value;
      if (v && typeof v.then === 'function') {
        this._slice(t0, task.name);
        try { send = await v; } catch (e) { send = null; }
        t0 = now();
      } else if (now() - t0 > budget) {
        this._slice(t0, task.name);
        await new Promise((res) => setTimeout(res, 0));
        if (!this._ctx || this._ctx.state === 'closed') return;
        t0 = now();
      }
    }
    this._slice(t0, task.name);
  }

  _slice(t0, name) {
    const ms = now() - t0, s = this.stats;
    s.warmMs += ms;
    s.slices++;
    if (ms > 4) s.over4++;
    if (ms > s.maxSliceMs) { s.maxSliceMs = ms; s.maxSliceTask = name; }
  }

  // Run fn once the context is actually running (a context unlocked too early stays suspended
  // until a gesture resumes it; starting loops on it before then only makes browser warnings).
  _whenRunning(fn) {
    const c = this._ctx;
    if (this._offline || c.state === 'running') { fn(); return; }
    const h = () => {
      if (c.state !== 'running') return;
      c.removeEventListener('statechange', h);
      try { fn(); } catch (e) {}
    };
    c.addEventListener('statechange', h);
  }

  async _warm(amb) {
    const t0 = now();
    for (const task of this._tasks(amb)) {
      await new Promise((r) => setTimeout(r, 0));
      if (!this._ctx || this._ctx.state === 'closed') return;
      await this._drive(task, 3);
    }
    this.stats.banksReadyMs = now() - t0;
  }

  async _warmAll() {
    for (const task of this._tasks(false)) await this._drive(task, Infinity);
  }

  // Render every variant of one family into one buffer (a slot each) off the main thread, then
  // normalize each slot to the same loudness and make sure its last 10% is silent.
  *_family(name) {
    if (this._bank[name]) return;
    const F = FAM[name], sr = this._sr, slots = F.ps.length * F.n;
    const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!OAC) return;
    const oc = new OAC(F.ch, Math.ceil(slots * F.slot * sr), sr);
    const r = new PastaAudio();
    r._rig(oc, this._b);
    for (let s = 0; s < slots; s++) {
      const t = s * F.slot + 0.002;
      try { r[F.v](r._vNew(t), t, F.ps[Math.floor(s / F.n)]); } catch (e) {}
      yield;
    }
    const buf = yield oc.startRendering();
    if (!buf) return;
    const L = Math.round(F.slot * sr), chs = [];
    for (let c = 0; c < buf.numberOfChannels; c++) chs.push(buf.getChannelData(c));
    const norm = new Float32Array(slots), fadeA = Math.round(L * 0.84), fadeB = Math.round(L * 0.9);
    for (let s = 0; s < slots; s++) {
      const a = s * L;
      for (const d of chs) {
        for (let i = fadeA; i < fadeB; i++) d[a + i] *= (fadeB - i) / (fadeB - fadeA);
        for (let i = fadeB; i < L && a + i < d.length; i++) d[a + i] = 0;
      }
      const l = loud(chs, a, fadeA, sr);
      norm[s] = l > 1e-6 ? 1 / l : 0;
      yield;
    }
    this._bank[name] = { buf, F, L, norm };
    this.stats.banks++;
  }

  _rig(oc, b) {
    this._ctx = oc; this._sr = oc.sampleRate; this._b = b; this._offline = true; this._ok = true;
    this._sfx = oc.createGain();
    this._sfx.connect(oc.destination);
    this._sfxW = this._sfx;
  }

  _applyMaster(tau) {
    const p = this._m.gain, t = this._ctx.currentTime;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(this._muted ? 0 : this._vol * TRIM, t, tau);
  }

  // A short, dark double comb: the inside of a giant rigatoni. Ambience and a little of the
  // effects are sent into it while update() says inTube.
  _buildTube() {
    const c = this._ctx;
    const tin = c.createGain(), tout = c.createGain();
    tout.gain.value = 0.5;
    const comb = (dt, fb, lpf) => {
      const d = c.createDelay(0.1), l = c.createBiquadFilter(), g = c.createGain();
      d.delayTime.value = dt;
      l.type = 'lowpass'; l.frequency.value = lpf; l.Q.value = qv('lowpass', 0.6);
      g.gain.value = fb;
      tin.connect(d); d.connect(l); l.connect(g); g.connect(d); l.connect(tout);
    };
    comb(0.0047, 0.5, 1700);
    comb(0.0071, 0.45, 1300);
    tout.connect(this._uwIn);
    const send = c.createGain();
    send.gain.value = 0;
    this._sfx.connect(send);
    send.connect(tin);
    this._tubeIn = tin;
    this._tubeSfx = send;
  }

  _startAmbience() {
    if (this._A || !this._ok || !this._b.wind) return;
    const c = this._ctx, b = this._b, t = this._now(), A = {};
    const G = (v) => { const g = c.createGain(); g.gain.value = v; return g; };
    const F = (type, f, q) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = qv(type, q); return x; };
    const S = (bf, rate) => { const s = c.createBufferSource(); s.buffer = bf; s.loop = true; s.playbackRate.value = rate; s.start(t, R() * bf.duration * 0.95); return s; };
    const wind = dB(LV.wind) * this._windOn, air = dB(LV.air) * this._windOn;
    A.lvl = G(0);
    A.lvl.gain.setValueAtTime(0, t);
    A.lvl.gain.linearRampToValueAtTime(this._ambLevel, t + 3);
    A.outLP = F('lowpass', Math.min(16000, this._sr * 0.45), 0.7);
    A.outG = G(1);
    A.lvl.connect(A.outLP); A.outLP.connect(A.outG); A.outG.connect(this._uwIn);
    A.tubeWind = G(0);
    A.lvl.connect(A.tubeWind); A.tubeWind.connect(this._tubeIn);
    // The outdoor layers meet in windSum; outdoor stays at exactly 1 unless the menu bed is on.
    A.windSum = G(1);
    A.outdoor = G(1);
    A.windSum.connect(A.outdoor); A.outdoor.connect(A.lvl);
    // Warm air: low-mid hush with a slow, broad "howl" band wandering inside it.
    A.s1 = S(b.wind, 0.94 + 0.12 * this._walk.rate);
    const hp = F('highpass', 70, 0.5);
    A.lp = F('lowpass', 480, 0.5);
    A.gW = G(wind);
    A.howl = F('bandpass', 420, 1.4);
    A.gH = G(wind * 0.4);
    A.s1.connect(hp); hp.connect(A.lp); A.lp.connect(A.gW); A.gW.connect(A.windSum);
    hp.connect(A.howl); A.howl.connect(A.gH); A.gH.connect(A.windSum);
    // Thin high air that comes up with gusts.
    A.s2 = S(b.wind, rr(0.95, 1.0));
    A.bpA = F('bandpass', 2100, 0.6);
    A.gA = G(air);
    A.s2.connect(A.bpA); A.bpA.connect(A.gA); A.gA.connect(A.windSum);
    // A pot simmering somewhere off to the side: update() drops single bubbles into simIn.
    A.simIn = G(1);
    A.gS = G(this._simmerOn ? dB(LV.simmer) : 0);
    const shp = F('highpass', 140, 0.7), slp = F('lowpass', 1500, 0.7);
    A.simIn.connect(shp); shp.connect(slp); slp.connect(A.gS);
    let tail = A.gS;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = 0.2; A.gS.connect(p); tail = p; }
    A.simMenu = G(1); // brings the simmer closer on the menu screens
    tail.connect(A.simMenu); A.simMenu.connect(A.lvl);
    // Slow incommensurate LFOs keep the bed moving even if update() is never called; update()
    // adds random walks on top. The rate LFOs mean the noise loops never line up the same way.
    // Each LFO starts at a random phase, so no two sessions (or loop passes) begin alike.
    const lfo = (f, depth, param) => this._lfoN(f, depth, param, t);
    lfo(rr(0.016, 0.021), wind * 0.3, A.gW.gain);
    lfo(rr(0.047, 0.055), wind * 0.18, A.gW.gain);
    lfo(rr(0.07, 0.09), 110, A.lp.frequency);
    lfo(rr(0.06, 0.07), 80, A.howl.frequency);
    lfo(rr(0.029, 0.034), air * 0.25, A.gA.gain);
    lfo(rr(0.011, 0.014), 0.03, A.s1.playbackRate);
    lfo(rr(0.017, 0.02), 0.03, A.s2.playbackRate);
    this._A = A;
    this._tubeSent = -1;
    this._menuSent = -1;
  }

  // Simmer: a Poisson number of single bubbles over the next `step` seconds; busier when w is high.
  _bubbles(t, step, w) {
    const bub = this._b.bub, c = this._ctx, A = this._A;
    const lim = Math.exp(-(6 + 30 * w * w) * step);
    let n = -1, p = 1;
    do { n++; p *= R(); } while (p > lim && n < 12);
    for (let k = 0; k < n; k++) {
      const s = c.createBufferSource();
      s.buffer = pick(bub);
      s.playbackRate.value = rr(0.85, 1.2);
      s.connect(A.simIn);
      s.onended = () => { try { s.disconnect(); } catch (e) {} };
      s.start(t + R() * step);
    }
  }

  // Called every frame. Cheap: it only touches AudioParams every ~150 ms or when inTube flips.
  // It is paced by the audio clock, not by dt, so a wrong or huge dt can't flood anything.
  update(dt, s) {
    try {
      if (!this._ok) return;
      if (s && typeof s === 'object') {
        this._h = c01(s.height01, this._h);
        this._sp = c01(s.speed01, this._sp);
        this._tube = s.inTube ? 1 : 0;
        this._menu = s.menu ? 1 : 0;
        this._uw = c01(s.underwater, 0);
        this._depth = c01(s.depth01, 0);
        this._shore = c01(s.shore01, 0);
        this._wind = c01(s.wind01, 0);
      }
      const t = this._now();
      if (this._mRun || this._mFade.length || (this._mOn && this._mWant !== this._mCur)) this._musicTick(t);
      if (this._lastUpd === undefined) this._lastUpd = t;
      const el = t - this._lastUpd;
      if (el < 0.15 && el >= 0 && this._tube === this._tubeSent && this._menu === this._menuSent && Math.abs(this._uw - this._uwSent) < 0.02 &&
        Math.abs(this._wind - this._windSent) < 0.02) return;
      const step = clamp(el, 0.016, 0.5);
      this._lastUpd = t;
      const sl = this._sl;
      if (sl && !sl.on && t - sl.offT > 0.8) this._slideStop(t);
      const st = this._st;
      if (st && !st.on && t - st.offT > 1) this._stretchStop(t);
      const sd = this._sd;
      if (sd && sd.on && t - sd.lt > 0.35) { sd.out.gain.setTargetAtTime(0, t, 0.07); sd.on = false; sd.offT = t; } // sled() stopped being called
      else if (sd && !sd.on && t - sd.offT > 0.8) this._sledStop(t);
      if (this._tube !== this._tubeSent) this._applyTube(t);
      if (this._menu !== this._menuSent) this._applyMenu(t);
      if (this._uw || this._uwSent || this._shore || this._shoreSent) this._applyWater(t, el >= 0.15);
      if (this._wind || this._windSent) this._applyMountain(t, el >= 0.15);
      if (this._mBus) this._musicState(t);
      const A = this._A;
      if (!A) return;
      const W = this._walk, k = Math.sqrt(step / 0.15);
      const walk = (x, mean, pull, amt) => clamp(x + (mean - x) * pull * (step / 0.15) + (R() * 2 - 1) * amt * k, 0, 1);
      W.gust = walk(W.gust, 0.45, 0.03, 0.11);
      W.lp = walk(W.lp, 0.5, 0.02, 0.08);
      W.howl = walk(W.howl, 0.5, 0.02, 0.07);
      W.sim = walk(W.sim, 0.5, 0.03, 0.12);
      W.rate = walk(W.rate, 0.5, 0.02, 0.08);
      const h = this._h, sp = this._sp, wo = this._windOn;
      A.gW.gain.setTargetAtTime(wo * dB(LV.wind) * (0.65 + 0.7 * W.gust) * (1 + 0.45 * h), t, 0.8);
      A.lp.frequency.setTargetAtTime((330 + 380 * W.lp) * (1 + 0.3 * h) + 100 * sp, t, 1.0);
      A.gA.gain.setTargetAtTime(wo * dB(LV.air) * (0.3 + 1.3 * W.gust * W.gust) * (1 + 1.2 * h) * (1 + 0.4 * sp), t, 0.8);
      A.howl.frequency.setTargetAtTime(260 + 380 * W.howl + 120 * h, t, 1.5);
      A.gS.gain.setTargetAtTime(this._simmerOn ? dB(LV.simmer) * (0.7 + 0.6 * W.sim) * (1 - 0.85 * this._mtnPres()) : 0, t, 1.2);
      A.s1.playbackRate.setTargetAtTime(0.94 + 0.12 * W.rate, t, 2);
      if (this._b.bub && this._simmerOn && (this._offline || this._ctx.state === 'running')) this._bubbles(t, step, Math.min(1, W.sim + 0.08 * this._menu));
    } catch (e) {}
  }

  _applyTube(t) {
    const tube = this._tube, tau = 0.25;
    this._tubeSfx.gain.setTargetAtTime(0.3 * tube, t, tau);
    const A = this._A;
    if (A) {
      A.outG.gain.setTargetAtTime(1 - 0.55 * tube, t, tau);
      A.outLP.frequency.setTargetAtTime(tube ? 1400 : Math.min(16000, this._sr * 0.45), t, tau);
      A.tubeWind.gain.setTargetAtTime(1.0 * tube, t, tau);
    }
    this._tubeSent = tube;
  }

  // The opening and select screens (update() with menu: true): a quieter, warmer bed, like a
  // kitchen in the afternoon. The outdoor air drops to a muffled "through the window", a soft
  // room tone comes up and the simmer moves closer. Crossfades over about a second.
  _applyMenu(t) {
    const A = this._A, m = this._menu, tau = 0.3;
    this._menuSent = m;
    if (!A) return;
    if (m && !A.room) this._buildRoom(t);
    if (!A.room) return;
    A.outdoor.gain.setTargetAtTime(this._outdoorTarget(), t, tau);
    A.window.gain.setTargetAtTime(0.4 * m, t, tau);
    A.gR.gain.setTargetAtTime(m * dB(LV.room) * this._windOn, t, tau);
    A.simMenu.gain.setTargetAtTime(1 + 0.3 * m, t, tau);
  }

  // Built the first time the menu bed is asked for, so the outdoor bed is untouched until then.
  _buildRoom(t) {
    const c = this._ctx, A = this._A, b = this._b;
    const F = (type, f, q) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = qv(type, q); return x; };
    A.window = c.createGain();
    A.window.gain.value = 0;
    const wlp = F('lowpass', 450, 0.7);
    A.windSum.connect(A.window); A.window.connect(wlp); wlp.connect(A.lvl);
    // Room tone: a soft, steady low hush. Its loop speed drifts so it never lines up twice.
    const s = c.createBufferSource();
    s.buffer = b.wind; s.loop = true; s.playbackRate.value = rr(0.5, 0.6);
    const lp = F('lowpass', 300, 0.5), hp = F('highpass', 50, 0.7);
    A.gR = c.createGain();
    A.gR.gain.value = 0;
    s.connect(lp); lp.connect(hp); hp.connect(A.gR); A.gR.connect(A.lvl);
    s.start(t, R() * b.wind.duration * 0.9);
    const o = c.createOscillator(), og = c.createGain();
    o.frequency.value = rr(0.013, 0.017); og.gain.value = 0.03;
    o.connect(og); og.connect(s.playbackRate); o.start(t);
    A.room = true;
  }

  _outdoorTarget() {
    const A = this._A, m = this._menu;
    return (A && A.room ? 1 - 0.9 * m : 1) * (1 - 0.85 * this._uw * (1 - m)) * (1 - this._mtnPres());
  }

  // How fully the mountain's wind has taken the summer air's place (0 off the mountain).
  _mtnPres() {
    return this._A && this._A.mtn ? clamp(this._wind / 0.08, 0, 1) * (1 - this._menu) : 0;
  }

  // A slow sine at a random phase added onto an AudioParam.
  _lfo(f, depth, param, t) {
    this._lfoN(f, depth, param, t);
  }

  // The same, returning its nodes. A plain sine (no wave table to build, which costs a
  // millisecond or more on the main thread) spun fast for its first 50 ms so its phase lands
  // anywhere, while its depth rises from nothing over two seconds.
  _lfoN(f, depth, param, t) {
    const c = this._ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(f + R() / 0.05, t);
    o.frequency.setValueAtTime(f, t + 0.05);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(depth, t + 2);
    o.connect(g); g.connect(param); o.start(t);
    return [o, g];
  }

  // Under water and at the shore (update() with underwater, depth01, shore01). Going under, the
  // game mix (not the water sounds, not the menu bed) crossfades to a muffled, slightly thicker
  // copy, the outdoor air ducks and a low bed comes up: pressure, slow far creaks, distant bubble
  // trickles; deeper is lower and darker. Near the waterline small waves lap. All smooth ramps.
  _applyWater(t, full) {
    const A = this._A, d = this._depth, uw = this._uw * (1 - this._menu), tau = 0.08;
    const live = this._offline || this._ctx.state === 'running';
    this._uwSent = this._uw;
    this._shoreSent = this._shore;
    if (uw > 0.001 && !this._uwLP) this._buildWet();
    if (this._uwLP) {
      this._uwDry.gain.setTargetAtTime(1 - uw, t, tau);
      this._uwWet.gain.setTargetAtTime(uw, t, tau);
      this._uwLP.frequency.setTargetAtTime(Math.exp(Math.log(3500) + (Math.log(650 - 230 * d) - Math.log(3500)) * uw), t, tau);
    }
    if (!A) return;
    if (uw > 0.001 && !A.uw) this._buildUWBed(t);
    if (this._shore > 0.001 && !A.shore) this._buildShore(t);
    if (A.uw) {
      A.outdoor.gain.setTargetAtTime(this._outdoorTarget(), t, tau);
      const bed = uw * this._ambLevel;
      A.uwG.gain.setTargetAtTime(dB(LV.uwBed) * bed * (0.85 + 0.3 * d), t, 0.12);
      A.uwLP.frequency.setTargetAtTime(300 - 120 * d, t, 0.6);
      A.uwBP.frequency.setTargetAtTime(110 - 35 * d, t, 0.6);
      A.uwFar.frequency.setTargetAtTime(1200 - 550 * d, t, 0.6);
      if (full && live && bed > 0.25 && !this._muted) {
        if (t >= this._nextCreak) { this._uwCreak(t + R() * 0.1, d); this._nextCreak = t + rr(4, 10); }
        if (t >= this._nextTrickle) { this._uwTrickle(t + R() * 0.1); this._nextTrickle = t + rr(3, 8); }
      }
    }
    if (A.shore) {
      const k = this._shore * (1 - uw);
      A.shoreG.gain.setTargetAtTime(dB(LV.shore) * k, t, 0.4);
      if (full && live && k > 0.05 && t >= this._nextLap && !this._muted) { this._lap(t + R() * 0.1); this._nextLap = t + rr(2.2, 4.6); }
    }
  }

  _buildWet() {
    const c = this._ctx;
    this._uwLP = c.createBiquadFilter();
    this._uwLP.type = 'lowpass'; this._uwLP.frequency.value = 3500; this._uwLP.Q.value = qv('lowpass', 0.8);
    const thick = c.createBiquadFilter();
    thick.type = 'peaking'; thick.frequency.value = 260; thick.Q.value = 0.8; thick.gain.value = 4;
    this._uwWet = c.createGain();
    this._uwWet.gain.value = 0;
    this._uwIn.connect(this._uwLP); this._uwLP.connect(thick); thick.connect(this._uwWet); this._uwWet.connect(this._m);
  }

  _buildUWBed(t) {
    const c = this._ctx, b = this._b, A = this._A;
    if (!b.wind) return;
    const G = (v) => { const g = c.createGain(); g.gain.value = v; return g; };
    const F = (type, f, q) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = qv(type, q); return x; };
    A.uwG = G(0);
    A.uwG.connect(this._m);
    // Pressure: slow, dark noise with a soft low resonance in it, swelling a little.
    const s = c.createBufferSource();
    s.buffer = b.wind; s.loop = true; s.playbackRate.value = rr(0.36, 0.44);
    A.uwLP = F('lowpass', 300, 0.7);
    A.uwBP = F('bandpass', 110, 2.5);
    const hum = G(1), res = G(0.7);
    s.connect(A.uwLP); A.uwLP.connect(hum);
    s.connect(A.uwBP); A.uwBP.connect(res); res.connect(hum);
    hum.connect(A.uwG);
    s.start(t, R() * b.wind.duration * 0.9);
    this._lfo(rr(0.05, 0.08), 0.25, hum.gain, t);
    this._lfo(rr(0.011, 0.015), 0.03, s.playbackRate, t);
    // Far creaks and bubble trickles come in through a darker filter.
    A.uwFar = F('lowpass', 1200, 0.7);
    A.uwFar.connect(A.uwG);
    A.uwTrk = G(0.1);
    A.uwTrk.connect(A.uwFar);
    A.uw = true;
    this._nextCreak = t + rr(2, 5);
    this._nextTrickle = t + rr(1.5, 4);
  }

  // A slow, faint creak somewhere in the bay.
  _uwCreak(t, d) {
    const c = this._ctx, b = this._b, A = this._A;
    if (!b.starch) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), p = g.gain;
    s.buffer = b.starch; s.loop = true; s.playbackRate.value = rr(0.22, 0.35) * (1 - 0.25 * d);
    f.type = 'lowpass'; f.frequency.value = rr(380, 520) * (1 - 0.3 * d); f.Q.value = qv('lowpass', 0.8);
    const up = rr(0.5, 1), hold = rr(0.2, 0.8), end = t + up + hold + rr(0.8, 1.6), pk = 0.5 * rr(0.5, 1);
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(pk, t + up); p.setValueAtTime(pk, t + up + hold); p.linearRampToValueAtTime(0, end);
    s.connect(f); f.connect(g); g.connect(A.uwFar);
    s.onended = () => { for (const x of [s, f, g]) { try { x.disconnect(); } catch (e) {} } };
    s.start(t, R() * b.starch.duration * 0.9);
    s.stop(end + 0.05);
  }

  // A few distant bubbles rising, spreading out as they go.
  _uwTrickle(t) {
    const c = this._ctx, bb = this._b.blip || this._b.bub, A = this._A;
    if (!bb) return;
    let tt = t;
    for (let k = 0, n = ri(4, 10); k < n; k++) {
      tt += rr(0.04, 0.16) * (1 + 0.12 * k);
      const s = c.createBufferSource();
      s.buffer = bb[ri(Math.floor(bb.length * 0.25), bb.length - 1)];
      s.playbackRate.value = rr(0.8, 1.1);
      s.connect(A.uwTrk);
      s.onended = () => { try { s.disconnect(); } catch (e) {} };
      s.start(tt);
    }
  }

  _buildShore(t) {
    const c = this._ctx, b = this._b, A = this._A;
    if (!b.wind) return;
    A.shoreG = c.createGain();
    A.shoreG.gain.value = 0;
    A.shoreG.connect(A.lvl);
    // A soft, constant water murmur under the laps.
    const s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b.wind; s.loop = true; s.playbackRate.value = rr(0.6, 0.7);
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = qv('lowpass', 0.6);
    g.gain.value = 0.35;
    s.connect(lp); lp.connect(g); g.connect(A.shoreG);
    s.start(t, R() * b.wind.duration * 0.9);
    this._lfo(rr(0.012, 0.016), 0.03, s.playbackRate, t);
    this._lfo(rr(0.08, 0.11), 0.12, g.gain, t);
    A.shore = true;
    this._nextLap = t + rr(0.3, 1.2);
  }

  // One small wave on the shore: a soft wash that rises and draws back, foam fizzing as it goes.
  _lap(t) {
    const c = this._ctx, b = this._b, A = this._A;
    if (!b.pink || !b.wet) return;
    const up = rr(0.35, 0.6), dur = rr(1.5, 2.5), pk = rr(0.55, 1), t2 = t + up * 0.7, d2 = dur * 0.8;
    const end = Math.max(t + dur, t2 + d2) + 0.12;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), p = g.gain;
    s.buffer = b.pink; s.loop = true; s.playbackRate.value = rr(0.8, 1.1);
    f.type = 'bandpass'; f.Q.value = 0.6;
    f.frequency.setValueAtTime(rr(350, 450), t);
    f.frequency.exponentialRampToValueAtTime(rr(900, 1300), t + up);
    f.frequency.exponentialRampToValueAtTime(rr(500, 700), t + dur);
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(pk, t + up); p.exponentialRampToValueAtTime(pk * 0.04, t + dur); p.linearRampToValueAtTime(0, t + dur + 0.05);
    s.connect(f); f.connect(g); g.connect(A.shoreG);
    const s2 = c.createBufferSource(), f2 = c.createBiquadFilter(), g2 = c.createGain(), q = g2.gain;
    s2.buffer = b.wet; s2.loop = true; s2.playbackRate.value = rr(1.3, 1.7);
    f2.type = 'bandpass'; f2.frequency.value = rr(2200, 3200); f2.Q.value = 0.7;
    q.setValueAtTime(0, t2); q.linearRampToValueAtTime(pk * 0.3, t2 + 0.25); q.exponentialRampToValueAtTime(pk * 0.01, t2 + d2); q.linearRampToValueAtTime(0, t2 + d2 + 0.05);
    s2.connect(f2); f2.connect(g2); g2.connect(A.shoreG);
    s.onended = () => { for (const x of [s, f, g, s2, f2, g2]) { try { x.disconnect(); } catch (e) {} } };
    s.start(t, R() * b.pink.duration * 0.8); s.stop(end);
    s2.start(t2, R() * b.wet.duration * 0.8); s2.stop(end);
  }

  // The mountain (update() with wind01 above 0): cold wind takes the summer air's place. An open,
  // airy rush with a soft moan in it; slow gusts swell, brighten and die away; near the summit a
  // faint whistle rises with them. Lower on the mountain it is calmer: quieter, darker, fewer
  // and weaker gusts. Built the first time it is needed; every change is a ramp.
  _applyMountain(t, full) {
    const A = this._A, w = this._wind;
    this._windSent = w;
    if (!A) return;
    if (w > 0.001 && !A.mtn) this._buildMountain(t);
    const M = A.mtn;
    if (!M) return;
    const p = this._mtnPres(), wl = w > 0.55 ? WHISTLE * Math.pow((w - 0.55) / 0.45, 1.5) : 0;
    if (Math.abs(p - M.p) > 0.001) {
      // coming onto the mountain the wind comes up a little faster than the summer air leaves,
      // and the other way round going off it, so the crossfade has no hole in it
      const up = p > M.p;
      M.p = p;
      A.outdoor.gain.setTargetAtTime(this._outdoorTarget(), t, up ? 1.0 : 0.55);
      M.lvl.gain.setTargetAtTime(dB(LV.mtn) * this._windOn * p, t, up ? 0.55 : 1.0);
    }
    M.gst.gain.setTargetAtTime(0.68 + 0.14 * w, t, 1);
    M.lp.frequency.setTargetAtTime(450 + 1000 * w, t, 1);
    M.gw.gain.setTargetAtTime(0.12 * wl, t, 1);
    if (!M.gust) return;
    M.dW.gain.setTargetAtTime(wl, t, 1);
    M.dLP.gain.setTargetAtTime(800 + 1000 * w, t, 1);
    // Now and then a gust swells over 1-2 s, holds, and dies away over 2-4 s; higher up they
    // come more often and blow harder. A little flutter rides on top.
    const G = this._gst, ease = (x) => x * x * (3 - 2 * x);
    if (full && p > 0.01 && !G.on && t >= this._nextGust) {
      G.on = true; G.t0 = t; G.rise = rr(0.8, 2); G.hold = rr(0.2, 1.2); G.fall = rr(1.8, 4.5); G.peak = rr(0.45, 1) * (0.35 + 0.65 * w);
    }
    let g = 0;
    if (G.on) {
      const u = t - G.t0;
      if (u < G.rise) g = G.peak * ease(u / G.rise);
      else if (u < G.rise + G.hold) g = G.peak;
      else if (u < G.rise + G.hold + G.fall) g = G.peak * (1 - ease((u - G.rise - G.hold) / G.fall));
      else { G.on = false; this._nextGust = t + rr(1, 6) * (1.6 - 0.8 * w); }
    }
    if (full) {
      G.fl = clamp(G.fl + (0.5 - G.fl) * 0.05 + (R() * 2 - 1) * 0.12, 0, 1);
      // the noise loops' speeds wander, so the 6 s buffer never comes round the same way twice
      G.r1 = clamp(fin(G.r1, 0.5) + (0.5 - fin(G.r1, 0.5)) * 0.02 + (R() * 2 - 1) * 0.08, 0, 1);
      G.r2 = clamp(fin(G.r2, 0.5) + (0.5 - fin(G.r2, 0.5)) * 0.02 + (R() * 2 - 1) * 0.08, 0, 1);
      M.s1.playbackRate.setTargetAtTime(0.88 + 0.14 * G.r1, t, 2);
      M.s2.playbackRate.setTargetAtTime(0.93 + 0.14 * G.r2, t, 2);
    }
    M.gust.offset.setTargetAtTime(p > 0.01 ? Math.max(0, g + 0.12 * w * (G.fl - 0.5)) : 0, t, 0.35);
  }

  _buildMountain(t) {
    const c = this._ctx, b = this._b, A = this._A;
    if (!b.wind) return;
    const G = (v) => { const g = c.createGain(); g.gain.value = v; return g; };
    const F = (type, f, q) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = qv(type, q); return x; };
    const S = (rate) => { const s = c.createBufferSource(); s.buffer = b.wind; s.loop = true; s.playbackRate.value = rate; s.start(t, R() * b.wind.duration * 0.9); return s; };
    const M = {}, w = this._wind;
    M.lvl = G(0);
    M.lvl.connect(A.lvl);
    M.gst = G(0.68 + 0.14 * w);
    M.gst.connect(M.lvl);
    // The rush: open and airy, brighter in the gusts. Two passes over the noise at different
    // speeds, so its loop never comes round the same way.
    const s1 = (M.s1 = S(rr(0.92, 1.0))), s1b = S(rr(0.76, 0.82)), hp = F('highpass', 110, 0.6), half = G(Math.SQRT1_2), halfb = G(Math.SQRT1_2);
    M.lp = F('lowpass', 450 + 1000 * w, 0.6);
    s1.connect(half); s1b.connect(halfb); half.connect(hp); halfb.connect(hp); hp.connect(M.lp); M.lp.connect(M.gst);
    this._lfo(rr(0.021, 0.027), 0.03, s1b.playbackRate, t);
    // A soft moan inside it.
    M.moan = F('bandpass', 340, 4);
    const gm = G(0.6);
    hp.connect(M.moan); M.moan.connect(gm); gm.connect(M.gst);
    // Near the summit: a faint whistle over the ridge, two narrow bands that rise in the gusts.
    const s2 = (M.s2 = S(rr(0.95, 1.05))), f1 = rr(1150, 1450);
    M.w1 = F('bandpass', f1, 50);
    M.w2 = F('bandpass', f1 * rr(1.46, 1.58), 56);
    M.gw = G(0);
    const g2 = G(0.6);
    s2.connect(M.w1); s2.connect(M.w2); M.w1.connect(M.gw); M.w2.connect(g2); g2.connect(M.gw);
    M.gw.connect(M.lvl);
    // Slow drifts, so it moves even between gusts and the loops never line up the same way.
    this._lfo(rr(0.05, 0.07), 90, M.lp.frequency, t);
    this._lfo(rr(0.11, 0.14), 0.06, M.gst.gain, t);
    this._lfo(rr(0.07, 0.09), 40, M.moan.frequency, t);
    this._lfo(rr(0.08, 0.1), f1 * 0.02, M.w1.frequency, t);
    this._lfo(rr(0.012, 0.016), 0.03, s1.playbackRate, t);
    this._lfo(rr(0.033, 0.041), 0.02, s1.playbackRate, t);
    this._lfo(rr(0.017, 0.021), 0.03, s2.playbackRate, t);
    // Gusts: one control signal moves the level, the brightness, the moan and the whistle together.
    if (c.createConstantSource) {
      M.gust = c.createConstantSource();
      M.gust.offset.value = 0;
      const to = (depth, param) => { const g = G(depth); M.gust.connect(g); g.connect(param); return g; };
      to(0.9, M.gst.gain);
      M.dLP = to(1200, M.lp.frequency);
      to(180, M.moan.frequency);
      to(f1 * 0.12, M.w1.frequency);
      to(f1 * 0.18, M.w2.frequency);
      M.dW = to(0, M.gw.gain);
      M.gust.start(t);
    }
    M.p = 0;
    A.mtn = M;
    this._nextGust = t + rr(0.5, 2);
  }

  // ----- playback ------------------------------------------------------------------------------
  // A strip is a persistent lowpass -> gain -> pan chain into the effects bus. A one-shot is a
  // single buffer source plugged into a free strip; it unplugs itself when it ends.

  _newStrip(w) {
    const c = this._ctx, f = c.createBiquadFilter(), g = c.createGain(), bus = w ? this._sfxW : this._sfx;
    f.type = 'lowpass'; f.frequency.value = Math.min(20000, this._sr * 0.45); f.Q.value = qv('lowpass', 0.707);
    f.connect(g);
    let p = null;
    if (c.createStereoPanner) { p = c.createStereoPanner(); g.connect(p); p.connect(bus); } else g.connect(bus);
    return { f, g, p, busy: 0 };
  }

  // bus 'w' plays on the water bus (its own pool of strips).
  _pb(buf, off, dur, t, gain, rate, pan, lp, prio, bus) {
    const w = bus === 'w', pool = w ? this._stripsW : this._strips;
    let st = null;
    for (let i = 0; i < pool.length; i++) if (pool[i].busy <= t) { st = pool[i]; break; }
    if (!st) {
      if (pool.length >= (prio >= 2 ? 32 : 24)) return false;
      st = this._newStrip(w);
      pool.push(st);
    }
    st.busy = t + dur / rate + 0.02;
    // A mono buffer through an equal-power panner loses 3 dB per side at center; put it back.
    st.g.gain.setValueAtTime(st.p && buf.numberOfChannels === 1 ? gain * Math.SQRT2 : gain, t);
    st.f.frequency.setValueAtTime(Math.min(lp, this._sr * 0.45), t);
    if (st.p) st.p.pan.setValueAtTime(clamp(pan, -1, 1), t);
    const s = this._ctx.createBufferSource();
    s.buffer = buf;
    if (rate !== 1) s.playbackRate.value = rate;
    s.connect(st.f);
    s.onended = () => { try { s.disconnect(); } catch (e) {} };
    s.start(t, off, dur);
    return true;
  }

  _gate(key, gap) {
    if (!this._ok || this._muted) return -1;
    if (!this._offline && this._ctx.state !== 'running') return -1;
    const t = this._now(), last = this._last[key];
    if (last !== undefined && Math.abs(t - last) < gap) return -1;
    this._last[key] = t;
    return t;
  }

  // One event of a family at intensity p, with a level curve value cg.
  _ev(name, p, key, gap, prio, cg) {
    const t0 = this._gate(key, gap);
    if (t0 < 0) return;
    if (prio >= 2 && this._mDk) this._mDuck(t0); // the music dips for the bigger sounds
    const F = FAM[name], j = F.j, t = t0 + (j.t ? R() * j.t : 0);
    const lvl = dB(LV[name]) * cg * (j.g ? dB(rr(-j.g, j.g)) : 1);
    const B = this._bank[name];
    if (B) {
      const ps = F.ps;
      let pi = 0;
      if (ps.length > 1) {
        let a = 0;
        while (a < ps.length - 2 && p > ps[a + 1]) a++;
        const u = clamp((p - ps[a]) / (ps[a + 1] - ps[a]), 0, 1);
        pi = R() < u ? a + 1 : a;
      }
      let k = Math.floor(R() * F.n);
      const lk = this._lastVar[name];
      if (F.n > 1 && pi * F.n + k === lk) k = (k + 1 + Math.floor(R() * (F.n - 1))) % F.n;
      const slot = pi * F.n + k;
      this._lastVar[name] = slot;
      const rate = j.r ? 1 + rr(-j.r, j.r) : 1;
      const lp = j.lp ? rr(j.lp[0], j.lp[1]) : Math.min(20000, this._sr * 0.45);
      this._pb(B.buf, slot * F.slot, F.slot * 0.95, t, lvl * B.norm[slot], rate, j.p ? rr(-j.p, j.p) : 0, lp, prio, F.bus);
    } else {
      this._play(t, prio, (v) => { v.o.gain.value = lvl * dB(-F.cal); return this[F.v](v, t, p); }, F.bus);
    }
  }

  // ----- live voices (bank rendering, and the first moments after unlock) ------------------------
  // A live voice gets an output gain and a silent sentinel source that ends after the voice's
  // last tail; when it ends, every node of the voice is disconnected.

  _play(t, prio, fn, bus) {
    let v = null;
    try {
      if (prune(this._ends, t) >= (prio >= 2 ? MAXV + 16 : MAXV)) return;
      v = this._vNew(t, bus);
      v.done = false;
      this._fin(v, fin(fn(v), t + 1));
    } catch (e) {
      if (v && !v.done) { try { this._fin(v, t + 2); } catch (e2) {} }
    }
  }

  _vNew(t, bus) {
    const o = this._ctx.createGain();
    o.connect(bus === 'w' && this._sfxW ? this._sfxW : this._sfx);
    return { o, t, n: [o], done: true };
  }

  _fin(v, end) {
    v.done = true;
    const c = this._ctx, stopAt = Math.max(end, v.t) + 0.03;
    this._ends.push(stopAt);
    let s;
    if (c.createConstantSource) { s = c.createConstantSource(); s.offset.value = 0; }
    else { s = c.createBufferSource(); s.buffer = this._b.silent; s.loop = true; }
    s.connect(v.o);
    this._nv++;
    s.onended = () => {
      const n = v.n;
      v.n = null;
      if (n) { this._nv--; for (let i = 0; i < n.length; i++) { try { n[i].disconnect(); } catch (e) {} } }
      try { s.disconnect(); } catch (e) {}
    };
    s.start(v.t);
    s.stop(stopAt);
  }

  _g(v, val) { const g = this._ctx.createGain(); g.gain.value = val; v.n.push(g); return g; }

  _f(v, type, f, q) {
    const b = this._ctx.createBiquadFilter();
    b.type = type; b.frequency.value = clamp(f, 10, this._sr * 0.45); b.Q.value = qv(type, q);
    v.n.push(b);
    return b;
  }

  // A buffer source started at a random point, so no two hits share a waveform.
  _s(v, buffer, t, dur, rate) {
    const s = this._ctx.createBufferSource();
    s.buffer = buffer;
    if (rate && rate !== 1) s.playbackRate.value = rate;
    const need = dur * (rate || 1), bd = buffer.duration;
    if (need < bd - 0.02) s.start(t, R() * (bd - need - 0.01));
    else { s.loop = true; s.start(t, R() * bd * 0.9); }
    s.stop(t + dur);
    v.n.push(s);
    return s;
  }

  _to(v, node, pan) {
    if (pan && this._ctx.createStereoPanner) {
      const p = this._ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      v.n.push(p);
      node.connect(p);
      p.connect(v.o);
    } else node.connect(v.o);
  }

  // Attack-decay envelope; t60 is the time to fall 60 dB.
  _env(p, t, a, peak, t60) {
    peak = Math.max(fin(peak, 0), 1e-6);
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.exponentialRampToValueAtTime(peak * 1e-3, t + a + t60);
    p.linearRampToValueAtTime(0, t + a + t60 + 0.01);
  }

  // Filtered noise burst. o: { buf, src, rate, type, f, f2, sw, q, type2, ff, ff2, q2, a, t60, g, pan }
  _nb(v, t, o) {
    const a = fin(o.a, 0.002), t60 = fin(o.t60, 0.05), dur = a + t60 + 0.03, nyq = this._sr * 0.45;
    const src = o.src || this._s(v, (o.buf && this._b[o.buf]) || this._b.pink || this._b.white, t, dur, o.rate || 1);
    let f = this._f(v, o.type || 'lowpass', o.f || 1000, o.q || 0.707);
    if (o.f2) { f.frequency.setValueAtTime(clamp(o.f, 10, nyq), t); f.frequency.exponentialRampToValueAtTime(clamp(o.f2, 10, nyq), t + (o.sw || dur)); }
    src.connect(f);
    if (o.type2) {
      const f2 = this._f(v, o.type2, o.ff || 1000, o.q2 || 0.707);
      if (o.ff2) { f2.frequency.setValueAtTime(clamp(o.ff, 10, nyq), t); f2.frequency.exponentialRampToValueAtTime(clamp(o.ff2, 10, nyq), t + (o.sw || dur)); }
      f.connect(f2);
      f = f2;
    }
    const g = this._g(v, 0);
    this._env(g.gain, t, a, fin(o.g, 1), t60);
    f.connect(g);
    this._to(v, g, o.pan);
    return t + a + t60 + 0.012;
  }

  // One pre-rendered tick/drop/pluck.
  _tk(v, t, buffer, rate, gain, pan) {
    if (!buffer) return t;
    const s = this._ctx.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = rate;
    const g = this._g(v, gain);
    s.connect(g);
    this._to(v, g, pan);
    s.start(t);
    v.n.push(s);
    return t + buffer.duration / rate + 0.005;
  }

  // A short pitched body with a glide (bubble plops, rubbery thumps).
  _chirp(v, t, o) {
    const os = this._ctx.createOscillator();
    os.type = o.type || 'sine';
    os.frequency.setValueAtTime(o.f, t);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + o.sw);
    const g = this._g(v, 0);
    this._env(g.gain, t, o.a, o.g, o.t60);
    let node = os;
    if (o.lp) { const f = this._f(v, 'lowpass', o.lp, 0.707); os.connect(f); node = f; }
    node.connect(g);
    this._to(v, g, o.pan);
    const end = t + o.a + o.t60 + 0.015;
    os.start(t);
    os.stop(end);
    v.n.push(os);
    return end;
  }

  // ----- builders: one voice each, returns when its tail is done -------------------------------

  // Soft wet pat: a damped low thump, a faint smack, a little squish, sometimes a sticky release.
  _vStepCooked(v, t, s) {
    const src = this._s(v, this._b.white, t, 0.12, 1);
    let e = this._nb(v, t + rr(0, 0.004), { src, type: 'lowpass', f: rr(260, 380), q: 0.8, a: rr(0.0015, 0.004), t60: rr(0.035, 0.06), g: 0.9 });
    e = Math.max(e, this._nb(v, t, { src, type: 'bandpass', f: rr(800, 1200), q: 1.3, a: 0.0006, t60: rr(0.01, 0.018), g: 0.35 * (0.6 + 0.4 * s) }));
    e = Math.max(e, this._nb(v, t + 0.002, { buf: 'wet', rate: rr(0.85, 1.2), type: 'bandpass', f: rr(650, 1000), q: 1.2, a: 0.003, t60: rr(0.04, 0.07), g: 0.55 }));
    if (R() < 0.4) e = Math.max(e, this._nb(v, t + rr(0.03, 0.06), { buf: 'crackle', rate: rr(0.6, 0.9), type: 'bandpass', f: rr(1200, 1800), q: 1, a: 0.004, t60: 0.03, g: 0.15 }));
    return e;
  }

  // Tick-tack on dry rods, with the hero's own soft wet contact under it.
  _vStepDry(v, t, s) {
    const tk = this._b.ticks, idx = ri(6, 9);
    let e = this._tk(v, t, tk[idx], rr(0.9, 1.12), 0.5);
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'lowpass', f: rr(250, 350), q: 0.7, a: 0.002, t60: 0.03, g: 0.4 * (0.8 + 0.2 * s) }));
    if (R() < 0.4) e = Math.max(e, this._tk(v, t + rr(0.012, 0.03), tk[clamp(idx + ri(-1, 2), 5, 11)], rr(0.9, 1.15), 0.22));
    return e;
  }

  // Crunch into tiny grains.
  _vStepGrain(v, t, s) {
    let e = this._nb(v, t, { buf: 'crackle', rate: rr(0.8, 1.3), type: 'bandpass', f: rr(1800, 3000), q: 0.7, a: rr(0.003, 0.008), t60: rr(0.06, 0.09) + 0.02 * s, g: 0.9 });
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'bandpass', f: rr(700, 1100), q: 0.8, a: 0.006, t60: 0.06, g: 0.15 }));
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'lowpass', f: 280, q: 0.7, a: 0.002, t60: 0.035, g: 0.35 }));
    return e;
  }

  // A small sticky unstick: a few adhesion ticks, a tiny suction pop, a breath of air.
  _vJump(v, t) {
    let e = this._nb(v, t, { buf: 'crackle', rate: rr(0.8, 1.1), type: 'bandpass', f: rr(1400, 2000), q: 1, a: 0.006, t60: 0.035, g: 0.6 });
    e = Math.max(e, this._nb(v, t, { buf: 'wet', type: 'bandpass', f: rr(800, 1100), q: 1.2, a: 0.004, t60: 0.04, g: 0.35 }));
    e = Math.max(e, this._chirp(v, t + rr(0.008, 0.016), { f: rr(240, 280), f2: rr(560, 680), sw: 0.022, a: 0.0015, t60: 0.03, g: 0.22 }));
    e = Math.max(e, this._nb(v, t, { buf: 'pink', type: 'bandpass', f: 600, q: 0.8, a: 0.02, t60: 0.09, g: 0.25 }));
    return e;
  }

  // Heavy wet flump: thump, smack, a squelch that sinks in pitch, droplets when it's hard.
  _vLandCooked(v, t, i) {
    const b = this._b, src = this._s(v, b.white, t, 0.35, 1);
    let e = this._nb(v, t, { src, type: 'lowpass', f: (170 + 160 * i) * rr(0.9, 1.1), q: 0.9, a: 0.002, t60: 0.07 + 0.13 * i, g: 0.6 + 0.4 * i });
    e = Math.max(e, this._nb(v, t, { src, type: 'bandpass', f: rr(1100, 1500), q: 1.1, a: 0.0005, t60: 0.02 + 0.015 * i, g: 0.15 + 0.25 * i }));
    e = Math.max(e, this._nb(v, t + 0.003, { buf: 'wet', rate: rr(0.8, 1.1), type: 'bandpass', f: 1300, f2: 420, sw: 0.08 + 0.12 * i, q: 2, a: 0.004, t60: 0.1 + 0.22 * i, g: 0.3 + 0.5 * i }));
    if (i > 0.45) {
      for (let k = 0, n = ri(1, 1 + Math.round(3 * i)); k < n; k++) {
        e = Math.max(e, this._tk(v, t + rr(0.03, 0.2), pick(b.drops || []), rr(0.8, 1.25), 0.12 * rr(0.5, 1), rr(-0.4, 0.4)));
      }
    }
    return e;
  }

  // Onto dry rods: a woody tock and a short rattle of rods knocking together.
  _vLandDry(v, t, i) {
    const b = this._b;
    let e = this._nb(v, t, { buf: 'white', type: 'lowpass', f: rr(240, 320), q: 0.8, a: 0.002, t60: 0.05 + 0.04 * i, g: 0.5 });
    e = Math.max(e, this._tk(v, t, b.ticks[ri(2, 5)], rr(0.85, 1.1), 0.8));
    let tt = t;
    for (let k = 0, n = 2 + Math.round(3 * i); k < n; k++) {
      tt += rr(0.008, 0.03);
      e = Math.max(e, this._tk(v, tt, b.ticks[ri(5, 10)], rr(0.9, 1.15), 0.45 * Math.pow(0.75, k) * rr(0.6, 1), rr(-0.3, 0.3)));
    }
    return e;
  }

  // Into grains: a thump, a crunch, grains settling.
  _vLandGrain(v, t, i) {
    let e = this._nb(v, t, { buf: 'white', type: 'lowpass', f: 240, q: 0.8, a: 0.002, t60: 0.06 + 0.08 * i, g: 0.7 });
    e = Math.max(e, this._nb(v, t, { buf: 'crackle', rate: rr(0.9, 1.4), type: 'bandpass', f: rr(2000, 2800), q: 0.7, a: 0.003, t60: 0.12 + 0.15 * i, g: 0.9 }));
    e = Math.max(e, this._nb(v, t + 0.01, { buf: 'pink', type: 'bandpass', f: 1500, q: 0.8, a: 0.02, t60: 0.22 + 0.18 * i, g: 0.2 }));
    return e;
  }

  // Spaghetti thrown at the wall: slap, flatten, spatter, settle.
  _vStick(v, t, i) {
    const b = this._b, src = this._s(v, b.white, t, 0.3, 1);
    let e = this._nb(v, t, { src, type: 'bandpass', f: rr(1300, 1900), q: 0.8, a: 0.0009, t60: rr(0.022, 0.032), g: 0.6 + 0.3 * i });
    e = Math.max(e, this._nb(v, t, { src, type: 'lowpass', f: rr(300, 380), q: 0.8, a: 0.0015, t60: 0.07 + 0.08 * i, g: 0.8 }));
    e = Math.max(e, this._nb(v, t + 0.002, { buf: 'wet', rate: rr(1, 1.25), type: 'bandpass', f: 1600, f2: 480, sw: 0.14, q: 1.8, a: 0.002, t60: 0.15 + 0.1 * i, g: 0.65 }));
    for (let k = 0, n = 1 + Math.round(4 * i * rr(0.6, 1)); k < n; k++) {
      e = Math.max(e, this._tk(v, t + rr(0.02, 0.22), pick(b.drops || []), rr(0.8, 1.25), 0.14 * rr(0.4, 1), rr(-0.5, 0.5)));
    }
    e = Math.max(e, this._nb(v, t + 0.04, { buf: 'crackle', rate: 0.6, type: 'bandpass', f: 1300, q: 1, a: 0.03, t60: 0.25, g: 0.12 }));
    return e;
  }

  // Peeling off a wall: sticky tearing that builds, a suction pop, then air.
  _vLeap(v, t) {
    const b = this._b, tr = t + rr(0.09, 0.12);
    const peel = (buf, f0, f1, q, amt) => {
      const s = this._s(v, buf, t, tr - t + 0.03, rr(0.9, 1.15));
      const f = this._f(v, 'bandpass', f0, q);
      f.frequency.setValueAtTime(f0, t);
      f.frequency.exponentialRampToValueAtTime(f1, tr);
      const gn = this._g(v, 0), p = gn.gain;
      p.setValueAtTime(0, t);
      p.linearRampToValueAtTime(0.2 * amt, t + 0.02);
      p.exponentialRampToValueAtTime(amt, tr);
      p.linearRampToValueAtTime(0, tr + 0.012);
      s.connect(f); f.connect(gn); this._to(v, gn, 0);
    };
    peel(b.crackle, 900, 2800, 1.3, 0.9);
    peel(b.wet || b.pink || b.white, 700, 1600, 1.0, 0.45);
    let e = tr + 0.04;
    e = Math.max(e, this._chirp(v, tr, { f: rr(360, 420), f2: rr(1000, 1200), sw: 0.02, a: 0.001, t60: 0.035, g: 0.3 }));
    e = Math.max(e, this._nb(v, tr, { buf: 'white', type: 'bandpass', f: 1500, q: 2, a: 0.0005, t60: 0.012, g: 0.3 }));
    e = Math.max(e, this._nb(v, tr - 0.02, { buf: 'pink', type: 'bandpass', f: 500, f2: 950, sw: 0.2, q: 0.8, a: 0.06, t60: 0.22, g: 0.3 }));
    return e;
  }

  // Dry rods under load: thin micro-cracks that speed up, and a faint creak as it gets worse.
  _vCreak(v, t, s) {
    const b = this._b, T = 0.16 + 0.14 * s, n = 2 + Math.round(5 * s * rr(0.7, 1));
    let e = t + 0.05;
    for (let k = 0; k < n; k++) {
      const u = Math.pow((k + R() * 0.8) / n, 0.65);
      e = Math.max(e, this._tk(v, t + u * T, b.ticks[ri(7, 10)], rr(0.95, 1.25), 0.55 * rr(0.35, 1), rr(-0.25, 0.25)));
    }
    if (b.creak && s > 0.2) {
      const bb = pick(b.creak), rate = rr(0.8, 1.2), src = this._ctx.createBufferSource();
      src.buffer = bb; src.playbackRate.value = rate;
      const hp = this._f(v, 'highpass', 450, 0.7), gn = this._g(v, 0), p = gn.gain;
      const d = Math.min(bb.duration / rate, 0.18 + 0.25 * s), amp = (s - 0.15) * 0.9;
      p.setValueAtTime(0, t);
      p.linearRampToValueAtTime(amp, t + 0.04);
      p.setValueAtTime(amp, Math.max(t + 0.04, t + d - 0.06));
      p.linearRampToValueAtTime(0, t + d);
      src.connect(hp); hp.connect(gn); this._to(v, gn, rr(-0.15, 0.15));
      src.start(t); src.stop(t + d + 0.01); v.n.push(src);
      e = Math.max(e, t + d + 0.02);
    }
    return e;
  }

  // A dry bundle snapping: 2-4 near-simultaneous cracks inside 40 ms, then splinters.
  _vSnap(v, t, s) {
    const b = this._b, tk = b.ticks;
    const nc = 2 + Math.min(2, Math.floor(rr(0, 1.2 + 1.8 * s)));
    const times = [0];
    for (let k = 1; k < nc; k++) times.push(rr(0.004, 0.04));
    times.sort((x, y) => x - y);
    let e = t + 0.1;
    for (let k = 0; k < nc; k++) {
      const tc = t + times[k], ak = k === 0 ? 1 : rr(0.5, 0.95);
      const src = this._s(v, b.white, tc, 0.06, 1);
      e = Math.max(e, this._nb(v, tc, { src, type: 'highpass', f: rr(1200, 2000), q: 0.7, type2: 'lowpass', ff: rr(7000, 9000), a: 0.0004, t60: rr(0.006, 0.012), g: 0.7 * ak }));
      e = Math.max(e, this._nb(v, tc, { src, type: 'bandpass', f: rr(2200, 3600), q: 1.5, a: 0.0003, t60: rr(0.015, 0.025), g: 0.5 * ak }));
      e = Math.max(e, this._tk(v, tc, tk[clamp(ri(3, 7) - Math.round(2 * s), 0, 11)], rr(0.9, 1.1), 0.75 * ak, rr(-0.15, 0.15)));
      if (k === 0) e = Math.max(e, this._nb(v, tc, { buf: 'white', type: 'bandpass', f: rr(280, 420), q: 1, a: 0.001, t60: 0.05 + 0.05 * s, g: 0.5 * ak }));
    }
    for (let k = 0, m = 4 + Math.round(7 * s); k < m; k++) {
      const dt = 0.02 + Math.min(0.5, -Math.log(1 - R()) * 0.09);
      e = Math.max(e, this._tk(v, t + dt, tk[ri(6, 10)], rr(0.95, 1.3), 0.3 * rr(0.3, 1) * Math.exp(-dt / 0.25), rr(-0.5, 0.5)));
    }
    e = Math.max(e, this._nb(v, t + 0.01, { buf: 'crackle', type: 'bandpass', f: 3000, q: 0.8, a: 0.002, t60: 0.15 + 0.1 * s, g: 0.25 }));
    return e;
  }

  // Cavatappi spring: a squish, a muted plucked twang that bends up as you launch, some air.
  _vSpring(v, t, p) {
    const b = this._b;
    let e = this._nb(v, t, { buf: 'white', type: 'lowpass', f: rr(260, 340), q: 0.8, a: 0.002, t60: 0.06, g: 0.7 });
    e = Math.max(e, this._nb(v, t, { buf: 'wet', rate: rr(0.9, 1.1), type: 'bandpass', f: rr(800, 1000), q: 1.2, a: 0.003, t60: 0.07, g: 0.45 }));
    if (b.twang) {
      const c = this._ctx, t1 = t + 0.015, s = c.createBufferSource(), r0 = rr(0.97, 1.03) * (1 + 0.12 * p);
      s.buffer = b.twang;
      s.playbackRate.setValueAtTime(r0 * 0.93, t1);
      s.playbackRate.exponentialRampToValueAtTime(r0 * semi(1.5 + 2.5 * p), t1 + 0.22);
      const lfo = c.createOscillator();
      lfo.frequency.value = rr(9, 12);
      const lg = this._g(v, 0);
      lg.gain.setValueAtTime(r0 * 0.018, t1);
      lg.gain.linearRampToValueAtTime(0, t1 + 0.4);
      lfo.connect(lg); lg.connect(s.playbackRate);
      const f = this._f(v, 'lowpass', 1500 + 600 * p, 0.7), gn = this._g(v, 0);
      this._env(gn.gain, t1, 0.004, 0.95, 0.55);
      s.connect(f); f.connect(gn); this._to(v, gn, 0);
      const end = t1 + 0.65;
      s.start(t1); lfo.start(t1); s.stop(end); lfo.stop(end);
      v.n.push(s, lfo);
      e = Math.max(e, end);
    }
    e = Math.max(e, this._nb(v, t + 0.03, { buf: 'pink', type: 'bandpass', f: 450, f2: 1300, sw: 0.25, q: 1.1, a: 0.05, t60: 0.25, g: 0.28 * (0.6 + 0.4 * p) }));
    return e;
  }

  // Bumping a lumache snail: a rubbery drop in pitch, the hollow shell, a little squish.
  _vBonk(v, t) {
    const f0 = rr(215, 245);
    let e = this._chirp(v, t, { f: f0, f2: f0 * 0.62, sw: 0.09, a: 0.002, t60: 0.14, g: 0.85 });
    e = Math.max(e, this._chirp(v, t, { type: 'triangle', f: f0 * 2.31, f2: f0 * 1.4, sw: 0.06, a: 0.001, t60: 0.06, g: 0.18, lp: 1400 }));
    e = Math.max(e, this._tk(v, t + 0.002, this._b.ticks[ri(1, 3)], rr(0.9, 1.05), 0.3));
    e = Math.max(e, this._nb(v, t, { buf: 'wet', type: 'bandpass', f: rr(550, 750), q: 1.3, a: 0.003, t60: 0.08, g: 0.4 }));
    return e;
  }

  // Falling into the pastina sea: a soft whump, then grains pouring over you as it muffles.
  _vSink(v, t) {
    const b = this._b;
    let e = this._nb(v, t, { buf: 'white', type: 'lowpass', f: 220, q: 0.8, a: 0.004, t60: 0.22, g: 0.75 });
    e = Math.max(e, this._nb(v, t, { buf: 'crackle', rate: rr(1, 1.25), type: 'bandpass', f: 3200, f2: 1100, sw: 0.8, q: 0.8, type2: 'lowpass', ff: 6500, ff2: 900, a: 0.03, t60: 1, g: 0.9 }));
    e = Math.max(e, this._nb(v, t + 0.01, { buf: 'pink', type: 'bandpass', f: 2200, f2: 650, sw: 0.85, q: 0.9, a: 0.05, t60: 0.9, g: 0.3 }));
    for (let k = 0, n = ri(3, 5); k < n; k++) e = Math.max(e, this._tk(v, t + rr(0, 0.25), b.ticks[ri(7, 10)], rr(1.1, 1.4), 0.1 * rr(0.4, 1), rr(-0.4, 0.4)));
    return e;
  }

  // Re-forming at a checkpoint: strands slurp together into a soft wet plop.
  _vRespawn(v, t) {
    const b = this._b, tp = t + 0.17;
    const s = this._s(v, b.wet || b.pink || b.white, t, 0.25, 0.85);
    const f = this._f(v, 'bandpass', 300, 1.5);
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(900, tp);
    const gn = this._g(v, 0), p = gn.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.02, t + 0.02);
    p.exponentialRampToValueAtTime(0.45, tp);
    p.linearRampToValueAtTime(0, tp + 0.03);
    s.connect(f); f.connect(gn); this._to(v, gn, 0);
    let e = tp + 0.05;
    e = Math.max(e, this._chirp(v, tp, { f: rr(140, 170), f2: rr(380, 440), sw: 0.06, a: 0.003, t60: 0.09, g: 0.8 }));
    e = Math.max(e, this._nb(v, tp, { buf: 'white', type: 'lowpass', f: 380, q: 0.8, a: 0.002, t60: 0.06, g: 0.5 }));
    e = Math.max(e, this._nb(v, tp, { buf: 'white', type: 'bandpass', f: 1100, q: 1.2, a: 0.0006, t60: 0.015, g: 0.25 }));
    e = Math.max(e, this._tk(v, tp + rr(0.06, 0.12), pick(b.drops || []), rr(0.85, 1.15), 0.12, rr(-0.3, 0.3)));
    return e;
  }

  // The goal: a soft plucked IV -> I (plagal) cadence, rolled like a strum, with air under it.
  _vStar(v, t) {
    const pb = this._b.pluck, t2 = t + 0.34;
    let e = t + 0.6;
    const pl = (tt, hz, amp, pan, rel, tau) => {
      if (!pb) return tt;
      const s = this._ctx.createBufferSource();
      s.buffer = pb;
      s.playbackRate.value = hz / 261.63;
      const f = this._f(v, 'lowpass', 2400, 0.6), gn = this._g(v, 0), p = gn.gain;
      p.setValueAtTime(0, tt);
      p.linearRampToValueAtTime(amp, tt + 0.003);
      p.setTargetAtTime(0, rel, tau);
      s.connect(f); f.connect(gn); this._to(v, gn, pan);
      const end = rel + tau * 6;
      s.start(tt); s.stop(end); v.n.push(s);
      return end;
    };
    const r1 = t2 + 0.02;
    e = Math.max(e, pl(t, 220.0, 0.45, -0.15, r1, 0.1), pl(t + 0.035, 261.63, 0.42, 0, r1, 0.1), pl(t + 0.07, 349.23, 0.4, 0.15, r1, 0.1));
    const r2 = t2 + 1.2;
    e = Math.max(e, pl(t2, 130.81, 0.38, 0, r2, 0.35), pl(t2 + 0.01, 196.0, 0.55, -0.15, r2, 0.35), pl(t2 + 0.05, 261.63, 0.55, 0, r2, 0.35), pl(t2 + 0.09, 329.63, 0.6, 0.15, r2, 0.35));
    e = Math.max(e, this._nb(v, t, { buf: 'pink', type: 'bandpass', f: 1500, q: 0.7, a: 0.35, t60: 1.6, g: 0.07 }));
    return e;
  }

  // Noodles springing back after being let go: a few quick wet jiggles that settle.
  _vWobble(v, t, a) {
    const b = this._b, f = rr(9, 13), n = 3 + Math.round(2 * a), dur = n / f;
    const s = this._s(v, b.wet || b.pink || b.white, t, dur + 0.12, rr(0.8, 1.05));
    const bp = this._f(v, 'bandpass', rr(450, 620) + 220 * a, 1.1);
    const g = this._g(v, 0), p = g.gain;
    p.setValueAtTime(0, t);
    for (let k = 0; k < n; k++) {
      const tk = t + k / f, amp = Math.pow(0.6, k) * rr(0.8, 1);
      p.linearRampToValueAtTime(amp, tk + 0.014);
      p.linearRampToValueAtTime(amp * 0.15, tk + 0.75 / f);
    }
    p.linearRampToValueAtTime(0, t + dur + 0.06);
    s.connect(bp); bp.connect(g); this._to(v, g, 0);
    let e = t + dur + 0.08;
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'lowpass', f: rr(200, 280), q: 0.8, a: 0.005, t60: 0.09, g: 0.3 }));
    for (let k = 0; k < 2; k++) e = Math.max(e, this._chirp(v, t + k / f + 0.004, { f: rr(170, 230), f2: rr(260, 340), sw: 0.04, a: 0.004, t60: 0.07, g: 0.22 * Math.pow(0.55, k) }));
    return e;
  }

  // A stretched cooked noodle letting go: a fast wet "thwip" rising in pitch, then the end
  // whips back with a small wet slap. Soft attacks throughout: wet, never a dry crack.
  _vStrandSnap(v, t) {
    const b = this._b, tw = t + rr(0.075, 0.11);
    const s = this._s(v, b.wet || b.pink || b.white, t, 0.12, rr(1, 1.3));
    const f = this._f(v, 'bandpass', 500, 1.6);
    f.frequency.setValueAtTime(rr(450, 600), t);
    f.frequency.exponentialRampToValueAtTime(rr(2000, 2800), t + 0.05);
    const g = this._g(v, 0), p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.7, t + 0.012);
    p.exponentialRampToValueAtTime(0.25, t + 0.045);
    p.linearRampToValueAtTime(0, t + 0.08);
    s.connect(f); f.connect(g); this._to(v, g, 0);
    let e = this._nb(v, t, { buf: 'pink', type: 'bandpass', f: 700, f2: 2400, sw: 0.06, q: 1.2, a: 0.01, t60: 0.07, g: 0.35 });
    e = Math.max(e, this._chirp(v, t + 0.03, { f: rr(500, 650), f2: rr(1300, 1700), sw: 0.025, a: 0.002, t60: 0.035, g: 0.22 }));
    e = Math.max(e, this._nb(v, tw, { buf: 'white', type: 'lowpass', f: rr(260, 360), q: 0.8, a: 0.0015, t60: 0.05, g: 0.6 }));
    e = Math.max(e, this._nb(v, tw, { buf: 'white', type: 'bandpass', f: rr(1000, 1400), q: 1.1, a: 0.0008, t60: 0.02, g: 0.3 }));
    e = Math.max(e, this._nb(v, tw + 0.002, { buf: 'wet', rate: rr(0.9, 1.2), type: 'bandpass', f: 1100, f2: 500, sw: 0.08, q: 1.5, a: 0.003, t60: 0.1, g: 0.45 }));
    for (let k = 0, n = ri(1, 3); k < n; k++) e = Math.max(e, this._tk(v, tw + rr(0.02, 0.15), pick(b.drops || []), rr(0.85, 1.2), 0.1 * rr(0.5, 1), rr(-0.4, 0.4)));
    return Math.max(e, t + 0.09);
  }

  // A dry tortellino cracking apart when stomped: a crisp double crack over a hollow, low body,
  // a few chunks knocking, then a short rattle of pieces. Bigger and hollower than snap().
  _vShatter(v, t, s) {
    const b = this._b, tk = b.ticks, rb = b.roll || tk;
    const times = [0, rr(0.004, 0.016)];
    if (R() < 0.3 + 0.4 * s) times.push(rr(0.012, 0.03));
    let e = t + 0.1;
    for (let k = 0; k < times.length; k++) {
      const tc = t + times[k], ak = k === 0 ? 1 : rr(0.45, 0.8);
      const src = this._s(v, b.white, tc, 0.06, 1);
      e = Math.max(e, this._nb(v, tc, { src, type: 'highpass', f: rr(900, 1500), q: 0.7, type2: 'lowpass', ff: rr(6000, 8000), a: 0.0004, t60: rr(0.008, 0.014), g: 0.6 * ak }));
      e = Math.max(e, this._nb(v, tc, { src, type: 'bandpass', f: rr(1600, 2600), q: 1.3, a: 0.0004, t60: rr(0.02, 0.03), g: 0.4 * ak }));
    }
    // the hollow body: two low woody tocks and the cavity's short "whomp"
    e = Math.max(e, this._tk(v, t + 0.001, tk[ri(0, 1)], rr(0.72, 0.85) - 0.08 * s, 0.9, rr(-0.1, 0.1)));
    e = Math.max(e, this._tk(v, t + rr(0.004, 0.01), tk[ri(1, 3)], rr(0.8, 0.95), 0.5, rr(-0.2, 0.2)));
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'bandpass', f: rr(300, 420) * (1.1 - 0.2 * s), q: 5, a: 0.001, t60: 0.07 + 0.04 * s, g: 3 }));
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'bandpass', f: rr(200, 300), q: 1, a: 0.0015, t60: 0.09 + 0.06 * s, g: 0.45 }));
    // chunks knocking, then a brief rattle of pieces on the lasagna
    for (let k = 0, n = 3 + Math.round(2 * s); k < n; k++) {
      e = Math.max(e, this._tk(v, t + rr(0.03, 0.2), rb[ri(0, 6)], rr(0.85, 1.05), 0.45 * rr(0.5, 1), rr(-0.5, 0.5)));
    }
    for (let k = 0, n = 6 + Math.round(6 * s); k < n; k++) {
      const dt = 0.12 + Math.min(0.42, -Math.log(1 - R()) * 0.12);
      e = Math.max(e, this._tk(v, t + dt, tk[ri(5, 10)], rr(0.95, 1.25), 0.28 * rr(0.3, 1) * Math.exp(-(dt - 0.12) / 0.2), rr(-0.6, 0.6)));
    }
    e = Math.max(e, this._nb(v, t + 0.01, { buf: 'crackle', type: 'bandpass', f: 2600, q: 0.8, a: 0.002, t60: 0.2 + 0.1 * s, g: 0.22 }));
    return e;
  }

  // Jumping into a tagliatelle nest: a soft papery rustle of dry ribbons, then a warm low whoosh.
  _vEnter(v, t) {
    const b = this._b;
    let e = t + 0.62;
    for (const pan of [-0.35, 0.35]) {
      e = Math.max(e, this._nb(v, t + rr(0, 0.02), { buf: 'crackle', rate: rr(0.5, 0.8), type: 'bandpass', f: rr(2200, 3200), q: 0.7, type2: 'lowpass', ff: 5000, a: rr(0.02, 0.04), t60: rr(0.22, 0.3), g: 0.4, pan }));
    }
    for (let k = 0, n = ri(3, 5); k < n; k++) e = Math.max(e, this._tk(v, t + rr(0, 0.18), b.ticks[ri(5, 9)], rr(0.8, 1), 0.12 * rr(0.5, 1), rr(-0.5, 0.5)));
    const s = this._s(v, b.pink || b.white, t, 0.7, 1);
    const lp = this._f(v, 'lowpass', 180, 0.9), hp = this._f(v, 'highpass', 60, 0.7);
    lp.frequency.setValueAtTime(180, t);
    lp.frequency.exponentialRampToValueAtTime(rr(650, 800), t + 0.24);
    lp.frequency.exponentialRampToValueAtTime(220, t + 0.6);
    const g = this._g(v, 0), p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.05, t + 0.05);
    p.linearRampToValueAtTime(0.9, t + 0.24);
    p.exponentialRampToValueAtTime(0.08, t + 0.55);
    p.linearRampToValueAtTime(0, t + 0.62);
    s.connect(lp); lp.connect(hp); hp.connect(g); this._to(v, g, 0);
    e = Math.max(e, this._nb(v, t + 0.03, { buf: 'white', type: 'lowpass', f: 200, q: 0.7, a: 0.01, t60: 0.15, g: 0.35 }));
    return e;
  }

  // Wet pastina sand: a soft thump, a damp crunch, a little squish.
  _vStepSand(v, t, s) {
    let e = this._nb(v, t, { buf: 'white', type: 'lowpass', f: rr(220, 320), q: 0.8, a: rr(0.003, 0.006), t60: rr(0.05, 0.08), g: 0.8 });
    e = Math.max(e, this._nb(v, t + rr(0.004, 0.012), { buf: 'crackle', rate: rr(0.45, 0.7), type: 'bandpass', f: rr(1200, 2000), q: 0.8, type2: 'lowpass', ff: 3200, a: rr(0.008, 0.015), t60: rr(0.06, 0.09), g: 0.55 + 0.25 * s }));
    e = Math.max(e, this._nb(v, t + 0.006, { buf: 'wet', rate: rr(0.75, 1), type: 'bandpass', f: rr(500, 800), q: 1.1, a: 0.006, t60: rr(0.06, 0.1), g: 0.45 }));
    return e;
  }

  // Landing on wet sand: a heavier thump, the crunch, a squelch that sinks, grains settling.
  _vLandSand(v, t, i) {
    let e = this._nb(v, t, { buf: 'white', type: 'lowpass', f: 180 + 120 * i, q: 0.8, a: 0.003, t60: 0.09 + 0.12 * i, g: 0.9 });
    e = Math.max(e, this._nb(v, t + 0.006, { buf: 'crackle', rate: rr(0.5, 0.8), type: 'bandpass', f: rr(1300, 2100), q: 0.8, type2: 'lowpass', ff: 3500, a: 0.008, t60: 0.12 + 0.14 * i, g: 0.7 }));
    e = Math.max(e, this._nb(v, t + 0.01, { buf: 'wet', rate: rr(0.7, 0.95), type: 'bandpass', f: 900, f2: 450, sw: 0.12, q: 1.3, a: 0.006, t60: 0.12 + 0.2 * i, g: 0.3 + 0.4 * i }));
    e = Math.max(e, this._nb(v, t + 0.03, { buf: 'pink', type: 'bandpass', f: 1100, q: 0.8, a: 0.03, t60: 0.2 + 0.15 * i, g: 0.12 }));
    return e;
  }

  // Hitting the water: a slap on the surface, the cavity closing into a plop, churning bubbles,
  // then spray falling back. Bigger is heavier, deeper and longer.
  _vSplash(v, t, s) {
    const b = this._b, tp = t + rr(0.025, 0.045) + 0.03 * s, f0 = rr(170, 230) * (1.6 - 0.75 * s);
    let e = this._nb(v, t, { buf: 'white', type: 'bandpass', f: rr(900, 1800), q: 0.6, a: 0.0008, t60: 0.04 + 0.04 * s, g: 0.7 + 0.4 * s });
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'bandpass', f: rr(2500, 4500), q: 0.6, type2: 'lowpass', ff: 8000, a: 0.002, t60: 0.12 + 0.18 * s, g: 0.1 + 0.35 * s }));
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'lowpass', f: 160 + 80 * (1 - s), q: 0.8, a: 0.003, t60: 0.1 + 0.25 * s, g: 0.2 + 0.5 * s }));
    e = Math.max(e, this._chirp(v, tp, { f: f0, f2: f0 * rr(1.5, 1.9), sw: 0.07 + 0.05 * s, a: 0.003, t60: 0.12 + 0.12 * s, g: 0.4 }));
    e = Math.max(e, this._chirp(v, tp + rr(0.03, 0.07), { f: f0 * rr(1.7, 2.3), f2: f0 * rr(3, 3.8), sw: 0.04, a: 0.002, t60: 0.06, g: 0.18 }));
    e = Math.max(e, this._nb(v, t + 0.01, { buf: 'wet', rate: rr(0.7, 0.95), type: 'bandpass', f: 1300, f2: 450, sw: 0.25 + 0.2 * s, q: 1.1, a: 0.008, t60: 0.3 + 0.35 * s, g: 0.5 }));
    const sp0 = t + 0.06 + 0.05 * s, spDur = 0.35 + 0.45 * s;
    e = Math.max(e, this._nb(v, sp0, { buf: 'white', type: 'bandpass', f: rr(2600, 3800), q: 0.7, type2: 'lowpass', ff: 7000, a: 0.04, t60: spDur, g: 0.22 + 0.2 * s, pan: rr(-0.3, 0.3) }));
    for (let k = 0, n = 4 + Math.round(10 * s); k < n; k++) {
      const dt = sp0 + Math.pow(R(), 1.4) * spDur;
      e = Math.max(e, this._tk(v, dt, pick(b.drops || []), rr(0.75, 1.3), 0.28 * rr(0.4, 1) * Math.exp(-(dt - sp0) / (0.5 * spDur + 0.05)), rr(-0.6, 0.6)));
    }
    return e;
  }

  // Hopping out at the surface: a wet suck that pops free, a slosh, a little runoff, then drips.
  _vEmerge(v, t, s) {
    const b = this._b, tr = t + rr(0.07, 0.1);
    const src = this._s(v, b.wet || b.pink || b.white, t, tr - t + 0.03, rr(0.8, 1.05));
    const f = this._f(v, 'bandpass', 450, 1.4);
    f.frequency.setValueAtTime(rr(380, 480), t);
    f.frequency.exponentialRampToValueAtTime(rr(1100, 1500), tr);
    const g = this._g(v, 0), p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.15, t + 0.02);
    p.exponentialRampToValueAtTime(0.7, tr);
    p.linearRampToValueAtTime(0, tr + 0.012);
    src.connect(f); f.connect(g); this._to(v, g, 0);
    let e = tr + 0.03;
    e = Math.max(e, this._chirp(v, tr, { f: rr(280, 340), f2: rr(800, 950), sw: 0.025, a: 0.0015, t60: 0.04, g: 0.35 }));
    e = Math.max(e, this._nb(v, tr, { buf: 'pink', type: 'bandpass', f: rr(600, 900), f2: rr(1200, 1600), sw: 0.12, q: 0.9, a: 0.02, t60: 0.18 + 0.1 * s, g: 0.35 }));
    e = Math.max(e, this._nb(v, tr + 0.04, { buf: 'wet', rate: rr(0.9, 1.2), type: 'bandpass', f: 1400, q: 1, a: 0.01, t60: 0.2, g: 0.15 }));
    for (let k = 0, n = 4 + Math.round(6 * s); k < n; k++) {
      const dt = tr + 0.08 + Math.pow(R(), 1.6) * (0.45 + 0.3 * s);
      e = Math.max(e, this._tk(v, dt, pick(b.drops || []), rr(0.7, 1.2), 0.2 * rr(0.35, 1) * Math.exp(-(dt - tr) / 0.45), rr(-0.5, 0.5)));
    }
    return e;
  }

  // One swim stroke under water: a soft, muffled whoosh with no hard attack, and a short burble.
  _vPaddle(v, t, s) {
    const b = this._b, up = rr(0.06, 0.1), dur = rr(0.22, 0.32);
    const src = this._s(v, b.pink || b.white, t, dur + 0.05, rr(0.85, 1.1));
    const lp = this._f(v, 'lowpass', 220, 0.8);
    lp.frequency.setValueAtTime(rr(200, 260), t);
    lp.frequency.exponentialRampToValueAtTime(rr(650, 850) + 200 * s, t + up);
    lp.frequency.exponentialRampToValueAtTime(rr(220, 300), t + dur);
    const g = this._g(v, 0), p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.8, t + up);
    p.exponentialRampToValueAtTime(0.03, t + dur);
    p.linearRampToValueAtTime(0, t + dur + 0.02);
    src.connect(lp); lp.connect(g); this._to(v, g, 0);
    let e = t + dur + 0.03;
    const bb = b.blip || b.bub;
    if (bb) {
      for (let k = 0, n = ri(2, 4) + Math.round(2 * s); k < n; k++) {
        e = Math.max(e, this._tk(v, t + up * 0.6 + rr(0, 0.16), bb[ri(Math.floor(bb.length * 0.3), bb.length - 1)], rr(0.85, 1.15), 0.18 * rr(0.4, 1), rr(-0.3, 0.3)));
      }
    }
    return e;
  }

  // The giant shell breathing out: a low rumble swelling under a gush of many rising bubbles.
  _vBurst(v, t, s) {
    const b = this._b, dur = 1.2 + 0.3 * s;
    const r = this._s(v, b.pink || b.white, t, dur + 0.1, rr(0.5, 0.6));
    const rlp = this._f(v, 'lowpass', 130, 0.9), rg = this._g(v, 0), p = rg.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.9, t + 0.15);
    p.setTargetAtTime(0.45, t + 0.2, 0.4);
    p.linearRampToValueAtTime(0, t + dur + 0.08);
    r.connect(rlp); rlp.connect(rg); this._to(v, rg, 0);
    let e = this._nb(v, t, { buf: 'white', type: 'bandpass', f: rr(75, 100), q: 2, a: 0.03, t60: 0.5, g: 2.5 });
    const gs = this._s(v, b.wet || b.pink || b.white, t, dur + 0.1, rr(0.55, 0.7));
    const gbp = this._f(v, 'bandpass', 350, 0.9);
    gbp.frequency.setValueAtTime(rr(300, 380), t);
    gbp.frequency.exponentialRampToValueAtTime(rr(800, 1000), t + dur);
    const gg = this._g(v, 0), q = gg.gain;
    q.setValueAtTime(0, t);
    q.linearRampToValueAtTime(0.85, t + 0.12);
    q.setTargetAtTime(0.5, t + 0.25, 0.5);
    q.linearRampToValueAtTime(0, t + dur + 0.05);
    gs.connect(gbp); gbp.connect(gg); this._to(v, gg, 0);
    const big = b.bub || b.blip, small = b.blip || b.bub;
    if (big) {
      for (let k = 0, n = 26 + Math.round(22 * s); k < n; k++) {
        const u = Math.pow(R(), 1.6), tt = t + 0.03 + u * (dur - 0.1);
        e = Math.max(e, this._tk(v, tt, pick(R() < 0.6 - 0.4 * u ? big : small), rr(0.8, 1.2), 0.32 * rr(0.35, 1) * (1 - 0.6 * u), rr(-0.6, 0.6)));
      }
    }
    return Math.max(e, t + dur + 0.1);
  }

  // The squid contracting to swim: a soft, dark jet "whoomp".
  _vSquidPulse(v, t) {
    const b = this._b;
    const src = this._s(v, b.pink || b.white, t, 0.5, rr(0.8, 1));
    const lp = this._f(v, 'lowpass', 160, 0.9);
    lp.frequency.setValueAtTime(rr(140, 180), t);
    lp.frequency.exponentialRampToValueAtTime(rr(600, 750), t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(rr(170, 220), t + 0.4);
    const g = this._g(v, 0), p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.9, t + 0.05);
    p.exponentialRampToValueAtTime(0.03, t + 0.42);
    p.linearRampToValueAtTime(0, t + 0.45);
    src.connect(lp); lp.connect(g); this._to(v, g, 0);
    let e = this._chirp(v, t + 0.01, { f: rr(110, 130), f2: rr(70, 80), sw: 0.15, a: 0.012, t60: 0.22, g: 0.35 });
    e = Math.max(e, this._nb(v, t + 0.03, { buf: 'wet', rate: rr(0.6, 0.8), type: 'bandpass', f: rr(380, 520), q: 1, a: 0.04, t60: 0.25, g: 0.18 }));
    return Math.max(e, t + 0.46);
  }

  // Its tentacles slapping you away: a wet slap with a rubbery wobble in it, a little comic.
  _vSquidBonk(v, t) {
    const b = this._b, f0 = rr(240, 280);
    let e = this._nb(v, t, { buf: 'white', type: 'bandpass', f: rr(800, 1200), q: 0.9, a: 0.001, t60: rr(0.04, 0.06), g: 0.9 });
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'lowpass', f: rr(220, 300), q: 0.8, a: 0.002, t60: 0.09, g: 0.7 }));
    e = Math.max(e, this._chirp(v, t + 0.006, { f: f0, f2: f0 * 0.62, sw: 0.12, a: 0.003, t60: 0.18, g: 0.45 }));
    e = Math.max(e, this._chirp(v, t + 0.006, { type: 'triangle', f: f0 * 2.1, f2: f0 * 1.3, sw: 0.08, a: 0.002, t60: 0.08, g: 0.1, lp: 1200 }));
    e = Math.max(e, this._nb(v, t + 0.004, { buf: 'wet', rate: rr(0.9, 1.15), type: 'bandpass', f: 1100, f2: 450, sw: 0.12, q: 1.4, a: 0.003, t60: 0.14, g: 0.45 }));
    const bb = b.blip || b.bub;
    if (bb) for (let k = 0, n = ri(2, 4); k < n; k++) e = Math.max(e, this._tk(v, t + rr(0.03, 0.2), pick(bb), rr(0.85, 1.15), 0.12 * rr(0.4, 1), rr(-0.4, 0.4)));
    return e;
  }

  // An ink puff: a dark, muffled "pfff" with a little murky fizz in it.
  _vSquidInk(v, t) {
    const b = this._b;
    const src = this._s(v, b.pink || b.white, t, 0.75, rr(0.8, 1));
    const lp = this._f(v, 'lowpass', 600, 0.7);
    lp.frequency.setValueAtTime(rr(900, 1100), t);
    lp.frequency.exponentialRampToValueAtTime(rr(280, 350), t + 0.6);
    const g = this._g(v, 0), p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.85, t + 0.03);
    p.exponentialRampToValueAtTime(0.03, t + 0.65);
    p.linearRampToValueAtTime(0, t + 0.7);
    src.connect(lp); lp.connect(g); this._to(v, g, 0);
    let e = this._nb(v, t + 0.02, { buf: 'wet', rate: rr(0.5, 0.7), type: 'bandpass', f: rr(300, 420), q: 1, a: 0.05, t60: 0.5, g: 0.25 });
    e = Math.max(e, this._nb(v, t, { buf: 'white', type: 'lowpass', f: 140, q: 0.7, a: 0.01, t60: 0.15, g: 0.25 }));
    return Math.max(e, t + 0.72);
  }

  // Walking in orzo snow: a soft packing crunch that squeaks a little in the cold, a soft low
  // press under it, loose grains shifting after.
  _vStepSnow(v, t, s) {
    const a = rr(0.012, 0.024);
    let e = this._nb(v, t, { buf: 'white', type: 'lowpass', f: rr(170, 240), q: 0.7, a: rr(0.006, 0.012), t60: rr(0.06, 0.09), g: 0.7 });
    e = Math.max(e, this._nb(v, t, { buf: 'pink', type: 'bandpass', f: rr(500, 800), q: 0.8, a, t60: rr(0.07, 0.1), g: 0.45 }));
    e = Math.max(e, this._nb(v, t, { buf: 'crackle', rate: rr(0.5, 0.7), type: 'bandpass', f: rr(900, 1400), q: 0.6, type2: 'lowpass', ff: 4200, a, t60: rr(0.08, 0.11) + 0.03 * s, g: 0.9 }));
    e = Math.max(e, this._nb(v, t + rr(0.006, 0.016), { buf: 'squeal', rate: rr(1.3, 1.6), type: 'bandpass', f: rr(1600, 2200), q: 2, a: rr(0.015, 0.03), t60: rr(0.05, 0.08), g: (0.3 + 0.2 * s) * rr(0.6, 1) }));
    e = Math.max(e, this._nb(v, t + rr(0.03, 0.05), { buf: 'crackle', rate: rr(1, 1.4), type: 'bandpass', f: rr(2600, 3600), q: 0.8, a: 0.015, t60: rr(0.08, 0.13), g: 0.16 }));
    return e;
  }

  // Into a drift: a muffled whumpf, a puff of air pushed out, a packed crunch, grains settling.
  _vLandSnow(v, t, i) {
    let e = this._nb(v, t, { buf: 'white', type: 'lowpass', f: (130 + 90 * i) * rr(0.9, 1.1), q: 0.8, a: 0.008 + 0.006 * i, t60: 0.14 + 0.16 * i, g: 1 });
    e = Math.max(e, this._nb(v, t + 0.004, { buf: 'pink', type: 'bandpass', f: rr(380, 520), q: 0.9, a: 0.015, t60: 0.12 + 0.12 * i, g: 0.35 + 0.15 * i }));
    e = Math.max(e, this._nb(v, t + 0.006, { buf: 'crackle', rate: rr(0.45, 0.6), type: 'bandpass', f: rr(900, 1400), q: 0.7, type2: 'lowpass', ff: 3000, a: 0.02, t60: 0.12 + 0.12 * i, g: 0.55 }));
    e = Math.max(e, this._nb(v, t + 0.05 + 0.03 * i, { buf: 'crackle', rate: rr(0.9, 1.3), type: 'bandpass', f: rr(2200, 3200), q: 0.8, a: 0.04, t60: 0.18 + 0.2 * i, g: 0.12 + 0.08 * i }));
    return e;
  }

  // On the wet lasagna run: a flat wet slap and, as the strands slip, a little rubbery squeak.
  _vStepSlick(v, t, s) {
    const src = this._s(v, this._b.white, t, 0.1, 1);
    let e = this._nb(v, t, { src, type: 'bandpass', f: rr(1300, 1900), q: 0.8, a: 0.0007, t60: rr(0.018, 0.028), g: 0.5 + 0.2 * s });
    e = Math.max(e, this._nb(v, t, { src, type: 'lowpass', f: rr(280, 360), q: 0.8, a: 0.0015, t60: rr(0.04, 0.06), g: 0.7 }));
    e = Math.max(e, this._nb(v, t + 0.002, { buf: 'wet', rate: rr(0.9, 1.2), type: 'bandpass', f: rr(800, 1200), q: 1.2, a: 0.003, t60: rr(0.04, 0.06), g: 0.45 }));
    if (R() < 0.45 + 0.4 * s) e = Math.max(e, this._nb(v, t + rr(0.01, 0.03), { buf: 'squeal', rate: rr(0.9, 1.15), type: 'bandpass', f: rr(1000, 1500), q: 1.5, a: rr(0.008, 0.015), t60: rr(0.04, 0.07), g: 0.3 * rr(0.6, 1) }));
    return e;
  }

  // Onto the wet run: a flat slap, a squelch that sinks, a rubbery squeak as it skids.
  _vLandSlick(v, t, i) {
    const b = this._b, src = this._s(v, b.white, t, 0.3, 1);
    let e = this._nb(v, t, { src, type: 'bandpass', f: rr(1200, 1800), q: 0.7, a: 0.0008, t60: 0.03 + 0.02 * i, g: 0.6 + 0.3 * i });
    e = Math.max(e, this._nb(v, t, { src, type: 'lowpass', f: 200 + 140 * i, q: 0.8, a: 0.002, t60: 0.07 + 0.1 * i, g: 0.8 }));
    e = Math.max(e, this._nb(v, t + 0.003, { buf: 'wet', rate: rr(0.9, 1.15), type: 'bandpass', f: 1400, f2: 500, sw: 0.1 + 0.08 * i, q: 1.6, a: 0.003, t60: 0.1 + 0.15 * i, g: 0.35 + 0.35 * i }));
    e = Math.max(e, this._nb(v, t + rr(0.02, 0.04), { buf: 'squeal', rate: rr(0.85, 1.1), type: 'bandpass', f: rr(1000, 1400), q: 1.4, a: 0.01, t60: 0.08 + 0.08 * i, g: 0.25 + 0.15 * i }));
    if (i > 0.45) {
      for (let k = 0, n = ri(1, 1 + Math.round(3 * i)); k < n; k++) {
        e = Math.max(e, this._tk(v, t + rr(0.03, 0.18), pick(b.drops || []), rr(0.8, 1.25), 0.1 * rr(0.5, 1), rr(-0.4, 0.4)));
      }
    }
    return e;
  }

  // Off the kicker: the strands tear free of the wet run, then a short, airy whoosh that swells
  // and falls away. Faster is brighter and longer.
  _vLaunch(v, t, s) {
    const b = this._b, up = 0.07 + 0.05 * s, dur = 0.3 + 0.2 * s;
    let e = this._nb(v, t, { buf: 'crackle', rate: rr(0.7, 0.9), type: 'bandpass', f: rr(1300, 1800), q: 1, a: 0.004, t60: 0.04, g: 0.35 });
    e = Math.max(e, this._nb(v, t, { buf: 'wet', rate: rr(0.9, 1.1), type: 'bandpass', f: rr(900, 1200), q: 1.2, a: 0.004, t60: 0.05, g: 0.3 }));
    const src = this._s(v, b.wind || b.pink || b.white, t, up + dur + 0.05, rr(0.9, 1.1));
    const bp = this._f(v, 'bandpass', 500, 0.9);
    bp.frequency.setValueAtTime(rr(420, 550), t);
    bp.frequency.exponentialRampToValueAtTime(rr(900, 1150) + 450 * s, t + up);
    bp.frequency.exponentialRampToValueAtTime(rr(450, 600), t + up + dur);
    const g = this._g(v, 0), p = g.gain;
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(0.9, t + up);
    p.exponentialRampToValueAtTime(0.01, t + up + dur);
    p.linearRampToValueAtTime(0, t + up + dur + 0.03);
    src.connect(bp); bp.connect(g); this._to(v, g, 0);
    e = Math.max(e, this._nb(v, t + 0.02, { buf: 'white', type: 'bandpass', f: rr(2200, 3000), q: 0.8, a: up * 0.8, t60: dur * 0.8, g: 0.14 + 0.1 * s }));
    return Math.max(e, t + up + dur + 0.04);
  }

  // A clump of orzo snow sliding off a pine tier: a short granular slide, a beat of falling, a
  // soft whumpf into the snow below, a scatter of grains.
  _vThump(v, t, s) {
    const b = this._b, sl = 0.1 + 0.08 * s, tf = t + sl + rr(0.12, 0.22) + 0.06 * s;
    let e = this._nb(v, t, { buf: 'crackle', rate: rr(0.5, 0.65), type: 'bandpass', f: rr(1300, 2000), q: 0.8, type2: 'lowpass', ff: 3500, a: sl * 0.6, t60: sl + 0.06, g: 0.3 });
    e = Math.max(e, this._nb(v, t, { buf: 'pink', type: 'bandpass', f: rr(1500, 2300), q: 0.8, a: sl * 0.7, t60: sl, g: 0.12 }));
    e = Math.max(e, this._nb(v, tf, { buf: 'white', type: 'lowpass', f: rr(140, 200) - 30 * s, q: 0.8, a: 0.01, t60: 0.15 + 0.15 * s, g: 1 }));
    e = Math.max(e, this._nb(v, tf + 0.003, { buf: 'pink', type: 'bandpass', f: rr(400, 600), q: 0.9, a: 0.014, t60: 0.12 + 0.1 * s, g: 0.35 }));
    e = Math.max(e, this._nb(v, tf + 0.005, { buf: 'crackle', rate: rr(0.45, 0.6), type: 'bandpass', f: rr(900, 1400), q: 0.7, type2: 'lowpass', ff: 3000, a: 0.015, t60: 0.1 + 0.12 * s, g: 0.5 }));
    const tk = b.ticks;
    if (tk) for (let k = 0, n = 2 + Math.round(4 * s); k < n; k++) e = Math.max(e, this._tk(v, tf + rr(0.02, 0.25), tk[ri(8, 11)], rr(1.1, 1.5), 0.05 * rr(0.4, 1), rr(-0.4, 0.4)));
    return e;
  }

  // ----- the API -------------------------------------------------------------------------------

  step(speed01, surface) {
    try { const s = c01(speed01, 0.6); this._ev('step_' + surf(surface), s, 'step', 0.055, 0, dB(-7 * (1 - s))); } catch (e) {}
  }

  land(impact01, surface) {
    try { const i = c01(impact01, 0.5); this._ev('land_' + surf(surface), i, 'land', 0.07, 2, dB(-12 * (1 - i))); } catch (e) {}
  }

  jump() {
    try { this._ev('jump', 1, 'jump', 0.08, 0, 1); } catch (e) {}
  }

  stick(impact01) {
    try { const i = c01(impact01, 0.6); this._ev('stick', i, 'stick', 0.08, 2, dB(-9 * (1 - i))); } catch (e) {}
  }

  leap() {
    try { this._ev('leap', 1, 'leap', 0.1, 1, 1); } catch (e) {}
  }

  creak(stage01) {
    try { const s = c01(stage01, 0.5); this._ev('creak', s, 'creak', 0.06, 1, dB(-12 * (1 - s))); } catch (e) {}
  }

  snap(size01) {
    try { const s = c01(size01, 0.6); this._ev('snap', s, 'snap', 0.04, 3, dB(-7 * (1 - s))); } catch (e) {}
  }

  spring(power01) {
    try { const p = c01(power01, 0.6); this._ev('spring', p, 'spring', 0.1, 2, dB(-6 * (1 - p))); } catch (e) {}
  }

  bonk() {
    try { this._ev('bonk', 1, 'bonk', 0.12, 2, 1); } catch (e) {}
  }

  sink() {
    try { this._ev('sink', 1, 'sink', 0.3, 2, 1); } catch (e) {}
  }

  respawn() {
    try { this._ev('respawn', 1, 'respawn', 0.2, 2, 1); } catch (e) {}
  }

  // With music playing, the star is the music's own cadence (music('won')); without, this sound.
  star() {
    try {
      if (this._mOn && this._mRun && this._mCur !== 'won') { this.music('won'); return; }
      if (this._mCur === 'won' && this._now() - this._mWonT < 2) return;
      this._ev('star', 1, 'star', 1.2, 3, 1);
    } catch (e) {}
  }

  // A stretched cooked noodle snapping on the opening screen.
  strandSnap() {
    try { this._ev('strandSnap', 1, 'strandSnap', 0.06, 2, 1); } catch (e) {}
  }

  // Noodles springing back after they're let go. Quiet; 0 makes no sound.
  wobble(amount01) {
    try {
      const a = c01(amount01, 0.6);
      if (a >= 0.02) this._ev('wobble', a, 'wobble', 0.12, 1, dB(-10 * (1 - a)));
    } catch (e) {}
  }

  // A dry tortellino cracking into pieces when stomped.
  shatter(size01) {
    try { const s = c01(size01, 0.7); this._ev('shatter', s, 'shatter', 0.05, 3, dB(-7 * (1 - s))); } catch (e) {}
  }

  // Jumping into a tagliatelle nest to start a stage.
  enter() {
    try { this._ev('enter', 1, 'enter', 0.4, 3, 1); } catch (e) {}
  }

  // One contact tick of a dry tortellino rolling over dry lasagna; intensity already includes
  // distance. Variant, pitch, level, filter and a few ms of timing all vary, so a stream of
  // them (4-8 a second per tortellino) reads as rolling rather than as a machine.
  rollTick(intensity01, pitch01) {
    try {
      const i = c01(intensity01, 0.5);
      if (i < 0.01) return;
      const t0 = this._gate('roll', 0.002);
      if (t0 < 0 || prune(this._rollEnds, t0) >= 12) return;
      const b = this._b, rb = b.roll || b.ticks, rn = b.roll ? b.rollN : b.tickN;
      if (!rb || !rn) return;
      const p = c01(pitch01, 0.5), t = t0 + R() * 0.004, last = rb.length - 1;
      let k = clamp(Math.round(p * last + rr(-1.5, 1.5)), 0, last);
      if (k === this._lastRoll) k = clamp(k + (R() < 0.5 ? -1 : 1), 0, last);
      this._lastRoll = k;
      const rate = rr(0.92, 1.08), g = dB(LV.roll) * i * dB(rr(-2.5, 2)) * rn[k];
      if (this._pb(rb[k], 0, rb[k].duration, t, g, rate, rr(-0.3, 0.3), rr(5000, 10000), 0)) this._rollEnds.push(t + rb[k].duration / rate);
    } catch (e) {}
  }

  // ----- the bay -----

  // Hitting the water from the air; size from fall speed.
  splash(size01) {
    try { const s = c01(size01, 0.6); this._ev('splash', s, 'splash', 0.08, 2, dB(-12 * (1 - s))); } catch (e) {}
  }

  // Hopping out of the water at the surface.
  emerge(size01) {
    try { const s = c01(size01, 0.6); this._ev('emerge', s, 'emerge', 0.12, 2, dB(-8 * (1 - s))); } catch (e) {}
  }

  // One swim stroke under water. Fine at ~3.5 a second for as long as the player swims.
  paddle(strength01) {
    try {
      const s = c01(strength01, 0.7);
      if (s >= 0.02) this._ev('paddle', s, 'paddle', 0.12, 0, dB(-8 * (1 - s)));
    } catch (e) {}
  }

  // One small bubble: size01 1 is big and low, 0 small and high; pan01 0 left .. 1 right.
  // Polite by design: quiet, at most 8 at once.
  bubble(size01, pan01) {
    try {
      const t0 = this._gate('bubble', 0.012);
      if (t0 < 0 || prune(this._bubEnds, t0) >= 8) return;
      const b = this._b, bb = b.blip, bn = b.blipN;
      if (!bb || !bn) return;
      const s = c01(size01, 0.4), last = bb.length - 1;
      const k = clamp(Math.round(s * last + rr(-2, 2)), 0, last), rate = rr(0.92, 1.08);
      const g = dB(LV.bubble) * dB(-6 * (1 - s)) * dB(rr(-2, 1.5)) * bn[k], pan = (c01(pan01, 0.5) - 0.5) * 1.6;
      if (this._pb(bb[k], 0, bb[k].duration, t0 + R() * 0.006, g, rate, pan, 16000, 0, 'w')) this._bubEnds.push(t0 + bb[k].duration / rate);
    } catch (e) {}
  }

  // The giant shell breathing out its gush of bubbles.
  burst(size01) {
    try { const s = c01(size01, 0.8); this._ev('burst', s, 'burst', 0.5, 3, dB(-8 * (1 - s))); } catch (e) {}
  }

  // The squid: 'pulse' (it contracts to swim), 'bonk' (its tentacles slap you away), 'ink'.
  squid(kind) {
    try {
      if (kind === 'pulse') this._ev('squid_pulse', 1, 'squid_pulse', 0.15, 1, 1);
      else if (kind === 'bonk') this._ev('squid_bonk', 1, 'squid_bonk', 0.12, 2, 1);
      else if (kind === 'ink') this._ev('squid_ink', 1, 'squid_ink', 0.3, 1, 1);
    } catch (e) {}
  }

  // ----- the mountain -----
  // (step and land also take 'snow' and 'slick'; update() takes wind01.)

  // Leaving the kicker into the air.
  launch(speed01) {
    try { const s = c01(speed01, 0.8); this._ev('launch', s, 'launch', 0.3, 2, dB(-8 * (1 - s))); } catch (e) {}
  }

  // A clump of orzo snow sliding off a pine tier when the hero bumps the tree.
  thump(size01) {
    try { const s = c01(size01, 0.7); this._ev('thump', s, 'thump', 0.15, 1, dB(-8 * (1 - s))); } catch (e) {}
  }

  // The bobsled run, while the hero slides down the wet lasagna channel. Call every frame;
  // on=false fades it out cleanly (like slide()). A wide, smooth wet hiss that rises with speed,
  // a low rumble when fast, and a scrape and a rubbery squeal that come up with carve01 (hard
  // turns, riding up a bank). Every change is a ramp; slow drifts keep a long ride from sitting
  // still.
  sled(on, speed01, carve01) {
    try {
      this._liftT = on ? c01(speed01, 0.5) : 0;
      if (!this._ok) return;
      const t = this._now();
      if (on && !this._muted && (this._offline || this._ctx.state === 'running')) {
        if (!this._sd) {
          const b = this._b;
          if (!b.wind || !b.wet || !b.pink || !b.squeal) return; // textures are made a moment after unlock
          this._sledStart(t);
        }
        const S = this._sd, s = c01(speed01, 0.5), k = c01(carve01, 0);
        const ds = !S.on || Math.abs(s - S.s) > 0.02, dk = ds || Math.abs(k - S.k) > 0.02;
        if (ds) {
          S.out.gain.setTargetAtTime(dB(LV.sled) * (0.4 + 0.6 * Math.pow(s, 1.2)), t, S.on ? 0.12 : 0.05);
          S.bpH.frequency.setTargetAtTime(650 + 1500 * s, t, 0.15);
          S.lpH.frequency.setTargetAtTime(2600 + 5000 * s, t, 0.15);
          S.sW.playbackRate.setTargetAtTime(0.8 + 0.6 * s, t, 0.15);
          S.gR.gain.setTargetAtTime(s > 0.45 ? 0.5 * Math.pow((s - 0.45) / 0.55, 1.5) : 0, t, 0.2);
          S.sK.playbackRate.setTargetAtTime(0.5 + 0.4 * s, t, 0.15);
          S.s = s;
        }
        if (dk) {
          const tk = S.on ? 0.07 : 0.05, q = k > 0.05 ? Math.pow((k - 0.05) / 0.95, 0.9) : 0;
          S.gK.gain.setTargetAtTime(1.8 * Math.pow(k, 0.6) * (0.3 + 0.7 * s), t, tk);
          S.bpK.frequency.setTargetAtTime(1100 + 900 * k + 300 * s, t, tk);
          S.gQ.gain.setTargetAtTime(1.1 * q * (0.3 + 0.7 * s), t, tk);
          S.sQ.playbackRate.setTargetAtTime(0.85 + 0.25 * s + 0.12 * k, t, 0.1);
          S.k = k;
        }
        if (ds || t - S.wt > 0.15) {
          // the hiss's loop speed follows the speed and wanders a little, so a long steady
          // stretch never comes round the same way twice
          S.wt = t;
          S.wr = clamp(S.wr + (0.5 - S.wr) * 0.03 + (R() * 2 - 1) * 0.1, 0, 1);
          S.sH.playbackRate.setTargetAtTime(0.85 + 0.25 * S.s + 0.1 * (S.wr - 0.5), t, 0.6);
        }
        S.on = true;
        S.lt = t;
      } else if (this._sd) {
        const S = this._sd;
        if (S.on) { S.out.gain.setTargetAtTime(0, t, 0.07); S.on = false; S.offT = t; }
        else if (t - S.offT > 0.8) this._sledStop(t);
      }
    } catch (e) {}
  }

  _sledStart(t) {
    const c = this._ctx, b = this._b, n = [], srcs = [];
    const G = (v) => { const g = c.createGain(); g.gain.value = v; n.push(g); return g; };
    const F = (type, f, q) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = qv(type, q); n.push(x); return x; };
    const L = (buf, rate) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(t, R() * buf.duration * 0.9); n.push(s); srcs.push(s); return s; };
    const lfo = (f, depth, param) => { const [o, g] = this._lfoN(f, depth, param, t); n.push(o, g); srcs.push(o); };
    const out = G(0);
    out.connect(this._sfx);
    // The hiss: wide, wet air off the run.
    const sH = L(b.wind, rr(0.9, 1)), hpH = F('highpass', 250, 0.6), bpH = F('bandpass', 1000, 0.6), lpH = F('lowpass', 4000, 0.6);
    sH.connect(hpH); hpH.connect(bpH); bpH.connect(lpH); lpH.connect(out);
    // A fizz in it: the wet run's micro-bubbles.
    const sW = L(b.wet, 1), bpW = F('bandpass', 1300, 0.8), gWt = G(0.45);
    sW.connect(bpW); bpW.connect(gWt); gWt.connect(out);
    // The rumble, when fast.
    const sR = L(b.pink, rr(0.45, 0.55)), lpR = F('lowpass', 120, 0.8), gR = G(0);
    sR.connect(lpR); lpR.connect(gR); gR.connect(out);
    // Scrape and squeal, on hard turns and up the banks.
    const sK = L(b.crackle, 0.6), bpK = F('bandpass', 1400, 2), gK = G(0);
    sK.connect(bpK); bpK.connect(gK); gK.connect(out);
    const sQ = L(b.squeal, 1), bpQ = F('bandpass', 1400, 1.2), gQ = G(0);
    sQ.connect(bpQ); bpQ.connect(gQ); gQ.connect(out);
    // Slow drifts, so a long ride never sits still.
    lfo(rr(0.06, 0.09), 140, bpH.frequency);
    lfo(rr(0.012, 0.016), 0.03, sH.playbackRate);
    lfo(rr(0.031, 0.039), 0.02, sH.playbackRate);
    lfo(rr(0.1, 0.14), 0.12, gWt.gain);
    lfo(rr(0.017, 0.022), 0.04, sW.playbackRate);
    lfo(rr(0.08, 0.11), 120, bpQ.frequency);
    this._sd = { out, sH, bpH, lpH, sW, gR, sK, bpK, gK, sQ, gQ, n, srcs, on: false, s: 0, k: 0, offT: t, wt: t, wr: 0.5, lt: t };
  }

  _sledStop(t) {
    const S = this._sd;
    if (!S) return;
    this._sd = null;
    try {
      S.out.gain.cancelScheduledValues(t);
      S.out.gain.setTargetAtTime(0, t, 0.02);
      S.srcs[0].onended = () => { for (const x of S.n) { try { x.disconnect(); } catch (e) {} } };
      for (const s of S.srcs) s.stop(t + 0.15);
    } catch (e) {}
  }

  // A dry piece knocking into something; pitch01 picks small and glassy (1) or big and woody (0).
  clatter(intensity01, pitch01) {
    try {
      const t = this._gate('clatter', 0.012);
      if (t < 0 || prune(this._capEnds, t) >= 10) return;
      const i = c01(intensity01, 0.5), p = c01(pitch01, 0.5), b = this._b, tk = b.ticks;
      const g = dB(LV.clatter) * dB(-18 * (1 - i)) * dB(rr(-1, 1));
      const idx = clamp(Math.round(p * 10 + rr(-1.2, 1.2)), 0, 11), pan = rr(-0.35, 0.35), rate = rr(0.92, 1.1);
      const lp = rr(9000, 16000);
      if (this._pb(tk[idx], 0, tk[idx].duration, t, g * b.tickN[idx], rate, pan, lp, 0)) this._capEnds.push(t + tk[idx].duration / rate);
      if (i > 0.3 && R() < 0.55) {
        const j = clamp(idx + ri(-1, 1), 0, 11), t2 = t + rr(0.02, 0.07);
        this._pb(tk[j], 0, tk[j].duration, t2, g * b.tickN[j] * rr(0.25, 0.45), rr(0.95, 1.12), pan, lp, 0);
      }
    } catch (e) {}
  }

  // A dry tick and a softer one a fifth up; pitch steps through a pentatonic scale with index.
  collect(index) {
    try {
      const t = this._gate('collect', 0.03);
      if (t < 0) return;
      const k = Math.max(0, Math.floor(fin(index, 0))), b = this._b, g = dB(LV.collect) * dB(rr(-0.7, 0.7));
      const hz = 880 * semi([0, 2, 4, 7, 9][k % 5] + rr(-0.06, 0.06)), t2 = t + rr(0.055, 0.07);
      if (b.wood) {
        const w1 = ri(0, b.wood.length - 1), w2 = ri(0, b.wood.length - 1);
        this._pb(b.wood[w1], 0, b.wood[w1].duration, t, g * b.woodN[w1], hz / 1000, rr(-0.1, 0.1), 16000, 1);
        this._pb(b.wood[w2], 0, b.wood[w2].duration, t2, 0.5 * g * b.woodN[w2], (hz * 1.5) / 1000, rr(-0.1, 0.1), 16000, 1);
      } else {
        this._pb(b.ticks[7], 0, b.ticks[7].duration, t, g * b.tickN[7], hz / 1700, 0, 16000, 1);
        this._pb(b.ticks[7], 0, b.ticks[7].duration, t2, 0.5 * g * b.tickN[7], (hz * 1.5) / 1700, 0, 16000, 1);
      }
    } catch (e) {}
  }

  // Continuous wet friction while the strand slides down a starchy wall. Call every frame.
  slide(on, speed01) {
    try {
      if (!this._ok) return;
      const t = this._now();
      if (on && !this._muted && (this._offline || this._ctx.state === 'running')) {
        const s = c01(speed01, 0.5);
        if (!this._sl) this._slideStart(t);
        const sl = this._sl, tgt = dB(LV.slide) * (0.3 + 0.7 * s);
        if (!sl.on || Math.abs(tgt - sl.tgt) > sl.tgt * 0.08 + 1e-5) {
          sl.out.gain.setTargetAtTime(tgt, t, sl.on ? 0.08 : 0.04);
          sl.s1.playbackRate.setTargetAtTime(0.65 + 0.45 * s, t, 0.1);
          sl.f1.frequency.setTargetAtTime(600 + 600 * s, t, 0.1);
          sl.s2.playbackRate.setTargetAtTime(0.35 + 0.6 * s, t, 0.1);
          sl.tgt = tgt;
        }
        sl.on = true;
      } else if (this._sl) {
        const sl = this._sl;
        if (sl.on) { sl.out.gain.setTargetAtTime(0, t, 0.06); sl.on = false; sl.offT = t; sl.tgt = 0; }
        else if (t - sl.offT > 0.8) this._slideStop(t);
      }
    } catch (e) {}
  }

  _slideStart(t) {
    const c = this._ctx, b = this._b;
    const out = c.createGain();
    out.gain.value = 0;
    out.connect(this._sfx);
    const s1 = c.createBufferSource();
    s1.buffer = b.smear || b.wet || b.pink || b.white; s1.loop = true; s1.playbackRate.value = 0.8;
    const f1 = c.createBiquadFilter();
    f1.type = 'bandpass'; f1.frequency.value = 800; f1.Q.value = 0.8;
    const s2 = c.createBufferSource();
    s2.buffer = b.crackle; s2.loop = true; s2.playbackRate.value = 0.5;
    const f2 = c.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 2200; f2.Q.value = 1;
    const g2 = c.createGain();
    g2.gain.value = 0.18;
    s1.connect(f1); f1.connect(out);
    s2.connect(f2); f2.connect(g2); g2.connect(out);
    s1.start(t, R() * s1.buffer.duration * 0.9);
    s2.start(t, R() * s2.buffer.duration * 0.9);
    this._sl = { out, s1, s2, f1, n: [out, s1, f1, s2, f2, g2], on: false, tgt: 0, offT: t };
  }

  _slideStop(t) {
    const sl = this._sl;
    if (!sl) return;
    this._sl = null;
    try {
      sl.out.gain.cancelScheduledValues(t);
      sl.out.gain.setTargetAtTime(0, t, 0.02);
      sl.s1.onended = () => { for (const x of sl.n) { try { x.disconnect(); } catch (e) {} } };
      sl.s1.stop(t + 0.15);
      sl.s2.stop(t + 0.15);
    } catch (e) {}
  }

  // Continuous, while the player pulls the noodles on the opening screen. Call every frame;
  // 0 means not pulling. Soft wet tension, a slow starchy creak, and a faint sticky crackle
  // that rises with amount. Every change is a smooth ramp, so it never clicks.
  stretch(amount01) {
    try {
      if (!this._ok) return;
      const t = this._now(), a = c01(amount01, 0), b = this._b;
      if (a > 0.005 && !this._muted && (this._offline || this._ctx.state === 'running')) {
        if (!this._st) {
          if (!b.smear || !b.starch) return; // textures are made a moment after unlock
          this._stretchStart(t);
        }
        const S = this._st;
        if (!S.on || Math.abs(a - S.a) > 0.02) {
          const tau = a >= S.a ? 0.05 : 0.09;
          S.out.gain.setTargetAtTime(dB(LV.stretch) * Math.pow(a, 0.7), t, tau);
          S.gC.gain.setTargetAtTime(0.7 * Math.pow(a, 1.3), t, tau);
          S.gK.gain.setTargetAtTime(0.3 * a * a, t, tau);
          S.s1.playbackRate.setTargetAtTime(0.55 + 0.4 * a, t, 0.1);
          S.f1.frequency.setTargetAtTime(380 + 650 * a, t, 0.1);
          S.s2.playbackRate.setTargetAtTime(0.5 + 0.7 * a, t, 0.15);
          S.s3.playbackRate.setTargetAtTime(0.4 + 0.8 * a, t, 0.1);
          S.a = a;
        }
        S.on = true;
      } else if (this._st) {
        const S = this._st;
        if (S.on) { S.out.gain.setTargetAtTime(0, t, 0.09); S.on = false; S.offT = t; S.a = 0; }
        else if (t - S.offT > 1) this._stretchStop(t);
      }
    } catch (e) {}
  }

  _stretchStart(t) {
    const c = this._ctx, b = this._b;
    const out = c.createGain();
    out.gain.value = 0;
    out.connect(this._sfx);
    const loop = (buf, rate) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(t, R() * buf.duration * 0.9); return s; };
    const flt = (type, f, q) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = qv(type, q); return x; };
    const s1 = loop(b.smear, 0.6), f1 = flt('bandpass', 420, 1.1); // soft wet tension
    const s2 = loop(b.starch, 0.6), f2 = flt('lowpass', 1600, 0.7), gC = c.createGain(); // slow starchy creak
    const s3 = loop(b.crackle, 0.5), f3 = flt('bandpass', 2400, 1), gK = c.createGain(); // faint sticky crackle
    gC.gain.value = 0;
    gK.gain.value = 0;
    s1.connect(f1); f1.connect(out);
    s2.connect(f2); f2.connect(gC); gC.connect(out);
    s3.connect(f3); f3.connect(gK); gK.connect(out);
    this._st = { out, s1, s2, s3, f1, gC, gK, n: [out, s1, f1, s2, f2, gC, s3, f3, gK], on: false, a: 0, offT: t };
  }

  _stretchStop(t) {
    const S = this._st;
    if (!S) return;
    this._st = null;
    try {
      S.out.gain.cancelScheduledValues(t);
      S.out.gain.setTargetAtTime(0, t, 0.02);
      S.s1.onended = () => { for (const x of S.n) { try { x.disconnect(); } catch (e) {} } };
      for (const s of [S.s1, S.s2, S.s3]) s.stop(t + 0.15);
    } catch (e) {}
  }

  // ----- music -------------------------------------------------------------------------------
  // music(id): 'title', 'select', 'meadow', 'fortress', 'bay', 'mountain', 'won' or null. Call it
  // whenever the place changes; the same id again changes nothing. Pieces crossfade. 'won' plays
  // a short cadence in the key of whatever was playing, then rests. Safe before unlock: the
  // music starts once the instruments are made, a moment after it.
  music(id) {
    try {
      this._mWant = MUSIC_IDS.indexOf(id) >= 0 ? id : null;
      if (this._ok) this._musicGo(this._now());
    } catch (e) {}
  }

  // Music on or off (on by default). Off fades it out; the sound effects carry on.
  setMusic(on) {
    try {
      this._mOn = !!on;
      if (!this._ok) return;
      const t = this._now();
      if (this._mOn) this._musicGo(t);
      else { this._mStopAll(t, 0.35); this._mCur = null; }
    } catch (e) {}
  }

  _musicGo(t) {
    if (!this._mOn || (!this._offline && this._ctx.state !== 'running')) return;
    const M = this._b.mus, want = this._mWant;
    if (!M || !M.ready || want === this._mCur) return;
    if (!this._mBus) { if (!this._offline) return; run(this._gBuild()); } // live: built in the warm-up, in slices
    if (want === 'won') {
      const P = this._mRun && this._mRun.P;
      this._mPrev = this._mCur;
      this._mStopAll(t, 0.12);
      this._mCur = 'won';
      this._mWonT = t;
      this._mStart(arrangeWon(P ? P.key : this._mKey, P ? P.bpm : 100), t + 0.03);
      return;
    }
    // straight after the star the game leaves that stage: stay quiet until the next place
    if (this._mCur === 'won' && want === this._mPrev) return;
    this._mStopAll(t, this._mCur === 'won' ? 0.5 : 0.8);
    this._mCur = want;
    if (want) this._mStart(M.pieces[want], t + 0.05);
  }

  _mStart(P, t) {
    const c = this._ctx, Q = { P, t0: t, i: 0, intro: P.intro.length > 0, inp: c.createGain(), g: c.createGain(), rs: c.createGain(), pan: new Map(), end: 0 };
    Q.g.gain.value = P.lvl;
    Q.rs.gain.value = P.send;
    Q.inp.connect(Q.g); Q.g.connect(this._mBus); Q.g.connect(Q.rs); Q.rs.connect(this._mRev);
    this._mRun = Q;
    this._mKey = P.key;
  }

  _mStopAll(t, tau) {
    const Q = this._mRun;
    if (!Q) return;
    this._mRun = null;
    Q.g.gain.cancelScheduledValues(t);
    Q.g.gain.setTargetAtTime(0, t, tau);
    Q.end = t + tau * 7 + 3;
    this._mFade.push(Q);
  }

  // Every frame: queue the next ~0.4 s of notes, a few at a time (a fraction of a millisecond
  // a frame). Notes a short hitch made late are dropped; after a long one (a hidden tab) the
  // music picks up where it was.
  _musicTick(t) {
    if (this._mOn && this._mWant !== this._mCur) this._musicGo(t);
    const F = this._mFade;
    for (let k = F.length - 1; k >= 0; k--) {
      if (t <= F[k].end || this._offline) continue; // (offline, a script runs before the audio: leave it)
      const Q = F[k];
      F.splice(k, 1);
      for (const x of [Q.inp, Q.g, Q.rs, ...Q.pan.values()]) { try { x.disconnect(); } catch (e) {} }
    }
    const Q = this._mRun;
    if (!Q) return;
    const P = Q.P, hor = t + 0.4, budget = this._offline ? Infinity : now() + 0.3;
    for (let n = 0; n < 256 && now() < budget; n++) {
      const L = Q.intro ? P.intro : P.cyc;
      if (!L || Q.i >= L.length) {
        if (!Q.intro) { Q.t0 += P.cycSec; Q.i = 0; continue; }
        Q.t0 += P.introSec; Q.intro = false; Q.i = 0;
        if (!P.cyc) { this._mRun = null; Q.end = Q.t0 + 4; F.push(Q); return; }
        continue;
      }
      const e = L[Q.i];
      let et = Q.t0 + e[0];
      if (et < t - 1) { Q.t0 += t - et; et = t; }
      if (et > hor) break;
      Q.i++;
      if (this._muted || et < t - 0.06 || (e[6] & LIFT && this._lift < 0.5)) continue;
      this._mPlay(Q, et, e);
    }
  }

  // The music's bus, in short steps (the warm-up runs it between frames).
  *_gBuild() {
    const c = this._ctx, M = this._b.mus, W = {};
    const wv = (a) => { const re = new Float32Array(a.length + 1), im = new Float32Array(a.length + 1); a.forEach((x, i) => { im[i + 1] = x; }); return c.createPeriodicWave(re, im); };
    for (const k of ['reed', 'lead', 'flute']) { W[k] = wv(WV[k]); yield; }
    // pieces -> bus -> duck (the bigger effects dip it) -> state filter (muffled in a tube) ->
    // level -> the game mix, so under water muffles it too
    const bus = c.createGain(), dk = c.createGain(), lp = c.createBiquadFilter(), out = c.createGain();
    lp.type = 'lowpass'; lp.frequency.value = Math.min(18000, this._sr * 0.45); lp.Q.value = qv('lowpass', 0.6);
    out.gain.value = 0;
    bus.connect(dk); dk.connect(lp); lp.connect(out); out.connect(this._uwIn);
    // The room: the impulse in M.ir, normalized the way a ConvolverNode normalizes (the Web Audio
    // spec's equal-power scale), split into pieces of about 0.19 s, each on its own convolver
    // behind the delay that puts it in place. Exactly the sound of one convolver; setting one
    // long impulse costs ~20 ms of main thread at once, a piece a few.
    const ir = M.ir, sr = ir.sampleRate, n = ir.length, nc = ir.numberOfChannels;
    let pw = 0;
    for (let k = 0; k < nc; k++) { const d = ir.getChannelData(k); for (let i = 0; i < n; i++) pw += d[i] * d[i]; }
    pw = Math.sqrt(pw / (nc * n));
    const scale = (1 / (Number.isFinite(pw) && pw >= 0.000125 ? pw : 0.000125)) * Math.pow(10, -58 / 20) * (44100 / sr);
    const rin = c.createGain(), rg = c.createGain(), seg = Math.ceil(n / Math.ceil(n / Math.round(0.19 * sr)));
    rg.gain.value = 0.7;
    rg.connect(bus);
    yield;
    let feed = rin;
    for (let a = 0; a < n; a += seg) {
      const len = Math.min(seg, n - a), part = c.createBuffer(nc, len, sr);
      for (let k = 0; k < nc; k++) { const s = ir.getChannelData(k), d = part.getChannelData(k); for (let i = 0; i < len; i++) d[i] = s[a + i] * scale; }
      const cv = c.createConvolver();
      cv.normalize = false;
      cv.buffer = part;
      if (a > 0) { const dl = c.createDelay(seg / sr + 0.01); dl.delayTime.value = seg / sr; feed.connect(dl); feed = dl; }
      feed.connect(cv); cv.connect(rg);
      yield;
    }
    this._mWv = W;
    this._mRev = rin;
    this._mDk = dk;
    this._mLP = lp;
    this._mOut = out;
    this._mLvlSent = -1;
    this._mLpSent = -1;
    this._mBus = bus;
    this._musicState(this._now());
  }

  // Shared panners, one per pan position a piece uses: a note needs no panner of its own, and
  // a sum through one panner sounds exactly as each note through its own.
  _mPanBus(Q, pan) {
    const k = clamp(pan, -1, 1);
    let p = Q.pan.get(k);
    if (!p) {
      const c = this._ctx;
      if (c.createStereoPanner) { p = c.createStereoPanner(); p.pan.value = k; } else p = c.createGain();
      p.connect(Q.inp);
      Q.pan.set(k, p);
    }
    return p;
  }

  // Level and colour for the place: softer under water and in a tube (muffled, as if outside),
  // a touch lower in strong wind, a touch brighter with the sled flying.
  _musicState(t) {
    this._lift += (this._liftT - this._lift) * 0.35;
    const lvl = dB(LV.music) * (1 - 0.3 * this._uw) * (this._tube ? 0.72 : 1) * (1 - 0.18 * this._wind) * (1 + 0.15 * this._lift);
    if (Math.abs(lvl - this._mLvlSent) > lvl * 0.02 + 1e-6) { this._mOut.gain.setTargetAtTime(lvl, t, this._mLvlSent < 0 ? 0.15 : 0.4); this._mLvlSent = lvl; }
    const lp = this._tube ? 1800 : Math.min(18000, this._sr * 0.45);
    if (lp !== this._mLpSent) { this._mLP.frequency.setTargetAtTime(lp, t, 0.25); this._mLpSent = lp; }
  }

  _mDuck(t) {
    const p = this._mDk.gain;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(0.62, t, 0.012);
    p.setTargetAtTime(1, t + 0.12, 0.3);
  }

  _mPlay(Q, t, e) {
    const inst = e[1], w = inst === 'lead' || inst === 'flute', tt = Math.max(0, t + (R() - 0.5) * (w ? 0.004 : 0.01)), v = e[4] * (0.95 + 0.1 * R());
    if (w) this._mLead(Q, tt, e[2], e[3], v, e[5], inst);
    else if (inst === 'reed') this._mReed(Q, tt, e[2], e[3], v, e[5]);
    else this._mSmp(Q, tt, inst, e[2], e[3], v, e[5]);
  }

  // One note from a made instrument (or a drum): the nearest of its pitches, re-tuned.
  _mSmp(Q, t, inst, m, d, v, pan) {
    const c = this._ctx, M = this._b.mus;
    let buf, rate = 1, damp = 0;
    if (inst === 'plk' || inst === 'mar' || inst === 'xyl' || inst === 'bas') {
      const S = inst === 'bas' ? M.bas : inst === 'plk' ? M.plk : M.mar, k = clamp(Math.round((m - S.m0) / S.step), 0, S.b.length - 1);
      buf = S.b[k];
      rate = Math.pow(2, (m - S.m0 - k * S.step) / 12);
      damp = inst === 'xyl' ? 0.03 : inst === 'bas' ? 0.06 : inst === 'plk' && d < 0.5 ? 0.05 : 0;
    } else if (inst === 'tick') { buf = this._b.ticks && this._b.ticks[ri(9, 11)]; rate = rr(1.2, 1.5); }
    else { const L = M[inst]; buf = L && L[ri(0, L.length - 1)]; rate = rr(0.97, 1.03); }
    if (!buf) return;
    // (plucks and the bass thin out as they climb; a little lift keeps them even)
    const s = c.createBufferSource(), g = c.createGain(), lv = Math.pow(v, 1.2) * MG[inst] * (inst === 'plk' ? dB(0.22 * (m - 64)) : inst === 'bas' ? dB(0.18 * (m - 42)) : 1);
    s.buffer = buf;
    s.playbackRate.value = rate;
    g.gain.value = lv;
    s.connect(g); g.connect(this._mPanBus(Q, pan));
    let stop = t + buf.duration / rate;
    if (damp) { g.gain.setValueAtTime(lv, t + d); g.gain.setTargetAtTime(0, t + d, damp); stop = Math.min(stop, t + d + damp * 8); }
    s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) {} };
    s.start(t);
    s.stop(stop);
  }

  // One reed voice: two reeds a few cents apart (the accordion's shimmer), a soft bellows swell.
  _mReed(Q, t, m, d, v, pan) {
    const c = this._ctx, f = mtof(m), W = this._mWv, o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    const pk = v * MG.reed, end = t + Math.max(0.25, d);
    o1.setPeriodicWave(W.reed); o2.setPeriodicWave(W.reed);
    o1.frequency.value = f; o2.frequency.value = f;
    o1.detune.value = -4; o2.detune.value = 4.5;
    lp.type = 'lowpass'; lp.frequency.value = Math.min(2600, f * 6.5); lp.Q.value = qv('lowpass', 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(pk, t + 0.14);
    if (d > 0.5) g.gain.setTargetAtTime(pk * 0.8, t + 0.18, 0.5);
    g.gain.setTargetAtTime(0, end, 0.11);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this._mPanBus(Q, pan));
    o1.start(t); o2.start(t);
    o1.stop(end + 0.8); o2.stop(end + 0.8);
    o1.onended = () => { for (const x of [o1, o2, lp, g]) { try { x.disconnect(); } catch (e) {} } };
  }

  // One woodwind note (or flute): speaks with a breath, then a gentle vibrato on held notes.
  _mLead(Q, t, m, d, v, pan, kind) {
    const c = this._ctx, b = this._b, fl = kind === 'flute', f = mtof(m), o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), lp = c.createBiquadFilter(), g = c.createGain(), p = this._mPanBus(Q, pan);
    const pk = v * MG[kind], a = fl ? 0.05 : 0.03, end = t + Math.max(a + 0.03, d * 0.95), fc = Math.min(fl ? 2800 : 3600, f * (fl ? 4 : 5.5)), stop = end + 0.35;
    o.setPeriodicWave(this._mWv[kind]);
    o.frequency.value = f;
    lfo.frequency.value = rr(4.8, 5.5);
    lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.2); lg.gain.linearRampToValueAtTime(fl ? 11 : 8, t + 0.55);
    lfo.connect(lg); lg.connect(o.detune);
    lp.type = 'lowpass'; lp.Q.value = qv('lowpass', 0.6);
    lp.frequency.setValueAtTime(fc * 0.55, t); lp.frequency.setTargetAtTime(fc, t, 0.04);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(pk, t + a);
    g.gain.setTargetAtTime(pk * 0.85, t + a, 0.3);
    g.gain.setTargetAtTime(0, end, fl ? 0.045 : 0.03);
    o.connect(lp); lp.connect(g); g.connect(p);
    const ns = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain(), nd = fl ? end - t : 0.12;
    ns.buffer = b.pink || b.white; ns.loop = true;
    bp.type = 'bandpass'; bp.frequency.value = rr(1600, 2400); bp.Q.value = 0.8;
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(pk * (fl ? 0.16 : 0.1), t + 0.012);
    ng.gain.setTargetAtTime(fl ? pk * 0.05 : 0, t + 0.02, 0.04);
    ng.gain.setTargetAtTime(0, t + nd, 0.04);
    ns.connect(bp); bp.connect(ng); ng.connect(p);
    o.start(t); lfo.start(t); o.stop(stop); lfo.stop(stop);
    ns.start(t, R() * ns.buffer.duration * 0.8); ns.stop(Math.min(stop, t + nd + 0.3));
    o.onended = () => { for (const x of [o, lfo, lg, lp, g, ns, bp, ng]) { try { x.disconnect(); } catch (e) {} } };
  }
}
