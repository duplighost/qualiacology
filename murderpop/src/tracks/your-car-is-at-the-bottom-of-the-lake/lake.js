// HER LAKE HOUSE, as the fight sees it: the yard's floor plan (x across, z toward the camera / the lake), its
// heights (the porch +0.45, the pier +0.9 on its ramp), the walls you can't cross (the house, the boathouse, the
// picket fence, the marble balustrade on the shore, the pier's railings) and the things that stand in it.
// The set (the bake, tools/arena/arenas/your-car-is-at-the-bottom-of-the-lake.py) and the fight both use these.
export const BOUNDS = { minX: -11, maxX: 11, minZ: -7, maxZ: 7 };

// ---------------------------------------------------------------- the pier: one strip from the lawn out over the lake
export const PIER = {
  a: { x: 3.0, z: 3.0 },                    // the foot of the ramp, on the lawn
  len: 7.27,                                // to the end over the water
  ramp: 2.0,                                // the ramp rises 0..0.9 over its first 2 m
  half: 1.3,                                // half-width to the railings' centres
  deck: 0.9,
};
{
  const ux = 6.2, uz = 3.8, l = Math.hypot(ux, uz);
  PIER.u = { x: ux / l, z: uz / l };        // along the pier, out to the lake
  PIER.n = { x: -PIER.u.z, z: PIER.u.x };   // across it
}
export const pierS = (x, z) => (x - PIER.a.x) * PIER.u.x + (z - PIER.a.z) * PIER.u.z;
export const pierP = (x, z) => (x - PIER.a.x) * PIER.n.x + (z - PIER.a.z) * PIER.n.z;
export const pierPoint = (s, p = 0) => ({ x: PIER.a.x + PIER.u.x * s + PIER.n.x * p, z: PIER.a.z + PIER.u.z * s + PIER.n.z * p });
export const PIER_ANGLE = Math.atan2(PIER.u.x, PIER.u.z);       // heading out along the pier (0 = +z)
// the car stands at the end with its nose over the water; she stands at its trunk
export const CAR_S = 6.05;
export const CAR_SPOT = pierPoint(CAR_S);
export const TRUNK_SPOT = pierPoint(CAR_S - 2.55, 0.15);
export function onPier(x, z, r = 0) {
  const s = pierS(x, z), p = pierP(x, z);
  return s >= -0.2 - r && s <= PIER.len + r && Math.abs(p) <= PIER.half - 0.05 + r;
}

// ---------------------------------------------------------------- the porch: the deck along the front of the house
export const PORCH = { x0: -7, x1: 3, z0: -7, z1: -4.8, h: 0.45, step: 0.32 };

// the floor height under a point (the ramp's slope, the porch and its step), for feet and telegraphs
export function floorAt(x, z) {
  if (onPier(x, z)) { const s = pierS(x, z); return s <= 0 ? 0 : s >= PIER.ramp ? PIER.deck : PIER.deck * s / PIER.ramp; }
  if (x >= PORCH.x0 - 0.05 && x <= PORCH.x1 + 0.05 && z <= PORCH.z1 + PORCH.step && z >= PORCH.z0 - 1) return z <= PORCH.z1 ? PORCH.h : PORCH.h * 0.5;
  return 0;
}

// ---------------------------------------------------------------- the shore: the balustrade, sampled along its line
// along z = +5.5 from the fence to x = +2, then a curve through (+4.5, +2.5) to the boathouse's corner at (+6, -2.4)
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return { x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3) };
}
export const SHORE = (() => {
  const pts = [];
  for (let x = -11.4; x < 1.9; x += 0.6) pts.push({ x, z: 5.5 });
  const K = [{ x: -1, z: 5.5 }, { x: 2.0, z: 5.5 }, { x: 4.5, z: 2.5 }, { x: 6.0, z: -2.4 }, { x: 6.2, z: -6 }];
  for (let i = 1; i < K.length - 2; i++) for (let k = 0; k < 12; k++) pts.push(catmull(K[i - 1], K[i], K[i + 1], K[i + 2], k / 12));
  pts.push({ x: 6.0, z: -2.4 });
  return pts;
})();
// the shore's z at a given x, for "landward or lake" (x past +6 is the boathouse or the lake)
export function landward(x, z) {
  if (x > 6.05) return false;
  if (x <= 2.0) return z <= 5.5;
  // the curve is monotonic in x from (2, 5.5) to (6, -2.4): find its z at this x
  let zz = -2.4;
  for (let i = 0; i < SHORE.length - 1; i++) { const a = SHORE[i], b = SHORE[i + 1]; if (a.x <= x && b.x >= x && b.x > a.x) { zz = a.z + (b.z - a.z) * (x - a.x) / (b.x - a.x); break; } }
  return z <= zz;
}
// land you can stand on (the lawn, the drive, the porch); the pier is not land (the wave passes under it)
export const onLand = (x, z) => !onPier(x, z) && landward(x, z) && x >= BOUNDS.minX && z >= BOUNDS.minZ;

// ---------------------------------------------------------------- where things stand
export const SPOTS = {
  porch: { x: -1.0, z: -6.0 }, door: { x: -2.0, z: -7.0 }, plaque: { x: -1.0, z: -7.0 }, steps: { x: -2.0, z: -4.6 },
  gate: { x: -11, z: -1 }, cruiser: { x: -13.5, z: -2 }, mailbox: { x: -10.0, z: -2.2 },
  table: { x: -7.0, z: 0.8 }, swing: { x: -6.0, z: -6.2 },
  topiary: [{ x: -8.5, z: -3.0 }, { x: 0.8, z: 4.3 }],
  flamingo: [{ x: -6.0, z: 3.0 }, { x: -4.0, z: 4.6 }],
  cases: [{ x: 2.0, z: 2.5 }, { x: 0.4, z: 1.0 }],
  poles: [{ x: -8.5, z: -2.0 }, { x: -4.0, z: -2.5 }, { x: 0.5, z: -2.0 }, { x: -7.0, z: 3.5 }, { x: -2.0, z: 4.0 }, { x: 1.0, z: 3.0 }],
  stick: { x: -2.5, z: 0.5 }, atStick: { x: -1.6, z: 0.5 },
  shaft: { x: -3.5, z: -1.0 },
  sunkCar: { x: -1.0, z: 8.5 }, beamFrom: { x: -1.0, z: 6.0 },
  splash: { x: 10.5, z: 7.5 },
};
// the H-pattern on the water round the stick: three slots, a neutral bar
export const GATE = { x: [-8, -2.5, 3], z0: -4.3, z1: 5.3, zN: 0.5 };

// ---------------------------------------------------------------- walls and things you can't walk through
// boxes: centre x, z, half extents hx, hz, rotation (radians, about y); circles: x, z, r
function boxAlong(a, b, th, tag) {
  const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
  const rot = -Math.atan2(dz, dx);   // the box's local x runs a -> b
  return { type: 'box', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, hx: l / 2 + th * 0.5, hz: th, rot, cos: Math.cos(rot), sin: Math.sin(rot), tag };
}
export function staticColliders() {
  const out = [];
  // the shore, broken where the pier's ramp passes through it
  for (let i = 0; i < SHORE.length - 1; i++) {
    const a = SHORE[i], b = SHORE[i + 1], m = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const s = pierS(m.x, m.z), p = pierP(m.x, m.z);
    if (s > -1.0 && s < PIER.len + 0.5 && Math.abs(p) < PIER.half + 0.15) continue;
    out.push(boxAlong(a, b, 0.22, 'balustrade'));
  }
  // the pier's railings, both sides, and the end over the water
  for (const sd of [-1, 1]) out.push(boxAlong(pierPoint(-0.1, sd * PIER.half), pierPoint(PIER.len, sd * PIER.half), 0.2, 'railing'));
  out.push(boxAlong(pierPoint(PIER.len + 0.15, -PIER.half), pierPoint(PIER.len + 0.15, PIER.half), 0.25, 'pierEnd'));
  // the boathouse (its yard-side walls), the porch's posts, the swing
  out.push({ type: 'box', x: 8.6, z: -4.85, hx: 2.6, hz: 2.4, rot: 0, cos: 1, sin: 0, tag: 'boathouse' });
  for (const x of [-6.85, -4.3, 0.3, 2.85]) out.push({ type: 'circle', x, z: -4.95, r: 0.14, tag: 'post' });
  out.push({ type: 'circle', x: SPOTS.swing.x, z: SPOTS.swing.z, r: 0.55, tag: 'swing' });
  out.push({ type: 'circle', x: SPOTS.mailbox.x, z: SPOTS.mailbox.z, r: 0.2, tag: 'mailbox' });
  return out;
}

// circle / box push-out (the same maths as the arena's), over a list
export function pushOut(cols, x, z, r, out) {
  let hit = false, nx = 0, nz = 0;
  for (let it = 0; it < 4; it++) {
    let moved = false;
    for (const c of cols) {
      if (c.off) continue;
      if (c.type === 'circle') {
        const dx = x - c.x, dz = z - c.z, R = c.r + r, d2 = dx * dx + dz * dz;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1e-6; const ux = d2 > 1e-12 ? dx / d : 1, uz = d2 > 1e-12 ? dz / d : 0; x = c.x + ux * R; z = c.z + uz * R; nx = ux; nz = uz; moved = hit = true; }
      } else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
        let ox = lx - qx, oz = lz - qz;
        const d2 = ox * ox + oz * oz;
        if (d2 < r * r) {
          let px, pz;
          if (d2 > 1e-12) { const d = Math.sqrt(d2); ox /= d; oz /= d; px = qx + ox * r; pz = qz + oz * r; }
          else { const ex = c.hx - Math.abs(lx), ez = c.hz - Math.abs(lz); if (ex < ez) { ox = Math.sign(lx) || 1; oz = 0; px = ox * (c.hx + r); pz = lz; } else { ox = 0; oz = Math.sign(lz) || 1; px = lx; pz = oz * (c.hz + r); } }
          x = c.x + px * c.cos + pz * c.sin; z = c.z - px * c.sin + pz * c.cos;
          nx = ox * c.cos + oz * c.sin; nz = -ox * c.sin + oz * c.cos; moved = hit = true;
        }
      }
    }
    if (!moved) break;
  }
  out.x = x; out.z = z; out.hit = hit || out.hit; out.nx = nx; out.nz = nz;
  return out;
}

// does the segment a -> b pass through a circle (cover between her and you)
export function segCircle(ax, az, bx, bz, cx, cz, r) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-6;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / l2));
  const px = ax + dx * t - cx, pz = az + dz * t - cz;
  return px * px + pz * pz < r * r;
}

// nothing crosses into the lake: whatever ends up past the shore (a dash through the balustrade on a slow frame)
// is put back on the pier if it was by the pier, else on the lawn just inside the balustrade
export function keepOut(x, z, r, out) {
  if (landward(x, z) || onPier(x, z) || x > BOUNDS.maxX || z > BOUNDS.maxZ + 3) return out;
  const s = pierS(x, z), p = pierP(x, z);
  if (s > -0.6 && s < PIER.len + 0.8 && Math.abs(p) < PIER.half + 1.6 && s > 0.6) {
    const q = pierPoint(Math.min(s, PIER.len - r - 0.25), Math.sign(p) * Math.min(Math.abs(p), PIER.half - 0.2 - r));
    out.x = q.x; out.z = q.z; out.hit = true; return out;
  }
  let best = null, bd = 1e9;
  for (let i = 0; i < SHORE.length - 1; i++) {
    const a = SHORE[i], b = SHORE[i + 1], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1e-6;
    const k = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2)), cx = a.x + dx * k, cz = a.z + dz * k, d = Math.hypot(x - cx, z - cz);
    if (d < bd) { bd = d; const l = Math.sqrt(l2); let nx = -dz / l, nz = dx / l; if (!landward(cx + nx * 0.6, cz + nz * 0.6)) { nx = -nx; nz = -nz; } best = { x: cx + nx * (0.24 + r), z: cz + nz * (0.24 + r) }; }
  }
  if (best) { out.x = best.x; out.z = best.z; out.hit = true; }
  return out;
}

// keep a point where someone can stand (for "where you'll be two beats from now")
export function walkable(x, z, r = 0.45) {
  x = Math.max(BOUNDS.minX + r, Math.min(BOUNDS.maxX - r, x)); z = Math.max(BOUNDS.minZ + r, Math.min(BOUNDS.maxZ - r, z));
  if (onPier(x, z)) { const s = Math.max(0.2, Math.min(PIER.len - 0.4, pierS(x, z))), p = Math.max(-0.6, Math.min(0.6, pierP(x, z))); return pierPoint(s, p); }
  if (landward(x, z)) return { x, z };
  // pulled back onto the lawn, toward the middle of the yard
  for (let k = 1; k <= 20; k++) { const xx = x + (-2 - x) * k / 20, zz = z + (0 - z) * k / 20; if (landward(xx, zz) && !onPier(xx, zz)) return { x: xx, z: zz }; }
  return { x: -2, z: 0 };
}
