// The choreography, section by section, on the song's own beats (design §5). The design's seconds are snapped
// to the beat map (half-beats), so every impact lands on a beat. Everything she does that outlives a rewind's
// start (a long fill) is registered in tr._long and re-added by onRewind with its original start.
import * as THREE from 'three';
import { zone, markAt, shotAt, lungeAt, sweepAt, slamAt, arcAt, coneTrack, waveAt, laneAt, bigZone, toward } from './moves.js';
import { TIME, BLOCK } from './set.js';
import { script2 } from './script2.js';

export function script(T, f, tr) {
  const bm = f.bm, D = tr.dir, set = tr.set;
  const S = (s) => { const n = bm.nearest(s, 2); return Math.abs(n.offset) < 0.085 ? n.time : s; };
  // (once her death scene has her, the song's last bars are the scene's: nothing scripted fires, or sounds, under it)
  const inScene = () => !!(f.boss && f.boss.scene);
  const at = (s, fn) => T.at({ s: S(s) }, (ff) => { if (!inScene()) fn(ff); });
  const B = (s) => bm.periodAt(s);                 // the beat's length there
  const snd = (name, o) => tr._snd && !inScene() && tr._snd.play(name, o);
  const boss = () => f.boss;
  tr._long = [];
  // fn returns its shape (with .tele): the copy that's up is remembered, so a re-add takes it down first
  const long = (t0, t1, fn) => { const L = { t0: S(t0), t1: S(t1), fn, tele: null }; tr._long.push(L); at(t0, (ff) => { const sh = fn(ff); L.tele = (sh && sh.tele) || null; }); };

  // ---------------------------------------------------------------- sections (rewind checkpoints)
  const SEC = [
    ['intro', 0, 11.18], ['verse 1', 11.18, 22.59], ['verse 1b', 22.59, 33.99], ['verse 1c', 33.99, 46.46],
    ['bridge 1', 46.46, 59.64, { close: true }], ['chorus 1', 59.64, 95.27], ['verse 2', 95.27, 116.65],
    ['chorus-verse', 116.65, 129.47], ['bridge 2', 129.47, 140.88, { close: true }], ['chorus 2', 140.88, 166.54],
    ['verse 3', 166.54, 177.96], ['verse 3b', 177.96, 195.06], ['final chorus', 195.06, 207.88, { final: true }], ['final 2', 207.88, 231.75],
  ];
  for (const [name, a, b, o] of SEC) T.section(name, { s: a === 0 ? 0 : S(a) }, { s: S(b) }, o || {});

  // ---------------------------------------------------------------- shared moves (design §5 definitions)
  // a text: a pink speech bubble aimed at YOU, arriving on the beat two beats later
  const text = (s, n = 1, arc = 0, lead = 0, shape = 'card', size = 0.42) => at(s, (ff) => {
    if (ff.suppress) return;
    shotAt(ff, { tArrive: ff.t + 2 * B(ff.t), n, arc, lead, shape, size });
    boss().perform('Spell_Simple_Shoot', { duration: 0.32, from: 0.1, to: 0.8, fade: 0.04, then: 'Spell_Simple_Idle_Loop' });
  });
  // DAD SLAM: the mark follows YOU, locks a beat early; she leaps from wherever she is and lands on it in a fire burst
  const dadSlam = (tFollow, tLock, tHit, r = 2.3) => at(tFollow, (ff) => {
    const t1 = S(tHit), tl = S(tLock);
    const spot = markAt(ff, { t0: ff.t, tLock: tl, t1, r, kind: 'white', onImpact: (hit) => { if (hit === 'hit') D.face('glee', 0.8); } });
    const tOff = Math.max(ff.t, t1 - 2 * B(t1));
    ff.at(tOff, () => D.leap(spot, t1, { h: 3.4 }));
    ff.at(t1, () => { set.burst(spot.x, spot.z, 1.3); snd('land', { x: spot.x }); ff.cam.shake(0.5, 0.15); ff.after(0.02, () => boss().open(B(t1) * 1.0)); });
    D.lock(t1 + B(t1));
  });
  // BETTER THAN YOU: three pink sweeps, one per syllable, each re-aimed with a 2-beat wind-up; she steps 0.8 m a swipe
  const betterThanYou = (t1s, r = 3.0, arc = 110) => {
    const clips = ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C'];
    let parried = 0;
    t1s.forEach((t1, i) => at(t1 - 2 * B(t1), (ff) => {
      if (i === 0) parried = 0;
      D.lock(S(t1) + B(t1));
      sweepAt(ff, { t1: S(t1), r, arc, kind: 'pink', step: 0.8, clip: clips[i], onImpact: (hit) => {
        if (hit === 'parried') { parried++; const b = boss(), a = toward(ff.player, b); b.moveTo(b.x + Math.sin(a) * 0.7, b.z + Math.cos(a) * 0.7, 0.12, { easing: 'out', face: false }); if (parried === 3) { b.state = 'perform'; b.open(1.4); D.face('shock', 0.8); } }
        if (hit === 'hit') D.face('glee', 0.6);
      } });
    }));
  };
  // YOUR DAD x3: three pink lunges, a 2-beat wind-up each, one every 2 beats, re-aimed; three parries = a stagger
  const yourDad = (t1s) => {
    let parried = 0;
    t1s.forEach((t1, i) => at(t1 - 2 * B(t1), (ff) => {
      if (i === 0) parried = 0;
      D.lock(S(t1) + B(t1) * 0.5);
      lungeAt(ff, { t1: S(t1), w: 0.8, len: 3.5, kind: 'pink', onImpact: (hit) => { if (hit === 'parried') { parried++; if (parried === 3) { boss().state = 'perform'; boss().open(1.4); D.face('shock', 0.8); } } else if (hit === 'hit') D.face('glee', 0.6); } });
    }));
  };
  // THAN YOU x3: three white marks, following a beat and locked a beat: dodge, don't parry
  const thanYou = (t1s, r = 1.6) => t1s.forEach((t1) => at(t1 - 2 * B(t1), (ff) => {
    markAt(ff, { tLock: S(t1) - B(t1), t1: S(t1), r, kind: 'white', onImpact: () => set.burst(ff.player.x, ff.player.z, 0.6) });
    boss().perform('OverhandThrow', { duration: 0.4, from: 0.25, to: 0.75, fade: 0.04 });
    snd('flick', { x: boss().x });
  }));

  // ================================================================ INTRO 0.00-11.18 (night, first snow, our bed)
  at(0, (ff) => {
    const b = boss();
    D.mode = 'still'; D.lock(2.3); D._seated = true; D.seatY = 0.16;
    b.idle = 'Sitting_Idle_Loop'; b.rig.play('Sitting_Idle_Loop', { fade: 0, force: true });
    b.lockFacing = true; b.faceNow(9, -0.6); b.lockFacing = true;
    tr.seatYou && tr.seatYou(ff);
  });
  at(0.32, () => D.face('smug'));
  at(2.245, (ff) => {
    const b = boss();
    D._seated = false; b.lockFacing = false;
    b.idle = 'Idle_TalkingPhone_Loop';
    b.perform('Sitting_Exit', { duration: 0.62, fade: 0.08 });
    ff.after(0.6, () => { const e = D.strut(6.7, 0.9, 2.0); ff.at(e, () => D.strut(5.0, 1.0, 1.8)); });
    D.lock(4.0);
  });
  // THE FIRST MATCH: the bed goes up on 3:1
  at(4.037, (ff) => {
    D.lock(5.9);
    zone(ff, { shape: 'circle', x: 5, z: -0.6, w: 1.8, kind: 'white', t0: ff.t, t1: S(5.466) });
    boss().faceNow(5, -0.6); boss().idle = 'Idle_Talking_Loop';
  });
  at(4.39, (ff) => { boss().perform('Interact', { duration: 0.45, fade: 0.06 }); snd('strike', { x: boss().x }); });
  at(4.75, () => { D.face('smug'); boss().perform('Spell_Simple_Idle_Loop', { duration: 0.36, fade: 0.08 }); });
  at(5.11, (ff) => { boss().perform('OverhandThrow', { duration: 0.42, from: 0.2, to: 0.85, fade: 0.04 }); snd('flick', { x: boss().x }); set.flyMatch(boss(), { x: 5, z: -0.6 }, S(5.466)); });
  at(5.466, (ff) => { snd('whump', { x: 5 }); ff.fx.sparks(5, 0.8, -0.6, new THREE.Color(3.2, 1.0, 0.3), 26); ff.cam.shake(0.3, 0.12); });
  // free beats: she walks to the walk, hit her as much as you like
  // (round the bed's corner and the box beside it, not through them)
  at(5.9, (ff) => { D.lock(7.9); const e = D.strut(3.4, 2.0, 2.6); ff.at(e, () => D.strut(0.5, -1.0, 2.6)); });
  // GLORY: a kiss blown on 5:2, arriving on 5:4
  at(8.32, (ff) => { boss().perform('Consume', { duration: 0.34, from: 0.3, to: 0.7 }); const h = boss().fig.bones.Head; if (h) { const p = h.getWorldPosition(new THREE.Vector3()); ff.fx.glitter(p.x, p.y, p.z, new THREE.Color(4, 0.6, 1.7), 10, 0.25); } });
  at(8.68, (ff) => { if (ff.suppress) return; shotAt(ff, { tArrive: S(9.396), shape: 'kiss', size: 0.5 }); boss().perform('Spell_Simple_Shoot', { duration: 0.3, from: 0.15, to: 0.8 }); });
  // THE SECOND MATCH: a mark on YOU from 6:2, locked on 6:4, the band comes in on the impact
  at(10.11, (ff) => {
    D.lock(11.3);
    boss().perform('Interact', { duration: 0.34, fade: 0.06 }); snd('strike', { x: boss().x });
    markAt(ff, { t0: ff.t, tLock: S(10.82), t1: S(11.178), r: 1.5, kind: 'white', onImpact: () => {} });
  });
  at(10.46, (ff) => { boss().perform('OverhandThrow', { duration: 0.4, from: 0.25, to: 0.8 }); snd('flick', { x: boss().x }); });
  at(11.178, (ff) => { const p = ff.tele.list.length ? null : null; snd('whump', { x: ff.player.x, gain: 0.8 }); });

  // ================================================================ VERSE 1 11.18-22.59 "Watched your texts"
  at(11.178, (ff) => { D.mode = 'story'; boss().idle = 'Spell_Simple_Idle_Loop'; boss().perform('Spell_Simple_Enter', { duration: 0.36, then: 'Spell_Simple_Idle_Loop' }); });
  for (const s of [11.54, 11.89]) text(s);
  text(12.24, 3, 36); text(12.96); text(13.32, 3, 36);
  text(14.39); text(14.73); text(15.08, 3, 36); text(16.17, 3, 36);
  for (const s of [17.24, 17.60, 17.95, 18.31]) text(s, 1, 0, 0.5);
  at(18.67, () => { boss().perform('Interact', { duration: 0.34 }); D.face('smug'); });
  text(19.02, 5, 72);
  // BURNED DOWN: she reads up close (an opening), the phone catches fire, she throws it
  at(19.37, () => { D.lock(22.4); boss().idle = 'Idle_TalkingPhone_Loop'; boss().perform('Idle_TalkingPhone_Loop', { duration: 1.4 }); });
  at(20.80, (ff) => {
    const b = boss();
    const sh = { a: toward(b, ff.player) };
    const lane = ff.tele.add({ shape: 'rect', x: b.x, z: b.z, angle: sh.a, w: 0.6, h: 9, kind: 'pink', start: ff.t, end: S(22.23),
      follow: () => { if (ff.t < S(21.16)) { sh.a = toward(b, ff.player); sh.len = Math.hypot(ff.player.x - b.x, ff.player.z - b.z); } return { x: b.x, z: b.z, angle: sh.a }; } });
    lane.h = 9; tr._phoneLane = sh;
    ff.cue('pink', b); snd('whump', { x: b.x, gain: 0.4, rate: 1.8 });
  });
  at(21.52, (ff) => {
    if (ff.suppress) return;
    const b = boss(), sh = tr._phoneLane || { a: toward(b, ff.player), len: 6 };
    b.perform('OverhandThrow', { duration: 0.42, from: 0.2, to: 0.85 });
    const dist = Math.max(2, (sh.len || 6) - 0.9), dur = S(22.23) - ff.t;
    const p = ff.proj.spawn({ x: b.x + Math.sin(sh.a) * 0.9, z: b.z + Math.cos(sh.a) * 0.9, y: 1.3, angle: sh.a, speed: Math.min(14, dist / dur), kind: 'pink', shape: 'orb', size: 0.75, life: 2.4, tag: 'phone' });
    ff.sfx.fire && ff.sfx.fire('orb', ff.pan(b.x));
    snd('leap', { x: b.x, rate: 0.7 });
  });

  // ================================================================ BRIDGE 1 46.46-60.35 "The match" (THE RULE)
  at(46.457, (ff) => { D.mode = 'pour'; D.setBase('hurt'); D.hitCount = 0; D.lock(47.3); boss().idle = 'Idle_Talking_Loop'; });
  at(46.82, (ff) => { snd('thump', { x: 0 }); boss().perform('PickUp_Table', { duration: 0.5 }); });
  // the pour: she draws the burn zone herself
  at(47.18, (ff) => { D.lock(48.9); D.strut(-3.6, 0.0, Math.hypot(-3.6 - boss().x, 0 - boss().z) / Math.max(0.4, S(48.25) - ff.t)); });
  for (const [i, s] of TIME.soak.entries()) at(s, (ff) => { const r = [[-3.7, 0.9], [-3.7, -4.3], [0, -1.7], [5, -4.3], [5, 0.9]][i]; snd('splash', { x: r[0] }); ff.fx.dust(r[0], r[1], 6, new THREE.Color(0.25, 0.22, 0.3)); boss().perform('OverhandThrow', { duration: 0.4, from: 0.3, to: 0.8 }); });
  at(48.97, () => { D.lock(50.2); D.skid(3.0, -1.5, 0.72); });
  at(49.75, (ff) => { D.lock(51.3); D.strut(5.0, -1.75, 2.0); });
  at(51.48, (ff) => { D.lock(52.5); set.tossCan(boss(), { x: 2.2, z: 5.4 }, S(52.15)); ff.after(0.15, () => D.strut(0.0, -4.4, 2.6)); });
  at(52.15, () => snd('clatter', { x: 2.2 }));
  at(52.52, (ff) => { D.lock(53.5); boss().faceNow(0, -5.3); boss().perform('Interact', { duration: 0.5, fade: 0.06 }); });
  // YOU LIT THE MATCH SO GENTLY: the strike, and THE BLOCK starts to fill (20 beats to the eruption)
  at(53.259, (ff) => { boss().perform('Sword_Attack', { duration: 0.5, from: 0.1, to: 0.7 }); snd('flare', { x: 0 }); ff.fx.flash(new THREE.Color(0.3, 0.18, 0.07), 1); ff.cam.shake(0.3, 0.2); });
  long(53.259, 60.352, (ff) => bigZone(ff, { shape: 'rect', x: 1.3, z: BLOCK.z0, angle: 0, w: 7.3, h: BLOCK.z1 - BLOCK.z0, t0: S(53.259), t1: S(60.352), damage: 2, dim: 0.42,
    onImpact: (hit) => { if (hit === 'hit') D.face('glee', 1.0); } }));
  at(53.61, () => { D.face('hurt'); D.lock(54.6); boss().perform('Spell_Simple_Idle_Loop', { duration: 0.9 }); });
  at(54.18, () => D.face('glee'));
  at(54.67, (ff) => { D.lock(55.8); boss().perform('PickUp_Table', { duration: 0.42, from: 0.0, to: 0.6 }); });
  // the fuse, heard where it runs: down the walk, then round the left of the block (and, from the street, the right);
  // a soft fwump as each loop closes at the house (the flames' own ignite times: 57.20 and 57.59)
  at(55.02, (ff) => { snd('whump', { x: 0, gain: 0.7 }); snd('fuse', { x: 0, path: [[0.57, 0], [1.0, -6], [1.75, -6], [2.18, 0]] }); });
  T.at({ s: TIME.fuseStreet }, () => snd('fuse', { x: 0, gain: 0.9, path: [[0.63, 8.6], [1.37, 8.6], [2.0, 0]] }));
  for (const s of [57.20, 57.59]) T.at({ s }, () => snd('whump', { x: 0, gain: 0.4, rate: 1.2 }));
  // the silence: nothing but the ring of fire crackling round the block
  at(58.21, () => { snd('crackle', { x: -6 }); snd('crackle', { x: 8.6, at: 0.05 }); });
  at(55.37, (ff) => { D.setBase('glee'); boss().perform('Spell_Simple_Enter', { duration: 0.4, then: 'Spell_Simple_Idle_Loop' }); tr.fig.U && tr.fig.U.fInterior && null; });
  at(55.84, (ff) => { D.lock(58.3); D.strut(4.5, -1.5, Math.hypot(4.5 - boss().x, -1.5 - boss().z) / Math.max(0.5, S(58.18) - ff.t)); });
  at(58.21, (ff) => { D.lock(60.4); boss().idle = 'Spell_Simple_Idle_Loop'; boss().perform('Spell_Simple_Idle_Loop', { duration: 2.0 }); boss().faceNow(ff.player.x, ff.player.z); D.face('glee'); });
  at(60.0, () => snd('breath', { x: 1.3 }));
  at(60.352, (ff) => { snd('whoomph', { x: 1.3 }); ff.fx.flash(new THREE.Color(0.3, 0.1, 0.025), 1); ff.fx.aberrate(1.6); ff.cam.shake(1.2, 0.4); ff.cam.kick(2.0); D.mode = 'dance'; boss().idle = 'Dance_Loop'; });

  // ================================================================ CHORUS 1 59.64-95.27 "I fucked your dad" (THE YARD ON FIRE)
  dadSlam(60.352, 60.71, 61.066);
  dadSlam(61.42, 62.14, 62.49);
  at(62.84, (ff) => { D.lock(63.6); boss().perform('Sword_Heavy_Combo', { duration: 0.72, from: 0.05, to: 0.6 }); });
  betterThanYou([63.92, 64.27, 64.63]);
  dadSlam(65.35, 65.69, 66.04);
  at(66.4, () => { boss().perform('Dance_Loop', { duration: 0.7 }); D.face('glee', 0.7); });
  dadSlam(67.13, 67.84, 68.19);
  // HE KNEW EXACTLY WHAT TO DO: sparks flicked from the staff, each placed on YOU two beats ahead, locked for its last
  for (const s of [69.26, 69.98, 70.33, 70.68]) at(s - 2 * B(s), (ff) => { markAt(ff, { tLock: S(s) - B(s), t1: S(s), r: 1.3, kind: 'white', onImpact: () => set.burst(ff.player.x, ff.player.z, 0.45) }); });
  at(70.84, () => { D.lock(71.7); boss().perform('Idle_No_Loop', { duration: 0.9 }); });
  dadSlam(71.76, 72.11, 72.47);
  at(72.83, () => D.face('glee', 1.0));
  // HE CALLED ME BY YOUR NAME: six texts, one a beat
  for (const s of [74.97, 75.32, 75.67, 76.03, 76.39, 76.75]) text(s);
  dadSlam(77.46, 77.82, 78.17);
  // SEE THIS SCENE: the staff whirled overhead, a fire ring sets off on "day"
  at(81.38, (ff) => { D.lock(82.6); boss().perform('Sword_Heavy_Combo', { duration: 1.0, from: 0.0, to: 0.8 }); waveAt(ff, { t1: S(82.45), speed: 8, band: 0.6, max: 12 }); });
  yourDad([83.87, 84.57, 85.30]);
  // on the third, she leaps back into the fire; THAN YOU from inside it
  at(85.40, (ff) => { const s = { x: 3.0, z: -2.4 }; D.leap(s, S(86.0), { h: 3.0 }); });
  thanYou([86.72, 87.43, 88.15]);
  // she comes back out of the fire for YOUR DAD
  at(88.2, (ff) => { const pl = ff.player, b = boss(); const a = toward(pl, b); const s = set.safeSpot(pl.x + Math.sin(a) * 3.2, pl.z + Math.cos(a) * 3.2); D.leap(s, S(88.86), { h: 3.0 }); });
  yourDad([89.57, 90.27, 91.00]);
  // NOW WHAT THE FUCK YOU GONNA DO: arms wide, chest open. The best spotlight in the song.
  at(91.35, (ff) => { D.lock(92.6); boss().perform('Spell_Simple_Idle_Loop', { duration: 1.2 }); D.face('glee', 1.2); ff.after(0.02, () => boss().open(1.2)); });
  for (const [t0, t1] of [[92.58, 93.12], [93.30, 93.84]]) at(t0, (ff) => { D.lock(S(t1) + 0.1); slamAt(ff, { t1: S(t1), r: 3.0, kind: 'white', onImpact: () => { snd('land', { x: boss().x }); set.burst(boss().x, boss().z, 1.4); } }); boss().perform('Sword_Attack', { duration: S(t1) - ff.t + 0.15, from: 0.1, to: 0.6 }); });
  at(93.836, (ff) => { D.mode = 'story'; boss().idle = 'Idle_Talking_Loop'; snd('pff', { x: boss().x }); D.face('smug'); });

  script2(T, f, tr, { S, at, B, snd, boss, long, text, dadSlam, betterThanYou, yourDad, thanYou });
}
