// The highway's own sounds, rendered into buffers once at load and played through the game's sound library (so
// they're panned to where they happen, voice-limited and under the mix). Nothing shrill: crashes are thuds and
// crunches with a glitter top, the lock is a glassy tick, the lights die with a soft pop.
const TAU = Math.PI * 2;
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function biquad(x, type, f, q, sr) {
  const w = TAU * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b1 = 1 - c; b0 = b2 = b1 / 2; } else if (type === 'hp') { b1 = -(1 + c); b0 = b2 = (1 + c) / 2; } else { b0 = al; b1 = 0; b2 = -al; }
  a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i]; const y = (b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; }
  return x;
}
// a filter whose cutoff moves (exponentially from f0 to f1), the state carried across coefficient updates
function sweep(x, type, f0, f1, q, sr, block = 64) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % block === 0) {
      const f = Math.min(f0 * Math.pow(f1 / f0, i / x.length), sr * 0.45), w = TAU * f / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), a0 = 1 + al;
      if (type === 'lp') { b1 = (1 - c) / a0; b0 = b2 = b1 / 2; } else if (type === 'hp') { b1 = -(1 + c) / a0; b0 = b2 = -b1 / 2; } else { b0 = al / a0; b1 = 0; b2 = -al / a0; }
      a1 = -2 * c / a0; a2 = (1 - al) / a0;
    }
    const v = x[i]; const y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
function norm(x, peak = 0.9) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; }
function fade(x, sr, out = 0.02, inn = 0.002) { const a = Math.floor(inn * sr), b = Math.floor(out * sr); for (let i = 0; i < a; i++) x[i] *= i / a; for (let i = 0; i < b; i++) x[x.length - 1 - i] *= i / b; return x; }

const RECIPES = {
  tick(sr, r) { const n = Math.floor(0.14 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.0005, 0.003) * 0.6 + Math.sin(TAU * 2637 * t) * env(t, 0.001, 0.028) * 0.7 + Math.sin(TAU * 5274 * t) * env(t, 0.001, 0.012) * 0.3 + Math.sin(TAU * 1318.5 * t) * env(t, 0.001, 0.05) * 0.25; }
    return norm(x, 0.8); },
  roar(sr, r) { const n = Math.floor(1.5 * sr); let x = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, k = t / 1.5; const f = 62 + 50 * k * k; ph += f / sr; const saw = (ph % 1) * 2 - 1; x[i] = saw * 0.5 + (r() * 2 - 1) * 0.7; }
    x = sweep(x, 'lp', 260, 1900, 0.8, sr);
    for (let i = 0; i < n; i++) { const t = i / sr, k = t / 1.5; x[i] *= Math.pow(k, 1.6) * (k > 0.94 ? (1 - k) / 0.06 : 1) * (1 + 0.25 * Math.sin(TAU * 31 * t)); }
    return norm(x, 0.8); },
  whoosh(sr, r) { const n = Math.floor(0.55 * sr); let x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
    x = sweep(x, 'bp', 500, 3200, 1.1, sr); for (let i = 0; i < n; i++) { const k = i / n; x[i] *= Math.sin(Math.PI * Math.pow(k, 0.7)) ** 2; } return norm(x, 0.7); },
  crunch(sr, r) { const n = Math.floor(1.3 * sr), x = new Float32Array(n), m = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(TAU * (58 - 20 * t) * t) * env(t, 0.002, 0.16) * 1.1; m[i] = (r() * 2 - 1) * env(t, 0.002, 0.22); }
    biquad(m, 'bp', 1100, 0.9, sr); biquad(m, 'lp', 3000, 0.7, sr);
    for (let i = 0; i < n; i++) x[i] += m[i] * 1.4;
    for (let k = 0; k < 26; k++) { const t0 = 0.02 + r() * 0.7, f = 2500 + r() * 5000, a = 0.12 + r() * 0.12; const i0 = Math.floor(t0 * sr); for (let i = i0; i < Math.min(n, i0 + sr * 0.12); i++) { const t = (i - i0) / sr; x[i] += Math.sin(TAU * f * t) * a * Math.exp(-t / (0.012 + r() * 0.02)); } }
    return fade(norm(x, 0.9), sr, 0.1); },
  clang(sr, r) { const n = Math.floor(1.1 * sr), x = new Float32Array(n);
    const P = [[523, 0.7, 0.55], [1131, 0.45, 0.4], [1793, 0.3, 0.3], [2614, 0.2, 0.2], [3412, 0.12, 0.12]];
    for (let i = 0; i < n; i++) { const t = i / sr; let v = (r() * 2 - 1) * env(t, 0.0005, 0.006) * 0.5; for (const [f, a, d] of P) v += Math.sin(TAU * f * t + a) * a * env(t, 0.001, d); x[i] = v + Math.sin(TAU * 90 * t) * env(t, 0.002, 0.08) * 0.6; }
    return fade(norm(x, 0.75), sr, 0.1); },
  concrete(sr, r) { const n = Math.floor(0.9 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.001, 0.12) + (r() < 0.004 * Math.exp(-t * 4) ? (r() * 2 - 1) * 2 : 0) + Math.sin(TAU * 70 * t) * env(t, 0.002, 0.1) * 0.9; }
    biquad(x, 'lp', 1400, 0.7, sr); return fade(norm(x, 0.85), sr, 0.1); },
  thud(sr, r) { const n = Math.floor(0.45 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(TAU * (80 - 30 * t) * t) * env(t, 0.002, 0.11) + (r() * 2 - 1) * env(t, 0.001, 0.03) * 0.5; }
    biquad(x, 'lp', 900, 0.7, sr); return fade(norm(x, 0.85), sr, 0.05); },
  glass(sr, r) { const n = Math.floor(1.0 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.0005, 0.04) * 0.4; }
    biquad(x, 'hp', 2500, 0.7, sr);
    // (the pieces ring from 2.8 to 7 kHz and the very top is rolled off: glass, not a whistle)
    for (let k = 0; k < 40; k++) { const t0 = r() * 0.6 * r(), f = 2800 + r() * 4200, a = 0.1 + r() * 0.16; const i0 = Math.floor(t0 * sr); for (let i = i0; i < Math.min(n, i0 + sr * 0.15); i++) { const t = (i - i0) / sr; x[i] += Math.sin(TAU * f * t) * a * Math.exp(-t / (0.01 + r() * 0.04)); } }
    biquad(x, 'lp', 8500, 0.7, sr);
    return fade(norm(x, 0.7), sr, 0.1); },
  boom(sr, r) { const n = Math.floor(1.8 * sr); const x = new Float32Array(n), ns = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(TAU * (52 - 22 * Math.min(1, t * 2)) * t) * env(t, 0.004, 0.45) * 1.2; ns[i] = (r() * 2 - 1) * env(t, 0.003, 0.35); }
    biquad(ns, 'lp', 650, 0.7, sr); for (let i = 0; i < n; i++) x[i] += ns[i] * 1.2;
    for (let k = 0; k < 30; k++) { const t0 = 0.05 + r() * 1.1, f = 4200 + r() * 5200, a = 0.03 + r() * 0.05; const i0 = Math.floor(t0 * sr); for (let i = i0; i < Math.min(n, i0 + sr * 0.2); i++) { const t = (i - i0) / sr; x[i] += Math.sin(TAU * f * t) * a * Math.exp(-t / 0.05); } }
    return fade(norm(x, 0.9), sr, 0.2); },
  ping(sr) { const n = Math.floor(1.6 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(TAU * 2637 * t) * env(t, 0.001, 0.5) * 0.6 + Math.sin(TAU * 2637 * 2.76 * t) * env(t, 0.001, 0.12) * 0.25 + Math.sin(TAU * 3951 * t) * env(t, 0.001, 0.25) * 0.15; }
    return fade(norm(x, 0.6), sr, 0.1); },
  pop(sr, r) { const n = Math.floor(0.3 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.0005, 0.012) * 0.6 + Math.sin(TAU * 140 * t) * env(t, 0.002, 0.04) * 0.5 + (r() * 2 - 1) * env(t - 0.01, 0.001, 0.05) * (t > 0.01 ? 0.3 : 0); }
    biquad(x, 'bp', 1800, 0.6, sr); return fade(norm(x, 0.6), sr, 0.05); },
  flick(sr, r) { const n = Math.floor(0.45 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; let v = 0; for (const t0 of [0.0, 0.07]) if (t >= t0) v += (r() * 2 - 1) * env(t - t0, 0.0003, 0.004) + Math.sin(TAU * 2100 * (t - t0)) * env(t - t0, 0.0005, 0.01) * 0.5; if (t > 0.1) v += (r() * 2 - 1) * env(t - 0.1, 0.01, 0.12) * 0.25; x[i] = v; }
    biquad(x, 'hp', 600, 0.7, sr); return fade(norm(x, 0.55), sr, 0.08); },
  clink(sr, r) { const n = Math.floor(0.25 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.0003, 0.003) * 0.5 + Math.sin(TAU * 1850 * t) * env(t, 0.0005, 0.03) * 0.6 + Math.sin(TAU * 4100 * t) * env(t, 0.0005, 0.015) * 0.3; }
    return fade(norm(x, 0.5), sr, 0.05); },
  heel(sr, r) { const n = Math.floor(0.1 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.0002, 0.004) * 0.6 + Math.sin(TAU * 1950 * t) * env(t, 0.0005, 0.012) * 0.6 + Math.sin(TAU * 3300 * t) * env(t, 0.0005, 0.006) * 0.3; }
    return fade(norm(x, 0.5), sr, 0.02); },
  engine(sr, r) { const n = Math.floor(1.0 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; const ph = (55 * t) % 1; x[i] = (ph * 2 - 1) * 0.6 + Math.sin(TAU * 110 * t) * 0.3 + (r() * 2 - 1) * 0.35 * (0.5 + 0.5 * Math.sin(TAU * 23 * t)); }
    biquad(x, 'lp', 700, 0.9, sr); return norm(x, 0.7); },
  hiss(sr, r) { const n = Math.floor(0.8 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * Math.sin(Math.PI * Math.min(1, t / 0.55)) * 0.5; }
    biquad(x, 'hp', 2200, 0.7, sr); biquad(x, 'lp', 7000, 0.7, sr);
    for (let i = Math.floor(0.55 * sr); i < n; i++) { const t = i / sr - 0.55; x[i] += Math.sin(TAU * 95 * t) * env(t, 0.002, 0.06) * 0.9 + Math.sin(TAU * 820 * t) * env(t, 0.001, 0.04) * 0.35; }
    return fade(norm(x, 0.6), sr, 0.05); },
  splash(sr, r) { const n = Math.floor(0.9 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.003, 0.18) + Math.sin(TAU * (60 + 200 * Math.exp(-t * 9)) * t) * env(t, 0.002, 0.12) * 0.7; }
    biquad(x, 'lp', 900, 0.7, sr); return fade(norm(x, 0.8), sr, 0.1); },
  scrape(sr, r) { const n = Math.floor(1.0 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * (0.5 + (r() < 0.02 ? 2 : 0)) * Math.sin(Math.PI * Math.min(1, t / 1.0)); }
    biquad(x, 'bp', 1300, 0.8, sr); return fade(norm(x, 0.55), sr, 0.1); },
  whoomp(sr, r) { const n = Math.floor(0.7 * sr); let x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
    x = sweep(x, 'lp', 160, 1600, 0.7, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = x[i] * env(t, 0.06, 0.25) + Math.sin(TAU * 65 * t) * env(t, 0.01, 0.12) * 0.6; } return fade(norm(x, 0.7), sr, 0.1); },
  crackle(sr, r) { const n = Math.floor(1.0 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = (r() < 0.0025 ? (r() * 2 - 1) : 0) + (r() * 2 - 1) * 0.04;
    biquad(x, 'lp', 3500, 0.7, sr); return norm(x, 0.5); },
  rumble(sr, r) { const n = Math.floor(2.8 * sr); let x = new Float32Array(n); let b = 0;
    for (let i = 0; i < n; i++) { b = b * 0.985 + (r() * 2 - 1) * 0.15; x[i] = b; }
    biquad(x, 'lp', 160, 0.7, sr); for (let i = 0; i < n; i++) { const k = i / n; x[i] *= Math.sin(Math.PI * Math.pow(k, 0.6)) * (0.8 + 0.2 * Math.sin(TAU * 7 * k)); } return fade(norm(x, 0.85), sr, 0.2); },
  rotor(sr, r) { const n = Math.floor(1.0 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * Math.pow(0.5 + 0.5 * Math.cos(TAU * 11 * t), 3); }
    biquad(x, 'lp', 180, 0.7, sr); return norm(x, 0.6); },
  click(sr, r) { const n = Math.floor(0.12 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; let v = 0; for (const t0 of [0, 0.035]) if (t >= t0) v += (r() * 2 - 1) * env(t - t0, 0.0003, 0.003) + Math.sin(TAU * 900 * (t - t0)) * env(t - t0, 0.0005, 0.01) * 0.4; x[i] = v; }
    return fade(norm(x, 0.5), sr, 0.02); },
  snap(sr, r) { const n = Math.floor(0.25 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.0002, 0.006) + Math.sin(TAU * 2350 * t) * env(t, 0.0005, 0.03) * 0.5 + Math.sin(TAU * 3750 * t) * env(t, 0.0005, 0.02) * 0.3 + (r() * 2 - 1) * env(t - 0.012, 0.0002, 0.004) * (t > 0.012 ? 0.7 : 0); }
    biquad(x, 'hp', 900, 0.7, sr); return fade(norm(x, 0.7), sr, 0.04); },
  creak(sr, r) { const n = Math.floor(0.55 * sr); let x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * (0.4 + 0.6 * Math.max(0, Math.sin(TAU * 37 * t))) * Math.sin(Math.PI * t / 0.55); }
    biquad(x, 'bp', 700, 4, sr); return fade(norm(x, 0.45), sr, 0.05); },
  clock(sr, r) { const n = Math.floor(0.05 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (r() * 2 - 1) * env(t, 0.0002, 0.0025) * 0.6 + Math.sin(TAU * 3200 * t) * env(t, 0.0003, 0.006) * 0.4; }
    return fade(norm(x, 0.35), sr, 0.01); },
  chirp(sr) { const n = Math.floor(0.32 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; const on = (t < 0.09) || (t > 0.16 && t < 0.25); x[i] = on ? Math.sign(Math.sin(TAU * 1320 * t)) * 0.3 * (1 - (t % 0.16) / 0.09 * 0.3) : 0; }
    return fade(norm(x, 0.3), sr, 0.02, 0.003); },
  whoop(sr) { const n = Math.floor(0.7 * sr), x = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, k = t / 0.7; const f = 620 + 520 * Math.sin(Math.PI * k); ph += f / sr; x[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * k) * 0.5; }
    return fade(norm(x, 0.35), sr, 0.05); },
  heartbeat(sr) { const n = Math.floor(0.4 * sr), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / sr; let v = 0; for (const [t0, a] of [[0, 1], [0.16, 0.6]]) if (t >= t0) v += Math.sin(TAU * 55 * (t - t0)) * env(t - t0, 0.004, 0.06) * a; x[i] = v; }
    return fade(norm(x, 0.6), sr, 0.03); },
  rocks(sr, r) { const n = Math.floor(1.2 * sr); let x = new Float32Array(n); let b = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; b = b * 0.97 + (r() * 2 - 1) * 0.2; x[i] = b * (0.6 + 0.4 * Math.abs(Math.sin(TAU * 4.5 * t))) + (r() < 0.002 ? (r() * 2 - 1) * 1.5 : 0); }
    biquad(x, 'lp', 400, 0.7, sr); return fade(norm(x, 0.7), sr, 0.15); },
};
// levels in the mix (under the song). The big impacts sit at or under the kit's biggest (a parry, the slam: about
// -16 LUFS over their loudest 100 ms), the frequent ones near a strike's (-22); the lock's tick, the snap and the
// roar are cues and stay clear; the bomb's clock and her heels in the dark are tells, so they're heard.
const LEVEL = { tick: 0.5, roar: 0.32, whoosh: 0.36, crunch: 0.6, clang: 0.5, concrete: 0.58, thud: 0.5, glass: 0.36, boom: 0.6, ping: 0.26,
  pop: 0.4, flick: 0.4, clink: 0.35, heel: 0.3, engine: 0.3, hiss: 0.3, splash: 0.5, scrape: 0.4, whoomp: 0.42, crackle: 0.18, rumble: 0.45,
  rotor: 0.22, click: 0.4, snap: 0.55, creak: 0.3, clock: 0.32, chirp: 0.12, whoop: 0.16, heartbeat: 0.4, rocks: 0.5 };
// the same sound again this soon (s) plays at this share: two bombs on one beat, four windows, a row of puddles
// catching, the boulders landing together make one bigger sound, not a pile-up
const GATE = { boom: [0.15, 0.35], crunch: [0.08, 0.5], thud: [0.06, 0.45], concrete: [0.06, 0.5], glass: [0.06, 0.5], whoomp: [0.15, 0.35], splash: [0.1, 0.5], whoosh: [0.05, 0.5], clang: [0.08, 0.5] };

let BANK = null;
function render(sr) {
  if (BANK && BANK.sr === sr) return BANK;
  const out = { sr, bufs: {} };
  let seed = 7;
  for (const [k, fn] of Object.entries(RECIPES)) out.bufs[k] = fn(sr, rng(seed++ * 7919));
  BANK = out; return out;
}

export class Sounds {
  constructor(f) {
    this.f = f; this.ctx = f.audio.ctx;
    const lib = f.sfx && f.sfx.s && f.sfx.s.bank && f.sfx.s.play ? f.sfx.s : null;
    this.lib = lib;
    const B = render(this.ctx.sampleRate);
    this.bufs = {};
    for (const [k, data] of Object.entries(B.bufs)) {
      const b = new AudioBuffer({ length: data.length, numberOfChannels: 1, sampleRate: B.sr }); b.copyToChannel(data, 0);
      this.bufs[k] = b;
      if (lib) { lib.bank.map.set('kml-' + k, [b]); lib.mix['kml-' + k] = LEVEL[k] ?? 0.4; }
    }
    this.loops = new Set();
    this._at = new Map();
  }
  pan(x) { return x === undefined ? 0 : this.f.pan(x); }
  // name, { x (world x: panned), pan, gain, rate, at (seconds from now) }
  play(name, o = {}) {
    if (this.f.manual) return null;          // the stepped clock (captures, bots) has no real audio time
    const pan = o.pan ?? this.pan(o.x);
    let gain = o.gain ?? 1;
    const gt = GATE[name];
    if (gt) { const when = this.ctx.currentTime + (o.at || 0), last = this._at.get(name); if (last !== undefined && Math.abs(when - last) < gt[0]) gain *= gt[1]; else this._at.set(name, when); }
    if (this.lib) return this.lib.play('kml-' + name, { pan, gain, rate: o.rate ?? 1, at: o.at || 0, room: o.room, must: o.must, lp: o.lp });
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.bufs[name]; src.playbackRate.value = o.rate ?? 1;
    const g = c.createGain(); g.gain.value = (LEVEL[name] ?? 0.4) * gain; const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(g).connect(p).connect(this.f.audio.sfx); src.start(c.currentTime + (o.at || 0)); return { src };
  }
  // a loop with a handle: set({ x, pan, gain, rate }), stop(fade)
  loop(name, o = {}) {
    const none = { set() {}, stop() {}, alive: false };
    if (this.f.manual) return none;
    let h = none;
    if (this.lib) h = this.lib.loop('kml-' + name, { pan: o.pan ?? this.pan(o.x), gain: o.gain ?? 1, rate: o.rate ?? 1, fadeIn: o.fadeIn ?? 0.1 });
    if (h && h.alive !== false) { this.loops.add(h); const st = h.stop; h.stop = (fd, af) => { this.loops.delete(h); st.call(h, fd, af); }; const se = h.set; h.set = (s) => se.call(h, s.x !== undefined ? { ...s, pan: this.pan(s.x) } : s); }
    return h;
  }
  stopAll(fade = 0.1) { for (const h of [...this.loops]) h.stop(fade); this.loops.clear(); }
}
