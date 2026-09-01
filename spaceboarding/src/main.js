import { AudioDirector } from './audio.js';
import { BUILD_ID, COURSE, GAME_TITLE, segmentLength } from './content.js';
import { InputManager } from './input.js';
import { RaceRenderer } from './renderer.js';
import { preloadBakedScoriaEnvironmentData } from './procedural-art.js';
import { preloadBakedStaticScoriaSurfacePackage } from './static-scoria-package.js';
import { chooseInitialQuality } from './quality.js';
import {
  FIXED_STEP,
  createRaceState,
  currentSegment,
  getMorphState,
  getSegmentFraction,
  normalizeInput,
  raceSnapshot,
  runDeterministicSmoke,
  startRace,
  stateHash,
  stepRace,
} from './sim.js';

const params = new URLSearchParams(location.search);
const body = document.body;
const canvas = document.querySelector('#game');
const elements = {
  startScreen: document.querySelector('#start-screen'),
  start: document.querySelector('#start'),
  pauseScreen: document.querySelector('#pause-screen'),
  resume: document.querySelector('#resume'),
  finishScreen: document.querySelector('#finish-screen'),
  restart: document.querySelector('#restart'),
  finishPlace: document.querySelector('#finish-place'),
  finishTime: document.querySelector('#finish-time'),
  finishKicker: document.querySelector('#finish-kicker'),
  worldCount: document.querySelector('#world-count'),
  worldName: document.querySelector('#world-name'),
  position: document.querySelector('#position'),
  speed: document.querySelector('#speed'),
  trickMove: document.querySelector('#trick-move'),
  trickChain: document.querySelector('#trick-chain'),
  trickScore: document.querySelector('#trick-score'),
  trickMultiplier: document.querySelector('#trick-multiplier'),
  stageCard: document.querySelector('#stage-card'),
  stageIndex: document.querySelector('#stage-index'),
  stageName: document.querySelector('#stage-name'),
  stageEpithet: document.querySelector('#stage-epithet'),
  mute: document.querySelector('#mute'),
  announcer: document.querySelector('#announcer'),
  autotest: document.querySelector('#autotest-result'),
  fatal: document.querySelector('#fatal'),
  fatalMessage: document.querySelector('#fatal-message'),
};

const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
// The slice (Planets I-III + Crossings 1-2) is what the game runs by default:
// it is the stretch that is actually sized and tuned. ?slice=0 opens the whole
// nine-world course, which is still carrying upstream lengths past segment 4.
const sliceRun = params.get('slice') !== '0';
const ordinal = (value) => {
  const mod100 = value % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'TH' : ({ 1: 'ST', 2: 'ND', 3: 'RD' }[value % 10] ?? 'TH');
  return `${value}${suffix}`;
};
const hex = (value) => `#${value.toString(16).padStart(6, '0')}`;
const parseSeed = () => {
  const value = Number(params.get('seed'));
  return Number.isFinite(value) ? value >>> 0 : 0x9e9d11e5;
};
const autoMode = params.has('autotest');
const perfMode = params.has('perftest');
const forcedTouch = params.has('touch');
const reducedMotion = params.has('reducedMotion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const shortMode = params.has('short') || autoMode;
const stageParam = params.get('stage') || params.get('segment');
const mutedAtBoot = params.has('mute') || autoMode || perfMode;
// QA controls and detailed profiling are deliberately independent. `?qa=1`
// keeps the atomic latest-frame identity/control surface; the retained phase
// history is opt-in because its evidence objects must never masquerade as
// production game cadence.
const qaFrameProfileEnabled = params.has('qa-frame-profile');
const qaIdentityEnabled = params.has('qa')
  || qaFrameProfileEnabled
  || autoMode
  || perfMode
  || Boolean(stageParam);
const QA_FRAME_PHASE_CAPACITY = 2400;

if (forcedTouch) document.documentElement.classList.add('force-touch');

const bootPreloads = globalThis.__SPACEBOARDING_BOOT_PRELOADS__ ?? null;
let quality = bootPreloads?.quality ?? chooseInitialQuality(params);
const forceProceduralStaticScoriaSurface = params.has('procedural-static-scoria');
const rollingP1Surface = params.has('rolling-p1-surface');
let scoriaEnvironmentDataPromise = bootPreloads?.scoriaEnvironmentDataPromise ?? null;
let staticScoriaSurfacePackageRequest = bootPreloads?.staticScoriaSurfacePackageRequest ?? null;
if (quality === 'high') {
  // Start the required/fatal environment request first, then overlap the
  // optional immutable geometry package at normal network priority. Both requests
  // begin in this module turn, before RaceRenderer can construct WebGL.
  scoriaEnvironmentDataPromise ??= preloadBakedScoriaEnvironmentData();
  // The original promise remains rejecting/fatal when createPlanetOneArt
  // awaits it; this observer only prevents an early rejection from becoming
  // unhandled while synchronous WebGL construction owns the main thread.
  void scoriaEnvironmentDataPromise.catch(() => undefined);
  if (!forceProceduralStaticScoriaSurface && !rollingP1Surface) {
    staticScoriaSurfacePackageRequest ??= preloadBakedStaticScoriaSurfacePackage();
  }
}
let renderer;
let audio;
let input;
let state;
let paused = false;
let accumulator = 0;
let lastTime = performance.now();
let firstActiveFramePending = false;
let lastSegmentIndex = -1;
let finishShown = false;
let qaInput = null;
let qaFrozen = false;
let qaManualFrameMode = false;
let qaEventSequence = 0;
let qaEventJournal = [];
let qaFramePhaseRing = qaFrameProfileEnabled ? new Array(QA_FRAME_PHASE_CAPACITY) : null;
let qaFramePhaseWriteIndex = 0;
let qaFramePhaseCount = 0;
let qaLatestLiveFrame = null;
let perfElapsed = 0;
let governorElapsed = 0;
let firstFrameReady = false;
let controlsReady = false;
/**
 * The trick banner.
 *
 * Alex: "we can throw the name of the trick and the point value onto the
 * screen in a cool way when you do a trick."
 *
 * Two readouts with different lifetimes. The MOVE line names the thing you
 * just landed and is replaced by the next one. The CHAIN line is the run in
 * progress -- it stays up while the combo is alive and flashes its total on
 * the frame the combo cashes, which is the same frame the boost fires. That
 * simultaneity is the point: the number and the shove are one event, so the
 * player learns what the chain was worth by feeling it.
 *
 * Restarting a CSS animation needs the class removed, a reflow forced, and
 * the class re-added -- without the reflow the browser coalesces the two
 * changes and nothing replays, so a second trick inside one animation would
 * silently not show.
 */
function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function updateTrickBanner(events, state) {
  for (const item of events) {
    if (item.type === 'trick-complete') {
      if (!item.name) continue;
      elements.trickMove.textContent = item.name;
      if (state.comboCount <= 0) {
        elements.trickScore.textContent = `+${Math.round((item.score ?? 0) * 1000).toLocaleString()}`;
      }
    } else if (item.type === 'trick-landed' || item.type === 'rail-payout' || item.type === 'grind-payout') {
      if (!item.name) continue;
      elements.trickMove.textContent = item.name;
      replayAnimation(elements.trickMove, 'hit');
    } else if (item.type === 'blown') {
      elements.trickMove.textContent = item.name ? `BAILED ${item.name}` : 'BAILED';
      replayAnimation(elements.trickMove, 'hit');
    } else if (item.type === 'combo-cashed') {
      elements.trickScore.textContent = item.score.toLocaleString();
      elements.trickMultiplier.textContent = item.count > 1 ? `${item.count} x${item.multiplier}` : '';
      elements.trickChain.classList.remove('alive');
      replayAnimation(elements.trickChain, 'cashed');
    }
  }
  // While a chain is alive the running total sits under the move name. It is
  // read from state rather than accumulated here, so the HUD can never drift
  // out of step with the thing that actually pays out.
  if (state.comboTimer > 0 && state.comboCount > 0) {
    elements.trickChain.classList.remove('cashed');
    elements.trickChain.classList.add('alive');
    elements.trickScore.textContent = state.comboScore.toLocaleString();
    elements.trickMultiplier.textContent = state.comboCount > 1
      ? `${state.comboCount} x${(1 + Math.min(2.5, state.combo * 0.06)).toFixed(2)}`
      : '';
  } else if (!elements.trickChain.classList.contains('cashed')) {
    elements.trickChain.classList.remove('alive');
  }
}

const hudValues = {
  worldLabel: null,
  worldName: null,
  position: null,
  speed: null,
  segment: null,
  vehicleMode: null,
  quality: null,
  speedFloorOk: null,
};

function makeState({ segment = stageParam, started = false } = {}) {
  return createRaceState({
    seed: parseSeed(),
    short: shortMode,
    startSegmentId: segment || undefined,
    slice: sliceRun,
    started,
  });
}

function showFatal(error) {
  console.error(error);
  body.dataset.raceStatus = 'fatal';
  body.dataset.gameReady = 'false';
  elements.fatal.hidden = false;
  elements.fatalMessage.textContent = `${error?.message || error}`;
}

function begin() {
  if (!controlsReady || !state || state.finished) return;
  if (state.started) {
    if (!paused) return;
    paused = false;
    accumulator = 0;
    firstActiveFramePending = true;
    elements.pauseScreen.hidden = true;
    body.dataset.raceStatus = 'racing';
    void audio.resume();
    return;
  }
  startRace(state);
  paused = false;
  accumulator = 0;
  firstActiveFramePending = true;
  elements.pauseScreen.hidden = true;
  elements.startScreen.classList.add('dismissed');
  body.dataset.raceStatus = 'racing';
  void audio.start();
}

function togglePause(force) {
  if (!state?.started || state.finished) return;
  paused = typeof force === 'boolean' ? force : !paused;
  accumulator = 0;
  if (!paused) firstActiveFramePending = true;
  input.clear();
  elements.pauseScreen.hidden = !paused;
  body.dataset.raceStatus = paused ? 'paused' : 'racing';
  if (paused) void audio.suspend();
  else void audio.resume();
}

function restart({ segment = null } = {}) {
  // A new worldline must never inherit a held key, mouse button, or captured
  // touch from the race/finish interaction that preceded it.
  input?.clear();
  qaInput = null;
  renderer?.noteControlState({ steer: 0, surge: false, slip: false });
  state = makeState({ segment, started: true });
  renderer?.resetRacePresentation();
  finishShown = false;
  paused = false;
  accumulator = 0;
  firstActiveFramePending = true;
  qaEventSequence = 0;
  qaEventJournal = [];
  lastSegmentIndex = -1;
  elements.finishScreen.hidden = true;
  elements.pauseScreen.hidden = true;
  elements.startScreen.classList.add('dismissed');
  body.dataset.raceStatus = 'racing';
  showStage(currentSegment(state), true);
  return raceSnapshot(state);
}

function setPalette(segment) {
  document.documentElement.style.setProperty('--accent', hex(segment.accent));
  document.documentElement.style.setProperty('--secondary', hex(segment.secondary));
}

function showStage(segment, force = false) {
  if (!force && lastSegmentIndex === state.segmentIndex) return;
  lastSegmentIndex = state.segmentIndex;
  setPalette(segment);
  elements.stageIndex.textContent = segment.type === 'planet'
    ? `WORLD ${roman[segment.index - 1]}`
    : `CROSSING ${roman[segment.index - 1]}`;
  elements.stageName.textContent = segment.name;
  elements.stageEpithet.textContent = segment.epithet;
  elements.announcer.textContent = `${elements.stageIndex.textContent}: ${segment.name}. ${segment.epithet}.`;
}

function formatRaceTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.max(0, seconds - minutes * 60);
  return `${String(minutes).padStart(2, '0')}:${remaining.toFixed(3).padStart(6, '0')}`;
}

function planetCount() {
  return COURSE.slice(0, state.finalSegmentIndex + 1).filter((s) => s.type === 'planet').length;
}

function updateHud() {
  const segment = currentSegment(state);
  const worldLabel = segment.type === 'planet'
    ? `${roman[segment.index - 1]} / ${roman[planetCount() - 1]}`
    : `${roman[segment.index - 1]} → ${roman[segment.index]}`;
  const position = String(state.position);
  const speed = String(Math.round(state.speed * 4.7)).padStart(4, '0');
  // The band invariant, surfaced for QA: par is a settling point, not a floor
  // that ratchets, so what matters is that speed stayed inside the band.
  const speedFloorOk = String(
    state.speed <= Math.max(segment.maxSpeed, state.segmentEntrySpeed) + 0.01
      && state.speed >= segment.baseSpeed * 0.5,
  );
  if (hudValues.worldLabel !== worldLabel) {
    hudValues.worldLabel = worldLabel;
    elements.worldCount.textContent = worldLabel;
  }
  if (hudValues.worldName !== segment.name) {
    hudValues.worldName = segment.name;
    elements.worldName.textContent = segment.name;
  }
  if (hudValues.position !== position) {
    hudValues.position = position;
    elements.position.innerHTML = `${position}<small>/4</small>`;
    body.dataset.racePosition = position;
  }
  if (hudValues.speed !== speed) {
    hudValues.speed = speed;
    elements.speed.textContent = speed;
  }
  if (hudValues.segment !== segment.id) {
    hudValues.segment = segment.id;
    body.dataset.segment = segment.id;
  }
  if (hudValues.vehicleMode !== segment.type) {
    hudValues.vehicleMode = segment.type;
    body.dataset.vehicleMode = segment.type;
  }
  if (hudValues.quality !== quality) {
    hudValues.quality = quality;
    body.dataset.qualityTier = quality;
  }
  if (hudValues.speedFloorOk !== speedFloorOk) {
    hudValues.speedFloorOk = speedFloorOk;
    body.dataset.speedFloorOk = speedFloorOk;
  }
}

function showFinish() {
  if (finishShown) return;
  finishShown = true;
  body.dataset.raceStatus = 'finished';
  elements.finishPlace.textContent = ordinal(state.finalPosition ?? state.position);
  elements.finishTime.textContent = formatRaceTime(state.finishTime ?? state.time);
  elements.finishKicker.textContent = state.finalPosition === 1 ? 'YOU MADE IT STICK' : 'THEY GOT THERE FIRST';
  window.setTimeout(() => {
    if (state.finished) elements.finishScreen.hidden = false;
  }, reducedMotion ? 350 : 1250);
}

function captureEvents(target, source) {
  for (const item of source) {
    const captured = { sequence: ++qaEventSequence, ...item };
    target.push(captured);
    qaEventJournal.push(captured);
  }
  if (qaEventJournal.length > 1024) qaEventJournal.splice(0, qaEventJournal.length - 1024);
}

function cloneQaLiveFrame(record) {
  if (!record) return null;
  return {
    ...record,
    eventTypes: [...record.eventTypes],
    shotIds: [...record.shotIds],
    events: record.events.map((event) => ({ ...event })),
    phases: { ...record.phases },
    render: { ...record.render },
  };
}

function compactFrameEvent(item) {
  const metadata = {
    sequence: item.sequence,
    type: item.type,
    time: item.time,
    shotId: item.shotId ?? null,
  };
  for (const key of ['sourceId', 'targetId', 'hit', 'dodged']) {
    if (Object.hasOwn(item, key)) metadata[key] = item[key];
  }
  return Object.freeze(metadata);
}

const EMPTY_FRAME_LIST = Object.freeze([]);
const EMPTY_FRAME_PHASES = Object.freeze({});

function resetQaFramePhaseRing() {
  if (!qaFrameProfileEnabled || !qaFramePhaseRing) {
    throw new Error('Detailed frame profiling is disabled. Reload with ?qa=1&qa-frame-profile=1.');
  }
  qaFramePhaseRing.fill(null);
  qaFramePhaseWriteIndex = 0;
  qaFramePhaseCount = 0;
}

function retainQaFramePhase(record) {
  if (!qaFrameProfileEnabled || !qaFramePhaseRing) return;
  qaFramePhaseRing[qaFramePhaseWriteIndex] = record;
  qaFramePhaseWriteIndex = (qaFramePhaseWriteIndex + 1) % QA_FRAME_PHASE_CAPACITY;
  qaFramePhaseCount = Math.min(QA_FRAME_PHASE_CAPACITY, qaFramePhaseCount + 1);
}

function readQaFramePhases() {
  if (!qaFrameProfileEnabled || !qaFramePhaseRing) {
    throw new Error('Detailed frame profiling is disabled. Reload with ?qa=1&qa-frame-profile=1.');
  }
  const records = new Array(qaFramePhaseCount);
  const start = (qaFramePhaseWriteIndex - qaFramePhaseCount + QA_FRAME_PHASE_CAPACITY)
    % QA_FRAME_PHASE_CAPACITY;
  for (let index = 0; index < qaFramePhaseCount; index += 1) {
    records[index] = cloneQaLiveFrame(
      qaFramePhaseRing[(start + index) % QA_FRAME_PHASE_CAPACITY],
    );
  }
  return records;
}

function commitSubmittedFrame({
  origin,
  rafTime = null,
  startedAt,
  gameWorkCompletedAt,
  rawDeltaMs = 0,
  frameDeltaMs = 0,
  segment = currentSegment(state),
  frameEvents = EMPTY_FRAME_LIST,
  phases = null,
}) {
  if (!qaIdentityEnabled) return null;
  const safeStartedAt = Number.isFinite(startedAt) ? startedAt : gameWorkCompletedAt;
  const events = frameEvents.length
    ? Object.freeze(frameEvents.map(compactFrameEvent))
    : EMPTY_FRAME_LIST;
  const eventTypes = events.length
    ? Object.freeze(events.map((event) => event.type))
    : EMPTY_FRAME_LIST;
  const shotIds = events.length
    ? Object.freeze(events
      .map((event) => event.shotId)
      .filter((shotId) => shotId != null))
    : EMPTY_FRAME_LIST;
  const render = Object.freeze(renderer.captureFrameCounters());
  if (render.liveFrameOrigin !== origin) {
    throw new Error(`Frame publication origin mismatch: renderer=${render.liveFrameOrigin} record=${origin}`);
  }
  const frameRecord = {
    liveFrameSerial: render.liveFrameSerial,
    origin,
    rafTime,
    startedAt: safeStartedAt,
    gameWorkCompletedAt,
    completedAt: gameWorkCompletedAt,
    rawDeltaMs,
    frameDeltaMs,
    raceTime: state.time,
    segmentId: segment.id,
    segmentFraction: getSegmentFraction(state),
    raceStarted: state.started,
    eventTypes,
    shotIds,
    events,
    phases: phases ? Object.freeze({ ...phases }) : EMPTY_FRAME_PHASES,
    render,
    gameWorkMs: gameWorkCompletedAt - safeStartedAt,
    identityTailMs: 0,
    profileTailMs: 0,
    totalMs: gameWorkCompletedAt - safeStartedAt,
  };

  // No script callback can observe these assignments until this synchronous
  // stack returns. Retain first, then include record construction/publication
  // in the measured tail before freezing the externally visible identity.
  qaLatestLiveFrame = frameRecord;
  retainQaFramePhase(frameRecord);
  const completedAt = performance.now();
  frameRecord.completedAt = completedAt;
  frameRecord.identityTailMs = completedAt - gameWorkCompletedAt;
  frameRecord.profileTailMs = qaFrameProfileEnabled ? frameRecord.identityTailMs : 0;
  frameRecord.totalMs = completedAt - safeStartedAt;
  Object.freeze(frameRecord);
  return frameRecord;
}

function submitQaSynchronousFrame(origin, frameEvents = EMPTY_FRAME_LIST, {
  startedAt = performance.now(),
  dt = FIXED_STEP,
  observedDt = dt,
} = {}) {
  const segment = currentSegment(state);
  renderer.update(state, frameEvents, dt);
  renderer.render(dt, observedDt, origin);
  updateHud();
  const gameWorkCompletedAt = performance.now();
  return commitSubmittedFrame({
    origin,
    rafTime: null,
    startedAt,
    gameWorkCompletedAt,
    rawDeltaMs: observedDt * 1000,
    frameDeltaMs: dt * 1000,
    segment,
    frameEvents,
    phases: qaFrameProfileEnabled
      ? { qaSynchronousSubmission: gameWorkCompletedAt - startedAt }
      : null,
  });
}

function submitQaRenderOnlyFrame(origin, { startedAt = performance.now() } = {}) {
  const segment = currentSegment(state);
  // A genuine resubmission of the already-authored scene. Calling
  // renderer.update(..., 0) here is not render-only: camera-dependent art can
  // still be recomputed even when dt is zero. The repeatability seam must
  // exercise the GPU/composer again without touching presentation state.
  renderer.render(0, 0, origin);
  updateHud();
  const gameWorkCompletedAt = performance.now();
  return commitSubmittedFrame({
    origin,
    rafTime: null,
    startedAt,
    gameWorkCompletedAt,
    rawDeltaMs: 0,
    frameDeltaMs: 0,
    segment,
    frameEvents: EMPTY_FRAME_LIST,
    phases: qaFrameProfileEnabled
      ? { qaRenderOnlySubmission: gameWorkCompletedAt - startedAt }
      : null,
  });
}

function markControlsReady() {
  if (firstFrameReady) return;
  // Graphics prewarm has already submitted the exact full-size opening frame;
  // once input/listeners exist there is no reason to hold IGNITE through an
  // additional update/render and a second display interval.
  firstFrameReady = true;
  controlsReady = true;
  elements.start.disabled = false;
  elements.start.removeAttribute('aria-busy');
  elements.start.textContent = elements.start.dataset.readyLabel || 'IGNITE';
  body.dataset.gameReady = 'true';
  body.dataset.raceStatus = state.started ? 'racing' : 'ready';
}

function gameFrame(now) {
  const profileFrame = qaFrameProfileEnabled;
  const frameStartedAt = qaIdentityEnabled ? performance.now() : 0;
  let phaseCursor = frameStartedAt;
  const phaseDurations = profileFrame ? {} : null;
  const endPhase = profileFrame ? (name) => {
    const endedAt = performance.now();
    phaseDurations[name] = endedAt - phaseCursor;
    phaseCursor = endedAt;
  } : null;
  const rawDelta = Math.max(0, (now - lastTime) / 1000);
  lastTime = now;
  if (qaManualFrameMode) {
    // Keep the browser's scheduling chain alive while making QA submissions
    // exclusively explicit. Wall time is still consumed here so disabling the
    // seam cannot inject one giant catch-up delta into live play.
    accumulator = 0;
    requestAnimationFrame(gameFrame);
    return;
  }
  const isFirstActiveFrame = firstActiveFramePending
    && state.started
    && !paused
    && !qaFrozen;
  // Start control on one deterministic 120 Hz step. Before this alignment,
  // display phase made the ignition frame run anywhere from one to six fixed
  // steps, so the renderer could not prepare the exact first surface response
  // without retaining a broad multi-megabyte vocabulary. The real input is
  // still sampled on this frame; only pre-start wall time is excluded from the
  // race clock, as it should be.
  const frameDelta = isFirstActiveFrame ? FIXED_STEP : Math.min(rawDelta, 0.05);
  const frameEvents = [];
  try {
    if (!paused && !qaFrozen && state.started) {
      accumulator = Math.min(accumulator + frameDelta, 0.12);
      const controls = qaInput ?? input.read();
      renderer.noteControlState(controls);
      if (profileFrame) endPhase('input');
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < 18) {
        stepRace(state, controls, FIXED_STEP);
        captureEvents(frameEvents, state.events);
        accumulator -= FIXED_STEP;
        steps += 1;
      }
      if (steps > 0 && qaInput === null) input.consumeTransient();
      updateTrickBanner(frameEvents, state);
      if (isFirstActiveFrame) firstActiveFramePending = false;
      if (profileFrame) endPhase('simulation');
    } else {
      if (profileFrame) endPhase('idle');
    }
    const segment = currentSegment(state);
    if (state.segmentIndex !== lastSegmentIndex) showStage(segment);
    if (profileFrame) endPhase('stage');
    audio.update(state, frameEvents, segment, frameDelta);
    if (profileFrame) endPhase('audio');
    renderer.update(state, frameEvents, frameDelta);
    if (profileFrame) endPhase('rendererUpdate');
    renderer.render(frameDelta, rawDelta, 'game-rAF');
    if (profileFrame) endPhase('rendererSubmit');
    updateHud();
    if (profileFrame) endPhase('hud');
    if (state.finished) showFinish();
    markControlsReady();

    if (qaIdentityEnabled) {
      const gameWorkCompletedAt = performance.now();
      commitSubmittedFrame({
        origin: 'game-rAF',
        rafTime: now,
        startedAt: frameStartedAt,
        gameWorkCompletedAt,
        rawDeltaMs: rawDelta * 1000,
        frameDeltaMs: frameDelta * 1000,
        segment,
        frameEvents,
        phases: phaseDurations,
      });
    }

    if (state.started && !paused) {
      governorElapsed += frameDelta;
      perfElapsed += frameDelta;
      if (governorElapsed > 7 && !params.has('quality')) {
        const stats = renderer.stats();
        if (quality === 'high' && stats.frameP95Ms > 25) quality = 'medium';
        else if (quality === 'medium' && stats.frameP95Ms > 34) quality = 'low';
        renderer.setQuality(quality);
        body.dataset.qualityTier = quality;
        governorElapsed = 0;
      }
      if (perfMode && perfElapsed > 8 && !body.dataset.perftestResult) {
        const stats = renderer.stats();
        const threshold = quality === 'low' ? 38 : 25;
        const ok = stats.frames > 120 && stats.frameP95Ms <= threshold && stats.drawCalls <= (quality === 'low' ? 125 : 240);
        body.dataset.perftestResult = ok ? 'pass' : 'fail';
        elements.autotest.value = JSON.stringify({ ok, type: 'performance', ...stats });
      }
    }
  } catch (error) {
    showFatal(error);
    return;
  }
  requestAnimationFrame(gameFrame);
}

async function boot() {
  body.dataset.buildId = BUILD_ID;
  body.dataset.raceStatus = 'booting';
  body.dataset.qualityTier = quality;
  body.dataset.prewarmStatus = 'running';
  document.title = GAME_TITLE;
  elements.start.dataset.readyLabel = elements.start.textContent.trim() || 'DROP IN';
  elements.start.textContent = 'CALIBRATING';
  elements.start.disabled = true;
  elements.start.setAttribute('aria-busy', 'true');
  state = makeState({ started: autoMode || perfMode });
  firstActiveFramePending = state.started;
  audio = new AudioDirector({ muted: mutedAtBoot });
  const audioPreparation = audio.prepare();
  renderer = new RaceRenderer(canvas, {
    quality,
    reducedMotion,
    scoriaEnvironmentDataPromise,
    staticScoriaSurfacePackageRequest,
    forceProceduralStaticScoriaSurface,
  });
  const initialStateHash = stateHash(state);
  const rendererPrewarm = renderer.prewarmFirstLoop({
    initialState: state,
    seed: parseSeed(),
    short: shortMode,
    getLiveState: () => state,
  });
  const [, prewarm] = await Promise.all([audioPreparation, rendererPrewarm]);
  if (stateHash(state) !== initialStateHash) {
    throw new Error('Graphics prewarm mutated the real opening race state.');
  }
  body.dataset.prewarmStatus = prewarm.status;
  body.dataset.prewarmMs = String(prewarm.controlReadyMs ?? prewarm.totalMs);
  renderer.waitForFirstLoopPrewarm().then((fullPrewarm) => {
    body.dataset.prewarmStatus = fullPrewarm.status;
    body.dataset.fullPrewarmMs = String(fullPrewarm.totalMs);
  }).catch(showFatal);
  input = new InputManager({
    canvas,
    root: document,
    forceTouch: forcedTouch,
    onStart: begin,
    onMute: () => setMuted(!audio.muted),
    onPause: () => togglePause(),
  });
  const noteTrustedControlEvent = (event) => {
    if (!event.isTrusted) return;
    if (event.type === 'pointermove' && event.pointerType !== 'touch' && event.buttons === 0) return;
    renderer.notePlayerInput({ type: event.type, eventTime: event.timeStamp });
  };
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'keydown', 'keyup']) {
    document.addEventListener(type, noteTrustedControlEvent, { capture: true, passive: true });
  }
  elements.start.addEventListener('click', begin);
  elements.resume.addEventListener('click', () => togglePause(false));
  elements.restart.addEventListener('click', () => restart());
  elements.mute.addEventListener('click', () => setMuted(!audio.muted));
  window.addEventListener('resize', () => renderer.resize(), { passive: true });
  document.addEventListener('visibilitychange', () => {
    accumulator = 0;
    lastTime = performance.now();
    if (document.visibilityState !== 'visible') {
      input.clear();
      if (state.started && !state.finished) togglePause(true);
    }
  });
  window.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    togglePause(true);
    elements.announcer.textContent = 'Graphics context interrupted. Race held.';
  });
  window.addEventListener('webglcontextrestored', () => location.reload());

  setMuted(mutedAtBoot);
  if (autoMode || perfMode) {
    elements.startScreen.classList.add('dismissed');
    body.dataset.raceStatus = 'racing';
  }
  showStage(currentSegment(state), true);
  if (params.has('qa') || qaFrameProfileEnabled || autoMode || perfMode || stageParam) installQaSurface();
  if (autoMode) runAutoTest();
  const controlPrime = renderer.primeOpeningControlPath({
    initialState: state,
    seed: parseSeed(),
    short: shortMode,
  });
  // The state-restoring half of the exact prime rewrites dynamic live buffers.
  // Retire those bytes on the discarded composer target while controls are
  // still disabled so neither an idle frame nor trusted input inherits them.
  const controlBufferRetirement = renderer.retireOpeningTrackWorkGeometryBeforeControl();
  if (stateHash(state) !== initialStateHash) {
    throw new Error('Final control-path prime mutated the real opening race state.');
  }
  body.dataset.controlPrimeMs = String(controlPrime.totalMs + controlBufferRetirement.totalMs);
  // Publish readiness on a display boundary, then begin the loop on the next
  // one. A player can act immediately, while their first input is guaranteed a
  // fresh 16.7 ms frame rather than inheriting an arbitrary calibration tail.
  requestAnimationFrame((now) => {
    lastTime = now;
    markControlsReady();
    requestAnimationFrame(gameFrame);
  });
}

function setMuted(muted) {
  audio.setMuted(muted);
  elements.mute.textContent = audio.muted ? '◌' : '◉';
  elements.mute.setAttribute('aria-label', audio.muted ? 'Unmute audio' : 'Mute audio');
  body.dataset.muted = String(audio.muted);
}

function runAutoTest() {
  queueMicrotask(() => {
    try {
      const result = runDeterministicSmoke({ seed: parseSeed() });
      const rendererStats = renderer.stats();
      const ok = result.ok && COURSE.length === 17 && rendererStats.renderer.startsWith('WebGL');
      const payload = { ok, type: 'full-race', buildId: BUILD_ID, result, renderer: rendererStats };
      body.dataset.autotestResult = ok ? 'pass' : 'fail';
      body.dataset.autotestVisited = String(result.visitedCount);
      elements.autotest.value = JSON.stringify(payload);
    } catch (error) {
      body.dataset.autotestResult = 'fail';
      elements.autotest.value = JSON.stringify({ ok: false, error: error.message, stack: error.stack });
    }
  });
}

function installQaSurface() {
  const captureSnapshot = (options = {}) => {
    const segment = currentSegment(state);
    return {
      started: state.started,
      time: state.time,
      segmentId: segment.id,
      segmentFraction: getSegmentFraction(state),
      speed: state.speed,
      boost: state.boost,
      lateral: state.lateral,
      lateralVelocity: state.lateralVelocity,
      yaw: state.yaw,
      roll: state.roll,
      riderState: state.riderState,
      trickCharge: state.trickCharge,
      trickMeter: state.trickMeter,
      trickTier: state.trickTier,
      tricksLanded: state.tricksLandedCount,
      tricksBlown: state.tricksBlownCount,
      gateBoosts: state.gateBoosts,
      wallKisses: state.wallKisses,
      sharpness: state.sharpness,
      position: state.position,
      morph: getMorphState(state).morph,
      lift: state.lift,
      liftVelocity: state.liftVelocity,
      lastInput: state.lastInput,
      currentGate: state.currentGate,
      manualFrameMode: qaManualFrameMode,
      renderer: renderer.captureTelemetry({
        canonicalPresentation: Boolean(options?.canonicalPresentation),
      }),
      liveFrame: cloneQaLiveFrame(qaLatestLiveFrame),
    };
  };
  const api = Object.freeze({
    buildId: BUILD_ID,
    ready: () => body.dataset.gameReady === 'true',
    snapshot: () => ({ ...raceSnapshot(state), paused, quality, renderer: renderer.stats() }),
    captureSnapshot,
    stateHash: () => stateHash(state),
    start: () => {
      const startedAt = performance.now();
      renderer.notePlayerInput({ type: 'qa-start' });
      begin();
      submitQaSynchronousFrame('qa:start', EMPTY_FRAME_LIST, {
        startedAt,
        dt: 0,
        observedDt: 0,
      });
      return raceSnapshot(state);
    },
    restart: (options = {}) => {
      const startedAt = performance.now();
      restart(options);
      submitQaSynchronousFrame('qa:restart', EMPTY_FRAME_LIST, {
        startedAt,
        dt: 0,
        observedDt: 0,
      });
      return raceSnapshot(state);
    },
    jumpToSegment: (id) => {
      const startedAt = performance.now();
      restart({ segment: id });
      submitQaSynchronousFrame('qa:jumpToSegment', EMPTY_FRAME_LIST, {
        startedAt,
        dt: 0,
        observedDt: 0,
      });
      return raceSnapshot(state);
    },
    freeze: (value = true) => { qaFrozen = Boolean(value); accumulator = 0; return qaFrozen; },
    setManualFrameMode: (value = true, options = {}) => {
      qaManualFrameMode = Boolean(value);
      accumulator = 0;
      lastTime = performance.now();
      renderer.setDeterministicPresentationMode(
        qaManualFrameMode,
        Number.isFinite(Number(options?.seed)) ? Number(options.seed) : 0x4e494e45,
      );
      if (qaManualFrameMode) renderer.resetRacePresentation();
      return qaManualFrameMode;
    },
    manualFrameMode: () => qaManualFrameMode,
    setSegmentFraction: (fraction = 0) => {
      const startedAt = performance.now();
      const segment = currentSegment(state);
      const desired = segmentLength(segment, state.short) * Math.max(0, Math.min(0.9995, Number(fraction) || 0));
      const delta = desired - state.segmentProgress;
      state.segmentProgress = desired;
      state.globalProgress += delta;
      for (const rival of state.rivals) rival.globalProgress = Math.max(0, rival.globalProgress + delta);
      // A QA teleport is an atomic checkpoint placement, not a traversal. Mark
      // the containing gate as already observed so the next real tick cannot
      // fabricate a boost/hazard event at the destination coordinate.
      const gateSpacing = Math.max(
        segment.gimmick.spacing * (state.short ? 0.16 : 1),
        18,
      );
      state.currentGate = Math.floor(desired / gateSpacing);
      // Placing a deterministic checkpoint is not elapsed gameplay. Publish
      // the new pose without aging camera springs, atmosphere, particles, or
      // pooled effects by a synthetic fixed step. The prior segment-entry
      // publication initialized the camera at fraction zero, so rebuild the
      // director here: its zero-dt destination update then snaps to the actual
      // checkpoint instead of photographing a stale entry spring.
      renderer.resetCameraDirector();
      submitQaSynchronousFrame('qa:setSegmentFraction', EMPTY_FRAME_LIST, {
        startedAt,
        dt: 0,
        observedDt: 0,
      });
      return raceSnapshot(state);
    },
    deterministicCheckpoint: (options = {}) => ({
      segmentId: currentSegment(state).id,
      segmentProgress: state.segmentProgress,
      segmentFraction: getSegmentFraction(state),
      globalProgress: state.globalProgress,
      currentGate: state.currentGate,
      manualFrameMode: qaManualFrameMode,
      presentation: renderer.presentationTelemetry({
        canonical: Boolean(options?.canonicalPresentation),
      }),
    }),
    canonicalPresentationState: () => renderer.canonicalPresentationState(),
    setInput: (next = {}) => {
      qaInput = normalizeInput(next);
      renderer.noteControlState(qaInput);
      return { ...qaInput };
    },
    clearInput: () => {
      qaInput = null;
      renderer.noteControlState(normalizeInput());
      return true;
    },
    resubmitFrame: () => {
      const startedAt = performance.now();
      // A render-only repeat for decoded-pixel reproducibility probes. It
      // republishes the exact current state without advancing simulation,
      // atmosphere, particles, pooled effects, or presentation RNG.
      submitQaRenderOnlyFrame('qa:resubmitFrame', { startedAt });
      return captureSnapshot();
    },
    stepTicks: (count = 1, command = qaInput ?? {}) => {
      const startedAt = performance.now();
      const events = [];
      for (let i = 0; i < Math.max(0, Math.min(200000, Number(count) | 0)); i += 1) {
        stepRace(state, command, FIXED_STEP);
        captureEvents(events, state.events);
      }
      // The banner is driven here too, not only from the live loop. A HUD that
      // only exists under requestAnimationFrame cannot be looked at by any test
      // or by npm run look, which means nobody finds out it is broken.
      updateTrickBanner(events, state);
      submitQaSynchronousFrame('qa:stepTicks', events, { startedAt });
      return raceSnapshot(state);
    },
    stepTicksFromLiveInput: (count = 1) => {
      const startedAt = performance.now();
      const events = [];
      const ticks = Math.max(0, Math.min(200000, Number(count) | 0));
      for (let i = 0; i < ticks; i += 1) {
        stepRace(state, input.read(), FIXED_STEP);
        input.consumeTransient();
        captureEvents(events, state.events);
      }
      updateTrickBanner(events, state);
      submitQaSynchronousFrame('qa:stepTicksFromLiveInput', events, { startedAt });
      return raceSnapshot(state);
    },
    stageRivals: (placements = []) => {
      const startedAt = performance.now();
      const segment = currentSegment(state);
      state.rivals.forEach((rival, index) => {
        const placement = placements[index] ?? {};
        if (Number.isFinite(Number(placement.offset))) {
          rival.globalProgress = Math.max(0, state.globalProgress + Number(placement.offset));
        }
        if (Number.isFinite(Number(placement.lateral))) {
          rival.lateral = Math.max(-segment.width * 0.48, Math.min(segment.width * 0.48, Number(placement.lateral)));
        }
        if (Number.isFinite(Number(placement.speed))) rival.speed = Math.max(segment.baseSpeed, Number(placement.speed));
        rival.lateralVelocity = Number.isFinite(Number(placement.lateralVelocity)) ? Number(placement.lateralVelocity) : 0;
      });
      // Rival staging is another atomic QA checkpoint mutation. Do not age
      // the visible world before the first authored combat frame.
      submitQaSynchronousFrame('qa:stageRivals', EMPTY_FRAME_LIST, {
        startedAt,
        dt: 0,
        observedDt: 0,
      });
      return raceSnapshot(state).rivals;
    },
    eventJournal: ({ since = 0, clear = false } = {}) => {
      const sequence = Math.max(0, Number(since) || 0);
      const result = qaEventJournal.filter((item) => item.sequence > sequence).map((item) => ({ ...item }));
      if (clear) qaEventJournal = [];
      return result;
    },
    clearEventJournal: () => { qaEventJournal = []; return true; },
    pause: () => { togglePause(true); return true; },
    resume: () => { togglePause(false); return true; },
    setQuality: (next) => {
      const startedAt = performance.now();
      if (renderer.setQuality(next)) quality = next;
      body.dataset.qualityTier = quality;
      submitQaSynchronousFrame('qa:setQuality', EMPTY_FRAME_LIST, {
        startedAt,
        dt: 0,
        observedDt: 0,
      });
      return quality;
    },
    rendererStats: () => renderer.stats(),
    worldLook: () => renderer.readWorldLook(),
    rivalPlacements: () => renderer.rivalPlacements(),
    trackBankBounds: () => renderer.trackBankBounds(),
    measurePlayerVisibility: (options = {}) => renderer.measurePlayerVisibility(options),
    waitForFirstLoopPrewarm: () => renderer.waitForFirstLoopPrewarm(),
    resetRendererStats: () => { renderer.resetFrameSamples(); return true; },
    rendererFrameTimes: () => renderer.readFrameSamples(),
    rendererSubmissionTimes: () => renderer.readRenderSubmissionSamples(),
    liveFrameSerial: () => renderer.readLiveFrameSerial(),
    liveFrame: () => cloneQaLiveFrame(qaLatestLiveFrame),
    frameProfile: () => ({
      enabled: qaFrameProfileEnabled,
      capacity: QA_FRAME_PHASE_CAPACITY,
      retained: qaFramePhaseCount,
      requiredQuery: 'qa-frame-profile=1',
    }),
    trackParityBuffers: () => renderer.captureScoriaKernelParityBuffers(),
    authoredBatchParity: () => renderer.captureAuthoredBatchParity(currentSegment(state), state.time),
    resetFramePhases: () => { resetQaFramePhaseRing(); return true; },
    framePhases: () => readQaFramePhases(),
    prepareAudio: async () => {
      await audio.start({ ignite: false });
      return Boolean(audio.captureStream());
    },
    audioCaptureStream: () => audio.captureStream(),
    audioDiagnostics: () => audio.diagnostics(),
    runSmoke: (seed = parseSeed()) => runDeterministicSmoke({ seed }),
    mute: (value = true) => { setMuted(value); return audio.muted; },
  });
  Object.defineProperty(window, '__SPACEBOARDING__', { value: api, configurable: false, enumerable: false, writable: false });
}

boot().catch(showFatal);
