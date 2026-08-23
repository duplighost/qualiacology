/* Small maths. No dependencies, no allocations. */

export const TAU = Math.PI * 2;

export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

/* Shortest signed turn from a to b. */
export function angleTo(a, b) {
  return wrapAngle(b - a);
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/* Frame-rate independent approach. The naive `v += (target - v) * k` is a
 * different curve at 30fps than at 144, which on this game reads as the flock
 * being sluggish on a phone — the one place the wave most needs to feel sharp. */
export function damp(v, target, rate, dt) {
  return target + (v - target) * Math.exp(-rate * dt);
}

/* Deterministic RNG so a seed reproduces a run exactly. Used by the card
 * renderer to re-shoot the same murmuration, and by anyone debugging a
 * falcon strike they cannot otherwise make happen twice. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
