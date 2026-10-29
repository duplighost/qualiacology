import * as THREE from '../vendor/three.module.js';

const TAU = Math.PI * 2;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function rng(seed = 8741) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// Tubes, ridged sheets and open penne ends are real geometry. Batching all
// static noodles of a given ingredient keeps the harbor's draw count modest.
class Batch {
  constructor(material) { this.material = material; this.p = []; this.n = []; this.uv = []; this.i = []; }
  vertex(p, n, u, v) { const index = this.p.length / 3; this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(u, v); return index; }
  tube(points, radius = .10, sides = 6) {
    if (points.length < 2) return;
    const base = this.p.length / 3, tangent = vec(), side = vec(), binormal = vec(), axis = vec();
    let distance = 0;
    for (let j = 0; j < points.length; j++) {
      tangent.subVectors(points[Math.min(points.length - 1, j + 1)], points[Math.max(0, j - 1)]).normalize();
      axis.set(Math.abs(tangent.y) > .94 ? 1 : 0, Math.abs(tangent.y) > .94 ? 0 : 1, 0);
      side.crossVectors(tangent, axis).normalize(); binormal.crossVectors(tangent, side).normalize();
      if (j) distance += points[j].distanceTo(points[j - 1]);
      for (let k = 0; k <= sides; k++) {
        const a = k / sides * TAU, normal = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(binormal, Math.sin(a));
        this.vertex(points[j].clone().addScaledVector(normal, radius), normal, distance * .8, k / sides);
      }
    }
    for (let j = 0; j < points.length - 1; j++) for (let k = 0; k < sides; k++) {
      const a = base + j * (sides + 1) + k, b = a + sides + 1;
      this.i.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  sheet(rows, cols, fn, flip = false) {
    const base = this.p.length / 3;
    for (let j = 0; j <= rows; j++) for (let k = 0; k <= cols; k++) {
      const u = k / cols, v = j / rows, d = .001, p = fn(u, v);
      const du = fn(clamp(u + d), v).sub(fn(clamp(u - d), v)), dv = fn(u, clamp(v + d)).sub(fn(u, clamp(v - d)));
      const n = du.cross(dv).normalize(); if (flip) n.negate();
      this.vertex(p, n, u * 5, v * 5);
    }
    for (let j = 0; j < rows; j++) for (let k = 0; k < cols; k++) {
      const a = base + j * (cols + 1) + k, b = a + cols + 1;
      if (flip) this.i.push(a, b, a + 1, a + 1, b, b + 1); else this.i.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  finish(parent, name, shadow = true) {
    if (!this.p.length) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); geometry.setIndex(this.i); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, this.material); mesh.name = name; mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh);
    this.p = this.n = this.uv = this.i = null; return mesh;
  }
}
function line(a, b, segments = 12, wiggle = .018, phase = 0) {
  const points = [];
  for (let j = 0; j <= segments; j++) { const t = j / segments; points.push(vec(mix(a.x, b.x, t) + Math.sin(t * 13 + phase) * wiggle, mix(a.y, b.y, t) + Math.sin(t * 9 + phase) * wiggle, mix(a.z, b.z, t) + Math.cos(t * 11 + phase) * wiggle)); }
  return points;
}
function ellipse(x, y, z, rx, rz, count = 32, wave = .02) {
  return Array.from({ length: count + 1 }, (_, j) => { const a = j / count * TAU; return vec(x + Math.cos(a) * rx, y + Math.sin(a * 7) * wave, z + Math.sin(a) * rz); });
}
function segmentInfo(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, lengthSq = dx * dx + dz * dz;
  const u = ((x - a.x) * dx + (z - a.z) * dz) / lengthSq;
  const lateral = ((x - a.x) * -dz + (z - a.z) * dx) / Math.sqrt(lengthSq);
  return { u, lateral };
}
function shuttle(time, period = 14) {
  const u = ((time % period) + period) % period / period;
  if (u < .17) return 0;
  if (u < .45) return smooth((u - .17) / .28);
  if (u < .64) return 1;
  if (u < .93) return 1 - smooth((u - .64) / .29);
  return 0;
}

export function createRiccoWorld(scene, materials) {
  const random = rng(), group = new THREE.Group(); group.name = 'Ricco Harbor — pasta port'; scene.add(group);
  const names = ['egg', 'cream', 'tomato', 'spinach', 'ink', 'blue', 'gold', 'toasted'];
  const b = Object.fromEntries(names.map(key => [key, new Batch(materials[key] || materials.egg)]));
  const ocean = new Batch(materials.lake || materials.blue), pale = new Batch(materials.pale || materials.cream);
  const supports = [], colliders = [], platforms = [], spinning = [], pads = [], gates = [];
  const bounds = { x0: -56, x1: 60, z0: -56, z1: 48 };
  let elapsed = 0, submarineRaised = false, fanCharge = 0, playerLocation = vec(-42, 2, 37), phase = 'dock';
  const fanPosition = vec(14, 5.5, -19), padDuration = 24;
  const lastSpray = { fan: -99, gate: -99 };
  const tmp = vec(), direction = vec(), midpoint = vec(), up = vec(0, 1, 0), dummy = new THREE.Object3D();

  function addRect(x, z, w, d, y, kind = 'deck') { const s = { type: 'rect', x, z, hw: w / 2, hd: d / 2, y, kind }; supports.push(s); return s; }
  function addRamp(a, c, width, kind = 'ramp') { const s = { type: 'ramp', a, b: c, width, kind }; supports.push(s); return s; }
  function staticHeight(x, z) {
    let height = -.9;
    for (const s of supports) {
      if (s.type === 'rect') { if (Math.abs(x - s.x) <= s.hw && Math.abs(z - s.z) <= s.hd) height = Math.max(height, s.y); }
      else {
        const hit = segmentInfo(x, z, s.a, s.b);
        if (hit.u >= 0 && hit.u <= 1 && Math.abs(hit.lateral) <= s.width / 2) height = Math.max(height, mix(s.a.y, s.b.y, hit.u));
      }
    }
    return height;
  }
  function platformContains(p, x, z, previous = false, padding = 0) {
    const pos = previous ? p.previous : p.position;
    if (p.oriented) {
      const dx = x - pos.x, dz = z - pos.z;
      return Math.abs(dx * p.dirX + dz * p.dirZ) <= p.halfLength + padding && Math.abs(-dx * p.dirZ + dz * p.dirX) <= p.halfWidth + padding;
    }
    return Math.abs(x - pos.x) <= p.hw + padding && Math.abs(z - pos.z) <= p.hd + padding;
  }
  function heightAt(x, z) {
    let height = staticHeight(x, z);
    for (const p of platforms) if (p.active && platformContains(p, x, z)) height = Math.max(height, p.position.y);
    for (const p of pads) if (p.timer > 0 && p.flatten > .65 && Math.hypot(x - p.x, z - p.z) <= 1.24) height = Math.max(height, 4.5);
    return height;
  }
  function surfaceAt(x, z) { return heightAt(x, z) > -.2 ? 'ground' : 'water'; }
  function platformMotionAt(x, z, y) {
    for (const p of platforms) {
      if (!p.active || Math.abs(y - p.previous.y) > .44 || !platformContains(p, x, z, true, .13)) continue;
      return { x: p.position.x - p.previous.x, y: p.position.y - p.previous.y, z: p.position.z - p.previous.z };
    }
    return null;
  }
  function refillAt(x, z, y = 0) {
    return (Math.hypot(x - 39, z + 34) < 2.55 && y > 6.8) || (Math.hypot(x + 47, z - 35) < 2 && y < 4.2);
  }
  function inkAt(x, z) { return ((x - 34) / 13) ** 2 + ((z + 26) / 7) ** 2 < 1 && surfaceAt(x, z) === 'water'; }

  function deck(x, z, w, d, y, ingredient = 'egg', options = {}) {
    const batch = b[ingredient] || b.egg, spacing = options.spacing || .29;
    if (options.support !== false) addRect(x, z, w, d, y, options.kind || 'deck');
    // The substrate is a corrugated lasagna sheet, visibly edged by noodle strata.
    batch.sheet(Math.max(2, Math.round(d / 1.6)), Math.max(2, Math.round(w / .5)), (u, v) => vec(x - w / 2 + u * w, y - .21 + Math.sin(u * Math.PI * Math.ceil(w * 3)) * .035, z - d / 2 + v * d), true);
    for (let zz = z - d / 2 + .1, row = 0; zz <= z + d / 2; zz += spacing, row++) {
      const pts = [];
      for (let j = 0, count = Math.max(2, Math.ceil(w / 1.0)); j <= count; j++) { const t = j / count; pts.push(vec(x - w / 2 + t * w, y - .115 + Math.sin(t * 9 + row) * .015, zz + Math.sin(t * 11 + row) * .025)); }
      batch.tube(pts, .12, 6);
    }
    if (options.edges !== false) for (let k = 0; k < 4; k++) {
      const yy = y - .12 - k * .23;
      b.toasted.tube([vec(x - w / 2, yy, z - d / 2), vec(x + w / 2, yy, z - d / 2), vec(x + w / 2, yy, z + d / 2), vec(x - w / 2, yy, z + d / 2), vec(x - w / 2, yy, z - d / 2)], .13, 6);
    }
  }
  function ramp(a, c, width, ingredient = 'egg', grid = false) {
    addRamp(a, c, width, grid ? 'mesh-ramp' : 'pasta-ramp');
    const dx = c.x - a.x, dz = c.z - a.z, length = Math.hypot(dx, dz), nx = -dz / length, nz = dx / length;
    const spacing = grid ? .52 : .24, radius = grid ? .075 : .125;
    for (let offset = -width / 2; offset <= width / 2 + .01; offset += spacing) {
      const pts = [];
      for (let j = 0, count = Math.ceil(length / .55); j <= count; j++) { const t = j / count; pts.push(vec(mix(a.x, c.x, t) + nx * offset, mix(a.y, c.y, t) - radius, mix(a.z, c.z, t) + nz * offset)); }
      b[ingredient].tube(pts, radius, 6);
    }
    if (grid) for (let u = 0; u <= 1; u += .52 / length) {
      const x = mix(a.x, c.x, u), y = mix(a.y, c.y, u) - .06, z = mix(a.z, c.z, u);
      b[ingredient].tube([vec(x - nx * width / 2, y, z - nz * width / 2), vec(x + nx * width / 2, y, z + nz * width / 2)], .075, 6);
    }
    for (const side of [-1, 1]) b.toasted.tube(line(vec(a.x + nx * width / 2 * side, a.y - .14, a.z + nz * width / 2 * side), vec(c.x + nx * width / 2 * side, c.y - .14, c.z + nz * width / 2 * side), 24, .015), .13, 6);
  }
  function meshDeck(x, z, w, d, y, ingredient = 'egg', supported = true) {
    if (supported) addRect(x, z, w, d, y, 'mesh');
    for (let xx = x - w / 2; xx <= x + w / 2 + .01; xx += .50) b[ingredient].tube(line(vec(xx, y - .075, z - d / 2), vec(xx, y - .075, z + d / 2), Math.ceil(d / .7), .014, xx), .075, 6);
    for (let zz = z - d / 2; zz <= z + d / 2 + .01; zz += .50) b[ingredient].tube(line(vec(x - w / 2, y - .075, zz), vec(x + w / 2, y - .075, zz), Math.ceil(w / .7), .014, zz), .075, 6);
    b.toasted.tube([vec(x - w / 2, y - .10, z - d / 2), vec(x + w / 2, y - .10, z - d / 2), vec(x + w / 2, y - .10, z + d / 2), vec(x - w / 2, y - .10, z + d / 2), vec(x - w / 2, y - .10, z - d / 2)], .15, 7);
  }
  function post(x, z, base, height, radius = .25, ingredient = 'toasted') {
    for (let strand = 0; strand < 5; strand++) {
      const pts = [], phase = strand / 5 * TAU;
      for (let j = 0; j <= 18; j++) { const t = j / 18, a = t * TAU * 1.7 + phase; pts.push(vec(x + Math.cos(a) * radius * .62, base + t * height, z + Math.sin(a) * radius * .62)); }
      b[ingredient].tube(pts, radius * .35, 6);
    }
  }
  function braided(a, c, sag = .3, radius = .065, ingredient = 'egg') {
    for (let strand = 0; strand < 3; strand++) {
      const pts = [];
      for (let j = 0; j <= 32; j++) { const t = j / 32, a1 = t * TAU * 6 + strand / 3 * TAU; pts.push(vec(mix(a.x, c.x, t) + Math.cos(a1) * .055, mix(a.y, c.y, t) - Math.sin(t * Math.PI) * sag + Math.sin(a1) * .055, mix(a.z, c.z, t))); }
      b[ingredient].tube(pts, radius, 5);
    }
  }
  function railing(a, c, y, ingredient = 'egg') {
    const length = Math.hypot(c.x - a.x, c.z - a.z);
    for (let j = 0, count = Math.ceil(length / 2.2); j <= count; j++) { const t = j / count; post(mix(a.x, c.x, t), mix(a.z, c.z, t), y, 1.05, .14, ingredient); }
    braided(vec(a.x, y + .95, a.z), vec(c.x, y + .95, c.z), .10, .065, ingredient);
  }
  function container(x, z, w, d, base, h, colour = 'tomato', solid = true) {
    // Closely packed hollow rigatoni form corrugated cargo walls.
    for (let xx = x - w / 2; xx <= x + w / 2; xx += .25) for (const side of [-1, 1]) b[colour].tube([vec(xx, base, z + side * d / 2), vec(xx, base + h, z + side * d / 2)], .145, 7);
    for (let zz = z - d / 2; zz <= z + d / 2; zz += .25) for (const side of [-1, 1]) b[colour].tube([vec(x + side * w / 2, base, zz), vec(x + side * w / 2, base + h, zz)], .145, 7);
    for (let zz = z - d / 2; zz <= z + d / 2; zz += .24) b[colour].tube([vec(x - w / 2, base + h, zz), vec(x + w / 2, base + h, zz)], .13, 6);
    for (const yy of [base + .1, base + h - .1]) b.egg.tube([vec(x - w / 2, yy, z - d / 2), vec(x + w / 2, yy, z - d / 2), vec(x + w / 2, yy, z + d / 2), vec(x - w / 2, yy, z + d / 2), vec(x - w / 2, yy, z - d / 2)], .11, 6);
    for (const sign of [-1, 1]) {
      b.toasted.tube([vec(x + sign * w * .24, base + .3, z + d / 2 + .16), vec(x + sign * w * .24, base + h - .3, z + d / 2 + .16)], .065, 6);
      b.cream.tube([vec(x + sign * w * .24 - .13, base + h * .45, z + d / 2 + .24), vec(x + sign * w * .24 + .13, base + h * .45, z + d / 2 + .24)], .07, 6);
    }
    if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: base, top: base + h + .13, kind: 'rigatoni-container' });
  }

  // The starting quay and a sheltered return slip provide a safe swimming loop.
  deck(-37, 36.5, 34, 19, 2, 'cream');
  deck(-50, 8, 8, 40, 2, 'cream');
  ramp(vec(-49, -.15, 21), vec(-49, 2, 27.8), 3.2, 'toasted');
  ramp(vec(-16, -.15, 26), vec(-23, 2, 30.2), 3.3, 'toasted');
  for (const [x, z] of [[-52, 44], [-48, 44], [-36, 44], [-22, 44], [-52, 31], [-51, -10], [-47, -10]]) post(x, z, -.8, 3.8, .34, 'toasted');
  railing({ x: -54, z: -12 }, { x: -54, z: 43 }, 2);
  railing({ x: -54, z: 46 }, { x: -21, z: 46 }, 2);
  [[-49, 39, 5, 3.2, 2, 2.6, 'tomato'], [-49, 39, 4.6, 3.1, 4.85, 2.4, 'gold'], [-27, 40, 5.4, 3.6, 2, 2.8, 'blue'], [-24.8, 34.5, 4.2, 3.2, 2, 2.6, 'tomato'], [-50, 1, 4.4, 3, 2, 2.5, 'blue'], [-50, -6, 4.4, 3, 2, 2.8, 'gold']].forEach(a => container(...a));

  // The first freighter has a curved lasagna hull, a woven deck and conspicuous
  // hollow penne smokestack; the intended route passes on its right.
  const shipX = -31.6, shipZ = 16.5;
  for (let layer = 0; layer < 22; layer++) {
    const yy = -.65 + layer * .165, width = 9.8 + layer * .055, depth = 10.7 + layer * .025, pts = [];
    for (let j = 0; j <= 80; j++) {
      const a = j / 80 * TAU, co = Math.cos(a), si = Math.sin(a);
      pts.push(vec(shipX + Math.sign(co) * Math.pow(Math.abs(co), .42) * width, yy + Math.sin(a * 8) * .025, shipZ + Math.sign(si) * Math.pow(Math.abs(si), .55) * depth));
    }
    b[layer > 17 ? 'gold' : 'tomato'].tube(pts, .13, 7);
  }
  deck(-31.5, 16.5, 21, 21, 3.2, 'egg', { edges: false });
  ramp(vec(-42, 2, 29), vec(-35, 3.2, 25), 3.6, 'egg');
  railing({ x: -41.7, z: 7 }, { x: -41.7, z: 23 }, 3.2);
  railing({ x: -40, z: 6.1 }, { x: -25.7, z: 6.1 }, 3.2);
  for (const [x, z, w, d, h, colour] of [[-38, 20, 4.0, 3.6, 2.4, 'blue'], [-29, 9.2, 4.4, 3.6, 2.4, 'gold'], [-39, 9, 3.0, 3.8, 2.8, 'tomato']]) container(x, z, w, d, 3.2, h, colour);
  for (let layer = 0; layer < 38; layer++) b[layer > 30 ? 'toasted' : 'cream'].tube(ellipse(-35, 3.2 + layer * .19, 13, 1.50, 1.5, 36), .12, 7);
  for (let k = 0; k < 8; k++) b.ink.tube(ellipse(-35, 9.3 + k * .16, 13, 1.33, 1.33, 32), .10, 6);
  for (let n = 0; n < 7; n++) {
    const pts = [];
    for (let j = 0; j <= 34; j++) { const t = j / 34, a = t * TAU * 1.3 + n; pts.push(vec(-35 + Math.cos(a) * (.6 + t * .7) + t * 2, 10.7 + t * 5.8, 13 + Math.sin(a) * (.6 + t * .6))); }
    b.ink.tube(pts, .065, 6);
  }
  colliders.push({ minX: -36.5, maxX: -33.5, minZ: 11.5, maxZ: 14.5, bottom: 3.2, top: 10.5, kind: 'penne-smokestack' });
  braided(vec(-43, 3.0, 24), vec(-48, 2.3, 29), .7, .09, 'toasted');
  braided(vec(-41, 3.0, 9), vec(-47, 2.3, 4), 1.0, .09, 'toasted');
  ramp(vec(-24, 3.2, 15.2), vec(-23, 4.2, 11.2), 3.0, 'egg', true);

  function truss(a, c, width = .8, ingredient = 'gold', segments = 8) {
    const axis = c.clone().sub(a).normalize(), normal = vec().crossVectors(axis, Math.abs(axis.y) > .9 ? vec(1, 0, 0) : vec(0, 1, 0)).normalize();
    const side = vec().crossVectors(axis, normal).normalize();
    const corners = [normal.clone().add(side), normal.clone().sub(side), normal.clone().negate().add(side), normal.clone().negate().sub(side)].map(v => v.multiplyScalar(width / 2));
    for (const v of corners) b[ingredient].tube(line(a.clone().add(v), c.clone().add(v), segments * 2, .012), .11, 7);
    for (let j = 0; j < segments; j++) {
      const start = a.clone().lerp(c, j / segments), end = a.clone().lerp(c, (j + 1) / segments);
      for (const pair of [[0, 1], [1, 3], [3, 2], [2, 0]]) {
        b[ingredient].tube([start.clone().add(corners[pair[j % 2]]), end.clone().add(corners[pair[1 - j % 2]])], .065, 5);
      }
    }
  }
  function craneTower(x, z, top, colour = 'gold') {
    for (const dx of [-1.25, 1.25]) for (const dz of [-1.25, 1.25]) truss(vec(x + dx, -.5, z + dz), vec(x + dx * .72, top, z + dz * .72), .55, colour, 8);
    for (let yy = 2; yy <= top; yy += 3) {
      b[colour].tube([vec(x - 1.4, yy, z - 1.4), vec(x + 1.4, yy, z - 1.4), vec(x + 1.4, yy, z + 1.4), vec(x - 1.4, yy, z + 1.4), vec(x - 1.4, yy, z - 1.4)], .10, 6);
    }
    for (let step = .1; step < top - 1; step += .45) b.cream.tube([vec(x - .3, step, z + 1.5), vec(x + .3, step, z + 1.5)], .055, 6);
    b.toasted.tube([vec(x - .36, -.2, z + 1.5), vec(x - .36, top - 1, z + 1.5)], .07, 6);
    b.toasted.tube([vec(x + .36, -.2, z + 1.5), vec(x + .36, top - 1, z + 1.5)], .07, 6);
  }
  function cargoPlatform(name, a, c, y, width, depth, period, colour = 'egg', elevator = false) {
    const object = new THREE.Group(); object.name = name; group.add(object);
    const mat = materials[colour] || materials.egg, batch = new Batch(mat), edge = new Batch(materials.toasted);
    for (let z = -depth / 2; z <= depth / 2 + .01; z += .25) batch.tube(line(vec(-width / 2, -.12, z), vec(width / 2, -.12, z), 12, .015, z), .12, 6);
    for (const z of [-depth / 2, depth / 2]) edge.tube([vec(-width / 2, -.30, z), vec(width / 2, -.30, z)], .16, 7);
    for (const x of [-width / 2, width / 2]) edge.tube([vec(x, -.30, -depth / 2), vec(x, -.30, depth / 2)], .16, 7);
    for (let x = -width / 2; x <= width / 2; x += .8) edge.tube([vec(x, -.29, -depth / 2), vec(x, -.29, depth / 2)], .09, 6);
    batch.finish(object, `${name} individual spaghetti deck`); edge.finish(object, `${name} noodle frame`);
    const p = { object, position: vec(a.x, y, a.z), previous: vec(a.x, y, a.z), a, b: c, baseY: y, hw: width / 2, hd: depth / 2, period, elevator, active: true, sway: vec(), swayV: vec(), ropeTop: elevator ? 17 : 17.5 };
    object.position.copy(p.position); platforms.push(p); return p;
  }
  craneTower(-17.5, 13.7, 17, 'gold');
  truss(vec(-24, 17.2, 11.6), vec(-12.8, 17.2, 4.3), .95, 'gold', 10);
  truss(vec(-18, 16, 13), vec(-16, 17.2, 6), .7, 'gold', 6);
  const crane1 = cargoPlatform('First suspended cargo platform', { x: -23, z: 11 }, { x: -14, z: 5 }, 4.2, 4.8, 4.6, 14, 'cream');

  // Walkable pasta mesh maze. Its openings remain visible, while the route uses
  // broad egg-noodle lattice strips rather than requiring a separate hanging mode.
  meshDeck(-11, 5, 8, 3.4, 4.2);
  meshDeck(-8, 1, 3.4, 8.2, 4.2);
  meshDeck(-4, -3, 8.1, 3.4, 4.2);
  meshDeck(0, -6, 3.4, 6.2, 4.2);
  meshDeck(2, -9, 4.6, 3.4, 4.2);
  // Optional loop and raised folding net create the characteristic tall cage.
  meshDeck(-13.5, -.3, 3, 7.2, 4.2);
  ramp(vec(-13.5, 4.2, -3.5), vec(-13.5, 5.5, -8), 3, 'cream', true);
  meshDeck(-8.5, -8, 10, 3, 5.5);
  ramp(vec(-3.5, 5.5, -8), vec(0, 4.2, -7), 3, 'cream', true);
  for (const x of [-15, 3]) for (const z of [-9.5, 10]) post(x, z, -.4, 9.4, .32, 'toasted');
  for (const x of [-15, 3]) {
    for (let yy = 4.7; yy <= 8.6; yy += .65) b.egg.tube([vec(x, yy, -9.5), vec(x, yy, 10)], .055, 5);
    for (let z = -9.5; z <= 10; z += .65) b.egg.tube([vec(x, 4.3, z), vec(x, 8.6, z)], .055, 5);
  }
  for (const z of [-9.5, 10]) for (let yy = 5.3; yy < 8.7; yy += .65) b.egg.tube([vec(-15, yy, z), vec(3, yy, z)], .055, 5);
  for (const z of [-9.5, 10]) b.toasted.tube([vec(-15, 8.8, z), vec(3, 8.8, z)], .16, 7);
  container(-10, .4, 4.6, 3, -.7, 2.3, 'tomato', false);
  container(-3, 5.7, 4, 3.6, -.8, 2.4, 'blue', false);
  function flipGate(x, z) {
    const object = new THREE.Group(); object.name = 'Contact and spray operated pasta flip gate'; object.position.set(x - 1.45, 4.2, z); group.add(object);
    const batch = new Batch(materials.gold);
    for (let xx = 0; xx <= 2.9; xx += .36) batch.tube([vec(xx, .2, 0), vec(xx, 2.55, 0)], .055, 6);
    for (let yy = .2; yy <= 2.55; yy += .36) batch.tube([vec(0, yy, 0), vec(2.9, yy, 0)], .055, 6);
    batch.tube([vec(0, .15, 0), vec(2.9, .15, 0), vec(2.9, 2.65, 0), vec(0, 2.65, 0), vec(0, .15, 0)], .11, 7);
    batch.finish(object, 'Golden spaghetti gate mesh'); gates.push({ object, x, z, openness: 0, velocity: 0, hold: 0 });
  }
  flipGate(-8, .4);
  deck(4, -9, 5.4, 5.2, 4.2, 'tomato');
  post(5.7, -10.8, -.6, 5.1, .28); post(2.2, -10.8, -.6, 5.1, .28);
  craneTower(7.5, -4.2, 17, 'gold');
  truss(vec(2.7, 17.2, -8.3), vec(14, 17.2, -14.6), .95, 'gold', 10);
  truss(vec(7.5, 16, -5), vec(9, 17.2, -12), .7, 'gold', 6);
  const crane2 = cargoPlatform('Second suspended cargo platform', { x: 4, z: -9 }, { x: 13, z: -14 }, 4.5, 4.8, 4.8, 15, 'cream');

  deck(13.7, -16, 7.2, 10, 4.5, 'egg');
  for (const [x, z] of [[10.4, -12], [17, -12], [10.4, -20], [17, -20]]) post(x, z, -.7, 5.5, .30);
  railing({ x: 10.2, z: -20.6 }, { x: 10.2, z: -12 }, 4.5);
  // A thick bucatini frame holds a small pasta fan directly in front of the
  // two inhabitants. It is the spray target for the shell submarine.
  post(14, -19, 4.5, 1.25, .20, 'toasted');
  const fan = new THREE.Group(); fan.name = 'Spray the pasta fan to raise submarine'; fan.position.copy(fanPosition); group.add(fan);
  const fanBatch = new Batch(materials.tomato), fanRim = new Batch(materials.egg);
  for (let arm = 0; arm < 6; arm++) {
    const a = arm / 6 * TAU;
    for (let strand = 0; strand < 3; strand++) {
      const pts = [];
      for (let j = 0; j <= 14; j++) { const t = j / 14, angle = a + t * .5; pts.push(vec(Math.cos(angle) * (.15 + t * .8), Math.sin(angle) * (.15 + t * .8), (strand - 1) * .09)); }
      fanBatch.tube(pts, .085, 6);
    }
  }
  for (let layer = 0; layer < 3; layer++) {
    const pts = [];
    for (let j = 0; j <= 48; j++) { const a = j / 48 * TAU; pts.push(vec(Math.cos(a) * 1.1, Math.sin(a) * 1.1, (layer - 1) * .13)); }
    fanRim.tube(pts, .075, 6);
  }
  fanBatch.finish(fan, 'Rotating edible fan blades'); fanRim.finish(group, 'unused');
  // The rim was built in fan-local coordinates; mount it separately so the
  // rotor may spin while the three bucatini guard rings stay still.
  const fanGuard = group.children[group.children.length - 1]; fanGuard.name = 'Pasta fan guard rings'; fanGuard.position.copy(fanPosition);

  const subObject = new THREE.Group(); subObject.name = 'Raising golden conchiglie submarine'; group.add(subObject);
  const subShell = new Batch(materials.gold), subFrame = new Batch(materials.toasted), subDeck = new Batch(materials.egg);
  const subDirection = vec(6, 0, -2).normalize(), subNormal = vec(-subDirection.z, 0, subDirection.x);
  const subTransform = (long, yy, wide) => vec(subDirection.x * long + subNormal.x * wide, yy, subDirection.z * long + subNormal.z * wide);
  for (let ridge = 0; ridge < 42; ridge++) {
    const long = -3.65 + ridge / 41 * 7.3, cross = Math.sqrt(Math.max(.05, 1 - (long / 3.9) ** 2));
    const pts = [];
    for (let j = 0; j <= 26; j++) { const a = j / 26 * TAU; pts.push(subTransform(long, -.82 + Math.sin(a) * .75 * cross, Math.cos(a) * 1.55 * cross)); }
    subShell.tube(pts, .11, 7);
  }
  for (let side = -.95; side <= .95; side += .20) {
    const pts = [];
    for (let j = 0; j <= 30; j++) pts.push(subTransform(-3.55 + j / 30 * 7.1, -.115, side));
    subDeck.tube(pts, .115, 6);
  }
  for (const side of [-1, 1]) subFrame.tube(line(subTransform(-3.4, -.15, side * 1.15), subTransform(3.4, -.15, side * 1.15), 24, .018), .12, 7);
  for (const long of [-2, 0, 2]) {
    const pts = [];
    for (let j = 0; j <= 20; j++) { const a = j / 20 * TAU; pts.push(subTransform(long + Math.cos(a) * .34, -.63 + Math.sin(a) * .34, 1.28)); }
    subFrame.tube(pts, .095, 7);
  }
  subShell.finish(subObject, 'Corrugated golden shell submarine hull'); subFrame.finish(subObject, 'Submarine bucatini portholes'); subDeck.finish(subObject, 'Submarine spaghetti walking surface');
  const submarine = { object: subObject, position: vec(20, -.65, -20), previous: vec(20, -.65, -20), active: true, oriented: true, dirX: subDirection.x, dirZ: subDirection.z, halfLength: 3.65, halfWidth: 1.2, raise: 0, raiseV: 0 };
  subObject.position.copy(submarine.position); platforms.push(submarine);
  braided(vec(17.2, 4.3, -19.2), vec(19, -.8, -20), .3, .07, 'toasted');

  function bloopad(x, z, index) {
    const object = new THREE.Group(); object.name = `Temporary pasta Bloopad ${index + 1}`; object.position.set(x, 4.5, z); group.add(object);
    const stalk = new Batch(materials.blue), head = new Batch(materials.pale || materials.cream);
    for (let strand = 0; strand < 7; strand++) {
      const pts = [];
      for (let j = 0; j <= 24; j++) { const t = j / 24, a = strand / 7 * TAU + t * TAU; pts.push(vec(Math.cos(a) * (.25 + t * .12), -4.2 + t * 3.9, Math.sin(a) * (.25 + t * .12))); }
      stalk.tube(pts, .065, 6);
    }
    for (let ring = 0; ring < 13; ring++) {
      const t = ring / 12, radius = Math.sin((.15 + t * .7) * Math.PI) * 1.12;
      head.tube(ellipse(0, -.12 + t * 1.6, 0, radius, radius, 32), .105, 6);
    }
    const headObject = new THREE.Group(); object.add(headObject);
    head.finish(headObject, 'Soft spaghetti Bloopad head'); stalk.finish(object, 'Blue pasta Bloopad tentacles');
    for (let arm = 0; arm < 6; arm++) {
      const a = arm / 6 * TAU, curls = new Batch(materials.blue), pts = [];
      for (let j = 0; j <= 22; j++) { const t = j / 22; pts.push(vec(Math.cos(a) * t * 1.4, -.3 - t * .8 + Math.sin(t * TAU) * .18, Math.sin(a) * t * 1.4)); }
      curls.tube(pts, .085, 6); curls.finish(object, 'Curled pasta tentacle');
    }
    pads.push({ x, z, object, headObject, timer: 0, flatten: 0, phase: index });
  }
  bloopad(25, -22, 0); bloopad(28, -23, 1);
  deck(32.5, -23.5, 6.6, 6.1, 4.5, 'tomato');
  for (const [x, z] of [[30, -21], [35.5, -21], [30, -26], [35.5, -26]]) post(x, z, -.7, 5.4, .30);
  craneTower(37.5, -22.0, 17, 'tomato');
  truss(vec(31, 16.9, -23), vec(39, 16.9, -23), .85, 'tomato', 8);
  const elevator = cargoPlatform('Red crane elevator', { x: 33, z: -23 }, { x: 33, z: -23 }, 4.5, 4.8, 4.8, 12, 'tomato', true);

  // The final street and boss apron are deliberately open. Mission-owned crates
  // and tentacles occupy the center without any hidden architecture collision.
  deck(33, -42, 36, 26, 8.2, 'cream');
  meshDeck(35.5, -28.5, 17, 7, 8.2, 'egg');
  deck(11, -43.5, 8, 23, 8.2, 'cream');
  for (let x = 16; x <= 50; x += 2.5) {
    post(x, -29.2, -.6, 8.75, .28);
    for (let yy = .2; yy < 7.6; yy += .33) b.toasted.tube([vec(x - .9, yy, -29.3), vec(x + .9, yy, -29.3)], .16, 6);
  }
  // A grated approach aligns the elevator's 8.2-high endpoint with the street.
  ramp(vec(33, 8.2, -24.8), vec(35, 8.2, -29), 4.6, 'egg', true);
  railing({ x: 16, z: -54.8 }, { x: 50, z: -54.8 }, 8.2);
  railing({ x: 50.8, z: -54 }, { x: 50.8, z: -30 }, 8.2);

  function house(x, z, w, d, h, roofColour = 'tomato') {
    const base = 8.2;
    for (let yy = base; yy < base + h; yy += .23) b.cream.tube([vec(x - w / 2, yy, z - d / 2), vec(x + w / 2, yy, z - d / 2), vec(x + w / 2, yy, z + d / 2), vec(x - w / 2, yy, z + d / 2), vec(x - w / 2, yy, z - d / 2)], .14, 7);
    const ridge = base + h + d * .22;
    for (let xx = x - w / 2 - .25; xx <= x + w / 2 + .25; xx += .25) for (const side of [-1, 1]) b[roofColour].tube(line(vec(xx, ridge, z), vec(xx, base + h, z + side * (d / 2 + .3)), 12, .025, xx), .145, 6);
    for (let door = -.6; door <= .6; door += .16) b.ink.tube([vec(x + door, base, z + d / 2 + .12), vec(x + door, base + 2.1, z + d / 2 + .12)], .10, 6);
    for (const sx of [-1, 1]) for (let yy = base + h * .58; yy < base + h * .58 + .8; yy += .15) b.blue.tube([vec(x + sx * w * .30 - .38, yy, z + d / 2 + .15), vec(x + sx * w * .30 + .38, yy, z + d / 2 + .15)], .09, 6);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: base, top: base + h, kind: 'upper-street-house' });
  }
  house(48, -42, 5.7, 7, 6.5); house(10.5, -46, 5.4, 6.4, 7.3, 'toasted'); house(10.7, -35, 5.2, 6, 5.9);

  function bowtie(batch, center, scale, rotation = 0) {
    const co = Math.cos(rotation), si = Math.sin(rotation);
    batch.sheet(4, 8, (u, v) => {
      const x = (u * 2 - 1) * scale, z = (v * 2 - 1) * (.2 + Math.abs(u * 2 - 1) * .65) * scale;
      return vec(center.x + x * co + z * si, center.y + Math.sin(v * Math.PI * 6) * .08 * scale, center.z - x * si + z * co);
    }, true);
  }
  function palm(x, z, base = 8.2, scale = 1) {
    for (let strand = 0; strand < 6; strand++) {
      const pts = [];
      for (let j = 0; j <= 30; j++) { const t = j / 30, a = strand / 6 * TAU + t * TAU * 3; pts.push(vec(x + Math.cos(a) * .22 * scale + t * t * .55, base + t * 5.8 * scale, z + Math.sin(a) * .22 * scale)); }
      b.toasted.tube(pts, .11 * scale, 6);
    }
    for (let leaf = 0; leaf < 7; leaf++) {
      const a = leaf / 7 * TAU, pts = [];
      for (let j = 0; j <= 12; j++) { const t = j / 12; pts.push(vec(x + .55 + Math.cos(a) * t * 2.6 * scale, base + 5.8 * scale + Math.sin(t * Math.PI) * .8 * scale - t * .9 * scale, z + Math.sin(a) * t * 2.6 * scale)); }
      b.spinach.tube(pts, .11 * scale, 6);
      for (let j = 3; j < 11; j += 2) bowtie(b.spinach, pts[j], .36 * scale, a + Math.PI / 2);
    }
  }
  palm(43, -31, 8.2, .85); palm(18, -51.5, 8.2, .9); palm(-45, 43, 2, .9);
  function pianta(x, z, base, colour = 'blue', yaw = 0, scale = 1) {
    const c = Math.cos(yaw), s = Math.sin(yaw), pt = p => vec(x + (p.x * c + p.z * s) * scale, base + p.y * scale, z + (-p.x * s + p.z * c) * scale);
    const tube = (mat, points, radius) => b[mat].tube(points.map(pt), radius * scale, 6);
    for (const side of [-1, 1]) {
      for (let j = 0; j < 4; j++) tube('toasted', ellipse(side * .3, .15 + j * .06, .12, .25 - j * .025, .34 - j * .025, 16), .08);
      tube(colour, line(vec(side * .30, .2, 0), vec(side * .3, .80, 0), 12, .06, side), .14);
      for (let j = 0; j < 3; j++) tube(colour, [vec(side * .50, 1.55 + j * .07, 0), vec(side * .78, 1.3 + j * .07, .08), vec(side * .83, 1.0 + j * .07, .24)], .08);
    }
    for (let j = 0; j <= 14; j++) { const t = j / 14, r = .28 + Math.sin(t * Math.PI) * .39; tube(colour, ellipse(0, .65 + t * 1.17, 0, r, r * .78, 26), .09); }
    for (let j = 0; j < 24; j++) { const a = j / 24 * TAU; tube('egg', [vec(Math.cos(a) * .58, .61, Math.sin(a) * .46), vec(Math.cos(a) * .65, .98, Math.sin(a) * .51)], .065); }
    for (let j = 0; j <= 9; j++) { const t = j / 9, r = Math.sin((.1 + t * .8) * Math.PI) * .42; tube(colour, ellipse(0, 1.72 + t * .75, .03, r, r * .85, 24), .08); }
    for (const side of [-1, 1]) {
      const pts = [];
      for (let j = 0; j <= 12; j++) { const a = j / 12 * TAU; pts.push(vec(side * .14 + Math.cos(a) * .055, 2.13 + Math.sin(a) * .08, .41)); }
      tube('ink', pts, .03);
    }
    for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; tube(colour, [vec(Math.cos(a) * .07, 2.01 + Math.sin(a) * .07, .33), vec(Math.cos(a) * .09, 2.0 + Math.sin(a) * .09, .63)], .065); }
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * TAU, pts = [];
      for (let k = 0; k <= 9; k++) { const t = k / 9; pts.push(vec(Math.cos(a) * t * .75, 2.49 + Math.sin(t * Math.PI) * .3 - t * .1, Math.sin(a) * t * .75)); }
      tube('spinach', pts, .075); bowtie(b.spinach, pt(pts[6]), .23 * scale, a + yaw);
    }
  }
  pianta(-46.4, 36.3, 2, 'tomato', .45, .98);
  pianta(-30.5, 28.8, 2, 'blue', -.5, .95);
  pianta(11.6, -17.1, 4.5, 'blue', .5, .94); pianta(16.1, -15.6, 4.5, 'gold', -.45, .95);
  pianta(41.5, -32.3, 8.2, 'tomato', -.7, .9); pianta(22, -32, 8.2, 'blue', 1.2, .95);

  // Fountain and the dock spout contain flowing coils of pale capellini.
  for (let layer = 0; layer < 5; layer++) b.egg.tube(ellipse(39, 8.25 + layer * .17, -34, 1.4, 1.4, 48), .13, 7);
  post(39, -34, 8.2, 2.4, .30, 'cream');
  for (let arm = 0; arm < 9; arm++) {
    const a = arm / 9 * TAU, pts = [];
    for (let j = 0; j <= 24; j++) { const t = j / 24; pts.push(vec(39 + Math.cos(a) * t * 1.1, 10.5 + Math.sin(t * Math.PI) * .7 - t * 1.9, -34 + Math.sin(a) * t * 1.1)); }
    pale.tube(pts, .045, 6);
  }
  post(-47, 35, 2, 1.55, .2, 'toasted');
  for (let n = 0; n < 5; n++) {
    const pts = [];
    for (let j = 0; j <= 20; j++) { const t = j / 20; pts.push(vec(-47 + t * 1.3, 3.5 + Math.sin(t * Math.PI) * .75 - t * 1.45, 35 + (n - 2) * .09)); }
    pale.tube(pts, .045, 6);
  }
  function arrow(x, z, y, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw), pt = (a, h) => vec(x + c * a, y + h, z - s * a);
    post(x, z, y, 1.8, .11, 'toasted');
    for (let off = -.12; off <= .12; off += .12) {
      b.tomato.tube([pt(-.7, 1.7 + off), pt(.85, 1.7 + off)], .08, 6);
      b.tomato.tube([pt(.25, 2.25 + off), pt(.85, 1.7 + off), pt(.25, 1.15 + off)], .08, 6);
    }
  }
  arrow(-41, 30.8, 2, .5); arrow(-24, 20, 3.2, Math.PI / 2); arrow(-12.5, 6.1, 4.2, 0); arrow(2.7, -7.9, 4.2, .5); arrow(12, -12, 4.5, Math.PI / 2); arrow(30.6, -22.4, 4.5, .5); arrow(35, -30, 8.2, Math.PI / 2);

  // Secondary boats and distant port buildings complete the harbor silhouette.
  function smallBoat(x, z, width, depth, ingredient = 'toasted') {
    for (let layer = 0; layer < 10; layer++) b[ingredient].tube(ellipse(x, -.3 + layer * .13, z, width / 2 * (.8 + layer * .022), depth / 2, 40), .10, 6);
    for (let zz = z - depth * .36; zz <= z + depth * .36; zz += .25) b.egg.tube([vec(x - width * .36, .85, zz), vec(x + width * .36, .85, zz)], .12, 6);
    post(x, z, .8, 4.5, .13, 'egg');
    b.cream.sheet(8, 8, (u, v) => vec(x + u * width * .40, .9 + v * (4 - u * 2), z + Math.sin(u * Math.PI) * .28), false);
  }
  smallBoat(45, 13, 8, 12, 'tomato'); smallBoat(50, -4, 6, 10, 'toasted'); smallBoat(-41, -15, 7, 11, 'blue');
  braided(vec(-44, 1, -10), vec(-48, 2.5, -7), .6, .08);
  for (let i = 0; i < 8; i++) {
    const x = -47 + i * 13, z = -68 - random() * 6, h = 8 + random() * 16;
    for (let layer = 0; layer < 12; layer++) {
      const t = layer / 12, r = (6 + random() * .3) * (1 - t * .55);
      b.cream.tube(ellipse(x, -1 + t * h, z, r, 5, 30, .08), .30, 6);
    }
  }
  for (const [x, y, z] of [[-40, 40, -75], [3, 46, -90], [55, 40, -72]]) for (let n = 0; n < 7; n++) {
    const pts = [], offset = (n - 3) * .9;
    for (let j = 0; j <= 42; j++) { const a = j / 42 * TAU * 2.2; pts.push(vec(x + offset + Math.cos(a) * 2.8, y + Math.sin(a) * 1.1 + Math.sin(n) * .7, z + j * .055)); }
    pale.tube(pts, .20, 6);
  }

  // Dense strands cover the ocean itself. Water is never represented by a
  // blue polygon; gaps between separate spirulina noodles remain visible.
  for (let z = -58, row = 0; z <= 51; z += .40, row++) {
    let pts = [];
    for (let x = -59; x <= 63; x += .95) {
      const zz = z + Math.sin(x * .29 + row) * .08;
      if (staticHeight(x, zz) > .9) { if (pts.length > 1) ocean.tube(pts, .16, 5); pts = []; continue; }
      pts.push(vec(x, -.34 + Math.sin(x * .32 + z * .45) * .055, zz));
    }
    if (pts.length > 1) ocean.tube(pts, .16, 5);
  }
  for (let n = 0; n < 100; n++) {
    const x = 23 + random() * 22, z = -30 + random() * 11;
    if (staticHeight(x, z) > -.2 || !inkAt(x, z)) continue;
    const pts = [];
    for (let j = 0; j <= 24; j++) { const t = j / 24, a = t * TAU * 1.2 + n; pts.push(vec(x + Math.cos(a) * (.3 + t * .8), -.10 + Math.sin(t * 8) * .06, z + Math.sin(a) * (.3 + t * .8))); }
    b.ink.tube(pts, .12, 6);
  }
  for (let n = 0; n < 90; n++) {
    const x = -54 + random() * 111, z = -52 + random() * 97;
    if (staticHeight(x, z) > -.2) continue;
    const pts = [];
    for (let j = 0; j <= 20; j++) { const t = j / 20, a = t * TAU; pts.push(vec(x + Math.cos(a) * .48, -.22, z + Math.sin(a) * .35)); }
    pale.tube(pts, .035, 5);
  }

  // Reusable dynamic bucatini cable segments. Their sag and the suspended
  // platform's spring load react to the player while retaining stable support.
  const cableCount = 3 * 4 * 14;
  const cableMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.052, .052, 1, 6, 1, true), materials.toasted, cableCount);
  cableMesh.name = 'Flexible spaghetti cargo cables'; cableMesh.castShadow = true; cableMesh.receiveShadow = true; cableMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(cableMesh);
  function updateCables() {
    let id = 0;
    for (const p of [crane1, crane2, elevator]) for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const a = vec(p.position.x + sx * .35, p.ropeTop, p.position.z + sz * .35), c = vec(p.position.x + sx * (p.hw - .15), p.position.y + .1, p.position.z + sz * (p.hd - .15));
      for (let j = 0; j < 14; j++) {
        const u = j / 14, v = (j + 1) / 14;
        const pa = a.clone().lerp(c, u), pb = a.clone().lerp(c, v);
        pa.x += Math.sin(u * Math.PI) * p.sway.x * .6; pb.x += Math.sin(v * Math.PI) * p.sway.x * .6;
        pa.z += Math.sin(u * Math.PI) * p.sway.z * .6; pb.z += Math.sin(v * Math.PI) * p.sway.z * .6;
        midpoint.copy(pa).add(pb).multiplyScalar(.5); direction.subVectors(pb, pa);
        dummy.position.copy(midpoint); dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize()); dummy.scale.set(1, direction.length(), 1); dummy.updateMatrix(); cableMesh.setMatrixAt(id++, dummy.matrix);
      }
    }
    cableMesh.instanceMatrix.needsUpdate = true;
  }

  for (const [name, batch] of Object.entries(b)) batch.finish(group, `${name} harbor pasta`);
  ocean.finish(group, 'Individual spirulina ocean spaghetti', false); pale.finish(group, 'Pale capellini fountains and clouds', false);

  function aimedAt(origin, dir, target, radius = 1.7, maxDistance = 14) {
    tmp.subVectors(target, origin); const distance = tmp.length();
    if (distance > maxDistance || distance < .01) return distance < .01;
    const directionLength = Math.hypot(dir.x, dir.y, dir.z) || 1;
    const along = (tmp.x * dir.x + tmp.y * dir.y + tmp.z * dir.z) / directionLength;
    if (along < -.1) return false;
    return Math.sqrt(Math.max(0, distance * distance - along * along)) <= radius + distance * .09;
  }
  function spray(origin, dir, dt) {
    const delta = Math.min(.1, Math.max(0, dt || 0)); let hit = false;
    if (!submarineRaised && aimedAt(origin, dir, fanPosition, 1.65)) {
      fanCharge = Math.min(.7, fanCharge + delta); lastSpray.fan = elapsed; hit = true;
      if (fanCharge >= .699) submarineRaised = true;
    }
    for (const p of pads) if (aimedAt(origin, dir, vec(p.x, 5.15, p.z), 1.6)) { p.timer = padDuration; hit = true; }
    for (const gate of gates) if (aimedAt(origin, dir, vec(gate.x, 5.4, gate.z), 1.8)) { gate.hold = 4; lastSpray.gate = elapsed; hit = true; }
    return hit;
  }
  function update(dt, time, player) {
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .05); elapsed += dt;
    const pos = player?.position || player?.pos || player;
    if (pos && Number.isFinite(pos.x)) playerLocation.copy(pos);
    for (const p of [crane1, crane2, elevator]) {
      p.previous.copy(p.position);
      const occupied = platformContains(p, playerLocation.x, playerLocation.z, true, .18) && Math.abs(playerLocation.y - p.previous.y) < .55;
      const path = shuttle(elapsed, p.period), targetX = mix(p.a.x, p.b.x, path), targetZ = mix(p.a.z, p.b.z, path);
      const loadX = occupied ? clamp((playerLocation.x - p.position.x) * .035, -.10, .10) : 0;
      const loadZ = occupied ? clamp((playerLocation.z - p.position.z) * .035, -.10, .10) : 0;
      const targetSag = occupied ? -.085 : 0;
      p.swayV.x += ((loadX - p.sway.x) * 24 - p.swayV.x * 7) * dt;
      p.swayV.z += ((loadZ - p.sway.z) * 24 - p.swayV.z * 7) * dt;
      p.swayV.y += ((targetSag - p.sway.y) * 30 - p.swayV.y * 8) * dt;
      p.sway.addScaledVector(p.swayV, dt);
      p.position.set(targetX + p.sway.x, p.baseY + (p.elevator ? path * 3.7 : 0) + p.sway.y, targetZ + p.sway.z);
      p.object.position.copy(p.position);
      p.object.rotation.z = p.sway.x * .025; p.object.rotation.x = -p.sway.z * .025;
    }
    submarine.previous.copy(submarine.position);
    const targetRaise = submarineRaised ? 1 : 0;
    submarine.raise += (targetRaise - submarine.raise) * Math.min(1, dt * 1.6);
    if (Math.abs(targetRaise - submarine.raise) < .002) submarine.raise = targetRaise;
    submarine.position.y = mix(-.65, 4.2, smooth(submarine.raise)); submarine.object.position.copy(submarine.position);
    for (const p of pads) {
      p.timer = Math.max(0, p.timer - dt);
      p.flatten += ((p.timer > 0 ? 1 : 0) - p.flatten) * Math.min(1, dt * 9);
      p.headObject.scale.y = mix(1, .10, p.flatten);
      p.headObject.rotation.z = p.timer > 0 && p.timer < 4 ? Math.sin(elapsed * 11 + p.phase) * .08 : Math.sin(elapsed * 1.7 + p.phase) * .025 * (1 - p.flatten);
    }
    for (const gate of gates) {
      if (Math.hypot(playerLocation.x - gate.x, playerLocation.z - gate.z) < 2.35 && Math.abs(playerLocation.y - 4.2) < 1.4) gate.hold = 2;
      gate.hold = Math.max(0, gate.hold - dt);
      const target = gate.hold > 0 ? 1 : 0;
      gate.velocity += ((target - gate.openness) * 36 - gate.velocity * 9) * dt; gate.openness += gate.velocity * dt;
      gate.object.rotation.y = -gate.openness * Math.PI * .48;
    }
    if (!submarineRaised && elapsed - lastSpray.fan > .5) fanCharge = Math.max(0, fanCharge - dt * .08);
    fan.rotation.z += dt * (submarineRaised ? 3.2 : .45 + fanCharge * 12);
    updateCables();
    if (playerLocation.y > 7 && playerLocation.z < -25) phase = 'upper-street';
    else if (playerLocation.x > 29 && playerLocation.z < -17) phase = 'red-crane';
    else if (playerLocation.x > 17 && playerLocation.z < -16) phase = 'bloopads';
    else if (playerLocation.x > 9 && playerLocation.z < -10) phase = 'submarine';
    else if (playerLocation.x > 0) phase = 'second-crane';
    else if (playerLocation.x > -16) phase = 'mesh-maze';
    else if (playerLocation.x > -26 && playerLocation.z < 17) phase = 'first-crane';
    else if (playerLocation.z < 28 && playerLocation.x > -43) phase = 'freighter';
    else phase = 'dock';
  }
  function reset() {
    elapsed = 0; submarineRaised = false; fanCharge = 0; phase = 'dock'; lastSpray.fan = lastSpray.gate = -99;
    for (const p of [crane1, crane2, elevator]) {
      p.position.set(p.a.x, p.baseY, p.a.z); p.previous.copy(p.position); p.object.position.copy(p.position); p.object.rotation.set(0, 0, 0); p.sway.set(0, 0, 0); p.swayV.set(0, 0, 0);
    }
    submarine.raise = 0; submarine.raiseV = 0; submarine.position.set(20, -.65, -20); submarine.previous.copy(submarine.position); submarine.object.position.copy(submarine.position);
    for (const p of pads) { p.timer = 0; p.flatten = 0; p.headObject.scale.y = 1; p.headObject.rotation.set(0, 0, 0); }
    for (const gate of gates) { gate.openness = gate.velocity = gate.hold = 0; gate.object.rotation.y = 0; }
    playerLocation.set(-42, 2, 37); updateCables();
  }
  const stageNames = {
    dock: 'Board the pasta freighter', freighter: 'Pass the hollow penne smokestack',
    'first-crane': 'Ride the first cargo crane', 'mesh-maze': 'Cross the spaghetti mesh maze',
    'second-crane': 'Ride the second cargo crane', submarine: 'Spray the pasta fan',
    bloopads: 'Flatten the Bloopads and cross', 'red-crane': 'Ride the red crane elevator',
    'upper-street': 'Find the tentacle in the freight crates'
  };
  function getState() {
    return {
      submarineRaised, submarineProgress: submarine.raise, fanCharge: fanCharge / .7, phase,
      stageName: phase === 'submarine' && submarineRaised ? 'Cross the golden shell submarine' : stageNames[phase],
      bloopads: pads.map(p => ({ x: p.x, z: p.z, flattened: p.timer > 0 && p.flatten > .65, remaining: p.timer })),
      platforms: [crane1, crane2, elevator].map(p => ({ name: p.object.name, x: p.position.x, y: p.position.y, z: p.position.z })),
      fanPosition: { x: fanPosition.x, y: fanPosition.y, z: fanPosition.z }
    };
  }
  const route = [
    { x: -42, z: 37, y: 2, stage: 'dock' }, { x: -42, z: 29, y: 2, stage: 'ramp' },
    { x: -35, z: 25, y: 3.2, stage: 'freighter' }, { x: -23, z: 15, y: 3.2, stage: 'smokestack' },
    { x: -23, z: 11, y: 4.2, stage: 'first-crane' }, { x: -14, z: 5, y: 4.2, stage: 'mesh-maze' },
    { x: -8, z: 5, y: 4.2, stage: 'mesh-maze' }, { x: -8, z: -3, y: 4.2, stage: 'mesh-maze' },
    { x: 0, z: -3, y: 4.2, stage: 'mesh-maze' }, { x: 0, z: -9, y: 4.2, stage: 'mesh-maze' },
    { x: 4, z: -9, y: 4.2, stage: 'second-crane' }, { x: 13, z: -14, y: 4.5, stage: 'fan' },
    { x: 14, z: -18, y: 4.5, stage: 'fan' }, { x: 20, z: -20, y: 4.2, stage: 'submarine' },
    { x: 25, z: -22, y: 4.5, stage: 'bloopads' }, { x: 28, z: -23, y: 4.5, stage: 'bloopads' },
    { x: 31, z: -24, y: 4.5, stage: 'ledge' }, { x: 33, z: -23, y: 4.5, stage: 'red-crane' },
    { x: 35, z: -29, y: 8.2, stage: 'upper-street' }, { x: 35, z: -33, y: 8.2, stage: 'upper-street' },
    { x: 29, z: -36, y: 8.2, stage: 'boss' }
  ];
  reset();
  return {
    group, heightAt, surfaceAt, colliders, update, reset, spray, getState, platformMotionAt, refillAt, inkAt, bounds,
    landmarks: { spawn: { x: -42, z: 37 }, boss: { x: 29, z: -44 }, arena: { x: 29, z: -37 }, fountain: { x: 39, z: -34 }, fan: { x: 14, z: -19 }, route },
    checkpoints: [{ x: -42, z: 37, y: 2 }, { x: -14, z: 5, y: 4.2 }, { x: 13, z: -14, y: 4.5 }, { x: 35, z: -30, y: 8.2 }],
    cleanup() { group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); scene.remove(group); }
  };
}
