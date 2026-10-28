// YOUR CAR IS AT THE BOTTOM OF THE LAKE: where the land is along the song and how high it stands,
// for the shore that's drawn (ycl-world.js) and for everything standing on it (ycl-props.js).

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// [song time, left, right]: the shore on each side of the road. A positive number is land from the
// road's centre out to that many metres, the lake past it; a negative one is the lake out to that far
// and land past it. (between a positive and a negative the change is a step, at the second one)
export const SHORE = [
  [-12, 85, 900],      // her side of the lake: the pines and the cabins, the water off to the left
  [20, 80, 900],
  [30, 70, 900],       // the shore road along the water
  [37, 46, 500],
  [39.4, 34, 150],     // the landing, the pier going out from it
  [40.9, 0, 0],        // off the end: the lake
  [41.0, -300, -300],
  [50.5, -300, -300],
  [53.0, -300, -28],   // across it, her place: the police at the door
  [64.5, -300, -28],
  [66.5, -300, -70],   // out along the dock, the water so dark
  [75.0, -300, -70],
  [76.5, -300, -34],   // the boat ramp
  [78.6, -300, -34],
  [79.4, -300, -300],
  [100.0, -300, -300],
  [103.0, -300, -26],  // home again: her shore
  [300, -300, -26],
];

// the stretch she rides under the water: the lake's surface over her, its bottom under her
export const UNDER = [80.7, 92.75];
// the surface's height over her (null where she isn't under it): it comes up past her as she goes in
// and drops back past her as she comes out
export function surfaceY(t) {
  if (t < UNDER[0] || t > UNDER[1]) return null;
  return -0.2 + 72.2 * smooth(80.7, 81.1, t) * (1 - smooth(92.3, 92.75, t));
}

const _s = { L: 0, R: 0 };
export function shoreAt(t, out = _s) {
  const K = SHORE;
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], f = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  const mix = (va, vb) => ((va >= 0) !== (vb >= 0) ? (f < 1 ? va : vb) : va + (vb - va) * f);
  out.L = mix(a[1], b[1]); out.R = mix(a[2], b[2]);
  return out;
}

// value noise, smooth, the same every time
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// how far inland (+) or out on the water (-) a point is, in metres
export function shoreDist(t, x) {
  const s = shoreAt(t), side = x < 0 ? s.L : s.R, ax = Math.abs(x);
  return side >= 0 ? side - ax : ax + side;
}

// the ground's height: low along the road and the water, wooded hills rising behind; under the
// water the bottom shelves away from the shore
export function landY(t, x) {
  const d = shoreDist(t, x), ax = Math.abs(x);
  if (d <= 0) return Math.max(-4, -0.25 + d * 0.3);
  const n = vnoise(t * 0.35, x / 37);
  const hill = smooth(30, 190, ax) * (9 + 15 * n) * smooth(0, 70, d);
  return 0.3 + 0.7 * smooth(0, 12, d) * n + hill;
}

// the lake's bottom where she rides under it: silt in long ripples, banks rising off to the sides
export function bedY(t, x) {
  const ax = Math.abs(x);
  return -0.3 + 0.5 * vnoise(t * 0.6, x / 21) + smooth(70, 230, ax) * (6 + 9 * vnoise(t * 0.2, x / 60));
}

