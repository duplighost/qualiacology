/**
 * Headless regression suite for HELLSPINDLE defect fixes.
 * Run: node tests/run-logic.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GAME_JS = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
const SAVE_KEY = 'gorethread-cathedral-v1';
const PLAYER_W = 46;
const PLAYER_H = 82;

let failed = 0;
let passed = 0;
const results = [];

function assert(name, cond, detail = '') {
  if (cond) {
    passed++;
    results.push({ name, ok: true });
    console.log('  PASS  ' + name);
  } else {
    failed++;
    results.push({ name, ok: false, detail: String(detail) });
    console.error('  FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }
}

function makeCtx(canvas) {
  const grad = { addColorStop() {} };
  const props = {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowColor: '',
    shadowBlur: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low'
  };
  const methods = {
    measureText(t) { return { width: String(t).length * 8 }; },
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    createPattern() { return {}; },
    createImageData(w, h) {
      return { width: w, height: h, data: new Uint8ClampedArray((w || 1) * (h || 1) * 4) };
    },
    getImageData(x, y, w, h) {
      return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
    }
  };
  return new Proxy(props, {
    get(target, key) {
      if (key in target) return target[key];
      if (key in methods) return methods[key];
      if (typeof key === 'symbol') return undefined;
      return () => {};
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    }
  });
}

class FakeEvent {
  constructor(type, props = {}) {
    this.type = type;
    this.bubbles = true;
    this.cancelable = true;
    this.defaultPrevented = false;
    Object.assign(this, props);
  }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() {}
}

function makeTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type);
      if (!list) return;
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    dispatchEvent(event) {
      const list = listeners.get(event.type) || [];
      for (const fn of list.slice()) fn(event);
      return !event.defaultPrevented;
    }
  };
}

function boot(existingStore) {
  const raf = [];
  let now = 1000;
  const store = existingStore || new Map();
  let writes = 0;
  const localStorage = {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) {
      if (k === SAVE_KEY) writes++;
      store.set(String(k), String(v));
    },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); }
  };

  const canvas = Object.assign(makeTarget(), {
    width: 1600,
    height: 900,
    style: {},
    parentElement: {
      requestFullscreen: () => Promise.resolve()
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1600, height: 900, right: 1600, bottom: 900 };
    },
    getContext() { return makeCtx(canvas); },
    setPointerCapture() {}
  });

  const windowTarget = makeTarget();
  const documentTarget = makeTarget();

  const document = {
    getElementById(id) { return id === 'game' ? canvas : null; },
    createElement(tag) {
      if (tag === 'canvas') {
        const c = { width: 1600, height: 900, style: {} };
        c.getContext = () => makeCtx(c);
        return c;
      }
      return { style: {}, appendChild() {} };
    },
    fullscreenElement: null,
    addEventListener: documentTarget.addEventListener.bind(documentTarget),
    removeEventListener: documentTarget.removeEventListener.bind(documentTarget)
  };

  class FakeImage {
    constructor() {
      this.complete = true;
      this.naturalWidth = 64;
      this.naturalHeight = 64;
      this.width = 64;
      this.height = 64;
      this.decoding = 'async';
      this._src = '';
    }
    set src(v) { this._src = v; }
    get src() { return this._src; }
  }

  const sandbox = {
    window: null,
    document,
    canvas,
    Image: FakeImage,
    performance: { now: () => now },
    requestAnimationFrame(cb) { raf.push(cb); return raf.length; },
    cancelAnimationFrame() {},
    localStorage,
    navigator: { getGamepads: () => [] },
    console,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    parseInt,
    parseFloat,
    isNaN,
    Infinity,
    NaN,
    Uint8ClampedArray,
    Float32Array,
    Int32Array,
    Promise,
    Map,
    Set,
    Error,
    TypeError,
    setTimeout() { return 0; },
    clearTimeout() {},
    matchMedia() { return { matches: false, addListener() {}, addEventListener() {} }; }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window.AudioContext = undefined;
  sandbox.window.webkitAudioContext = undefined;
  sandbox.window.matchMedia = sandbox.matchMedia;
  sandbox.window.addEventListener = windowTarget.addEventListener.bind(windowTarget);
  sandbox.window.removeEventListener = windowTarget.removeEventListener.bind(windowTarget);
  sandbox.window.dispatchEvent = windowTarget.dispatchEvent.bind(windowTarget);
  sandbox.addEventListener = sandbox.window.addEventListener;
  sandbox.removeEventListener = sandbox.window.removeEventListener;
  sandbox.dispatchEvent = sandbox.window.dispatchEvent;

  vm.runInNewContext(GAME_JS, sandbox, { filename: 'game.js' });

  function step(ms) {
    now += ms;
    const cb = raf.shift();
    if (!cb) throw new Error('no animation frame queued');
    cb(now);
  }

  function pump(ms) {
    let left = ms;
    while (left > 0) {
      const d = Math.min(50, left);
      step(d);
      left -= d;
    }
  }

  function key(type, code, extra = {}) {
    const event = new FakeEvent(type === 'down' ? 'keydown' : 'keyup', {
      code,
      key: extra.key || code,
      button: 0,
      ...extra
    });
    windowTarget.dispatchEvent(event);
  }

  function pointer(type, props) {
    const event = new FakeEvent(type, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: 800,
      clientY: 450,
      ...props
    });
    canvas.dispatchEvent(event);
  }

  return {
    sandbox,
    canvas,
    HS: sandbox.window.__HELLSPINDLE__,
    store,
    get writes() { return writes; },
    resetWrites() { writes = 0; },
    step,
    pump,
    key,
    pointer,
    now: () => now
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function playerRectAt(px, py) {
  return { x: px - PLAYER_W / 2, y: py - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
}

function supportY(platforms, px) {
  let best = null;
  for (const p of platforms) {
    if (p.oneWay) continue;
    if (px < p.x + 6 || px > p.x + p.w - 6) continue;
    if (best == null || p.y < best) best = p.y;
  }
  return best;
}

console.log('\n=== HELLSPINDLE regression tests ===\n');

// ---------------------------------------------------------------------------
console.log('-- world geometry --');
{
  const g = boot();
  const world = g.HS.world();
  const snap0 = g.HS.snapshot();

  assert('boots to title', snap0.state === 'title');
  assert('world width 38400', world.gate && snap0.worldW === 38400);
  assert('12 district checkpoints', world.checkpoints.length === 12);
  assert('boss gate X is finale, not 8525', world.gate.x === (34950 + 8 - 21) && world.gate.x !== 8525, JSON.stringify(world.gate));
  assert('boss gate centered on draw X 34958', world.gate.x + world.gate.w / 2 === 34958);

  const flying = world.spawns.filter(s => s.type === 'bat' || s.type === 'censer');
  const generatedFlying = flying.filter(s => s.x >= 8550);
  // Buried means the hitbox is inside rock. This used to compare each flier
  // against supportY — the TOPMOST floor at that x — which was the right
  // answer when a district was one corridor. It is not: a bat legitimately
  // flying in the undercroft sits below the road, and a vault ledge sits above
  // everything, so the topmost floor is routinely nowhere near the body.
  const buriedList = [];
  for (const s of generatedFlying) {
    const half = s.type === 'bat' ? 24 : 37;
    const halfW = s.type === 'bat' ? 26 : 24;
    const r = { x: s.x - halfW, y: s.y - half, w: halfW * 2, h: half * 2 };
    const hit = world.platforms.find(p => !p.oneWay
      && r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y);
    if (hit) buriedList.push({ type: s.type, x: Math.round(s.x), y: Math.round(s.y), inside: hit });
  }
  assert('no generated flying enemies buried in floors', buriedList.length === 0, JSON.stringify(buriedList.slice(0, 5)));
  assert('generated flying exist (not deleted)', generatedFlying.length >= 18, generatedFlying.length);

  let unsafe = 0;
  const unsafeList = [];
  world.checkpoints.forEach((cp, i) => {
    if (i === 0) return;
    const pr = playerRectAt(cp.x, cp.y);
    const floor = supportY(world.platforms, cp.x);
    const onFloor = floor != null && Math.abs(floor - cp.y) < 1;
    const spike = world.hazards.some(h => rectsOverlap(pr, h));
    if (!onFloor || spike) {
      unsafe++;
      unsafeList.push({ i, cp, floor, spike });
    }
  });
  assert('district checkpoints sit on floors and miss spikes', unsafe === 0, JSON.stringify(unsafeList));

  const execs = world.spawns.filter(s => s.type === 'executioner' && s.x >= 8550);
  const execBad = execs.filter(s => {
    const floor = supportY(world.platforms, s.x);
    return floor != null && Math.abs(s.y - floor) > 1;
  });
  assert('generated executioners spawn on their floor Y', execBad.length === 0, JSON.stringify(execBad));

  const boss = world.spawns.find(s => s.type === 'boss');
  const bossFloor = supportY(world.platforms, boss.x);
  assert('boss spawn Y matches support', bossFloor != null && Math.abs(boss.y - bossFloor) < 1, JSON.stringify({ boss, bossFloor }));
}

// ---------------------------------------------------------------------------
console.log('\n-- tutorial timers --');
{
  const g = boot();
  g.pump(15000);
  const s = g.HS.snapshot();
  assert('title does not consume game.time', s.state === 'title' && s.time < 0.05, s.time);
  assert('title does not consume helpFade', s.helpFade === 1, s.helpFade);
  g.HS.start();
  g.pump(100);
  const playing = g.HS.snapshot();
  assert('start from title enters playing with tutorial intact', playing.state === 'playing' && playing.time > 0 && playing.helpFade > 0.9, JSON.stringify({ t: playing.time, f: playing.helpFade, st: playing.state }));
  g.HS.restartFull();
  const fresh = g.HS.snapshot();
  assert('full restart resets time and helpFade', fresh.time < 0.05 && fresh.helpFade === 1, JSON.stringify({ t: fresh.time, f: fresh.helpFade }));
}

// ---------------------------------------------------------------------------
console.log('\n-- pause / save --');
{
  const g = boot();
  g.HS.start();
  g.pump(50);
  g.resetWrites();
  const t0 = g.HS.snapshot().time;
  g.key('down', 'KeyP');
  g.pump(20);
  g.key('up', 'KeyP');
  g.resetWrites();
  g.pump(1000);
  const paused = g.HS.snapshot();
  assert('P pauses', paused.paused === true, paused.paused);
  assert('pause does not advance game.time', Math.abs(paused.time - t0) < 0.05, `${paused.time} vs ${t0}`);
  assert('pause does not write save every tick', g.writes === 0, g.writes);
  g.key('down', 'KeyP');
  g.pump(20);
  g.key('up', 'KeyP');
  const un = g.HS.snapshot();
  assert('P unpauses', un.paused === false);
}

// ---------------------------------------------------------------------------
console.log('\n-- high-refresh discrete input --');
{
  const g = boot();
  g.step(20);
  g.key('down', 'KeyN');
  const s1 = (() => { g.step(1); return g.HS.snapshot(); })();
  const s2 = (() => { g.step(10); return g.HS.snapshot(); })();
  g.key('up', 'KeyN');
  assert('1ms frame after N does not drop the press (still title or already playing)', s1.state === 'title' || s1.state === 'playing', s1.state);
  assert('following 10ms frame starts a new run', s2.state === 'playing', s2.state);

  const g2 = boot();
  g2.step(20);
  g2.HS.start();
  g2.pump(40);
  g2.key('down', 'Space');
  g2.step(1);
  const mid = g2.HS.snapshot();
  g2.step(10);
  const jumped = g2.HS.snapshot();
  g2.key('up', 'Space');
  assert('jump survives a 1ms zero-step frame', jumped.player.y < 760 || jumped.player.vy < 0, JSON.stringify({ midY: mid.player.y, y: jumped.player.y, vy: jumped.player.vy }));
}

// ---------------------------------------------------------------------------
console.log('\n-- keyboard / mouse / touch --');
{
  const g = boot();
  g.HS.start();
  g.HS.setInvulnerable(30);
  g.pump(40);
  const x0 = g.HS.snapshot().player.x;
  g.key('down', 'KeyD');
  g.pump(200);
  g.key('up', 'KeyD');
  const x1 = g.HS.snapshot().player.x;
  assert('keyboard D moves right', x1 > x0 + 20, `${x0} -> ${x1}`);

  const gM = boot();
  gM.HS.start();
  gM.HS.setInvulnerable(30);
  gM.pump(40);
  const yoyo0 = gM.HS.snapshot().yoyo;
  gM.pointer('pointerdown', { pointerType: 'mouse', button: 0, clientX: 1200, clientY: 200 });
  gM.pump(80);
  const yoyo1 = gM.HS.snapshot().yoyo;
  assert('mouse hold steers the wheel', yoyo1.active === true || Math.abs(yoyo1.x - yoyo0.x) > 1 || Math.abs(yoyo1.y - yoyo0.y) > 1, JSON.stringify({ yoyo0, yoyo1 }));
  gM.pointer('pointerup', { pointerType: 'mouse', button: 0, clientX: 1200, clientY: 200 });

  const gT = boot();
  gT.HS.start();
  gT.HS.setInvulnerable(30);
  gT.pump(40);
  const tx0 = gT.HS.snapshot().player.x;
  gT.pointer('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 700 });
  gT.pointer('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 340, clientY: 700 });
  gT.pump(200);
  gT.pointer('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 340, clientY: 700 });
  const tx1 = gT.HS.snapshot().player.x;
  assert('left-thumb touch drag moves the hunter', tx1 > tx0 + 10, `${tx0} -> ${tx1}`);
}

// ---------------------------------------------------------------------------
console.log('\n-- district transitions, save, continue, death --');
{
  const g = boot();
  g.HS.start();
  g.HS.setInvulnerable(60);
  const world = g.HS.world();
  const names = [];
  for (let i = 1; i < 12; i++) {
    const x0 = [0, 3400, 6400, 8550, 11850, 15150, 18450, 21750, 25050, 28350, 31650, 34950][i];
    g.HS.breakMembrane(Math.min(i, 10), 0, 99);
    g.HS.teleport(x0 + 80, world.checkpoints[i].y);
    g.pump(80);
    const s = g.HS.snapshot();
    names.push({ i, zone: s.zone, area: s.area, cp: s.player.checkpointX, cy: s.player.checkpointY });
    assert(`zone ${i} identity`, s.zone === i, JSON.stringify(names[names.length - 1]));
    assert(`zone ${i} checkpoint X saved`, Math.abs(s.player.checkpointX - world.checkpoints[i].x) < 1, JSON.stringify(names[names.length - 1]));
    assert(`zone ${i} checkpoint Y is support`, Math.abs(s.player.checkpointY - world.checkpoints[i].y) < 1, `${s.player.checkpointY} vs ${world.checkpoints[i].y}`);
  }

  const save = JSON.parse(g.store.get(SAVE_KEY));
  assert('save exists after district walk', save && save.checkpointX > 30000, save && save.checkpointX);

  g.HS.restart();
  g.pump(50);
  const rr = g.HS.snapshot();
  assert('manual restart returns to last checkpoint X', Math.abs(rr.player.x - save.checkpointX) < 2, `${rr.player.x} vs ${save.checkpointX}`);
  assert('manual restart uses saved Y', Math.abs(rr.player.y - save.checkpointY) < 2 || rr.player.grounded, `${rr.player.y} vs ${save.checkpointY}`);

  g.HS.teleport(rr.player.x, 1100);
  g.pump(80);
  const dead = g.HS.snapshot();
  assert('falling kills', dead.state === 'dead' || dead.player.dead, dead.state);
  g.pump(2300);
  const resp = g.HS.snapshot();
  assert('death respawns at checkpoint', resp.state === 'playing' && Math.abs(resp.player.x - save.checkpointX) < 2, JSON.stringify({ st: resp.state, x: resp.player.x }));

  const storeCopy = new Map(g.store);
  const g2 = boot(storeCopy);
  g2.HS.start();
  g2.pump(80);
  const cont = g2.HS.snapshot();
  assert('Continue loads last checkpoint', Math.abs(cont.player.x - save.checkpointX) < 2, `${cont.player.x} vs ${save.checkpointX}`);
}

// ---------------------------------------------------------------------------
console.log('\n-- boss wake / gate / victory --');
{
  const g = boot();
  g.HS.start();
  g.HS.setInvulnerable(60);
  g.HS.breakMembrane(10, 0, 99);
  g.HS.teleport(35060, 760);
  g.pump(150);
  const ent = g.HS.snapshot();
  assert('first finale entry wakes the boss', ent.boss && ent.boss.alive && ent.boss.awake === true, JSON.stringify(ent.boss));
  assert('bossActive on first entry', ent.bossActive === true);

  const solids = g.HS.solidsAt(34958);
  const gate = solids.find(s => s.bossGate);
  assert('gate collides at visible finale X', !!gate && gate.x === 34937, JSON.stringify(gate));
  assert('no obsolete 8525 gate in finale solids', !solids.some(s => s.x === 8525));

  const xBefore = ent.player.x;
  g.key('down', 'ArrowLeft');
  g.pump(250);
  g.key('up', 'ArrowLeft');
  const blocked = g.HS.snapshot();
  assert('player cannot walk through the drawn gate', blocked.player.x > 34958 - 40, `${blocked.player.x} (started ${xBefore})`);

  g.HS.restart();
  g.pump(80);
  const rest = g.HS.snapshot();
  assert('checkpoint restart keeps boss awake', rest.boss && rest.boss.alive && rest.boss.awake === true, JSON.stringify(rest.boss));
  const bx0 = rest.boss.x;
  const by0 = rest.boss.y;
  g.pump(700);
  const later = g.HS.snapshot();
  const moved = Math.abs(later.boss.x - bx0) + Math.abs(later.boss.y - by0);
  assert('restarted boss actually moves / acts', later.boss.awake === true && (moved > 0.5 || later.boss.state !== 'idle' || later.projectiles.length > 0 || later.boss.hp < rest.boss.hp), JSON.stringify({ moved, state: later.boss.state, hp: later.boss.hp }));

  const raw = g.store.get(SAVE_KEY);
  const gRel = boot(new Map([[SAVE_KEY, raw]]));
  gRel.HS.start();
  gRel.pump(120);
  const rel = gRel.HS.snapshot();
  assert('Continue at finale keeps boss awake', rel.boss && rel.boss.alive && rel.boss.awake === true, JSON.stringify(rel.boss));

  g.HS.damageBoss(100000);
  const killed = g.HS.snapshot();
  assert('boss dies', killed.boss && killed.boss.alive === false, JSON.stringify(killed.boss));
  g.pump(4000);
  const vic = g.HS.snapshot();
  assert('victory screen after boss death', vic.state === 'victory', vic.state);
  const winSave = JSON.parse(g.store.get(SAVE_KEY));
  assert('save records completed', winSave.completed === true, JSON.stringify(Object.keys(winSave)));

  const gWin = boot(new Map([[SAVE_KEY, g.store.get(SAVE_KEY)]]));
  gWin.HS.start();
  gWin.pump(80);
  const after = gWin.HS.snapshot();
  assert('Continue after victory does not respawn a living boss fight', after.state === 'victory' || (after.boss && after.boss.alive === false), JSON.stringify({ state: after.state, boss: after.boss }));
  assert('post-victory Continue is completed', after.completed === true);

  g.HS.restartFull();
  g.pump(40);
  const fresh = g.HS.snapshot();
  assert('new descent clears completion and returns to nave', fresh.completed === false && fresh.zone === 0 && Math.abs(fresh.player.x - 250) < 2 && fresh.player.level === 1, JSON.stringify({ c: fresh.completed, z: fresh.zone, x: fresh.player.x, lv: fresh.player.level }));
  assert('new descent removes save', g.store.get(SAVE_KEY) == null);
}

// ---------------------------------------------------------------------------
console.log('\n-- reflected projectile re-parry --');
{
  const g = boot();
  g.HS.start();
  g.HS.setInvulnerable(30);
  g.pump(40);
  const y = g.HS.snapshot().yoyo;
  g.HS.setYoyo(y.x, y.y, 0, 0);
  g.HS.spawnBolt({ x: y.x + 1, y: y.y, vx: -40, vy: 0, r: 10, type: 'bloodBolt', hostile: true, life: 4 });
  g.pump(80);
  const bolts = g.HS.snapshot().projectiles.filter(p => p.type === 'bloodBolt');
  const reflected = bolts.filter(p => p.reflected);
  assert('hostile bolt reflects once', reflected.length <= 1, JSON.stringify(bolts));
  if (reflected[0]) {
    const speed = Math.hypot(reflected[0].vx, reflected[0].vy);
    assert('reflected speed is a single bounce, not stacked', speed < 1600, speed);
    assert('reflected bolt is no longer hostile', reflected[0].hostile === false);
  } else {
    assert('reflected bolt still exists or was consumed cleanly', bolts.length === 0 || bolts.every(p => !p.hostile));
  }
}

// ---------------------------------------------------------------------------
console.log('\n-- performance cache / culling sanity --');
{
  const g = boot();
  g.HS.start();
  g.pump(40);
  const world = g.HS.world();
  assert('membrane solids are cached as a finite list', world.membraneSolidCount > 10 && world.membraneSolidCount < 400, world.membraneSolidCount);
  const near = g.HS.solidsAt(250);
  const farGate = near.some(s => s.bossGate);
  assert('nave solids omit the distant boss gate', farGate === false, near.filter(s => s.bossGate));
  g.HS.breakMembrane(0, 0, 99);
  const afterCut = g.HS.world().membraneSolidCount;
  assert('cutting a membrane rebuilds the solid cache', afterCut < world.membraneSolidCount, `${afterCut} vs ${world.membraneSolidCount}`);
}

// ---------------------------------------------------------------------------
console.log('\n-- drop-through ledges / wheel vs floors --');
{
  const g = boot();
  g.HS.start();
  g.HS.setInvulnerable(30);
  g.pump(40);
  g.HS.teleport(580, 610);
  g.pump(80);
  const onLedge = g.HS.snapshot();
  assert('one-way ledge is standable', onLedge.player.y < 700 && onLedge.player.grounded, JSON.stringify({ y: onLedge.player.y, g: onLedge.player.grounded }));
  g.key('down', 'KeyS');
  g.pump(400);
  g.key('up', 'KeyS');
  const landed = g.HS.snapshot();
  assert('S drops through the ledge onto the floor', landed.state === 'playing' && landed.player.y > 740 && landed.player.y < 780 && !landed.player.dead, JSON.stringify({ st: landed.state, y: landed.player.y, dead: landed.player.dead }));

  const gJ = boot();
  gJ.HS.start();
  gJ.HS.setInvulnerable(30);
  gJ.pump(40);
  gJ.HS.teleport(580, 700);
  gJ.pump(40);
  gJ.key('down', 'Space');
  gJ.pump(220);
  gJ.key('up', 'Space');
  const jumped = gJ.HS.snapshot();
  assert('jump still passes up through a one-way ledge', jumped.player.y < 610, JSON.stringify({ y: jumped.player.y, vy: jumped.player.vy }));

  const gW = boot();
  gW.HS.start();
  gW.HS.setInvulnerable(30);
  gW.pump(50);
  gW.pointer('pointerdown', { pointerType: 'mouse', button: 0, clientX: 250, clientY: 840 });
  gW.pump(200);
  const wheel = gW.HS.snapshot().yoyo;
  assert('aimed-down wheel rests on the floor instead of burying in it', wheel.y <= 760 - 20, `yoyo.y=${wheel.y}`);
  gW.pointer('pointerup', { pointerType: 'mouse', button: 0, clientX: 250, clientY: 840 });

  const gP = boot();
  gP.HS.start();
  gP.HS.setInvulnerable(30);
  gP.pump(40);
  gP.HS.teleport(1000, 760);
  gP.pump(2200);
  const pit = gP.HS.snapshot();
  assert('true gaps are still a pit', pit.state === 'dead' || pit.player.dead || pit.player.y > 1000, JSON.stringify({ st: pit.state, y: pit.player.y }));
}

console.log('\n-- tile / meta maintenance --');
{
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/sprites/anim/meta.json'), 'utf8'));
  // Pinning individual counts rots the moment a set is redrawn — hunter_air
  // went 8 -> 11 on purpose and this suite called it a failure. The invariant
  // worth holding is that meta describes the files that are actually there.
  const metaMismatch = [];
  const metaMissing = [];
  for (const [name, m] of Object.entries(meta)) {
    const dir = path.join(ROOT, 'assets/sprites/anim', name);
    if (!fs.existsSync(dir)) { metaMissing.push(name); continue; }
    const onDisk = fs.readdirSync(dir).filter(f => /^\d\d\.(png|webp)$/.test(f)).length;
    if (onDisk !== m.count) metaMismatch.push(`${name}: meta ${m.count}, disk ${onDisk}`);
  }
  assert('every meta set has its folder', metaMissing.length === 0, metaMissing.join(', '));
  assert('meta frame counts match the files on disk', metaMismatch.length === 0, metaMismatch.join(' | '));

  // Every set the game loads must exist with the count loadAnim asks for.
  const gameSrc = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
  const loadMismatch = [];
  for (const m of gameSrc.matchAll(/loadAnim\('([a-z_]+)',\s*(\d+)\)/g)) {
    const dir = path.join(ROOT, 'assets/sprites/anim', m[1]);
    const onDisk = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter(f => /^\d\d\.(png|webp)$/.test(f)).length : 0;
    if (onDisk < Number(m[2])) loadMismatch.push(`${m[1]}: loadAnim ${m[2]}, disk ${onDisk}`);
  }
  assert('every loadAnim set has the frames it asks for', loadMismatch.length === 0, loadMismatch.join(' | '));
  const src = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
  assert('tile_spire is used for bone zones', src.includes('isBone ? tilePatterns.spire'));
  assert('obsolete gate coordinate 8525 is gone', !src.includes('8525'));
  assert('pause loop no longer save-storms', /if \(game\.paused\) \{\s*audio\.update\(yoyo, 'paused'\);\s*return;/.test(src));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
