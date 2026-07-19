// DUET — util. Pure helpers, no game state. Deterministic RNG so headless tests reproduce runs.
window.U = (() => {
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invlerp = (a, b, v) => (v - a) / (b - a);
  const TAU = Math.PI * 2;
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const ms2f = (ms) => ms * 0.06;                 // milliseconds -> fixed frames (ms/1000*60)
  const perSec = (v) => v * CFG.DT;               // px/s -> px/frame at fixed step
  const smoothTo = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));

  // normalize a movement vector; keeps diagonals from being 1.41x faster (Alex-hates-mush rule)
  function normDiag(dx, dy) {
    if (dx === 0 && dy === 0) return [0, 0];
    const m = Math.hypot(dx, dy);
    return [dx / m, dy / m];
  }

  // mulberry32 seeded RNG. setSeed for deterministic patterns/rain/ghost density.
  let _s = 0x9e3779b9 >>> 0;
  function setSeed(n) { _s = (n >>> 0) || 1; }
  function rnd() {
    _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
    let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rrange = (a, b) => a + rnd() * (b - a);

  // hex "#rrggbb" -> [r,g,b]
  function hex2rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

  return { clamp, lerp, invlerp, TAU, dist, dist2, ms2f, perSec, smoothTo, normDiag,
           setSeed, rnd, rrange, hex2rgb, rgba };
})();
