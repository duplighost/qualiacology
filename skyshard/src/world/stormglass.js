// STORMGLASS R3 — presentation-only mineral scatter.
//
// The render meshes follow the existing analytic terrain but never register
// colliders, rewards, damage, or traversal state. A pair of instanced meshes
// gives every region a different mineral accent while keeping the open world
// to two additional draw calls.

import * as THREE from 'three';
import { makeRng } from '../core/rng.js';
import { clamp01 } from '../core/math.js';
import { DESTS } from './destdata.js';
import { regionWeights } from './regions.js';
import { terrainHeight, terrainNormal } from './terrain.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _yaw = new THREE.Quaternion();
const _lean = new THREE.Quaternion();
const _c = new THREE.Color();

function mergeGeometry(parts) {
  const geos = parts.map(({ geo, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    g.applyMatrix4(matrix);
    return g;
  });
  let vertices = 0;
  for (const g of geos) vertices += g.attributes.position.count;
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  let offset = 0;
  for (const g of geos) {
    positions.set(g.attributes.position.array, offset * 3);
    normals.set(g.attributes.normal.array, offset * 3);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const colors = new Float32Array(vertices * 3);
  colors.fill(1);
  out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  out.computeBoundingSphere();
  return out;
}

function stormglassClusterGeometry() {
  const crystal = (x, z, h, r, rx, rz, spin) => [
    {
      geo: new THREE.CylinderGeometry(r * .72, r, h * .67, 6, 1, false),
      position: [x, h * .335, z], rotation: [rx, spin, rz],
    },
    {
      geo: new THREE.ConeGeometry(r * .72, h * .33, 6, 1, false),
      position: [x, h * .835, z], rotation: [rx, spin, rz],
    },
  ];
  return mergeGeometry([
    { geo: new THREE.DodecahedronGeometry(.52, 0), position: [0, .08, 0], scale: [1.22, .22, .92], rotation: [0, .28, 0] },
    ...crystal(0, 0, 1.16, .42, .025, -.045, .18),
    ...crystal(-.39, .10, .76, .28, -.04, .18, -.30),
    ...crystal(.34, -.22, .60, .23, .12, -.22, .56),
  ]);
}

function nearAuthoredSite(x, z, pad = 5) {
  for (const d of DESTS) {
    if (Math.hypot(x - d.x, z - d.z) < d.r + pad) return true;
  }
  return false;
}

function mineralColor(x, z, brightness = 1) {
  const w = regionWeights(x, z);
  // Vale remains storm-blue near the opening; the other hues preserve the
  // five biome identities instead of tinting the entire island cyan.
  const r = .15 * w.vale + .96 * w.ember + .45 * w.frost + .12 * w.mycel + .62 * w.shatter;
  const g = .48 * w.vale + .25 * w.ember + .82 * w.frost + .78 * w.mycel + .38 * w.shatter;
  const b = .98 * w.vale + .08 * w.ember + 1.0 * w.frost + .72 * w.mycel + 1.0 * w.shatter;
  // A cool base lift keeps the minerals legible against every night-biome;
  // hue still comes from the same regional blend, but no shard collapses into
  // a black prop when its world-facing facets turn away from the key light.
  return _c.setRGB(
    clamp01(.12 + r * brightness * .74),
    clamp01(.13 + g * brightness * .74),
    clamp01(.16 + b * brightness * .74),
  );
}

function samplePoint(rng, hubChance = .38) {
  // A deliberate mineral collar around the Spire gives the first vista the
  // chosen Stormglass silhouette. The wider polar sample carries it through
  // the rest of the island without repeating a handcrafted cluster.
  if (rng() < hubChance) {
    const a = rng() * TAU;
    const r = 28 + Math.pow(rng(), .72) * 105;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  const a = rng() * TAU;
  const r = 120 + Math.sqrt(rng()) * 500;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

export class Stormglass {
  constructor(scene, { low = false } = {}) {
    this.scene = scene;
    this.low = low;
    this._buildShards(low ? 120 : 360);
    this._buildChips(low ? 200 : 520);
  }

  _buildShards(target) {
    const geo = stormglassClusterGeometry();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf4fbff,
      vertexColors: true,
      fog: true,
      toneMapped: true,
    });
    this.shards = new THREE.InstancedMesh(geo, mat, target);
    this.shards.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.shards.castShadow = false;
    this.shards.receiveShadow = false;
    this.shards.frustumCulled = false;

    const rng = makeRng(83197);
    let placed = 0;
    for (let guard = 0; placed < target && guard < target * 70; guard++) {
      const [x, z] = samplePoint(rng, .23);
      if (Math.hypot(x, z) > 620 || Math.hypot(x, z) < 19) continue;
      if (nearAuthoredSite(x, z, 7)) continue;
      const y = terrainHeight(x, z);
      if (y < 1.25) continue;
      terrainNormal(x, z, _n);
      if (_n.y < .58) continue;

      const w = regionWeights(x, z);
      const ridge = clamp01((.986 - _n.y) * 7.5);
      const mineralBias = .08 + ridge * .62 + w.shatter * .24 + w.frost * .08;
      if (rng() > mineralBias) continue;

      const tall = .42 + rng() * (.56 + ridge * .72);
      const width = .34 + rng() * (.24 + ridge * .16);
      _q.setFromUnitVectors(UP, _n);
      _yaw.setFromAxisAngle(UP, rng() * TAU);
      _lean.setFromEuler(new THREE.Euler((rng() - .5) * .34, 0, (rng() - .5) * .44));
      _q.multiply(_yaw).multiply(_lean);
      _m.compose(_p.set(x, y - .05, z), _q, _s.set(width, tall, width * (.62 + rng() * .72)));
      this.shards.setMatrixAt(placed, _m);
      this.shards.setColorAt(placed, mineralColor(x, z, .84 + rng() * .34));
      placed++;
    }
    this.shards.count = placed;
    this.shards.instanceMatrix.needsUpdate = true;
    if (this.shards.instanceColor) this.shards.instanceColor.needsUpdate = true;
    this.scene.add(this.shards);
  }

  _buildChips(target) {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    colors.fill(1);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf1f7ff,
      vertexColors: true,
      fog: true,
      toneMapped: true,
    });
    this.chips = new THREE.InstancedMesh(geo, mat, target);
    this.chips.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.chips.castShadow = false;
    this.chips.receiveShadow = false;
    this.chips.frustumCulled = false;

    const rng = makeRng(34211);
    let placed = 0;
    for (let guard = 0; placed < target && guard < target * 45; guard++) {
      const [x, z] = samplePoint(rng, .22);
      if (Math.hypot(x, z) > 620 || Math.hypot(x, z) < 7) continue;
      if (nearAuthoredSite(x, z, 4)) continue;
      const y = terrainHeight(x, z);
      if (y < 1.1) continue;
      terrainNormal(x, z, _n);
      if (_n.y < .66 || rng() > .42 + (1 - _n.y) * 2.4) continue;

      _q.setFromEuler(new THREE.Euler(rng() * TAU, rng() * TAU, rng() * TAU));
      const sc = .055 + rng() * .14;
      _m.compose(_p.set(x, y + sc * .08, z), _q, _s.set(sc * (1 + rng() * 1.45), sc * (.28 + rng() * .54), sc));
      this.chips.setMatrixAt(placed, _m);
      this.chips.setColorAt(placed, mineralColor(x, z, .72 + rng() * .38));
      placed++;
    }
    this.chips.count = placed;
    this.chips.instanceMatrix.needsUpdate = true;
    if (this.chips.instanceColor) this.chips.instanceColor.needsUpdate = true;
    this.scene.add(this.chips);
  }

  update(_dt, _t) {}
}
