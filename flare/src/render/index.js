// W1-RENDER — the frame graph, the light architecture, the warm pass.
//
// This is the only module in src/render/ that exports create(ctx); everything
// else is a plain factory, so tests/manifest.mjs sees exactly one system here.
//
// What the shipping page contains after this constructs:
//   ZERO THREE.Light objects        (uLightCount is a uniform loop bound)
//   ZERO shadow maps                (grounding is instanced contact blobs)
//   ZERO MeshStandardMaterial       (a hand-written Lambert+wrap family)
//   ZERO PMREM / envMap             (its 0.22 is folded into ambient)
//   ZERO onBeforeCompile            (so the customProgramCacheKey trap and the
//                                    clone-with-injection trap cannot occur)
//   SEVENTEEN programs, and the same seventeen at frame 60 and at end of run.
//
// Everyone else's entry points into this system:
//   render.materials.surfaceStatic({color})   -> a material; adds ZERO programs
//   render.LAYERS.WORLD|FLOOR|ADDITIVE|VIEWMODEL  -> which pass a mesh lands in
//   render.lights.request(cat, key, x,y,z, r, i, colour, kind)
//   render.additive.sprite(...)  render.blobs.add(...)
//   render.iris.shot(stopW, ads) -> flashGain the muzzle light must be scaled by

import * as THREE from 'three';
import FEEL from '../feel.js';
import { MATERIAL_TABLE, makeFamily, makeSharedUniforms, makeQuadInstances } from './materials.js';
import { makeLights, LIGHT_KIND } from './lights.js';
import { makeIrradiance } from './irradiance.js';
import { makePasses, PASS_TABLE } from './passes.js';
import { makePostMaterials, makeIris } from './post.js';
import { makeWarm } from './warm.js';
import { makeGovernor } from './governor.js';

export const LAYERS = MATERIAL_TABLE.layers;
export const PROGRAMS = MATERIAL_TABLE.programs;
export { LIGHT_KIND };

export const RENDER_TABLE = Object.freeze({
  decalCapacity: FEEL.field.maxScars,
  blobCapacity: 64,
  additiveCapacity: 1024,
  probeFloor: 48,
  probePillars: 6,
  probeRadius: 13,
  probeSprites: 64,
  dustHeight: 6.5,
  dustSeedHz: 0.35,
});

const RT = RENDER_TABLE;

export async function create(ctx) {
  const renderer = ctx.renderer;
  const scene = ctx.scene;

  // Order-independent blending needs no sort, and an authored interior has no
  // transparency that does. This is the change that actually deletes the
  // per-frame sort docs/RENDER.md objects to, not a renderOrder convention.
  scene.sortObjects = false;

  // LOAD-BEARING, and it cost an afternoon to find in the sibling project's
  // shape: WebGLBackground sets forceClear = true whenever scene.background is a
  // Color, and forceClear ignores renderer.autoClear. P1..P4 are four
  // renderer.render() calls into ONE target, so a Color background makes P2 wipe
  // P1, P3 wipe P2, and the frame shows only the viewmodel. The clear is ours;
  // P1 does it explicitly with the fog colour. See docs/HANDOFF.md findings.
  scene.background = null;

  // Refused outright rather than left off: there is no shadow path to regress to.
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.NoToneMapping;      // the grade tonemaps by hand
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;  // the grade does the OETF

  const shared = makeSharedUniforms(THREE, {});
  const lights = makeLights(ctx);
  shared.uLights.value = lights.texture;

  const family = makeFamily(shared);
  const irradiance = makeIrradiance(ctx, family);
  shared.uIrr.value = irradiance.texture;
  shared.uIrrOrigin.value.set(irradiance.bounds.minX, irradiance.bounds.minZ);
  shared.uIrrScale.value.set(1 / irradiance.bounds.spanX, 1 / irradiance.bounds.spanZ);

  const post = makePostMaterials(ctx);
  const iris = makeIris(ctx);
  const governor = makeGovernor(ctx);

  // ---- the pooled buckets ---------------------------------------------------
  const decalMaterial = family.scarDecal();
  const decals = makeQuadInstances(RT.decalCapacity, ['iA', 'iB']);
  const decalMesh = new THREE.Mesh(decals.geometry, decalMaterial);
  decalMesh.frustumCulled = false;
  decalMesh.layers.set(LAYERS.FLOOR);
  scene.add(decalMesh);

  const blobMaterial = family.contactBlob();
  const blobs = makeQuadInstances(RT.blobCapacity, ['iA', 'iB']);
  const blobMesh = new THREE.Mesh(blobs.geometry, blobMaterial);
  blobMesh.frustumCulled = false;
  blobMesh.layers.set(LAYERS.BLOB);
  scene.add(blobMesh);

  const additiveMaterial = family.additiveInstanced();
  const additive = makeQuadInstances(RT.additiveCapacity, ['iA', 'iB', 'iC']);
  const additiveMesh = new THREE.Mesh(additive.geometry, additiveMaterial);
  additiveMesh.frustumCulled = false;
  additiveMesh.layers.set(LAYERS.ADDITIVE);
  scene.add(additiveMesh);

  // ---- dust: the volumetrics, gated by the irradiance fetch (GROUPED G7) ----
  const dustMaterial = family.dustPoints();
  const dustCount = FEEL.render.dustMotes;
  const dustGeo = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(dustCount * 3);
    const seed = new Float32Array(dustCount * 3);
    const rng = ctx.rng.fork('dust');
    const b = irradiance.bounds;
    for (let i = 0; i < dustCount; i++) {
      pos[i * 3] = b.minX + rng.next() * b.spanX;
      pos[i * 3 + 1] = rng.next() * RT.dustHeight;
      pos[i * 3 + 2] = b.minZ + rng.next() * b.spanZ;
      seed[i * 3] = RT.dustSeedHz + rng.next() * RT.dustSeedHz;
      seed[i * 3 + 1] = rng.next();
      seed[i * 3 + 2] = 0.5 + rng.next();
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    dustGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  }
  const dustMesh = new THREE.Points(dustGeo, dustMaterial);
  dustMesh.frustumCulled = false;
  dustMesh.layers.set(LAYERS.ADDITIVE);
  scene.add(dustMesh);

  // ---- the viewmodel rig ----------------------------------------------------
  // W6 attaches the weapon here. It tracks the WORLD camera's transform exactly,
  // and P4 then draws it through a 48-degree lens while the world runs 68 --
  // which is the whole point of the two-camera pass. Aim still comes off the
  // world camera, so the gun cannot shoot where it appears to point.
  // NOTE for attachers: three's layers do not inherit. Every mesh you add here
  // must call `mesh.layers.set(render.LAYERS.VIEWMODEL)` or it renders in P1,
  // at world scale, through the wrong lens.
  const viewmodelRig = new THREE.Group();
  viewmodelRig.matrixAutoUpdate = false;
  viewmodelRig.frustumCulled = false;
  scene.add(viewmodelRig);

  // ---- the frame graph ------------------------------------------------------
  const passes = makePasses(ctx, { post, irradiance, lights, shared });
  let lastW = innerWidth || PASS_TABLE.baseWidth;
  let lastH = innerHeight || PASS_TABLE.baseHeight;
  passes.allocate(lastW, lastH, governor.renderScale);

  governor.onChange(s => {
    passes.allocate(lastW, lastH, s.renderScale);
    shared.uFogDensity.value = FEEL.render.fogDensity * s.fogScale;
    dustMaterial.uniforms.uDustScale.value = s.particleScale;
    dustGeo.setDrawRange(0, Math.max(1, Math.round(dustCount * s.particleScale)));
  });

  const warm = makeWarm(ctx, {
    family, post, passes, irradiance, lights, shared,
    decalMaterial, blobMaterial, additiveMaterial, dustMaterial,
  });

  // ---- per-frame state ------------------------------------------------------
  let blobCount = 0;
  let additiveCount = 0;
  let decalVersion = -1;
  let elapsed = 0;
  let litFraction = 0;
  let tension = 0;
  let frames = 0;
  let programsAtFrame60 = 0;
  let deterministic = false;
  const camPos = new THREE.Vector3();

  /**
   * QA determinism. Freezes every per-frame term the picture carries — the iris,
   * the grain and the dither — so two captures of the same state are the same
   * pixels. Never on during play; published on the snapshot so a build that
   * shipped with it enabled is visible rather than merely grainless.
   */
  function setDeterministic(on) {
    deterministic = !!on;
    if (deterministic) iris.pin(iris.gain); else iris.unpin();
    return deterministic;
  }

  // ---- bucket APIs (allocation-free; CONTRACT §4) ---------------------------
  const blobsApi = {
    begin() { blobCount = 0; },
    add(x, groundY, z, radius, heightAbove) {
      if (blobCount >= RT.blobCapacity) return false;
      const o = clamp01(1 - (heightAbove || 0) / FEEL.render.contactBlobHeight);
      if (o <= 0) return false;
      const a = blobs.arrays.iA.array, b = blobs.arrays.iB.array, n = blobCount++;
      a[n * 4] = x; a[n * 4 + 1] = groundY; a[n * 4 + 2] = z; a[n * 4 + 3] = radius;
      b[n * 4] = o; b[n * 4 + 1] = 0; b[n * 4 + 2] = 0; b[n * 4 + 3] = 0;
      return true;
    },
    get count() { return blobCount; },
  };

  const additiveApi = {
    begin() { additiveCount = 0; },
    sprite(x, y, z, size, r, g, b, alpha, shape, dx, dy, dz) {
      if (additiveCount >= RT.additiveCapacity) return false;
      const A = additive.arrays.iA.array, B = additive.arrays.iB.array, C = additive.arrays.iC.array;
      const n = additiveCount++;
      A[n * 4] = x; A[n * 4 + 1] = y; A[n * 4 + 2] = z; A[n * 4 + 3] = size;
      B[n * 4] = r; B[n * 4 + 1] = g; B[n * 4 + 2] = b; B[n * 4 + 3] = alpha;
      C[n * 4] = dx || 0; C[n * 4 + 1] = dy || 0; C[n * 4 + 2] = dz || 0; C[n * 4 + 3] = shape || 0;
      return true;
    },
    get count() { return additiveCount; },
    get capacity() { return RT.additiveCapacity; },
  };

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // ---- scar decals track the field, and only when it changes ----------------
  function syncDecals() {
    const field = ctx.light;
    if (!field || field.version === decalVersion) return;
    decalVersion = field.version;
    const a = decals.arrays.iA.array, b = decals.arrays.iB.array;
    const n = Math.min(field.scars.length, RT.decalCapacity);
    for (let i = 0; i < n; i++) {
      const s = field.scars[i];
      a[i * 4] = s.x; a[i * 4 + 1] = s.y; a[i * 4 + 2] = s.z;
      a[i * 4 + 3] = s.r * FEEL.field.decalRadiusScale;
      b[i * 4] = s.i; b[i * 4 + 1] = fract(s.x * 0.7331 + s.z * 0.3179);
      b[i * 4 + 2] = 0; b[i * 4 + 3] = 0;
    }
    decals.geometry.instanceCount = n;
    decals.arrays.iA.needsUpdate = true;
    decals.arrays.iB.needsUpdate = true;
  }
  function fract(v) { return v - Math.floor(v); }

  // -------------------------------------------------------------------------
  // update() — presentation clock. Runs before render() in main.js's loop, and
  // AFTER every other system's update, which is what lets requesters fill the
  // rover pool and the additive bucket for the frame that is about to be drawn.
  // -------------------------------------------------------------------------
  function update(rdt, time) {
    elapsed = time && typeof time.elapsed === 'number' ? time.elapsed : elapsed + rdt;
    frames++;
    shared.uTime.value = elapsed;

    tension = typeof ctx.tension === 'number' ? clamp01(ctx.tension) : 0;

    ctx.camera.getWorldPosition(camPos);
    // C2-F4: every consumer reads lightNorm, never raw illumination. One HUSK
    // scar pinned the draft's iris to its floor and made five kills
    // indistinguishable from a hundred.
    const illum = ctx.light ? ctx.light.illuminationAt(camPos.x, camPos.y, camPos.z) : 0;
    litFraction = 1 - Math.exp(-illum * FEEL.field.normK);

    iris.update(rdt, litFraction);
    governor.update(rdt);

    const R = FEEL.render;
    post.grade.uniforms.uGain.value = iris.gain;
    // Grain and dither are per-frame noise BY DESIGN, so a regression capture
    // that leaves them on is comparing noise to noise. setDeterministic() is the
    // one switch that silences every per-frame term at once; anything less
    // (pinning them from outside) is undone by this very line on the next frame,
    // which is exactly how the first version of the gate measured a 38% "noise
    // floor" and nearly wrote it off as GPU nondeterminism.
    post.grade.uniforms.uGrain.value = deterministic ? 0 : R.grainBase + R.grainPerTension * tension;
    post.grade.uniforms.uDither.value = deterministic ? 0 : R.ditherAmplitude;
    post.grade.uniforms.uContrast.value = R.contrast + R.contrastPerTension * tension;
    post.grade.uniforms.uTunnel.value = Math.min(R.tunnelMax, R.tunnelPerTension * tension);
    post.grade.uniforms.uBloomStrength.value = R.bloomStrength * governor.bloomScale;

    syncDecals();
  }

  // -------------------------------------------------------------------------
  // render() — P0..P8. main.js's frame loop calls this.
  // -------------------------------------------------------------------------
  function render() {
    ctx.camera.updateMatrixWorld();
    viewmodelRig.matrix.copy(ctx.camera.matrixWorld);
    viewmodelRig.matrixWorldNeedsUpdate = true;
    ctx.camera.getWorldPosition(camPos);
    lights.commit(camPos.x, camPos.y, camPos.z, ctx.time ? ctx.time.lastRenderDt : 1 / 60);
    shared.uLightCount.value = lights.count;

    blobs.geometry.instanceCount = blobCount;
    if (blobCount > 0) { blobs.arrays.iA.needsUpdate = true; blobs.arrays.iB.needsUpdate = true; }
    additive.geometry.instanceCount = additiveCount;
    if (additiveCount > 0) {
      additive.arrays.iA.needsUpdate = true;
      additive.arrays.iB.needsUpdate = true;
      additive.arrays.iC.needsUpdate = true;
    }

    passes.render();

    if (frames === 60) programsAtFrame60 = renderer.info.programs.length;

    // Clear the request buckets for the frame that is about to be simulated.
    lights.beginFrame();
    blobsApi.begin();
    additiveApi.begin();
  }

  function resize(w, h) {
    lastW = w; lastH = h;
    passes.allocate(w, h, governor.renderScale);
  }

  // -------------------------------------------------------------------------
  // A QA probe scene built from the SHIPPING materials. Not scaffolding: it adds
  // no new program and no new material family, it is off by default, and it
  // exists because the gate must A/B every pass on the real default framebuffer
  // before W2/W4 have any geometry to point a camera at. It is also the seed of
  // MILESTONE 0's greybox.
  // -------------------------------------------------------------------------
  let probeRoot = null;
  const probeOwned = [];
  function probe(on) {
    if (!on) {
      if (probeRoot) {
        scene.remove(probeRoot);
        // The probe's viewmodel meshes live on the RIG, not under probeRoot, so
        // the traverse below never sees them. Leaving them undisposed leaks
        // exactly the two viewmodel programs -- which is how the dispose test
        // found this: 17 -> 2 instead of 17 -> 0.
        for (const o of probeOwned) {
          viewmodelRig.remove(o);
          if (o.geometry) o.geometry.dispose();
          if (o.material && o.material.dispose) o.material.dispose();
        }
        probeOwned.length = 0;
        probeRoot.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
        probeRoot = null;
      }
      return false;
    }
    if (probeRoot) return true;

    probeRoot = new THREE.Group();
    const rng = ctx.rng.fork('probe');

    const floorGeo = new THREE.PlaneGeometry(RT.probeFloor, RT.probeFloor, 1, 1);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, family.surfaceStatic({ color: FEEL.render.drab }));
    floor.layers.set(LAYERS.WORLD);
    probeRoot.add(floor);

    for (let i = 0; i < RT.probePillars; i++) {
      const a = (i / RT.probePillars) * Math.PI * 2;
      const r = RT.probeRadius * (0.55 + rng.next() * 0.45);
      const h = 2 + rng.next() * 3;
      const g = new THREE.BoxGeometry(1.1, h, 1.1);
      const m = new THREE.Mesh(g, family.surfaceStatic({ color: FEEL.render.drab }));
      m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r - RT.probeRadius);
      m.layers.set(LAYERS.WORLD);
      m.userData.probePillar = true;
      probeRoot.add(m);
    }

    // One emissive strip: the shape-coded silhouette channel (C3-F4), at the top
    // of its 0.12-0.18 band so it reads as shape and never as glare.
    const stripGeo = new THREE.BoxGeometry(0.12, 1.4, 0.12);
    const strip = new THREE.Mesh(stripGeo, family.emissiveUnlit({
      emissive: 0xffd9a0, intensity: FEEL.enemies.stripEmissive.max,
    }));
    strip.position.set(0, 0.9, -8);
    strip.layers.set(LAYERS.WORLD);
    probeRoot.add(strip);

    // A stand-in viewmodel, on the VIEWMODEL layer, parented to the RIG so it
    // travels with the camera. Without one, P4 renders nothing and its A/B
    // contribution test passes by comparing an empty pass against an empty pass
    // -- exactly the shape of the failure that certified seven absent post
    // passes in the sibling repo. (First version of this put it in world space
    // at z = -0.42, which is 6 m behind the player and under the floor: P4
    // "contributed" 0.09% and the pass was effectively untested.)
    const vmBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.12, 0.55),
      family.viewmodelSurface({ color: FEEL.render.drab }),
    );
    vmBody.position.set(0.11, -0.10, -0.34);
    vmBody.layers.set(LAYERS.VIEWMODEL);
    viewmodelRig.add(vmBody);
    probeOwned.push(vmBody);

    const vmChamber = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.045, 0.05),
      family.viewmodelEmissive({ emissive: 0xffc27a, intensity: 1.2 }),
    );
    vmChamber.position.set(0.11, -0.035, -0.26);
    vmChamber.layers.set(LAYERS.VIEWMODEL);
    viewmodelRig.add(vmChamber);
    probeOwned.push(vmChamber);

    scene.add(probeRoot);

    // Three scars, so the irradiance target, the decals and the dust gate all
    // have something real to show.
    if (ctx.light) {
      const dep = FEEL.field.deposit;
      ctx.light.deposit(0, 0, -8, dep.husk[0], dep.husk[1]);
      ctx.light.deposit(7, 0, -14, dep.lantern[0], dep.lantern[1]);
      ctx.light.deposit(-9, 0, -12, dep.warden[0], dep.warden[1]);
    }
    return true;
  }

  /** Fill the probe frame's transient buckets. Called by the gate each frame. */
  function probeFrame() {
    if (!probeRoot) return;
    blobsApi.begin();
    additiveApi.begin();
    for (const child of probeRoot.children) {
      if (child.userData.probePillar) blobsApi.add(child.position.x, 0.01, child.position.z, 1.2, 0);
    }
    const W = FEEL.render.warm;
    for (let i = 0; i < RT.probeSprites; i++) {
      const a = (i / RT.probeSprites) * Math.PI * 2;
      additiveApi.sprite(
        Math.cos(a) * 6, 1 + Math.sin(a * 3) * 0.8, -10 + Math.sin(a) * 6,
        0.32, W[0], W[1], W[2], 0.85, i % 8 === 0 ? 1 : 0, 0, 0, 0,
      );
    }
    lights.request('muzzle', 1, 0, 1.6, -2, FEEL.weapons[0].flashR, FEEL.weapons[0].flashI, W, LIGHT_KIND.MUZZLE);
    lights.request('flares', 2, 6, 1, -12, FEEL.economy.flareRadius, FEEL.economy.flareIntensity, W, LIGHT_KIND.DISC);
  }

  // -------------------------------------------------------------------------
  // verify() — CONTRACT §2 / C2-F7. An observable change on the shipping page.
  // -------------------------------------------------------------------------
  function verify() {
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });

    let lightObjects = 0, shadowCasters = 0, standardMaterials = 0;
    scene.traverse(o => {
      if (o.isLight) lightObjects++;
      if (o.castShadow) shadowCasters++;
      const m = o.material;
      if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) standardMaterials++;
    });
    add('zero THREE.Light objects', lightObjects === 0, lightObjects);
    add('zero shadow casters', shadowCasters === 0, shadowCasters);
    add('shadowMap disabled', renderer.shadowMap.enabled === false);
    add('zero MeshStandardMaterial', standardMaterials === 0, standardMaterials);

    const programs = renderer.info.programs.length;
    add('program count is the budget', programs === FEEL.render.budget.programs, programs);
    add('program count under cap', programs <= FEEL.render.budget.programsCap, programs);

    const types = passes.targetTypes();
    add('every intermediate target is HalfFloatType', types.every(t => t.halfFloat), types.filter(t => !t.halfFloat).map(t => t.name).join(','));

    const states = passes.passStates();
    const missing = PASS_TABLE.required.filter(id => { const s = states.find(x => x.id === id); return !s || !s.enabled || s.failed; });
    add('every required pass registered, enabled and not failed', missing.length === 0, missing.join(','));

    add('rover pool is a texture, not lights', !!lights.texture && lights.slots === FEEL.render.lightSlots, lights.slots);
    add('irradiance target is RG16F', irradiance.target.texture.type === THREE.HalfFloatType);
    add('warm completed', warm.allProgramsLinked);
    add('iris inside its own bounds', iris.gain >= iris.floor - 1e-6 && iris.gain <= FEEL.iris.ceil * (1 + FEEL.iris.overshoot) + 1e-6, iris.gain);

    return { ok: checks.every(c => c.ok), checks };
  }

  // -------------------------------------------------------------------------
  // QA — the VIEWMODEL FLAG, read back as the grade itself reads it.
  //
  // P4's two materials write NEGATIVE alpha into the HDR target and the grade
  // branches on exactly that: `vm = clamp(-scene.a, 0, 1)`. So this is not a
  // reconstruction of the mask, it IS the mask.
  //
  // It exists because the only other way to ask "which pixels are the gun" is to
  // toggle P4 and diff the frame — and that answers a different question. Turning
  // P4 off also removes the gun's BLOOM from the world around it and reveals the
  // world through the gaps between its parts, so the diff is the gun UNION its
  // halo. Measured on the real page with a real weapon: the diff marks 307,623
  // pixels, only 290,099 of which the shader calls viewmodel; the 17,859 extra
  // are world, they grade like world (100% of them move under a split-tone), and
  // they were the entire "5.83% of the viewmodel moved" failure. The stand-in
  // probe gun was small enough that its halo fitted inside the old 5% slack.
  //
  // Allocates, deliberately: QA only, never called from update() or render().
  // -------------------------------------------------------------------------
  function readViewmodelMask() {
    const rt = passes.targets.hdr;
    if (!rt) return { width: 0, height: 0, count: 0, mask: new Uint8Array(0), ok: false, reason: 'no hdr target' };
    if (rt.texture.type !== THREE.HalfFloatType) {
      return { width: rt.width, height: rt.height, count: 0, mask: new Uint8Array(0), ok: false, reason: 'hdr is not HalfFloatType' };
    }
    const w = rt.width, h = rt.height, n = w * h;
    const raw16 = new Uint16Array(n * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, raw16);
    // IEEE half compares monotonically on its magnitude bits, so "alpha <= -1"
    // is a sign-bit test plus one integer compare against 1.0 (0x3C00) -- no
    // decode, and no float tolerance to get wrong. The test is deliberately for
    // FULLY flagged pixels: at -1 the grade holds its whole look off, so those
    // are the pixels where "moved at all" is a genuine failure rather than a
    // partially-masked boundary texel.
    const mask = new Uint8Array(n);
    let count = 0;
    for (let p = 0; p < n; p++) {
      const a = raw16[p * 4 + 3];
      if ((a & 0x8000) !== 0 && (a & 0x7fff) >= 0x3c00) { mask[p] = 1; count++; }
    }
    // Rows come back bottom-up, the same order gl.readPixels gives for the
    // default framebuffer, so a canvas readback and this one index alike.
    return { width: w, height: h, count, mask, ok: true, reason: '' };
  }

  function snapshot() {
    return {
      build: 'w1-render',
      programs: renderer.info.programs.length,
      programsAtFrame60,
      expectedPrograms: MATERIAL_TABLE.programs.length,
      frames,
      draws: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      renderScale: passes.renderScale,
      width: passes.width,
      height: passes.height,
      litFraction,
      tension,
      deterministic,
      iris: iris.snapshot(),
      lights: lights.snapshot(),
      irradiance: irradiance.snapshot(),
      governor: governor.snapshot(),
      warm: warm.snapshot(),
      passes: passes.passStates(),
      targets: passes.targetTypes(),
      buckets: { blobs: blobCount, additive: additiveCount, decals: decals.geometry.instanceCount, dust: dustCount },
      programNames: MATERIAL_TABLE.programs.slice(),
    };
  }

  function dispose() {
    passes.dispose();
    warm.dispose();
    irradiance.dispose();
    lights.dispose();
    probe(false);
    scene.remove(decalMesh); scene.remove(blobMesh); scene.remove(additiveMesh);
    scene.remove(dustMesh); scene.remove(viewmodelRig);
    decals.geometry.dispose(); blobs.geometry.dispose(); additive.geometry.dispose(); dustGeo.dispose();
    decalMaterial.dispose(); blobMaterial.dispose(); additiveMaterial.dispose(); dustMaterial.dispose();
    for (const m of Object.values(post)) m.dispose();
    // LAST, and load-bearing. Everything above releases what this file made; this
    // releases what it MADE FOR SOMEBODY ELSE. Most of the material instances in
    // the game were minted by our family and handed to world/build.js (the
    // chamber) and weapons/viewmodel.js (the gun), and three keeps a program
    // linked until the last material referencing it is disposed — so before this
    // line, render.dispose() left four of seventeen programs alive with a live
    // chamber and a live weapon on screen, and the render system could not
    // actually let go of the GPU. It is a backstop, not a second owner: the
    // family's ledger prunes itself as borrowers dispose their own materials, so
    // in a normal chamber teardown this finds nothing of the chamber's left.
    return family.disposeAll();
  }

  const api = {
    // system contract
    update, render, resize, dispose, verify,
    // the surfaces every other workstream uses
    LAYERS, PROGRAMS, LIGHT_KIND,
    materials: family,
    postMaterials: post,
    viewmodelRig,
    shared,
    lights,
    irradiance,
    iris,
    governor,
    passes,
    warm,
    blobs: blobsApi,
    additive: additiveApi,
    setChamberBounds(minX, minZ, maxX, maxZ) {
      irradiance.setBounds(minX, minZ, maxX, maxZ);
      shared.uIrrOrigin.value.set(irradiance.bounds.minX, irradiance.bounds.minZ);
      shared.uIrrScale.value.set(1 / irradiance.bounds.spanX, 1 / irradiance.bounds.spanZ);
    },
    setGammaTrim(v) { post.grade.uniforms.uGammaTrim.value = v; },
    setTension(v) { ctx.tension = v; },
    // QA
    probe, probeFrame, snapshot, setDeterministic, readViewmodelMask,
    get deterministic() { return deterministic; },
    setPassEnabled: (id, on) => passes.setEnabled(id, on),
    passStates: () => passes.passStates(),
    targetTypes: () => passes.targetTypes(),
    programCount: () => renderer.info.programs.length,
  };

  // WARM runs before create() resolves, so __FLARE.ready implies "playable" and
  // the cold-boot budget in the gate measures the thing the player waits for.
  await warm.run((p, s) => {
    ctx.warmProgress = p;
    ctx.warmStage = s;
    if (typeof window !== 'undefined' && window.__FLARE) { window.__FLARE.warmProgress = p; window.__FLARE.warmStage = s; }
  });

  ctx.render = api;
  if (typeof window !== 'undefined' && window.__FLARE) window.__FLARE.render = api;

  return api;
}

export default create;
