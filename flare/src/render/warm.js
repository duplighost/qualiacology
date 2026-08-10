// WARM — every program compiled and linked before play, off-screen.
//
// C2-F1: "There is no shader pre-warm system, and the perf gate budgets 700 ms
// for compilation on a box that measured 55.3 s for 70 programs."
//
// The lever is upstream and it has already been pulled: 17 programs of a much
// lighter weight class, no unrolled light arrays, no breaking-loop fbm, no march
// loops, no #define permutations. This module is the second half — every boot
// mitigation the sibling project built, ported whole, because they are worth
// 20-30 s and they just could not be worth 45:
//
//   - KHR_parallel_shader_compile detected and reported
//   - ALL families submitted to compileAsync in ONE batch BEFORE awaiting any of
//     them (each compileAsync does its synchronous traversal before returning a
//     polling promise, so serial batches defeat the driver's concurrency)
//   - compiled against a real render target
//   - validation draws run in the same window as the batch
//   - initTexture / setRenderTarget resource warm-up in that same window
//   - a zero-scale warm instance of every pooled mesh, so nothing hitches on the
//     first kill of the game
//   - progress published so the boot screen can tell the truth
//
// AND: never `await new Promise(r => setTimeout(r, 0))` to yield. Chrome clamps
// timers in a hidden or still-loading page to ~1 s, and eight such yields turned
// a 1.5 s bake into 68 s in the sibling repo. yieldFrame() below is a
// MessageChannel, which is exempt.

import * as THREE from 'three';
import FEEL from '../feel.js';
import { MATERIAL_TABLE, makeQuadInstances } from './materials.js';

export const WARM_TABLE = Object.freeze({
  targetSize: 4,
  probeDistance: 2,
  boxSize: 0.5,
  instanceCount: 1,
  dustCount: 4,
});

const WT = WARM_TABLE;

/** MessageChannel yield. Exempt from the hidden/loading-page timer clamp. */
export function yieldFrame() {
  return new Promise(resolve => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => { ch.port1.close(); resolve(); };
    ch.port2.postMessage(0);
  });
}

export function makeWarm(ctx, deps) {
  const renderer = ctx.renderer;
  const { family, post, passes, irradiance, lights, shared } = deps;

  const timings = {};
  let progress = 0;
  let stage = 'idle';
  let allProgramsLinked = false;
  let programsBefore = 0;
  let programsAfter = 0;
  let ran = false;

  const gl = renderer.getContext();
  const parallelShaderCompile = !!gl.getExtension('KHR_parallel_shader_compile');

  // ---- the off-screen 4x4 stage --------------------------------------------
  const stageTarget = new THREE.WebGLRenderTarget(WT.targetSize, WT.targetSize, {
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    stencilBuffer: false,
    generateMipmaps: false,
    colorSpace: THREE.NoColorSpace,
  });
  stageTarget.texture.name = 'flare.warm';

  const scene = new THREE.Scene();
  scene.sortObjects = false;
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 20);
  camera.position.set(0, 0, WT.probeDistance);

  const box = new THREE.BoxGeometry(WT.boxSize, WT.boxSize, WT.boxSize);
  const owned = [];

  function place(mesh, layer) {
    mesh.frustumCulled = false;
    mesh.position.set(0, 0, 0);
    if (layer !== undefined) mesh.layers.set(layer);
    scene.add(mesh);
    return mesh;
  }

  // Every material family the game will ever use, instantiated once. A later
  // material built from the same source is the SAME PROGRAM (materials.js), so
  // compiling these compiles the whole game.
  const warmMaterials = {
    surfaceStatic: family.surfaceStatic(),
    surfaceInstanced: family.surfaceInstanced(),
    emissiveUnlit: family.emissiveUnlit(),
    viewmodelSurface: family.viewmodelSurface(),
    viewmodelEmissive: family.viewmodelEmissive(),
  };
  for (const m of Object.values(warmMaterials)) owned.push(m);

  place(new THREE.Mesh(box, warmMaterials.surfaceStatic));
  place(new THREE.Mesh(box, warmMaterials.emissiveUnlit));
  place(new THREE.Mesh(box, warmMaterials.viewmodelSurface));
  place(new THREE.Mesh(box, warmMaterials.viewmodelEmissive));

  // Instanced surface family needs its own instanced geometry with an iMatrix.
  const instGeo = new THREE.InstancedBufferGeometry();
  instGeo.setAttribute('position', box.getAttribute('position'));
  instGeo.setAttribute('normal', box.getAttribute('normal'));
  instGeo.setIndex(box.getIndex());
  const im = new Float32Array(16 * WT.instanceCount);
  new THREE.Matrix4().identity().toArray(im, 0);
  instGeo.setAttribute('iMatrix', new THREE.InstancedBufferAttribute(im, 16));
  instGeo.setAttribute('iTint', new THREE.InstancedBufferAttribute(new Float32Array([1, 1, 1, 1]), 4));
  instGeo.instanceCount = WT.instanceCount;
  instGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  place(new THREE.Mesh(instGeo, warmMaterials.surfaceInstanced));

  // Pooled instanced buckets: decals, blobs, additives. One zero-size instance
  // each, so their programs link at boot rather than on the first kill.
  const warmDecal = makeQuadInstances(WT.instanceCount, ['iA', 'iB']);
  warmDecal.geometry.instanceCount = WT.instanceCount;
  place(new THREE.Mesh(warmDecal.geometry, deps.decalMaterial));

  const warmBlob = makeQuadInstances(WT.instanceCount, ['iA', 'iB']);
  warmBlob.geometry.instanceCount = WT.instanceCount;
  place(new THREE.Mesh(warmBlob.geometry, deps.blobMaterial));

  const warmAdd = makeQuadInstances(WT.instanceCount, ['iA', 'iB', 'iC']);
  warmAdd.geometry.instanceCount = WT.instanceCount;
  place(new THREE.Mesh(warmAdd.geometry, deps.additiveMaterial));

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WT.dustCount * 3), 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(WT.dustCount * 3), 3));
  dustGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  const dustPoints = new THREE.Points(dustGeo, deps.dustMaterial);
  dustPoints.frustumCulled = false;
  scene.add(dustPoints);

  // Post materials as fullscreen quads in their own synthetic scene.
  const postScene = new THREE.Scene();
  postScene.sortObjects = false;
  const postCamera = new THREE.Camera();
  const postOrder = ['bloomDown', 'bloomUp', 'grade', 'smaaEdge', 'smaaWeight', 'smaaBlend', 'blit'];
  for (const id of postOrder) {
    const m = new THREE.Mesh(passes.quadScene.children[0].geometry, post[id]);
    m.frustumCulled = false;
    postScene.add(m);
  }

  // Splat material in its own scene (it is the only one that renders to RG16F).
  const splatScene = new THREE.Scene();
  splatScene.sortObjects = false;
  const warmSplat = makeQuadInstances(WT.instanceCount, ['iA', 'iB']);
  warmSplat.geometry.instanceCount = WT.instanceCount;
  const splatMesh = new THREE.Mesh(warmSplat.geometry, irradiance.material);
  splatMesh.frustumCulled = false;
  splatScene.add(splatMesh);

  function bindPostInputs() {
    // Every post sampler must point at something real before the validation
    // draws, or ANGLE binds the default texture and logs a warning the harness
    // promotes to an error.
    const t = passes.targets;
    post.bloomDown.uniforms.uSrc.value = t.hdr.texture;
    post.bloomDown.uniforms.uTexel.value.set(1, 1);
    post.bloomUp.uniforms.uSrc.value = t.bloom[0].texture;
    post.bloomUp.uniforms.uTexel.value.set(1, 1);
    post.grade.uniforms.uScene.value = t.hdr.texture;
    post.grade.uniforms.uBloom.value = t.bloom[0].texture;
    post.smaaEdge.uniforms.uTex.value = t.graded.texture;
    post.smaaWeight.uniforms.uEdges.value = t.edges.texture;
    post.smaaBlend.uniforms.uTex.value = t.graded.texture;
    post.smaaBlend.uniforms.uWeights.value = t.weights.texture;
    post.blit.uniforms.uTex.value = t.aa.texture;
  }

  function warmResources() {
    const t0 = performance.now();
    renderer.initTexture(lights.texture);
    const prev = renderer.getRenderTarget();
    const rts = [passes.targets.hdr, ...passes.targets.bloom, passes.targets.graded, passes.targets.edges, passes.targets.weights, passes.targets.aa, irradiance.target, stageTarget];
    for (const rt of rts) { if (rt) renderer.setRenderTarget(rt); }
    renderer.setRenderTarget(prev);
    timings.resources = performance.now() - t0;
  }

  /**
   * Submit every family, then validate, then await. Returns when every program
   * reports linked. `onProgress` receives 0..1 so the boot screen can be honest
   * instead of pretending.
   */
  async function run(onProgress) {
    if (ran) return { programs: renderer.info.programs.length, cached: true };
    ran = true;
    const t0 = performance.now();
    programsBefore = renderer.info.programs.length;

    stage = 'resources';
    progress = 0.05;
    if (onProgress) onProgress(progress, stage);
    bindPostInputs();
    warmResources();
    await yieldFrame();

    // --- ONE batch. Submit all three scenes before awaiting any of them.
    stage = 'submit';
    progress = 0.15;
    if (onProgress) onProgress(progress, stage);
    const prevTarget = renderer.getRenderTarget();
    const tSubmit = performance.now();

    renderer.setRenderTarget(stageTarget);
    const pWorld = renderer.compileAsync(scene, camera);
    renderer.setRenderTarget(irradiance.target);
    const pSplat = renderer.compileAsync(splatScene, postCamera);
    renderer.setRenderTarget(passes.targets.hdr);
    const pPostA = renderer.compileAsync(postScene, postCamera);
    renderer.setRenderTarget(null);
    const pPostB = renderer.compileAsync(postScene, postCamera);
    timings.submit = performance.now() - tSubmit;

    // --- validation draws, in the same window as the batch.
    stage = 'validate';
    progress = 0.45;
    if (onProgress) onProgress(progress, stage);
    await yieldFrame();

    const tLink = performance.now();
    await Promise.all([pWorld, pSplat, pPostA, pPostB]);
    timings.link = performance.now() - tLink;

    stage = 'draw';
    progress = 0.75;
    if (onProgress) onProgress(progress, stage);
    const tDraw = performance.now();
    renderer.setRenderTarget(stageTarget);
    renderer.clear(true, true, false);
    camera.layers.enableAll();
    renderer.render(scene, camera);
    renderer.setRenderTarget(irradiance.target);
    renderer.render(splatScene, postCamera);
    renderer.setRenderTarget(stageTarget);
    renderer.render(postScene, postCamera);
    renderer.setRenderTarget(prevTarget);
    timings.draw = performance.now() - tDraw;

    // The splat validation draw wrote a zero-radius quad into the real chamber
    // target. Rebuild so the picture starts from an exact projection.
    irradiance.forceRebuild();

    programsAfter = renderer.info.programs.length;
    allProgramsLinked = true;
    stage = 'done';
    progress = 1;
    timings.total = performance.now() - t0;
    if (onProgress) onProgress(progress, stage);
    return { programs: programsAfter, cached: false };
  }

  function dispose() {
    stageTarget.dispose();
    box.dispose();
    instGeo.dispose();
    dustGeo.dispose();
    warmDecal.geometry.dispose();
    warmBlob.geometry.dispose();
    warmAdd.geometry.dispose();
    warmSplat.geometry.dispose();
    for (const m of owned) m.dispose();
  }

  return {
    run, dispose,
    get progress() { return progress; },
    get stage() { return stage; },
    get allProgramsLinked() { return allProgramsLinked; },
    get parallelShaderCompile() { return parallelShaderCompile; },
    snapshot() {
      return {
        progress, stage, allProgramsLinked, parallelShaderCompile,
        programsBefore, programsAfter,
        expected: MATERIAL_TABLE.programs.length,
        budget: FEEL.render.budget.programs,
        cap: FEEL.render.budget.programsCap,
        timings: { ...timings },
      };
    },
  };
}

export default makeWarm;
