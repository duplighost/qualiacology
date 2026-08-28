// R5 authored landscape layer. Forty-five sites are assembled from a small
// number of instanced, physically lit component families. The sites share a
// composition grammar (approach -> threshold -> focal mass -> reward core),
// but each biome and variant has its own silhouette. Components are grounded
// independently against the analytic terrain, so a grove follows a hillside
// instead of hovering as one prefab slab.

import * as THREE from 'three';
import { makeRng } from '../core/rng.js';
import { terrainHeight } from './terrain.js';
import { REGIONS } from './regions.js';
import { REGION_SPAWNS } from '../combat/enemytypes.js';
import { R6_THRESHOLDS, WONDERS } from './wonderdata.js';
import { G } from '../state.js';
import { sfx } from '../core/audio.js';
import { juice } from '../fx/juice.js';
import { save } from '../core/save.js';
import { worldFoliage, worldSurface } from './materials.js';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _color = new THREE.Color();

function baseGeo(geo, lift = 0) {
  if (lift) geo.translate(0, lift, 0);
  geo.computeVertexNormals();
  return geo;
}

function cylinder(radTop = .72, radBottom = 1, sides = 12) {
  return baseGeo(new THREE.CylinderGeometry(radTop, radBottom, 1, sides, 3), .5);
}

function fungalStem() {
  const g = new THREE.CylinderGeometry(.56, .88, 1, 18, 9, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = y + .5;
    const a = Math.atan2(z, x);
    const profile = 1 + .17 * (1 - t) * (1 - t) - .075 * Math.sin(Math.PI * t) + .045 * t;
    const rib = 1 + Math.sin(a * 5.0 + t * 3.4) * .055 + Math.sin(a * 11.0 - t * 5.2) * .018;
    const bendX = Math.sin(t * 2.2) * t * .055;
    const bendZ = Math.sin(t * 3.1 + .7) * t * .035;
    p.setXYZ(i, x * profile * rib + bendX, y, z * profile * rib + bendZ);
  }
  return baseGeo(g, .5);
}

function cone(radius = 1, sides = 9) {
  const g = new THREE.ConeGeometry(radius, 1, sides, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), t = y + .5;
    const warp = 1 + Math.sin(a * 3.0 + t * 4.1) * .075 + Math.sin(a * 7.0 - t * 2.8) * .035;
    p.setXYZ(i, x * warp, y, z * (warp + Math.sin(a * 2.0) * .025));
  }
  return baseGeo(g, .5);
}

function boulder(detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, Math.max(1, detail));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const radial = 1 + Math.sin(a * 3.0 + y * 2.2) * .13 + Math.sin(a * 7.0 - y * 3.1) * .055;
    p.setXYZ(i, x * radial * 1.08, y * (.66 + Math.sin(a * 2.0) * .035), z * radial * .92);
  }
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.min.y, 0);
  return g;
}

function canopy() {
  const g = new THREE.SphereGeometry(1, 15, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const warp = 1 + Math.sin(a * 3.0 + y * 2.1) * .14 + Math.sin(a * 7.0 - y * 3.4) * .055;
    const crown = .92 + (y + 1) * .045;
    p.setXYZ(i, x * warp * crown, y * (.88 + (warp - 1) * .28), z * warp * (1.02 + Math.sin(a * 2.0) * .045));
  }
  g.computeVertexNormals();
  return baseGeo(g, 1);
}

function foliageCluster() {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], normal = [];
  for (let plane = 0; plane < 3; plane++) {
    const a = plane * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
    const corners = [[-1,0,0],[1,0,0],[1,2,0],[-1,2,0]];
    const verts = [0,1,2,0,2,3];
    const uvs = [[0,0],[1,0],[1,1],[0,1]];
    for (const vi of verts) {
      const [x,y,z] = corners[vi];
      pos.push(x * c + z * s, y, -x * s + z * c);
      uv.push(...uvs[vi]);
      normal.push(s, 0, c);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function foliageMaterial() {
  const texture = worldFoliage('broadleaf');
  return new THREE.MeshBasicMaterial({
    map: texture, alphaTest: .32, transparent: false,
    side: THREE.DoubleSide, fog: true, toneMapped: true,
  });
}

function mushroomCrown() {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], normal = [];
  for (let plane = 0; plane < 3; plane++) {
    const a = plane * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
    const corners = [[-1,0,0],[1,0,0],[1,1.15,0],[-1,1.15,0]];
    const verts = [0,1,2,0,2,3];
    const uvs = [[0,0],[1,0],[1,1],[0,1]];
    for (const vi of verts) {
      const [x,y,z] = corners[vi];
      pos.push(x * c + z * s, y, -x * s + z * c);
      uv.push(...uvs[vi]);
      normal.push(s, 0, c);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function mushroomMaterial() {
  const texture = worldFoliage('mushroom');
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color().setRGB(1.16, 1.10, 1.06),
    map: texture, alphaTest: .30, transparent: false,
    side: THREE.DoubleSide, fog: true, toneMapped: false,
  });
}

function organicPod() {
  const g = new THREE.SphereGeometry(1, 15, 11);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const warp = 1 + Math.sin(a * 4 + y * 3.1) * .12 + Math.sin(a * 9 - y * 2.3) * .035;
    p.setXYZ(i, x * warp, y * .72, z * warp * .92);
  }
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.min.y, 0);
  return g;
}

function halfArch(tube = .1) {
  const g = new THREE.TorusGeometry(1, tube, 12, 42, Math.PI);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(y, x);
    const ring = Math.max(.001, Math.hypot(x, y));
    const cx = x / ring, cy = y / ring;
    const radialOffset = ring - 1;
    const thickness = .72 + .34 * (.5 + .5 * Math.sin(a * 3.2 + .8))
      + .13 * Math.sin(a * 7.3 - .4);
    const centerWarp = Math.sin(a * 3.7 + z * 13.0) * tube * .48
      + Math.sin(a * 8.1 - z * 7.0) * tube * .22;
    const centerR = 1 + centerWarp;
    p.setXYZ(i,
      cx * (centerR + radialOffset * thickness),
      cy * (centerR + radialOffset * thickness),
      z * thickness + Math.sin(a * 5.3) * tube * .28,
    );
  }
  g.computeVertexNormals();
  return baseGeo(g);
}

function mycelArch(tube = .13) {
  // A root bridge should not read as a plumbing elbow.  The centreline leans,
  // swells and doubles back like a fruiting rhizome, while the textured tube
  // keeps enough sections for the generated mycelium scan to catch grazing
  // light without becoming an expensive hero mesh.
  const points = [
    [-1.02, 0, .03], [-.91, .34, -.06], [-.70, .72, .08],
    [-.41, 1.02, -.10], [-.09, 1.18, .07], [.24, 1.12, -.05],
    [.53, .91, .10], [.79, .55, -.08], [1.01, 0, .02],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .5);
  const tubular = 48, radial = 12;
  const g = new THREE.TubeGeometry(curve, tubular, tube, radial, false);
  const p = g.attributes.position;
  const center = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, center);
    const taper = .72 + Math.sin(t * Math.PI) * .31;
    const swell = taper * (.91 + Math.sin(t * 21.0 + .7) * .12 + Math.sin(t * 47.0) * .045);
    for (let j = 0; j <= radial; j++) {
      const index = i * (radial + 1) + j;
      const x = p.getX(index), y = p.getY(index), z = p.getZ(index);
      const vein = 1 + Math.sin(j * 2.1 + i * .43) * .035;
      p.setXYZ(index,
        center.x + (x - center.x) * swell * vein,
        center.y + (y - center.y) * swell,
        center.z + (z - center.z) * swell * (1 + Math.sin(i * .61) * .05),
      );
    }
  }
  g.computeVertexNormals();
  return baseGeo(g);
}

function fullRing(tube = .08) {
  return baseGeo(new THREE.TorusGeometry(1, tube, 9, 36));
}

function slab() {
  return baseGeo(new THREE.BoxGeometry(1, 1, 1), .5);
}

let surfaceTex = null;
function surfaceTexture() {
  if (surfaceTex) return surfaceTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  const rng = makeRng(55190);
  for (let i = 0; i < 5200; i++) {
    const v = 78 + (rng() * 104 | 0);
    const a = .025 + rng() * .075;
    g.fillStyle = `rgba(${v},${v},${v},${a})`;
    const x = rng() * 256, y = rng() * 256, r = .4 + rng() * 2.8;
    g.fillRect(x, y, r, r * (.25 + rng() * .8));
  }
  g.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(30,30,30,${.035 + rng() * .06})`;
    g.lineWidth = .35 + rng() * .8;
    let x = rng() * 256, y = rng() * 256;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      x += (rng() - .5) * 26; y += (rng() - .5) * 18; g.lineTo(x, y);
    }
    g.stroke();
  }
  surfaceTex = new THREE.CanvasTexture(c);
  surfaceTex.wrapS = surfaceTex.wrapT = THREE.RepeatWrapping;
  surfaceTex.repeat.set(3.4, 3.4);
  surfaceTex.colorSpace = THREE.NoColorSpace;
  surfaceTex.anisotropy = 8;
  return surfaceTex;
}

function material(opts) {
  const common = {
    color: opts.color,
    roughness: opts.roughness ?? .78,
    metalness: opts.metalness ?? .02,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    flatShading: opts.flatShading ?? false,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite ?? true,
  };
  const mat = opts.physical
    ? new THREE.MeshPhysicalMaterial({
        ...common,
        clearcoat: opts.clearcoat ?? .38,
        clearcoatRoughness: opts.clearcoatRoughness ?? .3,
      })
    : new THREE.MeshStandardMaterial(common);
  if (opts.surface !== false) {
    const authored = typeof opts.surface === 'string' ? worldSurface(opts.surface) : null;
    if (authored) {
      mat.map = authored.map;
      mat.bumpMap = authored.bump;
    } else {
      mat.bumpMap = surfaceTexture();
    }
    mat.bumpScale = opts.bumpScale ?? .07;
  }
  mat.dithering = true;
  return mat;
}

const BATCH = {
  vale: {
    mass:   { geo: () => cylinder(.66, 1, 14), mat: () => material({ color: 0xd3c2a3, emissive: 0x17130c, emissiveIntensity: .16, roughness: .94, bumpScale: .16, surface: 'forest' }), collider: .72, colliderH: 1 },
    organic:{ geo: foliageCluster, mat: foliageMaterial, collider: 0 },
    accent: { geo: () => halfArch(.105), mat: () => material({ color: 0xc1c3ad, roughness: .95, bumpScale: .14, surface: 'stone' }), collider: .10, colliderH: 1 },
    detail: { geo: () => boulder(1), mat: () => material({ color: 0xb7bca9, roughness: .97, bumpScale: .16, surface: 'stone' }), collider: .45, colliderH: 2 },
    core:   { geo: () => baseGeo(new THREE.OctahedronGeometry(.74, 1), 2.35), mat: () => material({ color: 0xa7ff93, emissive: 0x5bd85f, emissiveIntensity: 1.7, roughness: .18, surface: false, physical: true, clearcoat: .7 }), collider: 0 },
  },
  ember: {
    mass:   { geo: () => cone(1, 11), mat: () => material({ color: 0xc2b3b8, roughness: .42, metalness: .18, bumpScale: .13, physical: true, clearcoat: .4, surface: 'obsidian' }), collider: .50, colliderH: 1 },
    organic:{ geo: () => halfArch(.075), mat: () => material({ color: 0xd9c9a9, roughness: .91, bumpScale: .10, surface: 'stone' }), collider: .08, colliderH: 1 },
    accent: { geo: () => baseGeo(new THREE.OctahedronGeometry(1, 1), 1), mat: () => material({ color: 0xffaa70, emissive: 0x8a2708, emissiveIntensity: .78, roughness: .20, metalness: .06, opacity: .92, transparent: true, depthWrite: true, surface: false, physical: true, clearcoat: .72 }), collider: .42, colliderH: 2 },
    detail: { geo: () => boulder(1), mat: () => material({ color: 0xc0a9a0, roughness: .78, bumpScale: .15, surface: 'obsidian' }), collider: .44, colliderH: 2 },
    core:   { geo: () => baseGeo(new THREE.OctahedronGeometry(.78, 1), 2.45), mat: () => material({ color: 0xffbc55, emissive: 0xff4d08, emissiveIntensity: 2.0, roughness: .12, surface: false, physical: true, clearcoat: .8 }), collider: 0 },
  },
  frost: {
    mass:   { geo: () => cone(1, 12), mat: () => material({ color: 0xe9f7ff, emissive: 0x173b5d, emissiveIntensity: .16, roughness: .18, metalness: .05, opacity: .91, transparent: true, depthWrite: true, physical: true, clearcoat: .88, clearcoatRoughness: .11, surface: 'ice', bumpScale: .07 }), collider: .48, colliderH: 1 },
    organic:{ geo: canopy, mat: () => material({ color: 0xf3f7f8, roughness: .92, bumpScale: .07, surface: 'ice' }), collider: .40, colliderH: 2 },
    accent: { geo: () => halfArch(.085), mat: () => material({ color: 0xedfbff, emissive: 0x2d7fa0, emissiveIntensity: .24, roughness: .14, physical: true, clearcoat: .9, surface: 'ice', bumpScale: .05 }), collider: .08, colliderH: 1 },
    detail: { geo: () => boulder(1), mat: () => material({ color: 0xe1f1f7, emissive: 0x163148, emissiveIntensity: .20, roughness: .46, bumpScale: .08, surface: 'ice', physical: true, clearcoat: .34 }), collider: .4, colliderH: 2 },
    core:   { geo: () => baseGeo(new THREE.OctahedronGeometry(.76, 1), 2.4), mat: () => material({ color: 0xc8f5ff, emissive: 0x4cb8ef, emissiveIntensity: 1.8, roughness: .08, surface: false, physical: true, clearcoat: .95 }), collider: 0 },
  },
  mycel: {
    mass:   { geo: fungalStem, mat: () => material({ color: 0xcbb6a5, emissive: 0x35252f, emissiveIntensity: .18, roughness: .94, bumpScale: .19, surface: 'mycel' }), collider: .52, colliderH: 1 },
    organic:{ geo: mushroomCrown, mat: mushroomMaterial, collider: 0 },
    accent: { geo: () => mycelArch(.145), mat: () => material({ color: 0x65412d, emissive: 0x160a05, emissiveIntensity: .08, roughness: 1, bumpScale: .30, surface: 'mycel' }), collider: .12, colliderH: 1 },
    detail: { geo: () => boulder(2), mat: () => material({ color: 0xe1d4c8, emissive: 0x503a43, emissiveIntensity: .32, roughness: .72, physical: true, clearcoat: .16, surface: 'mycel', bumpScale: .11 }), collider: 0 },
    core:   { geo: () => baseGeo(new THREE.OctahedronGeometry(.74, 1), 2.35), mat: () => material({ color: 0x9fffe2, emissive: 0x3de0b2, emissiveIntensity: 1.9, roughness: .12, surface: false, physical: true, clearcoat: .76 }), collider: 0 },
  },
  shatter: {
    mass:   { geo: slab, mat: () => material({ color: 0x9885ac, roughness: .62, metalness: .08, bumpScale: .12, physical: true, clearcoat: .22, surface: 'stone' }), collider: .52, colliderH: 1 },
    organic:{ geo: () => boulder(1), mat: () => material({ color: 0x897795, roughness: .74, bumpScale: .14, surface: 'stone' }), collider: .42, colliderH: 2 },
    accent: { geo: () => fullRing(.065), mat: () => material({ color: 0xc09cff, emissive: 0x6b36b4, emissiveIntensity: 1.0, roughness: .2, surface: false, physical: true, clearcoat: .7 }), collider: 0 },
    detail: { geo: () => cylinder(.8, 1, 10), mat: () => material({ color: 0xa89ab7, roughness: .74, bumpScale: .11, surface: 'stone' }), collider: .40, colliderH: 1 },
    core:   { geo: () => baseGeo(new THREE.OctahedronGeometry(.78, 1), 2.45), mat: () => material({ color: 0xd6b5ff, emissive: 0x7d46d8, emissiveIntensity: 2.0, roughness: .1, surface: false, physical: true, clearcoat: .84 }), collider: 0 },
  },
};

function seededSite(site) {
  let n = 0;
  for (let i = 0; i < site.id.length; i++) n = (n * 31 + site.id.charCodeAt(i)) >>> 0;
  return makeRng(n || 1);
}

export class LivingWorld {
  constructor(scene, collide) {
    this.scene = scene;
    this.collide = collide;
    this.batches = new Map();
    this.coreMeshes = [];
    this.sites = [...WONDERS, ...R6_THRESHOLDS].map((def, index) => ({
      ...def, index,
      y: terrainHeight(def.x, def.z),
      state: G.save.found['wonder-' + def.id] ? 'cleared' : 'dormant',
      tag: 'wonder-' + def.id,
      settleT: 0,
      coreMesh: null,
      coreIndex: -1,
      coreBase: terrainHeight(def.x, def.z),
    }));
    this._compose();
    this._buildMeshes();
  }

  _queue(region, kind, site, lx, lz, sx, sy, sz, yaw = 0, pitch = 0, roll = 0, lift = 0, solid = false) {
    const cr = Math.cos(site.rotation), sr = Math.sin(site.rotation);
    const x = site.x + lx * cr + lz * sr;
    const z = site.z - lx * sr + lz * cr;
    const y = terrainHeight(x, z) + lift;
    const key = region + ':' + kind;
    let items = this.batches.get(key);
    if (!items) { items = []; this.batches.set(key, items); }
    items.push({ x, y, z, sx, sy, sz, yaw: site.rotation + yaw, pitch, roll, site });
    const def = BATCH[region][kind];
    if (solid && def.collider) {
      const r = def.collider * Math.max(sx, sz);
      this.collide.addCircle(x, z, r, y - .7, y + Math.max(1.4, sy * def.colliderH));
    }
  }

  _approach(site, rng) {
    const add = (...args) => this._queue(site.region, ...args);
    // The inward-facing lane stays open. Paired markers tighten toward the
    // focal point, while one broken side creates an authored, non-symmetrical
    // silhouette instead of a decorative ring stamped into the field.
    for (let i = 0; i < 4; i++) {
      const z = 8 + i * 5.2;
      const width = 5.4 - i * .42;
      const sc = (.42 + i * .08) * site.scale;
      add('detail', site, -width + (rng() - .5) * .5, z, sc, sc * (.7 + rng() * .5), sc, -.2 + rng() * .4, 0, (rng() - .5) * .16, 0, false);
      if (!(site.variant === 2 && i === 1)) {
        add('detail', site, width + (rng() - .5) * .5, z + (rng() - .5), sc * .9, sc * (.7 + rng() * .5), sc, -.2 + rng() * .4, 0, (rng() - .5) * .16, 0, false);
      }
    }
  }

  _commonClusters(site, rng, kinds) {
    const add = (...args) => this._queue(site.region, ...args);
    const golden = 2.399963229728653;
    for (let c = 0; c < 3; c++) {
      const ca = c * golden + site.variant * .7 + (rng() - .5) * .5;
      const cd = 10 + c * 3.1 + rng() * 4;
      const cx = Math.cos(ca) * cd, cz = Math.sin(ca) * cd - 1;
      const n = 4 + ((rng() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * (3.2 + c);
        const sc = (.28 + rng() * .48) * site.scale;
        const kind = kinds[(c + i) % kinds.length];
        add(kind, site, cx + Math.cos(a) * r, cz + Math.sin(a) * r,
          sc * (.72 + rng() * .55), sc * (.65 + rng() * .9), sc * (.72 + rng() * .55),
          rng() * Math.PI, (rng() - .5) * .12, (rng() - .5) * .18, 0, false);
      }
    }
  }

  _composeVale(site, rng) {
    const A = (...args) => this._queue('vale', ...args);
    if (site.variant === 3) {
      // A grown, walkable first destination: successive stone/root arches
      // tighten toward the Aster core while asymmetrical young trees and
      // fallen stones make the lane feel discovered rather than constructed.
      for (let i = 0; i < 4; i++) {
        const z = -2.6 - i * 4.15;
        const arch = (3.15 + i * .18) * site.scale;
        A('accent', site, (i % 2 ? .16 : -.12), z,
          arch, (3.55 + i * .16) * site.scale, (2.45 + i * .10) * site.scale,
          i * .11, 0, i % 2 ? .055 : -.045, 0, i < 2);
        for (const side of [-1, 1]) {
          const x = side * (3.18 + i * .13);
          A('mass', site, x, z + side * .24,
            (.42 + i * .025) * site.scale, (4.0 + (i % 2) * .55) * site.scale, (.46 + i * .025) * site.scale,
            side * (.05 + i * .018), 0, side * (i % 2 ? -.16 : .13), 0, i < 3);
          A('organic', site, x + side * .24, z,
            (1.55 + i * .13) * site.scale, (1.42 + (i % 2) * .20) * site.scale, (1.65 + i * .10) * site.scale,
            i * .6, 0, 0, (3.15 + (i % 2) * .38) * site.scale, false);
        }
      }
      for (let i = 0; i < 9; i++) {
        const a = i * 2.3999632297 + .5;
        const r = 4.0 + (i % 4) * 1.15;
        A('detail', site, Math.cos(a) * r, -8 + Math.sin(a) * r,
          .36 + (i % 3) * .11, .32 + (i % 2) * .15, .42 + (i % 4) * .08,
          a, 0, (i % 2 ? .10 : -.08), 0, false);
      }
    } else if (site.variant === 0) {
      A('mass', site, 0, -8, 2.4 * site.scale, 13.5 * site.scale, 2.25 * site.scale, .08, 0, -.10, 0, true);
      // Buttress roots and high limbs turn the focal tree into a grown piece of
      // architecture. Their asymmetry also breaks the old pole-and-ball read.
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + .17;
        const reach = (4.2 + (i % 3) * 1.15) * site.scale;
        A('mass', site, Math.cos(a) * reach * .48, -8 + Math.sin(a) * reach * .48,
          (.42 + (i % 2) * .12) * site.scale, reach, (.50 + (i % 3) * .08) * site.scale,
          a, 0, i % 2 ? 1.16 : -1.16, .12, i % 3 === 0);
      }
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + .48;
        A('mass', site, Math.cos(a) * 1.25, -8 + Math.sin(a) * 1.25,
          .50 * site.scale, (4.3 + (i % 2) * 1.2) * site.scale, .50 * site.scale,
          a, 0, i % 2 ? .91 : -.94, 6.2 * site.scale, false);
        A('organic', site, Math.cos(a) * 4.3, -8 + Math.sin(a) * 4.3,
          (2.2 + (i % 3) * .35) * site.scale, (1.7 + (i % 2) * .35) * site.scale,
          (2.0 + ((i + 1) % 3) * .38) * site.scale, a, 0, 0, 7.1 * site.scale);
      }
      A('organic', site, 0, -8, 4.6 * site.scale, 3.6 * site.scale, 4.2 * site.scale, 0, 0, 0, 9.3 * site.scale);
      A('organic', site, -3.2, -6.4, 3.2 * site.scale, 2.7 * site.scale, 3.1 * site.scale, 0, 0, 0, 7.3 * site.scale);
      A('organic', site, 3.5, -7.1, 3.1 * site.scale, 2.8 * site.scale, 3.4 * site.scale, 0, 0, 0, 7.7 * site.scale);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + .3, r = 8.5 + (i % 2) * 1.8;
        A('detail', site, Math.cos(a) * r, Math.sin(a) * r - 2, .7, .6 + (i % 3) * .2, .8, a, 0, .08 * Math.sin(i), 0, false);
      }
    } else if (site.variant === 1) {
      A('accent', site, 0, -4.5, 6.8 * site.scale, 7.5 * site.scale, 5.2 * site.scale, 0, 0, 0, 0, true);
      for (const side of [-1, 1]) {
        A('mass', site, side * 5.5, -4.4, 1.35 * site.scale, 8.2 * site.scale, 1.35 * site.scale, side * .08, 0, side * -.18, 0, true);
        A('organic', site, side * 5.2, -4.6, 2.7 * site.scale, 2.3 * site.scale, 2.8 * site.scale, 0, 0, 0, 6.2 * site.scale);
      }
      A('organic', site, 0, -7.5, 3.5 * site.scale, 2.4 * site.scale, 3.2 * site.scale, 0, 0, 0, 5.2 * site.scale);
    } else {
      A('mass', site, -1, -7, 1.8 * site.scale, 12.8 * site.scale, 1.8 * site.scale, -.35, 0, Math.PI / 2.15, 1.2, true);
      A('organic', site, -7.3, -6.2, 4.4 * site.scale, 3.2 * site.scale, 4.0 * site.scale, 0, 0, 0, 1.4);
      A('accent', site, 4.6, -6.2, 5.4 * site.scale, 6.0 * site.scale, 4.1 * site.scale, -.15, 0, 0, 0, true);
      A('mass', site, 6.6, -5.5, 1.2 * site.scale, 6.2 * site.scale, 1.2 * site.scale, .1, 0, -.22, 0, true);
      A('organic', site, 6.8, -5.7, 2.8 * site.scale, 2.2 * site.scale, 2.8 * site.scale, 0, 0, 0, 4.7 * site.scale);
    }
    this._commonClusters(site, rng, ['detail', 'organic']);
  }

  _composeEmber(site, rng) {
    const A = (...args) => this._queue('ember', ...args);
    if (site.variant === 0) {
      for (let i = -3; i <= 3; i++) {
        const h = (5.8 + (3 - Math.abs(i)) * 1.2) * site.scale;
        A('organic', site, i * 2.1, -6.5 - Math.abs(i) * .75, 3.4 * site.scale, h, 2.7 * site.scale, -.22 * i, 0, 0, 0, i === -3 || i === 3);
      }
      A('mass', site, 0, -9, 2.1 * site.scale, 11.5 * site.scale, 2.1 * site.scale, 0, 0, -.08, 0, true);
    } else if (site.variant === 1) {
      for (const [x, z, h, lean] of [[-4,-6,12,.18],[4,-6,10,-.2],[0,-11,15,.08],[-8,-10,7,.28],[8,-11,8,-.22]]) {
        A('mass', site, x, z, 1.5 * site.scale, h * site.scale, 1.4 * site.scale, .1 * x, 0, lean, 0, true);
      }
      A('accent', site, 0, -5, 1.25, 3.4, 1.25, .2, 0, 0, 0, true);
    } else if (site.variant === 3) {
      // Cinderwake Gate: paired clinker ribs rise in a tightening processional
      // around one hot glass lens. The clear centre stays legible from the hub.
      for (let i = 0; i < 4; i++) {
        const z = -2.5 - i * 3.05, spread = 3.6 + i * .34;
        for (const side of [-1, 1]) {
          A('mass', site, side * spread, z,
            (.54 + i * .08) * site.scale, (4.8 + i * .82 + (side > 0 ? .45 : 0)) * site.scale, (.62 + i * .07) * site.scale,
            side * .08, 0, side * (-.25 + i * .025), 0, i < 2);
        }
      }
      A('organic', site, 0, -7.2, 5.4 * site.scale, 5.1 * site.scale, 3.8 * site.scale, .08, 0, 0, 0, true);
      A('accent', site, 0, -6.4, 1.18, 2.8, 1.18, .2, 0, 0, .35, true);
      for (const x of [-5.8, -2.9, 3.0, 5.9]) {
        A('detail', site, x, -10.5 + Math.abs(x) * .26, .48, .35 + Math.abs(x) * .035, .58, x * .18, 0, x * -.018, 0, false);
      }
    } else {
      A('organic', site, 0, -5.5, 7.6 * site.scale, 8.0 * site.scale, 5.3 * site.scale, 0, 0, 0, 0, true);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + .18, r = 8 + (i % 2) * 3;
        A('mass', site, Math.cos(a) * r, Math.sin(a) * r - 5, .8 + (i % 3) * .28, (4.2 + (i % 4) * 1.4) * site.scale, .9, a, 0, (i % 2 ? -.18 : .16), 0, i % 3 === 0);
      }
    }
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + .4, r = 5.2 + (i % 2) * 2.4;
      A('accent', site, Math.cos(a) * r, Math.sin(a) * r - 4, .5 + i * .08, 1.1 + (i % 3) * .55, .5 + i * .06, a, 0, .1, 0, i === 2);
    }
    this._commonClusters(site, rng, ['detail', 'mass']);
  }

  _composeFrost(site, rng) {
    const A = (...args) => this._queue('frost', ...args);
    if (site.variant === 0) {
      const spires = [[0,-10,16,2.2],[-4,-7,11,1.6],[4,-7,12,1.7],[-8,-11,8,1.3],[8,-12,7,1.2]];
      for (const [x,z,h,w] of spires) A('mass', site, x, z, w * site.scale, h * site.scale, w * site.scale, x * .025, 0, x * -.018, 0, true);
      A('accent', site, 0, -4.8, 6.2 * site.scale, 7.0 * site.scale, 4.8 * site.scale, 0, 0, 0, 0, true);
    } else if (site.variant === 1) {
      A('accent', site, 0, -5.5, 7.2 * site.scale, 8.8 * site.scale, 5.1 * site.scale, 0, 0, 0, 0, true);
      for (const side of [-1,1]) {
        A('mass', site, side * 5.8, -8, 1.7 * site.scale, (12 - side) * site.scale, 1.6 * site.scale, 0, 0, side * -.12, 0, true);
        A('organic', site, side * 7.5, -3.5, 2.3, 1.0, 2.5, 0, 0, 0, 0, false);
      }
    } else if (site.variant === 3) {
      // Hushglass Cairn: two offset ice bows shelter an asymmetrical family of
      // wind-cut blades. It reads as one frozen instrument, not a spike ring.
      A('accent', site, -.55, -4.3, 5.1 * site.scale, 5.4 * site.scale, 3.5 * site.scale, -.08, 0, -.06, 0, true);
      A('accent', site, 1.0, -7.0, 3.8 * site.scale, 4.0 * site.scale, 2.8 * site.scale, .17, 0, .08, .25, false);
      const cairn = [[-5.0,-4.0,6.8,1.0,.18],[4.4,-5.2,8.4,1.15,-.16],[-3.3,-9.0,5.4,.82,.12],[3.0,-10.5,6.2,.9,-.09],[0,-12.2,9.4,1.2,.06]];
      for (const [x,z,h,w,lean] of cairn) {
        A('mass', site, x, z, w * site.scale, h * site.scale, w * site.scale, x * .025, 0, lean, 0, Math.abs(x) > 3.5);
      }
      for (const side of [-1, 1]) A('organic', site, side * 6.8, -7.5, 2.1, .72, 2.35, side * .22, 0, 0, .12, false);
    } else {
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + .15, r = 7 + Math.sin(i * 2.1) * 2.4;
        A('mass', site, Math.cos(a) * r, Math.sin(a) * r - 5, .75 + (i % 3) * .3, (4.5 + (i % 5) * 1.25) * site.scale, .8 + (i % 2) * .3, a, 0, (i % 2 ? .13 : -.12), 0, i % 3 === 0);
      }
      A('organic', site, 0, -7, 4.8 * site.scale, 1.5 * site.scale, 5.4 * site.scale, 0, 0, 0, 0, false);
    }
    this._commonClusters(site, rng, ['detail', 'organic']);
  }

  _mushroom(site, x, z, h, width, yaw = 0, solid = true) {
    this._queue('mycel', 'mass', site, x, z, width * .38, h, width * .38, yaw, 0, (x * .012), 0, solid);
    this._queue('mycel', 'organic', site, x, z, width, width, width, yaw, 0, 0, h - width * .18, false);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + yaw;
      this._queue('mycel', 'detail', site, x + Math.cos(a) * width * .52, z + Math.sin(a) * width * .52,
        .18 * width, .13 * width, .18 * width, 0, 0, 0, h + width * .04, false);
    }
  }

  _composeMycel(site, rng) {
    const A = (...args) => this._queue('mycel', ...args);
    if (site.variant === 0) {
      this._mushroom(site, 0, -8, 10.5 * site.scale, 4.8 * site.scale, .2, true);
      this._mushroom(site, -5.5, -4, 6.5 * site.scale, 3.1 * site.scale, -.2, true);
      this._mushroom(site, 5.8, -5.2, 7.2 * site.scale, 3.4 * site.scale, .35, true);
      A('accent', site, 0, -3, 6.0 * site.scale, 5.3 * site.scale, 4.4 * site.scale, 0, 0, 0, 0, true);
    } else if (site.variant === 1) {
      for (const [x,z,h,w] of [[-6,-7,9,4],[6,-7,11,4.8],[0,-12,13,5.4],[-9,-12,6,3],[9,-13,7,3.2]]) {
        this._mushroom(site, x, z, h * site.scale, w * site.scale, x * .04, Math.abs(x) < 7);
      }
      A('accent', site, 0, -4.2, 7.2 * site.scale, 7.0 * site.scale, 5.5 * site.scale, 0, 0, 0, 0, true);
    } else if (site.variant === 3) {
      // Lanternroot Vestibule: a short, nested rhizome nave with mushroom
      // lanterns alternating in height. The lane is human-scale at the hub.
      for (let i = 0; i < 3; i++) {
        const z = -2.7 - i * 3.15;
        A('accent', site, i % 2 ? .35 : -.25, z,
          (3.75 + i * .50) * site.scale, (3.55 + i * .42) * site.scale, (2.45 + i * .28) * site.scale,
          i * .08, 0, i % 2 ? .055 : -.05, 0, i < 2);
      }
      const lanterns = [[-4.4,-3.3,4.7,2.25],[4.1,-4.4,5.8,2.55],[-5.0,-8.2,6.2,2.8],[4.8,-9.4,4.9,2.35],[0,-12.0,7.6,3.15]];
      for (const [x,z,h,w] of lanterns) this._mushroom(site, x, z, h * site.scale, w * site.scale, x * .06, Math.abs(x) < 4.5);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.3999632297;
        A('detail', site, Math.cos(a) * (3.6 + i * .34), -6 + Math.sin(a) * (3.4 + i * .25), .24, .18, .28, a, 0, .06, .08, false);
      }
    } else {
      A('accent', site, 0, -5.5, 8.2 * site.scale, 7.5 * site.scale, 5.8 * site.scale, 0, 0, 0, 0, true);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + .35, r = 8.5 + (i % 2) * 2;
        this._mushroom(site, Math.cos(a) * r, Math.sin(a) * r - 4, (5.2 + (i % 4) * 1.3) * site.scale, (2.5 + (i % 3) * .7) * site.scale, a, i % 2 === 0);
      }
    }
    this._commonClusters(site, rng, ['detail', 'accent']);
  }

  _composeShatter(site, rng) {
    const A = (...args) => this._queue('shatter', ...args);
    if (site.variant === 0) {
      A('accent', site, 0, -6, 6.8 * site.scale, 6.8 * site.scale, 6.8 * site.scale, 0, 0, 0, 5.2 * site.scale);
      A('accent', site, 0, -6, 4.2 * site.scale, 4.2 * site.scale, 4.2 * site.scale, 0, Math.PI / 2, 0, 5.2 * site.scale);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        A('organic', site, Math.cos(a) * 7, Math.sin(a) * 7 - 6, 1.0 + (i%3)*.35, .8 + (i%2)*.5, 1.1, a, .2, .1, 2.4 + (i%3)*1.8, false);
      }
    } else if (site.variant === 1) {
      for (let i = 0; i < 8; i++) {
        const x = (i % 2 ? 1 : -1) * (3.4 + Math.floor(i / 2) * .8);
        const z = -1.5 - i * 2.15;
        A('mass', site, x, z, 2.4, .55, 4.2, 0, 0, (i % 2 ? -.08 : .08), 1.0 + i * .82, i < 3);
      }
      A('accent', site, 0, -10, 5.2, 5.2, 5.2, 0, 0, 0, 7.5);
    } else if (site.variant === 3) {
      // Gravity Well Garden: a tilted three-axis orrery held over a descending
      // spiral of slate benches. Its empty centre becomes the combat stage.
      A('accent', site, 0, -6.2, 4.4 * site.scale, 4.4 * site.scale, 4.4 * site.scale, .12, 0, 0, 4.8 * site.scale);
      A('accent', site, 0, -6.2, 3.2 * site.scale, 3.2 * site.scale, 3.2 * site.scale, 0, Math.PI / 2, .18, 4.8 * site.scale);
      A('accent', site, 0, -6.2, 2.1 * site.scale, 2.1 * site.scale, 2.1 * site.scale, .72, .46, 0, 4.8 * site.scale);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.3999632297 + .3, r = 4.2 + i * .62;
        A('mass', site, Math.cos(a) * r, -6.2 + Math.sin(a) * r,
          (1.55 + (i % 3) * .28) * site.scale, (.32 + (i % 2) * .13) * site.scale, (2.4 + (i % 4) * .36) * site.scale,
          a, .04 * Math.sin(i), i % 2 ? .10 : -.08, .45 + i * .34, i < 3);
        if (i % 2 === 0) A('organic', site, Math.cos(a) * r * .76, -6.2 + Math.sin(a) * r * .76,
          .42, .30, .48, a, 0, 0, 2.1 + i * .36, false);
      }
    } else {
      for (const [x,z,h,w,lean] of [[0,-10,15,2,.08],[-6,-6,10,1.6,-.16],[6,-7,12,1.8,.14],[-10,-12,7,1.5,.24],[10,-13,8,1.4,-.21]]) {
        A('mass', site, x, z, w * site.scale, h * site.scale, w * site.scale, .1 * x, 0, lean, 0, true);
        A('organic', site, x + lean * 9, z, w * .9, w * .65, w, 0, 0, 0, h * site.scale + 1.2, false);
      }
      A('accent', site, 0, -5.5, 6.0 * site.scale, 6.0 * site.scale, 6.0 * site.scale, 0, 0, 0, 5.5 * site.scale);
    }
    this._commonClusters(site, rng, ['detail', 'organic']);
  }

  _compose() {
    for (const site of this.sites) {
      const rng = seededSite(site);
      this._approach(site, rng);
      if (site.region === 'vale') this._composeVale(site, rng);
      else if (site.region === 'ember') this._composeEmber(site, rng);
      else if (site.region === 'frost') this._composeFrost(site, rng);
      else if (site.region === 'mycel') this._composeMycel(site, rng);
      else this._composeShatter(site, rng);
      this._queue(site.region, 'core', site, 0, 0, 1, 1, 1, 0, 0, 0, 0, false);
    }
  }

  _buildMeshes() {
    for (const [key, items] of this.batches) {
      const [region, kind] = key.split(':');
      const def = BATCH[region][kind];
      const mesh = new THREE.InstancedMesh(def.geo(), def.mat(), items.length);
      mesh.name = 'living-' + key;
      mesh.castShadow = kind !== 'core' && kind !== 'detail';
      mesh.receiveShadow = kind !== 'core';
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        _e.set(it.pitch, it.yaw, it.roll);
        _q.setFromEuler(_e);
        _m.compose(_p.set(it.x, it.y, it.z), _q, _s.set(it.sx, it.sy, it.sz));
        mesh.setMatrixAt(i, _m);
        if (kind === 'core') {
          it.site.coreMesh = mesh;
          it.site.coreIndex = i;
          it.site.coreBase = it.y;
          const keyColor = REGIONS[region].key;
          const bright = it.site.state === 'cleared' ? 1 : .46;
          _color.setRGB(keyColor[0] * bright, keyColor[1] * bright, keyColor[2] * bright);
          mesh.setColorAt(i, _color);
        }
      }
      mesh.instanceMatrix.setUsage(kind === 'core' ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      if (kind === 'core') this.coreMeshes.push(mesh);
      mesh.computeBoundingSphere?.();
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
    }
  }

  _alive(tag) {
    return G.enemies.pending.some((p) => p.tag === tag) || G.enemies.list.some((e) => e.tag === tag);
  }

  _spawn(site) {
    const table = REGION_SPAWNS[site.region];
    const n = 2 + site.rank;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + site.index * .71;
      let roll = ((i * .37 + site.index * .173) % 1), type = table[0][0];
      for (const [candidate, weight] of table) { roll -= weight; if (roll <= 0) { type = candidate; break; } }
      const r = 9.5 + (i % 2) * 3.5;
      G.enemies.spawn(type, site.x + Math.cos(a) * r, site.z + Math.sin(a) * r, {
        ctx: 'world', tag: site.tag, boost: i === 0 ? 1 + site.rank * .35 : 1,
      });
    }
  }

  _setCore(site, bright) {
    if (!site.coreMesh) return;
    const k = REGIONS[site.region].key;
    _color.setRGB(k[0] * bright, k[1] * bright, k[2] * bright);
    site.coreMesh.setColorAt(site.coreIndex, _color);
    site.coreMesh.instanceColor.needsUpdate = true;
  }

  _clear(site, quiet = false) {
    if (site.state === 'cleared') return;
    site.state = 'cleared';
    G.save.found['wonder-' + site.id] = true;
    this._setCore(site, 1);
    sfx('unlock', { gain: quiet ? .48 : .72, pitch: quiet ? 1.28 : .92 });
    juice.shake(quiet ? .16 : .32);
    G.particles?.burst('soul', site.x, site.y + 2.4, site.z, quiet ? 15 : 24, {
      color: REGIONS[site.region].key, sizeMult: quiet ? 1.0 : 1.3,
    });
    G.rovers?.pulse(site.x, site.y + 2.4, site.z, REGIONS[site.region].key, quiet ? 2.4 : 3.8, 6, 16);
    // Optional Aster only: this never touches health, damage, guardian keys,
    // traversal verbs, or any of the original upgrade progression.
    G.motes?.spawn('soul', site.x, site.y + 1.7, site.z, quiet ? 2 : 2 + site.rank);
    save();
  }

  _abandon(site) {
    site.state = 'dormant';
    for (const e of [...G.enemies.list]) if (e.tag === site.tag) G.enemies.remove(e, false);
    G.enemies.pending = G.enemies.pending.filter((p) => p.tag !== site.tag);
  }

  update(dt, t) {
    if (!G.player) return;
    const px = G.player.pos.x, pz = G.player.pos.z;
    for (const site of this.sites) {
      const dx = site.x - px, dz = site.z - pz, d2 = dx * dx + dz * dz;
      const near = d2 < 62 * 62;
      if (near) {
        const glow = site.state === 'cleared' ? 1.1 : site.state === 'fight' ? 1.45 : .56;
        G.rovers?.request(site.x, site.y + 2.5, site.z, REGIONS[site.region].key, glow, site.state === 'fight' ? 15 : 10);
      }

      if (site.coreMesh) {
        const scale = site.state === 'cleared' ? 1.18 : site.state === 'fight' ? 1.28 : 1;
        _e.set(0, site.rotation + t * (site.state === 'fight' ? 1.2 : .42) + site.index, 0);
        _q.setFromEuler(_e);
        _m.compose(
          _p.set(site.x, site.coreBase + Math.sin(t * 1.35 + site.index) * .16, site.z),
          _q, _s.setScalar(scale)
        );
        site.coreMesh.setMatrixAt(site.coreIndex, _m);
      }

      if (site.state === 'cleared' || G.mode !== 'world') continue;
      if (site.state === 'dormant' && d2 < 6.2 * 6.2) {
        if (!site.encounter) {
          this._clear(site, true);
        } else {
          site.state = 'fight';
          site.settleT = 1.0;
          this._setCore(site, 1.2);
          sfx('bossroar', { pitch: 1.32 + site.rank * .11, gain: .48 });
          sfx('discover', { pitch: .82, gain: .58 });
          juice.shake(.22);
          G.particles?.burst('impact', site.x, site.y + 2.2, site.z, 20, { color: REGIONS[site.region].key, sizeMult: 1.2 });
          this._spawn(site);
        }
      } else if (site.state === 'fight') {
        site.settleT -= dt;
        if (site.settleT <= 0 && !this._alive(site.tag)) this._clear(site, false);
        else if (d2 > 58 * 58) { this._setCore(site, .46); this._abandon(site); }
      }
    }
    for (const mesh of this.coreMeshes) mesh.instanceMatrix.needsUpdate = true;
  }
}
