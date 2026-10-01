import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// All distances are metres. Rendered floor polygons are also the collision floors;
// there is no invisible world-sized ground plane underneath bridges or water.
const UP = new THREE.Vector3(0, 1, 0);
const WHITE = 0xf4f1e9;
const AMBER = 0xffbc65;
const CYAN = 0x72d6df;
const clamp = THREE.MathUtils.clamp;

function randomFrom(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = Math.imul(s ^ s >>> 15, 1 | s); s ^= s + Math.imul(s ^ s >>> 7, 61 | s); return ((s ^ s >>> 14) >>> 0) / 4294967296; };
}

function insidePolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (((a[1] > z) !== (b[1] > z)) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function segmentBox(a, b, box) {
  let lo = 0.001, hi = 0.999;
  for (const [axis, min, max] of [['x', 'minX', 'maxX'], ['y', 'minY', 'maxY'], ['z', 'minZ', 'maxZ']]) {
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-7) { if (a[axis] < box[min] || a[axis] > box[max]) return false; }
    else {
      let p = (box[min] - a[axis]) / d, q = (box[max] - a[axis]) / d;
      if (p > q) [p, q] = [q, p];
      lo = Math.max(lo, p); hi = Math.min(hi, q);
      if (lo > hi) return false;
    }
  }
  return true;
}

function mergeGeometry(list) {
  let count = 0;
  for (const g of list) count += g.attributes.position.count;
  const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let cursor = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    position.set(g.attributes.position.array, cursor * 3);
    normal.set(g.attributes.normal.array, cursor * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, cursor * 2);
    cursor += n; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}

export class World {
  constructor(scene, renderer, materials, props = null) {
    this.scene = scene; this.renderer = renderer; this.materials = materials;
    this.props = props;
    this.spawn = new THREE.Vector3(); this.exit = new THREE.Vector3();
    this.arenas = []; this.pickups = []; this.solids = []; this.floors = []; this.hazards = []; this.interactables = []; this.breakables = [];
    this._materialCache = new Map(); this._environments = new Map();
    this._ownedMaterials = []; this._ownedTextures = []; this._dynamic = []; this._gates = [];
    this._root = null; this._lights = []; this._batches = new Map(); this._clock = 0;
    this._waterNormal = this._makeWaterNormal();
    this.ready = this._loadPhotographicSky();
  }

  build(sector, district) {
    this._clearSector();
    this.sector = sector; this.district = district;
    this.districtIndex = typeof sector.district === 'number' ? sector.district : 0;
    this.seed = (sector.index ?? sector.id ?? 0) * 173 + 113;
    this.random = randomFrom(this.seed);
    this._root = new THREE.Group(); this._root.name = `district-${district.id || this.districtIndex}`;
    this.scene.add(this._root);
    this._lighting(sector.layout === 'dawn-breakwater' ? { ...district, sky: 0x8eafbc, fog: 0xb0c1c4, sun: 0xffd5a3, ambient: 0xb4c9cf, fogDensity: 0.0022 } : district);
    const definitions = sector.arenas?.length ? sector.arenas : [{ width: 32, length: 36, offsetX: 0, shape: 'dock' }];
    const levels = this._levels(definitions.length);
    const centers = definitions.map((a, i) => new THREE.Vector3(a.offsetX || 0, levels[i], -(30 + i * 72)));
    this.spawn.set(centers[0].x, levels[0], 8);
    this.exit.copy(centers.at(-1)); this.exit.z -= (definitions.at(-1).length || 36) / 2 + 17;
    this._backdrop(centers);
    this._swimBasin(centers);
    this._connector(new THREE.Vector3(this.spawn.x, this.spawn.y, 17), new THREE.Vector3(centers[0].x, levels[0], centers[0].z + (definitions[0].length || 36) / 2), 9, -1);
    definitions.forEach((a, i) => {
      const center = centers[i], width = a.width || 32, length = a.length || 36;
      const arena = { center, width, length, shape: a.shape, spawnPoints: [], triggerZ: center.z + length / 2 - 4 };
      this.arenas.push(arena);
      this._arena(arena, a, i);
      this._gate(arena, i);
      if (i < centers.length - 1) {
        const from = new THREE.Vector3(center.x, center.y, center.z - length / 2);
        const to = new THREE.Vector3(centers[i + 1].x, centers[i + 1].y, centers[i + 1].z + (definitions[i + 1].length || 36) / 2);
        this._connector(from, to, this.districtIndex === 4 ? 8 : 9, i);
      }
    });
    const last = this.arenas.at(-1);
    this._connector(new THREE.Vector3(last.center.x, last.center.y, last.center.z - last.length / 2), new THREE.Vector3(this.exit.x, this.exit.y, this.exit.z - 4), 9, 8);
    this._destination(this.exit.x, this.exit.y, this.exit.z - 3);
    this._finishBatches();
    this._weather();
    this._root.updateMatrixWorld(true);
    return this;
  }

  _levels(count) {
    const variants = [[0, 0.8, 1.6, 2.4], [0, -1.6, -0.8, 0.8], [0, 2.4, 4.8, 7.2], [0, -2.4, 0, 2.4], [0, 3.2, 6.4, 8.8], [0, 2.4, 5.6, 8]];
    let base = variants[this.districtIndex] || variants[0];
    const routes = { 'stacked-switchback': [0, 3.2, 1.6], 'ribbed-diagonal': [0, -2.4, 0.8], 'signal-spiral': [0, -1.2, -2.4], 'hanging-orchard': [0, 3.2, 6.4], 'rain-gallery': [0, -1.6, 1.6], 'turbine-cathedral': [0, -3.2, 0], 'ice-ladder': [0, 4, 8], 'broken-halo': [0, -2.4, 3.2] };
    base = routes[this.sector.layout] || routes[this.sector.id] || base;
    return Array.from({ length: count }, (_, i) => base[i] ?? i * 2.4);
  }

  _mat(name, options = {}) {
    const key = name + JSON.stringify(options);
    if (!this._materialCache.has(key)) {
      const material = this.materials.get(name, options);
      material.envMapIntensity = name === 'water' ? 0.8 : 0.6;
      this._materialCache.set(key, material);
    }
    return this._materialCache.get(key);
  }

  _addGeometry(geometry, material, { position, rotation, scale, cast = true } = {}) {
    cast = cast && !this._staticNoShadow;
    if (geometry.index) { const old = geometry; geometry = geometry.toNonIndexed(); old.dispose(); }
    const transform = new THREE.Matrix4();
    const quaternion = rotation instanceof THREE.Quaternion ? rotation : new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rotation || [0, 0, 0])));
    transform.compose(position || new THREE.Vector3(), quaternion, scale || new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(transform);
    const key = material.uuid + (cast ? ':shadow' : ':plain');
    if (!this._batches.has(key)) this._batches.set(key, { material, geometries: [], cast });
    this._batches.get(key).geometries.push(geometry);
  }

  _box(x, y, z, width, height, depth, material, solid = false, rotation = null) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const uv = geometry.attributes.uv;
    // Each face receives metre-scaled coordinates, so changing wall dimensions
    // does not stretch a single photographic texture over a whole building.
    const scales = [[depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height]];
    for (let face = 0; face < 6; face++) for (let v = 0; v < 4; v++) {
      const n = face * 4 + v; uv.setXY(n, uv.getX(n) * scales[face][0] * 0.5, uv.getY(n) * scales[face][1] * 0.5);
    }
    const position = new THREE.Vector3(x, y, z);
    this._addGeometry(geometry, material, { position, rotation });
    if (solid) {
      const box = new THREE.Box3(new THREE.Vector3(-width / 2, -height / 2, -depth / 2), new THREE.Vector3(width / 2, height / 2, depth / 2));
      const matrix = new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rotation || [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
      box.applyMatrix4(matrix);
      this.solids.push({ minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z, active: true });
    }
  }

  _cylinder(x, y, z, radius, height, material, topRadius = radius, segments = 16, rotation = null) {
    const geometry = new THREE.CylinderGeometry(topRadius, radius, height, segments, 1);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * (radius + topRadius) * 0.5, uv.getY(i) * height * 0.5);
    this._addGeometry(geometry, material, { position: new THREE.Vector3(x, y, z), rotation });
  }

  _beam(a, b, thickness, material, depth = thickness) {
    const delta = b.clone().sub(a);
    const length = delta.length(), center = a.clone().add(b).multiplyScalar(0.5);
    const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, delta.normalize()));
    this._box(center.x, center.y, center.z, thickness, length, depth, material, false, [rotation.x, rotation.y, rotation.z]);
  }

  _pipe(a, b, radius, material, segments = 12) {
    const delta = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), segments, 1), uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * radius, uv.getY(i) * delta.length() * 0.5);
    this._addGeometry(geometry, material, { position: a.clone().add(b).multiplyScalar(0.5), rotation: new THREE.Quaternion().setFromUnitVectors(UP, delta.normalize()) });
  }

  _floor(polygon, top, material, thickness = 0.8, endTop = top) {
    const minZ = Math.min(...polygon.map(p => p[1])), maxZ = Math.max(...polygon.map(p => p[1]));
    const heightAt = z => top + (endTop - top) * ((z - minZ) / (maxZ - minZ || 1));
    const vertices = [], uv = [];
    const center = polygon.reduce((a, p) => [a[0] + p[0] / polygon.length, a[1] + p[1] / polygon.length], [0, 0]);
    const emit = (x, y, z, u = x * 0.5, v = z * 0.5) => { vertices.push(x, y, z); uv.push(u, v); };
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length];
      emit(center[0], heightAt(center[1]), center[1]); emit(p[0], heightAt(p[1]), p[1]); emit(q[0], heightAt(q[1]), q[1]);
      const edge = Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.5;
      emit(p[0], heightAt(p[1]), p[1], 0, heightAt(p[1]) * 0.5); emit(p[0], heightAt(p[1]) - thickness, p[1], 0, (heightAt(p[1]) - thickness) * 0.5); emit(q[0], heightAt(q[1]), q[1], edge, heightAt(q[1]) * 0.5);
      emit(q[0], heightAt(q[1]), q[1], edge, heightAt(q[1]) * 0.5); emit(p[0], heightAt(p[1]) - thickness, p[1], 0, (heightAt(p[1]) - thickness) * 0.5); emit(q[0], heightAt(q[1]) - thickness, q[1], edge, (heightAt(q[1]) - thickness) * 0.5);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.computeVertexNormals();
    this._addGeometry(geometry, material);
    this.floors.push({ polygon, minX: Math.min(...polygon.map(p => p[0])), maxX: Math.max(...polygon.map(p => p[0])), minZ, maxZ, top, endTop });
  }

  _rectFloor(x, y, z, width, length, material, thickness = 0.8) {
    this._floor([[x - width / 2, z + length / 2], [x + width / 2, z + length / 2], [x + width / 2, z - length / 2], [x - width / 2, z - length / 2]], y, material, thickness);
  }

  _finishBatches() {
    for (const { material, geometries, cast } of this._batches.values()) {
      const mesh = new THREE.Mesh(mergeGeometry(geometries), material);
      mesh.castShadow = cast; mesh.receiveShadow = true; this._root.add(mesh);
    }
    this._batches.clear();
  }

  _outline(a, b, baseY, material, height = 1.05) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const parts = Math.ceil(length / 1.5);
    const rotation = [0, Math.atan2(b[0] - a[0], b[1] - a[1]), 0];
    for (let i = 0; i < parts; i++) {
      const t = (i + 0.5) / parts;
      const sx = THREE.MathUtils.lerp(a[0], b[0], t), sz = THREE.MathUtils.lerp(a[1], b[1], t);
      if (this._activeSecret && sx >= this._activeSecret.fromX && Math.abs(sz - this._activeSecret.z) < this._activeSecret.width / 2 + 0.9) continue;
      this._box(THREE.MathUtils.lerp(a[0], b[0], t), baseY + height / 2, THREE.MathUtils.lerp(a[1], b[1], t), 0.34, height, length / parts + 0.03, material, true, rotation);
    }
  }

  _arena(arena, definition, index) {
    const c = arena.center, w = arena.width, l = arena.length, shape = definition.shape || 'dock';
    const stone = this._mat(this.districtIndex === 4 ? 'concreteClean' : this.districtIndex === 0 ? 'concreteClean' : this.district.floorMaterial || 'concrete', { color: [0x889ba3, 0xc9c8c0, 0xd1d0ba, 0x9a9690, 0xbbc3c5, 0xa4b0b5][this.districtIndex], roughness: this.districtIndex <= 1 ? 0.66 : 0.85 });
    this._activeSecret = index === 1 ? { side: 1, x: c.x + w / 2, fromX: c.x + w * 0.2, z: c.z + 2.5, width: 4.6 } : null;
    let polygon;
    if (['ring', 'coil', 'crucible', 'heart', 'turbine', 'basin', 'court'].includes(shape)) {
      // Chamfered industrial rotundas preserve a wide forward entrance and exit.
      polygon = [[c.x - w * 0.26, c.z + l / 2], [c.x + w * 0.26, c.z + l / 2], [c.x + w / 2, c.z + l * 0.27], [c.x + w / 2, c.z - l * 0.27], [c.x + w * 0.26, c.z - l / 2], [c.x - w * 0.26, c.z - l / 2], [c.x - w / 2, c.z - l * 0.27], [c.x - w / 2, c.z + l * 0.27]];
    } else if (['bridge', 'aqueduct', 'gantry'].includes(shape)) {
      polygon = [[c.x - w / 2, c.z + l / 2], [c.x + w / 2, c.z + l / 2], [c.x + w * 0.28, c.z + l * 0.19], [c.x + w * 0.28, c.z - l * 0.19], [c.x + w / 2, c.z - l / 2], [c.x - w / 2, c.z - l / 2], [c.x - w * 0.28, c.z - l * 0.19], [c.x - w * 0.28, c.z + l * 0.19]];
    } else if (['canyon', 'switchback', 'ridge', 'spiral'].includes(shape)) {
      polygon = [[c.x - w * 0.38, c.z + l / 2], [c.x + w * 0.38, c.z + l / 2], [c.x + w / 2, c.z + l * 0.1], [c.x + w * 0.38, c.z - l / 2], [c.x - w / 2, c.z - l / 2], [c.x - w * 0.44, c.z + l * 0.05]];
    } else polygon = [[c.x - w / 2, c.z + l / 2], [c.x + w / 2, c.z + l / 2], [c.x + w / 2, c.z - l / 2], [c.x - w / 2, c.z - l / 2]];
    this._floor(polygon, c.y, stone, this.districtIndex === 4 ? 3.5 : 1.2);
    const parapet = this._mat(this.districtIndex === 5 ? 'dark' : 'concrete');
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      if (Math.abs(a[1] - b[1]) < 0.01 && (Math.abs(a[1] - (c.z + l / 2)) < 0.1 || Math.abs(a[1] - (c.z - l / 2)) < 0.1)) {
        const left = a[0] < b[0] ? a : b, right = a[0] < b[0] ? b : a;
        this._outline(left, [c.x - 5.05, left[1]], c.y, parapet);
        this._outline([c.x + 5.05, right[1]], right, c.y, parapet);
      } else this._outline(a, b, c.y, parapet, this.districtIndex === 1 ? 1.35 : 1.05);
    }
    for (const [dx, dz] of [[-0.25, -0.19], [0.25, -0.19], [-0.25, 0.15], [0.25, 0.15], [0, -0.32], [0, 0]]) {
      arena.spawnPoints.push(new THREE.Vector3(c.x + w * dx, c.y, c.z + l * dz));
    }
    this._floorDetails(arena, index);
    const builders = ['_quay', '_transit', '_garden', '_foundry', '_spillway', '_crown'];
    this[builders[this.districtIndex] || '_quay'](arena, definition, index);
    this._sectorLandmark(arena, definition, index);
    if (index === 0) this._arrivalLandmark(arena);
    this._districtProps(arena, index);
    this._optionalRoute(arena, index);
    if (index === 1) this._secretRoom(arena);
    if (this.districtIndex <= 2) this._serviceLadders(arena);
    this._activeSecret = null;
    this._pickup('health', new THREE.Vector3(c.x - w * 0.28, c.y + 0.8, c.z + l * 0.12), `${this.sector.index}-${index}-health`);
    this._sign(c.x + 6.5, c.y + 2.7, c.z - l / 2 + 0.18, definition.name || this.sector.name || 'BREAKWATER', `${String((this.sector.index || 0) + 1).padStart(2, '0')} / ${String(index + 1).padStart(2, '0')}`, 3.6);
  }

  _connector(from, to, width, index) {
    if (index === -1) width = [9, 18, 22, 16, 8, 7][this.districtIndex];
    const concrete = this._mat(this.districtIndex === 1 ? 'marble' : this.districtIndex === 5 ? 'dark' : 'concreteClean', { color: [0x889ba3, 0xc9c8c0, 0xd1d0ba, 0x9a9690, 0xbbc3c5, 0xa4b0b5][this.districtIndex], roughness: this.districtIndex <= 1 ? 0.66 : 0.85 });
    const length = from.z - to.z;
    const bend = index >= 0 && index < 3 && ((this.sector.index || 0) + index) % 3 === 1 ? (index % 2 ? -1 : 1) * 4 : 0;
    const mid = from.clone().lerp(to, 0.5); mid.x += bend;
    const points = [from, mid, to];
    for (let p = 0; p < 2; p++) {
      const a = points[p], b = points[p + 1];
      const polygon = [[a.x - width / 2, a.z + 0.08], [a.x + width / 2, a.z + 0.08], [b.x + width / 2, b.z - 0.08], [b.x - width / 2, b.z - 0.08]];
      this._floor(polygon, b.y, concrete, 0.8, a.y);
      for (const side of [-1, 1]) {
        const ra = a.clone().add(new THREE.Vector3(side * (width / 2 - 0.22), 0, 0));
        const rb = b.clone().add(new THREE.Vector3(side * (width / 2 - 0.22), 0, 0));
        this._rail(ra, rb, this._mat('steel', { color: 0xc2bbb0 }));
      }
      for (let t = 0.15; t < 1; t += 0.25) {
        const pos = a.clone().lerp(b, t);
        this._box(pos.x - width / 2 + 0.68, pos.y + 0.035, pos.z, 0.08, 0.045, 1.4, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 2 }));
        this._box(pos.x + width / 2 - 0.68, pos.y + 0.035, pos.z, 0.08, 0.045, 1.4, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 2 }));
      }
    }
    if (index === -1) this._approach(from, to, width);
    if (index >= 0 && index < 3) {
      // Long connectors have their own silhouette and purpose, rather than
      // empty travel space between floating arenas.
      const y = mid.y, z = mid.z, x = mid.x;
      if (this.districtIndex === 1) {
        // Stop the smaller roof behind both concourse portal faces. Extending
        // it through the end wall exposes an unintended sliced arch in the hall.
        this._vault(x, y, z, width * 0.6, 5.2, Math.max(2, length - 3.6), false);
        for (let dz = -length * 0.35; dz <= length * 0.35; dz += 5) this._arch(x, y, z + dz, width * 0.6, 5.2, this._mat('brass'));
        this._box(x - width / 2 - 0.5, y + 2, z, 0.8, 4, length * 0.9, this._mat('brick'));
        this._box(x + width / 2 + 0.5, y + 2, z, 0.8, 4, length * 0.9, this._mat('brick'));
      } else if (this.districtIndex === 2) {
        for (const side of [-1, 1]) this._planter(x + side * (width / 2 + 1.8), y, z, 2.7, 11, true);
        this._arch(x, y, z, width * 0.7, 6, this._mat('paint', { color: 0xb0b7aa }));
      } else if (this.districtIndex === 3) {
        this._pipe(new THREE.Vector3(x - 7, y + 5, z), new THREE.Vector3(x + 7, y + 5, z), 1.1, this._mat('rust'));
        this._box(x - 6, y + 2.5, z, 1, 5, 1.5, this._mat('dark'));
        this._box(x + 6, y + 2.5, z, 1, 5, 1.5, this._mat('dark'));
      } else if (this.districtIndex === 4) {
        for (const side of [-1, 1]) this._box(x + side * 6, y - 6, z, 2.6, 12, 3.5, this._mat('concrete'));
        this._pipe(new THREE.Vector3(x - 7, y - 2, z), new THREE.Vector3(x + 7, y - 2, z), 1.7, this._mat('patina'));
      } else if (this.districtIndex === 5) {
        for (const side of [-1, 1]) this._beam(new THREE.Vector3(x + side * 4, y, z - 5), new THREE.Vector3(x + side * 7, y + 13, z + 5), 0.28, this._mat('brass'));
        this._box(x, y + 12, z + 5, 15, 0.55, 0.7, this._mat('dark'));
      } else {
        this._box(x - 7, y - 4, z, 3, 8, 3, this._mat('concrete'));
        this._box(x + 7, y - 4, z, 3, 8, 3, this._mat('concrete'));
      }
    }
  }

  _rail(a, b, material) {
    const length = a.distanceTo(b), n = Math.ceil(length / 2.6);
    for (const h of [0.56, 1.08]) this._pipe(a.clone().add(new THREE.Vector3(0, h, 0)), b.clone().add(new THREE.Vector3(0, h, 0)), 0.055, material, 6);
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      this._box(p.x, p.y + 0.55, p.z, 0.11, 1.1, 0.11, material, true);
    }
    // Collision derives from short visible railing spans rather than a single
    // oversized AABB across a diagonal bridge.
    const pieces = Math.ceil(length / 0.9);
    for (let i = 0; i < pieces; i++) {
      const p = a.clone().lerp(b, i / pieces), q = a.clone().lerp(b, (i + 1) / pieces);
      this.solids.push({ minX: Math.min(p.x, q.x) - 0.055, maxX: Math.max(p.x, q.x) + 0.055, minY: Math.min(p.y, q.y) + 0.36, maxY: Math.max(p.y, q.y) + 1.13, minZ: Math.min(p.z, q.z) - 0.055, maxZ: Math.max(p.z, q.z) + 0.055, active: true });
    }
  }

  _approach(from, to, width) {
    const x = (from.x + to.x) / 2, y = from.y, z = (from.z + to.z) / 2, length = from.z - to.z;
    const metal = this._mat('dark'), brass = this._mat('brass'), concrete = this._mat('concreteClean', { color: 0x8e9ea5 });
    if (this.districtIndex === 0) {
      this._prop('storageCart', x - 3.25, y, z + 0.5, -0.16, 1, true);
      this._prop('barrel', x + 3.4, y, z - 5.2, 0.2, 1, true, true);
      this._prop('barrel', x + 2.7, y, z - 5.8, -0.1, 0.95, true, true);
      for (const side of [-1, 1]) {
        for (const dz of [-7, 6]) {
          this._cylinder(x + side * (width / 2 + 0.7), y + 0.25, z + dz, 0.3, 0.5, metal, 0.38, 12);
          this._addGeometry(new THREE.TorusGeometry(0.48, 0.075, 6, 20), this._mat('wood'), { position: new THREE.Vector3(x + side * (width / 2 + 0.5), y + 0.07, z + dz + 0.8), rotation: [Math.PI / 2, 0, 0] });
        }
        this._box(x + side * (width / 2 + 0.8), y - 1.6, z, 1.3, 3.2, length, concrete);
      }
      const px = x + 5.3;
      this._box(px, y + 2.4, z + 2, 0.13, 4.8, 0.13, metal);
      this._box(px - 0.8, y + 4.8, z + 2, 1.7, 0.12, 0.15, metal);
      this._box(px - 1.5, y + 4.72, z + 2, 0.5, 0.14, 0.32, this._mat('emissive', { color: 0xf6dca5, emissive: AMBER, emissiveIntensity: 1.8 }));
      const lamp = new THREE.PointLight(0xffbd70, 22, 13, 2); lamp.position.set(px - 1.4, y + 4.5, z + 2); this._root.add(lamp);
      this._puddle(x - 1.7, y + 0.019, z + 3.2, 3.9, 1.25);
      this._puddle(x + 2, y + 0.02, z - 4.4, 3, 1.8);
      this._sign(x - 4.3, y + 2.2, z - 6, 'FREIGHT / 01', 'RELAY ACCESS', 2.7);
    } else if (this.districtIndex === 1) {
      this._vault(x, y, z, width / 2 + 0.4, 4.6, Math.max(2, length - 3.6), true);
      for (const side of [-1, 1]) {
        this._box(x + side * (width / 2 + 0.45), y + 2.8, z, 0.7, 5.6, length + 2, this._mat('plaster', { color: 0x9aafa9 }));
        for (let dz = -length / 2 + 3; dz < length / 2; dz += 5) {
          this._box(x + side * (width / 2 - 0.25), y + 3, z + dz, 0.85, 6, 0.85, this._mat('marble'), true);
          this._box(x + side * (width / 2 - 0.69), y + 2.3, z + dz, 0.07, 1.25, 0.13, this._mat('emissive', { color: 0xf4d8a7, emissive: AMBER, emissiveIntensity: 1.1 }));
        }
      }
      for (const dz of [-7, 5]) this._arch(x, y, z + dz, width / 2 + 0.3, 4.6, brass, 0.19);
      this._sign(x - 5.7, y + 2.2, z - 7, 'DEPARTURES', 'PUMPS / RELAY 02', 4.2);
      this._prop('storageCart', x - 6.7, y, z - 3.8, 0.12, 0.95, true);
      this._puddle(x + 3, y + 0.02, z + 2, 6.4, 2.8);
      const lamp = new THREE.PointLight(0xffcf91, 28, 19, 2); lamp.position.set(x - 5, y + 4.5, z); this._root.add(lamp);
    } else if (this.districtIndex === 2) {
      this._prop('rock', x - 7.8, y + 0.86, z - 4, 1.2, 0.36, false);
      for (const side of [-1, 1]) {
        this._planter(x + side * (width / 2 - 2), y, z + side * 3, 3, length * 0.76, true);
        this._prop('tree', x + side * (width / 2 - 2), y + 0.88, z + side * 3, side * 0.55, 1.3);
        this._tree(x + side * (width / 2 + 0.6), y - 1, z + side * 5, 10.5);
      }
      this._arch(x, y, z - 5, width / 2 + 1, 2.6, this._mat('paint', { color: 0xa2bdac }), 0.17);
      this._bench(x - 6.8, y, z + 4);
      this._sign(x + 6.7, y + 1.9, z - 7, 'CONSERVATORY', 'PUBLIC GARDENS / EAST', 3.5);
    } else if (this.districtIndex === 3) {
      this._prop('barrel', x - 5.8, y, z - 2.5, -0.2, 1, true, true);
      this._prop('gasTank', x - 6.7, y, z - 2.2, 0.2, 1.4, true);
      for (const side of [-1, 1]) {
        this._pipe(new THREE.Vector3(x + side * (width / 2 + 0.7), y + 2, from.z), new THREE.Vector3(x + side * (width / 2 + 0.7), y + 2, to.z), 0.75, this._mat('rust'));
        for (let dz = -length / 2 + 2; dz < length / 2; dz += 7) this._box(x + side * (width / 2 + 0.7), y + 3, z + dz, 0.9, 6, 0.9, metal);
      }
      this._pipe(new THREE.Vector3(x - width / 2 - 1, y + 6, z - 4), new THREE.Vector3(x + width / 2 + 1, y + 6, z - 4), 0.9, this._mat('rust'));
      this._sign(x - 5.8, y + 2.3, z - 5, 'CASTING WORKS', 'HOT LINE / MAINTENANCE', 3.8);
    } else if (this.districtIndex === 4) {
      this._prop('rock', x - 6.4, y - 0.2, z - 1, -0.7, 0.55, false);
      for (const side of [-1, 1]) {
        this._box(x + side * (width / 2 + 1.3), y - 11, z, 2, 22, length + 2, concrete);
        this._box(x + side * (width / 2 + 1.3), y + 0.15, z, 2.3, 0.3, length + 2, this._mat('snow'));
      }
      this._box(x + 6, y + 2, z - 7, 2.2, 4, 3, this._mat('paint', { color: 0x6e8b89 }));
      this._sign(x + 5.97, y + 2.8, z - 5.45, 'SPILLWAY 05', 'UPPER PRESSURE LINE', 1.8);
    } else {
      for (const side of [-1, 1]) {
        this._beam(new THREE.Vector3(x + side * (width / 2 + 0.5), y - 12, z - 8), new THREE.Vector3(x + side * (width / 2 + 5), y + 16, z - 8), 0.38, brass);
        this._pipe(new THREE.Vector3(x + side * (width / 2 + 0.5), y + 0.7, from.z), new THREE.Vector3(x + side * (width / 2 + 5), y + 16, z - 8), 0.09, metal, 8);
      }
    }
    // Slab bays, expansion covers and a narrow service gutter make the approach
    // read as built infrastructure at walking distance.
    for (let zz = to.z + 1; zz < from.z; zz += 4) this._box(x, y + 0.011, zz, width * 0.94, 0.012, 0.035, metal);
    for (const side of [-1, 1]) this._box(x + side * (width / 2 - 0.9), y + 0.012, z, 0.027, 0.015, length - 0.5, metal);
  }

  _prop(name, x, y, z, yaw = 0, scale = 1, collidable = false, breakable = false) {
    if (!this.props?.has(name)) return null;
    const object = this.props.place(name, { position: new THREE.Vector3(x, y, z), rotation: [0, yaw, 0], scale });
    this._root.add(object); object.updateMatrixWorld(true);
    if (collidable) {
      const box = new THREE.Box3().setFromObject(object);
      const solid = { minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z, active: true };
      this.solids.push(solid);
      if (breakable) this.breakables.push({ mesh: object, solid, health: name === 'barrel' ? 36 : 22, kind: name === 'barrel' ? 'barrel' : 'wood', color: name === 'barrel' ? 0xa59677 : 0xbd986b });
      if (['crate', 'barrel'].includes(name)) {
        this.floors.push({ polygon: [[box.min.x, box.max.z], [box.max.x, box.max.z], [box.max.x, box.min.z], [box.min.x, box.min.z]], minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, top: box.max.y, endTop: box.max.y, solidRef: solid });
      }
    }
    return object;
  }

  _districtProps(arena, index) {
    if (!this.props) return;
    const c = arena.center, w = arena.width, l = arena.length;
    if (this.districtIndex === 0) {
      this._prop('barrel', c.x - w * 0.32, c.y, c.z + l * 0.32, 0.3, 1, true, true);
      this._prop('barrel', c.x - w * 0.32 + 0.75, c.y, c.z + l * 0.32 + 0.35, 0.9, 0.92, true, true);
      if (index === 2) this._prop('storageCart', c.x + w * 0.30, c.y, c.z + l * 0.30, 0.4, 1, true);
    } else if (this.districtIndex === 1) {
      this._prop('crate', c.x - w * 0.31, c.y, c.z + l * 0.33, 0.06, 0.7, true, true);
      this._prop('lamp', c.x + w * 0.27, c.y + 5.4, c.z + l * 0.27, 0, 1.2);
    } else if (this.districtIndex === 2) {
      this._prop('rock', c.x - w * 0.41, c.y, c.z + l * 0.32, 0.3 + index, 0.4, true);
      this._prop('rock', c.x + w / 2 + 4, c.y - 1.0, c.z - l * 0.3, 1.2 + index, 0.85);
    } else if (this.districtIndex === 3) {
      this._prop('gasTank', c.x - w * 0.36, c.y, c.z + l * 0.27, 0, 1.6, true);
      this._prop('barrel', c.x - w * 0.36 + 1, c.y, c.z + l * 0.27, 0.1, 1, true, true);
      this._prop('lamp', c.x + 4, c.y + 5.1, c.z + l * 0.3, 0, 1.3);
    } else if (this.districtIndex === 4) {
      this._prop('rock', c.x - w / 2 - 3, c.y - 1, c.z + l * 0.29, index * 0.7, 1.4);
      this._prop('gasTank', c.x + w * 0.32, c.y, c.z + l * 0.31, 0.6, 1.3, true);
    } else {
      this._prop('gasTank', c.x - w * 0.34, c.y, c.z + l * 0.30, 0, 1.6, true);
      this._prop('crate', c.x + w * 0.33, c.y, c.z + l * 0.3, 0.08, 0.62, true, true);
    }
  }

  _floorDetails(arena, index) {
    const c = arena.center, w = arena.width, l = arena.length;
    const seam = this._mat('dark', { color: 0x737b7b });
    // Narrow physical construction joints and flush drainage channels.
    for (let x = -w / 2 + 4; x < w / 2 - 1; x += 5.5) this._box(c.x + x, c.y + 0.007, c.z, 0.022, 0.009, l * 0.83, seam);
    for (let z = -l / 2 + 4; z < l / 2 - 1; z += 6) this._box(c.x, c.y + 0.009, c.z + z, w * 0.82, 0.009, 0.024, seam);
    for (const side of [-1, 1]) {
      this._box(c.x + side * (w * 0.28), c.y + 0.016, c.z, 0.3, 0.018, l * 0.75, seam);
      for (let z = -l * 0.35; z < l * 0.35; z += 0.6) this._box(c.x + side * (w * 0.28), c.y + 0.035, c.z + z, 0.32, 0.02, 0.045, this._mat('steel'));
      for (let z = -l * 0.4; z <= l * 0.4; z += 6) {
        this._box(c.x + side * (w / 2 - 1.2), c.y + 0.04, c.z + z, 0.13, 0.055, 1.2, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 1.7 }));
      }
    }
    if ((index + this.districtIndex) % 2 === 0) this._inlayCircle(c.x, c.y + 0.014, c.z, Math.min(w, l) * 0.24, this._mat('brass', { color: 0xc5b28a }));
  }

  _inlayCircle(x, y, z, radius, material) {
    const geometry = new THREE.RingGeometry(radius - 0.045, radius + 0.045, 64);
    this._addGeometry(geometry, material, { position: new THREE.Vector3(x, y, z), rotation: [-Math.PI / 2, 0, 0], cast: false });
  }

  _arch(x, y, z, radius, spring, material, thickness = 0.22) {
    const geometry = new THREE.TorusGeometry(radius, thickness, 6, 32, Math.PI);
    this._addGeometry(geometry, material, { position: new THREE.Vector3(x, y + spring, z) });
    for (const side of [-1, 1]) this._box(x + side * radius, y + spring / 2, z, thickness * 2, spring, thickness * 2, material);
  }

  _vault(x, y, z, radius, spring, length, skylight = true) {
    const wall = this._mat('plaster', { color: 0x9bafa9, roughness: 0.91, side: THREE.DoubleSide });
    const aperture = skylight ? 0.10 : 0;
    for (const [start, arc] of [[-Math.PI / 2, Math.PI / 2 - aperture], [aperture, Math.PI / 2 - aperture]]) {
      const geometry = new THREE.CylinderGeometry(radius, radius, length, 32, 1, true, start, arc), uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * radius * arc * 0.5, uv.getY(i) * length * 0.5);
      this._addGeometry(geometry, wall, { position: new THREE.Vector3(x, y + spring, z), rotation: [-Math.PI / 2, 0, 0] });
    }
    if (skylight) {
      const glass = new THREE.CylinderGeometry(radius + 0.04, radius + 0.04, length, 8, 1, true, -aperture, aperture * 2);
      this._addGeometry(glass, this._mat('glass', { color: 0x779eaa, transparent: true, opacity: 0.22, side: THREE.DoubleSide }), { position: new THREE.Vector3(x, y + spring, z), rotation: [-Math.PI / 2, 0, 0], cast: false });
    }
  }

  _vaultPortal(x, y, z, radius, spring, doorHeight = 6.2, facing = 1) {
    const shape = new THREE.Shape();
    shape.moveTo(-radius, 0); shape.lineTo(-5.1, 0); shape.lineTo(-5.1, doorHeight); shape.lineTo(5.1, doorHeight); shape.lineTo(5.1, 0); shape.lineTo(radius, 0); shape.lineTo(radius, spring);
    shape.absarc(0, spring, radius, 0, Math.PI, false); shape.lineTo(-radius, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false, curveSegments: 40 });
    const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.3, uv.getY(i) * 0.3);
    this._addGeometry(geometry, this._mat('plaster', { color: 0xb8b3a2, roughness: 0.95 }), { position: new THREE.Vector3(x, y, z - 0.275) });
    const faceZ = z + facing * 0.37, marble = this._mat('marble'), brass = this._mat('brass');
    const paint = this._mat('paint', { color: 0x83928c, roughness: 0.82, metalness: 0.18 });
    const dark = this._mat('dark', { color: 0x5b6463, roughness: 0.86 });
    for (const side of [-1, 1]) {
      const width = radius - 5.1;
      this.solids.push({ minX: x + (side < 0 ? -radius : 5.1), maxX: x + (side < 0 ? -5.1 : radius), minY: y, maxY: y + spring, minZ: z - 0.275, maxZ: z + 0.275, active: true });
      this._box(x + side * 5.4, y + 3.7, faceZ, 0.35, 7.4, 0.6, marble);
      this._box(x + side * (5.1 + width * 0.5), y + 0.42, faceZ, width - 0.3, 0.64, 0.24, marble);
      // Closed maintenance doors have a leaf, reveal, raised frame and hardware;
      // these sit against the existing solid wall, not an implied open passage.
      const doorX = x + side * (5.1 + width * 0.5), doorWidth = Math.min(2.8, width * 0.46);
      this._box(doorX, y + 1.7, faceZ, doorWidth + 0.28, 3.4, 0.12, dark);
      this._box(doorX, y + 1.7, faceZ + facing * 0.075, doorWidth, 3.16, 0.12, paint);
      for (const edge of [-1, 1]) this._box(doorX + edge * (doorWidth / 2 + 0.11), y + 1.74, faceZ + facing * 0.15, 0.16, 3.48, 0.27, brass);
      for (const height of [0.10, 3.44]) this._box(doorX, y + height, faceZ + facing * 0.15, doorWidth + 0.4, 0.18, 0.27, marble);
      this._box(doorX, y + 1.7, faceZ + facing * 0.15, 0.027, 3.12, 0.025, dark);
      for (const leaf of [-1, 1]) {
        this._box(doorX + leaf * 0.14, y + 1.53, faceZ + facing * 0.23, 0.06, 0.42, 0.10, brass);
        for (let j = 0; j < 5; j++) this._box(doorX + leaf * doorWidth * 0.24, y + 0.5 + j * 0.12, faceZ + facing * 0.145, doorWidth * 0.35, 0.045, 0.04, dark);
      }
      this._box(doorX, y + 3.87, faceZ + facing * 0.10, doorWidth + 0.1, 0.48, 0.16, brass);
      this._box(doorX, y + 3.87, faceZ + facing * 0.2, doorWidth - 0.18, 0.29, 0.05, this._mat('emissive', { color: 0xb4b49a, emissive: 0xc6ad76, emissiveIntensity: 0.2 }));
      // Shallow structural piers and a cornice make the tall terminus wall read
      // as masonry courses, without adding anything to the walkable route.
      for (const offset of [5.95, radius * 0.8]) {
        const pierHeight = Math.min(14.6, spring + Math.sqrt(radius * radius - offset * offset) - 0.5);
        this._box(x + side * offset, y + pierHeight / 2 + 0.1, faceZ, 0.38, pierHeight, 0.3, marble);
      }
    }
    this._box(x, y + doorHeight + 0.35, faceZ, 11.3, 0.22, 0.65, brass);
    this._box(x, y + 7.65, faceZ, radius * 1.95, 0.34, 0.44, marble);
    this._box(x, y + 7.93, faceZ + facing * 0.12, radius * 1.95, 0.055, 0.1, brass);
  }

  _gate(arena, index) {
    const c = arena.center, z = c.z - arena.length / 2 + 0.2, material = this._mat('dark');
    const brass = this._mat('brass');
    for (const side of [-1, 1]) {
      this._box(c.x + side * 5, c.y + 2.8, z, 0.7, 5.6, 1.2, material, true);
      this._box(c.x + side * 5, c.y + 2.4, z + 0.63, 0.18, 2.8, 0.09, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 1.8 }));
    }
    this._box(c.x, c.y + 5.4, z, 10.7, 0.65, 1.2, material);
    this._box(c.x, c.y + 5.02, z + 0.61, 8.6, 0.055, 0.04, brass);
    const gate = new THREE.Group(); gate.position.set(c.x, c.y + 4.5, z);
    const geometry = new THREE.BoxGeometry(9.5, 0.18, 0.28);
    for (let j = 0; j < 9; j++) {
      const bar = new THREE.Mesh(geometry, j % 3 === 0 ? brass : material); bar.position.y = j * 0.43 + 0.15; bar.castShadow = true; gate.add(bar);
    }
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.8, 0.32), material); panel.position.set(side * 2.35, 1.9, 0); gate.add(panel);
    }
    this._root.add(gate); arena.gate = gate;
    const solid = { minX: c.x - 4.75, maxX: c.x + 4.75, minY: c.y, maxY: c.y + 4.1, minZ: z - 0.17, maxZ: z + 0.17, active: false, gate: index };
    this.solids.push(solid); this._gates.push({ mesh: gate, solid, floor: c.y, open: true });
  }

  setGate(index, open) {
    const gate = this._gates[index]; if (!gate) return;
    gate.open = !!open; gate.solid.active = !open;
    if (!open) gate.mesh.position.y = gate.floor;
  }

  floorAt(x, z, feetY = Infinity) {
    let result = -Infinity;
    for (const floor of this.floors) {
      if (floor.solidRef && !floor.solidRef.active) continue;
      if (x < floor.minX - 0.001 || x > floor.maxX + 0.001 || z < floor.minZ - 0.001 || z > floor.maxZ + 0.001 || !insidePolygon(x, z, floor.polygon)) continue;
      const y = floor.top + (floor.endTop - floor.top) * ((z - floor.minZ) / (floor.maxZ - floor.minZ || 1));
      if (y <= feetY + 0.58 && y > result) result = y;
    }
    return result;
  }

  rayBlocked(from, to) {
    for (const solid of this.solids) if (solid.active && segmentBox(from, to, solid)) return true;
    // The same visible floor polygons also receive downward weapon impacts.
    for (const floor of this.floors) {
      if (floor.solidRef && !floor.solidRef.active) continue;
      if (Math.max(from.x, to.x) < floor.minX || Math.min(from.x, to.x) > floor.maxX || Math.max(from.z, to.z) < floor.minZ || Math.min(from.z, to.z) > floor.maxZ) continue;
      const slope = (floor.endTop - floor.top) / (floor.maxZ - floor.minZ || 1);
      const a = from.y - floor.top - slope * (from.z - floor.minZ), b = to.y - floor.top - slope * (to.z - floor.minZ);
      if (a * b > 0 || Math.abs(a - b) < 1e-8) continue;
      const t = a / (a - b);
      if (t > 0.001 && t < 0.999 && insidePolygon(THREE.MathUtils.lerp(from.x, to.x, t), THREE.MathUtils.lerp(from.z, to.z, t), floor.polygon)) return true;
    }
    return false;
  }

  _arrivalLandmark(arena) {
    const c = arena.center, w = arena.width, l = arena.length;
    const brass = this._mat('brass'), dark = this._mat('dark'), steel = this._mat('steel'), rust = this._mat('rust');
    if (this.districtIndex === 0) {
      // A ship on its launch cradle occupies the upper-left view. Supports are
      // outside the arena and its keel stays well above all movement space.
      const sx = c.x - w / 2 - 1.4, sz = c.z + 1, baseY = c.y + 7.8, length = l + 14;
      const geometry = new THREE.PlaneGeometry(1, 1, 20, 30), p = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, t = p.getY(i) + 0.5, a = (u - 0.5) * Math.PI;
        const breadth = 1.1 + 7.5 * Math.pow(Math.max(0, Math.sin(t * Math.PI)), 0.65);
        p.setXYZ(i, sx + Math.sin(a) * breadth, baseY + (1 - Math.cos(a)) * 5.1 + Math.pow(Math.abs(t - 0.5) * 2, 5) * 2.5, sz + (t - 0.5) * length);
        uv.setXY(i, u * 6, t * length * 0.35);
      }
      geometry.computeVertexNormals();
      this._addGeometry(geometry, this._mat('paint', { color: 0x526c76, roughness: 0.77, side: THREE.DoubleSide }));
      for (let t = 0.12; t < 0.93; t += 0.1) {
        const breadth = 1.1 + 7.5 * Math.pow(Math.sin(t * Math.PI), 0.65), z = sz + (t - 0.5) * length;
        for (let j = 0; j < 12; j++) {
          const a = -Math.PI / 2 + j / 12 * Math.PI, b = -Math.PI / 2 + (j + 1) / 12 * Math.PI;
          this._beam(new THREE.Vector3(sx + Math.sin(a) * breadth, baseY + (1 - Math.cos(a)) * 5.1 - 0.055, z), new THREE.Vector3(sx + Math.sin(b) * breadth, baseY + (1 - Math.cos(b)) * 5.1 - 0.055, z), 0.14, dark, 0.20);
        }
      }
      for (const z of [sz - length * 0.30, sz + length * 0.30]) {
        this._box(sx - 4.9, c.y + 3.8, z, 1, 7.6, 1, this._mat('concrete'));
        this._beam(new THREE.Vector3(sx - 4.9, c.y + 1.8, z), new THREE.Vector3(sx - 0.7, baseY + 0.25, z), 0.45, rust);
        this._box(sx, baseY + 5.1, z, 16, 0.35, 0.5, steel);
      }
    } else if (this.districtIndex === 1) {
      const z = c.z + l * 0.23, y = c.y + 6.8;
      this._box(c.x, y + 1.2, z - 4, w - 1.6, 0.32, 2.4, dark);
      this._box(c.x, y + 0.77, z - 4, w - 1.6, 0.25, 0.3, brass);
      for (const side of [-1, 1]) {
        this._pipe(new THREE.Vector3(c.x + side * (w / 2 - 2), y + 1.35, z - 4), new THREE.Vector3(c.x + side * (w / 2 - 2), c.y + 12, z - 4), 0.055, brass, 8);
        this._pipe(new THREE.Vector3(c.x - w / 2 + 1.2, y + 2.4, z - 4 + side * 1.05), new THREE.Vector3(c.x + w / 2 - 1.2, y + 2.4, z - 4 + side * 1.05), 0.045, brass, 6);
      }
      const clockX = c.x - w * 0.17;
      this._pipe(new THREE.Vector3(clockX, c.y + 15, z), new THREE.Vector3(clockX, y + 1.3, z), 0.045, brass, 6);
      this._cylinder(clockX, y, z, 1.18, 0.18, brass, 1.18, 48, [Math.PI / 2, 0, 0]);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e0d5b8'; ctx.beginPath(); ctx.arc(256, 256, 249, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#24333b'; ctx.fillStyle = '#24333b'; ctx.lineWidth = 3;
      for (let j = 0; j < 60; j++) {
        const a = j / 60 * Math.PI * 2, inner = j % 5 === 0 ? 200 : 218;
        ctx.beginPath(); ctx.moveTo(256 + Math.sin(a) * inner, 256 - Math.cos(a) * inner); ctx.lineTo(256 + Math.sin(a) * 231, 256 - Math.cos(a) * 231); ctx.stroke();
      }
      ctx.font = '38px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let j = 1; j <= 12; j++) { const a = j / 12 * Math.PI * 2; ctx.fillText(String(j), 256 + Math.sin(a) * 167, 256 - Math.cos(a) * 167); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, metalness: 0.05 }); this._ownedMaterials.push(material); this._ownedTextures.push(texture);
      this._addGeometry(new THREE.CircleGeometry(1.10, 48), material, { position: new THREE.Vector3(clockX, y, z + 0.102) });
      this._box(clockX + 0.18, y + 0.17, z + 0.14, 0.065, 0.7, 0.05, dark, false, [0, 0, -0.77]);
      this._box(clockX - 0.14, y + 0.37, z + 0.15, 0.045, 0.85, 0.055, dark, false, [0, 0, 0.37]);
    } else if (this.districtIndex === 2) {
      for (const side of [-1, 1]) {
        const x = c.x + side * w * 0.29, z = c.z + l * 0.23, y = c.y + 5.3;
        this._cylinder(x, y, z, 1.1, 0.7, this._mat('patina'), 1.4, 20);
        this._cylinder(x, y + 0.37, z, 1.26, 0.05, this._mat('soil'), 1.26, 20);
        for (let j = 0; j < 3; j++) { const a = j * Math.PI * 2 / 3; this._pipe(new THREE.Vector3(x + Math.cos(a) * 1.2, y + 0.3, z + Math.sin(a) * 1.2), new THREE.Vector3(x, c.y + 12.3, z), 0.027, brass, 6); }
        this._fern(x, y + 0.42, z, 2.1);
        for (let j = 0; j < 7; j++) {
          const a = j * 2.399, radius = 0.7 + this.random() * 0.45;
          for (let k = 0; k < 7; k++) this._addGeometry(new THREE.PlaneGeometry(0.32, 0.45), this._mat('leaf', { color: 0x83b965, side: THREE.DoubleSide }), { position: new THREE.Vector3(x + Math.cos(a) * (radius + k * 0.055), y - k * 0.24, z + Math.sin(a) * (radius + k * 0.055)), rotation: [-0.3, a + k * 0.2, 0.2] });
        }
      }
    } else if (this.districtIndex === 3) {
      const x = c.x - w * 0.27, z = c.z + l * 0.2, y = c.y + 6.4;
      this._cylinder(x, y, z, 1.8, 3.2, rust, 3.0, 32);
      this._cylinder(x, y + 1.68, z, 3.06, 0.2, dark, 3.06, 32);
      this._cylinder(x, y + 1.8, z, 2.7, 0.05, this._mat('emissive', { color: 0xe7a14c, emissive: 0xff6b1b, emissiveIntensity: 2 }), 2.7, 32);
      for (const side of [-1, 1]) {
        this._box(x + side * 3.5, c.y + 11.5, z, 0.5, 0.65, l + 10, steel);
        this._pipe(new THREE.Vector3(x + side * 2.4, y + 1, z), new THREE.Vector3(x + side * 2.4, c.y + 11.4, z), 0.12, dark, 8);
        this._pipe(new THREE.Vector3(c.x + side * (w / 2 - 1.5), c.y + 9.3, c.z - l / 2), new THREE.Vector3(c.x + side * (w / 2 - 1.5), c.y + 9.3, c.z + l / 2), 0.31, this._mat('steel', { color: 0x8a9d9b }), 16);
      }
      this._box(x, c.y + 11, z, 7.8, 0.75, 1.4, dark);
      this._addGeometry(new THREE.TorusGeometry(1.94, 0.12, 8, 40), brass, { position: new THREE.Vector3(x, y - 1.15, z), rotation: [Math.PI / 2, 0, 0] });
    } else if (this.districtIndex === 4) {
      const x = c.x - w / 2 - 7.5, z = c.z - 1, y = c.y + 7.4;
      this._cylinder(x, y, z, 9.2, 5.2, this._mat('patina'), 9.2, 48, [0, 0, Math.PI / 2]);
      this._addGeometry(new THREE.TorusGeometry(9.25, 0.35, 12, 64), steel, { position: new THREE.Vector3(x + 2.7, y, z), rotation: [0, Math.PI / 2, 0] });
      this._cylinder(x + 2.75, y, z, 2.3, 0.7, brass, 2.3, 32, [0, 0, Math.PI / 2]);
      for (let j = 0; j < 16; j++) {
        const a = j * Math.PI / 8;
        this._beam(new THREE.Vector3(x + 2.8, y + Math.cos(a) * 2.2, z + Math.sin(a) * 2.2), new THREE.Vector3(x + 2.8, y + Math.cos(a + 0.12) * 8.8, z + Math.sin(a + 0.12) * 8.8), 0.4, dark, 0.8);
        this._cylinder(x + 3.05, y + Math.cos(a) * 8.8, z + Math.sin(a) * 8.8, 0.13, 0.24, brass, 0.13, 10, [0, 0, Math.PI / 2]);
      }
      this._pipe(new THREE.Vector3(x - 3, c.y - 20, z), new THREE.Vector3(x - 3, c.y + 27, z), 3.6, this._mat('patina'), 28);
      for (const h of [-10, 0, 10, 20]) this._cylinder(x - 3, c.y + h, z, 3.9, 0.48, steel, 3.9, 28);
      this._box(x, c.y - 7, z, 13, 16, 16, this._mat('concrete'));
      this._box(x, c.y + 1.15, z - 7.4, 14, 0.3, 1, this._mat('snow'));
    } else {
      for (const side of [-1, 1]) {
        const x = c.x + side * (w / 2 + 4.7), z = c.z + l * 0.13;
        this._cylinder(x, c.y + 9.2, z, 0.85, 21, this._mat('patina'), 0.58, 24);
        for (let j = 0; j < 6; j++) {
          const radius = 3.9 - j * 0.28;
          this._addGeometry(new THREE.TorusGeometry(radius, 0.19, 10, 56), brass, { position: new THREE.Vector3(x, c.y + 4.7 + j * 2, z), rotation: [Math.PI / 2, 0, 0] });
          for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; this._beam(new THREE.Vector3(x, c.y + 4.7 + j * 2, z), new THREE.Vector3(x + Math.cos(a) * radius, c.y + 4.7 + j * 2, z + Math.sin(a) * radius), 0.13, dark); }
        }
        this._beam(new THREE.Vector3(x, c.y + 18.4, z), new THREE.Vector3(c.x + side * 3, c.y + 19.1, z - 7), 0.17, brass);
      }
    }
  }

  _optionalRoute(arena, index) {
    const c = arena.center, side = ((this.sector.index || 0) + index) % 2 ? -1 : 1;
    if (['bridge', 'aqueduct', 'gantry'].includes(arena.shape)) {
      const x = c.x - arena.width * 0.43, edge = c.z + arena.length * 0.43;
      const mat = this._mat(this.districtIndex === 2 ? 'stone' : 'steel');
      this._rectFloor(x, c.y + 0.8, c.z, 3, arena.length * 0.77, mat, 0.3);
      for (const direction of [-1, 1]) {
        this._rectFloor(x, c.y + 0.4, c.z + direction * arena.length * 0.41, 3, 1.3, mat, 0.4);
      }
      this._rail(new THREE.Vector3(x - 1.35, c.y + 0.8, c.z - arena.length * 0.36), new THREE.Vector3(x - 1.35, c.y + 0.8, c.z + arena.length * 0.36), this._mat('brass'));
      this._pickup('health', new THREE.Vector3(x, c.y + 1.6, c.z - 2), `${this.sector.index}-${index}-walkway-health`);
      return;
    }
    const x = c.x + side * (arena.width * 0.40), z = c.z - 6;
    const concrete = this._mat(['wood', 'marble', 'stone', 'dark', 'concreteClean', 'dark'][this.districtIndex], this.districtIndex === 3 ? { color: 0x83918f, roughness: 0.88, metalness: 0.45 } : {});
    const top = c.y + 2.4;
    this._rectFloor(x, top, z - 4, 3.6, 10, concrete, 0.5);
    for (let step = 0; step < 6; step++) this._rectFloor(x, c.y + (step + 1) * 0.4, z + 4.3 - step * 0.8, 3.6, 0.83, concrete, (step + 1) * 0.4);
    this._rail(new THREE.Vector3(x + side * 2, top, z - 8.7), new THREE.Vector3(x + side * 2, top, z + 0.6), this._mat('steel'));
    for (const dz of [-8, -1]) this._box(x, c.y + 0.95, z + dz, 0.7, 1.9, 0.7, this._mat('dark'), true);
    if (index !== 1) this._pickup('health', new THREE.Vector3(x, top + 0.8, z - 6), `${this.sector.index}-${index}-upper-health`);
    this._box(x - side * 1.85, top + 0.04, z - 4, 0.065, 0.04, 8, this._mat('emissive', { color: CYAN, emissive: CYAN, emissiveIntensity: 1.2 }));
  }

  _sideWall(x, y, z, width, height, length, material, side, index) {
    if (side !== 1 || index !== 1) { this._box(x, y, z, width, height, length, material); return; }
    const doorZ = z + 2.5, opening = 5.2;
    const north = z - length / 2, south = z + length / 2;
    const partA = doorZ - opening / 2 - north, partB = south - doorZ - opening / 2;
    this._box(x, y, north + partA / 2, width, height, partA, material, true);
    this._box(x, y, south - partB / 2, width, height, partB, material, true);
    if (height > 4.6) this._box(x, y + height / 2 - (height - 4.6) / 2, doorZ, width, height - 4.6, opening, material);
  }

  _secretRoom(arena) {
    const c = arena.center, doorZ = c.z + 2.5, rim = c.x + arena.width / 2;
    const nominalDelta = [-2.4, 0, -1.6, 2.4, 2.4, 2.4][this.districtIndex];
    // Staff refuges sit on dry plinths even when an arena descends into the
    // drydock. Water remains an optional route to their exterior ladders.
    const y = this.districtIndex < 3 ? Math.max(-2.8, c.y + nominalDelta) : c.y + nominalDelta, delta = y - c.y;
    const x = rim + 9.3, roomWidth = 8, depth = 9;
    const floor = this._mat(this.districtIndex === 1 ? 'marble' : this.districtIndex === 2 ? 'stone' : 'concrete');
    const wall = this._mat(['concrete', 'plaster', 'stone', 'dark', 'plaster', 'patina'][this.districtIndex]);
    const startX = c.x + arena.width * 0.18;
    this._rectFloor((startX + rim + 0.9) / 2, c.y, doorZ, rim + 0.9 - startX, 4.5, floor, 0.5);
    const steps = Math.max(1, Math.round(Math.abs(delta) / 0.4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, sx = rim + 0.4 + t * 4.6;
      this._rectFloor(sx, c.y + delta * t, doorZ, 4.6 / steps + 0.3, 4.5, floor, 0.55);
      this._box(sx, c.y + delta * t + 0.035, doorZ - 2.02, 4.6 / steps + 0.2, 0.04, 0.07, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 1 }));
    }
    this._rectFloor(x, y, doorZ, roomWidth, depth, floor, 0.7);
    // Real door aperture, desk, sleeping bench, window and sheltered roof. Each
    // refuge sits outside the combat route and can be physically walked into.
    this._box(x + roomWidth / 2, y + 1.8, doorZ, 0.4, 3.6, depth, wall, true);
    for (const direction of [-1, 1]) {
      if (direction === 1 && this.districtIndex < 3) {
        this._box(x - 3.25, y + 1.8, doorZ + depth / 2, 1.5, 3.6, 0.4, wall, true);
        this._box(x + 1.75, y + 1.8, doorZ + depth / 2, 4.5, 3.6, 0.4, wall, true);
        this._box(x - 1.5, y + 3.25, doorZ + depth / 2, 2, 0.7, 0.4, wall);
      } else this._box(x, y + 1.8, doorZ + direction * depth / 2, roomWidth, 3.6, 0.4, wall, true);
    }
    for (const direction of [-1, 1]) this._box(x - roomWidth / 2, y + 1.8, doorZ + direction * 3.45, 0.4, 3.6, 2.1, wall, true);
    this._box(x - roomWidth / 2, y + 3.25, doorZ, 0.4, 0.7, 4.8, wall);
    this._box(x, y + 3.65, doorZ, roomWidth + 0.4, 0.28, depth + 0.5, this._mat(this.districtIndex === 4 ? 'snow' : 'dark'));
    this._box(x + 1.55, y + 0.85, doorZ - 2.6, 2.4, 0.15, 1.2, this._mat('wood'), true);
    for (const dx of [-0.9, 0.9]) this._box(x + 1.55 + dx, y + 0.4, doorZ - 2.6, 0.12, 0.8, 0.8, this._mat('steel'));
    this._bench(x + 1.2, y, doorZ + 3.3);
    this._box(x + 3.75, y + 2.0, doorZ + 0.1, 0.035, 1.6, 3.7, this._mat('glass', { color: 0xb1cbcc, transparent: true, opacity: 0.45 }));
    this._box(x + 1.55, y + 0.975, doorZ - 2.55, 0.7, 0.035, 0.48, this._mat('plaster', { color: 0xffe6b7 }));
    this._cylinder(x + 2.4, y + 1.06, doorZ - 2.55, 0.12, 0.2, this._mat('marble'), 0.12, 12);
    this._box(x - 3.6, y + 2.3, doorZ - 2.25, 0.22, 0.35, 0.2, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 2.2 }));
    this._sign(x + 0.6, y + 2.3, doorZ - 4.26, this.sector.secret?.name || 'STAFF REFUGE', 'PERSONNEL / REST AREA', 4.6);
    if (this.districtIndex === 2) {
      this._planter(x + 1.2, y, doorZ + 1, 2.6, 2.2, true);
      this._fern(x - 2.5, y, doorZ + 3.4, 1.3);
    } else if (this.districtIndex === 4) {
      this._box(x + 3.6, y + 0.6, doorZ + 2.4, 0.3, 1.2, 1.6, this._mat('paint', { color: 0xd8c8b5 }));
      for (let i = 0; i < 7; i++) this._box(x + 3.41, y + 0.6, doorZ + 1.75 + i * 0.2, 0.05, 0.9, 0.05, this._mat('rust'));
    } else if (this.districtIndex === 1) {
      for (let i = 0; i < 3; i++) this._crate(x - 0.7 + i * 0.6, y, doorZ + 3.2, 0.5);
    }
    this._pickup('secret', new THREE.Vector3(x + 1.6, y + 1.5, doorZ - 2.5), `${this.sector.index}-secret`);
    if (this.districtIndex < 3) this._ladder(new THREE.Vector3(x - 1.5, -3.2, doorZ + depth / 2 + 0.38), new THREE.Vector3(x - 1.5, y, doorZ + depth / 2 - 1.0), 'Climb to the service refuge', true);
    const light = new THREE.PointLight(0xffcf8d, 15, 10, 2); light.position.set(x, y + 2.8, doorZ); this._root.add(light);
  }

  _swimBasin(centers) {
    this._waterBounds = null;
    if (this.districtIndex > 2) return;
    const minZ = this.exit.z - 15, maxZ = this.spawn.z + 18;
    this._waterBounds = { minX: -69, maxX: 69, minZ, maxZ, y: -3.2 };
    const length = maxZ - minZ, z = (maxZ + minZ) / 2;
    this._rectFloor(0, -8.2, z, 139, length + 1, this._mat('stone'), 1);
    // Retaining walls give the swimmable basin a real, readable limit.
    for (const x of [-70, 70]) this._box(x, -2.8, z, 2, 11, length + 2, this._mat('concrete'), true);
    for (const edge of [minZ - 1, maxZ + 1]) this._box(0, -2.8, edge, 141, 11, 2, this._mat('concrete'), true);
    for (let i = 0; i < 14; i++) {
      const x = (this.random() - 0.5) * 100, zz = minZ + this.random() * length;
      this._box(x, -7.4, zz, 2 + this.random() * 3, 1.4, 3 + this.random() * 3, this._mat('stone'), false, [0, this.random() * 3, 0]);
    }
  }

  waterAt(x, z) {
    const b = this._waterBounds;
    return b && x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ ? b.y : null;
  }

  _serviceLadders(arena) {
    const c = arena.center;
    for (const side of [-1, 1]) {
      const x = c.x + side * (arena.width / 2 + 0.45), z = c.z + arena.length * 0.31;
      this._ladder(new THREE.Vector3(x, -3.2, z), new THREE.Vector3(c.x + side * (arena.width / 2 - 2.5), c.y, z), 'Climb to the maintenance deck');
    }
  }

  _ladder(position, target, label, alongX = false) {
    const low = Math.min(position.y - 1.5, target.y - 1), high = target.y + 1;
    const metal = this._mat('brass');
    for (const side of [-1, 1]) this._pipe(new THREE.Vector3(position.x + (alongX ? side * 0.45 : 0), low, position.z + (alongX ? 0 : side * 0.45)), new THREE.Vector3(position.x + (alongX ? side * 0.45 : 0), high, position.z + (alongX ? 0 : side * 0.45)), 0.055, metal, 8);
    for (let y = low + 0.3; y <= high; y += 0.34) this._pipe(new THREE.Vector3(position.x - (alongX ? 0.45 : 0), y, position.z - (alongX ? 0 : 0.45)), new THREE.Vector3(position.x + (alongX ? 0.45 : 0), y, position.z + (alongX ? 0 : 0.45)), 0.045, metal, 6);
    this.interactables.push({ kind: 'ladder', position: new THREE.Vector3(position.x, Math.min(position.y + 0.2, target.y - 0.5), position.z), target, radius: Math.max(3.4, target.y - position.y + 0.5), label });
    this._box(position.x, high + 0.15, position.z, 0.2, 0.22, 0.2, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 2.4 }));
  }

  _sectorLandmark(arena, definition, index) {
    const c = arena.center, w = arena.width, l = arena.length, layout = this.sector.layout;
    const metal = this._mat('dark'), brass = this._mat('brass');
    if (['ring', 'coil', 'spiral', 'switchback'].includes(definition.shape) && !definition.boss) {
      // The centre is physically occupied: players choose a short inside cut or
      // the wider flank, and returning throws can cross the resulting lanes.
      const radius = Math.min(2.5, w * 0.075), z = c.z + 1;
      this._cylinder(c.x, c.y + 1.35, z, radius, 2.7, this._mat(this.districtIndex === 2 ? 'stone' : 'patina'), radius, 20);
      this.solids.push({ minX: c.x - radius, maxX: c.x + radius, minY: c.y, maxY: c.y + 2.7, minZ: z - radius, maxZ: z + radius, active: true });
      for (let i = 0; i < 3; i++) this._inlayCircle(c.x, c.y + 0.021, z, radius + 1.4 + i * 0.18, brass);
      this._cylinder(c.x, c.y + 3.1, z, radius * 0.55, 0.55, this._mat('steel'), radius * 0.5, 20);
    }
    if (definition.shape === 'terrace') {
      // Broad climbable fighting terrace with three stair approaches.
      const px = c.x - w * 0.29, pz = c.z - l * 0.1;
      this._rectFloor(px, c.y + 1.6, pz, w * 0.26, l * 0.46, this._mat('concrete'), 1.6);
      for (let step = 0; step < 4; step++) this._rectFloor(px, c.y + (step + 1) * 0.4, pz + l * 0.23 + 3 - step * 0.85, w * 0.26, 0.9, this._mat('concrete'), (step + 1) * 0.4);
      this._pickup('health', new THREE.Vector3(px, c.y + 2.4, pz), `${this.sector.index}-${index}-terrace-health`);
    }
    if (layout === 'stacked-switchback') {
      for (const side of [-1, 1]) for (let dz = -l * 0.35; dz < l * 0.4; dz += 9) for (let level = 0; level < 2 + (index % 2); level++) this._container(c.x + side * (w / 2 + 4), c.y + level * 2.65, c.z + dz, 5.5, 2.6, 8, level + index);
      if (index !== 2) this._container(c.x + (index % 2 ? 1 : -1) * 3, c.y, c.z - 1, 3.8, 2.6, 6, index);
    } else if (layout === 'ribbed-diagonal') {
      for (let z = -l / 2; z <= l / 2; z += 4) {
        this._arch(c.x, c.y + 5.5, c.z + z, w * 0.49, 0.3, this._mat('rust'), 0.38);
        this._box(c.x, c.y + 6, c.z + z, 0.4, 0.6, 0.7, metal);
      }
      this._box(c.x, c.y + w * 0.49 + 5.7, c.z, 2.4, 1, l + 4, this._mat('wood'));
    } else if (layout === 'parallel-platforms' || layout === 'three-track-junction') {
      for (const side of [-1, 1]) {
        for (const rail of [-0.65, 0.65]) this._box(c.x + side * w * 0.15 + rail, c.y + 0.03, c.z, 0.07, 0.05, l * 0.9, this._mat('steel'));
        for (let z = -l * 0.43; z < l * 0.44; z += 1.3) this._box(c.x + side * w * 0.15, c.y + 0.025, c.z + z, 2, 0.04, 0.16, this._mat('wood'));
      }
      if (index === 0) this._box(c.x - w * 0.3, c.y + 1.15, c.z - 1, 3.4, 2.3, 10, this._mat('paint', { color: 0xb9b7a5 }), true);
    } else if (layout === 'signal-spiral') {
      for (const side of [-1, 1]) {
        this._box(c.x + side * (w * 0.34), c.y + 1.7, c.z + 5, 1.2, 3.4, 1.1, metal, true);
        for (let h = 0; h < 3; h++) this._cylinder(c.x + side * (w * 0.34), c.y + 2.4 + h * 0.32, c.z + 5.58, 0.10, 0.045, this._mat('emissive', { color: h === 2 ? AMBER : 0x486166, emissive: h === 2 ? AMBER : 0x000000, emissiveIntensity: 1.2 }), 0.10, 12, [Math.PI / 2, 0, 0]);
      }
    } else if (layout === 'terraced-canopy') {
      for (const side of [-1, 1]) {
        this._rectFloor(c.x + side * (w / 2 + 4), c.y + 4, c.z, 6, l * 0.8, this._mat('stone'), 0.6);
        for (let z = -l * 0.3; z <= l * 0.3; z += 7) this._tree(c.x + side * (w / 2 + 4), c.y + 4, c.z + z, 8);
      }
    } else if (layout === 'curved-aqueduct') {
      this._box(c.x, c.y + 8.2, c.z, 4.1, 1.2, l + 8, this._mat('stone'));
      this._box(c.x, c.y + 8.85, c.z, 3.3, 0.03, l + 8, this._mat('water', { color: 0x789e88, opacity: 0.9 }));
      for (const side of [-1, 1]) this._box(c.x + side * 2.2, c.y + 9, c.z, 0.3, 1.4, l + 8, this._mat('stone'));
      for (const dz of [-l * 0.34, l * 0.34]) {
        this._arch(c.x, c.y, c.z + dz, 6.7, 1.5, this._mat('stone'), 0.6);
      }
    } else if (layout === 'hot-channel-crossing' || layout === 'staggered-crucibles') {
      for (const side of [-1, 1]) {
        const sx = c.x + side * (w / 2 + 4);
        this._cylinder(sx, c.y + 2.7, c.z + side * 7, 4, 6, this._mat('rust'), 5, 24);
        this._cylinder(sx, c.y + 5.74, c.z + side * 7, 4.7, 0.09, this._mat('emissive', { color: 0xff9d40, emissive: 0xff5514, emissiveIntensity: 2.8 }), 4.7, 24);
      }
    } else if (layout === 'overhead-conveyors') {
      for (const side of [-1, 1]) {
        const px = c.x + side * 4;
        this._box(px, c.y + 7, c.z, 2.1, 0.4, l + 5, this._mat('steel'));
        for (let z = -l / 2; z <= l / 2; z += 2) this._box(px, c.y + 7.28, c.z + z, 2.2, 0.08, 0.11, this._mat('dark'));
        for (const z of [-l * 0.35, l * 0.35]) this._pipe(new THREE.Vector3(px, c.y + 7, c.z + z), new THREE.Vector3(px, c.y + 13.5, c.z + z), 0.09, brass, 6);
      }
    } else if (layout === 'radial-scaffolds' || layout === 'hydraulic-threshold') {
      for (const side of [-1, 1]) {
        const x = c.x + side * (w / 2 + 7), z = c.z - 4;
        this._cylinder(x, c.y + 4, z, 6.5, 5, this._mat('patina'), 6.5, 32, [0, 0, Math.PI / 2]);
        for (let i = 0; i < 12; i++) {
          const angle = i * Math.PI / 6;
          this._beam(new THREE.Vector3(x, c.y + 4, z), new THREE.Vector3(x, c.y + 4 + Math.cos(angle) * 6, z + Math.sin(angle) * 6), 0.35, this._mat('steel'));
        }
      }
    } else if (layout === 'inner-outer-ring' || layout === 'orbiting-coils') {
      for (const side of [-1, 1]) {
        this._pipe(new THREE.Vector3(c.x + side * w * 0.36, c.y + 7, c.z - l / 2), new THREE.Vector3(c.x + side * w * 0.36, c.y + 7, c.z + l / 2), 0.23, brass);
        for (let z = -l / 2; z <= l / 2; z += 4) this._addGeometry(new THREE.TorusGeometry(1.0, 0.12, 8, 24), this._mat('patina'), { position: new THREE.Vector3(c.x + side * w * 0.36, c.y + 7, c.z + z) });
      }
    }
  }

  _pickup(type, position, id) {
    const color = type === 'secret' ? AMBER : 0x8bd7c0;
    const group = new THREE.Group(); group.position.copy(position);
    const material = this._mat('emissive', { color, emissive: color, emissiveIntensity: 1.4 });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(type === 'secret' ? 0.24 : 0.19), material); group.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.032, 6, 28), this._mat('brass')); ring.rotation.x = Math.PI / 2.7; group.add(ring);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.43, 0.13, 12), this._mat('dark')); base.position.y = -0.52; group.add(base);
    this._root.add(group);
    this.pickups.push({ id, type, position: position.clone(), mesh: group, claimed: false, baseY: position.y });
  }

  _sign(x, y, z, title, subtitle, width = 3.6) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#16232a'; ctx.fillRect(0, 0, 768, 256);
    ctx.strokeStyle = '#b69a6b'; ctx.lineWidth = 5; ctx.strokeRect(12, 12, 744, 232);
    ctx.fillStyle = '#e6d9bd'; ctx.font = 'bold 39px sans-serif'; ctx.textAlign = 'left';
    const label = String(title).toUpperCase(); ctx.fillText(label.length > 29 ? label.slice(0, 28) + '…' : label, 40, 112, 685);
    ctx.font = '23px sans-serif'; ctx.fillStyle = '#c5a26c'; ctx.fillText(String(subtitle).toUpperCase(), 42, 174);
    ctx.fillText('↑', 671, 175);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 2;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62, metalness: 0.2, emissive: new THREE.Color(0xc7b594), emissiveMap: texture, emissiveIntensity: 0.12 });
    this._ownedMaterials.push(material); this._ownedTextures.push(texture);
    this._box(x, y, z - 0.07, width + 0.14, width / 3 + 0.14, 0.12, this._mat('brass'));
    this._addGeometry(new THREE.PlaneGeometry(width, width / 3), material, { position: new THREE.Vector3(x, y, z) });
  }

  _destination(x, y, z) {
    this._box(x - 6.4, y + 5, z, 3, 10, 6, this._mat('concrete'), true);
    this._box(x + 6.4, y + 5, z, 3, 10, 6, this._mat('concrete'), true);
    this._box(x, y + 8.5, z, 13, 3, 6, this._mat(this.districtIndex === 5 ? 'patina' : 'steel'));
    this._sign(x, y + 6.35, z + 3.08, this.sector.index === 24 ? 'THE HEART / RETURN' : 'UPLINK / NEXT SECTOR', 'BREAKWATER MAINTENANCE AUTHORITY', 7);
    this._box(x, y + 0.02, z + 2.5, 7.5, 0.045, 0.15, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 2.4 }));
  }

  _lighting(district) {
    this.scene.background = new THREE.Color(district.sky ?? 0x284555);
    this.scene.fog = new THREE.FogExp2(district.fog ?? 0x718b97, district.fogDensity ?? 0.004);
    const hemi = new THREE.HemisphereLight(district.ambient ?? 0x9fbaca, 0x252d35, [0.65, 0.62, 0.85, 0.50, 0.78, 0.63][this.districtIndex]);
    const sun = new THREE.DirectionalLight(district.sun ?? 0xffe4bc, [2.35, 1.5, 3.6, 1.6, 3.2, 2.7][this.districtIndex]);
    this._sunOffset = new THREE.Vector3(65, this.districtIndex === 0 ? 39 : 70, 70);
    sun.target.position.set(0, 0, -16); sun.position.copy(sun.target.position).add(this._sunOffset);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -37, right: 37, top: 53, bottom: -53, near: 1, far: 240 });
    sun.shadow.bias = -0.00008; sun.shadow.normalBias = 0.018; sun.shadow.radius = 2;
    this.scene.add(hemi, sun, sun.target); this._lights.push(hemi, sun, sun.target); this.sun = sun;
    this._sky(district);
    this._environment(district);
  }

  _environment(district) {
    if (this._photoEnvironment) { this._applyPhotographicSky(); return; }
    const key = this.sector.layout === 'dawn-breakwater' ? 'dawn' : this.districtIndex;
    if (!this._environments.has(key)) {
      const width = 256, height = 128, data = new Float32Array(width * height * 4);
      const sky = new THREE.Color(district.ambient || 0xa7bdca), horizon = new THREE.Color(district.sun || 0xffdeb5), ground = new THREE.Color(0x303837);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const v = y / (height - 1), u = x / width;
        const c = v < 0.5 ? sky.clone().lerp(horizon, Math.pow(v * 2, 5) * 0.65) : horizon.clone().lerp(ground, Math.min(1, (v - 0.5) * 4));
        const glow = Math.exp(-((u - 0.68) ** 2 * 90 + (v - 0.34) ** 2 * 130));
        const n = (y * width + x) * 4;
        data[n] = c.r * 0.9 + glow * 2.1; data[n + 1] = c.g * 0.9 + glow * 1.7; data[n + 2] = c.b * 0.9 + glow * 1.25; data[n + 3] = 1;
      }
      const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType); texture.mapping = THREE.EquirectangularReflectionMapping; texture.needsUpdate = true;
      const generator = new THREE.PMREMGenerator(this.renderer);
      const target = generator.fromEquirectangular(texture); texture.dispose(); generator.dispose(); this._environments.set(key, target);
    }
    this.scene.environment = this._environments.get(key).texture;
    this.scene.environmentIntensity = 0.65;
  }

  async _loadPhotographicSky() {
    try {
      const texture = await new RGBELoader().loadAsync(new URL('../assets/sky/coastal-clouds-2k.hdr', import.meta.url).href);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const generator = new THREE.PMREMGenerator(this.renderer);
      this._photoEnvironment = generator.fromEquirectangular(texture); this._photoSky = texture; generator.dispose();
      if (this.district) this._applyPhotographicSky();
    } catch (error) {
      console.warn('BREAKWATER: photographic sky unavailable; using the local atmospheric fallback.', error);
    }
  }

  _applyPhotographicSky() {
    this.scene.environment = this._photoEnvironment.texture;
    this.scene.background = this._photoSky;
    this.scene.backgroundIntensity = this.sector?.layout === 'dawn-breakwater' ? 0.85 : [0.38, 0.29, 0.86, 0.19, 0.78, 0.38][this.districtIndex];
    this.scene.backgroundBlurriness = 0;
    if (this._skyMesh) this._skyMesh.visible = false;
  }

  _sky(district) {
    const material = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {
      zenith: { value: new THREE.Color(district.sky || 0x50778f) }, horizon: { value: new THREE.Color(district.fog || 0x9baeb2) }, warmth: { value: new THREE.Color(district.sun || 0xffdcad) }, sunDirection: { value: new THREE.Vector3(-0.45, 0.38, -0.57).normalize() }, storm: { value: [0, 3, 5].includes(this.districtIndex) ? 0.68 : 0.3 }, time: { value: 0 }
    }, vertexShader: `varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z=gl_Position.w*.99999; }`, fragmentShader: `
      varying vec3 direction; uniform vec3 zenith,horizon,warmth,sunDirection; uniform float storm,time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){ vec3 d=normalize(direction); float h=max(d.y,0.); vec3 col=mix(horizon,zenith,pow(h,.55));
        float sun=max(dot(d,sunDirection),0.);col+=warmth*(pow(sun,95.)*.28+pow(sun,1800.)*1.8);
        vec2 p=d.xz/max(.13,d.y+.17)*2.7+vec2(time*.002,0.);float n=noise(p)*.58+noise(p*2.03)*.28+noise(p*4.07)*.14;
        float cloud=smoothstep(.36,.91,n)*smoothstep(-.02,.25,d.y); col=mix(col,mix(horizon*.75,vec3(.76,.80,.83),n)*.88,cloud*storm*.25);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), material); mesh.position.z = -110; mesh.renderOrder = -10;
    this._root.add(mesh); this._ownedMaterials.push(material); this._skyMaterial = material; this._skyMesh = mesh;
  }

  _backdrop(centers) {
    this._staticNoShadow = true;
    const far = centers.at(-1).z - 45;
    this._water(this.spawn.x, this.districtIndex === 5 ? -55 : this.districtIndex === 4 ? -24 : -3.2, (far + 30) / 2, 900, 1100, this.districtIndex === 3);
    const concrete = this._mat('concrete');
    if (this.districtIndex === 0) {
      for (let i = 0; i < 13; i++) {
        const side = i % 2 ? -1 : 1, x = side * (55 + this.random() * 60), z = 12 - i * 23, height = 14 + this.random() * 42;
        this._building(x, -5, z, 15 + this.random() * 13, height, 20, i);
      }
      this._lighthouse(-33, -2, -88, 35);
      this._ship(-41, -2.7, -24);
    } else if (this.districtIndex === 1) {
      this._box(0, -8, far / 2, 160, 5, Math.abs(far) + 60, concrete);
      for (const side of [-1, 1]) {
        this._box(side * 45, 12, far / 2, 5, 34, Math.abs(far) + 60, this._mat('brick'));
        for (let z = 10; z > far; z -= 24) this._building(side * 62, 3, z, 22, 30 + this.random() * 20, 20, 1);
      }
    } else if (this.districtIndex === 2) {
      for (const side of [-1, 1]) for (let z = 10; z > far; z -= 28) {
        this._building(side * (45 + this.random() * 10), -5, z, 17, 19 + this.random() * 7, 22, 2);
        this._tree(side * (31 + this.random() * 5), -2, z, 9 + this.random() * 5);
      }
      this._mountains(far);
    } else if (this.districtIndex === 3) {
      for (const side of [-1, 1]) for (let z = 10; z > far; z -= 31) {
        const x = side * (39 + this.random() * 14);
        this._cylinder(x, 9, z, 5, 31, this._mat('rust'), 4.2, 20);
        this._cylinder(x, 31, z, 1.8, 19, this._mat('dark'), 2, 16);
        this._pipe(new THREE.Vector3(x, 12, z), new THREE.Vector3(x - side * 15, 12, z), 1.4, this._mat('dark'));
      }
    } else if (this.districtIndex === 4) {
      this._mountains(far);
      for (const side of [-1, 1]) {
        this._box(side * 51, -16, far / 2, 14, 70, Math.abs(far) + 50, concrete);
        for (let z = 4; z > far; z -= 27) this._box(side * 37, -17, z, 8, 68, 8, concrete);
      }
    } else {
      for (let i = 0; i < 11; i++) {
        const angle = i * 2.399, radius = 55 + this.random() * 55;
        this._building(Math.cos(angle) * radius, -64, -100 + Math.sin(angle) * 150, 12, 74 + this.random() * 38, 15, 5);
      }
      this._lighthouse(22, -24, far + 35, 81);
      this._cylinder(22, -47, far + 35, 10, 46, this._mat('dark'), 7, 20);
    }
    this._staticNoShadow = false;
  }

  _water(x, y, z, width, length, molten = false) {
    const material = this._mat('water', { color: molten ? 0x71310f : this.districtIndex === 2 ? 0x245e50 : 0x163d4b, roughness: molten ? 0.4 : 0.27, metalness: molten ? 0.08 : 0.10, emissive: molten ? 0xf0530a : 0x000000, emissiveIntensity: molten ? 1.35 : 0, transparent: false }).clone();
    material.normalMap = this._waterNormal; material.normalScale.set(0.19, 0.13); material.envMapIntensity = 0.68;
    this._ownedMaterials.push(material);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.receiveShadow = true; this._root.add(mesh);
    const uv = mesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 19, uv.getY(i) * length / 19);
    this._waterMaterial = material;
  }

  _makeWaterNormal() {
    const size = 256, data = new Uint8Array(size * size * 4), random = randomFrom(81631), waves = [];
    for (let i = 0; i < 30; i++) {
      let kx = Math.round((random() - 0.5) * 31), ky = Math.round((random() - 0.5) * 31);
      if (Math.abs(kx) + Math.abs(ky) < 3) kx += 4;
      waves.push([kx, ky, random() * Math.PI * 2, 0.3 / Math.hypot(kx, ky)]);
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let nx = 0, ny = 0;
      for (const [kx, ky, phase, amplitude] of waves) {
        const slope = Math.cos((x * kx + y * ky) / size * Math.PI * 2 + phase) * amplitude;
        nx += slope * kx; ny += slope * ky;
      }
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 4), i = (y * size + x) * 4;
      data[i] = Math.round((nx * inv * 0.5 + 0.5) * 255); data[i + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255); data[i + 2] = Math.round((2 * inv * 0.5 + 0.5) * 255); data[i + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(4, this.renderer.capabilities?.getMaxAnisotropy?.() || 1); texture.needsUpdate = true;
    return texture;
  }

  _weather() {
    if ([1, 2].includes(this.districtIndex) || this.sector.layout === 'dawn-breakwater') return;
    const snow = this.districtIndex === 4, embers = this.districtIndex === 3, count = snow ? 460 : embers ? 95 : 430;
    const geometry = new THREE.BufferGeometry(), positions = [], phases = [];
    for (let i = 0; i < count; i++) {
      const x = (this.random() - 0.5) * 52, y = this.random() * 30, z = (this.random() - 0.5) * 72, phase = this.random();
      positions.push(x, y, z); phases.push(phase);
      if (!snow && !embers) { positions.push(x - 0.04, y + 0.58, z); phases.push(phase); }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
    const material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: embers ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: {
      time: { value: 0 }, center: { value: new THREE.Vector3(0, 0, -10) }, tint: { value: new THREE.Color(snow ? 0xdce8ed : embers ? 0xe3a264 : 0x899fac) }, speed: { value: snow ? -0.75 : embers ? 0.75 : -10 }, opacity: { value: snow ? 0.52 : embers ? 0.4 : 0.14 }
    }, vertexShader: `attribute float phase;uniform float time,speed;uniform vec3 center;varying float alpha;
      void main(){vec3 p=position; p.y=mod(p.y+time*speed+600.,30.)-8.;p.x+=sin(time*.22+phase*21.+p.y*.18)*${snow ? '1.7' : '.3'};p+=center;
      vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(${snow ? '80.' : '49.'}/max(1.,-view.z),1.,${snow ? '4.5' : '3.0'});alpha=clamp(1.-length(view.xyz)/66.,0.,1.);}`, fragmentShader: `uniform vec3 tint;uniform float opacity;varying float alpha;void main(){${snow || embers ? 'float dotAlpha=1.-smoothstep(.18,.5,length(gl_PointCoord-.5));' : 'float dotAlpha=1.;'}gl_FragColor=vec4(tint,alpha*opacity*dotAlpha);}` });
    const mesh = snow || embers ? new THREE.Points(geometry, material) : new THREE.LineSegments(geometry, material);
    mesh.frustumCulled = false; this._root.add(mesh); this._ownedMaterials.push(material); this._weatherMaterial = material;
  }

  _building(x, y, z, width, height, depth, style) {
    const material = this._mat(style === 2 ? 'plaster' : style === 5 ? 'dark' : 'brick', { color: style === 2 ? 0xc7c9b8 : style === 5 ? 0x7a919b : 0x8d999e });
    const trim = this._mat(style === 5 ? 'brass' : 'concreteClean', { color: style === 5 ? 0xb2a27e : 0xadb5b5 });
    const dark = this._mat('dark', { color: 0x53626c });
    this._box(x, y + height / 2, z, width, height, depth, material);
    this._box(x, y + 0.65, z, width + 0.36, 1.3, depth + 0.36, this._mat('stone', { color: 0x829199 }));
    const window = (wx, wy, wz, sideWall) => {
      const lit = this.random() > 0.85;
      const glass = this._mat('glass', { color: lit ? 0xe0bd83 : 0x315264, roughness: 0.16, transparent: false, opacity: 1, emissive: lit ? 0x896232 : 0x000000, emissiveIntensity: lit ? 0.3 : 0 });
      if (sideWall) {
        const side = Math.sign(wx - x);
        this._box(wx, wy, wz, 0.13, 2.72, 1.75, dark);
        this._box(wx + side * 0.09, wy, wz, 0.04, 2.25, 1.35, glass);
        for (const dz of [-0.86, 0.86]) this._box(wx + side * 0.19, wy, wz + dz, 0.25, 2.9, 0.12, trim);
        for (const dy of [-1.42, 1.42]) this._box(wx + side * 0.2, wy + dy, wz, 0.35, 0.18, 2, trim);
        this._box(wx + side * 0.15, wy, wz, 0.08, 2.3, 0.055, dark);
        this._box(wx + side * 0.16, wy + 0.27, wz, 0.09, 0.065, 1.4, dark);
      } else {
        const side = Math.sign(wz - z);
        this._box(wx, wy, wz, 1.75, 2.72, 0.13, dark);
        this._box(wx, wy, wz + side * 0.09, 1.35, 2.25, 0.04, glass);
        for (const dx of [-0.86, 0.86]) this._box(wx + dx, wy, wz + side * 0.19, 0.12, 2.9, 0.25, trim);
        for (const dy of [-1.42, 1.42]) this._box(wx, wy + dy, wz + side * 0.2, 2, 0.18, 0.35, trim);
        this._box(wx, wy, wz + side * 0.15, 0.055, 2.3, 0.08, dark);
        this._box(wx, wy + 0.27, wz + side * 0.16, 1.4, 0.065, 0.09, dark);
      }
    };
    for (let level = 5; level < height - 1; level += 5.2) {
      this._box(x, y + level - 2.3, z, width + 0.35, 0.2, depth + 0.35, trim);
      for (let column = -width / 2 + 2.5; column < width / 2 - 1; column += 3.8) {
        window(x + column, y + level, z + depth / 2 + 0.06, false);
        window(x + column, y + level, z - depth / 2 - 0.06, false);
      }
      for (let column = -depth / 2 + 2.7; column < depth / 2 - 1; column += 4.1) {
        window(x - width / 2 - 0.06, y + level, z + column, true);
        window(x + width / 2 + 0.06, y + level, z + column, true);
      }
    }
    for (const side of [-1, 1]) {
      for (let dz = -depth / 2; dz <= depth / 2 + 0.1; dz += depth / 3) this._box(x + side * (width / 2 + 0.09), y + height / 2, z + dz, 0.32, height, 0.4, trim);
      this._pipe(new THREE.Vector3(x + side * (width / 2 + 0.32), y + 0.7, z + depth / 2 - 0.8), new THREE.Vector3(x + side * (width / 2 + 0.32), y + height - 0.5, z + depth / 2 - 0.8), 0.09, this._mat('patina'), 8);
      const doorZ = z - depth * 0.18;
      this._box(x + side * (width / 2 + 0.07), y + 1.9, doorZ, 0.1, 3.8, 3.8, dark);
      for (let h = 0.4; h < 3.8; h += 0.25) this._box(x + side * (width / 2 + 0.16), y + h, doorZ, 0.08, 0.055, 3.5, this._mat('steel', { color: 0x768a93 }));
      this._box(x + side * (width / 2 + 0.6), y + 4.1, doorZ, 1.2, 0.22, 4.9, trim);
      this._box(x + side * (width / 2 + 0.21), y + 3.65, doorZ, 0.11, 0.09, 2.9, this._mat('emissive', { color: 0xffce8e, emissive: 0xf6b65f, emissiveIntensity: 0.6 }));
    }
    for (const [h, extra] of [[height - 0.5, 0.6], [height, 1.1], [height + 0.35, 0.8]]) this._box(x, y + h, z, width + extra, 0.24, depth + extra, trim);
    this._box(x - width * 0.16, y + height + 0.7, z + depth * 0.13, 2.4, 1.1, 3, this._mat('steel', { color: 0x89999e }));
    this._cylinder(x + width * 0.25, y + height + 1.1, z - depth * 0.19, 0.6, 2.1, this._mat('rust'), 0.6, 12);
  }

  _lighthouse(x, y, z, height) {
    this._cylinder(x, y + height / 2, z, 5, height, this._mat('concrete'), 3.25, 24);
    for (let h = 8; h < height; h += 9) this._cylinder(x, y + h, z, 4.6 - h / height, 0.45, this._mat('brass'), 4.6 - h / height, 24);
    this._cylinder(x, y + height, z, 4.9, 0.6, this._mat('dark'), 4.9, 24);
    this._cylinder(x, y + height + 2, z, 2.9, 3.4, this._mat('glass', { color: 0xd8d2ac, transparent: true, opacity: 0.55 }), 2.9, 16);
    this._cylinder(x, y + height + 4.1, z, 4.3, 1.5, this._mat('patina'), 0.8, 24);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4; this._box(x + Math.cos(a) * 3, y + height + 2, z + Math.sin(a) * 3, 0.14, 3.5, 0.14, this._mat('brass'));
    }
    this._cylinder(x, y + height + 2, z, 0.6, 2.4, this._mat('emissive', { color: AMBER, emissive: AMBER, emissiveIntensity: 3 }), 0.6, 16);
  }

  _ship(x, y, z) {
    this._box(x, y, z, 13, 4, 55, this._mat('rust'));
    this._box(x, y + 2.4, z - 8, 10.6, 0.7, 35, this._mat('wood'));
    this._box(x, y + 5.5, z + 14, 10, 7, 13, this._mat('paint', { color: 0xb4bfbc }));
    this._box(x, y + 9.4, z + 15, 10.6, 0.7, 14, this._mat('dark'));
    for (let dx = -3.8; dx < 4.2; dx += 1.9) this._box(x + dx, y + 7.7, z + 20.55, 1.3, 1.8, 0.1, this._mat('glass', { color: 0x859f9b, transparent: true, opacity: 0.65 }));
    this._cylinder(x + 2, y + 11.5, z + 12, 1, 5, this._mat('rust'), 1, 12);
    this._box(x, y + 12, z - 4, 0.35, 17, 0.35, this._mat('steel'));
    this._beam(new THREE.Vector3(x, y + 18, z - 4), new THREE.Vector3(x, y + 4, z - 24), 0.06, this._mat('dark'));
    this._beam(new THREE.Vector3(x, y + 18, z - 4), new THREE.Vector3(x, y + 4, z + 17), 0.06, this._mat('dark'));
  }

  _mountains(far) {
    const stone = this._mat('stone', { color: this.districtIndex === 4 ? 0x7e919c : 0x899582 });
    const cap = this._mat(this.districtIndex === 4 ? 'snow' : 'moss', { color: this.districtIndex === 4 ? 0xdce9eb : 0x7c8d68 });
    // Continuous eroded ridges replace cone-shaped placeholder mountains.
    // Different spatial frequencies produce saddles, shoulders and broken peaks.
    for (const side of [-1, 1]) {
      const geometry = new THREE.PlaneGeometry(220, 670, 54, 110), p = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i), pz = p.getY(i), x = side * (185 + px), z = far / 2 + pz;
        const envelope = Math.pow(Math.max(0, Math.sin((px + 110) / 220 * Math.PI)), 0.75);
        const ridge = 86 + 31 * Math.sin(pz * 0.025 + side) + 25 * Math.sin(pz * 0.058 + px * 0.013) + 12 * Math.cos(pz * 0.137 - px * 0.047) + 7 * Math.sin(px * 0.15 + pz * 0.19);
        const edge = Math.pow(Math.max(0, 1 - (pz / 345) ** 2), 0.34);
        const height = -24 + envelope * ridge * edge;
        p.setXYZ(i, x, height, z); uv.setXY(i, x * 0.05, z * 0.05);
      }
      if (side > 0) { const indices = geometry.index.array; for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]; }
      geometry.computeVertexNormals();
      const expanded = geometry.toNonIndexed(); geometry.dispose();
      const arrays = [{ position: [], normal: [], uv: [] }, { position: [], normal: [], uv: [] }];
      const pos = expanded.attributes.position, normal = expanded.attributes.normal, tex = expanded.attributes.uv;
      for (let i = 0; i < pos.count; i += 3) {
        const ny = (normal.getY(i) + normal.getY(i + 1) + normal.getY(i + 2)) / 3;
        const h = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
        const destination = arrays[ny > 0.68 && h > (this.districtIndex === 4 ? 35 : 0) ? 1 : 0];
        for (let v = i; v < i + 3; v++) { destination.position.push(pos.getX(v), pos.getY(v), pos.getZ(v)); destination.normal.push(normal.getX(v), normal.getY(v), normal.getZ(v)); destination.uv.push(tex.getX(v), tex.getY(v)); }
      }
      expanded.dispose();
      arrays.forEach((attributes, i) => {
        const ridge = new THREE.BufferGeometry();
        ridge.setAttribute('position', new THREE.Float32BufferAttribute(attributes.position, 3)); ridge.setAttribute('normal', new THREE.Float32BufferAttribute(attributes.normal, 3)); ridge.setAttribute('uv', new THREE.Float32BufferAttribute(attributes.uv, 2));
        this._addGeometry(ridge, i ? cap : stone, { cast: false });
      });
    }
  }

  _quay(arena, definition, index) {
    const c = arena.center, w = arena.width, l = arena.length;
    const concrete = this._mat('concrete'), steel = this._mat('steel'), rust = this._mat('rust');
    for (const side of [-1, 1]) {
      for (let z = -l / 2 + 3; z < l / 2; z += 8) {
        const x = c.x + side * (w / 2 + 0.8);
        this._box(x, c.y - 3, c.z + z, 2.3, 6, 2.3, concrete);
        this._cylinder(x - side * 1.7, c.y + 0.42, c.z + z, 0.26, 0.8, this._mat('dark'), 0.38, 10);
        this._box(x, c.y + 0.3, c.z + z, 0.5, 0.55, 2, this._mat('wood'));
      }
    }
    const craneSide = index % 2 ? -1 : 1, cx = c.x + craneSide * (w / 2 + 3.5), cz = c.z - 3;
    for (const dx of [-1.7, 1.7]) for (const dz of [-2.5, 2.5]) this._box(cx + dx, c.y + 9, cz + dz, 0.65, 18, 0.65, rust);
    for (let h = 2; h < 18; h += 4) {
      this._box(cx, c.y + h, cz, 4, 0.4, 6, steel);
      this._beam(new THREE.Vector3(cx - 1.7, c.y + h, cz + 2.5), new THREE.Vector3(cx + 1.7, c.y + h + 4, cz + 2.5), 0.27, rust);
    }
    this._box(cx - craneSide * 10, c.y + 18.7, cz, 25, 0.8, 1.4, rust);
    this._beam(new THREE.Vector3(cx + craneSide * 1.5, c.y + 24, cz), new THREE.Vector3(cx - craneSide * 20, c.y + 19, cz), 0.12, steel);
    this._box(cx, c.y + 20.7, cz, 0.55, 7, 0.6, steel);
    this._pipe(new THREE.Vector3(c.x - craneSide * 3, c.y + 18.4, cz), new THREE.Vector3(c.x - craneSide * 3, c.y + 9.5, cz), 0.055, this._mat('dark'), 6);
    this._box(c.x - craneSide * 3, c.y + 8.9, cz, 1.2, 1.1, 1.2, rust);
    if (index !== 2) {
      this._container(c.x - craneSide * (w * 0.29), c.y, c.z - l * 0.28, 4.4, 2.6, 4.2, index);
      this._crate(c.x + craneSide * (w * 0.26), c.y, c.z + l * 0.14, 1.5);
    }
    // Weather-darkened seawalls and warm warehouse windows frame the approach.
    this._building(c.x + craneSide * (w / 2 + 14), c.y - 1, c.z, 15, 17 + index * 4, l + 5, 0);
    this._puddle(c.x - 4, c.y + 0.017, c.z + 6, 4.5, 2.2);
    this._puddle(c.x + 6, c.y + 0.018, c.z - 7, 3.3, 1.4);
  }

  _transit(arena, definition, index) {
    const c = arena.center, w = arena.width, l = arena.length;
    const marble = this._mat('marble'), brass = this._mat('brass'), brick = this._mat('brick');
    this._vault(c.x, c.y, c.z, w / 2 + 1.25, 5.5, l + 4, true);
    this._vaultPortal(c.x, c.y, c.z - l / 2 - 0.7, w / 2 + 1.25, 5.5);
    this._vaultPortal(c.x, c.y, c.z + l / 2 + 0.7, w / 2 + 1.25, 5.5, 6.2, -1);
    for (let z = -l / 2 + 1; z <= l / 2; z += 6) {
      this._arch(c.x, c.y, c.z + z, w / 2 + 1, 5.5, brass, 0.24);
      for (const side of [-1, 1]) {
        const x = c.x + side * (w / 2 - 0.5);
        this._box(x, c.y + 3.6, c.z + z, 0.95, 7.2, 1.15, marble, true);
        this._box(x, c.y + 0.35, c.z + z, 1.3, 0.7, 1.5, this._mat('dark'), true);
        this._box(x, c.y + 6.8, c.z + z, 1.55, 0.55, 1.65, brass);
        this._box(x - side * 0.51, c.y + 4.8, c.z + z, 0.08, 1.7, 0.17, this._mat('emissive', { color: 0xffdfa4, emissive: 0xffce8a, emissiveIntensity: 1.7 }));
      }
    }
    for (const side of [-1, 1]) {
      this._sideWall(c.x + side * (w / 2 + 1.2), c.y + 3.5, c.z, 0.6, 7, l + 5, brick, side, index);
      this._box(c.x + side * (w / 2 + 1.2), c.y + 7.1, c.z, 1.6, 0.4, l + 5, marble);
      this._box(c.x + side * (w / 2 + 1.2), c.y + 1.7, c.z, 0.73, 0.11, l + 5, brass);
      for (let z = -l / 2 + 5; z < l / 2; z += 11) {
        this._bench(c.x + side * (w / 2 - 2.5), c.y, c.z + z, Math.PI / 2);
      }
    }
    // A vaulted glazed lantern exposes the sea overhead without an opaque roof.
    for (let rib = -3; rib <= 3; rib++) {
      const a = Math.PI / 2 + rib * 0.18;
      const x = c.x + Math.cos(a) * (w / 2 + 1), y = c.y + 5.5 + Math.sin(a) * (w / 2 + 1);
      this._box(x, y, c.z, 0.14, 0.15, l + 2, brass);
    }
    this._box(c.x, c.y + w / 2 + 6.1, c.z, w * 0.68, 0.18, l + 1, this._mat('glass', { color: 0x709f9e, transparent: true, opacity: 0.22 }));
    if (index === 1 || definition.shape === 'platform') {
      // The refuge uses the east service passage. Park the middle station's
      // carriage on the west track so its solid body cannot seal that passage.
      const trainSide = index === 1 ? -1 : 1, sx = c.x + trainSide * (w / 2 + 5);
      this._container(sx, c.y - 0.8, c.z, 6, 4.5, l + 6, 8);
      for (let z = -l * 0.35; z <= l * 0.35; z += 3.5) this._box(sx - trainSide * 3.03, c.y + 1.7, c.z + z, 0.08, 1.4, 2, this._mat('glass', { color: 0x6e9297, opacity: 0.8, transparent: true }));
    }
    this._cylinder(c.x + (index % 2 ? -1 : 1) * w * 0.21, c.y + 1.1, c.z - 4, 1.05, 2.2, marble, 0.9, 12);
    this._cylinder(c.x + (index % 2 ? -1 : 1) * w * 0.21, c.y + 2.65, c.z - 4, 0.48, 0.9, brass, 0.15, 12);
    this._puddle(c.x - 4, c.y + 0.022, c.z - 7, 5.8, 2.6);
    this._puddle(c.x + 5, c.y + 0.021, c.z + 5, 4.2, 2);
    const chandelierY = c.y + 7.5;
    this._pipe(new THREE.Vector3(c.x, c.y + w / 2 + 5.2, c.z - 3), new THREE.Vector3(c.x, chandelierY, c.z - 3), 0.045, brass, 6);
    this._addGeometry(new THREE.TorusGeometry(2.1, 0.12, 8, 40), brass, { position: new THREE.Vector3(c.x, chandelierY, c.z - 3), rotation: [Math.PI / 2, 0, 0] });
    for (let j = 0; j < 12; j++) {
      const angle = j * Math.PI / 6;
      this._cylinder(c.x + Math.cos(angle) * 2.1, chandelierY - 0.3, c.z - 3 + Math.sin(angle) * 2.1, 0.10, 0.62, this._mat('emissive', { color: 0xf3cf98, emissive: 0xeac58f, emissiveIntensity: 1.0 }), 0.10, 10);
    }
    if (index === 0) { const lamp = new THREE.PointLight(0xffcb85, 48, 26, 2); lamp.position.set(c.x, chandelierY - 0.5, c.z - 3); this._root.add(lamp); }
  }

  _garden(arena, definition, index) {
    const c = arena.center, w = arena.width, l = arena.length;
    const frame = this._mat('paint', { color: 0xc5d1bc }), stone = this._mat('stone');
    for (let z = -l / 2; z <= l / 2; z += 7) this._arch(c.x, c.y, c.z + z, w / 2 + 2, 3, frame, 0.16);
    for (const side of [-1, 1]) {
      this._sideWall(c.x + side * (w / 2 + 2), c.y + 1.8, c.z, 0.45, 3.6, l + 2, stone, side, index);
      this._box(c.x + side * (w / 2 + 2), c.y + 8, c.z, 0.13, 0.15, l + 2, frame);
      for (let z = -l / 2 + 5; z < l / 2; z += 12) this._tree(c.x + side * (w / 2 + 5), c.y, c.z + z, 10 + this.random() * 3);
      this._planter(c.x + side * (w * 0.25), c.y, c.z + (side === 1 ? -9 : -5), 3.7, 8, true);
      if (index === 0) this._prop('tree', c.x + side * (w * 0.25), c.y + 0.88, c.z + (side === 1 ? -8 : -4), side * 0.6, 1.35);
    }
    for (let i = -3; i <= 3; i++) {
      const theta = Math.PI / 2 + i * 0.21;
      this._box(c.x + Math.cos(theta) * (w / 2 + 2), c.y + 3 + Math.sin(theta) * (w / 2 + 2), c.z, 0.13, 0.13, l + 2, frame);
    }
    // Continuous curved glazing catches the sky while preserving daylight.
    this._addGeometry(new THREE.CylinderGeometry(w / 2 + 2.03, w / 2 + 2.03, l + 1, 48, 1, true, -Math.PI / 2, Math.PI), this._mat('glass', { color: 0xaacbbb, transparent: true, opacity: 0.11, side: THREE.DoubleSide }), { position: new THREE.Vector3(c.x, c.y + 3, c.z), rotation: [-Math.PI / 2, 0, 0], cast: false });
    if (index === 2 || definition.shape === 'court') {
      const px = c.x + (index % 2 ? 1 : -1) * w * 0.22;
      this._cylinder(px, c.y + 0.35, c.z, 2.2, 0.7, stone, 2.2, 24);
      this._cylinder(px, c.y + 0.72, c.z, 1.7, 0.05, this._mat('water', { color: 0x5d9888, roughness: 0.18 }), 1.7, 24);
      this._cylinder(px, c.y + 1.65, c.z, 0.45, 2, this._mat('marble'), 0.3, 16);
      this.solids.push({ minX: px - 2.2, maxX: px + 2.2, minY: c.y, maxY: c.y + 0.72, minZ: c.z - 2.2, maxZ: c.z + 2.2, active: true });
    }
    for (let i = 0; i < 6; i++) this._fern(c.x + (this.random() > 0.5 ? -1 : 1) * (w / 2 + 1), c.y + 3.5, c.z - l / 2 + this.random() * l, 1.7);
  }

  _foundry(arena, definition, index) {
    const c = arena.center, w = arena.width, l = arena.length;
    const dark = this._mat('dark'), rust = this._mat('rust'), concrete = this._mat('concrete');
    const roofSlope = Math.atan2(3.4, w / 2 + 1.7), roofWidth = Math.hypot(w / 2 + 1.7, 3.4);
    for (const side of [-1, 1]) this._box(c.x + side * (w / 4 + 0.85), c.y + 15.2, c.z, roofWidth, 0.22, l + 5, this._mat('steel', { color: 0x646d72 }), false, [0, 0, -side * roofSlope]);
    this._box(c.x, c.y + 17.0, c.z, 2.2, 0.55, l + 5, this._mat('dark'));
    for (const side of [-1, 1]) {
      this._sideWall(c.x + side * (w / 2 + 1), c.y + 6.5, c.z, 1.3, 13, l + 5, dark, side, index);
      for (let z = -l / 2; z <= l / 2; z += 8) {
        if (!(index === 1 && side === 1 && Math.abs(z - 2.5) < 3.2)) this._box(c.x + side * (w / 2 - 0.4), c.y + 6.8, c.z + z, 1.1, 13.6, 1.2, rust, true);
        this._box(c.x, c.y + 13.5, c.z + z, w + 3, 0.6, 0.6, rust);
        this._beam(new THREE.Vector3(c.x - w / 2, c.y + 10.5, c.z + z), new THREE.Vector3(c.x, c.y + 14.8, c.z + z), 0.3, dark);
        this._beam(new THREE.Vector3(c.x + w / 2, c.y + 10.5, c.z + z), new THREE.Vector3(c.x, c.y + 14.8, c.z + z), 0.3, dark);
      }
      this._pipe(new THREE.Vector3(c.x + side * (w / 2 - 1), c.y + 8.5, c.z + l / 2), new THREE.Vector3(c.x + side * (w / 2 - 1), c.y + 8.5, c.z - l / 2), 0.8, rust);
      this._box(c.x + side * (w / 2 + 4), c.y - 0.8, c.z, 5, 0.5, l + 3, this._mat('emissive', { color: 0xf68329, emissive: 0xff4207, emissiveIntensity: 2.5 }));
    }
    const sx = c.x + (index % 2 ? -1 : 1) * (w * 0.25), sz = c.z - 5;
    this._cylinder(sx, c.y + 1.1, sz, 2.3, 2.2, concrete, 2.1, 20);
    this._cylinder(sx, c.y + 3.1, sz, 1.8, 2.1, rust, 2.4, 20);
    this._cylinder(sx, c.y + 4.25, sz, 2.1, 0.08, this._mat('emissive', { color: 0xf5b752, emissive: 0xff6218, emissiveIntensity: 2.5 }), 2.1, 24);
    this.solids.push({ minX: sx - 2.3, maxX: sx + 2.3, minY: c.y, maxY: c.y + 4.2, minZ: sz - 2.3, maxZ: sz + 2.3, active: true });
    this._pipe(new THREE.Vector3(sx, c.y + 10.7, sz), new THREE.Vector3(sx, c.y + 5, sz), 0.18, dark);
    this._cylinder(sx, c.y + 10.5, sz, 2.7, 2.1, rust, 1.6, 20);
    for (let i = 0; i < 8; i++) this._crate(c.x + (i % 2 ? -1 : 1) * (w / 2 - 2.3), c.y, c.z + (i >> 1) * 5 - 9, 1.1);
    this._puddle(c.x + 1, c.y + 0.022, c.z + 6, 3, 1.4);
    if (index < 2) { const glow = new THREE.PointLight(0xff6a22, 75, 22, 2); glow.position.set(sx, c.y + 4.6, sz); this._root.add(glow); }
  }

  _spillway(arena, definition, index) {
    const c = arena.center, w = arena.width, l = arena.length;
    const concrete = this._mat('concrete'), snow = this._mat('snow'), metal = this._mat('patina');
    for (const side of [-1, 1]) {
      const x = c.x + side * (w / 2 + 1);
      this._box(x, c.y - 17, c.z, 3, 34, l + 3, concrete);
      this._box(x, c.y + 0.12, c.z, 2.7, 0.24, l + 3, snow);
      for (let z = -l / 2 + 4; z < l / 2; z += 9) {
        this._box(x + side * 3, c.y - 12, c.z + z, 6, 29, 2.5, concrete);
        this._cylinder(x - side * 1.6, c.y + 2.5, c.z + z, 0.12, 5, this._mat('dark'), 0.12, 8);
        this._box(x - side * 1.6, c.y + 4.85, c.z + z, 0.9, 0.16, 0.5, this._mat('emissive', { color: 0xffe0a9, emissive: AMBER, emissiveIntensity: 1.2 }));
      }
    }
    const sx = c.x + (index % 2 ? 1 : -1) * w * 0.26;
    this._cylinder(sx, c.y + 1.3, c.z - 3, 2.3, 2.6, metal, 2.3, 24);
    this._cylinder(sx, c.y + 2.7, c.z - 3, 2.6, 0.35, this._mat('steel'), 2.6, 24);
    this.solids.push({ minX: sx - 2.5, maxX: sx + 2.5, minY: c.y, maxY: c.y + 2.9, minZ: c.z - 5.5, maxZ: c.z - 0.5, active: true });
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      this._box(sx + Math.cos(angle) * 1.45, c.y + 2.91, c.z - 3 + Math.sin(angle) * 1.45, 0.45, 0.08, 0.85, this._mat('dark'), false, [0, -angle, 0]);
    }
    if (index !== 1) this._building(c.x + w / 2 + 11, c.y - 1, c.z - 1, 16, 14, 22, 4);
    this._box(c.x, c.y + 9.6, c.z - l * 0.3, w + 6, 0.8, 1.5, concrete);
    for (const side of [-1, 1]) this._box(c.x + side * (w / 2 + 2), c.y + 4.8, c.z - l * 0.3, 1.1, 9.6, 1.5, concrete);
    // Wind-packed snow remains at edges; the maintained centre is readable.
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? -1 : 1;
      const geometry = new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
      this._addGeometry(geometry, snow, { position: new THREE.Vector3(c.x + side * (w * 0.37), c.y, c.z - l * 0.35 + (i >> 1) * 6), scale: new THREE.Vector3(1.8 + this.random(), 0.2 + this.random() * 0.22, 2.7) });
    }
  }

  _crown(arena, definition, index) {
    const c = arena.center, w = arena.width, l = arena.length;
    const metal = this._mat('dark'), brass = this._mat('brass'), patina = this._mat('patina');
    for (let z = -l / 2 + 2; z < l / 2; z += 10) {
      for (const side of [-1, 1]) {
        const x = c.x + side * (w / 2 + 1);
        this._box(x, c.y + 7, c.z + z, 1.1, 14, 1.2, metal);
        this._box(x, c.y + 14, c.z + z, 2.2, 0.5, 2.3, brass);
        this._beam(new THREE.Vector3(x, c.y + 13, c.z + z), new THREE.Vector3(c.x + side * 4, c.y + 19, c.z + z), 0.25, patina);
        this._box(x - side * 0.57, c.y + 6.5, c.z + z, 0.075, 8, 0.13, this._mat('emissive', { color: 0xe6b171, emissive: AMBER, emissiveIntensity: 1.5 }));
      }
      this._box(c.x, c.y + 19, c.z + z, 8, 0.35, 0.45, brass);
    }
    for (const side of [-1, 1]) {
      this._pipe(new THREE.Vector3(c.x + side * (w / 2 + 3), c.y + 2.7, c.z + l / 2), new THREE.Vector3(c.x + side * (w / 2 + 3), c.y + 2.7, c.z - l / 2), 1.2, patina);
      this._box(c.x + side * (w / 2 + 1), c.y - 11, c.z, 3, 22, l + 2, metal);
    }
    const sx = c.x + (index % 2 ? 1 : -1) * w * 0.25;
    this._cylinder(sx, c.y + 1, c.z - 2, 1.9, 2, metal, 1.9, 20);
    this._cylinder(sx, c.y + 3.8, c.z - 2, 0.65, 5.6, patina, 0.4, 16);
    this.solids.push({ minX: sx - 1.9, maxX: sx + 1.9, minY: c.y, maxY: c.y + 2, minZ: c.z - 3.9, maxZ: c.z - 0.1, active: true });
    for (let j = 0; j < 5; j++) {
      const geometry = new THREE.TorusGeometry(1.2 - j * 0.09, 0.09, 8, 28);
      this._addGeometry(geometry, brass, { position: new THREE.Vector3(sx, c.y + 2.4 + j * 0.65, c.z - 2), rotation: [Math.PI / 2, 0, 0] });
    }
    if (this.sector.index === 24 && index === 2) this._heart(c.x, c.y + 13, c.z - 2);
    else if (this.sector.index === 24 && index === 3) {
      // The final walk points back toward the restored city. The silent receiver
      // is a de-energised piece of the same machine, not another boss promise.
      this._addGeometry(new THREE.TorusGeometry(5.5, 0.2, 10, 64), patina, { position: new THREE.Vector3(c.x, c.y + 6, c.z - 5), rotation: [Math.PI / 2.6, 0, 0] });
      this._bench(c.x - 6, c.y, c.z - 3);
    }
    else {
      const rotor = new THREE.Group(); rotor.position.set(c.x, c.y + 15, c.z - 7);
      for (let j = 0; j < 3; j++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4 + j * 0.32, 0.095, 8, 64), j === 1 ? brass : patina); ring.rotation.set(j * 0.7, j * 0.42, 0.2); rotor.add(ring);
      }
      this._root.add(rotor); this._dynamic.push({ mesh: rotor, kind: 'orbital', speed: 0.1 + index * 0.025 });
    }
  }

  _heart(x, y, z) {
    const group = new THREE.Group(); group.position.set(x, y, z);
    for (let j = 0; j < 5; j++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5 + j * 0.65, 0.15, 10, 64), this._mat(j % 2 ? 'brass' : 'patina')); ring.rotation.set(j * 0.62, j * 0.73, 0); group.add(ring);
    }
    group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 2), this._mat('emissive', { color: 0xf6d89a, emissive: 0xffac58, emissiveIntensity: 3.5 })));
    this._root.add(group); this._dynamic.push({ mesh: group, kind: 'orbital', speed: 0.16 });
  }

  _container(x, y, z, width, height, depth, variation) {
    const paint = this._mat('paint', { color: [0x809b97, 0xb0a28b, 0x647b8a][variation % 3] || 0x849898 });
    this._box(x, y + height / 2, z, width, height, depth, paint, true);
    const trim = this._mat('rust');
    for (const dx of [-width / 2, width / 2]) for (const dz of [-depth / 2, depth / 2]) this._box(x + dx, y + height / 2, z + dz, 0.12, height + 0.1, 0.12, trim);
    for (let dx = -width / 2 + 0.35; dx < width / 2; dx += 0.45) this._box(x + dx, y + height / 2, z + depth / 2 + 0.035, 0.05, height - 0.15, 0.08, trim);
    for (const dy of [0.08, height - 0.08]) this._box(x, y + dy, z + depth / 2 + 0.06, width, 0.1, 0.1, trim);
  }

  _crate(x, y, z, size) {
    if (this.props?.has('crate')) {
      const dimensions = this.props.bounds('crate'), scale = size / Math.max(dimensions.width, dimensions.height, dimensions.depth);
      this._prop('crate', x, y, z, 0, scale, true, this.breakables.length < 9);
      return;
    }
    if (this.breakables.length < 9) {
      const group = new THREE.Group(); group.position.set(x, y + size / 2, z);
      group.add(new THREE.Mesh(new THREE.BoxGeometry(size, size, size), this._mat('wood')));
      for (const offset of [-size * 0.35, size * 0.35]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.1, size + 0.035, size + 0.04), this._mat('steel')); strap.position.x = offset; group.add(strap);
      }
      group.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      this._root.add(group);
      const solid = { minX: x - size / 2, maxX: x + size / 2, minY: y, maxY: y + size, minZ: z - size / 2, maxZ: z + size / 2, active: true };
      this.solids.push(solid); this.breakables.push({ mesh: group, solid, health: 22, kind: 'wood', color: 0xc69c6a });
      return;
    }
    this._box(x, y + size / 2, z, size, size, size, this._mat('wood'), true);
    for (const offset of [-size * 0.35, size * 0.35]) {
      this._box(x + offset, y + size / 2, z, 0.1, size + 0.03, size + 0.04, this._mat('steel'));
    }
  }

  hitSegment(from, to, damage = 30) {
    const hits = [];
    for (const item of this.breakables) {
      if (!item.solid.active || !segmentBox(from, to, item.solid)) continue;
      item.health -= damage;
      if (item.health <= 0) {
        item.solid.active = false; item.mesh.visible = false;
        hits.push({ point: item.mesh.position.clone(), position: item.mesh.position.clone(), color: item.color, kind: item.kind });
      }
    }
    return hits;
  }

  _bench(x, y, z, angle = 0) {
    const wood = this._mat('wood'), metal = this._mat('brass');
    this._box(x, y + 0.55, z, 3.2, 0.15, 0.8, wood, true, [0, angle, 0]);
    this._box(x, y + 1.03, z - 0.33, 3.2, 0.72, 0.1, wood, false, [0, angle, 0]);
    for (const side of [-1, 1]) this._box(x + Math.cos(angle) * side * 1.15, y + 0.26, z + Math.sin(angle) * side * 1.15, 0.12, 0.52, 0.6, metal);
  }

  _puddle(x, y, z, width, depth) {
    const geometry = new THREE.CircleGeometry(1, 26);
    const position = geometry.attributes.position;
    for (let i = 1; i < position.count; i++) {
      const factor = 0.88 + this.random() * 0.12; position.setX(i, position.getX(i) * factor); position.setY(i, position.getY(i) * factor);
    }
    const material = this._mat('water', { color: 0x324d59, roughness: 0.14, metalness: 0.12, transparent: true, opacity: 0.27 });
    material.normalMap = this._waterNormal; material.normalScale.set(0.035, 0.035);
    this._addGeometry(geometry, material, { position: new THREE.Vector3(x, y, z), rotation: [-Math.PI / 2, 0, this.random() * 3], scale: new THREE.Vector3(width / 2, depth / 2, 1), cast: false });
  }

  _planter(x, y, z, width, depth, foliage) {
    this._box(x, y + 0.42, z, width, 0.84, depth, this._mat('stone'), true);
    this._box(x, y + 0.87, z, width - 0.35, 0.045, depth - 0.35, this._mat('soil'));
    if (foliage) for (let i = 0; i < Math.round(depth / 1.5); i++) this._fern(x + (this.random() - 0.5) * width * 0.7, y + 0.9, z - depth * 0.36 + i * 1.4, 0.9 + this.random() * 0.7);
  }

  _fern(x, y, z, size) {
    const leaf = this._mat('leaf', { side: THREE.DoubleSide, color: 0x4f8d50 });
    const stem = this._mat('moss', { color: 0x617b3d });
    for (let j = 0; j < 8; j++) {
      const a = j * 2.399, length = size * (0.7 + this.random() * 0.4);
      const tip = new THREE.Vector3(x + Math.cos(a) * length * 0.66, y + size * 0.45, z + Math.sin(a) * length * 0.66);
      this._pipe(new THREE.Vector3(x, y + 0.05, z), tip, 0.012 * size, stem, 4);
      for (let k = 1; k <= 5; k++) for (const side of [-1, 1]) {
        const t = k / 5, spread = Math.sin(t * 2.5) * size * 0.15;
        const px = x + Math.cos(a) * length * t * 0.68 + Math.cos(a + Math.PI / 2) * side * spread;
        const pz = z + Math.sin(a) * length * t * 0.68 + Math.sin(a + Math.PI / 2) * side * spread;
        const py = y + Math.sin(t * 2.2) * size * 0.52;
        this._addGeometry(new THREE.PlaneGeometry(size * 0.22, size * 0.31), leaf, { position: new THREE.Vector3(px, py, pz), rotation: [-0.75, a + side * 0.75, side * 0.23] });
      }
    }
  }

  _tree(x, y, z, height) {
    const bark = this._mat('bark', { color: 0x8c9086 });
    const leaves = [this._mat('leaf', { side: THREE.DoubleSide, color: 0x4a8046 }), this._mat('leaf', { side: THREE.DoubleSide, color: 0x6d9447 }), this._mat('leaf', { side: THREE.DoubleSide, color: 0x52794b })];
    this._cylinder(x, y + height * 0.36, z, height * 0.038, height * 0.72, bark, height * 0.012, 11);
    for (let j = 0; j < 9; j++) {
      const a = j * 2.399, reach = height * (0.16 + this.random() * 0.16);
      const end = new THREE.Vector3(x + Math.cos(a) * reach, y + height * (0.64 + this.random() * 0.23), z + Math.sin(a) * reach);
      this._pipe(new THREE.Vector3(x, y + height * (0.35 + j * 0.033), z), end, height * 0.009, bark, 7);
      const canopy = new THREE.IcosahedronGeometry(height * 0.061, 2), vertices = canopy.attributes.position;
      for (let v = 0; v < vertices.count; v++) { const f = 0.96 + Math.sin(vertices.getX(v) * 7.1 + vertices.getY(v) * 4.3 + vertices.getZ(v) * 5.2) * 0.09; vertices.setXYZ(v, vertices.getX(v) * f, vertices.getY(v) * f, vertices.getZ(v) * f); }
      canopy.scale(1.25, 0.68, 1);
      this._addGeometry(canopy, this._mat('moss', { color: 0x87a864 }), { position: end });
      for (let k = 0; k < 48; k++) {
        const radius = height * 0.14 * Math.cbrt(this.random()), azimuth = this.random() * Math.PI * 2, elevation = Math.acos(this.random() * 2 - 1);
        const offset = new THREE.Vector3(Math.cos(azimuth) * Math.sin(elevation) * radius, Math.cos(elevation) * radius * 0.65, Math.sin(azimuth) * Math.sin(elevation) * radius);
        const size = height * (0.035 + this.random() * 0.018);
        this._addGeometry(new THREE.PlaneGeometry(size, size * 1.25), leaves[k % 3], { position: end.clone().add(offset), rotation: [(this.random() - 0.5) * 2.2, this.random() * Math.PI * 2, (this.random() - 0.5) * 2.5] });
      }
    }
  }

  update(dt, time, playerPosition) {
    this._clock = time;
    if (playerPosition && this.sun) {
      // Spend shadow resolution on the space being played. Snapping in the
      // light's basis keeps contact shadows steady while the player moves.
      const focus = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z - 16);
      const direction = this._sunOffset.clone().normalize();
      const right = new THREE.Vector3().crossVectors(direction, UP).normalize();
      const up = new THREE.Vector3().crossVectors(right, direction).normalize();
      const tx = 74 / 2048, ty = 106 / 2048, sx = focus.dot(right), sy = focus.dot(up);
      focus.addScaledVector(right, Math.round(sx / tx) * tx - sx).addScaledVector(up, Math.round(sy / ty) * ty - sy);
      this.sun.target.position.copy(focus); this.sun.position.copy(focus).add(this._sunOffset);
    }
    for (const gate of this._gates) {
      const target = gate.floor + (gate.open ? 4.5 : 0);
      gate.mesh.position.y = THREE.MathUtils.damp(gate.mesh.position.y, target, 8, dt);
    }
    for (const pickup of this.pickups) {
      if (pickup.claimed) { pickup.mesh.visible = false; continue; }
      pickup.mesh.rotation.y += dt * (pickup.type === 'secret' ? 0.8 : 0.45);
      pickup.mesh.position.y = pickup.baseY + Math.sin(time * 2.3 + pickup.position.z) * 0.09;
    }
    for (const item of this._dynamic) {
      if (item.kind === 'orbital') { item.mesh.rotation.y += dt * item.speed; item.mesh.rotation.z = Math.sin(time * 0.17) * 0.06; }
    }
    if (this._skyMaterial) this._skyMaterial.uniforms.time.value = time;
    if (this._weatherMaterial) { this._weatherMaterial.uniforms.time.value = time; if (playerPosition) this._weatherMaterial.uniforms.center.value.set(playerPosition.x, playerPosition.y + 3, playerPosition.z - 15); }
    if (this._waterMaterial?.normalMap) { this._waterMaterial.normalMap.offset.x = time * 0.007; this._waterMaterial.normalMap.offset.y = time * 0.004; }
  }

  _clearSector() {
    if (this._root) {
      const geometries = new Set(); this._root.traverse(o => { if (o.geometry && !o.userData.breakwaterShared && !o.geometry.userData.breakwaterShared) geometries.add(o.geometry); });
      for (const geometry of geometries) geometry.dispose();
      this.scene.remove(this._root); this._root = null;
    }
    for (const light of this._lights) { if (light.shadow?.map) light.shadow.map.dispose(); this.scene.remove(light); }
    this._lights = [];
    for (const m of this._ownedMaterials) m.dispose(); for (const t of this._ownedTextures) t.dispose();
    this._ownedMaterials = []; this._ownedTextures = []; this._dynamic = []; this._gates = [];
    this.arenas = []; this.pickups = []; this.solids = []; this.floors = []; this.hazards = []; this.interactables = []; this.breakables = []; this._batches.clear();
    this._skyMaterial = null; this._skyMesh = null; this._waterMaterial = null; this._weatherMaterial = null;
  }

  dispose() {
    this._clearSector();
    for (const environment of this._environments.values()) environment.dispose(); this._environments.clear();
    this._photoEnvironment?.dispose(); this._photoSky?.dispose();
    this._waterNormal?.dispose();
    this.scene.environment = null;
    this._materialCache.clear();
  }
}
