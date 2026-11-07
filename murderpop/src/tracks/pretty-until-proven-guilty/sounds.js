// The court's own sounds (design §9), rendered once at load into AudioBuffers and played through the game's sfx
// bus (so they sit under the song with its room). Every tone is in C# major. Only the gavel is loud, and it's short.
const TAU = Math.PI * 2;
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);      // midi -> Hz
// C# major: C#=61 D#=63 E#(F)=65 F#=66 G#=68 A#=70 B#(C)=72
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function biquad(x, type, f, q, sr) {
  const w = TAU * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b1 = 1 - c; b0 = b2 = b1 / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'hp') { b1 = -(1 + c); b0 = b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let z1 = 0, z2 = 0;
  for (let i = 0; i < x.length; i++) { const v = x[i], y = b0 * v + z1; z1 = b1 * v - a1 * y + z2; z2 = b2 * v - a2 * y; x[i] = y; }
  return x;
}
// a band of noise whose centre glides (for whooshes and the shing)
function sweep(n, sr, f0, f1, q, r) {
  const x = new Float32Array(n); let z1 = 0, z2 = 0;
  for (let i = 0; i < n; i++) {
    const f = f0 * Math.pow(f1 / f0, i / n), w = TAU * f / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    const a0 = 1 + al, b0 = al / a0, b2 = -al / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0;
    const v = r() * 2 - 1, y = b0 * v + z1; z1 = -a1 * y + z2; z2 = b2 * v - a2 * y; x[i] = y;
  }
  return x;
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
function norm(x, peak) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; }
function mixInto(dst, src, g = 1, at = 0) { for (let i = 0; i < src.length && i + at < dst.length; i++) dst[i + at] += src[i] * g; return dst; }
function partials(n, sr, list, decay, r, jitter = 0) {
  const x = new Float32Array(n);
  for (const [f, a, d] of list) { const ph = r() * TAU, ff = f * (1 + (r() - 0.5) * jitter); for (let i = 0; i < n; i++) { const t = i / sr; x[i] += Math.sin(TAU * ff * t + ph) * a * Math.exp(-t / (d ?? decay)); } }
  return x;
}
function noise(n, r) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; }
function shape(x, sr, a, d) { for (let i = 0; i < x.length; i++) x[i] *= env(i / sr, a, d); return x; }

const RECIPES = {
  // Lady Justice's gavel: a hard hardwood crack on a short sub thump at C#2 (69 Hz). The same every time: it's the tell.
  gavel(sr, r) {
    const n = Math.round(sr * 0.75), x = new Float32Array(n);
    const crack = shape(biquad(noise(n, r), 'bp', 1900, 1.1, sr), sr, 0.0008, 0.018);
    const knock = partials(n, sr, [[410, 1, 0.05], [905, 0.6, 0.035], [1630, 0.35, 0.02], [2420, 0.2, 0.012]], 0.04, r);
    const sub = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; sub[i] = Math.sin(TAU * 69.3 * t * (1 + 0.15 * Math.exp(-t / 0.02))) * env(t, 0.002, 0.12); }
    mixInto(x, norm(crack, 1), 0.85); mixInto(x, norm(knock, 1), 0.55); mixInto(x, sub, 0.9);
    return norm(x, 0.95);
  },
  // the arm rising: a stone grind and a creak, one beat
  grind(sr, r) {
    const n = Math.round(sr * 0.42), x = biquad(biquad(noise(n, r), 'lp', 420, 0.7, sr), 'hp', 60, 0.7, sr);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= (0.6 + 0.4 * Math.sin(TAU * 23 * t + Math.sin(TAU * 7 * t) * 2)) * Math.min(1, t / 0.08) * Math.min(1, (0.42 - t) / 0.1); }
    const creak = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (170 + 40 * Math.sin(TAU * 3.1 * t)) / sr; creak[i] = (Math.sin(ph) + 0.4 * Math.sin(ph * 2.7)) * env(t, 0.12, 0.12) * 0.25; }
    mixInto(x, creak, 1);
    return norm(x, 0.35);
  },
  // PRETTY reflects: a tight, high glass tink. Never a note of the chord, never a real hit.
  tink(sr, r) { const n = Math.round(sr * 0.09); return norm(partials(n, sr, [[3150, 1, 0.022], [5210, 0.7, 0.016], [7440, 0.45, 0.01], [9800, 0.25, 0.006]], 0.02, r, 0.02), 0.5); },
  // the gloss bursting off: a crisp glass crunch, three tiny pings (C#7 E#7 G#7)
  crunch(sr, r) {
    const n = Math.round(sr * 0.5), x = new Float32Array(n);
    for (let k = 0; k < 4; k++) mixInto(x, shape(biquad(noise(Math.round(sr * 0.08), r), 'hp', 2600 + r() * 1500, 0.8, sr), sr, 0.0005, 0.012 + r() * 0.01), k ? 0.45 : 1, Math.round(sr * (k * 0.045 + r() * 0.01)));
    [97, 101, 104].forEach((m, k) => mixInto(x, partials(Math.round(sr * 0.25), sr, [[NOTE(m), 1, 0.08]], 0.08, r), 0.18, Math.round(sr * (0.06 + k * 0.05))));
    return norm(x, 0.6);
  },
  // the lipstick back on: a rising glassy shing (2 -> 9 kHz over 0.25 s): she's pretty again
  shing(sr, r) {
    const n = Math.round(sr * 0.42), x = sweep(n, sr, 2000, 9000, 6, r);
    for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= Math.min(1, t / 0.2) * Math.exp(-Math.max(0, t - 0.25) / 0.05); }
    mixInto(x, partials(n, sr, [[NOTE(92), 0.3, 0.12], [NOTE(96), 0.2, 0.1]], 0.1, r), 0.4, Math.round(sr * 0.22));
    return norm(x, 0.42);
  },
  click(sr, r) { const n = Math.round(sr * 0.05); return norm(shape(biquad(noise(n, r), 'bp', 3400, 3, sr), sr, 0.0003, 0.006), 0.4); },
  // an exhibit lands: a paper-tag flick and a warm gold shimmer (E#5, G#5)
  chime(sr, r) {
    const n = Math.round(sr * 0.9), x = new Float32Array(n);
    mixInto(x, shape(biquad(noise(Math.round(sr * 0.04), r), 'bp', 4200, 2, sr), sr, 0.0005, 0.008), 0.4);
    mixInto(x, partials(n, sr, [[NOTE(77), 0.7, 0.35], [NOTE(80), 0.55, 0.3], [NOTE(89), 0.2, 0.2]], 0.3, r), 1, Math.round(sr * 0.015));
    for (let i = 0; i < n; i++) x[i] *= Math.min(1, i / (sr * 0.01));
    return norm(x, 0.4);
  },
  // struck: a thwack
  thwack(sr, r) { const n = Math.round(sr * 0.18), x = shape(biquad(noise(n, r), 'lp', 900, 0.8, sr), sr, 0.001, 0.03); const s = partials(n, sr, [[140, 1, 0.05]], 0.05, r); mixInto(x, s, 0.6); return norm(x, 0.6); },
  whoosh(sr, r) { const n = Math.round(sr * 0.5), x = sweep(n, sr, 500, 2600, 1.4, r); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= Math.sin(Math.PI * Math.min(1, t / 0.5)) ** 2; } return norm(x, 0.35); },
  // on the pan: a brass clunk and the scales' chain jingle
  clunk(sr, r) {
    const n = Math.round(sr * 0.6), x = partials(n, sr, [[215, 1, 0.12], [338, 0.7, 0.09], [517, 0.5, 0.07], [811, 0.3, 0.05]], 0.1, r, 0.01);
    for (let k = 0; k < 7; k++) mixInto(x, partials(Math.round(sr * 0.08), sr, [[2600 + r() * 2600, 1, 0.015]], 0.02, r), 0.12, Math.round(sr * (0.03 + k * 0.035 + r() * 0.02)));
    return norm(x, 0.55);
  },
  smear(sr, r) { const n = Math.round(sr * 0.3), x = sweep(n, sr, 1800, 600, 2, r); for (let i = 0; i < n; i++) x[i] *= env(i / sr, 0.01, 0.08); return norm(x, 0.4); },
  // her heels on the marble: short and bright
  heel(sr, r) { const n = Math.round(sr * 0.06), x = shape(biquad(noise(n, r), 'bp', 3800, 2.2, sr), sr, 0.0003, 0.007); mixInto(x, partials(n, sr, [[1450, 1, 0.012]], 0.01, r), 0.3); return norm(x, 0.32); },
  // the switchblade flicking open, and a slash
  flick(sr, r) { const n = Math.round(sr * 0.16), x = partials(n, sr, [[4100, 1, 0.02], [6300, 0.6, 0.012]], 0.02, r); mixInto(x, shape(biquad(noise(n, r), 'hp', 5000, 0.8, sr), sr, 0.0003, 0.01), 0.6, Math.round(sr * 0.03)); return norm(x, 0.42); },
  slash(sr, r) { const n = Math.round(sr * 0.28), x = sweep(n, sr, 5200, 1400, 2.4, r); for (let i = 0; i < n; i++) x[i] *= env(i / sr, 0.02, 0.06); return norm(x, 0.42); },
  slap(sr, r) { const n = Math.round(sr * 0.12), x = shape(biquad(noise(n, r), 'bp', 1300, 1.2, sr), sr, 0.0006, 0.02); return norm(x, 0.55); },
  // a kiss: a breathy puff with a sine gliding 1.2 -> 0.8 kHz
  kiss(sr, r) { const n = Math.round(sr * 0.22), x = shape(biquad(noise(n, r), 'bp', 2400, 1.5, sr), sr, 0.01, 0.05); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (1200 - 400 * t / 0.22) / sr; x[i] += Math.sin(ph) * env(t, 0.008, 0.05) * 0.3; } return norm(x, 0.3); },
  // gum swelling (C#3 -> G#3) and its pop
  gum(sr, r) { const n = Math.round(sr * 1.4), x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; const f = NOTE(49) * Math.pow(NOTE(56) / NOTE(49), t / 1.4); ph += TAU * f * (1 + 0.01 * Math.sin(TAU * 6 * t)) / sr; x[i] = Math.sin(ph + 0.6 * Math.sin(ph * 2)) * Math.min(1, t / 0.2) * Math.min(1, (1.4 - t) / 0.08); } return norm(x, 0.2); },
  pop(sr, r) { const n = Math.round(sr * 0.08), x = shape(biquad(noise(n, r), 'bp', 900, 1.6, sr), sr, 0.0004, 0.012); mixInto(x, partials(n, sr, [[520, 1, 0.02]], 0.02, r), 0.5); return norm(x, 0.4); },
  // fire: the flame front rushing out, then crackle
  flame(sr, r) { const n = Math.round(sr * 1.6), x = biquad(noise(n, r), 'lp', 1400, 0.7, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= Math.min(1, t / 0.15) * (t < 1.2 ? 1 : Math.exp(-(t - 1.2) / 0.12)) * (0.7 + 0.3 * (r() < 0.004 ? 3 : 1)); } return norm(x, 0.4); },
  zippo(sr, r) { const n = Math.round(sr * 0.3), x = partials(n, sr, [[2900, 1, 0.03], [4400, 0.5, 0.02]], 0.03, r); mixInto(x, shape(biquad(noise(n, r), 'bp', 2200, 0.8, sr), sr, 0.001, 0.05), 0.6, Math.round(sr * 0.12)); return norm(x, 0.35); },
  // the giant key: a heavy shing drawn, the whirr, the stick and its twang on C#3
  draw(sr, r) { const n = Math.round(sr * 0.5), x = sweep(n, sr, 1200, 4200, 5, r); for (let i = 0; i < n; i++) x[i] *= env(i / sr, 0.05, 0.12); mixInto(x, partials(n, sr, [[NOTE(37) * 4, 0.4, 0.2]], 0.2, r), 0.5); return norm(x, 0.42); },
  whirr(sr, r) { const n = Math.round(sr * 0.7), x = biquad(noise(n, r), 'bp', 1600, 2, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= (0.5 + 0.5 * Math.sin(TAU * 18 * t)) * Math.min(1, t / 0.05) * Math.min(1, (0.7 - t) / 0.05); } return norm(x, 0.3); },
  stick(sr, r) { const n = Math.round(sr * 1.1), x = partials(n, sr, [[NOTE(49), 1, 0.4], [NOTE(49) * 2.01, 0.5, 0.25], [NOTE(49) * 3.4, 0.3, 0.1]], 0.3, r); for (let i = 0; i < n; i++) x[i] *= 1 + 0.4 * Math.sin(TAU * 9 * i / sr); mixInto(x, shape(biquad(noise(n, r), 'lp', 1800, 0.7, sr), sr, 0.0006, 0.03), 0.8); return norm(x, 0.5); },
  // cards and receipts
  card(sr, r) { const n = Math.round(sr * 0.06), x = shape(biquad(noise(n, r), 'hp', 3500, 0.9, sr), sr, 0.0003, 0.008); return norm(x, 0.32); },
  // cell bars: a heavy clang-clank
  clang(sr, r) { const n = Math.round(sr * 0.9), x = partials(n, sr, [[312, 1, 0.3], [611, 0.7, 0.2], [1147, 0.5, 0.12], [1789, 0.3, 0.08]], 0.2, r, 0.01); mixInto(x, shape(biquad(noise(n, r), 'lp', 2400, 0.7, sr), sr, 0.0005, 0.02), 0.8); return norm(x, 0.6); },
  // the booking camera's flash: POP-fzz
  flash(sr, r) { const n = Math.round(sr * 0.35), x = shape(biquad(noise(n, r), 'hp', 1800, 0.7, sr), sr, 0.0004, 0.03); mixInto(x, shape(biquad(noise(n, r), 'bp', 7000, 3, sr), sr, 0.02, 0.1), 0.25, Math.round(sr * 0.03)); return norm(x, 0.5); },
  whine(sr, r) { const n = Math.round(sr * 0.75), x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (2000 * Math.pow(3, t / 0.75)) / sr; x[i] = Math.sin(ph) * Math.min(1, t / 0.3) * 0.5; } return norm(x, 0.09); },
  // frost: an ice crack and a cold whoosh
  ice(sr, r) { const n = Math.round(sr * 0.6), x = shape(biquad(noise(n, r), 'hp', 3000, 0.8, sr), sr, 0.0003, 0.02); mixInto(x, sweep(n, sr, 3000, 800, 1.5, r).map((v, i) => v * env(i / sr, 0.05, 0.15)), 0.5); mixInto(x, partials(n, sr, [[90, 1, 0.08]], 0.08, r), 0.5); return norm(x, 0.5); },
  // glass breaking (mirror doubles, display cases, the heart case)
  glass(sr, r) { const n = Math.round(sr * 0.8), x = new Float32Array(n); for (let k = 0; k < 14; k++) mixInto(x, partials(Math.round(sr * 0.2), sr, [[2500 + r() * 6000, 1, 0.03 + r() * 0.04]], 0.04, r), 0.3 + r() * 0.4, Math.round(sr * (k * 0.025 + r() * 0.03))); mixInto(x, shape(biquad(noise(n, r), 'hp', 2500, 0.7, sr), sr, 0.0004, 0.05), 0.8); return norm(x, 0.55); },
  // the statues' swords: a huge stone crash
  stone(sr, r) { const n = Math.round(sr * 1.0), x = shape(biquad(noise(n, r), 'lp', 700, 0.7, sr), sr, 0.002, 0.18); mixInto(x, partials(n, sr, [[55, 1, 0.2], [82, 0.6, 0.15]], 0.15, r), 1.1); return norm(x, 0.75); },
  // a camera's shutter and pop (the phones, the press)
  shutter(sr, r) { const n = Math.round(sr * 0.12), x = shape(biquad(noise(n, r), 'bp', 2600, 2, sr), sr, 0.0003, 0.008); mixInto(x, shape(biquad(noise(n, r), 'hp', 5000, 0.7, sr), sr, 0.001, 0.02), 0.6, Math.round(sr * 0.035)); return norm(x, 0.35); },
  // a gulp (the key swallowed)
  gulp(sr, r) { const n = Math.round(sr * 0.35), x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * (300 * Math.pow(80 / 300, t / 0.35)) / sr; x[i] = Math.sin(ph) * env(t, 0.02, 0.1); } return norm(x, 0.45); },
  // the broken heart beating softly on the floor
  thump(sr, r) { const n = Math.round(sr * 0.25), x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(TAU * 55 * t) * env(t, 0.003, 0.06); } mixInto(x, shape(biquad(noise(n, r), 'bp', 1800, 2, sr), sr, 0.0003, 0.004), 0.2); return norm(x, 0.35); },
  // paper: the front page unrolling, bursting, falling, ripping
  unroll(sr, r) { const n = Math.round(sr * 0.5), x = biquad(noise(n, r), 'bp', 1800, 0.7, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= (0.5 + 0.5 * (r() < 0.05 ? 1 : 0.4)) * Math.min(1, t / 0.05) * Math.min(1, (0.5 - t) / 0.1); } return norm(x, 0.3); },
  tear(sr, r) { const n = Math.round(sr * 0.4), x = biquad(noise(n, r), 'bp', 2600, 0.9, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= (r() < 0.3 ? 1 : 0.35) * env(t, 0.004, 0.1); } return norm(x, 0.55); },
  whump(sr, r) { const n = Math.round(sr * 0.5), x = shape(biquad(noise(n, r), 'lp', 300, 0.7, sr), sr, 0.03, 0.12); return norm(x, 0.5); },
  glitch(sr, r) { const n = Math.round(sr * 0.16), x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (Math.sign(Math.sin(TAU * (300 + 900 * Math.floor(t * 40) % 4) * t)) * 0.4 + (r() * 2 - 1) * 0.3) * (Math.floor(t * 60) % 3 ? 1 : 0); } return norm(biquad(x, 'lp', 5000, 0.7, sr), 0.25); },
  hum(sr, r) { const n = Math.round(sr * 0.6), x = partials(n, sr, [[120, 1, 1], [240, 0.4, 1], [360, 0.2, 1]], 1, r); for (let i = 0; i < n; i++) x[i] *= Math.min(1, i / (sr * 0.1)) * Math.min(1, (n - i) / (sr * 0.2)); return norm(x, 0.12); },
  chain(sr, r) { const n = Math.round(sr * 0.4), x = new Float32Array(n); for (let k = 0; k < 9; k++) mixInto(x, partials(Math.round(sr * 0.06), sr, [[2200 + r() * 3000, 1, 0.012]], 0.015, r), 0.3, Math.round(sr * (k * 0.035 + r() * 0.015))); return norm(x, 0.35); },
  splash(sr, r) { const n = Math.round(sr * 0.4), x = shape(biquad(noise(n, r), 'lp', 2200, 0.6, sr), sr, 0.002, 0.08); mixInto(x, sweep(n, sr, 3000, 900, 1.2, r).map((v, i) => v * env(i / sr, 0.01, 0.06)), 0.4); return norm(x, 0.5); },
};

export class Sounds {
  constructor(audio) {
    this.audio = audio; this.ctx = audio.ctx; this.buf = {}; this._last = {};
    const sr = this.ctx.sampleRate;
    let seed = 7;
    for (const [name, fn] of Object.entries(RECIPES)) {
      const d = fn(sr, rng(seed += 101));
      const b = this.ctx.createBuffer(1, d.length, sr); b.copyToChannel(d, 0); this.buf[name] = b;
    }
  }
  // play(name, { pan, gain, rate, at (seconds from now), gate (s) })
  play(name, o = {}) {
    const b = this.buf[name]; if (!b) return null;
    const c = this.ctx, now = c.currentTime, gate = o.gate ?? 0.03;
    if (this._last[name] !== undefined && now - this._last[name] < gate && !o.force) return null;
    this._last[name] = now;
    const src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = o.rate ?? 1;
    const g = c.createGain(); g.gain.value = Number.isFinite(o.gain) ? o.gain : 0.7;
    const p = c.createStereoPanner(); p.pan.value = Number.isFinite(o.pan) ? Math.max(-1, Math.min(1, o.pan)) : 0;
    src.connect(g).connect(p).connect(this.audio.sfx);
    src.start(now + (o.at || 0));
    src.onended = () => { src.disconnect(); g.disconnect(); p.disconnect(); };
    return src;
  }
}
