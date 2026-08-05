// CINDERBLOOM — boot, fixed-step loop, and the window.__CB test surface.
// ORCHESTRATOR-OWNED (docs/CONTRACT.md §4). Systems are registered from MANIFEST;
// to add a system, add its module here and give it a `static id`.
import * as THREE from 'three';
import { createContext } from './engine/context.js';
import { Ring, luma, clamp } from './util/math.js';

import { Renderer } from './engine/renderer.js';
import { Shadows } from './engine/shadows.js';
// post stack — every one of these self-registers a frame-graph pass in init().
// If a class is missing from MANIFEST its pass slot is EMPTY and a green smoke
// run says nothing about it. That was the state this file shipped in.
import { GTAO } from './engine/post/gtao.js';
import { Volumetrics } from './engine/post/volumetrics.js';
import { TAA } from './engine/post/taa.js';
import { MotionBlur } from './engine/post/motionblur.js';
import { DOF } from './engine/post/dof.js';
import { Bloom } from './engine/post/bloom.js';
import { Grade } from './engine/post/grade.js';
import { Sky } from './world/sky.js';
import { Terrain } from './world/terrain.js';
import { Flora } from './world/flora.js';
import { Props } from './world/props.js';
import { Water } from './world/water.js';
import { VFX } from './world/vfx.js';
import { Physics } from './game/physics.js';
import { Input } from './game/input.js';
import { Player } from './game/player.js';
import { Weapons } from './game/weapons.js';
import { Enemies } from './game/enemies.js';
import { Combat } from './game/combat.js';
import { Director } from './game/director.js';
import { Audio } from './audio/audio.js';
import { HUD } from './ui/hud.js';
import { Menu } from './ui/menu.js';

// Order here is registration order, not execution order — the frame graph sorts
// passes by their numeric `order`, and initAll() topo-sorts by `static deps`.
// Grade is last by convention: it owns the final blit at order 110.
const MANIFEST = [
  Renderer, Shadows, Sky, Terrain, Flora, Props, Water, VFX,
  GTAO, Volumetrics, TAA, MotionBlur, DOF, Bloom, Grade,
  Physics, Input, Player, Weapons, Enemies, Combat, Director,
  Audio, HUD, Menu,
];

const FIXED = 1 / 60;
const MAX_STEPS = 5;
// Set by the first inline script in index.html from Navigation Timing. Keeping
// the mark outside this module includes HTML, module fetch, parse and evaluation
// instead of reporting only the work that happened after all imports resolved.
const BOOT_STARTED_AT = Number.isFinite(window.__CB_BOOT_START) ? window.__CB_BOOT_START : 0;

const el = {
  boot: document.getElementById('boot'),
  bar: document.getElementById('boot-bar'),
  stage: document.getElementById('boot-stage'),
  err: document.getElementById('boot-err'),
  canvas: document.getElementById('gl'),
  ui: document.getElementById('ui'),
};

const API = {
  ready: false,
  shellReady: Number.isFinite(window.__CB_SHELL_READY_AT),
  shellPaintMs: Number.isFinite(window.__CB_SHELL_READY_AT) ? window.__CB_SHELL_READY_AT - BOOT_STARTED_AT : null,
  bootStage: 'starting',
  bootError: null,
  bootMs: null,
  contextLost: false,
  contextLossCount: 0,
  contextRecovery: 'available',
  version: '0.2.0',
};
window.__CB = API;
window.addEventListener('cinderbloom:shell-ready', () => {
  API.shellReady = true;
  API.shellPaintMs = window.__CB_SHELL_READY_AT - BOOT_STARTED_AT;
}, { once: true });

let ctx = null;
let accumulator = 0;
let lastWall = 0;
let running = true;
let contextLost = false;
let recoveryReloadQueued = false;
let bootPoll = null;
const frameTimes = new Ring(240);

installGraphicsContextRecovery();
boot().catch(fatal);

/**
 * A WebGL context can disappear because of a driver reset, GPU switch, or the
 * browser reclaiming resources. Three can rebuild its own internal state after
 * `webglcontextrestored`, but CINDERBLOOM also owns render targets, histories,
 * procedural textures, and shadow atlases across two dozen systems. Trying to
 * resume that half-restored graph is corrupt-state roulette, so the safe policy
 * is: freeze immediately, explain the interruption, then reload once the
 * browser says WebGL is available again.
 */
function installGraphicsContextRecovery() {
  el.canvas.addEventListener('webglcontextlost', event => {
    // The WebGL specification only attempts restoration when the loss event is
    // cancelled. Do this even for a duplicate event.
    event.preventDefault();
    if (contextLost) return;

    contextLost = true;
    running = false;
    accumulator = 0;
    if (bootPoll !== null) {
      clearInterval(bootPoll);
      bootPoll = null;
    }

    API.ready = false;
    API.contextLost = true;
    API.contextLossCount += 1;
    API.contextRecovery = 'waiting-for-webgl';
    API.bootStage = 'graphics context lost';

    // Do not leave an apparently dead black canvas under an invisible loading
    // screen. This same node works during boot and during active play, and the
    // live-region/focus pair makes the recovery state explicit to screen-reader
    // users as well as sighted players.
    el.boot.classList.remove('done');
    el.boot.setAttribute('role', 'alert');
    el.boot.setAttribute('aria-live', 'assertive');
    el.boot.setAttribute('aria-atomic', 'true');
    el.boot.setAttribute('tabindex', '-1');
    el.bar.style.width = '100%';
    el.stage.textContent = 'graphics device interrupted';
    el.err.textContent = 'CINDERBLOOM has paused safely. Waiting for WebGL to recover; the game will restart automatically. If recovery does not begin, reload this page.';
    el.ui.setAttribute('aria-hidden', 'true');
    el.canvas.setAttribute('aria-hidden', 'true');
    try { el.boot.focus({ preventScroll: true }); } catch { el.boot.focus(); }

    // Release captured input and silence the current graph while no frames are
    // being presented. All state is rebuilt by the controlled reload below.
    try { document.exitPointerLock?.(); } catch { /* browser owns pointer lock */ }
    try { ctx?.sys?.input?.resetTemporal?.(); } catch { /* context may die during boot */ }
    try { ctx?.sys?.audio?.mute?.(true); } catch { /* audio may not exist yet */ }
  }, false);

  el.canvas.addEventListener('webglcontextrestored', () => {
    if (!contextLost || recoveryReloadQueued) return;
    recoveryReloadQueued = true;
    API.contextRecovery = 'restarting';
    API.bootStage = 'graphics restored; restarting';
    el.stage.textContent = 'graphics restored';
    el.err.textContent = 'Restarting CINDERBLOOM to rebuild every graphics resource safely…';

    // Let the restoration event finish (including Three's own listener) and
    // give the live region one paint before replacing the document.
    setTimeout(() => window.location.reload(), 250);
  }, false);
}

async function boot() {
  // BOOT PRESET: `medium`, not `high`. Measured on the development machine
  // (GTX 980M, a 2014 laptop GPU) at 1600x900 with EXT_disjoint_timer_query:
  //   low 43.1 fps / 29.7 ms   medium 28.8 / 45.4   high 19.2 / 62.7   ultra 9.9 / 105.9
  // `high` was the boot preset for most of development and was never playable on
  // that hardware. `medium` keeps GTAO, DOF, motion blur, TAA and bloom and drops
  // resolution, shadow cascades and draw distance — the smaller visual loss (see
  // the ladder rationale at the top of engine/context.js). On a modern desktop GPU
  // `high` and `ultra` are the intended settings; change it in the menu or call
  // window.__CB.setQuality('high') from the console.
  ctx = createContext({ canvas: el.canvas, seed: 'thessaly-9', preset: 'medium' });
  window.__CB.ctx = ctx;

  for (const S of MANIFEST) ctx.register(S);

  ctx.bus.on('bootStage', name => { el.stage.textContent = name; });

  const total = ctx._systems.length;
  let done = 0;
  const origInit = ctx.initAll;
  ctx.initAll = async () => {
    // wrap so the loading bar reflects real progress across systems
    const order = ctx._systems;
    void order;
    return origInit();
  };

  // progress reporting: poll bootStage while initAll runs
  bootPoll = setInterval(() => {
    if (contextLost) return;
    API.bootStage = ctx.bootStage;
    el.stage.textContent = ctx.bootStage;
    done = ctx._ordered ? total : done;
    const p = clamp(ctx.boot.progress || (done / total), 0, 1);
    el.bar.style.width = (p * 100).toFixed(1) + '%';
  }, 60);

  resize();
  window.addEventListener('resize', resize, { passive: true });

  await ctx.initAll();          // constructs GPU resources per system
  if (contextLost) return;
  await ctx.boot.run((stage, p) => {
    if (contextLost) return;
    API.bootStage = stage;
    el.stage.textContent = stage;
    el.bar.style.width = (p * 100).toFixed(1) + '%';
  });
  if (contextLost) return;

  clearInterval(bootPoll);
  bootPoll = null;
  balanceFrame(ctx);
  // Prime streaming/LOD/culling state before the first GPU submission. The old
  // boot rendered without ever updating a system, so every authored instance
  // stream submitted its maximum prefix: 2,766 calls on frame one versus ~400
  // after the first gameplay tick. One deterministic fixed step establishes
  // the same initial state the player will actually see and compile.
  step(FIXED);
  el.stage.textContent = 'compiling shaders';
  API.bootStage = 'compiling shaders';
  // Start the driver's parallel batch, then validate the real frame graph while
  // it is in flight. Awaiting the whole batch first serialized 12 s of compile
  // and 17 s of first-draw pipeline realization even though the driver can do
  // both concurrently. Readiness still waits for both below.
  const compilePromise = compileVisibleSceneShaders(ctx);
  el.bar.style.width = '100%';
  el.stage.textContent = 'validating renderer';

  // prime: compile shaders and settle temporal buffers before the curtain lifts
  const primeStarted = performance.now();
  const primeFrames = [];
  const knownPrograms = new Set((ctx.renderer.info.programs || []).map(p => p.id));
  const primePrograms = [];
  for (let i = 0; i < 8; i++) {
    if (i === 0) ctx.debug.profileNextFrame = true;
    API.bootStage = `validating frame ${i + 1}/8`;
    el.stage.textContent = API.bootStage;
    const row = await new Promise(resolve => requestAnimationFrame(() => {
      const frameStarted = performance.now();
      renderOnce();
      const info = ctx.renderer.info;
      resolve({
        frame: i + 1,
        ms: +(performance.now() - frameStarted).toFixed(1),
        programs: info.programs?.length || 0,
        textures: info.memory?.textures || 0,
        calls: info.render?.calls || 0,
      triangles: info.render?.triangles || 0,
      profile: i === 0 ? ctx.debug.frameProfile || null : null,
      });
    }));
    primeFrames.push(row);
    for (const program of (ctx.renderer.info.programs || [])) {
      if (knownPrograms.has(program.id)) continue;
      knownPrograms.add(program.id);
      primePrograms.push({
        frame: i + 1,
        id: program.id,
        name: program.name || '(unnamed)',
        type: program.type || '(unknown)',
        cacheKey: String(program.cacheKey || '').slice(-180),
      });
    }
    ctx.debug.bootTimings.push({
      stage: `shader prime frame ${i + 1}`, kind: 'prime-frame', ms: row.ms,
    });
  }
  ctx.debug.primeFrames = primeFrames;
  ctx.debug.primePrograms = primePrograms;
  ctx.debug.bootTimings.push({
    stage: 'shader prime', kind: 'prime', ms: +(performance.now() - primeStarted).toFixed(1),
  });
  await compilePromise;
  if (contextLost) return;

  el.boot.classList.add('done');
  API.bootMs = performance.now() - BOOT_STARTED_AT;
  API.ready = true;
  API.bootStage = 'ready';
  ctx.bus.emit('ready');

  lastWall = performance.now();
  requestAnimationFrame(loop);
}

/**
 * Submit the final enriched world and viewmodel program families together so
 * KHR_parallel_shader_compile can do the driver work concurrently. This runs
 * only after every boot task has created its scene objects, after cross-pass
 * tuning, and after the exact renderer/CSM material wrappers used for shipping
 * have been installed. The validation renders below remain mandatory because
 * compilation does not allocate or validate the framebuffer chain.
 */
async function compileVisibleSceneShaders(c) {
  const webgl = c.renderer;
  const rd = c.sys.renderer;
  if (!webgl?.compileAsync || !rd?.mrt) return;

  rd._scanScene?.();
  c.sys.shadows?._scan?.();

  const parallel = !!c.gl.getExtension('KHR_parallel_shader_compile');
  c.debug.parallelShaderCompile = parallel;
  const started = performance.now();
  const programsBefore = webgl.info.programs?.length || 0;
  const oldTarget = webgl.getRenderTarget();
  const worldMask = c.camera.layers.mask;
  const viewMask = c.viewCamera.layers.mask;
  // Several passes finalize compile-time defines lazily on first execution.
  // Synchronize them before collection or the warm batch compiles a variant the
  // shipping frame immediately discards.
  c.sys.gtao?._syncDefines?.();
  const postMaterials = collectWarmupMaterials(c);
  const finalMaterials = new Set([
    c.sys.grade?._mats?.grade,
    c.sys.grade?._mats?.fallback,
  ].filter(Boolean));
  for (const m of finalMaterials) postMaterials.delete(m);

  const makeCompileScene = materials => {
    const scene = new THREE.Scene();
    for (const material of materials) {
      const mesh = new THREE.Mesh(rd._fsGeo, material);
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
    return scene;
  };
  const postScene = makeCompileScene(postMaterials);
  const finalScene = makeCompileScene(finalMaterials);
  try {
    // Program parameters include the current output target. Compile against
    // the real four-attachment HDR MRT, with all world layers represented.
    webgl.setRenderTarget(rd.mrt);
    c.camera.layers.mask = 0xffffffff;
    c.viewCamera.layers.mask = 0xffffffff;
    c.scene.updateMatrixWorld(true);
    c.viewScene.updateMatrixWorld(true);
    c.camera.updateMatrixWorld(true);
    c.viewCamera.updateMatrixWorld(true);
    // Each compileAsync call performs its synchronous traversal before
    // returning a polling promise. Submit every family before awaiting any of
    // them so the driver sees one parallel batch instead of serial batches.
    const jobs = [
      webgl.compileAsync(c.scene, c.camera),
      webgl.compileAsync(c.viewScene, c.viewCamera),
      webgl.compileAsync(postScene, rd._fsCam),
    ];
    // Grade/fallback draw to the canvas, whose output colour-space variant is
    // deliberately distinct from the linear HDR intermediates.
    webgl.setRenderTarget(null);
    if (finalMaterials.size) jobs.push(webgl.compileAsync(finalScene, rd._fsCam));
    jobs.push(c.sys.shadows?.compileAsync?.() || Promise.resolve());
    // Program compilation now runs in the driver. Use that same wall-clock
    // window to upload immutable textures and realize already-authored render
    // targets; otherwise both costs serialize behind the first real frame.
    jobs.push(warmStaticGpuResources(c).then(result => { c.debug.resourceWarmup = result; }));
    // The promises retain every program/material they poll. Restore live render
    // state before yielding so validation frames use authored layer masks and
    // targets while compilation continues in the driver.
    c.camera.layers.mask = worldMask;
    c.viewCamera.layers.mask = viewMask;
    webgl.setRenderTarget(oldTarget);
    await Promise.all(jobs);
  } finally {
    c.camera.layers.mask = worldMask;
    c.viewCamera.layers.mask = viewMask;
    webgl.setRenderTarget(oldTarget);
  }
  c.debug.bootTimings.push({
    stage: parallel ? 'parallel scene compile' : 'scene compile',
    kind: 'compile', ms: +(performance.now() - started).toFixed(1),
  });
  c.debug.shaderWarmup = {
    parallel,
    postMaterials: postMaterials.size,
    finalMaterials: finalMaterials.size,
    programsBefore,
    programsAfter: webgl.info.programs?.length || 0,
  };
}

async function warmStaticGpuResources(c) {
  const renderer = c.renderer;
  const textures = new Set();
  const targets = new Set();
  const seen = new Set();
  const visit = (value, depth = 0) => {
    if (!value || depth > 4 || seen.has(value)) return;
    if (value.isTexture) {
      if (!value.isRenderTargetTexture) textures.add(value);
      return;
    }
    if (value.isWebGLRenderTarget) { targets.add(value); return; }
    if (typeof value !== 'object') return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, depth + 1);
      return;
    }
    if (value.isMaterial) {
      for (const entry of Object.values(value)) visit(entry, depth + 1);
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      for (const entry of Object.values(value)) visit(entry, depth + 1);
    }
  };

  visit(c.scene.environment);
  visit(c.scene.background);
  c.scene.traverse(object => {
    visit(object.material);
    visit(object.customDepthMaterial);
    visit(object.customDistanceMaterial);
  });
  c.viewScene.traverse(object => visit(object.material));
  for (const system of Object.values(c.sys)) {
    for (const value of Object.values(system)) visit(value);
  }

  const started = performance.now();
  let uploaded = 0;
  for (const texture of textures) {
    renderer.initTexture(texture);
    uploaded++;
  }
  const afterTextures = performance.now();
  const oldTarget = renderer.getRenderTarget();
  let initializedTargets = 0;
  for (const target of targets) {
    renderer.setRenderTarget(target);
    initializedTargets++;
  }
  renderer.setRenderTarget(oldTarget);
  const afterTargets = performance.now();

  return {
    textures: uploaded,
    targets: initializedTargets,
    textureMs: +(afterTextures - started).toFixed(1),
    targetMs: +(afterTargets - afterTextures).toFixed(1),
  };
}

/** Collect direct and plain-object-owned shader materials without descending
 * into scene graphs, uniforms, textures, or the context's cyclic structures. */
function collectWarmupMaterials(c) {
  const out = new Set();
  const inspect = (value, depth) => {
    if (!value || depth > 2) return;
    if (value.isRawShaderMaterial || value.isShaderMaterial) { out.add(value); return; }
    if (Array.isArray(value)) {
      for (const entry of value) inspect(entry, depth + 1);
      return;
    }
    const proto = typeof value === 'object' ? Object.getPrototypeOf(value) : null;
    if (proto === Object.prototype || proto === null) {
      for (const entry of Object.values(value)) inspect(entry, depth + 1);
    }
  };
  for (const system of Object.values(c.sys)) {
    for (const value of Object.values(system)) inspect(value, 0);
  }
  return out;
}

/**
 * CROSS-PASS BALANCE. Seven post passes were each tuned in isolation against
 * the same scene, so every one of them is individually defensible and the
 * combination over-cooks. This is the one place the frame is balanced as a
 * single photographed image; it only ever writes to other systems' PUBLISHED
 * knob objects (`ctx.debug.*`), never into their files.
 *
 * Runs once after initAll(), so a pass that failed to register is simply
 * absent and every line here is optional.
 */
function balanceFrame(c) {
  const d = c.debug;

  // --- depth of field -------------------------------------------------------
  // dof.js defaults to 12 m at f/3.5, which is a hipfire *viewmodel* lens: it
  // puts the near limit at ~7 m and the far limit at ~40 m, so on any
  // environment shot the entire landscape is defocused and the tile-dilated
  // near field staircases along every depth discontinuity. No shipped FPS
  // blurs the world at hipfire. f/5.6 at 26 m with a 40 mm lens is past
  // hyperfocal (H = 9.5 m): infinity stays razor sharp and only geometry
  // inside ~7 m softens, which is the foreground separation we actually want.
  // ADS keeps its shallow 26 m / f2.0 — that pull is the whole point of ADS.
  if (d.dof) {
    d.dof.hipfire.distance = 26.0;
    d.dof.hipfire.fStop = 5.6;
    d.dof.focusDistance = 26.0;
    d.dof.fStop = 5.6;
    c.sys.dof?.setFocus?.(26.0, 5.6, 0);
  }

  // --- volumetrics ----------------------------------------------------------
  // Sky.js's FogExp2 is gone (it double-counted and was ~20x too dense), so
  // this pass is now the only medium in the frame and no longer has to sit
  // under anything. But at density 1.0 it grey-veils the whole midground: it
  // cost the frame ~900 distinct colours and flattened the ridge separation
  // that aerial perspective is supposed to CREATE.
  if (d.vol) {
    d.vol.intensity = 0.85;
    applyWeatherDensity(c, c.sys.sky?.weather);
  }

  // --- bloom ----------------------------------------------------------------
  // Energy-conserving, so `strength` is literally the fraction of light the
  // lens scatters. 0.058 is a clean modern lens; this world is meant to read
  // as a slightly dirty helmet optic, and it is the only pass that puts light
  // *around* a silhouette. Nudged up, with the dirt held back so the frame
  // does not read as filthy in every shot.
  if (d.bloom) {
    d.bloom.strength = 0.075;
    d.bloom.dirtIntensity = 0.22;
    // More of the (fixed) energy budget in the WIDE mips. At scatter 0.55 the
    // sun's glare fell off inside ~40 px and read as a hard-edged disc; a real
    // coated optic puts a low, broad skirt across a third of the frame.
    d.bloom.scatter = 0.68;
    // The anamorphic streak was rendering as a hard-ended white LOZENGE beside
    // the sun — a truncated gaussian reads as a bar, not a flare. Halved, so it
    // is a hint of horizontal smear rather than a graphic element.
    // 0.065 -> 0.014: the streak is a hint, not a graphic element. Above ~0.02
    // the sun's core radiance (260) still clips the smeared result to flat
    // white, which is what gave it a hard edge no amount of blur softened.
    d.bloom.streakIntensity = 0.014;
  }

  // --- particulate ----------------------------------------------------------
  // THE SINGLE LOUDEST OVER-COOK IN THE COMBINED FRAME. vfx.js's `mote`
  // stratum is 12% of a 20 000-instance budget packed into a 7.5 x 5.5 x 7.5 m
  // box centred on the camera, at alpha 0.90. In isolation that is exactly ART
  // §6.5's near-field particulate and it is defensible. In combination — over a
  // frame that now also has flora, props, water spray and a DOF near field —
  // it puts 150+ hard white discs across every shot, 10-30 px each because they
  // sit inside the near focus limit and DOF blows them up. `mat-ground`, a shot
  // whose entire purpose is to show the ground material, was 30% covered by
  // them; with this cut the craquelure, the crack rims and the plate stipple
  // are legible for the first time. Nothing here changes vfx.js's identity:
  // the layer is still present, still lit, still wind-advected — there is
  // simply an order of magnitude less of it, which is what "photographed"
  // rather than "simulated" looks like.
  //
  // moteGain multiplies the near stratum only; dustGain and sizeGain also pull
  // the mid-field `flake`/`grit` layers back, which were reading as snow.
  if (d.vfx) {
    d.vfx.moteGain = 0.12;
    d.vfx.dustGain = 0.72;
    d.vfx.sizeGain = 0.75;
  }

  // --- viewmodel muzzle light -----------------------------------------------
  // weapons.js authors the muzzle flash light in CANDELA (22 000 cd, decay 2),
  // which is a defensible photometric number and is the right order for a real
  // rifle. This renderer is not photometric: it is scene-referred with sunlit
  // ash near radiance 1.0 and Sky.js's sun irradiance at ~4.2, and the flash
  // light sits 0.30 m from the weapon. 22 000 / 0.30^2 is a quarter of a
  // million against a key of four, so for the 60 ms the flash lives the gun is
  // a flat white card and every material read on it is gone — which is what
  // `hipfire` and `combat` were capturing. This is the same class of problem as
  // the particulate below: the pass is right, the unit system is not shared.
  // 900 keeps the flash the brightest thing in the frame and still lets the
  // anodise, the wear bands and the ash read through it (measured: gun-region
  // mean 0.58 against 0.73 at the authored value, with the flash still 4 stops
  // over the ambient gun).
  if (d.weapon) d.weapon.muzzleLightCd = 900;

  // --- ambient occlusion ----------------------------------------------------
  // The multi-bounce sign fix in renderer.js means AO now DARKENS instead of
  // brightening, so its intensity was tuned against an inverted curve. 1.0 is
  // ground truth; keep it there and let content supply the occluders.
  if (d.gtao) d.gtao.intensity = 1.0;

  // --- grade ----------------------------------------------------------------
  // DELIBERATELY EMPTY. grade.js's AREAS table re-authors slope/offset/power/
  // vignette/grain/sharpen and the whole EV window every time `setArea` runs,
  // and gotoVista calls setArea. Anything written to ctx.debug.grade here is
  // silently reverted on the first vista change, so tuning the frame through
  // it would have looked like it worked and shipped nothing. The per-area look
  // is grade.js's authored content and it is good; the flatness in this build
  // is upstream of it (medium density and an unlit night key), not in it.
  // `ctx.sys.grade.setAreaEV({min, max, bias})` is the sanctioned override if
  // an area ever does need pulling.
  void d;
}

// Weather -> volumetric density. volumetrics.js's WEATHER table multiplies
// sigma_s by 5.5 at 'spore' and 7.0 at 'storm'; against a 600 m march that
// drives transmittance at 150 m to nearly zero and the frame becomes a flat
// grey card — `storm` measured 445 distinct colours and stdLuma 0.117, i.e.
// the world was gone. These multipliers keep the ORDERING (each weather is
// thicker than the last: effective sigma_s runs 0.62 / 0.95 / 1.21 / 1.26)
// while leaving something to look at. This is exactly the "individually tuned,
// collectively over-cooked" case: the pass is right, the combination was not.
const VOL_BY_WEATHER = { clear: 0.62, haze: 0.45, spore: 0.22, storm: 0.18, rain: 0.55 };

function applyWeatherDensity(c, weather) {
  if (c.debug.vol) c.debug.vol.density = VOL_BY_WEATHER[weather] ?? VOL_BY_WEATHER.clear;
}

function resize() {
  if (!ctx || contextLost) return;
  const w = Math.max(1, window.innerWidth | 0);
  const h = Math.max(1, window.innerHeight | 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.setSize(w, h, dpr);
}

function step(dt) {
  if (!ctx || contextLost) return false;
  ctx.time.dt = dt;
  ctx.time.elapsed += dt;
  ctx.time.frame++;
  ctx.updateWorldSignal();      // one gust scalar every shader reads in phase
  const list = ctx._ordered || ctx._systems;
  for (let i = 0; i < list.length; i++) list[i].update?.(dt);
  for (let i = 0; i < list.length; i++) list[i].lateUpdate?.(dt);
  return true;
}

function renderOnce() {
  if (!ctx || contextLost) return false;
  ctx.sys.renderer.renderFrame();
  return true;
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!running || contextLost) return;
  // A paused/title screen still needs hover and animation feedback, but drawing
  // the full 3D world at display refresh wastes the same GPU frame as gameplay.
  // Hidden tabs draw nothing; paused screens refresh at 15 Hz and reset wall
  // time on skipped frames so resuming never triggers a catch-up burst.
  if (document.hidden) { lastWall = now; return; }
  if (ctx.time.scale === 0 && now - (loop.lastIdleRender || 0) < 1000 / 15) {
    lastWall = now;
    return;
  }
  if (ctx.time.scale === 0) loop.lastIdleRender = now;
  const wall = Math.min((now - lastWall) / 1000, 0.25);
  lastWall = now;
  ctx.time.wall += wall;
  frameTimes.push(wall * 1000);

  accumulator += wall * ctx.time.scale;
  let steps = 0;
  while (accumulator >= FIXED && steps < MAX_STEPS) {
    step(FIXED);
    accumulator -= FIXED;
    steps++;
  }
  if (steps === MAX_STEPS) accumulator = 0; // hard catch-up guard
  ctx.time.alpha = accumulator / FIXED;
  renderOnce();
}

function fatal(e) {
  // A driver loss can reject an in-flight boot task. The recovery overlay is
  // already the authoritative state; reporting that expected rejection as a
  // boot failure would replace useful recovery instructions with a stack.
  if (contextLost) return;
  API.bootError = (e && (e.stack || e.message)) || String(e);
  el.err.textContent = API.bootError;
  el.stage.textContent = 'boot failed';
  console.error(e);
}

// ---------------------------------------------------------------------------
// window.__CB — the harness/critic surface. Contract §6.
// ---------------------------------------------------------------------------
Object.assign(API, {
  advance(seconds) {
    const n = Math.round(seconds * 60);
    for (let i = 0; i < n; i++) step(FIXED);
    return ctx.time.elapsed;
  },
  renderFrames(n = 1) {
    for (let i = 0; i < n; i++) renderOnce();
    return ctx.time.frame;
  },

  /**
   * Render n frames INSIDE rAF callbacks with the sim paused.
   * Screenshots must use this, not renderFrames(): with
   * preserveDrawingBuffer:false the compositor only picks up the canvas on a
   * committed animation frame, so out-of-rAF renders capture as black.
   */
  async settle(n = 12) {
    const wasRunning = running;
    running = false;
    for (let i = 0; i < n; i++) {
      await new Promise(res => requestAnimationFrame(() => { renderOnce(); res(); }));
    }
    running = wasRunning;
    lastWall = performance.now();
    return ctx.time.frame;
  },
  pause() { running = false; },
  resume() {
    if (contextLost) return false;
    running = true;
    lastWall = performance.now();
    return true;
  },

  frameStats() {
    renderOnce();
    const gl = ctx.gl;
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0, sum2 = 0, blown = 0, crushed = 0, n = 0;
    const seen = new Set();
    const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 260000)));
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const i = (y * w + x) * 4;
        const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
        const L = luma(r, g, b);
        sum += L; sum2 += L * L; n++;
        if (r > 0.985 && g > 0.985 && b > 0.985) blown++;
        if (L < 0.004) crushed++;
        if (seen.size < 70000) seen.add((px[i] >> 2 << 12) | (px[i + 1] >> 2 << 6) | (px[i + 2] >> 2));
      }
    }
    const mean = sum / n;
    return {
      meanLuma: mean,
      stdLuma: Math.sqrt(Math.max(0, sum2 / n - mean * mean)),
      uniqueColors: seen.size,
      blownOut: blown / n,
      crushed: crushed / n,
      width: w, height: h, sampled: n,
    };
  },

  /**
   * HONEST FRAME COST. The old body was `step(); renderOnce(); gl.finish()` in a
   * tight non-rAF loop, and every ms figure recorded in this repo before
   * 2026-07-30 came from it. Under ANGLE/D3D11 on this harness `glFinish`
   * returns before the GPU has drained, so that loop measured submission, not
   * frames: the same pose read 9.8 ms amortised, 34 ms fenced-per-frame, and
   * 82 ms on a real GPU timer, and two back-to-back calls in one page returned
   * 24 fps then 9 fps. It also degraded monotonically the longer it ran, which
   * is how "turning terrain OFF measured slower than ON" got into HANDOFF.
   * [props/flora LOD] filed the replacement ask with all four instruments.
   *
   * This version measures what a player sees, in this order of preference:
   *   1. rAF pacing with the game's own loop driving and NO fences at all.
   *      That is the frame rate, full stop, including compositor and browser.
   *   2. EXT_disjoint_timer_query_webgl2 for the GPU half of it, reported
   *      alongside as `gpuMs` so a regression can be attributed.
   * Returns a promise; `page.evaluate` awaits it, so callers are unchanged.
   */
  async benchmark(frames = 120) {
    const wasRunning = running;
    running = true;
    lastWall = performance.now();
    // Let the 980M's boost clock come up. Measured cold, every later A/B in a
    // sweep comes out negative.
    await new Promise(r => setTimeout(r, 350));
    const dts = [];
    await new Promise(done => {
      let last = performance.now(), n = 0;
      const tick = () => {
        const now = performance.now();
        if (n++ > 3) dts.push(now - last);   // drop the ramp-in
        last = now;
        if (n < frames + 4) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    dts.sort((a, b) => a - b);
    const mean = dts.reduce((s, v) => s + v, 0) / Math.max(1, dts.length);
    const median = dts[dts.length >> 1];

    // GPU half, if the driver exposes the timer. Pause first: with the game's
    // loop still running, its own renderOnce() lands inside our TIME_ELAPSED
    // interval and the frame is billed twice.
    let gpuMs = null;
    const gl = ctx.gl;
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (ext) {
      running = false;
      const s = [];
      for (let k = 0; k < 16; k++) {
        step(FIXED);
        const q = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
        renderOnce();
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        for (let i = 0; i < 4000; i++) {
          if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
          await new Promise(r => setTimeout(r, 0));
        }
        if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(ext.GPU_DISJOINT_EXT))
          s.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(q);
      }
      if (s.length) { s.sort((a, b) => a - b); gpuMs = +s[s.length >> 1].toFixed(2); }
      running = wasRunning;
      lastWall = performance.now();
    } else {
      running = wasRunning;
      lastWall = performance.now();
    }

    return {
      fps: 1000 / median, mean, median,
      p95: dts[Math.floor(dts.length * 0.95)] ?? median,
      p99: dts[Math.floor(dts.length * 0.99)] ?? median,
      min: dts[0], max: dts[dts.length - 1],
      gpuMs, instrument: ext ? 'rAF + EXT_disjoint_timer_query_webgl2' : 'rAF',
      samples: dts.length,
    };
  },

  renderInfo() {
    const i = ctx.renderer.info;
    return {
      calls: i.render.calls, triangles: i.render.triangles, points: i.render.points,
      lines: i.render.lines, frame: i.render.frame,
      geometries: i.memory.geometries, textures: i.memory.textures,
      programs: i.programs ? i.programs.length : 0,
    };
  },

  gotoVista(name) {
    const v = VISTAS[name];
    if (!v) throw new Error('unknown vista: ' + name);
    if (v.time !== undefined) ctx.sys.sky?.setTimeOfDay?.(v.time);
    if (v.weather) ctx.sys.sky?.setWeather?.(v.weather);
    applyWeatherDensity(ctx, v.weather || ctx.sys.sky?.weather);
    if (v.area !== undefined) ctx.sys.grade?.setArea?.(v.area, 0);
    ctx.sys.player?.teleport?.(v.pos, v.yaw, v.pitch);
    ctx.sys.weapons?.setPose?.(v.weapon || 'idle');
    // Focus is a CAMERA decision, and dof.js deliberately never makes it
    // (RENDER_PLAN §8.4) — normally weapons.js drives it. weapons.js is a stub,
    // so the review set drives it here. Without this a material closeup shot,
    // whose entire purpose is to show texture, is rendered out of focus by a
    // 26 m landscape lens.
    if (v.focus) ctx.sys.dof?.setFocus?.(v.focus[0], v.focus[1], 0);
    else if (v.weapon === 'ads') ctx.sys.dof?.setAiming?.(true);
    else { ctx.sys.dof?.setAiming?.(false); ctx.sys.dof?.setFocus?.(26.0, 5.6, 0); }
    v.setup?.(ctx);
    // let the world stream in / settle
    for (let i = 0; i < 30; i++) step(FIXED);
    // Auto-exposure is a temporal integrator: left free it drifts run to run and
    // the byte-identical regression gate (CONTRACT §3) cannot hold. Pin it.
    if (v.ev !== undefined) ctx.sys.grade?.setFixedEV?.(v.ev);
    API.resetAllTemporal();
    return name;
  },

  /**
   * Reset EVERY temporal integrator in the process, not just frame-graph passes:
   * TAA history, volumetric history, exposure, and the renderer's jitter phase.
   * A converged TAA image is a function of the jitter phase *sequence*, so a
   * capture taken at an arbitrary phase is not reproducible.
   */
  resetAllTemporal() {
    ctx.sys.renderer.resetTemporal?.();      // also calls pass.reset() on every pass
    const list = ctx._ordered || ctx._systems;
    for (const s of list) if (s !== ctx.sys.renderer) s.resetTemporal?.();
    return true;
  },

  listVistas() { return Object.keys(VISTAS); },
  setQuality(p) { return ctx.setQuality(p); },

  /**
   * Debug-flag toggle. ABSENT MEANS ON: passes register enabled, so flipping an
   * `undefined` flag with `!undefined === true` used to be a silent no-op on the
   * first call — the exact A/B a critic reaches for first. Three passes had
   * independently worked around this by seeding their flag in init(); this is
   * the fix at the source.
   */
  toggle(flag, on) {
    const cur = ctx.debug.flags[flag] !== false;
    ctx.debug.flags[flag] = on === undefined ? !cur : !!on;
    ctx.bus.emit('debugFlag', { flag, on: ctx.debug.flags[flag] });
    return ctx.debug.flags[flag];
  },

  /**
   * Per-pass GPU cost in ms, by interleaved A/B of each debug flag.
   *
   * Toggling a pass can force a target reallocation and a shader recompile, and
   * both land in the first frames after the flip — a naive off/on measurement
   * reports the compile, not the pass, and produces nonsense like -400 ms.
   * So: warm after every flip, take several short blocks, and keep the MINIMUM
   * (least-contended) block on each side. Interleaving cancels GPU clock drift.
   */
  async passCost(frames = 24, blocks = 3) {
    const flags = ['shadows', 'gtao', 'vol', 'taa', 'motionBlur', 'dof', 'bloom', 'grade'];
    // MUST yield to rAF between blocks: a tight renderFrame()+gl.finish() loop
    // past ~500 iterations loses the WebGL context, and it surfaces as a
    // RawShaderMaterial link failure with an empty info log (HANDOFF, renderer).
    const yieldFrame = () => new Promise(r => requestAnimationFrame(r));
    const warm = async (n = 12) => {
      for (let i = 0; i < n; i++) renderOnce();
      ctx.gl.finish();
      await yieldFrame();
    };
    const block = async () => {
      ctx.gl.finish();
      const a = performance.now();
      for (let i = 0; i < frames; i++) renderOnce();
      ctx.gl.finish();
      const ms = (performance.now() - a) / frames;
      await yieldFrame();
      return ms;
    };
    const wasRunning = running;
    running = false;
    try {
      await warm(30);
      const out = {};
      let all = Infinity;
      for (let b = 0; b < blocks; b++) all = Math.min(all, await block());
      out.all = +all.toFixed(3);
      for (const f of flags) {
        let on = Infinity, off = Infinity;
        for (let b = 0; b < blocks; b++) {
          API.toggle(f, true); await warm();
          on = Math.min(on, await block());
          API.toggle(f, false); await warm();
          off = Math.min(off, await block());
        }
        API.toggle(f, true); await warm();
        out[f] = +(on - off).toFixed(3);
      }
      return out;
    } finally {
      running = wasRunning;
      lastWall = performance.now();
    }
  },

  passes() { return ctx.sys.renderer.debugInfo().passes; },
  spawn(kind, x, y, z) { return ctx.sys.enemies?.spawn?.(kind, new THREE.Vector3(x, y, z)); },

  // --- mission control. director.js starts the spine on pointer lock, which a
  // headless harness never gets, so the whole mission layer was unreachable
  // from __CB and nothing had ever run it end to end.
  startMission(beat) { return ctx.sys.director?.startMission?.(beat) ?? null; },
  stopMission() { return ctx.sys.director?.stopMission?.() ?? null; },
  skipTo(beat) { return ctx.sys.director?.skipTo?.(beat) ?? null; },
  respawn() { return ctx.sys.director?.respawn?.() ?? null; },
  hurt(amount = 25) { return ctx.sys.combat?.damagePlayer?.(amount, 0, 0, 0) ?? null; },
  director() { return ctx.sys.director?.debugInfo?.() ?? null; },
  enemies() { return ctx.sys.enemies?.debugInfo?.() ?? null; },
  weapon() { return ctx.sys.weapons?.debugInfo?.() ?? null; },
  /** Hold a movement/look input for `ms` of SIM time, then release it. */
  hold(o, ms = 500) {
    const n = Math.round(ms / 1000 * 60);
    const held = { ...o };
    if (held.look) held.lookHold = true;
    ctx.sys.input.setSynthetic(held);
    for (let i = 0; i < n; i++) step(FIXED);
    const off = {};
    for (const k of Object.keys(o)) off[k] = (k === 'move') ? [0, 0] : false;
    if (o.look) off.lookHold = false;
    ctx.sys.input.setSynthetic(off);
    return API.state();
  },

  fire(ms = 200) {
    const n = Math.round(ms / 1000 * 60);
    ctx.sys.input.setSynthetic({ fire: true });
    for (let i = 0; i < n; i++) step(FIXED);
    ctx.sys.input.setSynthetic({ fire: false });
  },
  state() {
    return {
      t: ctx.time.elapsed, frame: ctx.time.frame,
      quality: ctx.quality.preset,
      player: ctx.sys.player?.debugState?.() || null,
      enemies: ctx.sys.enemies?.count?.() ?? 0,
      sun: ctx.sys.sky?.getSunDir?.()?.toArray?.() || null,
      fps: 1000 / Math.max(0.001, frameTimes.mean()),
    };
  },
});

// Vista table — the critic's review set. Each must be honest and flattering.
// Systems may extend this via ctx.bus.emit('vista', {name, def}).
// `area` drives post/grade.js's per-area look (basin/canopy/ridge/grotto/storm/
// water/night/neutral). `ev` pins post/grade.js's exposure so a capture is
// reproducible; omit it and the auto meter runs (fine to look at, not to diff).
export const VISTAS = {
  // [props] asked for pitch -0.02 (from -0.06) so the shot gains ART §6.4's near
  // occluder and scale anchor instead of handing the bottom third to bare basin
  // floor. Raising the pitch alone did the opposite: it put a props `plate` — a
  // 2 m untextured pale slab — dead centre in the foreground, blocking the
  // establishing shot with the single worst-reading surface in the build.
  // Moving 4 m up-slope and easing the yaw gets the intent without the blocker:
  // the hoodoo is the near-left occluder, a fallen log crosses the middle
  // third, and the shallow pool carries a reflection in the near right. Of six
  // poses A/B'd at this site it was also the richest (7758 distinct colours
  // against 7303 for the straight pitch change).
  establish: { pos: [12, 0, 46], yaw: -2.30, pitch: -0.03, time: 0.28, weather: 'clear', area: 'basin' },
  // pitch 0.42 not 0.12: flora.js's stems are 17-38 m and their crowns start at
  // 85% of that, so from 1.7 m eye height a crown 15 m out sits ~50 deg up and a
  // 65 deg VERTICAL fov cannot reach it. At 0.12 this shot was a picture of
  // trunks; S3 ("volumetric shafts through translucent crowns") was literally
  // unshootable. [flora] filed this with the measurement.
  canopy: { pos: [-38, 0, 16], yaw: 0.85, pitch: 0.42, time: 0.31, weather: 'clear', area: 'canopy' },
  // 0.247 not 0.24: Sky.js's ART §3.1 elevation curve puts 0.24 at -1.7 deg,
  // i.e. the key light is BELOW the horizon and S2's hero shot had no sun at
  // all — every form in it was ambient-lit and flat. 0.247 is +1.5 deg and
  // keeps the raking light that makes a ridge read as a ridge. [sky] filed this.
  ridge: { pos: [64, 0, -70], yaw: 2.05, pitch: -0.02, time: 0.247, weather: 'haze', area: 'ridge' },
  grotto: { pos: [-14, 0, -52], yaw: -0.6, pitch: -0.05, time: 0.86, weather: 'clear', area: 'grotto' },
  water: { pos: [30, 0, -18], yaw: 1.35, pitch: -0.14, time: 0.33, weather: 'clear', area: 'water' },
  // 0.385 not 0.42: 0.42 is 46.5 deg, the flattest light in the whole review
  // set, and ART §3.1 says flat noon does not exist on this planet. 0.385 is
  // 38 deg — still high, still oppressive, but the landforms cast. [sky] filed.
  storm: { pos: [4, 0, 8], yaw: -1.1, pitch: 0.04, time: 0.385, weather: 'spore', area: 'storm' },
  // vfx.js implements TWO storm states and the review set only ever captured the
  // pale one. `weather: 'storm'` is ART §5.6's "The Draft" — dark brown,
  // horizontal, spark-streaked — and it is the most dramatic thing in the build.
  // Nobody had ever looked at it. [vfx] filed this.
  draft: { pos: [4, 0, 8], yaw: -1.1, pitch: 0.02, time: 0.36, weather: 'storm', area: 'storm' },
  hipfire: { pos: [8, 0, 20], yaw: -1.9, pitch: -0.02, time: 0.3, weapon: 'fire', area: 'basin' },
  ads: { pos: [8, 0, 20], yaw: -1.9, pitch: -0.02, time: 0.3, weapon: 'ads', area: 'basin' },
  reload: { pos: [8, 0, 20], yaw: -1.9, pitch: 0.0, time: 0.3, weapon: 'reload', area: 'basin' },
  // COMBAT_FEEL §1.6/§3: the sprint cant and the inspect pose are the two
  // viewmodel reads a hostile critic asks for and neither was capturable.
  sprint: { pos: [8, 0, 20], yaw: -1.9, pitch: 0.02, time: 0.3, weapon: 'sprint', area: 'basin' },
  inspect: { pos: [8, 0, 20], yaw: -1.9, pitch: 0.0, time: 0.3, weapon: 'inspect', area: 'basin' },
  combat: {
    pos: [0, 0, 30], yaw: -1.6, pitch: -0.03, time: 0.3, weapon: 'fire', area: 'basin',
    setup: (c) => c.sys.director?.stageEncounter?.('showcase'),
  },
  // focus: [metres, fStop]. Closeups need a macro lens, not the landscape one.
  'mat-ground': { pos: [2, 0, 2], yaw: 0.4, pitch: -0.92, time: 0.3, area: 'basin', focus: [2.4, 8.0] },
  // The old pose ([-6,0,11] yaw 1.2) pointed straight into a terrain hoodoo cap
  // that filled two thirds of the frame: the "flora closeup" contained no flora
  // whatsoever, verified by A/B with __CB.toggle('flora'). This pose is inside
  // the wick forest and clear of the cap; flora.js has hero saplings placed for
  // it. [flora] filed this with the replacement measured on this build.
  'mat-flora': { pos: [-34, 0, 22], yaw: -1.15, pitch: -0.10, time: 0.3, area: 'canopy', focus: [3.2, 5.6] },
  // `water` is a wide shot; the waterline — where wetness, the evaporite ring
  // and the refraction/reflection crossover actually live — is what a hostile
  // critic zooms into, and no pose framed it. [water] filed this and supplied
  // (46, -30) yaw 2.30, but that was measured before terrain.js was rewritten
  // to a 2.3 km world this stage and it now points into a rock face: the
  // capture came back as a full-frame slab of ash with no liquid in it at all.
  // This pose was found by walking water.js's own getDepthAt/getLevelAt over
  // the tile at runtime, picking cells with a dry neighbour and >=18 m of
  // liquid along the aim, then eyeballing the eight best. It frames the
  // waterline across the lower third with the natural arch behind it.
  'mat-water': {
    pos: [-5, 0, -19], yaw: -0.785, pitch: -0.22, time: 0.33,
    weather: 'clear', area: 'water', focus: [5.0, 8.0],
  },
};
window.__CB.VISTAS = VISTAS;
