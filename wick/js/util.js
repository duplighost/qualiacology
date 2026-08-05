// util.js — small math / noise / rng helpers. No deps.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;

/** Frame-rate independent exponential approach. rate = "how fast", dt seconds. */
export const approach = (cur, target, rate, dt) => target + (cur - target) * Math.exp(-rate * dt);

/** mulberry32 — small deterministic PRNG */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D value noise with smooth interpolation, seeded. */
export function makeNoise2(seed = 1) {
  const p = new Uint8Array(512);
  const r = rng(seed);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const grad = (h, x, y) => {
    switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; }
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v); // ~[-1,1]
  };
}

export function fbm2(noise, x, y, oct = 4, lac = 2.0, gain = 0.5) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f); f *= lac; a *= gain; }
  return s;
}

/** Distance from point to segment, in the same units as inputs. */
export function segDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - x0) * dx + (py - y0) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = x0 + t * dx, qy = y0 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

/** Fixed-size ring of recent values (for the finale's stillness budget, fps, etc). */
export class Ring {
  constructor(n) { this.buf = new Float32Array(n); this.i = 0; this.n = 0; }
  push(v) { this.buf[this.i] = v; this.i = (this.i + 1) % this.buf.length; if (this.n < this.buf.length) this.n++; }
  mean() { let s = 0; for (let k = 0; k < this.n; k++) s += this.buf[k]; return this.n ? s / this.n : 0; }
  max() { let m = -Infinity; for (let k = 0; k < this.n; k++) m = Math.max(m, this.buf[k]); return this.n ? m : 0; }
}
