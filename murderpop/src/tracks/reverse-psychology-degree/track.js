// B4: Reverse Psychology Degree. THE DOCTOR. "Her tells lie. The drums don't."
// Everything she shows YOU can be a lie: a shape that fills to a beat where no drum hits cracks like old glaze with a
// dry "tsk" and hurts nobody. The real blow always comes back with the drums. On every "reverse psychology" the world
// flips to its negative and her shape means its opposite: the circle she draws is the only safe ground.
// A music-video soundstage dressed as a university at night, travelling through six sets (set.js); the figurine and
// her faces in doctor.js; the bluff, the inverse and the feint in lies.js; the attacks on exact song times in moves.js.
import * as THREE from 'three';
import { CharacterKit } from '../../engine/character.js';
import { LAYER } from '../../game/arena.js';
import { buildFigurine } from '../../game/figurine.js';
import { Boss } from '../../game/boss.js';
import { toward, area } from '../../game/patterns.js';
import { Lies } from './lies.js';
import { Sounds } from './sound.js';
import { NEG, negifyTree } from './neg.js';
import { DOCTOR, Faces } from './doctor.js';
import * as M from './moves.js';
import { coachBot } from './coach.js';
import { Campus } from './set.js';
import { death, Death } from './death.js';

const ID = 'reverse-psychology-degree';
const D2R = Math.PI / 180;
let kit = null;
export const R = {};            // this fight's runtime: lies, snd, flashes, faces, set

// the checkpoints (song seconds; a line's own attack belongs to the section before it)
const SECTIONS = [
  ['got my phd', 0, 8.53], ['the lecture', 8.53, 23.39], ["don't listen to me", 23.39, 40.41], ['by design', 40.41, 49.42],
  ['through the screen', 49.42, 65.88], ["don't leave means go", 65.88, 79.16], ['certified', 79.16, 93.48], ["don't believe me", 93.48, 100.39],
  ['commencement', 100.39, 114.70], ['call your shrink', 114.70, 125.87], ['the dissertation', 125.87, 133.85], ['let go', 133.85, 144.46, { close: true }],
  ['nothing means what i say', 144.46, 161.46, { final: true }], ['final exam', 161.46, 180.54], ["don't believe me, again", 180.54, 191.71], ['complete', 191.71, 206.44],
];
// her marks over the song (for a start in the middle): [time, x, z]
const MARKS = [[0, -1.8, -6.2], [3.25, 0, -5.8], [23.39, -2, -4.5], [40.41, 0, -6.3], [49.42, 0, -6.0], [50.47, 0, -4.2], [65.88, 0, -1.6], [79.16, 0, -3], [84, 0, -0.8], [93.48, -1.9, -0.5],
  [100.39, -1.9, -0.5], [101.45, 0, -6.0], [114.70, 0, -6.0], [115.8, 0, -1.0], [125.87, -1.5, -1], [129.6, 0, 0], [133.85, 0, 0], [144.46, 0, -3.5], [161.46, 0, -2.5], [172.08, 0, -5.8],
  [180.54, 0, -4], [188.56, 0, 0], [191.71, 0, 0]];
// windows where crowding her gets SEE ME AFTER CLASS (pressure on, nothing scripted that must stay exact)
const SEE_ME = [[8.6, 20.6], [23.5, 40.3], [49.6, 64.5], [68.3, 76.0], [79.3, 82.8], [85.0, 92.4], [100.5, 114.4], [125.9, 129.0], [144.6, 154.4], [157.4, 159.2], [161.5, 169.9], [191.8, 196.9]];
// her base face over the song (CONCERN is insincere)
const FACES = [[0, 'rpdPatient'], [36.2, 'rpdConcern'], [38.8, 'rpdPatient'], [61.6, 'rpdConcern'], [63.3, 'rpdPatient'], [116.8, 'rpdConcern'], [121.2, 'rpdPatient'], [133.85, 'rpdConcern'], [144.46, 'rpdPatient'], [199.7, 'rpdConcern']];
const faceAt = (t) => { let n = FACES[0][1]; for (const [s, k] of FACES) if (t >= s) n = k; return n; };
// the outro: the pointer goes, the diploma comes out of her sleeve (until she lets it go at 199.71)
function diplomaState(t) {
  const d = R.fig.acc.find((a) => a.name === 'rpdDiploma'); if (d) for (const o of d.objects) o.visible = t >= 197.56 && t < 199.71;
  const p = R.fig.acc.find((a) => a.name === 'rpdPointer'); if (p && !p.broken) for (const o of p.objects) o.visible = t < 197.56;
}

// ------------------------------------------------------------------------------------------ small helpers
const upper = (f, clip, dur, o = {}) => { const r = f.boss.rig; if (r) r.upperOnce(clip, { duration: dur, fade: 0.08, ...o }); };
const walk = (f, x, z, dur, o = {}) => { f.boss.moveTo(x, z, dur, { easing: 'inOut', ...o }); };
const near = (f, d) => Math.hypot(f.boss.x - f.player.x, f.boss.z - f.player.z) < d;
// in the analyst's chair: her reactions stay in her upper body (a standing clip would lift her out of the seat)
const seated = (f) => f.t >= 93.48 && f.t < 99.9;
const react = (f, clip, dur, o = {}) => { if (seated(f)) upper(f, o.upper || 'Hit_Chest', Math.min(dur, 0.6)); else f.boss.perform(clip, { duration: dur, ...o }); };
// the position d metres from her toward YOU (clamped to the stage)
const stepToward = (f, d) => { const b = f.boss, a = toward(b, f.player); return { x: b.x + Math.sin(a) * d, z: b.z + Math.cos(a) * d }; };

export default {
  id: ID, beats: ID, par: 105000, lastHit: 203.94, duration: 206.44,
  spawn: { player: [0, 1.5, Math.PI], boss: [-1.8, -6.2, Math.PI] },

  // ---------------------------------------------------------------- the set
  async buildArena(f) {
    for (const k of Object.keys(R)) delete R[k];
    R.f = f;
    R.snd = new Sounds(f);
    R.set = new Campus(f, R);
    const w = await R.set.load();
    R.flashes = new M.Flashes(f.scene);
    Death.build(f, R);             // her death scene's own things, made now (hidden) so the warm-up compiles them
    return w;
  },

  // ---------------------------------------------------------------- THE DOCTOR
  async buildBoss(f) {
    if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
    const fig = await buildFigurine(kit, DOCTOR);
    f.scene.add(fig.root);
    negifyTree(fig.root, { albedo: true });
    negifyTree(fig.world, { albedo: true });
    const b = new Boss({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE DOCTOR', hp: 3900, notches: [0.75, 0.5, 0.25], pieces: ['rpdMortarboard', 'shoulder_r', 'hand_l'] });
    b.idle = 'Spell_Simple_Idle_Loop'; b.loop('Spell_Simple_Idle_Loop');
    b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Walk_Formal_Loop';     // she never runs: a long move is a brisker stride
    // her stride's pace goes in right before her mixer steps (the boss paces the walk, then steps the figurine, both in
    // its own update): set from this track's update it came after the step, and the boss wrote over it next frame
    const figUpdate = fig.update.bind(fig);
    fig.update = (dt) => { this._stride(b); figUpdate(dt); };
    b.arena = f.arena;
    R.fig = fig;
    R.faces = new Faces(fig);
    R.lies = new Lies(f, {
      tsk: (x) => R.snd.play('tsk', { x }),
      smirk: () => { R.faces.flash('rpdSmirk', f.t, f.beat * 1.2); if (!f.boss.busy) upper(f, 'Idle_No_Loop', 1.1, { from: 0.1, to: 0.6 }); },
      caught: () => { R.faces.flash('rpdCaught', f.t, f.beat); if (!f.boss.busy && f.boss.state === 'perform') react(f, 'Hit_Knockback', 0.55, { from: 0.0, to: 0.7 }); R.snd.lib('chip', { x: f.boss.x, gain: 0.5 }); },
      swish: (x) => R.snd.play('swish', { x }),
      drone: (s, e) => R.snd.play('drone', { dur: Math.max(0.3, e - s) }),
      fft: () => R.snd.play('fft'),
    });
    R.set.attachBoss && R.set.attachBoss(b);
    // small irritated recoils when she's hit, then she rolls her shoulders straight. A chip of glaze is heard coming
    // off each time another 24th of her bar goes, not on every strike (the fight's hit is already porcelain; a chip
    // on each of them was a constant skitter, 150 a minute under the bot)
    let lastRecoil = -9, chipStep = 0;
    b.on('hit', (h) => {
      if (f.t - lastRecoil > 0.4 && !b.busy && b.state !== 'stagger') { lastRecoil = f.t; upper(f, Math.random() < 0.3 ? 'Hit_Head' : 'Hit_Chest', 0.3); }
      const step = Math.floor((1 - b.hpK) * 24 + 1e-6);
      if (step < chipStep) chipStep = step;                       // a rewind gave her health back
      if (!h.desperate && step > chipStep) { chipStep = step; R.snd.lib('chip', { x: b.x, gain: 0.35 }); }
    });
    return b;
  },

  // ---------------------------------------------------------------- warm-up
  // Load time (script runs after the fight has built everything, the figurine's shatter included): show every piece of
  // every set once, offscreen, into a render target like the game's own, so each shader compiles and each texture and
  // buffer uploads now rather than the first time it appears in the song. On ANGLE/D3D11 a new shader costs 100-400 ms
  // and a 4096 lightmap ~100 ms; mid-song those were visible hitches, the worst on the finishing blow (the shards).
  _warm(f) {
    const rd = f.app.renderer, cam = f.cam.cam, A = R.set.arena, fig = R.fig, t0 = performance.now();
    const shown = [], culled = [], mask = cam.layers.mask, prev = rd.getRenderTarget();
    let rt = null;
    try {
      for (const tx of [...(A.lightmaps || []), ...(A.keymaps || [])]) if (tx) rd.initTexture(tx);
      if (!fig.world.parent) f.scene.add(fig.world);
      // her break chunks (the shoulder, the hand) are made when the fight prepares her, after she was set up for the
      // negative: a chunk breaking off during a flip fell in its true colours. (Materials already done are skipped.)
      negifyTree(fig.world, { albedo: true });
      R.flashes.laser(0, 0, 0, 1, 1, -99);
      if (R.lies._crackMesh) R.lies._crackMesh({ shape: 'circle', x: 0, z: 0, w: 1 }, 'white');
      for (const root of [A.group, R.set.group, fig.root, fig.world, R.lies.group, ...R.flashes.list]) root && root.traverse((o) => {
        if (!o.visible) { o.visible = true; shown.push(o); }
        if (o.frustumCulled) { o.frustumCulled = false; culled.push(o); }
      });
      cam.layers.enable(LAYER.HIDDEN);
      rt = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType });
      rd.setRenderTarget(rt);
      rd.compile(f.scene, cam);
      rd.shadowMap.needsUpdate = true;
      rd.render(f.scene, cam);
    } catch (e) { console.warn('rpd warm-up', e.message); }
    finally {
      rd.setRenderTarget(prev);
      if (rt) rt.dispose();
      cam.layers.mask = mask;
      for (const o of shown) o.visible = false;
      for (const o of culled) o.frustumCulled = true;
      R.flashes.clear();
      for (const c of R.lies.cracks || []) c.visible = false;
    }
    // the env capture sees the arena without lights: its variants of the negative-ready floor, and a clean capture
    try { if (A._captureEnv) A._captureEnv(); } catch (e) { console.warn('rpd env capture', e.message); }
    R.warmMs = Math.round(performance.now() - t0);
  },

  // ---------------------------------------------------------------- the choreography
  script(T, f) {
    this._warm(f);
    // the start passes through here (also a practice start in the middle, which gets no onRewind): the set and her
    // place are put right before the first beat after the jump fires, so a move on that beat starts from the right
    // place. A rewind and the ENCORE go through onRewind.
    const seek = T.seek.bind(T);
    T.seek = (to) => { seek(to); this._seeked(f, to); };
    for (const [name, a, b, o] of SECTIONS) T.section(name, { s: a }, { s: b }, o || {});
    const at = (t, fn) => T.at({ s: t }, fn);
    // (the song's last section: what she does there is the scene's once her death scene has her)
    const own = (fn) => (ff) => { if (!ff.boss.scene) fn(ff); };
    const L = R.lies;
    const flip = (t) => at(t - 0.25, () => R.snd.play('kachunk'));
    // the seven negatives (their envelopes are pure song time: rewinds and late starts get them right)
    for (const e of [{ on: 44.06, snap: 44.06, end: 45.90, flash: false }, { on: 65.50, snap: 65.50, end: 67.99 }, { on: 76.30, snap: 76.30, end: 78.63 }, { on: 114.50, snap: 114.50, end: 116.82 },
      { on: 142.34, snap: 143.76, end: 144.46, pre: 0.4 }, { on: 154.82, snap: 154.82, end: 157.21 }, { on: 189.09, snap: 190.26, end: 191.19, pre: 0.4 }]) { L.addEnv(e); flip(e.snap); }

    // ============ §1 GOT MY PhD (0 -> 8.53). The entrance; then the stutter: she only fires on the drums.
    for (const t of [0.52, 1.07, 1.61]) at(t, (ff) => { R.set.laserTap && R.set.laserTap(ff); R.snd.play('tick', { x: 0, gain: 0.6 }); });
    at(2.15, (ff) => { R.turn = { t0: 2.15, t1: 3.25, from: Math.PI }; walk(ff, 0, -5.8, 1.1); });
    at(4.29, (ff) => { ff.boss.perform('Spell_Simple_Enter', { duration: 0.5 }); });
    for (const t of [4.29, 4.81, 5.34, 5.87, 6.41, 6.94, 7.47, 8.00]) at(t, (ff) => { upper(ff, 'Spell_Simple_Shoot', 0.5); if ([5.34, 6.41, 7.47].includes(t)) R.snd.play('tick', { x: ff.boss.x }); });
    for (const [s, e] of [[4.81, 5.87], [5.07, 6.94], [6.94, 8.00], [7.20, 8.53]]) at(s, (ff) => M.send(ff, R, { start: s, end: e, size: 0.3, vmin: 2.5, vmax: 9 }));
    for (const [s, e] of [[5.34, 5.87], [7.47, 8.00]]) at(s, (ff) => M.shot(ff, R, { start: s, end: e, w: 0.35, h: 14, speed: 14, size: 0.28 }));

    // ============ §2 THE LECTURE (8.53 -> 23.39). She teaches; everything is honest.
    at(8.53, (ff) => { ff.boss.idle = 'Idle_Talking_Loop'; walk(ff, -2.5, -5.5, 1.06); });
    at(9.58, (ff) => upper(ff, 'Spell_Simple_Enter', 0.5));
    at(10.12, (ff) => M.send(ff, R, { start: 10.12, end: 11.18, n: 3, arc: 30, vmin: 4, vmax: 9 }));
    at(11.71, (ff) => M.shot(ff, R, { start: 11.71, end: 12.25, angles: [-7, 7], speed: 14 }));
    at(12.3, (ff) => walk(ff, 2.0, -5.5, 1.0));
    at(13.31, (ff) => {
      if (near(ff, 4.5)) { const p = stepToward(ff, 0.8); walk(ff, p.x, p.z, 0.4); ff.at(13.72, () => M.redPen(ff, R, { start: 13.72, end: 14.37 })); }
      else M.laser(ff, R, { start: 13.31, end: 14.37, w: 0.45, h: 16 });
    });
    at(14.9, (ff) => walk(ff, -1.0, -5.6, 1.0));
    at(15.43, (ff) => M.laser(ff, R, { start: 15.43, end: 16.49, w: 0.45, h: 16 }));
    at(16.6, (ff) => walk(ff, -3.8, -5.4, 1.0));
    at(17.55, (ff) => M.send(ff, R, { start: 17.55, end: 18.61, n: 5, arc: 50, vmin: 4, vmax: 9 }));
    at(19.15, (ff) => M.shot(ff, R, { start: 19.15, end: 19.68, n: 3, arc: 20, speed: 14 }));
    at(19.7, (ff) => walk(ff, -1.5, -5.7, 1.0));
    // the first lie: taught gently. The band thins (20.21), the circle fills, the band stops (21.27), it cracks (21.82).
    at(20.73, (ff) => { upper(ff, 'Spell_Simple_Shoot', 0.5); L.bluff({ shape: 'circle', x: ff.player.x, z: ff.player.z, w: 2.6, kind: 'white', start: 20.73, end: 21.82 }); });
    at(22.36, (ff) => { upper(ff, 'Spell_Simple_Shoot', 0.45); R.set.glint && R.set.glint(ff); });
    at(22.89, (ff) => upper(ff, 'Yes', 0.5, { from: 0.1, to: 0.3 }));

    // ============ §3 DON'T LISTEN TO ME (23.39 -> 40.41)
    at(23.39, (ff) => { upper(ff, 'Idle_No_Loop', 1.2, { from: 0.1, to: 0.6 }); M.send(ff, R, { start: 23.39, end: 24.99, n: 5, arc: 60, vmin: 3, vmax: 8 }); walk(ff, -2.2, -4.4, 1.6); });
    at(25.6, (ff) => { upper(ff, 'Yes', 1.0, { from: 0.0, to: 0.45 }); });
    at(26.05, (ff) => M.shot(ff, R, { start: 26.05, end: 27.11, angles: [-18, 18], speed: 14 }));
    at(27.2, (ff) => walk(ff, 1.8, -3.6, 1.0));
    for (const [s, e] of [[28.18, 29.23], [28.70, 29.77], [29.23, 30.30]]) at(s, (ff) => { upper(ff, 'OverhandThrow', 0.45, { from: 0.25, to: 0.6 }); M.pill(ff, R, { start: s, end: e }); R.snd.lib('k-cloth', { x: ff.boss.x, gain: 0.4, rate: 1.6 }); });
    at(30.30, (ff) => upper(ff, 'Consume', 1.0));
    at(30.83, (ff) => M.shot(ff, R, { start: 30.83, end: 31.36, n: 3, arc: 20, speed: 14 }));
    at(31.89, (ff) => { const p = stepToward(ff, Math.max(0, Math.hypot(ff.boss.x - ff.player.x, ff.boss.z - ff.player.z) - 3.0)); walk(ff, p.x, p.z, 1.06); });
    at(32.42, (ff) => M.thrust(ff, R, { start: 32.42, end: 33.48 }));
    at(34.0, (ff) => walk(ff, 0, -3.6, 1.0));
    at(35.08, (ff) => M.ringShards(ff, R, { start: 35.08, end: 35.61, n: 6, speed: 7, gap: 50 }));
    at(36.2, (ff) => upper(ff, 'Idle_Talking_Loop', 1.4));
    at(36.67, (ff) => M.hearts(ff, R, { t: 36.67, n: 4, speed: 5.5, homing: 0.6, homeFor: 1.0 }));
    at(38.80, (ff) => M.lunge(ff, R, { start: 38.80, end: 39.87, w: 1.0, len: 8 }));
    at(40.41, (ff) => walk(ff, 0, -6.3, 1.5));

    // ============ §4 BY DESIGN (40.41 -> 49.42). The claps stay; the lights go down for the slide.
    at(40.95, (ff) => { M.laser(ff, R, { start: 40.95, end: 42.00 }); const a = toward(ff.boss, ff.player) + 25 * D2R; M.laser(ff, R, { start: 40.95, end: 42.00, angle: a }); });
    at(43.09, (ff) => { upper(ff, 'Interact', 0.8, { from: 0.2, to: 0.5 }); M.send(ff, R, { start: 43.09, end: 44.13, n: 3, arc: 30 }); });
    // THE RORSCHACH: the safest place is right in front of her
    at(44.64, (ff) => { ff.boss.idle = 'Spell_Simple_Idle_Loop'; ff.boss.loop('Spell_Simple_Idle_Loop'); R.set.inkblot && R.set.inkblot(ff, 44.64, 48.88); L.inverse({ holes: [{ x: 0, z: 0, r: 1.2, strip: true }], start: 44.64, end: 48.88, damage: 2, ink: true }); });
    at(48.88, (ff) => { R.set.detonate && R.set.detonate(ff); R.snd.lib('shatter', { x: 0, gain: 0.35 }); });

    // ============ §5 THROUGH THE SCREEN (49.42 -> 65.88). The quad at night; she works the seal.
    at(49.42, (ff) => { ff.boss.idle = 'Idle_Talking_Loop'; walk(ff, 0, -4.2, 1.05); });
    at(50.47, (ff) => M.send(ff, R, { start: 50.47, end: 51.54, n: 5, arc: 70 }));
    at(52.07, (ff) => M.shot(ff, R, { start: 52.07, end: 52.60, angles: [-7, 7], speed: 15 }));
    at(53.13, (ff) => {
      if (near(ff, 4.5)) { M.redPen(ff, R, { start: 53.13, end: 54.20, rot: -35 }); ff.at(53.66, () => M.redPen(ff, R, { start: 53.66, end: 54.73, rot: 35 })); }
      else { M.laser(ff, R, { start: 53.13, end: 54.20 }); ff.at(53.66, () => M.laser(ff, R, { start: 53.66, end: 54.73 })); }
    });
    at(55.0, (ff) => walk(ff, 1.8, -2.8, 1.0));
    at(56.32, (ff) => { ff.boss.perform('Spell_Simple_Enter', { duration: 0.5 }); M.ringShards(ff, R, { start: 56.32, end: 56.85, n: 12, speed: 6.5, gap: 50 }); });
    at(57.38, (ff) => M.cards(ff, R, { start: 57.38, end: 58.44, n: 6, w: 11, deg: 37, speed: 9.5 }));
    at(58.6, (ff) => walk(ff, -1.5, -3.2, 0.9));
    for (const [s, e] of [[59.51, 60.57], [60.04, 61.10], [60.57, 61.63], [61.10, 62.16]]) at(s, (ff) => { upper(ff, 'OverhandThrow', 0.45, { from: 0.25, to: 0.6 }); M.pill(ff, R, { start: s, end: e }); });
    at(62.16, (ff) => { upper(ff, 'Interact', 0.9, { from: 0.0, to: 0.4 }); M.slam(ff, R, { start: 62.16, end: 63.23, r: 3.4 }); });
    at(63.75, (ff) => { ff.boss.perform('Spell_Simple_Shoot', { duration: 0.5 }); M.sweepBeam(ff, R, { start: 63.75, on: 64.29, off: 65.35, sweep: 120 }); });
    at(65.0, (ff) => walk(ff, 0, -1.6, 0.85));

    // ============ §6 DON'T LEAVE MEANS GO (65.88 -> 79.16)
    // (the circle is drawn where she stands: a walk still on its way, or held by a stun, ends here, so she stays in it)
    at(65.88, (ff) => { ff.boss.stop(); ff.boss.idle = 'Idle_FoldArms_Loop'; ff.boss.loop('Idle_FoldArms_Loop'); L.inverse({ holes: [{ x: ff.boss.x, z: ff.boss.z, r: 2.6 }], start: 65.88, end: 67.99 }); });
    at(68.2, (ff) => { ff.boss.idle = 'Idle_Talking_Loop'; walk(ff, -2.4, -2.6, 0.9); });
    at(69.05, (ff) => { upper(ff, 'Spell_Simple_Enter', 0.6); M.circle(ff, R, { x: ff.player.x, z: ff.player.z, r: 2.2, start: 69.05, end: 70.15 }); });
    at(70.3, (ff) => walk(ff, 2.2, -2.8, 0.9));
    at(71.18, (ff) => { upper(ff, 'Idle_No_Loop', 0.9, { from: 0.3, to: 0.6 }); const p = M.youAt(ff); M.lineZ(ff, R, { x: p.x - 2.3, start: 71.18, end: 72.25 }); M.lineZ(ff, R, { x: p.x + 2.3, start: 71.18, end: 72.25 }); M.lineX(ff, R, { z: p.z - 2.3, start: 71.18, end: 72.25 }); M.lineX(ff, R, { z: p.z + 2.3, start: 71.18, end: 72.25 }); });
    at(72.4, (ff) => walk(ff, 0, -3.0, 0.9));
    at(72.78, (ff) => { upper(ff, 'Idle_No_Loop', 1.0, { from: 0.1, to: 0.5 }); M.send(ff, R, { start: 72.78, end: 73.84, n: 5, arc: 60 }); });
    at(73.84, (ff) => { ff.boss.idle = 'Pistol_Idle_Loop'; ff.boss.loop('Pistol_Idle_Loop'); });
    for (const [s, e] of [[73.84, 74.36], [74.36, 74.90], [74.90, 75.44], [75.44, 75.98]]) at(s, (ff) => { M.laser(ff, R, { start: s, end: e, w: 0.45, h: 16 }); ff.at(e - 0.2, () => upper(ff, 'Pistol_Shoot', 0.35, { from: 0.1, to: 0.6 })); });
    at(76.0, (ff) => { ff.boss.idle = 'Idle_FoldArms_Loop'; ff.boss.loop('Idle_FoldArms_Loop'); });
    at(76.52, (ff) => L.inverse({ holes: [{ x: ff.player.x, z: ff.player.z, r: 2.6 }], start: 76.52, end: 78.63 }));
    // the feint arms itself from the timeline (its own f.at events are dynamic: made while the script was being
    // built, the fight's first seek wiped them, and she never feinted)
    at(77.8, () => L.feint(78.11));

    // ============ §7 CERTIFIED (79.16 -> 93.48). A free bar, the brain, the stamps.
    at(79.16, (ff) => {
      ff.boss.idle = 'Idle_Talking_Loop'; upper(ff, 'Spell_Simple_Shoot', 0.5);
      const z = ff.player.z;
      M.lineX(ff, R, { z: z - 2.4, start: 79.16, end: 80.22 });
      ff.at(79.69, () => M.lineX(ff, R, { z, start: 79.69, end: 80.75 }));
      ff.at(80.22, () => M.lineX(ff, R, { z: z + 2.4, start: 80.22, end: 81.28 }));
    });
    at(80.75, (ff) => M.send(ff, R, { start: 80.75, end: 81.81, shape: 'star', size: 0.5, vmin: 3, vmax: 5 }));
    at(81.81, (ff) => M.shot(ff, R, { start: 81.81, end: 82.34, n: 3, arc: 24, speed: 14 }));
    at(82.87, (ff) => { ff.boss.idle = 'Idle_FoldArms_Loop'; walk(ff, 0, -0.8, 1.2); ff.at(84.1, () => upper(ff, 'Interact', 0.9, { from: 0.1, to: 0.6 })); });
    for (const [s, e] of [[85.53, 86.60], [86.60, 87.66], [87.66, 88.72]]) at(s, (ff) => { const p = M.youAt(ff); R.set.stamp && R.set.stamp(ff, p, s, e); M.circle(ff, R, { x: p.x, z: p.z, r: 1.8, start: s, end: e, onImpact: () => { ff.cam.shake(0.35, 0.12); R.snd.play('thunk', { x: p.x }); R.set.waxSeal && R.set.waxSeal(ff, p); } }); R.snd.play('whoom', { x: p.x }); });
    at(88.18, (ff) => { ff.boss.perform('Spell_Simple_Shoot', { duration: 0.5 }); M.lineX(ff, R, { z: ff.player.z, w: 0.6, start: 88.18, end: 89.25 }); });
    at(89.78, (ff) => { ff.boss.idle = 'Spell_Simple_Idle_Loop'; ff.boss.loop('Spell_Simple_Idle_Loop'); M.spiral(ff, R, { t0: 89.78, count: 8, step: 0.5, arms: 2, speed: 6, turn: 22 }); });
    at(92.43, (ff) => M.clapWave(ff, R, { start: 92.43, end: 92.96, speed: 9, band: 0.6 }));
    at(92.98, (ff) => walk(ff, -1.9, -0.5, 0.5));

    // ============ §8 DON'T BELIEVE ME (93.48 -> 100.39). Nothing before 99.86 can hurt: three lies, one truth.
    // (she's put in the chair, so she sits in it: a stun she was reeling from doesn't leave her standing in the seat)
    at(93.48, (ff) => { const b = ff.boss; b.place(-1.9, -0.5, toward({ x: -1.9, z: -0.5 }, { x: 0, z: 0.8 })); b.idle = 'Sitting_Idle_Loop'; b.perform('Sitting_Enter', { duration: 0.54, then: 'Sitting_Idle_Loop', force: !b.pinned && !b.scene }); b.lockFacing = true; });
    at(94.55, (ff) => L.bluff({ shape: 'circle', x: ff.player.x, z: ff.player.z, w: 2.2, start: 94.55, end: 96.16 }));
    at(95.62, (ff) => { const a = toward(ff.boss, ff.player); L.bluff({ shape: 'rect', x: ff.boss.x, z: ff.boss.z, angle: a, w: 0.8, h: 16, start: 95.62, end: 96.70 }); });
    at(96.16, (ff) => L.bluff({ shape: 'ring', x: ff.player.x, z: ff.player.z, w: 4.2, param: 2.0, start: 96.16, end: 97.23 }));
    at(97.76, (ff) => {
      const p = M.youAt(ff);
      M.circle(ff, R, { x: p.x, z: p.z, r: 3.0, start: 97.76, end: 99.86, onImpact: (hit) => { if (hit !== 'hit' && ff.player.state !== 'dead') { L.seen(null); if (ff.boss.state === 'open') ff.boss.openFor = ff.boss.st + (100.92 - ff.t); } } });
    });

    // ============ §9 COMMENCEMENT (100.39 -> 114.70)
    at(99.86, (ff) => { ff.boss.lockFacing = false; ff.boss.idle = 'Idle_Talking_Loop'; ff.boss.perform('Sitting_Exit', { duration: 0.5 }); });
    at(100.39, (ff) => walk(ff, 0, -6.0, 1.6));
    at(101.45, (ff) => M.send(ff, R, { start: 101.45, end: 102.52, n: 5, arc: 60, shape: 'star', size: 0.42, vmin: 4, vmax: 8 }));
    at(102.52, (ff) => M.cards(ff, R, { start: 102.52, end: 103.57, n: 6, w: 11, deg: 35, speed: 9.5 }));
    at(103.05, (ff) => { const p = M.youAt(ff); M.circle(ff, R, { x: p.x, z: p.z, r: 1.3, start: 103.05, end: 104.10, onImpact: () => R.set.dust && R.set.dust(ff, p) }); });
    at(103.31, (ff) => { const a = toward(ff.player, ff.boss), p = { x: ff.player.x + Math.sin(a) * 1.6, z: ff.player.z + Math.cos(a) * 1.6 }; M.circle(ff, R, { x: p.x, z: p.z, r: 1.3, start: 103.31, end: 104.37, onImpact: () => R.set.dust && R.set.dust(ff, p) }); });
    at(103.57, (ff) => { const a = toward(ff.boss, ff.player), p = { x: ff.player.x + Math.sin(a) * 1.6, z: ff.player.z + Math.cos(a) * 1.6 }; M.circle(ff, R, { x: p.x, z: p.z, r: 1.3, start: 103.57, end: 104.63, onImpact: () => R.set.dust && R.set.dust(ff, p) }); });
    at(104.63, (ff) => { upper(ff, 'Idle_No_Loop', 0.8, { from: 0.3, to: 0.6 }); M.shot(ff, R, { start: 104.63, end: 105.70, angles: [-18, 18], speed: 14 }); });
    for (const [s, e] of [[106.23, 106.76], [107.30, 107.82]]) at(s, (ff) => { upper(ff, 'Interact', 0.5, { from: 0.3, to: 0.5 }); M.clapWave(ff, R, { start: s, end: e, speed: 8, band: 0.6 }); });
    for (const e of [108.88, 109.40, 109.94, 110.48]) { const s = e - 2 * 0.531; at(s, (ff) => { const p = M.youAt(ff); M.circle(ff, R, { x: p.x, z: p.z, r: 0.7, kind: 'pink', start: s, end: e, onImpact: () => R.snd.play('plip', { x: p.x }) }); R.set.tear && R.set.tear(ff, p, s, e); }); }
    at(108.35, () => R.snd.play('pluck', { x: 0 }));
    for (const [z, s, e] of [[-3.6, 109.40, 110.48], [-1.2, 109.94, 111.01], [1.2, 110.48, 111.54], [3.6, 111.01, 112.07]]) at(s, (ff) => M.lineX(ff, R, { z, w: 0.55, start: s, end: e, onImpact: () => { R.set.cutRibbon && R.set.cutRibbon(ff, z); R.snd.lib('k-cloth', { x: 0, gain: 0.7 }); } }));
    at(111.94, (ff) => ff.sign('GOLD STAR, STICKER ON BREAKDOWN DAY', { style: 'gilt', x: -0.6, y: 1.05, z: -8.25, height: 0.5, at: { s: 111.94 }, until: { s: 114.50 } }));
    at(112.60, (ff) => { upper(ff, 'OverhandThrow', 0.4, { from: 0.3, to: 0.6 }); R.set.slapStar && R.set.slapStar(ff); });
    at(113.14, (ff) => M.send(ff, R, { start: 113.14, end: 114.18, n: 7, arc: 90, shape: 'star', size: 0.4, vmin: 4, vmax: 8 }));

    // ============ §10 CALL YOUR SHRINK (114.70 -> 125.87). The kick is the truth; the blue light is a trap.
    at(114.70, (ff) => {
      ff.boss.idle = 'Idle_TalkingPhone_Loop'; walk(ff, 0, -1.0, 1.9);
      const boxes = R.set.boxes ? R.set.boxes() : [{ x: -7.6, z: -3.0 }, { x: 7.6, z: -3.0 }, { x: -7.6, z: 3.4 }, { x: 7.6, z: 3.4 }];
      L.inverse({ holes: boxes.map((p) => ({ x: p.x, z: p.z, r: 2.4, solid: 0.45 })), start: 114.70, end: 116.82 });
    });
    at(116.82, (ff) => { ff.boss.loop('Idle_TalkingPhone_Loop'); R.set.ring && R.set.ring(ff, [0, 1, 2, 3]); M.send(ff, R, { start: 116.82, end: 117.90, n: 3, arc: 40, vmin: 4, vmax: 10 }); });
    at(118.98, (ff) => {
      const boxes = (R.set.boxes ? R.set.boxes() : [{ x: -7.6, z: -3.0 }, { x: 7.6, z: -3.0 }, { x: -7.6, z: 3.4 }, { x: 7.6, z: 3.4 }]).map((p, i) => ({ ...p, i, d: Math.hypot(p.x - ff.player.x, p.z - ff.player.z) }));
      boxes.sort((a, b) => a.d - b.d);
      const [n1, n2, n3, far] = boxes;
      R.set.ring && R.set.ring(ff, [n1.i, n2.i, n3.i]);
      for (const q of [n2, n3]) L.bluff({ shape: 'circle', x: q.x, z: q.z, w: 3.0, start: 118.98, end: 120.05 });
      ff.at(120.05, () => R.set.ring && R.set.ring(ff, [n1.i]));
      M.circle(ff, R, { x: n1.x, z: n1.z, r: 3.0, start: 118.98, end: 121.10, onImpact: () => { R.set.burn && R.set.burn(ff, n1.i); R.snd.play('fwoomp', { x: n1.x }); ff.fx.flash(new THREE.Color(0.5, 0.6, 0.9), 0.6); } });
      ff.at(121.10, () => R.set.ring && R.set.ring(ff, []));
    });
    at(122.14, (ff) => { const a = toward(ff.boss, ff.player); L.bluff({ shape: 'rect', x: ff.boss.x, z: ff.boss.z, angle: a, w: 0.8, h: 16, start: 122.14, end: 123.20 }); });
    at(124.25, (ff) => M.circle(ff, R, { x: ff.player.x, z: ff.player.z, r: 2.2, start: 124.25, end: 125.33 }));

    // ============ §11 THE DISSERTATION (125.87 -> 133.85). A dance to punish.
    at(125.33, (ff) => { ff.boss.idle = 'Idle_Talking_Loop'; ff.boss.loop('Idle_Talking_Loop'); walk(ff, -1.5, -1.0, 0.9); });
    for (const [k, s, e] of [[0, 126.40, 127.47], [1, 126.93, 128.00]]) at(s, (ff) => {
      const sl = R.set.topple ? R.set.topple(ff, k, s, e) : null;
      if (!sl) return;
      upper(ff, 'Spell_Simple_Shoot', 0.5); R.snd.play('zap', { x: sl.x, gain: 0.6 });
      area(ff, { shape: 'rect', x: sl.x, z: sl.z, angle: sl.ang, w: 0.7, h: 2.4, kind: 'white', start: s, end: e, damage: 1, onImpact: () => { R.set.slabLands && R.set.slabLands(ff, sl); R.snd.play('thunk', { x: sl.x }); R.snd.lib('k-page', { x: sl.x }); } });
    });
    at(128.1, (ff) => walk(ff, 0, 0, 1.4));
    at(129.06, (ff) => { upper(ff, 'Interact', 0.5, { from: 0.3, to: 0.5 }); R.snd.play('clap', { x: ff.boss.x }); R.set.tossCaps && R.set.tossCaps(ff); });
    at(129.60, (ff) => { ff.boss.idle = 'Dance_Loop'; ff.boss.loop('Dance_Loop', { speed: 1.0 }); });
    for (let i = 0; i < 7; i++) {
      const e = 130.13 + i * 0.531, s = e - 2 * 0.531;
      at(s, (ff) => {
        let p = M.youAt(ff);
        if (i >= 4) { const a = (ff.t * 7.3 + i * 2.1) % (Math.PI * 2), d = 2 + ((i * 1.7) % 3); p = { x: Math.max(-10.4, Math.min(10.4, p.x + Math.sin(a) * d)), z: Math.max(-6.4, Math.min(6.4, p.z + Math.cos(a) * d)) }; }
        R.set.capBlade && R.set.capBlade(ff, p, s, e);
        M.circle(ff, R, { x: p.x, z: p.z, r: 1.0, start: s, end: e, onImpact: () => R.snd.play('thunk', { x: p.x, gain: 0.6, rate: 1.4 }) });
      });
    }
    at(133.31, (ff) => { ff.boss.idle = 'Idle_Talking_Loop'; ff.boss.perform('PickUp_Table', { duration: 0.5, from: 0.0, to: 0.5 }); });

    // ============ §12 LET GO (133.85 -> 144.46). The bridge: every yes masks a hidden no.
    at(133.85, (ff) => { const p = stepToward(ff, Math.max(0, Math.hypot(ff.boss.x - ff.player.x, ff.boss.z - ff.player.z) - 3.5)); walk(ff, p.x, p.z, 1.06); });
    at(134.94, (ff) => { upper(ff, 'Yes', 0.7, { from: 0.0, to: 0.35 }); M.thrust(ff, R, { start: 134.94, end: 135.99, w: 3.6, deg: 16 }); });
    at(136.4, (ff) => { ff.boss.behave = 'circle'; ff.boss.behaveOpts = { ...ff.boss.behaveOpts, r: 3.5, speed: 1.4, dir: 1 }; });
    at(136.52, (ff) => M.thrust(ff, R, { start: 136.52, end: 137.61, w: 3.6, deg: 16, bluff: true }));
    at(137.61, (ff) => M.thrust(ff, R, { start: 137.61, end: 138.12, w: 3.6, deg: 16 }));
    at(140.23, (ff) => M.thrust(ff, R, { start: 140.23, end: 141.28, w: 3.6, deg: 22, bluff: true }));
    at(141.28, (ff) => R.set.releaseBalloons && R.set.releaseBalloons(ff));
    at(141.81, (ff) => { ff.boss.behave = 'hold'; const a = toward(ff.player, ff.boss); const p = { x: Math.max(-9.5, Math.min(9.5, ff.boss.x + Math.sin(a) * 2.4)), z: Math.max(-5.8, Math.min(5.8, ff.boss.z + Math.cos(a) * 2.4)) }; walk(ff, p.x, p.z, 0.53, { face: false }); upper(ff, 'Spell_Simple_Enter', 0.5); });
    at(142.34, (ff) => { ff.boss.stop(); ff.boss.idle = 'Spell_Simple_Idle_Loop'; ff.boss.loop('Spell_Simple_Idle_Loop'); L.inverse({ holes: [{ x: ff.boss.x, z: ff.boss.z, r: 2.6 }], start: 142.34, end: 144.46 }); });

    // ============ §13 NOTHING MEANS WHAT I SAY (144.46 -> 161.46). The final chorus: everything.
    at(144.46, (ff) => { ff.boss.idle = 'Idle_Talking_Loop'; ff.boss.loop('Idle_Talking_Loop'); walk(ff, 0, -3.5, 1.0); });
    at(145.51, (ff) => M.send(ff, R, { start: 145.51, end: 146.57, n: 7, arc: 90 }));
    at(146.04, (ff) => { const a = toward(ff.boss, ff.player); for (const d of [-20, 0, 20]) M.laser(ff, R, { start: 146.04, end: 147.12, angle: a + d * D2R }); });
    at(147.65, (ff) => { const p = M.youAt(ff); R.set.stamp && R.set.stamp(ff, p, 147.65, 148.72); M.circle(ff, R, { x: p.x, z: p.z, r: 1.8, start: 147.65, end: 148.72, onImpact: () => { ff.cam.shake(0.35, 0.12); R.snd.play('thunk', { x: p.x }); R.set.waxSeal && R.set.waxSeal(ff, p); } }); R.snd.play('whoom', { x: p.x }); });
    at(148.8, (ff) => walk(ff, -2.2, -1.6, 2.1));
    for (const t of [149.25, 149.78, 150.31, 150.84]) at(t, (ff) => { upper(ff, 'Spell_Simple_Shoot', 0.45); M.send(ff, R, { start: t, end: t + 0.531, vmin: 5, vmax: 11 }); });
    at(150.84, (ff) => M.slam(ff, R, { start: 150.84, end: 151.90, r: 3.6 }));
    at(151.37, (ff) => M.cards(ff, R, { start: 151.37, end: 152.43, n: 6, w: 11, deg: 35, speed: 9.5 }));
    at(152.5, (ff) => walk(ff, 0, -3.5, 1.0));
    at(153.49, (ff) => { const p = M.youAt(ff); const pts = [p]; for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + 0.3; pts.push({ x: p.x + Math.sin(a) * 3.0, z: p.z + Math.cos(a) * 3.0 }); } for (const q of pts) M.circle(ff, R, { x: q.x, z: q.z, r: 1.2, start: 153.49, end: 154.56, onImpact: () => R.set.dust && R.set.dust(ff, q) }); });
    at(155.07, (ff) => L.inverse({ holes: [{ x: ff.player.x, z: ff.player.z, r: 2.6 }], start: 155.07, end: 157.21 }));
    at(155.59, (ff) => M.hearts(ff, R, { t: 155.59, n: 3, speed: Math.max(3, Math.hypot(ff.boss.x - ff.player.x, ff.boss.z - ff.player.z) / 1.09), homing: 0, arc: 24 }));
    at(157.21, (ff) => R.set.mirrorName && R.set.mirrorName(ff, 157.21, 158.28, 159.34));
    at(157.74, (ff) => M.lunge(ff, R, { start: 157.74, end: 158.81, w: 1.0, len: 8 }));
    at(159.34, (ff) => { ff.boss.perform('Spell_Simple_Shoot', { duration: 0.5 }); M.sweepBeam(ff, R, { start: 159.34, on: 159.86, off: 160.93, sweep: 140 }); });

    // ============ §14 FINAL EXAM (161.46 -> 180.54)
    at(161.46, (ff) => walk(ff, 0, -2.5, 1.0));
    for (const [s, e] of [[161.99, 163.04], [162.52, 163.57]]) at(s, (ff) => { const p = M.youAt(ff); R.set.stamp && R.set.stamp(ff, p, s, e); M.circle(ff, R, { x: p.x, z: p.z, r: 1.8, start: s, end: e, onImpact: () => { ff.cam.shake(0.35, 0.12); R.snd.play('thunk', { x: p.x }); R.set.waxSeal && R.set.waxSeal(ff, p); } }); R.snd.play('whoom', { x: p.x }); });
    at(164.65, (ff) => R.set.bow && R.set.bow(ff, 164.65, 165.18));
    at(166.77, (ff) => M.spiral(ff, R, { t0: 166.77, count: 3, step: 1, arms: 2, speed: 5.5, turn: 30, shape: 'heart', size: 0.36 }));
    at(168.37, (ff) => M.cards(ff, R, { start: 168.37, end: 169.44, n: 7, w: 11, deg: 37, speed: 9.5 }));
    at(169.95, (ff) => { ff.boss.idle = 'Idle_FoldArms_Loop'; walk(ff, 0, -5.8, 1.9); });
    // exam papers drift down from the dark
    for (let k = 0; k < 8; k++) at(169.95 + k * 0.26, (ff) => { for (let j = 0; j < 3; j++) { const x = -9 + ((k * 7 + j * 5) % 19), z = -6 + ((k * 3 + j * 11) % 12); ff.fx.emit(2, { x, y: 6.5, z, color: new THREE.Color(2.1, 2.1, 2.0), shape: 2, speed: 0.5, life: 3.6, size: 0.17, gravity: 1.6, up: 0, jitter: 1.2, drag: 1.4 }); } });
    for (const [s, e] of [[172.61, 173.67], [173.67, 174.73], [174.73, 175.79]]) at(s, (ff) => {
      const xs = R.set.aisles ? R.set.aisles() : [-6.6, -3.3, 0, 3.3, 6.6];
      const px = ff.player.x; const sorted = xs.slice().sort((a, b) => Math.abs(a - px) - Math.abs(b - px));
      upper(ff, 'Spell_Simple_Shoot', 0.5);
      for (const x of sorted.slice(0, 2)) M.lineZ(ff, R, { x, w: 0.5, start: s, end: e, onImpact: () => R.set.aisleCards && R.set.aisleCards(ff, x) });
    });
    at(175.26, (ff) => R.set.clockStrike && R.set.clockStrike(ff));
    for (const [z, s, e, k] of [[-3.75, 175.79, 176.85, 0], [-1.25, 176.32, 177.38, 1], [1.25, 176.85, 177.91, 2], [3.75, 177.38, 178.43, 3]]) at(s, (ff) => M.lineX(ff, R, { z: z + 0.9, w: 0.8, start: s, end: e, onImpact: () => R.snd.play('clack', { x: 0, rate: [1, 1.189, 1.335, 2][k] }) }));

    // ============ §15 DON'T BELIEVE ME, AGAIN (180.54 -> 191.71). Lies in the dark.
    at(180.54, (ff) => { ff.boss.idle = 'Idle_Talking_Loop'; ff.boss.behave = 'keep'; ff.boss.behaveOpts = { ...ff.boss.behaveOpts, rMin: 5, rMax: 6, speed: 1.6 }; L.bluff({ shape: 'circle', x: ff.player.x, z: ff.player.z, w: 2.2, start: 180.54, end: 181.63 }); });
    at(181.09, (ff) => M.clapWave(ff, R, { start: 181.09, end: 182.16, speed: 8, band: 0.6 }));
    at(182.70, (ff) => M.send(ff, R, { start: 182.70, end: 184.83, n: 3, arc: 40, vmin: 2, vmax: 4 }));
    at(183.25, (ff) => L.bluff({ shape: 'ring', x: ff.player.x, z: ff.player.z, w: 4.0, param: 2.0, start: 183.25, end: 184.32 }));
    at(185.36, (ff) => { const p = M.youAt(ff); R.set.stamp && R.set.stamp(ff, p, 185.36, 186.42); M.circle(ff, R, { x: p.x, z: p.z, r: 1.8, start: 185.36, end: 186.42, onImpact: () => { ff.cam.shake(0.35, 0.12); R.snd.play('thunk', { x: p.x }); R.set.waxSeal && R.set.waxSeal(ff, p); } }); R.snd.play('whoom', { x: p.x }); });
    at(186.95, (ff) => { const a = toward(ff.boss, ff.player); L.bluff({ shape: 'rect', x: ff.boss.x, z: ff.boss.z, angle: a, w: 0.8, h: 16, start: 186.95, end: 188.02 }); });
    // she steps into the moonlight at the seal's centre on 188.56: she sets off when the last lie is drawn
    at(187.0, (ff) => { ff.boss.behave = 'hold'; walk(ff, 0, 0, 1.56); });
    at(188.56, (ff) => { ff.boss.idle = 'Spell_Simple_Idle_Loop'; ff.boss.loop('Spell_Simple_Idle_Loop'); });
    at(189.09, (ff) => L.inverse({ holes: [{ x: 0, z: 0, r: 2.6 }], start: 189.09, end: 191.19 }));
    for (const t of [189.87, 190.13, 190.40, 190.66, 190.92]) at(t, (ff) => R.snd.play('tick', { x: 0, gain: 0.4 }));

    // ============ §16 COMPLETE (191.71 -> 206.44). The last flurry, then the walk to the finish.
    at(191.71, own((ff) => { ff.boss.idle = 'Idle_Talking_Loop'; ff.boss.loop('Idle_Talking_Loop'); M.send(ff, R, { start: 191.71, end: 192.79, n: 7, arc: 100 }); }));
    at(193.32, own((ff) => {
      if (near(ff, 4.5)) M.redPen(ff, R, { start: 193.32, end: 194.38 });
      else { const a = toward(ff.boss, ff.player); for (const d of [-14, 0, 14]) M.laser(ff, R, { start: 193.32, end: 194.38, angle: a + d * D2R }); }
    }));
    at(194.58, (ff) => ff.sign('NOW THANK ME FOR YOUR DEFEAT', { style: 'gilt', x: 0, y: 0.03, z: 3.4, height: 0.9, lieFlat: true, at: { s: 194.58 }, until: { s: 197.96 } }));
    at(194.91, own((ff) => { upper(ff, 'Interact', 0.8, { from: 0.0, to: 0.4 }); M.slam(ff, R, { start: 194.91, end: 195.97, r: 3.0 }); }));
    at(196.50, own((ff) => M.send(ff, R, { start: 196.50, end: 197.56, n: 5, arc: 60, shape: 'star', size: 0.42 })));
    at(197.56, own((ff) => { R.outro = true; diplomaState(197.6); ff.boss.idle = 'Idle_Loop'; ff.boss.loop('Idle_Loop'); upper(ff, 'Interact', 0.6, { from: 0.0, to: 0.3 }); R.snd.lib('k-page', { x: ff.boss.x, gain: 0.5 }); }));
    at(199.71, own((ff) => R.set.letGo && R.set.letGo(ff)));
  },

  // ---------------------------------------------------------------- hooks
  onStart(f) { this._init(f, 0); },
  // a fallback for a first frame that came without a seek (the timeline has already fired this frame's events)
  _init(f, t) {
    R.inited = true;
    coachBot(f, R);
    this._setAt(f, t, true, true);
    this._unstale(f);
  },
  _seeked(f, t) {
    if (f.state === 'rewinding' || f.state === 'encore') return;     // the fight calls onRewind for these
    const first = !R.inited;
    if (first) { R.inited = true; coachBot(f, R); }
    this._setAt(f, t, true, first);
    this._unstale(f);
  },
  // the fight puts her clock right on every jump (_now, busyUntil); her last position it doesn't: after she's put
  // somewhere else, her first frame would read as a sprint
  _unstale(f) {
    const b = f.boss;
    b.move = null; b._lastX = b.x; b._lastZ = b.z; b._speed = 0;
  },
  // everything that isn't the timeline: the set, her place and face, the negative
  _setAt(f, t, place, first = false) {
    Death.reset();
    if (!first) { R.lies.reset(); R.flashes.clear(); }
    R.seeMeT = -9; R.crowd = 0;
    R.outro = t >= 197.56;
    R.turn = null;
    R.faces.reset();
    R.set.setStateAt(t);
    const b = f.boss;
    if (place) {
      let m = MARKS[0]; for (const q of MARKS) if (t >= q[0]) m = q;
      b.place(m[1], m[2], t < 2.15 ? Math.PI : toward({ x: m[1], z: m[2] }, f.player));
    }
    b.faceTarget = t < 2.15 ? null : f.player;
    b.behave = t >= 180.54 && t < 187.0 ? 'keep' : t >= 136.4 && t < 141.81 ? 'circle' : 'hold';
    b.lockFacing = t >= 93.48 && t < 99.86;
    const idle = t < 8.53 ? 'Spell_Simple_Idle_Loop' : t >= 93.48 && t < 99.86 ? 'Sitting_Idle_Loop' : t >= 129.6 && t < 133.31 ? 'Dance_Loop' : t >= 114.7 && t < 125.33 ? 'Idle_TalkingPhone_Loop' : 'Idle_Talking_Loop';
    b.idle = idle; b.loop(idle, { force: true });
    R.fig.lookAt(null);
    this._diplomaState(f, t);
  },
  _diplomaState(f, t) { diplomaState(t); },

  onSection(f, sec, prev) { R.set.onSection && R.set.onSection(f, sec); },
  onBreak(f, i) {
    const b = f.boss;
    R.faces.flash('rpdCaught', f.t, f.beat * 0.8);
    if (i === 0) { react(f, 'Hit_Head', 0.43, { upper: 'Hit_Head' }); f.at(f.t + 0.5, () => upper(f, 'Idle_No_Loop', 1.0, { from: 0.1, to: 0.5 })); R.snd.lib('k-latch', { x: b.x, gain: 0.5, rate: 2.2 }); }
    if (i === 1) { R.fig.breakPiece('rpdHood'); react(f, 'Hit_Knockback', 0.6); }
    if (i === 2) { R.fig.breakPiece('rpdClipboard'); react(f, 'Idle_Shield_Break', 0.9); R.set.starsToYou && R.set.starsToYou(f); f.player.addMeter(0.25); }
  },
  onEmpty(f) {
    R.faces.setBase('rpdWrecked');
    const g = R.fig.acc.find((a) => a.name === 'rpdGlasses');
    if (g && g.def.lensL) { g.def.lensL.visible = false; const p = g.def.lensL.getWorldPosition(new THREE.Vector3()); f.fx.chips(p.x, p.y, p.z, new THREE.Color(2, 2.1, 2.3), 10); }
    const pt = R.fig.acc.find((a) => a.name === 'rpdPointer'); if (pt) for (const o of pt.objects) o.rotation.x += 0.18;
    f.boss.walkClip = f.boss.runClip = 'Zombie_Walk_Fwd_Loop';      // WRECKED: stiff, cracked, even on a long move
  },
  // (her death scene leaves the gold star itself, in her wax; without it the star comes off her as she breaks)
  onFinish(f) { if (!Death.did) R.set.finish && R.set.finish(f); },
  // her bow (the fight then seeks back to the final chorus and calls onRewind)
  onEncore(f) { f.boss.perform('PickUp_Table', { duration: 0.9 }); },
  // a rewind, or the ENCORE's seek back to the final chorus. Safe to run twice: it only puts things back.
  onRewind(f, t) {
    // the fight put her health and pieces back (and on a rewind her place); the rest of the set is ours
    const b = f.boss;
    R.fig.restorePieces(b.broken);
    for (const [name, n] of [['rpdHood', 2], ['rpdClipboard', 3]]) { const a = R.fig.acc.find((x) => x.name === name); if (!a) continue; if (b.broken >= n && !a.broken) { a.broken = true; a.def.broken = true; for (const o of a.objects) o.visible = false; } }
    if (b.state !== 'desperate') { R.faces.setBase(faceAt(t)); b.walkClip = b.runClip = 'Walk_Formal_Loop'; const g = R.fig.acc.find((a) => a.name === 'rpdGlasses'); if (g && g.def.lensL) g.def.lensL.visible = true; }
    this._setAt(f, t, f.state === 'encore');          // the ENCORE: she takes her mark for the final chorus
    this._unstale(f);
  },
  onSpotlight(f, on) { R.set.spotlight && R.set.spotlight(f, on); },
  death,

  update(f, dt) {
    if (!R.inited) this._init(f, f.t);
    const t = f.t, b = f.boss;
    // her death scene (death.js) has the two of them: nothing here moves her, turns her, or paces her stride. What's
    // left is what the scene itself leans on: her face, her eyes, the negative and her circle on the floor.
    if (Death.on) { try { Death.tick(f, dt); } catch (e) { if (!R.deathErr) { R.deathErr = true; console.error('rpd death scene', e); } } }
    if (b.scene) {
      if (R.camO && f.cam.override === R.camO) f.cam.override = null;
      R.faces.update(t);
      R.fig.lookAt(new THREE.Vector3(f.player.x, 1.5 + f.player.y, f.player.z));
      R.lies.update();
      R.flashes.update(t);
      NEG.uRpdExpo.value = f.app.post.fx.exposure;
      R.crowd = 0; R.lastHearts = f.player.hearts; R.lx = b.x; R.lz = b.z; R.lastBeat = Math.floor(f.bm.beatAt(t));
      return;
    }
    // her turn at the start (two beats, while the laser dot slides down the wall)
    if (R.turn) { const k = THREE.MathUtils.clamp((t - R.turn.t0) / (R.turn.t1 - R.turn.t0), 0, 1); const want = toward(b, f.player); let d = want - R.turn.from; d = Math.atan2(Math.sin(d), Math.cos(d)); b.facing = R.turn.from + d * (k * k * (3 - 2 * k)); b.lockFacing = k < 1; if (k >= 1) { R.turn = null; b.lockFacing = false; b.faceTarget = f.player; } }
    else if (t >= 2.15 && !b.faceTarget && t < 93.48) b.faceTarget = f.player;
    // the entrance: the picture looks over YOUR shoulder at the screen (YOUR shadow on the slide), then settles into
    // the fight's camera as the bass comes in. YOU move from the first frame; only the framing is held.
    const ek = t < 3.4 ? 1 : 1 - THREE.MathUtils.smoothstep(t, 3.4, 4.7);
    if (ek > 0.001 && f.state === 'play') {
      if (!R.camO) R.camO = { pos: new THREE.Vector3(), look: new THREE.Vector3(), k: 0 };
      R.camO.pos.set(f.player.x * 0.35, 6.4, f.player.z + 10.2); R.camO.look.set(f.player.x * 0.2, 1.7, f.player.z - 4.2);
      R.camO.k = ek * ek * (3 - 2 * ek);
      f.cam.override = R.camO;
    } else if (R.camO && f.cam.override === R.camO) f.cam.override = null;
    if (b.state !== 'desperate') R.faces.base = faceAt(t);
    // when YOU is hit: the smirk, and a slow, smug nod
    const hp = f.player.hearts;
    if (R.lastHearts !== undefined && hp < R.lastHearts && hp > 0 && b.state === 'perform') { R.faces.flash('rpdSmirk', t, f.beat * 1.5); if (!b.busy) upper(f, 'Yes', 0.9, { from: 0.05, to: 0.4 }); }
    R.lastHearts = hp;
    R.faces.update(t);
    if (t > 2.4) R.fig.lookAt(new THREE.Vector3(f.player.x, 1.5, f.player.z));
    R.lies.update();
    R.flashes.update(t);
    NEG.uRpdExpo.value = f.app.post.fx.exposure;
    // SEE ME AFTER CLASS: crowd her while nothing is winding up and she answers with the pointer
    this._seeMe(f);
    // her patent heels on the lacquer: one crisp tick on each beat she walks
    const beatN = Math.floor(f.bm.beatAt(t));
    const sp = dt > 0 ? Math.hypot(b.x - (R.lx ?? b.x), b.z - (R.lz ?? b.z)) / dt : 0;
    R.lx = b.x; R.lz = b.z;
    if (beatN !== R.lastBeat) { if (sp > 0.45 && sp < 6 && b.state !== 'finished') R.snd.play('heel', { x: b.x }); R.lastBeat = beatN; }
    // the outro: she walks to YOU, slowly, attacking nothing
    if (R.outro && b.state !== 'finished' && !b.busy) {
      const d = Math.hypot(f.player.x - b.x, f.player.z - b.z);
      if (d > 1.8 && !b.move) { const a = toward(b, f.player); const s = Math.min(0.65, d - 1.6); b.moveTo(b.x + Math.sin(a) * s, b.z + Math.cos(a) * s, 0.53, { easing: 'linear' }); }
    }
  },
  // her stride's pace. The fight's boss picks her walk now (WRECKED too), but she never runs, so her walk is also her
  // run (walkClip === runClip) and the boss paces it as a run (speed / 3.4: a slow-motion walk sliding over the floor).
  // Paced as a walk, a long move is a brisk march; WRECKED, a stiffer 0.85. Called from her figurine's update (above).
  _stride(b) {
    const r = b.rig;
    if (!r || !r.base || b.scene || b.busy || b.state === 'finished' || r.baseName !== b.walkClip) return;
    r.base.timeScale = THREE.MathUtils.clamp(b._speed / 1.3, 0.75, 2.2) * (b.state === 'desperate' ? 0.85 : 1);
  },
  _seeMe(f) {
    const t = f.t, b = f.boss, pl = f.player;
    if (!SEE_ME.some(([a, c]) => t >= a && t <= c) || f.suppress || b.state !== 'perform' || b.busy) { R.crowd = 0; return; }
    const d = Math.hypot(pl.x - b.x, pl.z - b.z);
    if (d > 2.2 || R.lies.inv) { R.crowd = 0; return; }
    R.crowd = (R.crowd || 0) + f.dt;
    if (R.crowd > f.beat && t - (R.seeMeT || -9) > f.beat * 3) {
      // she answers on the next beat, unless something of hers already lands around then (one thing at a time)
      const nb = f.bm.nearest(t + f.beat, 1), end = Math.max(t + f.beat * 0.8, nb.time);
      if (f.tele.list.some((g) => !g.dead && g.end > t && g.end < end + f.beat * 0.6)) return;
      R.seeMeT = t; R.crowd = 0;
      M.thrust(f, R, { start: t, end });
    }
  },
};
