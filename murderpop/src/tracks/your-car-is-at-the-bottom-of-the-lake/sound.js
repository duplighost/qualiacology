// Her lake's sounds, each placed where it happens: Kenney recordings (copied into assets/tracks/<id>/sfx, CC0) and a
// few synthesized ones (water is filtered noise). They go through the game's sound library (its voices, its bus, its
// room), registered under 'lake-*'. Nothing pitched, nothing loud. The crickets stop the instant the band does.
const ID = 'your-car-is-at-the-bottom-of-the-lake';
const BASE = `assets/tracks/${ID}/sfx/`;
const FILES = {
  creak: ['creak1', 'creak2', 'creak3'], pot: ['metalPot1', 'metalPot2', 'metalPot3'], latch: ['metalLatch'], click: ['metalClick'],
  coins: ['handleCoins', 'handleCoins2'], leather: ['dropLeather'], cloth: ['cloth1', 'cloth2', 'cloth3', 'cloth4'], flip: ['bookFlip1', 'bookFlip2', 'bookFlip3'],
  doorOpen: ['doorOpen_1'], doorClose: ['doorClose_2'], tink: ['glass_001', 'glass_002', 'glass_003'],
  plateLight: ['impactPlate_light_000', 'impactPlate_light_001', 'impactPlate_light_002'], plateHeavy: ['impactPlate_heavy_000', 'impactPlate_heavy_001'],
  mining: ['impactMining_000', 'impactMining_001', 'impactMining_002'], woodHeavy: ['impactWood_heavy_000', 'impactWood_heavy_001'],
  knock: ['impactWood_medium_000', 'impactWood_medium_001', 'impactWood_medium_002'], tonk: ['impactMetal_light_000', 'impactMetal_light_001'],
  glassLight: ['impactGlass_light_000', 'impactGlass_light_001', 'impactGlass_light_002'], glassHeavy: ['impactGlass_heavy_000'],
  heel: ['footstep_wood_000', 'footstep_wood_001', 'footstep_wood_002'], soft: ['impactSoft_medium_000', 'impactSoft_medium_001'],
};
// levels (linear, before the bus): quiet and present
const MIX = {
  creak: 0.5, pot: 0.45, latch: 0.5, click: 0.55, coins: 0.55, leather: 0.6, cloth: 0.55, flip: 0.45, doorOpen: 0.5, doorClose: 0.5, tink: 0.5,
  plateLight: 0.35, plateHeavy: 0.75, mining: 0.6, woodHeavy: 0.75, knock: 0.85, tonk: 0.6, glassLight: 0.4, glassHeavy: 0.6, heel: 0.35, soft: 0.5,
  crickets: 0.11, tyre: 0.38, smoke: 0.3, roar: 0.75, wash: 0.8, splashBig: 0.95, splashSmall: 0.5, glug: 0.45, bubble: 0.22, pop: 0.35, hiss: 0.3,
  whistle: 0.18, screech: 0.3, patter: 0.35, squelch: 0.28, idle: 0.22, whirr: 0.07, moan: 0.75, crash: 1.0, hum: 0.2, drain: 0.6, bird: 0.16,
  honk: 0.3, whum: 0.7, scrape: 0.5, grind: 0.42, clack: 0.65, boom: 0.85, glint: 0.3, pour: 0.32, kiss: 0.4, vacuum: 0.5,
};

// ---------------------------------------------------------------------------------------------- a little DSP
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function lp(x, fc, sr) { const a = Math.exp(-2 * Math.PI * fc / sr); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } return x; }
function hp(x, fc, sr) { const a = Math.exp(-2 * Math.PI * fc / sr); let y = 0, px = 0; for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } return x; }
function bp(x, fc, q, sr, fcAt) {   // a state-variable band-pass; fcAt(i) may sweep it
  let low = 0, band = 0; const damp = 1 / q;
  for (let i = 0; i < x.length; i++) { const f = 2 * Math.sin(Math.PI * Math.min(0.45, (fcAt ? fcAt(i) : fc) / sr)); const high = x[i] - low - damp * band; band += f * high; low += f * band; x[i] = band; }
  return x;
}
function norm(x, peak = 0.9) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; }
function env(x, sr, a, d, shape = 1) { for (let i = 0; i < x.length; i++) { const t = i / sr; x[i] *= t < a ? t / a : Math.pow(Math.max(0, 1 - (t - a) / d), shape); } return x; }
function noise(n, r) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; }
function fade(x, sr, s = 0.01) { const n = Math.min(x.length, Math.round(s * sr)); for (let i = 0; i < n; i++) { x[i] *= i / n; x[x.length - 1 - i] *= i / n; } return x; }

const SYN = {
  crickets(sr, r) { const n = sr * 4, L = new Float32Array(n), R = new Float32Array(n);
    for (const [ch, f0, off] of [[L, 4300, 0.1], [R, 4700, 0.7], [L, 4550, 2.2], [R, 4100, 2.9]]) for (let k = 0; k < 6; k++) { const t0 = off + k * 0.62 + r() * 0.05; for (let c = 0; c < 3; c++) { const s0 = Math.round((t0 + c * 0.045) * sr); for (let i = 0; i < 0.03 * sr && s0 + i < n; i++) ch[(s0 + i) % n] += Math.sin(2 * Math.PI * f0 * i / sr) * Math.sin(Math.PI * i / (0.03 * sr)) * 0.5; } }
    return [norm(L, 0.5), norm(R, 0.5)]; },
  tyre(sr, r) { const n = sr * 1.1, x = noise(n, r); bp(x, 0, 18, sr, (i) => 1500 + 900 * Math.sin(i / n * 3) + 120 * Math.sin(i / sr * 70)); env(x, sr, 0.04, 1.05, 1.4); return [norm(x)]; },
  smoke(sr, r) { const x = hp(noise(sr * 0.9, r), 1800, sr); env(x, sr, 0.05, 0.85, 2); return [norm(x, 0.6)]; },
  roar(sr, r) { const n = sr * 1.0, x = lp(noise(n, r), 600, sr); for (let i = 0; i < n; i++) x[i] *= Math.pow(i / n, 2.2); return [norm(x)]; },
  wash(sr, r) { const n = Math.round(sr * 1.8), x = noise(n, r); let fc = 5000; const a = []; lp(x, 2500, sr); env(x, sr, 0.02, 1.75, 1.6); hp(x, 80, sr); void fc; void a; return [norm(x)]; },
  splashBig(sr, r) { const n = sr * 2.2, x = lp(noise(n, r), 2200, sr); env(x, sr, 0.01, 2.1, 2.2); for (let i = 0; i < 0.3 * sr; i++) x[i] += Math.sin(2 * Math.PI * (55 - 25 * i / sr) * i / sr) * Math.exp(-i / sr * 9) * 1.4; return [norm(x)]; },
  splashSmall(sr, r) { const x = lp(noise(sr * 0.5, r), 3000, sr); env(x, sr, 0.005, 0.45, 2.5); return [norm(x, 0.7)]; },
  glug(sr, r) { const n = sr * 1.5, x = new Float32Array(n); for (let k = 0; k < 9; k++) { const s0 = Math.round((k * 0.15 + r() * 0.05) * sr), f0 = 140 + r() * 120; for (let i = 0; i < 0.12 * sr && s0 + i < n; i++) x[s0 + i] += Math.sin(2 * Math.PI * (f0 + 900 * i / sr) * i / sr) * Math.exp(-i / sr * 30); } return [norm(lp(x, 900, sr), 0.7)]; },
  bubble(sr, r) { const n = Math.round(sr * 0.12), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * (380 + 4200 * i / sr) * i / sr) * Math.exp(-i / sr * 32); return [norm(x, 0.6)]; },
  pop(sr, r) { const n = Math.round(sr * 0.09), x = noise(n, r); for (let i = 0; i < n; i++) x[i] = x[i] * Math.exp(-i / sr * 90) * 0.5 + Math.sin(2 * Math.PI * (700 - 3000 * i / sr) * i / sr) * Math.exp(-i / sr * 45); return [norm(lp(x, 4000, sr), 0.7)]; },
  hiss(sr, r) { const x = hp(noise(sr * 1.3, r), 3000, sr); env(x, sr, 0.03, 1.25, 1.5); return [norm(x, 0.5)]; },
  whistle(sr, r) { const n = Math.round(sr * 1.4), x = noise(n, r); bp(x, 0, 25, sr, (i) => 2400 - 1600 * i / n); for (let i = 0; i < n; i++) x[i] *= Math.min(1, i / (0.3 * sr)); return [norm(x, 0.6)]; },
  screech(sr, r) { const n = Math.round(sr * 1.6), x = noise(n, r); bp(x, 0, 14, sr, (i) => 2300 + 300 * Math.sin(i / sr * 23)); for (let i = 0; i < n; i++) x[i] *= Math.sin(Math.PI * i / n) ** 1.5; return [norm(x, 0.7)]; },
  patter(sr, r) { const n = Math.round(sr * 1.6), x = new Float32Array(n); for (let k = 0; k < 140; k++) { const s0 = Math.floor(r() * (n - 400)); const a = 0.3 + r() * 0.7; for (let i = 0; i < 300; i++) x[s0 + i] += (r() * 2 - 1) * a * Math.exp(-i / 40); } return [norm(hp(x, 1500, sr), 0.6)]; },
  squelch(sr, r) { const n = Math.round(sr * 0.4), x = noise(n, r); bp(x, 1400, 2.5, sr); for (let i = 0; i < n; i++) x[i] *= (Math.sin(i / sr * 2 * Math.PI * 23) > 0 ? 1 : 0.4) * Math.min(1, (n - i) / (0.05 * sr)); return [norm(x, 0.6)]; },
  idle(sr, r) { const n = sr * 2, x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(2 * Math.PI * 34 * t) * 0.6 + Math.sin(2 * Math.PI * 68 * t) * 0.3 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 17 * t)) + (r() - 0.5) * 0.15; } return [fade(norm(lp(x, 300, sr), 0.6), sr, 0.002)]; },
  whirr(sr, r) { const n = sr, x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (Math.sin(2 * Math.PI * 240 * t) + 0.5 * Math.sin(2 * Math.PI * 480 * t)) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 8 * t)); } return [norm(x, 0.4)]; },
  moan(sr, r) { const n = sr * 3.2, x = lp(noise(n, r), 180, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = x[i] * 3 * Math.pow(i / n, 1.4) + Math.sin(2 * Math.PI * (38 + 14 * t / 3.2) * t) * 0.5 * Math.pow(i / n, 1.8); } return [norm(x)]; },
  crash(sr, r) { const n = sr * 1.8, x = lp(noise(n, r), 1600, sr); env(x, sr, 0.01, 1.75, 2.4); for (let i = 0; i < 0.5 * sr; i++) x[i] += Math.sin(2 * Math.PI * (48 - 18 * i / sr) * i / sr) * Math.exp(-i / sr * 5) * 1.6; return [norm(x)]; },
  hum(sr, r) { const n = sr * 4, x = lp(noise(n, r), 160, sr); for (let i = 0; i < n; i++) x[i] = x[i] * 4 + Math.sin(2 * Math.PI * 55 * i / sr) * 0.1; return [fade(norm(x, 0.5), sr, 0.05)]; },
  drain(sr, r) { const n = sr * 3, x = lp(noise(n, r), 700, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= (0.5 + 0.5 * Math.sin(2 * Math.PI * (6 + 3 * Math.sin(t)) * t)) * Math.exp(-t * 0.8); } return [norm(x)]; },
  bird(sr, r) { const n = Math.round(sr * 0.7), x = new Float32Array(n); for (const t0 of [0.0, 0.16, 0.42]) { const s0 = Math.round(t0 * sr); for (let i = 0; i < 0.1 * sr && s0 + i < n; i++) { const k = i / (0.1 * sr); x[s0 + i] += Math.sin(2 * Math.PI * (3200 + 1300 * Math.sin(k * Math.PI)) * i / sr) * Math.sin(Math.PI * k); } } return [norm(x, 0.5)]; },
  honk(sr, r) { const n = Math.round(sr * 0.32), x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (Math.sign(Math.sin(2 * Math.PI * 330 * t)) + Math.sign(Math.sin(2 * Math.PI * 415 * t))) * Math.min(1, t / 0.01, (0.32 - t) / 0.05); } return [norm(lp(x, 1200, sr), 0.6)]; },
  whum(sr, r) { const n = Math.round(sr * 0.6), x = new Float32Array(n); const nz = lp(noise(n, r), 400, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(2 * Math.PI * (70 - 30 * t) * t) * Math.exp(-t * 7) + nz[i] * Math.exp(-t * 9) * 2; } return [norm(x)]; },
  scrape(sr, r) { const n = Math.round(sr * 1.3), x = noise(n, r); bp(x, 0, 6, sr, (i) => 700 + 400 * Math.sin(i / sr * 13)); for (let i = 0; i < n; i++) x[i] *= (0.5 + 0.5 * Math.abs(Math.sin(i / sr * 2 * Math.PI * 9))) * Math.sin(Math.PI * i / n); return [norm(x, 0.7)]; },
  grind(sr, r) { const n = Math.round(sr * 0.5), x = noise(n, r); bp(x, 2600, 5, sr); for (let i = 0; i < n; i++) x[i] *= (0.4 + 0.6 * Math.abs(Math.sin(i / sr * 2 * Math.PI * 61))) * Math.min(1, (n - i) / (0.08 * sr)); return [norm(x, 0.7)]; },
  clack(sr, r) { const n = Math.round(sr * 0.3), x = noise(n, r); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = x[i] * Math.exp(-t * 60) * 0.7 + Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 18); } return [norm(x)]; },
  boom(sr, r) { const n = Math.round(sr * 0.9), x = new Float32Array(n); const nz = noise(n, r); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(2 * Math.PI * (72 - 30 * t) * t) * Math.exp(-t * 4.5) + nz[i] * Math.exp(-t * 40) * 0.5; } return [norm(lp(x, 1500, sr))]; },
  glint(sr, r) { const n = Math.round(sr * 0.45), x = new Float32Array(n); for (const f of [2637, 3520, 4186, 5274]) for (let i = 0; i < n; i++) x[i] += Math.sin(2 * Math.PI * f * (1 + 0.002 * Math.sin(i / sr * 40)) * i / sr) * Math.exp(-i / sr * (6 + f / 900)); return [norm(x, 0.5)]; },
  pour(sr, r) { const n = Math.round(sr * 1.6), x = noise(n, r); bp(x, 0, 4, sr, (i) => 700 + 350 * Math.sin(i / sr * 5) + 200 * Math.sin(i / sr * 31)); for (let i = 0; i < n; i++) x[i] *= Math.min(1, i / (0.1 * sr), (n - i) / (0.2 * sr)); return [norm(x, 0.7)]; },
  kiss(sr, r) { const n = Math.round(sr * 0.1), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * (500 + 2500 * i / sr) * i / sr) * Math.exp(-i / sr * 55); return [norm(x, 0.6)]; },
  vacuum(sr, r) { const n = Math.round(sr * 0.45), x = noise(n, r); bp(x, 0, 3, sr, (i) => 300 + 2200 * i / n); for (let i = 0; i < n; i++) x[i] *= Math.pow(i / n, 3); return [norm(x, 0.6)]; },
};

export class LakeSound {
  constructor(f) { this.f = f; this.lib = f.sfx && f.sfx.s ? f.sfx.s : null; this.ctx = f.audio.ctx; this.loops = {}; this.ok = false; }
  async load() {
    const lib = this.lib; if (!lib) return;
    const ctx = this.ctx, sr = ctx.sampleRate;
    const jobs = [];
    for (const [k, files] of Object.entries(FILES)) {
      if (lib.bank.map.has('lake-' + k)) continue;
      jobs.push(Promise.all(files.map((n) => fetch(BASE + n + '.ogg').then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => null)))
        .then((bufs) => { const ok = bufs.filter(Boolean); if (ok.length) lib.bank.map.set('lake-' + k, ok); }));
    }
    let seed = 11;
    for (const [k, fn] of Object.entries(SYN)) {
      if (lib.bank.map.has('lake-' + k)) continue;
      const chs = fn(sr, rng(seed++ * 7919));
      const b = new AudioBuffer({ length: chs[0].length, numberOfChannels: chs.length, sampleRate: sr });
      chs.forEach((c, i) => b.copyToChannel(c, i));
      lib.bank.map.set('lake-' + k, [b]);
    }
    await Promise.all(jobs);
    for (const [k, v] of Object.entries(MIX)) lib.mix['lake-' + k] = v;
    this.ok = true;
  }
  // a sound where it happens: x is where on the floor (panned from the camera's focus), o: { gain, rate, lp, at }
  play(name, x = null, o = {}) {
    if (!this.ok || !this.lib || this.f.manual) return null;
    const pan = x === null ? 0 : this.f.pan(x);
    const under = this.under && !o.dry;
    return this.lib.play('lake-' + name, { pan, gain: o.gain ?? 1, rate: o.rate, at: o.at, lp: o.lp || (under ? 900 : undefined), offset: o.offset });
  }
  loop(name, on, o = {}) {
    if (!this.ok || !this.lib || this.f.manual) return;
    const h = this.loops[name];
    if (on && !h) { const nh = this.lib.loop('lake-' + name, { gain: o.gain ?? 1, pan: o.pan ?? 0, fadeIn: o.fade ?? 0.3 }); nh._g = o.gain ?? 1; nh._p = o.pan ?? 0; this.loops[name] = nh; }
    else if (!on && h) { h.stop(o.fade ?? 0.12); delete this.loops[name]; }
    else if (on && h && (o.gain !== undefined && o.gain !== h._g || o.pan !== undefined && o.pan !== h._p)) { h.set({ gain: o.gain, pan: o.pan }); h._g = o.gain; h._p = o.pan; }
  }
  // the game's own sounds fall silent with the song's holes (41.36-41.58 and 80.70-80.80), then come back to this
  // song's level for them (the fight sets it from the song's loudness)
  duck(sec) {
    if (this.f.manual) return;
    const g = this.f.audio.sfx.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now); g.setTargetAtTime(0.0001, now, 0.01); g.setTargetAtTime(this.f.sfxLevel ?? 0.6, now + sec, 0.02);
  }
  stopAll() { for (const k of Object.keys(this.loops)) this.loop(k, false, { fade: 0.05 }); }
}
