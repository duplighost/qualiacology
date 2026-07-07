// ── VESPERBANE · game.js ─────────────────────────────────────────────
// Loop, camera, rendering, HUD, and run/death/win flow.
'use strict';

const VIEW_W = 480, VIEW_H = 270;
const STEP = 1 / 60;

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
  dash:  ['KeyC', 'ShiftLeft', 'ShiftRight', 'KeyL'],
};
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

function setKey(code, isDown) {
  const name = KEYMAP[code];
  if (!name) return false;
  if (isDown && !input[name]) {
    if (name === 'jump') input.jumpPressed = true;
    if (name === 'attack') input.attackPressed = true;
    if (name === 'dash') input.dashPressed = true;
  }
  input[name] = isDown;
  return true;
}

// ── game ─────────────────────────────────────────────────────────────
class Game {
  constructor(level) {
    this.level = level;
    this.state = 'title';      // title | play | dead | win | pause | gallery | controls
    this.ctrlCursor = 0; this.ctrlListening = false; this.ctrlReturn = 'title';
    this.ctrlFlash = 0; this.ctrlFlashMsg = '';
    this.camX = 0; this.camY = 0;
    this.time = 0;
    this.stateT = 0;
    this.best = parseFloat(localStorage.getItem('vesperbane.best') || 'NaN');
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

  resetRun() {
    const L = this.level;
    this.player = new Player(L.playerStart.x, L.playerStart.y);
    this.respawn = { x: L.playerStart.x, y: L.playerStart.y };
    this.spawnEntities();
    this.time = 0; this.kills = 0; this.deaths = 0;
    this.routes = { split1: null, split2: null };
    this.zoneName = null;
    this.toast = null;
    this.hintT = 7;            // controls hint at the start
    this.dawnT = 0;
    this.newBest = false;
    this.camX = clamp(this.player.x - VIEW_W / 2, 0, L.w * TW - VIEW_W);
    this.camY = clamp(this.player.y - VIEW_H / 2, 0, L.h * TW - VIEW_H);
    FX.reset();
  }

  spawnEntities() {
    // checkpoints keep their lit state across deaths; everything else respawns
    const litChecks = new Set();
    if (this.checks) for (const c of this.checks) if (c.active) litChecks.add(c.x + ',' + c.y);
    this.enemies = []; this.candles = []; this.sparks = [];
    this.hearts = []; this.checks = []; this.signs = [];
    this.bell = null;
    for (const s of this.level.spawns) {
      switch (s.type) {
        case 'wretch': this.enemies.push(new Wretch(s.tx, s.ty)); break;
        case 'bat': this.enemies.push(new Bat(s.tx, s.ty)); break;
        case 'garg': this.enemies.push(new Gargoyle(s.tx, s.ty)); break;
        case 'candle': this.candles.push(new Candle(s.tx, s.ty)); break;
        case 'spark': this.sparks.push(new Spark(s.tx, s.ty)); break;
        case 'heart': this.hearts.push(new Heart(s.tx, s.ty)); break;
        case 'check': {
          const c = new Checkpoint(s.tx, s.ty);
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
    audio.sfx('kill');
    this.kills++;
    FX.hitstop(0.05); FX.shake(2, 0.18);
    FX.burst(e.cx, e.cy, ['#4bd48e', '#2b8256', '#f4f2fa'], 14, { speed: 110, life: 0.5 });
    const p = this.player;
    p.velocity = Math.min(3, p.velocity + 0.5);
    p.dashCd = 0; p.airDashUsed = false;    // kills refuel the dash
  }

  onPlayerDeath() {
    this.deaths++;
    this.state = 'dead';
    this.stateT = 0;
  }

  onWin() {
    this.state = 'win';
    this.stateT = 0;
    if (!(this.best <= this.time)) {
      this.best = this.time;
      this.newBest = true;
      try { localStorage.setItem('vesperbane.best', String(this.time)); } catch (e) {}
    }
  }

  // ── update ─────────────────────────────────────────────────────────
  update(dt) {
    const p = this.player;
    audio.intensity = this.state === 'play' ? p.tier : 0;
    audio.update();

    if (this.state === 'title') {
      this.stateT += dt;
      if (input.anyPressed) { this.state = 'play'; this.stateT = 0; }
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
      return;
    }

    // ── play ──
    if (FX.stopT > 0) { FX.stopT -= dt; return; }   // hitstop freezes the world

    this.time += dt;
    if (this.hintT > 0 && (input.left || input.right)) this.hintT = Math.min(this.hintT, 2);
    this.hintT -= dt;

    p.update(dt, input, this.level, this);

    for (const e of this.enemies) e.update(dt, this.level, p);
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
  }

  updateCamera(dt) {
    const p = this.player;
    const look = p.facing * 28 + p.vx * 0.22;
    const tx = clamp(p.x + p.w / 2 + look - VIEW_W / 2, 0, this.level.w * TW - VIEW_W);
    const ty = clamp(p.y + p.h / 2 - VIEW_H * 0.55, 0, this.level.h * TW - VIEW_H);
    this.camX = damp(this.camX, tx, 6, dt);
    this.camY = damp(this.camY, ty, 5, dt);
  }

  // ── controls / rebinding menu ──────────────────────────────────────
  openControls(from) {
    this.ctrlReturn = (from === 'pause' || from === 'title') ? from : 'play';
    this.ctrlCursor = 0; this.ctrlListening = false; this.ctrlFlash = 0;
    this.state = 'controls';
  }
  closeControls() { this.state = this.ctrlReturn; this.ctrlListening = false; }

  handleControlsKey(code) {
    const rows = ['jump', 'attack', 'dash', 'reset'];
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
      if (rows[this.ctrlCursor] === 'reset') { resetBinds(); this.ctrlFlash = 1.2; this.ctrlFlashMsg = 'DEFAULTS RESTORED'; }
      else this.ctrlListening = true;
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

    for (const s of this.signs) s.draw(ctx, camX, camY);
    for (const c of this.checks) c.draw(ctx, camX, camY);
    for (const c of this.candles) c.draw(ctx, camX, camY);
    for (const h of this.hearts) h.draw(ctx, camX, camY);
    for (const s of this.sparks) s.draw(ctx, camX, camY);
    if (this.bell) this.bell.draw(ctx, camX, camY);
    for (const e of this.enemies) e.draw(ctx, camX, camY);
    this.player.draw(ctx, camX, camY);
    FX.draw(ctx, camX, camY);

    this.drawLights(ctx, camX, camY);

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

    drawTextShadowCentered(ctx, 'CONTROLS', VIEW_W / 2, 26, 3, '#c22e46', '#4a0e1e');
    const blink = Math.floor(performance.now() / 260) % 2 === 0;
    const rows = [['JUMP', 'jump'], ['ATTACK', 'attack'], ['DASH', 'dash']];
    let y = 84;
    rows.forEach(([label, act], i) => {
      const sel = this.ctrlCursor === i;
      if (sel) drawText(ctx, '>', 92, y, 2, '#ffe27a');
      drawTextShadow(ctx, label, 114, y, 2, sel ? '#ffe27a' : '#e8e4f0');
      let keyStr, col = '#8d94b3';
      if (sel && this.ctrlListening) { keyStr = blink ? 'PRESS A KEY' : 'PRESS A KEY.'; col = '#7fe9f5'; }
      else keyStr = BINDS[act].slice(0, 3).map(keyLabel).join(' ');
      drawTextShadow(ctx, keyStr, 250, y, 2, col);
      y += 30;
    });
    const rsel = this.ctrlCursor === 3;
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
    // night gradient, shifted warm during dawn
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    if (this.dawnT > 0) {
      g.addColorStop(0, this.dawnT > 0.5 ? '#3d3a63' : '#151732');
      g.addColorStop(0.7, '#4c3757');
      g.addColorStop(1, '#6e4353');
    } else {
      g.addColorStop(0, '#0b0c1e');
      g.addColorStop(0.55, '#151732');
      g.addColorStop(1, '#232449');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // stars (slight parallax)
    const t = performance.now() / 1000;
    for (const s of this.stars) {
      const x = ((s.x - camX * 0.05) % VIEW_W + VIEW_W) % VIEW_W;
      const a = 0.35 + 0.35 * Math.sin(t * 1.4 + s.p);
      ctx.globalAlpha = a * (1 - this.dawnT);
      ctx.fillStyle = '#cdd3ee';
      ctx.fillRect(x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // moon
    ctx.globalAlpha = 1 - this.dawnT * 0.6;
    ctx.drawImage(SPR.moon, Math.round(368 - camX * 0.06), Math.round(34 - camY * 0.05));
    ctx.globalAlpha = 1;

    // skylines
    const drawTiled = (img, par, yoff) => {
      const w = img.width;
      let x = -(((camX * par) % w + w) % w);
      const y = Math.round(yoff - camY * par * 0.4);
      while (x < VIEW_W) { ctx.drawImage(img, Math.round(x), y); x += w; }
    };
    drawTiled(SPR.skyFar, 0.13, 30);
    drawTiled(SPR.skyMid, 0.3, 20);

    // drifting mist
    ctx.globalAlpha = 0.8;
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
    if (this.bell) lights.push(this.bell.glow());
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
    // controls hint (reflects current bindings)
    if (this.hintT > 0 && this.time < 30) {
      ctx.globalAlpha = clamp(this.hintT, 0, 1);
      drawTextShadowCentered(ctx,
        'ARROWS RUN   ' + pk('jump') + ' JUMP   ' + pk('attack') + ' SLASH   ' + pk('dash') + ' DASH',
        VIEW_W / 2, VIEW_H - 24, 1, '#8d94b3');
      drawTextShadowCentered(ctx,
        'DOWN+' + pk('dash') + ' SLIDE   DOWN+' + pk('attack') + ' IN AIR POGO   F2 REBIND',
        VIEW_W / 2, VIEW_H - 14, 1, '#565d85');
      ctx.globalAlpha = 1;
    }
  }

  drawTitle(ctx) {
    ctx.fillStyle = 'rgba(8,8,18,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const bob = Math.sin(this.stateT * 1.4) * 2;
    drawTextShadowCentered(ctx, 'VESPERBANE', VIEW_W / 2 + 2, 62 + bob + 2, 4, '#14121f', '#14121f');
    drawTextShadowCentered(ctx, 'VESPERBANE', VIEW_W / 2, 60 + bob, 4, '#c22e46', '#4a0e1e');
    drawTextShadowCentered(ctx, 'THE NIGHT IS LONG. RUN IT DOWN.', VIEW_W / 2, 104, 1, '#8d94b3');
    if (Math.floor(this.stateT * 1.6) % 2 === 0)
      drawTextShadowCentered(ctx, 'PRESS ANY KEY', VIEW_W / 2, 148, 2, '#e8e4f0');
    drawTextShadowCentered(ctx,
      'ARROWS/WASD RUN   ' + pk('jump') + ' JUMP   ' + pk('attack') + ' SLASH   ' + pk('dash') + ' DASH',
      VIEW_W / 2, 186, 1, '#565d85');
    drawTextShadowCentered(ctx, 'SPEED FEEDS THE FLAME. THE FLAME FEEDS YOU.', VIEW_W / 2, 200, 1, '#565d85');
    drawTextShadowCentered(ctx, 'F2  REBIND CONTROLS', VIEW_W / 2, 220, 1, '#8d94b3');
    if (!isNaN(this.best))
      drawTextShadowCentered(ctx, 'BEST NIGHT ' + fmtTime(this.best), VIEW_W / 2, 240, 1, '#d1a854');
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
    drawTextShadowCentered(ctx, 'DAWN', VIEW_W / 2, 52, 4, '#ffe27a', '#4a2c16');
    drawTextShadowCentered(ctx, 'THE VESPER BELL IS RUNG', VIEW_W / 2, 92, 1, '#e8e4f0');
    const r1 = this.routes.split1 || '-', r2 = this.routes.split2 || '-';
    drawTextShadowCentered(ctx, 'NIGHT TIME  ' + fmtTime(this.time), VIEW_W / 2, 122, 2, '#e8e4f0');
    if (this.newBest && Math.floor(this.stateT * 2) % 2 === 0)
      drawTextShadowCentered(ctx, 'NEW BEST!', VIEW_W / 2, 142, 1, '#ffe27a');
    drawTextShadowCentered(ctx, 'PATH  ' + r1 + ' > ' + r2, VIEW_W / 2, 162, 1, '#8d94b3');
    drawTextShadowCentered(ctx, 'FELLED ' + this.kills + '   FALLS ' + this.deaths, VIEW_W / 2, 176, 1, '#8d94b3');
    drawTextShadowCentered(ctx, 'R TO RUN THE NIGHT AGAIN', VIEW_W / 2, 214, 1, '#e8e4f0');
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
  const level = buildLevel();
  game = new Game(level);

  const canvas = document.getElementById('screen');
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function fit() {
    const s = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
    canvas.style.width = VIEW_W * s + 'px';
    canvas.style.height = VIEW_H * s + 'px';
  }
  fit();
  window.addEventListener('resize', fit);

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
      game.resetRun();
      game.checks = game.checks.map(c => { c.active = false; return c; });
      game.respawn = { x: game.level.playerStart.x, y: game.level.playerStart.y };
      game.state = 'play';
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
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 4) {
      game.update(STEP);
      acc -= STEP;
      steps++;
    }
    input.clearPressed();
    game.draw(ctx);
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
    start: () => { if (game.state === 'title') game.state = 'play'; },
    tier: n => { game.player.velocity = n; game.player.tier = n; },
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
