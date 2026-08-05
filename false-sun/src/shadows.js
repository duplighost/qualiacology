import {
  EPSILON,
  clamp,
  convexHull,
  dist,
  normalize,
  pointInPolygon,
  segmentIntersection,
} from './math.js';

const TAU = Math.PI * 2;
const DEFAULT_REACH = 1400;
const DEFAULT_CIRCLE_SEGMENTS = 24;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function copyPoint(value) {
  if (Array.isArray(value)) return { x: finite(value[0]), y: finite(value[1]) };
  return { x: finite(value?.x), y: finite(value?.y) };
}

function lightPoint(light) {
  if (light?.position && typeof light.position === 'object') return copyPoint(light.position);
  return {
    x: finite(light?.x ?? light?.cx),
    y: finite(light?.y ?? light?.cy),
  };
}

function casterCenter(caster) {
  if (caster?.center && typeof caster.center === 'object') return copyPoint(caster.center);
  return {
    x: finite(caster?.cx ?? caster?.x ?? caster?.position?.x),
    y: finite(caster?.cy ?? caster?.y ?? caster?.position?.y),
  };
}

function casterType(caster) {
  const declared = typeof caster?.shape === 'string'
    ? caster.shape
    : caster?.type ?? caster?.shape?.type;
  if (typeof declared === 'string') {
    const normalized = declared.toLowerCase();
    if (normalized.includes('circle') || normalized === 'disc') return 'circle';
    if (normalized.includes('poly')) return 'poly';
    if (normalized.includes('rect') || normalized === 'box' || normalized === 'wall') return 'rect';
  }
  if (Number.isFinite(caster?.r) || Number.isFinite(caster?.radius)) return 'circle';
  if (
    Array.isArray(caster?.points) || Array.isArray(caster?.vertices)
    || Array.isArray(caster?.polygon) || Array.isArray(caster?.localVertices)
  ) return 'poly';
  return 'rect';
}

function rotateAndTranslate(value, center, angle, scaleX = 1, scaleY = 1) {
  const x = finite(value?.x) * scaleX;
  const y = finite(value?.y) * scaleY;
  if (Math.abs(angle) <= EPSILON) return { x: center.x + x, y: center.y + y };
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: center.x + x * cosine - y * sine,
    y: center.y + x * sine + y * cosine,
  };
}

function rectangleVertices(caster) {
  let center;
  let width;
  let height;

  if (
    Number.isFinite(caster?.left) || Number.isFinite(caster?.right)
    || Number.isFinite(caster?.top) || Number.isFinite(caster?.bottom)
    || Number.isFinite(caster?.minX) || Number.isFinite(caster?.maxX)
  ) {
    const left = finite(caster.minX ?? caster.left);
    const right = finite(caster.maxX ?? caster.right, left);
    const top = finite(caster.minY ?? caster.top);
    const bottom = finite(caster.maxY ?? caster.bottom, top);
    center = { x: (left + right) * 0.5, y: (top + bottom) * 0.5 };
    width = Math.abs(right - left);
    height = Math.abs(bottom - top);
  } else {
    width = Math.abs(finite(caster?.w ?? caster?.width));
    height = Math.abs(finite(caster?.h ?? caster?.height));
    center = casterCenter(caster);
    if (caster?.centered === false || caster?.anchor === 'top-left') {
      center = { x: center.x + width * 0.5, y: center.y + height * 0.5 };
    }
  }

  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const angle = finite(caster?.angle ?? caster?.rotation);
  return [
    rotateAndTranslate({ x: -halfWidth, y: -halfHeight }, center, angle),
    rotateAndTranslate({ x: halfWidth, y: -halfHeight }, center, angle),
    rotateAndTranslate({ x: halfWidth, y: halfHeight }, center, angle),
    rotateAndTranslate({ x: -halfWidth, y: halfHeight }, center, angle),
  ];
}

function circleVertices(caster) {
  const center = casterCenter(caster);
  const radius = Math.max(0, finite(caster?.r ?? caster?.radius));
  const segments = clamp(
    Math.round(finite(caster?.shadowSegments ?? caster?.segments, DEFAULT_CIRCLE_SEGMENTS)),
    8,
    96,
  );
  const offset = finite(caster?.angle ?? caster?.rotation);
  return Array.from({ length: segments }, (_, index) => {
    const angle = offset + (index / segments) * TAU;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  });
}

function polygonVertices(caster) {
  const localValues = caster?.localVertices ?? caster?.localPoints;
  const values = localValues
    ?? caster?.points
    ?? caster?.vertices
    ?? caster?.polygon
    ?? caster?.shape?.points
    ?? [];
  const isLocal = Boolean(localValues || caster?.local === true || caster?.pointsLocal === true);
  if (!isLocal) {
    const points = values.map(copyPoint);
    const angle = finite(caster?.angle ?? caster?.rotation);
    if (Math.abs(angle) <= EPSILON || points.length < 2) return points;
    const center = points.reduce(
      (total, point) => ({ x: total.x + point.x / points.length, y: total.y + point.y / points.length }),
      { x: 0, y: 0 },
    );
    return points.map((point) => rotateAndTranslate(
      { x: point.x - center.x, y: point.y - center.y },
      center,
      angle,
    ));
  }

  const center = casterCenter(caster);
  const angle = finite(caster?.angle ?? caster?.rotation);
  const uniformScale = finite(caster?.scale, 1);
  const scaleX = finite(caster?.scaleX, uniformScale);
  const scaleY = finite(caster?.scaleY, uniformScale);
  return values.map((value) => rotateAndTranslate(value, center, angle, scaleX, scaleY));
}

// Convert supported rect/circle/poly caster records into world-space vertices.
// Rectangles are center-based unless explicitly marked centered:false.
export function casterVertices(caster) {
  switch (casterType(caster)) {
    case 'circle': return circleVertices(caster);
    case 'poly': return polygonVertices(caster);
    default: return rectangleVertices(caster);
  }
}

function polygonArea(polygon) {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area * 0.5;
}

function polygonCenter(polygon) {
  if (!polygon.length) return { x: 0, y: 0 };
  const area = polygonArea(polygon);
  if (Math.abs(area) <= EPSILON) {
    return polygon.reduce(
      (total, value) => ({ x: total.x + value.x / polygon.length, y: total.y + value.y / polygon.length }),
      { x: 0, y: 0 },
    );
  }

  let x = 0;
  let y = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const factor = a.x * b.y - b.x * a.y;
    x += (a.x + b.x) * factor;
    y += (a.y + b.y) * factor;
  }
  const scale = 1 / (6 * area);
  return { x: x * scale, y: y * scale };
}

function projectedPoint(source, light, reach, fallbackDirection) {
  let direction = normalize({ x: source.x - light.x, y: source.y - light.y });
  if (Math.abs(direction.x) + Math.abs(direction.y) <= EPSILON) direction = fallbackDirection;
  return { x: source.x + direction.x * reach, y: source.y + direction.y * reach };
}

function radialHullShadow(vertices, light, reach) {
  const hull = convexHull(vertices);
  if (hull.length < 2) return [];
  const center = polygonCenter(hull);
  let fallback = normalize({ x: center.x - light.x, y: center.y - light.y });
  if (Math.abs(fallback.x) + Math.abs(fallback.y) <= EPSILON) fallback = { x: 1, y: 0 };
  return convexHull([
    ...hull,
    ...hull.map((value) => projectedPoint(value, light, reach, fallback)),
  ]);
}

function circleShadow(caster, light, reach) {
  const center = casterCenter(caster);
  const radius = Math.max(0, finite(caster?.r ?? caster?.radius));
  const dx = center.x - light.x;
  const dy = center.y - light.y;
  const distanceToCenter = Math.hypot(dx, dy);

  if (radius <= EPSILON) {
    const direction = normalize({ x: dx, y: dy });
    const perpendicular = { x: -direction.y * 0.01, y: direction.x * 0.01 };
    return convexHull([
      { x: center.x + perpendicular.x, y: center.y + perpendicular.y },
      { x: center.x - perpendicular.x, y: center.y - perpendicular.y },
      { x: center.x + direction.x * reach, y: center.y + direction.y * reach },
    ]);
  }

  if (distanceToCenter <= radius + EPSILON) {
    return radialHullShadow(circleVertices(caster), light, reach);
  }

  const baseAngle = Math.atan2(dy, dx);
  const tangentOffset = Math.asin(clamp(radius / distanceToCenter, -1, 1));
  const tangentDistance = Math.sqrt(Math.max(0, distanceToCenter ** 2 - radius ** 2));
  const angleA = baseAngle - tangentOffset;
  const angleB = baseAngle + tangentOffset;
  const tangentA = {
    x: light.x + Math.cos(angleA) * tangentDistance,
    y: light.y + Math.sin(angleA) * tangentDistance,
  };
  const tangentB = {
    x: light.x + Math.cos(angleB) * tangentDistance,
    y: light.y + Math.sin(angleB) * tangentDistance,
  };
  const farA = projectedPoint(tangentA, light, reach, normalize({ x: dx, y: dy }));
  const farB = projectedPoint(tangentB, light, reach, normalize({ x: dx, y: dy }));
  return convexHull([tangentA, tangentB, farA, farB]);
}

function polygonShadow(caster, light, reach) {
  const hull = convexHull(casterVertices(caster));
  if (hull.length < 2) return [];
  if (hull.length < 3 || pointInPolygon(light, hull)) return radialHullShadow(hull, light, reach);

  const angles = hull
    .map((value) => ({
      value,
      angle: (Math.atan2(value.y - light.y, value.x - light.x) + TAU) % TAU,
    }))
    .sort((a, b) => a.angle - b.angle || a.value.x - b.value.x || a.value.y - b.value.y);

  let gapIndex = 0;
  let largestGap = -Infinity;
  for (let index = 0; index < angles.length; index += 1) {
    const next = (index + 1) % angles.length;
    const gap = (angles[next].angle - angles[index].angle + TAU) % TAU;
    if (gap > largestGap + EPSILON) {
      largestGap = gap;
      gapIndex = index;
    }
  }

  const angularSpan = TAU - largestGap;
  if (angularSpan >= Math.PI - EPSILON) return radialHullShadow(hull, light, reach);

  const tangentA = angles[(gapIndex + 1) % angles.length].value;
  const tangentB = angles[gapIndex].value;
  const fallback = normalize({
    x: (tangentA.x + tangentB.x) * 0.5 - light.x,
    y: (tangentA.y + tangentB.y) * 0.5 - light.y,
  });
  const farA = projectedPoint(tangentA, light, reach, fallback);
  const farB = projectedPoint(tangentB, light, reach, fallback);
  return convexHull([tangentA, tangentB, farA, farB]);
}

// Build the authoritative umbra wedge cast away from a local point light.
// Circle casters use analytic tangents; rects and polygons use convex silhouette
// tangents. `reach` is the extrusion distance beyond the tangent points.
export function buildShadowPolygon(caster, light, reach = undefined) {
  const source = lightPoint(light);
  const resolvedReach = Math.max(
    0,
    finite(reach ?? caster?.shadowReach ?? light?.reach, DEFAULT_REACH),
  );
  if (resolvedReach <= EPSILON) return [];
  return casterType(caster) === 'circle'
    ? circleShadow(caster, source, resolvedReach)
    : polygonShadow(caster, source, resolvedReach);
}

function normalizeBounds(bounds) {
  if (!bounds) return null;
  if (
    Number.isFinite(bounds.minX) || Number.isFinite(bounds.maxX)
    || Number.isFinite(bounds.minY) || Number.isFinite(bounds.maxY)
  ) {
    const left = finite(bounds.minX ?? bounds.left);
    const top = finite(bounds.minY ?? bounds.top);
    const right = finite(bounds.maxX ?? bounds.right, left);
    const bottom = finite(bounds.maxY ?? bounds.bottom, top);
    return {
      left: Math.min(left, right), top: Math.min(top, bottom),
      right: Math.max(left, right), bottom: Math.max(top, bottom),
    };
  }
  if (
    Number.isFinite(bounds.left) || Number.isFinite(bounds.right)
    || Number.isFinite(bounds.top) || Number.isFinite(bounds.bottom)
  ) {
    const left = finite(bounds.left);
    const top = finite(bounds.top);
    const right = finite(bounds.right, left);
    const bottom = finite(bounds.bottom, top);
    return {
      left: Math.min(left, right), top: Math.min(top, bottom),
      right: Math.max(left, right), bottom: Math.max(top, bottom),
    };
  }

  const width = Math.abs(finite(bounds.w ?? bounds.width));
  const height = Math.abs(finite(bounds.h ?? bounds.height));
  const x = finite(bounds.x);
  const y = finite(bounds.y);
  if (bounds.centered === true || bounds.anchor === 'center') {
    return { left: x - width * 0.5, top: y - height * 0.5, right: x + width * 0.5, bottom: y + height * 0.5 };
  }
  // World/canvas bounds conventionally use a top-left x/y origin.
  return { left: x, top: y, right: x + width, bottom: y + height };
}

function clipAgainst(polygon, inside, intersection) {
  if (!polygon.length) return [];
  const output = [];
  let previous = polygon.at(-1);
  let previousInside = inside(previous);
  for (const current of polygon) {
    const currentInside = inside(current);
    if (currentInside !== previousInside) output.push(intersection(previous, current));
    if (currentInside) output.push(current);
    previous = current;
    previousInside = currentInside;
  }
  return output;
}

function clipPolygonToBounds(polygon, bounds) {
  if (!bounds) return polygon.map(copyPoint);
  let result = polygon.map(copyPoint);
  result = clipAgainst(
    result,
    (value) => value.x >= bounds.left - EPSILON,
    (a, b) => {
      const t = (bounds.left - a.x) / (b.x - a.x);
      return { x: bounds.left, y: a.y + (b.y - a.y) * t };
    },
  );
  result = clipAgainst(
    result,
    (value) => value.x <= bounds.right + EPSILON,
    (a, b) => {
      const t = (bounds.right - a.x) / (b.x - a.x);
      return { x: bounds.right, y: a.y + (b.y - a.y) * t };
    },
  );
  result = clipAgainst(
    result,
    (value) => value.y >= bounds.top - EPSILON,
    (a, b) => {
      const t = (bounds.top - a.y) / (b.y - a.y);
      return { x: a.x + (b.x - a.x) * t, y: bounds.top };
    },
  );
  result = clipAgainst(
    result,
    (value) => value.y <= bounds.bottom + EPSILON,
    (a, b) => {
      const t = (bounds.bottom - a.y) / (b.y - a.y);
      return { x: a.x + (b.x - a.x) * t, y: bounds.bottom };
    },
  );

  return result.filter((value, index, values) => {
    const previous = values[(index - 1 + values.length) % values.length];
    return values.length <= 1 || dist(value, previous) > EPSILON;
  });
}

function polygonEdges(polygon) {
  return polygon.map((value, index) => ({
    a: copyPoint(value),
    b: copyPoint(polygon[(index + 1) % polygon.length]),
  }));
}

function reachForBounds(light, bounds) {
  if (!bounds) return DEFAULT_REACH;
  const corners = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.left, y: bounds.bottom },
  ];
  const farthest = Math.max(...corners.map((value) => dist(light, value)));
  return farthest + Math.hypot(bounds.right - bounds.left, bounds.bottom - bounds.top) + 1;
}

// Rebuild every enabled caster against one point light and optionally clip the
// results to world bounds. Ordering follows caster ordering for deterministic QA.
export function computeShadows(casters, light, bounds = undefined) {
  const source = lightPoint(light);
  const clippingBounds = normalizeBounds(bounds);
  const defaultReach = Math.max(
    reachForBounds(source, clippingBounds),
    finite(light?.reach, 0),
  );

  return (casters ?? []).flatMap((caster, index) => {
    if (!caster || caster.castsShadow === false || caster.disabled === true || caster.active === false) return [];
    const polygon = clipPolygonToBounds(
      buildShadowPolygon(caster, source, finite(caster.shadowReach, defaultReach)),
      clippingBounds,
    );
    if (polygon.length < 3 || Math.abs(polygonArea(polygon)) <= EPSILON) return [];
    return [{
      casterId: caster.id ?? caster.casterId ?? index,
      polygon,
      edges: polygonEdges(polygon),
      center: polygonCenter(polygon),
      interactive: caster.interactive !== false && caster.shadowInteractive !== false,
    }];
  });
}

export function findContainingShadows(value, shadows) {
  return (shadows ?? []).filter((shadow) => (
    Array.isArray(shadow?.polygon) && pointInPolygon(value, shadow.polygon)
  ));
}

function edgeEndpoints(edge) {
  if (Array.isArray(edge)) return [edge[0], edge[1]];
  return [edge?.a ?? edge?.start, edge?.b ?? edge?.end];
}

// Return one shadow entry per crossed caster, augmented with all unique boundary
// intersections. A through-cut that hits both sides therefore damages once.
export function segmentShadowCuts(a, b, shadows) {
  const byCaster = new Map();
  for (let shadowIndex = 0; shadowIndex < (shadows ?? []).length; shadowIndex += 1) {
    const shadow = shadows[shadowIndex];
    if (!shadow || shadow.interactive === false) continue;
    const edges = shadow.edges?.length ? shadow.edges : polygonEdges(shadow.polygon ?? []);
    const intersections = [];

    for (const edge of edges) {
      const [start, end] = edgeEndpoints(edge);
      if (!start || !end) continue;
      const hit = segmentIntersection(a, b, start, end);
      // Travelling along a boundary is not crossing it.
      if (!hit || hit.kind === 'overlap') continue;
      if (intersections.some((existing) => dist(existing, hit) <= EPSILON * 8)) continue;
      intersections.push(hit);
    }
    if (!intersections.length) continue;
    intersections.sort((one, two) => one.t - two.t);

    const key = shadow.casterId ?? shadow.id ?? shadow;
    const previous = byCaster.get(key);
    if (!previous) {
      byCaster.set(key, { ...shadow, intersections });
      continue;
    }
    const merged = [...previous.intersections];
    for (const hit of intersections) {
      if (!merged.some((existing) => dist(existing, hit) <= EPSILON * 8)) merged.push(hit);
    }
    merged.sort((one, two) => one.t - two.t);
    if (intersections[0].t < previous.intersections[0].t) {
      byCaster.set(key, { ...shadow, intersections: merged });
    } else {
      previous.intersections = merged;
    }
  }

  return [...byCaster.values()].sort(
    (one, two) => one.intersections[0].t - two.intersections[0].t,
  );
}

function receiverAllowsShadow(receiver, shadow) {
  const required = receiver?.requiredCasterId ?? receiver?.shadowCasterId;
  if (required !== undefined && shadow?.casterId !== required) return false;
  // Puzzle authority and cut authority are separate: a required architectural
  // caster can sing into a receiver even when its edge is not cuttable.
  if (required === undefined && shadow?.interactive === false) return false;
  const accepted = receiver?.casterIds ?? receiver?.accepts;
  if (Array.isArray(accepted) && !accepted.includes(shadow?.casterId)) return false;
  return true;
}

function receiverShape(receiver) {
  const values = receiver?.points ?? receiver?.vertices ?? receiver?.polygon;
  if (Array.isArray(values) && values.length >= 3) return { type: 'poly', polygon: values.map(copyPoint) };
  const radius = Math.max(0, finite(receiver?.r ?? receiver?.radius));
  if (radius > EPSILON) return { type: 'circle', center: casterCenter(receiver), radius };
  const width = Math.abs(finite(receiver?.w ?? receiver?.width));
  const height = Math.abs(finite(receiver?.h ?? receiver?.height));
  if (width > EPSILON || height > EPSILON) {
    return { type: 'poly', polygon: rectangleVertices({ ...receiver, type: 'rect' }) };
  }
  return { type: 'point', center: casterCenter(receiver) };
}

function sampleReceiver(receiver, shape) {
  if (Array.isArray(receiver?.samples) && receiver.samples.length) return receiver.samples.map(copyPoint);
  if (shape.type === 'point') return [shape.center];

  let polygon;
  let inside;
  if (shape.type === 'circle') {
    const segments = 24;
    polygon = Array.from({ length: segments }, (_, index) => {
      const angle = (index / segments) * TAU;
      return {
        x: shape.center.x + Math.cos(angle) * shape.radius,
        y: shape.center.y + Math.sin(angle) * shape.radius,
      };
    });
    inside = (value) => dist(value, shape.center) <= shape.radius + EPSILON;
  } else {
    polygon = shape.polygon;
    inside = (value) => pointInPolygon(value, polygon);
  }

  const xs = polygon.map((value) => value.x);
  const ys = polygon.map((value) => value.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const resolution = clamp(Math.round(finite(receiver?.coverageSamples, 9)), 3, 31);
  const samples = [
    ...polygon,
    ...polygon.map((value, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return { x: (value.x + next.x) * 0.5, y: (value.y + next.y) * 0.5 };
    }),
  ];

  for (let row = 0; row < resolution; row += 1) {
    for (let column = 0; column < resolution; column += 1) {
      const candidate = {
        x: left + ((column + 0.5) / resolution) * (right - left),
        y: top + ((row + 0.5) / resolution) * (bottom - top),
      };
      if (inside(candidate)) samples.push(candidate);
    }
  }
  return samples;
}

// Deterministic union coverage in [0,1]. Point receivers are exact; area
// receivers use a stable boundary-plus-grid sample that avoids overlap double
// counting and is ample for the small crescent receivers used by the game.
export function receiverCoverage(receiver, shadows) {
  const eligible = (shadows ?? []).filter((shadow) => receiverAllowsShadow(receiver, shadow));
  if (!eligible.length) return 0;
  const shape = receiverShape(receiver);
  const samples = sampleReceiver(receiver, shape);
  if (!samples.length) return 0;
  let covered = 0;
  for (const sample of samples) {
    if (eligible.some((shadow) => pointInPolygon(sample, shadow.polygon ?? []))) covered += 1;
  }
  return covered / samples.length;
}
