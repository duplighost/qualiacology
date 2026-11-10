// B2 · I FUCKED YOUR DAD · THE EX. Dad's front yard as a ceramic holiday village on a giant dinner table, at
// night, in the first snow. The rule: the quiet is the warning. When the bass drops out she's pouring the gas:
// hit her while she pours, and don't be standing where she poured when the band comes back.
// Design: research/tracks/i-fucked-your-dad.md (times are song seconds; bars there are bars.py numbering).
import * as THREE from 'three';
import { Arena } from '../../game/arena.js';
import { buildEx, Pieces } from './ex.js';
import { YardSet, TIME, BLOCK } from './set.js';
import { yardLite } from './yard-lite.js';
import { YardSounds } from './sounds.js';
import { assistBot } from './botassist.js';
import { script } from './script.js';
import { canopyFade } from './canopy.js';
import { death } from './death.js';

const ID = 'i-fucked-your-dad';
// the checkpoints: where YOU and she stand when a section starts again (design §5)
export const CHECK = [
  { t: 0.0, you: [3.6, -0.6, -Math.PI / 2], her: [6.15, -0.6, Math.PI / 2], mode: 'still' },     // (her seat on the bed's far edge)
  { t: 11.178, you: [0, 3.0, Math.PI], her: [0.5, -1.0, 0], mode: 'story' },
  { t: 22.587, you: [6, 3.5, Math.PI], her: [-5, -3.8, 0], mode: 'story' },
  { t: 33.988, you: [4, 2.5, Math.PI], her: [-6.5, 0.2, 0], mode: 'story' },
  { t: 46.457, you: [0, 4.5, Math.PI], her: [0, 1.8, 0], mode: 'pour' },
  { t: 59.639, you: [0, 5.0, Math.PI], her: [4.5, -1.5, 0], mode: 'still' },
  { t: 95.268, you: [0, 3.0, Math.PI], her: [3.0, -1.0, 0], mode: 'story' },
  { t: 116.65, you: [-6, 4, Math.PI], her: [8.6, -4.6, 0], mode: 'story' },
  { t: 129.47, you: [0, 4.5, Math.PI], her: [4.8, -1.0, 0], mode: 'pour' },
  { t: 140.879, you: [0, 4.0, Math.PI], her: [0, -5.8, 0], mode: 'still' },
  { t: 166.539, you: [0, 4.5, Math.PI], her: [5.0, -0.6, 0], mode: 'story' },
  { t: 177.96, you: [0, 4.5, Math.PI], her: [-4.6, -0.6, Math.PI / 2], mode: 'pour' },
  { t: 195.056, you: [0, 4.5, Math.PI], her: [0, -3.8, 0], mode: 'still' },
  { t: 207.88, you: [0, 4.0, Math.PI], her: [0, -2.0, 0], mode: 'dance' },
];

export default {
  id: ID, beats: ID, par: 85000, lastHit: 231.6,
  spawn: { player: CHECK[0].you, boss: CHECK[0].her },
  death,                       // her end: death.js

  async buildArena(f) {
    this._f = f; this._started = false; this._outro = null;
    let base = null;
    try { base = await Arena.load(`assets/arenas/${ID}/${ID}.json`, f.app.renderer, f.scene, { camera: f.cam.cam }); }
    catch (e) { console.warn(`${ID}: no baked yard yet (${e.message}); the lite yard stands in`); }
    const lite = base ? null : yardLite(f.scene);
    if (base) { base.prepareCamera(f.cam.cam); base.setState(base.states[0].name); }
    const arena = base || lite;
    const set = this.set = new YardSet(f, arena);
    const canopy = base ? canopyFade(base) : null;
    const self = this;
    const w = {
      arena: base, lite, bounds: { ...arena.bounds },
      resolve: (x, z, r) => { const p = arena.resolve(x, z, r); const q = set.resolve(p.x, p.z, r); return base ? base.resolve(q.x, q.z, r) : arena.resolve(q.x, q.z, r); },
      strikeArc: (x, z, ang, range, arc, s, ff) => set.strikeArc && set.strikeArc(x, z, ang, range, arc, s, ff),
      update(dt, t, ff) {
        const st = self.songT(ff);
        set.update(dt, st);
        if (base) { set.light(base, st); canopy && canopy.update(dt, ff); base.update(dt, ff.cam.cam, ff.player.root.position); ff.app.post.fx.exposure = base.exposure * (set.exposureK ?? 1); }
        else set.light(null, st);
      },
      dispose() { set.dispose(); if (base) base.dispose(); if (lite) lite.dispose(); self._unpatch && self._unpatch(); },
    };
    return w;
  },

  async buildBoss(f) {
    const { boss, fig, dir } = await buildEx(f);
    this.dir = dir; this.fig = fig; this.pieces = new Pieces(fig);
    boss.arena = f.arena;
    await this.set.build(boss);
    dir.safeSpot = (x, z) => this.set.safeSpot ? this.set.safeSpot(x, z) : { x, z };
    if (!this._snd) { this._snd = new YardSounds(f); try { this._snd.load(); } catch (e) { console.warn('yard sounds', e.message); } }
    else { this._snd.f = f; this._snd.ctx = f.audio.ctx; this._snd.out = f.audio.sfx; this._snd.lib = f.sfx && f.sfx.s ? f.sfx.s : null; this._snd.register(); }
    const a = f.arena.arena;
    if (a && a.addCaster) { a.addCaster(f.player.root); a.addCaster(fig.root); }
    await this.warm(f);
    return boss;
  },

  // every set piece is hidden until its holiday: compile all their shaders now (in the loading veil), not the
  // first time each appears mid-song. Show everything, compile, render one frame offscreen (shadow and depth
  // variants too), then put the set back as it is at the start.
  async warm(f) {
    const r = f.app.renderer, sc = f.scene, cam = f.cam.cam;
    if (this.fig && !this.fig.world.parent) sc.add(this.fig.world);
    const hidden = [];
    sc.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    const culled = []; sc.traverse((o) => { if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
    try { if (r.compileAsync) await r.compileAsync(sc, cam); else r.compile(sc, cam); } catch (e) { console.warn('warm', e.message); }
    try {
      const base = f.arena.arena;
      if (base) { base.update(0, cam, f.player.root.position); base._captureEnv && base._captureEnv(); }
      r.shadowMap.needsUpdate = true;
      const rt = new THREE.WebGLRenderTarget(256, 144, { type: THREE.HalfFloatType });
      const prev = r.getRenderTarget(); r.setRenderTarget(rt); r.render(sc, cam); r.setRenderTarget(prev); rt.dispose();
    } catch (e) { console.warn('warm render', e.message); }
    for (const o of culled) o.frustumCulled = true;
    for (const o of hidden) o.visible = false;
    this.set.update(0, f.t || 0);
  },

  script(T, f) { script(T, f, this); },

  // song time, also after the finish (the fight's clock stops at the last hit; the song plays on)
  songT(f) {
    if (f.state === 'play' || f.state === 'dying' || f.state === 'rewinding' || f.state === 'encore' || f.state === 'paused' || !this._outro) return f.t;
    return this._outro.t;
  },

  onStart(f) { this._place(f, 0); this.set.update(0, 0); },
  onSection(f, sec) {
    const i = CHECK.findIndex((c) => Math.abs(c.t - sec.t0) < 0.05);
    if (i >= 0 && this.dir) { this.dir.mode = CHECK[i].mode; }
  },
  // a death's rewind, or the ENCORE's jump back to the final chorus (both call this; safe to run twice)
  onRewind(f, t) { this._vhs = 0; this._vhsOn = false; this._outro = null; this.set._finished = false; this._place(f, t); this.set.update(0, t); this._restoreLong(f, t); },
  onBreak(f, i) {
    const D = this.dir, b = f.boss;
    if (i === 0) this.pieces.breakFlannel();
    if (i === 1) this.pieces.breakHair();
    if (this._snd) this._snd.play('crash', { x: b.x, gain: 0.6, rate: 1.6 });
    if (D) { D.face('fury', f.beat * 2); if (!D.jump && !D._seated) b.perform('Hit_Knockback', { duration: f.beat * 2, fade: 0.05 }); }
  },
  onEmpty(f) { if (this.dir) { this.dir.wrecked = true; this.dir.setBase('wrecked'); } },
  onFinish(f) {
    this._outro = { t: f.t, manual: f.manual };
    this.set.finish && this.set.finish(f);
  },
  onEncore(f) { if (this.dir) this.dir.face('glee', 1.2); },
  // the spotlight blinds her, it doesn't un-pour the gas: the block's fill comes back when it ends
  onSpotlight(f, on) { if (this.dir && on) this.dir.face('shock', 1.0); if (!on && f.state === 'play') this._restoreLong(f, f.t, true); },

  update(f, dt) {
    if (!this._started) {
      this._started = true;
      if (f.t > 0.05) { this._place(f, f.t); this.set.update(0, f.t); this._restoreLong(f, f.t); }
      if (f.app.auto) assistBot(f, this.set, new URLSearchParams(location.search).get('auto') === 'bad');
    }
    if (this._outro) { this._outro.t += dt; }
    // YOU getting up off the bed (seatYou)
    { const st = this._seat; if (st && st.rate) { st.k = Math.max(0, st.k - st.rate * dt); st.pose(); if (st.k === 0) st.rate = 0; } }
    // the VHS blink between the glitch lunges: on while it runs, off the frame after (a death's rewind owns vhs otherwise)
    if (f.state === 'play') {
      if (this._vhs > 0) { this._vhs -= dt; f.app.post.fx.vhs = 0.6; this._vhsOn = true; }
      else if (this._vhsOn) { f.app.post.fx.vhs = 0; this._vhsOn = false; }
    }
    if (this.dir) this.dir.update(dt);
    // the camera: close in the bridges (the sections say so); the ghost and the outro come in from here. The fight
    // eases closeK toward its section's value after this runs, so a push at a steady rate is what holds it.
    // From the match strike to the eruption it opens back out: the whole soaked block, the ring of fire, the
    // matchbook and YOU at the street's edge are the picture (design §4.9), and YOU needs to see the way out.
    const st = this.songT(f);
    if ((st > 177.96 && st < 183.65) || this._outro) f.cam.closeK = Math.min(1, f.cam.closeK + dt * 4);
    else if (st > 52.52 && st < 60.4) f.cam.closeK = Math.max(0, f.cam.closeK - dt * 3);
  },

  // YOU starts seated on the bed's edge: any input and she's up in the same frame; untouched, she stands on "story".
  // The bed keeps her body out at x 3.6, and the sitting pose puts her hips a third of a metre behind her feet, which
  // left her sitting on the air beside the duvet: while she sits, her body sits back onto the bed (and up), and it
  // comes back over her feet as she gets up (over the stand, or in a moment if she's moving)
  seatYou(f) {
    const pl = f.player, rig = pl.rig, model = rig.model;
    if (this._unpatch) this._unpatch();
    const play = rig.play.bind(rig);
    let seated = true, standUntil = -1;
    const seat = this._seat = { k: 1, rate: 0, pose() { const e = this.k * this.k * (3 - 2 * this.k); model.position.y = 0.17 * e; model.position.z = -0.48 * e; } };
    seat.pose();
    rig.play('Sitting_Idle_Loop', { fade: 0, force: true });
    rig.play = (name, o = {}) => {
      const moving = pl.state !== 'free' || Math.hypot(pl.vx, pl.vz) > 0.25;
      if (seated && (moving || f.t > 2.12)) {
        seated = false; seat.rate = moving ? 1 / 0.12 : 1 / 0.62;
        if (!moving) { standUntil = f.t + 0.62; return rig.once('Sitting_Exit', { duration: 0.62, fade: 0.06, then: 'Sword_Idle' }); }
      }
      if (seated && name === 'Sword_Idle') return rig.base;
      if (!seated && f.t < standUntil && !moving && name === 'Sword_Idle') return rig.base;
      return play(name, o);
    };
    this._unpatch = () => { rig.play = play; model.position.y = 0; model.position.z = 0; this._seat = null; this._unpatch = null; };
  },

  // ---------------------------------------------------------------- rewinds
  _place(f, t) {
    const secs = f.T ? f.T.sections : [];
    let i = 0; secs.forEach((s, k) => { if (s.t0 <= t + 0.06) i = k; });
    const cp = CHECK[Math.min(i, CHECK.length - 1)];
    if (this._unpatch && t > 0.05) this._unpatch();
    f.player.place(...cp.you); f.boss.place(...cp.her);
    const D = this.dir, b = f.boss;
    if (D) {
      D.mode = cp.mode; D.lockUntil = t + 0.4; D.jump = null; D._seated = false; D.hitCount = 0; D.closeSince = -1; D.farSince = -1;
      b.root.position.y = 0; b.move = null;
      D.wrecked = b.state === 'desperate';
      D.setBase(D.wrecked ? 'wrecked' : (cp.mode === 'pour' ? 'hurt' : 'smug'));
    }
    if (this.pieces) this.pieces.restore(b.broken);
    b.idle = this.set.idleAt ? this.set.idleAt(t) : 'Idle_Talking_Loop';
    if (b.rig) b.rig.play(b.idleClip, { fade: 0.1, force: true });
  },
  // telegraphs already filling when a section starts again (re-added with their original start). Any copy this put
  // up before is taken down first, so it never doubles; onlyDead: re-add only one that something cleared.
  _restoreLong(f, t, onlyDead = false) {
    for (const L of this._long || []) {
      if (!(t > L.t0 + 0.01 && t < L.t1 - 0.02)) continue;
      if (onlyDead && L.tele && !L.tele.dead) continue;
      if (L.tele) L.tele.dead = true;
      const sh = L.fn(f);
      L.tele = (sh && sh.tele) || null;
    }
  },
};
