import * as THREE from '../vendor/three.module.js';

// All visible architectural and landscape surfaces are extruded pasta or
// corrugated lasagna. Tubes are batched by material to keep this edible valley
// practical on a phone; there are no grass, masonry, wood, or water meshes.
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function random(seed = 1977) {
  let s = seed >>> 0;
  return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; };
}

class PastaBatch {
  constructor(material) { this.material = material; this.p = []; this.n = []; this.uv = []; this.ix = []; }
  vertex(p, n, u = 0, v = 0) {
    const i = this.p.length / 3;
    this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(u, v); return i;
  }
  tube(points, radius = .12, sides = 6, taper = false) {
    if (points.length < 2) return;
    const base = this.p.length / 3;
    let distance = 0;
    const tangent = V(0, 0, 0), side = V(0, 0, 0), binormal = V(0, 0, 0), axis = V(0, 1, 0);
    for (let j = 0; j < points.length; j++) {
      const a = points[Math.max(0, j - 1)], b = points[Math.min(points.length - 1, j + 1)];
      tangent.subVectors(b, a).normalize();
      axis.set(0, 1, 0); if (Math.abs(tangent.y) > .94) axis.set(1, 0, 0);
      side.crossVectors(tangent, axis).normalize(); binormal.crossVectors(tangent, side).normalize();
      if (j) distance += points[j].distanceTo(points[j - 1]);
      const r = radius * (taper ? .45 + .55 * Math.sin(Math.PI * (j + .5) / points.length) : 1);
      for (let k = 0; k <= sides; k++) {
        const th = k / sides * TAU;
        const n = side.clone().multiplyScalar(Math.cos(th)).addScaledVector(binormal, Math.sin(th));
        this.vertex(points[j].clone().addScaledVector(n, r), n, distance * .9, k / sides);
      }
    }
    for (let j = 0; j < points.length - 1; j++) for (let k = 0; k < sides; k++) {
      const a = base + j * (sides + 1) + k, b = a + sides + 1;
      this.ix.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  sheet(rows, cols, fn, flip = false) {
    const base = this.p.length / 3;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const u = i / cols, v = j / rows, p = fn(u, v);
      const d = .001;
      const du = fn(clamp(u + d, 0, 1), v).sub(fn(clamp(u - d, 0, 1), v));
      const dv = fn(u, clamp(v + d, 0, 1)).sub(fn(u, clamp(v - d, 0, 1)));
      const n = du.cross(dv).normalize();
      if (flip) n.negate();
      if (n.lengthSq() < .1) n.set(0, 1, 0);
      this.vertex(p, n, u * 4, v * 4);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = base + j * (cols + 1) + i, b = a + cols + 1;
      if (flip) this.ix.push(a, b, a + 1, a + 1, b, b + 1);
      else this.ix.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  finish(parent, name, shadow = true) {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.ix);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, this.material); mesh.name = name;
    mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh);
    this.p.length = this.n.length = this.uv.length = this.ix.length = 0;
    return mesh;
  }
}

function strand(a, b, bends = 12, wave = .035, phase = 0) {
  const pts = [];
  for (let j = 0; j <= bends; j++) {
    const t = j / bends;
    pts.push(V(lerp(a.x, b.x, t) + Math.sin(t * Math.PI * 4 + phase) * wave,
      lerp(a.y, b.y, t) + Math.sin(t * Math.PI * 3 + phase) * wave,
      lerp(a.z, b.z, t) + Math.cos(t * Math.PI * 3 + phase) * wave));
  }
  return pts;
}
function ring(x, y, z, rx, rz, count = 36, wiggle = .025, offset = 0) {
  return Array.from({ length: count + 1 }, (_, i) => {
    const a = i / count * TAU, w = Math.sin(a * 9 + offset) * wiggle;
    return V(x + Math.cos(a) * (rx + w), y + Math.sin(a * 7 + offset) * wiggle, z + Math.sin(a) * (rz + w));
  });
}
function roundedBoxLoop(x, y, z, w, d, rounds = .3) {
  const p = [];
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], k) => {
    const a0 = k * Math.PI / 2;
    for (let j = 0; j <= 4; j++) {
      const a = a0 + j / 4 * Math.PI / 2;
      p.push(V(x + Math.cos(a) * rounds + sx * (w / 2 - rounds), y + Math.sin(a * 6 + y) * .025,
        z + Math.sin(a) * rounds + sz * (d / 2 - rounds)));
    }
  });
  p.push(p[0].clone()); return p;
}

export function createWorld(scene, materials) {
  const group = new THREE.Group(); group.name = 'Bianco Hills — entirely pasta'; scene.add(group);
  const rng = random(), colliders = [], mills = [], windPlants = [];
  const b = {};
  for (const key of ['egg', 'cream', 'tomato', 'spinach', 'ink', 'blue', 'gold', 'toasted'])
    b[key] = new PastaBatch(materials[key] || materials.egg);
  const land = new PastaBatch(materials.spinach || materials.egg);
  const distant = new PastaBatch(materials.egg);
  let ropeLoad = 0, roadProgress = 0;
  const roadStart = { x: 17, z: -24 }, roadEnd = { x: 24, z: -25 };
  const roadDX = roadEnd.x - roadStart.x, roadDZ = roadEnd.z - roadStart.z;
  const roadLengthSq = roadDX * roadDX + roadDZ * roadDZ, roadLength = Math.sqrt(roadLengthSq);
  const roadNormal = V(-roadDZ / roadLength, 0, roadDX / roadLength);
  const route = [[-43, 36], [-41, 25], [-37, 19], [-37, 9], [-29, 4], [-18, 1], [-10, 4], [-10, 13], [4, 13], [8, 4], [12, -4], [9, -14], [22, -25]];
  function nearSegment(x, z, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  }
  function isLake(x, z) {
    const e = ((x - 39) / 25) ** 2 + ((z + 8) / 27) ** 2;
    if (e >= 1 || Math.hypot(x - 40, z + 11) < 9.8) return false;
    // The western bank curves into the lake at the buried bridge approach.
    if (x < 26 && z < -17 && nearSegment(x, z, 9, -14, 24, -26) < 6.2) return false;
    if (x < 17 && nearSegment(x, z, 12, -4, 9, -14) < 3.5) return false;
    return true;
  }
  function isRiver(x, z) { return x > -61 && x < -7.1 && z > 11.25 && z < 16.75; }
  function ropeY(z) { return 1.8 - Math.sin(clamp((z - 9.5) / 9.5, 0, 1) * Math.PI) * (.48 + ropeLoad * .26); }
  function baseHeightAt(x, z) {
    if (Math.abs(x + 37) < .68 && z > 9.5 && z < 19) return ropeY(z) + .06;
    if (isRiver(x, z)) return -.9;
    const r = Math.hypot(x - 40, z + 11);
    if (r < 9.8) return .7 + 11.3 * smooth((9.8 - r) / 2.1);
    if (isLake(x, z)) return -1.65;
    let h = 1.48 + Math.sin(x * .13) * Math.cos(z * .11) * .18;
    if (z > 17 && x < -22) h += smooth((z - 17) / 24) * 5.7;
    if (x > -3) h += smooth((-z - 1) / 28) * 2.3;
    const edge = Math.max(smooth((-x - 49) / 12), smooth((-z - 35) / 13), smooth((x - 61) / 12));
    h += edge * (4 + Math.sin(x * .2 + z * .17) * 1.3);
    return h;
  }
  function roadU(x, z) { return ((x - roadStart.x) * roadDX + (z - roadStart.z) * roadDZ) / roadLengthSq; }
  // A short level landing meets the bridge before its padded collision edge.
  // The incline stays continuous (~27 degrees) and reaches deck level over the
  // first 82% of its length, leaving 1.27 metres of flat approach.
  function roadTargetY(u) { return lerp(baseHeightAt(roadStart.x, roadStart.z), 6.38, clamp(u / .82, 0, 1)); }
  function heightAt(x, z) {
    const base = baseHeightAt(x, z);
    if (roadProgress <= 0) return base;
    const u = roadU(x, z), lateral = (x - roadStart.x) * roadNormal.x + (z - roadStart.z) * roadNormal.z;
    if (u < 0 || u > 1 || Math.abs(lateral) > 1.28) return base;
    return Math.max(base, lerp(base, roadTargetY(u), roadProgress));
  }
  function surfaceAt(x, z) {
    if (Math.abs(x + 37) < .68 && z > 9.5 && z < 19) return 'ground';
    return isLake(x, z) || isRiver(x, z) ? 'water' : 'ground';
  }
  function at(x, z, dy = 0) { return V(x, heightAt(x, z) + dy, z); }

  // Lasagna forms a thick, corrugated terrain substrate. Its edges are visibly
  // stacked sheets, with separately modeled spaghetti over the whole surface.
  const bounds = { x0: -65, x1: 72, z0: -51, z1: 47 }, cell = 2.0;
  for (let z = bounds.z0; z < bounds.z1; z += cell) for (let x = bounds.x0; x < bounds.x1; x += cell) {
    if (surfaceAt(x + cell / 2, z + cell / 2) === 'water') continue;
    land.sheet(1, 1, (u, v) => {
      const px = x + u * cell, pz = z + v * cell;
      let y = heightAt(px, pz);
      if (surfaceAt(px, pz) === 'water') y = .25;
      return V(px, y - .14 + Math.sin(px * 5.7) * .045, pz);
    }, true);
  }
  for (let z = -50.5, row = 0; z < 46.5; z += .69, row++) {
    let pts = [];
    for (let x = -64; x <= 71; x += 1.15) {
      const pz = z + Math.sin(x * .33 + row * .82) * .20 + Math.cos(x * .12 - row) * .14;
      if (surfaceAt(x, pz) === 'water') {
        if (pts.length > 1) b.spinach.tube(pts, .15, 5); pts = []; continue;
      }
      pts.push(at(x, pz, .05));
    }
    if (pts.length > 1) b.spinach.tube(pts, .15, 5);
  }
  // A second, sparse weave makes the grassy surface a pile of pasta rather than
  // a smooth height-map painted green.
  for (let i = 0; i < 700; i++) {
    const x = -59 + rng() * 127, z = -46 + rng() * 89;
    if (surfaceAt(x, z) === 'water') continue;
    const pts = [];
    for (let j = 0; j <= 9; j++) {
      const t = j / 9, px = x + Math.cos(t * 4.2 + i) * .65, pz = z + t * 2.4;
      pts.push(at(px, pz, .16 + Math.sin(t * Math.PI) * .12));
    }
    b.spinach.tube(pts, .095, 5, true);
  }
  // Route: parallel fresh egg noodles, rolled along the same footprint as the
  // downhill entry and the path through the village to the first boss.
  for (let seg = 0; seg < route.length - 1; seg++) {
    const a = route[seg], c = route[seg + 1], dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz);
    if (seg === 2) continue;
    const nx = -dz / len, nz = dx / len, width = seg > 7 ? 3.4 : 3.1;
    for (let offset = -width / 2; offset <= width / 2; offset += .24) {
      const pts = [];
      for (let j = 0; j <= Math.ceil(len / .75); j++) {
        const t = j / Math.ceil(len / .75), wob = Math.sin(t * 13 + offset) * .055;
        const x = lerp(a[0], c[0], t) + nx * (offset + wob), z = lerp(a[1], c[1], t) + nz * (offset + wob);
        if (surfaceAt(x, z) === 'water') continue;
        pts.push(at(x, z, .21));
      }
      if (pts.length > 1) b.egg.tube(pts, .115, 6);
    }
  }
  // Pasta shorelines and dozens of lasagna strata exposed along the boundary.
  for (let k = 0; k < 7; k++) {
    const y = -.65 - k * .28;
    const pts = [V(-65, y, 47), V(-40, y, 47), V(-15, y, 47), V(12, y, 47), V(42, y, 47), V(72, y, 47)];
    b.egg.tube(pts, .15, 5);
  }

  // Blue spirulina angel-hair is the lake and river: hundreds of distinguishable
  // wet strands, with coiled noodles along the shore, not a conventional plane.
  for (let z = -35; z <= 21; z += .32) {
    let pts = [];
    for (let x = 13; x <= 65; x += .85) {
      const pz = z + Math.sin(x * .46 + z * .18) * .10;
      if (!isLake(x, pz)) { if (pts.length > 1) b.blue.tube(pts, .135, 5); pts = []; continue; }
      pts.push(V(x, .63 + Math.sin(x * .45 + z) * .045, pz));
    }
    if (pts.length > 1) b.blue.tube(pts, .135, 5);
  }
  for (let z = 11.4; z < 16.8; z += .27) {
    const pts = [];
    for (let x = -61; x <= -7; x += .8) pts.push(V(x, .48 + Math.sin(x * .6 + z * 3) * .045, z + Math.sin(x * .4 + z) * .06));
    b.blue.tube(pts, .12, 5);
  }

  function house(x, z, w, d, h, variant = 0) {
    const base = heightAt(x, z), roof = base + h;
    // Every wall course is a distinct cream spaghetti strand wrapped around a
    // lasagna form; deep dark-pasta window recesses preserve legible openings.
    for (let y = base; y < roof; y += .24) {
      const pts = [V(x - w / 2, y, z - d / 2), V(x + w / 2, y + .025, z - d / 2),
        V(x + w / 2, y, z + d / 2), V(x - w / 2, y - .025, z + d / 2), V(x - w / 2, y, z - d / 2)];
      b.cream.tube(pts, .145, 7);
    }
    // Roof tiles are small bent penne laid densely across two lasagna slopes.
    const ridge = roof + Math.min(w, d) * .28;
    for (let xx = x - w / 2 - .28; xx <= x + w / 2 + .28; xx += .28) {
      for (const side of [-1, 1]) {
        const pts = [];
        for (let j = 0; j <= 7; j++) {
          const t = j / 7, zz = z + side * (d / 2 + .4) * t;
          pts.push(V(xx + Math.sin(t * 5 + xx) * .035, lerp(ridge, roof, t) + Math.sin(t * Math.PI) * .08, zz));
        }
        b[variant % 3 === 2 ? 'toasted' : 'tomato'].tube(pts, .16, 7);
      }
    }
    b.tomato.tube(strand(V(x - w / 2 - .4, ridge, z), V(x + w / 2 + .4, ridge, z), 12, .035), .23, 7);
    // Broad front door made from stacked ink-colored tagliatelle.
    const front = z + d / 2 + .16, doorX = x + (variant % 2 ? -.7 : .7);
    for (let yy = base + .18; yy < base + 2.05; yy += .18)
      b.ink.tube([V(doorX - .55, yy, front), V(doorX + .55, yy, front)], .10, 5);
    const arc = [];
    for (let j = 0; j <= 16; j++) { const a = j / 16 * Math.PI; arc.push(V(doorX + Math.cos(a) * .65, base + 1.65 + Math.sin(a) * .65, front + .06)); }
    b.egg.tube(arc, .14, 6);
    for (const sx of [-1, 1]) b.egg.tube([V(doorX + sx * .65, base + .1, front + .06), V(doorX + sx * .65, base + 1.7, front + .06)], .14, 6);
    for (const side of [-1, 1]) {
      const wx = x + side * w * .29, wy = base + h * .65;
      for (let yy = wy - .48; yy <= wy + .48; yy += .15)
        b.ink.tube([V(wx - .38, yy, front), V(wx + .38, yy, front)], .085, 5);
      b.egg.tube([V(wx - .48, wy - .58, front + .07), V(wx - .48, wy + .58, front + .07), V(wx + .48, wy + .58, front + .07), V(wx + .48, wy - .58, front + .07), V(wx - .48, wy - .58, front + .07)], .10, 5);
    }
    // Roofs have solid support for the optional wall-crossing route.
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: base - .2, top: roof + .15, kind: 'house' });
    return { x, z, y: roof, ridge };
  }
  const houses = [
    house(-46, -1, 6.2, 6, 5.6, 0), house(-42, -14, 7, 6, 6.4, 1),
    house(-30, -14, 6.3, 7, 4.9, 2), house(-26, -27, 6.2, 6.5, 6.3, 0),
    house(-16, -20, 5.5, 5.5, 7.2, 1), house(-14, -7, 5.8, 6, 5.7, 0),
    house(-29, -3, 5.5, 4, 3.8, 1), house(-53, -25, 5.8, 5.5, 4.5, 2),
    house(-51, 7, 5.8, 4, 4.5, 1), house(-20, 7, 5.2, 4.5, 3.7, 2)
  ];
  function suspendedRope(a, c, sag = 1, radius = .105, mat = 'egg') {
    for (let braid = 0; braid < 3; braid++) {
      const pts = [];
      for (let j = 0; j <= 28; j++) {
        const t = j / 28, a1 = t * TAU * 7 + braid * TAU / 3;
        pts.push(V(lerp(a.x, c.x, t) + Math.cos(a1) * .055,
          lerp(a.y, c.y, t) - Math.sin(t * Math.PI) * sag + Math.sin(a1) * .055, lerp(a.z, c.z, t)));
      }
      b[mat].tube(pts, radius, 5);
    }
  }
  suspendedRope(V(-43, houses[1].ridge + .1, -14), V(-30, houses[2].ridge + .7, -14), 1.4);
  suspendedRope(V(-30, houses[2].ridge + .7, -14), V(-16, houses[4].ridge + .1, -20), 1.6);
  suspendedRope(V(-14, houses[5].ridge + .2, -7), V(-5, 9.6, -7), .6);
  suspendedRope(V(-46, houses[0].ridge + .1, -1), V(-29, houses[6].ridge + .2, -3), 1.1);
  // Stacked ravioli steps make the village rooftop alternative accessible.
  for (let s = 0; s < 4; s++) {
    const x = -15.4, z = 2.8 - s * 1.1, y = 1.6 + s * .9;
    for (let k = 0; k < 3; k++) b.egg.tube([V(x - 1.2, y - k * .18, z - .55), V(x + 1.2, y - k * .18, z - .55), V(x + 1.2, y - k * .18, z + .55), V(x - 1.2, y - k * .18, z + .55), V(x - 1.2, y - k * .18, z - .55)], .18, 6);
    colliders.push({ minX: x - 1.2, maxX: x + 1.2, minZ: z - .65, maxZ: z + .65, top: y + .18, bottom: 1.2, kind: 'step' });
  }

  function wall(z1, z2) {
    const y0 = 1.5;
    for (let y = y0; y <= 9.2; y += .25) for (const x of [-5.9, -4.1])
      b.cream.tube(strand(V(x, y, z1), V(x, y, z2), Math.ceil((z2 - z1) * 1.3), .045, y), .15, 6);
    for (let z = z1; z <= z2; z += .24) b.egg.tube([V(-6.15, 9.35, z), V(-3.85, 9.35, z)], .14, 6);
    for (const z of [z1, z2]) for (let x = -5.9; x <= -4.05; x += .25)
      b.cream.tube([V(x, y0, z), V(x, 9.3, z)], .15, 6);
    colliders.push({ minX: -6, maxX: -4, minZ: z1, maxZ: z2, top: 9.45, bottom: 1.25, kind: 'wall' });
  }
  wall(-33, -7.5); wall(-.5, 8.3); wall(17.9, 24);
  // The first-episode gate stays closed. It is a barred slab of dark bucatini.
  for (let z = -7.35; z < -.65; z += .32) b.toasted.tube([V(-5.2, 1.6, z), V(-5.2, 7.4 + Math.sin((z + 7.35) / 6.7 * Math.PI) * .6, z)], .19, 7);
  for (let y = 2; y < 7.5; y += 1.4) b.egg.tube([V(-5.36, y, -7.4), V(-5.36, y, -.6)], .15, 6);
  colliders.push({ minX: -5.65, maxX: -4.55, minZ: -7.5, maxZ: -.5, top: 8.0, bottom: 1.3, kind: 'closed-gate' });
  // Wheel passage has no hidden collision wall; it is the required route.
  for (let z = 8.5; z < 17.8; z += .23) b.egg.tube([V(-6.2, 9.4, z), V(-3.8, 9.4, z)], .13, 6);
  for (const z of [8.4, 18]) for (let y = 1.5; y < 9.4; y += .26)
    b.cream.tube([V(-6.4, y, z), V(-3.6, y, z)], .18, 6);
  const wheel = new THREE.Group(); wheel.name = 'Bucatini waterwheel'; wheel.position.set(-5, 5.4, 13.1); group.add(wheel);
  const wheelBatch = new PastaBatch(materials.toasted), wheelEgg = new PastaBatch(materials.egg);
  for (const xx of [-1.2, 1.2]) for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 72; i++) { const a = i / 72 * TAU; pts.push(V(xx, Math.sin(a) * (4.35 - k * .22), Math.cos(a) * (4.35 - k * .22))); }
    wheelBatch.tube(pts, .13, 7);
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, cy = Math.sin(a), sz = Math.cos(a);
    for (const xx of [-1.15, 1.15]) wheelEgg.tube([V(xx, cy * .5, sz * .5), V(xx, cy * 4.2, sz * 4.2)], .15, 6);
    for (let k = -2; k <= 2; k++) wheelBatch.tube([V(-1.45, cy * 4.2 + Math.cos(a) * k * .16, sz * 4.2 - Math.sin(a) * k * .16), V(1.45, cy * 4.2 + Math.cos(a) * k * .16, sz * 4.2 - Math.sin(a) * k * .16)], .13, 6);
  }
  wheelEgg.tube([V(-1.7, 0, 0), V(1.7, 0, 0)], .40, 10);
  wheelBatch.finish(wheel, 'Toasted spaghetti wheel hoops'); wheelEgg.finish(wheel, 'Pasta wheel spokes');
  mills.push({ group: wheel, axis: 'x', rate: -.25 });

  // Short spaghetti palisade in the village, low enough for the basic jump.
  for (let x = -39; x <= -33; x += .45) b.toasted.tube([at(x, 3, .05), at(x, 3, 1.1)], .10, 6);
  b.egg.tube([at(-39.2, 3, .7), at(-32.8, 3, .7)], .13, 6);
  colliders.push({ minX: -39.3, maxX: -32.8, minZ: 2.8, maxZ: 3.2, top: 2.65, bottom: 1.2, kind: 'fence' });

  function pastaArrow(x, z, yaw = 0) {
    const y = heightAt(x, z), c = Math.cos(yaw), s = Math.sin(yaw);
    const pt = (px, py, pz = 0) => V(x + px * c + pz * s, y + py, z - px * s + pz * c);
    for (let off = -.08; off <= .08; off += .08) b.toasted.tube([pt(off, 0), pt(off, 2.15)], .1, 6);
    for (let off = -.16; off <= .16; off += .16) {
      b.tomato.tube([pt(-.7, 2.1 + off), pt(.85, 2.1 + off)], .11, 6);
      b.tomato.tube([pt(.2, 2.65 + off), pt(.88, 2.1 + off), pt(.2, 1.55 + off)], .11, 6);
    }
  }
  pastaArrow(-41, 23, -.7); pastaArrow(-31, 7, -.2); pastaArrow(-9, 7, -Math.PI / 2); pastaArrow(3, 10, Math.PI / 2); pastaArrow(11, -16, .7);

  function farfalle(batch, center, scale, rotation = 0) {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    batch.sheet(5, 8, (u, v) => {
      const px = (u * 2 - 1) * scale, width = (.22 + Math.abs(u * 2 - 1) * .75) * scale;
      const pz = (v * 2 - 1) * width;
      return V(center.x + px * c + pz * s, center.y + Math.sin(v * Math.PI * 6) * .08 * scale + Math.sin(u * Math.PI) * .12 * scale,
        center.z - px * s + pz * c);
    }, true);
  }
  function palm(x, z, size = 1, lean = 0) {
    if (surfaceAt(x, z) === 'water') return;
    const y = heightAt(x, z), ht = 5.4 * size;
    for (let spiral = 0; spiral < 6; spiral++) {
      const pts = [];
      for (let i = 0; i <= 32; i++) {
        const t = i / 32, a = t * TAU * 3.5 + spiral / 6 * TAU;
        pts.push(V(x + t * t * lean + Math.cos(a) * .24 * size, y + t * ht, z + Math.sin(a) * .24 * size));
      }
      b.toasted.tube(pts, .115 * size, 6);
    }
    const crown = V(x + lean, y + ht, z);
    for (let leaf = 0; leaf < 7; leaf++) {
      const a = leaf / 7 * TAU + x;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, dist = t * 3 * size;
        pts.push(V(crown.x + Math.cos(a) * dist, crown.y + Math.sin(t * Math.PI) * .95 * size - t * 1.1 * size, crown.z + Math.sin(a) * dist));
      }
      b.spinach.tube(pts, .13 * size, 6, true);
      for (let k = 2; k < 10; k += 2) {
        const p = pts[k]; farfalle(b.spinach, p.clone().add(V(0, -.03, 0)), .40 * size, a + Math.PI / 2);
      }
    }
    for (let i = 0; i < 3; i++) b.gold.tube(ring(crown.x + Math.cos(i * 2) * .3, crown.y - .3, crown.z + Math.sin(i * 2) * .3, .25, .21, 14), .14, 6);
  }
  [[-56, 20, 1.0, .9], [-49, 31, 1.05, -.8], [-32, 29, .95, .7], [-35, -29, .9, -.8], [-55, -12, 1.1, .5],
    [-20, -32, .85, .7], [-8, -26, 1, -.6], [2, -5, 1.1, .6], [4, -20, .9, -.5], [17, 12, 1.0, .8],
    [25, 21, .95, -.8], [61, 8, 1, .8], [60, -29, .95, -.6], [25, -36, .9, -.6], [3, 22, .85, .5]].forEach(p => palm(...p));

  // Friendly village Piantas, assembled from coiled pasta, shell-shaped feet,
  // a fringe of penne and a little farfalle palm on the head.
  function pianta(x, z, colour = 'blue', yaw = 0, scale = 1) {
    const y = heightAt(x, z), c = Math.cos(yaw), s = Math.sin(yaw);
    const pt = p => V(x + (p.x * c + p.z * s) * scale, y + p.y * scale, z + (-p.x * s + p.z * c) * scale);
    const tube = (mat, points, radius, sides = 6) => b[mat].tube(points.map(pt), radius * scale, sides);
    for (const sign of [-1, 1]) {
      for (let strandId = 0; strandId < 4; strandId++) {
        const phase = strandId / 4 * TAU, pts = [];
        for (let j = 0; j <= 12; j++) {
          const t = j / 12, a = phase + t * TAU;
          pts.push(V(sign * .30 + Math.cos(a) * .10, .2 + t * .60, Math.sin(a) * .10));
        }
        tube(colour, pts, .09);
      }
      for (let k = 0; k < 4; k++) tube('toasted', ring(sign * .33, .17 + k * .06, .12, .28 - k * .025, .39 - k * .03, 16), .08);
    }
    for (let j = 0; j <= 15; j++) {
      const t = j / 15, r = .30 + Math.sin(t * Math.PI) * .40;
      tube(colour, ring(0, .6 + t * 1.25, 0, r, r * .8, 25, .018, j), .09);
    }
    // A skirt of individual penne makes the broad belly silhouette readable.
    for (let j = 0; j < 26; j++) {
      const a = j / 26 * TAU;
      tube('egg', [V(Math.cos(a) * .58, .60, Math.sin(a) * .49), V(Math.cos(a) * .67, .99, Math.sin(a) * .53)], .075);
    }
    for (let j = 0; j <= 9; j++) {
      const t = j / 9, r = Math.sin((.1 + t * .8) * Math.PI) * .43;
      tube(colour, ring(0, 1.72 + t * .77, .03, r, r * .86, 22, .015, j), .085);
    }
    for (const sign of [-1, 1]) for (let k = 0; k < 3; k++) {
      const pts = [V(sign * .46, 1.59, 0), V(sign * .77, 1.36, .06), V(sign * .90, 1.05, .18), V(sign * .82, .94, .29)];
      tube(colour, pts.map(p => p.add(V(0, k * .075, 0))), .085);
    }
    for (const sign of [-1, 1]) {
      const eye = [];
      for (let j = 0; j <= 12; j++) { const a = j / 12 * TAU; eye.push(V(sign * .15 + Math.cos(a) * .06, 2.16 + Math.sin(a) * .09, .405)); }
      tube('ink', eye, .033, 5);
    }
    // The exaggerated Pianta nose is a little bundle of curved bucatini.
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * TAU;
      tube(colour, [V(Math.cos(a) * .075, 2.04 + Math.sin(a) * .075, .32), V(Math.cos(a) * .10, 2.02 + Math.sin(a) * .10, .66)], .07);
    }
    for (let j = 0; j < 7; j++) {
      const a = j / 7 * TAU, pts = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        pts.push(V(Math.cos(a) * t * .8, 2.5 + Math.sin(t * Math.PI) * .35 - t * .15, Math.sin(a) * t * .8));
      }
      tube('spinach', pts, .085);
      farfalle(b.spinach, pt(pts[7]), .23 * scale, a + yaw);
    }
  }
  pianta(-46, 35, 'tomato', .5, .92);
  pianta(-25, 0, 'blue', -.3, 1.0);
  pianta(-9, -4, 'gold', -Math.PI / 2, 1.08);
  pianta(-9, 19.8, 'blue', .3, .95);

  function miniMill(x, z, ht = 5) {
    const y = heightAt(x, z);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU;
      b.cream.tube(strand(V(x + Math.cos(a) * .5, y, z + Math.sin(a) * .5), V(x + Math.cos(a) * .4, y + ht, z + Math.sin(a) * .4), 12, .025, a), .11, 6);
    }
    const rotor = new THREE.Group(); rotor.position.set(x, y + ht, z + .65); group.add(rotor);
    const bb = new PastaBatch(materials.egg);
    for (let arm = 0; arm < 4; arm++) {
      const angle = arm * Math.PI / 2;
      for (let strip = 0; strip < 4; strip++) {
        const pts = [];
        for (let j = 0; j <= 12; j++) {
          const t = j / 12, xx = .18 + t * 2.0, yy = (strip - 1.5) * .16;
          pts.push(V(xx * Math.cos(angle) - yy * Math.sin(angle), xx * Math.sin(angle) + yy * Math.cos(angle), Math.sin(t * Math.PI) * .12));
        }
        bb.tube(pts, .095, 5);
      }
    }
    bb.finish(rotor, 'Rotating spaghetti village mill'); mills.push({ group: rotor, axis: 'z', rate: .33 });
  }
  miniMill(-34, -22, 7); miniMill(-51, -7, 6.2); miniMill(-24, 14, 5.8); miniMill(-11, -29, 6.8);

  // The Big Windmill is built from curled lasagna strata on a noodle island.
  for (let layer = 0; layer < 36; layer++) {
    const y = .7 + layer * .32, r = 9.4 - Math.min(1.7, layer * .052);
    b.toasted.tube(ring(40, y, -11, r, r, 70, .13, layer), .19, 6);
    if (layer % 4 === 0) b.egg.tube(ring(40, y + .12, -11, r + .08, r + .08, 70, .10, layer), .12, 6);
  }
  for (let layer = 0; layer < 74; layer++) {
    const y = 12 + layer * .245, r = 3.25 - layer * .0105;
    b.cream.tube(ring(40, y, -11, r, r, 55, .04, layer), .15, 7);
  }
  for (let j = 0; j < 72; j++) {
    const a = j / 72 * TAU, pts = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, r = lerp(3.2, .2, t);
      pts.push(V(40 + Math.cos(a) * r, 30.2 + t * 4.1 + Math.sin(t * Math.PI) * .12, -11 + Math.sin(a) * r));
    }
    b.tomato.tube(pts, .15, 6);
  }
  colliders.push({ minX: 37, maxX: 43, minZ: -14, maxZ: -8, bottom: 11.8, top: 30.2, kind: 'big-windmill' });
  const bigRotor = new THREE.Group(); bigRotor.name = 'Lasagna sails'; bigRotor.position.set(40, 25.2, -7.75); group.add(bigRotor);
  const bigBlade = new PastaBatch(materials.egg), bigEdge = new PastaBatch(materials.toasted);
  for (let arm = 0; arm < 4; arm++) {
    const a = arm * Math.PI / 2 + .20, c = Math.cos(a), s = Math.sin(a);
    const transform = (x, y, z) => V(x * c - y * s, x * s + y * c, z);
    bigBlade.sheet(14, 10, (u, v) => {
      const x = 1.15 + u * 6.8, width = lerp(.52, 1.24, u), y = (v * 2 - 1) * width;
      return transform(x, y, Math.sin(v * Math.PI * 12) * .055 + u * .4);
    });
    for (const side of [-1, 1]) {
      const pts = [];
      for (let j = 0; j <= 20; j++) { const t = j / 20; pts.push(transform(1.12 + t * 6.85, side * lerp(.54, 1.26, t), t * .4)); }
      bigEdge.tube(pts, .15, 7);
    }
    for (let k = 0; k < 7; k++) {
      const x = 1.2 + k * 1.1, w = lerp(.54, 1.26, k / 6);
      bigEdge.tube([transform(x, -w, k / 6 * .4), transform(x, w, k / 6 * .4)], .09, 6);
    }
  }
  bigBlade.finish(bigRotor, 'Corrugated lasagna windmill blades'); bigEdge.finish(bigRotor, 'Bucatini sail frames');
  mills.push({ group: bigRotor, axis: 'z', rate: .115 });
  // Rigatoni window rings around the tower, and spinach spaghetti brambles.
  for (let y = 17; y < 29; y += 5) {
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * TAU;
      const xx = 40 + Math.cos(a) * .48, yy = y + Math.sin(a) * .85;
      b.toasted.tube([V(xx, yy, -7.85), V(xx, yy, -7.5)], .12, 6);
    }
  }
  for (let n = 0; n < 8; n++) {
    const pts = [];
    for (let j = 0; j <= 60; j++) {
      const t = j / 60, a = t * TAU * 1.3 + n / 8 * TAU, r = lerp(3.65, 2.7, t);
      pts.push(V(40 + Math.cos(a) * r, 12 + t * 18.5, -11 + Math.sin(a) * r));
    }
    b.spinach.tube(pts, .10, 6);
    for (let j = 4; j < 60; j += 9) farfalle(b.spinach, pts[j], .42, n + j);
  }
  // A continuous spiral of folded lasagna wraps the island, matching the
  // distinctive silhouette even though the first Shine is before this ascent.
  for (let j = 0; j < 70; j++) {
    const t = j / 69, a = -Math.PI * .8 + t * TAU * 1.15, radius = 9.5 - t * 2.3;
    const x = 40 + Math.cos(a) * radius, z = -11 + Math.sin(a) * radius, y = 5.8 + t * 6.5;
    const next = a + .12, nx = 40 + Math.cos(next) * radius, nz = -11 + Math.sin(next) * radius;
    for (let off = -.7; off <= .7; off += .22)
      b.egg.tube([V(x + Math.cos(a) * off, y, z + Math.sin(a) * off), V(nx + Math.cos(next) * off, y + .1, nz + Math.sin(next) * off)], .13, 6);
    if (j % 2 === 0) colliders.push({ minX: x - .75, maxX: x + .75, minZ: z - .75, maxZ: z + .75, bottom: y - .32, top: y + .15, kind: 'spiral-path' });
  }

  const bridgeA = V(24, 6.2, -25), bridgeB = V(35.5, 6.2, -19);
  const bridgeDir = bridgeB.clone().sub(bridgeA), bridgeLength = bridgeDir.length(), normal = V(-bridgeDir.z, 0, bridgeDir.x).normalize();
  for (let s = 0; s <= bridgeLength; s += .24) {
    const p = bridgeA.clone().lerp(bridgeB, s / bridgeLength);
    b.toasted.tube([p.clone().addScaledVector(normal, -1.5), p.clone().addScaledVector(normal, 1.5)], .15, 6);
  }
  for (const side of [-1, 1]) {
    const a = bridgeA.clone().addScaledVector(normal, side * 1.45), c = bridgeB.clone().addScaledVector(normal, side * 1.45);
    suspendedRope(a.clone().add(V(0, 1.2, 0)), c.clone().add(V(0, 1.2, 0)), .25, .095, 'egg');
    for (let j = 0; j <= 8; j++) {
      const p = a.clone().lerp(c, j / 8); b.egg.tube([p, p.clone().add(V(0, 1.3, 0))], .13, 6);
    }
  }
  for (let j = 0; j < 16; j++) {
    const p = bridgeA.clone().lerp(bridgeB, j / 15);
    colliders.push({ minX: p.x - 1.15, maxX: p.x + 1.15, minZ: p.z - 1.15, maxZ: p.z + 1.15, bottom: 5.9, top: 6.38, kind: 'bridge' });
  }

  // Defeating the first boss restores the buried road. The same progress value
  // raises this visible noodle deck and its heightAt support, so it is an actual
  // traversable incline rather than a decorative victory animation.
  const restoredRoad = new THREE.Group(); restoredRoad.name = 'Restored spaghetti road to the bridge'; restoredRoad.visible = false; group.add(restoredRoad);
  const roadNoodles = new PastaBatch(materials.egg), roadEdges = new PastaBatch(materials.toasted);
  for (let strip = 0; strip <= 12; strip++) {
    const offset = -1.25 + strip * 2.5 / 12, pts = [];
    for (let j = 0; j <= 36; j++) {
      const u = j / 36, wobble = Math.sin(u * Math.PI * 5 + strip * .7) * .012;
      pts.push(V(lerp(roadStart.x, roadEnd.x, u) + roadNormal.x * (offset + wobble), roadTargetY(u) - .115,
        lerp(roadStart.z, roadEnd.z, u) + roadNormal.z * (offset + wobble)));
    }
    roadNoodles.tube(pts, .115, 7);
  }
  for (const side of [-1, 1]) {
    const pts = [];
    for (let j = 0; j <= 36; j++) {
      const u = j / 36;
      pts.push(V(lerp(roadStart.x, roadEnd.x, u) + roadNormal.x * side * 1.25, roadTargetY(u) - .15,
        lerp(roadStart.z, roadEnd.z, u) + roadNormal.z * side * 1.25));
    }
    roadEdges.tube(pts, .15, 7);
  }
  for (let j = 0; j <= 14; j++) {
    const u = j / 14, x = lerp(roadStart.x, roadEnd.x, u), z = lerp(roadStart.z, roadEnd.z, u), y = roadTargetY(u) - .25;
    roadEdges.tube([V(x - roadNormal.x * 1.25, y, z - roadNormal.z * 1.25), V(x + roadNormal.x * 1.25, y, z + roadNormal.z * 1.25)], .10, 6);
  }
  const roadMeshes = [roadNoodles.finish(restoredRoad, 'Rising fresh spaghetti road'), roadEdges.finish(restoredRoad, 'Toasted pasta road edges')];
  const roadStates = roadMeshes.map(mesh => {
    const attribute = mesh.geometry.attributes.position, final = attribute.array.slice(), initial = attribute.array.slice();
    for (let i = 0; i < final.length; i += 3) {
      const x = final[i], z = final[i + 2];
      initial[i + 1] = baseHeightAt(x, z) + final[i + 1] - roadTargetY(roadU(x, z));
    }
    attribute.setUsage(THREE.DynamicDrawUsage);
    return { mesh, attribute, final, initial };
  });
  function setRoadProgress(value) {
    const next = clamp(Number.isFinite(value) ? value : 0, 0, 1);
    if (next === roadProgress) return;
    roadProgress = next; restoredRoad.visible = next > .001;
    for (const state of roadStates) {
      const positions = state.attribute.array;
      for (let i = 1; i < positions.length; i += 3) positions[i] = lerp(state.initial[i], state.final[i], next);
      state.attribute.needsUpdate = true;
      state.mesh.geometry.computeVertexNormals();
      state.mesh.geometry.computeBoundingSphere();
    }
  }

  // Distant folded pasta ridges and loose angel-hair clouds form the horizon.
  for (let mountain = 0; mountain < 18; mountain++) {
    const a = (mountain / 18) * TAU, x = 5 + Math.cos(a) * 95, z = -6 + Math.sin(a) * 80;
    if (z > 42 && x > -55 && x < 58) continue;
    const ht = 10 + rng() * 20, radius = 12 + rng() * 9;
    for (let layer = 0; layer < 18; layer++) {
      const t = layer / 18, rr = radius * (1 - t * .88), y = -3 + t * ht;
      distant.tube(ring(x, y, z, rr, rr * .7, 42, .55, layer + mountain), .55, 6);
    }
  }
  for (const [x, y, z, scale] of [[-48, 39, -75, 1.1], [-10, 49, -90, 1.5], [48, 43, -86, 1.3], [84, 48, -18, .8], [-82, 42, 5, .9]]) {
    for (let n = 0; n < 10; n++) {
      const pts = [], ox = (rng() - .5) * 10 * scale, oy = (rng() - .5) * 2.8 * scale, oz = (rng() - .5) * 2 * scale;
      for (let j = 0; j <= 50; j++) {
        const a = j / 50 * TAU * 2.7;
        pts.push(V(x + ox + Math.cos(a) * (2.8 - j * .025) * scale, y + oy + Math.sin(a) * 1.35 * scale, z + oz + j * .035 * scale));
      }
      b.cream.tube(pts, .22 * scale, 6);
    }
  }

  // Sprinkler arches at the entrance emit continuous pale noodles, so even the
  // original wet-slope landmark remains an exclusively pasta construction.
  for (const [x, z] of [[-46.4, 28], [-35.5, 21]]) {
    const y = heightAt(x, z);
    b.toasted.tube([V(x, y, z), V(x, y + 1.7, z)], .17, 7);
    for (let n = 0; n < 5; n++) {
      const pts = [];
      for (let j = 0; j <= 20; j++) {
        const t = j / 20, side = x < -40 ? 1 : -1;
        pts.push(V(x + side * t * 5, y + 1.7 + Math.sin(t * Math.PI) * 2 - t * 1.7, z + (n - 2) * .17 + t * .8));
      }
      b.cream.tube(pts, .04, 5);
    }
  }

  // The river rope deforms under the player's load. Reused cylinder instances
  // avoid allocating geometry during play; its collision height uses the same sag.
  const noodleGeom = new THREE.CylinderGeometry(.073, .073, 1, 6, 1, true);
  const ropeInstances = new THREE.InstancedMesh(noodleGeom, materials.egg, 3 * 32);
  ropeInstances.castShadow = true; ropeInstances.receiveShadow = true; ropeInstances.name = 'Load-bearing braided spaghetti crossing'; group.add(ropeInstances);
  const dummy = new THREE.Object3D(), up = V(0, 1, 0), v1 = V(0, 0, 0), v2 = V(0, 0, 0);
  function updateRiverRope(time) {
    let id = 0;
    for (let braid = 0; braid < 3; braid++) for (let i = 0; i < 32; i++) {
      const t1 = i / 32, t2 = (i + 1) / 32;
      const a1 = t1 * TAU * 9 + braid * TAU / 3, a2 = t2 * TAU * 9 + braid * TAU / 3;
      v1.set(-37 + Math.cos(a1) * .07, ropeY(9.5 + t1 * 9.5) + Math.sin(a1) * .06, 9.5 + t1 * 9.5);
      v2.set(-37 + Math.cos(a2) * .07, ropeY(9.5 + t2 * 9.5) + Math.sin(a2) * .06, 9.5 + t2 * 9.5);
      dummy.position.copy(v1).add(v2).multiplyScalar(.5); const delta = v2.clone().sub(v1);
      dummy.quaternion.setFromUnitVectors(up, delta.clone().normalize()); dummy.scale.set(1, delta.length(), 1); dummy.updateMatrix(); ropeInstances.setMatrixAt(id++, dummy.matrix);
    }
    ropeInstances.instanceMatrix.needsUpdate = true;
  }
  updateRiverRope(0);
  for (const z of [9.3, 19.2]) {
    const y = heightAt(-37, z);
    for (const x of [-37.6, -36.4]) b.toasted.tube([V(x, y, z), V(x, y + .85, z)], .11, 6);
  }

  // Flexible spaghetti shoots around the village bend in response to contact.
  for (let i = 0; i < 105; i++) {
    const x = -48 + rng() * 66, z = -29 + rng() * 60;
    if (surfaceAt(x, z) === 'water') continue;
    if (route.some((p, k) => k < route.length - 1 && nearSegment(x, z, ...p, ...route[k + 1]) < 2.2)) continue;
    windPlants.push({ x, z, y: heightAt(x, z), phase: rng() * TAU, height: .45 + rng() * .7, leanX: 0, leanZ: 0 });
  }
  const shoots = new THREE.InstancedMesh(new THREE.CylinderGeometry(.045, .065, 1, 5, 1, true), materials.spinach, windPlants.length * 5);
  shoots.name = 'Flexible spinach spaghetti shoots'; shoots.castShadow = true; shoots.receiveShadow = true; group.add(shoots);

  land.finish(group, 'Corrugated spinach lasagna terrain', false);
  distant.finish(group, 'Layered pasta horizon', false);
  for (const [key, batch] of Object.entries(b)) batch.finish(group, `${key} pasta strands and sheets`, key !== 'blue');

  function update(dt, time, player) {
    for (const m of mills) m.group.rotation[m.axis] += dt * m.rate;
    const p = player?.position || player?.pos || player || { x: -1000, z: -1000 };
    const onRope = Math.abs(p.x + 37) < 1 && p.z > 9 && p.z < 20;
    ropeLoad += ((onRope ? 1 : 0) - ropeLoad) * Math.min(1, dt * 7);
    updateRiverRope(time);
    let index = 0;
    for (const plant of windPlants) {
      const dx = plant.x - p.x, dz = plant.z - p.z, dist = Math.hypot(dx, dz);
      const push = Math.max(0, 1 - dist / 1.45);
      const tx = Math.sin(time * 1.1 + plant.phase) * .12 + dx / Math.max(.2, dist) * push * .9;
      const tz = Math.cos(time * 1.3 + plant.phase) * .10 + dz / Math.max(.2, dist) * push * .9;
      plant.leanX += (tx - plant.leanX) * Math.min(1, dt * 7); plant.leanZ += (tz - plant.leanZ) * Math.min(1, dt * 7);
      for (let j = 0; j < 5; j++) {
        const a = j / 5 * TAU, h = plant.height * (.75 + (j % 2) * .25);
        v1.set(plant.x + Math.cos(a) * .13, plant.y + .11, plant.z + Math.sin(a) * .13);
        v2.copy(v1).add(V(plant.leanX + Math.cos(a) * .19, h * (1 - push * .4), plant.leanZ + Math.sin(a) * .19));
        dummy.position.copy(v1).add(v2).multiplyScalar(.5); const delta = v2.clone().sub(v1);
        dummy.quaternion.setFromUnitVectors(up, delta.clone().normalize()); dummy.scale.set(1, delta.length(), 1); dummy.updateMatrix(); shoots.setMatrixAt(index++, dummy.matrix);
      }
    }
    shoots.instanceMatrix.needsUpdate = true;
  }
  update(0, 0, { x: -43, z: 36 });
  return {
    group, heightAt, surfaceAt, colliders, update, setRoadProgress,
    landmarks: { spawn: { x: -43, z: 36 }, boss: { x: 22, z: -25 }, wheel: { x: -5, z: 13 }, village: { x: -27, z: 0 }, windmill: { x: 40, z: -11 } },
    bridge: { start: bridgeA, end: bridgeB, height: 6.38 },
    bounds,
    cleanup() { group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); scene.remove(group); }
  };
}
