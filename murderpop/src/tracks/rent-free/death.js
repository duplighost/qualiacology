// THE TENANT's end: THE EVICTION. She moved into YOU's head rent free; the song's last bars put her out of it, by her
// own things and by the house's own trick (its rooms fly). The presses are the song's last big hits:
//   her goodnight kiss, caught, and slapped back onto her cheek; she hangs three of her portraits between you, and YOU
//   goes through all three in one dash (their lease-threads lash her, the only thing that ever made her flinch); a cut;
//   the lift; and YOU brings her down on the bed she came to claim. The bedroom flies out from under her with all her
//   things and the foyer lands round the two of you: the front door she came in by. YOU boots her out of it into the
//   light. In the song's last silence she comes back round the frame (she's never, never, never moving out), and on the
//   last hit YOU slams it on her.
// (src/game/execution.js runs it: each step's `lead` puts the two of them on their marks as its ring starts to close, so
// the scene works from any step if her bar empties late; `do` is the beat itself. track.js hooks it in.)
import * as THREE from 'three';
import * as P from './props.js';
import { mats, kissDecal } from './claims.js';

// the song's own hits (data/accents/rent-free.json), by what lands on them
const TS = { kiss: 294.863, slap: 295.193, hang: [296.181, 296.513, 296.846], dash: 297.515, cut: 298.179, lift: 299.33, spike: 300.33, land: 300.673, stamp: 302.822, boot: 303.152, back: 303.74, last: 304.813 };
// marks, for YOU on the right of her (x is mirrored when she's on the right)
const Z = -3.2;
const M = { her1: [0.6, Z], you1: [3.6, Z], her2: [0, Z], slap: [1.05, Z], you3: [6.9, Z], her5: [-0.75, -3.3], you5: [0.3, -3.3],
  herUp: [-0.5, -4.4], youUp: [0.5, -3.6], bed: [-0.1, -5.2], you6: [0.4, -3.6], herDoor: [0, -5.3], youRun: [0.6, -1.2], youKick: [0.12, -4.4], sill: [0.05, -6.3], youEnd: [1.0, -3.1] };
const PX = [2.1, 3.7, 5.3], PY = 1.12, BED_Y = 0.6;
const GOLD = new THREE.Color(3.2, 2.0, 0.55), PINK = new THREE.Color(4.0, 0.55, 1.6), WHITE = new THREE.Color(2.6, 2.9, 3.4), LILAC = new THREE.Color(2.4, 1.0, 3.0), DUST = new THREE.Color(0.85, 0.75, 0.8);
const EASE = { lin: (k) => k, in: (k) => k * k, out: (k) => 1 - (1 - k) * (1 - k), inOut: (k) => k * k * (3 - 2 * k), back: (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
const clamp01 = (k) => Math.max(0, Math.min(1, k));

let S = null, API = null;          // the fight's live state (track.js) and what it lends: { snd, faceShard }
const fresh = () => ({ on: false, X: null, sx: 1, tweens: [], room: 'bedroom', door: false, doorK: 0, lightK: 0.45, kiss: null, out: false, loose: [] });
let Q = fresh();
export function sceneBind(state, api) { S = state; API = api; Q = fresh(); }
// a rewind, a new start: nothing of the scene is left standing
export function sceneReset() { for (const o of Q.loose) o.parent && o.parent.remove(o); Q = fresh(); }
const snd = (n, o) => API && API.snd(n, o);
// a tween of the set's own things on the scene's clock (it runs on past the song's last hit)
const tw = (t0, t1, fn, ease = 'inOut', done = null, tag = '') => Q.tweens.push({ t0, t1, fn, e: EASE[ease] || EASE.inOut, done, tag });
const mx = (m) => [m[0] * Q.sx, m[1]];
const put = (X, w, m, facing) => X.place(w, m[0] * Q.sx, m[1], facing);
const toward = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);

// ------------------------------------------------------------------------------------------------ track.js's hooks
// it begins: whatever she was in the middle of ends here (out of her frames, off her seats, on the floor, in plain sight)
export function sceneBegin(f, X) {
  const b = f.boss, T = S.ten;
  sceneReset(); Q.on = true; Q.X = X;
  T.gen++; T.mode = 'script'; T.until = 1e9; T.seat = null; T.frame = null; T.paintAnim = null; T.painted.visible = false; T.exprUntil = 0;
  if (T.reflex) { T.reflex.dropped = true; T.reflex.g.dead = true; T.reflex = null; }
  for (const c of S.claims.list) c.occupant = null;
  b.root.visible = true; b.intangible = false; b.root.position.y = 0; b.lockFacing = false;
  S.ribbon = null; S.yank = null; S.glide = null; S.chase = null;
  b.rig.upperStop && b.rig.upperStop(0.05);
}
export function sceneUpdate(f, dt) {
  if (!Q.on) return;
  const T = Q.X ? Q.X.T : f.t;
  for (let i = Q.tweens.length - 1; i >= 0; i--) {
    const w = Q.tweens[i]; if (T < w.t0) continue;
    const k = Math.min(1, (T - w.t0) / Math.max(1e-3, w.t1 - w.t0));
    w.fn(w.e(k), k);
    if (k >= 1) { Q.tweens.splice(i, 1); w.done && w.done(); }
  }
  if (Q.door) {
    S.house.doorK = Q.doorK;
    // the light in the foyer is the door's: it comes in as it opens and is cut off as it shuts
    Q.lightK += (0.45 + 0.55 * clamp01(Q.doorK * 1.6) - Q.lightK) * Math.min(1, dt * 16);
  }
}
export function sceneFinish() { /* her end is the scene's own (the last step and `after`, below) */ }

// ------------------------------------------------------------------------------------------------ her kiss
const headOf = (o) => { const bn = o.rig.bones.Head || o.rig.bones.head, v = new THREE.Vector3(); if (bn) bn.getWorldPosition(v); else v.set(o.x, 1.7, o.z); return v; };
function blowKiss(X, tHit) {
  const f = X.f, b = X.her, from = headOf(b); from.x -= Q.sx * -0.2; from.y -= 0.06;
  const K = Q.kiss = { state: 'fly', t0: X.t, t1: tHit, from, p: null };
  K.p = f.proj.spawn({ x: from.x, z: from.z, y: from.y, angle: 0, speed: 0, kind: 'pink', shape: 'kiss', size: 0.3, owner: 'deco', life: 40, parryable: false, fn: (q) => kissFn(X, K, q) });
}
function kissFn(X, K, q) {
  const p = X.you, T = X.T;
  if (K.state === 'fly') {
    const k = clamp01((T - K.t0) / Math.max(0.05, K.t1 - K.t0)), to = headOf(p); to.y -= 0.22; to.x -= Q.sx * 0.28;
    q.x = K.from.x + (to.x - K.from.x) * k; q.z = K.from.z + (to.z - K.from.z) * k + Math.sin(k * Math.PI) * 0.25; q.y = K.from.y + (to.y - K.from.y) * k + Math.sin(k * Math.PI) * 0.3;
    q.size = 0.3 + 0.24 * k; q.rot = Math.sin(T * 9) * 0.25;
  } else if (K.state === 'held') {
    // caught: it sits on YOU's ring, gold
    const h = p.rig.bones.hand_l, v = h ? h.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(p.x, 1.4, p.z);
    q.x = v.x; q.y = v.y + 0.12; q.z = v.z + 0.1; q.size = 0.5; q.rot += 0.5;
  } else if (K.state === 'back') {
    const k = clamp01((T - K.t0) / Math.max(0.03, K.t1 - K.t0)), to = headOf(X.her), h = p.rig.bones.hand_r, v = h ? h.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(p.x, 1.5, p.z);
    q.x = v.x + (to.x - v.x) * k * k; q.y = v.y + 0.1 + (to.y - v.y) * k * k; q.z = v.z + 0.1; q.size = 0.5; q.rot += 0.6;
  }
}
// her own kiss, printed on a cheek
function stickKiss(X, who) {
  const o = X.who(who), bn = o.rig.bones.Head || o.rig.bones.head; if (!bn) return;
  const a = o.facing, p = headOf(o), k = who === 'her' ? 1.22 : 1, m = kissDecal(0.2 * k, [0, 0, 0], [0, 0, 1]);
  // on the cheek that's toward the audience
  const side = Math.cos(a) >= 0 ? 0 : (Math.sin(a) > 0 ? -1 : 1);
  m.position.set(p.x + Math.sin(a) * 0.105 * k + Math.cos(a) * 0.05 * k * side, p.y - 0.035 * k, p.z + Math.cos(a) * 0.105 * k - Math.sin(a) * 0.05 * k * side + 0.035 * k);
  m.rotation.set(0, a + side * -0.55 + (Math.cos(a) >= 0 ? 0 : (Math.sin(a) > 0 ? -1 : 1) * -0.5), 0.3, 'YXZ');
  X.f.scene.add(m); bn.attach(m); Q.loose.push(m);
  return m;
}

// ------------------------------------------------------------------------------------------------ her portraits, hung between you
const WIRE = new THREE.CylinderGeometry(0.006, 0.006, 14, 4);
function hang(X, i, tLand, instant = false) {
  const id = 'EV:' + i, x = PX[i] * Q.sx;
  let c = S.claims.get(id); if (c) return c;
  const pr = P.portrait(1), g = new THREE.Group(), up = new THREE.Group(); g.add(up); up.add(pr.group);
  pr.group.position.y = PY;
  for (const s of [-0.5, 0.5]) { const w = new THREE.Mesh(WIRE, mats().gold); w.position.set(s, 0.95 + 7, 0); pr.group.add(w); }
  c = S.claims.add({ id, kind: 'portrait', obj: g, x, z: Z, y: PY, box: { hw: 0.77, hd: 0.14, rot: 0 }, hits: 1, value: 6, oneShot: true, wall: true, dormant: true, data: { up, frame: pr.group, mat: pr.mat } });
  if (instant || X.t >= tLand - 0.02) { up.position.y = 0; return c; }
  // they zip down their wires to just over their places, sway there, and slam down on the beat
  const t0 = X.t, tA = Math.min(t0 + 0.3, tLand - 0.2);
  up.position.y = 9;
  tw(t0, tA, (k) => { up.position.y = 9 - 8.0 * k; }, 'out');
  tw(tA, tLand - 0.13, () => { up.position.y = 1.0; up.rotation.z = Math.sin(X.T * 11 + i * 2) * 0.05; }, 'lin');
  tw(tLand - 0.13, tLand, (k) => { up.position.y = 1.0 * (1 - k); up.rotation.z *= 0.6; }, 'in', () => {
    up.position.y = 0; up.rotation.z = 0;
    X.f.cam.shake(0.5, 0.14); X.fx.dust(x, Z + 0.25, 10, DUST); X.fx.glitter(x, 0.6, Z + 0.2, new THREE.Color(3, 1.2, 2.4), 10, 0.8);
    snd('rf-slam', { x, must: true, gain: 0.8, rate: 1.1 + i * 0.08 });
    X.f.setPieces && X.f.setPieces.slam(x, Z, 1.0);
  });
  return c;
}
// one of them goes: the burst, and its thread to her
function burst(X, i) {
  const c = S.claims.get('EV:' + i); if (!c || !c.alive) return;
  c.dormant = false; S.claims.break(c, { ang: -Q.sx * Math.PI / 2 });
}
// she hangs them: an arm up, three wires singing
function gallery(X) {
  X.clip('her', 'Spell_Simple_Enter', { dur: 0.45, fade: 0.12 }); X.after(0.45, () => X.clip('her', 'Spell_Simple_Idle_Loop', { loop: true, fade: 0.1 }));
  X.herFace('tenantMine');
  snd('rf-wires', { x: PX[1] * Q.sx, rate: 1.5 });
  TS.hang.forEach((tl, i) => hang(X, i, tl));
}

// ------------------------------------------------------------------------------------------------ the house
// the bedroom flies out with everything of hers in it and the foyer lands at `land`: the front door
function toFoyer(X, { land = X.t + 0.5, instant = false } = {}) {
  if (Q.room === 'foyer') return;
  Q.room = 'foyer';
  const f = X.f, H = S.house, t = X.t;
  H.sceneRoom('foyer', { t, land, instant });
  H.over.light = () => ({ a: 'dark', b: 'foyer', k: Q.lightK, ex: 1 });
  H.over.cool = 1.0;
  H.signOut('dreams', instant ? t - 1 : t);
  Q.door = true; Q.doorK = 0; Q.lightK = 0.45;
  for (const c of [...S.claims.list]) {
    c.dormant = true; const o = c.obj, id = c.id;
    if (instant) { S.claims.remove(id); continue; }
    tw(t, t + 0.42, (k) => { o.position.y = 11 * k * k; }, 'lin', () => { if (S.claims.get(id) === c) S.claims.remove(id); });
  }
  if (instant) return;
  f.fx.flash(new THREE.Color(0.1, 0.08, 0.12), 1);
  X.at(land, () => {
    f.cam.shake(0.7, 0.2); snd('rf-thud', { x: 0, gain: 1.2, must: true }); snd('rf-slam', { x: 0, gain: 0.5, rate: 0.7 });
    for (let x = -10; x <= 10; x += 2.5) f.fx.dust(x, -6.6, 3, DUST);
    for (let z = -6; z <= 5; z += 2.5) { f.fx.dust(-10.6, z, 2, DUST); f.fx.dust(10.6, z, 2, DUST); }
  });
}
function ensureFoyer(X) { if (Q.room !== 'foyer') toFoyer(X, { instant: true }); }
// the front door, by hand: to k (0 shut, 1 open) over sec
function door(X, k, sec, ease = 'out', done = null) { const k0 = Q.doorK, t = X.t; tw(t, t + Math.max(0.01, sec), (e) => { Q.doorK = k0 + (k - k0) * e; }, ease, done, 'door'); }
function openDoor(X) {
  if (Q.opened) return; Q.opened = true;
  snd('rf-latch', { x: 0, gain: 0.8 });
  door(X, 1.06, 0.26, 'out', () => { door(X, 1, 0.14, 'inOut'); snd('rf-bang', { x: 0, gain: 0.7, rate: 1.15 }); X.f.cam.shake(0.3, 0.12); });
}

// ------------------------------------------------------------------------------------------------ the scene
export const death = {
  beats: 36,
  hold: 2.0,
  enter(X) {
    const p = X.you, b = X.her, t = X.t;
    Q.sx = p.x - b.x > -1 ? 1 : -1;
    X.expr('A_Focus');
    if (t >= TS.spike - 0.3) {
      // (her bar emptied late: the house goes to the door now)
      toFoyer(X, { land: t + 0.45 }); X.faceEach(); X.follow('two', {});
      return;
    }
    if (t < TS.kiss - 0.9) {
      // the two of them, a few steps apart at the foot of YOU's bed
      const h = mx(M.her1), y = mx(M.you1), dur = Math.max(0.5, TS.kiss - 0.75 - t);
      X.go('her', h[0], h[1], dur, { ease: 'inOut' }); X.go('you', y[0], y[1], dur * 0.9, { ease: 'inOut' });
      X.face('her', y[0], y[1]); X.face('you', h[0], h[1]);
      X.clip('her', 'Walk_Formal_Loop', { loop: true, speed: 0.9 }); X.clip('you', Math.hypot(p.x - y[0], p.z - y[1]) > 4 ? 'Jog_Fwd_Loop' : 'Walk_Loop', { loop: true, speed: 1.3 });
      X.after(dur * 0.9, () => { X.faceEach(); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
      X.after(dur, () => { X.faceEach(); X.clip('her', 'Idle_Talking_Loop', { loop: true, fade: 0.2 }); X.herFace('tenantSleep'); });
    } else X.faceEach();
    X.follow('two', { dist: 6.6 });
  },
  steps: [
    // "Sweet dreams, landlord", and a kiss blown after it. Caught: it's back on her cheek on the song's next hit
    { t: TS.kiss, key: 'parry',
      lead(X, s) {
        put(X, 'her', M.her1); put(X, 'you', M.you1); X.faceEach();
        X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 });
        X.clip('her', 'Spell_Simple_Shoot', { dur: 0.62, from: 0.12, to: 0.8, fade: 0.1 }); X.herFace('tenantDarling');
        blowKiss(X, s.t); snd('rf-mwah', { x: X.her.x, gain: 0.9 });
        X.follow('two', { dist: 6.4 });
      },
      do(X, ok) {
        const f = X.f, p = X.you, K = Q.kiss;
        if (ok) {
          X.clip('you', 'Sword_Block', { dur: 0.12, from: 0.08, to: 0.3 }); X.fx.caught(p.x - Q.sx * 0.35, 1.45, p.z, true); X.sfx.catch && X.sfx.catch('perfect', f.pan(p.x));
          if (K && K.p) { K.state = 'held'; K.p.color.setRGB(3.6, 2.2, 0.55); }
          X.expr('A_Amused');
          const sl = mx(M.slap);
          X.at(TS.slap - 0.17, () => {
            X.go('you', sl[0], sl[1], 0.13, { ease: 'out' }); X.clip('you', 'Punch_Cross', { dur: 0.34, from: 0.1, to: 0.7, fade: 0.04 }); X.sfx.dash && X.sfx.dash(p); X.fx.dashStart && X.fx.dashStart(p);
            if (K && K.p) { K.state = 'back'; K.t0 = X.t; K.t1 = TS.slap; }
          });
          X.at(TS.slap, () => {
            X.fx.dashEnd && X.fx.dashEnd(p);
            if (K && K.p) { K.state = 'done'; K.p.dead = true; }
            stickKiss(X, 'her');
            X.hit({ power: 1.15, gold: true, y: 1.9 });
            X.clip('her', 'Hit_Head', { dur: 0.5 }); X.herFace('tenantEvicted');
            const h2 = mx(M.her2); X.go('her', h2[0], h2[1], 0.24, { ease: 'out' });
            X.her.fig && X.her.fig.breakPiece && X.her.fig.breakPiece('roller');
            X.cam({ pos: [0.5 * Q.sx, 1.7, 0.6], look: [0.2 * Q.sx, 1.65, Z] }, { fov: 30 });
            X.after(0.45, () => { X.follow('two', {}); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
          });
        } else {
          // a fumble: it lands, and it's on YOU's cheek
          if (K && K.p) { K.state = 'done'; K.p.dead = true; }
          X.fx.sparks(p.x, 1.55, p.z, PINK, 14); X.clip('you', 'Hit_Chest', { dur: 0.36 }); X.herFace('tenantHaha'); stickKiss(X, 'you');
          X.after(0.4, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }));
        }
        // "This is home": she hangs her portraits where YOU stands, and YOU is out from under them
        X.at(295.62, () => gallery(X));
        X.at(295.9, () => { const y3 = mx(M.you3); X.face('you', X.her.x, X.her.z); X.go('you', y3[0], y3[1], 0.22, { ease: 'out' }); X.clip('you', 'Sword_Dash', { dur: 0.3, from: 0.38, to: 0.12, fade: 0.04 }); X.sfx.dash && X.sfx.dash(p); X.fx.dashStart && X.fx.dashStart(p); X.after(0.24, () => { X.fx.dashEnd && X.fx.dashEnd(p); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); }); });
      } },
    // through all three of her faces in one go; each one's thread lashes her
    { t: TS.dash, key: 'dash',
      lead(X) {
        put(X, 'her', M.her2); put(X, 'you', M.you3); X.faceEach();
        for (let i = 0; i < 3; i++) hang(X, i, TS.hang[i], true);
        X.clip('her', 'Spell_Simple_Idle_Loop', { loop: true, fade: 0.12 }); X.herFace('tenantMine');
        X.clip('you', 'Sword_Dash', { dur: 0.7, from: 0.0, to: 0.12, fade: 0.1 }); X.expr('A_Focus');
        X.follow('two', {});
      },
      do(X, ok) {
        const p = X.you, dur = 0.14, x0 = M.you3[0], x1 = M.slap[0], sl = mx(M.slap);
        X.go('you', sl[0], sl[1], dur, { ease: 'out' }); X.clip('you', 'Sword_Dash', { dur: dur + 0.12, from: 0.12, to: 0.42, fade: 0.03 });
        X.sfx.dash && X.sfx.dash(p); X.fx.dashStart && X.fx.dashStart(p);
        // (where she is along the dash, eased out: each bursts as she goes through it)
        for (const i of [2, 1, 0]) { const u = (x0 - PX[i]) / (x0 - x1), k = 1 - Math.sqrt(1 - u); X.after(dur * k, () => burst(X, i)); }
        X.after(dur, () => {
          X.fx.dashEnd && X.fx.dashEnd(p); X.slash('stinger', { gold: ok }); X.herFace('tenantEvicted');
          if (ok) X.fx.glitter(p.x, 1.2, p.z, GOLD, 14, 0.5); else X.clip('you', 'Hit_Chest', { dur: 0.3 });
        });
      } },
    // the cut
    { t: TS.cut, key: 'strike',
      lead(X, s) { put(X, 'her', M.her2); put(X, 'you', M.slap); X.faceEach(); for (let i = 0; i < 3; i++) burst(X, i); X.strike('back', s.t); X.follow('two', { dist: 5.6 }); },
      do(X, ok) {
        X.slash('back', { gold: ok }); X.hit({ power: ok ? 1.3 : 0.7, gold: ok });
        X.clip('her', 'Hit_Chest', { dur: 0.45 }); X.herFace('tenantEvicted');
        const h = mx(M.her5), y = mx(M.you5); X.go('her', h[0], h[1], 0.22, { ease: 'out' }); X.go('you', y[0], y[1], 0.2, { ease: 'out' });
        if (ok) X.her.fig && X.her.fig.breakPiece && X.her.fig.breakPiece('setBR');
      } },
    // the lift: up she goes, and YOU with her
    { t: TS.lift, key: 'jump',
      lead(X, s) { put(X, 'her', M.her5); put(X, 'you', M.you5); X.lift('you', 0, 0.01); X.lift('her', 0, 0.01); X.faceEach(); X.clip('her', 'Idle_Talking_Loop', { loop: true, fade: 0.2 }); X.strike('lift', s.t); X.follow('low', { dist: 6.2 }); },
      do(X, ok) {
        const hu = mx(M.herUp), yu = mx(M.youUp);
        X.slash('lift', { gold: ok }); X.hit({ power: ok ? 1.5 : 0.8, gold: ok });
        X.sfx.liftOff && X.sfx.liftOff(X.f.pan(X.her.x));
        X.clip('her', 'Jump_Loop', { loop: true, fade: 0.06 });
        X.go('her', hu[0], hu[1], 0.8, { ease: 'out' }); X.lift('her', ok ? 2.2 : 1.7, 0.42, 'out'); X.body('her', { pitch: -Math.PI * 2 }, 0.9, 'out');
        X.go('you', yu[0], yu[1], 0.7, { ease: 'out' }); X.lift('you', ok ? 2.3 : 1.8, 0.42, 'out');
        X.after(0.2, () => X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.1 }));
      } },
    // down, onto the bed she came to claim. The bedroom goes out from under her
    { t: TS.spike, key: 'strike',
      lead(X, s) {
        put(X, 'her', M.herUp); put(X, 'you', M.youUp); X.lift('her', 2.2, 0.08); X.lift('you', 2.3, 0.08); X.faceEach();
        X.clip('her', 'Jump_Loop', { loop: true, fade: 0.06 });
        X.strike('dive', s.t); X.expr('A_Exertion');
        X.follow('low', { dist: 6.4 });
      },
      do(X, ok) {
        const f = X.f, bd = mx(M.bed), y6 = mx(M.you6);
        X.slash('dive', { gold: ok }); X.hit({ power: ok ? 2.0 : 1.0, gold: ok, y: 1.2 });
        X.go('her', bd[0], bd[1], 0.07, { ease: 'in', y: BED_Y }); X.body('her', { pitch: 0, spin: 0, roll: 0 }, 0.06, 'in');
        X.face('her', bd[0], 9); X.clip('her', 'LayToIdle', { dur: 60, from: 0.0, to: 0.2, fade: 0.04 });
        X.go('you', y6[0], y6[1], 0.14, { ease: 'in', y: 0 });
        X.follow('two', { dist: 6.6, h: 1.3 });
        X.after(0.07, () => {
          f.cam.shake(1.0, 0.24); f.cam.kick(1.6); X.fx.dust(bd[0], bd[1], 14, DUST); X.fx.glitter(bd[0], 1.0, bd[1], new THREE.Color(2.6, 2.6, 3.0), 26, 1.2);
          snd('rf-boom', { x: bd[0], must: true }); X.sfx.slamSet && X.sfx.slamSet(f.pan(bd[0]));
          X.herFace('tenantEvicted');
          // and the house lets go of the room: its walls, her things, the bed under her
          toFoyer(X, { land: TS.land });
          X.lift('her', 0, 0.24, 'in');
        });
        X.after(0.16, () => { X.clip('you', 'NinjaJump_Land', { dur: 0.24, from: 0.1, to: 0.4, fade: 0.04 }); X.after(0.24, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.14 })); });
        // the front door. YOU shows her it
        X.at(300.98, () => { X.face('you', 0, -7); X.clip('you', 'Interact', { dur: 0.9, from: 0.08, to: 0.6, fade: 0.1 }); X.expr('A_Amused'); });
        X.at(301.12, () => openDoor(X));
        X.at(301.3, () => { const hd = mx(M.herDoor); X.clip('her', 'LayToIdle', { dur: 0.5, from: 0.02, to: 0.42, fade: 0.05 }); X.go('her', hd[0], hd[1], 0.7, { ease: 'inOut' }); });
        X.at(301.8, () => { X.face('her', X.you.x, X.you.z); X.clip('her', 'Idle_FoldArms_Loop', { loop: true, fade: 0.3 }); X.herFace('tenantHome'); });
        X.at(301.9, () => { const yr = mx(M.youRun), p = X.you; X.go('you', yr[0], yr[1], 0.24, { ease: 'out' }); X.clip('you', 'Sword_Dash', { dur: 0.34, from: 0.38, to: 0.1, fade: 0.05 }); X.sfx.dash && X.sfx.dash(p); X.fx.dashStart && X.fx.dashStart(p); X.after(0.26, () => X.fx.dashEnd && X.fx.dashEnd(p)); });
      } },
    // the boot: out of the door she came in by
    { t: TS.boot, key: 'dash',
      lead(X, s) {
        const f = X.f, b = X.her, p = X.you, yr = mx(M.youRun), yk = mx(M.youKick);
        ensureFoyer(X); if (!Q.opened) { Q.opened = true; Q.doorK = 1; }
        b.root.visible = true; X.lift('her', 0, 0.01); X.lift('you', 0, 0.01); X.body('her', { pitch: 0, spin: 0, roll: 0 }, 0.01);
        put(X, 'her', M.herDoor); put(X, 'you', M.youRun); X.faceEach();
        X.clip('her', 'Idle_FoldArms_Loop', { loop: true, fade: 0.15 }); X.herFace('tenantHome');
        // a run at her: two strides, then feet first
        X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.5, fade: 0.06 }); X.expr('A_Exertion');
        X.go('you', yr[0] * 0.5 + yk[0] * 0.5, -3.3, Math.max(0.1, s.t - 0.18 - X.t), { ease: 'in' });
        X.at(s.t - 0.18, () => { X.clip('you', 'Slide_Start', { dur: 0.42, from: 0.1, to: 0.55, fade: 0.05 }); X.go('you', yk[0], yk[1], 0.18, { ease: 'lin' }); X.fx.dust(p.x, p.z, 6, DUST); });
        // her heel: never
        X.at(TS.stamp, () => { X.clip('her', 'Sword_Attack', { dur: 0.42, from: 0.45, to: 0.95, fade: 0.05 }); snd('rf-stamp', { x: b.x, must: true }); X.fx.ring && X.fx.ring(b.x, b.z, WHITE, 2.4); f.cam.shake(0.3, 0.1); X.herFace('tenantMine'); });
        X.follow({ pos: [3.1 * Q.sx, 1.3, 0.4], look: [0, 1.25, -5.4] }, { fov: 36 });
      },
      do(X, ok) {
        const f = X.f, b = X.her, p = X.you;
        X.hit({ power: ok ? 1.8 : 0.9, gold: ok, dir: Math.PI, y: 0.9 }); X.herFace('tenantEvicted');
        if (ok) {
          // off her feet and out, into the light
          X.clip('her', 'Hit_Knockback', { dur: 2.2, from: 0.06, to: 0.3, fade: 0.03 });
          X.go('her', 0, -9.4, 0.34, { ease: 'out', arc: 0.75 }); X.body('her', { pitch: -0.9 }, 0.3, 'out');
          X.after(0.15, () => { X.fx.glitter(0, 1.5, -6.9, new THREE.Color(3.2, 2.4, 3.4), 40, 1.4); f.fx.flash(new THREE.Color(0.14, 0.1, 0.16), 1); snd('rf-swish', { x: 0, gain: 1.2, rate: 0.7 }); });
          X.after(0.34, () => { b.root.visible = false; Q.out = true; });
        } else { X.clip('her', 'Hit_Chest', { dur: 0.4 }); X.go('her', M.sill[0], -6.0, 0.24, { ease: 'out' }); }
        X.after(0.3, () => { X.clip('you', 'Slide_Start', { dur: 0.5, from: 0.55, to: 1.0, fade: 0.06 }); });
        // YOU turns her back on it. In the song's last silence: a hand on the frame
        X.at(303.62, () => { const ye = mx(M.youEnd); X.face('you', ye[0], 9); X.go('you', ye[0], ye[1], 0.5, { ease: 'inOut' }); X.clip('you', 'Walk_Loop', { loop: true, speed: 1.3, fade: 0.12 }); X.expr('A_Amused'); X.after(0.5, () => X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.18 })); });
        X.at(TS.back, () => comeBack(X));
      } },
    // she's back round the frame: never, never, never moving out. The door, on the song's last hit
    { last: true, key: 'strike',
      lead(X, s) {
        const b = X.her, p = X.you, ye = mx(M.youEnd);
        ensureFoyer(X); if (!Q.opened) { Q.opened = true; Q.doorK = 1; }
        X.lift('you', 0, 0.01); put(X, 'you', M.youEnd, toward(ye[0], ye[1], ye[0], 9));
        comeBack(X);
        // she hears her: one turn, both rings out
        X.strike('saw', s.t); X.expr('A_Focus');
        const a0 = p.rig.body.spin || 0, turn = Math.PI * 3 * Q.sx;
        X.body('you', { spin: a0 + turn }, Math.max(0.1, s.t - X.t), 'in');
        X.at(s.t - 0.12, () => throwRings(X, s.t - 0.02));
        tw(s.t - 0.09, s.t, (k) => { Q.doorK = 1 - 0.6 * k; }, 'in', null, 'door');
        X.follow({ pos: [3.3 * Q.sx, 1.45, 0.9], look: [0.25 * Q.sx, 1.3, -5.2] }, { fov: 34 });
      },
      do(X, ok) {
        const f = X.f, at = new THREE.Vector3(M.sill[0], 1.2, M.sill[1]);
        // shut. On her
        Q.tweens = Q.tweens.filter((w) => w.tag !== 'door'); const k0 = Q.doorK, t = X.t;
        tw(t, t + 0.06, (e) => { Q.doorK = k0 * (1 - e); }, 'in', null, 'door');
        X.you.rig.body.spin = 0; X.face('you', 0, -7);
        X.slash('saw', { gold: ok }); X.hit({ power: 2.3, gold: ok, at: { x: at.x, y: at.y, z: at.z }, dir: Math.PI });
        X.shatter({ dir: new THREE.Vector3(0, 0.35, 1), power: ok ? 1.6 : 1.1, at });
        snd('rf-bang', { x: 0, must: true, gain: 1.4, rate: 0.75 }); snd('rf-slam', { x: 0, must: true, gain: 0.9, rate: 0.8 });
        f.cam.shake(1.2, 0.3); for (const x of [-1.3, 0, 1.3]) X.fx.dust(x, -6.6, 6, DUST);
        X.fx.ring && X.fx.ring(0, -6.2, GOLD, 3.4);
        bell(X);
      } },
  ],
  after(X) {
    const f = X.f, p = X.you;
    
    X.lift('you', 0, 0.05); p.rig.body.spin = 0; X.face('you', 0, -7);
    X.clip('you', 'Sword_Idle', { loop: true, fade: 0.25 }); X.expr('A_Amused');
    X.after(0.7, () => X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.3 }));
    // her face comes down last: on the floor at YOU's feet, face up, still smiling
    if (API && API.faceShard) {
      const m = API.faceShard(), x0 = M.sill[0], z0 = M.sill[1], x1 = p.x - 0.7 * Q.sx, z1 = p.z - 0.9, t0 = X.t + 0.25;
      m.position.set(x0, 1.7, z0); m.visible = false; f.scene.add(m); Q.loose.push(m);
      tw(t0, t0 + 0.8, (e, k) => { m.visible = true; m.position.set(x0 + (x1 - x0) * e, 1.7 + (0.07 - 1.7) * k + 1.5 * k * (1 - k), z0 + (z1 - z0) * e); m.rotation.set((1 - k) * 7.5, (1 - k) * 2.0 + 0.4, (1 - k) * 3.0); }, 'out',
        () => { m.rotation.set(0, 0.4, 0); snd('rf-tink', { x: x1, rate: 1.25, gain: 0.5 }); f.fx.glitter(x1, 0.2, z1, GOLD, 6, 0.2); });
    }
  },
};

// she comes back in out of the light, to the sill, where the door will find her
function comeBack(X) {
  if (Q.back) return; Q.back = true;
  const b = X.her, t = X.t, tIn = Math.max(t + 0.1, TS.last - 0.16);
  b.root.visible = true; X.lift('her', 0, 0.01); X.body('her', { pitch: 0, spin: 0, roll: 0 }, 0.01);
  if (Q.out || b.z < -6.9) X.place('her', M.sill[0], -7.7, 0);
  Q.out = false;
  X.face('her', X.you.x, X.you.z);
  X.go('her', M.sill[0], M.sill[1], Math.max(0.1, tIn - t), { ease: 'out' });
  X.clip('her', 'Zombie_Walk_Fwd_Loop', { loop: true, speed: 1.3, fade: 0.08 }); X.herFace('tenantMine');
  snd('rf-jingle', { x: 0, gain: 0.7 }); snd('rf-creak', { x: 0, gain: 0.5, rate: 1.3 });
}
// both of YOU's rings, one to each leaf of the door
function throwRings(X, tHit) {
  const p = X.you, f = X.f;
  for (const r of p.rings) {
    if (r.state !== 'hand') continue;
    const side = r.side === 'L' ? -1 : 1;
    r.holder.getWorldPosition(r.pos); p.root.parent.attach(r.holder);
    r.state = 'out'; r.t = 0; r.hitOut = true; r.hitBack = false; r.spin = 0; r.s = null; r.judge = null; r.aim = null;
    r.from = r.pos.clone(); r.t0 = p.T; r.t1 = Math.max(p.T + 0.04, tHit); r.tgt.set(1.3 * side, 1.5, -5.95);
    f.sfx.ringThrow && f.sfx.ringThrow(r); f.fx.ringTrail && f.fx.ringTrail(r, true);
  }
}
// the bell box over the door jumps with the slam (its own ring is the song's, at the top of it)
function bell(X) {
  const pr = S.house.rooms.foyer.props, h = pr.hammer, t = X.t;
  tw(t, t + 0.3, (e, k) => { h.rotation.z = Math.sin(k * Math.PI * 3) * 0.7 * (1 - k); }, 'lin', () => { h.rotation.z = 0; });
  tw(t, t + 0.4, (e, k) => { pr.fan.material.color.setRGB(1.6 + 1.2 * (1 - k), 1.4 + 0.9 * (1 - k), 1.5 + 1.0 * (1 - k)); }, 'lin');
}
