// PTSDREAM GIRL's own sounds: glass, gold, porcelain, paper, steel. Synthesized once at load (no files),
// short-tailed, panned to where they come from, sitting under the song. Count ticks are pitched to the chord
// that's sounding. Anything scheduled ahead (a count's ticks) can be called off when the record stops.
const TAU = Math.PI * 2;

function mk(sr, dur) { return new Float32Array(Math.max(1, Math.ceil(dur * sr))); }
// a struck partial: a sine with an exponential decay (glass, gold, porcelain), optional pitch glide
function ping(y, sr, f, amp, tau, at = 0, glide = 0, attack = 0.0006) {
  let ph = Math.random() * TAU;
  const i0 = Math.floor(at * sr);
  for (let i = i0; i < y.length; i++) {
    const t = (i - i0) / sr, e = Math.exp(-t / tau) * Math.min(1, t / attack);
    if (t > attack && e < 2e-4) break;
    ph += TAU * f * (1 + glide * Math.min(t, 0.5)) / sr;
    y[i] += Math.sin(ph) * amp * e;
  }
}
// a body thump: a sine falling in pitch
function thud(y, sr, f0, f1, amp, tau, at = 0, tauF = 0.04) {
  let ph = 0; const i0 = Math.floor(at * sr);
  for (let i = i0; i < y.length; i++) {
    const t = (i - i0) / sr, e = Math.exp(-t / tau) * Math.min(1, t / 0.002);
    if (t > 0.01 && e < 2e-4) break;
    ph += TAU * (f1 + (f0 - f1) * Math.exp(-t / tauF)) / sr;
    y[i] += Math.sin(ph) * amp * e;
  }
}
// filtered noise with an envelope (a state-variable filter: lp / bp / hp), cutoff can sweep f -> f1
function noise(y, sr, { at = 0, dur = 0.1, amp = 0.5, f = 2000, f1 = 0, q = 1, type = 'bp', env = null, atk = 0.003 }) {
  let lo = 0, bd = 0; const i0 = Math.floor(at * sr), n = Math.floor(dur * sr);
  for (let k = 0; k < n && i0 + k < y.length; k++) {
    const u = k / n, fc = f1 ? f * Math.pow(f1 / f, u) : f;
    const F = 2 * Math.sin(Math.PI * Math.min(0.45, fc / sr)), D = 1 / q;
    const x = Math.random() * 2 - 1;
    const hi = x - lo - D * bd; bd += F * hi; lo += F * bd;
    const o = type === 'lp' ? lo : type === 'hp' ? hi : bd;
    const e = env ? env(u, k / sr) : Math.min(1, (k / sr) / atk) * Math.pow(1 - u, 2);
    y[i0 + k] += o * amp * e;
  }
}
function click(y, sr, at = 0, amp = 1) { const i = Math.floor(at * sr); for (let k = 0; k < 24 && i + k < y.length; k++) y[i + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / 5); }
function norm(y, peak) { let m = 0; for (const v of y) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < y.length; i++) y[i] *= peak / m; return y; }
// glass: inharmonic partials of a struck glass
function glass(y, sr, f, amp, tau, at = 0) { ping(y, sr, f, amp, tau, at); ping(y, sr, f * 2.32, amp * 0.55, tau * 0.6, at); ping(y, sr, f * 4.25, amp * 0.3, tau * 0.35, at); ping(y, sr, f * 6.63, amp * 0.14, tau * 0.22, at); }
function porcelain(y, sr, f, amp, tau, at = 0) { ping(y, sr, f, amp, tau, at); ping(y, sr, f * 2.71, amp * 0.6, tau * 0.5, at); ping(y, sr, f * 5.1, amp * 0.35, tau * 0.25, at); click(y, sr, at, amp * 0.6); }
function gold(y, sr, f, amp, tau, at = 0) { ping(y, sr, f, amp, tau, at); ping(y, sr, f * 2.76, amp * 0.5, tau * 0.7, at); ping(y, sr, f * 5.4, amp * 0.25, tau * 0.4, at); ping(y, sr, f * 8.9, amp * 0.12, tau * 0.25, at); }
const rnd = (a, b) => a + Math.random() * (b - a);

// name -> (sr) => Float32Array (mono). Peaks are set per sound; levels again at play time.
const R = {
  // the pin: a gold tink, but only its two low partials (the gold's 17 kHz and folded-over 28 kHz ones were a needle)
  pin: (sr) => { const y = mk(sr, 0.5); ping(y, sr, 3150, 1, 0.12); ping(y, sr, 3150 * 2.76, 0.42, 0.08); noise(y, sr, { at: 0.012, dur: 0.06, amp: 0.22, f: 2500, f1: 6000, q: 3 }); return norm(y, 0.8); },
  clonk: (sr) => { const y = mk(sr, 0.6); glass(y, sr, 720, 1, 0.16); glass(y, sr, 1130, 0.5, 0.1, 0.004); thud(y, sr, 180, 70, 0.8, 0.07); noise(y, sr, { at: 0.02, dur: 0.35, amp: 0.12, f: 5000, type: 'hp', env: (u) => (1 - u) * 0.6 }); return norm(y, 0.85); },
  tik: (sr) => { const y = mk(sr, 0.22); glass(y, sr, 1760, 1, 0.05); click(y, sr, 0, 0.5); noise(y, sr, { at: 0.006, dur: 0.05, amp: 0.18, f: 6500, type: 'hp' }); return norm(y, 0.8); },
  sting: (sr) => { const y = mk(sr, 1.1); noise(y, sr, { dur: 0.42, amp: 1, f: 3200, f1: 1800, q: 0.7, env: (u, t) => Math.min(1, t / 0.004) * Math.pow(1 - u, 1.6) }); click(y, sr, 0.0, 1); glass(y, sr, 1850, 0.55, 0.06, 0.004); for (let i = 0; i < 7; i++) ping(y, sr, rnd(3800, 6800), 0.09, 0.25, 0.05 + i * 0.045); return norm(y, 0.8); },
  boom: (sr) => { const y = mk(sr, 1.2); thud(y, sr, 140, 46, 1, 0.3, 0, 0.08); glass(y, sr, 380, 0.5, 0.25); noise(y, sr, { dur: 0.3, amp: 0.55, f: 2600, q: 0.8 }); porcelain(y, sr, 1500, 0.4, 0.05, 0.01); for (let i = 0; i < 9; i++) ping(y, sr, rnd(2800, 7000), 0.08, 0.3, 0.06 + i * 0.05); return norm(y, 0.9); },
  puff: (sr) => { const y = mk(sr, 0.4); noise(y, sr, { dur: 0.25, amp: 1, f: 2400, f1: 900, type: 'lp', env: (u, t) => Math.min(1, t / 0.03) * Math.pow(1 - u, 2) }); return norm(y, 0.5); },
  kiss: (sr) => { const y = mk(sr, 0.5); noise(y, sr, { dur: 0.14, amp: 1, f: 2000, f1: 900, type: 'lp', env: (u, t) => Math.min(1, t / 0.015) * Math.pow(1 - u, 2) }); glass(y, sr, 2640, 0.55, 0.12, 0.02); return norm(y, 0.6); },
  kissGold: (sr) => { const y = mk(sr, 0.6); gold(y, sr, 2350, 0.8, 0.12); gold(y, sr, 3520, 0.6, 0.12, 0.05); return norm(y, 0.6); },
  clack: (sr) => { const y = mk(sr, 0.4); porcelain(y, sr, 1380, 1, 0.035); thud(y, sr, 260, 120, 0.4, 0.04); noise(y, sr, { dur: 0.09, amp: 0.4, f: 1700, f1: 900, q: 0.8 }); return norm(y, 0.8); },
  whoosh: (sr) => { const y = mk(sr, 0.4); noise(y, sr, { dur: 0.3, amp: 1, f: 700, f1: 2200, q: 1.1, env: (u) => Math.sin(Math.PI * Math.pow(u, 0.7)) }); return norm(y, 0.5); },
  skreek: (sr) => { const y = mk(sr, 0.25); let ph = 0; for (let i = 0; i < y.length; i++) { const t = i / sr; ph += TAU * (4200 + 500 * Math.sin(t * TAU * 37)) / sr; y[i] += Math.sin(ph) * Math.exp(-t / 0.05) * Math.min(1, t / 0.006) * 0.4; } noise(y, sr, { dur: 0.16, amp: 0.4, f: 5200, q: 4 }); return norm(y, 0.42); },
  vhs: (sr) => { const y = mk(sr, 0.3); click(y, sr, 0, 1); click(y, sr, 0.05, 0.8); noise(y, sr, { dur: 0.12, amp: 0.35, f: 3000, q: 0.5, env: (u) => (Math.sin(u * 80) > 0 ? 1 : 0.2) * (1 - u) }); return norm(y, 0.5); },
  latch: (sr) => { const y = mk(sr, 0.3); click(y, sr, 0, 1); porcelain(y, sr, 2100, 0.4, 0.02, 0.002); thud(y, sr, 300, 150, 0.3, 0.03, 0.01); return norm(y, 0.5); },
  appear: (sr) => { const y = mk(sr, 0.6); noise(y, sr, { dur: 0.3, amp: 0.6, f: 1200, f1: 4000, q: 0.8, env: (u) => Math.sin(Math.PI * u) }); for (let i = 0; i < 5; i++) ping(y, sr, rnd(3000, 6000), 0.12, 0.15, 0.1 + i * 0.03); return norm(y, 0.45); },
  shing: (sr) => { const y = mk(sr, 0.5); noise(y, sr, { dur: 0.16, amp: 0.5, f: 3000, f1: 6000, q: 3, env: (u) => Math.sin(Math.PI * u) }); gold(y, sr, 3900, 0.45, 0.14, 0.12); return norm(y, 0.55); },
  thwip: (sr) => { const y = mk(sr, 0.25); noise(y, sr, { dur: 0.14, amp: 1, f: 1500, f1: 5000, q: 1.5, env: (u) => Math.sin(Math.PI * u) }); return norm(y, 0.45); },
  thunk: (sr) => { const y = mk(sr, 0.35); thud(y, sr, 240, 90, 1, 0.05); porcelain(y, sr, 900, 0.3, 0.03); click(y, sr, 0, 0.6); return norm(y, 0.7); },
  rattle: (sr) => { const y = mk(sr, 0.4); for (let i = 0; i < 7; i++) glass(y, sr, rnd(1500, 3200), rnd(0.2, 0.5), 0.04, i * 0.018 + rnd(0, 0.01)); thud(y, sr, 160, 90, 0.4, 0.05); return norm(y, 0.6); },
  glassburst: (sr) => { const y = mk(sr, 1.2); noise(y, sr, { dur: 0.25, amp: 1, f: 4000, q: 0.6 }); click(y, sr, 0, 1); for (let i = 0; i < 26; i++) glass(y, sr, rnd(2200, 7500), rnd(0.05, 0.16), rnd(0.03, 0.1), 0.02 + Math.pow(Math.random(), 1.6) * 0.8); noise(y, sr, { at: 0.05, dur: 0.6, amp: 0.15, f: 6000, type: 'hp' }); return norm(y, 0.75); },
  rack: (sr) => { const y = mk(sr, 0.7); thud(y, sr, 120, 55, 1, 0.12, 0, 0.05); ping(y, sr, 310, 0.35, 0.18); ping(y, sr, 710, 0.25, 0.12); click(y, sr, 0, 0.8); for (let i = 0; i < 10; i++) porcelain(y, sr, rnd(900, 2600), rnd(0.05, 0.15), 0.02, 0.03 + i * 0.03 + rnd(0, 0.02)); return norm(y, 0.85); },
  zzt: (sr) => { const y = mk(sr, 0.12); for (let i = 0; i < y.length; i++) { const t = i / sr; y[i] += (Math.sin(t * TAU * 1050) > 0 ? 0.3 : -0.3) * Math.exp(-t / 0.035) * Math.min(1, t / 0.002); } noise(y, sr, { dur: 0.08, amp: 0.25, f: 3000, q: 2 }); return norm(y, 0.32); },
  floor: (sr) => { const y = mk(sr, 1.4); thud(y, sr, 90, 32, 1, 0.35, 0, 0.09); thud(y, sr, 200, 70, 0.5, 0.08); noise(y, sr, { dur: 0.25, amp: 0.4, f: 900, type: 'lp' }); for (let i = 0; i < 14; i++) porcelain(y, sr, rnd(2500, 6000), 0.05, 0.05, 0.08 + i * 0.04); return norm(y, 0.95); },
  tube: (sr) => { const y = mk(sr, 0.4); click(y, sr, 0, 1); noise(y, sr, { dur: 0.12, amp: 0.7, f: 3500, q: 0.7 }); glass(y, sr, 2900, 0.3, 0.05, 0.004); return norm(y, 0.5); },
  clank: (sr) => { const y = mk(sr, 0.6); ping(y, sr, 420, 0.6, 0.2); ping(y, sr, 1170, 0.4, 0.12); thud(y, sr, 150, 60, 0.9, 0.1); click(y, sr, 0, 1); return norm(y, 0.8); },
  whoop: (sr) => { const y = mk(sr, 0.5); let ph = 0; for (let i = 0; i < y.length; i++) { const t = i / sr, u = t / 0.42; if (u > 1) break; ph += TAU * (620 + 520 * u) / sr; y[i] += (Math.sin(ph) + 0.25 * Math.sin(ph * 2)) * Math.sin(Math.PI * u) * 0.5; } return norm(y, 0.36); },
  rush: (sr) => { const y = mk(sr, 1.0); noise(y, sr, { dur: 0.8, amp: 1, f: 500, f1: 2600, q: 0.6, env: (u, t) => Math.min(1, t / 0.02) * Math.pow(1 - u, 1.4) }); for (let i = 0; i < 12; i++) ping(y, sr, rnd(3500, 8000), 0.07, 0.2, 0.1 + i * 0.05); return norm(y, 0.6); },
  crack: (sr) => { const y = mk(sr, 0.4); click(y, sr, 0, 1); noise(y, sr, { dur: 0.05, amp: 0.8, f: 4500, q: 0.8 }); glass(y, sr, rnd(2600, 3000), 0.4, 0.06, 0.003); return norm(y, 0.6); },
  smash: (sr) => { const y = mk(sr, 1.2); noise(y, sr, { dur: 0.3, amp: 1, f: 3500, q: 0.6 }); for (let i = 0; i < 22; i++) glass(y, sr, rnd(2000, 7000), rnd(0.05, 0.15), rnd(0.03, 0.09), Math.pow(Math.random(), 1.8) * 0.7); noise(y, sr, { at: 0.05, dur: 0.5, amp: 0.25, f: 2500, f1: 6000, q: 1.2, env: (u) => Math.sin(Math.PI * u) }); return norm(y, 0.75); },
  heel: (sr) => { const y = mk(sr, 0.6); porcelain(y, sr, 1100, 0.6, 0.05); thud(y, sr, 130, 50, 1, 0.16, 0, 0.05); return norm(y, 0.85); },
  bed: (sr) => { const y = mk(sr, 0.9); thud(y, sr, 95, 45, 1, 0.22, 0, 0.06); noise(y, sr, { dur: 0.3, amp: 0.4, f: 600, type: 'lp' }); let ph = 0; for (let i = Math.floor(0.12 * sr); i < y.length; i++) { const t = i / sr - 0.12; ph += TAU * (230 + 40 * Math.sin(t * 9)) / sr; y[i] += Math.sin(ph) * 0.06 * Math.exp(-t / 0.2) * (0.5 + 0.5 * Math.sin(t * 160)); } return norm(y, 0.85); },
  stomp: (sr) => { const y = mk(sr, 1.2); porcelain(y, sr, 700, 0.7, 0.06); thud(y, sr, 110, 36, 1, 0.3, 0.005, 0.08); noise(y, sr, { at: 0.02, dur: 0.5, amp: 0.4, f: 400, f1: 1800, q: 0.7, env: (u) => Math.sin(Math.PI * u) }); return norm(y, 0.95); },
  pats: (sr) => { const y = mk(sr, 0.7); for (let i = 0; i < 3; i++) { thud(y, sr, 220, 140, 0.5, 0.03, i * 0.16); noise(y, sr, { at: i * 0.16, dur: 0.05, amp: 0.25, f: 900, type: 'lp' }); } porcelain(y, sr, 2600, 0.2, 0.08, 0.5); return norm(y, 0.45); },
  rustle: (sr) => { const y = mk(sr, 0.6); noise(y, sr, { dur: 0.45, amp: 1, f: 3500, q: 0.6, env: (u) => (0.5 + 0.5 * Math.sin(u * 47)) * Math.sin(Math.PI * u) }); for (let i = 0; i < 4; i++) ping(y, sr, rnd(2600, 4200), 0.15, 0.15, 0.05 + i * 0.09); return norm(y, 0.4); },
  zip: (sr) => { const y = mk(sr, 0.4); noise(y, sr, { dur: 0.25, amp: 1, f: 1500, f1: 4500, q: 2, env: (u) => (0.6 + 0.4 * Math.sin(u * 140)) * Math.sin(Math.PI * u) }); return norm(y, 0.45); },
  ratchet: (sr) => { const y = mk(sr, 0.2); click(y, sr, 0, 1); click(y, sr, 0.018, 0.7); ping(y, sr, 2400, 0.3, 0.02); thud(y, sr, 400, 200, 0.3, 0.02); return norm(y, 0.55); },
  snap: (sr) => { const y = mk(sr, 0.4); click(y, sr, 0, 1); thud(y, sr, 300, 100, 0.8, 0.05); noise(y, sr, { dur: 0.08, amp: 0.6, f: 2000, q: 0.7 }); return norm(y, 0.7); },
  switch: (sr) => { const y = mk(sr, 0.2); click(y, sr, 0, 1); click(y, sr, 0.012, 0.6); ping(y, sr, 3000, 0.2, 0.01); thud(y, sr, 500, 300, 0.25, 0.015); return norm(y, 0.5); },
  ding: (sr) => { const y = mk(sr, 1.0); gold(y, sr, 1661, 0.8, 0.35); gold(y, sr, 2489, 0.5, 0.3, 0.09); return norm(y, 0.45); },
  notif: (sr) => { const y = mk(sr, 0.15); ping(y, sr, 2490, 0.6, 0.025); click(y, sr, 0, 0.3); return norm(y, 0.35); },
  thwack: (sr) => { const y = mk(sr, 0.7); click(y, sr, 0, 1); thud(y, sr, 260, 90, 0.7, 0.06); for (let i = 0; i < 6; i++) click(y, sr, 0.008 + i * 0.012, 0.5); noise(y, sr, { at: 0.02, dur: 0.5, amp: 0.4, f: 800, f1: 3000, q: 0.6, env: (u) => Math.sin(Math.PI * u) * (1 - u) }); return norm(y, 0.7); },
  flutter: (sr) => { const y = mk(sr, 0.35); noise(y, sr, { dur: 0.3, amp: 1, f: 2600, q: 0.8, env: (u) => (Math.sin(u * 60) > 0 ? 1 : 0.3) * Math.sin(Math.PI * u) }); return norm(y, 0.35); },
  fwump: (sr) => { const y = mk(sr, 1.0); thud(y, sr, 80, 40, 1, 0.2, 0.05, 0.08); noise(y, sr, { dur: 0.7, amp: 0.9, f: 400, f1: 1600, q: 0.5, env: (u, t) => Math.min(1, t / 0.08) * Math.pow(1 - u, 1.3) }); return norm(y, 0.8); },
  splat: (sr) => { const y = mk(sr, 0.35); noise(y, sr, { dur: 0.18, amp: 1, f: 1200, f1: 500, type: 'lp', env: (u, t) => Math.min(1, t / 0.004) * Math.pow(1 - u, 3) }); thud(y, sr, 180, 80, 0.5, 0.04); return norm(y, 0.55); },
  bells: (sr) => { const y = mk(sr, 1.0); for (let i = 0; i < 14; i++) { gold(y, sr, i % 2 ? 2350 : 2490, 0.35, 0.05, i * 0.058); } return norm(y, 0.42); },
  clink: (sr) => { const y = mk(sr, 0.6); glass(y, sr, 2100, 0.8, 0.25); glass(y, sr, 3330, 0.3, 0.15, 0.003); return norm(y, 0.5); },
  slosh: (sr) => { const y = mk(sr, 1.2); noise(y, sr, { dur: 1.0, amp: 1, f: 300, f1: 1200, q: 0.5, env: (u, t) => Math.min(1, t / 0.05) * Math.pow(1 - u, 1.2) }); thud(y, sr, 70, 35, 0.6, 0.3); return norm(y, 0.75); },
  plate: (sr) => { const y = mk(sr, 0.15); click(y, sr, 0, 1); ping(y, sr, 900, 0.4, 0.02); ping(y, sr, 1800, 0.2, 0.012); return norm(y, 0.4); },
  pop: (sr) => { const y = mk(sr, 0.5); click(y, sr, 0, 1); thud(y, sr, 160, 60, 0.8, 0.08); noise(y, sr, { dur: 0.18, amp: 0.5, f: 1800, q: 0.7 }); return norm(y, 0.65); },
  servo: (sr) => { const y = mk(sr, 0.5); let ph = 0; for (let i = 0; i < y.length; i++) { const t = i / sr; ph += TAU * (380 + 240 * t) / sr; y[i] += (Math.sin(ph) * 0.5 + Math.sin(ph * 3) * 0.2) * Math.sin(Math.PI * t / 0.5) * 0.3; } return norm(y, 0.25); },
  shutter: (sr) => { const y = mk(sr, 0.15); click(y, sr, 0, 1); click(y, sr, 0.03, 0.8); noise(y, sr, { dur: 0.05, amp: 0.4, f: 3000, q: 1 }); return norm(y, 0.45); },
  giggle: (sr) => { const y = mk(sr, 0.7); const base = 1760; [0, 4, 7].forEach((s, i) => { const f = base * Math.pow(2, s / 12); for (let k = 0; k < 4; k++) glass(y, sr, f * (1 + (k % 2) * 0.012), 0.25, 0.035, i * 0.13 + k * 0.03); }); return norm(y, 0.42); },
  scrape: (sr) => { const y = mk(sr, 0.4); noise(y, sr, { dur: 0.32, amp: 1, f: 3800, f1: 6200, q: 6, env: (u) => Math.sin(Math.PI * u) }); return norm(y, 0.32); },
  whine: (sr) => { const y = mk(sr, 0.5); let ph = 0; for (let i = 0; i < y.length; i++) { const t = i / sr; ph += TAU * (1300 + 600 * t) / sr; y[i] += Math.sin(ph) * Math.sin(Math.PI * t / 0.5) * 0.2; } return norm(y, 0.2); },
  tunk: (sr) => { const y = mk(sr, 0.3); thud(y, sr, 320, 160, 0.8, 0.04); ping(y, sr, 1240, 0.4, 0.06); click(y, sr, 0, 0.6); return norm(y, 0.55); },
  chime: (sr) => { const y = mk(sr, 0.9); ping(y, sr, 1046.5, 0.6, 0.3); ping(y, sr, 2093, 0.2, 0.2); noise(y, sr, { dur: 0.4, amp: 0.12, f: 900, type: 'lp', env: (u) => Math.sin(Math.PI * u) }); return norm(y, 0.32); },
  potcrash: (sr) => { const y = mk(sr, 0.8); thud(y, sr, 170, 70, 1, 0.08); noise(y, sr, { dur: 0.3, amp: 0.8, f: 1200, q: 0.6 }); for (let i = 0; i < 10; i++) porcelain(y, sr, rnd(700, 1900), 0.12, 0.03, 0.02 + i * 0.04); return norm(y, 0.75); },
  snuff: (sr) => { const y = mk(sr, 0.6); noise(y, sr, { dur: 0.18, amp: 1, f: 1500, f1: 400, type: 'lp' }); for (let i = 0; i < 8; i++) glass(y, sr, rnd(2500, 6000), 0.1, 0.05, 0.05 + i * 0.04); return norm(y, 0.6); },
  grind: (sr) => { const y = mk(sr, 0.5); noise(y, sr, { dur: 0.45, amp: 1, f: 900, q: 4, env: (u) => (0.5 + 0.5 * Math.sin(u * 90)) * Math.sin(Math.PI * u) }); for (let i = 0; i < 3; i++) porcelain(y, sr, rnd(2000, 4000), 0.15, 0.03, 0.1 + i * 0.12); return norm(y, 0.3); },
  deeptick: (sr) => { const y = mk(sr, 1.2); thud(y, sr, 90, 55, 1, 0.35, 0, 0.1); glass(y, sr, 440, 0.4, 0.4); click(y, sr, 0, 0.5); return norm(y, 0.8); },
  hiss: (sr) => { const y = mk(sr, 0.9); noise(y, sr, { dur: 0.8, amp: 1, f: 5000, type: 'hp', env: (u, t) => Math.min(1, t / 0.05) * Math.pow(1 - u, 1.5) }); return norm(y, 0.3); },
  lift: (sr) => { const y = mk(sr, 0.7); thud(y, sr, 70, 40, 0.8, 0.25, 0, 0.2); noise(y, sr, { dur: 0.6, amp: 0.4, f: 180, f1: 400, type: 'lp', env: (u) => Math.sin(Math.PI * u) }); return norm(y, 0.6); },
  fly: (sr) => { const y = mk(sr, 0.5); noise(y, sr, { dur: 0.42, amp: 1, f: 300, f1: 1400, q: 0.8, env: (u, t) => Math.min(1, t / 0.01) * Math.pow(1 - u, 1.5) }); click(y, sr, 0, 0.5); ping(y, sr, 620, 0.15, 0.08); return norm(y, 0.42); },
  land: (sr) => { const y = mk(sr, 0.8); thud(y, sr, 110, 45, 1, 0.2, 0, 0.06); click(y, sr, 0, 0.7); noise(y, sr, { dur: 0.25, amp: 0.35, f: 700, type: 'lp' }); ping(y, sr, 260, 0.2, 0.1); return norm(y, 0.85); },
  buzz: (sr) => { const y = mk(sr, 0.4); for (let i = 0; i < y.length; i++) { const t = i / sr; y[i] += (Math.sin(t * TAU * 120) * 0.5 + Math.sin(t * TAU * 240) * 0.3) * Math.sin(Math.PI * t / 0.4) * (0.6 + 0.4 * Math.sin(t * 70)); } return norm(y, 0.22); },
  heal: (sr) => { const y = mk(sr, 0.6); ping(y, sr, 1318.5, 0.5, 0.18); ping(y, sr, 1975.5, 0.25, 0.14, 0.03); noise(y, sr, { dur: 0.3, amp: 0.08, f: 700, type: 'lp', env: (u) => Math.sin(Math.PI * u) }); return norm(y, 0.3); },
};

// per-sound level (on top of the sfx bus)
const LEVEL = {
  pin: 0.42, clonk: 0.55, tik: 0.42, sting: 0.6, boom: 0.75, puff: 0.25, kiss: 0.34, kissGold: 0.32, clack: 0.55, whoosh: 0.32, skreek: 0.3,
  vhs: 0.38, latch: 0.4, appear: 0.35, shing: 0.36, thwip: 0.32, thunk: 0.45, rattle: 0.45, glassburst: 0.6, rack: 0.62, zzt: 0.28,
  floor: 0.85, tube: 0.4, clank: 0.6, whoop: 0.3, rush: 0.5, crack: 0.45, smash: 0.6, heel: 0.6, bed: 0.6, stomp: 0.75, pats: 0.38,
  rustle: 0.35, zip: 0.38, ratchet: 0.42, snap: 0.5, switch: 0.4, ding: 0.4, notif: 0.3, thwack: 0.55, flutter: 0.3, fwump: 0.6,
  splat: 0.42, bells: 0.35, clink: 0.42, slosh: 0.55, plate: 0.32, pop: 0.48, servo: 0.22, shutter: 0.36, giggle: 0.38, scrape: 0.26,
  whine: 0.18, tunk: 0.42, chime: 0.3, potcrash: 0.55, snuff: 0.45, grind: 0.26, deeptick: 0.62, hiss: 0.25, lift: 0.45, fly: 0.36,
  land: 0.62, buzz: 0.16, heal: 0.3,
};

export class Sounds {
  constructor(f) {
    this.f = f; this.a = f.audio; this.ctx = this.a && this.a.ctx;
    this.bufs = new Map(); this.recent = new Map(); this.queued = [];
  }
  init() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    for (const [k, fn] of Object.entries(R)) {
      try { const y = fn(sr); const b = this.ctx.createBuffer(1, y.length, sr); b.copyToChannel(y, 0); this.bufs.set(k, b); } catch (e) { console.warn('ptsd sound', k, e.message); }
    }
  }
  // play a sound now, or at song time `when` (scheduled exactly; called off by stopQueued on a death)
  // x: world x for the pan (or pan directly); rate: pitch (a count tick climbs the chord)
  play(name, { x, pan, gain = 1, rate = 1, when } = {}) {
    const b = this.bufs.get(name); if (!b || !this.ctx || this.ctx.state !== 'running') return null;
    const f = this.f;
    if (f.manual) return null;
    const now = this.ctx.currentTime;
    let at = now;
    if (when !== undefined && f.state === 'play' && this.a.t0) { at = this.a.t0 + when; if (at < now - 0.03) return null; at = Math.max(now, at); }
    // no more than three of the same sound inside a quarter second
    const list = (this.recent.get(name) || []).filter((t) => Math.abs(t - at) < 0.25);
    if (list.length >= 3) return null;
    list.push(at); this.recent.set(name, list);
    const src = this.ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate * (1 + (Math.random() - 0.5) * 0.03);
    const g = this.ctx.createGain(); g.gain.value = (LEVEL[name] ?? 0.4) * gain;
    const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan ?? (x !== undefined ? f.pan(x) : 0)));
    src.connect(g).connect(p).connect(this.a.sfx);
    src.start(at);
    const h = { src, at, end: at + b.duration / rate };
    if (at > now + 0.02) this.queued.push(h);
    src.onended = () => { src.disconnect(); g.disconnect(); p.disconnect(); };
    return h;
  }
  // the chord sounding at song time t: a rate for a tick (root, 2nd, 3rd, 5th as the count climbs)
  tickRate(t, step) {
    const f = this.f, C = f.chords && f.chords.beats;
    let root = 8, minor = false;   // G# major
    if (C && C.length) { const i = Math.max(0, Math.min(C.length - 1, Math.round(f.bm.beatAt(t)))); root = C[i][0]; minor = C[i][1] === 'min'; }
    const iv = [0, 2, minor ? 3 : 4, 7][step % 4];
    // the tick is made at A6 (1760 Hz): put it on this chord, in a high register
    let semis = (root + iv) - 9; while (semis < -4) semis += 12; while (semis > 7) semis -= 12;
    return Math.pow(2, semis / 12);
  }
  // call off one queued sound that hasn't started yet (one that's playing is left to ring out)
  stop(h) { if (h && this.ctx && h.at > this.ctx.currentTime) { try { h.src.stop(); } catch (e) { /* gone */ } } }
  stopQueued() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    for (const h of this.queued) if (h.at > now) { try { h.src.stop(); } catch (e) { /* gone */ } }
    this.queued.length = 0;
  }
  update() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.queued.length > 40) this.queued = this.queued.filter((h) => h.end > now);
  }
}
