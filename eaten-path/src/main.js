// main.js — boot, wiring, camcorder OSD, and the frame loop.
import * as THREE from 'three';
import { RNG, clamp, damp, lerp } from './util.js';
import { World } from './world.js';
import { Flora } from './flora.js';
import { Events } from './events.js';
import { Player } from './player.js';
import { GameAudio } from './audio.js';
import { VHS } from './vhs.js';

const params = new URLSearchParams(location.search);
const TEST = params.get('test') === '1';
const TEST_RUN = params.get('run') === '1';
const SEED = Number(params.get('seed')) || 19961004;

const $ = (id) => document.getElementById(id);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  $('err').style.display = 'flex';
  throw e;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);

const scene = new THREE.Scene();
const FOG_COLORS = {
  corridor: new THREE.Color(0x0a0e0b), cave: new THREE.Color(0x060807),
  thicket: new THREE.Color(0x080b08), cemetery: new THREE.Color(0x0c1016),
  sunclear: new THREE.Color(0x0e120c), carspot: new THREE.Color(0x0a0e0b),
  ruin: new THREE.Color(0x0b0e11), bog: new THREE.Color(0x0c110e), deadwood: new THREE.Color(0x0f1216),
};
const FOG_DENSITY = {
  corridor: 0.055, cave: 0.088, thicket: 0.08, cemetery: 0.034, sunclear: 0.04,
  carspot: 0.052, ruin: 0.05, bog: 0.072, deadwood: 0.04,
};
const BIOME_EXPO = { cave: 1.18, thicket: 0.95, bog: 0.92, deadwood: 1.07, ruin: 1.0 };
scene.fog = new THREE.FogExp2(0x0a0e0b, 0.055);
scene.background = scene.fog.color;

const camera = new THREE.PerspectiveCamera(72, 4 / 3, 0.1, 80);
scene.add(camera);

// lighting: moon-starved night, plus the camcorder's own weak lamp
scene.add(new THREE.AmbientLight(0x3a4844, 1.0));
const hemi = new THREE.HemisphereLight(0x2b3a48, 0x141008, 0.75);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8fa0c0, 0.4);
moon.position.set(30, 60, -20);
scene.add(moon);
const camLight = new THREE.SpotLight(0xf7e9d0, 220, 30, 0.66, 0.8, 1.6);
camLight.position.set(0.12, -0.14, 0.05);
camera.add(camLight);
const camTarget = new THREE.Object3D();
camTarget.position.set(0, -2.0, -8);
camera.add(camTarget);
camLight.target = camTarget;
const nearFill = new THREE.PointLight(0x91a09a, 1.4, 6, 2);
nearFill.position.set(0, 0, -0.4);
camera.add(nearFill);

// safety floor under everything (ribbons sit above it)
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(90, 24).rotateX(-Math.PI / 2),
  new THREE.MeshLambertMaterial({ color: 0x241b12 }),
);
floor.position.y = -0.08;
scene.add(floor);

// dust motes in the camcorder lamp
const MOTES = 110;
const moteGeo = new THREE.BufferGeometry();
const motePos = new Float32Array(MOTES * 3);
const moteVel = new Float32Array(MOTES * 3);
for (let i = 0; i < MOTES; i++) {
  motePos[i * 3] = (Math.random() - 0.5) * 9;
  motePos[i * 3 + 1] = Math.random() * 3.4;
  motePos[i * 3 + 2] = (Math.random() - 0.5) * 9;
  moteVel[i * 3] = (Math.random() - 0.5) * 0.06;
  moteVel[i * 3 + 1] = -0.02 - Math.random() * 0.05;
  moteVel[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
}
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
  color: 0xbfc8b8, size: 0.02, transparent: true, opacity: 0.4,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
}));
motes.frustumCulled = false; // positions trail the player; the baked bounds never move
scene.add(motes);

// ---- systems ----
const flora = new Flora(scene);
const world = new World(scene, SEED, flora);
const audio = new GameAudio();
const vhs = new VHS(renderer);
const player = new Player(camera, document.body);
player.onStep = (surface, hurry, speed) => audio.step(surface, hurry, speed);

const fx = {
  glitch: (x) => vhs.glitch(x),
  osdAnomaly: () => osdAnomaly(),
};
const events = new Events(scene, world, audio, fx);

world.begin();
const startInfo = world.updatePlayer(player.pos, 0.016, false);
// face down the path: camera forward (-sin yaw, -cos yaw) must equal the tangent
const t0 = world.tangentAt(startInfo.seg, 2);
player.yaw = Math.atan2(-t0.x, -t0.z);

// ---- OSD ----
const osd = $('osd');
const osdRec = $('osd-rec'), osdBatt = $('osd-batt'), osdDate = $('osd-date'), osdTime = $('osd-time'), osdWarn = $('osd-warn'), osdCount = $('osd-count');
const T0 = new Date(1996, 9, 4, 3, 12, 0); // OCT 4 1996, 3:12 AM
let elapsed = 0, battery = 0.82, recBlink = 0, counterVal = 0;
let anomaly = null; // {kind, t}
let dewTimer = 140 + Math.random() * 200, dewOn = 0; // night condensation, now and then
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function osdAnomaly() {
  const kinds = ['year', 'dashes', 'err', 'date'];
  anomaly = { kind: kinds[(Math.random() * kinds.length) | 0], t: 0.22 + Math.random() * 0.3 };
}

function updateOSD(dt) {
  elapsed += dt;
  battery = Math.max(0.05, battery - dt / 4200); // ~1%/42s — never quite dies
  recBlink += dt;
  if (anomaly) anomaly.t -= dt;
  if (anomaly && anomaly.t <= 0) anomaly = null;

  const d = new Date(T0.getTime() + elapsed * 1000);
  let dateStr = `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, ' ')} ${d.getFullYear()}`;
  let h = d.getHours() % 12 || 12;
  let timeStr = `${h}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
  let recStr = '<span class="dot">&#9679;</span> REC';
  if (anomaly) {
    if (anomaly.kind === 'year') dateStr = dateStr.replace('1996', '2093');
    else if (anomaly.kind === 'dashes') timeStr = '-:--:-- --';
    else if (anomaly.kind === 'err') recStr = '<span class="dot">&#9679;</span> ERR';
    else if (anomaly.kind === 'date') dateStr = `${MONTHS[d.getMonth()]} 34 1996`;
  }
  osdRec.innerHTML = recBlink % 1.6 < 1.1 ? recStr : '&nbsp;&nbsp;REC';
  osdDate.textContent = dateStr;
  osdTime.textContent = timeStr;
  // tape counter — a number that only ever climbs; you are always getting deeper
  counterVal = Math.max(counterVal, world.depth);
  osdCount.textContent = String(Math.floor(counterVal)).padStart(4, '0');
  const bars = battery > 0.66 ? 3 : battery > 0.33 ? 2 : 1;
  osdBatt.innerHTML = '&#9646;'.repeat(bars) + '&#9647;'.repeat(4 - bars);
  dewTimer -= dt;
  if (dewTimer <= 0) { dewOn = 22 + Math.random() * 20; dewTimer = 220 + Math.random() * 260; }
  if (dewOn > 0) dewOn -= dt;
  if (battery < 0.15) { osdWarn.style.display = 'block'; osdWarn.textContent = 'BATT'; }
  else if (dewOn > 0) { osdWarn.style.display = 'block'; osdWarn.textContent = 'DEW'; }
  else osdWarn.style.display = 'none';
}

function layoutOSD() {
  const r = vhs.frameRect(innerWidth, innerHeight);
  osd.style.left = r.x + 'px';
  osd.style.top = r.y + 'px';
  osd.style.width = r.w + 'px';
  osd.style.height = r.h + 'px';
  osd.style.fontSize = Math.max(12, r.h / 24) + 'px';
}

// ---- title / pause flow ----
let started = false;
function start() {
  if (started) return;
  started = true;
  $('title').style.display = 'none';
  osd.style.display = 'block';
  audio.init();
  audio.biome('corridor');
}
// Touch is the primary pointer. maxTouchPoints alone is true on touchscreen
// laptops driven by a mouse, which should keep the pointer-lock path.
const TOUCH_PRIMARY = navigator.maxTouchPoints > 0 &&
  !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
let touchPlaying = false;

if (!TEST) {
  if (TOUCH_PRIMARY) {
    bindTouch();
  } else {
    // No mobile browser implements Pointer Lock, and the frame loop gates on it —
    // so a device without it AND without touch (rare, but real) gets told plainly
    // rather than being dropped into a forest it cannot walk through.
    // Android Chrome exposes requestPointerLock without supporting it, so the
    // capability check alone would wave a phone into a game it cannot play. Coarse
    // pointer with no fine pointer anywhere = phone or tablet; a touchscreen laptop
    // reports any-pointer:fine and keeps the desktop path.
    const mq = window.matchMedia;
    const pointerLockSupported = typeof document.body.requestPointerLock === 'function'
      && !(mq && mq('(pointer: coarse)').matches && !mq('(any-pointer: fine)').matches);
    addEventListener('click', () => {
      if (!pointerLockSupported) {
        const note = $('desktop-note');
        if (note) note.hidden = false;
        $('title').classList.add('unsupported');
        return;
      }
      if (!started) start();
      if (!player.locked) document.body.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      player.locked = document.pointerLockElement === document.body;
      if (started) $('paused').style.display = player.locked ? 'none' : 'flex';
      if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    });
  }
} else {
  start();
}

// ---- touch: left thumb walks, right thumb looks ----
// The path only ever goes forward, so the left stick is deliberately forgiving:
// push it anywhere upward and you walk, push it to the rim and you hurry. No run
// button to find in the dark.
function bindTouch() {
  const STICK_MAX = 54;        // px of travel for full deflection
  const HURRY_AT = 0.86;       // fraction of full deflection that starts hurrying
  const DEAD = 0.16;
  let moveId = null, lookId = null;
  let ox = 0, oy = 0, lx = 0, ly = 0;
  const ring = $('stick-ring'), nub = $('stick-nub');

  // Retry-safe: iOS suspends the context on a phone call or a tab switch, and the
  // desktop path re-resumes on every lock change. Touch had exactly one attempt,
  // inside `if (!started)`, so a single miss meant silence for the whole session.
  const resumeAudio = () => {
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  };

  const resetStick = () => {
    moveId = null;
    player.touchMove.x = 0; player.touchMove.z = 0;
    player.touchHurry = false;
    if (ring) ring.style.opacity = '0';
  };
  // Both thumbs, not just the stick — leaving lookId set latches a dead pointer id
  // that the next finger cannot claim.
  const releaseAll = () => { resetStick(); lookId = null; };

  addEventListener('touchstart', (e) => {
    // Let touches on real UI through untouched — preventDefault here suppresses the
    // compatibility click, which would make the Qualiacology home pill untappable.
    if (e.target.closest && e.target.closest('a, button')) return;
    if (!started) {
      start();
      touchPlaying = true;
    }
    resumeAudio();
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.5 && moveId === null) {
        moveId = t.identifier; ox = t.clientX; oy = t.clientY;
        if (ring) {
          ring.style.opacity = '1';
          ring.style.left = ox + 'px'; ring.style.top = oy + 'px';
          if (nub) nub.style.transform = 'translate(-50%,-50%)';
        }
      } else if (t.clientX >= innerWidth * 0.5 && lookId === null) {
        lookId = t.identifier; lx = t.clientX; ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });

  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        let dx = t.clientX - ox, dy = t.clientY - oy;
        const len = Math.hypot(dx, dy);
        if (len > STICK_MAX) { dx = dx / len * STICK_MAX; dy = dy / len * STICK_MAX; }
        const nx = dx / STICK_MAX, nz = -dy / STICK_MAX;   // up = forward
        const mag = Math.hypot(nx, nz);
        player.touchMove.x = mag < DEAD ? 0 : nx;
        player.touchMove.z = mag < DEAD ? 0 : nz;
        player.touchHurry = mag >= HURRY_AT;
        if (nub) nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      } else if (t.identifier === lookId) {
        player.applyTouchLook(t.clientX - lx, t.clientY - ly);
        lx = t.clientX; ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });

  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) resetStick();
      if (t.identifier === lookId) lookId = null;
    }
  };
  addEventListener('touchend', endTouch);
  // iOS reclaims touches as system gestures; without this the stick latches on.
  addEventListener('touchcancel', endTouch);
  // Backgrounding the tab would otherwise leave you walking into the dark. Release
  // both thumbs, and re-resume audio on the way back in.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll(); else resumeAudio();
  });
}

// ---- frame loop ----
let fogDensityCur = 0.055;
const fogColorCur = new THREE.Color(0x0a0e0b);
let lastInfo = startInfo;
let statsFrames = 0, statsTime = 0, statsFPS = 0;

function tick(dt) {
  const running = TEST || player.locked || touchPlaying;
  if (running) {
    const info = player.update(dt, world);
    lastInfo = info;
    world.update(dt);
    flora.update(dt);
    events.update(dt, player.pos, camera, info);
    audio.update(dt, player.pos, camera, world.tier());

    // biome fog + auto-iris
    const kind = info.seg.kind;
    fogDensityCur = damp(fogDensityCur, (FOG_DENSITY[kind] || 0.055) * (1 + world.tier() * 0.08), 0.8, dt);
    fogColorCur.lerp(FOG_COLORS[kind] || FOG_COLORS.corridor, 1 - Math.exp(-0.8 * dt));
    scene.fog.density = fogDensityCur;
    scene.fog.color.copy(fogColorCur);

    let expo = BIOME_EXPO[kind] || 1;
    if (info.seg.sunData && info.seg.sunData.armed) {
      const dc = Math.hypot(player.pos.x - info.seg.sunData.center.x, player.pos.z - info.seg.sunData.center.z);
      if (dc < info.seg.sunData.r + 6) expo = 0.8;
    }
    vhs.setExposureTarget(expo);

    // dust motes drift and wrap around the player
    const pp = player.pos;
    for (let i = 0; i < MOTES; i++) {
      let x = motePos[i * 3] + moteVel[i * 3] * dt;
      let y = motePos[i * 3 + 1] + moteVel[i * 3 + 1] * dt;
      let z = motePos[i * 3 + 2] + moteVel[i * 3 + 2] * dt;
      if (y < 0.05) y = 3.2;
      if (x - pp.x > 5) x -= 10; else if (x - pp.x < -5) x += 10;
      if (z - pp.z > 5) z -= 10; else if (z - pp.z < -5) z += 10;
      motePos[i * 3] = x; motePos[i * 3 + 1] = y; motePos[i * 3 + 2] = z;
    }
    moteGeo.attributes.position.needsUpdate = true;
    floor.position.x = pp.x; floor.position.z = pp.z;

    // bog will-o'-wisps drift over the black water
    for (const seg of [info.seg, ...info.seg.children, info.seg.parent]) {
      if (!seg || !seg.bogWisps) continue;
      for (const w of seg.bogWisps) {
        w.ph += dt * 0.55;
        w.mesh.position.set(w.bx + Math.sin(w.ph) * 0.5, w.by + Math.sin(w.ph * 1.3) * 0.28, w.bz + Math.cos(w.ph * 0.7) * 0.5);
      }
    }

    updateOSD(dt);
  }
  vhs.update(dt);
  vhs.render(scene, camera);
}

let prev = performance.now();
function raf(now) {
  const dt = clamp((now - prev) / 1000, 0.0001, 0.05);
  prev = now;
  statsFrames++; statsTime += dt;
  if (statsTime > 1) { statsFPS = statsFrames / statsTime; statsFrames = 0; statsTime = 0; }
  tick(dt);
  requestAnimationFrame(raf);
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  vhs.resize(innerWidth, innerHeight);
  layoutOSD();
}
addEventListener('resize', onResize);
onResize();

if (!TEST || TEST_RUN) requestAnimationFrame(raf);

// ---- test harness ----
if (TEST) {
  window.__EP = {
    ready: true,
    world, player, scene, renderer, audio, events, vhs,
    step(seconds = 1 / 60, n = 1) {
      for (let i = 0; i < n; i++) tick(seconds);
    },
    setInput(inp) { player.testInput = inp; },
    pos() { return { x: player.pos.x, z: player.pos.z }; },
    depth() { return world.depth; },
    segInfo() {
      return {
        id: lastInfo.seg.id, kind: lastInfo.seg.kind, s: lastInfo.s,
        sealed: [...world.segs.values()].filter((s) => s.sealed).length,
        total: world.segs.size,
        sealPoint: { segId: world.sealPoint.seg.id, s: world.sealPoint.s },
        children: lastInfo.seg.children.map((c) => ({ id: c.id, kind: c.kind })),
        ahead: events.ahead ? events.ahead.type : null,
        runner: events.runner ? events.runner.kind : null,
        foot: !!events.foot, tier: world.tier(),
      };
    },
    kindsSeen() { return [...new Set([...world.segs.values()].map((s) => s.kind))]; },
    faceForward() {
      // steer like a player: aim into the next branch when near a fork
      const seg = lastInfo.seg;
      let aim;
      if (lastInfo.s > seg.samples.length - 12 && seg.children.length) {
        const child = seg.children.find((c) => !c.sealed) || seg.children[0];
        aim = world.pointAt(child, Math.min(5, child.samples.length));
      } else {
        aim = world.pointAt(seg, Math.min(seg.samples.length, lastInfo.s + 4));
      }
      player.yaw = Math.atan2(-(aim.x - player.pos.x), -(aim.z - player.pos.z));
    },
    stats() {
      return {
        fps: statsFPS,
        drawCalls: vhs.sceneStats ? vhs.sceneStats.calls : 0,
        triangles: vhs.sceneStats ? vhs.sceneStats.triangles : 0,
        geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
        sealAnims: flora.sealAnims.length, eyes: events.eyes.length,
      };
    },
    forceEvent(name) {
      if (name === 'glitch') vhs.glitch(1);
      if (name === 'anomaly') osdAnomaly();
      if (name === 'eyes') {
        const spots = lastInfo.seg.eyeSpots.filter((s) => !s.used);
        if (spots.length) { spots[0].segRef = lastInfo.seg; events._spawnEyes(spots[0], camera); return true; }
        return false;
      }
      if (name === 'sunsnap' && lastInfo.seg.sunData) {
        lastInfo.seg.sunData.linger = 99;
        return true;
      }
      if (name === 'sentinel') {
        events.ahead = null; events.aheadTimer = 0; events.prevDepth = world.depth - 1;
        events._tryAhead(0.016, player.pos); return !!events.ahead;
      }
      if (name === 'runner') {
        events.runner = null; events.runnerTimer = 0; events.prevDepth = world.depth - 1;
        events._tryRunner(0.016); return !!events.runner;
      }
      if (name === 'footprints') {
        if (events.foot) { events.foot.t = 1e9; events._updateFootprints(0.016); } // park old trail's instances first
        events.footTimer = 0; events.prevDepth = world.depth - 1;
        events._tryFootprints(0.016); return !!events.foot;
      }
      return false;
    },
  };
}
