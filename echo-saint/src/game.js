import { STAGES, RELICS, VOWS, DIFFICULTIES } from "./content.js";
import { createRng, normalizeSeed, mixSeed } from "./rng.js";

const W = 540;
const H = 960;
const STEP = 1 / 60;
const TAU = Math.PI * 2;
const VERSION = "1.0.0";
const EPS = 1e-6;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const length = (x, y) => Math.hypot(x, y);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const easeOut = (t) => 1 - (1 - t) * (1 - t);

function formatScore(value) {
  return Math.max(0, Math.floor(value)).toString().padStart(9, "0").replace(/(\d)(?=(\d{3})+$)/g, "$1 ");
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || EPS) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area) * 0.5;
}

function circleHit(a, b, padding = 0) {
  const radius = (a.r || 0) + (b.r || 0) + padding;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= radius * radius;
}

function finiteObject(value, seen = new Set()) {
  if (typeof value === "number") return Number.isFinite(value);
  if (!value || typeof value !== "object" || seen.has(value)) return true;
  seen.add(value);
  for (const child of Object.values(value)) {
    if (!finiteObject(child, seen)) return false;
  }
  return true;
}

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
}

function getById(list, id, fallbackIndex = 0) {
  return list.find((item) => item.id === id) || list[fallbackIndex] || list[0];
}

export function createGame(canvas, options = {}) {
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const audio = options.audio || { sfx() {}, update() {}, setIntensity() {}, setStage() {} };
  const callbacks = {
    mode: options.onMode || (() => {}),
    announce: options.onAnnounce || (() => {}),
    draft: options.onDraft || (() => {}),
    end: options.onEnd || (() => {}),
    toast: options.onToast || (() => {})
  };

  const settings = {
    reducedFlash: Boolean(options.settings?.reducedFlash),
    reducedShake: Boolean(options.settings?.reducedShake),
    forcedTouch: Boolean(options.settings?.forcedTouch)
  };

  const input = {
    left: false,
    right: false,
    up: false,
    down: false,
    closure: false,
    break: false,
    pointer: false,
    pointerX: W * 0.5,
    pointerY: H * 0.78,
    gamepadX: 0,
    gamepadY: 0,
    gamepadClosure: false,
    gamepadBreak: false,
    lastClosure: false,
    lastBreak: false
  };

  let state = makeState(1337);
  let gameplayRng = createRng(state.seed);
  let cosmeticRng = createRng(mixSeed ? mixSeed(state.seed, "cosmetic") : state.seed + 911);
  let raf = 0;
  let lastTime = performance.now();
  let accumulator = 0;
  let manualStepping = false;
  let idCounter = 1;
  const stars = [];
  const scars = [];
  const perfSamples = [];
  let perfMax = 0;
  let droppedSteps = 0;

  seedStars();
  resizeBackingStore();
  window.addEventListener("resize", resizeBackingStore, { passive: true });
  raf = requestAnimationFrame(loop);

  function makeState(seedValue) {
    const seed = normalizeSeed ? normalizeSeed(seedValue) : (Number(seedValue) || 1337) >>> 0;
    return {
      version: VERSION,
      mode: "title",
      seed,
      frame: 0,
      time: 0,
      runTime: 0,
      stageIndex: 0,
      stageTime: 0,
      waveClock: 0,
      waveIndex: 0,
      stageClearing: 0,
      score: 0,
      displayedScore: 0,
      highScore: Number(readStored("echoSaint.highScore", 0)) || 0,
      flow: 1,
      maxFlow: 1,
      flowIdle: 0,
      chain: 0,
      maxChain: 0,
      grazes: 0,
      captured: 0,
      kills: 0,
      hits: 0,
      closures: 0,
      bestClosure: "—",
      vowId: "needle",
      difficultyId: "apostate",
      build: baseBuild(),
      player: makePlayer(),
      shots: [],
      echoes: [],
      enemies: [],
      bullets: [],
      particles: [],
      floating: [],
      closureFx: [],
      boss: null,
      relics: [],
      draftChoices: [],
      flash: 0,
      shake: 0,
      freeze: 0,
      fatal: null,
      autopilot: false
    };
  }

  function baseBuild() {
    return {
      damage: 11,
      fireRate: 1,
      shotSpeed: 760,
      projectiles: 0,
      spread: 1,
      pierce: 0,
      homing: 0,
      echoDamage: 1,
      echoSplit: 0,
      threadMax: 100,
      threadRegen: 1,
      threadEfficiency: 1,
      grazeRadius: 27,
      breakGain: 1,
      captureDamage: 1,
      closureScore: 1,
      flowGain: 1,
      maxHp: 3,
      razorThread: false,
      smallGods: false,
      afterimage: false,
      crownfire: false,
      lastWord: false,
      mercy: 0
    };
  }

  function makePlayer() {
    return {
      x: W * 0.5,
      y: H * 0.79,
      px: W * 0.5,
      py: H * 0.79,
      r: 3.5,
      hullRadius: 15,
      hp: 3,
      maxHp: 3,
      invuln: 1.8,
      respawn: 0,
      fireClock: 0,
      thread: 100,
      break: 0,
      closure: false,
      trail: [],
      trailLength: 0,
      closureCooldown: 0,
      overdrive: 0,
      tilt: 0
    };
  }

  function rngFloat(rng = gameplayRng) {
    if (typeof rng === "function") return rng();
    if (typeof rng?.float === "function") return rng.float();
    if (typeof rng?.random === "function") return rng.random();
    if (typeof rng?.next === "function") {
      const result = rng.next();
      return typeof result === "number" ? result : result.value;
    }
    return Math.random();
  }

  function rand(min = 0, max = 1, rng = gameplayRng) {
    return min + (max - min) * rngFloat(rng);
  }

  function randInt(min, max, rng = gameplayRng) {
    return Math.floor(rand(min, max + 1, rng));
  }

  function pick(list, rng = gameplayRng) {
    return list[Math.floor(rngFloat(rng) * list.length) % list.length];
  }

  function seedStars() {
    stars.length = 0;
    for (let i = 0; i < 115; i += 1) {
      stars.push({
        x: rand(0, W, cosmeticRng),
        y: rand(0, H, cosmeticRng),
        size: rand(.35, 1.8, cosmeticRng),
        speed: rand(8, 58, cosmeticRng),
        alpha: rand(.18, .9, cosmeticRng),
        phase: rand(0, TAU, cosmeticRng)
      });
    }
  }

  function resizeBackingStore() {
    const dpr = Math.min(window.devicePixelRatio || 1, settings.forcedTouch ? 1.5 : 2);
    const targetW = Math.round(W * dpr);
    const targetH = Math.round(H * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    canvas.dataset.logicalWidth = String(W);
    canvas.dataset.logicalHeight = String(H);
    canvas.dataset.dpr = String(dpr);
  }

  function loop(now) {
    const elapsed = Math.min(.1, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (!manualStepping) {
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= STEP && steps < 6) {
        safeUpdate(STEP);
        accumulator -= STEP;
        steps += 1;
      }
      if (accumulator >= STEP) {
        droppedSteps += Math.floor(accumulator / STEP);
        accumulator %= STEP;
      }
    }
    render(accumulator / STEP);
    const frameMs = elapsed * 1000;
    if (frameMs > 0 && frameMs < 250) {
      perfSamples.push(frameMs);
      if (perfSamples.length > 360) perfSamples.shift();
      perfMax = Math.max(perfMax, frameMs);
    }
    raf = requestAnimationFrame(loop);
  }

  function safeUpdate(dt) {
    try {
      update(dt);
      if (!finiteObject({
        player: state.player,
        score: state.score,
        flow: state.flow,
        boss: state.boss,
        counts: [state.bullets.length, state.shots.length, state.enemies.length]
      })) throw new Error("Non-finite gameplay state");
    } catch (error) {
      state.fatal = error instanceof Error ? error.message : String(error);
      state.mode = "paused";
      callbacks.mode("fatal", { error: state.fatal });
      console.error(error);
    }
  }

  function update(dt) {
    state.time += dt;
    updateStars(dt);
    updateCosmetic(dt);

    if (state.mode !== "playing") {
      audio.update?.(dt);
      return;
    }

    state.frame += 1;

    if (state.freeze > 0) {
      state.freeze -= dt;
      updateParticles(dt * .25);
      audio.update?.(dt);
      return;
    }

    state.runTime += dt;
    state.stageTime += dt;
    updateGamepad();
    updatePlayer(dt);
    updateDirector(dt);
    updateEnemies(dt);
    updateBoss(dt);
    updateShots(dt);
    updateEnemyBullets(dt);
    updateEchoes(dt);
    updateParticles(dt);
    updateClosures(dt);
    updateScoring(dt);
    enforceCaps();
    audio.setIntensity?.(clamp((state.flow - 1) / 7 + (state.boss ? .24 : 0), 0, 1));
    audio.update?.(dt);

    input.lastClosure = input.closure || input.gamepadClosure;
    input.lastBreak = input.break || input.gamepadBreak;
  }

  function updateStars(dt) {
    const speedScale = state.mode === "playing" ? 1 + state.stageIndex * .22 : .25;
    for (const star of stars) {
      star.y += star.speed * dt * speedScale;
      star.phase += dt * (.4 + star.size * .2);
      if (star.y > H + 3) {
        star.y = -3;
        star.x = rand(0, W, cosmeticRng);
      }
    }
  }

  function updateCosmetic(dt) {
    state.flash = Math.max(0, state.flash - dt * 2.7);
    state.shake = Math.max(0, state.shake - dt * 26);
    state.displayedScore = lerp(state.displayedScore, state.score, 1 - Math.pow(.0005, dt));
    for (let i = scars.length - 1; i >= 0; i -= 1) {
      scars[i].life -= dt * .018;
      if (scars[i].life <= 0) scars.splice(i, 1);
    }
  }

  function updateGamepad() {
    if (!navigator.getGamepads) return;
    const pad = [...navigator.getGamepads()].find(Boolean);
    if (!pad) {
      input.gamepadX = 0;
      input.gamepadY = 0;
      input.gamepadClosure = false;
      input.gamepadBreak = false;
      return;
    }
    const dead = .18;
    const x = Math.abs(pad.axes[0] || 0) > dead ? pad.axes[0] : 0;
    const y = Math.abs(pad.axes[1] || 0) > dead ? pad.axes[1] : 0;
    input.gamepadX = x;
    input.gamepadY = y;
    input.gamepadClosure = Boolean(pad.buttons[0]?.pressed || pad.buttons[6]?.pressed);
    input.gamepadBreak = Boolean(pad.buttons[1]?.pressed || pad.buttons[7]?.pressed);
  }

  function start(optionsOrVow = {}, maybeDifficulty) {
    const requested = typeof optionsOrVow === "string"
      ? { vow: optionsOrVow, difficulty: maybeDifficulty }
      : (optionsOrVow || {});
    const seed = requested.seed ?? Date.now();
    state = makeState(seed);
    state.vowId = getById(VOWS, requested.vow || requested.vowId || "needle").id;
    state.difficultyId = getById(DIFFICULTIES, requested.difficulty || requested.difficultyId || "apostate", 1).id;
    state.build = baseBuild();
    applyVow(state.vowId);
    const difficulty = difficultyProfile();
    state.build.maxHp = difficulty.integrity ?? difficulty.playerHp ?? 3;
    state.player = makePlayer();
    state.player.maxHp = state.build.maxHp;
    state.player.hp = state.build.maxHp;
    state.player.thread = state.build.threadMax;
    gameplayRng = createRng(state.seed);
    cosmeticRng = createRng(mixSeed ? mixSeed(state.seed, "cosmetic") : state.seed + 911);
    idCounter = 1;
    resetInput();
    beginStage(0);
    state.mode = "playing";
    callbacks.mode("playing");
    return snapshot();
  }

  function restart() {
    return start({ vow: state.vowId, difficulty: state.difficultyId, seed: state.seed });
  }

  function returnTitle() {
    state.mode = "title";
    state.bullets.length = 0;
    state.shots.length = 0;
    state.enemies.length = 0;
    state.echoes.length = 0;
    state.boss = null;
    resetInput();
    callbacks.mode("title");
  }

  function pause() {
    if (state.mode !== "playing") return false;
    state.mode = "paused";
    resetInput();
    callbacks.mode("paused");
    return true;
  }

  function resume() {
    if (state.mode !== "paused" || state.fatal) return false;
    state.mode = "playing";
    resetInput();
    callbacks.mode("playing");
    return true;
  }

  function togglePause() {
    if (state.mode === "playing") return pause();
    if (state.mode === "paused") return resume();
    return false;
  }

  function resetInput() {
    for (const key of ["left", "right", "up", "down", "closure", "break", "pointer", "gamepadClosure", "gamepadBreak"]) input[key] = false;
    input.gamepadX = 0;
    input.gamepadY = 0;
    input.lastClosure = false;
    input.lastBreak = false;
  }

  function setInput(name, down) {
    if (name in input) input[name] = Boolean(down);
    if (name === "pause" && down) togglePause();
    return Boolean(input[name]);
  }

  function setPointer(x, y, down = true) {
    input.pointerX = clamp(Number(x) || 0, 22, W - 22);
    input.pointerY = clamp(Number(y) || 0, 80, H - 46);
    input.pointer = Boolean(down);
  }

  function difficultyProfile() {
    return getById(DIFFICULTIES, state.difficultyId, 1) || {};
  }

  function difficultyValue(name, fallback = 1) {
    const profile = difficultyProfile();
    return profile[name] ?? profile.modifiers?.[name] ?? fallback;
  }

  function stageProfile() {
    return STAGES[state.stageIndex] || STAGES[0] || {};
  }

  function applyVow(id) {
    if (id === "bloom") {
      state.build.damage = 7.2;
      state.build.fireRate = .88;
      state.build.spread = 1.3;
    } else if (id === "halo") {
      state.build.damage = 8.5;
      state.build.fireRate = .92;
      state.build.homing = .085;
    } else {
      state.build.damage = 12.5;
      state.build.fireRate = 1.04;
      state.build.pierce = 1;
    }
  }

  function beginStage(index) {
    state.stageIndex = clamp(index, 0, STAGES.length - 1);
    state.stageTime = -3.15;
    state.waveClock = .7;
    state.waveIndex = 0;
    state.stageClearing = 0;
    state.boss = null;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.shots.length = 0;
    state.echoes.length = 0;
    state.player.x = W * .5;
    state.player.y = H * .8;
    state.player.px = state.player.x;
    state.player.py = state.player.y;
    state.player.invuln = 2.4;
    state.player.thread = state.build.threadMax;
    state.player.break = clamp(state.player.break + 18, 0, 100);
    const stage = stageProfile();
    audio.setStage?.(state.stageIndex);
    callbacks.announce({
      kicker: stage.kicker || `MOVEMENT ${roman(state.stageIndex + 1)}`,
      title: stage.name || `MOVEMENT ${state.stageIndex + 1}`,
      subtitle: stage.subtitle || "THE SKY HAS TEETH"
    });
  }

  function roman(n) {
    return ["I", "II", "III", "IV", "V"][n - 1] || String(n);
  }

  function updatePlayer(dt) {
    const player = state.player;
    player.px = player.x;
    player.py = player.y;
    player.invuln = Math.max(0, player.invuln - dt);
    player.closureCooldown = Math.max(0, player.closureCooldown - dt);
    player.overdrive = Math.max(0, player.overdrive - dt);

    let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.gamepadX;
    let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0) + input.gamepadY;
    if (state.autopilot) {
      dx += Math.sin(state.time * 1.31) * .7;
      dy += Math.cos(state.time * .83) * .28;
    }

    const wasClosing = player.closure;
    const wantsClosure = Boolean(input.closure || input.gamepadClosure) && player.closureCooldown <= 0 && player.thread > 1;
    if (wantsClosure && !wasClosing) beginClosure();
    if (!wantsClosure && wasClosing) resolveClosure();

    const speed = player.closure ? 194 : 338;
    if (input.pointer && !state.autopilot) {
      const px = input.pointerX - player.x;
      const py = input.pointerY - player.y;
      const dist = Math.hypot(px, py);
      if (dist > 2) {
        const step = Math.min(dist, speed * dt);
        player.x += px / dist * step;
        player.y += py / dist * step;
        dx = px / dist;
      }
    } else if (dx || dy) {
      const mag = Math.hypot(dx, dy) || 1;
      player.x += dx / mag * speed * dt;
      player.y += dy / mag * speed * dt;
    }

    player.x = clamp(player.x, 22, W - 22);
    player.y = clamp(player.y, 92, H - 43);
    player.tilt = lerp(player.tilt, clamp(dx, -1, 1), 1 - Math.pow(.001, dt));

    if (player.closure) updateTrail();
    else player.thread = Math.min(state.build.threadMax, player.thread + 15 * state.build.threadRegen * dt);

    if ((input.break || input.gamepadBreak) && !input.lastBreak) activateBreak();
    updatePlayerFire(dt);
  }

  function beginClosure() {
    const player = state.player;
    player.closure = true;
    player.trail = [{ x: player.x, y: player.y }];
    player.trailLength = 0;
    audio.sfx?.("select", .3);
  }

  function updateTrail() {
    const player = state.player;
    const last = player.trail[player.trail.length - 1];
    const segment = Math.hypot(player.x - last.x, player.y - last.y);
    if (segment < 5.5) return;
    const cost = segment * .15 / state.build.threadEfficiency;
    player.thread = Math.max(0, player.thread - cost);
    player.trailLength += segment;
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 140) player.trail.splice(1, 1);

    if (state.build.razorThread) {
      for (const enemy of state.enemies) {
        if (enemy.dead || enemy.razorFrame === state.frame) continue;
        if (pointSegmentDistance(enemy, last, player) < enemy.r + 4) {
          enemy.hp -= state.build.damage * .22;
          enemy.razorFrame = state.frame;
          spawnHit(enemy.x, enemy.y, "#f6eefc", 2);
        }
      }
    }

    if (player.thread <= .01) {
      resolveClosure();
      callbacks.toast("THREAD EXHAUSTED", "danger");
    }
  }

  function pointSegmentDistance(point, a, b) {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = point.x - a.x;
    const wy = point.y - a.y;
    const len2 = vx * vx + vy * vy || 1;
    const t = clamp((wx * vx + wy * vy) / len2, 0, 1);
    return Math.hypot(point.x - (a.x + vx * t), point.y - (a.y + vy * t));
  }

  function resolveClosure(forcedPolygon = null) {
    const player = state.player;
    if (!player.closure && !forcedPolygon) return { captured: 0, enemies: 0, grade: "—" };
    const polygon = forcedPolygon || [...player.trail, { x: player.x, y: player.y }];
    if (!forcedPolygon) {
      player.closure = false;
      player.closureCooldown = .12 * difficultyValue("closureCooldown", 1);
      player.trail = [];
    }

    const area = polygon.length >= 3 ? polygonArea(polygon) : 0;
    const closureStrength = difficultyValue("closureCapture", 1);
    if (polygon.length < 4 || area < 360) {
      if (polygon.length > 1) state.closureFx.push({ points: polygon, life: .18, maxLife: .18, color: "#776b83", grade: "VOID", captured: 0 });
      return { captured: 0, enemies: 0, grade: "VOID" };
    }

    let captured = 0;
    let aggregateDamage = 0;
    const echoLimit = settings.forcedTouch ? 58 : 88;
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      if (bullet.dead || !pointInPolygon(bullet, polygon)) continue;
      captured += 1;
      state.bullets.splice(i, 1);
      if (state.echoes.length < echoLimit) {
        spawnEcho(bullet.x, bullet.y, bullet.damage || 1);
      } else {
        aggregateDamage += 2.5 * state.build.echoDamage;
      }
    }

    let enclosedEnemies = 0;
    for (const enemy of state.enemies) {
      if (enemy.dead || !pointInPolygon(enemy, polygon)) continue;
      enclosedEnemies += 1;
      let cut = (22 + captured * .52) * state.build.captureDamage * closureStrength;
      if (state.build.smallGods && area < 28000) cut *= 1.8;
      damageEnemy(enemy, cut, true);
    }

    if (state.boss && pointInPolygon(state.boss, polygon)) {
      const density = captured / Math.max(1, area / 10000);
      let cut = Math.min(110, 24 + captured * 1.3 + density * 4) * state.build.captureDamage * closureStrength;
      if (state.build.smallGods && area < 30000) cut *= 1.45;
      damageBoss(cut, true);
    }

    if (aggregateDamage > 0) {
      const target = state.boss || state.enemies.find((enemy) => !enemy.dead);
      if (target) target.hp -= aggregateDamage;
    }

    const density = captured / Math.max(1, area / 10000);
    let grade = "CLEAN";
    let gradeMult = 1;
    if (captured >= 34 && density >= 9) { grade = "PERFECT"; gradeMult = 2.2; }
    else if (captured >= 20 && density >= 6) { grade = "S"; gradeMult = 1.75; }
    else if (captured >= 10 && density >= 3.2) { grade = "A"; gradeMult = 1.4; }
    else if (captured >= 4) { grade = "B"; gradeMult = 1.15; }
    else if (captured === 0 && enclosedEnemies === 0) { grade = "VOID"; gradeMult = .2; }

    if (captured > 0 || enclosedEnemies > 0) {
      state.closures += 1;
      state.captured += captured;
      state.chain += captured + enclosedEnemies * 3;
      state.maxChain = Math.max(state.maxChain, state.chain);
      state.flow = clamp(state.flow + (.08 + captured * .022) * state.build.flowGain, 1, 8);
      state.maxFlow = Math.max(state.maxFlow, state.flow);
      state.flowIdle = 0;
      state.score += Math.round((captured * 110 + enclosedEnemies * 650) * state.flow * gradeMult * state.build.closureScore);
      player.break = clamp(player.break + (captured * 2.1 + enclosedEnemies * 6) * state.build.breakGain, 0, 100);
      player.thread = clamp(player.thread + captured * .85, 0, state.build.threadMax);
      state.bestClosure = grade;
      state.flash = settings.reducedFlash ? .08 : clamp(.15 + captured * .008, .15, .45);
      state.shake = settings.reducedShake ? 1.5 : clamp(2 + captured * .18, 2, 10);
      state.freeze = Math.min(.055, .015 + captured * .0012);
      audio.sfx?.("closure", captured);
      spawnClosureBurst(polygon, captured);
      scars.push({ points: polygon.map((point) => ({ ...point })), life: 1, color: captured >= 20 ? "#55f6e8" : "#b365ff" });
      if (scars.length > 9) scars.shift();
    } else {
      audio.sfx?.("select", .12);
    }

    state.closureFx.push({ points: polygon, life: .62, maxLife: .62, color: captured ? "#55f6e8" : "#776b83", grade, captured });
    state.floating.push({ x: player.x, y: player.y - 40, text: captured ? `${grade} · ${captured} RECLAIMED` : "EMPTY SHAPE", color: captured ? "#55f6e8" : "#776b83", life: 1.35, maxLife: 1.35, size: captured >= 20 ? 14 : 9 });

    if (state.build.afterimage && captured >= 6 && !forcedPolygon) {
      const copied = polygon.map((point) => ({ ...point }));
      state.closureFx.push({ points: copied, life: 1.05, maxLife: 1.05, color: "#ff3fa4", grade: "AFTERIMAGE", captured: 0, repeatAt: .45, repeated: false });
    }
    if (state.build.crownfire && captured >= 16) player.overdrive = Math.max(player.overdrive, 4.5);
    return { captured, enemies: enclosedEnemies, grade, area, density };
  }

  function activateBreak() {
    const player = state.player;
    if (player.break < 99.9 || state.mode !== "playing") return false;
    player.break = 0;
    player.invuln = Math.max(player.invuln, 1.45);
    const radius = 310;
    let cleared = 0;
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      if (Math.hypot(bullet.x - player.x, bullet.y - player.y) > radius) continue;
      state.bullets.splice(i, 1);
      cleared += 1;
      if (cleared <= 34) spawnEcho(bullet.x, bullet.y, 1.4);
    }
    for (let i = 0; i < 28; i += 1) {
      const angle = i / 28 * TAU;
      spawnShot(player.x, player.y, Math.cos(angle) * 510, Math.sin(angle) * 510, state.build.damage * 1.35, { color: "#ffd978", r: 3.2, pierce: 2 });
    }
    state.score += Math.round(cleared * 80 * state.flow);
    state.flowIdle = 0;
    state.shake = settings.reducedShake ? 2 : 13;
    state.flash = settings.reducedFlash ? .12 : .7;
    state.freeze = .075;
    state.closureFx.push({ points: [], x: player.x, y: player.y, radius: 0, targetRadius: radius, life: .7, maxLife: .7, color: "#ffd978", grade: "BREAK", captured: cleared });
    state.floating.push({ x: player.x, y: player.y - 55, text: `BREAK · ${cleared}`, color: "#ffd978", life: 1.2, maxLife: 1.2, size: 15 });
    audio.sfx?.("break", cleared);
    return true;
  }

  function updatePlayerFire(dt) {
    const player = state.player;
    if (player.respawn > 0) return;
    const overdrive = player.overdrive > 0 ? 1.65 : 1;
    player.fireClock -= dt;
    const interval = (state.vowId === "bloom" ? .105 : state.vowId === "halo" ? .12 : .092) / state.build.fireRate / overdrive;
    if (player.fireClock > 0) return;
    player.fireClock += interval;
    fireVow(player.closure);
    audio.sfx?.("shot", state.vowId === "bloom" ? .45 : .25);
  }

  function fireVow(focused) {
    const player = state.player;
    const damage = state.build.damage * (player.overdrive > 0 ? 1.3 : 1);
    if (state.vowId === "bloom") {
      const count = (focused ? 3 : 5) + state.build.projectiles;
      const spread = focused ? .065 : .145 * state.build.spread;
      for (let i = 0; i < count; i += 1) {
        const offset = i - (count - 1) / 2;
        const angle = -Math.PI / 2 + offset * spread;
        spawnShot(player.x + offset * 3, player.y - 15, Math.cos(angle) * state.build.shotSpeed, Math.sin(angle) * state.build.shotSpeed, damage * (focused ? 1.08 : .78), { color: "#ff5eae", r: focused ? 3.2 : 2.6, pierce: state.build.pierce });
      }
    } else if (state.vowId === "halo") {
      const count = (focused ? 2 : 3) + Math.min(2, state.build.projectiles);
      for (let i = 0; i < count; i += 1) {
        const offset = i - (count - 1) / 2;
        spawnShot(player.x + offset * 9, player.y - 10, offset * 28, -state.build.shotSpeed * .82, damage * (focused ? 1.32 : .94), { color: "#ffd978", r: 3.4, homing: .095 + state.build.homing, pierce: state.build.pierce });
      }
    } else {
      const count = 2 + state.build.projectiles;
      for (let i = 0; i < count; i += 1) {
        const offset = i - (count - 1) / 2;
        spawnShot(player.x + offset * (focused ? 4 : 8), player.y - 17, offset * (focused ? 4 : 16), -state.build.shotSpeed * (focused ? 1.12 : 1), damage * (focused ? 1.22 : .94), { color: "#73fff1", r: focused ? 2.6 : 2.2, pierce: state.build.pierce + (focused ? 1 : 0) });
      }
    }
  }

  function spawnShot(x, y, vx, vy, damage, extra = {}) {
    state.shots.push({ id: idCounter++, x, y, px: x, py: y, vx, vy, damage, r: extra.r || 2.5, color: extra.color || "#f6eefc", pierce: extra.pierce || 0, homing: extra.homing || 0, age: 0, dead: false });
  }

  function spawnEcho(x, y, sourceDamage = 1) {
    const angle = rand(-Math.PI, 0);
    state.echoes.push({
      id: idCounter++, x, y, px: x, py: y,
      vx: Math.cos(angle) * rand(70, 160),
      vy: Math.sin(angle) * rand(70, 160),
      r: 3.2,
      damage: (5.5 + sourceDamage * .5) * state.build.echoDamage,
      age: 0,
      life: 3.8,
      targetId: null,
      split: state.build.echoSplit > 0 && rngFloat() < state.build.echoSplit
    });
  }

  function updateDirector(dt) {
    if (state.boss || state.stageClearing > 0 || state.stageTime < 0) return;
    const difficulty = difficultyProfile();
    const bossAt = 43 + state.stageIndex * 2;
    if (state.stageTime >= bossAt) {
      state.enemies.length = 0;
      state.bullets.length = 0;
      spawnBoss(state.stageIndex);
      return;
    }

    state.waveClock -= dt;
    if (state.waveClock > 0) return;
    const cadence = (2.65 - state.stageIndex * .14) / difficultyValue("spawnRate", difficulty.density || 1);
    state.waveClock += Math.max(1.25, cadence);
    spawnWave(state.waveIndex++);
  }

  function spawnWave(index) {
    const stage = state.stageIndex;
    const cycle = index % 8;
    if (cycle === 0) {
      for (let i = 0; i < 7; i += 1) spawnEnemy("needle", 78 + i * 64, -30 - Math.abs(3 - i) * 13, { delay: i * .08 });
    } else if (cycle === 1) {
      spawnEnemy("fan", 105, -24);
      spawnEnemy("fan", W - 105, -24, { mirror: true });
    } else if (cycle === 2 && stage >= 1) {
      for (let i = 0; i < 4; i += 1) spawnEnemy("sower", 92 + i * 118, -35 - i * 18);
    } else if (cycle === 3) {
      spawnGateWave(index);
    } else if (cycle === 4 && stage >= 2) {
      spawnEnemy("mirror", 130, -28);
      spawnEnemy("mirror", W - 130, -28, { mirror: true });
    } else if (cycle === 5) {
      const count = stage >= 2 ? 3 : 2;
      for (let i = 0; i < count; i += 1) spawnEnemy("warden", W * (i + 1) / (count + 1), -40 - i * 30);
    } else if (cycle === 6 && stage >= 2) {
      for (let i = 0; i < 3; i += 1) spawnEnemy("node", 145 + i * 125, -30 - i * 15, { group: index });
    } else {
      const count = 5 + stage;
      for (let i = 0; i < count; i += 1) spawnEnemy(i % 2 ? "needle" : "fan", 50 + i * (440 / Math.max(1, count - 1)), -30 - i * 20, { elite: stage >= 3 && i % 3 === 0 });
    }
  }

  function spawnGateWave(index) {
    const gap = 90 + (index * 73) % 360;
    for (let x = 28; x <= W - 28; x += 34) {
      if (Math.abs(x - gap) < 54) continue;
      spawnEnemyBullet(x, -8, 0, 125 + state.stageIndex * 12, { r: 5, color: "#ff5eae", delay: (x % 3) * .03 });
    }
    spawnEnemy("gate", 44, -24, { mirror: false });
    spawnEnemy("gate", W - 44, -24, { mirror: true });
  }

  function spawnEnemy(type, x, y, extra = {}) {
    const defs = {
      needle: { hp: 34, r: 12, score: 520, speed: 94 },
      fan: { hp: 65, r: 17, score: 920, speed: 64 },
      sower: { hp: 78, r: 18, score: 1200, speed: 52 },
      gate: { hp: 92, r: 19, score: 1450, speed: 78 },
      mirror: { hp: 112, r: 20, score: 1750, speed: 50 },
      warden: { hp: 170, r: 24, score: 2600, speed: 45 },
      node: { hp: 125, r: 18, score: 1900, speed: 56 }
    };
    const def = defs[type] || defs.needle;
    const elite = Boolean(extra.elite);
    const hpScale = difficultyValue("enemyHp", 1);
    const scoreScale = difficultyValue("score", 1);
    state.enemies.push({
      id: idCounter++, type, x, y, px: x, py: y,
      originX: x, targetY: rand(120, 260),
      vx: 0, vy: def.speed,
      hp: def.hp * (elite ? 1.7 : 1) * hpScale, maxHp: def.hp * (elite ? 1.7 : 1) * hpScale,
      r: def.r * (elite ? 1.12 : 1), score: def.score * (elite ? 2 : 1) * scoreScale,
      t: -(extra.delay || 0), fire: rand(.65, 1.4), phase: rand(0, TAU),
      mirror: Boolean(extra.mirror), elite, group: extra.group ?? null,
      entered: false, dead: false, flash: 0, razorFrame: -1
    });
  }

  function updateEnemies(dt) {
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (enemy.dead) { state.enemies.splice(i, 1); continue; }
      enemy.t += dt;
      enemy.flash = Math.max(0, enemy.flash - dt * 8);
      if (enemy.t < 0) continue;
      enemy.px = enemy.x;
      enemy.py = enemy.y;
      updateEnemyMotion(enemy, dt);
      updateEnemyFire(enemy, dt);
      if (enemy.y > H + 80 || enemy.x < -100 || enemy.x > W + 100) state.enemies.splice(i, 1);
      else if (circleHit(enemy, state.player, -5) && state.player.invuln <= 0) hitPlayer();
      if (enemy.hp <= 0 && !enemy.dead) killEnemy(enemy);
    }
  }

  function updateEnemyMotion(enemy, dt) {
    if (!enemy.entered) {
      enemy.y += enemy.vy * dt;
      if (enemy.y >= enemy.targetY) enemy.entered = true;
      return;
    }
    if (enemy.type === "needle") {
      enemy.y += 29 * dt;
      enemy.x = enemy.originX + Math.sin(enemy.t * 2.1 + enemy.phase) * 34;
    } else if (enemy.type === "fan" || enemy.type === "sower") {
      enemy.x = enemy.originX + Math.sin(enemy.t * .85 + enemy.phase) * (enemy.type === "fan" ? 44 : 22);
      enemy.y += Math.sin(enemy.t * 1.2) * 4 * dt;
    } else if (enemy.type === "gate") {
      enemy.y += 22 * dt;
      enemy.x += (enemy.mirror ? -1 : 1) * Math.sin(enemy.t * 1.7) * 7 * dt;
    } else if (enemy.type === "mirror") {
      const desired = enemy.mirror ? W - state.player.x : state.player.x;
      enemy.x = lerp(enemy.x, clamp(desired, 70, W - 70), 1 - Math.pow(.12, dt));
    } else if (enemy.type === "warden") {
      enemy.x = enemy.originX + Math.sin(enemy.t * .72 + enemy.phase) * 58;
    } else if (enemy.type === "node") {
      enemy.x = enemy.originX + Math.sin(enemy.t * 1.1 + enemy.phase) * 26;
      enemy.y += Math.cos(enemy.t * 1.5 + enemy.phase) * 5 * dt;
    }
  }

  function updateEnemyFire(enemy, dt) {
    enemy.fire -= dt;
    if (!enemy.entered || enemy.fire > 0 || enemy.y > H * .7) return;
    const difficulty = difficultyProfile();
    const rate = difficulty.fireRate || difficulty.density || 1;
    if (enemy.type === "needle") {
      aimedFan(enemy.x, enemy.y, 3 + (enemy.elite ? 2 : 0), .24, 190 * (difficulty.bulletSpeed || 1));
      enemy.fire = 1.65 / rate;
    } else if (enemy.type === "fan") {
      aimedFan(enemy.x, enemy.y, 7 + state.stageIndex * 2, .13, 145 * (difficulty.bulletSpeed || 1), enemy.elite ? "#ffd978" : "#ff5eae");
      enemy.fire = 2.2 / rate;
    } else if (enemy.type === "sower") {
      const angle = angleTo(enemy, state.player);
      for (let i = -1; i <= 1; i += 1) spawnEnemyBullet(enemy.x, enemy.y, Math.cos(angle + i * .34) * 92, Math.sin(angle + i * .34) * 92, { r: 6, color: "#d86cff", split: .95, splitCount: 7 + state.stageIndex });
      enemy.fire = 2.35 / rate;
    } else if (enemy.type === "gate") {
      aimedFan(enemy.x, enemy.y, 4, .2, 165 * (difficulty.bulletSpeed || 1));
      enemy.fire = 1.8 / rate;
    } else if (enemy.type === "mirror") {
      for (let i = -1; i <= 1; i += 1) spawnEnemyBullet(enemy.x + i * 10, enemy.y, i * 12, 205 * (difficulty.bulletSpeed || 1), { r: 4.5, color: "#ff78c1" });
      enemy.fire = .62 / rate;
    } else if (enemy.type === "warden") {
      radialBurst(enemy.x, enemy.y, 12 + state.stageIndex * 2, 126 * (difficulty.bulletSpeed || 1), enemy.phase + enemy.t, enemy.elite ? "#ffd978" : "#b365ff");
      enemy.fire = 1.55 / rate;
    } else if (enemy.type === "node") {
      aimedFan(enemy.x, enemy.y, 5, .17, 180 * (difficulty.bulletSpeed || 1), "#ff3fa4");
      enemy.fire = 1.18 / rate;
    }
  }

  function damageEnemy(enemy, amount, captured = false) {
    if (!enemy || enemy.dead) return;
    enemy.hp -= amount;
    enemy.flash = 1;
    spawnHit(enemy.x, enemy.y, captured ? "#55f6e8" : "#f6eefc", captured ? 5 : 2);
    audio.sfx?.("hit", amount);
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    state.kills += 1;
    state.chain += 1;
    state.maxChain = Math.max(state.maxChain, state.chain);
    state.flow = clamp(state.flow + .035 * state.build.flowGain, 1, 8);
    state.maxFlow = Math.max(state.maxFlow, state.flow);
    state.flowIdle = 0;
    state.score += Math.round(enemy.score * state.flow);
    state.player.thread = clamp(state.player.thread + 2.5, 0, state.build.threadMax);
    state.player.break = clamp(state.player.break + 1.4 * state.build.breakGain, 0, 100);
    spawnExplosion(enemy.x, enemy.y, enemy.elite ? "#ffd978" : "#ff3fa4", enemy.elite ? 18 : 10);
    audio.sfx?.("kill", enemy.elite ? 1.7 : 1);
  }

  function spawnBoss(stageIndex = state.stageIndex) {
    const stage = STAGES[stageIndex] || STAGES[0];
    const def = stage.boss || {};
    const difficulty = difficultyProfile();
    const hpScale = difficulty.bossHp || 1;
    state.enemies.length = 0;
    state.bullets.length = 0;
    state.boss = {
      id: def.id || `boss-${stageIndex}`,
      name: def.name || "THE UNNAMED",
      x: W * .5,
      y: -110,
      px: W * .5,
      py: -110,
      targetY: 165,
      r: def.radius || 58,
      hp: (def.maxHp || 1800) * hpScale,
      maxHp: (def.maxHp || 1800) * hpScale,
      score: def.score || 125000,
      t: 0,
      fire: 1.5,
      phase: 0,
      phaseTime: 0,
      patternStep: 0,
      flash: 0,
      entering: true,
      defeated: false
    };
    callbacks.announce({ kicker: "ARCHIVE HOSTILE", title: state.boss.name, subtitle: "CLOSE AROUND THE HEART" });
    audio.sfx?.("boss", stageIndex + 1);
  }

  function updateBoss(dt) {
    const boss = state.boss;
    if (!boss || boss.defeated) return;
    boss.t += dt;
    boss.phaseTime += dt;
    boss.flash = Math.max(0, boss.flash - dt * 7);
    boss.px = boss.x;
    boss.py = boss.y;

    if (boss.entering) {
      boss.y = lerp(boss.y, boss.targetY, 1 - Math.pow(.025, dt));
      if (Math.abs(boss.y - boss.targetY) < 2) {
        boss.y = boss.targetY;
        boss.entering = false;
        boss.fire = 1.1;
      }
      return;
    }

    const stage = stageProfile();
    const phases = stage.boss?.phases || [];
    const ratio = boss.hp / boss.maxHp;
    let phase = 0;
    for (let i = 0; i < phases.length; i += 1) {
      if (ratio <= phases[i].threshold + EPS) phase = i;
    }
    if (phase !== boss.phase) {
      boss.phase = phase;
      boss.phaseTime = 0;
      boss.patternStep = 0;
      boss.fire = 1.05;
      state.bullets.splice(0, Math.floor(state.bullets.length * .58));
      state.flash = settings.reducedFlash ? .12 : .52;
      state.shake = settings.reducedShake ? 1 : 8;
      callbacks.announce({ kicker: phases[phase]?.name || `VERSE ${roman(phase + 1)}`, title: boss.name, subtitle: "THE PATTERN HAS CHANGED" });
      audio.sfx?.("phase", phase + 1);
    }

    const range = state.stageIndex === 3 ? 150 : 120;
    boss.x = W * .5 + Math.sin(boss.t * (.5 + state.stageIndex * .04)) * range + Math.sin(boss.t * 1.37) * 20;
    boss.y = boss.targetY + Math.cos(boss.t * .73) * 23;
    boss.fire -= dt;
    if (boss.fire <= 0) fireBossPattern(boss);
    if (circleHit(boss, state.player, -20) && state.player.invuln <= 0) hitPlayer();
    if (boss.hp <= 0) defeatBoss();
  }

  function fireBossPattern(boss) {
    const difficulty = difficultyProfile();
    const rate = difficulty.fireRate || 1;
    const speed = difficulty.bulletSpeed || 1;
    const stage = state.stageIndex;
    const phase = boss.phase;
    const step = boss.patternStep++;

    if (stage === 0) {
      if (phase === 0) {
        radialBurst(boss.x, boss.y, 18, 150 * speed, boss.t * .8, "#b365ff");
        if (step % 2) aimedFan(boss.x, boss.y, 5, .13, 245 * speed, "#ff5eae");
        boss.fire = .72 / rate;
      } else if (phase === 1) {
        for (let arm = 0; arm < 4; arm += 1) {
          const angle = boss.t * .52 + arm * Math.PI / 2;
          for (let bead = 0; bead < 4; bead += 1) {
            const a = angle + bead * .025;
            spawnEnemyBullet(boss.x, boss.y, Math.cos(a) * (150 + bead * 25) * speed, Math.sin(a) * (150 + bead * 25) * speed, { color: arm % 2 ? "#ff3fa4" : "#b365ff", r: 4.5 });
          }
        }
        if (step % 3 === 0) aimedFan(boss.x, boss.y, 7, .1, 280 * speed, "#ffd978");
        boss.fire = .29 / rate;
      } else {
        for (let arm = 0; arm < 3; arm += 1) {
          const angle = boss.t * 1.7 + arm * TAU / 3;
          spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * 238 * speed, Math.sin(angle) * 238 * speed, { color: "#ff3fa4", r: 4 });
        }
        if (step % 7 === 0) ringWithGap(boss.x, boss.y, 26, 176 * speed, angleTo(boss, state.player), .55);
        boss.fire = .115 / rate;
      }
    } else if (stage === 1) {
      if (phase === 0) {
        for (let i = 0; i < 4; i += 1) {
          const angle = boss.t * .35 + i * TAU / 4;
          spawnEnemyBullet(boss.x, boss.y, Math.cos(angle) * 102 * speed, Math.sin(angle) * 102 * speed, { r: 6.2, color: "#ff6c89", split: .95, splitCount: 8 });
        }
        boss.fire = .52 / rate;
      } else if (phase === 1) {
        roseBurst(boss.x, boss.y, 7, 4, 122 * speed, boss.t * .3);
        if (step % 3 === 0) aimedFan(boss.x, boss.y, 9, .11, 236 * speed, "#ff9b45");
        boss.fire = .75 / rate;
      } else {
        if (step % 2 === 0) bulletRain(11, 215 * speed, step);
        aimedFan(boss.x, boss.y, 9, .095, 275 * speed, "#ff4f76", Math.sin(boss.t) * .35);
        boss.fire = .42 / rate;
      }
    } else if (stage === 2) {
      if (phase === 0) {
        radialBurst(boss.x, boss.y, 27, 155 * speed, boss.t * .5, "#70d7ff");
        if (step % 2) radialBurst(boss.x, boss.y, 18, 224 * speed, -boss.t * .35, "#f777ff");
        boss.fire = .62 / rate;
      } else if (phase === 1) {
        aimedFan(boss.x - 42, boss.y, 8, .12, 260 * speed, "#70d7ff", .28);
        aimedFan(boss.x + 42, boss.y, 8, .12, 260 * speed, "#f777ff", -.28);
        boss.fire = .39 / rate;
      } else {
        if (step % 3 === 0) latticeWall(step, 235 * speed);
        for (let i = 0; i < 6; i += 1) {
          const a = boss.t * .9 + i * TAU / 6;
          spawnEnemyBullet(boss.x, boss.y, Math.cos(a) * 178 * speed, Math.sin(a) * 178 * speed, { color: i % 2 ? "#f777ff" : "#70d7ff", r: 4.5, split: 1.2, splitCount: 3 });
        }
        boss.fire = .24 / rate;
      }
    } else {
      if (phase === 0) {
        for (let arm = 0; arm < 5; arm += 1) {
          const a = boss.t * 1.18 + arm * TAU / 5;
          spawnEnemyBullet(boss.x, boss.y, Math.cos(a) * 215 * speed, Math.sin(a) * 215 * speed, { color: arm % 2 ? "#ffd978" : "#ff4c70", r: 4.2, curve: (arm % 2 ? 1 : -1) * .11 });
        }
        if (step % 9 === 0) ringWithGap(boss.x, boss.y, 30, 172 * speed, angleTo(boss, state.player), .42);
        boss.fire = .105 / rate;
      } else if (phase === 1) {
        if (step % 2 === 0) latticeWall(step, 272 * speed, 13);
        radialBurst(boss.x, boss.y, 15, (155 + step % 3 * 35) * speed, -boss.t * .4, "#ffd978");
        boss.fire = .43 / rate;
      } else {
        for (let arm = 0; arm < 6; arm += 1) {
          const a = boss.t * 1.45 * (arm % 2 ? 1 : -1) + arm * TAU / 6;
          spawnEnemyBullet(boss.x, boss.y, Math.cos(a) * (185 + arm * 9) * speed, Math.sin(a) * (185 + arm * 9) * speed, { color: arm % 3 ? "#ff4c70" : "#ffd978", r: 4, curve: (arm % 2 ? .14 : -.14) });
        }
        if (step % 6 === 0) aimedFan(boss.x, boss.y, 11, .085, 315 * speed, "#f7ffff");
        if (step % 13 === 0) ringWithGap(boss.x, boss.y, 34, 205 * speed, angleTo(boss, state.player), .32);
        boss.fire = .095 / rate;
      }
    }
  }

  function damageBoss(amount, captured = false) {
    const boss = state.boss;
    if (!boss || boss.defeated || boss.entering) return false;
    boss.hp -= amount;
    boss.flash = 1;
    state.score += Math.round(amount * (captured ? 46 : 12) * state.flow);
    spawnHit(boss.x + rand(-20, 20), boss.y + rand(-20, 20), captured ? "#55f6e8" : "#f6eefc", captured ? 7 : 2);
    audio.sfx?.("hit", Math.min(2, amount / 25));
    if (boss.hp <= 0) defeatBoss();
    return true;
  }

  function defeatBoss() {
    const boss = state.boss;
    if (!boss || boss.defeated) return false;
    boss.defeated = true;
    state.bullets.length = 0;
    state.score += Math.round(boss.score * state.flow);
    state.flow = Math.min(8, state.flow + .5);
    state.stageClearing = 2.6;
    state.flash = settings.reducedFlash ? .18 : 1;
    state.shake = settings.reducedShake ? 2 : 18;
    state.freeze = .12;
    for (let i = 0; i < 80; i += 1) spawnParticle(boss.x + rand(-35, 35), boss.y + rand(-35, 35), pick(["#f6eefc", "#55f6e8", "#ff3fa4", "#ffd978"]), rand(60, 360), rand(0, TAU), rand(.45, 1.4), rand(1.5, 5.5));
    audio.sfx?.("boss", 3);
    if (state.stageIndex === STAGES.length - 1) {
      setTimeout(() => finishRun(true), 900);
    } else {
      setTimeout(() => beginDraft(), 850);
    }
    return true;
  }

  function beginDraft() {
    if (state.mode !== "playing" || state.stageIndex >= STAGES.length - 1) return;
    state.mode = "draft";
    resetInput();
    const ownedCounts = new Map();
    for (const id of state.relics) ownedCounts.set(id, (ownedCounts.get(id) || 0) + 1);
    const eligible = RELICS.filter((relic) => (ownedCounts.get(relic.id) || 0) < (relic.maxStacks || 1));
    const shuffled = typeof gameplayRng.shuffle === "function" ? gameplayRng.shuffle(eligible) : [...eligible].sort(() => rngFloat() - .5);
    state.draftChoices = shuffled.slice(0, 3);
    callbacks.draft(state.draftChoices);
    callbacks.mode("draft");
  }

  function chooseRelic(indexOrId) {
    if (state.mode !== "draft") return false;
    const relic = typeof indexOrId === "string"
      ? state.draftChoices.find((item) => item.id === indexOrId)
      : state.draftChoices[Number(indexOrId) || 0];
    if (!relic) return false;
    state.relics.push(relic.id);
    applyRelic(relic);
    audio.sfx?.("upgrade", relic.tier || 1);
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
    state.mode = "playing";
    callbacks.mode("playing");
    callbacks.toast(relic.name, relic.rank || "GLYPH");
    beginStage(state.stageIndex + 1);
    return true;
  }

  function applyRelic(relic) {
    const id = relic.id;
    if (id === "red-thread") state.build.threadRegen *= 1.28;
    else if (id === "mercy-is-an-area") state.build.threadEfficiency *= 1.2;
    else if (id === "second-edge") state.build.threadMax += 18;
    else if (id === "gospel-of-teeth") { state.build.echoDamage *= 1.35; state.build.pierce += 1; }
    else if (id === "borrowed-halo") { state.build.homing += .045; state.build.echoDamage *= 1.12; }
    else if (id === "glass-tongue") { state.build.grazeRadius *= 1.16; state.build.threadRegen *= 1.2; }
    else if (id === "choir-in-reverse") { state.build.echoSplit = clamp(state.build.echoSplit + .45, 0, .9); state.build.echoDamage *= .82; }
    else if (id === "empty-palm") state.build.lastWord = true;
    else if (id === "ninth-scar") {
      state.build.maxHp += 1;
      state.player.maxHp += 1;
      state.player.hp += 1;
    } else if (id === "black-votive") {
      state.build.maxHp = Math.max(1, state.build.maxHp - 1);
      state.player.maxHp = Math.max(1, state.player.maxHp - 1);
      state.player.hp = Math.min(state.player.hp, state.player.maxHp);
      state.build.damage *= 1.55;
    } else if (id === "saints-afterimage") state.build.afterimage = true;
    else if (id === "perfect-crime") { state.build.echoDamage *= 1.6; state.build.captureDamage *= 1.5; }
    else if (typeof relic.apply === "function") {
      try { relic.apply(state.build); } catch { /* engine mappings remain authoritative */ }
    }
  }

  function finishRun(victory) {
    if (state.mode === "victory" || state.mode === "gameover") return;
    state.mode = victory ? "victory" : "gameover";
    resetInput();
    if (state.score > state.highScore) {
      state.highScore = Math.floor(state.score);
      writeStored("echoSaint.highScore", state.highScore);
    }
    const payload = {
      victory,
      score: Math.floor(state.score),
      grazes: state.grazes,
      captured: state.captured,
      maxChain: state.maxChain,
      maxFlow: state.maxFlow,
      time: state.runTime,
      stageIndex: state.stageIndex,
      title: victory ? "THE SKY CLOSES" : "YOU DIED LOUDLY",
      kicker: victory ? "TRANSMISSION COMPLETE" : "TRANSMISSION ENDED",
      copy: victory ? "The storm learned your shape. It will never forgive you." : "The dark wrote your name down wrong."
    };
    callbacks.end(payload);
    callbacks.mode(state.mode, payload);
    audio.sfx?.(victory ? "victory" : "gameover", state.score);
  }

  function hitPlayer() {
    const player = state.player;
    if (player.invuln > 0 || state.mode !== "playing") return false;
    if (player.closure && state.build.lastWord && player.trail.length >= 3) resolveClosure();
    player.hp -= 1;
    state.hits += 1;
    state.chain = 0;
    state.flow = 1;
    state.flowIdle = 0;
    player.invuln = 2.15;
    player.break = clamp(player.break + 22, 0, 100);
    const clearRadius = 145;
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      if (Math.hypot(state.bullets[i].x - player.x, state.bullets[i].y - player.y) < clearRadius) state.bullets.splice(i, 1);
    }
    state.flash = settings.reducedFlash ? .18 : .82;
    state.shake = settings.reducedShake ? 2 : 14;
    state.freeze = .075;
    spawnExplosion(player.x, player.y, "#ff5571", 24);
    audio.sfx?.("hurt", player.hp);
    if (player.hp <= 0) {
      setTimeout(() => finishRun(false), 420);
    }
    return true;
  }

  function aimedFan(x, y, count, spread, speed, color = "#ff5eae", angleOffset = 0) {
    const base = Math.atan2(state.player.y - y, state.player.x - x) + angleOffset;
    for (let i = 0; i < count; i += 1) {
      const angle = base + (i - (count - 1) / 2) * spread;
      spawnEnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, { color, r: 4.5 });
    }
  }

  function radialBurst(x, y, count, speed, offset = 0, color = "#b365ff") {
    for (let i = 0; i < count; i += 1) {
      const angle = offset + i / count * TAU;
      spawnEnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, { color, r: 4.5 });
    }
  }

  function ringWithGap(x, y, count, speed, gapAngle, gapSize) {
    for (let i = 0; i < count; i += 1) {
      const angle = i / count * TAU;
      const delta = Math.atan2(Math.sin(angle - gapAngle), Math.cos(angle - gapAngle));
      if (Math.abs(delta) < gapSize) continue;
      spawnEnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, { color: i % 3 === 0 ? "#ffd978" : "#ff4c70", r: 4.2 });
    }
  }

  function roseBurst(x, y, petals, beads, speed, offset) {
    for (let petal = 0; petal < petals; petal += 1) {
      for (let bead = 0; bead < beads; bead += 1) {
        const angle = offset + petal / petals * TAU + Math.sin(bead / Math.max(1, beads - 1) * Math.PI) * .18;
        spawnEnemyBullet(x, y, Math.cos(angle) * (speed + bead * 29), Math.sin(angle) * (speed + bead * 29), { color: bead % 2 ? "#ff9b45" : "#ff4f76", r: 4.8 });
      }
    }
  }

  function bulletRain(columns, speed, step) {
    const gap = (step * 3) % columns;
    for (let i = 0; i < columns; i += 1) {
      if (i === gap || i === (gap + 1) % columns) continue;
      const x = (i + .5) / columns * W;
      spawnEnemyBullet(x, -8, Math.sin(step + i) * 22, speed * rand(.88, 1.12), { color: i % 2 ? "#ff4f76" : "#ff9b45", r: 4.4 });
    }
  }

  function latticeWall(step, speed, columns = 11) {
    const gap = (step * 2 + state.stageIndex) % columns;
    for (let i = 0; i < columns; i += 1) {
      if (Math.abs(i - gap) <= 1) continue;
      spawnEnemyBullet((i + .5) / columns * W, -8, 0, speed, { color: i % 2 ? "#70d7ff" : "#f777ff", r: 4.2 });
    }
  }

  function spawnEnemyBullet(x, y, vx, vy, extra = {}) {
    if (state.bullets.length >= bulletCap()) return null;
    const bullet = {
      id: idCounter++, x, y, px: x, py: y, vx, vy,
      r: extra.r || 4.5, color: extra.color || "#ff5eae",
      age: -(extra.delay || 0), life: extra.life || 9,
      damage: extra.damage || 1, grazed: false, dead: false,
      split: extra.split || 0, splitCount: extra.splitCount || 0, splitDone: false,
      curve: extra.curve || 0, telegraph: extra.telegraph || 0
    };
    state.bullets.push(bullet);
    return bullet;
  }

  function bulletCap() {
    const difficulty = state.difficultyId;
    const mobileCap = settings.forcedTouch ? 520 : 760;
    return difficulty === "martyr" ? mobileCap + 110 : difficulty === "pilgrim" ? mobileCap - 90 : mobileCap;
  }

  function updateShots(dt) {
    for (let i = state.shots.length - 1; i >= 0; i -= 1) {
      const shot = state.shots[i];
      shot.age += dt;
      shot.px = shot.x;
      shot.py = shot.y;
      if (shot.homing > 0) steerProjectile(shot, nearestTarget(shot), shot.homing * 60, dt, 780);
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      let hit = false;
      for (const enemy of state.enemies) {
        if (enemy.dead || !circleHit(shot, enemy)) continue;
        damageEnemy(enemy, shot.damage);
        hit = true;
        if (shot.pierce > 0) shot.pierce -= 1;
        else shot.dead = true;
        break;
      }
      if (!shot.dead && state.boss && !state.boss.defeated && circleHit(shot, state.boss)) {
        damageBoss(shot.damage);
        hit = true;
        if (shot.pierce > 0) shot.pierce -= 1;
        else shot.dead = true;
      }
      if (hit) spawnParticle(shot.x, shot.y, shot.color, 70, rand(0, TAU), .25, 1.5);
      if (shot.dead || shot.y < -40 || shot.y > H + 40 || shot.x < -50 || shot.x > W + 50 || shot.age > 3) state.shots.splice(i, 1);
    }
  }

  function nearestTarget(projectile) {
    if (state.boss && !state.boss.defeated) return state.boss;
    let best = null;
    let bestDist = Infinity;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const dist = (enemy.x - projectile.x) ** 2 + (enemy.y - projectile.y) ** 2;
      if (dist < bestDist) { best = enemy; bestDist = dist; }
    }
    return best;
  }

  function steerProjectile(projectile, target, turnRate, dt, targetSpeed) {
    if (!target) return;
    const desired = Math.atan2(target.y - projectile.y, target.x - projectile.x);
    const current = Math.atan2(projectile.vy, projectile.vx);
    let delta = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
    delta = clamp(delta, -turnRate * dt, turnRate * dt);
    const angle = current + delta;
    const speed = lerp(Math.hypot(projectile.vx, projectile.vy), targetSpeed, 1 - Math.pow(.03, dt));
    projectile.vx = Math.cos(angle) * speed;
    projectile.vy = Math.sin(angle) * speed;
  }

  function updateEnemyBullets(dt) {
    const player = state.player;
    const grazeRadius = state.build.grazeRadius * difficultyValue("grazeRadius", 1);
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      // A player hit clears nearby bullets in-place; stale reverse-loop indexes
      // can briefly point past the shortened array on the same fixed step.
      if (!bullet) continue;
      bullet.age += dt;
      if (bullet.age < 0) continue;
      bullet.px = bullet.x;
      bullet.py = bullet.y;
      if (bullet.curve) {
        const speed = Math.hypot(bullet.vx, bullet.vy);
        const angle = Math.atan2(bullet.vy, bullet.vx) + bullet.curve * dt;
        bullet.vx = Math.cos(angle) * speed;
        bullet.vy = Math.sin(angle) * speed;
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (bullet.split > 0 && !bullet.splitDone && bullet.age >= bullet.split) {
        bullet.splitDone = true;
        const count = bullet.splitCount || 6;
        const base = Math.atan2(bullet.vy, bullet.vx);
        for (let n = 0; n < count; n += 1) {
          const angle = base + n / count * TAU;
          spawnEnemyBullet(bullet.x, bullet.y, Math.cos(angle) * 145, Math.sin(angle) * 145, { r: 3.7, color: bullet.color, life: 6 });
        }
        bullet.dead = true;
        spawnHit(bullet.x, bullet.y, bullet.color, 5);
      }

      const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
      if (!bullet.grazed && dist <= grazeRadius + bullet.r && dist > player.r + bullet.r) {
        bullet.grazed = true;
        state.grazes += 1;
        state.chain += 1;
        state.maxChain = Math.max(state.maxChain, state.chain);
        state.flow = clamp(state.flow + .026 * state.build.flowGain, 1, 8);
        state.maxFlow = Math.max(state.maxFlow, state.flow);
        state.flowIdle = 0;
        state.score += Math.round(95 * state.flow);
        player.thread = clamp(player.thread + 1.25, 0, state.build.threadMax);
        player.break = clamp(player.break + .42 * state.build.breakGain, 0, 100);
        spawnParticle(bullet.x, bullet.y, "#ffd978", 42, rand(0, TAU), .38, 1.5);
        audio.sfx?.("graze", state.flow);
      }

      if (player.invuln <= 0 && circleHit(bullet, player)) {
        bullet.dead = true;
        hitPlayer();
      }

      if (bullet.dead || bullet.age > bullet.life || bullet.x < -80 || bullet.x > W + 80 || bullet.y < -100 || bullet.y > H + 100) state.bullets.splice(i, 1);
    }
  }

  function updateEchoes(dt) {
    for (let i = state.echoes.length - 1; i >= 0; i -= 1) {
      const echo = state.echoes[i];
      echo.age += dt;
      echo.life -= dt;
      echo.px = echo.x;
      echo.py = echo.y;
      const target = nearestTarget(echo);
      steerProjectile(echo, target, 8.2, dt, 620);
      echo.x += echo.vx * dt;
      echo.y += echo.vy * dt;
      let impacted = false;
      for (const enemy of state.enemies) {
        if (enemy.dead || !circleHit(echo, enemy, 1)) continue;
        damageEnemy(enemy, echo.damage, true);
        impacted = true;
        break;
      }
      if (!impacted && state.boss && !state.boss.defeated && circleHit(echo, state.boss, 1)) {
        damageBoss(echo.damage * 1.08, true);
        impacted = true;
      }
      if (impacted) {
        spawnHit(echo.x, echo.y, "#55f6e8", 4);
        if (echo.split) {
          echo.split = false;
          for (let n = 0; n < 2; n += 1) {
            const angle = Math.atan2(echo.vy, echo.vx) + (n ? .46 : -.46);
            state.echoes.push({ ...echo, id: idCounter++, vx: Math.cos(angle) * 420, vy: Math.sin(angle) * 420, damage: echo.damage * .55, life: 1.6, age: 0, split: false });
          }
        }
        state.echoes.splice(i, 1);
      } else if (echo.life <= 0 || echo.x < -80 || echo.x > W + 80 || echo.y < -100 || echo.y > H + 100) {
        state.echoes.splice(i, 1);
      }
    }
  }

  function updateScoring(dt) {
    state.flowIdle += dt;
    if (state.flowIdle > 2.15) {
      state.flow = Math.max(1, state.flow - dt * (.42 + state.flow * .045));
      if (state.flow <= 1.02) state.chain = 0;
    }
    if (state.stageClearing > 0) state.stageClearing -= dt;
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(.025, dt);
      particle.vy *= Math.pow(.025, dt);
      particle.vy += (particle.gravity || 0) * dt;
      particle.rotation += particle.spin * dt;
      if (particle.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.floating.length - 1; i >= 0; i -= 1) {
      const item = state.floating[i];
      item.life -= dt;
      item.y -= 24 * dt;
      if (item.life <= 0) state.floating.splice(i, 1);
    }
  }

  function updateClosures(dt) {
    for (let i = state.closureFx.length - 1; i >= 0; i -= 1) {
      const effect = state.closureFx[i];
      effect.life -= dt;
      if (effect.repeatAt != null && !effect.repeated && effect.life <= effect.repeatAt) {
        effect.repeated = true;
        const result = resolveClosure(effect.points);
        if (result.captured > 0) {
          state.score += Math.round(result.captured * 45 * state.flow);
        }
      }
      if (effect.life <= 0) state.closureFx.splice(i, 1);
    }
  }

  function enforceCaps() {
    const particleCap = settings.forcedTouch ? 260 : 430;
    if (state.particles.length > particleCap) state.particles.splice(0, state.particles.length - particleCap);
    if (state.shots.length > 240) state.shots.splice(0, state.shots.length - 240);
    if (state.echoes.length > 110) state.echoes.splice(0, state.echoes.length - 110);
  }

  function spawnParticle(x, y, color, speed, angle, life = .5, size = 2, gravity = 0) {
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, life, maxLife: life, size, rotation: rand(0, TAU, cosmeticRng), spin: rand(-5, 5, cosmeticRng), gravity });
  }

  function spawnHit(x, y, color, count = 3) {
    for (let i = 0; i < count; i += 1) spawnParticle(x, y, color, rand(40, 170, cosmeticRng), rand(0, TAU, cosmeticRng), rand(.18, .48, cosmeticRng), rand(1, 3.4, cosmeticRng));
  }

  function spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i += 1) spawnParticle(x, y, i % 4 === 0 ? "#f6eefc" : color, rand(55, 280, cosmeticRng), rand(0, TAU, cosmeticRng), rand(.35, .95, cosmeticRng), rand(1.2, 4.8, cosmeticRng));
  }

  function spawnClosureBurst(polygon, captured) {
    const count = Math.min(70, 12 + captured * 2);
    for (let i = 0; i < count; i += 1) {
      const point = polygon[i % polygon.length];
      spawnParticle(point.x, point.y, i % 4 === 0 ? "#f6eefc" : "#55f6e8", rand(35, 210, cosmeticRng), rand(0, TAU, cosmeticRng), rand(.3, .85, cosmeticRng), rand(1, 3.6, cosmeticRng));
    }
  }

  function render(alpha = 0) {
    const dpr = Number(canvas.dataset.dpr) || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.imageSmoothingEnabled = true;
    const shake = state.shake * (settings.reducedShake ? .18 : 1);
    const sx = shake ? Math.sin(state.time * 79.7) * shake : 0;
    const sy = shake ? Math.cos(state.time * 91.3) * shake * .65 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    renderBackground(alpha);
    renderScars();
    renderEnemies(alpha);
    renderBoss(alpha);
    renderBullets(alpha);
    renderShots(alpha);
    renderEchoes(alpha);
    renderClosureFx();
    renderPlayer(alpha);
    renderActiveTrail();
    renderParticles();
    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(246,238,252,${Math.min(settings.reducedFlash ? .11 : .62, state.flash * .55)})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (state.mode === "playing" && state.player.invuln > 0 && state.player.hp <= 0) {
      const gradient = ctx.createRadialGradient(state.player.x, state.player.y, 0, state.player.x, state.player.y, 260);
      gradient.addColorStop(0, "rgba(255,40,90,.18)");
      gradient.addColorStop(1, "rgba(255,40,90,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function palette() {
    return stageProfile().palette || { background: "#05030b", mid: "#25113a", accent: "#b365ff", danger: "#ff3fa4", echo: "#55f6e8" };
  }

  function renderBackground() {
    const colors = palette();
    ctx.fillStyle = colors.background || "#05030b";
    ctx.fillRect(-30, -30, W + 60, H + 60);
    const glow = ctx.createRadialGradient(W * .5, H * .18, 0, W * .5, H * .18, H * .8);
    glow.addColorStop(0, `${colors.mid || "#25113a"}88`);
    glow.addColorStop(.42, `${colors.mid || "#25113a"}25`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const star of stars) {
      ctx.globalAlpha = star.alpha * (.7 + Math.sin(star.phase) * .25);
      ctx.fillStyle = star.size > 1.25 ? colors.echo : "#ece5f5";
      ctx.fillRect(star.x, star.y, star.size, star.size * 2.1);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `${colors.accent}22`;
    ctx.fillStyle = `${colors.mid}16`;
    ctx.lineWidth = 1;
    const scroll = ((state.stageTime > 0 ? state.stageTime : state.time * .2) * 18) % 96;
    if (state.stageIndex === 0) drawStaticNave(scroll);
    else if (state.stageIndex === 1) drawRedOrchard(scroll);
    else if (state.stageIndex === 2) drawGlassChoir(scroll);
    else drawUnwrittenSun(scroll);
    ctx.restore();

    const vignette = ctx.createRadialGradient(W / 2, H * .52, H * .18, W / 2, H * .5, H * .7);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStaticNave(scroll) {
    for (let row = -1; row < 12; row += 1) {
      const y = row * 96 + scroll;
      ctx.beginPath();
      ctx.moveTo(0, y + 78);
      ctx.quadraticCurveTo(70, y - 45, 140, y + 78);
      ctx.moveTo(W - 140, y + 78);
      ctx.quadraticCurveTo(W - 70, y - 45, W, y + 78);
      ctx.stroke();
    }
    ctx.globalAlpha = .5;
    for (let x = 42; x < W; x += 76) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(W * .5 + (x - W * .5) * 2.4, H);
      ctx.stroke();
    }
  }

  function drawRedOrchard(scroll) {
    ctx.globalAlpha = .72;
    for (let vine = 0; vine < 7; vine += 1) {
      ctx.beginPath();
      for (let y = -40; y <= H + 40; y += 14) {
        const x = (vine + .5) / 7 * W + Math.sin(y * .012 + state.time * .35 + vine) * 26;
        if (y === -40) ctx.moveTo(x, y + scroll % 28); else ctx.lineTo(x, y + scroll % 28);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 97) % W;
      const y = (i * 149 + scroll * 2) % (H + 80) - 40;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(state.time * .12 + i);
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();
    }
  }

  function drawGlassChoir(scroll) {
    for (let row = -1; row < 11; row += 1) {
      const y = row * 104 + scroll;
      for (let col = 0; col < 6; col += 1) {
        const x = 22 + col * 100 + (row % 2) * 50;
        ctx.beginPath();
        ctx.moveTo(x, y - 42);
        ctx.lineTo(x + 31, y);
        ctx.lineTo(x, y + 42);
        ctx.lineTo(x - 31, y);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = .22;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.stroke();
  }

  function drawUnwrittenSun(scroll) {
    ctx.save();
    ctx.translate(W / 2, H * .28 + Math.sin(state.time * .2) * 12);
    for (let i = 0; i < 10; i += 1) {
      ctx.globalAlpha = .18 - i * .012;
      ctx.beginPath();
      ctx.arc(0, 0, 45 + i * 34 + Math.sin(state.time + i) * 4, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i += 1) {
      const a = i / 16 * TAU + state.time * .02;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.lineTo(Math.cos(a) * 420, Math.sin(a) * 420);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = .2;
    for (let y = -80; y < H + 80; y += 80) {
      ctx.fillRect(0, y + scroll, W, 1);
    }
  }

  function renderScars() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const scar of scars) {
      if (!scar.points?.length) continue;
      ctx.globalAlpha = scar.life * .14;
      ctx.strokeStyle = scar.color;
      ctx.lineWidth = 1;
      pathPolygon(scar.points);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderBullets(alpha) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 0;
    for (const bullet of state.bullets) {
      if (bullet.age < 0) continue;
      const x = lerp(bullet.px, bullet.x, alpha);
      const y = lerp(bullet.py, bullet.y, alpha);
      const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
      const tx = bullet.vx / speed;
      const ty = bullet.vy / speed;
      ctx.globalAlpha = .28;
      ctx.strokeStyle = bullet.color;
      ctx.lineWidth = bullet.r * .75;
      ctx.beginPath();
      ctx.moveTo(x - tx * bullet.r * 2.8, y - ty * bullet.r * 2.8);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = .19;
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(x, y, bullet.r * 2.05, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, bullet.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath();
      ctx.arc(x - tx * 1.2, y - ty * 1.2, Math.max(1, bullet.r * .31), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function renderShots(alpha) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const shot of state.shots) {
      const x = lerp(shot.px, shot.x, alpha);
      const y = lerp(shot.py, shot.y, alpha);
      ctx.strokeStyle = shot.color;
      ctx.lineWidth = shot.r * 1.25;
      ctx.beginPath();
      ctx.moveTo(shot.px, shot.py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderEchoes(alpha) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const echo of state.echoes) {
      const x = lerp(echo.px, echo.x, alpha);
      const y = lerp(echo.py, echo.y, alpha);
      ctx.strokeStyle = "rgba(85,246,232,.42)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(echo.px, echo.py); ctx.lineTo(x, y); ctx.stroke();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(echo.vy, echo.vx) + Math.PI / 2);
      ctx.fillStyle = "#55f6e8";
      ctx.shadowColor = "#55f6e8";
      ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4, 4); ctx.lineTo(0, 2); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function renderEnemies(alpha) {
    for (const enemy of state.enemies) {
      if (enemy.t < 0 || enemy.dead) continue;
      const x = lerp(enemy.px, enemy.x, alpha);
      const y = lerp(enemy.py, enemy.y, alpha);
      drawEnemyGlyph(enemy, x, y);
    }
  }

  function drawEnemyGlyph(enemy, x, y) {
    const color = enemy.elite ? "#ffd978" : palette().danger;
    const r = enemy.r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(enemy.phase + enemy.t * (enemy.type === "warden" ? .3 : .7));
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = enemy.flash > 0 ? "#ffffff" : color;
    ctx.fillStyle = `${color}22`;
    ctx.shadowColor = color;
    ctx.shadowBlur = enemy.flash > 0 ? 18 : 8;
    ctx.lineWidth = enemy.elite ? 2.2 : 1.45;
    ctx.beginPath();
    if (enemy.type === "needle") {
      ctx.moveTo(0, r); ctx.lineTo(r * .45, -r); ctx.lineTo(0, -r * .56); ctx.lineTo(-r * .45, -r); ctx.closePath();
    } else if (enemy.type === "fan") {
      for (let i = 0; i < 8; i += 1) { const a = i / 8 * TAU; const rr = i % 2 ? r * .52 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
    } else if (enemy.type === "sower") {
      for (let i = 0; i < 6; i += 1) { const a = i / 6 * TAU; ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + .35) * r, Math.sin(a + .35) * r, Math.cos(a) * r, Math.sin(a) * r); }
    } else if (enemy.type === "gate") {
      ctx.rect(-r * .7, -r, r * 1.4, r * 2); ctx.moveTo(-r * .7, 0); ctx.lineTo(r * .7, 0);
    } else if (enemy.type === "mirror") {
      ctx.moveTo(0, -r); ctx.lineTo(r * .8, 0); ctx.lineTo(0, r); ctx.lineTo(-r * .8, 0); ctx.closePath(); ctx.moveTo(-r * .55, 0); ctx.lineTo(r * .55, 0);
    } else if (enemy.type === "warden") {
      ctx.rect(-r * .6, -r * .6, r * 1.2, r * 1.2); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r);
    } else {
      for (let i = 0; i < 3; i += 1) { const a = i / 3 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    ctx.rotate(-enemy.phase - enemy.t * (enemy.type === "warden" ? .3 : .7));
    ctx.fillStyle = enemy.elite ? "#ffd978" : "#f6eefc";
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(2.5, r * .18), 0, TAU); ctx.fill();
    ctx.restore();
  }

  function renderBoss(alpha) {
    const boss = state.boss;
    if (!boss || boss.defeated) return;
    const x = lerp(boss.px, boss.x, alpha);
    const y = lerp(boss.py, boss.y, alpha);
    const colors = palette();
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    const pulse = 1 + Math.sin(boss.t * 3) * .035;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = boss.flash > 0 ? "#fff" : colors.danger;
    ctx.fillStyle = `${colors.mid}88`;
    ctx.shadowColor = colors.accent;
    ctx.shadowBlur = 24;
    ctx.lineWidth = 2;
    const r = boss.r;
    if (state.stageIndex === 0) drawWitnessBoss(r, boss);
    else if (state.stageIndex === 1) drawMotherBoss(r, boss);
    else if (state.stageIndex === 2) drawChoirBoss(r, boss);
    else drawSunBoss(r, boss);
    ctx.restore();
  }

  function drawWitnessBoss(r, boss) {
    ctx.rotate(boss.t * .18);
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) { const a = i / 8 * TAU; const rr = r * (1 - ring * .2) * (i % 2 ? .72 : 1); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.stroke();
    }
    ctx.rotate(-boss.t * .36);
    ctx.beginPath(); ctx.arc(0, 0, r * .32, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f6eefc"; ctx.beginPath(); ctx.ellipse(0, 0, r * .22, r * .08, 0, 0, TAU); ctx.fill();
  }

  function drawMotherBoss(r, boss) {
    ctx.rotate(boss.t * .12);
    for (let i = 0; i < 8; i += 1) {
      const a = i / 8 * TAU;
      ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(r * .55, 0, r * .58, r * .2, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * .38, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff9b45"; ctx.beginPath(); ctx.arc(0, 0, r * .13, 0, TAU); ctx.fill();
  }

  function drawChoirBoss(r, boss) {
    for (let i = 0; i < 3; i += 1) {
      const a = boss.t * (i % 2 ? -.22 : .22) + i * TAU / 3;
      ctx.save(); ctx.rotate(a); ctx.translate(r * .52, 0); ctx.rotate(-a); ctx.beginPath(); ctx.moveTo(0, -r * .42); ctx.lineTo(r * .28, r * .3); ctx.lineTo(-r * .28, r * .3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.rotate(-boss.t * .26);
    ctx.beginPath();
    for (let i = 0; i < 9; i += 1) { const a = i / 9 * TAU; const rr = i % 2 ? r * .48 : r * .72; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#fff28a"; ctx.beginPath(); ctx.arc(0, 0, r * .12, 0, TAU); ctx.fill();
  }

  function drawSunBoss(r, boss) {
    ctx.rotate(boss.t * .08);
    for (let i = 0; i < 16; i += 1) {
      const a = i / 16 * TAU;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62); ctx.lineTo(Math.cos(a) * r * (1.08 + (i % 3) * .13), Math.sin(a) * r * (1.08 + (i % 3) * .13)); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * .64, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.rotate(-boss.t * .31);
    ctx.beginPath();
    for (let i = 0; i < 7; i += 1) { const a = i / 7 * TAU; ctx.lineTo(Math.cos(a) * r * .42, Math.sin(a) * r * .42); }
    ctx.closePath(); ctx.stroke();
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .26);
    core.addColorStop(0, "#fff"); core.addColorStop(.35, "#ffd978"); core.addColorStop(1, "rgba(255,76,112,0)");
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, r * .28, 0, TAU); ctx.fill();
  }

  function renderPlayer(alpha) {
    const player = state.player;
    const x = lerp(player.px, player.x, alpha);
    const y = lerp(player.py, player.y, alpha);
    if (player.invuln > 0 && Math.floor(player.invuln * 18) % 2 === 0 && player.hp > 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(player.tilt * .16);
    ctx.globalCompositeOperation = "lighter";
    const vowColor = state.vowId === "bloom" ? "#ff3fa4" : state.vowId === "halo" ? "#ffd978" : "#55f6e8";
    ctx.shadowColor = vowColor;
    ctx.shadowBlur = player.overdrive > 0 ? 28 : 14;
    ctx.fillStyle = "#f6eefc";
    ctx.strokeStyle = vowColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(7, -5);
    ctx.lineTo(18, 11);
    ctx.lineTo(6, 8);
    ctx.lineTo(0, 16);
    ctx.lineTo(-6, 8);
    ctx.lineTo(-18, 11);
    ctx.lineTo(-7, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = vowColor;
    ctx.beginPath(); ctx.moveTo(-5, 11); ctx.lineTo(0, 28 + Math.sin(state.time * 35) * 4); ctx.lineTo(5, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#05030b";
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(4, 4); ctx.lineTo(0, 9); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();

    if (player.closure || options.settings?.alwaysHitbox) {
      ctx.shadowColor = "#ff3fa4";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ff3fa4";
      ctx.beginPath(); ctx.arc(0, 0, player.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, player.r + 4, 0, TAU); ctx.stroke();
    }
    if (player.overdrive > 0) {
      ctx.globalAlpha = .55 + Math.sin(state.time * 20) * .2;
      ctx.strokeStyle = "#ffd978";
      ctx.beginPath(); ctx.arc(0, 0, 27 + Math.sin(state.time * 12) * 3, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  function renderActiveTrail() {
    const player = state.player;
    if (!player.closure || player.trail.length === 0) return;
    const points = [...player.trail, { x: player.x, y: player.y }];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "#f6eefc";
    ctx.shadowColor = "#b365ff";
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.lineDashOffset = -state.time * 38;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = "rgba(85,246,232,.45)";
    ctx.beginPath();
    ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[0].x, points[0].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#55f6e8";
    ctx.beginPath(); ctx.arc(points[0].x, points[0].y, 5 + Math.sin(state.time * 10), 0, TAU); ctx.fill();
    ctx.restore();
  }

  function renderClosureFx() {
    for (const effect of state.closureFx) {
      const progress = 1 - effect.life / effect.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (effect.points?.length) {
        ctx.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1);
        ctx.fillStyle = `${effect.color}${effect.captured ? "22" : "0d"}`;
        ctx.strokeStyle = effect.color;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 18 * (1 - progress);
        ctx.lineWidth = 1 + (1 - progress) * 3;
        pathPolygon(effect.points);
        ctx.fill(); ctx.stroke();
        for (const point of effect.points) {
          ctx.fillStyle = effect.color;
          ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(.5, 3 * (1 - progress)), 0, TAU); ctx.fill();
        }
      } else if (effect.targetRadius) {
        const radius = effect.targetRadius * easeOut(progress);
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = effect.color;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 20;
        ctx.lineWidth = 6 * (1 - progress) + 1;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function pathPolygon(points) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
  }

  function renderParticles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of state.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 2;
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-particle.size * .5, -particle.size * .5, particle.size, particle.size * 2.2);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const item of state.floating) {
      ctx.globalAlpha = clamp(item.life / item.maxLife, 0, 1);
      ctx.fillStyle = item.color;
      ctx.font = `900 ${item.size || 9}px "Arial Narrow", sans-serif`;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }

  function performanceSnapshot() {
    const sorted = [...perfSamples].sort((a, b) => a - b);
    const percentile = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
    return {
      samples: sorted.length,
      p50: Number(percentile(.5).toFixed(2)),
      p95: Number(percentile(.95).toFixed(2)),
      max: Number(perfMax.toFixed(2)),
      droppedSteps,
      cap: bulletCap()
    };
  }

  function snapshot() {
    const stage = stageProfile();
    const boss = state.boss ? {
      id: state.boss.id,
      name: state.boss.name,
      hp: Math.max(0, Number(state.boss.hp.toFixed(2))),
      maxHp: state.boss.maxHp,
      ratio: clamp(state.boss.hp / state.boss.maxHp, 0, 1),
      phase: state.boss.phase,
      phaseName: stage.boss?.phases?.[state.boss.phase]?.name || `VERSE ${roman(state.boss.phase + 1)}`,
      entering: state.boss.entering,
      defeated: state.boss.defeated
    } : null;
    return {
      version: VERSION,
      mode: state.mode,
      seed: state.seed,
      frame: state.frame,
      time: Number(state.time.toFixed(3)),
      runTime: Number(state.runTime.toFixed(3)),
      stageIndex: state.stageIndex,
      stageName: stage.name || "UNKNOWN",
      stageKicker: stage.kicker || `MOVEMENT ${roman(state.stageIndex + 1)}`,
      stageTime: Number(state.stageTime.toFixed(3)),
      vow: state.vowId,
      difficulty: state.difficultyId,
      score: Math.floor(state.score),
      displayedScore: Math.floor(state.displayedScore),
      formattedScore: formatScore(state.displayedScore),
      highScore: Math.max(state.highScore, Math.floor(state.score)),
      flow: Number(state.flow.toFixed(2)),
      maxFlow: Number(state.maxFlow.toFixed(2)),
      chain: state.chain,
      maxChain: state.maxChain,
      grazes: state.grazes,
      captured: state.captured,
      kills: state.kills,
      hits: state.hits,
      closures: state.closures,
      bestClosure: state.bestClosure,
      player: {
        x: Number(state.player.x.toFixed(2)),
        y: Number(state.player.y.toFixed(2)),
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        thread: Number(state.player.thread.toFixed(2)),
        threadMax: state.build.threadMax,
        break: Number(state.player.break.toFixed(2)),
        closure: state.player.closure,
        trailPoints: state.player.trail.length,
        invuln: Number(state.player.invuln.toFixed(2)),
        overdrive: Number(state.player.overdrive.toFixed(2))
      },
      counts: {
        enemies: state.enemies.filter((enemy) => !enemy.dead).length,
        enemyBullets: state.bullets.length,
        bullets: state.bullets.length,
        shots: state.shots.length,
        echoes: state.echoes.length,
        particles: state.particles.length,
        relics: state.relics.length
      },
      relics: [...state.relics],
      boss,
      perf: performanceSnapshot(),
      fatal: state.fatal
    };
  }

  function selfTest() {
    const checks = [];
    const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });
    check("canvas logical dimensions", W === 540 && H === 960);
    check("campaign has four movements", STAGES.length === 4);
    check("all movements have bosses", STAGES.every((stage) => stage.boss?.name && stage.boss?.maxHp > 0));
    check("three Vows available", VOWS.length === 3);
    check("three difficulties available", DIFFICULTIES.length === 3);
    check("relic pool is substantial", RELICS.length >= 9);
    check("point-in-polygon inside", pointInPolygon({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]));
    check("point-in-polygon outside", !pointInPolygon({ x: 15, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]));
    check("polygon area", Math.abs(polygonArea([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]) - 100) < EPS);
    check("finite live state", finiteObject(snapshot()));
    check("bullet cap bounded", bulletCap() >= 400 && bulletCap() <= 1000);
    const failures = checks.filter((item) => !item.ok).map((item) => item.name);
    return { ok: failures.length === 0, checks, failures };
  }

  function ensurePlaying() {
    if (!["playing", "paused", "draft"].includes(state.mode)) start({ vow: state.vowId, difficulty: state.difficultyId, seed: 1337 });
    if (state.mode !== "playing") {
      state.mode = "playing";
      callbacks.mode("playing");
    }
  }

  function runScenario(name, params = {}) {
    ensurePlaying();
    if (name === "closure") {
      state.bullets.length = 0;
      state.echoes.length = 0;
      state.enemies.length = 0;
      state.player.x = W * .5;
      state.player.y = H * .78;
      const polygon = [
        { x: 145, y: 315 }, { x: 395, y: 315 }, { x: 430, y: 565 }, { x: 270, y: 650 }, { x: 110, y: 565 }
      ];
      for (let i = 0; i < 24; i += 1) {
        const angle = i / 24 * TAU;
        const radius = 55 + (i % 4) * 27;
        spawnEnemyBullet(270 + Math.cos(angle) * radius, 465 + Math.sin(angle) * radius, Math.cos(angle) * 8, Math.sin(angle) * 8, { color: i % 2 ? "#ff3fa4" : "#b365ff", r: 4 });
      }
      resolveClosure(polygon);
      return snapshot();
    }
    if (name === "dense" || name === "bullet-hell") {
      state.bullets.length = 0;
      const total = Math.min(bulletCap() - 20, Number(params.count) || 380);
      for (let i = 0; i < total; i += 1) {
        const ring = Math.floor(i / 38);
        const angle = i / 38 * TAU + ring * .11;
        const radius = 42 + ring * 22;
        spawnEnemyBullet(W * .5 + Math.cos(angle) * radius, 210 + Math.sin(angle) * radius * .52, Math.cos(angle) * (85 + ring * 6), Math.sin(angle) * (85 + ring * 6) + 65, { color: i % 3 ? "#ff3fa4" : "#ffd978", r: 3.8 + (i % 3) * .35 });
      }
      return snapshot();
    }
    if (name === "boss") return gotoBoss(params.stage ?? state.stageIndex);
    if (name === "victory") {
      gotoBoss(STAGES.length - 1);
      state.boss.defeated = true;
      state.score += state.boss.score;
      state.bullets.length = 0;
      finishRun(true);
      return snapshot();
    }
    if (name === "gameover" || name === "death") {
      state.player.hp = 1;
      state.player.invuln = 0;
      hitPlayer();
      finishRun(false);
      return snapshot();
    }
    return snapshot();
  }

  function gotoBoss(index = state.stageIndex) {
    ensurePlaying();
    const target = clamp(Number(index) || 0, 0, STAGES.length - 1);
    beginStage(target);
    state.stageTime = 1;
    spawnBoss(target);
    state.boss.y = state.boss.targetY;
    state.boss.py = state.boss.y;
    state.boss.entering = false;
    state.boss.fire = .4;
    return snapshot();
  }

  function step(frames = 1) {
    const count = clamp(Math.floor(Number(frames) || 1), 1, 100000);
    manualStepping = true;
    for (let i = 0; i < count; i += 1) safeUpdate(STEP);
    manualStepping = false;
    render(0);
    return snapshot();
  }

  function setSettings(next = {}) {
    if ("reducedFlash" in next) settings.reducedFlash = Boolean(next.reducedFlash);
    if ("reducedShake" in next) settings.reducedShake = Boolean(next.reducedShake);
    if ("forcedTouch" in next) settings.forcedTouch = Boolean(next.forcedTouch);
    resizeBackingStore();
    return { ...settings };
  }

  function inspect() {
    return snapshot();
  }

  const debug = Object.freeze({
    version: VERSION,
    start,
    restart,
    returnTitle,
    pause,
    resume,
    togglePause,
    setInput,
    setPointer,
    step,
    snapshot,
    inspect,
    selfTest,
    runScenario,
    chooseRelic,
    gotoBoss,
    defeatBoss,
    damageBoss,
    damagePlayer: hitPlayer,
    activateBreak,
    setSettings,
    get state() { return snapshot(); }
  });

  return debug;
}
