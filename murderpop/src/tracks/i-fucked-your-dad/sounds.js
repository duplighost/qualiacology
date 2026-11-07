// The yard's own sounds (the game's library has her body, hits and telegraphs; these are the set's): rendered
// once at load into short buffers (nothing is synthesized while the song plays), tuned to C major where
// they're pitched, placed by x, and ducked under the song. Played through the library's sfx bus.
const SR = 48000;
const TAU = Math.PI * 2;
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function lp(x, f) { const k = 1 - Math.exp(-TAU * f / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += (x[i] - y) * k; x[i] = y; } return x; }
function hp(x, f) { const k = 1 - Math.exp(-TAU * f / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += (x[i] - y) * k; x[i] = x[i] - y; } return x; }
function bp(x, f, q = 4) { const w = TAU * f / SR, al = Math.sin(w) / (2 * q), c = Math.cos(w); const b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al; let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = x[i]; const y = (b0 * v + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; } return x; }
const env = (i, n, a, d) => { const t = i / SR; return Math.min(1, t / a) * Math.exp(-t / d); };
const norm = (x, peak = 0.9) => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; };
const N = (s) => Math.round(s * SR);
const C = { C2: 65.41, E2: 82.41, G2: 98.0, C3: 130.81, E3: 164.81, G3: 196.0, C4: 261.63, E4: 329.63, G4: 392.0, C5: 523.25, E5: 659.26, G5: 783.99, C6: 1046.5 };

function noiseBuf(n, r) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; }
// sparse spits of crackle: a short decaying burst of noise every gapMin..gapMax s (from t0, dying away over decay s)
function spits(n, r, gapMin, gapMax, lenMin, lenMax, t0 = 0, decay = 0) {
  const x = new Float32Array(n);
  for (let s = N(t0); s < n; s += N(gapMin + r() * (gapMax - gapMin))) {
    const t = s / SR, a = (0.4 + r() * 0.6) * (decay ? Math.exp(-(t - t0) / decay) : 1), len = Math.max(2, N(lenMin + r() * (lenMax - lenMin)));
    for (let i = 0; i < len && s + i < n; i++) x[s + i] += a * (r() * 2 - 1) * Math.exp(-i / (len * 0.4));
  }
  return x;
}
const DEFS = {
  // a dry wooden scrape into a phosphorus fizz-flare
  strike(r) { const n = N(0.45), x = noiseBuf(n, r); bp(x, 2600, 1.2); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= (t < 0.08 ? 0.9 * Math.sin(t / 0.08 * Math.PI) * (0.6 + 0.4 * Math.sin(t * 900)) : 0) + (t > 0.06 ? 0.55 * Math.exp(-(t - 0.06) / 0.16) : 0); } return norm(x, 0.7); },
  // the giant match: a long deep scrape, a huge whooomf
  flare(r) { const n = N(1.4), x = noiseBuf(n, r), y = noiseBuf(n, r); bp(x, 900, 0.9); lp(y, 380); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = x[i] * (t < 0.5 ? 0.7 * (0.5 + 0.5 * Math.sin(t * 160)) : 0) + y[i] * (t > 0.42 ? 2.6 * Math.min(1, (t - 0.42) / 0.05) * Math.exp(-(t - 0.42) / 0.35) : 0); } return norm(x, 0.85); },
  // a match flicked: a little whip
  flick(r) { const n = N(0.22), x = noiseBuf(n, r); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.sin(Math.min(1, t / 0.18) * Math.PI) ** 2; } bp(x, 3200, 2); return norm(x, 0.45); },
  // fire catching: a soft low whump on C with a crackle
  whump(r) { const n = N(0.9), x = new Float32Array(n), c = noiseBuf(n, r); hp(c, 2500); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(TAU * C.C2 * t * (1 + 0.6 * Math.exp(-t / 0.05))) * env(i, n, 0.006, 0.22) + c[i] * 0.25 * (r() < 0.02 ? 1 : 0.15) * Math.exp(-t / 0.5); } lp(x, 900); return norm(x, 0.8); },
  // the block erupting: a massive low WHOOMPH
  whoomph(r) { const n = N(2.4), x = new Float32Array(n), w = noiseBuf(n, r); lp(w, 500); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(TAU * 41.2 * t * (1 + 1.2 * Math.exp(-t / 0.08))) * 1.2 * env(i, n, 0.01, 0.5) + w[i] * 2.2 * env(i, n, 0.03, 0.9); } return norm(x, 0.95); },
  // the fuse running: a crackling rush (a hissing burn with spits of crackle in it), played along its path
  fuse(r) {
    const n = N(2.4), rush = noiseBuf(n, r), body = noiseBuf(n, r), cr = spits(n, r, 0.004, 0.04, 0.002, 0.004), x = new Float32Array(n);
    bp(rush, 2100, 0.9); lp(body, 420); bp(cr, 3000, 1.0);
    for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.min(1, t / 0.05) * (t > 1.9 ? Math.max(0, 1 - (t - 1.9) / 0.5) : 1); const fl = 0.75 + 0.25 * Math.sin(TAU * 13 * t + Math.sin(t * 7) * 2); x[i] = (rush[i] * fl + body[i] * 0.45 + cr[i] * 2.0) * e; }
    return norm(x, 0.8);
  },
  // the reversed fire breath before the eruption
  breath(r) { const n = N(0.36), x = noiseBuf(n, r); lp(x, 700); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.pow(t / 0.36, 2.5); } return norm(x, 0.4); },
  // the empty can on the street: hollow tin clatter
  clatter(r) { const n = N(0.8), x = new Float32Array(n); for (const [f0, a, d] of [[523, 1, 0.12], [1046, 0.5, 0.08], [1568, 0.35, 0.05], [2349, 0.25, 0.04]]) for (const hit of [0, 0.11, 0.19, 0.31]) { const s = N(hit); for (let i = s; i < n; i++) { const t = (i - s) / SR; x[i] += Math.sin(TAU * f0 * (1 + hit * 0.05) * t) * a * Math.exp(-t / d) * (1 - hit); } } return norm(x, 0.6); },
  // glugs as she pours, a splash on each soaking word
  splash(r) { const n = N(0.5), x = noiseBuf(n, r); bp(x, 900, 1.4); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= env(i, n, 0.01, 0.12) * (0.6 + 0.4 * Math.sin(t * 60)); } return norm(x, 0.45); },
  // her skid: a teacup scraped on its saucer and a glitter swish
  skid(r) { const n = N(0.55), x = new Float32Array(n), s = noiseBuf(n, r); hp(s, 5000); for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.min(1, t / 0.03) * Math.exp(-t / 0.22); x[i] = (Math.sin(TAU * 2093 * t + Math.sin(t * 90) * 2) * 0.35 + Math.sin(TAU * 3136 * t) * 0.15) * e + s[i] * 0.4 * e; } return norm(x, 0.42); },
  // the leap: a rising whoosh
  leap(r) { const n = N(0.6), x = noiseBuf(n, r); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.sin(Math.min(1, t / 0.6) * Math.PI); } bp(x, 1200, 1.0); return norm(x, 0.4); },
  // a heavy porcelain landing with a flame burst
  land(r) { const n = N(0.7), x = new Float32Array(n), w = noiseBuf(n, r); lp(w, 1400); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(TAU * 98 * t * (1 + Math.exp(-t / 0.03))) * env(i, n, 0.002, 0.09) + w[i] * env(i, n, 0.01, 0.25) * 0.8 + Math.sin(TAU * 1760 * t) * 0.12 * Math.exp(-t / 0.05); } return norm(x, 0.75); },
  // a stage thump (set pieces arriving) with a glitter puff
  thump(r) { const n = N(0.6), x = new Float32Array(n), w = noiseBuf(n, r); lp(w, 300); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(TAU * 55 * t) * env(i, n, 0.003, 0.14) + w[i] * env(i, n, 0.002, 0.08) * 0.7; } return norm(x, 0.8); },
  // a hydraulic thunk (the supermarket rising)
  hydraulic(r) { const n = N(0.9), x = new Float32Array(n), w = noiseBuf(n, r); bp(w, 400, 0.7); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = w[i] * Math.min(1, t / 0.2) * (t < 0.45 ? 0.5 : 0) + Math.sin(TAU * 49 * t) * (t > 0.4 ? env(i - N(0.4), n, 0.002, 0.12) : 0) * 1.3; } return norm(x, 0.75); },
  // a fridge-seal thwuck and a cold hiss
  door(r) { const n = N(0.55), x = new Float32Array(n), h = noiseBuf(n, r); hp(h, 3000); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(TAU * 140 * t) * env(i, n, 0.002, 0.04) * 1.2 + h[i] * 0.35 * Math.min(1, t / 0.05) * Math.exp(-t / 0.2); } return norm(x, 0.6); },
  // a brass CLANG on C (the scales)
  clang(r) { const n = N(2.2), x = new Float32Array(n); for (const [m, a, d] of [[1, 1, 1.2], [2.76, 0.5, 0.6], [5.4, 0.3, 0.3], [8.9, 0.15, 0.15]]) for (let i = 0; i < n; i++) { const t = i / SR; x[i] += Math.sin(TAU * C.C3 * m * t) * a * Math.exp(-t / d); } for (let i = 0; i < N(0.01); i++) x[i] *= i / N(0.01); return norm(x, 0.7); },
  // the cart: casters rattling, then the crash into the car
  // casters ticking faster and faster (14 to 59 a second) over a rolling rumble
  rattle(r) {
    const n = N(1.5), x = new Float32Array(n), w = noiseBuf(n, r);
    let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / SR; ph += (14 + t * 30) / SR; if (ph >= 1) { ph -= 1; const a = (0.5 + r() * 0.5) * (0.35 + t * 0.45), len = N(0.004 + r() * 0.004); for (let k = 0; k < len && i + k < n; k++) x[i + k] += a * (r() * 2 - 1) * Math.exp(-k / (len * 0.4)); } }
    bp(x, 2000, 0.8); lp(w, 180);
    for (let i = 0; i < n; i++) { const t = i / SR; x[i] = x[i] * 2.2 + w[i] * 0.9 * Math.min(1, t / 0.3) * (0.4 + t * 0.4); }
    return norm(x, 0.6);
  },
  crash(r) { const n = N(1.2), x = noiseBuf(n, r), m = new Float32Array(n); lp(x, 4200); lp(x, 4200); for (let i = 0; i < n; i++) { const t = i / SR; m[i] = (Math.sin(TAU * 311 * t) + Math.sin(TAU * 467 * t) * 0.7 + Math.sin(TAU * 1311 * t) * 0.4) * Math.exp(-t / 0.3); x[i] = x[i] * 2.2 * env(i, n, 0.002, 0.15) + m[i] * 0.5; } return norm(x, 0.8); },
  chirp(r) { const n = N(0.6), x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; const on = (t < 0.12 || (t > 0.25 && t < 0.37)) ? 1 : 0; x[i] = Math.sin(TAU * (1900 + 500 * Math.sin(t * 60)) * t) * on * 0.5; } lp(x, 5000); return norm(x, 0.35); },
  // coffee: a slosh; the cup: a hollow paper tok
  slosh(r) { const n = N(0.5), x = noiseBuf(n, r); bp(x, 700, 1.1); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.sin(Math.min(1, t / 0.4) * Math.PI) * (0.6 + 0.4 * Math.sin(t * 40)); } return norm(x, 0.45); },
  // a soft bell tone on C/E/G (keypad, the cloche descending)
  bellC(r) { return bell(C.C5, 1.2); }, bellE(r) { return bell(C.E5, 1.2); }, bellG(r) { return bell(C.G5, 1.2); },
  tonng(r) { return bell(C.C4, 2.2, 0.8); },
  // the camera: a charging whine, then the flash pop
  whine(r) { const n = N(1.1), x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += TAU * (900 + t * 2200) / SR; x[i] = Math.sin(ph) * Math.min(1, t / 0.3) * 0.25; } return norm(x, 0.25); },
  // the flash: a short bright pop with a little body (not a hiss)
  pop(r) { const n = N(0.35), x = noiseBuf(n, r), y = new Float32Array(n); bp(x, 3000, 0.7); for (let i = 0; i < n; i++) { const t = i / SR; y[i] = x[i] * 1.4 * env(i, n, 0.0008, 0.035) + Math.sin(TAU * 2600 * t) * 0.12 * Math.exp(-t / 0.015) + Math.sin(TAU * 170 * t) * 0.5 * env(i, n, 0.001, 0.04); } lp(y, 9000); return norm(y, 0.6); },
  // glass ornaments / bulbs popping
  tinkle(r) { const n = N(0.9), x = new Float32Array(n); for (let k = 0; k < 9; k++) { const s = N(r() * 0.4), f0 = 2600 + r() * 2600; for (let i = s; i < n; i++) { const t = (i - s) / SR; x[i] += Math.sin(TAU * f0 * t) * Math.exp(-t / 0.05) * 0.4; } } return norm(x, 0.45); },
  // a plush thump-thump (the teddy rolling)
  plush(r) { const n = N(0.3), x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(TAU * 80 * t) * env(i, n, 0.004, 0.06); } lp(x, 400); return norm(x, 0.7); },
  // a sizzle (the brand, the rain on fire)
  sizzle(r) {
    const n = N(1.0), x = noiseBuf(n, r), y = noiseBuf(n, r), blk = N(0.003);
    bp(x, 4200, 0.8); bp(y, 2400, 1.2);
    let sp = 0.6;
    for (let i = 0; i < n; i++) { const t = i / SR; if (i % blk === 0) sp = r() < 0.25 ? 1 : 0.55; x[i] = (x[i] * 0.8 + y[i] * 0.45) * sp * Math.min(1, t / 0.04) * Math.exp(-t / 0.38); }
    lp(x, 7000);
    return norm(x, 0.42);
  },
  // thunder, low and not loud
  thunder(r) { const n = N(2.4), x = noiseBuf(n, r); lp(x, 160); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.min(1, t / 0.08) * Math.exp(-t / 0.9) * (0.7 + 0.3 * Math.sin(t * 9)); } return norm(x, 0.7); },
  // the mortar: a deep thoomp and a rising whistle; a firework crackle-boom
  thoomp(r) { const n = N(1.6), x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += TAU * (900 + t * 1400) / SR; x[i] = Math.sin(TAU * 52 * t) * env(i, n, 0.002, 0.12) * 1.4 + Math.sin(ph) * 0.18 * (t > 0.15 ? Math.min(1, (t - 0.15) / 0.2) * Math.max(0, 1 - (t - 0.15) / 1.4) : 0); } return norm(x, 0.8); },
  // a firework bursting: a low boom and a crackling tail
  boom(r) {
    const n = N(1.6), w = noiseBuf(n, r), cr = spits(n, r, 0.006, 0.05, 0.002, 0.003, 0.08, 0.5), x = new Float32Array(n);
    lp(w, 240); bp(cr, 2800, 0.9);
    for (let i = 0; i < n; i++) { const t = i / SR; x[i] = w[i] * 3.0 * env(i, n, 0.004, 0.22) + Math.sin(TAU * 58 * t * (1 + 0.5 * Math.exp(-t / 0.04))) * 0.8 * env(i, n, 0.003, 0.18) + cr[i] * 1.6; }
    return norm(x, 0.75);
  },
  // the head when struck: a hollow porcelain tonk; the last match going out: pff
  tonk(r) { const n = N(0.5), x = new Float32Array(n); for (const [f0, a, d] of [[C.G4, 1, 0.12], [C.G4 * 2.7, 0.4, 0.05]]) for (let i = 0; i < n; i++) { const t = i / SR; x[i] += Math.sin(TAU * f0 * t) * a * Math.exp(-t / d); } return norm(x, 0.5); },
  pff(r) { const n = N(0.3), x = noiseBuf(n, r); bp(x, 1800, 0.9); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.sin(Math.min(1, t / 0.25) * Math.PI) * 0.8; } return norm(x, 0.3); },
  // the ring of fire in the silence: a soft, sparse crackle
  crackle(r) {
    const n = N(2.2), cr = spits(n, r, 0.02, 0.12, 0.002, 0.005), w = noiseBuf(n, r), x = new Float32Array(n);
    bp(cr, 2600, 0.9); lp(w, 300);
    for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.min(1, t / 0.3) * Math.min(1, (2.2 - t) / 0.3); x[i] = (cr[i] * 1.6 + w[i] * 0.35) * e; }
    return norm(x, 0.6);
  },
};
function bell(f0, d = 1.2, peak = 0.5) { const n = N(d), x = new Float32Array(n); for (const [m, a, dd] of [[1, 1, d * 0.5], [2, 0.35, d * 0.25], [3.01, 0.18, d * 0.12], [4.2, 0.08, d * 0.06]]) for (let i = 0; i < n; i++) { const t = i / SR; x[i] += Math.sin(TAU * f0 * m * t) * a * Math.exp(-t / dd); } for (let i = 0; i < N(0.004); i++) x[i] *= i / N(0.004); return norm(x, peak); }

export { DEFS };
export const MIX = { strike: 0.5, flare: 0.6, flick: 0.4, whump: 0.45, whoomph: 0.75, fuse: 0.75, breath: 0.5, clatter: 0.55, splash: 0.5, skid: 0.32, leap: 0.4, land: 0.6, thump: 0.6, hydraulic: 0.6, door: 0.5, clang: 0.5, rattle: 1.4, crash: 0.6, chirp: 0.3, slosh: 0.4, bellC: 0.3, bellE: 0.3, bellG: 0.3, tonng: 0.35, whine: 0.25, pop: 0.75, tinkle: 0.4, plush: 0.55, sizzle: 0.5, thunder: 0.45, thoomp: 0.6, boom: 0.5, tonk: 0.5, pff: 0.4, crackle: 0.5 };

// sounds tuned to the key: played at their pitch (the library's small random detune would put them out of tune)
const PITCHED = new Set(['bellC', 'bellE', 'bellG', 'tonng', 'clang', 'whump', 'tonk']);
const clampPan = (p) => Math.max(-1, Math.min(1, p));

export class YardSounds {
  constructor(f) {
    this.f = f; this.bufs = new Map();
    this.lib = f.sfx && f.sfx.s ? f.sfx.s : null;
    this.ctx = f.audio && f.audio.ctx;
    this.out = f.audio && f.audio.sfx;
  }
  load() {
    if (!this.ctx) return;
    let seed = 7;
    for (const [k, fn] of Object.entries(DEFS)) {
      const x = fn(rng(seed++));
      const b = new AudioBuffer({ length: x.length, numberOfChannels: 1, sampleRate: SR });
      b.copyToChannel(x, 0);
      this.bufs.set(k, b);
    }
    this.register();
  }
  // into the game's sound library as ifyd-<name>: they share its voice limit, and the mix tools hear them by name
  register() {
    const lib = this.lib;
    if (!lib || !lib.bank || !lib.bank.map || !lib.mix) return;
    for (const [k, b] of this.bufs) { lib.bank.map.set('ifyd-' + k, [b]); lib.mix['ifyd-' + k] = MIX[k] ?? 0.5; }
  }
  // name, { x | pan, gain, at (seconds from now), rate, path: [[seconds from its start, x], ...] (a pan that travels) }
  play(name, o = {}) {
    if (this.f.state !== 'play' && !o.always) return null;
    const pan = clampPan(o.pan ?? (o.x !== undefined ? this.f.pan(o.x) : 0));
    const lib = this.lib;
    if (lib && lib.play && lib.bank && lib.bank.map.has('ifyd-' + name)) {
      const h = lib.play('ifyd-' + name, { pan, gain: o.gain ?? 1, rate: o.rate ?? 1, at: o.at || 0, jitter: !PITCHED.has(name) });
      if (h && o.path) for (const [s, x] of o.path) h.panner.pan.linearRampToValueAtTime(clampPan(this.f.pan(x)), h.time + s);
      return h;
    }
    // no library (the lite sounds): play it straight into the effects bus
    const b = this.bufs.get(name), c = this.ctx;
    if (!b || !c || !this.out) return null;
    const src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = (o.rate ?? 1) * (PITCHED.has(name) ? 1 : 1 + (Math.random() - 0.5) * 0.04);
    const g = c.createGain(); g.gain.value = (o.gain ?? 1) * (MIX[name] ?? 0.5);
    const p = c.createStereoPanner(), t0 = c.currentTime + (o.at || 0); p.pan.setValueAtTime(pan, t0);
    if (o.path) for (const [s, x] of o.path) p.pan.linearRampToValueAtTime(clampPan(this.f.pan(x)), t0 + s);
    src.connect(g).connect(p).connect(this.out);
    src.start(t0);
    src.onended = () => { src.disconnect(); g.disconnect(); p.disconnect(); };
    return { src, gain: g, panner: p, time: t0 };
  }
}
