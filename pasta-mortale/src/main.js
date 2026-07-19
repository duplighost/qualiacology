import * as THREE from "../vendor/three.module.js";
import { SpaghettiAudio } from "./audio.js";
import { InputController } from "./input.js";
import { createSpaghettiWorld } from "./world.js?v=14";
import { createSpaghettiRain } from "./spaghetti-rain.js";
import { createCameraSpaghetti } from "./camera-spaghetti.js";
import { createPastaCombat } from "./combat.js";
import { createCinematicFX } from "./cinematic-fx.js";

const params = new URLSearchParams(location.search);
const AUTOTEST = params.get("autotest") === "1";
const FAST_FILL = params.get("fastfill") === "1";
const SEED = Number(params.get("seed")) || 1337;
const mobileLike = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
const QUALITY = params.get("quality") || (mobileLike ? "low" : "high");
const FIXED_STEP = 1 / 60;
const PLAYER_RADIUS = 0.31;
const PLAYER_HEIGHT = 1.78;
const CROUCH_HEIGHT = 1.08;
const BASE_EYE_HEIGHT = 1.62;
const CROUCH_EYE_HEIGHT = 0.96;
const WALK_SPEED = 3.45;
const RUN_SPEED = 5.35;
const STEP_HEIGHT = 0.36;
const GROUND_SNAP = 0.24;
const GRAVITY = 18.5;
const JUMP_VELOCITY = 7.25;
const COYOTE_TIME = 0.13;
const JUMP_BUFFER_TIME = 0.15;
const MAX_MANTLE_HEIGHT = 1.02;
const MANTLE_DURATION = 0.2;
const MAX_PITCH = Math.PI * 0.465;
const MIN_GLOSSY_BRAKE = 3.15;
const MAX_GROUND_BRAKE = 12.8;
const MAX_SURFACE_SPEED = 7.15;
const SPAGHETTI_WARNING_DEPTH = 0.31;
const SPAGHETTI_DAMAGE_DEPTH = 1.05;
const SPAGHETTI_CRITICAL_DEPTH = 1.35;

const canvas = document.querySelector("#game");
const lensCanvas = document.querySelector("#camera-spaghetti");
const stage = document.querySelector("#stage");
const loadingScreen = document.querySelector("#loading-screen");
const titleScreen = document.querySelector("#title-screen");
const pauseScreen = document.querySelector("#pause-screen");
const endingScreen = document.querySelector("#ending-screen");
const startButton = document.querySelector("#start-button");
const resumeButton = document.querySelector("#resume-button");
const restartButton = document.querySelector("#restart-button");
const restartPauseButton = document.querySelector("#restart-pause-button");
const loadStatus = document.querySelector("#load-status");
const hud = document.querySelector("#hud");
const touchUI = document.querySelector("#touch-ui");
const touchPauseButton = document.querySelector("#touch-pause");
const touchReloadButton = document.querySelector("#touch-reload");
const touchReloadCopy = touchReloadButton?.querySelector("small");
const touchPunchButton = document.querySelector("#touch-punch");
const punchStatus = document.querySelector("#punch-status");
const punchStatusCopy = punchStatus?.querySelector("small");
const punchStatusAction = punchStatus?.querySelector("strong");
const roomLabel = document.querySelector("#room-label");
const objective = document.querySelector("#objective");
const fillMeter = document.querySelector("#fill-meter");
const fillLevelEl = document.querySelector("#fill-level");
const fillMarker = document.querySelector("#fill-marker");
const depthLabel = document.querySelector("#depth-label");
const floodLevelLabel = document.querySelector("#flood-level-label");
const depthWarning = document.querySelector("#depth-warning");
const depthWarningLevel = document.querySelector("#depth-warning-level");
const depthWarningCopy = document.querySelector("#depth-warning-copy");
const tractionWarning = document.querySelector("#traction-warning");
const tractionWarningLevel = document.querySelector("#traction-warning-level");
const tractionWarningCopy = document.querySelector("#traction-warning-copy");
const dangerCopy = document.querySelector("#danger-copy");
const hint = document.querySelector("#hint");
const endingKicker = document.querySelector("#ending-kicker");
const endingTitle = document.querySelector("#ending-title");
const endingCopy = document.querySelector("#ending-copy");
const endingStats = document.querySelector("#ending-stats");
const healthValue = document.querySelector("#health-value");
const sauceArmorValue = document.querySelector("#sauce-armor-value");
const healthRail = document.querySelector(".health-rail");
const armorRail = document.querySelector(".armor-rail");
const ammoValue = document.querySelector("#ammo-value");
const reserveValue = document.querySelector("#reserve-value");
const waveValue = document.querySelector("#wave-value");
const enemyValue = document.querySelector("#enemy-value");
const scoreValue = document.querySelector("#score-value");
const reloadLabel = document.querySelector("#reload-label");
const weaponStatus = document.querySelector(".weapon-status");
const bossWrap = document.querySelector("#boss-wrap");
const bossName = document.querySelector("#boss-name");
const bossFill = document.querySelector("#boss-fill");
const killFeed = document.querySelector("#kill-feed");
const reticle = document.querySelector("#reticle");
const hitmarker = document.querySelector("#hitmarker");
const damageFlash = document.querySelector("#damage-flash");

let renderer;
let scene;
let camera;
let world;
let spaghettiRain;
let cameraSpaghetti;
let cinematicFX;
let input;
let audio;
let combat;
let phase = "loading";
let lastFrame = performance.now();
let accumulator = 0;
let frameCount = 0;
let elapsed = 0;
let runStartedAt = 0;
let fillMultiplier = FAST_FILL ? 9 : 1;
let narrativeIndex = 0;
let messageTimer = 0;
let submergeTimer = 0;
let side = -1;
let audioStepBase = 0;
let audioWetStepBase = 0;
let renderReady = false;
let autotestStart = null;
let autotestInitialFill = 0;
let autotestFrames = 0;
let rainImpactBase = 0;
let rainIntensityValue = -1;
let nextLensHitAt = 1.8;
let lensWadeCooldown = 0;
let lensSplatEvents = 0;
let lensImpactEvents = 0;
let lensRandomState = (SEED ^ 0x51a9e77) >>> 0;
let debugJumpHeld = false;
let debugJumpQueued = false;
let debugPunchHeld = false;
let lastCombatKills = 0;
let lastCombatShots = 0;
let lastCombatHits = 0;
let lastCombatPunchHits = 0;
let lastCombatPunchKills = 0;
let lastCombatHealth = 100;
let damageFlashTimer = 0;
let hitmarkerTimer = 0;
let spaghettiDamageCooldown = 0.35;
let spaghettiDamagePulses = 0;
let spaghettiDamageTotal = 0;
let spaghettiHazardActive = false;
let spaghettiDamageActive = false;
let spaghettiHazardSeverity = 0;
let lastDamageSource = "none";
let lastSlickSurfaceId = null;
let punchCameraKick = 0;
const errors = [];

const player = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  eyeY: BASE_EYE_HEIGHT,
  depth: 0,
  speed: 0,
  speedMultiplier: 1,
  distance: 0,
  stepDistance: 0,
  bobPhase: 0,
  room: "foyer",
  grounded: true,
  supportId: "ground",
  coyote: COYOTE_TIME,
  jumpBuffer: 0,
  jumpHeld: false,
  airTime: 0,
  checkpointId: "spawn",
  crouching: false,
  slideTimer: 0,
  slideEntrySpeed: 0,
  slideHeadingX: 0,
  slideHeadingZ: -1,
  surfaceCollider: null,
  surfaceId: "mansion floor",
  surfaceKind: "ground",
  surfaceContact: true,
  surfaceWetness: 0.68,
  effectiveWetness: 0.68,
  surfaceFriction: 0.43,
  surfaceGrip: 0.56,
  surfaceWidth: 60,
  edgeRecovery: 0,
  surfaceSlope: 0,
  downhillX: 0,
  downhillZ: 0,
  downhillAcceleration: 0,
  lateralSlip: 0,
  slipAmount: 0,
  rampSlipCue: 0,
  slipping: false,
  lateralDriftAcceleration: 0,
  surfaceBraking: MAX_GROUND_BRAKE,
  surfaceTraction: 1,
  sprintSlip: 0,
  landingSlipTimer: 0,
  landingSlipStrength: 0,
  landingSlipEvents: 0,
  mantle: null,
  lastGroundSpeed: 0,
  fallVelocity: 0,
  currentHeight: PLAYER_HEIGHT,
  currentEyeHeight: BASE_EYE_HEIGHT
};

window.addEventListener("error", (event) => {
  errors.push(event.message || "window error");
});
window.addEventListener("unhandledrejection", (event) => {
  errors.push(String(event.reason?.message || event.reason || "unhandled rejection"));
});

boot().catch((error) => {
  errors.push(error instanceof Error ? error.message : String(error));
  console.error(error);
  loadStatus.textContent = "THE KITCHEN CAUGHT FIRE";
  loadingScreen.classList.remove("active");
  titleScreen.classList.add("active");
  startButton.disabled = true;
});

async function boot() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: QUALITY !== "low",
    alpha: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: AUTOTEST
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY === "low" ? 1.2 : 1.55));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = QUALITY === "low" ? 1.08 : 1.18;
  renderer.shadowMap.enabled = QUALITY !== "low";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090302);
  scene.fog = new THREE.FogExp2(0x160704, QUALITY === "low" ? 0.012 : 0.0085);

  camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.045, 145);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  input = new InputController(canvas);
  audio = new SpaghettiAudio({ disabled: false, maxVoices: QUALITY === "low" ? 12 : 18 });
  cameraSpaghetti = createCameraSpaghetti({
    canvas: lensCanvas,
    quality: QUALITY,
    seed: SEED + 2401
  });

  if (input.isTouch) {
    document.body.classList.add("touch-mode");
    touchUI.classList.remove("hidden");
    startButton.querySelector("small").textContent = "LEFT MOVE · RIGHT LOOK · FIRE + PUNCH + JUMP + SAUCE";
  }

  world = await createSpaghettiWorld({
    scene,
    renderer,
    quality: QUALITY,
    seed: SEED
  });
  cinematicFX = createCinematicFX({
    scene,
    renderer,
    camera,
    quality: QUALITY,
    seed: SEED + 1777,
    worldBounds: world.worldBounds,
    fireAnchors: [
      { x: 0, y: 11.9, z: 12.6, radius: 2.4, height: 4.8, intensity: 1.15 },
      { x: -5.2, y: 10.8, z: -1.4, radius: 1.8, height: 4.2, intensity: 1 },
      { x: 5.2, y: 11.4, z: -11.2, radius: 2.05, height: 4.5, intensity: 1.08 },
      { x: -11.5, y: 0.35, z: 19.5, radius: 0.7, height: 3.2, intensity: 0.82 },
      { x: 11.5, y: 0.35, z: 19.5, radius: 0.7, height: 3.2, intensity: 0.82 },
      { x: -11.4, y: 0.35, z: -2.5, radius: 0.75, height: 3.4, intensity: 0.92 },
      { x: 11.4, y: 0.35, z: -2.5, radius: 0.75, height: 3.4, intensity: 0.92 },
      { x: 0, y: 4.75, z: -28, radius: 1, height: 4.2, intensity: 1.2 }
    ],
    steamAnchors: [
      { x: -13, y: 0.08, z: 14, radius: 3.2, height: 5.5, intensity: 0.9 },
      { x: 12, y: 0.08, z: 8, radius: 3.4, height: 6, intensity: 1 },
      { x: -7, y: 0.08, z: -5, radius: 4.1, height: 6.5, intensity: 1.1 },
      { x: 8, y: 0.08, z: -15, radius: 3.7, height: 7, intensity: 1.05 },
      { x: 0, y: 4.42, z: -26, radius: 3, height: 6, intensity: 1.15 }
    ],
    sauceY: 0.074,
    sauceSheen: [
      {
        name: "living marinara nave sheen",
        x: 0,
        y: 0.074,
        z: -2.5,
        width: 43.2,
        depth: 56.2,
        opacity: QUALITY === "low" ? 0.08 : 0.16,
        color: 0x751006,
        highlightColor: 0xff8d3d
      },
      {
        name: "west exterior rising sauce sheen",
        x: -24.8,
        y: 0.074,
        z: 1.5,
        width: 6.4,
        depth: 21,
        opacity: QUALITY === "low" ? 0.07 : 0.13,
        color: 0x751006,
        highlightColor: 0xff8d3d
      },
      {
        name: "east exterior rising sauce sheen",
        x: 24.8,
        y: 0.074,
        z: 1.5,
        width: 6.4,
        depth: 21,
        opacity: QUALITY === "low" ? 0.07 : 0.13,
        color: 0x751006,
        highlightColor: 0xff8d3d
      }
    ],
    heatLight: {
      color: 0xff5b1d,
      intensity: QUALITY === "low" ? 1.4 : 2.8,
      distance: 7.5,
      decay: 1.7
    },
    autoCombatEvents: true
  });
  spaghettiRain = await createSpaghettiRain({
    scene,
    quality: QUALITY,
    seed: SEED + 991
  });
  combat = await createPastaCombat({
    scene,
    camera,
    quality: QUALITY,
    touchMode: input.isTouch,
    sampleSurfaceY: (x, z, feetY) => sampleCombatSurfaceYAt(x, z, feetY),
    isPositionBlocked: (position, radius, height) => isCombatPositionBlocked(position, radius, height),
    resolveMovement: (position, delta, radius, height) => resolveCombatMovement(position, delta, radius, height),
    traceWorld: (from, to) => traceCombatSegment(from, to),
    getCombatData: () => world?.getCombatData?.() || world?.combatData || null,
    onMessage: (message) => showMessage(message, 2.2),
    onDamage: (amount = 0, source = "enemy") => flashDamage(amount, source),
    onVictory: () => {
      world?.setExitOpen?.(true);
      showMessage("NOODLEMANCER SEVERED \u00b7 GATE OPEN \u00b7 TAKE EITHER OUTSIDE CROWN BRIDGE", 5.2);
    },
    onDefeat: (source = "enemy") => finish(source === "rising-spaghetti" ? "drowned" : "defeated"),
    onLensSplat: (config = {}) => splatLens({
      x: Number.isFinite(config.x) ? config.x : 0.5,
      y: Number.isFinite(config.y) ? config.y : 0.48,
      intensity: Number.isFinite(config.intensity) ? config.intensity : 0.72,
      wetness: Number.isFinite(config.wetness) ? config.wetness : 1,
      sauce: Number.isFinite(config.sauce) ? config.sauce : 0.92,
      directionX: Number.isFinite(config.directionX) ? config.directionX : 0,
      directionY: Number.isFinite(config.directionY) ? config.directionY : 0.6
    }, "combat"),
    onPunchImpact: (result = {}) => {
      punchCameraKick = Math.max(punchCameraKick, result.hit ? 1 : 0.42);
      if (result.hit && input?.isTouch && navigator.vibrate) navigator.vibrate(result.killed ? [16, 20, 42] : 24);
    },
    onAudio: (name, payload = {}) => audio?.combat?.(
      name,
      Number.isFinite(payload.intensity) ? payload.intensity : 1,
      Number.isFinite(payload.pan) ? payload.pan : 0
    )
  });
  resetPlayer();
  input.enable();
  resize();
  addEventListeners();

  phase = "title";
  publishPhase();
  updateCamera(0, performance.now() / 1000);
  renderer.render(scene, camera);
  renderReady = Number(renderer.info?.render?.calls || 0) > 0;
  loadStatus.textContent = "THE BASILICA IS HUNGRY";
  startButton.disabled = false;
  loadingScreen.classList.remove("active");
  titleScreen.classList.add("active");
  requestAnimationFrame(frame);

  if (AUTOTEST) {
    startGame(false);
    beginAutotest();
  }
}

function addEventListeners() {
  addEventListener("resize", resize, { passive: true });
  addEventListener("orientationchange", resize, { passive: true });

  startButton.addEventListener("click", () => {
    void audio.unlock();
    startGame(true);
  });
  resumeButton.addEventListener("click", resumeGame);
  restartButton.addEventListener("click", () => {
    void audio.unlock();
    restartGame(true);
  });
  restartPauseButton.addEventListener("click", () => {
    void audio.unlock();
    restartGame(true);
  });
  touchPauseButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    pauseGame();
  }, { passive: false });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && phase === "playing" && !AUTOTEST) pauseGame();
  });
  // A pointer-lock request resolves asynchronously. If a pause, death, or
  // overlay wins that race, immediately reject the late capture instead of
  // trapping the cursor behind a non-playing screen.
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas && phase !== "playing") {
      input.releaseAll?.();
      document.exitPointerLock?.();
    }
  });
}

function resize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, innerWidth);
  const height = Math.max(1, innerHeight);
  renderer.setSize(width, height, false);
  cameraSpaghetti?.resize?.(width, height, devicePixelRatio || 1);
  cinematicFX?.resize?.(renderer.getPixelRatio());
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function startGame(fromGesture) {
  if (!world || phase === "playing") return;
  if (phase === "title" || phase === "escaped" || phase === "drowned") restartRun();
  phase = "playing";
  titleScreen.classList.remove("active");
  pauseScreen.classList.remove("active");
  endingScreen.classList.remove("active");
  hud.classList.remove("hidden");
  if (input.isTouch) touchUI.classList.remove("hidden");
  runStartedAt = performance.now();
  publishPhase();
  input.enable();
  if (fromGesture && !input.isTouch) {
    canvas.focus({ preventScroll: true });
    input.requestPointerLock();
  }
  showMessage("THE BASILICA HAS BEEN WAITING FOR YOU", 3.5);
}

function restartGame(fromGesture = false) {
  restartRun();
  phase = "playing";
  endingScreen.classList.remove("active");
  pauseScreen.classList.remove("active");
  hud.classList.remove("hidden");
  if (input.isTouch) touchUI.classList.remove("hidden");
  runStartedAt = performance.now();
  publishPhase();
  if (fromGesture && !input.isTouch && !AUTOTEST) {
    canvas.focus({ preventScroll: true });
    input.requestPointerLock();
  }
  showMessage("TAKE THE GRAND ALTAR. KILL WHAT BOILS.", 2.4);
}

function restartRun() {
  input?.releaseAll?.();
  world.reset();
  spaghettiRain?.reset?.();
  cameraSpaghetti?.clear?.();
  cinematicFX?.reset?.();
  resetPlayer();
  combat?.reset?.();
  elapsed = 0;
  narrativeIndex = 0;
  messageTimer = 0;
  lastSlickSurfaceId = null;
  submergeTimer = 0;
  fillMultiplier = FAST_FILL ? 9 : 1;
  audioStepBase = audio.getState().stepEvents;
  audioWetStepBase = audio.getState().wetStepEvents;
  rainImpactBase = spaghettiRain?.getStats?.().totalImpacts || 0;
  rainIntensityValue = -1;
  nextLensHitAt = 1.8 + nextLensRandom() * 1.35;
  lensWadeCooldown = 0;
  lensSplatEvents = 0;
  lensImpactEvents = 0;
  debugJumpHeld = false;
  debugJumpQueued = false;
  debugPunchHeld = false;
  lastCombatKills = 0;
  lastCombatShots = 0;
  lastCombatHits = 0;
  lastCombatPunchHits = 0;
  lastCombatPunchKills = 0;
  lastCombatHealth = 100;
  damageFlashTimer = 0;
  hitmarkerTimer = 0;
  spaghettiDamageCooldown = 0.35;
  spaghettiDamagePulses = 0;
  spaghettiDamageTotal = 0;
  spaghettiHazardActive = false;
  spaghettiDamageActive = false;
  spaghettiHazardSeverity = 0;
  lastDamageSource = "none";
  punchCameraKick = 0;
  input.setTestMove(0, 0);
}

function resetPlayer() {
  const spawn = world?.spawn || { x: 0, y: 0, z: 32, yaw: 0 };
  player.x = Number(spawn.x) || 0;
  player.y = Number(spawn.y) || 0;
  player.z = Number(spawn.z) || 0;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.yaw = Number.isFinite(spawn.yaw) ? spawn.yaw : 0;
  player.pitch = 0;
  player.roll = 0;
  player.eyeY = player.y + BASE_EYE_HEIGHT;
  player.depth = 0;
  player.speed = 0;
  player.speedMultiplier = 1;
  player.distance = 0;
  player.stepDistance = 0;
  player.bobPhase = 0;
  player.grounded = true;
  player.supportId = "ground";
  player.coyote = COYOTE_TIME;
  player.jumpBuffer = 0;
  player.jumpHeld = false;
  player.airTime = 0;
  player.checkpointId = "spawn";
  player.crouching = false;
  player.slideTimer = 0;
  player.slideEntrySpeed = 0;
  player.slideHeadingX = 0;
  player.slideHeadingZ = -1;
  player.surfaceCollider = null;
  player.surfaceId = "mansion floor";
  player.surfaceKind = "ground";
  player.surfaceContact = true;
  player.surfaceWetness = 0.68;
  player.effectiveWetness = 0.68;
  player.surfaceFriction = 0.43;
  player.surfaceGrip = 0.56;
  player.surfaceWidth = 60;
  player.edgeRecovery = 0;
  player.surfaceSlope = 0;
  player.downhillX = 0;
  player.downhillZ = 0;
  player.downhillAcceleration = 0;
  player.lateralSlip = 0;
  player.slipAmount = 0;
  player.rampSlipCue = 0;
  player.slipping = false;
  player.lateralDriftAcceleration = 0;
  player.surfaceBraking = MAX_GROUND_BRAKE;
  player.surfaceTraction = 1;
  player.sprintSlip = 0;
  player.landingSlipTimer = 0;
  player.landingSlipStrength = 0;
  player.landingSlipEvents = 0;
  player.mantle = null;
  player.lastGroundSpeed = 0;
  player.fallVelocity = 0;
  player.currentHeight = PLAYER_HEIGHT;
  player.currentEyeHeight = BASE_EYE_HEIGHT;
  const support = getSupportAt(player.x, player.z, player.y, STEP_HEIGHT + 0.15, 0.8);
  if (support && Math.abs(support.y - player.y) < 0.8) {
    player.y = support.y;
    player.supportId = support.id || "ground";
  }
  refreshSurfaceContact(support);
}

function frame(now) {
  const rawDelta = Math.min(0.075, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  accumulator = Math.min(accumulator + rawDelta, FIXED_STEP * 5);

  while (accumulator >= FIXED_STEP) {
    update(FIXED_STEP, now / 1000);
    accumulator -= FIXED_STEP;
    frameCount += 1;
    if (AUTOTEST && phase === "playing") autotestFrames += 1;
  }

  updateCamera(rawDelta, now / 1000);
  cameraSpaghetti?.update?.(rawDelta, now / 1000, {
    motionX: THREE.MathUtils.clamp(-player.vx / RUN_SPEED + player.lateralDriftAcceleration * 0.18, -1.4, 1.4),
    motionY: THREE.MathUtils.clamp(-player.vy / 11, -1.2, 1.2),
    gravityX: THREE.MathUtils.clamp(Math.sin(player.yaw) * player.slipAmount * 0.16, -0.2, 0.2),
    gravityY: 1
  });
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function update(dt, time) {
  input.update();
  if (input.consumePause()) {
    if (phase === "playing") pauseGame();
    else if (phase === "paused") resumeGame();
  }

  if (phase !== "playing") {
    world?.update(0, time, player, 0);
    spaghettiRain?.update?.(0, time, player, sampleRainSurface);
    combat?.update?.(0, time, {
      player,
      phase,
      fireHeld: false,
      firePressed: input.consumeFirePress?.() || false,
      punchRequested: input.consumePunch?.() || false,
      aimHeld: false
    });
    cinematicFX?.update?.(0, time, player, combat?.getState?.());
    return;
  }

  elapsed += dt;
  lensWadeCooldown = Math.max(0, lensWadeCooldown - dt);
  const look = input.consumeLook();
  const lookScale = input.isTouch ? 0.0035 : 0.00225;
  player.yaw -= look.x * lookScale;
  player.pitch = THREE.MathUtils.clamp(player.pitch - look.y * lookScale, -MAX_PITCH, MAX_PITCH);

  if (input.consumeJump() || debugJumpQueued) player.jumpBuffer = JUMP_BUFFER_TIME;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  debugJumpQueued = false;
  player.jumpHeld = Boolean(input.jumpHeld || debugJumpHeld);

  const wantedCrouch = Boolean(input.crouchHeld);
  const wasCrouching = player.crouching;
  if (wantedCrouch) player.crouching = true;
  else if (canUseHeight(PLAYER_HEIGHT)) player.crouching = false;
  const targetHeight = player.crouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
  const targetEyeHeight = player.crouching ? CROUCH_EYE_HEIGHT : BASE_EYE_HEIGHT;
  const stanceResponse = 1 - Math.exp(-18 * dt);
  player.currentHeight = THREE.MathUtils.lerp(player.currentHeight, targetHeight, stanceResponse);
  player.currentEyeHeight = THREE.MathUtils.lerp(player.currentEyeHeight, targetEyeHeight, stanceResponse);

  player.landingSlipTimer = Math.max(0, player.landingSlipTimer - dt);
  if (player.landingSlipTimer <= 0) player.landingSlipStrength = 0;
  player.depth = sampleDepthAt(player.x, player.z, player.y);
  refreshSurfaceContact();
  const wet = smoothstep(0.025, 0.34, player.depth);
  const deep = smoothstep(0.18, 1.28, player.depth);
  player.speedMultiplier = THREE.MathUtils.lerp(1, 0.31, deep);

  const move = input.getMove();
  const moveMagnitude = Math.min(1, Math.hypot(move.x, move.y));
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);
  const wishX = rightX * move.x + forwardX * move.y;
  const wishZ = rightZ * move.x + forwardZ * move.y;
  const wishLength = Math.hypot(wishX, wishZ);
  const dirX = wishLength > 0.0001 ? wishX / wishLength : 0;
  const dirZ = wishLength > 0.0001 ? wishZ / wishLength : 0;
  const autoRun = input.isTouch && moveMagnitude > 0.82;
  const running = (Boolean(input.sprintHeld) || autoRun) && !player.crouching;

  if (player.crouching && !wasCrouching && player.grounded && player.speed > 3.65) {
    player.slideTimer = 0.68;
    player.slideEntrySpeed = Math.max(player.speed, Math.hypot(player.vx, player.vz));
    const headingLength = Math.max(0.001, Math.hypot(player.vx, player.vz));
    player.slideHeadingX = player.vx / headingLength;
    player.slideHeadingZ = player.vz / headingLength;
    audio.slide(Math.min(1, player.speed / RUN_SPEED), Math.min(1, player.depth / 1.25));
    if (input.isTouch && navigator.vibrate) navigator.vibrate(12);
  }
  player.slideTimer = Math.max(0, player.slideTimer - dt);
  if (!player.crouching || !player.grounded) player.slideTimer = 0;
  const sliding = player.crouching && player.grounded && player.slideTimer > 0;

  if (player.mantle) {
    updateMantle(dt);
  } else {
    player.coyote = player.grounded ? COYOTE_TIME : Math.max(0, player.coyote - dt);
    if (player.jumpBuffer > 0 && (player.grounded || player.coyote > 0)) {
      player.jumpBuffer = 0;
      player.coyote = 0;
      player.grounded = false;
      player.supportId = null;
      player.vy = JUMP_VELOCITY * THREE.MathUtils.lerp(1, 0.72, deep);
      player.y += 0.018;
      audio.jump(THREE.MathUtils.lerp(1, 0.72, deep));
      if (input.isTouch && navigator.vibrate) navigator.vibrate(9);
    }

    const stanceSpeed = player.crouching ? 2.2 : running ? RUN_SPEED : WALK_SPEED;
    const landingSlip = THREE.MathUtils.clamp(
      (player.landingSlipTimer / 0.72) * player.landingSlipStrength,
      0,
      1
    );
    const crouchRecovery = player.crouching && !sliding ? 0.2 : 0;
    const edgeRecovery = player.edgeRecovery * (player.surfaceWidth < 4.4 ? 0.2 : 0.13);
    const contactWetness = player.grounded ? player.surfaceWetness : 0;
    player.effectiveWetness = THREE.MathUtils.clamp(
      contactWetness + (running ? 0.075 : 0) + landingSlip * 0.11 - crouchRecovery - edgeRecovery,
      0,
      1
    );
    player.surfaceGrip = player.grounded
      ? THREE.MathUtils.clamp(0.96 - player.effectiveWetness * 0.67 + crouchRecovery * 0.65 + edgeRecovery * 0.55, 0.24, 1)
      : 0;
    player.sprintSlip = running && player.grounded ? player.effectiveWetness : 0;

    let maxSpeed = stanceSpeed * player.speedMultiplier;
    let acceleration = player.grounded
      ? THREE.MathUtils.lerp(18.5, 7.15, player.effectiveWetness) * THREE.MathUtils.lerp(1, 0.58, deep)
      : THREE.MathUtils.lerp(5.8, 2.7, deep);
    let braking = player.grounded
      ? THREE.MathUtils.lerp(MAX_GROUND_BRAKE, MIN_GLOSSY_BRAKE, player.effectiveWetness)
      : 1.15;
    if (landingSlip > 0) {
      acceleration *= THREE.MathUtils.lerp(1, 0.47, landingSlip);
      braking *= THREE.MathUtils.lerp(1, 0.52, landingSlip);
    }
    if (player.surfaceKind === "ramp" && moveMagnitude < 0.02 && player.downhillAcceleration > 0) {
      braking = Math.min(braking, player.downhillAcceleration * (player.crouching ? 1.12 : 0.54));
    }
    let desiredX = dirX;
    let desiredZ = dirZ;
    let desiredMagnitude = moveMagnitude;
    if (sliding) {
      const steer = moveMagnitude * 0.13;
      const steeredX = THREE.MathUtils.lerp(player.slideHeadingX, dirX, steer);
      const steeredZ = THREE.MathUtils.lerp(player.slideHeadingZ, dirZ, steer);
      const steeredLength = Math.max(0.001, Math.hypot(steeredX, steeredZ));
      player.slideHeadingX = steeredX / steeredLength;
      player.slideHeadingZ = steeredZ / steeredLength;
      desiredX = player.slideHeadingX;
      desiredZ = player.slideHeadingZ;
      desiredMagnitude = 1;
      const slideLife = player.slideTimer / 0.68;
      maxSpeed = Math.max(2.7, player.slideEntrySpeed * (0.72 + slideLife * 0.28)) * player.speedMultiplier;
      acceleration = 3.2;
      braking = 1.4;
    }
    const targetVx = desiredX * maxSpeed * desiredMagnitude;
    const targetVz = desiredZ * maxSpeed * desiredMagnitude;
    let deltaVx = targetVx - player.vx;
    let deltaVz = targetVz - player.vz;
    const deltaSpeed = Math.hypot(deltaVx, deltaVz);
    const reversing = desiredMagnitude > 0.02 && player.vx * desiredX + player.vz * desiredZ < -0.18;
    const velocityChangeLimit = (desiredMagnitude < 0.02
      ? braking
      : reversing
        ? Math.min(acceleration, braking * 1.45)
        : acceleration) * dt;
    if (deltaSpeed > velocityChangeLimit && deltaSpeed > 0.0001) {
      const scale = velocityChangeLimit / deltaSpeed;
      deltaVx *= scale;
      deltaVz *= scale;
    }
    player.vx += deltaVx;
    player.vz += deltaVz;

    let downhillAcceleration = player.grounded ? player.downhillAcceleration : 0;
    if (player.crouching && !sliding) downhillAcceleration *= 0.46;
    downhillAcceleration *= THREE.MathUtils.lerp(1, 0.58, player.edgeRecovery);
    player.vx += player.downhillX * downhillAcceleration * dt;
    player.vz += player.downhillZ * downhillAcceleration * dt;

    const velocityBeforeDrift = Math.hypot(player.vx, player.vz);
    const driftScale = THREE.MathUtils.clamp((velocityBeforeDrift - 2.1) / 3.5, 0, 1);
    const driftWave = Math.sin(elapsed * 2.35 + player.x * 0.19 - player.z * 0.13);
    const lateralDrift = player.grounded && !player.crouching
      ? player.effectiveWetness * player.effectiveWetness * driftScale * (running ? 0.48 : 0.24) *
        THREE.MathUtils.lerp(1, 0.24, player.edgeRecovery)
      : 0;
    if (velocityBeforeDrift > 0.05 && lateralDrift > 0) {
      const headingX = player.vx / velocityBeforeDrift;
      const headingZ = player.vz / velocityBeforeDrift;
      player.vx += -headingZ * lateralDrift * driftWave * dt;
      player.vz += headingX * lateralDrift * driftWave * dt;
    }
    player.lateralDriftAcceleration = Math.abs(lateralDrift * driftWave);

    const horizontalSpeed = Math.hypot(player.vx, player.vz);
    if (horizontalSpeed > MAX_SURFACE_SPEED) {
      const scale = MAX_SURFACE_SPEED / horizontalSpeed;
      player.vx *= scale;
      player.vz *= scale;
    }
    player.lateralSlip = desiredMagnitude > 0.05
      ? Math.abs(player.vx * -desiredZ + player.vz * desiredX)
      : 0;
    player.slipAmount = THREE.MathUtils.clamp(
      (player.lateralSlip + landingSlip * Math.hypot(player.vx, player.vz) * 0.42 +
        Math.max(0, player.vx * player.downhillX + player.vz * player.downhillZ) * 0.24) / RUN_SPEED,
      0,
      1
    );
    const downhillSpeed = Math.max(0, player.vx * player.downhillX + player.vz * player.downhillZ);
    const onSlickRamp = player.grounded && player.surfaceKind === "ramp";
    player.rampSlipCue = onSlickRamp
      ? THREE.MathUtils.clamp(
          (0.34 + smoothstep(0.05, 2.35, downhillSpeed) * 0.66) * (player.crouching ? 0.55 : 1),
          0,
          1
        )
      : 0;
    // This floor only raises feedback intensity; the existing velocity and grip
    // model remain authoritative so the established upper routes stay fair.
    player.slipAmount = Math.max(player.slipAmount, player.rampSlipCue * 0.24);
    player.slipping = player.grounded && (
      onSlickRamp || player.slipAmount > 0.075 || player.lateralDriftAcceleration > 0.08
    );
    player.surfaceBraking = braking;
    player.surfaceTraction = acceleration / 18.5;

    const oldX = player.x;
    const oldZ = player.z;
    const intendedDistance = Math.hypot(player.vx, player.vz) * dt;
    const collision = moveWithCollisions(player.vx * dt, player.vz * dt);
    const moved = Math.hypot(player.x - oldX, player.z - oldZ);

    if (collision.blocked && player.jumpHeld && wishLength > 0.1) {
      tryStartMantle(collision.collider, dirX, dirZ);
    }
    if (!player.mantle && moved < intendedDistance * 0.24) {
      player.vx *= 0.42;
      player.vz *= 0.42;
    }

    if (!player.mantle) {
      updateVerticalPhysics(dt);
      if (!player.grounded) refreshSurfaceContact();
    }

    player.speed = moved / Math.max(dt, 0.0001);
    player.distance += moved;
    if (player.grounded) {
      player.lastGroundSpeed = player.speed;
      if (sliding) {
        player.stepDistance = 0;
        player.bobPhase += moved * 1.6;
        audio.slide(Math.min(1, player.speed / RUN_SPEED), Math.min(1, player.depth / 1.25));
      } else {
        player.stepDistance += moved;
        player.bobPhase += moved * THREE.MathUtils.lerp(7.65, 10.2, wet);
        const stride = THREE.MathUtils.lerp(running ? 1.18 : 0.98, 0.66, wet);
        while (player.stepDistance >= stride) {
          player.stepDistance -= stride;
          side *= -1;
          audio.step(Math.min(1, player.depth / 1.35), player.speed, side);
          if (player.depth > 0.1 && lensWadeCooldown <= 0 && nextLensRandom() < 0.16 + Math.min(0.32, player.depth * 0.22)) {
            splatLens({
              x: 0.12 + nextLensRandom() * 0.76,
              y: 0.78 + nextLensRandom() * 0.18,
              intensity: 0.16 + Math.min(0.34, player.depth * 0.26),
              wetness: 1,
              sauce: 0.2 + Math.min(0.36, player.depth * 0.18),
              directionX: (nextLensRandom() - 0.5) * 0.6,
              directionY: -1
            }, "wade");
            lensWadeCooldown = 0.42;
          }
          if (input.isTouch && navigator.vibrate && player.depth > 0.06) {
            navigator.vibrate(player.depth > 0.7 ? 16 : 7);
          }
        }
      }
    } else {
      player.stepDistance = Math.min(player.stepDistance, 0.42);
    }
  }

  updateCheckpoint();
  if (player.y < -3.2 || !Number.isFinite(player.y) || missedCheckpointDrop()) respawnAtCheckpoint();

  world.update(dt, time, player, fillMultiplier);
  player.depth = sampleDepthAt(player.x, player.z, player.y);
  const rainIntensity = THREE.MathUtils.clamp(0.08 + elapsed / 600 + player.y / 240, 0.08, 0.2);
  if (Math.abs(rainIntensity - rainIntensityValue) >= 0.015) {
    spaghettiRain?.setIntensity?.(rainIntensity);
    rainIntensityValue = rainIntensity;
  }
  spaghettiRain?.update?.(dt, time, {
    x: player.x,
    y: player.y + player.currentEyeHeight,
    z: player.z,
    eyeHeight: player.currentEyeHeight,
    surfaceY: sampleSurfaceYAt(player.x, player.z)
  }, sampleRainSurface);
  const rainStats = spaghettiRain?.getStats?.();
  if (rainStats && rainStats.totalImpacts > rainImpactBase) {
    audio.noodleImpact(0.22 + Math.min(0.35, (rainStats.totalImpacts - rainImpactBase) * 0.08), 3.5);
    rainImpactBase = rainStats.totalImpacts;
  }
  const rainImpacts = spaghettiRain?.consumeImpacts?.() || [];
  for (const impact of rainImpacts) handleLensRainImpact(impact);
  if (elapsed >= nextLensHitAt) {
    splatLens({
      x: 0.18 + nextLensRandom() * 0.64,
      y: 0.08 + nextLensRandom() * 0.5,
      intensity: 0.58 + nextLensRandom() * 0.34,
      wetness: 0.94 + nextLensRandom() * 0.06,
      sauce: 0.24 + nextLensRandom() * 0.38,
      directionX: (nextLensRandom() - 0.5) * 0.8,
      directionY: 0.75 + nextLensRandom() * 0.6
    }, "overhead");
    nextLensHitAt = elapsed + 8.5 + nextLensRandom() * 8.5;
  }

  const room = world.getRoomAt(player.x, player.z, player.y);
  player.room = typeof room === "string" ? room : room?.id || room?.name || "hall";

  const danger = smoothstep(player.currentEyeHeight - 0.43, player.currentEyeHeight + 0.03, player.depth);
  audio.update(Math.min(1, player.depth / 1.35), danger, {
    x: player.x,
    y: player.y + player.currentEyeHeight,
    z: player.z
  });

  if (player.depth > player.currentEyeHeight - 0.09) submergeTimer += dt;
  else submergeTimer = Math.max(0, submergeTimer - dt * 1.8);

  const downhillSlideSpeed = Math.max(0, player.vx * player.downhillX + player.vz * player.downhillZ);
  const audibleRampSlip = player.surfaceKind === "ramp" && downhillSlideSpeed > 0.22;
  if (player.slipping && (player.speed > 1.35 || audibleRampSlip) && player.slideTimer <= 0) {
    audio.slide(0.2 + Math.max(player.slipAmount, player.rampSlipCue) * 0.55, player.surfaceWetness);
  }

  combat?.update?.(dt, time, {
    player,
    phase,
    fireHeld: input.fireHeld,
    firePressed: input.consumeFirePress?.() || false,
    reloadRequested: input.consumeReload?.() || false,
    sauceRequested: input.consumeSauce?.() || false,
    punchRequested: input.consumePunch?.() || false,
    aimHeld: input.aimHeld
  });
  updateSpaghettiHazard(dt);
  cinematicFX?.setSauceLevel?.(maximumFill(world?.getFillLevels?.() || {}));
  cinematicFX?.update?.(dt, time, player, combat?.getState?.());

  damageFlashTimer = Math.max(0, damageFlashTimer - dt);
  hitmarkerTimer = Math.max(0, hitmarkerTimer - dt);
  damageFlash?.classList.toggle("show", damageFlashTimer > 0);
  hitmarker?.classList.toggle("show", hitmarkerTimer > 0);

  updateNarrative();
  updateHud(danger);
  checkEnding();

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) dangerCopy.classList.remove("show");
  }

  if (AUTOTEST) updateAutotest();
}

function moveWithCollisions(dx, dz) {
  const result = { blocked: false, collider: null };
  player.x += dx;
  mergeCollisionResult(result, resolveCollisions("x"));
  player.z += dz;
  mergeCollisionResult(result, resolveCollisions("z"));
  mergeCollisionResult(result, resolveCollisions("both"));

  if (player.grounded && !player.mantle) {
    const support = getSupportAt(player.x, player.z, player.y, STEP_HEIGHT, GROUND_SNAP + 0.08);
    if (support && support.y <= player.y + STEP_HEIGHT + 0.01 && support.y >= player.y - GROUND_SNAP - 0.08) {
      player.y = support.y;
      player.vy = 0;
      player.supportId = support.id;
    } else {
      player.grounded = false;
      player.supportId = null;
    }
  }
  return result;
}

function resolveCollisions(axis) {
  const result = { blocked: false, collider: null };
  for (const raw of world.colliders || []) {
    if (raw.disabled || raw.solid === false || raw.solidSides === false) continue;
    const box = normalizeCollider(raw);
    if (!box) continue;
    const closestX = THREE.MathUtils.clamp(player.x, box.minX, box.maxX);
    const closestZ = THREE.MathUtils.clamp(player.z, box.minZ, box.maxZ);
    let nx = player.x - closestX;
    let nz = player.z - closestZ;
    let distanceSq = nx * nx + nz * nz;
    if (distanceSq >= PLAYER_RADIUS * PLAYER_RADIUS) continue;
    const topY = colliderTopAt(raw, closestX, closestZ);
    const minY = colliderBottomAt(raw, closestX, closestZ);
    const feetY = player.y + 0.035;
    const headY = player.y + player.currentHeight - 0.035;
    if (headY <= minY + 0.005 || feetY >= topY - 0.018) continue;

    const rise = topY - player.y;
    if (raw.walkableTop !== false && raw.walkable !== false && player.grounded && rise >= -0.035 && rise <= STEP_HEIGHT) {
      if (canUseHeight(player.currentHeight, topY)) {
        player.y = topY;
        player.supportId = raw.id || raw.name || "step";
        continue;
      }
    }

    result.blocked = true;
    result.collider ||= raw;

    if (distanceSq < 1e-10) {
      const left = Math.abs(player.x - box.minX);
      const right = Math.abs(box.maxX - player.x);
      const top = Math.abs(player.z - box.minZ);
      const bottom = Math.abs(box.maxZ - player.z);
      const minimum = Math.min(left, right, top, bottom);
      if (minimum === left) player.x = box.minX - PLAYER_RADIUS - 0.001;
      else if (minimum === right) player.x = box.maxX + PLAYER_RADIUS + 0.001;
      else if (minimum === top) player.z = box.minZ - PLAYER_RADIUS - 0.001;
      else player.z = box.maxZ + PLAYER_RADIUS + 0.001;
      continue;
    } else {
      const distance = Math.sqrt(distanceSq);
      nx /= distance;
      nz /= distance;
    }

    if (axis === "x" && Math.abs(nx) < Math.abs(nz)) continue;
    if (axis === "z" && Math.abs(nz) < Math.abs(nx)) continue;
    const distance = Math.sqrt(Math.max(distanceSq, 0));
    const push = PLAYER_RADIUS - distance + 0.001;
    player.x += nx * push;
    player.z += nz * push;
  }
  return result;
}

// World colliders are static after build, so their normalized AABB never
// changes. Cache it per collider to avoid re-spreading a fresh object on every
// collision/support query — this function runs for every collider across
// several passes per fixed step, so the churn was significant. Callers only
// read AABB fields from the returned box and read live flags (disabled/solid)
// straight off `raw`, and none mutate the box, so a shared cached instance is
// safe.
const colliderBoxCache = new WeakMap();
function normalizeCollider(raw) {
  if (!raw) return null;
  const cached = colliderBoxCache.get(raw);
  if (cached) return cached;
  let box = null;
  if ([raw.minX, raw.maxX, raw.minZ, raw.maxZ].every(Number.isFinite)) {
    box = {
      ...raw,
      minY: Number.isFinite(raw.minY)
        ? raw.minY
        : Number.isFinite(raw.lowY)
          ? Math.min(raw.lowY, Number.isFinite(raw.highY) ? raw.highY : raw.lowY) - (raw.thickness || 0.18)
          : Number.isFinite(raw.y) && Number.isFinite(raw.height)
            ? raw.y - raw.height * 0.5
            : 0,
      maxY: Number.isFinite(raw.maxY)
        ? raw.maxY
        : Number.isFinite(raw.highY)
          ? Math.max(raw.lowY || 0, raw.highY)
          : Number.isFinite(raw.y) && Number.isFinite(raw.height)
            ? raw.y + raw.height * 0.5
            : Number.isFinite(raw.height) ? raw.height : 26
    };
  } else if ([raw.x, raw.z, raw.width, raw.depth].every(Number.isFinite)) {
    box = {
      ...raw,
      minX: raw.x - raw.width / 2,
      maxX: raw.x + raw.width / 2,
      minZ: raw.z - raw.depth / 2,
      maxZ: raw.z + raw.depth / 2,
      minY: Number.isFinite(raw.minY) ? raw.minY : Number.isFinite(raw.y) ? raw.y - (raw.height || 0) * 0.5 : 0,
      maxY: Number.isFinite(raw.maxY) ? raw.maxY : Number.isFinite(raw.y) ? raw.y + (raw.height || 0) * 0.5 : raw.height || 26
    };
  }
  if (box) colliderBoxCache.set(raw, box);
  return box;
}

function mergeCollisionResult(target, source) {
  if (!source?.blocked) return target;
  target.blocked = true;
  target.collider ||= source.collider;
  return target;
}

function colliderTopAt(raw, x, z) {
  const box = normalizeCollider(raw);
  if (!box) return -Infinity;
  if (raw.shape !== "ramp" && !Number.isFinite(raw.lowY)) return box.maxY;
  const axis = raw.axis === "z" ? "z" : "x";
  const minimum = axis === "x" ? box.minX : box.minZ;
  const maximum = axis === "x" ? box.maxX : box.maxZ;
  const coordinate = axis === "x" ? x : z;
  let amount = THREE.MathUtils.clamp((coordinate - minimum) / Math.max(0.0001, maximum - minimum), 0, 1);
  if (raw.direction === -1) amount = 1 - amount;
  return THREE.MathUtils.lerp(Number(raw.lowY) || 0, Number(raw.highY) || 0, amount);
}

function colliderBottomAt(raw, x, z) {
  const box = normalizeCollider(raw);
  if (!box) return Infinity;
  if (raw.shape === "ramp" || Number.isFinite(raw.lowY)) {
    return colliderTopAt(raw, x, z) - Math.max(0.08, Number(raw.thickness) || 0.18);
  }
  return box.minY;
}

function isCombatPositionBlocked(position, radius = 0.3, height = 1.8) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  const z = Number(position?.z);
  if (![x, y, z].every(Number.isFinite)) return true;
  const bodyRadius = THREE.MathUtils.clamp(Number(radius) || 0.3, 0.08, 1.2);
  const bodyHeight = THREE.MathUtils.clamp(Number(height) || 1.8, 0.3, 4);
  for (const raw of world?.colliders || []) {
    if (raw.disabled || raw.solid === false || raw.solidSides === false) continue;
    const box = normalizeCollider(raw);
    if (!box) continue;
    const closestX = THREE.MathUtils.clamp(x, box.minX, box.maxX);
    const closestZ = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
    if (Math.hypot(x - closestX, z - closestZ) >= bodyRadius) continue;
    const top = colliderTopAt(raw, closestX, closestZ);
    const bottom = colliderBottomAt(raw, closestX, closestZ);
    if (y + bodyHeight > bottom + 0.025 && y + 0.045 < top - 0.02) return true;
  }
  return false;
}

function resolveCombatMovement(position, delta, radius = 0.3, height = 1.8) {
  const start = {
    x: Number.isFinite(Number(position?.x)) ? Number(position.x) : 0,
    y: Number.isFinite(Number(position?.y)) ? Number(position.y) : 0,
    z: Number.isFinite(Number(position?.z)) ? Number(position.z) : 0
  };
  const dx = Number.isFinite(Number(delta?.x)) ? Number(delta.x) : 0;
  const dz = Number.isFinite(Number(delta?.z)) ? Number(delta.z) : 0;
  const candidates = [
    { x: start.x + dx, z: start.z + dz, axis: "both" },
    { x: start.x + dx, z: start.z, axis: "x" },
    { x: start.x, z: start.z + dz, axis: "z" }
  ];
  for (const candidate of candidates) {
    if (candidate.axis === "x" && Math.abs(dx) < 1e-7) continue;
    if (candidate.axis === "z" && Math.abs(dz) < 1e-7) continue;
    const support = getCombatSupportAt(candidate.x, candidate.z, start.y, radius, 0.72, 1.25);
    // Navigation may step only onto real walkable support near the actor's
    // current tier. Falling back to the flood surface here used to teleport
    // gallery enemies through ledges and into the rising sauce.
    if (!support) continue;
    const groundedCandidate = {
      ...candidate,
      y: support.y,
      supportId: support.id || null
    };
    if (!isCombatPositionBlocked(groundedCandidate, radius, height)) {
      return { ...groundedCandidate, blocked: candidate.axis !== "both" };
    }
  }
  return { ...start, axis: "none", blocked: Math.abs(dx) + Math.abs(dz) > 1e-7 };
}

function traceCombatSegment(from, to) {
  const start = new THREE.Vector3(Number(from?.x) || 0, Number(from?.y) || 0, Number(from?.z) || 0);
  const end = new THREE.Vector3(Number(to?.x) || 0, Number(to?.y) || 0, Number(to?.z) || 0);
  const delta = end.clone().sub(start);
  let bestFraction = 1;
  let colliderId = null;
  for (const raw of world?.colliders || []) {
    if (raw.disabled || raw.solid === false || raw.occludes === false) continue;
    const box = normalizeCollider(raw);
    if (!box) continue;
    const fraction = raw.shape === "ramp"
      ? segmentRampFraction(start, delta, raw, box)
      : segmentAabbFraction(start, delta, box);
    if (fraction === null || fraction <= 0.002 || fraction >= bestFraction) continue;
    bestFraction = fraction;
    colliderId = raw.id || raw.name || "world";
  }
  const point = start.clone().addScaledVector(delta, bestFraction);
  return {
    blocked: bestFraction < 1,
    fraction: bestFraction,
    distance: delta.length() * bestFraction,
    colliderId,
    point: { x: point.x, y: point.y, z: point.z }
  };
}

function segmentAabbFraction(start, delta, box) {
  let minimum = 0;
  let maximum = 1;
  for (const [origin, direction, low, high] of [
    [start.x, delta.x, box.minX, box.maxX],
    [start.y, delta.y, box.minY, box.maxY],
    [start.z, delta.z, box.minZ, box.maxZ]
  ]) {
    if (Math.abs(direction) < 1e-8) {
      if (origin < low || origin > high) return null;
      continue;
    }
    let near = (low - origin) / direction;
    let far = (high - origin) / direction;
    if (near > far) [near, far] = [far, near];
    minimum = Math.max(minimum, near);
    maximum = Math.min(maximum, far);
    if (minimum > maximum) return null;
  }
  if (maximum < 0 || minimum > 1) return null;
  const entry = THREE.MathUtils.clamp(minimum, 0, 1);
  if (entry <= 0.002 && maximum > 0.002) return Math.min(1, 0.0021);
  return entry;
}

function segmentRampFraction(start, delta, raw, box) {
  let enter = 0;
  let exit = 1;
  for (const [origin, direction, low, high] of [
    [start.x, delta.x, box.minX, box.maxX],
    [start.z, delta.z, box.minZ, box.maxZ]
  ]) {
    if (Math.abs(direction) < 1e-8) {
      if (origin < low || origin > high) return null;
      continue;
    }
    let near = (low - origin) / direction;
    let far = (high - origin) / direction;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    exit = Math.min(exit, far);
    if (enter > exit) return null;
  }
  enter = THREE.MathUtils.clamp(enter, 0, 1);
  exit = THREE.MathUtils.clamp(exit, 0, 1);
  if (exit < enter) return null;
  const thickness = Math.max(0.08, Number(raw.thickness) || 0.18);
  const offsetAt = (amount) => {
    const x = start.x + delta.x * amount;
    const y = start.y + delta.y * amount;
    const z = start.z + delta.z * amount;
    return y - colliderTopAt(raw, x, z);
  };
  const startOffset = offsetAt(enter);
  const endOffset = offsetAt(exit);
  const epsilon = 0.002;
  const candidates = [];
  if (startOffset <= epsilon && startOffset >= -thickness - epsilon) candidates.push(enter);
  const offsetDelta = endOffset - startOffset;
  if (Math.abs(offsetDelta) > 1e-9) {
    for (const boundary of [0, -thickness]) {
      const local = (boundary - startOffset) / offsetDelta;
      if (local >= 0 && local <= 1) candidates.push(THREE.MathUtils.lerp(enter, exit, local));
    }
  }
  if (!candidates.length) return null;
  const fraction = Math.min(...candidates.filter((value) => value >= 0 && value <= 1));
  if (!Number.isFinite(fraction)) return null;
  if (fraction <= 0.002 && exit > 0.002) return Math.min(1, 0.0021);
  return fraction;
}

function pointTouchesFootprint(box, x, z, margin = 0.04) {
  return x >= box.minX - margin && x <= box.maxX + margin &&
    z >= box.minZ - margin && z <= box.maxZ + margin;
}

function normalizeSupport(value, fallbackId = "support") {
  if (Number.isFinite(value)) return { y: value, id: fallbackId, collider: null };
  if (!value || typeof value !== "object") return null;
  const y = [value.y, value.topY, value.height, value.surfaceY, value.point?.y]
    .find(Number.isFinite);
  if (!Number.isFinite(y)) return null;
  return {
    y,
    id: value.id || value.supportId || value.collider?.id || fallbackId,
    collider: value.collider || value.raw || null
  };
}

function getSupportAt(x, z, feetY, maxRise = STEP_HEIGHT, maxDrop = GROUND_SNAP) {
  if (typeof world?.getSupport === "function") {
    const queried = normalizeSupport(world.getSupport(x, z, feetY, {
      radius: PLAYER_RADIUS * 0.82,
      maxRise,
      maxDrop
    }));
    if (queried && queried.y <= feetY + maxRise + 0.02 && queried.y >= feetY - maxDrop - 0.02) return queried;
  }

  let best = null;
  for (const raw of world?.colliders || []) {
    if (raw.disabled || raw.solid === false || raw.walkableTop === false || raw.walkable === false) continue;
    const box = normalizeCollider(raw);
    if (!box || !pointTouchesFootprint(box, x, z, 0.08)) continue;
    const topY = colliderTopAt(raw, x, z);
    if (topY > feetY + maxRise + 0.02 || topY < feetY - maxDrop - 0.02) continue;
    if (!best || topY > best.y) best = { y: topY, id: raw.id || raw.name || "support", collider: raw };
  }
  return best;
}

function refreshSurfaceContact(support = null) {
  if (!player.grounded) {
    player.surfaceCollider = null;
    player.surfaceContact = false;
    player.surfaceId = "airborne";
    player.surfaceKind = "air";
    player.surfaceWetness = 0;
    player.effectiveWetness = 0;
    player.surfaceFriction = 1;
    player.surfaceGrip = 0;
    player.surfaceWidth = 0;
    player.edgeRecovery = 0;
    player.surfaceSlope = 0;
    player.downhillX = 0;
    player.downhillZ = 0;
    player.downhillAcceleration = 0;
    player.surfaceBraking = 0;
    player.surfaceTraction = 0;
    player.sprintSlip = 0;
    player.lateralSlip = 0;
    player.lateralDriftAcceleration = 0;
    player.slipAmount = 0;
    player.rampSlipCue = 0;
    player.slipping = false;
    return null;
  }

  support ||= getSupportAt(player.x, player.z, player.y, 0.09, GROUND_SNAP + 0.08);
  const raw = support?.collider || null;
  const label = `${raw?.tag || ""} ${raw?.type || ""} ${raw?.id || support?.id || ""}`.toLowerCase();
  const kind = raw?.shape === "ramp"
    ? "ramp"
    : /floor|ground/.test(label)
      ? "ground"
      : raw?.type === "furniture"
        ? "furniture"
        : "platform";

  let wetness = kind === "ground" ? 0.64 : kind === "furniture" ? 0.79 : 0.87;
  if (kind === "ramp") wetness = 0.94;
  if (/knot|bridge|truss|route/.test(label)) wetness = Math.max(wetness, 0.91);
  const width = raw
    ? Math.min(Math.max(0, raw.maxX - raw.minX), Math.max(0, raw.maxZ - raw.minZ))
    : 60;
  if (width < 3.6) wetness -= kind === "ramp" ? 0.055 : 0.13;
  wetness = THREE.MathUtils.clamp(wetness + smoothstep(0.015, 0.38, player.depth) * 0.16, 0, 1);
  const edgeDistance = raw
    ? Math.max(0, Math.min(player.x - raw.minX, raw.maxX - player.x, player.z - raw.minZ, raw.maxZ - player.z))
    : 4;
  const edgeRecovery = 1 - smoothstep(0.24, 0.82, edgeDistance);

  player.surfaceCollider = raw;
  player.surfaceContact = Boolean(support);
  player.surfaceId = raw?.id || support?.id || "mansion floor";
  player.surfaceKind = kind;
  player.surfaceWetness = wetness;
  player.effectiveWetness = wetness;
  player.surfaceFriction = THREE.MathUtils.lerp(0.82, 0.22, wetness);
  player.surfaceGrip = THREE.MathUtils.lerp(0.93, 0.31, wetness);
  player.surfaceWidth = width;
  player.edgeRecovery = edgeRecovery;
  player.surfaceSlope = 0;
  player.downhillX = 0;
  player.downhillZ = 0;
  player.downhillAcceleration = 0;

  if (raw?.shape === "ramp") {
    const axis = raw.axis === "z" ? "z" : "x";
    const minimum = axis === "x" ? raw.minX : raw.minZ;
    const maximum = axis === "x" ? raw.maxX : raw.maxZ;
    const atMinimum = Number.isFinite(raw.yAtMin) ? raw.yAtMin : colliderTopAt(raw, axis === "x" ? minimum : player.x, axis === "z" ? minimum : player.z);
    const atMaximum = Number.isFinite(raw.yAtMax) ? raw.yAtMax : colliderTopAt(raw, axis === "x" ? maximum : player.x, axis === "z" ? maximum : player.z);
    const run = Math.max(0.001, maximum - minimum);
    const signedGrade = (atMaximum - atMinimum) / run;
    player.surfaceSlope = Math.abs(signedGrade);
    const downhillSign = signedGrade > 0 ? -1 : 1;
    player.downhillX = axis === "x" ? downhillSign : 0;
    player.downhillZ = axis === "z" ? downhillSign : 0;
    const slopeGravity = GRAVITY * (player.surfaceSlope / Math.sqrt(1 + player.surfaceSlope * player.surfaceSlope));
    player.downhillAcceleration = Math.min(3.25, slopeGravity * THREE.MathUtils.lerp(0.46, 0.78, wetness));
  }
  return support;
}

function findLandingAt(x, z, fromFeetY, toFeetY) {
  if (typeof world?.findLanding === "function") {
    const queried = normalizeSupport(world.findLanding(x, z, fromFeetY, toFeetY, PLAYER_RADIUS * 0.82), "landing");
    if (queried && queried.y <= fromFeetY + 0.08 && queried.y >= toFeetY - GROUND_SNAP) return queried;
  }

  let best = null;
  for (const raw of world?.colliders || []) {
    if (raw.disabled || raw.solid === false || raw.walkableTop === false || raw.walkable === false) continue;
    const box = normalizeCollider(raw);
    if (!box || !pointTouchesFootprint(box, x, z, 0.075)) continue;
    const topY = colliderTopAt(raw, x, z);
    if (topY > fromFeetY + 0.07 || topY < toFeetY - GROUND_SNAP) continue;
    if (!best || topY > best.y) best = { y: topY, id: raw.id || raw.name || "landing", collider: raw };
  }
  return best;
}

function findCeilingAt(x, z, fromHeadY, toHeadY) {
  if (typeof world?.findCeiling === "function") {
    const value = world.findCeiling(x, z, fromHeadY, toHeadY, PLAYER_RADIUS * 0.8);
    if (Number.isFinite(value)) return value;
    if (value && typeof value === "object") {
      const y = value.collider?.shape === "ramp"
        ? colliderBottomAt(value.collider, x, z)
        : [value.y, value.bottomY, value.minY, value.point?.y].find(Number.isFinite);
      if (Number.isFinite(y) && y >= Math.min(fromHeadY, toHeadY) - 0.02 && y <= Math.max(fromHeadY, toHeadY) + 0.02) return y;
    }
  }
  let closest = Infinity;
  for (const raw of world?.colliders || []) {
    if (raw.disabled || raw.solid === false) continue;
    const box = normalizeCollider(raw);
    if (!box || !pointTouchesFootprint(box, x, z, PLAYER_RADIUS * 0.7)) continue;
    const bottom = colliderBottomAt(raw, x, z);
    if (bottom >= fromHeadY - 0.02 && bottom <= toHeadY + 0.02) closest = Math.min(closest, bottom);
  }
  return Number.isFinite(closest) ? closest : null;
}

function canUseHeight(height, feetY = player.y) {
  const from = feetY + Math.min(player.currentHeight, height) - 0.03;
  const to = feetY + height;
  if (to <= from + 0.01) return true;
  return findCeilingAt(player.x, player.z, from, to) === null;
}

function updateVerticalPhysics(dt) {
  const wasGrounded = player.grounded;
  const previousVy = player.vy;

  if (player.grounded) {
    const support = getSupportAt(player.x, player.z, player.y, 0.07, GROUND_SNAP + 0.06);
    if (support) {
      player.y = support.y;
      player.vy = 0;
      player.supportId = support.id;
      player.airTime = 0;
    } else {
      player.grounded = false;
      player.supportId = null;
    }
  }

  if (!player.grounded) {
    const gravityScale = !player.jumpHeld && player.vy > 0 ? 1.72 : 1;
    player.vy = Math.max(-24, player.vy - GRAVITY * gravityScale * dt);
    player.fallVelocity = Math.min(player.fallVelocity, player.vy);
    player.airTime += dt;
    const fromY = player.y;
    let toY = player.y + player.vy * dt;

    if (player.vy > 0) {
      const ceiling = findCeilingAt(
        player.x,
        player.z,
        fromY + player.currentHeight,
        toY + player.currentHeight
      );
      if (Number.isFinite(ceiling)) {
        toY = ceiling - player.currentHeight - 0.006;
        player.vy = Math.min(0, player.vy);
      }
    } else {
      const landing = findLandingAt(player.x, player.z, fromY, toY);
      if (landing) {
        player.y = landing.y;
        player.vy = 0;
        player.grounded = true;
        player.supportId = landing.id;
        const impact = Math.max(0, -Math.min(previousVy, player.fallVelocity));
        const landingSpeed = Math.hypot(player.vx, player.vz);
        if (!wasGrounded && impact > 2.6 && landingSpeed > 1.05) {
          player.landingSlipTimer = THREE.MathUtils.clamp(
            0.24 + (impact - 2.6) * 0.034 + landingSpeed * 0.028,
            0.3,
            0.72
          );
          player.landingSlipStrength = THREE.MathUtils.clamp(
            0.36 + (impact - 2.6) / 11 + landingSpeed / 13,
            0.38,
            1
          );
          player.landingSlipEvents += 1;
        }
        if (!wasGrounded && impact > 1.35) {
          const landingDepth = sampleDepthAt(player.x, player.z, landing.y);
          audio.land(THREE.MathUtils.clamp((impact - 1) / 9, 0.18, 1), Math.min(1, landingDepth / 1.2));
          if (landingDepth > 0.08 && impact > 2.5) {
            splatLens({
              x: 0.18 + nextLensRandom() * 0.64,
              y: 0.72 + nextLensRandom() * 0.2,
              intensity: THREE.MathUtils.clamp(0.18 + landingDepth * 0.3 + impact * 0.025, 0.2, 0.78),
              wetness: 1,
              sauce: 0.28 + nextLensRandom() * 0.3,
              directionX: (nextLensRandom() - 0.5) * 0.8,
              directionY: -1
            }, "wade");
          }
          if (input.isTouch && navigator.vibrate && impact > 4.5) navigator.vibrate(Math.min(28, Math.round(impact * 2.4)));
        }
        player.airTime = 0;
        player.fallVelocity = 0;
        refreshSurfaceContact(landing);
        return;
      }
    }
    player.y = toY;
  }
}

function tryStartMantle(raw, directionX, directionZ) {
  if (!raw || player.mantle || player.depth > 1.05) return false;
  const box = normalizeCollider(raw);
  if (!box || raw.walkableTop === false || raw.walkable === false || raw.mantleable === false) return false;
  const probeX = THREE.MathUtils.clamp(player.x + directionX * 0.52, box.minX + 0.16, box.maxX - 0.16);
  const probeZ = THREE.MathUtils.clamp(player.z + directionZ * 0.52, box.minZ + 0.16, box.maxZ - 0.16);
  const topY = colliderTopAt(raw, probeX, probeZ);
  const rise = topY - player.y;
  if (rise < 0.3 || rise > MAX_MANTLE_HEIGHT) return false;
  if (!isCapsuleClear(probeX, topY, probeZ, PLAYER_HEIGHT, raw)) return false;

  player.mantle = {
    elapsed: 0,
    duration: MANTLE_DURATION + rise * 0.035,
    startX: player.x,
    startY: player.y,
    startZ: player.z,
    targetX: probeX,
    targetY: topY,
    targetZ: probeZ,
    supportId: raw.id || raw.name || "mantle"
  };
  player.grounded = false;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.crouching = true;
  audio.mantle(THREE.MathUtils.clamp(rise / MAX_MANTLE_HEIGHT, 0.35, 1));
  return true;
}

function updateMantle(dt) {
  const mantle = player.mantle;
  if (!mantle) return;
  mantle.elapsed += dt;
  const rawT = THREE.MathUtils.clamp(mantle.elapsed / mantle.duration, 0, 1);
  const t = rawT * rawT * (3 - 2 * rawT);
  player.x = THREE.MathUtils.lerp(mantle.startX, mantle.targetX, t);
  player.z = THREE.MathUtils.lerp(mantle.startZ, mantle.targetZ, t);
  player.y = THREE.MathUtils.lerp(mantle.startY, mantle.targetY, t) + Math.sin(rawT * Math.PI) * 0.11;
  player.speed = Math.hypot(mantle.targetX - mantle.startX, mantle.targetZ - mantle.startZ) / mantle.duration;
  if (rawT < 1) return;
  player.x = mantle.targetX;
  player.y = mantle.targetY;
  player.z = mantle.targetZ;
  player.grounded = true;
  player.supportId = mantle.supportId;
  player.coyote = COYOTE_TIME;
  player.airTime = 0;
  player.fallVelocity = 0;
  player.mantle = null;
}

function isCapsuleClear(x, y, z, height, ignoredCollider = null) {
  for (const raw of world?.colliders || []) {
    if (raw === ignoredCollider || raw.disabled || raw.solid === false) continue;
    const box = normalizeCollider(raw);
    if (!box) continue;
    const closestX = THREE.MathUtils.clamp(x, box.minX, box.maxX);
    const closestZ = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
    if (Math.hypot(x - closestX, z - closestZ) >= PLAYER_RADIUS * 0.92) continue;
    const top = colliderTopAt(raw, closestX, closestZ);
    const bottom = colliderBottomAt(raw, closestX, closestZ);
    if (y + height > bottom + 0.025 && y + 0.035 < top - 0.02) return false;
  }
  return true;
}

function updateCheckpoint() {
  if (!player.grounded || typeof world?.getCheckpointAt !== "function") return;
  const checkpoint = world.getCheckpointAt(player.x, player.y, player.z);
  if (!checkpoint) return;
  const id = typeof checkpoint === "string" ? checkpoint : checkpoint.id;
  if (!id || id === player.checkpointId) return;
  const checkpoints = Array.isArray(world?.checkpoints) ? world.checkpoints : [];
  const current = checkpoints.find((entry) => entry.id === player.checkpointId);
  const candidate = typeof checkpoint === "string" ? checkpoints.find((entry) => entry.id === checkpoint) : checkpoint;
  if (current && candidate && Number(candidate.tier || 0) <= Number(current.tier || 0)) return;
  player.checkpointId = id;
  showMessage(
    id === "upper-apse"
      ? "CROWN EXTRACTION ROUTE SECURED \u00b7 GATE AHEAD"
      : "THE BASILICA REMEMBERS YOUR FOOTSTEPS",
    id === "upper-apse" ? 3.2 : 2.1
  );
  audio.mantle(0.32);
}

function respawnAtCheckpoint() {
  const checkpoints = Array.isArray(world?.checkpoints) ? world.checkpoints : [];
  const checkpoint = checkpoints.find((entry) => entry.id === player.checkpointId) || world?.spawn || { x: 0, y: 0, z: 32, yaw: 0 };
  player.x = Number(checkpoint.x) || 0;
  player.y = Number(checkpoint.y) || 0;
  player.z = Number(checkpoint.z) || 0;
  if (Number.isFinite(checkpoint.yaw)) player.yaw = checkpoint.yaw;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.grounded = true;
  player.supportId = checkpoint.supportId || checkpoint.id || "spawn";
  player.mantle = null;
  player.airTime = 0;
  player.fallVelocity = 0;
  player.coyote = COYOTE_TIME;
  player.jumpBuffer = 0;
  player.jumpHeld = false;
  player.crouching = false;
  player.slideTimer = 0;
  player.currentHeight = PLAYER_HEIGHT;
  player.currentEyeHeight = BASE_EYE_HEIGHT;
  player.speed = 0;
  player.stepDistance = 0;
  player.landingSlipTimer = 0;
  player.landingSlipStrength = 0;
  player.slipAmount = 0;
  player.rampSlipCue = 0;
  player.slipping = false;
  debugJumpHeld = false;
  debugJumpQueued = false;
  submergeTimer = 0;
  refreshSurfaceContact(getSupportAt(player.x, player.z, player.y, 0.09, GROUND_SNAP + 0.1));
  camera?.position?.set(player.x, player.y + BASE_EYE_HEIGHT, player.z);
  showMessage("THE SAUCE SPITS YOU BACK OUT", 1.8);
}

function missedCheckpointDrop() {
  if (!player.checkpointId || player.checkpointId === "spawn") return false;
  const checkpoint = (world?.checkpoints || []).find((entry) => entry.id === player.checkpointId);
  if (!checkpoint || !Number.isFinite(checkpoint.y)) return false;
  return player.y < checkpoint.y - Math.max(3.8, Number(checkpoint.respawnDrop) || 0);
}

function sampleSurfaceYAt(x, z) {
  const sampled = typeof world?.sampleSurfaceY === "function"
    ? world.sampleSurfaceY(x, z, player.y)
    : world?.sampleLevel?.(x, z);
  if (Number.isFinite(sampled)) return sampled;
  if (sampled && typeof sampled === "object") {
    const y = [sampled.y, sampled.surfaceY, sampled.level, sampled.height].find(Number.isFinite);
    if (Number.isFinite(y)) return y;
  }
  return 0;
}

function getCombatSupportAt(x, z, feetY, radius = 0.22, maxRise = 0.72, maxDrop = 1.25) {
  if (typeof world?.getSupport !== "function") return null;
  const referenceY = Number.isFinite(Number(feetY)) ? Number(feetY) : player.y;
  return normalizeSupport(world.getSupport(x, z, referenceY, {
    radius: THREE.MathUtils.clamp(Number(radius) || 0.22, 0.08, 1.2),
    maxRise,
    maxDrop
  }), "combat support");
}

function sampleCombatSurfaceYAt(x, z, feetY = player.y) {
  const referenceY = Number.isFinite(Number(feetY)) ? Number(feetY) : player.y;
  const support = getCombatSupportAt(x, z, referenceY);
  return support?.y ?? sampleSurfaceYAt(x, z);
}

function sampleDepthAt(x, z, feetY) {
  if (typeof world?.sampleDepth === "function") {
    const sampled = world.sampleDepth(x, z, feetY);
    if (Number.isFinite(sampled)) return Math.max(0, sampled);
  }
  return Math.max(0, sampleSurfaceYAt(x, z) - (Number.isFinite(feetY) ? feetY : 0));
}

function sampleRainSurface(x, z) {
  const flood = sampleSurfaceYAt(x, z);
  const support = typeof world?.getSupport === "function"
    ? normalizeSupport(world.getSupport(x, z, 26.2, { radius: 0.04, maxRise: 0.2, maxDrop: 30 }), "rain impact")
    : null;
  return Math.max(flood, Number.isFinite(support?.y) ? support.y : 0);
}

function splatLens(config, source = "rain") {
  if (!cameraSpaghetti?.splat) return null;
  const result = cameraSpaghetti.splat(config);
  if (result?.id !== null) {
    lensSplatEvents += 1;
    if (source === "impact") lensImpactEvents += 1;
  }
  return result;
}

function handleLensRainImpact(impact) {
  if (!impact || phase !== "playing" || !cameraSpaghetti) return;
  const eyeY = player.y + player.currentEyeHeight;
  const dx = Number(impact.x) - player.x;
  const dz = Number(impact.z) - player.z;
  const dy = Number(impact.y) - eyeY;
  if (![dx, dz, dy].every(Number.isFinite)) return;

  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);
  const lateral = dx * rightX + dz * rightZ;
  const forward = dx * forwardX + dz * forwardZ;
  const distance = Math.hypot(dx, dz, dy * 0.7);
  const speed = THREE.MathUtils.clamp(Number(impact.speed) || 0, 0, 18);

  if (impact.kind === "lens") {
    audio?.noodleImpact?.(0.48 + Math.min(0.42, speed / 22), 0.15);
    splatLens({
      x: THREE.MathUtils.clamp(0.5 + lateral * 0.48, 0.1, 0.9),
      y: THREE.MathUtils.clamp(0.34 - dy * 0.16 + (nextLensRandom() - 0.5) * 0.16, 0.08, 0.78),
      intensity: 0.64 + Math.min(0.54, speed / 22),
      wetness: 1,
      sauce: 0.28 + nextLensRandom() * 0.42,
      directionX: THREE.MathUtils.clamp(lateral * 0.7, -0.8, 0.8),
      directionY: 0.72 + nextLensRandom() * 0.55
    }, "impact");
    return;
  }

  if (distance > 2.85 || Math.abs(dy) > 1.9 || speed < 1.8) return;
  const proximity = 1 - distance / 2.85;
  const facing = THREE.MathUtils.clamp((forward + 1.2) / 2.4, 0.25, 1);
  if (nextLensRandom() > 0.08 + proximity * 0.42 * facing) return;
  splatLens({
    x: THREE.MathUtils.clamp(0.5 + lateral * 0.16, 0.08, 0.92),
    y: THREE.MathUtils.clamp(0.7 - dy * 0.09 + nextLensRandom() * 0.18, 0.48, 0.94),
    intensity: 0.16 + proximity * 0.46 + Math.min(0.16, speed / 55),
    wetness: 1,
    sauce: 0.2 + nextLensRandom() * 0.34,
    directionX: THREE.MathUtils.clamp(lateral * 0.35, -0.75, 0.75),
    directionY: -0.7 - nextLensRandom() * 0.45
  }, "impact");
}

function updateCamera(dt, time) {
  if (!camera) return;
  const punchKick = punchCameraKick;
  punchCameraKick = Math.max(0, punchCameraKick - Math.max(0, dt) * 8.6);
  const wet = smoothstep(0.03, 0.4, player.depth);
  const moving = Math.min(1, player.speed / 3.6);
  const bob = phase === "playing"
    ? Math.sin(player.bobPhase) * THREE.MathUtils.lerp(0.022, 0.054, wet) * moving
    : Math.sin(time * 0.7) * 0.002;
  const stepRoll = Math.sin(player.bobPhase * 0.5) * THREE.MathUtils.lerp(0.004, 0.017, wet) * moving;
  const rightVelocity = player.vx * Math.cos(player.yaw) - player.vz * Math.sin(player.yaw);
  const slipRoll = THREE.MathUtils.clamp(-rightVelocity * player.slipAmount * 0.0045, -0.019, 0.019) +
    Math.sin(time * 6.4) * player.slipAmount * 0.0035 +
    Math.sin(time * 4.75) * player.rampSlipCue * 0.0085;
  const rampLurch = -player.rampSlipCue * (0.0045 + Math.sin(time * 5.6) * 0.0022);
  const airPitch = THREE.MathUtils.clamp(-player.vy * 0.0022, -0.016, 0.02);
  const dragPitch = Math.sin(player.bobPhase) * 0.004 * wet * moving + airPitch;
  const headLagX = -player.vx * THREE.MathUtils.lerp(0.007, 0.015, wet);
  const headLagZ = -player.vz * THREE.MathUtils.lerp(0.007, 0.015, wet);
  const smoothing = 1 - Math.exp(-10 * Math.max(0.001, dt));
  const runFov = smoothstep(3.5, RUN_SPEED, player.speed) * 4.2;
  const targetFov = THREE.MathUtils.lerp(66 + runFov, 63.5, smoothstep(0.55, 1.45, player.depth));

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.x + headLagX, smoothing);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, player.z + headLagZ, smoothing);
  camera.position.y = THREE.MathUtils.lerp(
    camera.position.y || player.y + player.currentEyeHeight,
    player.y + player.currentEyeHeight + bob - smoothstep(1.2, 1.65, player.depth) * 0.035 - player.rampSlipCue * 0.012 - punchKick * 0.012,
    smoothing
  );
  const punchRoll = Math.sin((1 - punchKick) * 19) * punchKick * 0.012;
  camera.rotation.set(player.pitch + dragPitch + rampLurch - punchKick * 0.022, player.yaw, stepRoll + slipRoll + punchRoll, "YXZ");
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, smoothing * 0.45);
    camera.updateProjectionMatrix();
  }
}

function lastHostileLocator(combatState) {
  const enemies = Array.isArray(combatState?.enemies) ? combatState.enemies : [];
  if (enemies.length !== 1) return null;
  const enemy = enemies[0];
  if (enemy?.targetVisible || Number(enemy?.unseenTimer || 0) < 2.6) return null;
  const position = enemy?.position;
  if (![position?.x, position?.y, position?.z].every(Number.isFinite)) return null;
  const dx = position.x - player.x;
  const dz = position.z - player.z;
  const distance = Math.hypot(dx, dz);
  const bearing = Math.atan2(-dx, -dz);
  const relative = Math.atan2(Math.sin(bearing - player.yaw), Math.cos(bearing - player.yaw));
  const horizontal = Math.abs(relative) < 0.48
    ? "AHEAD"
    : Math.abs(relative) > 2.56
      ? "BEHIND"
      : relative < 0 ? "RIGHT" : "LEFT";
  const height = position.y - player.y;
  const vertical = height > 1.45 ? " · ABOVE" : height < -1.45 ? " · BELOW" : "";
  return `LAST HOSTILE · ${horizontal}${vertical} · ${Math.ceil(distance)}m`;
}

function depthBandFor(value) {
  if (value < 0.035) return "DRY";
  if (value < 0.28) return "ANKLE";
  if (value < 0.68) return "KNEE";
  if (value < 1.08) return "WAIST";
  if (value < 1.42) return "CHEST";
  return "MOUTH";
}

function updateSpaghettiHazard(dt) {
  const safeDt = THREE.MathUtils.clamp(Number(dt) || 0, 0, 0.1);
  const wasDamaging = spaghettiDamageActive;
  spaghettiHazardActive = player.depth >= SPAGHETTI_WARNING_DEPTH;
  spaghettiDamageActive = phase === "playing" && player.depth >= SPAGHETTI_DAMAGE_DEPTH;
  // Anchor the upper bound to the fixed standing eye height. Using the live
  // currentEyeHeight let a crouch collapse it below SPAGHETTI_DAMAGE_DEPTH,
  // inverting the smoothstep so crouched players snapped straight to max burn.
  spaghettiHazardSeverity = smoothstep(SPAGHETTI_DAMAGE_DEPTH, BASE_EYE_HEIGHT - 0.08, player.depth);

  if (!spaghettiDamageActive) {
    spaghettiDamageCooldown = 0.35;
    return;
  }
  if (!wasDamaging) spaghettiDamageCooldown = Math.min(spaghettiDamageCooldown, 0.32);
  spaghettiDamageCooldown -= safeDt;
  if (spaghettiDamageCooldown > 0) return;

  const amount = 2.5 + spaghettiHazardSeverity * 2.5;
  const damaged = combat?.damagePlayer?.(amount, "rising-spaghetti");
  if (damaged !== false) {
    if (spaghettiDamagePulses === 0) showMessage("TAKING DAMAGE · CLIMB ABOVE THE SPAGHETTI", 2.7);
    spaghettiDamagePulses += 1;
    spaghettiDamageTotal += amount;
  }
  spaghettiDamageCooldown = THREE.MathUtils.lerp(1.02, 0.56, spaghettiHazardSeverity);
}

function updateHud(danger) {
  const ratio = THREE.MathUtils.clamp(player.depth / player.currentEyeHeight, 0, 1.08);
  const floodLevel = maximumFill(world?.getFillLevels?.() || {});
  const clearance = player.y - floodLevel;
  const floodRising = phase === "playing" && fillMultiplier > 0 &&
    floodLevel < Number(world?.worldBounds?.maxY ?? 18) - 0.08;
  fillLevelEl.style.height = Math.min(100, ratio * 100).toFixed(1) + "%";
  fillMarker.style.bottom = THREE.MathUtils.clamp(SPAGHETTI_DAMAGE_DEPTH / player.currentEyeHeight, 0, 1) * 100 + "%";
  stage.style.setProperty("--warmth", String(0.025 + Math.min(0.14, player.depth * 0.07)));
  stage.style.setProperty("--submerge", String(THREE.MathUtils.clamp(danger * 0.88, 0, 1)));
  stage.style.setProperty("--depth-ratio", String(THREE.MathUtils.clamp(ratio, 0, 1)));
  stage.style.setProperty("--depth-height", (THREE.MathUtils.clamp(ratio, 0, 1) * 36).toFixed(2) + "%");
  stage.style.setProperty("--horizon-opacity", String(THREE.MathUtils.clamp((ratio - 0.18) * 0.58, 0, 0.42)));
  stage.style.setProperty("--hazard-severity", String(spaghettiHazardSeverity));
  stage.style.setProperty("--hazard-glow", String(0.08 + spaghettiHazardSeverity * 0.22));
  roomLabel.textContent = formatRoom(player.room);

  const combatState = updateCombatHud();
  const living = countLivingEnemies(combatState);
  const boss = readCombatBoss(combatState);
  const exit = world.exit || { x: 0, y: 3.2, z: -38 };
  const exitX = Number.isFinite(exit.x) ? exit.x : 0;
  const exitZ = Number.isFinite(exit.z) ? exit.z : -38;
  const remainingDistance = Math.max(0, Math.hypot(
    player.x - exitX,
    player.z - exitZ
  ));
  const locator = lastHostileLocator(combatState);
  if (boss?.alive || boss?.active) objective.textContent = "SEVER THE NOODLEMANCER";
  else if (locator) objective.textContent = locator;
  else if (living > 0) objective.textContent = "WAVE " + String(readCombatWave(combatState)).padStart(2, "0") + " · " + living + " BOILING";
  else if (combatState?.victory) {
    const crownRouteRequired = player.y >= 7.5 || floodLevel > 4.35;
    objective.textContent = crownRouteRequired
      ? "UPPER GATE OPEN \u00b7 FOLLOW CYAN LIGHTS OUTSIDE"
      : "ALTAR GATE OPEN \u00b7 " + Math.ceil(remainingDistance) + "m";
  }
  else objective.textContent = "ADVANCE TO THE GRAND ALTAR · " + Math.ceil(remainingDistance) + "m";
  objective.style.opacity = String(living > 0 || boss?.alive || combatState?.victory ? 0.96 : elapsed < 14 ? 0.72 : 0.5);
  roomLabel.style.opacity = String(elapsed < 7 ? 0.78 : 0.42);

  const depthBand = depthBandFor(player.depth);
  depthLabel.textContent = depthBand + " · " + player.depth.toFixed(2) + "m";
  if (floodLevelLabel) {
    const clearanceCopy = clearance >= 0
      ? `CLEAR +${clearance.toFixed(2)}m`
      : `DEPTH ${Math.abs(clearance).toFixed(2)}m`;
    floodLevelLabel.textContent = `LEVEL ${floodLevel.toFixed(2)}m ${floodRising ? "// RISING" : "// HELD"} // ${clearanceCopy}`;
  }
  stage.dataset.depthStage = depthBand.toLowerCase();
  stage.dataset.spaghettiHurting = String(spaghettiDamageActive);
  stage.dataset.floodRising = String(floodRising);
  fillMeter?.classList.toggle("warning", spaghettiHazardActive);
  fillMeter?.classList.toggle("hurting", spaghettiDamageActive);
  depthWarning?.classList.toggle("visible", spaghettiHazardActive);
  depthWarning?.classList.toggle("warning", player.depth >= 0.68);
  depthWarning?.classList.toggle("critical", player.depth >= SPAGHETTI_CRITICAL_DEPTH);
  depthWarning?.classList.toggle("hurting", spaghettiDamageActive);
  if (depthWarningLevel) depthWarningLevel.textContent = depthBand + " DEEP · " + player.depth.toFixed(2) + "m";
  if (depthWarningCopy) {
    depthWarningCopy.textContent = spaghettiDamageActive
      ? "BOILING SAUCE IS BURNING YOU · CLIMB"
      : player.depth >= 0.68
        ? "MOVEMENT SLOWED · REACH HIGH GROUND"
        : "THE FLOOD IS CLIMBING";
  }

  const onSlickRamp = player.grounded && player.surfaceKind === "ramp";
  const rampGrade = Math.round(player.surfaceSlope * 100);
  const downhillSpeed = Math.max(0, player.vx * player.downhillX + player.vz * player.downhillZ);
  stage.dataset.stairSlipping = String(onSlickRamp);
  stage.style.setProperty("--stair-slip", String(onSlickRamp ? Math.max(0.34, player.rampSlipCue) : 0));
  tractionWarning?.classList.toggle("visible", onSlickRamp);
  tractionWarning?.classList.toggle("sliding", onSlickRamp && downhillSpeed > 0.22);
  tractionWarning?.classList.toggle("severe", player.rampSlipCue > 0.72);
  if (tractionWarningLevel) {
    const levelCopy = onSlickRamp ? `NO TRACTION // ${rampGrade}% GRADE` : "NO TRACTION";
    if (tractionWarningLevel.textContent !== levelCopy) tractionWarningLevel.textContent = levelCopy;
  }
  if (tractionWarningCopy) {
    const gripCopy = input.isTouch
      ? "SPAGHETTI FLOW PULLING DOWNHILL // HOLD SLIDE FOR GRIP"
      : "SPAGHETTI FLOW PULLING DOWNHILL // CROUCH FOR GRIP";
    if (tractionWarningCopy.textContent !== gripCopy) tractionWarningCopy.textContent = gripCopy;
  }
  if (onSlickRamp && player.surfaceId !== lastSlickSurfaceId) {
    lastSlickSurfaceId = player.surfaceId;
    showMessage(input.isTouch ? "GREASED STAIRS // HOLD SLIDE FOR GRIP" : "GREASED STAIRS // CROUCH FOR GRIP", 1.8);
  } else if (!onSlickRamp) {
    lastSlickSurfaceId = null;
  }

  const hudWeapon = combatState?.weapon || combatState || {};
  const hudAmmo = Number(hudWeapon.ammo ?? combatState?.ammo ?? 0);
  const hudReserve = Number(hudWeapon.reserve ?? combatState?.reserve ?? 0);
  const hardDry = hudAmmo <= 0 && hudReserve <= 0;
  const handRolling = Boolean(hudWeapon.reloading && hudWeapon.reloadMode === "handroll");
  const sauceCooldown = Math.max(0, Number(hudWeapon.bombCooldown ?? 0) || 0);
  hint.classList.toggle("critical", hardDry);
  if (hardDry) {
    const sauceCopy = sauceCooldown <= 0.05
      ? (input.isTouch ? "SAUCE READY" : "Q SAUCE READY")
      : `SAUCE ${sauceCooldown.toFixed(1)}s`;
    hint.textContent = handRolling
      ? "HAND-ROLLING 15 FRESH ROUNDS · RELEASE FIRE"
      : input.isTouch
        ? `OUT OF PASTA · PUNCH NEEDS NO AMMO · TAP LOAD FOR 15 · ${sauceCopy}`
        : `OUT OF PASTA · F PUNCH NEEDS NO AMMO · R HAND-ROLLS 15 · ${sauceCopy}`;
    hint.style.opacity = "1";
  } else if (elapsed < 8) {
    hint.textContent = input.isTouch
      ? "LEFT MOVES · RIGHT LOOKS · FIRE SHOOTS · PUNCH EXPLODES CLOSE ENEMIES · LOAD RELOADS"
      : "WASD MOVE · LMB FIRE · RMB AIM · F PUNCH · R RELOAD / HAND-ROLL · Q SAUCE BOMB";
    hint.style.opacity = String(Math.max(0, 1 - elapsed / 8));
  } else {
    hint.style.opacity = "0";
  }
}

function updateCombatHud() {
  const state = combat?.getState?.() || {};
  const combatPlayer = state.player || state;
  const weapon = state.weapon || state;
  const stats = state.stats || state;
  const health = Number(combatPlayer.health ?? state.health ?? 100);
  const armor = Number(combatPlayer.sauceArmor ?? combatPlayer.armor ?? state.sauceArmor ?? 0);
  const maxHealth = Math.max(1, Number(combatPlayer.maxHealth ?? state.maxHealth ?? 100) || 100);
  const ammo = Number(weapon.ammo ?? state.ammo ?? 0);
  const reserve = Number(weapon.reserve ?? state.reserve ?? 0);
  const wave = readCombatWave(state);
  const living = countLivingEnemies(state);
  const score = Number(stats.score ?? state.score ?? 0);
  const shots = Number(stats.shots ?? state.shots ?? 0);
  const hits = Number(stats.hits ?? state.hits ?? 0);
  const kills = Number(stats.kills ?? state.kills ?? 0);
  const punchHits = Number(stats.punchHits ?? 0);
  const punchKills = Number(stats.punchKills ?? 0);
  const melee = state.melee || state.punch || {};
  const reloading = Boolean(weapon.reloading ?? state.reloading ?? state.reloadActive);
  const reloadMode = String(weapon.reloadMode ?? state.reloadMode ?? "idle");
  const hardDry = ammo <= 0 && reserve <= 0;
  const magazineEmpty = ammo <= 0 && reserve > 0;
  const lowAmmoThreshold = Math.max(1, Number(weapon.lowAmmoThreshold ?? 8) || 8);
  const lowAmmo = ammo > 0 && ammo <= lowAmmoThreshold;

  if (healthValue) healthValue.textContent = String(Math.max(0, Math.ceil(health))).padStart(3, "0");
  if (sauceArmorValue) sauceArmorValue.textContent = String(Math.max(0, Math.ceil(armor))).padStart(2, "0");
  healthRail?.style.setProperty("--status-fill", String(THREE.MathUtils.clamp(health / maxHealth, 0, 1)));
  armorRail?.style.setProperty("--status-fill", String(THREE.MathUtils.clamp(armor / 50, 0, 1)));
  if (ammoValue) ammoValue.textContent = String(Math.max(0, Math.floor(ammo))).padStart(2, "0");
  if (reserveValue) reserveValue.textContent = String(Math.max(0, Math.floor(reserve))).padStart(3, "0");
  // The encounter cell already renders a "WAVE" label beside this value, so emit
  // only the number — otherwise the strip reads "WAVE WAVE 01".
  if (waveValue) waveValue.textContent = String(wave).padStart(2, "0");
  if (enemyValue) enemyValue.textContent = living + " BOILING";
  if (scoreValue) scoreValue.textContent = String(Math.max(0, Math.floor(score))).padStart(6, "0");
  if (reloadLabel) {
    reloadLabel.textContent = reloading
      ? reloadMode === "handroll" ? "HAND-ROLLING 15 FRESH ROUNDS" : "TWIRLING FRESH MAG"
      : hardDry
        ? input.isTouch ? "TAP LOAD // HAND-ROLL 15" : "R // HAND-ROLL 15"
        : magazineEmpty
          ? `${input.isTouch ? "TAP LOAD" : "R // RELOAD"} · ${String(Math.max(0, Math.floor(reserve))).padStart(3, "0")} RESERVE`
          : lowAmmo
            ? `${Math.floor(ammo)} LEFT // ${input.isTouch ? "LOAD SOON" : "R RELOAD SOON"}`
            : "AL DENTE";
    reloadLabel.classList.toggle("reloading", reloading);
    reloadLabel.classList.toggle("urgent", hardDry && !reloading);
  }
  ammoValue?.classList.toggle("dry", ammo <= 0);
  ammoValue?.classList.toggle("low", lowAmmo);
  reserveValue?.classList.toggle("dry", hardDry);
  weaponStatus?.classList.toggle("ammo-low", lowAmmo);
  weaponStatus?.classList.toggle("ammo-critical", hardDry || (ammo > 0 && ammo <= 3));
  if (touchReloadCopy) touchReloadCopy.textContent = hardDry || reloadMode === "handroll" ? "HAND-ROLL" : "LOAD";
  if (touchReloadButton) {
    touchReloadButton.setAttribute("aria-label", hardDry
      ? "Hand-roll fifteen emergency rounds"
      : "Reload weapon");
  }
  const punchRemaining = Math.max(0, Number(melee.remaining ?? melee.cooldown ?? 0) || 0);
  const punchDuration = Math.max(0.01, Number(melee.cooldownDuration ?? melee.cooldownMax ?? 0.56) || 0.56);
  const punchReady = Boolean(melee.ready ?? punchRemaining <= 0.005);
  const punchActive = Boolean(melee.active);
  const punchInRange = Boolean(melee.inRange ?? melee.targetId != null);
  const punchCharge = punchReady ? 1 : THREE.MathUtils.clamp(1 - punchRemaining / punchDuration, 0, 1);
  if (punchStatus) {
    punchStatus.dataset.ready = String(punchReady);
    punchStatus.dataset.state = punchActive ? "active" : punchReady ? "ready" : "cooldown";
    punchStatus.classList.toggle("is-ready", punchReady);
    punchStatus.classList.toggle("cooldown", !punchReady);
    punchStatus.classList.toggle("in-range", punchInRange && punchReady);
    punchStatus.style.setProperty("--punch-charge", `${punchCharge.toFixed(3)}turn`);
    punchStatus.setAttribute("aria-label", punchReady
      ? punchInRange ? "Enemy in punch range. Press F to explode it into spaghetti." : "Melee ready. Press F to punch."
      : `Punch recovering. ${punchRemaining.toFixed(1)} seconds.`);
  }
  if (punchStatusCopy) punchStatusCopy.textContent = punchActive
    ? "SPAGHETTI FIST"
    : punchReady && punchInRange ? "TARGET IN RANGE" : punchReady ? "MELEE READY" : "RECOVERING";
  if (punchStatusAction) punchStatusAction.textContent = punchReady ? "PUNCH" : `${punchRemaining.toFixed(1)}s`;
  if (touchPunchButton) {
    touchPunchButton.dataset.ready = String(punchReady);
    touchPunchButton.classList.toggle("cooldown", !punchReady);
    touchPunchButton.classList.toggle("in-range", punchInRange && punchReady);
    touchPunchButton.style.setProperty("--punch-charge", String(punchCharge));
    touchPunchButton.setAttribute("aria-label", punchReady
      ? punchInRange ? "Punch and explode nearby enemy" : "Punch nearby enemy"
      : `Punch recovering, ${punchRemaining.toFixed(1)} seconds`);
  }

  const boss = readCombatBoss(state);
  const bossOnScreen = Boolean(boss?.active || boss?.alive);
  if (bossWrap) bossWrap.classList.toggle("hidden", !bossOnScreen);
  // Drop the kill feed clear of the boss track while the boss bar is on screen.
  document.body.classList.toggle("boss-active", bossOnScreen);
  if (bossName && boss?.name) bossName.textContent = String(boss.name).toUpperCase();
  if (bossFill) {
    const bossHealth = Number(boss?.health ?? boss?.hp ?? 0);
    const bossMax = Math.max(1, Number(boss?.maxHealth ?? boss?.maxHp ?? bossHealth) || 1);
    bossFill.style.width = THREE.MathUtils.clamp(bossHealth / bossMax, 0, 1) * 100 + "%";
  }

  const punchConnected = punchHits > lastCombatPunchHits;
  if (hits > lastCombatHits || punchConnected) {
    hitmarkerTimer = 0.095;
    hitmarker?.classList.toggle("kill", kills > lastCombatKills || punchKills > lastCombatPunchKills);
    if (punchConnected && punchStatus) {
      punchStatus.classList.remove("impact");
      void punchStatus.offsetWidth;
      punchStatus.classList.add("impact");
    }
  }
  const spread = Math.max(0, Number(weapon.spread ?? 0) || 0);
  const reticleSize = THREE.MathUtils.clamp(23 + spread * 2100, 24, 43);
  if (reticle) {
    reticle.style.width = `${reticleSize.toFixed(1)}px`;
    reticle.style.height = `${reticleSize.toFixed(1)}px`;
    reticle.classList.toggle("firing", shots > lastCombatShots);
    reticle.classList.toggle("bloom", spread >= 0.0072);
  }
  if (kills > lastCombatKills && killFeed) {
    const label = String(state.lastKill?.name || state.lastKill || "SPAGHETTI HOSTILE").toUpperCase();
    const salvaged = Math.max(0, Number(state.lastKill?.ammoSalvaged || 0) || 0);
    const killedByPunch = state.lastKill?.cause === "punch";
    killFeed.textContent = label + (killedByPunch ? " // PUNCH-COOKED INTO SPAGHETTI" : " // DRAINED") + (salvaged ? ` · +${String(salvaged).padStart(2, "0")} PASTA` : "");
    killFeed.classList.remove("show");
    void killFeed.offsetWidth;
    killFeed.classList.add("show");
  }
  if (health < lastCombatHealth && damageFlashTimer <= 0) flashDamage(lastCombatHealth - health, "enemy");
  lastCombatHealth = health;
  lastCombatShots = shots;
  lastCombatHits = hits;
  lastCombatKills = kills;
  lastCombatPunchHits = punchHits;
  lastCombatPunchKills = punchKills;
  return state;
}

function readCombatWave(state) {
  return Math.max(1, Number(state?.wave?.index ?? state?.waveIndex ?? state?.wave ?? 1) || 1);
}

function countLivingEnemies(state) {
  if (Number.isFinite(state?.livingEnemies)) return state.livingEnemies;
  if (Number.isFinite(state?.enemyCount)) return state.enemyCount;
  return Array.isArray(state?.enemies)
    ? state.enemies.filter((enemy) => enemy && enemy.alive !== false && Number(enemy.health ?? enemy.hp ?? 1) > 0).length
    : 0;
}

function readCombatBoss(state) {
  if (state?.boss && typeof state.boss === "object") return state.boss;
  return Array.isArray(state?.enemies)
    ? state.enemies.find((enemy) => enemy?.boss || enemy?.type === "noodlemancer") || null
    : null;
}

function flashDamage(amount = 0, source = "enemy") {
  const force = THREE.MathUtils.clamp((Number(amount) || 0) / 32, 0.16, 1);
  damageFlashTimer = Math.max(damageFlashTimer, 0.11 + force * 0.16);
  lastDamageSource = String(source || "enemy");
  if (damageFlash) {
    damageFlash.style.setProperty("--damage-force", force.toFixed(3));
    damageFlash.style.setProperty("--damage-opacity", (0.62 + force * 0.38).toFixed(3));
    damageFlash.style.setProperty("--damage-scale", (1 + force * 0.035).toFixed(4));
    damageFlash.dataset.source = lastDamageSource;
    damageFlash.classList.toggle("sauce", lastDamageSource === "rising-spaghetti");
    damageFlash.classList.remove("pulse");
    void damageFlash.offsetWidth;
    damageFlash.classList.add("pulse");
  }
  if (lastDamageSource === "rising-spaghetti") {
    for (const rail of [healthRail, armorRail]) {
      if (!rail) continue;
      rail.classList.remove("sauce-hit");
      void rail.offsetWidth;
      rail.classList.add("sauce-hit");
    }
  }
  if (input?.isTouch && navigator.vibrate) {
    navigator.vibrate(lastDamageSource === "rising-spaghetti"
      ? [18, 22, 18, 22, Math.round(24 + force * 34)]
      : Math.round(18 + force * 42));
  }
}

function updateNarrative() {
  const thresholds = [
    { depth: 0.045, text: "SPAGHETTI RISING · FIND HIGH GROUND" },
    { depth: 0.31, text: "ANKLE DEEP · THE FLOOR IS CLIMBING" },
    { depth: 0.68, text: "KNEE DEEP · MOVEMENT SLOWED" },
    { depth: 1.02, text: "BOILING SAUCE · DAMAGE IMMINENT" },
    { depth: 1.35, text: "MOUTH LEVEL · DROWNING" }
  ];
  while (narrativeIndex < thresholds.length && player.depth >= thresholds[narrativeIndex].depth) {
    showMessage(thresholds[narrativeIndex].text, narrativeIndex > 2 ? 3.1 : 2.35);
    narrativeIndex += 1;
  }
}

function showMessage(text, seconds) {
  dangerCopy.textContent = text;
  dangerCopy.classList.remove("show");
  requestAnimationFrame(() => dangerCopy.classList.add("show"));
  messageTimer = seconds;
}

function checkEnding(allowAutotest = false) {
  if (phase !== "playing" || (AUTOTEST && !allowAutotest)) return;
  const exit = world.exit || { x: 0, y: 3.2, z: -38, radius: 1.8 };
  const atExit = typeof world?.isAtExit === "function"
    ? world.isAtExit(player.x, player.y, player.z)
    : Math.hypot(player.x - exit.x, player.z - exit.z) <= (exit.radius || 1.6) &&
      player.y >= Number(exit.minY ?? exit.y ?? 3.2) - 0.25;
  if (elapsed > 1.2 && atExit && combat?.getState?.()?.victory) {
    finish("victory");
    return;
  }
  if (submergeTimer > 1.05 || player.depth > player.currentEyeHeight + 0.15) finish("drowned");
}

function finish(result) {
  if (["victory", "defeated", "drowned"].includes(phase)) return;
  phase = result;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  input.releaseAll?.();
  debugPunchHeld = false;
  hud.classList.add("hidden");
  touchUI.classList.add("hidden");
  publishPhase();
  if (document.pointerLockElement) document.exitPointerLock?.();

  const seconds = Math.max(0, elapsed);
  const combatState = combat?.getState?.() || {};
  const stats = combatState.stats || combatState;
  const shots = Number(stats.shots || 0);
  const hits = Number(stats.hits || 0);
  const kills = Number(stats.kills || 0);
  const headshots = Number(stats.headshots || 0);
  const deepest = Math.min(1.99, player.depth);
  endingStats.innerHTML =
    "<span>TIME<strong>" + formatTime(seconds) + "</strong></span>" +
    "<span>DRAINED<strong>" + kills + "</strong></span>" +
    "<span>HEADSHOTS<strong>" + headshots + "</strong></span>" +
    "<span>ACCURACY<strong>" + (shots ? Math.round(hits / shots * 100) : 0) + "%</strong></span>" +
    "<span>DEEPEST<strong>" + deepest.toFixed(2) + "m</strong></span>";

  if (result === "victory") {
    endingKicker.textContent = "THE LAST POT HAS GONE QUIET";
    endingTitle.textContent = "SERVICE OVER";
    endingCopy.textContent = "The Noodlemancer comes apart one glistening strand at a time. The gate tears open from altar to crown. Sunday dinner is cancelled.";
    audio.win();
  } else if (result === "defeated") {
    endingKicker.textContent = "YOUR FIRMNESS REACHED ZERO";
    endingTitle.textContent = "OVERCOOKED";
    endingCopy.textContent = "The basilica twirls what remains of you around a fork the size of a church steeple.";
    audio.drown();
  } else {
    endingKicker.textContent = "THE SAUCE REACHED YOUR LUNGS";
    endingTitle.textContent = "SUBMERGED";
    endingCopy.textContent = "The basilica keeps filling. Your rifle bubbles once, then joins the floor.";
    audio.drown();
  }
  setTimeout(() => endingScreen.classList.add("active"), result === "victory" ? 620 : 850);
}

function pauseGame() {
  if (phase !== "playing") return;
  phase = "paused";
  player.vx = 0;
  player.vz = 0;
  input.releaseAll?.();
  debugPunchHeld = false;
  combat?.update?.(0, performance.now() / 1000, {
    player,
    phase,
    fireHeld: false,
    firePressed: false,
    punchRequested: false,
    aimHeld: false
  });
  pauseScreen.classList.add("active");
  touchUI.classList.add("hidden");
  publishPhase();
  if (document.pointerLockElement) document.exitPointerLock?.();
}

async function resumeGame() {
  if (phase !== "paused") return;
  void audio.unlock();
  input.releaseAll?.();
  phase = "playing";
  pauseScreen.classList.remove("active");
  if (input.isTouch) touchUI.classList.remove("hidden");
  publishPhase();
  canvas.focus({ preventScroll: true });
  if (!input.isTouch && !AUTOTEST) input.requestPointerLock();
}

function publishPhase() {
  document.body.dataset.phase = phase;
}

function getState() {
  const fillLevels = world?.getFillLevels?.() || {};
  const worldStats = world?.getStats?.() || {};
  const rainStats = spaghettiRain?.getStats?.() || {};
  const cameraStats = cameraSpaghetti?.getStats?.() || {};
  const cinematicStats = cinematicFX?.getStats?.() || {};
  const combatState = combat?.getState?.() || {};
  const combatPlayer = combatState.player || combatState;
  const combatWeapon = combatState.weapon || combatState;
  const combatStats = combatState.stats || {};
  const combatMelee = combatState.melee || combatState.punch || {};
  const renderStats = renderer?.info?.render || {};
  const audioState = audio?.getState?.() || {};
  const inputState = input?.getState?.() || {};
  const finiteState = [
    player.x, player.y, player.z, player.vx, player.vy, player.vz, player.depth, player.distance,
    player.surfaceWetness, player.surfaceFriction, player.surfaceGrip, player.surfaceSlope,
    player.downhillAcceleration, player.lateralSlip, player.slipAmount, player.rampSlipCue, player.surfaceBraking,
    ...Object.values(fillLevels).flatMap((value) => typeof value === "object" ? Object.values(value) : [value])
  ].every(Number.isFinite) && allNumbersFinite(combatState);
  const combatErrors = Array.isArray(combatState.errors) ? combatState.errors : [];
  const health = Number(combatPlayer.health ?? combatState.health ?? 100);
  const sauceArmor = Number(combatPlayer.sauceArmor ?? combatPlayer.armor ?? combatState.sauceArmor ?? 0);
  return {
    phase,
    room: player.room,
    position: { x: player.x, y: player.y + player.currentEyeHeight, z: player.z },
    player: {
      health,
      sauceArmor,
      armor: sauceArmor,
      position: { x: player.x, y: player.y + player.currentEyeHeight, z: player.z },
      feetY: player.y,
      velocity: { x: player.vx, y: player.vy, z: player.vz },
      yaw: player.yaw,
      pitch: player.pitch,
      spaghetti: true
    },
    feetY: player.y,
    velocity: { x: player.vx, y: player.vy, z: player.vz },
    verticalVelocity: player.vy,
    grounded: player.grounded,
    supportId: player.supportId,
    checkpointId: player.checkpointId,
    crouching: player.crouching,
    sliding: player.slideTimer > 0,
    mantling: Boolean(player.mantle),
    airTime: player.airTime,
    yaw: player.yaw,
    pitch: player.pitch,
    depth: player.depth,
    fillSurfaceY: sampleSurfaceYAt(player.x, player.z),
    speed: player.speed,
    momentumSpeed: Math.hypot(player.vx, player.vz),
    speedMultiplier: player.speedMultiplier,
    surfaceWetness: player.surfaceWetness,
    surfaceFriction: player.surfaceFriction,
    surfaceGrip: player.surfaceGrip,
    slipAmount: player.slipAmount,
    rampSlipCue: player.rampSlipCue,
    slipping: player.slipping,
    supportSlope: player.surfaceSlope,
    landingSlip: player.landingSlipTimer,
    surface: {
      id: player.surfaceId,
      kind: player.surfaceKind,
      contact: player.surfaceContact,
      wetness: player.surfaceWetness,
      effectiveWetness: player.effectiveWetness,
      friction: player.surfaceFriction,
      grip: player.surfaceGrip,
      width: player.surfaceWidth,
      edgeRecovery: player.edgeRecovery,
      supportSlope: player.surfaceSlope,
      downhill: {
        x: player.downhillX,
        z: player.downhillZ,
        acceleration: player.downhillAcceleration,
        speed: player.vx * player.downhillX + player.vz * player.downhillZ
      },
      lateralSlip: player.lateralSlip,
      lateralDriftAcceleration: player.lateralDriftAcceleration,
      slipAmount: player.slipAmount,
      rampSlipCue: player.rampSlipCue,
      slipping: player.slipping,
      braking: player.surfaceBraking,
      traction: player.surfaceTraction,
      sprintSlip: player.sprintSlip,
      landingSlip: {
        active: player.landingSlipTimer > 0,
        remaining: player.landingSlipTimer,
        strength: player.landingSlipStrength,
        events: player.landingSlipEvents
      }
    },
    distance: player.distance,
    elapsed,
    fillLevels,
    touchMode: Boolean(input?.isTouch),
    pointerLocked: Boolean(input?.pointerLocked),
    input: inputState,
    audio: audioState,
    wadeEvents: Math.max(0, (audioState.stepEvents || 0) - audioStepBase),
    wetStepEvents: Math.max(0, (audioState.wetStepEvents || 0) - audioWetStepBase),
    collisionOk: !isInsideCollider(player.x, player.y, player.z),
    hazard: {
      source: "rising-spaghetti",
      active: spaghettiHazardActive,
      damageActive: spaghettiDamageActive,
      depthRatio: THREE.MathUtils.clamp(player.depth / player.currentEyeHeight, 0, 1.08),
      tier: depthBandFor(player.depth).toLowerCase(),
      severity: spaghettiHazardSeverity,
      damagePulses: spaghettiDamagePulses,
      totalDamage: spaghettiDamageTotal,
      nextDamageIn: Math.max(0, spaghettiDamageCooldown),
      lastDamageSource
    },
    finiteState,
    renderReady,
    health,
    sauceArmor,
    ammo: Number(combatWeapon.ammo ?? combatState.ammo ?? 0),
    reserve: Number(combatWeapon.reserve ?? combatState.reserve ?? 0),
    reloading: Boolean(combatWeapon.reloading ?? combatState.reloading),
    firing: Boolean(combatWeapon.firing ?? combatState.firing),
    weapon: { ...combatWeapon },
    melee: { ...combatMelee },
    punch: { ...combatMelee },
    enemies: Array.isArray(combatState.enemies) ? combatState.enemies : [],
    livingEnemies: Number(combatState.livingEnemies ?? combatState.enemyCount ?? 0),
    wave: combatState.wave || { index: 1, number: 1, total: 4 },
    waveIndex: Number(combatState.waveIndex ?? combatState.wave?.index ?? 1),
    boss: combatState.boss || null,
    victory: Boolean(combatState.victory),
    defeated: Boolean(combatState.defeated),
    stats: { ...combatStats },
    combat: combatState,
    noodlePhysics: combatState.noodlePhysics || combatState.physics || {},
    environment: {
      location: world?.root?.name || "Basilica Della Marinara",
      style: world?.root?.userData?.architecture?.style || "volumetric-gothic-spaghetti",
      fillMultiplier,
      floodLevel: maximumFill(fillLevels),
      floodRising: phase === "playing" && fillMultiplier > 0 &&
        maximumFill(fillLevels) < Number(world?.worldBounds?.maxY ?? 18) - 0.08,
      clearanceAboveFlood: player.y - maximumFill(fillLevels),
      ...worldStats
    },
    cinematic: { ...cinematicStats },
    visibleStrands: Number(worldStats.visibleStrands || 0) + Number(rainStats.activeStrands || 0) + Number(cameraStats.activeStrands || 0) + Number(combatState.visibleStrands || 0),
    fallingSpaghetti: rainStats,
    cameraContamination: {
      ...cameraStats,
      splatEvents: lensSplatEvents,
      impactEvents: lensImpactEvents,
      nextHitIn: Math.max(0, nextLensHitAt - elapsed)
    },
    drawCalls: Number(renderStats.calls || 0),
    triangles: Number(renderStats.triangles || 0),
    render: {
      drawCalls: Number(renderStats.calls || 0),
      triangles: Number(renderStats.triangles || 0)
    },
    frames: frameCount,
    finite: finiteState,
    errors: [...errors, ...combatErrors]
  };
}

function allNumbersFinite(value, seen = new WeakSet()) {
  if (typeof value === "number") return Number.isFinite(value);
  if (!value || typeof value !== "object") return true;
  if (seen.has(value)) return true;
  seen.add(value);
  return Object.values(value).every((child) => allNumbersFinite(child, seen));
}

function isInsideCollider(x, y, z) {
  return (world?.colliders || []).some((raw) => {
    if (raw.disabled || raw.solid === false) return false;
    const box = normalizeCollider(raw);
    if (!box) return false;
    const closestX = THREE.MathUtils.clamp(x, box.minX, box.maxX);
    const closestZ = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
    if (Math.hypot(x - closestX, z - closestZ) >= PLAYER_RADIUS - 0.005) return false;
    const top = colliderTopAt(raw, closestX, closestZ);
    const bottom = colliderBottomAt(raw, closestX, closestZ);
    return y + player.currentHeight - 0.04 > bottom && y + 0.04 < top - 0.018;
  });
}

function beginAutotest() {
  autotestFrames = 0;
  world.setAllLevels(0.16);
  player.depth = sampleDepthAt(player.x, player.z, player.y);
  autotestInitialFill = maximumFill(world.getFillLevels());
  autotestStart = {
    at: performance.now(),
    x: player.x,
    z: player.z,
    distance: player.distance
  };
  fillMultiplier = 12;
  input.setTestMove(0.32, 1);
}

function updateAutotest() {
  if (!autotestStart || document.body.dataset.autotest === "done") return;
  const duration = autotestFrames * FIXED_STEP * 1000;
  if (duration > 1000 && duration < 1450) input.setTestMove(-0.35, 1);
  if (duration <= 3200) return;

  input.setTestMove(0, 0);
  const state = getState();
  const movedMeters = state.distance - autotestStart.distance;
  const fillDelta = maximumFill(state.fillLevels) - autotestInitialFill;
  const result = {
    ok: state.finiteState &&
      state.collisionOk &&
      movedMeters >= 0.75 &&
      state.wadeEvents >= 2 &&
      fillDelta > 0 &&
      state.visibleStrands > 0 &&
      state.renderReady &&
      state.errors.length === 0,
    phase: state.phase,
    room: state.room,
    frames: autotestFrames,
    finite: state.finiteState,
    movedMeters: Number(movedMeters.toFixed(3)),
    wadeEvents: state.wadeEvents,
    wetStepEvents: state.wetStepEvents,
    fillDelta: Number(fillDelta.toFixed(4)),
    fillLevels: state.fillLevels,
    depth: Number(state.depth.toFixed(3)),
    speedMultiplier: Number(state.speedMultiplier.toFixed(3)),
    position: state.position,
    collisionOk: state.collisionOk,
    visibleStrands: state.visibleStrands,
    drawCalls: state.drawCalls,
    triangles: state.triangles,
    touchMode: state.touchMode,
    audioGraphBuilt: Boolean(audio.context),
    renderReady: state.renderReady,
    errors: state.errors
  };
  document.body.dataset.autotestResult = JSON.stringify(result);
  document.body.dataset.autotest = "done";
}

function maximumFill(levels) {
  const values = Object.values(levels || {}).flatMap((value) =>
    typeof value === "object" && value !== null ? Object.values(value) : [value]
  ).filter(Number.isFinite);
  return values.length ? Math.max(...values) : 0;
}

function formatRoom(value) {
  return String(value || "hall").replaceAll("-", " ").toUpperCase();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}

function smoothstep(min, max, value) {
  const t = THREE.MathUtils.clamp((value - min) / Math.max(0.0001, max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function nextLensRandom() {
  lensRandomState = (lensRandomState + 0x6d2b79f5) >>> 0;
  let value = lensRandomState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

const debugApi = {
  version: "2.0.8",
  getState,
  state: getState,
  inspect: getState,
  selfTest: () => {
    const state = getState();
    const environmentReady = Number(state.environment?.volumetricStrands || 0) > 0 && Number(state.environment?.coverCount || 0) > 0;
    const cinematicReady = Number(state.cinematic?.ambientSteam || 0) > 0 && Number(state.cinematic?.ambientEmbers || 0) > 0;
    return {
      ok: state.finiteState && state.collisionOk && state.renderReady && environmentReady && cinematicReady && state.errors.length === 0,
      finite: state.finiteState,
      collision: state.collisionOk,
      rendered: state.renderReady,
      combatReady: Boolean(combat),
      environmentReady,
      cinematicReady,
      enemies: state.enemies.length,
      visibleStrands: state.visibleStrands,
      errors: state.errors
    };
  },
  start: () => startGame(false),
  restart: restartGame,
  pause: pauseGame,
  resume: resumeGame,
  setMove: (x, y) => input?.setTestMove(Number(x) || 0, Number(y) || 0),
  setFire: (pressed) => input?.setTestFire?.(Boolean(pressed)),
  setAim: (pressed) => input?.setTestAim?.(Boolean(pressed)),
  setPunch: (pressed) => {
    const next = Boolean(pressed);
    if (next && !debugPunchHeld) input?.requestPunch?.();
    if (!next) input?.consumePunch?.();
    debugPunchHeld = next;
    return { held: debugPunchHeld };
  },
  punch: () => combat?.punch?.() ?? false,
  releaseInput: () => {
    debugPunchHeld = false;
    return input?.releaseAll?.() ?? null;
  },
  setAmmo: (ammo, reserve) => combat?.setAmmo?.(ammo, reserve) ?? null,
  traceWorld: (from, to) => traceCombatSegment(from || {}, to || {}),
  isPositionBlocked: (position, radius = 0.3, height = 1.8) => isCombatPositionBlocked(position || {}, radius, height),
  reload: () => combat?.beginReload?.("debug") ?? false,
  throwSauce: (config = {}) => combat?.throwSauceBomb?.(config) ?? false,
  spawnEnemy: (config = "twirler", position = null, stationary = false) => {
    if (config && typeof config === "object") {
      return combat?.spawnEnemy?.(config) ?? null;
    }
    return combat?.spawnEnemy?.(config, position, stationary) ?? null;
  },
  aimAtEnemy: (id = null) => {
    const target = combat?.aimAtEnemy?.(id);
    const position = target?.position || target;
    if (position && Number.isFinite(position.x) && Number.isFinite(position.z)) {
      const dx = position.x - player.x;
      const dy = Number(position.y || 0) - (player.y + player.currentEyeHeight);
      const dz = position.z - player.z;
      player.yaw = Math.atan2(-dx, -dz);
      player.pitch = THREE.MathUtils.clamp(Math.atan2(dy, Math.max(0.001, Math.hypot(dx, dz))), -MAX_PITCH, MAX_PITCH);
      camera?.position?.set(player.x, player.y + player.currentEyeHeight, player.z);
      camera?.rotation?.set(player.pitch, player.yaw, 0, "YXZ");
    }
    return target || null;
  },
  damagePlayer: (amount = 1) => combat?.damagePlayer?.(Number(amount) || 0, "debug") ?? false,
  clearThreats: () => combat?.clearEnemies?.() ?? false,
  forceWave: (index = 1) => combat?.forceWave?.(Number(index) || 1) ?? false,
  unlockExit: () => {
    combat?.win?.();
    return getState();
  },
  win: () => {
    const result = combat?.win?.();
    finish("victory");
    return result ?? true;
  },
  lose: () => {
    const damaged = combat?.damagePlayer?.(9999, "debug");
    if (!damaged) finish("defeated");
    return getState();
  },
  setPosition: (x, z, y = player.y) => {
    if (Number.isFinite(x)) player.x = x;
    if (Number.isFinite(z)) player.z = z;
    if (Number.isFinite(y)) player.y = y;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    player.mantle = null;
    player.checkpointId = "spawn";
    player.jumpBuffer = 0;
    player.jumpHeld = false;
    player.crouching = false;
    player.slideTimer = 0;
    player.landingSlipTimer = 0;
    player.landingSlipStrength = 0;
    player.slipAmount = 0;
    player.rampSlipCue = 0;
    player.slipping = false;
    player.currentHeight = PLAYER_HEIGHT;
    player.currentEyeHeight = BASE_EYE_HEIGHT;
    debugJumpHeld = false;
    debugJumpQueued = false;
    const support = getSupportAt(player.x, player.z, player.y, STEP_HEIGHT, GROUND_SNAP + 0.1);
    player.grounded = Boolean(support && Math.abs(support.y - player.y) <= GROUND_SNAP + 0.1);
    if (player.grounded) {
      player.y = support.y;
      player.supportId = support.id;
    } else {
      player.supportId = null;
    }
    for (let iteration = 0; iteration < 5; iteration += 1) resolveCollisions("both");
    refreshSurfaceContact(player.grounded ? getSupportAt(player.x, player.z, player.y, 0.09, GROUND_SNAP + 0.1) : null);
    camera?.position?.set(player.x, player.y + player.currentEyeHeight, player.z);
    return getState();
  },
  setVelocity: (x = player.vx, z = player.vz, y = player.vy) => {
    if (Number.isFinite(x)) player.vx = THREE.MathUtils.clamp(x, -MAX_SURFACE_SPEED, MAX_SURFACE_SPEED);
    if (Number.isFinite(z)) player.vz = THREE.MathUtils.clamp(z, -MAX_SURFACE_SPEED, MAX_SURFACE_SPEED);
    if (Number.isFinite(y)) player.vy = THREE.MathUtils.clamp(y, -24, JUMP_VELOCITY);
    return getState();
  },
  setJump: (pressed) => {
    const next = Boolean(pressed);
    if (next && !debugJumpHeld) debugJumpQueued = true;
    debugJumpHeld = next;
    return { held: debugJumpHeld, queued: debugJumpQueued };
  },
  teleportToCheckpoint: (id) => {
    const checkpoint = (world?.checkpoints || []).find((entry) => entry.id === id);
    if (!checkpoint) return null;
    player.checkpointId = checkpoint.id;
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    player.z = checkpoint.z;
    player.yaw = Number.isFinite(checkpoint.yaw) ? checkpoint.yaw : player.yaw;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    player.grounded = true;
    player.supportId = checkpoint.supportId || checkpoint.id;
    player.mantle = null;
    player.jumpBuffer = 0;
    player.jumpHeld = false;
    player.crouching = false;
    player.slideTimer = 0;
    player.landingSlipTimer = 0;
    player.landingSlipStrength = 0;
    player.slipAmount = 0;
    player.rampSlipCue = 0;
    player.slipping = false;
    player.currentHeight = PLAYER_HEIGHT;
    player.currentEyeHeight = BASE_EYE_HEIGHT;
    debugJumpHeld = false;
    debugJumpQueued = false;
    refreshSurfaceContact(getSupportAt(player.x, player.z, player.y, 0.09, GROUND_SNAP + 0.1));
    camera?.position?.set(player.x, player.y + BASE_EYE_HEIGHT, player.z);
    return getState();
  },
  getRoute: () => world?.route || world?.checkpoints || [],
  getTraversalData: () => world?.getTraversalData?.() || { platforms: [], windowPassages: [], routes: [] },
  getRunoffData: () => world?.getStairRunoffData?.() || {
    animationTime: 0,
    textureOffset: 0,
    flowDirection: "downhill",
    ribbonCount: 0,
    noodleSegmentCount: 0,
    ramps: []
  },
  setLook: (yaw, pitch = player.pitch) => {
    if (Number.isFinite(yaw)) player.yaw = yaw;
    if (Number.isFinite(pitch)) player.pitch = THREE.MathUtils.clamp(pitch, -MAX_PITCH, MAX_PITCH);
    return getState();
  },
  setFill: (value) => {
    world?.setAllLevels?.(THREE.MathUtils.clamp(Number(value) || 0, 0, 25.5));
    return getState();
  },
  setFillMultiplier: (value) => {
    fillMultiplier = THREE.MathUtils.clamp(Number(value) || 0, 0, 100);
    return fillMultiplier;
  },
  checkEnding: () => {
    checkEnding(true);
    return getState();
  },
  respawn: () => {
    respawnAtCheckpoint();
    return getState();
  },
  splatLens: (config = {}) => {
    splatLens({
      x: Number.isFinite(config.x) ? config.x : 0.5,
      y: Number.isFinite(config.y) ? config.y : 0.3,
      intensity: Number.isFinite(config.intensity) ? config.intensity : 0.9,
      wetness: Number.isFinite(config.wetness) ? config.wetness : 1,
      sauce: Number.isFinite(config.sauce) ? config.sauce : 0.42,
      directionX: Number.isFinite(config.directionX) ? config.directionX : 0.15,
      directionY: Number.isFinite(config.directionY) ? config.directionY : 1
    }, "debug");
    return getState();
  },
  clearLens: () => {
    cameraSpaghetti?.clear?.();
    return getState();
  },
  world: () => world,
  rain: () => spaghettiRain,
  lens: () => cameraSpaghetti
};

debugApi.setPlayerPosition = debugApi.setPosition;
debugApi.setPlayerVelocity = debugApi.setVelocity;
debugApi.applyNoodleImpulse = (...args) => combat?.applyNoodleImpulse?.(...args) ?? false;
window.__pastaMortale = debugApi;
window.__spaghettiFPS = debugApi;
window.__PASTA_MORTALE__ = debugApi;
window.__spaghettiHouse = debugApi;
window.__SPAGHETTI_HOUSE__ = debugApi;
