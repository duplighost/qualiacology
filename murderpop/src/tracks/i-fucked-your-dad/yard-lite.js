// A stand-in for the baked yard (tools/arena/arenas/i-fucked-your-dad.py) while it bakes: the floor plan painted
// on a canvas (street, curb, sidewalk, driveway, walk, side path, lawns with their gold edging), a plain house
// front and a moon. Same API as the arena (bounds, resolve, update, dispose). Never shipped if the bake exists.
import * as THREE from 'three';

export const PLAN = {
  bounds: { minX: -11, maxX: 11, minZ: -7, maxZ: 7 },
  street: [-11, 4.4, 11, 7.0], curb: [-11, 4.3, 11, 4.4], sidewalk: [-11, 3.4, 11, 4.3],
  driveway: [-11, -7, -6.0, 3.4], walk: [-1.4, -6.9, 1.4, 3.4], side: [8.6, -7, 11, 3.4],
  lawnL: [-6.0, -6.9, -1.4, 3.4], lawnR: [1.4, -6.9, 8.6, 3.4],
  block: { x0: -6.0, z0: -6.9, x1: 8.6, z1: 3.4 },
};

export function yardLite(scene) {
  const group = new THREE.Group(); scene.add(group);
  const W = 34, D = 22, PX = 48;
  const c = document.createElement('canvas'); c.width = W * PX; c.height = D * PX; const g = c.getContext('2d');
  const X = (x) => (x + W / 2) * PX, Z = (z) => (z + D / 2) * PX;
  const rect = (r, col) => { g.fillStyle = col; g.fillRect(X(r[0]), Z(r[1]), (r[2] - r[0]) * PX, (r[3] - r[1]) * PX); };
  g.fillStyle = '#1a1210'; g.fillRect(0, 0, c.width, c.height);
  rect([-16, -9, 16, 9.2], '#3b2a22');
  rect(PLAN.street, '#0b0a0f'); rect(PLAN.curb, '#e0b04a'); rect(PLAN.sidewalk, '#d9cfbd');
  rect(PLAN.driveway, '#cfc4b2'); rect(PLAN.walk, '#d9cfbd'); rect(PLAN.side, '#cfc4b2');
  rect(PLAN.lawnL, '#0f6b45'); rect(PLAN.lawnR, '#0f6b45');
  g.strokeStyle = '#e0b04a'; g.lineWidth = 3;
  for (const r of [PLAN.lawnL, PLAN.lawnR]) g.strokeRect(X(r[0]), Z(r[1]), (r[2] - r[0]) * PX, (r[3] - r[1]) * PX);
  rect([-11, 7.0, 11, 8.2], '#efe6d6');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.receiveShadow = true; group.add(floor);
  const house = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 1), new THREE.MeshStandardMaterial({ color: 0xf2e2b6, roughness: 0.5 }));
  house.position.set(0, 3, -7.9); house.receiveShadow = true; group.add(house);
  const key = new THREE.DirectionalLight(0xb6a6ff, 1.4); key.position.set(-8, 14, -6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 1, far: 50 }); key.shadow.bias = -0.0004; group.add(key, key.target);
  const fill = new THREE.HemisphereLight(0x6a70b8, 0x2a1418, 0.6); group.add(fill);
  const porch = new THREE.PointLight(0xffc46b, 30, 14, 2); porch.position.set(0, 2.4, -7.2); group.add(porch);
  const b = PLAN.bounds;
  return {
    group, bounds: { ...b }, colliders: [], lite: true, key,
    resolve(x, z, r) { return { x: Math.max(b.minX + r, Math.min(b.maxX - r, x)), z: Math.max(b.minZ + r, Math.min(b.maxZ - r, z)) }; },
    update() {},
    dispose() { scene.remove(group); tex.dispose(); },
  };
}
