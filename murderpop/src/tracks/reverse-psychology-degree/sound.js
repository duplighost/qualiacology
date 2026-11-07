// THE DOCTOR's own sounds, synthesized once at load into buffers (nothing is built from oscillators at play time) and
// played on the game's sfx bus, panned to where they come from. Quiet: under the song's snare, "a little like the beat".
// The "tsk" is hers alone: only a lie that cracks makes it.

const SR = 48000;
const TAU = Math.PI * 2;

function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function biquad(x, type, f, q = 0.7071) {
  const w = TAU * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b1 = 1 - c; b0 = b2 = b1 / 2; } else if (type === 'hp') { b1 = -(1 + c); b0 = b2 = (1 + c) / 2; } else { b0 = al; b1 = 0; b2 = -al; }
  a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i]; const y = B0 * v + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; }
  return x;
}
const N = (s) => Math.max(1, Math.round(s * SR));
const noise = (n, r) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; };
function env(x, at, dec, start = 0) { for (let i = 0; i < x.length; i++) { const t = i / SR - start; x[i] *= t < 0 ? 0 : t < at ? t / at : Math.exp(-(t - at) / dec); } return x; }
function mixInto(dst, src, at = 0, g = 1) { const o = N(at); for (let i = 0; i < src.length && i + o < dst.length; i++) dst[i + o] += src[i] * g; return dst; }
function sine(n, f, ph = 0) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.sin(TAU * (typeof f === 'function' ? f(i / SR) : f) * i / SR + ph); return x; }
function glide(n, f0, f1) { const x = new Float32Array(n); let p = 0; for (let i = 0; i < n; i++) { const k = i / n; p += TAU * (f0 * Math.pow(f1 / f0, k)) / SR; x[i] = Math.sin(p); } return x; }
function norm(x, peak = 0.9) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; }

const RECIPES = {
  // her signature: a dry tongue click and a porcelain tink
  tsk(r) {
    const x = new Float32Array(N(0.12));
    mixInto(x, env(biquad(biquad(noise(N(0.03), r), 'bp', 4200, 2.2), 'hp', 2500), 0.0008, 0.006), 0, 1.0);
    mixInto(x, env(biquad(noise(N(0.05), r), 'hp', 5000), 0.002, 0.012), 0.004, 0.18);
    const tink = new Float32Array(N(0.09));
    for (const [f, a] of [[3170, 1], [5290, 0.6], [7930, 0.35]]) mixInto(tink, env(sine(N(0.09), f * 1.4983), 0.0005, 0.018 + a * 0.01), 0, a);
    mixInto(x, tink, 0.006, 0.16);
    return norm(x, 0.85);
  },
  // the flip: a slide projector's ka-CHUNK, with a reversed swell into it (the chunk lands at 0.25 s)
  kachunk(r) {
    const x = new Float32Array(N(0.55));
    const sw = biquad(noise(N(0.25), r), 'bp', 1800, 1.1);
    for (let i = 0; i < sw.length; i++) { const k = i / sw.length; sw[i] *= Math.pow(k, 2.2) * 0.5; }
    mixInto(x, sw, 0);
    mixInto(x, env(biquad(noise(N(0.02), r), 'lp', 2200), 0.0005, 0.006), 0.25, 0.9);
    mixInto(x, env(glide(N(0.12), 120, 58), 0.001, 0.035), 0.252, 0.9);
    mixInto(x, env(biquad(noise(N(0.03), r), 'bp', 900, 1.4), 0.001, 0.014), 0.292, 0.7);
    mixInto(x, env(glide(N(0.08), 90, 50), 0.001, 0.03), 0.294, 0.55);
    return norm(x, 0.8);
  },
  // the inverse field: a quiet F2 drone (gain shaped on playback)
  drone() {
    const n = N(5.0), x = new Float32Array(n);
    for (const [f, a] of [[87.31, 1], [174.61, 0.35], [130.81, 0.18], [261.63, 0.08]]) mixInto(x, sine(n, (t) => f * (1 + 0.002 * Math.sin(t * 1.3))), 0, a);
    return norm(x, 0.7);
  },
  // the inverse lands: a hard white "fft" of air, no boom
  fft(r) { const x = env(biquad(biquad(noise(N(0.22), r), 'hp', 2400), 'lp', 11000), 0.002, 0.05); return norm(x, 0.8); },
  // a laser fires: a bright zap, no buzz (+ a blip on the fifth, C)
  zap(r) {
    const x = new Float32Array(N(0.12));
    mixInto(x, env(biquad(noise(N(0.04), r), 'bp', 3000, 1.5), 0.0006, 0.01), 0, 1);
    mixInto(x, env(sine(N(0.1), 1046.5), 0.001, 0.025), 0.002, 0.35);
    return norm(x, 0.75);
  },
  // her pointer's dry tick (the intro's empty flicks)
  tick(r) { const x = env(biquad(noise(N(0.02), r), 'bp', 2600, 3), 0.0004, 0.0035); return norm(x, 0.7); },
  // patent heels on lacquer
  heel(r) {
    const x = new Float32Array(N(0.06));
    mixInto(x, env(biquad(noise(N(0.02), r), 'bp', 1900, 2.5), 0.0004, 0.004), 0, 1);
    mixInto(x, env(sine(N(0.04), 410), 0.0008, 0.01), 0, 0.3);
    return norm(x, 0.7);
  },
  // an old campus phone: two-tone trill at 20 Hz (loops)
  trill() {
    const n = N(1.0), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / SR; const a = Math.sin(TAU * 20 * t) > 0 ? 1 : 0; x[i] = a * Math.sin(TAU * 1046.5 * t) * 0.6 + (1 - a) * Math.sin(TAU * 830.6 * t) * 0.6; }
    return biquad(x, 'lp', 5000);
  },
  // a baton swish
  swish(r) {
    const n = N(0.22), x = noise(n, r), y = new Float32Array(n);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, f = 800 * Math.pow(3000 / 800, Math.min(1, k / 0.8)), w = TAU * f / SR, c = Math.cos(w), al = Math.sin(w) / (2 * 1.2);
      const a0 = 1 + al, B0 = al / a0, B2 = -al / a0, A1 = -2 * c / a0, A2 = (1 - al) / a0;
      const v = x[i], o = B0 * v + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = o;
      y[i] = o * Math.sin(Math.PI * Math.min(1, k * 1.15));
    }
    return norm(y, 0.7);
  },
  // the pointer thrust's fencing "tsing"
  tsing() {
    const x = new Float32Array(N(0.4));
    for (const [f, a, d] of [[2637, 1, 0.09], [4186, 0.5, 0.06], [6272, 0.25, 0.04]]) mixInto(x, env(sine(N(0.4), f), 0.001, d), 0, a);
    return norm(x, 0.6);
  },
  // wooden clack (the desks fall; pitched up the chord on playback)
  clack(r) {
    const x = new Float32Array(N(0.2));
    mixInto(x, env(biquad(noise(N(0.05), r), 'lp', 2400), 0.0005, 0.012), 0, 1);
    mixInto(x, env(sine(N(0.15), 220), 0.001, 0.05), 0, 0.7);
    mixInto(x, env(sine(N(0.12), 349.2), 0.001, 0.03), 0, 0.3);
    return norm(x, 0.8);
  },
  // the stamp coming down (felt more than heard)
  whoom() { const x = env(glide(N(0.55), 110, 55), 0.25, 0.12); return norm(x, 0.7); },
  thunk(r) {
    const x = new Float32Array(N(0.3));
    mixInto(x, env(biquad(noise(N(0.06), r), 'lp', 900), 0.001, 0.02), 0, 1);
    mixInto(x, env(glide(N(0.25), 140, 60), 0.001, 0.07), 0, 0.9);
    mixInto(x, env(biquad(noise(N(0.15), r), 'bp', 500, 0.8), 0.01, 0.04), 0.01, 0.3);
    return norm(x, 0.8);
  },
  // a taut ribbon plucked on F2 (Karplus-Strong)
  pluck(r) {
    const n = N(0.9), p = Math.round(SR / 87.31), buf = noise(p, r), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const j = i % p; const v = buf[j]; x[i] = v; buf[j] = 0.5 * (v + buf[(j + 1) % p]) * 0.996; }
    return norm(biquad(x, 'lp', 2500), 0.6);
  },
  // one polite clap
  clap(r) { const x = env(biquad(noise(N(0.08), r), 'bp', 1500, 1.2), 0.001, 0.012); return norm(x, 0.7); },
  // a soft bloop (hearts), a pip (pills), a plip (tears)
  bloop() { const x = env(glide(N(0.16), 700, 350), 0.002, 0.04); return norm(x, 0.5); },
  plip() { const x = env(glide(N(0.08), 2200, 1400), 0.001, 0.02); return norm(x, 0.5); },
  // a hot fire ring (the call box burns)
  fwoomp(r) {
    const x = new Float32Array(N(0.6));
    const nz = biquad(noise(N(0.6), r), 'bp', 700, 0.6);
    for (let i = 0; i < nz.length; i++) { const t = i / SR; nz[i] *= Math.min(1, t / 0.03) * Math.exp(-t / 0.18); }
    mixInto(x, nz, 0, 1); mixInto(x, env(glide(N(0.3), 90, 45), 0.002, 0.08), 0, 0.8);
    return norm(x, 0.8);
  },
};

export class Sounds {
  constructor(f) {
    this.f = f; this.audio = f.audio; this.ctx = f.audio.ctx; this.buf = {};
    const sr = this.ctx.sampleRate;
    let seed = 11;
    for (const [k, fn] of Object.entries(RECIPES)) {
      const data = fn(rng(seed++));
      const b = this.ctx.createBuffer(1, data.length, SR);
      b.copyToChannel(data, 0);
      this.buf[k] = b;
    }
    this.sr = sr;
    this.loops = new Set();
    this._at = new Map();
    // levels (linear, on top of the sfx bus): quiet
    this.level = { tsk: 0.55, kachunk: 0.42, drone: 0.11, fft: 0.3, zap: 0.22, tick: 0.25, heel: 0.12, trill: 0.05, swish: 0.3, tsing: 0.12, clack: 0.4, whoom: 0.35, thunk: 0.45, pluck: 0.22, clap: 0.28, bloop: 0.16, plip: 0.14, fwoomp: 0.4 };
  }
  pan(x) { return this.f.pan ? this.f.pan(x) : 0; }
  // name, { x (world, panned), pan, gain, rate, at (s from now), dur (gain envelope: a swell to the end) }
  play(name, o = {}) {
    const b = this.buf[name]; if (!b) return null;
    const c = this.ctx, t = c.currentTime + Math.max(0, o.at || 0);
    // the same sound twice in one instant (four ruled lines firing together) is one sound, not four stacked louder
    const last = this._at.get(name);
    if (!o.loop && last !== undefined && Math.abs(t - last) < 0.025) return null;
    this._at.set(name, t);
    const src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = o.rate ?? 1;
    const g = c.createGain(); const lv = (this.level[name] ?? 0.3) * (o.gain ?? 1);
    if (o.dur) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lv, t + o.dur); g.gain.setTargetAtTime(0.0001, t + o.dur, 0.02); }
    else g.gain.value = lv;
    const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan ?? (o.x !== undefined ? this.pan(o.x) : 0)));
    src.connect(g).connect(p).connect(this.audio.sfx);
    src.start(t, 0, o.dur ? Math.min(b.duration, o.dur + 0.1) : undefined);
    src.onended = () => { src.disconnect(); g.disconnect(); p.disconnect(); this.loops.delete(h); };
    const h = { src, g, stop: (fade = 0.05) => { try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setTargetAtTime(0.0001, c.currentTime, fade / 3); src.stop(c.currentTime + fade * 2); } catch (e) { /* stopped */ } } };
    if (o.loop) { src.loop = true; this.loops.add(h); }
    return h;
  }
  loop(name, o = {}) { return this.play(name, { ...o, loop: true }); }
  // a sound from the game's own library (the bridge's Sfx), when it's there
  lib(key, o = {}) { const s = this.f.sfx && this.f.sfx.s; if (s && s.play) return s.play(key, { pan: o.x !== undefined ? this.pan(o.x) : o.pan || 0, gain: o.gain ?? 1, rate: o.rate ?? 1 }); return null; }
  stopAll() { for (const h of [...this.loops]) h.stop(0.05); this.loops.clear(); }
}
