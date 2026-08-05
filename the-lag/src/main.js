// THE LAG — boot, HUD, input, pointer-lock, loop.
import { World } from './world.js';
import { Audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const audio = new Audio();

const HUD = {
  subT: 0,
  say(text, dur = 3) {
    const s = $('subtitle'); $('subLine').textContent = text;
    s.style.opacity = '1';
    clearTimeout(this._t);
    this._t = setTimeout(() => { s.style.opacity = '0'; }, dur * 1000);
  },
  objective(html) { $('objective').innerHTML = html; },
  prompt(text) {
    const p = $('prompt');
    if (text) { p.querySelector('.lbl').textContent = text; p.style.opacity = '1'; $('reticle').classList.add('on'); }
    else { p.style.opacity = '0'; $('reticle').classList.remove('on'); }
  },
};

let world = null;
let running = false;

function boot() {
  world = new World($('scene'), {
    audio,
    say: (t, d) => HUD.say(t, d),
    objective: (h) => HUD.objective(h),
    prompt: (t) => HUD.prompt(t),
    win: () => end('win'),
    lose: () => end('dead'),
  });
  HUD.objective('Find the way out.');
  addEventListener('resize', () => world.resize());
  // render one frame behind the title so it isn't black
  world._render();
  requestAnimationFrame(loop);
}

function start() {
  audio.init();
  $('title').style.opacity = '0';
  setTimeout(() => $('title').classList.add('hidden'), 700);
  $('hud').style.opacity = '1';
  running = true;
  requestPointer();
}

function requestPointer() {
  const el = world.renderer.domElement;
  if (el.requestPointerLock) el.requestPointerLock();
}

function loop() {
  requestAnimationFrame(loop);
  if (running && world) world.update();
}

function end(kind) {
  running = false;
  if (document.pointerLockElement) document.exitPointerLock();
  const screen = kind === 'win' ? $('winScreen') : $('deadScreen');
  screen.classList.add('show');
}

// ---------------- input ----------------
addEventListener('pointerlockchange', () => {
  const locked = !!document.pointerLockElement;
  $('paused').classList.toggle('hidden', locked || !running);
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement && world) world.look(e.movementX, e.movementY);
});

addEventListener('mousedown', (e) => {
  if (!running) return;
  if (!document.pointerLockElement) { requestPointer(); return; }
  if (e.button === 2) { world._mouseRight = true; }
  else if (e.button === 0) { world.interact(); }
});
addEventListener('mouseup', (e) => { if (e.button === 2 && world) world._mouseRight = false; });
addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener('keydown', (e) => {
  if (!world) return;
  if (e.code === 'KeyF') world.flare();
  else if (e.code === 'KeyE') world.interact();
  world.key(e.code, true);
});
addEventListener('keyup', (e) => { if (world) world.key(e.code, false); });

// title / retry
$('title').addEventListener('click', start);
$('paused').addEventListener('click', requestPointer);
for (const id of ['winRetry', 'deadRetry']) {
  $(id).addEventListener('click', () => location.reload());
}

boot();
