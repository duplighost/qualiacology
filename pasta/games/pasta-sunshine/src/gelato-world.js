import * as THREE from '../vendor/three.module.js';

const TAU = Math.PI * 2;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function rng(seed = 94721) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }

class PastaBatch {
  constructor(material) { this.material = material; this.p = []; this.n = []; this.uv = []; this.index = []; }
  tube(points, radius = .1, sides = 6) {
    if (points.length < 2) return;
    const first = this.p.length / 3, tangent = V(), side = V(), binormal = V(), axis = V(); let length = 0;
    for (let j = 0; j < points.length; j++) {
      tangent.subVectors(points[Math.min(points.length - 1, j + 1)], points[Math.max(0, j - 1)]).normalize();
      axis.set(Math.abs(tangent.y) > .94 ? 1 : 0, Math.abs(tangent.y) > .94 ? 0 : 1, 0); side.crossVectors(tangent, axis).normalize(); binormal.crossVectors(tangent, side).normalize();
      if (j) length += points[j].distanceTo(points[j - 1]);
      for (let k = 0; k <= sides; k++) {
        const a = k / sides * TAU, normal = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(binormal, Math.sin(a));
        const p = points[j].clone().addScaledVector(normal, radius); this.p.push(p.x, p.y, p.z); this.n.push(normal.x, normal.y, normal.z); this.uv.push(length, k / sides);
      }
    }
    for (let j = 0; j < points.length - 1; j++) for (let k = 0; k < sides; k++) { const a = first + j * (sides + 1) + k, b = a + sides + 1; this.index.push(a, b, a + 1, b, b + 1, a + 1); }
  }
  sheet(rows, cols, fn, flip = false) {
    const first = this.p.length / 3;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const u = i / cols, v = j / rows, d = .001, p = fn(u, v), du = fn(clamp(u + d), v).sub(fn(clamp(u - d), v)), dv = fn(u, clamp(v + d)).sub(fn(u, clamp(v - d)));
      const n = du.cross(dv).normalize(); if (flip) n.negate(); this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(u * 5, v * 5);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = first + j * (cols + 1) + i, b = a + cols + 1; if (flip) this.index.push(a, b, a + 1, a + 1, b, b + 1); else this.index.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  geometry() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.index); g.computeBoundingSphere(); return g; }
  finish(parent, name, shadow = true) { if (!this.p.length) return null; const mesh = new THREE.Mesh(this.geometry(), this.material); mesh.name = name; mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); this.p = this.n = this.uv = this.index = null; return mesh; }
}
function noodleLine(a, b, segments = 14, wiggle = .025, phase = 0) { return Array.from({ length: segments + 1 }, (_, i) => { const t = i / segments; return V(mix(a.x, b.x, t) + Math.sin(t * 13 + phase) * wiggle, mix(a.y, b.y, t) + Math.sin(t * 9 + phase) * wiggle, mix(a.z, b.z, t) + Math.cos(t * 11 + phase) * wiggle); }); }
function ring(x, y, z, rx, rz, count = 32, wave = .02) { return Array.from({ length: count + 1 }, (_, i) => { const a = i / count * TAU; return V(x + Math.cos(a) * rx, y + Math.sin(a * 7) * wave, z + Math.sin(a) * rz); }); }
function boxLoop(x, y, z, w, d) { return [V(x - w / 2, y, z - d / 2), V(x + w / 2, y, z - d / 2), V(x + w / 2, y, z + d / 2), V(x - w / 2, y, z + d / 2), V(x - w / 2, y, z - d / 2)]; }

export function createGelatoWorld(scene, materials) {
  const random = rng(), group = new THREE.Group(); group.name = 'Gelato Beach and the Dune Bud pasta secret'; scene.add(group);
  const beachGroup = new THREE.Group(), secretGroup = new THREE.Group(); beachGroup.name = 'Gelato all-pasta beach'; secretGroup.name = 'Pasta sandcastle secret'; group.add(beachGroup, secretGroup); secretGroup.visible = false;
  const keys = ['egg', 'cream', 'tomato', 'spinach', 'ink', 'blue', 'gold', 'toasted'];
  const b = Object.fromEntries(keys.map(k => [k, new PastaBatch(materials[k] || materials.egg)]));
  const sea = new PastaBatch(materials.lake || materials.blue), pale = new PastaBatch(materials.pale || materials.cream);
  const beachColliders = [], secretColliders = [], beachSupports = [], blocks = [], blockHash = new Map(), looseRopes = [];
  const beachBounds = { x0: -60, x1: 62, z0: -48, z1: 50 }, secretBounds = { x0: -23, x1: 31, z0: -77, z1: 18 };
  let mode = 'beach', elapsed = 0, castleProgress = 0, budCharge = 0, blocksCrossed = 0, softMesh, hardMesh, ropeMesh;
  const dummy = new THREE.Object3D(), up = V(0, 1, 0), delta = V(), midpoint = V(), zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  const secretSpawn = V(0, 0, 10), secretGoal = V(-3, 10.7, -48.5), secretOneUp = V(6, 10.2, -60.5);
  const safePads = [{ x: 0, z: 10, w: 8, d: 8, y: 0 }, { x: 0, z: -14, w: 8, d: 8, y: 0 }];

  function baseBeachHeight(x, z) {
    const island = Math.hypot(x + 40, z - 29);
    if (island < 4.4) return -.12 + 1.12 * smooth((4.4 - island) / 1.4);
    const peninsula = ((x + 7) / 12) ** 2 + ((z - 9) / 15) ** 2;
    const coast = 12 + Math.sin(x * .08) * 2.2 + Math.cos(x * .17) * 1.2;
    const main = x > -55 && x < 55 && z > -42 && z < coast + 2.8;
    if (!main && peninsula > 1.15) return -1.1;
    let height = main ? 1.2 + Math.sin(x * .14) * Math.cos(z * .12) * .15 : -1.1;
    if (main && z > coast - 1.5 && peninsula > .9) height = mix(1.2, -.65, smooth((z - coast + 1.5) / 4.3));
    if (peninsula < 1.15) height = Math.max(height, mix(-1.1, 1.28, smooth((1.15 - peninsula) / .35)));
    height += smooth((-z - 6) / 25) * (3.5 + Math.sin(x * .1) * 1.0);
    height += smooth((-z - 28) / 12) * 7.0;
    return height;
  }
  function beachHeightAt(x, z) {
    let h = baseBeachHeight(x, z);
    for (const p of beachSupports) {
      if (p.type === 'rect') { if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2) h = Math.max(h, p.y); }
      else { const dx = p.b.x - p.a.x, dz = p.b.z - p.a.z, len2 = dx * dx + dz * dz; const t = ((x - p.a.x) * dx + (z - p.a.z) * dz) / len2, lateral = ((x - p.a.x) * -dz + (z - p.a.z) * dx) / Math.sqrt(len2); if (t >= 0 && t <= 1 && Math.abs(lateral) < p.width / 2) h = Math.max(h, mix(p.a.y, p.b.y, t)); }
    }
    return h;
  }
  function hashKey(x, z) { return Math.floor(x / 3) + ',' + Math.floor(z / 3); }
  function secretHeightAt(x, z, ignore = -1) {
    let height = -80;
    for (const p of safePads) if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2) height = p.y;
    const candidates = blockHash.get(hashKey(x, z));
    if (candidates) for (const id of candidates) { const tile = blocks[id]; if (id !== ignore && tile.support && Math.abs(x - tile.x) <= 1.5 && Math.abs(z - tile.z) <= 1.5) height = Math.max(height, tile.y - tile.sag); }
    return height;
  }
  function heightAt(x, z) { return mode === 'secret' ? secretHeightAt(x, z) : beachHeightAt(x, z); }
  function surfaceAt(x, z) { const h = heightAt(x, z); return mode === 'secret' ? h < -50 ? 'void' : 'ground' : h < -.2 ? 'water' : 'ground'; }
  function platformMotionAt(x, z, y) {
    if (mode !== 'secret') return null;
    const candidates = blockHash.get(hashKey(x, z));
    if (candidates) for (const id of candidates) { const tile = blocks[id]; if (tile.support && !tile.stable && Math.abs(x - tile.x) <= 1.53 && Math.abs(z - tile.z) <= 1.53 && Math.abs(y - (tile.y - tile.previousSag)) < .16) return { x: 0, y: tile.previousSag - tile.sag, z: 0 }; }
    return null;
  }

  // Fine angel-hair dunes and a separately modeled layer of short pasta grains.
  for (let z = -42; z < 28; z += 2) for (let x = -55; x < 55; x += 2) {
    if (baseBeachHeight(x + 1, z + 1) < -.25) continue;
    b.cream.sheet(1, 2, (u, v) => { const px = x + u * 2, pz = z + v * 2; return V(px, Math.max(-.5, baseBeachHeight(px, pz)) - .10 + Math.sin(px * 8) * .02, pz); }, true);
  }
  for (let z = -41.8, row = 0; z <= 25; z += .48, row++) {
    let pts = [];
    for (let x = -55; x <= 55; x += .92) {
      const zz = z + Math.sin(x * .39 + row) * .12, h = baseBeachHeight(x, zz);
      if (h < -.2) { if (pts.length > 1) b.cream.tube(pts, .105, 5); pts = []; continue; }
      pts.push(V(x, h + .015, zz));
    }
    if (pts.length > 1) b.cream.tube(pts, .105, 5);
  }
  for (let layer = 0; layer < 8; layer++) b.egg.tube(ring(-40, -.35 + layer * .17, 29, 4.1 - layer * .08, 4.1 - layer * .08, 54, .07), .13, 6);
  for (let zz = 25.6; zz <= 32.4; zz += .24) {
    const r = Math.sqrt(Math.max(0, 3.4 * 3.4 - (zz - 29) ** 2)), pts = [];
    for (let j = 0; j <= 14; j++) { const x = -40 - r + j / 14 * r * 2; pts.push(V(x, baseBeachHeight(x, zz) + .02, zz)); }
    b.egg.tube(pts, .115, 6);
  }
  const grains = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.045, .20, 1, 5), materials.egg, 4200); grains.name = 'Individual tiny broken angel-hair grains'; grains.castShadow = false; grains.receiveShadow = true;
  let grainCount = 0;
  for (let attempt = 0; attempt < 8000 && grainCount < 4200; attempt++) {
    const x = -53 + random() * 107, z = -39 + random() * 64, y = baseBeachHeight(x, z); if (y < -.15) continue;
    dummy.position.set(x, y + .10, z); dummy.rotation.set(Math.PI / 2 + (random() - .5) * .2, random() * TAU, random() * TAU); dummy.scale.setScalar(.65 + random() * .7); dummy.updateMatrix(); grains.setMatrixAt(grainCount++, dummy.matrix);
  }
  grains.count = grainCount; beachGroup.add(grains);

  function beachDeck(x, z, w, d, y, mat = 'egg') {
    beachSupports.push({ type: 'rect', x, z, w, d, y });
    for (let zz = z - d / 2; zz <= z + d / 2; zz += .24) b[mat].tube(noodleLine(V(x - w / 2, y - .10, zz), V(x + w / 2, y - .10, zz), 14, .025, zz), .115, 6);
    for (let k = 0; k < 4; k++) b.toasted.tube(boxLoop(x, y - .1 - k * .21, z, w, d), .12, 6);
  }
  function beachRamp(a, c, width) {
    beachSupports.push({ type: 'ramp', a, b: c, width }); const dx = c.x - a.x, dz = c.z - a.z, len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len;
    for (let off = -width / 2; off <= width / 2; off += .23) b.egg.tube(noodleLine(V(a.x + nx * off, a.y - .10, a.z + nz * off), V(c.x + nx * off, c.y - .10, c.z + nz * off), 24, .022, off), .115, 6);
  }
  function post(x, z, y, h, radius = .25, mat = 'toasted') {
    for (let strand = 0; strand < 5; strand++) {
      const pts = [];
      for (let j = 0; j <= 24; j++) { const t = j / 24, a = t * TAU * 2.5 + strand / 5 * TAU; pts.push(V(x + Math.cos(a) * radius * .6, y + t * h, z + Math.sin(a) * radius * .6)); }
      b[mat].tube(pts, radius * .37, 6);
    }
  }
  function bowtie(batch, center, size, yaw = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    batch.sheet(4, 8, (u, v) => { const x = (u * 2 - 1) * size, z = (v * 2 - 1) * (.18 + Math.abs(u * 2 - 1) * .78) * size; return V(center.x + x * c + z * s, center.y + Math.sin(v * Math.PI * 6) * .085 * size, center.z - x * s + z * c); }, true);
  }
  function palm(x, z, scale = 1, lean = .6) {
    const y = beachHeightAt(x, z), top = y + 6.2 * scale;
    for (let strand = 0; strand < 6; strand++) {
      const pts = [];
      for (let j = 0; j <= 32; j++) { const t = j / 32, a = t * TAU * 3.4 + strand / 6 * TAU; pts.push(V(x + t * t * lean + Math.cos(a) * .25 * scale, y + t * 6.2 * scale, z + Math.sin(a) * .25 * scale)); }
      b.toasted.tube(pts, .115 * scale, 6);
    }
    for (let leaf = 0; leaf < 8; leaf++) {
      const a = leaf / 8 * TAU + x, pts = [];
      for (let j = 0; j <= 15; j++) { const t = j / 15; pts.push(V(x + lean + Math.cos(a) * t * 3.0 * scale, top + Math.sin(t * Math.PI) * 1.05 * scale - t * 1.15 * scale, z + Math.sin(a) * t * 3.0 * scale)); }
      b.spinach.tube(pts, .12 * scale, 6); for (let j = 3; j < 13; j += 2) bowtie(b.spinach, pts[j], .42 * scale, a + Math.PI / 2);
    }
    for (let n = 0; n < 4; n++) b.gold.tube(ring(x + lean + Math.cos(n * 1.6) * .30, top - .3, z + Math.sin(n * 1.6) * .30, .24, .23, 16), .13, 6);
  }
  beachDeck(-31, 12, 10, 8, 1.45, 'toasted'); beachRamp(V(-35, -.15, 20), V(-31, 1.45, 15), 4.0);
  function cabana(x, z, w, d, y, colour = 'tomato') {
    for (const dx of [-w / 2 + .2, w / 2 - .2]) for (const dz of [-d / 2 + .2, d / 2 - .2]) { post(x + dx, z + dz, y, 4.0, .25); beachColliders.push({ minX: x + dx - .18, maxX: x + dx + .18, minZ: z + dz - .18, maxZ: z + dz + .18, bottom: y, top: y + 4, kind: 'cabana-penne-post' }); }
    for (let xx = x - w / 2 - .55; xx <= x + w / 2 + .55; xx += .25) for (const side of [-1, 1]) b[colour].tube(noodleLine(V(xx, y + 5.5, z), V(xx, y + 3.8, z + side * (d / 2 + .6)), 14, .04, xx), .15, 6);
    b.egg.tube([V(x - w / 2 - .6, y + 5.5, z), V(x + w / 2 + .6, y + 5.5, z)], .22, 7);
    // The serving counter is stacked lasagna wrapped with separate spaghetti.
    for (let yy = y + .2; yy < y + 1.3; yy += .20) b.cream.tube(boxLoop(x, yy, z - d * .23, w * .70, 1.1), .12, 6);
    for (let xx = x - w * .35; xx <= x + w * .35; xx += .23) b.egg.tube([V(xx, y + 1.35, z - d * .23 - .65), V(xx, y + 1.35, z - d * .23 + .65)], .12, 6);
  }
  cabana(-31, 12, 8.5, 6.2, 1.45); cabana(37, 5, 7.5, 6.5, beachHeightAt(37, 5), 'toasted');
  [[-43, 9, 1.0, .6], [-24, 9, .9, -.7], [-16, 2, 1.1, .8], [-1, -3, .9, -.5], [9, 6, 1, .6], [30, 8, 1.1, -.7], [45, -4, 1.1, .7], [-45, -14, 1, -.6], [-28, -18, 1.1, .7], [34, -22, .9, -.8], [-39, 29, .55, .25]].forEach(p => palm(...p));

  // Sand Bird tower, egg and three mirror stations. Every reflector surface is
  // glossy folded pasta, with warm egg-noodle rims instead of metal or glass.
  const towerX = 17, towerZ = -8, towerBase = beachHeightAt(towerX, towerZ);
  for (let layer = 0; layer < 67; layer++) b.cream.tube(ring(towerX, towerBase + layer * .23, towerZ, 2.8 - layer * .007, 2.8 - layer * .007, 48, .035), .145, 7);
  for (let layer = 0; layer < 4; layer++) b.toasted.tube(ring(towerX, towerBase + 15.5 + layer * .17, towerZ, 3.25, 3.25, 52), .14, 6);
  const eggY = towerBase + 19.1;
  for (let band = 0; band < 37; band++) {
    const u = band / 36, yy = -3 + u * 6, radius = Math.sqrt(Math.max(.01, 1 - (yy / 3.2) ** 2)) * (2.2 - u * .20);
    b.egg.tube(ring(towerX, eggY + yy, towerZ, radius, radius, 44, .025), .11, 7);
  }
  for (let n = 0; n < 12; n++) {
    const a = n * 2.399, yy = eggY - 1.8 + (n % 5) * .8, radial = Math.sqrt(Math.max(.1, 1 - ((yy - eggY) / 3.2) ** 2)) * 2.12;
    const pts = [];
    for (let j = 0; j <= 22; j++) { const th = j / 22 * TAU * 1.5; pts.push(V(towerX + Math.cos(a + Math.cos(th) * .13) * (radial + .06), yy + Math.sin(th) * .30, towerZ + Math.sin(a + Math.cos(th) * .13) * (radial + .06))); }
    b.tomato.tube(pts, .07, 6);
  }
  beachColliders.push({ minX: towerX - 2.8, maxX: towerX + 2.8, minZ: towerZ - 2.8, maxZ: towerZ + 2.8, bottom: towerBase, top: towerBase + 15.7, kind: 'sand-bird-pasta-tower' });
  for (const [x, z, yaw] of [[9, -8, .4], [24, -3, -.5], [22, -19, .2]]) {
    const y = beachHeightAt(x, z); post(x, z, y, 4.0, .38, 'cream');
    const center = V(x, y + 4, z), normal = V(Math.sin(yaw) * .3, 1, Math.cos(yaw) * .35).normalize(), ux = V(1, 0, 0), uz = V().crossVectors(ux, normal).normalize();
    for (let rr = .12; rr < 2.35; rr += .22) {
      const pts = [];
      for (let j = 0; j <= 48; j++) { const a = j / 48 * TAU; pts.push(center.clone().addScaledVector(ux, Math.cos(a) * rr).addScaledVector(uz, Math.sin(a) * rr).addScaledVector(normal, .12 * rr * rr)); }
      b.gold.tube(pts, .105, 6);
    }
    const pts = []; for (let j = 0; j <= 48; j++) { const a = j / 48 * TAU; pts.push(center.clone().addScaledVector(ux, Math.cos(a) * 2.42).addScaledVector(uz, Math.sin(a) * 2.42).addScaledVector(normal, .65)); } b.cream.tube(pts, .18, 7);
  }
  // Suspended spaghetti ropes above the rear cliffs.
  for (let x = -43; x <= 42; x += 17) post(x, -31, beachHeightAt(x, -31), 4.2, .28, 'toasted');
  for (let x = -43; x < 42; x += 17) for (let braid = 0; braid < 3; braid++) {
    const a = V(x, beachHeightAt(x, -31) + 3.8, -31), c = V(x + 17, beachHeightAt(x + 17, -31) + 3.8, -31), pts = [];
    for (let j = 0; j <= 36; j++) { const t = j / 36, th = t * TAU * 8 + braid / 3 * TAU; pts.push(V(mix(a.x, c.x, t), mix(a.y, c.y, t) - Math.sin(t * Math.PI) * 1.2 + Math.sin(th) * .055, -31 + Math.cos(th) * .055)); }
    b.egg.tube(pts, .07, 6);
  }
  for (let coral = 0; coral < 28; coral++) {
    const x = 22 + random() * 29, z = 20 + random() * 17, base = -.85;
    for (let arm = 0; arm < 4; arm++) { const a = arm / 4 * TAU + coral, pts = []; for (let j = 0; j <= 14; j++) { const t = j / 14; pts.push(V(x + Math.cos(a) * t * .65 + Math.sin(t * 8) * .08, base + t * (1 + random() * .05), z + Math.sin(a) * t * .65)); } b[coral % 2 ? 'tomato' : 'spinach'].tube(pts, .08, 6); }
  }

  function pianta(x, z, colour = 'gold', yaw = 0) {
    const base = beachHeightAt(x, z), c = Math.cos(yaw), s = Math.sin(yaw), pt = p => V(x + p.x * c + p.z * s, base + p.y, z - p.x * s + p.z * c);
    const tube = (mat, points, radius) => b[mat].tube(points.map(pt), radius, 6);
    for (const side of [-1, 1]) {
      for (let j = 0; j < 4; j++) tube('toasted', ring(side * .3, .15 + j * .055, .12, .25 - j * .02, .34 - j * .02, 16), .075);
      tube(colour, noodleLine(V(side * .3, .2, 0), V(side * .3, .8, 0), 12, .05, side), .14);
      for (let j = 0; j < 3; j++) tube(colour, [V(side * .48, 1.5 + j * .065, 0), V(side * .75, 1.3 + j * .065, .05), V(side * .80, 1.02 + j * .065, .23)], .08);
    }
    for (let j = 0; j <= 14; j++) { const t = j / 14, r = .28 + Math.sin(t * Math.PI) * .39; tube(colour, ring(0, .65 + t * 1.15, 0, r, r * .78, 24), .085); }
    for (let j = 0; j < 24; j++) { const a = j / 24 * TAU; tube('egg', [V(Math.cos(a) * .57, .62, Math.sin(a) * .45), V(Math.cos(a) * .65, .98, Math.sin(a) * .51)], .065); }
    for (let j = 0; j <= 9; j++) { const t = j / 9, r = Math.sin((.1 + t * .8) * Math.PI) * .41; tube(colour, ring(0, 1.70 + t * .75, .03, r, r * .85, 22), .08); }
    for (const side of [-1, 1]) { const pts = []; for (let j = 0; j <= 12; j++) { const a = j / 12 * TAU; pts.push(V(side * .14 + Math.cos(a) * .055, 2.11 + Math.sin(a) * .08, .405)); } tube('ink', pts, .03); }
    for (let j = 0; j < 5; j++) { const a = j / 5 * TAU; tube(colour, [V(Math.cos(a) * .07, 2.0 + Math.sin(a) * .07, .32), V(Math.cos(a) * .09, 1.99 + Math.sin(a) * .09, .63)], .06); }
    for (let j = 0; j < 6; j++) { const a = j / 6 * TAU, pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(V(Math.cos(a) * t * .75, 2.45 + Math.sin(t * Math.PI) * .32 - t * .10, Math.sin(a) * t * .75)); } tube('spinach', pts, .075); bowtie(b.spinach, pt(pts[7]), .23, a + yaw); }
  }
  pianta(-31, 9, 'gold'); pianta(-14.5, 15.5, 'tomato', .8); pianta(8, 10, 'blue', -.6);

  const duneBud = V(-10, beachHeightAt(-10, 18) + .65, 18), portal = V(2, beachHeightAt(2, 13) + .05, 13);
  const budGroup = new THREE.Group(); budGroup.name = 'Sprayable farfalle Dune Bud'; budGroup.position.set(duneBud.x, duneBud.y - .65, duneBud.z); beachGroup.add(budGroup);
  const budPasta = new PastaBatch(materials.spinach), budCore = new PastaBatch(materials.egg);
  for (let n = 0; n < 6; n++) {
    const a = n / 6 * TAU, pts = [];
    for (let j = 0; j <= 16; j++) { const t = j / 16; pts.push(V(Math.cos(a) * Math.sin(t * Math.PI) * .5, t * .9, Math.sin(a) * Math.sin(t * Math.PI) * .5)); }
    budPasta.tube(pts, .095, 6);
  }
  for (let layer = 0; layer < 4; layer++) budCore.tube(ring(0, .05 + layer * .10, 0, .45 - layer * .04, .45 - layer * .04, 24), .09, 6);
  budPasta.finish(budGroup, 'Spinach pasta bud leaves'); budCore.finish(budGroup, 'Spaghetti bud roots');
  const portalGroup = new THREE.Group(); portalGroup.name = 'Temporary rising pasta sandcastle gateway'; beachGroup.add(portalGroup);
  const castlePasta = new PastaBatch(materials.cream), castleTrim = new PastaBatch(materials.egg), castleGold = new PastaBatch(materials.gold);
  for (const x of [-3.4, 3.4]) {
    for (let layer = 0; layer < 28; layer++) castlePasta.tube(boxLoop(x, layer * .21, 0, 3.1, 4.4), .13, 7);
    for (let cap = 0; cap < 3; cap++) for (let layer = 0; layer < 6; layer++) castleTrim.tube(boxLoop(x - 1 + cap, 5.9 + layer * .18, 0, .72, 4.5), .11, 6);
  }
  for (let layer = 0; layer < 9; layer++) castlePasta.tube(boxLoop(0, 4.35 + layer * .20, 0, 4.5, 4.0), .13, 7);
  // Actual open arch: no filled polygon or invisible wall across the doorway.
  for (let ringId = 0; ringId < 4; ringId++) {
    const pts = [];
    for (let j = 0; j <= 26; j++) { const a = j / 26 * Math.PI; pts.push(V(Math.cos(a) * (1.58 + ringId * .15), 2.5 + Math.sin(a) * (1.58 + ringId * .15), 2.1)); }
    castleTrim.tube(pts, .11, 7);
  }
  for (const x of [-1.6, 1.6]) for (let layer = 0; layer < 3; layer++) castleTrim.tube([V(x + Math.sign(x) * layer * .15, 0, 2.1), V(x + Math.sign(x) * layer * .15, 2.6, 2.1)], .11, 7);
  for (let layer = 0; layer < 5; layer++) castleGold.tube(boxLoop(0, 6.15 + layer * .16, 0, 1.4, 3.9), .11, 6);
  castlePasta.finish(portalGroup, 'Coiled spaghetti portal walls'); castleTrim.finish(portalGroup, 'Pasta arch and crenellations'); castleGold.finish(portalGroup, 'Golden pasta castle crest');
  portalGroup.visible = false;
  const portalBase = beachHeightAt(2, 11), portalColumns = [-3.4, 3.4].map(offset => ({ minX: 2 + offset - 1.55, maxX: 2 + offset + 1.55, minZ: 8.8, maxZ: 13.2, bottom: portalBase, top: portalBase, kind: 'pasta-sandcastle-column' }));
  beachColliders.push(...portalColumns);
  function setCastleProgress(t) {
    castleProgress = clamp(Number.isFinite(t) ? t : 0); portalGroup.visible = castleProgress > .015; portalGroup.position.set(2, portalBase - 7.2 * (1 - castleProgress), 11);
    for (const column of portalColumns) { column.top = portalBase - 7.2 * (1 - castleProgress) + 6.8; column.bottom = castleProgress > .2 ? portalBase : 100; }
  }
  function setBudCharge(t) { budCharge = clamp(Number.isFinite(t) ? t : 0); }

  // Ocean ribbons, pasta clouds, beach shell spirals and folded distant dunes.
  for (let z = -44, row = 0; z <= 54; z += .42, row++) {
    let pts = [];
    for (let x = -64; x <= 66; x += 1.0) {
      const zz = z + Math.sin(x * .28 + row) * .09;
      if (beachHeightAt(x, zz) > -.25) { if (pts.length > 1) sea.tube(pts, .16, 5); pts = []; continue; }
      pts.push(V(x, -.32 + Math.sin(x * .25 + z * .4) * .055, zz));
    }
    if (pts.length > 1) sea.tube(pts, .16, 5);
  }
  for (let n = 0; n < 90; n++) {
    const x = -50 + random() * 102, z = -8 + random() * 28, y = beachHeightAt(x, z); if (y < .1) continue;
    const pts = [];
    for (let j = 0; j <= 26; j++) { const t = j / 26, a = t * TAU * 2.1, r = .06 + t * .27; pts.push(V(x + Math.cos(a) * r, y + .12 + t * .04, z + Math.sin(a) * r)); }
    b[n % 3 ? 'egg' : 'tomato'].tube(pts, .045, 6);
  }
  for (const [x, y, z] of [[-48, 39, -70], [-6, 46, -84], [43, 42, -77], [75, 39, 5]]) for (let n = 0; n < 8; n++) {
    const pts = []; for (let j = 0; j <= 40; j++) { const a = j / 40 * TAU * 2.2; pts.push(V(x + (n - 3.5) * .9 + Math.cos(a) * 2.7, y + Math.sin(a) * 1.2 + Math.sin(n) * .7, z + j * .055)); } pale.tube(pts, .20, 6);
  }
  for (const [key, batch] of Object.entries(b)) batch.finish(beachGroup, `${key} Gelato pasta`);
  sea.finish(beachGroup, 'Individual spirulina ocean noodles', false); pale.finish(beachGroup, 'Pale capellini clouds', false);

  // Secret course topology: the safe pads are separate from the pale blocks.
  const secretRoute = [
    { x: 0, z: 10, y: 0, safe: true }, { x: 0, z: 6.1, y: 0, safe: true },
    { x: 0, z: 2, y: 0, jump: true }, { x: 0, z: -1, y: 0 }, { x: 0, z: -4, y: 0 }, { x: 0, z: -7, y: 0 },
    { x: 0, z: -14, y: 0, jump: true, safe: true }, { x: 0, z: -17.7, y: 0, safe: true },
    { x: 0, z: -21, y: 0, jump: true }, { x: 0, z: -24, y: 0 }, { x: 0, z: -27, y: 0 },
    { x: 3, z: -27, y: 0 }, { x: 6, z: -27, y: 0 }, { x: 9, z: -27, y: 0 },
    { x: 13.8, z: -27, y: 0, jump: true }, { x: 13.8, z: -30, y: 0 }, { x: 13.8, z: -33, y: 0 }, { x: 13.8, z: -36, y: 0 },
    { x: 13.8, z: -40.8, y: 0, jump: true }, { x: 10.8, z: -40.8, y: 0 }, { x: 7.8, z: -40.8, y: 0 }, { x: 4.8, z: -40.8, y: 0 }, { x: 1.8, z: -40.8, y: 0 },
    { x: 1.8, z: -45.5, y: 0, jump: true, safe: true }, { x: 6, z: -45.5, y: 0 }, { x: 9, z: -45.5, y: 0 },
    { x: 9, z: -48.5, y: 1.8, jump: true }, { x: 6, z: -48.5, y: 3.6, jump: true, safe: true },
    { x: 3, z: -48.5, y: 5.4, jump: true }, { x: 0, z: -48.5, y: 7.2, jump: true }, { x: -3, z: -48.5, y: 9, jump: true, safe: true }
  ];
  const uniqueBlocks = new Map();
  function addBlock(x, z, y, stable = false) {
    const key = [x, z, y].join(':'), old = uniqueBlocks.get(key); if (old !== undefined) { if (stable) blocks[old].stable = true; return blocks[old]; }
    const tile = { id: blocks.length, x, z, y, stable, age: -1, sag: 0, previousSag: 0, support: true, spawned: false, touched: false, slot: 0, impactX: 0, impactZ: 0 };
    uniqueBlocks.set(key, tile.id); blocks.push(tile); return tile;
  }
  for (const z of [2, -1, -4, -7]) addBlock(0, z, 0);
  for (const [x, z] of [[0, -21], [0, -24], [0, -27], [3, -27], [6, -27], [9, -27], [13.8, -27], [13.8, -30], [13.8, -33], [13.8, -36], [13.8, -40.8], [10.8, -40.8], [7.8, -40.8], [4.8, -40.8], [1.8, -40.8]]) addBlock(x, z, 0);
  for (let x = -9; x <= 12; x += 3) for (let z = -45.5; z >= -63.5; z -= 3) addBlock(x, z, 0, z === -45.5 && x >= 0 && x <= 3);
  // Two stepped horns; the near peak above the incoming route holds the Shine.
  const nearHeights = [[-9, 3.6], [-6, 7.2], [-3, 9], [0, 7.2], [3, 5.4], [6, 3.6], [9, 1.8]];
  for (const [x, height] of nearHeights) for (const z of [-48.5, -51.5]) for (let y = 1.8; y <= height + .01; y += 1.8) addBlock(x, z, Number(y.toFixed(1)), (x === -3 && Math.abs(y - 9) < .01) || (x === 6 && z === -48.5 && Math.abs(y - 3.6) < .01));
  const farHeights = [[-3, 1.8], [0, 3.6], [3, 7.2], [6, 9], [9, 7.2], [12, 3.6]];
  for (const [x, height] of farHeights) for (const z of [-60.5, -63.5]) for (let y = 1.8; y <= height + .01; y += 1.8) addBlock(x, z, Number(y.toFixed(1)), x === 6 && Math.abs(y - 9) < .01);
  for (const z of [-54.5, -57.5]) for (let y = 1.8; y <= 5.4 + .01; y += 1.8) addBlock(3, z, Number(y.toFixed(1)));
  for (const tile of blocks) for (let ix = Math.floor((tile.x - 1.5) / 3); ix <= Math.floor((tile.x + 1.5) / 3); ix++) for (let iz = Math.floor((tile.z - 1.5) / 3); iz <= Math.floor((tile.z + 1.5) / 3); iz++) { const key = ix + ',' + iz; if (!blockHash.has(key)) blockHash.set(key, []); blockHash.get(key).push(tile.id); }

  const sandGeometry = new PastaBatch(materials.cream);
  for (let row = 0; row < 13; row++) {
    const z = -1.35 + row * .225, pts = [];
    for (let j = 0; j <= 10; j++) { const t = j / 10; pts.push(V(-1.4 + t * 2.8, -.105 + Math.sin(t * 12 + row) * .022, z + Math.sin(t * 9 + row) * .027)); }
    sandGeometry.tube(pts, .105, 6);
  }
  for (let layer = 0; layer < 8; layer++) sandGeometry.tube(boxLoop(0, -.15 - layer * .22, 0, 2.8, 2.8), .12, 6);
  for (let strand = 0; strand < 7; strand++) sandGeometry.tube(noodleLine(V(-1.4 + strand * .46, -1.7, -1.35), V(-1.4 + strand * .46, -1.7, 1.35), 8, .025, strand), .11, 6);
  const noodleBlockGeometry = sandGeometry.geometry();
  const softCount = blocks.filter(t => !t.stable).length, hardCount = blocks.length - softCount;
  softMesh = new THREE.InstancedMesh(noodleBlockGeometry, materials.cream, softCount); softMesh.name = 'Individual collapsing spaghetti bundles'; softMesh.castShadow = true; softMesh.receiveShadow = true; softMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hardMesh = new THREE.InstancedMesh(noodleBlockGeometry, materials.tomato, hardCount); hardMesh.name = 'Stable orange pasta hard blocks'; hardMesh.castShadow = true; hardMesh.receiveShadow = true;
  let softIndex = 0, hardIndex = 0;
  for (const tile of blocks) { tile.slot = tile.stable ? hardIndex++ : softIndex++; dummy.position.set(tile.x, tile.y, tile.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); (tile.stable ? hardMesh : softMesh).setMatrixAt(tile.slot, dummy.matrix); }
  softMesh.computeBoundingSphere(); hardMesh.computeBoundingSphere(); secretGroup.add(softMesh, hardMesh);
  const safeBatch = new PastaBatch(materials.spinach), safeEdge = new PastaBatch(materials.toasted);
  for (const p of safePads) {
    for (let z = p.z - p.d / 2; z <= p.z + p.d / 2; z += .22) safeBatch.tube(noodleLine(V(p.x - p.w / 2, p.y - .105, z), V(p.x + p.w / 2, p.y - .105, z), 20, .022, z), .105, 6);
    for (let layer = 0; layer < 6; layer++) safeEdge.tube(boxLoop(p.x, p.y - .12 - layer * .22, p.z, p.w, p.d), .14, 7);
    for (let x = p.x - p.w / 2 + .2; x <= p.x + p.w / 2; x += .65) safeEdge.tube([V(x, -1.2, p.z - p.d / 2), V(x, -1.2, p.z + p.d / 2)], .13, 6);
  }
  safeBatch.finish(secretGroup, 'Stable green spinach spaghetti resting squares'); safeEdge.finish(secretGroup, 'Toasted pasta supports under safe squares');

  // Pastina stars and distant loose noodles keep the secret's backdrop empty
  // and dark while obeying the all-pasta visual constraint.
  const stars = new PastaBatch(materials.pale || materials.cream), distant = new PastaBatch(materials.blue);
  for (let star = 0; star < 190; star++) {
    const x = (random() - .5) * 120, y = (random() - .5) * 75, z = -20 + (random() - .5) * 145;
    if (Math.abs(x) < 24 && y > -10 && y < 18 && z > -70 && z < 20) continue;
    const size = .13 + random() * .22;
    for (let arm = 0; arm < 5; arm++) { const a = arm / 5 * TAU; stars.tube([V(x, y, z), V(x + Math.cos(a) * size, y + Math.sin(a) * size, z + .05)], .025, 5); }
  }
  for (const [x, y, z, scale] of [[-39, 14, -28, 3], [42, -7, -50, 4], [-25, -26, -63, 3], [31, 29, -80, 5]]) {
    const pts = [];
    for (let j = 0; j <= 90; j++) { const t = j / 90, a = t * TAU * 3; pts.push(V(x + Math.cos(a) * scale, y + Math.sin(a) * scale, z + t * 9)); }
    distant.tube(pts, .22, 7);
  }
  stars.finish(secretGroup, 'Pastina stars in the secret void', false); distant.finish(secretGroup, 'Distant loose pasta in the void', false);
  const segmentGeometry = new THREE.CylinderGeometry(.067, .067, 1, 6, 1, true);
  ropeMesh = new THREE.InstancedMesh(segmentGeometry, materials.egg, 8192); ropeMesh.name = 'Physically falling loose spaghetti strands'; ropeMesh.castShadow = true; ropeMesh.receiveShadow = true; ropeMesh.count = 0; ropeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ropeMesh.frustumCulled = false; secretGroup.add(ropeMesh);

  function emitCollapse(tile) {
    // Each freed strand uses Verlet particles, distance constraints and contact
    // against the remaining course. It is not a rigid cube that merely shrinks.
    for (let strand = 0; strand < 14; strand++) {
      const count = 7, p = new Float32Array(count * 3), previous = new Float32Array(count * 3), rest = new Float32Array(count - 1);
      const alongX = strand % 2 === 0, transverse = -.95 + (strand % 7) * .31, yy = tile.y - .15 - Math.floor(strand / 4) * .39;
      for (let j = 0; j < count; j++) {
        const along = -1.32 + j / (count - 1) * 2.64, index = j * 3;
        p[index] = tile.x + (alongX ? along : transverse) + (random() - .5) * .06;
        p[index + 1] = yy + Math.sin(j * .8 + strand) * .05;
        p[index + 2] = tile.z + (alongX ? transverse : along) + (random() - .5) * .06;
        const vx = tile.impactX * .15 + (random() - .5) * .65 + transverse * .15, vz = tile.impactZ * .15 + (random() - .5) * .65;
        previous[index] = p[index] - vx / 120; previous[index + 1] = p[index + 1] + (.10 + random() * .25) / 120; previous[index + 2] = p[index + 2] - vz / 120;
        if (j) rest[j - 1] = Math.hypot(p[index] - p[index - 3], p[index + 1] - p[index - 2], p[index + 2] - p[index - 1]);
      }
      looseRopes.push({ p, previous, rest, count, age: 0, source: tile.id });
    }
    // Old debris has already fallen far below view by this bounded pool limit.
    if (looseRopes.length > 1100) looseRopes.splice(0, looseRopes.length - 1100);
  }
  function updateLooseRopes(dt) {
    if (dt <= 0) return;
    const dt2 = dt * dt; let segment = 0;
    for (let r = looseRopes.length - 1; r >= 0; r--) {
      const rope = looseRopes[r]; rope.age += dt;
      if (rope.age > 7 || rope.p[1] < -45) { looseRopes.splice(r, 1); continue; }
      const { p, previous, count, rest } = rope;
      for (let j = 0; j < count; j++) {
        const k = j * 3, x = p[k], y = p[k + 1], z = p[k + 2];
        p[k] += (p[k] - previous[k]) * .993; p[k + 1] += (p[k + 1] - previous[k + 1]) * .993 - 18.5 * dt2; p[k + 2] += (p[k + 2] - previous[k + 2]) * .993;
        previous[k] = x; previous[k + 1] = y; previous[k + 2] = z;
      }
      for (let pass = 0; pass < 3; pass++) for (let j = 0; j < count - 1; j++) {
        const a = j * 3, c = a + 3, dx = p[c] - p[a], dy = p[c + 1] - p[a + 1], dz = p[c + 2] - p[a + 2], length = Math.hypot(dx, dy, dz) || 1, correction = (length - rest[j]) / length * .49;
        p[a] += dx * correction; p[a + 1] += dy * correction; p[a + 2] += dz * correction; p[c] -= dx * correction; p[c + 1] -= dy * correction; p[c + 2] -= dz * correction;
      }
      for (let j = 0; j < count; j++) {
        const k = j * 3, floor = secretHeightAt(p[k], p[k + 2], rope.source);
        if (floor > -50 && p[k + 1] < floor + .065 && previous[k + 1] > floor - .25) {
          p[k + 1] = floor + .065; previous[k + 1] = p[k + 1] + Math.max(0, previous[k + 1] - p[k + 1]) * .09;
          previous[k] = mix(previous[k], p[k], .23); previous[k + 2] = mix(previous[k + 2], p[k + 2], .23);
        }
      }
    }
    for (const rope of looseRopes) for (let j = 0; j < rope.count - 1 && segment < 8192; j++) {
      const a = j * 3, c = a + 3, p = rope.p; midpoint.set((p[a] + p[c]) * .5, (p[a + 1] + p[c + 1]) * .5, (p[a + 2] + p[c + 2]) * .5); delta.set(p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]);
      const length = delta.length(); dummy.position.copy(midpoint); dummy.quaternion.setFromUnitVectors(up, delta.multiplyScalar(1 / Math.max(.0001, length))); dummy.scale.set(1, length, 1); dummy.updateMatrix(); ropeMesh.setMatrixAt(segment++, dummy.matrix);
    }
    ropeMesh.count = segment; ropeMesh.instanceMatrix.needsUpdate = true;
  }
  function drawTile(tile) {
    if (tile.stable) return;
    if (!tile.support && tile.age < 9.05) softMesh.setMatrixAt(tile.slot, zeroMatrix);
    else {
      dummy.position.set(tile.x, tile.y - tile.sag, tile.z);
      const tilt = tile.age >= 0 && tile.age < 1.05 ? Math.sin(tile.age * 15 + tile.id) * tile.age * .022 : 0;
      dummy.rotation.set(tilt, 0, -tilt * .7); dummy.scale.set(1 + tile.sag * .05, Math.max(.45, 1 - tile.sag * .18), 1 + tile.sag * .05); dummy.updateMatrix(); softMesh.setMatrixAt(tile.slot, dummy.matrix);
    }
  }
  function update(dt, time, player) {
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .05); elapsed += dt;
    if (mode === 'beach') {
      budGroup.rotation.y = Math.sin(elapsed * .7) * .10 + budCharge * .25; budGroup.scale.set(1 + budCharge * .2, 1 + budCharge * .45, 1 + budCharge * .2);
      return;
    }
    const position = player?.position || player?.pos || player, grounded = player?.grounded !== false;
    let dirty = false;
    for (const tile of blocks) {
      if (tile.stable) continue;
      tile.previousSag = tile.sag;
      if (tile.age < 0 && position && grounded && Math.abs(position.x - tile.x) < 1.53 && Math.abs(position.z - tile.z) < 1.53 && Math.abs(position.y - tile.y) < .28) {
        tile.age = 0; tile.impactX = player?.velocity?.x || 0; tile.impactZ = player?.velocity?.z || 0;
        if (!tile.touched) { tile.touched = true; blocksCrossed++; }
      }
      if (tile.age < 0) continue;
      tile.age += dt;
      if (tile.age < 1.05) { tile.sag = .28 * smooth(tile.age / 1.05); tile.support = true; }
      else if (tile.age < 9.05) {
        tile.support = false; tile.sag = .28;
        if (!tile.spawned) { tile.spawned = true; emitCollapse(tile); }
      } else if (tile.age < 9.70) { tile.sag = (1 - clamp((tile.age - 9.05) / .65)) * 1.6; tile.support = tile.age > 9.60; }
      else { tile.age = -1; tile.sag = tile.previousSag = 0; tile.support = true; tile.spawned = false; }
      drawTile(tile); dirty = true;
    }
    if (dirty) softMesh.instanceMatrix.needsUpdate = true;
    updateLooseRopes(dt);
  }
  function resetSecret() {
    mode = 'secret'; beachGroup.visible = false; secretGroup.visible = true; blocksCrossed = 0; looseRopes.length = 0; ropeMesh.count = 0;
    for (const tile of blocks) { tile.age = -1; tile.sag = tile.previousSag = 0; tile.support = true; tile.spawned = false; tile.touched = false; drawTile(tile); }
    softMesh.instanceMatrix.needsUpdate = true;
    return secretSpawn.clone();
  }
  function enterSecret() { return resetSecret(); }
  function reset() { resetSecret(); mode = 'beach'; beachGroup.visible = true; secretGroup.visible = false; elapsed = 0; setCastleProgress(0); setBudCharge(0); }
  function getState() {
    return { mode, castleProgress, budCharge, collapsedTiles: blocks.filter(t => !t.stable && !t.support).length, crumblingTiles: blocks.filter(t => !t.stable && t.age >= 0 && t.age < 1.05).length, totalSandTiles: softCount, blocksCrossed, looseStrands: looseRopes.length, blocks: blocks.map(t => ({ x: t.x, y: t.y - t.sag, z: t.z, stable: t.stable, support: t.support, crumbling: t.age >= 0 && t.age < 1.05 })) };
  }
  const beachRoute = [{ x: -40, z: 29 }, { x: -35, z: 20 }, { x: -31, z: 13 }, { x: -19, z: 14 }, { x: -10, z: 18 }, { x: 2, z: 13 }];
  const commonLandmarks = { duneBud, portal, portalAxis: 'z', portalHalfWidth: 1.35, secretSpawn, secretGoal, goalPlatform: V(-3, 9, -48.5), secretOneUp, secretRoute, cabana: { x: -31, z: 13 }, tower: { x: towerX, z: towerZ } };
  reset();
  return {
    group, beachGroup, secretGroup, heightAt, surfaceAt, platformMotionAt, update, reset, enterSecret, resetSecret, setCastleProgress, setBudCharge, getState, secretRoute,
    get mode() { return mode; }, get nozzleAllowed() { return mode === 'beach'; },
    get bounds() { return mode === 'secret' ? secretBounds : beachBounds; }, get colliders() { return mode === 'secret' ? secretColliders : beachColliders; },
    get landmarks() { return { ...commonLandmarks, spawn: mode === 'secret' ? secretSpawn : V(-40, 1, 29), route: mode === 'secret' ? secretRoute : beachRoute }; },
    get mapData() { return mode === 'secret' ? { route: secretRoute, platforms: [...safePads.map(p => ({ x: p.x, z: p.z, w: p.w, d: p.d, y: p.y, stable: true })), ...blocks.map(t => ({ x: t.x, z: t.z, w: 3, d: 3, y: t.y, stable: t.stable, support: t.support }))] } : { route: beachRoute, platforms: [{ x: -40, z: 29, w: 8, d: 8, y: 1 }, { x: -31, z: 12, w: 10, d: 8, y: 1.45 }] }; },
    refillAt() { return false; },
    cleanup() { const seen = new Set(); group.traverse(o => { if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); } }); scene.remove(group); }
  };
}
