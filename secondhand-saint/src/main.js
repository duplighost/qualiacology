import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { createWorld } from './world.js';
import { createCampaignWorld } from './campaign-world.js';
import { createPlayerRig } from './characters.js';
import { createBossRoster } from './boss-roster.js';
import { ENCOUNTERS } from './campaign-data.js';
import { InputManager } from './input.js';
import { AudioEngine } from './audio.js';
import { EffectsSystem } from './effects.js';
import { GameUI } from './ui.js';
import { DuelGame, PLAYER_ACTIONS, BOSS_ATTACKS, BOSS_HEALTH, DEFENSE_WINDOWS } from './game.js';

const params = new URLSearchParams(location.search);
const QA = params.get('qa') === '1';
const AUTO_START = params.get('autostart') === '1';
const MUTED = params.get('mute') === '1';
const DUEL_ONLY = params.get('duel') === '1';
const DEBUG_ENCOUNTER = params.get('encounter');
const DEBUG_SCENARIO = params.get('scenario');
const SEED = Number(params.get('seed') || 1337) >>> 0;
const QUALITY = params.get('quality') || 'high';
const SIM_DT = 1 / 60;
const PLAYER_ASSET_ID = 'nera-player-v016';

const canvas = document.getElementById('game');
const ui = new GameUI();
ui.startButton.disabled = true;
ui.setMuted(MUTED);

let renderer;
let scene;
let camera;
let world;
let playerRig;
let bossRig;
let effects;
let input;
let audio;
let game;
let ready = false;
let bootError = null;
let bootStage = 'renderer';
let accumulator = 0;
let previousTime = performance.now();
let captureResolvers = [];
let renderFrames = 0;
let playerShellLoadCount = 0;
let playerShellPromise = null;

function loadPlayerAuthoredShell() {
  if (playerShellPromise) return playerShellPromise;
  playerShellPromise = (async () => {
    playerShellLoadCount += 1;
    try {
      const loader = new GLTFLoader();
      const assetUrl = new URL('../assets/characters/nera-player-v016.glb', import.meta.url);
      // Parse the completed response directly. GLTFLoader's FileLoader progress
      // clone is useful for download UIs, but Chromium reports its deliberately
      // cancelled clone as a failed request even when the GLB parsed correctly.
      const response = await fetch(assetUrl.href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${PLAYER_ASSET_ID} request failed with HTTP ${response.status}`);
      const gltf = await loader.parseAsync(
        await response.arrayBuffer(),
        new URL('./', assetUrl).href,
      );
      const authoredScene = gltf.scene || gltf.scenes?.[0];
      if (!authoredScene?.isObject3D) throw new Error(`${PLAYER_ASSET_ID} did not contain a scene root`);
      authoredScene.name = `${PLAYER_ASSET_ID} authored player shell`;
      return Object.freeze({
        scene: authoredScene,
        assetId: PLAYER_ASSET_ID,
        assetUuid: authoredScene.uuid,
        loadCount: playerShellLoadCount,
        error: null,
      });
    } catch (error) {
      console.warn('[SECONDHAND SAINT] authored player shell unavailable; using procedural fallback', error);
      return Object.freeze({
        scene: null,
        assetId: PLAYER_ASSET_ID,
        assetUuid: null,
        loadCount: playerShellLoadCount,
        error: String(error?.message || error),
      });
    }
  })();
  return playerShellPromise;
}

function configureRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: QUALITY !== 'low',
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = QUALITY === 'low' ? 1.02 : 1.08;
  renderer.shadowMap.enabled = QUALITY !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY === 'ultra' ? 1.5 : QUALITY === 'low' ? 0.85 : 1.15));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.info.autoReset = true;
}

async function init() {
  try {
    configureRenderer();
    bootStage = 'scene';
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070812);
    scene.fog = new THREE.FogExp2(0x0b0c1b, .0135);
    camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .06, 420);
    camera.position.set(0, 5, 17);

    const meridian = createWorld(scene, renderer);
    world = createCampaignWorld(scene, renderer, meridian);
    bootStage = 'player-visual';
    const playerShell = await loadPlayerAuthoredShell();
    bootStage = 'characters';
    playerRig = createPlayerRig(playerShell);
    bossRig = createBossRoster();
    scene.add(playerRig.group, bossRig.group);
    // Nera's readability floor is authored into her own materials. Player-
    // attached lights still enter every physical shader in the scene, so the
    // arena keys own form and her ivory/crimson values own separation.

    bootStage = 'systems';
    effects = new EffectsSystem(scene, { maxParticles: QUALITY === 'low' ? 560 : 900 });
    input = new InputManager(canvas);
    audio = new AudioEngine({ muted: MUTED });
    game = new DuelGame({
      renderer, scene, camera, world, playerRig, bossRig, effects, audio, input, ui,
      seed: SEED,
      campaignEnabled: !DUEL_ONLY,
    });

    bootStage = 'warmup';
    meridian.precompile?.(camera);
    effects.precompile?.(renderer, camera);
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    world.update?.(0, 0, .2);
    playerRig.update?.({ action: 'idle', actionTime: 0, moveSpeed: 0, airborne: false, healthRatio: 1 }, 0, 0);
    bossRig.update?.({ action: 'bossIdle', actionTime: 0, moveSpeed: 0, airborne: false, healthRatio: 1, phase: 1 }, 0, 0);
    renderer.compile(scene, camera);

    bootStage = 'ready';
    ready = true;
    ui.setReady('The Meridian is ready');
    installQA();
    window.dispatchEvent(new CustomEvent('secondhand-saint-ready'));
    game._event('game.ready', rendererSummary());
    if (QA && DEBUG_ENCOUNTER) game.debugScenario(`encounter:${DEBUG_ENCOUNTER}`);
    if (QA && DEBUG_SCENARIO) game.debugScenario(DEBUG_SCENARIO);
    if (AUTO_START) queueMicrotask(() => game.start());
    requestAnimationFrame(loop);
  } catch (error) {
    bootError = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : String(error);
    bootStage = 'failed';
    console.error('[SECONDHAND SAINT] boot failed', error);
    ui.status.textContent = `The Meridian failed to turn: ${error?.message || error}`;
    ui.status.style.opacity = '1';
    installQA();
  }
}

function loop(now) {
  const rawMs = Math.min(100, Math.max(0, now - previousTime));
  previousTime = now;
  game.recordFrame(rawMs);
  accumulator = Math.min(.25, accumulator + rawMs / 1000);
  let steps = 0;
  while (accumulator >= SIM_DT && steps < 8) {
    game.update(SIM_DT, now / 1000);
    accumulator -= SIM_DT;
    steps++;
  }
  if (steps === 0 && game.mode === 'title') game.update(Math.min(SIM_DT, rawMs / 1000), now / 1000);
  renderer.render(scene, camera);
  renderFrames++;
  if (captureResolvers.length) {
    const pending = captureResolvers.splice(0);
    let dataUrl;
    try { dataUrl = canvas.toDataURL('image/png'); }
    catch (error) { for (const { reject } of pending) reject(error); dataUrl = null; }
    if (dataUrl) for (const { resolve } of pending) resolve(dataUrl);
  }
  requestAnimationFrame(loop);
}

function resize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, innerWidth);
  const height = Math.max(1, innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  if (game && !game.paused) game.setPaused(true, 'context-lost');
  ui.status.textContent = 'Rebinding the broken dial…';
  ui.status.style.opacity = '1';
  game?._event('webgl.contextLost');
});

canvas.addEventListener('webglcontextrestored', () => {
  renderer.compile(scene, camera);
  ui.status.textContent = 'The dial is whole. Resume when ready.';
  game?._event('webgl.contextRestored');
});

function rendererSummary() {
  if (!renderer) return { available: false };
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    available: true,
    webgl2: gl instanceof WebGL2RenderingContext,
    vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
    shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    timerQuery: Boolean(gl.getExtension('EXT_disjoint_timer_query_webgl2')),
    drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    pixelRatio: renderer.getPixelRatio(),
    shadowMap: renderer.shadowMap.enabled,
    quality: QUALITY
  };
}

function sceneGraphSummary() {
  if (!scene) return [];
  return scene.children.map((root) => {
    const totals = {
      meshes: 0,
      visibleMeshes: 0,
      shadowCasters: 0,
      visibleTriangles: 0,
      visibleShadowTriangles: 0,
      estimatedBeautyPasses: 0,
      estimatedShadowPasses: 0,
      transparentMeshes: 0,
      doubleSidedTransparentMeshes: 0,
    };
    const visit = (object, parentVisible) => {
      const hierarchyVisible = parentVisible && object.visible;
      const rendered = hierarchyVisible && object.layers.test(camera.layers);
      if (object.isMesh || object.isInstancedMesh) {
        totals.meshes += 1;
        if (rendered) {
          const positionCount = object.geometry?.attributes?.position?.count || 0;
          const triangleCount = (object.geometry?.index?.count || positionCount) / 3;
          const groups = object.geometry?.groups || [];
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          const activeMaterials = Array.isArray(object.material) && groups.length
            ? groups.map((group) => materials[group.materialIndex]).filter(Boolean)
            : materials.filter(Boolean);
          totals.visibleMeshes += 1;
          totals.visibleTriangles += Math.round(triangleCount * (object.isInstancedMesh ? object.count : 1));
          for (const material of activeMaterials) {
            const transparent = Boolean(material.transparent && material.opacity > 0);
            const doublePass = transparent && material.side === THREE.DoubleSide && !material.forceSinglePass;
            totals.estimatedBeautyPasses += doublePass ? 2 : 1;
            if (transparent) totals.transparentMeshes += 1;
            if (doublePass) totals.doubleSidedTransparentMeshes += 1;
          }
          if (object.castShadow) {
            totals.shadowCasters += 1;
            totals.visibleShadowTriangles += Math.round(
              triangleCount * (object.isInstancedMesh ? object.count : 1),
            );
            totals.estimatedShadowPasses += Math.max(1, activeMaterials.length);
          }
        }
      }
      object.children.forEach((child) => visit(child, hierarchyVisible));
    };
    visit(root, true);
    return { name: root.name || root.type, visible: root.visible, ...totals };
  });
}

function gameplayHash() {
  if (!game) return 'unready';
  const snap = game.snapshot();
  const truth = {
    tick: snap.tick,
    mode: snap.mode,
    player: snap.player,
    boss: snap.boss,
    world: snap.world,
    missiles: snap.missiles,
    hitstop: snap.hitstop
  };
  const text = JSON.stringify(truth);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function captureNextFrame() {
  return new Promise((resolve, reject) => captureResolvers.push({ resolve, reject }));
}

function installQA() {
  const readOnly = {
    version: '2.0.0',
    buildId: 'secondhand-saint-2.0.0',
    get ready() { return ready; },
    get bootStage() { return bootStage; },
    get bootError() { return bootError; },
    get renderFrames() { return renderFrames; },
    snapshot: () => game?.snapshot() || { mode: 'boot', bootStage, bootError },
    stateHash: gameplayHash,
    eventsSince: (sequence) => game?.eventsSince(sequence) || [],
    perfSummary: () => game?.perfSummary() || {},
    rendererSummary,
    sceneGraphSummary,
    captureNextFrame,
    visualSnapshot: () => playerRig?.visualSnapshot?.() || Object.freeze({
      mode: 'procedural-fallback',
      assetId: null,
      loadCount: playerShellLoadCount,
      shellUuid: null,
      mappedBones: Object.freeze([]),
      missingBones: Object.freeze([]),
      finitePose: true,
      gripError: null,
    }),
    manifests: Object.freeze({
      playerActions: PLAYER_ACTIONS,
      bossAttacks: DUEL_ONLY
        ? Object.freeze(Object.fromEntries(Object.entries(BOSS_ATTACKS).filter(([, attack]) => !attack.encounter || attack.encounter === 'vespera')))
        : BOSS_ATTACKS,
      bossHealth: BOSS_HEALTH,
      encounters: ENCOUNTERS,
      defenseWindows: DEFENSE_WINDOWS,
      missiles: Object.freeze({
        capacity: 12,
        commitmentDistance: 6.05,
        playerCollisionRadius: .92,
        returnCollisionRadius: 1.5,
        swordReturnDamage: 220,
        deflectReturnDamage: 300,
        meridianReturnDamage: 350,
      }),
    })
  };
  if (QA) {
    Object.assign(readOnly, {
      reset: (reason) => game.debugReset(reason),
      loadScenario: (name) => game.debugScenario(name),
      setQuality: () => { game.debugMutationCount++; return { quality: QUALITY, requiresReload: true }; },
      loseWebGLContext: () => {
        game.debugMutationCount++;
        const extension = renderer.getContext().getExtension('WEBGL_lose_context');
        extension?.loseContext();
        return Boolean(extension);
      }
    });
  }
  const api = Object.freeze(readOnly);
  window.__DUEL_QA__ = api;
  window.__SECONDHAND_SAINT__ = api;
}

init();
