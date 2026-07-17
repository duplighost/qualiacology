// UNINVITED — bootstrap and main loop.
import * as THREE from 'three';
import { makeMaterials } from './textures.js';
import { World } from './world.js';
import { furnish, getCandles, getFlames } from './rooms.js';
import { Player } from './player.js';
import { Interactions } from './interact.js';
import { Effects } from './effects.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';
import { Events } from './events.js';
import { NPCs } from './npc.js';
import { Scares } from './scares.js';
import { GameState } from './story.js';

function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  document.body.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  // A heavy WebGL scene can lose its GPU context (driver hiccup, tab sleep, low
  // VRAM). Without preventDefault the canvas black-screens for good — which reads
  // as a crash. This lets the browser restore it, and we ease quality down on the
  // way back so it doesn't happen again.
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
  canvas.addEventListener('webglcontextrestored', () => { try { fx.setQuality(0); } catch (_) {} }, false);

  const scene = new THREE.Scene();
  // near 0.05 / far 300 gave a 6000:1 range and almost no depth precision out at
  // the treeline/sky, so distant coplanar surfaces z-fought (flickering). 0.2 / 260
  // is ~6x tighter — walls stay >0.34m away (collision radius) so nothing clips.
  const camera = new THREE.PerspectiveCamera(71, innerWidth / innerHeight, 0.2, 260);

  const M = makeMaterials();
  const world = new World(scene, M);

  const game = new GameState();
  const ui = new UI();
  const audio = new AudioEngine();
  const player = new Player(camera, world, canvas);
  const interactions = new Interactions(camera, world);
  const fx = new Effects(renderer, scene, camera, world);

  const ctx = {
    game, world, ui, audio, player, fx, interactions,
    props: {},
    interact: (obj, label, fn) => interactions.add(obj, label, fn),
    // examining a prop makes a small handling sound and a flicker of unease —
    // no words. (The `text` arg is ignored now; kept so callers don't change.)
    examine: (obj, label, text) => interactions.add(obj, label ? `look at ${label}` : 'look', () => {
      audio.creak(0.4);   // 0.22 was under the ambience floor — examining felt broken
      fx.fearTarget = Math.max(fx.fearTarget, 0.1);
      setTimeout(() => { if (!events.finale.active && fx.fearTarget <= 0.1) fx.fearTarget = 0; }, 1500);
    }),
    toastMsg: (t) => ui.toast(t),
  };

  furnish(world, M, ctx);
  setupDoors(ctx);
  const npcs = new NPCs(ctx);
  ctx.npcs = npcs;
  fx.setCandles(getCandles());
  const flames = getFlames();

  const events = new Events(ctx);
  ctx.events = events;
  const scares = new Scares(ctx);
  ctx.scares = scares;
  window.UNV = ctx; // debug handle

  fx.onThunder = () => audio.thunder(0.4 + Math.random() * 0.5);
  player.onFootstep = (run, level) => audio.footstep(run, level);

  ui.onModalChange = (open) => {
    player.frozen = open;
    if (open) document.exitPointerLock?.();
    else if (player.enabled && !ui.touch) player.lock();
  };

  /* ---------- interaction with doors ---------- */
  function setupDoors(c) {
    for (const door of world.doors) {
      if (door.secret) continue;
      for (const p of door.panels) {
        p.g.traverse((m) => {
          if (!m.isMesh) return;
          m.userData.inter = {
            enabled: true,
            prompt: () => door.isOpen ? `close ${door.name}`
              : door.locked === 'never' ? `${door.name} — it won't open`
                : (door.locked && !game.hasKey(door.locked)) ? `${door.name} — locked`
                  : (door.locked && !door.unlockedOnce) ? `unlock ${door.name}`
                    : `open ${door.name}`,
            action: () => {
              // the front door is bolted from outside — it only rattles
              if (door.locked === 'never') { audio.lockedRattle(); return; }
              // a keyed door won't budge until you're carrying its key
              if (door.locked && !game.hasKey(door.locked)) { audio.lockedRattle(); return; }
              // first time through a keyed door, it reads as unlocking
              if (door.locked && !door.unlockedOnce) { door.unlockedOnce = true; audio.unlock?.(); }
              door.setOpen(!door.isOpen);
              if (door.isOpen) { audio.doorOpen(door.opts.heavy); ctx.scares?.maybeDoorReveal(door, player.pos); }
              else audio.doorClose(door.opts.heavy);
            },
          };
          interactions.targets.push(m);
        });
      }
    }
  }

  /* ---------- desktop input ---------- */
  document.addEventListener('keydown', (e) => {
    if (!player.enabled || ui.modal || events.finale.active) return;
    if (e.code === 'KeyE') interactions.use();
    if (e.code === 'KeyF') { fx.setLantern(!fx.lanternOn); audio.unlock?.(); }
  });
  canvas.addEventListener('click', () => {
    if (player.enabled && !ui.modal && !ui.touch && !player.locked) player.lock();
  });

  /* ---------- touch input (activates only when the screen is actually touched,
     so a mouse+keyboard user on a touchscreen laptop keeps pointer-lock look) ---------- */
  function enterTouchMode() {
    if (ui.touch) return;
    ui.touch = true;
    player.touchActive = true;
    document.body.classList.add('touch');
    document.exitPointerLock?.();
    fx.setQuality(Math.min(fx.quality, 1));   // ease mobile GPUs
    document.getElementById('hint').innerHTML =
      'LEFT thumb — move &nbsp;·&nbsp; RIGHT thumb — look &nbsp;·&nbsp; buttons to look closer & torch';
  }

  let leftId = null, leftOX = 0, leftOY = 0, rightId = null, rightLX = 0, rightLY = 0;
  canvas.addEventListener('touchstart', (e) => {
    enterTouchMode();
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth / 2 && leftId === null) { leftId = t.identifier; leftOX = t.clientX; leftOY = t.clientY; }
      else if (t.clientX >= innerWidth / 2 && rightId === null) { rightId = t.identifier; rightLX = t.clientX; rightLY = t.clientY; }
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === leftId) {
        const dx = (t.clientX - leftOX) / 46, dy = (t.clientY - leftOY) / 46;
        player.moveX = Math.max(-1, Math.min(1, dx));
        player.moveY = Math.max(-1, Math.min(1, dy));
        player.run = Math.hypot(player.moveX, player.moveY) > 0.85;
      } else if (t.identifier === rightId) {
        player.lookDX += (t.clientX - rightLX);
        player.lookDY += (t.clientY - rightLY);
        rightLX = t.clientX; rightLY = t.clientY;
      }
    }
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === leftId) { leftId = null; player.moveX = 0; player.moveY = 0; player.run = false; }
      if (t.identifier === rightId) rightId = null;
    }
  };
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  const tbtn = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); enterTouchMode(); if (!ui.modal && !events.finale.active) fn(); }, { passive: false });
  };
  tbtn('btnUse', () => interactions.use());
  tbtn('btnLamp', () => { fx.setLantern(!fx.lanternOn); audio.unlock?.(); });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    fx.resize(innerWidth, innerHeight);
  });

  /* ---------- title / begin ---------- */
  document.getElementById('loadstate').textContent = 'the house is dark';
  const begin = document.getElementById('beginBtn');
  function beginGame() {
    if (player.enabled) return;
    audio.start();
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('fade').style.opacity = 0;
    player.enabled = true;
    if (!ui.touch) player.lock();
    events.start();
    setTimeout(() => audio.thunder(0.7), 600);
  }
  begin.addEventListener('click', beginGame);
  begin.addEventListener('touchstart', (e) => { e.preventDefault(); enterTouchMode(); beginGame(); }, { passive: false });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let hudT = 0, perfAccum = 0, perfN = 0, perfChecked = 0;

  function loop() {
    requestAnimationFrame(loop);
    const rawDt = clock.getDelta();
    const dt = Math.min(0.05, rawDt);
    const t = clock.elapsedTime;

    if (perfChecked < 2 && t > 4) {
      perfAccum += rawDt; perfN++;
      if (perfN >= 100) {
        const avg = perfAccum / perfN; perfAccum = 0; perfN = 0; perfChecked++;
        if (avg > 0.07) fx.setQuality(0);
        else if (avg > 0.037) fx.setQuality(Math.min(1, fx.quality));
        else perfChecked = 2;
      }
    }

    player.update(dt);
    for (const d of world.doors) d.update(dt);
    npcs.update(dt, player.pos);
    events.update(dt);
    scares.update(dt, player.pos);
    fx.update(dt, player.pos, camera);

    for (let i = 0; i < flames.length; i++) {
      const f = flames[i];
      f.scale.y = 1.9 + Math.sin(t * 13 + i * 2.7) * 0.35 + Math.sin(t * 29 + i) * 0.15;
      f.scale.x = 1 + Math.sin(t * 17 + i * 1.3) * 0.12;
    }

    if (!ui.modal && !events.finale.active) {
      ui.prompt(interactions.update());
    } else ui.prompt(null);

    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.25;
      const room = world.roomAt(player.pos.x, player.pos.z, player.pos.y);
      ui.hud(room ? room.name : '');
    }

    fx.render();
  }
  loop();
}

boot();
