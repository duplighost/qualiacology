// THE MOURNER's end: HER FUNERAL. She made your funeral her wedding; the wedding becomes hers, and the funeral too.
// The white chapel, your casket open on the altar under the rose arch, her six pallbearers stood as groomsmen. The
// outro's sung lines are the presses (the band has gone: the hits are the words and the two silences):
//   "locket"   DASH    she takes one last selfie with you in it: through the flash (the photo comes out blurred)
//   "wedding"  PARRY   the bride throws the bouquet: caught, and back in her face; it lands in the casket
//   "still"    STRIKE  the cut that sends her up and over...      "inside": ...into your casket
//   (clicks)   JUMP    YOU up onto it: the foot lid slams under her heels, and she walks the lid
//   "heavy"    STRIKE  she sits up with her phone for a picture: put back down
//   (silence)  PARRY   she comes up swinging on the dropout: caught, and she goes back in the box
//   the last   STRIKE  her phone comes up out of the coffin, charging, through the silence: the lid. Shut.
// And then the map pin comes down through the lid, tagged the way she tagged you: heaven.
// (src/game/execution.js runs it. Each step's `lead` puts the two of them, and the casket's lids, where that step
// starts, so the scene works from any step if her bar empties late; `do` is the beat itself.)
import * as THREE from 'three';
import { makePin, makeBouquet, tagTexture } from './props.js';
import { CASKET } from './set.js';

const PI = Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const EASE = { linear: (k) => k, in: (k) => k * k, out: (k) => 1 - (1 - k) * (1 - k), inOut: (k) => k * k * (3 - 2 * k), back: (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
const WHITE = new THREE.Color(2.6, 2.5, 2.4), GOLD = new THREE.Color(3.2, 2.0, 0.55), PETAL = new THREE.Color(1.5, 1.45, 1.4), BLACK = new THREE.Color(0.05, 0.04, 0.05);

// the casket on the altar: where its rim is, the top of a shut lid, and where she lies in it
const CX = CASKET.x, CZ = CASKET.z, CY = CASKET.y, CS = CASKET.scale;
const LID = CY + 0.7 * CS, LIE = CY + 0.43 * CS, OPEN = -1.75;
// the song's own moments (seconds)
const T = { locket: 203.362, wedding: 204.724, still: 206.355, inside: 206.854, clicks: [208.335, 208.495, 208.65, 208.814, 208.984], heavy: 209.677, drop: 210.74, back: 210.964, hush: 211.93 };
// their marks
const M = {
  youA: [-2.3, -2.45], herA: [0.15, -2.45],     // the selfie: her back to YOU (all of it in the aisle: the pews hide the rest)
  youB: [2.5, -2.3],                             // through the flash, past her
  herC: [-0.2, -2.95], youC: [0.75, -1.55],      // the cut that puts her in it
  youD: [0.8 * CS, -2.85],                       // at the altar, by the casket's foot
  lidX: 0.62 * CS, lidX2: 0.34 * CS, lidX3: 0.82 * CS,   // on the foot lid: where she lands, where she walks to, where she ends
  down: [1.75, -2.45],                           // back on the floor
};
// the pictures
const CAM = {
  aisle: { pos: [0, 1.3, 5.4], look: [0, 1.45, -4] },
  inside: { pos: [1.3, 3.5, -0.7], look: [-0.05, 1.2, -4.0] },
  walk: { pos: [2.0, 1.35, 0.9], look: [0.35, 1.25, -4.0] },
  hero: { pos: [-1.9, 0.62, -0.6], look: [0.15, 1.95, -4.0] },
  top: { pos: [0.15, 2.05, 0.75], look: [0.05, 2.0, -4.0] },
  last: { pos: [-0.7, 0.95, 2.3], look: [0.05, 2.25, -4.0] },
  end: { pos: [0.55, 1.45, 3.6], look: [0.2, 2.0, -4.0] },
};

// ------------------------------------------------------------------------------------------------ what the scene keeps
// The track runs update() every frame from the scene's start to the fight's end (the casket's lids, things in the
// air, the phone's light, the pin): the scene's own timers only fire once.
export class Kill {
  constructor(X) {
    this.X = X; this.f = X.f; this.S = X.f.track.S;
    this.tw = []; this.fly = []; this.pose = null; this.charge = null;
    this.lid = { head: OPEN, foot: OPEN }; this.jolt = 0; this.step = 0; this.caught = false; this.shut = false;
    this.bq = null; this.pin = null; this.tag = null;
    const b = X.her, rig = b.rig;
    this.hip = (rig.body.hip || 1) * rig.model.scale.y;      // where her body turns about when it's tipped
  }
  get ck() { return this.S.set.props.casket.obj.userData; }
  get snd() { return this.S.sounds; }
  // a number eased over the scene's time
  to(o, k, v, sec = 0.2, ease = 'out', then) {
    this.tw = this.tw.filter((w) => !(w.o === o && w.k === k));
    this.tw.push({ o, k, a: o[k], b: v, t0: this.X.T, d: Math.max(0.001, sec), e: EASE[ease] || EASE.out, then });
  }
  set(o, k, v) { this.tw = this.tw.filter((w) => !(w.o === o && w.k === k)); o[k] = v; }
  // a thing thrown: from a point to a point (or to wherever fn says, as it flies), `peak` metres over the straight line
  toss(mesh, to, sec, peak = 1, then, spin = 9) {
    this.fly = this.fly.filter((q) => q.m !== mesh);
    this.fly.push({ m: mesh, from: mesh.position.clone(), to, t0: this.X.T, d: Math.max(0.001, sec), peak, then, spin, r0: mesh.rotation.x });
  }
  // her pose, by hand: a clip held at a fraction of itself, eased from one to another (backwards too)
  scrub(name, from, to, sec = 0.2, ease = 'out', fade = 0.08) {
    const X = this.X, rig = X.her.rig, c = rig.kit.clips[name]; if (!c) return;
    X.acts = X.acts.filter((a) => a.rig !== rig);
    const a = rig.mixer.clipAction(c);
    if (rig.base !== a) {
      a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.enabled = true; a.setEffectiveWeight(1);
      if (rig.base) a.crossFadeFrom(rig.base, fade, false);
      a.play(); rig.base = a; rig.baseName = name; rig._onceEnd = 0; rig._then = null; rig.events = [];
      if (rig.upperAct) { rig.upperAct.fadeOut(0.05); rig.upperAct = null; }
    }
    a.paused = false; a.timeScale = 0; a.time = c.duration * from;
    this.pose = { a, d: c.duration, from, to, t0: X.T, sec: Math.max(0.001, sec), e: EASE[ease] || EASE.out };
  }
  // the phone's light coming up for a picture, from now to t1
  light(t1, k = 0.2) { this.charge = { t0: this.X.T, t1, k }; }
  // their heights, at once (the stage's own lift takes a frame)
  yHer(y) { const b = this.X.her; b.root.position.y += y - (b._sceneY || 0); b._sceneY = y; this.X.lift('her', y, 0.001); }
  yYou(y) { const p = this.X.you; p.y = y; p.grounded = y <= 0.001; this.X.lift('you', y, 0.001); }
  upright() { const B = this.X.her.rig.body; this.X.body('her', { y: 0, spin: 0, pitch: 0, roll: 0 }, 0.001); B.y = B.spin = B.pitch = B.roll = 0; }
  // she's in the box (lying, sitting up...) or out of it
  box(on) {
    const X = this.X, b = X.her;
    b.noShove = on; b.noTip = on; b.markK = on ? 0 : 1;
    if (on) { X.place('her', CX, CZ, PI / 2); this.yHer(LIE); this.upright(); } else this.yHer(0);
  }
  lying() { return this.X.her.rig.baseName === 'LayToIdle'; }
  // where step n starts: the lids, who is where and how high. In order this changes nothing; started late it puts them there
  stage(n) {
    const X = this.X, late = this.step !== n - 1;
    this.step = n;
    if (!late) return false;
    this.tw.length = 0; this.fly.length = 0;
    this.lid.foot = n >= 5 ? 0 : OPEN; this.lid.head = OPEN;
    this.box(n >= 4);
    if (n >= 4) this.scrub('LayToIdle', 0, 0, 0.01);
    if (n >= 5) { X.place('you', CX + (n === 5 ? M.lidX2 : n === 6 ? M.lidX : M.lidX3), CZ, -PI / 2); this.yYou(LID); } else this.yYou(0);
    if (this.bq && n >= 3) { this.bq.visible = true; this.bq.position.set(CX + 0.5 * CS, LIE + 0.12, CZ + 0.05); this.bq.rotation.set(0.3, 0.4, 1.2); }
    return true;
  }
  thud(k = 1, wood = true) {
    const f = this.f;
    this.jolt = -0.05 * k; this.to(this, 'jolt', 0, 0.25, 'back');
    f.cam.shake(0.45 * k, 0.16);
    if (wood) this.snd.play('woodHeavy', { x: CX, gain: 0.55 * k });
    this.S.bearers.flinch(0.5 * k);
  }
  // a lid comes down (sec: how long it takes; it lands at the end of that)
  slam(which, sec = 0.07, k = 1) {
    this.to(this.lid, which, 0, sec, 'in', () => {
      const f = this.f, x = CX + (which === 'foot' ? 0.55 : -0.55) * CS;
      this.thud(k, false);
      this.snd.play('woodHeavy', { x, gain: 0.7 * k }); this.snd.play('plank', { x, gain: 0.5 * k, delay: 0.02 });
      f.fx.dust(x, CZ + 0.5, 6, new THREE.Color(0.8, 0.78, 0.75));
      f.fx.chips(x, LID + 0.05, CZ + 0.3, PETAL, Math.round(8 * k));
    });
  }

  update(dt) {
    const X = this.X, S = this.S, now = X.T;
    for (let i = this.tw.length - 1; i >= 0; i--) {
      const w = this.tw[i], k = clamp((now - w.t0) / w.d, 0, 1);
      w.o[w.k] = w.a + (w.b - w.a) * w.e(k);
      if (k >= 1) { this.tw.splice(i, 1); try { w.then && w.then(); } catch (e) { console.error('scene', e); } }
    }
    // the casket: its lids, and its jolt under whatever lands in or on it
    const p = S.set.props.casket, ck = p.obj.userData;
    ck.lidHead.rotation.x = this.lid.head; ck.lidFoot.rotation.x = this.lid.foot;
    p.obj.position.y = CY + this.jolt;
    if (ck.lilies) ck.lilies.rotation.z = this.jolt * 2.5;
    // her pose
    if (this.pose) {
      const q = this.pose;
      if (X.her.rig.base !== q.a) this.pose = null;
      else { const k = clamp((now - q.t0) / q.sec, 0, 1); q.a.time = q.d * (q.from + (q.to - q.from) * q.e(k)); }
    }
    // her phone's light
    if (this.charge) { const c = this.charge, k = clamp((now - c.t0) / Math.max(0.01, c.t1 - c.t0), 0, 1); if (now <= c.t1) S.shots.ledK = Math.max(S.shots.ledK, c.k * k * k); else this.charge = null; }
    // things in the air
    for (let i = this.fly.length - 1; i >= 0; i--) {
      const q = this.fly[i], k = clamp((now - q.t0) / q.d, 0, 1), to = typeof q.to === 'function' ? q.to() : q.to;
      q.m.position.lerpVectors(q.from, to, k); q.m.position.y += 4 * q.peak * k * (1 - k);
      q.m.rotation.x = q.r0 + q.spin * (now - q.t0); q.m.rotation.z = 0.6 * q.spin * (now - q.t0);
      if (k >= 1) { this.fly.splice(i, 1); try { q.then && q.then(); } catch (e) { console.error('scene', e); } }
    }
    // the bouquet in a hand
    if (this.hold && this.bq) { this.hold.getWorldPosition(this.bq.position); this.bq.position.y += 0.1; }
    // the pin: down through the lid, and its tag
    if (this.pin && this.pin.userData.t0 !== undefined) {
      const u = this.pin.userData, k = clamp((now - u.t0) / 0.13, 0, 1);
      this.pin.position.y = u.y1 + (1 - k * k) * 7 + this.jolt;
      if (k >= 1 && !u.landed) { u.landed = true; try { u.land(); } catch (e) { console.error('scene', e); } }
      if (u.landed && this.tag) { const pop = EASE.back(clamp((now - u.t0 - 0.2) / 0.16, 0, 1)); this.tag.visible = pop > 0.01; this.tag.scale.set(2.3 * pop, 0.72 * pop, 1); }
    }
  }

  // back as it was (a rewind, the fight's end)
  dispose() {
    const S = this.S, b = this.f.boss;
    if (S.set && S.set.props.casket) { const ck = S.set.props.casket.obj.userData; ck.lidHead.rotation.x = OPEN; if (ck.lilies) ck.lilies.rotation.z = 0; S.set.release('casket'); }
    if (b) { b.noShove = false; b.noTip = false; b.markK = 1; if (b.fig && b.fig.root && this.shut) b.fig.root.visible = true; }
    if (S.bearers) S.bearers.bow = false;
    if (S.D) S.D.scMode = 'shoulder';
    for (const o of [this.bq, this.pin, this.tag]) if (o && o.parent) o.parent.remove(o);
    this.snd && this.snd.stopWhine();
  }
}

// ------------------------------------------------------------------------------------------------ the pieces of it
const handOf = (who, side = 'r') => who.rig.bones['hand_' + side] || who.rig.bones['lowerarm_' + side];
const _v = new THREE.Vector3();
const led = (X) => { const l = X.her.fig.props.led; return l ? l.getWorldPosition(_v).clone() : new THREE.Vector3(X.her.x, 2.2, X.her.z); };
function petals(X, x, y, z, n = 14) { X.fx.chips(x, y, z, PETAL, n); X.fx.glitter(x, y, z, WHITE, Math.round(n * 0.6), 0.5); }
// her phone raised for a picture: the pose, the light coming up to t1, the focus chirps and the whine under it
function raise(X, K, t1, fromBox = false) {
  const S = K.S, b = X.her;
  S.D.scMode = 'up';
  if (!fromBox) X.clip('her', 'Spell_Simple_Idle_Loop', { loop: true, fade: 0.14 });
  K.light(t1, 0.22);
  if (t1 - X.T > 0.25) { K.snd.chirp(0, b.x); K.snd.whine(t1 - X.T, b.x, 1.3); }
}

export const death = {
  beats: 36,           // from where the band drops out: the whole outro is hers
  hold: 1.9,

  enter(X) {
    const f = X.f, S = f.track.S, b = X.her, p = X.you;
    if (S.kill) S.kill.dispose();
    const K = S.kill = new Kill(X);
    // her own ending stands down (the walk up the runner is the scene's now), and anything of hers still running
    S.outro = null; S.shots.cancelAll(); S.D.scMode = 'shoulder'; S.D.admire = 0; b.pose = null; b.backTo = null; b._speed = 0;
    b.root.position.y = 0; b._sceneY = 0; b.markK = 1;
    S.set.drive('casket', { lid: true });
    K.lid.head = K.ck.lidHead.rotation.x; K.lid.foot = K.ck.lidFoot.rotation.x;
    K.to(K.lid, 'head', OPEN, 0.3); K.to(K.lid, 'foot', OPEN, 0.3);
    // the bouquet she'll throw, out of sight until she does
    K.bq = X.add(makeBouquet(true)); K.bq.scale.setScalar(1.25); K.bq.visible = false;
    // the bride walks up to the altar and turns her back for the picture; YOU after her
    const walk = Math.max(0.6, Math.min(1.8, T.locket - 0.7 - X.T));
    const dH = Math.hypot(M.herA[0] - b.x, M.herA[1] - b.z), dY = Math.hypot(M.youA[0] - p.x, M.youA[1] - p.z);
    X.go('her', ...M.herA, walk, { ease: 'inOut', face: dH > 0.3 }); X.clip('her', 'Walk_Formal_Loop', { loop: true, speed: clamp(dH / walk / 1.25, 0.7, 2.4), fade: 0.15 });
    X.go('you', ...M.youA, walk * 0.92, { ease: 'inOut', face: dY > 0.3 }); X.clip('you', dY / walk > 3.2 ? 'Jog_Fwd_Loop' : 'Walk_Loop', { loop: true, speed: clamp(dY / walk / (dY / walk > 3.2 ? 3.4 : 1.5), 0.8, 2.2), fade: 0.12 });
    X.after(walk * 0.92, () => { X.face('you', ...M.herA); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
    X.after(walk, () => { X.face('her', M.herA[0] + 3, M.herA[1]); X.clip('her', 'Idle_TalkingPhone_Loop', { loop: true, fade: 0.2 }); });
    X.herFace('smug'); X.expr('A_Focus');
    X.cam(CAM.aisle, { fov: 40 });
  },

  steps: [
    // "locket": one last selfie, with you in it. Through the flash: the photo comes out blurred
    { t: T.locket, key: 'dash',
      lead(X, s) {
        const K = X.f.track.S.kill;
        if (K.stage(1)) { X.place('her', ...M.herA, PI / 2); X.place('you', ...M.youA, PI / 2); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); }
        X.face('her', M.herA[0] + 3, M.herA[1]);
        raise(X, K, s.t); X.herFace('smug');
        X.follow('two', { dist: 6.4, h: 1.5, fov: 36 });
      },
      do(X, ok) {
        const f = X.f, S = f.track.S, K = S.kill, p = X.you, b = X.her, ph = led(X);
        // the flash
        S.shots.ledK = 1; f.fx.flash(new THREE.Color(1, 0.97, 0.94), 0.2); K.snd.stopWhine(); K.snd.snap(ph.x, false);
        X.clip('her', 'Spell_Simple_Shoot', { dur: 0.22, from: 0.1, to: 0.6 });
        try { S.shots._photo({ ax: ph.x, az: ph.z }, ok); } catch (e) { /* no picture */ }
        if (ok) {
          X.face('you', ...M.youB); X.clip('you', 'Sword_Dash', { dur: 0.26, from: 0.12, to: 0.38, fade: 0.03 });
          X.go('you', ...M.youB, 0.17, { ease: 'out' });
          f.fx.dashStart && f.fx.dashStart(p); f.sfx.dash && f.sfx.dash(p);
          X.after(0.07, () => { f.fx.nearMiss && f.fx.nearMiss(p); f.sfx.nearMiss && f.sfx.nearMiss(p); X.clip('her', 'Hit_Chest', { dur: 0.3 }); b.rig.flinch = 1; });
          X.after(0.2, () => { f.fx.dashEnd && f.fx.dashEnd(p); X.faceEach(); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); X.herFace('fury'); S.D.scMode = 'shoulder'; X.expr('A_Amused'); });
        } else {
          p.rig.flash(new THREE.Color(2.2, 2.2, 2.3), 0.8); X.after(0.25, () => p.rig.flash(new THREE.Color(0, 0, 0), 0));
          X.clip('you', 'Hit_Chest', { dur: 0.3 }); X.herFace('delight'); f.cam.shake(0.4, 0.15);
          X.after(0.3, () => { S.D.scMode = 'shoulder'; X.face('you', ...M.youB); X.clip('you', 'Jog_Fwd_Loop', { loop: true, speed: 1.6, fade: 0.08 }); X.go('you', ...M.youB, 0.36, { ease: 'inOut' }); });
          X.after(0.66, () => { X.faceEach(); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); });
        }
      } },

    // "wedding": the bride throws the bouquet. Caught, and back in her face; it lands in the casket behind her
    { t: T.wedding, key: 'parry',
      lead(X, s) {
        const f = X.f, S = f.track.S, K = S.kill, b = X.her, p = X.you;
        if (K.stage(2)) { X.place('her', ...M.herA, PI / 2); X.place('you', ...M.youB, -PI / 2); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); }
        X.faceEach(); S.D.scMode = 'shoulder'; X.herFace('pout');
        // the wind-up with it in her hand, the throw, and it's in the air until the beat
        const fly = 0.34, wind = Math.max(0.05, s.t - fly - X.T);
        K.bq.visible = true; K.hold = handOf(b, 'r'); K.fly.length = 0;
        X.clip('her', 'OverhandThrow', { dur: wind + 0.22, from: 0.12, to: 0.72, fade: 0.06 });
        X.at(s.t - fly, () => {
          K.hold = null; K.snd.play('cloth', { x: b.x, gain: 0.7 });
          K.toss(K.bq, () => _v.set(p.x - 0.42, 1.5 + p.y, p.z).clone(), fly, 0.9);
        });
        X.follow('two', { dist: 6.4, h: 1.5, fov: 36 });
      },
      do(X, ok) {
        const f = X.f, S = f.track.S, K = S.kill, p = X.you, b = X.her;
        K.fly.length = 0; K.hold = null;
        const inBox = new THREE.Vector3(CX + 0.5 * CS, LIE + 0.12, CZ + 0.05);
        if (ok) {
          K.caught = true;
          X.clip('you', 'Sword_Block', { dur: 0.1, from: 0.08, to: 0.3, fade: 0.03 }); p.rig.hitStop(0.07);
          f.fx.caught && f.fx.caught(p.x - 0.5, 1.45, p.z, true); f.sfx.catch && f.sfx.catch('perfect', f.pan(p.x));
          K.bq.position.set(p.x - 0.5, 1.45, p.z);
          // and back
          X.after(0.1, () => {
            X.clip('you', 'Punch_Cross', { dur: 0.24, fade: 0.03 });
            K.toss(K.bq, new THREE.Vector3(b.x + 0.25, 1.95, b.z), 0.15, 0.08, () => {
              X.hit({ power: 1.0, gold: true, y: 1.9, dir: -PI / 2 }); petals(X, b.x + 0.2, 1.95, b.z, 22); K.snd.play('slap', { x: b.x, gain: 0.8 });
              X.clip('her', 'Hit_Knockback', { dur: 0.5, to: 0.62 }); X.herFace('shock');
              X.go('her', ...M.herC, 0.36, { ease: 'out' }); X.after(0.4, () => { X.face('her', ...M.youC); X.clip('her', 'Idle_Loop', { loop: true, fade: 0.25 }); });
              // off her face, up, and into the box
              K.toss(K.bq, inBox, 0.52, 1.5, () => { K.bq.rotation.set(0.3, 0.4, 1.2); K.thud(0.35, false); K.snd.play('cloth', { x: CX, gain: 0.6 }); petals(X, inBox.x, inBox.y + 0.2, inBox.z, 8); }, 7);
            }, 14);
          });
          X.after(0.36, () => { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); });
        } else {
          // on the nose
          X.clip('you', 'Hit_Head', { dur: 0.36 }); p.rig.flinch = 1; petals(X, p.x - 0.3, 1.6, p.z, 12); K.snd.play('slap', { x: p.x, gain: 0.6 }); f.cam.shake(0.35, 0.12);
          K.bq.position.set(p.x - 0.4, 1.55, p.z);
          K.toss(K.bq, inBox, 0.8, 2.6, () => { K.bq.rotation.set(0.3, 0.4, 1.2); K.thud(0.3, false); }, 7);
          X.herFace('delight'); X.clip('her', 'Yes', { dur: 0.5, from: 0.2, to: 0.6 });
          X.after(0.45, () => { X.face('her', ...M.herC); X.clip('her', 'Walk_Formal_Loop', { loop: true, speed: 1.5, fade: 0.12 }); X.go('her', ...M.herC, 0.42, { ease: 'inOut' }); });
          X.after(0.88, () => { X.face('her', ...M.youC); X.clip('her', 'Idle_Loop', { loop: true, fade: 0.2 }); });
        }
      } },

    // "still": the cut that sends her up and over. "inside": into your casket
    { t: T.still, key: 'strike',
      lead(X, s) {
        const K = X.f.track.S.kill, b = X.her;
        if (K.stage(3)) { X.place('her', ...M.herC); X.place('you', M.youC[0] + 2, M.youC[1] + 0.4); X.clip('her', 'Idle_Loop', { loop: true, fade: 0.1 }); }
        const run = Math.min(0.3, Math.max(0.05, s.t - X.T - 0.3));
        X.face('you', ...M.youC); X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.3, fade: 0.06 }); X.go('you', ...M.youC, run, { ease: 'out' });
        X.after(run, () => { X.face('you', b.x, b.z); X.face('her', ...M.youC); X.strike('lift', s.t); });
        X.cam({ pos: [2.3, 1.6, 1.3], look: [-0.1, 1.35, -3.4] }, { fov: 36, blend: 0.35 });
      },
      do(X, ok) {
        const f = X.f, S = f.track.S, K = S.kill, b = X.her;
        X.slash('lift', { gold: ok }); X.hit({ power: ok ? 1.7 : 0.8, gold: ok });
        // up, over the rim, and in, heels over head: she comes down on her back on the word
        const fly = Math.max(0.2, T.inside - X.T);
        b.noTip = true; b.facing = PI / 2;
        X.clip('her', 'Jump_Loop', { loop: true, fade: 0.05 }); X.herFace('shock');
        X.go('her', CX, CZ, fly, { ease: 'linear', arc: ok ? 1.5 : 1.1, y: LIE - K.hip });
        X.body('her', { pitch: -PI * 2.5 }, fly, 'linear');
        X.after(fly, () => {
          K.box(true); K.scrub('LayToIdle', 0, 0, 0.01, 'linear', 0.03);
          K.thud(1.2); K.snd.play('plateHeavy', { x: CX, gain: 0.6, delay: 0.02 }); petals(X, CX, LID + 0.1, CZ, 18);
          X.hit({ power: 0.9, gold: false, y: 0.25, quiet: true, dir: PI });
          X.cam(CAM.inside, { fov: 38 });
        });
        // and YOU walks up to it
        X.after(fly + 0.5, () => { X.face('you', ...M.youD); X.clip('you', 'Walk_Loop', { loop: true, speed: 1.35, fade: 0.15 }); X.go('you', ...M.youD, 0.62, { ease: 'inOut' }); X.expr('A_Amused'); });
        X.after(fly + 0.75, () => { X.cam(CAM.walk, { fov: 36, blend: 0.5 }); X.herFace('fury'); });
        X.after(fly + 1.12, () => { X.face('you', M.youD[0], CZ); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
      } },

    // the five clicks: YOU up onto it. The foot lid slams under her heels; she walks the lid; the bride sits up
    { t: T.clicks[0], key: 'jump',
      lead(X) {
        const K = X.f.track.S.kill;
        if (K.stage(4)) { X.place('you', ...M.youD, PI); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); X.herFace('fury'); }
        X.face('you', M.youD[0], CZ);
        X.clip('you', 'Crouch_Idle_Loop', { loop: true, fade: 0.3 });
        X.cam(CAM.hero, { fov: 40, blend: 0.4 });
      },
      do(X, ok) {
        const f = X.f, S = f.track.S, K = S.kill, p = X.you, b = X.her;
        const land = ok ? T.clicks[1] : T.clicks[2];
        f.sfx.jump && f.sfx.jump(p); f.fx.dust(p.x, p.z, 6); if (ok) f.fx.ring && f.fx.ring(p.x, p.z, GOLD, 1.2);
        X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.05 });
        X.go('you', CX + M.lidX, CZ, Math.max(0.1, land - X.T), { ease: 'out', arc: 0.55, y: LID });
        X.at(land - 0.08, () => K.slam('foot', 0.08, ok ? 1.3 : 1));
        X.at(land, () => {
          X.face('you', CX - 2, CZ); X.clip('you', ok ? 'NinjaJump_Land' : 'Hit_Chest', ok ? { dur: 0.16, from: 0.12, to: 0.5, fade: 0.03 } : { dur: 0.3 });
          f.sfx.land && f.sfx.land(p, true); p.rig.hitStop(0.05); X.herFace('shock');
          X.cam(CAM.hero, { fov: 37, blend: 0.6 });
        });
        // she walks the lid: a heel on each click
        const steps = ok ? [[T.clicks[2], M.lidX - 0.14 * CS], [T.clicks[3], M.lidX2]] : [[T.clicks[3], M.lidX2]];
        for (const [t, x] of steps) X.at(t, () => {
          X.clip('you', 'Walk_Loop', { loop: true, speed: 1.6, fade: 0.05 }); X.go('you', CX + x, CZ, 0.11, { ease: 'out' });
          K.snd.heel(CX + x, false); f.fx.sparks(CX + x, LID + 0.03, CZ + 0.1, GOLD, 5); K.jolt = -0.012; K.to(K, 'jolt', 0, 0.1);
        });
        X.at(T.clicks[3] + 0.12, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }));
        // and on the last one the bride sits up, phone first
        X.at(T.clicks[4], () => {
          K.scrub('LayToIdle', 0.0, 0.3, 0.1, 'back'); X.herFace('smug'); K.snd.play('ding', { x: CX, gain: 0.5, rate: 1.2 });
          X.cam(CAM.top, { fov: 34, blend: 0.3 });
        });
      } },

    // "heavy": sat up in it for a picture with you. Put back down
    { t: T.heavy, key: 'strike',
      lead(X, s) {
        const K = X.f.track.S.kill;
        if (K.stage(5)) { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.05 }); K.scrub('LayToIdle', 0.3, 0.3, 0.01); X.cam(CAM.top, { fov: 34 }); }
        raise(X, K, s.t, true); X.herFace('smug');
        X.strike('low', s.t);
      },
      do(X, ok) {
        const f = X.f, S = f.track.S, K = S.kill;
        X.slash('low', { gold: ok }); X.hit({ power: ok ? 1.4 : 0.7, gold: ok, y: 0.75, dir: -PI / 2 });
        S.D.scMode = 'low'; S.shots.ledK = 0; K.charge = null; K.snd.stopWhine();
        K.scrub('LayToIdle', 0.3, 0.0, ok ? 0.1 : 0.2, 'in'); X.herFace(ok ? 'hurt' : 'delight');
        X.after(ok ? 0.1 : 0.2, () => { K.thud(ok ? 0.9 : 0.5); K.snd.play('plateHeavy', { x: CX - 0.5, gain: 0.5 }); });
        // and up she comes again, swinging: the swing hangs through the dropout
        X.at(T.heavy + 0.28, () => { X.herFace('fury'); K.scrub('LayToIdle', 0.0, 0.52, T.drop - 0.2 - (T.heavy + 0.28), 'inOut'); });
        X.at(T.drop - 0.2, () => { S.D.scMode = 'swipe'; X.clip('her', 'Melee_Hook', { dur: 0.2, from: 0.0, to: 0.42, fade: 0.1 }); K.snd.play('cloth', { x: CX, gain: 0.7 }); });
      } },

    // the dropout: she comes up out of it swinging. Caught on the guard, and she goes back in the box
    { t: T.back, key: 'parry',
      lead(X) {
        const f = X.f, S = f.track.S, K = S.kill;
        if (K.stage(6)) { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.05 }); K.scrub('LayToIdle', 0.52, 0.52, 0.01); X.herFace('fury'); S.D.scMode = 'swipe'; X.cam(CAM.top, { fov: 34 }); X.at(T.drop - 0.2, () => X.clip('her', 'Melee_Hook', { dur: 0.2, from: 0.0, to: 0.42, fade: 0.1 })); }
        X.go('you', CX + M.lidX, CZ, 0.25, { ease: 'out' }); X.face('you', CX - 2, CZ);
        X.cam(CAM.top, { fov: 31, blend: 0.6 });
      },
      do(X, ok) {
        const f = X.f, S = f.track.S, K = S.kill, p = X.you;
        X.clip('her', 'Melee_Hook', { dur: 0.09, from: 0.42, to: 0.78, fade: 0.02 });
        const topple = () => {
          X.clip('her', 'Hit_Knockback', { dur: 0.3, to: 0.4, fade: 0.04 }); X.herFace('shock'); S.D.scMode = 'low';
          X.after(0.22, () => K.scrub('LayToIdle', 0.3, 0.0, 0.14, 'in', 0.1));
          X.after(0.36, () => { K.thud(1); K.snd.play('plateHeavy', { x: CX - 0.5, gain: 0.55 }); petals(X, CX - 0.4, LID, CZ, 6); });
        };
        if (ok) {
          X.clip('you', 'Sword_Block', { dur: 0.1, from: 0.08, to: 0.3, fade: 0.03 }); p.rig.hitStop(0.09);
          f.fx.caught && f.fx.caught(p.x - 0.55, LID + 1.25, p.z, true); f.sfx.catch && f.sfx.catch('perfect', f.pan(p.x)); f.cam.shake(0.4, 0.12);
          X.after(0.12, () => { X.clip('you', 'Punch_Cross', { dur: 0.22, fade: 0.03 }); });
          X.after(0.2, () => { X.hit({ power: 1.3, gold: true, y: 0.95, dir: -PI / 2 }); topple(); });
          X.after(0.45, () => { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); X.expr('A_Amused'); });
        } else {
          X.clip('you', 'Hit_Chest', { dur: 0.32 }); p.rig.flinch = 1; K.snd.play('slap', { x: p.x, gain: 0.7 }); f.cam.shake(0.4, 0.12);
          X.go('you', CX + M.lidX3, CZ, 0.2, { ease: 'out' });
          X.after(0.2, topple);            // she overbalances, and goes back in on her own
          X.after(0.5, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }));
        }
      } },

    // the silence: her phone comes up out of the coffin for one more, its light charging. The last hit: the lid. Shut
    { last: true, key: 'strike',
      lead(X, s) {
        const f = X.f, S = f.track.S, K = S.kill;
        if (K.stage(7)) { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.05 }); }
        if (!K.lying() || K.pose) { /* still falling back: leave her */ } else K.scrub('LayToIdle', 0, 0, 0.01);
        X.go('you', CX + M.lidX3, CZ, 0.2, { ease: 'out' }); X.face('you', CX - 2, CZ);
        X.strike('slam', s.t);
        raise(X, K, s.t, true); X.herFace('smug');
        X.cam(CAM.last, { fov: 42, blend: 0.3 });
      },
      do(X, ok) {
        const f = X.f, S = f.track.S, K = S.kill, b = X.her, hx = CX - 0.55 * CS;
        X.slash('slam', { gold: ok });
        // the lid, on her and on her last picture
        K.set(K.lid, 'head', 0); K.shut = true;
        S.shots.ledK = 0; K.charge = null; K.snd.stopWhine(); S.D.scMode = 'low';
        b.fig.root.visible = false; b.markK = 0;
        X.hit({ power: 2.3, gold: ok, at: { x: hx, y: LID + 0.05 - (b._sceneY || 0), z: CZ + 0.2 }, dir: PI });
        K.thud(1.8, false); K.snd.play('woodHeavy', { x: hx, gain: 0.9 }); K.snd.play('plank', { x: hx, gain: 0.6, delay: 0.02 }); K.snd.play('latch', { x: hx, gain: 0.8, delay: 0.12 });
        // what's left of her comes out through the seam
        for (const dx of [-0.9, -0.45, 0, 0.45, 0.9]) { f.fx.chips(CX + dx * CS, LID - 0.08, CZ + 0.38, new THREE.Color(2.2, 2.1, 2.0), 9, 0); f.fx.glitter(CX + dx * CS, LID, CZ + 0.3, GOLD, 8, 0.4); }
        f.fx.ring && f.fx.ring(CX, CZ + 1.6, GOLD, 3.6);
        S.bearers.bow = true;
        X.shatter({ none: true });
      } },
  ],

  after(X) {
    const f = X.f, S = f.track.S, K = S.kill, p = X.you;
    X.expr('A_Amused');
    X.after(0.16, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.2 }));
    // tagged location: heaven
    X.after(0.3, () => {
      const pin = K.pin = X.add(makePin()); pin.scale.setScalar(0.6); pin.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      const px = CX - 0.5 * CS, y1 = LID - 0.16;
      pin.position.set(px, y1 + 7, CZ);
      const tag = K.tag = X.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture('heaven'), transparent: true, depthWrite: false })));
      tag.position.set(px, y1 + 1.5 + 0.62, CZ + 0.05); tag.visible = false; tag.renderOrder = 7;
      pin.userData = { t0: X.T, y1, land: () => {
        K.thud(1.1, false); K.snd.play('stone', { x: px, gain: 0.8 }); K.snd.play('bell', { x: px, rate: 0.6, delay: 0.03 }); K.snd.ping(px);
        f.fx.sparks(px, LID + 0.05, CZ, GOLD, 22); f.fx.chips(px, LID + 0.05, CZ, BLACK, 14); f.cam.kick(1.4);
      } };
      X.cam(CAM.end, { fov: 40, blend: 0.9 });
    });
    // and YOU steps down off it
    X.after(1.0, () => { X.face('you', ...M.down); X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }); X.go('you', ...M.down, 0.36, { ease: 'inOut', arc: 0.35, y: 0 }); });
    X.after(1.36, () => { K.yYou(0); X.face('you', CX, 6); X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.2 }); f.fx.dust(p.x, p.z, 5); });
  },
};
