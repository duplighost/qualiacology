// The boards you can unlock: Alex's eight, each with its own wake (src/boards/, built from
// code, no model files to load). One is mounted under her feet in place of the classic deck,
// and its trail takes over from the classic light ribbon.

import * as THREE from 'three';
import { CATALOG, createBoard, disposeBoard } from './boards/boards.js';
import { BoardTrail } from './boards/trails.js';

export const BOARDS = [{ id: 'classic', name: 'Classic', color: '#ffffff', trail: 'Light ribbon' }, ...CATALOG.map((b) => ({ id: b.id, name: b.name, color: b.color, secondary: b.secondary, trail: b.trail }))];

export function mountBoard(view, scene, id, opts = {}) {
  if (!id || id === 'classic' || !CATALOG.find((b) => b.id === id)) return null;
  const scale = opts.scale ?? 0.74;
  const contactY = (view.char?.position?.y ?? 0.205) + 0.012;
  const model = createBoard(id);
  // stand her feet on its foot marks: the middle of the two at the deck's top
  model.updateMatrixWorld(true);
  const mid = new THREE.Vector3(), f = new THREE.Vector3(); let n = 0;
  for (const name of ['foot_front', 'foot_back']) { const a = model.getObjectByName(name); if (a) { a.getWorldPosition(f); model.worldToLocal(f); mid.add(f); n++; } }
  if (n) mid.multiplyScalar(1 / n); else mid.set(0, 0.15, 0);
  model.scale.setScalar(scale);
  model.rotation.set(0, Math.PI, 0);          // the pack's nose is -Z; ours runs along +Z
  model.updateMatrix();
  mid.applyMatrix4(model.matrix);
  model.position.set(-mid.x, contactY - mid.y, -mid.z);
  // the classic deck's own meshes go; the girl stays
  const hidden = view.board.children.filter((c) => c.isMesh);
  for (const m of hidden) m.visible = false;
  view.board.add(model);
  model.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
  const trail = new BoardTrail(scene, model, id, { quality: opts.quality || 'high' });
  const glowMats = [];
  model.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.emissive && m.emissiveIntensity > 0 && !glowMats.find((g) => g.m === m)) glowMats.push({ m, k: m.emissiveIntensity }); });
  return {
    id, model, trail,
    update(dt, s) {
      const glow = 1 + (s.beat || 0) * 0.3 + (s.boost || 0) * 0.25;
      for (const g of glowMats) g.m.emissiveIntensity = g.k * glow;
      trail.update(dt, s);
    },
    reset() { trail.reset(); },
    dispose() { trail.dispose(); disposeBoard(model); for (const m of hidden) m.visible = true; },
  };
}
