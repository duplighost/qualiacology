import { createAudio } from "./audio.js";
import { createGame } from "./game.js";
import { STAGES, VOWS } from "./content.js";

const params = new URLSearchParams(location.search);
const forcedTouch = params.has("touch") || params.get("input") === "touch";
const naturalTouch = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
if (forcedTouch) document.body.classList.add("force-touch");
if (naturalTouch) document.body.classList.add("touch-device");

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const dom = {
  machine: $("#machine"),
  canvas: $("#game"),
  title: $("#titleScreen"),
  draft: $("#draftScreen"),
  pause: $("#pauseScreen"),
  end: $("#endScreen"),
  start: $("#startButton"),
  resume: $("#resumeButton"),
  restart: $("#restartButton"),
  quit: $("#quitButton"),
  again: $("#againButton"),
  endingTitle: $("#endingTitleButton"),
  relicGrid: $("#relicGrid"),
  announcement: $("#announcement"),
  announcementKicker: $("#announcementKicker"),
  announcementTitle: $("#announcementTitle"),
  announcementSub: $("#announcementSub"),
  score: $("#score"),
  chain: $("#chain"),
  highScore: $("#highScore"),
  rank: $("#rank"),
  stageLabel: $("#stageLabel"),
  stageName: $("#stageName"),
  hearts: $("#hearts"),
  threadBar: $("#threadBar"),
  threadCount: $("#threadCount"),
  breakBar: $("#echoBar"),
  breakCount: $("#echoCount"),
  multiplier: $("#multiplier"),
  bossHud: $("#bossHud"),
  bossName: $("#bossName"),
  bossPhase: $("#bossPhase"),
  bossBar: $("#bossBar"),
  sideVow: $("#sideVow"),
  sideBest: $("#sideBest"),
  endKicker: $("#endKicker"),
  endTitle: $("#endTitle"),
  endCopy: $("#endCopy"),
  endScore: $("#endScore"),
  endGrazes: $("#endGrazes"),
  endChain: $("#endChain"),
  endTime: $("#endTime"),
  touchClosure: $("#touchClosure"),
  touchBreak: $("#touchBreak"),
  touchPause: $("#touchPause"),
  mute: $("#muteButton"),
  flash: $("#flashButton"),
  fullscreen: $("#fullscreenButton")
};

const preferences = loadPreferences();
if (preferences.reducedFlash) document.body.classList.add("reduce-flash");
const audio = createAudio();
audio.setMuted(preferences.muted);

let selectedVow = params.get("vow") || "needle";
let selectedDifficulty = params.get("difficulty") || "apostate";
let lastMode = "title";
let lastHearts = "";
let announcementTimer = 0;
let pointerId = null;
let pointerOffsetX = 0;
let pointerOffsetY = 0;
const pressedActions = new Set();

const game = createGame(dom.canvas, {
  audio,
  settings: {
    forcedTouch: forcedTouch || naturalTouch,
    reducedFlash: preferences.reducedFlash,
    reducedShake: preferences.reducedShake
  },
  onMode: setMode,
  onAnnounce: announce,
  onDraft: showDraft,
  onEnd: showEnding,
  onToast: showToast
});

window.__echoSaint = game;
document.body.dataset.gameReady = "true";

wireMenus();
wireKeyboard();
wirePointer();
wireTouchControls();
wireTools();
updateSelectedButtons();
updateHud();

function loadPreferences() {
  try {
    return {
      muted: localStorage.getItem("echoSaint.muted") === "true",
      reducedFlash: localStorage.getItem("echoSaint.reducedFlash") === "true",
      reducedShake: localStorage.getItem("echoSaint.reducedShake") === "true"
    };
  } catch {
    return { muted: false, reducedFlash: false, reducedShake: false };
  }
}

function savePreference(key, value) {
  try { localStorage.setItem(`echoSaint.${key}`, String(value)); } catch { /* optional */ }
}

function wireMenus() {
  $$("[data-vow]").forEach((button) => button.addEventListener("click", () => {
    selectedVow = button.dataset.vow;
    updateSelectedButtons();
    audio.unlock();
    audio.sfx("select", 1);
  }));
  $$("[data-difficulty]").forEach((button) => button.addEventListener("click", () => {
    selectedDifficulty = button.dataset.difficulty;
    updateSelectedButtons();
    audio.unlock();
    audio.sfx("select", 1);
  }));

  dom.start.addEventListener("click", beginRun);
  dom.resume.addEventListener("click", () => game.resume());
  dom.restart.addEventListener("click", () => { audio.unlock(); game.restart(); });
  dom.quit.addEventListener("click", () => game.returnTitle());
  dom.again.addEventListener("click", beginRun);
  dom.endingTitle.addEventListener("click", () => game.returnTitle());
}

function updateSelectedButtons() {
  $$("[data-vow]").forEach((button) => button.classList.toggle("selected", button.dataset.vow === selectedVow));
  $$("[data-difficulty]").forEach((button) => button.classList.toggle("selected", button.dataset.difficulty === selectedDifficulty));
  const vow = VOWS.find((item) => item.id === selectedVow);
  dom.sideVow.textContent = vow?.name || selectedVow.toUpperCase();
}

async function beginRun() {
  await audio.unlock();
  const seedParam = params.get("seed");
  const seed = seedParam == null ? Date.now() : seedParam;
  game.start({ vow: selectedVow, difficulty: selectedDifficulty, seed });
}

function wireKeyboard() {
  const mapping = new Map([
    ["ArrowLeft", "left"], ["KeyA", "left"],
    ["ArrowRight", "right"], ["KeyD", "right"],
    ["ArrowUp", "up"], ["KeyW", "up"],
    ["ArrowDown", "down"], ["KeyS", "down"],
    ["Space", "closure"], ["KeyZ", "closure"], ["KeyJ", "closure"],
    ["ShiftLeft", "break"], ["ShiftRight", "break"], ["KeyX", "break"], ["KeyK", "break"]
  ]);

  window.addEventListener("keydown", (event) => {
    if (mapping.has(event.code)) {
      event.preventDefault();
      const action = mapping.get(event.code);
      pressedActions.add(action);
      game.setInput(action, true);
      audio.unlock();
    }

    if (event.code === "Escape" || event.code === "KeyP") {
      event.preventDefault();
      if (!event.repeat) game.togglePause();
    }
    if (event.code === "Enter" && !event.repeat) {
      if (lastMode === "title") beginRun();
      else if (lastMode === "gameover" || lastMode === "victory") beginRun();
    }
    if (lastMode === "draft" && /^Digit[123]$/.test(event.code)) game.chooseRelic(Number(event.code.at(-1)) - 1);
  }, { passive: false });

  window.addEventListener("keyup", (event) => {
    if (!mapping.has(event.code)) return;
    event.preventDefault();
    const action = mapping.get(event.code);
    pressedActions.delete(action);
    game.setInput(action, false);
  }, { passive: false });

  window.addEventListener("blur", releaseAllInputs);
  document.addEventListener("visibilitychange", () => {
    releaseAllInputs();
    if (document.hidden && game.snapshot().mode === "playing") game.pause();
  });
}

function releaseAllInputs() {
  for (const action of ["left", "right", "up", "down", "closure", "break"]) game.setInput(action, false);
  pressedActions.clear();
  game.setPointer(0, 0, false);
  pointerId = null;
  pointerOffsetX = 0;
  pointerOffsetY = 0;
}

function wirePointer() {
  const toGame = (event) => {
    const rect = dom.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * 540,
      y: (event.clientY - rect.top) / rect.height * 960
    };
  };

  dom.canvas.addEventListener("pointerdown", (event) => {
    if (game.snapshot().mode !== "playing") return;
    event.preventDefault();
    audio.unlock();
    if (event.button === 2) {
      game.setInput("closure", true);
      return;
    }
    pointerId = event.pointerId;
    dom.canvas.setPointerCapture?.(event.pointerId);
    const point = toGame(event);
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      const player = game.snapshot().player;
      pointerOffsetX = player.x - point.x;
      pointerOffsetY = player.y - point.y;
    } else {
      pointerOffsetX = 0;
      pointerOffsetY = 0;
    }
    game.setPointer(point.x + pointerOffsetX, point.y + pointerOffsetY, true);
  });
  dom.canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    const point = toGame(event);
    game.setPointer(point.x + pointerOffsetX, point.y + pointerOffsetY, true);
  });
  const release = (event) => {
    if (event.pointerId === pointerId) {
      game.setPointer(0, 0, false);
      pointerId = null;
      pointerOffsetX = 0;
      pointerOffsetY = 0;
    }
    if (event.button === 2) game.setInput("closure", false);
  };
  dom.canvas.addEventListener("pointerup", release);
  dom.canvas.addEventListener("pointercancel", release);
  dom.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
}

function wireTouchControls() {
  const hold = (button, action) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.setPointerCapture?.(event.pointerId);
      audio.unlock();
      game.setInput(action, true);
      button.classList.add("pressed");
    });
    const release = (event) => {
      event.preventDefault();
      event.stopPropagation();
      game.setInput(action, false);
      button.classList.remove("pressed");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => { game.setInput(action, false); button.classList.remove("pressed"); });
  };
  hold(dom.touchClosure, "closure");
  hold(dom.touchBreak, "break");
  dom.touchPause.addEventListener("click", (event) => { event.stopPropagation(); game.togglePause(); });
}

function wireTools() {
  dom.mute.addEventListener("click", async () => {
    await audio.unlock();
    const muted = audio.toggleMuted();
    savePreference("muted", muted);
    dom.mute.classList.toggle("active", !muted);
    dom.mute.textContent = muted ? "♩" : "♫";
  });
  dom.flash.addEventListener("click", () => {
    preferences.reducedFlash = !preferences.reducedFlash;
    document.body.classList.toggle("reduce-flash", preferences.reducedFlash);
    dom.flash.classList.toggle("active", preferences.reducedFlash);
    game.setSettings({ reducedFlash: preferences.reducedFlash });
    savePreference("reducedFlash", preferences.reducedFlash);
  });
  dom.fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await dom.machine.requestFullscreen();
    } catch { /* fullscreen is best effort */ }
  });
  dom.mute.classList.toggle("active", !audio.isMuted());
  dom.mute.textContent = audio.isMuted() ? "♩" : "♫";
  dom.flash.classList.toggle("active", preferences.reducedFlash);
}

function setMode(mode, payload = {}) {
  lastMode = mode;
  document.body.dataset.gameMode = mode;
  document.body.classList.toggle("playing", mode !== "title");
  document.body.classList.toggle("paused", mode === "paused");
  for (const overlay of [dom.title, dom.draft, dom.pause, dom.end]) overlay.classList.remove("active");
  if (mode === "title") dom.title.classList.add("active");
  else if (mode === "draft") dom.draft.classList.add("active");
  else if (mode === "paused" || mode === "fatal") dom.pause.classList.add("active");
  else if (mode === "gameover" || mode === "victory") dom.end.classList.add("active");
  if (mode !== "playing") releaseAllInputs();
  if (mode === "fatal" && payload.error) {
    dom.pause.querySelector("h2").textContent = "SIGNAL CORRUPTED";
    showToast(payload.error, "ERROR");
  }
}

function announce(message) {
  dom.announcementKicker.textContent = message.kicker || "MOVEMENT";
  dom.announcementTitle.textContent = message.title || "UNKNOWN";
  dom.announcementSub.textContent = message.subtitle || "";
  dom.announcement.classList.remove("show");
  void dom.announcement.offsetWidth;
  dom.announcement.classList.add("show");
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => dom.announcement.classList.remove("show"), 3300);
}

function showDraft(choices) {
  dom.relicGrid.replaceChildren(...choices.map((relic, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "relic-card";
    button.dataset.relic = relic.id;
    button.innerHTML = `<i aria-hidden="true"></i><b>0${index + 1} · ${escapeHtml(relic.rank || "GLYPH")}</b><strong>${escapeHtml(relic.name)}</strong><span>${escapeHtml(relic.description)}</span><small>${escapeHtml(relic.flavor || relic.tagline || "THE SHAPE REMEMBERS")}</small>`;
    button.addEventListener("click", () => game.chooseRelic(index));
    return button;
  }));
}

function showEnding(result) {
  dom.endKicker.textContent = result.kicker;
  dom.endTitle.textContent = result.title;
  dom.endCopy.textContent = result.copy;
  dom.endScore.textContent = formatScore(result.score);
  dom.endGrazes.textContent = String(result.grazes);
  dom.endChain.textContent = String(result.maxChain);
  dom.endTime.textContent = formatTime(result.time);
}

function showToast(text, kind = "") {
  const label = `${kind ? `${kind} · ` : ""}${text}`;
  announce({ kicker: kind || "GLYPH ACQUIRED", title: text, subtitle: label === text ? "THE SHAPE REMEMBERS" : "" });
}

function updateHud() {
  const current = game.snapshot();
  dom.score.textContent = current.formattedScore;
  dom.chain.textContent = `CHAIN ${String(current.chain).padStart(2, "0")}`;
  dom.highScore.textContent = formatScore(current.highScore);
  dom.sideBest.textContent = formatScore(current.highScore);
  dom.stageLabel.textContent = current.stageKicker;
  dom.stageName.textContent = current.stageName;
  dom.multiplier.textContent = `×${current.flow.toFixed(1)}`;
  dom.rank.textContent = `RANK ${rankFor(current.flow)}`;
  dom.threadBar.style.width = `${Math.max(0, Math.min(100, current.player.thread / current.player.threadMax * 100))}%`;
  dom.threadCount.textContent = `${Math.round(current.player.thread / current.player.threadMax * 100)}%`;
  dom.breakBar.style.width = `${Math.max(0, Math.min(100, current.player.break))}%`;
  dom.breakCount.textContent = `${Math.round(current.player.break)}%`;
  dom.touchBreak.classList.toggle("ready", current.player.break >= 99.5);

  const heartKey = `${current.player.hp}/${current.player.maxHp}`;
  if (heartKey !== lastHearts) {
    lastHearts = heartKey;
    const hearts = [];
    for (let i = 0; i < current.player.maxHp; i += 1) {
      const heart = document.createElement("i");
      heart.classList.toggle("empty", i >= current.player.hp);
      hearts.push(heart);
    }
    dom.hearts.replaceChildren(...hearts);
  }

  if (current.boss && !current.boss.defeated) {
    dom.bossHud.classList.add("active");
    dom.bossHud.setAttribute("aria-hidden", "false");
    dom.bossName.textContent = current.boss.name;
    dom.bossPhase.textContent = current.boss.phaseName;
    dom.bossBar.style.transform = `scaleX(${current.boss.ratio})`;
  } else {
    dom.bossHud.classList.remove("active");
    dom.bossHud.setAttribute("aria-hidden", "true");
  }

  requestAnimationFrame(updateHud);
}

function rankFor(flow) {
  if (flow >= 7.5) return "Ω";
  if (flow >= 6) return "S";
  if (flow >= 4.5) return "A";
  if (flow >= 3) return "B";
  return "C";
}

function formatScore(value) {
  return Math.max(0, Math.floor(value || 0)).toString().padStart(9, "0").replace(/(\d)(?=(\d{3})+$)/g, "$1 ");
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

if (params.has("autotest")) runAutotest();
if (params.has("perftest")) runPerftest();

async function runAutotest() {
  document.body.dataset.autotest = "running";
  try {
    game.start({ vow: params.get("vow") || "needle", difficulty: params.get("difficulty") || "apostate", seed: params.get("seed") || 1337 });
    game.step(30);
    const closure = game.runScenario("closure");
    game.step(12);
    const dense = game.runScenario("dense", { count: 320 });
    const boss = game.runScenario("boss", { stage: 1 });
    game.step(30);
    const test = game.selfTest();
    const result = { ok: test.ok && closure.captured >= 20 && closure.counts.echoes > 0 && dense.counts.enemyBullets >= 200 && Boolean(boss.boss), selfTest: test, closure, dense, boss };
    document.body.dataset.autotestResult = JSON.stringify(result);
    document.body.dataset.autotest = result.ok ? "done" : "failed";
  } catch (error) {
    document.body.dataset.autotestResult = JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) });
    document.body.dataset.autotest = "failed";
  }
}

async function runPerftest() {
  document.body.dataset.perftest = "running";
  try {
    game.start({ vow: "bloom", difficulty: "martyr", seed: params.get("seed") || 7331 });
    game.runScenario("dense", { count: 620 });
    game.step(900);
    const result = game.snapshot();
    document.body.dataset.perftestResult = JSON.stringify({ ok: !result.fatal && result.perf.droppedSteps < 10, ...result.perf, counts: result.counts });
    document.body.dataset.perftest = "done";
  } catch (error) {
    document.body.dataset.perftestResult = JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) });
    document.body.dataset.perftest = "failed";
  }
}
