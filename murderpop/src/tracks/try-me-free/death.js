// THE PRIZE INSIDE's end: SERVING SUGGESTION. The song's last bars are the dark where the commercial cuts out, and its
// own hits are the presses. YOU's lunge knocks her back into her box as the lights go (282.93). From her window she
// hurls her spoon; YOU catches it: a free sample, it's yours (284.21). Four whacks of it on the box on the four stabs
// (286.06): shaken. The box comes over and pours, as it poured on YOU all song: YOU dashes out through the cereal, a
// bowl is up out of the table, and the prize pours out of her window into it (287.16; she lands on 288.08). Up onto
// the rim (288.44); she holds up the little box of herself one last time; and on the last hit, as every light in the
// commercial comes back on, the spoon comes down. It's breakfast.
// (src/game/execution.js runs it. Each step's `lead` makes sure the two of them and the set are where that beat
// needs them, so it works from any step: her bar can empty late, in the dark, with her already in her box.)
import * as THREE from 'three';
import { BOX, INBOX } from './set.js';
import { setExpr } from './prize.js';

const T = [282.93, 284.21, 286.06, 287.16, 288.44], SPLASH = 288.08;
const BOWL = { x: 0, z: -3.0, r: 1.7, milk: 0.72, sit: 0.7, rim: 1.0, hz: -3.35 };      // (sit: she's on the heap in it, from the waist up over the rim; hz: where)
const M = { her0: [0, -2.5], you0: [-0.7, 1.0], you1: [-0.5, -1.3], you2: [-1.25, -5.7], you3: [-2.95, -1.5], rim: [-1.36, -2.2] };
const CAM = {
  open: { pos: [2.7, 1.25, 4.9], look: [-0.2, 1.75, -2.6], fov: 36 },
  window: { pos: [1.7, 1.35, 0.6], look: [0, 3.0, -7.8], fov: 38 },
  catch: { pos: [-2.7, 1.6, 1.0], look: [0.2, 2.4, -6.5], fov: 40 },
  shake: { pos: [3.7, 1.3, -1.0], look: [-0.7, 2.3, -7.4], fov: 46 },
  wide: { pos: [0.9, 1.05, 3.7], look: [0, 3.0, -4.8], fov: 50 },
  bowl: { pos: [1.6, 1.75, 2.0], look: [-0.4, 1.5, -2.9], fov: 42 },
  after: { pos: [0.8, 1.75, 2.1], look: [-0.9, 1.6, -2.5], fov: 38 },
};
const GOLD = new THREE.Color(3.2, 2.0, 0.55), COPPER = new THREE.Color(2.3, 1.25, 0.6), MILK = new THREE.Color(2.5, 2.45, 2.3), FILM = new THREE.Color(2.4, 2.7, 3.2);
const LOOPS = [0xff3a4a, 0xffd21a, 0xff8a1a, 0xa85aff, 0x3ab8ff, 0xff6ab0];
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
const set = (X) => X.f.track.set;

// ------------------------------------------------------------------------------------------------ the set's part
// (mixed into the set by track.js) The bowl and YOU's spoon are built with the set, hidden, so nothing compiles
// mid-song; dth is where the scene has got to; everything goes back on a rewind.
export const DEATHSET = {
  _deathProps() {
    this.dth = { on: false, where: 'floor', pane: true, inBox: false, bowlT: 0, bowlU: 0, bowlK: 0, pour: false, spoon: 'her', fly: null };
    // the bowl on every box on the shelf: white glaze, a red band, milk, loops afloat. It comes up out of the table
    // like her bench and her casket do
    const g = new THREE.Group(); g.position.set(BOWL.x, -3, BOWL.z); g.visible = false; this.group.add(g);
    const glaze = new THREE.MeshPhysicalMaterial({ color: 0xfbf8f2, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide });
    const prof = [[0.55, 0], [1.0, 0.06], [1.42, 0.38], [1.64, 0.78], [BOWL.r, BOWL.rim], [1.6, BOWL.rim], [1.5, 0.78]].map(([x, y]) => new THREE.Vector2(x, y));
    const wall = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glaze); wall.castShadow = wall.receiveShadow = true; g.add(wall);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.668, 1.586, 0.16, 48, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8202e, roughness: 0.14, clearcoat: 1 })); band.position.y = 0.74; g.add(band);
    const milk = new THREE.Mesh(new THREE.CircleGeometry(1.56, 48), new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.12, clearcoat: 1 })); milk.rotation.x = -Math.PI / 2; milk.position.y = BOWL.milk; g.add(milk);
    const n = 24, im = new THREE.InstancedMesh(new THREE.TorusGeometry(0.2, 0.085, 8, 18), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, clearcoat: 0.5 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, r = 0.62 + 0.82 * ((i * 0.618) % 1);
      q.setFromEuler(new THREE.Euler(Math.PI / 2 + Math.sin(i * 1.7) * 0.5, i, Math.cos(i * 2.3) * 0.4));
      m4.compose(new THREE.Vector3(Math.cos(a) * r, BOWL.milk + 0.03, Math.sin(a) * r), q, one); im.setMatrixAt(i, m4); im.setColorAt(i, new THREE.Color(LOOPS[i % 6]));
    }
    g.add(im);
    this.pieces.bowl = { g, at: { x: BOWL.x, z: BOWL.z }, col: { type: 'circle', r: BOWL.r }, up: 0 };
    // her spoon, in YOU's hands: a size up
    const sp = this.dSpoon = this.prize.props.spoon.children[0].clone(); sp.scale.setScalar(1.35); sp.visible = false; this.group.add(sp);
  },
  deathReset() {
    const D = this.dth; if (!D) return;
    Object.assign(D, { on: false, where: 'floor', pane: true, inBox: false, bowlT: 0, bowlU: 0, bowlK: 0, pour: false, spoon: 'her', fly: null });
    this.tipT = 0; this.sceneTip = 0; this.tipRate = 6; this.lightAim = null;
    this.dSpoon.visible = false;
    const pl = this.f.player; if (pl && pl.rings) for (const r of pl.rings) if (r.holder) r.holder.visible = true;
  },
  _deathUpdate(f, dt) {
    const D = this.dth; if (!D || !D.on) return;
    const b = this.prize.boss, pl = f.player, sp = this.dSpoon;
    if (D.bowlU !== D.bowlT) { D.bowlU = Math.max(0, Math.min(1, D.bowlU + Math.sign(D.bowlT - D.bowlU) * dt / 0.5)); D.bowlK = 1 - Math.pow(1 - D.bowlU, 3); }
    // the pour: out of the box's mouth, into the bowl
    if (D.pour && Math.random() < dt * 80) this._drop(BOWL.x + (Math.random() - 0.5) * 1.7, 10.5 + Math.random() * 1.5, BOWL.z + 0.1 + (Math.random() - 0.5) * 1.5, this.t + 0.5 + Math.random() * 0.15);
    // her in her window while the scene has her there: she rides the box
    if (D.inBox && b.scene) this._ride(dt);
    // the spoon: in the air, or in YOU's right hand (it runs on from her forearm)
    if (D.spoon === 'fly' && D.fly) {
      const F = D.fly; F.age += dt; const k = Math.min(1, F.age / F.dur), to = F.to();
      sp.position.lerpVectors(F.from, to, k); sp.position.y += F.peak * 4 * k * (1 - k);
      sp.rotation.set(F.age * F.spin, 0.4, F.age * F.spin * 0.6);
      if (k >= 1) { D.fly = null; F.then && F.then(); }
    } else if (D.spoon === 'you') {
      const h = pl.rig.bones.hand_r, e = pl.rig.bones.lowerarm_r;
      if (h && e) { h.updateWorldMatrix(true, false); h.getWorldPosition(_a); e.getWorldPosition(_b); _d.copy(_a).sub(_b).normalize(); sp.position.copy(_a).addScaledVector(_d, 0.1); sp.quaternion.setFromUnitVectors(_Y, _d); }
    }
  },
};

// ------------------------------------------------------------------------------------------------ what the scene does
const handOf = (o, v = new THREE.Vector3()) => { const h = o.rig.bones.hand_r; if (h) { h.updateWorldMatrix(true, false); h.getWorldPosition(v); } else v.set(o.x, 1.4, o.z); return v; };
// YOU on a mark (only if she isn't there already), on the floor
function mark(X, [x, z], sec = 0.25) {
  const p = X.you;
  if (Math.hypot(p.x - x, p.z - z) > 0.4) X.go('you', x, z, sec, { ease: 'out' });
  if (p.y > 0.01) X.lift('you', 0, sec, 'in');
}
// the cellophane goes
function paneBurst(X) {
  const S = set(X), D = S.dth; if (!D.pane) return;
  D.pane = false; S.cello.visible = false;
  const y = BOX.base + BOX.win.wy + 1.5, z = BOX.z + BOX.d / 2 + 0.1;
  X.fx.glitter(BOX.x, y, z, FILM, 60, 1.3); X.fx.chips(BOX.x, y, z, FILM, 34, 0);
  S.sound.play('cello', BOX.x, { rate: 0.7, gain: 1.6 }); S.sound.play('cello', BOX.x, { rate: 1.3, gain: 1.2 });
}
// she's in her window, the scene's (she rides the box as it rocks)
function inBox(X) {
  const S = set(X), D = S.dth, b = X.her;
  X.place('her', INBOX.x, INBOX.z, 0); b.rig.body.pitch = 0; b._sceneY = 0;
  D.where = 'box'; D.inBox = true;
  S.rat.x = S.rat.y = S.rat.r = 0;
}
// she isn't in it yet (her bar emptied with the lights about to go): she cuts to it, as she has at every dark
function needBox(X) {
  const S = set(X), D = S.dth, b = X.her;
  if (D.where !== 'floor') return;
  S.sound.play('splice', b.x); X.fx.glitter(b.x, 1.6, b.z, MILK, 14, 0.8);
  inBox(X); S.prize.show('mini', false);
  X.clip('her', 'Idle_No_Loop', { loop: true, fade: 0.05 }); setExpr(S.prize.fig, 'smug', 0.03);
}
function bowlUp(X) {
  const S = set(X), D = S.dth; if (D.bowlT) return;
  D.bowlT = 1; S.sound.play('thok', BOWL.x, { rate: 0.6, gain: 1.2 }); S.sound.play('servo', BOWL.x, { rate: 2.2, gain: 1.0 });
  X.f.setPieces && X.f.setPieces.slam && X.f.setPieces.slam(BOWL.x, BOWL.z, BOWL.r + 0.5);     // (an ornament standing there goes over)
}
// the spoon through the air to somewhere, then what happens
function fly(X, from, to, dur, then, peak = 0.5) {
  const S = set(X), D = S.dth;
  S.prize.show('spoon', false); S.dSpoon.visible = true; S.dSpoon.position.copy(from);
  D.spoon = 'fly'; D.fly = { age: 0, dur: Math.max(0.05, dur), from: from.clone(), to, peak, spin: 19, then };
}
function give(X) {
  const S = set(X), D = S.dth;
  D.spoon = 'you'; D.fly = null; S.dSpoon.visible = true; S.prize.show('spoon', false);
  for (const r of X.you.rings || []) if (r.side === 'R' && r.holder) r.holder.visible = false;
}
function needSpoon(X, sec = 0.25) {
  const S = set(X), D = S.dth; if (D.spoon === 'you') return;
  const from = D.spoon === 'fly' ? S.dSpoon.position.clone() : handOf(X.her);
  fly(X, from, () => handOf(X.you, _a), sec, () => { give(X); S.sound.play('tink', X.you.x, { gain: 0.7 }); }, 0.4);
}
// milk, and what was floating in it
function splash(X, k = 1) {
  const S = set(X), f = X.f, y = BOWL.milk + 0.15;
  f.fx.emit(Math.round(44 * k), { x: BOWL.x, y, z: BOWL.z, color: MILK, shape: 2, speed: 6.5 * Math.sqrt(k), life: 0.85, size: 0.1, gravity: 16, up: 1.25, upVar: 0.9, jitter: 1.3, drag: 0.5 });
  for (let i = 0; i < 4; i++) f.fx.chips(BOWL.x, y + 0.2, BOWL.z, new THREE.Color(LOOPS[(i * 2) % 6]).multiplyScalar(2.2), Math.round(5 * k));
  f.fx.glitter(BOWL.x, y + 0.5, BOWL.z, MILK, Math.round(20 * k), 1.4); f.fx.ring && f.fx.ring(BOWL.x, BOWL.z, MILK, 2.6);
  S.sound.play('splash', BOWL.x, { gain: 0.9 + 0.3 * k }); S.sound.play('crunchSmall', BOWL.x, { gain: 1.0 });
  X.shake(0.6 * k, 0.2);
}
// the box comes over and pours; she goes out of her window with it and is in the bowl `dur` seconds from now
function topple(X, dur) {
  const S = set(X), D = S.dth, b = X.her;
  if (D.where === 'pour' || D.where === 'bowl') return;
  needBox(X); paneBurst(X); bowlUp(X);
  D.where = 'pour'; D.pour = true; S.tipT = 22; S.tipRate = 8;
  S.sound.play('pour', BOX.x, { gain: 1.3 }); S.sound.play('cardboard', BOX.x, { rate: 0.5, gain: 1.3 }); X.shake(0.8, 0.3);
  S.lightAim = new THREE.Vector3(BOWL.x, 0.9, BOWL.z);
  const out = Math.min(0.26, dur * 0.3), fl = Math.max(0.28, dur - out);
  X.clip('her', 'Jump_Loop', { loop: true, fade: 0.08 }); setExpr(S.prize.fig, 'ow', 0.03);
  X.after(out, () => {
    // out of the window, from where the box has her
    const r = b.root.position; D.inBox = false; b.x = r.x; b.z = r.z; b._sceneY = r.y; b.root.rotation.x = b.root.rotation.z = 0; b.shX = b.shZ = 0;
    X.go('her', BOWL.x, BOWL.hz, fl, { ease: 'linear', arc: 0.5, y: BOWL.sit }); X.body('her', { pitch: Math.PI * 2 }, fl, 'linear');
    // (the spoon, if she still has it, goes up out of her hand and comes down standing in the bowl)
    if (D.spoon === 'her') fly(X, handOf(b), () => _a.set(BOWL.x + 0.5, BOWL.milk + 1.1, BOWL.z - 0.2), fl + 0.15, () => { S.dSpoon.rotation.set(Math.PI - 0.3, 0, 0.25); }, 1.6);
    X.after(fl, () => {
      D.where = 'bowl'; b.rig.body.pitch = 0; X.place('her', BOWL.x, BOWL.hz, 0); X.lift('her', BOWL.sit, 0.01);
      X.clip('her', 'LayToIdle', { dur: 0.5, from: 0.28, to: 0.62, fade: 0.05 });
      splash(X, 1);
    });
  });
}
// one whack on the box
function whack(X, i, ok) {
  const S = set(X), D = S.dth, f = X.f, p = X.you, k = [1.0, 1.15, 1.3, 1.7][i] * (ok ? 1 : 0.6);
  const x = p.x + 0.55, y = 1.55, z = BOX.z + BOX.d / 2 + 0.06;
  X.slash(['wide', 'back', 'twirl', 'slam'][i], { gold: ok });
  f.fx.sparks(x, y, z, ok ? GOLD : COPPER, Math.round(16 * k), 0); f.fx.impact && f.fx.impact(x, y, z, Math.PI, { gold: ok, power: 0.8 + 0.6 * k });
  p.rig.hitStop(0.045 * k); X.shake(0.35 * k, 0.14);
  f.sfx.hit && f.sfx.hit({ heavy: i === 3, onBeat: ok, pan: 0, tier: i === 3 ? 4 : ok ? 2 : 1 });
  if (D.spoon === 'you') S.sound.play('tink', BOX.x, { rate: 0.85 + 0.07 * i, gain: 0.8 });
  paneBurst(X);
  S._boxHit({ kind: 'strike', heavy: i >= 2, finisher: i === 3, onBeat: ok, x: p.x });
  S.rock.va -= 55 * k;                               // (harder than a blow in the fight: this is the shaking)
}

// ------------------------------------------------------------------------------------------------ the scene
export const death = {
  beats: 23,
  enter(X) {
    const S = set(X), D = S.dth, b = X.her, f = X.f;
    S.deathReset(); D.on = true;
    if (b.boxed) {                                   // (the commercial has cut out: she's in her box already)
      S._box(f, false, f.t); D.where = 'box'; D.inBox = true; b.x = INBOX.x; b.z = INBOX.z;
      X.clip('her', 'Idle_No_Loop', { loop: true, fade: 0.1 }); X.cam(CAM.shake);
    } else if (f.t < T[0] - 0.25) {
      // on her mark for the product shot, selling to the lens with the little box of herself
      X.go('her', ...M.her0, X.beat * 1.2, { ease: 'out' }); X.face('her', 0.8, 9);
      X.clip('her', 'Spell_Simple_Enter', { dur: 0.4 }); X.after(0.4, () => { if (D.where === 'floor') X.clip('her', 'Spell_Simple_Idle_Loop', { loop: true, fade: 0.1 }); });
      S.prize.show('mini', true); S.prize.show('spoon', true); setExpr(S.prize.fig, 'wink', 0.05);
      X.go('you', ...M.you0, X.beat * 2.2, { ease: 'out' }); X.face('you', ...M.her0); X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.1 });
      X.after(X.beat * 2.2, () => { X.face('you', ...M.her0); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
      X.cam(CAM.open);
    } else { needBox(X); X.cam(CAM.window); }
    // (the lights go at 282.92 whoever pressed what: if she's still out on the floor then, she cuts to her box)
    X.at(T[0] + 0.2, () => needBox(X));
  },
  steps: [
    // the lunge: back in the box she goes, through the cellophane, as the commercial cuts out
    { t: T[0], key: 'strike',
      lead(X, s) {
        const D = set(X).dth; if (D.where !== 'floor') return;
        X.place('her', ...M.her0); X.place('you', ...M.you0); X.face('you', ...M.her0);
        X.go('you', M.her0[0] - 0.3, M.her0[1] + 1.75, Math.max(0.1, s.t - X.t), { ease: 'in' }); X.strike('stinger', s.t);
      },
      do(X, ok) {
        const S = set(X), D = S.dth; if (D.where !== 'floor') return;
        X.slash('stinger', { gold: ok }); X.hit({ power: ok ? 1.7 : 0.9, gold: ok });
        D.where = 'air'; S.prize.show('mini', false); setExpr(S.prize.fig, 'ow', 0.02);
        X.clip('her', 'Hit_Knockback', { dur: 0.5, to: 0.45 }); X.body('her', { pitch: -0.9 }, 0.28, 'out');
        X.go('her', INBOX.x, INBOX.z + 0.6, 0.3, { ease: 'linear', arc: 0.7, y: INBOX.y + 0.2 });
        X.cam(CAM.window, { blend: 0.3 });
        X.after(0.3, () => {
          paneBurst(X); inBox(X); S.rock.va -= 150; S.rat.vy = 3; S.rat.vr = 7; X.shake(0.7, 0.2);
          S.sound.play('cardboard', BOX.x, { rate: 0.6, gain: 1.4 }); S.sound.play('rattle', BOX.x, { gain: 0.9 });
          X.clip('her', 'Hit_Chest', { dur: 0.3, fade: 0.04 }); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.2 });
        });
      } },
    // her spoon, hurled from the window: caught, it's yours
    { t: T[1], key: 'parry',
      lead(X, s) {
        const S = set(X); needBox(X); mark(X, M.you1); X.face('you', INBOX.x, INBOX.z);
        X.clip('her', 'OverhandThrow', { dur: 0.6, from: 0.05, to: 0.95, fade: 0.05 }); setExpr(S.prize.fig, 'ow', 0.05);
        X.cam(CAM.catch, { blend: 0.3 });
        X.at(s.t - 0.32, () => { if (S.dth.spoon !== 'her') return; paneBurst(X); S.sound.play('servo', BOX.x, { rate: 2.4, gain: 1.2 }); fly(X, handOf(X.her), () => _a.set(X.you.x + 0.2, X.you.y + 1.95, X.you.z - 0.25), Math.max(0.08, s.t - X.t), null, 0.35); });
      },
      do(X, ok) {
        const S = set(X), D = S.dth, p = X.you;
        if (D.spoon === 'you') return;
        if (ok) {
          give(X); X.clip('you', 'Sword_Block', { dur: 0.12, from: 0.08, to: 0.3 }); p.rig.hitStop(0.1);
          X.fx.caught(p.x, p.y + 1.7, p.z, true); X.sfx.catch && X.sfx.catch('perfect', 0); S.sound.play('tink', p.x, { gain: 1.0 }); X.expr('A_Amused');
        } else {
          // off her head and up; she has it on its way down
          X.clip('you', 'Hit_Head', { dur: 0.3 }); X.fx.sparks(p.x, 1.7, p.z, COPPER, 10); S.sound.play('clack', p.x, { gain: 1.2 });
          fly(X, _b.set(p.x, 1.8, p.z).clone(), () => handOf(p, _a), 0.36, () => { give(X); S.sound.play('tink', p.x, { gain: 0.7 }); }, 0.9);
        }
        X.clip('her', 'Idle_No_Loop', { loop: true, fade: 0.2 });
        // and up to the box with it
        X.after(0.5, () => { X.face('you', ...M.you2); X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.1 }); X.go('you', ...M.you2, 0.8, { ease: 'inOut' }); X.cam(CAM.shake, { blend: 0.7 }); });
        X.after(1.3, () => { X.face('you', -0.6, BOX.z); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); });
      } },
    // shaken: four whacks on the four stabs
    { t: T[2], key: 'strike',
      lead(X, s) { needBox(X); mark(X, M.you2, 0.2); X.face('you', -0.6, BOX.z); X.strike('wide', s.t); X.cam(CAM.shake, { blend: 0.3 }); },
      do(X, ok) {
        const S = set(X), t0 = X.t, moves = ['back', 'twirl', 'slam'];
        whack(X, 0, ok);
        [0.18, 0.36, 0.54].forEach((d, i) => { X.at(t0 + d - 0.15, () => X.strike(moves[i], t0 + d)); X.at(t0 + d, () => whack(X, i + 1, true)); });
        // it hangs, and starts to come over; a bowl comes up out of the table under it
        X.at(t0 + 0.72, () => { bowlUp(X); S.tipT = 7; S.tipRate = 2.4; S.sound.play('creak', BOX.x, { gain: 1.4 }); X.cam(CAM.wide, { blend: 0.4 }); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
      } },
    // the pour: out through it
    { t: T[3], key: 'dash',
      lead(X) { needBox(X); bowlUp(X); mark(X, M.you2, 0.2); X.cam(CAM.wide, { blend: 0.35 }); },
      do(X, ok) {
        const f = X.f, p = X.you;
        topple(X, Math.max(0.5, SPLASH - X.t));
        // the cereal coming down where she stood
        for (let i = 0; i < 26; i++) set(X)._drop(p.x + (Math.random() - 0.5) * 3, 7 + Math.random() * 4, p.z + 0.3 + Math.random() * 2.6, f.t + 0.25 + Math.random() * 0.3);
        X.face('you', ...M.you3);
        if (ok) {
          X.clip('you', 'Sword_Dash', { dur: 0.3, from: 0.1, to: 0.5 }); X.go('you', ...M.you3, 0.2, { ease: 'out' });
          f.fx.dashStart && f.fx.dashStart(p); X.after(0.2, () => f.fx.dashEnd && f.fx.dashEnd(p)); f.sfx.dash && f.sfx.dash(p);
        } else {
          X.clip('you', 'Hit_Chest', { dur: 0.35 }); f.fx.chips(p.x, 1.4, p.z, new THREE.Color(2.6, 1.6, 0.6), 16); set(X).sound.play('crunch', p.x);
          X.go('you', ...M.you3, 0.55, { ease: 'inOut' });
        }
        X.after(ok ? 0.32 : 0.6, () => { X.face('you', BOWL.x, BOWL.z); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
      } },
    // up onto the rim
    { t: T[4], key: 'jump',
      lead(X, s) { topple(X, Math.max(0.3, s.t - X.t - 0.1)); mark(X, M.you3, 0.2); X.face('you', BOWL.x, BOWL.z); X.cam(CAM.bowl, { blend: 0.35 }); },
      do(X, ok) {
        const S = set(X), b = X.her, end = X.f.lastHit, up = ok ? 0.28 : 0.42;
        needSpoon(X, up);
        X.clip('you', 'NinjaJump_Start', { dur: up + 0.05, from: 0.12, to: 0.6 }); X.fx.dust(X.you.x, X.you.z, 6); X.sfx.jump && X.sfx.jump(X.you);
        X.go('you', ...M.rim, up, { ease: 'out', arc: ok ? 0.75 : 0.25, y: BOWL.rim });
        X.after(up + 0.03, () => { X.face('you', BOWL.x, BOWL.z); X.strike('slam', end); });
        // she holds up the little box of herself, one last time
        X.at(289.0, () => { if (S.dth.where !== 'bowl') return; S.prize.show('mini', true); setExpr(S.prize.fig, 'wink', 0.05); b.rig.upperHold && b.rig.upperHold('Spell_Simple_Idle_Loop', { duration: 0.16, from: 0, to: 0.3, fade: 0.05 }); });
        X.at(289.18, () => X.lift('you', BOWL.rim + 0.7, 0.2, 'out'));
      } },
    // the spoon comes down
    { last: true, key: 'strike',
      lead(X, s) {
        const S = set(X), D = S.dth, p = X.you;
        if (D.where === 'bowl' || D.where === 'pour') {
          if (Math.hypot(p.x - M.rim[0], p.z - M.rim[1]) > 0.5) { X.place('you', ...M.rim); X.lift('you', BOWL.rim, 0.05); X.face('you', BOWL.x, BOWL.z); needSpoon(X, 0.15); X.strike('slam', s.t); }
          X.cam(CAM.bowl, { blend: 0.3 });
        } else {
          // (her bar went in the song's last moments: she's in her box, and that's where she ends)
          needBox(X); mark(X, M.you2, 0.15); X.face('you', -0.6, BOX.z); X.strike('slam', s.t); X.cam(CAM.shake, { blend: 0.2 });
        }
      },
      do(X, ok) {
        const S = set(X), D = S.dth, b = X.her;
        X.slash('slam', { gold: ok });
        if (D.where === 'bowl') {
          X.lift('you', BOWL.rim, 0.04, 'in');
          X.hit({ power: 2.3, gold: ok, at: { x: b.x, y: 1.5, z: b.z } }); splash(X, 1.7); S.sound.play('tink', BOWL.x, { rate: 0.7, gain: 1.4 });
          X.shatter({ dir: new THREE.Vector3(0.1, -1, 0.3), power: ok ? 1.6 : 1.1, at: new THREE.Vector3(b.x, BOWL.sit + 1.5, b.z) });
        } else {
          const r = b.root.position;
          paneBurst(X); X.hit({ power: 2.2, gold: ok, at: { x: r.x, y: r.y + 1.3 - (b._sceneY || 0), z: r.z + 0.4 } });
          X.shatter({ dir: new THREE.Vector3(0, 0.2, -1), power: ok ? 1.5 : 1.0 });
        }
      } },
  ],
  after(X) {
    const S = set(X), D = S.dth, p = X.you;
    const rings = () => { for (const r of p.rings || []) if (r.holder) r.holder.visible = true; };
    X.expr('A_Amused');
    if (D.where === 'bowl') {
      X.cam(CAM.after, { blend: 0.6 });
      X.lift('you', BOWL.rim, 0.06, 'in'); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.25 });
      // the spoon stays, standing in the bowl; and down off the rim before the scene lets go of her
      X.after(0.7, () => { D.spoon = 'bowl'; S.dSpoon.position.set(BOWL.x - 0.55, BOWL.milk + 1.1, BOWL.z + 0.3); S.dSpoon.rotation.set(Math.PI - 0.25, 0, -0.3); rings(); S.sound.play('tink', BOWL.x, { rate: 1.2, gain: 0.6 }); X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.25 }); });
      X.after(1.75, () => { X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }); X.go('you', ...M.you3, 0.34, { arc: 0.3, y: 0, ease: 'inOut' }); });
      X.after(2.1, () => { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); });
    } else { X.lift('you', 0, 0.1); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.25 }); if (D.spoon === 'you') { D.spoon = 'gone'; S.dSpoon.visible = false; } rings(); }
  },
  hold: 2.3,
};
