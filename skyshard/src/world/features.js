// Mid-size world life: the layer between grass and destinations. Two jobs —
//   1. region set-dressing (instanced: arches, monoliths, roots, ribs,
//      waystones, banners) so the land between doors has style, and
//   2. battle shrines: ten small arenas. Wake the obelisk, survive two waves,
//      and it ignites — paying out in gun skins, never in numbers.

import * as THREE from 'three';
import { makeRng } from '../core/rng.js';
import { regionWeights, REGIONS } from './regions.js';
import { terrainHeight, terrainNormal } from './terrain.js';
import { DESTS, SPIRE } from './destdata.js';
import { REGION_SPAWNS } from '../combat/enemytypes.js';
import { G } from '../state.js';
import { sfx } from '../core/audio.js';
import { juice } from '../fx/juice.js';
import { save } from '../core/save.js';
import { R6_THRESHOLDS, WONDERS } from './wonderdata.js';
import { worldSurface } from './materials.js';

const mat = (color, emissive = 0x000000, ei = 0) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 1, flatShading: true });
const LANDMARKS = Object.freeze([...WONDERS, ...R6_THRESHOLDS]);

// ---- geometry merge helper (position/normal/color, non-indexed) -------------
function mergeGeos(parts) {
  const geos = parts.map(({ geo, color, translate, scale, rotate }) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (scale) g.scale(...scale);
    if (rotate) { g.rotateX(rotate[0]); g.rotateY(rotate[1]); g.rotateZ(rotate[2]); }
    if (translate) g.translate(...translate);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { colors[i * 3] = color[0]; colors[i * 3 + 1] = color[1]; colors[i * 3 + 2] = color[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), norm = new Float32Array(total * 3), col = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let off = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, off * 3);
    norm.set(g.attributes.normal.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, off * 2);
    off += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}

const C = THREE.CylinderGeometry, B = THREE.BoxGeometry, Co = THREE.ConeGeometry,
  T = THREE.TorusGeometry, I = THREE.IcosahedronGeometry;

function rootArcGeo(radius = .22, phase = 0) {
  const points = [
    [-1.13, .02, .05], [-1.01, .38, -.08], [-.76, .80, .10],
    [-.44, 1.20, -.11], [-.10, 1.48, .08], [.27, 1.43, -.06],
    [.61, 1.16, .11], [.91, .67, -.08], [1.12, .02, .04],
  ].map(([x, y, z], i) => new THREE.Vector3(
    x,
    y * (1 + Math.sin(i * 1.7 + phase) * .045),
    z + Math.sin(i * 2.3 + phase) * .035,
  ));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .5);
  const g = new THREE.TubeGeometry(curve, 46, radius, 11, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const grain = 1 + Math.sin(x * 7.1 + y * 4.3 + z * 5.7 + phase) * .032;
    p.setXYZ(i, x * grain, y, z * grain);
  }
  g.computeVertexNormals();
  return g;
}

// ---- region features (instanced) ---------------------------------------------
const FEATURES = {
  waystone: {  // Vale: weather-softened lichen cairns
    surface: 'stone',
    region: 'vale', count: 115, scale: [0.7, 1.3], collider: 0.5, colliderH: 1.6,
    make: () => mergeGeos([
      { geo: new I(.54, 1), color: [.31, .33, .28], scale: [1.18, .53, .88], translate: [0, .29, 0], rotate: [.04, .42, -.03] },
      { geo: new I(.42, 1), color: [.40, .41, .34], scale: [1.02, .59, .82], translate: [.09, .68, .01], rotate: [.17, 1.18, -.09] },
      { geo: new I(.31, 1), color: [.34, .43, .27], scale: [.91, .66, .78], translate: [-.07, 1.02, .04], rotate: [-.12, 2.08, .12] },
    ]),
  },
  fence: {     // Vale: leaning field fences, long fallen
    surface: 'forest',
    region: 'vale', count: 165, scale: [0.8, 1.2],
    make: () => mergeGeos([
      { geo: new C(0.05, 0.075, 1.1, 8), color: [0.4, 0.32, 0.22], translate: [-0.9, 0.55, 0], rotate: [0, 0, 0.06] },
      { geo: new C(0.05, 0.073, 1.0, 8), color: [0.38, 0.3, 0.2], translate: [0.9, 0.5, 0], rotate: [0, 0, -0.09] },
      { geo: new C(0.044, 0.058, 2.03, 8), color: [0.45, 0.36, 0.24], translate: [0, 0.78, 0], rotate: [0, 0, Math.PI / 2 + 0.04] },
      { geo: new C(0.042, 0.056, 1.93, 8), color: [0.42, 0.34, 0.23], translate: [0, 0.42, 0.02], rotate: [0, 0, Math.PI / 2 - 0.05] },
    ]),
  },
  obsArch: {   // Ember: half-melted obsidian arches
    surface: 'obsidian',
    region: 'ember', count: 72, scale: [0.9, 1.9], collider: 0.6, colliderH: 4,
    make: () => mergeGeos([
      { geo: new C(0.35, 0.55, 3.4, 5), color: [0.09, 0.06, 0.08], translate: [-1.5, 1.7, 0], rotate: [0, 0, 0.24] },
      { geo: new C(0.3, 0.5, 3.2, 5), color: [0.11, 0.07, 0.09], translate: [1.5, 1.6, 0], rotate: [0, 0, -0.3] },
      { geo: new B(2.4, 0.5, 0.55), color: [0.13, 0.08, 0.1], translate: [0, 3.2, 0], rotate: [0, 0, 0.07] },
      { geo: new Co(0.2, 0.9, 4), color: [0.55, 0.2, 0.08], translate: [0.9, 0.45, 0.3], rotate: [0, 0, -0.4] },
    ]),
  },
  boneRib: {   // Ember: something enormous died here
    surface: 'stone',
    region: 'ember', count: 66, scale: [0.8, 1.8], collider: 0.35, colliderH: 3,
    make: () => mergeGeos([
      { geo: new T(2.2, 0.16, 5, 10, Math.PI * 0.62), color: [0.78, 0.72, 0.6], rotate: [0, 0, Math.PI * 0.22], translate: [0, 0.3, 0] },
    ]),
  },
  iceMonolith: { // Frost: tall singing ice
    surface: 'ice',
    region: 'frost', count: 88, scale: [0.7, 2.0], collider: 0.55, colliderH: 4.5,
    make: () => mergeGeos([
      { geo: new Co(0.6, 4.4, 5), color: [0.75, 0.88, 1.0], translate: [0, 2.2, 0], rotate: [0.04, 0, 0.05] },
      { geo: new Co(0.32, 2.2, 4), color: [0.85, 0.94, 1.0], translate: [0.55, 1.1, 0.2], rotate: [0, 0, -0.3] },
    ]),
  },
  snowdrift: {
    surface: 'ice',
    region: 'frost', count: 100, scale: [0.8, 1.8],
    make: () => {
      const source = new THREE.SphereGeometry(1.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
      const g = source.index ? source.toNonIndexed() : source.clone();
      g.scale(1.4, 0.35, 1);
      const n = g.attributes.position.count;
      const colors = new Float32Array(n * 3).fill(0.93);
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return g;
    },
  },
  rootArc: {   // Mycel: roots of something far larger than any tree here
    surface: 'mycel',
    region: 'mycel', count: 82, scale: [0.9, 1.9], collider: 0.5, colliderH: 2.6,
    make: () => mergeGeos([
      { geo: rootArcGeo(.24, .3), color: [.39, .30, .25], scale: [1.55, 1.28, 1.18], rotate: [0, -.10, .035], translate: [0, -.01, 0] },
      { geo: rootArcGeo(.13, 1.7), color: [.48, .36, .29], scale: [.92, .76, .82], rotate: [.18, .66, -.12], translate: [.72, .05, .34] },
    ]),
  },
  glowpod: {   // Mycel: soft light growing out of the marsh
    surface: 'mycel',
    region: 'mycel', count: 105, scale: [0.6, 1.4],
    make: () => mergeGeos([
      { geo: new THREE.SphereGeometry(0.28, 7, 6), color: [0.5, 1.0, 0.85], translate: [0, 0.34, 0] },
      { geo: new THREE.SphereGeometry(0.18, 6, 5), color: [0.42, 0.9, 0.78], translate: [0.3, 0.2, 0.14] },
      { geo: new THREE.SphereGeometry(0.13, 6, 5), color: [0.36, 0.8, 0.7], translate: [-0.26, 0.16, -0.1] },
      { geo: new C(0.05, 0.09, 0.5, 5), color: [0.25, 0.32, 0.28], translate: [0, 0.1, 0] },
    ]),
    emissiveLike: true,
  },
  brokenArch: { // Shatter: the sky fell through these
    surface: 'stone',
    region: 'shatter', count: 70, scale: [0.9, 1.8], collider: 0.6, colliderH: 4,
    make: () => mergeGeos([
      { geo: new C(0.4, 0.5, 3.8, 6), color: [0.5, 0.45, 0.58], translate: [-1.6, 1.9, 0] },
      { geo: new C(0.38, 0.48, 2.2, 6), color: [0.47, 0.42, 0.55], translate: [1.6, 1.1, 0], rotate: [0, 0, -0.12] },
      { geo: new B(1.4, 0.45, 0.6), color: [0.44, 0.4, 0.52], translate: [-1.1, 3.9, 0], rotate: [0, 0, 0.3] },
      { geo: new B(0.8, 0.4, 0.55), color: [0.4, 0.36, 0.48], translate: [1.2, 0.2, 0.6], rotate: [0.2, 0.6, 0] },
    ]),
  },
  runeStone: { // Shatter: still faintly humming
    surface: 'stone',
    region: 'shatter', count: 66, scale: [0.7, 1.4], collider: 0.5, colliderH: 2.8,
    make: () => mergeGeos([
      { geo: new B(0.9, 2.6, 0.5), color: [0.32, 0.28, 0.42], translate: [0, 1.3, 0], rotate: [0, 0.2, 0.05] },
      { geo: new B(0.12, 1.6, 0.06), color: [0.7, 0.5, 1.0], translate: [0, 1.3, 0.26] },
    ]),
  },
  banner: {    // near majors: the old order marked its doors
    surface: 'forest',
    region: null, count: 56, scale: [0.9, 1.2], nearMajors: true, collider: 0.2, colliderH: 3,
    make: () => mergeGeos([
      { geo: new C(0.06, 0.09, 3.2, 5), color: [0.3, 0.24, 0.18], translate: [0, 1.6, 0] },
      { geo: new B(0.7, 1.4, 0.04), color: [0.55, 0.42, 0.5], translate: [0.42, 2.4, 0] },
      { geo: new Co(0.12, 0.3, 4), color: [0.7, 0.6, 0.35], translate: [0, 3.35, 0] },
    ]),
  },
};

function nearAny(x, z, list, pad) {
  for (const d of list) if (Math.hypot(x - d.x, z - d.z) < (d.r || 10) + pad) return true;
  return false;
}

// ---- battle shrines -------------------------------------------------------------
// Two per region. Wake it, hold the circle through two waves, wear the proof.
const SHRINES = [
  { region: 'vale', x: -40, z: 240 }, { region: 'vale', x: 150, z: 470 },
  { region: 'ember', x: -300, z: 40 }, { region: 'ember', x: -430, z: 210 },
  { region: 'frost', x: -100, z: -310 }, { region: 'frost', x: -280, z: -470 },
  { region: 'mycel', x: 300, z: 60 }, { region: 'mycel', x: 480, z: 240 },
  { region: 'shatter', x: 220, z: -260 }, { region: 'shatter', x: 420, z: -350 },
];

export const SKINS = {
  default: { name: 'SPARKCASTER', body: 0x55617a, barrel: 0x6b7890, grip: 0x3c4356, glow: 0x86d8ff, tracer: 0xaee6ff },
  valebloom: { name: 'VALE BLOOM', body: 0x3e5a34, barrel: 0x7a9a4e, grip: 0x2c3e26, glow: 0xaaffcc, tracer: 0xc8ffb0 },
  emberglass: { name: 'EMBERGLASS', body: 0x1c1210, barrel: 0x3a1f14, grip: 0x140d0a, glow: 0xff7a30, tracer: 0xffb060 },
  frostbound: { name: 'FROSTBOUND', body: 0xd8e8f2, barrel: 0xa8c8e0, grip: 0x6a8aa0, glow: 0x9fe8ff, tracer: 0xd0f4ff },
  sporelight: { name: 'SPORELIGHT', body: 0x24352c, barrel: 0x3a5a4a, grip: 0x1a2a22, glow: 0x66ffcc, tracer: 0x8affdc },
  starwrought: { name: 'STARWROUGHT', body: 0x2c2440, barrel: 0x554477, grip: 0xc8a050, glow: 0xd8b8ff, tracer: 0xc9a0ff },
  soulfire: { name: 'SOULFIRE', body: 0x101418, barrel: 0x1a2028, grip: 0x0c1014, glow: 0x66f6ff, tracer: 0x9ffcff },
};
const REGION_SKIN = { vale: 'valebloom', ember: 'emberglass', frost: 'frostbound', mycel: 'sporelight', shatter: 'starwrought' };

export class Features {
  constructor(scene, collide) {
    this.scene = scene;
    this.collide = collide;
    this._plant(scene, collide);
    this._buildShrines(scene, collide);
  }

  // ---- instanced dressing ----
  _plant(scene, collide) {
    const rng = makeRng(7117);
    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
    const _e = new THREE.Euler();
    const up = new THREE.Vector3();
    const majors = DESTS.filter((d) => d.kind === 'major');
    const golden = 2.399963229728653;

    for (const [key, def] of Object.entries(FEATURES)) {
      const geo = def.make();
      const authored = worldSurface(def.surface);
      const m = new THREE.MeshStandardMaterial({
        vertexColors: true, flatShading: false, roughness: .82, metalness: .025,
        map: authored?.map || null,
        bumpMap: authored?.bump || null, bumpScale: authored ? .105 : 0,
        emissive: def.emissiveLike ? 0x77ffd0 : 0x000000,
        emissiveIntensity: def.emissiveLike ? 0.72 : 0,
      });
      const mesh = new THREE.InstancedMesh(geo, m, def.count);
      mesh.castShadow = true;
      let placed = 0, guard = 0;
      while (placed < def.count && guard++ < def.count * 40) {
        let x, z;
        if (def.nearMajors) {
          const d = majors[(rng() * majors.length) | 0];
          const a = rng() * Math.PI * 2;
          const rr = d.r + 4 + rng() * 14;
          x = d.x + Math.cos(a) * rr; z = d.z + Math.sin(a) * rr;
        } else {
          // Each feature belongs to a landmark ecosystem. Four offset lobes
          // around every authored site create thickets, ruins, and bone beds;
          // this replaces the old independent dice roll across a 1.2km square.
          const anchors = def.region
            ? LANDMARKS.filter((w) => w.region === def.region)
            : LANDMARKS;
          const d = anchors[(rng() * anchors.length) | 0];
          const lobe = (rng() * 4) | 0;
          const ca = d.rotation + lobe * golden + (rng() - .5) * .28;
          const cd = 12 + lobe * 3.4 + rng() * 7;
          const cx = d.x + Math.cos(ca) * cd;
          const cz = d.z + Math.sin(ca) * cd;
          const a = rng() * Math.PI * 2;
          const rr = Math.sqrt(rng()) * (4.5 + lobe * 1.15);
          x = cx + Math.cos(a) * rr; z = cz + Math.sin(a) * rr;
        }
        if (Math.hypot(x, z) > 600) continue;
        const h = terrainHeight(x, z);
        if (h < 1.4) continue;
        if (terrainNormal(x, z, up).y < 0.86) continue;
        if (!def.nearMajors && (nearAny(x, z, DESTS, 6) || Math.hypot(x - SPIRE.x, z - SPIRE.z) < SPIRE.r + 6)) continue;
        if (nearAny(x, z, SHRINES.map((s) => ({ ...s, r: 12 })), 0)) continue;
        if (def.region) {
          const w = regionWeights(x, z);
          if (w[def.region] < 0.55 || rng() > w[def.region]) continue;
        }
        const sc = def.scale[0] + rng() * (def.scale[1] - def.scale[0]);
        _e.set(0, rng() * Math.PI * 2, 0);
        _q.setFromEuler(_e);
        _m.compose(_p.set(x, h - 0.08, z), _q, _s.set(sc, sc, sc));
        mesh.setMatrixAt(placed, _m);
        if (def.collider && sc > 0.8) collide.addCircle(x, z, def.collider * sc, h - 1, h + def.colliderH * sc);
        placed++;
      }
      mesh.count = placed;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.matrixAutoUpdate = false;
      scene.add(mesh);
    }
  }

  // ---- shrines ----
  _buildShrines(scene, collide) {
    this.shrines = [];
    const stoneGeo = new THREE.DodecahedronGeometry(0.75, 0);
    stoneGeo.scale(1, 1.35, .78);
    const ruinSurface = worldSurface('stone');
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, map: ruinSurface?.map || null, bumpMap: ruinSurface?.bump || null,
      bumpScale: .14, roughness: .94, metalness: .01, flatShading: false,
    });
    const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, SHRINES.length * 20);
    stones.castShadow = true;
    const pylonGeo = new THREE.CylinderGeometry(.42, .66, 4.8, 8, 2);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, map: ruinSurface?.map || null, bumpMap: ruinSurface?.bump || null,
      bumpScale: .12, roughness: .82, metalness: .03, flatShading: false,
    });
    const pylons = new THREE.InstancedMesh(pylonGeo, pylonMat, SHRINES.length * 4);
    pylons.castShadow = true;
    const ringGeo = new THREE.TorusGeometry(6.7, .11, 7, 48);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false });
    const rings = new THREE.InstancedMesh(ringGeo, ringMat, SHRINES.length);
    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
    const _e = new THREE.Euler();
    const _c = new THREE.Color();
    let si = 0, pi = 0;

    for (let i = 0; i < SHRINES.length; i++) {
      const def = SHRINES[i];
      const y = terrainHeight(def.x, def.z);
      const key = REGIONS[def.region].key;

      const approach = Math.atan2(-def.z, -def.x);
      const baseCol = REGIONS[def.region].terra.cliff;
      for (let k = 0; k < 14; k++) {
        // A complete arena with one deliberate opening toward the island hub.
        const a = approach + .54 + k / 13 * (Math.PI * 2 - 1.08);
        const sx = def.x + Math.cos(a) * 9.2, sz = def.z + Math.sin(a) * 9.2;
        const sy = terrainHeight(sx, sz);
        _e.set(0, -a + Math.PI / 2, (i + k) % 2 ? .11 : -.08);
        _q.setFromEuler(_e);
        const ss = .7 + (k % 4) * .12;
        _m.compose(_p.set(sx, sy + .72 * ss, sz), _q, _s.set(ss, ss, ss));
        stones.setMatrixAt(si++, _m);
        _c.setRGB(baseCol[0] * (1.02 + (k % 3) * .08), baseCol[1] * (1.02 + (k % 3) * .08), baseCol[2] * (1.02 + (k % 3) * .08));
        stones.setColorAt(si - 1, _c);
        if (k % 3 === 0) collide.addCircle(sx, sz, .48 * ss, sy - .5, sy + 1.8 * ss);
      }
      for (let k = 0; k < 6; k++) {
        const a = approach + Math.PI + k / 6 * Math.PI * 2;
        const rr = 4.8 + (k % 2) * .7;
        const sx = def.x + Math.cos(a) * rr, sz = def.z + Math.sin(a) * rr;
        const sy = terrainHeight(sx, sz);
        _e.set(0, -a, (k % 2 ? .08 : -.06)); _q.setFromEuler(_e);
        const ss = .48 + (k % 3) * .08;
        _m.compose(_p.set(sx, sy + .72 * ss, sz), _q, _s.set(ss, ss, ss));
        stones.setMatrixAt(si++, _m);
        _c.setRGB(baseCol[0] * 1.12, baseCol[1] * 1.12, baseCol[2] * 1.12);
        stones.setColorAt(si - 1, _c);
      }

      const pylonAngles = [approach - .78, approach + .78, approach + Math.PI - .62, approach + Math.PI + .62];
      for (let k = 0; k < pylonAngles.length; k++) {
        const a = pylonAngles[k], rr = k < 2 ? 10.8 : 11.8;
        const x = def.x + Math.cos(a) * rr, z = def.z + Math.sin(a) * rr;
        const py = terrainHeight(x, z);
        _e.set(0, -a, k % 2 ? -.08 : .08); _q.setFromEuler(_e);
        const hh = .78 + (k % 2) * .13;
        _m.compose(_p.set(x, py + 2.4 * hh, z), _q, _s.set(.82, hh, .82));
        pylons.setMatrixAt(pi++, _m);
        _c.setRGB(REGIONS[def.region].key[0] * .72, REGIONS[def.region].key[1] * .72, REGIONS[def.region].key[2] * .72);
        pylons.setColorAt(pi - 1, _c);
        collide.addCircle(x, z, .58, py - .5, py + 4.8 * hh);
      }

      _m.compose(_p.set(def.x, y + .14, def.z), new THREE.Quaternion(), _s.set(1, 1, 1));
      rings.setMatrixAt(i, _m);
      _c.setRGB(REGIONS[def.region].key[0], REGIONS[def.region].key[1], REGIONS[def.region].key[2]);
      rings.setColorAt(i, _c);

      const obelisk = new THREE.Mesh(
        new THREE.CylinderGeometry(.34, .74, 4.4, 7, 3),
        new THREE.MeshStandardMaterial({
          color: 0x23262b, emissive: new THREE.Color(...key), emissiveIntensity: 0.06,
          bumpMap: worldSurface(def.region === 'ember' ? 'obsidian' : def.region === 'frost' ? 'ice' : def.region === 'mycel' ? 'mycel' : 'stone')?.bump || null,
          bumpScale: .12, roughness: .42, metalness: .12, flatShading: false,
        })
      );
      obelisk.position.set(def.x, y + 2.2, def.z);
      obelisk.castShadow = true;
      const crown = new THREE.Mesh(
        new THREE.TorusGeometry(.82, .06, 6, 28),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(...key), transparent: true, opacity: .62, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      crown.position.y = 1.55;
      crown.rotation.x = Math.PI / 2;
      obelisk.add(crown);
      scene.add(obelisk);
      collide.addCircle(def.x, def.z, .62, y, y + 4.4);

      const done = !!G.save.found['shrine-' + i];
      this.shrines.push({
        id: i, ...def, y, keyColor: key, obelisk,
        state: done ? 'cleared' : 'dormant',
        wave: 0, waveT: 0,
      });
      if (done) obelisk.material.emissiveIntensity = 1.4;
    }
    stones.instanceMatrix.needsUpdate = true;
    if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
    stones.matrixAutoUpdate = false;
    pylons.instanceMatrix.needsUpdate = true;
    if (pylons.instanceColor) pylons.instanceColor.needsUpdate = true;
    pylons.matrixAutoUpdate = false;
    rings.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    rings.matrixAutoUpdate = false;
    scene.add(stones, pylons, rings);
  }

  _spawnWave(sh, n) {
    const table = REGION_SPAWNS[sh.region];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random();
      let r = Math.random(), type = table[0][0];
      for (const [tk, w] of table) { r -= w; if (r <= 0) { type = tk; break; } }
      G.enemies.spawn(type, sh.x + Math.cos(a) * 9, sh.z + Math.sin(a) * 9, { ctx: 'world', tag: 'shrine' + sh.id });
    }
  }

  _aliveTagged(tag) {
    if (G.enemies.pending.some((p) => p.tag === tag)) return true;
    return G.enemies.list.some((e) => e.tag === tag);
  }

  update(dt, t) {
    const pl = G.player;
    for (const sh of this.shrines) {
      // idle looks: dormant obelisks barely breathe; cleared ones burn steady
      if (sh.state === 'cleared') {
        sh.obelisk.rotation.y += dt * 0.4;
        if ((sh.x - pl.pos.x) ** 2 + (sh.z - pl.pos.z) ** 2 < 35 * 35) {
          G.rovers?.request(sh.x, sh.y + 2.2, sh.z, sh.keyColor, 1.6, 14);
        }
        continue;
      }
      const d2 = (sh.x - pl.pos.x) ** 2 + (sh.z - pl.pos.z) ** 2;
      if (sh.state === 'dormant') {
        sh.obelisk.material.emissiveIntensity = 0.06 + Math.sin(t * 1.4 + sh.id) * 0.03;
        if (d2 < 5.5 * 5.5 && G.mode === 'world') {
          sh.state = 'fight';
          sh.wave = 1;
          sh.waveT = 0.8;
          sfx('bossroar', { pitch: 1.8, gain: 0.5 });
          sfx('discover', { pitch: 0.7, gain: 0.6 });
          juice.shake(0.25);
          G.particles?.burst('impact', sh.x, sh.y + 1.5, sh.z, 20, { color: sh.keyColor, sizeMult: 1.4 });
          this._spawnWave(sh, 3);
        }
      } else if (sh.state === 'fight') {
        sh.obelisk.material.emissiveIntensity = 0.5 + Math.sin(t * 8) * 0.3;
        G.rovers?.request(sh.x, sh.y + 2.2, sh.z, sh.keyColor, 1.4, 12);
        sh.waveT -= dt;
        if (sh.waveT <= 0 && !this._aliveTagged('shrine' + sh.id)) {
          if (sh.wave === 1) {
            sh.wave = 2;
            sh.waveT = 1.2;
            sfx('bossroar', { pitch: 2.1, gain: 0.4 });
            this._spawnWave(sh, 4);
          } else {
            this._clear(sh);
          }
        }
        // wandering too far abandons the fight (it forgives; it does not forget)
        if (d2 > 45 * 45) {
          sh.state = 'dormant';
          for (const e of [...G.enemies.list]) if (e.tag === 'shrine' + sh.id) G.enemies.remove(e, false);
          G.enemies.pending = G.enemies.pending.filter((p) => p.tag !== 'shrine' + sh.id);
        }
      }
    }
  }

  _clear(sh) {
    sh.state = 'cleared';
    G.save.found['shrine-' + sh.id] = true;
    sh.obelisk.material.emissiveIntensity = 1.4;
    sfx('unlock', { gain: 0.8 });
    juice.shake(0.42);
    juice.slowmo('kill3');
    G.particles?.burst('soul', sh.x, sh.y + 1.8, sh.z, 26, { color: sh.keyColor, sizeMult: 1.4 });
    G.rovers?.pulse(sh.x, sh.y + 2, sh.z, sh.keyColor, 4, 5, 18);

    // the pay-out: this region's skin, then Soulfire when all ten burn
    const skinKey = REGION_SKIN[sh.region];
    let granted = null;
    if (!G.save.skins[skinKey]) { G.save.skins[skinKey] = true; granted = skinKey; }
    const all = this.shrines.every((s) => s.state === 'cleared');
    if (all && !G.save.skins.soulfire) { G.save.skins.soulfire = true; granted = 'soulfire'; }
    if (granted) {
      G.save.skin = granted;
      G.weapon?.applySkin(granted);
      G.hud?.whisper(SKINS[granted].name + ' — T TO SWAP', 4.2);
    } else {
      G.hud?.whisper('THE STONE REMEMBERS', 2.4);
    }
    save();
  }
}
