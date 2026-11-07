// The choreography, second half of the record: verse 1b (the frozen foods aisle) to the finish (design §5).
import * as THREE from 'three';
import { zone, markAt, shotAt, lungeAt, sweepAt, slamAt, arcAt, waveAt, laneAt, flashAt, ringAt, bigZone, toward } from './moves.js';
import { T2 } from './set2.js';

export function script2(T, f, tr, H) {
  const { S, at, B, snd, boss, text, dadSlam, betterThanYou, yourDad, thanYou } = H;
  const D = tr.dir, set = tr.set;
  const b = () => f.boss;

  // ================================================================ VERSE 1b 22.59-33.99 "The frozen foods aisle"
  at(22.587, (ff) => { snd('hydraulic', { x: 0 }); D.mode = 'story'; D.lock(26.3); boss().idle = 'Idle_Talking_Loop'; D.skid(-5.0, -3.8, 0.36); });
  at(22.96, (ff) => D.strut(4.0, -3.8, 2.8));
  // FROZEN FOODS: each door blasts a white cone forward, its telegraph two beats ahead of the door
  T2.doors.forEach((td, i) => at(td - 2 * B(td), (ff) => zone(ff, { shape: 'cone', x: -4 + 2 * i, z: -5.5, angle: 0, w: 4.2, param: 24 * Math.PI / 180, kind: 'white', t1: S(td) })));
  T2.doors.forEach((td) => at(td - 0.12, () => boss().perform('Interact', { duration: 0.3, from: 0.2, to: 0.7 })));
  T2.doors.forEach((td, i) => at(td, (ff) => { snd('door', { x: -4 + 2 * i }); ff.fx.dust(-4 + 2 * i, -4.6, 10, new THREE.Color(0.7, 0.85, 1.0)); }));
  // IT'S BEEN A WHILE: she leans on the last freezer, phone to her ear (an opening)
  at(26.5, () => { D.lock(28.3); boss().idle = 'Idle_TalkingPhone_Loop'; boss().perform('Idle_TalkingPhone_Loop', { duration: 1.7 }); D.face('smug'); });
  // HE BOUGHT ME COFFEE: the cup, a sip, the coffee flung in an arc band (get inside 3.4 m or beyond 5.2)
  at(28.28, () => { D.lock(30.1); boss().perform('PickUp_Table', { duration: 0.36 }); });
  at(28.64, (ff) => { boss().perform('Consume', { duration: 0.6 }); arcAt(ff, { t1: S(29.71), r: 5.2, th: 1.8, half: 55, kind: 'white', onImpact: () => { snd('slosh', { x: boss().x }); } }); });
  at(29.36, () => boss().perform('OverhandThrow', { duration: 0.4, from: 0.2, to: 0.8 }));
  at(30.07, (ff) => { if (!ff.suppress) shotAt(ff, { tArrive: S(30.77), shape: 'orb', size: 0.4 }); boss().perform('OverhandThrow', { duration: 0.32, from: 0.3, to: 0.8 }); });
  // LET ME WALK YOU THROUGH: she skids to the cart, rocks it back, and charges the aisle into Dad's car
  at(30.42, () => { D.lock(34.5); D.skid(8.15, -3.85, 0.55); });
  at(31.12, () => { boss().faceNow(-9, -3.85); boss().idle = 'Shield_Dash'; boss().perform('Interact', { duration: 0.3 }); });
  at(31.85, (ff) => { laneAt(ff, { from: { x: 7.0, z: -3.85 }, angle: -Math.PI / 2, t1: S(33.28), w: 1.6, h: 16.5, kind: 'white' }); });
  at(32.21, (ff) => { boss().perform('Shield_Dash', { duration: 1.0, from: 0.0, to: 0.35 }); snd('rattle', { x: 7.4 }); });
  at(33.28, (ff) => { boss().perform('Sprint_Loop', { duration: 0.75 }); boss().moveTo(-6.0, -3.85, S(33.988) - ff.t, { easing: 'linear', face: true }); set.cartLive = true; });
  at(33.988, (ff) => { set.cartLive = false; snd('crash', { x: -7.5 }); snd('chirp', { x: -8.5, at: 0.1 }); snd('chirp', { x: -8.5, at: 0.45 }); ff.cam.shake(0.6, 0.2); ff.fx.chips(-7.2, 0.8, -3.85, new THREE.Color(2.6, 2.0, 0.7), 20); boss().idle = 'Idle_Talking_Loop'; D.leap({ x: -6.5, z: 0.2 }, S(34.35), { h: 2.2, crouch: 0.02 }); });
  at(34.35, (ff) => { ff.after(0.02, () => boss().open(2 * B(34.35))); D.lock(35.0); });

  // ================================================================ VERSE 1c 33.99-46.46 "Every dirty quote"
  at(34.6, () => { boss().idle = 'Spell_Simple_Idle_Loop'; boss().perform('Spell_Simple_Enter', { duration: 0.3, then: 'Spell_Simple_Idle_Loop' }); });
  text(35.06, 3, 36); text(35.77); text(36.12); text(36.48, 3, 36);
  // EVERY LIE: the phone flips to white static; white shards (catching them doesn't work: dodge)
  at(36.84, (ff) => {
    const sh = { a: toward(boss(), ff.player) };
    ff.tele.add({ shape: 'cone', x: boss().x, z: boss().z, angle: sh.a, w: 6, param: 20 * Math.PI / 180, kind: 'white', start: ff.t, end: S(37.55), follow: () => { sh.a = toward(boss(), ff.player); return { x: boss().x, z: boss().z, angle: sh.a }; } });
    ff.cue('white', boss()); set.phoneStatic = S(36.84);
  });
  at(37.55, (ff) => { if (!ff.suppress) ff.pat.fan(ff, { n: 5, arc: 40, speed: 13, kind: 'white', shape: 'shard', size: 0.4 }); boss().perform('Spell_Simple_Shoot', { duration: 0.3, then: 'Spell_Simple_Idle_Loop' }); });
  for (const s of [37.91, 38.26]) at(s, (ff) => { if (!ff.suppress) ff.pat.fan(ff, { n: 3, arc: 28, speed: 12, kind: 'white', shape: 'shard', size: 0.4 }); });
  // SHOVED DOWN MY THROAT: a white lunge with a two-handed shove at the end
  at(38.26, (ff) => { D.lock(39.2); lungeAt(ff, { t1: S(38.97), w: 0.9, len: 6, kind: 'white', clip: 'Punch_Cross' }); });
  // HE SIGHED: she impersonates Dad, arms folded (an opening: a spotlight fits here)
  at(39.69, () => { D.lock(42.6); boss().idle = 'Idle_FoldArms_Loop'; boss().perform('Idle_FoldArms_Loop', { duration: 1.3 }); D.face('smug'); });
  at(41.10, () => boss().perform('Idle_No_Loop', { duration: 0.9 }));
  at(42.18, () => boss().perform('Yes', { duration: 0.36 }));
  // EQUALIZE: the scales drop; she's the fulcrum at (0, 1.8), arms spread; the pans come down on the beats
  at(42.54, (ff) => { D.lock(46.5); boss().idle = 'Spell_Simple_Idle_Loop'; D.strut(0, 1.8, 3.2); snd('thump', { x: 0, gain: 0.7 }); });
  at(43.25, (ff) => zone(ff, { shape: 'circle', x: -5.5, z: -0.5, w: 3.0, kind: 'white', t1: S(44.32), onImpact: () => { snd('clang', { x: -5.5 }); ff.cam.shake(0.5, 0.15); } }));
  at(43.96, (ff) => zone(ff, { shape: 'circle', x: 5.5, z: -0.5, w: 3.0, kind: 'white', t1: S(45.03), onImpact: () => { snd('clang', { x: 5.5, rate: 1.12 }); ff.cam.shake(0.5, 0.15); } }));
  at(44.68, (ff) => { for (const x of [-5.5, 5.5]) zone(ff, { shape: 'circle', x, z: -0.5, w: 3.0, kind: 'white', t1: S(46.10), onImpact: () => { snd('clang', { x, rate: x < 0 ? 1 : 1.12 }); snd('thump', { x: 0 }); ff.cam.shake(0.8, 0.2); } }); });

  // ================================================================ VERSE 2 95.27-116.65 "Your childhood bed"
  at(95.625, (ff) => { snd('thump', { x: 4.6 }); ff.cam.shake(0.6, 0.18); for (const [x, z] of [[4.6, -2.4], [4.5, -6.4], [8.2, -2.5], [-3.6, -2.2]]) ff.fx.glitter(x, 0.4, z, new THREE.Color(3, 2.2, 0.8), 14, 1.2); D.mode = 'story'; D.setBase('smug'); });
  at(95.98, (ff) => { D.lock(99.6); D.skid(3.7, -1.9, 0.4, { face: false }); ff.after(0.42, () => { const bo = boss(); D._seated = true; D.seatY = 0.04; bo.idle = 'Sitting_Idle_Loop'; bo.faceNow(0, 3); bo.perform('Sitting_Enter', { duration: 0.4, then: 'Sitting_Idle_Loop' }); }); });
  for (const s of [96.70, 97.76]) at(s, (ff) => { if (!ff.suppress) shotAt(ff, { tArrive: ff.t + 2 * B(ff.t), shape: 'orb', size: 0.6, min: 3, max: 9 }); snd('flick', { x: boss().x, rate: 0.6 }); });
  // DEAD-EYE TEDDY BEAR: a white lane from the bear toward YOU (locked now); it tumbles down it at 12 m/s
  at(97.76, (ff) => {
    const h = set.teddyHome, pl = ff.player, a = Math.atan2(pl.x - h.x, pl.z - h.z);
    let L = 0.5; while (L < 14) { const x = h.x + Math.sin(a) * L, z = h.z + Math.cos(a) * L; if (x < ff.bounds.minX + 1.0 || x > ff.bounds.maxX - 1.0 || z < ff.bounds.minZ + 1.0 || z > ff.bounds.maxZ - 1.0 || (Math.abs(x - 4.6) < 1.6 && Math.abs(z + 2.4) < 2.1)) break; L += 0.25; }
    set.teddyEnd = { x: h.x + Math.sin(a) * L, z: h.z + Math.cos(a) * L };
    laneAt(ff, { from: h, angle: a, t1: S(98.83), w: 1.3, h: L + 1.0, kind: 'white' });
    snd('flick', { x: boss().x });
  });
  at(98.83, (ff) => { set.teddyRolling = true; for (let k = 0; k < 4; k++) snd('plush', { x: set.teddyHome.x, at: k * 0.24 }); });
  at(99.55, (ff) => { const bo = boss(); D._seated = false; bo.idle = 'Idle_Talking_Loop'; bo.perform('Sitting_Exit', { duration: 0.45 }); D.lock(102.5); ff.after(0.45, () => { const pl = ff.player, a = toward(pl, bo); D.strut(pl.x + Math.sin(a) * 1.3, pl.z + Math.cos(a) * 1.3, 2.6); }); });
  // HE ACTUALLY CARES: a hand to YOUR face. Parry it and she recoils; if it lands it's a slap
  at(101.33, (ff) => markAt(ff, { tLock: S(102.04), t1: S(102.40), r: 1.6, kind: 'pink', melee: true, onImpact: (hit) => { if (hit === 'hit') { snd('crash', { x: ff.player.x, rate: 2.4, gain: 0.5 }); D.face('glee', 0.8); } } }));
  at(102.2, () => boss().perform('Melee_Hook', { duration: 0.42, from: 0.1, to: 0.6 }));
  // HELD ME WHEN I CRIED: she lies back across the bed (an opening, 6 beats)
  at(102.6, (ff) => { D.lock(106.6); D.skid(3.7, -1.9, 0.45); ff.after(0.47, () => { const bo = boss(); D._seated = true; D.seatY = 0.04; bo.idle = 'Sitting_Idle_Loop'; bo.faceNow(0, 3); bo.perform('Sitting_Enter', { duration: 0.35, then: 'Sitting_Idle_Loop' }); D.face('hurt', 2.2); }); });
  // IS THIS WRONG? / PROBABLY: kisses on the head shake and the nod
  at(106.68, (ff) => { if (!ff.suppress) shotAt(ff, { tArrive: ff.t + 2 * B(ff.t), n: 3, arc: 36, shape: 'kiss', size: 0.45, min: 3.5 }); boss().perform('Idle_No_Loop', { duration: 0.6 }); });
  at(108.10, (ff) => { if (!ff.suppress) shotAt(ff, { tArrive: ff.t + 2 * B(ff.t), n: 3, arc: 36, shape: 'kiss', size: 0.45, min: 3.5 }); boss().perform('Yes', { duration: 0.36 }); });
  // KISSED ME SLOW: the only homing shot in the fight
  at(108.46, (ff) => { if (ff.suppress) return; ff.pat.fan(ff, { n: 1, speed: 3.5, shape: 'kiss', size: 0.8, kind: 'pink', homing: 1.2, life: 3.0 }); });
  // THE APPLE DIDN'T FALL FAR: she walks to the apple tree, slaps its trunk, bites; ripe apples, a rotten one
  at(109.53, (ff) => { D._seated = false; boss().idle = 'Idle_Talking_Loop'; D.lock(115.0); D.strut(8.4, -4.4, Math.hypot(8.4 - boss().x, -4.4 - boss().z) / Math.max(0.6, S(111.2) - ff.t)); });
  at(111.31, (ff) => { boss().faceNow(9.6, -5.6); boss().perform('Interact', { duration: 0.32 }); snd('thump', { x: 9.6, gain: 0.4, rate: 1.6 }); });
  at(111.67, (ff) => { boss().perform('Consume', { duration: 0.6 }); snd('strike', { x: 8.6, rate: 0.5, gain: 0.8 }); });
  for (const s of [112.38, 113.09, 113.80]) at(s, (ff) => { if (!ff.suppress) shotAt(ff, { from: { x: 8.6, z: -4.6 }, tArrive: ff.t + 2 * B(ff.t), shape: 'orb', size: 0.45 }); boss().perform('OverhandThrow', { duration: 0.32, from: 0.3, to: 0.8 }); });
  at(114.16, (ff) => markAt(ff, { tLock: S(114.52), t1: S(115.22), r: 2.0, kind: 'white', onImpact: () => { snd('slosh', { x: ff.player.x, rate: 0.6 }); } }));
  at(115.58, (ff) => { D.lock(116.5); boss().perform('Sword_Attack', { duration: S(116.30) - ff.t + 0.1, from: 0.1, to: 0.6 }); waveAt(ff, { t1: S(116.30), speed: 8, band: 0.6, max: 12 }); });

  // ================================================================ CHORUS-VERSE 116.65-129.47 "A single click"
  at(116.65, (ff) => { D.lock(117.9); boss().idle = 'Pistol_Idle_Loop'; boss().perform('Pistol_Idle_Loop', { duration: 1.0 }); snd('whine', { x: boss().x }); set.cameraOut = true; });
  at(116.65, (ff) => flashAt(ff, { tLock: S(117.35), t1: S(117.708), r: 9, half: 28, blocked: (x0, z0, x1, z1) => set.blocksLine(x0, z0, x1, z1),
    onImpact: (hit, sh, hid) => { snd('pop', { x: boss().x }); ff.fx.flash(new THREE.Color(0.42, 0.42, 0.5), hid ? 0.4 : 1); boss().perform('Pistol_Shoot', { duration: 0.36 }); } }));
  at(117.708, (ff) => { snd('thump', { x: 4.8 }); snd('tinkle', { x: 4.8, gain: 0.6 }); ff.cam.shake(0.5, 0.15); D.mode = 'story'; boss().idle = 'Pistol_Idle_Loop'; });
  // lyric sign 2: Christmas bulbs half-buried in the snowbank, each word lit as it's sung; every bulb pops on "click"
  [['I COULD RUIN', 123.06, -7.2], ['CHRISTMAS', 123.41, -1.9], ['WITH', 124.13, 2.3], ['A SINGLE', 124.49, 5.6], ['CLICK', 124.843, 9.1]].forEach(([w, t0, x]) => {
    f.sign(w, { style: 'marquee', x, y: 0.42, z: 7.55, height: 0.62, rotY: 0, at: { s: S(t0) }, until: { s: S(124.843) + 0.12 } });
  });
  for (const s of [119.50, 119.86, 120.21, 120.57]) text(s, 1, 0, 0, 'card', 0.42);
  text(120.93, 5, 72); for (const s of [121.64, 122.00, 122.35]) text(s);
  // A SINGLE CLICK: the ten Polaroids swivel to face YOU and draw their sightlines; locked on "single", fired on "click"
  at(123.06, (ff) => {
    D.lock(125.0); boss().perform('Pistol_Idle_Loop', { duration: 1.8 });
    for (const g of set.polas) {
      const br = set.breakables.find((q) => q.mesh === g); if (br && br.broken) continue;
      const sh = { a: 0 };
      const follow = () => { const x = g.position.x, z = g.position.z; if (ff.t < S(124.49)) sh.a = Math.atan2(ff.player.x - x, ff.player.z - z); return { x, z, angle: sh.a }; };
      follow();
      zone(ff, { shape: 'rect', x: g.position.x, z: g.position.z, angle: sh.a, w: 0.4, h: 12, kind: 'white', t1: S(124.843), follow: () => { const p = follow(); return br && br.broken ? { x: -99, z: -99, angle: 0 } : p; }, silent: true, sound: false });
      snd('pop', { x: g.position.x, gain: 0.22, rate: 2, at: Math.random() * 0.3 });
    }
  });
  at(124.843, (ff) => { snd('pop', { x: 4.8, gain: 1.0 }); snd('tinkle', { x: 4.8 }); ff.fx.flash(new THREE.Color(0.55, 0.55, 0.62), 1); boss().perform('Pistol_Shoot', { duration: 0.36 }); });
  at(125.56, () => { D.lock(127.7); boss().idle = 'Idle_FoldArms_Loop'; boss().perform('Idle_FoldArms_Loop', { duration: 2.0 }); D.face('smug'); set.cameraOut = false; });
  // YOU SICK PRICK: two pink sweeps; parry both and she staggers
  {
    let parried = 0;
    [[127.69, 128.40, 'Sword_Regular_A'], [128.05, 128.75, 'Sword_Regular_B']].forEach(([t0, t1, clip], i) => at(t0, (ff) => {
      if (i === 0) { parried = 0; D.face('fury', 1.2); }
      D.lock(S(t1) + 0.2);
      sweepAt(ff, { t1: S(t1), r: 3.4, arc: 120, kind: 'pink', clip, onImpact: (hit) => { if (hit === 'parried' && ++parried === 2) { boss().state = 'perform'; boss().open(1.4); } } });
    }));
  }

  // ================================================================ BRIDGE 2 129.47-140.88 "I fucking took it all"
  at(129.47, (ff) => { D.mode = 'pour'; D.setBase('hurt'); D.hitCount = 0; boss().idle = 'Idle_Talking_Loop'; D.lock(131.3); D.strut(3.0, -0.8, 2.4); set.canOn = [129.47, 131.29]; });
  at(129.85, (ff) => { D.strut(6.6, -0.6, 2.4); });
  at(130.6, () => D.strut(6.4, -4.2, 2.6));
  for (const s of T2.lift) at(s, (ff) => { snd('whine', { x: ff.player.x, gain: 0.35, rate: 0.5 }); });
  at(136.57, (ff) => { D.lock(137.4); D.strut(Math.max(-9, Math.min(9, boss().x)), Math.min(boss().z, -1.0), 2); snd('whine', { x: 4.8, rate: 0.35, gain: 0.5 }); });
  at(137.29, (ff) => { boss().perform('Interact', { duration: 0.2 }); ff.after(0.1, () => boss().perform('OverhandThrow', { duration: 0.32, from: 0.3, to: 0.8 })); snd('strike', { x: boss().x }); });
  at(137.65, (ff) => {
    snd('whump', { x: ff.player.x, gain: 0.9 });
    T2.falls.forEach((tf, i) => {
      const sp = set.hangSpots[i]; if (!sp || set.knocked[i] !== undefined) return;
      const g = set.presents[i]; const r = 0.9 + g.userData.s * 0.8;
      zone(ff, { shape: 'circle', x: sp.x, z: sp.z, w: r, kind: 'white', t1: S(tf), silent: i > 0, onImpact: () => { snd('crash', { x: sp.x, rate: 1.4, gain: 0.6 }); snd('tinkle', { x: sp.x }); ff.fx.chips(sp.x, 0.5, sp.z, new THREE.Color(2.6, 1.8, 0.6), 18); } });
    });
    zone(ff, { shape: 'circle', x: 4.8, z: -2.4, w: 2.4, kind: 'white', t1: S(T2.treeFall), onImpact: () => { snd('crash', { x: 4.8 }); snd('tinkle', { x: 4.8, gain: 1.0 }); ff.cam.shake(0.8, 0.25); ff.fx.chips(4.8, 1.0, -2.4, new THREE.Color(2.6, 2.0, 0.5), 40); } });
    D.lock(140.9); D.skid(0, -5.8, 0.5); ff.after(0.52, () => { boss().idle = 'Idle_FoldArms_Loop'; boss().faceNow(ff.player.x, ff.player.z); });
  });

  // ================================================================ CHORUS 2 140.88-166.54 "Same genetics" (Father's Day)
  at(140.879, (ff) => { D.mode = 'still'; D.setBase('smug'); boss().idle = 'Dance_Loop'; snd('crash', { x: 0, rate: 0.6, gain: 0.5 }); });
  at(141.58, (ff) => { ff.fx.flash(new THREE.Color(0.5, 0.45, 0.35), 1); });
  // THE MORNING DROP: off the porch, high in the morning light, down on YOU on the bass; a ring bursts from the landing
  at(141.23, (ff) => {
    const spot = markAt(ff, { tLock: S(142.66), t1: S(143.369), r: 2.6, kind: 'white', onImpact: (hit) => { if (hit === 'hit') D.face('glee', 0.8); } });
    D.leap(spot, S(143.369), { h: 9, crouch: 0.05 });
    ff.at(S(143.369), () => { set.burst(spot.x, spot.z, 1.4); snd('land', { x: spot.x }); ff.cam.shake(0.9, 0.2); ff.addWave({ x: spot.x, z: spot.z, r: 0.5, speed: 9, band: 0.6, max: 12, kind: 'white', hit: false, damage: 1 }); ff.sfx.wave && ff.sfx.wave(ff.pan(spot.x)); D.mode = 'dance'; });
  });
  dadSlam(144.09, 144.80, 145.15);
  betterThanYou([146.57, 146.93, 147.29]);
  dadSlam(147.65, 148.00, 148.36);
  at(148.72, () => { boss().perform('Dance_Loop', { duration: 1.3 }); D.face('glee', 1.3); });
  dadSlam(150.14, 150.50, 150.85);
  // HE'S GOT YOUR HANDS BUT KNOWS HOW TO USE THEM TOO: five pink blows, x . x . x x x
  {
    let parried = 0;
    const blows = [[151.57, 'Punch_Jab'], [152.29, 'Punch_Cross'], [152.98, 'Melee_Hook'], [153.33, 'Punch_Jab'], [153.70, 'Punch_Cross']];
    blows.forEach(([t1, clip], i) => at(t1 - 1.5 * B(t1), (ff) => {
      if (i === 0) parried = 0;
      D.lock(S(t1) + 0.25);
      sweepAt(ff, { t1: S(t1), r: 2.4, arc: 100, kind: 'pink', step: 0.6, clip, onImpact: (hit) => { if (hit === 'parried' && ++parried === 5) { boss().state = 'perform'; boss().open(2 * B(t1)); ff.player.addMeter(0.2); } } });
    }));
  }
  dadSlam(154.42, 154.77, 155.13);
  // the riff: she struts a circle round YOU, sizing you up
  at(155.6, (ff) => { D.lock(157.2); const pl = ff.player; const a0 = toward(pl, boss()); const p1 = set.safeSpot(pl.x + Math.sin(a0 + 1.6) * 3.6, pl.z + Math.cos(a0 + 1.6) * 3.6); D.strut(p1.x, p1.z, 3.2); });
  at(156.20, (ff) => { for (const [x, z] of [[-3.6, -2.0], [5.0, -2.0]]) ff.fx.glitter(x, 0.3, z, new THREE.Color(1.8, 2.2, 3.0), 40, 1.6); snd('sizzle', { x: 0, gain: 0.6 }); });
  // SAME GENETICS, DIFFERENT MAN: she spins at the left edge; three helices of pearls sweep the yard, each with a gap
  at(156.95, (ff) => { D.lock(159.6); D.skid(-10.0, 0.0, 0.5); });
  for (const [s, gap] of [[157.63, 1.5], [158.34, -1.5], [159.05, 1.5]]) at(s, (ff) => { set.helix(S(s), gap); boss().perform('Sword_Heavy_Combo', { duration: 0.7, from: 0.0, to: 0.5 }); snd('flick', { x: -10, rate: 0.5 }); });
  at(160.84, () => { D.lock(162.4); boss().perform('Yes', { duration: 0.4 }); D.face('smug'); });
  for (const s of [162.97, 163.33, 163.68, 164.03]) text(s);
  // BETTER THAN THE KNOCKOFF BRAND: the branding iron from Dad's grill; DAD stays burned into the lawn
  at(164.03, (ff) => { D.lock(166.2); D.skid(-6.2, 1.5, 0.34); });
  at(164.39, (ff) => { boss().perform('PickUp_Table', { duration: 0.34 }); snd('sizzle', { x: -7 }); set.ironOn = true; });
  at(164.75, (ff) => {
    const spot = markAt(ff, { tLock: S(165.11), t1: S(165.83), r: 1.8, kind: 'white', onImpact: () => { snd('sizzle', { x: spot.x, gain: 1.0 }); snd('land', { x: spot.x, rate: 1.3 }); set.brandAt(spot.x, spot.z, S(165.83)); } });
    ff.at(S(165.83) - 0.22, () => { boss().perform('Sword_Dash', { duration: 0.3, from: 0.1, to: 0.6 }); const a = toward(spot, boss()); boss().moveTo(spot.x + Math.sin(a) * 1.0, spot.z + Math.cos(a) * 1.0, 0.2, { easing: 'in' }); });
    ff.at(S(165.83), () => boss().perform('Sword_Attack', { duration: 0.4, from: 0.3, to: 0.7 }));
  });
  at(166.2, () => { set.ironOn = false; });

  // ================================================================ VERSE 3 166.54-177.96 "Every Thanksgiving"
  at(166.539, (ff) => { snd('hydraulic', { x: -8 }); D.mode = 'story'; D.setBase('smug'); boss().idle = 'Idle_Talking_Loop'; D.lock(167.6); D.skid(5.0, -0.6, 0.4); });
  at(167.25, (ff) => { snd('thump', { x: 0 }); snd('whump', { x: 0, gain: 0.3, rate: 1.6 }); ff.cam.shake(0.4, 0.12); boss().perform('PickUp_Table', { duration: 0.34 }); });
  at(167.60, (ff) => { if (ff.suppress) return; ff.pat.fan(ff, { n: 5, arc: 60, speed: 4.5, shape: 'kiss', size: 0.42, kind: 'pink', wave: { amp: 0.35, freq: 1.1 }, life: 6 }); });
  at(168.32, () => snd('strike', { x: 5, rate: 2.2, gain: 0.6 })); at(168.68, () => snd('strike', { x: 5, rate: 2.4, gain: 0.6 }));
  // SEE HIM CARVE THE TURKEY: three white arc bands (inside 1.6 m is safe, and beyond 3.2)
  [[169.02, 'Sword_Regular_A'], [169.74, 'Sword_Regular_B'], [170.45, 'Sword_Regular_C']].forEach(([t1, clip]) => at(t1 - 2 * B(t1), (ff) => {
    D.lock(S(t1) + 0.2);
    arcAt(ff, { t1: S(t1), r: 3.2, th: 1.6, half: 60, kind: 'white', onImpact: () => snd('flick', { x: boss().x, rate: 1.5 }) });
    ff.at(S(t1) - 0.2, () => boss().perform(clip, { duration: 0.42, from: 0.15, to: 0.75 }));
  }));
  at(170.81, (ff) => { D.lock(172.9); boss().perform('Sword_Attack', { duration: 0.3, from: 0.4, to: 0.7 }); snd('thump', { x: boss().x, rate: 2.2, gain: 0.5 }); });
  at(171.54, (ff) => snd('bellC', { x: boss().x })); at(171.89, (ff) => snd('bellE', { x: boss().x }));
  at(172.0, () => { boss().idle = 'Idle_TalkingPhone_Loop'; boss().perform('Idle_TalkingPhone_Loop', { duration: 0.95 }); D.face('glee', 0.9); });
  // YOUR THROAT WILL CLOSE UP: three loops of phone cord round YOU, locked on 121:1, yanked tight on the beats
  at(172.97, (ff) => {
    D.lock(176.0);
    const spot = { x: ff.player.x, z: ff.player.z };
    ringAt(ff, { spot, tLock: S(173.67), t1: S(174.38), r: 5.0, th: 1.2, onImpact: () => snd('flick', { x: spot.x, rate: 0.7 }) });
    ringAt(ff, { spot, tLock: S(173.67), t1: S(174.74), r: 3.6, th: 1.2, onImpact: () => snd('flick', { x: spot.x, rate: 0.8 }) });
    ringAt(ff, { spot, tLock: S(173.67), t1: S(175.10), r: 2.2, th: 2.2, onImpact: () => snd('flick', { x: spot.x, rate: 0.9 }) });
  });
  at(175.8, () => { boss().perform('Interact', { duration: 0.3 }); });
  at(176.17, (ff) => { if (!ff.suppress) shotAt(ff, { tArrive: S(176.88), shape: 'orb', size: 0.6 }); boss().perform('OverhandThrow', { duration: 0.32, from: 0.3, to: 0.8 }); });

  // ================================================================ VERSE 3b 177.96-195.06 "The ghost at every table"
  at(177.59, (ff) => { D.mode = 'pour'; D.setBase('hurt'); D.hitCount = 0; D.lock(183.7); D.skid(-4.15, -0.6, 0.36); });
  at(177.96, (ff) => { const bo = boss(); D._seated = true; D.seatY = 0.0; bo.idle = 'Sitting_Idle_Loop'; bo.faceNow(4, -0.6); bo.lockFacing = true; bo.perform('Sitting_Enter', { duration: 0.4, then: 'Sitting_Idle_Loop' }); });
  at(178.34, (ff) => { boss().perform('PickUp_Table', { duration: 0.4, then: 'Sitting_Idle_Loop' }); snd('splash', { x: -3, rate: 0.7 }); });
  at(179.40, (ff) => { snd('splash', { x: 0 }); snd('splash', { x: 3, at: 0.1 }); });
  at(180.79, () => { boss().perform('PickUp_Table', { duration: 0.4, then: 'Sitting_Idle_Loop' }); });
  // FRESHLY CATERED HELL: the taper laid on the cloth, a flame runs the table; the table and both bands go up
  at(182.20, (ff) => { snd('fuse', { x: -2, gain: 0.6 }); bigZone(ff, { shape: 'rect', x: 0, z: -2.8, angle: 0, w: 4.3, h: 4.4, t1: S(183.649), dim: 0.6, onImpact: (hit) => { if (hit === 'hit') D.face('glee', 1); } }); });
  at(183.649, (ff) => { snd('whoomph', { x: 0, gain: 0.7, rate: 1.3 }); snd('tinkle', { x: 0 }); ff.cam.shake(0.8, 0.25); ff.fx.flash(new THREE.Color(0.2, 0.07, 0.02), 1); const bo = boss(); D._seated = false; bo.lockFacing = false; bo.idle = 'Idle_Talking_Loop'; bo.perform('Sitting_Exit', { duration: 0.5 }); D.face('glee', 1.2); D.mode = 'story'; ff.after(0.5, () => D.skid(-6.5, 2.4, 0.45)); });
  // CRYING IN THE YARD: the rain comes down and puts the fire out
  at(184.37, (ff) => { snd('sizzle', { x: 0, gain: 1.0 }); });
  at(184.49, (ff) => { snd('thunder', { x: -4 }); ff.fx.flash(new THREE.Color(0.33, 0.36, 0.48), 1); });
  at(184.73, (ff) => { D.lock(186.3); boss().perform('Sword_Heavy_Combo', { duration: 1.4, from: 0.0, to: 0.9 }); if (!ff.suppress) ff.pat.spiral(ff, { arms: 3, count: 8, step: 0.5, speed: 6, kind: 'pink', shape: 'petal', size: 0.38 }); });
  at(186.86, (ff) => { snd('thunder', { x: 3 }); ff.fx.flash(new THREE.Color(0.33, 0.36, 0.48), 1); boss().perform('Spell_Simple_Shoot', { duration: 0.5 }); markAt(ff, { tLock: S(187.58), t1: S(187.93), r: 1.8, kind: 'white', onImpact: () => { ff.fx.flash(new THREE.Color(0.4, 0.43, 0.5), 1); ff.fx.sparks(ff.player.x, 1, ff.player.z, new THREE.Color(2.5, 2.8, 3.4), 30); snd('pop', { x: ff.player.x }); } }); });
  // THE GLITCH IN YOUR BLOODLINE: three pink lunges with a VHS blink between them; three parries and she staggers
  {
    let parried = 0;
    [188.64, 188.99, 189.35].forEach((t1, i) => at(t1 - 1.5 * B(t1), (ff) => {
      if (i === 0) parried = 0;
      D.lock(S(t1) + 0.2);
      const st = { x: boss().x, z: boss().z };
      lungeAt(ff, { t1: S(t1), w: 0.8, len: 3.5, kind: 'pink', onImpact: (hit) => { if (hit === 'parried' && ++parried === 3) { boss().state = 'perform'; boss().open(1.4); } } });
      ff.at(S(t1) - 0.2, () => { tr._vhs = 0.18; boss().place(st.x, st.z); });
    }));
  }
  at(190.06, () => { D.lock(191.2); boss().perform('Idle_Shield_Break', { duration: 1.0 }); D.face('glee', 1.0); });
  at(193.63, (ff) => { D.lock(194.4); boss().perform('Sword_Attack', { duration: S(194.35) - ff.t + 0.1, from: 0.1, to: 0.6 }); waveAt(ff, { t1: S(194.35), speed: 8, band: 0.6, max: 14 }); });

  // ================================================================ FINAL CHORUS 195.06-207.88 "I'd do it again" (the encore point)
  at(195.056, (ff) => { D.mode = 'still'; D.setBase('smug'); D.lock(197.6); boss().idle = 'Idle_Talking_Loop'; snd('strike', { x: boss().x }); boss().perform('Interact', { duration: 0.4 }); });
  at(196.11, (ff) => { boss().perform('Interact', { duration: 0.3 }); snd('fuse', { x: 0, gain: 0.5, rate: 1.8 }); zone(ff, { shape: 'circle', x: 0, z: -4.5, w: 3.0, kind: 'white', t1: S(197.545), onImpact: () => {} }); });
  at(197.545, (ff) => { snd('thoomp', { x: 0 }); ff.cam.shake(0.8, 0.25); ff.after(0.5, () => snd('boom', { x: -3 })); D.mode = 'dance'; boss().idle = 'Dance_Loop'; });
  dadSlam(197.18, 197.545, 197.90);
  dadSlam(198.62, 198.97, 199.32);
  // AND I'D DO IT AGAIN (again, again, again): three marks a beat apart. Run in a line.
  for (const s of [201.12, 201.47, 201.82]) at(s - 2 * B(s), (ff) => { markAt(ff, { tLock: S(s) - B(s), t1: S(s), r: 1.5, kind: 'white', onImpact: () => set.burst(ff.player.x, ff.player.z, 0.5) }); snd('flick', { x: boss().x }); });
  at(202.18, () => { D.lock(202.9); boss().perform('Yes', { duration: 0.5 }); D.face('glee', 0.7); });
  dadSlam(202.88, 203.25, 203.62);
  dadSlam(204.32, 204.68, 205.03);
  betterThanYou([206.46, 206.82, 207.17]);

  // ================================================================ FINAL 2 207.88-231.75 "Served to your father"
  for (const s of [208.23, 208.95]) text(s, 5, 72);
  dadSlam(209.32, 209.69, 210.04);
  // AND HE ASKED FOR MY NUMBER: seven digits, one a beat, each a keypad tone on the chord
  [210.74, 211.10, 211.46, 211.81, 212.17, 212.52, 212.88].forEach((s, i) => { text(s); at(s, (ff) => snd(['bellC', 'bellE', 'bellG'][i % 3], { x: boss().x, gain: 0.5, rate: [1, 1, 1, 2, 1, 1, 1][i] })); });
  // GUESS REVENGE ISN'T SERVED COLD: the silver cloche follows YOU, locks, slams. BIG.
  at(213.24, (ff) => {
    boss().perform('Spell_Simple_Enter', { duration: 0.4, then: 'Spell_Simple_Idle_Loop' });
    snd('tonng', { x: ff.player.x });
    set.clocheSpot = markAt(ff, { tLock: S(214.67), t1: S(215.379), r: 2.5, kind: 'white', damage: 2, onImpact: (hit) => { snd('clang', { x: set.clocheSpot.x, rate: 0.7 }); snd('thump', { x: 0 }); ff.cam.shake(1.0, 0.3); if (hit === 'hit') D.face('glee', 1); } });
  });
  at(214.67, () => boss().perform('Spell_Simple_Exit', { duration: 0.4 }));
  at(216.45, (ff) => { D.lock(217.9); boss().bow(1.1); D.face('glee'); });
  // THE FIREWORK BARRAGE: eight falling shells round YOU, half a beat apart
  at(217.52, (ff) => { if (!ff.suppress) ff.pat.rain(ff, { n: 8, r: 1.3, beats: 2, stagger: 0.5, spread: 4.5, onImpact: (hit, sh) => { set.burst(sh.x, sh.z, 0.55); snd('boom', { x: sh.x, gain: 0.35, rate: 1.4 }); } }); boss().idle = 'Dance_Loop'; });
  yourDad([220.74, 221.41, 222.15]);
  thanYou([223.57, 224.29, 225.00]);
  yourDad([226.45, 227.13, 227.85]);
  // NOW WHAT THE FUCK YOU GONNA DO: the last opening
  at(228.22, (ff) => { D.lock(229.7); boss().perform('Spell_Simple_Idle_Loop', { duration: 1.3 }); D.face('glee', 1.3); ff.after(0.02, () => boss().open(1.3)); });
  for (const t1 of [230.00, 230.71]) at(t1 - 1.5 * B(t1), (ff) => { D.lock(S(t1) + 0.1); slamAt(ff, { t1: S(t1), r: 3.0, kind: 'white', onImpact: () => { snd('land', { x: boss().x }); set.burst(boss().x, boss().z, 1.2); } }); boss().perform('Sword_Attack', { duration: S(t1) - ff.t + 0.12, from: 0.1, to: 0.6 }); });
  at(231.07, (ff) => { D.lock(232); boss().perform('Interact', { duration: 0.35 }); snd('strike', { x: boss().x }); });
}
