// VIGIL — boot, the SYSTEMS manifest, and the loop.
//
// LOOP LAW (Duskfall verbatim): rAF -> realDt = clamp(dt, 0, 0.05) -> ONE
// step -> render. No accumulator, no catch-up, no interpolation debt: a tab
// switch or GC hitch integrates at most one 1/20 s step — nothing teleports.
//
// CANVAS LAW: CSS is the only sizing authority. Every renderer.setSize call
// passes updateStyle:false (Relay//Eclipse's screen-cutoff bug was one boot
// call that forgot).
//
// MANIFEST LAW (the FLARE lesson): every system module in src/ that exports
// create() MUST be constructed here, in this order; tests/reverse-manifest
// walks the tree and fails if one is missing. Construction order = update
// order. Cross-system wiring happens after ALL systems exist.

import * as THREE from 'three';
import { clamp, Rng } from './engine/math.js';
import * as input from './engine/input.js';
import * as audio from './engine/audio.js';
import * as world from './world/world.js';
import * as fx from './fx/fx.js';
import * as player from './player/controller.js';
import * as camera from './player/camera.js';
import * as weapons from './weapons/weapon.js';
import * as combat from './combat/combat.js';
import * as enemies from './enemies/enemies.js';
import * as director from './director/director.js';
import * as hud from './ui/hud.js';
import * as post from './gfx/post.js';
import { setLunarSurfaceSource } from './gfx/surfaces.js';

const SYSTEMS = [
  ['input', input],
  ['audio', audio],
  ['world', world],
  ['fx', fx],
  ['player', player],
  ['camera', camera],
  ['weapons', weapons],
  ['combat', combat],
  ['enemies', enemies],
  ['director', director],
  ['hud', hud],
  ['post', post],
];

/* ---------------- context ---------------- */

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 is required.');
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false); // CSS owns style
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMappingExposure = 1.28;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// composer passes do their own clearing; the viewmodel overlay draws on top
renderer.autoClear = false;

const ctx = {
  canvas,
  renderer,
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.05, 700),
  rng: new Rng(1337),
  state: 'boot',            // boot | menu | playing | paused | dead | won
  time: 0,
  systems: {},
  shared: { flashEV: 0 },   // per-shot exposure transient, read by world
  debug: { god: false },
  bus: (() => {
    const map = new Map();
    return {
      on(ev, fn) { (map.get(ev) || map.set(ev, []).get(ev)).push(fn); },
      emit(ev, data) { const l = map.get(ev); if (l) for (const fn of l) fn(data); },
    };
  })(),
  // internal render scale governor (simple, hysteretic; CSS untouched)
  quality: { scale: 1.0 },
};

const VG = window.__VG = {
  ready: false,
  bootStage: 'init',
  bootError: null,
  version: '0.4.0-lunar-siege',
};

/* ---------------- resize: ONE handler, one authority ---------------- */

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const scale = ctx.quality.scale;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * scale);
  renderer.setSize(w, h, false);
  ctx.camera.aspect = w / h;
  ctx.camera.updateProjectionMatrix();
  ctx.systems.post?.setSize(w, h);
  ctx.systems.weapons?.onResize(w, h);
  ctx.systems.hud?.onResize(w, h);
}
window.addEventListener('resize', resize);

/* ---------------- boot ---------------- */

function buildEnvironment() {
  // A tiny painted equirect -> PMREM: without an environment, metal materials
  // (the relay panels, the gun) render black. Two-hue sky: cool zenith, faint
  // cyan horizon glow, violet accent — matched to the cosmos palette.
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 32);
  grad.addColorStop(0, '#1c2742');
  grad.addColorStop(0.45, '#131a30');
  grad.addColorStop(0.55, '#2a3a55');
  grad.addColorStop(0.62, '#151c2e');
  grad.addColorStop(1, '#05070d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 32);
  g.fillStyle = 'rgba(93,223,255,0.5)';
  g.fillRect(6, 14, 10, 4);
  g.fillStyle = 'rgba(168,124,255,0.4)';
  g.fillRect(44, 12, 9, 5);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

async function boot() {
  VG.bootStage = 'assets';
  const lunarAlbedo = await new THREE.ImageLoader().loadAsync('./assets/textures/lunar-regolith-albedo-v1.png');
  setLunarSurfaceSource(lunarAlbedo);
  VG.bootStage = 'systems';
  const env = buildEnvironment();
  ctx.scene.environment = env;
  ctx.scene.environmentIntensity = 0.22;
  for (const [id, mod] of SYSTEMS) {
    ctx.systems[id] = mod.create(ctx);
    if (ctx.systems[id].id !== id) throw new Error(`system id mismatch: ${id}`);
  }
  ctx.systems.weapons.viewScene.environment = env;
  ctx.systems.weapons.viewScene.environmentIntensity = 0.6;
  VG.bootStage = 'wire';
  for (const [id] of SYSTEMS) ctx.systems[id].wire?.();
  for (const [id] of SYSTEMS) {
    if (ctx.systems[id].ready && !ctx.systems[id].ready()) {
      throw new Error(`system not ready after wiring: ${id}`);
    }
  }

  // compile every shader now — first-trigger-pull hitches are a boot problem
  VG.bootStage = 'compile';
  ctx.systems.camera.lateUpdate(0);
  await renderer.compileAsync(ctx.scene, ctx.camera).catch(() => renderer.compile(ctx.scene, ctx.camera));
  ctx.systems.weapons.warmup?.();
  ctx.systems.fx.warmup?.();
  ctx.systems.enemies.warmup?.();
  VG.bootStage = 'prime';
  for (let i = 0; i < 8; i++) {
    ctx.systems.post.render();
    await new Promise(r => requestAnimationFrame(r));
  }
  ctx.systems.enemies.cooldownWarmup?.();

  setState('menu');
  VG.bootStage = 'ready';
  VG.ready = true;
}

/* ---------------- state machine ---------------- */

function setState(next) {
  const prev = ctx.state;
  ctx.state = next;
  ctx.bus.emit('state', { prev, next });
  if (next === 'playing' && !VG.noLock && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
  }
}

document.addEventListener('pointerlockchange', () => {
  if (VG.noLock) return;
  if (document.pointerLockElement !== canvas && ctx.state === 'playing') setState('paused');
});
ctx.bus.on('input:clickthrough', () => {
  if (ctx.state === 'menu' || ctx.state === 'paused') startOrResume();
});
ctx.bus.on('player:died', () => setState('dead'));

function startOrResume() {
  if (ctx.state === 'menu') {
    ctx.systems.director.startRun();
    setState('playing');
  } else if (ctx.state === 'paused') {
    setState('playing');
  } else if (ctx.state === 'dead') {
    resetRun();
    ctx.systems.director.startRun({ retry: true });   // same wave, mercy applied
    setState('playing');
  } else if (ctx.state === 'won') {
    resetRun();
    ctx.systems.director.startRun();                  // a fresh watch from I
    setState('playing');
  }
  if (!VG.noLock) canvas.requestPointerLock?.();
}
ctx.bus.on('run:won', () => setState('won'));
ctx.bus.on('ui:start', startOrResume);

function resetRun() {
  ctx.systems.world.reset?.();
  ctx.systems.player.reset();
  ctx.systems.enemies.reset();
  ctx.systems.director.reset();
  ctx.systems.weapons.reset();
  ctx.systems.combat.reset();
  ctx.systems.camera.resetTransient();
}

/* ---------------- the loop ---------------- */

let last = performance.now();
let fpsAccum = 0, fpsFrames = 0, fpsValue = 60;
let slowTime = 0, healthyTime = 0;

function step(dt) {
  ctx.time += dt;
  const S = ctx.systems;
  const gdt = dt * S.fx.consumeTimeScale();
  if (ctx.state === 'playing' && S.input.pressed('menu')) {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    else setState('paused');
  }
  if (ctx.state === 'playing') {
    S.camera.update(dt);
    S.player.update(gdt);
    S.weapons.update(gdt, dt);
    S.combat.update(gdt);
    S.enemies.update(gdt);
    S.director.update(gdt);
  }
  S.world.update(dt);
  S.fx.update(dt);
  S.audio.update(dt);
  S.camera.lateUpdate(dt);
  S.weapons.lateUpdate?.(dt);
  S.hud.update(dt);
  S.input.endFrame();
}

function frame(now) {
  requestAnimationFrame(frame);
  const realDt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  if (!VG.ready) return;
  if (!VG.freeze) step(realDt);
  renderer.info.autoReset = false;
  renderer.info.reset();
  ctx.systems.post.render();
  ctx.systems.weapons.renderOverlay();

  // simple hysteretic resolution governor
  fpsAccum += realDt; fpsFrames++;
  if (fpsAccum >= 0.5) {
    const avg = fpsAccum / fpsFrames;
    fpsValue = 1 / avg;
    fpsAccum = 0; fpsFrames = 0;
    if (avg > 0.022) { slowTime += 0.5; healthyTime = 0; } else { healthyTime += 0.5; slowTime = 0; }
    if (slowTime >= 3 && ctx.quality.scale > 0.65) {
      ctx.quality.scale = Math.max(0.65, ctx.quality.scale * 0.85);
      slowTime = 0;
      resize();
    } else if (healthyTime >= 12 && ctx.quality.scale < 1.0) {
      ctx.quality.scale = Math.min(1.0, ctx.quality.scale / 0.85);
      healthyTime = 0;
      resize();
    }
  }
}

/* ---------------- harness surface ---------------- */

Object.assign(VG, {
  ctx,
  start: () => startOrResume(),
  setStateForTest: (s) => setState(s),
  advance(seconds) {
    const n = Math.min(Math.round(seconds * 60), 3600);
    for (let i = 0; i < n; i++) step(1 / 60);
  },
  settle(n = 12) {
    return new Promise((resolve) => {
      let i = 0;
      const one = () => {
        if (++i >= n) return resolve();
        requestAnimationFrame(one);
      };
      requestAnimationFrame(one);
    });
  },
  state() {
    const S = ctx.systems;
    return {
      state: ctx.state,
      fps: Math.round(fpsValue * 10) / 10,
      pos: S.player ? { x: S.player.pos.x, y: S.player.pos.y, z: S.player.pos.z } : null,
      hp: S.player?.hp,
      shield: S.player?.shield,
      wave: S.director?.wave,
      alive: S.enemies?.aliveCount,
      queued: S.director?.queued,
      ammo: S.weapons?.ammoState(),
      spreadDeg: S.weapons?.spreadDeg,
      kick: S.weapons?.kickState(),
      fireCount: S.weapons?.fireCount,
      draws: renderer.info.render.calls,
      programs: renderer.info.programs?.length,
      scale: ctx.quality.scale,
    };
  },
  inject: () => ctx.systems.input.inject,
  combatDump: () => ctx.systems.weapons?.dump(),
  spawnWave: (n) => ctx.systems.director?.debugSpawnWave(n),
});

boot().catch((e) => {
  VG.bootError = e?.message || String(e);
  VG.bootStage = 'error';
  throw e;
});
requestAnimationFrame(frame);
