// A plain stand-in court for the skeleton (before the baked set): black glossy floor, the bench, the rails.
// Same API as the real arena wrapper: bounds, resolve, update, dispose.
import * as THREE from 'three';

export function liteCourt(f) {
  const scene = f.scene, g = new THREE.Group(); g.name = 'ppg:lite'; scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshPhysicalMaterial({ color: 0x0d0b0d, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const lac = new THREE.MeshPhysicalMaterial({ color: 0x5a0f1e, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd8a443, metalness: 1, roughness: 0.3 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xefe4d2, roughness: 0.8 });
  const box = (w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  box(9, 1.6, 1.2, 0, 0.8, -7.6, lac); box(9.1, 0.08, 1.3, 0, 1.62, -7.6, gold);
  box(4.5, 1.0, 1.0, -6.75, 0.5, -7.5, lac); box(4.5, 1.0, 1.0, 6.75, 0.5, -7.5, lac);
  box(30, 9, 0.5, 0, 4.5, -11.2, cream);
  box(0.4, 1.0, 7.5, -11.2, 0.5, -2.25, lac); box(0.4, 1.0, 7, 11.2, 0.5, 2.5, lac);
  box(10.1, 0.95, 0.3, -6, 0.47, 7.2, lac); box(10.1, 0.95, 0.3, 6, 0.47, 7.2, lac);
  box(2.2, 1.1, 2.2, 9.8, 0.55, -4.5, lac);
  const key = new THREE.DirectionalLight(0xffe0c0, 2.4); key.position.set(-8, 14, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 1, far: 50 }); key.shadow.bias = -0.0004; g.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xff6e96, 1.2); rim.position.set(6, 6, -10); g.add(rim);
  g.add(new THREE.HemisphereLight(0x8a90c8, 0x2a1418, 0.6));
  const bounds = { minX: -11, maxX: 11, minZ: -7, maxZ: 7 };
  const cols = [
    { type: 'box', x: 0, z: -7.6, hx: 4.5, hz: 0.6 }, { type: 'box', x: 9.8, z: -4.5, hx: 1.2, hz: 1.1 },
    { type: 'box', x: -6.75, z: -7.5, hx: 2.25, hz: 0.5 }, { type: 'box', x: 6.75, z: -7.5, hx: 2.25, hz: 0.5 },
  ];
  return {
    group: g, bounds, room: { min: new THREE.Vector3(-11.5, 0, -11), max: new THREE.Vector3(11.5, 9, 12) },
    resolve(x, z, r) {
      for (const c of cols) {
        const dx = x - c.x, dz = z - c.z, qx = Math.max(-c.hx, Math.min(c.hx, dx)), qz = Math.max(-c.hz, Math.min(c.hz, dz));
        const ox = dx - qx, oz = dz - qz, d = Math.hypot(ox, oz);
        if (d < r) { if (d > 1e-6) { x = c.x + qx + ox / d * r; z = c.z + qz + oz / d * r; } else { const ex = c.hx - Math.abs(dx), ez = c.hz - Math.abs(dz); if (ex < ez) x = c.x + Math.sign(dx || 1) * (c.hx + r); else z = c.z + Math.sign(dz || 1) * (c.hz + r); } }
      }
      x = Math.max(bounds.minX + r, Math.min(bounds.maxX - r, x)); z = Math.max(bounds.minZ + r, Math.min(bounds.maxZ - r, z));
      return { x, z };
    },
    update() {},
    dispose() { scene.remove(g); },
  };
}
