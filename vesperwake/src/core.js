/* core.js — maths, RNG, geometry, and the tiny helpers everything else uses. */

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const approach = (v, target, delta) =>
  v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);

export const smoothstep = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
export const easeOutCubic = (t) => { const x = 1 - clamp(t, 0, 1); return 1 - x * x * x; };
export const easeInQuad = (t) => { const x = clamp(t, 0, 1); return x * x; };

/* Frame-rate independent exponential smoothing. */
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

/* Deterministic RNG — the same seed always paints the same speckle, so terrain
 * texture does not crawl between frames and tests are reproducible. */
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* Stable hash -> 0..1. Used for per-object jitter that must not change. */
export function hash01(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* ---- rectangles ---- */
export const rect = (x, y, w, h) => ({ x, y, w, h });

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function rectCentre(r) { return { x: r.x + r.w * 0.5, y: r.y + r.h * 0.5 }; }

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function expand(r, n) { return { x: r.x - n, y: r.y - n, w: r.w + n * 2, h: r.h + n * 2 }; }

export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

/* ---- small containers ---- */

/* A ring buffer of the last N values, used for ghost trails and the pose ring. */
export class Ring {
  constructor(n) { this.n = n; this.items = new Array(n).fill(null); this.i = 0; this.count = 0; }
  push(v) { this.items[this.i] = v; this.i = (this.i + 1) % this.n; this.count = Math.min(this.count + 1, this.n); }
  /* back(0) is the newest. */
  back(k) { return this.items[(this.i - 1 - k + this.n * 2) % this.n]; }
  clear() { this.items.fill(null); this.i = 0; this.count = 0; }
}

/* ---- colour ---- */

/* Accepts '#rgb', '#rrggbb', 'rgb(r,g,b)' and 'rgba(r,g,b,a)'. The matte
 * palette is sampled at runtime and comes back as rgb() strings, so every
 * colour helper has to speak both dialects or the terrain silently NaNs. */
export function hexToRgb(colour) {
  if (typeof colour !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  const s = colour.trim();
  if (s[0] === '#') {
    const h = s.slice(1);
    const v = h.length === 3
      ? h.split('').map((c) => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return { r: v[0] || 0, g: v[1] || 0, b: v[2] || 0, a: 1 };
  }
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(',').map((n) => parseFloat(n));
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts.length > 3 ? parts[3] : 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

export const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
export const rgba = (r, g, b, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;

export function mixHex(a, b, t) {
  const A = hexToRgb(a); const B = hexToRgb(b);
  return rgb(lerp(A.r, B.r, t), lerp(A.g, B.g, t), lerp(A.b, B.b, t));
}

export function withAlpha(hex, a) {
  const c = hexToRgb(hex);
  return rgba(c.r, c.g, c.b, a);
}

/* Lighten/darken toward white/black, keeping the hue. */
export function shade(hex, amount) {
  const c = hexToRgb(hex);
  if (amount >= 0) return rgb(lerp(c.r, 255, amount), lerp(c.g, 255, amount), lerp(c.b, 255, amount));
  const t = -amount;
  return rgb(lerp(c.r, 0, t), lerp(c.g, 0, t), lerp(c.b, 0, t));
}
