// Shared math. ADDITIVE EDITS ONLY — other systems import these by name.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const sat = v => v < 0 ? 0 : v > 1 ? 1 : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (b - a) === 0 ? 0 : (v - a) / (b - a);
export const remap = (v, a, b, c, d) => lerp(c, d, sat(inv(a, b, v)));
export const smoothstep = (a, b, v) => { const t = sat(inv(a, b, v)); return t * t * (3 - 2 * t); };
export const smootherstep = (a, b, v) => { const t = sat(inv(a, b, v)); return t * t * t * (t * (t * 6 - 15) + 10); };
export const mixAngle = (a, b, t) => a + wrapPi(b - a) * t;
export const wrapPi = a => { a = (a + Math.PI) % TAU; return (a < 0 ? a + TAU : a) - Math.PI; };
export const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;

/**
 * Frame-rate independent exponential approach.
 * `lambda` is the rate: value covers 1-1/e of the gap in 1/lambda seconds.
 */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/** Half-life form — often easier to author against ("settles in 80ms"). */
export const dampHL = (a, b, halfLife, dt) =>
  halfLife <= 0 ? b : lerp(a, b, 1 - Math.pow(2, -dt / halfLife));

/**
 * Critically-damped spring. The backbone of every piece of weapon and camera
 * feel in this game — sway, bob, recoil recovery, ADS transitions.
 * Stable for large dt because it uses the exact analytic solution.
 */
export class Spring {
  constructor(value = 0, { freq = 8, damping = 1 } = {}) {
    this.value = value; this.target = value; this.vel = 0;
    this.freq = freq; this.damping = damping;
  }
  set(v) { this.value = this.target = v; this.vel = 0; return this; }
  nudge(v) { this.vel += v; return this; }
  update(dt) {
    const w = this.freq * TAU, z = this.damping;
    // semi-implicit with analytic decay — unconditionally stable
    const e = Math.exp(-z * w * dt);
    const d = this.value - this.target;
    if (z >= 1) {
      const c1 = d, c2 = this.vel + w * d;
      this.value = this.target + (c1 + c2 * dt) * e;
      this.vel = (this.vel - c2 * w * dt) * e;
    } else {
      const wd = w * Math.sqrt(1 - z * z);
      const c1 = d, c2 = (this.vel + z * w * d) / wd;
      const cs = Math.cos(wd * dt), sn = Math.sin(wd * dt);
      this.value = this.target + e * (c1 * cs + c2 * sn);
      this.vel = e * ((-z * w) * (c1 * cs + c2 * sn) + wd * (-c1 * sn + c2 * cs));
    }
    return this.value;
  }
}

/** Three-axis spring, for positional/rotational offsets. */
export class Spring3 {
  constructor(x = 0, y = 0, z = 0, opts) {
    this.x = new Spring(x, opts); this.y = new Spring(y, opts); this.z = new Spring(z, opts);
  }
  setTarget(x, y, z) { this.x.target = x; this.y.target = y; this.z.target = z; return this; }
  nudge(x, y, z) { this.x.nudge(x); this.y.nudge(y); this.z.nudge(z); return this; }
  update(dt) { this.x.update(dt); this.y.update(dt); this.z.update(dt); return this; }
  applyTo(v3) { v3.set(this.x.value, this.y.value, this.z.value); return v3; }
}

/** Easings (Penner-style, normalised). */
export const ease = {
  inQuad: t => t * t,
  outQuad: t => t * (2 - t),
  inOutQuad: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  outCubic: t => (--t) * t * t + 1,
  inOutCubic: t => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  outQuint: t => 1 + (--t) * t * t * t * t,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5
    ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: t => t <= 0 ? 0 : t >= 1 ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1,
};

/** Photographic exposure from EV100 — used by the grade pass and auto-exposure. */
export const ev100ToExposure = ev => 1 / (1.2 * Math.pow(2, ev));
export const luminanceToEV100 = l => Math.log2(Math.max(l, 1e-5) * 100 / 12.5);

/** Rec.709 luma of a linear RGB triple. */
export const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Kelvin -> linear sRGB (approx, Tanner Helland fit). Sun/practical-light authoring. */
export function kelvinToRGB(k, out = { r: 1, g: 1, b: 1 }) {
  const t = clamp(k, 1000, 40000) / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); }
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.52 * Math.log(t - 10) - 305.04;
  // sRGB -> linear
  const l = c => { c = sat(c / 255); return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  out.r = l(r); out.g = l(g); out.b = l(b);
  return out;
}

/** Halton sequence — TAA jitter, sample distribution. */
export function halton(index, base) {
  let f = 1, r = 0, i = index;
  while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); }
  return r;
}

/** Ring buffer of floats, for perf histograms and temporal smoothing. */
export class Ring {
  constructor(n) { this.buf = new Float32Array(n); this.i = 0; this.n = 0; }
  push(v) { this.buf[this.i] = v; this.i = (this.i + 1) % this.buf.length; this.n = Math.min(this.n + 1, this.buf.length); return this; }
  mean() { let s = 0; for (let i = 0; i < this.n; i++) s += this.buf[i]; return this.n ? s / this.n : 0; }
  percentile(p) {
    if (!this.n) return 0;
    const a = Array.from(this.buf.subarray(0, this.n)).sort((x, y) => x - y);
    return a[clamp(Math.floor(p * (a.length - 1)), 0, a.length - 1)];
  }
}
