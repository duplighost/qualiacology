/* main.js — boot. */

import { Game } from './game.js';
import { VIEW_W, VIEW_H } from './config.js';

const canvas = document.getElementById('game-canvas');
const titleLayer = document.getElementById('title-layer');
const beginBtn = document.getElementById('begin');
const pauseBtn = document.getElementById('pause-btn');
const muteBtn = document.getElementById('mute-btn');
const shell = document.getElementById('game-shell');
const zoneLabel = document.getElementById('zone-label');

const game = new Game(canvas, {
  onMode(mode) {
    shell.dataset.mode = mode;
    if (mode === 'title') dressTitle();
    titleLayer.hidden = mode !== 'title';
    pauseBtn.textContent = mode === 'paused' ? 'RESUME' : 'PAUSE';
  },
  onZone(name) {
    if (!name) return;
    zoneLabel.textContent = name;
    zoneLabel.classList.remove('show');
    void zoneLabel.offsetWidth;
    zoneLabel.classList.add('show');
  },
  onMute(muted) { muteBtn.textContent = muted ? 'SOUND OFF' : 'SOUND ON'; },
  onError(err) {
    const box = document.getElementById('fatal');
    box.hidden = false;
    box.textContent = String(err && err.stack ? err.stack : err);
  },
});

const againBtn = document.getElementById('begin-again');

/* A save should never be spent by accident: if there is one, the big button
 * resumes it and starting over is the small deliberate one. */
const AGAIN_IDLE = 'begin again — from the gate, with nothing';
const AGAIN_ARMED = 'this discards the noon and the shards. click once more.';
let againArmed = false;

function dressTitle() {
  againArmed = false;
  againBtn.textContent = AGAIN_IDLE;
  if (game.hasSave()) {
    beginBtn.textContent = 'CONTINUE THE WAKE';
    againBtn.hidden = false;
  } else {
    beginBtn.textContent = 'BEGIN THE WAKE';
    againBtn.hidden = true;
  }
}
dressTitle();

beginBtn.addEventListener('click', () => { game.start(); });
againBtn.addEventListener('click', () => {
  if (!againArmed) {
    againArmed = true;
    againBtn.textContent = AGAIN_ARMED;
    return;
  }
  againArmed = false;
  game.newRun();
});
pauseBtn.addEventListener('click', () => game.togglePause());
muteBtn.addEventListener('click', () => game.toggleMute());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    e.preventDefault();
    if (game.mode === 'forge' || game.mode === 'map') game.setMode('playing');
    else if (game.mode === 'playing' || game.mode === 'paused') game.togglePause();
  }
  if (e.code === 'KeyN') game.toggleMute();   /* M is the map */
  if (e.code === 'Enter' && game.mode === 'title') { e.preventDefault(); game.start(); }
  if (e.code === 'Enter' && game.mode === 'victory') { e.preventDefault(); game.setMode('title'); }
});

game.lastTime = performance.now();
requestAnimationFrame((t) => { game.lastTime = t; game.loop(t); });

/* The test harness every game in this house exposes. */
window.__VW = {
  game,
  view: { w: VIEW_W, h: VIEW_H },
  start: () => game.start(),
  /** Advance the simulation deterministically, even in a hidden tab. */
  step: (seconds) => game.advance(seconds),
  key: (action, down = true) => game.input.set(action, down),
  tap: (action) => game.input.tap(action),
  level: (i) => { game.loadLevel(i, true); game.setMode('playing'); },
  warp: (x, y) => {
    game.player.x = x;
    if (y !== undefined) game.player.y = y;
    game.camera.snap(game.player, game.level);
  },
  boss: () => { if (game.level.bossArena) { game.player.x = game.level.bossArena.x + 60; game.spawnBoss(); } },
  state: () => ({
    mode: game.mode,
    level: game.level.id,
    x: game.player.x, y: game.player.y,
    vx: game.player.vx, vy: game.player.vy,
    hp: game.player.hp, maxHp: game.player.maxHp,
    grounded: game.player.grounded,
    crouching: game.player.crouching,
    attack: game.player.attack,
    resonance: game.player.resonance,
    enemies: game.enemies.length,
    boss: game.boss ? { hp: game.boss.hp, phase: game.boss.phase, state: game.boss.state } : null,
    fatal: game.fatal ? String(game.fatal) : null,
  }),
  shot: async (name) => {
    const data = canvas.toDataURL('image/png');
    await fetch(`/dev-shot?n=${encodeURIComponent(name)}`, { method: 'POST', body: data });
    return true;
  },
};

if (new URLSearchParams(location.search).has('autotest')) {
  game.resetRun();
  game.setMode('playing');
  titleLayer.hidden = true;
}
