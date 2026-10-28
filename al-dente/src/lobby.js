// The opening screen and the level select are one small place: a round lasagna island in the
// pastina with two nests on pedestals. Close up on the hero for the opening; pull back to choose.
import * as THREE from 'three';
import * as Shapes from './shapes.js';
import { Colliders } from './collide.js';
import { lasagnaStack, addSeaSky, buildHeaps } from './world.js';
import { FX } from './props.js';
import { grassOnTops, addWillow, addFlowers, addButterflies } from './kit.js';
import { mulberry32, TAU } from './util.js';

const TOP = 1.0, PED = 2.3;

export function buildLobby(scene, K, audio) {
  const col = new Colliders(() => -3.0);
  const L = { id: 'lobby', scene, colliders: col, zones: [], supports: [], tube: null };
  const SS = addSeaSky(scene, K); L.skyMat = SS.skyMat;
  buildHeaps(scene, K, { seed: 3, cx0: 0, cz0: -20, turn: 1.9 });
  L.fx = new FX(scene, K, audio);

  const stack = (o, mat, cooked) => {
    const g = lasagnaStack({ w: o.w, d: o.d, y0: o.y0, y1: o.y1, seed: o.seed, rc: o.rc, lh: cooked ? 0.24 : 0.15, bulgeK: cooked ? 1 : 0.3, rufK: cooked ? 1 : 0.45, driftK: cooked ? 1 : 0.5, bands: o.bands, tint: o.tint ?? null });
    const m = new THREE.Mesh(g, mat); m.position.set(o.x, 0, o.z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    col.add({ type: 'box', x: o.x, y: (o.y0 + o.y1) / 2, z: o.z, hx: o.w / 2, hy: (o.y1 - o.y0) / 2, hz: o.d / 2, sticky: cooked, surface: cooked ? 'cooked' : 'dry', safe: true });
  };
  stack({ x: 0, z: 0, w: 15, d: 12.5, y0: -1.4, y1: TOP, seed: 91, rc: 4.8, bands: (L) => (L % 6) === 2 }, K.bed, true);
  // left to right: the meadow (cooked, green bands), the fortress (dry, amber), the bay (cooked, a shell and kelp)
  const nests = [
    { stage: 'meadow', x: -4.5, z: -1.1 },
    { stage: 'fortress', x: 0, z: -3.4 },
    { stage: 'bay', x: 4.5, z: -1.1 },
  ];
  stack({ x: nests[0].x, z: nests[0].z, w: 2.7, d: 2.7, y0: TOP - 0.1, y1: PED, seed: 92, rc: 0.9, bands: (L) => L % 3 === 1 }, K.sheet, true);
  stack({ x: nests[1].x, z: nests[1].z, w: 2.7, d: 2.7, y0: TOP - 0.1, y1: PED, seed: 93, rc: 0.35, tint: new THREE.Color(1, 0.96, 0.88) }, K.dryStack, false);
  stack({ x: nests[2].x, z: nests[2].z, w: 2.7, d: 2.7, y0: TOP - 0.1, y1: PED, seed: 99, rc: 1.0, bands: (L) => L % 4 === 2 }, K.sheet, true);
  const nestG = Shapes.nido({ radius: 0.86, height: 0.42, ribbons: 18, ribbonWidth: 0.1, ribbonThickness: 0.02, seed: 94 });
  const starG = Shapes.stellina({ outerRadius: 0.58, innerRadius: 0.31, thickness: 0.21, points: 5, holeRadius: 0.07 });
  for (const n of nests) {
    const nm = new THREE.Mesh(nestG, K.nest); nm.position.set(n.x, PED - 0.02, n.z); nm.castShadow = true; nm.receiveShadow = true; scene.add(nm);
    n.star = new THREE.Mesh(starG, K.star); n.star.position.set(n.x, PED + 0.72, n.z); n.star.castShadow = true; n.star.visible = false; scene.add(n.star);
    n.y = PED;
  }
  L.nests = nests;
  // a little of each stage on its pedestal
  addWillow(scene, K, null, nests[0].x - 1.6, TOP, nests[0].z - 1.4, { seed: 95, scale: 0.42, collide: false });
  const mini = new THREE.Mesh(Shapes.rigatoniTower({ innerRadius: 0.36, outerRadius: 0.46, height: 2.4, ridges: 24, notch: { angle: Math.PI / 2, halfWidth: 0.5, height: 0.55 } }), K.dryBig);
  mini.position.set(nests[1].x + 1.85, TOP, nests[1].z - 0.9); mini.castShadow = true; mini.receiveShadow = true; scene.add(mini);
  const pen = Shapes.penne({ radius: 0.13, length: 0.6, wall: 0.03 });
  for (const [dx, dz] of [[1.05, 1.0], [-1.05, 1.0], [1.05, -1.0], [-1.05, -1.0]]) {
    const pm = new THREE.Mesh(pen, K.dryBig); pm.position.set(nests[1].x + dx, PED + 0.29, nests[1].z + dz); pm.rotation.z = Math.PI / 2; pm.castShadow = true; scene.add(pm);
  }
  // the bay: a conchiglione on its pedestal and mafaldine kelp beside it
  const shellG = Shapes.conchiglione({ length: 1.15, radius: 0.36, thick: 0.05, rows: 30, cols: 48, ribs: 18 });
  const sh = new THREE.Mesh(shellG, K.shell); sh.position.set(nests[2].x + 0.95, PED + 0.22, nests[2].z + 0.75); sh.rotation.set(0.7, -0.5, 0); sh.castShadow = true; scene.add(sh);
  const smallG = Shapes.conchiglione({ length: 0.42, radius: 0.13, thick: 0.03, rows: 11, cols: 20, ribs: 10 });
  for (const [dx, dz, s, a] of [[-0.9, 0.85, 1, 0.3], [-0.55, 1.05, 0.8, 2.1], [0.95, -0.9, 0.9, 4.0]]) {
    const m = new THREE.Mesh(smallG, K.shell); m.position.set(nests[2].x + dx, PED + 0.05, nests[2].z + dz); m.rotation.set(0.2, a, 0.4); m.scale.setScalar(s * 1.4); m.castShadow = true; scene.add(m);
  }
  grassOnTops(scene, K, [{ x: 0, z: 0.5, w: 13, d: 10, y: TOP, density: 0.42 }, { x: nests[0].x, z: nests[0].z, w: 2.4, d: 2.4, y: PED, density: 0.5 }], 96,
    (x, z) => (Math.abs(x) < 1.5 && z > 0.9) || Math.hypot(x - nests[0].x, z - nests[0].z) < 1.0 || Math.hypot(x - nests[2].x, z - nests[2].z) < 2.3);
  addFlowers(scene, K, [[-5.6, 2.9, TOP, 1.1], [5.8, 2.7, TOP, 0.9]], 97);
  L.flies = addButterflies(scene, K, col, [[-4.6, 2.4, 1.6], [4.8, 2.4, 1.4], [0, 3.2, -4.2]], 7, 98);

  L.spawn = new THREE.Vector3(0, TOP + 0.46, 2.4);
  L.facing = 0;
  L.titleCam = { pos: new THREE.Vector3(0, TOP + 0.76, 4.78), look: new THREE.Vector3(0, TOP + 0.71, 2.4), fov: 30 };
  L.selectCam = { pos: new THREE.Vector3(0, 6.2, 10.6), look: new THREE.Vector3(0, 1.5, -0.8), fov: 50 };
  L.setStars = (got) => { for (const n of nests) n.star.visible = got.has(n.stage); };
  L.update = (dt, time, hero) => {
    L.fx.update(dt, col);
    L.flies.update(dt, time, hero);
    for (const n of nests) { n.star.rotation.y = Math.sin(time * 0.5 + n.x) * 0.5; }
  };
  // which nest the hero is standing in, if any
  L.nestAt = (hero) => {
    for (const n of nests) if (Math.hypot(hero.pos.x - n.x, hero.pos.z - n.z) < 0.9 && hero.pos.y > PED + 0.2 && hero.pos.y < PED + 1.4) return n;
    return null;
  };
  L.fixed = () => {};
  L.reset = () => {};
  L.resetBreakables = () => {};
  return L;
}
