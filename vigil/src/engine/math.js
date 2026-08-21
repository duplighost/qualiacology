// Math substrate. damp() is the frame-rate-independent smoothing backbone
// (Duskfall lineage); Spring is the underdamped second-order unit the whole
// feel layer is built from (COMBAT_FEEL springs are given as freq/damping).

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export function dampAngle(a, b, lambda, dt) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-lambda * dt));
}

export const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  inCubic: t => t * t * t,
  outCubic: t => (--t) * t * t + 1,
  outQuint: t => 1 + (--t) * t * t * t * t,
  smootherstep: t => t * t * t * (t * (t * 6 - 15) + 10),
};

/**
 * Underdamped spring: freq in Hz, damping ratio 0..1. nudge() adds velocity
 * (an impulse), set() teleports. update(dt) integrates semi-implicitly, which
 * is stable at the loop's 0.05 s dt clamp for every freq used here (<= 22 Hz).
 */
export class Spring {
  constructor(freq = 10, damping = 0.7) {
    this.w = TAU * freq;
    this.z = damping;
    this.value = 0;
    this.vel = 0;
    this.target = 0;
  }
  nudge(v) { this.vel += v; }
  set(v) { this.value = v; this.vel = 0; }
  update(dt) {
    // substep so high-freq springs stay stable across a clamped 50 ms frame
    const steps = Math.max(1, Math.ceil(dt * this.w / 1.2));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = -this.w * this.w * (this.value - this.target) - 2 * this.z * this.w * this.vel;
      this.vel += a * h;
      this.value += this.vel * h;
    }
    return this.value;
  }
}

export class Spring3 {
  constructor(freq = 10, damping = 0.7) {
    this.x = new Spring(freq, damping);
    this.y = new Spring(freq, damping);
    this.z = new Spring(freq, damping);
  }
  nudge(x, y, z) { this.x.nudge(x); this.y.nudge(y); this.z.nudge(z); }
  update(dt) { this.x.update(dt); this.y.update(dt); this.z.update(dt); }
}

/* ---------------- deterministic RNG, forked per effect ---------------- */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Rng with named forks: rng.fork('recoil') always yields the same stream for
 * the same root seed, so adding a new effect never shifts an existing one's
 * sequence (Cinderbloom CONTRACT rule; a bare Math.random breaks regressions).
 */
export class Rng {
  constructor(seed = 1337) {
    this.seed = seed >>> 0;
    this._next = mulberry32(this.seed);
    this._forks = new Map();
  }
  next() { return this._next(); }
  range(a, b) { return a + (b - a) * this._next(); }
  sign() { return this._next() < 0.5 ? -1 : 1; }
  fork(name) {
    let f = this._forks.get(name);
    if (!f) { f = new Rng((this.seed ^ hashStr(name)) >>> 0); this._forks.set(name, f); }
    return f;
  }
}

/* ---------------- smooth 1-D value noise (sway) ---------------- */

function noiseHash(i, seed) {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 2 - 1;
}

/** value noise in [-1,1], C1-smooth; t in seconds, freq in Hz. */
export function noise1D(t, freq, seed = 0) {
  const x = t * freq;
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(noiseHash(i, seed), noiseHash(i + 1, seed), u);
}

/** two-octave non-harmonic sway sample (COMBAT_FEEL §3.6.1). */
export function sway2(t, fA, fB, wA, wB, seed) {
  return noise1D(t, fA, seed) * wA + noise1D(t, fB, seed ^ 0x9e37) * wB;
}
