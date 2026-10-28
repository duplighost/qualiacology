// Set dressing shared by the fortress and the select screen: capellini grass,
// spaghetti willows, campanelle, farfalle. (The meadow builds its own in flora.js.)
import * as THREE from 'three';
import * as Shapes from './shapes.js';
import { mulberry32, makeNoise2D, clamp, TAU } from './util.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
let tuftA = null, tuftB = null;

// spots: [[x, y, z], ...] where y is the surface height
export function scatterGrass(scene, K, spots, seed = 1) {
  const rnd = mulberry32(seed);
  tuftA = tuftA || Shapes.grassTuft({ strands: 6, height: 0.5, radius: 0.012, spread: 0.13, seed: 3 });
  tuftB = tuftB || Shapes.grassTuft({ strands: 5, height: 0.36, radius: 0.011, spread: 0.1, seed: 9 });
  const tints = [[new THREE.Color('#5f8030'), new THREE.Color('#a9c262')], [new THREE.Color('#d9b064'), new THREE.Color('#f8e0a0')]];
  const chunks = new Map();
  for (const s of spots) {
    const key = Math.floor(s[0] / 14) + ',' + Math.floor(s[2] / 14);
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(s);
  }
  for (const list of chunks.values()) {
    const green = [], gold = [];
    for (const s of list) (rnd() < 0.72 ? green : gold).push(s);
    for (const [arr, mat, geo, ti] of [[green, K.grass, tuftA, 0], [gold, K.grassGold, tuftB, 1]]) {
      if (!arr.length) continue;
      const im = new THREE.InstancedMesh(geo, mat, arr.length);
      arr.forEach((s, i) => {
        _e.set((rnd() - 0.5) * 0.25, rnd() * TAU, (rnd() - 0.5) * 0.25); _q.setFromEuler(_e);
        const sc = 0.65 + rnd() * 0.8;
        _m.compose(_p.set(s[0], s[1] - 0.02, s[2]), _q, _s.set(sc, sc * (0.8 + rnd() * 0.5), sc));
        im.setMatrixAt(i, _m);
        im.setColorAt(i, tints[ti][0].clone().lerp(tints[ti][1], rnd()));
      });
      im.receiveShadow = true;
      im.computeBoundingSphere();
      scene.add(im);
    }
  }
}

// grass over rectangles: tops = [{x, z, w, d, y, density}]
export function grassOnTops(scene, K, tops, seed = 5, skip = null) {
  const rnd = mulberry32(seed), noise = makeNoise2D(seed + 17);
  const spots = [];
  for (const t of tops) {
    const n = Math.round(t.w * t.d * (t.density ?? 0.35));
    for (let i = 0; i < n; i++) {
      const x = t.x + (rnd() - 0.5) * (t.w - 1.2), z = t.z + (rnd() - 0.5) * (t.d - 1.2);
      if (skip && skip(x, z)) continue;
      if ((noise(x * 0.15, z * 0.15) * 0.5 + 0.55) > rnd()) spots.push([x, t.y, z]);
    }
  }
  scatterGrass(scene, K, spots, seed);
}

export function addWillow(scene, K, col, x, y, z, { seed = 1, scale = 1, collide = true } = {}) {
  const rnd = mulberry32(seed);
  const len = (5.0 + rnd() * 1.2) * scale;
  const trunk = new THREE.Mesh(Shapes.rodBundle({ count: 46, length: len, rodRadius: 0.04 * scale, bundleRadius: 0.38 * scale, twist: 0.7, flareBottom: 0.7, flareTop: 1.1, seed: seed * 7 + 1 }), K.wheat);
  trunk.position.set(x, y - 0.05, z); trunk.castShadow = true; trunk.receiveShadow = true;
  scene.add(trunk);
  const canopy = new THREE.Mesh(Shapes.willowCanopy({ count: Math.round(200 * Math.max(0.5, scale)), topRadius: 0.55 * scale, spread: 2.7 * scale, length: len - 0.4 * scale, strandRadius: 0.032 * Math.max(0.6, scale), seed: seed * 13 + 5 }), K.verdeStrand);
  canopy.position.set(x, y + len - 0.15 * scale, z); canopy.castShadow = true; canopy.receiveShadow = true;
  scene.add(canopy);
  if (collide && col) col.add({ type: 'cyl', x, z, r: 0.42 * scale, y0: y - 1, y1: y + len, surface: 'dry', sticky: false });
}

// patches: [[x, z, y, radius]]
export function addFlowers(scene, K, patches, seed = 3) {
  const rnd = mulberry32(seed);
  const bell = Shapes.campanella({ size: 0.3 });
  const stemGeo = Shapes.tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 0.5, 0), new THREE.Vector3(0.06, 1, 0)], { radius: 0.014, radialSegments: 5 });
  const flowers = [];
  for (const [px, pz, py, pr] of patches) {
    const n = 6 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, r = rnd() * (pr ?? 2);
      flowers.push({ x: px + Math.cos(a) * r, y: py, z: pz + Math.sin(a) * r, h: 0.35 + rnd() * 0.45, c: Math.floor(rnd() * 4), tilt: 0.3 + rnd() * 0.7, yaw: rnd() * TAU });
    }
  }
  if (!flowers.length) return;
  const mats = [K.tomato, K.beet, K.turmeric, K.cookedStrand];
  const counts = [0, 0, 0, 0]; for (const f of flowers) counts[f.c]++;
  const ims = mats.map((m, i) => { const im = new THREE.InstancedMesh(bell, m, Math.max(1, counts[i])); im.count = 0; im.castShadow = true; im.receiveShadow = true; scene.add(im); return im; });
  const stems = new THREE.InstancedMesh(stemGeo, K.grass, flowers.length);
  const c = new THREE.Color();
  flowers.forEach((f, i) => {
    _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.yaw);
    _m.compose(_p.set(f.x, f.y - 0.02, f.z), _q, _s.set(1, f.h, 1));
    stems.setMatrixAt(i, _m);
    stems.setColorAt(i, c.set('#6f9238').lerp(new THREE.Color('#9dbb5c'), rnd()));
    const top = new THREE.Vector3(0.06, f.h, 0).applyQuaternion(_q).add(_p);
    _e.set(0, f.yaw, -f.tilt, 'YXZ'); _q.setFromEuler(_e);
    _m.compose(top, _q, _s.setScalar(0.9 + rnd() * 0.4));
    const im = ims[f.c]; im.setMatrixAt(im.count++, _m);
  });
  stems.receiveShadow = true; scene.add(stems);
  for (const im of ims) im.instanceMatrix.needsUpdate = true;
}

// farfalle fluttering around homes: [[x, y, z]]; they scatter from the hero
export function addButterflies(scene, K, col, homes, count = 12, seed = 9) {
  const rnd = mulberry32(seed), noise = makeNoise2D(seed + 3);
  const geo = Shapes.farfalle({ width: 0.62, height: 0.38, thickness: 0.02 });
  const bf = new THREE.InstancedMesh(geo, K.butterfly, count);
  bf.castShadow = true; bf.frustumCulled = false;
  const palette = ['#d4566e', '#e8793f', '#86a84c', '#f2cf7f', '#f2b52c', '#2c2b2e'].map(c => new THREE.Color(c));
  const flies = [];
  for (let i = 0; i < count; i++) {
    const h = homes[i % homes.length];
    const home = new THREE.Vector3(h[0], h[1], h[2]);
    flies.push({ p: home.clone().add(new THREE.Vector3((rnd() - 0.5) * 3, rnd(), (rnd() - 0.5) * 3)), v: new THREE.Vector3(), home, seed: rnd() * 100 });
    bf.setColorAt(i, palette[i % palette.length]);
  }
  bf.instanceColor.needsUpdate = true;
  scene.add(bf);
  const tmp = new THREE.Vector3();
  return {
    update(dt, time, hero) {
      for (let i = 0; i < count; i++) {
        const f = flies[i], t = time * 0.7 + f.seed;
        tmp.subVectors(f.home, f.p).multiplyScalar(0.9);
        f.v.x += (noise(t, f.seed) * 4 + tmp.x) * dt * 1.5; f.v.y += (noise(f.seed, t * 1.3) * 2.5 + tmp.y * 1.4) * dt * 1.5; f.v.z += (noise(t + 50, f.seed + 9) * 4 + tmp.z) * dt * 1.5;
        const dh = f.p.distanceTo(hero.pos);
        if (dh < 3.2) { tmp.subVectors(f.p, hero.pos).normalize(); f.v.addScaledVector(tmp, (3.2 - dh) * 6 * dt); f.v.y += 4 * dt; }
        const sp = f.v.length(), max = dh < 3.2 ? 4.5 : 1.6;
        if (sp > max) f.v.multiplyScalar(max / sp);
        f.p.addScaledVector(f.v, dt);
        if (col) { const floor = col.floorBelow(f.p.x, f.p.y + 1, f.p.z, 4) + 0.35; if (f.p.y < floor) { f.p.y = floor; f.v.y = Math.abs(f.v.y); } }
        _e.set(-Math.PI / 2 + clamp(-f.v.y * 0.3, -0.5, 0.5), Math.atan2(f.v.x, f.v.z), Math.sin(t * 3) * 0.2, 'YXZ');
        _q.setFromEuler(_e);
        _m.compose(f.p, _q, _s.setScalar(1));
        bf.setMatrixAt(i, _m);
      }
      bf.instanceMatrix.needsUpdate = true;
    },
  };
}
