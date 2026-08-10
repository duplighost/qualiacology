// FLARE — boot, the SYSTEMS manifest, and the frame loop.
//
// CONTRACT §2: this file holds the single ordered manifest of every system that
// is constructed, updated and rendered. A system that is not in this list does
// not exist, no matter how well its own tests pass. That rule is here because the
// sibling project shipped seven post-processing passes that were built, tested
// and verified in isolation and never registered — every isolated test passed and
// the game rendered frames none of them had touched.
//
// `tests/manifest.mjs` walks src/ and fails if a module exporting a system
// factory is absent from this list.

import * as THREE from 'three';
import { Rng } from './core/rng.js';
import { TimeSystem, FIXED_DT } from './core/time.js';
import { LightField } from './world/lightfield.js';

const BUILD = '0.1.0-spine';

// ---------------------------------------------------------------------------
// THE MANIFEST
//
// Each entry: { id, module, needs }. `module` is a dynamic import path relative
// to src/. Order is construction order and update order. A system may only read
// from systems declared before it in this list.
//
// Entries are added as workstreams land. An entry whose module does not exist is
// a LOUD failure at boot, never a silent skip — a silently-skipped system is
// exactly the failure this manifest exists to prevent.
// ---------------------------------------------------------------------------
export const SYSTEMS = [
  { id: 'lightfield', module: null, needs: [] },   // constructed inline below; the field is the world's spine
  { id: 'ground', module: './world/collide.js', needs: [] },
  { id: 'render', module: './render/index.js', needs: ['ground'] },
  { id: 'chambers', module: './chambers/index.js', needs: ['ground', 'render'] },
  { id: 'player', module: './player/controller.js', needs: ['ground'] },
  { id: 'weapons', module: './weapons/fire.js', needs: ['render', 'player'] },
  { id: 'projectiles', module: './combat/projectiles.js', needs: ['ground', 'render'] },
  { id: 'enemies', module: './enemies/manager.js', needs: ['chambers', 'player'] },
  { id: 'economy', module: './combat/economy.js', needs: ['chambers', 'player'] },
  // THE DAMP is manifested from BOOT, not constructed when THE APERTURE loads.
  // It keeps the run archive — every chamber's scars, recorded as the run happens
  // — and chambers/index.js resets the light field inside its own dispose, during
  // the fade. A boss built at the top of the tower would find the archive empty
  // and the ending would restore nothing.
  { id: 'damp', module: './enemies/damp.js', needs: ['chambers', 'enemies', 'render'] },
  // --- remaining workstreams land here, in this order ---
  // { id: 'director', module: './director/waves.js', needs: ['enemies'] },

  // Audio is LAST, and stays last as systems are added: update() re-pins the
  // AudioListener to ctx.camera.matrixWorld for THIS frame, so it must run after
  // whatever moved the camera or the entire soundfield is one frame stale — which
  // in a game where the mix is the map is a lie about where the room is.
  { id: 'audio', module: './audio/index.js', needs: [] },
];

// ---------------------------------------------------------------------------

const ui = {
  canvas: document.getElementById('view'),
  start: document.getElementById('start'),
  begin: document.getElementById('begin'),
  flashsafe: document.getElementById('flashsafe'),
  fail: document.getElementById('fail'),
  failWhy: document.getElementById('fail-why'),
  overlay: document.getElementById('overlay'),
  reticle: document.getElementById('reticle'),
  frost: document.getElementById('frost'),
  vignette: document.getElementById('vignette'),
};

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The context every system receives. Nothing reaches around it. */
const ctx = {
  build: BUILD,
  THREE,
  canvas: ui.canvas,
  ui,
  rng: new Rng('flare'),
  time: new TimeSystem(new Rng('flare')),
  light: null,
  renderer: null,
  scene: null,
  camera: null,
  systems: new Map(),
  // SAFETY.md: reduced-motion implies flash-safe, and the toggle is offered
  // before play rather than buried in a pause menu.
  flashSafe: prefersReducedMotion,
  reducedMotion: prefersReducedMotion,
  quality: 'medium',
  running: false,
  frameStats: { fps: 0, draws: 0, tris: 0, programs: 0 },
};

function fail(why) {
  ctx.running = false;
  if (ui.fail) { ui.fail.hidden = false; if (ui.failWhy) ui.failWhy.textContent = why; }
  if (ui.start) ui.start.hidden = true;
  const api = window.__FLARE;
  if (api) { api.ready = false; api.error = why; }
  console.error('[flare] ' + why);
}

async function boot() {
  if (!ui.canvas) return fail('The canvas is missing from the page.');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: ui.canvas,
      antialias: false,            // D11: SMAA as a post pass, never MSAA + never TAA
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false,
    });
  } catch (e) {
    return fail('WebGL could not start: ' + (e && e.message || e));
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  // HANDOFF traps 4 and 5, paid for in the sibling project: anything that renders
  // extra passes must respect both of these, so they are set once, here.
  renderer.autoClear = false;
  renderer.info.autoReset = false;

  ctx.renderer = renderer;
  ctx.scene = new THREE.Scene();
  // NO scene.background. WebGLBackground sets forceClear = true for a Color
  // background, and forceClear IGNORES autoClear = false — it would wipe the HDR
  // target between P1/P2/P3/P4 and silently delete four passes. The clear colour
  // is owned by the frame graph.
  renderer.setClearColor(0x050608, 1);
  ctx.camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.05, 400);
  ctx.camera.rotation.order = 'YXZ';
  ctx.camera.position.set(0, 1.68, 0);

  ctx.light = new LightField(ctx.rng);
  ctx.systems.set('lightfield', ctx.light);

  // Construct every manifested system, in order. A missing module is fatal.
  for (const entry of SYSTEMS) {
    if (!entry.module) continue;
    let mod;
    try {
      mod = await import(entry.module);
    } catch (e) {
      return fail(`System "${entry.id}" is in the manifest but failed to load (${entry.module}): ${e && e.message || e}`);
    }
    if (typeof mod.create !== 'function') {
      return fail(`System "${entry.id}" (${entry.module}) does not export create(ctx).`);
    }
    for (const need of entry.needs) {
      if (!ctx.systems.has(need)) return fail(`System "${entry.id}" needs "${need}", which is not constructed before it.`);
    }
    ctx.systems.set(entry.id, await mod.create(ctx));
  }

  // ---- cross-system wiring ------------------------------------------------
  // Systems are constructed in manifest order and must never reach for each
  // other at construction time: `projectiles` is built before `enemies` exists,
  // and `enemies` before the director will. Rather than let each system guess
  // when its neighbours are ready, the integrator connects them here, once, in
  // one place, where the ordering is visible and reviewable.
  {
    const enemies = ctx.systems.get('enemies');
    const projectiles = ctx.systems.get('projectiles');
    if (enemies && projectiles && typeof projectiles.setTargets === 'function') {
      // The live array, not a copy — the roster is reused every frame and a copy
      // would hand the projectile pass last frame's dead.
      projectiles.setTargets(() => ctx.enemies.list);
    }
    if (enemies && typeof ctx.enemies?.wire === 'function') ctx.enemies.wire();
  }

  // Every system that declares injected dependencies proves they landed, BEFORE
  // the player can press Begin. A system with a silent placeholder provider is
  // the quiet version of this project's named failure mode: it does not crash,
  // it just does the wrong thing forever — a gun that shoots down -Z, a mix with
  // no hostiles in it — and nothing in a screenshot says so.
  for (const [id, sys] of ctx.systems) {
    if (!sys || typeof sys.ready !== 'function') continue;
    try { sys.ready(); } catch (e) { return fail(`System "${id}" is not wired: ${e && e.message || e}`); }
  }

  addEventListener('resize', onResize, { passive: true });
  onResize();

  if (ui.begin) ui.begin.addEventListener('click', start);
  if (ui.flashsafe) {
    ui.flashsafe.checked = ctx.flashSafe;
    ui.flashsafe.addEventListener('change', () => { ctx.flashSafe = ui.flashsafe.checked; });
  }

  installTestApi();
  window.__FLARE.ready = true;

  // Render one frame behind the start screen so the first frame of play is not
  // also the first frame the driver has ever compiled.
  renderer.clear();
  renderer.render(ctx.scene, ctx.camera);
}

function onResize() {
  if (!ctx.renderer) return;
  const w = innerWidth, h = innerHeight;
  ctx.renderer.setSize(w, h, false);
  ctx.camera.aspect = w / h;
  ctx.camera.updateProjectionMatrix();
  for (const sys of ctx.systems.values()) if (sys && typeof sys.resize === 'function') sys.resize(w, h);
}

function start() {
  if (ctx.running) return;
  if (ui.start) ui.start.hidden = true;
  ctx.running = true;
  ctx.canvas.requestPointerLock?.();
  last = performance.now();
  requestAnimationFrame(frame);
}

let last = 0;
let fpsAccum = 0, fpsFrames = 0;

function frame(now) {
  if (!ctx.running) return;
  requestAnimationFrame(frame);

  const realDt = Math.min((now - last) / 1000, 0.25);
  last = now;

  const { steps, rdt } = ctx.time.begin(realDt);

  ctx.light.beginFrame();

  // Fixed-step simulation. Systems that move the world implement step(dt).
  for (let i = 0; i < steps; i++) {
    for (const sys of ctx.systems.values()) if (sys && typeof sys.step === 'function') sys.step(FIXED_DT);
  }

  // Presentation. Runs at render dt, which keeps integrating during hitstop so a
  // hit punches instead of stalling (core/time.js, RULE 1).
  for (const sys of ctx.systems.values()) if (sys && typeof sys.update === 'function') sys.update(rdt, ctx.time);

  ctx.renderer.info.reset();
  ctx.renderer.clear();

  const graph = ctx.systems.get('render');
  if (graph && typeof graph.render === 'function') graph.render();
  else ctx.renderer.render(ctx.scene, ctx.camera);

  const info = ctx.renderer.info;
  ctx.frameStats.draws = info.render.calls;
  ctx.frameStats.tris = info.render.triangles;
  ctx.frameStats.programs = info.programs ? info.programs.length : 0;

  fpsAccum += realDt; fpsFrames++;
  if (fpsAccum >= 0.5) { ctx.frameStats.fps = fpsFrames / fpsAccum; fpsAccum = 0; fpsFrames = 0; }
}

// ---------------------------------------------------------------------------
// The test surface. Every game in this portfolio has one; the harness is useless
// without it. Anything the gate needs to assert is exposed here and nowhere else.
// ---------------------------------------------------------------------------
function installTestApi() {
  window.__FLARE = {
    ready: false,
    error: null,
    build: BUILD,
    ctx,
    manifest: () => SYSTEMS.map(s => s.id),
    constructed: () => [...ctx.systems.keys()],
    frameStats: () => ({ ...ctx.frameStats }),
    lightTotal: () => ctx.light.total,
    scarCount: () => ctx.light.count,
    illuminationAt: (x, y, z) => ctx.light.illuminationAt(x, y, z),
    setFlashSafe: v => { ctx.flashSafe = !!v; },
    warmProgress: () => ctx.warmProgress ?? 1,
    warmStage: () => ctx.warmStage ?? 'done',
    start,
    /** Deterministic stepper — advances the sim without depending on frame rate. */
    advance(seconds) {
      const steps = Math.round(seconds / FIXED_DT);
      for (let i = 0; i < steps; i++) {
        for (const sys of ctx.systems.values()) if (sys && typeof sys.step === 'function') sys.step(FIXED_DT);
      }
      return steps;
    },
  };
}

boot().catch(e => fail((e && e.stack) || String(e)));
