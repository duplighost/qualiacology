// The fight, bar by bar (research/tracks/sexy-trauma-costume.md §5). Bars are bars.py bars (bar 0 starts at 1.32 s):
// B(16, 1) is "b16.1", 22.66 s; a beat of 4.5 is "b.4+". Every impact sits on the stressed syllable of the word that
// names it. "Snapped" means aimed at where YOU stands when the telegraph appears; nothing tracks her after that.
import * as THREE from 'three';
import * as M from './moves.js';

const { U, toward, TAU } = M;

export const SEC = [
  ['THE BACK ROOM', 0, 0], ['ONE SIZE FITS ALL', 16, 1], ['THE PARTY', 24, 1], ['BEST SELLERS', 40, 1], ['THE MIRROR', 56, 1],
  ['THE PARTY AGAIN', 64, 1], ['LAST CALL', 80, 1], ['MAYBE', 88, 1], ['THE ZIPPER', 96, 1], ['NO REFUNDS', 106, 1],
  ['THE TRUTH', 126, 1], ['THE TILL', 136, 1],
];

export function script(T, f) {
  const bm = f.bm;
  // a NaN time would jam the timeline's queue for the rest of the song: refuse it loudly
  const after0 = T.after.bind(T); T.after = (t, fn) => { if (!Number.isFinite(t)) { console.error('stc: bad event time', new Error().stack.split(String.fromCharCode(10)).slice(2, 5).join(' | ')); return; } after0(t, fn); };
  const B = (bar, beat = 1) => bm.timeOf(3 + 4 * bar + (beat - 1));
  f.B = B;
  const at = (t, fn) => T.at({ s: t }, fn);
  const C = f.clerk, b = f.boss, R = f.room;
  const you = () => ({ x: f.player.x, z: f.player.z });
  const near = (p, d, from = b) => { const a = toward(from, p); return { x: p.x - Math.sin(a) * d, z: p.z - Math.cos(a) * d }; };
  const go = (t, x, z, dur, o = {}) => at(t, () => { b.behave = 'hold'; b.moveTo(x, z, dur, o); });
  // walk to (x, z) now, round the counter's nearer end if it's in the way (it's 6.4 m long at z -6.6..-5.5): legs at
  // `speed` m/s at most, taking `minDur` at least; returns how long it takes
  const roundCounter = (x, z, speed, minDur) => {
    const X = 3.9, FZ = -5.0, BZ = -6.95, behind = (q) => q <= -6.6;
    let legs = [[x, z]];
    if (behind(b.z) !== behind(z)) {
      // the end she's beside, else the one the target is beside, else the one nearer the middle of the trip
      const end = Math.abs(b.x) >= 3.65 ? Math.sign(b.x) : Math.abs(x) >= 3.65 ? Math.sign(x) : (b.x + x >= 0 ? 1 : -1);
      const corners = behind(b.z) ? [[end * X, BZ], [end * X, FZ]] : [[end * X, FZ], [end * X, BZ]];
      // (already beside that end: straight to the second corner)
      legs = [...(Math.abs(b.x) >= 3.65 && Math.sign(b.x) === end ? corners.slice(1) : corners), [x, z]];
    }
    let px = b.x, pz = b.z, len = 0; const seg = legs.map(([lx, lz]) => { const d = Math.hypot(lx - px, lz - pz); px = lx; pz = lz; len += d; return d; });
    const dur = Math.max(minDur, len / speed);
    let tt = f.t; legs.forEach(([lx, lz], i) => { const d = dur * seg[i] / Math.max(1e-3, len); f.at(tt, () => b.moveTo(lx, lz, Math.max(0.05, d), { easing: 'linear' })); tt += d; });
    return dur;
  };

  // ------------------------------------------------------------------ the checkpoints
  const starts = SEC.map(([, bar, beat], i) => (i === 0 ? 0 : B(bar, beat)));
  SEC.forEach(([name], i) => T.section(name, { s: starts[i] }, { s: starts[i + 1] ?? 214.88 }, { close: name === 'THE ZIPPER', final: name === 'NO REFUNDS' }));

  // her stops: nothing of hers lands in a silence, and she stands frozen in it
  C.freezes = [[B(41, 3), B(42, 1)], [139.70, 139.82], [141.15, 141.64], [204.66, 204.82], [206.32, 206.47], [207.33, 207.48], [208.99, 209.15], [209.99, 210.32]];
  // the intro: two stabs and a gap per bar; between stabs she is a window dummy
  C.snaps = []; for (let bar = 0; bar < 8; bar++) C.snaps.push(B(bar, 1), B(bar, 2));
  C.snapUntil = 5.5;

  // =================================================================== S0 THE BACK ROOM · 0.00–22.66
  // the welcome: she has her back to the room, stocking the counter; she moves only on the stabs
  at(B(0, 1), () => { b.facing += 0.35; });
  at(B(0, 2), () => { b.facing += 0.6; });
  at(B(1, 2), () => { b.faceNow(f.player.x, f.player.z); C.say('sale', 1); C.play('Yes', f.t, 0.7); });       // "honey"
  // four steps round the counter's left end, one per stab, to (-2.4, -4.6); the shears come out on the last
  const steps = [[-1.9, -6.85], [-3.85, -6.55], [-3.85, -5.1], [-2.4, -4.6]];
  [B(2, 1), B(2, 2), B(3, 1), B(3, 2)].forEach((t, i) => go(t, steps[i][0], steps[i][1], 0.14));
  at(B(3, 2), () => { C.draw('shears'); b.idle = 'Idle_Talking_Loop'; });

  // SEXY DIVORCE: two cuts down the floor toward YOU ("di-VORCE", "three-PIECE")
  const divorce = (t0, t1) => at(t0, () => {
    C.strike('Sword_Heavy_Combo', t1, { from: 0.72, to: 0.95, hit: 0.55 });
    M.lane(f, { start: t0, end: t1, w: 1.2, h: 13, kind: 'white', melee: true, onImpact: (hit, sh) => R.tear(sh) });
    R.ripSound(t0, t1);
  });
  divorce(B(3, 2), B(4, 2));
  divorce(B(4, 3), B(5, 1));

  // SEXY BANKRUPTCY: she shows the package, throws it; uncaught it opens on "REPO" into eight slips
  at(B(5, 2), () => { C.say('sale', 2); C.play('Spell_Simple_Enter', f.t, 0.33); });
  at(B(5, 3), () => {
    C.strike('OverhandThrow', B(5, 3) + 0.05, { from: 0.25, to: 0.7, hit: 0.3 });
    M.lob(f, { end: B(6, 1), r: 1.1, mesh: R.package('barrel'), shape: 'card', size: 0.45,
      onLand: (sh) => { R.landed(sh, B(6, 4)); M.burst(f, { at: sh, start: f.t, end: B(6, 4), n: 8, speed: 7, shape: 'card', ringW: 1.4, ringT: 0.25 }); } });
  });

  // I'M YOUR TRAUMA RETAIL SPECIALIST: she comes round and struts at YOU, arriving 2.2 m away on the big hit
  at(B(7, 1), () => { const p = near(you(), 2.2); b.behave = 'hold'; b.moveTo(p.x, p.z, B(8, 1) - f.t, { easing: 'linear' }); });
  at(B(8, 1), () => { b.behave = 'circle'; b.behaveOpts = { r: 2.2, speed: 2.2, dir: 1, rMin: 1.8, rMax: 2.6 }; });

  // TAPE LASH ("to-NIGHT"): a narrow pink cone; parried, the tape slaps her face
  const lash = (t0, t1, o = {}) => at(t0, () => {
    b.behave = 'hold'; b.faceNow(f.player.x, f.player.z);
    C.strike('Melee_Hook', t1, { hit: 0.55 });
    M.cone(f, { start: t0, end: t1, w: 3.2, param: 0.42, kind: 'pink', from: o.fromHeel ? b._heel : o.from,
      onImpact: (hit) => { if (hit === 'parried') { C.say('no', 2); C.play('Hit_Knockback', f.t, 0.45); b.open(2 * f.beat); } } });
    R.zip(t0, t1);
  });
  lash(B(8, 2), B(9, 1));

  // PACKAGE YOUR PAIN UP TIGHT: she walks a circle round YOU with the tape out; walk out, or parry and she's wrapped
  at(B(10, 1), () => {
    const c = you();
    b.behave = 'hold';
    const a0 = toward(c, b), n = 6;
    // (each point of her circle is brought onto open floor: by a wall or the counter the circle bends, and she never
    // goes over the counter or out of the room for it)
    const pts = [];
    for (let i = 1; i <= n; i++) { const a = a0 + i / n * TAU * 0.85, q = f.arena.resolve(c.x + Math.sin(a) * 2.4, c.z + Math.cos(a) * 2.4, 0.5); pts.push([q.x, Math.max(-4.9, q.z)]); }
    pts.forEach(([px, pz], i) => { const tt = f.t + (B(11, 3) - f.t) * i / n; f.at(tt, () => b.moveTo(px, pz, (B(11, 3) - B(10, 1)) / n, { easing: 'linear', noVault: true })); });
    R.tapeLoop(c, B(10, 1), B(11, 3));
    M.circle(f, { at: c, start: f.t, end: B(11, 3), w: 1.6, kind: 'pink', melee: true,
      onImpact: (hit) => {
        if (hit === 'parried') { C.say('no', 3); C.play('Idle_Shield_Break', f.t, 2 * f.beat); b.open(2 * f.beat); R.wrapped(b, 2 * f.beat); }
        else if (hit === 'hit') R.wrapped(f.player, 0.6);
      } });
  });

  // STEP INTO THE FITTING ROOM, FACE THE MIRROR: the curtains open on "IN-to", she goes in, it closes on "ROOM"
  at(B(12, 1) - 0.62, () => { b.behave = 'hold'; b.stop(); });
  at(B(11, 4), () => {
    C.boothAt = B(12, 3.5); C._booth = 'walk'; C.boothEnter = () => { R.curtains('in'); b.faceNow(0, 0); C.inBooth = true; };
    b.moveTo(-8.3, 0.0, Math.max(0.5, (B(12, 3.5) - f.t) * 0.8), { easing: 'inOut' });
  });
  at(17.42, () => R.curtains('open'));
  at(19.12, () => R.mirrorOn());
  // from the booth she lobs three over the rail; uncaught they're packing peanuts (practice)
  const booth = (t0, t1) => at(t0, () => {
    C.strike('OverhandThrow', t0 + 0.05, { from: 0.25, to: 0.7, hit: 0.3 });
    M.lob(f, { start: t0, end: t1, r: 1.1, from: C.inBooth ? { x: -9.6, z: 0 } : { x: b.x, z: b.z }, fromY: C.inBooth ? 2.9 : 1.7, damage: 0, mesh: R.package('box'), shape: 'card', size: 0.42,
      onCaught: () => {}, onLand: (sh) => R.peanuts(sh) });
  });
  booth(B(13, 3), B(14, 1));
  booth(B(14, 1), B(14, 3));
  booth(B(14, 4), B(15, 2.5));
  // "One": she pushes out through what's left of the curtain
  at(22.28, () => { C.inBooth = false; C._booth = null; R.curtains('out'); b.moveTo(-6.5, -0.5, B(16, 1) - f.t, { easing: 'out' }); });

  // =================================================================== S1 ONE SIZE FITS ALL · 22.66–33.33
  at(B(16, 1), () => { b.place(-6.5, -0.5); b.behave = 'hold'; R.dress(true); C.loop('Idle_Talking_Loop', f.t); });
  // three flares of the hem: walk into the slit, step under her hem (r < 1.6), or dash through on the beat
  // (the hem's whip starts 0.15 s before the impact, if the flare is still coming: YOU's spotlight may have taken it)
  const whip = (sh, t1, gap, gapAt) => f.at(t1 - 0.15, () => { if (sh.tele && !sh.tele.dead) R.hemWhip(gap, gapAt, sh); });
  const flare = (t0, t1, gap, off) => at(t0, () => {
    const bear = toward(b, f.player);
    if (gap > 0) whip(M.arc(f, { start: t0, end: t1, w: 21, h: 19.4, gap, gapAt: bear + off }), t1, gap, bear + off);
    else whip(M.ring(f, { start: t0, end: t1, w: 21, param: 19.4, kind: 'white' }), t1, 0, 0);
    R.flareSound(t0, t1);
  });
  flare(B(16, 2), B(17, 2), 1.745, 70 * Math.PI / 180);
  flare(B(18, 1), B(19, 1), 0.873, -90 * Math.PI / 180);
  flare(B(19, 1), B(19, 4), 0, 0);
  at(B(19, 4), () => R.dress(false));
  // ACCESSORIES SOLD SEPARATELY: three things plucked off the wrecked dress, one on each word
  const acc = (t0, t1, shape, size, kind) => at(t0, () => {
    C.say('sale', 1);
    C.strike('OverhandThrow', t0 + 0.05, { from: 0.25, to: 0.7, hit: 0.3 });
    M.lob(f, { start: t0, end: t1, r: 1.1, mesh: R.package(kind), shape, size, onLand: (sh) => R.glitterPop(sh) });
  });
  acc(B(19, 4.5), B(20, 2.5), 'star', 0.35, 'brooch');
  acc(B(20, 4.5), B(21, 2.5), 'kiss', 0.35, 'lipstick');
  acc(B(22, 1), B(22, 3), 'heart', 0.6, 'heartbox');
  // THE DIP: the low end goes, the rows die; the moving heads find her. Hit her, then get out by 33.33
  go(B(22, 3) + 0.05, -6.1, -1.0, 0.6);           // (clear of the left rack)
  at(B(23, 1), () => {
    b.behave = 'hold'; C.hold(B(23, 1), B(24, 1));
    R.headsTo(b, B(23, 1), B(24, 1));
    M.circle(f, { around: true, start: f.t, end: B(24, 1), w: 3.0, kind: 'white', melee: true, onImpact: () => R.herFlash() });
  });

  // =================================================================== S2 THE PARTY · chorus 1 · 33.33–54.66
  // (chorus 2 is chorus 1 exactly, 40 bars later: the same builder, with the room's differences)
  const chorus = (o) => {
    const k = o.bar0 - 24;                     // bars after chorus 1
    const b0 = (bar, beat = 1) => B(bar + k, beat);
    at(b0(24, 1), () => { R.cannons.fire(f.t); C.say('service'); });
    // SEXY DADDY ISSUES — COMES WITH REAL TEARS: the package on "REAL", the tears on "TEARS"
    at(b0(24, 3), () => {
      C.say('sale', 2); C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3 });
      const at0 = you();
      const tears = R.tears(at0, b0(24, 3), b0(25, 2), 2.2, 6, 2);
      M.lob(f, { end: b0(25, 1), r: 1.1, mesh: R.package('tie'), shape: 'card', size: 0.45,
        onCaught: () => R.popTears(tears), onLand: (sh) => R.landed(sh, b0(25, 2) + 0.4, 'tie') });
      if (o.mirror && R.refl && R.refl.alive) { const rp = R.refl.pos(); M.lob(f, { end: b0(25, 1), r: 1.1, at: rp, damage: 0, mesh: R.package('tie'), shape: 'card', size: 0.45, onLand: (sh) => { R.refl.hitBy('package'); R.landed(sh, b0(25, 2) + 0.4, 'tie'); } }); R.tears(rp, b0(24, 3), b0(25, 2), 2.2, 2, 0); }
    });
    // SEXY ABANDONMENT: she turns her back and walks away; the floor leaves, three times
    at(b0(25, 2), () => { const far = { x: b.x > 0 ? -7 : 7, z: -4 }; b.behave = 'hold'; b.moveTo(far.x, far.z, 2.4, { easing: 'inOut' }); });
    const pit = (t0, t1) => at(t0, () => R.trapdoor(you(), t0, t1, b0(30, 1)));
    pit(b0(25, 2), b0(26, 2)); pit(b0(26, 2), b0(27, 1)); pit(b0(26, 4), b0(27, 2.5));
    // WRAP YOUR DAMAGE UP IN FISHNETS AND GLITTER: a net on the seams, then shifted half a tile
    at(b0(27, 4.5), () => R.fishnet(0, b0(27, 4.5), b0(28, 4.5)));
    at(b0(29, 1), () => R.fishnet(1.5, b0(29, 1), b0(29, 3), true));
    // MAKE IT FUCKABLE, MAKE IT PRETTY, MAKE IT BITTER: pink, pink, white
    combo(b0(29, 3), [[b0(29, 3), b0(30, 1), 'pink', 'Sword_Regular_A'], [b0(30, 2), b0(30, 4), 'pink', 'Sword_Regular_B'], [b0(31, 1), b0(31, 3), 'white', 'Sword_Regular_C']], b0(29, 4));
    // WE'RE ALL WEARING OUR TRAUMA TO THE PARTY TONIGHT: she dances; the racks swing (or spring up) on "PAR-ty"
    at(b0(32, 1), () => { R.cannons.fire(f.t); b.behave = 'hold'; b.moveTo(0, -1, 0.5); C.loop('Dance_Loop', f.t + 0.5); });
    at(b0(32, 1), () => (o.racksUp ? R.racksUpTele(b0(32, 1), b0(33, 1)) : R.racksSwingTele(b0(32, 1), b0(33, 1))));
    at(b0(33, 1) + 0.2, () => { b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop'); });
    // SEQUINED SCARS UNDER THE BLACK LIGHT: an X of cuts at YOU, then the strobe, then she's on the heel-prints
    at(b0(33, 3), () => {
      const c = you();
      C.strike('Sword_Attack', b0(34, 2.5), { hit: 0.42 });
      for (const a of [Math.PI / 4, -Math.PI / 4]) M.lane(f, { from: { x: c.x - Math.sin(a) * 7, z: c.z - Math.cos(a) * 7 }, angle: a, start: f.t, end: b0(34, 2.5), w: 0.8, h: 14, kind: 'white', silent: a < 0, sound: a > 0, onImpact: (hit, sh) => R.scar(sh, b0(36, 3)) });
      R.ripSound(f.t, b0(34, 2.5));
    });
    at(b0(35, 2), () => { const p = R.heelPrints(2.2); R.keepPrints(p, b0(35, 3)); b._heel = p; });
    at(b0(35, 3), () => { if (b._heel) { b.place(b._heel.x, b._heel.z); b.faceNow(f.player.x, f.player.z); } });
    lash(b0(35, 2), b0(35, 4), { fromHeel: true });
    // YOU CAN'T RETURN IT BUT YOU CAN MAKE IT CUTE: three packages under the sign; all three back and she staggers
    at(b0(36, 1) - 0.34, () => { const away = near(you(), -4); b.moveTo(M.clamp(away.x, -9, 9), M.clamp(away.z, -6, 4), 0.32); });
    let returned = 0;
    const cute = (t0, t1) => at(t0, () => {
      C.say('sale', 1); C.strike('OverhandThrow', f.t + 0.04, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.6 });
      M.lob(f, { start: t0, end: t1, r: 1.1, mesh: R.package('heart'), shape: 'card', size: 0.42,
        onCaught: () => { if (++returned === 3) { C.say('no', 2); C.play('Hit_Knockback', f.t + 0.2, 0.5); b.open(2 * f.beat); R.sign.flicker = f.t + 1.2; } },
        onLand: (sh) => { M.burst(f, { at: sh, start: f.t, end: f.t + 0.02, n: 5, speed: 5, shape: 'petal', ringW: 0.6, silent: true }); R.glitterPop(sh); } });
    });
    at(b0(36, 1) - 0.01, () => { returned = 0; });
    cute(b0(36, 1), b0(36, 3)); cute(b0(36, 3), b0(37, 1)); cute(b0(36, 4.5), b0(37, 2.5));
    // SEXY TRAUMA COSTUME — IT'S THE TRUTH IN A SUIT: the big one, high and slow
    at(b0(38, 3), () => {
      C.say('sale', 3); C.strike('OverhandThrow', f.t + 0.06, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.8 });
      M.lob(f, { end: b0(39, 3), r: 1.8, peak: 5, mesh: R.package('title'), shape: 'card', size: 0.8, back: 6, backPerfect: 9,
        onLand: (sh) => { R.landed(sh, b0(40, 1), 'title'); M.burst(f, { at: sh, start: f.t, end: b0(40, 1), n: 8, speed: 6, shape: 'card', ringW: 1.6, ringT: 0.3 }); } });
    });
  };
  // a pink-pink-white combo: she lunges in to 2.2 m (arriving `arrive`), each cut snapped as its shape appears
  function combo(tLunge, cuts, arrive) {
    at(tLunge, () => {
      const p = near(you(), 2.2); b.behave = 'hold';
      C.strike('Sword_Dash', arrive, { from: 0.1, to: 0.5, hit: 0.7 });
      b.moveTo(M.clamp(p.x, -10.4, 10.4), M.clamp(p.z, -6.5, 6.5), Math.max(0.12, arrive - f.t), { easing: 'in' });
      R.snd.whoosh();
    });
    for (const [t0, t1, kind, clip] of cuts) at(t0, () => {
      // from where she will be when it lands
      const from = b.move ? { x: b.move.tx, z: b.move.tz } : { x: b.x, z: b.z };
      C.strike(clip, t1, { hit: clip === 'Sword_Regular_C' ? 0.2 : 0.5, dur: clip === 'Sword_Regular_C' ? 1.2 : undefined });
      if (kind === 'pink') M.cone(f, { from, start: t0, end: t1, w: 2.8, param: 0.87, kind: 'pink', onImpact: (hit) => { if (hit === 'parried') { C.say('no', 2); C.play('Hit_Chest', f.t, 0.3); } } });
      else M.cone(f, { from, start: t0, end: t1, w: 3.4, param: 1.48, kind: 'white', onImpact: () => { b.open(2 * f.beat); } });
      R.snd.stretch(t0, t1, kind === 'white' ? 1 : 0.6);
    });
  }
  chorus({ bar0: 24 });

  // =================================================================== S3 BEST SELLERS · verse 2 · 54.66–76.01
  at(B(40, 1), () => { b.behave = 'keep'; b.behaveOpts = { r: 4, rMin: 3, rMax: 5.5, speed: 2.4, dir: 1 }; C.draw('shears'); });
  // AISLE THREE'S GOT SEXY CHILDHOOD NEGLECT: uncaught, it sits there through the stop and springs open on the band
  at(B(40, 4.5), () => {
    C.say('sale', 2); C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.6 });
    M.lob(f, { end: B(41, 2.5), r: 1.1, mesh: R.package('crayon'), shape: 'card', size: 0.45,
      onLand: (sh) => { R.landed(sh, B(42, 1) + 0.1, 'crayon'); R.jackInTheBox(sh, B(42, 1)); M.circle(f, { at: sh, start: f.t, end: B(42, 1), w: 1.8, kind: 'white' }); } });
  });
  // COMES WITH DETACHABLE MOM WHO FORGETS: her own forearm, thrown like a boomerang
  at(B(42, 1), () => { b.behave = 'hold'; b.faceNow(f.player.x, f.player.z); });
  at(B(42, 2), () => R.arm(B(42, 2), B(42, 4.5), B(43, 2), B(43, 3)));
  // SEXY GASLIGHTING'S OUR BEST SELLER THIS YEAR: the price gun; the tags blink after 2 m, their dots don't
  at(B(43, 4), () => { C.draw('gun'); b.idle = 'Pistol_Idle_Loop'; b.loop('Pistol_Idle_Loop'); C.say('sale', 1); });
  const volley = (t0, t1) => at(t0, () => { b.faceNow(f.player.x, f.player.z); C.strike('Pistol_Shoot', t1, { hit: 0.2 }); M.fan(f, { start: t0, end: t1, n: 3, arc: 30, speed: 11, shape: 'card', size: 0.3, blink: true }); R.snd.printer(t0, t1); });
  volley(B(44, 1), B(44, 2)); volley(B(44, 3.5), B(44, 4.5)); volley(B(45, 2), B(45, 3));
  // THE ACCESSORIES WHISPER "THAT NEVER HAPPENED HERE": one held pose; on "HERE" the room puts itself back
  at(B(45, 4), () => { C.draw('shears'); b.idle = 'Idle_Talking_Loop'; b.loop('Spell_Simple_Idle_Loop'); C.hold(62.30, 65.33); C.say('service'); });
  at(64.83, () => R.gaslight());
  // GOT SEXY CODEPENDENCY — IT'S A COUPLE'S COSTUME: two hearts on a ribbon; uncaught, the ribbon is a tripwire
  at(65.33, () => { b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop'); b.behave = 'keep'; });
  at(B(48, 4), () => {
    C.say('sale', 2); C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.6 });
    const from = { x: b.x, z: b.z };
    M.lob(f, { end: B(49, 3), r: 1.4, mesh: R.package('heartbox'), shape: 'heart', size: 0.5, back: 8, backPerfect: 12,
      onLand: (sh) => R.tripwire(sh, from, B(49, 4), B(52, 1)) });
  });
  // SEXY SELF-DESTRUCTION IN THE CLEARANCE ROOM: a package with a lit fuse
  at(B(50, 1), () => {
    C.say('sale', 2); C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.6 });
    M.lob(f, { end: B(50, 3.5), r: 1.1, mesh: R.package('bomb'), shape: 'card', size: 0.45, back: 6, backPerfect: 9,
      onLand: (sh) => { R.landed(sh, B(51, 3), 'bomb'); R.fuse(sh, B(51, 3)); M.circle(f, { at: sh, start: f.t, end: B(51, 3), w: 2.4, kind: 'white', onImpact: () => R.boom(sh) }); } });
  });
  // the shutter rolls up on "in the clearance room"; two bins roll out of the bay
  at(B(51, 3), () => R.binsOut(B(51, 3), B(52, 1)));
  // SEE-THROUGH FABRIC FOR YOUR SEE-THROUGH THERAPY: the curtains go sheer; pink, pink, white with the tape
  at(B(51, 3) + 0.1, () => { const p = near(you(), 3); b.behave = 'hold'; b.moveTo(M.clamp(p.x, -10, 10), M.clamp(p.z, -6.5, 6.5), 0.35); });
  at(71.06, () => R.curtains('sheer'));
  lash(B(51, 4), B(52, 2));
  lash(B(52, 2.5), B(52, 4.5));
  at(B(52, 4.5), () => { C.strike('Sword_Heavy_Combo', B(53, 2.5), { from: 0.35, to: 0.6, hit: 0.5 }); M.ring(f, { start: f.t, end: B(53, 2.5), w: 3.0, param: 1.6, kind: 'white' }); R.zip(f.t, B(53, 2.5)); });
  // EVERY WOUND'S ON SALE, EVERY SCAR COMES FREE: at the mouth of the bay, presenting the bins; each whole bin bursts twice
  at(B(53, 2.5) + 0.05, () => { b.behave = 'hold'; b.moveTo(9.4, 0.0, B(53, 3) - f.t + 0.3); C.loop('Spell_Simple_Idle_Loop', B(53, 3) + 0.3); C.say('sale', 4); });
  const binBurst = (t0, t1) => at(t0, () => { R.bins.whole().forEach((bn, i) => M.burst(f, { at: { x: bn.g.position.x, z: bn.g.position.z }, start: t0, end: t1, n: 6, speed: 6, shape: 'card', ringW: 1.2, ringT: 0.25, silent: i > 0, onFire: () => R.binBurst(bn) })); });
  binBurst(B(53, 3), B(54, 3));
  binBurst(B(54, 3), B(55, 3));
  at(B(54, 3), () => M.lob(f, { end: B(55, 3), r: 1.1, mesh: R.package('heartbox'), shape: 'heart', size: 0.5, onLand: (sh) => R.glitterPop(sh) }));
  at(B(55, 3) + 0.05, () => { b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop'); });

  // =================================================================== S4 THE MIRROR · pre 2 · 76.01–86.65
  // HEMLINES RISING: the tape swung round her at floor level, the flare again without the dress
  at(B(55, 4), () => { b.behave = 'hold'; b.moveTo(-3, -2, Math.max(0.2, B(56, 1) - f.t)); });
  at(B(56, 1), () => {
    const bear = toward({ x: -3, z: -2 }, f.player);
    C.strike('Sword_Heavy_Combo', B(56, 4.5), { from: 0.35, to: 0.62, hit: 0.6 });
    whip(M.arc(f, { start: f.t, end: B(56, 4.5), w: 21, h: 19.6, gap: 1.05, gapAt: bear + 60 * Math.PI / 180 }), B(56, 4.5), 1.05, bear + 60 * Math.PI / 180);
    R.zip(f.t, B(56, 4.5));
  });
  at(77.15, () => R.curtains('rise'));
  // BOUNDARIES FALLING: the four racks topple toward the runner on "FALL-ing"
  at(B(57, 3), () => R.racksFallTele(B(57, 3), B(58, 3.5)));
  // IN THE FITTING ROOM: she presents the mirror; YOU's reflection runs two beats late
  at(B(59, 2), () => { b.behave = 'hold'; b.moveTo(-7.2, -4.4, 1.0); C.loop('Spell_Simple_Idle_Loop', f.t + 1.0); C.say('sale'); C.hold(B(59, 2) + 1.05, B(62, 1)); });
  // THE MIRROR STARTS CALLING: cracks across the glass; it bursts out down its facing on the bar with no bass
  at(B(62, 1), () => {
    const fwd = R.mirrorFacing();
    M.cone(f, { from: { x: fwd.x, z: fwd.z }, angle: fwd.a, start: f.t, end: B(63, 1), w: 7.0, param: 0.70, kind: 'white', melee: false,
      onImpact: () => { R.mirrorBurst(); M.fan(f, { from: { x: fwd.x, z: fwd.z }, angle: fwd.a, start: f.t, end: f.t + 0.01, n: 10, arc: 70, speed: 9, shape: 'shard', aim: false }); } });
  });
  // her spotlight again, beside the mirror, as it bursts
  at(B(63, 1), () => {
    b.behave = 'hold'; C.say('service');
    R.headsTo(b, B(63, 1), B(64, 1)); R.snd.motors(B(63, 1), B(64, 1));
    M.circle(f, { around: true, start: f.t, end: B(64, 1), w: 3.0, kind: 'white', melee: true, onImpact: () => R.herFlash() });
  });

  // =================================================================== S5 THE PARTY AGAIN · chorus 2 · 86.65–107.99
  C.freezes.push([B(71, 1), B(71, 2)]);         // the band drops out for a beat before "bitter": she freezes in her wind-up
  chorus({ bar0: 64, mirror: true, racksUp: true });

  // =================================================================== S6 LAST CALL · the band · 107.99–118.66
  at(B(80, 1), () => { b.behave = 'hold'; C.hop(0, -6.05, B(80, 1), B(80, 2)); C.draw('gun'); });
  at(B(80, 2) + 0.05, () => { b.idle = 'Dance_Loop'; b.loop('Dance_Loop'); });
  // price-gun fans on the bass holes: seven tags across 90 degrees
  const holeFan = (t0, t1) => at(t0, () => {
    C.strike('Pistol_Shoot', t1, { hit: 0.2 });
    M.cone(f, { start: t0, end: t1, w: 7, param: 0.79, kind: 'white', damage: 0, melee: false, sound: false });
    M.fan(f, { start: t0, end: t1, n: 7, arc: 90, speed: 10, shape: 'card', size: 0.3, aim: false, live: true });
  });
  holeFan(B(80, 1), B(80, 3)); holeFan(B(82, 1), B(82, 3)); holeFan(B(84, 1), B(84, 3));
  // the guests pass YOU ammunition: everyone at this party is on YOU's side, and dressed as her
  const gift = (t0, t1) => at(t0, () => { const g = R.guestThrower(); M.lob(f, { start: t0, end: t1, from: g, fromY: 2.4, r: 1.1, mesh: R.package('box'), shape: 'card', size: 0.42, onLand: (sh) => R.glitterPop(sh) }); });
  gift(B(81, 1), B(81, 3)); gift(B(83, 1), B(83, 3));
  // the "ooh": she hops down, faces YOU and holds one long pose, jaw wide open
  at(B(86, 1), () => { C.draw('shears'); C.hop(0, -1, B(86, 1), B(86, 2), false); C.say('sale'); C.hold(B(86, 2) + 0.1, B(88, 1) - 0.4); b.idle = 'Idle_Talking_Loop'; });

  // =================================================================== S7 MAYBE · bridge A · 118.66–129.33
  at(118.28, () => { C.say('crack'); C.mask(true); });
  at(B(88, 3), () => {
    const a = toward(b, f.player), len = 12;
    M.lane(f, { angle: a, start: f.t, end: B(89, 3), w: 0.9, h: len, kind: 'white', melee: true });
    const ex = M.clamp(b.x + Math.sin(a) * len, -10.4, 10.4), ez = M.clamp(b.z + Math.cos(a) * len, -6.5, 6.5);
    f.at(B(89, 3) - f.beat / 2, () => { b.moveTo(ex, ez, f.beat / 2, { easing: 'in' }); C.play('Jog_Fwd_Loop', f.t, f.beat / 2); });
  });
  at(B(89, 4), () => { C.mask(false); b.open(2 * f.beat); C.play('Hit_Knockback', f.t, 0.4); });
  // three kisses, each on its word; caught, they go back as gold kisses
  at(B(90, 1), () => { const p = near(you(), -2.5); b.behave = 'hold'; b.moveTo(M.clamp(p.x, -9.5, 9.5), M.clamp(p.z, -6, 5), 0.6); });
  const kiss = (t1) => at(t1 - 2 * bm.periodAt(t1), () => { C.play('Spell_Simple_Shoot', f.t, 0.4); M.lob(f, { start: f.t, end: t1, r: 0.9, fromY: 1.7, peak: 0.25, shape: 'kiss', size: 0.45, onLand: () => {} }); });
  kiss(B(90, 4.5)); kiss(B(91, 3)); kiss(B(92, 1));
  // MAYBE IF WE DRESS IT UP SOMEONE WILL FINALLY SEE: both cuts together, then a twirl to be looked at
  at(B(92, 1) + 0.1, () => { const p = near(you(), 2.2); b.moveTo(M.clamp(p.x, -10.4, 10.4), M.clamp(p.z, -6.5, 6.5), Math.max(0.15, B(92, 3) - f.t), { easing: 'in' }); });
  at(B(92, 3), () => {
    C.strike('Sword_Regular_A', B(93, 1), { hit: 0.5 });
    f.at(B(93, 1) + 0.02, () => C.strike('Sword_Regular_B', B(93, 2), { hit: 0.5 }));
    M.cone(f, { start: f.t, end: B(93, 1), w: 2.8, param: 0.87, kind: 'pink' });
    M.cone(f, { start: f.t, end: B(93, 2), w: 2.8, param: 0.87, kind: 'pink', turn: (Math.random() < 0.5 ? 1 : -1) * 30 * Math.PI / 180 });
  });
  at(B(93, 2), () => { C.strike('Sword_Heavy_Combo', B(93, 4.5), { from: 0.35, to: 0.6, hit: 0.5 }); M.ring(f, { start: f.t, end: B(93, 4.5), w: 2.8, param: 1.6, kind: 'white' }); });
  // MAYBE IF WE LAUGH ABOUT IT: her jaw rattles, then eight notes out of her mouth in a slow spiral
  at(B(94, 3), () => { M.ring(f, { start: f.t, end: B(95, 1), w: 1.0, param: 0.3, kind: 'pink', damage: 0, sound: false }); C.say('sale'); });
  at(B(95, 1), () => { const a0 = toward(b, f.player); for (let i = 0; i < 8; i++) f.at(B(95, 1 + i * 0.5), () => { if (f.suppress) return; const a = a0 + i * Math.PI / 4; f.proj.spawn({ x: b.x + Math.sin(a) * 0.6, z: b.z + Math.cos(a) * 0.6, y: 2.4, angle: a, speed: 6, kind: 'pink', shape: 'note', size: 0.35, life: 10 / 6, spin: 3 }); f.sfx.fire && f.sfx.fire('note', f.pan(b.x), 'pink'); }); });
  at(B(96, 4), () => { C.draw(null); C.say('crack'); R.clang(b); });

  // =================================================================== S8 THE ZIPPER · bridge B · 129.33–142.67
  at(B(96, 1), () => { b.behave = 'hold'; C.slowTurn = true; b.idle = 'Interact'; b.loop('Interact', { speed: 0.7 }); });
  // BUT THE ZIPPER'S STUCK: the tape whirl; parried, she ties her own ankles and goes down
  at(B(97, 3), () => {
    R.zip(f.t, B(98, 4));
    M.ring(f, { start: f.t, end: B(98, 4), w: 2.6, param: 1.2, kind: 'pink',
      onImpact: (hit) => { if (hit === 'parried') { C.tied = true; C.say('no', 2); C.play('Death01', f.t, 0.67, { from: 0, to: 0.42 }); C.hold(f.t + 0.67, B(100, 1)); f.at(B(100, 1), () => C.play('LayToIdle', f.t, 0.67)); b.open(B(100, 3) - f.t); } } });
  });
  // ON MEMORIES: the lunge (not if she's tied up)
  at(B(99, 1), () => {
    if (C.tied) return;
    const a = toward(b, f.player), len = 10;
    M.lane(f, { angle: a, start: f.t, end: B(100, 1), w: 0.9, h: len, kind: 'white', melee: true });
    const ex = M.clamp(b.x + Math.sin(a) * len, -10.4, 10.4), ez = M.clamp(b.z + Math.cos(a) * len, -6.5, 6.5);
    f.at(B(100, 1) - 0.16, () => { b.moveTo(ex, ez, 0.16, { easing: 'in' }); C.play('Sword_Dash', f.t, 0.3, { from: 0.1, to: 0.5 }); });
  });
  at(135.0, () => { C.tied = false; b.idle = 'Idle_Shield_Break'; C.play('Idle_Shield_Break', f.t, 2.0, { from: 0.3, to: 0.6 }); C.hold(135.6, 137.0); });
  // AND THESE HEELS: her right stiletto snaps on the big hit; one knee, open
  at(B(102, 1), () => { C.heel(); C.play('Hit_Knockback', f.t, 0.5); b.open(2 * f.beat); b.idle = 'Idle_Talking_Loop'; });
  // ARE KILLING ME: she throws the broken shoe
  at(B(102, 3), () => { C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.6 }); M.lob(f, { end: B(103, 2), r: 1.0, mesh: R.package('shoe'), shape: 'petal', size: 0.4, back: 6, backPerfect: 9, onLand: (sh) => R.landed(sh, B(106, 1), 'shoe') }); });
  // SEXY DADDY ISSUES, one more time, slower and alone; no tears
  at(B(104, 1), () => { C.say('crack'); C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.6 }); M.lob(f, { end: B(104, 3.5), r: 1.1, mesh: R.package('tie'), shape: 'card', size: 0.45, onLand: (sh) => R.landed(sh, B(106, 1), 'tie') }); });
  // I'LL TAKE IT IN BLACK: every light slams on and the room has gone black; she hops onto the counter for the downbeat
  // (she starts for it half a bar early, on her feet, from wherever the bridge left her)
  at(B(105, 1), () => { C.slowTurn = false; b.behave = 'hold'; b.moveTo(Math.max(-2.6, Math.min(2.6, b.x)), -4.3, Math.max(0.3, B(105, 3) - f.t), { easing: 'inOut' }); });
  at(B(105, 3), () => { C.slowTurn = false; C.say('service'); C.draw('shears'); C.hop(0, -6.05, B(105, 3), B(106, 1)); });

  // =================================================================== S9 NO REFUNDS · final chorus · 142.67–169.33
  at(B(106, 1), () => { R.cannons.fire(f.t); b.idle = 'Idle_Talking_Loop'; });
  // SEXY EMOTIONAL DAMAGE — THERE'S NO GIVING IT BACK: the first FINAL SALE. White, cornered; it can't be caught
  at(B(106, 1), () => {
    C.say('sale', 2); C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.6 });
    M.lob(f, { end: B(106, 4), r: 1.4, kind: 'white', mesh: R.package('final'), shape: 'card', size: 0.45, onHit: () => R.snd.thud(f.player.x),
      onLand: (sh) => { R.landed(sh, B(107, 4.5), 'final'); M.burst(f, { at: sh, start: f.t, end: B(107, 4.5), n: 8, speed: 6, shape: 'card', ringW: 1.2, ringT: 0.25 }); } });
  });
  // WE'RE ALL WALKING ADVERTISEMENTS FOR PAIN: four guests in sandwich boards walk the room
  at(B(107, 4), () => R.walkers(B(107, 4), B(108, 2)));
  // MAKING TRAUMA FASHION: the runway; she struts it as a blur
  at(B(108, 4), () => { C.hop(0, -4.2, f.t, f.t + 0.35, false); });
  at(B(109, 3), () => {
    M.area(f, { shape: 'rect', x: 0, z: -5.4, angle: 0, w: 1.0, h: 11, kind: 'white', start: f.t, end: B(110, 2.5), melee: true });
    R.runwayLights(B(109, 3), B(110, 2.5));
    f.at(B(110, 2.5) - 0.2, () => { b.moveTo(0, 5.6, 0.2, { easing: 'in' }); });
    f.at(B(110, 2.5), () => { b.open(2 * f.beat); C.say('sale', 2); C.play('Spell_Simple_Enter', f.t, 0.5); });
  });
  // GOING INSANE: the spin
  at(B(110, 4), () => { C.strike('Sword_Heavy_Combo', B(111, 2), { from: 0.35, to: 0.6, hit: 0.5 }); M.ring(f, { start: f.t, end: B(111, 2), w: 3.0, param: 2.0, kind: 'white' }); R.zip(f.t, B(111, 2)); });
  // EVERYBODY'S WEARING THEIR DAMAGE TONIGHT: a package to every walker still standing (they burst), and one for YOU
  at(150.28, () => R.walkersArmed(B(112, 1), B(112, 4.5)));
  at(B(112, 3), () => { C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.6 }); M.lob(f, { end: B(113, 2), r: 1.1, mesh: R.package('box'), shape: 'card', size: 0.45, onLand: (sh) => R.glitterPop(sh) }); });
  // SPARKLES COVERING THE FROSTBITE
  at(B(113, 4.5), () => R.cannons.fire(f.t));
  at(B(114, 1), () => M.burst(f, { at: { x: b.x, z: b.z }, start: f.t, end: B(115, 1), n: 12, speed: 5.5, shape: 'shard', ringW: 1.2, ringT: 0.3 }));
  // (HIDE,) NO REFUNDS, NO EXCHANGES: she shakes her head and sweeps the price gun twice
  at(B(115, 2.5), () => { R.uvBlink(); C.draw('gun'); C.play('Idle_No_Loop', f.t, 0.8); C.say('no', 6); });
  const sweep = (t0, t1, dir) => at(t0, () => {
    const a0 = toward(b, f.player);
    M.cone(f, { start: t0, end: t1, w: 9, param: 0.65, kind: 'white', damage: 0, melee: false, sound: false });
    for (let i = 0; i < 6; i++) f.at(t1 + i * bm.periodAt(t1) / 2, () => {
      if (f.suppress || f.state !== 'play') return;
      const a = a0 + dir * (i / 5 - 0.5) * 75 * Math.PI / 180;
      f.proj.spawn({ x: b.x + Math.sin(a) * 0.9, z: b.z + Math.cos(a) * 0.9, y: 1.2, angle: a, speed: 12, kind: 'white', shape: 'card', size: 0.3, life: 10 / 12, spin: 4 });
      f.sfx.fire && f.sfx.fire('card', f.pan(b.x), 'white');
    });
  });
  sweep(B(115, 3), B(116, 1), 1); sweep(B(116, 2), B(116, 4), -1);
  // (YES,) JUST PROOF: she jumps and slams a receipt down: two hearts, the biggest shockwave yet
  at(B(118, 1), () => { C.draw('shears'); b.behave = 'hold'; C.play('NinjaJump_Start', B(119, 1) - 0.5, 0.5); M.circle(f, { around: true, start: f.t, end: B(119, 1), w: 4.0, kind: 'white', damage: 2, melee: true, onImpact: () => { f.cam.shake(1.0, 0.3); f.cam.kick(2); R.stamp(b); } }); R.snd.stretch(f.t, B(119, 1), 1.2); });
  // THE CLEARANCE: the shelving dumps its stock in three waves; the price gun between them
  const wave = (t0, t1) => at(t0, () => R.avalanche(t0, t1));
  wave(B(119, 3), B(120, 3)); wave(B(121, 3), B(122, 3)); wave(B(123, 3), B(124, 3));
  const gunFan = (t1) => at(t1 - bm.periodAt(t1), () => { C.draw('gun'); M.fan(f, { start: f.t, end: t1, n: 3, arc: 30, speed: 11, shape: 'card', size: 0.3 }); });
  gunFan(B(121, 3)); gunFan(B(123, 3));
  at(B(119, 2), () => { b.behave = 'keep'; b.behaveOpts = { r: 5, rMin: 4, rMax: 7, speed: 2.4, dir: 1 }; });

  // =================================================================== S10 THE TRUTH · tag · 169.33–182.66
  at(B(126, 1), () => { R.heroPackage(B(126, 1), B(127, 2)); C.draw('shears'); });
  at(B(126, 2), () => {
    C.say('sale', 4); C.strike('OverhandThrow', f.t + 0.06, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.8 });
    M.lob(f, { end: B(127, 2), r: 1.8, peak: 5, mesh: R.package('title'), shape: 'card', size: 0.8, back: 6, backPerfect: 9,
      onLand: (sh) => { R.landed(sh, B(127, 4), 'title'); M.burst(f, { at: sh, start: f.t, end: B(127, 4), n: 8, speed: 6, shape: 'card', ringW: 1.6, ringT: 0.3 }); } });
  });
  // the remix: one learned attack on each bass hole
  at(B(127, 3), () => {
    const c = you(), a = toward(b, c);
    C.strike('Sword_Heavy_Combo', B(128, 3), { from: 0.72, to: 0.95, hit: 0.55 });
    M.lane(f, { angle: a, start: f.t, end: B(128, 3), w: 1.2, h: 16, kind: 'white', melee: true, onImpact: (hit, sh) => R.tear(sh) });
    const a2 = a + Math.PI / 2;
    M.lane(f, { from: { x: c.x - Math.sin(a2) * 8, z: c.z - Math.cos(a2) * 8 }, angle: a2, start: f.t, end: B(128, 3), w: 1.2, h: 16, kind: 'white', silent: true, sound: false, onImpact: (hit, sh) => R.tear(sh, true) });
    R.ripSound(f.t, B(128, 3));
  });
  at(B(129, 3), () => R.fishnet(0, B(129, 3), B(130, 3)));
  combo(B(131, 1), [[B(131, 1), B(131, 3), 'pink', 'Sword_Regular_A'], [B(131, 3), B(132, 1), 'pink', 'Sword_Regular_B'], [B(132, 1), B(132, 3), 'white', 'Sword_Regular_C']], B(131, 2));
  // BUT WE'RE ALL LIVING THE TRUTH: the cover lights up, the moving heads find YOU, and YOU's meter fills
  at(179.99, () => { b.behave = 'hold'; b.faceNow(f.player.x, f.player.z); R.heroLit(); C.say('service'); });
  at(B(135, 3), () => { if (f.player.meter < 1) { f.player.meter = 1; f.sfx.meterFull && f.sfx.meterFull(); } });

  // =================================================================== S11 THE TILL · outro and the last slam · 182.66–214.88
  // she goes round the end of the counter (never through it) to the register, at a jog at most
  at(B(136, 1), () => { b.behave = 'hold'; C.draw(null); const dur = roundCounter(1.8, -6.85, 4.5, 1.2); C.loop('Interact', f.t + dur, 0.8); });
  // PLUS YOUR DIGNITY, PLUS YOUR PEACE OF MIND: receipts shoot across the floor at YOU
  const receipt = (t0, t1, last) => at(t0, () => { R.receipt(t0, t1, last); R.snd.printer(t0, t1); });
  receipt(B(137, 4), B(138, 3)); receipt(B(138, 3.5), B(139, 2.5)); receipt(B(139, 2.5), B(140, 1.5), true);
  at(188.36, () => { b.idle = 'PickUp_Table'; b.loop('PickUp_Table'); });
  // HAPPY HALLOWEEN: wrapped sweets in a fan
  at(B(142, 4), () => { b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop'); M.cone(f, { start: f.t, end: B(143, 2), w: 6, param: 0.52, kind: 'pink', damage: 0, melee: false, sound: false }); M.fan(f, { start: f.t, end: B(143, 2), n: 5, arc: 60, speed: 6, kind: 'pink', shape: 'pill', size: 0.32, aim: false }); });
  // WEAR IT WELL: one pin
  at(B(145, 2), () => { C.play('Spell_Simple_Shoot', f.t, 0.4); M.lob(f, { end: B(145, 4), r: 0.8, fromY: 1.5, peak: 0.2, shape: 'pill', size: 0.25, onLand: () => {} }); });
  // SEE YOU BACK HERE WHEN YOU'RE READY FOR HELL
  at(197.16, () => { C.say('hell'); C.basePlate = 'hell'; });
  at(B(147, 1), () => { roundCounter(0, -1, 3.0, 2.6); });
  at(B(150, 1), () => { b.behave = 'hold'; M.circle(f, { around: true, start: f.t, end: B(152, 1), w: 3.5, kind: 'white', damage: 2, melee: true, onImpact: () => { f.cam.shake(1.2, 0.35); f.cam.kick(2.5); R.hellmouth(b, true); } }); R.hellmouth(b, false); });
  // THE LAST SLAM: she freezes in every gap and strikes on the hit after it
  at(B(152, 1), () => { C.draw('shears'); const a = toward(b, f.player); C.strike('Sword_Heavy_Combo', B(152, 3.5), { from: 0.72, to: 0.95, hit: 0.55 }); M.lane(f, { angle: a, start: f.t, end: B(152, 3.5), w: 1.2, h: 14, kind: 'white', melee: true, onImpact: (hit, sh) => R.tear(sh) }); });
  at(B(153, 2), () => { C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.5 }); M.lob(f, { end: B(153, 4.5), r: 1.4, kind: 'white', mesh: R.package('final'), shape: 'card', size: 0.45, onHit: () => R.snd.thud(f.player.x), onLand: (sh) => R.landed(sh, B(154, 4), 'final') }); });
  at(B(154, 1.5), () => { const p = near(you(), 2.2); b.moveTo(M.clamp(p.x, -10.4, 10.4), M.clamp(p.z, -6.5, 6.5), 0.25, { easing: 'in' }); f.at(f.t + 0.27, () => { C.strike('Sword_Regular_C', B(154, 3.5), { hit: 0.2, dur: 1.0 }); M.cone(f, { start: f.t, end: B(154, 3.5), w: 3.2, param: 1.22, kind: 'white' }); }); });
  at(B(155, 1), () => { C.play('NinjaJump_Start', B(155, 4.5) - 0.45, 0.45); M.circle(f, { around: true, start: f.t, end: B(155, 4.5), w: 3.0, kind: 'white', melee: true, onImpact: () => R.stamp(b) }); });
  at(B(156, 2), () => { C.strike('OverhandThrow', f.t + 0.05, { from: 0.25, to: 0.7, hit: 0.3, dur: 0.5 }); M.lob(f, { end: B(156, 4), r: 1.1, mesh: R.package('heart'), shape: 'card', size: 0.45, onLand: (sh) => R.glitterPop(sh) }); });
  at(B(157, 2), () => {
    C.draw('gun'); const a0 = toward(b, f.player);
    M.cone(f, { start: f.t, end: B(157, 3.5), w: 9, param: 0.7, kind: 'white', damage: 0, melee: false, sound: false });
    [211.49, 211.66, 211.82, 211.99, 212.16, 212.32].forEach((tt, i) => f.at(tt, () => { if (f.suppress || f.state !== 'play') return; const a = a0 + (i / 5 - 0.5) * 80 * Math.PI / 180; f.proj.spawn({ x: b.x + Math.sin(a) * 0.9, z: b.z + Math.cos(a) * 0.9, y: 1.2, angle: a, speed: 12, kind: 'white', shape: 'card', size: 0.3, life: 10 / 12, spin: 4 }); f.sfx.fire && f.sfx.fire('card', f.pan(b.x), 'white'); }));
  });
  at(212.66, () => { C.draw('shears'); C.play('Idle_Shield_Break', f.t, 1.3); });
  at(213.33, () => { C.taDa(); C.hold(213.6, 216); });

  void starts;
}
