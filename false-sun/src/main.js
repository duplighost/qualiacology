import { BUILD_ID, FIXED_DT, MAX_CATCHUP_STEPS, PLAYER, SAVE_KEY } from './config.js';
import { NIGHT_NAME_TOTAL, ROOM_ORDER, UPGRADES, getRoom, validateContent } from './content.js';
import {
  EMPTY_INPUT,
  createGame,
  drainEvents,
  getSnapshot,
  loadRoom,
  respawn,
  restoreGame,
  runSmoke,
  serializeGame,
  setScenario,
  startGame,
  stateHash,
  stepFrames,
  stepGame,
} from './engine.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';

const query = new URLSearchParams(location.search);
const autotest = query.get('autotest') === '1';
const qaMode = autotest || query.get('qa') === '1';
const forceTouch = query.get('touch') === '1';
const fresh = query.get('fresh') === '1';
const seed = Number(query.get('seed') ?? 1337) || 1337;
const requestedRoom = query.get('room');

const byId = (id) => document.getElementById(id);
const canvas = byId('game');
const body = document.body;
const root = document.documentElement;

body.dataset.buildId = BUILD_ID;
root.dataset.buildId = BUILD_ID;

const dom = {
  start: byId('start-overlay'),
  startButton: byId('start-button'),
  startStatus: byId('start-status'),
  pause: byId('pause-overlay'),
  resume: byId('resume-button'),
  openMap: byId('open-map-button'),
  settingsButton: byId('open-settings-button'),
  settings: byId('settings-panel'),
  restartRoom: byId('restart-room-button'),
  returnTitle: byId('return-title-button'),
  map: byId('map-overlay'),
  mapSurface: byId('map-canvas'),
  closeMap: byId('close-map-button'),
  upgrade: byId('upgrade-overlay'),
  upgradeTitle: byId('upgrade-title'),
  upgradeDescription: byId('upgrade-description'),
  upgradeInstruction: byId('upgrade-instruction'),
  upgradeContinue: byId('upgrade-continue-button'),
  ending: byId('ending-overlay'),
  endingKicker: byId('ending-kicker'),
  endingTitle: byId('ending-title'),
  endingCopy: byId('ending-copy'),
  endingTime: byId('ending-time'),
  endingGlyphs: byId('ending-glyphs'),
  endingFlow: byId('ending-flow'),
  endingRestart: byId('ending-restart-button'),
  areaName: byId('area-name'),
  objective: byId('objective'),
  healthMeter: byId('health-meter'),
  healthFill: byId('health-fill'),
  healthValue: byId('health-value'),
  heatMeter: byId('heat-meter'),
  heatFill: byId('heat-fill'),
  heatValue: byId('heat-value'),
  dashMeter: byId('dash-meter'),
  dashFill: byId('dash-fill'),
  flowMeter: byId('flow-meter'),
  flowFill: byId('flow-fill'),
  flowValue: byId('flow-value'),
  bossHud: byId('boss-hud'),
  bossTitle: byId('boss-title'),
  bossMeter: byId('boss-meter'),
  bossFill: byId('boss-fill'),
  bossPhase: byId('boss-phase'),
  pinHint: byId('pin-hint'),
  touchPin: byId('touch-pin'),
  toast: byId('toast'),
  toastTitle: byId('toast-title'),
  toastCopy: byId('toast-copy'),
  subtitle: byId('subtitle'),
  qaResult: byId('qa-result'),
  bootError: byId('boot-error'),
  bootErrorMessage: byId('boot-error-message'),
  volume: byId('master-volume'),
  volumeValue: byId('master-volume-value'),
  reducedMotion: byId('reduced-motion'),
  highContrast: byId('high-contrast'),
  screenShake: byId('screen-shake'),
};

function show(element, visible) {
  if (!element) return;
  element.hidden = !visible;
  element.classList.toggle('is-visible', visible);
}

function safeReadSave() {
  if (fresh) return null;
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  } catch {
    return null;
  }
}

function safeWriteSave() {
  if (qaMode || fresh || requestedRoom) return false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeGame(state)));
    return true;
  } catch {
    return false;
  }
}

function safeClearSave() {
  if (qaMode || fresh || requestedRoom) return;
  try { localStorage.removeItem(SAVE_KEY); } catch { /* private storage can reject writes */ }
}

const saved = safeReadSave();
const initialRoom = requestedRoom && getRoom(requestedRoom) ? requestedRoom : saved?.roomId ?? ROOM_ORDER[0];
let state = createGame({ seed, roomId: initialRoom, started: autotest });
if (saved && !requestedRoom) restoreGame(state, saved);
if (!autotest) state.mode = 'title';

const settings = {
  reducedMotion: query.get('reduced') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches,
  edgeEmphasis: query.get('edges') === '1',
  screenShake: query.get('shake') !== '0',
  volume: 0.72,
};
dom.reducedMotion.checked = settings.reducedMotion;
dom.highContrast.checked = settings.edgeEmphasis;
dom.screenShake.checked = settings.screenShake;
dom.volume.value = String(Math.round(settings.volume * 100));
dom.volumeValue.textContent = `${Math.round(settings.volume * 100)}%`;

let fatal = null;
let audio;
let renderer;
let input;
let rafId = 0;
let accumulator = 0;
let previousTime = performance.now();
let toastTimer = 0;
let subtitleTimer = 0;
let deadTimer = 0;
let mapWasPaused = false;
let pendingUpgrade = null;
const frameTimes = [];
let quality = query.get('fx') === 'low' ? 'low' : 'high';

function unlockAudio() {
  return audio?.unlock?.();
}

function boot() {
  const contentValidation = validateContent();
  if (!contentValidation.ok) throw new Error(`Content validation failed: ${contentValidation.errors.join('; ')}`);
  audio = createAudio();
  renderer = createRenderer(canvas, { ...settings, quality });
  input = createInput(canvas, { forceTouch, onFirstGesture: unlockAudio });
  input.setEnabled(autotest);
  body.dataset.gameReady = 'true';
  body.dataset.quality = quality;
  updateMap();
  updateHud(true);
  bindUi();
  previousTime = performance.now();
  rafId = requestAnimationFrame(frame);
  if (autotest) runAutotest();
}

function begin() {
  unlockAudio();
  show(dom.start, false);
  if (state.completed) {
    showEnding();
    return;
  }
  startGame(state);
  input.setEnabled(true);
  canvas.focus({ preventScroll: true });
  emitSubtitle(state.room.inscription, 3.8);
  audio.setDistrict?.(state.room.district);
  previousTime = performance.now();
}

function returnToTitle({ reset = false } = {}) {
  if (reset) {
    safeClearSave();
    state = createGame({ seed, roomId: ROOM_ORDER[0] });
  }
  state.mode = 'title';
  state.paused = false;
  input.clear();
  input.setEnabled(false);
  show(dom.pause, false);
  show(dom.map, false);
  show(dom.upgrade, false);
  show(dom.ending, false);
  show(dom.start, true);
  dom.startStatus.textContent = saved && !reset ? 'Your shadow remembers. Continue when ready.' : 'Sound wakes on your first input.';
}

function togglePause(force) {
  if (state.mode === 'title' || state.mode === 'upgrade' || state.mode === 'dead' || state.completed) return;
  state.paused = typeof force === 'boolean' ? force : !state.paused;
  // Keep the input reader alive while paused so Escape/Menu can unpause on
  // keyboard and gamepad. Simulation remains frozen by state.paused.
  input.setEnabled(true);
  if (state.paused) audio.suspend?.(); else audio.resume?.();
  show(dom.pause, state.paused);
  if (!state.paused) canvas.focus({ preventScroll: true });
}

function toggleMap(force) {
  const visible = typeof force === 'boolean' ? force : dom.map.hidden;
  if (visible) {
    mapWasPaused = state.paused;
    state.paused = true;
    input.setEnabled(false);
    updateMap();
  } else {
    state.paused = mapWasPaused;
    input.setEnabled(!state.paused);
  }
  show(dom.map, visible);
}

function bindUi() {
  dom.startButton.addEventListener('click', begin);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' && state.mode === 'title') begin();
    if (event.code === 'KeyM' && state.mode === 'playing') toggleMap();
    if (event.code === 'Escape' && !dom.map.hidden) {
      event.preventDefault();
      toggleMap(false);
    }
  });
  dom.resume.addEventListener('click', () => togglePause(false));
  dom.openMap.addEventListener('click', () => toggleMap(true));
  dom.settingsButton.addEventListener('click', () => {
    const open = dom.settings.hidden;
    dom.settings.hidden = !open;
    dom.settingsButton.setAttribute('aria-expanded', String(open));
  });
  dom.restartRoom.addEventListener('click', () => {
    loadRoom(state, state.roomId);
    togglePause(false);
  });
  dom.returnTitle.addEventListener('click', () => returnToTitle());
  dom.closeMap.addEventListener('click', () => toggleMap(false));
  dom.upgradeContinue.addEventListener('click', closeUpgrade);
  dom.endingRestart.addEventListener('click', () => returnToTitle({ reset: true }));

  dom.volume.addEventListener('input', () => {
    settings.volume = Number(dom.volume.value) / 100;
    dom.volumeValue.textContent = `${dom.volume.value}%`;
    audio.update?.({ volume: settings.volume, district: state.room.district, flow: state.player.flow, heat: state.player.heat, paused: state.paused });
  });
  dom.reducedMotion.addEventListener('change', () => {
    settings.reducedMotion = dom.reducedMotion.checked;
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    renderer.setOptions({ reducedMotion: settings.reducedMotion });
  });
  dom.highContrast.addEventListener('change', () => {
    settings.edgeEmphasis = dom.highContrast.checked;
    root.classList.toggle('edge-emphasis', settings.edgeEmphasis);
    renderer.setOptions({ edgeEmphasis: settings.edgeEmphasis });
  });
  dom.screenShake.addEventListener('change', () => {
    settings.screenShake = dom.screenShake.checked;
    renderer.setOptions({ screenShake: settings.screenShake });
  });
  window.addEventListener('resize', () => renderer.resize());
}

function setMeter(meter, fill, value, max, label) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  fill?.style.setProperty('--value', String(ratio));
  if (meter) {
    meter.setAttribute('aria-valuemax', String(max));
    meter.setAttribute('aria-valuenow', String(Math.round(value)));
    if (label) meter.setAttribute('aria-valuetext', label);
  }
}

function updateHud(force = false) {
  const player = state.player;
  dom.areaName.textContent = state.room.name.toUpperCase();
  const bossAlive = state.enemies.some((enemy) => enemy.boss && !enemy.dead);
  const receiversPending = state.receivers.some((receiver) => !receiver.active);
  const enemiesAlive = state.enemies.some((enemy) => !enemy.dead);
  const bossAlignment = state.room.boss?.alignment;
  const bossShielded = bossAlive && bossAlignment && !state.roomState?.activated?.includes(bossAlignment);
  dom.objective.textContent = bossShielded
    ? 'Turn each named shadow onto its crescent.'
    : bossAlive
    ? 'Sever the shadow. Survive the pattern.'
    : receiversPending
      ? 'Turn an edged shadow onto every crescent.'
      : enemiesAlive
        ? 'Convert danger. Cut the thing that cast it.'
        : 'Find what the walls are keeping.';
  dom.healthValue.textContent = `${player.hp} / ${player.maxHp}`;
  setMeter(dom.healthMeter, dom.healthFill, player.hp, player.maxHp, `${player.hp} of ${player.maxHp} vital light`);
  const heat = Math.round(player.heat * 100);
  dom.heatValue.textContent = player.overheated ? `${heat}% — LOCKED` : `${heat}%`;
  setMeter(dom.heatMeter, dom.heatFill, heat, 100, player.overheated ? `Overheated at ${heat} percent` : `${heat} percent heat`);
  dom.heatMeter.classList.toggle('is-overheated', player.overheated);
  const recharge = player.dashCharges < player.maxDashCharges
    ? Math.max(0, 1 - player.dashRecharge / PLAYER.dashRecharge)
    : 0;
  const dashValue = ((player.dashCharges + recharge) / player.maxDashCharges) * 100;
  setMeter(dom.dashMeter, dom.dashFill, dashValue, 100, `${player.dashCharges} of ${player.maxDashCharges} dash charges`);
  const flow = Math.round(player.flow * 100);
  setMeter(dom.flowMeter, dom.flowFill, flow, 100, `${flow} percent flow`);
  dom.flowValue.textContent = `×${(1 + player.flow * 2).toFixed(1)}`;
  const pinUnlocked = player.upgrades.includes('pin') || state.room.boss?.trialUpgrade === 'pin';
  dom.pinHint.classList.toggle('is-locked', !pinUnlocked);
  dom.pinHint.classList.toggle('is-ready', pinUnlocked);
  dom.pinHint.setAttribute('aria-disabled', String(!pinUnlocked));
  dom.touchPin.disabled = !pinUnlocked;

  const boss = state.enemies.find((enemy) => enemy.boss && !enemy.dead);
  show(dom.bossHud, Boolean(boss));
  if (boss) {
    dom.bossTitle.textContent = boss.name;
    const bossHealth = Math.max(0, boss.hp / boss.maxHp);
    dom.bossFill.style.setProperty('--value', String(bossHealth));
    dom.bossMeter.setAttribute('aria-valuenow', String(Math.round(bossHealth * 100)));
    dom.bossPhase.textContent = `PHASE ${boss.phase} / ${boss.phaseCount} · ${bossShielded ? 'SHIELDED' : boss.cutOpen > 0 ? 'SEVERED' : 'CASTING'}`;
  }
  if (force) body.dataset.room = state.roomId;
}

function updateMap() {
  if (!dom.mapSurface) return;
  const positions = {
    'gilt-garden': [12, 52], bellworks: [32, 24], 'drowned-archive': [35, 76],
    'glass-orchard': [61, 52], 'false-noon': [84, 52],
  };
  const roomCounts = {};
  dom.mapSurface.innerHTML = '';
  for (const roomId of ROOM_ORDER) {
    const room = getRoom(roomId);
    const index = roomCounts[room.district] ?? 0;
    roomCounts[room.district] = index + 1;
    const [baseX, baseY] = positions[room.district];
    const angle = (index / 4) * Math.PI * 2 - Math.PI / 2;
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'map-node';
    node.style.left = `${baseX + Math.cos(angle) * 8}%`;
    node.style.top = `${baseY + Math.sin(angle) * 15}%`;
    node.dataset.room = roomId;
    const discovered = state.world.discovered.includes(roomId) || qaMode;
    node.classList.toggle('is-discovered', discovered);
    node.classList.toggle('is-current', roomId === state.roomId);
    node.classList.toggle('is-boss', Boolean(room.boss));
    node.textContent = discovered ? room.name : 'UNREAD';
    node.setAttribute('aria-label', discovered ? room.name : 'Undiscovered room');
    node.disabled = !qaMode;
    if (qaMode) node.addEventListener('click', () => {
      loadRoom(state, roomId);
      toggleMap(false);
    });
    dom.mapSurface.appendChild(node);
  }
}

function showToast(title, copy, seconds = 2.2) {
  dom.toastTitle.textContent = title ?? '';
  dom.toastCopy.textContent = copy ?? '';
  show(dom.toast, true);
  toastTimer = seconds;
}

function emitSubtitle(text, seconds = 2.8) {
  if (!text) return;
  dom.subtitle.textContent = text;
  show(dom.subtitle, true);
  subtitleTimer = seconds;
}

function showUpgrade(event) {
  pendingUpgrade = event.id;
  const upgrade = UPGRADES[event.id] ?? event;
  dom.upgradeTitle.textContent = String(upgrade.name ?? event.id).toUpperCase();
  dom.upgradeDescription.textContent = upgrade.description ?? 'The light learns another way to lie.';
  dom.upgradeInstruction.innerHTML = event.id === 'pin' ? '<kbd>E</kbd> or <kbd>RMB</kbd>' : '<kbd>SPACE</kbd> cut to use it';
  state.mode = 'upgrade';
  input.setEnabled(false);
  show(dom.upgrade, true);
  safeWriteSave();
}

function closeUpgrade() {
  show(dom.upgrade, false);
  pendingUpgrade = null;
  state.mode = 'playing';
  input.setEnabled(true);
  canvas.focus({ preventScroll: true });
}

function showEnding() {
  state.completed = true;
  state.trueEnding = state.player.nightNames >= NIGHT_NAME_TOTAL;
  state.mode = 'ending';
  input.setEnabled(false);
  dom.endingTime.textContent = formatTime(state.world.playTime);
  dom.endingGlyphs.textContent = `${state.player.nightNames} / ${NIGHT_NAME_TOTAL}`;
  dom.endingFlow.textContent = `×${(1 + state.player.bestFlow * 2).toFixed(1)}`;
  if (state.trueEnding) {
    dom.endingKicker.textContent = 'EVERY SHADOW KNEW THE SAME WORD';
    dom.endingTitle.textContent = 'A TRUE NOON';
    dom.endingCopy.textContent = 'You did not destroy the dark. You gave the sun a shadow, and the prison lost the difference between a wall and a door.';
  } else {
    dom.endingKicker.textContent = 'THE CELL OPENS ABOVE YOU';
    dom.endingTitle.textContent = 'AN OUTSIDE, FOR NOW';
    dom.endingCopy.textContent = 'The sky opens. The names you did not read keep moving under the floor. The False Sun is lighter in your hands.';
  }
  safeWriteSave();
  show(dom.ending, true);
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function processEvents() {
  for (const event of drainEvents(state)) {
    if (event.type === 'dash') audio.sfx?.('dash', event.shaded ? 1 : 0.7);
    else if (event.type === 'shadow-cut') audio.sfx?.('cut', Math.min(1, event.count / 3));
    else if (event.type === 'enemy-hit') audio.sfx?.('hit', event.kind === 'cut' ? 1 : 0.45);
    else if (event.type === 'enemy-killed') audio.sfx?.(event.boss ? 'boss' : 'kill', event.boss ? 1 : 0.6);
    else if (event.type === 'player-hit') audio.sfx?.('hurt', 1);
    else if (event.type === 'overheated') audio.sfx?.('overheat', 1);
    else if (event.type === 'cooled') audio.sfx?.('ready', 0.5);
    else if (event.type === 'dash-ready') audio.sfx?.('ready', 0.35);
    else if (event.type === 'bullet-converted') audio.sfx?.('convert', 0.65);
    else if (event.type === 'attack-interrupted') audio.sfx?.('convert', 1);
    else if (event.type === 'shield-hit') audio.sfx?.('locked', 0.45);
    else if (event.type === 'split-noon') {
      audio.sfx?.('alignment', 1);
      showToast('THE SUN REMEMBERS A TWIN', 'For a few seconds, every cut lands harder.', 2.5);
    }
    else if (event.type === 'sun-pinned' || event.type === 'sun-recalled') audio.sfx?.('pin', 0.8);
    else if (event.type === 'wall-broken') {
      audio.sfx?.('break', 1);
      showToast(event.title, event.copy, 2.6);
      safeWriteSave();
    } else if (event.type === 'alignment') {
      audio.sfx?.('alignment', 1);
      showToast(event.title, event.copy, 2.8);
      safeWriteSave();
    } else if (event.type === 'pickup') {
      audio.sfx?.('pickup', event.secret ? 1 : 0.55);
      safeWriteSave();
      if (event.kind === 'ending-key') showEnding();
    } else if (event.type === 'upgrade') {
      audio.sfx?.('upgrade', 1);
      showUpgrade(event);
    } else if (event.type === 'room-enter') {
      audio.setDistrict?.(event.district);
      body.dataset.room = event.roomId;
      emitSubtitle(event.inscription, 3.3);
      updateMap();
      safeWriteSave();
    } else if (event.type === 'boss-phase') {
      audio.sfx?.('phase', 1);
      showToast('THE GUARDIAN CHANGES ITS MIND', `Phase ${event.phase}.`, 1.6);
    } else if (event.type === 'boss-defeated') {
      safeWriteSave();
      if (event.id === 'boss-fn-other-noon') {
        showToast('THE SKY WAITS AT THE CENTER', 'Take the last step when you are ready.', 3.2);
      }
    } else if (event.type === 'death') {
      audio.sfx?.('death', 1);
      showToast('THE SHADOW KEEPS YOUR PLACE', 'Stand up. The room remembers what opened.', 1.25);
      deadTimer = 1.15;
      safeWriteSave();
    } else if (event.type === 'gate-locked') {
      if (state.tick % 90 < 2) audio.sfx?.('locked', 0.35);
    }
  }
}

function updateTimers(delta) {
  if (toastTimer > 0) {
    toastTimer -= delta;
    if (toastTimer <= 0) show(dom.toast, false);
  }
  if (subtitleTimer > 0) {
    subtitleTimer -= delta;
    if (subtitleTimer <= 0) show(dom.subtitle, false);
  }
  if (state.mode === 'dead') {
    deadTimer -= delta;
    if (deadTimer <= 0) {
      respawn(state);
      input.setEnabled(true);
    }
  }
}

function updatePerformance(frameMs) {
  frameTimes.push(frameMs);
  if (frameTimes.length > 360) frameTimes.shift();
  if (quality === 'high' && frameTimes.length === 360) {
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const drawMs = renderer.getStats().drawMs;
    if (p95 > 32 && drawMs > 12) {
      quality = 'low';
      renderer.setOptions({ quality: 'low' });
      body.dataset.quality = 'low';
      showToast('THE LIGHT TRIMS ITS HALO', 'Gameplay stays sharp; expensive glow has been reduced.', 2.8);
    }
  }
}

function frame(now) {
  const rawDelta = Math.min(0.1, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;
  updateTimers(rawDelta);
  accumulator += rawDelta;
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < MAX_CATCHUP_STEPS) {
    const frameInput = input.getFrame();
    if (frameInput.pausePressed && state.mode === 'playing') {
      togglePause(!state.paused);
    } else {
      stepGame(state, { ...frameInput, pausePressed: false });
    }
    input.consumePressed();
    accumulator -= FIXED_DT;
    steps += 1;
  }
  if (steps === MAX_CATCHUP_STEPS) accumulator = 0;
  processEvents();
  updateHud();
  audio.setFlow?.(state.player.flow);
  audio.update?.({
    district: state.room.district,
    flow: state.player.flow,
    heat: state.player.heat,
    paused: state.paused || state.mode !== 'playing',
    volume: settings.volume,
  });
  renderer.render(state, accumulator / FIXED_DT);
  const playerScreen = renderer.worldToClient(state.player.x, state.player.y);
  input.setAimOrigin(playerScreen.x, playerScreen.y);
  updatePerformance(rawDelta * 1000);
  rafId = requestAnimationFrame(frame);
}

function qaGuard() {
  if (!qaMode) throw new Error('Mutation helpers require ?qa=1 or ?autotest=1');
}

function makeQaApi() {
  const api = {
    ready: true,
    fatal: null,
    buildId: BUILD_ID,
    snapshot: () => getSnapshot(state),
    getSnapshot: () => getSnapshot(state),
    stateHash: () => stateHash(state),
    stepFrames: (count, frameInput = EMPTY_INPUT) => {
      qaGuard();
      stepFrames(state, count, frameInput);
      processEvents();
      updateHud();
      renderer.render(state, 1);
      return getSnapshot(state);
    },
    runSmoke: () => runSmoke(seed),
    setScenario: (name) => {
      qaGuard();
      setScenario(state, name);
      updateHud(true);
      renderer.render(state, 1);
      return getSnapshot(state);
    },
    scenario: (name) => {
      qaGuard();
      setScenario(state, name);
      return getSnapshot(state);
    },
    teleport: (x, y) => {
      qaGuard();
      state.player.x = Number(x);
      state.player.y = Number(y);
      state.player.previousX = state.player.x;
      state.player.previousY = state.player.y;
      return getSnapshot(state);
    },
    loadRoom: (roomId) => {
      qaGuard();
      loadRoom(state, roomId);
      return getSnapshot(state);
    },
    grant: (upgrade) => {
      qaGuard();
      if (!state.player.upgrades.includes(upgrade)) state.player.upgrades.push(upgrade);
      return getSnapshot(state);
    },
    spawnStress: () => {
      qaGuard();
      setScenario(state, 'stress');
      return getSnapshot(state);
    },
    renderer: () => renderer.getStats(),
    screenPoint: (x, y) => renderer.worldToClient(Number(x), Number(y)),
    setRenderOptions: (options) => {
      qaGuard();
      renderer.setOptions(options ?? {});
      renderer.render(state, 1);
      return renderer.getStats();
    },
    save: () => serializeGame(state),
    restore: (payload) => {
      qaGuard();
      return restoreGame(state, payload);
    },
    restart: () => {
      qaGuard();
      state = createGame({ seed, roomId: ROOM_ORDER[0], started: true });
      return getSnapshot(state);
    },
  };
  return Object.freeze(api);
}

function runAutotest() {
  body.dataset.qaStatus = 'running';
  try {
    const result = runSmoke(seed);
    body.dataset.qaStatus = result.passed ? 'passed' : 'failed';
    body.dataset.qaResult = JSON.stringify(result);
    dom.qaResult.textContent = JSON.stringify(result);
    dom.qaResult.hidden = false;
  } catch (error) {
    const result = { passed: false, error: String(error?.stack ?? error) };
    body.dataset.qaStatus = 'failed';
    body.dataset.qaResult = JSON.stringify(result);
    dom.qaResult.textContent = JSON.stringify(result);
    dom.qaResult.hidden = false;
  }
}

try {
  boot();
  window.__FALSE_SUN__ = makeQaApi();
} catch (error) {
  fatal = String(error?.stack ?? error);
  body.dataset.gameReady = 'false';
  body.dataset.qaStatus = 'failed';
  body.dataset.qaResult = JSON.stringify({ passed: false, error: fatal });
  dom.bootErrorMessage.textContent = fatal;
  show(dom.bootError, true);
  window.__FALSE_SUN__ = Object.freeze({ ready: false, fatal, buildId: BUILD_ID });
  console.error(error);
}

window.addEventListener('beforeunload', () => {
  safeWriteSave();
  cancelAnimationFrame(rafId);
  input?.destroy?.();
  audio?.destroy?.();
  renderer?.destroy?.();
});
