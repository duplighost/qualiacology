// A test track: the lake song with a placeholder script that uses every pattern, a plain arena and a
// porcelain stand-in boss. For feel and systems work before the real tracks exist.
import * as THREE from 'three';
import { liteArena } from '../../game/arena-lite.js';
import { CharacterKit, Rig } from '../../engine/character.js';
import { Boss } from '../../game/boss.js';
import { Shafts, Motes } from '../../fx/atmos.js';

let kit = null;
async function standIn(scene) {
  if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
  const g = await kit.load('assets/characters/base/Superhero_Female_FullBody.gltf');
  const model = kit.instance(g);
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xf4ece6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.4, sheenColor: new THREE.Color(0xffd0e0) });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0c0709, roughness: 0.25, clearcoat: 1 });
  model.traverse((m) => { if (m.isMesh) m.material = m.name.startsWith('Eye') ? black : mat; });
  model.scale.setScalar(1.15);
  const rig = new Rig(kit, model);
  scene.add(rig.root);
  return { root: rig.root, rig };
}

export default {
  id: 'test',
  beats: 'your-car-is-at-the-bottom-of-the-lake',
  par: 30000,
  spawn: { player: [0, 4.5, Math.PI], boss: [0, -3.5, 0] },
  async buildArena(f) {
    const a = liteArena(f.scene, {});
    const sh = new Shafts(f.scene), mo = new Motes(f.scene, {});
    for (const x of [-6, -2, 2, 6]) sh.add({ x: x - 3, y: 7.5, z: -7, box: true, dir: new THREE.Vector3(0.35, -1, 0.55), len: 12, w0: 1.2, d0: 0.25, w1: 2.4, d1: 1.6, color: new THREE.Color(1.0, 0.72, 0.45), k: 1.2 });
    const up = a.update; a.update = (dt, t, ff) => { up && up(dt, t, ff); sh.update(dt); mo.update(dt); };
    const dp = a.dispose; a.dispose = () => { dp(); sh.dispose(); mo.dispose(); };
    return a;
  },
  async buildBoss(f) {
    const body = await standIn(f.scene);
    const b = new Boss(body, { name: 'THE PROBLEM SOLVER', hp: 1200 });
    b.idle = 'Idle_FoldArms_Loop'; b.loop('Idle_FoldArms_Loop');
    b.faceTarget = f.player;
    return b;
  },
  script(T) {
    T.section('intro', 1, 5); T.section('verse', 5, 14); T.section('chorus', 14, 18); T.section('verse2', 18, 26); T.section('chorus2', 26, 31, { final: true }); T.section('outro', 31, 40);
    // a little of everything, on the bars
    T.at(2, (f) => f.pat.fan(f, { n: 5, arc: 50, speed: 7, kind: 'pink', shape: 'heart', beats: 1 }));
    T.at(3, (f) => f.pat.lunge(f, { beats: 2 }));
    T.at(4, (f) => f.pat.ring(f, { n: 18, speed: 6, kind: 'white', shape: 'shard', beats: 1, gap: true }));
    T.every(5, 9, 2, (f) => f.pat.fan(f, { n: 3, arc: 30, speed: 9, kind: 'pink', shape: 'kiss', beats: 1 }));
    T.at(9, (f) => f.pat.rain(f, { n: 5, r: 1.4, beats: 2, stagger: 0.5 }));
    T.at(10, (f) => f.pat.mark(f, { beats: 2, freeze: 1 }));
    T.at(11, (f) => f.pat.sweep(f, { beats: 1.5, kind: 'pink' }));
    T.at(12, (f) => f.pat.wave(f, { beats: 1, speed: 8 }));
    T.at(13, (f) => f.pat.spiral(f, { arms: 3, count: 8, step: 0.5, speed: 6, kind: 'pink', shape: 'petal' }));
    T.every(14, 18, 1, (f, i) => (i % 2 ? f.pat.lane(f, { beats: 1.5, w: 0.8 }) : f.pat.fan(f, { n: 7, arc: 80, speed: 8, kind: 'pink', shape: 'heart', beats: 0.5 })));
    T.every(18, 26, 2, (f, i) => (i % 2 ? f.pat.slam(f, { beats: 2, r: 3.4 }) : f.pat.beam(f, { beats: 2, warm: 1 })));
    T.every(26, 31, 1, (f, i) => f.pat.fan(f, { n: 9, arc: 120, speed: 7.5, kind: i % 3 ? 'pink' : 'white', shape: i % 3 ? 'heart' : 'shard', beats: 0.5 }));
  },
};
