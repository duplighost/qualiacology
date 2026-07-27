// ── VESPERBANE · game.js ─────────────────────────────────────────────
// Loop, camera, rendering, HUD, and run/death/win flow.
'use strict';

const VIEW_W = 480, VIEW_H = 270;
const STEP = 1 / 60;

// ── the Vesper Toll: the night keeps time ────────────────────────────
// Every TOLL_PERIOD seconds a far bell rings; spectral 'G' platforms
// hold weight for TOLL_ACTIVE seconds. Learn the rhythm, own the night.
const TOLL_PERIOD = 18, TOLL_ACTIVE = 6, TOLL_WARN = 1.6;

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
  // X sits under the middle finger right next to Z: index slashes,
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
    { act: 'attack', x: 378, y: 240, r: 21, label: 'SLASH' },
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
  const right = dx > 9, left = dx < -9, down = dy > 16;
  if (right !== input.right) touchSet('right', right);
  if (left !== input.left) touchSet('left', left);
  if (down !== input.down) touchSet('down', down);
}

function stickRelease() {
  if (input.left) touchSet('left', false);
  if (input.right) touchSet('right', false);
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
    ctx.globalAlpha = held ? 0.55 : 0.2;
    ctx.fillStyle = held ? '#c22e46' : '#3a3f61';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    ctx.globalAlpha = held ? 0.9 : 0.45;
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
    this.spawnEntities();
    // Night II: the Pale Hound starts behind you
    this.hunter = L.hunter ? new Hunter(L.hunter.startX * TW, L.playerStart.y) : null;
    this.time = 0; this.kills = 0; this.deaths = 0;
    this.routes = { split1: null, split2: null };
    this.zoneName = null;
    this.toast = null;
    this.whisper = null;
    this.hintT = 7;            // controls hint at the start
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

  spawnEntities() {
    // checkpoints keep their lit state across deaths; everything else respawns
    const litChecks = new Set();
    if (this.checks) for (const c of this.checks) if (c.active) litChecks.add(c.x + ',' + c.y);
    this.enemies = []; this.candles = []; this.sparks = [];
    this.hearts = []; this.checks = []; this.signs = []; this.bones = [];
    this.hazards = [];
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
        case 'bones': this.bones.push(new BonesProp(s.tx, s.ty)); break;
        case 'check': {
          const c = new Checkpoint(s.tx, s.ty, s.whisper);
          if (litChecks.has(c.x + ',' + c.y)) c.active = true;
          this.checks.push(c); break;
        }
        case 'bell': this.bell = new Bell(s.tx, s.ty); break;
        case 'signup': this.signs.push(new SignProp(s.tx, s.ty, true)); break;
        case 'signdown': this.signs.push(new SignProp(s.tx, s.ty, false)); break;
      }
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
      this.stateT += dt;
      if ((input.anyPressed && this.stateT > 0.6) || this.stateT > 9) { this.state = 'play'; this.stateT = 0; }
      return;
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
        this.spawnEntities();
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
    if (this.hintT > 0 && (input.left || input.right)) this.hintT = Math.min(this.hintT, 2);
    this.hintT -= dt;

    // the Vesper Toll
    this.tollT += dt;
    if (this.tollT >= TOLL_PERIOD) { this.tollT -= TOLL_PERIOD; this.ringToll(); }
    this.level.tollActive = this.tollT < TOLL_ACTIVE;
    if (this.rippleT > 0) this.rippleT -= dt;
    if (this.whisper) { this.whisper.t += dt; if (this.whisper.t > 3.4) this.whisper = null; }
    // Night II boss death → win after a beat of spectacle
    if (this.winDelay > 0) { this.winDelay -= dt; if (this.winDelay <= 0) { this.onWin(); return; } }

    p.update(dt, input, this.level, this);

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
    for (const c of this.checks) c.update(dt);
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
    // materialize sparkle on ghost platforms near the camera
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
    // slash hits
    if (p.attackActive) {
      const b = p.attackBox();
      const dmg = p.tier >= 3 ? 2 : 1;
      for (const e of this.enemies) {
        if (e.dead || p.attackHit.has(e)) continue;
        if (rectsOverlap(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) {
          p.attackHit.add(e);
          e.hit(dmg, p.facing, this);
          if (p.pogoing) { p.vy = -CONFIG.POGO_V; p.airDashUsed = false; p.dashCd = 0; audio.sfx('pogo'); }
        }
      }
      for (const c of this.candles) {
        if (c.dead || p.attackHit.has(c)) continue;
        if (rectsOverlap(b.x, b.y, b.w, b.h, c.x, c.y - 5, c.w, c.h + 5)) {
          p.attackHit.add(c);
          c.dead = true;
          audio.sfx('candle');
          FX.burst(c.x + 4, c.y, ['#ff9b2f', '#ffe27a'], 10, { speed: 70, life: 0.4, grav: 120 });
          const sp = new Spark(0, 0);
          sp.x = c.x; sp.y = c.y - 6;
          this.sparks.push(sp);
          if (p.pogoing) { p.vy = -CONFIG.POGO_V; p.airDashUsed = false; p.dashCd = 0; audio.sfx('pogo'); }
        }
      }
      if (this.bell && !p.attackHit.has(this.bell) && !this.bell.rung) {
        const bl = this.bell;
        if (rectsOverlap(b.x, b.y, b.w, b.h, bl.x, bl.y, bl.w, bl.h)) {
          p.attackHit.add(bl);
          bl.strike(this);
          if (p.pogoing) { p.vy = -CONFIG.POGO_V; audio.sfx('pogo'); }
        }
      }
      // slash the Hound: can't kill it, but knock it back and stun it
      if (this.hunter && this.hunter.stunT <= 0 && !p.attackHit.has(this.hunter) &&
          rectsOverlap(b.x, b.y, b.w, b.h, this.hunter.x, this.hunter.y, this.hunter.w, this.hunter.h)) {
        p.attackHit.add(this.hunter);
        this.hunter.stun(p.facing);
        FX.hitstop(0.03);
        if (p.pogoing) { p.vy = -CONFIG.POGO_V; p.airDashUsed = false; p.dashCd = 0; audio.sfx('pogo'); }
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

  pickups() {
    const p = this.player;
    if (p.dead) return;
    for (const s of this.sparks) {
      if (s.dead) continue;
      if (rectsOverlap(p.x - 2, p.y - 2, p.w + 4, p.h + 4, s.x, s.bobY(), s.w, s.h)) {
        s.dead = true;
        audio.sfx('pickup');
        p.velocity = Math.min(3, p.velocity + 0.4);
        FX.burst(s.x + 3, s.bobY() + 3, ['#7fe9f5', '#f4f2fa'], 7, { speed: 60, life: 0.35, grav: -20 });
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
    for (const c of this.checks) {
      if (c.active) continue;
      if (rectsOverlap(p.x - 4, p.y - 4, p.w + 8, p.h + 8, c.x, c.y, c.w, c.h)) {
        for (const o of this.checks) o.active = false;
        c.active = true;
        this.respawn = { x: c.x - 2, y: c.y };
        p.hp = CONFIG.HP_MAX;
        if (c.whisper) this.whisperNow(c.whisper);
        audio.sfx('check');
        FX.burst(c.x + 5, c.y + 7, ['#7fe9f5', '#f4f2fa'], 14, { speed: 60, life: 0.6, grav: -40 });
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
    this.state = 'intro'; this.stateT = 0;
  }

  // after a win: go to the next night if there is one, else replay
  advanceNight() {
    const next = this.levelIndex + 1;
    if (next < LEVELS.length) {
      this.loadLevel(next); this.pick = next;
      this.checks.forEach(c => c.active = false);
      this.respawn = { x: this.level.playerStart.x, y: this.level.playerStart.y };
      this.state = 'intro'; this.stateT = 0;
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
    for (const s of this.sparks) s.draw(ctx, camX, camY);
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
    else this.drawHUD(ctx);
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
    const rows = [['JUMP', 'jump'], ['ATTACK', 'attack'], ['DASH', 'dash']];
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
    if (sky > 0.02) {
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
    drawTiled(SPR.skyFar, 0.13, 30, sky);
    drawTiled(SPR.skyMid, 0.3, 20, sky);

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

    // interior back wall (behind everything in nave/crypt)
    for (let tx = tx0; tx <= tx1; tx++) {
      const inter = L.isInterior(tx);
      if (!inter) continue;
      for (let ty = ty0; ty <= ty1; ty++) {
        if (L.tileAt(tx, ty) === '#') continue;
        ctx.drawImage(SPR.bgBrick[(tx + ty) % 2], tx * TW - camX, ty * TW - camY);
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

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = L.tileAt(tx, ty);
        const px = tx * TW - camX, py = ty * TW - camY;
        if (ch === '#') {
          ctx.drawImage(SPR.stone[Math.floor(hash2(tx, ty) * 3)], px, py);
          // exposed-edge shading
          if (!L.solidAt(tx, ty - 1)) {
            ctx.fillStyle = '#565d85'; ctx.fillRect(px, py, TW, 1);
            ctx.fillStyle = '#3c4260'; ctx.fillRect(px, py + 1, TW, 1);
          }
          if (!L.solidAt(tx - 1, ty)) { ctx.fillStyle = '#3c4260'; ctx.fillRect(px, py, 1, TW); }
          if (!L.solidAt(tx + 1, ty)) { ctx.fillStyle = '#20223a'; ctx.fillRect(px + TW - 1, py, 1, TW); }
          if (!L.solidAt(tx, ty + 1)) { ctx.fillStyle = '#14121f'; ctx.fillRect(px, py + TW - 1, TW, 1); }
        } else if (ch === '=') {
          ctx.drawImage(SPR.platform, px, py);
        } else if (ch === 'G') {
          // toll-ghost platform: solid while the toll rings
          const warn = this.tollT > TOLL_PERIOD - TOLL_WARN;
          if (this.level.tollActive) {
            const fade = clamp((TOLL_ACTIVE - this.tollT) / 0.8, 0, 1);
            ctx.globalAlpha = 0.55 + 0.45 * fade;
            ctx.drawImage(SPR.platform, px, py);
            ctx.fillStyle = 'rgba(127,233,245,0.32)';
            ctx.fillRect(px, py, TW, 6);
            ctx.globalAlpha = 1;
          } else {
            const a = warn ? 0.22 + 0.18 * Math.sin(performance.now() / 45) : 0.16;
            ctx.fillStyle = 'rgba(127,233,245,' + clamp(a, 0.05, 0.5) + ')';
            ctx.fillRect(px + 1, py + 2, 5, 2);
            ctx.fillRect(px + 10, py + 2, 5, 2);
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
    for (const c of this.checks) { const g = c.glow(); if (g) lights.push(g); }
    for (const h of this.hazards) lights.push(h.glow());
    if (this.boss && !this.boss.dead) lights.push(this.boss.glow());
    if (this.hunter) lights.push(this.hunter.glow());
    if (this.bell) lights.push(this.bell.glow());
    // active ghost platforms glow faintly
    if (this.level.tollActive) {
      for (const gp of this.level.ghosts) {
        const gx = gp.x * TW + 8, gy = gp.y * TW + 3;
        if (gx > camX - 30 && gx < camX + VIEW_W + 30 && gy > camY - 30 && gy < camY + VIEW_H + 30)
          lights.push({ x: gx, y: gy, r: 13, color: '127,233,245', a: 0.09 });
      }
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
    ctx.fillStyle = p.tier >= 3 ? '#ffe27a' : '#c22e46';
    ctx.fillRect(8, 29, Math.round(80 * (p.velocity / 3)), 2);
    // toll bell: cyan while ghosts hold, blinking as the ring nears
    const warn = this.tollT > TOLL_PERIOD - TOLL_WARN;
    let bellCol = '#3a3f61';
    if (this.level.tollActive) bellCol = '#7fe9f5';
    else if (warn && Math.floor(performance.now() / 140) % 2 === 0) bellCol = '#ffe27a';
    ctx.fillStyle = bellCol;
    ctx.fillRect(96, 20, 7, 2);
    ctx.fillRect(97, 18, 5, 2);
    ctx.fillRect(98, 17, 3, 1);
    ctx.fillRect(99, 23, 1, 1);
    ctx.fillStyle = '#20223a';
    ctx.fillRect(96, 29, 10, 2);
    ctx.fillStyle = bellCol;
    const tollFrac = this.level.tollActive
      ? (TOLL_ACTIVE - this.tollT) / TOLL_ACTIVE
      : 1 - (this.tollT - TOLL_ACTIVE) / (TOLL_PERIOD - TOLL_ACTIVE);
    ctx.fillRect(96, 29, Math.round(10 * clamp(tollFrac, 0, 1)), 2);
    // timer
    drawTextShadow(ctx, fmtTime(this.time), VIEW_W - 8 - textWidth(fmtTime(this.time), 1), 8, 1, '#e8e4f0');
    if (!isNaN(this.best)) {
      const bt = 'BEST ' + fmtTime(this.best);
      drawTextShadow(ctx, bt, VIEW_W - 8 - textWidth(bt, 1), 18, 1, '#8d94b3');
    }
    // zone toast
    if (this.toast) {
      const a = this.toast.t < 0.3 ? this.toast.t / 0.3 : this.toast.t > 1.9 ? clamp((2.4 - this.toast.t) / 0.5, 0, 1) : 1;
      ctx.globalAlpha = a;
      drawTextShadowCentered(ctx, this.toast.text, VIEW_W / 2, 40, 2, '#e8e4f0');
      ctx.globalAlpha = 1;
    }
    // whispers
    if (this.whisper) {
      const w = this.whisper;
      const a = w.t < 0.4 ? w.t / 0.4 : w.t > 2.8 ? clamp((3.4 - w.t) / 0.6, 0, 1) : 1;
      ctx.globalAlpha = a * 0.9;
      drawTextShadowCentered(ctx, w.text, VIEW_W / 2, 62, 1, '#8d94b3');
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
      const vuln = b.state === 'stun' || b.state === 'recover';
      ctx.fillStyle = vuln ? '#ffe27a' : '#7fe9f5';
      ctx.fillRect(bx, by, Math.round(bw * (b.hp / hpMax)), 5);
      for (let i = 1; i < hpMax; i++) {
        ctx.fillStyle = 'rgba(20,18,31,0.7)';
        ctx.fillRect(bx + Math.round(bw * i / hpMax), by, 1, 5);
      }
    }
    // Hound proximity warning (Night II)
    if (this.hunter) {
      const d = Math.abs(this.hunter.cx - (p.x + p.w / 2));
      if (d < 150 && this.level.tollActive) {
        if (Math.floor(performance.now() / 120) % 2 === 0)
          drawTextShadowCentered(ctx, 'THE HOUND SURGES', VIEW_W / 2, 78, 1, '#c22e46');
      }
    }
    // controls hint (reflects current bindings; hidden during the boss)
    if (this.hintT > 0 && this.time < 30 && !this.boss) {
      ctx.globalAlpha = clamp(this.hintT, 0, 1);
      if (touchUI()) {
        // Naming keys to a thumb is noise, so only the combos are worth saying.
        // Placement is hemmed in: y=40 is the zone toast, the top corners are the
        // HUD, bottom-left is the stick (x<=86) and bottom-right the button
        // cluster (x>=352). This sits in the gap between them.
        drawTextShadowCentered(ctx, 'DOWN+DASH SLIDE  ·  DOWN+SLASH POGO',
          214, VIEW_H - 9, 1, '#8d94b3');
      } else {
        drawTextShadowCentered(ctx,
          'ARROWS RUN   ' + pk('jump') + ' JUMP   ' + pk('attack') + ' SLASH   ' + pk('dash') + ' DASH',
          VIEW_W / 2, VIEW_H - 24, 1, '#8d94b3');
        drawTextShadowCentered(ctx,
          'DOWN+' + pk('dash') + ' SLIDE   DOWN+' + pk('attack') + ' IN AIR POGO   F2 REBIND',
          VIEW_W / 2, VIEW_H - 14, 1, '#565d85');
      }
      ctx.globalAlpha = 1;
    }
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
        ? 'STICK LEFT   JUMP  SLASH  DASH RIGHT'
        : pk('jump') + ' JUMP   ' + pk('attack') + ' SLASH   ' + pk('dash') + ' DASH   F2 REBIND',
      VIEW_W / 2, 224, 1, '#565d85');
    drawTextShadowCentered(ctx, 'SPEED FEEDS THE FLAME. THE FLAME FEEDS YOU.', VIEW_W / 2, 240, 1, '#3a3f61');
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
    // thumb-driven device, quantise only above 2x and take the fractional fill;
    // nearest-neighbour is on (imageSmoothingEnabled=false), so it stays chunky.
    // Desktop keeps its original rule exactly, including in a small window — a
    // 900x600 browser still gets a pixel-perfect 1x, not a fractional 1.85x.
    const s = IS_TOUCH_PRIMARY
      ? (raw >= 2 ? Math.floor(raw) : raw)
      : (raw >= 1 ? Math.floor(raw) : raw);
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
      grounded: game.player.grounded,
      zone: game.zoneName, time: game.time,
      kills: game.kills, deaths: game.deaths,
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
    level: i => { game.loadLevel(i); game.pick = i; game.state = 'play'; return game.level.name; },
    unlockAll: () => { game.unlockUpTo(LEVELS.length - 1); },
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
