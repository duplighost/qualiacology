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
import { Sparks, Streaks, Trail, Fireworks, Weather } from './fx.js';
import { Notes, Rings } from './feedback.js';
import { Look, applyLook } from './look.js';
import { Wreck } from './setpieces.js';
import { Land, oceanMaterial, Train, FerrisWheel } from './beach.js';
import { HeartStage, Confetti, Vehicles, partyFrame } from './party.js';
import { TrailWorld, HomeFinale } from './trail.js';
import { CinemaWorld, ScreenFinale } from './cinema.js';
import { ColdWorld, DoorFinale } from './cold.js';
import { SundayWorld, TownLineFinale } from './sunday.js';
import { SummerWorld, LampFinale } from './summer.js';
import { HouseWorld, PortraitFinale } from './mansion.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { Screens } from './menu.js';
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
const ui = new Screens();
const camera = new THREE.PerspectiveCamera(64, 1, 0.4, 9000);
const chase = new ChaseCam(camera);

let S = null;            // the current song session
let state = 'menu';      // menu | loading | title | ride | results
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

async function loadSong(index, onProgress = () => {}) {
  state = 'loading';
  const entry = ALBUM[index];
  const beats = await fetch(`data/beats/${entry.id}.json`).then((r) => r.json());
  const chart = { ...beats, ...entry };
  if (!S || S.id !== entry.id) {
    if (S && S.scene) disposeScene(S.scene);
    S = null;
    onProgress(0.02);
    const buffer = await sound.decode(`assets/music/${entry.id}.ogg`, (p) => onProgress(0.05 + 0.7 * p));
    S = { id: entry.id, index, entry, chart, buffer };
  }
  onProgress(0.8);
  await prepare(S);
  onProgress(1);
  const t0 = parseFloat(params.get('t') || '0');
  S.startAt = t0 > 0 ? t0 : 0;
}

// ---------- the album: pick a song; then a loading card; then the start line ----------
let menuSel = 0;
function card(i) { const e = ALBUM[i]; return { title: e.title, accent: e.accent || '#ff4f9a', image: `assets/menu/${e.id}.jpg`, best: bestOf(e.id), inTime: pctOf(e.id) }; }
function openMenu(sel = menuSel) {
  if (S) { sound.stop(); sound.charge(false); sound.siren(0); sound.skid(0); }
  paused = false; ui.hidePause(); ui.hideEnd();
  state = 'menu';
  document.body.classList.remove('riding');
  hud.hideAll();
  ui.showMenu(ALBUM.map((_, i) => card(i)), sel, (i) => { menuSel = i; sound.resume(); chooseSong(i); });
}
async function chooseSong(i) {
  if (state === 'loading') return;
  ui.hideEnd(); ui.hidePause();
  if (S) { sound.stop(); sound.charge(false); sound.siren(0); }
  ui.showLoading(card(i));
  try { await loadSong(i, (p) => ui.setLoading(p)); } catch (e) { console.error(e); }
  ui.hideLoading();
  state = 'title';
  showTitle();
}
function pctOf(id) { try { return +localStorage.getItem('lc-pct-' + id) || 0; } catch (e) { return 0; } }

function bestOf(id) { try { return +localStorage.getItem('lc-best-' + id) || 0; } catch (e) { return 0; } }
function showTitle() {
  hud.showTitle(S.entry, { index: S.index, best: bestOf(S.id) });
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
  skyline.material.uniforms.uStyle.value = S.entry.skyline === 'hills' ? 1 : 0;
  ground.material.uniforms.uStyle && (ground.material.uniforms.uStyle.value = S.entry.groundStyle === 'country' ? 1 : 0);
  const town = new Scenery(scene, course, P, S.entry.scenery, 11);
  const view = new RiderView(scene, P);
  const notes = new Notes(scene, course, P, S.entry.collect);
  hud.setCollect(S.entry.collect);
  const rings = new Rings(scene);
  const sparks = new Sparks(scene);
  const streaks = new Streaks(scene, P);
  const trail = new Trail(scene, P);
  const fireworks = new Fireworks(scene, [P.jacket, P.edge, P.fret, P.window, 0xffffff]);
  const plan = S.entry.scenery || {};
  const Finale = { ferris: FerrisWheel, heart: HeartStage, home: HomeFinale, screen: ScreenFinale, door: DoorFinale, town: TownLineFinale, lamp: LampFinale, portrait: PortraitFinale }[plan.finale?.kind] || Wreck;
  const finale = plan.finale ? new Finale(scene, course, P, plan.finale, town) : null;
  const vehicles = plan.vehicles ? new Vehicles(scene, course, plan.vehicles) : null;
  const confetti = S.entry.confetti ? new Confetti(scene, S.entry.confettiColors || [P.heart ?? P.glow, P.edge, P.fret, 0xffffff, P.windowAlt, 0x5ff2ff]) : null;
  const trains = plan.trains ? new Train(course, plan.trains.x, plan.trains.passes) : null;
  town.track = track;
  const WORLDS = { trail: TrailWorld, cinema: CinemaWorld, cold: ColdWorld, sunday: SundayWorld, summer: SummerWorld, house: HouseWorld };
  const world = WORLDS[S.entry.world] ? new WORLDS[S.entry.world](scene, { course, plan, P, track, rider, town }) : null;
  const hemi = new THREE.HemisphereLight(new THREE.Color(P.skyLight ?? 0x6a5a9a), new THREE.Color(P.bounce ?? 0x5a3a2a), P.hemiK ?? 1.9);
  scene.add(hemi);
  const weather = new Weather(scene);
  const moonLight = new THREE.DirectionalLight(new THREE.Color(P.moon), P.sunK ?? 0.9);
  const moon = moonLight;
  moon.position.set(...P.moonDir).multiplyScalar(100);
  scene.add(moon);
  const fillLight = new THREE.DirectionalLight(new THREE.Color(P.skyGlow), P.fillK ?? 0.7);
  const fill = fillLight;
  fill.position.set(...P.glowDir).multiplyScalar(100);
  scene.add(fill);
  sound.setKey(S.chart.keyRoot, S.chart.keyMode === 'min');
  Object.assign(S, { world, momentsDone: new Set(), land, trains, P, look, hemi, moonLight, fillLight, weather, scene, course, rider, track, sky, ground, skyline, town, view, notes, rings, sparks, streaks, trail, fireworks, finale, plan, vehicles, confetti, hit: 0, pressGlow: 0, gems: 0, firedChorus: new Set(), pulse: 0, flash: 0, mixFlow: 0.42, muffle: 0, endT: null,
    heartBeat: 0, heartLast: -1, heartDir: null, spikes: [], burstAt: new Set(), afterBeatT: 0 });
  applyLook(S, look.at(0));
  rider.reset(0, 22);
  chase.first = true;
  chase.lift0 = S.entry.camLift || 0;
  chase.titleView = S.entry.titleView || null;
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
  if (ui.active) return;                       // a screen is up: it takes the keys and clicks
  if (state === 'title') startRide();
};
input.onKey = (e) => {
  if (ui.key(e)) return;
  if (e.code === 'KeyP') autopilot.on = !autopilot.on;
  if (e.code === 'Escape' && state === 'ride') togglePause();
  else if (e.code === 'Escape' && state === 'title') openMenu(S ? S.index : menuSel);
};
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'ride' && !paused) togglePause(); });
function togglePause() {
  paused = !paused;
  if (paused) {
    sound.ctx.suspend();
    ui.showPause([
      { label: 'Resume', key: 'esc', code: 'Escape', go: () => togglePause() },
      { label: 'Start over', key: 'R', code: 'KeyR', go: () => { togglePause(); rideAgain(); } },
      { label: 'All songs', key: 'M', code: 'KeyM', go: () => { sound.ctx.resume(); openMenu(S.index); } },
    ]);
  } else { sound.ctx.resume(); ui.hidePause(); }
  document.body.classList.toggle('riding', !paused && state === 'ride');
}
function rideAgain() {
  ui.hideEnd();
  sound.skid(0);
  state = 'loading'; sound.stop(); sound.charge(false);
  prepare(S).then(() => { state = 'title'; showTitle(); startRide(); });
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
  if (!S || state === 'loading' || state === 'menu') return;
  const { rider, course, track, view, P } = S;
  const time = now / 1000;

  if (state === 'ride' && !paused) {
    const songT = sound.time();
    const inp = autopilot.on ? autoInput(S) : { press: input.press, steer: input.steer(dt) };
    if (!autopilot.on) {
      const nowMs = performance.now();
      inp.pressAt = songT - Math.max(0, nowMs - input.downAt) / 1000;
      inp.releaseAt = songT - Math.max(0, nowMs - input.upAt) / 1000;
    }
    // the music's over: the stop (song time slows with her from here)
    if (!rider.stopping && songT > course.duration + 0.05 && rider.grounded) beginStop(S);
    if (rider.stopping) stopFrame(S, dt);
    else rider.advance(Math.max(rider.t, songT), inp);
    handleEvents(S, dt);
    if (songT > course.duration + 3.0 && state === 'ride') endSong();
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
  S.town.update(track, rider, songNow, dt, beatPulse, (T) => { gatePosts(S, T, beatPulse); if (S.finale) { S.finale.beat = S.heartBeat; S.finale.camPos = camera.position; S.finale.update(track, rider, songNow, dt, S.fireworks); } if (S.trains) S.trains.draw(T, rider, songNow); if (S.world && S.world.draw) S.world.draw(T, rider, songNow); if (S.vehicles) S.vehicles.update(track, rider, songNow, T); });
  partyFrame(S, camera, beatPulse);
  if (S.vehicles) {
    // the ambulance's siren: louder close by, higher coming up behind you, lower pulling away
    const amb = S.vehicles.list.find((v) => v.kind === 'ambulance');
    if (amb) { const tau = amb.at + amb.rate * (songNow - amb.at); const lvl = state === 'ride' && songNow > amb.from && songNow < amb.to ? clamp(1 - Math.abs(tau - rider.t) / 6, 0, 1) : 0; sound.siren(lvl * lvl, tau < rider.t ? 1.05 : 0.95); }
  }
  if (S.land) { S.land.update(track, rider, time); const lu = S.land.mat.uniforms; lu.uCam.value.copy(camera.position); lu.uFog.value.set(S.P.fog); lu.uFogDensity.value = S.P.fogDensity; lu.uTown.value.set(S.P.ground); lu.uSky.value.set(S.P.horizon); lu.uSnow.value = S.P.snowGround ?? 0; lu.uWet.value = S.P.rain ?? 0; if (S.P.sand) lu.uSand.value.set(S.P.sand); }
  if (state === 'ride') { musicMoments(S, sec); songMoments(S); }
  if (S.world) S.world.update(S, dt, camera, time);
  S.fireworks.update(dt);
  S.town.setFog(P.fog, P.fogDensity, camera.position);
  S.notes.update(track, rider, time, view.board, camera);
  S.rings.update(track, rider, dt);
  // holding down a hill: the zone lights up under you and a soft rush rises
  const hs = course.sample(rider.t);
  const holding = state === 'ride' && rider.press && hs.hold >= 0;
  S.pressGlow += ((holding ? 1 : 0) - S.pressGlow) * Math.min(1, dt * (holding ? 14 : 8));
  sound.charge(holding && !paused, Math.max(0, hs.hold));
  S.hit *= Math.exp(-dt * 5);
  view.update(track, rider, dt, beatPulse);
  view.setTint(rider.flow);
  S.trail.push(view.board, state === 'ride' ? clamp(0.15 + 0.85 * rider.flow, 0, 1) * clamp((rider.v - 15) / 30, 0.2, 1) : 0);
  S.titleK = state === 'title' ? 1 : Math.max(0, (S.titleK || 0) - dt * 1.4);
  if (state === 'results' && S.finale) { S.outroK = Math.min(1, (S.outroK || 0) + dt / 2.2); S.orbitA = (S.orbitA ?? 2.2) + dt * 0.16; }
  const fo = (S.plan.finale && S.plan.finale.orbit) || {};
  let orbitAngle = S.orbitA;
  if (fo.facing && S.finale && S.outroK) {
    // not round and round: in front of the place, swinging a little, from the road's side
    const fp = S.finale.group.position, c0 = track.ground(S.finale.t - (fo.back ?? 2), 0, S._oc || (S._oc = new THREE.Vector3()));
    orbitAngle = Math.atan2(c0.z - fp.z, c0.x - fp.x) + (fo.swing ?? 0.45) * Math.sin((S.orbitA - 2.2) * 0.9);
  }
  const orbit = S.finale && S.outroK ? { center: S.finale.group.position.clone().add(new THREE.Vector3(0, fo.y ?? 1.2, 0)), k: S.outroK, angle: orbitAngle, r: fo.r, h: fo.h } : null;
  // the end card sits on the left: look a little left of the place so it stands to the right of it
  if (orbit && fo.right) orbit.look = orbit.center.clone().add(new THREE.Vector3(-Math.sin(orbitAngle), 0, Math.cos(orbitAngle)).multiplyScalar(fo.right * (fo.r ?? 14)));
  if (state === 'results' && rider.stopping) stopFrame(S, dt);
  const tk = S.titleK * S.titleK * (3 - 2 * S.titleK);
  const sk = S.stopK ? S.stopK * S.stopK * (3 - 2 * S.stopK) : 0;
  chase.titleView = sk > tk ? S.stopView : (S.entry.titleView || null);
  chase.update(track, rider, dt, Math.max(tk, sk), orbit);

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
  S.track.mat.uniforms.uPress.value = S.pressGlow;
  S.track.mat.uniforms.uHit.value = S.hit;
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
  S.hurt = (S.hurt || 0) * Math.exp(-dt * 0.9);
  pc.uDesat.value = Math.max(rider.wipe > 0 ? 0.5 : 0, 0.55 * S.hurt);
  S.flashTint = (S.flashTint || 0) * Math.exp(-dt * 3);
  if (S.flashTint < 0.02) pc.uFlashColor.value.setRGB(1, 0.6, 0.85);
  pc.uFlash.value = S.flash;
  pc.uBloom.value = 0.55 + 0.3 * S.mixFlow;
  post.render(S.scene, camera);
  if (state === 'ride') {
    hud.frame(rider, course);
    // the word for each pump sits just over her head
    const hp = S._hp || (S._hp = new THREE.Vector3());
    view.root.getWorldPosition(hp); hp.y += 2.6; hp.project(camera);
    hud.placeJudge(hp.x, hp.y);
  }
}

function handleEvents(S, dt) {
  const { rider, sparks, track, P, view } = S;
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
        break;
      }
      case 'judge': judgeFeedback(S, e); break;
      case 'scrape': {
        sound.scrape(e.amount);
        const p = track.at(rider.t, rider.x + (Math.random() - 0.5) * 0.6, 0.12);
        const back = track.dirAt(rider.t, new THREE.Vector3()).multiplyScalar(-rider.v * 0.25);
        sparks.emit(p, back, new THREE.Color(1.0, 0.62, 0.3).multiplyScalar(2.2), 6, { spread: 3, life: 0.35, size: 0.1, grav: 9, up: 0.6 });
        break;
      }
      case 'takeoff': {
        sound.whoosh(0.6 + clamp(e.vy / 10, 0, 0.6)); chase.impulse(0, 0, 0.4);
        // on a run, she does something with the air: bigger the longer she'll be up
        const T = airTimeAhead(rider, S.course);
        if (rider.streak >= 3 && T > 0.5 && state === 'ride') {
          const list = T > 1.3 ? [['flip', 1], ['spin', 2], ['roll', 1]] : T > 0.85 ? [['spin', 1], ['roll', 1], ['grab', 1]] : [['grab', 1], ['spin', 1]];
          S.trickN = (S.trickN || 0) + 1;
          const [kind, turns] = list[S.trickN % list.length];
          view.startTrick(kind, T * (kind === 'grab' ? 0.9 : 0.78), turns);
        }
        break;
      }
      case 'land': {
        sound.land(e.quality, e.hard);
        // a trick finished and landed clean: a flash of it
        if (view.landedTrick && e.hard <= 0.05) {
          view.landedTrick = null;
          const gold = new THREE.Color(1, 0.85, 0.45);
          S.rings.fire(gold.clone().multiplyScalar(1.8), 4.5, 0.48, 0.05);
          sparks.emit(track.at(rider.t, rider.x, 0.4), new THREE.Vector3(0, 3, 0), gold.multiplyScalar(3), 40, { spread: 8, life: 0.7, size: 0.2, grav: 4, up: 1.5 });
          sound.chime(0.9, 4); S.flash = Math.max(S.flash, 0.1);
        }
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
        S.gems++; hud.gem(S.gems);
        const p = track.at(e.note.t, e.note.x, 1.2);
        const c = S.notes.color.clone();
        sparks.emit(p, new THREE.Vector3(), c.clone().multiplyScalar(3), 26, { spread: 6, life: 0.5, size: 0.22, grav: 0, drag: 3 });
        sparks.emit(p, new THREE.Vector3(), new THREE.Color(1, 1, 1).multiplyScalar(2.5), 8, { spread: 2.5, life: 0.3, size: 0.32, grav: 0, drag: 4 });
        S.rings.fire(c.clone().multiplyScalar(1.4), 2.6, 0.26, 0.12);
        break;
      }
    }
  }
  rider.events.length = 0;
}

// the gates at the bottom of the coming dips: a light on each rail, so where to let go reads from far off
function gatePosts(S, T, beatPulse) {
  const { rider, course, track } = S;
  if (state !== 'ride' && state !== 'title') return;
  const v = course.valleys, t = rider.t;
  let lo = 0, hi = v.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (v[m] < t - 0.05) lo = m + 1; else hi = m; }
  const col = S._gateCol || (S._gateCol = [0, 0, 0]);
  const c = new THREE.Color(S.P.gate ?? S.P.edge); col[0] = c.r; col[1] = c.g; col[2] = c.b;
  const p = S._gp || (S._gp = new THREE.Vector3());
  for (let i = lo; i < v.length && v[i] < t + 5.5; i++) {
    const ahead = v[i] - t;
    if (course.sample(v[i] - 0.15).hold < 0) continue;          // only dips you pump into
    const w = course.sample(v[i]).width;
    const k = (0.5 + 1.3 * Math.exp(-Math.max(0, ahead) * 0.55)) * (0.85 + 0.35 * beatPulse) * (ahead < 0 ? Math.max(0, 1 + ahead * 12) : 1);
    for (const side of [-1, 1]) { track.at(v[i], side * (w + 0.1), 0.4, p); T.glow(p.x, p.y, p.z, 2.3, col, k); }
  }
}

// how long she'll be in the air from here if she doesn't dive
function airTimeAhead(r, c) {
  let y = r.y, vy = r.vy, t = r.t;
  const dt = 1 / 120;
  for (let i = 0; i < 480; i++) {
    t += dt; y += vy * dt - 0.5 * G * dt * dt; vy -= G * dt;
    if (y <= c.sample(t).y) return t - r.t;
  }
  return 4;
}

// a pump, graded as you let go: the bigger the hit, the more the world answers
function judgeFeedback(S, e) {
  const { rider, sparks, track, P } = S;
  if (state !== 'ride') return;
  const g = e.grade;
  if (g === 'miss' && !e.lost) return;              // not pumping at all: say nothing
  hud.judge(g, e.streak);
  sound.hit(g, e.streak);
  const p = track.at(rider.t, rider.x, 0.15);
  if (g === 'perfect') {
    const gold = new THREE.Color(1, 0.82, 0.38);
    S.rings.fire(gold.clone().multiplyScalar(1.7), 3.6, 0.4, 0.06);
    S.rings.fire(new THREE.Color(P.gate ?? P.edge).multiplyScalar(1.3), 2.2, 0.34, 0.09, 0.06);
    sparks.emit(p, new THREE.Vector3(0, 2, 0), gold.clone().multiplyScalar(3), 34, { spread: 7, life: 0.6, size: 0.22, grav: 5, up: 1.4 });
    S.hit = 1;
    chase.impulse(0, 0.12, 0.35);
    if (e.streak > 0 && e.streak % 8 === 0) { sound.flourish(e.streak); S.rings.fire(gold.clone().multiplyScalar(2.2), 5.5, 0.55, 0.045, 0.1); }
  } else if (g === 'good') {
    S.rings.fire(new THREE.Color(1, 1, 1).multiplyScalar(1.1), 2.6, 0.32, 0.08);
    sparks.emit(p, new THREE.Vector3(0, 1.5, 0), new THREE.Color(P.gate ?? P.edge).multiplyScalar(2.2), 16, { spread: 5, life: 0.45, size: 0.18, grav: 5 });
    S.hit = Math.max(S.hit, 0.45);
    chase.impulse(0, 0.06, 0.15);
  } else if (e.lost >= 4) {
    // a run broken: a dull grey crack where it ended
    S.rings.fire(new THREE.Color(0.35, 0.33, 0.4), 2.2, 0.4, 0.12);
  }
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

// the end of a song: board across, heel edge in, spray, stopped. Song time runs at her
// speed over the speed she had, so the road and the place she's arriving at hold still.
function beginStop(S) {
  const r = S.rider;
  r.stopping = true; r.stopV0 = Math.max(12, r.v); r.stopVel = r.stopV0;
  S.stopClock = r.t; S.stopK = 0;
  // the camera comes round in front of her, off her front shoulder, to see it
  S.stopView = { ahead: 4.4 / r.stopV0, x: -3.7, h: 1.4, back: 0.2 / r.stopV0, lookH: 0.9, lookFast: true };
  S.stopH = 1.5;
}
function stopFrame(S, dt) {
  const r = S.rider;
  const decel = Math.max(22, r.stopV0 / 1.25);
  r.stopVel = Math.max(0, r.stopVel - decel * dt);
  S.stopClock += dt * r.stopVel / r.stopV0;
  r.advance(Math.max(r.t, S.stopClock), { press: false, steer: 0 });
  S.stopK = Math.min(1, (S.stopK || 0) + dt / 1.1);
  // the camera goes up and over her on its way round, not through her
  const sk = S.stopK * S.stopK * (3 - 2 * S.stopK);
  S.stopView.h = S.stopH + 2.2 * Math.sin(Math.PI * sk);
  const k = r.stopVel / r.stopV0;
  sound.skid(paused ? 0 : Math.min(1, k * 1.3) * (r.stopVel > 0.5 ? 1 : 0));
  // spray off the front edge, the way the board was going
  if (r.stopVel > 1.5) {
    const f = S.track.dirAt(r.t, S._sf || (S._sf = new THREE.Vector3()));
    const p = S.track.at(r.t, r.x, 0.12, S._sp || (S._sp = new THREE.Vector3()));
    p.addScaledVector(f, 0.7);
    const n = Math.ceil(2 + 10 * k);
    const c = new THREE.Color(S.P.edge).multiplyScalar(1.3 + 0.8 * k);
    S.sparks.emit(p, f.clone().multiplyScalar(4 + r.stopVel * 0.45).add(new THREE.Vector3(0, 2.6 + 2.5 * k, 0)), c, n, { spread: 2.6 + 3 * k, life: 0.55, size: 0.15, grav: 9, drag: 1.2, jitter: 1.4 });
    if (Math.random() < 0.5) S.sparks.emit(p, f.clone().multiplyScalar(3 + r.stopVel * 0.3).add(new THREE.Vector3(0, 1.5, 0)), new THREE.Color(1, 1, 1).multiplyScalar(1.2 * k + 0.4), 3, { spread: 2, life: 0.4, size: 0.22, grav: 7, drag: 2, jitter: 1.2 });
  }
}

// moments a song asks for at exact times: a flash of lightning and its thunder, a knock
function songMoments(S) {
  const list = S.entry.moments;
  if (!list) return;
  const t = S.rider.t;
  for (const m of list) {
    if (S.momentsDone.has(m) || t < m.t || t > m.t + 0.5) continue;
    S.momentsDone.add(m);
    if (m.kind === 'thunder') { S.flash = Math.max(S.flash, 0.55 * (m.k ?? 1)); post.comp.uniforms.uFlashColor.value.setRGB(0.75, 0.85, 1); setTimeout(() => sound.thunder(m.k ?? 1), 140); S.flashTint = 0.6; }
    if (m.kind === 'flash') { S.flash = Math.max(S.flash, m.k ?? 0.8); post.comp.uniforms.uFlashColor.value.setRGB(1, 0.95, 0.85); S.flashTint = 0.8; }
    if (m.kind === 'fireworks') {
      // shells from the alleys either side, a moment ahead of you
      for (let i = 0; i < (m.n ?? 6); i++) {
        const side = i % 2 ? 1 : -1;
        const from = S.track.ground(t + (m.ahead ?? 2.0) + i * 0.16, side * (m.x ?? 34) * (0.8 + Math.random() * 0.7), new THREE.Vector3());
        const to = from.clone(); to.y = (m.y ?? 42) + Math.random() * 26;
        setTimeout(() => S.fireworks.launch(from, to, m.size ?? 0.9), i * (m.gap ?? 150));
      }
    }
    // a knock at the door: two raps, a little shake
    if (m.kind === 'knock') { for (let i = 0; i < (m.n ?? 2); i++) setTimeout(() => { sound.thud(m.k ?? 0.5); chase.impulse(0.3, 0.45, 0); }, i * (m.gap ?? 210)); }
    if (m.kind === 'thud') { sound.thud(m.k ?? 1); chase.impulse(1.1, 0.9, 0); S.muffle = Math.max(S.muffle, 0.6); S.hurt = 1; }
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
  sound.charge(false); sound.siren(0);
  const st = S.rider.stats;
  const inTime = st.judged ? Math.round(100 * st.hits / st.judged) : 0;
  let best = 0, newBest = false;
  try {
    best = +localStorage.getItem('lc-best-' + S.id) || 0;
    if (st.dist > best) { localStorage.setItem('lc-best-' + S.id, st.dist); newBest = best > 0; }
    if (inTime > (+localStorage.getItem('lc-pct-' + S.id) || 0)) localStorage.setItem('lc-pct-' + S.id, inTime);
  } catch (e) { /* private mode */ }
  hud.hideAll();
  S.endShown = performance.now();
  const i = S.index, last = i >= ALBUM.length - 1;
  const next = { label: 'Next song', key: 'enter', go: () => chooseSong(i + 1) };
  const again = { label: 'Ride again', key: 'R', code: 'KeyR', go: rideAgain };
  const menu = { label: 'All songs', key: 'M', code: 'KeyM', go: () => openMenu(last ? 0 : i + 1) };
  const data = { title: S.entry.title, accent: S.entry.accent || '#ff4f9a', dist: st.dist, best, newBest, inTime, perfects: st.perfects, bestStreak: st.bestStreak, notes: st.notes, notesTotal: st.notesTotal, top: st.top, collect: S.entry.collect };
  // let the ending breathe a moment before the card comes up
  setTimeout(() => { if (state === 'results') ui.showEnd(data, last ? [menu, again] : [next, again, menu]); }, 1400);
}

requestAnimationFrame(frame);
if (params.has('song')) chooseSong(clamp(parseInt(params.get('song'), 10), 0, ALBUM.length - 1));
else openMenu(0);
