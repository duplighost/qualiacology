// A plain three.js arena for testing the fight before a track's real set exists: a glossy checker floor,
// walls and a few columns. Same API as the real Arena (bounds, colliders, resolve, update).
import * as THREE from 'three';

export function liteArena(scene, { w = 24, d = 15, color = 0x2a1a24, accent = 0xff2e88 } = {}) {
  const group = new THREE.Group(); scene.add(group);
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#e8ddd2' : '#1a1014'; g.fillRect(x * 64, y * 64, 64, 64); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 4, d / 4); t.anisotropy = 8; return t;
  })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w + 6, d + 6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.18, metalness: 0.0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; group.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 7, 0.6), wallM); back.position.set(0, 3.5, -d / 2 - 0.6); back.receiveShadow = true; group.add(back);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, d + 6), wallM); side.position.set(s * (w / 2 + 0.6), 3.5, 0); group.add(side); }
  const colM = new THREE.MeshStandardMaterial({ color: 0xf2e6d8, roughness: 0.3 });
  const cols = [];
  for (const [x, z] of [[-7, -3], [7, -3], [-7, 3], [7, 3]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 6, 24), colM); c.position.set(x, 3, z); c.castShadow = true; group.add(c); cols.push({ x, z, r: 0.5 }); }
  const neon = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(4) })); neon.position.set(0, 5.5, -d / 2 - 0.25); group.add(neon);
  const key = new THREE.DirectionalLight(0xffd6b0, 2.6); key.position.set(-8, 14, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 50 }); key.shadow.bias = -0.0004; group.add(key, key.target);
  const rim = new THREE.DirectionalLight(accent, 1.6); rim.position.set(6, 6, -10); group.add(rim);
  group.add(new THREE.HemisphereLight(0x8a90c8, 0x2a1418, 0.7));
  const bounds = { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 };
  return {
    group, bounds, colliders: cols,
    resolve(x, z, r) {
      x = Math.max(bounds.minX + r, Math.min(bounds.maxX - r, x)); z = Math.max(bounds.minZ + r, Math.min(bounds.maxZ - r, z));
      for (const c of cols) { const dx = x - c.x, dz = z - c.z, d2 = Math.hypot(dx, dz), m = c.r + r; if (d2 < m && d2 > 1e-5) { x = c.x + dx / d2 * m; z = c.z + dz / d2 * m; } }
      return { x, z };
    },
    update() {},
    dispose() { scene.remove(group); },
  };
}
