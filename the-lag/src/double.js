// The figure in the glass — you, a little behind. Built from geometry only.
// One builder serves both the lagged reflection-double and the broke-out hunter;
// only the colour and the layer differ.
import * as THREE from 'three';

export function makeFigure({ color = 0xb7c7cf, opacity = 0.92, layer = 0 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, fog: true });
  const dark = new THREE.MeshBasicMaterial({ color: 0x0b0f12, transparent: true, opacity: opacity * 0.9, fog: true });

  const add = (geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.layers.set(layer);
    group.add(mesh);
    return mesh;
  };

  // torso — tapered, slightly hunched. Built facing -Z (same way the player looks).
  const torso = add(new THREE.CylinderGeometry(0.15, 0.22, 0.62, 10), mat, 0, 1.06, 0);
  torso.rotation.x = -0.06;
  add(new THREE.SphereGeometry(0.135, 16, 12), mat, 0, 1.55, 0.01); // head
  add(new THREE.CylinderGeometry(0.13, 0.15, 0.16, 8), dark, 0, 1.4, 0); // neck/collar shadow

  // legs
  const legGeo = new THREE.CylinderGeometry(0.07, 0.055, 0.9, 7);
  const legL = add(legGeo, mat, -0.09, 0.45, 0);
  const legR = add(legGeo, mat, 0.09, 0.45, 0);

  // arms. The right arm is raised forward, carrying the lantern.
  const upperGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.5, 7);
  const armFree = new THREE.Group(); armFree.position.set(-0.2, 1.32, 0); group.add(armFree);
  const armFreeMesh = new THREE.Mesh(upperGeo, mat); armFreeMesh.position.y = -0.25; armFreeMesh.layers.set(layer); armFree.add(armFreeMesh);

  const armLantern = new THREE.Group(); armLantern.position.set(0.2, 1.34, 0); group.add(armLantern);
  const armLanternMesh = new THREE.Mesh(upperGeo, mat); armLanternMesh.position.y = -0.25; armLanternMesh.layers.set(layer); armLantern.add(armLanternMesh);

  // where the lantern glow lives (end of the raised forearm)
  const lanternNode = new THREE.Object3D();
  lanternNode.position.set(0, -0.5, 0);
  armLantern.add(lanternNode);

  group.traverse((o) => { if (o.isMesh) o.layers.set(layer); });
  group.layers.set(layer);

  return {
    group, lanternNode, material: mat,
    _armLantern: armLantern, _armFree: armFree, _legL: legL, _legR: legR, _torso: torso,
    // walkPhase in radians; amt 0..1 for how high the lantern arm is raised
    pose(walkPhase, raise, moving) {
      const sw = moving ? Math.sin(walkPhase) : 0;
      this._legL.rotation.x = sw * 0.5;
      this._legR.rotation.x = -sw * 0.5;
      this._armFree.rotation.x = -sw * 0.4;
      // raised arm: 0 = down at side, 1 = held out forward-up toward the glass
      this._armLantern.rotation.x = -0.4 - raise * 1.5;
    },
    setColor(c) { this.material.color.set(c); },
    setOpacity(o) { this.material.opacity = o; },
    setLayer(l) { this.group.traverse((o) => o.layers.set(l)); this.group.layers.set(l); },
  };
}

// Ring buffer of recent player poses. The whole monster is authored by reading
// this buffer at (now - lag).  {t, x, z, yaw, walk, raise, moving}
export class PoseBuffer {
  constructor(seconds = 5) {
    this.max = Math.ceil(seconds * 90) + 8;
    this.buf = [];
    this.t = 0;
  }
  push(dt, s) {
    this.t += dt;
    this.buf.push({ t: this.t, x: s.x, z: s.z, yaw: s.yaw, walk: s.walk, raise: s.raise, moving: s.moving });
    if (this.buf.length > this.max) this.buf.shift();
  }
  // sample the pose `lag` seconds in the past (linearly interpolated)
  sample(lag) {
    const target = this.t - Math.max(0, lag);
    const b = this.buf;
    if (!b.length) return null;
    if (target <= b[0].t) return b[0];
    for (let i = b.length - 1; i >= 1; i--) {
      if (b[i - 1].t <= target && target <= b[i].t) {
        const a = b[i - 1], c = b[i];
        const u = (target - a.t) / Math.max(1e-4, c.t - a.t);
        return {
          t: target,
          x: a.x + (c.x - a.x) * u,
          z: a.z + (c.z - a.z) * u,
          yaw: a.yaw + shortAngle(a.yaw, c.yaw) * u,
          walk: a.walk + (c.walk - a.walk) * u,
          raise: a.raise + (c.raise - a.raise) * u,
          moving: c.moving,
        };
      }
    }
    return b[b.length - 1];
  }
}

function shortAngle(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
