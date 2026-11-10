// THE WRECK's end: HEAD-ON. She asked to be kissed like a car crash, to have her neck broken, and not to be told
// goodbye; and in chorus 2 she held YOU in the road while her own car came for you both. So, in the song's last bars:
// she comes in for the kiss once more and YOU stops her with one hand on her face. She sings "Just fuck me" into it,
// and behind YOU her wreck's one headlight opens, the way her car does things by itself. YOU goes through her (the
// way out of her arms the fight taught) and puts her against the nose of YOU's own car; goes up over her onto its
// bonnet; puts her on her knees in the lane; turns her face to her own headlight (her whiplash, done to her); and on
// the last hit isn't there. Her car takes her head-on against YOU's, nose to nose, the way the two cars stood when
// the song began. What she charged at all song was never there; this time she is.
// (src/game/execution.js runs it. Each step's `lead` puts the two of them, and the cars, on their marks if it's the
// first one played, so the scene works from any step when her bar empties late; `do` is the beat itself.)
import * as THREE from 'three';
import { YOU_CAR } from './road.js';

const LZ = 1.4;                         // the lane both cars sit on
const EAST = Math.PI / 2, WEST = -Math.PI / 2;
// YOU's car is at x 7.4 facing west: its bumper is at x 4.98, its bonnet runs back to 7.0 about 0.93 m up, its roof 1.37
const M = {
  you0: [1.85, LZ], her0: [4.0, LZ], her1: [2.85, LZ], herC: [2.55, LZ],     // the kiss, stopped; her arms round YOU
  youT: [3.7, LZ], K: [4.55, LZ],                                             // she's put against the nose of YOU's car
  hood: [5.85, LZ], hoodY: 0.93, edge: [5.36, LZ], up: [4.42, LZ],            // YOU on the bonnet; at its front edge; her, up again
  roof: [8.3, LZ], roofY: 1.37, down: [6.15, 3.55],                           // after: the roof, then the road
  car0: -7.6, carK: 2.36,                                                     // her car: where it was parked when the song began; where it stops, its nose on her
};
// the song's own hits (data/accents): the presses
const T1 = 139.851, T2 = 142.631, T3 = 143.682, T4 = 145.431, T5 = 147.511;
const EYE = 141.233;                    // bar 101's one: her car's light
const VAULT = 0.345;                    // the vault lands on bar 103's one
const GOLD = new THREE.Color(3.2, 2.0, 0.55), PINKW = new THREE.Color(1.0, 0.82, 0.88), SPARK = new THREE.Color(3.2, 2.4, 1.4), GLASS = new THREE.Color(2.4, 2.6, 2.9), CHERRY = new THREE.Color(2.4, 0.3, 0.8);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const EASE = { linear: (k) => k, in: (k) => k * k, out: (k) => 1 - (1 - k) * (1 - k), inOut: (k) => k * k * (3 - 2 * k) };

// ---------------------------------------------------------------------------------------------- the scene's own state
// (kept on the Stage: the cars, a few tweens the Stage doesn't have, her head, the camera that rides her car)
const S = (X) => X._k;
function tween(X, sec, fn, ease = 'inOut') { S(X).anims.push({ t0: X.T, dur: Math.max(0.001, sec), fn, ease: EASE[ease] || EASE.inOut }); }
// turn one of them to face a way, the short way round or by the side the audience sees (through +z)
function turn(X, who, to, sec, viaFront = false) {
  const o = X.who(who), from = o.facing; let d = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  if (viaFront) { const mid = from + d / 2; if (Math.cos(mid) < 0) d += d > 0 ? -2 * Math.PI : 2 * Math.PI; }
  tween(X, sec, (e) => { o.facing = from + d * e; }, 'inOut');
}
function camNow(X, pos, look, fov) { X.cam({ pos, look }, { fov, blend: 0 }); const o = X._o; if (o) { o.pos.set(...pos); o.look.set(...look); o.fov = fov; } }
const snd = (X, name, o) => { const W = S(X).W; return W.snd.play(name, o); };

// her wreck's one light comes on (and the engine under it)
function eyeOn(X, quiet = false) {
  const s = S(X), hc = s.road.herCar;
  if (hc.lit) return;
  hc.lit = true; s.rev = Math.max(s.rev, 0.12); s.eyeT = X.T;
  if (!quiet) { snd(X, 'click', { x: hc.x, gain: 1 }); snd(X, 'pop', { x: hc.x, gain: 0.8, at: 0.04 }); }
  if (!s.engine) s.engine = s.W.snd.loop('engine', { x: hc.x, gain: 0.7, fadeIn: 0.25 });
}
// the stage as a step finds it, when it's the first one played (her bar emptied late): absolute, every time
function mark(X, k) {
  const s = S(X); if (s.k0 !== k || s.marked) return; s.marked = true;
  const road = s.road, hc = road.herCar, p = X.you, b = X.her;
  const put = (w, m, facing, y = 0) => { X.place(w, m[0], m[1], facing); X.lift(w, y, 0.01); };
  if (k >= 1) eyeOn(X, true);
  if (k <= 1) { put('you', M.you0, EAST); put('her', k ? M.herC : M.her0, WEST); X.clip('you', 'Sword_Idle', { loop: true }); X.clip('her', 'Zombie_Walk_Fwd_Loop', { loop: true, speed: 1.3 }); }
  else if (k === 2) { put('you', M.youT, EAST); put('her', M.K, WEST); X.clip('you', 'Sword_Idle', { loop: true }); X.clip('her', 'Slide_Exit', { dur: 0.1, from: 0.4, to: 0.45 }); }
  else if (k === 3) { put('you', M.hood, WEST, M.hoodY); put('her', M.up, EAST); X.clip('you', 'Sword_Idle', { loop: true }); X.clip('her', 'Jump_Loop', { loop: true }); s.rev = 0.4; }
  else { put('you', M.edge, WEST, M.hoodY); put('her', M.K, WEST); X.clip('you', 'Crouch_Idle_Loop', { loop: true }); X.clip('her', 'Slide_Exit', { dur: 0.1, from: 0.55, to: 0.62 }); s.rev = 1; s.look = 'car'; }
  if (k === 5) launch(X);
  X.herFace(k >= 4 ? 'wreck_grin' : k >= 2 ? 'wreck_wrecked' : 'wreck_plea');
}
// her car comes: flat out on the last hit, her own way (it never brakes)
function launch(X) {
  const s = S(X), hc = s.road.herCar;
  if (s.go) return;
  eyeOn(X, true); s.rev = 1;
  s.go = { t0: T5, t1: X.f.lastHit, x0: M.car0, x1: M.carK };
  snd(X, 'tick', { x: hc.x }); snd(X, 'roar', { x: hc.x, gain: 1, rate: 1.7 }); snd(X, 'whoosh', { x: 0, at: Math.max(0, X.f.lastHit - X.T - 0.3), rate: 0.7 });
  X.f.fx.sparks(hc.x - 1.6, 0.2, hc.z + 0.8, SPARK, 14); X.f.fx.sparks(hc.x - 1.6, 0.2, hc.z - 0.8, SPARK, 14);
}

// every frame, after the two of them have been posed (track.js update): the scene's tweens, her car, the light it
// throws on them, her head, and the camera when it rides the bonnet
function late(X, dt) {
  const s = S(X), f = X.f, T = X.T, road = s.road, hc = road.herCar, b = X.her, p = X.you;
  for (let i = s.anims.length - 1; i >= 0; i--) { const a = s.anims[i], k = clamp((T - a.t0) / a.dur, 0, 1); a.fn(a.ease(k), k); if (k >= 1) s.anims.splice(i, 1); }
  // ---- her car: idling, revving (it squats on its back wheels and they smoke), coming
  if (hc.lit && !s.crashed) {
    const r = s.rev, beat = f.bm.pulse(f.t, 7);
    hc.blaze = 0.45 + 0.75 * r + 0.18 * beat;
    hc.roll = Math.sin(T * 53) * 0.004 * (1 + 4 * r); hc.y = Math.abs(Math.sin(T * 37)) * 0.006 * (1 + 3 * r); hc.pitch = 0.012 * r + (s.go ? 0.03 : 0);
    if (s.go) {
      const g = s.go, k = clamp((T - g.t0) / (g.t1 - g.t0), 0, 1), x = g.x0 + (g.x1 - g.x0) * k * k, v = (x - hc.x) / Math.max(1e-3, dt);
      hc.x = x; hc.z = LZ; hc.yaw = 0;
      road.knock(hc.x + 1.2, hc.z, 1.5, 1, 0, clamp(v, 8, 30));
      if (k < 1 && (s.fxN = (s.fxN || 0) + 1) % 2 === 0) { f.fx.sparks(hc.x - 1.2, 0.12, hc.z + (s.fxN % 4 ? 0.8 : -0.8), SPARK, 4, WEST); f.fx.dust(hc.x - 1.7, hc.z, 2); }
    } else if (r > 0.5 && (s.fxN = (s.fxN || 0) + 1) % 3 === 0) { f.fx.dust(hc.x - 1.75, hc.z + (s.fxN % 2 ? 0.8 : -0.8), 3); if (s.fxN % 9 === 0) f.fx.sparks(hc.x - 1.6, 0.12, hc.z + 0.8, SPARK, 3, WEST); }
    if (s.engine) s.engine.set({ x: hc.x, rate: 0.9 + 0.9 * r, gain: 0.5 + 0.5 * r });
    // its light on the two of them (the flash light, unless a crash's own flash is brighter)
    const W = s.W, mx = Math.min(p.x, b.x), want = (1.6 + 4.6 * r) * clamp(1 - (mx - hc.x - 2) / 26, 0.35, 1) * (T - s.eyeT < 0.12 ? 2.2 : 1);
    if (W.flashK * 1.1 < want) { W.flash.position.set(mx - 1.7, 1.25, LZ + 0.5); W.flash.color.copy(PINKW); W.flash.intensity = want; W.flash.distance = 9; }
  }
  road.placeCars();
  // ---- her head: where she looks, and the turn of it that's YOU's doing (after her rig has posed her)
  if (b.rig && !b.fig.shattered) {
    b.rig.lookTarget = s.look === 'car' ? s.v.set(hc.x + 1.6, 0.7, hc.z) : s.look === 'you' ? s.v.set(p.x, 1.45 + p.y, p.z) : null;
    if (s.head) { const head = b.rig.bones.Head || b.rig.bones.head; if (head) head.rotation.y += s.head; }
  }
  // ---- the camera on her car's bonnet, looking down the lane at the two of them
  if (s.rig === 'bonnet') camNow(X, [hc.x + 0.12, 1.44 + (hc.y || 0), LZ + 0.1], [M.K[0] + 0.25, 1.12, LZ], 52);
}

// the crash: her car's nose and YOU's, and her between
function crash(X, ok) {
  const s = S(X), f = X.f, road = s.road, hc = road.herCar, yc = road.youCar, W = s.W;
  s.crashed = true; s.go = null; s.rig = null; s.rev = 0;
  hc.x = M.carK; hc.yaw = 0; hc.roll = 0; hc.y = 0; hc.pitch = 0; hc.lit = false;
  // both noses fold; YOU's car is shunted back down the road, its door swinging
  const c0 = hc.crumple, door = road.you.door;
  // (her car goes on through where she was: the two noses end together, 1.56 m on, YOU's pushed 0.62 back)
  tween(X, 0.09, (e) => { hc.crumple = c0 + (1.75 - c0) * e; yc.crumple = 0.5 * e; }, 'out');
  tween(X, 0.34, (e) => { yc.x = YOU_CAR.x + 0.62 * e; hc.x = M.carK + 1.56 * e; }, 'out');
  tween(X, 0.5, (e, k) => { yc.pitch = -0.07 * Math.sin(k * Math.PI) * (1 - k); hc.pitch = 0.09 * Math.sin(k * Math.PI) * (1 - k * 0.5); hc.y = 0.1 * Math.sin(k * Math.PI); }, 'linear');
  tween(X, 1.6, (e, k) => { door.rotation.y = 0.81 + 0.5 * Math.exp(-k * 4.5) * Math.sin(k * 21); }, 'linear');
  road.her.parts.lensL.visible = false;                // her headlight is out of it (track.js: it rolls to YOU)
  if (s.engine) { s.engine.stop(0.05); s.engine = null; }
  const x = M.K[0] + 0.2;
  f.fx.sparks(x, 0.8, LZ, SPARK, 70); f.fx.sparks(x, 0.8, LZ, GOLD, 30); f.fx.chips(x, 1.0, LZ, CHERRY, 44); f.fx.chips(x + 0.6, 1.0, LZ, GLASS, 36);
  f.fx.glitter(x, 1.3, LZ, GOLD, 70, 1.6); f.fx.dust(x, LZ + 0.6, 16); f.fx.dust(x, LZ - 0.6, 16);
  f.fx.ring && f.fx.ring(x, LZ, ok ? GOLD : new THREE.Color(2.3, 1.25, 0.6), 4.2);
  road.gust(x, LZ, 0.3, 0.2, 34, 7.5); road.gust(x - 3, LZ, 1, 0, 30, 4);
  W.flashAt(x, 1.4, LZ + 0.6, 18, 0.45, new THREE.Color(1, 0.86, 0.8));
  snd(X, 'crunch', { x, gain: 1 }); snd(X, 'glass', { x, gain: 1, at: 0.04 }); snd(X, 'boom', { x, gain: 0.7, rate: 1.3 }); snd(X, 'clang', { x, gain: 0.6, at: 0.07 }); snd(X, 'chirp', { x: 7.4, at: 0.62 });
}

export const death = {
  beats: 28,
  enter(X, ex) {
    const f = X.f, W = f.kml, road = W.road, p = X.you, b = X.her;
    const s = X._k = { W, road, anims: [], rev: 0, head: 0, look: 'you', k0: ex ? Math.max(0, ex.i) : 0, v: new THREE.Vector3(), eyeT: -9 };
    W.sceneLate = (dt) => late(X, dt);
    // the stage: her wreck back where it stood when the song began, nose to nose with YOU's down the lane, dark;
    // YOU's car where YOU left it; and the rock that fell in front of the audience's view of that lane, gone
    Object.assign(road.herCar, { mode: 'wreck', x: M.car0, z: LZ, yaw: 0, crumple: 1, lit: false, blaze: 0.5, y: 0, pitch: 0, roll: 0 });
    road.youCar = { ...YOU_CAR }; road.placeCars();
    const rock = road.rocks[3];
    if (rock && rock.obj.visible && rock.s.hits < 2) { rock.s.hits = 2; rock.obj.visible = false; f.fx.chips(rock.x, 0.7, rock.z, new THREE.Color(0.5, 0.48, 0.46), 36); f.fx.dust(rock.x, rock.z, 14); }
    X.follow('two', { dist: 5.6 });
    if (s.k0 > 0) return;                      // (her bar emptied late: the first step played sets its own stage)
    // they come to the lane: YOU with her back to her car, she with hers to YOU's
    X.go('you', ...M.you0, 0.62, { ease: 'out' }); X.go('her', ...M.her0, 0.7, { ease: 'out' });
    X.face('you', ...M.her0); X.face('her', ...M.you0);
    X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.2 }); X.clip('her', 'Sprint_Loop', { loop: true, speed: 1.1 });
    X.after(0.62, () => { p.facing = EAST; X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
    X.after(0.7, () => { b.facing = WEST; X.clip('her', 'Zombie_Walk_Fwd_Loop', { loop: true, fade: 0.15, speed: 0.01 }); });
    X.herFace('wreck_kiss');
  },
  steps: [
    // she comes in for the kiss. One hand on her face: that's as far as she gets
    { t: T1, key: 'parry',
      lead(X, st) {
        mark(X, 0);
        const b = X.her;
        X.place('you', ...M.you0, EAST); b.facing = WEST;
        X.go('her', ...M.her1, Math.max(0.1, st.t - X.t), { ease: 'in' }); X.clip('her', 'Zombie_Walk_Fwd_Loop', { loop: true, speed: 1.7, fade: 0.1 });
        X.herFace('wreck_kiss'); X.follow('two', { dist: 5.3 });
      },
      do(X, ok) {
        const p = X.you, b = X.her, f = X.f;
        X.place('her', ...M.her1, WEST);
        if (ok) {
          X.clip('you', 'Spell_Simple_Shoot', { dur: 0.09, from: 0.05, to: 0.42 });
          X.fx.caught(b.x - 0.4, 1.55, LZ, true); X.sfx.catch && X.sfx.catch('perfect', f.pan(p.x));
          X.hit({ power: 0.7, gold: true, y: 1.6, quiet: true, dir: EAST });
          X.clip('her', 'Zombie_Walk_Fwd_Loop', { loop: true, speed: 1.5 });
        } else {
          // she gets there: it lands; then YOU has her at arm's length all the same
          X.go('her', M.you0[0] + 0.62, LZ, 0.08, { ease: 'out' }); X.clip('you', 'Hit_Head', { dur: 0.32 });
          X.fx.glitter(p.x + 0.3, 1.6, LZ, new THREE.Color(3.2, 0.7, 1.6), 16, 0.4); snd(X, 'pop', { x: p.x, gain: 0.7 });
          X.after(0.34, () => { X.clip('you', 'Spell_Simple_Shoot', { dur: 0.1, from: 0.05, to: 0.42 }); X.go('her', ...M.her1, 0.1, { ease: 'out' }); X.hit({ power: 0.5, gold: false, y: 1.6, quiet: true, dir: EAST }); });
        }
        X.after(0.22, () => X.follow('her', { dist: 3.1, h: 1.6, fov: 30, blend: 0.45 }));
        X.after(0.55, () => X.herFace('wreck_plea'));
        // "Just fuck me": bar 101's one, behind YOU: her car. She sees it over YOU's shoulder, and has YOU by then
        X.at(EYE, () => eyeOn(X));
        X.at(EYE + 0.28, () => {
          X.herFace('wreck_grin');
          X.go('her', ...M.herC, 0.3, { ease: 'out' }); X.clip('her', 'Zombie_Scratch', { dur: 0.45, from: 0.18, to: 0.5 });
          X.clip('you', 'Sword_Block', { dur: 0.25, from: 0.05, to: 0.26 });
        });
      } },
    // out of her arms the way the fight taught: through her. Into the nose of YOU's own car
    { t: T2, key: 'dash',
      lead(X, st) {
        mark(X, 1);
        X.place('you', ...M.you0, EAST); X.place('her', ...M.herC, WEST);
        X.clip('you', 'Shield_Dash', { dur: Math.max(0.1, st.t - X.t), from: 0.0, to: 0.1 });
        X.cam({ pos: [2.9, 1.2, 8.7], look: [3.75, 1.0, LZ] }, { fov: 34, blend: 0.45 });
      },
      do(X, ok) {
        const f = X.f, yc = S(X).road.youCar;
        X.clip('you', 'Shield_Dash', { dur: 0.42, from: 0.1, to: 0.62 }); X.clip('her', 'Hit_Knockback', { dur: 0.2, from: 0.02, to: 0.13 });
        X.go('you', ...M.youT, 0.12, { ease: 'out' }); X.go('her', ...M.K, 0.12, { ease: 'out' });
        X.hit({ power: ok ? 1.2 : 0.6, gold: ok, y: 1.2, dir: EAST });
        f.fx.dashStart && f.fx.dashStart(X.you);
        X.after(0.12, () => {
          // the grille
          X.shake(0.7, 0.2); f.fx.dust(M.K[0], LZ + 0.5, 8); f.fx.dust(M.K[0], LZ - 0.5, 8); f.fx.sparks(4.95, 0.7, LZ, SPARK, ok ? 22 : 10, WEST);
          X.sfx.slamSet && X.sfx.slamSet(f.pan(4.9)); snd(X, 'thud', { x: 4.9, gain: 0.9 }); snd(X, 'chirp', { x: 7.4, at: 0.3 });
          tween(X, 0.4, (e, k) => { yc.x = YOU_CAR.x + 0.14 * Math.sin(k * Math.PI) * (1 - k); yc.pitch = -0.035 * Math.sin(k * Math.PI * 2) * (1 - k); }, 'linear');
          X.clip('her', 'Slide_Exit', { dur: 0.22, from: 0.3, to: 0.45, fade: 0.1 }); X.herFace('wreck_wrecked');
          f.fx.dashEnd && f.fx.dashEnd(X.you);
        });
        X.after(0.5, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.2 }));
      } },
    // over her, off her shoulder, onto the bonnet: it lands on bar 103's one
    { t: T3, key: 'jump',
      lead(X, st) {
        mark(X, 2);
        X.place('you', ...M.youT, EAST); X.place('her', ...M.K, WEST);
        X.clip('you', 'NinjaJump_Start', { dur: Math.max(0.1, st.t - X.t), from: 0.0, to: 0.22 });
        X.cam({ pos: [2.1, 0.6, 6.5], look: [4.95, 1.4, LZ] }, { fov: 38, blend: 0.4 });
      },
      do(X, ok) {
        const f = X.f, p = X.you, yc = S(X).road.youCar, s = S(X);
        X.hit({ power: ok ? 0.9 : 0.5, gold: ok, y: 1.15, dir: EAST, quiet: !ok });
        X.go('you', ...M.hood, VAULT, { ease: 'linear', arc: ok ? 1.0 : 0.55, y: M.hoodY });
        X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.06 });
        if (ok) { X.body('you', { pitch: Math.PI * 2 }, VAULT, 'linear'); X.after(VAULT + 0.01, () => { p.rig.body.pitch = 0; }); }
        X.sfx.jump && X.sfx.jump(p);
        X.clip('her', 'Slide_Exit', { dur: 0.3, from: 0.45, to: 0.36 });
        X.after(VAULT, () => {
          // boots on the bonnet
          p.facing = WEST; X.clip('you', 'NinjaJump_Land', { dur: 0.45, fade: 0.04 }); X.sfx.land && X.sfx.land(p, true);
          X.shake(0.5, 0.16); snd(X, 'thud', { x: 5.8, gain: 0.8 }); f.fx.sparks(M.hood[0], M.hoodY + 0.05, LZ, GOLD, ok ? 14 : 5);
          tween(X, 0.45, (e, k) => { yc.pitch = 0.03 * Math.sin(k * Math.PI * 2.5) * (1 - k); yc.y = -0.035 * Math.sin(k * Math.PI) * (1 - k); }, 'linear');
          X.cam({ pos: [3.2, 0.95, 7.4], look: [5.0, 1.45, LZ] }, { fov: 36, blend: 0.5 });
          s.rev = Math.max(s.rev, 0.25);
        });
        X.after(VAULT + 0.45, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.2 }));
        // she gets up after YOU (she only ever comes toward YOU): round, and up, with her arms out
        X.after(0.42, () => { X.clip('her', 'LayToIdle', { dur: 0.7, from: 0.52, to: 1, fade: 0.12 }); X.go('her', ...M.up, 0.6); turn(X, 'her', EAST, 0.6, true); X.herFace('wreck_plea'); });
        X.after(1.12, () => { X.clip('her', 'Jump_Loop', { loop: true, fade: 0.25 }); s.rev = Math.max(s.rev, 0.4); });
      } },
    // from up there: down she goes, on her knees in the lane, facing the way her car is. It hears
    { t: T4, key: 'strike',
      lead(X, st) {
        mark(X, 3);
        X.place('you', ...M.hood, WEST); X.lift('you', M.hoodY, 0.02); X.place('her', ...M.up, EAST);
        X.strike('slam', st.t);
        X.cam({ pos: [3.1, 0.85, 7.0], look: [5.0, 1.5, LZ] }, { fov: 36, blend: 0.3 });
      },
      do(X, ok) {
        const f = X.f, s = S(X), hc = s.road.herCar;
        X.slash('slam', { gold: ok }); X.hit({ power: ok ? 1.6 : 0.8, gold: ok, y: 1.75, dir: WEST });
        turn(X, 'her', WEST, 0.2, true); X.go('her', ...M.K, 0.2, { ease: 'out' });
        X.clip('her', 'Slide_Exit', { dur: 0.26, from: 0.45, to: 0.62, fade: 0.06 }); X.herFace('wreck_wrecked');
        f.fx.ring && f.fx.ring(M.K[0], LZ, ok ? GOLD : new THREE.Color(2.3, 1.25, 0.6), 2.4); f.fx.dust(M.K[0] - 0.3, LZ, 10);
        // her car
        eyeOn(X, true); tween(X, 0.3, (e) => { s.rev = Math.max(s.rev, e); }, 'out');
        snd(X, 'roar', { x: hc.x, gain: 0.9, rate: 0.75 }); X.shake(0.5, 0.3);
        X.after(0.5, () => { s.look = 'car'; X.herFace('wreck_grin'); X.cam({ pos: [6.15, 1.62, 2.08], look: [-7.0, 0.5, 1.2] }, { fov: 33, blend: 0 }); });
        X.after(0.62, () => { X.go('you', ...M.edge, 0.3, { ease: 'inOut' }); X.clip('you', 'Crouch_Idle_Loop', { loop: true, fade: 0.2 }); });
      } },
    // she turns her face up for the kiss. YOU turns it back: look. Her car lets go of the road
    { t: T5, key: 'parry',
      lead(X, st) {
        mark(X, 4);
        const s = S(X);
        X.place('you', ...M.edge, WEST); X.lift('you', M.hoodY, 0.02); X.place('her', ...M.K, WEST);
        s.look = null; tween(X, Math.max(0.1, st.t - X.t - 0.12), (e) => { s.head = -2.2 * e; }, 'inOut'); X.herFace('wreck_kiss');
        X.clip('you', 'Sword_Block', { dur: Math.max(0.1, st.t - X.t), from: 0.02, to: 0.12, fade: 0.15 });
        X.cam({ pos: [2.5, 0.78, 2.95], look: [4.95, 1.18, LZ] }, { fov: 38, blend: 0.3 });
      },
      do(X, ok) {
        const f = X.f, s = S(X), b = X.her, h0 = s.head;
        X.clip('you', 'Sword_Block', { dur: 0.08, from: 0.12, to: 0.3 });
        const snap = () => {
          tween(X, 0.06, (e) => { s.head = h0 * (1 - e); }, 'out'); s.look = 'car'; X.herFace('wreck_grin');
          snd(X, 'snap', { x: b.x, gain: 1 }); X.hit({ power: ok ? 0.9 : 0.5, gold: ok, y: 1.05, quiet: true, dir: WEST });
          if (ok) X.fx.caught(b.x, 1.1, LZ, true);
        };
        if (ok) snap();
        else { X.fx.glitter(b.x + 0.4, 1.3, LZ, new THREE.Color(3.2, 0.7, 1.6), 14, 0.35); snd(X, 'pop', { x: b.x, gain: 0.7 }); X.clip('you', 'Hit_Head', { dur: 0.2 }); X.after(0.14, snap); }
        launch(X);
        X.after(0.07, () => { s.rig = 'bonnet'; });
      } },
    // the last hit: YOU isn't there
    { last: true, key: 'jump',
      lead(X) { mark(X, 5); const s = S(X); if (!s.rig) s.rig = 'bonnet'; },
      do(X, ok) {
        const s = S(X), p = X.you, f = X.f;
        s.okLast = ok;
        crash(X, ok);
        X.shatter({ dir: new THREE.Vector3(0.12, 0.9, 0.42), power: ok ? 1.6 : 1.2, at: new THREE.Vector3(M.K[0] - 0.2, 0.9, LZ) });
        X.cam({ pos: [3.5, 1.3, 10.4], look: [5.0, 1.6, LZ] }, { fov: 36, blend: 0 });
        X.place('you', ...M.edge, WEST); X.lift('you', M.hoodY, 0.001);
        if (ok) {
          // up and over, backwards, onto her own roof
          X.go('you', ...M.roof, 0.6, { ease: 'linear', arc: 1.35, y: M.roofY });
          X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.04 }); X.body('you', { pitch: -Math.PI * 2 }, 0.6, 'linear');
          X.sfx.jump && X.sfx.jump(p);
        } else {
          // late: the shunt throws her off the bonnet, onto the road
          X.go('you', ...M.down, 0.5, { ease: 'out', arc: 0.75, y: 0 }); p.facing = WEST;
          X.clip('you', 'Hit_Knockback', { dur: 0.75, to: 0.9 });
        }
      } },
  ],
  after(X) {
    const s = S(X), p = X.you, f = X.f;
    if (s.okLast) {
      X.after(0.6, () => { p.rig.body.pitch = 0; X.clip('you', 'NinjaJump_Land', { dur: 0.4, fade: 0.04 }); X.sfx.land && X.sfx.land(p, true); f.fx.sparks(M.roof[0], M.roofY, LZ, GOLD, 10); X.shake(0.3, 0.12); });
      // the wave she asked not to get
      X.after(0.98, () => { X.clip('you', 'Yes', { dur: 0.62, from: 0.05, to: 0.6, fade: 0.14 }); X.expr('A_Amused'); });
      X.after(1.6, () => { X.go('you', ...M.down, 0.38, { ease: 'inOut', arc: 0.4, y: 0 }); X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }); turn(X, 'you', WEST, 0.38); });
      X.after(1.98, () => { X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); X.sfx.land && X.sfx.land(p, false); });
    } else {
      X.after(0.5, () => f.fx.dust(M.down[0], M.down[1], 10));
      X.after(0.85, () => X.clip('you', 'LayToIdle', { dur: 0.95, fade: 0.1 }));
      X.after(1.85, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }));
    }
    X.after(0.75, () => X.cam({ pos: [4.4, 1.25, 9.4], look: [5.6, 1.55, LZ] }, { fov: 34, blend: 0.9 }));
  },
  hold: 2.08,
};
