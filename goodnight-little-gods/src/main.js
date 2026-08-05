import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/effectcomposer.js';
import { RenderPass } from 'three/addons/postprocessing/renderpass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/unrealbloompass.js';
import { OutputPass } from 'three/addons/postprocessing/outputpass.js';
import { SoundGarden } from './audio.js';
import { Input, detectTouch } from './input.js';
import { createWorld, createPlayer, setPlayerNote, NOTE_COLORS, NOTE_CSS, NOTE_NAMES } from './world.js';

const params = new URLSearchParams(location.search);
const AUTOTEST = params.get('autotest') === '1';
const PERFTEST = params.get('perftest') === '1';
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = detectTouch();
const GOD_PROFILES = [
  { name: 'Poppy', note: 0, required: 2, ratio: 1, timbre: 'sine', hint: 'Match Bloom when the halo closes.', line: 'It kept every compliment in a locked drawer.', test: () => true },
  { name: 'Mallow', note: 0, required: 1, ratio: 1.25, timbre: 'triangle', hint: 'Mallow is shy. Stand still, then sing Bloom.', line: 'It is brave only while nobody is impressed.', test: (c) => c.speed < 1.25 },
  { name: 'Thistle', note: 0, required: 1, ratio: 1.5, timbre: 'sine', hint: 'Slip, then sing Bloom before the spark fades.', line: 'It has mistaken momentum for a personality.', test: (c) => c.dashGrace > 0 },
  { name: 'Ripple', note: 1, required: 2, ratio: 0.75, timbre: 'sine', hint: 'Ripple listens to motion. Keep moving and sing Tide.', line: 'It swims through rooms that no longer exist.', test: (c) => c.speed > 2.8 },
  { name: 'Brine', note: 1, required: 1, ratio: 1, timbre: 'triangle', hint: 'Brine needs room. Sing Tide from the outer halo.', line: 'It is mostly ocean, including the grudges.', test: (c) => c.distance > 5.6 && c.distance < 10.5 },
  { name: 'Nacre', note: 1, required: 1, ratio: 2, timbre: 'sine', hint: 'Nacre trusts a crowd. Bring one friend, then sing Tide.', line: 'It makes pearls around inconvenient facts.', test: (c) => c.bonded > 0 },
  { name: 'Kindle', note: 2, required: 2, ratio: 1, timbre: 'triangle', hint: 'Kindle is nearly deaf. Get close and sing Ember.', line: 'It warms its hands over unfinished arguments.', test: (c) => c.distance < 4.6 },
  { name: 'Wick', note: 2, required: 1, ratio: 1.5, timbre: 'sine', hint: 'Wick only speaks alone. Return without followers.', line: 'It burns at both ends and calls this scheduling.', test: (c) => c.bonded === 0 },
  { name: 'Cinder', note: 2, required: 1, ratio: 2, timbre: 'triangle', hint: 'Cinder wakes late. Bring six voices home first.', line: 'It survived the fire and kept the punchline.', test: (c) => c.home >= 6 },
];

const ui = {
  canvas: document.querySelector('#game'),
  loading: document.querySelector('#loading'),
  title: document.querySelector('#title'),
  play: document.querySelector('#play'),
  how: document.querySelector('#how'),
  howPanel: document.querySelector('#how-panel'),
  closeHow: document.querySelector('#close-how'),
  titleSound: document.querySelector('#title-sound'),
  hud: document.querySelector('#hud'),
  godsCount: document.querySelector('#gods-count'),
  godPips: document.querySelector('#god-pips'),
  objective: document.querySelector('#objective'),
  beat: document.querySelector('#beat'),
  toast: document.querySelector('#toast'),
  noteDock: document.querySelector('#note-dock'),
  noteButtons: [...document.querySelectorAll('.note')],
  sound: document.querySelector('#sound'),
  pause: document.querySelector('#pause'),
  pauseScreen: document.querySelector('#pause-screen'),
  resume: document.querySelector('#resume'),
  restart: document.querySelector('#restart'),
  ending: document.querySelector('#ending'),
  endingLine: document.querySelector('#ending-line'),
  finalGods: document.querySelector('#final-gods'),
  finalSeeds: document.querySelector('#final-seeds'),
  finalTime: document.querySelector('#final-time'),
  again: document.querySelector('#again'),
  fatal: document.querySelector('#fatal'),
  fatalMessage: document.querySelector('#fatal-message'),
  moveZone: document.querySelector('#move-zone'),
  moveKnob: document.querySelector('#move-zone .stick-knob'),
  touchSing: document.querySelector('#touch-sing'),
  touchDash: document.querySelector('#touch-dash'),
};

document.body.dataset.touch = String(TOUCH);
document.documentElement.style.setProperty('--note-color', NOTE_CSS[0]);

let renderer;
let composer;
let bloomPass;
let scene;
let camera;
let world;
let player;
let input;
let audio;
let trail;
let quality = 'high';
let mode = 'boot';
let started = false;
let paused = false;
let selectedNote = 0;
let homeCount = 0;
let seedCount = 0;
let elapsed = 0;
let startMark = 0;
let pulseCooldown = 0;
let dashCooldown = 0;
let dashTime = 0;
let dashGrace = 0;
let finale = false;
let finaleIndex = 0;
let finaleSequence = [];
let finishing = false;
let toastTimer = 0;
let objectiveTimer = 0;
let renderFrames = 0;
let fatalError = null;
let lastTime = performance.now();
let autoStarted = false;
const velocity = new THREE.Vector3();
const desiredVelocity = new THREE.Vector3();
const dashDirection = new THREE.Vector3(0, 0, -1);
const cameraTarget = new THREE.Vector3();
const cameraPosition = new THREE.Vector3();
const homeOrder = [];
const seenHints = new Set();
const frameTimes = [];
const debugEvents = [];

function chooseQuality() {
  const memory = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (params.get('quality') === 'low' || REDUCED_MOTION) return 'low';
  if (params.get('quality') === 'high') return 'high';
  if (TOUCH && (Math.min(innerWidth, innerHeight) < 560 || memory <= 4 || cores <= 4)) return 'low';
  return 'high';
}

function setMode(next) {
  mode = next;
  document.body.dataset.mode = next;
  ui.title.classList.toggle('active', next === 'title');
  ui.ending.classList.toggle('active', next === 'ending');
  ui.fatal.classList.toggle('active', next === 'fatal');
  const hudActive = next === 'playing';
  ui.hud.setAttribute('aria-hidden', String(!hudActive));
  ui.hud.inert = !hudActive;
}

function buildPips() {
  ui.godPips.textContent = '';
  for (let i = 0; i < 9; i++) {
    const pip = document.createElement('i');
    pip.style.setProperty('--pip', NOTE_CSS[Math.floor(i / 3)]);
    ui.godPips.append(pip);
  }
}

function updatePips() {
  ui.godsCount.textContent = `${homeCount} / 9`;
  [...ui.godPips.children].forEach((pip, index) => pip.classList.toggle('lit', index < homeCount));
}

function selectNote(note, announce = false) {
  selectedNote = THREE.MathUtils.clamp(Math.round(note), 0, 2);
  setPlayerNote(player, selectedNote);
  document.documentElement.style.setProperty('--note-color', NOTE_CSS[selectedNote]);
  ui.beat.style.setProperty('--note-color', NOTE_CSS[selectedNote]);
  ui.noteButtons.forEach((button, index) => {
    button.classList.toggle('active', index === selectedNote);
    button.setAttribute('aria-pressed', String(index === selectedNote));
  });
  document.body.dataset.selectedNote = String(selectedNote);
  if (announce && started) showToast(`${NOTE_NAMES[selectedNote]} selected`, 0.8);
}

function showToast(text, seconds = 2.8) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  toastTimer = seconds;
}

function setObjective(text, hold = 0) {
  if (objectiveTimer > 0 && hold === 0) return;
  ui.objective.textContent = text;
  objectiveTimer = hold;
}

function profileFor(god) {
  return GOD_PROFILES[god.userData.note * 3 + god.userData.index];
}

function setupRenderer() {
  quality = chooseQuality();
  renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    antialias: quality === 'high',
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = quality === 'low' ? 1.08 : 1.14;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'low' ? 1.15 : 1.6));
  renderer.setSize(innerWidth, innerHeight, false);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 320);
  camera.position.set(0, TOUCH ? 29 : 25, TOUCH ? 27 : 24);
  camera.lookAt(0, 0, 0);

  try {
    if (quality === 'low') return;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), quality === 'low' ? 0.38 : 0.68, 0.72, quality === 'low' ? 0.8 : 0.68);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  } catch (error) {
    console.warn('Post-processing unavailable; using direct renderer.', error);
    composer = null;
  }
}

function createTrail() {
  const count = 22;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: NOTE_COLORS[0], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  trail = new THREE.Line(geometry, mat);
  trail.frustumCulled = false;
  trail.userData.points = Array.from({ length: count }, () => new THREE.Vector3());
  scene.add(trail);
}

function updateTrail(dt) {
  const points = trail.userData.points;
  points[0].lerp(player.position, Math.min(1, dt * 18));
  points[0].y = 0.35;
  for (let i = 1; i < points.length; i++) points[i].lerp(points[i - 1], Math.min(1, dt * (9 - i * 0.18)));
  const position = trail.geometry.attributes.position;
  points.forEach((point, index) => position.setXYZ(index, point.x, point.y, point.z));
  position.needsUpdate = true;
  trail.material.color.setHex(NOTE_COLORS[selectedNote]);
  trail.material.opacity = 0.12 + Math.min(0.2, velocity.length() * 0.012) + (dashTime > 0 ? 0.28 : 0);
}

function setupWorld() {
  world = createWorld(scene, quality);
  player = createPlayer();
  player.position.set(0, 0, 8.3);
  scene.add(player);
  createTrail();
  selectNote(0);
}

function setupInput() {
  input = new Input({
    canvas: ui.canvas,
    moveZone: ui.moveZone,
    moveKnob: ui.moveKnob,
    singButton: ui.touchSing,
    dashButton: ui.touchDash,
    onPause: togglePause,
  });
  input.enabled = false;
  input.clearQueues();
}

function bindUI() {
  ui.play.addEventListener('click', () => startGame());
  ui.how.addEventListener('click', () => openHow(true));
  ui.closeHow.addEventListener('click', () => openHow(false));
  ui.howPanel.addEventListener('pointerdown', (event) => { if (event.target === ui.howPanel) openHow(false); });
  ui.noteButtons.forEach((button, index) => button.addEventListener('click', () => selectNote(index, true)));
  ui.sound.addEventListener('click', toggleSound);
  ui.titleSound.addEventListener('click', toggleSound);
  ui.pause.addEventListener('click', togglePause);
  ui.resume.addEventListener('click', togglePause);
  ui.restart.addEventListener('click', () => location.reload());
  ui.again.addEventListener('click', () => location.reload());
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'playing' && !AUTOTEST && !PERFTEST) togglePause();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ui.howPanel.classList.contains('open')) {
      event.preventDefault();
      openHow(false);
    }
  });
}

function openHow(open) {
  ui.howPanel.classList.toggle('open', open);
  ui.howPanel.setAttribute('aria-hidden', String(!open));
  ui.title.inert = open;
  if (open) requestAnimationFrame(() => ui.closeHow.focus());
  else if (ui.howPanel.contains(document.activeElement)) ui.how.focus();
}

function toggleSound() {
  if (!audio) return;
  const on = audio.toggle();
  ui.sound.textContent = on ? '♪' : '×';
  ui.sound.setAttribute('aria-pressed', String(on));
  ui.sound.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
  ui.titleSound.textContent = on ? 'Sound on' : 'Sound off';
  ui.titleSound.setAttribute('aria-pressed', String(on));
}

async function startGame(silent = false) {
  if (started) return;
  started = true;
  paused = false;
  input.enabled = true;
  input.clearQueues();
  setMode('playing');
  ui.pauseScreen.classList.remove('open');
  ui.pauseScreen.setAttribute('aria-hidden', 'true');
  startMark = performance.now();
  elapsed = 0;
  frameTimes.length = 0;
  if (!silent) await audio.init();
  setObjective('Follow a colored halo into the orchard.', 3.5);
  if (!silent) showToast('Morning is coming. Bring nine small gods home.', 4.2);
  debugEvents.push('started');
}

function togglePause() {
  if (!started || finishing || (mode !== 'playing' && mode !== 'paused')) return;
  paused = !paused;
  input.enabled = !paused;
  input.clearQueues();
  input.resetStick();
  setMode(paused ? 'paused' : 'playing');
  ui.pauseScreen.classList.toggle('open', paused);
  ui.pauseScreen.setAttribute('aria-hidden', String(!paused));
  audio.setPaused(paused);
  if (paused) requestAnimationFrame(() => ui.resume.focus());
  else if (ui.pauseScreen.contains(document.activeElement)) ui.pause.focus();
  if (!paused) lastTime = performance.now();
}

function resize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'low' ? 1.15 : 1.6));
  renderer.setSize(innerWidth, innerHeight, false);
  composer?.setSize(innerWidth, innerHeight);
}

function animatePlayer(dt, moving) {
  const data = player.userData;
  data.walk += dt * (2 + velocity.length() * 1.3);
  const step = moving && !REDUCED_MOTION ? Math.sin(data.walk) : 0;
  data.body.position.y = 1.15 + step * 0.035;
  data.cloak.rotation.z = step * 0.025;
  data.cloak.rotation.x = Math.min(0.15, velocity.length() * 0.008);
  data.head.rotation.z = step * -0.018;
  data.bell.rotation.z += dt * (dashTime > 0 ? 4 : 0.45);
  data.noteHalo.rotation.z -= dt * 0.7;
  data.noteHalo.scale.setScalar(1 + Math.sin(audio.time * 2.6) * 0.06 + (dashTime > 0 ? 0.22 : 0));
}

function startDash(move) {
  if (dashCooldown > 0 || dashTime > 0) return false;
  if (move.length > 0.1) dashDirection.set(move.x, 0, move.y).normalize();
  else dashDirection.set(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y)).normalize();
  if (dashDirection.lengthSq() < 0.5) dashDirection.set(0, 0, -1);
  dashTime = 0.24;
  dashCooldown = 0.78;
  dashGrace = 0.85;
  velocity.copy(dashDirection).multiplyScalar(25);
  audio.dash();
  world.burst(player.position, NOTE_COLORS[selectedNote], quality === 'low' ? 10 : 18, 1.4);
  debugEvents.push('dash');
  document.body.dataset.lastAction = 'dash';
  return true;
}

function updateMovement(dt) {
  const move = input.getMovement();
  if (input.consumeDash()) startDash(move);
  dashCooldown = Math.max(0, dashCooldown - dt);
  dashGrace = Math.max(0, dashGrace - dt);
  dashTime = Math.max(0, dashTime - dt);

  if (dashTime > 0) {
    velocity.lerp(desiredVelocity.copy(dashDirection).multiplyScalar(25), Math.min(1, dt * 16));
  } else {
    desiredVelocity.set(move.x, 0, move.y).multiplyScalar(10.2);
    const responsiveness = move.length > 0.05 ? 8.5 : 6.5;
    velocity.lerp(desiredVelocity, 1 - Math.exp(-responsiveness * dt));
  }
  player.position.addScaledVector(velocity, dt);
  const radius = Math.hypot(player.position.x, player.position.z);
  if (radius > 49.2) {
    const factor = 49.2 / radius;
    player.position.x *= factor;
    player.position.z *= factor;
    const outward = desiredVelocity.set(player.position.x, 0, player.position.z).normalize();
    const away = velocity.dot(outward);
    if (away > 0) velocity.addScaledVector(outward, -away * 1.35);
  }
  if (velocity.lengthSq() > 0.16) {
    const targetAngle = Math.atan2(velocity.x, velocity.z);
    let delta = targetAngle - player.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    player.rotation.y += delta * Math.min(1, dt * 12);
  }
  animatePlayer(dt, move.length > 0.05);
  updateTrail(dt);

  for (const hush of world.hushlings) {
    if (!hush.userData.active) continue;
    for (const god of world.gods) {
      if (hush.userData.touchCooldown > 0) break;
      if (god.userData.state !== 'bonded' || god.userData.scattered > 0) continue;
      if (hush.position.distanceTo(god.position) < 1.55 && world.scatterGod(god, hush.position)) {
        const profile = profileFor(god);
        showToast(`The hush scattered ${profile.name}. Stay close; it will find you again.`, 2.2);
        audio.repel();
        hush.userData.touchCooldown = 1.4;
      }
    }
    const distance = hush.position.distanceTo(player.position);
    if (dashTime > 0 && distance < 2.25) {
      world.repelHush(hush, 1.75);
      audio.repel();
    } else if (distance < 1.35 && hush.userData.stunned <= 0 && hush.userData.touchCooldown <= 0) {
      desiredVelocity.copy(player.position).sub(hush.position).setY(0);
      if (desiredVelocity.lengthSq() < 0.1) desiredVelocity.set(1, 0, 0);
      velocity.add(desiredVelocity.normalize().multiplyScalar(9));
      hush.userData.touchCooldown = 1.25;
      world.repelHush(hush, 0.7);
      audio.repel();
      showToast('The hush hates a clean beat. Sing or slip through it.', 2.2);
    }
  }
  return move;
}

function timingGood() {
  return audio.getBeatWindow() < 0.205;
}

function getGodContext(god) {
  return {
    speed: velocity.length(),
    dashGrace,
    distance: player.position.distanceTo(god.position),
    bonded: world.gods.filter((item) => item.userData.state === 'bonded').length,
    home: homeCount,
  };
}

function bondGod(god, profile) {
  const bonded = world.gods.filter((item) => item.userData.state === 'bonded').length;
  if (!world.bondGod(god, bonded)) return;
  audio.bond(profile.note);
  showToast(`${profile.name} trusts you. ${profile.line}`, 3.4);
  setObjective(`Bring ${profile.name} to the singing well.`, 2.6);
  debugEvents.push(`bond:${profile.name}`);
}

function tryGodPulse(goodBeat) {
  const wild = world.gods
    .filter((god) => god.userData.state === 'wild')
    .map((god) => ({ god, distance: player.position.distanceTo(god.position) }))
    .filter((entry) => entry.distance < 10.8)
    .sort((a, b) => a.distance - b.distance);
  if (!wild.length) return false;
  const { god, distance } = wild[0];
  const profile = profileFor(god);
  if (profile.note !== selectedNote) {
    world.startleGod(god);
    showToast(`${profile.name} answers in ${NOTE_NAMES[profile.note]}.`, 1.5);
    return true;
  }
  if (!goodBeat) {
    showToast('Let the halo close. Then sing.', 1.2);
    return true;
  }
  const context = getGodContext(god);
  context.distance = distance;
  if (!profile.test(context)) {
    showToast(profile.hint, 2.2);
    return true;
  }
  const attune = world.attuneGod(god);
  audio.resonate(selectedNote, true);
  if (attune >= profile.required) bondGod(god, profile);
  else showToast(`${profile.name} heard you. One more clean ${NOTE_NAMES[selectedNote]} beat.`, 2.1);
  return true;
}

function trySeedPulse() {
  const seed = world.seeds.find((item) => item.visible && player.position.distanceTo(item.position) < 6.3);
  if (!seed) return false;
  if (world.collectSeed(seed)) {
    seedCount += 1;
    audio.seed(seedCount);
    showToast(seedCount === 3 ? 'All three secret seeds remember your name.' : `Secret seed ${seedCount} / 3`, 2.4);
    debugEvents.push(`seed:${seedCount}`);
  }
  return true;
}

function tryHushPulse(goodBeat) {
  let hit = false;
  for (const hush of world.hushlings) {
    if (!hush.userData.active || player.position.distanceTo(hush.position) > 10.5) continue;
    hit = world.repelHush(hush, goodBeat ? 1.45 : 0.9) || hit;
  }
  if (hit) audio.repel();
  return hit;
}

function advanceFinale(goodBeat, forced = false) {
  if (!finale || finishing) return false;
  if (!forced && Math.hypot(player.position.x, player.position.z) > 8.4) {
    showToast('The final song belongs at the well.', 1.6);
    return true;
  }
  const wanted = finaleSequence[finaleIndex];
  if (!forced && selectedNote !== wanted) {
    showToast(`The song asks for ${NOTE_NAMES[wanted]}.`, 1.4);
    selectNote(wanted);
    return true;
  }
  if (!forced && !goodBeat) {
    showToast('Hold it. Let the choir breathe.', 1.2);
    return true;
  }
  finaleIndex += 1;
  world.setFinale(finaleIndex);
  audio.resonate(wanted, true);
  world.emitPulse(player.position, wanted, 2.2);
  if (finaleIndex >= finaleSequence.length) finishGame();
  else setObjective(`At the well: sing ${NOTE_NAMES[finaleSequence[finaleIndex]]}.`, 0.6);
  return true;
}

function sing() {
  if (pulseCooldown > 0 || paused || mode !== 'playing') return false;
  pulseCooldown = 0.24;
  const goodBeat = timingGood();
  world.emitPulse(player.position, selectedNote, goodBeat ? 1.5 : 0.85);
  audio.resonate(selectedNote, goodBeat);
  ui.beat.classList.remove('hit');
  void ui.beat.offsetWidth;
  ui.beat.classList.add('hit');
  if (advanceFinale(goodBeat)) return true;
  const acted = trySeedPulse() || tryHushPulse(goodBeat) || tryGodPulse(goodBeat);
  if (!acted && goodBeat) world.burst(player.position, NOTE_COLORS[selectedNote], 8, 0.8);
  debugEvents.push(`pulse:${selectedNote}:${goodBeat ? 'clean' : 'soft'}`);
  document.body.dataset.lastAction = `sing:${selectedNote}:${goodBeat ? 'clean' : 'soft'}`;
  return acted;
}

function homeFollowers() {
  if (finale) return;
  const atWell = Math.hypot(player.position.x, player.position.z) < 7.4;
  if (!atWell) return;
  const followers = world.gods.filter((god) => god.userData.state === 'bonded' && god.userData.scattered <= 0);
  for (const god of followers) {
    if (god.position.distanceTo(player.position) > 7.5) continue;
    const profile = profileFor(god);
    if (!world.homeGod(god, homeCount)) continue;
    homeOrder.push({ ...profile });
    homeCount += 1;
    audio.addVoice?.({ ...profile, id: profile.name });
    audio.home(profile.note, homeCount);
    updatePips();
    showToast(`${profile.name} joins the song. ${homeCount} / 9`, 2.2);
    debugEvents.push(`home:${profile.name}`);
    if (homeCount === 3) {
      world.awakenStage?.(1);
      setObjective('The orchard is changing. Six voices remain.', 3.2);
    } else if (homeCount === 6) {
      world.awakenStage?.(2);
      setObjective('The hush is waking. Three voices remain.', 3.2);
    } else if (homeCount === 9) {
      world.awakenStage?.(3);
      beginFinale();
    } else if (!objectiveTimer) {
      setObjective(`${9 - homeCount} little gods remain outside the song.`);
    }
  }
}

function beginFinale() {
  finale = true;
  finaleIndex = 0;
  const discovered = homeOrder.map((profile) => profile.note);
  finaleSequence = [discovered[0] ?? 0, discovered[3] ?? 1, discovered[6] ?? 2, discovered[discovered.length - 1] ?? 0];
  world.setFinale(0);
  setObjective(`The hush knows your song. At the well: sing ${NOTE_NAMES[finaleSequence[0]]}.`, 4);
  showToast('It came to eat the silence between notes.', 3.6);
  debugEvents.push(`finale:${finaleSequence.join('-')}`);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function finishGame() {
  if (finishing) return;
  finishing = true;
  input.enabled = false;
  world.complete();
  audio.finalChord();
  world.emitPulse(new THREE.Vector3(0, 0, 0), 0, 4);
  world.emitPulse(new THREE.Vector3(0, 0, 0), 1, 3.4);
  world.emitPulse(new THREE.Vector3(0, 0, 0), 2, 2.8);
  ui.finalGods.textContent = `${homeCount} / 9`;
  ui.finalSeeds.textContent = `${seedCount} / 3`;
  ui.finalTime.textContent = formatTime(elapsed);
  ui.endingLine.textContent = seedCount === 3
    ? 'Nine voices, three secret seeds—and one tiny god that only exists because you looked twice.'
    : 'Nine voices, carried safely into daylight. The song remembers the order you found them.';
  setTimeout(() => setMode('ending'), AUTOTEST ? 40 : 2200);
  debugEvents.push('complete');
}

function updateHint() {
  if (toastTimer > 0 || finale) return;
  const nearby = world.gods
    .filter((god) => god.userData.state === 'wild' && !seenHints.has(profileFor(god).name))
    .map((god) => ({ god, distance: player.position.distanceTo(god.position) }))
    .filter((entry) => entry.distance < 7.8)
    .sort((a, b) => a.distance - b.distance)[0];
  if (!nearby) return;
  const profile = profileFor(nearby.god);
  seenHints.add(profile.name);
  showToast(`${profile.name} · ${profile.hint}`, 3.2);
}

function updateBeat() {
  const phase = audio.getBeatPhase();
  const distance = Math.min(phase, 1 - phase);
  const scale = 0.42 + Math.min(1, distance / 0.5) * 0.9;
  const ring = ui.beat.querySelector('i');
  ring.style.transform = `scale(${scale.toFixed(3)})`;
  ui.beat.classList.toggle('ready', distance < 0.205);
  return phase;
}

function updateCamera(dt, time) {
  if (mode === 'title' || mode === 'boot') {
    const angle = time * 0.055;
    cameraPosition.set(Math.sin(angle) * 27, TOUCH ? 28 : 24, Math.cos(angle) * 27);
    if (REDUCED_MOTION) camera.position.copy(cameraPosition);
    else camera.position.lerp(cameraPosition, Math.min(1, dt * 1.5));
    cameraTarget.set(0, 1, 0);
  } else {
    const height = TOUCH ? (innerHeight > innerWidth ? 31 : 27) : 25;
    const depth = TOUCH ? (innerHeight > innerWidth ? 25 : 27) : 24;
    cameraPosition.set(player.position.x, height, player.position.z + depth);
    if (REDUCED_MOTION) camera.position.copy(cameraPosition);
    else camera.position.lerp(cameraPosition, 1 - Math.exp(-4.8 * dt));
    cameraTarget.set(player.position.x, 0.7, player.position.z - 1.8);
  }
  camera.lookAt(cameraTarget);
}

function updateGame(dt, time, rawDt = dt) {
  elapsed += rawDt;
  pulseCooldown = Math.max(0, pulseCooldown - dt);
  objectiveTimer = Math.max(0, objectiveTimer - dt);
  toastTimer = Math.max(0, toastTimer - dt);
  if (toastTimer <= 0) ui.toast.classList.remove('show');
  const queuedNote = input.consumeNote();
  if (queuedNote !== null) selectNote(queuedNote, true);
  const move = updateMovement(dt);
  if (input.consumePulse()) sing();
  homeFollowers();
  updateHint();
  const phase = updateBeat();
  world.update(dt, time, player.position, phase);
  audio.update(homeCount);
  if (renderFrames % 10 === 0) {
    document.body.dataset.playerState = `${player.position.x.toFixed(2)},${player.position.z.toFixed(2)},${velocity.length().toFixed(2)}`;
  }
  if (!finale && !objectiveTimer && world.gods.some((god) => god.userData.state === 'bonded')) {
    setObjective('Bring your followers to the singing well.');
  } else if (!finale && !objectiveTimer) {
    setObjective(`${9 - homeCount} little gods remain outside the song.`);
  }
  return move;
}

function render(now) {
  requestAnimationFrame(render);
  const rawDt = Math.max(0.001, (now - lastTime) / 1000);
  const dt = Math.min(0.05, rawDt);
  lastTime = now;
  const time = now / 1000;
  if (rawDt < 0.25 && renderFrames > 4) {
    frameTimes.push(rawDt * 1000);
    if (frameTimes.length > 360) frameTimes.shift();
  }

  try {
    if (mode === 'playing' && !paused) updateGame(dt, time, rawDt);
    else if (mode !== 'paused') {
      const phase = audio?.getBeatPhase?.() ?? ((time / (60 / 78)) % 1);
      world?.update(Math.min(dt, 0.025), time, player?.position || new THREE.Vector3(), phase);
      if (player) {
        player.userData.bell.rotation.z += dt * 0.28;
        updateTrail(dt);
      }
    }
    updateCamera(dt, time);
    if (finishing && mode !== 'ending') {
      camera.position.y += dt * 1.4;
      camera.lookAt(0, 1.4, 0);
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
    renderFrames += 1;
  } catch (error) {
    fail(error);
  }
}

function fail(error) {
  if (fatalError) return;
  fatalError = error instanceof Error ? error : new Error(String(error));
  console.error(fatalError);
  ui.fatalMessage.textContent = fatalError.message || 'Try refreshing with hardware acceleration enabled.';
  document.body.dataset.fatal = fatalError.message || 'unknown';
  setMode('fatal');
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function autotestAttune(name, { distance = 3, speed = 0, dashed = false } = {}) {
  const god = world.gods.find((item) => profileFor(item).name === name);
  if (!god) throw new Error(`Autotest could not find ${name}`);
  const profile = profileFor(god);
  selectNote(profile.note);
  player.position.set(god.position.x + distance, 0, god.position.z);
  velocity.set(speed, 0, 0);
  dashGrace = dashed ? 0.7 : 0;
  for (let attempt = 0; attempt < profile.required; attempt++) tryGodPulse(true);
  const passed = god.userData.state === 'bonded';
  if (!passed) throw new Error(`Profile rule did not bond ${name}`);
  return { god, profile, passed, rule: profile.hint };
}

function autotestHome(entry) {
  if (!world.homeGod(entry.god, homeCount)) throw new Error(`Autotest could not home ${entry.profile.name}`);
  homeOrder.push({ ...entry.profile });
  audio.addVoice({ ...entry.profile, id: entry.profile.name });
  homeCount += 1;
  if (homeCount === 3) world.awakenStage(1);
  if (homeCount === 6) world.awakenStage(2);
  if (homeCount === 9) world.awakenStage(3);
}

async function runAutotest() {
  if (autoStarted) return;
  autoStarted = true;
  await startGame(true);
  for (let i = 0; i < 12; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  const profileResults = [];
  let entry = autotestAttune('Poppy'); profileResults.push(entry); autotestHome(entry);
  entry = autotestAttune('Mallow', { speed: 0 }); profileResults.push(entry); autotestHome(entry);
  entry = autotestAttune('Thistle', { dashed: true }); profileResults.push(entry); autotestHome(entry);
  entry = autotestAttune('Brine', { distance: 7 }); profileResults.push(entry); autotestHome(entry);
  const ripple = autotestAttune('Ripple', { speed: 4 }); profileResults.push(ripple);
  const nacre = autotestAttune('Nacre'); profileResults.push(nacre);
  if (!world.scatterGod(ripple.god, player.position)) throw new Error('Autotest could not scatter a bonded god');
  const scatterHomeBlocked = !world.homeGod(ripple.god, homeCount);
  ripple.god.userData.scattered = 0;
  if (!scatterHomeBlocked) throw new Error('Scattered god bypassed the home invariant');
  autotestHome(ripple);
  autotestHome(nacre);
  entry = autotestAttune('Kindle', { distance: 3 }); profileResults.push(entry); autotestHome(entry);
  entry = autotestAttune('Wick'); profileResults.push(entry); autotestHome(entry);
  entry = autotestAttune('Cinder'); profileResults.push(entry); autotestHome(entry);
  world.seeds.forEach((seed) => world.collectSeed(seed));
  seedCount = 3;
  updatePips();
  beginFinale();
  while (finaleIndex < finaleSequence.length) advanceFinale(true, true);
  await new Promise((resolve) => setTimeout(resolve, 120));
  const gl = renderer.getContext();
  const result = {
    loaded: true,
    mode,
    touch: TOUCH,
    quality,
    webgl: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 2 : 1,
    renderedFrames: renderFrames,
    godsHome: homeCount,
    secretSeeds: seedCount,
    finaleCompleted: finishing,
    profileRulesPassed: profileResults.filter((entry) => entry.passed).map((entry) => entry.profile.name),
    scatterHomeBlocked,
    songVoices: audio.voices?.length ?? homeOrder.length,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    frameP95ms: Number(percentile(frameTimes, 0.95).toFixed(2)),
    fatal: fatalError?.message || null,
    events: debugEvents.slice(-20),
  };
  document.body.dataset.autotest = 'done';
  document.body.dataset.autotestResult = JSON.stringify(result);
  document.body.dataset.autotestResultPretty = JSON.stringify(result, null, 2);
}

function measureAnimationFrames(target = 180, maxMs = 8000) {
  return new Promise((resolve) => {
    const samples = [];
    let previous = 0;
    let observed = 0;
    let startedAt = 0;
    const sample = (now) => {
      if (!startedAt) {
        startedAt = now;
        previous = now;
      } else {
        const interval = now - previous;
        previous = now;
        observed += 1;
        if (interval < 250) samples.push(interval);
      }
      if (observed >= target || now - startedAt >= maxMs) resolve({ samples, observed, elapsedMs: now - startedAt });
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

function measureSimulationRenderCost(sampleCount = 10, warmup = 2) {
  const costs = [];
  const gl = renderer.getContext();
  for (let index = 0; index < sampleCount + warmup; index++) {
    const startedAt = performance.now();
    const time = startedAt / 1000;
    const phase = audio?.getBeatPhase?.() ?? ((time / (60 / 78)) % 1);
    world.update(1 / 60, time, player.position, phase);
    updateCamera(1 / 60, time);
    if (composer) composer.render();
    else renderer.render(scene, camera);
    gl.finish();
    if (index >= warmup) costs.push(performance.now() - startedAt);
  }
  return costs;
}

async function runPerftest() {
  if (autoStarted) return;
  autoStarted = true;
  await startGame(true);
  world.gods.slice(0, 6).forEach((god, index) => {
    world.bondGod(god, index);
    world.homeGod(god, index);
  });
  homeCount = 6;
  updatePips();
  world.awakenStage(2);
  world.hushlings.forEach((hush) => { hush.userData.respawn = 0; });
  frameTimes.length = 0;
  const renderCosts = measureSimulationRenderCost();
  const measured = document.hidden ? { samples: [], observed: 0, elapsedMs: 0 } : await measureAnimationFrames();
  const result = {
    loaded: true,
    mode,
    touch: TOUCH,
    quality,
    visibility: document.visibilityState,
    observedFrames: measured.observed,
    validFrames: measured.samples.length,
    elapsedMs: Number(measured.elapsedMs.toFixed(1)),
    frameMeanMs: measured.samples.length ? Number((measured.samples.reduce((sum, value) => sum + value, 0) / measured.samples.length).toFixed(2)) : 0,
    frameP95ms: Number(percentile(measured.samples, 0.95).toFixed(2)),
    longFrames: measured.samples.filter((value) => value > 34).length,
    simulationRenderMeanMs: Number((renderCosts.reduce((sum, value) => sum + value, 0) / renderCosts.length).toFixed(2)),
    simulationRenderP95ms: Number(percentile(renderCosts, 0.95).toFixed(2)),
    simulationRenderMaxMs: Number(Math.max(...renderCosts).toFixed(2)),
    godsHome: homeCount,
    hushActive: world.hushlings.filter((hush) => hush.userData.active).length,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    fatal: fatalError?.message || null,
  };
  document.body.dataset.perftest = 'done';
  document.body.dataset.perftestResult = JSON.stringify(result);
}

function exposeDebug() {
  window.__littleGods = {
    getSnapshot() {
      return {
        mode,
        quality,
        touch: TOUCH,
        homeCount,
        seedCount,
        selectedNote,
        finale,
        finaleIndex,
        finaleSequence: [...finaleSequence],
        player: player ? { x: player.position.x, z: player.position.z, speed: velocity.length() } : null,
        gods: world?.gods.map((god) => ({ name: profileFor(god).name, note: god.userData.note, state: god.userData.state, attune: god.userData.attune })) || [],
        hushActive: world?.hushlings.filter((hush) => hush.userData.active).length || 0,
        fatal: fatalError?.message || null,
        renderFrames,
      };
    },
    start: () => startGame(true),
    selectNote,
    pulse: () => { input.queuePulse(); },
    dash: () => { input.queueDash(); },
    teleport(x, z) { player.position.set(Number(x) || 0, 0, Number(z) || 0); velocity.set(0, 0, 0); },
    homeAll() {
      world.gods.forEach((god, index) => {
        if (god.userData.state === 'wild') world.bondGod(god, index);
        if (god.userData.state !== 'home') world.homeGod(god, index);
      });
      homeCount = 9;
      updatePips();
      beginFinale();
    },
    finish: finishGame,
  };
}

function boot() {
  try {
    setupRenderer();
    audio = new SoundGarden();
    setupWorld();
    setupInput();
    bindUI();
    buildPips();
    updatePips();
    exposeDebug();
    resize();
    requestAnimationFrame(render);
    requestAnimationFrame(() => {
      ui.loading.classList.remove('active');
      setMode('title');
      document.body.dataset.loaded = 'true';
      if (AUTOTEST) runAutotest().catch(fail);
      else if (PERFTEST) runPerftest().catch(fail);
    });
  } catch (error) {
    fail(error);
  }
}

boot();
