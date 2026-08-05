// ── VESPERBANE · game.js ─────────────────────────────────────────────
// Loop, camera, rendering, HUD, and run/death/win flow.
'use strict';

const VIEW_W = 480, VIEW_H = 270;
const STEP = 1 / 60;

// ── the Vesper Toll: the night keeps time ────────────────────────────
// Every TOLL_PERIOD seconds a far bell rings. It now drives atmosphere and
// monster pressure only; local ward bells put spectral routes under player
// control, so traversal never asks anyone to stand around waiting.
const TOLL_PERIOD = 18, TOLL_ACTIVE = 6;

// Generated from Alex's chosen "Eclipse Ossuary" visual target. These are
// authored 2x pixel backdrops and are sampled down to the 480x270 game grid.
const BACKDROP_SOURCES = {
  exterior: 'assets/backdrops/eclipse-cathedral.webp',
  nave: 'assets/backdrops/eclipse-nave.webp',
  ossuary: 'assets/backdrops/dry-ossuary.webp',
  drowned: 'assets/backdrops/drowned-ossuary.webp',
};
const BACKDROPS = {};
function ensureBackdrop(key) {
  if (!key || !BACKDROP_SOURCES[key]) return null;
  if (!BACKDROPS[key]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = BACKDROP_SOURCES[key];
    BACKDROPS[key] = img;
  }
  return BACKDROPS[key];
}
function initBackdrops() { ensureBackdrop('exterior'); }

function materialKeyForZone(name) {
  if (/CATACOMBS|CRYPT|OSSUARY|DROWNED|STAIR DOWN|HOLLOW STAIR|UNDERTOLL/.test(name || '')) return 'ossuary';
  if (/NAVE|RAFTERS|VESPER BELL/.test(name || '') && !/DROWNED/.test(name || '')) return 'nave';
  return 'exterior';
}

function backdropKeyForZone(name) {
  if (/DROWNED/.test(name || '')) return 'drowned';
  return materialKeyForZone(name);
}

// per-region sky + mood; channels lerp smoothly as you cross zones
const ZONE_AMBIENT = {
  'THE RAMPARTS':    { top: [11, 12, 30], mid: [21, 23, 50], bot: [35, 36, 73], clouds: 0.1, dawn: 0, mist: 1 },
  'THE SPIRE':       { top: [15, 18, 44], mid: [28, 33, 70], bot: [44, 49, 96], clouds: 1, dawn: 0, mist: 0.3 },
  'THE ROOFTOPS':    { top: [12, 14, 36], mid: [24, 27, 58], bot: [38, 42, 82], clouds: 0.85, dawn: 0, mist: 0.7 },
  'THE CATACOMBS':   { top: [7, 13, 13], mid: [15, 30, 25], bot: [26, 48, 38], tint: '70,212,142', tintA: 0.05, clouds: 0, dawn: 0, mist: 1.2 },
  'BELL PLAZA':      { top: [15, 11, 32], mid: [31, 23, 54], bot: [54, 38, 72], clouds: 0.3, dawn: 0, mist: 1 },
  'THE NAVE':        { top: [17, 11, 25], mid: [35, 23, 43], bot: [60, 40, 53], tint: '255,155,47', tintA: 0.045, clouds: 0, dawn: 0, mist: 0.5 },
  'THE RAFTERS':     { top: [12, 9, 22], mid: [25, 19, 39], bot: [42, 31, 51], clouds: 0, dawn: 0, mist: 0.4 },
  'THE CRYPT':       { top: [5, 6, 13], mid: [10, 15, 27], bot: [18, 27, 44], tint: '127,233,245', tintA: 0.055, clouds: 0, dawn: 0, mist: 1.5 },
  'THE ASCENT':      { top: [16, 12, 38], mid: [38, 27, 62], bot: [74, 46, 76], clouds: 0.4, dawn: 0.55, mist: 0.8 },
  'THE VESPER BELL': { top: [19, 14, 44], mid: [46, 31, 70], bot: [90, 54, 82], clouds: 0.4, dawn: 1, mist: 0.6 },
  // ── Night II: underground, earthy, cold cyan light ──
  'THE STAIR DOWN':  { top: [10, 9, 20], mid: [20, 17, 34], bot: [34, 28, 46], tint: '127,233,245', tintA: 0.03, clouds: 0, dawn: 0, mist: 0.9, cave: 0.8 },
  'THE OSSUARY':     { top: [8, 8, 12], mid: [17, 16, 24], bot: [30, 27, 34], tint: '180,175,150', tintA: 0.04, clouds: 0, dawn: 0, mist: 1.1, cave: 1 },
  'THE DROWNED NAVE':{ top: [5, 9, 14], mid: [10, 19, 30], bot: [16, 30, 44], tint: '63,168,189', tintA: 0.06, clouds: 0, dawn: 0, mist: 1.4, cave: 1 },
  'THE HOLLOW STAIR':{ top: [9, 7, 15], mid: [19, 15, 28], bot: [32, 25, 40], tint: '127,233,245', tintA: 0.04, clouds: 0, dawn: 0, mist: 1.1, cave: 1 },
  'THE UNDERTOLL':   { top: [6, 6, 14], mid: [14, 13, 30], bot: [26, 22, 44], tint: '127,233,245', tintA: 0.07, clouds: 0, dawn: 0, mist: 1.2, cave: 1 },
};
const AMBIENT_DEFAULT = ZONE_AMBIENT['THE RAMPARTS'];

function ambientFor(name) {
  const t = ZONE_AMBIENT[name] || AMBIENT_DEFAULT;
  const a = JSON.parse(JSON.stringify(t));
  a.top = t.top.slice(); a.mid = t.mid.slice(); a.bot = t.bot.slice();
  a.clouds = t.clouds || 0; a.dawn = t.dawn || 0; a.mist = t.mist !== undefined ? t.mist : 1;
  a.cave = t.cave || 0;
  a.tintA = t.tintA || 0; a.tintC = t.tint ? t.tint.split(',').map(Number) : [127, 233, 245];
  return a;
}

// ── input ────────────────────────────────────────────────────────────
const input = {
  left: false, right: false, up: false, down: false,
  jump: false, attack: false, dash: false,
  jumpPressed: false, attackPressed: false, dashPressed: false,
  anyPressed: false,
  clearPressed() { this.jumpPressed = this.attackPressed = this.dashPressed = this.anyPressed = false; },
};

// ── key bindings (rebindable, persisted) ─────────────────────────────
// Default puts JUMP on the thumb (Space) and ATTACK on the index finger
// (Z) — no cramped middle-finger reach. The alternates also spell out a
// full two-handed WASD + J/K/L layout, so both schemes work untouched.
const DEFAULT_BINDS = {
  left:  ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up:    ['ArrowUp', 'KeyW'],
  down:  ['ArrowDown', 'KeyS'],
  jump:  ['Space', 'KeyK'],
  attack:['KeyZ', 'KeyJ'],
  // X sits under the middle finger right next to Z: index whips,
  // middle dashes, thumb jumps — zero hand travel
  dash:  ['KeyX', 'KeyC', 'ShiftLeft', 'ShiftRight', 'KeyL'],
};

const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
// IS_TOUCH alone is true on touchscreen laptops driven by a mouse, so gate the
// on-screen controls and the "TAP" prompts on touch being the PRIMARY pointer.
const IS_TOUCH_PRIMARY = IS_TOUCH &&
  !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

// gameplay options (persisted separately from binds)
const DEFAULT_OPTS = { dtapDash: IS_TOUCH };
let OPTS = loadOpts();
function loadOpts() {
  try {
    const s = JSON.parse(localStorage.getItem('vesperbane.opts'));
    if (s && typeof s === 'object') return Object.assign({}, DEFAULT_OPTS, s);
  } catch (e) {}
  return Object.assign({}, DEFAULT_OPTS);
}
function saveOpts() { try { localStorage.setItem('vesperbane.opts', JSON.stringify(OPTS)); } catch (e) {} }
// keys we never let the player steal for an action (movement + system)
const RESERVED_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'KeyM', 'KeyP', 'KeyR', 'F1', 'F2', 'Escape', 'Enter', 'Backspace',
]);

let BINDS = loadBinds();
let KEYMAP = buildKeymap(BINDS);

function loadBinds() {
  try {
    const s = JSON.parse(localStorage.getItem('vesperbane.binds'));
    if (s && s.jump && s.attack && s.dash)
      return Object.assign(JSON.parse(JSON.stringify(DEFAULT_BINDS)), s);
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_BINDS));
}
function saveBinds() { try { localStorage.setItem('vesperbane.binds', JSON.stringify(BINDS)); } catch (e) {} }
function buildKeymap(b) {
  const m = {};
  for (const act of Object.keys(b)) for (const code of b[act]) if (!(code in m)) m[code] = act;
  return m;
}
function rebindKey(action, code) {
  for (const a of ['jump', 'attack', 'dash']) BINDS[a] = BINDS[a].filter(c => c !== code);
  BINDS[action] = [code].concat(BINDS[action]).slice(0, 3);
  KEYMAP = buildKeymap(BINDS);
  saveBinds();
}
function resetBinds() {
  BINDS = JSON.parse(JSON.stringify(DEFAULT_BINDS));
  KEYMAP = buildKeymap(BINDS);
  saveBinds();
}
function pk(action) { return keyLabel(BINDS[action][0]); }   // primary key label

function keyLabel(code) {
  if (!code) return '--';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const m = {
    Space: 'SPACE', ShiftLeft: 'LSHIFT', ShiftRight: 'RSHIFT',
    ControlLeft: 'LCTRL', ControlRight: 'RCTRL', AltLeft: 'LALT', AltRight: 'RALT',
    Enter: 'ENTER', Backspace: 'BKSP', Tab: 'TAB', CapsLock: 'CAPS',
    ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN',
    Comma: 'COMMA', Period: 'PERIOD', Slash: 'SLASH', Semicolon: 'SEMI', Quote: 'QUOTE',
    BracketLeft: 'LBRAK', BracketRight: 'RBRAK', Backslash: 'BSLASH', Minus: 'MINUS', Equal: 'EQUAL',
  };
  return m[code] || code.toUpperCase();
}

// double-tap ← / → triggers a dash when the option is on
const _dtap = { left: -9, right: -9 };
function noteDirPress(name) {
  if (name !== 'left' && name !== 'right') return;
  const now = performance.now() / 1000;
  if (OPTS.dtapDash && now - _dtap[name] < 0.27) input.dashPressed = true;
  _dtap[name] = now;
}

function setKey(code, isDown) {
  const name = KEYMAP[code];
  if (!name) return false;
  if (isDown && !input[name]) {
    if (name === 'jump') input.jumpPressed = true;
    if (name === 'attack') input.attackPressed = true;
    if (name === 'dash') input.dashPressed = true;
    noteDirPress(name);
  }
  input[name] = isDown;
  return true;
}

// ── touch controls ───────────────────────────────────────────────────
// Left half of the screen is a floating stick (drag down = crouch/slide
// modifier); right half is a three-button arc. Everything feeds the same
// `input` object the keyboard uses.
const TOUCH = {
  active: false,
  portrait: false,
  pointers: new Map(),     // pointerId -> {kind, btn?}
  stick: null,             // {ox, oy, x, y} while held
  buttons: [
    { act: 'jump',   x: 436, y: 222, r: 26, label: 'JUMP' },
    { act: 'attack', x: 378, y: 240, r: 21, label: 'WHIP' },
    { act: 'dash',   x: 394, y: 188, r: 21, label: 'DASH' },
  ],
  pause: { x: 414, y: 30, r: 11 },
};

// Show touch affordances once we know the player is on a thumb — either because
// they already touched, or because the device says touch is how it is driven.
// Without this the first thing a phone sees is "PRESS JUMP", naming a key it has
// not got, and the on-screen controls stay invisible until it is touched blind.
const touchUI = () => TOUCH.active || IS_TOUCH_PRIMARY;

function touchSet(name, isDown) {
  if (isDown && !input[name]) {
    if (name === 'jump') input.jumpPressed = true;
    if (name === 'attack') input.attackPressed = true;
    if (name === 'dash') input.dashPressed = true;
    noteDirPress(name);
  }
  input[name] = isDown;
}

function stickApply(dx, dy) {
  const right = dx > 9, left = dx < -9, up = dy < -16, down = dy > 16;
  if (right !== input.right) touchSet('right', right);
  if (left !== input.left) touchSet('left', left);
  if (up !== input.up) touchSet('up', up);
  if (down !== input.down) touchSet('down', down);
}

function stickRelease() {
  if (input.left) touchSet('left', false);
  if (input.right) touchSet('right', false);
  if (input.up) touchSet('up', false);
  if (input.down) touchSet('down', false);
  TOUCH.stick = null;
}

function initTouch(canvas) {
  const toCanvas = e => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (VIEW_W / r.width), (e.clientY - r.top) * (VIEW_H / r.height)];
  };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    TOUCH.active = true;
    audio.init();
    input.anyPressed = true;
    const [x, y] = toCanvas(e);
    // pause toggle
    const pb = TOUCH.pause;
    if (game.state === 'play' && Math.hypot(x - pb.x, y - pb.y) < pb.r + 8) {
      TOUCH.pointers.set(e.pointerId, { kind: 'ui' });
      game.state = 'pause';
      return;
    }
    if (game.state === 'pause') { TOUCH.pointers.set(e.pointerId, { kind: 'ui' }); game.state = 'play'; return; }
    if (game.state === 'win' && game.stateT > 2.8) {
      TOUCH.pointers.set(e.pointerId, { kind: 'ui' });
      game.advanceNight();
      return;
    }
    // title: tap edges to choose a night, center to begin
    if (game.state === 'title') {
      TOUCH.pointers.set(e.pointerId, { kind: 'ui' });
      if (x < VIEW_W * 0.30) game.pick = clamp(game.pick - 1, 0, game.unlocked);
      else if (x > VIEW_W * 0.70) game.pick = clamp(game.pick + 1, 0, game.unlocked);
      else game.beginPick();
      return;
    }
    // action buttons (right side)
    if (x >= VIEW_W * 0.45) {
      let best = null, bd = 1e9;
      for (const b of TOUCH.buttons) {
        const d = Math.hypot(x - b.x, y - b.y);
        if (d < b.r + 12 && d < bd) { best = b; bd = d; }
      }
      if (best) {
        TOUCH.pointers.set(e.pointerId, { kind: 'btn', btn: best.act });
        touchSet(best.act, true);
        return;
      }
    }
    // floating stick (left side)
    if (x < VIEW_W * 0.5) {
      TOUCH.pointers.set(e.pointerId, { kind: 'stick' });
      TOUCH.stick = { ox: x, oy: y, x, y };
      return;
    }
    TOUCH.pointers.set(e.pointerId, { kind: 'ui' });
  }, { passive: false });

  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') return;
    const p = TOUCH.pointers.get(e.pointerId);
    if (!p || p.kind !== 'stick' || !TOUCH.stick) return;
    e.preventDefault();
    const [x, y] = toCanvas(e);
    TOUCH.stick.x = x; TOUCH.stick.y = y;
    stickApply(x - TOUCH.stick.ox, y - TOUCH.stick.oy);
  }, { passive: false });

  const end = e => {
    const p = TOUCH.pointers.get(e.pointerId);
    if (!p) return;
    TOUCH.pointers.delete(e.pointerId);
    if (p.kind === 'stick') stickRelease();
    else if (p.kind === 'btn') touchSet(p.btn, false);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function drawTouchUI(ctx, game) {
  if (!touchUI()) return;
  if (game.state !== 'play' && game.state !== 'pause') return;
  ctx.save();
  // stick
  if (TOUCH.stick) {
    const s = TOUCH.stick;
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#e8e4f0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(s.ox, s.oy, 22, 0, 7); ctx.stroke();
    const dx = clamp(s.x - s.ox, -18, 18), dy = clamp(s.y - s.oy, -18, 18);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#e8e4f0';
    ctx.beginPath(); ctx.arc(s.ox + dx, s.oy + dy, 9, 0, 7); ctx.fill();
  } else {
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#e8e4f0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(64, 216, 22, 0, 7); ctx.stroke();
    drawText(ctx, '< >', 52, 213, 1, '#e8e4f0');
  }
  // buttons
  for (const b of TOUCH.buttons) {
    const held = input[b.act];
    ctx.globalAlpha = held ? 0.62 : 0.22;
    ctx.fillStyle = held ? '#247f98' : '#3a3f61';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    // Labels stay readable over the detailed backdrops even while idle; a
    // pressed button also shifts to bright cyan and higher luminance.
    ctx.globalAlpha = held ? 0.98 : 0.82;
    ctx.strokeStyle = '#e8e4f0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
    drawTextCentered(ctx, b.label, b.x, b.y - 3, 1, '#e8e4f0');
  }
  // pause
  const pb = TOUCH.pause;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#e8e4f0';
  ctx.fillRect(pb.x - 4, pb.y - 5, 3, 10);
  ctx.fillRect(pb.x + 1, pb.y - 5, 3, 10);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ── game ─────────────────────────────────────────────────────────────
class Game {
  constructor(levelIndex) {
    this.levelIndex = levelIndex || 0;
    this.pick = this.levelIndex;            // title-screen cursor
    this.unlocked = this.loadUnlocked();
    this.level = LEVELS[this.levelIndex].build();
    this.state = 'title';      // title | intro | play | dead | win | pause | gallery | controls
    this.ctrlCursor = 0; this.ctrlListening = false; this.ctrlReturn = 'title';
    this.ctrlFlash = 0; this.ctrlFlashMsg = '';
    this.camX = 0; this.camY = 0;
    this.time = 0;
    this.stateT = 0;
    this.best = this.loadBest(this.levelIndex);
    this.stars = [];
    const r = mulberry32(7);
    for (let i = 0; i < 90; i++)
      this.stars.push({ x: r() * VIEW_W, y: r() * 150, p: r() * 6.28, s: r() < 0.2 ? 2 : 1 });
    this.vignette = this.makeVignette();
    this.resetRun();
  }

  makeVignette() {
    const c = document.createElement('canvas');
    c.width = VIEW_W; c.height = VIEW_H;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 120, VIEW_W / 2, VIEW_H / 2, 300);
    gr.addColorStop(0, 'rgba(8,8,20,0)');
    gr.addColorStop(1, 'rgba(8,8,20,0.55)');
    g.fillStyle = gr;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    return c;
  }

  // ── level & progress persistence ───────────────────────────────────
  loadBest(i) { return parseFloat(localStorage.getItem('vesperbane.best.' + i) || 'NaN'); }
  saveBest(i, t) { try { localStorage.setItem('vesperbane.best.' + i, String(t)); } catch (e) {} }
  loadUnlocked() {
    const n = parseInt(localStorage.getItem('vesperbane.unlocked') || '0', 10);
    return isNaN(n) ? 0 : clamp(n, 0, LEVELS.length - 1);
  }
  unlockUpTo(i) {
    if (i > this.unlocked) { this.unlocked = i; try { localStorage.setItem('vesperbane.unlocked', String(i)); } catch (e) {} }
  }
  loadLevel(i) {
    this.levelIndex = clamp(i, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex].build();
    this.best = this.loadBest(this.levelIndex);
    this.resetRun();
  }

  resetRun() {
    const L = this.level;
    this.player = new Player(L.playerStart.x, L.playerStart.y);
    this.respawn = { x: L.playerStart.x, y: L.playerStart.y };
    this.spawnEntities(true);
    // Night II: the Pale Hound starts behind you
    this.hunter = L.hunter ? new Hunter(L.hunter.startX * TW, L.playerStart.y) : null;
    this.time = 0; this.kills = 0; this.deaths = 0;
    this.routes = { split1: null, split2: null };
    this.zoneName = null;
    this.toast = null;
    this.whisper = null;
    this.rewardToast = null;
    this.learned = { move: false, jump: false, attack: false, dash: false, ward: false, shard: false };
    this.loreT = 5.5;          // lore rides over live play; control starts immediately
    this.hintT = 30;
    this.dawnT = 0;
    this.newBest = false;
    this.winDelay = 0; this.justUnlocked = false;
    this.tollT = 0.001;        // toll cycle clock (starts just after a ring)
    this.rippleT = 0;
    this.level.tollActive = true;
    // ambient starts as whatever zone the player spawns in
    const startZone = L.zoneAt(L.playerStart.x, L.playerStart.y);
    this.ambient = ambientFor(startZone ? startZone.name : null);
    this.camX = clamp(this.player.x - VIEW_W / 2, 0, L.w * TW - VIEW_W);
    this.camY = clamp(this.player.y - VIEW_H / 2, 0, L.h * TW - VIEW_H);
    FX.reset();
  }

  spawnEntities(resetWards) {
    // checkpoints keep their lit state across deaths; everything else respawns
    const litChecks = new Set();
    if (this.checks) for (const c of this.checks) if (c.active) litChecks.add(c.x + ',' + c.y);
    if (resetWards && typeof this.level.resetBellGroups === 'function') this.level.resetBellGroups();
    else if (resetWards && this.level.activeBellGroups && this.level.activeBellGroups.clear) this.level.activeBellGroups.clear();
    if (typeof this.level.resetBreakables === 'function') this.level.resetBreakables();
    else if (this.level.brokenTiles && this.level.brokenTiles.clear) this.level.brokenTiles.clear();
    this.enemies = []; this.candles = []; this.sparks = [];
    this.hearts = []; this.chickens = []; this.wardBells = [];
    this.checks = []; this.signs = []; this.bones = [];
    this.hazards = [];
    this.breakRewards = new Set();
    this.bell = null;
    this.boss = null; this.bossDefeated = false;
    for (const s of this.level.spawns) {
      switch (s.type) {
        case 'wretch': this.enemies.push(new Wretch(s.tx, s.ty)); break;
        case 'bat': this.enemies.push(new Bat(s.tx, s.ty)); break;
        case 'garg': this.enemies.push(new Gargoyle(s.tx, s.ty)); break;
        case 'candle': this.candles.push(new Candle(s.tx, s.ty)); break;
        case 'spark': this.sparks.push(new Spark(s.tx, s.ty)); break;
        case 'heart': this.hearts.push(new Heart(s.tx, s.ty)); break;
        case 'chicken': if (!s.hidden) this.chickens.push(new Chicken(s.tx, s.ty)); break;
        case 'wardbell':
        case 'tollbell': {
          const ward = new WardBell(s.tx, s.ty, s.group);
          ward.whisper = s.whisper || null;
          ward.setActivated(!!(this.level.activeBellGroups && this.level.activeBellGroups.has(s.group)));
          this.wardBells.push(ward); break;
        }
        case 'bones': this.bones.push(new BonesProp(s.tx, s.ty)); break;
        case 'check': {
          const c = new Checkpoint(s.tx, s.ty, s.whisper);
          c.respawnX = s.respawnX;
          c.respawnY = s.respawnY;
          c.bossDoor = !!s.bossDoor;
          if (litChecks.has(c.x + ',' + c.y)) c.active = true;
          this.checks.push(c); break;
        }
        case 'bell': this.bell = new Bell(s.tx, s.ty); break;
        case 'signup': this.signs.push(new SignProp(s.tx, s.ty, true)); break;
        case 'signdown': this.signs.push(new SignProp(s.tx, s.ty, false)); break;
      }
    }
  }

  activateBellGroup(group) {
    if (typeof this.level.activateBellGroup === 'function') this.level.activateBellGroup(group);
    else if (this.level.activeBellGroups) this.level.activeBellGroups.add(group);
    for (const bell of this.wardBells) if (bell.group === group) bell.setActivated(true);
    this.learned.ward = true;
    this.rewardToast = { text: 'WARD AWAKENED  ·  BRIDGE LOCKED SOLID', t: 0 };
    for (const gp of this.level.ghosts) {
      const belongs = typeof this.level.ghostGroupAt === 'function'
        ? this.level.ghostGroupAt(gp.x, gp.y) === group
        : true;
      if (!belongs) continue;
      const gx = gp.x * TW + 8, gy = gp.y * TW + 3;
      FX.burst(gx, gy, ['#7fe9f5', '#e8e4f0', '#ffe27a'], 4,
        { speed: 42, life: 0.55, grav: -24 });
    }
  }

  spawnGhost(player) {
    const img = player.ghostSprite();
    FX.ghost(img, player.x - 3, player.y + player.h - img.height);
  }

  onKill(e) {
    this.kills++;
    const p = this.player;
    p.velocity = Math.min(3, p.velocity + 0.5);
    p.dashCd = 0; p.airDashUsed = false;    // kills refuel the dash
    if (e === this.boss) {
      this.bossDefeated = true;
      this.boss = null;
      const summoned = e.summoned || [];
      for (const en of this.enemies) {
        if (!en.dead && summoned.includes(en)) {
          en.dead = true;
          FX.burst(en.cx, en.cy, '#574a82', 8, { speed: 60, life: 0.4, grav: 0 });
        }
      }
      FX.hitstop(0.16); FX.shake(6, 0.8);
      FX.burst(e.cx, e.cy, ['#7fe9f5', '#e8e4f0', '#3fa8bd'], 46, { speed: 160, life: 1.0, grav: -30 });
      audio.bell(220, 3.5, 0.45); audio.sfx('death');
      if (this.bell) {
        this.bell.locked = false;                 // Night I: go ring it
        this.whisperNow('RING IT. LET THE NIGHT END.');
      } else {
        this.whisperNow('THE BELL IS YOURS AGAIN.');   // Night II: the bell was in its chest
        this.winDelay = 1.6;
      }
      return;
    }
    audio.sfx('kill');
    FX.hitstop(0.05); FX.shake(2, 0.18);
    FX.burst(e.cx, e.cy, ['#4bd48e', '#2b8256', '#f4f2fa'], 14, { speed: 110, life: 0.5 });
  }

  onPlayerDeath() {
    this.deaths++;
    this.state = 'dead';
    this.stateT = 0;
  }

  onWin() {
    this.state = 'win';
    this.stateT = 0;
    this.winDelay = 0;
    if (!(this.best <= this.time)) {
      this.best = this.time;
      this.newBest = true;
      this.saveBest(this.levelIndex, this.time);
    }
    // clearing a night unlocks the next
    if (this.levelIndex + 1 < LEVELS.length) {
      this.justUnlocked = this.levelIndex + 1 > this.unlocked;
      this.unlockUpTo(this.levelIndex + 1);
    }
  }

  // ── update ─────────────────────────────────────────────────────────
  update(dt) {
    const p = this.player;
    audio.intensity = this.state === 'play'
      ? (this.boss && !this.boss.dead ? 3 : p.tier)
      : 0;
    audio.update();

    if (this.state === 'title') {
      this.stateT += dt;
      // left/right choose a night among the unlocked ones
      if (input.left && !this._pl) { this.pick = clamp(this.pick - 1, 0, this.unlocked); }
      if (input.right && !this._pr) { this.pick = clamp(this.pick + 1, 0, this.unlocked); }
      this._pl = input.left; this._pr = input.right;
      // jump/attack/dash (not a direction) confirms the pick
      if (input.jumpPressed || input.attackPressed || input.dashPressed) this.beginPick();
      return;
    }
    if (this.state === 'intro') {
      // Compatibility for old debug/state callers: intros no longer seize input.
      this.state = 'play'; this.stateT = 0; this.loreT = Math.max(this.loreT || 0, 5.5);
    }
    if (this.state === 'pause') return;
    if (this.state === 'gallery') return;
    if (this.state === 'controls') { if (this.ctrlFlash > 0) this.ctrlFlash -= dt; return; }

    if (this.state === 'dead') {
      this.stateT += dt;
      FX.update(dt);
      if (this.stateT > 1.1) {
        this.state = 'play';
        const hadRoutes = this.routes, t = this.time, k = this.kills, d = this.deaths;
        this.spawnEntities(false);
        this.player = new Player(this.respawn.x, this.respawn.y);
        this.routes = hadRoutes; this.time = t; this.kills = k; this.deaths = d;
        // the Hound falls back behind the respawn so you get a breath
        if (this.level.hunter && !this.bossDefeated)
          this.hunter = new Hunter(this.respawn.x - 130, this.respawn.y);
        this.camX = clamp(this.player.x - VIEW_W / 2, 0, this.level.w * TW - VIEW_W);
        this.camY = clamp(this.player.y - VIEW_H / 2, 0, this.level.h * TW - VIEW_H);
        FX.reset();
      }
      return;
    }

    if (this.state === 'win') {
      this.stateT += dt;
      this.dawnT = clamp(this.stateT / 3, 0, 1);
      FX.update(dt);
      for (const c of this.candles) c.update(dt);
      if (this.bell) this.bell.update(dt);
      this.updateCamera(dt);
      if (this.stateT > 2.8 && (input.jumpPressed || input.attackPressed || input.dashPressed))
        this.advanceNight();
      return;
    }

    // ── play ──
    if (FX.stopT > 0) { FX.stopT -= dt; return; }   // hitstop freezes the world

    this.time += dt;
    this.hintT -= dt;
    this.loreT = Math.max(0, (this.loreT || 0) - dt);
    if (this.rewardToast) {
      this.rewardToast.t += dt;
      if (this.rewardToast.t > 2.25) this.rewardToast = null;
    }

    // the Vesper Toll
    this.tollT += dt;
    if (this.tollT >= TOLL_PERIOD) { this.tollT -= TOLL_PERIOD; this.ringToll(); }
    this.level.tollActive = this.tollT < TOLL_ACTIVE;
    if (this.rippleT > 0) this.rippleT -= dt;
    if (this.whisper) { this.whisper.t += dt; if (this.whisper.t > 3.4) this.whisper = null; }
    // Night II boss death → win after a beat of spectacle
    if (this.winDelay > 0) { this.winDelay -= dt; if (this.winDelay <= 0) { this.onWin(); return; } }

    p.update(dt, input, this.level, this);
    if (input.left || input.right) this.learned.move = true;
    if (input.jumpPressed || p.vy < -80) this.learned.jump = true;
    if (input.attackPressed || p.attacking) this.learned.attack = true;
    if (input.dashPressed || p.dashT > 0 || p.slideT > 0) this.learned.dash = true;

    // the boss wakes when you reach the arena
    if (!this.boss && !this.bossDefeated && this.level.bossAt &&
        p.x > this.level.bossAt.x * TW && !p.dead) this.startBoss();

    // the Pale Hound (Night II)
    if (this.hunter) this.hunter.update(dt, this.level, p, this);

    for (const e of this.enemies) e.update(dt, this.level, p, this);
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.update(dt, this.level);
      if (h.dead) this.hazards.splice(i, 1);
      else if (!p.dead && rectsOverlap(p.x, p.y, p.w, p.h, h.x, h.y, h.w, h.h)) p.damage(1, h.cx(), this);
    }
    for (const c of this.candles) c.update(dt);
    for (const s of this.sparks) s.update(dt);
    for (const h of this.hearts) h.update(dt);
    for (const c of this.chickens) c.update(dt);
    for (const b of this.wardBells) b.update(dt);
    for (const c of this.checks) {
      c.update(dt);
      c.healCd = Math.max(0, (c.healCd || 0) - dt);
    }
    if (this.bell) this.bell.update(dt);
    FX.update(dt);

    this.combat();
    this.pickups();
    this.zones();
    this.updateCamera(dt);
  }

  // ── toll / whispers / boss ─────────────────────────────────────────
  ringToll() {
    audio.bell(165, 2.2, 0.3);
    FX.shake(1.5, 0.18);
    this.rippleT = 0.9;
    // spectral shimmer only; the far toll never changes platform collision
    for (const gpos of this.level.ghosts) {
      const gx = gpos.x * TW + 8, gy = gpos.y * TW + 3;
      if (gx > this.camX - 40 && gx < this.camX + VIEW_W + 40)
        FX.burst(gx, gy, ['#7fe9f5', '#e8e4f0'], 2, { speed: 24, life: 0.5, grav: -20 });
    }
    // the Tollbearer answers the toll
    if (this.boss && this.boss.onToll) this.boss.onToll(this);
  }

  whisperNow(text) {
    if (this.whisper && this.whisper.text === text && this.whisper.t < 2) return;
    this.whisper = { text, t: 0 };
  }

  startBoss() {
    const kind = this.level.bossAt.kind;
    if (kind === 'tollbearer') {
      this.boss = new Tollbearer((this.level.bossAt.x + 18) * TW, 22 * TW);
      this.whisperNow('IT WEARS YOUR BELL FOR A HEART. CUT IT OUT.');
      // the Hound was its hound — it rejoins the master
      if (this.hunter) {
        FX.burst(this.hunter.cx, this.hunter.cy, ['#7fe9f5', '#574a82'], 18, { speed: 110, life: 0.5 });
        this.hunter = null;
      }
    } else {
      this.boss = new Shade(407 * TW, 9 * TW);
      this.whisperNow('IT RANG THE LAST DUSK. IT WILL NOT RING THE DAWN.');
    }
    this.enemies.push(this.boss);
    this.toast = { text: this.boss.bossName, t: 0 };
    audio.bell(110, 3, 0.4);
    FX.shake(3, 0.5);
  }

  summonBossBats(shade) {
    const live = shade.summoned.filter(b => !b.dead).length;
    if (live >= 4) return;
    for (const off of [-34, 34]) {
      const b = new Bat(0, 0);
      b.x = clamp(shade.cx + off, 400 * TW, 419 * TW); b.y = shade.y - 12;
      b.ax = b.x; b.ay = b.y;
      b.state = 'swoop';
      this.enemies.push(b);
      shade.summoned.push(b);
      FX.burst(b.x + 6, b.y + 4, '#574a82', 5, { speed: 40, life: 0.3, grav: 0 });
    }
    audio.sfx('candle');
  }

  spawnShockwaves(x, y) {
    this.hazards.push(new Shockwave(x - 8, y, -1), new Shockwave(x + 8, y, 1));
  }

  combat() {
    const p = this.player;
    if (p.dead) return;
    // The whip exposes separate chain and tip boxes. The bright tip is a real,
    // legible sweet spot; boss health no longer doubles for hesitant players.
    if (p.attackActive) {
      const boxes = p.attackBoxes ? p.attackBoxes() : [p.attackBox()];
      const hits = (x, y, w, h) => boxes.filter(b => rectsOverlap(b.x, b.y, b.w, b.h, x, y, w, h));
      const attackFacing = p.attackFacing || p.facing;
      const pogo = () => {
        if (!p.pogoing) return;
        p.vy = -CONFIG.POGO_V; p.airDashUsed = false; p.dashCd = 0;
        audio.sfx('pogo');
      };
      for (const e of this.enemies) {
        if (e.dead || p.attackHit.has(e)) continue;
        const hb = typeof e.hurtBounds === 'function'
          ? e.hurtBounds()
          : { x: e.x, y: e.y, w: e.w, h: e.h };
        const struck = hits(hb.x, hb.y, hb.w, hb.h);
        if (struck.length) {
          p.attackHit.add(e);
          const tip = struck.some(b => b.kind === 'tip');
          const dmg = e === this.boss ? (tip ? 2 : 1) : ((tip || p.tier >= 3) ? 2 : 1);
          e.hit(dmg, attackFacing, this);
          pogo();
        }
      }
      for (const c of this.candles) {
        if (c.dead || p.attackHit.has(c)) continue;
        if (hits(c.x, c.y - 5, c.w, c.h + 5).length) {
          p.attackHit.add(c);
          c.dead = true;
          audio.sfx('candle');
          FX.burst(c.x + 4, c.y, ['#ff9b2f', '#ffe27a'], 10, { speed: 70, life: 0.4, grav: 120 });
          const sp = new Spark(0, 0);
          sp.x = c.x; sp.y = c.y - 6;
          this.sparks.push(sp);
          pogo();
        }
      }
      for (const ward of this.wardBells) {
        if (ward.dead || ward.activated || p.attackHit.has(ward)) continue;
        if (hits(ward.x, ward.y, ward.w, ward.h).length) {
          p.attackHit.add(ward);
          ward.strike(this);
          pogo();
        }
      }
      if (this.bell && !p.attackHit.has(this.bell) && !this.bell.rung) {
        const bl = this.bell;
        if (hits(bl.x, bl.y, bl.w, bl.h).length) {
          p.attackHit.add(bl);
          bl.strike(this);
          pogo();
        }
      }
      // Whip the Hound: it cannot die, but the strike creates breathing room.
      if (this.hunter && this.hunter.stunT <= 0 && !p.attackHit.has(this.hunter) &&
          hits(this.hunter.x, this.hunter.y, this.hunter.w, this.hunter.h).length) {
        p.attackHit.add(this.hunter);
        this.hunter.stun(attackFacing);
        FX.hitstop(0.03);
        pogo();
      }

      // Breakable castle masonry uses the same whip verb. Strings can live in
      // attackHit, which naturally guarantees one break attempt per swing.
      if (typeof this.level.breakTile === 'function') {
        for (const box of boxes) {
          const tx0 = Math.floor(box.x / TW), tx1 = Math.floor((box.x + box.w - 0.01) / TW);
          const ty0 = Math.floor(box.y / TW), ty1 = Math.floor((box.y + box.h - 0.01) / TW);
          for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
            const key = 'tile:' + tx + ',' + ty;
            if (p.attackHit.has(key) || this.level.tileAt(tx, ty) !== 'B') continue;
            p.attackHit.add(key);
            const result = this.level.breakTile(tx, ty);
            if (result) this.onBreakableBroken(result, tx, ty);
          }
        }
      }
    }
    // contact damage
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (rectsOverlap(p.x, p.y, p.w, p.h, e.x + 1, e.y + 1, e.w - 2, e.h - 2)) {
        p.damage(e.touchDmg, e.cx, this);
      }
    }
  }

  onBreakableBroken(result, fallbackTx, fallbackTy) {
    const info = (result && typeof result === 'object') ? result : {};
    const tiles = info.tiles || info.broken || info.cells || [{ x: fallbackTx, y: fallbackTy }];
    audio.sfx('wallBreak');
    FX.shake(2.5, 0.22); FX.hitstop(0.035);
    for (const tile of tiles) {
      const tx = tile.x !== undefined ? tile.x : (tile.tx !== undefined ? tile.tx : fallbackTx);
      const ty = tile.y !== undefined ? tile.y : (tile.ty !== undefined ? tile.ty : fallbackTy);
      FX.burst(tx * TW + TW / 2, ty * TW + TW / 2,
        ['#8d94b3', '#565d85', '#e8e4f0'], 8, { speed: 78, life: 0.55, grav: 150 });
    }
    const reward = info.hiddenSpawn || info.reward || info.spawn || info.drop || null;
    const rewardType = typeof reward === 'string' ? reward : reward && reward.type;
    if (rewardType === 'chicken' || info.chicken) {
      const rtx = (reward && reward.tx !== undefined) ? reward.tx : fallbackTx;
      const rty = (reward && reward.ty !== undefined) ? reward.ty : fallbackTy;
      const key = 'chicken:' + rtx + ',' + rty;
      if (!this.breakRewards.has(key)) {
        this.breakRewards.add(key);
        this.chickens.push(new Chicken(rtx, rty));
        this.rewardToast = { text: 'A WARM SECRET STIRS BEHIND THE STONE', t: 0 };
      }
    }
  }

  pickups() {
    const p = this.player;
    if (p.dead) return;
    for (const s of this.sparks) {
      if (s.dead) continue;
      if (rectsOverlap(p.x - 2, p.y - 2, p.w + 4, p.h + 4, s.x, s.bobY(), s.w, s.h)) {
        s.dead = true;
        audio.sfx('pickup');
        const wasMaxVelocity = p.velocity >= 3 - 1e-6;
        p.dashCd = 0;
        p.airDashUsed = false;
        p.velocity = Math.min(3, Math.max(p.velocity, Math.floor(p.velocity) + 1));
        p.velocityHoldT = Math.max(p.velocityHoldT || 0, 2.2);
        this.learned.shard = true;
        this.rewardToast = {
          text: wasMaxVelocity ? 'DASH READY  ·  MAX VELOCITY' : 'DASH READY  ·  VELOCITY PIP FILLED',
          t: 0,
        };
        FX.burst(s.x + 3, s.bobY() + 3, ['#7fe9f5', '#f4f2fa', '#ffe27a'], 14,
          { speed: 92, life: 0.5, grav: -35 });
      }
    }
    for (const h of this.hearts) {
      if (h.dead || p.hp >= CONFIG.HP_MAX) continue;
      if (rectsOverlap(p.x - 2, p.y - 2, p.w + 4, p.h + 4, h.x, h.bobY(), h.w, h.h)) {
        h.dead = true;
        p.hp = Math.min(CONFIG.HP_MAX, p.hp + 1);
        audio.sfx('heart');
        FX.burst(h.x + 4, h.bobY() + 3, '#ff6b8f', 9, { speed: 60, life: 0.4, grav: -30 });
      }
    }
    for (const chicken of this.chickens) {
      if (chicken.dead || p.hp >= CONFIG.HP_MAX) continue;
      if (rectsOverlap(p.x - 2, p.y - 2, p.w + 4, p.h + 4,
          chicken.x, chicken.bobY(), chicken.w, chicken.h)) {
        chicken.dead = true;
        const healed = Math.min(chicken.heal || 3, CONFIG.HP_MAX - p.hp);
        p.hp = Math.min(CONFIG.HP_MAX, p.hp + (chicken.heal || 3));
        audio.sfx('chicken');
        this.rewardToast = { text: 'WALL CHICKEN  ·  +' + healed + ' HEARTS', t: 0 };
        FX.burst(chicken.x + 6, chicken.bobY() + 4,
          ['#ffe8a3', '#ffe27a', '#e8e4f0'], 18, { speed: 88, life: 0.58, grav: -30 });
      }
    }
    for (const c of this.checks) {
      const touching = rectsOverlap(p.x - 4, p.y - 4, p.w + 8, p.h + 8, c.x, c.y, c.w, c.h);
      if (!touching) continue;
      if (!c.active) {
        for (const o of this.checks) o.active = false;
        c.active = true;
        this.respawn = {
          x: Number.isFinite(c.respawnX) ? c.respawnX : c.x + (c.w - p.w) / 2,
          y: Number.isFinite(c.respawnY) ? c.respawnY : c.y + c.h - p.h,
        };
        p.hp = CONFIG.HP_MAX;
        c.healCd = 2.5;
        if (c.whisper) this.whisperNow(c.whisper);
        audio.sfx('check');
        FX.burst(c.x + 5, c.y + 7, ['#7fe9f5', '#f4f2fa'], 14, { speed: 60, life: 0.6, grav: -40 });
      } else if (p.hp < CONFIG.HP_MAX && c.healCd <= 0) {
        p.hp = CONFIG.HP_MAX;
        c.healCd = 2.5;
        audio.sfx('check');
        this.rewardToast = { text: 'LANTERN RESTORED YOUR HEARTS', t: 0 };
        FX.burst(c.x + 5, c.y + 7, ['#7fe9f5', '#f4f2fa'], 10,
          { speed: 52, life: 0.45, grav: -25 });
      }
    }
  }

  zones() {
    const p = this.player;
    const z = this.level.zoneAt(p.x + p.w / 2, p.y + p.h / 2);
    if (z && z.name !== this.zoneName) {
      this.zoneName = z.name;
      this.toast = { text: z.name, t: 0 };
      if (z.group) this.routes[z.group] = z.name;
    }
    if (this.toast) { this.toast.t += STEP; if (this.toast.t > 2.4) this.toast = null; }
    // ease the ambient palette toward this zone's mood
    const tgt = ZONE_AMBIENT[this.zoneName] || AMBIENT_DEFAULT;
    const a = this.ambient;
    for (const k of ['top', 'mid', 'bot'])
      for (let i = 0; i < 3; i++) a[k][i] = damp(a[k][i], tgt[k][i], 1.6, STEP);
    a.clouds = damp(a.clouds, tgt.clouds || 0, 1.6, STEP);
    a.dawn = damp(a.dawn, tgt.dawn || 0, 1.6, STEP);
    a.cave = damp(a.cave, tgt.cave || 0, 1.6, STEP);
    a.mist = damp(a.mist, tgt.mist !== undefined ? tgt.mist : 1, 1.6, STEP);
    a.tintA = damp(a.tintA, tgt.tintA || 0, 1.6, STEP);
    if (tgt.tint) {
      const c = tgt.tint.split(',').map(Number);
      for (let i = 0; i < 3; i++) a.tintC[i] = damp(a.tintC[i], c[i], 1.6, STEP);
    }
  }

  updateCamera(dt) {
    const p = this.player;
    const look = p.facing * 28 + p.vx * 0.22;
    const tx = clamp(p.x + p.w / 2 + look - VIEW_W / 2, 0, this.level.w * TW - VIEW_W);
    const ty = clamp(p.y + p.h / 2 - VIEW_H * 0.55, 0, this.level.h * TW - VIEW_H);
    this.camX = damp(this.camX, tx, 6, dt);
    this.camY = damp(this.camY, ty, 5, dt);
  }

  fullRestart() {
    this.resetRun();
    this.checks = this.checks.map(c => { c.active = false; return c; });
    this.respawn = { x: this.level.playerStart.x, y: this.level.playerStart.y };
    this.state = 'play';
  }

  // start a fresh run of the night highlighted on the title screen
  beginPick() {
    if (this.pick !== this.levelIndex) this.loadLevel(this.pick);
    else this.resetRun();
    this.checks.forEach(c => c.active = false);
    this.respawn = { x: this.level.playerStart.x, y: this.level.playerStart.y };
    this.state = 'play'; this.stateT = 0; this.loreT = 5.5;
  }

  // after a win: go to the next night if there is one, else replay
  advanceNight() {
    const next = this.levelIndex + 1;
    if (next < LEVELS.length) {
      this.loadLevel(next); this.pick = next;
      this.checks.forEach(c => c.active = false);
      this.respawn = { x: this.level.playerStart.x, y: this.level.playerStart.y };
      this.state = 'play'; this.stateT = 0; this.loreT = 5.5;
    } else this.fullRestart();
  }

  // ── controls / rebinding menu ──────────────────────────────────────
  openControls(from) {
    this.ctrlReturn = (from === 'pause' || from === 'title') ? from : 'play';
    this.ctrlCursor = 0; this.ctrlListening = false; this.ctrlFlash = 0;
    this.state = 'controls';
  }
  closeControls() { this.state = this.ctrlReturn; this.ctrlListening = false; }

  handleControlsKey(code) {
    const rows = ['jump', 'attack', 'dash', 'dtap', 'reset'];
    if (this.ctrlListening) {
      if (code === 'Escape' || code === 'Enter') { this.ctrlListening = false; return; }
      if (RESERVED_KEYS.has(code)) { this.ctrlFlash = 1.4; this.ctrlFlashMsg = 'KEY RESERVED'; return; }
      rebindKey(rows[this.ctrlCursor], code);
      this.ctrlListening = false;
      this.ctrlFlash = 1.2; this.ctrlFlashMsg = keyLabel(code) + ' BOUND';
      return;
    }
    if (code === 'ArrowUp' || code === 'KeyW') this.ctrlCursor = (this.ctrlCursor + rows.length - 1) % rows.length;
    else if (code === 'ArrowDown' || code === 'KeyS') this.ctrlCursor = (this.ctrlCursor + 1) % rows.length;
    else if (code === 'Enter' || code === 'Space') {
      const row = rows[this.ctrlCursor];
      if (row === 'reset') {
        resetBinds(); OPTS = Object.assign({}, DEFAULT_OPTS); saveOpts();
        this.ctrlFlash = 1.2; this.ctrlFlashMsg = 'DEFAULTS RESTORED';
      } else if (row === 'dtap') {
        OPTS.dtapDash = !OPTS.dtapDash; saveOpts();
        this.ctrlFlash = 1.2; this.ctrlFlashMsg = 'DOUBLE-TAP DASH ' + (OPTS.dtapDash ? 'ON' : 'OFF');
      } else this.ctrlListening = true;
    } else if (code === 'Escape' || code === 'Backspace' || code === 'F2') {
      this.closeControls();
    }
  }

  // ── drawing ────────────────────────────────────────────────────────
  draw(ctx) {
    if (this.state === 'gallery') { this.drawGallery(ctx); return; }
    if (this.state === 'controls') { this.drawControls(ctx); return; }

    const [shx, shy] = FX.shakeOffset();
    const camX = Math.round(this.camX + shx), camY = Math.round(this.camY + shy);

    this.drawSky(ctx, camX, camY);
    this.drawTiles(ctx, camX, camY);

    for (const b of this.bones) b.draw(ctx, camX, camY);
    for (const s of this.signs) s.draw(ctx, camX, camY);
    for (const c of this.checks) c.draw(ctx, camX, camY);
    for (const c of this.candles) c.draw(ctx, camX, camY);
    for (const h of this.hearts) h.draw(ctx, camX, camY);
    for (const chicken of this.chickens) chicken.draw(ctx, camX, camY);
    for (const s of this.sparks) s.draw(ctx, camX, camY);
    for (const ward of this.wardBells) ward.draw(ctx, camX, camY);
    if (this.bell) this.bell.draw(ctx, camX, camY);
    for (const e of this.enemies) e.draw(ctx, camX, camY);
    if (this.hunter) this.hunter.draw(ctx, camX, camY);
    for (const h of this.hazards) h.draw(ctx, camX, camY);
    this.player.draw(ctx, camX, camY);
    FX.draw(ctx, camX, camY);

    this.drawLights(ctx, camX, camY);

    // zone color grade
    if (this.ambient.tintA > 0.004) {
      const tc = this.ambient.tintC;
      ctx.fillStyle = 'rgba(' + Math.round(tc[0]) + ',' + Math.round(tc[1]) + ',' + Math.round(tc[2]) + ',' + this.ambient.tintA.toFixed(3) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // toll ripple
    if (this.rippleT > 0) {
      const rt = 1 - this.rippleT / 0.9;
      ctx.globalAlpha = (1 - rt) * 0.5;
      ctx.strokeStyle = '#7fe9f5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(VIEW_W / 2, VIEW_H / 2, 30 + rt * 300, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // dawn wash on win
    if (this.dawnT > 0) {
      ctx.globalAlpha = this.dawnT * 0.45;
      const gr = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      gr.addColorStop(0, '#f4b56a'); gr.addColorStop(1, '#c96a6e');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }

    ctx.drawImage(this.vignette, 0, 0);

    if (this.state === 'title') this.drawTitle(ctx);
    else if (this.state === 'intro') this.drawIntro(ctx);
    else {
      this.drawHUD(ctx);
      if (this.loreT > 0 && this.state === 'play') this.drawLiveLore(ctx);
    }
    if (this.state === 'dead') this.drawDeath(ctx);
    if (this.state === 'win') this.drawWin(ctx);
    if (this.state === 'pause') {
      ctx.fillStyle = 'rgba(8,8,18,0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawTextShadowCentered(ctx, 'PAUSED', VIEW_W / 2, 122, 2, '#e8e4f0');
      drawTextShadowCentered(ctx, 'P TO RESUME', VIEW_W / 2, 148, 1, '#8d94b3');
      drawTextShadowCentered(ctx, 'F2  REBIND CONTROLS', VIEW_W / 2, 162, 1, '#565d85');
    }
  }

  drawControls(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0b0c1e'); g.addColorStop(1, '#232449');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(8,8,18,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawTextShadowCentered(ctx, 'CONTROLS', VIEW_W / 2, 22, 3, '#c22e46', '#4a0e1e');
    const blink = Math.floor(performance.now() / 260) % 2 === 0;
    const rows = [['JUMP', 'jump'], ['WHIP', 'attack'], ['DASH', 'dash']];
    let y = 70;
    rows.forEach(([label, act], i) => {
      const sel = this.ctrlCursor === i;
      if (sel) drawText(ctx, '>', 92, y, 2, '#ffe27a');
      drawTextShadow(ctx, label, 114, y, 2, sel ? '#ffe27a' : '#e8e4f0');
      let keyStr, col = '#8d94b3';
      if (sel && this.ctrlListening) { keyStr = blink ? 'PRESS A KEY' : 'PRESS A KEY.'; col = '#7fe9f5'; }
      else keyStr = BINDS[act].slice(0, 3).map(keyLabel).join(' ');
      drawTextShadow(ctx, keyStr, 250, y, 2, col);
      y += 28;
    });
    const dsel = this.ctrlCursor === 3;
    if (dsel) drawText(ctx, '>', 92, y, 2, '#ffe27a');
    drawTextShadow(ctx, 'DOUBLE-TAP DASH', 114, y, 2, dsel ? '#ffe27a' : '#e8e4f0');
    drawTextShadow(ctx, OPTS.dtapDash ? 'ON' : 'OFF', 250, y, 2, OPTS.dtapDash ? '#7fe9f5' : '#8d94b3');
    y += 28;
    const rsel = this.ctrlCursor === 4;
    if (rsel) drawText(ctx, '>', 92, y, 2, '#ffe27a');
    drawTextShadow(ctx, 'RESET TO DEFAULTS', 114, y, 2, rsel ? '#ffe27a' : '#8d94b3');

    if (this.ctrlFlash > 0) {
      ctx.globalAlpha = clamp(this.ctrlFlash, 0, 1);
      drawTextShadowCentered(ctx, this.ctrlFlashMsg, VIEW_W / 2, VIEW_H - 58, 1, '#ffe27a');
      ctx.globalAlpha = 1;
    }
    drawTextShadowCentered(ctx, 'UP/DOWN SELECT    ENTER REBIND    ESC BACK', VIEW_W / 2, VIEW_H - 40, 1, '#8d94b3');
    drawTextShadowCentered(ctx, 'MOVEMENT IS ALWAYS ARROWS AND WASD', VIEW_W / 2, VIEW_H - 28, 1, '#565d85');
  }

  drawSky(ctx, camX, camY) {
    // night gradient from the zone's ambient palette, warmed at dawn
    const A = this.ambient;
    const rgb = (c, w) => 'rgb(' + Math.round(c[0] * w) + ',' + Math.round(c[1] * w) + ',' + Math.round(c[2] * w) + ')';
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    if (this.dawnT > 0) {
      g.addColorStop(0, this.dawnT > 0.5 ? '#3d3a63' : '#151732');
      g.addColorStop(0.7, '#4c3757');
      g.addColorStop(1, '#6e4353');
    } else {
      g.addColorStop(0, rgb(A.top, 1));
      g.addColorStop(0.55, rgb(A.mid, 1));
      g.addColorStop(1, rgb(A.bot, 1));
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const zone = this.zoneName || ((this.level.zoneAt(this.player.x, this.player.y) || {}).name) || '';
    const backdropKey = backdropKeyForZone(zone);
    const backdrop = ensureBackdrop(backdropKey);
    const hasBackdrop = !!(backdrop && backdrop.complete && backdrop.naturalWidth > 0);
    if (hasBackdrop) {
      ctx.globalAlpha = (backdropKey === 'ossuary' || backdropKey === 'drowned') ? 0.68 : 0.84;
      ctx.drawImage(backdrop, 0, 0, backdrop.naturalWidth, backdrop.naturalHeight, 0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
      // Quiet the collision band without sacrificing the huge vertical vista.
      const veil = ctx.createLinearGradient(0, 80, 0, VIEW_H);
      veil.addColorStop(0, 'rgba(7,7,15,0.02)');
      veil.addColorStop(1, 'rgba(7,7,15,0.34)');
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // pre-dawn glow bleeding up from the eastern horizon
    if (A.dawn > 0.02 && this.dawnT === 0) {
      const dg = ctx.createLinearGradient(VIEW_W * 0.4, VIEW_H, VIEW_W, VIEW_H * 0.35);
      dg.addColorStop(0, 'rgba(214,120,80,0)');
      dg.addColorStop(1, 'rgba(214,120,80,' + (0.16 * A.dawn) + ')');
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    const sky = 1 - A.cave;   // underground hides moon / stars / skyline

    // stars (slight parallax)
    const t = performance.now() / 1000;
    if (sky > 0.02 && !hasBackdrop) {
      for (const s of this.stars) {
        const x = ((s.x - camX * 0.05) % VIEW_W + VIEW_W) % VIEW_W;
        const a = 0.35 + 0.35 * Math.sin(t * 1.4 + s.p);
        ctx.globalAlpha = a * (1 - this.dawnT) * sky;
        ctx.fillStyle = '#cdd3ee';
        ctx.fillRect(x, s.y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
      // moon
      ctx.globalAlpha = (1 - this.dawnT * 0.6) * sky;
      ctx.drawImage(SPR.moon, Math.round(368 - camX * 0.06), Math.round(34 - camY * 0.05));
      ctx.globalAlpha = 1;
    }

    // a low, cold cavern glow creeps up from below when underground
    if (A.cave > 0.02) {
      const cg = ctx.createLinearGradient(0, VIEW_H, 0, VIEW_H * 0.35);
      cg.addColorStop(0, 'rgba(40,60,80,' + (0.14 * A.cave) + ')');
      cg.addColorStop(1, 'rgba(40,60,80,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // skylines
    const drawTiled = (img, par, yoff, alpha) => {
      if (alpha <= 0.02) return;
      const w = img.width;
      let x = -(((camX * par) % w + w) % w);
      const y = Math.round(yoff - camY * par * 0.4);
      ctx.globalAlpha = alpha;
      while (x < VIEW_W) { ctx.drawImage(img, Math.round(x), y); x += w; }
      ctx.globalAlpha = 1;
    };
    if (!hasBackdrop) {
      drawTiled(SPR.skyFar, 0.13, 30, sky);
      drawTiled(SPR.skyMid, 0.3, 20, sky);
    }

    // high clouds (rooftops / spire / ascent)
    if (this.ambient.clouds > 0.03) {
      ctx.globalAlpha = this.ambient.clouds;
      const cw = ((camX * 0.2 + t * 3) % 480 + 480) % 480;
      ctx.drawImage(SPR.clouds, -cw, 4 - camY * 0.1);
      ctx.drawImage(SPR.clouds, 480 - cw, 4 - camY * 0.1);
      ctx.globalAlpha = 1;
    }

    // drifting mist
    ctx.globalAlpha = clamp(0.8 * this.ambient.mist, 0, 1);
    const m1 = ((camX * 0.45 + t * 6) % 480 + 480) % 480;
    ctx.drawImage(SPR.mistA, -m1, 150 - camY * 0.2);
    ctx.drawImage(SPR.mistA, 480 - m1, 150 - camY * 0.2);
    const m2 = ((camX * 0.6 - t * 4) % 480 + 480) % 480;
    ctx.drawImage(SPR.mistB, -m2, 200 - camY * 0.3);
    ctx.drawImage(SPR.mistB, 480 - m2, 200 - camY * 0.3);
    ctx.globalAlpha = 1;
  }

  drawTiles(ctx, camX, camY) {
    const L = this.level;
    const tx0 = Math.max(0, Math.floor(camX / TW)), tx1 = Math.min(L.w - 1, Math.ceil((camX + VIEW_W) / TW));
    const ty0 = Math.max(0, Math.floor(camY / TW)), ty1 = Math.min(L.h - 1, Math.ceil((camY + VIEW_H) / TW));
    const zone = this.zoneName || '';
    const materialKey = materialKeyForZone(zone);
    const material = SPR.materials && SPR.materials[materialKey];

    // interior back wall (behind everything in nave/crypt)
    for (let tx = tx0; tx <= tx1; tx++) {
      const inter = L.isInterior(tx);
      if (!inter) continue;
      for (let ty = ty0; ty <= ty1; ty++) {
        if (L.tileAt(tx, ty) === '#' || L.tileAt(tx, ty) === 'B') continue;
        const tileZone = L.zoneAt((tx + 0.5) * TW, (ty + 0.5) * TW);
        const tileMaterial = SPR.materials && SPR.materials[materialKeyForZone(tileZone ? tileZone.name : zone)];
        const bricks = tileMaterial ? tileMaterial.bgBrick : (material ? material.bgBrick : SPR.bgBrick);
        ctx.globalAlpha = 0.2;
        ctx.drawImage(bricks[(tx + ty) % bricks.length], tx * TW - camX, ty * TW - camY);
        ctx.globalAlpha = 1;
      }
      // moonlit arched windows in the nave (rows 14+: the camera's floor view starts at row 13)
      if (inter.windows && tx % 12 === 6) {
        const wx = tx * TW - camX, wy = 14 * TW - camY;
        ctx.fillStyle = 'rgba(130,150,215,0.20)';
        ctx.fillRect(wx + 2, wy + 8, 12, 72);
        ctx.beginPath();
        ctx.arc(wx + 8, wy + 8, 6, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(190,205,250,0.10)';
        ctx.fillRect(wx + 7, wy + 4, 2, 76);
      }
    }

    // Set dressing is layered after the translucent back wall but before solid
    // collision. Its zone comes from the lower route at this world column, so
    // stacked nave/crypt branches retain distinct props simultaneously.
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx % 17 !== 5) continue;
      const propZone = L.zoneAt((tx + 0.5) * TW, 25.5 * TW);
      const propKey = materialKeyForZone(propZone ? propZone.name : zone);
      const propSet = SPR.zoneProps && SPR.zoneProps[propKey];
      const props = propSet ? Object.values(propSet) : [];
      if (!props.length) continue;
      const img = props[Math.floor(tx / 17) % props.length];
      const px = tx * TW - camX, py = 26 * TW - camY - img.height;
      if (py > -img.height && py < VIEW_H) {
        ctx.globalAlpha = 0.76;
        ctx.drawImage(img, px, py);
        ctx.globalAlpha = 1;
      }
    }

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = L.tileAt(tx, ty);
        const px = tx * TW - camX, py = ty * TW - camY;
        const tileZone = L.zoneAt((tx + 0.5) * TW, (ty + 0.5) * TW);
        const tileMaterial = SPR.materials && SPR.materials[materialKeyForZone(tileZone ? tileZone.name : zone)];
        if (ch === '#' || ch === 'B') {
          const stones = tileMaterial ? tileMaterial.stone : (material ? material.stone : SPR.stone);
          const stone = ch === 'B' && SPR.breakable
            ? SPR.breakable
            : stones[Math.floor(hash2(tx, ty) * stones.length)];
          ctx.drawImage(stone, px, py);
          // exposed-edge shading
          if (!L.solidAt(tx, ty - 1)) {
            ctx.fillStyle = '#565d85'; ctx.fillRect(px, py, TW, 1);
            ctx.fillStyle = '#3c4260'; ctx.fillRect(px, py + 1, TW, 1);
          }
          if (!L.solidAt(tx - 1, ty)) { ctx.fillStyle = '#3c4260'; ctx.fillRect(px, py, 1, TW); }
          if (!L.solidAt(tx + 1, ty)) { ctx.fillStyle = '#20223a'; ctx.fillRect(px + TW - 1, py, 1, TW); }
          if (!L.solidAt(tx, ty + 1)) { ctx.fillStyle = '#14121f'; ctx.fillRect(px, py + TW - 1, TW, 1); }
        } else if (ch === '=') {
          ctx.drawImage(tileMaterial ? tileMaterial.platform : (material ? material.platform : SPR.platform), px, py);
        } else if (ch === 'G') {
          // Ward-ghost platforms are inert hints until their nearby bell is
          // whipped; once awake, collision and art stay present for this life.
          const active = typeof L.isGhostActiveAt === 'function' && L.isGhostActiveAt(tx, ty);
          const ghostArt = SPR.ghostPlatform;
          if (active) {
            const img = Array.isArray(ghostArt)
              ? (ghostArt[1] || ghostArt[0])
              : ghostArt && (ghostArt.active || ghostArt.on || ghostArt);
            ctx.globalAlpha = 0.95;
            ctx.drawImage(img || SPR.platform, px, py);
            ctx.fillStyle = 'rgba(127,233,245,0.38)';
            ctx.fillRect(px, py, TW, 3);
            ctx.globalAlpha = 1;
          } else {
            const img = Array.isArray(ghostArt)
              ? ghostArt[0]
              : ghostArt && (ghostArt.inactive || ghostArt.off || null);
            if (img) {
              ctx.globalAlpha = 0.56 + 0.08 * Math.sin(performance.now() / 180 + tx);
              ctx.drawImage(img, px, py);
              ctx.globalAlpha = 1;
            } else {
              const a = 0.18 + 0.08 * Math.sin(performance.now() / 180 + tx);
              ctx.fillStyle = 'rgba(127,233,245,' + a.toFixed(3) + ')';
              ctx.fillRect(px + 1, py + 2, 5, 2);
              ctx.fillRect(px + 10, py + 2, 5, 2);
            }
          }
        } else if (ch === '^') {
          ctx.drawImage(SPR.spike, px, py);
        } else if (ch === '|') {
          ctx.drawImage(SPR.chain, px, py);
        }
      }
    }
  }

  drawLights(ctx, camX, camY) {
    ctx.globalCompositeOperation = 'lighter';
    const lights = [];
    for (const c of this.candles) if (!c.dead) lights.push(c.glow());
    for (const s of this.sparks) if (!s.dead) lights.push(s.glow());
    for (const h of this.hearts) if (!h.dead) lights.push(h.glow());
    for (const chicken of this.chickens) if (!chicken.dead) lights.push(chicken.glow());
    for (const ward of this.wardBells) { const g = ward.glow(); if (g) lights.push(g); }
    for (const c of this.checks) { const g = c.glow(); if (g) lights.push(g); }
    for (const h of this.hazards) lights.push(h.glow());
    if (this.boss && !this.boss.dead) lights.push(this.boss.glow());
    if (this.hunter) lights.push(this.hunter.glow());
    if (this.bell) lights.push(this.bell.glow());
    // Player-awakened ghost platforms remain solid and glow for this life.
    for (const gp of this.level.ghosts) {
      if (typeof this.level.isGhostActiveAt === 'function' && !this.level.isGhostActiveAt(gp.x, gp.y)) continue;
        const gx = gp.x * TW + 8, gy = gp.y * TW + 3;
        if (gx > camX - 30 && gx < camX + VIEW_W + 30 && gy > camY - 30 && gy < camY + VIEW_H + 30)
          lights.push({ x: gx, y: gy, r: 13, color: '127,233,245', a: 0.09 });
    }
    for (const l of lights) {
      const x = l.x - camX, y = l.y - camY;
      if (x < -60 || x > VIEW_W + 60 || y < -60 || y > VIEW_H + 60) continue;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, l.r);
      gr.addColorStop(0, 'rgba(' + l.color + ',' + l.a + ')');
      gr.addColorStop(1, 'rgba(' + l.color + ',0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawHUD(ctx) {
    const p = this.player;
    // hearts
    for (let i = 0; i < CONFIG.HP_MAX; i++) {
      ctx.globalAlpha = i < p.hp ? 1 : 0.22;
      ctx.drawImage(SPR.heart, 8 + i * 10, 8);
    }
    ctx.globalAlpha = 1;
    // velocity gauge
    drawTextShadow(ctx, 'VELOCITY', 8, 20, 1, '#8d94b3');
    for (let i = 0; i < 3; i++) {
      const lit = p.tier > i;
      ctx.globalAlpha = lit ? 1 : 0.2;
      ctx.drawImage(SPR.flame[lit ? Math.floor(p.animT * 8 + i) % 2 : 0], 62 + i * 9, 19);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#20223a';
    ctx.fillRect(8, 29, 80, 2);
    ctx.fillStyle = p.tier >= 3 ? '#ffe27a' : '#7fe9f5';
    ctx.fillRect(8, 29, Math.round(80 * (p.velocity / 3)), 2);
    // Local ward progress replaces the old opaque global platform timer.
    const wardTotal = (this.level.bellGroups || []).length;
    const wardActive = this.level.activeBellGroups ? this.level.activeBellGroups.size : 0;
    const bellCol = wardActive > 0 ? '#7fe9f5' : '#8d94b3';
    ctx.fillStyle = bellCol;
    ctx.fillRect(96, 20, 7, 2);
    ctx.fillRect(97, 18, 5, 2);
    ctx.fillRect(98, 17, 3, 1);
    ctx.fillRect(99, 23, 1, 1);
    if (wardTotal) drawTextShadow(ctx, wardActive ? 'BRIDGES HELD ' + wardActive : 'WARD BELLS', 110, 19, 1, bellCol);
    // timer
    drawTextShadow(ctx, fmtTime(this.time), VIEW_W - 8 - textWidth(fmtTime(this.time), 1), 8, 1, '#e8e4f0');
    if (!isNaN(this.best)) {
      const bt = 'BEST ' + fmtTime(this.best);
      drawTextShadow(ctx, bt, VIEW_W - 8 - textWidth(bt, 1), 18, 1, '#8d94b3');
    }
    // zone toast
    if (this.toast && !(this.loreT > 0)) {
      const a = this.toast.t < 0.3 ? this.toast.t / 0.3 : this.toast.t > 1.9 ? clamp((2.4 - this.toast.t) / 0.5, 0, 1) : 1;
      ctx.globalAlpha = a;
      drawTextShadowCentered(ctx, this.toast.text, VIEW_W / 2, 40, 2, '#e8e4f0');
      ctx.globalAlpha = 1;
    }
    // whispers
    if (this.whisper && !(this.loreT > 0)) {
      const w = this.whisper;
      const a = w.t < 0.4 ? w.t / 0.4 : w.t > 2.8 ? clamp((3.4 - w.t) / 0.6, 0, 1) : 1;
      ctx.globalAlpha = a * 0.9;
      drawTextShadowCentered(ctx, w.text, VIEW_W / 2, 62, 1, '#8d94b3');
      ctx.globalAlpha = 1;
    }
    if (this.rewardToast) {
      const r = this.rewardToast;
      const a = r.t < 0.12 ? r.t / 0.12 : r.t > 1.75 ? clamp((2.25 - r.t) / 0.5, 0, 1) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(8,8,20,0.76)';
      ctx.fillRect(104, 76, 272, 16);
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(104, 76, 3, 16);
      drawTextShadowCentered(ctx, r.text, VIEW_W / 2, 81, 1, '#e8e4f0');
      ctx.globalAlpha = 1;
    }
    // boss bar
    if (this.boss && !this.boss.dead) {
      const b = this.boss;
      const hpMax = b.hpMax || 14;
      drawTextShadowCentered(ctx, b.bossName || 'BOSS', VIEW_W / 2, VIEW_H - 30, 1, '#7fe9f5');
      const bw = 140, bx = VIEW_W / 2 - bw / 2, by = VIEW_H - 20;
      ctx.fillStyle = '#14121f';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = '#20223a';
      ctx.fillRect(bx, by, bw, 5);
      const staggered = b.state === 'stun' || b.state === 'recover';
      ctx.fillStyle = '#7fe9f5';
      ctx.fillRect(bx, by, Math.round(bw * (b.hp / hpMax)), 5);
      for (let i = 1; i < hpMax; i++) {
        ctx.fillStyle = 'rgba(20,18,31,0.7)';
        ctx.fillRect(bx + Math.round(bw * i / hpMax), by, 1, 5);
      }
      if (staggered)
        drawTextShadowCentered(ctx, 'STAGGERED', VIEW_W / 2, VIEW_H - 42, 1, '#ffe27a');
    }
    // Hound proximity warning (Night II)
    if (this.hunter) {
      const d = Math.abs(this.hunter.cx - (p.x + p.w / 2));
      if (d < 150 && this.level.tollActive) {
        if (Math.floor(performance.now() / 120) % 2 === 0)
          drawTextShadowCentered(ctx, '>>>  THE HOUND SURGES  >>>', VIEW_W / 2, 98, 1, '#e8e4f0');
      }
    }
    this.drawContextHint(ctx);
  }

  drawContextHint(ctx) {
    if (this.boss || this.time > 90 || this.state !== 'play') return;
    const p = this.player;
    const nearbyWard = this.wardBells.find(b => !b.activated &&
      Math.abs((b.x + b.w / 2) - (p.x + p.w / 2)) < 92 &&
      Math.abs((b.y + b.h / 2) - (p.y + p.h / 2)) < 68);
    let line = '';
    if (nearbyWard) {
      line = touchUI() ? 'WHIP THE GOLD BELL  ·  THE BRIDGE STAYS' : pk('attack') + '  WHIP WARD BELL  ·  BRIDGE STAYS';
    } else if (!this.learned.move) {
      line = touchUI() ? 'DRAG LEFT TO RUN' : 'ARROWS / WASD  RUN';
    } else if (!this.learned.jump) {
      line = touchUI() ? 'JUMP OVER THE BROKEN STONE' : pk('jump') + '  JUMP';
    } else if (!this.learned.attack) {
      line = touchUI() ? 'UP/DOWN + WHIP  ·  AIM LASH' : pk('attack') + '  CHAIN WHIP  ·  HOLD UP OR DOWN TO AIM';
    } else if (!this.learned.dash) {
      line = touchUI() ? 'DASH THROUGH DANGER' : pk('dash') + '  DASH  ·  DOWN+' + pk('dash') + '  SLIDE';
    } else if (this.time < 22) {
      line = touchUI() ? 'DOWN + WHIP IN AIR  ·  POGO' : 'DOWN+' + pk('attack') + ' IN AIR  POGO  ·  F2 REBIND';
    }
    if (!line) return;
    const touch = touchUI();
    const hx = touch ? 90 : 76, hw = touch ? 248 : 328, hc = touch ? 214 : VIEW_W / 2;
    ctx.fillStyle = 'rgba(8,8,20,0.66)';
    ctx.fillRect(hx, VIEW_H - 20, hw, 14);
    drawTextShadowCentered(ctx, line, hc, VIEW_H - 16, 1,
      nearbyWard ? '#ffe27a' : '#e8e4f0');
  }

  drawTitle(ctx) {
    ctx.fillStyle = 'rgba(8,8,18,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const bob = Math.sin(this.stateT * 1.4) * 2;
    drawTextShadowCentered(ctx, 'VESPERBANE', VIEW_W / 2 + 2, 54 + bob + 2, 4, '#14121f', '#14121f');
    drawTextShadowCentered(ctx, 'VESPERBANE', VIEW_W / 2, 52 + bob, 4, '#c22e46', '#4a0e1e');
    drawTextShadowCentered(ctx, 'THE NIGHT IS LONG. RUN IT DOWN.', VIEW_W / 2, 94, 1, '#8d94b3');

    // ── night picker ──
    const lv = LEVELS[this.pick];
    const name = ['NIGHT I', 'NIGHT II'][this.pick] || ('NIGHT ' + (this.pick + 1));
    const sub = ['THE UNRUNG BELL', 'THE UNDERTOLL'][this.pick] || '';
    const canL = this.pick > 0, canR = this.pick < this.unlocked;
    if (canL) drawTextShadow(ctx, '<', VIEW_W / 2 - 92, 118, 2, '#e8e4f0');
    if (canR) drawTextShadow(ctx, '>', VIEW_W / 2 + 84, 118, 2, '#e8e4f0');
    drawTextShadowCentered(ctx, name, VIEW_W / 2, 116, 2, '#ffe27a', '#4a2c16');
    drawTextShadowCentered(ctx, sub, VIEW_W / 2, 134, 1, '#8d94b3');
    const b = this.loadBest(this.pick);
    if (!isNaN(b)) drawTextShadowCentered(ctx, 'BEST  ' + fmtTime(b), VIEW_W / 2, 148, 1, '#d1a854');
    else drawTextShadowCentered(ctx, 'UNRUN', VIEW_W / 2, 148, 1, '#565d85');
    if (this.unlocked < 1)
      drawTextShadowCentered(ctx, 'RING NIGHT I TO OPEN THE WAY DOWN', VIEW_W / 2, 160, 1, '#3a3f61');

    if (Math.floor(this.stateT * 1.6) % 2 === 0)
      drawTextShadowCentered(ctx, touchUI() ? 'TAP TO BEGIN' : 'PRESS  ' + pk('jump'), VIEW_W / 2, 182, 2, '#e8e4f0');
    if (this.unlocked > 0)
      drawTextShadowCentered(ctx, touchUI() ? 'TAP EDGES TO CHOOSE NIGHT' : 'LEFT / RIGHT  CHOOSE NIGHT', VIEW_W / 2, 202, 1, '#565d85');
    drawTextShadowCentered(ctx,
      touchUI()
        ? 'STICK LEFT   JUMP  WHIP  DASH RIGHT'
        : pk('jump') + ' JUMP   ' + pk('attack') + ' WHIP   ' + pk('dash') + ' DASH   F2 REBIND',
      VIEW_W / 2, 224, 1, '#565d85');
    drawTextShadowCentered(ctx, 'SPEED FEEDS THE FLAME. THE FLAME FEEDS YOU.', VIEW_W / 2, 240, 1, '#3a3f61');
  }

  drawLiveLore(ctx) {
    const remaining = this.loreT || 0;
    const elapsed = 5.5 - remaining;
    const a = clamp(elapsed / 0.35, 0, 1) * clamp(remaining / 0.9, 0, 1);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(7,7,15,0.72)';
    ctx.fillRect(92, 36, 296, 34);
    ctx.fillStyle = '#7fe9f5';
    ctx.fillRect(92, 36, 3, 34);
    const night = this.levelIndex === 1 ? 'NIGHT II  ·  THE UNDERTOLL' : 'NIGHT I  ·  THE UNRUNG BELL';
    const line1 = this.levelIndex === 1
      ? 'THE CRACKED BELL DRAGGED YOU DOWN.'
      : 'THE BELLKEEPER DIED AT DUSK.';
    const line2 = this.levelIndex === 1
      ? 'SOMETHING IN THE DARK STILL KEEPS TIME.'
      : 'YOU ARE THE LAST CHORISTER. RUN.';
    drawTextShadowCentered(ctx, night, VIEW_W / 2, 42, 1, '#ffe27a');
    drawTextShadowCentered(ctx, line1, VIEW_W / 2, 53, 1, '#e8e4f0');
    drawTextShadowCentered(ctx, line2, VIEW_W / 2, 62, 1, '#8d94b3');
    ctx.globalAlpha = 1;
  }

  drawIntro(ctx) {
    ctx.fillStyle = 'rgba(7,7,15,0.82)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const t = this.stateT;
    const line = (txt, y, at, scale, col) => {
      if (t < at) return;
      ctx.globalAlpha = clamp((t - at) / 0.7, 0, 1);
      drawTextShadowCentered(ctx, txt, VIEW_W / 2, y, scale || 1, col || '#8d94b3');
      ctx.globalAlpha = 1;
    };
    if (this.levelIndex === 1) {
      line('NIGHT II', 52, 0.2, 2, '#7fe9f5');
      line('THE UNDERTOLL', 74, 0.5, 1, '#8d94b3');
      line('YOU RANG THE BELL. DAWN CAME. THEN THE', 104, 1.3);
      line('CRACKED BELL FELL, AND ITS LAST NOTE', 116, 1.3);
      line('DRAGGED YOU DOWN AFTER IT.', 128, 1.3);
      line('SOMETHING IN THE DARK STILL KEEPS TIME.', 152, 2.6, 1, '#e8e4f0');
      line('IT HUNTS.', 176, 3.4, 3, '#c22e46');
    } else {
      line('THE BELLKEEPER DIED AT DUSK.', 78, 0.2, 1, '#e8e4f0');
      line('THE VESPER BELL HUNG SILENT, AND THE NIGHT', 104, 1.3);
      line("STUCK LIKE A BONE IN THE WORLD'S THROAT.", 116, 1.3);
      line('YOU ARE THE LAST CHORISTER.', 148, 2.6, 1, '#e8e4f0');
      line('RUN.', 172, 3.4, 3, '#c22e46');
    }
    if (t > 1)
      line(touchUI() ? 'TAP TO SKIP' : 'ANY KEY TO SKIP', VIEW_H - 18, 1, 1, '#565d85');
  }

  drawDeath(ctx) {
    const a = clamp(this.stateT / 0.5, 0, 1);
    ctx.fillStyle = 'rgba(10,6,14,' + (a * 0.7) + ')';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = a;
    drawTextShadowCentered(ctx, 'THE NIGHT TAKES YOU', VIEW_W / 2, 120, 2, '#c22e46');
    ctx.globalAlpha = 1;
  }

  drawWin(ctx) {
    if (this.stateT < 2) return;
    const a = clamp((this.stateT - 2) / 0.8, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,12,20,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const won2 = this.levelIndex === 1;
    drawTextShadowCentered(ctx, won2 ? 'THE BELL, REMADE' : 'DAWN', VIEW_W / 2, 50, won2 ? 2 : 4, '#ffe27a', '#4a2c16');
    drawTextShadowCentered(ctx, won2 ? 'ITS LAST NOTE IS YOURS TO RING' : 'THE VESPER BELL IS RUNG', VIEW_W / 2, 86, 1, '#e8e4f0');
    drawTextShadowCentered(ctx, 'TIME  ' + fmtTime(this.time), VIEW_W / 2, 112, 2, '#e8e4f0');
    if (this.newBest && Math.floor(this.stateT * 2) % 2 === 0)
      drawTextShadowCentered(ctx, 'NEW BEST!', VIEW_W / 2, 132, 1, '#ffe27a');
    if (!won2) {
      const r1 = this.routes.split1 || '-', r2 = this.routes.split2 || '-';
      drawTextShadowCentered(ctx, 'PATH  ' + r1 + ' > ' + r2, VIEW_W / 2, 150, 1, '#8d94b3');
    }
    drawTextShadowCentered(ctx, 'FELLED ' + this.kills + '   FALLS ' + this.deaths, VIEW_W / 2, won2 ? 150 : 164, 1, '#8d94b3');
    const hasNext = this.levelIndex + 1 < LEVELS.length;
    if (hasNext) {
      if (this.justUnlocked && Math.floor(this.stateT * 2) % 2 === 0)
        drawTextShadowCentered(ctx, 'NIGHT II UNLOCKED', VIEW_W / 2, 186, 1, '#7fe9f5');
      drawTextShadowCentered(ctx, touchUI() ? 'TAP FOR NIGHT II' : 'PRESS  ' + pk('jump') + '  FOR NIGHT II', VIEW_W / 2, 206, 1, '#e8e4f0');
      drawTextShadowCentered(ctx, 'R  REPLAY THIS NIGHT', VIEW_W / 2, 220, 1, '#565d85');
    } else {
      drawTextShadowCentered(ctx, touchUI() ? 'TAP TO RUN AGAIN' : 'PRESS  ' + pk('jump') + '  TO RUN AGAIN', VIEW_W / 2, 210, 1, '#e8e4f0');
    }
    ctx.globalAlpha = 1;
  }

  drawGallery(ctx) {
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(ctx, 'SPRITE GALLERY  F1 TO CLOSE', 8, 6, 1, '#8d94b3');
    let x = 8, y = 20, rowH = 0;
    const items = [];
    for (const k of Object.keys(SPR.player)) SPR.player[k].forEach((c, i) => items.push([k + i, c]));
    SPR.wretch.forEach((c, i) => items.push(['wretch' + i, c]));
    items.push(['wlunge', SPR.wretchLunge[0]]);
    SPR.bat.forEach((c, i) => items.push(['bat' + i, c]));
    items.push(['gperch', SPR.gargPerch[0]], ['gfly', SPR.gargFly[0]]);
    items.push(['shade', SPR.shade[0]], ['hound', SPR.hound[0]], ['toller', SPR.tollbearer]);
    items.push(['candle', SPR.candleBase], ['flame', SPR.flame[0]], ['heart', SPR.heart],
      ['spark', SPR.spark[0]], ['lant', SPR.lanternOn], ['sign', SPR.signUp], ['bell', SPR.bell],
      ['stone', SPR.stone[0]], ['plat', SPR.platform], ['spike', SPR.spike], ['chain', SPR.chain]);
    for (const [name, img] of items) {
      const w = Math.max(img.width, textWidth(name, 1)) + 8;
      if (x + w > VIEW_W - 8) { x = 8; y += rowH + 16; rowH = 0; }
      ctx.fillStyle = '#232449';
      ctx.fillRect(x - 1, y - 1, img.width + 2, img.height + 2);
      ctx.drawImage(img, x, y);
      drawText(ctx, name, x, y + img.height + 2, 1, '#565d85');
      x += w + 6;
      rowH = Math.max(rowH, img.height + 10);
    }
  }
}

// ── boot ─────────────────────────────────────────────────────────────
let game = null;

function boot() {
  initBackdrops();
  initSprites();
  game = new Game(0);

  const canvas = document.getElementById('screen');
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function fit() {
    let raw = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    if (!isFinite(raw) || raw <= 0.05) raw = 1;   // zero-size boot contexts
    // Integer scaling keeps the pixel art crisp, but flooring 1.4x to 1x strands
    // the game in a 480x270 window mid-screen — ~39% of a 844x390 phone. So on a
    // every device, quantise only above 2x and take the fractional fill below;
    // nearest-neighbour remains on, while 900px-wide desktop windows no longer
    // collapse to tiny 1x bitmap text.
    const s = raw >= 2 ? Math.floor(raw) : raw;
    canvas.style.width = VIEW_W * s + 'px';
    canvas.style.height = VIEW_H * s + 'px';
    TOUCH.portrait = IS_TOUCH && window.innerHeight > window.innerWidth * 1.2;
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 120));
  initTouch(canvas);

  window.addEventListener('keydown', e => {
    if (e.code === 'F1' || e.code === 'F2' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();

    // the rebinding menu swallows all keys
    if (game.state === 'controls') {
      if (!e.repeat) game.handleControlsKey(e.code);
      return;
    }
    // F2 opens the menu from anywhere else
    if (e.code === 'F2') { audio.init(); game.openControls(game.state); return; }

    if (e.repeat) { if (KEYMAP[e.code]) e.preventDefault(); return; }
    audio.init();
    if (e.code !== 'F1') input.anyPressed = true;   // F1 toggles the gallery, doesn't start a run
    if (setKey(e.code, true)) e.preventDefault();
    if (e.code === 'KeyM') audio.toggleMute();
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (game.state === 'play') game.state = 'pause';
      else if (game.state === 'pause') game.state = 'play';
    }
    if (e.code === 'KeyR' && (game.state === 'win' || game.state === 'play' || game.state === 'dead')) {
      game.fullRestart();
    }
    if (e.code === 'F1') {
      game.state = game.state === 'gallery' ? 'title' : 'gallery';
    }
  });
  window.addEventListener('keyup', e => { setKey(e.code, false); });
  window.addEventListener('blur', () => {
    for (const k of ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash']) input[k] = false;
  });

  let last = performance.now();
  let acc = 0;
  let refitted = false;
  function frame(now) {
    if (!refitted) { refitted = true; fit(); }   // layout may settle after boot
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    acc += dt;
    if (TOUCH.portrait && game.state === 'play') game.state = 'pause';
    let steps = 0;
    while (acc >= STEP && steps < 4) {
      game.update(STEP);
      input.clearPressed();   // consume edge-presses only on a real sim step
      acc -= STEP;
      steps++;
    }
    // NOTE: do NOT clear here. On a high-refresh display most frames run
    // zero sim steps; clearing every frame wiped ~60% of jump/dash presses
    // before the sim ever read them. A press now waits for the next step.
    game.draw(ctx);
    document.body.classList.toggle('game-active',
      game.state === 'play' || game.state === 'dead' || game.state === 'win');
    drawTouchUI(ctx, game);
    if (TOUCH.portrait) {
      ctx.fillStyle = 'rgba(7,7,15,0.88)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawTextShadowCentered(ctx, 'TURN YOUR PHONE SIDEWAYS', VIEW_W / 2, 122, 2, '#e8e4f0');
      drawTextShadowCentered(ctx, 'THE NIGHT IS WIDE', VIEW_W / 2, 146, 1, '#8d94b3');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // debug hooks for automated smoke tests (harmless for players)
  window.DEBUG = {
    game: () => game,
    state: () => ({
      state: game.state,
      x: game.player.x, y: game.player.y,
      vx: game.player.vx, vy: game.player.vy,
      hp: game.player.hp, tier: game.player.tier, velocity: game.player.velocity,
      dashCd: game.player.dashCd, airDashUsed: game.player.airDashUsed,
      velocityHoldT: game.player.velocityHoldT,
      grounded: game.player.grounded,
      zone: game.zoneName, time: game.time,
      kills: game.kills, deaths: game.deaths,
      bossHp: game.boss && !game.boss.dead ? game.boss.hp : null,
      wardGroups: Array.from(game.level.activeBellGroups || []),
      brokenTiles: Array.from(game.level.brokenTiles || []),
      liveChickens: game.chickens.filter(c => !c.dead).length,
    }),
    warp: (tx, ty) => {
      game.player.x = tx * TW; game.player.y = ty * TW;
      game.player.vx = 0; game.player.vy = 0;
      game.camX = clamp(tx * TW - VIEW_W / 2, 0, game.level.w * TW - VIEW_W);
      game.camY = clamp(ty * TW - VIEW_H / 2, 0, game.level.h * TW - VIEW_H);
    },
    key: (name, down) => {
      const before = input[name];
      input[name] = !!down;
      if (down && !before) {
        if (name === 'jump') input.jumpPressed = true;
        if (name === 'attack') input.attackPressed = true;
        if (name === 'dash') input.dashPressed = true;
      }
    },
    start: () => { if (game.state === 'title' || game.state === 'intro') game.state = 'play'; },
    tier: n => { game.player.velocity = n; game.player.tier = n; },
    boss: () => game.boss,
    hunter: () => game.hunter,
    toll: t => { game.tollT = t; game.level.tollActive = t < TOLL_ACTIVE; },
    ward: group => { game.activateBellGroup(group); return Array.from(game.level.activeBellGroups || []); },
    breakTile: (tx, ty) => {
      const result = game.level.breakTile(tx, ty);
      if (result) game.onBreakableBroken(result, tx, ty);
      return result;
    },
    hurt: n => { game.player.hp = clamp(game.player.hp - (n || 1), 1, CONFIG.HP_MAX); return game.player.hp; },
    startBoss: () => { if (!game.boss) game.startBoss(); return game.boss; },
    level: i => { game.loadLevel(i); game.pick = i; game.state = 'play'; return game.level.name; },
    unlockAll: () => { game.unlockUpTo(LEVELS.length - 1); },
    touch: active => { TOUCH.active = active !== false; return { active: TOUCH.active, portrait: TOUCH.portrait }; },
    touchStick: (dx, dy) => { stickApply(dx, dy); return { left: input.left, right: input.right, up: input.up, down: input.down }; },
    // advance the sim deterministically (works even in throttled tabs)
    step: (n) => {
      n = n || 1;
      for (let i = 0; i < n; i++) { game.update(STEP); input.clearPressed(); }
      game.draw(ctx);
      return window.DEBUG.state();
    },
    draw: () => { game.draw(ctx); },
  };
}

window.addEventListener('DOMContentLoaded', boot);
