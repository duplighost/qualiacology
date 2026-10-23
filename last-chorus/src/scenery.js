// Scenery: everything along the route, placed by song time. Zones say which
// kind of place each stretch of the song passes through (suburb, motel strip,
// city, downtown); set-pieces sit on exact moments (a billboard that says the
// line as it's sung, an overpass on the drop, the place the song ends).
// Things you pass while riding in time wake up: windows, signs, lamps.

import * as THREE from 'three';
import { GEO, buildingMaterial, tintMaterial, glowMaterial, signMaterial, makeAtlas, poolMaterial, storeMaterial } from './props.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const col = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

class Layer {
  constructor(scene, geo, mat, max, attrs = {}) {
    this.geo = geo; this.max = max; this.n = 0;
    this.attrs = {};
    for (const [k, size] of Object.entries(attrs)) {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(max * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(k, a);
      this.attrs[k] = { a, size };
    }
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  begin() { this.n = 0; }
  add(m, vals) {
    if (this.n >= this.max) return -1;
    this.mesh.setMatrixAt(this.n, m);
    if (vals) for (const k in vals) { const A = this.attrs[k]; if (A) { const v = vals[k]; if (A.size === 1) A.a.array[this.n] = v; else A.a.array.set(v, this.n * A.size); } }
    return this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const k in this.attrs) this.attrs[k].a.needsUpdate = true;
  }
}

export function makeMaterials(P, atlas) {
  return {
    house: buildingMaterial(P, [2.4, 2.9], { floors: 2 }),
    cottage: buildingMaterial(P, [2.2, 2.7], { floors: 2, sill: 1.0 }),
    block: buildingMaterial(P, [2.6, 3.1]),
    tower: buildingMaterial(P, [2.8, 3.3]),
    shop: buildingMaterial(P, [3.2, 3.0], { floors: 1, sill: 0.6 }),
    motel: buildingMaterial(P, [3.5, 3.1], { floors: 2, sill: 0.4 }),
    roof: tintMaterial(0xffffff, { rough: 0.9 }),
    tree: tintMaterial(0xffffff, { rough: 0.95 }),
    wood: tintMaterial(0xffffff, { rough: 0.85 }),
    cloth: tintMaterial(0xffffff, { rough: 0.7 }),
    metal: tintMaterial(0xffffff, { rough: 0.5, metal: 0.4 }),
    car: tintMaterial(0xffffff, { rough: 0.3, metal: 0.5 }),
    concrete: tintMaterial(0xffffff, { rough: 0.85 }),
    glow: glowMaterial(),
    pool: poolMaterial(),
    sign: signMaterial(atlas.tex, atlas.cols, atlas.rows),
    canopyLight: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2e0).multiplyScalar(2.5) }),
    store: storeMaterial(),
  };
}

const BW = { aWake: 3, aTint: 3 }, TT = { aTint: 3 };
export const LAYER_DEFS = {
  house: (M) => [GEO.house().body, M.house, 500, BW], roof: (M) => [GEO.house().roof, M.roof, 500, TT],
  block: (M) => [GEO.block(), M.block, 260, BW], tower: (M) => [GEO.tower(), M.tower, 140, BW],
  shop: (M) => [GEO.shop(), M.shop, 140, BW], motel: (M) => [GEO.motel(), M.motel, 30, BW],
  tree: (M) => [GEO.tree(), M.tree, 600, TT], pine: (M) => [GEO.pine(), M.tree, 400, TT],
  lamp: (M) => [GEO.lamp(), M.metal, 400, TT], hwLamp: (M) => [GEO.hwLamp(), M.metal, 300, TT],
  billboard: (M) => [GEO.billboard(), M.metal, 60, TT], board: (M) => [GEO.billboardFace(), M.sign, 60, { aIdx: 1, aWake: 2 }],
  signPole: (M) => [GEO.signPole(), M.metal, 100, TT], sign: (M) => [GEO.signFace(), M.sign, 160, { aIdx: 1, aWake: 2 }],
  canopy: (M) => [GEO.canopy(), M.concrete, 30, TT], canopyLight: (M) => [GEO.canopyLight(), M.canopyLight, 30, {}],
  car: (M) => [GEO.car(), M.car, 260, TT], overpass: (M) => [GEO.overpass(), M.concrete, 20, TT],
  water: (M) => [GEO.waterTower(), M.metal, 20, TT],
  glow: (M) => [GEO.quad(), M.glow, 4200, { aTint: 3, aWake: 2 }],
  pool: (M) => [GEO.flat(), M.pool, 800, { aTint: 3, aWake: 2 }],
  fence: (M) => [GEO.fence(), M.tree, 500, TT],
  roofKit: (M) => [GEO.roofKit(false), M.concrete, 260, TT], roofTank: (M) => [GEO.roofKit(true), M.concrete, 160, TT],
  towerTop: (M) => [GEO.towerTop(), M.concrete, 140, TT],
  store: (M) => [GEO.storefront(), M.store, 260, { aWake: 3 }], awning: (M) => [GEO.awning(), M.cloth, 260, TT],
};

// a place can add its own layers, parts and kits (see beach.js)
export function extend({ layers = {}, parts = {}, kits = {} }) { Object.assign(LAYER_DEFS, layers); Object.assign(PARTS, parts); Object.assign(KITS, kits); }

// pastel walls for houses; darker for blocks
export const PASTEL = [0xf6c1d9, 0xbfe6dc, 0xd7c6f2, 0xf6e3b4, 0xc6dcf5, 0xf3cdb8, 0xe8e2ec];

export class Scenery {
  constructor(scene, course, P, plan, seed = 7) {
    this.course = course; this.P = P; this.plan = plan || {};
    this.R = mulberry32(seed);
    const signs = [
      { key: 'MOTEL', text: 'MOTEL', color: '#ff4f9a' }, { key: 'VACANCY', text: 'VACANCY', color: '#5ff2ff' }, { key: 'NOVAC', text: 'NO VACANCY', color: '#ff3b3b' },
      { key: 'DINER', text: 'DINER', color: '#ffd166' }, { key: 'OPEN', text: 'OPEN\n24 HOURS', color: '#7cff8a' }, { key: 'LIQUOR', text: 'LIQUOR', color: '#5ff2ff' },
      { key: 'GAS', text: 'GAS', color: '#ff8a3d' }, { key: 'BAR', text: 'COCKTAILS', color: '#ff6fd8' }, { key: 'TOWING', text: '24HR TOWING', color: '#ffd166' },
      { key: 'BODYSHOP', text: 'BODY SHOP', color: '#ff4f4f' }, { key: 'CHAPEL', text: 'WEDDING\nCHAPEL', color: '#ffb3e6' }, { key: 'FLOWERS', text: 'FLOWERS', color: '#ff7fb3' },
      { key: 'ER', text: 'EMERGENCY', color: '#ff3b3b' }, { key: 'HOTEL', text: 'HOTEL', color: '#b48cff' }, { key: 'KISS', text: 'XOXO', color: '#ff4f9a' }, { key: 'EXIT', text: 'EXIT 9 ▸ DOWNTOWN', color: '#ffffff', bg: '#0b5d3b', core: '#ffffff' },
      { key: 'CLAMS', text: 'CLAM SHACK', color: '#ff8a5c' }, { key: 'FRIEDDOUGH', text: 'FRIED DOUGH', color: '#ffd166' }, { key: 'ICECREAM', text: 'ICE CREAM', color: '#ff9ed2' },
      { key: 'TAFFY', text: 'SALT WATER\nTAFFY', color: '#7fe0d2' }, { key: 'ARCADE', text: 'ARCADE', color: '#b48cff' }, { key: 'SURF', text: 'SURF SHOP', color: '#5ff2ff' },
      { key: 'DANCING', text: 'DANCING', color: '#ff4f9a' }, { key: 'LIVETONIGHT', text: 'LIVE\nTONIGHT', color: '#ffd166' }, { key: 'ENCORE', text: 'ENCORE', color: '#5ff2ff' },
      ...((plan && plan.signs) || []),
      ...((plan && plan.lyrics) || []).map((l, i) => ({ key: 'LYR' + i, text: l.text, color: l.color || '#ffffff', core: '#ffffff', bg: l.bg || '#120914', frame: l.frame || P.fret && '#' + new THREE.Color(P.fret).getHexString() })),
    ];
    this.atlas = makeAtlas(signs, 4, 12);

    this.scene = scene;
    this.mats = makeMaterials(P, this.atlas);
    // layers are made the first time a part asks for one, so a song only builds what it uses
    this._layers = {};
    const defs = LAYER_DEFS;
    this.layers = new Proxy(this._layers, { get: (o, k) => { if (o[k] || typeof k !== 'string') return o[k]; const d = defs[k]; if (!d) return undefined; const [geo, mat, max, attrs] = d(this.mats); return (o[k] = new Layer(scene, geo, mat, max, attrs)); } });
    this.items = [];
    this.traffic = [];
    this.roads = [];
    this._buildPlan();
    this.items.sort((a, b) => a.t - b.t);
    this._lo = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._e = new THREE.Euler(); this._o = new THREE.Vector3();
    this.beat = 0;
    this.wakeAll = 0;     // finale: everything lights
    this.roadMeshes = this.roads.map((r) => new Road(scene, course, r, P));
    const seen = new Set();
    for (const it of this.items) { if (seen.has(it.parts)) continue; seen.add(it.parts); try { PARTS[it.parts](this, { ...it, wakeNow: 0 }, new THREE.Vector3(0, -500, 0), new THREE.Quaternion(), 0); } catch (e) { console.warn('part', it.parts, e); } }
    for (const k of ['glow', 'pool', 'car']) void this.layers[k];
    for (const k in this._layers) { this._layers[k].begin(); this._layers[k].end(); }
  }

  // ---------- planning ----------
  _buildPlan() {
    const plan = this.plan, R = this.R, c = this.course;
    for (const z of plan.zones || []) {
      for (const kit of z.kits) (KITS[kit] || (() => {}))(this, z, R);
    }
    for (const l of plan.lyrics || []) {
      // billboards stand a little ahead of the moment the line is sung, facing the road
      const i = (plan.lyrics || []).indexOf(l);
      const t = l.t + (l.lead ?? 1.4), side = l.side ?? (i % 2 ? -1 : 1);
      this.items.push({ t, x: side * (l.x ?? plan.lyricX ?? 24), rot: side > 0 ? -0.35 : 0.35, h: l.h ?? 0, s: l.s ?? plan.lyricS ?? 1.25, parts: plan.lyricPart || 'billboard', idx: this.atlas.index['LYR' + i], wake: 1, keepLit: true, floor: l.floor ?? plan.lyricFloor });
    }
    for (const t of plan.overpasses || []) this.items.push({ t, x: 0, rot: 0, s: 1, parts: 'overpass', tint: col(0x3a3442) });
    for (const r of plan.roads || []) this.roads.push(r);
    // traffic on each road
    for (const r of this.roads) {
      if (r.traffic === false) continue;
      const lanes = r.lanes || [-7.5, -3, 3, 7.5];
      for (const lx of lanes) {
        const dir = lx > 0 ? 1 : -1;
        const n = Math.floor((c.duration + 20) * (r.density ?? 0.55));
        for (let i = 0; i < n; i++) {
          this.traffic.push({ road: r, x: r.x + lx * (r.flip ? -1 : 1), tau0: -6 + R() * (c.duration + 20), rate: dir > 0 ? 0.42 + R() * 0.25 : -(0.45 + R() * 0.3), tint: col(PASTEL[Math.floor(R() * PASTEL.length)]), dir, from: r.from ?? -10, to: r.to ?? 1e9, police: r.police && R() < r.police });
        }
      }
    }
  }

  // ---------- per frame ----------
  // set-pieces draw their lights through the same glow/pool layers
  glow(x, y, z, size, color, strength, mode = 0) { glowAt(this, x, y, z, size, color, strength, mode); }
  pool(x, y, z, size, color, strength) { poolAt(this, x, y, z, size, color, strength); }
  parkedCar(x, y, z, yaw, tint) { this._e.set(0, yaw, 0); this._q.setFromEuler(this._e); this._m.compose(this._p.set(x, y, z), this._q, this._s.set(1, 1, 1)); this.layers.car.add(this._m, { aTint: tint }); }

  update(track, rider, songT, dt, beat, extra) {
    const t = rider.t, items = this.items, Ls = this.layers;
    this.beat = beat; this.tNow = t;
    for (const k in Ls) Ls[k].begin();
    while (this._lo < items.length && items[this._lo].t < t - 5) this._lo++;
    const m = this._m, q = this._q, p = this._p, s = this._s, e = this._e, o = this._o;
    const flowWake = clamp((rider.flow - 0.2) / 0.6, 0, 1);
    for (let i = this._lo; i < items.length; i++) {
      const it = items[i];
      if (it.t > t + 46) break;
      if (it.ahead !== undefined && it.t > t + it.ahead) continue;
      if (!it.passed && it.t < t + 0.7 + Math.abs(it.x) / 90) { it.passed = true; it.target = Math.max(it.wake0 ?? 0, flowWake * clamp(1.3 - Math.abs(it.x) / 200, 0.3, 1)); }
      const tgt = Math.max(it.passed ? it.target : (it.wake0 ?? 0), this.wakeAll, it.keepLit ? 1 : 0);
      it.wakeNow = (it.wakeNow ?? it.wake0 ?? 0) + (tgt - (it.wakeNow ?? it.wake0 ?? 0)) * Math.min(1, dt * (1.2 + (it.seed ?? 0.5) * 2.5));
      track.ground(it.t, it.x, p);
      const yaw = this.course.sample(it.t).yaw + (it.rot || 0);
      p.y = it.h || 0;
      e.set(0, yaw, 0); q.setFromEuler(e);
      PARTS[it.parts](this, it, p, q, yaw);
    }
    // traffic
    for (const car of this.traffic) {
      let tau = car.tau0 + car.rate * songT;
      const span = this.course.duration + 26;
      tau = ((tau + 8) % span + span) % span - 8;
      if (tau < t - 3 || tau > t + 34 || tau < car.from || tau > car.to) continue;
      track.ground(tau, car.x, p);
      const yaw = this.course.sample(tau).yaw + (car.dir > 0 ? 0 : Math.PI);
      e.set(0, yaw, 0); q.setFromEuler(e);
      s.setScalar(1);
      m.compose(p, q, s);
      Ls.car.add(m, { aTint: car.police ? [0.95, 0.95, 1] : car.tint });
      // lights: head white-gold in front, tail red behind
      const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
      for (const side of [-0.65, 0.65]) {
        glowAt(this, p.x + fx * 2.3 + rx * side, 0.62, p.z + fz * 2.3 + rz * side, 1.6, [1.0, 0.92, 0.75], 1.4);
        glowAt(this, p.x - fx * 2.3 + rx * side, 0.66, p.z - fz * 2.3 + rz * side, 1.25, [1.0, 0.08, 0.1], 1.2);
      }
      if (car.police) {
        glowAt(this, p.x + rx * 0.4, 1.55, p.z + rz * 0.4, 2.2, [1, 0.05, 0.08], 2.4, 2);
        glowAt(this, p.x - rx * 0.4, 1.55, p.z - rz * 0.4, 2.2, [0.1, 0.25, 1], 2.4, 3);
      }
    }
    if (extra) extra(this);
    for (const k in Ls) Ls[k].end();
    for (const r of this.roadMeshes) r.update(track, rider);
    // shader clocks
    const bm = this.mats;
    for (const k of ['house', 'block', 'tower', 'shop', 'motel']) if (bm[k].userData.shader) bm[k].userData.shader.uniforms.uBeat.value = beat;
    bm.glow.uniforms.uTime.value = songT; bm.glow.uniforms.uBeat.value = beat;
    bm.sign.uniforms.uBeat.value = beat; bm.sign.uniforms.uTime.value = songT;
  }

  setFog(color, density, cam) {
    this.mats.sign.uniforms.uFogColor.value.set(color);
    this.mats.sign.uniforms.uFogDensity.value = density;
    this.mats.sign.uniforms.uCam.value.copy(cam);
    this.mats.store.uniforms.uFog.value.set(color); this.mats.store.uniforms.uFogDensity.value = density; this.mats.store.uniforms.uCam.value.copy(cam);
    for (const r of this.roadMeshes) { r.mat.uniforms.uFog.value.set(color); r.mat.uniforms.uFogDensity.value = density; r.mat.uniforms.uCam.value.copy(cam); }
  }
}

export function poolAt(S, x, y, z, size, color, strength) {
  const m = S._m3 || (S._m3 = new THREE.Matrix4());
  m.makeScale(size, 1, size); m.setPosition(x, y, z);
  S.layers.pool.add(m, { aTint: color, aWake: [strength, 0] });
}

export function glowAt(S, x, y, z, size, color, strength, mode = 0) {
  const m = S._m2 || (S._m2 = new THREE.Matrix4());
  m.makeScale(size, size, size); m.setPosition(x, y, z);
  S.layers.glow.add(m, { aTint: color, aWake: [strength, mode] });
}

// a panel facing the rider coming up the road, turned a little toward the road
export function faceQ(S, it) {
  const h = S.course.sample(it.t).yaw;
  const yaw = h + Math.PI + (it.x > 0 ? -0.55 : 0.55);
  S._e.set(0, yaw, 0);
  return S._q2 ? S._q2.setFromEuler(S._e) : (S._q2 = new THREE.Quaternion().setFromEuler(S._e));
}

// world position of an item-local offset
export function local(p, yaw, ox, oy, oz, out) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // item-local: +z forward along its yaw, +x to its left
  out.set(p.x + ox * c + oz * s, p.y + oy, p.z - ox * s + oz * c);
  return out;
}

// ---------- how each kind of thing is drawn ----------
export const PARTS = {
  house(S, it, p, q) {
    const m = S._m, sc = S._s.set(it.s, it.s, it.s);
    m.compose(p, q, sc);
    S.layers.house.add(m, { aWake: [it.wakeNow, it.seed, it.boarded || 0], aTint: it.tint });
    S.layers.roof.add(m, { aTint: it.roofTint });
    // porch light
    const o = local(p, it.yaw ?? 0, 0, 0, 0, S._o);
    if (it.porch) { const w = local(p, S.course.sample(it.t).yaw + it.rot, 0, 2.4 * it.s, 4.3 * it.s, S._o); glowAt(S, w.x, w.y, w.z, 1.6 * it.s, col(S.P.window), 0.5 + 1.2 * it.wakeNow); poolAt(S, w.x, p.y + 0.06, w.z + 0.0, 7 * it.s, col(S.P.window), 0.25 + 0.7 * it.wakeNow); }
  },
  block(S, it, p, q) {
    const m = S._m, sy = it.sy ?? it.s;
    m.compose(p, q, S._s.set(it.s, sy, it.s)); S.layers.block.add(m, { aWake: [it.wakeNow, it.seed, it.boarded || 0], aTint: it.tint });
    // the roof: parapet, air handlers, now and then a water tank
    S._o.copy(p); S._o.y = p.y + 24 * sy;
    m.compose(S._o, q, S._s.set(it.s, it.s, it.s));
    const dark = [it.tint[0] * 0.42, it.tint[1] * 0.42, it.tint[2] * 0.45];
    S.layers[it.seed > 0.62 ? 'roofTank' : 'roofKit'].add(m, { aTint: dark });
    // shops along the street on the blocks that front it
    if (Math.abs(it.x) < 34 && !it.noShop) {
      m.compose(p, q, S._s.set(it.s, Math.min(1.2, Math.max(0.85, sy)), it.s));
      S.layers.store.add(m, { aWake: [0.25 + 0.75 * it.wakeNow, (it.seed * 7.31) % 1, 0] });
      const awn = it.seed * 13.7 % 1;
      S.layers.awning.add(m, { aTint: col([0x8a2030, 0x204a6a, 0x2a5a3a, 0x6a4a20][Math.floor(awn * 4)]) });
    }
  },
  tower(S, it, p, q, yaw) {
    const m = S._m, sy = it.sy ?? it.s; m.compose(p, q, S._s.set(it.s, sy, it.s)); S.layers.tower.add(m, { aWake: [it.wakeNow, it.seed, it.boarded || 0], aTint: it.tint });
    // a stepped crown and a mast with the aircraft light at the top
    S._o.copy(p); S._o.y = p.y + 64 * sy;
    m.compose(S._o, q, S._s.set(it.s, it.s, it.s));
    S.layers.towerTop.add(m, { aTint: [it.tint[0] * 0.5, it.tint[1] * 0.5, it.tint[2] * 0.55] });
    glowAt(S, p.x, 64 * sy + 23 * it.s, p.z, 3.4, [1, 0.08, 0.08], 1.7, 1);
  },
  shop(S, it, p, q, yaw) {
    const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.shop.add(m, { aWake: [it.wakeNow, it.seed, it.boarded || 0], aTint: it.tint });
    if (it.idx !== undefined) {
      const w = local(p, yaw, 0, 6.4 * it.s, 5.2 * it.s, S._o);
      m.compose(w, q, S._s.set(0.9 * it.s, 0.9 * it.s, 1)); S.layers.sign.add(m, { aIdx: it.idx, aWake: [0.4 + 0.6 * it.wakeNow, 0] });
    }
  },
  motel(S, it, p, q, yaw) {
    const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.motel.add(m, { aWake: [it.wakeNow, it.seed, it.boarded || 0], aTint: it.tint });
    // tall sign by the road
    const fq = faceQ(S, it);
    const w = local(p, yaw, -24 * it.s, 0, 10 * it.s, S._o);
    m.compose(w, fq, S._s.set(1.2, 1.4, 1.2)); S.layers.signPole.add(m, { aTint: [0.2, 0.2, 0.25] });
    S.layers.sign.add(m, { aIdx: S.atlas.index.MOTEL, aWake: [0.5 + 0.5 * it.wakeNow, 0] });
    const w2 = local(p, yaw, -24 * it.s, -3.4, 10 * it.s, S._o);
    m.compose(w2, fq, S._s.set(0.9, 0.9, 1)); S.layers.sign.add(m, { aIdx: it.wakeNow > 0.5 ? S.atlas.index.VACANCY : S.atlas.index.NOVAC, aWake: [0.4 + 0.6 * it.wakeNow, 0] });
    // door lights along the walkway
    for (let k = -4; k <= 4; k++) { const d = local(p, yaw, k * 4.6 * it.s, 5.6 * it.s, 4.7 * it.s, S._o); glowAt(S, d.x, d.y, d.z, 1.3, col(S.P.window), 0.4 + 0.9 * it.wakeNow); }
  },
  station(S, it, p, q, yaw) {
    const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.canopy.add(m, { aTint: [0.85, 0.85, 0.9] }); S.layers.canopyLight.add(m, {});
    const w = local(p, yaw, 13, 0, 4, S._o); m.compose(w, faceQ(S, it), S._s.set(0.9, 1, 0.9)); S.layers.signPole.add(m, { aTint: [0.2, 0.2, 0.25] });
    S.layers.sign.add(m, { aIdx: S.atlas.index.GAS, aWake: [0.6 + 0.4 * it.wakeNow, 0] });
    const sh = local(p, yaw, 0, 0, -12, S._o); m.compose(sh, q, S._s.set(0.8, 0.9, 0.8)); S.layers.shop.add(m, { aWake: [0.4 + 0.6 * it.wakeNow, it.seed, 0], aTint: [0.9, 0.9, 0.95] });
  },
  tree(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s * (it.sy ?? 1), it.s)); S.layers[it.pine ? 'pine' : 'tree'].add(m, { aTint: it.tint }); },
  lamp(S, it, p, q, yaw) {
    const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.lamp.add(m, { aTint: [0.25, 0.24, 0.3] });
    const k = it.dim ?? 1;
    const w = local(p, yaw, 0, 7.75, 2.1, S._o); glowAt(S, w.x, w.y, w.z, 3.6, col(S.P.lamp), (0.55 + 0.9 * it.wakeNow) * k, S.beatLamps ? 4 : 0);
    poolAt(S, w.x, p.y + 0.06, w.z, 13, col(S.P.lamp), (0.35 + 0.8 * it.wakeNow) * k);
  },
  hwLamp(S, it, p, q, yaw) {
    const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.hwLamp.add(m, { aTint: [0.3, 0.3, 0.34] });
    for (const z of [-2.9, 2.9]) { const w = local(p, yaw, 0, 12.6, z, S._o); glowAt(S, w.x, w.y, w.z, 4.6, col(S.P.street), 0.6 + 0.9 * it.wakeNow); poolAt(S, w.x, p.y + 0.07, w.z, 20, col(S.P.street), 0.3 + 0.7 * it.wakeNow); }
  },
  billboard(S, it, p, q) {
    if (S.floorFn && it.floor) p.y = S.floorFn(it.t, it.x);
    const fq = faceQ(S, it);
    const m = S._m; m.compose(p, fq, S._s.set(it.s, it.s, it.s)); S.layers.billboard.add(m, { aTint: [0.18, 0.16, 0.22] });
    S.layers.board.add(m, { aIdx: it.idx, aWake: [it.keepLit ? 1 : 0.3 + 0.7 * it.wakeNow, 0] });
    // two spotlights under the board
    const by = new THREE.Euler().setFromQuaternion(fq, 'YXZ').y;
    for (const x of [-4, 4]) { const w = local(p, by, x * it.s, 10.6 * it.s, 1.2 * it.s, S._o); glowAt(S, w.x, w.y, w.z, 2.2 * it.s, [1, 0.95, 0.85], 0.9); }
  },
  sign(S, it, p, q) {
    if (S.floorFn && it.floor) p.y = S.floorFn(it.t, it.x);
    const m = S._m; m.compose(p, faceQ(S, it), S._s.set(it.s, it.s, it.s));
    S.layers.signPole.add(m, { aTint: [0.2, 0.2, 0.25] });
    S.layers.sign.add(m, { aIdx: it.idx, aWake: [0.35 + 0.65 * it.wakeNow, 0] });
  },
  overpass(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.overpass.add(m, { aTint: it.tint }); },
  water(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(it.s, it.s, it.s)); S.layers.water.add(m, { aTint: it.tint }); glowAt(S, p.x, 26 * it.s, p.z, 2.5, [1, 0.1, 0.1], 1.3, 1); },
  parked(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, 1)); S.layers.car.add(m, { aTint: it.tint }); },
  fence(S, it, p, q) { const m = S._m; m.compose(p, q, S._s.set(1, 1, it.s)); S.layers.fence.add(m, { aTint: it.tint }); },
};


// ---------- kits: what a kind of place puts along the road ----------
// The ribbon floats over a street (x = 0). Things face that street from both
// sides, close, so you ride a lit corridor; bigger things stand further back.
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
export const KITS = {
  // pastel houses facing the street, porch lights, fences, driveways, trees; a second row behind
  suburb(S, z, R) {
    for (let t = z.from; t < z.to; t += 0.11) {
      for (const side of [-1, 1]) {
        const rot = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        const r1 = R();
        if (r1 < 0.68) {
          const x = side * (19 + R() * 5);
          const tt = t + R() * 0.05;
          S.items.push({ t: tt, x, rot, s: 0.82 + R() * 0.25, parts: 'house', tint: col(pick(R, PASTEL)), roofTint: col(pick(R, [0x2a2030, 0x30243a, 0x22202c])), seed: R(), wake0: 0.32, porch: true });
          S.items.push({ t: tt, x: x - side * 5.2, rot: 0, s: 1.25, parts: 'fence', tint: col(0xf2eef0) });
          if (R() < 0.5) S.items.push({ t: tt + 0.05, x: x - side * 1.5, rot: rot + Math.PI / 2 + (R() - 0.5) * 0.15, parts: 'parked', tint: col(pick(R, PASTEL)) });
        } else if (r1 < 0.9) S.items.push({ t, x: side * (16 + R() * 6), s: 0.7 + R() * 0.4, parts: 'tree', tint: col(pick(R, [0x1c3a32, 0x223a2a, 0x2a2440])), seed: R() });
        // second row
        if (R() < 0.55) S.items.push({ t: t + R() * 0.1, x: side * (38 + R() * 14), rot, s: 0.85 + R() * 0.3, parts: 'house', tint: col(pick(R, PASTEL)), roofTint: col(0x2a2030), seed: R(), wake0: 0.3 });
        if (R() < 0.3) S.items.push({ t, x: side * (58 + R() * 60), s: 0.8 + R() * 0.6, parts: 'tree', tint: col(0x182c28), pine: R() < 0.4, seed: R() });
      }
      if ((Math.round(t / 0.11)) % 3 === 0) for (const side of [-1, 1]) S.items.push({ t, x: side * (z.lampX ?? 8.5), rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R() });
    }
    if (z.water) S.items.push({ t: z.from + (z.to - z.from) * 0.45, x: -64, s: 1.2, parts: 'water', tint: col(0xd8d0e0), seed: R() });
  },
  // the highway's lamps (the road and traffic come from plan.roads)
  highway(S, z, R) {
    for (let t = z.from; t < z.to; t += 0.6) S.items.push({ t, x: z.x, rot: Math.PI / 2, parts: 'hwLamp', seed: R() });
  },
  // the strip: motels, diners, gas, liquor; parking out front
  strip(S, z, R) {
    const order = ['motel', 'shop', 'station', 'shop', 'shop', 'motel', 'shop', 'shop', 'station'];
    const shopSigns = ['DINER', 'LIQUOR', 'BAR', 'OPEN', 'TOWING', 'CHAPEL', 'KISS', 'FLOWERS', 'BODYSHOP'];
    let k = 0;
    for (const side of [-1, 1]) {
      for (let t = z.from + (side > 0 ? 0 : 0.5); t < z.to; t += 0.85 + R() * 0.55) {
        const kind = order[k++ % order.length];
        const x = side * (kind === 'motel' ? 30 : 25 + R() * 4);
        const rot = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (kind === 'shop') S.items.push({ t, x, rot, s: 1, parts: 'shop', tint: col(pick(R, PASTEL)), seed: R(), idx: S.atlas.index[pick(R, shopSigns)], wake0: 0.3 });
        else S.items.push({ t, x, rot, s: 1, parts: kind, tint: col(pick(R, PASTEL)), seed: R(), wake0: 0.3 });
        for (let c = 0; c < 3; c++) if (R() < 0.55) S.items.push({ t: t + (R() - 0.5) * 0.35, x: x - side * (10 + R() * 3), rot: rot + (R() - 0.5) * 0.25, parts: 'parked', tint: col(pick(R, PASTEL)) });
        if (R() < 0.3) S.items.push({ t: t + 0.3, x: side * 18, s: 1, parts: 'sign', idx: S.atlas.index[pick(R, shopSigns)], seed: R(), wake0: 0.3 });
      }
    }
    for (let t = z.from; t < z.to; t += 0.33) {
      for (const side of [-1, 1]) S.items.push({ t, x: side * 15.5, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R() });
      if (R() < 0.5) S.items.push({ t, x: (R() < 0.5 ? -1 : 1) * (52 + R() * 60), s: 0.7 + R() * 0.6, parts: R() < 0.5 ? 'tree' : 'block', sy: 0.3 + R() * 0.4, tint: col(R() < 0.5 ? 0x182c28 : 0x8d86a6), seed: R(), wake0: 0.25 });
    }
  },
  // city: a canyon of blocks right on the street, towers behind
  city(S, z, R) {
    const greys = [0x9a92b4, 0xb3a7c2, 0x8f9ab4, 0xa898ae, 0xc0b4cc];
    for (const side of [-1, 1]) {
      for (let t = z.from; t < z.to; t += 0.3 + R() * 0.25) {
        S.items.push({ t, x: side * (24 + R() * 6), rot: (side > 0 ? Math.PI / 2 : -Math.PI / 2) + (R() - 0.5) * 0.06, s: 0.85 + R() * 0.35, sy: 0.45 + R() * 1.0, parts: 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.35 });
        if (R() < 0.6) S.items.push({ t: t + R() * 0.2, x: side * (55 + R() * 120), rot: R() * 0.4, s: 0.8 + R() * 0.5, sy: 0.6 + R() * 1.4, parts: R() < 0.5 ? 'tower' : 'block', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.3 });
        if (R() < 0.12 && !z.dark) S.items.push({ t, x: side * 18, s: 1, parts: 'sign', idx: S.atlas.index[pick(R, ['HOTEL', 'BAR', 'ER', 'OPEN', 'KISS', 'FLOWERS'])], seed: R(), wake0: 0.35 });
      }
    }
    for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * 15.5, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R(), dim: z.dark ? 0.3 : 1 });
  },
  // downtown: towers close in
  downtown(S, z, R) {
    const greys = [0x7d779c, 0x958aaa, 0x6f7c9c, 0x8a7c9e];
    for (const side of [-1, 1]) {
      for (let t = z.from; t < z.to; t += 0.32 + R() * 0.2) {
        S.items.push({ t, x: side * (28 + R() * 10), rot: (side > 0 ? Math.PI / 2 : -Math.PI / 2), s: 0.9 + R() * 0.3, sy: 0.7 + R() * 1.8, parts: 'tower', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.35 });
        if (R() < 0.7) S.items.push({ t: t + R() * 0.2, x: side * (60 + R() * 100), rot: R() * 0.4, s: 0.9 + R() * 0.4, sy: 1 + R() * 1.8, parts: 'tower', tint: col(pick(R, greys)), seed: R(), wake0: z.wake0 ?? 0.3 });
      }
    }
    for (let t = z.from; t < z.to; t += 0.3) for (const side of [-1, 1]) S.items.push({ t, x: side * 15.5, rot: side > 0 ? Math.PI / 2 : -Math.PI / 2, parts: 'lamp', seed: R(), dim: z.dark ? 0.3 : 1 });
  },
};

// a ground road: asphalt that looks wet, painted lanes, curbs and sidewalks,
// lamp light streaking toward you in the wet
class Road {
  constructor(scene, course, r, P) {
    this.r = r; this.course = course;
    const N = 200, M = 2;
    this.N = N;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * (M + 1) * 3);
    this.uv = new Float32Array(N * (M + 1) * 2);
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    const total = (r.width ?? 22) + 2 * (r.walk ?? 0);
    this.total = total;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uFog: { value: new THREE.Color(P.fog) }, uFogDensity: { value: P.fogDensity }, uCam: { value: new THREE.Vector3() },
        uLamp: { value: new THREE.Color(r.lampColor ?? P.street) }, uSky: { value: new THREE.Color(P.horizon) },
        uW: { value: r.width ?? 22 }, uWalk: { value: r.walk ?? 0 }, uTotal: { value: total }, uLanes: { value: r.laneLines ?? 1 },
        uLampEvery: { value: r.lampEvery ?? 30 }, uMedian: { value: r.median ? 1 : 0 }, uShade: { value: P.shade ?? 0 }, uSun: { value: new THREE.Color(P.moon ?? 0xffffff) }, uSnow: { value: P.snowGround ?? 0 }, uDry: { value: r.dry ? 1 : 0 },
      },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uFog, uCam, uLamp, uSky, uSun; uniform float uFogDensity, uW, uWalk, uTotal, uLanes, uLampEvery, uMedian, uShade, uSnow, uDry;
        varying vec2 vUv; varying vec3 vW;
        float aa(float d, float w){ float f = fwidth(d); return 1.0 - smoothstep(w - f, w + f, abs(d)); }
        float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          float x = (vUv.x - 0.5) * uTotal;       // metres across
          float along = vUv.y;                    // metres along, fixed to the world
          float ax = abs(x);
          vec3 V = normalize(uCam - vW);
          float grazing = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
          vec3 col;
          if (ax > uW * 0.5) {
            // sidewalk: pale concrete slabs with joints, a curb at the edge
            float joint = aa(fract(along / 3.0) - 0.5, 0.01) * 0.25;
            col = vec3(0.075, 0.07, 0.085) * (0.85 + 0.3 * h2(floor(vec2(along / 3.0, x))));
            col *= 1.0 - joint;
            col += vec3(0.12) * aa(ax - uW * 0.5 - 0.15, 0.12);
          } else {
            col = vec3(0.022, 0.021, 0.028) * (0.85 + 0.3 * h2(floor(vW.xz * 1.7)));
            // wet: the sky in it at a grazing angle, and lamp light streaking toward you
            col += uSky * grazing * 0.18;
            float d = mod(along, uLampEvery) - uLampEvery * 0.5;
            float side = 1.0 - smoothstep(uW * 0.3, uW * 0.55, ax);
            float streak = exp(-d * d / (2.0 + 50.0 * grazing)) * exp(-pow(ax - uW * 0.42, 2.0) / 6.0);
            col += uLamp * (streak * 0.55 * (0.3 + grazing) + exp(-d * d / 90.0) * 0.06) * side;
            // paint
            float dash = step(fract(along / 9.0), 0.42);
            for (int k = 1; k <= 3; k++) { if (float(k) > uLanes) break; float lx = uW * 0.5 * float(k) / (uLanes + 1.0); col += vec3(0.8) * aa(ax - lx, 0.07) * dash * 0.45 * step(0.5, uLanes); }
            col += vec3(0.85) * aa(ax - uW * 0.5 + 0.35, 0.09) * 0.4;
            col += vec3(1.0, 0.72, 0.18) * (aa(x - 0.17, 0.055) + aa(x + 0.17, 0.055)) * 0.42 * uMedian;
          }
          // by day: dry asphalt and pale concrete, the sun lying across it in bands between the buildings
          if (uDry > 0.5) col = col * 3.2 + vec3(0.05, 0.05, 0.055);
          col = mix(col, vec3(0.62, 0.66, 0.74) * (0.9 + 0.2 * h2(floor(vW.xz * 0.7))), uSnow * 0.45 * step(uW * 0.5, ax));
          if (uShade > 0.001) {
            float bandId = floor(along / 26.0), bandF = fract(along / 26.0);
            float gap = 0.25 + 0.5 * h2(vec2(bandId, 1.7));
            float sunny = smoothstep(0.0, 0.04, bandF - (1.0 - gap)) * smoothstep(1.0, 0.96, bandF);
            col *= mix(1.0, 0.55 + 0.9 * sunny, uShade);
            col += uSun * sunny * 0.05 * uShade;
          }
          float dd = length(uCam - vW);
          float fog = 1.0 - exp(-pow(dd * uFogDensity, 1.5));
          gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -2;
    scene.add(this.mesh);
    this._p = new THREE.Vector3();
  }
  update(track, rider) {
    const t0 = rider.t - 3, t1 = rider.t + 36, N = this.N, r = this.r;
    const iR = Math.round((rider.t - t0) / (t1 - t0) * (N - 1));
    const w = this.total;
    const cum = this._cum || (this._cum = new Float32Array(N));
    let last = null;
    for (let i = 0; i < N; i++) {
      const t = t0 + (t1 - t0) * (i / (N - 1));
      const visible = t >= (r.from ?? -1e9) && t <= (r.to ?? 1e9);
      for (let j = 0; j <= 2; j++) {
        const x = r.x + (j - 1) * w * 0.5;
        track.ground(t, x, this._p);
        const o = (i * 3 + j) * 3;
        this.pos[o] = this._p.x; this.pos[o + 1] = visible ? (r.y ?? 0.04) : -60; this.pos[o + 2] = this._p.z;
        this.uv[(i * 3 + j) * 2] = j / 2;
      }
      const cx = this.pos[(i * 3 + 1) * 3], cz = this.pos[(i * 3 + 1) * 3 + 2];
      cum[i] = last ? cum[i - 1] + Math.hypot(cx - last[0], cz - last[1]) : 0;
      last = [cx, cz];
    }
    const base = rider.stats.dist - cum[iR];
    for (let i = 0; i < N; i++) for (let j = 0; j <= 2; j++) this.uv[(i * 3 + j) * 2 + 1] = cum[i] + base;
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
  }
}
