// The five lands. Pure data + the region-weight field. Everything that makes
// a region feel like itself reads from here: terrain colors, sky, fog, light,
// music key, ambient particles. Weights blend smoothly across borders.

import { fbm2 } from '../core/rng.js';
import { clamp01 } from '../core/math.js';

// Angular sectors around the island center (atan2(z, x), radians).
const A = Math.PI / 180;

export const REGIONS = {
  vale: {
    name: 'Verdant Vale',
    angle: 90 * A, halfWidth: 40 * A,
    musicKey: 'vale',
    terra: { lo: [0.24, 0.39, 0.20], hi: [0.52, 0.62, 0.30], cliff: [0.38, 0.36, 0.31] },
    sky: { horizon: [1.0, 0.86, 0.62], zenith: [0.36, 0.62, 0.94], feature: 'none' },
    fog: { color: [0.78, 0.83, 0.80], density: 0.0047 },
    sun: { color: [1.0, 0.95, 0.82], intensity: 1.28 },
    hemi: { sky: [0.68, 0.78, 0.94], ground: [0.44, 0.49, 0.35], intensity: 0.98 },
    key: [0.55, 0.85, 0.45],       // identity color (HUD glints, motes, beacons)
  },
  ember: {
    name: 'Ember Flats',
    angle: 162 * A, halfWidth: 40 * A,
    musicKey: 'ember',
    terra: { lo: [0.35, 0.16, 0.08], hi: [0.65, 0.34, 0.14], cliff: [0.17, 0.11, 0.09] },
    sky: { horizon: [1.0, 0.45, 0.20], zenith: [0.30, 0.16, 0.22], feature: 'embers' },
    fog: { color: [0.62, 0.36, 0.22], density: 0.0061 },
    sun: { color: [1.0, 0.58, 0.34], intensity: 1.14 },
    hemi: { sky: [0.82, 0.55, 0.42], ground: [0.48, 0.27, 0.17], intensity: 1.0 },
    key: [1.0, 0.5, 0.25],
  },
  frost: {
    name: 'Frostmere',
    angle: -126 * A, halfWidth: 40 * A,
    musicKey: 'frost',
    terra: { lo: [0.62, 0.69, 0.74], hi: [0.92, 0.94, 0.95], cliff: [0.38, 0.48, 0.58] },
    sky: { horizon: [0.80, 0.88, 0.98], zenith: [0.16, 0.28, 0.52], feature: 'aurora' },
    fog: { color: [0.80, 0.87, 0.95], density: 0.0060 },
    sun: { color: [0.88, 0.94, 1.0], intensity: 1.06 },
    hemi: { sky: [0.74, 0.84, 0.98], ground: [0.62, 0.67, 0.76], intensity: 0.91 },
    key: [0.55, 0.85, 1.0],
  },
  mycel: {
    name: 'Mycel Hollow',
    angle: 18 * A, halfWidth: 40 * A,
    musicKey: 'mycel',
    terra: { lo: [0.22, 0.31, 0.26], hi: [0.39, 0.51, 0.39], cliff: [0.20, 0.22, 0.24] },
    sky: { horizon: [0.35, 0.55, 0.52], zenith: [0.07, 0.10, 0.18], feature: 'spores' },
    fog: { color: [0.28, 0.41, 0.38], density: 0.0067 },
    sun: { color: [0.72, 0.88, 0.82], intensity: 1.02 },
    hemi: { sky: [0.64, 0.72, 0.74], ground: [0.32, 0.38, 0.35], intensity: 1.16 },
    key: [0.45, 1.0, 0.80],
  },
  shatter: {
    name: 'The Shatter',
    angle: -54 * A, halfWidth: 40 * A,
    musicKey: 'shatter',
    terra: { lo: [0.30, 0.26, 0.38], hi: [0.54, 0.46, 0.60], cliff: [0.25, 0.23, 0.31] },
    sky: { horizon: [0.85, 0.55, 0.75], zenith: [0.14, 0.10, 0.30], feature: 'nebula' },
    fog: { color: [0.45, 0.35, 0.51], density: 0.0050 },
    sun: { color: [0.98, 0.74, 0.88], intensity: 1.02 },
    hemi: { sky: [0.58, 0.48, 0.71], ground: [0.31, 0.27, 0.38], intensity: 0.96 },
    key: [0.80, 0.55, 1.0],
  },
};

export const REGION_KEYS = Object.keys(REGIONS);

const angDist = (a, b) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
};

// Blended region weights at a world position. Borders wobble with low-freq
// noise so they read as natural transitions, not pie slices.
const _w = {};
export function regionWeights(x, z) {
  const a = Math.atan2(z, x) + fbm2(x * 0.006, z * 0.006, 2, 777) * 0.42;
  let total = 0;
  for (const k of REGION_KEYS) {
    const r = REGIONS[k];
    const t = clamp01(1 - Math.pow(angDist(a, r.angle) / (r.halfWidth * 1.55), 2));
    const w = t * t;
    _w[k] = w;
    total += w;
  }
  if (total < 1e-6) { for (const k of REGION_KEYS) _w[k] = 0.2; total = 1; }
  for (const k of REGION_KEYS) _w[k] /= total;
  return _w; // NOTE: shared object — copy if you need to keep it
}

export function dominantRegion(x, z) {
  const w = regionWeights(x, z);
  let best = 'vale', bw = -1;
  for (const k of REGION_KEYS) if (w[k] > bw) { bw = w[k]; best = k; }
  return best;
}

// Blend an arbitrary per-region property (array of numbers) by weights.
export function blendRegion(getter, x, z, out = [0, 0, 0]) {
  const w = regionWeights(x, z);
  out[0] = 0; out[1] = 0; out[2] = 0;
  let extra = 0;
  for (const k of REGION_KEYS) {
    const v = getter(REGIONS[k]);
    if (typeof v === 'number') { extra += v * w[k]; continue; }
    out[0] += v[0] * w[k]; out[1] += v[1] * w[k]; out[2] += v[2] * w[k];
  }
  return typeof getter(REGIONS.vale) === 'number' ? extra : out;
}
