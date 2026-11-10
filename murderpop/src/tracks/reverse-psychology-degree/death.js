// THE DOCTOR's end: GOLD STAR ON BREAKDOWN DAY. Her own lecture, given to her, on the song's own last hits:
//   dash    191.19  her last "reverse psychology": she stands in her one true circle on the seal while the white takes the
//                   floor. YOU goes through it and takes her out of it as it lands: it lands on her. The world comes back
//                   true: dawn.
//   parry   193.32  she comes at YOU with her pointer. Caught: it's YOURS now.
//   strike  195.45  the red pen, across her
//   strike  197.57  and back: marked wrong, on her knees in the middle of the seal, turned to the house. The band stops.
//   parry   200.52  she holds her degree out and lets it go (as the song always had her do). Caught; on "will" it's
//                   chalk in YOUR fist, and her head goes down.
//   jump    201.83  YOU calls her stamp down on her the way she called it down on YOU all song (the pointer up, the
//                   circle filling on the floor: gold, it's YOURS now) and goes up onto it
//   strike  203.94  and rides it down. The last hit. What's left under it: her wax, and the gold star in it.
// After, the song says "you always do". YOU: tsk.
// (src/game/execution.js runs it. Each step's `lead` puts the two of them on their marks as its ring starts to close,
// and gives YOU what she'd be holding by then, so the scene works from any step if her bar empties late; `do` is the
// beat. Everything made here is built at load, hidden, so nothing compiles on a hit; tick() moves the things that
// aren't the two of them. track.js stands its own per-frame code down while the scene has her.)
import * as THREE from 'three';
import * as PC from './pieces.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const RED = new THREE.Color(3.4, 0.22, 0.16), WHITE = new THREE.Color(2.4, 2.7, 3.1), GOLD = new THREE.Color(3.2, 2.0, 0.55), CHALK = new THREE.Color(2.3, 2.3, 2.2), PORCELAIN = new THREE.Color(2.2, 2.1, 2.0);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const EASE = { linear: (k) => k, in: (k) => k * k, in3: (k) => k * k * k, out: (k) => 1 - (1 - k) * (1 - k), inOut: (k) => k * k * (3 - 2 * k) };
// the song's hits in its last bars (data/accents: the instants the level jumps), and the kick before two of them
const HIT = { dawn: 191.194, degree: 193.324, thank: 195.448, defeat: 197.572, you: 200.52, will: 200.93, up: 201.826 };
const KICK = { degree: 193.066, plead: 194.39, your: 196.51, defeat: 197.304 };
const LEFT = -Math.PI / 2, RIGHT = Math.PI / 2, HOUSE = 0;      // facings: stage left, stage right, the audience
// the marks. The seal is the middle of the stage; her circle is on it, and so is where she ends.
const MK = {
  out: [4.3, 0.15],                    // YOU, outside her circle
  herB: [-3.3, 0], youB: [-5.5, 0],    // after the dash: YOU beyond her, stage left; from here YOU drives her back to the seal
  herC: [-1.75, 0], youC: [-3.4, 0],   // after the first stroke
  youD: [-1.85, 0.25],                 // over her, on her knees
  youE: [-2.3, 0.1],                   // clear of the stamp's rim
  ride: [-0.82, 0.14],                 // on it, by its handle
  off: [-2.95, 0.5],                   // down off it
};
const HOLE = 2.6, STAMP_R = 1.8, TOP = 0.16, HOVER = 3.3, FLOOR = 0.045, HIP = 0.52;

// this fight's scene: what was built for it, who holds what, where the stamp is
const D = { on: false, tw: [] };

// ------------------------------------------------------------------------------------------ built at load
function build(f, R) {
  dispose();
  Object.assign(D, { f, R, X: null, on: false, tw: [], hasWand: false, ride: false, did: false, scroll: null, S: null, bowed: false, marks: 0 });
  R.death = Death;
  const G = R.set.group;
  // her pointer, for YOUR hand (hers leaves her hand as this one comes into YOURS)
  const ebony = new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: 0.22, metalness: 0.2 }), gold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.22, metalness: 1, emissive: 0x4a2e04 });
  const w = D.wand = new THREE.Group(), L = 1.1; w.name = 'rpd-death-pointer';
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.013, L, 10), ebony); rod.position.y = L / 2 - 0.06; w.add(rod);
  w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.12, 12), gold));
  for (let k = 1; k <= 3; k++) { const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.0125 - k * 0.0012, 0.0125 - k * 0.0012, 0.014, 10), gold); fr.position.y = -0.06 + k * 0.25; w.add(fr); }
  D.bead = new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 0.25, 0.22) })); D.bead.position.y = L - 0.06 + 0.008; w.add(D.bead);
  w.traverse((o) => { if (o.isMesh) o.castShadow = true; }); w.visible = false; G.add(w);
  // the red pen's two strokes (light, like her laser: they show on her jet gown and through the dawn)
  D.strokes = [0, 1].map(() => {
    const g = new THREE.Group();
    const mat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const a = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.085), mat(RED.clone())), c = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.024), mat(new THREE.Color(3.2, 1.7, 1.4))); c.position.z = 0.003;
    a.renderOrder = 6; c.renderOrder = 7; g.add(a, c); g.visible = false; G.add(g); return g;
  });
  // her laser's dot, on her now
  const glow = PC.glowMat(RED);
  D.dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow.map, color: new THREE.Color(5, 0.4, 0.32), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
  D.dot.scale.setScalar(0.2); D.dot.renderOrder = 9; D.dot.visible = false; G.add(D.dot); glow.dispose();
  // the stamp's die, for this one time: a star
  const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.44 : 1.05; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  D.die = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.75, 0.5) }));
  D.die.rotation.x = Math.PI / 2; D.die.position.y = -0.002; D.die.visible = false; G.add(D.die);
}

// ------------------------------------------------------------------------------------------ small things
const snd = (name, o) => D.R.snd.play(name, o);
const face = (name) => D.R.faces.setBase(name);
const faceFlash = (name, sec) => D.R.faces.flash(name, D.f.t, sec);
// a value eased to a new one on the scene's clock (the latest on a key wins)
function tw(o, key, to, sec, ease = 'inOut', delay = 0) {
  D.tw = D.tw.filter((w) => !(w.o === o && w.key === key));
  D.tw.push({ o, key, from: null, to, t0: D.X.t + delay, dur: Math.max(1e-3, sec), ease: EASE[ease] || EASE.inOut });
}
const untw = (o, key) => { D.tw = D.tw.filter((w) => !(w.o === o && (key === undefined || w.key === key))); };
const acc = (name) => D.R.fig.acc.find((a) => a.name === name);
// (a piece of hers that's out of her hands doesn't break with her)
function gone(name, yes = true) { const a = acc(name); if (!a) return; for (const o of a.objects) o.visible = false; a.broken = yes; a.def.broken = yes; }
function showAcc(name, v) { const a = acc(name); if (a && !a.broken) for (const o of a.objects) o.visible = v; }
const bone = (o, ...names) => { const B = (o.fig ? o.fig.rig : o.rig).bones; for (const n of names) if (B[n]) return B[n]; return null; };
const at = (b, y = 0) => { const p = V(); if (b) b.getWorldPosition(p); p.y += y; return p; };
// round to face `to`, the short way plus whole turns, her feet where they are
function turn(X, w, to, sec, turns = 0, more = {}) {
  const o = X.who(w), B = o.rig.body;
  let d = to - (o.facing + B.spin); d = Math.atan2(Math.sin(d), Math.cos(d));
  d += Math.PI * 2 * turns * (d < 0 ? -1 : 1);
  o.facing = to; B.spin = -d;
  X.body(w, { spin: 0, ...more }, sec, 'out');
}
// her body as it is for a mark: square, upright (or bowed), nothing left over from a spin
const settle = (X, pitch = 0) => X.body('her', { spin: 0, roll: 0, pitch, y: 0 }, 0.01);

// YOUR hand, and how a thing sits in it: along the forearm, out past the fist (worked out from the skeleton at rest)
function wandFrame(pl) {
  if (D.wandQ) return;
  const hand = pl.rig.bones.hand_r, low = pl.rig.bones.lowerarm_r, dir = V(0, 1, 0);
  let sk = null; pl.h.model.traverse((o) => { if (!sk && o.isSkinnedMesh && o.skeleton.bones.includes(hand)) sk = o.skeleton; });
  if (sk && low && sk.bones.includes(low)) {
    const Hb = sk.boneInverses[sk.bones.indexOf(hand)].clone().invert(), Lb = sk.boneInverses[sk.bones.indexOf(low)].clone().invert();
    const p = V(), q = new THREE.Quaternion(), s = V(); Hb.decompose(p, q, s);
    dir.setFromMatrixPosition(Hb).sub(V().setFromMatrixPosition(Lb)).normalize().applyQuaternion(q.invert());
  }
  const ws = hand.getWorldScale(V());
  D.wandQ = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
  D.wandS = V(1 / ws.x, 1 / ws.y, 1 / ws.z);
  D.wandAt = dir.clone().multiplyScalar(0.06 / ws.y);
}
// her pointer is YOURS (the ring that hand held waits)
function giveWand(X) {
  const pl = X.you, hand = pl.rig.bones.hand_r;
  if (D.hasWand || !hand) return;
  D.hasWand = true; wandFrame(pl);
  gone('rpdPointer');
  const w = D.wand; hand.add(w); w.position.copy(D.wandAt); w.quaternion.copy(D.wandQ); w.scale.copy(D.wandS); w.visible = true;
  const r = pl.rings.find((q) => q.side === 'R'); if (r && r.holder) { r.holder.visible = false; D.ring = r.holder; }
}
// and let go of: it lies where it falls (ground: on what's left of her)
function dropWand(X, to) {
  if (!D.hasWand) return;
  const w = D.wand, G = D.R.set.group;
  G.attach(w); D.hasWand = false;
  if (D.ring) { D.ring.visible = true; D.ring = null; }
  const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, Math.PI / 2 - 0.02));
  D.fall = { q0: w.quaternion.clone(), q1, p0: w.position.clone(), p1: V(to[0], 0.03, to[1]), t0: X.t, dur: 0.34, done: false };
}
const wandTip = () => at(D.bead);
const herTip = (b) => { const a = acc('rpdPointer'); return a && a.def.bead ? at(a.def.bead) : V(b.x, 1.4, b.z); };

// ---- her circle: the song's own last inverse, or the same one if the song didn't draw it
function hole(X, end) {
  const L = D.R.lies, iv = L.inv;
  if (iv && !iv.resolved && iv.holes.length === 1 && Math.hypot(iv.holes[0].x, iv.holes[0].z) < 0.2) return;
  L.inv = { holes: [{ x: 0, z: 0, r: HOLE }], start: X.f.t, end, damage: 1, ink: false, resolved: false };
}
function landHole(X) {
  const L = D.R.lies, iv = L.inv;
  if (iv && !iv.resolved) { iv.resolved = true; iv.end = Math.min(iv.end, X.f.t); iv.landT = X.f.t; L.h.fft && L.h.fft(); }
}

// ---- the red pen
function mark(X, n, ok) {
  const b = X.her, sp = bone(b, 'spine_03', 'spine_02'), m = D.strokes[n];
  if (!sp || !m) return;
  b.root.updateWorldMatrix(true, true);
  const a = b.facing + b.rig.body.spin, c = at(sp);
  D.R.set.group.add(m);
  m.position.set(c.x + Math.sin(a) * 0.3, c.y - 0.04, c.z + Math.cos(a) * 0.3);
  m.rotation.set(0, a, n ? -0.95 : 0.95, 'YXZ'); m.scale.set(1, 1, 1); m.visible = true;
  for (const q of m.children) q.material.opacity = ok ? 1 : 0.5;
  sp.attach(m);
  const full = m.scale.x; m.scale.x = full * 0.04; tw(m.scale, 'x', full, 0.08, 'out');
  D.marks = Math.max(D.marks, n + 1);
}
function stroke(X, n, ok) {
  const f = X.f, p = X.you, b = X.her, c = at(bone(b, 'spine_03', 'spine_02'));
  f.fx.sx.slash(p.x + 0.3, 1.3, p.z, RIGHT, { color: RED, sweep: n ? -1 : 1, tilt: 0.85, half: 1.5, r: 1.75, big: true });
  X.hit({ power: ok ? (n ? 1.6 : 1.3) : 0.6, gold: ok, dir: RIGHT });
  f.fx.sparks(c.x, c.y, c.z, RED, ok ? 24 : 8, RIGHT);
  snd('zap', { x: b.x, gain: ok ? 1.5 : 0.7 });
  mark(X, n, ok);
}
// a ribbon off the pointer's bead while it swings
function swish(X, sec = 0.45) {
  const f = X.f, v = V(); if (!f.fx.trail || !D.hasWand) return;
  const tr = f.fx.trail(() => D.bead.getWorldPosition(v), { w: 0.11, color: RED, len: 12, life: 0.14 });
  X.after(sec, () => { tr.live = false; });
}

// ---- on her knees on the seal
function kneel(X, facing = HOUSE, pitch = 0) {
  const b = X.her;
  X.place('her', 0, 0, facing); settle(X, pitch); b.rig.body.hip = HIP;
  if (b.rig.baseName !== 'Crouch_Idle_Loop') X.clip('her', 'Crouch_Idle_Loop', { loop: true, fade: 0.14 });
}
// ---- her degree: out of her sleeve, held out, let go
function offer(X) {
  const b = X.her;
  if (D.scroll) return;
  D.scroll = 'held';
  const a = acc('rpdDiploma'); if (a) { a.broken = false; a.def.broken = false; for (const o of a.objects) o.visible = true; }
  D.R.snd.lib('k-page', { x: b.x, gain: 0.6 });
  turn(X, 'her', -1.05, 0.4);
  b.rig.upperHold && b.rig.upperHold('Pistol_Idle_Loop', { duration: 0.35, from: 0, to: 0.2, fade: 0.12 });
  face('rpdConcern');
}
function letGo(X, arrive) {
  const R = D.R, b = X.her, p = X.you, sc = R.set.scroll;
  if (D.scroll === 'float' || D.scroll === 'done') return;
  const from = at(bone(b, 'hand_r')); if (from.lengthSq() < 1e-6) from.set(b.x - 0.5, 1.2, b.z);
  gone('rpdDiploma');
  R.set.group.add(sc); sc.position.copy(from); sc.quaternion.identity(); sc.scale.setScalar(1.25); sc.userData.roll.rotation.set(0, 0, 0); sc.userData.glow.visible = true; sc.visible = true;
  D.scroll = 'float';
  const sec = Math.max(0.12, arrive - X.t);
  tw(sc.position, 'x', p.x + 0.5, sec, 'inOut'); tw(sc.position, 'z', p.z + 0.12, sec, 'inOut'); tw(sc.position, 'y', 1.34, sec, 'out');
  b.rig.upperStop && b.rig.upperStop(0.5);
}
function chalk(X, x, y, z, n = 22) {
  const f = X.f;
  f.fx.chips(x, y, z, CHALK, n); f.fx.emit(n, { x, y, z, color: new THREE.Color(1.5, 1.5, 1.45), shape: 0, speed: 1.4, life: 0.8, size: 0.3, gravity: 1.2, up: 0.3, jitter: 0.25, drag: 2.2 });
}
function scrollGone() { const sc = D.R.set.scroll; untw(sc.position); D.R.set.group.add(sc); sc.visible = false; sc.scale.setScalar(1); D.scroll = 'done'; }

// ---- her stamp
function callStamp(X, hover = true) {
  const f = X.f, S = D.S;
  if (!S || S.on) return;
  S.on = true; S.y = 16; S.dip = 0; S.rot = -1.1;
  // the circle on the floor, filling to the last hit, the way hers did under YOU: gold, it's YOURS
  f.tele.add({ shape: 'circle', x: 0, z: 0, w: STAMP_R, kind: 'gold', start: f.t, end: f.lastHit, linger: 0.12 });
  snd('whoom', { x: 0, gain: 1.4 });
  if (hover) { tw(S, 'y', HOVER, 0.5, 'out'); tw(S, 'rot', 0, 1.0, 'out'); }
}
function slam(X, ok) {
  const f = X.f, R = D.R, b = X.her, S = D.S;
  untw(S); S.on = true; S.y = FLOOR; S.dip = 0; S.rot = 0;
  // under it
  X.body('her', { spin: 0, roll: 0, pitch: 0.2 }, 0.01); b.rig.body.squash = 0.88; b.shX = b.shZ = 0;
  X.hit({ power: 2.3, gold: ok, dir: HOUSE, at: { x: 0, y: 0.35, z: 0.6 } }); b.shX = b.shZ = 0;
  f.fx.ring && f.fx.ring(0, 0, GOLD, 4.6); f.fx.sx.ring(0, 0, WHITE, 2.6, 0.2, 0.09);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, x = Math.sin(a) * (STAMP_R + 0.05), z = Math.cos(a) * (STAMP_R + 0.05); f.fx.chips(x, 0.12, z, PORCELAIN, ok ? 7 : 4, a); if (i % 2) f.fx.dust(x, z, 3, new THREE.Color(0.75, 0.7, 0.66)); f.fx.sparks(x, 0.1, z, GOLD, ok ? 6 : 2, a); }
  snd('thunk', { x: 0, gain: 2.0, rate: 0.8 }); f.sfx.slamSet && f.sfx.slamSet(0);
  f.cam.shake(1.6, 0.42);
  // what's left: her wax, the size of the stamp's face, and the gold star in it (the stamp is still on them)
  R.set.finAge = 0;
  R.set.waxSeal(f, { x: 0, z: 0 }, 2.3);
  const g = R.set._starMesh(); g.scale.setScalar(1.7); g.visible = true;
  R.set.starFall = { age: 1.5, from: V(0, 0.03, 0), to: V(0, 0.03, 0), glint: true };
  X.shatter({ dir: V(0, -1, 0), power: ok ? 0.9 : 0.75, at: V(0, 0.4, 0) });
  D.did = true;
}

// ------------------------------------------------------------------------------------------ the scene
// (the pictures: all from the house side, low; the stage's own hedge stands at z 7.5, so nothing sits behind it low)
const SHOT = {
  floor: { pos: [-0.7, 2.7, 9.8], look: [-0.7, 0.95, 0], fov: 38 },          // the whole floor: her circle, and the way through it
  plea: { pos: [1.15, 1.2, 3.5], look: [-0.15, 1.02, 0], fov: 36 },          // her, on her knees, holding it out
  under: { pos: [1.0, 0.5, 7.1], look: [-0.45, 2.55, 0], fov: 52 },          // looking up at the stamp over her
  last: { pos: [0.5, 0.42, 6.7], look: [-0.3, 2.3, 0], fov: 55 },
  left: { pos: [-1.9, 1.5, 6.3], look: [-1.25, 0.8, 0], fov: 36 },           // what's left, and YOU by it
};

function begin(X) {
  const f = X.f, R = D.R, b = X.her;
  D.X = X; D.on = true; D.tw = []; D.ride = false; D.did = false; D.scroll = null; D.bowed = false; D.marks = 0; D.fall = null;
  X.lift('you', 0, 0.12);            // (she may have been in the air when it started: the scene is played on the floor)
  // the track's own ending stands down: the degree she was letting go, her walk to YOU, whatever was on her arms
  R.set.letgo = null; R.set.scroll.visible = false; R.outro = false;
  b.rig.upperStop && b.rig.upperStop(0.05); b.rig.timeScale = 1; b.lockFacing = false; b.faceTarget = null;
  b.rig.body.hip = 1; b.rig.body.squash = 0;
  showAcc('rpdDiploma', false); if (!D.hasWand) showAcc('rpdPointer', true);
  // (her keepsake still lying where it fell: it comes to YOU now, not in the middle of this)
  if (f.ks && f.ks.state === 'wait') f.ks.t = 99;
  const st = R.set.takeStamp();
  D.S = { st, g: st.mesh, y: 16, dip: 0, rot: 0, on: false };
  D.S.g.add(D.die); D.die.visible = true;
}

export const death = {
  beats: 28,
  hold: 1.85,
  enter(X, E) {
    const f = X.f, p = X.you, b = X.her, i = E && E.i !== undefined ? E.i : 0, S = E && E.steps ? E.steps[i] : null;
    begin(X);
    // how long they have to get to their marks: until the first press's ring starts to close
    const sec = clamp((S ? S.lead0 : X.t + 1.2) - X.t, 0.05, 1.15);
    const walk = (w, x, z, clip, sp) => { const o = X.who(w), d = Math.hypot(x - o.x, z - o.z); if (d < 0.1) return; X.go(w, x, z, sec, { ease: 'inOut', face: true }); X.clip(w, clip, { loop: true, speed: clamp(d / sec / sp, 0.7, 2.6) }); };
    if (i === 0) {
      // her mark in the middle of the seal, in her circle; YOU outside it
      hole(X, HIT.dawn);
      walk('her', 0, 0, 'Zombie_Walk_Fwd_Loop', 1.2); walk('you', ...MK.out, 'Sprint_Loop', 6.4);
      X.after(sec, () => { X.faceEach(); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); X.clip('her', 'Spell_Simple_Idle_Loop', { loop: true, fade: 0.2 }); face('rpdSmirk'); });
      X.cam(SHOT.floor);
      return;
    }
    // her bar emptied late: straight to where the next press finds them
    if (i >= 2) giveWand(X);
    const her = i === 1 || i === 2 ? MK.herB : i === 3 ? MK.herC : [0, 0];
    const you = i === 1 ? MK.youB : i === 2 ? [MK.herB[0] - 1.55, 0] : i === 3 ? [MK.herC[0] - 1.5, 0] : i === 4 ? MK.youD : MK.youE;
    walk('her', ...her, 'Zombie_Walk_Fwd_Loop', 1.2); walk('you', ...you, 'Sprint_Loop', 6.4);
    X.follow('two', { dist: 6.2 });
  },
  steps: [
    // ---- through her circle
    { t: HIT.dawn, key: 'dash',
      lead(X, s) {
        X.place('her', 0, 0); X.place('you', ...MK.out); X.faceEach(); settle(X);
        hole(X, s.t);
        X.clip('her', 'Spell_Simple_Idle_Loop', { loop: true, fade: 0.15 }); face('rpdSmirk');
        X.clip('you', 'Sword_Dash', { dur: Math.max(0.1, s.t - X.t), from: 0, to: 0.12 });
        X.cam(SHOT.floor);
      },
      do(X, ok) {
        const f = X.f, p = X.you, b = X.her;
        landHole(X);
        // YOU: through it and out the far side; her: out of it, round and round
        X.face('you', -20, p.z); X.go('you', ...MK.youB, 0.17, { ease: 'out' });
        X.clip('you', 'Sword_Dash', { dur: 0.36, from: 0.12, to: 0.5 });
        f.fx.dashStart && f.fx.dashStart(p); X.after(0.22, () => f.fx.dashEnd && f.fx.dashEnd(p)); f.sfx.dash && f.sfx.dash(p);
        X.after(0.4, () => { X.faceEach(); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.14 }); });
        X.go('her', ...MK.herB, 0.3, { ease: 'out' }); X.clip('her', 'Hit_Chest', { dur: 0.55 }); turn(X, 'her', LEFT, 0.75, ok ? 2 : 1);
        face('rpdCaught');
        X.after(0.06, () => {
          X.hit({ power: ok ? 1.7 : 0.7, gold: ok, dir: LEFT });
          f.fx.sx.ring(b.x, b.z, WHITE, 3.2, 0.3, 0.08); f.fx.sparks(b.x, 1.3, b.z, WHITE, ok ? 30 : 10);
        });
        if (ok) { f.fx.nearMiss && f.fx.nearMiss(p); } else { f.fx.sparks(p.x, 1.2, p.z, WHITE, 14); p.rig.hitStop(0.08); }
        X.after(0.78, () => { face('rpdWrecked'); X.clip('her', 'Sword_Idle', { loop: true, fade: 0.25 }); });
        X.at(HIT.dawn + 0.53, () => X.follow('two', { dist: 5.8 }));
      } },
    // ---- her pointer
    { t: HIT.degree, key: 'parry',
      lead(X, s) {
        const b = X.her;
        X.place('her', ...MK.herB, LEFT); X.place('you', ...MK.youB, RIGHT); settle(X);
        X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 });
        // back on the kick before, in on the hit
        X.clip('her', 'Sword_Regular_A', { dur: Math.max(0.1, s.t - X.t), from: 0.1, to: 0.6 }); face('rpdWrecked');
        X.at(KICK.degree, () => { X.go('her', MK.herB[0] - 0.55, 0, Math.max(0.05, s.t - X.t), { ease: 'in' }); snd('heel', { x: b.x, rate: 1.3, gain: 1.6 }); snd('swish', { x: b.x }); });
        X.follow('two', { dist: 5.6 });
      },
      do(X, ok) {
        const f = X.f, p = X.you, b = X.her, tip = herTip(b);
        snd('tsing', { x: p.x, gain: 1.6 });
        const yank = () => {
          giveWand(X); swish(X, 0.4);
          X.clip('you', 'Sword_Regular_C', { dur: 0.44, from: 0.02, to: 0.36 }); X.after(0.46, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.14 }));
          // off her feet by it, round on her heel, and nothing in her hand
          X.hit({ power: ok ? 0.9 : 0.5, gold: ok, dir: LEFT, y: 1.5, quiet: !ok });
          X.go('her', ...MK.herB, 0.3, { ease: 'out' }); X.clip('her', 'Hit_Chest', { dur: 0.5 }); turn(X, 'her', LEFT, 0.55, 1);
          face('rpdCaught');
          X.after(0.62, () => X.clip('her', 'Idle_Shield_Loop', { loop: true, fade: 0.2 }));
        };
        if (ok) {
          X.clip('you', 'Sword_Block', { dur: 0.1, from: 0.08, to: 0.3 }); p.blockK = 1;
          f.fx.caught(tip.x, tip.y, tip.z, true); f.sfx.catch && f.sfx.catch('perfect', f.pan(p.x)); f.fx.ring && f.fx.ring(p.x, p.z, GOLD, 1.8);
          p.rig.hitStop(0.1); b.rig.hitStop(0.1);
          X.after(0.14, yank);
        } else {
          f.fx.sparks(tip.x, tip.y, tip.z, new THREE.Color(3.4, 0.8, 1.9), 12, LEFT); X.clip('you', 'Hit_Chest', { dur: 0.3 }); faceFlash('rpdSmirk', 0.3);
          X.after(0.32, yank);
        }
        // "come plead": her own red dot, on her
        X.at(KICK.plead, () => { if (!D.hasWand) return; X.face('you', b.x, b.z); X.clip('you', 'Sword_Regular_Combo', { dur: 0.1, from: 0.2, to: 0.262 }); D.dotT = X.t; snd('tick', { x: b.x, gain: 1.6 }); face('rpdConcern'); b.rig.hitStop(0.06); });
      } },
    // ---- the red pen
    { t: HIT.thank, key: 'strike',
      lead(X, s) {
        X.place('her', ...MK.herB, LEFT); X.place('you', MK.herB[0] - 1.55, 0, RIGHT); settle(X); giveWand(X);
        if (X.her.rig.baseName !== 'Idle_Shield_Loop') X.clip('her', 'Idle_Shield_Loop', { loop: true, fade: 0.12 });
        X.strike('cut', s.t); swish(X, s.t - X.t + 0.3);
        X.follow('two', { dist: 5.6 });
      },
      do(X, ok) {
        D.dotT = -9;
        stroke(X, 0, ok);
        // back toward the seal, round once, and she stops with it turned to the house
        X.go('her', ...MK.herC, 0.3, { ease: 'out' }); X.clip('her', 'Hit_Chest', { dur: 0.55 }); turn(X, 'her', -0.6, 0.6, 1);
        face('rpdCaught');
        X.after(0.22, () => X.go('you', ...MK.youC, 0.3, { ease: 'out' }));
        X.after(0.6, () => { X.clip('her', 'Idle_Shield_Loop', { loop: true, fade: 0.2 }); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.16 }); });
        X.at(KICK.your, () => { face('rpdWrecked'); snd('heel', { x: X.her.x, gain: 1.4 }); });
      } },
    { t: HIT.defeat, key: 'strike',
      lead(X, s) {
        X.place('her', ...MK.herC, -0.6); X.place('you', MK.herC[0] - 1.5, 0, RIGHT); settle(X); giveWand(X);
        X.strike('back', s.t); swish(X, s.t - X.t + 0.3);
        X.follow('two', { dist: 5.6 });
      },
      do(X, ok) {
        const f = X.f, b = X.her;
        stroke(X, 1, ok);
        // marked wrong: round, and down on her knees in the middle of the seal, to the house
        X.go('her', 0, 0, 0.36, { ease: 'out' }); X.clip('her', 'Hit_Chest', { dur: 0.4 }); turn(X, 'her', HOUSE, 0.6, 1);
        face('rpdCaught');
        X.after(0.34, () => {
          b.rig.body.hip = HIP; X.clip('her', 'Crouch_Idle_Loop', { loop: true, fade: 0.16 }); face('rpdWrecked');
          f.fx.dust(b.x, b.z, 10); f.cam.shake(0.45, 0.14); f.sfx.breakProp && f.sfx.breakProp(f.pan(b.x));
        });
        X.after(0.3, () => { X.go('you', ...MK.youD, 0.55, { ease: 'inOut' }); X.clip('you', 'Walk_Loop', { loop: true, speed: 1.5, fade: 0.12 }); });
        X.after(0.86, () => { X.face('you', 0, 0); X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.2 }); });
        X.follow('two', { dist: 5.8, h: 1.3 });
        // her degree, out of her sleeve
        X.at(198.12, () => offer(X));
        X.at(198.63, () => X.cam(SHOT.plea));
        X.at(199.71, () => { letGo(X, HIT.you); X.follow('two', { dist: 4.9, h: 1.3 }); });
      } },
    // ---- her degree
    { t: HIT.you, key: 'parry',
      lead(X, s) {
        kneel(X, -1.05); X.place('you', ...MK.youD); X.face('you', 0, 0); giveWand(X);
        if (X.you.rig.baseName !== 'Idle_FoldArms_Loop') X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.12 });
        if (!D.scroll) { offer(X); } letGo(X, s.t);
        X.follow('two', { dist: 4.9, h: 1.3 });
      },
      do(X, ok) {
        const f = X.f, R = D.R, p = X.you, b = X.her, sc = R.set.scroll, hand = bone(p, 'hand_l');
        untw(sc.position);
        if (ok && hand) {
          X.clip('you', 'Interact', { dur: 0.14, from: 0.2, to: 0.42 });
          const h = at(hand); f.fx.caught(sc.position.x, sc.position.y, sc.position.z, true); f.sfx.catch && f.sfx.catch('perfect', f.pan(p.x)); p.rig.hitStop(0.08);
          sc.userData.glow.visible = false; D.scroll = 'caught';
          X.after(0.1, () => { if (D.scroll !== 'caught') return; hand.attach(sc); sc.position.set(0, 0, 0); });
          // "and you will": chalk
          X.at(HIT.will, () => {
            const c = at(hand); scrollGone(); chalk(X, c.x, c.y, c.z, 26);
            snd('tsk', { x: p.x, gain: 1.3 }); f.sfx.hitProp && f.sfx.hitProp(f.pan(p.x)); f.cam.shake(0.3, 0.1);
            X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.25 });
            // and her head goes down
            turn(X, 'her', HOUSE, 0.45, 0, { pitch: 0.42 }); face('rpdWrecked'); D.bowed = true;
          });
        } else {
          // in the face: chalk anyway
          const c = at(bone(p, 'Head', 'head'), 0.05); scrollGone(); chalk(X, c.x, c.y, c.z, 18);
          X.clip('you', 'Hit_Head', { dur: 0.36 }); X.after(0.38, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }));
          snd('tsk', { x: b.x, gain: 1.3 }); faceFlash('rpdSmirk', 0.6);
          X.at(HIT.will, () => turn(X, 'her', HOUSE, 0.45));
        }
      } },
    // ---- her stamp
    { t: HIT.up, key: 'jump',
      lead(X, s) {
        kneel(X, HOUSE, D.bowed ? 0.42 : 0); X.place('you', ...MK.youE); X.face('you', 0, 0); giveWand(X);
        if (D.scroll && D.scroll !== 'done') scrollGone();
        // the pointer up, the way she did it
        X.clip('you', 'Sword_Heavy_Combo', { dur: 0.36, from: 0.43, to: 0.52 }); swish(X, 0.4);
        callStamp(X);
        face('rpdCaught');
        X.cam(SHOT.under);
      },
      do(X, ok) {
        const f = X.f, p = X.you, S = D.S;
        f.fx.dust(p.x, p.z, 6);
        if (ok) {
          // up, over its rim, onto it
          X.clip('you', 'NinjaJump_Start', { dur: 0.2, from: 0.12, to: 0.5 }); X.after(0.2, () => X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }));
          X.lift('you', HOVER + 1.25, 0.3, 'out');
          X.after(0.28, () => X.go('you', ...MK.ride, 0.22, { y: HOVER + TOP, ease: 'inOut' }));
          X.after(0.5, () => {
            D.ride = true; X.face('you', 6, 3);
            X.clip('you', 'NinjaJump_Land', { dur: 0.3, from: 0.1, to: 0.42 }); X.after(0.32, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.16 }));
            tw(S, 'dip', -0.24, 0.07, 'out'); X.after(0.07, () => tw(S, 'dip', 0, 0.4, 'inOut'));
            snd('clack', { x: 0, gain: 1.5, rate: 0.7 }); f.cam.shake(0.3, 0.1);
          });
          X.after(0.95, () => tw(S, 'y', HOVER + 0.55, 0.7, 'inOut'));
        } else {
          // not this time: a hop, and back down where she was
          X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }); X.go('you', MK.youE[0] - 0.45, MK.youE[1], 0.34, { arc: 0.55, y: 0 });
          X.after(0.36, () => { X.face('you', 0, 0); X.clip('you', 'NinjaJump_Land', { dur: 0.25, from: 0.1, to: 0.42 }); });
          X.after(0.64, () => X.clip('you', 'Sword_Idle', { loop: true, fade: 0.16 }));
        }
        // under it, she makes herself small
        X.after(0.5, () => { X.body('her', { pitch: 0.8 }, 0.5, 'inOut'); D.bowed = true; });
        X.at(202.876, () => snd('tick', { x: 0, gain: 1.3 })); X.at(203.408, () => snd('tick', { x: 0, gain: 1.6 }));
      } },
    { last: true, key: 'strike',
      lead(X, s) {
        const S = D.S, left = Math.max(0.06, s.t - X.t), fall = Math.min(0.14, left * 0.5);
        kneel(X, HOUSE, 0.8); giveWand(X);
        if (D.scroll && D.scroll !== 'done') scrollGone();
        if (!D.ride) { X.place('you', MK.youE[0] - 0.45, MK.youE[1]); X.face('you', 0, 0); X.strike('slam', s.t); }
        else X.strike('dive', s.t);
        swish(X, left + 0.2);
        if (!S.on) callStamp(X, false);
        // up a little more, then down: on her as the hit comes
        const onHer = 0.84;
        if (S.y > 10) X.after(left - Math.min(0.2, left * 0.6), () => { tw(S, 'y', onHer, Math.min(0.2, left * 0.6), 'in3'); tw(S, 'rot', 0, 0.15); });
        else { tw(S, 'y', S.y + 0.45, Math.max(0.02, left - fall), 'out'); X.after(left - fall, () => tw(S, 'y', onHer, fall, 'in3')); }
        X.cam(SHOT.last);
      },
      do(X, ok) { slam(X, ok); } },
  ],
  after(X) {
    const f = X.f, R = D.R, p = X.you, S = D.S;
    X.expr('A_Amused');
    if (D.ride) {
      // off it as it goes back up
      X.after(0.26, () => { D.ride = false; X.go('you', ...MK.off, 0.36, { arc: 0.5, y: 0, ease: 'inOut' }); X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }); });
      X.after(0.62, () => { X.face('you', 0, 0); X.clip('you', 'NinjaJump_Land', { dur: 0.24, from: 0.1, to: 0.42 }); f.fx.dust(p.x, p.z, 6); });
    }
    X.after(0.3, () => { tw(S, 'y', 17, 0.55, 'in'); tw(S, 'rot', 0.8, 0.55, 'in'); });
    // there it is
    X.after(0.6, () => { if (R.set.starFall) R.set.starFall.glint = false; });
    // "you always do"
    X.after(0.92, () => { X.face('you', 0, 0); X.clip('you', 'Idle_No_Loop', { loop: true, fade: 0.16 }); });
    X.at(f.lastHit + 1.5, () => snd('tsk', { x: p.x, gain: 1.5 }));
    X.after(1.52, () => dropWand(X, [-0.75, 0.62]));
    X.cam(SHOT.left, { blend: 0.55 });
  },
};

// ------------------------------------------------------------------------------------------ every frame of it
function tick(f, dt) {
  const X = D.X; if (!D.on || !X) return;
  const T = X.t, R = D.R;
  for (let i = 0; i < D.tw.length; i++) {
    const w = D.tw[i]; if (T < w.t0) continue;
    if (w.from === null) w.from = w.o[w.key];
    const k = clamp((T - w.t0) / w.dur, 0, 1); w.o[w.key] = w.from + (w.to - w.from) * w.ease(k);
    if (k >= 1) { D.tw.splice(i, 1); i--; }
  }
  // the stamp, and YOU on it
  const S = D.S;
  if (S) {
    S.g.visible = S.on && S.y < 15.5; S.g.position.set(0, S.y + S.dip, 0); S.g.rotation.y = S.rot;
    if (D.ride) { const p = f.player; p.y = S.y + S.dip + TOP; p.grounded = false; p._sync(); }
  }
  // her degree in the air
  const sc = R.set.scroll;
  if (D.scroll === 'float' && sc.visible) { sc.userData.glow.quaternion.copy(f.cam.cam.quaternion); sc.userData.roll.rotation.y += dt * 1.6; sc.userData.glow.material.opacity = 0.6 + 0.2 * Math.sin(T * 7); }
  // the dot on her forehead
  const dotOn = D.hasWand && T - (D.dotT ?? -9) < 1.2 && !f.boss.fig.shattered;
  D.dot.visible = dotOn;
  if (dotOn) { const h = at(bone(f.boss, 'Head', 'head'), 0.1), b = f.boss, a = b.facing + b.rig.body.spin; D.dot.position.set(h.x + Math.sin(a) * 0.16, h.y, h.z + Math.cos(a) * 0.16); D.dot.scale.setScalar(0.2 + 0.16 * Math.max(0, 1 - (T - D.dotT) / 0.12)); }
  // the marks on her breathe
  for (const m of D.strokes) if (m.visible) m.children[0].material.color.copy(RED).multiplyScalar(0.8 + 0.2 * Math.sin(T * 9));
  // her pointer, let go of
  const F = D.fall;
  if (F && !F.done) {
    const k = clamp((T - F.t0) / F.dur, 0, 1), w = D.wand;
    w.position.lerpVectors(F.p0, F.p1, k); w.position.y = F.p0.y + (F.p1.y - F.p0.y) * k * k; w.quaternion.slerpQuaternions(F.q0, F.q1, Math.min(1, k * 1.3));
    if (k >= 1) { F.done = true; snd('clack', { x: F.p1.x, gain: 0.8, rate: 2.2 }); }
  }
}

// back to before it (a rewind, a new start): everything out of their hands and off her
function reset() {
  const R = D.R; if (!R) return;
  const G = R.set && R.set.group;
  D.on = false; D.X = null; D.tw = []; D.ride = false; D.did = false; D.scroll = null; D.bowed = false; D.marks = 0; D.fall = null; D.dotT = -9;
  if (G) {
    if (D.wand) { G.add(D.wand); D.wand.visible = false; D.wand.scale.set(1, 1, 1); }
    for (const m of D.strokes || []) { G.add(m); m.visible = false; }
    if (D.die) { G.add(D.die); D.die.visible = false; }
    if (D.dot) D.dot.visible = false;
    const sc = R.set.scroll; if (sc && sc.parent !== G) { G.add(sc); sc.visible = false; sc.scale.setScalar(1); }
    if (R.set.fallStar) R.set.fallStar.scale.setScalar(1);
  }
  D.hasWand = false; if (D.ring) { D.ring.visible = true; D.ring = null; }
  if (D.S) { D.S.st.taken = false; D.S.g.visible = false; D.S = null; }
  const b = D.f && D.f.boss; if (b && b.rig) { b.rig.body.hip = 1; b.rig.body.squash = 0; }
  for (const n of ['rpdPointer', 'rpdDiploma']) { const a = R.fig && acc(n); if (a && a.broken && !(a.pivots && a.pivots.length)) { a.broken = false; a.def.broken = false; } }
}
function dispose() {
  if (!D.R) return;
  reset();
  for (const o of [D.wand, ...(D.strokes || []), D.dot, D.die]) if (o) { o.parent && o.parent.remove(o); o.traverse((q) => { if (q.geometry) q.geometry.dispose(); if (q.material) q.material.dispose(); }); }
  D.wand = D.strokes = D.dot = D.die = D.bead = null; D.wandQ = null; D.R = null; D.f = null;
}

export const Death = { build, tick, reset, dispose, get on() { return D.on; }, get did() { return D.did; } };
