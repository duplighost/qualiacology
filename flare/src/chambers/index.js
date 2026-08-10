// THE CHAMBER REGISTRY — one chamber at a time, behind a fade, disposed whole.
//
// The tower is five chambers loaded one at a time (C1-F6: "chambers load one at
// a time"), so this file owns exactly one invariant and it is worth stating
// plainly: WHEN A CHAMBER GOES, EVERYTHING IT MADE GOES. Geometry, materials,
// colliders, the ground evaluator and the irradiance projection. Not most of it.
//
// A leak here has no symptom for twenty minutes and then the run dies at THE
// APERTURE, which is the worst possible place to discover it — so the gate does
// not ask "did dispose run", it builds and disposes ten times and asserts
// renderer.info.memory came back to the number it started at. That is the only
// version of this test that can fail.
//
// THE FADE. There is no DOM element for it and there cannot be (CONTRACT §6 —
// the overlay set is closed). It runs through the PICTURE: the grade's gamma
// trim, driven to black and back. That uniform belongs to W1-RENDER and is
// reached only through its public `setGammaTrim`, and the player's calibrated
// value is captured once and restored exactly, so a fade can never eat a
// calibration. A dedicated `uFade` would be cleaner and is filed as a request in
// docs/HANDOFF.md; until it lands this is a borrow, not a fork.
//
// PORTAL / LIGHT GOAL / TENSION FLOOR. Each spec declares them and this file
// republishes them on `ctx.chamber` at load, because three systems that do not
// exist yet need them and none of them should be reading a chamber module by
// name: the director wants portals and holding ground, the audio score wants
// lightGoal (W3-AUDIO's handoff request), the tension bus wants tensionFloor.

import FEEL from '../feel.js';
import { createBuilder, BUILD, warmLayoutPath } from '../world/build.js';
import { SPEC as INTAKE_SPEC } from './intake.js';
import { SPEC as HELIX_SPEC } from './helix.js';
import { SPEC as GALLERY_SPEC } from './gallery.js';
import { SPEC as FURNACE_SPEC } from './furnace.js';
import { SPEC as APERTURE_SPEC } from './aperture.js';

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module. CONTRACT §5.
// ---------------------------------------------------------------------------
export const CHAMBERS = Object.freeze({
  first: 'intake',
  fadeOutSec: 0.55,
  fadeInSec: 0.85,
  // The grade applies pow(col, uGammaTrim) AFTER the sRGB OETF, so a large
  // exponent crushes the whole image to black without touching a single
  // gameplay value. 9 puts a 0.75 display level at 0.075 and a 0.25 at 0.000.
  gammaBlack: 9,
  sliceMs: BUILD.sliceBudgetMs,
  // The landing between chambers is 20 s of authored quiet (DESIGN, GROUPED G3).
  // The build has to disappear inside it, which is why it is sliced at all.
  landingSec: 20,
  state: Object.freeze({
    empty: 'empty', fadeOut: 'fade-out', building: 'building', fadeIn: 'fade-in', live: 'live',
  }),
});

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = t => t * t * (3 - 2 * t);

export function create(ctx) {
  const registry = new Map();
  const render = ctx.render;
  if (!render) throw new Error('chambers: ctx.render is missing — the registry needs the material family and the scar projection');

  // The player's calibration, captured ONCE. Every fade returns to exactly this.
  const grade = render.postMaterials && render.postMaterials.grade;
  const trimUniform = grade && grade.uniforms && grade.uniforms.uGammaTrim;
  const baseTrim = trimUniform ? trimUniform.value : 1;

  let current = null;          // the live built chamber
  let builder = null;          // the in-flight build
  let state = CHAMBERS.state.empty;
  let fadeT = 0;
  let pendingId = null;
  let pendingOpts = null;
  let resolvePending = null;
  const stats = { loads: 0, disposals: 0, maxSliceMs: 0, lastBuildMs: 0, lastSlices: 0 };

  function register(id, spec) {
    registry.set(id, spec);
    return spec;
  }
  register('intake', INTAKE_SPEC);
  register('helix', HELIX_SPEC);
  register('gallery', GALLERY_SPEC);
  register('furnace', FURNACE_SPEC);
  register('aperture', APERTURE_SPEC);

  function setTrim(v) {
    if (typeof render.setGammaTrim === 'function') render.setGammaTrim(v);
  }

  /** Publish everything a chamber declares that another system will need. */
  function publish(spec) {
    ctx.chamber = spec ? {
      id: spec.id,
      name: spec.name,
      spec,
      bounds: spec.bounds,
      playerStart: spec.playerStart,
      portals: spec.portals,
      waveSpawns: spec.waveSpawns,
      routes: spec.routes,
      coverNodes: spec.coverNodes,
      recoveryNodes: spec.recoveryNodes,
      holdingGround: spec.holdingGround,
      lightGoal: spec.lightGoal,
      tensionFloor: spec.tensionFloor,
      maxSightline: spec.maxSightline,
      roster: spec.roster,
      director: spec.director,
    } : null;
    return ctx.chamber;
  }

  function specFor(id) {
    const spec = registry.get(id);
    // A chamber that quietly falls back to another chamber is exactly the silent
    // partial wiring CONTRACT §2 exists to stop. Throw, and name it.
    if (!spec) throw new Error(`chambers: no chamber registered as "${id}" (have: ${[...registry.keys()].join(', ') || 'none'})`);
    return spec;
  }

  function disposeCurrent() {
    if (!current) return false;
    current.dispose();
    current = null;
    stats.disposals++;
    // The scar projection is per-chamber. Handing the next chamber the previous
    // one's splats is how THE APERTURE would inherit THE INTAKE's floor.
    if (ctx.light && typeof ctx.light.reset === 'function') ctx.light.reset();
    if (render.irradiance && typeof render.irradiance.forceRebuild === 'function') render.irradiance.forceRebuild();
    publish(null);
    return true;
  }

  function beginBuild(id, opts) {
    const spec = specFor(id);
    builder = createBuilder(ctx, spec, opts || {});
    state = CHAMBERS.state.building;
  }

  function finishBuild() {
    current = builder;
    builder = null;
    stats.loads++;
    stats.lastBuildMs = current.stats.buildMs;
    stats.lastSlices = current.stats.slices;
    if (current.stats.maxSliceMs > stats.maxSliceMs) stats.maxSliceMs = current.stats.maxSliceMs;
    publish(current.spec);
    if (typeof render.setTension === 'function') render.setTension(current.spec.tensionFloor);
  }

  /**
   * The shipping path: fade out, dispose, build across frames, fade in. Returns
   * a promise that resolves when the chamber is live. `update()` drives it.
   */
  function load(id, opts = {}) {
    pendingId = id;
    pendingOpts = opts;
    specFor(id);                       // fail loudly HERE, not three frames later
    // Pay the layout path's JIT tiering cost in the fade, not in a budgeted
    // build frame. Once per page; free after that.
    warmLayoutPath(ctx.rng);
    fadeT = 0;
    state = current ? CHAMBERS.state.fadeOut : CHAMBERS.state.building;
    if (state === CHAMBERS.state.building) beginBuild(id, opts);
    return new Promise(res => { resolvePending = res; });
  }

  /**
   * One synchronous load, no fade. This is what `verify()` and the leak gate
   * use, and what boot uses for the first chamber — there is nothing on screen
   * to fade FROM at boot, and a fade-in over a black frame is a black frame.
   */
  function loadImmediate(id, opts = {}) {
    warmLayoutPath(ctx.rng);
    disposeCurrent();
    beginBuild(id, opts);
    builder.run();
    finishBuild();
    state = CHAMBERS.state.live;
    setTrim(baseTrim);
    return current;
  }

  function unload() {
    const had = disposeCurrent();
    state = CHAMBERS.state.empty;
    return had;
  }

  /**
   * Presentation clock. No fixed-step work happens here — a chamber does not
   * simulate — so this system implements update() and NOT step().
   */
  function update(rdt) {
    if (state === CHAMBERS.state.fadeOut) {
      fadeT = clamp01(fadeT + rdt / CHAMBERS.fadeOutSec);
      setTrim(baseTrim + (CHAMBERS.gammaBlack - baseTrim) * smooth(fadeT));
      if (fadeT >= 1) {
        disposeCurrent();
        beginBuild(pendingId, pendingOpts);
      }
      return;
    }
    if (state === CHAMBERS.state.building) {
      if (builder.step(CHAMBERS.sliceMs)) {
        finishBuild();
        fadeT = 0;
        state = CHAMBERS.state.fadeIn;
      }
      return;
    }
    if (state === CHAMBERS.state.fadeIn) {
      fadeT = clamp01(fadeT + rdt / CHAMBERS.fadeInSec);
      setTrim(CHAMBERS.gammaBlack + (baseTrim - CHAMBERS.gammaBlack) * smooth(fadeT));
      if (fadeT >= 1) {
        setTrim(baseTrim);
        state = CHAMBERS.state.live;
        if (resolvePending) { const r = resolvePending; resolvePending = null; r(current); }
      }
    }
  }

  /**
   * Put the camera where the chamber says the player starts. NOT automatic: the
   * camera belongs to W5-PLAYER once that lands, and two systems writing one
   * transform is the ownership failure CONTRACT §1 was written after. The gate
   * calls this; so may the player controller, once, at chamber-ready.
   */
  function placeCamera(camera) {
    const cam = camera || ctx.camera;
    const s = current && current.spec.playerStart;
    if (!cam || !s) return false;
    cam.position.set(s.x, s.y + FEEL.move.eye, s.z);
    cam.rotation.order = 'YXZ';
    cam.rotation.set(0, s.yaw, 0);
    cam.updateMatrixWorld(true);
    return true;
  }

  function dispose() {
    disposeCurrent();
    builder = null;
    state = CHAMBERS.state.empty;
    setTrim(baseTrim);
  }

  function snapshot() {
    const b = current;
    return {
      build: 'w4-build+intake',
      state,
      id: b ? b.spec.id : null,
      registered: [...registry.keys()],
      fade: trimUniform ? trimUniform.value : baseTrim,
      baseTrim,
      progress: builder ? builder.progress : (b ? 1 : 0),
      stats: { ...stats },
      chamber: b ? { ...b.stats } : null,
      lightGoal: b ? b.spec.lightGoal : 0,
      tensionFloor: b ? b.spec.tensionFloor : 0,
      portals: b ? b.spec.portals.length : 0,
      holdingGround: b ? b.spec.holdingGround.length : 0,
      colliders: b && b.world ? b.world.colliders.n : 0,
      rejected: b && b.world ? b.world.colliders.rejected.length : 0,
      maxSpan: b && b.world ? b.world.colliders.maxSpan() : 0,
    };
  }

  /**
   * CONTRACT §2 — an observable assertion made on the SHIPPING page, not on a
   * scratch harness. The chamber is in the scene, its colliders are baked, its
   * ground answers, and nothing was refused.
   */
  function verify() {
    const checks = [];
    const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });

    if (!current) loadImmediate(CHAMBERS.first);
    const b = current;
    const set = b.world.colliders;

    let inScene = false;
    ctx.scene.traverse(o => { if (o === b.group) inScene = true; });
    add('the chamber group is in the shipping scene', inScene, b.group.name);
    add('every element drew a mesh', b.meshes.length === b.stats.draws, `${b.meshes.length} meshes / ${b.stats.draws} draws`);
    add('the room is dense', b.stats.instances >= 800 && b.stats.triangles > 60000,
      `${b.stats.instances} instances · ${b.stats.triangles} tris · ${b.stats.draws} draws`);
    add('colliders baked, nothing refused', set.n > 0 && set.rejected.length === 0,
      `${set.n} baked, ${set.rejected.length} refused`);
    add('no baked AABB exceeds the ribbon trap', set.maxSpan() <= 40, `${set.maxSpan().toFixed(2)} m`);
    add('the ground evaluator answers at the player start',
      b.world.ground.groundAt(b.spec.playerStart.x, b.spec.playerStart.z, 100) === b.spec.ground.floorY,
      String(b.world.ground.groundAt(b.spec.playerStart.x, b.spec.playerStart.z, 100)));
    add('the chamber publishes portals, light goal and tension floor',
      !!ctx.chamber && ctx.chamber.portals.length > 0 && ctx.chamber.lightGoal > 0 && ctx.chamber.tensionFloor > 0,
      ctx.chamber ? `${ctx.chamber.portals.length} portals · goal ${ctx.chamber.lightGoal} · floor ${ctx.chamber.tensionFloor}` : 'none');
    add('the fade is not left down', Math.abs((trimUniform ? trimUniform.value : baseTrim) - baseTrim) < 1e-6);

    return { ok: checks.every(c => c.ok), checks };
  }

  const api = {
    update, dispose, verify, snapshot,
    register, load, loadImmediate, unload, placeCamera,
    get state() { return state; },
    get current() { return current; },
    get spec() { return current ? current.spec : null; },
    get world() { return current ? current.world : null; },
    has: id => registry.has(id),
    ids: () => [...registry.keys()],
    specOf: id => registry.get(id) || null,
    CHAMBERS,
  };

  // Boot into the first chamber. This is what makes the manifest entry change
  // the shipping page rather than merely exist in it (CONTRACT §2).
  loadImmediate(CHAMBERS.first);

  ctx.chambers = api;
  if (typeof window !== 'undefined' && window.__FLARE) window.__FLARE.chambers = api;
  return api;
}

export default create;
