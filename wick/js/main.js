// main.js — boot, the frame loop, and the handle tests drive the game by.

import { Game, MOVEMENTS } from './game.js';

const qs = new URLSearchParams(location.search);
const canvas = document.getElementById('c');

function fail(e) {
  const msg = (e && e.message) ? e.message : String(e);
  const ui = document.getElementById('err');
  ui.textContent = 'WICK needs WebGL2 with float render targets.\n\n' + msg;
  ui.classList.add('on');
  document.getElementById('fade').classList.remove('clear');
  console.error(e);
  window.__WICK = Object.assign(window.__WICK || {}, { ready: false, error: msg });
}

let game;
try {
  game = new Game(canvas);
} catch (e) { fail(e); }

if (game) {
  game.testMode = qs.has('test');
  const start = qs.get('m');

  const api = {
    ready: false,
    error: null,
    game,
    movements: MOVEMENTS,
    stats: () => game.stats(),
    advance: (s) => game.advanceForTest(s),
    goto: (id) => game.startMovement(id),
    loadRaw: (id) => {
      game.titleMode = false; game.state = 'play'; game.checkpoint = null;
      game.loadMovement(id); game._hints = null;
      game.ui.showTitle(false); game.ui.hint(''); game.ui.hideCard(); game.ui.hideMenu();
      game.renderer.p.fade = 1;
    },
    setHand: (x, y, down) => { game.testHand = [x, y]; game.testDown = !!down; },
    moveHand: (x, y) => { game.testHand = [x, y]; },
    releaseHand: () => { game.testHand = null; game.testDown = false; },
    probe: (i, row) => game.fluid.probe(i, row),
    ember: () => game.ember,
    level: () => game.level,
    params: () => game.fluid.p,
    grade: () => game.level && game.level.grade,
    lightAll: () => {
      const L = game.level;
      for (const t of L.targets) game._paintHeat(L, t.x, t.y, 4, 3.0);
      game.fluid.load(L);
    },
    setProgress: (n) => { game.progress.unlocked = n; game._save(); },
    caps: () => {
      const gl = game.glx.gl;
      return {
        vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        colorBufferFloat: !!game.glx.extColorFloat, floatLinear: !!game.glx.extLinearFloat,
        maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxUniformVec: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      };
    },
    fps: 0,
  };
  window.__WICK = api;

  let frames = 0, fpsT = performance.now();
  function loop(t) {
    try {
      game.frame(t);
      frames++;
      if (t - fpsT > 500) { api.fps = Math.round((frames * 1000) / (t - fpsT)); frames = 0; fpsT = t; }
    } catch (e) {
      fail(e);
      return;
    }
    requestAnimationFrame(loop);
  }

  (async () => {
    try {
      await game.boot();
      if (start && MOVEMENTS.includes(start)) {
        game.progress.unlocked = Math.max(game.progress.unlocked, MOVEMENTS.indexOf(start));
        await game.startMovement(start);
      }
      api.ready = true;
    } catch (e) { fail(e); }
  })();

  requestAnimationFrame(loop);
  window.addEventListener('resize', () => game.resize());
}
