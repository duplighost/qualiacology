// Allocation-free math primitives. CONTRACT §4: nothing here allocates.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / ((b - a) || 1);

export function smoothstep(a, b, v) {
  const t = clamp01(invLerp(a, b, v));
  return t * t * (3 - 2 * t);
}

export function smootherstep(a, b, v) {
  const t = clamp01(invLerp(a, b, v));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Frame-rate independent exponential approach. The `1 - exp(-lambda*dt)` form is
 * the only correct one: `lerp(a, b, 0.1)` per frame is a different curve at
 * 144 Hz than at 60 Hz, and that is where "floaty at high refresh" comes from.
 */
export const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Shortest signed angular delta from a to b, in radians. */
export const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export const finite = v => (Number.isFinite(v) ? v : 0);

// ---------------------------------------------------------------------------
// Ray tests. Both return the hit distance or -1, and both take an `until`
// budget so callers can shrink it as they find nearer hits.
//
// The shared-budget pattern is load-bearing (APEX weapons.js:143): march world
// geometry first with a shrinking `until`, then march actors against the
// already-shortened budget. That single shared float IS the occlusion system —
// enemies behind a wall are missed for free, with no second pass and no
// visibility query.
// ---------------------------------------------------------------------------

/** Slab test against an axis-aligned box given as centre + half-extents. */
export function rayAabb(ox, oy, oz, dx, dy, dz, cx, cy, cz, hx, hy, hz, until) {
  let tmin = 0;
  let tmax = until;

  // x
  if (dx > -1e-8 && dx < 1e-8) {
    if (ox < cx - hx || ox > cx + hx) return -1;
  } else {
    const inv = 1 / dx;
    let t1 = (cx - hx - ox) * inv;
    let t2 = (cx + hx - ox) * inv;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  // y
  if (dy > -1e-8 && dy < 1e-8) {
    if (oy < cy - hy || oy > cy + hy) return -1;
  } else {
    const inv = 1 / dy;
    let t1 = (cy - hy - oy) * inv;
    let t2 = (cy + hy - oy) * inv;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  // z
  if (dz > -1e-8 && dz < 1e-8) {
    if (oz < cz - hz || oz > cz + hz) return -1;
  } else {
    const inv = 1 / dz;
    let t1 = (cz - hz - oz) * inv;
    let t2 = (cz + hz - oz) * inv;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  return tmin;
}

/**
 * Ray vs vertical capsule (actors are always upright, which lets the cylinder
 * body reduce to a 2D circle test and removes the general capsule solve).
 * `by` is the capsule's foot, `h` its total height, `r` its radius.
 * Writes the hit height into `out.hy` so the caller can classify a headshot.
 */
export function rayCapsuleY(ox, oy, oz, dx, dy, dz, bx, by, bz, r, h, until, out) {
  const px = ox - bx;
  const pz = oz - bz;
  const a = dx * dx + dz * dz;
  const b = 2 * (px * dx + pz * dz);
  const c = px * px + pz * pz - r * r;

  if (a < 1e-9) {
    // Looking straight down the axis: hit only if we are inside the radius.
    if (c > 0) return -1;
    const t = dy > 0 ? (by + h - oy) / dy : (by - oy) / dy;
    if (t < 0 || t > until) return -1;
    if (out) out.hy = oy + dy * t;
    return t;
  }

  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const sq = Math.sqrt(disc);
  let t = (-b - sq) / (2 * a);
  if (t < 0) t = (-b + sq) / (2 * a);
  if (t < 0 || t > until) return -1;

  const hy = oy + dy * t;
  // Cylinder band. The spherical caps are deliberately not modelled: an upright
  // actor's cap hits are within a few centimetres of the band and modelling them
  // costs two more solves per actor per pellet.
  if (hy < by || hy > by + h) return -1;
  if (out) out.hy = hy;
  return t;
}

/** Closest approach between a ray and a point — used for aim assist probes and audio focus. */
export function rayPointDistance(ox, oy, oz, dx, dy, dz, px, py, pz) {
  const vx = px - ox, vy = py - oy, vz = pz - oz;
  const t = vx * dx + vy * dy + vz * dz;
  if (t <= 0) return Math.hypot(vx, vy, vz);
  const cx = ox + dx * t - px;
  const cy = oy + dy * t - py;
  const cz = oz + dz * t - pz;
  return Math.hypot(cx, cy, cz);
}
