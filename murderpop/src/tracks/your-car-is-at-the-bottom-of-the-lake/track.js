// A2 · YOUR CAR IS AT THE BOTTOM OF THE LAKE · THE PROBLEM SOLVER.
// The rule: when the band stops, get next to her. She's about to change the world, and she never stands where it lands.
// The song stops dead twice; both times she follows the stop with "by the way" and drowns everything round her. The first
// time the only clear floor is the pier, where she is; the second, the eye of the lake coming down, right beside her.
// Everything else she drops lands where you'll be two beats from now, so keep turning.
import * as THREE from 'three';
import { CharacterKit } from '../../engine/character.js';
import { SHAPES } from '../../game/projectiles.js';
import { LAYER } from '../../game/arena.js';
import { S, ARC, useBeats, ramp } from './song.js';
import { PIER, PIER_ANGLE, CAR_S, TRUNK_SPOT, SPOTS, GATE, pierPoint, onPier, floorAt, walkable } from './lake.js';
import { World, defaultPosts } from './world.js';
import { buildSolver, makeBoss, Solver, BEAT, bindSound } from './boss.js';
import { LakeSound } from './sound.js';
import { area, show, keyRing, keyLoop, block, kissRing, Beams, pour, coverShots } from './moves.js';
import { teachBot } from './bot.js';

const ID = 'your-car-is-at-the-bottom-of-the-lake';
const HP = 1650;   // no bullet sponge: the test bot (twice a person's damage) empties her at the first stop, about 42 s
const deg = Math.PI / 180;
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
let kit = null;
let L = null;     // this fight's lake: { world, solver, snd, beams, live, ticks, ... }

// where everyone stands when the record comes back to a section (rewinds, practice)
const SPAWN = [
  { t: 0, you: null, her: SPOTS.porch },
  { t: 13.641, you: { x: 0.0, z: 2.5 }, her: { x: -1.5, z: -1.0 } },
  { t: 25.826, you: { x: -4.0, z: 2.0 }, her: { x: 1.0, z: -2.0 } },
  { t: 41.759, you: pierPoint(3.2, 0), her: { x: -2, z: 0 } },
  { t: 53.099, you: { x: -1.0, z: 2.5 }, her: { x: -1.0, z: -2.0 } },
  { t: 65.148, you: { x: -3.0, z: 2.0 }, her: { x: -2.0, z: -4.4 } },
  { t: 80.992, you: { x: 0.0, z: 1.5 }, her: { x: -1.6, z: 0.5 } },
  { t: 92.313, you: { x: -1.0, z: 3.0 }, her: SPOTS.shaft },
  { t: 101.369, you: { x: 0.0, z: 2.0 }, her: SPOTS.shaft },
];
const sectionIndex = (t) => { let i = 0; for (let k = 0; k < SPAWN.length; k++) if (SPAWN[k].t <= t + 0.05) i = k; return i; };

export default {
  id: ID,
  beats: ID,
  par: 50000,
  lastHit: S.thump,           // the fight's own end: the soft thump in her doorway (the main finish lands at 100.611, below)
  spawn: { player: [pierPoint(3.4, 0.1).x, pierPoint(3.4, 0.1).z, PIER_ANGLE + Math.PI], boss: [SPOTS.porch.x, SPOTS.porch.z, 0] },

  async buildArena(f) {
    useBeats(f.bm);
    f.lakeHz = [];
    const world = new World(f);
    L = { f, world, live: new Set(), ticks: [], songT: 0 };
    await world.build();
    const snd = new LakeSound(f); await snd.load(); L.snd = snd; world.snd = (n, x, o) => snd.play(n, x, o);
    bindSound((n, x, o) => snd.play(n, x, o));
    L.beams = new Beams(f, L);
    return {
      bounds: { minX: -11, maxX: 11, minZ: -7, maxZ: 7 },
      arena: world.arena,
      resolve: (x, z, r) => world.resolve(x, z, r),
      update: (dt, t, ff) => world.update(dt, L.songT),
      strikeArc: (x, z, ang, range, arc, s) => strikeArc(f, x, z, ang, range, arc, s),
      dispose: () => { f.cam.weight = 0.45; f.cam.minDist = f.cam.baseMin; L.beams.dispose(); snd.stopAll(); if (L.solver) L.solver.dispose(); world.dispose(); },
    };
  },

  async buildBoss(f) {
    if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
    const fig = await buildSolver(kit, f);
    const b = makeBoss(fig, f, HP);
    b.arena = { resolve: (x, z, r) => L.world.resolve(x, z, r) };
    const solver = new Solver(f, fig, b);
    L.solver = solver; L.world.solver = solver;
    solver.onSteam = (x, z, k) => steamBurst(f, x, z, k);
    if (L.world.arena) { L.world.arena.addCaster(f.player.root); L.world.arena.addCaster(fig.root); fig.root.traverse((m) => { if (m.isMesh && m.userData.noCaster) { m.castShadow = false; m.layers.disable(5); } }); }
    try { await fig.prepare(f.app.renderer, f.cam.cam, f.scene); } catch (e) { console.warn('lake: prepare', e.message); }
    // caseShake: YOUR cases rattle on the sixteenths before they go off
    L.world.caseShake = (id, t) => { const [a, b2] = id === 0 ? [14.404, 15.951] : [15.951, 16.710]; if (t < a || t > b2) return 0; return Math.sin(f.bm.beatAt(t) * 4 * Math.PI * 2) * (0.5 + 0.5 * (t - a) / (b2 - a)); };
    try { await warm(f, fig); } catch (e) { console.warn('lake: warm-up', e.message); }
    return b;
  },

  script(T, f) {
    const B = (b, n = 1) => T.time(`${b + 1}:${n}`);
    const at = (s, fn) => T.at({ s }, fn);
    const beat = () => f.beat;
    const b = () => f.boss, pl = () => f.player, sv = () => L.solver, snd = () => L.snd;
    T.section('intro and verse 1', { s: 0 }, { s: B(4) });
    T.section('verse 1b', { s: B(4) }, { s: B(8) });
    T.section('the pre and the first stop', { s: B(8) }, { s: B(13, 2) });
    T.section('chorus 1, flooded', { s: B(13, 2) }, { s: B(17) });
    T.section('verse 2, the police', { s: B(17) }, { s: B(21) });
    T.section('verse 2b and the second stop', { s: B(21) }, { s: B(26, 2) }, { close: true });
    T.section('chorus 2, at the bottom of the lake', { s: B(26, 2) }, { s: B(30) }, { final: true });
    T.section('the final', { s: B(30) }, { s: B(33) });
    T.section('the outro', { s: B(33) }, { s: S.end }, { close: true });

    // ================================================================ S1 · INTRO: she's on her porch with her coffee
    at(0.02, () => { b().perform('Consume', { duration: 1.4, from: 0.1, to: 0.9 }); sv().setFace('SWEET'); });
    at(S.band, () => { snd().play('tink', b().x); b().moveTo(-1.0, -3.5, 1.55, { easing: 'inOut' }); b().behave = 'chase'; b().behaveOpts.speed = 1.0; });

    // ================================================================ S1 · VERSE 1 (teaching: one thing at a time)
    // LAST TUESDAY: coffee lobbed from the pot (the catch)
    for (const [rel, arr] of [[B(0, 4), B(1, 1)], [B(1, 1), B(1, 2)]]) at(rel, () => {
      const bb = b(); bb.perform('OverhandThrow', { from: 0.25, to: 0.72, duration: 0.42 });
      const from = sv().spout(new THREE.Vector3());
      f.pat.lob(f, { at: { x: pl().x, z: pl().z }, from: { x: from.x, z: from.z }, fromY: from.y, end: arr, r: 0.6, shape: 'orb', size: 0.34, kind: 'pink', back: 18, peak: 1.6, onLand: (hit, sh) => { if (hit === 'miss') coffeeSizzle(f, sh.x, sh.z); } });
      snd().play('pot', bb.x, { gain: 0.6 });
    });
    // UNSTABLE: she wobbles toward YOU; SCARY: the lunge (the parry)
    at(B(1, 2), () => { sv().wobbleFor(B(1, 2), B(1, 4)); const bb = b(), p = pl(); const d = Math.hypot(p.x - bb.x, p.z - bb.z), go = Math.max(0, Math.min(3.8, d - 2.6)); const a = toward(bb, p); bb.moveTo(bb.x + Math.sin(a) * go, bb.z + Math.cos(a) * go, B(1, 4) - B(1, 2), { easing: 'linear' });
      for (let k = 0; k < 4; k++) f.after(k * beat() / 2, () => snd().play('plateLight', b().x, { gain: 0.8 })); });
    at(B(1, 4), () => {
      const bb = b(), end = B(2, 1);
      bb.faceNow(pl().x, pl().z);
      bb.perform('Sword_Dash', { from: 0.1, to: 0.55, duration: end - f.t + 0.12 });
      let parried = false;
      area(f, { shape: 'cone', x: bb.x, z: bb.z, angle: toward(bb, pl()), w: 3.2, param: 35 * deg }, { end, kind: 'pink', melee: true, onImpact: (hit) => { parried = hit === 'parried'; if (parried) { bb.perform('Hit_Knockback', { duration: 0.5 }); bb.open(1.5 * beat()); } } });
      f.after(end - f.t - 0.16, () => { const a = bb.facing; bb.moveTo(bb.x + Math.sin(a) * 1.1, bb.z + Math.cos(a) * 1.1, 0.16, { easing: 'in', face: false }); });
      f.at(7.46, () => sv().flash('REAL', beat()));
    });
    at(B(2, 2), () => { sv().setFace('SWEET'); if (!b().busy) b().perform('Interact', { from: 0.2, to: 0.6, duration: 0.38 }); });
    // SAID YOU NEEDED SPACE: a white ring round her, 2.5..5.5 m (the first hint: beside her is safe)
    at(B(2, 4), () => { const bb = b(); bb.behave = 'hold'; area(f, { shape: 'ring', x: bb.x, z: bb.z, w: 5.5, param: 3.0 }, { end: B(3, 1), kind: 'white', onImpact: () => { snd().play('whum', bb.x); f.fx.dust(bb.x, bb.z, 14); } }); bb.perform('Spell_Simple_Enter', { duration: 0.75 }); });
    // TOO MUCH TO CARRY: a white circle follows YOU, locks, and she lands on it
    at(B(3, 3), () => {
      const bb = b(), lock = B(3, 4), land = B(4, 1); let fx = pl().x, fz = pl().z;
      f.tele.add({ shape: 'circle', x: fx, z: fz, w: 2.2, kind: 'white', start: f.t, end: land, follow: () => { if (f.t < lock) { fx = pl().x; fz = pl().z; } return { x: fx, z: fz }; } });
      f.cue('white', pl());
      bb.perform('NinjaJump_Start', { duration: 13.271 - f.t, then: 'NinjaJump_Idle_Loop' });
      f.at(13.271, () => { bb.moveTo(fx, fz, land - 13.271, { easing: 'in' }); });
      f.at(land, () => {
        area(f, { shape: 'circle', x: fx, z: fz, w: 2.2 }, { start: land - 0.01, end: land, kind: 'white', silent: true });
        bb.perform('NinjaJump_Land', { duration: 0.5 }); snd().play('plateHeavy', fx); snd().play('mining', fx);
        f.fx.dust(fx, fz, 18, new THREE.Color(0.9, 0.85, 0.8)); f.fx.chips(fx, 0.2, fz, new THREE.Color(1.8, 1.7, 1.6), 16); f.cam.shake(0.35, 0.12);
        bb.open(beat());
      });
    });

    // ================================================================ S2 · VERSE 1b: packed your bags with shaking hands
    at(B(4, 2), () => { const bb = b(); bb.behave = 'hold'; const a = toward(pl(), bb); bb.moveTo(bb.x + Math.sin(a) * 1.4, bb.z + Math.cos(a) * 1.4, 0.6); bb.perform('Spell_Simple_Idle_Loop', { duration: 2.2 }); });
    for (const [id, t0, t1] of [[0, B(4, 2), B(4, 4)], [1, B(4, 4), B(5, 1)]]) {
      at(t0, () => {
        const c = L.world.cases[id]; if (c.state !== 'lawn') return;
        show(f, { shape: 'ring', x: c.x, z: c.z, w: 2.4, param: 1.6 }, f.t, t1, 'pink', () => ({ x: c.x, z: c.z }));
        for (let k = 0; k < 16; k++) { const tt = t0 + k * (t1 - t0) / 16; if (tt < t1 - 0.05) f.at(tt, () => { if (c.state === 'lawn') snd().play('latch', c.x, { gain: 0.5, rate: 0.9 + Math.random() * 0.2 }); }); }
      });
      at(t1, () => {
        const c = L.world.cases[id]; if (c.state !== 'lawn') return;
        c.state = 'burst'; snd().play('latch', c.x); snd().play('cloth', c.x); snd().play('leather', c.x, { gain: 0.6 });
        f.pat.ring(f, { from: { x: c.x, z: c.z }, n: 8, speed: 6, kind: 'pink', shape: 'petal', offset: 0.3, rot: Math.random() });
        L.world.particles.burst(14, { x: c.x, y: 0.4, z: c.z, speed: 2.5, up: 2.5, life: 1.4, size: 0.14, color: new THREE.Color(1.5, 1.35, 1.25), gravity: 2, drag: 1.2, shape: 3, spin: 6 });
      });
    }
    at(B(5, 1) + 0.15, () => { const bb = b(); bb.moveTo(-1.4, -1.6, 1.2); bb.behave = 'keep'; bb.behaveOpts = { r: 5, rMin: 3.2, rMax: 7, speed: 1.6, dir: 1 }; });
    // GRABBED YOUR KEYS FROM THE RACK: the key ring, out and back
    at(17.78, () => { sv().keysOn(true); snd().play('coins', b().x, { gain: 0.5 }); });
    at(B(5, 2), () => { const tOut = B(5, 3); const d = Math.min(9, Math.hypot(pl().x - b().x, pl().z - b().z) + 0.6); keyRing(f, L, { tOut, tTurn: tOut + d / 14, tHang: Math.max(tOut + d / 14, 19.45 - d / 16), tBack: 19.45, lane: f.t }); });
    // TOLD ME IT WAS OVER: a sip (the music's breath), then a line drawn through YOU with her toe
    at(B(6, 1), () => { b().perform('Consume', { duration: 1.4 }); b().open(1.4); sv().setFace('SWEET'); });
    at(B(6, 3), () => {
      const bb = b(), a = toward(bb, pl()); bb.perform('Interact', { from: 0.1, to: 0.7, duration: 0.9 });
      const o = { x: bb.x - Math.sin(a) * 3, z: bb.z - Math.cos(a) * 3 };
      area(f, { shape: 'rect', x: o.x, z: o.z, angle: a, w: 0.9, h: 24 }, { end: B(7, 1), kind: 'white', onImpact: () => { snd().play('mining', o.x); for (let k = 0; k < 10; k++) f.fx.sparks(o.x + Math.sin(a) * (3 + k * 2), 0.1, o.z + Math.cos(a) * (3 + k * 2), new THREE.Color(2.4, 2.6, 3), 6, a + Math.PI / 2); } });
    });
    // SAID YOU WEREN'T COMING BACK: the boomerang loop through YOUR spot, back in her hand as "coming back" is sung
    at(B(7, 2), () => keyLoop(f, L, { tOut: f.t, tBack: B(8, 1) }));

    // ================================================================ S3 · THE PRE: pressure on
    // YOU PEELED OUT THE DRIVEWAY: tyre tracks, the ghost of YOUR car peeling out
    at(B(8, 1), () => {
      const a = toward(SPOTS.gate, { x: 3.4, z: 3.4 }), n = { x: Math.cos(a), z: -Math.sin(a) };
      for (const s of [-1, 1]) area(f, { shape: 'rect', x: SPOTS.gate.x + n.x * 0.75 * s, z: SPOTS.gate.z + n.z * 0.75 * s, angle: a, w: 0.35, h: 15 }, { end: B(8, 3), kind: 'white', silent: s > 0, sound: s > 0 ? false : undefined });
      f.at(B(8, 3), () => { snd().play('tyre', -4); snd().play('smoke', -4); for (let k = 0; k < 30; k++) { const d = Math.random() * 15; L.world.particles.add({ x: SPOTS.gate.x + Math.sin(a) * d + n.x * (Math.random() < 0.5 ? -0.75 : 0.75), y: 0.2, z: SPOTS.gate.z + Math.cos(a) * d + n.z * (Math.random() < 0.5 ? -0.75 : 0.75), vy: 0.7, vx: (Math.random() - 0.5) * 0.6, life: 1.6, size: 0.3, grow: 0.9, color: new THREE.Color(0.55, 0.52, 0.55), shape: 0, alpha: 0.55 }); } });
    });
    // IN YOUR REARVIEW MIRROR: she's gone; her shimmer behind YOU; the backhand at YOUR back
    at(B(8, 4), () => {
      const bb = b(), lock = 28.488, hit = B(9, 1);
      sv().glintAt(bb.x, 1.6, bb.z); snd().play('glint', bb.x);
      bb.intangible = true; bb.root.visible = false; sv().hidden = true;
      const sh = { x: pl().x, z: pl().z };
      const back = () => { const p = pl(); let vx = p.vx, vz = p.vz; const l = Math.hypot(vx, vz); if (l < 0.5) { vx = -Math.sin(p.facing); vz = -Math.cos(p.facing); } else { vx /= l; vz /= l; } const w = walkable(p.x - vx * 1.6, p.z - vz * 1.6, 0.6); return w; };
      sv().shimmerAt = { x: sh.x, z: sh.z, t0: f.t, t1: hit };
      let cone = null;
      cone = f.tele.add({ shape: 'cone', x: sh.x, z: sh.z, angle: 0, w: 2.6, param: 50 * deg, kind: 'pink', start: f.t, end: hit, follow: () => { if (f.t < lock) { const w = back(); sh.x = w.x; sh.z = w.z; sv().shimmerAt && (sv().shimmerAt.x = w.x, sv().shimmerAt.z = w.z); } return { x: sh.x, z: sh.z, angle: toward(sh, pl()) }; } });
      void cone; f.cue('pink', pl());
      f.at(hit - 0.2, () => { bb.place(sh.x, sh.z, toward(sh, pl())); bb.root.visible = true; bb.intangible = false; sv().hidden = false; sv().shimmerAt = null; snd().play('tink', sh.x); bb.perform('Melee_Hook', { from: 0.1, to: 0.7, duration: 0.45 }); });
      f.at(hit, () => { const r = f.resolveArea({ shape: 'cone', x: sh.x, z: sh.z, angle: toward(sh, pl()), w: 2.6, param: 50 * deg }, { kind: 'pink', melee: true }); f.sfx.impactArea && f.sfx.impactArea('pink', f.pan(sh.x), r); bb.open(beat() * (r === 'parried' ? 1.6 : 1)); });
    });
    // WHEELS ON GRAVEL SCREAMING: the donut, a spray of white shards on every sixteenth
    at(B(9, 2), () => {
      const bb = b(); bb.behave = 'hold';
      show(f, { shape: 'ring', x: bb.x, z: bb.z, w: 3.4, param: 2.6 }, f.t, B(9, 3), 'white', () => ({ x: bb.x, z: bb.z }));
      snd().play('screech', bb.x); snd().play('patter', bb.x, { at: 0.7 });
      const y0 = bb.facing; L.spin = { t0: f.t, t1: B(10, 1), y0 };
      f.at(B(9, 3), () => f.pat.spiral(f, { arms: 2, count: 8, step: 0.25, turn: 45, speed: 10, kind: 'white', shape: 'shard', size: 0.22, life: 1.12, rot: bb.facing }));
    });
    // BUT I'M A PROBLEM SOLVER, I THINK TWO STEPS AHEAD: blocks where YOU'll be two beats from now
    const blocks1 = [[B(10, 1), B(10, 3)], [B(10, 2), B(10, 4)], [B(10, 3), B(11, 1)], [B(10, 4), B(11, 2)], [B(11, 1), B(11, 3)], [B(11, 2), B(11, 4)]];
    blocks1.forEach(([p, l]) => at(p, () => block(f, L, { place: p, land: l })));
    at(B(10, 1), () => { const bb = b(); bb.behave = 'hold'; const r = pierPoint(-0.6, 0); bb.moveTo(r.x - 1.0, r.z - 0.6, B(10, 4) - f.t, { easing: 'inOut' }); });
    at(B(10, 4), () => sv().vanish(TRUNK_SPOT.x, TRUNK_SPOT.z, B(11, 1), { facing: PIER_ANGLE + Math.PI }));
    at(B(11, 1) + 0.05, () => { const bb = b(); bb.lockFacing = false; bb.faceTarget = null; bb.facing = PIER_ANGLE; bb.perform('Interact', { duration: 1.4 }); bb.open(2.2); snd().play('tonk', bb.x, { gain: 0.5 }); });

    // ================================================================ S3 · ★ THE FIRST STOP: "by the way"
    at(S.bassGo1 + 0.03, () => { fizzle(f); L.unstoppable = true; });
    at(S.still, () => { sv().setFace('TALK'); const bb = b(); bb.place(TRUNK_SPOT.x, TRUNK_SPOT.z, PIER_ANGLE + Math.PI); bb.faceTarget = f.player; bb.behave = 'hold'; bb.loop('Idle_Loop'); snd().loop('crickets', false, { fade: 0.03 }); });
    at(S.tick, () => { const bb = b(); bb.faceNow(pierPoint(CAR_S).x, pierPoint(CAR_S).z); bb.perform('Interact', { from: 0.3, to: 0.6, duration: 0.3 }); snd().play('tonk', pierPoint(CAR_S).x); snd().play('click', pierPoint(CAR_S).x); snd().play('creak', pierPoint(CAR_S).x, { gain: 0.8 }); });
    at(S.by1, () => { const bb = b(); bb.faceNow(pl().x, pl().z); sv().setFace('TALK'); bb.rig.upperOnce('Interact', { from: 0.4, to: 0.75, duration: 0.5 }); });
    at(S.tip, () => { const bb = b(); bb.faceNow(pierPoint(CAR_S).x, pierPoint(CAR_S).z); bb.perform('Interact', { from: 0.25, to: 0.65, duration: 0.6 }); snd().play('scrape', pierPoint(CAR_S).x); snd().play('creak', pierPoint(CAR_S).x); });
    at(S.splash, () => { snd().play('splashBig', SPOTS.splash.x, { dry: true }); snd().play('glug', SPOTS.splash.x, { at: 0.3 }); f.cam.shake(0.5, 0.25); });
    at(S.hole1, () => snd().duck(0.22));
    at(S.surge - 0.9, () => snd().play('roar', 4));
    at(S.surge, () => {
      snd().play('wash', 0); f.cam.shake(0.6, 0.3);
      const p = pl(); const tArr = S.surge + 0.3 * Math.max(0, Math.min(1, (5.5 - p.z) / 12.5));
      f.at(tArr, () => {
        const q = pl();
        if (onPier(q.x, q.z)) return;
        if (q.state === 'dash') q.st = Math.max(q.st, 99);   // the lake isn't an attack: no dashing through it
        if (q.hurt(f._ctx(0), 1, q.x, q.z + 2.5, 'surge')) { f._hurt(q.x, q.z + 2); q.rig.once('Hit_Knockback', { duration: 0.55, fade: 0.04, then: null }); q.vz = -11; }
      });
    });
    at(S.surge + 0.25, () => { L.unstoppable = false; });

    // ================================================================ S4 · CHORUS 1, FLOODED: pressure on, euphoric
    at(S.c1, () => { const bb = b(); if (bb.state !== 'desperate') { bb.walkClip = 'Idle_Loop'; bb.runClip = 'Idle_Loop'; } sv().setFace('SWEET'); sv().vanish(-2, 0, S.c1 + 0.3); f.at(S.c1 + 0.3, () => { L.world.ripple(-2, 0, 1.6); L.world.splash(-2, 0, 20, 1.1); bb.behave = 'circle'; bb.behaveOpts = { r: 5.5, rMin: 4, rMax: 8, speed: 2.4, dir: 1 }; }); });
    // YOUR CAR IS AT THE BOTTOM OF THE LAKE: YOUR car keys
    at(S.c1 + 0.32, () => keyRing(f, L, { tOut: B(13, 3), tTurn: B(13, 4), tHang: B(13, 4) + 0.05, tBack: B(14, 1), lane: f.t }));
    // SUITCASE: out of the water, batted at YOU, skipping, bursting into YOUR clothes
    at(44.28, () => { const bb = b(); bb.behave = 'hold'; bb.perform('PickUp_Table', { from: 0.2, to: 0.8, duration: 0.5 }); const c = L.world.case3; c.visible = true; c.position.set(bb.x + Math.sin(bb.facing) * 0.7, 0.9, bb.z + Math.cos(bb.facing) * 0.7); L.world.splash(c.position.x, c.position.z, 14, 0.9); snd().play('splashSmall', bb.x); });
    at(B(14, 1.5), () => {
      const bb = b(), a = toward(bb, pl()), P = (d) => ({ x: bb.x + Math.sin(a) * d, z: bb.z + Math.cos(a) * d });
      const hop = P(4.5), end = P(9);
      show(f, { shape: 'rect', x: bb.x, z: bb.z, angle: a, w: 0.6, h: 9 }, f.t, B(14, 3), 'white');
      area(f, { shape: 'circle', x: hop.x, z: hop.z, w: 0.6 }, { end: B(14, 2.5), kind: 'white', silent: true, onImpact: () => { L.world.splash(hop.x, hop.z, 12, 0.9); snd().play('splashSmall', hop.x); } });
      area(f, { shape: 'circle', x: end.x, z: end.z, w: 0.6 }, { end: B(14, 3), kind: 'white', onImpact: () => {
        L.world.case3.visible = false; snd().play('latch', end.x); snd().play('cloth', end.x); L.world.splash(end.x, end.z, 16, 1);
        f.pat.ring(f, { from: end, n: 6, speed: 6, kind: 'pink', shape: 'petal', offset: 0.3 });
        L.mix = end;
      } });
      f.at(B(14, 2), () => { bb.perform('Sword_Regular_A', { from: 0.1, to: 0.6, duration: 0.35 }); snd().play('pot', bb.x); });
      const c = L.world.case3, t0 = B(14, 2), t1 = B(14, 2.5), t2 = B(14, 3);
      L.ticks.push((dt, t) => { if (t < t0) return true; if (t > t2) return false; const k = t < t1 ? (t - t0) / (t1 - t0) : (t - t1) / (t2 - t1); const A = t < t1 ? { x: c.position.x, z: c.position.z } : hop; const Bp = t < t1 ? hop : end; if (t < t1 && !c.userData.a) c.userData.a = { x: c.position.x, z: c.position.z }; const st = t < t1 ? c.userData.a : hop; c.position.set(st.x + (Bp.x - st.x) * k, L.world.level + Math.sin(k * Math.PI) * 0.9, st.z + (Bp.z - st.z) * k); c.rotation.y += dt * 12; void A; return true; });
    });
    // MIXTAPE: the music spills out of the burst case as pink notes in a turning stream
    at(B(14, 3) + 0.02, () => { const m = L.mix || { x: b().x, z: b().z }; show(f, { shape: 'ring', x: m.x, z: m.z, w: 2.4, param: 1.9 }, f.t, B(14, 3.5), 'pink'); f.at(B(14, 3.5), () => { f.pat.spiral(f, { from: m, arms: 1, count: 8, step: 0.125, turn: 45, speed: 6, kind: 'pink', shape: 'note' }); snd().play('click', m.x); }); });
    // EVERY CHOICE YOU THOUGHT YOU'D MAKE: a fan of seven cards, pink-white-pink..., arriving on "make"
    at(B(14, 3.5), () => {
      const bb = b(), base = toward(bb, pl()), d = Math.hypot(pl().x - bb.x, pl().z - bb.z), arc = 70 * deg;
      show(f, { shape: 'cone', x: bb.x, z: bb.z, angle: base, w: d + 1, param: 35 * deg }, f.t, B(15, 1), 'pink');
      for (let i = 0; i < 7; i++) if (i % 2) show(f, { shape: 'rect', x: bb.x, z: bb.z, angle: base + (i / 6 - 0.5) * arc, w: 0.22, h: d + 1 }, f.t, B(15, 1), 'white');
      f.at(B(14, 4), () => {
        bb.perform('Spell_Simple_Shoot', { duration: 0.45 }); snd().play('flip', bb.x);
        const fly = B(15, 1) - B(14, 4), sp = Math.max(6, Math.min(11, d / fly));
        for (let i = 0; i < 7; i++) { const a = base + (i / 6 - 0.5) * arc; f.proj.spawn({ x: bb.x + Math.sin(a) * 0.8, z: bb.z + Math.cos(a) * 0.8, angle: a, speed: sp, kind: i % 2 ? 'white' : 'pink', shape: 'card', size: 0.36, life: 2.5, spin: 6 }); }
      });
    });
    at(B(15, 1), () => { b().perform('Dance_Loop', { duration: beat() }); b().open(beat()); });
    // YEAH, YOUR CAR...: skipping stones (only the hops hurt), and the keys again
    at(B(15, 1.5), () => {
      const bb = b(), base = toward(bb, pl()), hops = [B(15, 2.5), B(15, 3), B(15, 3.5), B(15, 4), B(15, 4.5)];
      for (const s of [-1, 1]) { const a = base + s * 15 * deg; hops.forEach((tt, k) => { const p = { x: bb.x + Math.sin(a) * 2.2 * (k + 1), z: bb.z + Math.cos(a) * 2.2 * (k + 1) }; if (Math.abs(p.x) > 11.5 || Math.abs(p.z) > 7.5) return; area(f, { shape: 'circle', x: p.x, z: p.z, w: 0.6 }, { end: tt, kind: 'white', silent: k > 0 || s > 0, sound: s > 0 ? false : undefined, onImpact: () => { L.world.splash(p.x, p.z, 8, 0.7); if (s < 0) snd().play('splashSmall', p.x, { gain: 0.6 }); } }); }); }
      f.at(B(15, 2), () => bb.perform('OverhandThrow', { from: 0.3, to: 0.7, duration: 0.35 }));
    });
    at(B(15, 2), () => keyRing(f, L, { tOut: B(15, 3), tTurn: B(15, 4), tHang: B(15, 4) + 0.05, tBack: B(16, 1), lane: f.t }));
    // AND YOU'RE NEVER GONNA LEAVE ME: the kiss ring
    at(B(16, 1.5), () => { b().behave = 'hold'; b().perform('Spell_Simple_Enter', { duration: 0.8, then: 'Spell_Simple_Idle_Loop' }); kissRing(f, L, { appear: f.t, lock: B(16, 2), arrive: B(16, 3), n: 10, r: 5 }); });
    // NOT FOR HEAVEN'S SAKE: stars
    at(B(16, 3), () => { const bb = b(); bb.perform('Spell_Simple_Shoot', { from: 0.0, to: 0.8, duration: beat() + 0.1 }); show(f, { shape: 'ring', x: bb.x, z: bb.z, w: 3.4, param: 2.4 }, f.t, B(16, 4), 'white', () => ({ x: bb.x, z: bb.z })); f.at(B(16, 4), () => { f.pat.ring(f, { from: { x: bb.x, z: bb.z }, n: 12, speed: 9, kind: 'white', shape: 'star', size: 0.34, rot: Math.random() }); snd().play('glint', bb.x); }); });

    // ================================================================ S5 · VERSE 2: the police; she plays innocent on her porch
    at(S.police - 0.05, () => { const bb = b(); bb.behave = 'hold'; sv().glideTo(-2.0, -4.35, 0.7); sv().setFace('SWEET'); snd().play('squelch', -11); });
    for (const tk of [53.099, 53.476, 53.853]) at(tk, () => snd().play('knock', SPOTS.door.x, { gain: 0.9 }));
    // WITH YOUR PHOTO: six white circles, six poles up out of the water with YOUR face on them
    // (six land on one instant: one warning and one slam for all of them, not six stacked)
    at(B(17, 3), () => { for (const p of SPOTS.poles) area(f, { shape: 'circle', x: p.x, z: p.z, w: 0.7 }, { end: B(17, 4), kind: 'white', silent: p !== SPOTS.poles[0], sound: p === SPOTS.poles[0] ? undefined : false }); });
    at(B(17, 4), () => { snd().play('knock', -3, { rate: 0.7, gain: 0.65 }); snd().play('splashBig', -3, { gain: 0.35 }); snd().play('flip', -3); for (const p of SPOTS.poles) L.world.splash(p.x, p.z, 10, 0.9); });
    // she works the front of her porch like a stage
    at(B(17, 4) + 0.1, () => sv().glideTo(-5.5, -4.4, 0.7));
    // I POUR THEM COFFEE: the scalding sweep (inside 3 m of her is safe; a pole between you soaks it)
    at(B(18, 1), () => { b().perform('Pistol_Idle_Loop', { duration: 0.6 }); pour(f, L, { tDraw: f.t, tOn: B(18, 2), tOff: B(18, 4) }); });
    // PERFORM MY BEST CONFESSIONS: four hearts on the eighths (four catches in a row)
    at(B(18, 4) - 0.25, () => { sv().glideTo(-1.0, -4.4, 0.24); });
    const heartsT = [[B(18, 4), B(19, 1.5)], [B(18, 4.5), B(19, 2)], [B(19, 1), B(19, 2.5)], [B(19, 1.5), B(19, 3)]];
    heartsT.forEach(([rel, arr], i) => at(rel, () => {
      const bb = b(), p = { x: pl().x, z: pl().z };
      if (i === 0) bb.perform('Yes', { duration: 1.4 });
      show(f, { shape: 'circle', x: p.x, z: p.z, w: 0.6 }, f.t, arr, 'pink');
      const d = Math.hypot(p.x - bb.x, p.z - bb.z), a = toward(bb, p);
      f.proj.spawn({ x: bb.x + Math.sin(a) * 0.7, z: bb.z + Math.cos(a) * 0.7, angle: a, speed: Math.max(4, (d - 0.7) / (arr - f.t)), kind: 'pink', shape: 'heart', size: 0.36, wave: { amp: 1.0, freq: 1.3 }, life: (arr - f.t) + 0.6 });
      snd().play('kiss', bb.x, { gain: 0.6, rate: 0.8 });
    }));
    // HE WENT FOR CIGARETTES: the lighter's click, then a fan of white pills
    at(B(19, 2), () => { const bb = b(); bb.perform('Pistol_Shoot', { duration: 0.5 }); snd().play('click', bb.x); const a = toward(bb, pl()); show(f, { shape: 'cone', x: bb.x, z: bb.z, angle: a, w: 10, param: 25 * deg }, f.t, B(19, 3), 'white'); f.at(B(19, 3), () => f.pat.fan(f, { n: 5, arc: 50, speed: 11, kind: 'white', shape: 'pill', size: 0.26, angle: a, from: { x: bb.x, z: bb.z } })); });
    // I CRY RIGHT ON CUE: the light bar stops with its beam on her; her tears burst out of her
    at(B(19, 3) + 0.1, () => sv().glideTo(SPOTS.steps.x, SPOTS.steps.z + 0.25, B(19, 4) - f.t - 0.05));
    at(B(19, 4), () => { const bb = b(); show(f, { shape: 'ring', x: bb.x, z: bb.z, w: 2.8, param: 1.8 }, f.t, B(20, 1), 'pink', () => ({ x: bb.x, z: bb.z })); });
    at(B(20, 1), () => { const bb = b(); sv().flash('CUE', 0.75); f.pat.ring(f, { from: { x: bb.x, z: bb.z }, n: 12, speed: 7, kind: 'pink', shape: 'petal', rot: Math.random() }); snd().play('glassLight', bb.x); });
    // THEY SAID HE'LL TURN UP, MA'AM: a curtsy (open)
    at(B(20, 2), () => { const bb = b(); bb.perform('Interact', { from: 0.1, to: 0.8, duration: 1.4 }); bb.open(1.5); });
    // I SAID GOD, I HOPE IT'S TRUE: the halo lifts off her head and comes down as a ring
    at(B(20, 4), () => { const bb = b(); bb.perform('Yes', { duration: 0.75 }); area(f, { shape: 'ring', x: bb.x, z: bb.z, w: 6.5, param: 4.0 }, { end: B(21, 1), kind: 'white', onImpact: () => { snd().play('whum', bb.x); L.world.ripple(bb.x, bb.z, 2); L.world.splash(bb.x, bb.z, 24, 1.3); } }); L.halo = { t0: f.t, t1: B(21, 1) }; });

    // ================================================================ S6 · VERSE 2b: the water's so dark down there (close, DARK)
    at(S.dark + 0.05, () => { b().behave = 'hold'; });
    at(B(21, 2), () => {
      const bb = b(), p = pl(); const d = Math.hypot(p.x - bb.x, p.z - bb.z), go = Math.max(0, d - 1.7), a = toward(bb, p);
      sv().glideTo(bb.x + Math.sin(a) * go, bb.z + Math.cos(a) * go, Math.max(0.3, Math.min(0.72, go / 6)), { turn: false });
      L.combo = { broken: false };
    });
    const duel = [[B(21, 2), B(21, 3), 'Sword_Regular_A', 'pink'], [B(21, 3), B(21, 4), 'Sword_Regular_B', 'pink'], [B(21, 4), B(22, 1), 'Sword_Heavy_Combo', 'white']];
    duel.forEach(([draw, hit, clip, kind], i) => at(draw + 0.02, () => {
      if (L.combo && L.combo.broken) return;
      const bb = b(), a = toward(bb, pl());
      bb.faceNow(pl().x, pl().z);
      if (i > 0) { const d = Math.hypot(pl().x - bb.x, pl().z - bb.z); if (d > 2.2) { const go = d - 1.7; bb.moveTo(bb.x + Math.sin(a) * go, bb.z + Math.cos(a) * go, 0.3); } }
      f.after(Math.max(0, hit - f.t - 0.45), () => bb.perform(clip, clip === 'Sword_Heavy_Combo' ? { from: 0.72, to: 0.95, duration: 0.5 } : { from: 0.05, to: 0.6, duration: 0.5 }));
      if (kind === 'white') f.at(hit - 0.08, () => sv().flash('REAL', 0.2));
      area(f, { shape: 'cone', x: bb.x, z: bb.z, angle: a, w: 2.8, param: 45 * deg }, { end: hit, kind, melee: true, follow: () => ({ x: bb.x, z: bb.z, angle: toward(bb, pl()) }),
        onImpact: (r) => { snd().play(kind === 'white' ? 'plateHeavy' : 'pot', bb.x, { gain: 0.8 }); if (r === 'parried' && i < 2) { L.combo.broken = true; bb.perform('Hit_Knockback', { duration: 0.5 }); bb.open(beat() * 1.2); } } });
    }));
    // FIFTY FEET OF SECRETS: the depth posts erupt along a line toward YOU, one after another, each deeper
    at(B(22, 1) + 0.03, () => {
      const bb = b(), a = toward(bb, pl()), o = { x: bb.x, z: bb.z };
      // the line runs toward YOU as far as the open yard lets it; where the house, the porch, the pier or the stick
      // shift is in the way it swings to the nearest open way (posts never rise through the porch, stack in a corner
      // or wall off the stick)
      const clear = (x, z) => { const w = walkable(x, z, 0.7); return Math.hypot(w.x - x, w.z - z) < 0.05 && !onPier(x, z, 0.3) && floorAt(x, z) < 0.05 && Math.hypot(x - SPOTS.stick.x, z - SPOTS.stick.z) > 1.9; };
      const reach = (ang) => { let d = 2.5; while (d < 13 && clear(o.x + Math.sin(ang) * (d + 0.25), o.z + Math.cos(ang) * (d + 0.25))) d += 0.25; return d; };
      let best = null;
      for (let i = 0; i < 24; i++) { const da = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 12, l2 = reach(a + da), score = Math.min(l2, 9) - Math.abs(da) * 3; if (!best || score > best.score) best = { ang: a + da, len: l2, score }; }
      const ang = best.ang, len = Math.min(13, best.len), d0 = Math.min(3, len * 0.3), d4 = Math.max(len, d0 + 4);
      show(f, { shape: 'rect', x: o.x, z: o.z, angle: ang, w: 0.7, h: d4 }, f.t, S.posts[4], 'white');
      const at5 = [0, 1, 2, 3, 4].map((i) => { const d = d0 + (d4 - d0) * i / 4; return walkable(o.x + Math.sin(ang) * d, o.z + Math.cos(ang) * d, 0.5); });
      L.world.postsAt = at5;
      at5.forEach((p, i) => { const te = S.posts[i]; area(f, { shape: 'circle', x: p.x, z: p.z, w: 0.7 }, { start: te - beat() / 2, end: te, kind: 'white', silent: true, onImpact: () => { snd().play('boom', p.x, { rate: 1 - i * 0.08 }); L.world.splash(p.x, p.z, 14, 1); L.world.ripple(p.x, p.z, 1.6); } }); });
    });
    // AND I DON'T CARE: a shrug, a head shake, a sip (open)
    at(B(22, 4), () => { const bb = b(); bb.perform('Idle_No_Loop', { duration: 0.75, then: 'Consume' }); bb.open(1.2); });
    // YOU LOVE THAT STICK SHIFT: it rises out of the black water; the H draws itself; she takes the knob
    at(B(22, 4) + 0.02, () => area(f, { shape: 'circle', x: SPOTS.stick.x, z: SPOTS.stick.z, w: 1.6 }, { end: S.stick, kind: 'white', onImpact: () => { snd().play('splashBig', SPOTS.stick.x, { gain: 0.6 }); snd().play('clack', SPOTS.stick.x); L.world.splash(SPOTS.stick.x, SPOTS.stick.z, 30, 1.4); } }));
    at(S.stick + 0.1, () => sv().glideTo(SPOTS.atStick.x, SPOTS.atStick.z, B(23, 2) - f.t - 0.05, { turn: false }));
    at(B(23, 2), () => { const bb = b(); bb.faceNow(SPOTS.stick.x, SPOTS.stick.z); bb.perform('Interact', { from: 0.3, to: 0.6, duration: 0.5, then: 'Idle_Loop' }); bb.open(S.rise - f.t); L.atStick = true; });
    at(B(23, 2) + 0.6, () => { L.atStick = true; });
    // SHIFTING, AND GUESS YOU SHOULD'VE TAUGHT ME: each half-slot lights a beat before its shift (two grinds)
    const gear = (slot, upper, hit, grind) => at(hit - beat(), () => {
      const x = GATE.x[slot]; area(f, { shape: 'rect', x, z: GATE.zN, angle: upper ? Math.PI : 0, w: 1.0, h: 4.8 }, { end: hit, kind: 'white', onImpact: () => { snd().play(grind ? 'grind' : 'clack', x); L.world.ripple(x, GATE.zN + (upper ? -2.4 : 2.4), 1.2); } });
      f.at(hit, () => { const bb = b(); bb.rig && bb.rig.upperOnce('Interact', { from: 0.35, to: 0.55, duration: 0.25 }); });
    });
    gear(0, true, B(23, 3), false); gear(0, false, B(23, 4), false); gear(2, true, B(23, 4.5), true); gear(1, false, B(24, 1), true);
    // I JUST PUT IT IN NEUTRAL: the whole neutral bar slams (beside her is safe only in the stops)
    at(B(24, 2), () => area(f, { shape: 'rect', x: GATE.x[0], z: GATE.zN, angle: Math.PI / 2, w: 1.0, h: GATE.x[2] - GATE.x[0] }, { end: B(24, 3), kind: 'white', onImpact: () => { snd().play('clack', -2.5); snd().play('clack', -2.5, { at: 0.08, rate: 1.2 }); } }));
    // LET GRAVITY TAKE WHAT YOU WOULDN'T GIVE ME: the poles lean, then fall in pairs toward the lake
    at(S.lean, () => {
      snd().play('creak', -3, { rate: 0.7 });
      SPOTS.poles.forEach((p, i) => area(f, { shape: 'rect', x: p.x, z: p.z, angle: Math.atan2(0.6, 0.8), w: 0.45, h: 4.0 }, { end: S.fall[i % 3], kind: 'white', silent: i > 0, sound: i < 3 ? undefined : false, onImpact: () => { snd().play('splashBig', p.x, { gain: 0.45 }); const e = { x: p.x + 0.6 * 3.5, z: p.z + 0.8 * 3.5 }; L.world.splash(e.x, e.z, 14, 1); L.world.ripple(e.x, e.z, 1.4); } }));
    });

    // ================================================================ S6 · ★ THE SECOND STOP: "oh, by the way"
    at(S.rise + 0.02, () => {
      fizzle(f); L.unstoppable = true; L.atStick = false;
      const bb = b(); bb.place(SPOTS.atStick.x, SPOTS.atStick.z, toward(SPOTS.atStick, pl())); bb.behave = 'hold';
      bb.perform('Spell_Simple_Enter', { duration: 0.8, then: 'Spell_Simple_Idle_Loop' }); sv().setFace('SERENE');
      snd().play('moan', -2); snd().loop('hum', false);
    });
    at(S.white2, () => { const bb = b(); L.world.eye = { x: bb.x, z: bb.z, r: 2.6 }; f.cue('white', { x: bb.x, z: bb.z });
      f.at(S.under, () => {
        snd().play('crash', 0, { dry: true }); f.cam.shake(0.8, 0.35);
        const q = pl(), e = L.world.eye; if (!e || Math.hypot(q.x - e.x, q.z - e.z) <= e.r + 0.15) return;
        if (q.state === 'dash') q.st = Math.max(q.st, 99);   // no dashing through the lake either
        if (q.hurt(f._ctx(0), 2, e.x, e.z, 'lake')) f._hurt(e.x, e.z);
      }); });
    at(S.oh, () => { sv().setFace('TALK'); const bb = b(); bb.faceNow(pl().x, pl().z); bb.rig.upperOnce('Interact', { from: 0.4, to: 0.75, duration: 0.5 }); });
    at(S.under + 0.02, () => { L.unstoppable = false; snd().under = true; for (let i = 0; i < 60; i++) L.world.particles.add({ x: pl().x + (Math.random() - 0.5) * 8, y: Math.random() * 2, z: pl().z + (Math.random() - 0.5) * 6, vy: 3 + Math.random() * 4, life: 1.5, size: 0.06 + Math.random() * 0.1, color: new THREE.Color(0.8, 1, 1), wobble: 2, shape: 2 }); });
    at(S.hole2, () => { snd().duck(0.12); snd().play('vacuum', 0, { dry: true }); });

    // ================================================================ S7 · CHORUS 2, UNDER THE LAKE: YOUR headlights are her weapon
    at(S.c2, () => { const bb = b(); if (bb.state !== 'desperate') { bb.walkClip = 'Idle_Loop'; bb.runClip = 'Idle_Loop'; } bb.behave = 'circle'; bb.behaveOpts = { r: 5.5, rMin: 4, rMax: 8, speed: 2.6, dir: -1 }; sv().setFace('SWEET'); L.beams.sweep({ tDraw: f.t, tOn: B(26, 3), tOff: B(27, 1), a0: Math.PI + 50 * deg, a1: Math.PI - 30 * deg }); });
    // WINDOWS DOWN: YOUR car gushes pink bubbles that drift up the slope; catch them before they break
    L.bubbles = [];
    [B(27, 1.5), B(27, 2), B(27, 2.5), B(27, 3), B(27, 3.5)].forEach((tt, k) => at(tt, () => {
      for (const s of [-1, 1]) {
        const o = { x: SPOTS.sunkCar.x + s * 0.7, z: SPOTS.sunkCar.z - 0.6 }, tgt = { x: pl().x + (Math.random() - 0.5) * 2, z: pl().z + (Math.random() - 0.5) * 2 }, a = toward(o, tgt);
        const p = f.proj.spawn({ x: o.x, z: o.z, y: 0.9, angle: a, speed: 4, kind: 'pink', shape: 'orb', size: 0.4, life: 86.4 - f.t, wave: { amp: 0.4, freq: 0.9 }, accel: -1.5, minSpeed: 0.35 });
        if (p) { p.bubble = true; L.bubbles.push(p); }
        snd().play('bubble', o.x, { rate: 0.8 + Math.random() * 0.4 });
      }
    }));
    // WATER BLACK: the lights cut out; she drifts at YOU in the dark and swings (pink)
    at(B(27, 3), () => { const bb = b(), p = pl(); bb.behave = 'hold'; const d = Math.hypot(p.x - bb.x, p.z - bb.z), a = toward(bb, p), go = Math.max(0, d - 1.8); bb.moveTo(bb.x + Math.sin(a) * go, bb.z + Math.cos(a) * go, Math.min(0.7, go / 7 + 0.05)); f.after(0.3, () => bb.perform('Sword_Regular_A', { from: 0.05, to: 0.6, duration: 0.45 }));
      area(f, { shape: 'cone', x: bb.x, z: bb.z, angle: a, w: 2.8, param: 40 * deg }, { end: B(27, 4), kind: 'pink', melee: true, follow: () => ({ x: bb.x, z: bb.z, angle: toward(bb, pl()) }), onImpact: (r) => { if (r === 'parried') { bb.perform('Hit_Knockback', { duration: 0.5 }); bb.open(1); } } }); });
    // EVERY PROMISE THAT YOU BREAK: every bubble you didn't catch rings white and pops into droplets on "break"
    at(B(27, 4), () => { for (const p of L.bubbles) if (!p.dead && p.owner === 'boss') show(f, { shape: 'ring', x: p.x, z: p.z, w: 1.0, param: 0.35 }, f.t, B(28, 1), 'white', () => ({ x: p.x, z: p.z })); b().behave = 'circle'; });
    at(B(28, 1), () => { let pops = 0; for (const p of L.bubbles) if (!p.dead && p.owner === 'boss') { p.dead = true; f.pat.ring(f, { from: { x: p.x, z: p.z }, n: 4, speed: 5, kind: 'white', shape: 'orb', size: 0.18, offset: 0.2, rot: Math.random() * 6 }); if (pops++ < 3) snd().play('pop', p.x); } L.bubbles = []; });
    // YEAH, YOUR CAR'S AT THE BOTTOM: the keys (slower in the water), then the beams sweep back
    at(B(28, 1) + 0.05, () => keyRing(f, L, { tOut: B(28, 2), tTurn: B(28, 3), tHang: B(28, 3) + 0.05, tBack: B(28, 4), lane: f.t }));
    at(B(28, 2), () => L.beams.sweep({ tDraw: f.t, tOn: B(28, 3), tOff: B(29, 1), a0: Math.PI - 30 * deg, a1: Math.PI + 50 * deg }));
    // AND YOU'RE NEVER GONNA LEAVE ME: the kiss ring, doubled
    at(B(29, 1), () => { const bb = b(); bb.behave = 'hold'; bb.perform('Spell_Simple_Enter', { duration: 0.75, then: 'Spell_Simple_Idle_Loop' }); kissRing(f, L, { appear: f.t, lock: B(29, 2), arrive: B(29, 3), n: 8, r: 5 }); kissRing(f, L, { appear: f.t, lock: B(29, 2), arrive: B(29, 4), n: 12, r: 7, rot: 0.26 }); });
    // NOT FOR HEAVEN'S SAKE: stars, twice
    const stars = (draw, fire, rot) => at(draw, () => { const bb = b(); show(f, { shape: 'ring', x: bb.x, z: bb.z, w: 3.4, param: 2.4 }, f.t, fire, 'white', () => ({ x: bb.x, z: bb.z })); f.at(fire, () => { bb.rig.upperOnce('Spell_Simple_Shoot', { duration: 0.4 }); f.pat.ring(f, { from: { x: bb.x, z: bb.z }, n: 12, speed: 9, kind: 'white', shape: 'star', size: 0.34, rot }); snd().play('glint', bb.x); }); });
    stars(B(29, 3), B(29, 4), 0); stars(B(29, 4) + 0.02, B(30, 1), 15 * deg);

    // ================================================================ S8 · THE FINAL: the lid; everything she has
    at(S.lid, () => { const bb = b(); bb.behave = 'hold'; sv().glideTo(SPOTS.shaft.x, SPOTS.shaft.z, 0.7, { turn: false }); });
    at(S.lid + 0.05, () => keyRing(f, L, { tOut: B(30, 2), tTurn: B(30, 3), tHang: B(30, 3) + 0.05, tBack: B(30, 4), lane: f.t }));
    at(B(30, 1.5), () => L.beams.sweep({ tDraw: f.t, tOn: B(30, 2), tOff: B(30, 4), a0: Math.PI - 30 * deg, a1: Math.PI + 50 * deg }));
    [[B(30, 3), B(31, 1)], [B(30, 4), B(31, 2)], [B(31, 1), B(31, 3)], [B(31, 2), B(31, 4)]].forEach(([p, l]) => at(p, () => { L.noFlick = true; block(f, L, { place: p, land: l, sink: true }); }));
    // MINE: twelve kisses; FOREVER: a double spiral of pink hearts as she turns in the shaft (her offering)
    at(B(31, 1.5), () => kissRing(f, L, { appear: f.t, lock: B(31, 2), arrive: B(31, 3), n: 12, r: 6 }));
    at(B(31, 4), () => { const bb = b(); L.spin = { t0: f.t, t1: B(32, 2), y0: bb.facing }; f.pat.spiral(f, { arms: 2, count: 8, step: 0.25, turn: 22.5, speed: 6, kind: 'pink', shape: 'heart', size: 0.36, rot: bb.facing }); L.offering = { t0: f.t, t1: B(32, 2) + 1, c0: pl().stats.catches }; });
    // NOW: the lid presses down
    at(B(32, 1), () => { const bb = b(); bb.perform('Spell_Simple_Enter', { duration: 0.7 }); area(f, { shape: 'ring', x: bb.x, z: bb.z, w: 7, param: 4.5 }, { end: B(32, 2), kind: 'white', onImpact: () => { snd().play('whum', bb.x); } }); });
    at(B(32, 2.5), () => { b().open(0.9); });
    // the pickup and THE FINISH on the last hit; or, with health left, MAKE NO MISTAKE
    at(B(32, 3), () => {
      const bb = b();
      if (bb.state === 'desperate') return;
      const lock = { x: pl().x, z: pl().z };
      area(f, { shape: 'circle', x: lock.x, z: lock.z, w: 2.4 }, { end: B(32, 4), kind: 'white', onImpact: () => { snd().play('plateHeavy', lock.x); f.cam.shake(0.5, 0.15); } });
      f.at(B(32, 4) - 0.32, () => { if (bb.state === 'desperate') return; sv().flash('REAL', 0.45); bb.moveTo(lock.x, lock.z - 0.3, 0.3, { easing: 'in' }); bb.perform('Sword_Heavy_Combo', { from: 0.72, to: 0.95, duration: 0.45 }); });
    });
    at(S.finish, () => { if (b().state === 'desperate' && f.state === 'play') { L.won = true; L.world.won = true; f._finish(); } });

    // ================================================================ S9 · THE OUTRO: the lake lets go (the walk home, if she's still standing)
    at(S.drain, () => { snd().under = false; snd().play('drain', 3); });
    at(S.drain + 0.3, () => { if (L.won) return; const bb = b(); bb.behave = 'hold'; bb.walkClip = bb.broken >= 3 ? 'Zombie_Walk_Fwd_Loop' : 'Walk_Formal_Loop'; bb.runClip = bb.walkClip; bb.moveTo(SPOTS.steps.x, SPOTS.steps.z + 0.3, 104.4 - f.t); });
    at(104.6, () => { if (L.won) return; const bb = b(); bb.faceNow(pl().x, pl().z); bb.rig.upperOnce('Yes', { duration: 0.6 }); const a = toward(bb, pl()), d = Math.hypot(pl().x - bb.x, pl().z - bb.z); f.proj.spawn({ x: bb.x + Math.sin(a) * 0.6, z: bb.z + Math.cos(a) * 0.6, angle: a, speed: Math.max(3, (d - 0.6) / (B(34, 3) - f.t)), kind: 'pink', shape: 'kiss', size: 0.42, life: 4 }); snd().play('kiss', bb.x); });
    at(106.0, () => { if (L.won) return; b().moveTo(SPOTS.door.x + 0.3, -6.35, 1.6); });
    at(B(35, 2), () => { if (L.won) return; const bb = b(); bb.faceNow(SPOTS.plaque.x, -7.5); bb.perform('Interact', { duration: 1.4 }); bb.open(1.5); snd().play('coins', bb.x, { gain: 0.5 }); });
    at(B(36, 1.5), () => { if (L.won) return; const bb = b(); bb.faceNow(pl().x, pl().z); area(f, { shape: 'ring', x: bb.x, z: bb.z, w: 6, param: 3.5 }, { end: B(36, 2), kind: 'white', onImpact: () => snd().play('whum', bb.x) }); });
    at(113.0, () => { if (L.won) return; snd().play('doorOpen', SPOTS.door.x); L.world.doorOpen = (t) => (t - 113.0) / 0.8; });
    at(S.home, () => { if (L.won) return; b().moveTo(SPOTS.door.x + 0.1, -6.75, 0.4); });
  },

  // ---------------------------------------------------------------------------------------------- the fight's hooks
  onStart(f) {
    const pl = f.player;
    // YOU bails out of YOUR car as it rolls down her pier: mid-roll, on the deck, heading down the ramp
    const st = pierPoint(3.4, 0.1); pl.place(st.x, st.z, PIER_ANGLE + Math.PI);
    pl.state = 'dash'; pl.st = 0.02; pl._dashAng = PIER_ANGLE + Math.PI; pl.rig.once('Roll', { from: 0.33, to: 0.95, duration: 0.3, then: null });
    resync(f, 0, true); L.fromTop = true;
  },
  onSection(f, sec) { L.world.snapshot(sec.t0); },
  // a rewind, and the ENCORE's jump back to chorus 2, both land here (resync is safe to run twice)
  onRewind(f, t) { resync(f, t, false); },
  onBreak(f, i) {
    const b = f.boss, sv = L.solver;
    if (i === 0) { sv.breakCardigan(); }
    if (i === 1) { sv.breakHair(); }
    if (i === 2) { sv.breakPot(); }
    if (L.world.surf > 0.05) { L.world.splash(b.x, b.z, 22, 1.2); L.snd.play('splashSmall', b.x); }
    if (L.unstoppable) { b.state = 'perform'; b.st = 0; return; }   // her stop moves can't be interrupted: the piece goes, no stagger
    b.perform('Hit_Knockback', { duration: f.beat, then: 'Idle_Shield_Break' });
    f.after(f.beat, () => b.perform('Idle_Shield_Break', { duration: f.beat }));
  },
  onEmpty(f) { const b = f.boss; b.walkClip = 'Zombie_Walk_Fwd_Loop'; b.runClip = 'Zombie_Walk_Fwd_Loop'; L.solver.setFace('WRECKED'); },
  onFinish(f) {
    L.won = true; L.world.won = true; L.snd.play('glassHeavy', f.boss.x, { dry: true });
    // the song plays on for eighteen seconds after she shatters, and no spotlight can start then: keep the meter from
    // showing one ready
    f.player.meter = Math.min(f.player.meter, 0.99);
  },
  onSpotlight() {},

  update(f, dt) {
    if (!L) return;
    const t = f.t;
    // practice from a section (?at=): the set, her and YOU as they'd be there, her health as a good player leaves it
    if (!L.botTaught && f.input && f.input.think) { L.botTaught = true; teachBot(f, L); }
    if (!L.started) { L.started = true; if (t > 0.5) { practiceHp(f, t); resync(f, t, false); const fig = f.boss.fig; for (let k = 0; k < Math.min(3, f.boss.broken); k++) { const n = fig.spec.breaks[k], a = fig.acc.find((x) => x.name === n); if (a) { a.broken = true; a.def.broken = true; for (const o of a.objects) o.visible = false; } else fig.breakPiece(n); } } }
    // the set's clock: the song's, and after the finish it plays on (the outro, dawn, the porch light on "home")
    if (f.state === 'play' || f.state === 'dying' || f.state === 'rewinding') L.songT = t;
    else if (f.state === 'finishing' || f.state === 'encore') L.songT = f.manual ? L.songT + dt : Math.max(L.songT, f.audio.time(performance.now()));
    if (!L.solver) return;
    const b = f.boss, sv = L.solver;
    // the first second and a half: the camera leans out over her yard so YOUR car is in the picture, rolling down her pier
    if (L.fromTop && f.state === 'play' && L.songT < 1.9) { const k = 1 - ramp(L.songT, 1.0, 1.9); f.cam.override = L.introCam || (L.introCam = { pos: new THREE.Vector3(3.2, 17.0, 15.2), look: new THREE.Vector3(3.2, 0.5, 2.4), k: 1 }); L.introCam.k = k * k * (3 - 2 * k); }
    else if (L.introCam && f.cam.override === L.introCam) { f.cam.override = null; L.introCam = null; }
    // verse 2b is close (intimate) until the H-pattern needs reading; the second stop pulls right back to the whole yard
    // so the lake can be seen rising into a wall round it
    { const sec = f.lastSection; if (sec && sec.name.startsWith('verse 2b')) sec.close = L.songT < 71.94;
      f.cam.minDist = f.state === 'play' && L.songT >= S.rise + 0.3 && L.songT < S.under + 0.2 ? 23 : f.cam.baseMin; }
    // the first stop: the picture leans toward her and YOUR car at the end of the pier (YOU stays in it)
    { const k = f.state === 'play' && L.songT > S.still && L.songT < S.surge + 0.6 ? Math.min(1, (L.songT - S.still) / 0.8, (S.surge + 0.6 - L.songT) / 0.5) : 0; f.cam.weight = 0.45 + 0.22 * k; }
    BEAT.pulse = f.bm.pulse(t, 7); BEAT.t = t;
    sv.water = L.world.level > 0.05 && L.songT < S.under ? L.world.level : 0;
    sv.update(dt);
    // the police light: when a beam is on her she bursts into tears
    if (L.world.beamOn(b.x, b.z, t) && b.state !== 'desperate') sv.flash('CUE', 0.14);
    // her spins (the donut, the offering) and the halo
    if (L.spin && t >= L.spin.t0 && t <= L.spin.t1) { b.lockFacing = true; b.facing = L.spin.y0 + (t - L.spin.t0) / (L.spin.t1 - L.spin.t0) * Math.PI * 2; } else if (L.spin && t > L.spin.t1) { b.lockFacing = false; L.spin = null; }
    // ground rings under the fighters sit on the porch / pier / water
    if (f.marks) { f.marks.you.position.y = Math.max(floorAt(f.player.x, f.player.z), L.world.surf) + 0.03; f.marks.her.position.y = Math.max(floorAt(b.x, b.z), L.world.surf) + 0.03; }
    // falling blocks, the pour, the third case
    for (const blk of L.live) blk.fall && blk.fall();
    L.ticks = L.ticks.filter((fn) => fn(dt, t));
    L.beams.update(dt, t);
    coverShots(f, L);
    // coffee: steam off the pot always, off her lobbed coffee as it flies; the perk knob bubbles on the beat
    steamFrame(f, dt);
    // the offering: every catch in the final spiral fills the meter for the last bar
    if (L.offering && t < L.offering.t1) { const c = f.player.stats.catches; if (c > L.offering.c0) { f.player.addMeter(0.09 * (c - L.offering.c0)); L.offering.c0 = c; } }
    // sounds that sit under the scene
    const under = L.songT >= S.under && L.songT < S.drain;
    L.snd.loop('crickets', L.songT > 1.5 && L.songT < S.still && f.state === 'play', { gain: 1 });
    L.snd.loop('hum', under && f.state === 'play', { gain: 1 });
    L.snd.loop('idle', t >= S.police && t < S.dark && f.state === 'play', { gain: 1, pan: -0.9 });
    L.snd.loop('whirr', t >= S.police && t < S.dark && f.state === 'play' && !(t > S.cueStop && t < S.cueGo), { gain: 1, pan: -0.9 });
    // after the win the meter can't fill to a spotlight (it would never end: see onFinish)
    if (L.won && f.player.meter >= 1) f.player.meter = 0.99;
    // the outro, after the win: the camera frames YOU and where she stood; from "spare key" that becomes her door
    // (she's gone), so the key glinting on its hook, up the wall above the picture until now, and the porch light
    // going out on "home" are in it. Nothing else reads her position once she's shattered (her ring is hidden).
    if (L.won && b.state === 'finished' && L.songT > S.spare - 0.6) { const k = Math.min(1, dt * 1.5); b.x += (SPOTS.plaque.x - b.x) * k; b.z += (SPOTS.plaque.z + 0.4 - b.z) * k; }
    // the spare key is hers if she walks up onto the porch for it
    if (L.won && !L.world.keyTaken && L.songT > S.drained) { const p = f.player; if (Math.hypot(p.x - SPOTS.plaque.x, p.z - (SPOTS.plaque.z + 0.6)) < 1.3) { L.world.keyTaken = true; L.snd.play('coins', p.x); L.snd.play('click', p.x, { at: 0.25 }); } }
    if (L.won && L.songT >= S.home && !L.lightOff) { L.lightOff = true; L.snd.play('click', SPOTS.door.x); }
    if (!L.won && L.songT >= S.home + 0.05 && !L.inside) { L.inside = true; }
    // YOUR rings trim the topiary hearts: three hits and it's a stump
    trimFrame(f);
  },
};

// ---------------------------------------------------------------------------------------------- helpers
// Behind the loading veil (about 2 s): the set in every look it has, once, through the game's own pipeline (its render
// target, its lights, the floor mirror, the env-map captures), so every shader is compiled and every lightmap uploaded
// before the song starts. Each first look did its own mid-song: the first dark frame froze the game for 0.8 s at 65 s,
// the fog under the lake for 6 s at 79 s, the outro for 1.4 s, and each piece that appears later (the shimmer, the
// white floors, the crest, the wall, the eye, the beams, her tears, the hair at the notch, her shatter) for a beat.
const WARM = [0.6, 39.0, 41.72, 46.0, 56.0, 66.0, 72.0, 78.6, 79.6, 80.3, 82.0, 93.0, 101.5, 103.0, 106.0];
async function warm(f, fig) {
  const w = L.world, post = f.app.post, r = f.app.renderer;
  if (!post || !post.render || !post.target || !r) return;
  const cam = new THREE.PerspectiveCamera(75, 16 / 9, 0.3, 400);
  cam.position.set(-1, 22, 21); cam.lookAt(-1, 0, -1.5); cam.layers.mask = f.cam.cam.layers.mask; cam.updateMatrixWorld();
  const face = L.solver && L.solver.faceAcc && L.solver.faceAcc.def;
  const extra = [w.case3, w.blocks[0].o, L.beams.mesh, ...L.beams.cones, L.solver && L.solver.shimmer, face && face.tears, face && face.hollow, f.fx && f.fx.spotCone].filter(Boolean);
  // her debris (the notch pieces' shards, chips, glitter, the shatter) and the plate of hair that comes away at the
  // second notch (a plain mesh in her hair's glaze): drawn once here, shadows and all
  let plate = null;
  if (fig && fig.world) {
    if (!fig.world.parent && fig.root.parent) fig.root.parent.add(fig.world);
    fig.world.traverse((o) => { if (o !== fig.world && (o.isMesh || o.isPoints || o.isGroup)) extra.push(o); });
    const hair = L.solver && L.solver.hair;
    if (hair) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.01, 0, 0, 0, 0.01, 0], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
      if (hair.geometry.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
      g.setAttribute('aBind', new THREE.Float32BufferAttribute(new Array(12).fill(0), 4));
      plate = new THREE.Mesh(g, hair.material); plate.castShadow = true; plate.frustumCulled = false; plate.position.set(0, 1, 0);
      fig.world.add(plate); extra.push(plate);
    }
  }
  const was = extra.map((o) => o.visible), culled = extra.map((o) => o.frustumCulled);
  // the fight's own pieces, one of each: a telegraph, a shot, sparks, a ribbon
  f.tele.add({ shape: 'circle', x: 0, z: 0, w: 1, kind: 'white', start: -1, end: 1e6 }); f.tele.update(0);
  f.proj.spawn({ x: 0, z: 0, kind: 'pink', shape: 'orb', speed: 0, life: 1e6 }); f.proj.draw(0);
  if (f.fx) { f.fx.sparks(0, 1, 0, new THREE.Color(1, 1, 1), 4); f.fx.trail(() => new THREE.Vector3(0, 1, 0), { life: 0.1 }); f.fx.update(1 / 60, cam.position, f.player); }
  w.particles.add({ x: 0, y: 1, z: 0, life: 9 });
  // first, in parallel: everything the main view draws, and the set as the env-map capture sees it (no lights: its
  // cameras see only the set's layer), both in the render targets' colour space
  if (r.compileAsync) {
    const envCam = cam.clone(); envCam.layers.set(LAYER.ARENA);
    const prev0 = r.getRenderTarget(); r.setRenderTarget(post.target);
    const jobs = [];
    try { jobs.push(r.compileAsync(f.scene, cam)); if (w.arena && w.arena.group) jobs.push(r.compileAsync(w.arena.group, envCam, f.scene)); } finally { r.setRenderTarget(prev0); }
    await Promise.all(jobs);
  }
  for (const t of WARM) {
    w.eye = t >= S.white2 && t < S.under ? { x: SPOTS.atStick.x, z: SPOTS.atStick.z, r: 2.6 } : null;
    w.stateAt(t, true);
    for (let i = 0; i < 4; i++) w.update(1 / 60, t);   // the arena recaptures its env map a few frames after a change
    w.particles.add({ x: 0, y: 1, z: 0, life: 9 }); w.particles.update(0);
    extra.forEach((o) => { o.visible = true; o.frustumCulled = false; });
    post.render(f.scene, cam, 0);
    extra.forEach((o, i) => { o.visible = was[i]; o.frustumCulled = culled[i]; });
  }
  if (plate) { plate.parent.remove(plate); plate.geometry.dispose(); }
  f.tele.clear(); f.proj.clear(); if (f.fx) f.fx.clear();
  w.eye = null; w.stateAt(0, true);
  for (let i = 0; i < 4; i++) w.update(1 / 60, 0);
}

// every shot of hers still in the air fizzles out with a soft puff
function fizzle(f) {
  for (const p of f.proj.list) if (p.owner === 'boss') { f.fx.dust(p.x, p.z, 3, new THREE.Color(1.2, 1.1, 1.1)); }
  f.proj.clear('boss');
  for (const blk of L.live) { blk.o.visible = false; blk.busy = false; }
  L.live.clear(); L.ticks.length = 0;
}

// put everything back as it is at song time t (rewinds, encores, practice from a section)
function resync(f, t, first) {
  const w = L.world, sv = L.solver, b = f.boss;
  L.songT = t; L.honkT = 0; L.spin = null; L.combo = null; L.unstoppable = false; L.offering = null; L.noFlick = false; L.atStick = false;
  L.ticks.length = 0; for (const blk of L.live) { blk.o.visible = false; blk.busy = false; } L.live.clear(); w.freeBlocks();
  L.beams.clear(); f.lakeHz.length = 0; L.bubbles = [];
  if (!first && !w.restore(SPAWN[sectionIndex(t)].t)) w.stateAt(t, true); else w.stateAt(t, first);
  w.case3.visible = false;
  L.snd.under = t >= S.under && t < S.drain;
  w.doorOpen = null; L.inside = false; w.eye = t >= S.white2 && t < S.under ? { x: SPOTS.atStick.x, z: SPOTS.atStick.z, r: 2.6 } : null;
  if (!sv) return;
  // her: where she stands at this section, her pieces as broken as her health says
  const i = sectionIndex(t), sp = SPAWN[i];
  b.place(sp.her.x, sp.her.z, Math.atan2(f.player.x - sp.her.x, f.player.z - sp.her.z));
  b.intangible = false; b.root.visible = true; sv.hidden = false; sv.shimmerAt = null; sv.glide = null; sv.wobble = null;
  b.behave = 'hold'; b.lockFacing = false; b.faceTarget = f.player;
  const wet = t >= S.surge && t < S.drain;
  b.walkClip = b.state === 'desperate' ? 'Zombie_Walk_Fwd_Loop' : wet ? 'Idle_Loop' : 'Walk_Formal_Loop'; b.runClip = b.walkClip;
  sv.keysOn(true);
  if (b.broken < 1) sv.restoreCardigan(); else sv.breakCardigan({ silent: true });
  if (b.broken < 2) sv.restoreHair(); else sv.breakHair({ silent: true });
  if (b.broken < 3) sv.restorePot(); else sv.hidePot();
  sv.setFace(b.state === 'desperate' ? 'WRECKED' : 'SWEET', 0.02);
  // YOU: at this section's mark (not at the very start: that's the roll off the pier)
  if (sp.you && !first) f.player.place(sp.you.x, sp.you.z, Math.atan2(sp.her.x - sp.you.x, sp.her.z - sp.you.z));
}

// practice from a section: her health as a good player leaves it there
export function practiceHp(f, t) {
  const b = f.boss, i = sectionIndex(t);
  b.hp = b.maxHp * ARC[i]; b.damageK = 1 - ARC[i];
  b.broken = b.notches.filter((n) => ARC[i] <= n).length;
  if (b.hp <= 0) { b.hp = 0; b.state = 'desperate'; }
  f.hud.restoreNotches && f.hud.restoreNotches(b.broken);
  f.checkpoint = { t: SPAWN[i].t, boss: b.snapshot(), score: f.score };
}

// YOUR strikes: knock YOUR cases about, pop the flamingos and the mailbox, honk YOUR car
function strikeArc(f, x, z, ang, range, arc) {
  const w = L.world;
  const hitIt = (px, pz, reach = range + 0.5) => { const dx = px - x, dz = pz - z, d = Math.hypot(dx, dz); if (d > reach) return false; const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang)); return Math.abs(da) <= arc || d < 0.9; };
  for (const c of w.cases) if (c.state === 'lawn' && L.songT > 1.4 && hitIt(c.x, c.z)) { c.vx += Math.sin(ang) * 6.5; c.vz += Math.cos(ang) * 6.5; L.snd.play('leather', c.x); f.fx.sparks(c.x, 0.4, c.z, new THREE.Color(1.8, 1.6, 1.3), 6, ang); }
  w.flamingos.forEach((fl) => { const px = fl.x ?? fl.home.x, pz = fl.z ?? fl.home.z; if (!fl.broken && fl.o.visible && hitIt(px, pz)) { fl.broken = true; f.fx.chips(px, 0.7, pz, new THREE.Color(3, 0.9, 1.6), 22); f.fx.glitter(px, 0.8, pz, new THREE.Color(3, 1, 1.8), 8, 0.5); L.snd.play('soft', px); L.snd.play('glassLight', px, { gain: 0.5 }); f._good && f._good(40); } });
  if (!w.mailbox.broken && hitIt(SPOTS.mailbox.x, SPOTS.mailbox.z)) { w.mailbox.broken = true; f.fx.chips(SPOTS.mailbox.x, 1, SPOTS.mailbox.z, new THREE.Color(2.4, 2.4, 2.6), 20); L.snd.play('tonk', SPOTS.mailbox.x); L.snd.play('flip', SPOTS.mailbox.x); }
  // the horn answers a strike at the car itself, not every strike at her while she stands at its trunk (the first
  // stop is the song's silence: a honk on each of those was the loudest thing in it)
  if (L.songT < S.tip && L.songT > S.clunk) { const c = pierPoint(CAR_S - 1.6), b = f.boss; if (hitIt(c.x, c.z, range + 1.2) && !(b && b.targetable && hitIt(b.x, b.z))) { if (!L.honkT || L.songT - L.honkT > 1.5) { L.honkT = L.songT; L.snd.play('honk', c.x); L.snd.play('tonk', c.x, { gain: 0.6 }); } } }
}

// YOUR thrown rings trim the topiary hearts (three hits to a stump, clippings flying)
function trimFrame(f) {
  const w = L.world;
  for (const r of f.player.rings) {
    if (r.state === 'hand') { r._trim = null; continue; }
    for (let i = 0; i < 2; i++) {
      if (w.trimmed[i]) continue;
      const p = SPOTS.topiary[i];
      if (Math.hypot(r.pos.x - p.x, r.pos.z - p.z) < 1.0) {
        const key = r.state === 'back' ? 'b' + i : 'o' + i;
        if (r._trim === key) continue;
        r._trim = key;
        w.topHits[i]++;
        L.snd.play('cloth', p.x, { gain: 0.6, rate: 1.4 });
        w.particles.burst(10, { x: p.x, y: 1.6, z: p.z, speed: 2.5, up: 2, life: 1.2, size: 0.07, color: new THREE.Color(0.25, 0.7, 0.4), gravity: 6, shape: 3, spin: 8 });
        if (w.topHits[i] >= 3) { w.trimmed[i] = true; w.particles.burst(40, { x: p.x, y: 1.6, z: p.z, speed: 3.5, up: 3, life: 1.6, size: 0.09, color: new THREE.Color(0.25, 0.7, 0.4), gravity: 7, shape: 3, spin: 10 }); L.snd.play('cloth', p.x); f._good && f._good(50); }
      }
    }
  }
}

// steam: off the percolator always (and bubbling on the beat), off every lobbed coffee
const _sp = new THREE.Vector3();
function steamFrame(f, dt) {
  const w = L.world, sv = L.solver;
  L.steamT = (L.steamT || 0) - dt;
  if (L.steamT <= 0 && sv && !sv.hidden && f.boss.state !== 'finished') {
    L.steamT = 0.13;
    const k = sv.knob(_sp);
    if (k) w.particles.add({ x: k.x, y: k.y + 0.05, z: k.z, vx: (Math.random() - 0.5) * 0.25, vy: 0.45 + BEAT.pulse * 0.5, vz: (Math.random() - 0.5) * 0.25, life: 0.9, size: 0.035, grow: 0.12, color: new THREE.Color(0.9, 0.9, 0.92), shape: 0, alpha: 0.16, drag: 0.8 });
    else if (f.boss.broken >= 3) { const e = sv.spout(_sp); w.particles.add({ x: e.x, y: e.y, z: e.z, vy: -1.5, life: 0.5, size: 0.04, color: new THREE.Color(0.35, 0.2, 0.1), gravity: 6, shape: 1 }); }
  }
  for (const p of f.proj.list) if (p.owner === 'deco' && p.shape === SHAPES.orb && Math.random() < 0.6) w.particles.add({ x: p.x, y: p.y, z: p.z, vy: 0.4, life: 0.6, size: 0.06, grow: 0.25, color: new THREE.Color(0.95, 0.92, 0.9), shape: 0, alpha: 0.35 });
  // the wrecked: gold leaf flaking off her as she moves
  if (f.boss.state === 'desperate' && Math.random() < dt * 6 && f.boss.fig) f.boss.fig.glitter.burst(f.boss.root.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 6, [new THREE.Color(1, 0.8, 0.35)], 0.3, 0.6);
}
function steamBurst(f, x, z, k = 1) { L.world.particles.burst(Math.round(30 * k), { x, y: 0.3, z, speed: 1.2, up: 1.6, life: 1.6, size: 0.15, grow: 0.6, color: new THREE.Color(0.95, 0.95, 0.97), gravity: -0.4, shape: 0, alpha: 0.5 }); L.snd.play('hiss', x); }
function coffeeSizzle(f, x, z) { L.world.particles.burst(10, { x, y: 0.1, z, speed: 0.8, up: 1.2, life: 0.9, size: 0.12, grow: 0.4, color: new THREE.Color(0.9, 0.88, 0.85), gravity: -0.3, shape: 0, alpha: 0.45 }); L.snd.play('hiss', x, { gain: 0.6 }); }
