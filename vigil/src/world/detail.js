// Nonblocking field dressing.  Everything here is intentionally below capsule
// scale and declared decor, so the open combat lanes and analytic collision
// model remain exactly as authored while the outer field gains material history.

import * as THREE from 'three';
import { TAU } from '../engine/math.js';
import { createMetalSurface } from '../gfx/surfaces.js';

function fillInstances(mesh, count, rng, terrainHeight, configure, sectors) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const bands = Math.ceil(count / sectors);
  for (let i = 0; i < count; i++) {
    // Stratified sectors prevent the old random kilometre-wide dead patches,
    // while a golden band offset keeps the dressing from forming spokes.
    const band = Math.floor(i / sectors);
    const a = ((i % sectors) + band * 0.381966 + 0.16 + rng.next() * 0.68) / sectors * TAU;
    const u = (band + 0.2 + rng.next() * 0.6) / bands;
    const r = 30 + Math.sqrt(u) * 49;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const lift = configure(i, e, s, rng);
    p.set(x, terrainHeight(x, z) + (lift ?? s.y * 0.12), z);
    m.compose(p, q.setFromEuler(e), s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere?.();
}

export function buildFieldDetail(rng, terrainHeight, place) {
  const group = new THREE.Group();
  group.name = 'field-detail';

  const pebbles = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.62, 0),
    new THREE.MeshStandardMaterial({ color: 0x6a7888, roughness: 0.96, metalness: 0.03, flatShading: true }),
    260,
  );
  fillInstances(pebbles, 260, rng, terrainHeight, (i, e, s, rr) => {
    const k = 0.34 + Math.pow(rr.next(), 1.65) * 0.76;
    e.set(rr.next() * TAU, rr.next() * TAU, rr.next() * TAU);
    s.set(k * (0.76 + rr.next() * 0.44), k * (0.48 + rr.next() * 0.38), k);
    return 0.06 + k * 0.08;
  }, 28);
  pebbles.receiveShadow = true;
  group.add(pebbles);

  const splinters = new THREE.InstancedMesh(
    new THREE.TetrahedronGeometry(0.76, 0),
    new THREE.MeshStandardMaterial({ color: 0x46586c, roughness: 0.86, metalness: 0.10, flatShading: true }),
    88,
  );
  fillInstances(splinters, 88, rng, terrainHeight, (i, e, s, rr) => {
    const k = 0.40 + rr.next() * 0.66;
    e.set((rr.next() - 0.5) * 0.75, rr.next() * TAU, (rr.next() - 0.5) * 0.62);
    s.set(k * 0.42, k * (0.62 + rr.next() * 0.72), k * (1.05 + rr.next() * 1.22));
    return 0.09 + k * 0.10;
  }, 22);
  splinters.receiveShadow = true;
  group.add(splinters);

  const metal = createMetalSurface(0x5a7e11);
  const scrapMat = new THREE.MeshStandardMaterial({
    color: 0x58738a,
    map: metal.color,
    bumpMap: metal.bump,
    bumpScale: 0.055,
    roughnessMap: metal.roughness,
    roughness: 0.66,
    metalness: 0.62,
    emissive: 0x071722,
    emissiveIntensity: 0.20,
    envMapIntensity: 0.95,
  });
  const scrap = new THREE.InstancedMesh(new THREE.BoxGeometry(1.08, 0.09, 0.29), scrapMat, 52);
  fillInstances(scrap, 52, rng, terrainHeight, (i, e, s, rr) => {
    const k = 0.48 + rr.next() * 0.58;
    const upright = i % 5 === 0;
    e.set(
      (rr.next() - 0.5) * (upright ? 0.45 : 0.28),
      rr.next() * TAU,
      upright ? (rr.next() < 0.5 ? -1 : 1) * (0.52 + rr.next() * 0.30) : (rr.next() - 0.5) * 0.28,
    );
    s.set(k * (1.05 + rr.next() * 0.82), k, k * (0.74 + rr.next() * 0.38));
    return upright ? 0.28 + k * 0.18 : 0.09;
  }, 18);
  scrap.receiveShadow = true;
  group.add(scrap);

  place({ kind: 'field-detail', decor: true });
  return group;
}
