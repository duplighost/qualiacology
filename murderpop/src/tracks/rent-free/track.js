// B3: RENT FREE. THE TENANT. She has moved into your head and is furnishing it; the fight is an eviction.
// The rule: everything she claims, you can break back. Hers is glossy lilac porcelain with her kiss on it; yours
// is matte and real. She doesn't flinch when you hit her. She flinches when you break her things.
// The house in your head is walked through in the song's order, room by room; the rooms change by flying their walls.
// Files: house.js (the set, its light and its rooms by song time), claims.js (her things: cracks, bursts, the
// lease-thread), tenant.js (the figurine and her habits), props.js (things), paint.js (canvas paint), sound.js.
import * as THREE from 'three';
import { blockable } from '../../game/kinds.js';
import { CharacterKit } from '../../engine/character.js';
import { Claims, U, mats, kissDecal } from './claims.js';
import { buildTenant, Tenant, clampX, clampZ } from './tenant.js';
import * as P from './props.js';
import { installSounds } from './sound.js';
import { House, SOCK, roomAt } from './house.js';
import { death, sceneBind, sceneBegin, sceneUpdate, sceneReset, sceneFinish } from './death.js';

// the design's bars are bars.py bars (from 0); beats.js counts from 1
const D = (s) => { const [b, bb] = String(s).split('.'); return `${+b + 1}:${bb || 1}`; };
let kit = null;
let S = null;            // this fight's live state

// sections (each a rewind checkpoint) and her mark at each line
const SECTIONS = [
  { name: 'home', t0: 0, t1: 10.70, boss: [0, -6.7, 0] },
  { name: 'verse1', t0: 10.70, t1: 41.22, boss: [0, -3.5, 0] },
  { name: 'pre', t0: 41.22, t1: 61.13, boss: [-1.5, -2.4, 0] },
  { name: 'chorus1', t0: 61.13, t1: 86.30, boss: [0, -1.8, 0] },
  { name: 'knock', t0: 86.30, t1: 95.58, boss: [0, -5.6, 0], hidden: true },     // (hidden: parked mid-back, where the camera should look)
  { name: 'verse2', t0: 95.58, t1: 118.13, boss: [0.5, -2.0, 0] },
  { name: 'taunt', t0: 118.13, t1: 130.06, boss: [0, -3.0, 0] },
  { name: 'chorus2', t0: 130.06, t1: 168.52, boss: [9.75, -4.5, -Math.PI / 2] },
  { name: 'party', t0: 168.52, t1: 176.48, boss: [0, -6.2, 0] },
  { name: 'bridgeA', t0: 176.48, t1: 196.36, boss: [0, -2.6, 0] },
  { name: 'bridgeB', t0: 196.36, t1: 217.58, boss: [-9.4, -3.7, 0.6] },
  { name: 'final', t0: 217.58, t1: 249.41, boss: [0, -1.5, 0], final: true },
  { name: 'sickest', t0: 249.41, t1: 264.01, boss: [0, -1.5, 0] },
  { name: 'coda', t0: 264.01, t1: 291.87, boss: [7.35, -4.15, Math.PI / 2 - 0.5] },
  { name: 'dreams', t0: 291.87, t1: 307.6, boss: [1.6, -4.4, Math.PI] },
];
const secAt = (t) => { let s = SECTIONS[0]; for (const x of SECTIONS) if (x.t0 <= t + 1e-3) s = x; return s; };
// pressure off: she laughs, sips, lounges; her reflexes rest too (and in her own set pieces)
const CALM = [[0, 8.7], [16.0, 19.3], [35.3, 37.2], [57.1, 59.4], [77.4, 79.3], [82.3, 83.7], [86.3, 95.6], [104.9, 118.2], [118.1, 130.1], [161.9, 164.5], [176.4, 196.4], [196.3, 218.6], [222.5, 223.2], [240.4, 243.4], [249.4, 256.0], [264.0, 291.9], [291.9, 294.5], [299.4, 307.6]];
const calm = (t) => CALM.some(([a, b]) => t >= a && t < b);
// how close the camera comes (bridge A, bridge B, the sickest part)
const closeAt = (t) => (t >= 176.48 && t < 187.09 ? 0.6 * Math.min(1, (t - 176.48) / 1.33) : t >= 187.09 && t < 196.36 ? 0.8 : t >= 196.36 && t < 218.58 ? 1.0 : t >= 249.41 && t < 255.71 ? 0.6 : 0);
// the luggage she lowers in bridge A: [landing beat, x, z, kind]
const LUG = [['134.2', -9.0, -5.0, 'trunk'], ['134.4', 9.0, -5.0, 'suitcase'], ['135.2', -9.0, 4.0, 'hatboxes'], ['135.4', 9.0, 4.0, 'birdcage'], ['136.2', -5.0, -5.8, 'trunk'], ['136.4', 5.0, -5.8, 'gramophone'],
  ['137.2', -9.2, -0.5, 'cello'], ['137.4', 9.2, -0.5, 'trunk'], ['138.2', -4.5, 5.4, 'suitcase'], ['138.4', 4.5, 5.4, 'suitcase'], ['139.2', -1.5, -6.0, 'hatboxes'], ['139.4', 1.5, -6.0, 'trunk']];

// ---------------------------------------------------------------------------------------------- small helpers
const ease = { inOut: (k) => k * k * (3 - 2 * k), in: (k) => k * k * k, out: (k) => 1 - Math.pow(1 - k, 3), lin: (k) => k };
// a tween on song time: fn(k) for k 0..1 between t0 and t1 (a rewind clears them)
function tween(t0, t1, fn, e = 'inOut', done = null) { S.tweens.push({ t0, t1, fn, e: ease[e] || ease.inOut, done }); }
const snd = (name, o) => S && S.snd.play(name, o);
// things of a room that aren't claims (a hole in the boards, the mold, a thrown trophy): they leave with the room
function addLoose(...os) { for (const o of os) { o.userData.room = roomAt(S.f.t); S.loose.push(o); } }
const tb = (f, s) => f.bm.t(D(s));

// a thing in the air that only looks: from -> to over t0..t1 in an arc (the glass, the trophy)
function arcDeco(f, from, to, t0, t1, { shape = 'shard', size = 0.3, kind = 'white', peak = 1.5, fromY = 1.8, mesh = null } = {}) {
  const dur = Math.max(0.05, t1 - t0);
  if (mesh) { f.scene.add(mesh); addLoose(mesh); }
  return f.proj.spawn({ x: from.x, z: from.z, y: fromY, angle: 0, speed: 0, kind, shape, size, owner: 'deco', life: dur + 0.05, spin: 6, parryable: false,
    fn: (q) => { const k = Math.min(1, Math.max(0, (f.t - t0) / dur)); q.x = from.x + (to.x - from.x) * k; q.z = from.z + (to.z - from.z) * k; q.y = fromY + (0.3 - fromY) * k + 4 * peak * k * (1 - k); if (mesh) { mesh.position.set(q.x, q.y, q.z); mesh.rotation.x += 0.25; if (k >= 1) f.scene.remove(mesh); } } });
}

// ---------------------------------------------------------------------------------------------- her claims, built by id
// every claim has a stable id so a rewind can put the room back as it stood at the section line
const SOCK_FLOOR = (s) => { const [x, z, side] = SOCK[s]; return side === 'back' ? { x, z: z + 1.25 } : side === 'left' ? { x: x + 1.25, z } : { x: x - 1.25, z }; };
const PH = 1.45, PTILT = 0.17;           // her portraits' hang height (their middle) and their lean into the room
function portraitClaim(f, sock, { dormant = false, lift = 0, arrive = false } = {}) {
  const [x, z, side] = SOCK[sock];
  const pr = P.portrait(1);
  const g = new THREE.Group();
  const up = new THREE.Group(); up.name = 'up'; g.add(up);
  up.add(pr.group);
  // the hit strip on the floor under it: 1.6 m along the wall, 1.0 m deep
  // (hung low and tilted a little toward the room: the high camera only sees a wall's lower metre or two, and at
  // 2 m her portraits were above the top of the picture whenever you fought mid-room)
  let cx = x, cz = z, box;
  if (side === 'back') { cz = z + 0.5; box = { hw: 0.8, hd: 0.5, rot: 0 }; pr.group.position.set(0, PH, -0.44); pr.group.rotation.x = PTILT; }
  else if (side === 'left') { cx = x + 0.5; box = { hw: 0.5, hd: 0.8, rot: 0 }; pr.group.position.set(-0.44, PH, 0); pr.group.rotation.set(0, Math.PI / 2, 0, 'YXZ'); pr.group.rotation.x = PTILT; }
  else { cx = x - 0.5; box = { hw: 0.5, hd: 0.8, rot: 0 }; pr.group.position.set(0.44, PH, 0); pr.group.rotation.set(0, -Math.PI / 2, 0, 'YXZ'); pr.group.rotation.x = PTILT; }
  up.position.y = lift;
  // wires up into the flies
  const wireM = mats().gold;
  for (const s of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 14, 4), wireM); w.position.set(s, 0.95 + 7, 0.06); w.name = 'wire'; pr.group.add(w); }
  const c = S.claims.add({ id: 'P:' + sock, kind: 'portrait', obj: g, x: cx, z: cz, y: PH, box, hits: 3, value: 6, oneShot: true, wall: true, dormant,
    data: { sock, canvas: pr.canvas, mat: pr.mat, up, frame: pr.group } });
  if (S.wrecked) c.fragile = true;
  g.updateMatrixWorld(true);
  const wp = new THREE.Vector3(); pr.canvas.getWorldPosition(wp); wp.y -= lift;
  const q = new THREE.Quaternion(); pr.canvas.getWorldQuaternion(q);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  c.data.canvasPos = { pos: wp.addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(q), 0.02), quat: q, right };
  if (!lift) wires(c, false);
  if (arrive) arriveWall(c, f.t);
  return c;
}
function wires(c, on) { c.data.frame && c.data.frame.traverse((o) => { if (o.name === 'wire') o.visible = on; }); }

// your armchair, claimed: a porcelain shell over it; break it and your chair is underneath, unharmed
function shellClaim(f, id, kind, x, z, rot, { hits = 4, value = 5, sit = null } = {}) {
  const g = new THREE.Group();
  const sh = P.furniture(kind); sh.scale.setScalar(1.04); g.add(sh);
  g.rotation.y = rot;
  return S.claims.add({ id, kind, obj: g, x, z, y: 0.7, r: 0.6, hits, value, solid: true, data: { sit, shell: sh } });
}
function luggageClaim(f, id, kind, x, z, { rot = 0, hits = 2, value = 2, s = 1, solid = true } = {}) {
  const g = P.luggage(kind, s); g.rotation.y = rot;
  const sz = { trunk: [0.62, 0.38], hatboxes: [0.36, 0.36], vanity: [0.27, 0.2], suitcase: [0.44, 0.3], birdcage: [0.36, 0.36], gramophone: [0.3, 0.3], cello: [0.3, 0.7] }[kind] || [0.4, 0.4];
  const c = S.claims.add({ id, kind: 'luggage', obj: g, x, z, y: 0.5 * s, box: { hw: sz[0] * s, hd: sz[1] * s, rot }, hits, value, solid, data: kind === 'trunk' ? { sit: { x, z: z + 0.15, face: 0 } } : {} });
  if (S.wrecked) c.fragile = true;
  return c;
}
function furnitureClaim(f, id, kind, x, z, rot = 0, o = {}) {
  const g = P.furniture(kind); g.rotation.y = rot;
  const sz = { chaise: [1.0, 0.42, 4, 6], piano: [0.78, 0.4, 6, 6], mirror: [0.6, 0.3, 6, 6], wardrobe: [0.74, 0.4, 6, 6], armchair: [0.48, 0.45, 4, 6], vanityTable: [0.62, 0.3, 6, 6], bust: [0.4, 0.4, 8, 10] }[kind];
  const c = S.claims.add({ id, kind, obj: g, x, z, y: kind === 'chaise' ? 0.5 : 1.0, box: { hw: sz[0], hd: sz[1], rot }, hits: o.hits ?? sz[2], value: o.value ?? sz[3], solid: true, data: o.data || {} });
  if (S.wrecked) c.fragile = true;
  if (o.arrive) arriveFloor(c, f.t, 0);
  return c;
}
function mineClaim(f, id, mx, mz) {
  const g = new THREE.Group();
  const lip = P.lipstick(); g.add(lip);
  const med = P.medallion(2.0); med.position.set(0, 0, 1.85); g.add(med);
  return S.claims.add({ id, kind: 'mine', obj: g, x: mx, z: mz - 1.85, y: 0.7, r: 0.35, hits: 3, value: 4, solid: true, data: { mx, mz } });
}

// ---------------------------------------------------------------------------------------------- the section lines
// what stands at each section line (then a snapshot of that line, taken live, says what was already broken)
const STANDING = {
  pre: (f) => { shellClaim(f, 'armchair', 'armchair', -7.8, 0.5, Math.PI / 2, { sit: { x: -7.6, z: 0.5, face: Math.PI / 2 } }); for (const s of ['W1', 'W2', 'W3']) portraitClaim(f, s); mineClaim(f, 'M1', -6.0, 1.5); mineClaim(f, 'M2', 6.0, 1.5); const m3 = S.m3 || { x: 0.5, z: 3.0 }; mineClaim(f, 'M3', clampX(f, m3.x), Math.min(5.2, Math.max(-3.5, m3.z))); },
  chorus1: (f) => ballroomSet(f, true, 'c1'),
  verse2: (f) => { portraitClaim(f, 'L1'); portraitClaim(f, 'R1'); furnitureClaim(f, 'F:vanity', 'vanityTable', -8.6, -2.4, Math.PI / 2); },
  taunt: (f) => { for (const s of ['W1', 'W2', 'W3']) portraitClaim(f, s); },
  chorus2: (f) => ballroomSet(f, true, 'c2'),
  party: (f) => { for (const [id, x, z] of [['BQ:1', -6.5, -3.0], ['BQ:2', 6.5, -3.0], ['BQ:3', 2.4, -5.2]]) bouquetClaim(f, id, x, z, false); },
  bridgeB: (f) => LUG.forEach(([, x, z, kind], i) => luggageClaim(f, 'LG:' + (i + 1), kind, x, z, { rot: (x * 7 + z * 3) % 1 })),
  sickest: (f) => { grandSet(f, true); for (const [id, x, z] of [['N1', 9.0, 3.5], ['N2', -8.0, 5.0]]) S.claims.add({ id, kind: 'nib', obj: P.nib(), x, z, y: 0.5, r: 0.35, hits: 4, value: 6, solid: true, data: {} }); },
  dreams: (f) => { portraitClaim(f, 'L1'); portraitClaim(f, 'R1'); furnitureClaim(f, 'F:vanity', 'vanityTable', -8.6, -2.4, Math.PI / 2); },
};
// claims that come in during a section, by time: a practice start mid-section builds the ones before it
const SPAWNS = [];

function setStateAt(f, t) {
  const sec = secAt(t);
  S.tweens.length = 0;
  for (const gh of S.ghosts) f.scene.remove(gh.mesh); S.ghosts.length = 0;
  for (const b of S.balloons) f.scene.remove(b.m); S.balloons.length = 0;
  for (const o of S.loose) f.scene.remove(o); S.loose.length = 0;
  S.room = roomAt(t);
  for (const h of S.hazards) for (const g of h.hints || []) g.dead = true;
  S.hazards.length = 0; S.holds.length = 0; S.follow.length = 0;
  S.ribbon = null; S.yank = null; S.glide = null; S.chase = null; S.drawn = null; S.house.extraCols = [];
  S.pearls.clear();
  S.claims.clear(); S.claims.clearFx();
  sceneReset(f); S.house.sceneClear();
  S.house.lampOut = false;
  S.house.goTo(roomAt(t), { instant: true, t });
  wreck(f, f.boss.hp <= 0);
  STANDING[sec.name] && STANDING[sec.name](f);
  S.claims.restore(S.snaps[sec.name]);
  for (const sp of SPAWNS) if (sp.t >= sec.t0 - 1e-3 && sp.t < t - 1e-3) sp.fn(f, true);
  const [x, z, a] = sec.boss;
  S.ten.reset(x, z, a);
  S.ten.portraits = () => S.claims.list.filter((c) => c.kind === 'portrait' && c.alive && !c.dormant);
  const hidden = sec.hidden || t < 2.73 || (sec.name === 'final' && t < 218.58) || (t >= 290.9 && t < 291.87);
  f.boss.root.visible = !hidden;
  f.boss.intangible = hidden;
  if (hidden) { S.ten.mode = 'script'; S.ten.until = sec.t1; }
  if (t >= 104.87 && t < 112.15) { S.ten.lattice = true; S.ten.reset(0, -5.9, 0); S.ten.lattice = true; S.ten.mode = 'script'; S.ten.until = 114.8; }
  phone(t >= 97.0 && t < 104.87);
  if (S.hollow) S.hollow.visible = f.boss.broken >= 2;
  S.lastT = t;
}
// the bar is empty: wrecked and still performing (dulled glaze, a shuffle, she never sits or frame-walks again)
function wreck(f, on) {
  const fig = S.ten && S.ten.fig; if (!fig) return;
  if (!S.glaze0) S.glaze0 = { coat: fig.bodyU.fSkinMat.value.y, lay: fig.bodyU.fLayMat.value.map((v) => v.y) };
  S.wrecked = on; S.ten.wrecked = on;
  fig.bodyU.fSkinMat.value.y = S.glaze0.coat * (on ? 0.35 : 1);
  fig.bodyU.fLayMat.value.forEach((v, i) => { v.y = S.glaze0.lay[i] * (on ? 0.35 : 1); });
  f.boss.walkClip = on ? 'Zombie_Walk_Fwd_Loop' : 'Walk_Formal_Loop'; f.boss.runClip = f.boss.walkClip;
}

// ---------------------------------------------------------------------------------------------- the track
export default {
  id: 'rent-free', beats: 'rent-free', par: 135000, lastHit: 304.81,
  spawn: { player: [0, 3.2, Math.PI], boss: [0, -6.7, 0] },

  async buildArena(f) {
    const house = new House(f);
    await house.init();
    S = { f, house, tweens: [], ghosts: [], balloons: [], loose: [], hazards: [], holds: [], follow: [], snaps: {}, lastT: undefined, closeS: 0 };
    window.__rfS = S;   // for the test tools (work/rent-free)
    S.claims = new Claims(f, {
      made: (c) => { c.room = roomAt(f.t); },
      // the size of the sound follows the size of the thing: a forget-me-not is a glassy pip, a crate or a suitcase a
      // smaller burst, her furniture and portraits the whole burst (a chain of small things never piles up loud)
      sound: (kind, x, o) => {
        const v = o && o.c ? o.c.value / U : 4, tiny = v < 1, small = v <= 2;
        if (kind === 'tink') snd('rf-tink', { x, gain: tiny ? 0.5 : 1 });
        else if (kind === 'crackle') snd('rf-crackle', { x });
        else if (kind === 'burst') snd('rf-burst', { x, must: !small, gain: tiny ? 0.32 : small ? 0.62 : 1, rate: tiny ? 1.7 : small ? 1.18 : 1 });
        else if (kind === 'thread') snd('rf-thread', { x, panTo: f.pan(o.toX), panDur: 0.15, gain: tiny ? 0.45 : small ? 0.75 : 1 });
      },
      onThread: (c, at, from) => { if (S.ten) S.ten.lashed(c, at, from); const v = c.value / U; snd('rf-crack', { x: f.boss.x, must: v > 2, gain: v < 1 ? 0.35 : v <= 2 ? 0.7 : 1 }); },
    });
    S.pearls = new PearlPool(f.scene);
    S.snd = installSounds(f);
    house.setSnd((n, o) => snd(n, o));
    sceneBind(S, { snd, spareKey, faceShard });
    // the three stitched samplers (the song's best lines, dropped in on a wire as they're sung)
    const bt = (s2) => f.bm.t(D(s2));
    // (hung low on the back wall: the high camera sees only its lowest two metres)
    house.sampler('tenant', 0, 1.75, -6.85, 4.6, bt('52.2'), bt('53.4'), 86.30, ["I'm the tenant and the landlord", 'of your misery!']);
    house.sampler('cute', 3.25, 1.7, -6.85, 3.9, bt('90.3'), bt('92.2'), 130.06, ["You thought you'd heal?", "That's fucking cute"]);
    house.sampler('dreams', 0, 1.95, -6.85, 3.6, bt('220.2'), bt('221.4'), 400, ['Sweet dreams, landlord']);   // (just above your headboard)
    // compile everything she can bring in before the first frame of play (no hitches mid-fight): one of each of
    // her things, far below the floor, removed after the first frames; the floors' textures uploaded now
    const warm = new THREE.Group(); warm.position.y = -1000;
    const things = [P.portrait(1).group, P.lipstick(), P.medallion(2), P.crate(), P.forgetMeNots(), P.bouquet(), P.keyRack(), P.nib(), P.flatFrame(), spareKey(), P.trophy(), P.teaChest('PHOTOS')];
    for (const k of ['trunk', 'hatboxes', 'vanity', 'suitcase', 'birdcage', 'gramophone', 'cello']) things.push(P.luggage(k));
    for (const k of ['chaise', 'piano', 'mirror', 'wardrobe', 'armchair', 'vanityTable', 'bust']) things.push(P.furniture(k));
    // the gold lease-thread's material (its flying copies share its shader, so it's never rebuilt mid-fight)
    things.push(new THREE.Mesh(flatGeo(), S.claims.threads.mat));
    things.push(new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), FXM.hole()), new THREE.Mesh(new THREE.PlaneGeometry(1, 1.2), FXM.pencil()));
    for (const k of ['carveLine', 'carveCut', 'carveGroove']) things.push(new THREE.Mesh(flatGeo(), FXM[k]()));
    things.forEach((o, i) => { o.position.set((i % 6) * 3, 0, Math.floor(i / 6) * 3); warm.add(o); });
    warm.traverse((o) => { o.frustumCulled = false; });
    f.scene.add(warm); S.warm = warm; S.warmFrames = 0;
    for (const o of Object.values(house.floors)) f.app.renderer.initTexture(o.mat.map);
    const w = {
      bounds: house.bounds,
      resolve: (x, z, r) => { const p = house.resolve(x, z, r); return S.claims.resolve(p.x, p.z, r); },
      strikeArc: (x, z, ang, range, arc, s) => {
        const hers = S.claims.strike(x, z, ang, range, arc, s);
        // two strikes on the ribbon's taut length cut it
        if (S.ribbon) { const b = f.boss; const q = segDist(x + Math.sin(ang) * 1.2, z + Math.cos(ang) * 1.2, x, z, b.x, b.z); if (q.d < 1.0) { S.ribbon.hits++; snd('rf-creak', { x, rate: 2.4, gain: 0.6 }); if (S.ribbon.hits >= 2) cutRibbon(f, { x: q.x, z: q.z }); } }
        // your things thud only when the strike meets nothing else: a strike on her (in your armchair by the fire, by
        // your bed) is her porcelain, not a thud on top of it
        if (!hers && house.strikeYours && !strikeReachesHer(f, x, z, ang, range, arc)) house.strikeYours(x, z, ang, range, arc);
      },
      update(dt, t, ff) { house.update(dt, t, ff); house.updateSigns(t); },
      dispose() { S.claims.dispose(); S.pearls.dispose(); house.dispose(); if (S.ribbonMesh) f.scene.remove(S.ribbonMesh); for (const o of S.loose) f.scene.remove(o); },
    };
    return w;
  },

  async buildBoss(f) {
    if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
    const { fig, boss } = await buildTenant(f, kit);
    boss.arena = { resolve: (x, z, r) => f.arena.resolve(x, z, r) };
    S.house.arena.addCaster(f.player.root); S.house.arena.addCaster(fig.root);
    S.ten = new Tenant(f, boss, fig, {
      floorBelow: (c) => SOCK_FLOOR(c.data.sock),
      reflexOk: (t) => !calm(t),
      scriptLive: (own) => scriptLive(f, own),
      scriptAhead: (t, w) => scriptAhead(f, t, w),
      glint: (c) => { snd('rf-ding', { x: c.x }); f.fx.glitter(c.x, PH + 0.4, c.z + (c.data.sock && SOCK[c.data.sock][2] === 'back' ? -0.3 : 0), new THREE.Color(3.4, 3.2, 3.6), 16, 0.3); },
      silk: (c) => snd('rf-swish', { x: c.x, gain: 0.6 }),
      swish: (x) => snd('rf-swish', { x }),
      kissed: () => snd('rf-mwah', { x: f.boss.x }),
      hop: (p) => snd('rf-thud', { x: p.x, gain: 0.7 }),
      // her keys on her wrist: every step in the dark rooms (it's how you find her there), every other step, softer,
      // in the lit ones (where you can see her and a constant tinkle would only wear)
      step: (x) => { const t = f.t, dark = (t >= 86.3 && t < 95.58) || (t >= 104.87 && t < 118.13) || (t >= 196.36 && t < 218.58) || (t >= 249.41 && t < 255.71); S.stepN = (S.stepN || 0) + 1; if (!dark && S.stepN % 2) return; snd('rf-jingle', { x, gain: dark ? 0.5 : 0.38 }); },
      evicted: () => snd('rf-thud', { x: f.boss.x, gain: 1.1, rate: 0.8 }),
    });
    // the hollow inside her head glows warm amber once the back of her set has broken away (a light left on)
    const I = fig.I, hol = new THREE.Group();
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.8, 0.6) }));
    glow.scale.set(0.07, 0.06, 0.075); hol.add(glow);
    fig.boneLocal('Head', new THREE.Matrix4().makeTranslation(I.headC.x + I.side * 0.03, I.headC.y + 0.06, I.headC.z - 0.05)).decompose(hol.position, hol.quaternion, hol.scale);
    fig.bones.Head.add(hol); hol.visible = false; S.hollow = hol;
    // every shader as it will really be drawn, before the veil lifts: into the picture's own (linear) target, which
    // the floor's mirror and the env capture share (compile() walks hidden things too, so every room's props are
    // in), then one real frame there for the shadow pass. (The game's own warm-up then uploads every texture, and
    // the arena uploads every light state's maps and captures its reflections twice at load.)
    const r = f.app.renderer, prevRT = r.getRenderTarget();
    try {
      if (f.app.post && f.app.post.target) {
        // the set in its first light
        try { const A = S.house.arena; A.setState('foyer'); A.update(0, f.cam.cam, f.player.root.position); } catch (e) { console.warn('rent-free warm-up (set)', e.message); }
        // her world (the shards, the pieces that fall off her) joins the scene on her first frame: in it now
        const world = fig.world, had = !!world.parent; if (!had) f.scene.add(world);
        const shown = [], culled = [], keys = [];
        try {
          r.setRenderTarget(f.app.post.target);
          const p = r.compileAsync ? r.compileAsync(f.scene, f.cam.cam) : (r.compile(f.scene, f.cam.cam), null);
          r.setRenderTarget(prevRT);
          if (p) await p;
          // one real frame through the picture's passes, with everything shown and nothing culled (every room's
          // props, every shard) so every mesh is uploaded now, not when a room first comes in; the keys' shadow
          // pass forced on (it's off while a key is dark), so the shadow shaders and the bloom are built too
          f.scene.traverse((o) => { if (o.isLight) return; if (!o.visible) { shown.push(o); o.visible = true; } if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
          f.scene.traverse((o) => { if (o.isLight && o.castShadow && o.shadow) { keys.push([o, o.shadow.autoUpdate]); o.shadow.autoUpdate = true; } });
          try { S.house.arena.update(0, f.cam.cam, f.player.root.position); } catch (e) { /* fine */ }
          r.shadowMap.needsUpdate = true;
          f.app.post.render(f.scene, f.cam.cam, 0);
        } finally {
          for (const [o, a] of keys) o.shadow.autoUpdate = a;
          for (const o of shown) o.visible = false;
          for (const o of culled) o.frustumCulled = true;
          if (!had) f.scene.remove(world);
        }
      }
    } catch (e) { console.warn('rent-free warm-up', e.message); }
    r.setRenderTarget(prevRT);
    return boss;
  },

  script(T, f) {
    for (const s of SECTIONS) T.section(s.name, { s: s.t0 }, { s: s.t1 }, { final: !!s.final });
    // (once her death scene has her, what the song had her do next doesn't happen: the scene is her last bars)
    const at = (pos, fn) => T.at(typeof pos === 'number' || (pos && typeof pos === 'object') ? (typeof pos === 'number' ? { s: pos } : pos) : D(pos), (ff) => { if (ff.boss && ff.boss.scene) return; fn(ff); });
    const t = (s) => tb(f, s);
    const spawn = (time, fn) => { SPAWNS.push({ t: time, fn }); T.at({ s: time }, (ff) => fn(ff, false), 'set'); };
    SPAWNS.length = 0;
    const ten = () => S.ten;
    // WALTZ RING ("Welcome home"): she twirls in a pink ring; on the beat a ring of her dust-sheet petals leaves her
    // (the petals leave only if the ring was drawn and still stands: never out of nothing after a frame-walk or the spotlight)
    const waltz = (fillFrom, release, rot = 0, n = 14, speed = 3.5) => {
      let ring = null;
      at(fillFrom, (ff) => { const b = ff.boss; ring = null; if (!b.root.visible || ten().mode === 'frame') return; ring = ff.tele.add({ shape: 'ring', x: b.x, z: b.z, w: 3.0, param: 0.6, kind: 'pink', start: ff.t, end: t(release), follow: () => ({ x: b.x, z: b.z }) }); ff.cue('pink', b); ten().own(t(release) + 0.2); b.perform('Dance_Loop', { duration: t(release) - ff.t + 0.3 }); snd('rf-swirl', { x: b.x }); });
      at(release, (ff) => { const b = ff.boss; if (!b.root.visible || b.intangible || !standing(ring)) return; ring = null; petalRing(ff, { x: b.x, z: b.z, n, gaps: true, speed, size: 0.55, rot: Math.atan2(ff.player.x - b.x, ff.player.z - b.z) + Math.PI / 2 + rot, curve: 0.436 }); snd('rf-swish', { x: b.x, gain: 0.6 }); });
    };
    // NEVER RINGS: her heel on each "never"; the ring round her pulses from the first fill and flashes on each.
    // Hugging her is safe: the ring sits just outside arm's reach (YOU can't stand closer than ~1.1 m) and the
    // shock-wave leaves from it outward (it used to start over 0.9-1.6 m, where a hug stands, so hugging got hit)
    // (a shock-ring leaves only from a ring that's still drawn: none out of nothing after the spotlight)
    const neverRings = (from, rels) => {
      const rings = new Map();
      at(from, (ff) => { const b = ff.boss; rings.clear(); if (!b.root.visible) return; for (const r of rels) rings.set(r, ff.tele.add({ shape: 'ring', x: b.x, z: b.z, w: 2.2, param: 0.55, kind: 'white', start: ff.t, end: t(r), follow: () => ({ x: b.x, z: b.z }) })); ff.cue('white', b); ten().own(t(rels[rels.length - 1]) + 0.3); ten().face('tenantMine', 6); });
      for (const r of rels) at(r, (ff) => { const b = ff.boss; if (!b.root.visible || b.intangible) return; b.perform('Sword_Attack', { duration: 0.42, from: 0.45, to: 0.95 }); snd('rf-stamp', { x: b.x, must: true }); if (!standing(rings.get(r))) return; rings.delete(r); shockRing(ff, b.x, b.z, { r0: 2.45, speed: 9, band: 0.7, max: 15 }); ff.cam.shake(0.3, 0.1); });
    };
    // DOOR LUNGE: a knock (the song's), the door's latch rattling, a white lane across the room; the door bangs open
    const doorLunge = (id, knock, lockB, hitB) => {
      let lane = null;
      const reach = (x, z, a) => { const dx = Math.sin(a), dz = Math.cos(a); let m = 30; if (dx > 1e-3) m = Math.min(m, (10.8 - x) / dx); if (dx < -1e-3) m = Math.min(m, (-10.8 - x) / dx); if (dz > 1e-3) m = Math.min(m, (6.8 - z) / dz); if (dz < -1e-3) m = Math.min(m, (-6.8 - z) / dz); return Math.max(2.5, m - 2); };
      at(knock, (ff) => {
        const d = S.house.doorPoint(id); S.house.knock(id, ff.t); ff.at(ff.t + 0.21, (f2) => S.house.knock(id, f2.t)); snd('rf-latch', { x: d.x });
        lane = zone(ff, { shape: 'rect', w: 0.9, kind: 'white', start: ff.t, end: t(hitB), lock: t(lockB), aim: () => { const a = Math.atan2(ff.player.x - d.x, ff.player.z - d.z); return { x: d.x, z: d.z, angle: a, h: reach(d.x, d.z, a) }; }, damage: 1, melee: true });
      });
      at(hitB, (ff) => {
        const d = S.house.doorPoint(id), b = ff.boss; S.house.doorOpen(id, ff.t, 0.5); snd('rf-bang', { x: d.x, must: true }); ff.cam.shake(0.4, 0.12);
        const sh = lane ? lane.sh : { angle: Math.atan2(d.nx, d.nz), h: 8 };
        ten().reset(d.x, d.z, sh.angle); b.root.visible = true; b.intangible = false; ten().mode = 'script'; ten().until = ff.t + 2;
        b.perform('Sword_Dash', { duration: 0.5, from: 0.05, to: 0.55 });
        b.moveTo(d.x + Math.sin(sh.angle) * sh.h, d.z + Math.cos(sh.angle) * sh.h, Math.max(0.15, sh.h / 20), { easing: 'out', now: ff.t });
        ten().face('tenantMine', 3);
      });
    };

    // ============================================================ §1 HONEY, I'M HOME (0 - 10.70) the foyer
    at(1.42, (ff) => S.house.event('bell', ff)); at(1.75, (ff) => S.house.event('bell', ff));
    at('2.1', (ff) => {
      ff.boss.root.visible = true; ff.boss.intangible = false; ff.boss.place(0, -6.7, 0); ten().face('tenantHome'); ff.boss.perform('Idle_Talking_Loop', { duration: 0.6 });
      // the doors swing in: lilac light and a gust of rose petals across the floor to your feet
      for (let i = 0; i < 4; i++) ff.at(ff.t + i * 0.12, (f2) => f2.fx.emit(16, { x: (Math.random() - 0.5) * 1.8, y: 1.2, z: -6.6, color: new THREE.Color(2.4, 0.9, 1.4), shape: 4, speed: 7, angle: 0, spread: 0.9, life: 2.2, size: 0.09, gravity: 2.5, up: 0.15, drag: 1.1, jitter: 0.6 }));
      snd('rf-breath', { x: 0, gain: 0.6, rate: 0.8 });
    });
    at(3.34, (ff) => ff.boss.perform('Yes', { duration: 0.8 }));
    at('3.3', (ff) => { ten().own(t('5.1')); ten().stroll(0, -4.0, t('5.1')); });
    // her luggage slides in through the door behind her on the downbeat, the doors shut on the first kick
    spawn(5.42, (ff, instant) => {
      const L = [['trunk', 'L:trunk', -2.8, -3.6, 0.2], ['hatboxes', 'L:hat', 2.6, -3.4, 0], ['vanity', 'L:vanity', 0.4, -2.2, -0.3]];
      for (const [kind, id, x, z, rot] of L) {
        if (S.claims.get(id)) continue;
        const c = luggageClaim(ff, id, kind, x, z, { rot });
        if (!instant) { const fx = 0, fz = -7.3; S.claims.place(c, fx, fz); tween(5.42, 6.06, (k) => S.claims.place(c, fx + (x - fx) * k, fz + (z - fz) * k), 'out'); }
      }
    });
    at('6.3', () => ten().kiss(1));

    // ============================================================ §2 VERSE 1, MOVING IN (10.70 - 41.22) the gallery
    at('8.1', (ff) => { ten().reset(0, -3.5, 0); });
    at(11.2, () => { ten().own(t('10.1')); ten().stroll(-5.5, -2.0, t('10.1')); });
    at('10.2', () => { ten().own(t('11.2')); ten().stroll(-7.0, 0.4, t('11.2')); });
    at('11.2', (ff) => { ten().own(t('12.1')); ff.boss.faceNow(-7.8, 0.5); ff.boss.perform('Interact', { duration: 0.66 }); });
    // "just claimed my stay": the glaze sweeps over your chair with a ting, her kiss stamps on its back
    spawn(t('11.4'), (ff, instant) => {
      if (S.claims.get('armchair')) return;
      const c = shellClaim(ff, 'armchair', 'armchair', -7.8, 0.5, Math.PI / 2, { sit: { x: -7.6, z: 0.5, face: Math.PI / 2 } });
      if (!instant) { const sh = c.data.shell; sh.scale.set(1.04, 0.01, 1.04); tween(ff.t, ff.t + 0.3, (k) => sh.scale.set(1.04, 0.01 + 1.03 * k, 1.04), 'out'); snd('rf-ting', { x: -7.8 }); ten().face('tenantMine', 2); }
    });
    at('12.1', (ff) => { const c = S.claims.get('armchair'); if (c && c.alive) ten().lounge(c, ff.t + 0.05, t('14.3')); });
    // "It's all mine": the band stops; the plaques glint; three frames swing in high in the flies
    at('15.1', (ff) => { ten().own(t('22.3')); ten().stroll(-0.8, -3.4, t('16.2')); ten().face('tenantMine', 4); });
    at('16.2', (ff) => { ff.boss.faceNow(0, -7); ff.boss.lockFacing = true; ff.boss.perform('Spell_Simple_Enter', { duration: 0.5 }); ff.at(ff.t + 0.5, () => ten().hold('Spell_Simple_Idle_Loop', t('21.4'))); });
    at('21.4', (ff) => { ff.boss.lockFacing = false; ten().stroll(0, -5.75, t('22.3')); });
    at('16.1', (ff) => S.house.event('plaques', ff));
    const HANG = [['W1', '16.3', '18.1'], ['W2', '18.3', '20.1'], ['W3', '20.3', '22.1']];
    for (const [s, a, b] of HANG) {
      spawn(t('16.2'), (ff, instant) => {
        if (S.claims.get('P:' + s)) return;
        const c = portraitClaim(ff, s, { dormant: !instant, lift: instant ? 0 : 9 });
        if (instant) { wires(c, false); return; }
        const t0 = t(a), t1 = t(b), up = c.data.up, ph = SOCK[s][0];
        // they zip down on their wires to just above their places (low enough to be in the picture), sway over the
        // fill, and slam down on the beat
        tween(ff.t, ff.t + 0.35, (k) => { up.position.y = 9 - 8.0 * k; }, 'out');
        tween(ff.t + 0.35, t1 - 0.18, (k) => { up.position.y = 1.0 - 0.2 * k; up.rotation.z = Math.sin(ff.t * 2.4 + ph) * (0.04 + 0.05 * k); }, 'lin');
        tween(t1 - 0.18, t1, (k) => { up.position.y = 0.8 * (1 - k); up.rotation.z *= 0.8; }, 'in', () => { up.position.y = 0; up.rotation.z = 0; c.dormant = false; wires(c, false); });
      });
      at(a, (ff) => {
        const x = SOCK[s][0];
        ff.pat.area(ff, { shape: 'rect', x, z: -7.0, angle: 0, w: 1.6, h: 2.6, kind: 'white', start: ff.t, end: t(b), damage: 1,
          onImpact: () => { ff.cam.shake(0.6, 0.18); ff.fx.dust(x, -6.2, 18, new THREE.Color(0.9, 0.82, 0.78)); ff.fx.glitter(x, 1.0, -6.4, new THREE.Color(3, 1.2, 2.4), 18, 1.2); snd('rf-slam', { x, must: true }); S.house.event('slam', ff, { x }); } });
        snd('rf-wires', { x, rate: 2.0 / Math.max(0.5, t(b) - ff.t) * 0.95 });
      });
    }
    // THE FIRST FRAME-WALK, slowed to teach it: into JESUS, out of PEACE OF MIND
    at('22.3', (ff) => {
      const ps = ten().portraits();
      let src = S.claims.get('P:W3'); if (!src || !src.alive) src = ps[0];
      let dst = S.claims.get('P:W1'); if (!dst || !dst.alive || dst === src) dst = ps.find((p) => p !== src) || null;
      if (src && src.alive) ten().frameWalk(ff.t, src, dst || src, { slow: true });
    });
    // THREW YOUR CONFIDENCE AWAY: your brass trophy floats into her hand; a white lane; she throws it
    at('25.1', (ff) => { ten().own(t('26.3')); S.house.event('trophyUp', ff); });
    at('25.2', (ff) => {
      const b = ff.boss, lock = t('25.4');
      let ang = Math.atan2(ff.player.x - b.x, ff.player.z - b.z);
      const len = () => Math.min(12, Math.hypot(ff.player.x - b.x, ff.player.z - b.z) + 1);
      const sh = ff.pat.area(ff, { shape: 'rect', x: b.x, z: b.z, angle: ang, w: 0.5, h: len(), kind: 'white', start: ff.t, end: t('26.1'), damage: 1,
        follow: () => { if (ff.t < lock) ang = Math.atan2(ff.player.x - b.x, ff.player.z - b.z); return { x: b.x, z: b.z, angle: ang }; } });
      b.faceNow(ff.player.x, ff.player.z); b.lockFacing = true;
      ff.boss.perform('OverhandThrow', { duration: t('26.1') - ff.t + 0.15, from: 0.0, to: 0.7 });
      ff.at(t('26.1'), (f2) => {
        b.lockFacing = false;
        const tro = P.trophy(); const to = { x: b.x + Math.sin(ang) * sh.h, z: b.z + Math.cos(ang) * sh.h };
        arcDeco(f2, { x: b.x, z: b.z }, to, f2.t, f2.t + 0.25, { mesh: tro, peak: 0.3, fromY: 1.5, kind: 'white', size: 0.01 });
        f2.at(f2.t + 0.27, (f3) => { snd('rf-thud', { x: to.x }); const tr2 = P.trophy(); tr2.position.set(to.x, 0, to.z); tr2.rotation.z = Math.PI / 2; f3.scene.add(tr2); addLoose(tr2); });
      });
    });
    at('26.3', () => { ten().face('tenantHaha', 6); ten().upper('Consume', { duration: 1.2 }); });
    // EVERY ROOM IS MINE, MINE, MINE: three heel-stamps, a medallion where each lands, her lipstick at its back rim
    const MINES = [['M1', -6.0, 1.5, '28.4', '29.4'], ['M2', 6.0, 1.5, '29.2', '30.2']];
    for (const [id, mx, mz, a, b] of MINES) {
      at(a, (ff) => ff.pat.area(ff, { shape: 'circle', x: mx, z: mz, w: 2.0, kind: 'white', start: ff.t, end: t(b), damage: 1, onImpact: () => { snd('rf-stamp', { x: mx }); } }));
      spawn(t(b), (ff, instant) => { if (!S.claims.get(id)) { const c = mineClaim(ff, id, mx, mz); if (!instant) { c.obj.scale.setScalar(0.01); tween(ff.t, ff.t + 0.18, (k) => c.obj.scale.setScalar(0.01 + k), 'out'); } } });
      at(b, (ff) => { ten().face('tenantMine', 2); ff.boss.perform('Sword_Attack', { duration: 0.4, from: 0.35, to: 0.9 }); });
    }
    at('29.4', (ff) => {
      // the third one is about you: it follows you two beats, locks, and lands
      ff.pat.mark(ff, { beats: 2, freeze: 2, r: 2.0, kind: 'white', onImpact: () => snd('rf-stamp', { x: ff.player.x }) });
      ff.at(t('30.2'), (f2) => { S.m3 = { x: f2.player.x, z: f2.player.z }; });
    });
    spawn(t('30.4'), (ff, instant) => { if (!S.claims.get('M3')) { const p = S.m3 || { x: 0.5, z: 3.0 }; const mx = clampX(ff, p.x), mz = Math.min(5.2, Math.max(-3.5, p.z)); const c = mineClaim(ff, 'M3', mx, mz); if (!instant) { c.obj.scale.setScalar(0.01); tween(ff.t, ff.t + 0.18, (k) => c.obj.scale.setScalar(0.01 + k), 'out'); ten().face('tenantMine', 2); ff.boss.perform('Sword_Attack', { duration: 0.4, from: 0.35, to: 0.9 }); } } });

    // ============================================================ §3 PRE-CHORUS, THE GHOSTS (41.22 - 61.13)
    const mineMedallions = () => S.claims.list.filter((c) => c.kind === 'mine' && c.alive);
    const pulse = (a, b) => at(a, (ff) => { for (const c of mineMedallions()) { const { mx, mz } = c.data; ff.pat.area(ff, { shape: 'circle', x: mx, z: mz, w: 2.0, kind: 'white', start: ff.t, end: t(b), damage: 1, silent: true }); } if (mineMedallions().length) snd('rf-tone', { x: 0, gain: 0.6 }); });
    // "You can't evict what you invited in": four sheeted shapes slide in through the side doors
    const SHEETED = [['F:chaise', 'chaise', -7.0, -2.8, 0.2, -1], ['F:piano', 'piano', -4.0, -4.9, 0, -1], ['F:mirror', 'mirror', 4.2, -5.2, -0.2, 1], ['F:wardrobe', 'wardrobe', 8.2, -4.6, -0.3, 1]];
    spawn(t('32.1'), (ff, instant) => {
      for (const [id, kind, x, z, rot, side] of SHEETED) {
        if (S.claims.get(id)) continue;
        const c = furnitureClaim(ff, id, kind, x, z, rot, { data: kind === 'chaise' ? { sit: { x, z: z + 0.1, face: Math.PI / 2 } } : {} });
        // a dust sheet over it
        const sh0 = kind === 'wardrobe' ? 2.4 : kind === 'piano' ? 1.45 : kind === 'mirror' ? 2.0 : 0.95, fw = c.shape.hw * 1.6, fd = c.shape.hd * 1.6;
        const sheet = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.0, sh0, 4, 3, false), P.yourMats().sheet);
        sheet.rotation.y = Math.PI / 4; sheet.position.y = sh0 / 2; sheet.scale.set(fw, 1, fd);
        { const pa = sheet.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); if (y < sh0 / 2 - 0.01 && y > -sh0 / 2 + 0.01) { pa.setX(i, pa.getX(i) * 1.05); pa.setZ(i, pa.getZ(i) * 1.05); } } sheet.geometry.computeVertexNormals(); }
        sheet.name = 'sheet'; sheet.userData.yours = true;
        c.obj.add(sheet); c.data.sheet = sheet;
        if (!instant) {
          const fx = side * 10.8, fz = -1.5;
          c.dormant = true; S.claims.place(c, fx, fz);
          tween(ff.t, t('33.1'), (k) => { const cx = fx + (x - fx) * k, cz = fz + (z - fz) * k - Math.sin(k * Math.PI) * 1.2; S.claims.place(c, cx, cz); }, 'inOut', () => { c.dormant = false; S.claims.place(c, x, z); });
          snd('rf-creak', { x: fx });
        }
      }
    });
    at('33.2', (ff) => { ten().face('tenantMine', 3); ten().upper('Interact', { duration: 0.6 }); });
    pulse('34.1', '34.3');
    // "can't exorcise the ghost that wears your skin": the sheets stand up and drift after you
    at('36.3', (ff) => { for (const [id] of SHEETED) { const c = S.claims.get(id); if (c && c.alive && c.data.sheet) ff.pat.area(ff, { shape: 'circle', x: c.x, z: c.z, w: 1.4, kind: 'pink', start: ff.t, end: t('37.1'), damage: 0, silent: true, sound: false }); } });
    at('37.1', (ff) => {
      for (const [id] of SHEETED) {
        const c = S.claims.get(id); if (!c || !c.alive || !c.data.sheet) continue;
        c.obj.remove(c.data.sheet); c.data.sheet = null;
        spawnGhost(ff, c.x, c.z, t('45.1'));
      }
      if (S.ghosts.length) snd('rf-breath', { x: 0 });
    });
    pulse('38.1', '38.3');
    // SQUATTER'S RIGHTS: she lounges on her chaise; her portraits sing along, one kiss a syllable
    at('39.4', (ff) => { const c = S.claims.get('F:chaise'); if (c && c.alive) ten().lounge(c, t('40.1'), t('43.1')); });
    const PK = [['41.3', 'W1'], ['41.4', 'W3'], ['42.1', 'W2'], ['42.2', 'W1'], ['42.3', 'W3']];
    for (const [a, s] of PK) at(a, (ff) => portraitKiss(ff, S.claims.get('P:' + s)));
    pulse('42.1', '42.3');
    at('43.1', (ff) => { if (ten().mode === 'lounge') ten().stand(); ten().own(t('44.4')); ff.at(ff.t + 0.45, () => ten().stroll(0, -3.0, t('44.4'))); });
    pulse('44.1', '44.3');
    // OH WAIT, I FINISHED IT: the glass, onto the song's own smash
    at('44.4', (ff) => {
      ten().own(t('45.4') + 0.3);
      let lock = null;
      ff.pat.mark(ff, { beats: 2, freeze: 2, r: 1.8, kind: 'white', onImpact: () => { if (lock) ff.pat.ring(ff, { from: lock, n: 8, speed: 9, kind: 'white', shape: 'shard', size: 0.3, life: 0.5, offset: 0.2 }); } });
      ff.at(t('45.2'), (f2) => { lock = { x: f2.player.x, z: f2.player.z }; });
    });
    at('45.1', (ff) => { ff.boss.perform('Consume', { duration: 0.33 }); ff.at(ff.t + 0.33, (f2) => { f2.boss.perform('OverhandThrow', { duration: 0.6, from: 0.1, to: 0.75 }); const lk = { x: f2.player.x, z: f2.player.z }; arcDeco(f2, { x: f2.boss.x, z: f2.boss.z }, lk, f2.t + 0.15, t('45.4'), { shape: 'shard', size: 0.22, kind: 'white', peak: 2.2 }); }); });

    // ============================================================ §4 CHORUS 1, THE BALL (61.13 - 86.30) the ballroom
    at('46.1', (ff) => { for (const gh of S.ghosts) { ff.fx.glitter(gh.p.x, 1.2, gh.p.z, new THREE.Color(3, 1.5, 2.6), 20, 1.2); gh.p.dead = true; } ten().reset(0, -1.8, 0); ff.boss.perform('Dance_Loop', { duration: 1.2 }); });
    spawn(61.13, (ff, instant) => ballroomSet(ff, instant, 'c1'));
    at('47.3', () => ten().kiss(5));
    at('48.1', (ff) => { portraitVolley(ff, ten().portraits()); });
    waltz('48.3', '49.1'); waltz('49.3', '50.1', Math.PI / 2);
    at('51.4', () => ten().kiss(5));
    // TENANT TO LANDLORD: a fast frame-walk, into the portrait nearest her, out of the one diagonally opposite
    at('50.1', (ff) => {
      const ps = ten().portraits(); if (!ps.length) return;
      const b = ff.boss; const near = ps.slice().sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
      const opp = { L1: 'R2', R2: 'L1', L2: 'R1', R1: 'L2' }[near.data.sock];
      let dst = S.claims.get('P:' + opp); if (!dst || !dst.alive) dst = ps.find((p) => p !== near) || near;
      ten().frameWalk(t('52.4'), near, dst);
    });
    // the SHOVE from where she lands
    at('54.1', (ff) => shove(ff, t('54.4')));
    // EVERY NIGHTMARE'S GOT MY FURNITURE: her furniture lifts on wires and drops where you stand, one after another
    at('55.1', (ff) => furnitureDrops(ff, ['F:chaise', 'F:piano', 'F:wardrobe'], ['55.1', '56.1', '57.1']));
    at('58.2', () => { ten().face('tenantHaha', 6); ten().upper('Consume', { duration: 1.4 }); });
    // AND I'M NEVER, NEVER, NEVER MOVING OUT: three shock-rings off her heel; hug her (inside r 1.6) or dash through
    neverRings('60.2', ['60.4', '61.2', '61.4']);
    at('62.1', (ff) => { ten().own(t('63.2')); ten().hold('Idle_FoldArms_Loop', t('63.2')); ten().face('tenantMine', 4); });
    waltz('63.2', '63.4'); waltz('64.2', '64.4', Math.PI / 2);
    at('64.3', (ff) => {
      // she steps into the nearest standing portrait; the walls fly up and take her with them
      const ps = ten().portraits(); const b = ff.boss;
      const near = ps.sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
      ten().gen++; ten().mode = 'script'; ten().until = 90;
      ff.boss.perform('Interact', { duration: 0.4 });
      ff.at(ff.t + 0.35, () => { b.root.visible = false; b.intangible = true; ff.fx.glitter(b.x, 1.5, b.z, new THREE.Color(3, 1.4, 3.4), 24, 0.6); if (near) { ten().paintIn(near, ff.t, ff.t + 0.6, -1); } });
    });

    // ============================================================ §5 KNOCK-KNOCK (86.30 - 95.58) the hall of doors
    // behind the doors she's nowhere: parked out of sight at the middle of the back wall, so the camera (which always
    // frames her too) frames the hall round you, not the left-hand door
    at(86.30, (ff) => { ten().reset(0, -5.6, 0); ff.boss.root.visible = false; ff.boss.intangible = true; ten().mode = 'script'; ten().until = 96; });
    doorLunge('L1d', '65.4', '66.4', '67.1');
    at('67.2', (ff) => { S.house.doorsOpen(ff.t, ff.t + (t('67.3') - t('67.2')), true); ff.at(t('67.3'), () => { ff.boss.root.visible = false; ff.boss.intangible = true; }); });
    doorLunge('U', '67.4', '68.4', '69.1');
    // the third knock comes a beat late, from no door: under you
    at('70.1', (ff) => { snd('rf-latch', { x: 0, gain: 0.45 }); S.house.slits(ff.t, 'out'); snd('rf-thud', { x: ff.player.x, gain: 0.6, rate: 0.6 }); });
    at('70.3', (ff) => {
      // I'M ALREADY INSIDE: a circle under you that follows you, locks, and she bursts up through the boards
      let lock = null;
      zone(ff, { shape: 'circle', w: 1.8, kind: 'white', start: ff.t, end: t('72.1'), lock: t('71.3'), aim: () => ({ x: ff.player.x, z: ff.player.z }), damage: 1,
        onImpact: (hit, sh) => { lock = { x: sh.x, z: sh.z }; burstUp(ff, sh.x, sh.z); } });
      snd('rf-creak', { x: ff.player.x });
    });

    // ============================================================ §6 VERSE 2, 3 A.M. (95.58 - 118.13) your bedroom, then below
    spawn(95.58, (ff, instant) => { if (!S.claims.get('P:L1')) { portraitClaim(ff, 'L1', { arrive: !instant }); portraitClaim(ff, 'R1', { arrive: !instant }); furnitureClaim(ff, 'F:vanity', 'vanityTable', -8.6, -2.4, Math.PI / 2, { arrive: !instant }); } });
    at('72.3', (ff) => { const b = ff.boss; tween(ff.t, ff.t + 0.4, (k) => { b.root.position.y = -0.9 * (1 - k); }); ten().own(t('73.4')); ff.at(ff.t + 0.4, () => ten().stroll(1.5, -4.2, t('73.3'))); });
    at('73.3', (ff) => { phone(true); ten().sitOn({ x: 1.4, z: -4.35, face: 0 }, t('73.4'), t('78.4'), { clip: 'Idle_TalkingPhone_Loop' }); });
    at('74.1', () => { ten().upper('Spell_Simple_Shoot', { duration: 0.4 }); ten().kiss(5, { shape: 'heart', size: 0.42, peak: 0.8 }); });
    at('75.4', () => ten().kiss(3));
    // THE CLOCK STRIKES THREE: the bells are the song; your clock throws a white shock-ring on each
    let clockRing = null;
    at('76.4', (ff) => { clockRing = ff.tele.add({ shape: 'ring', x: -1.8, z: -6.5, w: 1.0, param: 0.4, kind: 'white', start: ff.t, end: t('77.2') }); ff.cue('white', { x: -1.8 }); snd('rf-tick', { x: -1.8 }); });
    for (const [s2, k] of [['77.2', 0], ['77.3', 1], ['77.4', 2]]) at(s2, (ff) => { const was = standing(clockRing); clockRing = null; if (was) shockRing(ff, -1.8, -6.3, { r0: 0.6, speed: 8, band: 0.6, max: 14 }); if (k < 2) clockRing = ff.tele.add({ shape: 'ring', x: -1.8, z: -6.5, w: 1.0, param: 0.4, kind: 'white', start: ff.t, end: ff.t + ff.beat }); });
    // THE FLOOR GIVES WAY: in silence; she's behind the crawlspace lattice, where you can't reach
    at('79.1', (ff) => {
      phone(false);
      for (const c of [...S.claims.list]) { const o = c.obj; tween(ff.t, ff.t + 0.45, (k) => { o.position.y = 16 * k * k; }, 'lin', () => S.claims.remove(c.id)); c.dormant = true; }
      ten().reset(0, -5.8, 0); ten().lattice = true; ten().mode = 'script'; ten().until = t('86.3');
      ff.boss.root.position.y = 0; ff.boss.loop('Idle_Talking_Loop'); ten().face('tenantHome');
      ff.player.rig.upperOnce('Jump_Land', { duration: 0.35, from: 0.0, to: 0.6 });
      snd('rf-bang', { x: 0, gain: 0.35, rate: 0.7 });
      boardsBurst(ff);
    });
    at('79.2', (ff) => { ff.cam.shake(0.8, 0.2); ff.cam.kick(1.2); ten().kiss(1, { fromY: 1.6 }); });
    at('80.4', (ff) => strollBehind(ff, t('84.2')));
    const CRATES = [['80.3', '81.1', -1, 2.5], ['81.1', '81.3', 1, -1.8], ['81.3', '82.1', -1, -3.4], ['82.1', '82.3', 1, 3.6], ['82.4', '83.2', 1, 1.6], ['83.2', '83.4', -1, -2.6]];
    CRATES.forEach(([a, b2, side, z], i) => at(a, (ff) => crate(ff, 'C' + (i + 1), side, z, t(b2))));
    at('83.4', () => { ten().face('tenantHaha', 4); ten().upper('Consume', { duration: 0.9 }); });
    // THE BLUEPRINT: a house drawn round you to keep her out, and she was already here
    at('84.3', () => { ten().lattice = false; });
    at('85.2', (ff) => drawnHouse(ff, t('86.1'), t('88.2')));
    at('86.3', (ff) => { const h = S.drawn; const p = h ? { x: h.cx + (ff.player.x > h.cx ? -1.2 : 1.2), z: h.cz } : { x: ff.player.x - 1.5, z: ff.player.z }; ten().reset(p.x, p.z, 0); ff.boss.faceNow(ff.player.x, ff.player.z); ff.fx.glitter(p.x, 1.2, p.z, new THREE.Color(2.4, 2.8, 3.4), 30, 0.8); ten().own(t('88.1')); ten().face('tenantMine', 3); });
    at('86.4', (ff) => ten().backhand(ff.t, {}));
    at('87.2', (ff) => ten().backhand(ff.t, { second: true }));

    // ============================================================ §7 THE TAUNT (118.13 - 130.06) the gallery at dusk: her portraits are back up
    spawn(118.13, (ff, instant) => { for (const s2 of ['W1', 'W2', 'W3']) if (!S.claims.get('P:' + s2)) portraitClaim(ff, s2); });
    at('89.1', (ff) => { S.drawnClear && S.drawnClear(); ten().reset(0, -3.0, 0); ten().face('tenantHaha'); });
    at('90.3', () => ten().kiss(3));
    // she walks after you for the whole section, laughing, and forget-me-nots sprout where her feet have been
    at('90.1', (ff) => { S.chase = { until: t('97.1'), speed: 1.5 }; ten().own(t('97.1')); });
    T.every(D('90.1'), D('96.1'), 1, (ff, i) => forgetMeNot(ff, i));
    at('92.2', () => ten().upper('Interact', { duration: 0.5, from: 0.3, to: 0.7 }));
    for (const [a, b2, i0] of [['93.4', '94.4', 0], ['94.4', '95.4', 8], ['95.4', '96.4', 16]]) at(a, (ff) => flowersBurst(ff, i0, i0 + 8, t(b2)));
    at(126.96, () => ten().face('tenantHaha', 4));
    at('97.1', (ff) => {
      S.chase = null;
      const c = S.claims.get('P:W3');
      if (c && c.alive) { ten().gen++; ten().mode = 'script'; ten().until = 131; const p = SOCK_FLOOR('W3'); ten().stroll(p.x, p.z, t('97.3')); ff.at(t('97.3'), () => { ff.boss.perform('Idle_No_Loop', { duration: 0.6 }); }); ff.at(t('97.4'), () => { ff.boss.root.visible = false; ff.boss.intangible = true; ten().paintIn(c, ff.t, ff.t + 0.5, -1); }); }
    });

    // ============================================================ §8 CHORUS 2, THE MOLD (130.06 - 168.52) the ballroom
    spawn(130.06, (ff, instant) => ballroomSet(ff, instant, 'c2'));
    at('98.1', (ff) => { const p = SOCK_FLOOR('R1'); ten().reset(p.x, p.z, -Math.PI / 2); ff.boss.perform('NinjaJump_Land', { duration: 0.5 }); });
    // I'VE MADE MYSELF ETERNAL: two busts of her burst up from the floor; their eyes follow you
    at('99.2', (ff) => { for (const x of [-4.5, 4.5]) zone(ff, { shape: 'circle', x, z: -2.8, w: 1.3, kind: 'white', start: ff.t, end: t('100.1'), damage: 1 }); snd('rf-creak', { x: 0, rate: 0.6 }); });
    spawn(t('100.1'), (ff, instant) => { for (const [id, x] of [['B:L', -4.5], ['B:R', 4.5]]) if (!S.claims.get(id)) { const c = furnitureClaim(ff, id, 'bust', x, -2.8, 0, { hits: 8, value: 10 }); if (!instant) { c.obj.scale.y = 0.01; tween(ff.t, ff.t + 0.22, (k) => { c.obj.scale.y = 0.01 + k * 0.99; }, 'out'); ff.cam.shake(0.4, 0.12); } } if (!instant) ten().face('tenantMine', 2); });
    // YOUR JOURNAL: she takes it off the piano and flings its pages
    at('100.2', (ff) => { const pc = S.claims.get('F:piano'); const p = pc && pc.alive ? { x: pc.x + 1.2, z: pc.z + 0.6 } : { x: -5, z: -3.5 }; ten().own(t('102.3')); ten().stroll(p.x, p.z, t('101.1')); });
    at('101.1', (ff) => { ff.boss.perform('PickUp_Table', { duration: 0.8 }); snd('rf-creak', { x: ff.boss.x, gain: 0.4, rate: 1.6 }); });
    at('102.1', (ff) => { ff.boss.perform('OverhandThrow', { duration: 0.45, from: 0.3, to: 0.8 }); ten().kiss(5, { shape: 'card', size: 0.5, peak: 1.6 }); snd('rf-pencil', { x: ff.boss.x }); });
    // TEARS: three rows of three, falling where you stand and either side of you
    for (const [aim, land] of [['103.2', '103.4'], ['104.1', '104.3'], ['104.3', '105.1']]) at(aim, (ff) => tears(ff, t(land)));
    at('106.1', (ff) => { ten().own(t('107.1')); ff.boss.perform('Dance_Loop', { duration: t('107.1') - ff.t }); });
    at('107.3', () => ten().kiss(5));
    at('108.1', (ff) => { portraitVolley(ff, ten().portraits()); });
    waltz('108.3', '109.1'); waltz('109.3', '110.1', Math.PI / 2);
    at('111.4', () => ten().kiss(5));
    // THE MOLD behind your walls of memory: a dark stain creeps out under every standing portrait
    at('113.1', (ff) => mold(ff, t('113.1'), t('114.3'), 168.52));
    // FLASHBACKS: the busts' eyes charge, the camera's shutter is the song's
    for (const [c1, lk, sh] of [['116.2', '116.3', '116.4'], ['118.2', '118.3', '118.4']]) at(c1, (ff) => flashback(ff, t(lk), t(sh)));
    // THE FLINCH TEST: she squares up four metres away; on the knock she feints; the grab comes on "influence"
    at('119.1', (ff) => { const pl = ff.player, b = ff.boss; const a = Math.atan2(b.x - pl.x, b.z - pl.z); const p = { x: clampX(ff, pl.x + Math.sin(a) * 4), z: clampZ(ff, pl.z + Math.cos(a) * 4) }; ten().own(t('122.1')); ten().stroll(p.x, p.z, t('120.1')); });
    at('120.1', (ff) => { ten().hold('Spell_Simple_Idle_Loop', t('121.2')); ten().face('tenantDarling', 4); });
    at('121.2', (ff) => {
      const b = ff.boss; b.perform('Sword_Dash', { duration: 0.4, from: 0.0, to: 0.3 });
      zone(ff, { shape: 'circle', w: 1.6, kind: 'pink', start: ff.t, end: t('121.4'), lock: t('121.3'), aim: () => ({ x: ff.player.x, z: ff.player.z }), damage: 1, melee: true,
        onImpact: (hit) => { if (hit === 'parried') { ten().parried(); b.perform('Hit_Head', { duration: 0.5 }); } else if (hit === 'hit') { ten().face('tenantHaha', 3); ff.player.facing += Math.PI; } } });
      ff.at(t('121.4') - 0.12, (f2) => { const p = f2.player; const a = Math.atan2(p.x - b.x, p.z - b.z); const d = Math.max(0, Math.hypot(p.x - b.x, p.z - b.z) - 0.9); b.moveTo(b.x + Math.sin(a) * d, b.z + Math.cos(a) * d, 0.12, { easing: 'in', now: f2.t }); b.perform('Melee_Hook', { duration: 0.45, from: 0.2, to: 0.8 }); });
      snd('rf-swish', { x: b.x, gain: 0.7 });
    });
    at('122.2', () => { ten().face('tenantHaha', 4); });
    // THE FINE PRINT: her lease unrolls over the floor and reads itself to you, one line a beat, back to front
    const LINES = [['124.4', -6.0, -6, 3], ['125.1', -4.5, -2, 7], ['125.2', -3.0, -7, 2], ['125.3', -1.5, -3, 6], ['125.4', 0.0, -6, 1], ['126.1', 1.5, -1, 7], ['126.2', 3.0, -5, 3], ['126.3', 4.5, -2, 6], ['126.4', 6.0, -6, 2]];
    for (const [b2, z, g1, g2] of LINES) at(beatBefore(f, D(b2), 2), (ff) => finePrint(ff, z, g1, g2, t(b2)));
    at('124.2', (ff) => { snd('rf-pencil', { x: 0, gain: 0.8, rate: 0.7 }); ten().face('tenantMine', 4); ten().upper('Spell_Simple_Shoot', { duration: 0.5 }); });

    // ============================================================ §9 WELCOME HOME, THE PARTY (168.52 - 176.48) the foyer, dressed for a party
    spawn(168.52, (ff, instant) => { for (const [id, x, z] of [['BQ:1', -6.5, -3.0], ['BQ:2', 6.5, -3.0], ['BQ:3', 2.4, -5.2]]) if (!S.claims.get(id)) bouquetClaim(ff, id, x, z, !instant); });
    at(168.52, (ff) => { ten().reset(0, -6.2, 0); ten().own(t('128.4')); ff.boss.perform('Spell_Simple_Enter', { duration: 0.7 }); ten().face('tenantMine', 4); ff.at(ff.t + 0.8, () => ten().stroll(0, -3.0, t('128.4'))); });
    for (const [pt, sw, pop, id] of [['129.2', '129.3', '130.1', 'BQ:1'], ['130.2', '130.3', '131.2', 'BQ:2'], ['131.3', '131.4', '132.3', 'BQ:3']]) at(pt, (ff) => balloons(ff, id, t(sw), t(pop)));

    // ============================================================ §10 BRIDGE A, CROWDED (176.48 - 196.36) closer
    at('133.1', (ff) => { ten().face('tenantDarling', 3); ten().upper('Interact', { duration: 0.5, from: 0.2, to: 0.6 }); ten().kiss(1); });
    const LUG = [['134.2', -9.0, -5.0, 'trunk'], ['134.4', 9.0, -5.0, 'suitcase'], ['135.2', -9.0, 4.0, 'hatboxes'], ['135.4', 9.0, 4.0, 'birdcage'], ['136.2', -5.0, -5.8, 'trunk'], ['136.4', 5.0, -5.8, 'gramophone'],
      ['137.2', -9.2, -0.5, 'cello'], ['137.4', 9.2, -0.5, 'trunk'], ['138.2', -4.5, 5.4, 'suitcase'], ['138.4', 4.5, 5.4, 'suitcase'], ['139.2', -1.5, -6.0, 'hatboxes'], ['139.4', 1.5, -6.0, 'trunk']];
    LUG.forEach(([land, x, z, kind], i) => at(beatBefore(f, D(land), 2), (ff) => lowerLuggage(ff, 'LG:' + (i + 1), kind, x, z, t(land))));
    at('136.3', (ff) => { const c = S.claims.get('LG:5'); if (c && c.alive) ten().lounge(c, t('136.4'), t('140.3')); });
    // NEVER ALONE: she glides at your side, 2 m away, matching your speed; two slaps on "alone"; the hug on "me"
    at('141.1', (ff) => { S.glide = { until: t('147.1') }; ten().own(t('147.1')); snd('rf-breath', { x: ff.player.x }); });
    at('143.1', (ff) => glideSlap(ff, t('143.3')));
    at('144.4', (ff) => glideSlap(ff, t('145.2')));
    at('146.1', (ff) => {
      const b = ff.boss;
      zone(ff, { shape: 'circle', w: 2.2, kind: 'pink', start: ff.t, end: t('146.4'), aim: () => ({ x: b.x, z: b.z }), lock: t('146.4'), damage: 1, melee: true,
        onImpact: (hit) => { if (hit === 'parried') { ten().parried(); const a = Math.atan2(b.x - ff.player.x, b.z - ff.player.z); b.moveTo(b.x + Math.sin(a) * 1.5, b.z + Math.cos(a) * 1.5, 0.25, { now: ff.t }); } } });
      ten().face('tenantDarling', 3); ff.at(t('146.3'), () => b.perform('Melee_Hook', { duration: 0.5, from: 0.2, to: 0.9 }));
      snd('rf-breath', { x: b.x, gain: 0.8 });
    });

    // ============================================================ §11 BRIDGE B, THE DARK (196.36 - 217.58) closest; she strikes only in the pauses
    const PAUSES = [['148.1', '148.3'], ['149.2', '149.4'], ['151.1', '151.3'], ['152.1', '152.3'], ['153.2', '153.4'], ['154.4', '155.3', true], ['157.1', '157.3']];
    for (const [a, b2, hes] of PAUSES) at(a, (ff) => pauseStrike(ff, t(b2), hes ? { hold: [t('155.2'), t('155.3')] } : {}));
    at('148.1', (ff) => { ten().reset(-9.4, -3.7, 0.6); ff.boss.root.visible = true; ff.boss.intangible = false; ten().mode = 'script'; ten().until = t('158.1'); });
    // THE RIBBON: "I'm the reason you can't quite let go"
    at('158.1', (ff) => ribbonFlick(ff, t('158.3')));
    for (const [tug, slap] of [['159.2', '159.3'], ['160.2', '160.3'], ['161.2', '161.3']]) at(tug, (ff) => ribbonTug(ff, t(slap)));
    at('161.4', (ff) => ribbonLetGo(ff, t('162.2')));
    // THE MIRROR: she walks into the glass; it bursts on the song's glass
    at('162.3', (ff) => { ten().own(t('164.4')); ten().stroll(0, -6.3, t('163.3')); });
    at('163.3', (ff) => { ff.boss.root.visible = false; ff.boss.intangible = true; });
    at('163.4', (ff) => {
      const lock = { x: ff.player.x, z: ff.player.z };
      const ang = Math.atan2(lock.x, lock.z + 6.8);
      zone(ff, { shape: 'cone', x: 0, z: -6.8, angle: ang, w: 14, param: 0.7, kind: 'white', start: ff.t, end: t('164.2'), damage: 0, sound: false });
      ff.at(t('164.2'), (f2) => { f2.pat.fan(f2, { from: { x: 0, z: -6.8 }, angle: ang, n: 12, arc: 80, speed: 13, kind: 'white', shape: 'shard', size: 0.35, offset: 0.3 }); f2.cam.shake(0.6, 0.2); f2.fx.glitter(0, 3, -6.8, new THREE.Color(2.8, 2.9, 3.4), 60, 3); });
    });

    // ============================================================ §12 FINAL CHORUS, THE GRAND BALLROOM (217.58 - 249.41) everything at once
    spawn(218.58, (ff, instant) => grandSet(ff, instant));
    at('164.4', (ff) => { ten().reset(0, -1.5, 0); ff.boss.root.visible = true; ff.boss.intangible = false; ten().face('tenantMine', 4); ff.boss.perform('Spell_Simple_Enter', { duration: 0.7 }); });
    at('165.3', () => ten().kiss(7));
    at('166.1', (ff) => { portraitVolley(ff, ten().portraits()); });
    waltz('166.2', '166.4', 0, 16, 4.0); waltz('167.1', '167.3', Math.PI / 2, 16, 4.0);
    at('169.4', () => ten().kiss(7));
    // THE TERMITES: cracks race out from her feet, a star of five, then a second turned 36 degrees
    at('170.4', (ff) => termites(ff, 0, t('171.2')));
    at('171.3', (ff) => termites(ff, Math.PI / 5, t('172.1')));
    // HER NAME CARVED THROUGH: a giant nib scratches her signature through your floor; then a slash across it
    at(beatBefore(f, D('172.4'), 2), (ff) => carve(ff, 'N1', 'sign', t('172.4'), t('174.2')));
    at(beatBefore(f, D('175.1'), 2), (ff) => carve(ff, 'N2', 'slash', t('175.1'), t('175.4')));
    // EVERY FUTURE YOU PICTURE: frames slam flat where you're going to be
    for (const [pl2, land, i] of [['177.2', '177.4', 1], ['178.1', '178.3', 2], ['179.4', '180.2', 3], ['180.3', '181.1', 4]]) at(pl2, (ff) => futureFrame(ff, 'FF:' + i, t(land)));
    at('181.2', (ff) => { ten().own(t('183.3')); ten().face('tenantHaha', 9); ten().hold('Idle_Talking_Loop', t('183.3')); });
    at('184.1', (ff) => { portraitVolley(ff, ten().portraits()); });
    neverRings('185.2', ['185.4', '186.4', '187.4']);

    // ============================================================ §13 THE SICKEST PART (249.41 - 264.01) one light; four strikes in near-silence
    at('188.1', (ff) => { ten().own(t('192.2')); stepToLamp(ff, t('188.3')); S.close = 0.6; });
    at('188.1', (ff) => { const b = ff.boss; zone(ff, { shape: 'cone', x: b.x, z: b.z, w: 7, param: 0.8, kind: 'white', start: ff.t, end: t('189.1'), lock: t('188.3'), aim: () => ({ x: b.x, z: b.z, angle: Math.atan2(ff.player.x - b.x, ff.player.z - b.z) }), damage: 1 }); snd('rf-tone', { x: b.x, gain: 0.8 }); ff.at(t('189.1') - 0.3, () => b.perform('Sword_Regular_A', { duration: 0.45 })); });
    at('189.1', (ff) => { const p = { x: ff.player.x, z: ff.player.z }; zone(ff, { shape: 'ring', x: p.x, z: p.z, w: 3.0, param: 1.2, kind: 'white', start: ff.t, end: t('190.1'), damage: 1 }); snd('rf-tone', { x: p.x, gain: 0.8, rate: 1.0 }); stepToLamp(ff, t('189.4')); ff.at(t('190.1') - 0.4, () => ff.boss.perform('Sword_Attack', { duration: 0.5 })); });
    at('190.1', (ff) => { const b = ff.boss; zone(ff, { shape: 'rect', x: b.x, z: b.z, w: 1.2, h: 14, kind: 'white', start: ff.t, end: t('191.1'), lock: t('190.3'), aim: () => ({ x: b.x, z: b.z, angle: Math.atan2(ff.player.x - b.x, ff.player.z - b.z) }), damage: 1, onImpact: () => { const a = Math.atan2(ff.player.x - b.x, ff.player.z - b.z); } }); snd('rf-tone', { x: b.x, gain: 0.8 }); ff.at(t('191.1') - 0.25, () => b.perform('Shield_Dash', { duration: 0.4 })); });
    at('191.1', (ff) => { const b = ff.boss; stepToLamp(ff, t('191.3')); zone(ff, { shape: 'circle', w: 2.0, kind: 'pink', start: ff.t, end: t('192.1'), aim: () => ({ x: b.x, z: b.z }), lock: t('192.1'), damage: 1, melee: true, onImpact: (hit) => { if (hit === 'parried') ten().parried(); } }); snd('rf-tone', { x: b.x, gain: 0.8 }); ten().face('tenantDarling', 4); ff.at(t('192.1') - 0.3, () => b.perform('Melee_Hook', { duration: 0.5, from: 0.2, to: 0.9 })); });
    neverRings('192.2', ['192.4']);
    at('192.4', () => { S.close = 0; });
    at('194.1', (ff) => { const c = S.claims.get('G:armchair'); if (c && c.alive) ten().lounge(c, t('194.2'), t('196.1')); else { ten().own(t('196.1')); ten().stroll(2.6, -4.8, t('194.3')); } });
    for (const b2 of ['197.1', '197.2', '197.3', '197.4', '198.1', '198.2']) at(b2, () => ten().kiss(1, { shape: 'heart', size: 0.42, peak: 1.2 }));

    // ============================================================ §14 CODA, THE FIRESIDE (264.01 - 291.87) your parlour; she's in YOUR armchair
    at(264.01, (ff) => { ten().reset(7.0, -4.0, Math.PI / 2 - 0.5); ten().sitOn({ x: 7.35, z: -4.15, face: Math.PI / 2 - 0.5 }, t('200.2'), t('207.4')); ten().face('tenantSleep'); });
    at('201.1', () => { if (ten().mode === 'lounge') ten().upper('Consume', { duration: 1.2 }); });
    at('204.1', () => { if (ten().mode === 'lounge') ten().upper('Yes', { duration: 0.8 }); });
    // THE LOCKS: on the knock her key racks swing down onto your hook rails; then the keys fly on the song's rings
    spawn(277.60, (ff, instant) => { for (const [id, x] of [['K:1', -6.5], ['K:2', 0], ['K:3', 6.5]]) if (!S.claims.get(id)) keyRackClaim(ff, id, x, !instant); if (!instant) snd('rf-jingle', { x: 0, gain: 1.4, rate: 0.8 }); });
    at('207.4', (ff) => { ten().face('tenantMine', 4); });
    at('211.2', (ff) => keyVolley(ff, t('211.4'), 0));
    at('213.4', (ff) => keyVolley(ff, t('214.2'), 0.4));
    at(285.98, (ff) => { ten().own(t('217.4')); const p = { x: ff.player.x * 0.5 + 3, z: ff.player.z * 0.5 - 2 }; ten().stroll(clampX(ff, p.x), clampZ(ff, p.z), 288.6); ten().face('tenantHome'); });
    at('217.4', (ff) => { const b = ff.boss; const g = ff.tele.add({ shape: 'ring', x: b.x, z: b.z, w: 3.0, param: 0.6, kind: 'pink', start: ff.t, end: t('218.3') }); ff.cue('pink', b); ff.at(t('218.3'), (f2) => { if (!standing(g)) return; petalRing(f2, { x: b.x, z: b.z, n: 12, gaps: true, speed: 3.5, shape: 'heart', size: 0.42, rot: Math.atan2(f2.player.x - b.x, f2.player.z - b.z) + Math.PI / 2, curve: 0 }); snd('rf-swirl', { x: b.x }); }); });
    at('219.1', (ff) => { ten().own(t('220.1')); ten().stroll(-10.2, -1.5, t('219.4')); });
    at('219.4', (ff) => { ff.boss.root.visible = false; ff.boss.intangible = true; });

    // ============================================================ §15 SWEET DREAMS (291.87 - 307.6) your bedroom at night
    spawn(291.87, (ff, instant) => { if (!S.claims.get('P:L1')) { portraitClaim(ff, 'L1', { arrive: !instant }); portraitClaim(ff, 'R1', { arrive: !instant }); furnitureClaim(ff, 'F:vanity', 'vanityTable', -8.6, -2.4, Math.PI / 2, { arrive: !instant }); } });
    at(291.87, (ff) => { ten().reset(1.6, -4.4, Math.PI); ff.boss.root.visible = true; ff.boss.intangible = false; ten().own(t('221.1')); ff.boss.faceNow(0, -5.8); });
    let lullaby = null;
    // (its ring starts just inside the section line, not a beat before it, so a rewind to the line still draws it)
    at(Math.max(291.9, t('220.1')), (ff) => { ff.boss.perform('Interact', { duration: 0.9 }); lullaby = ff.tele.add({ shape: 'ring', x: 0, z: -4.4, w: 2.0, param: 0.5, kind: 'pink', start: ff.t, end: t('220.3') }); ff.cue('pink', { x: 0 }); });
    // (in the moonlit bedroom the petals are a touch smaller: their glow blooms twice as wide in the dark)
    at('220.3', (ff) => { const ok = standing(lullaby); lullaby = null; if (!ok) return; petalRing(ff, { x: 0, z: -4.4, n: 16, gaps: false, speed: 3.0, curve: 0, rot: 0, size: 0.4 }); snd('rf-musicbox', { x: 0 }); });
    at('221.4', (ff) => { ten().face('tenantSleep', 6); ff.boss.bow(1.0); });
    at('223.2', (ff) => { const b = ff.boss; const g = ff.tele.add({ shape: 'ring', x: b.x, z: b.z, w: 3.0, param: 0.6, kind: 'pink', start: ff.t, end: t('223.4') }); ff.cue('pink', b); ff.at(t('223.4'), (f2) => { if (!standing(g)) return; petalRing(f2, { x: b.x, z: b.z, n: 16, gaps: true, speed: 3.5, curve: 0, rot: Math.atan2(f2.player.x - b.x, f2.player.z - b.z) + Math.PI / 2, size: 0.4 }); snd('rf-musicbox', { x: b.x, rate: 1.06 }); }); });
    at('224.1', (ff) => { portraitVolley(ff, ten().portraits()); });
    // THE LAST CLAIM: on the bell she lies down on your bed and the glaze sweeps over it
    at('225.3', (ff) => { ten().own(t('228.1')); ten().stroll(0.0, -4.3, t('225.4')); });
    at('225.4', (ff) => lastClaim(ff));
    at('228.1', (ff) => { const b = ff.boss; if (ten().mode === 'lounge') { ten().gen++; ten().mode = 'script'; b.root.position.y = 0; b.place(0.2, -4.2, 0); b.perform('LayToIdle', { duration: 0.7, from: 0.5, to: 1.0 }); } ten().own(t('229.1')); ff.at(ff.t + 0.15, () => ten().kiss(1)); });
    at('228.3', (ff) => { ten().stroll(2.6, -5.0, t('229.1')); });
    // THE FINISH: a gold ring round her (yours: the only gold telegraph), the song's last hit
    at('229.1', (ff) => { const b = ff.boss; b.place(2.6, -5.0, Math.atan2(ff.player.x - 2.6, ff.player.z + 5.0)); ff.tele.add({ shape: 'ring', x: b.x, z: b.z, w: 2.2, param: 0.5, kind: 'gold', start: ff.t, end: 304.81 }); snd('rf-gold', { x: b.x }); ten().face(ten().wrecked ? 'tenantEvicted' : 'tenantHome'); });
    // she steps into a door after each lunge (the hall)
    at('67.3', (ff) => { if (secAt(ff.t).name === 'knock') { ff.boss.root.visible = false; ff.boss.intangible = true; } });
    at('69.3', (ff) => { ff.boss.root.visible = false; ff.boss.intangible = true; });
  },

  onStart(f) { setStateAt(f, 0); },
  onSection(f, sec, prev) {
    // the live snapshot of what's broken at this line (a rewind puts the room back as it stood here)
    const room = roomAt(sec.t0 + 0.01), snap = S.claims.snapshot();
    for (const c of S.claims.list) if (c.room !== room) delete snap[c.id];
    S.snaps[sec.name] = snap;
  },
  onRewind(f, t) { setStateAt(f, t); },
  onEncore(f) { S.encore = true; },
  // the notches: the pearls burst off her neck; the back of her set shears off (her head is hollow, and lit);
  // her right hand snaps off at the wrist and the coupe falls and shatters
  onBreak(f, i) {
    const b = f.boss, fig = S.ten.fig;
    S.ten.face('tenantEvicted', 4);
    if (i === 0) { const p = fig.bones.neck_01 ? fig.bones.neck_01.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(b.x, 1.75, b.z); S.pearls.burst(p, 45); snd('rf-crackle', { x: b.x, rate: 1.6, gain: 1.2 }); S.ten.upper('Interact', { duration: 0.6, from: 0.25, to: 0.6 }); }
    if (i === 1) { if (S.hollow) S.hollow.visible = true; snd('rf-crack', { x: b.x, rate: 0.7, must: true }); }
    if (i === 2) { fig.breakPiece('coupe'); const p = fig.bones.hand_r ? fig.bones.hand_r.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(b.x, 1.2, b.z); f.fx.emit(26, { x: p.x, y: p.y, z: p.z, color: new THREE.Color(3.2, 0.7, 1.8), shape: 0, speed: 2.5, life: 0.7, size: 0.12, gravity: 9, up: 0.4 }); snd('rf-tink', { x: b.x, rate: 1.8, gain: 1.2 }); f.at(f.t + 0.5, () => snd('rf-burst', { x: b.x, rate: 1.3, gain: 0.7 })); }
  },
  onEmpty(f) { wreck(f, true); S.ten.face('tenantEvicted'); },
  // her end: THE EVICTION (death.js). It begins: whatever she was in the middle of stops here
  death,
  onDeathScene(f, X) { sceneBegin(f, X); },
  onFinish(f) {
    S.ten.paintAnim = null; S.ten.painted.visible = false;
    // (her death scene ends her its own way: the front door, her face on the mat)
    if (f.exec && f.exec.on) { sceneFinish(f); return; }
    S.finishT = 0; S.keyDropped = false; S.bulbPopped = false; S.faceFly = null;
    S.finishAt = { x: f.boss.x, z: f.boss.z };
  },

  update(f, dt) {
    const t = f.t, b = f.boss, pl = f.player;
    if (S.warm && ++S.warmFrames > 3) { f.scene.remove(S.warm); S.warm = null; }
    // a jump back in time (a rewind, an encore) or a practice start: the set at that moment
    if (S.lastT === undefined || t < S.lastT - 0.25) setStateAt(f, t);
    S.lastT = t;
    const room = roomAt(t);
    if (S.room !== room) {
      // the room flies: her unbroken things go up with the old walls
      for (const c of [...S.claims.list]) if (c.room && c.room !== room) { c.dormant = true; const o = c.obj, id = c.id; tween(t, t + 0.5, (k) => { o.position.y = 11 * k * k; }, 'lin', () => { if (S.claims.get(id) === c) S.claims.remove(id); }); }
      for (const o of [...S.loose]) if (o.userData.room && o.userData.room !== room) { f.scene.remove(o); S.loose.splice(S.loose.indexOf(o), 1); }
      S.room = room;
    }
    for (let i = S.tweens.length - 1; i >= 0; i--) {
      const w = S.tweens[i];
      if (t < w.t0) continue;
      const k = Math.min(1, (t - w.t0) / Math.max(1e-3, w.t1 - w.t0));
      w.fn(w.e(k));
      if (k >= 1) { S.tweens.splice(i, 1); w.done && w.done(); }
    }
    updateGhosts(f, dt);
    updateBalloons(f);
    updateHazards(f, dt);
    updateRibbon(f, dt);
    for (let i = S.follow.length - 1; i >= 0; i--) { const F = S.follow[i]; if (t >= F.until || !F.c.alive) { S.follow.splice(i, 1); continue; } const p = F.get(); const o = F.c.obj.position; o.x += (p.x - o.x) * Math.min(1, dt * 7); o.z += (p.z - o.z) * Math.min(1, dt * 7); }
    S.claims.update(dt);
    S.ten.update(dt);
    S.pearls.update(dt);
    sceneUpdate(f, dt);
    // off your bed (a blow knocked her from it): her feet are on the floor, not 0.62 m over it
    if (S.ten.mode === 'lounge' && S.ten.seat && S.ten.seat.id === 'BED' && !b.scene && Math.hypot(b.x - 0.2, b.z + 5.4) > 0.45) { S.ten.gen++; S.ten.mode = 'script'; S.ten.until = t + f.beat; S.ten.seat.occupant = null; S.ten.seat = null; b.root.position.y = 0; b.lockFacing = false; b.busyUntil = 0; }
    else if (S.ten.mode !== 'lounge' && !b.scene && t >= 299.4 && b.root.position.y > 0.01 && !(b.move && b.move.arc)) b.root.position.y = 0;
    // the taunt: she walks after you, laughing
    if (S.chase && t < S.chase.until && b.root.visible && S.ten.mode === 'script') {
      const dx = pl.x - b.x, dz = pl.z - b.z, d = Math.hypot(dx, dz);
      if (d > 1.7) { const s = Math.min(d - 1.7, S.chase.speed * dt); const p = f.arena.resolve(b.x + dx / d * s, b.z + dz / d * s, 0.6); b.x = p.x; b.z = p.z; }
      b.faceTarget = pl;
    }
    // never alone: she glides at your side, two metres off, matching your speed
    if (S.glide && t < S.glide.until && b.root.visible && S.ten.mode !== 'evicted') {
      let tx = pl.x - 2.0, tz = pl.z + 0.2; if (tx < -10.2) tx = pl.x + 2.0;
      const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz), s = Math.min(d, 7.6 * dt);
      if (d > 0.01) { const p = f.arena.resolve(b.x + dx / d * s, b.z + dz / d * s, 0.5); b.x = p.x; b.z = p.z; }
      b.move = null; b.root.position.y = 0.03; b.faceTarget = pl;
    } else if (S.glide && t >= S.glide.until) { S.glide = null; b.root.position.y = 0; }
    // her busts turn to follow you
    for (const c of S.claims.list) if (c.kind === 'bust' && c.alive && !c.dormant) { const want = Math.atan2(pl.x - c.x, pl.z - c.z); c.obj.rotation.y += Math.atan2(Math.sin(want - c.obj.rotation.y), Math.cos(want - c.obj.rotation.y)) * Math.min(1, dt * 3); }
    // the camera comes in for the bridges and the sickest part
    S.closeS += (closeAt(t) - S.closeS) * Math.min(1, dt * 1.8);
    f.cam.closeK = S.closeS;
    // confetti in the grand ballroom
    if (t >= 217.9 && t < 250.7 && f.state === 'play') { const cols = [new THREE.Color(2.4, 1.0, 3.0), new THREE.Color(3.0, 2.0, 0.6), new THREE.Color(3.0, 1.2, 2.0)]; f.fx.emit(2, { x: (Math.random() - 0.5) * 20, y: 6.5, z: (Math.random() - 0.5) * 12, color: cols[(Math.random() * 3) | 0], shape: 4, speed: 0.4, life: 3.2, size: 0.08, gravity: 1.6, up: 0, jitter: 0.5, drag: 0.6 }); }
    // petals through the moonbeam at the end
    if (t >= 292.5 && f.state === 'play' && S.house.current && S.house.current.name === 'bedroom' && Math.random() < 0.4) f.fx.emit(1, { x: 4 + Math.random() * 4, y: 5.5, z: -6 + Math.random() * 5, color: new THREE.Color(1.6, 1.1, 1.7), shape: 4, speed: 0.3, life: 4, size: 0.07, gravity: 1.0, up: 0, jitter: 0.6, drag: 0.4 });
    if (S.hollow) S.hollow.visible = b.broken >= 2 && b.root.visible;
    // she downs the cocktail and throws the glass; a fresh one appears in her hand at the next section line
    { const cp = S.ten.fig.acc.find((a) => a.name === 'coupe'); if (cp && !cp.broken) { const v = !(t >= 60.1 && t < 61.13); for (const o of cp.objects) if (o.visible !== v) { o.visible = v; if (v && t > 61) snd('rf-tink', { x: b.x, gain: 0.5, rate: 1.4 }); } } }
    // she laughs whenever she lands one on you
    if (S.hearts !== undefined && pl.hearts < S.hearts && pl.state !== 'dead' && b.root.visible) S.ten.face('tenantHaha', 3);
    S.hearts = pl.hearts;
    // after the finish: the spare key drops out of the glitter at your feet, with one small ring
    if (S.finishT !== undefined) {
      S.finishT += dt;
      // a shard strikes your bedside lamp and the bulb pops: the room drops to moonlight
      if (S.finishT > 0.14 && !S.bulbPopped) { S.bulbPopped = true; S.house.lampOut = true; f.fx.sparks(1.8, 0.98, -6.5, new THREE.Color(3.2, 2.4, 1.3), 12); f.fx.glitter(1.8, 0.98, -6.5, new THREE.Color(2.4, 2.0, 1.4), 6, 0.25); snd('rf-tink', { x: 1.8, rate: 2.3, gain: 0.55 }); }
      // her face comes down last, face up on your pillow, still smiling
      if (S.finishT > 0.3 && !S.faceFly) {
        const m = faceShard(), p0 = S.finishAt || { x: b.x, z: b.z };
        f.scene.add(m); addLoose(m);
        const glazed = S.claims.alive('BED');   // (her glaze over your bed sits a little higher)
        S.faceFly = { m, x0: p0.x, z0: p0.z, x1: -0.5, y1: glazed ? 0.77 : 0.72, z1: -6.62, t0: S.finishT, dur: 0.75, landed: false };
      }
      if (S.faceFly && !S.faceFly.landed) {
        const F = S.faceFly, k = Math.min(1, (S.finishT - F.t0) / F.dur), e = 1 - Math.pow(1 - k, 2);
        F.m.position.set(F.x0 + (F.x1 - F.x0) * e, 1.7 + (F.y1 - 1.7) * k + 1.3 * k * (1 - k), F.z0 + (F.z1 - F.z0) * e);
        F.m.rotation.set((1 - k) * 7.5, (1 - k) * 2.0, (1 - k) * 3.0);
        if (k >= 1) { F.landed = true; F.m.rotation.set(0, 0.35, 0); snd('rf-tink', { x: F.x1, rate: 1.25, gain: 0.45 }); f.fx.glitter(F.x1, 0.9, F.z1, new THREE.Color(3.0, 2.2, 0.8), 6, 0.2); }
      }
      // (her copy of the key: the fight's own keepsake now, dropped as her bar empties; this one only if that didn't)
      if (S.finishT > 0.8 && !S.keyDropped && (f.ks || f.kept)) S.keyDropped = true;
      if (S.finishT > 0.8 && !S.keyDropped) {
        S.keyDropped = true;
        const k = spareKey(); k.position.set(pl.x + 0.6, 1.4, pl.z + 0.3); f.scene.add(k); addLoose(k);
        S.keyFall = { m: k, v: 0 };
      }
      if (S.keyFall) { const K = S.keyFall; K.v -= 9 * dt; K.m.position.y = Math.max(0.03, K.m.position.y + K.v * dt); K.m.rotation.z += dt * 4 * (K.m.position.y > 0.04 ? 1 : 0); if (K.m.position.y <= 0.031 && !K.rang) { K.rang = true; snd('rf-key', { x: K.m.position.x, must: true }); f.fx.glitter(K.m.position.x, 0.2, K.m.position.z, new THREE.Color(3.4, 2.4, 0.8), 14, 0.3); } }
    }
  },
};

// ---------------------------------------------------------------------------------------------- her attacks with their own parts
// a volley from all her standing portraits at once: one arrives on you, the rest in a row beside you
function portraitVolley(f, list) {
  const pl = f.player;
  const ps = list.filter((c) => c && c.alive && !c.dormant).sort((a, b) => Math.hypot(a.x - pl.x, a.z - pl.z) - Math.hypot(b.x - pl.x, b.z - pl.z));
  if (!ps.length) return;
  const ax = pl.x - ps[0].x, az = pl.z - ps[0].z, l = Math.hypot(ax, az) || 1, px = -az / l, pz = ax / l;
  const off = [0, 1.7, -1.7, 3.4, -3.4, 5.1];
  ps.forEach((c, i) => portraitKiss(f, c, { to: { x: clampX(f, pl.x + px * off[i % 6]), z: clampZ(f, pl.z + pz * off[i % 6]) }, quiet: i > 0 }));
}
function portraitKiss(f, c, { end = null, to = null, quiet = false } = {}) {
  if (!c || !c.alive || c.dormant) return;
  const [x, z, side] = SOCK[c.data.sock];
  const from = side === 'back' ? { x, z: z + 0.3 } : side === 'left' ? { x: x + 0.3, z } : { x: x - 0.3, z };
  if (c.data.mat) { c.data.mat.emissiveIntensity = 0.6; f.at(f.t + 0.25, () => { if (c.data.mat) c.data.mat.emissiveIntensity = 0.06; }); }
  f.pat.lob(f, { from, fromY: PH + 0.2, at: to || { x: clampX(f, f.player.x), z: clampZ(f, f.player.z) }, end: end ?? f.t + 2 * f.beat, r: 0.9, shape: 'kiss', size: 0.38, back: 22, peak: 1.0, silentCue: quiet });
  if (!quiet) snd('rf-mwah', { x, gain: 0.6, rate: 1.25 });
}
// the long gilt key on lilac ribbon: her keepsake
function spareKey() {
  const g = new THREE.Group(), gold = new THREE.MeshPhysicalMaterial({ color: '#e9b949', metalness: 1, roughness: 0.2 });
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), gold); g.add(bow);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.26, 0.016), gold); sh.position.y = -0.18; g.add(sh);
  for (const y of [-0.27, -0.23]) { const tth = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.05), gold); tth.position.set(0, y, 0.03); g.add(tth); }
  const enamel = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshPhysicalMaterial({ color: '#c0102a', roughness: 0.2, clearcoat: 1 })); enamel.position.z = 0.013; g.add(enamel);
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.004), new THREE.MeshPhysicalMaterial({ color: '#c86aff', roughness: 0.35, sheen: 1, sheenColor: new THREE.Color('#ffd6ff') })); rib.position.set(0.03, 0.12, 0); rib.rotation.z = -0.4; g.add(rib);
  g.rotation.x = -Math.PI / 2; g.scale.setScalar(1.6);
  return g;
}
// the last piece of her: a curve of her porcelain face, eyes painted shut, her red mouth (lands face up; life-size
// and a little more, so it reads on your pillow from the high camera)
function faceShard() {
  const g = new THREE.Group(), a = 0.15, b = 0.0675, c = 0.19, th = Math.PI * 0.42, y0 = -b * Math.cos(th);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, th), new THREE.MeshPhysicalMaterial({ color: '#f7dcd6', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 }));
  shell.scale.set(a, b, c); shell.position.y = y0; g.add(shell);
  // a point on its surface (the features sit just on it)
  const on = (x, z) => b * Math.sqrt(Math.max(0, 1 - (x / a) ** 2 - (z / c) ** 2)) + y0 + 0.002;
  const lash = new THREE.MeshBasicMaterial({ color: '#0b0706' });
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0055, 4, 12, Math.PI), lash); l.rotation.x = -Math.PI / 2; l.rotation.z = Math.PI; l.position.set(s * 0.055, on(s * 0.055, -0.045) + 0.003, -0.045); g.add(l); }
  // her cherry-red smile (flat colour: it has to read in the moonlight)
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.009, 5, 14, Math.PI), new THREE.MeshBasicMaterial({ color: '#c0102a' }));
  mouth.rotation.x = -Math.PI / 2; mouth.rotation.z = Math.PI; mouth.scale.set(1, 0.7, 1); mouth.position.set(0, on(0, 0.07) + 0.004, 0.06); g.add(mouth);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// pearls bursting off her neck, bouncing and rolling across the floor
class PearlPool {
  constructor(scene) {
    this.scene = scene; this.n = 60;
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: '#fff6ee', roughness: 0.15, clearcoat: 1, iridescence: 0.8, sheen: 0.4 }), this.n);
    this.mesh.count = 0; this.mesh.frustumCulled = false; scene.add(this.mesh); this.list = []; this._m = new THREE.Matrix4();
  }
  burst(p, n) { for (let i = 0; i < n && this.list.length < this.n; i++) { const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3; this.list.push({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * s, vy: 1 + Math.random() * 3, vz: Math.sin(a) * s, age: 0, life: 2.4 + Math.random() }); } }
  update(dt) {
    let k = 0;
    for (let i = this.list.length - 1; i >= 0; i--) { const q = this.list[i]; q.age += dt; if (q.age > q.life) { this.list.splice(i, 1); continue; } q.vy -= 16 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; if (q.y < 0.04) { q.y = 0.04; q.vy = Math.abs(q.vy) * 0.45; q.vx *= 0.82; q.vz *= 0.82; } }
    for (const q of this.list) { const s = 0.04 * Math.min(1, (q.life - q.age) / 0.4); this._m.makeScale(s, s, s).setPosition(q.x, q.y, q.z); this.mesh.setMatrixAt(k++, this._m); }
    this.mesh.count = k; this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() { this.list.length = 0; this.mesh.count = 0; }
  dispose() { this.scene.remove(this.mesh); }
}

// the ghosts that wear your skin: sheets moulded round your silhouette, drifting after you (pink: catch one)
const GHOST_GEO = (() => { const g = new THREE.LatheGeometry([[0, 1.75], [0.16, 1.7], [0.2, 1.55], [0.15, 1.38], [0.24, 1.25], [0.32, 0.9], [0.4, 0.4], [0.48, 0.04], [0.5, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 18); g.computeVertexNormals(); return g; })();
function spawnGhost(f, x, z, until) {
  const p = f.proj.spawn({ x, z, y: 1.1, angle: Math.atan2(f.player.x - x, f.player.z - z), speed: 2.2, kind: 'pink', shape: 'orb', size: 0.32, radius: 0.6, life: Math.max(0.5, until - f.t), homing: 1.2, target: () => f.player, damage: 1, tag: 'ghost' });
  if (!p) return;
  const m = new THREE.Mesh(GHOST_GEO, new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.9, transparent: true, opacity: 0.92, side: THREE.DoubleSide, emissive: new THREE.Color('#ff7ad0'), emissiveIntensity: 0.12 }));
  m.position.set(x, 0, z); m.castShadow = true; f.scene.add(m);
  S.ghosts.push({ p, mesh: m, caught: false });
}
function updateGhosts(f, dt) {
  for (let i = S.ghosts.length - 1; i >= 0; i--) {
    const g = S.ghosts[i], p = g.p;
    const live = !p.dead && f.proj.list.includes(p);
    if (p.owner !== 'boss' && !g.caught) { g.caught = true; g.mesh.material.emissive.set('#ffb030'); g.mesh.material.emissiveIntensity = 0.9; }
    if (!live) {
      if (g.caught && Math.hypot(p.x - f.boss.x, p.z - f.boss.z) < 2.2) {
        // wrapped in your sheet: blinded two beats
        const b = f.boss; if (b.state === 'perform' || b.state === 'open') { b.state = 'stagger'; b.st = 0; b.staggerFor = f.beat * 2; }
        S.ten.face('tenantEvicted', 2); snd('rf-thud', { x: b.x });
        f.fx.glitter(b.x, 1.6, b.z, new THREE.Color(3.2, 2.2, 0.6), 24, 1.0);
      } else f.fx.dust(p.x, p.z, 10, new THREE.Color(0.9, 0.88, 0.85));
      f.scene.remove(g.mesh); S.ghosts.splice(i, 1); continue;
    }
    g.mesh.position.set(p.x, Math.sin(f.t * 3 + i) * 0.08 + (g.caught ? 0.5 : 0), p.z);
    g.mesh.rotation.y = p.angle;
  }
}

// ---------------------------------------------------------------------------------------------- the attack kit
const TAU = Math.PI * 2;
// materials her effects make on the fly: one of each is drawn in the warm-up, so none is built mid-fight
// (the flat ones draw in one pass: planes and floor ribbons don't need three's back-then-front pass)
const FXM = {
  hole: () => new THREE.MeshBasicMaterial({ color: '#0a0406' }),
  pencil: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 1.0, 1.4), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, forceSinglePass: true }),
  carveLine: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.8), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }),
  carveCut: () => new THREE.MeshBasicMaterial({ color: '#2a0408', transparent: true, opacity: 0.88, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }),
  carveGroove: () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.05, 0.14), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true }),
};
// a flat strip with positions only (the layout of the ribbons and threads)
function flatGeo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.2, 0, 0, 0, 0, 0.2, 0.2, 0, 0.2]), 3)); g.setIndex([0, 1, 2, 1, 3, 2]); return g; }
// a zone: a telegraph that fills from start to end and lands at end; it can aim (follow) until `lock`
// o: { shape, x, z, angle, w, h, param, kind, start, end, lock, aim: () => ({x, z, angle?}), damage, melee, onImpact, silent, sound, hold }
function zone(f, o) {
  o = blockable(o, 'pink');
  const sh = { shape: o.shape, x: o.x ?? f.player.x, z: o.z ?? f.player.z, angle: o.angle || 0, w: o.w, h: o.h ?? o.w, param: o.param ?? 0.5 };
  if (o.aim) Object.assign(sh, o.aim());
  const lock = o.lock ?? o.end;
  // ENCORE (the post-finale toggle): the same impact on the same beat, less warning, as the shared areas
  const s0 = o.start ?? f.t, start = f.encoreMode ? o.end - (o.end - s0) * 0.72 : s0;
  const g = f.tele.add({ ...sh, kind: o.kind, start, end: o.end, linger: o.linger, follow: o.aim ? () => { if (f.t < lock) Object.assign(sh, o.aim()); return sh; } : null });
  // shapes that stack on each other (a bouquet's balloons) are drawn dimmer so the pile never blooms into a white-out
  if (o.dim && !g.dead) g.color.multiplyScalar(o.dim);
  if (o.hold && !g.dead) S.holds.push({ g, a: o.hold[0], b: o.hold[1], s0: g.start, e0: g.end });
  if (!o.silent) f.cue(o.kind, sh);
  f.at(o.end, () => {
    // nothing lands that you can't see: a shape the spotlight cleared (or kept from being drawn) fizzles. The room
    // still does its part (the furniture comes down, she comes up through the boards); nobody is hurt, no impact sound
    const gone = !!g.dead;
    const hit = o.damage === 0 || gone ? 'miss' : f.resolveArea(sh, o);
    o.onImpact && o.onImpact(gone ? 'fizzle' : hit, sh);
    if (o.sound !== false && !gone) f.sfx.impactArea && f.sfx.impactArea(o.kind, f.pan(sh.x), hit);
  });
  return { sh, g };
}
// a telegraph that has to be standing for its release to happen (a ring she twirls in, a lane): false once the
// spotlight or a rewind has cleared it, or if it was never drawn (she was in a frame at the fill)
const standing = (g) => !!(g && !g.dead);
// will this strike land on her (the player's own test, run just after the arena's)
function strikeReachesHer(f, x, z, ang, range, arc) {
  const b = f.boss; if (!b || !b.targetable) return false;
  const dx = b.x - x, dz = b.z - z, d = Math.hypot(dx, dz);
  if (d > range + b.radius) return false;
  const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
  return Math.abs(da) <= arc || d <= b.radius + 0.4;
}
// is one of her scripted attacks live: a shape on the floor (not a bot hint, not `own`), a shock-ring travelling, a
// hazard still hot? Her reflexes (the backhand, the frame-walk) yield to it.
function scriptLive(f, own = null) {
  const t = f.t;
  for (const g of f.tele.list) if (g !== own && !g.dead && !g.hint && g.kind !== 'gold' && t >= g.start - 0.02 && t <= g.end + 0.1) return true;
  if (f.waves.length) return true;
  for (const h of S.hazards) if (h.test && !h.dead && t < h.until && (!h.hot || h.hot(t))) return true;
  return false;
}
// is a scripted event (not a set change) due within w seconds?
function scriptAhead(f, t, w) {
  const T = f.T; if (!T) return false;
  for (let i = T.cursor; i < T.events.length; i++) { const e = T.events[i]; if (e.t > t + w) return false; if (e.label !== 'set') return true; }
  return false;
}
// a hint for the test bot: a telegraph that's never drawn but sits in the list (the bot reads the list; Alex reads
// the real thing: the shock-ring, the mold, the groove)
function hint(f, sh) { const g = f.tele.add({ ...sh, kind: 'white', start: f.t + 1e6, end: f.t + 0.4 }); g.hint = true; return g; }
// a floor hazard: hurts while you stand in it (a dash over it is safe); test(x, z) -> bool
function hazard(o) { S.hazards.push(o); return o; }
function updateHazards(f, dt) {
  const pl = f.player, t = f.t;
  for (let i = S.hazards.length - 1; i >= 0; i--) {
    const h = S.hazards[i];
    if (t >= h.until || h.dead) { for (const g of h.hints || []) g.dead = true; h.done && h.done(); S.hazards.splice(i, 1); continue; }
    h.update && h.update(t, dt);
    for (const g of h.hints || []) { if (g.dead) continue; g.end = t + (g.lead ?? 0.4); g.start = t + 1e6; if (!f.tele.list.includes(g)) f.tele.list.push(g); }
    if (f.suppress || pl.invulnerable || pl.state === 'dead' || !h.test) continue;
    if (h.test(pl.x, pl.z)) { const r = f.resolveArea({ shape: 'circle', x: pl.x, z: pl.z, w: 0.1 }, { kind: 'white', damage: h.dmg ?? 1 }); if (r === 'hit') h.onHit && h.onHit(); }
  }
  // telegraphs that hold their breath (the hesitation): the fill reaches 85% on the breath and holds, pulsing
  for (let i = S.holds.length - 1; i >= 0; i--) {
    const H = S.holds[i], g = H.g;
    const D0 = Math.max(0.05, (H.a - H.s0) / 0.85);
    if (t >= H.b) { g.start = H.b - D0; g.end = H.b; g.color.setRGB(1.25, 1.55, 1.9); S.holds.splice(i, 1); continue; }
    if (t < H.a) { g.start = H.s0; g.end = H.s0 + D0; }
    else { g.end = t + 0.15 * D0; g.start = g.end - D0; g.color.setRGB(1.25 + 0.6 * Math.sin(t * 30), 1.55, 1.9); }
  }
}
// a white shock-ring off her heel (or your clock): expanding from r0; hug the centre or dash through it
function shockRing(f, x, z, { r0 = 1.6, speed = 9, band = 0.7, max = 15, damage = 1 } = {}) {
  if (f.suppress) return;
  const w = { x, z, r: r0, speed, band, max, kind: 'white', hit: false, damage };
  f.addWave(w);
  const g = hint(f, { shape: 'ring', x, z, w: r0, param: band }); g.lead = 0.05;
  hazard({ until: f.t + (max - r0) / speed + 0.1, hints: [g], update: () => { g.w = w.r + 0.15; g.param = w.band + 0.3; } });
  f.sfx.wave && f.sfx.wave(f.pan(x));
}
// a ring of petals (hearts) leaving a point: pink, catchable; gaps 180 degrees apart if asked
function petalRing(f, o) {
  if (f.suppress) return;
  const n = o.n, slots = o.gaps ? n + 2 : n, base = o.rot ?? 0;
  for (let i = 0; i < slots; i++) {
    if (o.gaps && (i === 0 || i === slots / 2)) continue;
    const a = base + i / slots * TAU;
    f.proj.spawn({ x: o.x + Math.sin(a) * 1.1, z: o.z + Math.cos(a) * 1.1, y: 1.0, angle: a, speed: o.speed, kind: 'pink', shape: o.shape || 'petal', size: o.size ?? 0.5, radius: 0.42, curve: o.curve ?? 0.436, life: 4.5, spin: 2, damage: 1 });
  }
}
const beatBefore = (f, pos, n) => ({ s: f.bm.timeOf(f.bm.beatAt(f.bm.t(pos)) - n) });

// ---------------------------------------------------------------------------------------------- her sets
function arriveWall(c, t0) { c.dormant = true; c.data.up && (c.data.up.position.y = 11); tween(t0 + 0.1, t0 + 0.62, (k) => { if (c.data.up) c.data.up.position.y = 11 * (1 - k); }, 'out', () => { c.dormant = false; wires(c, false); }); }
function arriveFloor(c, t0, d = 0.62) { c.dormant = true; c.obj.scale.y = 0.001; tween(t0 + d, t0 + d + 0.32, (k) => { c.obj.scale.y = Math.max(0.001, 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2)); }, 'lin', () => { c.obj.scale.y = 1; c.dormant = false; }); }
function ballroomSet(f, instant, which) {
  if (S.claims.get('P:L1')) return;
  for (const s of ['L1', 'L2', 'R1', 'R2']) { const c = portraitClaim(f, s); wires(c, false); if (!instant) arriveWall(c, f.t); }
  const F = which === 'c1' ? [['F:chaise', 'chaise', -7.2, -4.6, 0.2], ['F:piano', 'piano', 0, -5.3, 0], ['F:wardrobe', 'wardrobe', 7.6, -5.0, -0.2]]
    : [['F:chaise', 'chaise', 7.0, -4.4, -0.2], ['F:piano', 'piano', -7.0, -5.0, 0.15], ['F:wardrobe', 'wardrobe', 0, -5.5, 0]];
  for (const [id, kind, x, z, rot] of F) { const c = furnitureClaim(f, id, kind, x, z, rot, { data: kind === 'chaise' ? { sit: { x, z: z + 0.1, face: rot } } : {} }); if (!instant) arriveFloor(c, f.t); }
}
function grandSet(f, instant) {
  if (S.claims.get('G:armchair')) return;
  for (const s of ['W1', 'W2', 'L1', 'L2', 'R1', 'R2']) { const c = portraitClaim(f, s); wires(c, false); if (!instant) arriveWall(c, f.t); }
  for (const [id, kind, x, z, rot] of [['F:chaise', 'chaise', -7.5, -3.8, 0.3], ['F:piano', 'piano', 7.5, -4.6, -0.2], ['F:wardrobe', 'wardrobe', -3.0, -5.6, 0], ['G:armchair', 'armchair', 3.0, -5.6, 0.0], ['B:L', 'bust', -4.5, -2.8, 0], ['B:R', 'bust', 4.5, -2.8, 0]]) {
    const c = furnitureClaim(f, id, kind, x, z, rot, { data: kind === 'chaise' || kind === 'armchair' ? { sit: { x, z: z + 0.15, face: rot } } : {} });
    if (!instant) arriveFloor(c, f.t);
  }
}
function bouquetClaim(f, id, x, z, arrive) {
  const g = P.bouquet();
  const c = S.claims.add({ id, kind: 'bouquet', obj: g, x, z, y: 0.4, r: 0.35, hits: 3, value: 4, solid: true, data: {} });
  if (arrive) arriveFloor(c, f.t);
  return c;
}
function keyRackClaim(f, id, x, swing) {
  const g = new THREE.Group(); const up = new THREE.Group(); g.add(up);
  // (under your hook rails at 1.95 m: low enough that the high camera keeps them in the picture)
  const rack = P.keyRack(); rack.position.set(0, 1.8, -0.45); up.add(rack);
  const c = S.claims.add({ id, kind: 'rack', obj: g, x, z: -6.5, y: 1.6, box: { hw: 1.25, hd: 0.5, rot: 0 }, hits: 4, value: 5, wall: true, data: { up, rx: x } });
  if (swing) { c.dormant = true; rack.rotation.x = -1.4; rack.position.y = 3.6; tween(f.t, f.t + 0.3, (k) => { rack.rotation.x = -1.4 * (1 - k) + Math.sin(k * 9) * 0.12 * (1 - k); rack.position.y = 3.6 - 1.8 * k; }, 'out', () => { c.dormant = false; rack.rotation.x = 0; rack.position.y = 1.8; }); }
  return c;
}

// ---------------------------------------------------------------------------------------------- chorus 1
function shove(f, end) {
  const b = f.boss, bt = f.beat;
  if (S.ten.mode === 'frame' || !b.root.visible) return;
  S.ten.own(end + 2 * bt);
  let ang = Math.atan2(f.player.x - b.x, f.player.z - b.z);
  const { sh } = zone(f, { shape: 'rect', w: 0.8, h: 6, kind: 'white', start: f.t, end, lock: end - 2 * bt, aim: () => ({ x: b.x, z: b.z, angle: (ang = Math.atan2(f.player.x - b.x, f.player.z - b.z)) }), damage: 1, melee: true,
    onImpact: () => { b.state === 'perform' && b.open(2 * bt); } });
  f.at(end - bt, () => { b.faceNow(b.x + Math.sin(sh.angle), b.z + Math.cos(sh.angle)); b.lockFacing = true; b.perform('Shield_Dash', { duration: bt * 1.2 }); const ex = clampX(f, b.x + Math.sin(sh.angle) * 6), ez = clampZ(f, b.z + Math.cos(sh.angle) * 6); b.moveTo(ex, ez, bt, { easing: 'in', now: f.t }); snd('rf-swish', { x: b.x, gain: 1.2, rate: 0.8 }); });
  f.at(end + 0.05, () => { b.lockFacing = false; snd('rf-thud', { x: b.x }); });
}
function furnitureDrops(f, ids, shadowBeats) {
  const live = ids.map((id) => S.claims.get(id)).filter((c) => c && c.alive);
  if (!live.length) return;
  S.ten.own(f.t + 4.2); S.ten.hold('Spell_Simple_Idle_Loop', f.t + 4.0); S.ten.face('tenantMine', 6);
  snd('rf-creak', { x: 0, gain: 0.8 });
  // all of it lifts on wires, wobbling: hung low enough (3.4 m) that the high camera keeps it in the picture over its
  // shadow even when you're close to her (at six metres it was above the top of the frame)
  const HANG = 3.4;
  for (const c of live) {
    c.dormant = true; const o = c.obj, x0 = c.x;
    const wm = mats().gold, ws = [];
    for (const s of [-0.45, 0.45]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 12, 4), wm); w.position.set(s, 7.2, 0); w.name = 'wire'; o.add(w); ws.push(w); }
    c.data.dropWires = ws;
    tween(f.t, f.t + 0.6, (k) => { o.position.y = HANG * k; o.rotation.z = Math.sin(f.t * 5 + x0) * 0.05; }, 'out');
  }
  live.forEach((c, i) => {
    const t0 = f.bm.t(D(shadowBeats[i])), bt = f.beat;
    const tLock = t0 + 2 * bt, tLand = t0 + 4 * bt;
    f.at(t0, (f2) => {
      let lx = f2.player.x, lz = f2.player.z;
      zone(f2, { shape: 'circle', w: 2.2, kind: 'white', start: f2.t, end: tLand, lock: tLock, aim: () => ({ x: (lx = clampX(f2, f2.player.x)), z: (lz = clampZ(f2, f2.player.z)) }), damage: 2,
        onImpact: (hit, sh) => { c.obj.position.y = 0; c.obj.rotation.z = 0; for (const w of c.data.dropWires || []) c.obj.remove(w); c.data.dropWires = null; S.claims.place(c, sh.x, sh.z); c.dormant = false; f2.cam.shake(0.25 * 4, 0.2); snd('rf-boom', { x: sh.x, must: true }); f2.fx.dust(sh.x, sh.z, 20, new THREE.Color(0.8, 0.7, 0.75)); } });
      snd('rf-wires', { x: lx, rate: 1.6 });
      // the piece hangs over its shadow, swaying, following it until it locks; then it falls on the beat
      S.follow.push({ c, until: tLand - 0.3, get: () => ({ x: lx, z: lz }) });
      tween(f2.t, tLand - 0.3, (k) => { c.obj.rotation.z = Math.sin(f2.t * 4.2 + i) * 0.06 * (1 - 0.6 * k); }, 'lin');
      f2.at(tLand - 0.3, () => { const o = c.obj; tween(f2.t, tLand, (k) => { o.position.y = HANG * (1 - k); }, 'in'); });
    });
  });
}
// she appears out of the floorboards (already inside); waist-deep for a bar: free hits
function burstUp(f, x, z) {
  const b = f.boss;
  S.ten.reset(x, z, Math.atan2(f.player.x - x, f.player.z - z));
  b.root.visible = true; b.intangible = false; b.root.position.y = -0.95;
  S.ten.mode = 'script'; S.ten.until = f.t + 4 * f.beat;
  S.ten.hold('Crouch_Idle_Loop', f.t + 2.2, 0.05); S.ten.face('tenantMine', 4);
  f.cam.shake(0.7, 0.2); snd('rf-bang', { x, gain: 0.9, rate: 1.2 });
  f.fx.chips(x, 0.3, z, new THREE.Color(0.5, 0.32, 0.2), 30); f.fx.dust(x, z, 16, new THREE.Color(0.6, 0.5, 0.45));
  // the hole she leaves in the boards
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16), FXM.hole()); hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.02, z); f.scene.add(hole); addLoose(hole);
}
function phone(on) { const a = S.ten.fig.acc.find((x) => x.name === 'phone'); if (a && !a.broken) for (const o of a.objects) o.visible = on; }
// behind the lattice she strolls left and right where you can't reach
function strollBehind(f, until) {
  const b = f.boss; let side = 1, t0 = f.t;
  while (t0 < until - 0.5) { const tt = t0, x = side * (4 + Math.random() * 4); f.at(tt, () => { if (S.ten.lattice) S.ten.stroll(x, -5.9, tt + 2.6); }); t0 += 2.65; side = -side; }
}
// a moving crate in a lane across the crawlspace: the lane fills two beats; it leaves its wall at 14 m/s
function crate(f, id, side, z, release) {
  const x0 = side < 0 ? -10.6 : 10.6, x1 = -x0 * 0.94;
  const g = f.tele.add({ shape: 'rect', x: x0, z, angle: side < 0 ? Math.PI / 2 : -Math.PI / 2, w: 0.5, h: 21.2, kind: 'white', start: f.t, end: release });
  f.cue('white', { x: x0 }); snd('rf-pencil', { x: x0, gain: 0.6, rate: 0.5 });
  const c = S.claims.add({ id, kind: 'crate', obj: P.crate(), x: x0, z, y: 0.45, box: { hw: 0.45, hd: 0.45, rot: 0 }, hits: 2, value: 2, solid: false, data: {} });
  c.obj.scale.setScalar(0.001); tween(f.t, f.t + 0.2, (k) => c.obj.scale.setScalar(0.001 + k), 'out');
  const dur = Math.abs(x1 - x0) / 14;
  f.at(release, (f2) => {
    const lane = f2.tele.add({ shape: 'rect', x: x0, z, angle: side < 0 ? Math.PI / 2 : -Math.PI / 2, w: 0.5, h: 21.2, kind: 'white', start: f2.t - 0.01, end: f2.t + dur });
    if (lane.color) lane.color.multiplyScalar(0.6);      // (during the spotlight there's no shape to dim)
    let hit = false;
    // the test bot reads the crate as a short lane just ahead of it (a person reads the crate)
    const dir = side < 0 ? 1 : -1, hn = hint(f2, { shape: 'rect', x: x0, z, angle: dir > 0 ? Math.PI / 2 : -Math.PI / 2, w: 0.9, h: 4.5 }); hn.lead = 0.15;
    const hz = hazard({ until: f2.t + dur, hints: [hn], update: () => { hn.x = c.x - dir * 0.9; hn.z = z; if (hit || !c.alive) hn.dead = true; },
      test: (px, pz) => { if (hit || !c.alive) return false; return Math.abs(px - c.x) < 0.45 + 0.4 && Math.abs(pz - c.z) < 0.45 + 0.4; }, onHit: () => { hit = true; } });
    tween(f2.t, f2.t + dur, (k) => { if (c.alive) S.claims.place(c, x0 + (x1 - x0) * k, z); }, 'lin', () => { lane.dead = true; if (c.alive) { c.solid = true; snd('rf-thud', { x: x1 }); } });
    snd('rf-swish', { x: x0, gain: 0.8, rate: 0.6 });
  });
}
// A HOUSE TO KEEP ME OUT: four white lines draw round you, rise into walls, and fall on the lock's pop
function drawnHouse(f, rise, fall) {
  const cx = Math.max(-8.4, Math.min(8.4, f.player.x)), cz = Math.max(-4.8, Math.min(4.8, f.player.z)), hw = 2.5, hd = 2.0;
  const edges = [[cx - hw, cz - hd, Math.PI / 2, 2 * hw], [cx - hw, cz + hd, Math.PI / 2, 2 * hw], [cx - hw, cz - hd, 0, 2 * hd], [cx + hw, cz - hd, 0, 2 * hd]];
  const walls = [];
  for (const [x, z, a, len] of edges) zone(f, { shape: 'rect', x, z, angle: a, w: 0.15, h: len, kind: 'white', start: f.t, end: rise, damage: 1, silent: true });
  snd('rf-pencil', { x: cx });
  S.drawn = { cx, cz, hw, hd };
  const m = FXM.pencil();
  f.at(rise, (f2) => {
    for (const [x, z, a, len] of edges) { const w = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.2), m); w.rotation.y = a === 0 ? Math.PI / 2 : 0; w.position.set(a === 0 ? x : x + len / 2, 0.6, a === 0 ? z + len / 2 : z); w.scale.y = 0.01; f2.scene.add(w); walls.push(w); addLoose(w); tween(f2.t, f2.t + 0.15, (k) => { w.scale.y = 0.01 + k; }, 'out'); }
    S.house.extraCols = [{ type: 'box', x: cx, z: cz - hd, hw: hw + 0.1, hd: 0.08 }, { type: 'box', x: cx, z: cz + hd, hw: hw + 0.1, hd: 0.08 }, { type: 'box', x: cx - hw, z: cz, hw: 0.08, hd: hd + 0.1 }, { type: 'box', x: cx + hw, z: cz, hw: 0.08, hd: hd + 0.1 }];
    snd('rf-swish', { x: cx, gain: 0.5, rate: 1.4 });
  });
  const clear = () => { S.house.extraCols = []; for (const w of walls) { const o = w; tween(f.t, f.t + 0.25, (k) => { o.rotation.x = -Math.PI / 2 * k; o.position.y = 0.6 * (1 - k) + 0.02; }, 'in'); } };
  f.at(fall, () => { clear(); S.drawn = null; });
  S.drawnClear = () => { S.house.extraCols = []; for (const w of walls) f.scene.remove(w); S.drawn = null; };
}

// ---------------------------------------------------------------------------------------------- the taunt
function forgetMeNot(f, i) {
  const b = f.boss; if (!b.root.visible || i >= 24) return;
  const id = 'FMN:' + i;
  if (S.claims.get(id)) return;
  const c = S.claims.add({ id, kind: 'flowers', obj: P.forgetMeNots(), x: b.x, z: b.z, y: 0.3, r: 0.4, hits: 1, value: 0.4, data: { i } });
  c.obj.scale.setScalar(0.01); tween(f.t, f.t + 0.15, (k) => c.obj.scale.setScalar(0.01 + k * 0.99), 'out');
  snd('rf-tink', { x: b.x, gain: 0.35, rate: 1.5 });
}
function flowersBurst(f, i0, i1, end) {
  for (let i = i0; i < i1; i++) {
    const c = S.claims.get('FMN:' + i); if (!c || !c.alive) continue;
    zone(f, { shape: 'circle', x: c.x, z: c.z, w: 1.2, kind: 'white', start: f.t, end, damage: 1, silent: i !== i0, sound: i === i0,
      onImpact: () => { if (c.alive) { c.noThread = true; S.claims.break(c); } } });
  }
}

// ---------------------------------------------------------------------------------------------- chorus 2
function tears(f, land) {
  const p = { x: f.player.x, z: f.player.z };
  for (const dx of [-2.4, 0, 2.4]) {
    const x = clampX(f, p.x + dx), z = clampZ(f, p.z);
    zone(f, { shape: 'circle', x, z, w: 0.9, kind: 'white', start: f.t, end: land, damage: 1, silent: dx !== 0 });
    f.proj.spawn({ x, z, y: 7, angle: 0, speed: 0, kind: 'white', shape: 'orb', size: 0.25, owner: 'deco', life: land - f.t + 0.02, parryable: false, fn: (q) => { const k = Math.min(1, Math.max(0, 1 - (land - f.t) / 0.66)); q.y = 7 - 6.6 * k * k; } });
  }
  snd('rf-tick', { x: p.x, rate: 1.6, gain: 0.8 });
}
// the mold behind your walls of memory: a dark stain creeping out under every standing portrait
function mold(f, t0, surge, until) {
  const ps = S.claims.list.filter((c) => c.kind === 'portrait' && c.alive);
  for (const c of ps) {
    const [wx, wz, side] = SOCK[c.data.sock];
    const ang = side === 'left' ? 0 : side === 'right' ? Math.PI : -Math.PI / 2;
    const g = new THREE.Group(); g.position.set(wx, 0.015, wz);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40, -Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ color: '#2a1630', transparent: true, opacity: 0.88, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.rotation.z = ang; g.add(disc);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.965, 1.0, 40, 1, -Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 2.0), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    rim.rotation.x = -Math.PI / 2; rim.rotation.z = ang; rim.position.y = 0.002; g.add(rim);
    g.renderOrder = 2; g.scale.setScalar(0.01); f.scene.add(g); addLoose(g);
    const st = { r: 1.0, shrink: null };
    const hn = hint(f, { shape: 'circle', x: wx, z: wz, w: 1 }); hn.lead = 0.1;
    hazard({ until, hints: [hn], hot: () => st.r >= 0.3,
      update: (t) => {
        if (!c.alive && !st.shrink) { st.shrink = t; snd('rf-hiss', { x: wx }); }
        const downbeats = Math.max(0, Math.floor((f.bm.beatAt(t) - f.bm.beatAt(t0)) / 4));
        let r = Math.min(4.0, 1.0 + 0.6 * downbeats + (t >= surge ? 1.0 : 0));
        if (st.shrink) r = r * Math.max(0, 1 - (t - st.shrink) / (4 * f.beat));
        st.r += (r - st.r) * Math.min(1, 0.12);
        g.scale.setScalar(Math.max(0.01, st.r)); hn.w = st.r; if (st.r < 0.05) hn.dead = true;
      },
      test: (px, pz) => { if (st.r < 0.3) return false; const dx = px - wx, dz = pz - wz; return Math.hypot(dx, dz) < st.r - 0.1; },
      onHit: () => snd('rf-hiss', { x: f.player.x, gain: 1.2 }),
      done: () => { f.scene.remove(g); } });
  }
  if (ps.length) snd('rf-hiss', { x: 0, gain: 0.6, rate: 0.7 });
}
function flashback(f, lock, shutter) {
  for (const id of ['B:L', 'B:R']) {
    const c = S.claims.get(id); if (!c || !c.alive) continue;
    zone(f, { shape: 'cone', x: c.x, z: c.z, w: 10, param: 0.28, kind: 'white', start: f.t, end: shutter, lock, aim: () => ({ x: c.x, z: c.z, angle: Math.atan2(f.player.x - c.x, f.player.z - c.z) }), damage: 1,
      // a quick camera flash, bright but never a white-out; polaroids flutter down where you stood (paper, not light)
      onImpact: (hit, sh) => { if (hit === 'fizzle') return; f.fx.flash(new THREE.Color(0.24, 0.24, 0.27), 1); for (let i = 0; i < 4; i++) f.proj.spawn({ x: f.player.x + (Math.random() - 0.5) * 1.5, z: f.player.z + (Math.random() - 0.5) * 1.5, y: 2.5, angle: 0, speed: 0, kind: 'white', color: new THREE.Color(0.85, 0.8, 0.74), shape: 'card', size: 0.32, owner: 'deco', life: 1.4, spin: 3, parryable: false, fn: (q, dt) => { q.y = Math.max(0.05, q.y - dt * 1.6); } }); } });
    c.obj.traverse((o) => { if (o.name === 'eyes') for (const e of o.children) { const m = e.material; tween(f.t, shutter, (k) => m.color.setRGB(0.45 + 2.5 * k, 0.25 + 2.6 * k, 0.8 + 2.3 * k), 'in', () => m.color.setRGB(0.45, 0.25, 0.8)); } });
  }
  snd('rf-swirl', { x: 0, gain: 0.5, rate: 2.0 });
}
// one line of the fine print: three segments across the whole floor, two gaps (the spaces between words)
function finePrint(f, z, g1, g2, end) {
  const segs = [[-11, g1 - 1.1], [g1 + 1.1, g2 - 1.1], [g2 + 1.1, 11]];
  segs.forEach(([a, b], i) => { if (b - a > 0.2) zone(f, { shape: 'rect', x: a, z, angle: Math.PI / 2, w: 0.6, h: b - a, kind: 'white', start: f.t, end, damage: 1, silent: i > 0, sound: i === 0 }); });
  snd('rf-tick', { x: 0 });
}

// ---------------------------------------------------------------------------------------------- the party
const BALLOON_COLS = ['#c86aff', '#ff8ac8', '#e9b949', '#ff8ac8', '#c86aff'];
function balloons(f, id, swell, pop) {
  const c = S.claims.get(id);
  const b = f.boss;
  b.faceNow(c ? c.x : 0, c ? c.z : 0); S.ten.upper('Spell_Simple_Shoot', { duration: 0.45 });
  if (!c || !c.alive) return;
  // the bouquet's balloons cut loose and drift at you
  c.obj.traverse((o) => { if (o.name === 'balloons') o.visible = false; });
  snd('rf-swish', { x: c.x, rate: 1.8, gain: 0.6 });
  for (let i = 0; i < 5; i++) {
    if (S.balloons.length >= 10) break;
    const a = i / 5 * TAU;
    const p = f.proj.spawn({ x: c.x + Math.cos(a) * 0.4, z: c.z + Math.sin(a) * 0.4, y: 1.6, angle: Math.atan2(f.player.x - c.x, f.player.z - c.z) + (i - 2) * 0.25, speed: 4.5, kind: 'pink', shape: 'orb', size: 0.5, radius: 0.45, life: pop - f.t + 0.05, homing: 0.8, target: () => f.player, damage: 1 });
    if (!p) continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshPhysicalMaterial({ color: BALLOON_COLS[i], roughness: 0.15, clearcoat: 1 })); m.scale.set(1, 1.18, 1);
    f.scene.add(m);
    const bl = { p, m, pop, i };
    S.balloons.push(bl);
    // as it swells over the last two beats a white circle grows round it; on the song's pop it bursts
    // (the circles follow balloons that drift together: all but the first are drawn dimmer with a short flash)
    f.at(swell, (f2) => { if (p.dead || !f2.proj.list.includes(p)) return; bl.tele = zone(f2, { shape: 'circle', w: 1.2, kind: 'white', start: f2.t, end: pop, aim: () => ({ x: p.x, z: p.z }), damage: 1, silent: i > 0, sound: false, dim: i > 0 ? 0.5 : 0, linger: i > 0 ? 0.05 : undefined,
      onImpact: () => { if (!p.dead && f2.proj.list.includes(p)) { p.dead = true; f2.fx.glitter(p.x, 1.6, p.z, new THREE.Color(1.8, 0.85, 1.6), 9, 1.2); f2.fx.emit(6, { x: p.x, y: 1.6, z: p.z, color: new THREE.Color(BALLOON_COLS[i]).multiplyScalar(1.4), shape: 4, speed: 2.2, life: 1.4, size: 0.07, gravity: 2.2, up: 0.6, jitter: 0.6, drag: 0.8 }); } } }); });
  }
}
function updateBalloons(f) {
  for (let i = S.balloons.length - 1; i >= 0; i--) {
    const B = S.balloons[i], p = B.p;
    const live = !p.dead && f.proj.list.includes(p);
    if (!live) { f.scene.remove(B.m); S.balloons.splice(i, 1); continue; }
    const sw = Math.max(0, Math.min(1, 1 - (B.pop - f.t) / (2 * f.beat)));
    B.m.position.set(p.x, 1.5 + Math.sin(f.t * 3 + B.i) * 0.08, p.z); B.m.scale.set(1 + sw * 0.6, 1.18 + sw * 0.7, 1 + sw * 0.6);
    if (p.owner !== 'boss') B.m.material.emissive.set('#ffb030');
  }
}

// ---------------------------------------------------------------------------------------------- bridges
function lowerLuggage(f, id, kind, x, z, land) {
  if (S.claims.get(id)) return;
  const trunk = kind === 'trunk' || kind === 'cello';
  zone(f, { shape: 'circle', x, z, w: trunk ? 1.3 : 1.0, kind: 'white', start: f.t, end: land, damage: 1, sound: false,
    onImpact: () => { snd('rf-thud', { x, gain: 1.1, rate: 0.8 }); f.fx.dust(x, z, 10, new THREE.Color(0.8, 0.7, 0.72)); f.cam.shake(0.25, 0.1); } });
  const c = luggageClaim(f, id, kind, x, z, { rot: (x * 7 + z * 3) % 1 });
  if (S.wrecked) c.fragile = true;
  c.dormant = true; const o = c.obj; o.position.y = 8;
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 12, 4), mats().gold); wire.position.y = 6.8; o.add(wire);
  tween(f.t, land, (k) => { o.position.y = 8 * (1 - k); }, 'in', () => { o.position.y = 0; c.dormant = false; o.remove(wire); });
  // (twelve of these in eight seconds: a lower, softer whine than the portraits' one big zip)
  snd('rf-wires', { x, gain: 0.34, rate: 1.7 });
}
function glideSlap(f, end) {
  const b = f.boss;
  zone(f, { shape: 'cone', w: 2.8, param: 0.95, kind: 'pink', start: f.t, end, lock: end - f.beat, aim: () => ({ x: b.x, z: b.z, angle: Math.atan2(f.player.x - b.x, f.player.z - b.z) }), damage: 1, melee: true,
    onImpact: (hit) => { if (hit === 'parried') S.ten.parried(); } });
  f.at(end - 0.3, () => b.perform('Sword_Regular_A', { duration: 0.45, from: 0.0, to: 0.85 }));
  snd('rf-swish', { x: b.x });
}
// the pause strikes: in the rests between her phrases, a lunge from the dark along a white lane
function pauseStrike(f, end, { hold = null } = {}) {
  const b = f.boss, bt = f.beat;
  S.ten.own(end + 2 * bt);
  const lock = end - bt;
  const len = () => Math.min(16, Math.hypot(f.player.x - b.x, f.player.z - b.z) + 1);
  const { sh, g } = zone(f, { shape: 'rect', w: 0.8, h: len(), kind: 'white', start: f.t, end, lock, aim: () => ({ x: b.x, z: b.z, angle: Math.atan2(f.player.x - b.x, f.player.z - b.z), h: len() }), damage: 1, melee: true,
    hold: hold || null, onImpact: () => {} });
  snd('rf-breath', { x: b.x, gain: 0.7, rate: 1.4 });
  f.at(end - 0.12, (f2) => {
    const ex = clampX(f2, b.x + Math.sin(sh.angle) * (sh.h - 0.5)), ez = clampZ(f2, b.z + Math.cos(sh.angle) * (sh.h - 0.5));
    b.faceNow(ex, ez); b.perform('Sword_Dash', { duration: 0.45, from: 0.05, to: 0.5 });
    b.moveTo(ex, ez, Math.max(0.12, sh.h / 18), { easing: 'in', now: f2.t });
    snd('rf-swish', { x: b.x, gain: 1.1, rate: 0.7 });
  });
  f.at(end + 0.3, () => { if (b.state === 'perform') b.open(2 * bt); });
}
// the ribbon: "I'm the reason you can't quite let go"
function ribbonFlick(f, end) {
  const b = f.boss;
  S.ten.own(end + 6 * f.beat);
  b.faceNow(f.player.x, f.player.z); b.perform('Spell_Simple_Shoot', { duration: 0.5 });
  zone(f, { shape: 'rect', w: 0.3, h: Math.min(14, Math.hypot(f.player.x - b.x, f.player.z - b.z) + 0.6), kind: 'pink', start: f.t, end, lock: end - 0.15,
    aim: () => ({ x: b.x, z: b.z, angle: Math.atan2(f.player.x - b.x, f.player.z - b.z), h: Math.min(14, Math.hypot(f.player.x - b.x, f.player.z - b.z) + 0.6) }), damage: 0.0001, melee: false,
    onImpact: (hit) => {
      if (hit === 'parried') {
        // you caught its end: a yank, and she stumbles to you, open
        const a = Math.atan2(f.player.x - b.x, f.player.z - b.z);
        b.moveTo(b.x + Math.sin(a) * 2, b.z + Math.cos(a) * 2, 0.2, { now: f.t }); b.perform('Hit_Chest', { duration: 0.5 }); S.ten.face('tenantEvicted', 2);
        f.at(f.t + 0.25, () => { b.state === 'perform' && b.open(4 * f.beat); });
      } else if (hit === 'hit' || (hit === 'miss' && false)) {
        S.ribbon = { hits: 0, born: f.t };
        S.ten.face('tenantMine', 3);
      }
    } });
  snd('rf-swish', { x: b.x, rate: 1.3 });
}
function ribbonTug(f, slap) {
  const R = S.ribbon, b = f.boss, pl = f.player;
  if (!R) return;
  b.perform('Melee_Hook', { duration: 0.42, from: 0.1, to: 0.7 });
  const a = Math.atan2(b.x - pl.x, b.z - pl.z), d = Math.min(1.8, Math.max(0, Math.hypot(b.x - pl.x, b.z - pl.z) - 1.5));
  const to = { x: pl.x + Math.sin(a) * d, z: pl.z + Math.cos(a) * d };
  S.yank = { t0: f.t, t1: f.t + 0.15, fx: pl.x, fz: pl.z, tx: to.x, tz: to.z };
  snd('rf-creak', { x: pl.x, gain: 0.7, rate: 2 });
  S.ten.backhand(f.t, { at: to, beats: 1 });
}
function ribbonLetGo(f, end) {
  const b = f.boss;
  if (!S.ribbon) return;
  S.ribbon = null;
  zone(f, { shape: 'arc', x: b.x, z: b.z, angle: Math.atan2(f.player.x - b.x, f.player.z - b.z), w: 6.0, h: 0.8, param: 1.2, kind: 'white', start: f.t, end, damage: 1 });
  snd('rf-swish', { x: b.x, gain: 1.2, rate: 0.9 });
}
function cutRibbon(f, at) {
  if (!S.ribbon) return;
  S.ribbon = null;
  snd('rf-thread', { x: at.x, rate: 1.4 });
  // it snaps back into her face with the gold thread: eviction
  S.ten.mode = 'lounge'; S.ten.seat = { occupant: 'boss' };
  const pseudo = { id: 'ribbon', kind: 'ribbon', x: at.x, z: at.z, y: 1.2, value: 0, occupant: 'boss', obj: null, data: {} };
  S.ten.seat = pseudo;
  S.claims.threads.add(new THREE.Vector3(at.x, 1.2, at.z), () => new THREE.Vector3(f.boss.x, 1.6, f.boss.z), 0.12, () => { S.ten.lashed(pseudo, null, new THREE.Vector3(at.x, 1.2, at.z)); });
}
function updateRibbon(f, dt) {
  const R = S.ribbon, pl = f.player, b = f.boss;
  if (S.yank) { const Y = S.yank; const k = Math.min(1, (f.t - Y.t0) / (Y.t1 - Y.t0)); const p = f.arena.resolve(Y.fx + (Y.tx - Y.fx) * k, Y.fz + (Y.tz - Y.fz) * k, 0.42); pl.x = p.x; pl.z = p.z; if (k >= 1) S.yank = null; }
  if (!R) { if (S.ribbonMesh) S.ribbonMesh.visible = false; return; }
  if (!S.ribbonMesh) { S.ribbonMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.1), new THREE.MeshPhysicalMaterial({ color: '#c86aff', roughness: 0.3, sheen: 1, sheenColor: new THREE.Color('#ffd0ff') })); f.scene.add(S.ribbonMesh); }
  const m = S.ribbonMesh; m.visible = true;
  const ax = pl.x, az = pl.z, bx = b.x, bz = b.z, d = Math.hypot(bx - ax, bz - az);
  m.position.set((ax + bx) / 2, 1.1, (az + bz) / 2); m.scale.x = d; m.rotation.y = -Math.atan2(bz - az, bx - ax);
  // a ring across it cuts it
  for (const r of pl.rings) if (r.state !== 'hand') { const q = segDist(r.pos.x, r.pos.z, ax, az, bx, bz); if (q.d < 0.5 && q.u > 0.08 && q.u < 0.92) { cutRibbon(f, { x: r.pos.x, z: r.pos.z }); return; } }
}
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; const u = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)); return { d: Math.hypot(px - ax - dx * u, pz - az - dz * u), u, x: ax + dx * u, z: az + dz * u }; }

// ---------------------------------------------------------------------------------------------- the final chorus
function termites(f, rot, end) {
  const b = f.boss;
  b.perform('Zombie_Scratch', { duration: end - f.t + 0.1 });
  for (let i = 0; i < 5; i++) { const a = rot + i / 5 * TAU; zone(f, { shape: 'rect', x: b.x + Math.sin(a) * 0.4, z: b.z + Math.cos(a) * 0.4, angle: a, w: 0.4, h: 11, kind: 'white', start: f.t, end, damage: 1, silent: i > 0, sound: i === 0 }); }
  snd('rf-crackle', { x: b.x, gain: 1.2, rate: 0.7 });
}
// her signature through your floor: a pen tip runs a path drawn two beats ahead; the groove behind it glows and hurts
function carvePath(kind) {
  const pts = [];
  if (kind === 'sign') { const A = [-9.5, -4.0], B = [9.0, 3.5]; for (let i = 0; i <= 400; i++) { const s = i / 400; const lx = A[0] + (B[0] - A[0]) * s, lz = A[1] + (B[1] - A[1]) * s; const ph = s * TAU * 5; const amp = 1.1 * Math.sin(Math.PI * Math.min(1, s * 1.3)); pts.push([lx + amp * (Math.cos(ph) - 1) * 0.8, lz - amp * Math.sin(ph)]); } }
  else { const A = [8.0, -5.5], B = [-8.0, 5.0]; for (let i = 0; i <= 100; i++) { const s = i / 100; pts.push([A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s]); } }
  return pts.map(([x, z]) => [Math.max(-10.6, Math.min(10.6, x)), Math.max(-6.6, Math.min(6.6, z))]);
}
function ribbonGeo(pts, w) {
  const n = pts.length, P = new Float32Array(n * 2 * 3), idx = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    P[i * 6] = pts[i][0] - dz * w; P[i * 6 + 1] = 0.02; P[i * 6 + 2] = pts[i][1] + dx * w;
    P[i * 6 + 3] = pts[i][0] + dz * w; P[i * 6 + 4] = 0.02; P[i * 6 + 5] = pts[i][1] - dx * w;
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setIndex(idx); g.setDrawRange(0, 0);
  return g;
}
function carve(f, id, kind, t0, t1) {
  const pts = carvePath(kind), n = pts.length;
  const lead = 2 * f.beat;
  const line = new THREE.Mesh(ribbonGeo(pts, 0.04), FXM.carveLine());
  const cut = new THREE.Mesh(ribbonGeo(pts, 0.45), FXM.carveCut());
  const groove = new THREE.Mesh(ribbonGeo(pts, 0.2), FXM.carveGroove());
  cut.position.y = -0.004; line.renderOrder = cut.renderOrder = groove.renderOrder = 3; f.scene.add(line, cut, groove); addLoose(line, cut, groove);
  const tipAt = (t) => Math.max(0, Math.min(n - 1, Math.floor((t - t0) / (t1 - t0) * (n - 1))));
  const st = { healed: false };
  let nibC = null;
  // the pen tip: a moving white circle; the bot gets hints along the groove
  const tipG = f.tele.add({ shape: 'circle', x: pts[0][0], z: pts[0][1], w: 0.9, kind: 'white', start: t0 - lead, end: t1 });
  f.cue('white', { x: pts[0][0] }); snd('rf-pencil', { x: pts[0][0], gain: 1.0, rate: 1.3 });
  const hints = [];
  for (let i = 0; i < n - 1; i += Math.max(1, Math.floor(n / 28))) { const a = pts[i], b = pts[Math.min(n - 1, i + Math.max(1, Math.floor(n / 28)))]; const h = hint(f, { shape: 'rect', x: a[0], z: a[1], angle: Math.atan2(b[0] - a[0], b[1] - a[1]), w: 0.55, h: Math.hypot(b[0] - a[0], b[1] - a[1]) }); h.idx = i; h.lead = 0.1; hints.push(h); }
  hazard({ until: 400, hints, hot: (t) => !st.healed && !st.cool && t >= t0 - lead,
    update: (t) => {
      const ti = t < t0 ? -1 : tipAt(t), li = Math.max(0, Math.min(n - 1, Math.floor((t - t0 + lead) / (t1 - t0) * (n - 1))));
      line.geometry.setDrawRange(Math.max(0, ti) * 6, Math.max(0, li - Math.max(0, ti)) * 6);
      groove.geometry.setDrawRange(0, Math.max(0, ti) * 6); cut.geometry.setDrawRange(0, Math.max(0, ti) * 6);
      if (ti >= 0 && t <= t1 + 0.05) { tipG.x = pts[ti][0]; tipG.z = pts[ti][1]; }
      for (const h of hints) if (st.healed || st.cool) h.dead = true;
      // the heat goes out of it three bars after the stroke (a dark scar stays); breaking the nib heals it with gold
      const hot = Math.max(0, Math.min(1, 1 - (t - t1 - 4.0) / 1.0));
      st.cool = hot <= 0;
      if (st.healed) { groove.material.color.setRGB(1.3, 0.85, 0.22); groove.material.opacity = 0.8; cut.material.color.set('#5a3a10'); }
      else { groove.material.opacity = (0.65 + 0.15 * Math.sin(t * 20)) * (0.2 + 0.8 * hot); }
      if (t >= t1 && !nibC) {
        // the nib stays standing where the stroke ends: break it and the groove heals with gold
        const e = pts[n - 1];
        nibC = S.claims.add({ id, kind: 'nib', obj: P.nib(), x: e[0], z: e[1], y: 0.5, r: 0.35, hits: 4, value: 6, solid: true, data: {}, onBreak: () => { st.healed = true; snd('rf-gold', { x: e[0], rate: 1.5 }); } });
        if (S.wrecked) nibC.fragile = true;
      }
    },
    test: (px, pz) => {
      if (st.healed || st.cool || f.t < t0) return false;
      const ti = tipAt(f.t);
      const tp = pts[ti]; if (f.t <= t1 && Math.hypot(px - tp[0], pz - tp[1]) < 0.9) return true;
      for (let i = 0; i < ti; i += 2) if (Math.hypot(px - pts[i][0], pz - pts[i][1]) < 0.5) return true;
      return false;
    },
    onHit: () => snd('rf-hiss', { x: f.player.x, gain: 1.2 }) });
}
function futureFrame(f, id, land) {
  const pl = f.player, k = 0.66;
  const x = Math.max(-9.6, Math.min(9.6, pl.x + pl.vx * k)), z = Math.max(-5.8, Math.min(5.8, pl.z + pl.vz * k));
  zone(f, { shape: 'rect', x, z: z - 0.8, angle: 0, w: 1.1, h: 1.6, kind: 'white', start: f.t, end: land, damage: 1,
    onImpact: () => {
      if (S.claims.get(id)) S.claims.remove(id);
      const c = S.claims.add({ id, kind: 'frame', obj: P.flatFrame(), x, z, y: 0.1, box: { hw: 1.1, hd: 0.8, rot: 0 }, hits: 2, value: 1.5, data: {} });
      if (S.wrecked) c.fragile = true;
      snd('rf-slam', { x, gain: 0.5, rate: 1.4 }); f.fx.dust(x, z, 12, new THREE.Color(0.85, 0.75, 0.6));
    } });
  // the frame falls flat from above onto its rect
  const m = P.flatFrame(); m.position.set(x, 3, z); m.rotation.x = -1.2; f.scene.add(m); addLoose(m);
  tween(f.t, land, (q) => { m.position.y = 3 * (1 - q); m.rotation.x = -1.2 * (1 - q); }, 'in', () => f.scene.remove(m));
  snd('rf-tap', { x, gain: 1.2 });
}
function stepToLamp(f, arrive) {
  const pl = f.player; const lx = 1.8, lz = -4.2;
  const a = Math.atan2(pl.x - lx, pl.z - lz);
  S.ten.stroll(clampX(f, lx + Math.sin(a) * 1.6), clampZ(f, lz + Math.cos(a) * 1.6), arrive);
}
function keyVolley(f, release, off) {
  const lock = { x: f.player.x, z: f.player.z };
  let any = false;
  for (const c of S.claims.list) {
    if (c.kind !== 'rack' || !c.alive || c.dormant) continue;
    for (const dx of [-0.8 + off, 0 + off, 0.8 + off]) {
      const x = c.data.rx + dx, z = -6.75;
      const ang = Math.atan2(lock.x - x, lock.z - z), len = Math.min(15, Math.hypot(lock.x - x, lock.z - z) + 3);
      // nine lanes meet where you stood: the middle one of each rack is drawn in full and flashes, its two
      // neighbours (which run into it) are dimmer and just go, so the release never flashes the screen white
      const side = dx !== 0 + off;
      const g = f.tele.add({ shape: 'rect', x, z, angle: ang, w: 0.25, h: len, kind: 'white', start: f.t, end: release, linger: side ? 0.001 : undefined }); any = true;
      if (side && g.color) g.color.multiplyScalar(0.4);
      f.at(release, (f2) => { if (!c.alive || !standing(g)) return; f2.proj.spawn({ x, z, y: 1.75, angle: ang, speed: 11, kind: 'white', shape: 'shard', size: 0.32, life: len / 11, damage: 1, parryable: false }); });
    }
  }
  if (any) { f.cue('white', { x: 0 }); snd('rf-jingle', { x: 0, gain: 1.2 }); }
}
// THE LAST CLAIM: she lies down on your bed and the glaze sweeps over it
function lastClaim(f) {
  const b = f.boss;
  if (S.wrecked) {
    // her bar is empty: she can't claim it; the glaze cracks off as it arrives
    snd('rf-crackle', { x: 0, gain: 1.2 }); f.fx.chips(0, 0.7, -5.6, new THREE.Color(2.4, 1, 3), 30);
    return;
  }
  const g = new THREE.Group(); const sh = P.bed(); sh.traverse((o) => { if (o.isMesh) { o.material = mats().glaze; o.userData.yours = false; } }); sh.scale.set(1.03, 1.06, 1.03); g.add(sh);
  g.add(kissDecal(0.5, [0.5, 0.68, -0.6], [0, 1, 0]));
  const c = S.claims.add({ id: 'BED', kind: 'bed', obj: g, x: 0, z: -5.8, y: 0.6, box: { hw: 1.12, hd: 1.2, rot: 0 }, hits: 6, value: 8, solid: false, data: {} });
  sh.scale.y = 0.01; tween(f.t, f.t + 0.35, (k) => { sh.scale.y = 0.01 + 1.05 * k; }, 'out');
  snd('rf-ting', { x: 0 });
  S.ten.outOfFrame(); S.ten.gen++; S.ten.mode = 'lounge'; S.ten.seat = c; c.occupant = 'boss';
  b.place(0.2, -5.4, Math.PI); b.root.position.y = 0.62;
  b.rig.play('LayToIdle', { fade: 0.25, loop: false, force: true }); b.rig.base && (b.rig.base.timeScale = 0); b.busyUntil = f.t + 3.2; b._locoClip = '';
  S.ten.face('tenantSleep');
}

// THE FLOOR GIVES WAY: the bedroom's floorboards burst upward like a thrown deck of cards, past the camera
function boardsBurst(f) {
  const n = 90, geo = new THREE.BoxGeometry(1.6, 0.04, 0.19);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#6a4630', roughness: 0.6, emissive: new THREE.Color('#2a1a40'), emissiveIntensity: 0.4 }), n);
  m.frustumCulled = false; f.scene.add(m); addLoose(m);
  const B = [];
  for (let i = 0; i < n; i++) B.push({ x: (Math.random() - 0.5) * 21, z: (Math.random() - 0.5) * 13, y: 0.05, vy: 16 + Math.random() * 18, vx: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3 + 1.5, rx: 0, ry: Math.random() * 3, rz: 0, wx: (Math.random() - 0.5) * 14, wz: (Math.random() - 0.5) * 14, d: Math.random() * 0.12 });
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), One = new THREE.Vector3(1, 1, 1);
  let last = f.t; const t0 = f.t;
  tween(f.t, f.t + 0.9, () => {
    const dt = Math.max(0, f.t - last); last = f.t;
    B.forEach((b, i) => { if (f.t - t0 < b.d) return; b.y += b.vy * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.vy -= 4 * dt; b.rx += b.wx * dt; b.rz += b.wz * dt; E.set(b.rx, b.ry, b.rz); Q.setFromEuler(E); M4.compose(P.set(b.x, b.y, b.z), Q, One); m.setMatrixAt(i, M4); });
    m.instanceMatrix.needsUpdate = true;
  }, 'lin', () => { f.scene.remove(m); });
  f.fx.dust(0, 0, 30, new THREE.Color(0.5, 0.42, 0.5));
}
