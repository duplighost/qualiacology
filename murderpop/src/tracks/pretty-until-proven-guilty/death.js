// THE DEFENDANT's end: THE VERDICT. The court's one rule, on her: "knock her evidence onto the bench, and when the
// gavel falls, she's yours." The last exhibit is the defendant. Her switchblade lunge is turned ("Case"), YOU goes
// through her ("closed!") and knocks her up onto the brass sound block like any other piece of evidence ("Case
// closed"). Up there she fixes her lipstick for the cameras while Lady Justice's arm rises behind her ("Lipstick
// stays on"). YOU takes the bench. She flips YOU her gold gavel for a keepsake ("You're welcome") and takes her bow;
// YOU brings the little gavel down, the big one comes down with it, on the song's last hit, on her. Her lips land
// on the block, untouched.
// (src/game/execution.js runs it: each step's `lead` puts the two of them on their marks as its ring starts to close,
// so the scene works from any step if her bar empties late; `do` is the beat itself. track.js calls endUpdate every
// frame for what the Stage has no tween for, and endScene puts everything back.)
import * as THREE from 'three';
import { MOVES } from '../../game/player.js';
import { exhibitMesh } from './court.js';
import { face } from './figure.js';

const GOLD = new THREE.Color(3.2, 2.0, 0.55), STEEL = new THREE.Color(2.6, 2.8, 3.4), ROSE = new THREE.Color(3.0, 1.0, 1.9), LIP = new THREE.Color(3.4, 0.3, 0.4);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const TOP = 1.6;                                          // the bench's top
const BLK = { x: -2.4, z: -7.3, y: 1.64 };                // the brass sound block on it: where the gavel comes down
// marks on the floor before the bench (x, z); youT is up on the bench beside the block
const M = { her0: [-2.4, -4.9], you0: [-0.1, -4.9], youB: [-4.7, -4.9], herF: [-2.4, -6.35], youF: [-3.7, -5.5], youT: [-4.1, -7.5], youEnd: [-3.9, -5.3], knife: [-1.2, -5.85] };
// the song's own moments: "Case" / "closed!" / "Case" (and she lands on "closed") / the bar after "on" / "You're" / "welcome"
const AT = { parry: 158.378, dash: 159.334, launch: 160.297, land: 160.689, jump: 163.021, toss: 163.93, catch: 164.573 };
// Lady Justice's arm (0: the gavel's head on the block, 1: straight up): held over her, raised with YOU's, at her head
const ARM = { rest: 0.04, hold: 0.27, high: 0.43, contact: 0.2 };

// ------------------------------------------------------------------------------------------------ the props
// her gold gavel, hand-sized: the grip at the origin, the head up the handle
function makeGavel() {
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc44a, metalness: 1, roughness: 0.18, emissive: new THREE.Color(0x804000), emissiveIntensity: 0.6 });
  const g = new THREE.Group(); g.name = 'ppg:gavel';
  const add = (geo, x, y, rz = 0, ry = 0) => { const m = new THREE.Mesh(geo, gold); m.position.set(x, y, 0); m.rotation.set(0, ry, rz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.014, 0.02, 0.34, 10), 0, 0.1);
  add(new THREE.CylinderGeometry(0.058, 0.058, 0.2, 18), 0, 0.29, Math.PI / 2);
  for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.058, 0.01, 6, 18), s * 0.075, 0.29, 0, Math.PI / 2);
  return g;
}
// made with the set (so nothing compiles in the song's last bars), hidden until the scene wants them
export function buildEnd(f) {
  const knife = exhibitMesh('knife'); knife.name = 'ppg:end-knife'; knife.scale.setScalar(1.3);
  const gavel = makeGavel();
  for (const o of [knife, gavel]) { o.visible = false; f.scene.add(o); }
  return { knife, gavel };
}

// ------------------------------------------------------------------------------------------------ the scene's own state
// everything back as it was: after the scene, on a rewind, when the fight is put away (YOU goes on to the next song)
export function endScene(f) {
  const S = f.ppg; if (!S) return;
  const E = S.end, K = S.endKit;
  if (S.justice) S.justice.pose = null;
  if (K) for (const o of [K.knife, K.gavel]) { if (o.parent !== f.scene) f.scene.add(o); o.visible = false; o.position.set(0, -20, 0); o.rotation.set(0, 0, 0); o.scale.setScalar(o === K.knife ? 1.3 : 1); }
  for (const r of f.player.rings || []) if (r.holder) r.holder.visible = true;
  if (E && E.trail) E.trail.live = false;
  if (f.boss && f.boss.rig) f.boss.rig.lean.set(0, 0);
  S.end = null;
}
export function disposeEnd(f) { endScene(f); const K = f.ppg && f.ppg.endKit; if (K) for (const o of Object.values(K)) if (o.parent) o.parent.remove(o); }

// where Lady Justice's arm is: over her from the moment she lands on the block, trembling; higher as YOU raises the
// little one; down to her head on the last hit, and through her to the block the moment the press lands
function arm(E) {
  const T = E.X.t, L = E.f.lastHit;
  if (E.hitT != null) {
    const a = T - E.hitT;
    if (a < 0.05) return ARM.contact * (1 - a / 0.05);
    if (a < 0.2) return 0.03 * Math.sin((a - 0.05) / 0.15 * Math.PI);
    return 0.1 * smooth(0.45, 1.1, a);                 // off the block again, slowly: what's left of her is on it
  }
  let k = ARM.rest + (ARM.hold - ARM.rest) * smooth(AT.land + 0.25, AT.land + 1.3, T);
  k += (ARM.high - ARM.hold) * smooth(E.raiseT, E.raiseT + 0.42, T);
  k += 0.008 * Math.sin(T * 47) * smooth(AT.land + 1.1, AT.land + 1.4, T);
  const d = clamp((T - (L - 0.1)) / 0.1, 0, 1);
  return k + (ARM.contact - k) * d * d;
}

// a thing through the air from a to b (Vector3s, or functions that give one), up `arc` at the middle, turning
function fly(E, obj, from, to, t0, t1, { arc = 0.5, spin = [0, 0, 0], then, scale } = {}) {
  E.fly = E.fly.filter((q) => q.obj !== obj);
  if (obj.parent !== E.f.scene) E.f.scene.add(obj);
  obj.visible = true;
  E.fly.push({ obj, from, to, t0, t1, arc, spin, then, scale });
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const bonePos = (o, name, fallback) => { const b = o.rig.bones[name]; return b ? b.getWorldPosition(new THREE.Vector3()) : fallback; };
const herHand = (X) => bonePos(X.her, 'hand_r', V(X.her.x, 1.4 + (X.her._sceneY || 0), X.her.z));
const youHand = (X) => bonePos(X.you, 'hand_r', V(X.you.x, 1.1 + X.you.y, X.you.z));

// the little gavel in YOU's right hand (the ring that was in it is put away)
function giveGavel(E) {
  const X = E.X, K = E.f.ppg.endKit, g = K.gavel, hand = X.you.rig.bones.hand_r;
  E.fly = E.fly.filter((q) => q.obj !== g);
  if (!hand || g.parent === hand) return;
  for (const r of X.you.rings) if (r.side === 'R' && r.holder) r.holder.visible = false;
  // upright in her fist, in the world, then carried by the hand
  if (g.parent !== E.f.scene) E.f.scene.add(g);
  g.visible = true; g.scale.setScalar(1); g.position.copy(youHand(X)); g.rotation.set(0, X.you.facing, 0);
  hand.attach(g);
  E.held = true;
}

// put one of them on a mark. Already near it (the scene has been running): finish the step there. Far from it (the
// scene has just begun at this step): straight onto it.
function put(X, w, [x, z], y = 0, sec = 0.16) {
  const o = X.who(w), d = Math.hypot(o.x - x, o.z - z), y0 = X._y(o);
  if (d > 3.2 || Math.abs(y0 - y) > 0.4) { X.place(w, x, z); X._drop(o, 'y'); X._setY(o, y); o._sync(); }
  else if (d > 0.03) X.go(w, x, z, sec, { ease: 'out' });
}
// a timer that only fires while the scene is still at the step that set it (or up to `through`)
function later(E, sec, fn, through = E.step) { const X = E.X; X.after(sec, () => { if (E.f.ppg.end === E && E.step <= through) fn(); }); }
function when(E, t, fn, through = E.step) { const X = E.X; X.at(t, () => { if (E.f.ppg.end === E && E.step <= through) fn(); }); }
// she turns to face a way (radians) over a moment, not in one frame
function turn(E, w, to, sec = 0.18) {
  const o = E.X.who(w), from = o.facing, d = Math.atan2(Math.sin(to - from), Math.cos(to - from)), n = Math.max(1, Math.round(sec * 60));
  for (let i = 1; i <= n; i++) E.X.after(sec * i / n, () => { if (E.f.ppg.end === E) o.facing = from + d * (i / n); });
}
const snd = (E, name, x, o = {}) => { const S = E.f.ppg; S.snd && S.snd.play(name, { pan: E.f.pan(x), ...o }); };
// she's standing on the block, facing the house
function onBlock(E) { const X = E.X; put(X, 'her', [BLK.x, BLK.z], BLK.y); X.body('her', { pitch: 0, spin: 0, roll: 0, y: 0 }, 0.05); }

// every frame (track.js): what flies, the light trail behind her, where the two of them look
export function endUpdate(f, dt) {
  const E = f.ppg.end; if (!E) return;
  const X = E.X, T = X.t, b = X.her;
  for (let i = E.fly.length - 1; i >= 0; i--) {
    const q = E.fly[i], k = clamp((T - q.t0) / Math.max(0.01, q.t1 - q.t0), 0, 1);
    const a = typeof q.from === 'function' ? q.from() : q.from, c = typeof q.to === 'function' ? q.to() : q.to;
    q.obj.position.lerpVectors(a, c, k); q.obj.position.y += q.arc * 4 * k * (1 - k);
    q.obj.rotation.set(q.spin[0] * (T - q.t0), q.spin[1] * (T - q.t0), q.spin[2] * (T - q.t0));
    if (q.scale) q.obj.scale.setScalar(q.scale[0] + (q.scale[1] - q.scale[0]) * k);
    if (k >= 1) { E.fly.splice(i, 1); q.then && q.then(); }
  }
  if (E.trail) E.trailAt.set(b.x, 1.2 + (b._sceneY || 0), b.z);
  if (E.knifeAt != null) { const K = f.ppg.endKit.knife, a = T - E.knifeAt; K.rotation.z = Math.sin(a * 55) * 0.16 * Math.max(0, 1 - a / 1.1); }
  // her eyes: on YOU, or out on the house (her head turns a little to it)
  if (b.rig) b.rig.lookTarget = E.look === 'you' ? V(X.you.x, 1.5 + X.you.y, X.you.z) : E.look === 'house' ? V(b.x * 0.4, 2.2, 9) : null;
}

// ------------------------------------------------------------------------------------------------ the scene
export const death = {
  beats: 24,
  enter(X) {
    const f = X.f, S = f.ppg, b = X.her, p = X.you;
    endScene(f);
    const E = S.end = { X, f, fly: [], step: 0, hitT: null, raiseT: AT.catch + 0.34, look: 'you', trailAt: new THREE.Vector3(), held: false, knifeAt: null };
    S.justice.pose = () => arm(E);
    f.court.adjourn && f.court.adjourn();
    b.root.position.y = 0;
    for (const k of ['knife', 'lipstick', 'compact', 'key', 'cuff', 'zippo', 'gas', 'jacket', 'bubble']) b.show(k, false);
    // the room's ornaments, off the marks
    for (const o of (f.setPieces && f.setPieces.list) || []) {
      if (o.state !== 'rest') continue;
      for (const m of [M.her0, M.you0, M.youB, M.herF, M.youF, M.youEnd, M.knife]) { const dx = o.x - m[0], dz = o.z - m[1], d = Math.hypot(dx, dz); if (d < 1.5) { const a = d > 0.05 ? Math.atan2(dx, dz) : 1; o.vx = Math.sin(a) * 7; o.vz = Math.abs(Math.cos(a)) * 7; o.spin = 9; break; } }
    }
    // her keepsake, if it's still on the floor: it waits for the last hit now (it comes to YOU then, as it always does)
    if (f.ks && f.ks.state === 'wait') f.ks.t = -60;
    // onto their marks before the bench: she backs up under the block, YOU comes in stage right of her
    X.go('her', ...M.her0, X.beat * 2, { ease: 'out' }); X.go('you', ...M.you0, X.beat * 2, { ease: 'out' });
    X.face('her', ...M.you0); X.face('you', ...M.her0);
    X.clip('her', 'Walk_Formal_Loop', { loop: true, speed: 1.5 }); X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.1 });
    face(b.fig, 'grin', 0.2);
    later(E, X.beat * 2, () => { X.faceEach(); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); X.clip('her', 'Idle_Loop', { loop: true, fade: 0.15 }); });
    X.follow('two', { dist: 6.0, h: 1.35 }); X.expr('A_Focus');
  },
  steps: [
    // "Case": her switchblade, one last time. Turned: it's out of her hand and standing in the marble
    { t: AT.parry, key: 'parry',
      lead(X, s) {
        const E = X.f.ppg.end, b = X.her; E.step = 1; E.look = 'you';
        put(X, 'her', M.her0); put(X, 'you', M.you0); X.face('her', ...M.you0); X.face('you', ...M.her0);
        b.show('knife', true); b.props.knife.userData.open(1); snd(E, 'flick', b.x, { gain: 0.6 }); X.fx.sparks(b.x + 0.4, 1.5, b.z, STEEL, 6);
        face(b.fig, 'grin', 0.1);
        X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 });
        // the lunge: wound up over the ring, across the gap as it closes
        X.clip('her', 'Sword_Dash', { dur: s.t - X.t + 0.12, from: 0.05, to: 0.6, fade: 0.1 });
        when(E, s.t - 0.13, () => X.go('her', M.you0[0] - 1.2, M.you0[1], 0.13, { ease: 'in' }));
        X.follow('two', { dist: 5.4, h: 1.3 });
      },
      do(X, ok) {
        const E = X.f.ppg.end, f = X.f, p = X.you, b = X.her, K = f.ppg.endKit;
        const cx = p.x - 0.55;
        b.show('knife', false);
        if (ok) {
          X.clip('you', 'Sword_Block', { dur: 0.1, from: 0.08, to: 0.3, fade: 0.03 });
          X.fx.caught(cx, 1.35, p.z, true); X.sfx.parry && X.sfx.parry('perfect', f.pan(cx)); X.fx.sparks(cx, 1.35, p.z, STEEL, 22, -Math.PI / 2);
          p.rig.hitStop(0.09); b.rig.hitStop(0.09); X.shake(0.5, 0.14); f.cam.kick(1.2);
          X.clip('her', 'Hit_Head', { dur: 0.42, fade: 0.04 }); face(b.fig, 'scandalized', 0.05);
          X.fx.ring && X.fx.ring(p.x, p.z, GOLD, 1.8);
          later(E, 0.3, () => X.expr('A_Amused'));
        } else {
          X.fx.sparks(cx, 1.35, p.z, STEEL, 10); X.clip('you', 'Hit_Chest', { dur: 0.3 }); p.rig.hitStop(0.05);
          X.clip('her', 'Sword_Regular_A', { dur: 0.3, from: 0.4, to: 0.9, fade: 0.05 });
        }
        // the knife: up out of her hand, turning, and down point first between them
        fly(E, K.knife, V(cx - 0.3, 1.5, p.z), V(M.knife[0], 0, M.knife[1]), X.t, X.t + 0.36, { arc: ok ? 1.5 : 0.7, spin: [0, 0, 26],
          then: () => { K.knife.rotation.set(0, 0.6, 0); E.knifeAt = X.t; snd(E, 'stick', M.knife[0], { gain: 0.55, rate: 1.6 }); X.fx.sparks(M.knife[0], 0.1, M.knife[1], STEEL, 8); } });
        X.go('her', ...M.her0, 0.16, { ease: 'out' });
      } },
    // "closed!": through her. Her pearls go; she ends against the foot of her own bench
    { t: AT.dash, key: 'dash',
      lead(X, s) {
        const E = X.f.ppg.end, b = X.her; E.step = 2; E.look = 'you';
        put(X, 'her', M.her0); put(X, 'you', M.you0); X.faceEach(); b.show('knife', false);
        X.clip('you', 'Sword_Dash', { dur: s.t - X.t, from: 0.0, to: 0.3, fade: 0.08 });
        X.clip('her', 'Idle_Shield_Break', { dur: 0.6, from: 0.1, to: 0.6, fade: 0.1 });
        X.follow('two', { dist: 6.6, h: 1.3 }); X.expr('A_Focus');
        when(E, s.t - 0.05, () => { const p = X.you; X.fx.dashStart && X.fx.dashStart(p); X.sfx.dash && X.sfx.dash(p); X.go('you', ...M.youB, 0.11, { ease: 'out' }); X.clip('you', 'Sword_Dash', { dur: 0.22, from: 0.3, to: 0.5, fade: 0.03 }); });
      },
      do(X, ok) {
        const E = X.f.ppg.end, f = X.f, p = X.you, b = X.her, a = -Math.PI / 2;
        if (!X.tweens.some((w) => w.o === p && w.kind === 'xz')) X.go('you', ...M.youB, 0.08, { ease: 'out' });
        // the cut, where she stands: it shows a moment after YOU has gone by
        f.fx.slash && f.fx.slash({ x: b.x + 0.6, y: 0, z: b.z }, { def: MOVES.stinger, on: ok, sweep: 1, heavy: true, finisher: ok }, a);
        later(E, 0.07, () => {
          X.fx.dashEnd && X.fx.dashEnd(p);
          X.hit({ power: ok ? 1.5 : 0.7, gold: ok, dir: a, y: 1.5 });
          if (ok) { b.fig && b.fig.breakPiece && (b.fig.breakPiece('pearls') || b.fig.breakPiece('handcuffs')); X.fx.glitter(b.x, 1.7, b.z, GOLD, 26, 0.9); }
          face(b.fig, 'hurt', 0.05);
          // she turns on her heel with it and goes back onto the foot of the bench
          X.clip('her', 'Hit_Knockback', { dur: 0.5, from: 0.0, to: 0.16, fade: 0.05 });
          X.body('her', { spin: (b.rig.body.spin || 0) + (ok ? Math.PI * 4 : Math.PI * 2) }, 0.46, 'out');
          X.go('her', ...M.herF, 0.4, { ease: 'out' });
          X.face('you', ...M.herF); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.2 });
        }, 3);
        later(E, 0.47, () => { X.face('her', ...M.youF); X.shake(0.5, 0.14); X.fx.dust(M.herF[0], M.herF[1] - 0.4, 10); X.sfx.slamSet && X.sfx.slamSet(f.pan(M.herF[0])); X.body('her', { spin: 0 }, 0.01); X.clip('her', 'Idle_Shield_Break', { dur: 0.5, from: 0.25, to: 0.7, fade: 0.06 }); }, 3);
      } },
    // "Case": struck like any exhibit, she goes up in gold, onto the block ("closed")
    { t: AT.launch, key: 'strike',
      lead(X, s) {
        const E = X.f.ppg.end, b = X.her; E.step = 3; E.look = 'you';
        put(X, 'her', M.herF, 0, 0.3); put(X, 'you', M.youF, 0, 0.3); X.face('you', ...M.herF);
        later(E, 0.32, () => { X.face('her', ...M.youF); X.face('you', ...M.herF); });
        X.strike('lift', s.t);
        X.follow({ pos: [-0.3, 0.95, -1.7], look: [-2.75, 1.85, -6.9] }, { fov: 40, blend: 0.3 }); X.expr('A_Exertion');
      },
      do(X, ok) {
        const E = X.f.ppg.end, f = X.f, b = X.her, S = f.ppg;
        X.slash('lift', { gold: ok }); X.hit({ power: ok ? 1.7 : 0.8, gold: ok, y: 1.3 });
        f.fx.ring && f.fx.ring(b.x, b.z, GOLD, 2.4); X.fx.dust(b.x, b.z, 10);
        snd(E, 'thwack', b.x, { gain: 0.8 }); snd(E, 'whoosh', b.x, { gain: 0.4 });
        // up she goes, the way the evidence goes: a gold trail, and down on the block on "closed"
        const dur = Math.max(0.3, AT.land - X.t);
        b.facing = 0; X.body('her', { spin: 0 }, 0.01);
        X.go('her', BLK.x, BLK.z, dur, { ease: 'linear', arc: 0.75, y: BLK.y });
        X.clip('her', 'Jump_Loop', { loop: true, fade: 0.05 });
        if (ok) X.body('her', { pitch: -Math.PI * 2 }, dur, 'linear');
        E.trailAt.set(b.x, 1.2, b.z);
        E.trail = X.fx.trail(() => E.trailAt, { w: 0.34, color: GOLD.clone(), len: 16, life: 0.26 });
        for (let i = 1; i <= 7; i++) later(E, dur * i / 8, () => X.fx.glitter(b.x, 1.2 + (b._sceneY || 0), b.z, GOLD, 3, 0.25), 4);
        later(E, dur, () => landed(E, ok), 4);
        later(E, 0.5, () => { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.2 }); X.expr('A_Amused'); }, 3);
        later(E, 1.1, () => X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.3 }), 3);
      } },
    // the bar after "Lipstick stays on": YOU takes the bench
    { t: AT.jump, key: 'jump',
      lead(X, s) {
        const E = X.f.ppg.end; E.step = 4;
        if (!E.landed) { onBlock(E); landed(E, true, true); }
        put(X, 'you', M.youF); X.face('you', ...M.youT);
        X.clip('you', 'NinjaJump_Start', { dur: s.t - X.t, from: 0.05, to: 0.45, fade: 0.12 });
        X.follow({ pos: [-1.5, 1.7, -2.3], look: [-3.1, 2.55, -7.2] }, { fov: 40, blend: 0.45 }); X.expr('A_Focus');
      },
      do(X, ok) {
        const E = X.f.ppg.end, f = X.f, p = X.you;
        X.sfx.jump && X.sfx.jump(p); X.fx.dust(p.x, p.z, 6);
        const dur = ok ? 0.36 : 0.5;
        X.go('you', ...M.youT, dur, { ease: 'linear', arc: ok ? 0.95 : 0.45, y: TOP });
        X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.06 });
        if (ok) X.body('you', { pitch: Math.PI * 2 }, dur, 'linear');
        later(E, dur, () => {
          X.body('you', { pitch: 0 }, 0.01); X.face('you', BLK.x, BLK.z);
          X.clip('you', 'NinjaJump_Land', { dur: ok ? 0.3 : 0.55, from: 0.08, to: ok ? 0.4 : 0.6, fade: 0.04 });
          X.sfx.land && X.sfx.land(p, true); X.fx.dust(p.x, p.z, 8); X.shake(0.35, 0.1); p.rig.body.squash = 0.14;
          later(E, ok ? 0.3 : 0.55, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }), 5);
        }, 5);
      } },
    // "You're welcome": she flips YOU her gold gavel, for a keepsake. Caught
    { t: AT.catch, key: 'parry',
      lead(X, s) {
        const E = X.f.ppg.end, f = X.f, b = X.her, p = X.you, K = f.ppg.endKit; E.step = 5;
        if (!E.landed) { onBlock(E); landed(E, true, true); }
        put(X, 'you', M.youT, TOP); X.face('you', BLK.x, BLK.z); X.body('you', { pitch: 0 }, 0.01);
        b.show('lipstick', false); b.show('compact', false);
        // she turns to YOU and flips it over: off her chain, growing into the hand it's meant for
        E.look = 'you'; turn(E, 'her', -Math.PI / 2, 0.16); face(b.fig, 'smug', 0.1);
        X.clip('her', 'Interact', { dur: 0.5, from: 0.1, to: 0.5, fade: 0.1 });
        when(E, Math.max(X.t + 0.02, AT.toss), () => {
          b.props.charm.visible = false;
          const from = herHand(X); snd(E, 'chime', b.x, { gain: 0.5, rate: 1.4 }); X.fx.glitter(from.x, from.y, from.z, GOLD, 10, 0.3);
          fly(E, K.gavel, from, () => youHand(X).add(V(0.12, 0.1, 0)), X.t, s.t, { arc: 0.75, spin: [0, 0, -19], scale: [0.35, 1] });
          X.clip('her', 'Idle_FoldArms_Loop', { loop: true, fade: 0.25 });
        });
        X.follow({ pos: [-3.3, 2.75, -3.0], look: [-3.25, 3.05, -7.4] }, { fov: 38, blend: 0.4 });
      },
      do(X, ok) {
        const E = X.f.ppg.end, f = X.f, p = X.you, b = X.her;
        const h = youHand(X);
        if (ok) {
          X.clip('you', 'Sword_Block', { dur: 0.1, from: 0.08, to: 0.3, fade: 0.03 });
          giveGavel(E); X.fx.caught(h.x, h.y, h.z, true); X.sfx.catch && X.sfx.catch('perfect', f.pan(h.x)); p.rig.hitStop(0.06);
          X.fx.glitter(h.x, h.y, h.z, GOLD, 14, 0.4); X.expr('A_Amused');
          E.raiseT = X.t + 0.3;
        } else {
          // it bounces off her head; she has it on the second go
          X.clip('you', 'Hit_Head', { dur: 0.34, fade: 0.03 }); X.fx.sparks(p.x, 1.7 + p.y, p.z, GOLD, 10); snd(E, 'tink', p.x, { gain: 0.6 });
          const K = f.ppg.endKit; fly(E, K.gavel, V(p.x, 1.75 + p.y, p.z), () => youHand(X), X.t, X.t + 0.34, { arc: 0.5, spin: [0, 0, 22], then: () => { giveGavel(E); snd(E, 'click', p.x, { gain: 0.5 }); } });
          E.raiseT = X.t + 0.5;
        }
        // she's done with YOU: back to the house, and her bow
        later(E, 0.22, () => { turn(E, 'her', 0, 0.2); E.look = 'house'; face(b.fig, 'delight', 0.15); }, 6);
        // up it goes, and Lady Justice's with it
        later(E, ok ? 0.3 : 0.5, () => {
          X.clip('you', 'OverhandThrow', { dur: 0.4, from: 0.06, to: 0.24, fade: 0.1 });
          snd(E, 'grind', BLK.x, { gain: 0.6 }); f.ppg.justice.jolt();
        }, 6);
      } },
    // the last hit: guilty
    { last: true, key: 'strike',
      lead(X, s) {
        const E = X.f.ppg.end, f = X.f, b = X.her, p = X.you; E.step = 6;
        if (!E.landed) { onBlock(E); landed(E, true, true); }
        put(X, 'you', M.youT, TOP); X.face('you', BLK.x, BLK.z); X.body('you', { pitch: 0 }, 0.01);
        if (!E.held) { giveGavel(E); E.raiseT = Math.min(E.raiseT, X.t); X.clip('you', 'OverhandThrow', { dur: 0.3, from: 0.06, to: 0.24, fade: 0.1 }); }
        b.props.charm.visible = false; b.show('lipstick', false); b.show('compact', false);
        // her bow to the house, and up out of it with her arms wide as it comes down
        E.look = 'house'; b.facing = 0; face(b.fig, 'delight', 0.15);
        const left = s.t - X.t;
        X.clip('her', 'OverhandThrow', { dur: left * 0.46, from: 0.12, to: 0.5, fade: 0.12 });
        later(E, left * 0.62, () => X.clip('her', 'OverhandThrow', { dur: left * 0.26, from: 0.5, to: 0.95, fade: 0.05 }));
        later(E, left * 0.86, () => X.clip('her', 'Jump_Loop', { loop: true, fade: 0.1 }));
        X.follow({ pos: [-2.0, 1.85, -2.2], look: [-2.75, 3.25, -7.5] }, { fov: 44, blend: 0.5 }); X.expr('A_Exertion');
        // the little one, down with the big one
        when(E, s.t - 0.1, () => X.clip('you', 'OverhandThrow', { dur: 0.12, from: 0.24, to: 0.42, fade: 0.02 }));
      },
      do(X, ok) {
        const E = X.f.ppg.end, f = X.f, b = X.her, p = X.you;
        E.hitT = X.t; E.look = null;
        if (ok) X.clip('you', 'OverhandThrow', { dur: 0.08, from: 0.34, to: 0.46, fade: 0.02 });
        else X.clip('you', 'Hit_Chest', { dur: 0.3, fade: 0.04 });
        X.hit({ power: 2.3, gold: ok, dir: 0, at: { x: BLK.x, y: 2.1, z: BLK.z + 0.2 }, quiet: true });
        f.fx.ring && f.fx.ring(BLK.x, -5.9, GOLD, 3.6); X.fx.dust(BLK.x, BLK.z + 0.9, 16);
        X.fx.glitter(BLK.x, 2.6 + BLK.y * 0, BLK.z, GOLD, 60, 1.6);
        X.shatter({ dir: new THREE.Vector3(0.12, -1, 0.55), power: ok ? 1.7 : 1.2, at: new THREE.Vector3(BLK.x, BLK.y + 1.9, BLK.z - 0.1) });
      } },
  ],
  after(X) {
    const E = X.f.ppg.end, f = X.f, p = X.you; if (!E) return;
    E.step = 7; if (E.hitT == null) E.hitT = X.t;
    if (E.trail) { E.trail.live = false; E.trail = null; }
    X.expr('A_Amused');
    // what's left on the block, then YOU, down off the bench with her gavel
    X.after(0.5, () => X.cam({ pos: [-2.9, 2.5, -5.0], look: [BLK.x, BLK.y + 0.12, BLK.z + 0.25] }, { fov: 30, blend: 0 }));
    X.after(0.5, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.3 }));
    X.after(1.1, () => { X.cam('you', { dist: 4.2, h: 1.9, blend: 0 }); X.follow('you', { dist: 4.2, h: 1.2 }); X.face('you', ...M.youEnd); });
    X.after(1.15, () => { X.go('you', ...M.youEnd, 0.36, { arc: 0.4, y: 0, ease: 'inOut' }); X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }); });
    X.after(1.52, () => { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); X.face('you', p.x, 6); X.fx.dust(p.x, p.z, 6); X.expr('A_Delight'); });
  },
  hold: 1.72,
};

// she's on the block. Stuck (a flip, and the landing): she takes it for a pose. Not: she's on her knees a moment.
// Then, either way, her lipstick, for the cameras. (quiet: the scene began after this; just put her there)
function landed(E, ok, quiet = false) {
  const X = E.X, f = X.f, b = X.her, S = f.ppg;
  if (E.landed) return; E.landed = true;
  if (E.trail) { E.trail.live = false; E.trail = null; }
  X.body('her', { pitch: 0, spin: 0 }, 0.01); b.facing = 0; E.look = 'house';
  if (quiet) { X.clip('her', 'Idle_FoldArms_Loop', { loop: true, fade: 0.1 }); face(b.fig, 'smug', 0.1); return; }
  snd(E, 'clunk', BLK.x, { gain: 0.8 }); snd(E, 'heel', BLK.x, { gain: 0.8, at: 0.02 });
  X.fx.sparks(BLK.x, BLK.y + 0.1, BLK.z, GOLD, 16); X.fx.glitter(BLK.x, BLK.y + 0.4, BLK.z, GOLD, 14, 0.6); X.shake(0.5, 0.14); S.justice.jolt();
  X.clip('her', 'NinjaJump_Land', { dur: ok ? 0.42 : 0.8, from: 0.05, to: 0.9, fade: 0.03 });
  face(b.fig, ok ? 'smug' : 'scandalized', 0.08);
  // Lady Justice's arm starts up behind her: the sound everyone in the room knows
  later(E, 0.25, () => snd(E, 'grind', BLK.x, { gain: 0.6 }), 6);
  // "Lipstick stays on"
  const t0 = Math.max(X.t + (ok ? 0.5 : 0.85), 161.3);
  when(E, t0, () => {
    b.show('lipstick', true); if (b.broken < 3) { b.show('compact', true); b.props.compact.userData.open(1); }
    snd(E, 'click', b.x, { gain: 0.5 }); face(b.fig, 'pout', 0.1);
    X.clip('her', 'Consume', { dur: 1.05, from: 0.12, to: 0.8, fade: 0.14 });
    X.follow({ pos: [-3.75, 2.2, -4.3], look: [-2.2, 3.0, -7.4] }, { fov: 32, blend: 0.5 });
  }, 4);
  when(E, t0 + 1.08, () => {
    const h = bonePos(b, 'Head', V(b.x, 3.5, b.z)); snd(E, 'kiss', b.x, { gain: 0.5 }); X.fx.glitter(h.x, h.y, h.z + 0.25, ROSE, 14, 0.3);
    b.show('lipstick', false); b.show('compact', false); face(b.fig, 'smug', 0.12);
    X.clip('her', 'Idle_FoldArms_Loop', { loop: true, fade: 0.25 });
  }, 4);
}
