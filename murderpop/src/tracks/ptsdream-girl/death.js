// PTSDREAM GIRL's end: COUNT TO FOUR.
// The song goes out on the line it came in on ("baby, I'm your favorite emergency"). At the top the next words were
// "pull the pin, breathe me in ... count to four then crave the sting"; at the end nobody sings them, so the two of
// you play them. On the last word she holds the bottle from her heart out to YOU, and YOU's ring takes the pin. She
// breathes it in. Then it's her own count, one to a bar (the kick on each bar's 1), and this time it's on her: she
// throws it (caught, and back in her arms), runs (YOU is over her head and in her way), runs the other way (YOU is
// through her and there too: everywhere, the way she was), throws it point blank on four (caught on four, the fight's
// own rule), gets it pressed back into her hands, and is holding it on the last hit when YOU's ring goes up through it.
// (src/game/execution.js runs it. Each step's `lead` starts as its ring begins to close; `stage(k)` puts the two of
// them, the bottle and the pin where the song has them by then, so it plays from any step if her bar empties late.)
import * as THREE from 'three';
import { grenadeModel } from './her.js';
import { pinModel } from './props.js';

const GOLD = new THREE.Color(3.2, 2.0, 0.55), PINK = new THREE.Color(3.6, 0.5, 1.5);
const UNLIT = [0.25, 0.05, 0.08], LIT = [4, 0.7, 1.8], LITG = [3.0, 1.9, 0.5];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const Z = -4.0;                             // the line it plays along: across the front of her riser
const HER = -1.15, YOU = 1.35;              // their first marks (she's on the left: the hand the bottle is in faces the house)
const R = Math.PI / 2, L = -Math.PI / 2;    // facing stage right (+x) / stage left (-x)
const H = 0.42;                             // the bottle, in the hand
// where each stands as step k begins: [her x, her facing, YOU x, YOU facing]
const MARKS = [null, [HER, R, YOU, L], [HER, R, YOU, L], [-1.65, R, YOU, L], [-3.7, L, -5.4, R], [-0.75, R, 0.7, L], [-0.75, R, 2.3, L], [-0.75, R, 0.5, L]];

// ------------------------------------------------------------------------------------------------ the scene's things
export class Kill {
  constructor(f, tr) {
    this.f = f; this.tr = tr; this.on = false; this.X = null; this.step = 0;
    const m = grenadeModel(H);
    this.b = { m, state: 'off', how: 'hand', lit: 0, gold: false, rock: 0, live: false, mist: 0, pos: new THREE.Vector3(), p0: new THREE.Vector3(), to: null, t0: 0, t1: 1, arc: 0, next: 'her', nextHow: 'chest' };
    this.ring = m.body.children.find((c) => c.geometry && c.geometry.type === 'TorusGeometry') || null;
    this.pin = { g: pinModel(), state: 'on', p0: new THREE.Vector3(), to: null, t0: 0, dur: 1, arc: 0, next: 'you', then: null };
    this.pin.g.scale.setScalar(1.7);
    this.group = new THREE.Group(); this.group.name = 'ptsd-kill'; this.group.add(m.root, this.pin.g);
    m.root.visible = false; this.pin.g.visible = false;
    this._v = new THREE.Vector3(); this._f = new THREE.Vector3(); this._look = new THREE.Vector3();
  }
  // her scene begins: whatever she was doing ends, and the room's ornaments standing on its line go
  begin(X) {
    const f = this.f; this.X = X; this.on = true; this.step = 0;
    if (!this.group.parent) f.scene.add(this.group);
    this.tr.her.standDown();
    const sp = f.setPieces;
    if (sp && sp.on) for (const p of sp.list) if (p.state === 'rest' && Math.abs(p.z - Z) < 1.3 && p.x > -7 && p.x < 4) sp.slam(p.x, p.z, 0.1);
  }
  // a rewind, a new fight: nothing of it left
  reset() {
    const b = this.b;
    this.on = false; this.X = null; this.step = 0;
    b.state = 'off'; b.lit = 0; b.gold = false; b.live = false; b.m.root.visible = false; this.light();
    this.pin.state = 'on'; this.pin.g.visible = false; this.pin.then = null;
    if (this.ring) this.ring.visible = true;
    this.pendant(true);
    if (this.group.parent) this.group.parent.remove(this.group);
  }
  // the bottle on its chain at her heart (hidden once it's in her hand)
  pendant(on) {
    const fig = this.f.boss && this.f.boss.fig, a = fig && fig.acc && fig.acc.find((q) => q.type === 'ptsdPendant');
    if (!a || a.broken) return;
    for (const o of a.objects) o.traverse((c) => { c.visible = on; });
  }
  // (both return the same vector: copy it at once)
  hand(who) {
    const o = who === 'her' ? this.f.boss : this.f.player, bone = who === 'her' ? (o.fig && o.fig.bones && o.fig.bones.hand_r) : o.rig.bones.hand_r;
    if (bone) bone.getWorldPosition(this._v); else this._v.set(o.x, 1.4, o.z);
    return this._v;
  }
  chest(who) {
    const o = who === 'her' ? this.f.boss : this.f.player, bone = who === 'her' ? (o.fig && o.fig.bones && o.fig.bones.spine_03) : o.rig.bones.spine_03;
    if (bone) bone.getWorldPosition(this._v); else this._v.set(o.x, 1.4, o.z);
    this._v.x += Math.sin(o.facing) * 0.34; this._v.z += Math.cos(o.facing) * 0.34;
    return this._v;
  }

  // ---- the bottle
  hold(who, how = 'hand') { const b = this.b; b.state = who; b.how = how; b.m.root.visible = true; b.m.body.rotation.set(0, 0, 0); }
  throwTo(to, t1, arc, next, nextHow = 'chest') { const b = this.b; b.p0.copy(b.pos); b.to = to; b.t0 = this.X.t; b.t1 = Math.max(this.X.t + 0.05, t1); b.arc = arc; b.next = next; b.nextHow = nextHow; b.state = 'fly'; b.m.root.visible = true; }
  light() {
    const b = this.b, Ls = b.m.lights;
    for (let i = 0; i < 4; i++) { const c = i < b.lit ? (b.gold ? LITG : LIT) : UNLIT; Ls[i].material.color.setRGB(c[0], c[1], c[2]); }
    b.m.glow.material.color.setRGB(1, b.gold ? 0.75 : 0.3, b.gold ? 0.3 : 0.5);
  }
  // off its chain and held out to YOU
  present() {
    const X = this.X, f = this.f, b = this.b;
    this.pendant(false); this.hold('her', 'hand'); b.live = false; b.lit = 0; b.gold = false; this.light();
    if (this.ring) this.ring.visible = true;
    X.clip('her', 'Spell_Simple_Enter', { dur: 0.4 });
    X.after(0.4, () => { if (this.step <= 1) X.clip('her', 'Spell_Simple_Idle_Loop', { loop: true, fade: 0.1 }); });
    f.fx.glitter(f.boss.x + 0.3, 1.7, f.boss.z, PINK, 8, 0.3); this.tr.snd.play('clink', { x: f.boss.x });
  }
  // the pin's out: it's live
  pulled() { if (this.ring) this.ring.visible = false; this.b.live = true; }
  // YOU's ring takes the pin (missed: it drops out anyway, and lies at YOU's feet)
  pull(ok) {
    const f = this.f, X = this.X, b = this.b, her = f.boss, pl = f.player, p = b.pos, pn = this.pin;
    this.pulled();
    f.fx.sparks(p.x, p.y + H, p.z, GOLD, ok ? 16 : 7, pl.facing); this.tr.snd.play('pin', { x: p.x });
    her.rig && her.rig.hitStop(0.07); pl.rig.hitStop(0.06); f.cam.shake(0.35, 0.12);
    pn.g.visible = true; pn.g.position.set(p.x, p.y + H, p.z);
    if (ok) {
      f.fx.glitter(p.x, p.y + H, p.z, GOLD, 10, 0.3);
      this.pinTo(() => this.hand('you'), 0.42, 0.8, 'you', () => { const h = this.hand('you'); f.fx.glitter(h.x, h.y, h.z, GOLD, 14, 0.3); X.expr('A_Amused'); f._glimmer && f._glimmer(2, true); });
      X.herFace('shock');
    } else {
      this.pinTo(() => this._f.set(pl.x - 0.25, 0.12, Z + 0.6), 0.6, 0.5, 'floor');
      X.herFace('delight'); X.after(0.6, () => X.herFace('shock'));
    }
    // BREATHE ME IN: the bar between the pin and the count
    const K = (beat) => f.bm.timeOfBar(151, beat);
    X.at(K(1) - 0.3, () => { if (this.step === 1) X.clip('her', 'Consume', { dur: 0.75, from: 0.12, to: 0.55 }); });
    X.at(K(1), () => { if (this.step === 1) { this.puff(); X.herFace('delight'); } });
    X.at(K(2.5), () => { if (this.step === 1) { this.puff(); b.rock = 1; X.herFace('shock'); } });
  }
  puff() { const f = this.f, p = this.b.pos; f.fx.glitter(p.x, p.y + H, p.z, PINK, 16, 0.4); this.tr.snd.play('puff', { x: p.x }); }
  // one of her count: a light on the bottle, the deep tick, the ring on the floor
  tick(i) {
    const f = this.f, b = this.b;
    b.lit = Math.max(b.lit, i + 1); b.rock = 1; this.light();
    this.tr.snd.play('deeptick', { x: b.pos.x, rate: 1 - i * 0.08 }); if (i === 3) this.tr.snd.play('whine', { x: b.pos.x });
    this.tr.set.lastTick(this.X.t, i);
    f.cam.kick(0.7); f.fx.sparks(b.pos.x, b.pos.y + H * 0.6, b.pos.z, PINK, 6);
  }
  // YOU has it out of the air (gold, as every bottle YOU caught was)
  caught() {
    const f = this.f, X = this.X, pl = f.player;
    this.hold('you'); this.b.gold = true; this.light();
    X.clip('you', 'Sword_Block', { dur: 0.12, from: 0.08, to: 0.3 });
    const c = this.chest('you'); f.fx.caught(c.x, c.y, c.z, true); f.sfx.catch && f.sfx.catch('perfect', f.pan(pl.x));
    pl.rig.hitStop(0.08); f.cam.shake(0.35, 0.1); f._glimmer && f._glimmer(2, true);
  }
  // missed: it bounces off YOU
  bonk() {
    const f = this.f, X = this.X, pl = f.player;
    X.clip('you', 'Hit_Head', { dur: 0.35 }); f.fx.sparks(pl.x, 1.6 + pl.y, pl.z, PINK, 8); this.tr.snd.play('clonk', { x: pl.x }); pl.rig.hitStop(0.05);
    X.after(0.36, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }));
  }
  // it's back in her arms: she takes it in the chest (dx: how far it knocks her)
  thump(power, gold, dx = 0) {
    const f = this.f, X = this.X, her = f.boss;
    this.hold('her', 'chest'); this.b.gold = false; this.light();
    const c = this.chest('her'); X.hit({ power, gold, at: { x: c.x, y: c.y, z: c.z } });
    X.clip('her', 'Hit_Chest', { dur: 0.4 }); X.herFace('shock'); this.tr.snd.play('clonk', { x: her.x });
    if (dx) X.go('her', her.x + dx, Z, 0.2, { ease: 'out' });
  }
  // YOU comes down in her way; she pulls up short
  cutOff(ok) {
    const f = this.f, X = this.X, pl = f.player, her = f.boss;
    X.body('you', { pitch: 0 }, 0.01); pl.facing = R; X.lift('you', 0, 0.02);
    if (ok) { X.clip('you', 'NinjaJump_Land', { dur: 0.25, from: 0.1, to: 0.4 }); X.after(0.26, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 })); }
    else X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 });
    f.fx.dust(pl.x, pl.z, ok ? 12 : 6); X.shake(ok ? 0.6 : 0.3, 0.16); f.sfx.land && f.sfx.land(pl, true);
    X.clip('her', 'Idle_Shield_Break', { dur: 0.42 }); X.go('her', her.x + 0.3, Z, 0.25, { ease: 'out' }); this.hold('her', 'chest');
  }
  // her legs go: down at YOU's feet
  down() {
    const f = this.f, X = this.X, her = f.boss;
    her.facing = R; X.clip('her', 'Crouch_Idle_Loop', { loop: true, fade: 0.12 }); this.hold('her', 'chest'); X.herFace('hurt');
    f.fx.dust(her.x, her.z, 10); X.shake(0.4, 0.12); f.sfx.breakProp && f.sfx.breakProp(f.pan(her.x));
  }
  // pressed back into her hands
  give() {
    const f = this.f, X = this.X, her = f.boss;
    this.throwTo(() => this.chest('her'), X.t + 0.07, 0.04, 'her', 'chest');
    X.after(0.07, () => { this.hold('her', 'chest'); this.b.gold = false; this.light(); X.clip('her', 'Hit_Chest', { dur: 0.3 }); X.herFace('shock'); this.tr.snd.play('clack', { x: her.x }); her.rig && her.rig.hitStop(0.05); const c = this.chest('her'); f.fx.sparks(c.x, c.y, c.z, PINK, 8); });
  }
  // the sting: it goes off in her hands
  sting() {
    const f = this.f, b = this.b, p = b.pos;
    b.state = 'off'; b.live = false; b.m.root.visible = false;
    this.tr.snd.play('boom', { x: p.x }); this.tr.snd.play('sting', { x: p.x }); this.tr.snd.play('glassburst', { x: p.x, gain: 0.7 });
    this.tr.her.cloud(p.x, p.z, 3.4, new THREE.Color(1.0, 0.4, 0.55), 1.8);
    f.fx.glitter(p.x, p.y, p.z, PINK, 70, 2.4); f.fx.glitter(p.x, p.y, p.z, GOLD, 50, 2.0); f.fx.sparks(p.x, p.y, p.z, new THREE.Color(3.5, 1.2, 1.6), 30);
    f.fx.ring && f.fx.ring(p.x, p.z, PINK, 4.2); f.fx.flash(new THREE.Color(0.5, 0.2, 0.3), 1); f.cam.shake(1.4, 0.4); f.cam.kick(3);
  }

  // ---- the pin
  pinTo(to, dur, arc, next, then = null) { const pn = this.pin; pn.g.visible = true; pn.p0.copy(pn.g.position); pn.to = to; pn.t0 = this.X.t; pn.dur = dur; pn.arc = arc; pn.next = next; pn.then = then; pn.state = 'move'; }
  // the last of it: up off her finger and caught (dropped earlier: up off the floor into her hand)
  flip() {
    const pn = this.pin, f = this.f;
    if (pn.state !== 'you' && pn.state !== 'floor') return;
    this.pinTo(() => this.hand('you'), pn.state === 'floor' ? 0.4 : 0.8, pn.state === 'floor' ? 0.5 : 1.0, 'you', () => { const h = this.hand('you'); f.fx.glitter(h.x, h.y, h.z, GOLD, 16, 0.3); f._glimmer && f._glimmer(3, true); });
  }

  // ---- step k begins: the two of them on their marks, the bottle and the pin as the song has them by then
  mark(who, x, facing) {
    const X = this.X, o = X.who(who), d = Math.hypot(o.x - x, o.z - Z);
    X.body(who, { pitch: 0, spin: 0, roll: 0 }, 0.01);
    if (d > 1.2) {
      if (who === 'her') { this.tr.her.tear(o.x, o.z); this.tr.her.tear(x, Z, 0.12); this.tr.snd.play('vhs', { x }); }
      else { X.fx.dashStart && X.fx.dashStart(o); X.after(0.15, () => X.fx.dashEnd && X.fx.dashEnd(o)); }
      X.place(who, x, Z, facing);
    } else { X.go(who, x, Z, 0.1); o.facing = facing; }
    if (who === 'you') X.lift('you', 0, 0.05);
  }
  stage(k) {
    const X = this.X, b = this.b, soft = this.step === k - 1 && this.step > 0;
    this.step = k;
    if (soft) return;
    const M = MARKS[k];
    this.mark('her', M[0], M[1]); this.mark('you', M[2], M[3]);
    this.pendant(false); b.lit = [0, 0, 0, 1, 2, 3, 4, 4][k]; b.gold = k === 6; this.light();
    if (k >= 2) { this.pulled(); if (this.pin.state === 'on') { this.pin.g.visible = true; this.pin.g.position.set(M[2] - 0.25, 0.12, Z + 0.6); this.pin.g.rotation.set(0, 1, 0); this.pin.state = 'floor'; } }
    else if (this.ring) this.ring.visible = true;
    this.hold(k === 6 ? 'you' : 'her', k >= 3 ? 'chest' : 'hand');
    X.clip('her', k <= 2 ? 'Spell_Simple_Idle_Loop' : k === 5 ? 'Crouch_Idle_Loop' : k >= 6 ? 'Idle_No_Loop' : 'Idle_Talking_Loop', { loop: true, fade: 0.1 });
    X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 });
  }

  update(dt) {
    if (!this.on || !this.X) return;
    const f = this.f, T = this.X.t, b = this.b, pl = f.player, her = f.boss, body = b.m.body;
    // the bottle: in a hand, against a chest, in the air
    // (hers is always at her heart, where it hung: her left forearm is gone by now, and no clip keeps the right hand still)
    if (b.state === 'her') { b.pos.copy(this.chest('her')); b.pos.y -= H * 0.42; }
    else if (b.state === 'you') { b.pos.copy(this.chest('you')); b.pos.y -= H * 0.3; }
    else if (b.state === 'fly') {
      const k = clamp((T - b.t0) / Math.max(1e-3, b.t1 - b.t0), 0, 1), p1 = b.to();
      b.pos.lerpVectors(b.p0, p1, k); b.pos.y += b.arc * 4 * k * (1 - k); body.rotation.z += dt * 13;
      if (k >= 1) { if (b.next === 'floor') { b.state = 'floor'; body.rotation.set(0, 0, 0); } else this.hold(b.next, b.nextHow); }
    }
    b.m.root.position.copy(b.pos);
    b.rock *= Math.exp(-dt * 6);
    if (b.state !== 'fly') body.rotation.set(Math.sin(T * 22) * 0.2 * b.rock, body.rotation.y + dt * 0.8, Math.cos(T * 19) * 0.16 * b.rock);
    b.m.glow.material.opacity = b.live ? clamp(0.4 + 0.15 * b.lit + (b.lit >= 4 ? 0.3 * Math.sin(T * 40) : 0.12 * Math.sin(T * (8 + 6 * b.lit))), 0, 1) : 0.3;
    if (b.live && b.state !== 'off' && (b.mist += dt) > 0.07) { b.mist = 0; f.fx.glitter(b.pos.x, b.pos.y + H * 0.9, b.pos.z, b.gold ? GOLD : PINK, 2, 0.22); }
    // the pin: in the air, on YOU's finger, on the floor
    const pn = this.pin;
    if (pn.state === 'move') {
      const k = clamp((T - pn.t0) / pn.dur, 0, 1), p1 = pn.to();
      pn.g.position.lerpVectors(pn.p0, p1, k); pn.g.position.y += pn.arc * 4 * k * (1 - k); pn.g.rotation.x += dt * 14; pn.g.rotation.y += dt * 9;
      if (k >= 1) { pn.state = pn.next; if (pn.next === 'floor') pn.g.rotation.set(0, 1, 0); const fn = pn.then; pn.then = null; fn && fn(); }
    } else if (pn.state === 'you') { pn.g.position.copy(this.hand('you')); pn.g.position.y += 0.06; pn.g.rotation.set(Math.PI / 2, T * 2.5, 0); }
    // her eyes: on the bottle when it isn't hers, on YOU when it is
    if (her.rig && her.state !== 'finished') her.rig.lookTarget = (b.state === 'her' || b.state === 'off') ? this._look.set(pl.x, 1.5 + pl.y, pl.z) : this._look.copy(b.pos);
  }
}

// ------------------------------------------------------------------------------------------------ the scene
export const death = {
  beats: 28,                    // from 149:1: the last line is still being sung
  hold: 2.2,
  enter(X, ex) {
    const S = X.f.track.kill; S.begin(X);
    X.herFace('smug'); X.follow('two', { dist: 5.7, h: 1.4 });
    S.mark('her', HER, R); S.mark('you', YOU, L);
    X.clip('her', 'Idle_Talking_Loop', { loop: true, fade: 0.12 }); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 });
    // on time: "...I'm your favorite emergency", and the bottle comes off its chain
    const s0 = ex && ex.steps[ex.i];
    if (s0 && ex.i === 0 && X.t < s0.lead0 - 0.5) X.at(Math.max(X.t + 0.25, s0.lead0 - 0.85), () => { if (S.step === 0) S.present(); });
  },
  steps: (nb, f) => {
    const B = (bar, beat = 1) => f.bm.timeOfBar(bar, beat), S = () => f.track.kill;
    return [
      // PULL THE PIN: on "emer-GEN-cy" YOU's ring goes through the pull ring
      { t: B(150, 3.5), key: 'strike',
        lead(X, s) {
          S().stage(1); if (S().b.state === 'off') S().present();
          X.go('you', HER + 1.6, Z, Math.max(0.1, s.t - X.t - 0.03), { ease: 'in' }); X.strike('cut', s.t);
          X.follow('her', { dist: 3.2, h: 1.45, fov: 33 });
        },
        do(X, ok) { X.slash('cut', { gold: ok }); S().pull(ok); } },
      // ONE: she throws it; caught, and back in her arms on the next kick
      { t: B(152, 1), key: 'parry',
        lead(X, s) {
          S().stage(2);
          X.follow('two', { dist: 5.5, h: 1.4 }); X.herFace('fury');
          X.go('you', YOU, Z, 0.25, { ease: 'out' });
          const rel = Math.max(X.t + 0.12, B(151, 3.5));
          X.clip('her', 'OverhandThrow', { from: 0.08, to: 0.8, dur: Math.max(0.3, (rel - X.t) / 0.42) });
          X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 });
          X.at(rel, () => { if (S().step !== 2) return; S().throwTo(() => S().chest('you'), s.t, 0.9, 'you'); S().tr.snd.play('whoosh', { x: X.her.x }); });
        },
        do(X, ok) {
          S().tick(0);
          if (ok) {
            S().caught();
            X.after(0.15, () => { X.clip('you', 'Punch_Jab', { dur: 0.22 }); S().throwTo(() => S().chest('her'), B(152, 2.5), 0.35, 'her', 'chest'); S().tr.snd.play('whoosh', { x: X.you.x, rate: 1.3 }); });
            X.after(0.45, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }));
          } else { S().bonk(); S().throwTo(() => S().chest('her'), B(152, 2.5), 1.5, 'her', 'chest'); }
          X.at(B(152, 2.5), () => { if (S().step === 2) S().thump(ok ? 1.0 : 0.5, ok, -0.5); });
        } },
      // TWO: she runs for it; YOU is over her head and down in her way
      { t: B(153, 1), key: 'jump',
        lead(X, s) {
          S().stage(3);
          X.follow('two', { dist: 6.0, h: 1.4 });
          const go = Math.max(X.t + 0.05, B(152, 3.5));
          X.at(go, () => {
            if (S().step !== 3) return;
            X.herFace('hurt'); X.her.facing = L; S().hold('her', 'hand');
            X.clip('her', 'Sprint_Loop', { loop: true, speed: 1.1, fade: 0.08 }); X.go('her', -3.45, Z, Math.max(0.2, s.t - go), { ease: 'linear' });
            X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.2, fade: 0.08 }); X.go('you', -1.95, Z, Math.max(0.2, s.t - go - 0.02), { ease: 'inOut' });
          });
        },
        do(X, ok) {
          S().tick(1);
          X.go('her', -4.0, Z, 0.42, { ease: 'out' }); X.herFace('shock');
          const land = B(153, 2.5), air = Math.max(0.3, land - X.t);
          if (ok) {
            X.clip('you', 'NinjaJump_Start', { dur: 0.2, from: 0.12, to: 0.5 }); X.after(0.2, () => X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }));
            X.go('you', -5.4, Z, air, { arc: 2.3, ease: 'linear' }); X.body('you', { pitch: Math.PI * 2 }, air * 0.92, 'inOut');
            X.fx.dust(X.you.x, Z, 6); X.sfx.jump && X.sfx.jump(X.you); X.f.cam.kick(1);
          } else {
            // missed: round her at a scramble, not over her
            X.go('you', -3.7, Z + 1.0, air * 0.5, { ease: 'linear' }); X.after(air * 0.5, () => X.go('you', -5.4, Z, air * 0.5, { ease: 'out' }));
          }
          X.at(land, () => { if (S().step === 3) S().cutOff(ok); });
        } },
      // THREE: she runs the other way; YOU is through her and there too
      { t: B(154, 1), key: 'dash',
        lead(X, s) {
          S().stage(4);
          X.follow('two', { dist: 6.2, h: 1.4 });
          const go = Math.max(X.t + 0.05, B(153, 3.5));
          X.at(go, () => {
            if (S().step !== 4) return;
            X.her.facing = R; X.herFace('hurt'); S().hold('her', 'hand');
            X.clip('her', 'Sprint_Loop', { loop: true, speed: 1.15, fade: 0.08 }); X.go('her', -1.9, Z, Math.max(0.2, s.t - go), { ease: 'linear' });
            X.clip('you', 'Sword_Dash', { dur: Math.max(0.2, s.t - go), from: 0, to: 0.12 });
          });
        },
        do(X, ok) {
          S().tick(2);
          const stop = B(154, 2.5), left = Math.max(0.3, stop - X.t);
          if (ok) {
            X.fx.dashStart && X.fx.dashStart(X.you); X.sfx.dash && X.sfx.dash(X.you);
            X.clip('you', 'Sword_Dash', { dur: 0.24, from: 0.12, to: 0.38 }); X.go('you', 0.7, Z, 0.16, { ease: 'out' });
            X.after(0.2, () => { X.fx.dashEnd && X.fx.dashEnd(X.you); X.you.facing = L; X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.1 }); });
            X.body('her', { spin: Math.PI * 2 }, 0.4, 'out'); X.after(0.42, () => X.body('her', { spin: 0 }, 0.01));
            S().tr.her.tear(X.her.x, Z, 0.1);
          } else {
            // missed: after her on foot, and round in front
            X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.3, fade: 0.06 }); X.go('you', -1.2, Z + 1.0, left * 0.55, { ease: 'linear' });
            X.after(left * 0.55, () => X.go('you', 0.7, Z, left * 0.4, { ease: 'out' }));
            X.after(left, () => { X.you.facing = L; X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); });
          }
          X.go('her', -0.75, Z, left, { ease: 'out' });
          X.after(0.18, () => { if (S().step === 4) { X.clip('her', 'Slide_Start', { dur: Math.max(0.15, stop - X.t), fade: 0.08 }); X.herFace('shock'); } });
          X.at(stop, () => { if (S().step === 4) S().down(); });
        } },
      // FOUR: her last throw, point blank; caught on four
      { t: B(155, 1), key: 'parry',
        lead(X, s) {
          S().stage(5);
          X.follow('two', { dist: 4.7, h: 1.25 }); X.herFace('fury'); S().hold('her', 'hand');
          const rel = Math.max(X.t + 0.1, s.t - 0.14);
          X.clip('her', 'OverhandThrow', { from: 0.08, to: 0.8, dur: Math.max(0.3, (rel - X.t) / 0.42) });
          X.at(rel, () => { if (S().step !== 5) return; S().throwTo(() => S().chest('you'), s.t, 0.25, 'you'); S().tr.snd.play('whoosh', { x: X.her.x, rate: 1.2 }); });
        },
        do(X, ok) {
          S().tick(3);
          if (ok) { S().caught(); X.expr('A_Amused'); X.go('you', 2.3, Z, 0.3, { ease: 'out' }); X.fx.dust(X.you.x, Z, 6); }
          else { S().bonk(); S().throwTo(() => S()._f.set(X.you.x - 0.55, 0.11, Z + 0.35), X.t + 0.3, 0.5, 'floor'); }
          X.after(0.3, () => { if (S().step === 5) { X.clip('her', 'Idle_No_Loop', { loop: true, fade: 0.15 }); X.herFace('shock'); } });
        } },
      // RETURN TO SENDER: YOU is in on her, and it's back in her hands
      { t: B(155, 3.5), key: 'dash',
        lead(X, s) {
          S().stage(6);
          X.follow('two', { dist: 5.0, h: 1.3 });
          const b = S().b;
          if (b.state === 'floor' || (b.state === 'fly' && b.next === 'floor')) { X.clip('you', 'PickUp_Table', { dur: 0.45 }); X.after(0.3, () => { S().hold('you'); b.gold = true; S().light(); }); }
          else X.clip('you', 'Sword_Dash', { dur: Math.max(0.2, s.t - X.t), from: 0, to: 0.12 });
        },
        do(X, ok) {
          const hx = X.her.x;
          if (S().b.state !== 'you') { S().hold('you'); S().b.gold = true; S().light(); }
          if (ok) {
            X.fx.dashStart && X.fx.dashStart(X.you); X.sfx.dash && X.sfx.dash(X.you);
            X.clip('you', 'Sword_Dash', { dur: 0.22, from: 0.12, to: 0.38 }); X.go('you', hx + 1.25, Z, 0.13, { ease: 'out' });
            X.after(0.16, () => X.fx.dashEnd && X.fx.dashEnd(X.you)); X.after(0.13, () => S().give());
          } else {
            X.clip('you', 'Walk_Loop', { loop: true, speed: 1.6, fade: 0.08 }); X.go('you', hx + 1.25, Z, 0.42, { ease: 'inOut' }); X.after(0.3, () => S().give());
          }
        } },
      // THE STING: she's the one holding it, and YOU's ring goes up through it
      { last: true, key: 'strike',
        lead(X, s) { S().stage(7); X.you.facing = L; X.strike('lift', s.t); X.follow('low', { dist: 4.0 }); },
        do(X, ok) {
          const K = S(), c = K.b.pos.clone(), dir = Math.sign(X.her.x - X.you.x) || -1;
          X.slash('lift', { gold: ok });
          X.hit({ power: 2.3, gold: ok, at: { x: c.x, y: c.y + 0.2, z: c.z } });
          K.sting();
          X.shatter({ dir: new THREE.Vector3(dir * 0.7, 0.75, 0), power: ok ? 1.7 : 1.2, at: c });
          if (!ok) { X.clip('you', 'Hit_Chest', { dur: 0.4 }); X.go('you', X.you.x - dir * 1.3, Z, 0.3, { ease: 'out' }); }
        } },
    ];
  },
  // she's gone: YOU, the pin, and what's left of the perfume
  after(X) {
    const S = X.f.track.kill;
    X.lift('you', 0, 0.1); X.body('you', { pitch: 0, spin: 0, roll: 0 }, 0.05); X.expr('A_Amused');
    X.after(0.45, () => { X.you.facing = 0.3; X.clip('you', 'Yes', { dur: 1.3, fade: 0.2 }); X.follow('you', { dist: 3.4, h: 1.05 }); });
    X.after(0.75, () => S.flip());
    X.after(1.8, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.25 }));
  },
};
