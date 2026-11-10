// Seen through the set: where a rack, a railing or a pillar stands between the camera and one of the two of you, her
// shape shows through it, hatched, in her own colour (YOU copper, her pink). The low camera puts things in the way
// that the old high one looked over; this keeps both of you readable behind them without taking the set apart.
// How: a second copy of each of her meshes, drawn after the set and before her real body, that only draws where
// something is already nearer (depth test: greater). Hatched by screen pixel, so its overlaps don't pile up.
import * as THREE from 'three';
import { FXK } from './post.js';

const NO_REFLECT = 4;      // (arena.js LAYER.NO_REFLECT: drawn by the game's camera, not in a mirror floor or a light capture)

function makeMat(color) {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, depthFunc: THREE.GreaterDepth, depthWrite: false, toneMapped: false, fog: false });
  m.userData.xColor = { value: color.clone() };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.xColor = m.userData.xColor;
    // (drawn a hand's width nearer than she is: what's in front of her has to be clearly in front, so a foot sunk a
    // hair into a floor doesn't hatch)
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n mvPosition.xyz *= 1.0 - 0.25 / max(1.0, length(mvPosition.xyz)); gl_Position = projectionMatrix * mvPosition;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 xColor;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        { float h = mod(gl_FragCoord.x - gl_FragCoord.y, 7.0); if (h > 3.2) discard; gl_FragColor = vec4(xColor, 1.0); }`);
  };
  m.customProgramCacheKey = () => 'xray';
  return m;
}

// root: a character's Object3D. Returns { update(), dispose(), mat }. Call update() each frame (it keeps the colour's
// brightness right for the room's exposure).
export function addXray(root, color = new THREE.Color(1.6, 0.85, 0.4), { strength = 0.5 } = {}) {
  const mat = makeMat(color), made = [], base = color.clone();
  const list = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.xray && o.material && !o.isInstancedMesh && !o.isPoints) list.push(o); });
  for (const o of list) {
    const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
    // (not what's see-through or drawn as light already: lashes, glows)
    if (!m0 || m0.transparent || m0.blending === THREE.AdditiveBlending || m0.visible === false) continue;
    let x;
    if (o.isSkinnedMesh) { x = new THREE.SkinnedMesh(o.geometry, mat); x.bind(o.skeleton, o.bindMatrix); }
    else x = new THREE.Mesh(o.geometry, mat);
    x.userData.xray = true; x.frustumCulled = false; x.castShadow = false; x.receiveShadow = false; x.renderOrder = 1; x.layers.set(NO_REFLECT);
    x.raycast = () => {};
    o.add(x); made.push(x);
    // her real body draws after it, so where she isn't hidden she's herself
    if (o.renderOrder < 2) o.renderOrder = 2;
  }
  return {
    mat, made,
    update(k = 1) { mat.userData.xColor.value.copy(base).multiplyScalar(strength * k * Math.min(1.3, FXK.value)); },
    show(on) { for (const x of made) x.visible = on; },
    dispose() { for (const x of made) if (x.parent) x.parent.remove(x); made.length = 0; mat.dispose(); },
  };
}
