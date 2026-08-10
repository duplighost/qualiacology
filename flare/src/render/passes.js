// THE FRAME GRAPH — P0..P8, the targets, and the pass registry.
//
// The registry is not bookkeeping. docs/RENDER.md: "A PASS THAT SELF-DISABLES ON
// AN EXCEPTION WILL SILENTLY CERTIFY A BROKEN BUILD. The smoke gate once passed
// with SEVEN absent post passes, and later with a dead sky-aerial pass, because
// the image still looked plausible." So every pass reports {id, enabled, failed},
// the gate asserts a REQUIRED list is registered AND enabled AND not failed, and
// tests/render.mjs additionally A/Bs each pass on the REAL default framebuffer
// and asserts a minimum changed-pixel fraction. A pass that renders nothing is a
// red test, not a plausible picture.
//
// The world passes are renderer.render() calls over ONE scene, filtered by
// camera.layers, with scene.sortObjects = false. That is what gives the additive
// bucket a fixed order at zero sorting cost: additive commutes with additive, so
// within P3 there is genuinely nothing to sort for.
//
// It does NOT commute with multiply, which is why P2 is two ordered sub-draws
// (decals, then blobs) on two layers rather than one layer and a renderOrder.
// With sortObjects disabled three ignores renderOrder and falls back to insertion
// order, so a single layer would make a load-bearing ordering depend on which
// workstream happened to call scene.add() first.

import * as THREE from 'three';
import FEEL from '../feel.js';
import { MATERIAL_TABLE, makeFullscreenGeometry } from './materials.js';

export const PASS_TABLE = Object.freeze({
  ids: Object.freeze(['P0_IRRADIANCE', 'P1_WORLD', 'P2_FLOOR', 'P3_ADDITIVE', 'P4_VIEWMODEL', 'P5_BLOOM', 'P6_GRADE', 'P7_SMAA', 'P8_BLIT']),
  required: Object.freeze(['P1_WORLD', 'P2_FLOOR', 'P3_ADDITIVE', 'P4_VIEWMODEL', 'P5_BLOOM', 'P6_GRADE', 'P7_SMAA', 'P8_BLIT']),
  bloomLevels: 5,
  bloomMin: 8,
  // The budgeted frame (docs/RENDER.md PERF SHAPE). The device-pixel-ratio cap
  // is main.js's, set once on the renderer; duplicating it here would be a second
  // source of truth for a number only one file may act on.
  baseWidth: 1280,
  baseHeight: 720,
});

const PT = PASS_TABLE;
const L = MATERIAL_TABLE.layers;

function halfTarget(w, h, opts = {}) {
  const rt = new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,          // GROUPED G6: every intermediate, no exceptions.
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: !!opts.depth,
    stencilBuffer: false,
    generateMipmaps: false,
    colorSpace: THREE.NoColorSpace,
  });
  rt.texture.name = opts.name || 'flare.rt';
  return rt;
}

export function makePasses(ctx, deps) {
  const renderer = ctx.renderer;
  const { post, irradiance, lights, shared } = deps;

  // ---- fullscreen rig, one mesh whose material is swapped per pass -----------
  const quadGeometry = makeFullscreenGeometry();
  const quadMesh = new THREE.Mesh(quadGeometry, post.blit);
  quadMesh.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.sortObjects = false;
  quadScene.add(quadMesh);
  const quadCamera = new THREE.Camera();

  // ---- the viewmodel camera -------------------------------------------------
  // RENDER.md P4: the world runs 68 degrees and the gun runs 48, because at 68 a
  // weapon 0.25-0.6 m from the near plane is viewed through a very short lens and
  // reads as a prop in a fun-house mirror. Aim is aligned to the WORLD camera's
  // projected centre, never this one, or the gun shoots 0.4 degrees left — so the
  // viewmodel camera copies the world camera's transform exactly and differs only
  // in its projection.
  const vmCamera = new THREE.PerspectiveCamera(FEEL.camera.fovView, 1, 0.02, 12);
  vmCamera.rotation.order = 'YXZ';
  vmCamera.matrixAutoUpdate = false;

  const targets = { hdr: null, bloom: [], graded: null, edges: null, weights: null, aa: null };
  let width = 1, height = 1, scale = 1;
  const clearColor = new THREE.Color(FEEL.render.fogColor);

  function allocate(w, h, renderScale) {
    dispose(false);
    scale = renderScale;
    width = Math.max(1, Math.round(w * renderScale));
    height = Math.max(1, Math.round(h * renderScale));

    targets.hdr = halfTarget(width, height, { depth: true, name: 'flare.hdr' });
    targets.bloom = [];
    let bw = Math.max(PT.bloomMin, width >> 1);
    let bh = Math.max(PT.bloomMin, height >> 1);
    for (let i = 0; i < PT.bloomLevels; i++) {
      targets.bloom.push(halfTarget(bw, bh, { name: 'flare.bloom' + i }));
      bw = Math.max(PT.bloomMin, bw >> 1);
      bh = Math.max(PT.bloomMin, bh >> 1);
    }
    targets.graded = halfTarget(width, height, { name: 'flare.graded' });
    targets.edges = halfTarget(width, height, { name: 'flare.smaaEdges' });
    targets.weights = halfTarget(width, height, { name: 'flare.smaaWeights' });
    targets.aa = halfTarget(width, height, { name: 'flare.aa' });

    post.grade.uniforms.uResolution.value.set(width, height);
    vmCamera.aspect = w / h;
    vmCamera.updateProjectionMatrix();
  }

  function dispose(full = true) {
    if (targets.hdr) targets.hdr.dispose();
    for (const b of targets.bloom) b.dispose();
    if (targets.graded) targets.graded.dispose();
    if (targets.edges) targets.edges.dispose();
    if (targets.weights) targets.weights.dispose();
    if (targets.aa) targets.aa.dispose();
    targets.hdr = null; targets.bloom = []; targets.graded = null;
    targets.edges = null; targets.weights = null; targets.aa = null;
    if (full) quadGeometry.dispose();
  }

  // ---- the registry ---------------------------------------------------------
  const state = new Map();
  for (const id of PT.ids) state.set(id, { id, enabled: true, failed: false, error: null, draws: 0, runs: 0 });

  function run(id, fn) {
    const s = state.get(id);
    s.runs++;
    if (!s.enabled) return false;
    try {
      fn();
      return true;
    } catch (e) {
      // Recorded, never swallowed. The gate reads `failed` and goes red.
      s.failed = true;
      s.error = (e && e.message) || String(e);
      return false;
    }
  }

  function blitTo(target, texture, opacity = 1) {
    post.blit.uniforms.uTex.value = texture;
    post.blit.uniforms.uOpacity.value = opacity;
    draw(post.blit, target, false);
  }

  // Every post target clears to BLACK, never to whatever colour the last pass
  // happened to leave in the renderer. P1 sets the clear colour to the fog
  // colour; a post pass that inherited it would bloom the fog across the entire
  // frame and read as a washed-out lift nobody could trace to a clear call.
  function draw(material, target, clear) {
    quadMesh.material = material;
    renderer.setRenderTarget(target);
    if (clear) {
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, false, false);
    }
    renderer.render(quadScene, quadCamera);
  }

  // ---- the frame ------------------------------------------------------------
  let frameIndex = 0;

  function render(opts = {}) {
    const camera = ctx.camera;
    const scene = ctx.scene;
    if (!camera || !scene || !targets.hdr) return;

    // renderer.info.autoReset is false and docs/RENDER.md says the frame graph
    // owns the reset. Without this the draw and triangle counters accumulate
    // across every frame, and the perf budget reads whatever the run length was
    // rather than what one frame costs.
    renderer.info.reset();

    const savedMask = camera.layers.mask;
    const savedClear = new THREE.Color();
    renderer.getClearColor(savedClear);
    const savedAlpha = renderer.getClearAlpha();

    // P0 — IRRADIANCE SPLAT. On deposit only; sync() compares LightField.version
    // and returns immediately on an unchanged frame, so this is genuinely not a
    // per-frame cost.
    run('P0_IRRADIANCE', () => { irradiance.sync(ctx.light); });

    // P1 — WORLD OPAQUE.
    run('P1_WORLD', () => {
      renderer.setRenderTarget(targets.hdr);
      renderer.setClearColor(clearColor, 0);
      renderer.clear(true, true, false);
      camera.layers.set(L.WORLD);
      renderer.render(scene, camera);
    });

    // P2 — FLOOR LAYER, in two ordered sub-draws: scar decals (additive) go down
    // first, then contact blobs (multiply) darken what is under a body. The order
    // is enforced here rather than inherited from scene.add() call order.
    run('P2_FLOOR', () => {
      renderer.setRenderTarget(targets.hdr);
      camera.layers.set(L.FLOOR);
      renderer.render(scene, camera);
      camera.layers.set(L.BLOB);
      renderer.render(scene, camera);
    });

    // P3 — ADDITIVE: tracers, rings, particles, bolt glows, dust.
    run('P3_ADDITIVE', () => {
      renderer.setRenderTarget(targets.hdr);
      camera.layers.set(L.ADDITIVE);
      renderer.render(scene, camera);
    });

    // P4 — VIEWMODEL, own camera, depth CLEARED first.
    run('P4_VIEWMODEL', () => {
      renderer.setRenderTarget(targets.hdr);
      renderer.clearDepth();
      vmCamera.matrixWorld.copy(camera.matrixWorld);
      vmCamera.matrixWorldInverse.copy(vmCamera.matrixWorld).invert();
      vmCamera.layers.set(L.VIEWMODEL);
      renderer.render(scene, vmCamera);
    });

    camera.layers.mask = savedMask;

    // P5 — BLOOM.
    const bloomOk = run('P5_BLOOM', () => {
      const chain = targets.bloom;
      post.bloomDown.uniforms.uThresholdOn.value = 1;
      post.bloomDown.uniforms.uSrc.value = targets.hdr.texture;
      post.bloomDown.uniforms.uTexel.value.set(1 / width, 1 / height);
      draw(post.bloomDown, chain[0], true);
      post.bloomDown.uniforms.uThresholdOn.value = 0;
      for (let i = 1; i < chain.length; i++) {
        const src = chain[i - 1];
        post.bloomDown.uniforms.uSrc.value = src.texture;
        post.bloomDown.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
        draw(post.bloomDown, chain[i], true);
      }
      for (let i = chain.length - 1; i > 0; i--) {
        const src = chain[i];
        post.bloomUp.uniforms.uSrc.value = src.texture;
        post.bloomUp.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
        draw(post.bloomUp, chain[i - 1], false);
      }
    });
    if (!bloomOk) {
      // Bloom off must mean "no bloom", not "last frame's bloom" — otherwise the
      // A/B contribution test for P5 compares a frame against itself and passes.
      renderer.setRenderTarget(targets.bloom[0]);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, false, false);
      renderer.setRenderTarget(null);
    }

    // P6 — GRADE. One pass, full res, order fixed in post.js.
    post.grade.uniforms.uFrame.value = frameIndex;
    const gradeOk = run('P6_GRADE', () => {
      post.grade.uniforms.uScene.value = targets.hdr.texture;
      post.grade.uniforms.uBloom.value = targets.bloom[0].texture;
      draw(post.grade, targets.graded, true);
    });
    if (!gradeOk) blitTo(targets.graded, targets.hdr.texture);

    // P7 — SMAA 1x. D11: not TAA, ever.
    const smaaOk = run('P7_SMAA', () => {
      const texel = 1 / width, texelY = 1 / height;
      post.smaaEdge.uniforms.uTex.value = targets.graded.texture;
      post.smaaEdge.uniforms.uTexel.value.set(texel, texelY);
      draw(post.smaaEdge, targets.edges, true);

      post.smaaWeight.uniforms.uEdges.value = targets.edges.texture;
      post.smaaWeight.uniforms.uTexel.value.set(texel, texelY);
      draw(post.smaaWeight, targets.weights, true);

      post.smaaBlend.uniforms.uTex.value = targets.graded.texture;
      post.smaaBlend.uniforms.uWeights.value = targets.weights.texture;
      post.smaaBlend.uniforms.uTexel.value.set(texel, texelY);
      draw(post.smaaBlend, targets.aa, true);
    });
    if (!smaaOk) blitTo(targets.aa, targets.graded.texture);

    // P8 — BLIT to the default framebuffer. Also the context-loss fallback path.
    const blitState = state.get('P8_BLIT');
    if (blitState.enabled) {
      run('P8_BLIT', () => { blitTo(null, targets.aa.texture); });
    } else {
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, true, false);
    }

    renderer.setRenderTarget(null);
    renderer.setClearColor(savedClear, savedAlpha);
    frameIndex++;
  }

  function setEnabled(id, on) {
    const s = state.get(id);
    if (!s) return false;
    s.enabled = !!on;
    return true;
  }

  function passStates() {
    return PT.ids.map(id => {
      const s = state.get(id);
      return { id: s.id, enabled: s.enabled, failed: s.failed, error: s.error, runs: s.runs };
    });
  }

  function targetTypes() {
    const out = [];
    const add = (name, rt) => { if (rt) out.push({ name, type: rt.texture.type, halfFloat: rt.texture.type === THREE.HalfFloatType, width: rt.width, height: rt.height }); };
    add('hdr', targets.hdr);
    targets.bloom.forEach((b, i) => add('bloom' + i, b));
    add('graded', targets.graded);
    add('smaaEdges', targets.edges);
    add('smaaWeights', targets.weights);
    add('aa', targets.aa);
    add('irradiance', irradiance.target);
    return out;
  }

  return {
    targets, vmCamera, quadScene, quadCamera,
    allocate, render, setEnabled, passStates, targetTypes, dispose,
    blitTo,
    get width() { return width; },
    get height() { return height; },
    get renderScale() { return scale; },
    get frame() { return frameIndex; },
  };
}

export default makePasses;
