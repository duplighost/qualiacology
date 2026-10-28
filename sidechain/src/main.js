import * as THREE from 'three';
import './three-fix.js';   // (first: every material's shader keyed by what it really is)
import { Sound } from './audio.js';
import { Course, G } from './course.js';
import { Rider, autoPress, autoSteer, autoGroovy, parScore } from './rider.js';
import { Track } from './track.js';
import { makeSky, makeGround, makeSkyline } from './world.js';
import { Scenery } from './scenery.js';
import { RiderView } from './riderview.js';
import { ChaseCam } from './camera.js';
import { Post } from './post.js';
import { Sparks, Streaks, Trail, Fireworks, Weather } from './fx.js';
import { Notes, Rings } from './feedback.js';
import { haptics } from './haptics.js';
import { Look, applyLook } from './look.js';
import { Wreck } from './setpieces.js';
import { Land, oceanMaterial, Train, FerrisWheel, BeachWorld } from './beach.js';
import { HeartStage, Confetti, Vehicles, partyFrame } from './party.js';
import { TrailWorld, HomeFinale } from './trail.js';
import { CinemaWorld, ScreenFinale } from './cinema.js';
import { ColdWorld, DoorFinale } from './cold.js';
import { SundayWorld, TownLineFinale } from './sunday.js';
import { SummerWorld, LampFinale } from './summer.js';
import { HouseWorld, PortraitFinale } from './mansion.js';
import { FuneralWorld, WeddingFinale } from './funeral.js';
import { CrashWorld } from './crash.js';
import { ClubWorld, BusStopFinale } from './club.js';
import { SchoolWorld, CrownFinale } from './school.js';
import { CandyWorld, BoomboxFinale } from './candy.js';
import { CourtWorld, LipstickFinale } from './court.js';
import { ShopWorld, TillFinale } from './costume.js';
import { SmartWorld, TalkFinale } from './smarthome.js';
import { VenueWorld, KeyFinale } from './venue.js';
import { LaunchWorld, RocketFinale } from './launch.js';
import { HotelWorld, BoatFinale } from './hotel.js';
import { LibraryWorld, BookFinale } from './library.js';
import { IceWorld, ShipFinale } from './ice.js';
import { FamilyWorld, HouseFinale } from './family.js';
import { GuestWorld, JustDoorFinale } from './guest.js';
import { GlamWorld, VanityFinale } from './glam.js';
import { SelfieWorld, SetFinale } from './selfie.js';
import { FoundryWorld, FurnaceFinale } from './foundry.js';
import { EstateWorld, GlassHouseFinale } from './estate.js';
import { CmoWorld, CmoFinale } from './cmo-world.js';
import { NlgWorld, NlgFinale } from './nlg-world.js';
import { YstWorld, YstFinale } from './yst-world.js';
import { DamWorld, DamFinale } from './dam-world.js';
import { RpdWorld, RpdFinale } from './rpd-world.js';
import { YclWorld, YclFinale } from './ycl-world.js';
import { IrtWorld, IrtFinale } from './irt-world.js';
import { WxmWorld, WxmFinale } from './wxm-world.js';
import { ScsWorld, ScsFinale } from './scs-world.js';
import { HglWorld, HglFinale } from './hgl-world.js';
import { PtdWorld, PtdFinale } from './ptd-world.js';
import { ItdWorld, ItdFinale } from './itd-world.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { Screens } from './menu.js';
import { Gates } from './gates.js';
import { Rails } from './rails.js';
import { Lift } from './lift.js';
import { mountBoard, BOARDS } from './hoverboard.js';
import { SKATERS } from './skaters.js';
import { gradeOf } from './score.js';
import { progress, levelNeed } from './progress.js';
import { Kit } from './kit.js';
import { ALBUM, PALETTES } from './album.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const params = new URLSearchParams(location.search);

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(1);
const post = new Post(renderer);
const sound = new Sound();
const kit = new Kit(sound);
const input = new Input(canvas);
// a touchscreen: the words on screen say thumbs instead of keys and a pause button appears;
// a phone is one from the start, anything else the moment a finger touches it
if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
input.onTouch = () => document.body.classList.add('touch');
haptics.off = params.has('nobuzz');
const hud = new Hud();
const ui = new Screens();
ui.sfx = (kind, i) => sound.ui(kind, i);
const camera = new THREE.PerspectiveCamera(64, 1, 0.4, 9000);
const chase = new ChaseCam(camera);

let S = null;            // the current song session
let state = 'menu';      // menu | loading | title | ride | results
// (for the tools: the session once there is one, and the rest from the start)
window.__LC = { S: null, sound, input, autopilot: null, state: () => state, camera, renderer, chase, post, lastCpu: () => lastCpu };
let lastFrame = performance.now();
let paused = false;
const autopilot = { on: params.has('auto') };
window.__LC.autopilot = autopilot;

// render scale: ?scale= fixes it; otherwise it starts where it settled last time. A phone with a
// sharp screen starts a little above its CSS pixels (at 1 every thin thing shimmered three screen
// pixels wide). It steps down only when the graphics are what's slow: a phone short of processor
// time lost all its sharpness to the old rule and gained no speed from it.
const fixedScale = params.has('scale');
const topScale = 1;
let renderScale = fixedScale ? clamp(parseFloat(params.get('scale')), 0.4, 2) : (() => { try { const v = +localStorage.getItem('lc-scale2'); return v ? clamp(v, 0.7, topScale) : topScale; } catch (e) { return topScale; } })();
const perf = [], perfCpu = [];
// how far up the road the scenery is built (seconds), stepped down on a device that can't keep up
let detailAhead = (() => { try { const v = +localStorage.getItem('lc-ahead'); return v ? clamp(v, 26, 46) : 46; } catch (e) { return 46; } })();
// ?fps: a readout for checking a phone: frames a second, the worst frame lately, the render size
const fpsEl = params.has('fps') ? document.getElementById('hud').appendChild(Object.assign(document.createElement('div'), { id: 'fps' })) : null;
const fpsLog = { n: 0, t: 0, worst: 0, gpu: '' };
if (fpsEl) { try { const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); fpsLog.gpu = x ? String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)).slice(0, 44) : ''; } catch (e) { /* fine */ } }
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
    const buffer = await sound.song(entry.id, beats.duration, (p) => onProgress(0.05 + 0.7 * p));
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
function card(i) { const e = ALBUM[i]; const p = progress.song(e.id); return { id: e.id, num: i + 1, title: e.title, accent: e.accent || '#ff4f9a', image: `assets/menu/${e.id}.jpg`, best: p ? p.best : 0, grade: p ? p.grade : null, plays: p ? p.plays : 0 }; }
// the songs' previews in the list start from each one's first chorus (data/profiles.json)
let previewAt = null;
fetch('data/profiles.json').then((r) => r.json()).then((p) => { previewAt = p; }).catch(() => { /* from a third of the way in */ });
const PREVIEW = {
  preview(i) { const e = ALBUM[i]; const pr = previewAt && previewAt[e.id]; sound.preview(e.id, pr ? pr.preview : 40); },
  stopPreview() { sound.stopPreview(0.4); },
};
function openMenu(sel = menuSel) {
  if (S) { sound.stop(); sound.charge(false); sound.siren(0); sound.skid(0); }
  paused = false; ui.hidePause(); ui.hideEnd();
  state = 'menu'; haptics.live(false);
  document.body.classList.remove('fever'); if (S) S.feverOn = false;
  document.body.classList.remove('riding');
  hud.hideAll();
  ui.showMenu(ALBUM.map((_, i) => card(i)), sel, (i) => { menuSel = i; sound.resume(); chooseSong(i); }, ME, PREVIEW);
}
// the title: the film behind the name; the first key, click or tap wakes the sound and goes to the songs
function openIntro() {
  state = 'menu';
  hud.hideAll();
  ui.showIntro(() => { sound.resume(); sound.unlockPreviews(); openMenu(menuSel); });
}
async function chooseSong(i) {
  if (state === 'loading') return;
  sound.stopPreview(0.3);
  ui.hideEnd(); ui.hidePause();
  if (S) { sound.stop(); sound.charge(false); sound.siren(0); }
  ui.showLoading(card(i));
  try { await loadSong(i, (p) => ui.setLoading(p)); } catch (e) { console.error(e); }
  ui.hideLoading();
  state = 'title';
  showTitle();
}
// you, for the song list: your level, the bar to the next, your riders and boards; a new one
// costs a level's pick
const ME = {
  get() {
    const p = progress.get();
    return { level: p.level, xp: p.xp, need: levelNeed(p.level), xpFrac: p.xp / levelNeed(p.level), picks: p.picks, board: p.board, rider: p.rider,
      riders: SKATERS.map((r) => ({ id: r.id, name: r.name, color: r.color, kind: 'rider', owned: p.ridersOwned.includes(r.id), image: `assets/riders/${r.id}.jpg` })),
      boards: BOARDS.map((b) => ({ ...b, kind: 'board', owned: p.owned.includes(b.id), image: b.id === 'classic' ? null : `assets/boards/${b.id}.jpg` })) };
  },
  pick(kind, id) {
    const p = progress.get();
    const owned = kind === 'rider' ? p.ridersOwned : p.owned;
    if (owned.includes(id)) { progress.choose(kind, id); return 'chosen'; }
    if (p.picks > 0 && progress.unlock(kind, id)) return 'unlocked';
    return false;
  },
};
function pctOf(id) { try { return +localStorage.getItem('lc-pct-' + id) || 0; } catch (e) { return 0; } }

function bestOf(id) { try { return +localStorage.getItem('lc-best-' + id) || 0; } catch (e) { return 0; } }
function showTitle() {
  const p = progress.song(S.id);
  hud.showTitle(S.entry, { index: S.index, best: p ? p.best : 0, grade: p ? p.grade : null });
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
  town.ahead = detailAhead;
  const view = new RiderView(scene, P, SKATERS.find((s) => s.id === (params.get('rider') || progress.get().rider)));
  // her cheer at the end bounces on the song's beat (a quick song's in half time)
  { const bps = (S.chart.bpm || 120) / 60; view.tempo = bps > 2.25 ? bps / 2 : bps; }
  // the board she's chosen (?board= to try one)
  const hoverboard = mountBoard(view, scene, params.get('board') || progress.get().board);
  const notes = new Notes(scene, course, P, S.entry.collect);
  hud.setCollect(S.entry.collect);
  const rings = new Rings(scene);
  const sparks = new Sparks(scene, 2400);
  const streaks = new Streaks(scene, P);
  const trail = new Trail(scene, P);
  const fireworks = new Fireworks(scene, [P.jacket, P.edge, P.fret, P.window, 0xffffff]);
  const plan = S.entry.scenery || {};
  const Finale = { ferris: FerrisWheel, heart: HeartStage, home: HomeFinale, screen: ScreenFinale, door: DoorFinale, town: TownLineFinale, lamp: LampFinale, portrait: PortraitFinale, wedding: WeddingFinale, busstop: BusStopFinale, crown: CrownFinale, boombox: BoomboxFinale, lipstick: LipstickFinale, till: TillFinale, talk: TalkFinale, key: KeyFinale, rocket: RocketFinale, boat: BoatFinale, book: BookFinale, ship: ShipFinale, house: HouseFinale, justdoor: JustDoorFinale, vanity: VanityFinale, set: SetFinale, furnace: FurnaceFinale, glasshouse: GlassHouseFinale, cmo: CmoFinale, nlg: NlgFinale, yst: YstFinale, dam: DamFinale, rpd: RpdFinale, ycl: YclFinale, irt: IrtFinale, wxm: WxmFinale, scs: ScsFinale, hgl: HglFinale, ptd: PtdFinale, itd: ItdFinale }[plan.finale?.kind] || Wreck;
  const finale = plan.finale ? new Finale(scene, course, P, plan.finale, town) : null;
  const vehicles = plan.vehicles ? new Vehicles(scene, course, plan.vehicles) : null;
  const confetti = S.entry.confetti ? new Confetti(scene, S.entry.confettiColors || [P.heart ?? P.glow, P.edge, P.fret, 0xffffff, P.windowAlt, 0x5ff2ff], 1100, { normal: S.entry.confettiNormal }) : null;
  const trains = plan.trains ? new Train(course, plan.trains.x, plan.trains.passes) : null;
  town.track = track;
  const WORLDS = { crash: CrashWorld, beach: BeachWorld, trail: TrailWorld, cinema: CinemaWorld, cold: ColdWorld, sunday: SundayWorld, summer: SummerWorld, house: HouseWorld, funeral: FuneralWorld, club: ClubWorld, school: SchoolWorld, candy: CandyWorld, court: CourtWorld, shop: ShopWorld, smarthome: SmartWorld, venue: VenueWorld, launch: LaunchWorld, hotel: HotelWorld, library: LibraryWorld, ice: IceWorld, family: FamilyWorld, guest: GuestWorld, glam: GlamWorld, selfie: SelfieWorld, foundry: FoundryWorld, estate: EstateWorld, cmo: CmoWorld, nlg: NlgWorld, yst: YstWorld, dam: DamWorld, rpd: RpdWorld, ycl: YclWorld, irt: IrtWorld, wxm: WxmWorld, scs: ScsWorld, hgl: HglWorld, ptd: PtdWorld, itd: ItdWorld };
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
  kit.setSong(course.beats, course.beatEnergy, S.entry.kit || {});
  const gates = new Gates(scene, course, P, S.entry);
  const rails = new Rails(scene, course, P);
  const lift = new Lift(scene, course, P, S.entry);
  // the street-grid ground under a hillside sits a little lower, out of its way (they flickered where both were at 0)
  const groundY = land ? -0.4 : (scene.userData.hasTerrain ? -0.75 : 0);
  Object.assign(S, { world, groundY, sound, momentsDone: new Set(), land, trains, P, look, hemi, moonLight, fillLight, weather, scene, course, rider, track, sky, ground, skyline, town, view, notes, rings, sparks, streaks, trail, fireworks, finale, plan, vehicles, confetti, gates, rails, lift, hoverboard, hit: 0, pressGlow: 0, gems: 0, firedChorus: new Set(), pulse: 0, flash: 0, mixFlow: 0.42, muffle: 0, endT: null,
    heartBeat: 0, heartLast: -1, heartDir: null, spikes: [], burstAt: new Set(), afterBeatT: 0, black: null, pyro: 0,
    countIn: null, went: false, crossed: false, resume: null, wdT: null, wdAt: 0, anchorAt: 0,
    // (the end of the last ride, forgotten: the same song ridden again starts its ending afresh)
    ec: null, stopK: 0, outroK: 0, orbitA: undefined, cheer: 0 });
  applyLook(S, look.at(0));
  // the count-in: the four beats of the song's own grid before it starts. She waits on the
  // title a little before the start line and rolls up to it on them.
  // A quick song counts two bars, "one ... two ... one two three four"; a slower one, one bar.
  const cb = course.beats; let k0 = 0; while (k0 < cb.length && cb[k0] < -0.02) k0++;
  const fast = (S.chart.bpm || 120) >= 140, nb = fast ? 8 : 4;
  const inBeats = []; for (let j = nb; j >= 1; j--) if (k0 - j >= 0 && cb[k0 - j] > course.t0 + 0.35) inBeats.push(cb[k0 - j]);
  S.sticks = fast && inBeats.length === 8 ? [0, 2, 4, 5, 6, 7].map((i) => inBeats[i]) : inBeats;
  S.stickAccent = fast && inBeats.length === 8 ? [true, false, true, false, false, false] : inBeats.map((_, i) => i === 0);
  S.lampAt = fast && inBeats.length === 8 ? [inBeats[0], inBeats[2], inBeats[4], inBeats[6]] : inBeats;
  S.startFrom = (inBeats[0] ?? -1.4) - 0.3;
  const tq = parseFloat(params.get('t') || '0');
  rider.reset(tq > 0 ? tq : S.startFrom, 22);
  chase.first = true;
  chase.lift0 = S.entry.camLift || 0;
  chase.titleView = S.entry.titleView || null;
  track.update(rider);
  window.__LC.S = S;

}

// build the ride and wait until everything it will draw is loaded and compiled
async function prepare(S) {
  build(S);
  S.par = parScore(S.course);
  S.rider.reset(S.rider.t, S.rider.v);
  await Promise.all([S.view.ready, S.finale && S.finale.ready].filter(Boolean));
  await precompile(S);
  // a layer a place first wants mid-ride compiles in the background, hidden until it's ready,
  // instead of the ride stopping while it compiles (it shows a moment late, far up the road)
  if (S.town && renderer.compileAsync) S.town.onLate = (mesh, layer) => {
    singlePass(mesh);
    mesh.visible = false;
    if (layer) layer.wait = true;
    const show = () => { if (layer) layer.wait = false; mesh.visible = true; };
    renderer.compileAsync(mesh, camera, S.scene).then(show, show);
  };
}

// three.js draws a see-through two-sided thing twice a frame, back faces then front, switching its
// shader (and working out which one) both times. For a flat thing, or one that adds light (where
// the order doesn't matter), drawing it once makes the same picture.
function singlePass(root) {
  const ok = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || !m.transparent || m.side !== THREE.DoubleSide || m.forceSinglePass) continue;
      ok.set(m, (ok.get(m) ?? true) && (m.blending === THREE.AdditiveBlending || flatGeometry(o.geometry)));
    }
  });
  for (const [m, f] of ok) if (f) m.forceSinglePass = true;
}

// every point of it in one plane (however that plane is turned)
function flatGeometry(g) {
  if (!g || !g.attributes.position) return false;
  if (g._lcFlat !== undefined) return g._lcFlat;
  const P = g.attributes.position, n = P.count;
  let flat = false;
  if (n >= 3) {
    // a normal from the first three points that aren't in a line, and every point's distance off it
    const a = new THREE.Vector3().fromBufferAttribute(P, 0), b = new THREE.Vector3(), c = new THREE.Vector3(), nrm = new THREE.Vector3(), v = new THREE.Vector3();
    if (!g.boundingSphere) g.computeBoundingSphere();
    const tol = Math.max(1e-6, g.boundingSphere.radius * 1e-4);
    for (let i = 1; i < Math.min(n, 200) && nrm.lengthSq() === 0; i++) {
      b.fromBufferAttribute(P, i).sub(a);
      for (let j = i + 1; j < Math.min(n, i + 200); j++) { c.fromBufferAttribute(P, j).sub(a); nrm.crossVectors(b, c); if (nrm.lengthSq() > tol * tol * 1e-2) break; nrm.set(0, 0, 0); }
    }
    if (nrm.lengthSq() > 0) {
      nrm.normalize(); flat = true;
      for (let i = 0; i < n; i++) if (Math.abs(v.fromBufferAttribute(P, i).sub(a).dot(nrm)) > tol) { flat = false; break; }
    }
  }
  return (g._lcFlat = flat);
}

// compile every shader now, hidden things included, so nothing compiles mid-ride
async function precompile(S) {
  singlePass(S.scene);
  const hidden = [], culled = [], empty = [];
  S.scene.traverse((o) => {
    if (!o.visible) { hidden.push(o); o.visible = true; }
    if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; }
    if (o.isInstancedMesh && o.count === 0) { empty.push(o); o.count = 1; }
  });
  try { if (renderer.compileAsync) await renderer.compileAsync(S.scene, camera); else renderer.compile(S.scene, camera); } catch (e) { /* compile is a hint */ }
  // and draw it all once, under the loading card: on Windows a shader's first real draw still
  // stalls (the rings on the first pump, a bus coming into view, the snow starting)
  try { post.render(S.scene, camera); } catch (e) { /* a warm-up only */ }
  for (const o of hidden) o.visible = false;
  for (const o of culled) o.frustumCulled = true;
  for (const o of empty) o.count = 0;
}

function startRide() {
  if (state !== 'title') return;
  state = 'ride';
  document.body.classList.add('riding');
  sound.resume();
  const t0 = S.startAt || 0;
  if (t0 > 0) {
    S.rider.reset(t0, 38);
    sound.play(S.buffer, t0);
    S.countIn = null; S.went = true;
  } else {
    // count her in: sticks on the four beats before the song, the gate's lamps one a beat,
    // and the music comes in as she crosses the line
    S.rider.reset(S.startFrom, 22);
    sound.play(S.buffer, S.startFrom);
    S.countIn = { lamps: S.lampAt.slice() };
    S.sticks.forEach((b, i) => kit.stick(sound.t0 + b, S.stickAccent[i]));
    S.went = false;
  }
  S.crossed = false; S.wdT = null; S.resume = null;
  S.thumbCrest = 0; S.purrTo = null;   // (the hold zones in your hand start over too)
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
document.getElementById('pausebtn').addEventListener('click', () => { if (state === 'ride') togglePause(); });
// Groovy's own button on a touchscreen (its keys are in input.js)
document.getElementById('groovy').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (state === 'ride' && !paused) input.groovyAsk = true; });
// the start line's small print: "all songs" takes you back (on a touchscreen, those two words)
document.querySelector('#title .back').addEventListener('click', (e) => {
  if (state !== 'title') return;
  if (document.body.classList.contains('touch') && !e.target.closest('.go')) return;
  openMenu(S ? S.index : menuSel);
});
// a phone browser only lets sound start from a finger lifting: wake the audio on any tap
window.addEventListener('pointerup', (e) => {
  if (!paused && sound.ctx.state === 'suspended') sound.resume();
  // and on a touchscreen the first lift of a thumb on the ride takes the whole screen, where the browser allows it (Android; iPhones don't)
  if (e.pointerType === 'touch' && state === 'ride' && document.fullscreenEnabled && !document.fullscreenElement && !params.has('nofs')) document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => { /* fine */ });
}, { passive: true });
// Pausing stops the song where she is and puts the audio to sleep. Leaving the tab, the
// window, or the audio going away on its own all pause. Resuming waits for the audio to
// really run, starts the song again a couple of beats back with sticks on them, and she
// goes on exactly where she was. If the audio won't come back the card stays up.
// (the autopilot rides on regardless: it's how the headless tools watch a ride)
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'ride' && !paused && !autopilot.on) togglePause(); });
window.addEventListener('blur', () => { if (state === 'ride' && !paused && !autopilot.on) togglePause(); });
sound.ctx.addEventListener('statechange', () => { if (state === 'ride' && !paused && !S?.resume && sound.ctx.state !== 'running' && S?.went !== undefined && !autopilot.on) togglePause(); });
function pauseButtons() {
  return [
    { label: 'Resume', key: 'esc', code: 'Escape', go: () => togglePause() },
    { label: 'Start over', key: 'R', code: 'KeyR', go: () => { paused = false; ui.hidePause(); rideAgain(); } },
    { label: 'All songs', key: 'M', code: 'KeyM', go: () => { paused = false; ui.hidePause(); openMenu(S.index); } },
  ];
}
function togglePause() {
  if (state !== 'ride' || !S) return;
  if (!paused) {
    paused = true;
    S.resume = null;
    sound.pause(S.rider.t);
    sound.charge(false); sound.skid(0); sound.siren(0);
    ui.showPause(pauseButtons());
  } else {
    paused = false;
    ui.hidePause();
    resumeRide();
  }
  document.body.classList.toggle('riding', !paused && state === 'ride');
}
async function resumeRide() {
  const r = S.rider, c = S.course, t = r.t;
  // the lead: the beats just before where she stopped, a second or so of them
  const bi = Math.floor(c.beatAt(t));
  let n = 2; while (n < 4 && t - c.timeOfBeat(bi - n + 1) < 0.95) n++;
  const sticks = []; for (let k = bi - n + 1; k <= bi; k++) sticks.push(c.timeOfBeat(k));
  const from = sticks[0] - 0.12;
  S.resume = { t, from, sticks, n: 0 };
  const ok = await sound.wake();
  if (paused || state !== 'ride' || !S.resume) return;
  if (!ok) { S.resume = null; paused = true; sound.pause(t); ui.showPause(pauseButtons()); document.body.classList.remove('riding'); return; }
  sound.play(S.buffer, from, 0.3);
  sticks.forEach((b, i) => kit.stick(sound.t0 + b, i === 0));
  S.resume.playing = true;
  S.wdT = null;
}
function rideAgain() {
  ui.hideEnd(); ui.hidePause(); paused = false;
  sound.skid(0);
  state = 'loading'; sound.stop(); sound.charge(false); sound.siren(0);
  hud.hideAll();
  ui.showLoading(card(S.index)); ui.setLoading(0.85);
  prepare(S).then(() => { ui.hideLoading(); state = 'title'; showTitle(); startRide(); });
}

// ---------- the autopilot: rides like someone who knows the song ----------
function autoInput(S) {
  const r = S.rider, c = S.course;
  return { press: autoPress(r, c), steer: autoSteer(r, c), groovy: autoGroovy(r) };
}

// ---------- frame ----------
let lastCpu = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const cpu0 = performance.now();
  try { frameBody(now); } finally { lastCpu = (performance.now() - cpu0) / 1000; }
}
function frameBody(now) {
  const rawDt = (now - lastFrame) / 1000;
  const dt = Math.min(0.05, rawDt);
  lastFrame = now;
  if (fpsEl) {
    fpsLog.n++; fpsLog.t += rawDt; if (rawDt > fpsLog.worst) fpsLog.worst = rawDt;
    if (fpsLog.t >= 0.5) {
      fpsEl.textContent = `${Math.round(fpsLog.n / fpsLog.t)} fps · worst ${Math.round(fpsLog.worst * 1000)} ms · ${post.W}×${post.H} ×${renderScale} · dpr ${(window.devicePixelRatio || 1).toFixed(1)}${fpsLog.gpu ? ' · ' + fpsLog.gpu : ''}`;
      fpsLog.n = 0; fpsLog.t = 0; fpsLog.worst = 0;
    }
  }
  if (state === 'ride' && !paused && document.hasFocus()) {
    perf.push(rawDt); perfCpu.push(lastCpu);
    if (perf.length >= 240) {
      perf.sort((a, b) => a - b); perfCpu.sort((a, b) => a - b);
      const med = perf[120], cpu = perfCpu[120]; perf.length = 0; perfCpu.length = 0;
      // the frame's own work alone leaves no room for 60 a second: build less of the road ahead
      if (cpu > 0.011 && S && S.town && S.town.ahead > 26) {
        S.town.ahead = detailAhead = Math.max(26, S.town.ahead - 10);
        try { localStorage.setItem('lc-ahead', detailAhead); } catch (e) { /* private mode */ }
      }
      // slow, and the frame's own work is well under the time between frames: the GPU is behind
      if (!fixedScale && med > 0.0195 && cpu < med * 0.55 && renderScale > 0.71) {
        renderScale = Math.max(0.7, Math.round((renderScale - 0.15) * 100) / 100);
        resize();
        try { localStorage.setItem('lc-scale2', renderScale); } catch (e) { /* private mode */ }
      }
    }
  }
  if (!S || state === 'loading' || state === 'menu') return;
  const { rider, course, track, view, P } = S;
  const time = now / 1000;
  hud.thumb(state === 'ride' && !paused ? input.thumb : null);

  if (state === 'ride' && !paused) {
    const songT = sound.time(now);
    watchClock(S, songT);
    const inp = autopilot.on ? autoInput(S) : { press: input.press, steer: input.steer(dt) };
    const askedGroovy = input.takeGroovy();
    if (!autopilot.on) {
      inp.groovy = askedGroovy;
      // (songT is the song at this frame's timestamp: count back from that to the press)
      inp.pressAt = songT - Math.max(0, now - input.downAt) / 1000;
      inp.releaseAt = songT - Math.max(0, now - input.upAt) / 1000;
    }
    // back from a pause: she holds where she was until the song comes round to her
    if (S.resume && S.resume.playing && songT >= S.resume.t) S.resume = null;
    // the music's over: the stop (song time slows with her from here)
    if (!rider.stopping && songT > course.duration + 0.05 && rider.grounded) beginStop(S);
    if (rider.stopping) stopFrame(S, dt);
    else rider.advance(Math.max(rider.t, songT), inp);
    startAndFinish(S, songT);
    handleEvents(S, dt);
    beatInThumb(S);
    if (songT > course.duration + 3.0 && state === 'ride') endSong();
  }
  haptics.live(state === 'ride' && !paused);
  if (state === 'title') {
    // idle on the start line, breathing with nothing yet
    S.pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
  }

  // beat pulse from the song clock
  const bpos = course.beatAt(rider.t);
  const bf = bpos - Math.floor(bpos);
  const beatPulse = state === 'ride' ? Math.exp(-bf * 6) : 0;
  S.flash *= Math.exp(-dt * 5);
  // the arcade: a hit's surge, a broken run's drain, the colour flick; and the multiplier the world
  // is lit by (rising fast, sinking slower), at x4 the fever
  S.burst = (S.burst || 0) * Math.exp(-dt * 3.5);
  S.drain = (S.drain || 0) * Math.exp(-dt * 2.6);
  S.aberrK = (S.aberrK || 0) * Math.exp(-dt * 9);
  const multNow = state === 'ride' ? rider.score.mult : 1, tierT = (multNow - 1) / 3;
  S.tier = (S.tier || 0) + (tierT - (S.tier || 0)) * Math.min(1, dt * (tierT > (S.tier || 0) ? 6 : 2.5));
  S.feverK = (S.feverK || 0) + ((multNow >= 4 ? 1 : 0) - (S.feverK || 0)) * Math.min(1, dt * 4);
  if ((multNow >= 4) !== !!S.feverOn) { S.feverOn = multNow >= 4; document.body.classList.toggle('fever', S.feverOn); }
  // Groovy: how far into the trip the picture is (in fast, out slow), its chime once when it's ready,
  // the phaser over the song, and the song pumping on every beat as if sidechained to its kick
  const gOn = state === 'ride' && rider.groovyOn;
  S.groovyK = (S.groovyK || 0) + ((gOn ? 1 : 0) - (S.groovyK || 0)) * Math.min(1, dt * (gOn ? 5 : 1.3));
  if (S.groovyK < 0.002 && !gOn) S.groovyK = 0;
  const gReady = state === 'ride' && !paused && rider.groovyReady;
  if (gReady && !S.groovyWas) { sound.groovyReady(); haptics.buzz([12, 50, 12], 2); }
  S.groovyWas = gReady;
  const bi0 = Math.floor(bpos), spb = Math.max(0.2, course.timeOfBeat(bi0 + 1) - course.timeOfBeat(bi0));
  sound.groovy(paused ? 0 : S.groovyK, spb);
  if (gOn && !paused && sound.src) {
    const nb = bi0 + 1;
    if (nb !== S.pumpBeat && course.timeOfBeat(nb) - rider.t < 0.12) { S.pumpBeat = nb; sound.pump(sound.t0 + course.timeOfBeat(nb), 0.2, spb); }
  }
  // the chorus lift: its first beat hits, and the whole thing opens up while it lasts
  if (S.lift.update(S, dt, beatPulse, state === 'ride' && !paused)) {
    const ec = new THREE.Color(S.entry.lift?.flash ?? P.edge);
    S.flash = Math.max(S.flash, 0.32 * (S.entry.lift?.flashK ?? 1)); post.comp.uniforms.uFlashColor.value.copy(ec).lerp(new THREE.Color(1, 1, 1), 0.45); S.flashTint = 0.9;
    S.rings.fire(ec.clone().multiplyScalar(2.4), 9, 0.7, 0.04);
    S.rings.fire(new THREE.Color(1, 1, 1).multiplyScalar(1.6), 5, 0.5, 0.06, 0.08);
    chase.impulse(0.35, 0.25, 1.6);
    const bp = track.at(rider.t, rider.x, 0.6);
    S.sparks.emit(bp, new THREE.Vector3(0, 3, 0), ec.clone().multiplyScalar(3), 90, { spread: 11, life: 0.9, size: 0.26, grav: 4, up: 1.4 });
  }
  const LK = S.lift.k, LB = S.lift.beat, LD = S.lift.drop;
  chase.liftFov = 7 * LK + 6 * LD;

  track.update(rider);
  const songNow = state === 'ride' && !paused ? Math.max(rider.t, sound.time(now)) : rider.t;
  S.gates.update(track, rider, dt, beatPulse, time);
  // on a rail and holding down: the rail lights in the hold colour, the grind screeches higher
  const railHold = state === 'ride' && !paused && rider.rail && rider.press ? 1 : 0;
  S.rails.update(track, rider, beatPulse, railHold, S.track.mat.uniforms.uHoldCol.value, dt);
  if (railHold !== (S.railHold || 0)) { S.railHold = railHold; sound.grindPress(railHold); }
  if (railHold) grindShower(S, dt);
  if (rider.rail && state === 'ride' && Math.random() < dt * 30) {
    const p = track.at(rider.t, rider.x, rider.rail.h + 0.05, S._rp || (S._rp = new THREE.Vector3()));
    S.sparks.emit(p, track.dirAt(rider.t, S._rd || (S._rd = new THREE.Vector3())).multiplyScalar(-rider.v * 0.3), RAIL_SPARK, 3, { spread: 2.5, life: 0.4, size: 0.12, grav: 12, up: 0.8 });
  }
  if (S.pyro > 0) pyroFrame(S, dt);
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
  // the lift pulls the fog back: you see further while it lasts
  const fogD = P.fogDensity * (1 - (S.entry.lift?.fog ?? 0.32) * LK);
  S.town.setFog(P.fog, fogD, camera.position);
  S.track.mat.uniforms.uFogDensity.value = fogD;
  if (!S.land && S.ground.material.uniforms.uFogDensity) S.ground.material.uniforms.uFogDensity.value = fogD;
  S.notes.update(track, rider, time, view.board, camera, beatPulse, S.groovyK || 0);
  S.rings.update(track, rider, dt);
  // holding down a hill: the zone lights up under you and a soft rush rises
  const hs = course.sample(rider.t);
  const holding = state === 'ride' && rider.press && hs.hold >= 0;
  S.pressGlow += ((holding ? 1 : 0) - S.pressGlow) * Math.min(1, dt * (holding ? 14 : 8));
  sound.charge(holding && !paused, Math.max(0, hs.hold));
  if (holding && !paused && (rider.grounded || rider.rail)) holdSpray(S, dt, hs.hold);
  S.hit *= Math.exp(-dt * 5);
  view.update(track, rider, dt, beatPulse);
  view.setTint(rider.flow);
  // (a hit flares the board's engine: S.burst)
  if (S.hoverboard) { S.trail.mesh.visible = false; S.hoverboard.update(dt, { speed: state === 'ride' || state === 'results' ? rider.v : 0, beat: beatPulse, boost: clamp(rider.flow * (state === 'ride' ? 1 : 0.3) + 0.8 * S.burst, 0, 1), airborne: !rider.grounded }); }
  // (faint while she's turning a trick: the tail going round in circles drew knots in the air)
  else S.trail.push(view.board, state === 'ride' ? clamp(0.15 + 0.85 * rider.flow + 0.6 * S.burst, 0, 1) * clamp((rider.v - 15) / 30, 0.2, 1) * (view.trick ? 0.12 : 1) : 0);
  S.titleK = state === 'title' ? 1 : Math.max(0, (S.titleK || 0) - dt * 1.4);
  if (state === 'results' && S.finale) { S.outroK = Math.min(1, (S.outroK || 0) + dt / 2.2); S.orbitA = (S.orbitA ?? 2.2) + dt * 0.16; }
  const fo = (S.plan.finale && S.plan.finale.orbit) || {};
  let orbitAngle = S.orbitA;
  if (fo.facing && S.finale && S.outroK) {
    // not round and round: in front of the place, swinging a little, from the road's side
    const fp = S.finale.group.position, c0 = track.ground(S.finale.t - (fo.back ?? 2), 0, S._oc || (S._oc = new THREE.Vector3()));
    orbitAngle = Math.atan2(c0.z - fp.z, c0.x - fp.x) + (fo.swing ?? 0.45) * Math.sin((S.orbitA - 2.2) * 0.9);
  }
  let orbit = S.finale && S.outroK ? { center: S.finale.group.position.clone().add(new THREE.Vector3(0, fo.y ?? 1.2, 0)), k: S.outroK, angle: orbitAngle, r: fo.r, h: fo.h } : null;
  // the end card sits on the left: look a little left of the place so it stands to the right of it
  if (orbit && fo.right) orbit.look = orbit.center.clone().add(new THREE.Vector3(-Math.sin(orbitAngle), 0, Math.cos(orbitAngle)).multiplyScalar(fo.right * (fo.r ?? 14)));
  // unless a song says otherwise, the end is a shot of her: behind and off her shoulder, her
  // arms up on the right of the frame and the place she rode to filling it past her
  if (orbit && fo.hero !== false) orbit = heroShot(S, fo, orbit);
  if (state === 'results' && rider.stopping) stopFrame(S, dt);
  // the end of the song: the camera goes round her (endCam), not along the road
  if (S.ec && (rider.stopping || state === 'results')) orbit = endCam(S, orbit);
  const tk = S.titleK * S.titleK * (3 - 2 * S.titleK);
  // her key light: behind her while riding (the side the chase camera sees), round to the
  // camera's side for the title and for the end, so she isn't a silhouette in either
  const ek = orbit && S.ec ? S.ec.k : 0;
  view.key.position.set(0.9 - 4.2 * tk, 2.7 - 0.3 * tk, -2.4 + 3.4 * tk);
  if (ek > 0) view.key.position.lerp(S._ekp.set(Math.sin(S.ec.a) * 2.6, 2.5, -Math.cos(S.ec.a) * 2.6), ek);
  view.titleK = tk;
  view.key.intensity = 9 + 5 * Math.max(tk, ek);
  chase.titleView = S.entry.titleView || null;
  chase.update(track, rider, dt, tk, orbit);

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
  // (fainter on a phone, where a one-pixel line is three of the screen's)
  S.streaks.update(camera, vel, rider.v, (state === 'ride' ? clamp((rider.v - 22) / 50, 0, 1) * (0.5 + 0.5 * S.mixFlow) + 0.45 * LK + 0.5 * S.burst : 0) * (document.body.classList.contains('touch') ? 0.5 : 1));
  if (state === 'ride' && rider.grounded && rider.flow > 0.55 && Math.random() < dt * 40 * rider.flow) {
    const p = track.at(rider.t, rider.x + (Math.random() - 0.5) * 0.8, 0.15, S._fp || (S._fp = new THREE.Vector3()));
    S.sparks.emit(p, (S._fv || (S._fv = new THREE.Vector3())).copy(vel).multiplyScalar(0.55), (S._fc || (S._fc = new THREE.Color())).set(P.edge).multiplyScalar(1.2), 1, { spread: 0.8, life: 0.5, size: 0.12, grav: 0, drag: 0.6 });
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
  S.ground.position.set(cu.x, S.groundY, cu.z);
  if (S.land) { const ou = S.ground.material.uniforms; ou.uTime.value = time; ou.uHorizon.value.set(S.P.horizon); ou.uZenith.value.set(S.P.zenith); ou.uSun.value.set(S.P.moon); if (S.P.moonDir) ou.uSunDir.value.set(...S.P.moonDir).normalize(); ou.uGround.value.set(S.P.water ?? 0x0d1a2a); ou.uRain.value = S.P.rain ?? 0; ou.uFog.value.set(S.P.fog); ou.uFogDensity.value = S.P.fogDensity; }
  const pc = post.comp.uniforms;
  pc.uTime.value = time;
  pc.uSpeed.value = state === 'ride' ? clamp((rider.v - 25) / 55, 0, 1) : 0;
  pc.uAberr.value = 0.15 + 0.5 * pc.uSpeed.value + 1.6 * S.aberrK + (S.groovyK || 0) * (0.5 + 1.3 * beatPulse);
  pc.uSat.value = 0.9 + 0.4 * S.mixFlow + 0.16 * LK + 0.24 * S.tier;
  pc.uVig.value = 0.55 - 0.18 * LK;
  S.hurt = (S.hurt || 0) * Math.exp(-dt * 0.9);
  pc.uDesat.value = Math.max(rider.wipe > 0 ? 0.5 : 0, 0.55 * S.hurt, 0.6 * S.drain);
  pc.uFever.value = Math.max(S.feverK, S.groovyK || 0) * (0.5 + 0.5 * beatPulse);
  pc.uGroovy.value = S.groovyK || 0;
  pc.uGBeat.value = bf; pc.uGBeatN.value = bi0 % 64;
  pc.uGBar.value = (((bpos - (course.barPhase || 0)) / 4) % 1 + 1) % 1;
  S.flashTint = (S.flashTint || 0) * Math.exp(-dt * 3);
  if (S.flashTint < 0.02) pc.uFlashColor.value.setRGB(1, 0.6, 0.85);
  pc.uFlash.value = S.flash;
  // the room losing focus (a song's looks can say how far), and lost time: everything gone dark
  pc.uDaze.value = state === 'ride' || state === 'results' ? (S.P.daze ?? 0) : 0;
  let black = 0;
  if (S.black) { const u = (rider.t - S.black.t0) / S.black.dur; black = u < 0 || u > 1 ? 0 : S.black.k * Math.min(1, u * 12, (1 - u) * 5); }
  pc.uExposure.value = (1 - black) * (1 + 0.04 * LB + 0.03 * LK);
  pc.uBloom.value = 0.55 + 0.3 * S.mixFlow + 0.18 * LK + 0.22 * LD + 0.18 * S.tier + 0.22 * (S.groovyK || 0);
  post.render(S.scene, camera);
  if (state === 'ride') {
    hud.count(S.resume && !paused ? S.resume.sticks.filter((b) => b > sound.time(now) + 0.01).length : 0);
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
      case 'groovy': if (state === 'ride') groovyGo(S); break;
      case 'groovyEnd': if (state === 'ride' && !rider.stopping) { sound.groovyEnd(); haptics.buzz([16], 2); } break;
      case 'scrape': {
        sound.scrape(e.amount);
        const p = track.at(rider.t, rider.x + (Math.random() - 0.5) * 0.6, 0.12);
        const back = track.dirAt(rider.t, new THREE.Vector3()).multiplyScalar(-rider.v * 0.25);
        sparks.emit(p, back, new THREE.Color(1.0, 0.62, 0.3).multiplyScalar(2.2), 6, { spread: 3, life: 0.35, size: 0.1, grav: 9, up: 0.6 });
        break;
      }
      case 'takeoff': {
        sound.whoosh(0.6 + clamp(e.vy / 10, 0, 0.6)); chase.impulse(0, 0, 0.4);
        // on a run, she does something with the air (the physics picked it: rider.js)
        if (e.trick && state === 'ride') view.startTrick(e.trick.kind, e.trick.dur, e.trick.turns, e.trick.combo);
        if (e.why === 'gap') { S.flash = Math.max(S.flash, 0.12); chase.impulse(0.2, 0, 1.2); }
        break;
      }
      case 'trick': {
        if (!e.landed) { view.bail = 1; break; }
        // a trick landed clean: a flash of gold and a cymbal on the next eighth
        const gold = new THREE.Color(1, 0.85, 0.45);
        S.rings.fire(gold.clone().multiplyScalar(1.8), 4.5, 0.48, 0.05);
        sparks.emit(track.at(rider.t, rider.x, 0.4), new THREE.Vector3(0, 3, 0), gold.multiplyScalar(3), 40, { spread: 8, life: 0.7, size: 0.2, grav: 4, up: 1.5 });
        kit.trick(e.t, e.kind === 'flip' || e.combo ? 1 : 0.6); S.flash = Math.max(S.flash, 0.1);
        hud.points(e.points, view.root, camera, trickName(e));
        haptics.buzz([8, 26, 8, 26, 14], 2);
        break;
      }
      case 'gap': {
        // over the hole and down on the far side
        S.rings.fire(new THREE.Color(S.P.edge).multiplyScalar(2.2), 7, 0.6, 0.05);
        S.flash = Math.max(S.flash, 0.16);
        hud.points(e.points, view.root, camera, 'GAP');
        haptics.buzz([10, 40, 24], 2);
        break;
      }
      case 'grindStart': {
        sound.grind(true); S.grindK = 1;
        sparks.emit(track.at(rider.t, rider.x, e.rail.h), new THREE.Vector3(0, 2, 0), new THREE.Color(1, 0.8, 0.5).multiplyScalar(3), 30, { spread: 5, life: 0.5, size: 0.16, grav: 9 });
        break;
      }
      case 'grind': {
        kit.grind(S.course.timeOfBeat(e.beat));
        const p = track.at(rider.t, rider.x, (rider.rail ? rider.rail.h : 0.5));
        sparks.emit(p, track.dirAt(rider.t, new THREE.Vector3()).multiplyScalar(-6), new THREE.Color(S.P.edge).multiplyScalar(3), 22, { spread: 3, life: 0.45, size: 0.14, grav: 10 });
        haptics.buzz([5], 1);   // the rail, a beat at a time
        break;
      }
      case 'grindEnd': {
        sound.grind(false);
        if (e.onBeat) { kit.pop(e.t); S.rings.fire(new THREE.Color(S.P.edge).multiplyScalar(1.8), 4, 0.42, 0.06); hud.points(e.points, view.root, camera, 'POP'); haptics.buzz([18], 2); }
        break;
      }
      case 'railTrick': {
        // a pump let go on the beat on a rail: she hops and the board goes round under her feet,
        // a ring and a burst of the hold colour off the rail
        view.railTrick(e.kind);
        kit.trick(e.t, e.grade === 'perfect' ? 0.8 : 0.5);
        const hc = S.track.mat.uniforms.uHoldCol.value;
        const rp = track.at(rider.t, rider.x, (rider.rail ? rider.rail.h : 0.5) + 0.1);
        sparks.emit(rp, new THREE.Vector3(0, 3.5, 0), hc.clone().multiplyScalar(3.2), e.grade === 'perfect' ? 70 : 44, { spread: 8, life: 0.6, size: 0.15, grav: 9, up: 1.4 });
        sparks.emit(rp, new THREE.Vector3(0, 2, 0), new THREE.Color(1, 1, 1).multiplyScalar(2.6), 20, { spread: 5, life: 0.35, size: 0.1, grav: 12 });
        S.rings.fire(hc.clone().multiplyScalar(2.2), e.grade === 'perfect' ? 5.5 : 4, 0.45, 0.05);
        chase.impulse(0.25, 0.2, 0.6);
        hud.points(e.points, view.root, camera, e.kind === 'kickflip' ? 'KICKFLIP' : 'SHOVE-IT', true);
        haptics.buzz([12, 30, 12], 3);
        break;
      }
      case 'land': {
        if (e.hard > 0.05) sound.land(e.quality, e.hard);
        else kit.land(e.t, e.quality);
        // a thump as hard as the landing, a light tap for a clean one
        if (e.hard > 0.05) haptics.buzz([Math.round(20 + 50 * e.hard)], 3);
        else if (e.quality > 0 && e.air > 0.25) haptics.buzz([Math.round(8 + 10 * e.quality)], 2);
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
        haptics.buzz([90, 40, 140], 5);
        break;
      case 'note': {
        kit.pickup(e.at, rider.score.mult, e.bar);
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

// what a trick is called on the screen as it lands
function trickName(e) {
  if (e.kind === 'spin') return (e.turns >= 2 ? '720' : '360') + (e.combo ? ' GRAB' : '');
  if (e.kind === 'flip') return e.combo ? 'CORKSCREW' : 'FLIP';
  if (e.kind === 'roll') return 'ROLL';
  return 'GRAB';
}

// The song clock has to keep moving under her. If it stalls while the audio says it's running,
// start the song again from where she is; if the audio has gone, pause, which shows the way
// back in. If it jumps (a stale reading, a device change), put the music back where she is
// rather than throwing her forward or holding her still.
function watchClock(S, songT) {
  const r = S.rider, now = performance.now();
  if (S.resume || r.stopping || songT > S.course.duration - 0.2) { S.wdT = null; return; }
  if (S.wdT === null || songT > S.wdT + 1e-4) { S.wdT = songT; S.wdAt = now; }
  else if (now - S.wdAt > 900) {
    S.wdAt = now;
    if (!sound.running && !autopilot.on) { togglePause(); return; }
    sound.play(S.buffer, r.t); S.anchorAt = now; return;
  }
  if ((songT > r.t + 1.0 || songT < r.t - 0.75) && now - S.anchorAt > 2000 && r.t > 0) { S.anchorAt = now; sound.play(S.buffer, r.t); }
}

// the count-in lamps, the music coming in as she crosses the start line, and the finish going off
function startAndFinish(S, songT) {
  const { rider, gates } = S;
  if (S.countIn) {
    let n = 0; for (const b of S.countIn.lamps) if (songT >= b - 0.01) n++;
    gates.setCount(n);
  }
  if (!S.went && songT >= 0) {
    S.went = true; S.countIn = null; gates.go();
    burstAt(S, gates.tops('start'), new THREE.Color(1, 1, 1), 1);
    S.pyro = 1.4; S.pyroAt = gates.tops('start'); S.pyroCol = new THREE.Color(1, 0.9, 0.7);
    S.rings.fire(new THREE.Color(S.P.edge).multiplyScalar(2), 6.5, 0.6, 0.05);
    S.flash = Math.max(S.flash, 0.22); chase.impulse(0.2, 0.2, 0.9);
  }
  if (!S.crossed && rider.t >= S.course.duration) {
    S.crossed = true; gates.cross();
    burstAt(S, gates.tops('finish'), new THREE.Color(1, 0.82, 0.45), 1.4);
    S.pyro = 2.2; S.pyroAt = gates.tops('finish'); S.pyroCol = new THREE.Color(1, 0.78, 0.4);
    const T = S.track;
    for (let i = 0; i < 6; i++) { const side = i % 2 ? 1 : -1; const from = T.ground(rider.t + 3 + i * 0.3, side * (22 + i * 4), new THREE.Vector3()); const to = from.clone(); to.y = 34 + Math.random() * 24; setTimeout(() => S.fireworks.launch(from, to, 1.0), i * 120); }
    S.flash = Math.max(S.flash, 0.3); chase.impulse(0.3, 0.2, 1);
  }
}
// holding down through a zone: spray off both edges of the board in the zone's colour, like snow
// off a carving board, thicker toward the bottom. Pressing where it doesn't pay throws the orange
// scrape sparks instead (handleEvents), so the two read apart.
function holdSpray(S, dt, hp) {
  const { rider, track, sparks } = S;
  const v = Math.max(rider.v, 12);
  S.sprayAcc = (S.sprayAcc || 0) + dt * (220 + 320 * hp) * Math.min(1, v / 30);
  const n = Math.floor(S.sprayAcc);
  if (n < 1) return;
  S.sprayAcc -= n;
  const f = track.dirAt(rider.t, S._sf2 || (S._sf2 = new THREE.Vector3()));
  const o = track.at(rider.t, rider.x, 0, S._so || (S._so = new THREE.Vector3()));
  const r = track.at(rider.t, rider.x + 1, 0, S._sr || (S._sr = new THREE.Vector3())).sub(o).normalize();
  const h = rider.rail ? rider.rail.h + 0.05 : Math.max(0.08, rider.y - S.course.sample(rider.t).y + 0.3);
  const base = S._hc || (S._hc = new THREE.Color());
  base.copy(S.track.mat.uniforms.uHoldCol.value);
  const p = S._spp || (S._spp = new THREE.Vector3()), vel = S._spv || (S._spv = new THREE.Vector3());
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    p.copy(o).addScaledVector(r, side * (0.4 + Math.random() * 0.15)).addScaledVector(f, (Math.random() - 0.6) * 1.1);
    p.y += h;
    // (it keeps up with the board for a moment, fanning out to the side, then falls away behind)
    vel.copy(r).multiplyScalar(side * (5 + 6 * hp) * (0.45 + Math.random() * 0.8)).addScaledVector(f, v * (0.76 + 0.12 * Math.random()));
    vel.y += 1.5 + 4 * hp * Math.random();
    const hot = Math.random() < 0.3;
    const c = S._spc || (S._spc = new THREE.Color());
    c.copy(base).lerp(WHITE, hot ? 0.5 : 0.06).multiplyScalar(hot ? 3 : 2.1 + 0.9 * hp);
    sparks.emit(p, vel, c, 1, { spread: 1.6, life: 0.3 + 0.3 * hp, size: 0.07 + 0.09 * Math.random(), grav: 13, drag: 0.5, jitter: 0.12, up: 0.7 });
  }
}
const WHITE = new THREE.Color(1, 1, 1);
// held down on a rail: a shower off the board where it meets the rail, streaming back and up, hot
// white at the heart and the hold colour round it (on top of the zone's spray, so a held grind
// can't be missed)
function grindShower(S, dt) {
  const { rider, track, sparks } = S;
  if (!rider.rail) return;
  S.grindAcc = (S.grindAcc || 0) + dt * 160;
  const n = Math.floor(S.grindAcc);
  if (n < 1) return;
  S.grindAcc -= n;
  const f = track.dirAt(rider.t, S._gf || (S._gf = new THREE.Vector3()));
  const o = track.at(rider.t, rider.x, rider.rail.h + 0.08, S._go || (S._go = new THREE.Vector3()));
  const vel = S._gv || (S._gv = new THREE.Vector3()), c = S._gc || (S._gc = new THREE.Color());
  const hc = S.track.mat.uniforms.uHoldCol.value, v = Math.max(rider.v, 12);
  for (let i = 0; i < n; i++) {
    const hot = Math.random() < 0.4;
    vel.copy(f).multiplyScalar(v * (0.55 + 0.25 * Math.random()));
    vel.x += (Math.random() - 0.5) * 6; vel.z += (Math.random() - 0.5) * 6; vel.y += 2.5 + 4.5 * Math.random();
    c.copy(hc).lerp(WHITE, hot ? 0.65 : 0.1).multiplyScalar(hot ? 3.4 : 2.6);
    sparks.emit(o, vel, c, 1, { spread: 1.2, life: 0.28 + 0.25 * Math.random(), size: 0.06 + 0.08 * Math.random(), grav: 16, drag: 0.4, jitter: 0.1 });
  }
}
const RAIL_SPARK = new THREE.Color(1, 0.75, 0.45).multiplyScalar(2.6);

// fountains of sparks off the tops of the gate's towers for a moment
function pyroFrame(S, dt) {
  S.pyro -= dt;
  const n = Math.ceil(dt * 260);
  for (const p of S.pyroAt || []) S.sparks.emit(p, new THREE.Vector3(0, 9, 0), S.pyroCol.clone().multiplyScalar(2.6), n, { spread: 2.2, life: 0.9, size: 0.2, grav: 12, up: 2, drag: 0.4, jitter: 0.4 });
}
function burstAt(S, points, color, k) {
  for (const p of points) {
    S.sparks.emit(p, new THREE.Vector3(0, 4, 0), color.clone().multiplyScalar(3), Math.round(70 * k), { spread: 9, life: 1.1, size: 0.3, grav: 7, up: 1.6 });
    S.sparks.emit(p, new THREE.Vector3(0, 2, 0), new THREE.Color(S.P.edge).multiplyScalar(3), Math.round(40 * k), { spread: 6, life: 0.8, size: 0.22, grav: 5 });
  }
}

// The end of a song, the camera. As she brakes it swings round in front of her, off her front
// shoulder, to see the stop and the cheer; when the card comes up it carries on round to the
// song's own shot of her and the place she rode to (heroShot). It goes ROUND her, a few metres
// off, so it never passes through her or the ground (it used to take the straight line); on a tall
// screen she's kept in the middle, above the card, which is a sheet up the bottom there.
function endFrame(S) {
  const { rider, track } = S;
  const H = S.view.root.position;
  const d = track.dirAt(rider.t, S._ed || (S._ed = new THREE.Vector3())); d.y = 0;
  if (d.lengthSq() < 1e-6) d.set(0, 0, 1); d.normalize();
  const L = (S._el || (S._el = new THREE.Vector3())).set(d.z, 0, -d.x);   // her left
  return { H, d, L };
}
function toPolar(F, P) {
  const vx = P.x - F.H.x, vz = P.z - F.H.z;
  const back = -(vx * F.d.x + vz * F.d.z), left = vx * F.L.x + vz * F.L.z;
  return { a: Math.atan2(left, back), r: Math.max(2.5, Math.hypot(back, left)), h: P.y - F.H.y };
}
function fromPolar(F, a, r, h, out) {
  return out.copy(F.H).addScaledVector(F.d, -Math.cos(a) * r).addScaledVector(F.L, Math.sin(a) * r).setY(F.H.y + h);
}
function endCam(S, hero) {
  const ec = S.ec, F = endFrame(S);
  const tall = camera.aspect < 1;
  // the stop: round in front of her and a little to her left, looking at her
  const sk = S.stopK ? S.stopK * S.stopK * (3 - 2 * S.stopK) : 0;
  const sA = 2.55, sR = tall ? 6.4 : 4.5, sH = tall ? 1.5 : 1.25, sFov = tall ? 56 : 50;
  let a = ec.a0 + (sA - ec.a0) * sk, r = ec.r0 + (sR - ec.r0) * sk, h = ec.h0 + (sH - ec.h0) * sk + 0.7 * Math.sin(Math.PI * sk);
  // (where the chase camera was looking, kept in her frame so it travels with her as she slides)
  const look = S._elk || (S._elk = new THREE.Vector3());
  const l0 = S._el0 || (S._el0 = new THREE.Vector3());
  l0.copy(F.H).addScaledVector(F.d, ec.look0.f).addScaledVector(F.L, ec.look0.l); l0.y += ec.look0.h;
  look.copy(F.H); look.y += 0.95;
  look.lerp(l0, Math.pow(1 - sk, tall ? 3 : 1.6));
  let fov = ec.fov0 + (sFov - ec.fov0) * sk;
  // the card's up: on round to the song's shot of her (on a tall screen, straight past her at the place)
  const ok = hero && S.outroK ? S.outroK * S.outroK * (3 - 2 * S.outroK) : 0;
  if (ok > 0) {
    // (a song whose ending circles the place itself gives a centre and an angle, not a spot)
    const hp = hero.pos || (S._ehp || (S._ehp = new THREE.Vector3())).set(hero.center.x + Math.cos(hero.angle) * (hero.r ?? 14), hero.center.y + (hero.h ?? 2.6), hero.center.z + Math.sin(hero.angle) * (hero.r ?? 14));
    const P = toPolar(F, hp);
    let ha = P.a, hr = P.r, hh = P.h;
    const hl = S._ehl || (S._ehl = new THREE.Vector3()); hl.copy(hero.look || hero.center);
    if (tall) { ha *= 0.35; hr = Math.max(hr, 7); hh = Math.max(hh, 1.6); }
    // (the long way round never: the angle goes the short way from where the stop left it)
    let da = ha - a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    a += da * ok; r += (hr - r) * ok; h += (hh - h) * ok;
    // (the eyes stay on her through the swing and only settle on the song's framing at the end)
    look.lerp(hl, ok * ok * ok);
    fov += ((tall ? Math.max(hero.fov ?? 46, 54) : (hero.fov ?? 46)) - fov) * ok;
  }
  ec.a = a; ec.k = 1;
  const pos = fromPolar(F, a, r, Math.max(h, 0.6), S._ecp2 || (S._ecp2 = new THREE.Vector3()));
  // on a tall screen the card is a sheet up the bottom: as the card comes up the eyes go straight
  // along the line from the camera through her, so she stays in the middle the whole way round
  if (tall && ok > 0) {
    const thru = S._eth || (S._eth = new THREE.Vector3());
    thru.copy(F.H).sub(pos).setY(0).normalize().multiplyScalar(10).add(F.H); thru.y = F.H.y + 1.1;
    look.lerp(thru, ok);
  }
  return { k: 1, pos, look, fov, lift: ok };
}

// the end shot: from the line between her and the finale, back and to the left of her, drifting
function heroShot(S, fo, orbit) {
  const H = S.view.root.position, F = S.finale.group.position;
  let dx = F.x - H.x, dz = F.z - H.z, L = Math.hypot(dx, dz);
  if (L < 1) { const f = S.track.dirAt(S.rider.t, new THREE.Vector3()); dx = f.x; dz = f.z; L = Math.hypot(dx, dz) || 1; }
  const ux = dx / L, uz = dz / L, lx = uz, lz = -ux;           // toward the place, and to its left
  const drift = Math.sin((S.orbitA - 2.2) * 0.45);
  const back = (fo.heroBack ?? 6.2) * (1 + 0.06 * drift), side = (fo.heroSide ?? 2.7) + 0.5 * drift;
  const ty = (F.y + (fo.y ?? 1.2)) * 0.45 + (H.y + 1.5) * 0.55;
  const pos = new THREE.Vector3(H.x - ux * back + lx * side, H.y + (fo.heroUp ?? 1.7), H.z - uz * back + lz * side);
  const look = new THREE.Vector3(H.x + ux * 10 + lx * side * 0.55, ty + (fo.heroTilt ?? 0.6), H.z + uz * 10 + lz * side * 0.55);
  // heroPan (radians) turns the camera left, so she and the place sit further right of the end card
  if (fo.heroPan) {
    const ax = look.x - pos.x, az = look.z - pos.z, c = Math.cos(fo.heroPan), s = Math.sin(fo.heroPan);
    look.x = pos.x + ax * c + az * s; look.z = pos.z - ax * s + az * c;
  }
  // she stays in the picture: the bottom of the board no lower than three quarters of the way down
  const fov = fo.heroFov ?? 46, half = THREE.MathUtils.degToRad(fov / 2);
  const hd = Math.hypot(look.x - pos.x, look.z - pos.z), fd = Math.max(0.5, Math.hypot(H.x - pos.x, H.z - pos.z));
  const lim = Math.atan2(H.y - 0.25 - pos.y, fd) + half * 0.72;
  if (Math.atan2(look.y - pos.y, hd) > lim) look.y = pos.y + Math.tan(lim) * hd;
  return { ...orbit, pos, look, fov };
}

// the gates at the bottom of the coming dips: a light on each rail, so where to let go reads from far off
function gatePosts(S, T, beatPulse) {
  const { rider, course, track } = S;
  if (state !== 'ride' && state !== 'title') return;
  const v = course.gates, t = rider.t;   // (only the dips you pump into: the same gates the road draws)
  let lo = 0, hi = v.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (v[m] < t - 0.05) lo = m + 1; else hi = m; }
  const col = S._gateCol || (S._gateCol = [0, 0, 0]);
  const c = (S._gateC || (S._gateC = new THREE.Color())).set(S.P.gate ?? S.P.edge); col[0] = c.r; col[1] = c.g; col[2] = c.b;
  const p = S._gp || (S._gp = new THREE.Vector3());
  for (let i = lo; i < v.length && v[i] < t + 5.5; i++) {
    const ahead = v[i] - t;
    const w = course.sample(v[i]).width;
    // (gone the moment she's through: past her they swept by beside the camera, huge, a flash at the
    // sides of the screen on every dip, worst on a phone held upright)
    const k = (0.5 + 1.3 * Math.exp(-Math.max(0, ahead) * 0.55)) * (0.85 + 0.35 * beatPulse) * (ahead < 0 ? Math.max(0, 1 + ahead * 30) : 1) * Math.min(1, ahead / 0.12 + 1);
    for (const side of [-1, 1]) { track.at(v[i], side * (w + 0.1), 0.4, p); T.glow(p.x, p.y, p.z, 2.3, col, k); }
  }
}

// the hold zones in your hand, the way a long note is under your fingers: a tap on the crest where
// one starts (press; set up a few frames ahead so it lands on time), a purr while you hold it that
// ends on a firm tick at its gate (let go), and it stops dead the moment you let go
function beatInThumb(S) {
  const r = S.rider, c = S.course;
  if (!haptics.enabled || r.stopping) return;
  const cr = c.crests;
  let i = S.thumbCrest ?? 0; while (i < cr.length && cr[i] <= r.t) i++;
  if (i < cr.length && cr[i] - r.t < 0.1 && r.grounded) { haptics.at(cr[i] - r.t, [14], 2, () => state === 'ride' && !paused); i++; }
  S.thumbCrest = i;
  const inZone = c.sample(r.t).hold >= 0;
  if (r.press && inZone) {
    if (S.purrTo === undefined || S.purrTo === null) {
      let g = null; for (const t of c.gates) if (t > r.t) { g = t; break; }
      if (g !== null && g - r.t < 4) { haptics.purr((g - r.t) * 1000); S.purrTo = g; }
    }
  } else if (S.purrTo != null) {
    if (r.t < S.purrTo - 0.02) haptics.stop();      // let go before the gate: the purr stops dead
    S.purrTo = null;
  }
}

// a pump, graded as you let go: the bigger the hit, the more the world answers
function judgeFeedback(S, e) {
  const { rider, sparks, track, P } = S;
  if (state !== 'ride') return;
  const g = e.grade;
  if (g === 'miss' && !e.lost) return;              // not pumping at all: say nothing
  hud.judge(g, e.streak, e.points);
  const mult = rider.score.mult;
  kit.pump(g, e.at ?? rider.t, mult, e.streak);
  if (e.points) hud.score(rider.score.points, mult);
  // a new multiplier: a short fill into the next beat and a ring
  const step = (g === 'perfect' || g === 'good') && e.streak > 0 && e.streak % 8 === 0 && e.streak <= 24;
  if (step) { kit.fill(rider.t, mult); hud.mult(mult); }
  // and in your hand: the multiplier's pulses, a double tap for a perfect, a tap for a good, a dull
  // buzz for a run broken
  if (step) haptics.buzz(haptics.mult(mult), 4);
  else if (g === 'perfect') haptics.buzz([14, 36, 14], 3);
  else if (g === 'good') haptics.buzz([10], 2);
  else if (e.lost >= 4) haptics.buzz([45], 3);
  const p = track.at(rider.t, rider.x, 0.15);
  if (g === 'perfect') {
    const gold = new THREE.Color(1, 0.82, 0.38);
    S.rings.fire(gold.clone().multiplyScalar(1.7), 3.6, 0.4, 0.06);
    S.rings.fire(new THREE.Color(P.gate ?? P.edge).multiplyScalar(1.3), 2.2, 0.34, 0.09, 0.06);
    sparks.emit(p, new THREE.Vector3(0, 2, 0), gold.clone().multiplyScalar(3), 34, { spread: 7, life: 0.6, size: 0.22, grav: 5, up: 1.4 });
    S.hit = 1;
    if (e.streak > 0 && e.streak % 8 === 0) S.rings.fire(gold.clone().multiplyScalar(2.2), 5.5, 0.55, 0.045, 0.1);
    // it lands: the view snaps in and rushes out wider (more the higher the multiplier), a flash of
    // gold, the colour flicking at the screen's edges, the speed lines and the board's flare surging
    chase.punch(0.7 + 0.1 * mult);
    chase.impulse(0, 0.12, 0.6 + 0.15 * (mult - 1));
    S.burst = 1; S.aberrK = 1;
    S.flash = Math.max(S.flash, 0.05 + 0.015 * mult); post.comp.uniforms.uFlashColor.value.setRGB(1, 0.8, 0.4); S.flashTint = 0.5;
    hud.bump(1 + 0.25 * (mult - 1));
  } else if (g === 'good') {
    S.rings.fire(new THREE.Color(1, 1, 1).multiplyScalar(1.1), 2.6, 0.32, 0.08);
    sparks.emit(p, new THREE.Vector3(0, 1.5, 0), new THREE.Color(P.gate ?? P.edge).multiplyScalar(2.2), 16, { spread: 5, life: 0.45, size: 0.18, grav: 5 });
    S.hit = Math.max(S.hit, 0.45);
    chase.impulse(0, 0.06, 0.25); chase.punch(0.3);
    S.burst = Math.max(S.burst || 0, 0.4);
    hud.bump(0.6);
  } else if (e.lost >= 4) {
    // a run broken: a dull grey crack where it ended, the needle dragged across the record, the
    // song dropping out a moment and the colour draining out of everything (more for a longer run)
    S.rings.fire(new THREE.Color(0.35, 0.33, 0.4), 2.2, 0.4, 0.12);
    const big = Math.min(1, e.lost / 24);
    sound.scratch(0.5 + 0.5 * big);
    S.muffle = Math.max(S.muffle, 0.55 + 0.35 * big);
    S.drain = Math.max(S.drain || 0, 0.55 + 0.45 * big);
    chase.impulse(0.4, 0.2, 0);
  }
  // a new multiplier at x4: the run's top. A run up the key, a gold flash, the world takes off
  if (step && mult >= 4) {
    sound.flourish(e.streak);
    S.flash = Math.max(S.flash, 0.18); post.comp.uniforms.uFlashColor.value.setRGB(1, 0.78, 0.35); S.flashTint = 0.8;
    chase.impulse(0.3, 0.2, 1.4);
  }
}

// going Groovy: a burst of every colour off the board, the view kicked back, x8 slamming in (hud)
function groovyGo(S) {
  const { rider, track, sparks } = S;
  sound.groovyGo();
  haptics.buzz([30, 40, 30, 40, 90], 5);
  S.flash = Math.max(S.flash, 0.34); post.comp.uniforms.uFlashColor.value.setRGB(1, 0.55, 0.95); S.flashTint = 1;
  chase.punch(1.4); chase.impulse(0.4, 0.3, 2.0);
  S.burst = 1; S.aberrK = 1.5;
  const p = track.at(rider.t, rider.x, 0.5);
  for (let i = 0; i < 4; i++) S.rings.fire(new THREE.Color().setHSL(i / 4 + 0.9, 1, 0.6).multiplyScalar(2.6), 4.5 + i * 1.6, 0.5 + 0.08 * i, 0.05, i * 0.06);
  sparks.emit(p, new THREE.Vector3(0, 4, 0), new THREE.Color(1, 0.55, 0.95).multiplyScalar(3), 70, { spread: 12, life: 1, size: 0.26, grav: 4, up: 1.6 });
  sparks.emit(p, new THREE.Vector3(0, 4, 0), new THREE.Color(0.3, 0.9, 1).multiplyScalar(3), 50, { spread: 10, life: 0.9, size: 0.22, grav: 4, up: 1.4 });
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
  // the camera comes round in front of her, off her front shoulder, to see it (endCam), starting
  // from wherever the chase camera is now
  const F = endFrame(S), p0 = toPolar(F, camera.position);
  const lw = new THREE.Vector3(); camera.getWorldDirection(lw); lw.multiplyScalar(8).add(camera.position).sub(F.H);
  const look0 = { f: lw.x * F.d.x + lw.z * F.d.z, l: lw.x * F.L.x + lw.z * F.L.z, h: lw.y };
  S.ec = { a0: p0.a, r0: p0.r, h0: p0.h, look0, fov0: camera.fov, a: p0.a, k: 0 };
  S._ekp = S._ekp || new THREE.Vector3();
}
function stopFrame(S, dt) {
  const r = S.rider;
  const decel = Math.max(22, r.stopV0 / 1.25);
  r.stopVel = Math.max(0, r.stopVel - decel * dt);
  S.stopClock += dt * r.stopVel / r.stopV0;
  r.advance(Math.max(r.t, S.stopClock), { press: false, steer: 0 });
  S.stopK = Math.min(1, (S.stopK || 0) + dt / 1.3);
  if (r.stopVel < 2.5) S.view.cheering = true;
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
    // a phone's camera: the click and the white of the flash
    if (m.kind === 'shutter') { S.flash = Math.max(S.flash, m.k ?? 0.7); post.comp.uniforms.uFlashColor.value.setRGB(1, 1, 1); S.flashTint = 0.9; sound.shutter(m.k ?? 0.7); }
    // a bell, in the song's key
    if (m.kind === 'ring') sound.ring(m.k ?? 0.4, m.dur ?? 0.7);
    if (m.kind === 'pop') { sound.pop(m.k ?? 0.5); S.flash = Math.max(S.flash, m.flash ?? 0.12); }
    if (m.kind === 'bell') { for (let i = 0; i < (m.n ?? 1); i++) setTimeout(() => sound.bell(m.k ?? 0.6, m.degree ?? 0), i * (m.gap ?? 900)); }
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
    if (m.kind === 'blackout') S.black = { t0: m.t, dur: m.dur ?? 1.5, k: m.k ?? 0.95 };
    if (m.kind === 'thud') { sound.thud(m.k ?? 1); chase.impulse(1.1, 0.9, 0); S.muffle = Math.max(S.muffle, 0.6); S.hurt = 1; }
    // a set-piece's hit down the street: a crunch, a little shake; glass going
    if (m.kind === 'impact') { sound.impact(m.k ?? 0.6); chase.impulse(0.35 * (m.k ?? 0.6), 0.5, 0); S.flash = Math.max(S.flash, 0.06); }
    if (m.kind === 'glass') sound.glass(m.k ?? 0.6);
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
  sound.charge(false); sound.siren(0); sound.grind(false);
  const st = S.rider.stats, points = S.rider.score.points;
  const inTime = st.judged ? Math.round(100 * st.hits / st.judged) : 0;
  const grade = gradeOf(points, S.par);
  const prev = progress.song(S.id);
  const res = progress.finish(S.id, points, grade);
  try { if (st.dist > (+localStorage.getItem('lc-best-' + S.id) || 0)) localStorage.setItem('lc-best-' + S.id, st.dist); } catch (e) { /* private mode */ }
  hud.hideAll();
  S.endShown = performance.now();
  const i = S.index, last = i >= ALBUM.length - 1;
  const next = { label: 'Next song', key: 'enter', go: () => chooseSong(i + 1) };
  const again = { label: 'Ride again', key: 'R', code: 'KeyR', go: rideAgain };
  const menu = { label: 'All songs', key: 'M', code: 'KeyM', go: () => openMenu(last ? 0 : i + 1) };
  const data = { title: S.entry.title, accent: S.entry.accent || '#ff4f9a', points, grade, best: prev ? prev.best : 0, newBest: !!(prev && prev.best > 0 && points > prev.best),
    dist: st.dist, inTime, perfects: st.perfects, bestStreak: st.bestStreak, notes: st.notes, notesTotal: st.notesTotal, top: st.top, collect: S.entry.collect, tricks: st.tricks,
    level: { before: res.before, gained: points, need: levelNeed } };
  S.endData = data;
  // (the grade lands like a stamp: a thump in your hand too, a longer one for an S)
  const fx = { tick: (k) => kit.tick(k), grade: (g) => { kit.grade(g); haptics.once(g === 'S' ? [30, 40, 30, 40, 70] : g === 'A' ? [30, 40, 50] : [40]); }, rise: (d) => kit.rise(d), levelUp: () => { kit.levelUp(); S.cheer = Math.max(S.cheer || 0, 1); haptics.once([18, 50, 18, 50, 18]); } };
  // let the ending breathe a moment before the card comes up
  setTimeout(() => { if (state === 'results') ui.showEnd(data, last ? [menu, again] : [next, again, menu], fx); }, 1400);
}

// on the site: a service worker (nothing but a registration) so a phone can put the game on its home screen as an app
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* fine */ });
requestAnimationFrame(frame);
if (params.has('song')) chooseSong(clamp(parseInt(params.get('song'), 10), 0, ALBUM.length - 1));
else if (params.has('menu')) openMenu(0);
else openIntro();
