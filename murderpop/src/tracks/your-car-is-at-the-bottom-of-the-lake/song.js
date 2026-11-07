// The song's clock, as the set and the choreography share it (seconds; measured on the WAV and the beat map).
// bars.py numbering: bar b beat n is BeatMap.t(`${b + 1}:${n}`); bt(b, n) below does that.
export const S = {
  clunk: 0.54, stringsOn: 0.726, stringsFull: 1.48, band: 1.485,
  bassGo1: 37.223, still: 38.001, tick: 38.40, by1: 39.98, tip: 40.249, splash: 41.005, hole1: 41.36, surge: 41.60, settled: 42.5,
  c1: 41.759, police: 53.099, poles: 55.361, cueStop: 61.381, cueGo: 62.888, dark: 65.148,
  posts: [68.921, 69.298, 69.675, 70.053, 70.430], stick: 71.190, lean: 76.095, fall: [76.475, 76.855, 77.234],
  rise: 77.234, white2: 78.25, oh: 78.74, topple: 79.9, under: 80.243, hole2: 80.70, neonRelit: 80.85,
  c2: 80.992, black: 84.765, lightsBack: 85.517, lid: 92.313, finish: 100.611, drain: 101.369, drained: 104.35,
  neonDie: 104.39, spare: 108.72, just: 110.22, home: 116.86, thump: 117.33, end: 118.36,
};
// the neon's words, lit as they're sung
export const NEON1 = [['Your', 41.80], ['car', 42.36], ['is', 42.80], ['at', 42.94], ['the', 43.10], ['bottom', 43.26], ['of', 43.52], ['the', 43.88], ['lake', 44.10]];
export const NEON2 = [["You're", 96.94], ['mine', 97.58], ['forever', 97.88], ['now', 99.00]];
// her health at each section's start, for practice from a section: about where a person playing well leaves it (a
// person lands about half what the test bot does; it empties her bar at the first stop, a person around chorus 2),
// with a little left in chorus 2 and the final so practising them still ends with her bar going
export const ARC = [1.0, 0.8, 0.6, 0.5, 0.36, 0.15, 0.1, 0.05, 0.0];

let _bm = null;
export function useBeats(bm) { _bm = bm; }
export const bt = (bar, beat = 1) => (_bm ? _bm.t(`${bar + 1}:${beat}`) : 0);
export const clamp01 = (k) => Math.max(0, Math.min(1, k));
export const ease = (k) => k * k * (3 - 2 * k);
export const ramp = (t, a, b) => clamp01((t - a) / (b - a));
