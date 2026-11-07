// B1 · KISS ME LIKE A CAR CRASH · THE WRECK. The middle of the highway at night: her car and yours nose to nose,
// headlights on. She only ever comes toward you and she never brakes; every charge that misses you ends in whatever
// was behind you, and the further she ran, the harder she hits it. Make her come a long way, then don't be there.
// (design: research/tracks/kiss-me-like-a-car-crash.md; bars below are the design's, bars.py numbering)
import * as THREE from 'three';
import { Arena } from '../../game/arena.js';
import { CharacterKit } from '../../engine/character.js';
import { buildFigurine } from '../../game/figurine.js';
import { Boss } from '../../game/boss.js';
import { FEEL } from '../../game/player.js';
import { inShape } from '../../game/choreo.js';
import { WRECK, paintWounds, heartGeometry, looseGrenade } from './her.js';
import { Road, FLOOR, BOULDERS, SLOTS, STOPPED_X, LANE_Z } from './road.js';
import { Her, U, UC, arc, area, lob } from './moves.js';
import { Sounds } from './sounds.js';
import { flare } from './kit.js';

const ID = 'kiss-me-like-a-car-crash';
let kit = null;
let W = null;            // this fight's world: { f, road, her, snd, B, ... }

// section starts (design bars) and where each rewind puts you both: [bar, YOU, her]
const SECTIONS = [
  ['intro', -1.4, [7.9, 2.9], [-4.4, 1.4]], ['chorus1', 9, [6, 3], [-2, 1.5]], ['post', 16, [-3, 3], [5, 1.5]], ['verse1', 22, [5, 4], [-4, 1]],
  ['chorus2', 34, [6, 4], [1, 2]], ['verse2', 53, [2, 4], [-6, 2]], ['pre2', 62, [3, 4], [-5, 1]], ['bridge', 71, [1.5, 1.5], [-1.0, 1.5]],
  ['final', 80, [3, 4], [-4, 1]], ['goodbye', 94, [4, 3], [-3, 1]],
];

function giftBox() {
  const g = new THREE.Group();
  const pink = new THREE.MeshPhysicalMaterial({ color: 0xf07aa6, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc35a, roughness: 0.25, metalness: 1 });
  const h = new THREE.Mesh(heartGeometry(0.34, 0.2), pink); h.rotation.x = -Math.PI / 2; h.castShadow = true; g.add(h);
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.34), gold); r1.position.y = 0.075; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.045, 0.03), gold); r2.position.y = 0.075; g.add(r2);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), new THREE.MeshBasicMaterial({ color: 0xf6f1e8 })); face.rotation.x = -Math.PI / 2; face.position.set(0.07, 0.1, 0.04); g.add(face);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.05), new THREE.MeshBasicMaterial({ color: 0x111111 })); hand.position.set(0.07, 0.103, 0.055); g.add(hand);
  g.scale.setScalar(1.25);
  return g;
}

export default {
  id: ID, beats: ID, par: 75000, lastHit: 148.208,
  spawn: { player: [7.9, 2.9, -Math.PI / 2], boss: [-4.4, 1.4, Math.PI / 2] },

  // ------------------------------------------------------------------ the set
  // she only ever comes toward you (the one step back is the finisher's, below), and the road has its own things to
  // break: no shared knockback, no porcelain ornaments
  knockback: false, setPieces: false,

  async buildArena(f) {
    const arena = await Arena.load(`assets/arenas/${ID}/${ID}.json`, f.app.renderer, f.scene, { camera: f.cam.cam });
    arena.prepareCamera(f.cam.cam);
    arena.setState('sodium');
    const bm = f.bm;
    const B = (bar, beat = 1) => bm.timeOf(1 + 4 * bar + (beat - 1));
    const road = new Road(f, arena, B);
    const snd = new Sounds(f);
    W = { f, arena, road, snd, B, stuck: [], puddles: [], giftBox, lastT: -1, init: false, ep: 0, cues: [] };
    // YOU's spotlight sweeps her shapes off the road (fight.js clears every telegraph) and they must never land after
    // it (moves.js: W.ep). The road's own shapes (the barriers, the cars coming in, the grenade, a package already in
    // the air, the fires) stay drawn through it and land as drawn: they're added past the spotlight's filter and kept
    // when it clears. A cleared shape is marked dead, so whatever drew it knows.
    const tele = f.tele, rawAdd = Object.getPrototypeOf(tele).add, clr = tele.clear.bind(tele);
    W.addWorld = (o) => { const g = rawAdd.call(tele, o); g.world = true; return g; };
    // (the kit's clear marks everything dead: the road's shapes it keeps come back alive)
    tele.clear = () => { const keep = f.state === 'play' && f.suppress ? tele.list.filter((g) => g.world && !g.dead) : []; clr(); for (const g of keep) g.dead = false; tele.list.push(...keep); };
    W.her = new Her(W);
    // tests read the set's state through this (the stepped clock only)
    if (f.manual) window.__kmlW = () => W;
    if (f.manual) window.__kmlState = () => { if (!W) return null; const r = W.road, b = f.boss, fig = b.fig; const nade = fig && fig.acc.find((a) => a.name === 'grenade');
      return { light: r.stateAt(f.t).map((v) => (typeof v === 'number' ? +v.toFixed(2) : v)).join(' '), car: `${r.herCar.mode} ${r.herCar.x.toFixed(1)},${r.herCar.z.toFixed(1)}`, broken: r.state.youBroken.length,
        cones: r.cones.filter((c) => c.st === 'up').length, horses: r.horses.filter((c) => c.st === 'up').length, rocks: r.rocks.map((q) => (q.obj.visible ? q.s.hits : 'x')).join(''),
        walls: r.walls.map((w) => (w.obj.visible ? 1 : 0)).join(''), marks: r.marks.length, carve: r.state.carve, puddles: W.puddles.length, nadeOnSash: nade ? nade.objects[0].visible : null,
        mode: W.her.mode, act: W.her.act ? W.her.act.name : null, stopped: r.stopped.filter((q) => q.car.root.visible).length, pin: r.pin.visible }; };
    W.puddle = (x, z) => { W.puddles.push({ x, z }); road.addMark('puddle', x, z, { r: 1.2 }); road.setPuddles(W.puddles); };
    // one real-time light for flashes on the characters (crashes, the blast, the lighter, fire), always there
    const fl = W.flash = new THREE.PointLight(0xffc080, 0, 12, 2); fl.position.set(0, 2, 0); f.scene.add(fl);
    W.flashK = 0; W.flashD = 0.2;
    // a soft fill on the characters and cars (the set itself takes no real-time light): night sky over, wet road under
    W.hemi = new THREE.HemisphereLight(0x8c90d8, 0x241a1c, 0.5); f.scene.add(W.hemi);
    W.flashAt = (x, y, z, k, dur = 0.2, color) => { fl.position.set(x, Math.max(2.8, y + 1.6), z); fl.color.copy(color || new THREE.Color(1, 0.75, 0.45)); W.flashK = Math.max(W.flashK, k); W.flashD = dur; };
    const base = arena.resolve.bind(arena);
    const w = {
      arena, bounds: { minX: -11, maxX: 11.5, minZ: -6.5, maxZ: 7 },
      resolve: (x, z, r) => { const p = base(x, z, r); return road.resolve(p.x, p.z, r); },
      update(dt, t, ff) {
        road.update(dt, t, ff);
        arena.update(dt, ff.cam.cam, ff.player.root.position);
        const [sa, sb, sk] = road.stateAt(t), EX = { sodium: 0.72, dark: 0.72, stopped: 0.55, search: 0.7, fire: 0.7, dawn: 1.02 };   // (first light is the brightest the road gets)
        ff.app.post.fx.exposure = arena.exposure * ((EX[sa] ?? 0.72) * (1 - sk) + (EX[sb] ?? 0.72) * sk);
      },
      dispose() { snd.stopAll(); road.dispose(); arena.dispose(); f.scene.remove(fl); if (W && W.hemi) f.scene.remove(W.hemi); if (W && W.f === f) W = null; },
    };
    return w;
  },

  // ------------------------------------------------------------------ THE WRECK
  async buildBoss(f) {
    if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
    const fig = await buildFigurine(kit, WRECK);
    f.scene.add(fig.root);
    paintWounds(fig);
    // the finish's shatter flies on along her last run (or lifts gently out of YOU's hands)
    const shat = fig.shatter.bind(fig);
    fig.shatter = (o = {}) => shat({ ...o, ...(W && W.shatterHow ? W.shatterHow : {}) });
    const b = new Boss({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE WRECK', hp: 2300, notches: [0.75, 0.5, 0.25], pieces: ['sweep', 'shoulder_l', 'face'], radius: 0.8 });
    // porcelain this thick: a blade chips her (every hit still shows and still moves the bar), the road breaks her
    const take = b.takeHit.bind(b);
    b.takeHit = (info) => take(info.kind === 'strike' ? { ...info, dmg: info.dmg * 0.5 } : info);
    // she takes hits like compliments: a small step toward you, chin up; one in four earns a nod and the grin;
    // a finisher knocks her back half a metre (the only backward step she ever takes) and she steps straight back in
    let nHits = 0;
    b.on('hit', (h) => {
      if (!W || h.kind !== 'strike' || W.her.act || b.state === 'desperate') return;
      const p = f.player, a = Math.atan2(p.x - b.x, p.z - b.z), d = Math.hypot(p.x - b.x, p.z - b.z);
      if (h.heavy) { b.x -= Math.sin(a) * 0.5; b.z -= Math.cos(a) * 0.5; b._sync(); if (b.rig) b.rig.upperOnce('Hit_Chest', { duration: 0.3 }); return; }
      if (d > 1.3) { b.x += Math.sin(a) * 0.1; b.z += Math.cos(a) * 0.1; b._sync(); }
      if (++nHits % 4 === 0) { W.her.expr('wreck_grin'); if (b.rig) b.rig.upperOnce('Yes', { duration: 0.6 }); f.after(0.9, () => { if (W && !W.her.act) W.her.expr(W.her.mode === 'plea' ? 'wreck_plea' : 'wreck_stare'); }); }
    });
    b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop');
    b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Jog_Fwd_Loop';
    b.faceTarget = f.player;
    fig.setExpression('wreck_stare', { fade: 0.01 });
    const a = W.arena; a.addCaster(f.player.root); a.addCaster(fig.root); a.addCaster(W.road.you.root); a.addCaster(W.road.her.root); for (const r of W.road.rocks) a.addCaster(r.obj);
    // her headlight eyes: two points of light in the dark
    const head = fig.bones.Head;
    W.eyes = [];
    for (const s of ['l', 'r']) {
      const e = fig.I.EYE[s]; if (!e) continue;
      const m = fig.boneLocal('Head', new THREE.Matrix4().makeTranslation(e.c.x, e.c.y, e.c.z + e.r * 0.9));
      const sp = flare(new THREE.Color(3.2, 3.0, 2.8), 0.18 / fig.scale); sp.position.setFromMatrixPosition(m); sp.visible = false; head.add(sp); W.eyes.push(sp);
    }
    // YOU's lighter: a small copper lighter in the left hand, a flame
    const hand = f.player.h.rig.bones.hand_l;
    if (hand) {
      const lg = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 0.015), new THREE.MeshStandardMaterial({ color: 0xb8733a, metalness: 1, roughness: 0.3 })); lg.add(body);
      const fl = flare(new THREE.Color(3.4, 2.2, 0.9), 0.22); fl.position.y = 0.07; lg.add(fl);
      lg.position.set(0, 0.08, 0.04); lg.visible = false; hand.add(lg); W.lighter = lg; W.lighterFlame = fl;
    }
    return b;
  },

  // ------------------------------------------------------------------ the song, bar by bar
  script(T, f) {
    const B = (bar, beat = 1) => T.beats.timeOf(1 + 4 * bar + (beat - 1));
    // every scripted moment (her idle kiss never cuts in front of one)
    const at = (bar, beat, fn) => { if (W) W.cues.push(B(bar, beat)); return T.at({ s: B(bar, beat) }, fn); };
    const H = () => W.her;
    const far = (m) => W.her.dist() > m;
    for (let i = 0; i < SECTIONS.length; i++) {
      const [name, bar] = SECTIONS[i];
      const t0 = i === 0 ? 0 : B(bar, 1), t1 = i + 1 < SECTIONS.length ? B(SECTIONS[i + 1][1], 1) : 151;
      T.section(name, { s: t0 }, { s: t1 }, { close: name === 'bridge', final: name === 'final' });
    }

    // ---------------- S1 · INTRO: the hook sung cold; the shapes, one at a time
    // she stands in YOU's headlights, singing, until her car's light answers; then she struts at YOU
    T.at({ s: 0.126 }, () => { W.snd.play('click', { x: 6, gain: 0.6 }); });
    at(1, 1, () => { H().setMode('intro'); });
    at(2, 1, () => H().kiss({ impact: B(2, 4) }));                                       // "taste the wreck": pink is catchable
    at(3, 1, () => H().bomb({ land: B(4, 1), blast: B(5, 1), peak: 5 }));                // "Fuck": the bomb
    at(5, 3, () => { W.snd.play('snap', { x: f.boss.x }); H().headTurn = Math.PI; H().headTurnT = 1; f.after(0.14, () => { H().headTurnT = 0; H().headTurn = 0; }); });
    at(6, 1, () => { if (!far(5)) H().whiplash({ impact: B(6, 4) }); });                 // standing still near her is punished
    at(7, 2, () => { W.snd.play('rumble', { x: 0, gain: 0.8 }); for (let i = 0; i < 6; i++) f.fx.dust(-8 + i * 3.2, -6.5, 6); });
    at(8, 1, () => landslide(f, B));

    // ---------------- S2 · CHORUS 1 + THE STOP
    at(9, 1, () => { H().setMode('approach'); f.cam.shake(0.9, 0.3); W.snd.play('concrete', { x: 0, gain: 1 }); });
    at(9, 4, () => H().burial({ lock: B(10, 2), impact: B(10, 4) }));
    at(11, 3, () => H().setMode('plea', B(13, 1)));                                     // "Don't care if you kill me"
    at(13, 2, () => H().grab({ impact: B(13, 4) }));                                     // "just please"
    at(14, 1, () => { H().setMode('stand'); H().expr('wreck_stare'); if (f.boss.rig) f.boss.rig.play('Idle_No_Loop', { fade: 0.2 }); W.eyesFlare = f.t; });
    at(14, 2, () => H().headOn({ lock: B(14, 3.5), impact: B(15, 1), always: true }));  // the band stops: she's coming (always the head-on: it's the lesson)
    at(15, 1, () => { f.after(f.beat * 3, () => H().setMode('approach')); });

    // ---------------- S3 · POST
    at(16, 1, () => { H().setMode('approach'); H().expr('wreck_grin'); });
    at(16, 3, () => H().kiss({ impact: B(17, 1) }));
    at(17, 1, () => H().kiss({ impact: B(17, 3) }));
    at(18, 1, () => H().headOn({ lock: B(18, 3), impact: B(19, 1) }));
    at(20, 2, () => { if (far(4)) H().blownKiss({ impact: B(20, 4) }); else H().kissLunge({ impact: B(20, 3) }); });

    // ---------------- S4 · VERSE 1: THE DOORSTEP AND THE DARK
    at(22, 3, () => { W.s4far = false; if (!far(5)) H().kissLunge({ impact: B(22, 4) }); });
    at(23, 1, () => { if (far(5)) { W.s4far = true; H().headOn({ lock: B(23, 3), impact: B(24, 1) }); } });
    at(23, 3, () => { if (!W.s4far) H().kissLunge({ impact: B(23, 4) }); });
    at(24, 3, () => { if (!W.s4far) H().kissLunge({ impact: B(24, 4) }); });
    for (const [bar, beat] of [[25, 4], [26, 1], [26, 2], [26, 3]]) at(bar, beat, () => W.snd.play('pop', { x: [-12, -4, 4, 12][[[25, 4], [26, 1], [26, 2], [26, 3]].findIndex(([a, b]) => a === bar && b === beat)], gain: 0.9 }));
    at(26, 1, () => { W.snd.play('flick', { x: f.player.x }); });                        // "You flipped a lighter"
    at(26, 4, () => { W.snd.play('pop', { x: 6, gain: 0.7 }); W.snd.play('pop', { x: -6, gain: 0.7, at: 0.03 }); });
    at(27, 2, () => H().kiss({ impact: B(27, 4) }));                                    // out of the dark (a lunge if YOU is in her arms)
    at(27, 4, () => H().kiss({ impact: B(28, 2) }));
    at(28, 1, () => H().headOn({ lock: B(28, 3), impact: B(29, 1) }));                 // her eyes go out: she's coming
    at(30, 2, () => H().setMode('slow', B(33, 1)));                                     // the bruises: a punish window
    at(32, 1, () => W.snd.play('clink', { x: f.player.x }));
    at(32, 4, () => { if (!far(4)) H().grab({ impact: B(33, 2) }); });
    at(33, 1, () => H().setMode('approach'));

    // ---------------- S5 · PRE 1 + CHORUS 2: I ONLY BREAK THE THINGS I WANT TO KEEP / CAR CRASH
    for (const [bar, beat] of [[34, 2], [34, 4], [35, 2], [35, 4], [36, 2], [36, 4], [37, 2], [37, 4]]) at(bar, beat - 1, () => smash(f, B(bar, beat)));
    at(37, 4, () => { W.engine && W.engine.stop(0.1); W.engine = W.snd.loop('engine', { x: W.road.herCar.x, gain: 0.9 }); });
    at(38, 1, () => H().grab({ impact: B(38, 3), hold: true, onHold: () => { H().held.until = B(39, 1) + 0.05; } }));
    at(38, 2, () => carCharge(f, { lock: B(38, 3), impact: B(39, 1) }));
    at(40, 2, () => { if (H().act && H().act.name === 'down') return; H().expr('wreck_grin'); if (f.boss.rig) f.boss.perform('Dance_Loop', { duration: f.beat * 2 }); });
    at(41, 2, () => H().bomb({ land: B(42, 1), blast: B(43, 1), peak: 4.5 }));
    at(43, 3, () => { W.snd.play('snap', { x: f.boss.x }); if (far(5)) { W.s5far = true; H().headOn({ lock: B(44, 2), impact: B(44, 4), always: true }); } else W.s5far = false; });
    at(44, 1, () => { if (!W.s5far) H().whiplash({ impact: B(44, 4) }); });
    at(45, 2, () => { W.snd.play('rumble', { x: 0, gain: 0.9 }); });
    at(46, 1, () => rollingRocks(f, B));
    at(47, 3, () => H().burial({ lock: B(48, 2), impact: B(48, 4) }));
    at(49, 2, () => H().setMode('plea', B(51, 2)));
    at(51, 2, () => H().grab({ impact: B(51, 4) }));
    at(52, 1, () => { H().setMode('approach'); H().headOn({ lock: B(52, 3), impact: B(53, 1) }); });

    // ---------------- S6 · VERSE 2: THE DRYWALL AND THE WHISKEY
    at(54, 1, () => carve(f, B));
    at(55, 1, () => { if (f.boss.rig && !(H().act)) { f.boss.perform('Consume', { duration: f.beat * 2 }); W.snd.play('splash', { x: f.boss.x, gain: 0.25, rate: 2.2 }); } H().expr('wreck_grin'); });
    const throws = [[55, 4], [56, 2], [56, 4], [57, 2], [57, 4], [58, 2], [58, 4], [59, 2]];
    for (const [bar, beat] of throws) at(bar, beat, () => H().bottle({ land: B(bar, beat + 2) }));
    at(59, 4, () => ignite(f, B));
    at(61, 1, () => H().headOn({ lock: B(61, 3), impact: B(62, 1), burning: true }));

    // ---------------- S7 · PRE 2: THE WARNINGS
    at(62, 1, () => { if (H().alight) { H().alight = false; W.snd.play('hiss', { x: f.boss.x, gain: 0.8 }); f.fx.dust(f.boss.x, f.boss.z, 10); } });
    at(62, 2, () => H().pounce({ lock: B(62, 3), land: B(63, 1) }));
    at(64, 1, () => windows(f, B));
    for (let i = 0; i < 4; i++) {
      const [x, z0, z1] = SLOTS[i];
      const fillFrom = [B(65, 1), B(66, 1), B(67, 1), B(67, 1)][i], up = [B(66, 1), B(67, 1), B(68, 1), B(68, 3)][i];
      T.at({ s: fillFrom }, () => area(f, { shape: 'rect', x, z: z0, angle: 0, w: 0.45, h: z1 - z0, kind: 'white', start: fillFrom, end: up, damage: 1, world: true,
        onImpact: (hit) => { W.snd.play('hiss', { x, gain: 0.9 }); if (hit === 'hit') { const p = f.player; p.vx = (p.x >= x ? 1 : -1) * 12; } } }));
    }
    at(66, 2, () => H().headOn({ lock: B(66, 4), impact: B(67, 2) }));
    at(68, 1, () => { H().endAct(); H().setMode('dead'); if (f.boss.rig) f.boss.rig.once('Death01', { duration: 0.6, then: null }); f.boss.busyUntil = B(69, 1); H().claim(B(69, 1)); });
    at(68, 4, () => W.snd.play('flick', { x: -1.6, gain: 0.5 }));
    at(69, 1, () => countdown(f, B));
    at(70, 4, () => landBefore(f, B));

    // ---------------- S8 · BRIDGE: FACE TO FACE / THE PIN
    at(71, 1, () => { W.snd.play('click', { x: 0, gain: 1 }); W.rotor && W.rotor.stop(0.1); W.rotor = W.snd.loop('rotor', { pan: 0, gain: 0.8, fadeIn: 0.6 }); H().endAct(); H().setMode('stand'); H().parries = 0; H().expr('wreck_stare'); });
    at(71, 1, () => H().kissLunge({ impact: B(71, 2), r: 3.0, half: 30, lunge: 1.0 }));
    at(71, 3, () => H().kissLunge({ impact: B(71, 4), r: 3.0, half: 30, lunge: 1.0 }));
    at(72, 1, () => { H().expr('wreck_plea'); if (W.eyes) W.closed = true; if (H().parries >= 2) f.boss.open(f.beat * 2.5); });
    at(73, 1, () => { W.closed = false; H().parries = 0; H().kissLunge({ impact: B(73, 2), r: 3.0, half: 30, lunge: 1.0 }); });
    at(73, 2, () => backhand(f, B(73, 3)));
    at(73, 3, () => H().kissLunge({ impact: B(73, 4), r: 3.0, half: 30, lunge: 1.0 }));
    at(74, 1, () => { H().expr('wreck_plea'); if (H().parries >= 2) f.boss.open(f.beat * 2.5); });
    at(74, 4, () => { H().grenadeOff(); if (f.boss.rig) f.boss.rig.upperOnce('Interact', { duration: 0.35, from: 0.1, to: 0.6 }); });
    at(75, 1, () => { if (f.boss.rig) f.boss.rig.upperOnce('Interact', { duration: 0.33, from: 0.35, to: 0.7 }); });
    at(75, 2, () => { H().expr('wreck_grin'); });
    at(75, 3, () => { W.snd.play('ping', { x: f.boss.x, gain: 1 }); W.road.pinAt = { x: f.boss.x + 0.35, z: f.boss.z + 0.45 }; f.fx.glitter(f.boss.x, 1.4, f.boss.z, new THREE.Color(3.2, 2.2, 0.6), 8, 0.2); });
    at(75, 4, () => throwGrenade(f, B));
    at(76, 4, () => { H().setMode('zombie'); H().expr('wreck_kiss'); });
    for (const [bar, beat] of [[76, 4], [77, 1], [77, 2], [77, 3], [77, 4], [78, 1], [78, 2]]) at(bar, beat, () => { if (W.her.dist() < 1.5 && !(H().act)) H().grab({ impact: f.t + f.beat }); });
    STOPPED_X.forEach((x, i) => {
      const k = [1, 3, -1, 2, 0][i]; if (k < 0) return;
      const hit = [B(77, 2), B(77, 4), B(78, 2), B(78, 4)][k];
      T.at({ s: hit - (B(77, 4) - B(77, 2)) }, () => { area(f, { shape: 'rect', x, z: -3.3, angle: 0, w: 1.0, h: 3.2, kind: 'white', start: f.t, end: hit, damage: 1, world: true, onImpact: (h) => { W.snd.play('concrete', { x, gain: 1 }); W.snd.play('crunch', { x, gain: 0.7, at: 0.02 }); f.cam.shake(0.5, 0.15); f.fx.chips(x, 0.6, -3.3, new THREE.Color(1.4, 1.35, 1.3), 24); if (h === 'hit') { f.player.vz = 12; } } }); });
    });
    at(79, 1, () => { H().setMode('approach'); W.rotor && W.rotor.set({ gain: 0.4 }); H().headOn({ lock: B(79, 3), impact: B(80, 1), always: true }); });
    at(80, 1, () => blast(f));

    // ---------------- S9 · FINAL CHORUS: EVERYTHING
    at(80, 2, () => { W.rotor && W.rotor.stop(0.6); W.rotor = null; });
    at(81, 1, () => { H().setMode('approach'); H().headOn({ lock: B(81, 3), impact: B(82, 1) }); });
    at(82, 4, () => H().bomb({ land: B(83, 1), blast: B(84, 1), peak: 3 }));
    at(83, 2, () => H().bomb({ land: B(83, 3), blast: B(84, 1), peak: 3 }));
    at(84, 3, () => { if (far(5)) { W.s9far = true; H().headOn({ lock: B(85, 2), impact: B(85, 4), always: true }); } else W.s9far = false; });
    at(84, 4, () => { W.snd.play('snap', { x: f.boss.x }); });
    at(85, 1, () => { if (!W.s9far) H().whiplash({ impact: B(85, 4) }); });
    at(86, 4, () => dive(f, B));
    at(90, 2, () => H().setMode('plea', B(92, 2)));
    at(92, 2, () => H().grab({ impact: B(92, 4) }));
    at(93, 1, () => { H().setMode('approach'); H().headOn({ lock: B(93, 3), impact: B(94, 1) }); });

    // ---------------- S10 · THE LAST INSTRUMENTAL: GOODBYE (A: the bar is empty; B: the fight goes on)
    const empty = () => f.boss.hp <= 0;
    at(94, 3, () => { if (empty()) { H().setMode('away'); W.goodbye = true; } });
    at(95, 2, () => { if (!empty()) H().headOn({ lock: B(95, 4), impact: B(96, 1) }); });
    at(97, 1, () => { if (empty()) { H().setMode('stand'); H().expr('wreck_wrecked'); } else H().kiss({ impact: B(97, 3) }); });
    at(97, 3, () => { if (!empty()) H().kiss({ impact: B(98, 1) }); });
    at(97, 4, () => { if (empty()) { H().expr('wreck_plea'); f.boss.facing = Math.atan2(f.player.x - f.boss.x, f.player.z - f.boss.z) * 0.5 + f.boss.facing * 0.5; } });
    at(98, 2, () => { if (!empty()) H().headOn({ lock: B(98, 4), impact: B(99, 1) }); });
    at(100, 3, () => { if (empty()) { H().setMode('stand'); f.boss.faceTarget = f.player; } });
    at(101, 1, () => { if (!empty()) H().grab({ impact: B(101, 3) }); });
    at(102, 1, () => { if (empty()) { H().setMode('stand'); if (f.boss.rig) f.boss.rig.play('Crouch_Idle_Loop', { fade: 0.3 }); f.boss.busyUntil = B(104, 1); W.beam = true; } });
    at(102, 2, () => { if (!empty()) H().headOn({ lock: B(102, 4), impact: B(103, 1) }); });
    at(103, 1, () => { if (empty()) lastRun(f, B, 'pink'); });
    at(104, 1, () => { if (!W.lastRun) lastRun(f, B, empty() ? 'pink' : 'white'); });
  },

  // ------------------------------------------------------------------ hooks
  // (both put the set where it is at t; update's own catch for a jump back is for a start part-way in)
  onStart(f) { setStateAt(f, 0, true); if (W) { W.init = true; W.lastT = 0; } },
  onRewind(f, t) { setStateAt(f, t, true); if (W) { W.init = true; W.lastT = t; } },
  onSection(f, sec) { if (W) { W.snaps = W.snaps || {}; W.snaps[sec.name] = W.road.snapshot(); } },
  onBreak(f, i) {
    const fig = f.boss.fig; if (!fig) return;
    W.snd.play('glass', { x: f.boss.x, gain: 1 });
    if (!W.her.act) { W.her.endAct(); f.boss.perform('Idle_Shield_Break', { duration: f.beat * 2 }); }
    if (i === 1) { fig.breakPiece('studs_l'); W.snd.play('clink', { x: f.boss.x, at: 0.1 }); W.snd.play('clink', { x: f.boss.x + 1, at: 0.25 }); }
    if (i === 2) { W.oneEye = true; }
    W.her.expr('wreck_grin');
  },
  onEmpty(f) { W.her.expr('wreck_wrecked'); W.her.mode = W.her.mode === 'stand' ? 'stand' : 'approach'; f.boss.walkClip = 'Zombie_Walk_Fwd_Loop'; f.boss.runClip = 'Zombie_Walk_Fwd_Loop'; },
  onFinish(f) {
    W.snd.play('ping', { x: f.boss.x, at: 1.05, gain: 0.9 });
    W.her.endAct(); W.finished = true;
    // the keepsake: her car's one headlight pops out of the wreck and rolls across the road to YOU, still lit
    const hc = W.road.herCar, lens = W.road.her.parts.lensL, from = new THREE.Vector3(); lens.getWorldPosition(from);
    const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.3, 2.2) })); m.rotation.z = Math.PI / 2; g.add(m);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.014, 8, 28), new THREE.MeshStandardMaterial({ color: 0xffc35a, metalness: 1, roughness: 0.25 })); rim.rotation.y = Math.PI / 2; g.add(rim);
    g.add(flare(new THREE.Color(1.6, 1.25, 1.3), 0.5));
    g.position.copy(from); f.scene.add(g);
    const p = f.player, to = new THREE.Vector3(p.x + 0.9, 0.11, p.z + 0.6);
    W.keepsake = { g, from: from.clone(), to, age: -0.35, dur: 1.6 };   // (the song clock stops at the finish: it runs on its own time)
    if (hc.mode === 'parked') { /* (never: the car is a wreck by the end) */ }
    if (W.engine) { W.engine.stop(0.2); W.engine = null; }
  },
  onEncore(f) { W.encoreAt = f.t; },
  onSpotlight(f, on) { W.spot = on; if (on) { W.ep++; W.her.blinded(); } },
  update(f, dt) {
    if (!W || W.f !== f) return;
    const t = f.t;
    if (!W.init || t < W.lastT - 0.5) { setStateAt(f, t, !W.init && t > 0.05); W.init = true; }
    W.lastT = t;
    W.her.update(dt, t);
    if (W.carRun) W.carRun(dt, t);
    tick(f, dt, t);
  },
};

// ====================================================================================== set pieces and moments
// where the set is at song time t (rewinds, ?at= starts, the encore)
function setStateAt(f, t, place) {
  if (!W) return;
  const road = W.road, her = W.her, b = f.boss, B = W.B;
  her.endAct(); her.held = null; her.bulge = null; her.alight = false; her.headTurnT = 0;
  W.stuck.forEach((s) => f.scene.remove(s.box)); W.stuck = [];
  if (W.bulgeMesh) W.bulgeMesh.visible = false;
  b.root.visible = true; b.root.position.y = 0; b.intangible = false;
  W.puddles = []; road.setPuddles([]);
  if (W.keepsake) { f.scene.remove(W.keepsake.g); W.keepsake = null; }
  W.lastRun = null; W.carRun = null; W.burnLane = null; W.rollers = null; W.beam = false; W.goodbye = false; W.finished = false; W.closed = false; W.shatterHow = null; W.kiss = false;
  if (W.engine) { W.engine.stop(0.1); W.engine = null; }
  if (W.rotor) { W.rotor.stop(0.1); W.rotor = null; }
  // what play decided: the snapshot taken when this section began, or the canonical set for t
  const sec = SECTIONS.slice().reverse().find(([n, bar]) => (bar < 0 ? 0 : B(bar, 1)) <= t + 1e-3) || SECTIONS[0];
  const snap = W.snaps && W.snaps[sec[0]];
  road.restore(snap || road.canonical(t));
  if (place) {
    f.player.place(sec[2][0], sec[2][1], Math.atan2(sec[3][0] - sec[2][0], sec[3][1] - sec[2][1]));
    b.place(sec[3][0], sec[3][1], Math.atan2(sec[2][0] - sec[3][0], sec[2][1] - sec[3][1]));
  }
  // her grenade: on the sash until the bridge, gone after the blast
  if (t < B(74, 4)) her.grenadeOn(); else { her.grenadeOff(); if (her.handNade) her.handNade.visible = t < B(75, 4); if (t >= B(80, 1)) { const fig = b.fig; const acc = fig && fig.acc.find((a) => a.name === 'grenade'); if (acc) for (const o of acc.objects) o.visible = false; } }
  her.grenade = null;
  if (W.nade) { f.scene.remove(W.nade); W.nade = null; }
  // the jacket's studs went with the second notch
  const fig = b.fig;
  if (fig && fig.acc) { const st = fig.acc.find((a) => a.name === 'studs_l'); if (st && b.broken >= 2) { for (const o of st.objects) o.visible = false; st.broken = true; } }
  W.oneEye = b.broken >= 3;
  her.setMode(t < B(1, 1) ? 'stand' : t < B(9, 1) ? 'intro' : t >= B(71, 1) && t < B(79, 1) ? 'stand' : 'approach');
  if (b.hp <= 0) { b.walkClip = 'Zombie_Walk_Fwd_Loop'; b.runClip = 'Zombie_Walk_Fwd_Loop'; her.expr('wreck_wrecked'); }
  if (t >= B(71, 1) && t < B(80, 1)) W.rotor = W.snd.loop('rotor', { pan: 0, gain: 0.8, fadeIn: 0.3 });
}

// per frame: the lighter, her eyes, the gift boxes stuck to her, the fire, the bulge, the rolling rocks
function tick(f, dt, t) {
  const B = W.B, road = W.road, b = f.boss, pl = f.player, her = W.her;
  // the keepsake rolling to YOU after the finish
  if (W.keepsake) { const k = W.keepsake; k.age += dt; const u = Math.max(0, Math.min(1, k.age / k.dur)), e = 1 - (1 - u) * (1 - u);
    k.g.position.lerpVectors(k.from, k.to, e); k.g.position.y = u < 0.15 ? k.from.y + (0.11 - k.from.y) * (u / 0.15) + Math.sin(u / 0.15 * Math.PI) * 0.4 : 0.11 + Math.abs(Math.sin(u * 9)) * 0.08 * (1 - u);
    k.g.rotation.y = Math.atan2(k.to.x - k.from.x, k.to.z - k.from.z) + Math.PI / 2; k.g.children[0].rotation.x = -u * 14; }
  // the kiss: a catch pressed a moment after she reached YOU still counts
  if (W.lastRun && W.lastRun.heldAt !== undefined && !W.kiss && W.lastRun.grace > 0) { W.lastRun.grace -= dt; if (pl.catching) kissCaught(f); }
  // the flash light decays
  W.flashK *= Math.exp(-dt / Math.max(0.05, W.flashD)); W.flash.intensity = W.flashK * 1.1;
  // YOU's lighter in the dark
  const lit = t >= B(26, 1) && t < B(32, 1);
  if (W.lighter) { W.lighter.visible = lit; if (lit) W.lighterFlame.material.opacity = 0.8 + 0.2 * Math.sin(t * 23); }
  road.lighterOn = lit;
  if (lit) { const hp = W.lighter.getWorldPosition(new THREE.Vector3()); W.flash.position.copy(hp); W.flash.color.setRGB(1, 0.62, 0.3); W.flash.intensity = Math.max(W.flash.intensity, 5); W.flash.distance = 7; } else W.flash.distance = 14;
  // her headlight eyes: on in the dark until 28.1, then out (the tell); her one eye from the third notch; the beam at the end
  const dark = t >= B(27, 1) && t < B(28, 1);
  const eyesOn = dark || (W.eyesFlare && t - W.eyesFlare < 0.5) || (t >= B(102, 1) && W.beam) || (b.hp <= 0 && !W.finished);
  if (W.eyes) W.eyes.forEach((e, i) => { e.visible = eyesOn && !W.closed && !(W.oneEye && i === 0); e.material.opacity = dark ? 1 : 0.7; });
  // the heels click in the dark (nearer is louder); they stop when she's coming
  if (t >= B(27, 1) && t < B(28, 1)) { const k = Math.floor(f.bm.beatAt(t) * 2); if (k !== W.heelK) { W.heelK = k; const d = her.dist(); W.snd.play('heel', { x: b.x, gain: Math.min(1, 6 / Math.max(2, d)) }); } }
  // the engine follows her car
  if (W.engine) W.engine.set({ x: road.herCar.x, rate: road.herCar.mode === 'driving' ? 1.6 : 1.0 });
  // gift boxes flying back to her and stuck on her chest
  for (const s of W.stuck) {
    const k = Math.min(1, (t - s.t0) / s.dur);
    const chest = new THREE.Vector3(b.x + Math.sin(b.facing) * 0.32, 1.3, b.z + Math.cos(b.facing) * 0.32);
    s.box.position.lerpVectors(s.from, chest, k); if (k < 1) s.box.position.y += Math.sin(k * Math.PI) * 0.8;
    s.box.rotation.y = b.facing;
    if (k >= 1 && Math.floor(t * 4) !== s.tk) { s.tk = Math.floor(t * 4); W.snd.play('clock', { x: b.x }); }
  }
  // the grenade
  if (W.nade && her.grenade) {
    const g = her.grenade;
    if (g.on === 'her') W.nade.position.set(b.x + Math.sin(b.facing) * 0.3, 1.25, b.z + Math.cos(b.facing) * 0.3);
    if (Math.floor(f.bm.beatAt(t)) !== W.nadeBeat) { W.nadeBeat = Math.floor(f.bm.beatAt(t)); W.snd.play('heartbeat', { x: W.nade.position.x, gain: 0.5 + 0.5 * Math.min(1, (t - B(76, 2)) / (B(80, 1) - B(76, 2))) }); }
  }
  // fire: standing in the burning whiskey costs a heart; she walks through a fire on purpose and catches alight
  if (t >= B(60, 2) && t < B(61, 4) && W.puddles.length) {
    for (const p of W.puddles) {
      if (Math.hypot(pl.x - p.x, pl.z - p.z) < 1.25 && !pl.invulnerable && f.state === 'play') { if (pl.hurt(f._ctx(0), 1, p.x, p.z, 'fire')) f._hurt(p.x, p.z); }
      if (!her.alight && Math.hypot(b.x - p.x, b.z - p.z) < 1.4) { her.alight = true; W.snd.play('whoomp', { x: b.x }); }
    }
  }
  if (her.alight) { const sh = [[-0.22, 1.55], [0.22, 1.55], [0, 1.2]]; for (const [ox, oy] of sh) road.fires.flame(b.x + Math.cos(b.facing) * ox, oy, b.z - Math.sin(b.facing) * ox, 0.7, 1, ox * 7 + 3, t); }
  // her path burns for a beat behind a burning charge
  if (W.burnLane && t < W.burnLane.until) { const L = W.burnLane; for (let i = 0; i < 8; i++) { const k = i / 7; road.fires.flame(L.x + L.dx * L.len * k, 0, L.z + L.dz * L.len * k, 0.9, 1, i * 1.7, t); }
    if (!pl.invulnerable && inShape({ shape: 'rect', x: L.x, z: L.z, angle: Math.atan2(L.dx, L.dz), w: 0.6, h: L.len }, pl.x, pl.z, FEEL.radius * 0.6)) { if (pl.hurt(f._ctx(0), 1, pl.x - L.dz, pl.z + L.dx, 'fire')) f._hurt(pl.x, pl.z); } }
  // the bulge: her, under the road, following YOU at 4 m/s
  if (her.bulge) bulgeTick(f, dt, t);
  // chorus 2's rolling rocks: a rock that rolls over YOU hurts
  if (W.rollers) for (const r of W.rollers) {
    if (r.done) continue;
    const t1 = r.t1, beat = r.beat;
    if (t < t1 || t > t1 + beat) continue;
    const z = -3.0 + (t - t1) / beat * 10.5;
    if (Math.abs(pl.z - z) < 1.1 && Math.abs(pl.x - r.x) < 1.0 + FEEL.radius) { r.done = true; const res = f.resolveArea({ shape: 'circle', x: pl.x, z: pl.z, w: 0.5 }, { kind: 'white', damage: 1 }); if (res === 'hit') W.snd.play('thud', { x: pl.x }); }
    if (Math.abs(b.z - z) < 1.1 && Math.abs(b.x - r.x) < 1.6 && !r.herHit) { r.herHit = true; b.takeHit({ dmg: UC * 20, kind: 'rock', heavy: true, x: r.x, z }); W.snd.play('concrete', { x: r.x }); }
  }
  // her one eye's beam finds YOU (the end); in YOU's spotlight every headlight on the highway swings onto YOU
  const extra = [];
  if (W.beam && t >= B(102, 1) && !W.finished) extra.push((g) => { const a = Math.atan2(pl.x - b.x, pl.z - b.z); g.beam(b.x, b.z, a, Math.max(4, her.dist() + 3), 2.2, new THREE.Color(1.0, 0.95, 0.9), 0.14, 0.05); });
  if (W.spot) extra.push((g) => { for (const [sx, sz] of [[5.1, 1.4], [road.herCar.x, road.herCar.z], [-9, -5.4], [9, -5.4], [0, -5.4]]) { const a = Math.atan2(pl.x - sx, pl.z - sz), d = Math.hypot(pl.x - sx, pl.z - sz); g.beam(sx, sz, a, d + 2.5, 2.6, new THREE.Color(1, 0.96, 0.9), 0.09, 0.1); } g.pool(pl.x, pl.z, 2.4, new THREE.Color(1, 0.95, 0.85), 0.22); });
  road.extra = extra.length ? extra : null;
  // the fill follows the light state
  const [sa, sb, sk] = road.stateAt(t), HEMI = { sodium: 0.55, dark: 0.1, stopped: 0.3, search: 0.16, fire: 0.5, dawn: 0.95 };
  W.hemi.intensity = (HEMI[sa] ?? 0.4) * (1 - sk) + (HEMI[sb] ?? 0.4) * sk;
  // the night's violet sky turns peach over the characters as it gets light
  const dk = sb === 'dawn' ? sk : 0; W.hemi.color.setRGB(0.55 + 0.42 * dk, 0.56 + 0.22 * dk, 0.85 - 0.2 * dk);
}

// ---------------------------------------------------------------- S1: "Love me like a landslide": circles where the rocks land
function landslide(f, B) {
  const end = B(9, 1), lock = B(8, 3);
  for (const [x, z] of BOULDERS) area(f, { shape: 'circle', x, z, w: 1.4, kind: 'white', start: f.t, end, damage: 1, silent: true, world: true });
  let lx = f.player.x, lz = f.player.z;
  const g = W.addWorld({ shape: 'circle', x: lx, z: lz, w: 1.4, kind: 'white', start: f.t, end, follow: () => { if (f.t < lock) { lx = f.player.x; lz = f.player.z; W.road.youRockAt = { x: lx, z: lz }; } return { x: lx, z: lz }; } });
  f.cue('white', f.player);
  W.snd.play('rumble', { x: 0, gain: 1 });
  f.after(end - f.t, () => {
    g.dead = true;
    f.resolveArea({ shape: 'circle', x: lx, z: lz, w: 1.4 }, { kind: 'white', damage: 1 });
    f.fx.chips(lx, 0.6, lz, new THREE.Color(0.5, 0.47, 0.45), 30); f.fx.dust(lx, lz, 14);
    for (const [x, z] of BOULDERS) { f.fx.dust(x, z, 10); W.snd.play('thud', { x, gain: 0.6 }); }
    W.snd.play('concrete', { x: lx, gain: 0.9 });
    W.road.addMark('dirt', lx, lz, { r: 1.0 });
  });
}

// ---------------------------------------------------------------- pre 1: she breaks the thing nearest YOU on every snare
function smash(f, hitT) {
  const road = W.road, b = f.boss, pl = f.player, her = W.her;
  if (!her.usable() || her.act || f.suppress) return;
  const ep = W.ep;
  const cand = [];
  for (const q of road.youBreak) if (!road.youBroken(q.name)) cand.push({ x: q.at[0], z: q.at[1], go: () => road.breakYou(q.name), mine: true, kind: 'glass' });
  if (!road.youBroken('suitcase')) cand.push({ x: 9.0, z: 3.9, go: () => road.breakYou('suitcase'), mine: true, kind: 'case' });
  for (const h of road.horses) if (h.st === 'up') cand.push({ x: h.home[0], z: h.home[1], go: () => road.knock(h.home[0], h.home[1], 0.4, -1, 0, 6), kind: 'wood' });
  for (const c of road.cones) if (c.st === 'up') cand.push({ x: c.home[0], z: c.home[1], go: () => road.knock(c.home[0], c.home[1], 0.4, 0, 1, 6), kind: 'cone' });
  for (const r of road.rocks) if (r.obj.visible && r.s.hits < 2) cand.push({ x: r.x, z: r.z, go: () => f.fx.chips(r.x, 0.8, r.z, new THREE.Color(0.5, 0.47, 0.45), 16), kind: 'rock' });
  const reach = cand.filter((c) => Math.hypot(c.x - b.x, c.z - b.z) < 7);
  let target = null;
  const mine = reach.filter((c) => c.mine);
  const pool = mine.length ? mine : reach;
  for (const c of pool) { const d = Math.hypot(c.x - pl.x, c.z - pl.z); if (!target || d < target.d) target = { ...c, d }; }
  const kick = f.t;
  W.punch = ((W.punch || 0) + 1) % 3;
  const clip = ['Punch_Jab', 'Punch_Cross', 'Melee_Hook'][W.punch];
  her.claim(hitT + 0.1);
  if (target) {
    const a = Math.atan2(pl.x - target.x, pl.z - target.z);
    area(f, { shape: 'cone', x: target.x, z: target.z, angle: a, w: 6, param: 18 * Math.PI / 180, kind: 'white', start: kick, end: hitT, damage: 1, silent: false });
    b.faceNow(target.x, target.z);
    f.after(hitT - f.t - 0.12, () => { if (b.rig && !her.act && W.ep === ep) b.perform(clip, { duration: 0.3 }); });
    f.after(hitT - f.t, () => {
      if (W.ep !== ep || f.suppress) return;       // blinded before she swung
      target.go();
      W.snd.play(target.kind === 'glass' ? 'glass' : target.kind === 'case' ? 'clink' : 'concrete', { x: target.x, gain: 0.9 });
      f.fx.chips(target.x, 0.9, target.z, target.kind === 'glass' ? new THREE.Color(2.4, 2.6, 2.9) : new THREE.Color(2.2, 2.0, 1.8), 14);
      for (let i = -1; i <= 1; i++) f.proj.spawn({ x: target.x, z: target.z, y: 0.9, angle: a + i * 0.12, speed: 15, kind: 'white', shape: 'shard', size: 0.3, life: 0.45 });
      f.sfx.fire && f.sfx.fire('shard', f.pan(target.x), 'white');
    });
  } else {
    // nothing in reach: she stamps, and a crack runs at YOU
    const a = Math.atan2(pl.x - b.x, pl.z - b.z);
    area(f, { shape: 'rect', x: b.x, z: b.z, angle: a, w: 0.5, h: 8, kind: 'white', start: kick, end: hitT, damage: 1 });
    f.after(hitT - f.t, () => { if (W.ep !== ep) return; W.snd.play('concrete', { x: b.x, gain: 0.7 }); for (let i = 1; i < 8; i++) f.fx.dust(b.x + Math.sin(a) * i, b.z + Math.cos(a) * i, 3); });
  }
}

// ---------------------------------------------------------------- chorus 2: "I showed up like a car crash": her car comes for you
function carCharge(f, o) {
  const road = W.road, hc = road.herCar, pl = f.player, b = f.boss, her = W.her;
  if (hc.mode !== 'parked') return;
  hc.mode = 'driving';
  const fx = Math.cos(hc.yaw), fz = -Math.sin(hc.yaw);
  let sx = hc.x + fx * 2.3, sz = hc.z + fz * 2.3;     // from her car's nose
  // the car starts by itself: its lane is the road's (YOU's spotlight blinds her, not her car)
  const g = W.addWorld({ shape: 'rect', x: sx, z: sz, angle: 0, w: 1.2, h: 4, kind: 'white', start: f.t, end: o.impact, linger: 0.25 });
  f.cue('white', { x: sx, z: sz });
  let phase = 'set', run = null;
  const act = {};
  const upd = (dt, t) => {
    if (phase === 'set') {
      const a = Math.atan2(pl.x - hc.x, pl.z - hc.z);
      hc.yaw = Math.atan2(-Math.cos(a), Math.sin(a));
      sx = hc.x + Math.sin(a) * 2.3; sz = hc.z + Math.cos(a) * 2.3;
      const r = road.ray(sx, sz, Math.sin(a), Math.cos(a), 1.0);
      g.x = sx; g.z = sz; g.angle = a; g.h = r.d + 0.5;
      if (t >= o.lock) {
        phase = 'run'; W.snd.play('tick', { x: sx }); W.snd.play('roar', { x: hc.x, gain: 1, rate: 1.6 }); W.snd.play('whoosh', { x: hc.x, at: Math.max(0, o.impact - t - 0.3), rate: 0.7 });
        const dYou = Math.max(1, (pl.x - sx) * Math.sin(a) + (pl.z - sz) * Math.cos(a));
        // its nose reaches YOU's locked spot on "crash", never before: from close up it sits revving and goes late
        const T = o.impact - t, v = Math.max(16, dYou / (0.8 * T)), Tr = Math.min(T, dYou / (0.8 * v));
        run = { a, dx: Math.sin(a), dz: Math.cos(a), x0: hc.x, z0: hc.z, t0: t + (T - Tr), T: Tr, v, acc: v / (0.4 * Tr), ta: 0.4 * Tr, stop: r.d, hit: r, s: 0, youHit: false, herHit: false };
      }
    } else if (phase === 'run') {
      if (t < run.t0) return;            // revving at the lock
      const tau = t - run.t0, s = Math.min(run.stop, tau < run.ta ? 0.5 * run.acc * tau * tau : 0.5 * run.v * run.ta + run.v * (tau - run.ta));
      const px = hc.x, pz = hc.z;
      hc.x = run.x0 + run.dx * s; hc.z = run.z0 + run.dz * s;
      const seg = { shape: 'rect', x: px + run.dx * 1.6, z: pz + run.dz * 1.6, angle: run.a, w: 1.3, h: Math.max(0.5, s - run.s + 1.4) };
      if (!run.youHit && inShape(seg, pl.x, pl.z, FEEL.radius * 0.8)) { run.youHit = true; run.res = f.resolveArea(seg, { kind: 'white', damage: 2, melee: true }); if (run.res === 'hit') W.snd.play('crunch', { x: pl.x }); }
      if (!run.herHit && inShape(seg, b.x, b.z, 0.5)) {
        run.herHit = true;
        const both = her.held || run.res === 'hit';
        her.held = null;
        b.takeHit({ dmg: UC * (both ? 60 : 100), kind: 'car', heavy: true, x: b.x, z: b.z });
        if (b.fig) b.fig.hitAt(new THREE.Vector3(b.x, 1.1, b.z), new THREE.Vector3(run.dx, 0, run.dz), { power: 2.2 });
        W.snd.play('crunch', { x: b.x, gain: 1 }); f.fx.chips(b.x, 1.1, b.z, new THREE.Color(2.2, 2.1, 2.0), 30); f.cam.shake(1.0, 0.25); f.cam.kick(1.5);
        her.down(f.beat * 4);
        const ka = run.a + (Math.random() < 0.5 ? 1 : -1) * 0.9; b.x += Math.sin(ka) * 1.5; b.z += Math.cos(ka) * 1.5; b._sync();
      }
      run.s = s;
      road.knock(hc.x, hc.z, 1.4, run.dx, run.dz, run.v);
      if (s >= run.stop) {
        phase = 'done'; g.dead = true; hc.mode = 'wreck'; hc.crumple = 1;
        W.snd.play(run.hit.type === 'car' ? 'crunch' : run.hit.type === 'guardrail' ? 'clang' : 'concrete', { x: hc.x, gain: 1 }); W.snd.play('glass', { x: hc.x, gain: 1, at: 0.05 }); W.snd.play('boom', { x: hc.x, gain: 0.5, rate: 1.4 });
        f.fx.sparks(hc.x + run.dx * 2.3, 0.8, hc.z + run.dz * 2.3, new THREE.Color(3.2, 2.4, 1.4), 40); f.fx.chips(hc.x, 1.0, hc.z, new THREE.Color(2.4, 0.3, 0.8), 40); f.fx.chips(hc.x, 1.0, hc.z, new THREE.Color(2.4, 2.6, 2.9), 30);
        f.fx.glitter(hc.x, 1.2, hc.z, new THREE.Color(3.2, 2.0, 0.6), 50, 1.4);
        f.cam.shake(1.2, 0.35); f.cam.kick(2.2);
        W.flashAt(hc.x, 1.5, hc.z, 12, 0.35);
        if (run.hit.s) run.hit.s.hits = (run.hit.s.hits || 0) + 1;
        if (!run.herHit) {      // it hit something else: she clutches her chest; it's hers
          b.takeHit({ dmg: UC * 30, kind: 'car', heavy: false, x: b.x, z: b.z });
          if (b.rig && !her.act) b.perform('Hit_Chest', { duration: 0.5 });
        }
        if (W.engine) { W.engine.stop(0.3); W.engine = null; }
        W.snd.play('chirp', { x: hc.x, at: 0.4 });
      }
    }
  };
  W.carRun = (dt, t) => { upd(dt, t); if (phase === 'done') W.carRun = null; };
}

// ---------------------------------------------------------------- chorus 2: three rocks roll across, the third at YOU's x
function rollingRocks(f, B) {
  const lock = B(46, 3), t1 = B(47, 1), beat = (B(47, 3) - B(47, 1)) / 2;
  W.road.rollers.forEach((r, i) => { r.x = [-6, 3, f.player.x][i]; });
  W.rollers = W.road.rollers.map((r) => ({ x: r.x, t1, beat }));
  const gs = W.road.rollers.map((r, i) => W.addWorld({ shape: 'rect', x: r.x, z: -3.3, angle: 0, w: 1.0, h: 9.9, kind: 'white', start: f.t, end: t1 + beat * 0.5, follow: i === 2 ? () => { if (f.t < lock) { r.x = f.player.x; W.rollers[2].x = r.x; } return { x: r.x, z: -3.3 }; } : null }));
  f.cue('white', f.player);
  f.at(t1, () => { W.snd.play('rocks', { x: 0, gain: 1 }); f.cam.shake(0.5, 0.4); });
}

// ---------------------------------------------------------------- verse 2: "I carved our secrets in the drywall"
function carve(f, B) {
  const pl = f.player, b = f.boss, her = W.her;
  if (!her.usable() || f.suppress) return;
  const wall = pl.z < 1.65 ? 'krail' : 'guardrail';
  const z = wall === 'krail' ? FLOOR.minZ + 0.9 : FLOOR.maxZ - 0.9;
  const fromLeft = b.x < 0;
  const x0 = fromLeft ? FLOOR.minX + 0.6 : FLOOR.maxX - 0.6, x1 = fromLeft ? FLOOR.maxX - 0.6 : FLOOR.minX + 0.6;
  const t3 = B(54, 3), t4 = B(54, 4);
  area(f, { shape: 'rect', x: x0, z, angle: fromLeft ? Math.PI / 2 : -Math.PI / 2, w: 0.9, h: Math.abs(x1 - x0), kind: 'white', start: f.t, end: t4, damage: 1, melee: true });
  her.endAct(); her.claim(t4 + 0.2);
  const sx = b.x, sz = b.z, t0 = f.t;
  if (b.rig) b.rig.play('Sprint_Loop', { fade: 0.08, speed: 1.6 });
  b.busyUntil = t4 + 0.1;
  const act = { name: 'carve', until: t4 + 0.15 };
  act.update = (dt, t) => {
    if (t < t3) { const k = Math.min(1, (t - t0) / (t3 - t0)); b.x = sx + (x0 - sx) * k; b.z = sz + (z - sz) * k; b.facing = Math.atan2(x0 - sx, z - sz); }
    else { const k = Math.min(1, (t - t3) / (t4 - t3)); b.x = x0 + (x1 - x0) * k; b.z = z + (wall === 'krail' ? -0.5 : 0.5); b.facing = Math.atan2(x1 - x0, 0); if (b.rig && !act.scr) { act.scr = true; b.rig.upperOnce('Zombie_Scratch', { duration: t4 - t3 + 0.1 }); W.snd.play('scrape', { x: b.x, gain: 1 }); } f.fx.sparks(b.x, 0.6, b.z + (wall === 'krail' ? -0.3 : 0.3), new THREE.Color(3.4, 2.4, 1.2), 3); }
    b._sync();
  };
  act.end = () => { W.road.carveMarks(wall); if (b.rig) b.rig.play(b.idleClip, { fade: 0.2 }); };
  her.doAct(act);
}

// ---------------------------------------------------------------- "still burned": the puddles ignite
function ignite(f, B) {
  const t1 = B(60, 2);
  for (const p of W.puddles) area(f, { shape: 'circle', x: p.x, z: p.z, w: 1.4, kind: 'white', start: f.t, end: t1, damage: 1, silent: true, world: true, linger: 0.08 });
  if (W.puddles.length) f.cue('white', W.puddles[0]);
  f.at(t1, () => {
    if (!W.puddles.length) return;
    W.puddles.forEach((p, i) => W.snd.play('whoomp', { x: p.x, at: i * 0.04, gain: 0.8 }));
    W.crackle = W.snd.loop('crackle', { pan: 0, gain: 1 });
    f.after(B(61, 4) - f.t, () => { W.crackle && W.crackle.stop(0.4); W.crackle = null; W.puddles.forEach((p) => W.road.addMark('scorch', p.x, p.z, { r: 1.2 })); });
    // she drags her nails on the asphalt like a match, and walks into a fire on purpose
    const p = W.puddles.reduce((a, q) => (Math.hypot(q.x - f.boss.x, q.z - f.boss.z) < Math.hypot(a.x - f.boss.x, a.z - f.boss.z) ? q : a), W.puddles[0]);
    if (!W.her.act) f.boss.moveTo(p.x, p.z, Math.max(0.3, Math.hypot(p.x - f.boss.x, p.z - f.boss.z) / 3));
  });
}

// ---------------------------------------------------------------- pre 2: "Windows open wide": every window blows on the big hit
function windows(f, B) {
  const t1 = B(65, 1);
  const spots = [...W.road.carSpots(), { x: 13.2, z: -1.2 }, { x: 13.4, z: 3.6 }];
  for (const s of spots) area(f, { shape: 'circle', x: s.x, z: s.z, w: 3.5, kind: 'white', start: f.t, end: t1, damage: 1, silent: true, world: true, linger: 0.08 });
  f.cue('white', spots[0]);
  f.at(t1, () => {
    W.road.windowsOut = true;
    for (const [i, s] of spots.entries()) { W.snd.play('glass', { x: s.x, gain: 1, at: i * 0.02 }); f.fx.chips(s.x, 1.1, s.z, new THREE.Color(2.4, 2.6, 2.9), 26); f.fx.glitter(s.x, 1.2, s.z, new THREE.Color(2.6, 2.8, 3.2), 30, 1.2); }
    f.cam.shake(0.7, 0.2);
    const b = f.boss; if (spots.some((s) => Math.hypot(b.x - s.x, b.z - s.z) < 3.5)) b.takeHit({ dmg: UC * 20, kind: 'glass', heavy: true, x: b.x, z: b.z });
  });
}

// ---------------------------------------------------------------- "I died": the countdown, and she lands in front of you
function countdown(f, B) {
  const her = W.her, b = f.boss, t0 = B(69, 1), t1 = B(70, 4);
  her.endAct(); her.setMode('stand');
  if (b.rig) b.rig.once('LayToIdle', { speed: 1.4, then: 'Walk_Formal_Loop' });
  const step = (t1 - t0) / 16;
  let n = 0;
  const one = () => {
    if (!W || f.t > t1 - 0.02 || her.mode !== 'stand') return;
    const pl = f.player, a = Math.atan2(pl.x - b.x, pl.z - b.z), d = Math.hypot(pl.x - b.x, pl.z - b.z);
    if (d > 3.2) b.moveTo(b.x + Math.sin(a) * 0.45, b.z + Math.cos(a) * 0.45, step * 0.6, { easing: 'out' });
    W.snd.play('heel', { x: b.x, gain: 0.8 + 0.2 * (n % 2) }); n++;
    f.after(step, one);
  };
  f.after(0.35, one);
  her.claim(B(71, 1));
}
function landBefore(f, B) {
  const her = W.her, b = f.boss, pl = f.player, t0 = f.t, t1 = B(71, 1);
  const a = Math.atan2(b.x - pl.x, b.z - pl.z);
  const tx = Math.max(FLOOR.minX + 1, Math.min(FLOOR.maxX - 1, pl.x + Math.sin(a) * 2.5)), tz = Math.max(FLOOR.minZ + 1, Math.min(FLOOR.maxZ - 1, pl.z + Math.cos(a) * 2.5));
  const sx = b.x, sz = b.z;
  if (b.rig) b.rig.once('NinjaJump_Start', { duration: 0.12, then: 'NinjaJump_Idle_Loop' });
  her.doAct({ name: 'leap', until: t1 + 0.05, update: (dt, t) => { const k = Math.min(1, (t - t0) / (t1 - t0)); b.x = sx + (tx - sx) * k; b.z = sz + (tz - sz) * k; b.root.position.y = Math.sin(k * Math.PI) * 1.8; b.faceNow(pl.x, pl.z); },
    end: () => { b.root.position.y = 0; if (b.rig) b.rig.once('NinjaJump_Land', { duration: 0.3, then: b.idleClip }); W.snd.play('heel', { x: b.x }); } });
}

// ---------------------------------------------------------------- the bridge: the backhand (WHITE, dash any way)
function backhand(f, hitT) {
  const b = f.boss, her = W.her;
  if (f.suppress) return;
  const a = Math.atan2(f.player.x - b.x, f.player.z - b.z);
  arc(f, { x: b.x, z: b.z, angle: a, w: 2.6, h: 2.2, param: 70 * Math.PI / 180, start: f.t, end: hitT });
  f.after(hitT - f.t - 0.12, () => { if (b.rig) b.rig.once('Melee_Hook', { duration: 0.3, then: b.idleClip }); W.snd.play('whoosh', { x: b.x, rate: 0.9 }); });
  her.claim(hitT);
  f.after(0.02, () => { const p = f.player, d = Math.hypot(p.x - b.x, p.z - b.z); if (d > 1.8) b.moveTo(b.x + Math.sin(a), b.z + Math.cos(a), 0.2); });
}

// ---------------------------------------------------------------- "So pull the pin and hold me close"
function throwGrenade(f, B) {
  const her = W.her, b = f.boss, pl = f.player, land = B(76, 2);
  if (her.handNade) her.handNade.visible = false;
  const nade = looseGrenade();
  if (b.rig) b.rig.upperOnce('OverhandThrow', { duration: 0.35, from: 0.25, to: 0.7 });
  lob(f, { from: b, at: { x: pl.x, z: pl.z }, end: land, r: 1.0, kind: 'pink', shape: 'heart', size: 0.45, peak: 2.2, mesh: nade, back: 0,
    onCaught: (q) => {
      if (q) q.dead = true;
      // a tap: it goes straight back to her and sticks to her chest: she's a walking bomb
      const g = looseGrenade(); f.scene.add(g); W.nade = g;
      her.grenade = { on: 'her', g: W.addWorld({ shape: 'circle', x: b.x, z: b.z, w: 3.2, kind: 'white', start: f.t, end: B(80, 1), linger: 0.1 }) };
      W.snd.play('clink', { x: b.x });
    },
    onLand: (hit, sh) => {
      const g = looseGrenade(); g.position.set(sh.x, 0.12, sh.z); f.scene.add(g); W.nade = g;
      her.grenade = { on: 'floor', x: sh.x, z: sh.z, g: W.addWorld({ shape: 'circle', x: sh.x, z: sh.z, w: 3.2, kind: 'white', start: f.t, end: B(80, 1), linger: 0.1 }) };
      f.cue('white', sh);
    } });
}
// 80.1, the slam: everything resolves
function blast(f) {
  const her = W.her, b = f.boss, pl = f.player;
  W.snd.play('boom', { x: 0, gain: 1.2 }); W.snd.play('glass', { x: -4, gain: 1, at: 0.05 }); W.snd.play('crunch', { x: 4, gain: 0.8, at: 0.1 }); W.snd.play('crunch', { x: -6, gain: 0.7, at: 0.25 });
  // a white pop, not a white-out: on this dark road any more is a grey veil over everything for a third of a second
  // (the light on the two of you, the sky in the road and the fires coming up carry the rest)
  f.fx.flash(new THREE.Color(0.28, 0.26, 0.25), 1); f.fx.aberrate(2.4); f.cam.shake(1.4, 0.4); f.cam.kick(2.6);
  W.flashAt(0, 3, 0, 18, 0.5, new THREE.Color(1, 0.9, 0.85));
  const g = her.grenade;
  if (g && W.nade) {
    const x = g.on === 'her' ? b.x : g.x, z = g.on === 'her' ? b.z : g.z;
    f.fx.sparks(x, 1.0, z, new THREE.Color(3.4, 1.6, 2.2), 50); f.fx.glitter(x, 1.0, z, new THREE.Color(3.4, 0.8, 1.8), 80, 2.0); f.fx.dust(x, z, 20);
    if (Math.hypot(pl.x - x, pl.z - z) < 3.2 + FEEL.radius) { const res = f.resolveArea({ shape: 'circle', x, z, w: 3.2 }, { kind: 'white', damage: 2 }); }
    if (Math.hypot(b.x - x, b.z - z) < 3.2 + 0.5) { b.takeHit({ dmg: UC * 120, kind: 'grenade', heavy: true, x, z }); if (b.fig) b.fig.hitAt(new THREE.Vector3(b.x, 1.3, b.z), new THREE.Vector3(0, 0, 1), { power: 2.4 }); }
    f.scene.remove(W.nade); W.nade = null; if (g.g) g.g.dead = true;
  }
  her.grenade = null;
  const fig = b.fig; const acc = fig && fig.acc.find((a) => a.name === 'grenade'); if (acc) for (const o of acc.objects) o.visible = false;
}

// ---------------------------------------------------------------- the final chorus: "Love buried me alive": she dives into the road
function dive(f, B) {
  const her = W.her, b = f.boss;
  her.endAct();
  W.snd.play('splash', { x: b.x, gain: 1 }); f.fx.dust(b.x, b.z, 20); f.fx.chips(b.x, 0.3, b.z, new THREE.Color(0.2, 0.2, 0.25), 30);
  if (!W.bulgeMesh) {
    const g = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const m = new THREE.MeshPhysicalMaterial({ color: 0x15141a, roughness: 0.25, clearcoat: 1, emissive: new THREE.Color(0.5, 0.05, 0.22), emissiveIntensity: 0.6, flatShading: true });
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y * (0.85 + 0.3 * Math.sin(i * 1.7))); } g.computeVertexNormals();
    W.bulgeMesh = new THREE.Mesh(g, m); W.bulgeMesh.scale.set(1.1, 0.4, 1.1); f.scene.add(W.bulgeMesh);
  }
  W.bulgeMesh.visible = true; W.bulgeMesh.position.set(b.x, 0, b.z);
  her.bulge = { t0: f.t, heaves: [B(88, 2), B(88, 4), B(89, 2)], erupt: B(89, 4), lock: B(89, 2) };
  b.root.visible = false;
  her.claim(B(90, 1));
  // the eruption: a WHITE circle tracking YOU from "Still", locking on "in", she bursts out on "dirt"
  f.at(B(88, 2), () => {
    const bu = her.bulge; if (!bu) return;
    let lx = f.player.x, lz = f.player.z;
    bu.ep = f.suppress ? -1 : W.ep;          // blinded now or before it lands: she comes up harmless
    bu.g = f.tele.add({ shape: 'circle', x: lx, z: lz, w: 2.0, kind: 'white', start: f.t, end: bu.erupt, follow: () => { if (f.t < bu.lock) { lx = f.player.x; lz = f.player.z; } bu.lx = lx; bu.lz = lz; return { x: lx, z: lz }; } });
    f.cue('white', f.player);
  });
  f.at(B(89, 4), () => {
    const bu = her.bulge; if (!bu) return;
    const x = bu.lx ?? f.player.x, z = bu.lz ?? f.player.z;
    if (bu.ep === W.ep && !f.suppress) f.resolveArea({ shape: 'circle', x, z, w: 2.0 }, { kind: 'white', damage: 2 });
    W.snd.play('concrete', { x, gain: 1 }); W.snd.play('whoosh', { x, rate: 0.6 }); f.fx.chips(x, 0.5, z, new THREE.Color(0.25, 0.25, 0.3), 50); f.fx.dust(x, z, 24); f.cam.shake(1.0, 0.3);
    W.road.addMark('crater', x, z, { r: 1.6 });
    her.bulge = null; W.bulgeMesh.visible = false;
    b.x = x; b.z = z; b.root.visible = true; b._sync();
    const t0 = f.t, t1 = B(90, 1);
    if (b.rig) b.rig.once('Jump_Loop', { duration: 0.3, then: null });
    her.doAct({ name: 'erupt', until: t1, update: (dt, t) => { const k = Math.min(1, (t - t0) / (t1 - t0)); b.root.position.y = Math.sin(k * Math.PI) * 2.4; b.faceNow(f.player.x, f.player.z); }, end: () => { b.root.position.y = 0; if (b.rig) b.rig.once('Jump_Land', { duration: 0.3, then: b.idleClip }); her.expr('wreck_grin'); } });
  });
}
function bulgeTick(f, dt, t) {
  const her = W.her, bu = her.bulge, b = f.boss, pl = f.player;
  const a = Math.atan2(pl.x - b.x, pl.z - b.z), d = Math.hypot(pl.x - b.x, pl.z - b.z);
  if (d > 0.8) { b.x += Math.sin(a) * Math.min(d, 4 * dt); b.z += Math.cos(a) * Math.min(d, 4 * dt); }
  b.x = Math.max(FLOOR.minX + 0.5, Math.min(FLOOR.maxX - 0.5, b.x)); b.z = Math.max(FLOOR.minZ + 0.5, Math.min(FLOOR.maxZ - 0.5, b.z)); b._sync();
  let heave = 0; for (const h of bu.heaves) if (t >= h && t < h + 0.25) heave = Math.max(heave, Math.sin((t - h) / 0.25 * Math.PI));
  for (const h of bu.heaves) if (t >= h && (bu.last || 0) < h) { bu.last = h; W.snd.play('rumble', { x: b.x, gain: 0.6, rate: 1.6 }); f.fx.dust(b.x, b.z, 6); }
  const m = W.bulgeMesh; m.position.set(b.x, 0, b.z); m.scale.set(1.1 + heave * 0.3, 0.4 + heave * 0.35 + 0.04 * Math.sin(t * 9), 1.1 + heave * 0.3);
  m.material.emissiveIntensity = 0.5 + heave * 0.8;
}

// ---------------------------------------------------------------- the last head-on: the whole highway, eight beats, steering at YOU
// The moment of truth is the song's last hit (106.1): she reaches YOU's locked spot on it. Dodged, she sails on
// and shatters on her way into what was behind YOU; met with a catch, it's the kiss; neither, she breaks against YOU.
// Her crash is paid as she passes YOU's spot (the song's end is checked after this frame's update, so on the hit is in
// time for the finish), and the shatter flies on along her run.
const PASS = 148.208 - 0.005;
function lastRun(f, B, kind) {
  const her = W.her, b = f.boss, pl = f.player;
  W.lastRun = { kind };
  const tRun = B(104, 1), lock = B(105, 3);
  her.endAct(); her.setMode('stand');
  // the finale is the road's: it keeps its lane through YOU's spotlight and lands as drawn
  const g = W.addWorld({ shape: 'rect', x: b.x, z: b.z, angle: 0, w: 0.8, h: 4, kind, start: f.t, end: PASS, linger: 0.3 });
  f.cue(kind, b);
  her.claim(150);
  her.expr(kind === 'pink' ? 'wreck_kiss' : 'wreck_stare');
  let v = 0, phase = 'aim', run = null;
  const act = { name: 'lastrun', until: 151 };
  act.update = (dt, t) => {
    if (phase === 'aim' || phase === 'chase') {
      const a = Math.atan2(pl.x - b.x, pl.z - b.z);
      const r = W.road.ray(b.x, b.z, Math.sin(a), Math.cos(a));
      g.x = b.x; g.z = b.z; g.angle = a; g.h = Math.max(1.2, r.d + 0.5);
      b.facing = a;
      if (t >= tRun) {
        if (phase === 'aim') { phase = 'chase'; if (b.rig) b.rig.play('Jog_Fwd_Loop', { fade: 0.2 }); b.busyUntil = 151; }
        const k = Math.min(1, (t - tRun) / (lock - tRun));
        v = 2 + 9 * k * k;
        const d = Math.hypot(pl.x - b.x, pl.z - b.z);
        const step = Math.min(v * dt, Math.max(0, d - 6));      // she keeps a run-up for the blur
        b.x += Math.sin(a) * step; b.z += Math.cos(a) * step;
        if (b.rig && k > 0.5 && !act.sprint) { act.sprint = true; b.rig.play('Sprint_Loop', { fade: 0.15, speed: 1.4 }); }
      }
      b._sync();
      if (t >= lock) {
        phase = 'run'; W.snd.play('tick', { x: b.x });
        const dx = Math.sin(a), dz = Math.cos(a);
        // on the last hit she reaches YOU's spot, or whatever stands between her and YOU (she never goes through it)
        const dYou = Math.min(Math.max(0.6, (pl.x - b.x) * dx + (pl.z - b.z) * dz), Math.max(0.6, r.d));
        const T = Math.max(0.1, PASS - t), vv = Math.max(14, dYou / (0.8 * T)), Tr = Math.min(T, dYou / (0.8 * vv));
        run = { dx, dz, sx: b.x, sz: b.z, t0: t + (T - Tr), v: vv, acc: vv / (0.4 * Tr), ta: 0.4 * Tr, dYou, stop: Math.max(dYou, r.d), hit: r, s: 0, touched: false, go: false };
        g.angle = a; g.h = run.stop + 0.5;
        W.snd.play('whoosh', { x: b.x, at: Math.max(0, PASS - t - 0.3) });
      }
    } else if (phase === 'run') {
      const tau = t - run.t0;
      if (tau < 0) { if (b.rig && !act.crouch) { act.crouch = true; b.rig.play('Crouch_Idle_Loop', { fade: 0.08 }); } return; }
      if (!run.go) {
        run.go = true;
        if (b.rig) b.rig.play('Shield_Dash', { fade: 0.06, speed: 0.001 });
        act.trail = f.fx.trail(() => new THREE.Vector3(b.x, 1.1, b.z), { w: 0.4, color: kind === 'pink' ? new THREE.Color(3.4, 1.0, 2.0) : new THREE.Color(3.0, 3.0, 3.2), len: 24, life: 0.4 });
      }
      const s = Math.min(run.stop, tau < run.ta ? 0.5 * run.acc * tau * tau : 0.5 * run.v * run.ta + run.v * (tau - run.ta));
      const px = b.x, pz = b.z;
      b.x = run.sx + run.dx * s; b.z = run.sz + run.dz * s; b._sync();
      W.shatterHow = { dir: new THREE.Vector3(run.dx, 0.15, run.dz), power: 1.8 };
      if (!run.touched) {
        const seg = { shape: 'rect', x: px - run.dx * 0.5, z: pz - run.dz * 0.5, angle: Math.atan2(run.dx, run.dz), w: 0.9, h: Math.hypot(b.x - px, b.z - pz) + 1.0 };
        if (inShape(seg, pl.x, pl.z, FEEL.radius * 0.8)) {
          run.touched = true;
          if (kind === 'pink') {
            // the kiss: she stops at YOU; met with a catch (a press up to a fifth of a second either side of it), YOU
            // takes her face in both hands
            phase = 'held'; W.lastRun.heldAt = t; W.lastRun.grace = 0.22;
            if (pl.catching) kissCaught(f);
            b.x = pl.x + Math.sin(b.facing) * -0.7; b.z = pl.z + Math.cos(b.facing) * -0.7; b._sync();
            W.shatterHow = { dir: new THREE.Vector3(0, 0.6, 0), power: 0.9 };
            if (b.rig) b.rig.play('Idle_Talking_Loop', { fade: 0.1 });
            if (act.trail) act.trail.live = false;
            return;
          }
          f.resolveArea(seg, { kind: 'white', damage: 1, melee: true });
        }
      }
      // past YOU's spot: she's committed, and what's behind YOU breaks her. Paid now, so the bar is empty in time.
      if (!run.paid && s >= run.dYou - 0.05) {
        run.paid = true;
        const fast = run.v > 25, type = run.hit.type;
        let bonus = { car: 10, truck: 10, barrier: 10, board: 10 }[type] || 0;
        if (fast && (type === 'guardrail' || type === 'roadblock')) bonus += 20;
        if (fast && type === 'krail') bonus += 30;
        const res = b.takeHit({ dmg: UC * (80 + bonus), kind: 'crash', heavy: true, x: b.x + run.dx, z: b.z + run.dz, onBeat: true });
        if (res && res.landed) f._good && f._good(500);
        W.snd.play('whoosh', { x: b.x, gain: 0.8, rate: 0.8 });
      }
      if (s >= run.stop) {
        // still in one piece (the bar held: the ENCORE): she hits it for real
        phase = 'done'; if (act.trail) act.trail.live = false; g.dead = true;
        her.crash(run.hit.type, run.hit.s, 30, run.v, run.dx, run.dz, run.hit.nx, run.hit.nz, { paid: run.paid });
      }
    }
  };
  act.end = () => { if (act.trail) act.trail.live = false; };
  her.doAct(act);
}
function kissCaught(f) {
  const pl = f.player;
  if (W.kiss) return; W.kiss = true;
  pl.tryCatch(); f.fx.caught(pl.x, 1.3, pl.z, true); f.sfx.catch && f.sfx.catch('perfect', f.pan(pl.x)); f._good && f._good(500);
}
