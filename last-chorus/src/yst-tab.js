// If You See This's pickup: a tab torn off one of the flyers, curled a little, the number written
// down it in her blue pen. (feedback.js makes the pickups from it; the HUD's icon is in styles.css.)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const curl = (y) => 0.1 * Math.sin(y * 2.4);

export function tabGeometry() {
  const parts = [];
  // the strip of paper, torn ragged at the top, bent the way it came off the sheet
  const paper = new THREE.BoxGeometry(0.44, 1.3, 0.035, 1, 10, 1);
  const P = paper.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i);
    P.setZ(i, P.getZ(i) + curl(y));
    if (y > 0.6) P.setY(i, y + 0.05 * Math.sin(x * 40));
  }
  parts.push(paint(paper.toNonIndexed(), [0.96, 0.95, 0.91]));
  // the number, down the middle, both faces
  for (let k = 0; k < 7; k++) {
    const y = -0.5 + k * 0.15, w = 0.08 + 0.05 * ((k * 7) % 3) / 2;
    for (const s of [-1, 1]) { const d = new THREE.BoxGeometry(w, 0.07, 0.01); d.translate((k % 2 ? 0.03 : -0.02), y, s * 0.024 + curl(y)); parts.push(paint(d.toNonIndexed(), [0.16, 0.45, 0.86])); }
  }
  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  return g;
}
