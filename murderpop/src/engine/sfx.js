// The game's own sounds: everything you hear that isn't the song.
//
// Alex's rules for them: "visuals are important, but audio is more important"; "Sound present and
// informative, nothing loud or annoying". Every sound is distinct and placed (panned to where it comes
// from), and nothing carries from far away. Nothing sounds like YOU being hurt except being hurt. Hits
// are heavy and have no notes in them (a hit with a note in it was "weird and musical"); the one note
// is the glimmer, a quiet bell on a note of the chord that's sounding, laid on top of an on-beat
// action (HEARSE, where breaks played the chord: "absolutely perfect"). One-shot melodies play once;
// nothing ticks or beeps on its own; after a win, applause, not silence.
//
// Everything synthesized is rendered into AudioBuffers once, at load, in a worker. Nothing is built
// out of oscillators at play time (Alex heard the music glitch when sounds were made per event): a
// sound is one to three buffer sources through a gain and a panner into audio.js's sfx bus. A few real
// recordings (Kenney, CC0, in assets/sfx/) are laid in where a recording beats synthesis: the body of a
// punch under being hurt, a latch for the ring clicking home, cloth, a page flicked.
//
//   const sfx = new Sfx(audio); await sfx.load(); sfx.setSong(beatMap, chords);
//   sfx.update() once a frame (the applause and the loops need it).
//   Every sound takes { pan, intensity, at, time, x, z, dist }: pan -1..1, intensity 0..1 (louder and
//   fuller), at = seconds from now or time = an AudioContext time (sfx.timeOfSong(t) for a beat), or
//   x, z in the world (with sfx.listen(x, z, span) set each frame) instead of pan and dist.

const TAU = Math.PI * 2;
let SR = 48000;
const N = (s) => Math.max(0, Math.round(s * SR));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const VERSION = 1;

// ---------------------------------------------------------------------------------------- the kit
function rng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.u = (lo, hi) => lo + (hi - lo) * r();
  r.lu = (lo, hi) => lo * Math.pow(hi / lo, r());
  r.g = () => { let u = r(); while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); };
  return r;
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function noise(n, r) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; }

function coef(type, f, q = 0.7071, db = 0) {
  f = clamp(f, 8, SR * 0.46);
  const w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b1 = 1 - c; b0 = b2 = b1 / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'hp') { b1 = -(1 + c); b0 = b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'pk') { const A = Math.pow(10, db / 40); b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else { // 'hs' | 'ls' shelves
    const A = Math.pow(10, db / 40), sq = 2 * Math.sqrt(A) * al, g = type === 'hs' ? 1 : -1;
    b0 = A * ((A + 1) + g * (A - 1) * c + sq); b1 = -2 * g * A * ((A - 1) + g * (A + 1) * c); b2 = A * ((A + 1) + g * (A - 1) * c - sq);
    a0 = (A + 1) - g * (A - 1) * c + sq; a1 = 2 * g * ((A - 1) - g * (A + 1) * c); a2 = (A + 1) - g * (A - 1) * c - sq;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(x, type, f, q = 0.7071, db = 0) {
  const [b0, b1, b2, a1, a2] = coef(type, f, q, db);
  let z1 = 0, z2 = 0;
  for (let i = 0, n = x.length; i < n; i++) { const v = x[i], y = b0 * v + z1; z1 = b1 * v - a1 * y + z2; z2 = b2 * v - a2 * y; x[i] = y; }
  return x;
}
// a filter whose frequency moves: fOf(seconds) -> Hz
function filtv(x, type, fOf, q = 0.7071, step = 24) {
  let k = null, z1 = 0, z2 = 0;
  for (let i = 0, n = x.length; i < n; i++) {
    if (i % step === 0) k = coef(type, fOf(i / SR), q);
    const v = x[i], y = k[0] * v + z1; z1 = k[1] * v - k[3] * y + z2; z2 = k[2] * v - k[4] * y; x[i] = y;
  }
  return x;
}
// filtered as if the buffer went round and round (for loops that must join without a seam)
function circ(x, fn) {
  const n = x.length, y = new Float32Array(n * 2); y.set(x); y.set(x, n);
  fn(y);
  x.set(y.subarray(n)); return x;
}

// a smooth rise over `a` seconds from `at`, then an exponential fall (time constant tau)
function ad(x, a, tau, at = 0) {
  const i0 = N(at), na = Math.max(1, Math.round(a * SR)), k = Math.exp(-1 / (tau * SR));
  let e = 1;
  for (let i = 0; i < x.length; i++) {
    const j = i - i0;
    if (j < 0) { x[i] = 0; continue; }
    if (j < na) { const s = Math.sin(Math.PI / 2 * j / na); x[i] *= s * s; } else { x[i] *= e; e *= k; }
  }
  return x;
}
// a piecewise envelope [[t, v], ...]; pow > 1 bends each rise to start slow and each fall to drop fast
function pts(x, P, pow = 1) {
  let k = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    while (k < P.length - 2 && t > P[k + 1][0]) k++;
    const [t0, v0] = P[k], [t1, v1] = P[k + 1];
    let u = t1 > t0 ? clamp((t - t0) / (t1 - t0), 0, 1) : 1;
    if (pow !== 1) u = v1 > v0 ? Math.pow(u, pow) : 1 - Math.pow(1 - u, pow);
    x[i] *= v0 + (v1 - v0) * u;
  }
  return x;
}
const lerpLog = (P, t) => {
  if (t <= P[0][0]) return P[0][1];
  for (let k = 1; k < P.length; k++) if (t <= P[k][0]) { const [t0, f0] = P[k - 1], [t1, f1] = P[k]; return f0 * Math.pow(f1 / f0, (t - t0) / (t1 - t0)); }
  return P[P.length - 1][1];
};

function peak(chs) { let p = 0; for (const x of chs) for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > p) p = v; } return p; }
function norm(chs, to = 0.95) { const p = peak(chs); if (p > 0) { const g = to / p; for (const x of chs) for (let i = 0; i < x.length; i++) x[i] *= g; } return chs; }
// scale so the loudest few milliseconds are as loud as a sine of amplitude `amp`
function rmsPeakTo(x, amp, win = 0.005) {
  const w = Math.max(8, N(win)); let best = 0;
  for (let i = 0; i + w <= x.length; i += w >> 1) { let s = 0; for (let j = i; j < i + w; j++) s += x[j] * x[j]; if (s > best) best = s; }
  const rms = Math.sqrt(best / w); if (rms > 0) { const g = amp * 0.7071 / rms; for (let i = 0; i < x.length; i++) x[i] *= g; }
  return x;
}
// scale a stationary signal so that, under the envelope env(), it has the energy of a sine of amplitude amp
function shaped(x, amp, envFn) {
  const e = new Float32Array(x.length).fill(1); envFn(e);
  let es = 0, xs = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i] * e[i]; x[i] = v; xs += v * v; es += e[i] * e[i]; }
  const g = xs > 0 ? amp * Math.sqrt(0.5 * es / xs) : 0;
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
}
function add(dst, src, g = 1, at = 0) { const i0 = N(at), m = Math.min(src.length, dst.length - i0); for (let i = 0; i < m; i++) dst[i0 + i] += src[i] * g; return dst; }
function fadeOut(x, sec) { const m = Math.min(x.length, N(sec)); for (let i = 0; i < m; i++) { const u = i / m; x[x.length - 1 - i] *= u * u; } return x; }
function sat(x, d) { const k = 1 / Math.tanh(d); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * d) * k; return x; }
const seg = (x, at, len) => { const i0 = clamp(N(at), 0, x.length); return [i0, Math.min(x.length - i0, N(len))]; };

// A peak limiter with a little look-ahead: instant down, exponential back up, linked across channels.
function limit(chs, ceil, rel = 0.05, look = 0.0015) {
  const n = chs[0].length, L = Math.max(1, Math.round(look * SR));
  const a = new Float32Array(n);
  for (const x of chs) for (let i = 0; i < n; i++) { const v = Math.abs(x[i]); if (v > a[i]) a[i] = v; }
  const need = new Float32Array(n), dq = new Int32Array(n); let h = 0, t = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (t > h && a[dq[t - 1]] <= a[i]) t--;
    dq[t++] = i;
    while (dq[h] > i + L) h++;
    const pk = a[dq[h]]; need[i] = pk > ceil ? ceil / pk : 1;
  }
  const rc = Math.exp(-1 / (rel * SR)); let cur = 1;
  for (let i = 0; i < n; i++) { cur = Math.min(need[i], 1 - (1 - cur) * rc); need[i] = cur; }
  let acc = 0; const g = new Float32Array(n);
  for (let i = 0; i < n; i++) { acc += need[i]; if (i >= L) acc -= need[i - L]; g[i] = acc / Math.min(i + 1, L); }
  for (const x of chs) for (let i = 0; i < n; i++) x[i] *= g[i];
  return chs;
}
// A sound's last steps: soft clip (density), cuts, the limiter (a fast release shaves only the peaks),
// the level, the fade.
function finish(chs, o = {}) {
  norm(chs, 1);
  if (o.drive) for (const x of chs) sat(x, o.drive);
  for (const x of chs) {
    if (o.hp) filt(x, 'hp', o.hp, 0.7);
    if (o.lp) filt(x, 'lp', o.lp, 0.7);
    filt(x, 'hp', 18, 0.6); // no DC
  }
  if (o.lim) { norm(chs, 1); limit(chs, o.lim, o.rel ?? 0.05); }
  norm(chs, o.peak ?? 0.95);
  for (const x of chs) { if (o.fade !== 0) fadeOut(x, o.fade ?? 0.02); }
  return chs;
}

// ---- the pieces of a sound ----
// the hard contact: a fraction of a millisecond of bright noise
function addClick(x, r, at, dur = 0.0005, hp = 1800, amp = 1) {
  const [i0, m0] = seg(x, at, dur); const m = Math.max(3, m0); if (i0 + m > x.length) return x;
  const y = noise(m + 16, r); filt(y, 'hp', hp, 0.7);
  let p = 0; for (let j = 0; j < m; j++) p = Math.max(p, Math.abs(y[j]));
  for (let j = 0; j < m; j++) { const w = Math.sin(Math.PI * (j + 0.5) / m); x[i0 + j] += y[j] * w * amp / (p || 1); }
  return x;
}
// a band of noise struck and gone: a knock with no note in it (OLLY OLLY's struck())
function addStruck(x, r, f, q, tau, o = {}) {
  const at = o.at || 0, att = o.att ?? 0.0002, amp = o.amp ?? 1;
  const [i0, m] = seg(x, at, att + tau * 10); if (m <= 4) return x;
  const y = noise(m, r); filt(y, 'bp', f, q); if (o.q2) filt(y, 'bp', f, o.q2);
  shaped(y, amp, (e) => ad(e, att, tau, 0));
  for (let j = 0; j < m; j++) x[i0 + j] += y[j];
  return x;
}
// weight: noise under a low pass, struck and gone. Never a falling sine: a sine under every hit was
// what made OLLY OLLY's hits sound like an electronic kick drum.
function addThud(x, r, fc, tau, o = {}) {
  const at = o.at || 0, att = o.att ?? 0.001, amp = o.amp ?? 1;
  const [i0, m] = seg(x, at, att + tau * 9); if (m <= 4) return x;
  const pre = N(0.03), y = noise(m + pre, r);
  filt(y, 'lp', fc, 0.6); filt(y, 'lp', fc * 1.25, 0.6); filt(y, 'hp', Math.max(22, fc * 0.3), 0.7);
  const z = y.subarray(pre);
  shaped(z, amp, (e) => ad(e, att, tau, 0));
  for (let j = 0; j < m; j++) x[i0 + j] += z[j];
  return x;
}
// one mode ringing: a damped sine that starts from zero (struck, so it starts with all its speed)
function addMode(x, f, tau, amp, at = 0, att = 0) {
  if (f >= SR * 0.46 || !amp) return;
  const i0 = Math.max(0, N(at)), m = Math.min(x.length - i0, Math.ceil(tau * SR * 9.2));
  if (m <= 0) return;
  const w = TAU * f / SR, cw = Math.cos(w), sw = Math.sin(w), d = Math.exp(-1 / (tau * SR)), na = Math.round(att * SR);
  let re = amp, im = 0;
  for (let j = 0; j < m; j++) {
    x[i0 + j] += j < na ? im * j / na : im;
    const nr = (re * cw - im * sw) * d; im = (re * sw + im * cw) * d; re = nr;
  }
}
// a crowd of short inharmonic modes: glaze, glass, a shard. Many and brief, so it is a crack and never a note.
function addCluster(x, r, o) {
  const at = o.at || 0, lo = o.lo, hi = o.hi, n = o.n, tilt = o.tilt ?? 0.35;
  const fs = [], as = []; let sum = 0;
  for (let k = 0; k < n; k++) { const f = r.lu(lo, hi), a = r.u(0.35, 1) * Math.pow(lo / f, tilt); fs.push(f); as.push(a); sum += a * a; }
  // (as much energy as one mode of amplitude amp, however many there are)
  for (let k = 0; k < n; k++) {
    const tau = r.u(o.tau[0], o.tau[1]) * Math.pow(lo / fs[k], 0.3);
    addMode(x, fs[k], tau, (o.amp ?? 1) * as[k] / Math.sqrt(sum), at, o.att || 0);
  }
}
// little pieces: each one a few modes of a small irregular shard, scattered in time (and left to right)
function addTinkles(x, r, count, start, span, o = {}) {
  const lo = o.lo ?? 3000, hi = o.hi ?? 10000, amp = o.amp ?? 0.3, t0 = o.tau?.[0] ?? 0.003, t1 = o.tau?.[1] ?? 0.015;
  const shape = o.shape ?? 1.3, fall = o.fall ?? 0.8, R = o.R || null, width = o.width ?? 0.9;
  for (let k = 0; k < count; k++) {
    const u = Math.pow(r(), shape), at = start + span * u;
    const f = r.lu(lo, hi), a = amp * r.u(0.3, 1) * (1 - fall * u), tau = r.u(t0, t1);
    const ratios = [1, r.u(1.35, 2.3), r.u(2.5, 4.1)];
    const p = r.u(-width, width), gl = Math.cos((p + 1) * Math.PI / 4), gr = Math.sin((p + 1) * Math.PI / 4);
    for (let m = 0; m < 3; m++) {
      const fm = f * ratios[m], am = a * [1, 0.55, 0.3][m], tm = tau * [1, 0.6, 0.4][m];
      if (R) { addMode(x, fm, tm, am * gl * 1.4142, at); addMode(R, fm, tm, am * gr * 1.4142, at); } else addMode(x, fm, tm, am, at);
    }
  }
}
// grains: tiny bursts of noise (micro-fractures, crackle, sparks), filtered together
function grains(n, r, count, start, span, o = {}) {
  const y = new Float32Array(n), d0 = o.dur?.[0] ?? 0.00012, d1 = o.dur?.[1] ?? 0.0006, shape = o.shape ?? 1, fall = o.fall ?? 0.7;
  for (let k = 0; k < count; k++) {
    const u = Math.pow(r(), shape), i0 = N(start + span * u), m = N(r.u(d0, d1)) + 3;
    if (i0 + m >= n) continue;
    const a = r.u(0.25, 1) * (1 - fall * u) * (r() < 0.12 ? 1.7 : 1);
    for (let j = 0; j < m; j++) { const w = Math.sin(Math.PI * (j + 0.5) / m); y[i0 + j] += (r() * 2 - 1) * w * w * a; }
  }
  if (o.hp) filt(y, 'hp', o.hp, 0.7);
  if (o.lp) filt(y, 'lp', o.lp, 0.7);
  return rmsPeakTo(y, o.amp ?? 1, o.win ?? 0.004);
}
// air moving: noise in a band that moves (f: [[t, Hz]...]) under an envelope (e: [[t, v]...])
function whoosh(n, r, o) {
  const at = o.at || 0, i0 = Math.min(n, N(at)), m = Math.max(0, Math.min(n - i0, N(o.len)));
  const y = noise(m, r), F = o.f;
  filtv(y, 'bp', (t) => lerpLog(F, t), o.q ?? 1.2);
  if (o.q2) filtv(y, 'bp', (t) => lerpLog(F, t), o.q2);
  if (o.am) { const [rate, depth] = o.am; let ph = r() * TAU; for (let i = 0; i < m; i++) { const rr = typeof rate === 'function' ? rate(i / SR) : rate; ph += TAU * rr / SR; y[i] *= 1 - depth * (0.5 + 0.5 * Math.cos(ph)); } }
  pts(y, o.e, o.pow ?? 1);
  rmsPeakTo(y, o.amp ?? 1, 0.008);
  const out = new Float32Array(n); out.set(y, i0); return out;
}
// the broad hiss on top of a whoosh
function air(n, r, at, len, tp, amp, lo = 1100, hi = 8500) {
  const i0 = Math.min(n, N(at)), m = Math.max(0, Math.min(n - i0, N(len)));
  const y = noise(m, r); filt(y, 'hp', lo, 0.7); filt(y, 'lp', hi, 0.7);
  pts(y, [[0, 0], [tp, 1], [len, 0]], 2); rmsPeakTo(y, amp, 0.008);
  const out = new Float32Array(n); out.set(y, i0); return out;
}
// A thin metal ring's own modes (in-plane bending of a ring: f_n ~ n(n^2-1)/sqrt(n^2+1), n = 2, 3, ...).
// Inharmonic, so it reads as metal and never as a note. Copper is soft: they die quickly.
const RING = [1, 2.828, 5.423, 8.768, 12.86, 17.7];
function resonate(e, f, tau) {
  const rho = Math.exp(-1 / (tau * SR)), c = 2 * rho * Math.cos(TAU * f / SR), d = rho * rho, y = new Float32Array(e.length);
  let y1 = 0, y2 = 0; for (let i = 0; i < e.length; i++) { const v = e[i] + c * y1 - d * y2; y[i] = v; y2 = y1; y1 = v; }
  return y;
}
function addCopper(x, r, o) {
  const at = o.at || 0, base = o.base, amp = o.amp ?? 1, tk = o.tk ?? 1;
  const taus = o.taus ?? [0.07, 0.05, 0.038, 0.028, 0.018, 0.011], amps = o.amps ?? [0.3, 0.6, 0.5, 0.35, 0.2, 0.1];
  let sum = 0; for (const a of amps) sum += a;
  for (let k = 0; k < amps.length; k++) {
    const f = base * RING[k] * (1 + r.u(-0.015, 0.015)); if (f > SR * 0.45) continue;
    const a = amp * amps[k] / sum, tau = taus[k] * tk;
    if (!o.scrape) { addMode(x, f, tau, a, at, o.att ?? 0.0003); continue; }
    const [elen, eatt, etau] = o.scrape; // the edge rung by the cut: a burst of noise through the mode
    const [i0, m] = seg(x, at, elen + tau * 9); if (m <= 4) continue;
    const e = noise(m, r); ad(e, eatt, etau, 0); for (let j = N(elen); j < m; j++) e[j] = 0;
    const y = resonate(e, f, tau); let p = 0; for (let j = 0; j < m; j++) p = Math.max(p, Math.abs(y[j]));
    for (let j = 0; j < m; j++) x[i0 + j] += y[j] * a / (p || 1);
  }
}
// a small room (Freeverb's combs and all-passes), for the few sounds that need their own space
function verb(L, R, o = {}) {
  const rt = o.rt ?? 1.5, wet = o.wet ?? 0.3, damp = o.damp ?? 0.35, pre = N(o.pre ?? 0.012);
  const combs = [0.0297, 0.0371, 0.0411, 0.0437, 0.0353, 0.0389], aps = [0.0051, 0.0017];
  const proc = (x, spread) => {
    const n = x.length, y = new Float32Array(n);
    for (const ds of combs) {
      const d = Math.max(1, N(ds * spread)), fb = Math.pow(10, -3 * ds * spread / rt), buf = new Float32Array(d); let k = 0, lp = 0;
      for (let i = 0; i < n; i++) { const inp = i >= pre ? x[i - pre] : 0, out = buf[k]; lp = out * (1 - damp) + lp * damp; buf[k] = inp + lp * fb; k = k + 1 === d ? 0 : k + 1; y[i] += out; }
    }
    for (const as of aps) {
      const d = Math.max(1, N(as * spread)), buf = new Float32Array(d); let k = 0;
      for (let i = 0; i < n; i++) { const bo = buf[k], v = y[i]; buf[k] = v + bo * 0.5; y[i] = bo - v; k = k + 1 === d ? 0 : k + 1; }
    }
    return y;
  };
  const wl = proc(L, 1), wr = proc(R, 1.031);
  let ed = 0, ew = 0; for (let i = 0; i < L.length; i++) { ed += L[i] * L[i] + R[i] * R[i]; ew += wl[i] * wl[i] + wr[i] * wr[i]; }
  const g = ew > 0 ? wet * Math.sqrt(ed / ew) : 0;
  for (let i = 0; i < L.length; i++) { L[i] += wl[i] * g; R[i] += wr[i] * g; }
}
const panL = (p) => Math.cos((clamp(p, -1, 1) + 1) * Math.PI / 4) * 1.4142;
const panR = (p) => Math.sin((clamp(p, -1, 1) + 1) * Math.PI / 4) * 1.4142;
function addPan(L, R, src, p, at = 0, g = 1) { add(L, src, g * panL(p), at); add(R, src, g * panR(p), at); }

// ---------------------------------------------------------------------------------------- recipes
// Each returns its channels ([mono] or [left, right]) for one take; the takes of a sound differ by seed.

// -- porcelain: light, heavy, crit. The hard contact; the glaze cracking (many short inharmonic modes,
// so a crack and never a note); the hollow figure knocking; her weight under it; micro-fractures.
function porcelain(r, k) {
  const len = [0.34, 0.6, 0.95][k], n = N(len), x = new Float32Array(n);
  addClick(x, r, 0, [0.0004, 0.0006, 0.0008][k], 1800, [0.55, 0.6, 0.65][k]);
  addCluster(x, r, { lo: 2300, hi: 11000, n: [14, 20, 24][k], tilt: 0.2, tau: [0.004, [0.009, 0.014, 0.016][k]], amp: [1.35, 1.9, 2.1][k] });
  addCluster(x, r, { lo: 480, hi: 1500, n: [5, 8, 9][k], tau: [0.006, [0.012, 0.018, 0.022][k]], amp: [0.4, 0.85, 0.95][k], at: 0.0004 });
  addStruck(x, r, r.u(880, 1150), 0.8, [0.007, 0.013, 0.015][k], { amp: [0.5, 1.05, 1.1][k] });
  addStruck(x, r, r.u(2100, 2700), 0.9, [0.004, 0.006, 0.007][k], { amp: [0.4, 0.55, 0.6][k] });
  addThud(x, r, [260, 210, 190][k], [0.02, 0.035, 0.045][k], { att: 0.001, amp: [0.32, 0.8, 0.9][k] });
  if (k) addThud(x, r, [0, 95, 80][k], [0, 0.05, 0.08][k], { att: 0.003, amp: [0, 0.35, 0.55][k] });
  add(x, grains(n, r, [6, 26, 40][k], 0, [0.012, 0.045, 0.07][k], { hp: 2400, lp: 12000, shape: 1.8, amp: [0.5, 0.65, 0.7][k] }));
  if (k === 2) { // it splits: a second crack a moment later, the split running, a glint
    const t2 = r.u(0.012, 0.018);
    addClick(x, r, t2, 0.0005, 2000, 0.8);
    addCluster(x, r, { at: t2, lo: 2000, hi: 11500, n: 16, tilt: 0.2, tau: [0.004, 0.016], amp: 1.3 });
    add(x, grains(n, r, 46, t2, 0.1, { hp: 2000, lp: 12000, shape: 1.5, amp: 0.6 }));
    const gl = noise(n, r); filt(gl, 'hp', 7000, 0.7); ad(gl, 0.004, 0.07, 0.006); add(x, gl, 0.05);
  }
  if (k) addTinkles(x, r, [0, 5, 11][k], 0.06, [0, 0.22, 0.45][k], { lo: 3500, hi: 9500, amp: [0, 0.22, 0.26][k], tau: [0.003, 0.012] });
  return finish([x], { drive: [1.6, 2.0, 2.3][k], hp: [70, 34, 30][k], lim: 0.38, rel: 0.004, peak: 0.95, fade: 0.03 });
}
// the gold you threw back bursting on her: a sparkler's fizz and a crackle of light, laid on a heavy hit
function goldBurst(r) {
  const n = N(0.55), x = new Float32Array(n);
  add(x, grains(n, r, 140, 0, 0.42, { hp: 2600, lp: 10000, shape: 1.7, fall: 0.9, amp: 0.8, dur: [0.0001, 0.0005] }));
  add(x, whoosh(n, r, { len: 0.5, f: [[0, 5200], [0.5, 2400]], e: [[0, 0], [0.01, 1], [0.5, 0]], pow: 2, q: 0.7, amp: 0.55 }));
  addThud(x, r, 300, 0.03, { amp: 0.45 });
  return finish([x], { drive: 1.4, hp: 200, peak: 0.95, fade: 0.05 });
}
// a chip off: a small sharp crack, then the chip skittering on the floor (each bounce sooner and softer)
function chip(r) {
  const n = N(0.62), x = new Float32Array(n);
  addClick(x, r, 0, 0.0003, 2500, 0.9);
  addCluster(x, r, { lo: 3000, hi: 9500, n: 10, tau: [0.003, 0.011], amp: 1 });
  add(x, grains(n, r, 6, 0, 0.008, { hp: 3000, lp: 12000, amp: 0.45 }));
  addThud(x, r, 340, 0.012, { amp: 0.3 });
  let t = r.u(0.1, 0.13), gap = r.u(0.085, 0.1), a = 0.55;
  for (let b = 0; b < 5; b++) {
    addClick(x, r, t, 0.00018, 3500, a * 0.6);
    addCluster(x, r, { at: t, lo: 3500, hi: 9800, n: 5, tau: [0.002, 0.006], amp: a });
    addStruck(x, r, 1900, 1.2, 0.002, { at: t, amp: a * 0.35 });
    t += gap; gap *= r.u(0.66, 0.76); a *= r.u(0.6, 0.72);
  }
  return finish([x], { drive: 1.3, hp: 300, lim: 0.4, rel: 0.004, peak: 0.95, fade: 0.04 });
}
// BREAK: a big piece of her coming away. The crack, the tear running, a boom; the piece hitting the
// floor and bouncing; fragments spraying left and right; the last bits settling.
function breakOff(r) {
  const n = N(1.6), L = new Float32Array(n), R = new Float32Array(n), x = new Float32Array(n);
  addClick(x, r, 0, 0.001, 1200, 1);
  addCluster(x, r, { lo: 1800, hi: 11500, n: 26, tilt: 0.2, tau: [0.004, 0.022], amp: 2.0 });
  addCluster(x, r, { at: 0.009, lo: 2000, hi: 11500, n: 18, tilt: 0.2, tau: [0.004, 0.018], amp: 1.4 });
  addCluster(x, r, { lo: 420, hi: 1300, n: 9, tau: [0.01, 0.022], amp: 1.0 });
  addStruck(x, r, 950, 0.7, 0.018, { amp: 1.1 });
  addStruck(x, r, 1650, 0.9, 0.01, { amp: 0.7 });
  addThud(x, r, 75, 0.12, { att: 0.004, amp: 0.7 });
  addThud(x, r, 170, 0.06, { att: 0.002, amp: 0.85 });
  add(x, grains(n, r, 110, 0, 0.2, { hp: 1800, lp: 12000, shape: 1.5, amp: 0.8 }));
  const tear = whoosh(n, r, { len: 0.2, f: [[0, 2600], [0.2, 1500]], e: [[0, 0], [0.004, 1], [0.2, 0]], pow: 2, q: 1.4, amp: 0.4, am: [230, 0.85] });
  add(x, tear);
  // the piece lands, bounces twice
  const tl = r.u(0.36, 0.44);
  [[tl, 0.85], [tl + r.u(0.15, 0.18), 0.4], [tl + r.u(0.26, 0.3), 0.2]].forEach(([t, a], i) => {
    addClick(x, r, t, 0.0006, 1500, a);
    addCluster(x, r, { at: t, lo: 1600, hi: 10000, n: 16 - i * 4, tilt: 0.2, tau: [0.004, 0.018], amp: a * 1.5 });
    addCluster(x, r, { at: t, lo: 320, hi: 950, n: 6, tau: [0.012, 0.035], amp: a * 0.6 });
    addThud(x, r, 130, 0.05 - i * 0.01, { at: t, att: 0.002, amp: a * 0.85 });
    add(x, grains(n, r, 30 - i * 8, t, 0.06, { hp: 2000, lp: 11000, shape: 1.6, amp: a * 0.6 }));
  });
  addPan(L, R, x, 0);
  addTinkles(L, r, 34, tl, 0.55, { lo: 3000, hi: 10000, amp: 0.2, tau: [0.003, 0.02], R, shape: 1.6 });
  addTinkles(L, r, 14, tl + 0.5, 0.6, { lo: 3500, hi: 11000, amp: 0.07, tau: [0.002, 0.01], R, shape: 1.2, fall: 0.6 });
  return finish([L, R], { drive: 2.0, hp: 30, lim: 0.4, rel: 0.005, peak: 0.95, fade: 0.08 });
}
// SHATTER: the finish. A huge crack and a boom; the whole figure collapsing (a crash of noise, hundreds
// of fractures and pieces); pieces landing all over; then a long tail of sparkle and glitter that sits
// under the song's last hit.
function shatter(r) {
  const len = 5.2, n = N(len), L = new Float32Array(n), R = new Float32Array(n), x = new Float32Array(n);
  addClick(x, r, 0, 0.0012, 900, 1);
  for (const [t, a] of [[0, 2.0], [0.008, 1.6], [0.019, 1.3]]) addCluster(x, r, { at: t, lo: 1500, hi: 12000, n: 24, tilt: 0.2, tau: [0.004, 0.024], amp: a });
  addCluster(x, r, { lo: 300, hi: 1100, n: 12, tau: [0.015, 0.04], amp: 1.1 });
  addThud(x, r, 60, 0.2, { att: 0.005, amp: 0.7 });
  addThud(x, r, 130, 0.09, { att: 0.002, amp: 0.85 });
  addStruck(x, r, 850, 0.6, 0.022, { amp: 1.0 });
  addStruck(x, r, 1350, 0.8, 0.025, { amp: 0.8 });
  // the heap: what's left of her coming down
  const th = r.u(0.28, 0.36);
  addThud(x, r, 105, 0.08, { at: th, att: 0.004, amp: 0.7 });
  addCluster(x, r, { at: th, lo: 300, hi: 950, n: 9, tau: [0.012, 0.03], amp: 0.8 });
  addCluster(x, r, { at: th, lo: 1800, hi: 9000, n: 16, tilt: 0.2, tau: [0.004, 0.016], amp: 1.0 });
  addPan(L, R, x, 0);
  for (const C of [L, R]) {
    const crash = noise(n, r); filt(crash, 'bp', 3200, 0.45); filt(crash, 'hs', 6000, 0.7, 3);
    pts(crash, [[0, 0], [0.004, 1], [0.12, 0.55], [0.7, 0.06], [1.2, 0]], 1.6); add(C, crash, 0.45);
    add(C, grains(n, r, 260, 0, 0.65, { hp: 1800, lp: 12500, shape: 1.6, amp: 0.75 }));
    add(C, grains(n, r, 70, th, 0.25, { hp: 1500, lp: 9000, shape: 1.4, amp: 0.5 }));
  }
  addTinkles(L, r, 130, 0, 0.85, { lo: 2000, hi: 11000, amp: 0.4, tau: [0.004, 0.03], R, shape: 1.4 });
  // pieces landing all over the floor
  for (let i = 0; i < 46; i++) {
    const u = Math.pow(r(), 1.5), t = 0.12 + 1.3 * u, a = 0.32 * r.u(0.3, 1) * (1 - 0.75 * u), p = r.u(-0.95, 0.95);
    const y = new Float32Array(N(0.08));
    addClick(y, r, 0, 0.00025, 2500, a);
    addCluster(y, r, { lo: 2000, hi: 8500, n: 4, tau: [0.003, 0.012], amp: a });
    addThud(y, r, 420, 0.008, { amp: a * 0.4 });
    addPan(L, R, y, p, t);
  }
  // the sparkle tail: thinning out over four seconds, wide
  addTinkles(L, r, 520, 0.25, len - 0.5, { lo: 4500, hi: 13000, amp: 0.11, tau: [0.002, 0.01], R, shape: 2.4, fall: 0.92, width: 1 });
  for (const C of [L, R]) { // glitter: a shimmer of air, flickering
    const g = noise(n, r); filt(g, 'hp', 8000, 0.7); filt(g, 'lp', 15000, 0.7);
    let fl = 0.5; for (let i = 0; i < n; i++) { if (i % 64 === 0) fl = 0.35 + 0.65 * r(); g[i] *= fl; }
    pts(g, [[0, 0], [0.25, 1], [1.2, 0.45], [3.2, 0.12], [len, 0]], 1); add(C, g, 0.018);
  }
  verb(L, R, { rt: 2.2, wet: 0.22, damp: 0.45, pre: 0.015 });
  return finish([L, R], { drive: 1.8, hp: 28, lim: 0.42, rel: 0.005, peak: 0.95, fade: 0.4 });
}

// -- the blade: A, B, C and the finisher. The copper ring cutting air (a band of noise that rises and
// falls as the blade passes, and the ring's own modes rung by the cut) and the body of her swing under
// it (low noise, struck slowly: weight with no note in it).
// (the body: her arm and the ring's mass moving, a low "whum" of air and a slow struck low noise)
function whum(n, r, at, len, tp, amp, f0 = 380, f1 = 650) {
  return whoosh(n, r, { at, len, f: [[0, f0], [tp, f1], [len, f0 * 1.05]], e: [[0, 0], [tp, 1], [len, 0]], pow: 1.8, q: 0.9, amp });
}
function swing(r, k) {
  if (k === 0 || k === 1) {
    const len = [0.3, 0.33][k], n = N(len), x = new Float32Array(n), tp = [0.055, 0.065][k];
    add(x, whoosh(n, r, { len: len - 0.02, f: [[0, [700, 600][k]], [tp, r.u(2050, 2350) * [1, 0.88][k]], [len - 0.02, [1150, 1000][k]]], e: [[0, 0], [tp, 1], [len - 0.02, 0]], pow: 2, q: 1.4, amp: 1 }));
    add(x, air(n, r, 0, len - 0.03, tp, 0.3, 1000, 7500));
    add(x, whum(n, r, 0.005, len - 0.04, tp, [0.55, 0.62][k], [380, 340][k], [640, 580][k]));
    addCopper(x, r, { at: 0.012, base: r.u(1120, 1240) * [1, 0.9][k], scrape: [0.08, 0.035, 0.035], amp: 0.6 });
    addThud(x, r, [230, 200][k], [0.07, 0.08][k], { at: 0.01, att: 0.025, amp: [0.85, 0.95][k] });
    return finish([x], { drive: 1.3, hp: 60, peak: 0.95, fade: 0.04 });
  }
  if (k === 2) { // C: a spin, so it passes twice
    const len = 0.46, n = N(len), x = new Float32Array(n);
    add(x, whoosh(n, r, { len: 0.2, f: [[0, 600], [0.06, 1800], [0.2, 1050]], e: [[0, 0], [0.06, 0.75], [0.2, 0]], pow: 2, q: 1.3, amp: 0.75 }));
    add(x, whoosh(n, r, { at: 0.13, len: 0.31, f: [[0, 650], [0.07, r.u(2200, 2500)], [0.31, 1100]], e: [[0, 0], [0.07, 1], [0.31, 0]], pow: 2, q: 1.35, amp: 1.05 }));
    add(x, air(n, r, 0.12, 0.3, 0.07, 0.35, 1000, 7500));
    add(x, whum(n, r, 0.02, 0.18, 0.06, 0.4));
    add(x, whum(n, r, 0.14, 0.3, 0.07, 0.65, 330, 600));
    addCopper(x, r, { at: 0.15, base: r.u(960, 1060), scrape: [0.1, 0.045, 0.045], amp: 0.65, tk: 1.3 });
    addThud(x, r, 165, 0.11, { at: 0.12, att: 0.04, amp: 1.05 });
    addThud(x, r, 92, 0.09, { at: 0.14, att: 0.03, amp: 0.4 });
    return finish([x], { drive: 1.4, hp: 50, peak: 0.95, fade: 0.05 });
  }
  // the finisher: a breath of wind-up, then the biggest cut, sparks off the edge, and real weight
  const len = 0.66, n = N(len), x = new Float32Array(n);
  add(x, whoosh(n, r, { len: 0.14, f: [[0, 480], [0.14, 1100]], e: [[0, 0], [0.12, 0.4], [0.14, 0.3]], pow: 1.5, q: 1, amp: 0.35 }));
  add(x, whoosh(n, r, { at: 0.1, len: 0.54, f: [[0, 600], [0.08, r.u(2500, 2800)], [0.54, 850]], e: [[0, 0], [0.08, 1], [0.54, 0]], pow: 2.2, q: 1.1, amp: 1.15 }));
  add(x, air(n, r, 0.1, 0.5, 0.08, 0.45, 1000, 8000));
  add(x, whum(n, r, 0.1, 0.5, 0.08, 0.75, 300, 560));
  addCopper(x, r, { at: 0.13, base: r.u(880, 960), scrape: [0.12, 0.055, 0.055], amp: 0.7, tk: 1.6 });
  add(x, grains(n, r, 22, 0.16, 0.22, { hp: 4000, lp: 12000, shape: 1.4, amp: 0.25 }));
  addThud(x, r, 135, 0.15, { at: 0.1, att: 0.05, amp: 1.2 });
  addThud(x, r, 75, 0.16, { at: 0.12, att: 0.04, amp: 0.55 });
  return finish([x], { drive: 1.5, hp: 40, peak: 0.95, fade: 0.06 });
}
// no rings on her wrists: a jab, a cross, a hook. Fists through air, no metal.
function fist(r, k) {
  const len = [0.2, 0.24, 0.3][k], n = N(len), x = new Float32Array(n), tp = [0.04, 0.05, 0.075][k];
  add(x, whoosh(n, r, { len: len - 0.01, f: [[0, 480], [tp, [1500, 1700, 1900][k] * r.u(0.95, 1.05)], [len - 0.01, 800]], e: [[0, 0], [tp, 1], [len - 0.01, 0]], pow: 2, q: 1.0, amp: 1 }));
  add(x, air(n, r, 0, len - 0.02, tp, 0.25, 900, 6000));
  add(x, whum(n, r, 0.004, len - 0.03, tp, [0.4, 0.45, 0.5][k]));
  addThud(x, r, [260, 230, 200][k], [0.045, 0.055, 0.07][k], { at: 0.008, att: 0.02, amp: [0.75, 0.85, 0.95][k] });
  return finish([x], { drive: 1.3, hp: 60, peak: 0.95, fade: 0.03 });
}

// -- CATCH: a snap, the energy taken into her hand, the copper ringing once; a perfect one glints.
function snapCatch(r, perfect) {
  const n = N(0.26), x = new Float32Array(n);
  addClick(x, r, 0, 0.00025, 2200, 1);
  addStruck(x, r, r.u(2700, 3100), 1.2, 0.006, { amp: 1.0 });
  addStruck(x, r, r.u(1400, 1600), 1.0, 0.007, { amp: 0.7 });
  addThud(x, r, 200, 0.024, { att: 0.001, amp: 0.6 });
  addCopper(x, r, { at: 0.001, base: r.u(2150, 2400), amps: [0.3, 0.5, 0.4, 0.2], taus: [0.026, 0.02, 0.014, 0.01], amp: perfect ? 0.4 : 0.25 });
  if (perfect) {
    addTinkles(x, r, 6, 0.004, 0.035, { lo: 7000, hi: 11500, amp: 0.2, tau: [0.004, 0.012], shape: 1 });
    add(x, whoosh(n, r, { at: 0.005, len: 0.14, f: [[0, 1600], [0.03, 4000], [0.14, 2600]], e: [[0, 0], [0.03, 1], [0.14, 0]], pow: 2, q: 1.1, amp: 0.3 }));
  }
  return finish([x], { drive: 1.5, hp: 90, lp: perfect ? 0 : 9000, lim: 0.42, rel: 0.004, peak: 0.95, fade: 0.03 });
}
// PARRY: copper meets her porcelain hand; she rocks back
function parry(r) {
  const n = N(0.5), x = new Float32Array(n);
  addClick(x, r, 0, 0.0005, 1600, 1);
  addCluster(x, r, { lo: 2300, hi: 9000, n: 12, tau: [0.004, 0.016], amp: 0.9 });
  addCopper(x, r, { base: r.u(1250, 1380), taus: [0.11, 0.08, 0.06, 0.04, 0.025, 0.014], amp: 0.65 });
  addThud(x, r, 165, 0.06, { att: 0.001, amp: 0.75 });
  addThud(x, r, 90, 0.07, { att: 0.002, amp: 0.4 });
  add(x, grains(n, r, 10, 0, 0.02, { hp: 2500, lp: 10000, amp: 0.4 }));
  add(x, whoosh(n, r, { at: 0.03, len: 0.3, f: [[0, 900], [0.06, 2200], [0.3, 1200]], e: [[0, 0], [0.06, 1], [0.3, 0]], pow: 2, q: 1.2, amp: 0.45 }));
  return finish([x], { drive: 1.6, hp: 50, lim: 0.45, rel: 0.004, peak: 0.95, fade: 0.04 });
}
// a catch that caught nothing: a little empty air, never a buzz
function whiff(r) {
  const n = N(0.17), x = new Float32Array(n);
  add(x, whoosh(n, r, { len: 0.16, f: [[0, 1200], [0.03, r.u(2400, 2800)], [0.16, 1700]], e: [[0, 0], [0.03, 1], [0.16, 0]], pow: 2, q: 0.9, amp: 1 }));
  add(x, air(n, r, 0, 0.15, 0.03, 0.3));
  return finish([x], { hp: 300, peak: 0.95, fade: 0.03 });
}
// DEFLECT: a hit that does nothing says so (FLARE's law: a dull thud, never a ghost). A dull hard knock,
// no crack at all, and the blade glancing off.
function deflect(r) {
  const n = N(0.36), x = new Float32Array(n);
  addClick(x, r, 0, 0.0004, 1200, 0.5);
  addStruck(x, r, r.u(640, 760), 0.9, 0.02, { amp: 1.2 });
  addStruck(x, r, r.u(1300, 1500), 1.0, 0.008, { amp: 0.55 });
  addThud(x, r, 210, 0.03, { att: 0.001, amp: 0.7 });
  addCopper(x, r, { at: 0.01, base: r.u(1650, 1800), taus: [0.04, 0.03, 0.022, 0.015, 0.01, 0.007], amp: 0.14 });
  add(x, whoosh(n, r, { at: 0.02, len: 0.24, f: [[0, 1200], [0.04, 2200], [0.24, 1500]], e: [[0, 0], [0.04, 1], [0.24, 0]], pow: 2, q: 1.3, amp: 0.2 }));
  return finish([x], { drive: 1.5, hp: 70, lp: 5500, lim: 0.45, rel: 0.004, peak: 0.95, fade: 0.03 });
}

// -- the ring and the gold
// the gold thrown back: a crack of release, then a roar of air moving away with sparks streaming off it
function throwBack(r) {
  const n = N(0.66), x = new Float32Array(n);
  addClick(x, r, 0, 0.0004, 2000, 0.6);
  addStruck(x, r, 2200, 1.0, 0.004, { amp: 0.55 });
  addThud(x, r, 150, 0.06, { att: 0.004, amp: 0.7 });
  add(x, whoosh(n, r, { len: 0.62, f: [[0, 1800], [0.035, r.u(2800, 3200)], [0.62, 700]], e: [[0, 0], [0.035, 1], [0.62, 0]], pow: 2.4, q: 1.1, amp: 1 }));
  add(x, air(n, r, 0, 0.55, 0.03, 0.4));
  add(x, grains(n, r, 80, 0.02, 0.5, { hp: 2600, lp: 9000, shape: 1.5, fall: 0.85, amp: 0.3 }));
  return finish([x], { drive: 1.4, hp: 60, peak: 0.95, fade: 0.06 });
}
// the RING thrown: it slips the wrist with a little metal, and cuts away
function ringThrow(r) {
  const n = N(0.42), x = new Float32Array(n);
  addClick(x, r, 0, 0.0003, 2500, 0.35);
  addCopper(x, r, { base: r.u(1200, 1320), scrape: [0.04, 0.01, 0.02], amp: 0.45, tk: 0.9 });
  add(x, whoosh(n, r, { len: 0.38, f: [[0, 900], [0.05, r.u(2700, 3100)], [0.38, 1700]], e: [[0, 0], [0.05, 1], [0.38, 0]], pow: 2, q: 1.3, amp: 0.95 }));
  add(x, air(n, r, 0, 0.36, 0.05, 0.3));
  addThud(x, r, 240, 0.04, { at: 0.005, att: 0.01, amp: 0.45 });
  return finish([x], { drive: 1.3, hp: 70, peak: 0.95, fade: 0.04 });
}
// the ring in flight, spinning: a whir that beats at the spin and a low whum under it (one second that
// loops without a seam; the player sets its rate for the doppler)
function ringHum(r) {
  const n = N(1), x = new Float32Array(n), spin = 22;
  const hi = noise(n, r), lo = noise(n, r), sing = noise(n, r);
  circ(hi, (y) => { filt(y, 'bp', 1650, 1.8); filt(y, 'bp', 1650, 1.2); });
  circ(lo, (y) => { filt(y, 'bp', 520, 1.4); filt(y, 'bp', 520, 1.0); });
  circ(sing, (y) => { const z = Float32Array.from(y); y.fill(0); for (const [m, a] of [[1, 1], [2.828, 0.6], [5.423, 0.3]]) { const w = resonate(z, 1240 * m, 0.08); let p = 0; for (let i = 0; i < w.length; i++) p = Math.max(p, Math.abs(w[i])); for (let i = 0; i < w.length; i++) y[i] += w[i] * a / p; } });
  rmsPeakTo(hi, 1, 0.05); rmsPeakTo(lo, 1, 0.05); rmsPeakTo(sing, 1, 0.05);
  for (let i = 0; i < n; i++) {
    const ph = TAU * spin * i / n * (n / SR), a = 0.5 + 0.5 * Math.cos(ph), b = 0.5 + 0.5 * Math.cos(ph - 0.9);
    x[i] = hi[i] * (0.25 + 0.75 * a * a) * 0.6 + lo[i] * (0.15 + 0.85 * b * b * b) * 0.55 + sing[i] * 0.07;
  }
  norm([x], 0.9);
  return [x];
}
// the ring coming home: air rushing nearer, a zip that quickens
function ringReturn(r) {
  const n = N(0.38), x = new Float32Array(n);
  add(x, whoosh(n, r, { len: 0.37, f: [[0, 800], [0.32, r.u(3200, 3600)], [0.37, 2600]], e: [[0, 0], [0.32, 1], [0.37, 0]], pow: 2.2, q: 1.25, amp: 1, am: [(t) => 25 + 140 * t, 0.45] }));
  add(x, air(n, r, 0, 0.37, 0.32, 0.35));
  return finish([x], { drive: 1.2, hp: 120, peak: 0.95, fade: 0.012 });
}
// and onto the wrist: a metal tick and a little copper, a tight knock (a real latch is laid on top)
function ringCatch(r) {
  const n = N(0.24), x = new Float32Array(n);
  addClick(x, r, 0, 0.0003, 2400, 0.7);
  addCopper(x, r, { base: r.u(2450, 2700), amps: [0.35, 0.5, 0.35, 0.2], taus: [0.022, 0.018, 0.013, 0.009], amp: 0.3 });
  addStruck(x, r, 3400, 1.4, 0.003, { amp: 0.65 });
  addThud(x, r, 220, 0.015, { att: 0.001, amp: 0.45 });
  return finish([x], { drive: 1.3, hp: 120, lim: 0.55, rel: 0.008, peak: 0.95, fade: 0.03 });
}

// -- moving
// DASH: a short cut through air
function dash(r) {
  const n = N(0.21), x = new Float32Array(n);
  add(x, whoosh(n, r, { len: 0.2, f: [[0, 1500], [0.03, r.u(3800, 4400)], [0.2, 2200]], e: [[0, 0], [0.028, 1], [0.2, 0]], pow: 2.2, q: 1.0, amp: 1 }));
  const fuff = noise(n, r); filt(fuff, 'lp', 900, 0.7); filt(fuff, 'hp', 120, 0.7); ad(fuff, 0.008, 0.04, 0); rmsPeakTo(fuff, 0.6, 0.008); add(x, fuff);
  return finish([x], { drive: 1.2, hp: 100, lp: 9000, peak: 0.95, fade: 0.03 });
}
// NEAR MISS: it goes past you close: a crisp flyby and a glint at the closest point
function nearMiss(r) {
  const n = N(0.56), x = new Float32Array(n);
  add(x, whoosh(n, r, { len: 0.46, f: [[0, 1500], [0.12, r.u(3900, 4500)], [0.46, 1800]], e: [[0, 0], [0.12, 1], [0.46, 0]], pow: 1.8, q: 1.2, amp: 1 }));
  add(x, air(n, r, 0.02, 0.4, 0.1, 0.35, 1500, 10000));
  addTinkles(x, r, 8, 0.1, 0.035, { lo: 6500, hi: 12000, amp: 0.32, tau: [0.004, 0.016], shape: 1 });
  const sh = noise(n, r); filt(sh, 'hp', 8500, 0.7); ad(sh, 0.02, 0.12, 0.1); rmsPeakTo(sh, 0.12, 0.01); add(x, sh);
  return finish([x], { drive: 1.2, hp: 200, peak: 0.95, fade: 0.06 });
}

// -- being hurt: only this sounds like this. A slap of contact, a blow you feel in the chest, the air
// knocked out of her. (The body of a real punch is laid under it at play time; the ears ringing is its
// own sound, hurt-ring.)
function hurt(r) {
  const n = N(0.7), x = new Float32Array(n);
  addClick(x, r, 0, 0.0005, 1500, 0.9);
  addStruck(x, r, r.u(1700, 1950), 0.8, 0.014, { amp: 1.2 });
  addStruck(x, r, 3400, 1.0, 0.006, { amp: 0.6 });
  addStruck(x, r, 900, 0.9, 0.016, { amp: 0.75 });
  add(x, grains(n, r, 24, 0, 0.035, { hp: 1200, lp: 6000, shape: 1.4, amp: 0.6 }));
  addThud(x, r, 85, 0.09, { att: 0.002, amp: 0.75 });
  addThud(x, r, 170, 0.045, { att: 0.001, amp: 0.7 });
  const hw = noise(n, r); filtv(hw, 'lp', (t) => 1400 * Math.pow(220 / 1400, Math.min(1, t / 0.25)), 0.8); ad(hw, 0.004, 0.09, 0.006); rmsPeakTo(hw, 0.5, 0.01); add(x, hw);
  return finish([x], { drive: 2.0, hp: 35, lim: 0.45, rel: 0.004, peak: 0.95, fade: 0.08 });
}
// the ears ringing for a moment after (two close tones beating, high and very quiet)
function hurtRing(r) {
  const n = N(0.9), x = new Float32Array(n), f = 3520 + r.u(-20, 20);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(TAU * f * t) + 0.7 * Math.sin(TAU * (f + 6.5) * t + 1); }
  pts(x, [[0, 0], [0.03, 0], [0.07, 1], [0.3, 0.6], [0.9, 0]], 1.6);
  return finish([x], { peak: 0.95, fade: 0.1 });
}
// a heart gone: the little glass heart cracking, and a heartbeat (lub, dub)
function heartLost(r) {
  const n = N(0.62), x = new Float32Array(n);
  addClick(x, r, 0, 0.0003, 2500, 0.8);
  addCluster(x, r, { lo: 2800, hi: 11000, n: 14, tilt: 0.2, tau: [0.003, 0.012], amp: 2.6 });
  add(x, grains(n, r, 18, 0, 0.03, { hp: 2600, lp: 12000, shape: 1.5, amp: 0.85 }));
  // lub, dub: low enough to feel, with enough of the chest in it (150-300 Hz) to hear on small speakers
  addThud(x, r, 95, 0.05, { at: 0.07, att: 0.006, amp: 0.55 });
  addThud(x, r, 210, 0.025, { at: 0.07, att: 0.004, amp: 0.45 });
  addThud(x, r, 110, 0.04, { at: 0.3, att: 0.006, amp: 0.4 });
  addThud(x, r, 230, 0.02, { at: 0.3, att: 0.004, amp: 0.3 });
  return finish([x], { drive: 1.5, hp: 30, lim: 0.4, rel: 0.004, peak: 0.95, fade: 0.05 });
}
// a heart back (a new section): a shimmer rising (two notes of the chord go on top of it at play time)
function sparkleUp(r) {
  const n = N(0.6), x = new Float32Array(n);
  for (let i = 0; i < 12; i++) { const u = i / 11, t = 0.01 + 0.16 * u; addMode(x, r.u(0.9, 1.1) * (3200 + 4800 * u), r.u(0.01, 0.024), 0.2 * (0.6 + 0.4 * u), t); }
  const sw = noise(n, r); filt(sw, 'bp', 5200, 0.9); pts(sw, [[0, 0], [0.18, 1], [0.6, 0]], 1.6); rmsPeakTo(sw, 0.06, 0.02); add(x, sw);
  return finish([x], { hp: 1500, lp: 11000, peak: 0.95, fade: 0.1 });
}

// -- death and the rewind
// the record knocked: the needle jumps (a short scratch across the grooves) and the arm bumps
function deathBump(r) {
  const n = N(0.6), x = new Float32Array(n);
  addClick(x, r, 0, 0.0006, 1000, 0.6);
  add(x, whoosh(n, r, { len: 0.16, f: [[0, 2600], [0.12, 650], [0.16, 600]], e: [[0, 0], [0.004, 1], [0.16, 0]], pow: 1.6, q: 3, amp: 0.75, am: [45, 0.6] }));
  addThud(x, r, 95, 0.06, { at: 0.004, att: 0.003, amp: 0.85 });
  add(x, grains(n, r, 30, 0, 0.3, { hp: 800, lp: 7000, shape: 1.6, amp: 0.35 }));
  return finish([x], { drive: 1.6, hp: 30, peak: 0.95, fade: 0.08 });
}
// a record's surface with the music gone: pops, a little hiss, the faintest rumble (four seconds that loop)
function crackleBed(r) {
  const len = 4, n = N(len), L = new Float32Array(n), R = new Float32Array(n);
  const pop = (C, i, a) => { const m = N(r.u(0.0001, 0.0006)) + 3; for (let j = 0; j < m; j++) { const w = Math.sin(Math.PI * (j + 0.5) / m); C[(i + j) % n] += (r() * 2 - 1) * w * a; } };
  for (let k = 0; k < 34 * len; k++) { const a = Math.pow(r(), 3.5), i = Math.floor(r() * n); pop(L, i, a); pop(R, (i + N(0.0003)) % n, a * r.u(0.5, 1)); }
  for (let k = 0; k < 40 * len; k++) { pop(r() < 0.5 ? L : R, Math.floor(r() * n), Math.pow(r(), 4) * 0.6); }
  for (const C of [L, R]) circ(C, (y) => { filt(y, 'hp', 700, 0.7); filt(y, 'lp', 7500, 0.7); });
  for (const C of [L, R]) {
    const h = noise(n, r); circ(h, (y) => { filt(y, 'bp', 4200, 0.6); }); rmsPeakTo(h, 0.035, 0.1);
    const rb = noise(n, r); circ(rb, (y) => { filt(y, 'lp', 60, 0.7); filt(y, 'hp', 25, 0.7); }); rmsPeakTo(rb, 0.015, 0.1);
    for (let i = 0; i < n; i++) C[i] += h[i] + rb[i];
  }
  norm([L, R], 0.9);
  return [L, R];
}
// the DJ's hand pulling the record back: needle friction following the speed of the rewind in
// audio.js (slow, fast, slowing), and the grooves buzzing past (1.2 s; played faster or slower to fit)
function rewindScratch(r) {
  const len = 1.2, n = N(len), L = new Float32Array(n), R = new Float32Array(n);
  const rate = (t) => { const u = t / len; return u < 0.55 ? 0.25 + (1.25 - 0.25) * u / 0.55 : 1.25 + (0.6 - 1.25) * (u - 0.55) / 0.45; };
  for (const [C, d] of [[L, 1], [R, 1.04]]) {
    const y = noise(n, r); filtv(y, 'bp', (t) => 520 * d * rate(t), 2.6); filtv(y, 'bp', (t) => 520 * d * rate(t), 1.6);
    const z = noise(n, r); filtv(z, 'bp', (t) => 2600 * d * rate(t), 1.8);
    let ph = 0; for (let i = 0; i < n; i++) { ph += TAU * 70 * rate(i / SR) / SR; y[i] = y[i] * (1 - 0.55 * (0.5 + 0.5 * Math.cos(ph))) + z[i] * 0.35; }
    pts(y, [[0, 0], [0.04, 1], [len * 0.55, 1], [len - 0.12, 0.7], [len, 0]], 1); rmsPeakTo(y, 1, 0.02);
    add(C, y);
    add(C, grains(n, r, 90, 0, len, { hp: 900, lp: 8000, amp: 0.35 }));
  }
  return finish([L, R], { drive: 1.3, hp: 90, peak: 0.95, fade: 0.06 });
}

// -- SPOTLIGHT
// the stage lights slamming on: a contactor's metal clack, the weight of it, the arc catching, the hall
function spotClunk(r) {
  const n = N(1.5), L = new Float32Array(n), R = new Float32Array(n), x = new Float32Array(n);
  addClick(x, r, 0, 0.0009, 700, 1);
  addStruck(x, r, 1400, 0.7, 0.018, { amp: 1.2 });
  addStruck(x, r, 3200, 0.8, 0.009, { amp: 0.7 });
  addCluster(x, r, { lo: 650, hi: 4200, n: 10, tau: [0.012, 0.035], amp: 1.1 });
  addThud(x, r, 80, 0.11, { att: 0.003, amp: 0.65 });
  addThud(x, r, 160, 0.07, { att: 0.002, amp: 0.85 });
  addStruck(x, r, 2100, 1.0, 0.006, { at: 0.06, amp: 0.55 });
  addClick(x, r, 0.06, 0.0004, 1500, 0.4);
  add(x, grains(n, r, 40, 0.01, 0.07, { hp: 3000, lp: 11000, amp: 0.4 }));
  const zap = noise(n, r); filt(zap, 'bp', 5000, 1.2); let ph = 0; for (let i = 0; i < n; i++) { ph += TAU * 120 / SR; zap[i] *= 0.5 + 0.5 * Math.sign(Math.sin(ph)); }
  ad(zap, 0.003, 0.03, 0.012); rmsPeakTo(zap, 0.18, 0.005); add(x, zap);
  addPan(L, R, x, 0);
  verb(L, R, { rt: 1.8, wet: 0.35, damp: 0.4, pre: 0.02 });
  return finish([L, R], { drive: 2.4, hp: 30, lim: 0.42, rel: 0.005, peak: 0.95, fade: 0.2 });
}
// the lamps' hum while the light is on you: mains hum and the buzz of the arc (two seconds that loop;
// pitched to the song's key at play time)
function spotHum(r) {
  const n = N(2), x = new Float32Array(n), f0 = 60;
  const amps = [0.5, 0.45, 0.5, 0.35, 0.35, 0.25, 0.22, 0.16, 0.13, 0.1, 0.08, 0.06, 0.05, 0.04];
  for (let h = 1; h <= amps.length; h++) addHarm(x, f0 * h, amps[h - 1], r() * TAU);
  const buzz = new Float32Array(n); for (let i = 0; i < n; i++) { const s = Math.abs(Math.sin(TAU * f0 * i / SR)); buzz[i] = Math.pow(s, 24) - 0.16; }
  circ(buzz, (y) => { filt(y, 'bp', 2600, 0.8); }); rmsPeakTo(buzz, 0.35, 0.05);
  const hiss = noise(n, r); circ(hiss, (y) => { filt(y, 'hp', 3000, 0.7); }); rmsPeakTo(hiss, 0.03, 0.05);
  for (let i = 0; i < n; i++) x[i] += buzz[i] + hiss[i];
  norm([x], 0.9);
  return [x];
}
function addHarm(x, f, a, ph) { const w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w); let re = Math.cos(ph) * a, im = Math.sin(ph) * a; for (let i = 0; i < x.length; i++) { x[i] += im; const nr = re * c - im * s; im = re * s + im * c; re = nr; } }
// a crowd catching its breath: thirty people gasping at once (breath through the vowel of "huh"), then
// murmuring
function crowdGasp(r) {
  const len = 1.5, n = N(len), L = new Float32Array(n), R = new Float32Array(n);
  const voice = (at, dur, size, a, p, kind) => {
    const m = N(dur), y = noise(m, r), F1 = 640 * size, F2 = 1280 * size, F3 = 2650 * size;
    const glide = kind === 'gasp' ? 0.28 : 0.05;
    const b1 = filtv(Float32Array.from(y), 'bp', (t) => F1 * (1 + glide * Math.min(1, t / dur)), 2.4);
    const b2 = filtv(Float32Array.from(y), 'bp', (t) => F2 * (1 + glide * 0.7 * Math.min(1, t / dur)), 3.2);
    const b3 = filt(Float32Array.from(y), 'bp', F3, 4);
    const br = filt(Float32Array.from(y), 'hp', 3800, 0.7);
    const v = new Float32Array(m); for (let i = 0; i < m; i++) v[i] = b1[i] + 0.75 * b2[i] + 0.3 * b3[i] + 0.2 * br[i];
    if (kind === 'gasp') ad(v, r.u(0.02, 0.05), r.u(0.06, 0.13), 0);
    else { let sy = 0, e = 0; for (let i = 0; i < m; i++) { if (i % 64 === 0) { sy += 64 / SR * r.u(3, 6); e = 0.4 + 0.6 * Math.abs(Math.sin(Math.PI * sy)); } v[i] *= e; } pts(v, [[0, 0], [dur * 0.3, 1], [dur, 0]], 1.5); }
    rmsPeakTo(v, a, 0.02);
    const yL = new Float32Array(n), yR = new Float32Array(n); addPan(yL, yR, v, p, at); add(L, yL); add(R, yR);
  };
  for (let k = 0; k < 30; k++) voice(0.01 + Math.abs(r.g()) * 0.045 + (r() < 0.2 ? r.u(0.05, 0.14) : 0), r.u(0.22, 0.4), r.u(0.82, 1.28), r.u(0.35, 1), r.u(-0.9, 0.9), 'gasp');
  for (let k = 0; k < 12; k++) voice(r.u(0.3, 0.55), r.u(0.5, 0.9), r.u(0.85, 1.2), r.u(0.12, 0.25), r.u(-0.9, 0.9), 'murmur');
  // and the "oh!" that comes out with it: voices, each its own pitch (men and women), up into it and down
  // out of it, through the vowel of "oh", a little breath in each. A crowd: never two together, no chord.
  for (let k = 0; k < 26; k++) {
    const at = 0.05 + Math.abs(r.g()) * 0.06 + r() * 0.06, dur = r.u(0.42, 0.75), m = N(dur);
    const f0 = r() < 0.5 ? r.u(105, 165) : r.u(185, 290), size = r.u(0.88, 1.16), vib = r.u(4.5, 6.5), vd = r.u(0.006, 0.016);
    const y = new Float32Array(m); let ph = r();
    for (let i = 0; i < m; i++) { // a band-limited saw (polyBLEP) for the voice
      const t = i / SR, f = f0 * (1 + 0.13 * (1 - Math.exp(-t / 0.05))) * (1 - 0.2 * t / dur) * (1 + vd * Math.sin(TAU * vib * t));
      const dt = f / SR; ph += dt; if (ph >= 1) ph -= 1;
      let v = 2 * ph - 1;
      if (ph < dt) { const q = ph / dt; v -= q + q - q * q - 1; } else if (ph > 1 - dt) { const q = (ph - 1) / dt; v -= q * q + q + q + 1; }
      y[i] = v + (r() * 2 - 1) * 0.18;
    }
    filt(y, 'lp', 3200, 0.6);
    const v1 = filt(Float32Array.from(y), 'bp', 470 * size, 5), v2 = filt(Float32Array.from(y), 'bp', 860 * size, 8), v3 = filt(Float32Array.from(y), 'bp', 2600 * size, 12);
    for (let i = 0; i < m; i++) y[i] = v1[i] + 0.5 * v2[i] + 0.12 * v3[i];
    ad(y, r.u(0.05, 0.09), r.u(0.16, 0.3), 0);
    rmsPeakTo(y, r.u(0.18, 0.4), 0.03);
    const yL = new Float32Array(n), yR = new Float32Array(n); addPan(yL, yR, y, r.u(-0.9, 0.9), at); add(L, yL); add(R, yR);
  }
  return finish([L, R], { hp: 150, lp: 7000, peak: 0.95, fade: 0.15 });
}
// the spotlight meter full: a soft swell that lifts and opens, once (no beep)
function meterFull(r) {
  const n = N(0.7), x = new Float32Array(n);
  add(x, whoosh(n, r, { len: 0.6, f: [[0, 700], [0.42, 5200], [0.6, 6000]], e: [[0, 0], [0.42, 1], [0.6, 0]], pow: 2, q: 1.6, amp: 0.8 }));
  addTinkles(x, r, 10, 0.36, 0.12, { lo: 5500, hi: 11000, amp: 0.25, tau: [0.006, 0.03], shape: 1 });
  addThud(x, r, 160, 0.08, { at: 0.38, att: 0.03, amp: 0.35 });
  return finish([x], { hp: 150, peak: 0.95, fade: 0.08 });
}

// -- what she throws: each shape its own sound (they are many, so short and soft)
function shot(r, kind) {
  const len = { petal: 0.3, heart: 0.32, shard: 0.3, card: 0.24, pill: 0.3, kiss: 0.4, orb: 0.3, star: 0.28, note: 0.34 }[kind] || 0.3;
  const n = N(len), x = new Float32Array(n);
  if (kind === 'petal') { // silk flicked: two soft flicks and a fluttering swish
    addStruck(x, r, r.u(3900, 4500), 1.4, 0.004, { amp: 0.6 });
    addStruck(x, r, r.u(3300, 3800), 1.2, 0.005, { at: r.u(0.022, 0.032), amp: 0.45 });
    add(x, whoosh(n, r, { len: 0.28, f: [[0, 1800], [0.05, 2600], [0.28, 1900]], e: [[0, 0], [0.05, 1], [0.28, 0]], pow: 2, q: 1, amp: 0.75, am: [38, 0.55] }));
  } else if (kind === 'heart') { // plush and round: a soft thump, a muffled pop, a breath of air
    addThud(x, r, 420, 0.04, { att: 0.004, amp: 0.9 });
    const pop = noise(n, r); filtv(pop, 'bp', (t) => 1600 * Math.pow(0.45, Math.min(1, t / 0.03)), 1.4); ad(pop, 0.002, 0.02, 0); rmsPeakTo(pop, 0.75, 0.005); add(x, pop);
    add(x, whoosh(n, r, { at: 0.02, len: 0.28, f: [[0, 1100], [0.05, 1800], [0.28, 1000]], e: [[0, 0], [0.05, 1], [0.28, 0]], pow: 2, q: 1, amp: 0.5 }));
  } else if (kind === 'shard') { // a glass flick: thin, high, sharp
    addClick(x, r, 0, 0.0002, 4000, 0.6);
    addCluster(x, r, { lo: 2800, hi: 8000, n: 9, tau: [0.006, 0.02], amp: 0.85 });
    addStruck(x, r, r.u(2900, 3300), 1.6, 0.004, { amp: 0.6 });
    add(x, grains(n, r, 6, 0, 0.006, { hp: 3500, lp: 11000, amp: 0.4 }));
    add(x, whoosh(n, r, { len: 0.26, f: [[0, 4000], [0.03, 6000], [0.26, 4300]], e: [[0, 0], [0.025, 1], [0.26, 0]], pow: 2, q: 2, amp: 0.5 }));
  } else if (kind === 'card') { // a card snapped off the deck: a crisp paper snap and a fast flick of air
    addClick(x, r, 0, 0.0003, 2000, 0.5);
    addStruck(x, r, r.u(2400, 2800), 1.2, 0.003, { amp: 0.85 });
    addStruck(x, r, 5200, 1.5, 0.0015, { amp: 0.4 });
    add(x, whoosh(n, r, { len: 0.2, f: [[0, 2500], [0.02, 4500], [0.2, 3000]], e: [[0, 0], [0.02, 1], [0.2, 0]], pow: 2, q: 1.1, amp: 0.6, am: [55, 0.35] }));
  } else if (kind === 'pill') { // a capsule rattled out: three small plastic clicks and a little puff
    for (const [t, a] of [[0, 0.8], [r.u(0.018, 0.026), 0.55], [r.u(0.038, 0.048), 0.4]]) addStruck(x, r, r.u(3500, 4100), 2, 0.0016, { at: t, amp: a });
    addStruck(x, r, 1500, 1.5, 0.004, { amp: 0.5 });
    const puff = noise(n, r); filt(puff, 'lp', 900, 0.7); ad(puff, 0.003, 0.022, 0.002); rmsPeakTo(puff, 0.5, 0.005); add(x, puff);
    add(x, whoosh(n, r, { at: 0.02, len: 0.26, f: [[0, 1800], [0.04, 3000], [0.26, 2000]], e: [[0, 0], [0.04, 1], [0.26, 0]], pow: 2, q: 1.1, amp: 0.35 }));
  } else if (kind === 'kiss') { // lips: a breath held, the smack, the lips opening, and it goes
    const mm = noise(n, r); filt(mm, 'lp', 320, 0.7); pts(mm, [[0, 0], [0.045, 1], [0.052, 0], [len, 0]], 1); rmsPeakTo(mm, 0.22, 0.01); add(x, mm);
    addClick(x, r, 0.05, 0.00035, 1000, 0.8);
    addStruck(x, r, r.u(1950, 2250), 1.3, 0.005, { at: 0.05, amp: 0.75 });
    addStruck(x, r, 1100, 1.0, 0.008, { at: 0.05, amp: 0.45 });
    const wah = noise(n, r); filtv(wah, 'bp', (t) => 900 * Math.pow(1.9, clamp((t - 0.06) / 0.1, 0, 1)), 2.2); ad(wah, 0.008, 0.04, 0.06); rmsPeakTo(wah, 0.35, 0.01); add(x, wah);
    add(x, whoosh(n, r, { at: 0.1, len: 0.3, f: [[0, 1300], [0.06, 1900], [0.3, 1300]], e: [[0, 0], [0.06, 1], [0.3, 0]], pow: 2, q: 1, amp: 0.3 }));
  } else if (kind === 'star') { // a twinkle thrown
    addTinkles(x, r, 6, 0, 0.03, { lo: 5000, hi: 9500, amp: 0.4, tau: [0.006, 0.02], shape: 1 });
    add(x, whoosh(n, r, { len: 0.26, f: [[0, 2800], [0.03, 4200], [0.26, 3000]], e: [[0, 0], [0.03, 1], [0.26, 0]], pow: 2, q: 1.2, amp: 0.5 }));
  } else if (kind === 'note') { // a breath sung out: "hoo"
    const v = noise(n, r); const a = filt(Float32Array.from(v), 'bp', 420, 2.5), b = filt(Float32Array.from(v), 'bp', 900, 3); for (let i = 0; i < n; i++) v[i] = a[i] + 0.6 * b[i];
    ad(v, 0.02, 0.08, 0); rmsPeakTo(v, 0.7, 0.01); add(x, v);
    add(x, whoosh(n, r, { len: 0.3, f: [[0, 1100], [0.05, 1800], [0.3, 1100]], e: [[0, 0], [0.05, 1], [0.3, 0]], pow: 2, q: 1, amp: 0.4 }));
  } else { // orb: a round "whum"
    add(x, whoosh(n, r, { len: 0.28, f: [[0, 600], [0.05, 820], [0.28, 600]], e: [[0, 0], [0.04, 1], [0.28, 0]], pow: 2, q: 1.2, amp: 0.8 }));
    addThud(x, r, 300, 0.035, { att: 0.006, amp: 0.5 });
    add(x, air(n, r, 0, 0.25, 0.04, 0.2));
  }
  return finish([x], { drive: 1.2, hp: 110, peak: 0.95, fade: 0.04 });
}
// telegraph cues: PINK a soft warm tock, WHITE a colder glassy tick
function tele(r, white) {
  const n = N(white ? 0.12 : 0.1), x = new Float32Array(n);
  if (!white) {
    addStruck(x, r, r.u(1100, 1200), 1.3, 0.009, { att: 0.001, amp: 1.1 });
    addThud(x, r, 260, 0.012, { att: 0.001, amp: 0.4 });
    addStruck(x, r, 2300, 1.5, 0.003, { amp: 0.3 });
    return finish([x], { drive: 1.4, hp: 90, lp: 6000, lim: 0.38, rel: 0.003, peak: 0.95, fade: 0.02 });
  }
  addClick(x, r, 0, 0.00015, 3500, 0.5);
  addStruck(x, r, r.u(4300, 4700), 2.2, 0.0045, { amp: 1.0 });
  addStruck(x, r, r.u(2500, 2700), 2.0, 0.003, { amp: 0.45 });
  addCluster(x, r, { lo: 5200, hi: 8500, n: 5, tau: [0.006, 0.012], amp: 0.45 });
  const a = noise(n, r); filt(a, 'hp', 6500, 0.7); filt(a, 'lp', 11000, 0.7); ad(a, 0.001, 0.014, 0); rmsPeakTo(a, 0.12, 0.005); add(x, a);
  return finish([x], { drive: 1.4, hp: 600, lp: 12000, lim: 0.38, rel: 0.003, peak: 0.95, fade: 0.02 });
}
// the boss winding up: air drawn in, rising to the moment it lands (1.2 s, played so it ends on the beat)
function windup(r) {
  const len = 1.2, n = N(len), x = new Float32Array(n);
  const y = noise(n, r); filtv(y, 'bp', (t) => 350 * Math.pow(2400 / 350, Math.min(1, t / 1.15)), 1.3);
  pts(y, [[0, 0], [1.17, 1], [len, 0]], 2.4); rmsPeakTo(y, 1, 0.01); add(x, y);
  const a = noise(n, r); filt(a, 'hp', 1500, 0.7); pts(a, [[0, 0], [1.17, 1], [len, 0]], 3); rmsPeakTo(a, 0.3, 0.01); add(x, a);
  const lo = noise(n, r); filt(lo, 'lp', 150, 0.7); filt(lo, 'hp', 35, 0.7); pts(lo, [[0, 0], [1.17, 1], [len, 0]], 3); rmsPeakTo(lo, 0.5, 0.02); add(x, lo);
  return finish([x], { drive: 1.2, hp: 30, peak: 0.95, fade: 0.012 });
}
// her blow landing on the floor: a boom, the floor knocking, a little porcelain, the stage rattling
function slam(r) {
  const n = N(0.8), x = new Float32Array(n);
  addClick(x, r, 0, 0.0006, 1200, 0.7);
  addThud(x, r, 72, 0.09, { att: 0.003, amp: 0.7 });
  addThud(x, r, 145, 0.06, { att: 0.002, amp: 0.85 });
  addStruck(x, r, r.u(750, 880), 0.8, 0.022, { amp: 1.1 });
  addStruck(x, r, 1700, 1.0, 0.012, { amp: 0.65 });
  addCluster(x, r, { lo: 2000, hi: 8000, n: 12, tilt: 0.2, tau: [0.004, 0.014], amp: 1.2 });
  add(x, grains(n, r, 32, 0.01, 0.25, { hp: 1500, lp: 7000, shape: 1.4, amp: 0.5 }));
  return finish([x], { drive: 2.2, hp: 30, lim: 0.4, rel: 0.004, peak: 0.95, fade: 0.08 });
}

// -- the glimmer: a quiet bell (a struck bar: its fundamental, and the bar's own high partials dying
// fast for the ping). Rendered at a few notes and played up to two semitones off them.
const BELL_LO = 74, BELL_STEP = 3, BELL_N = 11; // MIDI 74 (D5) .. 104
function bell(r, i) {
  const midi = BELL_LO + i * BELL_STEP, f = 440 * Math.pow(2, (midi - 69) / 12);
  const n = N(1.5), x = new Float32Array(n);
  for (const [m, a, tau] of [[1, 1, 0.6], [2, 0.08, 0.22], [2.76, 0.2, 0.09], [5.4, 0.09, 0.035], [8.93, 0.045, 0.015]]) addMode(x, f * m, tau, a, 0, 0.0015);
  const mallet = noise(N(0.004), r); filt(mallet, 'lp', 7000, 0.7); ad(mallet, 0.0005, 0.0008, 0); add(x, mallet, 0.05);
  return finish([x], { peak: 0.95, fade: 0.2 });
}

// -- the menus
function uiSound(r, kind) {
  if (kind === 'hover') { // a tiny felt-damped tick
    const n = N(0.05), x = new Float32Array(n);
    addStruck(x, r, r.u(2250, 2550), 1.6, 0.0016, { amp: 0.7 });
    addStruck(x, r, 5200, 2, 0.0009, { amp: 0.3 });
    return finish([x], { hp: 400, lim: 0.6, rel: 0.004, peak: 0.95, fade: 0.01 });
  }
  if (kind === 'select') { // a crisp lacquer tock
    const n = N(0.12), x = new Float32Array(n);
    addClick(x, r, 0, 0.0002, 2500, 0.4);
    addStruck(x, r, r.u(1450, 1550), 1.1, 0.006, { amp: 1.0 });
    addStruck(x, r, 3300, 1.4, 0.0035, { amp: 0.6 });
    addThud(x, r, 280, 0.008, { amp: 0.35 });
    return finish([x], { hp: 150, lim: 0.6, rel: 0.006, peak: 0.95, fade: 0.02 });
  }
  if (kind === 'confirm') { // a heavier clack, and a glassy bloom off it
    const n = N(0.6), x = new Float32Array(n);
    addClick(x, r, 0, 0.0003, 2000, 0.5);
    addStruck(x, r, 1200, 1.1, 0.006, { amp: 1 });
    addStruck(x, r, 2800, 1.3, 0.003, { amp: 0.6 });
    addThud(x, r, 150, 0.035, { att: 0.002, amp: 0.8 });
    addTinkles(x, r, 9, 0.01, 0.09, { lo: 3800, hi: 7500, amp: 0.22, tau: [0.008, 0.026], shape: 1.2 });
    const sw = noise(n, r); filt(sw, 'bp', 4500, 0.9); ad(sw, 0.015, 0.12, 0.01); rmsPeakTo(sw, 0.07, 0.02); add(x, sw);
    return finish([x], { drive: 1.2, hp: 60, lim: 0.55, rel: 0.008, peak: 0.95, fade: 0.08 });
  }
  // back: softer, and down
  const n = N(0.16), x = new Float32Array(n);
  addStruck(x, r, r.u(980, 1060), 1.1, 0.005, { amp: 0.8 });
  addStruck(x, r, r.u(700, 760), 1.0, 0.006, { at: 0.045, amp: 0.6 });
  addThud(x, r, 200, 0.012, { amp: 0.4 });
  return finish([x], { hp: 100, lp: 6000, lim: 0.6, rel: 0.006, peak: 0.95, fade: 0.02 });
}
// the needle dropped on the record: the cue lever, the stylus touching down, the lead-in crackle
function needleDrop(r) {
  const len = 1.8, n = N(len), L = new Float32Array(n), R = new Float32Array(n), x = new Float32Array(n);
  addStruck(x, r, 2500, 1.5, 0.0015, { amp: 0.3 });
  addThud(x, r, 110, 0.035, { at: 0.08, att: 0.003, amp: 0.8 });
  addClick(x, r, 0.08, 0.00025, 3000, 0.35);
  add(x, whoosh(n, r, { at: 0.082, len: 0.05, f: [[0, 3000], [0.05, 2500]], e: [[0, 0], [0.005, 1], [0.05, 0]], q: 0.8, amp: 0.25 }));
  addPan(L, R, x, 0);
  for (const C of [L, R]) {
    const cr = new Float32Array(n);
    for (let k = 0; k < 42; k++) { const t = 0.09 + r() * (len - 0.1), i = N(t), m = N(r.u(0.0001, 0.0005)) + 3, a = Math.pow(r(), 3) * (1 - 0.6 * (t / len)); if (i + m < n) for (let j = 0; j < m; j++) cr[i + j] += (r() * 2 - 1) * Math.sin(Math.PI * (j + 0.5) / m) * a; }
    filt(cr, 'hp', 700, 0.7); filt(cr, 'lp', 7500, 0.7); rmsPeakTo(cr, 0.35, 0.004);
    const h = noise(n, r); filt(h, 'bp', 4200, 0.6); rmsPeakTo(h, 0.03, 0.05);
    const env = new Float32Array(n).fill(1); pts(env, [[0, 0], [0.085, 0], [0.15, 1], [len, 0.15]], 1);
    for (let i = 0; i < n; i++) C[i] += (cr[i] + h[i]) * env[i];
  }
  return finish([L, R], { hp: 40, peak: 0.95, fade: 0.25 });
}
// the record spinning up: the start button, the platter's whirr rising, a low rumble coming in
function recordSpin(r) {
  const len = 1.3, n = N(len), x = new Float32Array(n);
  addStruck(x, r, 2000, 1.2, 0.002, { amp: 0.7 });
  addStruck(x, r, 900, 1, 0.004, { amp: 0.45 });
  addThud(x, r, 180, 0.012, { amp: 0.45 });
  const w = noise(n, r); filtv(w, 'bp', (t) => 140 * Math.pow(650 / 140, Math.min(1, t / 0.9)), 4); filtv(w, 'bp', (t) => 140 * Math.pow(650 / 140, Math.min(1, t / 0.9)), 2);
  pts(w, [[0, 0], [0.05, 0], [0.9, 1], [len, 0]], 1.6); rmsPeakTo(w, 0.45, 0.02); add(x, w);
  const rb = noise(n, r); filt(rb, 'lp', 70, 0.7); filt(rb, 'hp', 25, 0.7); pts(rb, [[0, 0], [0.9, 1], [len, 0]], 1.5); rmsPeakTo(rb, 0.3, 0.05); add(x, rb);
  const sh = noise(n, r); filt(sh, 'bp', 4000, 0.8); pts(sh, [[0, 0], [0.06, 1], [0.35, 0], [len, 0]], 1); rmsPeakTo(sh, 0.15, 0.01); add(x, sh);
  return finish([x], { hp: 25, peak: 0.95, fade: 0.15 });
}

// -- applause (SIDECHAIN's crowd: each person's own hands, pace and place). One clap: a few ms of noise
// rung through a resonance, low for cupped hands and high for flat ones; all the same energy.
function clap(r, i) {
  const len = N(0.06), b = new Float32Array(len);
  const fc = 620 * Math.pow(4.2, (i + r()) / 36), Q = 1.8 + 3.2 * r();
  const w = TAU * fc / SR, al = Math.sin(w) / (2 * Q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
  const att = Math.max(1, Math.round(SR * (0.0003 + 0.0007 * r())));
  const body = Math.exp(-1 / (SR * (0.0028 + 0.005 * r()))), snap = Math.exp(-1 / (SR * 0.0012)), crack = 0.25 + 0.35 * r();
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, e = 1, es = 1, prev = 0, sum = 0;
  for (let k = 0; k < len; k++) {
    const a = k < att ? k / att : 1;
    if (k >= att) { e *= body; es *= snap; }
    const wn = r() * 2 - 1, xx = wn * e * a, y = b0 * xx + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xx; y2 = y1; y1 = y;
    const v = y + crack * 0.5 * (wn - prev) * es * a; prev = wn; b[k] = v; sum += v * v;
  }
  const s = Math.sqrt(0.0009 * SR / (sum || 1)); for (let k = 0; k < len; k++) b[k] *= s;
  return [b];
}
// a whistle through the fingers: up into it, a wobble, off (sometimes a short one first)
function whistle(r) {
  const f1 = 2500 + 900 * r(), notes = r() < 0.4 ? [[0, 0.16, 0.78, 1], [0.24, 0.55 + 0.3 * r(), 0.85, 1.04]] : [[0, 0.5 + 0.5 * r(), 0.72, 1]];
  const total = notes[notes.length - 1][0] + notes[notes.length - 1][1] + 0.05, n = N(total), x = new Float32Array(n);
  for (const [dt, len, from, to] of notes) {
    const i0 = N(dt), m = N(len), f = f1 * to, vib = 5 + 2 * r(); let ph = 0;
    const br = noise(m, r); filt(br, 'bp', f, 5); rmsPeakTo(br, 0.6, 0.02);
    for (let j = 0; j < m; j++) {
      const t = j / SR, rise = Math.min(1, t / Math.min(0.18, len * 0.45)), fall = Math.max(0, (t - len * 0.8) / (len * 0.2));
      const fi = f1 * from * Math.pow(to / from, rise) * (1 - 0.1 * fall) * (1 + 0.012 * Math.sin(TAU * vib * t));
      ph += TAU * fi / SR;
      const env = Math.min(1, t / 0.03) * Math.min(1, (len - t) / 0.06);
      if (i0 + j < n) x[i0 + j] += (Math.sin(ph) + br[j]) * env;
    }
  }
  return finish([x], { hp: 900, peak: 0.95, fade: 0.02 });
}
// the roar under the clapping when it went well: voices with no words (four seconds that loop)
function roar(r) {
  const n = N(4), L = new Float32Array(n), R = new Float32Array(n);
  for (const C of [L, R]) {
    const src = noise(n, r);
    for (const [f, q, w] of [[650, 2.2, 1], [1150, 2.6, 0.7], [2500, 3.5, 0.25]]) {
      const y = Float32Array.from(src); const ff = f * (0.94 + 0.12 * r()); circ(y, (z) => filt(z, 'bp', ff, q)); rmsPeakTo(y, w, 0.05);
      for (let i = 0; i < n; i++) C[i] += y[i];
    }
    for (let v = 0; v < 8; v++) { // a few voices in it, rising and falling like words
      const y = noise(n, r), f = r.lu(450, 2200); circ(y, (z) => { filt(z, 'bp', f, 5); });
      let e = 0, target = 0; for (let i = 0; i < n; i++) { if (i % 256 === 0) target = r() < 0.55 ? r() : 0.05; e += (target - e) * 0.004; y[i] *= e; }
      rmsPeakTo(y, 0.25, 0.1); for (let i = 0; i < n; i++) C[i] += y[i];
    }
    for (let i = 0; i < n; i++) C[i] *= 1 + 0.22 * Math.sin(TAU * 0.75 * i / SR + (C === L ? 0 : 1.3));
  }
  norm([L, R], 0.9);
  return [L, R];
}

// name: [takes, recipe(rng, take)]
const RECIPES = {
  'strike-a': [3, (r) => swing(r, 0)], 'strike-b': [3, (r) => swing(r, 1)], 'strike-c': [3, (r) => swing(r, 2)], 'strike-f': [2, (r) => swing(r, 3)],
  jab: [3, (r) => fist(r, 0)], cross: [3, (r) => fist(r, 1)], hook: [3, (r) => fist(r, 2)],
  'hit-light': [5, (r) => porcelain(r, 0)], 'hit-heavy': [4, (r) => porcelain(r, 1)], 'hit-crit': [3, (r) => porcelain(r, 2)],
  'gold-burst': [3, goldBurst], chip: [4, chip], break: [2, breakOff], shatter: [1, shatter],
  'catch-perfect': [3, (r) => snapCatch(r, true)], 'catch-good': [3, (r) => snapCatch(r, false)], parry: [3, parry], whiff: [3, whiff], deflect: [3, deflect],
  'throw-back': [3, throwBack], 'ring-throw': [3, ringThrow], 'ring-hum': [1, ringHum], 'ring-return': [2, ringReturn], 'ring-catch': [3, ringCatch],
  dash: [4, dash], 'near-miss': [3, nearMiss],
  hurt: [3, hurt], 'hurt-ring': [1, hurtRing], 'heart-lost': [2, heartLost], 'heart-back': [1, sparkleUp],
  'death-bump': [1, deathBump], crackle: [1, crackleBed], rewind: [1, rewindScratch],
  'spot-clunk': [1, spotClunk], 'spot-hum': [1, spotHum], 'spot-gasp': [1, crowdGasp], 'meter-full': [1, meterFull],
  'shot-petal': [3, (r) => shot(r, 'petal')], 'shot-heart': [3, (r) => shot(r, 'heart')], 'shot-shard': [3, (r) => shot(r, 'shard')],
  'shot-card': [3, (r) => shot(r, 'card')], 'shot-pill': [3, (r) => shot(r, 'pill')], 'shot-kiss': [3, (r) => shot(r, 'kiss')],
  'shot-orb': [3, (r) => shot(r, 'orb')], 'shot-star': [2, (r) => shot(r, 'star')], 'shot-note': [2, (r) => shot(r, 'note')],
  'tele-pink': [3, (r) => tele(r, false)], 'tele-white': [3, (r) => tele(r, true)], windup: [2, windup], slam: [3, slam],
  bell: [BELL_N, bell],
  'ui-hover': [4, (r) => uiSound(r, 'hover')], 'ui-select': [3, (r) => uiSound(r, 'select')], 'ui-confirm': [2, (r) => uiSound(r, 'confirm')],
  'ui-back': [3, (r) => uiSound(r, 'back')], 'needle-drop': [1, needleDrop], 'record-spin': [1, recordSpin],
  clap: [36, clap], whistle: [4, whistle], roar: [1, roar],
};

// Every take of one sound, at sample rate sr: [[channel, ...], ...]
export function synth(name, sr) {
  SR = sr;
  const [takes, fn] = RECIPES[name];
  const out = [];
  for (let i = 0; i < takes; i++) out.push(fn(rng(hash(name) + i * 7919 + VERSION * 104729), i));
  if (!UNLEVELLED.has(name)) levelTakes(out);
  return out;
}
// takes of one sound as loud as each other: each one's loudest 50 ms (weighted toward the presence
// band the way the ear is), brought down to the quietest take's
const UNLEVELLED = new Set(['bell', 'clap']);
function levelTakes(takes) {
  if (takes.length < 2) return;
  const loud = takes.map((chs) => {
    const w = Math.max(16, N(0.05)); let best = 0;
    const y = chs.map((c) => filt(filt(Float32Array.from(c), 'hs', 1700, 0.71, 4), 'hp', 40, 0.5));
    for (let i = 0; i + w <= y[0].length; i += w >> 2) { let s = 0; for (const c of y) for (let j = i; j < i + w; j++) s += c[j] * c[j]; if (s > best) best = s; }
    return Math.sqrt(best);
  });
  const lo = Math.min(...loud);
  takes.forEach((chs, k) => { const g = lo / (loud[k] || 1); for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= g; });
}
export const SOUND_NAMES = Object.keys(RECIPES);

// in a worker, this file synthesizes on request
const IN_WORKER = typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope; // eslint-disable-line no-undef
if (IN_WORKER) {
  self.onmessage = (e) => {
    const { sr, names } = e.data;
    for (const name of names) {
      try {
        const takes = synth(name, sr);
        self.postMessage({ name, takes }, takes.flat().map((a) => a.buffer));
      } catch (err) { self.postMessage({ name, error: String(err && err.stack || err) }); }
    }
    self.postMessage({ done: true });
  };
}

// ---------------------------------------------------------------------------------------- playing
// Recordings (Kenney, CC0; assets/sfx/LICENSE-kenney.txt): name -> files
const RECORDINGS = {
  'k-punch': ['punch-0.ogg', 'punch-1.ogg', 'punch-2.ogg', 'punch-3.ogg'],
  'k-latch': ['latch.ogg'],
  'k-cloth': ['cloth-0.ogg', 'cloth-1.ogg', 'cloth-2.ogg'],
  'k-page': ['page-0.ogg', 'page-1.ogg'],
};

// The mix: each sound's level (linear, before the sfx bus). Set from tools/sfx-render.mjs's level table.
const MIX = {
  'strike-a': 0.48, 'strike-b': 0.46, 'strike-c': 0.44, 'strike-f': 0.5, jab: 0.38, cross: 0.41, hook: 0.4,
  'hit-light': 0.9, 'hit-heavy': 1.29, 'hit-crit': 1.25, 'gold-burst': 1.08, chip: 1.4, break: 0.8, shatter: 0.84,
  'catch-perfect': 1.1, 'catch-good': 1.16, parry: 0.93, whiff: 0.35, deflect: 0.9,
  'throw-back': 0.55, 'ring-throw': 0.43, 'ring-hum': 0.6, 'ring-return': 0.46, 'ring-catch': 0.96,
  dash: 0.45, 'near-miss': 0.5, hurt: 0.85, 'hurt-ring': 0.045, 'heart-lost': 1.38, 'heart-back': 0.26,
  'death-bump': 1.0, crackle: 0.61, rewind: 0.33, 'spot-clunk': 0.73, 'spot-hum': 0.16, 'spot-gasp': 0.41, 'meter-full': 0.35,
  'shot-petal': 0.65, 'shot-heart': 0.88, 'shot-shard': 0.95, 'shot-card': 0.6, 'shot-pill': 0.78, 'shot-kiss': 1.1, 'shot-orb': 0.66, 'shot-star': 0.47, 'shot-note': 0.6,
  'tele-pink': 1.37, 'tele-white': 1.33, windup: 0.53, slam: 0.96, bell: 0.22,
  'ui-hover': 1.24, 'ui-select': 1.08, 'ui-confirm': 0.67, 'ui-back': 0.86, 'needle-drop': 0.79, 'record-spin': 0.45,
  'k-punch': 1.2, 'k-latch': 0.77, 'k-cloth': 0.58, 'k-page': 1.13,
};
// how close together the same sound may start (s) and what a second one inside that gets (0 = skipped)
const GATE = {
  'hit-light': [0.03, 0.5], 'hit-heavy': [0.04, 0.5], 'hit-crit': [0.06, 0.4], chip: [0.1, 0.45], 'gold-burst': [0.05, 0],
  'tele-pink': [0.06, 0], 'tele-white': [0.06, 0], 'ui-hover': [0.04, 0], dash: [0.06, 0.6], whiff: [0.1, 0], 'near-miss': [0.12, 0],
  'heart-lost': [0.12, 0.8], hurt: [0.15, 0], slam: [0.06, 0], bell: [0.22, 0],
};
for (const k of [...SOUND_NAMES.filter((s) => s.startsWith('shot-')), 'k-page']) GATE[k] = [0.045, 0];
// sounds whose pitch must stay where it was made (notes, loops pitched on purpose)
const NO_JITTER = new Set(['bell', 'spot-hum', 'ring-hum', 'crackle', 'hurt-ring', 'clap', 'whistle', 'roar']);
const STEP = { A: 0, B: 1, C: 2, F: 3, a: 0, b: 1, c: 2, f: 3, finisher: 3 };
const SHAPE_NAMES = ['orb', 'heart', 'petal', 'shard', 'ring', 'note', 'kiss', 'star', 'pill', 'card']; // projectiles.js SHAPES
const GRADE = { D: 0.1, C: 0.32, B: 0.55, A: 0.78, S: 1 };
const CLAP = 0.36 * 1.5, ROAR = 0.5 * 1.5; // (SIDECHAIN's levels, 3.5 dB up: this game's songs are louder)

export class Sfx {
  constructor(audio, { bank } = {}) {
    this.audio = audio; this.ctx = audio.ctx;
    this.bank = bank || { sr: this.ctx.sampleRate, map: new Map() };
    this.out = audio.sfx;                       // world sounds: the sfx bus, with its room send
    this.uiOut = this.ctx.createGain();         // menus: the same level, dry
    this.uiOut.gain.value = audio.sfx.gain.value;
    this.uiOut.connect(audio.sfxVol);
    this.mix = { ...MIX };
    this.voices = 0; this.maxVoices = 72;
    this._last = new Map(); this._at = new Map();
    this.beats = null; this.chords = null; this.keyRoot = 0; this.keyMode = 'min';
    this.listener = { x: 0, z: 0, span: 12 };
    this._crowd = null; this._crackle = null; this._loops = new Set();
    this.base = new URL('../../assets/sfx/', import.meta.url).href;
  }

  // ---------- loading ----------
  // Synthesizes every sound (in a worker when it can) and fetches the recordings. onProgress(0..1).
  async load(opts = {}) {
    if (this.bank.ready) return this;
    if (!this.bank.loading) this.bank.loading = this._load(opts);
    await this.bank.loading;
    return this;
  }
  async _load({ onProgress, worker = true } = {}) {
    const names = SOUND_NAMES.filter((k) => !this.bank.map.has(k));
    let done = 0; const total = names.length + 1;
    const tick = () => { done++; if (onProgress) onProgress(Math.min(1, done / total)); };
    const recs = this._loadRecordings().then(tick);
    let ok = false;
    if (worker && typeof Worker !== 'undefined') {
      try { await this._synthInWorker(names, tick); ok = true; } catch (e) { console.warn('sfx: worker failed, synthesizing here:', e && e.message); }
    }
    if (!ok) {
      for (const name of names) {
        if (this.bank.map.has(name)) continue;
        this._store(name, synth(name, this.ctx.sampleRate)); tick();
        await new Promise((res) => setTimeout(res, 0)); // let a frame through
      }
    }
    await recs;
    this.bank.ready = true;
  }
  _synthInWorker(names, tick) {
    return new Promise((resolve, reject) => {
      let w;
      try { w = new Worker(import.meta.url, { type: 'module' }); } catch (e) { reject(e); return; }
      const timer = setTimeout(() => { w.terminate(); reject(new Error('timed out')); }, 60000);
      w.onmessage = (e) => {
        const d = e.data;
        if (d.done) { clearTimeout(timer); w.terminate(); resolve(); return; }
        if (d.error) { console.warn('sfx: ' + d.name + ': ' + d.error); return; }
        this._store(d.name, d.takes); tick();
      };
      w.onerror = (e) => { clearTimeout(timer); w.terminate(); reject(new Error(e.message || 'worker error')); };
      w.postMessage({ sr: this.ctx.sampleRate, names });
    });
  }
  _store(name, takes) {
    const sr = this.ctx.sampleRate;
    this.bank.map.set(name, takes.map((chs) => {
      const b = new AudioBuffer({ length: chs[0].length, numberOfChannels: chs.length, sampleRate: sr });
      chs.forEach((c, i) => b.copyToChannel(c, i));
      return b;
    }));
  }
  async _loadRecordings() {
    await Promise.all(Object.entries(RECORDINGS).map(async ([name, files]) => {
      if (this.bank.map.has(name)) return;
      const bufs = [];
      for (const f of files) {
        try {
          const res = await fetch(this.base + f);
          if (!res.ok) throw new Error(res.status);
          bufs.push(await this.ctx.decodeAudioData(await res.arrayBuffer()));
        } catch (e) { console.warn('sfx: no recording ' + f + ' (' + (e && e.message) + '); that layer is left out'); }
      }
      if (bufs.length) this.bank.map.set(name, bufs);
    }));
  }

  // ---------- the song (for the glimmer and the hum) ----------
  setSong(beatMap, chords) {
    this.beats = beatMap || null; this.chords = chords || null;
    this.keyRoot = (chords && chords.keyRoot) ?? (beatMap && beatMap.keyRoot) ?? 0;
    this.keyMode = (chords && chords.keyMode) || (beatMap && beatMap.keyMode) || 'min';
  }
  // [root 0..11, 'maj'|'min'] sounding at song time t (the nearest beat's chord)
  chordAt(t) {
    const C = this.chords && this.chords.beats;
    if (C && C.length && this.beats) { const i = clamp(Math.round(this.beats.beatAt(t)), 0, C.length - 1); return C[i]; }
    return [this.keyRoot, this.keyMode];
  }
  // the AudioContext time at which song time t comes out (for scheduling a sound on a beat)
  timeOfSong(t) { return this.audio.t0 + t; }

  // ---------- placing ----------
  listen(x, z, span = 12) { this.listener.x = x; this.listener.z = z; this.listener.span = span; }
  place(x, z) {
    const L = this.listener, dx = x - L.x, dz = z - L.z;
    return { pan: clamp(dx / L.span, -1, 1) * 0.85, dist: Math.hypot(dx, dz) / L.span };
  }

  // ---------- one buffer, played ----------
  // key, { pan, panTo, panDur, gain, rate, at, time, dist, x, z, out, room, offset, take, jitter, lp }
  play(key, o = {}) {
    const takes = this.bank.map.get(key);
    if (!takes || !takes.length) return null;
    const c = this.ctx, now = c.currentTime;
    if (o.x !== undefined && o.z !== undefined) { const p = this.place(o.x, o.z); o = { pan: p.pan, dist: p.dist, ...o }; }
    let gain = (o.gain ?? 1) * (this.mix[key] ?? 0.5);
    // nothing carries from far away
    const dist = o.dist || 0;
    if (dist > 1.6) return null;
    if (dist > 0.35) { const d = dist - 0.35; gain *= 1 / (1 + 2.4 * d * d); }
    const t = Math.max(now, o.time ?? now + (o.at || 0));
    const g0 = GATE[key];
    if (g0) {
      const last = this._at.get(key);
      if (last !== undefined && Math.abs(t - last) < g0[0]) { if (!g0[1]) return null; gain *= g0[1]; } else this._at.set(key, t);
    }
    if (this.voices >= this.maxVoices && !o.must) return null;
    // a take, never the same one twice running
    let i = o.take ?? 0;
    if (o.take === undefined && takes.length > 1) { const prev = this._last.get(key) ?? -1; i = Math.floor(Math.random() * (takes.length - 1)); if (i >= prev) i++; i %= takes.length; }
    this._last.set(key, i);
    const buf = takes[i % takes.length];
    const jit = o.jitter ?? !NO_JITTER.has(key);
    const rate = (o.rate ?? 1) * (jit ? 1 + (Math.random() - 0.5) * 0.05 : 1);
    if (jit) gain *= 1 + (Math.random() - 0.5) * 0.18;
    const src = c.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = c.createGain(); g.gain.value = gain;
    let head = src;
    let lp = null;
    if (o.lp || dist > 0.6) {
      lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
      lp.frequency.value = o.lp || 16000 * (1 - 0.72 * clamp((dist - 0.6) / 0.9, 0, 1));
      head.connect(lp); head = lp;
    }
    const p = c.createStereoPanner();
    const pan = clamp(o.pan || 0, -1, 1);
    p.pan.setValueAtTime(pan, t);
    if (o.panTo !== undefined) p.pan.linearRampToValueAtTime(clamp(o.panTo, -1, 1), t + (o.panDur ?? buf.duration / rate * 0.6));
    head.connect(g).connect(p).connect(o.out || this.out);
    let send = null;
    if (o.room) { send = c.createGain(); send.gain.value = o.room; p.connect(send).connect(this.audio.room); }
    src.start(t, o.offset || 0);
    this.voices++;
    src.onended = () => { this.voices--; src.disconnect(); if (lp) lp.disconnect(); g.disconnect(); p.disconnect(); if (send) send.disconnect(); };
    return { src, gain: g, panner: p, time: t, end: t + (buf.duration - (o.offset || 0)) / rate };
  }
  // a buffer looped, with a handle: set({ pan, rate, vr, gain, dist }), stop(fade, after)
  loop(key, o = {}) {
    const takes = this.bank.map.get(key);
    if (!takes || !takes.length) return { set() {}, stop() {}, alive: false };
    const c = this.ctx, A = this.audio, buf = takes[0], t = Math.max(c.currentTime, o.time ?? c.currentTime + (o.at || 0));
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true; src.playbackRate.value = o.rate ?? 1;
    const g = c.createGain(), p = c.createStereoPanner();
    const level = () => (this.mix[key] ?? 0.3) * (h.gain ?? 1) * (h.dist > 0.35 ? 1 / (1 + 2.4 * (h.dist - 0.35) ** 2) : 1);
    const h = { alive: true, gain: o.gain ?? 1, dist: o.dist || 0, src, node: g };
    p.pan.value = clamp(o.pan || 0, -1, 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.setTargetAtTime(level(), t, (o.fadeIn ?? 0.03) / 3);
    src.connect(g).connect(p).connect(o.out || this.out);
    src.start(t, (o.offset ?? Math.random()) * buf.duration % buf.duration);
    this.voices++;
    h.set = (s = {}) => {
      if (!h.alive) return;
      if (s.pan !== undefined) A.glide(p.pan, clamp(s.pan, -1, 1), 0.03, 0.01);
      if (s.gain !== undefined) h.gain = s.gain;
      if (s.dist !== undefined) h.dist = s.dist;
      if (s.gain !== undefined || s.dist !== undefined) A.glide(g.gain, level(), 0.04, 0.002);
      // doppler: vr is how fast it comes toward you (world units/s); or give the rate itself
      const rate = s.rate ?? (s.vr !== undefined ? 1 + 0.18 * Math.tanh(s.vr / 18) : undefined);
      if (rate !== undefined) A.glide(src.playbackRate, (o.rate ?? 1) * rate, 0.04, 0.003);
    };
    h.stop = (fade = 0.08, after = 0) => {
      if (!h.alive) return;
      h.alive = false;
      const at = c.currentTime + after;
      g.gain.cancelScheduledValues(at); g.gain.setTargetAtTime(0.0001, at, fade / 3);
      try { src.stop(at + fade * 2 + 0.05); } catch (e) { /* stopped */ }
      this._loops.delete(h);
    };
    src.onended = () => { this.voices--; src.disconnect(); g.disconnect(); p.disconnect(); };
    this._loops.add(h);
    return h;
  }
  stopAll(fade = 0.1) { for (const h of [...this._loops]) h.stop(fade); this.stopApplause(fade); }

  // when a sound starts: its time, or now plus at, plus dt (layers of one sound keep their spacing)
  _t(o = {}, dt = 0) { const now = this.ctx.currentTime; return Math.max(now, o.time ?? now + (o.at || 0)) + dt; }

  // a sound's common options -> play's. intensity 0..1 (quieter toward 0; up to 1.25 for showstoppers);
  // a gain in extra is relative (a layer's share), on top of the caller's gain and the intensity
  _o(o = {}, extra = {}) {
    const k = clamp(o.intensity ?? 1, 0, 1.25), { gain: share = 1, ...rest } = extra;
    return { ...o, ...rest, gain: (o.gain ?? 1) * share * (0.42 + 0.58 * k) };
  }

  // ---------- YOU: the blade ----------
  // step: 0..3 or 'A' 'B' 'C' 'F' (the finisher). dir: which way she faces (+1 right, -1 left): the
  // cut sweeps across. { unarmed: true } with both rings thrown: a jab, a cross, a hook.
  strike(step = 0, o = {}) {
    const k = typeof step === 'string' ? STEP[step] ?? 0 : clamp(step | 0, 0, 3);
    const pan = o.pan || 0, d = (o.dir ?? 1) * (k === 1 ? -1 : 1);
    if (o.unarmed) {
      const key = ['jab', 'cross', 'hook'][Math.min(2, k)];
      this.play('k-cloth', this._o(o, { gain: 0.8 }));
      return this.play(key, this._o(o, { pan: pan - 0.15 * d, panTo: pan + 0.15 * d }));
    }
    const key = ['strike-a', 'strike-b', 'strike-c', 'strike-f'][k];
    const w = [0.22, 0.22, 0.3, 0.36][k];
    return this.play(key, this._o(o, { pan: pan - w * d, panTo: pan + w * d, panDur: [0.16, 0.18, 0.3, 0.32][k] }));
  }
  // a hit on porcelain. weight: 'light' | 'heavy' | 'crit'; gold: the gold you threw back, bursting
  impact(o = {}) {
    const w = o.weight || (o.crit ? 'crit' : o.heavy ? 'heavy' : 'light');
    const v = this.play(w === 'crit' ? 'hit-crit' : w === 'heavy' ? 'hit-heavy' : 'hit-light', this._o(o, { must: true }));
    if (o.gold) this.play('gold-burst', this._o(o));
    return v;
  }
  hit(o = {}) { return this.impact(o); }
  chip(o = {}) { const p = o.pan || 0; return this.play('chip', this._o(o, { panTo: p + (o.away ?? (Math.random() < 0.5 ? -0.35 : 0.35)), panDur: 0.45 })); }
  // BREAK: a big piece of her comes off for good
  breakOff(o = {}) { return this.play('break', this._o(o, { must: true, room: 0.15 })); }
  // SHATTER: the finish, on the song's last hit (pass time: sfx.timeOfSong(lastHit))
  shatter(o = {}) { return this.play('shatter', this._o(o, { must: true, room: 0.3, jitter: false })); }

  // ---------- YOU: catching and the ring ----------
  catch(o = {}) { return this.play(o.perfect === false || o.quality === 'good' ? 'catch-good' : 'catch-perfect', this._o(o, { must: true })); }
  parry(o = {}) { return this.play('parry', this._o(o, { must: true })); }
  whiff(o = {}) { return this.play('whiff', this._o(o)); }
  deflect(o = {}) { return this.play('deflect', this._o(o, { must: true })); }
  // the gold thrown back at her: from where you are (pan) toward her (toPan)
  throwBack(o = {}) { const p = o.pan || 0; return this.play('throw-back', this._o(o, { panTo: o.toPan ?? p, panDur: o.dur ?? 0.45 })); }
  // a ring thrown; returns its hum (a loop handle: hum.set({ pan, vr, dist }) each frame, hum.stop())
  ringThrow(o = {}) {
    const p = o.pan || 0, t = this._t(o);
    this.play('ring-throw', this._o(o, { time: t, panTo: o.toPan ?? p, panDur: 0.3 }));
    return this.ringHum({ ...o, time: t + 0.06 });
  }
  ringHum(o = {}) { return this.loop('ring-hum', { pan: o.pan, time: this._t(o), gain: (o.intensity ?? 1), fadeIn: 0.12 }); }
  ringReturn(o = {}) { const p = o.pan || 0; return this.play('ring-return', this._o(o, { panTo: o.toPan ?? p, panDur: 0.34 })); }
  ringCatch(o = {}) { this.play('k-latch', this._o(o)); return this.play('ring-catch', this._o(o)); }

  // ---------- YOU: moving ----------
  dash(o = {}) { this.play('k-cloth', this._o(o, { gain: 0.6, rate: 1.15 })); return this.play('dash', this._o(o)); }
  // the attack went past you close: from: the side it came from (pan), it passes to the other
  nearMiss(o = {}) { const p = o.pan || 0, from = o.from ?? -0.5; return this.play('near-miss', this._o(o, { pan: p + from, panTo: p - from, panDur: 0.3 })); }

  // ---------- YOU: hurt, hearts, death ----------
  // only this sounds like this. (The music's muffle is audio.muffle(), the game's call.)
  hurt(o = {}) {
    const big = !!o.big; // a big one (two hearts) is heavier and lower
    this.play('k-punch', this._o(o, { must: true, gain: big ? 1.35 : 1, rate: big ? 0.9 : 1 }));
    this.play('hurt-ring', this._o(o, { must: true, gain: big ? 1.4 : 1, jitter: false }));
    return this.play('hurt', this._o(o, { must: true, gain: big ? 1.3 : 1, rate: big ? 0.92 : 1 }));
  }
  heartLost(o = {}) { return this.play('heart-lost', this._o(o, { must: true })); }
  // a heart back at a new section: a shimmer and two notes of the chord (t: the song time)
  heartBack(o = {}) {
    const t = this._t(o);
    this.play('heart-back', this._o(o, { time: t }));
    this.glimmer({ ...o, time: t, step: 0, gain: (o.gain ?? 1) * 0.8 });
    this.glimmer({ ...o, time: t + 0.07, step: 2, gain: (o.gain ?? 1) * 0.7 });
  }
  // the record knocked (the tape stop is audio.tapeStop): the needle jumps, and the surface crackle
  // comes up under the silence. Returns the crackle (stopped by rewind(), or stop it yourself).
  death(o = {}) {
    const t = this._t(o);
    this.play('death-bump', this._o(o, { time: t, must: true }));
    if (this._crackle) this._crackle.stop(0.05);
    this._crackle = this.loop('crackle', { fadeIn: 0.6, time: t + 0.05, gain: o.intensity ?? 1 });
    return this._crackle;
  }
  // with audio.rewind(from, to, dur): the needle scratching back, and the crackle out at the end
  rewind(o = {}) {
    const dur = o.dur ?? 1.2, t = this._t(o);
    const v = this.play('rewind', this._o(o, { time: t, rate: 1.2 / dur, jitter: false, must: true }));
    if (this._crackle) { this._crackle.set({ gain: 1.4 }); this._crackle.stop(0.25, Math.max(0, t - this.ctx.currentTime + dur - 0.15)); this._crackle = null; }
    return v;
  }

  // ---------- SPOTLIGHT ----------
  // the lights slam on: the clunk, the crowd's gasp, and the lamps' hum in the song's key for dur
  // seconds (one bar; or keep the handle and stop() it)
  spotlight(o = {}) {
    const t = this._t(o);
    this.play('spot-clunk', this._o(o, { time: t, must: true, room: 0.3, jitter: false }));
    this.play('spot-gasp', this._o(o, { time: t + 0.08, jitter: false }));
    let hz = 440 * Math.pow(2, (this.keyRoot - 9) / 12); while (hz >= 90) hz /= 2; while (hz < 45) hz *= 2; // the key's root, 45-90 Hz
    const hum = this.loop('spot-hum', { pan: o.pan, time: t + 0.04, rate: hz / 60, fadeIn: 0.3, gain: o.intensity ?? 1 });
    if (o.dur) hum.stop(0.5, t - this.ctx.currentTime + o.dur);
    return hum;
  }
  meterFull(o = {}) { return this.play('meter-full', this._o(o)); }

  // ---------- her ----------
  // what she throws, by shape: petal heart shard card pill kiss orb star note (one call per volley)
  bossShot(shape = 'orb', o = {}) {
    if (typeof shape === 'number') shape = SHAPE_NAMES[shape] || 'orb';
    const key = 'shot-' + shape;
    const k = this.bank.map.has(key) ? key : 'shot-orb';
    if (shape === 'card') this.play('k-page', this._o(o));
    return this.play(k, this._o(o));
  }
  // a telegraph appearing: kind 'pink' | 'white', panned to where it is
  telegraph(kind = 'pink', o = {}) { return this.play(kind === 'white' ? 'tele-white' : 'tele-pink', this._o(o, { must: true })); }
  // air drawn in, ending exactly at the impact: lead = seconds until it lands (max 1.2)
  windup(o = {}) {
    const lead = clamp(o.lead ?? 0.6, 0.1, 1.2), b = this.bank.map.get('windup');
    if (!b) return null;
    return this.play('windup', this._o(o, { offset: b[0].duration - lead, jitter: false, must: true }));
  }
  slam(o = {}) { return this.play('slam', this._o(o, { must: true })); }

  // ---------- the glimmer ----------
  // A quiet bell, high, on a note of the chord sounding at song time t. step climbs the chord: 0 root,
  // 1 third, 2 fifth, 3 octave (then round again). Lay it over an on-beat strike, catch or throw.
  glimmer(o = {}) {
    const t = o.t ?? (this.beats ? this.audio.time() : 0);
    const [root, q] = this.chordAt(t);
    const step = ((o.step ?? 0) % 4 + 4) % 4;
    const iv = [0, q === 'maj' ? 4 : 3, 7, 12][step];
    const midi = 77 + ((root - 5 + 12) % 12) + iv; // the root between F5 and E6
    const a = clamp(Math.round((midi - BELL_LO) / BELL_STEP), 0, BELL_N - 1);
    const rate = Math.pow(2, (midi - (BELL_LO + a * BELL_STEP)) / 12);
    const v = this.play('bell', { ...this._o(o), take: a, rate, jitter: false });
    if (v) v.midi = midi;
    return v;
  }

  // ---------- menus ----------
  ui(kind = 'select', o = {}) { return this.play('ui-' + kind, this._o(o, { out: this.uiOut })); }
  needleDrop(o = {}) { return this.play('needle-drop', this._o(o, { out: this.uiOut, jitter: false })); }
  recordSpin(o = {}) { return this.play('record-spin', this._o(o, { out: this.uiOut, jitter: false })); }

  // ---------- applause ----------
  // grade 'S'..'D' or 0..1: a few people for a D, up to a roaring crowd with whistles for an S.
  // (SIDECHAIN's crowd: each person their own hands, pace and place, starting a moment apart and
  // stopping one by one. The claps are scheduled a few tenths ahead by update(), so call it each frame.)
  applause(grade = 'B', o = {}) {
    this.stopApplause(0.1);
    const claps = this.bank.map.get('clap'); if (!claps) return;
    const c = this.ctx, t0 = Math.max(c.currentTime, o.time ?? c.currentTime + (o.at || 0)) + 0.05;
    const k = clamp(typeof grade === 'number' ? grade : GRADE[grade] ?? 0.5, 0, 1);
    const out = c.createGain(); out.gain.value = o.gain ?? 1;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160; hp.Q.value = 0.5;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500; lp.Q.value = 0.5;
    hp.connect(lp).connect(out).connect(this.out);
    const wet = c.createGain(); wet.gain.value = 0.2; out.connect(wet).connect(this.audio.room);
    // nine places across the room, heard by two ears: louder and a moment sooner on the near side
    const pans = [];
    const panAt = (i) => {
      if (pans[i]) return pans[i];
      const x = -0.9 + 1.8 * i / 8, a = (x + 1) * Math.PI / 4;
      const inp = c.createGain(), m = c.createChannelMerger(2);
      [[Math.cos(a), Math.max(0, x)], [Math.sin(a), Math.max(0, -x)]].forEach(([g, d], ch) => {
        const gn = c.createGain(); gn.gain.value = g;
        const dl = c.createDelay(0.01); dl.delayTime.value = 0.0012 * d;
        inp.connect(gn).connect(dl).connect(m, 0, ch);
      });
      m.connect(hp);
      return (pans[i] = inp);
    };
    const pan = () => Math.floor(Math.random() * 9);
    const B = claps.length;
    const n = Math.round(2 + 68 * Math.pow(k, 1.4)), hold = 2.2 + 6.5 * k;
    const people = [], events = [];
    let until = t0;
    for (let i = 0; i < n; i++) {
      const keen = Math.random(), far = Math.random();
      const gs = (Math.random() + Math.random() + Math.random() - 1.5) * 0.9;
      const h = Math.max(2, Math.min(B - 3, Math.round(B * (0.5 + 0.35 * gs) - 6 * far)));
      const rate = Math.max(2.8, Math.min(6.2, 3.4 + 1.6 * keen + 0.4 * k + 0.5 * (Math.random() - 0.5)));
      const start = t0 + Math.min(1.8, -Math.log(1 - Math.random() * 0.98) * (0.18 + 0.35 * (1 - keen)) * (1.4 - 0.6 * k));
      const end = start + Math.max(1.4, hold * (0.45 + 0.65 * keen) * (0.85 + 0.3 * Math.random()));
      people.push({ g: null, pan: pan(), h, next: start, end, period: 1 / rate, lvl: (0.4 + 0.6 * Math.pow(1 - far, 1.5)) * (0.8 + 0.4 * keen) });
      until = Math.max(until, end);
    }
    if (k > 0.45 && this.bank.map.has('roar')) { // when it went well, a roar under the clapping
      const fall = t0 + 1.6 + 2.6 * k, peakV = ROAR * (k - 0.45) / 0.55;
      events.push({ at: t0, go: () => {
        const s = c.createBufferSource(); s.buffer = this.bank.map.get('roar')[0]; s.loop = true;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peakV, t0 + 0.45);
        g.gain.setTargetAtTime(peakV * 0.55, t0 + 0.9, 0.7); g.gain.setTargetAtTime(0.0001, fall, 0.8);
        s.connect(g).connect(hp); s.start(t0, Math.random() * 3); s.stop(fall + 4);
        this._crowdSrc.push(s);
      } });
      until = Math.max(until, fall + 3);
    }
    if (k > 0.5 && this.bank.map.has('whistle')) { // and somebody whistles (two or three when it flew)
      const nw = k > 0.85 ? 3 : k > 0.68 ? 2 : 1, wb = this.bank.map.get('whistle');
      let at = t0 + 0.25 + 0.4 * Math.random();
      for (let i = 0; i < nw; i++) {
        const a = at, p = pan(), l = 0.05 + 0.03 * Math.random(), b = wb[(i + Math.floor(Math.random() * wb.length)) % wb.length];
        events.push({ at: a, go: () => { const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = l / 0.95 * 1.6; s.connect(g).connect(panAt(p)); s.start(a); this._crowdSrc.push(s); } });
        at += 0.7 + 1.1 * Math.random();
      }
    }
    this._crowdSrc = [];
    this._crowd = { out, people, events, panAt, until: until + 2.5 };
  }
  stopApplause(fade = 0.35) {
    const cr = this._crowd; if (!cr) return;
    this._crowd = null;
    const g = cr.out.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + fade);
    for (const s of this._crowdSrc || []) { try { s.stop(now + fade + 0.05); } catch (e) { /* done */ } }
    setTimeout(() => { try { cr.out.disconnect(); } catch (e) { /* gone */ } }, fade * 1000 + 400);
  }

  // ---------- once a frame ----------
  update() {
    const cr = this._crowd; if (!cr) return;
    const c = this.ctx, now = c.currentTime, ahead = now + 0.3, bank = this.bank.map.get('clap');
    for (const e of cr.events) if (!e.done && e.at < ahead) { e.done = true; e.go(); }
    for (const p of cr.people) {
      if (p.next >= p.end || p.next >= ahead) continue;
      if (!p.g) { p.g = c.createGain(); p.g.gain.value = 0; p.g.connect(cr.panAt(p.pan)); }
      if (p.next < now - 0.05) p.next = now + Math.random() * p.period; // after a stall, carry on from now
      while (p.next < ahead && p.next < p.end) {
        const t = p.next, fade = Math.min(1, (p.end - t) / 1.4);
        const s = c.createBufferSource();
        s.buffer = bank[p.h + Math.floor(Math.random() * 5) - 2];
        s.playbackRate.value = 0.96 + 0.08 * Math.random();
        p.g.gain.setValueAtTime(CLAP * p.lvl * (0.3 + 0.7 * fade) * (0.75 + 0.4 * Math.random()), t);
        s.connect(p.g); s.start(t);
        p.next = t + p.period * (1 + 0.5 * (1 - fade)) * (0.9 + 0.2 * Math.random()); // slower as they stop
      }
    }
    if (now > cr.until) { this._crowd = null; try { cr.out.disconnect(); } catch (e) { /* gone */ } }
  }
}
