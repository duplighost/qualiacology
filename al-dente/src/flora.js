// Living pasta: capellini grass, campanelle flowers, spaghetti willows, farfalle, dry penne lying about.
import * as THREE from 'three';
import * as Shapes from './shapes.js';
import { mulberry32, makeNoise2D, clamp, lerp, TAU, smoothstep } from './util.js';
import { SEA, meadowH } from './world.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

export function buildFlora(scene, K, W) {
  const rnd = mulberry32(2024);
  const noise = makeNoise2D(31);
  const col = W.colliders;
  const F = {};

  // ---------------------------------------------------------------- grass, in culled chunks
  const tuftG = Shapes.grassTuft({ strands: 6, height: 0.5, radius: 0.012, spread: 0.13, seed: 3 });
  const tuftG2 = Shapes.grassTuft({ strands: 5, height: 0.36, radius: 0.011, spread: 0.1, seed: 9 });
  const spots = [];
  const tryGrass = (x, z, y, dens) => { if (rnd() < dens) spots.push([x, y, z]); };
  // meadow
  for (let i = 0; i < 26000 && spots.length < 4200; i++) {
    const x = (rnd() - 0.5) * 100, z = 16 + rnd() * 78;
    const h = meadowH(x, z);
    if (h < SEA + 0.5) continue;
    const clump = smoothstep(-0.25, 0.5, noise(x * 0.09, z * 0.09));
    const path = smoothstep(1.2, 3.5, Math.abs(x - Math.sin(z * 0.08) * 2.5)) * 0.65 + 0.35; // a faint worn line toward the wall
    tryGrass(x, z, h, clump * path * 0.95);
  }
  // plateau tops: sparse clumps
  for (const t of W.tops) {
    if (t.id === 'chimneyFloor' || t.id === 'cliffB') continue;
    const n = Math.round(t.w * t.d * 0.35);
    for (let i = 0; i < n; i++) {
      const x = t.x + (rnd() - 0.5) * (t.w - 1.6), z = t.z + (rnd() - 0.5) * (t.d - 1.6);
      if (smoothstep(-0.1, 0.5, noise(x * 0.15 + 40, z * 0.15)) > rnd()) spots.push([x, t.y, z]);
    }
  }
  const CH = 14;
  const chunks = new Map();
  for (const s of spots) {
    const key = Math.floor(s[0] / CH) + ',' + Math.floor(s[2] / CH);
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(s);
  }
  for (const list of chunks.values()) {
    const green = list.filter(() => rnd() < 0.72), gold = list.filter(s => !green.includes(s));
    const tints = [[new THREE.Color('#5f8030'), new THREE.Color('#a9c262')], [new THREE.Color('#d9b064'), new THREE.Color('#f8e0a0')]];
    for (const [arr, mat, geo, ti] of [[green, K.grass, tuftG, 0], [gold, K.grassGold, tuftG2, 1]]) {
      if (!arr.length) continue;
      const im = new THREE.InstancedMesh(geo, mat, arr.length);
      arr.forEach((s, i) => {
        _e.set((rnd() - 0.5) * 0.25, rnd() * TAU, (rnd() - 0.5) * 0.25); _q.setFromEuler(_e);
        const sc = 0.65 + rnd() * 0.8;
        _m.compose(_p.set(s[0], s[1] - 0.02, s[2]), _q, _s.set(sc, sc * (0.8 + rnd() * 0.5), sc));
        im.setMatrixAt(i, _m);
        im.setColorAt(i, tints[ti][0].clone().lerp(tints[ti][1], rnd()));
      });
      im.receiveShadow = true; im.castShadow = false;
      im.computeBoundingSphere();
      scene.add(im);
    }
  }

  // ---------------------------------------------------------------- campanelle flowers on capellini stems
  const bell = Shapes.campanella({ size: 0.3 });
  const patches = [[-6, 41], [9, 50], [-15, 31], [5, 29], [-19, 60], [20, 55], [-3, 66], [6, 6], [-12, 10], [4, -25], [-6, -31], [19, -55]];
  const flowers = [];
  for (const [px, pz] of patches) {
    const n = 7 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, r = rnd() * 2.4;
      const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
      const y = col.floorBelow(x, 40, z);
      if (y < SEA + 0.4) continue;
      flowers.push({ x, y, z, h: 0.35 + rnd() * 0.45, c: Math.floor(rnd() * 4), tilt: 0.3 + rnd() * 0.7, yaw: rnd() * TAU });
    }
  }
  const bellMats = [K.tomato, K.beet, K.turmeric, K.cookedStrand];
  const stemGeo = Shapes.tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 0.5, 0), new THREE.Vector3(0.06, 1, 0)], { radius: 0.014, radialSegments: 5 });
  const stemIM = new THREE.InstancedMesh(stemGeo, K.grass, flowers.length);
  const counts = [0, 0, 0, 0];
  for (const f of flowers) counts[f.c]++;
  const bellIMs = bellMats.map((m, i) => { const im = new THREE.InstancedMesh(bell, m, Math.max(1, counts[i])); im.count = 0; im.castShadow = true; im.receiveShadow = true; scene.add(im); return im; });
  flowers.forEach((f, i) => {
    _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.yaw);
    _m.compose(_p.set(f.x, f.y - 0.02, f.z), _q, _s.set(1, f.h, 1));
    stemIM.setMatrixAt(i, _m);
    const top = new THREE.Vector3(0.06, f.h, 0).applyQuaternion(_q).add(_p);
    _e.set(0, f.yaw, -f.tilt, 'YXZ'); _q.setFromEuler(_e);
    _m.compose(top, _q, _s.setScalar(0.9 + rnd() * 0.4));
    const im = bellIMs[f.c]; im.setMatrixAt(im.count++, _m);
  });
  const stemC = new THREE.Color();
  for (let i = 0; i < flowers.length; i++) stemIM.setColorAt(i, stemC.set('#6f9238').lerp(new THREE.Color('#9dbb5c'), rnd()));
  stemIM.receiveShadow = true; scene.add(stemIM);
  for (const im of bellIMs) im.instanceMatrix.needsUpdate = true;

  // ---------------------------------------------------------------- spaghetti willows
  const trees = [[-12, 44], [14, 37], [-21, 59], [10, 4], [9, -33], [17, -57]];
  for (const [x, z] of trees) {
    const y = col.floorBelow(x, 40, z);
    const len = 5.2 + rnd() * 1.3;
    const trunk = new THREE.Mesh(Shapes.rodBundle({ count: 46, length: len, rodRadius: 0.04, bundleRadius: 0.38, twist: 0.7, flareBottom: 0.7, flareTop: 1.1, seed: Math.floor(rnd() * 1000) }), K.wheat);
    trunk.position.set(x, y - 0.05, z); trunk.castShadow = true; trunk.receiveShadow = true;
    scene.add(trunk);
    const canopy = new THREE.Mesh(Shapes.willowCanopy({ count: 200, topRadius: 0.55, spread: 2.7, length: len - 0.4, strandRadius: 0.032, seed: Math.floor(rnd() * 1000) }), K.verdeStrand);
    canopy.position.set(x, y + len - 0.15, z); canopy.castShadow = true; canopy.receiveShadow = true;
    scene.add(canopy);
    col.add({ type: 'cyl', x, z, r: 0.42, y0: y - 1, y1: y + len, surface: 'dry', sticky: false });
  }

  // ---------------------------------------------------------------- dry penne lying in the meadow (you can stand on them)
  const penneG = Shapes.penne({ radius: 0.42, length: 2.7, wall: 0.08, ridges: 16 });
  const logs = [[-5, 47, 0.4], [7, 42, 2.2], [-17, 38, 1.1], [16, 49, -0.7], [-3, 33, 1.9]];
  for (const [x, z, a] of logs) {
    const y = meadowH(x, z) + 0.36;
    const m = new THREE.Mesh(penneG, K.dryBig);
    m.position.set(x, y, z); m.rotation.y = a; m.rotation.z = 0.02;
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
    const dx = Math.cos(a) * 1.15, dz = -Math.sin(a) * 1.15;
    col.add({ type: 'capsule', ax: x - dx, ay: y, az: z - dz, bx: x + dx, by: y, bz: z + dz, r: 0.42, surface: 'dry', sticky: false, safe: false });
  }
  // empty snail shells, a few dry farfalle on the ground
  const shellG = Shapes.lumache({ size: 0.8 });
  for (const [x, z, a] of [[-9, 52, 0.5], [11, 33, 2.4], [-2, -36, 1.2]]) {
    const y = col.floorBelow(x, 40, z);
    const m = new THREE.Mesh(shellG, K.dryBig); m.position.set(x, y, z); m.rotation.set(0.15, a, 0.5); m.castShadow = true; scene.add(m);
  }

  // ---------------------------------------------------------------- farfalle
  const fg = Shapes.farfalle({ width: 0.62, height: 0.38, thickness: 0.02 });
  const NB = 26;
  const bf = new THREE.InstancedMesh(fg, K.butterfly, NB);
  bf.castShadow = true; bf.frustumCulled = false;
  const palette = ['#d4566e', '#e8793f', '#86a84c', '#f2cf7f', '#f2b52c', '#2c2b2e'].map(c => new THREE.Color(c));
  const homes = [...patches.slice(0, 8), [24, -52]];
  const flies = [];
  for (let i = 0; i < NB; i++) {
    const h = homes[i % homes.length];
    const hy = col.floorBelow(h[0], 40, h[1]) + (i % homes.length === homes.length - 1 ? 13.5 : 0.9);
    const p = new THREE.Vector3(h[0] + (rnd() - 0.5) * 3, hy + rnd(), h[1] + (rnd() - 0.5) * 3);
    flies.push({ p, v: new THREE.Vector3(), home: new THREE.Vector3(h[0], hy, h[1]), seed: rnd() * 100, flee: 0 });
    bf.setColorAt(i, palette[i % palette.length]);
  }
  bf.instanceColor.needsUpdate = true;
  scene.add(bf);
  const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
  F.update = (dt, time, hero) => {
    for (let i = 0; i < NB; i++) {
      const f = flies[i];
      const t = time * 0.7 + f.seed;
      // wander + home pull
      const wx = noise(t, f.seed) * 4, wy = noise(f.seed, t * 1.3) * 2.5, wz = noise(t + 50, f.seed + 9) * 4;
      tmp.subVectors(f.home, f.p).multiplyScalar(0.9);
      f.v.x += (wx + tmp.x) * dt * 1.5; f.v.y += (wy + tmp.y * 1.4) * dt * 1.5; f.v.z += (wz + tmp.z) * dt * 1.5;
      const dh = f.p.distanceTo(hero.pos);
      if (dh < 3.2) { tmp.subVectors(f.p, hero.pos).normalize(); f.v.addScaledVector(tmp, (3.2 - dh) * 6 * dt); f.v.y += 4 * dt; }
      const sp = f.v.length(), max = dh < 3.2 ? 4.5 : 1.6;
      if (sp > max) f.v.multiplyScalar(max / sp);
      f.p.addScaledVector(f.v, dt);
      const floor = col.floorBelow(f.p.x, f.p.y + 1, f.p.z, 4) + 0.35;
      if (f.p.y < floor) { f.p.y = floor; f.v.y = Math.abs(f.v.y); }
      fwd.copy(f.v); fwd.y = 0;
      const yaw = Math.atan2(fwd.x, fwd.z);
      _e.set(-Math.PI / 2 + clamp(-f.v.y * 0.3, -0.5, 0.5), yaw, Math.sin(t * 3) * 0.2, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(f.p, _q, _s.setScalar(1));
      bf.setMatrixAt(i, _m);
    }
    bf.instanceMatrix.needsUpdate = true;
  };
  return F;
}
