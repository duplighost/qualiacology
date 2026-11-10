// The whole song, bar by bar (the design's B5 timeline). Bars are the song's own (downbeat 3): '13:1' is bar 13
// beat 1. Every attack is scheduled from an event before it (so a rewind to a section line never replays the sting
// that belongs to the section before), and nothing of hers fires once her bar is empty.
import * as THREE from 'three';
import { clamp } from './her.js';

export const SECTIONS = [
  { name: 'intro', from: { s: 0 }, to: 10 },
  { name: 'verse1', from: 10, to: 26 },
  { name: 'pre1', from: 26, to: 33 },
  { name: 'chorus1', from: 33, to: 52 },
  { name: 'verse2', from: 52, to: 69 },
  { name: 'pre2', from: 69, to: 77 },
  { name: 'chorus2', from: 77, to: 96 },
  { name: 'bridge', from: 96, to: 111, opts: { close: true } },
  { name: 'verse3', from: 111, to: 122 },
  { name: 'final', from: 122, to: 139, opts: { final: true } },
  { name: 'outro', from: 139, to: 157 },
];

// where she is and what she's doing when a section starts (a rewind, or ?at=)
export function sectionPose(t, f) {
  const B = (bar, beat = 1) => f.bm.timeOfBar(bar, beat);
  const s = (n) => B(n) - 0.01;
  // the intro: she's in the glass, not in the room. Unseen and untouchable, but where the camera looks: it frames
  // YOU at the door, the bottle on its dish and the gold mirror, so the first count happens in the middle of the picture
  if (t < s(10)) return { her: [0, -6.4], hidden: true, face: 0 };
  if (t < s(26)) return { her: [0, 0.5], behave: 'chase', slap: false };
  if (t < s(33)) return { her: [0, -5.8], behave: 'hold', idle: 'Idle_Talking_Loop' };
  if (t < s(52)) return { her: [4.5, 0], behave: 'circle', idle: 'Crouch_Idle_Loop' };
  if (t < s(69)) return { her: [0, -2.6], hidden: true, behave: 'hold' };
  if (t < s(77)) return { her: [-5.5, -4.5], behave: 'hold', idle: 'Sitting_Idle_Loop', face: 0.6 };
  if (t < s(96)) return { her: [0, -6.4], behave: 'hold', idle: 'Idle_FoldArms_Loop', face: Math.PI };
  if (t < s(111)) return { her: [0, -3.5], behave: 'chase' };
  if (t < s(122)) return { her: [0, -6.4], hidden: true, behave: 'hold' };
  if (t < s(139)) return { her: [0, 0], behave: 'hold' };
  return { her: [0, -4.4], behave: 'hold', idle: 'Dance_Loop' };
}

export function choreography(T, f, tr) {
  const B = (bar, beat = 1) => f.bm.timeOfBar(bar, beat);
  const her = () => tr.her, set = () => tr.set;
  const H = (t, fn) => T.at({ s: t }, (ff) => { if (!tr.wrecked) fn(ff); });       // an attack: never once she's empty
  const A = (t, fn) => T.at({ s: t }, (ff) => fn(ff));                                 // anything else
  const beats = (bar) => [1, 2, 3, 4].map((b) => B(bar, b));
  const kiss = (bar, beat, o) => H(B(bar, beat) - 0.3, () => her().kissFan(B(bar, beat), o));
  // a grenade: pinned on the and-of-4, lands on 1, four ticks, stings on the next 1. o.thing: it lands on one of the
  // new girl's things (verse 3) and breaks it unless you catch it
  const grenade = (pinBar, pinBeat, o = {}) => H(B(pinBar, pinBeat), () => {
    const g = { ...o };
    if (o.thing) { const th = set().thingAt(o.thing); if (th && !set().isBroken(o.thing, f.t)) { g.at = th; g.exact = true; g.onSting = () => set().breakThing(o.thing); } else g.at = null; }
    else g.at = o.at ? (typeof o.at === 'function' ? o.at() : o.at) : null;
    // grenade 2 is thrown as the store comes down: never under a gondola's footprint
    if (o.avoid === 'gondolas') { const pl = f.player; const p = g.at || { x: pl.x + pl.vx * 0.4, z: pl.z + pl.vz * 0.4 }; const ax = Math.abs(p.x); if (ax > 2.3 && ax < 4.9) p.x = Math.sign(p.x || 1) * (ax < 3.6 ? 2.3 : 4.9); g.at = p; }
    her().grenade(g);
  });
  const watch = (t0, dur) => A(t0, (ff) => { const b = ff.boss; b.behave = 'hold'; b.open(dur); });
  const behave = (t, kind, o = {}) => A(t, (ff) => { const b = ff.boss; b.behave = kind; Object.assign(b.behaveOpts, o); });
  const idle = (t, clip) => A(t, (ff) => { const b = ff.boss; b.idle = clip; if (!b.busy && b.state === 'perform') b.loop(clip); });
  const expr = (t, name, hold) => A(t, () => her().expr(name, undefined, hold));
  const slapOn = (t, on) => A(t, () => { her().slapOn = on; });
  const moveTo = (t, x, z, dur, o) => A(t, (ff) => ff.boss.moveTo(x, z, dur, o));
  W.f = f;

  // ================================================================ INTRO (0.00–16.25) — while YOU moves
  // the bottle on its dish, sealed in a faint pink ring; nothing attacks until the count
  A(3.76, () => { tr.hudBoss(true); set().herInMirror(true); });
  A(B(4, 4.5), () => { set().pinPop(); tr.snd.play('pin', { x: 0 }); });
  for (const b of [2, 3, 4]) A(B(5, b), () => { her().cloud(0, 0.5, 0.7, new THREE.Color(0.9, 0.3, 0.5), 0.6); tr.snd.play('puff', { x: 0 }); });
  A(B(6, 2), () => tr.snd.play('lift', { x: 0, rate: 1.6 }));
  // 'begin': the bottle lifts off its dish and rocks; the first count is bar 8, the sting 9:1
  A(B(7, 2.7), (ff) => {
    set().dishBottle(false);
    her().grenade({ land: B(8, 1), at: { x: 0, z: 0.5 }, from: { x: 0, z: 0.5 }, fromY: 0.25, noThrow: true, intro: true,
      onBack: (g) => {      // caught: flicked into the gold mirror, it bursts on her reflection; the mirror blows out
        const b = ff.boss; b.intangible = false;
        b.takeHit({ dmg: b.maxHp * 0.02, kind: 'return', heavy: true, x: 0, z: -6.6, onBeat: true });
        set().blowMirror(ff.t);
        her().place(0, -6.4); her().hide(false); b.state = 'perform';
        her().expr('fury', ff.t, 0.8);
      },
      onSting: () => {      // not caught: she forms out of the cloud
        const b = ff.boss;
        her().place(0, 0.5); b.state = 'perform';
        ff.at(ff.t + 0.4, () => { her().hide(false); ff.fx.glitter(0, 1.2, 0.5, new THREE.Color(3, 0.6, 1.5), 40, 1.2); });
      } });
  });
  // the near silence after the sting: she stands, head tilted
  A(B(9, 2), (ff) => { const b = ff.boss; if (b.state === 'gone' || b.intangible || !b.root.visible) { if (b.state === 'gone') b.state = 'perform'; her().place(0, 0.5); her().hide(false); } set().herInMirror(false); her().expr('smug'); });

  // ================================================================ VERSE 1 (16.25–42.70)
  behave(B(10, 1), 'chase', { speed: 1.6 });
  behave(B(11, 1), 'circle', { r: 5.5, speed: 1.6 });
  // LOVE SHOULD HURT: close on 11:3, the slap lands on 11:4; otherwise a kiss fan
  H(B(11, 3), (ff) => { const b = ff.boss; if (Math.hypot(ff.player.x - b.x, ff.player.z - b.z) < 2.6) her().slap(B(11, 3), B(11, 4)); else her().kissFan(B(11, 4), { n: 3 }); });
  kiss(12, 2, { n: 3 });
  // GRENADE 1: she stands and watches the count: open
  grenade(12, 4.5, { land: B(13, 1) }); watch(B(13, 1), B(14, 1) - B(13, 1));
  A(B(14, 1), () => { her().flicker(B(14, 1), B(14, 3), 0, -6.4, { tell: 'mirror' }); });
  behave(B(14, 3), 'circle', { r: 5.5, speed: 1.6 });
  slapOn(B(14, 3), true);
  kiss(14, 4, { n: 5, spread: 24 }); kiss(15, 2, { n: 5, spread: 24 });
  // into the mirror, out of the floor right behind YOU, EVERY TOUCH
  A(B(15, 4), () => { her().out(B(15, 4)); slapOff(); });
  A(B(16, 2), (ff) => { const p = behindYou(ff, 2.4); her().in(B(16, 3), p.x, p.z, { tell: 'floor' }); });
  H(B(16, 4) - 0.02, () => her().swipe(B(16, 4), B(17, 1)));
  A(B(17, 2), (ff) => { her().expr('delight', ff.t, ff.beat * 3); ff.boss.behave = 'hold'; ff.boss.open(ff.beat * 3); });
  // SHAKING IN THE SHOWER: she's inside the stall like a figurine in a vitrine; it rattles four times and bursts
  A(B(18, 1), () => { her().out(B(18, 1)); slapOff(); });
  A(B(18, 2), () => set().tell('stall', B(18, 2), B(18, 3)));
  A(B(18, 3), (ff) => { her().place(-9.8, -5.9, 0); her().hide(false); ff.boss.intangible = true; ff.boss.behave = 'hold'; ff.boss.loop('Idle_Talking_Loop'); });
  H(B(19, 1), () => set().showerCount(beats(19), B(20, 1), { apex: { x: -9.8, z: -4.6 } }));
  A(B(20, 1) + 0.05, (ff) => { her().place(-8.4, -4.0); ff.boss.intangible = false; ff.boss.behave = 'circle'; her().slapOn = true; });
  A(B(20, 1), () => set().lipstick());
  kiss(20, 4, { n: 3 }); kiss(21, 2, { n: 3 });
  // KNIFE BLOCK: she rises behind the island; the island is cover for YOU too
  A(B(22, 1), () => { her().out(B(22, 1)); slapOff(); });
  A(B(22, 2), () => set().tell('knife', B(22, 2), B(22, 3)));
  A(B(22, 3), (ff) => { her().place(7.2, -5.3); her().hide(false); ff.boss.behave = 'hold'; });
  H(B(23, 1) - 0.01, () => her().knives(beats(23), B(24, 1)));
  watch(B(24, 1), B(25, 3) - B(24, 1));
  kiss(24, 3, { n: 3 }); kiss(25, 1, { n: 3 });
  A(B(25, 3), () => { her().flicker(B(25, 3), B(26, 1), 0, -6.4, { tell: 'mirror' }); });

  // ================================================================ PRE-CHORUS 1 (42.70–54.31) — THE STORE
  A(B(26, 1), (ff) => { ff.boss.behave = 'hold'; her().slapOn = false; set().storeFootprints(B(26, 1), B(27, 1)); });
  grenade(26, 4.5, { land: B(27, 1), avoid: 'gondolas' });
  A(B(27, 1), (ff) => { moveToNow(ff, 0, -5.8, 0.3); });
  H(B(28, 1) - 0.02, () => set().aisleFour(beats(28), B(29, 1)));
  kiss(29, 4, { n: 3, from: { x: 0, z: -5.6 }, aimDown: true }); kiss(30, 2, { n: 3, from: { x: 0, z: -5.6 } });
  idle(B(30, 1), 'Idle_No_Loop');
  H(B(30, 1) - 0.02, () => set().barcode(B(30, 1), [B(31, 1), B(31, 2), B(31, 3), B(31, 4)], { x0: -1.5, x1: 1.5, z0: -5.6, z1: 4.6 }));
  // HIT THE FLOOR: she leaps on 32:1 above the shelves, lands on 33:1 in the song's silence
  const floorSpot = { x: 0, z: 0 };
  H(B(32, 1) - 0.02, (ff) => { floorSpot.x = ff.player.x; floorSpot.z = ff.player.z; her().leap(B(32, 1), B(33, 1), floorSpot, { clipUp: 'NinjaJump_Start', clipDown: 'NinjaJump_Land' }); });
  H(B(32, 2) - 0.02, () => stompAt(B(32, 2), B(33, 1), 3.0, floorSpot));
  A(B(33, 1) - 0.02, () => { tr.snd.play('floor', { x: 0, when: B(33, 1) }); });

  // ================================================================ CHORUS 1 (54.31–85.74)
  // DO YOU MISS ME? blackout: she circles you crouched, heels clicking; no attacks; hits light glowing cracks
  A(B(33, 1) + 0.3, (ff) => { const b = ff.boss; b.behave = 'circle'; b.behaveOpts.r = 4.5; b.behaveOpts.speed = 1.3; b.walkClip = 'Crouch_Fwd_Loop'; b.idle = 'Crouch_Idle_Loop'; b.loop('Crouch_Idle_Loop'); tr.blackout = true; });
  // the song's silent instant: the EXIT sign goes out; when it's back she's at the EXIT door, her back to you
  A(57.6, (ff) => { const b = ff.boss; b.walkClip = 'Walk_Formal_Loop'; b.idle = 'Idle_Talking_Loop'; b.behave = 'hold'; her().out(57.6); });
  A(57.74, (ff) => { her().place(0, -6.4, Math.PI); her().hide(false); ff.boss.loop('Idle_FoldArms_Loop'); ff.boss.lockFacing = true; tr.blackout = false; });
  H(B(35, 1) - 0.02, () => her().doorBlast(beats(35), B(36, 1)));
  A(B(36, 1) + 0.25, (ff) => { const b = ff.boss; b.lockFacing = false; b.idle = 'Dance_Loop'; b.moveTo(0, -4.4, B(36, 4) - ff.t, { easing: 'inOut' }); b.perform('Walk_Formal_Loop', { duration: B(36, 4) - ff.t, then: 'Dance_Loop' }); });
  kiss(36, 2, { n: 3 }); kiss(36, 4, { n: 3 });
  grenade(36, 4.5, { land: B(37, 1) });
  H(B(38, 1) - 0.02, () => her().mirrorRing(beats(38), B(39, 1)));
  grenade(39, 4.5, { land: B(40, 1) });
  kiss(40, 2, { n: 3 }); kiss(40, 4, { n: 3 });
  H(B(41, 4) - 0.02, () => her().everywhere(B(41, 4), beats(42), { per: 1, settle: { t: B(43, 1) } }));
  A(B(43, 1), (ff) => { ff.boss.open(ff.beat * 3); });
  cadence({ leap: B(43, 4), head: [B(44, 1), B(44, 2), B(44, 3)], bed: [B(44, 3), B(44, 4), B(45, 1), B(45, 3)], brk: [B(45, 1), B(45, 2), B(45, 3)],
    s1: [B(45, 3), B(45, 4), B(46, 1)], s2: [B(46, 4), B(47, 1), B(47, 2)], laugh: B(47, 3), hearts: 0 });
  A(B(48, 1) - 0.05, () => her().crown(B(48, 1), B(50, 1)));
  expr(B(50, 1), 'fury', 1.2);
  A(B(50, 1), (ff) => { ff.boss.idle = 'Dance_Loop'; });
  kiss(50, 2, { n: 3 }); kiss(50, 4, { n: 3 });
  grenade(50, 4.5, { land: B(51, 1) });

  // ================================================================ VERSE 2 (85.74–113.88) — THE BEDROOM, OCTOBER
  A(B(52, 1) + 0.15, (ff) => { her().hide(true); ff.boss.behave = 'hold'; });
  // she's sitting on the foot of the bed, legs crossed, facing you; open for the bar
  A(B(54, 1), (ff) => { her().place(0, -2.6, 0); her().hide(false); const b = ff.boss; b.idle = 'Sitting_Idle_Loop'; b.loop('Sitting_Idle_Loop'); b.open(ff.beat * 3); });
  A(B(54, 4), (ff) => { const b = ff.boss; b.idle = 'Idle_Talking_Loop'; b.perform('Sitting_Exit', { duration: 0.8, then: 'idle' }); });
  A(B(55, 1), (ff) => { ff.boss.behave = 'chase'; ff.boss.behaveOpts.speed = 1.6; });
  // OCTOBER: the window bangs open; porcelain leaves (petals) drift in at you
  H(B(55, 1) - 0.02, () => set().petals(B(55, 1), 5)); H(B(56, 1) - 0.02, () => set().petals(B(56, 1), 5));
  kiss(55, 3, { n: 3 });
  // TILL YOU CRIED: a lace loop thrown over you; a barrier; it tightens each beat and snaps shut
  H(B(57, 1) - 0.02, () => lace(beats(57), B(58, 1)));
  // bored, she flops back on the bed; lazy single kisses
  A(B(58, 2), (ff) => { her().place(0, -2.6, 0); const b = ff.boss; b.behave = 'hold'; b.idle = 'Sitting_Idle_Loop'; b.perform('Sitting_Enter', { duration: 0.6, then: 'Sitting_Idle_Loop' }); b.open(B(61, 1) - ff.t); });
  kiss(59, 2, { n: 1, speed: 7 }); kiss(60, 2, { n: 1, speed: 7 });
  // LIGHTS ON: six lamps, one a beat; L3 stutters; she's in its pool
  A(B(61, 1) - 0.02, () => set().lightsOn([B(61, 1), B(61, 2), B(61, 3), B(61, 4), B(62, 1), B(62, 2)]));
  A(B(62, 1), (ff) => { const b = ff.boss; b.idle = 'Idle_Talking_Loop'; b.perform('Sitting_Exit', { duration: 0.5, then: 'idle' }); her().out(B(62, 1) + 0.5); });
  A(B(62, 2), () => set().tell('lamp3', B(62, 2), B(62, 3)));
  A(B(62, 3), (ff) => { her().place(-6.0, 4.6); her().hide(false); ff.boss.behave = 'hold'; });
  kiss(62, 4, { n: 5, spread: 24 });
  A(B(63, 3), () => her().out(B(63, 3)));
  // (beside the nightstand her phone is on, not in it)
  A(B(63, 4), () => set().tell('phone', B(63, 4), B(64, 1)));
  A(B(64, 1), (ff) => { her().place(2.75, -4.45); her().hide(false); const b = ff.boss; b.idle = 'Idle_TalkingPhone_Loop'; b.loop('Idle_TalkingPhone_Loop'); tr.extra && tr.extra.show('phone', true); b.open(B(65, 2) - ff.t); });
  // HER PHONE DINGS AT DAWN: four notification ticks, the ding, the blinds snap open: stripes of dawn burn
  H(B(64, 1) - 0.02, () => set().dawnStripes(beats(64), B(65, 1), B(65, 2)));
  H(B(65, 2) - 0.25, (ff) => { her().act('OverhandThrow', B(65, 2), { contact: 0.55, dur: 0.5 }); ff.at(B(65, 2), () => { tr.extra && tr.extra.show('phone', false); phoneThrow(ff); }); });
  A(B(65, 3), (ff) => { const b = ff.boss; b.idle = 'Idle_Talking_Loop'; b.loop(b.idleClip); });
  // COLONIZED YOUR BRAIN: two counts at once, the second off the bar line
  grenade(65, 4.5, { land: B(66, 1) }); grenade(66, 2.5, { land: B(66, 3) });
  watch(B(66, 1), B(67, 4) - B(66, 1));
  A(B(67, 4), (ff) => { her().place(0, -2.6, 0); const b = ff.boss; b.idle = 'Sitting_Idle_Loop'; b.perform('Sitting_Enter', { duration: 0.5, then: 'Sitting_Idle_Loop' }); b.open(B(69, 1) - ff.t); });
  H(B(68, 1), () => set().officeFootprints(B(68, 1), B(69, 1)));

  // ================================================================ PRE-CHORUS 2 (113.88–127.14) — THE OFFICE, THE JOURNAL
  A(B(69, 1), (ff) => { her().place(-5.5, -4.5, 0.6); her().hide(false); const b = ff.boss; b.behave = 'hold'; b.idle = 'Sitting_Idle_Loop'; b.loop('Sitting_Idle_Loop'); b.open(B(71, 4) - ff.t); });
  A(B(69, 4), () => set().legalPad());
  for (const [bar, beat] of [[70, 2], [70, 4], [71, 2]]) H(B(bar, beat) - 0.3, (ff) => her().kissFan(B(bar, beat), { n: 3, spread: 18, speed: 10, from: { x: -5.0, z: -4.0 }, card: true }));
  A(B(71, 4), (ff) => { const b = ff.boss; b.idle = 'Idle_Talking_Loop'; b.perform('Sitting_Exit', { duration: 0.5, then: 'idle' }); her().out(B(71, 4) + 0.25); });
  // (the margin she crouches in and streaks along runs behind everything in the office: the pad's easel stands at
  // z -5.6, so her line is z -6.4, clear of it)
  A(B(72, 1), () => her().reflection(10.4, -6.4, B(72, 1), B(72, 2)));
  A(B(72, 2), (ff) => { her().place(10.4, -6.4); her().hide(false); const b = ff.boss; b.idle = 'Crouch_Idle_Loop'; b.loop('Crouch_Idle_Loop'); });
  grenade(72, 2.5, { land: B(72, 3) });
  H(B(73, 1) - 0.02, () => set().pageTurn(beats(73), B(74, 1)));
  A(B(74, 1) + 0.05, (ff) => { const b = ff.boss; b.moveTo(-10.4, -6.4, ff.beat, { easing: 'inOut', through: true }); });
  // I HAUNT THE MARGIN: she sprints the margins, laughing; ink marks where you stand, splatting a bar later
  A(B(75, 1), (ff) => { const b = ff.boss; b.idle = 'Idle_Talking_Loop'; b.loop(b.idleClip); sprint(ff); });
  for (let i = 0; i < 4; i++) H(B(75, 1 + i), (ff) => ink(ff, B(75, 1 + i), B(76, 1 + i)));
  A(B(75, 1), () => set().exitDrop(B(75, 1), B(76, 1)));
  A(B(76, 4), (ff) => { her().flicker(B(76, 4), B(76, 4) + 0.2, 0, -6.4, { tell: 'exit', face: Math.PI }); ff.at(B(76, 4) + 0.25, () => { const b = ff.boss; b.idle = 'Idle_FoldArms_Loop'; b.loop(b.idleClip); b.lockFacing = true; b.faceNow(0, -9); b.open(B(79, 1) - ff.t); }); });

  // ================================================================ CHORUS 2 (127.14–158.57)
  // SAY YOU HATE ME: her forehead against the EXIT door, back to you: free hits
  A(128.46, () => set().dreamFlicker(128.46, 128.74));
  A(130.4, () => { tr.lightsOut = true; }); A(130.58, () => { tr.lightsOut = false; });
  H(B(79, 1) - 0.02, () => her().doorBlast(beats(79), B(80, 1)));
  A(B(80, 1) + 0.25, (ff) => { const b = ff.boss; b.lockFacing = false; b.idle = 'Dance_Loop'; b.moveTo(0, -4.4, 0.8, { easing: 'inOut' }); });
  kiss(80, 2, { n: 5, spread: 24 }); kiss(80, 4, { n: 5, spread: 24 });
  grenade(80, 4.5, { land: B(81, 1) }); grenade(81, 2.5, { land: B(81, 3) });
  H(B(82, 1) - 0.02, () => her().mirrorRing(beats(82), B(83, 1)));
  H(B(83, 1) + 0.03, () => her().mirrorRing([B(83, 1) + 0.03, B(83, 2)], B(83, 3), { rot: 18 }));
  grenade(83, 4.5, { land: B(84, 1) }); grenade(84, 1.5, { land: B(84, 2) });
  watch(B(84, 1), B(85, 3) - B(84, 1));
  H(B(85, 4) - 0.02, () => her().everywhere(B(85, 4), beats(86), { per: 2, settle: { t: B(87, 1) } }));
  A(B(87, 1), (ff) => ff.boss.open(ff.beat * 3));
  cadence({ leap: B(87, 4), head: [B(88, 1), B(88, 2), B(88, 3)], bed: [B(88, 3), B(88, 4), B(89, 1), B(89, 3)], brk: [B(89, 1) + 0.2, B(89, 2), B(89, 3)],
    s1: [B(90, 3), B(90, 4), B(91, 1)], s2: [B(91, 1) + 0.02, B(91, 2), B(91, 3)], laugh: B(91, 4), hearts: 6, dance: [B(89, 4), B(90, 3)] });
  A(B(92, 1) - 0.05, () => her().crown(B(92, 1), B(94, 1)));
  // THE ROLLING COUNT: three bottles land where you stand, a beat apart; keep moving
  grenade(93, 4.5, { land: B(94, 1), lead: 0 }); grenade(94, 1.5, { land: B(94, 2), lead: 0 }); grenade(94, 2.5, { land: B(94, 3), lead: 0 });
  A(B(95, 4), () => her().out(B(95, 4)));

  // ================================================================ BRIDGE (158.57–183.40) — INSIDE YOUR HEAD, 3:47
  A(B(96, 1), (ff) => { her().place(0, -4.5); her().hide(false); const b = ff.boss; b.idle = 'Idle_Talking_Loop'; b.loop(b.idleClip); b.behave = 'chase'; b.behaveOpts.speed = 1.6; });
  H(B(96, 4), () => her().slap(B(96, 4), B(97, 1)));
  H(B(97, 2), () => her().swipe(B(97, 2), B(97, 3)));
  H(B(97, 4), () => her().slap(B(97, 4), B(98, 1)));
  A(B(98, 2), (ff) => { set().clockRings(B(98, 2)); const b = ff.boss; b.behave = 'hold'; b.moveTo(b.x - Math.sin(b.facing) * 1.2, b.z - Math.cos(b.facing) * 1.2, 0.5); her().expr('delight', ff.t, 1.5); b.open(ff.beat * 2.5); });
  A(B(99, 1), (ff) => { ff.boss.behave = 'circle'; ff.boss.behaveOpts.r = 4; });
  // TASTE OF COPPER, SMELL OF WINE: the glass tips four times; the wine runs out as one wave. Dash through it.
  H(B(100, 1) - 0.02, () => set().wine(beats(100), B(101, 1)));
  // EVERY TRIGGER PROVES YOU'RE MINE: a plate under you every beat, each pops four beats later
  A(B(101, 2), (ff) => { her().place(0, -0.5); const b = ff.boss; b.behave = 'hold'; b.loop('Spell_Simple_Idle_Loop'); b.open(B(104, 1) - ff.t); });
  for (let i = 0; i < 8; i++) { const k = f.bm.beatOfBar(101, 2) + i; H(f.bm.timeOf(k), (ff) => trigger(ff, f.bm.timeOf(k + 4))); }
  // HYPERVIGILANCE: six cameras rise; their views trail you; four shutter clicks; they all fire
  A(B(103, 1) - 0.02, () => set().camerasRise(B(103, 1)));
  H(B(104, 1) - 0.02, () => set().cameraShots(beats(104), B(105, 1)));
  A(B(104, 1), (ff) => { const b = ff.boss; b.loop(b.idleClip); b.behave = 'hold'; });
  // EVERY WOMAN'S LAUGH COULD BE MY SHIFT: four of her round you; the fourth to laugh is her
  H(B(105, 1) - 0.02, () => decoys(B(105, 1), beats(106), B(107, 1)));
  // I CARVED MY INITIALS IN YOUR HIPPOCAMPUS: P T S D, one letter a beat; each carves a bar later
  A(B(107, 1), () => set().seahorseRise(B(107, 1)));
  H(B(107, 1) - 0.02, () => initials([B(107, 1), B(107, 2), B(107, 3), B(107, 4)], [B(108, 1), B(108, 2), B(108, 3), B(108, 4)]));
  A(B(107, 1), (ff) => { const b = ff.boss; b.place(0, -3.6, 0); b.behave = 'hold'; b.loop('Spell_Simple_Idle_Loop'); });
  // NOW YOUR TRAUMA WEARS MY NAME LIKE A COMPASS: the needle swings a beat behind you and fires, twice
  A(B(109, 1), (ff) => { her().place(0, 0); ff.boss.loop(ff.boss.idleClip); set().compass(B(109, 1), B(111, 1)); });
  H(B(109, 1) - 0.02, () => needle(B(109, 1), B(110, 1))); H(B(110, 1) + 0.02, () => needle(B(110, 1) + 0.02, B(110, 3)));
  A(B(111, 1), () => her().out(B(111, 1)));

  // ================================================================ VERSE 3 (183.40–201.61) — YOUR PLACE, MORNING
  A(B(112, 1), () => set().tell('mirror', B(112, 1), B(112, 2)));
  A(B(112, 2), (ff) => { her().place(0, -6.4); her().hide(false); const b = ff.boss; b.behave = 'hold'; b.idle = 'Idle_Talking_Loop'; b.loop(b.idleClip); });
  grenade(112, 4.5, { land: B(113, 1), thing: 'plant' });
  kiss(113, 2, { n: 5, spread: 24 }); kiss(113, 4, { n: 5, spread: 24 });
  A(B(114, 1), () => her().out(B(114, 1)));
  A(B(114, 2), () => set().tell('knife', B(114, 2), B(114, 3)));
  A(B(114, 3), (ff) => { her().place(7.2, -5.3); her().hide(false); ff.boss.behave = 'hold'; });
  grenade(114, 3.5, { land: B(114, 4), thing: 'candle' });
  H(B(115, 1) - 0.02, () => her().knives(beats(115), B(116, 1)));
  // she vaults the island at you: close quarters. A real jump, over the counter and down on open floor this side of
  // YOU (no floor to land on short of you: she stays behind it, and her slap comes from there)
  A(B(116, 2), (ff) => {
    const b = ff.boss, p = ff.player, m = b.radius * 0.8 + 0.04;
    const a = Math.atan2(p.x - b.x, p.z - b.z), full = Math.hypot(p.x - b.x, p.z - b.z);
    let d = -1;
    for (let q = Math.max(0, full - 1.6); q <= full - 1.0; q += 0.15) if (set().free(b.x + Math.sin(a) * q, b.z + Math.cos(a) * q, m)) { d = q; break; }
    if (d < 0.6 || b.intangible || !b.root.visible) return;
    b.moveTo(b.x + Math.sin(a) * d, b.z + Math.cos(a) * d, 0.3, { easing: 'linear', arc: clamp(0.95 + d * 0.12, 1.1, 1.8) }); her().act('Jump_Start', ff.t + 0.15, { contact: 0.5, dur: 0.3 });
    ff.at(ff.t + 0.3, () => { if (!ff.boss.scene) { tr.snd.play('heel', { x: ff.boss.x }); ff.fx.dust(ff.boss.x, ff.boss.z, 8); } });
  });
  H(B(116, 2) + 0.31, () => her().slap(B(116, 2) + 0.31, B(116, 3)));
  H(B(116, 3) + 0.02, () => her().swipe(B(116, 3) + 0.02, B(116, 4)));
  grenade(116, 4.5, { land: B(117, 1), thing: 'mug' });
  watch(B(117, 1), B(118, 1) - B(117, 1));
  // YOU SEE MY FACE: her face in every glass in the room, one a beat, each a kiss; the front door's gap is the tell
  A(B(118, 1), () => her().out(B(118, 1)));
  H(B(118, 1) - 0.02, () => faces(beats(118)));
  A(B(118, 4), () => set().tell('front', B(118, 4), B(119, 1)));
  A(B(119, 1), (ff) => { her().place(-10.0, 3.2, Math.PI / 2); her().hide(false); ff.boss.behave = 'hold'; set().frontDoorOpen(B(119, 1)); });
  grenade(119, 1.5, { land: B(119, 2), thing: 'flowers', from: { x: -9.6, z: 2.6 }, fromY: 0.9 });
  A(B(119, 2), () => set().laceSurge(B(119, 2)));
  kiss(119, 4, { n: 3 });
  A(B(120, 3), () => her().out(B(120, 3)));
  A(B(120, 4), () => her().reflection(0, -0.5, B(120, 4), B(121, 1)));
  A(B(121, 1), (ff) => { her().place(0, -0.5); her().hide(false); ff.boss.loop('Spell_Simple_Idle_Loop'); ff.boss.behave = 'hold'; ff.boss.open(B(122, 1) - ff.t); });
  // PTSDREAM GIRL OWNS THIS SPACE: four lace cracks race out from her, one a beat; on 122:1 a white ring
  H(B(121, 1) - 0.02, (ff) => { set().laceCracks(beats(121)); ff.at(B(122, 1), () => { if (tr.wrecked) return; ff.addWave({ x: ff.boss.x, z: ff.boss.z, r: 1, speed: 24, band: 0.7, max: 13, kind: 'white', hit: false, damage: 1 }); tr.snd.play('rush', { x: ff.boss.x }); }); });

  // ================================================================ FINAL CHORUS (201.61–229.74) — EVERYTHING
  A(B(122, 1) + 0.1, (ff) => { const b = ff.boss; b.idle = 'Idle_FoldArms_Loop'; b.moveTo(0, -6.4, 1.4, { easing: 'inOut' }); b.perform('Walk_Formal_Loop', { duration: 1.4, then: 'Idle_FoldArms_Loop' }); b.open(B(123, 1) - ff.t); });
  A(B(122, 1) + 1.6, (ff) => { const b = ff.boss; b.lockFacing = true; b.faceNow(0, -9); });
  A(B(122, 1), () => set().exitDrop(B(121, 1), B(122, 1)));
  H(B(123, 1) - 0.02, () => her().doorBlast(beats(123), B(124, 1)));
  A(B(124, 1) + 0.25, (ff) => { const b = ff.boss; b.lockFacing = false; b.idle = 'Dance_Loop'; b.moveTo(0, -4.4, 0.8, { easing: 'inOut' }); });
  grenade(124, 1.5, { land: B(124, 2) }); grenade(124, 3.5, { land: B(124, 4) });
  kiss(124, 3, { n: 5, spread: 24 });
  H(B(125, 1) - 0.02, () => set().showerCount(beats(125), B(126, 1), { apex: { x: -9.8, z: -4.4 }, island: true }));
  H(B(127, 1) - 0.02, () => her().mirrorRing(beats(127), B(128, 1)));
  // (the island stands end-on here, from z -7 to -3.8: she comes in at its near end, not in it)
  A(B(128, 2), (ff) => { her().flicker(B(128, 2), B(128, 3), 8.8, -3.2, { tell: 'knife' }); ff.at(B(128, 3), () => { ff.boss.behave = 'hold'; }); });
  H(B(129, 1) - 0.02, () => her().knives(beats(129), B(130, 1)));
  grenade(129, 4.5, { land: B(130, 1) });
  H(B(130, 1) - 0.02, () => set().barcode(B(130, 1), [B(131, 1), B(131, 2), B(131, 3), B(131, 4)], { x0: -10.5, x1: 10.5, z0: -5.1, z1: 5.1 }));
  cadence({ leap: B(131, 4), head: [B(132, 1), B(132, 2), B(132, 3)], bed: [B(132, 3), B(132, 4), B(133, 1), B(133, 3)], brk: [B(133, 2) + 0.2, B(133, 3), B(133, 4)],
    s1: [B(134, 1), B(134, 2), B(134, 3)], s2: [B(135, 1), B(135, 2), B(135, 3)], laugh: B(135, 4), hearts: 6 });
  A(B(136, 1) - 0.05, () => her().crown(B(136, 1), B(138, 1)));
  grenade(137, 4.5, { land: B(138, 1) });

  // ================================================================ OUTRO AND THE FINISH (229.74–263.04)
  A(B(139, 1), (ff) => { const b = ff.boss; b.idle = 'Dance_Loop'; if (!tr.wrecked) b.loop(b.idleClip); });
  H(B(139, 1) - 0.02, () => her().knives(beats(139), B(140, 1)));
  kiss(139, 2, { n: 3 }); kiss(139, 4, { n: 3 });
  A(B(141, 1), () => set().flares(B(141, 1)));
  H(B(140, 4.5), (ff) => { const p = { x: ff.player.x, z: ff.player.z }; for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) her().grenade({ land: B(141, 1), at: { x: p.x + dx * 3.6, z: p.z + dz * 3.6 }, noThrow: dx !== 0 || dz !== -1 }); });
  kiss(142, 2, { n: 5, spread: 24 });
  // EVERY NIGHT YOU DREAM WE'RE BACK TOGETHER: the table for two
  A(B(142, 1), () => set().table(B(142, 1), B(143, 1), B(145, 2)));
  A(B(143, 2), (ff) => { her().place(-0.75, 0.8, Math.PI / 2); her().hide(false); const b = ff.boss; b.behave = 'hold'; b.idle = 'Sitting_Idle_Loop'; b.perform('Sitting_Enter', { duration: 0.5, then: 'Sitting_Idle_Loop' }); b.open(B(145, 1) - ff.t); ff.at(ff.t + 1.0, () => her().act('Interact', ff.t + 0.4, { contact: 0.4, dur: 0.8 })); });
  for (const [bar, beat] of [[143, 3], [144, 1], [144, 3]]) kiss(bar, beat, { n: 1, speed: 6 });
  A(B(145, 1), (ff) => { const b = ff.boss; b.idle = 'Dance_Loop'; b.perform('Sitting_Exit', { duration: 0.5, then: 'idle' }); });
  H(B(145, 4) - 0.02, () => her().everywhere(B(145, 4), beats(146), { per: 2, settle: { t: B(147, 1) } }));
  // BABY, BABY: a short cadence under the siren
  cadence({ leap: B(147, 1), head: [B(147, 1) + 0.05, B(147, 2), B(147, 3)], bed: [B(147, 3), B(147, 4), B(148, 1), B(148, 3)], brk: [B(148, 1) + 0.05, B(148, 2), B(148, 3)],
    s1: [B(148, 3) + 0.05, B(148, 4), B(149, 1)], s2: null, laugh: B(149, 2), hearts: 6 });
  for (const bar of [151, 152, 153, 154]) { grenade(bar - 1, 4.5, { land: B(bar, 1) }); kiss(bar, 3, { n: 3 }); }
  A(B(150, 1), (ff) => { const b = ff.boss; if (!b.intangible && !tr.wrecked) { b.moveTo(0, -4.4, 0.8); b.idle = 'Dance_Loop'; } });
  // THE PIN, and THE LAST COUNT (when her bar is empty): her death scene (death.js) plays the song's last bars from
  // here: the pin of the bottle at her heart, the count of four on the 1 of bars 152 to 155, the sting on 156:1

  // ---------------------------------------------------------------- the pieces the timeline uses
  function slapOff() { her().slapOn = false; }
  function moveToNow(ff, x, z, dur) { ff.boss.moveTo(x, z, dur, { easing: 'inOut' }); }
  function behindYou(ff, d) { const pl = ff.player, aim = ff._aim || { x: pl.x, z: pl.z - 1 }; const a = Math.atan2(aim.x - pl.x, aim.z - pl.z); return { x: clamp(pl.x - Math.sin(a) * d, -10.2, 10.2), z: clamp(pl.z - Math.cos(a) * d, -6.4, 6.4) }; }
  function stompAt(t0, land, r, spot) {
    const ff = f, sh = { shape: 'circle', x: ff.player.x, z: ff.player.z, w: r };
    spot.x = sh.x; spot.z = sh.z;           // she comes down where the circle locked
    ff.pat.area(ff, { ...sh, kind: 'white', start: t0, end: land, damage: 2 });
    ff.tele.add({ shape: 'ring', x: sh.x, z: sh.z, w: r + 0.6, param: 0.6, kind: 'white', start: t0, end: land });
    her()._eighths(t0, land, () => sh.x);
    ff.at(land, () => {
      tr.snd.play('stomp', { x: sh.x }); ff.cam.shake(1.4, 0.3); ff.cam.kick(2.2); ff.fx.dust(sh.x, sh.z, 20);
      ff.addWave({ x: sh.x, z: sh.z, r, speed: (9 - r) / 0.35, band: 0.6, max: 9, kind: 'white', hit: false, damage: 1 });
      set().blowTubes(land);
    });
  }
  function cadence(c) {
    H(c.leap - 0.02, (ff) => { her().slapOn = false; ff.boss.behave = 'hold'; });
    if (c.head) H(c.head[0] - 0.04, () => her().head(c.head[0], c.head[1], c.head[2], { leapAt: c.leap }));
    if (c.bed) H(c.bed[0] - 0.02, () => her().bed(c.bed[0], c.bed[1], c.bed[2], { up: c.bed[3] }));
    if (c.brk) H(c.brk[0] - 0.02, () => her().breakdown(c.brk[0], c.brk[1], c.brk[2]));
    if (c.s1) H(c.s1[0] - 0.02, () => her().stomp(c.s1[0], c.s1[1], c.s1[2], { hearts: c.hearts }));
    if (c.s2) H(c.s2[0] - 0.02, () => her().stomp(c.s2[0], c.s2[1], c.s2[2], { hearts: c.hearts }));
    if (c.dance) A(c.dance[0], (ff) => { ff.boss.loop('Dance_Loop'); ff.boss.open(c.dance[1] - c.dance[0]); });
    A(c.laugh, (ff) => { const b = ff.boss; if (tr.wrecked) return; b.root.position.y = 0; b.intangible = false; b.root.visible = true; her().act('Yes', ff.t + 0.3, { contact: 0.3, dur: 0.8 }); b.open(ff.beat * 2); her().expr('delight', ff.t, ff.beat * 2); });
  }
  // the lace loop: a barrier ring round where you stood on 57:1, tightening each beat, snapping shut on 58:1
  function lace(ticks, snap) { set().laceRing(ticks, snap); }
  function phoneThrow(ff) {
    const b = ff.boss, src = her()._handOrHer();
    const a = Math.atan2(ff.player.x - src.x, ff.player.z - src.z);
    const p = ff.proj.spawn({ x: src.x + Math.sin(a) * 0.6, z: src.z + Math.cos(a) * 0.6, y: 1.4, angle: a, speed: 12, kind: 'pink', shape: 'card', size: 0.7, spin: 7 });
    if (p) p.tag = 'phone';
    tr.snd.play('whoosh', { x: b.x });
  }
  function sprint(ff) {
    const b = ff.boss;
    const path = [[-10.4, -6.0], [-10.4, 5.4], [10.2, 5.4]];
    let t = ff.t; const v = 10;
    b.behave = 'hold'; b.runClip = 'Sprint_Loop';
    let x0 = b.x, z0 = b.z;
    for (const [x, z] of path) { const d = Math.hypot(x - x0, z - z0) / v; const at = t; ff.at(at, () => b.moveTo(x, z, d, { easing: 'linear' })); t += d; x0 = x; z0 = z; }
    tr.snd.play('giggle', { x: b.x });
  }
  function ink(ff, t0, t1) {
    const p = { x: ff.player.x, z: ff.player.z };
    ff.pat.area(ff, { shape: 'circle', x: p.x, z: p.z, w: 1.3, kind: 'white', start: t0, end: t1, damage: 1, onImpact: () => { tr.snd.play('splat', { x: p.x }); set().stain(p.x, p.z); } });
  }
  function trigger(ff, pop) {
    const p = { x: ff.player.x, z: ff.player.z };
    if (ff.suppress) return;               // the spotlight: no plate
    tr.snd.play('plate', { x: p.x });
    ff.pat.area(ff, { shape: 'circle', x: p.x, z: p.z, w: 1.4, kind: 'white', start: ff.t, end: pop, damage: 1, onImpact: () => { tr.snd.play('pop', { x: p.x }); set().flood(p.x, p.z); } });
  }
  function decoys(split, laughs, lunge) { set().decoys(split, laughs, lunge); }
  function initials(appear, carve) { set().initials(appear, carve); }
  function needle(t0, fire) {
    const ff = f;
    let ang = 0, lagX = ff.player.x, lagZ = ff.player.z;
    const sh = ff.pat.area(ff, { shape: 'rect', x: ff.boss.x, z: ff.boss.z, w: 0.5, h: 12, kind: 'white', start: t0, end: fire, damage: 1,
      follow: () => { const b = ff.boss; const k = 1 - Math.exp(-ff.dt / Math.max(0.05, ff.beat * 0.9)); lagX += (ff.player.x - lagX) * k; lagZ += (ff.player.z - lagZ) * k; if (ff.t < fire - 0.12) ang = Math.atan2(lagX - b.x, lagZ - b.z); return { x: b.x, z: b.z, angle: ang }; },
      onImpact: () => tr.snd.play('tunk', { x: ff.boss.x }) });
    const n = 4; for (let i = 0; i < n; i++) { const tk = t0 + (fire - t0) * i / n; ff.at(tk, () => { if (!ff.suppress) tr.snd.play('tik', { x: ff.boss.x, rate: tr.snd.tickRate(tk, i) }); }); }
    ff.at(t0, () => { if (!ff.suppress) tr.snd.play('whine', { x: ff.boss.x }); });
    void sh;
  }
  function faces(ticks) {
    const glass = [['mirror', 0, -6.6], ['vanity', -6.4, -6.6], ['stall', -9.8, -4.8], ['window', 7.6, -6.6]];
    ticks.forEach((t, i) => f.at(t, () => { if (tr.wrecked) return; const [name, x, z] = glass[i]; set().faceIn(name, t); her().kissFan(t, { n: 1, speed: 11, from: { x, z } }); }));
  }
}
// a shared bag for things the timeline sets up
export const W = {};
