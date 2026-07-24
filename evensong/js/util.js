// EVENSONG — small utilities. No dependencies anywhere in this project.
window.U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  ease: t => t * t * (3 - 2 * t),                       // smoothstep
  easeOut: t => 1 - (1 - t) * (1 - t),
  dbToGain: db => Math.pow(10, db / 20),
  // deterministic tiny PRNG (mulberry32) — visuals may use randomness, the SIM never does.
  rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  fmtTime(s) { const m = Math.floor(s / 60); return m + ':' + String(Math.floor(s % 60)).padStart(2, '0'); },
};
