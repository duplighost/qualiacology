/* ============================================================================
   AFTERGLOW
   A neon survival roguelite. You are the last spark of a dead star; the dark
   wants the light back. Dash through it for as long as you can.

   Design pillars (in priority order):
     1. Game feel above everything — the dash must feel incredible.
     2. Readability over ornament. Clear silhouettes, distinct colors.
     3. Performance. Pure Canvas2D, object pools, additive glow (no shadowBlur
        in the hot path), capped particles, fixed timestep.
     4. Two-thumb, minimal-button controls that work the same on phone and PC.

   Palette note: meaning is never carried by green-vs-red. Player/allies read
   cyan, threats read magenta/violet, threat-fire reads red-pink, pickups read
   amber. All mutually distinguishable for green-spectrum color deficiency.
   ========================================================================== */
(function () {
"use strict";

/* ----------------------------------------------------------------------------
   0. Tiny helpers / math
   -------------------------------------------------------------------------- */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => (a + Math.random() * (b - a + 1)) | 0;
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const chance = (p) => Math.random() < p;
const hypot = Math.hypot;
const sin = Math.sin, cos = Math.cos, atan2 = Math.atan2, sqrt = Math.sqrt, PI = Math.PI;
const now = () => performance.now();
function angLerp(a, b, t) { let d = ((b - a + PI) % TAU) - PI; if (d < -PI) d += TAU; return a + d * t; }
function approach(v, target, dv) { return v < target ? Math.min(v + dv, target) : Math.max(v - dv, target); }

const COL = {
  bg: "#0a0420", cyan: "#39e6ff", magenta: "#ff2d95", violet: "#a14bff",
  amber: "#ffd24a", white: "#fdf6ff", orange: "#ff8a3c", red: "#ff3b6b",
};

/* localStorage with a guard so private-mode never throws */
const Store = {
  get(k, d) { try { const v = localStorage.getItem("afterglow_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("afterglow_" + k, JSON.stringify(v)); } catch (e) {} },
};

/* ----------------------------------------------------------------------------
   1. Canvas, view, camera
   -------------------------------------------------------------------------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
const ui = document.getElementById("ui");

const view = { w: 0, h: 0, dpr: 1 };
const ARENA = { w: 1750, h: 1750 };
const camera = { x: ARENA.w / 2, y: ARENA.h / 2, scale: 1, shakeX: 0, shakeY: 0 };
let trauma = 0;            // 0..1 screen-shake energy
let flash = 0;            // white impact flash 0..1
let hurtFlash = 0;        // red damage flash 0..1
let timeScale = 1;        // slow-motion multiplier
let timeScaleTarget = 1;
let hitStop = 0;          // seconds of frozen time

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = w; view.h = h; view.dpr = dpr;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  // Constant visible world-span on the short screen axis => fair on any device.
  const TARGET_SPAN = 1180;
  camera.scale = clamp(Math.min(w, h) / TARGET_SPAN, 0.46, 1.5);
  layoutTouch();
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 120));

/* ----------------------------------------------------------------------------
   2. Pre-rendered glow sprites (cheap neon bloom, no per-frame shadowBlur)
   -------------------------------------------------------------------------- */
const glowCache = new Map();
function glow(color) {
  let g = glowCache.get(color);
  if (g) return g;
  const s = 128, c = document.createElement("canvas");
  c.width = c.height = s;
  const x = c.getContext("2d");
  const grd = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, color);
  grd.addColorStop(0.28, color);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = grd;
  x.fillRect(0, 0, s, s);
  glowCache.set(color, c);
  return c;
}
function drawGlow(x, y, r, color, a) {
  const g = glow(color);
  ctx.globalAlpha = a;
  ctx.drawImage(g, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

/* ----------------------------------------------------------------------------
   3. Audio — small synth engine (SFX + an optional pulse of music)
   -------------------------------------------------------------------------- */
const Audio2 = (function () {
  let ac = null, master = null, musicGain = null, sfxGain = null;
  let noiseBuf = null;
  let started = false;
  const S = { sound: Store.get("sound", true), music: Store.get("music", true) };

  function ensure() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    sfxGain = ac.createGain(); sfxGain.gain.value = S.sound ? 0.9 : 0; sfxGain.connect(master);
    musicGain = ac.createGain(); musicGain.gain.value = S.music ? 0.5 : 0; musicGain.connect(master);
    const len = ac.sampleRate * 0.5;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  function resume() { ensure(); if (ac && ac.state === "suspended") ac.resume(); started = true; if (S.music) Music.start(); }

  function tone(freq, dur, type, vol, slideTo, when) {
    if (!ac || !S.sound) return;
    const t = (when || ac.currentTime);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, hp, slideHp) {
    if (!ac || !S.sound) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.setValueAtTime(hp || 600, t);
    if (slideHp) f.frequency.exponentialRampToValueAtTime(slideHp, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // A light, in-time music pulse: bass + sparse arp. Scheduled with lookahead.
  const Music = (function () {
    let on = false, timer = 0, step = 0, next = 0;
    const root = 55; // A1
    const bass = [0, 0, 7, 0, 5, 5, 3, 7];
    const arp = [0, 7, 12, 7, 3, 10, 12, 15];
    function semis(n) { return root * Math.pow(2, n / 12); }
    function schedule() {
      if (!ac) return;
      const spb = 60 / 86;       // ~86 bpm
      const stepDur = spb / 2;   // eighth notes
      while (next < ac.currentTime + 0.2) {
        const i = step % 8;
        // bass
        const bf = semis(bass[i]) ;
        voice(bf, stepDur * 0.95, "sawtooth", 0.16, next, 380);
        // arp every other step
        if (i % 2 === 0) voice(semis(arp[i] + 24), stepDur * 0.6, "square", 0.05, next + stepDur * 0.5, 2200);
        next += stepDur; step++;
      }
    }
    function voice(freq, dur, type, vol, when, lp) {
      const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = lp || 800;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(f); f.connect(g); g.connect(musicGain);
      o.start(when); o.stop(when + dur + 0.05);
    }
    function start() { if (!ac || on) return; on = true; next = ac.currentTime + 0.05; timer = setInterval(schedule, 60); }
    function stop() { on = false; clearInterval(timer); }
    return { start, stop };
  })();

  return {
    resume, S, Music,
    setSound(v) { S.sound = v; Store.set("sound", v); if (sfxGain) sfxGain.gain.value = v ? 0.9 : 0; },
    setMusic(v) { S.music = v; Store.set("music", v); if (musicGain) musicGain.gain.value = v ? 0.5 : 0; if (v && started) Music.start(); else Music.stop(); },
    shoot() { tone(660, 0.08, "square", 0.10, 420); },
    shootBig() { tone(220, 0.18, "sawtooth", 0.16, 90); },
    hit() { noise(0.05, 0.10, 1400); },
    kill() { tone(300, 0.16, "triangle", 0.14, 80); noise(0.10, 0.10, 700); },
    dash() { noise(0.20, 0.18, 300, 2600); tone(520, 0.16, "sine", 0.07, 900); },
    nova() { tone(140, 0.3, "sawtooth", 0.18, 60); noise(0.18, 0.14, 500); },
    pickup() { tone(880, 0.06, "sine", 0.06, 1320); },
    hurt() { tone(150, 0.22, "sawtooth", 0.22, 50); noise(0.12, 0.14, 300); },
    level() { [0, 4, 7, 12].forEach((n, i) => tone(440 * Math.pow(2, n / 12), 0.16, "triangle", 0.12, null, ac ? ac.currentTime + i * 0.06 : 0)); },
    boss() { tone(70, 0.7, "sawtooth", 0.25, 50); },
    bossDie() { [12, 7, 4, 0].forEach((n, i) => tone(220 * Math.pow(2, n / 12), 0.3, "sawtooth", 0.18, null, ac ? ac.currentTime + i * 0.1 : 0)); noise(0.5, 0.2, 400); },
    shrine() { [0, 5, 9].forEach((n, i) => tone(330 * Math.pow(2, n / 12), 0.25, "sine", 0.12, null, ac ? ac.currentTime + i * 0.08 : 0)); },
  };
})();

/* ----------------------------------------------------------------------------
   4. Object pools (particles, bullets, floaters, afterimages)
   -------------------------------------------------------------------------- */
const particles = [], pPool = [];
function spawnParticle(x, y, vx, vy, life, size, color, kind) {
  const p = pPool.pop() || {};
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
  p.size = size; p.color = color; p.kind = kind || 0; p.drag = 0.9;
  particles.push(p);
  return p;
}
function burst(x, y, n, color, spd, size, life) {
  n = Math.min(n, 34);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.9);
    spawnParticle(x, y, cos(a) * s, sin(a) * s, life * (0.6 + Math.random() * 0.7),
      size * (0.6 + Math.random() * 0.8), color, 0);
  }
}
function ring(x, y, n, color, spd, size, life) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    spawnParticle(x, y, cos(a) * spd, sin(a) * spd, life, size, color, 1);
  }
}

const floaters = [], fPool = [];
function floater(x, y, text, color, size) {
  const f = fPool.pop() || {};
  f.x = x; f.y = y; f.text = text; f.color = color; f.life = 0.9; f.max = 0.9;
  f.size = size || 16; f.vy = -42;
  floaters.push(f);
}

const afterimages = [];
function afterimage(x, y, ang, color) {
  afterimages.push({ x, y, ang, life: 0.32, max: 0.32, color });
}

/* ----------------------------------------------------------------------------
   5. World state
   -------------------------------------------------------------------------- */
let state = "menu"; // menu | playing | levelup | gate | paused | dead
const bullets = [];     // player bullets
const ebullets = [];    // enemy bullets
const enemies = [];
const pickups = [];
const breakables = [];
const telegraphs = [];
let shrine = null;

let wave = 0, score = 0, best = Store.get("best", 0), bestWave = Store.get("bestwave", 0);
let combo = 0, comboTimer = 0, runStarlight = 0, kills = 0;
let betweenWaves = 0, levelQueue = 0, gateOffered = false;
let bgClock = 0, gameTime = 0;

const director = { queue: [], spawnTimer: 0, spawnGap: 0.5, active: false, bossAlive: false, eliteWave: false, rewardMult: 1 };

/* ----------------------------------------------------------------------------
   6. Player
   -------------------------------------------------------------------------- */
const player = {
  x: ARENA.w / 2, y: ARENA.h / 2, vx: 0, vy: 0, r: 16,
  hp: 100, maxHp: 100,
  speed: 318, accel: 17,
  fireT: 0, fireInterval: 0.155, damage: 9, bulletSpeed: 820, bulletRange: 760, bulletR: 6,
  projectiles: 2, spread: 0.07, pierce: 0, ricochet: 0,
  crit: 0.04, critMult: 2,
  dr: 0, lifesteal: 0, magnet: 150, starlightMult: 1,
  overEvery: 0, overCount: 0,
  slowAura: 0, orbitals: 0, orbA: 0,
  dashCd: 0, dashCdMax: 0.78, dashTime: 0.16, dashSpeed: 2150,
  dashing: false, dashT: 0, dashDir: { x: 1, y: 0 }, spin: 0, iframes: 0,
  novaDash: false, novaDmg: 26,
  adrenaline: 0, adrenT: 0,
  facing: 0, aim: { x: 1, y: 0 },
  hurtCD: 0, revives: 0,
  xp: 0, xpNeed: 8, level: 1,
  boons: {}, picks: [],
};
function resetPlayer() {
  Object.assign(player, {
    x: ARENA.w / 2, y: ARENA.h / 2, vx: 0, vy: 0, r: 16,
    hp: 100, maxHp: 100, speed: 318, accel: 17,
    fireT: 0, fireInterval: 0.155, damage: 9, bulletSpeed: 820, bulletRange: 760, bulletR: 6,
    projectiles: 2, spread: 0.07, pierce: 0, ricochet: 0, crit: 0.04, critMult: 2,
    dr: 0, lifesteal: 0, magnet: 150, starlightMult: 1, overEvery: 0, overCount: 0,
    slowAura: 0, orbitals: 0, orbA: 0,
    dashCd: 0, dashCdMax: 0.78, dashTime: 0.16, dashSpeed: 2150,
    dashing: false, dashT: 0, spin: 0, iframes: 0, novaDash: false, novaDmg: 26,
    adrenaline: 0, adrenT: 0, facing: 0, hurtCD: 0, revives: 0,
    xp: 0, xpNeed: 8, level: 1, boons: {}, picks: [],
  });
  player.dashDir = { x: 1, y: 0 }; player.aim = { x: 1, y: 0 };
}

/* ----------------------------------------------------------------------------
   7. Input — keyboard + mouse + multitouch virtual sticks
   -------------------------------------------------------------------------- */
const input = {
  keys: {}, mouse: { x: 0, y: 0, has: false },
  move: { x: 0, y: 0 }, moveMag: 0,
  aim: { x: 1, y: 0 }, aimActive: false,
  dashBuffer: 0, isTouch: false,
};
const sticks = { move: null, aim: null }; // {id, ox, oy, x, y}
const touchUI = { dash: { x: 0, y: 0, r: 46 }, pause: { x: 0, y: 0, r: 22 } };

function layoutTouch() {
  const sbB = 18, sb = 14;
  touchUI.dash.x = view.w - 74; touchUI.dash.y = view.h - 92;
  touchUI.dash.r = 48;
  touchUI.pause.x = view.w - 30; touchUI.pause.y = 30 + (window.visualViewport ? 0 : 0);
}

addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  input.keys[k] = true;
  if (k === " " || k === "shift" || k === "j") { input.dashBuffer = 0.14; e.preventDefault(); }
  if (k === "p" || k === "escape") togglePause();
  if (k === "m") { Audio2.setSound(!Audio2.S.sound); }
  if (state === "menu" && (k === "enter" || k === " ")) startGame();
  if (state === "dead" && (k === "enter" || k === " ")) startGame();
});
addEventListener("keyup", (e) => { input.keys[e.key.toLowerCase()] = false; });

canvas.addEventListener("mousemove", (e) => {
  if (input.isTouch) return;
  input.mouse.x = e.clientX; input.mouse.y = e.clientY; input.mouse.has = true;
});
canvas.addEventListener("mousedown", (e) => {
  if (input.isTouch) return;
  if (e.button === 2) { input.dashBuffer = 0.14; e.preventDefault(); }
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function ptInCircle(px, py, c) { const dx = px - c.x, dy = py - c.y; return dx * dx + dy * dy <= c.r * c.r * 1.6; }

canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch") input.isTouch = true;
  if (state !== "playing") return;
  if (e.pointerType !== "touch") return; // mouse handled separately
  e.preventDefault();
  const x = e.clientX, y = e.clientY;
  // dash button?
  if (ptInCircle(x, y, touchUI.dash)) { input.dashBuffer = 0.14; e.target.setPointerCapture(e.pointerId); return; }
  if (ptInCircle(x, y, touchUI.pause)) { togglePause(); return; }
  if (x < view.w * 0.5) {
    if (!sticks.move) sticks.move = { id: e.pointerId, ox: x, oy: y, x, y };
  } else {
    if (!sticks.aim) sticks.aim = { id: e.pointerId, ox: x, oy: y, x, y, t: now(), moved: 0 };
  }
}, { passive: false });

canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "touch") return;
  const x = e.clientX, y = e.clientY;
  if (sticks.move && sticks.move.id === e.pointerId) { sticks.move.x = x; sticks.move.y = y; }
  else if (sticks.aim && sticks.aim.id === e.pointerId) {
    sticks.aim.moved = Math.max(sticks.aim.moved, hypot(x - sticks.aim.ox, y - sticks.aim.oy));
    sticks.aim.x = x; sticks.aim.y = y;
  }
}, { passive: false });

function endPointer(e) {
  if (e.pointerType !== "touch") return;
  if (sticks.move && sticks.move.id === e.pointerId) sticks.move = null;
  else if (sticks.aim && sticks.aim.id === e.pointerId) {
    // a quick tap that never became a drag = dash (two-thumb dash on the aim side)
    const s = sticks.aim;
    if (s.moved < 16 && now() - s.t < 200) input.dashBuffer = 0.14;
    sticks.aim = null;
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

function readInput() {
  // Movement
  let mx = 0, my = 0;
  if (input.isTouch && sticks.move) {
    let dx = sticks.move.x - sticks.move.ox, dy = sticks.move.y - sticks.move.oy;
    const m = hypot(dx, dy), dead = 8, maxR = 64;
    if (m > dead) { const s = Math.min(m, maxR) / maxR; mx = (dx / m) * s; my = (dy / m) * s; }
  } else {
    if (input.keys["a"] || input.keys["arrowleft"]) mx -= 1;
    if (input.keys["d"] || input.keys["arrowright"]) mx += 1;
    if (input.keys["w"] || input.keys["arrowup"]) my -= 1;
    if (input.keys["s"] || input.keys["arrowdown"]) my += 1;
    const m = hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  }
  input.move.x = mx; input.move.y = my; input.moveMag = hypot(mx, my);

  // Aim
  if (input.isTouch) {
    if (sticks.aim && sticks.aim.moved >= 16) {
      let dx = sticks.aim.x - sticks.aim.ox, dy = sticks.aim.y - sticks.aim.oy;
      const m = hypot(dx, dy);
      if (m > 6) { input.aim.x = dx / m; input.aim.y = dy / m; input.aimActive = true; }
    } else input.aimActive = false;
  } else if (input.mouse.has) {
    const wx = camera.x + (input.mouse.x - view.w / 2) / camera.scale;
    const wy = camera.y + (input.mouse.y - view.h / 2) / camera.scale;
    let dx = wx - player.x, dy = wy - player.y; const m = hypot(dx, dy);
    if (m > 1) { input.aim.x = dx / m; input.aim.y = dy / m; input.aimActive = true; }
  } else input.aimActive = false;
}

/* ----------------------------------------------------------------------------
   8. Bullets
   -------------------------------------------------------------------------- */
const bPool = [];
function spawnBullet(x, y, ang, opt) {
  const b = bPool.pop() || {};
  b.x = x; b.y = y; b.px = x; b.py = y;
  b.vx = cos(ang) * opt.speed; b.vy = sin(ang) * opt.speed;
  b.dmg = opt.dmg; b.r = opt.r; b.life = opt.range / opt.speed;
  b.pierce = opt.pierce; b.ricochet = opt.ricochet; b.crit = opt.crit;
  b.big = opt.big || false; b.hitList = null;
  bullets.push(b);
}
const ebPool = [];
function spawnEBullet(x, y, ang, speed, dmg, r) {
  const b = ebPool.pop() || {};
  b.x = x; b.y = y; b.vx = cos(ang) * speed; b.vy = sin(ang) * speed;
  b.dmg = dmg; b.r = r || 9; b.life = 5;
  ebullets.push(b);
}

/* ----------------------------------------------------------------------------
   9. Pickups (starlight = xp/score motes)
   -------------------------------------------------------------------------- */
function spawnPickup(x, y, val, kind) {
  pickups.push({
    x, y, vx: rand(-60, 60), vy: rand(-60, 60),
    val, kind: kind || "star", r: kind === "heart" ? 12 : 7, t: rand(0, TAU), pulled: false,
    life: kind === "heart" ? 999 : 18,
  });
}
function dropStarlight(x, y, amount) {
  let n = clamp(Math.round(amount), 1, 7);
  const per = amount / n;
  for (let i = 0; i < n; i++) spawnPickup(x + rand(-14, 14), y + rand(-14, 14), per, "star");
}

/* ----------------------------------------------------------------------------
   10. Breakables — non-blocking neon crystals. Pure juice + a little starlight.
   -------------------------------------------------------------------------- */
function scatterBreakables(n) {
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = rand(120, ARENA.w - 120); y = rand(120, ARENA.h - 120); tries++; }
    while (hypot(x - player.x, y - player.y) < 260 && tries < 12);
    breakables.push({ x, y, r: rand(15, 24), hp: 8, t: rand(0, TAU), color: pick([COL.violet, COL.cyan, COL.magenta]), dead: 0 });
  }
}
function shatterBreakable(b) {
  b.dead = 1;
  burst(b.x, b.y, 14, b.color, 240, 4, 0.5);
  ring(b.x, b.y, 8, COL.white, 150, 3, 0.3);
  Audio2.hit();
  if (chance(0.7)) dropStarlight(b.x, b.y, rand(1, 3));
  addShake(0.06);
}

/* ----------------------------------------------------------------------------
   11. Enemies
   -------------------------------------------------------------------------- */
const ENEMY = {
  blip:     { hp: 14, speed: 158, r: 13, dmg: 8,  score: 12, xp: 2, color: COL.magenta, mass: 0.6 },
  husk:     { hp: 95, speed: 66,  r: 30, dmg: 16, score: 36, xp: 7, color: COL.violet,  mass: 2.4 },
  dart:     { hp: 26, speed: 116, r: 16, dmg: 15, score: 24, xp: 4, color: COL.cyan,    mass: 0.9 },
  wisp:     { hp: 34, speed: 92,  r: 18, dmg: 0,  score: 28, xp: 5, color: COL.white,   mass: 0.8 },
  splitter: { hp: 46, speed: 104, r: 22, dmg: 12, score: 26, xp: 5, color: COL.amber,   mass: 1.3 },
};
function diffHp(w) { return 1 + 0.085 * (w - 1); }
function diffSpeed(w) { return Math.min(1 + 0.014 * (w - 1), 1.55); }
function diffDmg(w) { return Math.min(1 + 0.035 * (w - 1), 2.2); }

function makeEnemy(type, x, y) {
  const d = ENEMY[type];
  const e = {
    type, x, y, vx: 0, vy: 0, r: d.r, color: d.color, mass: d.mass,
    hp: d.hp * diffHp(wave), maxHp: d.hp * diffHp(wave),
    speed: d.speed * diffSpeed(wave), dmg: d.dmg * diffDmg(wave),
    score: d.score, xp: d.xp, flash: 0, t: rand(0, TAU), state: 0, sT: 0,
    boss: false, anim: 0,
  };
  return e;
}
function makeBoss(x, y) {
  const bossNum = Math.floor(wave / 5);
  const hp = 1400 + bossNum * 900;
  return {
    type: "warden", x, y, vx: 0, vy: 0, r: 64, color: COL.magenta, mass: 30,
    hp, maxHp: hp, speed: 58 * Math.min(1 + bossNum * 0.05, 1.3), dmg: 24 * diffDmg(wave),
    score: 600 + bossNum * 200, xp: 60, flash: 0, t: 0, state: 0, sT: 2, phase: 0,
    boss: true, anim: 0, screen: COL.magenta,
  };
}

function spawnTelegraph(type, x, y) {
  telegraphs.push({ x, y, t: 0, max: type === "warden" ? 1.4 : 0.75, type });
}
function updateTelegraphs(dt) {
  for (let i = telegraphs.length - 1; i >= 0; i--) {
    const g = telegraphs[i]; g.t += dt;
    if (g.t >= g.max) {
      const e = g.type === "warden" ? makeBoss(g.x, g.y) : makeEnemy(g.type, g.x, g.y);
      enemies.push(e);
      if (g.type === "warden") { director.bossAlive = true; Audio2.boss(); addShake(0.5); }
      ring(g.x, g.y, 12, e.color, 320, 4, 0.4);
      telegraphs.splice(i, 1);
    }
  }
}
function aliveCount() {
  let n = enemies.length + director.queue.length;
  for (const g of telegraphs) if (g.type) n++;
  return n;
}

function damageEnemy(e, dmg, fromX, fromY, kb, isCrit) {
  e.hp -= dmg; e.flash = 1;
  if (e.mass < 8) {
    const a = atan2(e.y - fromY, e.x - fromX);
    e.vx += cos(a) * kb / e.mass; e.vy += sin(a) * kb / e.mass;
  }
  spawnParticle(e.x, e.y, rand(-40, 40), rand(-40, 40), 0.3, isCrit ? 5 : 3, isCrit ? COL.amber : COL.white, 0);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  const idx = enemies.indexOf(e); if (idx < 0) return;
  enemies.splice(idx, 1);
  kills++;
  combo++; comboTimer = 3.4;
  const mult = comboMult();
  const gained = Math.round(e.score * mult);
  score += gained;
  if (e.boss) {
    director.bossAlive = false;
    bossDeathSequence(e);
  } else {
    burst(e.x, e.y, 18, e.color, 300, 4, 0.6);
    ring(e.x, e.y, 10, COL.white, 220, 3, 0.35);
    Audio2.kill(); addShake(0.12);
  }
  if (mult >= 2) floater(e.x, e.y - e.r, "+" + gained + (mult >= 2 ? "  x" + mult.toFixed(1) : ""), COL.amber, 14 + Math.min(mult, 6));
  dropStarlight(e.x, e.y, e.xp);
  if (player.lifesteal) healPlayer(player.lifesteal);
  if (player.adrenaline) { player.adrenT = Math.min(player.adrenT + 0.5, 3); }
  if (e.type === "splitter") for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU, c = makeEnemy("blip", e.x + cos(a) * 18, e.y + sin(a) * 18);
    c.hp = c.maxHp = 12; enemies.push(c);
  }
}
function bossDeathSequence(e) {
  timeScaleTarget = 0.18; setTimeout(() => { timeScaleTarget = 1; }, 700);
  for (let i = 0; i < 5; i++) setTimeout(() => burst(e.x + rand(-40, 40), e.y + rand(-40, 40), 30, pick([COL.magenta, COL.cyan, COL.amber, COL.white]), 420, 6, 1.0), i * 90);
  ring(e.x, e.y, 26, COL.white, 360, 6, 0.8);
  flash = 1; addShake(0.9); hitStop = Math.max(hitStop, 0.12); Audio2.bossDie();
  dropStarlight(e.x, e.y, 24);
  spawnPickup(e.x, e.y, 0, "heart");
  floater(e.x, e.y - 40, "WARDEN DOWN", COL.amber, 26);
}

function updateEnemy(e, dt) {
  e.flash = Math.max(0, e.flash - dt * 5);
  e.anim += dt;
  const dxp = player.x - e.x, dyp = player.y - e.y, dp = hypot(dxp, dyp) || 1;
  const nx = dxp / dp, ny = dyp / dp;
  let slow = 1;
  if (player.slowAura && dp < player.slowAura) slow = 0.55;

  if (e.boss) { updateBoss(e, dt, nx, ny, dp); }
  else switch (e.type) {
    case "blip": {
      const wob = sin(e.anim * 7 + e.t) * 0.5;
      e.vx += (nx * e.speed - e.vx) * 6 * dt + (-ny) * wob * 40 * dt;
      e.vy += (ny * e.speed - e.vy) * 6 * dt + (nx) * wob * 40 * dt;
      break;
    }
    case "husk": {
      e.vx += (nx * e.speed - e.vx) * 3 * dt;
      e.vy += (ny * e.speed - e.vy) * 3 * dt;
      break;
    }
    case "dart": {
      if (e.state === 0) { // approach
        e.vx += (nx * e.speed - e.vx) * 4 * dt; e.vy += (ny * e.speed - e.vy) * 4 * dt;
        if (dp < 320) { e.state = 1; e.sT = 0.5; e.aimx = nx; e.aimy = ny; }
      } else if (e.state === 1) { // wind-up telegraph
        e.vx *= 0.86; e.vy *= 0.86; e.sT -= dt;
        e.aimx = e.aimx; // locked
        if (e.sT <= 0) { e.state = 2; e.sT = 0.32; const a = atan2(player.y - e.y, player.x - e.x); e.vx = cos(a) * 980; e.vy = sin(a) * 980; }
      } else { // dash
        e.sT -= dt; e.vx *= 0.92; e.vy *= 0.92; if (e.sT <= 0) e.state = 0;
      }
      break;
    }
    case "wisp": {
      const want = 300;
      if (dp < want - 40) { e.vx += (-nx * e.speed - e.vx) * 3 * dt; e.vy += (-ny * e.speed - e.vy) * 3 * dt; }
      else { e.vx += (-ny * e.speed * 0.6 - e.vx) * 2 * dt; e.vy += (nx * e.speed * 0.6 - e.vy) * 2 * dt; }
      e.sT -= dt;
      if (e.sT <= 0) { e.sT = 1.8; const a = atan2(dyp, dxp); spawnEBullet(e.x, e.y, a, 230, 12 * diffDmg(wave), 9); ring(e.x, e.y, 5, COL.red, 80, 2, 0.2); Audio2.shoot(); }
      break;
    }
    case "splitter": {
      e.vx += (nx * e.speed - e.vx) * 3.4 * dt; e.vy += (ny * e.speed - e.vy) * 3.4 * dt;
      break;
    }
  }
  e.vx *= slow; e.vy *= slow;
  e.x += e.vx * dt; e.y += e.vy * dt;
  // soft arena bounds
  e.x = clamp(e.x, e.r, ARENA.w - e.r); e.y = clamp(e.y, e.r, ARENA.h - e.r);
}

function updateBoss(e, dt, nx, ny, dp) {
  e.t += dt; e.sT -= dt;
  e.phaseHp = e.hp / e.maxHp;
  // drift toward player, slow
  e.vx += (nx * e.speed - e.vx) * 1.5 * dt;
  e.vy += (ny * e.speed - e.vy) * 1.5 * dt;
  if (e.charging) {
    e.vx *= 0.99; e.vy *= 0.99; e.chargeT -= dt;
    if (e.chargeT <= 0) { e.charging = false; e.sT = 1.2; }
    return;
  }
  if (e.sT <= 0) {
    const atk = (e.atkI = ((e.atkI || 0) + 1)) % 3;
    const speedup = e.phaseHp < 0.5 ? 0.7 : 1;
    if (atk === 0) { // radial ring
      e.screen = COL.cyan;
      const n = e.phaseHp < 0.5 ? 22 : 14;
      const off = Math.random() * TAU;
      for (let i = 0; i < n; i++) spawnEBullet(e.x, e.y, off + (i / n) * TAU, 200, e.dmg, 10);
      Audio2.shootBig(); addShake(0.2); e.sT = 1.8 * speedup;
    } else if (atk === 1) { // summon adds
      e.screen = COL.violet;
      for (let i = 0; i < 4; i++) { const a = Math.random() * TAU; spawnTelegraph("blip", e.x + cos(a) * 80, e.y + sin(a) * 80); }
      e.sT = 2.2 * speedup;
    } else { // charge
      e.screen = COL.magenta;
      e.charging = true; e.chargeT = 0.55; const a = atan2(player.y - e.y, player.x - e.x);
      setTimeout(() => { e.vx = cos(a) * 720; e.vy = sin(a) * 720; }, 520);
      addShake(0.3); e.sT = 1.5 * speedup;
    }
  }
  e.x = clamp(e.x, e.r, ARENA.w - e.r); e.y = clamp(e.y, e.r, ARENA.h - e.r);
}

/* ----------------------------------------------------------------------------
   12. Player actions — fire, dash, hurt, heal, xp
   -------------------------------------------------------------------------- */
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD ? maxD * maxD : Infinity;
  for (const e of enemies) { const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function resolveAim() {
  if (input.aimActive) { player.aim.x = input.aim.x; player.aim.y = input.aim.y; player.facing = atan2(player.aim.y, player.aim.x); return true; }
  const ne = nearestEnemy(player.x, player.y, 900);
  if (ne) { const a = atan2(ne.y - player.y, ne.x - player.x); player.aim.x = cos(a); player.aim.y = sin(a); player.facing = a; return true; }
  return false; // no target
}
function tryFire(dt) {
  player.fireT -= dt;
  const hasTarget = resolveAim();
  if (!hasTarget || enemies.length === 0) return;
  if (player.fireT > 0) return;
  let interval = player.fireInterval;
  if (player.adrenaline && player.adrenT > 0) interval *= 1 / (1 + 0.25 * player.adrenT);
  player.fireT = interval;

  const base = player.facing;
  const n = player.projectiles;
  player.overCount++;
  const overShot = player.overEvery > 0 && player.overCount % player.overEvery === 0;
  const muzzleX = player.x + cos(base) * (player.r + 6), muzzleY = player.y + sin(base) * (player.r + 6);
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * player.spread;
    const isCrit = Math.random() < player.crit;
    const dmg = player.damage * (isCrit ? player.critMult : 1) * (overShot ? 3 : 1);
    spawnBullet(muzzleX, muzzleY, base + off, {
      speed: player.bulletSpeed * (overShot ? 0.8 : 1), dmg, r: player.bulletR * (overShot ? 2 : 1),
      range: player.bulletRange, pierce: player.pierce + (overShot ? 3 : 0), ricochet: player.ricochet, crit: isCrit, big: overShot,
    });
  }
  spawnParticle(muzzleX, muzzleY, cos(base) * 120, sin(base) * 120, 0.12, 5, COL.cyan, 0);
  if (overShot) Audio2.shootBig(); else Audio2.shoot();
}

function startDash() {
  if (player.dashCd > 0 || player.dashing) return;
  let dx = input.move.x, dy = input.move.y;
  if (input.moveMag < 0.2) { dx = player.aim.x; dy = player.aim.y; }
  const m = hypot(dx, dy) || 1; dx /= m; dy /= m;
  player.dashDir.x = dx; player.dashDir.y = dy;
  player.facing = atan2(dy, dx);
  player.dashing = true; player.dashT = player.dashTime;
  player.iframes = Math.max(player.iframes, player.dashTime + 0.08);
  player.dashCd = player.dashCdMax; player.spin = 0;
  burst(player.x, player.y, 12, COL.cyan, 260, 4, 0.4);
  Audio2.dash(); addShake(0.12);
}
function updateDash(dt) {
  if (!player.dashing) return;
  player.dashT -= dt;
  const k = clamp(player.dashT / player.dashTime, 0, 1);
  const sp = player.dashSpeed * (0.35 + 0.65 * k); // ease-out
  player.x += player.dashDir.x * sp * dt;
  player.y += player.dashDir.y * sp * dt;
  player.spin += (TAU / player.dashTime) * dt; // a full 360 across the dash
  afterimage(player.x, player.y, player.facing + player.spin, COL.cyan);
  if (player.novaDash) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const rr = e.r + player.r + 10;
      if ((e.x - player.x) ** 2 + (e.y - player.y) ** 2 < rr * rr) {
        if (!e._novaHit) { e._novaHit = 1; damageEnemy(e, player.novaDmg, player.x, player.y, 360, true); }
      }
    }
  }
  for (const b of breakables) if (!b.dead && (b.x - player.x) ** 2 + (b.y - player.y) ** 2 < (b.r + player.r + 6) ** 2) shatterBreakable(b);
  if (player.dashT <= 0) {
    player.dashing = false; player.spin = 0;
    player.vx = player.dashDir.x * 240; player.vy = player.dashDir.y * 240;
    if (player.novaDash) { ring(player.x, player.y, 16, COL.cyan, 320, 5, 0.5); Audio2.nova(); addShake(0.18); for (const e of enemies) e._novaHit = 0; }
    ring(player.x, player.y, 8, COL.white, 180, 3, 0.3); addShake(0.05);
  }
}
function hurtPlayer(dmg, fromX, fromY) {
  if (player.iframes > 0 || player.hurtCD > 0) return;
  dmg *= (1 - player.dr);
  player.hp -= dmg;
  player.iframes = 0.8; player.hurtCD = 0.3;
  const a = atan2(player.y - fromY, player.x - fromX);
  player.vx += cos(a) * 320; player.vy += sin(a) * 320;
  hurtFlash = 1; addShake(0.4); hitStop = Math.max(hitStop, 0.06); Audio2.hurt();
  combo = 0; comboTimer = 0;
  burst(player.x, player.y, 14, COL.red, 240, 4, 0.5);
  if (player.hp <= 0) {
    if (player.revives > 0) {
      player.revives--; player.hp = player.maxHp * 0.5; player.iframes = 2.2;
      ring(player.x, player.y, 24, COL.amber, 360, 6, 0.8); flash = 1; floater(player.x, player.y - 30, "SECOND WIND", COL.amber, 22); Audio2.shrine();
    } else die();
  }
}
function healPlayer(a) { player.hp = Math.min(player.maxHp, player.hp + a); }

function gainXp(v) {
  player.xp += v; runStarlight += v;
  while (player.xp >= player.xpNeed) {
    player.xp -= player.xpNeed; player.level++;
    player.xpNeed = Math.round(player.xpNeed * 1.22 + 4);
    levelQueue++;
  }
}

/* ----------------------------------------------------------------------------
   13. Boons (the "relics")
   -------------------------------------------------------------------------- */
const BOONS = [
  { id: "rapid", name: "Rapid Fire", ic: "⚡", rare: false, max: 6, desc: () => "Fire 14% faster.", apply: p => p.fireInterval *= 0.86 },
  { id: "heavy", name: "Heavy Caliber", ic: "◆", rare: false, max: 6, desc: () => "+30% bullet damage.", apply: p => p.damage *= 1.3 },
  { id: "split", name: "Split Shot", ic: "✦", rare: false, max: 5, desc: () => "+1 projectile.", apply: p => { p.projectiles = Math.min(p.projectiles + 1, 9); p.spread = Math.min(p.spread + 0.005, 0.13); } },
  { id: "pierce", name: "Piercing", ic: "➤", rare: false, max: 4, desc: () => "Bullets pass through +1 enemy.", apply: p => p.pierce++ },
  { id: "ricochet", name: "Ricochet", ic: "⟁", rare: false, max: 3, desc: () => "Bullets bounce to a nearby foe.", apply: p => p.ricochet++ },
  { id: "fleet", name: "Fleet", ic: "➶", rare: false, max: 5, desc: () => "+11% move speed.", apply: p => p.speed *= 1.11 },
  { id: "quick", name: "Quick Pulse", ic: "✧", rare: false, max: 5, desc: () => "-18% dash cooldown.", apply: p => p.dashCdMax *= 0.82 },
  { id: "vital", name: "Vitality", ic: "❤", rare: false, max: 8, desc: () => "+28 max life, and heal.", apply: p => { p.maxHp += 28; healPlayer(28); } },
  { id: "crit", name: "Critical", ic: "◈", rare: false, max: 6, desc: () => "+12% critical chance.", apply: p => p.crit = Math.min(p.crit + 0.12, 0.8) },
  { id: "long", name: "Long Shot", ic: "◇", rare: false, max: 4, desc: () => "+22% bullet speed & range.", apply: p => { p.bulletSpeed *= 1.22; p.bulletRange *= 1.18; } },
  { id: "siphon", name: "Siphon", ic: "⊚", rare: false, max: 5, desc: () => "Heal 2 life per kill.", apply: p => p.lifesteal += 2 },
  { id: "magnet", name: "Magnet Heart", ic: "✱", rare: false, max: 4, desc: () => "+50% pickup range, +20% starlight.", apply: p => { p.magnet *= 1.5; p.starlightMult += 0.2; } },
  { id: "bulwark", name: "Bulwark", ic: "▣", rare: false, max: 4, desc: () => "Take 12% less damage.", apply: p => p.dr = Math.min(p.dr + 0.12, 0.6) },
  { id: "slow", name: "Slow Aura", ic: "❉", rare: false, max: 4, desc: () => "Foes near you move slower.", apply: p => p.slowAura += 95 },
  { id: "nova", name: "Nova Dash", ic: "✸", rare: true, max: 4, desc: p => p.novaDash ? "+Nova damage." : "Your dash shreds and knocks back.", apply: p => { if (!p.novaDash) p.novaDash = true; else p.novaDmg += 20; } },
  { id: "orbital", name: "Orbital Shard", ic: "●", rare: true, max: 4, desc: () => "A shard orbits you, cutting foes.", apply: p => p.orbitals++ },
  { id: "over", name: "Overcharge", ic: "✺", rare: true, max: 3, desc: () => "Every few shots fire a heavy slug.", apply: p => p.overEvery = p.overEvery ? Math.max(3, p.overEvery - 1) : 6 },
  { id: "adren", name: "Adrenaline", ic: "⚝", rare: true, max: 1, desc: () => "Kills briefly ramp your fire rate.", apply: p => p.adrenaline = true },
  { id: "second", name: "Second Wind", ic: "☼", rare: true, max: 2, desc: () => "Cheat death once. Revive at half life.", apply: p => p.revives++ },
];
function boonLevel(id) { return player.boons[id] || 0; }
function offerBoons(count, forceRare) {
  const avail = BOONS.filter(b => boonLevel(b.id) < b.max);
  const rares = avail.filter(b => b.rare), commons = avail.filter(b => !b.rare);
  const out = [];
  function take(pool) { if (!pool.length) return; const i = (Math.random() * pool.length) | 0; out.push(pool.splice(i, 1)[0]); }
  if (forceRare) take(rares.length ? rares : commons);
  while (out.length < count && (commons.length || rares.length)) {
    if (rares.length && (chance(0.28) || !commons.length)) take(rares); else take(commons.length ? commons : rares);
  }
  return out;
}
function applyBoon(b) {
  b.apply(player);
  player.boons[b.id] = boonLevel(b.id) + 1;
  player.picks.push(b.id);
  burst(player.x, player.y, 18, b.rare ? COL.amber : COL.cyan, 280, 4, 0.6);
  ring(player.x, player.y, 10, COL.white, 200, 3, 0.4);
}

/* ----------------------------------------------------------------------------
   14. Shrines — a diegetic gamble. Dash in for a rare boon at the cost of life.
   -------------------------------------------------------------------------- */
function maybeSpawnShrine() {
  if (shrine || chance(0.55)) return;
  let x, y, tries = 0;
  do { x = rand(220, ARENA.w - 220); y = rand(220, ARENA.h - 220); tries++; } while (hypot(x - player.x, y - player.y) < 320 && tries < 14);
  shrine = { x, y, r: 26, t: 0, taken: 0 };
}
function takeShrine() {
  shrine.taken = 1;
  const cost = Math.min(player.maxHp * 0.2, player.hp - 1);
  if (cost > 0) player.hp -= cost;
  const b = offerBoons(1, true)[0];
  if (b) applyBoon(b);
  burst(shrine.x, shrine.y, 28, COL.amber, 360, 6, 0.9); flash = 0.6; addShake(0.3);
  floater(shrine.x, shrine.y - 30, (b ? b.name.toUpperCase() : "BLESSED") + "  -" + Math.round(cost), COL.amber, 20);
  Audio2.shrine();
}

/* ----------------------------------------------------------------------------
   15. Director — waves, spawning, pacing
   -------------------------------------------------------------------------- */
function startWave(n) {
  wave = n;
  director.queue.length = 0;
  director.active = true;
  director.spawnTimer = 0.4;
  breakables.length = 0;
  scatterBreakables(randInt(4, 7));
  if (n % 5 === 0) { // boss wave
    director.spawnGap = 0.6;
    const cx = clamp(player.x + rand(-200, 200), 300, ARENA.w - 300);
    spawnTelegraph("warden", clamp(player.x + 500, 200, ARENA.w - 200), clamp(player.y - 300, 200, ARENA.h - 200));
    for (let i = 0; i < 3 + Math.floor(n / 5); i++) director.queue.push("blip");
  } else {
    director.spawnGap = Math.max(0.22, 0.55 - n * 0.02);
    const q = director.queue;
    const budget = 6 + n * 2.2 + (director.eliteWave ? n : 0);
    let spent = 0;
    const types = [["blip", 1]];
    if (n >= 2) types.push(["husk", 4]);
    if (n >= 3) types.push(["dart", 2]);
    if (n >= 4) types.push(["wisp", 3]);
    if (n >= 6) types.push(["splitter", 3]);
    while (spent < budget) { const t = pick(types); q.push(t[0]); spent += t[1]; }
    // shuffle
    for (let i = q.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = q[i]; q[i] = q[j]; q[j] = tmp; }
  }
}
function spawnPos() {
  // spawn at a ring around the player, biased to screen edges, clamped to arena
  const a = Math.random() * TAU, d = rand(560, 760);
  let x = clamp(player.x + cos(a) * d, 90, ARENA.w - 90);
  let y = clamp(player.y + sin(a) * d, 90, ARENA.h - 90);
  return { x, y };
}
function updateDirector(dt) {
  if (betweenWaves > 0) {
    betweenWaves -= dt;
    if (betweenWaves <= 0) startWave(wave + 1);
    return;
  }
  if (!director.active) return;
  director.spawnTimer -= dt;
  const cap = director.bossAlive ? 18 : 42;
  if (director.queue.length && director.spawnTimer <= 0 && enemies.length + telegraphs.length < cap) {
    const t = director.queue.shift();
    const p = spawnPos(); spawnTelegraph(t, p.x, p.y);
    director.spawnTimer = director.spawnGap * rand(0.7, 1.2);
  }
  // wave cleared?
  if (director.queue.length === 0 && telegraphs.length === 0 && enemies.length === 0 && !director.bossAlive) {
    onWaveClear();
  }
}
function onWaveClear() {
  director.active = false;
  director.eliteWave = false;
  const bonus = 30 + wave * 8;
  score += bonus;
  floater(player.x, player.y - 50, "WAVE " + wave + " CLEAR  +" + bonus, COL.cyan, 22);
  healPlayer(player.maxHp * 0.06);
  if (wave % 3 === 0) maybeSpawnShrine();
  betweenWaves = 1.7;
}

/* ----------------------------------------------------------------------------
   16. Collisions & world update
   -------------------------------------------------------------------------- */
function addShake(a) { trauma = Math.min(1, trauma + a * settings.shake); }

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.px = b.x; b.py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let dead = b.life <= 0 || b.x < -40 || b.y < -40 || b.x > ARENA.w + 40 || b.y > ARENA.h + 40;
    if (!dead) {
      // vs breakables (non-blocking: shatter but bullet continues)
      for (const k of breakables) if (!k.dead && (k.x - b.x) ** 2 + (k.y - b.y) ** 2 < (k.r + b.r) ** 2) shatterBreakable(k);
      // vs enemies
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        const rr = e.r + b.r;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
          if (b.hitList && b.hitList.indexOf(e) >= 0) continue;
          damageEnemy(e, b.dmg, b.px, b.py, b.big ? 420 : 150, b.crit);
          Audio2.hit();
          if (b.ricochet > 0) {
            b.ricochet--; if (!b.hitList) b.hitList = []; b.hitList.push(e);
            const nx = nearestEnemyExcluding(b.x, b.y, b.hitList, 360);
            if (nx) { const a = atan2(nx.y - b.y, nx.x - b.x); const sp = hypot(b.vx, b.vy); b.vx = cos(a) * sp; b.vy = sin(a) * sp; }
            break;
          }
          if (b.pierce > 0) { b.pierce--; if (!b.hitList) b.hitList = []; b.hitList.push(e); continue; }
          dead = true; break;
        }
      }
    }
    if (dead) { bullets.splice(i, 1); bPool.push(b); }
  }
}
function nearestEnemyExcluding(x, y, list, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of enemies) { if (list.indexOf(e) >= 0) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function updateEBullets(dt) {
  for (let i = ebullets.length - 1; i >= 0; i--) {
    const b = ebullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let dead = b.life <= 0 || b.x < -30 || b.y < -30 || b.x > ARENA.w + 30 || b.y > ARENA.h + 30;
    if (!dead && player.iframes <= 0) {
      const rr = player.r + b.r;
      if ((player.x - b.x) ** 2 + (player.y - b.y) ** 2 < rr * rr) { hurtPlayer(b.dmg, b.x, b.y); dead = true; }
    }
    if (dead) { ebullets.splice(i, 1); ebPool.push(b); }
  }
}
function updateEnemiesContact(dt) {
  for (const e of enemies) {
    const rr = e.r + player.r;
    if ((e.x - player.x) ** 2 + (e.y - player.y) ** 2 < rr * rr) {
      if (e.type !== "wisp" && player.iframes <= 0) hurtPlayer(e.dmg, e.x, e.y);
      // separate
      const a = atan2(e.y - player.y, e.x - player.x);
      if (e.mass < 8) { e.vx += cos(a) * 120; e.vy += sin(a) * 120; }
    }
  }
}
function updateOrbitals(dt) {
  if (!player.orbitals) return;
  player.orbA += dt * 3.2;
  const R = 64;
  for (let i = 0; i < player.orbitals; i++) {
    const a = player.orbA + (i / player.orbitals) * TAU;
    const ox = player.x + cos(a) * R, oy = player.y + sin(a) * R;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const rr = e.r + 12;
      if ((e.x - ox) ** 2 + (e.y - oy) ** 2 < rr * rr) {
        if (!e._orbCd || e._orbCd <= 0) { damageEnemy(e, player.damage * 0.5, ox, oy, 120, false); e._orbCd = 0.25; }
      }
    }
  }
  for (let j = 0; j < enemies.length; j++) if (enemies[j]._orbCd > 0) enemies[j]._orbCd -= dt;
}
function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.t += dt; p.life -= dt;
    if (p.life <= 0 && !p.pulled) { pickups.splice(i, 1); continue; }
    const dx = player.x - p.x, dy = player.y - p.y, d = hypot(dx, dy);
    const range = player.magnet * (p.kind === "heart" ? 1.4 : 1);
    if (d < range || p.pulled) { p.pulled = true; const s = lerp(180, 760, 1 - clamp(d / range, 0, 1)); p.vx += (dx / d) * s * dt * 6; p.vy += (dy / d) * s * dt * 6; }
    p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx * dt; p.y += p.vy * dt;
    if (d < player.r + p.r + 4) {
      if (p.kind === "heart") { healPlayer(player.maxHp * 0.35); floater(player.x, player.y - 24, "+LIFE", COL.magenta, 16); }
      else { gainXp(p.val * player.starlightMult); }
      spawnParticle(player.x, player.y, 0, -60, 0.3, 4, COL.amber, 0);
      Audio2.pickup();
      pickups.splice(i, 1);
    }
  }
}
function comboMult() { return 1 + Math.floor(combo / 5) * 0.5; }

function updatePlayer(dt) {
  // movement (skipped while dashing — dash drives position)
  if (!player.dashing) {
    const tvx = input.move.x * player.speed, tvy = input.move.y * player.speed;
    const acc = player.accel * dt;
    player.vx += (tvx - player.vx) * Math.min(1, acc);
    player.vy += (tvy - player.vy) * Math.min(1, acc);
    if (input.moveMag < 0.05) { player.vx *= 0.86; player.vy *= 0.86; }
    player.x += player.vx * dt; player.y += player.vy * dt;
  }
  player.x = clamp(player.x, player.r, ARENA.w - player.r);
  player.y = clamp(player.y, player.r, ARENA.h - player.r);

  if (input.dashBuffer > 0) { input.dashBuffer -= dt; if (player.dashCd <= 0 && !player.dashing) { startDash(); input.dashBuffer = 0; } }
  updateDash(dt);

  player.dashCd = Math.max(0, player.dashCd - dt);
  player.iframes = Math.max(0, player.iframes - dt);
  player.hurtCD = Math.max(0, player.hurtCD - dt);
  if (player.adrenaline) player.adrenT = Math.max(0, player.adrenT - dt * 0.6);

  tryFire(dt);

  // shrine pickup
  if (shrine && !shrine.taken) { shrine.t += dt; if ((shrine.x - player.x) ** 2 + (shrine.y - player.y) ** 2 < (shrine.r + player.r) ** 2) takeShrine(); }
}

function update(dt) {
  gameTime += dt;
  readInput();
  updatePlayer(dt);
  for (const e of enemies) updateEnemy(e, dt);
  updateTelegraphs(dt);
  updateBullets(dt);
  updateEBullets(dt);
  updateEnemiesContact(dt);
  updateOrbitals(dt);
  updatePickups(dt);
  updateDirector(dt);

  // breakables cleanup
  for (let i = breakables.length - 1; i >= 0; i--) { const b = breakables[i]; b.t += dt; if (b.dead) breakables.splice(i, 1); }

  // combo decay
  if (combo > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }

  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); pPool.push(p); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= p.drag; p.vy *= p.drag;
  }
  for (let i = afterimages.length - 1; i >= 0; i--) { const a = afterimages[i]; a.life -= dt; if (a.life <= 0) afterimages.splice(i, 1); }
  for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.life -= dt; f.y += f.vy * dt; f.vy *= 0.92; if (f.life <= 0) { floaters.splice(i, 1); fPool.push(f); } }

  // queued level-ups -> open the boon menu (one at a time)
  if (levelQueue > 0 && state === "playing") openLevelUp();

  // camera follow with slight aim lookahead
  const lookX = player.aim.x * 70, lookY = player.aim.y * 70;
  camera.x = lerp(camera.x, clampCam(player.x + lookX, view.w), 0.12);
  camera.y = lerp(camera.y, clampCam(player.y + lookY, view.h, true), 0.12);
}
function clampCam(v, screen, isY) {
  const half = (isY ? view.h : view.w) / 2 / camera.scale;
  const max = (isY ? ARENA.h : ARENA.w) - half;
  if (half * 2 > (isY ? ARENA.h : ARENA.w)) return (isY ? ARENA.h : ARENA.w) / 2;
  return clamp(v, half, max);
}

/* ----------------------------------------------------------------------------
   17. Rendering
   -------------------------------------------------------------------------- */
function render() {
  const dpr = view.dpr;
  // decay visual-only signals using real-ish frame time
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // background
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, view.w, view.h);
  drawBackdrop();

  // world transform (+ shake)
  const sh = trauma * trauma;
  camera.shakeX = (Math.random() * 2 - 1) * 22 * sh;
  camera.shakeY = (Math.random() * 2 - 1) * 22 * sh;
  ctx.save();
  ctx.translate(view.w / 2 + camera.shakeX, view.h / 2 + camera.shakeY);
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x, -camera.y);

  drawArena();
  drawBreakables();
  if (shrine && !shrine.taken) drawShrine();
  drawPickups();
  drawEBullets();
  drawBullets();
  drawEnemies();
  drawTelegraphs();
  drawPlayer();
  drawParticles();
  drawFloaters();

  ctx.restore();

  // screen-space overlays
  drawVignette();
  if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + (flash * 0.5) + ")"; ctx.fillRect(0, 0, view.w, view.h); }
  if (hurtFlash > 0) { ctx.fillStyle = "rgba(255,59,107," + (hurtFlash * 0.4) + ")"; ctx.fillRect(0, 0, view.w, view.h); }
  if (state === "playing" || state === "paused" || state === "levelup" || state === "gate") drawHUD();

  // decay
  trauma = Math.max(0, trauma - 0.016 * 1.6);
  flash = Math.max(0, flash - 0.05);
  hurtFlash = Math.max(0, hurtFlash - 0.04);
}

function drawBackdrop() {
  // drifting star dots (parallax), cheap
  const t = bgClock;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 46; i++) {
    const sx = (i * 97.13 + t * (8 + (i % 5) * 4)) % (view.w + 40) - 20;
    const sy = (i * 53.7 + t * 3) % (view.h + 40) - 20;
    const s = (i % 3) + 1;
    ctx.fillStyle = i % 4 === 0 ? COL.magenta : i % 4 === 1 ? COL.cyan : "#6a5aa0";
    ctx.globalAlpha = 0.25 + (i % 3) * 0.12;
    ctx.fillRect(sx, sy, s, s);
  }
  ctx.globalAlpha = 1;
}
function drawArena() {
  // floor glow grid (square neon grid)
  const grid = 90;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(120,80,210,0.16)";
  ctx.beginPath();
  for (let x = 0; x <= ARENA.w; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.h); }
  for (let y = 0; y <= ARENA.h; y += grid) { ctx.moveTo(0, y); ctx.lineTo(ARENA.w, y); }
  ctx.stroke();
  // border
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = COL.violet; ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, ARENA.w, ARENA.h);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "rgba(161,75,255,0.5)"; ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, ARENA.w - 12, ARENA.h - 12);
}
function drawBreakables() {
  ctx.globalCompositeOperation = "lighter";
  for (const b of breakables) {
    const pulse = 0.8 + sin(b.t * 3) * 0.2;
    drawGlow(b.x, b.y, b.r * 1.7, b.color, 0.5 * pulse);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.t * 0.4);
    ctx.fillStyle = b.color; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const r = b.r * (i % 2 ? 0.6 : 1); ctx[i ? "lineTo" : "moveTo"](cos(a) * r, sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = COL.white; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }
  ctx.globalCompositeOperation = "source-over";
}
function drawShrine() {
  const s = shrine; s._a = (s._a || 0);
  ctx.globalCompositeOperation = "lighter";
  const pulse = 0.7 + sin(s.t * 4) * 0.3;
  drawGlow(s.x, s.y, 70, COL.amber, 0.5 * pulse);
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.t * 0.8);
  ctx.strokeStyle = COL.amber; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; ctx.moveTo(0, 0); ctx.lineTo(cos(a) * 24, sin(a) * 24); }
  ctx.stroke();
  ctx.fillStyle = COL.white; ctx.beginPath(); ctx.arc(0, 0, 8 * pulse, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
}
function drawPickups() {
  ctx.globalCompositeOperation = "lighter";
  for (const p of pickups) {
    if (p.kind === "heart") {
      drawGlow(p.x, p.y, 26, COL.magenta, 0.7);
      ctx.fillStyle = COL.magenta; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(PI / 4);
      ctx.fillRect(-6, -6, 12, 12); ctx.beginPath(); ctx.arc(-6, 0, 6, 0, TAU); ctx.arc(0, -6, 6, 0, TAU); ctx.fill(); ctx.restore();
    } else {
      const tw = 0.7 + sin(p.t * 6) * 0.3;
      const fade = p.life < 2 ? clamp(p.life / 2, 0, 1) : 1;
      drawGlow(p.x, p.y, 13, COL.amber, 0.7 * tw * fade);
      ctx.globalAlpha = fade;
      ctx.fillStyle = COL.amber; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(PI / 4);
      ctx.fillRect(-3.2, -3.2, 6.4, 6.4); ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  ctx.globalCompositeOperation = "source-over";
}
function drawBullets() {
  ctx.globalCompositeOperation = "lighter";
  for (const b of bullets) {
    drawGlow(b.x, b.y, b.r * 3, COL.cyan, 0.5);
    ctx.strokeStyle = COL.white; ctx.lineWidth = b.r * 1.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = COL.cyan; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}
function drawEBullets() {
  ctx.globalCompositeOperation = "lighter";
  for (const b of ebullets) {
    drawGlow(b.x, b.y, b.r * 2.6, COL.red, 0.6);
    ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.white; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}
function drawTelegraphs() {
  ctx.globalCompositeOperation = "lighter";
  for (const g of telegraphs) {
    const k = g.t / g.max;
    const r = lerp(8, g.type === "warden" ? 80 : 30, k);
    const col = g.type === "warden" ? COL.magenta : COL.red;
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5 + 0.5 * sin(g.t * 18); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(g.x, g.y, r * k, 0, TAU); ctx.fillStyle = col; ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawEnemies() {
  for (const e of enemies) {
    if (e.boss) { drawBoss(e); continue; }
    ctx.globalCompositeOperation = "lighter";
    drawGlow(e.x, e.y, e.r * 2.1, e.color, 0.45);
    ctx.globalCompositeOperation = "source-over";
    ctx.save(); ctx.translate(e.x, e.y);
    const fc = e.flash > 0.1 ? COL.white : e.color;
    switch (e.type) {
      case "blip": {
        ctx.fillStyle = fc; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
        ctx.fillStyle = "#0a0420";
        const ex = 4; ctx.beginPath(); ctx.arc(-ex, -2, 2.4, 0, TAU); ctx.arc(ex, -2, 2.4, 0, TAU); ctx.fill();
        break;
      }
      case "husk": {
        // haunted CRT: rounded box with a screen face
        roundRect(-e.r, -e.r * 0.86, e.r * 2, e.r * 1.72, 7); ctx.fillStyle = fc; ctx.fill();
        ctx.fillStyle = "#140a2e"; roundRect(-e.r * 0.7, -e.r * 0.55, e.r * 1.4, e.r * 1.05, 4); ctx.fill();
        ctx.fillStyle = e.flash > 0.1 ? COL.white : COL.cyan;
        ctx.fillRect(-e.r * 0.42, -e.r * 0.2, e.r * 0.3, e.r * 0.3); ctx.fillRect(e.r * 0.12, -e.r * 0.2, e.r * 0.3, e.r * 0.3);
        ctx.fillRect(-e.r * 0.4, e.r * 0.3, e.r * 0.8, 3);
        break;
      }
      case "dart": {
        ctx.rotate(atan2(e.vy, e.vx));
        if (e.state === 1) { ctx.globalAlpha = 0.5 + 0.5 * sin(e.anim * 30); }
        ctx.fillStyle = e.state === 1 ? COL.white : fc;
        ctx.beginPath(); ctx.moveTo(e.r, 0); ctx.lineTo(-e.r * 0.7, e.r * 0.7); ctx.lineTo(-e.r * 0.3, 0); ctx.lineTo(-e.r * 0.7, -e.r * 0.7); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case "wisp": {
        ctx.fillStyle = fc; ctx.globalAlpha = 0.92;
        ctx.beginPath(); ctx.arc(0, -e.r * 0.2, e.r, PI, 0);
        const w = e.r, base = e.r * 0.9;
        for (let i = 0; i <= 4; i++) { const xx = w - (i / 4) * 2 * w; const yy = base + (i % 2 ? e.r * 0.4 : 0); ctx.lineTo(xx, yy); }
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = "#1a0f33"; ctx.beginPath(); ctx.arc(-e.r * 0.35, -e.r * 0.25, 3, 0, TAU); ctx.arc(e.r * 0.35, -e.r * 0.25, 3, 0, TAU); ctx.fill();
        break;
      }
      case "splitter": {
        ctx.fillStyle = fc; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#0a0420"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -e.r); ctx.lineTo(0, e.r); ctx.stroke();
        ctx.fillStyle = "#0a0420"; ctx.beginPath(); ctx.arc(-e.r * 0.4, -2, 2.4, 0, TAU); ctx.arc(e.r * 0.4, -2, 2.4, 0, TAU); ctx.fill();
        break;
      }
    }
    ctx.restore();
    // tiny hp pip for tanky foes
    if (e.maxHp > 40 && e.hp < e.maxHp) {
      const w = e.r * 1.6, h = 3.5, x = e.x - w / 2, y = e.y - e.r - 9;
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = COL.cyan; ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);
    }
  }
}
function drawBoss(e) {
  ctx.globalCompositeOperation = "lighter";
  drawGlow(e.x, e.y, e.r * 2.2, e.screen || COL.magenta, 0.5 + 0.2 * sin(e.t * 4));
  ctx.globalCompositeOperation = "source-over";
  ctx.save(); ctx.translate(e.x, e.y);
  const fc = e.flash > 0.1 ? COL.white : COL.violet;
  // cabinet body
  roundRect(-e.r, -e.r, e.r * 2, e.r * 2, 16); ctx.fillStyle = fc; ctx.fill();
  // screen
  ctx.fillStyle = "#0c0626"; roundRect(-e.r * 0.74, -e.r * 0.8, e.r * 1.48, e.r * 1.2, 10); ctx.fill();
  ctx.fillStyle = e.screen || COL.magenta; ctx.globalAlpha = 0.85;
  const eo = e.r * 0.34, ey = -e.r * 0.28, es = e.r * 0.2;
  ctx.fillRect(-eo - es, ey, es * 1.5, es * 1.5); ctx.fillRect(eo - es * 0.5, ey, es * 1.5, es * 1.5);
  ctx.fillRect(-e.r * 0.3, e.r * 0.05, e.r * 0.6, 5);
  ctx.globalAlpha = 1;
  // control deck
  ctx.fillStyle = fc; roundRect(-e.r * 0.9, e.r * 0.5, e.r * 1.8, e.r * 0.4, 6); ctx.fill();
  if (e.charging) { ctx.strokeStyle = COL.magenta; ctx.lineWidth = 4; ctx.globalAlpha = 0.5 + 0.5 * sin(e.t * 30); ctx.beginPath(); ctx.arc(0, 0, e.r + 10, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function drawPlayer() {
  // afterimages
  ctx.globalCompositeOperation = "lighter";
  for (const a of afterimages) {
    const k = a.life / a.max; ctx.globalAlpha = k * 0.4;
    drawSpark(a.x, a.y, a.ang, 1, true);
  }
  ctx.globalAlpha = 1;

  // orbitals
  if (player.orbitals) {
    for (let i = 0; i < player.orbitals; i++) {
      const a = player.orbA + (i / player.orbitals) * TAU;
      const ox = player.x + cos(a) * 64, oy = player.y + sin(a) * 64;
      drawGlow(ox, oy, 16, COL.cyan, 0.7);
      ctx.fillStyle = COL.white; ctx.beginPath(); ctx.arc(ox, oy, 5, 0, TAU); ctx.fill();
    }
  }
  // slow aura
  if (player.slowAura) { drawGlow(player.x, player.y, player.slowAura, COL.violet, 0.06); }

  drawGlow(player.x, player.y, player.r * 2.4, COL.cyan, player.iframes > 0 ? 0.4 + 0.3 * sin(now() / 40) : 0.6);
  ctx.globalCompositeOperation = "source-over";

  const blink = player.iframes > 0 && (Math.floor(now() / 70) % 2 === 0) && !player.dashing;
  if (!blink) drawSpark(player.x, player.y, player.facing + player.spin, 1, false);

  // dash-ready ring under feet
  ctx.globalCompositeOperation = "lighter";
  const ready = player.dashCd <= 0;
  ctx.strokeStyle = ready ? COL.cyan : "rgba(120,90,200,0.5)";
  ctx.lineWidth = 2.5; ctx.beginPath();
  const frac = ready ? 1 : 1 - player.dashCd / player.dashCdMax;
  ctx.arc(player.x, player.y, player.r + 9, -PI / 2, -PI / 2 + frac * TAU); ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}
function drawSpark(x, y, ang, scale, ghost) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const r = player.r;
  // twin barrels
  ctx.fillStyle = ghost ? COL.cyan : COL.white;
  ctx.fillRect(r * 0.4, -r * 0.5, r * 0.7, r * 0.26);
  ctx.fillRect(r * 0.4, r * 0.24, r * 0.7, r * 0.26);
  // diamond body
  ctx.fillStyle = COL.cyan;
  ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.lineTo(0, -r); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COL.white; ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawParticles() {
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    const k = p.life / p.max;
    drawGlow(p.x, p.y, p.size * (1 + (1 - k) * 2) + 3, p.color, k * 0.8);
  }
  ctx.globalCompositeOperation = "source-over";
}
function drawFloaters() {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of floaters) {
    const k = f.life / f.max;
    ctx.globalAlpha = clamp(k * 1.4, 0, 1);
    ctx.font = "900 " + f.size + "px Segoe UI, sans-serif";
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
function drawVignette() {
  const g = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.4, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
  const lowHp = player.hp / player.maxHp;
  if (state === "playing" && lowHp < 0.33) {
    const pulse = 0.2 + 0.2 * sin(now() / 180);
    ctx.fillStyle = "rgba(255,45,149," + (pulse * (1 - lowHp / 0.33)) + ")";
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

/* ----------------------------------------------------------------------------
   18. HUD (canvas, screen space — no reflow, always in sync)
   -------------------------------------------------------------------------- */
function drawHUD() {
  const pad = 14 + safeTop();
  // top XP bar (full width, thin, amber)
  const xpFrac = clamp(player.xp / player.xpNeed, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(0, 0, view.w, 5);
  ctx.fillStyle = COL.amber; ctx.fillRect(0, 0, view.w * xpFrac, 5);

  // HP (top-left)
  const hx = 14, hy = pad + 4, hw = Math.min(220, view.w * 0.4), hh = 16;
  ctx.fillStyle = "rgba(0,0,0,0.45)"; roundRect(hx, hy, hw, hh, 7); ctx.fill();
  const hpFrac = clamp(player.hp / player.maxHp, 0, 1);
  ctx.fillStyle = hpFrac < 0.33 ? COL.magenta : COL.cyan; roundRect(hx, hy, hw * hpFrac, hh, 7); ctx.fill();
  ctx.fillStyle = COL.white; ctx.font = "800 12px Segoe UI, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(Math.ceil(player.hp) + " / " + player.maxHp, hx + 8, hy + hh / 2 + 1);
  ctx.font = "700 11px Segoe UI, sans-serif"; ctx.fillStyle = "#bda9e6"; ctx.fillText("LV " + player.level, hx + 2, hy + hh + 12);

  // score (top-right)
  ctx.textAlign = "right";
  ctx.font = "900 26px Segoe UI, sans-serif"; ctx.fillStyle = COL.white;
  ctx.fillText(score.toLocaleString(), view.w - 14, hy + 12);
  ctx.font = "700 11px Segoe UI, sans-serif"; ctx.fillStyle = "#9fb6c9";
  ctx.fillText("BEST " + best.toLocaleString(), view.w - 14, hy + 30);

  // wave + combo (top center)
  ctx.textAlign = "center";
  ctx.font = "900 18px Segoe UI, sans-serif"; ctx.fillStyle = COL.cyan;
  ctx.fillText(betweenWaves > 0 ? "WAVE " + (wave + 1) : "WAVE " + wave, view.w / 2, hy + 6);
  if (combo >= 5) {
    const m = comboMult();
    ctx.font = "900 22px Segoe UI, sans-serif";
    ctx.fillStyle = COL.amber; ctx.globalAlpha = 0.5 + 0.5 * (comboTimer / 3.4);
    ctx.fillText("x" + m.toFixed(1), view.w / 2, hy + 28);
    ctx.globalAlpha = 1;
  }

  // boss bar
  const boss = enemies.find(e => e.boss);
  if (boss) {
    const bw = Math.min(view.w * 0.7, 520), bx = view.w / 2 - bw / 2, by = hy + 40;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; roundRect(bx, by, bw, 12, 6); ctx.fill();
    ctx.fillStyle = COL.magenta; roundRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 12, 6); ctx.fill();
    ctx.fillStyle = COL.white; ctx.font = "800 10px Segoe UI, sans-serif"; ctx.fillText("THE WARDEN", view.w / 2, by + 6);
  }

  // touch controls
  if (input.isTouch) drawTouchControls();
}
function drawTouchControls() {
  // sticks
  if (sticks.move) drawStick(sticks.move, COL.cyan);
  if (sticks.aim && sticks.aim.moved >= 16) drawStick(sticks.aim, COL.magenta);
  // dash button
  const d = touchUI.dash;
  ctx.globalCompositeOperation = "lighter";
  const ready = player.dashCd <= 0;
  drawGlow(d.x, d.y, d.r * 1.4, ready ? COL.cyan : "#5a4a90", 0.5);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = ready ? COL.cyan : "rgba(150,120,220,0.6)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.stroke();
  if (!ready) { ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, -PI / 2, -PI / 2 + (1 - player.dashCd / player.dashCdMax) * TAU); ctx.stroke(); }
  ctx.fillStyle = ready ? COL.white : "#9a8bd0"; ctx.font = "800 13px Segoe UI, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("DASH", d.x, d.y);
  // pause
  const p = touchUI.pause;
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(p.x - 6, p.y - 7, 4, 14); ctx.fillRect(p.x + 2, p.y - 7, 4, 14);
}
function drawStick(s, color) {
  let dx = s.x - s.ox, dy = s.y - s.oy; const m = hypot(dx, dy), max = 64;
  if (m > max) { dx = dx / m * max; dy = dy / m * max; }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.ox, s.oy, max, 0, TAU); ctx.stroke();
  ctx.globalCompositeOperation = "lighter"; drawGlow(s.ox + dx, s.oy + dy, 34, color, 0.5); ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(s.ox + dx, s.oy + dy, 22, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}
function safeTop() { return 0; }

/* ----------------------------------------------------------------------------
   19. UI / menus (DOM overlay)
   -------------------------------------------------------------------------- */
const settings = { shake: Store.get("shake", 1) };
let pendingMenu = null; // lets a headless harness resolve choice menus
function clearUI() { ui.innerHTML = ""; ui.classList.remove("show"); }
function showUI(html) { ui.innerHTML = html; ui.classList.add("show"); }

function menu() {
  state = "menu";
  showUI(`
    <div class="panel">
      <div class="title">AFTERGLOW</div>
      <div class="tag">dash through the dark</div>
      <div class="stat-row">
        <div class="stat"><div class="k">Best</div><div class="v">${best.toLocaleString()}</div></div>
        <div class="stat"><div class="k">Deepest</div><div class="v amber">WAVE ${bestWave}</div></div>
      </div>
      <button class="btn" id="play">Play</button>
      <div class="opts">
        <button class="opt ${Audio2.S.sound ? "on" : ""}" id="o-sound"><span class="dot">●</span>Sound</button>
        <button class="opt ${Audio2.S.music ? "on" : ""}" id="o-music"><span class="dot">●</span>Music</button>
        <button class="opt ${settings.shake ? "on" : ""}" id="o-shake"><span class="dot">●</span>Shake</button>
      </div>
      <div class="hint">
        <b>Move</b> ${touchHint("left thumb", "WASD / arrows")} &nbsp;•&nbsp;
        <b>Aim & fire</b> ${touchHint("right thumb", "mouse, auto-fire")}<br>
        <b>Dash</b> ${touchHint("dash button or tap-flick right", "Space / Shift / right-click")} — i-frames through anything.
      </div>
      <div class="foot">survive · level up · go deeper</div>
    </div>`);
  document.getElementById("play").onclick = () => { Audio2.resume(); startGame(); };
  wireToggles();
}
function touchHint(t, m) { return input.isTouch ? t : m; }
function wireToggles() {
  const s = document.getElementById("o-sound"), mu = document.getElementById("o-music"), sh = document.getElementById("o-shake");
  if (s) s.onclick = () => { Audio2.resume(); Audio2.setSound(!Audio2.S.sound); s.classList.toggle("on", Audio2.S.sound); };
  if (mu) mu.onclick = () => { Audio2.resume(); Audio2.setMusic(!Audio2.S.music); mu.classList.toggle("on", Audio2.S.music); };
  if (sh) sh.onclick = () => { settings.shake = settings.shake ? 0 : 1; Store.set("shake", settings.shake); sh.classList.toggle("on", !!settings.shake); };
}

function startGame() {
  clearUI();
  pendingMenu = null;
  resetPlayer();
  enemies.length = bullets.length = ebullets.length = pickups.length = breakables.length = telegraphs.length = particles.length = floaters.length = afterimages.length = 0;
  director.bossAlive = false; director.eliteWave = false; shrine = null;
  wave = 0; score = 0; combo = 0; comboTimer = 0; runStarlight = 0; kills = 0; levelQueue = 0; betweenWaves = 0; gameTime = 0;
  camera.x = player.x; camera.y = player.y;
  Audio2.resume();
  state = "playing";
  startWave(1);
}

function openLevelUp() {
  levelQueue--;
  state = "levelup";
  timeScaleTarget = 1;
  Audio2.level();
  const opts = offerBoons(3, false);
  if (!opts.length) { state = "playing"; return; }
  cardMenu("LEVEL " + player.level, "Choose a boon", opts, (b) => { applyBoon(b); resumeFromMenu(); });
}
function cardMenu(heading, sub, opts, onPick) {
  const cards = opts.map((b, i) => `
    <button class="card ${b.rare ? "rare" : ""}" data-i="${i}">
      <div class="ic">${b.ic}</div>
      <div class="tx">
        <div class="nm">${b.name}${boonLevel(b.id) ? `<span class="lvl">LV ${boonLevel(b.id) + 1}</span>` : ""}</div>
        <div class="ds">${typeof b.desc === "function" ? b.desc(player) : b.desc}</div>
      </div>
    </button>`).join("");
  showUI(`<div class="panel"><div class="heading">${heading}</div><div class="sub">${sub}</div><div class="cards">${cards}</div></div>`);
  pendingMenu = (i) => { pendingMenu = null; clearUI(); onPick(opts[i || 0]); };
  ui.querySelectorAll(".card").forEach((el) => {
    el.onclick = () => { pendingMenu = null; const b = opts[+el.dataset.i]; clearUI(); onPick(b); };
  });
}
function resumeFromMenu() {
  if (levelQueue > 0) { openLevelUp(); return; }
  clearUI(); state = "playing";
}

function togglePause() {
  if (state === "playing") {
    state = "paused";
    showUI(`
      <div class="panel">
        <div class="heading">Paused</div>
        <div class="sub">Wave ${wave} · ${score.toLocaleString()} pts</div>
        <button class="btn" id="resume">Resume</button>
        <div class="opts">
          <button class="opt ${Audio2.S.sound ? "on" : ""}" id="o-sound"><span class="dot">●</span>Sound</button>
          <button class="opt ${Audio2.S.music ? "on" : ""}" id="o-music"><span class="dot">●</span>Music</button>
          <button class="opt ${settings.shake ? "on" : ""}" id="o-shake"><span class="dot">●</span>Shake</button>
        </div>
        <button class="btn ghost" id="quit">Quit to menu</button>
      </div>`);
    document.getElementById("resume").onclick = () => { clearUI(); state = "playing"; };
    document.getElementById("quit").onclick = () => { saveRecords(); menu(); };
    wireToggles();
  } else if (state === "paused") { clearUI(); state = "playing"; }
}

function die() {
  state = "dead";
  Audio2.bossDie();
  burst(player.x, player.y, 30, COL.cyan, 360, 6, 1.0); flash = 1; addShake(0.8);
  saveRecords();
  setTimeout(() => {
    showUI(`
      <div class="panel gameover">
        <div class="title">FADED</div>
        <div class="tag">the dark took the light</div>
        <div class="stat-row">
          <div class="stat"><div class="k">Score</div><div class="v">${score.toLocaleString()}</div></div>
          <div class="stat"><div class="k">Wave</div><div class="v amber">${wave}</div></div>
          <div class="stat"><div class="k">Kills</div><div class="v">${kills}</div></div>
        </div>
        ${score >= best && score > 0 ? `<div class="sub" style="color:var(--amber)">★ NEW BEST ★</div>` : ""}
        <button class="btn magenta" id="again">Play again</button>
        <button class="btn ghost" id="menu">Menu</button>
      </div>`);
    document.getElementById("again").onclick = () => startGame();
    document.getElementById("menu").onclick = () => menu();
  }, 700);
}
function saveRecords() {
  if (score > best) { best = score; Store.set("best", best); }
  if (wave > bestWave) { bestWave = wave; Store.set("bestwave", bestWave); }
  Store.set("runs", Store.get("runs", 0) + 1);
}

/* ----------------------------------------------------------------------------
   20. Main loop — fixed timestep with hitstop + slow-mo
   -------------------------------------------------------------------------- */
const STEP = 1 / 60;
let acc = 0, last = now();
function frame(t) {
  requestAnimationFrame(frame);
  let real = (t - last) / 1000; last = t;
  if (real > 0.25) real = 0.25;
  bgClock += real;

  // ease global time scale toward target (slow-mo)
  timeScale = approach(timeScale, timeScaleTarget, real * 3.5);

  if (hitStop > 0) { hitStop -= real; render(); return; }

  if (state === "playing") {
    acc += real * timeScale;
    let n = 0;
    while (acc >= STEP && n < 5 && state === "playing") { update(STEP); acc -= STEP; n++; }
    if (n >= 5) acc = 0;
  } else {
    // keep camera & particles gently alive behind menus
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= real; if (p.life <= 0) { particles.splice(i, 1); pPool.push(p); } else { p.x += p.vx * real; p.y += p.vy * real; p.vx *= p.drag; p.vy *= p.drag; } }
  }
  render();
}

/* ----------------------------------------------------------------------------
   21. Boot
   -------------------------------------------------------------------------- */
document.addEventListener("visibilitychange", () => { if (document.hidden && state === "playing") togglePause(); });
window.addEventListener("pointerdown", () => Audio2.resume(), { once: true });
resize();
menu();
requestAnimationFrame(frame);

/* Debug handle — harmless in the browser, and lets a headless harness drive
   the simulation for verification. */
window.AFTERGLOW = {
  startGame, update, render, startWave,
  get state() { return state; }, set state(v) { state = v; },
  get wave() { return wave; }, get score() { return score; }, get levelQueue() { return levelQueue; },
  player, enemies, bullets, ebullets, pickups, particles, breakables, telegraphs, floaters, director, input,
  resolveMenu(i) { if (pendingMenu) pendingMenu(i || 0); },
};

})();
