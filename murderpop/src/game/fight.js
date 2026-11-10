// A fight: one song, start to finish. The song is the clock. This runs the track's timeline, YOU, the boss,
// projectiles, telegraphs, waves and beams; resolves every hit; heals a heart at each new section; rewinds the
// record to the section's start when you die; lands the finish on the song's last hit, or calls an ENCORE.
// Shared rules every song gets: a pink hit on your held guard is stopped; pressed as it lands it's sent back
// (close: you cut her with it; far: the gold flies back). Strike her and keep striking and she answers on the
// next beat (a pink ring round her: block it, send it back, or get out). A finisher or a hit sent back knocks
// her into the set: a wall or a prop in the way hurts her and breaks what it can. The spotlight is your solo.
import * as THREE from 'three';
import { BeatMap } from '../engine/beats.js';
import { Timeline, inShape } from './choreo.js';
import * as PAT from './patterns.js';
import { Projectiles, COLORS } from './projectiles.js';
import { Telegraphs } from '../fx/telegraphs.js';
import { FEEL } from './player.js';
import { GroundMarks } from '../fx/rings.js';
import { Signs } from '../fx/signs.js';
import { Vocal } from './vocal.js';
import { LAYER } from './arena.js';
import { FXK } from '../engine/post.js';
import { trackById } from '../tracks/index.js';
import { makeKeepsake, KEEPSAKE_SIZE } from '../ui/keepsakes.js';
import { SetPieces } from './setpieces.js';
import { Finale } from './finale.js';
import { threats } from './threats.js';
import { Execution } from './execution.js';
import { HERO } from '../engine/herolight.js';
import { addXray } from '../engine/xray.js';

const WAVE_GEO = new THREE.CircleGeometry(1, 128);
function waveMaterial(color) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: color }, uInner: { value: 0.9 }, uOuter: { value: 1 }, uA: { value: 1 }, uFxK: FXK },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy; gl_Position = projectionMatrix * (viewMatrix * (modelMatrix * vec4(position,1.0))); }',
    fragmentShader: `uniform vec3 uC; uniform float uInner, uOuter, uA, uFxK; varying vec2 vUv;
      void main(){ float d = length(vUv); float w = fwidth(d);
        float band = smoothstep(uInner - w, uInner + w, d) * (1.0 - smoothstep(uOuter - w, uOuter + w, d));
        float edge = (1.0 - smoothstep(0.0, w * 3.0, abs(d - uOuter))) ;
        float a = (band * 0.55 + edge * 0.9) * uA; if (a < 0.01) discard; gl_FragColor = vec4(uC * a * uFxK, a); }` });
}
const COPPER = new THREE.Color(2.3, 1.25, 0.6), GOLD = new THREE.Color(3.2, 2.0, 0.55), PINK = new THREE.Color(4, 0.6, 1.7), WHITE = new THREE.Color(2.6, 2.9, 3.4), PORCELAIN = new THREE.Color(2.2, 2.1, 2.0);
const SOLO_BEATS = 8;
// a guard pressed this long after a pink hit lands still catches it (hands come in a little behind the beat as often as ahead)
const LATE = 0.075;
// her health under the shared rules (hits sent back, finishers, the solo, the room's ornaments), on top of each track's
// own: set so the good bot empties her bar at about 40% of the song (it plays on the beat and catches everything)
const HEALTH = { 'sexy-trauma-costume': 2.1, 'rent-free': 1.65, 'makeup-sex-at-your-funeral': 1.95, 'try-me-free': 1.9, 'ptsdream-girl': 1.09,
  'reverse-psychology-degree': 1.8, 'pretty-until-proven-guilty': 2.1, 'kiss-me-like-a-car-crash': 1.15, 'i-fucked-your-dad': 1.7,
  'your-car-is-at-the-bottom-of-the-lake': 1.5 };
const _SP = new THREE.Vector3(), _SOLO_LIT = new THREE.Color(1.0, 0.82, 0.6);
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

export class Fight {
  // app: { renderer, post, scene, cam (ArenaCamera), input, audio, sfx, hud, fx }
  constructor(app, track) {
    this.app = app; this.track = track;
    this.scene = app.scene; this.cam = app.cam; this.input = app.input; this.audio = app.audio; this.sfx = app.sfx; this.hud = app.hud; this.fx = app.fx;
    this.cam.reset(); app.post.fx.letterbox = 0;
    this.pat = PAT;
    this.t = 0; this.dt = 0; this.beat = 0.5;
    this.state = 'loading';      // loading | intro | play | dying | rewinding | finishing | encore | done | paused
    this.waves = []; this.beams = [];
    this.score = 0; this.mult = 1; this.chain = 0;
    this.rewinds = 0; this.encores = 0;
    this.suppress = false; this.spotUntil = -1;
    this.manual = false;          // stepped clock (capture/tests)
    this.events = [];             // hooks for tracks: onSection, onBreak...
    this.lastSection = null;
    this.resultCb = null;
    // ENCORE (after the finale): three hearts and none back, she's sturdier, her telegraphs come later
    this.encoreMode = !!(app.settings && app.settings.encore && app.progress && app.progress.encore);
    this.maxHearts = this.encoreMode ? 3 : FEEL.hearts;
  }

  // ---------------- loading ----------------
  async load(onProgress = () => {}) {
    const tr = this.track;
    const [bm, chords, acc] = await Promise.all([
      fetch(`data/beats/${tr.beats}.json`).then((r) => r.json()),
      fetch(`data/chords/${tr.beats}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`data/accents/${tr.beats}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    this.bm = new BeatMap(bm); this.chords = chords;
    if (tr.downbeat !== undefined) this.bm.downbeat = tr.downbeat;
    this.bm.setAccents(acc);
    // the song's own moments, in order: its big hits (the strongest of them), and where it steps up
    this.songHits = acc ? acc.hits.filter((h) => h.k >= 0.72).map((h) => ({ ...h })) : [];
    this.songLifts = acc ? acc.lifts.map((h) => ({ ...h })) : [];
    this._hitI = 0; this._liftI = 0;
    this.sfx.attach && this.sfx.attach(this);
    this.duration = tr.duration || this.bm.duration;
    onProgress(0.1);
    const songP = this.audio.loadSong(`assets/music/${tr.beats}`, this.bm.duration, (k) => onProgress(0.1 + k * 0.5));
    // the world
    this.proj = new Projectiles(this.scene);
    this.tele = new Telegraphs(this.scene);
    this.marks = new GroundMarks(this.scene);
    this.signs = new Signs(this.scene);
    this.vocal = await Vocal.load(tr.beats);
    // while the spotlight is on her she can't attack, and once her bar is empty she's beaten: nothing she does can
    // hurt you any more (Alex: "It would feel awful to lose after the boss is already defeated"). Her spawns and
    // telegraphs fizzle.
    const spawn = this.proj.spawn.bind(this.proj), tadd = this.tele.add.bind(this.tele);
    this.proj.spawn = (o) => ((o.owner || 'boss') === 'boss' && (this.suppress || this.harmless) ? null : spawn(o));
    this.tele.add = (o) => ((this.suppress || this.harmless) && o.kind !== 'gold' ? { dead: true } : tadd(o));
    this.player = this.app.player;
    // a material a track throws away mid-song keeps its shader until the fight ends: otherwise the next thing made
    // the same way compiles it again, and the game stops for a moment (each such stop was 60-150 ms)
    const MP = THREE.Material.prototype, deferred = this._deferredDispose = [];
    this._matDispose = MP.dispose;
    MP.dispose = function () { deferred.push(this); };
    this.arena = await tr.buildArena(this);
    // floor telegraphs and shot shadows are decals: drawn, but not doubled in a mirror floor
    this.cam.cam.layers.enable(LAYER.NO_REFLECT); this.tele.mesh.layers.set(LAYER.NO_REFLECT); this.proj.dots.layers.set(LAYER.NO_REFLECT);
    this.bounds = this.arena.bounds;
    this.cam.bounds = this.bounds;
    const room = this.arena.room || (this.arena.arena && this.arena.arena.room);
    this.cam.roomMaxZ = room && room.max ? room.max.z : undefined;
    // the set's height and back wall: the camera never looks over the top of it
    const rl = (v) => (Array.isArray(v) ? { x: v[0], y: v[1], z: v[2] } : v);
    this.cam.room = room && room.max && room.min ? { top: tr.setTop ?? rl(room.max).y, backZ: rl(room.min).z } : null;
    if (room && room.max && this.cam.roomMaxZ === undefined) this.cam.roomMaxZ = rl(room.max).z;
    onProgress(0.7);
    this.boss = await tr.buildBoss(this);
    this.player = this.app.player;
    this.player.arena = this.arena;
    const hk = HEALTH[tr.id] || 1;
    if (hk !== 1) { this.boss.maxHp = Math.round(this.boss.maxHp * hk); this.boss.hp = this.boss.maxHp; }
    if (this.encoreMode) { this.boss.maxHp = Math.round(this.boss.maxHp * 1.25); this.boss.hp = this.boss.maxHp; }
    onProgress(0.8);
    // the two of you show through whatever of the set stands in front of you (engine/xray.js)
    try {
      if (!this.app._youXray) this.app._youXray = addXray(this.player.root, new THREE.Color(1.7, 0.9, 0.42));
      this.herXray = addXray(this.boss.root, new THREE.Color(1.9, 0.45, 1.0));
    } catch (e) { console.warn('xray', e.message); }
    // a porcelain figurine's shaders (glaze, cracks, the shatter) compile now, not on the first hit
    if (this.boss.fig && this.boss.fig.prepare) { try { await this.boss.fig.prepare(this.app.renderer, this.cam.cam, this.scene); } catch (e) { console.warn('figurine prepare', e.message); } }
    onProgress(0.85);
    this.buffer = await songP;
    // the game sounds' level for this song (tracks that duck the sfx bus put it back to f.sfxLevel), and the song's
    // loudness over time: the effects step back in its quiet passages
    this.sfxLevel = this.audio.levelFor ? this.audio.levelFor(this.buffer) : 0.6;
    this.audio.sfx.gain.value = this.sfxLevel;
    this.songEnv = this.audio.loudness ? this.audio.loudness(this.buffer) : null;
    // the script
    this.T = new Timeline(this.bm);
    tr.script(this.T, this);
    this.T.compile();
    this.lastHit = tr.lastHit ?? this._findLastHit();
    this.finalChorus = this.T.sections.find((s) => s.final) || this.T.sections[this.T.sections.length - 2] || this.T.sections[0];
    this.setPieces = new SetPieces(this);
    this.finale = new Finale(this); this.heat = 0;
    this.exec = new Execution(this);
    this.boss.on('hit', (h) => this._bossHit(h));
    this.boss.on('break', (b) => this._bossBreak(b));
    this.boss.on('deflect', (h) => this._deflect(h));
    this.boss.on('harden', (h) => this._harden(h));
    this.boss.on('crack', (h) => this._crack(h));
    this.boss.on('empty', () => this._bossEmpty());
    onProgress(1);
  }

  _findLastHit() {
    // the loudest beat in the last 12 seconds, as a default for the finish
    const n = this.bm.n, e = this.bm.energy;
    let best = n - 1, bv = -1;
    for (let i = n - 1; i >= 0 && this.bm.beats[i] > this.bm.duration - 12; i--) if ((e[i] || 0) > bv) { bv = e[i]; best = i; }
    return this.bm.beats[best];
  }

  // ---------------- run ----------------
  start(at = 0) {
    this.state = 'play';
    this.player.walk = false; this.player.maxHearts = this.maxHearts; this.player.minHearts = 0;
    this.player.revive(); this.player.inv = 0; this.player.hearts = Math.min(this.player.hearts, this.maxHearts);
    const sp = this.track.spawn || { player: [0, 4.5, Math.PI], boss: [0, -3.5, 0] };
    if (at <= 0.01) { this.player.place(...sp.player); this.boss.place(...sp.boss); this.track.onStart && this.track.onStart(this); }
    this.setPieces.reset();
    this.cam.snap(this.player, this.boss);
    this.boss._now = at; this.boss.busyUntil = 0;
    this.T.seek(at);
    this.checkpoint = { t: this.T.sectionAt(at)?.t0 ?? 0, boss: this.boss.snapshot(), score: this.score };
    this.lastSection = this.T.sectionAt(at);
    this.t = at;
    if (!this.manual) this.audio.play(this.buffer, at, at > 0 ? 0.05 : 0);
    this.hud.setBoss(this.boss.name, this.boss.notches);
    this.hud.show(true);
    this.app.post.fx.fade = 1; this.app.post.fx.fadeColor.set(0, 0, 0); this._fadeIn = 1;
  }

  // f.after(seconds, fn): run fn that many song seconds from now
  after(sec, fn) { this.T.after(this.t + sec, fn); }
  at(t, fn) { this.T.after(t, fn); }
  sign(text, o = {}) { const t0 = o.at !== undefined ? this.T.time(o.at) : this.t; const t1 = o.until !== undefined ? this.T.time(o.until) : t0 + (o.hold ?? 4); return this.signs.add({ text, ...o, t0, t1 }); }
  pan(x) { return Math.max(-1, Math.min(1, (x - this.cam.focus.x) / 11)); }
  cue(kind, at) { if (this.suppress || this.harmless) return; this.sfx.cue && this.sfx.cue(kind || 'white', this.pan(at?.x ?? 0)); }
  get bpmBeat() { return this.beat; }

  update(now, dtReal) {
    const dt = Math.min(0.05, dtReal);
    this.dt = dt;
    if (this.state === 'paused' || this.state === 'loading' || this.state === 'done') return;
    // (last frame's juggle comes off her first: her track sets her height and place as if she weren't up there)
    if (this._airOn) { const o = this._airOn, r = this.boss.root; r.position.x -= o.dx; r.position.y -= o.dy; r.position.z -= o.dz; r.rotation.z = 0; this._airOn = null; }
    // the song clock
    if (this.manual) { if (this.state === 'play' || this.state === 'intro') this.t += dt; }
    else if (this.state === 'play') this.t = this.audio.time(now);
    this.beat = this.bm.periodAt(this.t);
    const ctx = this._ctx(dt);

    if (this.state === 'play') {
      // sections: checkpoint, heal
      const sec = this.T.sectionAt(this.t);
      if (sec && sec !== this.lastSection) this._enterSection(sec);
      // spotlight ends
      if (this.spotUntil > 0 && this.t >= this.spotUntil) this._endSpotlight();
      this.T.advance(this.t, this);
      this._counterCheck();
    }
    // once her bar is empty she's beaten: her attacks are gone, and nothing (a set's own hazard included) takes your last heart
    this.harmless = this.boss.hp <= 0;
    this.player.minHearts = this.harmless ? 1 : 0;
    // (practice from a section where she's already beaten: the finale is on from the start)
    if (this.harmless && !this.finale.on && this.state === 'play' && this.boss.state !== 'finished') this.finale.start();
    if (this.audio.sfxDuck && this.songEnv) this.audio.sfxDuck.gain.setTargetAtTime(this.audio.duckAt(this.songEnv, this.t), this.audio.ctx.currentTime, 0.12);
    if (this.app._youXray) this.app._youXray.update(1);
    if (this.herXray) this.herXray.update(this.boss.intangible || this.boss.state === 'finished' ? 0 : 1);
    // her death scene, once it's on, moves the two of you (and the light on the two of you comes up for it)
    this.exec.update(dt);
    HERO.k += ((this.exec.on ? 0.8 : this.spotUntil > 0 ? 0.6 : this.track.heroLight ?? 0.42) - HERO.k) * Math.min(1, dt * 4);
    this.hud.qte && this.hud.qte(this.exec.prompt);
    // entities
    this.boss.airY = this.air && this.air.up ? this.air.y : 0;
    this.player.update(ctx);
    this.cam.youY = this.player.y;
    this.boss.beatPulse = this.bm.pulse(this.t, 6);
    this.boss.nod = this.bm.strikePulse(this.t, 5);
    this.boss.update(dt, this.t, this.beat, this.player);
    this.setPieces.update(dt);
    this.finale.update();
    this.proj.update(dt, this.bounds, (p) => this._projHit(p, ctx));
    this._waves(dt, ctx); this._beams(ctx);
    this.tele.update(this.t, this.bm.pulse(this.t, 7));
    // what's about to land on YOU: a ring closing on you for each (and the guard turns to face the first)
    const th = this.state === 'play' ? threats(this) : [];
    this.threats = th;
    this.fx.drawNotes && this.fx.drawNotes(th, this.player, this.bm.tickPeriod(this.t));
    const first = th.find((n) => n.kind === 'pink') || null;
    this.player._threatAng = first && first.tl < 0.7 ? Math.atan2(first.x - this.player.x, first.z - this.player.z) : null;
    this._lateUpdate(ctx);
    this.proj.draw(this.t);
    this.signs.update(this.t);
    this.marks.update(this.player, this.boss, this.player.dashCharges, this.player.dashCool, FEEL.dashCharges, FEEL.dashRecharge, this.bm.tickPulse(this.t, 7) * (this.bm.accent(Math.floor(this.bm.tickAt(this.t))) ? 1 : 0.5));
    // the song's words come out of the narrator's mouth; in the spotlight, out of YOU's (it's her song for two bars)
    const sing = this.state === 'play' ? this.vocal.at(this.t, dt) : 0, solo = this.spotUntil > 0;
    if (this.boss.fig && this.boss.fig.setMouth) this.boss.fig.setMouth(solo ? 0 : sing);
    if (this.player.h.setMouth) this.player.h.setMouth(solo ? sing : 0);
    this.cam.soloK = (this.cam.soloK || 0) + ((solo ? 1 : 0) - (this.cam.soloK || 0)) * Math.min(1, dt * (solo ? 4 : 2.5));
    this._keepsake(dt);
    this.arena.update && this.arena.update(dt, this.t, this);
    this.track.update && this.track.update(this, dt);
    this._soloLook(dt);
    // her stun after three counters in a row holds her attacks for the bar: then they come again
    if (this._stunHold && this.t >= this._stunHold) { this._stunHold = 0; if (this.spotUntil <= 0) this.suppress = false; }
    this._airUpdate(dt);
    // death
    if (this.player.state === 'dead' && this.state === 'play') this._die();
    // the end of the song
    if (this.state === 'play' && this.t >= this.lastHit - 0.005 && !this._ended && !(this.exec.on && !this.exec.done)) this._songEnd();
    // camera, fx, hud
    this.cam.closeK += ((this.lastSection && this.lastSection.close ? 1 : 0) - this.cam.closeK) * Math.min(1, dt * 2);
    this.cam.update(dt, this.player, this.boss.state === 'gone' ? null : this.boss);
    this.fx.update(dt, this.cam.cam.position, this.player);
    if (this.chain > 0 && this.t - this._lastGood > 4) { this.chain = Math.max(0, this.chain - 1); this._lastGood = this.t; this._mult(); }
    this.hud.update(dt, { hpK: this.boss.hpK, empty: this.boss.state === 'desperate', hearts: this.player.hearts, maxHearts: this.maxHearts, meter: this.player.meter, spot: this.spotUntil > 0, score: this.score, mult: this.mult, beatPulse: this.bm.pulse(this.t) });
    // your combo's heat (0..4): it raises your damage and how fast the spotlight fills, and how hard the room dances
    this.heat = Math.max(0, [1, 2, 4, 6, 8].indexOf(this.mult)); this.player.heat = this.heat;
    this.hud.chain(this.chain, this.mult);
    this.hud.finale(this.finale.on && this.state !== 'done', this.finale.bank, this.finale.mult, this.finale.kept, this.t - this.finale.dropT < 0.5 ? -1 : this.t - this.finale.upT < 0.5 ? 1 : 0);
    // the spotlight is yours to take: a Q over YOU's head, on the beat
    if (this.player.meter >= 1 && this.spotUntil <= 0 && this.state === 'play') { const sp = this.cam.toScreen(_SP.set(this.player.x, 2.05, this.player.z)); this.hud.keycap(true, sp.x, sp.y, this.bm.strikePulse(this.t, 5)); }
    else this.hud.keycap(false);
    this.fx.drawTargets(this.finale.on && (this.state === 'play' || this.state === 'finishing') && this.boss.state !== 'finished' ? this.finale.drawList() : [], this.bm.strikePulse(this.t, 6));
    this._coach();
    // the room's lamps and neon brighten on the beat, more the hotter your combo
    const A = this.arena && (this.arena.arena || this.arena);
    const heatK = this.finale.down ? 4 : this.heat;
    if (A && A.setBeat) A.setBeat(this.state === 'play' || this.state === 'finishing' ? (0.24 + 0.13 * heatK) * this.bm.drumPulse(this.t, 6) * 1.25 : 0);
    this._songMoments();
    if (this._finishT !== undefined && this.cam.override) {
      this._finishT += dt;
      const k = this._finishT < 0.35 ? this._finishT / 0.35 : this._finishT < 3.2 ? 1 : Math.max(0, 1 - (this._finishT - 3.2) / 1.2);
      this.cam.override.k = 0.7 * k * k * (3 - 2 * k);
      this.app.post.fx.letterbox = 0.5 * k;
      if (k <= 0 && this._finishT > 3.2) { this.cam.override = null; this.app.post.fx.letterbox = 0; this._finishT = undefined; }
    }
    // the picture comes up fast: the first beat of the song is yours (the loading veil is fading over it too)
    this._firstDraws();
    if (this._fadeIn > 0) { this._fadeIn = Math.max(0, this._fadeIn - dt / 0.2); this.app.post.fx.fade = this._fadeIn * this._fadeIn; }
    this.audio.muffle(this._muffle > 0 ? 0.6 : 0);
    if (this._muffle > 0) this._muffle -= dt;
  }

  // something new in the picture (made mid-song: a thrown package, a set piece) has never been drawn: its shader
  // compiles in the background while it stays out of the picture for a frame or two, instead of the whole game
  // stopping 60-200 ms to compile it on the spot. (Things that exist at load compile then, in main.js _warm.)
  _firstDraws() {
    const r = this.app.renderer, cam = this.cam.cam, scene = this.scene;
    if (!r.compileAsync) return;
    const held = this._held ||= new Map();
    scene.traverseVisible((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite) || held.has(o) || !o.layers.test(cam.layers)) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      let wait = false;
      for (const m of ms) {
        if (!m || m._mpReady) continue;
        const pr = r.properties.get(m);
        if (pr.programs && pr.programs.size) { m._mpReady = true; continue; }
        wait = true;
      }
      if (!wait) return;
      held.set(o, o.layers.mask); o.layers.mask = 0;
      const prev = r.getRenderTarget(); r.setRenderTarget(this.app.post.target);
      let job; try { job = r.compileAsync(o, cam, scene); } catch (e) { job = Promise.resolve(); }
      r.setRenderTarget(prev);
      job.catch(() => {}).then(() => { for (const m of ms) if (m) m._mpReady = true; if (held.has(o)) { o.layers.mask = held.get(o); held.delete(o); } });
    });
  }
  _ctx(dt) {
    const m = this.input.mouse;
    if (!this._aim) this._aim = new THREE.Vector3();
    this.cam.floorPoint(m.x, m.y, this._aim);
    return { dt, t: this.t, input: this.input, aim: this._aim, boss: this.boss, projectiles: this.proj, beats: this.bm, fx: this.fx, sfx: this.sfx, arena: this.arena, hud: this.hud,
      onSpotlight: () => this._spotlight(), onPlayerLanded: (s, res, on, counter, at) => this._landed(s, res, on, counter, at),
      onShock: (x, z, r, s) => this._shock(x, z, r, s), onWhiff: (s, deflected) => this._whiff(s, deflected), onStrikeStart: (s) => this._strikeStart(s),
      things: () => (this.arena && this.arena.strikeables ? this.arena.strikeables() : null),
      onStrikeArc: (x, z, ang, range, arc, s) => { this.arena.strikeArc && this.arena.strikeArc(x, z, ang, range, arc, s, this); this.setPieces && this.setPieces.strikeArc(x, z, ang, range, arc, s); } };
  }

  // ---------------- hits ----------------
  _projHit(p, ctx) {
    if (p.owner === 'deco') return;   // things in the air that only look (a lob's package)
    const pl = this.player;
    if (p.owner === 'boss') {
      const d = Math.hypot(p.x - pl.x, p.z - pl.z);
      // the catch reaches a little further than your body
      if (p.parryable && pl.catching && d < FEEL.catchRadius) {
        const q = pl.tryCatch();
        if (q) {
          pl.caught(q, ctx);
          this.proj.reflect(p, this.boss, { speed: q === 'perfect' ? 1.7 : 1.35, damage: q === 'perfect' ? 2 : 1.4 });
          p.dmgBack = (q === 'perfect' ? 22 : 15);
          this.fx.caught(p.x, p.y, p.z, q === 'perfect');
          this.sfx.catch && this.sfx.catch(q, this.pan(p.x));
          this._glimmer(q === 'perfect' ? 2 : 1, true);
          this._good(q === 'perfect' ? 120 : 70);
          this._pop('+' + Math.round((q === 'perfect' ? 120 : 70) * this.mult).toLocaleString('en-US'), pl.x, 2.5, pl.z, q === 'perfect' ? 'gold' : '');
          return;
        }
      }
      if (d < p.radius + FEEL.radius) {
        // up over it: a shot goes under your feet
        if (pl.y > (p.y ?? 1) + 0.2) { if (!p._over) { p._over = true; this._over(p.x, p.z); } return; }
        if (pl.untouchable) { if (pl.state === 'dash' && !p._nm) { p._nm = true; pl.nearMiss(ctx); this._good(60); } return; }
        // a pink shot on the held guard: stopped
        if (p.parryable && pl.blocking) { p.dead = true; this._block(p.x, p.z, { power: 0.5 }); return; }
        // a pink shot that got there before the guard did: it has you in a moment, unless the guard comes up just behind it
        if (p.parryable && !this._late && !pl.invulnerable) { p.dead = true; this._late = { until: this.t + LATE, x: p.x, z: p.z, damage: p.damage, shot: p, why: 'shot' }; return; }
        if (pl.hurt(ctx, p.damage, p.x, p.z, 'shot')) { this._hurt(p.x, p.z); }
        p.dead = true;
      }
    } else {
      const b = this.boss;
      if (!b.targetable) return;
      if (Math.hypot(p.x - b.x, p.z - b.z) < p.radius + b.radius) {
        const res = b.takeHit({ dmg: p.dmgBack || 14, kind: 'return', heavy: (p.dmgBack || 0) > 20, from: pl, x: p.x, z: p.z, onBeat: false });
        if (res.landed) { this._good(90); this.sfx.returnHit && this.sfx.returnHit(this.pan(p.x)); if (p.dmgBack) this._counterStun(); }
        p.dead = true;
      }
    }
  }

  // an area landing now: returns 'hit' | 'parried' | 'dodged' | 'miss'
  resolveArea(sh, o = {}) {
    if (this.suppress || this.harmless) return 'miss';
    if (o.tele && o.tele.dead) return 'miss';   // its telegraph was cleared: nothing lands that you can't see
    const pl = this.player;
    // whatever of the room's is under it shatters
    this.setPieces && this.setPieces.areaHit(sh);
    if (!inShape(sh, pl.x, pl.z, FEEL.radius * 0.8)) return 'miss';
    if (o.kind === 'pink' && pl.catching) {
      const q = pl.tryCatch();
      if (q) {
        this.lastCatch = q;
        pl.caught(q, this._ctx(0));
        if (o.melee) this.boss.open(q === 'perfect' ? 1.4 : 0.9);
        this.fx.caught(pl.x, 1.2, pl.z, q === 'perfect');
        this.sfx.parry && this.sfx.parry(q, this.pan(pl.x));
        this._glimmer(q === 'perfect' ? 2 : 1, true);
        this._good(q === 'perfect' ? 150 : 90);
        // a hit of her body, turned on her: a cut if she's close, the gold back at her if she isn't
        if (o.melee || o.counter) this._sendBack(q);
        this._pop('+' + Math.round((q === 'perfect' ? 150 : 90) * this.mult).toLocaleString('en-US'), pl.x, 2.5, pl.z, q === 'perfect' ? 'gold' : '');
        if (q === 'perfect') this.fx.ring && this.fx.ring(pl.x, pl.z, GOLD, 1.8);
        return 'parried';
      }
    }
    // the held guard stops anything pink
    if (o.kind === 'pink' && pl.blocking && !pl.invulnerable) { this._block(sh.x, sh.z, { power: o.melee ? 1 : 0.7 }); return 'blocked'; }
    if (pl.invulnerable) { if (pl.state === 'dash') { pl.nearMiss(this._ctx(0)); this._good(70); } else if (pl.airborne) this._over(pl.x, pl.z); return 'dodged'; }
    // a pink hit with no guard up: it lands (the track is told so now), but the heart goes a moment later, and not at
    // all if the guard comes up just behind the beat
    if (o.kind === 'pink' && !this._late && pl.state !== 'dead') { this._late = { until: this.t + LATE, x: sh.x, z: sh.z, damage: o.damage ?? 1, o, why: o.melee ? 'melee' : 'area' }; return 'hit'; }
    if (pl.hurt(this._ctx(0), o.damage ?? 1, sh.x, sh.z, o.melee ? 'melee' : 'area')) { this._hurt(sh.x, sh.z); return 'hit'; }
    return 'miss';
  }

  // the hit that's a moment from landing (see LATE): caught if the guard came up in time, else it lands
  _lateUpdate(ctx) {
    const L = this._late; if (!L) return;
    const pl = this.player;
    if (pl.state === 'dead' || this.harmless) { this._late = null; return; }
    if (pl.catching) {
      this._late = null;
      const q = 'good';
      pl.caught(q, ctx);
      this.lastCatch = q;
      this.fx.caught(pl.x, 1.2, pl.z, false);
      this.sfx.parry && this.sfx.parry(q, this.pan(pl.x));
      this._glimmer(1, true); this._good(80);
      this._pop('+' + Math.round(80 * this.mult).toLocaleString('en-US'), pl.x, 2.5, pl.z, '');
      if (L.o && L.o.melee) this.boss.open(0.9);
      if (L.shot || (L.o && (L.o.melee || L.o.counter))) this._sendBack(q);
      return;
    }
    if (pl.blocking) { this._late = null; this._block(L.x, L.z, { power: 0.7 }); return; }
    if (this.t >= L.until) {
      this._late = null;
      if (pl.invulnerable) return;
      if (pl.hurt(ctx, L.damage, L.x, L.z, L.why)) this._hurt(L.x, L.z);
    }
  }

  addWave(w) { if (!this.suppress && !this.harmless) this.waves.push(w); }
  _waves(dt, ctx) {
    const pl = this.player;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      w.r += w.speed * dt;
      if (!w.mesh) {
        const pool = (this._wavePool ||= { pink: [], white: [] })[w.kind === 'pink' ? 'pink' : 'white'];
        w.mesh = new THREE.Mesh(WAVE_GEO, pool.pop() || waveMaterial(w.kind === 'pink' ? PINK : WHITE));
        w.mesh.rotation.x = -Math.PI / 2; w.mesh.position.set(w.x, 0.06, w.z); w.mesh.renderOrder = 4; this.scene.add(w.mesh);
      }
      w.mesh.scale.setScalar(w.r + 0.1);
      const u = w.mesh.material.uniforms; u.uInner.value = Math.max(0, (w.r - w.band) / (w.r + 0.1)); u.uOuter.value = w.r / (w.r + 0.1); u.uA.value = Math.max(0, 1 - w.r / w.max);
      const d = Math.hypot(pl.x - w.x, pl.z - w.z);
      if (!w.hit && Math.abs(d - (w.r - w.band / 2)) < w.band / 2 + FEEL.radius * 0.6) {
        if (pl.invulnerable) { if (pl.state === 'dash' && !w.nm) { w.nm = true; pl.nearMiss(ctx); this._good(60); } else if (pl.airborne && !w.nm) { w.nm = true; this._over(pl.x, pl.z); } }
        else { w.hit = true; if (pl.hurt(ctx, w.damage, w.x, w.z, 'wave')) this._hurt(w.x, w.z); }
      }
      if (w.r > w.max) { this._dropWave(w); this.waves.splice(i, 1); }
    }
  }
  _dropWave(w) { if (!w.mesh) return; this.scene.remove(w.mesh); (this._wavePool ||= { pink: [], white: [] })[w.kind === 'pink' ? 'pink' : 'white'].push(w.mesh.material); w.mesh = null; }
  addBeam(b) { if (!this.suppress && !this.harmless) this.beams.push(b); }
  _beams(ctx) {
    const pl = this.player;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      if (this.t > b.tOff) { if (b.mesh) { this.scene.remove(b.mesh); b.mesh.geometry.dispose(); } this.beams.splice(i, 1); continue; }
      if (this.t < b.tOn) continue;
      const k = (this.t - b.tOn) / (b.tOff - b.tOn), a = b.a0 + (b.a1 - b.a0) * k;
      if (!b.mesh) {
        const g = new THREE.PlaneGeometry(b.w * 2, b.h); g.translate(0, b.h / 2, 0); g.rotateX(Math.PI / 2);
        b.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: b.kind === 'pink' ? PINK : WHITE, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        b.mesh.position.set(b.src.x, 0.08, b.src.z); this.scene.add(b.mesh);
        this.sfx.beam && this.sfx.beam(this.pan(b.src.x));
      }
      b.mesh.rotation.y = a; b.mesh.material.opacity = 0.85 * Math.min(1.2, FXK.value);
      const sh = { shape: 'rect', x: b.src.x, z: b.src.z, angle: a, w: b.w, h: b.h };
      if ((b.cool || 0) <= this.t && inShape(sh, pl.x, pl.z, FEEL.radius * 0.7)) {
        if (pl.invulnerable) { if (pl.state === 'dash') pl.nearMiss(ctx); }
        else if (pl.hurt(ctx, b.damage, b.src.x, b.src.z, 'beam')) { this._hurt(b.src.x, b.src.z); b.cool = this.t + 0.8; }
      }
    }
  }

  // ---------------- feedback ----------------
  _hurt(x, z) {
    this._muffle = 0.35; this.chain = 0; this._mult(); this.cRun = 0;
    this.cam.shake(1.0, 0.22); this.cam.kick(1.5);
    this.fx.flash(new THREE.Color(0.42, 0.14, 0.24), 1); this.fx.aberrate(2.2);
    this.fx.sparks(this.player.x, 1.1, this.player.z, PINK, 14);
    this.sfx.hurt && this.sfx.hurt(this.pan(this.player.x), this.player.hearts);
  }
  _good(points) { const was = this.mult; this.chain++; this._chainMax = Math.max(this._chainMax || 0, this.chain); this._lastGood = this.t; this._mult(); this.score += Math.round(points * this.mult); if (this.mult > was) this._tierUp(); }
  // the combo's multiplier goes up: a ring of gold off YOU and the chord climbing
  _tierUp() {
    const pl = this.player;
    this.fx.ring && this.fx.ring(pl.x, pl.z, GOLD, 2.4); this.fx.glitter(pl.x, 1.3, pl.z, GOLD, 16, 0.6);
    this._glimmer(2, false); this.after(0.08, () => this._glimmer(3, false));
  }
  // points as they're scored, where they were scored
  _pop(text, x, y, z, cls = '') { const sp = this.cam.toScreen(_SP.set(x, y, z)); this.hud.pop(text, sp.x, sp.y, cls); }
  _mult() { this.mult = this.chain >= 40 ? 8 : this.chain >= 24 ? 6 : this.chain >= 14 ? 4 : this.chain >= 6 ? 2 : 1; }

  // A strike of yours landed. Every one lands on the tick, so every one is solid: copper and ivory. Pressed on the tick
  // it's gold, with a note of the chord, and hits harder. The heavy ones stop the picture for a moment.
  _landed(s, res, on, counter, at) {
    const b = this.boss, pl = this.player, d = s.def || {};
    const x = at ? at.x : b.x, z = at ? at.z : b.z;
    const dir = s.ang ?? Math.atan2(b.x - pl.x, b.z - pl.z);
    const ring = s.name === 'ring';
    const big = !!(s.finisher || s.riposte), heavy = !!(s.heavy || counter || big);
    // a plain strike while she's performing counts toward her answer (an opening, a stagger, the solo don't)
    if (!ring && !big && b.state === 'perform' && !pl.solo) (this._landedAt ||= []).push(this.t);
    const fat = on && (s.big || ring || pl.solo);
    // the finale: the rings are the event; strikes between them are small (she's already beaten); up in the air, a juggle
    const up = !!(this.air && this.air.up), hy = up ? this.air.y : 0;
    const fin = this.finale.on && !ring && !s.finaleDone ? this.finale.struck(s, on, this.t, up) : null, small = fin && !fin.perfect && !heavy;
    const fk = small ? 0.6 : 1, yy = 1.25 + hy;
    // tier: 0 a ring, 1 solid, 2 on the tick, 3 heavy, 4 the finisher / the cut sent back
    const tier = big ? 4 : heavy ? 3 : on ? 2 : ring ? 0 : 1;
    const hot = on ? GOLD : COPPER;
    this.fx.sparks(x, yy, z, hot, Math.round([8, 14, 22, 30, 46][tier] * fk), dir);
    this.fx.chips(x, yy, z, PORCELAIN, Math.round([3, 6, 9, 14, 24][tier] * fk), dir);
    if (on && !small) this.fx.glitter(x, yy + 0.1, z, GOLD, big ? 26 : fat ? 12 : 6, big ? 0.8 : 0.3);
    this.fx.impact && this.fx.impact(x, yy, z, dir, { gold: on, power: [0.6, 0.95, 1.25, 1.6, 2.3][tier] * (small ? 0.7 : 1), tilt: d.tilt, sweep: s.sweep });
    // the picture stops with the blow: her, you, and the camera's knock
    // (with the drum under it: the tick's kick or snare, measured from the song)
    const dr = s.k !== undefined ? this.bm.drumAt(s.k) : 0.5, dk = 0.8 + 0.45 * dr;
    const stop = [0.03, 0.055, 0.07, 0.1, 0.14][tier] * (small ? 0.6 : 1) * (0.9 + 0.25 * dr);
    if (b.rig && b.rig.hitStop) b.rig.hitStop(stop);
    b.shove && b.shove(dir, [0.14, 0.42, 0.52, 0.8, 1.1][tier] * (small ? 0.6 : 1), tier >= 3);
    this.cam.shake([0.12, 0.26, 0.4, 0.62, 1.0][tier] * dk, tier >= 4 ? 0.2 : 0.12);
    this.cam.punch && this.cam.punch(dir, [0.15, 0.5, 0.75, 1.1, 1.7][tier] * dk);
    if (tier >= 3) this.cam.kick(tier >= 4 ? 2.4 : 1.1);
    if (big && !small) { this.fx.flash(new THREE.Color(0.16, 0.11, 0.03), 1); this.fx.aberrate(1.8); }
    else if (tier === 3) this.fx.flash(new THREE.Color(0.07, 0.05, 0.02), 1);
    this.sfx.hit && this.sfx.hit({ heavy: tier >= 3, onBeat: on, kind: s.name, pan: this.pan(x), crit: big, tier, accent: !!s.big, move: s.move, drum: dr });
    if (big) this.sfx.goldBurst && this.sfx.goldBurst(this.pan(x));
    if (on && !this.finale.on) this._glimmer(big ? 2 : fat ? 1 : 0, false);
    this._good(fin ? 0 : [10, 20, 40, 60, 120][tier]);   // (in the finale the points are the finale's)
    if (big && !this.finale.on) this._pop('+' + Math.round(120 * this.mult).toLocaleString('en-US'), x, 2.3 + hy, z, 'gold');
    // the finale: a ring closing on her as you land it is the big points (the last one, the final blow); a strike off
    // the beat takes a step of its multiplier
    if (fin && fin.last) this._finaleLast(fin);
    else if (fin) {
      this.score += fin.pts;
      if (fin.perfect || fin.pts >= 100) this._pop('+' + fin.pts.toLocaleString('en-US'), x + (Math.random() - 0.5) * 0.6, 2.4 + hy, z, fin.perfect ? 'gold' : '');
      if (fin.perfect) {
        this.fx.glitter(b.x, 1.5 + hy, b.z, GOLD, 14, 0.5);
        this._glimmer(this.finale.streak % 4, true); this.sfx.goldBurst && this.sfx.goldBurst(this.pan(b.x)); this.cam.kick(1.0);
      }
      if (fin.broke) this.sfx.deflect && this.sfx.deflect(this.pan(x));
    }
    b.fig && b.fig.hitAt && b.fig.hitAt(new THREE.Vector3(x, 1.3 + hy, z), new THREE.Vector3(Math.sin(dir), 0, Math.cos(dir)), { power: small ? 0.5 : [0.5, 0.9, 1.15, 1.6, 2.2][tier], chips: !small && !up });
    // up she goes: the lift and the heavy when she's stunned or beaten; once her bar is empty, anything at all
    const canLift = this._liftable();
    if (up) {
      if (s.spike) this._spike(dir);
      else this._launch(s.launch ? 0.75 : fin && fin.perfect ? 0.6 : 0.36, dir, true);
    } else if (canLift && s.launch) this._launch(s.launch, dir);
    else if (fin && !ring) this._launch(fin.perfect || s.finisher ? 0.95 : on ? 0.45 : 0.2, dir);
    // the finisher, the heavy and a hit sent back throw her into the room
    else if (d.knock && !ring) { this._knock(d.knock, dir); if (s.finisher) b.open(0.6); }
    else if (d.push && !ring) this._knock(d.push, dir, true);
    // a counter that lands (the cut of a hit sent back) stuns her
    if (s.riposte) this._counterStun();
    if (!ring) b.react && b.react(tier, dir);
  }
  // she can be lifted off the floor: beaten (the finale), or stunned, staggered or opened up
  _liftable() {
    const b = this.boss;
    if (this.track.juggle === false || b.lockPos || !b.targetable || b.state === 'finished') return false;
    return this.finale.on || b.state === 'open' || b.state === 'stagger' || b.dazed;
  }
  // The first few times a thing matters, the button for it shows over the one it's about: right click as a pink ring
  // closes on YOU, Space (or Shift) under a white one, Space over her when she can be lifted. Once you've done each a
  // few times it stops showing (kept with your progress). No words.
  _coach() {
    const hud = this.hud; if (!hud.hint) return;
    const T = this._taught ||= (() => { try { return JSON.parse(localStorage.getItem('mp-taught') || '{}'); } catch (e) { return {}; } })();
    const pl = this.player, b = this.boss, st = pl.stats, S = this._coachS ||= { catches: st.catches, lifts: st.lifts, over: 0, heavy: 0 };
    // what you've just done counts
    const learn = (k, n) => { if (n > 0) { T[k] = (T[k] || 0) + n; try { localStorage.setItem('mp-taught', JSON.stringify(T)); } catch (e) { /* fine */ } } };
    learn('parry', st.catches - S.catches); S.catches = st.catches;
    learn('lift', st.lifts - S.lifts); S.lifts = st.lifts;
    if (pl.airborne && !S.air) learn('jump', this.threats && this.threats.some((n) => n.kind === 'white' && n.tl < 0.4) ? 1 : 0);
    S.air = pl.airborne;
    let p = null;
    if (this.state === 'play' && !this.exec.on && pl.state !== 'dead' && this.spotUntil <= 0) {
      const dev = this.input.used === 'keys' ? 'keys' : 'mouse', pulse = this.bm.tickPulse(this.t, 6);
      const n = (this.threats || [])[0];
      const liftable = b.targetable && b.hp > 0 && this._liftable() && !(this.air && this.air.up) && pl.grounded && Math.hypot(b.x - pl.x, b.z - pl.z) - b.radius < FEEL.reach + 1.2;
      if (n && n.tl < 1.0 && n.kind === 'pink' && (T.parry || 0) < 4) { const sp = this.cam.toScreen(_SP.set(pl.x, 2.15 + pl.y, pl.z)); p = { key: 'parry', x: sp.x, y: sp.y, pulse: Math.max(0, 1 - n.tl * 2.5), dev }; }
      else if (n && n.tl < 1.0 && n.kind === 'white' && (T.jump || 0) < 3) { const sp = this.cam.toScreen(_SP.set(pl.x, 2.15 + pl.y, pl.z)); p = { key: 'jump', x: sp.x, y: sp.y, pulse: Math.max(0, 1 - n.tl * 2.5), dev }; }
      else if (liftable && (T.lift || 0) < 4) { const sp = this.cam.toScreen(_SP.set(b.x, 2.75 + (b.root.position.y || 0), b.z)); p = { key: 'jump', x: sp.x, y: sp.y, pulse, dev }; }
    }
    hud.hint(p);
  }
  // the song's own moments reach the picture: its big hits knock the camera a touch; where the arrangement steps up
  // (a chorus coming in, a drop) the room's lights jump and the picture opens for a moment
  _songMoments() {
    if (this.state !== 'play') return;
    const t = this.t;
    // (after a rewind or a start part-way in: find our place again)
    if (this._momT === undefined || t < this._momT - 0.5 || t > this._momT + 2) { this._hitI = this.songHits.findIndex((h) => h.t > t); if (this._hitI < 0) this._hitI = this.songHits.length; this._liftI = this.songLifts.findIndex((h) => h.t > t); if (this._liftI < 0) this._liftI = this.songLifts.length; }
    this._momT = t;
    while (this._hitI < this.songHits.length && this.songHits[this._hitI].t <= t) { const h = this.songHits[this._hitI++]; if (t - h.t < 0.1 && t - (this._hitAt || -9) > 0.9) { this._hitAt = t; this.cam.kick(0.5 + 0.9 * (h.k - 0.72) / 0.28); } }
    while (this._liftI < this.songLifts.length && this.songLifts[this._liftI].t <= t) {
      const h = this.songLifts[this._liftI++]; if (t - h.t > 0.15 || t < 3) continue;
      this.cam.kick(2.2); this.cam.shake(0.35, 0.3);
      this.fx.flash(new THREE.Color(0.1, 0.08, 0.07), 1);
      const pl = this.player; this.fx.ring && this.fx.ring(pl.x, pl.z, GOLD, 5.5);
      this._liftGlow = 1; this.track.onLift && this.track.onLift(this, h);
    }
    if (this._liftGlow > 0) { this._liftGlow = Math.max(0, this._liftGlow - this.dt / 1.6); const A = this.arena && (this.arena.arena || this.arena); if (A && A.setBeat) A.setBeat(0.5 * this._liftGlow + 0.3 * this.bm.drumPulse(t, 6)); }
  }
  // the ground under a slam: a ring runs out, the room's things in it break
  _shock(x, z, r, s) {
    this.fx.ring && this.fx.ring(x, z, s.on ? GOLD : COPPER, r);
    this.fx.dust(x, z, 12, new THREE.Color(0.75, 0.7, 0.66));
    this.cam.shake(0.7, 0.2);
    this.arena.strikeArc && this.arena.strikeArc(x, z, 0, r, Math.PI, { ...s, heavy: true, slam: true }, this);
    this.setPieces && this.setPieces.strikeArc(x, z, 0, r, Math.PI, { ...s, heavy: true });
    this.sfx.slamFloor ? this.sfx.slamFloor(this.pan(x)) : this.sfx.impactArea && this.sfx.impactArea('white', this.pan(x), 'miss');
  }
  _whiff(s, deflected) {}
  _strikeStart(s) {}
  // over it: a little something for clearing what was under you
  _over(x, z) {
    if (this.t < (this._overT || 0)) return;
    this._overT = this.t + 0.3;
    this.fx.glitter(x, 0.4, z, new THREE.Color(2.2, 2.3, 2.8), 6, 0.4);
    this._good(25);
  }

  // ---------------- the guard, her answer, the set ----------------
  _block(x, z, o = {}) {
    const pl = this.player, b = this.boss;
    // the hit came from where its shape is; one drawn on you came from her
    let fx = x, fz = z;
    if (Math.hypot(x - pl.x, z - pl.z) < 0.8) { fx = b.x; fz = b.z; }
    pl.blocked(this._ctx(0), fx, fz, o.power ?? 1);
    this.fx.blocked && this.fx.blocked(pl, fx, fz);
    if (this.sfx.block) this.sfx.block(this.pan(pl.x)); else if (this.sfx.deflect) this.sfx.deflect(this.pan(pl.x));
    this.cam.shake(0.32, 0.1);
    this._good(15);
  }
  _sendBack(q) {
    const pl = this.player, b = this.boss;
    if (pl.riposte(this._ctx(0), q)) return;
    if (!b.targetable) return;
    const p = this.proj.spawn({ x: pl.x, z: pl.z, y: 1.3, angle: toward(pl, b), speed: 19, kind: 'gold', shape: 'star', size: 0.5, owner: 'you', life: 3, homing: 9, target: () => b, spin: 7 });
    if (p) p.dmgBack = q === 'perfect' ? 30 : 20;
    this.sfx.throwBack && this.sfx.throwBack(this.pan(pl.x), this.pan(b.x));
  }
  // strike her and keep striking: she answers on the next beat with a pink ring round her
  _counterCheck() {
    const b = this.boss, pl = this.player, now = this.t;
    const list = this._landedAt; if (!list || !list.length) return;
    while (list.length && now - list[0] > 2.6) list.shift();
    if (list.length < 5 || now < (this._counterCool || 0)) return;
    if (this.track.counters === false || this.suppress || this.harmless || this.spotUntil > 0 || this.state !== 'play') return;
    if (b.state !== 'perform' || !b.targetable || b.guard || b.busy || b.move || b.intangible || b.hp <= 0) return;
    if (Math.hypot(b.x - pl.x, b.z - pl.z) > 3.8) return;
    // nothing of hers is already on its way: she doesn't stack an answer on her own song
    if (this.tele.list.some((g) => !g.dead && g.kind !== 'gold' && g.end > now - 0.05 && g.end < now + 1.3)) return;
    this._counter();
  }
  _counter() {
    const b = this.boss, pl = this.player, bm = this.bm, now = this.t;
    // on a beat at least 0.42 s away (an eighth if the beat is slow)
    let t1 = bm.timeOf(Math.ceil(bm.beatAt(now + 0.42)));
    if (t1 - now > 0.86) t1 = bm.timeOf(Math.ceil(bm.beatAt(now + 0.42) * 2) / 2);
    this._counterCool = t1 + 3.2; this._landedAt.length = 0;
    b.faceNow(pl.x, pl.z);
    b.strikeAt('Melee_Hook', t1, { from: 0.0, to: 0.95, hit: 0.5 });
    if (b.fig && b.fig.tell) b.fig.tell();
    this.fx.tell && this.fx.tell(b);
    this.sfx.windup && this.sfx.windup(t1 - now, this.pan(b.x));
    PAT.area(this, { shape: 'circle', x: b.x, z: b.z, w: 2.35, kind: 'pink', start: now, end: t1, damage: 1, melee: true, counter: true, alphaK: 0.6, flash: 0.35,
      follow: () => ({ x: b.x, z: b.z }),
      onImpact: (hit) => { this.fx.ring && this.fx.ring(b.x, b.z, hit === 'parried' ? GOLD : PINK, 2.35); if (hit === 'hit') this.cam.shake(0.8, 0.18); } });
    this.counters = (this.counters || 0) + 1;
  }
  // she's thrown a little way; a wall or a prop in the way stops her hard: it hurts her, and breaks what it can
  _knock(dist, ang, light = false) {
    const b = this.boss, A = this.arena;
    if (this.track.knockback === false || b.move || b.pinned || !b.targetable || b.state === 'finished' || b.lockPos) return;
    if (light && (b.busy || b.state !== 'perform' && b.state !== 'open')) return;
    const res = (x, z) => (A && A.resolve ? A.resolve(x, z, b.radius * 0.8) : { x, z });
    // standing somewhere the room keeps you out of (a stage, behind a counter): she stays put
    const here = res(b.x, b.z); if (Math.hypot(here.x - b.x, here.z - b.z) > 0.04) return;
    const bd = this.bounds;
    let ex = b.x, ez = b.z, slam = false;
    for (let i = 1; i <= 8; i++) {
      const k = i / 8;
      let px = b.x + Math.sin(ang) * dist * k, pz = b.z + Math.cos(ang) * dist * k;
      if (bd) { const cx = Math.max(bd.minX + 0.8, Math.min(bd.maxX - 0.8, px)), cz = Math.max(bd.minZ + 0.8, Math.min(bd.maxZ - 0.8, pz)); if (cx !== px || cz !== pz) { slam = true; px = cx; pz = cz; } }
      const r = res(px, pz);
      if (Math.hypot(r.x - px, r.z - pz) > 0.06) slam = true;
      ex = r.x; ez = r.z;
      if (slam) break;
    }
    if (Math.hypot(ex - b.x, ez - b.z) < 0.05 && !slam) return;
    if (light && slam) return;
    b.moveTo(ex, ez, 0.16, { easing: 'out', face: false });
    // where she lands: a wall stops her hard; the room's ornaments in the way go to pieces (and so does a bit of her)
    this.after(0.13, () => {
      const n = this.setPieces ? this.setPieces.slam(ex, ez, 1.3) : 0;
      if (slam) this._slam(ex, ez, ang);
      else if (n && b.targetable) { b.takeHit({ dmg: 10 * n, kind: 'slam', heavy: true, x: ex, z: ez, onBeat: false }); this.fx.chips(ex, 1.0, ez, PORCELAIN, 10); this.cam.shake(0.5, 0.15); this._good(60 * n); }
    });
  }
  _slam(x, z, ang) {
    const b = this.boss;
    if (!b.targetable || this.state !== 'play') return;
    b.takeHit({ dmg: 16, kind: 'slam', heavy: true, x: x - Math.sin(ang), z: z - Math.cos(ang), onBeat: false });
    this.fx.dust(x + Math.sin(ang) * 0.5, z + Math.cos(ang) * 0.5, 16, new THREE.Color(0.75, 0.7, 0.66));
    this.fx.chips(x, 1.1, z, PORCELAIN, 18);
    this.fx.ring && this.fx.ring(x + Math.sin(ang) * 0.6, z + Math.cos(ang) * 0.6, WHITE, 1.8);
    this.cam.shake(0.85, 0.22); this.cam.kick(1.1);
    if (this.sfx.slamSet) this.sfx.slamSet(this.pan(x)); else if (this.sfx.break) this.sfx.break(this.pan(x));
    if (b.rig && b.rig.hitStop) b.rig.hitStop(0.1);
    // whatever she hit
    this.arena.strikeArc && this.arena.strikeArc(x, z, ang, 1.8, Math.PI, { heavy: true, slam: true, name: 'slam', dmg: 30 }, this);
    this.slams = (this.slams || 0) + 1;
    this._good(150);
  }
  _glimmer(level, isCatch) {
    // a quiet note of the chord that's sounding; a combo climbs it
    if (!this.chords || !this.sfx.glimmer) return;
    const i = Math.max(0, Math.min(this.chords.beats.length - 1, Math.floor(this.bm.beatAt(this.t))));
    const [root, q] = this.chords.beats[i];
    this._gStep = (this.t - (this._gLast || -9) < 1.2) ? (this._gStep + 1) % 4 : 0; this._gLast = this.t;
    this.sfx.glimmer(root, q, isCatch ? 3 : this._gStep, level);
  }
  _bossHit(h) {}
  _bossBreak(b) {
    this.hud.breakNotch(b.index);
    this.cam.shake(1.2, 0.3); this.cam.kick(2.2);
    this.fx.flash(new THREE.Color(0.35, 0.3, 0.28), 1); this.fx.aberrate(2.5);
    this.fx.chips(this.boss.x, 1.6, this.boss.z, PORCELAIN, 40);
    this.fx.glitter(this.boss.x, 1.6, this.boss.z, GOLD, 30, 1.0);
    this.sfx.break && this.sfx.break(this.pan(this.boss.x));
    this.score += 1000 * this.mult;
    this.track.onBreak && this.track.onBreak(this, b.index);
  }
  _deflect(h) {
    // striking her while she's guarded costs your combo: you can see it go, and hear the thud
    if (this.chain > 0) { this.chain = 0; this._mult(); }
    this.sfx.deflect && this.sfx.deflect(this.pan(this.boss.x));
    this.fx.sparks(this.boss.x, 1.3, this.boss.z, WHITE, 8);
    this.player.rig.hitStop(0.04);
    // a strike glancing off still pushes her toward an answer
    if (h && h.kind === 'strike') (this._landedAt ||= []).push(this.t);
  }
  // her glaze goes hard (three off the beat in a row): white, ringing; off-beat strikes glance off it now
  _harden(h) {
    const b = this.boss;
    this.fx.sparks(b.x, 1.4, b.z, WHITE, 16);
    this.fx.ring && this.fx.ring(b.x, b.z, WHITE, 1.5);
    this.sfx.harden ? this.sfx.harden(this.pan(b.x)) : this.sfx.deflect && this.sfx.deflect(this.pan(b.x));
  }
  // one on the beat cracks it: gold through the white
  _crack(h) {
    const b = this.boss;
    this.fx.glitter(b.x, 1.4, b.z, GOLD, 22, 0.6);
    this.fx.chips(b.x, 1.4, b.z, WHITE, 16);
    this.fx.ring && this.fx.ring(b.x, b.z, GOLD, 2.2);
    this.cam.shake(0.6, 0.14);
    this.sfx.crackGlaze ? this.sfx.crackGlaze(this.pan(b.x)) : this.sfx.breakProp && this.sfx.breakProp(this.pan(b.x));
    this._glimmer(1, false);
    this._good(100);
  }
  _bossEmpty() {
    // she's beaten: everything of hers in the air and on the floor goes, at once (the song plays on to the finish)
    this.harmless = true; this.player.minHearts = 1;
    this.proj.clear('boss'); for (const g of this.tele.list) if (g.kind !== 'gold') g.dead = true;
    for (const w of this.waves) this._dropWave(w); this.waves.length = 0;
    for (const b of this.beams) if (b.mesh) this.scene.remove(b.mesh); this.beams.length = 0;
    this.hud.banner('', ''); this.sfx.empty && this.sfx.empty(); this.track.onEmpty && this.track.onEmpty(this);
    this._dropKeepsake();
    // the finale: a gold ring closes on her through every bar from here to the last hit
    this.finale.start();
  }
  // ---------------- her stun ----------------
  // A counter that lands (a cut, or the gold back at her) stuns her: a beat for the first, two for the second in a row,
  // a bar for the third and after (the stars over her head count the run). Stunned she takes more: x1.35, x1.6, x2;
  // the third also bursts what she has out and holds her attacks for the bar. Getting hit ends the run. (Alex, 7 Nov:
  // "the counter should do more to stun them. especially if you get it multiple times. and that could open them up
  // to more damage when you hit")
  _counterStun() {
    const b = this.boss; if (b.hp <= 0 || !b.targetable || b.state === 'finished' || this.state !== 'play') return;
    this.cRun = this.t - (this._cLast ?? -99) < 12 * this.beat ? (this.cRun || 0) + 1 : 1;
    this._cLast = this.t;
    // the first opens her up for a moment (lift her and it lasts as long as you keep her up there); the second in a
    // row takes her turn away: what she had coming goes, and nothing more comes until she's back on her feet
    const lvl = Math.min(3, this.cRun), tp = this.bm.tickPeriod(this.t), ticks = [0, 3, 5, 8][lvl], k = [1, 1.3, 1.5, 1.8][lvl], sec = ticks * tp;
    b.daze(sec, k);
    this.fx.dazeStars && this.fx.dazeStars(b, lvl, sec);
    this._glimmer(lvl + 1, true);
    if (lvl >= 2 && this.spotUntil <= 0) { this._hush(sec); this.sfx.crackGlaze && this.sfx.crackGlaze(this.pan(b.x)); this.cam.kick(1.4); }
  }
  // her turn is over for sec seconds: everything of hers in the air and on the floor bursts, and nothing new comes
  _hush(sec) {
    const PINKG = new THREE.Color(3.4, 0.8, 1.9);
    for (const g of this.tele.list) if (!g.dead && g.kind !== 'gold') { this.fx.glitter(g.x, 0.35, g.z, g.kind === 'pink' ? PINKG : WHITE, 6, Math.min(1.4, (g.w || 1) * 0.5)); g.dead = true; }
    this.proj.clear('boss');
    for (const w of this.waves) this._dropWave(w); this.waves.length = 0;
    for (const bm of this.beams) if (bm.mesh) this.scene.remove(bm.mesh); this.beams.length = 0;
    this.suppress = true; this._stunHold = Math.max(this._stunHold || 0, this.t + sec);
  }

  // ---------------- the juggle ----------------
  // Her bar is empty: what you land on her throws her up, and what you land on her up there keeps her there (Alex,
  // 7 Nov: "it just juggles them into the air and you feel like its really cool"). She cartwheels; stop and she comes
  // down hard, on her feet, and goes back to what she was doing (in her last bars, back on her knees).
  // power 0..1: how hard she goes up. keep: she's up already and this holds her there
  _launch(power, dir, keep = false) {
    const b = this.boss; if (b.state === 'finished' || !b.targetable || this.track.juggle === false) return;
    const A = this.air || (this.air = { y: 0, vy: 0, vx: 0, vz: 0, spin: 0, spinV: 0, up: false });
    const k = 3.6 + 5.6 * Math.min(1.2, power);
    A.vy = A.up ? Math.max(A.vy, 0) * 0.3 + k * 0.85 : k;
    if (A.y > 2.3) A.vy *= 0.5;                       // (she stays in the picture)
    A.vx += Math.sin(dir) * 1.1; A.vz += Math.cos(dir) * 1.1; A.spiked = false;
    A.spinV += (A.spinV >= 0 ? 1 : -1) * (2.5 + 6 * power) * (Math.sin(dir) >= 0 ? 1 : -1) * (A.up ? 1 : (Math.random() < 0.5 ? -1 : 1));
    if (!A.up) {
      A.up = true; A.finale = this.finale.on; this._airIdle = b.pinned ? null : b.idleClip; b._endMove && b._endMove(true); b.move = null; b.pin('Jump_Loop'); b.juggled = true;
      this.fx.dust && this.fx.dust(b.x, b.z, 8); this.sfx.liftOff && this.sfx.liftOff(this.pan(b.x));
      // up there she can't do a thing: her turn waits for her to come down
      if (!this.finale.on && this.spotUntil <= 0) this._hush(0.5);
    }
  }
  // driven down out of the air: she hits the floor hard
  _spike(dir) {
    const A = this.air; if (!A || !A.up) return;
    A.vy = -27; A.vx = Math.sin(dir) * 2.5; A.vz = Math.cos(dir) * 2.5; A.spiked = true; A.spinV *= 0.3;
  }
  _airUpdate(dt) {
    const A = this.air, b = this.boss;
    this.cam.bossAirY = A && A.up ? A.y : 0;
    if (!A || !A.up) return;
    if (b.state === 'finished' || b.state === 'gone') { A.up = false; return; }
    if (!this.finale.on && b.hp > 0) { this.suppress = true; this._stunHold = Math.max(this._stunHold || 0, this.t + 0.25); b.dazeUntil = Math.max(b.dazeUntil || 0, this.t + 0.25); if (b.state === 'perform') { b.state = 'open'; b.st = 0; b.openFor = 0.3; } else if (b.state === 'open') b.openFor = Math.max(b.openFor || 0, b.st + 0.3); }
    A.vy -= 24 * dt; A.y += A.vy * dt;
    // (never up into the lights: the picture stays on the two of you)
    const top = Math.min(2.9, (this.cam.room ? this.cam.room.top : 9) - 2.9);
    if (A.y > top) { A.y = top; if (A.vy > 0) A.vy = 0; }
    const dk = Math.exp(-3 * dt); A.vx *= dk; A.vz *= dk;
    let nx = b.x + A.vx * dt, nz = b.z + A.vz * dt;
    const Ar = this.arena, bd = this.bounds, r = b.radius || 0.8;
    if (bd) { nx = Math.max(bd.minX + r, Math.min(bd.maxX - r, nx)); nz = Math.max(bd.minZ + r, Math.min(bd.maxZ - r, nz)); }
    if (Ar && Ar.resolve) { const q = Ar.resolve(nx, nz, r * 0.8); nx = q.x; nz = q.z; }
    b.x = nx; b.z = nz; b._sync();
    A.spin += A.spinV * dt; A.spinV *= Math.exp(-1.4 * dt);
    // coming down she rights herself, to land on her feet
    if (A.vy < 0 && A.y < 0.9) { const upr = Math.round(A.spin / (Math.PI * 2)) * Math.PI * 2; A.spin += (upr - A.spin) * Math.min(1, dt * 14); A.spinV *= 0.9; }
    if (A.y <= 0 && A.vy < 0) {
      A.y = 0;
      if (A.spiked) {
        A.spiked = false; A.vy = 5.2; A.spinV = 0; A.spin = Math.round(A.spin / (Math.PI * 2)) * Math.PI * 2;
        this.fx.ring && this.fx.ring(b.x, b.z, GOLD, 2.6); this.fx.dust && this.fx.dust(b.x, b.z, 16, new THREE.Color(0.75, 0.7, 0.66)); this.fx.chips(b.x, 0.5, b.z, PORCELAIN, 22);
        this.cam.shake(1.0, 0.24); this.cam.kick(1.6); this.sfx.slamSet ? this.sfx.slamSet(this.pan(b.x)) : this.sfx.breakProp && this.sfx.breakProp(this.pan(b.x));
        if (b.rig && b.rig.hitStop) b.rig.hitStop(0.1);
        if (b.targetable) { b.takeHit({ dmg: 18, kind: 'slam', heavy: true, x: b.x, z: b.z, onBeat: false }); this._good(150); this._pop('+' + Math.round(150 * this.mult).toLocaleString('en-US'), b.x, 1.6, b.z, 'gold'); }
        this.setPieces && this.setPieces.slam(b.x, b.z, 1.6);
        this.arena.strikeArc && this.arena.strikeArc(b.x, b.z, 0, 1.8, Math.PI, { heavy: true, slam: true, name: 'slam', dmg: 30 }, this);
      }
      else if (A.vy < -7.5) { A.vy = -A.vy * 0.22; this.fx.dust && this.fx.dust(b.x, b.z, 8); this.cam.shake(0.3, 0.1); this.sfx.breakProp && this.sfx.breakProp(this.pan(b.x)); }
      else {
        A.vy = 0; A.up = false; A.spin = 0; A.spinV = 0; A.vx = A.vz = 0;
        this.fx.dust && this.fx.dust(b.x, b.z, 6);
        if (this.finale.down && this.track.finalePin !== false) b.pin('Crouch_Idle_Loop');
        else {
          b.pinned = false; b.juggled = false; if (this._airIdle) b.idleClip = this._airIdle; b.loop(b.idleClip || 'Idle_Loop', { fade: 0.2 });
          // back on her feet: a moment, then her turn comes back
          if (!this.finale.on && b.hp > 0) { const tp = this.bm.tickPeriod(this.t); b.daze(tp * 1.5, b.openK || 1.3); this._stunHold = Math.max(this._stunHold || 0, this.t + tp * 1.5); }
        }
      }
    }
    // on the picture: up, and turning about her middle (not her feet)
    if (A.up || A.y > 0) {
      const h = 1.0, th = A.spin, ph = b.facing;
      const o = { dx: h * Math.sin(th) * Math.cos(ph), dy: A.y + h * (1 - Math.cos(th)), dz: -h * Math.sin(th) * Math.sin(ph) };
      b.root.position.x += o.dx; b.root.position.y += o.dy; b.root.position.z += o.dz; b.root.rotation.z = th;
      this._airOn = o;
    }
  }

  // the last ring, landed on the last hit: its points, and the shatter is yours (gold, now, or as she shatters)
  _finaleLast(res) {
    const b = this.boss;
    this.score += res.pts;
    this._pop('+' + res.pts.toLocaleString('en-US'), b.x, 2.6, b.z, 'huge');
    if (this.state === 'play') this._blowAtShatter = true; else this._finalBlowFx();
  }
  _finalBlowFx() {
    const b = this.boss;
    this.fx.flash(new THREE.Color(0.3, 0.22, 0.06), 1); this.fx.glitter(b.x, 1.6, b.z, GOLD, 120, 2.0); this.cam.kick(4);
    this.sfx.goldBurst && this.sfx.goldBurst(this.pan(b.x)); this._glimmer(3, true);
  }
  // the song's last bars: she goes down on her knees, somewhere YOU can get to her, and stays down to the last hit
  _finaleDown() {
    const b = this.boss; if (this.track.finalePin === false || b.state === 'finished' || b.hp > 0) return;
    if (this.air && this.air.up) return;            // (up in the air: she comes down onto her knees)
    let x = b.x, z = b.z; const A = this.arena, bd = this.bounds, r = b.radius || 0.8;
    if (bd) { x = Math.max(bd.minX + r + 0.4, Math.min(bd.maxX - r - 0.4, x)); z = Math.max(bd.minZ + r + 0.4, Math.min(bd.maxZ - r - 0.4, z)); }
    if (A && A.resolve) { const q = A.resolve(x, z, r); x = q.x; z = q.z; }
    b.move = null; b.busyUntil = 0; b.intangible = false;
    if (Math.hypot(x - b.x, z - b.z) > 0.05) b.moveTo(x, z, 0.28, { easing: 'out' });
    b.pin('Crouch_Idle_Loop');
    this.fx.dust && this.fx.dust(x, z, 10); this.cam.shake(0.45, 0.14);
    this.sfx.breakProp && this.sfx.breakProp(this.pan(x));
  }

  // ---------------- what she leaves ----------------
  // Her bar empties and her keepsake comes off her: it lands on the floor between you, glinting, and YOU takes it
  // back by walking over it (on the last hit it comes to her anyway). The results card says what it was.
  _dropKeepsake() {
    if (this.ks || this.track.keepsake === false) return;
    const meta = trackById(this.track.id), kind = meta && meta.id === this.track.id ? meta.prize : null;
    if (!kind) return;
    const g = new THREE.Group(), m = makeKeepsake(kind);
    m.scale.setScalar(0.55 / (KEEPSAKE_SIZE[kind] || 0.12));
    // its own materials, warmed gold, so it reads on any floor
    m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material = (Array.isArray(o.material) ? o.material : [o.material]).map((x) => { const c = x.clone(); if (c.emissive) { c.emissive.setRGB(0.5, 0.33, 0.08); c.emissiveIntensity = 0.6; } return c; }); if (o.material.length === 1) o.material = o.material[0]; } });
    g.add(m); this.scene.add(g);
    // a column of gold light stands on it while it waits for you
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 24, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uK: { value: 0 }, uFxK: FXK },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * (viewMatrix * (modelMatrix * vec4(position, 1.0))); }',
      fragmentShader: 'uniform float uK; uniform float uFxK; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * (1.0 - vUv.y) * 0.3 * uK; gl_FragColor = vec4(vec3(3.0, 2.0, 0.6) * a * uFxK, a); }' }));
    col.position.y = 3.5; col.renderOrder = 6; col.frustumCulled = false;
    // she drops it off to one side of her, a few steps from YOU, somewhere YOU can walk to in a straight line: you
    // see it land, and go for it
    const b = this.boss, pl = this.player, a = Math.atan2(pl.x - b.x, pl.z - b.z), A = this.arena;
    const free = (x, z) => { if (!A || !A.resolve) return true; const r = A.resolve(x, z, 0.5); return Math.hypot(r.x - x, r.z - z) < 0.02; };
    const clear = (x, z) => { const n = Math.ceil(Math.hypot(x - pl.x, z - pl.z) / 0.3); for (let i = 1; i <= n; i++) { const k = i / n; if (!free(pl.x + (x - pl.x) * k, pl.z + (z - pl.z) * k)) return false; } return true; };
    let tx = pl.x + Math.sin(a + Math.PI) * 0, tz = pl.z, best = -1e9;
    for (const R of [2.4, 1.8, 3.2]) for (const side of [1.7, -1.7, 1.0, -1.0, 2.4, -2.4, 0.4, -0.4]) {
      let x = b.x + Math.sin(a + side) * R, z = b.z + Math.cos(a + side) * R;
      const bd = this.bounds; if (bd) { x = Math.max(bd.minX + 1, Math.min(bd.maxX - 1, x)); z = Math.max(bd.minZ + 1, Math.min(bd.maxZ - 1, z)); }
      if (!free(x, z)) continue;
      const dY = Math.hypot(x - pl.x, z - pl.z);
      const score = (clear(x, z) ? 10 : 0) + (dY > 2.0 ? 3 : 0) - Math.abs(dY - 3) * 0.4;
      if (score > best) { best = score; tx = x; tz = z; }
    }
    if (best < 10) { const aa = Math.atan2(b.x - pl.x, b.z - pl.z); tx = pl.x + Math.sin(aa + 1.2) * 2.5; tz = pl.z + Math.cos(aa + 1.2) * 2.5; if (!free(tx, tz)) { tx = pl.x; tz = pl.z; } }
    this.ks = { g, col, kind, t: 0, from: new THREE.Vector3(b.x, 1.5, b.z), at: new THREE.Vector3(tx, 0, tz), state: 'fall', glint: 0 };
    this.fx.glitter(b.x, 1.5, b.z, GOLD, 30, 0.6);
    this.sfx.goldBurst && this.sfx.goldBurst(this.pan(b.x));
  }
  _keepsake(dt) {
    const k = this.ks; if (!k || k.state === 'gone') return;
    k.t += dt;
    const pl = this.player, g = k.g;
    if (k.state === 'fall') {
      const u = Math.min(1, k.t / 0.62);
      g.position.lerpVectors(k.from, k.at, u); g.position.y = k.from.y * (1 - u) + 0.32 * u + 2.2 * u * (1 - u);
      g.rotation.y += dt * 9; g.rotation.x = (1 - u) * 2.5;
      if (u >= 1) { k.state = 'wait'; k.t = 0; this.fx.ring && this.fx.ring(k.at.x, k.at.z, GOLD, 1.2); this.fx.dust(k.at.x, k.at.z, 6); this.sfx.ringCatch && this.sfx.ringCatch({ pos: k.at }); k.col.position.set(k.at.x, 3.5, k.at.z); this.scene.add(k.col); }
    } else if (k.state === 'wait') {
      g.position.set(k.at.x, 0.36 + Math.sin(k.t * 3) * 0.06, k.at.z); g.rotation.set(0.25, g.rotation.y + dt * 1.6, 0);
      k.col.material.uniforms.uK.value = Math.min(1, k.t * 3) * (0.75 + 0.25 * this.bm.pulse(this.t, 5));
      if ((k.glint -= dt) <= 0) { k.glint = 0.5; this.fx.glitter(k.at.x, 0.5, k.at.z, GOLD, 4, 0.25); if (this.fx.ring) this.fx.ring(k.at.x, k.at.z, GOLD, 0.9); }
      // walk over it to take it back (and if you don't come for it, it comes to you after a few beats)
      if (Math.hypot(pl.x - k.at.x, pl.z - k.at.z) < 1.0 || this.state === 'finishing' || k.t > 6) { k.state = 'take'; k.t = 0; k.from = g.position.clone(); this.scene.remove(k.col); pl.rig.upperOnce('Interact', { duration: 0.45, from: 0.1, to: 0.6, fade: 0.05 }); }
    } else if (k.state === 'take') {
      const hand = pl.rig.bones.hand_r, to = hand ? hand.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(pl.x, 1.1, pl.z);
      const u = Math.min(1, k.t / 0.24);
      g.position.lerpVectors(k.from, to, u * u); g.scale.setScalar(1 - 0.7 * u);
      if (u >= 1) {
        k.state = 'gone'; this.scene.remove(g); this.kept = k.kind;
        this.fx.glitter(to.x, to.y, to.z, GOLD, 26, 0.4); this.fx.ring && this.fx.ring(pl.x, pl.z, GOLD, 1.6);
        this._glimmer(2, true); this.after(0.12, () => this._glimmer(3, true));
        // what it does: everything the finale's worth, doubled (the x2 by its points says so)
        this.finale.kept = 2;
        this._pop('\u00d72', pl.x, 2.8, pl.z, 'huge');
      }
    }
  }

  // ---------------- spotlight ----------------
  // THE SOLO: the house lights go down and the light is yours for two bars. Everything of hers in the air and on the
  // floor bursts as it comes on, she can't touch you, she covers her eyes, and every strike lands on the music for
  // double. The pips round the light count the beats you have left.
  _spotlight() {
    const pl = this.player;
    if (pl.meter < 1 || this.spotUntil > 0 || this.state !== 'play') return;
    pl.meter = 0;
    const b0 = this.bm.beatAt(this.t);
    this.spotStart = this.t; this.spotB0 = b0;
    this.spotUntil = this.bm.timeOf(Math.floor(b0) + 1 + SOLO_BEATS);
    this.suppress = true; this.boss.blinded = true;
    // what she had coming bursts, where it was
    const PINKG = new THREE.Color(3.4, 0.8, 1.9);
    for (const g of this.tele.list) if (!g.dead && g.kind !== 'gold') this.fx.glitter(g.x, 0.35, g.z, g.kind === 'pink' ? PINKG : WHITE, 8, Math.min(1.6, (g.w || 1) * 0.6));
    for (const p of this.proj.list) if (p.owner === 'boss' && !p.dead) this.fx.glitter(p.x, p.y || 1, p.z, PINKG, 3, 0.15);
    this.proj.clear('boss'); this.tele.clear();
    for (const w of this.waves) this._dropWave(w); this.waves.length = 0;
    for (const b of this.beams) if (b.mesh) this.scene.remove(b.mesh); this.beams.length = 0;
    this.fx.spotlight(true);
    this.fx.flash(new THREE.Color(0.22, 0.2, 0.17), 1);
    this.cam.kick(1.6);
    this.sfx.spotlight && this.sfx.spotlight();
    pl.speedMul = 1.2; pl.solo = true;
    const b = this.boss;
    if (b.rig && b.rig.upperOnce && b.targetable) b.rig.upperOnce('Sword_Block', { duration: Math.min(1.4, this.spotUntil - this.t), from: 0.1, to: 0.5, fade: 0.1 });
    if (b.fig && b.fig.tell) b.fig.tell(new THREE.Color(2.6, 2.4, 2.1));
    b.open(this.spotUntil - this.t);
    this.track.onSpotlight && this.track.onSpotlight(this, true);
  }
  _endSpotlight() {
    this.spotUntil = -1; this.suppress = false; this.boss.blinded = false;
    this.fx.spotlight(false); this.player.speedMul = 1; this.player.solo = false;
    this.track.onSpotlight && this.track.onSpotlight(this, false);
  }
  // the solo's picture: the room down, the light on YOU, the beats left
  _soloLook(dt) {
    const on = this.spotUntil > 0;
    const k = this._soloK = (this._soloK || 0) + ((on ? 1 : 0) - (this._soloK || 0)) * Math.min(1, dt * (on ? 10 : 4));
    const post = this.app.post.fx;
    // the room's exposure, whoever set it this frame (a track sets it every frame; some only once), times the dim
    if (this._expLast === undefined || Math.abs(post.exposure - this._expLast) > 1e-6) this._expBase = post.exposure;
    post.exposure = this._expBase * (1 - 0.38 * k); this._expLast = post.exposure;
    // and the room's glow breathes a little with the beat (the same way: on top of whatever the room set)
    if (this._bloomLast === undefined || Math.abs(post.bloom - this._bloomLast) > 1e-6) this._bloomBase = post.bloom;
    const bp = this.state === 'play' ? this.bm.pulse(this.t, 7) : 0;
    post.bloom = this._bloomBase * (1 + (0.06 + 0.04 * this.heat) * bp * bp); this._bloomLast = post.bloom;
    if (k > 0.002) {
      const sp = this.cam.toScreen(_SP.set(this.player.x, 1.0, this.player.z));
      post.focus.set(sp.x, 1 - sp.y);
      post.focusK = 0.72 * k;
    } else if (post.focusK) post.focusK = 0;
    // YOU, lit by it
    if (k > 0.002 || this._soloLit) { this.player.rig.flash(_SOLO_LIT, 0.16 * k); this._soloLit = k > 0.002; }
    if (this.fx.soloBeats) {
      const left = on ? Math.max(0, Math.min(SOLO_BEATS, Math.floor(this.spotB0) + 1 + SOLO_BEATS - this.bm.beatAt(this.t))) : 0;
      this.fx.soloBeats(on ? left : 0, SOLO_BEATS, this.bm.pulse(this.t, 8), this.player);
    }
  }

  // ---------------- sections, death, the end ----------------
  _enterSection(sec) {
    const prev = this.lastSection;
    this.lastSection = sec;
    if (prev && !this.encoreMode) this.player.heal(1);
    this.checkpoint = { t: sec.t0, boss: this.boss.snapshot(), score: this.score };
    this.track.onSection && this.track.onSection(this, sec, prev);
    this.setPieces.fill();
  }

  _die() {
    this.state = 'dying'; this.rewinds++;
    const tDeath = this.t;
    this.chain = 0; this._mult();
    if (!this.manual) this.audio.tapeStop(tDeath, 0.7);
    this.sfx.death && this.sfx.death();
    this.app.post.fx.desat = 0;
    const cp = this.checkpoint;
    // tape stop -> VHS rewind back to the checkpoint -> go
    this._seq([
      [0.0, () => {}],
      [0.75, () => { this.state = 'rewinding'; this._rewindFx(true); if (!this.manual) this.audio.rewind(tDeath, cp.t, 1.25); this.sfx.rewind && this.sfx.rewind(1.25); }],
      [2.05, () => {
        this._rewindFx(false);
        this._resetTo(cp);
        this.state = 'play';
        if (this.manual) this.t = cp.t;
      }],
    ]);
  }
  // the rewind: the colour drains while the record winds back (no TV lines: Alex wants it clean)
  _rewindFx(on) { const fx = this.app.post.fx; fx.vhs = 0; fx.desat = on ? 0.6 : 0; }
  _resetTo(cp) {
    this.proj.clear(); this.tele.clear(); this.fx.clear(); this._late = null;
    for (const w of this.waves) this._dropWave(w); this.waves.length = 0;
    for (const b of this.beams) if (b.mesh) this.scene.remove(b.mesh); this.beams.length = 0;
    if (this.spotUntil > 0) this._endSpotlight();
    this.boss.pinned = false; this.boss.juggled = false; this.boss.dazeUntil = 0; this.cRun = 0;
    if (this._stunHold) { this._stunHold = 0; if (this.spotUntil <= 0) this.suppress = false; }
    if (this._airOn) { const o = this._airOn, r = this.boss.root; r.position.x -= o.dx; r.position.y -= o.dy; r.position.z -= o.dz; r.rotation.z = 0; this._airOn = null; }
    if (this.air) { this.air.up = false; this.air.y = 0; this.air.vy = 0; this.cam.bossAirY = 0; }
    this.exec.reset(); this._shatterOpts = null;
    this.boss.restore(cp.boss);
    this.boss._now = cp.t; this.boss.busyUntil = 0;
    if (this.boss.hp > 0) this.finale.reset();
    this.score = cp.score;            // a rewind takes back what you scored since the checkpoint
    this.hud.restoreNotches(this.boss.broken);
    this.player.revive();
    this.setPieces.reset();
    this.T.seek(cp.t);
    this.t = cp.t;
    this.lastSection = this.T.sectionAt(cp.t);
    this.track.onRewind && this.track.onRewind(this, cp.t);
  }

  _songEnd() {
    this._ended = true;
    if (this.boss.state === 'desperate' || this.boss.hp <= 0) this._finish();
    else this._encore();
  }
  _finish() {
    if (this.spotUntil > 0) this._endSpotlight();
    this.state = 'finishing';
    this.sfx.shatter && this.sfx.shatter(this.pan(this.boss.x));
    this.fx.flash(new THREE.Color(1.1, 1.0, 0.95), 1); this.fx.aberrate(3);
    this.hud.show(false);
    this.cam.shake(1.6, 0.45); this.cam.kick(3);
    this.proj.clear('boss'); this.tele.clear();
    const so = this._shatterOpts;
    if (so && so.none) { /* her death scene has dealt with her */ } else if (this.boss.fig && this.boss.fig.shatter) this.boss.fig.shatter(so || undefined); else this.boss.root.visible = false;
    this.fx.chips(this.boss.x, 1.4, this.boss.z, PORCELAIN, 90); this.fx.glitter(this.boss.x, 1.5, this.boss.z, GOLD, 80, 1.4);
    this.boss.state = 'finished';
    this.score += 5000 * this.mult;
    // the final blow: the last ring landed on the last hit (the shatter was yours)
    if (this._blowAtShatter) { this._blowAtShatter = false; this._finalBlowFx(); }
    // the camera leans in on the two of you (you keep control), then lets go
    const bx = this.boss.x, bz = this.boss.z, px = this.player.x, pz = this.player.z;
    const mx = (bx + px) / 2, mz = (bz + pz) / 2;
    // (her death scene keeps its own picture, and lets go of it itself)
    if (this.exec.on) this.exec.finish();
    else { this.cam.override = { pos: new THREE.Vector3(mx + 1.5, 4.2, mz + 8.5), look: new THREE.Vector3(mx, 1.0, mz), k: 0 }; this._finishT = 0; }
    this.track.onFinish && this.track.onFinish(this);
    // the song plays out; then results
    this._seq([[Math.max(1.5, this.duration - this.t + 0.4), () => this._done(true)]]);
  }
  _encore() {
    if (this.spotUntil > 0) this._endSpotlight();
    this.encores++;
    this.state = 'encore';
    this.hud.banner('ENCORE', 'gold', 1800);
    this.boss.bow && this.boss.bow(1.2);
    this.track.onEncore && this.track.onEncore(this);
    const to = this.finalChorus.t0;
    this._seq([
      [0.9, () => { this._rewindFx(true); if (!this.manual) this.audio.rewind(this.t, to, 1.1); }],
      [2.0, () => {
        this._rewindFx(false); this._ended = false; this.proj.clear(); this.tele.clear();
        for (const w of this.waves) this._dropWave(w); this.waves.length = 0;
        for (const b of this.beams) if (b.mesh) this.scene.remove(b.mesh); this.beams.length = 0;
        this.T.seek(to); this.t = to; this.lastSection = this.T.sectionAt(to);
        this.boss._now = to; this.boss.busyUntil = 0; this.boss.move = null;
        this.setPieces.reset();
        this.track.onRewind && this.track.onRewind(this, to);
        this.checkpoint = { t: to, boss: this.boss.snapshot(), score: this.score };
        this.state = 'play'; this.player.heal(2);
      }],
    ]);
  }
  _done(won) {
    this.state = 'done'; this.hud.show(false);
    const st = this.player.stats;
    const fi = this.finale;
    const result = { won, score: this.score, rewinds: this.rewinds, encores: this.encores, stats: st, grade: this.grade(),
      finale: fi.on ? { bonus: fi.bank, rings: fi.perfect, of: fi.total, finalBlow: fi.finalBlow, kept: fi.kept > 1 } : null,
      kill: this.exec.on || this.exec.over ? { hits: this.exec.hits, of: this.exec.total } : null };
    this.resultCb && this.resultCb(result);
  }
  grade() {
    // a par from the track (expected score for a strong run), forgiving (Alex: make the grading easier)
    const par = this.track.par || 60000;
    let k = this.score / par;
    k -= this.rewinds * 0.08 + this.encores * 0.12;
    return k >= 0.85 ? 'S' : k >= 0.62 ? 'A' : k >= 0.42 ? 'B' : k >= 0.25 ? 'C' : 'D';
  }

  // run a sequence of [delaySeconds, fn] in real time (sequences ignore the song clock)
  _seq(steps) {
    const t0 = performance.now();
    for (const [d, fn] of steps) {
      if (this.manual) { (this._manualSeq ||= []).push({ at: this._mt + d, fn }); }
      else setTimeout(fn, d * 1000);
    }
  }
  stepManual(dt) { this._mt = (this._mt || 0) + dt; if (this._manualSeq) { for (let i = this._manualSeq.length - 1; i >= 0; i--) if (this._manualSeq[i].at <= this._mt) { const s = this._manualSeq.splice(i, 1)[0]; s.fn(); } } }

  pause(on) {
    if (on && this.state === 'play') { this._prePause = this.state; this.state = 'paused'; this.audio.pause(this.t); }
    else if (!on && this.state === 'paused') { this.state = this._prePause || 'play'; this.audio.resumeAt(this.t); }
  }

  dispose() {
    this.cam.reset(); this.app.post.fx.letterbox = 0; this._finishT = undefined;
    // the picture as the room left it, without the solo's dim or the beat's glow on top
    if (this._expBase !== undefined) this.app.post.fx.exposure = this._expBase;
    if (this._bloomBase !== undefined) this.app.post.fx.bloom = this._bloomBase;
    this.app.post.fx.focusK = 0; this.cam.soloK = 0;
    const A = this.arena && (this.arena.arena || this.arena); if (A && A.setBeat) A.setBeat(0);
    this.hud.keycap(false); this.hud.finale(false); this.hud.chain(0, 1); this.hud.hint && this.hud.hint(null);
    this.exec && this.exec.dispose();
    if (this.herXray) { this.herXray.dispose(); this.herXray = null; }
    this.fx.drawTargets && this.fx.drawTargets([]);
    this.sfx.detach && this.sfx.detach();
    this.proj.clear(); this.tele.clear(); this.fx.clear();
    this.scene.remove(this.proj.mesh, this.proj.dots, this.tele.mesh);
    this.marks.dispose(this.scene); this.signs.dispose();
    for (const w of this.waves) this._dropWave(w);
    for (const b of this.beams) if (b.mesh) this.scene.remove(b.mesh);
    if (this._wavePool) for (const k in this._wavePool) for (const m of this._wavePool[k]) m.dispose();
    if (this.ks) { if (this.ks.g.parent) this.scene.remove(this.ks.g); if (this.ks.col.parent) this.scene.remove(this.ks.col); this.ks.col.geometry.dispose(); }
    if (this.player.h.setMouth) this.player.h.setMouth(0);
    this.setPieces && this.setPieces.dispose();
    this.arena && this.arena.dispose && this.arena.dispose();
    this.boss && this.scene.remove(this.boss.root);
    this.audio.stop();
    this.audio.sfx.gain.value = 0.6;
    if (this._matDispose) { THREE.Material.prototype.dispose = this._matDispose; for (const m of this._deferredDispose.splice(0)) m.dispose(); this._matDispose = null; }
    if (this.audio.sfxDuck) { this.audio.sfxDuck.gain.cancelScheduledValues(0); this.audio.sfxDuck.gain.value = 1; }
  }
}
