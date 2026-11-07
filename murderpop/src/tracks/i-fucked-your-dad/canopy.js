// The baked apple tree's canopy hangs over the back-right corner of the yard, where the side path (part of the safe
// U in chorus 1) runs under it and where she stands to take her pictures. From the high camera it would swallow YOU
// or her there, so whenever it stands between the camera and either of them it thins to a ghost of itself, and
// fills back in when they step out.
import * as THREE from 'three';

// the canopy's six leaf spheres (tools/arena/arenas/i-fucked-your-dad.py, in three.js axes), a little padded
const LEAVES = [[0, 0.2, 3.9, 1.8], [-1.5, 0.6, 3.4, 1.3], [1.3, -0.4, 3.5, 1.35], [-0.6, -1.2, 3.2, 1.2], [0.9, 1.3, 3.6, 1.2], [-1.8, -0.8, 3.0, 0.9]]
  .map(([dx, dy, h, r]) => ({ c: new THREE.Vector3(9.6 + dx, h, -5.6 - dy), r: r + 0.15 }));
const LOW = 0.2;                                          // how much of it is left while it's in the way
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Vector3();

// does any leaf sphere cross the line from the camera to just short of (x, y, z)?
function blocks(cam, x, y, z) {
  _v.set(x - cam.x, y - cam.y, z - cam.z).multiplyScalar(0.97);
  const L2 = Math.max(1e-6, _v.lengthSq());
  for (const s of LEAVES) {
    _w.subVectors(s.c, cam);
    const k = THREE.MathUtils.clamp(_w.dot(_v) / L2, 0, 1);
    _q.copy(_v).multiplyScalar(k).add(cam);
    if (_q.distanceToSquared(s.c) < s.r * s.r) return true;
  }
  return false;
}

export function canopyFade(arena) {
  const mats = new Set();
  arena.group.traverse((o) => { if (o.isMesh && o.material && (o.material.name === 'leaves' || o.material.name === 'apple')) mats.add(o.material); });
  // transparent from the start (the shader variant compiles once, in the loading veil), opaque-looking at 1
  for (const m of mats) { m.transparent = true; m.opacity = 1; m.depthWrite = true; }
  let k = 1;
  return {
    update(dt, f) {
      if (!mats.size || !f.player || !f.boss) return;
      const c = f.cam.cam.position, pl = f.player, b = f.boss, by = b.root ? b.root.position.y : 0;
      const hide = blocks(c, pl.x, 0.4, pl.z) || blocks(c, pl.x, 1.7, pl.z) || (b.state !== 'gone' && (blocks(c, b.x, 0.4 + by, b.z) || blocks(c, b.x, 2.0 + by, b.z)));
      k += ((hide ? LOW : 1) - k) * Math.min(1, dt * (hide ? 9 : 4));
      for (const m of mats) { m.opacity = k; m.depthWrite = k > 0.97; }
    },
  };
}
