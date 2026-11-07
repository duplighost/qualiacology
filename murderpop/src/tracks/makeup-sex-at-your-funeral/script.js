// THE MOURNER's song, bar by bar (the design's section 5.3). Every attack ends in a pose and a flash.
// Times are the design's bars: B(bar, beat), bars.py counting from 0.
import * as THREE from 'three';
import { B } from './director.js';
import { TL } from './set.js';
import { tagTexture, makePin, makeBouquet } from './props.js';

const PI = Math.PI;
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

export function choreograph(T, f, D, tr) {
  D.bind(T);
  const S = tr.shots, snd = () => tr.sounds, set = tr.set;
  const tt = (p) => T.time(p);
  const beat = 0.326;

  // ---------------------------------------------------------------- the record's sections (checkpoints)
  T.section('the viewing', { s: 0 }, B(8, 1));
  T.section('your mother\'s xanax', B(8, 1), B(16, 1));
  T.section('open casket, open bar', B(16, 1), B(23, 1));
  T.section('the photo shoot', B(23, 1), B(32, 1));
  T.section('death dramatics', B(32, 1), B(41, 1));
  T.section('the cemetery', B(41, 1), B(61, 1));
  T.section('the eulogy', B(61, 1), B(70, 1));
  T.section('the prep room', B(70, 1), B(78, 1));
  T.section('the guest book', B(78, 1), B(87, 1));
  T.section('the procession', B(87, 1), B(112, 1));
  T.section('3 a.m.', B(112, 1), B(121, 1), { close: true });
  T.section('the build', B(121, 1), B(127, 1));
  T.section('dawn', B(127, 1), B(152, 1), { final: true });
  T.section('the white wedding', B(152, 1), { s: 214.84 }, { close: true });

  // ---------------------------------------------------------------- the moves
  const SHOT = (p0, p1, o = {}) => D.span(p0, p1, (ff, t0, t1, late) => {
    if (o.mark && !late) D.go(o.mark[0], o.mark[1], o.how || 'snap');
    if (o.before) o.before(ff, t0, t1);
    S.start({ variant: 'SHOT', ...o, t0, t1, ghost: D.dead });
  });
  const SNAP = (p0, p1, o = {}) => SHOT(p0, p1, { variant: 'SNAP', ...o });
  // a pink cone of hers and its fan: kisses, pills, petals, the stitch kiss
  const CONE = (p0, p1, o) => D.span(p0, p1, (ff, t0, t1) => { D.cone(t0, t1, o); o.clip && D.act(o.clip, Math.min(0.5, t1 - t0), { from: o.from ?? 0.1, to: o.to ?? 0.8 }); o.face && D.face(o.face); o.windup && o.windup(ff, t0, t1); });

  // ================================================================ CP1 · THE VIEWING (0 - 11.564)
  D.mark({ s: 0 }, 10.6, 0, 'place');
  // her heels behind the right-hand doors on the three pickups
  for (const t of [0.161, 0.474, 0.791]) T.at({ s: t }, () => snd() && snd().play('heel', { pan: 0.95, rate: 1.6, gain: 0.9, gate: 0.05 }));
  // b0.4: the doors blow open; she's in the doorway; the PETAL GUST rolls down the room
  D.at(B(0, 4), (ff) => {
    ff.cam.shake(0.5, 0.2);
    snd() && (snd().play('woodHeavy', { x: 11, gain: 0.9 }), snd().play('door', { x: 11, gain: 0.5, rate: 1.2 }));
    ff.fx.glitter(10.4, 1.6, 0, new THREE.Color(3, 1.2, 1.8), 40, 1.5);
    D.face('pout');
  });
  D.span(B(0, 4), { s: 6.4 }, (ff, t0, t1) => {
    // a band that travels with the line of petals (5 m/s down the room)
    D.tele({ shape: 'rect', x: 10.6, z: 0, angle: -PI / 2, w: 4.6, h: 1.3, kind: 'pink', start: t0, end: t1, linger: 0.05, follow: () => ({ x: 10.2 + 0.65 - 5 * Math.max(0, ff.t - t0), z: 0, angle: -PI / 2 }) });
    if (ff.t > t0 + 0.2) return;
    ff.cue('pink', { x: 10.6 });
    for (let i = 0; i < 7; i++) { const p = ff.proj.spawn({ x: 10.2, z: -4.2 + i * 1.4, y: 1.0, angle: -PI / 2, speed: 5, kind: 'pink', shape: 'petal', size: 0.42, life: 4.6, spin: 4 }); if (p) p.tag = 'petal'; }
    ff.sfx.fire && ff.sfx.fire('petal', ff.pan(10), 'pink');
  });
  // the strut in, a hip-pop on b2.4
  D.mark(B(1, 1), 4.0, 0.6, 'drift');
  D.at(B(2, 4), () => D.act('Yes', 0.33, { from: 0.2, to: 0.6 }));
  // b3.1 -> b4.4: NOTHING UNDERNEATH, the first SHOT (fill 7)
  SHOT(B(3, 1), B(4, 4), { mark: [4.0, 0.6], how: 'drift' });
  // b6.2 -> b6.4: BLOWN KISS
  CONE(B(6, 2), B(6, 4), { r: 5, half: 0.3, n: 3, arc: 30, speed: 6.5, size: 0.42, shape: 'kiss', clip: 'OverhandThrow', face: 'kiss' });
  // b7.1 -> b7.3: SNAP
  SNAP(B(7, 1), B(7, 3));

  // ================================================================ CP2 · YOUR MOTHER'S XANAX (11.564 - 21.999)
  CONE(B(8, 1), B(8, 4), { r: 6, half: 0.61, n: 6, arc: 70, speed: 7, size: 0.36, shape: 'pill', spin: 8, face: 'pout', windup: (ff) => { D.go(3.0, 0, 'snap'); snd() && snd().play('rattle', { x: D.boss.x }); } });
  D.at(B(9, 1), () => D.act('Consume', 0.6, { from: 0.1, to: 0.8 }));
  SNAP(B(9, 1), B(9, 3));
  // DISSOLVING: four pills that split in two at 0.6 s
  CONE(B(10, 2), B(11, 1), { r: 6, half: 0.45, n: 4, arc: 40, speed: 7, size: 0.36, shape: 'pill', spin: 8, split: 0.6, face: 'pout', windup: () => snd() && snd().play('rattle', { x: D.boss.x }) });
  SHOT(B(11, 4), B(12, 4), { holdFace: 'cackle' });
  D.mark(B(13, 4), 1.5, 1.5, 'drift');
  D.at(B(13, 4), (ff) => { const p = ff.player; D.go(p.x + (D.boss.x - p.x) * 0.5, p.z + (D.boss.z - p.z) * 0.5); });
  // THE SLAP
  D.span(B(14, 4), B(15, 2), (ff, t0, t1) => D.melee(t0, t1, { r: 2.6, half: 0.9 }));
  SNAP(B(15, 3), B(16, 1));

  // ================================================================ CP3 · OPEN CASKET, OPEN BAR (21.999 - 31.133)
  D.at(B(16, 1), (ff) => { snd() && snd().play('woodLight', { x: 0, gain: 0.8 }); ff.fx.glitter(0.5, 1.4, -5, new THREE.Color(3, 2.9, 2.8), 20, 0.8); });
  D.mark(B(16, 3), -9.0, -1.0, 'slide', 0.33);
  // OPEN BAR: champagne at you; the neon buzzes on
  D.span(B(17, 1), B(17, 3), (ff, t0, t1) => {
    D.act('Shield_OneShot', t1 - t0, { from: 0.0, to: 0.7 });
    D.lane(t0, t1, { w: 0.35, h: 16, onImpact: () => { snd() && snd().play('cork', { x: D.boss.x }); snd() && snd().play('fizz', { x: D.boss.x, delay: 0.05 }); const a = toward(D.boss, ff.player); ff.proj.spawn({ x: D.boss.x + Math.sin(a), z: D.boss.z + Math.cos(a), y: 1.3, angle: a, speed: 15, kind: 'white', shape: 'orb', size: 0.22, owner: 'deco', life: 1.2, fn: (q, dt) => { q.x += Math.sin(q.angle) * q.speed * dt; q.z += Math.cos(q.angle) * q.speed * dt; } }); ff.fx.glitter(D.boss.x, 1.5, D.boss.z, new THREE.Color(2.6, 2.5, 2.2), 26, 0.6); } });
  });
  // I'M OVERDRESSED: the MIRROR SHOT, out of the bar mirror
  SHOT(B(17, 4), B(18, 4), { variant: 'MIRROR', apex: { x: -10.9, z: -1.0 }, holdFace: 'cackle' });
  // LIPSTICK in the mirror: an open window
  D.span(B(20, 1), B(21, 2), (ff, t0, t1) => { D.act('Interact', t1 - t0, { from: 0.05, to: 0.95 }); D.face('kiss'); });
  // MATCHES YOUR STITCHES: one big kiss; caught, it goes back x2
  CONE(B(21, 3), B(22, 1), { r: 6, half: 0.18, n: 1, arc: 0, speed: 5, size: 0.8, radius: 0.6, shape: 'kiss', dmgBack: 30, clip: 'OverhandThrow', face: 'kiss' });
  // B-B-B-BEST SELFIE: the GROUP shot (fill 5); the four b's are pre-flashes (small, harmless)
  SHOT(B(22, 3), B(23, 4), { variant: 'GROUP', mark: [-6.5, 0], how: 'drift' });
  for (const t of [31.14, 31.38, 31.58, 31.88]) T.at({ s: t }, (ff) => { if (D.dead || ff.suppress) return; S.ledK = Math.max(S.ledK, 0.35); snd() && snd().play('led', { x: D.boss.x, gate: 0.05 }); });

  // ================================================================ CP4 · THE PHOTO SHOOT (31.133 - 42.853)
  D.mark(B(24, 4), -2.0, 0.5, 'drift');
  // TAGGED LOCATION: HEAVEN: the pin follows you 4 beats, locks with a click for 3, drops: 2 hearts
  D.span(B(26, 1), B(27, 4), (ff, t0, t1) => pinDrop(ff, t0, tt(B(27, 1)), t1, tt(B(29, 1))));
  SNAP(B(27, 4), B(28, 3));
  // THREE THOUSAND LIKES: 13 hearts built from the middle out, sweeping from b30.3
  D.span(B(29, 1), B(30, 3), (ff, t0, t1) => likesWall(ff, t0, t1, 13));
  SNAP(B(31, 2), B(31, 4), { holdFace: 'cackle' });

  // ================================================================ CP5 · DEATH DRAMATICS (42.853 - 54.583)
  CONE(B(32, 4), B(33, 2), { r: 6, half: 0.44, n: 7, arc: 50, speed: 7.5, size: 0.4, shape: 'petal', clip: 'OverhandThrow', face: 'pout', windup: () => D.go(-1.0, 0.5, 'snap') });
  // I BROUGHT PROPHYLACTICS: three foil cards, dealt, each lane aimed at you as it appears
  for (const [p0, p1] of [[B(33, 2), B(33, 4)], [B(33, 3), B(34, 1)], [B(33, 4), B(34, 2)]]) D.span(p0, p1, (ff, t0, t1) => {
    const from = { x: D.boss.x, z: D.boss.z }, a = toward(from, ff.player);
    D.lane(t0, t1, { from, angle: a, w: 0.3, h: 16, onImpact: () => { snd() && snd().play('page', { x: from.x, rate: 1.4 }); ff.proj.spawn({ x: from.x + Math.sin(a) * 0.8, z: from.z + Math.cos(a) * 0.8, y: 1.2, angle: a, speed: 10, kind: 'white', shape: 'card', size: 0.36, owner: 'deco', spin: 14, life: 1.6, fn: (q, dt) => { q.x += Math.sin(q.angle) * q.speed * dt; q.z += Math.cos(q.angle) * q.speed * dt; } }); } });
  });
  // the six pallbearers march in through the doors and lift your casket
  D.span(B(33, 1), B(34, 4), (ff, t0, t1) => tr.bearers && tr.bearers.marchIn(t0, t1));
  // MAKING OUT WITH PALLBEARERS (SNAP): she kisses the lead bearer; the team shades whoever is behind them
  SNAP(B(35, 1), B(35, 3), { mark: [0.6, -3.9], how: 'drift', before: () => D.face('kiss') });
  // DEATH DRAMATICS: three charges with your casket (fill 4, 3, 2), two mascara swipes between them
  for (const [p0, p1] of [[B(36, 1), B(37, 1)], [B(37, 2), B(38, 1)], [B(38, 3), B(39, 1)]]) D.span(p0, p1, (ff, t0, t1) => tr.bearers && tr.bearers.charge(t0, t1));
  for (const [p0, p1, clip] of [[B(37, 1), B(37, 3), 'Sword_Regular_A'], [B(39, 1), B(39, 3), 'Sword_Regular_B']]) D.span(p0, p1, (ff, t0, t1) => mascara(ff, t0, t1, clip));
  // FOR THE DYING (SHOT): mock grief, a fake tear dabbed with the pocket square
  SHOT(B(39, 4), B(40, 4), { mark: [0, -2.0], how: 'drift', face: 'grief', holdFace: 'grief' });

  // ================================================================ CP6 · THE CEMETERY (54.583 - 80.650)
  // MAKEUP SEX AT YOUR FUNERAL: GRAVES RISE (fill 7); the walls fly, the floor rattles on every bassless beat
  D.span(B(41, 1), B(42, 4), (ff, t0, t1) => gravesRise(ff, t0, t1, 'B'));
  T.every(B(41, 1), B(42, 4), 1, (ff) => { if (ff.t < TL.turf) { ff.cam.shake(0.18, 0.1); snd() && snd().play('plate', { x: 0, rate: 0.55, gain: 0.5, gate: 0.1 }); } });
  D.mark(B(41, 4), 0, -3.8, 'leap', 0.98);
  // I CAME, YOU WENT: GRIND BANDS round her, one per bar, inside out
  D.at(B(42, 4), () => { D.loop('Dance_Loop', tt(B(47, 3))); D.face('cackle'); });
  for (const [i, p1] of [[0, B(43, 2)], [1, B(44, 2)], [2, B(45, 2)], [3, B(46, 2)]]) D.span(B(42 + i, 4), p1, (ff, t0, t1) => band(ff, t0, t1, [3.2, 5.7, 8.2, 10.7][i]));
  // BEAUTIFUL (SHOT): sitting on BELOVED, legs crossed; then a vogue
  SHOT(B(47, 3), B(48, 3), { pose: 'sit', sidestep: false, before: () => D.go(0, -4.6, 'snap') });
  // THE TITLE DROP: she leaps at you
  D.span(B(50, 4), B(51, 4), (ff, t0, t1) => titleDrop(ff, t0, t1));
  SNAP(B(52, 1), B(52, 3), { sidestep: false });
  // YOUR NAME ON MY TONGUE: 8 notes, one a beat
  D.span(B(53, 1), B(54, 4), (ff, t0, t1) => notes(ff, t0, t1, 8, 0));
  // DIRT UNDER MY NAILS: 6 hands on a line from her to you, then 4 through where it pushed you
  D.span(B(55, 1), B(56, 4), (ff, t0) => dirtLine(ff, tt(B(55, 3)), 6, { from: D.boss }));
  D.span(B(57, 1), B(58, 2), (ff, t0) => dirtLine(ff, tt(B(57, 3)), 4, { from: D.boss }));
  D.at(B(55, 1), () => D.act('Zombie_Scratch', 0.7));
  D.at(B(57, 1), () => D.act('Zombie_Scratch', 0.7));
  SHOT(B(57, 4), B(58, 4));
  // the break: the set turns into the graveside service; she walks to the lectern
  D.mark(B(59, 4), 0, -3.6, 'drift');

  // ================================================================ CP7 · THE EULOGY (80.650 - 92.383)
  for (const p of [B(61, 3), B(61, 4)]) D.at(p, () => { snd() && snd().play('click', { x: 0, gain: 0.8, rate: 0.7 }); D.act('Interact', 0.3, { from: 0.3, to: 0.6 }); });
  D.at(B(62, 1), () => D.act('Consume', 0.9, { from: 0.1, to: 0.9 }));
  // HIGH ON YOUR PERCOCET: four fans from the lectern, 4 white and the middle one pink
  [[B(62, 4), B(63, 2)], [B(63, 2), B(63, 4)], [B(63, 4), B(64, 2)], [B(64, 2), B(64, 4)]].forEach(([p0, p1], i) =>
    CONE(p0, p1, { kind: 'white', r: 6, half: 0.52, n: 5, arc: 60, speed: 9, size: 0.34, shape: 'pill', pinkMiddle: true, skew: i % 2 ? 0.17 : -0.17, spin: 8, windup: () => snd() && snd().play('rattle', { x: 0 }), onFire: () => snd() && snd().feedback(0, 0.15) }));
  SNAP(B(65, 1), B(65, 3), { sidestep: false });
  D.at(B(66, 1), () => D.act('PickUp_Table', 0.9));
  // HAVEN'T SAID WHAT YET: the mic-lasso lane follows you, locks on "what", lands on "yet" (2 hearts)
  D.span(B(67, 3), B(69, 3), (ff, t0, t1) => punchline(ff, t0, tt(B(69, 1)), t1));
  SNAP(B(69, 4), B(70, 2), { sidestep: false });

  // ================================================================ CP8 · THE PREP ROOM (92.383 - 102.817)
  D.mark(B(70, 3), 0, -1.2, 'leap', 0.5);
  D.span(B(71, 3), B(72, 3), (ff, t0, t1) => tableKick(ff, t0, t1));
  SNAP(B(72, 4), B(73, 2));
  D.span(B(73, 3), B(74, 3), (ff, t0, t1) => closeDoor(ff, t0, t1));
  D.mark(B(73, 3), 0, 0.4, 'snap');
  // SOME GIRLS AREN'T STABLE: two whisper lunges
  D.span(B(75, 2), B(75, 4), (ff, t0, t1) => D.melee(t0, t1, { r: 2.8, half: 0.8, clip: 'Sword_Dash', reach: 3 }));
  D.span(B(75, 4), B(76, 2), (ff, t0, t1) => D.melee(t0, t1, { r: 2.8, half: 0.8, clip: 'Sword_Dash', reach: 3 }));
  // "stable": the SNAP and THE TILT on one beat
  SNAP(B(76, 4), B(77, 2));
  D.span(B(76, 4), B(77, 2), (ff, t0, t1) => tilt(ff, t0, t1));

  // ================================================================ CP9 · THE GUEST BOOK (102.817 - 114.554)
  D.mark(B(78, 1), 7.9, 2.6, 'slide', 0.5);
  D.span(B(78, 3), B(79, 3), (ff, t0, t1) => { D.act('Interact', t1 - t0, { from: 0.05, to: 0.95 }); D.face('kiss'); snd() && snd().play('bookOpen', { x: 8.6 }); });
  D.span(B(79, 2), B(79, 4), (ff, t0, t1) => guestBook(ff, t0, t1));
  // CAUGHT THE MOURNING BOUQUET: over her shoulder, landing on "home"
  D.at(B(80, 2), () => { D.boss.backTo = { x: tr.f.player.x, z: tr.f.player.z }; });
  D.span(B(80, 4), B(82, 1), (ff, t0, t1) => { D.boss.backTo = null; bouquet(ff, t0, t1, false); });
  SNAP(B(82, 1), B(82, 3));
  D.span(B(82, 2), B(83, 1), (ff, t0, t1) => mortis(ff, t0, t1));
  D.span(B(83, 2), B(84, 1), (ff, t0, t1) => mortis(ff, t0, t1));
  // THE STIFFEST YOU'VE BEEN (SHOT): she plays dead, arms crossed; one eye opens
  SHOT(B(84, 3), B(85, 3), { mark: [2.0, -1.0], how: 'drift', pose: 'corpse', face: 'neutral', holdFace: 'pout' });

  // ================================================================ CP10 · THE PROCESSION (114.554 - 147.192)
  D.mark(B(87, 2), 0, -3.6, 'slide', 0.5);
  D.span(B(87, 2), B(88, 4), (ff, t0, t1) => gravesRise(ff, t0, t1, 'E'));
  SNAP(B(89, 1), B(89, 3), { pose: 'lounge', sidestep: false, before: () => D.go(0, -4.6, 'snap') });
  // RIDING ON YOUR HEADSTONE: BELOVED tears out of the ground; three rams
  D.at({ s: TL.belovedOut }, (ff) => tr.ride && tr.ride.mount());
  for (const [p0, p1] of [[B(91, 1), B(91, 4)], [B(92, 1), B(92, 4)], [B(93, 1), B(93, 4)]]) D.span(p0, p1, (ff, t0, t1) => tr.ride && tr.ride.ram(t0, t1));
  SHOT(B(94, 1), B(95, 1), { pose: 'sit', sidestep: false });
  // THE ISLAND: she rides BELOVED into the median; the plinth rises; the gates open
  D.at(B(96, 2), (ff) => tr.ride && tr.ride.toIsland(tt(B(96, 4))));
  // THE PROCESSION: one hearse every 4 beats to b104.4, then every 2 beats through the post
  for (let k = 0; k < 8; k++) { const lit = 96 * 4 + 3 + k * 4; D.span(B(Math.floor(lit / 4), lit % 4 + 1), B(Math.floor((lit + 2) / 4), (lit + 2) % 4 + 1), (ff, t0, t1) => tr.hearses && tr.hearses.go(t0, t1, k % 2 ? 'south' : 'north')); }
  // (at full tilt every other car honks: a horn every 2 beats for 8 seconds was a car alarm; each lane still lights)
  for (let k = 0; k < 13; k++) { const lit = 105 * 4 + k * 2; D.span(B(Math.floor(lit / 4), lit % 4 + 1), B(Math.floor((lit + 2) / 4), (lit + 2) % 4 + 1), (ff, t0, t1) => tr.hearses && tr.hearses.go(t0, t1, k % 2 ? 'south' : 'north', { horn: k % 2 === 0 })); }
  // YOUR NAME from the island, threaded between hearses
  D.span(B(99, 1), B(100, 4), (ff, t0, t1) => notes(ff, t0, t1, 8, 0));
  D.span(B(101, 1), B(102, 4), () => dirtLine(tr.f, tt(B(101, 3)), 6, { from: D.boss }));
  D.span(B(103, 1), B(104, 2), () => dirtLine(tr.f, tt(B(103, 3)), 4, { from: D.boss }));
  SNAP(B(104, 1), B(104, 3), { sidestep: false });
  // the post: a parade float, posing between the hearses
  SHOT(B(105, 1), B(106, 1), { sidestep: false });
  SHOT(B(107, 1), B(108, 1), { sidestep: false });
  SNAP(B(109, 1), B(109, 3), { sidestep: false });
  SNAP(B(110, 1), B(110, 3), { sidestep: false });
  D.at(B(111, 1), () => tr.ride && tr.ride.dismount(-0.5, -4.6));

  // ================================================================ CP11 · 3 A.M. (147.192 - 158.926)
  D.at(B(112, 1), () => tr.chapel && tr.chapel.dive());
  D.at(B(112, 4), () => tr.chapel && tr.chapel.lightsOut());
  // 3 AM: the director's torch; she sits up into the beam and flashes down it
  D.span(B(113, 1), B(114, 4), (ff, t0, t1) => tr.chapel && tr.chapel.torch(t0, t1, null));
  // DISRESPECTING THE DECEASED: the beam closes on you, locks, and she snaps you two-handed from the casket
  D.span(B(116, 1), B(117, 4), (ff, t0, t1) => tr.chapel && tr.chapel.torch(t0, t1, tt(B(117, 2))));
  // HE LIKES IT ROUGH: she climbs out, stalks you, lunges; parried, she topples back into the box
  D.at(B(118, 4), () => tr.chapel && tr.chapel.climbOut());
  D.span(B(119, 3), B(120, 1), (ff, t0, t1) => D.melee(t0, t1, { r: 3.0, half: 0.9, reach: 4.5, onParry: () => tr.chapel && tr.chapel.topple() }));
  // THE CASKET BURST
  D.span(B(120, 2), B(120, 4), (ff, t0, t1) => tr.chapel && tr.chapel.burst(t0, t1));

  // ================================================================ CP12 · THE BUILD (158.926 - 166.775)
  SNAP(B(121, 1), B(121, 3), { mark: [0, -3.2], how: 'snap', sidestep: false });
  D.span(B(121, 3), B(122, 1), () => { D.act('Interact', 0.9, { from: 0.1, to: 0.9 }); snd() && snd().play('page', { x: D.boss.x }); });
  // VIBRATOR WARRANTY: she rips your death certificate in half
  D.span(B(122, 3), B(123, 1), (ff, t0, t1) => warranty(ff, t0, t1));
  // THE SUNRISE SHOT (fill 11, 2 hearts): on your grave, phone raised to the horizon
  SHOT(B(124, 1), B(126, 4), { variant: 'SUNRISE', mark: [0, -4.7], how: 'drift', sidestep: false, holdFace: 'cackle', onFlash: () => tr.sunrise && tr.sunrise() });

  // ================================================================ CP13 · DAWN (166.775 - 199.469)
  D.span(B(128, 2), B(128, 4), (ff, t0, t1) => handsRing(ff, t0, t1));
  for (const p1 of [B(129, 4), B(130, 2), B(130, 4)]) { const t1 = tt(p1); D.span({ s: t1 - 3 * beat }, p1, (ff, t0, tt1) => sixFeet(ff, t0, tt1)); }
  D.at(B(129, 1), () => { D.loop('Dance_Loop', tt(B(131, 1))); D.face('cackle'); });
  SNAP(B(131, 1), B(131, 3));
  // COMING WHERE THEY LAID YOU: the BURST, three cones in turn
  SHOT(B(132, 2), B(132, 4), { variant: 'BURST', hold: 0 });
  SHOT(B(132, 4), B(133, 2), { variant: 'BURST', hold: 0 });
  SHOT(B(133, 2), B(133, 4), { variant: 'BURST', hold: 4 });
  // FOREVER MINE THIS WAY: the pallbearers through the gate with the open casket, twice
  D.span({ s: tt(B(135, 3)) - 3 * beat }, B(135, 3), (ff, t0, t1) => tr.bearers && tr.bearers.scoop(t0, t1, 'gate'));
  D.span({ s: tt(B(136, 2)) - 3 * beat }, B(136, 2), (ff, t0, t1) => tr.bearers && tr.bearers.scoop(t0, t1, 'side'));
  SNAP(B(136, 3), B(137, 1));
  for (const [i, p1] of [[0, B(137, 4)], [1, B(138, 2)], [2, B(138, 4)], [3, B(139, 2)]]) { const t1 = tt(p1); D.span({ s: t1 - 2 * beat }, p1, (ff, t0, tt1) => band(ff, t0, tt1, [3.2, 5.7, 8.2, 10.7][i])); }
  D.at({ s: tt(B(137, 4)) - 2 * beat }, () => { D.loop('Dance_Loop', tt(B(139, 3))); });
  D.span(B(139, 1), B(140, 4), (ff) => { dirtLine(ff, tt(B(139, 3)), 5, { converge: 1 }); dirtLine(ff, tt(B(139, 3)), 5, { converge: -1 }); });
  SNAP(B(140, 3), B(141, 1));
  D.span(B(141, 3), B(143, 2), (ff, t0, t1) => notes(ff, t0, t1, 8, 25));
  // THE MONEY SHOT
  SHOT(B(143, 4), B(144, 4), { variant: 'GROUP', mark: [0, -2.0], how: 'drift' });
  // LIKES AND HEAVEN: a 9-heart wall while the pin hunts you
  D.span(B(145, 4), B(146, 4), (ff, t0, t1) => likesWall(ff, t0, t1, 9));
  D.span(B(146, 1), B(147, 4), (ff, t0, t1) => pinDrop(ff, t0, tt(B(147, 1)), t1, t1 + 5 * beat));
  SNAP(B(148, 1), B(148, 3));
  // THE LAST RIDE: two rams on BELOVED
  D.at(B(148, 4), () => tr.ride && tr.ride.mount(true));
  for (const [p0, p1] of [[B(149, 1), B(149, 4)], [B(150, 1), B(150, 4)]]) D.span(p0, p1, (ff, t0, t1) => tr.ride && tr.ride.ram(t0, t1));
  D.at(B(151, 1), () => tr.ride && tr.ride.dismount(0, -2.4));
  // THE LAST POSE: her wedding portrait; the flash turns the world white
  SHOT(B(151, 1), B(152, 1), { mark: [0, -2.4], how: 'drift', onFlash: () => tr.whiteFlash && tr.whiteFlash() });

  // where the set pieces put her (BELOVED, the island, the dismount, the casket, the burst): a start or a rewind
  // inside one of these stretches finds her there, not at the last mark she walked to
  for (const [t, x, z] of [[TL.belovedOut, 0, -4.6], [TL.island, -0.5, 0], [tt(B(111, 1)), -0.5, -4.6], [TL.chapel + 0.45, 0, -4.0], [TL.burst, 0, -3.4]]) D.marks.push({ t, x, z });
  D.marks.sort((a, b) => a.t - b.t);

  // ================================================================ CP14 · THE WHITE WEDDING (199.469 - 214.84)
  D.at({ s: TL.negative }, () => tr.negative && tr.negative());
  // with health left: a gentle last fight at the altar
  D.span(B(155, 1), B(156, 1), (ff, t0, t1) => { if (!D.dead) bouquet(ff, t0, t1, true); });
  D.span(B(156, 1), B(156, 3), (ff, t0, t1) => { if (!D.dead) S.start({ variant: 'SNAP', t0, t1 }); else tr.weakPose && tr.weakPose(); });
  D.span(B(158, 1), B(158, 3), (ff, t0, t1) => { if (!D.dead) S.start({ variant: 'SNAP', t0, t1 }); });
  D.span({ s: tt(B(160, 1)) - 2 * beat }, B(160, 1), (ff, t0, t1) => { if (!D.dead) D.cone(t0, t1, { r: 5, half: 0.3, n: 3, arc: 30, speed: 6.5, size: 0.42, shape: 'kiss' }); });
  D.at(B(153, 1), () => tr.outroWalk && tr.outroWalk());

  // ================================================================ the moves, built
  function gravesRise(ff, t0, t1, layout) {
    const plots = layout === 'B' ? [[-3.2, -1.5], [3.2, -1.5], [-7.5, -1.5], [7.5, -1.5], [-3.2, 3.0], [3.2, 3.0], [-7.5, 3.0], [7.5, 3.0]] : [[-4.5, -4.4], [4.5, -4.4], [-8.5, -4.4], [8.5, -4.4], [-4.5, 4.6], [4.5, 4.6], [-8.5, 4.6], [8.5, 4.6]];
    // (one generic slam for the whole burst, from your grave; each plot has its own soil and stone, staggered)
    plots.forEach(([x, z], i) => D.area({ shape: 'rect', x, z: z + 0.05, angle: 0, w: 0.7, h: 2.4, kind: 'white', start: t0, end: t1, silent: i > 0, sound: false, keep: true, onImpact: () => { ff.fx.dust(x, z + 1.2, 10, new THREE.Color(0.32, 0.22, 0.18)); ff.fx.chips(x, 0.4, z + 1, new THREE.Color(0.35, 0.25, 0.2), 10); snd() && snd().play(i % 2 ? 'soilHeavy' : 'stone', { x, delay: i * 0.01, gain: 0.7 }); } }));
    const gz = layout === 'B' ? -4.45 : -4.45;
    D.area({ shape: 'rect', x: 0, z: gz, angle: 0, w: 1.2, h: 3.0, kind: 'white', start: t0, end: t1, silent: true, keep: true, onImpact: () => { ff.fx.dust(0, -3, 16, new THREE.Color(0.3, 0.22, 0.18)); ff.cam.shake(0.9, 0.25); ff.cam.kick(1.4); } });
  }
  function band(ff, t0, t1, r) {
    D.ring(t0, t1, { at: { x: D.boss.x, z: D.boss.z }, r, th: 1.2, onImpact: () => { snd() && snd().whump(D.boss.x); ff.fx.dust(D.boss.x, D.boss.z, 4); } });
  }
  function titleDrop(ff, t0, t1) {
    const at = { x: ff.player.x, z: ff.player.z };
    const r = ff.arena.resolve(at.x, at.z, 0.6);
    D.circle(t0, t1, { at: r, r: 2.6, onImpact: () => { ff.cam.shake(1.0, 0.25); ff.fx.dust(r.x, r.z, 16); snd() && snd().play('stone', { x: r.x }); } });
    ff.after(Math.max(0, t1 - t0 - 0.98), () => D.leap(r.x, r.z, 0.98));
    D.face('fury');
  }
  function notes(ff, t0, t1, n, spread) {
    const tg = D.tele({ shape: 'cone', x: D.boss.x, z: D.boss.z, angle: 0, w: 7, param: 0.35, kind: 'pink', start: t0, end: t1, follow: () => ({ x: D.boss.x, z: D.boss.z, angle: toward(D.boss, ff.player) }) });
    D.face('sing');
    let ended = false;      // (her cone wiped by your spotlight, or never drawn: the rest of the song stays unsung)
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (t1 - t0) / Math.max(1, n - 1);
      ff.at(t, () => { if (D.dead) { D._crumble(); return; } if (ff.suppress || (tg.dead && !ended)) return; D.fan({ n: 1, speed: 6.5, kind: 'pink', shape: 'note', size: 0.42, wave: { amp: 0.8, freq: 1.2 }, skew: spread ? (i % 2 ? 1 : -1) * spread * PI / 180 : 0, spin: 0 }); snd() && snd().tine(i, D.boss.x); });
    }
    ff.at(t1, () => { ended = true; tg.dead = true; D.face('pout'); });
  }
  // a line of hands from (her or the far side) toward you, locked now, one a beat from t1
  function dirtLine(ff, tFirst, n, o = {}) {
    const p = { x: ff.player.x, z: ff.player.z };
    let sx, sz, a;
    if (o.converge) { a = (o.converge > 0 ? 0 : PI) + toward(D.boss, p); sx = p.x - Math.sin(a) * (1.6 * (n + 0.6)); sz = p.z - Math.cos(a) * (1.6 * (n + 0.6)); }
    else { sx = D.boss.x; sz = D.boss.z; a = toward(D.boss, p); }
    snd() && snd().play('crackle', { x: sx, gain: 0.5 });
    for (let i = 0; i < n; i++) {
      const x = sx + Math.sin(a) * 1.6 * (i + 1), z = sz + Math.cos(a) * 1.6 * (i + 1);
      if (x < ff.bounds.minX + 0.4 || x > ff.bounds.maxX - 0.4 || z < ff.bounds.minZ + 0.4 || z > ff.bounds.maxZ - 0.4) continue;
      D.hand(x, z, tFirst + i * ff.beat);
    }
  }
  function mascara(ff, t0, t1, clip) {
    const a = toward(D.boss, ff.player);
    D.scMode = 'swipe';
    D.area({ shape: 'arc', x: D.boss.x, z: D.boss.z, angle: a, w: 3.4, h: 1.3, param: 1.0, kind: 'white', start: t0, end: t1, melee: true, onFizzle: () => { D.scMode = 'shoulder'; }, onImpact: () => { D.scMode = 'shoulder'; tr.streak && tr.streak(D.boss.x, D.boss.z, a); } });
    ff.after(Math.max(0, t1 - t0 - 0.25), () => D.act(clip, 0.32, { from: 0.15, to: 0.7 }));
    snd() && snd().play('cloth', { x: D.boss.x, gain: 0.6, rate: 0.8 });
  }
  function punchline(ff, t0, tLock, t1) {
    const b = D.boss; let ang = toward(b, ff.player), locked = false;
    D.face('sing');
    D.area({ shape: 'rect', x: b.x, z: b.z, angle: ang, w: 1.2, h: 13, kind: 'white', start: t0, end: t1, damage: 2,
      follow: () => {
        if (ff.t < tLock) { const want = toward(b, ff.player); let d = Math.atan2(Math.sin(want - ang), Math.cos(want - ang)); const m = (PI / 2) * ff.dt; ang += Math.max(-m, Math.min(m, d)); }
        else if (!locked) { locked = true; snd() && snd().play('metalClick', { x: b.x, gain: 1 }); }
        return { x: b.x, z: b.z, angle: ang };
      },
      onImpact: () => { snd() && (snd().feedback(b.x, 0.12), snd().play('metalHeavy', { x: b.x, gain: 0.8 })); ff.cam.shake(0.7, 0.2); D.act('Sword_Attack', 0.3, { from: 0.3, to: 0.7 }); } });
  }
  function tableKick(ff, t0, t1) {
    const tb = set.props.table.obj; const from = { x: tb.position.x, z: tb.position.z };
    D.go(0, -3.4, 'snap');
    const a = toward(from, ff.player);
    D.lane(t0, t1, { from, angle: a, w: 0.7, h: 16, keep: true, onImpact: () => { snd() && snd().play('metalLight', { x: from.x }); tr.slideTable && tr.slideTable(from, a, 12); } });
    ff.after(Math.max(0, t1 - t0 - 0.2), () => D.act('Melee_Hook', 0.3, { from: 0.2, to: 0.7 }));
  }
  function closeDoor(ff, t0, t1) {
    snd() && snd().play('creak', { x: 11, gain: 0.6, rate: 0.6 });
    D.area({ shape: 'rect', x: 11.4, z: -1.4, angle: -PI / 2, w: 0.6, h: 22.8, kind: 'white', start: t0, end: t1, keep: true, push: 'z', onImpact: (hit) => { snd() && (snd().play('door', { x: 0, gain: 0.9, rate: 0.8 }), snd().play('metalHeavy', { x: 0, gain: 0.7 })); ff.cam.shake(0.8, 0.2); if (hit === 'hit') { ff.player.vz = 9; ff.player.vx = 0; } tr.shoveTable && tr.shoveTable(); } });
  }
  function tilt(ff, t0, t1) {
    snd() && snd().play('creak', { x: 0, gain: 0.7, rate: 0.5 });
    for (const z of [2.2, 5.0]) D.area({ shape: 'rect', x: -8.6, z, angle: PI / 2, w: 0.45, h: 20, kind: 'white', start: t0, end: t1, keep: true, silent: z > 3, onImpact: () => { snd() && (snd().play('glassMed', { x: -4, gain: 0.7 }), snd().play('glassLight', { x: 0, delay: 0.25, gain: 0.6 })); tr.flood && tr.flood(); } });
  }
  function guestBook(ff, t0, t1) {
    const c = { x: 8.6, z: 3.4 };
    D.circle(t0, t1, { at: c, r: 1.5, onImpact: () => {
      snd() && snd().play('bookClose', { x: c.x, gain: 1 });
      for (let k = 0; k < 6; k++) ff.at(t1 + k * ff.beat / 2, () => { if (D.dead || ff.suppress) return; for (const arm of [0, PI]) ff.proj.spawn({ x: c.x, z: c.z, y: 1.2, angle: arm + k * 25 * PI / 180 + PI * 0.75, speed: 6, kind: 'white', shape: 'card', size: 0.32, spin: 10, life: 4 }); snd() && snd().play('page', { x: c.x, gate: 0.1 }); });
    } });
  }
  function bouquet(ff, t0, t1, white) {
    const mesh = makeBouquet(white); mesh.scale.setScalar(1.6);
    D.lob(t0, t1, { r: 1.3, shape: 'petal', size: 0.9, back: 30, mesh, peak: 4.5,
      onCaught: () => { snd() && snd().chime(ff.player.x); },
      onLand: (hit, sh) => { snd() && snd().play('soil', { x: sh.x, gain: 0.5 }); if (hit === 'miss' && !D.dead) ff.pat.ring(ff, { from: { x: sh.x, z: sh.z }, n: 8, speed: 5, kind: 'pink', shape: 'petal', size: 0.36 }); } });
    snd() && snd().play('cloth', { x: D.boss.x });
  }
  function mortis(ff, t0, t1) {
    const at = { x: ff.player.x, z: ff.player.z };
    snd() && snd().play('crackle', { x: at.x });
    D.circle(t0, t1, { at, r: 1.6, onImpact: (hit) => { if (hit === 'hit') tr.glaze && tr.glaze(); } });
  }
  function warranty(ff, t0, t1) {
    snd() && snd().play('rip', { x: D.boss.x, delay: Math.max(0, t1 - t0 - 0.1) });
    D.circle(t0, t1, { at: { x: D.boss.x, z: D.boss.z }, r: 1.5, onImpact: () => {
      if (D.dead || ff.suppress) return;
      ff.pat.ring(ff, { n: 12, speed: 7, kind: 'white', shape: 'card', size: 0.32 });
      D.fan({ n: 1, speed: 6, kind: 'pink', shape: 'orb', size: 0.5, dmgBack: 24 });
    } });
    D.act('Interact', t1 - t0, { from: 0.4, to: 0.9 });
  }
  function handsRing(ff, t0, t1) {
    const at = { x: ff.player.x, z: ff.player.z };
    D.ring(t0, t1, { at, r: 3.2, th: 1.6, onImpact: () => { for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; const h = D._handMesh(); h.live = true; h.t0 = ff.t; h.x = at.x + Math.sin(a) * 2.4; h.z = at.z + Math.cos(a) * 2.4; h.until = ff.t + 2 * ff.beat; h.rot = a + PI; } snd() && snd().play('soilHeavy', { x: at.x }); ff.fx.dust(at.x, at.z, 18); } });
    snd() && snd().play('crackle', { x: at.x });
  }
  function sixFeet(ff, t0, t1) {
    const at = { x: ff.player.x, z: ff.player.z };
    D.area({ shape: 'rect', x: at.x, z: at.z - 1.0, angle: 0, w: 0.5, h: 2.0, kind: 'white', start: t0, end: t1, onImpact: () => { snd() && snd().play('soilHeavy', { x: at.x }); ff.fx.dust(at.x, at.z, 12, new THREE.Color(0.3, 0.2, 0.16)); tr.pit && tr.pit(at.x, at.z); } });
  }
  // TAGGED LOCATION: HEAVEN: the pin follows you, locks, drops; it stands 5 beats with its tag, then shatters
  function pinDrop(ff, t0, tLock, t1, tGone) {
    const pin = makePin(); ff.scene.add(pin); pin.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    let px = ff.player.x, pz = ff.player.z, locked = false;
    snd() && snd().ping(px);
    const sh = D.area({ shape: 'circle', x: px, z: pz, w: 2.0, kind: 'white', start: t0, end: t1, damage: 2, follow: () => { if (ff.t < tLock) { px += (ff.player.x - px) * Math.min(1, ff.dt * 6); pz += (ff.player.z - pz) * Math.min(1, ff.dt * 6); } else if (!locked) { locked = true; snd() && snd().play('metalClick', { x: px }); } return { x: px, z: pz }; },
      // its circle wiped by your spotlight: the pin pops in the air instead of dropping
      onFizzle: () => { const i = tr.pins.indexOf(obj); if (i < 0) return; tr.pins.splice(i, 1); ff.scene.remove(pin, tag); ff.fx.glitter(px, 5.5, pz, new THREE.Color(2.6, 0.4, 0.5), 18, 0.8); snd() && snd().play('glassLight', { x: px, gain: 0.6 }); },
      onImpact: () => { snd() && (snd().play('stone', { x: px, gain: 1 }), snd().play('bell', { x: px, rate: 0.6, delay: 0.03 })); ff.cam.shake(1.0, 0.25); ff.cam.kick(1.2); ff.fx.dust(px, pz, 14); } });
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture('heaven'), transparent: true, depthWrite: false })); tag.scale.set(2.2, 0.69, 1); tag.visible = false; ff.scene.add(tag);
    const obj = { pin, tag, t0, t1, tGone, get x() { return px; }, get z() { return pz; } };
    tr.pins.push(obj);
    snd() && ff.after(Math.max(0, t1 - ff.t - 0.45), () => { if (tr.pins.includes(obj) && !ff.suppress) snd().tone(snd().note(2, 7), { dur: 0.45, glide: 0.5, x: px, name: 'ping', gain: 0.7 }); });
    return sh;
  }
  // THREE THOUSAND LIKES: a wall of hearts 3 m in front of her, built from the middle out, sweeping at 4.5 m/s
  function likesWall(ff, t0, t1, n) {
    const b = D.boss, a = toward(b, ff.player), px = Math.cos(a), pz = -Math.sin(a);
    const cx = b.x + Math.sin(a) * 3, cz = b.z + Math.cos(a) * 3;
    const order = [0]; for (let k = 1; k <= (n - 1) / 2; k++) order.push(-k, k);
    const per = 2;          // a pair per beat after the centre
    const wall = { list: [], a };
    tr.walls.push(wall);
    order.forEach((k, j) => {
      const tb = j === 0 ? t0 : t0 + Math.ceil(j / per) * ff.beat * ((t1 - t0) / ff.beat / Math.ceil((order.length - 1) / per));
      ff.at(Math.min(tb, t1 - 0.01), () => {
        if (D.dead) return;
        const x = cx + px * k * 1.1, z = cz + pz * k * 1.1;
        const p = ff.proj.spawn({ x, z, y: 1.2, angle: a, speed: 4.5, delay: Math.max(0, t1 - ff.t), kind: 'pink', shape: 'heart', size: 0.5, life: Math.max(0, t1 - ff.t) + 4.2, spin: 0 });
        if (p) { p.tag = 'like'; p.k = k; wall.list.push(p); }
        snd() && snd().tone(snd().note(Math.abs(k) % 4, 6), { dur: 0.18, x, name: 'ding', gain: 0.6 });
      });
    });
    D.tele({ shape: 'rect', x: cx, z: cz, angle: a, w: 7.2 * (n / 13), h: 16, kind: 'pink', start: t1, end: t1 + 16 / 4.5, linger: 0.05, follow: () => ({ x: cx + Math.sin(a) * 4.5 * Math.max(0, ff.t - t1) * 0, z: cz, angle: a }) });
    D.act('Idle_TalkingPhone_Loop', t1 - t0);
  }
}
