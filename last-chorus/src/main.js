import * as THREE from 'three';
import { Sound } from './audio.js';
import { Course, G } from './course.js';
import { Rider, autoPress } from './rider.js';
import { Track } from './track.js';
import { makeSky, makeGround, makeSkyline } from './world.js';
import { Scenery } from './scenery.js';
import { RiderView } from './riderview.js';
import { ChaseCam } from './camera.js';
import { Post } from './post.js';
import { Notes, Sparks, Streaks, Trail, Fireworks, Weather } from './fx.js';
import { Look, applyLook } from './look.js';
import { Wreck } from './setpieces.js';
import { Land, oceanMaterial, Train, FerrisWheel } from './beach.js';
import { HeartStage, Confetti, Vehicles, partyFrame } from './party.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { ALBUM, PALETTES } from './album.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const params = new URLSearchParams(location.search);

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(1);
const post = new Post(renderer);
const sound = new Sound();
const input = new Input(canvas);
const hud = new Hud();
const camera = new THREE.PerspectiveCamera(64, 1, 0.4, 9000);
const chase = new ChaseCam(camera);

let S = null;            // the current song session
let state = 'loading';   // loading | title | ride | results
let lastFrame = performance.now();
let paused = false;
const autopilot = { on: params.has('auto') };

// render scale: ?scale= fixes it; otherwise it starts where it settled last time and
// steps down if this machine can't hold a steady frame rate
const fixedScale = params.has('scale');
let renderScale = fixedScale ? clamp(parseFloat(params.get('scale')), 0.4, 2) : (() => { try { return clamp(+localStorage.getItem('lc-scale') || 1, 0.55, 1); } catch (e) { return 1; } })();
const perf = [];
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const scale = renderScale;
  renderer.setSize(w, h, false);
  post.setSize(w, h, scale);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

async function loadSong(index) {
  state = 'loading';
  const entry = ALBUM[index];
  const beats = await fetch(`data/beats/${entry.id}.json`).then((r) => r.json());
  const chart = { ...beats, ...entry };
  if (!S || S.id !== entry.id) {
    if (S && S.scene) disposeScene(S.scene);
    hud.loading(0);
    const buffer = await sound.decode(`assets/music/${entry.id}.ogg`, (p) => hud.loading(p));
    hud.loading(1);
    S = { id: entry.id, index, entry, chart, buffer };
  }
  await prepare(S);
  hud.loading(1);
  state = 'title';
  showTitle();
  const t0 = parseFloat(params.get('t') || '0');
  if (t0 > 0) { S.startAt = t0; }
}

function bestOf(id) { try { return +localStorage.getItem('lc-best-' + id) || 0; } catch (e) { return 0; } }
function showTitle() {
  const i = S.index;
  hud.showTitle(S.entry, { index: i, hasPrev: i > 0, hasNext: i < ALBUM.length - 1, best: bestOf(S.id) });
}
let switching = false;
async function switchSong(d) {
  if (switching || !S) return;
  const j = S.index + d;
  if (j < 0 || j >= ALBUM.length) return;
  switching = true;
  S.startAt = 0;
  try { await loadSong(j); } finally { switching = false; }
}

// let go of a finished world's GPU memory before building the next one
function disposeScene(scene) {
  if (!scene) return;
  const seen = new Set();
  scene.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const mt of mats) { if (seen.has(mt)) continue; seen.add(mt); for (const k in mt) { const v = mt[k]; if (v && v.isTexture && !seen.has(v)) { seen.add(v); v.dispose(); } } if (mt.uniforms) for (const k in mt.uniforms) { const v = mt.uniforms[k].value; if (v && v.isTexture && !seen.has(v)) { seen.add(v); v.dispose(); } } mt.dispose(); }
  });
}

function build(S) {
  if (S.scene) disposeScene(S.scene);
  const look = new Look(S.entry, PALETTES);
  const P = look.at(0);
  const scene = new THREE.Scene();
  const course = new Course(S.chart);
  const rider = new Rider(course);
  const track = new Track(course, scene, P);
  const sky = makeSky(scene, P);
  const ground = makeGround(scene, P);
  // some places are by the sea: the ground plane becomes the ocean and the land is a strip along the road
  let land = null;
  if (S.entry.ground === 'ocean') {
    ground.material = oceanMaterial(P);
    ground.position.y = -0.4;
    land = new Land(scene, null, P, S.entry.land || {});
  }
  const skyline = makeSkyline(scene, P);
  const town = new Scenery(scene, course, P, S.entry.scenery, 11);
  const view = new RiderView(scene, P);
  const notes = new Notes(scene, course, P);
  const sparks = new Sparks(scene);
  const streaks = new Streaks(scene, P);
  const trail = new Trail(scene, P);
  const fireworks = new Fireworks(scene, [P.jacket, P.edge, P.fret, P.window, 0xffffff]);
  const plan = S.entry.scenery || {};
  const Finale = { ferris: FerrisWheel, heart: HeartStage }[plan.finale?.kind] || Wreck;
  const finale = plan.finale ? new Finale(scene, course, P, plan.finale, town) : null;
  const vehicles = plan.vehicles ? new Vehicles(scene, course, plan.vehicles) : null;
  const confetti = S.entry.confetti ? new Confetti(scene, [P.heart ?? P.glow, P.edge, P.fret, 0xffffff, P.windowAlt, 0x5ff2ff]) : null;
  const trains = plan.trains ? new Train(course, plan.trains.x, plan.trains.passes) : null;
  town.track = track;
  const hemi = new THREE.HemisphereLight(new THREE.Color(P.skyLight ?? 0x6a5a9a), new THREE.Color(P.bounce ?? 0x5a3a2a), 1.9);
  scene.add(hemi);
  const weather = new Weather(scene);
  const moonLight = new THREE.DirectionalLight(new THREE.Color(P.moon), 0.9);
  const moon = moonLight;
  moon.position.set(...P.moonDir).multiplyScalar(100);
  scene.add(moon);
  const fillLight = new THREE.DirectionalLight(new THREE.Color(P.skyGlow), 0.7);
  const fill = fillLight;
  fill.position.set(...P.glowDir).multiplyScalar(100);
  scene.add(fill);
  sound.setKey(S.chart.keyRoot, S.chart.keyMode === 'min');
  Object.assign(S, { land, trains, P, look, hemi, moonLight, fillLight, weather, scene, course, rider, track, sky, ground, skyline, town, view, notes, sparks, streaks, trail, fireworks, finale, plan, vehicles, confetti, firedChorus: new Set(), pulse: 0, flash: 0, mixFlow: 0.42, muffle: 0, endT: null,
    heartBeat: 0, heartLast: -1, heartDir: null, spikes: [], burstAt: new Set(), afterBeatT: 0 });
  applyLook(S, look.at(0));
  rider.reset(0, 22);
  chase.first = true;
  chase.lift0 = S.entry.camLift || 0;
  track.update(rider);
  window.__LC = { S, sound, input, autopilot, state: () => state, camera, renderer };

}

// build the ride and wait until everything it will draw is loaded and compiled
async function prepare(S) {
  build(S);
  await Promise.all([S.view.ready, S.finale && S.finale.ready].filter(Boolean));
  await precompile(S);
}

// compile every shader now, hidden things included, so nothing compiles mid-ride
async function precompile(S) {
  const hidden = [];
  S.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  try { if (renderer.compileAsync) await renderer.compileAsync(S.scene, camera); else renderer.compile(S.scene, camera); } catch (e) { /* compile is a hint */ }
  for (const o of hidden) o.visible = false;
}

function startRide() {
  if (state !== 'title') return;
  state = 'ride';
  document.body.classList.add('riding');
  sound.resume();
  const t0 = S.startAt || 0;
  S.rider.reset(t0, t0 > 0 ? 38 : 22);
  sound.play(S.buffer, t0);
  hud.start(S.course);
  S.titleK = 1;
  S.pressHint = 0;
}

input.onPress = () => {
  if (paused) { togglePause(); return; }
  if (state === 'title') startRide();
  else if (state === 'results' && performance.now() - S.endShown > 900) { state = 'loading'; prepare(S).then(() => { state = 'title'; showTitle(); startRide(); }); }
};
input.onKey = (e) => {
  if (e.code === 'KeyP') autopilot.on = !autopilot.on;
  if ((state === 'title' || state === 'results') && (e.code === 'ArrowRight' || e.code === 'ArrowLeft')) switchSong(e.code === 'ArrowRight' ? 1 : -1);
  if (e.code === 'Escape' && state === 'ride') togglePause();
};
document.getElementById('prev').addEventListener('pointerdown', (e) => { e.stopPropagation(); switchSong(-1); });
document.getElementById('next').addEventListener('pointerdown', (e) => { e.stopPropagation(); switchSong(1); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'ride' && !paused) togglePause(); });
function togglePause() {
  paused = !paused;
  if (paused) sound.ctx.suspend(); else sound.ctx.resume();
  document.getElementById('paused').classList.toggle('on', paused);
  document.body.classList.toggle('riding', !paused && state === 'ride');
}

// ---------- the autopilot: rides like someone who knows the song ----------
function autoInput(S) {
  const r = S.rider, c = S.course;
  const s = c.sample(r.t + 0.03);
  const press = autoPress(r, c);
  // steer toward the next note
  let steer = 0;
  for (const n of c.notes) if (n.t > r.t + 0.05 && !n.got) { steer = n.x / Math.max(1, s.width - 1.0); break; }
  return { press, steer: clamp(steer, -1, 1) };
}

// ---------- frame ----------
function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - lastFrame) / 1000;
  const dt = Math.min(0.05, rawDt);
  lastFrame = now;
  if (!fixedScale && state === 'ride' && !paused && document.hasFocus()) {
    perf.push(rawDt);
    if (perf.length >= 240) {
      perf.sort((a, b) => a - b);
      const med = perf[120]; perf.length = 0;
      if (med > 0.0195 && renderScale > 0.56) {
        renderScale = Math.max(0.55, Math.round((renderScale - 0.15) * 100) / 100);
        resize();
        try { localStorage.setItem('lc-scale', renderScale); } catch (e) { /* private mode */ }
      }
    }
  }
  if (!S || state === 'loading') return;
  const { rider, course, track, view, P } = S;
  const time = now / 1000;

  if (state === 'ride' && !paused) {
    const songT = sound.time();
    const inp = autopilot.on ? autoInput(S) : { press: input.press, steer: input.steer(dt) };
    rider.advance(Math.max(rider.t, songT), inp);
    handleEvents(S, dt);
    if (songT > course.duration + 2.5 && state === 'ride') endSong();
  }
  if (state === 'title') {
    // idle on the start line, breathing with nothing yet
    S.pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
  }

  // beat pulse from the song clock
  const bpos = course.beatAt(rider.t);
  const bf = bpos - Math.floor(bpos);
  const beatPulse = state === 'ride' ? Math.exp(-bf * 6) : 0;
  S.flash *= Math.exp(-dt * 5);

  track.update(rider);
  const songNow = state === 'ride' ? sound.time() : rider.t;
  const sec = course.sectionAt(rider.t);
  S.town.beatLamps = sec.kind === 'chorus' || sec.kind === 'final';
  if (S.entry.heart) heartFrame(S, dt, songNow);
  S.town.update(track, rider, songNow, dt, beatPulse, (T) => { if (S.finale) { S.finale.beat = S.heartBeat; S.finale.camPos = camera.position; S.finale.update(track, rider, songNow, dt, S.fireworks); } if (S.trains) S.trains.draw(T, rider, songNow); if (S.vehicles) S.vehicles.update(track, rider, songNow, T); });
  partyFrame(S, camera, beatPulse);
  if (S.vehicles) {
    // the ambulance's siren: louder close by, higher coming up behind you, lower pulling away
    const amb = S.vehicles.list.find((v) => v.kind === 'ambulance');
    if (amb) { const tau = amb.at + amb.rate * (songNow - amb.at); const lvl = state === 'ride' && songNow > amb.from && songNow < amb.to ? clamp(1 - Math.abs(tau - rider.t) / 6, 0, 1) : 0; sound.siren(lvl * lvl, tau < rider.t ? 1.05 : 0.95); }
  }
  if (S.land) { S.land.update(track, rider, time); const lu = S.land.mat.uniforms; lu.uCam.value.copy(camera.position); lu.uFog.value.set(S.P.fog); lu.uFogDensity.value = S.P.fogDensity; lu.uTown.value.set(S.P.ground); lu.uSky.value.set(S.P.horizon); lu.uSnow.value = S.P.snowGround ?? 0; lu.uWet.value = S.P.rain ?? 0; if (S.P.sand) lu.uSand.value.set(S.P.sand); }
  if (state === 'ride') musicMoments(S, sec);
  S.fireworks.update(dt);
  S.town.setFog(P.fog, P.fogDensity, camera.position);
  S.notes.update(track, rider, time);
  view.update(track, rider, dt, beatPulse);
  view.setTint(rider.flow);
  S.trail.push(view.board, state === 'ride' ? clamp(0.15 + 0.85 * rider.flow, 0, 1) * clamp((rider.v - 15) / 30, 0.2, 1) : 0);
  S.titleK = state === 'title' ? 1 : Math.max(0, (S.titleK || 0) - dt * 1.4);
  if (state === 'results' && S.finale) { S.outroK = Math.min(1, (S.outroK || 0) + dt / 2.2); S.orbitA = (S.orbitA ?? 2.2) + dt * 0.16; }
  const fo = (S.plan.finale && S.plan.finale.orbit) || {};
  const orbit = S.finale && S.outroK ? { center: S.finale.group.position.clone().add(new THREE.Vector3(0, fo.y ?? 1.2, 0)), k: S.outroK, angle: S.orbitA, r: fo.r, h: fo.h } : null;
  chase.update(track, rider, dt, S.titleK * S.titleK * (3 - 2 * S.titleK), orbit);

  // the music: how much of the band you've earned
  const sp = clamp((rider.v - 18) / 40, 0, 1);
  const target = state === 'ride' ? clamp(0.62 * rider.flow + 0.38 * sp + (rider.grounded ? 0 : 0.08), 0, 1) : 0.4;
  S.mixFlow += (target - S.mixFlow) * Math.min(1, dt * 2.2);
  S.muffle *= Math.exp(-dt * 2.5);
  sound.setFlow(S.mixFlow, S.muffle, rider.grounded ? 0 : clamp(rider.air / 1.2, 0, 1) * 0.5);
  sound.setMotion(rider.v, !rider.grounded, rider.press, state === 'ride' ? 1 : 0.4);

  if (S.look.animated) applyLook(S, S.look.at(rider.t));
  // fx
  const vel = S._vel || (S._vel = new THREE.Vector3());
  track.dirAt(rider.t, vel).multiplyScalar(rider.v);
  S.streaks.update(camera, vel, rider.v, state === 'ride' ? clamp((rider.v - 22) / 50, 0, 1) * (0.5 + 0.5 * S.mixFlow) : 0);
  if (state === 'ride' && rider.grounded && rider.flow > 0.55 && Math.random() < dt * 40 * rider.flow) {
    const p = track.at(rider.t, rider.x + (Math.random() - 0.5) * 0.8, 0.15);
    S.sparks.emit(p, vel.clone().multiplyScalar(0.55), new THREE.Color(P.edge).multiplyScalar(1.2), 1, { spread: 0.8, life: 0.5, size: 0.12, grav: 0, drag: 0.6 });
  }
  S.sparks.update(dt);
  S.weather.update(camera, vel, dt, time);
  if (S.confetti) {
    let on = 0;
    for (const [a, b] of S.entry.confetti) if (rider.t >= a && rider.t < b) {
      on = state === 'ride' ? 0.3 + 0.7 * rider.flow : 0.6;
      // the drop: a cloud of it right in front of you
      if (!S.burstAt.has(a) && state === 'ride' && rider.t < a + 0.5) { S.burstAt.add(a); S.confetti.burst(camera, vel.clone().normalize(), 0.6 + 0.4 * rider.flow); }
    }
    S.confetti.update(camera, dt, time, on);
  }

  // uniforms
  const cu = camera.position;
  S.track.mat.uniforms.uCam.value.copy(cu);
  S.track.mat.uniforms.uFlow.value = S.mixFlow;
  S.track.mat.uniforms.uPulse.value = beatPulse * (0.4 + 0.6 * rider.flow);
  S.track.mat.uniforms.uTime.value = time;
  S.ground.material.uniforms.uCam.value.copy(cu);
  S.sky.position.copy(cu);
  S.skyline.position.set(cu.x, 0, cu.z);
  S.skyline.material.uniforms.uTime.value = time; S.skyline.material.uniforms.uFlow.value = S.mixFlow;
  S.sky.material.uniforms.uTime.value = time;
  S.sky.material.uniforms.uFlow.value = S.mixFlow;
  S.ground.position.set(cu.x, S.land ? -0.4 : 0, cu.z);
  if (S.land) { const ou = S.ground.material.uniforms; ou.uTime.value = time; ou.uHorizon.value.set(S.P.horizon); ou.uZenith.value.set(S.P.zenith); ou.uSun.value.set(S.P.moon); if (S.P.moonDir) ou.uSunDir.value.set(...S.P.moonDir).normalize(); ou.uGround.value.set(S.P.water ?? 0x0d1a2a); ou.uRain.value = S.P.rain ?? 0; ou.uFog.value.set(S.P.fog); ou.uFogDensity.value = S.P.fogDensity; }
  const pc = post.comp.uniforms;
  pc.uTime.value = time;
  pc.uSpeed.value = state === 'ride' ? clamp((rider.v - 25) / 55, 0, 1) : 0;
  pc.uAberr.value = 0.15 + 0.5 * pc.uSpeed.value;
  pc.uSat.value = 0.9 + 0.4 * S.mixFlow;
  pc.uDesat.value = rider.wipe > 0 ? 0.5 : 0;
  pc.uFlash.value = S.flash;
  pc.uBloom.value = 0.55 + 0.3 * S.mixFlow;
  post.render(S.scene, camera);
  if (state === 'ride') hud.frame(rider, course);
}

function handleEvents(S, dt) {
  const { rider, sparks, track, P } = S;
  for (const e of rider.events) {
    switch (e.type) {
      case 'valley': {
        const q = e.q;
        // in the bridge the heart only beats when you do, and the monitor writes it down
        const mon = S.entry.monitor;
        if (mon && rider.t >= mon.from && rider.t < mon.to) {
          if (q > 0.2) { S.spikes.push({ t: rider.t, a: 0.25 + 0.75 * q }); if (S.spikes.length > 16) S.spikes.shift(); sound.beep(q); }
          S.heartBeat = Math.max(S.heartBeat, q);
        }
        if (q > 0.55) sound.thump(0.4 + 0.6 * q);
        chase.impulse(0.12 + 0.25 * q, 0.35 * q, 0);
        if (q > 0.6) {
          const p = track.at(rider.t, rider.x, 0.1);
          sparks.emit(p, new THREE.Vector3(0, 0, 0), new THREE.Color(P.glow).multiplyScalar(1.5 + q), Math.round(6 + 12 * q), { spread: 5, life: 0.5, size: 0.22, grav: 4 });
        }
        if (q > 0.85 && e.onBeat === 1) { S.flash = Math.max(S.flash, 0.06); sound.chime(0.5, 0); }
        break;
      }
      case 'scrape': {
        sound.scrape(e.amount);
        const p = track.at(rider.t, rider.x + (Math.random() - 0.5) * 0.6, 0.12);
        const back = track.dirAt(rider.t, new THREE.Vector3()).multiplyScalar(-rider.v * 0.25);
        sparks.emit(p, back, new THREE.Color(1.0, 0.62, 0.3).multiplyScalar(2.2), 6, { spread: 3, life: 0.35, size: 0.1, grav: 9, up: 0.6 });
        break;
      }
      case 'takeoff': sound.whoosh(0.6 + clamp(e.vy / 10, 0, 0.6)); chase.impulse(0, 0, 0.4); break;
      case 'land': {
        sound.land(e.quality, e.hard);
        if (e.hard > 0.05) {
          chase.impulse(0.5 + e.hard, 0.6 * e.hard, 0);
          const p = track.at(rider.t, rider.x, 0.1);
          sparks.emit(p, new THREE.Vector3(), new THREE.Color(1, 0.55, 0.25).multiplyScalar(2), Math.round(20 * e.hard), { spread: 7, life: 0.6, size: 0.15, grav: 14 });
          S.muffle = Math.max(S.muffle, 0.5 * e.hard);
        } else if (e.quality > 0) {
          chase.impulse(0.15, 0.3, 0.6 * e.quality);
          S.flash = Math.max(S.flash, 0.08 * e.quality);
          const p = track.at(rider.t, rider.x, 0.1);
          sparks.emit(p, new THREE.Vector3(), new THREE.Color(P.edge).multiplyScalar(2.5), 24, { spread: 8, life: 0.7, size: 0.2, grav: 3 });
        }
        break;
      }
      case 'crash':
        sound.crash(); S.muffle = 1; chase.impulse(1.4, 0.8, 0);
        break;
      case 'note': {
        sound.pickup(e.degree);
        const p = track.at(e.note.t, e.note.x, 1.15);
        sparks.emit(p, new THREE.Vector3(), new THREE.Color(P.fret).multiplyScalar(2.2), 14, { spread: 3.5, life: 0.45, size: 0.18, grav: 0 });
        break;
      }
    }
  }
  rider.events.length = 0;
}

// the song's big moments reach the world: fireworks on the drops, the city on at the end
function musicMoments(S, sec) {
  const r = S.rider, t = r.t;
  if ((sec.kind === 'chorus' || sec.kind === 'final') && !S.firedChorus.has(sec.ta) && t >= sec.ta) {
    S.firedChorus.add(sec.ta);
    const n = Math.round(1 + 7 * r.flow);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const from = S.track.ground(t + 2.5 + i * 0.25, side * (40 + Math.random() * 50), new THREE.Vector3());
      const to = from.clone(); to.y = 50 + Math.random() * 50;
      setTimeout(() => S.fireworks.launch(from, to, 0.7 + 0.5 * r.flow), i * 110);
    }
  }
  const fz = S.plan.finale;
  if (fz && S.finale && !S.finale.fired && t >= (fz.fireAt ?? fz.t - 5)) {
    const st = r.stats;
    const earned = Math.max(0, Math.min(1, (st.flowN ? st.flowSum / st.flowN : 0) * 0.7 + (st.notesTotal ? st.notes / st.notesTotal : 0) * 0.3));
    S.finale.fire(earned);
    S.town.wakeAll = earned;
    S.flash = 0.25 * earned;
  }
}

// the heart: in the sky ahead all night, beating with the kick as hard as you
// keep the beat; in the bridge only when you pump; after the song on its own
function heartFrame(S, dt, songT) {
  const { rider, course, track, sky } = S;
  const su = sky.material.uniforms;
  const mon = S.entry.monitor;
  const inMon = mon && rider.t >= mon.from && rider.t < mon.to;
  const after = state === 'results' || (state === 'ride' && songT > course.duration + 0.15);
  if (after) {
    // "I'm still here": when the music stops it keeps going on its own, slowing and quieting
    S.afterT = (S.afterT || 0) + dt;
    S.afterBeatT -= dt;
    if (S.afterBeatT <= 0) { S.afterBeatT += 0.9 + Math.min(0.35, S.afterT * 0.01); S.heartBeat = 1; sound.heartbeat(0.85 * Math.max(0.3, 1 - S.afterT / 50)); S.dubIn = 0.24; }
    if (S.dubIn > 0) { S.dubIn -= dt; if (S.dubIn <= 0) S.heartBeat = Math.max(S.heartBeat, 0.6); }
  } else if (state === 'ride' && !inMon) {
    const bi = Math.floor(course.beatAt(songT));
    if (bi !== S.heartLast) { S.heartLast = bi; S.heartBeat = Math.max(S.heartBeat, 0.15 + 0.85 * rider.flow * rider.flow); }
  }
  S.heartBeat *= Math.exp(-dt * 6.5);
  // where it hangs: over the end of the street ahead, so the street frames it
  // (on the title it hangs behind her, over the city, so you see it before you start)
  const dir = S._hv || (S._hv = new THREE.Vector3());
  if (state === 'title') {
    camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    const a = 0.36, c = Math.cos(a), sn = Math.sin(a);
    dir.set(dir.x * c + dir.z * sn, 0, dir.z * c - dir.x * sn);
    S.heartDir = (S.heartDir || new THREE.Vector3()).copy(dir);
  } else {
    track.dirAt(rider.t + 3, dir); dir.y = 0;
    if (dir.lengthSq() > 1e-4) {
      dir.normalize();
      if (!S.heartDir) S.heartDir = dir.clone(); else S.heartDir.lerp(dir, Math.min(1, dt * 1.2)).normalize();
    }
  }
  const hd = S.heartDir || new THREE.Vector3(0, 0, 1);
  const elT = state === 'title' ? 0.12 : (inMon ? 0.25 : 0.2);
  S.heartEl = (S.heartEl ?? 0.12) + (elT - (S.heartEl ?? 0.12)) * Math.min(1, dt * 1.5);
  const el = S.heartEl;
  su.uHeartDir.value.set(hd.x * Math.cos(el), Math.sin(el), hd.z * Math.cos(el));
  // the stage heart takes over when you get close
  const handoff = S.finale && S.finale.near !== undefined ? S.finale.near : 0;
  const glow = state === 'title' ? 0.7 : 0.35 + 0.65 * rider.flow;
  su.uHeart.value = glow * (1 - handoff) * (inMon ? 0.75 : 1);
  su.uHeartBeat.value = S.heartBeat;
  su.uHeartCol.value.set(S.P.heart ?? 0xff2a50);
  // the monitor sweeps in when the band leaves and out when it comes back
  const mk = mon ? smoothstepJS(mon.from - 1.2, mon.from + 0.3, rider.t) * (1 - smoothstepJS(mon.to - 0.2, mon.to + 1.8, rider.t)) : 0;
  su.uMon.value = mk;
  if (mk > 0) {
    su.uMonNow.value = rider.t;
    su.uMonCol.value.set(S.P.edge);
    for (let i = 0; i < 16; i++) { const sp = S.spikes[S.spikes.length - 1 - i]; su.uSpk.value[i].set(sp ? sp.t : -99, sp ? sp.a : 0); }
  }
  // the heart lights the city from where it hangs
  if (S.moonLight) { S.moonLight.position.copy(su.uHeartDir.value).multiplyScalar(100); S.moonLight.intensity = 0.6 + 0.9 * S.heartBeat * (1 - handoff); }
}
function smoothstepJS(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

function endSong() {
  state = 'results';
  document.body.classList.remove('riding');
  const key = 'lc-best-' + S.id;
  let best = 0;
  try { best = +localStorage.getItem(key) || 0; if (S.rider.stats.dist > best) localStorage.setItem(key, S.rider.stats.dist); } catch (e) { /* private mode */ }
  hud.showResults(S.entry, S.rider.stats, best, S.index < ALBUM.length - 1);
  S.endShown = performance.now();
}

requestAnimationFrame(frame);
loadSong(clamp(parseInt(params.get('song') || '0', 10), 0, ALBUM.length - 1));
