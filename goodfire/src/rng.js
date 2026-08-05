// GOODFIRE rng.js — deterministic randomness. Math.random is BANNED in src/ (harness greps).
// Four independent mulberry32 streams (canon: sim spec §18.1). Streams a–c are consumed ONLY
// inside the fixed sim tick; `feel` is cosmetic and may be consumed at render rate — it must
// never influence anything that reaches the state hash.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const WORLD_SEED = 91321; // one authored mountain, identical for every player (season §1)

export function makeStreams(seed) {
  return {
    map: mulberry32(seed >>> 0),                 // map/authoring jitter + atlas generation
    wind: mulberry32((seed ^ 0x9E3779B9) >>> 0), // gust value-noise
    ember: mulberry32((seed ^ 0x85EBCA6B) >>> 0),// cast, flight, catch
    feel: mulberry32((seed ^ 0xC2B2AE35) >>> 0), // cosmetic ONLY (render flicker, audio grain)
  };
}

// Small helpers over a stream fn
export const pick = (rng, arr) => arr[(rng() * arr.length) | 0];
export const range = (rng, lo, hi) => lo + rng() * (hi - lo);

// Deterministic per-cell jitter that does NOT consume any stream (stable across frames and
// runs; used by render for dab placement so repaints don't shimmer).
export function cellHash01(i, salt = 0) {
  let h = (i ^ (salt * 0x9E3779B9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

// FNV-1a 32-bit over byte views — the state hash primitive (sim spec §18.6)
export function fnv1a(views) {
  let h = 0x811c9dc5;
  for (const v of views) {
    const bytes = v instanceof Uint8Array ? v : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    for (let i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h >>> 0;
}
