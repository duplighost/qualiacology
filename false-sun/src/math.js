// Deterministic, dependency-free 2D geometry used by the authoritative simulation.
// Rectangles in this module are center-based by default: { x, y, w, h }.

export const EPSILON = 1e-9;

const TAU = Math.PI * 2;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function point(value) {
  return {
    x: finite(value?.x),
    y: finite(value?.y),
  };
}

function radiusOf(circle) {
  return Math.max(0, finite(circle?.r ?? circle?.radius));
}

function circleCenter(circle) {
  if (circle?.center && typeof circle.center === 'object') return point(circle.center);
  return {
    x: finite(circle?.cx ?? circle?.x),
    y: finite(circle?.cy ?? circle?.y),
  };
}

function rectBounds(rect) {
  if (!rect) return { left: 0, top: 0, right: 0, bottom: 0 };

  if (
    Number.isFinite(rect.minX) || Number.isFinite(rect.maxX)
    || Number.isFinite(rect.minY) || Number.isFinite(rect.maxY)
  ) {
    const left = finite(rect.minX ?? rect.left);
    const top = finite(rect.minY ?? rect.top);
    const right = finite(rect.maxX ?? rect.right, left);
    const bottom = finite(rect.maxY ?? rect.bottom, top);
    return {
      left: Math.min(left, right),
      top: Math.min(top, bottom),
      right: Math.max(left, right),
      bottom: Math.max(top, bottom),
    };
  }

  if (
    Number.isFinite(rect.left) || Number.isFinite(rect.right)
    || Number.isFinite(rect.top) || Number.isFinite(rect.bottom)
  ) {
    const left = finite(rect.left);
    const top = finite(rect.top);
    const right = finite(rect.right, left);
    const bottom = finite(rect.bottom, top);
    return {
      left: Math.min(left, right),
      top: Math.min(top, bottom),
      right: Math.max(left, right),
      bottom: Math.max(top, bottom),
    };
  }

  const width = Math.abs(finite(rect.w ?? rect.width));
  const height = Math.abs(finite(rect.h ?? rect.height));
  const centered = rect.centered !== false && rect.anchor !== 'top-left';
  const x = finite(rect.cx ?? rect.center?.x ?? rect.x);
  const y = finite(rect.cy ?? rect.center?.y ?? rect.y);

  if (!centered) {
    return { left: x, top: y, right: x + width, bottom: y + height };
  }

  return {
    left: x - width * 0.5,
    top: y - height * 0.5,
    right: x + width * 0.5,
    bottom: y + height * 0.5,
  };
}

function scaledTolerance(...values) {
  let scale = 1;
  for (const value of values) scale = Math.max(scale, Math.abs(finite(value)));
  return EPSILON * scale;
}

function pointOnSegment(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const segmentLength = Math.hypot(abx, aby);
  const tolerance = EPSILON * Math.max(1, segmentLength);

  if (Math.abs(abx * apy - aby * apx) > tolerance) return false;
  return (
    p.x >= Math.min(a.x, b.x) - tolerance
    && p.x <= Math.max(a.x, b.x) + tolerance
    && p.y >= Math.min(a.y, b.y) - tolerance
    && p.y <= Math.max(a.y, b.y) + tolerance
  );
}

export function clamp(value, min = 0, max = 1) {
  if (min > max) [min, max] = [max, min];
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function invLerp(a, b, value) {
  const span = b - a;
  return Math.abs(span) <= EPSILON ? 0 : (value - a) / span;
}

export function length(value, y) {
  if (typeof value === 'number') return Math.hypot(value, finite(y));
  return Math.hypot(finite(value?.x), finite(value?.y));
}

export function dist(a, b) {
  return Math.hypot(finite(b?.x) - finite(a?.x), finite(b?.y) - finite(a?.y));
}

export function normalize(value, y) {
  const xValue = typeof value === 'number' ? value : finite(value?.x);
  const yValue = typeof value === 'number' ? finite(y) : finite(value?.y);
  const magnitude = Math.hypot(xValue, yValue);
  if (magnitude <= EPSILON) return { x: 0, y: 0 };
  return { x: xValue / magnitude, y: yValue / magnitude };
}

export function dot(a, b) {
  return finite(a?.x) * finite(b?.x) + finite(a?.y) * finite(b?.y);
}

// With two arguments this is the vector cross product. With three it is the
// signed twice-area/orientation of triangle (a, b, c).
export function cross(a, b, c) {
  if (c !== undefined) {
    return (finite(b?.x) - finite(a?.x)) * (finite(c?.y) - finite(a?.y))
      - (finite(b?.y) - finite(a?.y)) * (finite(c?.x) - finite(a?.x));
  }
  return finite(a?.x) * finite(b?.y) - finite(a?.y) * finite(b?.x);
}

// Signed shortest turn from `from` to `to`, in [-PI, PI).
export function angleDelta(from, to) {
  let delta = (to - from) % TAU;
  if (delta >= Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  return delta;
}

// Boundaries count as inside. The explicit edge check keeps points on horizontal
// edges and shared polygon vertices stable as the light moves by tiny amounts.
export function pointInPolygon(value, polygon) {
  const p = point(value);
  const vertices = Array.isArray(polygon) ? polygon : polygon?.points ?? polygon?.polygon ?? [];
  if (vertices.length === 0) return false;
  if (vertices.length === 1) return dist(p, vertices[0]) <= EPSILON;
  if (vertices.length === 2) return pointOnSegment(p, point(vertices[0]), point(vertices[1]));

  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
    const a = point(vertices[j]);
    const b = point(vertices[i]);
    if (pointOnSegment(p, a, b)) return true;

    const straddles = (a.y > p.y) !== (b.y > p.y);
    if (!straddles) continue;
    const crossingX = a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y);
    if (p.x < crossingX) inside = !inside;
  }
  return inside;
}

// Returns null or a point-like record { x, y, t, u, kind }. For collinear
// overlap, the deterministic first overlap point is returned and `overlap`
// contains both overlap endpoints.
export function segmentIntersection(aValue, bValue, cValue, dValue) {
  const a = point(aValue);
  const b = point(bValue);
  const c = point(cValue);
  const d = point(dValue);
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const rLengthSq = dot(r, r);
  const sLengthSq = dot(s, s);
  const degenerateTolerance = EPSILON * EPSILON;

  if (rLengthSq <= degenerateTolerance && sLengthSq <= degenerateTolerance) {
    if (dist(a, c) > EPSILON) return null;
    return { x: a.x, y: a.y, t: 0, u: 0, kind: 'point' };
  }

  if (rLengthSq <= degenerateTolerance) {
    if (!pointOnSegment(a, c, d)) return null;
    const u = sLengthSq <= degenerateTolerance ? 0 : dot({ x: a.x - c.x, y: a.y - c.y }, s) / sLengthSq;
    return { x: a.x, y: a.y, t: 0, u: clamp(u), kind: 'point' };
  }

  if (sLengthSq <= degenerateTolerance) {
    if (!pointOnSegment(c, a, b)) return null;
    const t = dot({ x: c.x - a.x, y: c.y - a.y }, r) / rLengthSq;
    return { x: c.x, y: c.y, t: clamp(t), u: 0, kind: 'point' };
  }

  const cma = { x: c.x - a.x, y: c.y - a.y };
  const rCrossS = cross(r, s);
  const parallelTolerance = EPSILON * Math.max(1, Math.sqrt(rLengthSq * sLengthSq));

  if (Math.abs(rCrossS) <= parallelTolerance) {
    if (Math.abs(cross(cma, r)) > EPSILON * Math.max(1, Math.sqrt(rLengthSq))) return null;

    const t0 = dot(cma, r) / rLengthSq;
    const t1 = t0 + dot(s, r) / rLengthSq;
    const startT = Math.max(0, Math.min(t0, t1));
    const endT = Math.min(1, Math.max(t0, t1));
    if (endT < startT - EPSILON) return null;

    const clampedStart = clamp(startT);
    const clampedEnd = clamp(endT);
    const start = { x: a.x + r.x * clampedStart, y: a.y + r.y * clampedStart };
    const end = { x: a.x + r.x * clampedEnd, y: a.y + r.y * clampedEnd };
    const u = dot({ x: start.x - c.x, y: start.y - c.y }, s) / sLengthSq;
    const isPoint = dist(start, end) <= EPSILON;
    return {
      x: start.x,
      y: start.y,
      t: clampedStart,
      u: clamp(u),
      kind: isPoint ? 'point' : 'overlap',
      ...(isPoint ? {} : { overlap: { start, end } }),
    };
  }

  const t = cross(cma, s) / rCrossS;
  const u = cross(cma, r) / rCrossS;
  const tolerance = scaledTolerance(t, u);
  if (t < -tolerance || t > 1 + tolerance || u < -tolerance || u > 1 + tolerance) return null;

  const clampedT = clamp(t);
  return {
    x: a.x + r.x * clampedT,
    y: a.y + r.y * clampedT,
    t: clampedT,
    u: clamp(u),
    kind: 'point',
  };
}

// Returns all boundary intersections ordered from a to b. Tangency is returned
// once and a segment wholly inside the circle correctly returns no boundary hit.
export function segmentCircleIntersection(aValue, bValue, circleValue, radius) {
  const a = point(aValue);
  const b = point(bValue);
  const circle = radius === undefined
    ? circleValue
    : { x: circleValue?.x, y: circleValue?.y, r: radius };
  const center = circleCenter(circle);
  const r = radiusOf(circle);
  const delta = { x: b.x - a.x, y: b.y - a.y };
  const offset = { x: a.x - center.x, y: a.y - center.y };
  const aa = dot(delta, delta);

  if (aa <= EPSILON * EPSILON) {
    if (Math.abs(dist(a, center) - r) <= EPSILON * Math.max(1, r)) {
      return [{ x: a.x, y: a.y, t: 0 }];
    }
    return [];
  }

  const bb = 2 * dot(offset, delta);
  const cc = dot(offset, offset) - r * r;
  let discriminant = bb * bb - 4 * aa * cc;
  const discriminantTolerance = EPSILON * Math.max(1, bb * bb, Math.abs(4 * aa * cc));
  if (discriminant < -discriminantTolerance) return [];
  if (Math.abs(discriminant) <= discriminantTolerance) discriminant = 0;

  const root = Math.sqrt(Math.max(0, discriminant));
  const candidates = [(-bb - root) / (2 * aa), (-bb + root) / (2 * aa)];
  const hits = [];
  for (const candidate of candidates) {
    if (candidate < -EPSILON || candidate > 1 + EPSILON) continue;
    const t = clamp(candidate);
    if (hits.some((hit) => Math.abs(hit.t - t) <= EPSILON)) continue;
    hits.push({ x: a.x + delta.x * t, y: a.y + delta.y * t, t });
  }
  return hits.sort((one, two) => one.t - two.t);
}

// Returns rectangle-boundary intersections ordered from a to b.
export function segmentRectIntersection(aValue, bValue, rect) {
  const bounds = rectBounds(rect);
  const corners = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.left, y: bounds.bottom },
  ];
  const hits = [];

  for (let index = 0; index < corners.length; index += 1) {
    const hit = segmentIntersection(aValue, bValue, corners[index], corners[(index + 1) % corners.length]);
    if (!hit) continue;
    const candidates = hit.kind === 'overlap'
      ? [hit.overlap.start, hit.overlap.end]
      : [hit];
    for (const candidate of candidates) {
      const closest = closestPointOnSegment(candidate, aValue, bValue);
      if (hits.some((existing) => dist(existing, closest) <= EPSILON)) continue;
      hits.push({ x: closest.x, y: closest.y, t: closest.t });
    }
  }

  return hits.sort((one, two) => one.t - two.t);
}

export function closestPointOnSegment(value, aValue, bValue) {
  const p = point(value);
  const a = point(aValue);
  const b = point(bValue);
  const delta = { x: b.x - a.x, y: b.y - a.y };
  const denominator = dot(delta, delta);
  const t = denominator <= EPSILON * EPSILON
    ? 0
    : clamp(dot({ x: p.x - a.x, y: p.y - a.y }, delta) / denominator);
  return { x: a.x + delta.x * t, y: a.y + delta.y * t, t };
}

// Monotone-chain hull. Output is counter-clockwise, has no repeated closing
// point, and keeps only the extreme endpoints of collinear runs.
export function convexHull(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const sorted = values
    .map(point)
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter((value, index, array) => index === 0 || dist(value, array[index - 1]) > EPSILON);

  if (sorted.length <= 2) return sorted;

  const lower = [];
  for (const value of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), value) <= EPSILON) lower.pop();
    lower.push(value);
  }

  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const value = sorted[index];
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), value) <= EPSILON) upper.pop();
    upper.push(value);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Resolve a center-based circle out of an axis-aligned rectangle. The returned
// x/y are the resolved circle center; correction is safe to add to an entity.
export function resolveCircleRect(circle, rect) {
  const center = circleCenter(circle);
  const radius = radiusOf(circle);
  const bounds = rectBounds(rect);
  const nearest = {
    x: clamp(center.x, bounds.left, bounds.right),
    y: clamp(center.y, bounds.top, bounds.bottom),
  };
  const offset = { x: center.x - nearest.x, y: center.y - nearest.y };
  const distance = length(offset);

  if (distance > radius + EPSILON) {
    return {
      collided: false,
      x: center.x,
      y: center.y,
      normal: { x: 0, y: 0 },
      depth: 0,
      correction: { x: 0, y: 0 },
      point: nearest,
    };
  }

  let normal;
  let depth;
  let contact = nearest;
  if (distance > EPSILON) {
    normal = { x: offset.x / distance, y: offset.y / distance };
    depth = Math.max(0, radius - distance);
  } else {
    const sideDistances = [
      { distance: center.x - bounds.left, normal: { x: -1, y: 0 }, point: { x: bounds.left, y: center.y } },
      { distance: bounds.right - center.x, normal: { x: 1, y: 0 }, point: { x: bounds.right, y: center.y } },
      { distance: center.y - bounds.top, normal: { x: 0, y: -1 }, point: { x: center.x, y: bounds.top } },
      { distance: bounds.bottom - center.y, normal: { x: 0, y: 1 }, point: { x: center.x, y: bounds.bottom } },
    ].sort((a, b) => a.distance - b.distance);
    normal = sideDistances[0].normal;
    contact = sideDistances[0].point;
    depth = radius + Math.max(0, sideDistances[0].distance);
  }

  const correction = { x: normal.x * depth, y: normal.y * depth };
  return {
    collided: true,
    x: center.x + correction.x,
    y: center.y + correction.y,
    normal,
    depth,
    correction,
    point: contact,
  };
}

function seedToUint32(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed ?? 0);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash ^= code & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= code >>> 8;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Callable Mulberry32 stream. State is a plain uint32 so simulation snapshots
// can save/restore it exactly.
export function createRng(seed = 0) {
  let state = seedToUint32(seed);

  function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }

  rng.next = rng;
  rng.float = (min = 0, max = 1) => lerp(min, max, rng());
  rng.int = (min, max) => {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    if (high < low) return low;
    return low + Math.floor(rng() * (high - low + 1));
  };
  rng.pick = (values) => (values?.length ? values[Math.floor(rng() * values.length)] : undefined);
  rng.getState = () => state >>> 0;
  rng.setState = (nextState) => {
    state = seedToUint32(nextState);
    return rng;
  };
  return rng;
}

function canonicalize(value, seen) {
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'undefined') return 'undefined';
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number') {
    if (Number.isNaN(value)) return 'number:NaN';
    if (value === Infinity) return 'number:Infinity';
    if (value === -Infinity) return 'number:-Infinity';
    if (Object.is(value, -0)) return 'number:-0';
    return `number:${value}`;
  }
  if (type === 'bigint') return `bigint:${value}`;
  if (type === 'string') return `string:${JSON.stringify(value)}`;
  if (type === 'symbol') return `symbol:${String(value.description ?? '')}`;
  if (type === 'function') return `function:${value.name || 'anonymous'}`;

  if (seen.has(value)) throw new TypeError('hashObject cannot hash cyclic structures');
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    result = `array:[${value.map((item) => canonicalize(item, seen)).join(',')}]`;
  } else if (value instanceof Date) {
    result = `date:${value.toISOString()}`;
  } else if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([key, item]) => `${canonicalize(key, seen)}=>${canonicalize(item, seen)}`)
      .sort();
    result = `map:{${entries.join(',')}}`;
  } else if (value instanceof Set) {
    result = `set:{${[...value].map((item) => canonicalize(item, seen)).sort().join(',')}}`;
  } else if (ArrayBuffer.isView(value)) {
    result = `${value.constructor.name}:[${[...value].join(',')}]`;
  } else {
    const keys = Object.keys(value).sort();
    result = `object:{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key], seen)}`).join(',')}}`;
  }
  seen.delete(value);
  return result;
}

// Stable FNV-1a hash of a type-preserving canonical representation. Object key
// insertion order cannot affect the result. The compact eight-digit hex value is
// convenient for deterministic QA snapshots and URL-visible diagnostics.
export function hashObject(value) {
  const text = canonicalize(value, new Set());
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash ^= code & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= code >>> 8;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
