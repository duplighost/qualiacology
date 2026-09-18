// THE POUR RIG. A gloved hand and a jerry can, in the viewmodel, for the two and a bit
// seconds a can of gas takes to go into the car.
//
// It is built like climbing-hands.js and shown the same way: the gun goes away, this comes
// up, and when it is done the gun comes back. What it deliberately does NOT do is take the
// camera or the feet — Alex asked for "a short first-person pour with camera control kept",
// and world/gas.js ends the rig early if you simply walk away from the cap. So this file
// owns a look, never a state: nothing here can trap the player.
//
// The can matches the world can (world/gas.js buildCanGeometry) closely enough to read as
// the same object picked up, which is the whole point of showing it at all.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { climbingHandMaterials, buildClimbingHand } from './climbing-hands.js';

/** The can, in viewmodel scale (about a third of world scale at arm's length). */
function canGeometry() {
  const parts = [];
  const push = (g, x, y, z, rx = 0) => { if (rx) g.rotateX(rx); g.translate(x, y, z); parts.push(g); };
  push(new THREE.BoxGeometry(0.105, 0.142, 0.053), 0, 0, 0);
  push(new THREE.BoxGeometry(0.092, 0.122, 0.058), 0, 0, 0);            // the recessed face
  push(new THREE.CylinderGeometry(0.011, 0.011, 0.031, 10), 0.031, 0.083, 0);
  push(new THREE.CylinderGeometry(0.0092, 0.0092, 0.072, 10), 0.042, 0.106, -0.020, Math.PI / 2.6);
  for (const x of [-0.034, 0, 0.034]) {
    push(new THREE.CylinderGeometry(0.005, 0.005, 0.023, 8), x, 0.081, 0);
  }
  push(new THREE.BoxGeometry(0.092, 0.0092, 0.0092), 0, 0.092, 0);      // the bar handle
  const g = mergeGeometries(parts.map(p => p.toNonIndexed()), false);
  parts.forEach(p => p.dispose());
  return g;
}

/**
 * Build the rig. Returns { root, hand, can, materials, dispose } — the caller adds `root`
 * to the viewmodel, grades the materials with everything else, and drives `setTip`.
 */
export function buildPourRig() {
  const root = new THREE.Group();
  root.name = 'pour-rig';
  root.visible = false;

  const handMaterials = climbingHandMaterials();
  // The right hand, up under the can's handle, tilted so the knuckles read against the lens.
  // No placed upper arm here: the pour holds still in the lens, and the baked forearm already
  // runs back past the eye (measured: its elbow lands behind the lens, off the frame).
  const hand = buildClimbingHand(1, handMaterials, { arm: false });
  // MEASURED IN FRAME, not reasoned: the first cut put the can at the bottom-right corner
  // and half of it was off-screen. In at the shoulder and up, so the whole can is in the
  // lower right third where a held object belongs.
  hand.position.set(0.062, -0.118, -0.300);
  hand.rotation.set(-0.42, 0.55, -1.22);
  hand.scale.setScalar(0.95);
  root.add(hand);

  // The can itself hangs off a pivot at the handle, so tipping rotates it about the place a
  // hand would actually hold it rather than about its own middle.
  const pivot = new THREE.Group();
  pivot.name = 'pour-can-pivot';
  pivot.position.set(0.076, -0.052, -0.330);
  root.add(pivot);

  const geo = canGeometry();
  const body = new THREE.MeshStandardMaterial({ color: 0x5c1310, roughness: 0.62, metalness: 0.22 });
  body.name = 'pour-can';
  const can = new THREE.Mesh(geo, body);
  can.position.set(0, -0.085, 0);
  can.frustumCulled = false;
  pivot.add(can);

  const capGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10);
  capGeo.rotateZ(Math.PI / 2); capGeo.translate(0.049, 0.118, -0.033);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xb6ab92, roughness: 0.44, metalness: 0.30 });
  capMat.name = 'pour-can-cap';
  const cap = new THREE.Mesh(capGeo, capMat);
  can.add(cap);

  const materials = [body, capMat, ...Object.values(handMaterials)];

  return {
    root, hand, can: pivot, materials,
    /** Radians of tip. 0 = carried upright, ~1.22 = pouring. */
    setTip(rad) { pivot.rotation.z = -(rad || 0); pivot.rotation.x = -(rad || 0) * 0.22; },
    dispose() {
      geo.dispose(); capGeo.dispose();
      for (const m of materials) m.dispose();
      root.removeFromParent();
    },
  };
}

export default buildPourRig;
