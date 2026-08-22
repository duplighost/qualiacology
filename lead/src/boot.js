/* Entry point. Builds the world, starts the loop, and gets out of the way.
 *
 * There is no title screen and no menu wall: the game is already running when
 * the page finishes loading, the kid is already standing on the stoop, and
 * the first thing that moves you is the dog. */

import { Gfx } from './gfx.js';
import { Loop, Input } from './feel.js';
import { Save } from './save.js';
import { Game } from './game.js';
import { Render } from './render.js';
import { C, PX } from './config.js';

const canvas = document.getElementById('game');
const gfx = new Gfx(canvas, { design: C.view.width });
const input = new Input();
const save = new Save('lead.v1', { finished: false, bestLookBacks: 0, lastTrust: 0, muted: false });

const game = new Game(gfx, input, save);
const render = new Render(gfx, game.world);

game.sound.a.setMuted(!!save.data.muted);
input.onFirstInput(() => game.sound.boot());
input.bindMouse(canvas, (nx, ny) => ({ x: nx, y: ny }));
input.bindTouch(canvas);

addEventListener('resize', () => { gfx.resize(); game.cam.w = gfx.vw; game.cam.h = gfx.vh; });

/* Two keys that are not the game: mute, and start again. Both live on the
 * page, not in a panel, and neither ever stops the world. */
/* Two keys that are not the game. Mute answers with the sound of itself going
 * away and coming back; starting again wants a key held down for a second,
 * because the alternative was a chord with the grip key in it. */
let restartHeld = 0, restartTimer = null;
addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    const m = !save.data.muted;
    save.set({ muted: m });
    if (m) { game.sound.grip(false); setTimeout(() => game.sound.a.setMuted(true), 90); }
    else { game.sound.a.setMuted(false); game.sound.grip(true); }
  }
  if ((e.key === 'r' || e.key === 'R') && !e.repeat && !restartTimer) {
    restartHeld = performance.now();
    restartTimer = setTimeout(() => { game.reset(); restartTimer = null; }, 900);
  }
});
addEventListener('keyup', (e) => {
  if (e.key === 'r' || e.key === 'R') { clearTimeout(restartTimer); restartTimer = null; }
});

const loop = new Loop({
  step: 1 / 120,
  update: (dt) => {
    /* The shake is the only thing that keeps moving while time is stopped. */
    game.cam.shakeStep(dt);
    if (game.hitstop > 0) { game.hitstop -= dt; return; }
    game.update(dt);
  },
  draw: (alpha) => render.draw(game, alpha),
});

/* ?test=1 hands the clock to the test runner so runs reproduce exactly. */
const params = new URLSearchParams(location.search);
const testing = params.get('test') === '1';
if (params.get('at')) {
  const x = Number(params.get('at'));
  game.kid.place(x * PX, game.world.groundAt(x * PX));
  game.dog.place((x + 1.4) * PX, game.world.groundAt((x + 1.4) * PX));
  game.cam.x = game.kid.x; game.cam.y = game.kid.y;
  game.cam.px = game.cam.x; game.cam.py = game.cam.y;
}
if (!testing) loop.start();
else render.draw(game, 1);

import { ROUTE } from './route.js';

window.__LEAD = {
  game, render, gfx, loop, input, marks: ROUTE.marks,
  advance: (s) => { let left = s; while (left > 0) { const d = Math.min(1 / 120, left); loop.advance(d); left -= d; } },
  draw: () => render.draw(game, 1),
  shot: () => gfx.shot(),
  canvas: () => canvas,
  hold: (v) => { if (v) input.press('shift'); else input.release('shift'); },
  key: (k, v) => { if (v) input.press(k); else input.release(k); },
  warp: (xm) => {
    game.kid.place(xm * PX, game.world.groundAt(xm * PX));
    game.dog.place((xm + 1.4) * PX, game.world.groundAt((xm + 1.4) * PX));
    game.leash._seeded = false;
    game.cam.x = game.kid.x; game.cam.y = game.kid.y;
    game.cam.px = game.cam.x; game.cam.py = game.cam.y;
  },
  state: () => ({
    t: +game.time.toFixed(2),
    x: +(game.kid.x / PX).toFixed(2),
    dogX: +(game.dog.x / PX).toFixed(2),
    kidV: +(game.kid.vx / PX).toFixed(2),
    dogV: +(game.dog.vx / PX).toFixed(2),
    sep: +(Math.abs(game.dog.x - game.kid.x) / PX).toFixed(2),
    L: +game.leash.L.toFixed(2),
    grip: game.leash.grip,
    strain: +game.leash.strain.toFixed(3),
    towing: +game.leash.towing.toFixed(3),
    trust: +game.brain.trust.toFixed(3),
    onGround: game.kid.onGround,
    chapter: game.world.chapterAt(game.kid.x).id,
    unclipped: game.unclipped,
    zoom: +game.cam.zoom.toFixed(3),
    kidY: +(game.kid.y / PX).toFixed(2),
    dogY: +(game.dog.y / PX).toFixed(2),
    gy: +(game.world.groundAt(game.kid.x) / PX).toFixed(2),
    hauling: +(game.hauling || 0).toFixed(2),
    slope: +game.world.slopeAt(game.kid.x).toFixed(3),
    slip: +(game.kid.slipping || 0).toFixed(2),
    dogAir: game.dog.airborne,
    dogGround: +(game.dog.ground / PX).toFixed(2),
    dogFace: game.dog.face,
    dogAnchor: +((game.dog.anchor||0) / PX).toFixed(2),
    want: +(game.brain.targetScore || 0).toFixed(2),
    tgt: game.brain.target ? game.brain.target.kind : null,
    stats: game.stats,
  }),
};
