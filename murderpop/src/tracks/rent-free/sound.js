// Rent Free's own sounds, rendered once at load into the game's sound bank (no oscillators at play time) and played
// through it (panned, gated, levelled like every other game sound). Glassy, silky and domestic; weight only where
// something heavy lands. Pitched to G# minor. The song's own sounds (the doorbell, glass, knocks, the clock, the
// lock, shutters, pops, key rings, bells) are never doubled: these are the aftermath and the tells.
const TAU = Math.PI * 2;
const G4 = 415.3;                          // G#4
const hz = (semi, base = G4) => base * Math.pow(2, semi / 12);
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// a little synthesis kit: everything is summed into a mono Float32Array, then spread to two channels
function buf(sr, dur) { return new Float32Array(Math.max(1, Math.round(sr * dur))); }
function partial(y, sr, f, amp, decay, { at = 0, attack = 0.002, detune = 0 } = {}) {
  const n0 = Math.round(at * sr);
  for (let i = n0; i < y.length; i++) {
    const t = (i - n0) / sr;
    const env = (t < attack ? t / attack : 1) * Math.exp(-t / decay);
    if (env < 1e-4 && t > attack) break;
    y[i] += Math.sin(TAU * f * (1 + detune) * t) * amp * env;
  }
}
function noise(y, sr, amp, decay, { at = 0, attack = 0.001, lp = 0, hp = 0, seed = 1, dur = 9 } = {}) {
  const r = rng(seed); const n0 = Math.round(at * sr);
  let l = 0, h = 0, prev = 0;
  const al = lp ? 1 - Math.exp(-TAU * lp / sr) : 1, ah = hp ? Math.exp(-TAU * hp / sr) : 0;
  for (let i = n0; i < y.length; i++) {
    const t = (i - n0) / sr; if (t > dur) break;
    const env = (t < attack ? t / attack : 1) * Math.exp(-t / decay);
    if (env < 1e-4 && t > attack) break;
    let x = r() * 2 - 1;
    l += (x - l) * al; x = l;
    if (hp) { const hh = ah * (h + x - prev); prev = x; h = hh; x = hh; }
    y[i] += x * amp * env;
  }
}
function sweep(y, sr, f0, f1, amp, dur, { at = 0, attack = 0.01, shape = 1 } = {}) {
  const n0 = Math.round(at * sr); let ph = 0;
  for (let i = n0; i < y.length; i++) {
    const t = (i - n0) / sr; if (t > dur) break;
    const k = t / dur; const f = f0 * Math.pow(f1 / f0, k);
    ph += TAU * f / sr;
    const env = Math.min(1, t / attack) * Math.pow(1 - k, shape);
    y[i] += Math.sin(ph) * amp * env;
  }
}
function finish(y, peak = 0.5, sr = 48000, width = 0.0) {
  let m = 0; for (let i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i]));
  const g = m > 0 ? peak / m : 1;
  // a tiny fade out so nothing clicks
  const tail = Math.min(y.length, Math.round(sr * 0.006));
  for (let i = 0; i < y.length; i++) { y[i] *= g; if (i > y.length - tail) y[i] *= (y.length - i) / tail; }
  const L = Float32Array.from(y), R = Float32Array.from(y);
  if (width) { const d = Math.round(sr * 0.0007); for (let i = R.length - 1; i >= d; i--) R[i] = R[i] * (1 - width) + y[i - d] * width; }
  return [L, R];
}

// porcelain: inharmonic partials of a small glazed bowl
const CHINA = [1, 2.32, 4.25, 6.63, 9.38];
function china(y, sr, f, amp, decay, at = 0, seed = 1) {
  const r = rng(seed);
  CHINA.forEach((m, k) => partial(y, sr, f * m * (1 + (r() - 0.5) * 0.01), amp / (1 + k * 0.8), decay / (1 + k * 0.7), { at, attack: 0.0006 }));
}

const RECIPES = {
  // a claim's first hit: a bright tink
  'rf-tink': [3, (sr, i, r) => { const y = buf(sr, 0.5); china(y, sr, hz(24 + [0, 3, 7][i]), 0.6, 0.16, 0, i + 3); noise(y, sr, 0.25, 0.006, { hp: 3000, seed: i }); return finish(y, 0.5, sr, 0.3); }],
  // the next: a crackle (glaze crazing)
  'rf-crackle': [3, (sr, i, r) => { const y = buf(sr, 0.4); for (let k = 0; k < 9; k++) noise(y, sr, 0.5 * r(), 0.004 + r() * 0.006, { at: r() * 0.12, hp: 1800, seed: i * 31 + k }); china(y, sr, hz(19 + i * 2), 0.25, 0.08, 0, i); return finish(y, 0.48, sr, 0.4); }],
  // the burst: porcelain bursting off, then a gold-glitter tail in the key
  'rf-burst': [3, (sr, i, r) => {
    const y = buf(sr, 1.4);
    noise(y, sr, 0.9, 0.05, { lp: 6000, seed: i + 7 }); noise(y, sr, 0.5, 0.012, { hp: 2500, seed: i + 9 });
    for (let k = 0; k < 7; k++) china(y, sr, hz(12 + [0, 3, 7, 10, 12, 15, 19][k] + (i - 1) * 2), 0.35, 0.12 + r() * 0.1, 0.01 + r() * 0.08, k + i * 10);
    for (let k = 0; k < 10; k++) partial(y, sr, hz(24 + [0, 3, 7, 12, 15][k % 5]), 0.07, 0.35, { at: 0.12 + k * 0.045 + r() * 0.02 });
    return finish(y, 0.55, sr, 0.5);
  }],
  // the lease-thread: a taut string snapping toward her
  'rf-thread': [3, (sr, i, r) => { const y = buf(sr, 0.5); sweep(y, sr, hz(12 + i), hz(-5 + i), 0.5, 0.18, { attack: 0.003, shape: 2 }); noise(y, sr, 0.5, 0.03, { hp: 2200, lp: 9000, seed: i + 41, attack: 0.01 }); partial(y, sr, hz(7, G4 * 2), 0.18, 0.12, { at: 0.04 }); return finish(y, 0.45, sr, 0.2); }],
  // her crack, where the thread strikes: a deep ceramic crack on her body
  'rf-crack': [3, (sr, i, r) => { const y = buf(sr, 0.9); partial(y, sr, hz(-24 + i), 0.9, 0.1); partial(y, sr, hz(-17 + i), 0.5, 0.07); noise(y, sr, 0.8, 0.02, { lp: 3500, seed: i + 51 }); china(y, sr, hz(5 + i * 3), 0.3, 0.2, 0.005, i + 5); return finish(y, 0.62, sr, 0.3); }],
  // claiming: a wave of lilac glaze with a ceramic ting
  'rf-ting': [2, (sr, i, r) => { const y = buf(sr, 1.6); china(y, sr, hz(31 + i * 4), 0.4, 0.7, 0.18, i); noise(y, sr, 0.2, 0.25, { attack: 0.18, hp: 4000, seed: i + 61, dur: 0.3 }); for (let k = 0; k < 8; k++) partial(y, sr, hz(19 + [0, 3, 7, 12][k % 4]), 0.05, 0.4, { at: k * 0.025 }); return finish(y, 0.4, sr, 0.6); }],
  // the dull thud of your things: never a ghost-hit
  'rf-thud': [3, (sr, i, r) => { const y = buf(sr, 0.4); partial(y, sr, 90 + i * 12, 0.9, 0.06); noise(y, sr, 0.6, 0.03, { lp: 900, seed: i + 71 }); return finish(y, 0.4, sr); }],
  // a blown kiss: breath and a lipstick pop on the fifth
  'rf-mwah': [3, (sr, i, r) => { const y = buf(sr, 0.5); noise(y, sr, 0.5, 0.09, { attack: 0.05, lp: 2600, hp: 500, seed: i + 81 }); partial(y, sr, hz(7 + 12 * (i % 2)), 0.45, 0.04, { at: 0.11 }); noise(y, sr, 0.3, 0.008, { at: 0.11, hp: 1500, seed: i + 83 }); return finish(y, 0.42, sr, 0.3); }],
  // wires zipping down from the flies: a descending whistle (over a long fill: play with rate)
  'rf-wires': [1, (sr, i, r) => { const y = buf(sr, 2.0); sweep(y, sr, 2400, 700, 0.3, 1.95, { attack: 0.3, shape: 0.4 }); noise(y, sr, 0.15, 1.0, { attack: 0.4, hp: 3000, seed: 91, dur: 1.9 }); return finish(y, 0.3, sr, 0.5); }],
  // a gilt frame slamming onto your plaque: low wood, a metallic ring
  'rf-slam': [2, (sr, i, r) => { const y = buf(sr, 1.6); partial(y, sr, 62 + i * 6, 1.0, 0.16); noise(y, sr, 0.9, 0.05, { lp: 1200, seed: i + 101 }); for (const m of [1, 2.76, 5.4]) partial(y, sr, hz(-5, G4) * m, 0.16, 0.6, { at: 0.004 }); return finish(y, 0.7, sr, 0.4); }],
  // silk: a swish for her slaps and shoves
  'rf-swish': [3, (sr, i, r) => { const y = buf(sr, 0.45); noise(y, sr, 0.6, 0.12, { attack: 0.12, lp: 3200 + i * 600, hp: 700, seed: i + 111, dur: 0.3 }); return finish(y, 0.36, sr, 0.5); }],
  // the destination's glint: a high ding on the fifth
  'rf-ding': [2, (sr, i, r) => { const y = buf(sr, 1.4); partial(y, sr, hz(7, G4 * 4), 0.4, 0.5); partial(y, sr, hz(7, G4 * 8), 0.15, 0.3); return finish(y, 0.3, sr, 0.5); }],
  // keys: six small metal clinks, the bracelet on her wrist
  // (kept below 5 kHz, its overtones soft: brass keys, not a tinkle in your ear)
  'rf-jingle': [4, (sr, i, r) => { const y = buf(sr, 0.35); for (let k = 0; k < 4; k++) { const f = 2600 + r() * 2200; partial(y, sr, f, 0.3, 0.05, { at: r() * 0.08 }); partial(y, sr, f * 2.7, 0.06, 0.025, { at: r() * 0.08 }); } return finish(y, 0.2, sr, 0.5); }],
  // a latch rattling (the door that's about to bang open), a floorboard creak
  'rf-latch': [3, (sr, i, r) => { const y = buf(sr, 0.5); for (let k = 0; k < 5; k++) { noise(y, sr, 0.6, 0.006, { at: k * 0.05 + r() * 0.01, hp: 1200, seed: k + i * 9 }); partial(y, sr, 1800 + r() * 900, 0.2, 0.02, { at: k * 0.05 }); } return finish(y, 0.4, sr, 0.3); }],
  'rf-creak': [2, (sr, i, r) => { const y = buf(sr, 0.9); for (let k = 0; k < 40; k++) partial(y, sr, 160 + 70 * Math.sin(k * 0.4) + i * 30, 0.2, 0.025, { at: k * 0.02 }); return finish(y, 0.32, sr, 0.2); }],
  // a door banging open; splintering boards
  'rf-bang': [2, (sr, i, r) => { const y = buf(sr, 0.8); partial(y, sr, 70 + i * 8, 1.0, 0.1); noise(y, sr, 0.9, 0.06, { lp: 1800, seed: i + 121 }); noise(y, sr, 0.3, 0.2, { at: 0.02, lp: 600, seed: i + 123 }); return finish(y, 0.62, sr, 0.2); }],
  // a heavy porcelain-and-wood boom (her furniture landing)
  'rf-boom': [2, (sr, i, r) => { const y = buf(sr, 1.4); partial(y, sr, 48 + i * 5, 1.0, 0.25); partial(y, sr, 96, 0.4, 0.12); noise(y, sr, 0.8, 0.09, { lp: 900, seed: i + 131 }); china(y, sr, hz(-12 + i * 3), 0.25, 0.3, 0.01, i); return finish(y, 0.8, sr, 0.3); }],
  // a ring of glass petals: bowed glass rising (the waltz), the music box (the lullaby)
  'rf-swirl': [1, (sr, i, r) => { const y = buf(sr, 1.4); for (const [s, a] of [[0, 0.3], [7, 0.2], [12, 0.15], [15, 0.1]]) sweep(y, sr, hz(s), hz(s + 12), a, 1.3, { attack: 0.9, shape: 0.3 }); return finish(y, 0.26, sr, 0.6); }],
  'rf-musicbox': [1, (sr, i, r) => { const y = buf(sr, 1.6); [0, 7, 12, 15, 19, 15, 12, 7].forEach((s, k) => china(y, sr, hz(s + 12), 0.25, 0.4, k * 0.16, k)); return finish(y, 0.24, sr, 0.6); }],
  // a sung-word heel stamp; a heel tapping marble through a fill
  'rf-stamp': [2, (sr, i, r) => { const y = buf(sr, 0.7); partial(y, sr, 110 + i * 10, 0.9, 0.05); noise(y, sr, 0.9, 0.015, { hp: 900, seed: i + 141 }); china(y, sr, hz(-5), 0.25, 0.15, 0.005, i); return finish(y, 0.6, sr, 0.2); }],
  'rf-tap': [3, (sr, i, r) => { const y = buf(sr, 0.2); noise(y, sr, 0.8, 0.008, { hp: 1500, seed: i + 151 }); partial(y, sr, 900 + i * 60, 0.3, 0.02); return finish(y, 0.3, sr); }],
  // paper, pencil, a typewriter tick (the lease)
  'rf-pencil': [2, (sr, i, r) => { const y = buf(sr, 0.7); for (let k = 0; k < 14; k++) noise(y, sr, 0.4, 0.02, { at: k * 0.045, hp: 3500, seed: k + i * 17 }); return finish(y, 0.22, sr, 0.3); }],
  'rf-tick': [3, (sr, i, r) => { const y = buf(sr, 0.12); noise(y, sr, 0.9, 0.004, { hp: 2500, seed: i + 161 }); partial(y, sr, 2200, 0.3, 0.01); return finish(y, 0.2, sr); }],
  // a cold breath at your ear (never alone); a hiss (the mold, a groove stood in)
  'rf-breath': [2, (sr, i, r) => { const y = buf(sr, 1.0); noise(y, sr, 0.6, 0.35, { attack: 0.3, lp: 1400, hp: 300, seed: i + 171, dur: 0.8 }); return finish(y, 0.22, sr, 0.8); }],
  'rf-hiss': [2, (sr, i, r) => { const y = buf(sr, 0.6); noise(y, sr, 0.6, 0.2, { attack: 0.02, hp: 3000, seed: i + 181 }); return finish(y, 0.22, sr, 0.5); }],
  // one low sustained tone per strike in near-silence: root, third, fifth, octave (very quiet)
  'rf-tone': [4, (sr, i, r) => { const y = buf(sr, 1.6); const s = [0, 3, 7, 12][i]; partial(y, sr, hz(s - 12), 0.5, 0.9, { attack: 0.3 }); partial(y, sr, hz(s), 0.18, 0.7, { attack: 0.35 }); return finish(y, 0.22, sr, 0.4); }],
  // the gold ring: a warm rising gold tone, quiet; YOU's colour
  'rf-gold': [1, (sr, i, r) => { const y = buf(sr, 1.2); for (const [s, a] of [[0, 0.3], [7, 0.2], [12, 0.15]]) sweep(y, sr, hz(s), hz(s + 5), a, 1.15, { attack: 0.8, shape: 0.25 }); return finish(y, 0.24, sr, 0.6); }],
  // one small key landing at your feet, ringing in G#
  'rf-key': [1, (sr, i, r) => { const y = buf(sr, 1.8); china(y, sr, hz(24), 0.5, 0.7, 0, 3); partial(y, sr, hz(12, G4 * 2), 0.2, 0.9); return finish(y, 0.3, sr, 0.5); }],
};
const MIX = {
  'rf-tink': 0.75, 'rf-crackle': 0.7, 'rf-burst': 1.3, 'rf-thread': 0.7, 'rf-crack': 0.95, 'rf-ting': 0.6, 'rf-thud': 0.48, 'rf-mwah': 0.55,
  'rf-wires': 0.42, 'rf-slam': 1.0, 'rf-swish': 0.55, 'rf-ding': 0.5, 'rf-jingle': 0.28, 'rf-latch': 0.6, 'rf-creak': 0.5, 'rf-bang': 0.85,
  'rf-boom': 1.0, 'rf-swirl': 0.5, 'rf-musicbox': 0.45, 'rf-stamp': 0.8, 'rf-tap': 0.45, 'rf-pencil': 0.4, 'rf-tick': 0.6, 'rf-breath': 0.45,
  'rf-hiss': 0.38, 'rf-tone': 0.45, 'rf-gold': 0.5, 'rf-key': 0.5,
};
const GATE = { 'rf-tink': 0.04, 'rf-crackle': 0.05, 'rf-burst': 0.06, 'rf-thread': 0.05, 'rf-crack': 0.07, 'rf-thud': 0.06, 'rf-jingle': 0.1, 'rf-tap': 0.05, 'rf-tick': 0.04, 'rf-mwah': 0.06, 'rf-hiss': 0.12 };

// put our sounds in the bank (once per page) and return a player
export function installSounds(f) {
  const lib = f.sfx && f.sfx.s;
  if (!lib || !lib.bank || !lib._store) return { play() {}, lib: null };
  const sr = lib.ctx.sampleRate;
  if (!lib.bank.map.has('rf-key')) {
    for (const [name, [takes, fn]] of Object.entries(RECIPES)) {
      const out = []; for (let i = 0; i < takes; i++) out.push(fn(sr, i, rng(i * 7919 + name.length * 131)));
      lib._store(name, out);
    }
  }
  Object.assign(lib.mix, MIX);
  const last = new Map();
  return {
    lib,
    // play(name, { x (world x: panned to it), pan, gain, rate, at (s from now), time (song time) })
    play(name, o = {}) {
      const g = GATE[name]; const now = lib.ctx.currentTime;
      if (g && o.time === undefined) { const l = last.get(name); if (l !== undefined && now - l < g) return null; last.set(name, now); }
      const p = { pan: o.pan ?? (o.x !== undefined ? f.pan(o.x) : 0), gain: o.gain ?? 1, rate: o.rate, at: o.at, must: o.must };
      if (o.panTo !== undefined) { p.panTo = o.panTo; p.panDur = o.panDur; }
      if (o.time !== undefined) p.time = lib.timeOfSong(o.time);
      return lib.play(name, p);
    },
  };
}
export { RECIPES, MIX };
