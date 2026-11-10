// The choreography of TRY ME FREE!: every attack on its word and beat (times are song seconds from the design,
// checked against the beat map), and the helpers that draw them. PINK is a free sample (catch it, it's yours);
// WHITE is sharp (dodge it, or dash through on the beat); GOLD is yours.
import * as THREE from 'three';
import { CUTS, T1, T2, T3, FIRE, PUDDLE, FREEZE } from './times.js';
import { setExpr } from './prize.js';
import { P1, P2, BOX, INBOX } from './set.js';
import { FEEL } from '../../game/player.js';
import { inShape } from '../../game/choreo.js';

const TAU = Math.PI * 2, D2R = Math.PI / 180;
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const clampX = (x) => Math.max(-10.6, Math.min(10.4, x));
const clampZ = (z) => Math.max(-6.2, Math.min(6.5, z));
let TR = null;    // the track (its set and prize)
const set = () => TR.set, pr = () => TR.prize, boss = (f) => f.boss;

// ---------------------------------------------------------------- telegraphs whose fill follows a function
// fill(t) -> 0..1 while it's live; land(t) then flashes it on t like any other
export function liveTele(f, o) {
  const g = f.tele.add({ shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h, param: o.param, kind: o.kind || 'white', start: f.t, end: f.t + 1, follow: o.follow, linger: o.linger });
  if (g.dead) return g;
  let landed = null;
  const F = () => Math.max(1e-3, Math.min(1, o.fill(f.t)));
  Object.defineProperty(g, 'start', { get: () => (landed !== null ? landed - 0.3 : f.t - 0.1), set() {} });
  Object.defineProperty(g, 'end', { get: () => (landed !== null ? landed : f.t - 0.1 + 0.1 / F()), set() {} });
  g.land = (t) => { landed = t; };
  return g;
}
// hurt YOU now if `test` says you're in it (dash through it for a near miss), with the usual feedback
function strikeIf(f, inside, o = {}) {
  const pl = f.player;
  if (!inside) return 'miss';
  return f.resolveArea({ shape: 'circle', x: pl.x, z: pl.z, w: 0.6, h: 0.6, angle: 0, param: 0 }, { kind: o.kind || 'white', damage: o.damage ?? 1, melee: o.melee });
}
const area = (f, o) => f.pat.area(f, o);
// a thrown thing passes through YOU for its first 0.2 s: nothing she throws lands point-blank
export function graze(f, q) { if (q && q.owner === 'boss') { q.owner = 'deco'; q.promoteAt = f.t + 0.2; } return q; }

// ---------------------------------------------------------------- her body
// play a clip window so that its contact (fraction of the window) lands on song time t1
function swingAt(f, clip, t1, contact = 0.5, from = 0, to = 1, then = 'idle') {
  const b = boss(f), dur = Math.max(0.12, (t1 - f.t) / Math.max(0.05, contact));
  b.perform(clip, { from, to, duration: dur, then });
}
function faceYou(f) { const b = boss(f); b.faceNow(f.player.x, f.player.z); }
function dashToward(f, dist, dur) {
  const b = boss(f), pl = f.player, a = toward(b, pl), d = Math.hypot(pl.x - b.x, pl.z - b.z);
  const go = Math.max(0, d - dist);
  b.perform('Sword_Dash', { duration: Math.max(0.2, dur), from: 0.05, to: 0.8 });
  b.moveTo(clampX(b.x + Math.sin(a) * go), clampZ(b.z + Math.cos(a) * go), Math.max(0.12, dur * 0.8), { easing: 'out' });
}
// she plays to the lens: her head turns to the game camera while she holds a pose
function toLens(f, sec) { const b = boss(f), c = f.cam.cam.position; b.lookAt = { x: c.x, z: c.z }; f.after(sec, () => { b.lookAt = null; }); }
function freeze(f, beats = 1, outline = true) {
  const b = boss(f), fig = pr().fig;
  toLens(f, beats * f.beat);
  fig.rig.timeScale = 0; if (outline) { fig.pop = 1.1; }
  b.open(beats * f.beat);
  f.after(beats * f.beat, () => { if (!b.frozen) fig.rig.timeScale = 1; });
}
const expr = (name, fade) => setExpr(pr().fig, name, fade);

// ---------------------------------------------------------------- attacks
export function circleOnYou(f, t1, o = {}) {
  const pl = f.player;
  return area(f, { shape: 'circle', x: o.x ?? pl.x, z: o.z ?? pl.z, w: o.r ?? 2.0, kind: o.kind || 'white', start: f.t, end: t1, damage: o.damage, melee: o.melee, onImpact: o.onImpact, follow: o.follow, sound: o.sound });
}
// her signature: eight rays of light from where she stands, filling to `t1`
export function starburst(f, t1, o = {}) {
  const b = boss(f), x = b.x, z = b.z, rot = o.rot ?? 0, n = 8;
  if (f.suppress) return;   // in the spotlight: no rays
  for (let i = 0; i < n; i++) area(f, { shape: 'cone', x, z, angle: rot + i * TAU / n, w: o.r ?? 12, param: (o.half ?? 10) * D2R, kind: 'white', start: o.start ?? f.t, end: t1, sound: false, silent: i > 0 });
  set().sound.play('charge', x, { rate: 2.4 / Math.max(0.5, t1 - f.t), gain: 0.8 });
  const born = f.t;
  f.at(t1, () => { if (set().quashed(born)) return; set().rays(f, x, z, rot, n, o.r ?? 12); set().sound.play('pop', x, { rate: 1.6, gain: 0.7 }); });
}
// a fan of n things at YOU (or along `angle`), arriving at `arrive` (song time) or flying at `speed`
export function fanAt(f, o) {
  const b = boss(f), pl = f.player, src = o.from || { x: b.x, z: b.z };
  const base = o.angle ?? toward(src, pl), n = o.n ?? 3, arc = (o.arc ?? 40) * D2R;
  const d = Math.max(1.5, Math.hypot(pl.x - src.x, pl.z - src.z) - 0.6);
  const speed = o.arrive ? Math.max(3, d / Math.max(0.15, o.arrive - f.t)) : (o.speed ?? 8);
  for (let i = 0; i < n; i++) {
    const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc) + (o.offset ?? 0);
    const kind = typeof o.kind === 'function' ? o.kind(i, n) : (o.kind || 'pink');
    const q = f.proj.spawn({ x: src.x + Math.sin(a) * 0.9, z: src.z + Math.cos(a) * 0.9, y: o.y ?? 1.3, angle: a, speed, kind, shape: o.shape || 'card', size: o.size ?? 0.42,
      homing: o.homing, target: o.homing ? () => f.player : null, life: o.life ?? 5, spin: o.spin ?? 4 });
    graze(f, q);
  }
  f.sfx.fire && f.sfx.fire(o.shape || 'card', f.pan(src.x), o.kind);
}
export function ringOf(f, o) {
  const b = boss(f), n = o.n ?? 10;
  for (let i = 0; i < n; i++) {
    const a = (o.rot ?? 0) + i * TAU / n, pink = i % 2 === 0;
    graze(f, f.proj.spawn({ x: b.x + Math.sin(a) * 0.8, z: b.z + Math.cos(a) * 0.8, y: 1.0, angle: a, speed: o.speed ?? 7, kind: pink ? 'pink' : 'white', shape: pink ? 'heart' : 'star', size: 0.4, life: 4, spin: 3 }));
  }
  set().sound.play('crunchSmall', b.x, { rate: 1.6 });
  f.sfx.fire && f.sfx.fire('heart', f.pan(b.x), 'pink');
}
// a pink swing of the spoon or the selfie stick: a cone in front of her, parry it on the beat
export function swing(f, t1, o = {}) {
  const b = boss(f), pl = f.player; faceYou(f);
  const clips = ['Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C'];
  swingAt(f, clips[(o.i ?? 0) % 3], t1, 0.5, 0.05, 0.85);
  area(f, { shape: 'cone', x: b.x, z: b.z, angle: toward(b, pl), w: o.r ?? 2.6, param: (o.half ?? 55) * D2R, kind: 'pink', start: f.t, end: t1, melee: true, damage: 1,
    follow: () => ({ x: b.x, z: b.z }), onImpact: (hit) => { if (hit === 'parried') set().sound.play('clack', b.x, { rate: 1.4 }); } });
  f.at(t1 - 0.08, () => set().sound.play('servo', b.x, { rate: 3, gain: 0.5 }));
}
// a white slam: the spoon (or the eulogy book) on a circle on YOU
export function slam(f, t1, o = {}) {
  const b = boss(f), pl = f.player, x = pl.x, z = pl.z;
  faceYou(f);
  // she steps to the edge of it and brings it down
  const a = toward({ x, z }, b), r = o.r ?? 2.0;
  b.moveTo(clampX(x + Math.sin(a) * (r + 0.4)), clampZ(z + Math.cos(a) * (r + 0.4)), Math.min(0.35, (t1 - f.t) * 0.5), { easing: 'out' });
  swingAt(f, 'Sword_Heavy_Combo', t1, 0.62, 0.38, 0.75);
  area(f, { shape: 'circle', x, z, w: r, kind: 'white', start: f.t, end: t1, damage: o.damage ?? 1, melee: true, onImpact: () => { set().sound.play('cardboard', x, { rate: 0.7, gain: 0.65 }); f.fx.dust(x, z, 10); f.cam.shake(0.25, 0.1); } });
}
// the Defendant's gavel: the bench's circle, then a ring of cereal rolling out
export function gavel(f, t1, o = {}) {
  const b = boss(f), from = { x: T1.x, z: T1.z + 0.8 };
  swingAt(f, 'Sword_Attack', t1, 0.55, 0.1, 0.8);
  area(f, { shape: 'circle', x: from.x, z: from.z, w: 1.6, kind: 'white', start: f.t, end: t1, sound: false });
  const born = f.t, sup = !!f.suppress;
  f.at(t1, () => {
    if (set().quashed(born, sup)) return;   // the spotlight took it back: no knock, no wave
    set().sound.play('gavel', from.x);
    f.pat.wave(f, { from: { x: T1.x, z: T1.z }, speed: 8.3, band: 0.55, max: 12, kind: 'white' });
    set().cerealRing(f, T1.x, T1.z, 8.3, 12);
    f.cam.shake(0.3, 0.12);
  });
}
// a leap and a stomp on YOU (the heels; "your dad"), with an echo ring half a beat later
export function stomp(f, t1, o = {}) {
  const b = boss(f), pl = f.player, x = pl.x, z = pl.z, r = o.r ?? 1.8;
  faceYou(f);
  const dur = t1 - f.t;
  b.perform('NinjaJump_Start', { duration: dur * 0.45, from: 0.1, to: 1, then: 'NinjaJump_Idle_Loop' });
  b.moveTo(clampX(x + 0.01), clampZ(z - 0.01), Math.max(0.1, dur * 0.92), { easing: 'inOut' });
  f.at(t1 - 0.06, () => b.perform('NinjaJump_Land', { duration: 0.35, from: 0.1, to: 0.9 }));
  area(f, { shape: 'circle', x, z, w: r, kind: 'white', start: f.t, end: t1, melee: true, onImpact: () => { set().sound.play('thok', x, { rate: 0.7 }); f.fx.dust(x, z, 12); f.cam.shake(0.3, 0.1); set().crater(f, x, z); } });
  if (o.echo) {
    const t2 = t1 + 0.5 * f.beat;
    f.at(t1, () => area(f, { shape: 'ring', x, z, w: 3.2, param: 1.4, kind: 'white', start: t1, end: t2, onImpact: () => set().sound.play('thok', x, { rate: 0.55, gain: 0.6 }) }));
  }
  // she backs off after
  f.at(t1 + 0.25, () => { const a = toward(f.player, b); b.moveTo(clampX(b.x + Math.sin(a) * 2.2), clampZ(b.z + Math.cos(a) * 2.2), 0.3); });
}
// the studio camera's 16:9 frame on YOU, following until it locks, the shutter on t1
export function frame(f, tLock, t1) {
  const pl = f.player; let lx = pl.x, lz = pl.z;
  const follow = () => { if (f.t < tLock) { lx = Math.max(-7, Math.min(7, pl.x)); lz = Math.max(-4.7, Math.min(4.75, pl.z)); } return { x: lx, z: lz - 2.25 }; };
  area(f, { shape: 'rect', x: lx, z: lz - 2.25, angle: 0, w: 4, h: 4.5, kind: 'white', start: f.t, end: t1, follow, onImpact: () => { set().sound.play('shutter', lx); f.fx.flash(new THREE.Color(0.35, 0.35, 0.38), 1); } });
  set().cameraPan(f, () => ({ x: lx, z: lz }), t1);
  set().sound.play('servo', 11);
}
// a full-width lane at YOU's z (following until tLock), landing at t1
export function laneAcross(f, tLock, t1, o = {}) {
  const pl = f.player; let lz = clampZ(pl.z + (o.dz ?? 0));
  const follow = () => { if (f.t < tLock) lz = clampZ(pl.z + (o.dz ?? 0)); return { x: -11.6, z: lz }; };
  return area(f, { shape: 'rect', x: -11.6, z: lz, angle: Math.PI / 2, w: o.w ?? 1.0, h: 23.2, kind: o.kind || 'white', start: f.t, end: t1, follow, onImpact: o.onImpact, damage: o.damage });
}
// a lob onto YOU (a free sample in a high arc): catch it as it lands and it goes back to her gold
export function lobAt(f, o) {
  const b = boss(f);
  return f.pat.lob(f, { from: o.from || { x: b.x, z: b.z }, fromY: o.fromY ?? 1.8, at: o.at, end: o.end, r: o.r ?? 1.1, shape: o.shape || 'ring', size: o.size ?? 0.55, kind: o.kind || 'pink', back: o.back ?? 18, peak: o.peak, mesh: o.mesh, damage: o.damage, onCaught: o.onCaught, onLand: o.onLand });
}

// ---------------------------------------------------------------- the Mourner's flash: the white wash and its gold shadows
// the wash fills from `t0` to `t1` (the flash point is her toy camera); shadows of the cover pieces and her own body
export function selfie(f, t0, t1, o = {}) {
  const S = set(), b = boss(f);
  const camAt = () => { const a = b.facing; return { x: b.x + Math.sin(a) * 1.0, z: b.z + Math.cos(a) * 1.0, y: 2.4 }; };
  // the bot and the floor both read it: a live telegraph over YOU when you're in the light
  const pl = f.player;
  const g = liveTele(f, { shape: 'circle', x: pl.x, z: pl.z, w: 0.75, kind: 'white', fill: (t) => (t - t0) / (t1 - t0), follow: () => ({ x: pl.x, z: pl.z }) });
  if (g.dead) return;   // posed in the spotlight: no flash
  S.wash(f, t0, t1, camAt);
  const vis = () => !S.inShadow(f, pl.x, pl.z, camAt());
  // hide the marker while you're in a shadow
  const base = g.follow; g.follow = () => { const p = base(); g.x = vis() ? p.x : 999; return { x: vis() ? p.x : 999, z: p.z }; };
  for (const tp of o.pops || []) f.at(tp, () => { if (g.dead) return; S.sound.play('tick', b.x); S.strobe(f, 0.25); });
  f.at(t1, () => {
    if (g.dead) return;   // the spotlight took it back (the wash went with it)
    g.land && g.land(t1); g.dead = true;
    // the flash point stays where it went off (she turns away after; her shadows mustn't swing in the fade)
    if (S.washSpan) { const L = camAt(); S.washSpan.camAt = () => L; }
    S.sound.play('pop', b.x); S.strobe(f, 0.4);
    const hit = strikeIf(f, vis(), { kind: 'white' });
    if (hit === 'hit') S.polaroid(f);
  });
}

// ---------------------------------------------------------------- the script
export function script(T, f, track) {
  TR = track;
  const bt = (t1, n) => T.beats.timeOf(T.beats.beatAt(t1) - n);      // n beats before t1
  const at = (t, fn) => T.at({ s: t }, fn);
  const hit = (t1, n, fn) => at(bt(t1, n), (ff) => fn(ff, t1));
  // every cut: the mark a beat ahead (laid by the set from CUTS), the cut on its beat
  for (const c of CUTS) {
    const [t, costume, x, z, o = {}] = c;
    if (o.entrance) continue;
    if (!o.nomark) at(bt(t, 1), (ff) => set().layMark(ff, x));
    at(t, (ff) => set().cut(ff, costume, x, z, o));
  }

  // ================= S1 · COMMERCIAL (0.00 -> 16.61)
  // the lights bank on, back to front; the box opens, tips and pours
  for (const t of [1.05, 1.38, 1.73, 2.07]) at(t, () => set().sound.play('chunk', 0, { gain: 0.9 }));
  // SNAP, CRACKLE, POP: three giant frosted loops lobbed from the box's mouth, each at YOU, all landing on 6.57
  for (const t of [4.94, 5.48, 5.92]) at(t, (ff) => { set().sound.play('popc', 0, { rate: 0.7 }); lobAt(ff, { from: { x: 0, z: -8 }, fromY: 11, end: 6.57, r: 1.1, shape: 'ring', size: 0.7, back: 18, peak: 3 }); });
  at(6.57, (ff) => set().entrance(ff));
  at(6.92, (ff) => { freeze(ff, 1); expr('grin'); });
  at(7.27, (ff) => { const b = boss(ff); b.perform('NinjaJump_Land', { duration: 0.42, from: 0.05, to: 0.95 }); b.moveTo(0, -3, 0.34, { easing: 'out' }); });
  // THE STARBURST: product hold, eight rays filling for five beats, flashing full in the stop, fire on 10.04
  at(8.31, (ff) => { const b = boss(ff); b.perform('Spell_Simple_Enter', { duration: 0.5, then: 'Spell_Simple_Idle_Loop' }); pr().show('mini', true); expr('wink'); starburst(ff, 10.04); });
  at(10.04, (ff) => { pr().show('mini', false); boss(ff).perform('Spell_Simple_Shoot', { duration: 0.4 }); expr('grin'); });
  // FREE SAMPLES: 2 then 3 cards, arriving on 11.42 and 11.77
  at(10.72, (ff) => { swingAt(ff, 'OverhandThrow', 10.95, 0.5, 0.2, 0.8); fanAt(ff, { n: 2, arc: 30, arrive: 11.42, shape: 'card', kind: 'pink' }); });
  at(11.07, (ff) => { swingAt(ff, 'OverhandThrow', 11.3, 0.5, 0.2, 0.8); fanAt(ff, { n: 3, arc: 40, arrive: 11.77, shape: 'card', kind: 'pink' }); });
  // (to behind where her bench comes up at 12.46, where the cut at 13.48 stands her: at -4.4 it rose round her)
  at(11.77, (ff) => { const b = boss(ff); b.moveTo(0, -5.3, 0.6, { easing: 'inOut' }); });
  // ORDER IN THE COURT: she lifts the gavel in the stop; the gavel on 14.14, a ring of cereal rolling out
  at(13.82, (ff) => gavel(ff, 14.14));
  at(14.14, (ff) => { expr('ow'); setTimeout(() => {}, 0); });
  at(15.22, (ff) => { expr('smug'); boss(ff).perform('Idle_No_Loop', { duration: 1.2 }); });

  // ================= S2 · FUNERAL (16.61 -> 37.38)
  // THE WREATH bowled along the floor on its edge, arriving on 19.38
  at(17.99, (ff) => { swingAt(ff, 'OverhandThrow', 18.25, 0.5, 0.2, 0.85); fanAt(ff, { n: 1, arc: 0, arrive: 19.38, shape: 'ring', size: 0.62, kind: 'pink', y: 0.7, spin: 9 }); });
  // SELFIE-STICK SWINGS on "wore", "nothing", "underneath"
  at(19.73, (ff) => { dashToward(ff, 2.0, 0.3); });
  hit(20.42, 2, (ff, t1) => swing(ff, t1, { i: 0 }));
  hit(20.76, 1, (ff, t1) => swing(ff, t1, { i: 1 }));
  hit(21.11, 1, (ff, t1) => swing(ff, t1, { i: 2 }));
  // POSE AND FLASH: a white cone at YOU from her camera; get behind her
  at(21.45, (ff) => {
    const b = boss(ff); faceYou(ff); b.perform('Spell_Simple_Enter', { duration: 0.6, then: 'Spell_Simple_Idle_Loop' }); expr('smug');
    area(ff, { shape: 'cone', x: b.x, z: b.z, angle: toward(b, ff.player), w: 6, param: 40 * D2R, kind: 'white', start: ff.t, end: 22.14, onImpact: () => { set().sound.play('pop', b.x); set().strobe(ff, 0.4); } });
    set().sound.play('charge', b.x, { rate: 3.6 });
  });
  at(22.14, (ff) => { freeze(ff, 4, true); });
  // THE HEARSE: a lane across the arena at YOU's z (locks 25.61); a toy hearse drives through, crossing x 0 on 26.30
  at(24.92, (ff) => set().hearse(ff, 25.61, 26.30));
  // HEELS ON THE FLOOR: two leaping stomps, landing 29.07 and 30.45
  hit(29.07, 2, (ff, t1) => stomp(ff, t1));
  hit(30.45, 2, (ff, t1) => stomp(ff, t1));
  // B-BEST SELFIE: the wash with gold shadows behind the casket, the bar, the heaps and her; the flash on "best"
  at(33.22, (ff) => { const b = boss(ff); b.faceNow(0, 2); b.lockFacing = true; b.perform('Spell_Simple_Enter', { duration: 0.6, then: 'Spell_Simple_Idle_Loop' }); expr('smug'); selfie(ff, 33.22, 35.99, { pops: [35.30, 35.64] }); });
  at(35.99, (ff) => { freeze(ff, 3, true); boss(ff).lockFacing = false; });
  at(36.34, (ff) => { expr('laugh'); });

  if (track.scriptMore) track.scriptMore(T, f, { at, hit, bt });
  scriptRest(T, f, { at, hit, bt });
}

// sections S3..S12
function scriptRest(T, f, { at, hit, bt }) {
  const S = () => set();
  const holdOpen = (ff, beats) => { boss(ff).open(beats * ff.beat); toLens(ff, beats * ff.beat); };

  // ================= S3 · LIVESTREAM (37.38 -> 58.16)
  at(37.38, () => { pr().show('phone', true); pr().show('spoon', false); });
  // a kiss for the new subscriber, floating, homing gently, arriving about 39.46
  at(38.06, (ff) => { swingAt(ff, 'OverhandThrow', 38.3, 0.5, 0.2, 0.8); fanAt(ff, { n: 1, arrive: 39.46, shape: 'kiss', size: 0.55, kind: 'pink', homing: 1.0, life: 4 }); S().sound.play('bubble', boss(ff).x); });
  // DING DING DING DING: four hearts from her phone, each arriving four beats after its ding
  [[41.53, 42.91], [41.88, 43.26], [42.22, 43.61], [42.57, 43.95]].forEach(([t, t1]) => at(t, (ff) => { fanAt(ff, { n: 1, arrive: t1, shape: 'heart', size: 0.48, kind: 'pink', homing: 1.5, life: 4 }); S().sound.play('bubble', boss(ff).x, { rate: 1.2 }); }));
  // SWIPE UP: a bar the full width rises at the front edge and sweeps to the back on "monetize", one gap
  at(44.30, (ff) => S().swipe(ff, 44.30, 44.99, 45.69));
  at(45.69, (ff) => { pr().show('phone', false); boss(ff).perform('Interact', { duration: 2.2 }); holdOpen(ff, 6); });
  // FILMING IN 4K: the studio camera's frame on YOU, locked at 49.15, the shutter on 49.50
  at(48.11, (ff) => frame(ff, 49.15, 49.50));
  // CAPTIONED: a chyron hangs over YOU's lane, locks 52.27, holds in the stop, slams on 52.95
  at(51.23, (ff) => S().caption(ff, 52.27, 52.95));
  // the spoon string: two pink swings, the slam, a freeze-frame
  at(53.64, (ff) => { pr().show('spoon', true); pr().show('phone', false); dashToward(ff, 2.0, 0.3); expr('grin'); });
  hit(54.35, 2, (ff, t1) => swing(ff, t1, { i: 0 }));
  hit(54.69, 1, (ff, t1) => swing(ff, t1, { i: 1 }));
  hit(55.39, 2, (ff, t1) => slam(ff, t1));
  at(55.39, (ff) => freeze(ff, 1));
  at(56.08, (ff) => { swingAt(ff, 'OverhandThrow', 56.3, 0.5, 0.2, 0.8); fanAt(ff, { n: 3, arc: 40, arrive: 56.77, kind: 'pink' }); });
  at(56.77, (ff) => { swingAt(ff, 'OverhandThrow', 57.0, 0.5, 0.2, 0.8); fanAt(ff, { n: 3, arc: 40, arrive: 57.46, kind: 'pink' }); });

  // ================= S4 · COFFEE / EULOGY / PRESCRIPTION PARTY (58.16 -> 80.32)
  at(59.19, (ff) => { const b = boss(ff); b.perform('Interact', { duration: 0.6 }); S().sound.play('slosh', 5, { rate: 1.4 }); S().sound.play('clack', 5); });
  // THE QUIET: she strolls to her spot; the match in the dead-silent beat; the gingham catches square by square
  at(59.54, (ff) => { const b = boss(ff); b.moveTo(-3, -2, 1.5, { easing: 'inOut' }); expr('smug'); });
  at(FIRE.strike, (ff) => { pr().show('phone', false); pr().show('match', true); pr().props.match.children[0].userData.flame.visible = true; S().sound.play('match', boss(ff).x); boss(ff).perform('Interact', { duration: 0.5 }); });
  at(FIRE.drop, (ff) => {
    pr().props.match.visible = false; S().sound.play('crackle', -3); S().sound.play('whoomph', -3, { gain: 0.35, rate: 1.5 });
    const pl = ff.player, pud = PUDDLE, inPud = () => Math.hypot(pl.x - pud.x, pl.z - pud.z) < pud.r - 0.1;
    const g = liveTele(ff, { shape: 'circle', x: pl.x, z: pl.z, w: 0.8, kind: 'white', fill: (t) => (t - FIRE.drop) / (FIRE.ignite - FIRE.drop), follow: () => ({ x: inPud() ? 999 : pl.x, z: pl.z }) });
    ff.at(FIRE.ignite, () => { g.land && g.land(FIRE.ignite); S().sound.play('whoomph', 0, { gain: 1.0 }); ff.cam.shake(0.5, 0.2); ff.fx.flash(new THREE.Color(0.4, 0.2, 0.07), 1); strikeIf(ff, !inPud(), { damage: 2 }); });
  });
  at(62.65, (ff) => { const b = boss(ff); const a = toward(b, ff.player); b.moveTo(clampX(b.x + Math.sin(a) * 2.5), clampZ(b.z + Math.cos(a) * 2.5), 1.0, { easing: 'inOut' }); expr('laugh'); });
  // THE EULOGY: fans of five pills from the lectern, the middle one pink
  for (const t of [64.73, 65.43, 66.11]) at(t, (ff) => { swingAt(ff, 'OverhandThrow', t + 0.2, 0.5, 0.2, 0.85); fanAt(ff, { from: { x: T1.x, z: T1.z + 0.6 }, n: 5, arc: 50, speed: 8, shape: 'pill', size: 0.42, kind: (i) => (i === 2 ? 'pink' : 'white') }); S().sound.play('bubble', 0, { rate: 0.6 }); });
  // "said you died doing what you loved... haven't said what yet": she rears back on "loved", the slam on "yet"
  at(67.85, (ff) => {
    const pl = ff.player; let lx = pl.x, lz = pl.z;
    area(ff, { shape: 'circle', x: lx, z: lz, w: 2.4, kind: 'white', start: ff.t, end: 69.93, melee: true, follow: () => { if (ff.t < 69.23) { lx = pl.x; lz = pl.z; } return { x: lx, z: lz }; },
      onImpact: () => { S().sound.play('cardboard', lx, { rate: 0.6, gain: 1.1 }); S().sound.play('pop', lx); S().strobe(ff, 0.4); ff.cam.shake(0.35, 0.12); } });
  });
  at(68.55, (ff) => { const b = boss(ff); b.perform('Sword_Heavy_Combo', { from: 0.0, to: 0.3, duration: 0.5, then: null }); ff.after(0.5, () => { pr().fig.rig.timeScale = 0; }); });
  at(69.75, (ff) => { const b = boss(ff); pr().fig.rig.timeScale = 1; const pl = ff.player; b.moveTo(clampX(pl.x + 1.2), clampZ(pl.z - 1.2), 0.16, { easing: 'in' }); swingAt(ff, 'Sword_Heavy_Combo', 69.93, 0.62, 0.38, 0.75); });
  at(69.93, (ff) => freeze(ff, 2));
  // spoon slams; charm rings; her nails
  hit(71.31, 2, (ff, t1) => slam(ff, t1));
  hit(72.01, 2, (ff, t1) => slam(ff, t1));
  at(73.39, (ff) => { boss(ff).perform('Spell_Simple_Shoot', { duration: 0.5 }); ringOf(ff, { n: 10, speed: 7, rot: 0 }); });
  at(74.77, (ff) => { boss(ff).perform('Spell_Simple_Shoot', { duration: 0.5 }); ringOf(ff, { n: 10, speed: 7, rot: Math.PI / 10 }); });
  at(75.46, (ff) => { boss(ff).perform('Interact', { duration: 1.4 }); holdOpen(ff, 4); expr('smug'); });
  // the toy ambulance parks at the front; its beacon flashes the arena in halves
  at(77.55, (ff) => S().ambulance(ff, 77.55, 80.32));
  [[78.24, 78.93, -1], [78.93, 79.28, 1], [79.28, 79.62, -1], [79.62, 79.97, 1]].forEach(([t0, t1, s]) => at(t0, (ff) => {
    area(ff, { shape: 'rect', x: s < 0 ? -5.75 : 5.5, z: -7.2, angle: 0, w: s < 0 ? 5.75 : 5.5, h: 14.4, kind: 'white', start: ff.t, end: t1, onImpact: () => { S().sound.play('pip', s * 9); S().beacon(ff, s); } });
  }));

  // ================= S5 · LOCKER / ALPHABET (80.32 -> 93.47, then DARK A)
  at(80.67, (ff) => { swingAt(ff, 'OverhandThrow', 80.9, 0.5, 0.2, 0.85); fanAt(ff, { n: 1, arrive: 82.05, shape: 'heart', size: 0.6, kind: 'pink', homing: 0.6, life: 4 }); S().sound.play('tape', boss(ff).x, { rate: 0.6 }); });
  [82.72, 83.43, 84.12].forEach((t, k) => at(t, (ff) => { swingAt(ff, 'OverhandThrow', t + 0.18, 0.5, 0.2, 0.85); fanAt(ff, { n: 5, arc: 50, speed: 12, shape: 'star', size: 0.4, kind: 'white', offset: (k % 2 ? 1 : -1) * 6.25 * D2R }); S().sound.play('tape', boss(ff).x, { rate: 1.5 }); }));
  // R-I-P, I-G, F-M-L, O-M-G: toasted letters out of the milk, one per spoken letter, each word in its lane
  at(bt(86.15, 2), (ff) => S().alphabet(ff, [
    { lock: 86.15, letters: [['R', 86.50], ['I', 86.74], ['P', 86.86]] },
    { lock: 86.73, letters: [['I', 87.08], ['G', 87.46]] },
    { lock: 87.43, letters: [['F', 87.78], ['M', 88.08], ['L', 88.24]] },
    { lock: 88.19, letters: [['O', 88.54], ['M', 88.74], ['G', 88.94]] },
  ]));
  for (const t of [86.50, 86.74, 86.86, 87.08, 87.46, 87.78, 88.08, 88.24, 88.54, 88.74, 88.94]) at(t, (ff) => boss(ff).perform('Spell_Simple_Shoot', { duration: 0.3 }));
  at(90.01, (ff) => { const b = boss(ff); b.moveTo(-6.0, -2.5, 0.25); expr('wink'); b.perform('Spell_Simple_Enter', { duration: 0.4, then: 'Spell_Simple_Idle_Loop' }); });
  hit(91.39, 4, (ff, t1) => starburst(ff, t1));
  hit(92.44, 2, (ff, t1) => slam(ff, t1));
  at(92.78, (ff) => freeze(ff, 2));

  // ================= S6 · MORGUE (103.52 -> 113.56, then DARK B)
  at(103.95, () => pr().show('mini', false));
  [104.21, 104.90].forEach((t, k) => at(t, (ff) => { swingAt(ff, 'OverhandThrow', t + 0.18, 0.5, 0.2, 0.85); fanAt(ff, { n: 6, arc: 80, speed: 10, shape: 'card', size: 0.4, kind: 'white', offset: k ? 8 * D2R : 0 }); S().sound.play('tape', boss(ff).x, { rate: 1.3 }); }));
  // THE RING LIGHT: thrown down a lane like YOU throws her rings, hangs a beat, comes back
  at(104.90, (ff) => S().ringLight(ff, 105.25, 105.94, 106.63));
  at(106.28, (ff) => S().ringLight(ff, 106.63, 107.32, 108.01));
  // MAIL-IN PRIZES: two parcels per drop, one on YOU, one where YOU is heading
  for (const t of [108.70, 109.40, 110.09]) hit(t, 2, (ff, t1) => { swingAt(ff, 'OverhandThrow', ff.t + 0.2, 0.5, 0.2, 0.85); S().dropParcels(ff, t1); });
  at(110.79, (ff) => { pr().show('phone', true); pr().show('spoon', false); boss(ff).loop('Idle_TalkingPhone_Loop'); holdOpen(ff, 8); expr('wink'); });

  // ================= S7 · CEREAL, her own chorus (126.03 -> 138.49, then DARK C)
  at(126.03, (ff) => { const b = boss(ff); b.perform('Consume', { duration: 1.0, then: 'Dance_Loop' }); expr('wink'); });
  at(127.2, (ff) => { boss(ff).loop('Dance_Loop'); expr('grin'); });
  for (const [t1, lock] of [[128.45, 127.76], [129.83, 129.14], [131.22, 130.53]]) at(bt(lock, 2), (ff) => S().pour(ff, { x: 0, z: -7.0 }, lock, t1));
  at(130.87, (ff) => { swingAt(ff, 'OverhandThrow', 131.05, 0.5, 0.2, 0.85); fanAt(ff, { n: 3, arc: 40, speed: 9, kind: 'pink', shape: 'card' }); });
  at(131.57, (ff) => { swingAt(ff, 'OverhandThrow', 131.75, 0.5, 0.2, 0.85); fanAt(ff, { n: 3, arc: 40, speed: 9, kind: 'pink', shape: 'card' }); });
  at(132.95, (ff) => { dashToward(ff, 2.0, 0.3); expr('grin'); });
  hit(133.99, 2, (ff, t1) => swing(ff, t1, { i: 0 }));
  hit(134.34, 1, (ff, t1) => swing(ff, t1, { i: 1 }));
  hit(135.38, 1, (ff, t1) => swing(ff, t1, { i: 2 }));
  hit(136.07, 2, (ff, t1) => slam(ff, t1));
  at(136.41, (ff) => { const b = boss(ff); pr().show('check', true); b.perform('Shield_OneShot', { duration: 1.4, then: 'Idle_Talking_Loop' }); expr('wink'); holdOpen(ff, 6); });
  at(137.9, () => pr().show('check', false));

  // ================= S8 · DAD / OVERDOSE (152.34 -> 175.24)
  for (const [t1, lock] of [[153.37, 152.69], [154.06, 153.37], [155.11, 154.41]]) at(lock, (ff) => stomp(ff, t1, { echo: true }));
  at(155.11, (ff) => holdOpen(ff, 2));
  at(155.11, (ff) => frame(ff, 155.46, 156.15));
  at(156.15, (ff) => frame(ff, 156.50, 157.17));
  // CATCHING THE CREST: the bowl overflows; a wave of milk rolls left to right with one dip in its crest
  at(158.56, (ff) => S().crest(ff, 158.56));
  at(161.70, (ff) => { holdOpen(ff, 5); boss(ff).loop('Dance_Loop'); });
  // O-O-O: three O's lobbed onto YOU; the commercial pauses ("looking so serene"); they land when it plays
  [163.43, 163.77, 164.12].forEach((t) => at(t, (ff) => { swingAt(ff, 'OverhandThrow', t + 0.15, 0.5, 0.2, 0.85); S().frozenLob(ff, t, 164.81, FREEZE[1]); }));
  at(FREEZE[0], (ff) => S().pause(ff, true));
  at(FREEZE[1], (ff) => S().pause(ff, false));
  hit(167.23, 2, (ff, t1) => slam(ff, t1));
  hit(168.28, 2, (ff, t1) => slam(ff, t1));
  // FOAM: eight pink bubbles out of the bowl, a gift
  for (const t of [169.32, 169.67, 170.02, 170.37]) at(t, (ff) => S().bubbles(ff, 2));
  at(169.32, (ff) => { boss(ff).loop('Dance_Loop'); holdOpen(ff, 8); });
  // COUNT YOUR PULSE: two lub-dubs to 7 m
  at(172.45, (ff) => { const b = boss(ff); area(ff, { shape: 'ring', x: b.x, z: b.z, w: 7, param: 0.12, kind: 'white', start: ff.t, end: 174.6, sound: false, follow: () => ({ x: b.x, z: b.z }) }); });
  for (const t of [173.13, 173.49, 173.84, 174.19]) at(t, (ff) => { const b = boss(ff); ff.pat.wave(ff, { from: { x: b.x, z: b.z }, speed: 9, band: 0.5, max: 7, kind: 'white' }); S().sound.play('heart', b.x); });

  // ================= S9 · COURTHOUSE (175.24 -> 188.48, then DARK D)
  hit(176.63, 2, (ff, t1) => gavel(ff, t1));
  // (over her bench, 1.42 m tall, with a real jump: she went straight through it)
  at(176.63, (ff) => { boss(ff).moveTo(0, -2.8, 0.45, { easing: 'out', arc: 1.75 }); expr('ow'); ff.after(0.2, () => expr('smug')); });
  // SKIRT TOO SHORT FOR THE COURTHOUSE: the pews slide in from x +-7 to +-3.5
  at(bt(179.06, 4), (ff) => { for (const s of [-1, 1]) area(ff, { shape: 'rect', x: s * 5.25, z: -4.0, angle: 0, w: 2.25, h: 6.0, kind: 'white', start: ff.t, end: 179.06, onImpact: () => { S().sound.play('cardboard', s * 5, { rate: 0.5, gain: 1.2 }); ff.cam.shake(0.3, 0.12); } }); });
  at(179.06, (ff) => { const b = boss(ff); b.idle = 'Walk_Formal_Loop'; b.moveTo(0, clampZ(Math.min(ff.player.z - 2, 3)), 1.6, { easing: 'linear' }); b.loop('Walk_Formal_Loop'); });
  at(180.6, (ff) => { boss(ff).idle = 'Idle_FoldArms_Loop'; });
  hit(182.22, 2, (ff, t1) => gavel(ff, t1));
  at(182.56, (ff) => { S().sound.play('gavel', 0, { rate: 1.1 }); ff.pat.wave(ff, { from: { x: T1.x, z: T1.z }, speed: 8.3, band: 0.55, max: 12, kind: 'white' }); S().cerealRing(ff, T1.x, T1.z, 8.3, 12); });
  at(183.26, (ff) => S().key(ff, 183.26, 184.66, 185.70));
  for (const t of [186.40, 187.10, 187.45]) at(t, (ff) => { pr().ripple(0xff5a7a, 1.4); S().sound.play('guilty', 0, { rate: 1.5, gain: 0.8 }); });
  at(187.80, (ff) => { S().sound.play('guilty', 0); expr('ow'); ff.after(0.15, () => expr('smug')); });

  // ================= S10 · BATHROOM FLOOR -> THE BRIDGE (211.55 -> 233.39, then DARK E)
  at(211.55, (ff) => { S().sound.play('pour', 0, { rate: 2.4, gain: 0.8 }); S().sound.play('tape', 0, { rate: 0.4, gain: 1.4 }); const b = boss(ff); b.walkClip = b.runClip = 'Slide_Loop'; });
  at(211.9, (ff) => { const b = boss(ff); b.perform('Slide_Start', { duration: 0.3, then: 'Slide_Loop' }); b.moveTo(2.5, -3.5, 0.6); });
  at(212.25, (ff) => S().tilePops(ff, [[212.25, 212.95, 0], [212.95, 213.63, 1], [213.63, 214.34, 0], [214.34, 215.06, 1]]));
  at(216.11, (ff) => { boss(ff).perform('Spell_Simple_Shoot', { duration: 0.5 }); ringOf(ff, { n: 10, speed: 7 }); });
  at(216.81, (ff) => S().bomb(ff, 216.81, 217.86, 218.57, 219.27));
  for (const t of [220.33, 220.68, 221.02]) at(bt(t, 2), (ff) => { S().dart(ff, bt(t, 1), t); boss(ff).perform('OverhandThrow', { duration: 0.4, from: 0.3, to: 0.9 }); });
  at(221.37, (ff) => { S().disarm(ff); holdOpen(ff, 6); expr('ow'); ff.after(0.2, () => expr('grin')); });
  // THE BRIDGE: the camera eases in; she sits on a heap
  at(225.98, (ff) => { pr().show('phone', false); pr().show('match', true); pr().props.match.children[0].userData.flame.visible = true; S().sound.play('match', boss(ff).x); });
  at(226.33, (ff) => { for (const dz of [0, 3.4]) laneAcross(ff, 227.39, 228.81, { w: 0.8, dz, onImpact: () => {} }); S().fireLanes(ff, 227.39, 228.10, 228.81); });
  at(228.10, (ff) => { pr().props.match.visible = false; S().sound.play('whoomph', -6, { rate: 1.6, gain: 0.5 }); });
  at(228.81, (ff) => S().sound.play('whoomph', 0, { gain: 0.8 }));
  at(229.16, (ff) => { boss(ff).perform('Interact', { duration: 2.0 }); holdOpen(ff, 6); });
  // THE MOURNING BOUQUET: over her shoulder, landing on YOU on "bouquet"
  at(231.29, (ff) => { const b = boss(ff); b.faceNow(b.x, b.z - 4); b.lockFacing = true; swingAt(ff, 'OverhandThrow', 231.6, 0.5, 0.2, 0.85); S().sound.play('tape', b.x, { rate: 0.5 }); });
  at(231.64, (ff) => { lobAt(ff, { end: 232.34, r: 1.1, shape: 'petal', size: 0.65, back: 40, peak: 5, onCaught: () => ff.after(0.36, () => { S().petals(ff); boss(ff).perform('Hit_Knockback', { duration: 0.6 }); }) }); boss(ff).lockFacing = false; });

  // ================= S11 · RIGHTS / RIGOR / CRUSH / SWEETHEART / ALWAYS RIGHT (247.67 -> 271.90)
  hit(248.76, 2, (ff, t1) => gavel(ff, t1));
  for (const t of [250.89, 251.62, 252.34]) at(t, (ff) => { swingAt(ff, 'OverhandThrow', t + 0.18, 0.5, 0.2, 0.85); fanAt(ff, { n: 5, arc: 70, speed: 8, shape: 'card', size: 0.42, kind: (i) => (i === 2 ? 'pink' : 'white') }); S().sound.play('tape', 0, { rate: 1.8 }); });
  at(253.06, (ff) => S().frost(ff, 253.06, 253.77));
  at(254.49, (ff) => S().frost(ff, 254.49, 255.21));
  at(255.57, (ff) => { const b = boss(ff); b.faceNow(0, 3); b.lockFacing = true; b.perform('Spell_Simple_Enter', { duration: 0.6, then: 'Spell_Simple_Idle_Loop' }); expr('smug'); selfie(ff, 255.57, 257.01, { pops: [256.30, 256.66] }); });
  at(257.01, (ff) => { freeze(ff, 4, true); boss(ff).lockFacing = false; });
  for (const [t1, lock] of [[259.53, 258.81], [260.98, 260.25], [261.70, 260.98], [262.06, 261.34]]) at(lock, (ff) => slam(ff, t1, { r: 2.0 }));
  hit(264.96, 4, (ff, t1) => { starburst(ff, t1); boss(ff).perform('Spell_Simple_Enter', { duration: 0.5, then: 'Spell_Simple_Idle_Loop' }); expr('wink'); });
  at(264.96, (ff) => starburst(ff, 265.33, { rot: Math.PI / 8, start: 264.96 }));
  [[266.36, 267.03], [266.69, 267.37], [267.03, 267.72], [267.37, 268.08]].forEach(([t, t1]) => at(t, (ff) => { fanAt(ff, { n: 1, arrive: t1, shape: 'heart', size: 0.5, kind: 'pink', homing: 2.0, life: 3 }); S().sound.play('bubble', boss(ff).x, { rate: 0.9 }); }));
  at(269.47, (ff) => gavel(ff, 271.21));

  // ================= S12 · EVERY CEREAL AT ONCE (271.90 -> 282.92, then DARK F)
  // (not before the checkpoint: every encore and every rewind into the final chorus must get all three)
  [[272.57, -6.0], [272.90, 6.5], [273.22, 0]].forEach(([t1, x]) => at(Math.max(271.9, bt(t1, 3)), (ff) => S().pour(ff, { x, z: -7.0 }, Math.max(271.9, bt(t1, 2)), t1)));
  at(273.22, (ff) => { for (let k = 0; k < 4; k++) ff.after(k * 0.33, () => pr().ripple(0xff5a7a, 1.0)); });
  hit(274.61, 2, (ff, t1) => gavel(ff, t1));
  at(274.94, (ff) => { swingAt(ff, 'OverhandThrow', 275.1, 0.5, 0.2, 0.85); fanAt(ff, { n: 1, arrive: 275.60, shape: 'ring', size: 0.6, kind: 'pink', spin: 12 }); });
  at(275.96, (ff) => { const b = boss(ff); b.faceNow(0, 3); b.lockFacing = true; b.perform('Spell_Simple_Enter', { duration: 0.6, then: 'Spell_Simple_Idle_Loop' }); selfie(ff, 275.96, 277.70, { pops: [277.03, 277.36] }); });
  at(277.70, (ff) => { freeze(ff, 1, true); boss(ff).lockFacing = false; });
  for (const [t1, lock] of [[278.71, 278.04], [279.07, 278.37], [279.44, 278.71]]) at(lock, (ff) => stomp(ff, t1, { echo: true, r: 1.8 }));
  [[280.11, 280.80], [280.45, 281.14], [280.80, 281.47]].forEach(([t, t1]) => at(t, (ff) => lobAt(ff, { end: t1, r: 1.1, shape: 'ring', size: 0.6, back: 22, peak: 2.6 })));
  at(280.11, (ff) => starburst(ff, 281.47));
  at(281.82, (ff) => { const b = boss(ff); b.moveTo(0, -2.5, 0.2); b.perform('Spell_Simple_Enter', { duration: 0.4, then: 'Spell_Simple_Idle_Loop' }); pr().show('mini', true); expr('wink'); holdOpen(ff, 3.5); });
  at(282.19, (ff) => { pr().fig.pop = 1.2; });
}
