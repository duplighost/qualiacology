// The credits: no boss, no HUD, no score. YOU walks through a place while the song plays and the track's
// timeline moves the world around her. Same song clock, camera and YOU as a fight; a track module with
// `kind: 'walk'` builds the place (`build`) and scripts it (`script`), and says where the song ends (`end`).
import * as THREE from 'three';
import { BeatMap } from '../engine/beats.js';
import { Timeline } from './choreo.js';
import { Signs } from '../fx/signs.js';
import { Vocal } from './vocal.js';

export class Walk {
  constructor(app, track) {
    this.app = app; this.track = track; this.kind = 'walk';
    this.scene = app.scene; this.cam = app.cam; this.input = app.input; this.audio = app.audio; this.sfx = app.sfx; this.fx = app.fx; this.post = app.post;
    this.t = 0; this.dt = 0; this.beat = 0.5;
    this.state = 'loading';     // loading | play | paused | ending | done
    this.manual = false;
    this.boss = null;
    this.resultCb = null;       // called once the song has ended and the screen is black
  }

  async load(onProgress = () => {}) {
    const tr = this.track;
    this.bm = new BeatMap(await fetch(`data/beats/${tr.beats}.json`).then((r) => r.json()));
    this.sfx.attach && this.sfx.attach(this);
    this.duration = this.bm.duration;
    onProgress(0.1);
    const songP = this.audio.loadSong(`assets/music/${tr.beats}`, this.bm.duration, (k) => onProgress(0.1 + k * 0.5));
    this.signs = new Signs(this.scene);
    this.vocal = await Vocal.load(tr.beats);
    this.player = this.app.player;
    this.world = await tr.build(this, (k) => onProgress(0.6 + k * 0.3));
    this.bounds = this.world.bounds;
    this.cam.bounds = this.bounds;
    this.player.arena = this.world;
    this.buffer = await songP;
    this.T = new Timeline(this.bm);
    tr.script && tr.script(this.T, this);
    this.T.compile();
    this.end = tr.end ?? this.bm.duration;
    onProgress(1);
  }

  start(at = 0) {
    this.state = 'play';
    const pl = this.player;
    pl.walk = true; pl.revive(); pl.inv = 0; pl.meter = 0;
    const sp = this.track.spawn || [0, 0, Math.PI];
    pl.place(...sp);
    this.T.seek(at);
    this.t = at;
    this.track.onStart && this.track.onStart(this, at);
    this.cam.closeK = 0; this.cam.override = null;
    this.cam.snap(pl, this.world.camFocus ? this.world.camFocus(pl) : null);
    if (!this.manual) this.audio.play(this.buffer, at, at > 0 ? 0.05 : 0);
    this.app.hud.show(false);
    this.post.fx.fade = 1; this.post.fx.fadeColor.set(0, 0, 0); this._fadeIn = 1;
  }

  after(sec, fn) { this.T.after(this.t + sec, fn); }
  at(t, fn) { this.T.after(t, fn); }
  sign(text, o = {}) { const t0 = o.at !== undefined ? this.T.time(o.at) : this.t; const t1 = o.until !== undefined ? this.T.time(o.until) : t0 + (o.hold ?? 4); return this.signs.add({ text, ...o, t0, t1 }); }
  pan(x) { return Math.max(-1, Math.min(1, (x - this.cam.focus.x) / 11)); }

  update(now, dtReal) {
    const dt = Math.min(0.05, dtReal);
    this.dt = dt;
    if (this.state === 'paused' || this.state === 'loading' || this.state === 'done') return;
    if (this.manual) this.t += dt;
    else if (this.state === 'play') this.t = this.audio.time(now);
    this.beat = this.bm.periodAt(this.t);
    if (this.state === 'play') {
      this.T.advance(this.t, this);
      if (this.t >= this.end) this._cut();
    }
    const ctx = this._ctx(dt);
    this.player.update(ctx);
    this.world.update && this.world.update(dt, this.t, this);
    this.signs.update(this.t);
    // the camera follows YOU alone; the world can lean on it (closer, a lift, a held framing)
    this.cam.update(dt, this.player, this.world.camFocus ? this.world.camFocus(this.player) : null);
    this.world.camera && this.world.camera(dt, this.t, this);
    this.fx.update(dt, this.cam.cam.position, this.player);
    if (this._fadeIn > 0) { this._fadeIn = Math.max(0, this._fadeIn - dt / 1.2); this.post.fx.fade = this._fadeIn * this._fadeIn; }
    if (this.state === 'ending') {
      this.post.fx.fade = 1;
      this._endT += dt;
      if (this._endT > 1.1 && !this._told) { this._told = true; this.state = 'done'; this.resultCb && this.resultCb({ walk: true, won: true }); }
    }
  }

  // a hard cut to black on the song's last hit
  _cut() {
    if (this.state !== 'play') return;
    this.state = 'ending'; this._endT = 0;
    this.post.fx.fade = 1; this.post.fx.fadeColor.set(0, 0, 0);
    this.audio.stop();
    this.world.onCut && this.world.onCut(this);
  }

  _ctx(dt) {
    const m = this.input.mouse;
    if (!this._aim) this._aim = new THREE.Vector3();
    this.cam.floorPoint(m.x, m.y, this._aim);
    return { dt, t: this.t, input: this.input, aim: this._aim, boss: null, projectiles: null, beats: this.bm, fx: this.fx, sfx: this.sfx, arena: this.world, hud: null,
      lookAt: this.world.lookAt ? this.world.lookAt(this.player) : null,
      onInteract: () => this.world.interact && this.world.interact(this) };
  }

  stepManual() {}

  pause(on) {
    if (on && this.state === 'play') { this.state = 'paused'; this.audio.pause(this.t); }
    else if (!on && this.state === 'paused') { this.state = 'play'; if (!this.manual) this.audio.resumeAt(this.t); }
  }

  dispose() {
    this.audio.stop();
    this.sfx.detach && this.sfx.detach();
    this.player.walk = false;
    this.player.carry && this.player.carry(null);
    this.signs.dispose();
    this.world && this.world.dispose && this.world.dispose();
    this.cam.override = null; this.cam.closeK = 0;
    this.post.fx.letterbox = 0;
  }
}

// A bot that takes the credits' tour (tests and captures): a list of [until-time, x, z, interact?] stops.
// It walks straight between stops, presses interact at the ones that ask for it, and waits for the time.
export class WalkBot {
  constructor(walk, stops) {
    this.w = walk; this.stops = stops; this.i = 0;
    this.mouse = { x: 0.5, y: 0.5, px: 0, py: 0, moved: true, inside: true };
    this.down = new Set(); this.pressed = []; this.released = []; this.mv = { x: 0, y: 0 }; this.done = new Set();
  }
  move() { return this.mv; }
  take(a, now) { const i = this.pressed.indexOf(a); if (i >= 0) { this.pressed.splice(i, 1); return { action: a, t: now }; } return null; }
  peek(a) { return this.pressed.includes(a); }
  isDown(a) { return this.down.has(a); }
  takeRelease(a) { const i = this.released.indexOf(a); if (i >= 0) { this.released.splice(i, 1); return { action: a }; } return null; }
  clear() { this.pressed.length = 0; this.released.length = 0; }
  think() {
    const w = this.w, pl = w.player, t = w.t;
    while (this.i < this.stops.length - 1 && t >= this.stops[this.i][0]) this.i++;
    const [, x, z, act] = this.stops[this.i];
    const dx = x - pl.x, dz = z - pl.z, d = Math.hypot(dx, dz);
    if (d > 0.35) { const k = Math.min(1, d / 1.2); this.mv = { x: dx / d * k, y: dz / d * k }; } else this.mv = { x: 0, y: 0 };
    if (act && d < 0.9 && !this.done.has(this.i)) { this.done.add(this.i); this.pressed.push('strike'); }
  }
}
