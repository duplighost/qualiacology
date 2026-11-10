// A3: Pretty Until Proven Guilty. THE DEFENDANT, in the Court of Public Opinion.
// The rule: pretty reflects; guilty is open. Knock her evidence onto the bench, and when the gavel falls, she's yours.
// (design: research/tracks/pretty-until-proven-guilty.md; the rule in court.js, the judge in justice.js)
import * as THREE from 'three';
import { CharacterKit } from '../../engine/character.js';
import { Court, exhibitMesh, POOL_GEO, poolMaterial } from './court.js';
import { Justice, BLOCK } from './justice.js';
import { buildDefendant, face, makeGiantKey, makeCuff } from './figure.js';
import { Knives, Motto, Flats } from './pieces.js';
import { Props, Shelving } from './props.js';
import { FrontPage, PAGE, Cells, CELLS, Frost, FROST, Doubles, Doors, FloorLight, Prints } from './stage.js';
import { Crowd, Hall } from './crowd.js';
import { reach } from './justice.js';
import { Sounds } from './sounds.js';
import { zone, send, shot, hazard, updateHazards, goldMark, updateMarks, clearMarks, toward, you, clampTo, handOf } from './moves.js';
import { teachBot } from './bot.js';
import { liteCourt } from './lite.js';
import { death, buildEnd, endScene, endUpdate, disposeEnd } from './death.js';
import { Arena } from '../../game/arena.js';

const ID = 'pretty-until-proven-guilty';
const HP = 1050;                   // no bullet sponges: the good bot (twice a person's damage) empties her at ~42% of the song
const TAU = Math.PI * 2;
const CROSS = { x: 0, z: -1 };         // the seal of the court: the fuel trails cross here
const TRAILS = [[-9.5, -6], [9.5, 4], [9.5, -6], [-9.5, 4]];

let kit = null;
const ang = toward;
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lerp = THREE.MathUtils.lerp;
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

// ------------------------------------------------------------------------------------------ her moves
function H(f) { return f.boss; }
// play a clip so it runs from now until song time t1
function act(f, clip, t1, o = {}) { const b = f.boss; b.perform(clip, { duration: Math.max(0.12, t1 - f.t), from: o.from ?? 0, to: o.to ?? 1, fade: o.fade ?? 0.1, then: o.then }); }
function upper(f, clip, dur, o = {}) { const b = f.boss; if (b.scene) return; b.rig && b.rig.upperOnce(clip, { duration: dur, from: o.from ?? 0, to: o.to ?? 1, fade: o.fade ?? 0.08 }); }
function goTo(f, x, z, dur, easing = 'inOut') { const p = clampTo(f, { x, z }, 0.9); f.boss.moveTo(p.x, p.z, dur, { easing }); }
function hold(f, until) { f.ppg.holdUntil = Math.max(f.ppg.holdUntil || 0, until); }
function grin(f, sec = 1.2) { face(f.boss.fig, 'grin'); f.ppg.faceUntil = f.t + sec; }
// a lunge along a lane, landing on `end`: she crosses it in `travel` seconds
function lungeLane(f, o) {
  const b = f.boss, from = { x: b.x, z: b.z };
  const a = o.angle ?? ang(from, o.at || you(f));
  const len = o.len;
  const ex = from.x + Math.sin(a) * len, ez = from.z + Math.cos(a) * len;
  const end = clampTo(f, { x: ex, z: ez }, 0.9);
  const realLen = dist(from, end);
  b.faceNow(end.x, end.z);
  const z = zone(f, { shape: 'rect', x: from.x, z: from.z, angle: a, w: o.w ?? 0.7, h: realLen + (o.over ?? 0), kind: o.kind || 'white', start: o.start ?? f.t, end: o.end, damage: o.damage ?? 1, melee: true });
  const travel = o.travel ?? 0.25;
  f.at(o.end - travel - (o.windup ?? 0.2), () => { if (z.dead) return; act(f, o.clip || 'Sword_Dash', o.end + 0.15, { from: 0.05, to: 0.6 }); f.ppg.snd.play('slash', { pan: f.pan(b.x), gain: 0.5, at: o.windup ?? 0.2 }); });
  f.at(o.end - travel, () => { if (z.dead) return; b.moveTo(end.x, end.z, travel, { easing: 'in' }); });
  return z;
}
// a slash: a cone from her (following her) toward where YOU is when it starts, landing on `end`
function slash(f, o) {
  const b = f.boss;
  const a0 = ang(b, you(f));
  const z = zone(f, { shape: 'cone', x: b.x, z: b.z, angle: a0, w: o.r ?? 2.8, param: (o.half ?? 60) * Math.PI / 180, kind: o.kind || 'white', start: o.start ?? f.t, end: o.end, damage: o.damage ?? 1, melee: true,
    follow: o.follow === false ? null : () => ({ x: b.x, z: b.z, angle: a0 }) });
  const clip = o.clip || 'Sword_Regular_A';
  f.at(o.end - (o.lead ?? 0.3), () => { if (z.dead) return; b.faceNow(b.x + Math.sin(a0), b.z + Math.cos(a0)); act(f, clip, o.end + 0.2, { from: 0.1, to: 0.75 }); f.ppg.snd.play('slash', { pan: f.pan(b.x), gain: 0.45, at: (o.lead ?? 0.3) - 0.06 }); });
  return z;
}
// a ring of projectiles out from her, telegraphed by a ring that fills to the release
function heartRing(f, o) {
  const b = f.boss;
  const z = zone(f, { shape: 'ring', x: b.x, z: b.z, w: o.w ?? 1.6, param: o.th ?? 0.5, kind: 'pink', start: o.start ?? f.t, end: o.end, noHurt: true, follow: () => ({ x: b.x, z: b.z }) });
  f.at(o.end, () => {
    if (z.dead || f.court.stagger) return;
    const n = o.n ?? 12;
    for (let i = 0; i < n; i++) { const a = (o.rot ?? 0) + i / n * TAU; f.proj.spawn({ x: b.x + Math.sin(a) * 0.8, z: b.z + Math.cos(a) * 0.8, y: 1.3, angle: a, speed: o.speed ?? 5.5, kind: 'pink', shape: o.shape || 'heart', size: o.size ?? 0.38, life: o.life ?? 3.2, spin: 2 }); }
    f.ppg.snd.play('whoosh', { pan: f.pan(b.x), gain: 0.4 }); f.ppg.snd.play('chime', { pan: f.pan(b.x), gain: 0.25, rate: 1.5 });
  });
  return z;
}
function kissAt(T, fire, arrive, o = {}) {
  if (o.now) { const f = o.now; f.at(fire, () => kissNow(f, arrive, o)); return; }
  T.at({ s: fire }, (f) => kissNow(f, arrive, o));
}
function kissNow(f, arrive, o) {
  {
    if (f.court.stagger || f.boss.scene) return;
    upper(f, 'Spell_Simple_Shoot', 0.45, { from: 0.2, to: 0.8 });
    face(f.boss.fig, 'pout'); f.ppg.faceUntil = f.t + 0.5;
    send(f, { arrive, r: o.r ?? 0.9, size: o.size ?? 0.42, shape: o.shape || 'kiss', vmin: o.vmin ?? 4, vmax: o.vmax ?? 9, homing: o.homing, life: o.life });
  }
}
// the runway knee-slide: a white lane through YOU, she slides it on the beat and leaves a gloss streak
function slide(f, o) {
  const b = H(f), a = ang(b, you(f));
  const z = zone(f, { shape: 'rect', x: b.x, z: b.z, angle: a, w: 0.8, h: o.h ?? 10, kind: 'white', start: o.start ?? f.t, end: o.end, damage: 1, melee: true });
  const end = clampTo(f, { x: b.x + Math.sin(a) * ((o.h ?? 10) - 0.5), z: b.z + Math.cos(a) * ((o.h ?? 10) - 0.5) }, 0.9);
  b.faceNow(end.x, end.z); hold(f, o.t1 + 0.3);
  f.at(o.end - 0.25, () => { if (!z.dead) act(f, 'Slide_Start', o.end + 0.03); });
  f.at(o.end, () => { if (z.dead) return; act(f, 'Slide_Loop', o.t1 - 0.15); b.moveTo(end.x, end.z, o.t1 - o.end, { easing: 'out' }); f.ppg.streak = { t0: o.end, t1: o.t1, x0: b.x, z0: b.z, x1: end.x, z1: end.z }; f.ppg.snd.play('whoosh', { pan: f.pan(b.x), gain: 0.5 }); });
  f.at(o.t1 - 0.15, () => { if (!z.dead) act(f, 'Slide_Exit', o.t1 + 0.3); });
  return z;
}
// receipts and cards stop on cover (the tables, the cases)
function cover(f) { return (q) => { const p = f.ppg.props.blocks(q.x, q.z); if (p) { q.dead = true; f.ppg.props.receipt(p); } }; }
// the middle of YOU's cell lane
function laneX(x) { const e = [-11, ...CELLS.xs, 11]; for (let i = 0; i < e.length - 1; i++) if (x >= e[i] && x < e[i + 1]) return THREE.MathUtils.clamp((e[i] + e[i + 1]) / 2, -10, 10); return 0; }
// YOU rips through the fallen front page: a YOU-shaped hole, confetti, a scrap with her photo as an exhibit
function ripThrough(f) {
  const pl = f.player, S = f.ppg;
  S.ripPending = 0;
  S.page.tear(pl.x, pl.z, 1.1, 1.1, true);
  f.fx.glitter(pl.x, 0.8, pl.z, new THREE.Color(3, 1.4, 2.2), 40, 1.6); f.fx.chips(pl.x, 0.6, pl.z, new THREE.Color(2.3, 2.2, 2.0), 30);
  S.snd.play('tear', { pan: f.pan(pl.x), gain: 0.8 });
  pl.addMeter(0.12); f._glimmer && f._glimmer(2, true); f._good && f._good(150);
  const a = Math.random() * Math.PI * 2;
  f.court.exhibit('page', THREE.MathUtils.clamp(pl.x + Math.sin(a) * 1.6, -10, 10), THREE.MathUtils.clamp(pl.z + Math.cos(a) * 1.6, -6, 6), { r: 0.8 });
}
// a pink slap (parry it and she's open)
function slap(f, o) {
  const b = H(f), a0 = ang(b, you(f));
  const z = zone(f, { shape: 'cone', x: b.x, z: b.z, angle: a0, w: o.r ?? 1.8, param: (o.half ?? 50) * Math.PI / 180, kind: 'pink', start: o.start ?? f.t, end: o.end, damage: 1, melee: true,
    follow: () => ({ x: b.x, z: b.z, angle: ang(b, you(f)) }),
    onImpact: (hit) => { if (hit === 'hit') f.ppg.snd.play('slap', { pan: f.pan(b.x), gain: 0.6 }); } });
  f.at(o.end - 0.3, () => { if (!z.dead) { b.faceNow(f.player.x, f.player.z); act(f, o.clip || 'Melee_Hook', o.end + 0.25, { from: 0.15, to: 0.75 }); } });
  return z;
}

// ------------------------------------------------------------------------------------------ set pieces in code (lite until the bake)
function fuelTrails(f) {
  const g = new THREE.Group(); g.name = 'ppg:fuel';
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    // petrol on black marble: a dark gloss with an oily rainbow sheen along its middle (not a neon strip: the fire's
    // white lanes are drawn over it)
    fragmentShader: `uniform float uT, uA; varying vec2 vU; void main(){ float e = 1.0 - abs(vU.y * 2.0 - 1.0); float a = smoothstep(0.0, 0.5, e) * uA;
      vec3 c = 0.5 + 0.5 * cos(6.2831 * (vU.x * 1.7 + vU.y * 0.6 + uT * 0.2 + vec3(0.0, 0.33, 0.67)));
      float sheen = 0.12 + 0.2 * smoothstep(0.55, 1.0, e);
      gl_FragColor = vec4(mix(vec3(0.015, 0.012, 0.02), c * 0.32, sheen) * a, a * 0.8); }` });
  const arms = [];
  for (const [x, z] of TRAILS) {
    const len = Math.hypot(x - CROSS.x, z - CROSS.z);
    const geo = new THREE.PlaneGeometry(1, 0.42); geo.translate(0.5, 0, 0); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat); m.position.set(CROSS.x, 0.03, CROSS.z); m.rotation.y = Math.atan2(-(z - CROSS.z), x - CROSS.x); m.scale.x = 0.001; m.renderOrder = 2;
    g.add(m); arms.push({ m, len });
  }
  f.scene.add(g);
  return { g, mat, arms };
}
function fireArms(f) {
  const g = new THREE.Group(); g.name = 'ppg:fire';
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uFront: { value: 0 }, uA: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uFront, uA; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ if (vU.x > uFront) discard; float y = vU.y; float fl = n(vec2(vU.x * 18.0, y * 3.0 - uT * 6.0)) * 0.6 + n(vec2(vU.x * 40.0, y * 6.0 - uT * 11.0)) * 0.4;
        float a = smoothstep(0.0, 0.25, fl - y * 0.95) * uA; vec3 c = mix(vec3(1.4, 0.26, 0.04), vec3(2.3, 1.25, 0.3), fl * fl);
        gl_FragColor = vec4(c, a); }` });
  const arms = [];
  for (const [x, z] of TRAILS) {
    const len = Math.hypot(x - CROSS.x, z - CROSS.z);
    const geo = new THREE.PlaneGeometry(1, 1.1, 1, 1); geo.translate(0.5, 0.55, 0);
    const m = new THREE.Mesh(geo, mat); m.position.set(CROSS.x, 0.0, CROSS.z); m.rotation.y = Math.atan2(-(z - CROSS.z), x - CROSS.x); m.scale.x = len;
    g.add(m); arms.push({ m, len });
  }
  const light = new THREE.PointLight(0xff7a30, 0, 14, 1.6); light.position.set(CROSS.x, 1.2, CROSS.z); g.add(light);
  f.scene.add(g);
  return { g, mat, arms, light };
}

// ------------------------------------------------------------------------------------------ the light (design §4: lighting states)
// [from, state, blend seconds]: the baked states are day, show, dark, evidence, red, night
const LIGHT = [
  [0, 'day', 0], [8.174, 'show', 0.35], [46.897, 'dark', 0.06], [49.985, 'show', 0.2], [57.733, 'evidence', 0.38],
  [76.332, 'red', 0.08], [84.052, 'night', 0.12], [94.890, 'dark', 0.2], [99.531, 'night', 0.1], [105.719, 'dark', 0.5],
  [113.473, 'show', 0.15], [121.215, 'night', 0.4], [135.138, 'dark', 0.3], [138.229, 'night', 0.08], [150.633, 'dark', 0.08],
  [160.297, 'night', 1.4],
];
function lightAt(t) {
  let i = 0; while (i < LIGHT.length - 1 && LIGHT[i + 1][0] <= t) i++;
  const [t0, b, dur] = LIGHT[i], a = i > 0 ? LIGHT[i - 1][1] : b;
  // one state alone is (b, b, 0): the same blend the arena captured its reflections for, so no needless re-capture
  if (a === b) return { a, b, k: 0 };
  return { a, b, k: dur > 0 ? THREE.MathUtils.clamp((t - t0) / dur, 0, 1) : 1 };
}

// ------------------------------------------------------------------------------------------ the set at time t (rewinds, ?at=)
function setStateAt(f, t) {
  const S = f.ppg;
  clearMarks(f); endScene(f);
  S.holdUntil = 0; S.hop = null; S.faceUntil = 0; S.key = null; S.streak = null; S.pour = null; S.burn = null; S.bubble = null;
  S.knives.clear(); S.keyMesh.visible = false;
  S.drop = null; S.fling = null; S.chain = null; S.bound = false; S.ripPending = 0; S.selfLove = null; S.swallowed = false; S.cuffAt = null; S.kissTag = null; S.phoneZones = [];
  S.page.reset(); S.prints.clear(); for (const d of S.doubles.list) d.alive = false;
  // fuel and fire
  S.fuel.mat.uniforms.uA.value = t >= 28.3 && t < 31.6 ? 1 : 0;
  for (const a of S.fuel.arms) a.m.scale.x = t >= 29.09 && t < 31.6 ? a.len : 0.001;
  S.fire.mat.uniforms.uA.value = 0;
  // the boss
  const b = f.boss;
  // her clock is the song's from here: events at the restart fire before her next update, and a move or a clip
  // timed on a stale clock (the moment YOU died) would fling her across the room or keep her busy for seconds
  b._now = t; b.move = null; b.busyUntil = 0; b._bowT = 0; b.behaveOpts.speed = 2.4;
  b.lockFacing = false; b.faceTarget = f.player; b.behave = 'hold'; b.intangible = false; b.root.visible = true; b.walkClip = 'Walk_Formal_Loop';
  if (b.props) b.props.compact.userData.glow(0);
  b.root.position.y = 0;
  for (const k of ['knife', 'lipstick', 'compact', 'key', 'cuff', 'zippo', 'gas', 'bubble']) b.show(k, false);
  b.show('jacket', t >= 76.332 && t < 79.789);
  if (t < 3.534) { b.root.position.y = 1.08; b.idle = 'Sitting_Idle_Loop'; b.loop('Sitting_Idle_Loop'); b.faceTarget = null; b.place(0, -7.35, 0); }
  else { b.idle = 'Idle_FoldArms_Loop'; b.loop('Idle_FoldArms_Loop'); }
  S.justice.setStateAt(t);
}
// the court (her state, the exhibits, the pan) and the props as they stand, kept per section start: a rewind and
// the ENCORE (which jumps back to the final chorus and calls onRewind) put back the one for where they land
function snapNow(f) { return { court: f.court.snapshot(), props: f.ppg.props.snapshot() }; }
function snapAt(S, t) { for (const k of Object.keys(S.snaps)) if (Math.abs(+k - t) < 0.02) return S.snaps[k]; return null; }
function restoreAt(f, t) {
  const S = f.ppg, s = snapAt(S, t);
  f.court.restore(s ? s.court : null, t);
  setStateAt(f, t);
  S.props.restore(s ? s.props : null);
}

// ------------------------------------------------------------------------------------------ warm the court
// three.js builds a shader for the target it draws into, and the game draws into the post's linear target: a
// compile at load for the canvas (main.js, the figurine's prepare) builds the wrong ones, so every set piece, every
// light state's lightmap and her shatter compiled or uploaded on its first frame mid-fight (a quarter second at
// most section lines, two at the finish). Here it all happens at load, for the right target.
const hasLight = (o) => { let l = false; o.traverse((c) => { if (c.isLight) l = true; }); return l; };
async function warmCourt(f, b) {
  const r = f.app.renderer, post = f.app.post, scene = f.scene, cam = f.cam.cam, S = f.ppg, fig = b && b.fig;
  if (!r || !post || !post.target) return;
  const t0 = performance.now();
  const A = S.arena;
  if (A && r.initTexture) for (const tx of [...(A.lightmaps || []), ...(A.keymaps || [])]) { try { r.initTexture(tx); } catch (e) { /* drawn on first use instead */ } }
  // what only exists later: her shards and debris, every kind of exhibit and its pool, a gold mark, the shockwave
  const tmp = new THREE.Group(); tmp.name = 'ppg:warm';
  if (fig) { try { fig.prepareShatter && fig.prepareShatter(); } catch (e) { console.warn('ppg: shatter plan', e.message); } if (fig.world && !fig.world.parent) scene.add(fig.world); if (fig.shards && fig.shards.group && fig.world) fig.world.add(fig.shards.group); }
  for (const k of ['knife', 'zippo', 'key', 'hoodie', 'heart', 'jacket', 'page', 'mugshot', 'shard', 'evidence']) tmp.add(exhibitMesh(k));
  const pool = new THREE.Mesh(POOL_GEO, poolMaterial()); pool.rotation.x = -Math.PI / 2; tmp.add(pool);
  if (S.justice && S.justice.waveGeo) tmp.add(new THREE.Mesh(S.justice.waveGeo, S.justice.waveMat()));
  tmp.position.set(0, -50, 0); scene.add(tmp);
  goldMark(f, { x: 0, z: 0, r: 1, start: -10, end: -9 });
  // every hidden thing shown for one frame (never a light: the number of lights is part of every shader)
  const hidden = [];
  scene.traverse((o) => { if (o.visible === false && !o.isLight && !hasLight(o)) { hidden.push(o); o.visible = true; } });
  const prev = r.getRenderTarget();
  try {
    r.setRenderTarget(post.target);
    const p = r.compileAsync ? r.compileAsync(scene, cam) : (r.compile(scene, cam), null);
    r.setRenderTarget(prev);
    if (p) await p;
    // drawn once into the post's target: the shadow passes' depth shaders, the textures, the shard buffers
    r.shadowMap.needsUpdate = true;
    r.setRenderTarget(post.target); r.render(scene, cam);
  } catch (e) { console.warn('ppg: warm', e.message); }
  r.setRenderTarget(prev);
  for (const o of hidden) o.visible = false;
  scene.remove(tmp); clearMarks(f);
  // the arena's reflection capture draws the set with no character lights: its shaders too, now (it re-captures on
  // every light state change)
  if (A && typeof A._captureEnv === 'function') { try { A.setState('day', 'day', 0); A._captureEnv(); } catch (e) { console.warn('ppg: env', e.message); } }
  S.warmMs = Math.round(performance.now() - t0);
}

// ------------------------------------------------------------------------------------------ the script
function script(T, F) {
  const at = (t, fn) => T.at({ s: t }, fn);
  // the set is put right for the start time before the first event fires (a start anywhere, ?at=)
  const advance = T.advance.bind(T);
  T.advance = (t, f) => {
    const S = f.ppg;
    if (S && !S.init) { S.init = true; setStateAt(f, t); S.snaps[f.checkpoint ? f.checkpoint.t : t] = snapNow(f); }
    advance(t, f);
  };
  // sections: every start is a rewind checkpoint (design §5)
  T.section('order in the court', { s: 0 }, { s: 29.864 });
  T.section('verse 1', { s: 29.864 }, { s: 34.502 });
  T.section('chorus 1', { s: 34.502 }, { s: 49.985 });
  T.section('post 1', { s: 49.985 }, { s: 57.733 });
  T.section('the evidence room', { s: 57.733 }, { s: 76.332 });
  T.section('caught red-handed', { s: 76.332 }, { s: 84.052 });
  T.section('chorus 2', { s: 84.052 }, { s: 96.457 });
  T.section('the cells', { s: 96.457 }, { s: 105.719 });
  T.section('the mirror room', { s: 105.719 }, { s: 121.215 }, { close: true });
  T.section("i'm always right", { s: 121.215 }, { s: 127.414 });
  T.section('the chant', { s: 127.414 }, { s: 135.138 });
  T.section('final chorus', { s: 135.138 }, { s: 153.729 }, { final: true });
  T.section('case closed', { s: 153.729 }, { s: 166.88 });

  // ================= §1 ORDER IN THE COURT: the cold open (unaccompanied voice) =================
  at(0.02, (f) => { f.court.verdict(1.53, { until: 3.534, stagger: 0, scripted: true, noLip: true, raise: 0.416, peak: 1.176, why: 'cold open', gain: 0.6 }); });
  at(1.53, (f) => { face(f.boss.fig, 'scandalized', 0.05); f.ppg.faceUntil = f.t + 0.55; upper(f, 'Hit_Head', 0.5); });
  at(2.1, (f) => { face(f.boss.fig, 'grin'); f.ppg.faceUntil = f.t + 0.3; });
  at(2.24, (f) => { const b = H(f); b.show('compact', true); b.props.compact.userData.open(1); upper(f, 'Spell_Simple_Enter', 0.4); f.ppg.snd.play('click', { pan: f.pan(b.x), gain: 0.5 }); });
  at(2.356, (f) => { const b = H(f); b.show('lipstick', true); upper(f, 'Consume', 0.79, { from: 0.15, to: 0.85 }); face(b.fig, 'pout'); f.ppg.faceUntil = 3.2; });
  at(2.9, (f) => { const b = H(f); const p = handOf(f, 'r'); f.fx.glitter(p.x, 1.9, p.z, new THREE.Color(3, 0.9, 1.9), 22, 0.4); f.ppg.snd.play('kiss', { pan: f.pan(b.x), gain: 0.4 }); });
  at(3.534, (f) => {
    const b = H(f); b.show('compact', false); b.show('lipstick', false); f.ppg.snd.play('click', { pan: f.pan(b.x), gain: 0.6 });
    // she hops off the bench and lands on 4.301
    b.idle = 'Idle_FoldArms_Loop';
    act(f, 'NinjaJump_Start', 3.82); f.ppg.hop = { t0: 3.534, t1: 4.301, y0: 1.08, y1: 0, peak: 0.9 };
    b.faceTarget = null; b.moveTo(0, -4.6, 4.301 - 3.534, { easing: 'inOut' });
  });
  at(3.82, (f) => act(f, 'NinjaJump_Idle_Loop', 4.2));
  at(4.2, (f) => { act(f, 'NinjaJump_Land', 4.62); f.ppg.snd.play('heel', { pan: f.pan(0), gain: 0.8, at: 0.1 }); f.ppg.snd.play('heel', { pan: f.pan(0), gain: 0.7, at: 0.16, force: true }); });
  at(4.4, (f) => { const b = H(f); b.faceTarget = f.player; goTo(f, -1.5, -3.5, 1.6); });

  // ================= the intro: the court assembles while YOU learns =================
  // BUBBLE GUM: the first catch, arriving exactly when the band comes in
  at(5.07, (f) => { const b = H(f); b.show('bubble', true); b.props.bubble.scale.setScalar(0.05); f.ppg.bubble = { t0: 5.07, t1: 6.637 }; f.ppg.snd.play('gum', { pan: f.pan(b.x), gain: 0.5 }); hold(f, 6.9); });
  at(6.637, (f) => {
    const b = H(f); b.show('bubble', false); f.ppg.bubble = null; upper(f, 'Spell_Simple_Shoot', 0.5, { from: 0.2, to: 0.85 });
    send(f, { arrive: 8.174, r: 1.1, size: 0.55, shape: 'orb', vmin: 2, vmax: 7, sound: 'pop' });
  });
  // SWITCHBLADE LUNGE: the first white attack (the flick is the tell)
  at(8.954, (f) => { const b = H(f); b.show('knife', true); f.ppg.knifeOpen = { t0: f.t, k: 1 }; f.ppg.snd.play('flick', { pan: f.pan(b.x), gain: 0.6 }); f.fx.sparks(b.x, 1.4, b.z, new THREE.Color(2.6, 2.8, 3.4), 6); grin(f, 2.4); hold(f, 12.4); });
  at(9.735, (f) => { const b = H(f); lungeLane(f, { len: Math.min(9, dist(b, you(f)) + 1.5), w: 0.7, end: 11.274, travel: 0.25, windup: 0.3 }); });
  // the deflect lesson: she poses at the end of the lane with her back to YOU
  at(11.45, (f) => { const b = H(f); b.faceTarget = null; b.faceNow(b.x - (f.player.x - b.x), b.z - (f.player.z - b.z)); b.loop('Idle_Talking_Loop'); b.idle = 'Idle_Talking_Loop'; b.show('knife', false); });
  at(12.452, (f) => { const b = H(f); b.faceTarget = f.player; b.idle = 'Idle_FoldArms_Loop'; });
  // KISSES x3, each arriving two beats after it leaves
  kissAt(T, 12.847, 13.602); kissAt(T, 13.224, 13.989); kissAt(T, 13.602, 14.374);
  // THE WEAPON: the first exhibit (the knife sticks upright in the marble)
  at(14.374, (f) => {
    const b = H(f), from = { x: b.x, z: b.z }, a = ang(from, you(f)), len = Math.min(13, dist(from, you(f)) + 1);
    const end = clampTo(f, { x: from.x + Math.sin(a) * len, z: from.z + Math.cos(a) * len }, 0.7);
    const L = dist(from, end);
    b.show('knife', true); hold(f, 15.7);
    const z = zone(f, { shape: 'rect', x: from.x, z: from.z, angle: a, w: 0.45, h: L, kind: 'white', start: 14.374, end: 15.537, noHurt: true });
    f.at(14.75, () => { if (!z.dead) { b.faceNow(end.x, end.z); act(f, 'OverhandThrow', 15.45, { from: 0.1, to: 0.8 }); } });
    f.at(15.15, () => {
      if (z.dead) return;
      b.show('knife', false);
      f.proj.spawn({ x: from.x + Math.sin(a) * 0.5, z: from.z + Math.cos(a) * 0.5, y: 1.2, angle: a, speed: (L - 0.5) / 0.387, kind: 'white', shape: 'shard', size: 0.4, life: 0.39, damage: 1 });
      f.ppg.snd.play('slash', { pan: f.pan(from.x), gain: 0.5 });
    });
    f.at(15.537, () => { if (z.dead) return; f.court.exhibit('knife', end.x, end.z, { r: 0.8 }); f.ppg.snd.play('stick', { pan: f.pan(end.x), gain: 0.5, rate: 2 }); });
  });
  at(15.924, (f) => { const b = H(f); if (f.court.stagger) return; act(f, 'Idle_No_Loop', 17.2); hold(f, 17.3); });
  at(16.8, (f) => { if (f.court.pretty) goTo(f, 0, -3, 1.6); });
  kissAt(T, 17.472, 18.246); kissAt(T, 19.020, 19.793); kissAt(T, 20.569, 21.343);

  // ================= THE LIFT (b14-b17): pressure on =================
  at(20.956, (f) => slide(f, { end: 22.118, h: 10, t1: 22.886 }));
  at(22.886, (f) => {
    const b = H(f), a = ang(b, you(f));
    const z = zone(f, { shape: 'cone', x: b.x, z: b.z, angle: a, w: 8, param: 25 * Math.PI / 180, kind: 'pink', start: 22.886, end: 23.664, noHurt: true });
    f.at(23.664, () => {
      if (z.dead || f.court.stagger) return;
      upper(f, 'Spell_Simple_Shoot', 0.4, { from: 0.25, to: 0.85 });
      for (let i = 0; i < 5; i++) { const aa = a + (i - 2) * 10 * Math.PI / 180; f.proj.spawn({ x: b.x + Math.sin(aa) * 0.8, z: b.z + Math.cos(aa) * 0.8, y: 1.3, angle: aa, speed: 6, kind: 'pink', shape: 'heart', size: 0.38, life: 2.6, spin: 2 }); }
      f.ppg.snd.play('kiss', { pan: f.pan(b.x), gain: 0.5 });
    });
  });
  // ONE-TWO: a preview of her count, jogging in at 4 m/s
  at(23.8, (f) => { const b = H(f); if (f.court.stagger) return; b.behave = 'chase'; b.behaveOpts.speed = 4; });
  at(24.433, (f) => slash(f, { r: 2.6, half: 55, end: 25.210, clip: 'Sword_Regular_A' }));
  at(24.816, (f) => slash(f, { r: 2.6, half: 55, end: 25.601, clip: 'Sword_Regular_B' }));
  at(25.65, (f) => { const b = H(f); b.behave = 'hold'; b.behaveOpts.speed = 2.4; });
  // KISS RING: she spins
  at(25.979, (f) => { const b = H(f); if (!f.court.stagger) { act(f, 'Dance_Loop', 26.8); hold(f, 26.8); } heartRing(f, { w: 2.0, th: 0.5, start: 25.979, end: 26.741, n: 10, speed: 5, shape: 'kiss', size: 0.4 }); });
  at(27.533, (f) => { if (f.court.pretty && !f.boss.busy) upper(f, 'Yes', 0.7); });
  // BREAK: she spins with the gas can and pours an X of fuel across the floor
  at(27.95, (f) => { if (f.court.pretty) goTo(f, CROSS.x, CROSS.z, 0.4); });
  at(28.301, (f) => { const b = H(f); b.show('gas', true); act(f, 'Dance_Loop', 29.4); hold(f, 29.9); f.ppg.fuel.mat.uniforms.uA.value = 1; f.ppg.pour = { t0: 28.301, t1: 29.09 }; f.ppg.snd.play('splash', { pan: 0, gain: 0.3 }); });
  at(29.476, (f) => { const b = H(f); b.show('gas', false); f.ppg.snd.play('clang', { pan: f.pan(b.x + 3), gain: 0.35, rate: 1.6 }); });

  // the trails are down: they show white from the crossing out, full on the Zippo (the fire starts at the crossing,
  // right by her, on the downbeat: it needs its two beats like any white attack). Then the flames are the warning.
  at(29.09, (f) => {
    TRAILS.forEach(([x, z], i) => { const a = ang(CROSS, { x, z }), L = dist(CROSS, { x, z });
      zone(f, { shape: 'rect', x: CROSS.x, z: CROSS.z, angle: a, w: 0.45, h: L, kind: 'white', start: 29.09, end: 29.864, owner: 'court', noHurt: true, silent: i > 0 }); });
  });
  // ================= §2 VERSE 1: LIT THE GASOLINE (a court set piece: it runs even if she's guilty) =================
  at(29.864, (f) => {
    const b = H(f); b.show('zippo', true); f.ppg.snd.play('zippo', { pan: f.pan(b.x), gain: 0.6 });
    f.ppg.fire.mat.uniforms.uA.value = 1; f.ppg.burn = { t0: 29.864, t1: 31.019, off: 31.407 };
    f.ppg.snd.play('flame', { pan: 0, gain: 0.55 });
    for (const [x, z] of TRAILS) {
      const a = ang(CROSS, { x, z }), L = dist(CROSS, { x, z });
      hazard(f, { t0: 29.864, t1: 31.407, owner: 'court', shape: (t) => { const k = Math.min(1, (t - 29.864) / (31.019 - 29.864)); if (k <= 0.02) return null; return { shape: 'rect', x: CROSS.x, z: CROSS.z, angle: a, w: 0.45, h: L * k }; } });
    }
    f.at(30.05, () => { b.show('zippo', false); act(f, 'Idle_Talking_Loop', 31.3); face(b.fig, 'grin'); f.ppg.faceUntil = 31.4; });
  });
  at(31.407, (f) => { f.court.exhibit('zippo', CROSS.x + 0.3, CROSS.z + 0.5, { r: 0.8 }); f.ppg.fire.mat.uniforms.uA.value = 0; f.ppg.fuel.mat.uniforms.uA.value = 0; });
  // ONE, TWO, FUCK YOU: her count (the song's own knocks on "one" and "two" are the tell)
  at(31.407, (f) => { const b = H(f); if (f.court.stagger) return; b.show('knife', true); f.ppg.snd.play('flick', { pan: f.pan(b.x), gain: 0.6 }); grin(f, 3); b.behave = 'chase'; b.behaveOpts.speed = 3.5; });
  at(32.181, (f) => slash(f, { r: 2.8, half: 60, end: 32.955, clip: 'Sword_Regular_A' }));
  at(32.567, (f) => slash(f, { r: 2.8, half: 60, end: 33.340, clip: 'Sword_Regular_B' }));
  at(32.955, (f) => { const b = H(f); b.behave = 'hold'; lungeLane(f, { len: 4, w: 0.7, over: 1, end: 33.72, travel: 0.2, windup: 0.25 }); });
  at(33.75, (f) => { const b = H(f); hold(f, 34.4); b.faceTarget = f.player; });
  at(34.45, (f) => { H(f).show('knife', false); });

  // ================= §3 CHORUS 1: the first real exam =================
  at(33.72, (f) => heartRing(f, { w: 1.6, th: 0.5, start: 33.72, end: 34.502, n: 12, speed: 5.5 }));
  at(35.266, (f) => slide(f, { end: 36.052, h: 9, t1: 36.816 }));
  // SKIRT TOO SHORT: the skirt spin; safe within 1.8 m of her or beyond 3.2
  at(37.208, (f) => { const b = H(f); const z = zone(f, { shape: 'ring', x: b.x, z: b.z, w: 3.2, param: 1.4, kind: 'white', start: 37.208, end: 38.362, damage: 1, melee: true, follow: () => ({ x: b.x, z: b.z }) });
    f.at(37.9, () => { if (!z.dead) { act(f, 'Dance_Loop', 38.7); hold(f, 38.75); f.ppg.snd.play('whoosh', { pan: f.pan(b.x), gain: 0.4, at: 0.3 }); } }); });
  at(38.756, (f) => { if (f.court.pretty && !f.boss.busy) upper(f, 'Yes', 0.75); });
  // SWITCHBLADE SMILE (a court piece): 13 knives in an arc of r 4.2 facing YOU, flicking from the centre outward
  at(39.923, (f) => {
    const b = H(f), a0 = ang(b, you(f));
    f.ppg.knives.smile({ c: { x: b.x, z: b.z }, a0, r: 4.2, n: 13, span: 75, t0: 39.923, t1: 40.695, tele: 40.309, tOff: 42.629,
      arc: { w: 5.0, h: 1.6, end: 42.043 }, flicks: (i, n) => 41.461 + Math.round(Math.abs(i - (n - 1) / 2)) * 0.097 });
    hold(f, 42.7); act(f, 'Idle_Talking_Loop', 42.6); grin(f, 2.7); b.faceTarget = null;
  });
  // inside the smile, she slaps (pink: parry it)
  at(41.461, (f) => { const b = H(f); if (dist(b, you(f)) < 3.2) slap(f, { end: 42.239 }); });
  at(42.629, (f) => { const b = H(f); b.faceTarget = f.player; lungeLane(f, { len: 9, w: 0.9, end: 43.794, travel: 0.385, windup: 0.3, clip: 'Shield_Dash' }); });
  // LOCK ME IN: a big pink kiss on "in"
  kissAt(T, 44.566, 45.342, { size: 0.6, r: 1.0 });
  at(45.7, (f) => { if (f.court.pretty) goTo(f, 0, -4.5, 1.1); });
  // THROW AWAY THE KEY: the blackout is the tell; the key flies down the lane, hangs in the silence, zips back
  at(46.897, (f) => {
    const b = H(f); hold(f, 50.4);
    const from = { x: b.x, z: b.z }, a = ang(from, you(f));
    let L = 14; for (let d = 0.5; d <= 14; d += 0.25) { const p = { x: from.x + Math.sin(a) * d, z: from.z + Math.cos(a) * d }; if (Math.abs(p.x) > 10.7 || Math.abs(p.z) > 6.7) { L = d - 0.25; break; } }
    const end = { x: from.x + Math.sin(a) * L, z: from.z + Math.cos(a) * L };
    b.faceNow(end.x, end.z); b.faceTarget = null; b.show('key', true); f.ppg.snd.play('draw', { pan: f.pan(b.x), gain: 0.6 });
    upper(f, 'Sword_Block', 0.6);
    zone(f, { shape: 'rect', x: from.x, z: from.z, angle: a, w: 0.9, h: L, kind: 'white', start: 46.897, end: 48.83, owner: 'court', noHurt: true });
    hazard(f, { t0: 48.83, t1: 50.18, owner: 'court', damage: 2, shape: { shape: 'rect', x: from.x, z: from.z, angle: a, w: 0.9, h: L } });
    const behind = clampTo(f, { x: from.x - Math.sin(a) * 2, z: from.z - Math.cos(a) * 2 }, 0.8);
    f.ppg.key = { from, end, a, behind, t0: 48.94, t1: 49.592, t2: 49.985, t3: 50.18 };
    f.at(48.6, () => act(f, 'OverhandThrow', 49.2, { from: 0.1, to: 0.8 }));
    f.at(48.94, () => { b.show('key', false); f.ppg.snd.play('whirr', { pan: f.pan(from.x), gain: 0.5 }); });
    f.at(49.592, () => f.ppg.snd.play('whirr', { pan: f.pan(end.x), gain: 0.45, rate: 0.9 }));
    f.at(49.985, () => f.ppg.snd.play('whoosh', { pan: f.pan(end.x), gain: 0.5 }));
    f.at(50.18, () => { f.ppg.snd.play('stick', { pan: f.pan(behind.x), gain: 0.6 }); f.cam.shake(0.4, 0.1); f.ppg.key = null; f.court.exhibit('key', behind.x, behind.z, { r: 0.9, h: 1.2 }); b.faceTarget = f.player; });
  });

  // ================= §4 POST 1: the vanity =================
  at(50.3, (f) => { if (f.court.pretty) goTo(f, CROSS.x, CROSS.z - 0.2, 1.1); });
  at(51.537, (f) => {
    hold(f, 53.1);
    const words = [52.304, 52.686, 53.079];
    let prev = 51.537;
    words.forEach((w, i) => { const s0 = prev; heartRing(f, { w: 1.6, th: 0.5, start: s0, end: w, n: 8, speed: 6, rot: i * Math.PI / 8 }); prev = w; f.at(w, () => { f.ppg.flats.flare(f.t); if (!f.court.stagger) upper(f, 'Spell_Simple_Shoot', 0.33, { from: 0.25, to: 0.8 }); }); });
  });
  at(53.1, (f) => { const b = H(f); if (!f.court.pretty || b.broken >= 3) return; b.show('compact', true); b.props.compact.userData.open(1); act(f, 'Spell_Simple_Idle_Loop', 54.6); upper(f, 'Spell_Simple_Enter', 0.4); face(b.fig, 'pout'); f.ppg.faceUntil = 54.5; });
  at(54.62, (f) => { const b = H(f); b.show('compact', false); });
  // no verdict waiting on the pan: she gasps, laughs it off, and slaps (close) or sends two kisses
  at(54.636, (f) => {
    const C = f.court; if (C.waiting.length || C.flying.some((x) => x.wait)) return;
    const b = H(f);
    f.at(55.018, () => { if (!C.pretty) return; face(b.fig, 'scandalized'); f.ppg.faceUntil = 55.4; f.at(55.4, () => { if (C.pretty) act(f, 'Idle_No_Loop', 56.6); }); });
    if (dist(b, you(f)) < 3) { slap(f, { start: 54.636, end: 55.404 }); slap(f, { start: 55.018, end: 55.793, clip: 'Punch_Cross' }); }
    else { kissAt(null, 55.018, 55.793, { now: f }); kissAt(null, 55.4, 56.183, { now: f }); }
  });
  // ================= §5 VERSE 2: THE EVIDENCE ROOM =================
  at(57.75, (f) => { if (f.court.pretty) goTo(f, 0, -4.4, 1.0); });
  at(58.74, (f) => { if (f.court.pretty && !f.boss.busy) { act(f, 'Interact', 59.9); hold(f, 60.0); } });
  // MIRANDA CARDS: four finger-gun flicks, each a white lane two beats before it leaves
  at(59.95, (f) => { if (!f.court.stagger) act(f, 'Pistol_Idle_Loop', 62.2); });
  for (const r of [60.824, 61.211, 61.598, 61.986]) at(r - 0.774, (f) => { shot(f, { release: r, w: 0.3, h: 14, speed: 11, size: 0.3, shape: 'card' }); f.at(r - 0.15, () => { if (!f.court.stagger) upper(f, 'Pistol_Shoot', 0.3); }); });
  // GRAND THEFT HOODIE: an evidence bag drops from the fly loft, opposite YOU
  at(62.371, (f) => {
    const p = { x: THREE.MathUtils.clamp(-f.player.x, -9, 9), z: THREE.MathUtils.clamp(-f.player.z, -5.5, 5.5) };
    zone(f, { shape: 'circle', x: p.x, z: p.z, w: 1.0, kind: 'white', start: 62.371, end: 63.143, owner: 'court', damage: 1, onImpact: () => { f.ppg.snd.play('whump', { pan: f.pan(p.x), gain: 0.6 }); f.ppg.snd.play('chain', { pan: f.pan(p.x), gain: 0.3 }); } });
    f.ppg.drop = { kind: 'hoodie', x: p.x, z: p.z, t0: 62.371, t1: 63.143 };
    f.ppg.snd.play('whine', { pan: f.pan(p.x), gain: 0.5, rate: 0.5 });
    f.at(63.143, () => { f.ppg.drop = null; f.court.exhibit('hoodie', p.x, p.z, { r: 0.85 }); });
  });
  // RECEIPTS FOR EVERY GIFT: two a beat, a sprinkler sweeping +-35 deg round YOU; the cases and tables are cover
  at(63.143, (f) => {
    const b = H(f); if (f.court.stagger) return; hold(f, 65.6); act(f, 'Idle_Talking_Loop', 65.5);
    f.ppg.snd.play('chime', { pan: f.pan(b.x), gain: 0.4, rate: 2.2 });
    for (let bar = 0; bar < 2; bar++) zone(f, { shape: 'cone', x: b.x, z: b.z, angle: ang(b, you(f)), w: 10, param: 40 * Math.PI / 180, kind: 'dim', color: new THREE.Color(0.06, 0.07, 0.09), start: 63.143 + bar * 4 * f.beat, end: 63.143 + (bar + 1) * 4 * f.beat - 0.05, noHurt: true, silent: true, follow: () => ({ x: b.x, z: b.z, angle: ang(b, you(f)) }) });
    for (let i = 0; i < 12; i++) {
      const tt = 63.143 + i * f.beat / 2, pink = i === 3 || i === 7 || i === 10;
      f.at(tt, () => {
        if (f.court.stagger) return;
        const a = ang(b, you(f)) + Math.sin((i % 8) / 8 * Math.PI * 2) * 35 * Math.PI / 180;
        f.proj.spawn({ x: b.x + Math.sin(a) * 0.6, z: b.z + Math.cos(a) * 0.6, y: 1.3, angle: a, speed: 7, kind: pink ? 'pink' : 'white', shape: pink ? 'heart' : 'card', size: pink ? 0.32 : 0.28, life: 2.4, spin: pink ? 2 : 8, fn: cover(f) });
        f.ppg.snd.play('card', { pan: f.pan(b.x), gain: 0.4, gate: 0.02 });
        if (i % 2 === 0) upper(f, 'Spell_Simple_Shoot', 0.3, { from: 0.3, to: 0.8 });
      });
    }
  });
  // YOUR NEW GIRL'S STALKING: she stalks YOU at about 2 m and slaps (pink: parry them)
  at(65.5, (f) => { const b = H(f); if (f.court.stagger) return; b.behave = 'chase'; b.behaveOpts.speed = 2.8; b.walkClip = 'Walk_Formal_Loop'; });
  for (const e of [66.234, 67.018, 67.779]) at(e - 0.774, (f) => slap(f, { end: e, clip: e === 67.018 ? 'Punch_Cross' : 'Melee_Hook' }));
  at(67.95, (f) => { H(f).behave = 'hold'; });
  // LIVE-STREAMING MELTDOWNS FROM THE WITNESS FLOOR: up onto the stand; the four phones flash on the beat
  at(68.2, (f) => { const b = H(f); b.behave = 'hold'; hold(f, 72.6); act(f, 'NinjaJump_Start', 68.5); b.moveTo(9.8, -4.5, 0.754, { easing: 'inOut', arc: 1.1, land: 1.1 }); });
  at(68.96, (f) => { const b = H(f); if (!b.near(9.8, -4.5)) return;   // (stunned as she went: she isn't up there)
    act(f, 'Idle_TalkingPhone_Loop', 72.3); b.faceTarget = null; b.faceNow(9.8, 3); f.ppg.snd.play('hum', { pan: 0.6, gain: 0.5 }); });
  for (const [tt, name] of [[69.727, 'NW'], [70.114, 'NE'], [70.501, 'SW'], [70.886, 'SE'], [71.275, 'NW'], [71.664, 'NE']]) at(tt - 0.774, (f) => {
    const ph = f.ppg.props.phones.find((q) => q.name === name); if (!ph || !ph.alive) return;
    const o = ph.obj.position, a = ang(o, you(f));
    const z = zone(f, { shape: 'cone', x: o.x, z: o.z, angle: a, w: 13, param: 7 * Math.PI / 180, kind: 'white', start: f.t, end: tt, owner: 'court', damage: 1,
      onImpact: (hit) => { ph.flashAt = f.t; f.ppg.snd.play('shutter', { pan: f.pan(o.x), gain: 0.6 }); if (hit === 'hit') f.fx.flash(new THREE.Color(0.45, 0.45, 0.5), 1); } });
    f.ppg.phoneZones.push({ z, ph });
  });
  // YOU SAY I BROKE YOUR HEART: she mimes it on the stand, hops down
  at(72.0, (f) => { if (f.court.pretty) upper(f, 'Hit_Chest', 0.4); });
  at(72.426, (f) => { const b = H(f); b.faceTarget = f.player; b.moveTo(7.6, -2.6, 0.52, { arc: 0.6, land: 0 }); act(f, 'NinjaJump_Land', 73.1); });
  // WHERE'S THE CORPUS DELICTI? a glass case with a broken red glass heart lowers over YOU
  at(73.197, (f) => {
    const p = clampTo(f, you(f), 1.0);
    zone(f, { shape: 'circle', x: p.x, z: p.z, w: 1.4, kind: 'white', start: 73.197, end: 74.766, owner: 'court', damage: 2,
      onImpact: () => { f.ppg.snd.play('glass', { pan: f.pan(p.x), gain: 0.8 }); f.fx.chips(p.x, 0.8, p.z, new THREE.Color(2.6, 2.6, 2.8), 30); f.cam.shake(0.5, 0.12); } });
    f.ppg.drop = { kind: 'heart', x: p.x, z: p.z, t0: 73.197, t1: 74.766 };
    f.ppg.snd.play('whine', { pan: f.pan(p.x), gain: 0.5, rate: 0.45 });
    f.at(74.766, () => { f.ppg.drop = null; f.court.exhibit('heart', p.x, p.z, { r: 0.9, h: 0.6 }); });
  });
  // I LEFT YOU OBSESSED: three kisses that follow YOU obsessively
  for (const tt of [75.147, 75.538, 75.94]) at(tt, (f) => { if (f.court.stagger) return; upper(f, 'Spell_Simple_Shoot', 0.35, { from: 0.25, to: 0.85 }); send(f, { arrive: tt + 4, homing: 1.0, life: 4, vmin: 4.5, vmax: 4.5, tele: false, shape: 'kiss', size: 0.42 }); });

  // ================= §6 PRE-CHORUS: CAUGHT RED-HANDED =================
  at(76.332, (f) => { const b = H(f); b.show('jacket', true); if (f.court.pretty && !b.busy) upper(f, 'Interact', 0.7); });
  for (const e of [77.857, 78.243, 78.622, 79.003, 79.397, 79.789]) at(e - 0.774, (f) => {
    const p = clampTo(f, you(f), 0.8);
    zone(f, { shape: 'circle', x: p.x, z: p.z, w: 1.3, kind: 'white', start: f.t, end: e, damage: 1,
      onImpact: () => { f.ppg.prints.stamp(p.x, p.z, 1.3); f.ppg.snd.play('splash', { pan: f.pan(p.x), gain: 0.5 }); f.ppg.snd.play('slap', { pan: f.pan(p.x), gain: 0.5 }); f.cam.shake(0.18, 0.06); } });
    f.at(e - 0.28, () => { if (!f.court.stagger && !f.boss.busy) upper(f, 'Zombie_Scratch', 0.45, { from: 0.2, to: 0.7 }); });
  });
  // WEARING YOUR JACKET: she flings it; it lands four metres in front of YOU (gold: it's yours)
  at(79.789, (f) => {
    const b = H(f); b.show('jacket', false);
    const a = ang(you(f), b), p = clampTo(f, { x: f.player.x + Math.sin(a) * 4, z: f.player.z + Math.cos(a) * 4 }, 0.8);
    goldMark(f, { x: p.x, z: p.z, r: 0.9, start: 79.789, end: 80.177 });
    f.ppg.fling = { kind: 'jacket', from: { x: b.x, z: b.z }, to: p, t0: 79.789, t1: 80.177 };
    f.ppg.snd.play('whoosh', { pan: f.pan(b.x), gain: 0.4 });
    f.at(80.177, () => { f.ppg.fling = null; f.court.exhibit('jacket', p.x, p.z, { r: 0.85 }); });
    // PAINTING THE TOWN MEAN: a bucket splash at YOU
    zone(f, { shape: 'cone', x: b.x, z: b.z, angle: ang(b, you(f)), w: 5.5, param: 35 * Math.PI / 180, kind: 'white', start: 79.789, end: 80.565, damage: 1, melee: true,
      onImpact: (hit, sh) => { f.ppg.snd.play('splash', { pan: f.pan(b.x), gain: 0.7 }); for (let k = 0; k < 4; k++) { const aa = sh.angle + (k - 1.5) * 0.25, d = 2 + k * 0.8; f.ppg.prints.stamp(b.x + Math.sin(aa) * d, b.z + Math.cos(aa) * d, 0.8); } } });
    f.at(80.2, () => { if (!f.court.stagger) act(f, 'OverhandThrow', 80.7, { from: 0.2, to: 0.75 }); });
  });
  // THE GLITCH IN YOUR GAME: the set glitches; she smears out and comes back behind the front page
  at(81.718, (f) => { const b = H(f); f.fx.aberrate(3.2); f.fx.flash(new THREE.Color(0.25, 0.05, 0.1), 1); f.ppg.snd.play('glitch', { pan: f.pan(b.x), gain: 0.5 }); f.ppg.glitchUntil = 81.87; b.root.visible = false; b.intangible = true; });
  at(82.095, (f) => { const b = H(f); b.stop(); b.place(0, -5.5, 0); b.root.visible = true; b.intangible = false; b.faceTarget = f.player; hold(f, 84.5); act(f, 'Idle_Talking_Loop', 82.9); });
  at(82.484, (f) => f.ppg.snd.play('unroll', { pan: 0, gain: 0.6 }));
  // THE BURST: she winds up behind the paper and bursts through it down a lane at YOU
  at(82.883, (f) => {
    const b = H(f), a = ang(b, you(f)), L = dist(b, you(f)) + 2;
    const end = clampTo(f, { x: b.x + Math.sin(a) * L, z: b.z + Math.cos(a) * L }, 0.9);
    b.faceNow(end.x, end.z); act(f, 'Shield_OneShot', 84.0);
    const z = zone(f, { shape: 'rect', x: b.x, z: b.z, angle: a, w: 0.9, h: dist(b, end), kind: 'white', start: 82.883, end: 84.052, damage: 2, melee: true });
    f.at(84.052, () => {
      if (z.dead) return;
      const xc = b.x + Math.tan(a) * (PAGE.z - b.z);
      f.ppg.page.tear(xc, 0, 1.6, 2.6);
      f.fx.glitter(xc, 1.6, PAGE.z, new THREE.Color(3, 1.2, 2), 50, 2.0); f.fx.chips(xc, 1.6, PAGE.z, new THREE.Color(2.4, 2.3, 2.1), 40);
      f.ppg.snd.play('tear', { pan: f.pan(xc), gain: 0.9 }); f.cam.shake(0.6, 0.15);
      act(f, 'Shield_Dash', 84.5, { from: 0.1, to: 0.7 }); b.moveTo(end.x, end.z, 0.39, { easing: 'in' });
    });
  });

  // ================= §7 CHORUS 2 =================
  // THE PAGE FALLS: rip YOU through it on the impact (strike or catch), or it lands on YOU
  at(84.442, (f) => {
    zone(f, { shape: 'rect', x: 0, z: PAGE.z, angle: 0, w: 11, h: 4.5, kind: 'pink', start: 84.442, end: 85.6, owner: 'court', noHurt: true });
    f.ppg.snd.play('whump', { pan: 0, gain: 0.4, at: 1.0 });
  });
  at(85.6, (f) => {
    const pl = f.player; if (!(pl.z >= PAGE.z - 0.2 && pl.z <= PAGE.z + PAGE.h + 0.2 && Math.abs(pl.x) < 10.8)) return;
    const S = f.ppg;
    if (pl.catching || f.t - (S.lastStrikeT ?? -9) <= 0.2) { ripThrough(f); return; }
    S.ripPending = 85.8;
  });
  at(85.95, (f) => heartRing(f, { w: 1.6, th: 0.5, start: 85.95, end: 86.7, n: 10, speed: 5.5 }));
  // SKIRT TOO SHORT x2: in, then out
  at(87.149, (f) => { const b = H(f); zone(f, { shape: 'ring', x: b.x, z: b.z, w: 3.2, param: 1.4, kind: 'white', start: 87.149, end: 87.921, damage: 1, melee: true, follow: () => ({ x: b.x, z: b.z }) }); f.at(87.6, () => { if (!f.court.stagger) act(f, 'Dance_Loop', 88.7); }); hold(f, 88.8); });
  at(87.921, (f) => { const b = H(f); zone(f, { shape: 'circle', x: b.x, z: b.z, w: 1.8, kind: 'white', start: 87.921, end: 88.697, damage: 1, melee: true, follow: () => ({ x: b.x, z: b.z }) }); });
  at(88.9, (f) => { if (f.court.pretty && !f.boss.busy) upper(f, 'Yes', 0.7); });
  // SWITCHBLADE SMILE x2: the inner arc spreads from the centre out, the outer from the corners in
  at(89.471, (f) => {
    const b = H(f), a0 = ang(b, you(f)), c = { x: b.x, z: b.z };
    f.ppg.knives.smile({ c, a0, r: 4.2, n: 13, span: 75, t0: 89.471, t1: 90.352, tele: 90.352, tOff: 93.0, arc: { w: 5.0, h: 1.6, end: 91.596 }, flicks: (i, n) => 91.014 + Math.round(Math.abs(i - (n - 1) / 2)) * 0.097 });
    f.ppg.knives.smile({ c, a0, r: 7.0, n: 17, span: 65, t0: 89.471, t1: 90.352, tele: 90.352, tOff: 93.0, arc: { w: 7.8, h: 1.6, end: 92.564 }, flicks: (i, n) => 91.788 + ((n - 1) / 2 - Math.round(Math.abs(i - (n - 1) / 2))) * 0.097 });
    hold(f, 92.6); act(f, 'Idle_Talking_Loop', 92.5); grin(f, 3);
  });
  // IF RUINING YOUR LIFE IS A FELONY: four slashes, advancing
  for (const [k, e] of [[0, 92.96], [1, 93.343], [2, 93.729], [3, 94.115]]) at(e - 0.774, (f) => {
    const b = H(f);
    slash(f, { r: 2.8, half: 60, end: e, clip: k % 2 ? 'Sword_Regular_B' : 'Sword_Regular_A', lead: 0.3 });
    f.at(e - 0.2, () => { if (f.court.stagger) return; const a = ang(b, you(f)); const c = clampTo(f, { x: b.x + Math.sin(a) * 1.2, z: b.z + Math.cos(a) * 1.2 }, 0.9), p = f.arena.resolve(c.x, c.z, b.radius); b.moveTo(p.x, p.z, 0.2, { easing: 'out', straight: true }); });
  });
  at(92.2, (f) => { const b = H(f); b.show('knife', true); });
  // LOCK ME UP: she slides into the centre lane; the cell walls slam on the song's double knock
  at(94.2, (f) => { const b = H(f); b.show('knife', false); const tz = f.arena.resolve(0, THREE.MathUtils.clamp(b.z, -5, 3), b.radius).z; act(f, 'Slide_Loop', 94.5); b.moveTo(0, tz, 0.3, { easing: 'out' }); hold(f, 95.0); });
  for (const wx of CELLS.xs) at(Math.abs(wx) > 4 ? 94.502 : 94.89, (f) => {
    const slamT = Math.abs(wx) > 4 ? CELLS.outer : CELLS.inner;
    zone(f, { shape: 'rect', x: wx, z: -7, angle: 0, w: 0.35, h: 14, kind: 'white', start: f.t, end: slamT, owner: 'court', damage: 1,
      onImpact: (hit) => { f.ppg.snd.play('clang', { pan: f.pan(wx), gain: 0.7 }); f.cam.shake(0.35, 0.1); if (hit === 'hit') { const pl = f.player; pl.x = wx + Math.sign(pl.x - wx || 1) * 0.6; } } });
  });

  // ================= §8 THE CELLS AND BOOKING =================
  at(96.6, (f) => { const b = H(f); if (Math.abs(f.player.x) < 2.2 && Math.abs(b.x) < 2.2) slap(f, { start: 96.457, end: 97.208 }); });
  at(97.208, (f) => { const b = H(f); if (f.court.stagger) return; hold(f, 98.0); act(f, 'Consume', 98.0, { from: 0.1, to: 0.9 }); face(b.fig, 'pout'); f.ppg.faceUntil = 98.0; });
  at(97.76, (f) => { const b = H(f); f.ppg.snd.play('gulp', { pan: f.pan(b.x), gain: 0.6 }); f.ppg.swallowed = true; f.fx.glitter(b.x, 1.6, b.z, new THREE.Color(3, 2, 0.5), 20, 0.4); });
  // BOOKING FLASHES 1-3: a third of every lane each; stand where it's dark. Each flash ejects a mugshot.
  for (const [tele, fl, z0, zc] of [[97.997, 98.745, -7, -4.67], [98.374, 99.131, 2.33, 4.67], [98.745, 99.531, -2.33, 0]]) at(tele, (f) => {
    zone(f, { shape: 'rect', x: 0, z: z0, angle: 0, w: 11, h: 4.67, kind: 'white', start: tele, end: fl, owner: 'court', damage: 1,
      // three in 0.8 s: the room only pulses (the band's own flash and the camera dish say where); caught in it, a soft white
      onImpact: (hit) => { f.ppg.cells.flash(f.t); f.ppg.snd.play('flash', { pan: 0, gain: 0.7 }); f.fx.flash(new THREE.Color(0.12, 0.12, 0.14), 1); if (hit === 'hit') f.fx.flash(new THREE.Color(0.5, 0.5, 0.55), 1); } });
    f.ppg.snd.play('whine', { pan: 0, gain: 0.45 });
    f.at(fl + f.beat, () => { const lx = laneX(f.player.x); f.court.exhibit('mugshot', lx, zc + (Math.random() - 0.5), { r: 0.75 }); f.ppg.snd.play('whirr', { pan: f.pan(lx), gain: 0.25, rate: 2 }); });
  });
  at(99.6, (f) => { const b = H(f); if (f.court.pretty) goTo(f, 0, -5.2, 1.4); f.ppg.snd.play('chain', { pan: 0, gain: 0.5 }); });
  // BOOKING FLASHES 4-6: the camera tracks YOU
  for (const fl of [101.85, 102.228, 102.624]) at(fl - 0.774, (f) => {
    const p = clampTo(f, you(f), 1.75);
    zone(f, { shape: 'rect', x: p.x, z: p.z - 3.5, angle: 0, w: 1.75, h: 7, kind: 'white', start: f.t, end: fl, owner: 'court', damage: 1,
      onImpact: (hit) => { f.ppg.cells.flash(f.t); f.ppg.snd.play('flash', { pan: f.pan(p.x), gain: 0.6 }); if (hit === 'hit') f.fx.flash(new THREE.Color(0.5, 0.5, 0.55), 1); } });
    f.ppg.snd.play('whine', { pan: f.pan(p.x), gain: 0.4 });
    f.at(fl + f.beat, () => { f.court.exhibit('mugshot', THREE.MathUtils.clamp(p.x + 1.4, -10, 10), p.z, { r: 0.75 }); });
  });
  // she poses for her mugshots: front, left profile, right profile
  at(101.85, (f) => { const b = H(f); if (!f.court.pretty) return; b.faceTarget = null; b.faceNow(b.x, b.z + 5); upper(f, 'Yes', 0.4); });
  at(102.228, (f) => { const b = H(f); if (!f.court.pretty) return; b.faceNow(b.x - 5, b.z); });
  at(102.624, (f) => { const b = H(f); if (!f.court.pretty) return; b.faceNow(b.x + 5, b.z); });
  at(103.2, (f) => { H(f).faceTarget = f.player; });

  // ================= §9 BRIDGE: THE MIRROR ROOM =================
  // CLICK THOSE CUFFS TIGHT: caught, she's BOUND; hit, YOU is chained to her; dodged, they clatter
  at(106.102, (f) => {
    const p = clampTo(f, you(f), 0.8); f.ppg.cuffAt = p;
    zone(f, { shape: 'circle', x: p.x, z: p.z, w: 1.0, kind: 'pink', start: 106.102, end: 107.268, owner: 'court', noHurt: true, silent: false });
    f.at(106.2, () => { const b = H(f); b.show('cuff', true); act(f, 'OverhandThrow', 106.75, { from: 0.1, to: 0.8 }); });
    f.at(106.5, () => { const b = H(f); b.show('cuff', false); const from = { x: b.x, z: b.z }; f.ppg.fling = { kind: 'cuff', from, to: p, t0: 106.5, t1: 107.268, chain: true }; f.ppg.snd.play('chain', { pan: f.pan(b.x), gain: 0.4 }); });
  });
  at(107.268, (f) => {
    const S = f.ppg, pl = f.player, p = S.cuffAt; S.fling = null;
    if (!p) return;
    const inside = Math.hypot(pl.x - p.x, pl.z - p.z) < 1.0 + 0.35;
    S.snd.play('click', { pan: f.pan(p.x), gain: 0.9 }); S.snd.play('chain', { pan: f.pan(p.x), gain: 0.4 });
    if (inside && pl.catching) {
      const q = pl.tryCatch(); if (q) pl.caught(q, f._ctx(0));
      f.fx.caught(pl.x, 1.2, pl.z, true); f.sfx.catch && f.sfx.catch('perfect', f.pan(pl.x));
      S.bound = true; f.court.verdict(107.268, { until: 113.473, scripted: true, noLip: true, raise: 106.88, why: 'cuffs' });
    } else if (inside && !pl.invulnerable) { S.chain = { t0: f.t, hits: 0 }; S.snd.play('click', { pan: f.pan(pl.x), gain: 0.7, at: 0.05, force: true }); }
    else { S.snd.play('clang', { pan: f.pan(p.x), gain: 0.3, rate: 2 }); }
  });
  // LET THE COLD BITE DEEP: frost bites in rings toward (0, -1.5); frozen floor re-bites every two beats
  for (const [tele, end, th] of [[107.645, 108.811, 6], [109.216, 110.36, 7.5], [110.747, 111.917, 9]]) at(tele, (f) => {
    zone(f, { shape: 'ring', x: FROST.c.x, z: FROST.c.z, w: 12, param: th, kind: 'white', start: tele, end, owner: 'court', damage: 1, onImpact: () => { f.ppg.frost.flash(f.t); f.ppg.snd.play('ice', { pan: 0, gain: 0.7 }); } });
  });
  for (const [e, r] of [[109.585, 6], [111.134, 4.5], [112.691, 3]]) at(e - 0.387, (f) => {
    zone(f, { shape: 'ring', x: FROST.c.x, z: FROST.c.z, w: 12, param: 12 - r, kind: 'white', start: f.t, end: e, owner: 'court', damage: 1, silent: true, onImpact: () => { f.ppg.frost.flash(f.t); f.ppg.snd.play('ice', { pan: 0, gain: 0.35, rate: 1.3 }); } });
  });
  // BOUND: she fights in her cuffs. NOT BOUND: point-blank kisses (and yanks on the chain)
  at(107.3, (f) => {
    const S = f.ppg;
    if (S.bound) {
      f.at(108.026, () => slash(f, { r: 2.4, half: 50, start: 108.026, end: 108.811, clip: 'Zombie_Scratch' }));
      f.at(109.216, () => lungeLane(f, { len: 5, w: 0.9, start: 109.216, end: 110.36, travel: 0.3, clip: 'Shield_Dash' }));
      f.at(111.153, () => slash(f, { r: 2.4, half: 50, start: 111.153, end: 111.917, clip: 'Zombie_Scratch' }));
    } else {
      for (const [fire, arrive] of [[107.3, 108.026], [108.811, 109.606], [110.36, 111.153], [111.917, 112.684]]) kissAt(null, fire, arrive, { now: f, r: 0.9 });
    }
  });
  for (const y of [108.811, 110.36, 111.917]) at(y - 0.387, (f) => { if (f.ppg.chain) { f.ppg.chain.taut = y; f.ppg.snd.play('chain', { pan: 0, gain: 0.5 }); } });
  at(112.3, (f) => { f.sign('MY LAWYER IS MY MIRROR', { style: 'lipstick', x: -6, y: 3.3, z: -7.45, height: 0.42, at: 112.3, until: 121.2 }); });
  // the biggest lift of the song: the frost shatters (and any chain); four glass doubles step out of the mirrors
  at(113.473, (f) => {
    const S = f.ppg;
    S.snd.play('glass', { pan: -0.4, gain: 0.7 }); S.snd.play('glass', { pan: 0.4, gain: 0.6, at: 0.05, force: true }); S.snd.play('ice', { pan: 0, gain: 0.8 });
    f.fx.glitter(f.player.x, 0.5, f.player.z, new THREE.Color(1.6, 2.4, 3.2), 60, 4.0);
    if (S.chain) { S.chain = null; S.snd.play('chain', { pan: 0, gain: 0.6 }); }
    S.bound = false;
    const pl = f.player;
    S.doubles.list.forEach((d, i) => {
      const a = Math.PI / 4 + i * Math.PI / 2, x = THREE.MathUtils.clamp(pl.x + Math.sin(a) * 3.5, -7.4, 7.4), z = THREE.MathUtils.clamp(pl.z + Math.cos(a) * 3.5, -6.4, 3.4);
      d.alive = true; d.x = x; d.z = z; d.from = { x: Math.sign(x || 1) * 8, z: THREE.MathUtils.clamp(z, -4.4, 1.2) };
    });
    S.snd.play('chime', { pan: 0, gain: 0.5, rate: 0.8 });
  });
  // DOUBLES' KISS: she and every double blow a kiss at YOU (catch them all at once)
  at(113.859, (f) => {
    const S = f.ppg, tgt = you(f); const tag = 'dkiss' + f.t;
    zone(f, { shape: 'circle', x: tgt.x, z: tgt.z, w: 1.0, kind: 'pink', start: 113.859, end: 114.633, noHurt: true, owner: 'court' });
    const srcs = [{ x: f.boss.x, z: f.boss.z }, ...S.doubles.aliveList().map((d) => ({ x: d.x, z: d.z }))];
    for (const s0 of srcs) { const d = dist(s0, tgt), sp = Math.max(2, d / (114.633 - 113.859)); const q = f.proj.spawn({ x: s0.x, z: s0.z, y: 1.25, angle: ang(s0, tgt), speed: sp, kind: 'pink', shape: 'kiss', size: 0.42, life: d / sp + 0.05, tag }); }
    S.kissTag = tag; S.snd.play('kiss', { pan: 0, gain: 0.6 });
  });
  // SAYS I'M DOING FINE: she and every double spin
  at(115.021, (f) => {
    const b = H(f), S = f.ppg;
    zone(f, { shape: 'circle', x: b.x, z: b.z, w: 2.2, kind: 'white', start: 115.021, end: 115.794, damage: 1, melee: true, follow: () => ({ x: b.x, z: b.z }) });
    for (const d of S.doubles.aliveList()) zone(f, { shape: 'circle', x: d.x, z: d.z, w: 2.2, kind: 'white', start: 115.021, end: 115.794, owner: 'court', damage: 1 });
    f.at(115.35, () => { if (!f.court.stagger) act(f, 'Dance_Loop', 115.95); });
  });
  // I'LL TAKE THE SENTENCE: she offers her wrists; close in and she slaps
  at(116.568, (f) => { const b = H(f); if (f.court.pretty) { act(f, 'Interact', 117.3); hold(f, 117.35); } if (dist(b, you(f)) < 2.2) slap(f, { start: 116.568, end: 117.337 }); });
  // WAIT, I CHANGED MY MIND: twelve hearts out, hanging on the held word, and back in
  at(117.337, (f) => {
    const b = H(f);
    zone(f, { shape: 'ring', x: b.x, z: b.z, w: 1.6, param: 0.4, kind: 'pink', start: 117.337, end: 118.112, noHurt: true, follow: () => ({ x: b.x, z: b.z }) });
    f.at(118.112, () => {
      if (f.court.stagger) return;
      const c = { x: b.x, z: b.z };
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; f.proj.spawn({ x: c.x + Math.sin(a) * 0.6, z: c.z + Math.cos(a) * 0.6, y: 1.3, angle: a, speed: 6, kind: 'pink', shape: 'heart', size: 0.38, life: 2.4, spin: 2, fn: (q) => { if (q.owner !== 'boss') return; if (f.t >= 118.889 && f.t < 119.663) q.speed = 0; else if (f.t >= 119.663 && !q._back) { q._back = true; q.angle += Math.PI; q.speed = 6; } if (q._back && Math.hypot(q.x - c.x, q.z - c.z) < 0.5) q.dead = true; } }); }
      f.ppg.snd.play('whoosh', { pan: f.pan(b.x), gain: 0.5 });
    });
    f.at(118.889, () => { zone(f, { shape: 'ring', x: b.x, z: b.z, w: 5.2, param: 1.0, kind: 'pink', start: 118.889, end: 119.663, noHurt: true }); f.ppg.snd.play('hum', { pan: 0, gain: 0.25, rate: 2 }); });
    // any double still standing fires a shard
    f.at(118.889, () => { for (const d of f.ppg.doubles.aliveList()) shot(f, { from: { x: d.x, z: d.z }, start: 118.889, release: 119.663, w: 0.3, h: 12, speed: 14, shape: 'shard', size: 0.34, owner: 'court' }); });
  });
  at(121.215, (f) => { for (const d of f.ppg.doubles.aliveList()) f.ppg.doubles.shatter(d); });

  // ================= §10 I'M ALWAYS RIGHT: the HALL OF JUSTICE =================
  at(121.215, (f) => { const b = H(f); if (f.court.pretty) { b.faceTarget = null; b.faceNow(b.x, b.z - 5); upper(f, 'Spell_Simple_Enter', 0.6); } hold(f, 122.9);
    zone(f, { shape: 'rect', x: 5.5, z: -7, angle: 0, w: 5.5, h: 14, kind: 'white', start: 121.215, end: 122.77, owner: 'court', damage: 1, onImpact: () => { f.ppg.snd.play('stone', { pan: 0.7, gain: 0.8 }); f.cam.shake(0.8, 0.2); for (let k = 0; k < 4; k++) f.fx.dust(10.2, -5 + k * 3.5, 14); } });
    f.ppg.snd.play('grind', { pan: 0.7, gain: 0.5, at: 0.8 }); });
  at(122.9, (f) => { H(f).faceTarget = f.player; });
  for (const e of [123.535, 123.925]) at(e - 0.774, (f) => { const b = H(f); if (dist(b, you(f)) < 3) slap(f, { end: e, clip: e > 123.7 ? 'Punch_Cross' : 'Melee_Hook' }); });
  at(124.317, (f) => { const b = H(f); if (f.court.pretty) { b.faceTarget = null; b.faceNow(b.x, b.z + 5); upper(f, 'Spell_Simple_Enter', 0.6); } hold(f, 125.9);
    zone(f, { shape: 'rect', x: -5.5, z: -7, angle: 0, w: 5.5, h: 14, kind: 'white', start: 124.317, end: 125.849, owner: 'court', damage: 1, onImpact: () => { f.ppg.snd.play('stone', { pan: -0.7, gain: 0.85 }); f.cam.shake(0.9, 0.22); for (let k = 0; k < 4; k++) f.fx.dust(-10.2, -5 + k * 3.5, 14); } });
    f.ppg.snd.play('grind', { pan: -0.7, gain: 0.5, at: 0.8 }); });
  at(125.9, (f) => { const b = H(f); b.faceTarget = f.player; goTo(f, CROSS.x, CROSS.z, 1.4); hold(f, 135.2); });

  // ================= §11 THE CHANT: strike on "guilty", dodge on "pretty" =================
  at(126.247, (f) => { const b = H(f); zone(f, { shape: 'circle', x: CROSS.x, z: CROSS.z, w: 3.0, kind: 'white', start: 126.247, end: 127.56, damage: 1, melee: true }); f.at(127.1, () => { if (!f.court.stagger) act(f, 'Dance_Loop', 127.9); }); });
  for (const [tele, e, kind] of [[128.565, 129.3, 'A'], [129.86, 130.64, 'B'], [131.36, 132.05, 'A'], [132.05, 132.82, 'B']]) at(tele, (f) => slash(f, { r: 3.0, half: 55, start: tele, end: e, clip: kind === 'A' ? 'Sword_Regular_A' : 'Sword_Regular_B' }));
  at(132.05, (f) => lungeLane(f, { len: 3.4, w: 0.7, over: 0.6, start: 132.05, end: 133.21, travel: 0.2, windup: 0.22 }));
  at(128.0, (f) => H(f).show('knife', true));
  for (const [w, pretty] of [[127.56, 1], [129.3, 1], [129.86, 0], [130.64, 1], [131.36, 0], [132.05, 1], [132.82, 1], [133.21, 1], [133.598, 0]]) at(w, (f) => { f.ppg.floor.chant(f.t, pretty); f.ppg.justice.jolt(); if (pretty) f.ppg.snd.play('shing', { pan: 0, gain: 0.35, rate: 1.2 }); });
  at(129.86, (f) => f.court.verdict(129.86, { until: 130.64, stagger: 0, scripted: true, noLip: true, raise: 129.6, why: 'chant' }));
  at(131.36, (f) => f.court.verdict(131.36, { until: 132.05, stagger: 0, scripted: true, noLip: true, raise: 131.1, why: 'chant' }));
  at(133.598, (f) => { H(f).show('knife', false); f.court.verdict(133.598, { until: 136.691, lipFrom: 135.138, scripted: true, raise: 133.3, why: 'chant' }); });

  // ================= §12 FINAL CHORUS: everything at once =================
  at(137.082, (f) => slide(f, { start: 137.082, end: 138.229, h: 10, t1: 139.009 }));
  at(138.229, (f) => heartRing(f, { w: 1.6, th: 0.5, start: 138.229, end: 139.009, n: 12, speed: 5.5 }));
  at(139.1, (f) => { const b = H(f); if (f.court.stagger) return; b.behave = 'chase'; b.behaveOpts.speed = 4; b.show('knife', true); });
  at(139.78, (f) => slash(f, { r: 2.8, half: 60, start: 139.78, end: 140.567, clip: 'Sword_Regular_A' }));
  at(140.179, (f) => slash(f, { r: 2.8, half: 60, start: 140.179, end: 140.955, clip: 'Sword_Regular_B' }));
  at(140.567, (f) => { const b = H(f); b.behave = 'hold'; b.show('knife', false); zone(f, { shape: 'ring', x: b.x, z: b.z, w: 3.2, param: 1.4, kind: 'white', start: 140.567, end: 141.343, damage: 1, melee: true, follow: () => ({ x: b.x, z: b.z }) }); f.at(140.95, () => { if (!f.court.stagger) act(f, 'Dance_Loop', 141.6); }); });
  // SMILE LIKE A SWITCHBLADE SPREE: three nested smiles, firing one after another
  at(141.343, (f) => {
    const b = H(f), a0 = ang(b, you(f)), c = { x: b.x, z: b.z };
    const K = f.ppg.knives, wrecked = b.state === 'desperate';
    K.smile({ c, a0, r: 3.0, n: 11, span: 75, t0: 141.343, t1: 141.73, tele: 141.73, tOff: 144.6, droop: wrecked, arc: { w: 3.6, h: 1.2, end: 142.989 }, flicks: (i, n) => 142.504 + Math.round(Math.abs(i - (n - 1) / 2)) * 0.097 });
    K.smile({ c, a0, r: 5.5, n: 15, span: 70, t0: 141.343, t1: 141.73, tele: 141.73, tOff: 144.6, droop: wrecked, arc: { w: 6.2, h: 1.4, end: 143.57 }, flicks: (i, n) => 142.891 + ((n - 1) / 2 - Math.round(Math.abs(i - (n - 1) / 2))) * 0.097 });
    K.smile({ c, a0, r: 8.0, n: 19, span: 65, t0: 141.343, t1: 141.73, tele: 141.73, tOff: 144.6, droop: wrecked, arc: { w: 8.8, h: 1.6, end: 144.15 }, flicks: (i, n) => 143.277 + Math.round(Math.abs(i - (n - 1) / 2)) * 0.097 });
    hold(f, 145.9); act(f, 'Idle_Talking_Loop', 143.6); grin(f, 2.4);
  });
  // CUFFS AS COUTURE: catch either and she's BOUND for two bars
  for (const [th, arr] of [[143.665, 144.438], [144.052, 144.823]]) at(th, (f) => {
    const b = H(f); upper(f, 'OverhandThrow', 0.4, { from: 0.25, to: 0.8 });
    send(f, { arrive: arr, r: 1.0, size: 0.45, shape: 'ring', vmin: 3, vmax: 12, sound: 'chain', onFire: (q) => { if (q) q.tag = 'cuff'; } });
  });
  // SELF-LOVE: a giant pink heart swells at her chest and launches on "crime"
  at(145.986, (f) => { const b = H(f); hold(f, 147.0); act(f, 'Spell_Simple_Enter', 146.4); f.ppg.snd.play('gum', { pan: f.pan(b.x), gain: 0.4, rate: 1.4 }); f.ppg.selfLove = { t0: 145.986, t1: 146.373 }; });
  at(146.373, (f) => {
    const b = H(f); f.ppg.selfLove = null; if (f.court.stagger) return;
    act(f, 'Spell_Simple_Shoot', 146.9, { from: 0.2, to: 0.9 });
    send(f, { arrive: 147.535, r: 1.4, size: 1.0, shape: 'heart', vmin: 2, vmax: 12, sound: 'kiss', onFire: (q) => { if (q) { q.tag = 'selflove'; q.radius = 0.7; } } });
  });
  // AGAINST HUMANITY: her compact throws a mirror beam that sweeps from screen left to screen right
  at(147.535, (f) => {
    const b = H(f); if (f.court.stagger) return; const src = { x: b.x, z: b.z };
    const a0 = -75 * Math.PI / 180, a1 = 75 * Math.PI / 180;
    zone(f, { shape: 'arc', x: src.x, z: src.z, angle: 0, w: 13, h: 12, param: 75 * Math.PI / 180, kind: 'dim', color: new THREE.Color(0.06, 0.07, 0.09), start: 147.535, end: 149.082, noHurt: true, silent: true });
    f.pat.beam(f, { from: src, a0, a1, w: 0.7, h: 13, beats: (149.082 - 148.309) / f.beat, warm: (148.309 - 147.535) / f.beat, kind: 'white' });
    if (b.broken < 3) { b.show('compact', true); b.props.compact.userData.open(1); b.props.compact.userData.glow(1); }
    hold(f, 149.2); act(f, 'Spell_Simple_Idle_Loop', 149.1); f.ppg.snd.play('hum', { pan: f.pan(b.x), gain: 0.4, rate: 6 });
  });
  at(149.2, (f) => { const b = H(f); b.show('compact', false); b.props.compact.userData.glow(0); });
  // I'M GUILTY IN THE FIRST DEGREE: her confession is the evidence
  at(149.843, (f) => f.court.verdict(149.843, { until: 152.931, scripted: true, noLip: true, raise: 149.5, why: 'confession' }));
  at(151.25, (f) => { if (f.boss.rig) f.boss.rig.flinch = 1; });
  at(151.78, (f) => { if (f.boss.rig) f.boss.rig.flinch = 1; });

  // ================= §13 OUT: CASE CLOSED =================
  for (const [tele, words] of [[152.166, [152.931, 153.333, 153.729]], [155.283, [156.054, 156.446, 156.83]]]) at(tele, (f) => {
    const b = H(f);
    if (b.state === 'desperate') {
      // wrecked: her "pretty"s are gloss flares that crackle off; each triple ends in a sloppy slow kiss
      for (const w of words) f.at(w, () => { f.fx.glitter(b.x, 1.7, b.z, new THREE.Color(2.4, 2.2, 2.6), 14, 0.7); f.ppg.snd.play('crunch', { pan: f.pan(b.x), gain: 0.35, rate: 0.8 }); });
      kissAt(null, words[2], words[2] + 1.6, { now: f, vmin: 2.5, vmax: 4, size: 0.5 });
      return;
    }
    let prev = tele;
    words.forEach((w, i) => { heartRing(f, { w: 1.6, th: 0.5, start: prev, end: w, n: 8, speed: 6, rot: i * Math.PI / 8 }); prev = w; });
  });
  at(158.378, (f) => !f.boss.scene && f.court.verdict(158.378, { until: 159.919, scripted: true, noLip: true, raise: 158.0, why: 'case closed' }));
  at(160.297, (f) => !f.boss.scene && f.court.verdict(160.297, { until: 162.244, lipFrom: 161.475, scripted: true, raise: 159.95, why: 'case closed' }));
  at(158.4, (f) => { const b = H(f); if (b.state === 'desperate' && b.fig) b.fig.breakPiece('handcuffs'); });
  at(160.32, (f) => { const b = H(f); if (b.state === 'desperate' && b.fig) b.fig.breakPiece('sunglasses'); });
  // YOU'RE WELCOME: her bow; the finish is a gold circle round her (it's yours)
  at(163.021, (f) => { const b = H(f); if (b.scene) return; b.faceTarget = f.player; hold(f, 167); b.bow(1.8); face(b.fig, b.state === 'desperate' ? 'wrecked' : 'smug'); f.ppg.faceUntil = 0; });
  at(164.573, (f) => { const b = H(f); if (b.scene) return; goldMark(f, { x: b.x, z: b.z, r: 1.6, start: 164.573, end: 166.119 }); });
  // the press: flashbulbs on every beat from the out (a shutter you hear on every other one: not a second hi-hat)
  T.every({ s: 153.729 }, { s: 166.119 }, 1, (f) => { f.ppg.crowd.pressPop(f.t, Math.round((f.t - 153.729) / f.beat) % 2 === 1); f.ppg.crowd.galleryPop(f.t); });
}

// ------------------------------------------------------------------------------------------ the track
export default {
  // duration: the results wait for the shards to settle and the charm to reach YOU (the song's tail rings to 166.8)
  id: ID, beats: ID, par: 75000, lastHit: 166.119, duration: 168.2,
  spawn: { player: [0, 5.6, Math.PI], boss: [0, -7.35, 0] },

  async buildArena(f) {
    if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
    const S = f.ppg = { snd: new Sounds(f.audio), exhibitMesh, hazards: [], marks: [], kit, snaps: {} };
    const lite = new URLSearchParams(location.search).has('lite');
    let arena;
    if (lite) { arena = liteCourt(f); f.cam.cam.layers.enable(4); }   // the stands draw on the no-mirror layer
    else {
      const A = await Arena.load(`assets/arenas/${ID}/${ID}.json`, f.app.renderer, f.scene, { camera: f.cam.cam });
      A.prepareCamera(f.cam.cam); A.setState('day');
      // the fluorescent tubes light the bake; in the floor's mirror they read as grey slabs, so the game never draws them
      f.scene.traverse((o) => { if (/fluoro/i.test(o.name) && o.isMesh) o.visible = false; });
      S.arena = A;
      arena = {
        bounds: A.bounds, room: A.room, resolve: (x, z, r) => A.resolve(x, z, r),
        update(dt, t, ff) { const L = lightAt(t); A.setState(L.a, L.b, L.k); A.update(dt, ff.cam.cam, ff.player.root.position); ff.app.post.fx.exposure = A.exposure; },
        dispose() { A.dispose(); },
      };
    }
    S.justice = new Justice(f, { kit });
    await S.justice.ready;
    S.court = f.court = new Court(f, { justice: S.justice, sounds: S.snd });
    S.onShock = (t) => { S.crowd && S.crowd.flinch(t + 0.4); };
    S.fuel = fuelTrails(f); S.fire = fireArms(f);
    S.knives = new Knives(f); S.motto = new Motto(f); S.flats = new Flats(f);
    S.props = new Props(f); S.shelving = new Shelving(f); S.page = new FrontPage(f); S.cells = new Cells(f); S.frost = new Frost(f);
    S.doors = new Doors(f); S.floor = new FloorLight(f); S.prints = new Prints(f); S.phoneZones = [];
    const base = await kit.load('assets/characters/base/Superhero_Female_FullBody.gltf');
    S.crowd = new Crowd(f, kit, base); S.hall = new Hall(f, kit, base, reach);
    S.doubles = new Doubles(f, kit, base);
    S.dropMesh = { hoodie: exhibitMesh('hoodie'), heart: exhibitMesh('heart') }; for (const m of Object.values(S.dropMesh)) { m.visible = false; f.scene.add(m); }
    S.caseGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.5), new THREE.MeshPhysicalMaterial({ color: 0xeef4f6, roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false })); S.caseGlass.visible = false; f.scene.add(S.caseGlass);
    S.flingMesh = { jacket: exhibitMesh('jacket'), cuff: makeCuff(1.6) }; for (const m of Object.values(S.flingMesh)) { m.visible = false; f.scene.add(m); }
    S.chainLine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), new THREE.MeshPhysicalMaterial({ color: 0xd8a443, metalness: 1, roughness: 0.25, emissive: new THREE.Color(0x553300) })); S.chainLine.visible = false; f.scene.add(S.chainLine);
    S.keyGlow = new THREE.PointLight(0xffc040, 0, 3, 2); f.scene.add(S.keyGlow);
    S.selfLoveMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xff6fa8, emissive: new THREE.Color(0xff2f80), emissiveIntensity: 1.2, transparent: true, opacity: 0.85, roughness: 0.1 })); S.selfLoveMesh.visible = false; f.scene.add(S.selfLoveMesh);
    S.full = { ...f.ppg.arena ? f.ppg.arena.bounds : {} };
    S.keyMesh = makeGiantKey(); S.keyMesh.scale.setScalar(1.35); S.keyMesh.visible = false; f.scene.add(S.keyMesh);
    S.endKit = buildEnd(f);
    return {
      arena: S.arena, bounds: arena.bounds, room: arena.room,
      resolve: (x, z, r) => {
        let p = arena.resolve(x, z, r); p = S.props.resolve(p.x, p.z, r); p = S.cells.resolve(p.x, p.z, r, f.t);
        // the mirror room closes in: x -8..8, z -7..4
        if (f.t >= 105.9 && f.t < 121.3) { p.x = THREE.MathUtils.clamp(p.x, -8 + r, 8 - r); p.z = Math.min(p.z, 4 - r); }
        return { x: p.x, z: p.z };
      },
      // (the exhibits on the floor: a swing goes to the nearest when it's nearer than her, or she's pretty)
      strikeables: () => (f.court ? f.court.floor : null),
      strikeArc: (x, z, a, range, arc, s) => {
        S.lastStrikeT = f.t;
        f.court.strikeArc(x, z, a, range, arc); S.props.strikeArc(x, z, a, range, arc, s);
        if (S.ripPending && f.t <= S.ripPending) ripThrough(f);
        // the page, standing: strikes tear YOU-sized holes
        if (f.t > PAGE.t1 && f.t < PAGE.fall0 && Math.abs(z + Math.cos(a) * 1.2 - PAGE.z) < 1.4) S.page.tear(x + Math.sin(a) * 1.0, 0, 0.9, 1.8);
        // a mirror double shatters from one strike
        for (const d of S.doubles.aliveList()) { const dx = d.x - x, dz = d.z - z, dd = Math.hypot(dx, dz); if (dd < range + 0.6 && (Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - a), Math.cos(Math.atan2(dx, dz) - a))) < arc || dd < 1)) S.doubles.shatter(d); }
        // three strikes on the frozen chain break it
        if (S.chain) { const b = f.boss, mx = (b.x + f.player.x) / 2, mz = (b.z + f.player.z) / 2; if (Math.hypot(mx - x, mz - z) < range + 1) { S.chain.hits++; S.snd.play('chain', { pan: f.pan(mx), gain: 0.5 }); f.fx.sparks(mx, 0.6, mz, new THREE.Color(3, 2, 0.6), 8); if (S.chain.hits >= 3) { S.chain = null; S.snd.play('clang', { pan: f.pan(mx), gain: 0.5, rate: 1.6 }); } } }
      },
      update(dt, t, ff) { arena.update(dt, t, ff); },
      dispose() {
        disposeEnd(f);
        arena.dispose(); S.justice.dispose(); S.court.dispose(); f.scene.remove(S.keyGlow, S.fuel.g, S.fire.g, S.keyMesh, S.caseGlass, S.chainLine, S.selfLoveMesh, ...Object.values(S.dropMesh), ...Object.values(S.flingMesh));
        for (const k of ['knives', 'motto', 'flats', 'props', 'shelving', 'page', 'cells', 'frost', 'doors', 'floor', 'prints', 'crowd', 'hall', 'doubles']) S[k].dispose();
        if (S.charm) f.scene.remove(S.charm.m); if (S.lips) f.scene.remove(S.lips);
        clearMarks(f);
      },
    };
  },

  async buildBoss(f) {
    const b = await buildDefendant(f, f.court, HP);
    f.court.boss = b; f.court.onFace = (n) => { face(b.fig, n); f.ppg.faceUntil = f.t + 0.9; };
    b.arena = f.arena;
    const A = f.ppg.arena;
    if (A) { A.addCaster(f.player.root); A.addCaster(b.root); if (f.ppg.justice.root) A.addCaster(f.ppg.justice.group); }
    await warmCourt(f, b);
    return b;
  },

  script,
  death,

  onStart(f) { setStateAt(f, 0); f.ppg.snaps[0] = snapNow(f); f.ppg.init = true; },
  onSection(f, sec) { f.ppg.snaps[sec.t0] = snapNow(f); },
  // a rewind or the ENCORE (both can call it for the same jump): it only ever puts the set back, so twice is once
  onRewind(f, t) { restoreAt(f, t); },
  onBreak(f, i) {
    const b = f.boss;
    if (i === 0) { b.fig && b.fig.breakPiece('sunglasses'); }
    if (i === 2) { b.show('compact', false); }
    b.perform('Idle_Shield_Break', { duration: f.beat * 2, fade: 0.06 });
    face(b.fig, 'scandalized'); f.ppg.faceUntil = f.t + 0.8;
  },
  onEmpty(f) { face(f.boss.fig, 'wrecked'); f.ppg.faceUntil = 999; f.boss.gloss.set(0, 8); },
  onSpotlight(f, on) { const b = f.boss; if (on && b.rig) b.rig.upperOnce('Sword_Block', { duration: f.beat * 4, from: 0.1, to: 0.5, fade: 0.1 }); },
  // THE FINISH: she shatters; the one gold thing that skitters to YOU's feet is her gavel charm (the keepsake)
  onFinish(f) {
    const S = f.ppg, b = f.boss, pl = f.player;
    S.snd.play('gavel', { pan: f.pan(b.x), gain: 1 }); S.justice.strike(f.t);
    clearMarks(f);   // the song clock stops here: the gold mark under her goes with her
    f.court.close && f.court.close();
    const onBlock = !!S.end;   // (death.js: she was on the sound block)
    const charm = new THREE.Group(); const gold = new THREE.MeshPhysicalMaterial({ color: 0xffc44a, metalness: 1, roughness: 0.18, emissive: new THREE.Color(0x804000), emissiveIntensity: 0.6 });
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 16), gold); head.rotation.z = Math.PI / 2; charm.add(head);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.24, 10), gold); handle.position.y = -0.13; charm.add(handle);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 24, Math.PI * 1.3), gold); chain.position.y = 0.06; charm.add(chain);
    charm.scale.setScalar(1.5); charm.position.set(b.x, 1.4, b.z); f.scene.add(charm);
    const a = Math.atan2(pl.x - b.x, pl.z - b.z), stop = { x: pl.x - Math.sin(a) * 0.55, z: pl.z - Math.cos(a) * 0.55 };
    if (onBlock) f.scene.remove(charm); else S.charm = { m: charm, t0: f.t, from: { x: b.x, z: b.z }, to: stop };
    // and one shard lands face up: her painted red lips, untouched
    const lips = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshPhysicalMaterial({ color: 0xf7f0ea, roughness: 0.1, clearcoat: 1 }));
    const kiss = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.2, clearcoat: 1 })); kiss.scale.set(1.3, 0.6, 1); kiss.position.z = 0.002; lips.add(kiss);
    lips.rotation.x = -Math.PI / 2; lips.position.set(b.x + 0.8, 0.02, b.z + 0.5); lips.visible = false; f.scene.add(lips); S.lips = lips;
    if (onBlock) { lips.position.set(b.x + 0.05, 1.655, b.z + 0.12); lips.scale.setScalar(1.5); S.lipsAge = 0; }
  },
  onEncore(f) {},

  update(f, dt) {
    const S = f.ppg, b = f.boss, t = f.t;
    if (!S.init) { S.init = true; setStateAt(f, t); S.snaps[f.checkpoint ? f.checkpoint.t : t] = snapNow(f); }
    if (!S.bot) { S.bot = true; teachBot(f); }
    // dev: ?ppgcam=x,y,z,lx,ly,lz looks at the set from anywhere (inspection only)
    if (S.devCam === undefined) { const q = new URLSearchParams(location.search).get('ppgcam'); S.devCam = q ? q.split(',').map(Number) : null; }
    if (S.devCam) { const c = S.devCam; f.cam.override = { pos: new THREE.Vector3(c[0], c[1], c[2]), look: new THREE.Vector3(c[3], c[4], c[5]), k: 1 }; }
    updateHazards(f); updateMarks(f);
    f.court.update(dt);
    S.justice.update(dt, t);
    endUpdate(f, dt);
    if (S.lipsAge !== undefined && S.lips) { S.lipsAge += dt; if (S.lipsAge > 0.45) S.lips.visible = true; }
    b.gloss.update(dt);
    // her hop off the bench
    if (S.hop && !b.scene) { const h = S.hop, k = THREE.MathUtils.clamp((t - h.t0) / (h.t1 - h.t0), 0, 1); b.root.position.y = lerp(h.y0, h.y1, k) + Math.sin(k * Math.PI) * h.peak; if (k >= 1) S.hop = null; }
    // the gum bubble swelling
    if (S.bubble) { const k = THREE.MathUtils.clamp((t - S.bubble.t0) / (S.bubble.t1 - S.bubble.t0), 0, 1); b.props.bubble.scale.setScalar(0.08 + 0.92 * k * k); }
    // the switchblade flicking open
    if (S.knifeOpen) { const k = Math.min(1, (t - S.knifeOpen.t0) / 0.09); b.props.knife.userData.open(k); if (k >= 1) S.knifeOpen = null; }
    // fuel pouring outward from the seal, fire running along it
    if (S.pour) { const k = THREE.MathUtils.clamp((t - S.pour.t0) / (S.pour.t1 - S.pour.t0), 0, 1); for (const a of S.fuel.arms) a.m.scale.x = Math.max(0.001, a.len * k); if (k >= 1) S.pour = null; }
    S.fuel.mat.uniforms.uT.value = t;
    if (S.burn) {
      const k = THREE.MathUtils.clamp((t - S.burn.t0) / (S.burn.t1 - S.burn.t0), 0, 1);
      const fade = t > S.burn.off ? Math.max(0, 1 - (t - S.burn.off) / 0.3) : 1;
      S.fire.mat.uniforms.uFront.value = k; S.fire.mat.uniforms.uA.value = fade; S.fire.mat.uniforms.uT.value = t;
      S.fire.light.intensity = 40 * fade * Math.min(1, k * 3);
      if (t > S.burn.off + 0.3) { S.burn = null; S.fire.light.intensity = 0; }
    }
    // set pieces on the clock
    if (t >= 84.052 && S.prints.list.length && (t < 76.3 || t > 84.05)) S.prints.clear();
    S.knives.update(t); S.motto.update(t); S.flats.update(t); S.props.update(dt, t); S.shelving.update(t); S.page.update(t, b); S.cells.update(t);
    S.frost.update(t); S.doors.update(t); S.floor.update(t, f.player, b); S.crowd.update(t, t > 3.5 ? b : null); S.hall.update(t); S.doubles.update(t, b);
    // the mirror room's bounds (the camera frames the closer room)
    const A0 = S.arena;
    if (A0) { const close = t >= 105.9 && t < 121.3; A0.bounds.minX = close ? -8 : S.full.minX; A0.bounds.maxX = close ? 8 : S.full.maxX; A0.bounds.maxZ = close ? 4 : S.full.maxZ; }
    // a phone broken before its flash: its flashes die with it
    for (const pz of S.phoneZones) if (!pz.ph.alive && !pz.z.dead) { pz.z.dead = true; if (pz.z.g) pz.z.g.dead = true; }
    // things falling from the fly loft (the bagged hoodie, the heart in its glass case)
    for (const [k, m] of Object.entries(S.dropMesh)) { const d = S.drop; const on = d && d.kind === k && t >= d.t0; m.visible = !!on; if (on) { const kk = Math.min(1, (t - d.t0) / (d.t1 - d.t0)); m.position.set(d.x, 8 * (1 - kk * kk), d.z); } }
    S.caseGlass.visible = !!(S.drop && S.drop.kind === 'heart'); if (S.caseGlass.visible) S.caseGlass.position.set(S.drop.x, S.dropMesh.heart.position.y + 0.7, S.drop.z);
    // things she flings (your jacket, the cuffs)
    for (const [k, m] of Object.entries(S.flingMesh)) { const d = S.fling; const on = d && d.kind === k && t >= d.t0; m.visible = !!on; if (on) { const kk = Math.min(1, (t - d.t0) / (d.t1 - d.t0)); m.position.set(lerp(d.from.x, d.to.x, kk), 1.3 + Math.sin(kk * Math.PI) * 2.2 - kk * 1.2, lerp(d.from.z, d.to.z, kk)); m.rotation.set(t * 7, t * 5, 0); } }
    // the chain between YOU and her: 4 m; taut flashes, then a yank toward her (always inward, away from the frost)
    if (S.chain) {
      const pl = f.player, dx = b.x - pl.x, dz = b.z - pl.z, d = Math.hypot(dx, dz) || 1;
      if (d > 4) { pl.x += dx / d * (d - 4); pl.z += dz / d * (d - 4); }
      if (S.chain.taut && t >= S.chain.taut && !S.chain.yanked) { S.chain.yanked = S.chain.taut; S.chain.pull = { t0: t, x: dx / d * Math.min(2, d - 0.8), z: dz / d * Math.min(2, d - 0.8) }; S.snd.play('chain', { pan: f.pan(pl.x), gain: 0.7 }); }
      if (S.chain.pull) { const k = Math.min(1, (t - S.chain.pull.t0) / 0.2), prev = S.chain.pull.k || 0; pl.x += S.chain.pull.x * (k - prev); pl.z += S.chain.pull.z * (k - prev); S.chain.pull.k = k; if (k >= 1) { S.chain.pull = null; S.chain.taut = 0; S.chain.yanked = 0; } }
      const m = S.chainLine; m.visible = true; m.position.set((b.x + pl.x) / 2, 0.9, (b.z + pl.z) / 2); m.scale.set(1, Math.hypot(dx, dz), 1); m.lookAt(b.x, 0.9, b.z); m.rotateX(Math.PI / 2);
      m.material.emissiveIntensity = S.chain.taut && t > S.chain.taut - 0.387 ? 3 : 0.6;
    } else S.chainLine.visible = false;
    // the page that landed on YOU (no rip in time)
    if (S.ripPending && t > S.ripPending) { S.ripPending = 0; const pl = f.player; if (pl.invulnerable) { if (pl.state === 'dash') pl.nearMiss(f._ctx(0)); } else if (pl.hurt(f._ctx(0), 1, pl.x, pl.z - 1, 'area')) f._hurt(pl.x, pl.z); }
    // the self-love heart swelling at her chest
    if (S.selfLove) { const k = Math.min(1, (t - S.selfLove.t0) / (S.selfLove.t1 - S.selfLove.t0)); const c = b.rig.bones.spine_03 ? b.rig.bones.spine_03.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(b.x, 1.5, b.z); S.selfLoveMesh.visible = true; S.selfLoveMesh.position.copy(c).add(new THREE.Vector3(Math.sin(b.facing) * 0.5, 0, Math.cos(b.facing) * 0.5)); S.selfLoveMesh.scale.setScalar(0.2 + 0.8 * k); } else S.selfLoveMesh.visible = false;
    // tagged projectiles: one kiss caught takes every kiss in reach; a caught cuff binds her; the self-love heart
    for (const q of f.proj.list) {
      if (q.owner !== 'player' || q._ppg) continue;
      q._ppg = true;
      if (q.tag && q.tag === S.kissTag) { for (const o of f.proj.list) if (o.owner === 'boss' && o.tag === S.kissTag && Math.hypot(o.x - f.player.x, o.z - f.player.z) < 3) { f.proj.reflect(o, b, { speed: 1.5, damage: 2 }); o.dmgBack = 20; o._ppg = true; } }
      if (q.tag === 'cuff' && f.court.pretty) { S.snd.play('click', { pan: f.pan(f.player.x), gain: 0.9 }); f.court.verdict(f.t + 0.02, { until: f.court.beatsFrom(f.t, 8), scripted: true, raise: f.t - 0.15, why: 'couture' }); }
      if (q.tag === 'selflove') { const perfect = f.player.catchT >= 0 && f.player.stats.perfect > (S.perfects || 0); q.dmgBack = perfect ? 55 : 44; q.size = 1.1; q.radius = 0.6; q.selfLove = perfect; }
    }
    S.perfects = f.player.stats.perfect;
    // a double hit by a gold return or a ring
    for (const d of S.doubles.aliveList()) {
      for (const q of f.proj.list) if (q.owner === 'player' && Math.hypot(q.x - d.x, q.z - d.z) < 0.9) { S.doubles.shatter(d); q.dead = true; break; }
      for (const r of f.player.rings) if (r.state !== 'hand' && Math.hypot(r.pos.x - d.x, r.pos.z - d.z) < 0.9) S.doubles.shatter(d);
    }
    // the last double to break leaves a mirror shard
    if (S.doubles.list.some((d) => d.brokeAt) && !S.doubles.aliveList().length && !S.shardDone && t < 121.2) { S.shardDone = true; const d = S.doubles.list.reduce((m, x) => ((x.brokeAt || 0) > (m.brokeAt || 0) ? x : m)); f.court.exhibit('shard', d.x, d.z, { r: 0.85, h: 0.8 }); }
    if (t < 113.4) S.shardDone = false;
    // the gallery's flashbulbs on chorus beats, the press in night court
    const beatI = Math.floor(f.bm.beatAt(t));
    if (beatI !== S.lastBeat) { S.lastBeat = beatI;
      if ((t > 22.118 && t < 28.3) || (t > 34.5 && t < 46.9) || (t > 84.05 && t < 94.9) || (t > 138.2 && t < 150.6)) { if (beatI % 2 === 1) S.crowd.galleryPop(t); }
      if ((t > 84.05 && t < 94.9) || (t > 99.5 && t < 105.7) || (t > 138.2 && t < 150.6)) { if (beatI % 3 === 0) S.crowd.pressPop(t); }
    }
    // the giant key: down the lane, hanging in the silence, back past her into the floor
    if (S.key) {
      const K = S.key, km = S.keyMesh; km.visible = t >= K.t0;
      let p;
      if (t < K.t1) { const k = ease((t - K.t0) / (K.t1 - K.t0)); p = { x: lerp(K.from.x, K.end.x, k), z: lerp(K.from.z, K.end.z, k), y: 1.4 }; }
      else if (t < K.t2) p = { x: K.end.x, z: K.end.z, y: 1.4 + Math.sin(t * 9) * 0.05 };
      else { const k = THREE.MathUtils.clamp((t - K.t2) / (K.t3 - K.t2), 0, 1); p = { x: lerp(K.end.x, K.behind.x, k), z: lerp(K.end.z, K.behind.z, k), y: lerp(1.4, 0.6, k) }; }
      km.position.set(p.x, p.y, p.z); km.rotation.set(Math.PI / 2, 0, t * 22);
    } else S.keyMesh.visible = false;
    // the swallowed key glows gold inside her until her next verdict; a deflect makes her preen (chin up)
    if (S.swallowed && f.court.gavelT > 97.76) S.swallowed = false;
    if (S.swallowed && b.rig.bones.spine_02) { b.rig.bones.spine_02.getWorldPosition(S.keyGlow.position); S.keyGlow.intensity = 6 + 2 * Math.sin(t * 9); } else S.keyGlow.intensity = 0;
    if (f.court.preen > 0.01 && b.rig.bones.Head) { const k = f.court.preen; b.rig.bones.Head.rotateX(-0.28 * k); if (b.rig.bones.spine_03) b.rig.bones.spine_03.rotateX(-0.12 * k); }
    // the keepsake: the gavel charm skitters across the marble to YOU's feet (the song clock stops at the finish,
    // so this runs on its own clock, and lands before the results come up)
    if (S.charm) {
      const c = S.charm; c.age = (c.age || 0) + dt; const k = Math.min(1, c.age / 1.15), e = 1 - Math.pow(1 - k, 3);
      const hop = Math.abs(Math.sin(k * Math.PI * 3.5)) * (1 - k) * 0.6;
      c.m.position.set(lerp(c.from.x, c.to.x, e), 0.08 + hop + (k < 0.08 ? 1.3 * (1 - k / 0.08) : 0), lerp(c.from.z, c.to.z, e));
      c.m.rotation.set(Math.PI / 2 * Math.min(1, k * 3), k * 14 * (1 - k), 0);
      if (Math.floor(k * 7) !== c.last && k < 1) { c.last = Math.floor(k * 7); S.snd.play('tink', { pan: f.pan(c.m.position.x), gain: 0.4 * (1 - k), rate: 0.8 }); }
      if (k >= 1 && !c.glint) { c.glint = true; f.fx.glitter(c.to.x, 0.3, c.to.z, new THREE.Color(3.4, 2.4, 0.8), 18, 0.25); }
      if (S.lips && c.age > 0.7) S.lips.visible = true;
    }
    // faces back to her smug default
    if (S.faceUntil && t > S.faceUntil && b.state !== 'desperate') { S.faceUntil = 0; face(b.fig, f.court.pretty ? 'smug' : 'hurt'); }
    // heels on the marble: you can hear where she is
    const sp = b._speed || 0;
    if (sp > 0.6 && b.root.position.y < 0.05 && !b.scene) { S.step = (S.step || 0) + dt * Math.min(3.2, sp * 1.4); if (S.step > 1) { S.step = 0; S.snd.play('heel', { pan: f.pan(b.x), gain: 0.25 + Math.min(0.25, sp * 0.05), gate: 0.12 }); } }
    // between scripted moves: PRETTY, she struts in arcs and poses for the gallery
    if (!b.busy && !b.move && t > (S.holdUntil || 0) && f.court.pretty && b.behave === 'hold' && t > 4.5 && b.state === 'perform') {
      S.idleT = (S.idleT || 0) + dt;
      if (S.idleT > f.beat * 8) {
        S.idleT = 0;
        const d = Math.max(3, dist(b, you(f))), a0 = ang(you(f), b) + (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.35);
        const p = clampTo(f, { x: f.player.x + Math.sin(a0) * d, z: f.player.z + Math.cos(a0) * d }, 1.2);
        if (dist(p, b) > 1.2) b.moveTo(p.x, p.z, dist(p, b) / 1.6, { easing: 'inOut' });
        b.idle = b.idle === 'Idle_FoldArms_Loop' ? 'Idle_Talking_Loop' : 'Idle_FoldArms_Loop';
      }
    } else S.idleT = 0;
  },
};
