// The director: the tools the script uses to stage THE MOURNER on the song's beats. Positions are the design's
// bars (bars.py counts from 0, so B(42, 4) is the engine's '43:4'). Every attack is a span with absolute song
// times: a rewind that lands inside one restarts it with its telegraph at the right fill. Her poses, her face, her
// sceptre, the slap she gives anyone who stands in her face, and YOU's exit from the casket live here too.
import * as THREE from 'three';
import { inShape } from '../../game/choreo.js';
import { aimSceptre } from './mourner.js';
import { handGeometry, mats } from './props.js';
import { FXK } from '../../engine/post.js';

export const B = (bar, beat = 1) => `${bar + 1}:${beat}`;
const TAU = Math.PI * 2;
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const FACE = { pout: 'smug', kiss: 'pout', cackle: 'delight', grief: 'hurt', fury: 'fury', neutral: 'neutral', shock: 'shock', sing: 'sing' };
const GREY = new THREE.Color(0.5, 0.5, 0.56);

export class Director {
  constructor(f, tr) {
    this.f = f; this.tr = tr;
    this.spans = []; this.marks = [];
    this.scMode = 'shoulder';
    this.lastSlap = -99; this.faceT = 0;
    this.hands = [];
  }
  get boss() { return this.f.boss; }
  get fig() { return this.f.boss && this.f.boss.fig; }
  get snd() { return this.tr.sounds; }
  get dead() { return this.f.boss.state === 'desperate'; }
  time(pos) { return typeof pos === 'number' && !this._T ? pos : this._T.time(pos); }
  bind(T) { this._T = T; }

  // ---------------------------------------------------------------- scheduling
  at(pos, fn) { this._T.at(pos, (f) => fn(f, this._T.time(pos))); return this; }
  // an attack from p0 (its wind-up) to p1 (its impact): fn(f, t0, t1, late) at p0; restarted by a rewind inside it
  span(p0, p1, fn) {
    const t0 = this._T.time(p0), t1 = this._T.time(p1);
    this.spans.push({ t0, t1, fn });
    this._T.at(p0, (f) => fn(f, t0, t1, false));
    return { t0, t1 };
  }
  // where she should be (she drifts there on her spring, or slides, or leaps)
  mark(pos, x, z, how = 'drift', dur) {
    const t = this._T.time(pos);
    this.marks.push({ t, x, z });
    this._T.at(pos, () => this.go(x, z, how, dur));
  }
  go(x, z, how = 'drift', dur) {
    const b = this.boss;
    if (how === 'place') { b.place(x, z); b.setMark(x, z); return; }
    if (how === 'slide') { this.slide(x, z, dur ?? 0.33); return; }
    if (how === 'leap') { this.leap(x, z, dur ?? 0.65); return; }
    b.setMark(x, z, { snap: how === 'snap' });
  }
  // after a rewind or a start anywhere: restart what's mid-wind-up, put her mark where the timeline has it
  resync(t, first = false) {
    const m = this.marks.filter((x) => x.t <= t + 1e-3).pop();
    if (m) { if (first) this.boss.place(m.x, m.z); this.boss.setMark(m.x, m.z); }
    for (const s of this.spans) if (s.t0 < t - 1e-3 && t < s.t1 - 0.08) s.fn(this.f, s.t0, s.t1, true);
    this.lastSlap = t;
  }

  // ---------------------------------------------------------------- her body
  act(clip, dur, { from = 0, to = 1, then = null, fade = 0.08 } = {}) {
    const b = this.boss; if (!b.rig || b.state === 'stagger') return;
    b.rig.once(clip, { duration: dur, from, to, fade, then: then || b.idleClip });
    b.busyUntil = Math.max(b.busyUntil || 0, this.f.t + dur);
  }
  hold(clip, at, until, fade = 0.12) {
    const b = this.boss; if (!b.rig) return;
    b.rig.play(clip, { speed: 0, offset: at, fade, force: true });
    b.busyUntil = Math.max(b.busyUntil || 0, until);
  }
  loop(clip, until, speed = 1) { const b = this.boss; if (!b.rig) return; b.rig.play(clip, { fade: 0.15, speed, force: true }); b.busyUntil = Math.max(b.busyUntil || 0, until); }
  free() { this.boss.busyUntil = 0; }
  face(name, fade = 0.14) { const fg = this.fig; if (fg) fg.setExpression(FACE[name] || name, { fade }); }
  // a power slide across the floor (8 m/s), a skid behind
  slide(x, z, dur) {
    const b = this.boss, d = Math.hypot(x - b.x, z - b.z);
    dur = dur ?? Math.max(0.25, d / 8);
    b.faceNow(x, z);
    b.moveTo(x, z, dur, { easing: 'out', face: false });
    b.setMark(x, z);
    this.act('Slide_Loop', dur, { from: 0, to: 1, fade: 0.06 });
    this.snd && this.snd.play('cloth', { x: b.x, gain: 0.7 });
  }
  // a leap: off the floor (only thrown rings reach her up there), down on the beat
  leap(x, z, dur) {
    const b = this.boss;
    b.faceNow(x, z);
    b.moveTo(x, z, dur, { easing: 'inOut', face: false });
    b.setMark(x, z);
    this.act('NinjaJump_Start', dur * 0.3, { then: 'NinjaJump_Idle_Loop' });
    this.f.after(dur * 0.82, () => this.act('NinjaJump_Land', 0.3));
    this.leapT0 = this.f.t; this.leapT1 = this.f.t + dur;
  }
  get airborne() { return this.f.t > (this.leapT0 ?? -9) && this.f.t < (this.leapT1 ?? -9); }

  // the poses of THE SHOT (called by Shots)
  onPose(s, phase) {
    const f = this.f, b = this.boss;
    if (b.state === 'stagger') return;
    const custom = s.pose;
    if (phase === 'raise') {
      this.scMode = 'up';
      if (custom === 'sit' || custom === 'lounge') this.hold('Sitting_Idle_Loop', 0.3, s.t1);
      else if (custom === 'corpse') this.hold('Idle_FoldArms_Loop', 0.5, s.t1);
      else if (custom === 'casket') this.hold('LayToIdle', 0.4, s.t1);
      else if (custom === 'pistol') this.loop('Pistol_Idle_Loop', s.t1);
      else { this.act('Spell_Simple_Enter', Math.min(0.4, (s.t1 - s.t0) * 0.5), { then: 'Spell_Simple_Idle_Loop' }); b.busyUntil = s.t1; }
      this.face(s.face || 'pout');
      b.pose = null;
    } else if (phase === 'hold' || phase === 'fury') {
      const until = s.tHold;
      if (custom === 'sit' || custom === 'lounge') this.hold('Sitting_Idle_Loop', 0.3, until);
      else if (custom === 'vogue') this.hold('Sword_Block', 0.15, until);
      else if (custom === 'corpse') this.hold('Idle_FoldArms_Loop', 0.5, until);
      else if (custom === 'casket') this.hold('LayToIdle', 0.4, until);
      else if (custom === 'pistol') { this.act('Pistol_Shoot', 0.25, { then: 'Pistol_Idle_Loop' }); b.busyUntil = until; }
      else { this.act('Spell_Simple_Shoot', 0.22, { from: 0.1, to: 0.6 }); f.after(0.2, () => { if (b.pose && f.t < b.pose.until) this.hold('Spell_Simple_Idle_Loop', 0.4, until); }); b.busyUntil = until; }
      b.pose = { until, kind: custom || 'admire' };
      this.face(phase === 'fury' ? 'fury' : (s.holdFace || 'pout'), 0.2);
      this.admire = custom ? 0 : 1;
    } else if (phase === 'release') {
      b.pose = null; this.admire = 0;
      this.scMode = 'shoulder';
      if (b.busyUntil > f.t + 0.05 && !custom) b.busyUntil = f.t;
      if (!custom) this.act('Spell_Simple_Exit', 0.28);
      else this.free();
      this.face('pout', 0.2);
      // the hair flip out of the pose
      this.flip = 0.3;
    }
  }

  // ---------------------------------------------------------------- telegraphs and attacks (absolute times)
  tele(o) {
    const kind = this.dead ? 'grey' : o.kind || 'white';
    return this.f.tele.add({ ...o, kind, color: kind === 'grey' ? GREY : o.color });
  }
  // an area landing at o.end; ghosted (grey, harmless) once her bar is empty. A notch dissolves it unless it is a
  // set hazard already moving (keep: the pallbearers, the hearses, the door). Nothing lands unseen: if its telegraph
  // went dark before the impact (your spotlight wiped it, or it began under the spotlight and never showed), her
  // attack fizzles (o.onFizzle), and a set hazard still moves but can't hurt you. Once her bar is empty the set
  // hazards draw grey and can't hurt you either (nothing she does keeps hurting you after her bar is gone).
  area(o) {
    const f = this.f;
    if (this.dead && !o.keep) { this.tele({ ...o, start: o.start ?? f.t }); return null; }
    const sh = { shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h ?? o.w, param: o.param ?? 0.5 };
    const gen = this.gen || 0, keep = !!o.keep, grey = this.dead;
    const g = f.tele.add({ ...sh, kind: grey ? 'grey' : o.kind || 'white', color: grey ? GREY : undefined, start: o.start ?? f.t, end: o.end, linger: o.linger, follow: o.follow ? () => { const p = o.follow(); if (p) { sh.x = p.x; sh.z = p.z; if (p.angle !== undefined) sh.angle = p.angle; } return p; } : null });
    if (g && keep) g.keep = true;
    if (!o.silent && !f.suppress && !grey) f.cue(o.kind || 'white', sh);
    f.after(Math.max(0, o.end - f.t), () => {
      if (!keep && ((this.gen || 0) !== gen || this.dead)) { o.onFizzle && o.onFizzle(sh); return; }
      const unseen = !g || g.dead;
      if (unseen && !keep) { o.onFizzle && o.onFizzle(sh); return; }
      const harmless = unseen || this.dead;
      const hit = harmless ? 'miss' : f.resolveArea(sh, o);
      o.onImpact && o.onImpact(hit, sh);
      if (o.sound !== false && !harmless) f.sfx.impactArea && f.sfx.impactArea(o.kind, f.pan(sh.x), hit);
    });
    return sh;
  }
  // a cone of hers toward YOU (tracking while it fills unless locked), then a fan from her at t1
  cone(t0, t1, o) {
    const f = this.f, b = this.boss;
    const src = () => ({ x: b.x, z: b.z });
    let ang = toward(b, f.player);
    const tg = this.tele({ shape: 'cone', x: b.x, z: b.z, angle: ang, w: o.r ?? 6, param: o.half ?? 0.4, kind: o.kind || 'pink', start: t0, end: t1, follow: () => { if (!o.lock) ang = toward(b, f.player); return { x: b.x, z: b.z, angle: ang }; } });
    if (!this.dead && f.t <= t0 + 0.05) f.cue(o.kind || 'pink', src());
    const gen = this.gen || 0;
    f.at(t1, () => {
      const unseen = tg.dead;          // wiped by your spotlight, or never drawn: no fan out of nowhere
      tg.dead = true;
      if (f.suppress || (this.gen || 0) !== gen) return;
      if (this.dead) { this._crumble(o.n ?? 3, o.shape); return; }
      if (unseen) return;
      this.fan({ ...o, angle: o.lock ? ang : undefined });
      o.onFire && o.onFire();
    });
    return tg;
  }
  // a fan from her right now: { n, arc (deg), speed, kind, shape, size, wave, split, pinkMiddle, angle, offset }
  fan(o) {
    const f = this.f, b = this.boss;
    const base = (o.angle ?? toward(b, f.player)) + (o.skew || 0);
    const n = o.n ?? 3, arc = (o.arc ?? 30) * Math.PI / 180;
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc);
      const kind = o.pinkMiddle ? (i === (n - 1) / 2 ? 'pink' : 'white') : (o.kind || 'pink');
      const p = f.proj.spawn({ x: b.x + Math.sin(a) * 0.9, z: b.z + Math.cos(a) * 0.9, y: 1.3, angle: a, speed: o.speed ?? 7, kind, shape: kind === 'white' && o.whiteShape ? o.whiteShape : (o.shape || 'orb'), size: o.size, radius: o.radius, wave: o.wave, spin: o.spin ?? 3, life: o.life ?? 5, damage: o.damage });
      if (p) { p.tag = o.tag || ''; if (o.split) p.splitAt = f.t + o.split; if (o.dmgBack) p.dmgBack = o.dmgBack; list.push(p); }
    }
    f.sfx.fire && f.sfx.fire(o.shape || 'orb', f.pan(b.x), o.kind);
    return list;
  }
  // her projectiles crumble to dust a metre from her hand (the empty bar)
  _crumble(n, shape) { const b = this.boss; this.f.fx.dust(b.x, b.z, 6); this.snd && this.snd.play('pop', { x: b.x, gain: 0.3, rate: 0.6 }); }
  // a lane (rect) from a point, aimed (or given an angle), landing at t1
  lane(t0, t1, o) {
    const f = this.f;
    const from = o.from || { x: this.boss.x, z: this.boss.z };
    const angle = o.angle ?? toward(from, o.at || f.player);
    return this.area({ shape: 'rect', x: from.x, z: from.z, angle, w: o.w ?? 0.4, h: o.h ?? 16, kind: o.kind || 'white', start: t0, end: t1, damage: o.damage, melee: o.melee, follow: o.follow, onImpact: o.onImpact });
  }
  circle(t0, t1, o) {
    const f = this.f; const at = o.at || { x: f.player.x, z: f.player.z };
    return this.area({ shape: 'circle', x: at.x, z: at.z, w: o.r ?? 1.5, kind: o.kind || 'white', start: t0, end: t1, damage: o.damage, follow: o.follow, onImpact: o.onImpact, melee: o.melee });
  }
  ring(t0, t1, o) {
    const at = o.at || { x: this.boss.x, z: this.boss.z };
    return this.area({ shape: 'ring', x: at.x, z: at.z, w: o.r, param: o.th ?? 1.2, kind: o.kind || 'white', start: t0, end: t1, damage: o.damage, onImpact: o.onImpact });
  }
  // a pink melee (the slap, the whisper, "rough"): a cone locked on YOU, her clip fitted so the contact lands on t1.
  // Parried: she reels (open) for 2 beats; o.onParry for the extras.
  melee(t0, t1, o = {}) {
    const f = this.f, b = this.boss;
    if (this.dead) return;
    const d = Math.hypot(f.player.x - b.x, f.player.z - b.z);
    // too far: she glides in first (Sword_Dash), arriving a little before the contact
    if (d > (o.reach ?? 4)) { const a = toward(b, f.player); const nx = f.player.x - Math.sin(a) * 1.6, nz = f.player.z - Math.cos(a) * 1.6; const r = f.arena.resolve(nx, nz, 0.5); b.moveTo(r.x, r.z, Math.max(0.15, (t1 - t0) * 0.55), { easing: 'out' }); b.setMark(r.x, r.z); this.act('Sword_Dash', Math.max(0.15, (t1 - t0) * 0.55), { from: 0.1, to: 0.5 }); }
    const ang = toward(b, f.player);
    b.faceNow(f.player.x, f.player.z);
    this.snd && this.snd.play('cloth', { x: b.x, gain: 0.8 });
    const lead = Math.max(0.12, t1 - f.t);
    f.after(Math.max(0, lead - 0.3), () => this.act(o.clip || 'Melee_Hook', 0.42, { from: 0.15, to: 0.75 }));
    let parried = false;
    const sh = this.area({ shape: 'cone', x: b.x, z: b.z, angle: ang, w: o.r ?? 2.6, param: o.half ?? 0.9, kind: 'pink', start: t0, end: t1, melee: true, damage: o.damage,
      follow: () => ({ x: b.x, z: b.z, angle: ang }),
      onImpact: (hit) => {
        if (hit === 'parried') { parried = true; this.snd && this.snd.play('ding', { x: b.x, gain: 0.8, rate: 1.2 }); this.face('fury'); this.act('Idle_Shield_Break', 2 * f.beat, { from: 0.0, to: 0.6 }); b.open(2 * f.beat); o.onParry && o.onParry(); }
        else if (hit === 'hit') this.snd && this.snd.play('slap', { x: f.player.x });
        o.onImpact && o.onImpact(hit);
      } });
    return sh;
  }
  // a lob to a pink circle (the bouquet): pat.lob with her clip
  lob(t0, t1, o) {
    const f = this.f;
    if (this.dead) { this.tele({ shape: 'circle', x: f.player.x, z: f.player.z, w: o.r ?? 1.3, start: t0, end: t1 }); return; }
    this.act('OverhandThrow', 0.4, { from: 0.15, to: 0.7 });
    return f.pat.lob(f, { ...o, end: t1, at: o.at });
  }

  // ---------------------------------------------------------------- porcelain hands from the soil
  _handMesh() {
    let h = this.hands.find((x) => !x.live);
    if (!h) { const m = new THREE.Mesh(handGeometry(), mats().porcelain); m.castShadow = true; m.receiveShadow = true; m.visible = false; this.f.scene.add(m); h = { m, live: false }; this.hands.push(h); }
    return h;
  }
  // a hand bursts at (x, z) at t1, telegraphed from t1 - 2 beats, stays up 2 beats (an obstacle)
  hand(x, z, t1, { r = 0.9 } = {}) {
    const f = this.f, beat = f.beat;
    if (this.tr.onRoad && this.tr.onRoad(x, z)) return;       // never in the road
    this.area({ shape: 'circle', x, z, w: r, kind: 'white', start: t1 - 2 * beat, end: t1, onImpact: () => {
      const h = this._handMesh(); h.live = true; h.t0 = f.t; h.x = x; h.z = z; h.until = f.t + 2 * beat; h.rot = Math.random() * TAU;
      f.fx.dust(x, z, 10, new THREE.Color(0.35, 0.25, 0.2)); f.fx.chips(x, 0.3, z, new THREE.Color(0.4, 0.28, 0.2), 8);
      this.snd && (this.snd.play('soil', { x, gain: 0.9 }), this.snd.play('plate', { x, rate: 0.7, gain: 0.6, delay: 0.02 }));
    } });
  }
  handsLive() { return this.hands.filter((h) => h.live); }
  _hands(dt) {
    const f = this.f;
    for (const h of this.hands) {
      if (!h.live) { h.m.visible = false; continue; }
      const age = f.t - h.t0, left = h.until - f.t;
      if (left < -0.25 || age < -0.05) { h.live = false; h.m.visible = false; continue; }
      const up = Math.min(1, age / 0.08), down = left < 0 ? 1 + left / 0.25 : 1;
      h.m.visible = true;
      h.m.position.set(h.x, -0.75 + 0.75 * up * down, h.z);
      h.m.rotation.set(Math.sin(age * 9) * 0.05, h.rot, 0);
      h.m.scale.setScalar(1.25);
    }
  }
  clearHands() { for (const h of this.hands) { h.live = false; h.m.visible = false; } }

  // ---------------------------------------------------------------- standing in her face
  // within 2.2 m outside an opening for more than 2 beats: she slaps (pink, parryable); at most once per 2 bars
  _antiSpam(dt) {
    const f = this.f, b = this.boss, pl = f.player;
    // (never from where you can't see her: shut in the casket at 3 a.m., or behind the doors before they blow open)
    const unseen = !this.fig || !this.fig.root.visible || (this.tr.chapel && this.tr.chapel.inside) || b.intangible;
    if (this.dead || unseen || b.state !== 'perform' || b.posing || this.tr.shots.active || this.tr.busy(f.t) || this.airborne || f.suppress) { this.faceT = 0; return; }
    const d = Math.hypot(pl.x - b.x, pl.z - b.z);
    if (d < 2.2) this.faceT += dt; else this.faceT = Math.max(0, this.faceT - dt * 2);
    if (this.faceT > 2 * f.beat && f.t - this.lastSlap > 8 * f.beat) {
      this.faceT = 0; this.lastSlap = f.t;
      const nb = f.bm.nearest(f.t + 2 * f.beat, 1);
      this.melee(f.t, nb.time, { r: 2.6, half: 0.9 });
    }
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const f = this.f, b = this.boss, fig = this.fig;
    if (!fig) return;
    // the sceptre where her mood holds it; the phone's LED wakes with a shot's fill and blooms on its flash
    aimSceptre(fig, b.facing, this.scMode, dt);
    // (her phone only: the director's torch at 3 a.m. is his light, not her picture)
    const sh = this.tr.shots, s = sh.active && !sh.active.noBoss ? sh.active : null;
    const fill = s && f.t >= s.t0 ? Math.min(1, (f.t - s.t0) / Math.max(0.01, s.t1 - s.t0)) : 0;
    const led = Math.max(fill * fill * 0.6, sh.ledK * 3);
    fig.props.ledMat.color.setRGB(1.2 + led * 6, 1.15 + led * 6, 1.1 + led * 5.6);
    // (the flash is local: at its peak a bloom about her height across, never a white ball over the whole figure;
    // in a dark, high-exposure room it comes down with the game's other glows, FXK)
    if (this.bloom) { fig.props.led.getWorldPosition(this.bloom.position); this.bloom.material.opacity = Math.min(0.9, led * 0.5) * Math.min(1, FXK.value); this.bloom.scale.setScalar(0.3 + led * 0.45); this.bloom.visible = led > 0.02 && fig.root.visible; }
    // the admiring hold: her head dips to the screen; procedural, on top of the frozen frame
    const bones = b.rig && b.rig.bones;
    if (bones && this.admire) { bones.Head && (bones.Head.rotation.x += 0.26); bones.lowerarm_l && (bones.lowerarm_l.rotation.z += 0.25); }
    // the strut: hips sway, heels click on the beat
    const sp = b._speed || 0;
    if (bones && bones.pelvis && sp > 0.4 && !b.busy) { const ph = f.bm.beatAt(f.t) * Math.PI; bones.pelvis.rotation.z += Math.sin(ph) * 0.13 * Math.min(1, sp / 1.5); }
    // (a heel on every other beat: the song's felt pulse; one on every beat was a constant tick under the fight)
    if (sp > 0.5 && !this.airborne) { const bi = Math.floor(f.bm.beatAt(f.t)); if (bi !== this._lastStep) { this._lastStep = bi; if (bi % 2 === 0) this.snd && this.snd.heel(b.x, this.tr.turf); } }
    // her head nods one beat behind the music (the Xanax lag), until she's sober
    if (bones && bones.Head && !b.sober && !b.posing) { const ph = f.bm.beatAt(f.t - f.beat); bones.Head.rotation.x += 0.07 * Math.exp(-((ph - Math.floor(ph)) * 5)); }
    // the hair flip out of a pose
    if (this.flip > 0 && bones && bones.Head) { this.flip -= dt; bones.Head.rotation.y += Math.sin((0.3 - this.flip) / 0.3 * Math.PI) * 0.5; }
    this._hands(dt);
    this._antiSpam(dt);
  }
  makeBloom() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,245,235,0.6)'); r.addColorStop(1, 'rgba(255,230,220,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: new THREE.Color(3, 2.9, 2.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.visible = false; m.renderOrder = 6; this.f.scene.add(m); this.bloom = m;
  }
  dispose() { for (const h of this.hands) this.f.scene.remove(h.m); if (this.bloom) this.f.scene.remove(this.bloom); }
}

// ------------------------------------------------------------------------------------------------ YOU, in the casket
// Second 0: YOU lies in the open casket, hands folded over the rings. Any move: she sits up and vaults out toward it.
// Space: an instant dash out. Nothing: she sits bolt upright when the doors blow open and waits.
export class Entrance {
  constructor(f, tr) { this.f = f; this.tr = tr; this.state = 'off'; }
  begin() {
    const f = this.f, pl = f.player, C = { x: 0, z: -5.0, y: 1.08 };
    this.C = C; this.state = 'lying'; this.t = 0;
    pl.place(C.x, C.z, Math.PI / 2);
    pl.locked = true;
    this.tr.set.ghost = true;              // no casket collider while she's in it
    pl.h.model.position.y = C.y;
    pl.rig.play('LayToIdle', { speed: 0, offset: 0.02, fade: 0, force: true });
  }
  end() {
    const pl = this.f.player;
    this.state = 'off'; pl.locked = false; pl.h.model.position.y = 0; this.tr.set.ghost = false;
  }
  update(dt) {
    if (this.state === 'off') return;
    const f = this.f, pl = f.player, inp = f.input, C = this.C;
    this.t += dt;
    const mv = inp.move ? inp.move() : { x: 0, y: 0 };
    const moving = Math.hypot(mv.x, mv.y) > 0.2;
    const now = performance.now();
    if (this.state === 'lying' || this.state === 'sitting') {
      if (this.state === 'lying' && f.t >= 2.118) { this.state = 'sitting'; pl.rig.play('LayToIdle', { speed: 0, offset: 0.4, fade: 0.08, force: true }); }
      const dash = inp.peek && inp.peek('dash', now, 200);
      const strike = inp.peek && inp.peek('strike', now, 200);
      if (dash || moving || strike) {
        // out toward the input (or the aim), over the casket's nearer long side
        let ax = mv.x, az = mv.y;
        if (!moving) { const a = f._aim || { x: 0, z: 0 }; ax = a.x - C.x; az = a.z - C.z; }
        const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
        const side = Math.abs(az) > 0.25 ? Math.sign(az) : (ax >= 0 ? 1 : 1);
        this.to = { x: C.x + ax * 1.2, z: C.z + side * 1.2 + az * 0.2 };
        if (dash) { pl.h.model.position.y = 0; pl.place(C.x, C.z + side * 0.9, Math.atan2(ax, az)); this.end(); this.burst(); return; }
        this.state = 'vault'; this.vt = 0; this.from = { x: pl.x, z: pl.z };
        pl.rig.once('LayToIdle', { duration: 0.3, from: 0.28, to: 0.62, fade: 0.04, then: 'Sprint_Loop' });
        this.tr.sounds && this.tr.sounds.play('cloth', { x: C.x });
      }
    } else if (this.state === 'vault') {
      this.vt += dt;
      const k = Math.min(1, this.vt / 0.55), e = k * k * (3 - 2 * k);
      // steer the landing with the input during the vault
      if (moving) { this.to.x += mv.x * dt * 2; this.to.z += mv.y * dt * 2; }
      const x = this.from.x + (this.to.x - this.from.x) * e, z = this.from.z + (this.to.z - this.from.z) * e;
      pl.x = x; pl.z = z; pl.facing = Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z);
      pl.h.model.position.y = C.y * (1 - e) + Math.sin(k * Math.PI) * 0.25;
      pl._sync();
      if (k >= 1) { this.end(); pl.vx = (this.to.x - this.from.x) * 2.5; pl.vz = (this.to.z - this.from.z) * 2.5; this.tr.sounds && this.tr.sounds.play('woodLight', { x: pl.x, gain: 0.6 }); }
    }
  }
  burst() { const f = this.f, C = this.C; f.fx.glitter(C.x, 1.2, C.z, new THREE.Color(3, 2.8, 2.8), 30, 1.0); f.fx.chips(C.x, 1.2, C.z, new THREE.Color(2.4, 2.3, 2.2), 14); this.tr.sounds && this.tr.sounds.play('cloth', { x: C.x }); }
}
export { inShape };
