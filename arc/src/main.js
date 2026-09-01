// ARC — boot, the loop, the state machine, and the test API (window.__ARC).
import * as THREE from 'three';
import { CFG } from './config.js';
import { World } from './world.js';
import { CHAPTERS } from './chapters.js';
import { Rail, EmberField } from './rail.js';
import { Swift } from './swift.js';
import { Rider } from './rider.js';
import { ChaseCamera } from './camera.js';
import { FX } from './fx.js';
import { Hyperspeed } from './hyperspeed.js';
import { Input } from './input.js';
import { GameAudio } from './audio.js';
import { EventBus } from './events.js';
import { makePostFX } from './postfx.js';
import { Tortoise } from './bosses/tortoise.js';
import { Heron } from './bosses/heron.js';
import { Eel } from './bosses/eel.js';
import { Ending } from './ending.js';

const params = new URLSearchParams(location.search);
const TEST = params.has('test');
const DT = 1 / 120;
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0);

const API = { ready: false, bootStage: 'init', version: CFG.version };
window.__ARC = API;

function $(id) { return document.getElementById(id); }

class Game {
  constructor() {
    API.bootStage = 'renderer';
    this.canvas = $('game');
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    const lowQ = params.get('quality') === 'low';
    renderer.setPixelRatio(lowQ ? 1 : Math.min(CFG.render.pixelRatioCap, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.cam3 = new THREE.PerspectiveCamera(CFG.camera.fov, window.innerWidth / window.innerHeight, 0.2, 2600);
    this.scene.add(this.cam3);
    this.events = new EventBus();
    this.time = 0; this.playTime = 0; this.frame = 0; this.acc = 0; this.last = performance.now();
    this.state = 'title';
    this.dts = [];

    API.bootStage = 'world';
    const ctx = this.ctx = { scene: this.scene, events: this.events, time: 0, colliders: [], livingRails: [], chapterGroups: [] };
    this.world = ctx.world = new World(this.scene, renderer);
    for (const ch of CHAPTERS) ctx.chapterGroups[ch.index] = this.world.addChapter(ch.index, ch);
    this.rail = ctx.rail = new Rail(this.scene);
    this.embers = ctx.embers = new EmberField(this.scene);
    this.fx = ctx.fx = new FX(this.scene);
    this.rider = ctx.rider = new Rider(this.scene, ctx);
    this.swift = ctx.swift = new Swift(this.scene, ctx);
    this.camera = ctx.camera = new ChaseCamera(this.cam3, ctx);
    this.hyper = new Hyperspeed(this.cam3);
    this.audio = ctx.audio = new GameAudio(this.events);
    this.input = new Input(this.canvas, { lock: !TEST });
    this.input.onGesture = () => this.audio.unlock();
    this.input.onLockChange = (locked) => { if (!locked && this.state === 'playing' && !TEST) this.pause(); };

    API.bootStage = 'bosses';
    this.bosses = [];
    for (const ch of CHAPTERS) {
      if (!ch.boss) continue;
      const B = ch.boss.kind === 'tortoise' ? Tortoise : ch.boss.kind === 'heron' ? Heron : Eel;
      const boss = new B(ctx, { x: ch.boss.x, z: ch.boss.z }); boss.trigger = ch.boss.trigger; boss.chapter = ch.index;
      this.bosses.push(boss);
    }
    this.ending = new Ending(ctx, CHAPTERS[3].socket);
    ctx.ending = this.ending;
    this._rebuildColliders();

    API.bootStage = 'postfx';
    this.post = makePostFX(renderer, this.scene, this.cam3, { bloomStrength: CFG.render.bloomStrength, bloomRadius: CFG.render.bloomRadius, bloomThreshold: CFG.render.bloomThreshold, width: window.innerWidth, height: window.innerHeight, samples: lowQ ? 0 : 4 });
    this.post.u.uVignette.value = 0.38; this.post.u.uGrain.value = 0.018;
    this.flash = 0; this.dark = 0; this.desat = 0; this.wakeAnim = []; this.dawn = 0; this.chapter = 0; this.maxYch4 = 0;
    window.addEventListener('resize', () => this.resize());
    this.resize();

    this._bindVisuals();
    this._bindUI();
    this.reset();
    this.camera.orbit = { centre: this.rider.pos.clone().add(new THREE.Vector3(0, 6, -40)), radius: 34, height: 12, speed: 0.08, fov: 58, angle: 0.4 };
    this.setState('title');
    API.bootStage = 'ready';
    this._exposeAPI();
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.cam3.aspect = w / h; this.cam3.updateProjectionMatrix();
    this.post.resize(w, h, this.renderer.getPixelRatio());
  }

  _rebuildColliders() {
    const list = [];
    for (const b of this.bosses) if (!b.dead) list.push(...b.colliders);
    list.push(...this.ending.colliders);
    this.ctx.colliders = list;
    this.ctx.livingRails = this.bosses.filter(b => b.rail && !b.dead).map(b => b.rail);
  }

  setState(s) {
    this.state = s;
    document.body.dataset.state = s;
    $('title').hidden = s !== 'title'; $('pause').hidden = s !== 'paused'; $('end').hidden = s !== 'end';
    if (s === 'playing') { this.camera.orbit = null; }
  }

  reset() {
    const ch = CHAPTERS[0];
    this.rider.pos.set(ch.spawn.x, ch.spawn.y, ch.spawn.z); this.rider.vel.set(0, 0, 0); this.rider.yaw = ch.spawn.yaw;
    this.rider.state = 'ground'; this.rider.rail = null; this.rider.falls = 0; this.rider.thrown = 0; this.rider.called = 0; this.rider.chain = 0; this.rider.lastSafe.pos.copy(this.rider.pos);
    this.rider.frozenPose = false; this.rider.metresRidden = 0;
    this.swift.state = 'hand'; this.swift.charging = false; this.swift.pendingThrow = null;
    this.rail.vanish();
    this.camera.snapTo(ch.spawn.yaw, -0.1);
    this.playTime = 0; this.chapter = 0; this.maxYch4 = 0;
    this.world.setWaterY(0); this.world.setDawn(0);
    for (let i = 0; i < 4; i++) this.world.setWake(i, 0);
  }

  start() {
    this.audio.unlock();
    if (this.state === 'title' || this.state === 'end') {
      if (this.state === 'end') { location.reload(); return; }
      this.camera.snapTo(CHAPTERS[0].spawn.yaw, -0.1);
      this.setState('playing');
      if (!TEST) this.input.requestLock();
    }
  }
  pause() { if (this.state !== 'playing') return; this.setState('paused'); this.input.releaseLock(); }
  resume() { if (this.state !== 'paused') return; this.setState('playing'); this.audio.unlock(); if (!TEST) this.input.requestLock(); }

  _bindUI() {
    $('start').addEventListener('click', () => this.start());
    $('resume').addEventListener('click', () => this.resume());
    $('restart').addEventListener('click', () => location.reload());
    $('again').addEventListener('click', () => location.reload());
    this.canvas.addEventListener('mousedown', () => { if (this.state === 'title') this.start(); });
  }

  // ---- visuals for events (tag: 'visual') ----------------------------------------------------
  _bindVisuals() {
    const E = this.events, on = (n, f) => E.on(n, f, 'visual');
    on('charge', () => { });
    on('gather', () => { this.rider.crouch = Math.max(this.rider.crouch, 0.6); });
    on('throw', (d) => { this.fx.emit(d.pos, { n: 14, color: 0xffb24a, speed: 4, life: 0.4, size: 0.12, grav: 2 }); this.camera.shake(0.06); });
    on('throwRefused', () => { this.rider.flinch = 1; });
    on('callRefused', () => { this.swift.shrug = 1; });
    on('stick', (d) => { this.fx.emit(d.pos, { n: 26, color: 0xffb24a, speed: 5, life: 0.6, size: 0.16, grav: 5 }); });
    on('hang', (d) => { this.fx.emit(d.pos, { n: 14, color: 0xffb24a, speed: 2.5, life: 0.7, size: 0.14, grav: 1 }); });
    on('latch', (d) => { this.rail.startPulse(d.s, 1); this.fx.emit(this.rider.pos, { n: 22, color: 0xffd080, speed: 6, life: 0.4, size: 0.12, grav: 8 }); this.camera.shake(0.05); });
    on('unlatch', (d) => { this.fx.emit(this.rider.pos, { n: 18, color: 0xffd080, speed: 4 + d.speed * 0.1, life: 0.45, size: 0.11, grav: 6, dir: this.rider.vel.clone().normalize(), spread: 1.2 }); });
    on('pop', () => { this.fx.emit(this.rider.pos, { n: 16, color: 0xffd080, speed: 5, life: 0.35, size: 0.1, grav: 8 }); });
    on('grindStop', (d) => { if (d.landing) this.fx.emit(this.rider.pos, { n: 14, color: 0x8fa0d8, speed: 2.5, life: 0.5, size: 0.14, grav: 3, jitter: 0.6 }); });
    on('call', () => { this.camera.pull = 1; });
    on('earlyCall', () => { this.camera.pull = 0.6; });
    on('giveUp', () => { });
    on('catchSoft', () => { this.fx.emit(this.rider.hand(_v), { n: 12, color: 0xffb24a, speed: 3, life: 0.4, size: 0.12, grav: 3 }); this.flash = Math.max(this.flash, 0.12); });
    on('catchDash', (d) => {
      this.camera.punchFov(CFG.dash.fovPunch); this.camera.shake(CFG.dash.trauma);
      this.flash = Math.max(this.flash, 0.18); this.flashColor = 0xffb24a; this.chroma = 0.35;
      this.fx.emit(this.rider.hand(_v), { n: 70, color: 0xffb24a, speed: 12, life: 0.7, size: 0.2, grav: 4, drag: 2 });
      this.fx.emit(this.rider.pos, { n: 30, color: 0xffc070, speed: 5, life: 0.5, size: 0.14, grav: 0, drag: 3 });
    });
    on('fall', (d) => { this.fx.emit(d.pos, { n: 60, color: 0x7f92d0, speed: 7, life: 1.0, size: 0.28, grav: 14, spread: 1.6 }); this.desat = 1; this.camera.shake(0.3); });
    on('respawn', () => { this.dark = 1; });
    on('lantern', (d) => { this.flash = Math.max(this.flash, 0.3); this.flashColor = 0x9a6cff; this.camera.shake(0.5); });
    on('bossDown', (d) => { this.camera.shake(0.7); this._wakeChapter(d.boss); });
    on('chapterWake', () => { });
    on('wave', () => { });
    on('stabWarn', () => { });
    on('stab', () => { });
    on('surface', () => { });
    on('dive', () => { });
    on('ending', () => { this.setState('ending'); });
    on('endingStand', () => {
      // the payoff view: from the crest, looking south over the whole valley as every line you rode lights
      const r = this.rider.pos;
      this.camera.orbit = { centre: new THREE.Vector3(r.x, r.y - 70, r.z + 300), radius: 300, height: 70 + 34, speed: 0, fov: 66, angle: -Math.PI / 2 };
    });
    on('grindStart', () => { });
  }

  _wakeChapter(bossTag) {
    const idx = bossTag === 'tortoise' ? 0 : bossTag === 'heron' ? 1 : 2;
    this.wakeAnim.push({ idx, t: 0 });
    const dawnStep = [0.06, 0.14, 0.24][idx];
    this.dawnTarget = Math.max(this.dawnTarget || 0, dawnStep);
    this._rebuildColliders();
    this.events.emit('chapterWake', { t: this.time, chapter: idx });
  }

  // ---- the loop -------------------------------------------------------------------------------
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (this.frame > 5) { this.dts.push(dt * 1000); if (this.dts.length > 600) this.dts.shift(); }
    this.frame++;
    this._govern(dt);
    if (!this.frozenClock) this.frameStep(dt);
    this.render(dt);
  }

  // A quiet governor: if the frame runs long for two seconds, step the pixel ratio down
  // (1.25 -> 1 -> 0.85). Never up again mid-session: a flip-flopping image is worse.
  _govern(dt) {
    if (this.state !== 'playing') return;
    this._govAcc = (this._govAcc || 0) + dt; this._govSlow = (this._govSlow || 0) + (dt > 0.024 ? 1 : 0); this._govN = (this._govN || 0) + 1;
    if (this._govAcc < 2) return;
    const slowShare = this._govSlow / this._govN; this._govAcc = 0; this._govSlow = 0; this._govN = 0;
    if (slowShare > 0.35) {
      const pr = this.renderer.getPixelRatio();
      const next = pr > 1.1 ? 1 : pr > 0.9 ? 0.85 : null;
      if (next) { this.renderer.setPixelRatio(next); this.resize(); this.qualityStep = (this.qualityStep || 0) + 1; }
    }
  }

  frameStep(dt) {
    const snap = this.input.poll();
    if (this.state === 'playing' || this.state === 'ending') {
      if (snap.escape && this.state === 'playing') { this.pause(); return; }
      if (snap.mutePressed) this.audio.setMuted(!this.audio.muted);
      this.acc += dt;
      let first = true; let steps = 0;
      while (this.acc >= DT && steps < 8) {
        this.sim(DT, first ? snap : this._quiet(snap));
        first = false; steps++; this.acc -= DT;
      }
      if (steps === 8) this.acc = 0;
    } else if (this.state === 'paused') {
      if (snap.escape) this.resume();
    } else if (this.state === 'title') {
      if (snap.anyPressed && (snap.primaryPressed || snap.jumpPressed)) this.start();
    }
    this.camera.update(dt, this.rider, this.state === 'playing' ? snap : null, this.time);
  }

  _quiet(snap) { return { ...snap, jumpPressed: false, primaryPressed: false, primaryReleased: false, secondaryPressed: false, interactPressed: false, escape: false, restart: false, mutePressed: false, lookX: 0, lookY: 0 }; }

  sim(dt, snap) {
    this.time += dt; this.ctx.time = this.time; this.playTime += dt;
    const rider = this.rider, swift = this.swift;

    // the fall: SUMI's blot. The world stops for 0.15 s, then the swift dives, then home.
    if (rider.state === 'fallen') {
      if (rider.freeze > 0) { rider.freeze -= dt; return; }
      if (!rider._diving) { rider._diving = true; swift.dive(swift.pos.clone(), rider.lastSafe.pos.clone().add(new THREE.Vector3(0, 1.2, 0))); }
      rider.respawnTimer -= dt;
      swift.update(dt, rider.hand(_v), this.camera.aimDir(_w), rider.vel);
      if (rider.respawnTimer <= 0) { rider._diving = false; rider.respawn(); swift.state = 'hand'; }
      this.fx.update(dt); this.rail.update(dt, this.time); this.embers.update(this.time);
      for (const b of this.bosses) b.update(dt, rider); // the animals keep living while the swift dives
      return;
    }

    // inputs -> verbs
    if (this.state === 'playing') {
      if (snap.primaryPressed) { if (!swift.startCharge()) swift.refuseThrow(); }
      if (snap.primaryReleased && swift.charging) swift.release(this.camera.aimDir(_w), rider.vel, rider.hand(_v));
      if (snap.secondaryPressed) { if (this.ending.phase === 'perched') this.ending.look(); else swift.call(); }
      if (snap.restart) { rider.fall(); }
    }
    if (this.state === 'ending' && snap.secondaryPressed) this.ending.look();

    if (!rider.frozenPose) rider.update(dt, snap, this.camera.yaw);
    swift.update(dt, rider.hand(_v), this.camera.aimDir(_w), rider.vel);
    // a NaN anywhere here poisons the camera, the audio listener and every shader within a frame.
    // Say where it came from once, then put the rider back on the last roof.
    if (!Number.isFinite(rider.pos.x + rider.pos.y + rider.pos.z + rider.vel.x + rider.vel.y + rider.vel.z)) {
      if (!this._nanSaid) { this._nanSaid = true; console.error('ARC NaN rider', JSON.stringify({ state: rider.state, s: rider.s, railV: rider.railV, rail: rider.rail && { total: rider.rail.total, pts: rider.rail.points.length, tag: rider.rail.tag, vis: [rider.rail.visStart, rider.rail.visEnd] }, swift: swift.state, dash: rider.dashRise })); }
      rider.respawn();
    }
    this.rail.update(dt, this.time); this.embers.update(this.time);
    this.fx.update(dt);

    // bosses
    for (const b of this.bosses) {
      if (!b.active && !b.dead && b.trigger) { const dx = rider.pos.x - b.trigger.x, dz = rider.pos.z - b.trigger.z; if (dx * dx + dz * dz < b.trigger.r * b.trigger.r) b.active = true; }
      b.update(dt, rider);
      if (b.active && !b.dead) b.checkLanterns(rider);
    }
    if (this.state === 'ending' || this.ending.phase !== 'waiting') { if (!rider.standY) rider.standY = rider.pos.y; this.ending.update(dt, rider); if (this.ending.done && this.state !== 'end') this.finish(); }
    else this.ending.update(dt, rider);

    // chapter by position; chapter IV's water climbs with you
    const z = rider.pos.z;
    this.chapter = z > -800 ? 0 : z > -1300 ? 1 : z > -1890 ? 2 : 3;
    if (this.chapter === 3 && this.ending.phase === 'waiting') {
      if (rider.state === 'ground') this.maxYch4 = Math.max(this.maxYch4, rider.pos.y);
      const want = THREE.MathUtils.clamp(0.5 * (this.maxYch4 - 24), 0, 150);
      this.world.setWaterY(THREE.MathUtils.damp(this.world.waterY, want, 0.35, dt));
    }
    for (const m of [this.rail.mat, this.rail.matMirror, this.embers.mat, this.embers.matMirror]) m.uniforms.uWaterY.value = this.world.waterY;

    // chapter wakes: windows warm over 3 s
    for (const w of this.wakeAnim) { w.t += dt; this.world.setWake(w.idx, Math.min(1, w.t / 3)); }
    this.wakeAnim = this.wakeAnim.filter(w => w.t < 3.2);
    if (this.dawnTarget !== undefined && this.ending.phase === 'waiting') { this.dawn = THREE.MathUtils.damp(this.dawn, this.dawnTarget, 0.4, dt); this.world.setDawn(this.dawn); }

    // music law
    const mode = rider.state === 'rail' ? 'ride' : rider.state === 'air' ? 'air' : 'roof';
    this.audio.update(dt, { mode, chain: rider.chain, speed: rider.speed, grinding: rider.state === 'rail', airSpeed: rider.state === 'air' ? rider.speed : 0, drag: rider.drag });
  }

  finish() {
    this.setState('end');
    const mm = Math.floor(this.playTime / 60), ss = Math.floor(this.playTime % 60);
    $('t-time').textContent = `${mm}:${String(ss).padStart(2, '0')}`;
    $('t-falls').textContent = String(this.rider.falls);
    $('t-thrown').textContent = String(this.rider.thrown);
    $('t-called').textContent = String(this.rider.called);
    try { const k = 'arc-best-v1'; const prev = JSON.parse(localStorage.getItem(k) || 'null'); if (!prev || this.playTime < prev.time) localStorage.setItem(k, JSON.stringify({ time: this.playTime, falls: this.rider.falls })); } catch { /* private window */ }
    this.input.releaseLock();
  }

  render(dt) {
    const rider = this.rider, swift = this.swift, u = this.post.u;
    // whole-frame state: the flash, the dash smear and chroma, the fall's desaturation and dip
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.chroma = Math.max(0, (this.chroma || 0) - dt * 2.2);
    this.desat = rider.state === 'fallen' ? Math.min(1, this.desat + dt * 8) : Math.max(0, this.desat - dt * 3);
    // the dip: let the swift's dive be SEEN for a beat before the dark comes in
    const dipping = rider.state === 'fallen' && rider.freeze <= 0 && rider.respawnTimer < CFG.fail.dip - 0.3;
    this.dark = dipping ? Math.min(0.7, this.dark + dt * 3) : Math.max(0, this.dark - dt * 2.2);
    u.uFlash.value = this.flash; u.uFlashColor.value.setHex(this.flashColor || 0xffffff); if (this.flash < 0.02) this.flashColor = 0xffffff;
    u.uSmear.value = rider.dashEnergy * 0.3; u.uChroma.value = this.chroma * 0.4 + rider.dashEnergy * 0.1;
    u.uDesat.value = this.desat * 0.9; u.uDark.value = this.dark;
    u.uWarmth.value = -0.08 + this.world.dawn * 0.35 + rider.dashEnergy * 0.12;
    u.uExposure.value = (rider.state === 'fallen' && rider.freeze > 0 ? 0.55 : 1.0) + rider.dashEnergy * 0.12;
    this.hyper.update({ amount: rider.dashEnergy, speed: rider.speed, dt });
    // the swift's light on the water, the sky and water follow the camera
    this.world.update(dt, this.time, this.cam3.position, swift.pos, swift.lightPower);
    this.cam3.getWorldDirection(_v);
    if (!Number.isFinite(this.cam3.position.x + this.cam3.position.y + this.cam3.position.z + _v.x + _v.y + _v.z)) {
      if (!this._nanCam) { this._nanCam = true; console.error('ARC NaN camera', JSON.stringify({ cam: this.camera.pos.toArray(), yaw: this.camera.yaw, pitch: this.camera.pitch, rider: rider.pos.toArray(), rstate: rider.state, s: rider.s, rail: rider.rail && { tag: rider.rail.tag, total: rider.rail.total, pts: rider.rail.points.length }, swift: swift.pos.toArray(), sstate: swift.state })); }
      this.camera.pos.copy(rider.pos).add(new THREE.Vector3(0, 3, 6)); this.camera.yaw = rider.yaw; this.camera.pitch = -0.12; this.cam3.position.copy(this.camera.pos); _v.set(0, 0, -1);
    }
    this.audio.updateListener(this.cam3.position, _v, _u);
    this.renderer.info.reset();
    this.post.render(dt);
    this.draws = this.renderer.info.render.calls;
  }

  // ---- test API -------------------------------------------------------------------------------
  _exposeAPI() {
    const g = this;
    Object.assign(API, {
      ready: true, game: g, ctx: g.ctx, cfg: CFG, rider: g.rider, swift: g.swift, rail: g.rail, embers: g.embers, camera: g.camera, world: g.world, bosses: g.bosses, events: g.events.log, bus: g.events,
      state() { return { state: g.state, time: g.time, playTime: g.playTime, chapter: g.chapter, rider: { state: g.rider.state, pos: g.rider.pos.toArray(), vel: g.rider.vel.toArray(), speed: g.rider.speed, s: g.rider.s, railV: g.rider.railV, falls: g.rider.falls, thrown: g.rider.thrown, called: g.rider.called, chain: g.rider.chain, dash: g.rider.dashTimer, energy: g.rider.dashEnergy }, swift: { state: g.swift.state, pos: g.swift.pos.toArray(), charge: g.swift.charge, charging: g.swift.charging }, rail: { state: g.rail.state, total: g.rail.total, visEnd: g.rail.visEnd, points: g.rail.points.length, maxRidden: g.rail.maxRidden }, embers: { metres: g.embers.metres, segments: g.embers.segments.length }, camera: { yaw: g.camera.yaw, pitch: g.camera.pitch, fov: g.cam3.fov, pos: g.camera.pos.toArray() }, draws: g.draws, bosses: g.bosses.map(b => ({ tag: b.tag, active: b.active, dead: b.dead, lit: b.litCount })), ending: g.ending.phase, waterY: g.world.waterY, dawn: g.world.dawn, audio: g.audio.ready }; },
      start() { g.start(); }, pause() { g.pause(); }, resume() { g.resume(); },
      inject() { return g.input.inject(); },
      // deterministic stepping: n fixed steps with the current injected input, then one render
      step(n = 1, opts = {}) { const snap0 = g.input.poll(); for (let i = 0; i < n; i++) { const s = i === 0 ? snap0 : g._quiet(snap0); g.sim(DT, s); g.camera.update(DT, g.rider, s, g.time); } g.render(DT * n); return API.state(); },
      advance(seconds) { return API.step(Math.round(seconds / DT)); },
      warp(x, y, z, yaw = null) { if (!Number.isFinite(y)) { const h = g.world.heightAt(x, z); y = Number.isFinite(h) ? h + 0.05 : g.world.waterY + 2; } g.rider.pos.set(x, y, z); g.rider.vel.set(0, 0, 0); g.rider.state = 'air'; g.rider.rail = null; g.rider.lastSafe.pos.set(x, y, z); if (yaw !== null) { g.rider.yaw = yaw; g.camera.snapTo(yaw, -0.1); } g.swift.state = 'hand'; g.swift.charging = false; g.swift.pendingThrow = null; g.rail.vanish(); return API.state(); },
      look(yaw, pitch) { g.camera.snapTo(yaw, pitch ?? g.camera.pitch); },
      aim() { return g.camera.aimDir(new THREE.Vector3()).toArray(); },
      throw(charge = 1) { g.swift.startCharge(); g.swift.charge = charge; g.swift.release(g.camera.aimDir(_w), g.rider.vel, g.rider.hand(_v)); g.swift.pendingThrow.timer = 0; },
      call() { return g.swift.call(); },
      chapterOf(i) { return CHAPTERS[i]; },
      shot() { g.render(0.016); return g.canvas.toDataURL('image/png'); },
      audit() { return g.events.audit(); },
      draws() { return g.draws; },
      frames() { const d = g.dts.slice().sort((a, b) => a - b); return { n: d.length, avg: d.reduce((a, b) => a + b, 0) / (d.length || 1), p95: d[Math.floor(d.length * 0.95)] || 0 }; },
      freeze(v) { g.frozenClock = !!v; },
      setWater(y) { g.world.setWaterY(y); },
      chapters: CHAPTERS,
    });
    document.body.dataset.gameReady = 'true';
  }
}

try {
  const game = new Game();
  window.__ARC_GAME = game;
} catch (err) {
  API.bootError = String(err && err.stack || err);
  document.body.dataset.state = 'fatal';
  console.error(err);
}
