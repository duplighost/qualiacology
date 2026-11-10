// THE PROBLEM SOLVER's end: PUT AWAY. She solved YOU by putting YOUR car at the bottom of her lake; the lake is down on
// her yard for the last chorus, so the car is right there past her balustrade, lamps on. Her last bars are seven
// presses, on the song's own hits (the band's stabs under "the final", then "mine", "now", and the three that end it):
// she's knocked out of her yard and comes down behind YOUR car; she throws the keys (the one move she has left) and
// YOU catches them; a cut off the roof; the key turns and the lid's up; a dash through her backhand; "mine": up she
// goes, over backwards, into the back of the car; "now": the lid comes down on her, twice, and won't shut; and on the
// last hit YOU comes down on it from the air and sits. The lake lets go a beat later (the song's own fall): gravity
// takes the car, tail first ("I just put it in neutral"), YOU is back on her lawn, and the keys go in after it.
// Her voice goes on through the outro ("Don't worry, baby, I kept the spare key") from wherever the car is now; its
// lamps stay on down there for a while.
// (src/game/execution.js runs it: each step's `lead` puts the two of them on their marks as its ring starts to close,
// so the scene works from any step if her bar empties late; `do` is the beat itself. YOUR car, its lid and lamps and
// the flying key ring are the set's: world.js draws them from `world.kill`, which this file owns.)
import * as THREE from 'three';
import { S } from './song.js';
import { SPOTS } from './lake.js';

const GOLD = new THREE.Color(3.2, 2.0, 0.55), PINK = new THREE.Color(3.0, 0.7, 1.6), PORC = new THREE.Color(2.2, 2.1, 2.0);
const SILT = new THREE.Color(0.3, 0.42, 0.4), BUBBLE = new THREE.Color(0.75, 1.0, 1.0);
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const EASE = { linear: (k) => k, in: (k) => k * k, out: (k) => 1 - (1 - k) * (1 - k), inOut: (k) => k * k * (3 - 2 * k), back: (k) => { const c = 2.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };

// the song's hits it's cut to (seconds)
const T = { down: S.lid, keys: 93.822, cut: 94.577, pop: 95.331, dash: 96.462, lift: 97.593, inside: 98.347, slam1: 99.101, slam2: 99.854, top: 100.233,
  knock: 100.99, off: 101.16, toss: 102.5, plop: 102.849 };
// YOUR car as the scene has it: where the lake left it, level, its wheels on the lakebed's light (the floor the two of
// them stand on out there is the lawn's level, 0)
const CAR = { x: SPOTS.sunkCar.x, z: SPOTS.sunkCar.z };
const OPEN = 1.12;                       // the lid's angle, up
const IN_PITCH = -1.95;                  // her, on her back in it, her legs in the air
// their marks (x, z; heights are from the lawn's level)
const M = {
  herIn: [1.1, 12.0],                    // where she comes down, behind the car
  youOn: [-1.15, 9.45], onY: 1.08,       // YOU on the car's back
  youA: [-0.15, 11.8],                   // down beside her: the cut
  herB: [2.3, 12.1],                     // where the cut leaves her
  youB: [4.5, 12.1],                     // through her and out the other side: the dash
  in: [-1.0, 9.72], inY: -0.42,          // in the back of the car (her feet's height: her hips are 1.25 over them)
  tail: [0.3, 10.95],                    // YOU at the corner of the tail, by the lid
  top: [-0.95, 10.3], topY: 1.55,        // over it
  sit: [-1.0, 10.42], sitY: 0.36,        // on it
  shore: [-1.0, 4.3],                    // back on her lawn, at her balustrade
};
// the pictures, all from out in the lake looking back at her house (her neon over it all)
const SHOT = {
  wide: { pos: [-1.3, 1.25, 18.8], look: [-0.2, 1.05, 10.6], fov: 36 },
  keys: { pos: [3.7, 1.2, 15.9], look: [-0.2, 1.5, 10.4], fov: 36 },
  cut: { pos: [0.5, 1.1, 17.3], look: [0.45, 1.05, 11.9], fov: 34 },
  two: { pos: [2.1, 1.1, 18.3], look: [2.1, 1.0, 12.0], fov: 36 },
  hoop: { pos: [5.7, 1.6, 17.6], look: [0.5, 1.5, 10.6], fov: 38 },
  trunk: { pos: [-4.6, 1.5, 15.6], look: [-0.6, 1.0, 9.9], fov: 36 },
  drop: { pos: [-4.8, 1.45, 15.9], look: [-0.7, 1.55, 9.9], fov: 40 },
  gone: { pos: [-3.6, 1.7, 16.4], look: [-1.0, 1.3, 7.5], fov: 38 },
  shore: { pos: [-2.5, 1.45, 8.9], look: [-0.95, 1.3, 4.3], fov: 34 },
};

const lake = (X) => X.f.lake;
const kill = (X) => X.f.lake.world.kill;
const tw = (K, key, to, dur, ease = 'out') => { K.tw = K.tw.filter((w) => w.key !== key); K.tw.push({ key, from: K[key], to, t0: K.t, dur: Math.max(1e-3, dur), ease: EASE[ease] || EASE.out }); };
const _v = new THREE.Vector3();
const hand = (o, side = 'l') => { const b = (o.fig ? o.fig.bones : o.rig.bones)['hand_' + side]; return b ? b.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(o.x, 1.2, o.z); };
// where YOU takes something thrown at her: in front of her collarbone
const chest = (p) => new THREE.Vector3(p.x + Math.sin(p.facing) * 0.32, (p.y || 0) + 1.38, p.z + Math.cos(p.facing) * 0.32);
// the lid's free edge, wherever it is
function lidEdge(K) { const c = Math.cos(K.hatch), s = Math.sin(K.hatch), y = -0.388 * c + 1.136 * s, z = -0.388 * s - 1.136 * c; return { x: K.x, y: K.y + 1.314 + y, z: K.z + 0.482 - z }; }

// someone on a mark, now, unless they're already on their way to it
function put(X, w, x, z, y = 0, facing) {
  const o = X.who(w), going = X.tweens.find((t) => t.o === o && t.kind === 'xz');
  if (going && Math.hypot(going.tx - x, going.tz - z) < 0.35) { if (facing !== undefined) o.facing = facing; return; }
  X.place(w, x, z, facing); X.lift(w, y, 0.001);
}
// silt off the lakebed and a few bubbles going up out of it
function puff(L, x, y, z, n = 12, k = 1) {
  const P = L.world.particles;
  P.burst(n, { x, y: y + 0.12, z, speed: 1.5 * k, up: 0.45, life: 1.1, size: 0.2 * k, grow: 0.5, color: SILT, gravity: -0.2, shape: 0, alpha: 0.38, drag: 2.2 });
  for (let i = 0; i < n * 0.7; i++) P.add({ x: x + (Math.random() - 0.5) * 0.9 * k, y: y + 0.2 + Math.random() * 0.5, z: z + (Math.random() - 0.5) * 0.9 * k, vy: 1.4 + Math.random() * 2.4, life: 1.5 + Math.random(), size: 0.035 + Math.random() * 0.05, color: BUBBLE, wobble: 1.6, shape: 2, alpha: 0.75 });
}

// ------------------------------------------------------------------------------------------------ what the set draws
function newKill(f) {
  return { on: true, t: f.t, x: CAR.x, y: 0, z: CAR.z, pitch: 0, hatch: 0, head: 2.4, beam: 0.75, tail: 1.2, dip: 0, dipV: 0, vis: true,
    glow: 0, gx: CAR.x, gz: CAR.z + 1.5, tw: [], keys: { mode: 'her' }, legs: 0, gone: false, bub: 0 };
}
// every frame, from the track's update (in the scene and after it: the car going, its lamps down in the lake)
export function killFrame(f, L, dt) {
  const w = L.world, K = w.kill; if (!K) return;
  const X = f.exec && f.exec.X, ts = L.songT;
  K.t = X ? X.T : ts;
  for (let i = K.tw.length - 1; i >= 0; i--) { const a = K.tw[i], k = clamp((K.t - a.t0) / a.dur, 0, 1); K[a.key] = a.from + (a.to - a.from) * a.ease(k); if (k >= 1) K.tw.splice(i, 1); }
  // the car's springs: it dips under what lands on it
  K.dipV += (-K.dip * 170 - K.dipV * 13) * dt; K.dip += K.dipV * dt;
  // in the back of it she kicks
  if (K.legs > 0 && f.boss.scene && f.boss.rig) f.boss.rig.body.roll = Math.sin(K.t * 15) * 0.09 * K.legs;
  // the lake lets go (the song's fall): gravity takes it, tail first, down the bank into the deep
  if (ts >= S.drain && !K.gone) {
    const u = ts - S.drain;
    if (!K.rolling) { K.rolling = true; K.tw = K.tw.filter((a) => a.key !== 'hatch'); K.hatch = 0; L.snd.play('creak', K.x, { gain: 0.8, dry: true }); L.snd.play('scrape', K.x, { gain: 0.6, dry: true }); puff(L, K.x, 0, K.z + 2, 18, 1.5); }
    K.z = CAR.z + 7.5 * u * u; K.y = -4.4 * u * u; K.pitch = -0.36 * Math.min(1, u * 2.2);
    K.head = 2.4; K.beam = Math.max(0, 0.75 - u); K.tail = 1.2 + 2 * Math.min(1, u * 3);
    if (Math.random() < dt * 40) w.particles.add({ x: K.x + (Math.random() - 0.5) * 1.6, y: Math.max(0.05, K.y + 1.2), z: K.z + (Math.random() - 0.5) * 3, vy: 1.5 + Math.random() * 2, life: 1.2, size: 0.04 + Math.random() * 0.06, color: BUBBLE, wobble: 1.5, shape: 2, alpha: 0.8 });
    if (u > 0.85) { K.gone = true; K.vis = false; K.glow = 0.95; K.gx = K.x; K.gz = Math.min(15.5, K.z); }
  }
  // gone: its lamps, still on, under the lake where it went down; a bubble or two; they go out as her porch light does
  if (K.gone) {
    K.gz = Math.min(11.6, K.gz);
    const left = clamp((S.thump - ts) / (S.thump - S.drain), 0, 1);
    K.glow = ts >= S.thump + 0.25 ? 0 : ts >= S.thump ? 0.9 * (Math.sin((ts - S.thump) * 50) > 0 ? 1 : 0.2) : 0.3 + 0.6 * left;
    if (ts < S.thump + 0.6 && (K.bub -= dt) <= 0) {
      K.bub = ts >= S.thump ? 0.05 : 0.35 + Math.random() * 0.9;
      for (let i = 0; i < (ts >= S.thump ? 2 : 1 + (Math.random() < 0.3)); i++) w.particles.add({ x: K.gx + (Math.random() - 0.5) * 1.2, y: 0.04, z: K.gz + (Math.random() - 0.5) * 0.9, vy: 0.25, life: 0.5 + Math.random() * 0.4, size: 0.04 + Math.random() * 0.05, color: BUBBLE, wobble: 0.6, shape: 2, alpha: 0.8 });
    }
  }
  keysFrame(f, L, K, dt);
}
// the key ring: on her finger (her own), in the air, on YOU's, in the lake
function keysFrame(f, L, K, dt) {
  const k = K.keys, o = L.world.keyRing; if (!o) return;
  const flying = k.mode === 'fly';
  if (k.mode === 'her' || k.mode === 'gone') { o.visible = false; return; }
  o.visible = true; o.userData.spin.rotation.z += dt * (flying ? 24 : 9);
  if (flying) {
    const u = clamp((K.t - k.t0) / Math.max(0.02, k.t1 - k.t0), 0, 1), to = k.to();
    o.position.lerpVectors(k.from, to, u); o.position.y += k.arc * 4 * u * (1 - u);
    o.rotation.set(K.t * 11, K.t * 7, 0);
    if (u >= 1) { if (k.trail) { k.trail.live = false; k.trail = null; } const then = k.then; k.mode = k.next || 'wait'; k.then = null; if (then) then(); }
  } else if (k.mode === 'you') {
    // hanging from YOU's left hand, turning
    const h = hand(f.player, 'l'); o.position.set(h.x, h.y - 0.17, h.z); o.rotation.set(0, f.player.facing + Math.PI / 2, 0);
  }
}
// the keys go from where they are to `to()` (a point that may move), arriving at song time t1
function fling(X, t1, to, { arc = 0.5, next = 'wait', then = null, color = GOLD } = {}) {
  const K = kill(X), o = lake(X).world.keyRing, k = K.keys;
  if (k.trail) k.trail.live = false;
  const from = k.mode === 'her' ? hand(X.her, 'r') : o.position.clone();
  K.keys = { mode: 'fly', t0: K.t, t1, from, to, arc, next, then, trail: X.fx.trail ? X.fx.trail(() => o.position, { w: 0.14, color, len: 12, life: 0.16 }) : null };
  o.position.copy(from); o.visible = true;
}
function keysToYou(X) { const K = kill(X); if (K.keys.mode === 'her' || K.keys.mode === 'wait') { lake(X).solver.keysOn(false); if (K.keys.trail) K.keys.trail.live = false; K.keys = { mode: 'you' }; } }

// ------------------------------------------------------------------------------------------------ the pieces of it
// the key turns: the lid springs up
function popLid(X, quiet = false) {
  const K = kill(X), L = lake(X);
  if (K.hatch > OPEN - 0.3 || K.tw.some((a) => a.key === 'hatch')) return;
  tw(K, 'hatch', OPEN, 0.32, 'back'); K.dipV = 0.5; K.tail = 3.2; tw(K, 'tail', 1.2, 0.5);
  if (!quiet) { L.snd.play('click', K.x, { gain: 0.9 }); L.snd.play('creak', K.x, { gain: 0.8, at: 0.04 }); L.snd.play('tonk', K.x, { gain: 0.5, at: 0.2 }); }
}
// she's in the back of YOUR car, on her back, her legs out over the tail. deep 0..1: how far in the lid has put her
function inTrunk(X, deep = 0, sec = 0.001) {
  const K = kill(X), b = X.her;
  if (sec <= 0.002) { X.place('her', ...M.in, 0); b.rig.body.spin = 0; }
  X.lift('her', M.inY - 0.16 * deep, sec); X.body('her', { pitch: IN_PITCH - 0.7 * deep, spin: 0 }, sec, 'out');
  K.legs = 1 - 0.6 * deep; b.markK = 0;
}
// she lands in it
function inside(X, ok) {
  const K = kill(X), L = lake(X), b = X.her;
  inTrunk(X, 0);
  K.dipV = -2.2; K.tail = 3.5; tw(K, 'tail', 1.2, 0.6);
  X.shake(0.7, 0.2); X.f.cam.kick(1.4);
  X.fx.chips(K.x, 1.1, M.in[1] + 0.3, PORC, 14); X.fx.sparks(K.x, 1.0, M.in[1] + 0.4, GOLD, ok ? 14 : 6);
  puff(L, K.x, 0, K.z + 2.6, 14, 1.2);
  L.snd.play('plateHeavy', K.x, { gain: 0.9 }); L.snd.play('tonk', K.x, { gain: 0.8 }); L.snd.play('creak', K.x, { gain: 0.6, at: 0.1 });
  X.clip('her', 'Jump_Loop', { loop: true, fade: 0.08, speed: 2.2 });
  L.solver.sceneFace('CUE', 0.05);
}
// the lid comes down on her: n 0, 1 (it won't shut on her)
function slam(X, ok, n) {
  const K = kill(X), L = lake(X);
  const low = [0.6, 0.36][n] + (ok ? 0 : 0.2), back = [0.94, 0.62][n];
  tw(K, 'hatch', low, 0.07, 'in');
  X.after(0.07, () => {
    const e = lidEdge(K);
    X.hit({ power: ok ? 1.15 + 0.25 * n : 0.5, gold: ok, at: { x: e.x + 0.2, y: e.y, z: e.z }, dir: Math.PI });
    X.fx.chips(e.x, e.y, e.z, PORC, ok ? 12 + 6 * n : 5, 0);
    K.dipV = -1.3 - 0.5 * n;
    L.snd.play('doorClose', K.x, { gain: 0.75 + 0.15 * n, rate: 1.15 - 0.1 * n }); L.snd.play('plateLight', K.x, { gain: 0.9 });
    if (ok) inTrunk(X, 0.45 * (n + 1), 0.16);
    tw(K, 'hatch', back, 0.3, 'out');
  });
}
// everything as it stands when step n's ring starts to close (the scene can start on any of them)
function ensure(X, n) {
  const K = kill(X);
  if (n >= 1) keysToYou(X);
  if (n >= 2 && n <= 4) popLid(X, true);
  if (n >= 4 && !K.tw.some((a) => a.key === 'hatch') && K.hatch < 0.3) K.hatch = n === 4 ? OPEN : n === 5 ? 0.94 : 0.62;
  if (n >= 4) { const o = X.her, going = X.tweens.find((t) => t.o === o && t.kind === 'xz'); if (!going && Math.hypot(o.x - M.in[0], o.z - M.in[1]) > 0.3) { inTrunk(X, [0, 0.45, 0.9][n - 4]); X.clip('her', 'Jump_Loop', { loop: true, fade: 0.05, speed: 2.2 }); lake(X).solver.sceneFace('CUE', 0.05); } }
}

// ------------------------------------------------------------------------------------------------ the scene
export const death = {
  beats: 12,                 // from "heaven's sake", a beat before "the final" comes in (91.56)
  hold: 2.4,
  enter(X, ex) {
    const f = X.f, L = f.lake, w = L.world, sv = L.solver, b = X.her, p = X.you;
    w.kill = newKill(f);
    X.shatter({ none: true });              // she isn't broken where she stands: she's put away
    b.root.visible = true; b.markK = 0; sv.keysOn(true);
    X.cam(SHOT.wide);
    const first = ex.steps[ex.i], room = first.lead0 - X.t;
    if (ex.i > 0 || room < 1.0) {
      // her bar emptied part-way into it: they're out there already, and the next press's lead puts them on its marks
      put(X, 'her', ...M.herB, 0, -Math.PI / 2); put(X, 'you', ...M.youA, 0, Math.PI / 2);
      X.clip('her', 'Idle_Loop', { loop: true }); X.clip('you', 'Sword_Idle', { loop: true });
      return;
    }
    // knocked clean out of her yard: over her balustrade and YOUR car, turning over, down behind it on the downbeat
    const tH = clamp(T.down - X.t, 0.5, room - 0.55);
    X.place('her', 0.4, 4.9, 0); X.lift('her', 1.7, 0.001);
    b.rig.body.pitch = TAU; X.body('her', { pitch: 0 }, tH, 'linear');
    X.go('her', ...M.herIn, tH, { ease: 'linear', arc: 1.5, y: 0 });
    X.clip('her', 'Jump_Loop', { loop: true, fade: 0.05, speed: 1.6 });
    sv.sceneFace('CUE', 0.05);
    X.after(tH, () => {
      b.rig.body.pitch = 0;
      X.clip('her', 'NinjaJump_Land', { dur: 0.5, fade: 0.04 }); sv.sceneFace('REAL', 0.05);
      X.shake(0.8, 0.22); X.f.cam.kick(1.6); puff(L, M.herIn[0], 0, M.herIn[1], 18, 1.4); X.fx.dust(M.herIn[0], M.herIn[1], 10);
      X.fx.chips(M.herIn[0], 0.4, M.herIn[1], PORC, 12);
      L.snd.play('woodHeavy', M.herIn[0], { gain: 0.8 }); L.snd.play('plateHeavy', M.herIn[0], { gain: 0.7 });
      X.face('her', ...M.youOn);
      X.after(0.5, () => X.clip('her', 'Idle_Loop', { loop: true, fade: 0.2 }));
    });
    // and YOU after her: onto the back of the car
    const tY = clamp(room - tH - 0.06, 0.4, 0.8), t0 = room - 0.03 - tY;
    X.place('you', -2.6, 4.5, 0); X.lift('you', 0, 0.001); X.clip('you', 'Sword_Idle', { loop: true });
    X.after(t0, () => { X.go('you', ...M.youOn, tY, { ease: 'linear', arc: 1.5, y: M.onY }); X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.06 }); });
    X.after(t0 + tY, () => {
      const K = kill(X); K.dipV = -1.5; L.snd.play('tonk', CAR.x, { gain: 0.9 }); L.snd.play('creak', CAR.x, { gain: 0.5, at: 0.06 });
      X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); X.face('you', ...M.herIn); X.shake(0.3, 0.1);
    });
  },
  steps: [
    // the one move she has left: the keys. Caught: they're YOURS again, and the car knows it
    { t: T.keys, key: 'parry',
      lead(X, s) {
        const K = kill(X), sv = lake(X).solver;
        put(X, 'her', ...M.herIn, 0); put(X, 'you', ...M.youOn, M.onY);
        X.face('her', ...M.youOn); X.face('you', ...M.herIn);
        if (K.keys.mode !== 'her') { K.keys = { mode: 'her' }; }
        sv.keysOn(true); sv.sceneFace('TALK', 0.1);
        const fly = 0.34, wind = Math.max(0.14, s.t - fly - X.t);
        X.clip('her', 'OverhandThrow', { dur: wind / 0.47, from: 0.25, to: 0.72, fade: 0.06 });
        X.at(s.t - fly, () => { const p = X.you; sv.keysOn(false); lake(X).snd.play('coins', X.her.x, { gain: 0.8 }); fling(X, s.t, () => chest(p), { arc: 0.45, color: PINK }); });
        X.cam(SHOT.keys, { blend: 0.4 });
      },
      do(X, ok) {
        const K = kill(X), L = lake(X), p = X.you, c = chest(p);
        L.solver.keysOn(false);
        if (ok) {
          X.clip('you', 'Sword_Block', { dur: 0.12, from: 0.08, to: 0.3 }); X.fx.caught(c.x, c.y, c.z, true); X.sfx.catch && X.sfx.catch('perfect', 0);
          L.snd.play('coins', p.x, { gain: 1 });
          if (K.keys.trail) K.keys.trail.live = false; K.keys = { mode: 'you' };
          // the car knows whose keys those are
          K.head = 5.5; tw(K, 'head', 2.4, 0.6); K.beam = 1.5; tw(K, 'beam', 0.75, 0.6); K.tail = 4; tw(K, 'tail', 1.2, 0.6); L.snd.play('honk', CAR.x, { gain: 0.5 });
          X.expr('A_Amused'); L.solver.sceneFace('REAL', 0.06);
          X.after(0.22, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }));
        } else {
          // off her collarbone, up, and into her hand after all
          X.clip('you', 'Hit_Chest', { dur: 0.34 }); X.fx.sparks(c.x, c.y, c.z, new THREE.Color(2.4, 2.4, 2.6), 10);
          L.snd.play('coins', p.x, { gain: 0.7, rate: 0.8 }); L.snd.play('tonk', p.x, { gain: 0.5 });
          fling(X, K.t + 0.44, () => hand(p, 'l'), { arc: 0.5, next: 'you' });
          X.after(0.4, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }));
        }
        X.after(0.3, () => X.clip('her', 'Idle_Loop', { loop: true, fade: 0.2 }));
      } },
    // off the car and down on her: the cut. She turns right round on her heel
    { t: T.cut, key: 'strike',
      lead(X, s) {
        ensure(X, 1);
        put(X, 'her', ...M.herIn, 0); put(X, 'you', ...M.youOn, M.onY); X.faceEach();
        X.strike('dive', s.t);
        X.go('you', ...M.youA, Math.max(0.08, s.t - X.t), { ease: 'in', arc: 0.5, y: 0 });
        X.cam(SHOT.cut, { blend: 0.35 });
      },
      do(X, ok) {
        const L = lake(X), b = X.her;
        X.slash('dive', { gold: ok }); X.hit({ power: ok ? 1.35 : 0.6, gold: ok });
        puff(L, M.youA[0], 0, M.youA[1], 8, 0.9); kill(X).dipV = 1.2;
        b.rig.body.spin = (ok ? 2 : 1) * TAU; X.body('her', { spin: 0 }, ok ? 0.62 : 0.4, 'out');
        X.go('her', ...M.herB, 0.32, { ease: 'out' });
        X.clip('her', 'Hit_Chest', { dur: 0.5 }); L.solver.sceneFace('WRECKED', 0.05);
        X.after(0.55, () => { X.face('her', ...M.youA); X.clip('her', 'Idle_Loop', { loop: true, fade: 0.2 }); });
        X.after(0.42, () => { X.face('you', ...M.herB); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); });
        // the key turns (the band's next stab): the lid's up
        X.at(T.pop - 0.16, () => X.clip('you', 'Interact', { dur: 0.5, from: 0.25, to: 0.62, fade: 0.08 }));
        X.at(T.pop, () => { popLid(X); X.her.facing += 0.5; L.solver.sceneFace('CUE', 0.05); });
        X.at(T.pop + 0.4, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }));
      } },
    // her backhand, and YOU through it and out the other side
    { t: T.dash, key: 'dash',
      lead(X, s) {
        ensure(X, 2);
        put(X, 'her', ...M.herB, 0); put(X, 'you', ...M.youA, 0); X.faceEach();
        X.strike('stinger', s.t);
        X.at(s.t - 0.3, () => { X.faceEach(); X.clip('her', 'Melee_Hook', { dur: 0.6, fade: 0.06 }); lake(X).solver.sceneFace('REAL', 0.05); });
        X.cam(SHOT.two, { blend: 0.4 });
      },
      do(X, ok) {
        const L = lake(X), b = X.her, p = X.you;
        X.go('you', ...M.youB, 0.16, { ease: 'out' });
        X.fx.dashStart && X.fx.dashStart(p); X.after(0.22, () => X.fx.dashEnd && X.fx.dashEnd(p)); X.sfx.dash && X.sfx.dash(p);
        X.slash('stinger', { gold: ok }); X.hit({ power: ok ? 1.4 : 0.6, gold: ok, dir: Math.PI / 2 });
        // she goes round like a top, and stops with her back to the car
        X.face('her', ...M.youB); b.rig.body.spin = -(ok ? 3 : 1) * Math.PI; X.body('her', { spin: 0 }, ok ? 0.7 : 0.4, 'out');
        X.clip('her', 'Hit_Knockback', { dur: 0.7, to: 0.5 }); L.solver.sceneFace('WRECKED', 0.05);
        X.after(0.24, () => { X.face('you', ...M.herB); X.clip('you', ok ? 'Sword_Idle' : 'Hit_Chest', ok ? { loop: true, fade: 0.12 } : { dur: 0.3 }); });
        X.after(0.7, () => X.clip('her', 'Idle_Loop', { loop: true, fade: 0.2 }));
      } },
    // "mine": up she goes, over backwards, into the back of YOUR car
    { t: T.lift, key: 'jump',
      lead(X, s) {
        ensure(X, 3);
        put(X, 'her', ...M.herB, 0); put(X, 'you', ...M.youB, 0); X.faceEach();
        X.strike('lift', s.t);
        X.go('you', M.herB[0] + 1.15, M.herB[1], Math.max(0.08, s.t - X.t - 0.02), { ease: 'in' });
        X.clip('her', 'Idle_Loop', { loop: true, fade: 0.15 });
        X.cam(SHOT.hoop, { blend: 0.45 });
      },
      do(X, ok) {
        const L = lake(X), b = X.her;
        X.slash('lift', { gold: ok }); X.hit({ power: ok ? 1.5 : 0.7, gold: ok, dir: -Math.PI / 2 });
        puff(L, M.herB[0], 0, M.herB[1], 8, 0.9);
        const fly = Math.max(0.3, T.inside - X.t);
        b.facing = 0; b.rig.body.spin = Math.PI / 2; b.rig.body.pitch = TAU;
        X.body('her', { spin: 0, pitch: IN_PITCH }, fly, 'linear');
        X.go('her', ...M.in, fly, { ease: 'linear', arc: ok ? 2.3 : 1.5, y: M.inY });
        X.clip('her', 'Jump_Loop', { loop: true, fade: 0.06, speed: 2 }); L.solver.sceneFace('CUE', 0.05);
        // YOU goes up with it, and comes down running for the car
        X.lift('you', 1.2, 0.26, 'out'); X.after(0.06, () => X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }));
        X.after(0.3, () => X.go('you', ...M.tail, 0.42, { ease: 'inOut', y: 0 }));
        X.after(0.72, () => { X.face('you', M.in[0], M.in[1]); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); });
        X.at(T.inside - 0.3, () => X.cam(SHOT.trunk, { blend: 0.32 }));
        X.at(T.inside, () => inside(X, ok));
      } },
    // "now": the lid comes down on her
    { t: T.slam1, key: 'strike',
      lead(X, s) { ensure(X, 4); put(X, 'you', ...M.tail, 0); X.face('you', M.in[0], M.in[1] + 0.2); X.strike('back', s.t); X.cam(SHOT.trunk, { blend: 0.3 }); },
      do(X, ok) { X.slash('back', { gold: ok }); slam(X, ok, 0); } },
    // and again, with both hands
    { t: T.slam2, key: 'strike',
      lead(X, s) {
        ensure(X, 5); put(X, 'you', ...M.tail, 0); X.face('you', M.in[0], M.in[1] + 0.2); X.strike('slam', s.t);
        const d = Math.max(0.1, s.t - X.t); X.lift('you', 0.55, d * 0.6, 'out'); X.after(d * 0.6, () => X.lift('you', 0, d * 0.4, 'in'));
      },
      do(X, ok) {
        X.slash('slam', { gold: ok }); slam(X, ok, 1); puff(lake(X), M.tail[0], 0, M.tail[1], 6, 0.8);
        // (the smile's back on: she's fine in there)
        X.after(0.2, () => lake(X).solver.sceneFace('SWEET', 0.1));
      } },
    // the last hit: down on it from the air
    { last: true, key: 'strike',
      lead(X, s) {
        ensure(X, 6); put(X, 'you', ...M.tail, 0);
        const up = Math.max(0.08, Math.min(T.top - X.t, s.t - X.t - 0.2));
        X.go('you', ...M.top, up, { ease: 'out', y: M.topY }); X.face('you', M.top[0], 30);
        X.clip('you', 'NinjaJump_Start', { dur: up, from: 0.1, to: 0.85, fade: 0.05 });
        X.after(up, () => { X.strike('dive', s.t); X.go('you', ...M.sit, Math.max(0.05, s.t - X.t), { ease: 'in', y: M.sitY }); });
        X.cam(SHOT.drop, { blend: 0.3 });
      },
      do(X, ok) {
        const K = kill(X), L = lake(X), b = X.her, p = X.you;
        // shut, with her in it
        K.tw = K.tw.filter((a) => a.key !== 'hatch'); K.hatch = 0; K.legs = 0;
        b.root.visible = false; b.markK = 0;
        X.place('you', ...M.sit, 0); X.lift('you', M.sitY, 0.001);
        X.slash('dive', { gold: ok });
        X.hit({ power: 2.3, gold: ok, at: { x: K.x, y: 1.0, z: 10.05 }, dir: Math.PI });
        X.fx.chips(K.x - 0.7, 0.95, 10.1, PORC, 16, -Math.PI / 2); X.fx.chips(K.x + 0.7, 0.95, 10.1, PORC, 16, Math.PI / 2);
        X.fx.ring && X.fx.ring(K.x, 11.6, GOLD, 3.4);
        puff(L, K.x, 0.6, 9.6, 30, 1.7); puff(L, K.x, 0, 11.3, 14, 1.4);
        K.dipV = -3.2; K.tail = 7; tw(K, 'tail', 1.2, 1.0); K.head = 6; tw(K, 'head', 2.4, 0.8); K.beam = 1.6; tw(K, 'beam', 0.75, 0.8);
        L.snd.play('doorClose', K.x, { gain: 1, rate: 0.85, dry: true }); L.snd.play('boom', K.x, { gain: 0.55, dry: true }); L.snd.play('plateHeavy', K.x, { gain: 0.8, dry: true });
        if (ok) L.snd.play('honk', K.x, { gain: 0.45, at: 0.12 });
        X.clip('you', ok ? 'Sitting_Idle_Loop' : 'Hit_Chest', ok ? { loop: true, fade: 0.06 } : { dur: 0.3, fade: 0.04 });
        if (!ok) X.after(0.3, () => X.clip('you', 'Sitting_Idle_Loop', { loop: true, fade: 0.12 }));
        X.expr(ok ? 'A_Amused' : 'A_Exertion');
        X.cam(SHOT.trunk, { blend: 0.25 });
        X.shatter({ none: true });
      } },
  ],
  // she's in the car: YOU knocks on it, gets off as the lake lets go, and sends the keys in after it
  after(X) {
    const f = X.f, L = f.lake, p = X.you;
    const at = (t, fn) => X.at(Math.max(t, X.t + 0.02), fn);
    at(T.knock, () => { L.snd.play('knock', CAR.x, { gain: 0.55, dry: true }); L.snd.play('knock', CAR.x, { gain: 0.5, at: 0.17, dry: true }); kill(X).dipV = -0.5; });
    // off it, back over the car to her lawn, as it goes
    at(T.off, () => {
      const d = 0.82;
      X.go('you', ...M.shore, d, { ease: 'linear', arc: 2.1, y: 0 }); X.face('you', M.shore[0], -30);
      X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }); kill(X).dipV = 1.6;
      X.cam(SHOT.gone, { blend: 0.5 });
      X.after(d, () => { X.clip('you', 'NinjaJump_Land', { dur: 0.4, fade: 0.04 }); X.fx.dust(M.shore[0], M.shore[1], 8); X.face('you', M.shore[0], 30); X.cam(SHOT.shore, { blend: 0.7 });
        // (she's gone with the car; what the game's own camera frames with YOU from here is her lawn, as it did)
        X.place('her', M.shore[0] + 1.2, M.shore[1] - 2.6); });
      X.after(d + 0.38, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }));
    });
    // and the keys after it
    at(T.toss, () => {
      const K = kill(X); if (K.keys.mode !== 'you') return;
      X.clip('you', 'OverhandThrow', { dur: 0.55, from: 0.28, to: 0.66, fade: 0.06 });
      X.after(0.16, () => fling(X, T.plop, () => _v.set(CAR.x, 0.05, 8.8), { arc: 0.9, next: 'gone', then: () => {
        const P = L.world.particles; L.snd.play('splashSmall', CAR.x, { gain: 0.6, dry: true });
        for (let i = 0; i < 16; i++) P.add({ x: CAR.x + (Math.random() - 0.5) * 0.3, y: 0.05, z: 8.8 + (Math.random() - 0.5) * 0.3, vx: (Math.random() - 0.5) * 2, vy: 1.6 + Math.random() * 2.4, vz: (Math.random() - 0.5) * 2, life: 0.6, size: 0.06, color: new THREE.Color(0.9, 0.95, 1), gravity: 11, shape: 1 });
      } }));
      X.after(0.55, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.2 }));
    });
  },
};
