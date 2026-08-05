// FINALE — util. Pure helpers, no game state. Two RNG streams: one for gameplay (deterministic,
// seeded, replayable) and one purely cosmetic. Cosmetic randomness must NEVER touch the gameplay
// stream or seeded runs stop reproducing.
window.U = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invlerp = (a, b, v) => (v - a) / (b - a);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const deg = (d) => d * Math.PI / 180;

  // move `cur` toward `target` by at most `maxDelta`. The anti-mush primitive: no exponential smoothing
  // anywhere in movement, because exp smoothing is exactly what "floaty" feels like.
  function approach(cur, target, maxDelta) {
    if (cur < target) return Math.min(cur + maxDelta, target);
    if (cur > target) return Math.max(cur - maxDelta, target);
    return target;
  }

  // ---- fast trig LUT (4096 steps). Bullet emitters call sin/cos thousands of times per frame. ----
  const LUT_N = 4096, LUT_MASK = LUT_N - 1, SIN = new Float32Array(LUT_N), COS = new Float32Array(LUT_N);
  for (let i = 0; i < LUT_N; i++) { const a = i / LUT_N * TAU; SIN[i] = Math.sin(a); COS[i] = Math.cos(a); }
  const _idx = (a) => (((a * (LUT_N / TAU)) | 0) & LUT_MASK);
  const fsin = (a) => SIN[_idx(a < 0 ? a + TAU * (1 + ((-a / TAU) | 0)) : a)];
  const fcos = (a) => COS[_idx(a < 0 ? a + TAU * (1 + ((-a / TAU) | 0)) : a)];

  // ---- mulberry32, two independent streams ----
  function makeStream(seed) {
    let s = (seed >>> 0) || 1;
    const next = () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      set(n) { s = (n >>> 0) || 1; },
      range: (a, b) => a + next() * (b - a),
      int: (a, b) => a + ((next() * (b - a + 1)) | 0),
      pick: (arr) => arr[(next() * arr.length) | 0],
      sign: () => (next() < 0.5 ? -1 : 1),
    };
  }
  const rngRun = makeStream(0x9e3779b9);      // gameplay: seeded, deterministic
  const rngFx = makeStream(0x1234567);        // cosmetic only

  function hex2rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  const hexa = (h, a) => rgba(hex2rgb(h), a);

  // shortest signed angular difference, so turrets never spin the long way round
  function angDiff(a, b) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  return { TAU, clamp, lerp, invlerp, dist, dist2, deg, approach, fsin, fcos, angDiff,
           rngRun, rngFx, makeStream, hex2rgb, rgba, hexa };
})();
