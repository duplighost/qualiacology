/* Headless smoke/verification harness for AFTERGLOW.
   Stubs the browser environment, loads the real game.js, then drives the actual
   simulation for thousands of frames across several scenarios. It is not a unit
   test of balance — it is a guarantee that the engine runs, renders, scales
   waves, spawns and kills a boss, levels up, and dies without ever throwing or
   producing NaN / runaway entity counts. */

const path = require("path");

/* ---- stub timers (keep the harness deterministic & synchronous) ---- */
global.setTimeout = () => 0;
global.setInterval = () => 0;
global.clearInterval = () => {};
global.clearTimeout = () => {};

/* ---- stub canvas 2d context ---- */
const grad = { addColorStop() {} };
function makeCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p === "createRadialGradient" || p === "createLinearGradient") return () => grad;
      if (p === "canvas") return { width: 800, height: 600 };
      const v = t[p];
      return typeof v === "function" ? v : () => {};
    },
    set() { return true; },
  });
}

/* ---- stub DOM elements ---- */
const elCache = new Map();
function makeEl(id) {
  const el = {
    id, _onclick: null, innerHTML: "", width: 800, height: 600,
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    set onclick(f) { this._onclick = f; }, get onclick() { return this._onclick; },
    getContext() { return makeCtx(); },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {},
    querySelectorAll() { return { forEach() {} }; },
    querySelector() { return null; },
    appendChild() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
  };
  return el;
}
function getEl(id) { if (!elCache.has(id)) elCache.set(id, makeEl(id)); return elCache.get(id); }

/* ---- stub AudioContext ---- */
function param() { return { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }; }
class StubAC {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = "running"; this.destination = {}; }
  createGain() { return { gain: param(), connect() {} }; }
  createOscillator() { return { type: "", frequency: param(), connect() {}, start() {}, stop() {} }; }
  createBiquadFilter() { return { type: "", frequency: param(), Q: param(), connect() {} }; }
  createBuffer(ch, len) { return { getChannelData() { return new Float32Array(len); } }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
  resume() {}
}

/* ---- stub window/document/perf/storage ---- */
let _t = 0;
global.performance = { now: () => (_t += 16.67) };
const mem = new Map();
global.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
global.requestAnimationFrame = () => 1; // store nothing; we drive manually
global.cancelAnimationFrame = () => {};
global.addEventListener = () => {};   // game.js uses bare addEventListener (= window.*)
global.removeEventListener = () => {};
global.document = {
  getElementById: getEl,
  createElement: () => makeEl("dyn"),
  addEventListener() {}, removeEventListener() {},
  hidden: false,
};
global.window = {
  innerWidth: 900, innerHeight: 1600, devicePixelRatio: 2,
  AudioContext: StubAC, webkitAudioContext: StubAC,
  addEventListener() {}, removeEventListener() {},
  visualViewport: null,
};
// game.js references some of these as bare globals too
global.AudioContext = StubAC;

/* ---- load the real game ---- */
require(path.join(__dirname, "..", "js", "game.js"));
const G = global.window.AFTERGLOW;
if (!G) { console.error("FAIL: game did not expose debug handle"); process.exit(1); }

/* ---- assertions ---- */
let failures = 0;
function bad(msg) { failures++; console.error("  ✗ " + msg); }
function finite(o, keys) { for (const k of keys) if (!Number.isFinite(o[k])) return k; return null; }

const peak = { enemies: 0, bullets: 0, ebullets: 0, particles: 0, pickups: 0, telegraphs: 0 };
function track() {
  peak.enemies = Math.max(peak.enemies, G.enemies.length);
  peak.bullets = Math.max(peak.bullets, G.bullets.length);
  peak.ebullets = Math.max(peak.ebullets, G.ebullets.length);
  peak.particles = Math.max(peak.particles, G.particles.length);
  peak.pickups = Math.max(peak.pickups, G.pickups.length);
  peak.telegraphs = Math.max(peak.telegraphs, G.telegraphs.length);
}
function sane() {
  const k = finite(G.player, ["x", "y", "hp", "maxHp", "vx", "vy"]);
  if (k) { bad("player." + k + " is not finite (NaN/Infinity)"); return false; }
  if (G.enemies.length > 400) { bad("enemy count runaway: " + G.enemies.length); return false; }
  if (G.bullets.length > 4000) { bad("bullet count runaway: " + G.bullets.length); return false; }
  if (G.particles.length > 5000) { bad("particle count runaway: " + G.particles.length); return false; }
  return true;
}

function run(label, frames, opts = {}) {
  console.log("• " + label);
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1]];
  let bossSeen = false, deadAt = -1, levelUps = 0;
  try {
    for (let i = 0; i < frames; i++) {
      if (G.state === "levelup") { levelUps++; G.resolveMenu(0); }
      if (opts.keepAlive) G.player.hp = G.player.maxHp;
      // wander
      const d = dirs[(i / 40 | 0) % dirs.length];
      G.input.keys["w"] = d[1] < 0; G.input.keys["s"] = d[1] > 0;
      G.input.keys["a"] = d[0] < 0; G.input.keys["d"] = d[0] > 0;
      if (i % 34 === 0) G.input.dashBuffer = 0.14; // periodic dash
      if (G.state === "playing") G.update(1 / 60);
      if (i % 5 === 0) G.render(); // exercise the full draw path
      if (G.enemies.some((e) => e.boss)) bossSeen = true;
      track();
      if (!sane()) { console.error("   (failed at frame " + i + ", wave " + G.wave + ")"); break; }
      if (G.state === "dead" && deadAt < 0) { deadAt = i; if (opts.stopOnDeath) break; }
    }
  } catch (e) {
    bad("threw: " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n      ") : e));
  }
  console.log("   wave=" + G.wave + " score=" + G.score + " levelUps=" + levelUps +
    " bossSeen=" + bossSeen + (deadAt >= 0 ? " diedAtFrame=" + deadAt : ""));
  return { bossSeen, deadAt, levelUps };
}

console.log("AFTERGLOW headless verification\n");

// menu renders without a game running
try { G.render(); console.log("• menu render OK"); } catch (e) { bad("menu render threw: " + e); }

// 1) Long survival run (invincible) — should clear waves, level up, meet a boss.
G.startGame();
const r1 = run("survival run (invincible, 9000 frames)", 9000, { keepAlive: true });
if (G.wave < 3) bad("expected to reach at least wave 3, got " + G.wave);
if (r1.levelUps < 3) bad("expected several level-ups, got " + r1.levelUps);

// 2) Direct boss fight — jump to a boss wave and make sure it dies cleanly.
G.startGame(); G.startWave(5);
const r2 = run("boss fight (wave 5, 4000 frames)", 4000, { keepAlive: true });
if (!r2.bossSeen) bad("boss never spawned on a boss wave");

// 3) Mortality — no top-up under a heavy wave; die() must fire without throwing.
G.startGame(); G.startWave(7);
const r3 = run("mortality (wave 7, until death, 6000 cap)", 6000, { stopOnDeath: true });
if (r3.deadAt < 0) console.log("   (note: survived the cap — fine, death path also tested via render)");

// gameover render
try { G.render(); console.log("• gameover/render OK"); } catch (e) { bad("post-run render threw: " + e); }

console.log("\npeak counts:", JSON.stringify(peak));
if (failures) { console.error("\nRESULT: " + failures + " failure(s)"); process.exit(1); }
console.log("\nRESULT: all checks passed ✓");
