// Blackthorn Manor — bootstrap and main loop.
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
import { GameState, KEYS } from './story.js';

const SAVE_KEY = 'blackthorn-manor-save-v1';

function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(71, innerWidth / innerHeight, 0.05, 300);

  const M = makeMaterials();
  const world = new World(scene, M);
  world.scene = scene;

  const game = new GameState();
  const ui = new UI(game);
  const audio = new AudioEngine();
  const player = new Player(camera, world, renderer.domElement);
  const interactions = new Interactions(camera, world);
  const fx = new Effects(renderer, scene, camera, world);

  /* ---------- context shared with rooms/events ---------- */
  const ctx = {
    game, world, ui, audio, player, fx, interactions,
    props: {},
    toastMsg: (t) => ui.toast(t),
    readDoc: (id) => ui.readDoc(id),
    readText: (t, b, c) => ui.readText(t, b, c),
    doc: (obj, docId, label) => interactions.add(obj, `read ${label}`, () => ui.readDoc(docId)),
    examine: (obj, label, text) => {
      if (!label) return;
      interactions.add(obj, `examine ${label}`, () => ui.readText(label[0].toUpperCase() + label.slice(1), text));
    },
    interact: (obj, label, fn) => interactions.add(obj, label, fn),
    clue: (id) => {
      if (game.addClue(id)) save();
    },
    giveKey: (id) => {
      if (game.addKey(id)) {
        ui.toast(`🗝 ${KEYS[id].name} — taken.`);
        save();
      }
    },
  };

  furnish(world, M, ctx);
  interactions.addDoors(ctx);
  window.BT = ctx; // debug/console handle
  fx.setCandles(getCandles());
  const flames = getFlames();

  const events = new Events(ctx);
  ctx.events = events;

  fx.onThunder = () => audio.thunder(0.5 + Math.random() * 0.5);
  player.onFootstep = (run, level) => audio.footstep(run, level);

  ui.onModalChange = (open) => {
    player.frozen = open;
    if (open) document.exitPointerLock?.();
    else if (player.enabled) player.lock();
  };
  ui.onDocClosed = (id) => { events.onDocClosed(id); save(); };
  ui.onAccuse = (correct) => events.onAccused(correct);

  /* ---------- save / load ---------- */
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        clues: [...game.clues], keys: [...game.keys], docs: [...game.docsRead],
        flags: game.flags, pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
        yaw: player.yaw,
      }));
    } catch (e) { /* private mode etc. */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      s.clues.forEach(c => game.clues.add(c));
      s.keys.forEach(k => game.keys.add(k));
      s.docs.forEach(d => game.docsRead.add(d));
      game.flags = s.flags || {};
      if (s.pos) player.pos.set(s.pos.x, s.pos.y, s.pos.z);
      if (typeof s.yaw === 'number') player.yaw = s.yaw;
      if (game.flags.priestOpen) {
        const d = world.doorById.priestDoor;
        if (d) d.setOpen(true);
      }
      if (game.flags.atticOpen) ctx.props.applyAtticOpen?.();
      return game.clues.size > 0 || game.keys.size > 0;
    } catch (e) { return false; }
  }
  const resumed = load();
  setInterval(save, 12000);

  /* ---------- input ---------- */
  document.addEventListener('keydown', (e) => {
    if (!player.enabled) return;
    if (e.code === 'KeyE' || e.code === 'Escape') {
      if (ui.modal === 'paper') { ui.closePaper(); return; }
      if (ui.modal === 'journal') { ui.setModal(null); return; }
      if (ui.modal === 'accuse') {
        if (e.code === 'Escape') ui.setModal(null);
        else { const b = document.getElementById('declareBtn'); if (b && !b.disabled) b.click(); }
        return;
      }
      if (ui.modal) return;
      if (e.code === 'KeyE') interactions.use();
    }
    if (e.code === 'Tab') {
      e.preventDefault();
      if (ui.modal === 'journal') ui.setModal(null);
      else if (!ui.modal) ui.openJournal();
    }
    if (e.code === 'KeyF' && !ui.modal) {
      fx.setLantern(!fx.lanternOn);
      audio.unlock?.();
    }
  });

  renderer.domElement.addEventListener('click', () => {
    if (player.enabled && !ui.modal && !player.locked) player.lock();
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    fx.resize(innerWidth, innerHeight);
  });

  /* ---------- title / begin ---------- */
  document.getElementById('loadstate').textContent = resumed
    ? 'an unfinished inquiry awaits — your evidence is kept'
    : 'the house is awake';
  const begin = document.getElementById('beginBtn');
  begin.addEventListener('click', () => {
    audio.start();
    document.getElementById('title').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('fade').style.opacity = 0;
    player.enabled = true;
    player.lock();
    audio.thunder(0.8);
    if (!game.flags.introDone) events.start();
    else ui.toast('Blackthorn Manor. The house remembers you.');
  });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let hudT = 0;
  // adaptive quality: shed bloom/shadows if the machine can't keep up
  let perfAccum = 0, perfN = 0, perfChecked = 0;
  function loop() {
    requestAnimationFrame(loop);
    const rawDt = clock.getDelta();
    const dt = Math.min(0.05, rawDt);
    const t = clock.elapsedTime;

    if (perfChecked < 2 && t > 4) {
      perfAccum += rawDt; perfN++;
      if (perfN >= 100) {
        const avg = perfAccum / perfN;
        perfAccum = 0; perfN = 0; perfChecked++;
        if (avg > 0.07) fx.setQuality(0);
        else if (avg > 0.037) fx.setQuality(1);
        else perfChecked = 2;
      }
    }

    player.update(dt);
    for (const d of world.doors) d.update(dt);
    events.update(dt);
    fx.update(dt, player.pos, camera);

    // candle flames sway
    for (let i = 0; i < flames.length; i++) {
      const f = flames[i];
      f.scale.y = 1.9 + Math.sin(t * 13 + i * 2.7) * 0.35 + Math.sin(t * 29 + i) * 0.15;
      f.scale.x = 1 + Math.sin(t * 17 + i * 1.3) * 0.12;
    }

    // interact prompt
    if (!ui.modal) {
      const inter = interactions.update();
      ui.prompt(inter);
    } else ui.prompt(null);

    // HUD room name
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
