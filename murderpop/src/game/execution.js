// THE KILL. The song's last bars, once her bar is empty: the camera comes in and the two of you play out her end, one
// press to a beat. Each press is one of the four things you do (strike, guard, jump, dash), shown big with a ring closing
// on it: press as it closes. Hit or miss, the song goes on and so does the scene: a missed beat is a fumble and fewer
// points, never a death. The last press lands on the song's last hit, and that's the one that breaks her.
// (Alex, 9 Nov: "each boss really deserves their own death scene, it could be done well through quick time events and
// relate to the character.")
//
// A track gives its own with `death` on its export:
//   death: {
//     beats: 24,                        // how many beats before the last hit it starts (default: about 8 seconds' worth)
//     enter(X) {},                      // set the stage: X.place / X.go / X.cam / X.clip ...
//     steps: [                          // the presses, in order; b: beats before the last hit; the last one has last: true
//       { b: 16, key: 'strike', lead(X) {}, do(X, ok) {} },     // lead: as its ring starts to close (the wind-up);
//       ...                                                      // do: on the beat. ok: it was pressed in time
//       { last: true, key: 'strike', lead(X) {}, do(X, ok) {} },
//     ],
//     after(X) {},                      // she's gone: what YOU does with the last of the song
//   }
// X is the Stage below. With no `death` a track gets STANDARD (a cut, a lunge, the lift, one in the air, the dive).
import * as THREE from 'three';
import { MOVES, FEEL } from './player.js';

const GOLD = new THREE.Color(3.2, 2.0, 0.55), COPPER = new THREE.Color(2.3, 1.25, 0.6), PORCELAIN = new THREE.Color(2.2, 2.1, 2.0);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const EASE = { linear: (k) => k, in: (k) => k * k, out: (k) => 1 - (1 - k) * (1 - k), inOut: (k) => k * k * (3 - 2 * k), back: (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
// how early / late a press can be
const EARLY = 0.18, LATE = 0.13;
export const EXEC = { per: 400, last: 2500 };

// ------------------------------------------------------------------------------------------------ the stage manager
export class Stage {
  constructor(f) {
    this.f = f; this.tweens = []; this.acts = []; this.timers = []; this.added = []; this.T = f.t; this._shot = null; this._camK = 0; this._camOn = false;
    this._o = { pos: new THREE.Vector3(), look: new THREE.Vector3(), k: 0, fov: 0 };
    this._from = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 0 }; this._to = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 0 }; this._blend = 1; this._blendDur = 0.001;
  }
  get you() { return this.f.player; }
  get her() { return this.f.boss; }
  get t() { return this.T; }
  get beat() { return this.f.bm.periodAt(this.f.t); }
  get fx() { return this.f.fx; }
  get sfx() { return this.f.sfx; }
  get scene() { return this.f.scene; }
  who(w) { return w === 'you' ? this.you : w === 'her' ? this.her : w; }

  // ---- where they are
  place(w, x, z, facing) { const o = this.who(w); o.x = x; o.z = z; if (facing !== undefined) o.facing = facing; this._drop(o, 'xz'); o._sync(); }
  face(w, x, z) { const o = this.who(w); o.facing = Math.atan2(x - o.x, z - o.z); }
  faceEach() { const a = this.you, b = this.her; a.facing = Math.atan2(b.x - a.x, b.z - a.z); b.facing = Math.atan2(a.x - b.x, a.z - b.z); }
  // go to (x, z) over sec seconds. arc: how much higher at the middle of it (a leap). y: the height to end at (up onto
  // something, back down to the floor)
  go(w, x, z, sec = 0.3, { ease = 'inOut', arc = 0, face = false, y } = {}) {
    const o = this.who(w); this._drop(o, 'xz'); if (arc || y !== undefined) this._drop(o, 'y');
    if (face) o.facing = Math.atan2(x - o.x, z - o.z);
    const y0 = this._y(o);
    this.tweens.push({ o, kind: 'xz', fx: o.x, fz: o.z, tx: x, tz: z, t0: this.T, dur: Math.max(0.001, sec), ease: EASE[ease] || EASE.inOut, arc, y0, y1: y ?? y0, hasY: !!arc || y !== undefined });
  }
  // the whole body, over the clip: y (lift), spin (turns about its own axis, radians), pitch (tip forward), roll
  body(w, to, sec = 0.2, ease = 'inOut') {
    const o = this.who(w), B = o.rig.body; this._drop(o, 'body');
    this.tweens.push({ o, kind: 'body', B, from: { y: B.y, spin: B.spin, pitch: B.pitch, roll: B.roll }, to: { y: B.y, spin: B.spin, pitch: B.pitch, roll: B.roll, ...to }, t0: this.T, dur: Math.max(0.001, sec), ease: EASE[ease] || EASE.inOut });
  }
  // her height off the floor (YOU's is you.y)
  lift(w, y, sec = 0.2, ease = 'out') { const o = this.who(w); this._drop(o, 'y'); this.tweens.push({ o, kind: 'y', from: this._y(o), to: y, t0: this.T, dur: Math.max(0.001, sec), ease: EASE[ease] || EASE.out }); }
  _y(o) { return o === this.you ? o.y : (o._sceneY || 0); }
  _setY(o, y) { if (o === this.you) { o.y = y; o.grounded = y <= 0.001; } else { o.root.position.y += y - (o._sceneY || 0); o._sceneY = y; } }
  _drop(o, kind) { this.tweens = this.tweens.filter((t) => !(t.o === o && t.kind === kind)); }

  // ---- what they do
  // a clip on her or you, whole body. dur: fit the window [from, to] into this many seconds; loop; hold: stay on the last pose
  clip(w, name, { dur = 0, from = 0, to = 1, fade = 0.08, loop = false, speed = 1 } = {}) {
    const o = this.who(w), rig = o.rig, c = rig.kit.clips[name];
    if (!c) { console.warn('scene: no clip', name); return; }
    this.acts = this.acts.filter((a) => a.rig !== rig);
    const span = c.duration * (to - from), a = rig.mixer.clipAction(c);
    a.reset(); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); a.clampWhenFinished = true;
    a.timeScale = dur > 0 ? span / dur : speed; a.time = c.duration * from; a.enabled = true; a.setEffectiveWeight(1);
    if (rig.base && rig.base !== a) a.crossFadeFrom(rig.base, fade, false);
    a.play(); rig.base = a; rig.baseName = name; rig._onceEnd = 0; rig._then = null; rig.events = [];
    if (rig.upperAct) { rig.upperAct.fadeOut(0.05); rig.upperAct = null; }
    if (!loop && to < 1) this.acts.push({ rig, a, stopAt: c.duration * to });
  }
  // one of YOU's moves (a name in MOVES), its hit landing at song time `at` (or as soon as it can), then following through
  strike(move, at = this.T, { who = 'you', rec } = {}) {
    const def = typeof move === 'string' ? MOVES[move] : move, o = this.who(who), rig = o.rig;
    if (!def) return;
    this.acts = this.acts.filter((a) => a.rig !== rig);
    rig.upperStop && rig.upperStop(0.03);
    rig.scrub(def.clip, { from: def.from, to: def.to, fade: 0.04 });
    const t0 = this.T, tHit = Math.max(at, t0 + 0.05);
    this.acts.push({ rig, def, t0, tHit, rec: rec ?? def.rec, stop: def.stop, k0: 1 - clamp((tHit - t0) / def.wind, 0.22, 1), strike: true });
    this.f.sfx.swing && this.f.sfx.swing({ name: def.sfx }, this.you);
  }
  // the cut's arc in the air, for a strike landing now
  slash(move, { gold = true, who = 'you' } = {}) {
    const def = typeof move === 'string' ? MOVES[move] : move, o = this.who(who), ang = o.facing;
    this.f.fx.slash && this.f.fx.slash({ x: o.x, y: this._y(o), z: o.z }, { def, on: gold, sweep: def.sweep, finisher: !!def.finisher, heavy: !!def.heavy }, ang);
  }
  // the blow lands on her: sparks, chips off her, cracks, the picture stops, the sound. power 0..2; gold: it was pressed in time
  hit({ power = 1, gold = true, dir, y = 1.25, at = null, quiet = false } = {}) {
    const f = this.f, b = this.her, pl = this.you;
    const d = dir ?? Math.atan2(b.x - pl.x, b.z - pl.z), x = at ? at.x : b.x, z = at ? at.z : b.z, yy = (at ? at.y : y) + (b._sceneY || 0);
    const hot = gold ? GOLD : COPPER, k = clamp(power, 0.3, 2.4);
    f.fx.sparks(x, yy, z, hot, Math.round(18 * k), d); f.fx.chips(x, yy, z, PORCELAIN, Math.round(9 * k), d);
    if (gold) f.fx.glitter(x, yy + 0.1, z, GOLD, Math.round(9 * k), 0.4);
    f.fx.impact && f.fx.impact(x, yy, z, d, { gold, power: 0.9 + 0.7 * k });
    b.rig && b.rig.hitStop && b.rig.hitStop(0.05 + 0.05 * k); pl.rig.hitStop(0.04 + 0.04 * k);
    b.shove && b.shove(d, 0.25 * k, k > 1.2);
    f.cam.shake(0.3 + 0.4 * k, 0.16); if (k > 1.1) f.cam.kick(1.2 * k);
    if (k >= 1.5) { f.fx.flash(new THREE.Color(0.16, 0.11, 0.03), 1); f.fx.aberrate(1.6); }
    if (!quiet) { f.sfx.hit && f.sfx.hit({ heavy: k > 1.1, onBeat: gold, pan: f.pan(x), crit: k >= 1.6, tier: k >= 1.6 ? 4 : k > 1.1 ? 3 : gold ? 2 : 1 }); if (gold && k >= 1.2) f.sfx.goldBurst && f.sfx.goldBurst(f.pan(x)); }
    b.fig && b.fig.hitAt && b.fig.hitAt(new THREE.Vector3(x, yy, z), new THREE.Vector3(Math.sin(d), 0, Math.cos(d)), { power: 0.8 + 0.7 * k, chips: true });
    if (gold) f._glimmer && f._glimmer(Math.min(3, Math.round(k)), true);
  }

  // ---- the camera: a shot by name, or { pos: [x, y, z], look: [x, y, z] }. blend: seconds to get there (0: a cut)
  // 'two': side on to the pair of you, from the audience. 'her' / 'you': close on one, low. 'wide': the room.
  // 'low': from the floor between you, looking up. 'over': over YOU's shoulder at her. 'top': straight down on her.
  cam(shot, { fov, blend = 0, dist, h, side } = {}) {
    const p = this.you, b = this.her, by = b._sceneY || 0, mx = (p.x + b.x) / 2, mz = (p.z + b.z) / 2, sep = Math.hypot(p.x - b.x, p.z - b.z);
    let pos, look, fv = fov || 34;
    const S = side ?? (b.x >= p.x ? 1 : -1);
    if (typeof shot === 'object') { pos = shot.pos; look = shot.look; fv = fov || shot.fov || 34; }
    else if (shot === 'two') { const d = dist ?? Math.max(5.2, sep * 1.05 + 3.4); pos = [mx, h ?? 1.45, mz + d]; look = [mx, 1.15 + Math.max(by, p.y) * 0.5, mz]; }
    else if (shot === 'her') { const d = dist ?? 3.4; pos = [b.x - S * 1.1, (h ?? 1.5) + by, b.z + d]; look = [b.x, 1.35 + by, b.z]; fv = fov || 30; }
    else if (shot === 'you') { const d = dist ?? 3.2; pos = [p.x + S * 1.0, (h ?? 1.1) + p.y * 0.6, p.z + d]; look = [p.x, 1.3 + p.y, p.z]; fv = fov || 30; }
    else if (shot === 'low') { const d = dist ?? 4.6; pos = [mx - S * 0.6, h ?? 0.45, mz + d]; look = [mx, 1.5 + Math.max(by, p.y) * 0.7, mz]; fv = fov || 40; }
    else if (shot === 'over') { const a = Math.atan2(b.x - p.x, b.z - p.z), d = dist ?? 2.6; pos = [p.x - Math.sin(a) * d + Math.cos(a) * 0.9, (h ?? 1.75) + p.y, p.z - Math.cos(a) * d - Math.sin(a) * 0.9]; look = [b.x, 1.3 + by, b.z]; fv = fov || 38; }
    else if (shot === 'top') { pos = [b.x, (h ?? 7.5), b.z + 2.2]; look = [b.x, 0.6, b.z]; fv = fov || 36; }
    else { const d = dist ?? 12; pos = [mx * 0.5, h ?? 3.6, mz + d]; look = [mx * 0.5, 1.4, mz - 1]; fv = fov || 40; }     // wide
    // never behind the audience's side of nothing: keep it inside what the set shows
    const R = this.f.cam.room; if (R && typeof shot !== 'object') pos[1] = Math.min(pos[1], R.top - 0.8);
    if (!this._camOn || blend <= 0) { this._to.pos.set(...pos); this._to.look.set(...look); this._to.fov = fv; this._from.pos.copy(this._to.pos); this._from.look.copy(this._to.look); this._from.fov = fv; this._blend = 1; }
    else { this._from.pos.copy(this._o.pos); this._from.look.copy(this._o.look); this._from.fov = this._o.fov || fv; this._to.pos.set(...pos); this._to.look.set(...look); this._to.fov = fv; this._blend = 0; this._blendDur = blend; }
    this._camOn = true; this._shot = shot; this._follow = null;
  }
  // keep a named shot on them as they move (the camera rides with the scene until the next cam())
  follow(shot, o = {}) { this.cam(shot, o); this._follow = { shot, o: { ...o, blend: 0 } }; }
  camOff(sec = 0.8) { this._camOff = { t0: this.T, dur: Math.max(0.01, sec), k0: this._camK }; }

  // ---- the rest
  after(sec, fn) { this.timers.push({ t: this.T + sec, fn }); }
  at(t, fn) { this.timers.push({ t, fn }); }
  flash(c = new THREE.Color(0.2, 0.16, 0.08), k = 1) { this.f.fx.flash(c, k); }
  shake(a = 0.6, t = 0.2) { this.f.cam.shake(a, t); }
  add(obj) { this.f.scene.add(obj); this.added.push(obj); return obj; }
  remove(obj) { this.f.scene.remove(obj); }
  // how she breaks on the last hit: { dir: Vector3, power, at: Vector3 } ; { none: true }: the scene deals with her itself
  shatter(o) { this.f._shatterOpts = o; }
  expr(name, w = 1) { this.you.h.setExpression && this.you.h.setExpression(name, w); }
  // her painted face: an expression by name (see EXPRESSIONS in src/game/figurine.js)
  herFace(name) { const fig = this.her.fig; fig && fig.setExpression && fig.setExpression(name); }

  update(dt) {
    const f = this.f;
    // the scene's clock: the song's while it plays, its own once the song has stopped on the last hit
    const adv = f.t - (this._ft ?? f.t); this._ft = f.t;
    this.T = adv > 1e-6 && adv < 0.3 ? f.t : this.T + dt;
    const T = this.T;
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].t <= T) { const tm = this.timers.splice(i, 1)[0]; try { tm.fn(this); } catch (e) { console.error('scene', e); } }
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const w = this.tweens[i], k = clamp((T - w.t0) / w.dur, 0, 1), e = w.ease(k);
      if (w.kind === 'xz') { w.o.x = w.fx + (w.tx - w.fx) * e; w.o.z = w.fz + (w.tz - w.fz) * e; if (w.hasY) this._setY(w.o, w.y0 + (w.y1 - w.y0) * e + w.arc * 4 * k * (1 - k)); }
      else if (w.kind === 'y') this._setY(w.o, w.from + (w.to - w.from) * e);
      else if (w.kind === 'body') { for (const key of ['y', 'spin', 'pitch', 'roll']) w.B[key] = w.from[key] + (w.to[key] - w.from[key]) * e; }
      if (k >= 1) this.tweens.splice(i, 1);
    }
    for (let i = this.acts.length - 1; i >= 0; i--) {
      const a = this.acts[i];
      if (a.strike) {
        if (a.rig.base && a.rig.baseName !== a.def.clip) { this.acts.splice(i, 1); continue; }
        if (T < a.tHit) { const u = clamp((T - a.t0) / Math.max(1e-3, a.tHit - a.t0), 0, 1); a.rig.scrubTo(a.def.hit * (a.k0 + (1 - a.k0) * Math.pow(u, 1.7))); }
        else { const u = clamp((T - a.tHit - a.stop) / a.rec, 0, 1); a.rig.scrubTo(a.def.hit + (1 - a.def.hit) * (1 - Math.pow(1 - u, 2.4)) * 0.85); if (u >= 1) this.acts.splice(i, 1); }
      } else if (a.a.time >= a.stopAt) { a.a.timeScale = 0; a.a.time = a.stopAt; this.acts.splice(i, 1); }
    }
    this.you._sync(); this.her._sync();
    // the camera
    if (this._camOn) {
      if (this._follow) { const fl = this._follow; this._follow = null; this.cam(fl.shot, fl.o); this._follow = fl; }
      if (this._blend < 1) this._blend = Math.min(1, this._blend + dt / this._blendDur);
      const e = EASE.inOut(this._blend), o = this._o;
      o.pos.lerpVectors(this._from.pos, this._to.pos, e); o.look.lerpVectors(this._from.look, this._to.look, e); o.fov = this._from.fov + (this._to.fov - this._from.fov) * e;
      if (this._camOff) { const k = clamp((T - this._camOff.t0) / this._camOff.dur, 0, 1); this._camK = this._camOff.k0 * (1 - EASE.inOut(k)); if (k >= 1) { this._camOn = false; this._camOff = null; f.cam.override = null; f.app.post.fx.letterbox = 0; return; } }
      else this._camK = Math.min(1, this._camK + dt / 0.28);
      o.k = EASE.inOut(this._camK);
      f.cam.override = o; f.app.post.fx.letterbox = 0.45 * o.k;
    }
  }
  dispose() { for (const o of this.added) this.f.scene.remove(o); this.added.length = 0; }
}

// ------------------------------------------------------------------------------------------------ the standard one
// For a track with no death of its own: a cut, a lunge that drives her back, the lift, one in the air, and the dive.
export const STANDARD = {
  enter(X) {
    const p = X.you, b = X.her, R = X.f.bounds;
    // side by side across the stage, a couple of steps apart, where there's room
    const side = b.x > 0 ? -1 : 1;
    let x = clamp(b.x + side * 2.3, R.minX + 1, R.maxX - 1);
    X.go('you', x, b.z, X.beat * 1.5, { ease: 'out' }); X.after(X.beat * 1.5, () => X.faceEach());
    X.face('her', x, b.z); X.clip('her', 'Hit_Knockback', { dur: X.beat * 2, from: 0, to: 0.8 });
    X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.2 }); X.face('you', b.x, b.z);
    X.after(X.beat * 1.5, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }));
    X.cam('two', { blend: 0 });
    X.follow('two');
  },
  steps: (nb) => [
    { b: Math.round(nb * 0.62), key: 'strike', lead(X, s) { X.strike('cut', s.t); }, do(X, ok) { X.slash('cut', { gold: ok }); X.hit({ power: ok ? 1.1 : 0.6, gold: ok }); X.clip('her', 'Hit_Chest', { dur: 0.4 }); } },
    { b: Math.round(nb * 0.5), key: 'strike', lead(X, s) { X.strike('thrust', s.t); }, do(X, ok) { const b = X.her, p = X.you, a = Math.atan2(b.x - p.x, b.z - p.z); X.slash('thrust', { gold: ok }); X.hit({ power: ok ? 1.3 : 0.6, gold: ok }); X.clip('her', 'Hit_Knockback', { dur: 0.5, to: 0.7 }); const R = X.f.bounds; X.go('her', clamp(b.x + Math.sin(a) * 1.2, R.minX + 1, R.maxX - 1), clamp(b.z + Math.cos(a) * 1.2, R.minZ + 1, R.maxZ - 1), 0.2, { ease: 'out' }); X.go('you', p.x + Math.sin(a) * 1.0, p.z + Math.cos(a) * 1.0, 0.18, { ease: 'out' }); } },
    { b: Math.round(nb * 0.33), key: 'jump', lead(X, s) { X.strike('lift', s.t); X.follow('low'); }, do(X, ok) { X.slash('lift', { gold: ok }); X.hit({ power: ok ? 1.5 : 0.7, gold: ok }); X.clip('her', 'Jump_Loop', { loop: true }); X.lift('her', ok ? 2.3 : 1.5, X.beat * 1.2, 'out'); X.body('her', { pitch: -Math.PI * 2 }, X.beat * 2.4, 'out'); X.lift('you', ok ? 2.2 : 1.3, X.beat * 1.2, 'out'); X.after(0.25, () => X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.1 })); } },
    { b: Math.round(nb * 0.2), key: 'strike', lead(X, s) { X.strike('aspin', s.t); }, do(X, ok) { X.slash('aspin', { gold: ok }); X.hit({ power: ok ? 1.3 : 0.6, gold: ok, y: 1.2 }); X.body('her', { pitch: -Math.PI * 4, roll: 0.5 }, X.beat * 2, 'out'); } },
    { last: true, key: 'strike', lead(X, s) { X.strike('dive', s.t); X.follow('two', { h: 0.8 }); X.lift('her', 0, Math.max(0.05, s.t - X.t), 'in'); X.lift('you', 0, Math.max(0.05, s.t - X.t), 'in'); },
      do(X, ok) { const b = X.her; X.slash('dive', { gold: ok }); X.hit({ power: 2.2, gold: ok }); X.fx.ring && X.fx.ring(b.x, b.z, GOLD, 3.2); X.fx.dust(b.x, b.z, 18); X.shatter({ dir: new THREE.Vector3(0, -1, 0.2), power: ok ? 1.5 : 1 }); } },
  ],
  after(X) { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.25 }); X.lift('you', 0, 0.1); X.expr('A_Amused'); },
};

// ------------------------------------------------------------------------------------------------ the kill itself
export class Execution {
  constructor(f) {
    this.f = f; this.on = false; this.done = false; this.over = false; this.i = 0; this.hits = 0; this.total = 0; this.bank = 0;
    this.spec = f.track.death || STANDARD; this.X = null; this.prompt = null;
    this.plan();
  }
  plan() {
    const f = this.f, bm = f.bm, spec = this.spec;
    const bEnd = Math.round(bm.beatAt(f.lastHit));
    // about eight seconds of the song, in whole bars
    const nb = spec.beats || Math.max(8, Math.round(8 / bm.period / 4) * 4);
    this.nb = nb; this.t0 = bm.timeOf(bEnd - nb);
    const steps = typeof spec.steps === 'function' ? spec.steps(nb, f) : spec.steps;
    this.steps = steps.map((s) => ({ ...s, t: s.last ? f.lastHit : (s.t ?? bm.timeOf(bEnd - s.b)), state: 'wait' })).sort((a, b) => a.t - b.t);
    this.total = this.steps.length;
    // a press's ring closes over two ticks (at least half a second, never past the one before)
    const tp = bm.tickPeriod(f.lastHit);
    this.steps.forEach((s, i) => { const prev = i ? this.steps[i - 1].t : this.t0; s.lead0 = Math.max(prev + 0.02, s.t - Math.max(0.55, tp * 2)); });
  }
  reset() { if (this.on) this.stop(true); this.on = false; this.done = false; this.over = false; this.i = 0; this.hits = 0; this.bank = 0; for (const s of this.steps) { s.state = 'wait'; s.led = false; s.pressed = undefined; } }

  // the step whose ring is closing (for the HUD, and the bot)
  current() { const s = this.steps[this.i]; return this.on && s && this.f.t >= s.lead0 - 0.001 ? s : null; }

  start() {
    const f = this.f, pl = f.player, b = f.boss;
    this.on = true;
    // whatever was going on stops: the rings, the juggle, her script's hold on her
    f.finale.hold = true; f.finale.rings.length = 0;
    if (f._airOn) { const o = f._airOn, r = b.root; r.position.x -= o.dx; r.position.y -= o.dy; r.position.z -= o.dz; r.rotation.z = 0; f._airOn = null; }
    if (f.air) { f.air.up = false; f.air.y = 0; f.air.vy = 0; }
    b.airY = 0; b.pinned = false; b.scene = true; b.move = null; b.busyUntil = 0; b.dazeUntil = 0; b.intangible = false; b._sceneY = 0; b.shX = b.shZ = 0;
    if (b.rig) { const B = b.rig.body; B.y = B.spin = B.pitch = B.roll = 0; b.rig.timeScale = 1; }
    b._wrapRig && b._wrapRig();
    pl.scene(true);
    f.proj.clear('boss'); f.tele.clear(); f.hud.keycap(false); f.hud.root.classList.add('mp-scene');
    // steps that have gone by (her bar emptied late): skipped, without a miss
    while (this.i < this.steps.length - 1 && f.t > this.steps[this.i].t - 0.25) { this.steps[this.i].state = 'skipped'; this.i++; }
    this.total = this.steps.length - this.i;
    this.X = new Stage(f);
    f.track.onDeathScene && f.track.onDeathScene(f, this.X);
    try { (this.spec.enter || STANDARD.enter)(this.X, this); } catch (e) { console.error('death scene enter', e); }
    f.sfx.execStart && f.sfx.execStart();
  }

  update(dt) {
    const f = this.f;
    if (this.over) { if (this.X) this.X.update(dt); return; }
    if (!this.on) {
      // it begins when the song reaches its last bars with her bar empty (or the moment her bar empties, inside them)
      if (f.state === 'play' && f.harmless && f.boss.state !== 'finished' && f.t >= this.t0 && f.t < f.lastHit - 0.35 && f.track.deathScene !== false && f.spotUntil <= 0) this.start();
      else return;
    }
    const X = this.X, now = performance.now(), I = f.input, t = X.T;
    X.update(dt);
    // every press: the right one in the window lands the beat; the rest are let go
    const got = {};
    for (const a of ['strike', 'parry', 'jump', 'dash']) { let p; while ((p = I.take(a, now, 500))) got[a] = p.songT ?? t; }
    I.takeRelease && I.takeRelease('strike'); I.takeRelease && I.takeRelease('parry');
    const s = this.steps[this.i];
    if (s) {
      if (!s.led && t >= s.lead0) { s.led = true; try { s.lead && s.lead(X, s); } catch (e) { console.error('death scene lead', e); } }
      if (s.state === 'wait' && got[s.key] !== undefined && t >= s.t - EARLY && t <= s.t + LATE) { s.state = 'armed'; s.pressed = t; }
      // on the beat (or now, if the press came after it): the beat happens
      if (s.state === 'armed' && t >= s.t - 0.004) this._land(s, true);
      else if (s.state === 'wait' && t > s.t + LATE) this._land(s, false);
    }
    // the HUD's prompt
    const c = this.steps[this.i];
    if (c && t >= c.lead0) {
      const k = clamp((c.t - t) / Math.max(0.05, c.t - c.lead0), 0, 1);
      this.prompt = { key: c.key, k, state: c.state === 'armed' ? 'hit' : 'wait', n: this.i - (this.steps.length - this.total), of: this.total, dev: I.used === 'keys' ? 'keys' : 'mouse', last: !!c.last };
    } else if (this._flash && t < this._flash.until) this.prompt = { key: this._flash.key, k: 0, state: this._flash.ok ? 'hit' : 'miss', of: this.total, dev: I.used === 'keys' ? 'keys' : 'mouse' };
    else this.prompt = null;
  }

  _land(s, ok) {
    const f = this.f, X = this.X;
    s.state = ok ? 'hit' : 'miss';
    if (ok) this.hits++;
    const m = (f.finale.mult || 1) * (f.finale.kept || 1), pts = ok ? Math.round((s.last ? EXEC.last : EXEC.per) * m) : 0;
    if (pts) { this.bank += pts; f.finale.bank += pts; f.score += pts; f._pop('+' + pts.toLocaleString('en-US'), f.boss.x, 2.5 + (f.boss._sceneY || 0), f.boss.z, s.last ? 'huge' : 'gold'); }
    if (s.last && ok) f.finale.finalBlow = true;
    this._flash = { key: s.key, ok, until: X.T + 0.22 };
    if (!ok) { f.sfx.deflect && f.sfx.deflect(0); }
    try { s.do && s.do(X, ok, s); } catch (e) { console.error('death scene step', e); }
    this.i++;
    if (s.last || this.i >= this.steps.length) { this.done = true; }
  }

  // the fight has broken her (the last hit): the scene plays out, then lets go of the camera and of YOU
  finish() {
    if (!this.on || this.over) return;
    this.over = true; this.prompt = null;
    const X = this.X, f = this.f;
    try { (this.spec.after || STANDARD.after)(X, this); } catch (e) { console.error('death scene after', e); }
    X.after(this.spec.hold ?? 1.6, () => { X.camOff(1.0); this.stop(); });
  }
  stop(hard = false) {
    const f = this.f, pl = f.player, b = f.boss;
    pl.scene(false); if (b) { b.scene = false; if (b._sceneY) { b.root.position.y -= b._sceneY; b._sceneY = 0; } }
    if (b && b.rig) { const B = b.rig.body; B.y = B.spin = B.pitch = B.roll = 0; }
    f.finale.hold = false; this.prompt = null; f.hud.root.classList.remove('mp-scene');
    if (hard && this.X) { f.cam.override = null; f.app.post.fx.letterbox = 0; this.X.dispose(); this.X = null; this.on = false; }
  }
  dispose() { if (this.X) { this.X.dispose(); } this.f.hud.qte && this.f.hud.qte(null); this.f.hud.root.classList.remove('mp-scene'); }
}
