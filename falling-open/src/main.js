import { AudioSystem } from './audio.js';
import { BUILD_ID, FIXED_STEP } from './constants.js';
import { InputSystem } from './input.js';
import { Renderer } from './render.js';
import { GameSim, runSimulationSelfTest } from './sim.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 1337;
const requestedAct = Math.max(1, Math.min(4, Number(params.get('act')) || 1));
const qaEnabled = params.has('qa') || params.has('autotest');
const canvas = document.querySelector('#game');
const shell = document.querySelector('#game-shell');
const startButton = document.querySelector('#start');
const pauseButton = document.querySelector('#pause-button');
const muteButton = document.querySelector('#mute-button');
const pausePanel = document.querySelector('#pause-panel');
const resumeButton = document.querySelector('#resume-button');
const restartButton = document.querySelector('#restart-button');
const endPanel = document.querySelector('#end-panel');
const endStats = document.querySelector('#end-stats');
const againButton = document.querySelector('#again-button');
const srStatus = document.querySelector('#sr-status');

const sim = new GameSim({ seed });
const renderer = new Renderer(canvas, { seed: seed ^ 0xc0ffee });
const audio = new AudioSystem();
let started = false;
let eventCursor = 0;
let accumulator = 0;
let previousTime = performance.now();
let hitStop = 0;
let manualQa = false;
let lastMode = sim.mode;
let startAct = requestedAct;
let qaSurface = null;
let qaDomTick = 0;
const perf = { frames: 0, renderTotalMs: 0, maxRenderMs: 0, slowFrames: 0 };

if (params.has('touch')) document.documentElement.classList.add('force-touch');
document.documentElement.dataset.build = BUILD_ID;
document.body.dataset.gameReady = 'false';
muteButton.textContent = audio.muted ? '×' : '♪';
muteButton.setAttribute('aria-label', audio.muted ? 'Unmute audio' : 'Mute audio');

function announce(message) {
  srStatus.textContent = '';
  requestAnimationFrame(() => { srStatus.textContent = message; });
}

function normalizeInterruptedHold() {
  sim.setInput({ hold: false, steer: 0 });
  sim.lastInput.hold = false;
  sim.lastInput.steer = 0;
}

function begin() {
  if (started && sim.mode !== 'title') return;
  started = true;
  manualQa = false;
  startButton.classList.add('hidden');
  endPanel.hidden = true;
  pausePanel.hidden = true;
  shell.classList.add('playing');
  sim.start(startAct);
  normalizeInterruptedHold();
  canvas.focus({ preventScroll: true });
  announce('The fall begins. Hold to open the umbrella. Release captured rain to send it home.');
}

function pauseGame(reason = 'weather held') {
  if (sim.mode !== 'playing') return;
  sim.pause(true);
  normalizeInterruptedHold();
  pausePanel.hidden = false;
  resumeButton.focus({ preventScroll: true });
  announce(`${reason}. Press keep falling, then take hold again.`);
  void audio.suspend();
}

function resumeGame() {
  if (sim.mode !== 'paused') return;
  normalizeInterruptedHold();
  sim.pause(false);
  pausePanel.hidden = true;
  previousTime = performance.now();
  accumulator = 0;
  canvas.focus({ preventScroll: true });
  announce('Falling resumed. Take hold of the umbrella.');
  void audio.resume();
}

function restartMovement() {
  if (!started) return begin();
  endPanel.hidden = true;
  pausePanel.hidden = true;
  sim.restartAct();
  normalizeInterruptedHold();
  previousTime = performance.now();
  accumulator = 0;
  announce(`Movement ${sim.act} restarted.`);
}

function restartRun() {
  sim.reset();
  startAct = 1;
  started = false;
  eventCursor = 0;
  accumulator = 0;
  hitStop = 0;
  endPanel.hidden = true;
  pausePanel.hidden = true;
  startButton.classList.remove('hidden');
  shell.classList.remove('playing');
  renderer.cameraY = -840;
  renderer.render(sim, 1, 1 / 60);
  announce('Ready to fall again.');
}

function toggleMute() {
  const muted = audio.toggleMute();
  muteButton.textContent = muted ? '×' : '♪';
  muteButton.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
  announce(muted ? 'Audio muted.' : 'Audio on.');
}

const input = new InputSystem(shell, {
  onActivity: () => {
    void audio.unlock();
    if (!started || sim.mode === 'title') begin();
    else if (sim.mode === 'defeat') restartMovement();
  },
  onPause: () => sim.mode === 'paused' ? resumeGame() : pauseGame(),
  onMute: toggleMute,
  onInterrupt: ({ reason }) => pauseGame(reason),
  onRestart: restartMovement
});

startButton.addEventListener('click', () => { void audio.unlock(); begin(); });
pauseButton.addEventListener('click', () => pauseGame());
muteButton.addEventListener('click', toggleMute);
resumeButton.addEventListener('click', resumeGame);
restartButton.addEventListener('click', restartMovement);
againButton.addEventListener('click', restartRun);

function finishRun() {
  const minutes = Math.floor(sim.runTime / 60);
  const seconds = Math.floor(sim.runTime % 60).toString().padStart(2, '0');
  const scars = sim.stats.damage === 0 ? 'unbroken' : `${sim.stats.damage} ${sim.stats.damage === 1 ? 'tear' : 'tears'}`;
  endStats.textContent = `${minutes}:${seconds} · ${sim.stats.returns} drops returned · ${scars}. The weather is yours now.`;
  endPanel.hidden = false;
  againButton.focus({ preventScroll: true });
  announce(`Sky repaired in ${minutes} minutes ${seconds} seconds with ${scars}.`);
}

function consumeEvents() {
  const events = sim.eventsSince(eventCursor);
  if (!events.length) return events;
  eventCursor = events.at(-1).seq;
  renderer.consume(events);
  audio.consume(events, sim);
  for (const event of events) {
    if (event.type === 'source-hit') hitStop = Math.max(hitStop, 0.025);
    if (event.type === 'source-collapse') {
      hitStop = Math.max(hitStop, 0.085);
      announce(`Wound ${event.act} repaired. The world has another voice.`);
    } else if (event.type === 'damage') {
      announce(`${event.panels} umbrella panels remain.`);
    } else if (event.type === 'reverse') {
      announce('Gravity has changed. The same umbrella now pulls you upward.');
    } else if (event.type === 'defeat') {
      announce('The umbrella broke. Hold, press, or tap to try this movement again.');
    } else if (event.type === 'victory') {
      finishRun();
    }
  }
  return events;
}

function advanceOneStep(frameInput) {
  sim.setInput(frameInput);
  sim.step(FIXED_STEP);
  consumeEvents();
}

function frame(now) {
  const rawDt = Math.min(0.12, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;
  const frameInput = input.poll();

  if (!manualQa && sim.mode === 'playing') {
    audio.update(sim);
    if (hitStop > 0) {
      hitStop = Math.max(0, hitStop - rawDt);
    } else {
      accumulator = Math.min(0.2, accumulator + rawDt);
      let safety = 0;
      while (accumulator >= FIXED_STEP && safety < 24) {
        advanceOneStep(frameInput);
        accumulator -= FIXED_STEP;
        safety += 1;
        if (sim.mode !== 'playing' || hitStop > 0) break;
      }
    }
  }

  if (sim.mode !== lastMode) {
    lastMode = sim.mode;
    document.body.dataset.mode = sim.mode;
  }
  const renderStarted = performance.now();
  renderer.render(sim, accumulator / FIXED_STEP, rawDt || 1 / 60);
  const renderMs = performance.now() - renderStarted;
  perf.frames += 1;
  perf.renderTotalMs += renderMs;
  perf.maxRenderMs = Math.max(perf.maxRenderMs, renderMs);
  if (renderMs > 12) perf.slowFrames += 1;
  if (qaEnabled && ++qaDomTick % 12 === 0) writeQaState();
  requestAnimationFrame(frame);
}

function writeQaState(extra = {}) {
  if (!qaEnabled) return;
  document.documentElement.dataset.qaState = JSON.stringify({
    ...extra,
    snapshot: sim.snapshot(),
    hash: sim.stateHash(),
    metrics: {
      sim: sim.metrics(),
      audio: audio.metrics(),
      render: {
        frames: perf.frames,
        averageMs: perf.frames ? perf.renderTotalMs / perf.frames : 0,
        maxMs: perf.maxRenderMs,
        over12Ms: perf.slowFrames
      }
    }
  });
}

function installQaSurface() {
  if (!qaEnabled) return;
  qaSurface = Object.freeze({
    build: BUILD_ID,
    snapshot: () => sim.snapshot(),
    stateHash: () => sim.stateHash(),
    metrics: () => Object.freeze({
      sim: sim.metrics(),
      audio: audio.metrics(),
      render: Object.freeze({
        frames: perf.frames,
        averageMs: perf.frames ? perf.renderTotalMs / perf.frames : 0,
        maxMs: perf.maxRenderMs,
        over12Ms: perf.slowFrames
      })
    }),
    eventsSince: (sequence = 0) => sim.eventsSince(sequence),
    setInput: (next) => sim.setInput(next),
    step: (frames = 1, next = null) => {
      manualQa = true;
      if (next) sim.setInput(next);
      for (let i = 0; i < Math.max(0, Math.min(36000, Math.floor(frames))); i += 1) {
        sim.step(FIXED_STEP);
      }
      consumeEvents();
      renderer.render(sim, 1, FIXED_STEP);
      return sim.snapshot();
    },
    loadScenario: (id) => {
      manualQa = true;
      started = true;
      startButton.classList.add('hidden');
      shell.classList.add('playing');
      sim.loadScenario(id);
      eventCursor = 0;
      consumeEvents();
      renderer.render(sim, 1, FIXED_STEP);
      return sim.snapshot();
    },
    live: () => { manualQa = false; previousTime = performance.now(); accumulator = 0; },
    runSelfTest: () => runSimulationSelfTest()
  });
  window.__FALLING_OPEN_QA__ = qaSurface;
  document.body.dataset.qaSurface = 'installed';
  document.documentElement.dataset.qaCommand = '{}';
  const executeQaCommand = (raw) => {
    try {
      const command = JSON.parse(raw || '{}');
      let result = null;
      if (command.action === 'loadScenario') result = qaSurface.loadScenario(command.id);
      else if (command.action === 'step') result = qaSurface.step(command.frames, command.input);
      else if (command.action === 'setInput') {
        qaSurface.setInput(command.input);
        result = qaSurface.snapshot();
      } else if (command.action === 'live') {
        qaSurface.live();
        result = qaSurface.snapshot();
      } else if (command.action === 'selfTest') result = qaSurface.runSelfTest();
      else throw new Error(`Unknown QA action: ${command.action}`);
      writeQaState({ ok: true, nonce: command.nonce ?? null, result });
    } catch (error) {
      writeQaState({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
  document.addEventListener('falling-open-qa-command', () => {
    executeQaCommand(document.documentElement.dataset.qaCommand);
  });
  const qaInput = document.createElement('input');
  qaInput.id = 'qa-command';
  qaInput.type = 'text';
  qaInput.tabIndex = -1;
  qaInput.setAttribute('aria-hidden', 'true');
  qaInput.style.cssText = 'position:fixed;left:1px;bottom:1px;width:2px;height:2px;opacity:.001;z-index:99;padding:0;border:0';
  const qaRun = document.createElement('button');
  qaRun.id = 'qa-run';
  qaRun.type = 'button';
  qaRun.tabIndex = -1;
  qaRun.setAttribute('aria-hidden', 'true');
  qaRun.textContent = 'qa';
  qaRun.style.cssText = 'position:fixed;left:4px;bottom:1px;width:2px;height:2px;opacity:.001;z-index:99;padding:0;border:0';
  qaRun.addEventListener('click', () => executeQaCommand(qaInput.value));
  document.body.append(qaInput, qaRun);
  writeQaState({ ok: true, installed: true });
}

let selfTest = null;
if (params.has('autotest')) {
  try {
    selfTest = runSimulationSelfTest();
    document.body.dataset.autotest = 'pass';
  } catch (error) {
    document.body.dataset.autotest = 'fail';
    document.body.dataset.autotestError = error instanceof Error ? error.message : String(error);
  }
}

installQaSurface();
renderer.render(sim, 1, 1 / 60);
document.body.dataset.mode = sim.mode;
document.body.dataset.gameReady = 'true';
document.body.dataset.selfTestChecks = String(selfTest?.checks?.length ?? 0);
requestAnimationFrame(frame);
