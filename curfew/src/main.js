// CURFEW — boot, the SYSTEMS manifest, the fixed-step loop with interpolation, and the
// window.__CURFEW test surface. Owner: engine.
//
// THE MANIFEST IN THIS FILE IS THE TRUTH. A system that is not in SYSTEMS does not exist,
// however green its own suite is. FLARE shipped its wave director commented out of the
// manifest through 967 passing checks and the game spawned nothing.
//
// Three laws this file exists to keep:
//
//  1. FIXED STEP, THEN INTERPOLATED PRESENTATION. ctx.time.alpha is computed AND CONSUMED:
//     present(alpha) is called on every system that has one, every frame. CINDERBLOOM
//     computed alpha at main.js:666 and nothing ever read it; that is the teleport the whole
//     catalogue carries, and it is invisible at exactly 60 fps, which is why it keeps
//     shipping. tests/interp.mjs throttles the CPU to 1/6 speed and asserts the per-frame
//     camera displacement stays unimodal, so a hard-wired alpha fails.
//  2. THE TEST DOOR IS THE REAL DOOR. setInput() and stepWith() push their controls through
//     Input._down/_up — the same functions the DOM listeners call. FLARE shipped a broken
//     trigger through 967 green checks because every suite called the fire function directly
//     and none pressed a mouse button.
//  3. NOTHING BOOTS TO A BLANK PAGE. Every failure is caught, named, written into #booterr
//     and into ctx.bootError, and the ready() sweep names the system that refused.
//
// donor: vigil-handoff/vigil-enhanced/src/main.js:145-156 (construct from the manifest, throw
//   on an id mismatch, then a ready() sweep) and :162 (compileAsync with a compile fallback),
//   :166-170 (prime frames behind the fade). The loop is NOT lifted: that file runs a
//   variable-dt step(realDt) and says so in its own header at line 4.
// donor: eaten-path/src/main.js:12 and :271 (the ?test=1 flag that starts no rAF loop, so
//   __CURFEW.step is the only clock).
// donor: qualiacology/marrow/src/main.js:172-179 ("compile() uses traverseVisible, so it SKIPS
//   the creature while it's hidden" — the reason warm() reveals before it compiles).

import { CFG } from './config.js';
import { Rng } from './engine/math.js';
import { Input } from './engine/input.js';

// Namespace imports, because the manifest resolves each class by its OWN `static id` rather
// than by a name written twice. A module whose class is renamed still boots; a module whose
// id is wrong fails loudly, by name, at construction.
import * as gfxMod from './gfx/renderer.js';
import * as lightsMod from './gfx/lights.js';
import * as skyMod from './gfx/sky.js';
import * as terrainMod from './world/terrain.js';
import * as roadsMod from './world/roads.js';
import * as collisionMod from './world/collision.js';
import * as chunksMod from './world/chunks.js';
import * as floraMod from './world/flora.js';
import * as playerMod from './player/controller.js';
import * as cameraMod from './player/camera.js';
import * as weaponsMod from './weapons/weapon.js';
import * as viewmodelMod from './weapons/viewmodel.js';
import * as combatMod from './combat/combat.js';
import * as fxMod from './fx/fx.js';
import * as postMod from './gfx/post.js';
import * as clockMod from './world/clock.js';
import * as placesMod from './world/places.js';
import * as enemiesMod from './enemies/enemies.js';
import * as directorMod from './director/director.js';
import * as dreadMod from './director/dread.js';
import * as carMod from './vehicle/car.js';
import * as progressMod from './progression/progress.js';
import * as audioMod from './audio/audio.js';
import * as hudMod from './ui/hud.js';

/* ==========================================================================
   THE MANIFEST — construction order IS init order IS update order.
   flora (#8) needs chunks (#7) to exist before it subscribes; collision (#6) ready()
   fails until terrain (#4) exposes heightAt; camera (#10) presents after player (#9)
   because it reads renderPos. Reordering this array breaks all three.
   ========================================================================== */
const SYSTEMS = [
  // -- the frame and the sky ------------------------------------------------------------
  ['gfx', gfxMod],
  ['lights', lightsMod],       // owns the pinned 13-light census AND ctx.shared.lit
  ['sky', skyMod],
  ['clock', clockMod],         // publishes ctx.shared.phase; drives sky and the moon
  // -- the ground -----------------------------------------------------------------------
  ['terrain', terrainMod],
  ['roads', roadsMod],
  ['collision', collisionMod],
  ['chunks', chunksMod],
  ['flora', floraMod],
  ['places', placesMod],       // AFTER roads and terrain: its constructor reads sites() and
                               // registers flats, and BEFORE chunks stream anything in
  // -- the body -------------------------------------------------------------------------
  ['player', playerMod],
  ['camera', cameraMod],       // presents after player because it reads renderPos
  ['weapons', weaponsMod],
  ['viewmodel', viewmodelMod],
  ['combat', combatMod],
  // -- the things in the trees, and who decides when ------------------------------------
  ['enemies', enemiesMod],
  ['director', directorMod],   // AFTER enemies: it validates its roster against species
  ['dread', dreadMod],         // AFTER director: the two gate each other every step
  // -- the loop -------------------------------------------------------------------------
  ['car', carMod],
  ['progress', progressMod],
  ['audio', audioMod],         // late, so it can hear everything that happened this step
  ['hud', hudMod],
  // -- presentation, last ---------------------------------------------------------------
  ['fx', fxMod],
  ['post', postMod],           // post MUST stay last; it composites everything above
];

const VERSION = '0.1.0';
const FIXED = CFG.loop.FIXED;
const MAX_STEPS = CFG.loop.MAX_STEPS;
const DT_CLAMP = CFG.loop.DT_CLAMP;

const params = new URLSearchParams(location.search);
// donor: eaten-path/src/main.js:12 — exactly '1', so tests/interp.mjs's '?test=0' still
// gets the real rAF loop it needs to measure.
const TEST_MODE = params.get('test') === '1';
const SEED = Number(params.get('seed')) || 1337;

const $ = (id) => document.getElementById(id);
const shellEl = $('shell');
const barEl = $('bootbar');
const stageEl = $('bootstage');
const enterEl = $('enter');
const errEl = $('booterr');

/* -------------------------------------------------------------------- bus -- */

function makeBus() {
  const map = new Map();
  const bus = {
    on(ev, fn) {
      let a = map.get(ev);
      if (!a) { a = []; map.set(ev, a); }
      a.push(fn);
      return () => bus.off(ev, fn);
    },
    off(ev, fn) {
      const a = map.get(ev);
      if (!a) return;
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    },
    // Synchronous, fires inside the fixed step, so every listener is deterministic and
    // steppable. A listener that throws is NOT swallowed: silence is how a dead subscriber
    // survives to ship.
    emit(ev, payload) {
      const a = map.get(ev);
      if (!a) return;
      for (let i = 0; i < a.length; i++) a[i](payload);
    },
    listeners(ev) { return (map.get(ev) || []).length; },
  };
  return bus;
}

/* -------------------------------------------------------------------- ctx -- */

const ctx = {
  ready: false,
  // READY IS NOT PLAYING, and conflating the two gave away the whole opening.
  //
  // boot() sets ready and then calls startLoop() IMMEDIATELY — the simulation runs for the
  // entire time the title card is up, and enterGame() only fades the card and asks for
  // pointer lock. So the director had already been placing hounds while the player read the
  // words, and standing at the title made the pack CLOSER. Worse, the ninety fixed steps boot
  // runs to settle the chunk ring happen before ready is even set, so the opening grace — a
  // 90 m bubble around where the player starts — did not exist yet and the director could
  // spawn inside it freely. Measured from a real page load: four hounds already 31-36 m out
  // at the first frame the player could move.
  //
  // `playing` is set exactly once, when the shell comes down, which is the same instant for
  // the button, for a click-through after Escape, and for ?test=1. Anything that means "the
  // player has the controls now" keys off THIS, never off ready.
  playing: false, playT: 0,
  // ESCAPE MUST ACTUALLY STOP THE WORLD. It did not. The HUD drew a pause card and the
  // simulation kept stepping underneath it: measured, three real seconds behind that card
  // advanced the clock 3.03 s and stepped 182 frames, and a hound can finish you while you
  // are reading the controls. Alex found it by suspecting it.
  //
  // The rule is POINTER LOCK, not the card, because losing the lock is what actually means
  // "the player is not playing": Escape, alt-tab, a click outside the window, the browser
  // stealing focus, the tab going to the background. All of them should stop the county, and
  // keying off the card would only have covered the first.
  paused: false,
  bootStage: 'waking',
  bootError: null,
  version: VERSION,
  // t advances by the FIXED step inside the sim (viewmodel.js:636 and flora.js:1456 both
  // read `time.t + alpha * FIXED`, which is only correct if t is step-aligned).
  // dt is the RAW, unscaled, clamped FRAME delta — lights.js:338 and post.js:180 depend on
  // it staying raw so the torch and the film grain do not stall during hitstop.
  // scale is written by fx and NOBODY else; the accumulator is the only thing that reads it.
  time: { t: 0, dt: 0, alpha: 0, scale: 1, frame: 0, step: 0 },
  rng: new Rng(SEED),
  renderer: null,
  scene: null,
  camera: null,
  canvas: $('gl'),
  input: null,
  systems: new Map(),
  bus: makeBus(),
  cfg: CFG,
  // CONTRACT: a flat bag of SCALARS, one owner per key, readable by anyone. It is created
  // here rather than by whichever system happens to construct first, so a lane that reads a
  // key before its owner has written it gets undefined instead of a TypeError.
  shared: {
    phase: 'night', phaseT: 0, tension: 0, danger: 1, noise: 0, lit: 0,
    level: 1, xp: 0, inCar: false,
  },
  debug: { flags: {} },
  // Owned here, per the weapons HANDOFF offer: viewmodel pushes its render() in at
  // construction and never needs the engine to know its name.
  overlays: [],
  // config(patch) lands here. CFG is deep-frozen on purpose, so a live A/B knob cannot be
  // written into it; systems that want live tuning read ctx.tune or implement config(patch).
  tune: {},
};

/* -------------------------------------------------------- the public surface -- */

// viewmodel.js:326 does `window.__CURFEW = window.__CURFEW || {}` inside its own init and
// hangs a .viewmodel probe off it. So this object is created FIRST and never replaced.
const API = (window.__CURFEW = window.__CURFEW || {});
if (!('noLock' in API)) API.noLock = false;   // player HANDOFF A.2 — read by Input.noLock
API.ctx = ctx;
Object.defineProperty(API, 'ready', { get: () => ctx.ready, configurable: true });
Object.defineProperty(API, 'bootStage', { get: () => ctx.bootStage, configurable: true });
Object.defineProperty(API, 'bootError', { get: () => ctx.bootError, configurable: true });
Object.defineProperty(API, 'version', { get: () => ctx.version, configurable: true });

/* ------------------------------------------------------------- boot report -- */

function stage(name, frac) {
  ctx.bootStage = name;
  if (stageEl) stageEl.textContent = name;
  if (barEl) barEl.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
  ctx.bus.emit('boot:stage', name);
}

function fail(where, err) {
  const detail = err && err.stack ? err.stack : String(err);
  const msg = where + '\n' + detail;
  ctx.bootError = msg;
  ctx.bootStage = 'error';
  if (errEl) { errEl.hidden = false; errEl.textContent = msg; }
  if (stageEl) stageEl.textContent = 'failed';
  if (barEl) barEl.style.width = '100%';
  if (enterEl) enterEl.disabled = true;
  // Loud on purpose: the harness counts console.error as a failure, which is exactly right
  // when the game did not boot.
  console.error('[CURFEW] ' + msg);
}

const _errors = [];
addEventListener('error', (e) => {
  if (_errors.length < 50) _errors.push('error: ' + (e.message || String(e.error || e)));
});
addEventListener('unhandledrejection', (e) => {
  const r = e.reason;
  if (_errors.length < 50) _errors.push('rejection: ' + ((r && r.message) || String(r)));
});

/* ------------------------------------------------------ manifest resolution -- */

/**
 * Find the exported class whose `static id` equals the manifest key. This is VIGIL's
 * "if (sys.id !== id) throw" check moved one step earlier: a module that exports the wrong
 * id can never be registered under the right one.
 * donor: vigil-handoff/vigil-enhanced/src/main.js:146-147
 */
function pickClass(mod, id) {
  const keys = Object.keys(mod);
  for (let i = 0; i < keys.length; i++) {
    const v = mod[keys[i]];
    if (typeof v === 'function' && v.id === id) return v;
  }
  const d = mod.default;
  if (typeof d === 'function' && d.id === id) return d;
  throw new Error(
    "manifest: no exported class with `static id = '" + id + "'`. " +
    'Exports seen: ' + keys.join(', '),
  );
}

/* --------------------------------------------------------------- the lists -- */

// Flat arrays, built once at boot. Iterating a Map allocates an iterator every frame and the
// hot path allocates nothing.
let stepList = [];
let presentList = [];
let sysList = [];

function buildLists() {
  sysList = [];
  stepList = [];
  presentList = [];
  for (const sys of ctx.systems.values()) {
    sysList.push(sys);
    if (typeof sys.step === 'function') stepList.push(sys);
    if (typeof sys.present === 'function') presentList.push(sys);
  }
}

/* ------------------------------------------------------------- the sim step -- */

/**
 * ONE fixed step. Deterministic, no rendering, no wall clock. Everything that changes game
 * state changes it here and nowhere else.
 */
function simStep(dt) {
  const inp = ctx.input;

  // The torch is the one binding main owns (engine/input.js:37 — "torch is toggled by main
  // on the press edge"). Read the edge before endStep clears it.
  if (inp && inp.pressed('torch')) {
    const lights = ctx.systems.get('lights');
    if (lights && lights.setTorch) lights.setTorch(!lights.torchOn());
  }

  ctx.time.t += dt;
  if (ctx.playing) ctx.playT += dt;
  ctx.time.step++;
  for (let i = 0; i < stepList.length; i++) stepList[i].step(dt);

  // Edges are cleared per fixed STEP, not per frame: a tap that lands between two steps must
  // survive to exactly one of them (engine/input.js:_up latch).
  if (inp) inp.endStep(dt);
}

function presentAll(alpha) {
  for (let i = 0; i < presentList.length; i++) presentList[i].present(alpha);
}

/* ---------------------------------------------------------------- rendering -- */

let contextLost = false;

/**
 * One presented, composited frame. ctx.time.frame is bumped first because viewmodel.render()
 * latches on it to guarantee it never draws twice in a frame (viewmodel.js:772).
 */
function renderFrame() {
  ctx.time.frame++;
  presentAll(ctx.time.alpha);

  const gfx = ctx.systems.get('gfx');
  if (!contextLost && gfx) {
    // gfx.render() resets renderer.info then delegates to post when post.enabled.
    gfx.render();

    // The gun is drawn AFTER the final composite with the depth buffer cleared, or the world
    // paints over it and every weapon test still passes (weapons HANDOFF §1). Both hooks are
    // honoured; render() is idempotent per frame so calling both is safe.
    const ov = ctx.overlays;
    if (ov) for (let i = 0; i < ov.length; i++) ov[i]();
    const vm = ctx.systems.get('viewmodel');
    if (vm && vm.render) vm.render();

    // The readback lives HERE, inside the frame callback, right after the composite.
    if (_lumaWaiters.length) drainLuma();
  } else if (_lumaWaiters.length) {
    // Never leave a luma() promise hanging because the context died mid-test.
    while (_lumaWaiters.length) _lumaWaiters.pop()(null);
  }
}

/* --------------------------------------------------------------- the loop -- */

let acc = 0;
let last = 0;
let raf = 0;
let running = false;
let loopErrors = 0;

const RING = 240;
const frameMs = new Float64Array(RING);
const sortBuf = new Float64Array(RING);
let frameN = 0;

function frame(now) {
  raf = requestAnimationFrame(frame);

  // A 10 fps stall plays as slow motion, not as a teleport. [CFG.loop.DT_CLAMP, duskfall]
  const dtRaw = Math.min(DT_CLAMP, Math.max(0, (now - last) / 1000));
  last = now;

  // ---- the pause ------------------------------------------------------------------------
  // Nothing steps. The frame is still PRESENTED, so the card sits over a live-looking world
  // and a resize still works, but no fixed step runs, dt is zero for anything that reads it,
  // and the accumulator is emptied so resuming cannot pay back the debt in one lurch.
  const wantPause = ctx.playing && !TEST_MODE && !API.noLock
    && (document.hidden || !document.pointerLockElement);
  if (wantPause !== ctx.paused) {
    ctx.paused = wantPause;
    ctx.time.scale = 1;                       // never resume inside a hitstop
    // NO KEY PRESSED BEHIND THE CARD REACHES THE FIRST STEP BACK. input.js keeps every edge
    // until endStep() clears it, and no step runs while paused, so a Space tapped while the
    // card was up ("is it stuck?") launched a measured 0.88 m jump the instant the game
    // resumed (verification round 1), and an Escape tapped there re-paused it. clear() puts
    // every held action up and empties the buffer; endStep(0) drops the pressed/released
    // edges it leaves behind. Both are input.js's public frame API, called from the loop that
    // already owns endStep.
    if (!wantPause && ctx.input) { ctx.input.clear(); ctx.input.endStep(0); }
    ctx.bus.emit('game:paused', wantPause);
  }
  if (ctx.paused) {
    acc = 0;
    ctx.time.dt = 0;
    ctx.time.alpha = 0;
    try { renderFrame(); if (ctx.input) ctx.input.endFrame(); } catch (e) { /* reported below */ }
    return;
  }

  ctx.time.dt = dtRaw;
  frameMs[frameN % RING] = dtRaw * 1000;
  frameN++;

  try {
    // Hitstop scales the dt the accumulator eats. It is never a second clock, and fx is the
    // only writer of ctx.time.scale (fx.js:364).
    acc += dtRaw * ctx.time.scale;
    let steps = 0;
    while (acc >= FIXED && steps < MAX_STEPS) { simStep(FIXED); acc -= FIXED; steps++; }
    if (steps === MAX_STEPS) acc = 0;      // drop the backlog, never spiral

    // Computed AND consumed. This is the whole point of the file.
    ctx.time.alpha = acc / FIXED;
    renderFrame();

    if (ctx.input) ctx.input.endFrame();
    loopErrors = 0;
  } catch (err) {
    loopErrors++;
    console.error('[CURFEW] frame ' + ctx.time.frame + ': ' + (err && err.stack ? err.stack : err));
    if (loopErrors >= 3) {
      // Three in a row is a broken frame, not a hiccup. Stop rather than emit thousands of
      // identical errors that bury the first one.
      cancelAnimationFrame(raf);
      running = false;
      fail('loop stopped after 3 consecutive frame errors', err);
    }
  }
}

function startLoop() {
  if (running || TEST_MODE) return;
  running = true;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

/** Render one frame from outside the loop (test mode, settle, luma). */
function pumpOnce() {
  if (!running) renderFrame();
}

/* ------------------------------------------------------------------- warm -- */

const _hidden = [];

/**
 * Link every shader behind the title fade. renderer.compile() walks traverseVisible, so a
 * pooled or parked object compiles on the frame it first appears unless it is revealed here
 * first — MARROW parks its creature at y = -60 and reveals it under the load fade for exactly
 * this reason (qualiacology/marrow/src/main.js:172-179).
 */
async function warm() {
  const renderer = ctx.renderer;
  const scene = ctx.scene;
  const camera = ctx.camera;
  if (!renderer || !scene || !camera) return;

  _hidden.length = 0;
  scene.traverse((o) => {
    if (o.visible === false) { _hidden.push(o); o.visible = true; }
  });

  // fx spawns one of everything at y = -400, viewmodel reveals its muzzle flash and compiles
  // its own scene, post runs the whole composer chain once.
  for (let i = 0; i < sysList.length; i++) {
    const s = sysList[i];
    if (typeof s.warmup === 'function') s.warmup();
  }

  // donor: vigil-handoff/vigil-enhanced/src/main.js:162 — keep the catch. compileAsync uses
  // KHR_parallel_shader_compile where it exists and is a plain promise where it does not.
  await renderer.compileAsync(scene, camera).catch(() => renderer.compile(scene, camera));

  for (let i = 0; i < _hidden.length; i++) _hidden[i].visible = false;
  _hidden.length = 0;

  // One real composited frame, so the post chain and the viewmodel overlay have linked too.
  renderFrame();
}

/* ------------------------------------------------------------------- boot -- */

function dismissShell() {
  if (shellEl && !shellEl.classList.contains('gone')) shellEl.classList.add('gone');
  // The single place every entry path goes through: the button, the click-through after
  // Escape, and ?test=1, which skips the title entirely.
  if (!ctx.playing) { ctx.playing = true; ctx.playT = 0; }
}

function enterGame() {
  if (!ctx.ready) return;
  dismissShell();
  if (ctx.input) ctx.input.requestLock();
}

async function boot() {
  stage('input', 0.02);
  const input = new Input(ctx);
  ctx.input = input;
  await input.init();
  // Registered so player HANDOFF A.1's fallback (ctx.systems.get('input')) resolves.
  // input.js deliberately has no `static id`, and tests/reverse-manifest.mjs allows exactly
  // this one live id with no module behind it.
  ctx.systems.set('input', input);

  stage('systems', 0.06);
  for (let i = 0; i < SYSTEMS.length; i++) {
    const id = SYSTEMS[i][0];
    const mod = SYSTEMS[i][1];
    let Klass;
    try { Klass = pickClass(mod, id); } catch (e) { throw new Error("construct '" + id + "': " + e.message); }
    let sys;
    try { sys = new Klass(ctx); } catch (e) {
      throw new Error("construct '" + id + "': " + (e && e.stack ? e.stack : e));
    }
    ctx.systems.set(id, sys);
  }
  buildLists();

  for (let i = 0; i < SYSTEMS.length; i++) {
    const id = SYSTEMS[i][0];
    stage(id, 0.08 + 0.58 * ((i + 1) / SYSTEMS.length));
    const sys = ctx.systems.get(id);
    if (typeof sys.init !== 'function') continue;
    try {
      await sys.init();
    } catch (e) {
      throw new Error("init '" + id + "' threw: " + (e && e.stack ? e.stack : e));
    }
  }
  // init() may add methods or swap in real objects; rebuild so nothing is missed.
  buildLists();

  // The wiring sweep. FLARE's ready() exists for exactly this, and it names the offender.
  stage('wiring', 0.70);
  const notReady = [];
  for (const [id, sys] of ctx.systems) {
    if (typeof sys.ready !== 'function') continue;
    let ok = false;
    try { ok = !!sys.ready(); } catch (e) { ok = false; notReady.push(id + ' (ready() threw: ' + e.message + ')'); continue; }
    if (!ok) notReady.push(id);
  }
  if (notReady.length) {
    throw new Error('ready() returned false for: ' + notReady.join(', ') +
      ' — the system is constructed but not wired. Check its ready() for what it demands.');
  }

  // Fixed steps BEFORE the compile, so the first ring of ground AND FLORA exists to be
  // compiled. compile() can only link what is in the scene; linking the world on the first
  // frame of play is the CINDERBLOOM 55-second cold start in miniature.
  //
  // One step was not enough. The chunk streamer spends a bounded CFG.world.buildBudgetMs per
  // step, and flora builds off the chunk:built event, so after a single step no tree or grass
  // material existed yet and three of them linked on the frame the player clicked Go Outside
  // — measured, 34 programs at ready and 37 after entering. Drain the queue instead: this
  // costs a fraction of a second of boot and buys a transition with nothing left to compile.
  stage('first steps', 0.74);
  ctx.time.dt = FIXED;
  const chunksSys = ctx.systems.get('chunks');
  for (let i = 0; i < 90; i++) {
    simStep(FIXED);
    // Stop early once the streamer says the ring is settled, so a small world does not pay
    // for a budget sized for a big one.
    //
    // This guard used to test `typeof chunksSys.queued === 'function'`, and chunks.js declares
    // `this.queued = new Map()` — typeof a Map is 'object', so the test was never true, the
    // early-out never fired, and every boot paid all ninety steps at up to 3 ms of chunk
    // building each. About a second of cold start, on every load, invisible because the guard
    // failed in the safe direction. A probe for a method that does not exist is not a guard.
    if (i > 20 && chunksSys && typeof chunksSys.queuedCount === 'function' && chunksSys.queuedCount() === 0) break;
  }
  ctx.time.alpha = 0;

  stage('shaders', 0.80);
  await warm();

  stage('ready', 1.0);
  ctx.ready = true;

  if (enterEl) {
    enterEl.disabled = false;
    enterEl.addEventListener('click', enterGame);
  }
  // A click on the canvas after Escape is a request to play, not a shot (input.js:191).
  ctx.bus.on('input:clickthrough', () => enterGame());

  if (TEST_MODE) dismissShell();   // no rAF loop here: __CURFEW.step is the only clock
  else startLoop();
}

/* ------------------------------------------------------------ context loss -- */

if (ctx.canvas) {
  ctx.canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();          // without this the context is never restored
    contextLost = true;
    ctx.bootStage = 'context-lost';
  }, false);
  ctx.canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    ctx.bootStage = 'ready';
    (async () => {
      try {
        const gfx = ctx.systems.get('gfx');
        if (gfx) gfx.resize();
        await warm();            // every program died with the context
      } catch (err) { fail('webgl context restore', err); }
    })();
  }, false);
}

/* ================================ THE TEST API ============================== */

/** The shell covers the canvas. Any synthetic driver means a test, not a player. */
function testDrive() { dismissShell(); }

API.enter = enterGame;
API.errors = () => _errors.slice();

/**
 * Advance the sim with no rendering. present(1) runs at the end so state().pos reflects the
 * steps that just happened — without it a headless stepper reads a pose frozen at the last
 * rAF and tests/collision.mjs measures zero travel.
 */
API.step = (dt = FIXED, n = 1) => {
  testDrive();
  const d = Number.isFinite(dt) && dt > 0 ? dt : FIXED;
  const k = Math.max(1, Math.round(Number(n) || 1));
  for (let i = 0; i < k; i++) { ctx.time.dt = d; simStep(d); }
  presentAll(1);
  return k;
};

/**
 * Drive the sim with synthetic controls, THROUGH THE REAL INPUT PATH. Accepts either
 * argument order: CONTRACT 1.8 says stepWith(seconds, controls), PLAN 1.8 says
 * stepWith(input, seconds), and both callers should work.
 */
API.stepWith = (seconds, controls) => {
  testDrive();
  let s = seconds, c = controls;
  if (seconds !== null && typeof seconds === 'object') { c = seconds; s = controls; }
  const secs = Number.isFinite(Number(s)) && Number(s) > 0 ? Number(s) : FIXED;
  const k = Math.max(1, Math.round(secs / FIXED));
  for (let i = 0; i < k; i++) {
    if (c) applyInput(c);
    ctx.time.dt = FIXED;
    simStep(FIXED);
  }
  presentAll(1);
  return k;
};

/**
 * setInput — the same struct the real input layer produces, routed through Input.set(), which
 * calls the SAME _down/_up the DOM listeners call. Two translations happen here because
 * engine/input.js's ACTIONS list is digital:
 *   forward: -1  ->  the 'back' action  (a signed axis is what a test bot writes)
 *   strafe:  +-1 ->  the 'right'/'left' actions
 * Everything else (sprint, crouch, jump, fire, ads, reload, torch, melee, lookX, lookY) is a
 * real action or a real alias and passes straight through.
 */
const _bulk = {};        // one reused carrier: stepWith re-applies its controls every step
let _negForward = false; // did a signed forward:-1 press the 'back' action?

function applyInput(partial) {
  if (!partial || !ctx.input) return;
  for (const key of Object.keys(partial)) {
    const v = partial[key];
    if (key === 'forward') {
      const a = typeof v === 'number' ? v : (v ? 1 : 0);
      if (a < 0) { _bulk.forward = false; _bulk.back = true; _negForward = true; }
      else {
        _bulk.forward = a > 0;
        if (_negForward) { _bulk.back = false; _negForward = false; }
      }
      continue;
    }
    if (key === 'strafe') {
      // A signed axis is what a test bot writes; the action list is digital.
      const a = Number(v) || 0;
      _bulk.right = a > 0.01;
      _bulk.left = a < -0.01;
      continue;
    }
    _bulk[key] = v;
  }
  ctx.input.set(_bulk);
  for (const k of Object.keys(_bulk)) delete _bulk[k];
}

API.setInput = (partial) => {
  testDrive();
  applyInput(partial);
  return ctx.input ? ctx.input.snapshot() : null;
};

API.clearInput = () => { if (ctx.input) ctx.input.clear(); };

/** Render n frames INSIDE rAF and resolve. Screenshots need this in both modes. */
API.settle = (n = 12) => new Promise((resolve) => {
  let left = Math.max(1, Math.round(Number(n) || 12));
  const tick = () => {
    pumpOnce();
    if (--left <= 0) resolve();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

/** One render, for counter reads. */
API.render = () => { renderFrame(); return API.frameStats(); };

API.teleport = (x, z, yaw) => {
  testDrive();
  const cam = ctx.systems.get('camera');
  const p = ctx.systems.get('player');
  const y = typeof yaw === 'number' ? yaw : (cam ? cam.yaw : 0);
  // The camera owns aim truth (camera.js:203 stepLook); the body mirrors it. Set the camera
  // first or the next step yanks the yaw straight back.
  if (cam) { cam.yaw = y; if (cam.init) cam.init(); }
  if (p && p.teleport) p.teleport(Number(x) || 0, Number(z) || 0, y);
  acc = 0;
  ctx.time.alpha = 0;
  presentAll(1);
  return API.state();
};

/* ---------------------------------------------------------------- readouts -- */

function chunkCount() {
  const ch = ctx.systems.get('chunks');
  if (!ch) return 0;
  if (typeof ch.residentCount === 'number') return ch.residentCount;
  if (typeof ch.residentCount === 'function') return ch.residentCount();
  if (ch.resident && typeof ch.resident.size === 'number') return ch.resident.size;
  if (typeof ch.stats === 'function') {
    const s = ch.stats();
    if (s && typeof s.resident === 'number') return s.resident;
    if (s && typeof s.loaded === 'number') return s.loaded;
  }
  if (typeof ch.forEachResident === 'function') {
    let n = 0;
    ch.forEachResident(() => { n++; });
    return n;
  }
  return 0;
}

function treeCount() {
  const f = ctx.systems.get('flora');
  if (!f) return 0;
  if (typeof f.treeCount === 'number') return f.treeCount;
  if (typeof f.stats === 'function') {
    const s = f.stats();
    if (s && typeof s.trees === 'number') return s.trees;
    if (s && typeof s.instances === 'number') return s.instances;
  }
  return 0;
}

function regionAt(x, z) {
  const t = ctx.systems.get('terrain');
  if (!t || typeof t.regionAt !== 'function') return null;
  const r = t.regionAt(x, z);
  if (r == null) return null;
  return typeof r === 'string' ? r : (r.id !== undefined ? r.id : null);
}

function roadDistAt(x, z) {
  if (typeof roadsMod.roadDistance !== 'function') return null;
  const d = roadsMod.roadDistance(x, z);
  return Number.isFinite(d) ? d : null;
}

/**
 * state() — read by tests/smoke.mjs (pos, chunks), tests/collision.mjs (pos vs heightAt) and
 * tests/interp.mjs (per-frame displacement of pos).
 *
 * `pos` is the PRESENTED pose (player.renderPos), not the raw sim pose. That is deliberate
 * and it is what makes interp.mjs able to fail: an un-interpolated build advances the raw
 * pose by one or two whole fixed steps per rendered frame and its displacement is bimodal.
 * `simPos` is the raw fixed-step position, for anything that needs the sim truth.
 */
// Counts for the M1 systems. Each asks the owner in ITS OWN vocabulary and falls back to
// null rather than to zero: a suite must be able to tell "none out there" from "nobody
// answered", and four failing checks this round could not.
function enemiesAlive() {
  const e = ctx.systems.get('enemies');
  if (!e) return null;
  if (typeof e.aliveCount === 'function') return e.aliveCount();
  if (typeof e.alive === 'function') { const a = e.alive(); return a ? a.length : null; }
  if (Array.isArray(e.all)) return e.all.filter(x => x && x.alive).length;
  return null;
}
function lightCount() {
  // lights.count() returns a CENSUS BREAKDOWN, not a number — {directional, hemisphere,
  // ambient, point, spot, other, shadows, total}. A suite comparing it against 13 compares
  // an object against a number and reports '[object Object] not in range', which is a real
  // failure message about nothing. The census law is about the total.
  const l = ctx.systems.get('lights');
  if (!l || typeof l.count !== 'function') return null;
  const c = l.count();
  return typeof c === 'number' ? c : (c && typeof c.total === 'number' ? c.total : null);
}
function audioState() {
  const a = ctx.systems.get('audio');
  if (!a) return null;
  const c = a.actx || a.audioCtx || a.context;
  return c ? c.state : (a.enabled === false ? 'disabled' : null);
}
function placeCounts() {
  const pl = ctx.systems.get('places');
  if (!pl) return null;
  const all = typeof pl.all === 'function' ? pl.all() : null;
  if (!all) return null;
  return {
    total: all.length,
    found: all.filter(q => q.discovered || q.found).length,
    claimed: all.filter(q => q.claimed).length,
  };
}

API.state = () => {
  const p = ctx.systems.get('player');
  const cam = ctx.systems.get('camera');
  const lights = ctx.systems.get('lights');
  const ps = p && p.state ? p.state() : null;
  const rp = p && p.renderPos ? p.renderPos : (ps ? ps.pos : null);
  const x = rp ? rp.x : 0, y = rp ? rp.y : 0, z = rp ? rp.z : 0;

  return {
    t: ctx.time.t,
    frame: ctx.time.frame,
    alpha: ctx.time.alpha,
    pos: [x, y, z],
    simPos: ps && ps.pos ? [ps.pos.x, ps.pos.y, ps.pos.z] : [x, y, z],
    yaw: cam ? cam.yaw : (ps ? ps.yaw : 0),
    pitch: cam ? cam.pitch : 0,
    fov: cam && cam.fovNow !== undefined ? cam.fovNow : CFG.render.fov,
    hp: ps ? ps.hp : 0,
    speed: ps ? ps.speed : 0,
    grounded: ps ? !!ps.grounded : false,
    crouched: ps ? !!ps.crouched : false,
    sliding: ps ? !!ps.sliding : false,
    sprinting: ps ? !!ps.sprinting : false,
    eyeY: ps ? ps.eyeY : 0,
    region: regionAt(x, z),
    road: roadDistAt(x, z),
    onRoad: typeof roadsMod.onRoad === 'function' ? !!roadsMod.onRoad(x, z) : false,
    chunks: chunkCount(),
    trees: treeCount(),
    torch: lights && lights.torchOn ? !!lights.torchOn() : false,
    scale: ctx.time.scale,
    // --- M1 ---------------------------------------------------------------------------
    enemies: enemiesAlive(),
    places: placeCounts(),
    audio: audioState(),
    phase: ctx.shared.phase,
    phaseT: ctx.shared.phaseT,
    tension: ctx.shared.tension,
    danger: ctx.shared.danger,
    lit: ctx.shared.lit,
    xp: ctx.shared.xp,
    level: ctx.shared.level,
    inCar: ctx.shared.inCar,
  };
};

API.frameStats = () => {
  const gfx = ctx.systems.get('gfx');
  const s = gfx && gfx.stats ? gfx.stats()
    : { draws: 0, tris: 0, programs: 0, geometries: 0, textures: 0 };

  const n = Math.min(frameN, RING);
  let fps = 0, median = 0, p95 = 0, max = 0;
  if (n > 0) {
    const buf = sortBuf.subarray(0, n);
    buf.set(frameMs.subarray(0, n));
    buf.sort();
    let sum = 0;
    for (let i = 0; i < n; i++) sum += buf[i];
    const mean = sum / n;
    fps = mean > 0 ? 1000 / mean : 0;
    median = buf[Math.floor(n * 0.5)];
    p95 = buf[Math.min(n - 1, Math.floor(n * 0.95))];
    max = buf[n - 1];
  }
  return {
    fps, median, p95, max, frames: n,
    draws: s.draws, tris: s.tris, programs: s.programs,
    geometries: s.geometries, textures: s.textures,
    // The census is the law every suite checks after play. It belongs here rather than in
    // each suite's own guess at where lights live.
    lights: lightCount(),
  };
};

/* ------------------------------------------------------------------- luma -- */

// gl.readPixels OUTSIDE the rAF callback returns pure black with preserveDrawingBuffer:false
// — confirmed on this machine on 2026-09-02 on a frame that was visibly rendering correctly.
// So the read happens inside renderFrame(), immediately after the composite, and the promise
// resolves from there. tests/smoke.mjs asserts max > 0 precisely to catch a wrong version.
const _lumaWaiters = [];
let _pix = null;
const _hist = new Array(16).fill(0);

function drainLuma() {
  const r = ctx.renderer;
  if (!r) { while (_lumaWaiters.length) _lumaWaiters.pop()(null); return; }
  const gl = r.getContext();
  r.setRenderTarget(null);                       // the composited default framebuffer
  const w = gl.drawingBufferWidth | 0;
  const h = gl.drawingBufferHeight | 0;
  const need = w * h * 4;
  if (!_pix || _pix.length < need) _pix = new Uint8Array(need);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, _pix);

  for (let i = 0; i < 16; i++) _hist[i] = 0;
  let sum = 0, max = 0, below8 = 0, samples = 0;
  // Every 4th pixel: 200k samples off a 1200x675 buffer is plenty for a mean and a histogram
  // and keeps the read cheap enough to sit in a frame.
  for (let i = 0; i < need; i += 16) {
    const l = 0.2126 * _pix[i] + 0.7152 * _pix[i + 1] + 0.0722 * _pix[i + 2];
    sum += l;
    if (l > max) max = l;
    if (l < 8) below8++;
    _hist[Math.min(15, l >> 4)]++;
    samples++;
  }
  const out = {
    mean: samples ? Math.round((sum / samples) * 10) / 10 : 0,
    max: Math.round(max),
    pctBelow8: samples ? Math.round((below8 / samples) * 1000) / 10 : 0,
    hist: _hist.slice(),
    width: w, height: h, samples,
  };
  while (_lumaWaiters.length) _lumaWaiters.pop()(out);
}

API.luma = () => new Promise((resolve) => {
  _lumaWaiters.push(resolve);
  // In test mode (or before the loop starts) nothing else is going to render, so pump one
  // frame from inside rAF — never from here, or the readback is black.
  if (!running) requestAnimationFrame(() => { renderFrame(); });
});

/* ----------------------------------------------------------------- config -- */

function deepMerge(dst, src) {
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!dst[k] || typeof dst[k] !== 'object') dst[k] = {};
      deepMerge(dst[k], v);
    } else dst[k] = v;
  }
  return dst;
}

/**
 * Live tuning for A/B, never for shipping defaults. CFG is deep-frozen (config.js:203) so a
 * patch CANNOT be written into it — a stray write there would be a silent retune. The patch
 * lands in ctx.tune, is handed to every system that implements config(patch), and the knobs
 * the engine owns outright are applied directly.
 */
API.config = (patch) => {
  if (!patch || typeof patch !== 'object') return ctx.tune;
  deepMerge(ctx.tune, patch);
  if (patch.render && typeof patch.render.renderScale === 'number') {
    const gfx = ctx.systems.get('gfx');
    if (gfx && gfx.setRenderScale) gfx.setRenderScale(patch.render.renderScale);
  }
  for (let i = 0; i < sysList.length; i++) {
    const s = sysList[i];
    if (typeof s.config === 'function') s.config(patch);
  }
  return ctx.tune;
};

/* ------------------------------------------------------------------- go -- */

boot().catch((err) => fail('boot failed at stage "' + ctx.bootStage + '"', err));

export { ctx };
