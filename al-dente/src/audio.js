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
  return 'cooked';
};
// BiquadFilter Q is in dB for lowpass/highpass and linear for the rest.
const qv = (type, q) => (type === 'lowpass' || type === 'highpass' ? 20 * Math.log10(Math.max(q, 0.05)) : q);

// Loudness at full intensity: dB of the loudest 30 ms, before the master volume (0.7 = -3 dB).
// (slide, wind and air are raw gains on their loops; simmer on its bubbles.)
const LV = {
  step_cooked: -33, step_dry: -34, step_grain: -34, jump: -38,
  land_cooked: -22, land_dry: -22, land_grain: -22, stick: -23, leap: -26, creak: -27,
  snap: -21, clatter: -28, spring: -22, bonk: -24, collect: -25, sink: -24, respawn: -26, star: -24,
  slide: -17.5, wind: -30, air: -49, simmer: -38,
};

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
};
const ORDER = ['step_cooked', 'step_dry', 'step_grain', 'jump', 'land_cooked', 'land_dry', 'land_grain', 'stick', 'leap',
  'bonk', 'snap', 'sink', 'respawn', 'creak', 'spring', 'star'];

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
    this._A = null;
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
    this._sfx = c.createGain();
    this._sfx.connect(m);
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
    T.push(function* drops() { if (!b.drops) b.drops = genDrops(c, 6); });
    T.push(function* wet() { if (!b.wet) b.wet = yield* gWet(c, 2); });
    T.push(function* pink() { if (!b.pink) b.pink = yield* gPink(c, 2); });
    T.push(function* wood() { if (!b.wood) { const w = genWood(c, 3); b.woodN = norm1(w); b.wood = w; } });
    T.push(function* wind() { if (!b.wind) b.wind = yield* gWhite(c, 6.1, 2); });
    T.push(function* ambience() { if (amb) self._whenRunning(() => self._startAmbience()); });
    T.push(function* bubbles() { if (!b.bub) b.bub = yield* gBubbles(c, 32); });
    T.push(function* smear() { if (!b.smear) b.smear = yield* gSmear(c, 3.3); });
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
    tout.connect(this._m);
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
    A.lvl.connect(A.outLP); A.outLP.connect(A.outG); A.outG.connect(this._m);
    A.tubeWind = G(0);
    A.lvl.connect(A.tubeWind); A.tubeWind.connect(this._tubeIn);
    // Warm air: low-mid hush with a slow, broad "howl" band wandering inside it.
    A.s1 = S(b.wind, 0.94 + 0.12 * this._walk.rate);
    const hp = F('highpass', 70, 0.5);
    A.lp = F('lowpass', 480, 0.5);
    A.gW = G(wind);
    A.howl = F('bandpass', 420, 1.4);
    A.gH = G(wind * 0.4);
    A.s1.connect(hp); hp.connect(A.lp); A.lp.connect(A.gW); A.gW.connect(A.lvl);
    hp.connect(A.howl); A.howl.connect(A.gH); A.gH.connect(A.lvl);
    // Thin high air that comes up with gusts.
    A.s2 = S(b.wind, rr(0.95, 1.0));
    A.bpA = F('bandpass', 2100, 0.6);
    A.gA = G(air);
    A.s2.connect(A.bpA); A.bpA.connect(A.gA); A.gA.connect(A.lvl);
    // A pot simmering somewhere off to the side: update() drops single bubbles into simIn.
    A.simIn = G(1);
    A.gS = G(this._simmerOn ? dB(LV.simmer) : 0);
    const shp = F('highpass', 140, 0.7), slp = F('lowpass', 1500, 0.7);
    A.simIn.connect(shp); shp.connect(slp); slp.connect(A.gS);
    let tail = A.gS;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = 0.2; A.gS.connect(p); tail = p; }
    tail.connect(A.lvl);
    // Slow incommensurate LFOs keep the bed moving even if update() is never called; update()
    // adds random walks on top. The rate LFOs mean the noise loops never line up the same way.
    // Each LFO starts at a random phase, so no two sessions (or loop passes) begin alike.
    const lfo = (f, depth, param) => {
      const o = c.createOscillator(), ph = R() * TAU;
      try { o.setPeriodicWave(c.createPeriodicWave(new Float32Array([0, Math.sin(ph)]), new Float32Array([0, Math.cos(ph)]), { disableNormalization: true })); } catch (e) {}
      o.frequency.value = f;
      const g = G(depth);
      o.connect(g); g.connect(param); o.start(t);
    };
    lfo(rr(0.016, 0.021), wind * 0.3, A.gW.gain);
    lfo(rr(0.047, 0.055), wind * 0.18, A.gW.gain);
    lfo(rr(0.07, 0.09), 110, A.lp.frequency);
    lfo(rr(0.06, 0.07), 80, A.howl.frequency);
    lfo(rr(0.029, 0.034), air * 0.25, A.gA.gain);
    lfo(rr(0.011, 0.014), 0.03, A.s1.playbackRate);
    lfo(rr(0.017, 0.02), 0.03, A.s2.playbackRate);
    this._A = A;
    this._tubeSent = -1;
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
      }
      const t = this._now();
      if (this._lastUpd === undefined) this._lastUpd = t;
      const el = t - this._lastUpd;
      if (el < 0.15 && el >= 0 && this._tube === this._tubeSent) return;
      const step = clamp(el, 0.016, 0.5);
      this._lastUpd = t;
      const sl = this._sl;
      if (sl && !sl.on && t - sl.offT > 0.8) this._slideStop(t);
      if (this._tube !== this._tubeSent) this._applyTube(t);
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
      A.gS.gain.setTargetAtTime(this._simmerOn ? dB(LV.simmer) * (0.7 + 0.6 * W.sim) : 0, t, 1.2);
      A.s1.playbackRate.setTargetAtTime(0.94 + 0.12 * W.rate, t, 2);
      if (this._b.bub && this._simmerOn && (this._offline || this._ctx.state === 'running')) this._bubbles(t, step, W.sim);
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

  // ----- playback ------------------------------------------------------------------------------
  // A strip is a persistent lowpass -> gain -> pan chain into the effects bus. A one-shot is a
  // single buffer source plugged into a free strip; it unplugs itself when it ends.

  _newStrip() {
    const c = this._ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = Math.min(20000, this._sr * 0.45); f.Q.value = qv('lowpass', 0.707);
    f.connect(g);
    let p = null;
    if (c.createStereoPanner) { p = c.createStereoPanner(); g.connect(p); p.connect(this._sfx); } else g.connect(this._sfx);
    return { f, g, p, busy: 0 };
  }

  _pb(buf, off, dur, t, gain, rate, pan, lp, prio) {
    let st = null;
    for (let i = 0; i < this._strips.length; i++) if (this._strips[i].busy <= t) { st = this._strips[i]; break; }
    if (!st) {
      if (this._strips.length >= (prio >= 2 ? 32 : 24)) return false;
      st = this._newStrip();
      this._strips.push(st);
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
      this._pb(B.buf, slot * F.slot, F.slot * 0.95, t, lvl * B.norm[slot], rate, j.p ? rr(-j.p, j.p) : 0, lp, prio);
    } else {
      this._play(t, prio, (v) => { v.o.gain.value = lvl * dB(-F.cal); return this[F.v](v, t, p); });
    }
  }

  // ----- live voices (bank rendering, and the first moments after unlock) ------------------------
  // A live voice gets an output gain and a silent sentinel source that ends after the voice's
  // last tail; when it ends, every node of the voice is disconnected.

  _play(t, prio, fn) {
    let v = null;
    try {
      if (prune(this._ends, t) >= (prio >= 2 ? MAXV + 16 : MAXV)) return;
      v = this._vNew(t);
      v.done = false;
      this._fin(v, fin(fn(v), t + 1));
    } catch (e) {
      if (v && !v.done) { try { this._fin(v, t + 2); } catch (e2) {} }
    }
  }

  _vNew(t) {
    const o = this._ctx.createGain();
    o.connect(this._sfx);
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

  star() {
    try { this._ev('star', 1, 'star', 1.2, 3, 1); } catch (e) {}
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
}
