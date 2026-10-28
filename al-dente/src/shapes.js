// Real pasta shapes, built procedurally. All geometry is indexed with position/normal/uv.
// UVs are in meters of surface distance (u along the pasta, v around/across) so one
// tileable semolina normal map reads at the same physical scale on every shape.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, clamp, lerp, smoothstep, TAU } from './util.js';

const V3 = THREE.Vector3;

// ------------------------------------------------------------------ builders
function flipGeo(g) {
  const ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  g.index.needsUpdate = true;
  const n = g.getAttribute('normal');
  for (let i = 0; i < n.array.length; i++) n.array[i] *= -1;
  n.needsUpdate = true;
}

// rows × cols grid. at(i, j, seam) -> [x, y, z, u, v]. closed: a seam column is duplicated and normals averaged.
// ref(i, j) -> reference direction the surface should face (used to fix winding).
function grid(rows, cols, at, { closed = false, ref = null } = {}) {
  const C = closed ? cols + 1 : cols;
  const pos = new Float32Array(rows * C * 3), uv = new Float32Array(rows * C * 2);
  for (let i = 0; i < rows; i++) for (let j = 0; j < C; j++) {
    const seam = closed && j === cols;
    const r = at(i, seam ? 0 : j, seam);
    const k = i * C + j;
    pos[k * 3] = r[0]; pos[k * 3 + 1] = r[1]; pos[k * 3 + 2] = r[2];
    uv[k * 2] = r[3]; uv[k * 2 + 1] = r[4];
  }
  const idx = [];
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < C - 1; j++) {
    const a = i * C + j, b = a + 1, c = a + C, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (closed) {
    const n = g.getAttribute('normal');
    for (let i = 0; i < rows; i++) {
      const a = i * C, b = i * C + cols;
      const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
      n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
    }
  }
  if (ref) {
    const n = g.getAttribute('normal'); let s = 0;
    const si = Math.max(1, Math.floor(rows / 6)), sj = Math.max(1, Math.floor(cols / 6));
    for (let i = 0; i < rows; i += si) for (let j = 0; j < cols; j += sj) { const k = i * C + j; const r = ref(i, j); s += n.getX(k) * r[0] + n.getY(k) * r[1] + n.getZ(k) * r[2]; }
    if (s < 0) flipGeo(g);
  }
  return g;
}

function frames(P) {
  const n = P.length, T = [], N = [], B = [];
  for (let i = 0; i < n; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)]; T.push(new V3().subVectors(b, a).normalize()); }
  const up = Math.abs(T[0].y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0);
  let nn = new V3().crossVectors(T[0], up).normalize();
  for (let i = 0; i < n; i++) {
    if (i > 0) { nn = nn.clone().addScaledVector(T[i], -nn.dot(T[i])); if (nn.lengthSq() < 1e-10) nn = new V3().crossVectors(T[i], up); nn.normalize(); }
    N.push(nn.clone()); B.push(new V3().crossVectors(T[i], nn).normalize());
  }
  return { T, N, B };
}
function arcLengths(P) { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1])); return L; }

// Sweep a closed cross-section along a path. prof(i, a, t) -> [x, y] in the frame's N/B plane.
function sweep(P, cols, prof, { inward = false } = {}) {
  const F = frames(P), L = arcLengths(P), rows = P.length;
  const at = (i, j, seam) => {
    const a = seam ? TAU : (j / cols) * TAU, t = i / (rows - 1);
    const [x, y] = prof(i, a, t);
    const p = P[i];
    return [p.x + F.N[i].x * x + F.B[i].x * y, p.y + F.N[i].y * x + F.B[i].y * y, p.z + F.N[i].z * x + F.B[i].z * y, L[i], a * Math.hypot(x, y)];
  };
  const ref = (i, j) => { const a = (j / cols) * TAU; const [x, y] = prof(i, a, i / (rows - 1)); const s = inward ? -1 : 1; return [(F.N[i].x * x + F.B[i].x * y) * s, (F.N[i].y * x + F.B[i].y * y) * s, (F.N[i].z * x + F.B[i].z * y) * s]; };
  const g = grid(rows, cols, at, { closed: true, ref });
  g.userData.frames = F; g.userData.path = P;
  return g;
}

// Flat cap at ring i of a sweep (a cut pasta end). dir = +1 faces along T, -1 against.
function cap(P, F, i, cols, prof, dir) {
  const c = P[i], T = F.T[i], N = F.N[i], B = F.B[i];
  const pos = [c.x, c.y, c.z], uv = [0, 0], idx = [];
  for (let j = 0; j < cols; j++) {
    const a = (j / cols) * TAU; const [x, y] = prof(i, a, i / (P.length - 1));
    pos.push(c.x + N.x * x + B.x * y, c.y + N.y * x + B.y * y, c.z + N.z * x + B.z * y); uv.push(x, y);
  }
  for (let j = 0; j < cols; j++) idx.push(0, 1 + j, 1 + ((j + 1) % cols));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const nrm = []; for (let k = 0; k < pos.length / 3; k++) nrm.push(T.x * dir, T.y * dir, T.z * dir);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  // winding to match the normal
  const A = new V3(pos[3], pos[4], pos[5]), Bv = new V3(pos[6], pos[7], pos[8]);
  const fn = new V3().subVectors(A, c).cross(new V3().subVectors(Bv, c));
  if (fn.dot(T) * dir < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } }
  return g;
}

// Ring strip joining two closed rings of equal size (cut ends of hollow pasta).
function ringStrip(outer, inner, faceDir) {
  const n = outer.length, pos = [], uv = [], idx = [];
  for (let j = 0; j <= n; j++) { const o = outer[j % n], q = inner[j % n]; pos.push(o.x, o.y, o.z, q.x, q.y, q.z); uv.push(j * 0.02, 0, j * 0.02, o.distanceTo(q)); }
  for (let j = 0; j < n; j++) { const a = j * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const nn = g.getAttribute('normal');
  let s = 0; for (let k = 0; k < nn.count; k += 3) s += nn.getX(k) * faceDir.x + nn.getY(k) * faceDir.y + nn.getZ(k) * faceDir.z;
  if (s < 0) flipGeo(g);
  return g;
}
function ringAt(g, i, cols) {
  const p = g.getAttribute('position'), C = cols + 1, out = [];
  for (let j = 0; j < cols; j++) out.push(new V3().fromBufferAttribute(p, i * C + j));
  return out;
}

function withAttr(g, name, fn) {
  const p = g.getAttribute('position'), a = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) a[i] = fn(p.getX(i), p.getY(i), p.getZ(i), i);
  g.setAttribute(name, new THREE.BufferAttribute(a, 1));
  return g;
}
function constAttr(g, name, v) { return withAttr(g, name, () => v); }
function merge(list) {
  const g = mergeGeometries(list, false);
  for (const x of list) x.dispose();
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
function done(g) { g.computeBoundingBox(); g.computeBoundingSphere(); return g; }
// extrusions come out non-indexed with flat normals: weld, then smooth
function smoothExtrude(g) { g.deleteAttribute('normal'); const m = mergeVertices(g, 1e-4); g.dispose(); m.computeVertexNormals(); return m; }

// ------------------------------------------------------------------ 1. tube
export function tube(points, { radius = 0.03, radialSegments = 8, tubularSegments, caps = true, radiusFn = null } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const segs = tubularSegments ?? Math.max(6, Math.min(40, Math.round(curve.getLength() / (radius * 4))));
  const P = curve.getSpacedPoints(Math.min(segs, 160));
  const prof = (i, a, t) => { const r = radius * (radiusFn ? radiusFn(t) : 1); return [Math.cos(a) * r, Math.sin(a) * r]; };
  const body = sweep(P, radialSegments, prof);
  if (!caps) return done(body);
  const F = body.userData.frames;
  const c0 = cap(P, F, 0, radialSegments, prof, -1), c1 = cap(P, F, P.length - 1, radialSegments, prof, 1);
  return merge([body, c0, c1]);
}

// ------------------------------------------------------------------ 2. rotelle (wagon wheels)
export function rotelle({ radius = 0.5, thickness = 0.12, spokes = 6, curveSegments = 14 } = {}) {
  const R = radius, rim = R * 0.13, hub = R * 0.22, sw = R * 0.062;
  const outer = new THREE.Shape();
  const NO = 44;
  for (let i = 0; i <= NO; i++) {
    const a = (i / NO) * TAU, r = R * (1 + 0.022 * Math.cos(a * 22));
    if (i === 0) outer.moveTo(Math.cos(a) * r, Math.sin(a) * r); else outer.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const ri = R - rim;
  for (let k = 0; k < spokes; k++) {
    const a0 = (k / spokes) * TAU, a1 = ((k + 1) / spokes) * TAU;
    const hole = new THREE.Path();
    const pts = [];
    const n = 6;
    // outer arc of the hole, between spoke edges (spoke edges are parallel to the spoke axis)
    const dOut = Math.asin(clamp(sw / ri, 0, 1)), dIn = Math.asin(clamp(sw / (hub + 0.001), 0, 0.99));
    for (let i = 0; i <= n; i++) { const a = lerp(a0 + dOut, a1 - dOut, i / n); pts.push([Math.cos(a) * ri, Math.sin(a) * ri]); }
    for (let i = 0; i <= n; i++) { const a = lerp(a1 - dIn, a0 + dIn, i / n); pts.push([Math.cos(a) * hub, Math.sin(a) * hub]); }
    // round the corners a little by averaging neighbours
    const sm = pts.map((p, i) => { const q = pts[(i + pts.length - 1) % pts.length], s = pts[(i + 1) % pts.length]; return [p[0] * 0.6 + (q[0] + s[0]) * 0.2, p[1] * 0.6 + (q[1] + s[1]) * 0.2]; });
    sm.reverse().forEach((p, i) => (i === 0 ? hole.moveTo(p[0], p[1]) : hole.lineTo(p[0], p[1])));
    hole.closePath();
    outer.holes.push(hole);
  }
  const bev = thickness * 0.32;
  const g = new THREE.ExtrudeGeometry(outer, { depth: Math.max(0.001, thickness - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 2, curveSegments });
  g.translate(0, 0, -(thickness - bev * 2) / 2);
  // slight dome
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)) / R; p.setZ(i, p.getZ(i) + (1 - r * r) * thickness * 0.18); }
  return done(smoothExtrude(g));
}

// ------------------------------------------------------------------ 3. stellina (star)
export function stellina({ outerRadius = 1.4, innerRadius = 0.72, thickness = 0.42, points = 5, holeRadius = 0.16 } = {}) {
  const s = new THREE.Shape();
  const V = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * TAU + Math.PI / 2, r = i % 2 ? innerRadius : outerRadius;
    V.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  for (let i = 0; i < V.length; i++) {
    const p = V[i], q = V[(i + V.length - 1) % V.length], n = V[(i + 1) % V.length];
    const f = i % 2 ? 0.16 : 0.22;
    const A = p.clone().lerp(q, f), B = p.clone().lerp(n, f);
    if (i === 0) s.moveTo(A.x, A.y); else s.lineTo(A.x, A.y);
    s.quadraticCurveTo(p.x, p.y, B.x, B.y);
  }
  s.closePath();
  if (holeRadius > 0) { const h = new THREE.Path(); h.absarc(0, 0, holeRadius, 0, TAU, true); s.holes.push(h); }
  const bev = thickness * 0.3;
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, thickness - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.75, bevelSegments: 4, curveSegments: 10 });
  g.translate(0, 0, -(thickness - bev * 2) / 2);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)) / outerRadius; p.setZ(i, p.getZ(i) * (1 + 0.16 * (1 - r))); }
  return done(smoothExtrude(g));
}

// ------------------------------------------------------------------ 4. farfalle (bow ties)
export function farfalle({ width = 0.7, height = 0.42, thickness = 0.02, nu = 18, nv = 8 } = {}) {
  const hw = width / 2, hh = height / 2;
  const tri = (x) => Math.abs(((x % 2) + 2) % 2 - 1); // 0..1 triangle wave
  const surf = (u, v) => {
    const au = Math.abs(u);
    const pinch = 0.4 + 0.6 * smoothstep(0, 0.6, au);
    let x = u * hw;
    const pink = 0.055 * hw * tri(v * 4.5 + 0.5) * smoothstep(0.85, 1, au);
    x -= Math.sign(u) * pink;
    const y = v * hh * pinch * (1 + 0.04 * Math.sin(v * 9) * smoothstep(0.2, 0, au));
    let z = 0.11 * width * u * u;                                  // wings curve up
    z += 0.035 * width * Math.sin(v * Math.PI * 1.6 + u * 2.4) * au; // gentle ripple
    z += 0.05 * width * Math.exp(-u * u / 0.012);                   // raised knot
    z += 0.018 * width * Math.sin(v * 10) * Math.exp(-u * u / 0.02); // pleats in the knot
    return [x, y, z];
  };
  const th = (u) => thickness * (1 + 1.4 * Math.exp(-u * u / 0.015));
  const top = grid(nv + 1, nu + 1, (j, i) => { const u = (i / nu) * 2 - 1, v = (j / nv) * 2 - 1; const [x, y, z] = surf(u, v); return [x, y, z + th(u) / 2, x, y]; }, { ref: () => [0, 0, 1] });
  const bot = grid(nv + 1, nu + 1, (j, i) => { const u = (i / nu) * 2 - 1, v = (j / nv) * 2 - 1; const [x, y, z] = surf(u, v); return [x, y, z - th(u) / 2, x, y]; }, { ref: () => [0, 0, -1] });
  // edge band around the outline
  const ring = [];
  for (let i = 0; i <= nu; i++) ring.push([(i / nu) * 2 - 1, -1]);
  for (let j = 1; j <= nv; j++) ring.push([1, (j / nv) * 2 - 1]);
  for (let i = nu - 1; i >= 0; i--) ring.push([(i / nu) * 2 - 1, 1]);
  for (let j = nv - 1; j >= 1; j--) ring.push([-1, (j / nv) * 2 - 1]);
  const edge = grid(2, ring.length, (r, k) => { const [u, v] = ring[k]; const [x, y, z] = surf(u, v); return [x, y, z + (r ? 1 : -1) * th(u) / 2, k * 0.03, r * thickness]; },
    { closed: true, ref: (r, k) => { const [u, v] = ring[k]; return [u, v * 2, 0]; } });
  const g = merge([top, bot, edge]);
  return withAttr(g, 'aWing', (x) => clamp(x / hw, -1, 1));
}

// ------------------------------------------------------------------ 5. cavatappi (springs)
export function cavatappi({ coilRadius = 0.62, tubeRadius = 0.2, height = 1.5, turns = 3.2, ridges = 10, wall = 0.05, perTurn = 28, cols = 36 } = {}) {
  const P = [];
  const n = Math.round(turns * perTurn);
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * TAU;
    P.push(new V3(Math.cos(a) * coilRadius, tubeRadius + t * (height - tubeRadius * 2), Math.sin(a) * coilRadius));
  }
  const outerP = (i, a) => { const r = tubeRadius * (1 - 0.06 * (0.5 - 0.5 * Math.cos(a * ridges))); return [Math.cos(a) * r, Math.sin(a) * r]; };
  const innerP = (i, a) => { const r = tubeRadius - wall; return [Math.cos(a) * r, Math.sin(a) * r]; };
  const out = sweep(P, cols, outerP);
  const inn = sweep(P, 18, innerP, { inward: true });
  const F = out.userData.frames;
  // end rings need matching counts: resample the inner ring at the outer's column count
  const endRing = (i, dir) => {
    const o = ringAt(out, i, cols);
    const c = P[i], N = F.N[i], B = F.B[i];
    const q = []; for (let j = 0; j < cols; j++) { const a = (j / cols) * TAU, [x, y] = innerP(i, a); q.push(new V3(c.x + N.x * x + B.x * y, c.y + N.y * x + B.y * y, c.z + N.z * x + B.z * y)); }
    return ringStrip(o, q, F.T[i].clone().multiplyScalar(dir));
  };
  return merge([out, inn, endRing(0, -1), endRing(P.length - 1, 1)]);
}

// ------------------------------------------------------------------ 6. the giant rigatoni
export function rigatoniTower({ innerRadius = 1.9, outerRadius = 2.5, height = 12, ridges = 30, notch = { angle: Math.PI / 2, halfWidth: 0.42, height: 2.6 } } = {}) {
  const cols = Math.max(120, ridges * 8), rows = 34;
  const nA = notch?.angle ?? 0, nH = notch?.halfWidth ?? 0, nY = notch?.height ?? 0;
  const jamb = nY * 0.72;
  const baseY = (a) => {
    if (!notch) return 0;
    const d = Math.abs(Math.atan2(Math.sin(a - nA), Math.cos(a - nA)));
    if (d > nH) return 0;
    return jamb + (nY - jamb) * Math.cos((d / nH) * Math.PI / 2); // arched top
  };
  const lean = 0.012 * outerRadius, oval = 0.012;
  const place = (a, y, r) => {
    const rr = r * (1 + oval * Math.cos(2 * a));
    return [Math.cos(a) * rr + lean * (y / height), y, Math.sin(a) * rr];
  };
  // columns snapped so the notch edges land on columns
  const angles = [];
  for (let j = 0; j < cols; j++) angles.push((j / cols) * TAU);
  const ridge = (a) => 0.5 - 0.5 * Math.cos(a * ridges);
  const surf = (r0, isOuter) => grid(rows, cols, (i, j, seam) => {
    const a = seam ? TAU : angles[j];
    const y0 = baseY(a), y = lerp(y0, height, i / (rows - 1));
    const r = isOuter ? r0 - 0.018 * r0 * ridge(a) : r0;
    const p = place(a, y, r);
    return [p[0], p[1], p[2], y, a * r0];
  }, { closed: true, ref: (i, j) => { const a = angles[j]; return isOuter ? [Math.cos(a), 0, Math.sin(a)] : [-Math.cos(a), 0, -Math.sin(a)]; } });
  const outer = surf(outerRadius, true), inner = surf(innerRadius, false);
  // bottom edge (follows the arch through the doorway) and the top rim
  const edgeRing = (isTop) => {
    const o = [], q = [];
    for (let j = 0; j < cols; j++) {
      const a = angles[j], y = isTop ? height : baseY(a);
      o.push(new V3(...place(a, y, outerRadius - 0.018 * outerRadius * ridge(a))));
      q.push(new V3(...place(a, y, innerRadius)));
    }
    return ringStrip(o, q, new V3(0, isTop ? 1 : -1, 0));
  };
  const g = merge([outer, inner, edgeRing(false), edgeRing(true)]);
  g.userData = { innerRadius, outerRadius, height, notch: notch ? { angle: nA, halfWidth: nH, height: nY } : null };
  return g;
}

// ------------------------------------------------------------------ 7. penne (quills)
export function penne({ radius = 0.09, length = 0.55, wall = 0.018, ridges = 14, rows = 10, cols = 32 } = {}) {
  const k = 1.0; // 45-degree cut
  const ro = (a) => radius * (1 - 0.05 * (0.5 - 0.5 * Math.cos(a * ridges)));
  const at = (r, rf) => (i, j, seam) => {
    const a = seam ? TAU : (j / cols) * TAU, rad = rf(a);
    const y = Math.cos(a) * rad, z = Math.sin(a) * rad;
    const x0 = -length / 2 + k * z, x1 = length / 2 + k * z;
    const x = lerp(x0, x1, i / (rows - 1));
    return [x, y, z, x, a * radius];
  };
  const outer = grid(rows, cols, at(radius, ro), { closed: true, ref: (i, j) => { const a = (j / cols) * TAU; return [0, Math.cos(a), Math.sin(a)]; } });
  const inner = grid(rows, cols, at(radius - wall, () => radius - wall), { closed: true, ref: (i, j) => { const a = (j / cols) * TAU; return [0, -Math.cos(a), -Math.sin(a)]; } });
  const ends = [-1, 1].map((s) => {
    const o = [], q = [];
    for (let j = 0; j < cols; j++) {
      const a = (j / cols) * TAU, r1 = ro(a), r2 = radius - wall;
      o.push(new V3(s * length / 2 + k * Math.sin(a) * r1, Math.cos(a) * r1, Math.sin(a) * r1));
      q.push(new V3(s * length / 2 + k * Math.sin(a) * r2, Math.cos(a) * r2, Math.sin(a) * r2));
    }
    return ringStrip(o, q, new V3(s, 0, -s * k).normalize());
  });
  return merge([outer, inner, ...ends]);
}

// ------------------------------------------------------------------ 8. lumache (snail shells)
export function lumache({ size = 0.6, rows = 30, cols = 28 } = {}) {
  const rm = 0.42 * size, Rp = 0.36 * size, span = 1.18 * Math.PI;
  const P = [];
  for (let i = 0; i < rows; i++) {
    const th = (i / (rows - 1)) * span;
    P.push(new V3(0, Rp * (1 - Math.cos(th)) + rm, -Rp * Math.sin(th) * 1.15));
  }
  const rad = (t) => lerp(rm, rm * 0.24, Math.pow(t, 0.8));
  const flat = (t) => 1 - 0.75 * smoothstep(0.8, 1.0, t);          // pinched closed at the narrow end
  const outerP = (i, a, t) => { const r = rad(t) * (1 - 0.05 * (0.5 - 0.5 * Math.cos(a * 16))); return [Math.cos(a) * r, Math.sin(a) * r * flat(t)]; };
  const innerP = (i, a, t) => { const r = Math.max(0.002, rad(t) - 0.06 * size); return [Math.cos(a) * r, Math.sin(a) * r * flat(t)]; };
  const out = sweep(P, cols, outerP);
  const inn = sweep(P, cols, innerP, { inward: true });
  const F = out.userData.frames;
  const mouthO = ringAt(out, 0, cols), mouthI = ringAt(inn, 0, cols);
  const mouth = ringStrip(mouthO, mouthI, F.T[0].clone().negate());
  const tip = cap(P, F, P.length - 1, cols, outerP, 1);
  return merge([out, inn, mouth, tip]);
}

// ------------------------------------------------------------------ 9. campanella (bellflower)
export function campanella({ size = 0.35, rows = 7, cols = 21, waves = 7 } = {}) {
  const th = size * 0.04;
  const r = (t, a) => {
    let rr = size * (0.05 + 0.37 * Math.pow(t, 1.7));
    const ruf = smoothstep(0.62, 1.0, t);
    rr *= 1 + 0.13 * Math.sin(a * waves) * ruf;
    return rr;
  };
  const y = (t, a) => t * size + smoothstep(0.75, 1.0, t) * Math.cos(a * waves) * size * 0.05 - smoothstep(0.85, 1, t) * size * 0.03;
  const curlOut = (t) => smoothstep(0.82, 1.0, t) * size * 0.06;
  const make = (inner) => grid(rows, cols, (i, j, seam) => {
    const t = i / (rows - 1), a = seam ? TAU : (j / cols) * TAU;
    const rr = r(t, a) + curlOut(t) - (inner ? th : 0);
    return [Math.cos(a) * rr, y(t, a), Math.sin(a) * rr, t * size, a * rr];
  }, { closed: true, ref: (i, j) => { const a = (j / cols) * TAU; const s = inner ? -1 : 1; return [Math.cos(a) * s, 0, Math.sin(a) * s]; } });
  const o = make(false), q = make(true);
  const rimO = ringAt(o, rows - 1, cols), rimI = ringAt(q, rows - 1, cols);
  const rim = ringStrip(rimO, rimI, new V3(0, 1, 0));
  return merge([o, q, rim]);
}

// ------------------------------------------------------------------ 10. nido (tagliatelle nest)
export function nido({ radius = 1.6, height = 0.8, ribbons = 26, ribbonWidth = 0.12, ribbonThickness = 0.02, seed = 1 } = {}) {
  const rnd = mulberry32(seed);
  const parts = [];
  const hw = ribbonWidth / 2, ht = ribbonThickness / 2;
  // a flat ribbon section: rounded rectangle, 8 points
  const sect = (a) => { const c = Math.cos(a), s = Math.sin(a); const k = 0.35; const x = Math.sign(c) * Math.pow(Math.abs(c), k) * ht, y = Math.sign(s) * Math.pow(Math.abs(s), k) * hw; return [x, y]; };
  for (let r = 0; r < ribbons; r++) {
    const turns = 1.1 + rnd() * 0.8, base = rnd() * TAU;
    const rr = radius * (0.6 + rnd() * 0.38), yy = height * (0.12 + rnd() * 0.62);
    const wob = 0.08 + rnd() * 0.12, wf = 2 + Math.floor(rnd() * 3), tilt = (rnd() - 0.5) * 0.6;
    const n = Math.round(turns * 40);
    const P = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = base + t * turns * TAU;
      const R = rr * (1 + wob * Math.sin(a * wf + r)) * (1 - 0.15 * Math.sin(t * Math.PI));
      P.push(new V3(Math.cos(a) * R, yy + Math.sin(a * wf * 0.5 + r) * height * 0.18 + tilt * Math.cos(a) * height * 0.3, Math.sin(a) * R));
    }
    const g = sweep(P, 8, (i, a) => sect(a));
    constAttr(g, 'aShade', rnd());
    parts.push(g);
  }
  return merge(parts);
}

// ------------------------------------------------------------------ 11. rod bundle (dry spaghetti trunk / pillar)
export function rodBundle({ count = 40, length = 6, rodRadius = 0.035, bundleRadius = 0.45, twist = 0.6, flareBottom = 0.5, flareTop = 0.9, seed = 1, radialSegments = 6 } = {}) {
  const rnd = mulberry32(seed);
  const parts = [];
  for (let k = 0; k < count; k++) {
    const r = Math.sqrt((k + 0.5) / count) * bundleRadius * (0.92 + rnd() * 0.08), a0 = k * 2.39996 + rnd() * 0.3;
    const y0 = -rnd() * 0.04 * length, y1 = length * (0.94 + rnd() * 0.08);
    const P = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n, y = lerp(y0, y1, t);
      const fl = 1 + flareBottom * Math.pow(1 - t, 4) * (0.6 + rnd() * 0.8) + flareTop * Math.pow(t, 4) * (0.6 + rnd() * 0.8);
      const a = a0 + twist * t;
      P.push(new V3(Math.cos(a) * r * fl, y, Math.sin(a) * r * fl));
    }
    const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
    const pts = curve.getSpacedPoints(10);
    const prof = (i, a) => [Math.cos(a) * rodRadius, Math.sin(a) * rodRadius];
    const body = sweep(pts, radialSegments, prof);
    const F = body.userData.frames;
    const g = merge([body, cap(pts, F, 0, radialSegments, prof, -1), cap(pts, F, pts.length - 1, radialSegments, prof, 1)]);
    constAttr(g, 'aShade', rnd());
    withAttr(g, 'aHang', (x, y) => clamp(y / length, 0, 1));
    parts.push(g);
  }
  return merge(parts);
}

// ------------------------------------------------------------------ 12. willow canopy (cooked strands hanging)
export function willowCanopy({ count = 180, topRadius = 0.5, spread = 2.6, length = 4.2, strandRadius = 0.03, seed = 1, radialSegments = 4 } = {}) {
  const rnd = mulberry32(seed);
  const parts = [];
  for (let k = 0; k < count; k++) {
    const a = k * 2.39996 + rnd() * 0.4, dx = Math.cos(a), dz = Math.sin(a);
    const r0 = topRadius * Math.sqrt(rnd());
    const reach = spread * (0.45 + 0.55 * Math.pow(rnd(), 0.6));
    const drop = length * (0.45 + 0.55 * rnd());
    const up = 0.12 + rnd() * 0.3;
    const pts = [
      new V3(dx * r0, rnd() * 0.08, dz * r0),
      new V3(dx * (r0 + reach * 0.45), up, dz * (r0 + reach * 0.45)),
      new V3(dx * (r0 + reach * 0.85), -drop * 0.18, dz * (r0 + reach * 0.85)),
      new V3(dx * (r0 + reach * 0.97) + (rnd() - 0.5) * 0.08, -drop * 0.55, dz * (r0 + reach * 0.97) + (rnd() - 0.5) * 0.08),
      new V3(dx * (r0 + reach * 0.95) + (rnd() - 0.5) * 0.1, -drop, dz * (r0 + reach * 0.95) + (rnd() - 0.5) * 0.1),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const P = curve.getSpacedPoints(11);
    // cooked noodles are never straight: a soft wave grows toward the tip
    const wf = 5 + rnd() * 6, wp = rnd() * TAU, wa = 0.035 + rnd() * 0.05;
    for (let i = 0; i < P.length; i++) { const t = i / (P.length - 1), w = Math.sin(t * wf + wp) * wa * t; P[i].x += -dz * w; P[i].z += dx * w; }
    const g = sweep(P, radialSegments, (i, aa, t) => { const r = strandRadius * (1 - 0.15 * t); return [Math.cos(aa) * r, Math.sin(aa) * r]; });
    constAttr(g, 'aShade', rnd());
    const nrows = P.length, C = radialSegments + 1;
    withAttr(g, 'aHang', (x, y, z, i) => Math.floor(i / C) / (nrows - 1));
    parts.push(g);
  }
  return merge(parts);
}

// ------------------------------------------------------------------ 13. grass tuft (capellini): thin strips, drawn double-sided
export function grassTuft({ strands = 7, height = 0.45, radius = 0.012, spread = 0.12, seed = 1 } = {}) {
  const rnd = mulberry32(seed);
  const pos = [], nor = [], uv = [], hang = [], idx = [];
  for (let s = 0; s < strands; s++) {
    const a = rnd() * TAU, lean = spread * (0.4 + rnd() * 0.8), h = height * (0.7 + rnd() * 0.45);
    const bx = Math.cos(a) * 0.02 * rnd(), bz = Math.sin(a) * 0.02 * rnd();
    const side = new V3(-Math.sin(a), 0, Math.cos(a));
    const base = pos.length / 3;
    const rows = 4;
    for (let i = 0; i < rows; i++) {
      const t = i / (rows - 1);
      const x = bx + Math.cos(a) * lean * t * t, y = h * t, z = bz + Math.sin(a) * lean * t * t;
      const w = radius * (1 - 0.3 * t);
      for (const sgn of [-1, 1]) {
        pos.push(x + side.x * w * sgn, y, z + side.z * w * sgn);
        // fake round: normals tilt toward each side
        const out = new V3(Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3).addScaledVector(side, sgn).normalize();
        nor.push(out.x, out.y, out.z);
        uv.push(y, (sgn + 1) * radius);
        hang.push(t);
      }
    }
    for (let i = 0; i < rows - 1; i++) { const a0 = base + i * 2; idx.push(a0, a0 + 1, a0 + 3, a0, a0 + 3, a0 + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aHang', new THREE.Float32BufferAttribute(hang, 1));
  g.setIndex(idx);
  return done(g);
}

// ------------------------------------------------------------------ 14. lasagna riccia (sheet with ruffled long edges)
export function lasagnaRiccia({ width = 1.2, length = 3.0, thickness = 0.05, ruffleAmp = 0.06, ruffleWaves = 14, ruffleWidth = 0.18 } = {}) {
  const nu = 14, nv = Math.max(20, ruffleWaves * 4);
  const surf = (u, v) => {
    const x = u * width / 2, z = v * length / 2;
    const e = smoothstep(width / 2 - ruffleWidth, width / 2, Math.abs(x));
    const y = Math.sin((v + 1) * Math.PI * ruffleWaves / 2 + (u > 0 ? 1 : 0)) * ruffleAmp * e;
    return [x, y, z];
  };
  const top = grid(nv + 1, nu + 1, (j, i) => { const u = (i / nu) * 2 - 1, v = (j / nv) * 2 - 1; const [x, y, z] = surf(u, v); return [x, y + thickness / 2, z, x, z]; }, { ref: () => [0, 1, 0] });
  const bot = grid(nv + 1, nu + 1, (j, i) => { const u = (i / nu) * 2 - 1, v = (j / nv) * 2 - 1; const [x, y, z] = surf(u, v); return [x, y - thickness / 2, z, x, z]; }, { ref: () => [0, -1, 0] });
  return merge([top, bot]);
}
