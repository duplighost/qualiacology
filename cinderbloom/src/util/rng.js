// Deterministic PRNG. Math.random() is BANNED repo-wide (see docs/CONTRACT.md §3):
// the visual-regression harness requires byte-identical frames across runs.

/** sfc32 — fast, excellent distribution, 128-bit state. */
export function sfc32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Hash a string/number to four 32-bit seeds. */
export function seedFrom(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    const k = s.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export class RNG {
  constructor(seed = 'cinderbloom') {
    this.seedValue = seed;
    const [a, b, c, d] = seedFrom(seed);
    this._n = sfc32(a, b, c, d);
    for (let i = 0; i < 12; i++) this._n(); // warm up
  }
  /** Independent stream from the same root seed — use one per system. */
  fork(tag) { return new RNG(this.seedValue + ':' + tag); }
  next() { return this._n(); }
  range(a, b) { return a + (b - a) * this._n(); }
  int(a, b) { return a + Math.floor(this._n() * (b - a + 1)); }
  sign() { return this._n() < 0.5 ? -1 : 1; }
  bool(p = 0.5) { return this._n() < p; }
  pick(arr) { return arr[Math.floor(this._n() * arr.length) % arr.length]; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this._n() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** Box-Muller, cached. */
  gauss(mu = 0, sigma = 1) {
    if (this._g !== undefined) { const g = this._g; this._g = undefined; return mu + sigma * g; }
    const u = Math.max(1e-9, this._n()), v = this._n();
    const r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
    this._g = r * Math.sin(th);
    return mu + sigma * r * Math.cos(th);
  }
  /** Uniform point on the unit sphere. */
  onSphere(out = { x: 0, y: 0, z: 0 }) {
    const z = this.range(-1, 1), a = this.range(0, Math.PI * 2), r = Math.sqrt(1 - z * z);
    out.x = r * Math.cos(a); out.y = r * Math.sin(a); out.z = z;
    return out;
  }
  /** Deterministic disc sample (Vogel/golden-angle) — good for scatter without clumping. */
  static vogel(i, n, radius = 1) {
    const ga = Math.PI * (3 - Math.sqrt(5));
    const r = radius * Math.sqrt((i + 0.5) / n), th = i * ga;
    return { x: r * Math.cos(th), y: r * Math.sin(th) };
  }
}

/** Cheap integer hash for shader-parity / grid jitter. */
export function hash2i(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
