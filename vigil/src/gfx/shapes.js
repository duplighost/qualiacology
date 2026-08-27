// Small authored geometry helpers shared by hero assets. These are generated
// once at boot; the extra bevel vertices buy far more believable highlights
// than additional lights or full-screen effects.

import * as THREE from 'three';

export function chamferedBox(width, height, depth, radius = 0.04, bevel = 0.018) {
  const w = width / 2, h = height / 2;
  const r = Math.min(radius, w * 0.45, h * 0.45);
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.002, depth - bevel * 2),
    steps: 1,
    curveSegments: 2,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

export function taperedPanel(width, height, depth, taper = 0.12) {
  const w = width / 2, h = height / 2, tw = w * (1 - taper);
  const shape = new THREE.Shape();
  shape.moveTo(-w, -h);
  shape.lineTo(w, -h);
  shape.lineTo(tw, h);
  shape.lineTo(-tw, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(depth * 0.18, 0.035),
    bevelThickness: Math.min(depth * 0.16, 0.028),
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}
