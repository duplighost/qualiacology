// THE DEFENDANT as a figurine (design §3): Superhero_Female at 1.25, a cropped red blazer edged in gold leaf over
// black glaze, a red pencil mini, sheer black stockings, black patent stilettos, platinum buns, handcuff bangles,
// cat-eyes pushed up, a gold chain with the gavel charm. Her props (switchblade, compact, lipstick, key, cuffs...),
// the gloss that is the rule (mirror while PRETTY, matte while GUILTY), her faces, and the boss that deflects.
import * as THREE from 'three';
import { Boss } from '../../game/boss.js';
import { CharacterKit } from '../../engine/character.js';
import { buildFigurine } from '../../game/figurine.js';

export const SPEC = {
  name: 'THE DEFENDANT', body: 'female', scale: 1.25, porcelain: 0xf7f0ea, gold: 0xd8a443,
  skin: { roughness: 0.3, coatRough: 0.03, translucency: 0.7 },
  layers: [
    { kind: 'bottom', from: 'hips', hem: 'ankle', color: 0x221a1e, finish: 'satin', translucency: 0.05 },                // sheer black stockings
    { kind: 'top', from: 'waist', neckline: 'v', depth: 0.12, width: 0.075, sleeves: null, color: 0x120e12, finish: 'gloss' },   // the black camisole
    { kind: 'bottom', from: 'waist', hem: 'midthigh', color: 0xc0122e, finish: 'gloss', translucency: 0.08,
      trim: { color: 'gold', width: 0.007, relief: 0.0005 } },                                                            // the red pencil mini
    { kind: 'top', from: 'waist', neckline: 'plunge', depth: 0.2, width: 0.1, sleeves: 'wrist', color: 0xc0122e, finish: 'gloss', translucency: 0.08,
      trim: { color: 'gold', width: 0.008, relief: 0.0006 }, shell: { thickness: 0.006, smooth: 5 } },                     // the cropped red blazer
    { kind: 'lapels', of: { neckline: 'plunge', depth: 0.2, width: 0.1, from: 'waist', sleeves: 'wrist' }, width: 0.032, to: 'underbust',
      color: 0xb8102c, finish: 'gloss', trim: { color: 'gold', width: 0.004, relief: 0.0004 } },
    { kind: 'belt', at: 'hips', width: 0.016, color: 0xd8a443, finish: 'gold' },                                         // the gold chain belt
  ],
  hair: { style: 'buns', color: 0xf2e3c1, gild: 0.32 },
  face: {
    lips: { color: '#c8102e', shape: 'heart' }, liner: { thick: 1.45, wing: 1.6 }, lashes: { n: 11, len: 1.35, lower: 0.25 },
    brows: { shape: 'high', color: '#8a5a3c', thick: 0.75 }, shadow: { color: '#d0507a', amount: 0.62 }, blush: { color: '#f0b4b2', amount: 0.4 },
    marks: [{ at: 'cheek', side: -1 }],
  },
  eyes: { iris: 0x0a0608, iris2: 0x3a2028 },
  accessories: [
    { type: 'shoes', color: 0x060506, finish: 'lacquer', toe: 'point' },
    { type: 'handcuffs', finish: 'gold' },
    { type: 'sunglasses', up: true, color: 0x0d0607, lens: 0xff6fa8 },
    { type: 'pearls', drop: 0.055, color: 0xd8a443, size: 0.0024 },
  ],
  breaks: ['bun_l', 'shoulder_r', 'hand_l'],
};

// ------------------------------------------------------------------------------------------ materials for props
const M = {};
function mats() {
  if (M.gold) return M;
  M.gold = new THREE.MeshPhysicalMaterial({ color: 0xd8a443, metalness: 1, roughness: 0.26, clearcoat: 0.3 });
  M.chrome = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f8, metalness: 1, roughness: 0.06 });
  M.pearl = new THREE.MeshPhysicalMaterial({ color: 0xffd8e6, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.6, sheen: 0.5, sheenColor: new THREE.Color(0xffb0d0) });
  M.red = new THREE.MeshPhysicalMaterial({ color: 0xd61c3b, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
  M.lip = new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.25, clearcoat: 1 });
  M.enamel = new THREE.MeshPhysicalMaterial({ color: 0xff6fa8, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 });
  M.black = new THREE.MeshPhysicalMaterial({ color: 0x120e12, roughness: 0.2, clearcoat: 1 });
  M.mirror = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.03, emissive: new THREE.Color(0xffe2c8), emissiveIntensity: 0 });
  M.bubble = new THREE.MeshPhysicalMaterial({ color: 0xff7fb8, roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1, emissive: new THREE.Color(0xff3f8f), emissiveIntensity: 0.25 });
  M.leather = new THREE.MeshPhysicalMaterial({ color: 0x5a3622, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  return M;
}
const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };

// a prop group under a bone: built in world metres, placed in the bone's frame
function onBone(fig, bone, obj, pos, rot = [0, 0, 0]) {
  const b = fig.bones[bone]; if (!b) return obj;
  const holder = new THREE.Group(); holder.add(obj);
  holder.scale.setScalar(1 / fig.scale);
  holder.position.set(pos[0], pos[1], pos[2]); holder.rotation.set(rot[0], rot[1], rot[2]);
  b.add(holder);
  return holder;
}

export function makeKnife() {
  const m = mats(), g = new THREE.Group();
  const handle = mesh(new THREE.CapsuleGeometry(0.018, 0.15, 4, 12), m.pearl); handle.rotation.z = Math.PI / 2; handle.scale.set(1, 1, 0.55);
  g.add(handle);
  const hinge = new THREE.Group(); hinge.position.x = 0.09; g.add(hinge);
  const bs = new THREE.Shape(); bs.moveTo(0, -0.012); bs.lineTo(0.15, -0.004); bs.lineTo(0.17, 0.006); bs.lineTo(0, 0.012); bs.closePath();
  const blade = mesh(new THREE.ExtrudeGeometry(bs, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.002, bevelSegments: 1 }), m.chrome);
  blade.position.z = -0.0015; hinge.add(blade);
  g.userData.hinge = hinge;
  g.userData.open = (k) => { hinge.rotation.z = Math.PI * (1 - k); };
  g.userData.open(0);
  return g;
}
function makeCompact() {
  const m = mats(), g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.014, 32), m.gold); g.add(base);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.007, -0.07); g.add(lidPivot);
  const lid = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 32), m.gold); lid.position.set(0, 0.006, 0.07); lidPivot.add(lid);
  const hs = new THREE.Shape(); hs.moveTo(0, -0.03); hs.bezierCurveTo(0.045, 0.0, 0.03, 0.035, 0, 0.018); hs.bezierCurveTo(-0.03, 0.035, -0.045, 0.0, 0, -0.03);
  const heart = mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.004, bevelEnabled: false }), m.enamel); heart.rotation.x = -Math.PI / 2; heart.position.set(0, 0.013, 0.075); lidPivot.add(heart);
  const mirror = mesh(new THREE.CircleGeometry(0.062, 32), m.mirror); mirror.rotation.x = Math.PI / 2; mirror.position.set(0, -0.0005, 0.07); lidPivot.add(mirror);
  g.userData.open = (k) => { lidPivot.rotation.x = -k * 1.9; };
  g.userData.glow = (k) => { m.mirror.emissiveIntensity = k * 4; };
  return g;
}
function makeLipstick() {
  const m = mats(), g = new THREE.Group();
  const tube = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 18), m.gold); g.add(tube);
  const bullet = mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.05, 16), m.lip); bullet.position.y = 0.04; g.add(bullet);
  g.userData.bullet = bullet;
  g.userData.twist = (k) => { bullet.position.y = 0.02 + 0.04 * k; };
  return g;
}
export function makeGiantKey() {
  const m = mats(), g = new THREE.Group();
  const bow = mesh(new THREE.TorusGeometry(0.22, 0.055, 12, 40), m.gold); bow.position.x = -0.6; g.add(bow);
  const shaft = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 14), m.gold); shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.1; g.add(shaft);
  for (const [x, h] of [[0.5, 0.2], [0.6, 0.13], [0.42, 0.1]]) { const b = mesh(new THREE.BoxGeometry(0.06, h, 0.06), m.gold); b.position.set(x, -h / 2 - 0.03, 0); g.add(b); }
  const collar = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 16), m.gold); collar.rotation.z = Math.PI / 2; collar.position.x = -0.35; g.add(collar);
  return g;
}
export function makeCuff(scale = 1) {
  const m = mats(), g = new THREE.Group();
  const a = mesh(new THREE.TorusGeometry(0.06 * scale, 0.011 * scale, 10, 32), m.gold); g.add(a);
  const b = mesh(new THREE.TorusGeometry(0.06 * scale, 0.011 * scale, 10, 32), m.gold); b.position.x = 0.2 * scale; g.add(b);
  for (let i = 0; i < 3; i++) { const l = mesh(new THREE.TorusGeometry(0.018 * scale, 0.005 * scale, 6, 14), m.gold); l.position.x = 0.07 * scale + i * 0.03 * scale; l.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(l); }
  return g;
}
export function makeGasCan() {
  const m = mats(), g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.32, 0.36, 0.14), m.red); body.position.y = 0.18; g.add(body);
  const cap = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12), m.gold); cap.position.set(0.11, 0.39, 0); g.add(cap);
  const handle = mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 18, Math.PI), m.red); handle.position.set(-0.04, 0.36, 0); g.add(handle);
  const bow = mesh(new THREE.SphereGeometry(0.035, 10, 8), m.enamel); bow.position.set(-0.09, 0.4, 0.04); g.add(bow);
  return g;
}
export function makeZippo() {
  const m = mats(), g = new THREE.Group();
  const b = mesh(new THREE.BoxGeometry(0.055, 0.075, 0.025), m.gold); b.position.y = 0.0375; g.add(b);
  const lid = mesh(new THREE.BoxGeometry(0.055, 0.025, 0.025), m.gold); lid.position.set(0, 0.09, 0); g.add(lid);
  return g;
}
function makeGavelCharm() {
  const m = mats(), g = new THREE.Group();
  const head = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 12), m.gold); head.rotation.z = Math.PI / 2; g.add(head);
  const handle = mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.05, 8), m.gold); handle.position.y = -0.026; g.add(handle);
  return g;
}
function makeJacketShell() {
  // YOU's umber leather jacket, thrown over her shoulders: the back and the collar, the sleeves hanging empty
  const m = mats(), g = new THREE.Group();
  const back = mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.58, 20, 1, true, Math.PI / 2 + 0.25, Math.PI - 0.5), m.leather); back.material.side = THREE.DoubleSide; back.position.set(0, -0.12, -0.02); g.add(back);
  const top = mesh(new THREE.SphereGeometry(0.25, 20, 6, Math.PI / 2 + 0.25, Math.PI - 0.5, 0, Math.PI / 2), m.leather); top.material.side = THREE.DoubleSide; top.scale.set(1.0, 0.35, 1.0); top.position.set(0, 0.17, -0.02); g.add(top);
  for (const sd of [-1, 1]) { const sl = mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.5, 10, 1, true), m.leather); sl.material.side = THREE.DoubleSide; sl.position.set(sd * 0.27, -0.12, -0.1); sl.rotation.z = sd * 0.06; g.add(sl); }
  return g;
}
function makeBubble() { const o = mesh(new THREE.SphereGeometry(0.1, 20, 14), mats().bubble); o.castShadow = false; return o; }

// ------------------------------------------------------------------------------------------ the left bun as a breakable
// The buns are one hair mesh. Split the left bun's triangles into a rigid piece on the head, so it can snap off
// at the first notch like any accessory (figurine.breakPiece('bun_l')).
function splitBun(fig) {
  const hair = fig.hairMeshes && fig.hairMeshes[0];
  let src = hair && (hair.mesh || hair);
  if (!src || !src.geometry) { fig.root.traverse((o) => { if (!src && o.isSkinnedMesh && /hair/i.test(o.name)) src = o; }); }
  if (!src || !src.geometry || !src.geometry.index) return false;
  const g = src.geometry, P = g.attributes.aBind ? g.attributes.aBind.array : null, idx = g.index.array;
  if (!P) return false;
  const I = fig.I, side = I.side, top = I.top;
  const isL = (v) => { const x = P[v * 4] * side, y = P[v * 4 + 1]; return x > 0.055 && y > top - 0.14; };
  const keep = [], take = [];
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; (isL(a) && isL(b) && isL(c) ? take : keep).push(a, b, c); }
  if (take.length < 30) return false;
  // the rigid copy: bind positions into the head bone's frame
  const head = fig.bones.Head; const inv = fig.boneInverse('Head');
  const used = [...new Set(take)], remap = new Map(used.map((v, i) => [v, i]));
  const ng = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) {
    if (name === 'skinIndex' || name === 'skinWeight') continue;
    const it = attr.itemSize, A = new attr.array.constructor(used.length * it);
    used.forEach((v, k) => { for (let c = 0; c < it; c++) A[k * it + c] = attr.array[v * it + c]; });
    ng.setAttribute(name, new THREE.BufferAttribute(A, it, attr.normalized));
  }
  // positions: the hair geometry's raw positions are in its own bind; aBind holds the body's bind space
  const pos = new Float32Array(used.length * 3), v3 = new THREE.Vector3();
  used.forEach((v, k) => { v3.set(P[v * 4], P[v * 4 + 1], P[v * 4 + 2]).applyMatrix4(inv); pos[k * 3] = v3.x; pos[k * 3 + 1] = v3.y; pos[k * 3 + 2] = v3.z; });
  ng.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ng.setIndex(take.map((v) => remap.get(v)));
  ng.computeVertexNormals();
  const bun = new THREE.Mesh(ng, src.material); bun.name = 'bun_l'; bun.castShadow = true;
  head.add(bun);
  g.setIndex(keep);
  const rec = { name: 'bun_l', type: 'bun_l', def: { root: bun }, opts: {}, broken: false, objects: [bun] };
  rec.home = [{ obj: bun, parent: head, p: bun.position.clone(), q: bun.quaternion.clone(), s: bun.scale.clone() }];
  fig.acc.push(rec);
  return true;
}

// ------------------------------------------------------------------------------------------ faces (§3)
const FACES = {
  smug: 'smug', pout: 'pout', scandalized: 'shock', sing: 'sing', hurt: 'hurt',
  grin: { jaw: 0.42, smileL: 1.0, smileR: 1.0, pucker: 0.0, browIL: -0.7, browOL: 0.35, browIR: -0.7, browOR: 0.35, sneer: 0.25, pout: 0, cheek: 0.8, lidT: 0.5, lidB: 0.4, happy: 0.15, iris: 1, pupil: 0.75, gazeY: 0 },
  wrecked: { jaw: 0.3, smileL: 0.7, smileR: -0.3, pucker: 0.0, browIL: 0.6, browOL: -0.3, browIR: -0.3, browOR: 0.5, sneer: 0.3, pout: 0.1, cheek: 0.2, lidT: 0.62, lidB: 0.42, happy: 0, iris: 0.95, pupil: 0.8, gazeY: 0.04 },
};
export function face(fig, name, fade = 0.12) {
  const e = FACES[name] ?? name;
  if (typeof e === 'string') fig.setExpression(e, { fade });
  else { fig.exprName = name; fig.exprTarget = { ...e }; fig.exprFade = Math.max(0.01, fade); }
}

// ------------------------------------------------------------------------------------------ the gloss
// k = 1: PRETTY (a mirror: roughness down, full clearcoat). k = 0: GUILTY (matte). The switch is the "gloss off".
export class Gloss {
  constructor(fig) {
    this.fig = fig; this.k = 1; this.target = 1; this.rate = 30;
    const u = fig.bodyU;
    this.skin0 = u.fSkinMat.value.clone();
    this.lay0 = u.fLayMat.value.map((v) => v.clone());
    this.extra = [];
    fig.root.traverse((o) => { if (o.isMesh && o.material && o.material.clearcoat !== undefined && !this.extra.some((x) => x.m === o.material)) this.extra.push({ m: o.material, r: o.material.roughness, c: o.material.clearcoat }); });
  }
  set(target, rate = 30) { this.target = target; this.rate = rate; }
  snap(k) { this.k = this.target = k; this.apply(); }
  update(dt) { if (Math.abs(this.k - this.target) > 1e-3) { this.k += (this.target - this.k) * Math.min(1, dt * this.rate); this.apply(); } }
  apply() {
    const k = this.k, u = this.fig.bodyU;
    u.fSkinMat.value.set(THREE.MathUtils.lerp(0.42, 0.05, k), THREE.MathUtils.lerp(0.15, 1.0, k), THREE.MathUtils.lerp(0.4, 0.025, k), this.skin0.w);
    u.fLayMat.value.forEach((v, i) => { const b = this.lay0[i]; if (b.w > 0.5) return; v.set(THREE.MathUtils.lerp(Math.max(0.5, b.x), Math.min(0.12, b.x), k), THREE.MathUtils.lerp(0.12, b.y, k), THREE.MathUtils.lerp(0.45, b.z, k), b.w); });
    for (const e of this.extra) { e.m.roughness = THREE.MathUtils.lerp(Math.max(0.5, e.r), e.r, k); e.m.clearcoat = THREE.MathUtils.lerp(0.1, e.c, k); }
  }
}

// ------------------------------------------------------------------------------------------ the boss
// PRETTY reflects: strikes and rings glance off. Gold returns, counters, parry openings, the spotlight and her
// empty bar land anyway. GUILTY takes everything. (court.js owns the state.)
export class Defendant extends Boss {
  constructor(body, opts, court) { super(body, opts); this.court = court; }
  takeHit(info) {
    if (!this.targetable) return { landed: false };
    const c = this.court;
    // glancing off PRETTY is a deflect like any guard's (the fight's: your combo goes, with its thud)
    if (c && !this._lands(info)) { c.deflect(info); this.emit('deflect', info); return { landed: false, deflected: true }; }
    if (c) info = c.hitTaken(info);
    return super.takeHit(info);
  }
  _lands(info) {
    const c = this.court;
    if (!c.pretty) return true;
    // what comes back at her lands, and so does what the room does to her (thrown into a wall, brought down out of the air)
    if (info.kind === 'return' || info.kind === 'slam' || this.blinded) return true;
    if (this.state === 'open' || this.state === 'stagger' || this.state === 'desperate' || this.hp <= 0) return true;
    // the cut of a hit sent back, and a strike after a slip (a counter)
    if (info.kind === 'strike' && (info.riposte || c.isCounter(info))) return true;
    return false;
  }
}

let kit = null;
export async function buildDefendant(f, court, hp) {
  if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
  const fig = await buildFigurine(kit, SPEC);
  f.scene.add(fig.root);
  try { splitBun(fig); } catch (e) { console.warn('ppg: bun split', e.message); }
  // props
  const P = {};
  P.knife = makeKnife(); P.knifeH = onBone(fig, 'hand_r', P.knife, [0.0, 0.08, 0.02], [0, 0, Math.PI / 2]);
  P.lipstick = makeLipstick(); P.lipstickH = onBone(fig, 'hand_r', P.lipstick, [0.0, 0.085, 0.03], [0, 0, 0]);
  P.compact = makeCompact(); P.compactH = onBone(fig, 'hand_l', P.compact, [0.0, 0.08, 0.04], [0, 0, 0]);
  P.key = makeGiantKey(); P.keyH = onBone(fig, 'hand_r', P.key, [0.0, 0.1, 0.0], [0, 0, Math.PI / 2]); P.key.scale.setScalar(0.9);
  P.cuff = makeCuff(); P.cuffH = onBone(fig, 'hand_r', P.cuff, [0.0, 0.09, 0.03], [0, 0, 0]);
  P.zippo = makeZippo(); P.zippoH = onBone(fig, 'hand_r', P.zippo, [0.0, 0.08, 0.03], [0, 0, 0]);
  P.gas = makeGasCan(); P.gasH = onBone(fig, 'hand_r', P.gas, [0.0, 0.1, -0.05], [0, 0, 0]);
  P.charm = makeGavelCharm(); P.charmH = onBone(fig, 'spine_03', P.charm, [0, 0.02, 0.11], [0, 0, 0]);
  P.jacket = makeJacketShell(); P.jacketH = onBone(fig, 'spine_03', P.jacket, [0, 0.1, 0.0], [0, 0, 0]);
  P.bubble = makeBubble(); P.bubbleH = onBone(fig, 'Head', P.bubble, [0, 0.0, 0.14], [0, 0, 0]);
  for (const k of ['knife', 'lipstick', 'key', 'cuff', 'zippo', 'gas', 'jacket', 'bubble']) P[k].visible = false;
  P.compact.visible = false;
  const show = (name, on = true) => { if (P[name]) P[name].visible = on; };
  const b = new Defendant({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE DEFENDANT', hp, notches: [0.75, 0.5, 0.25], pieces: SPEC.breaks, radius: 0.85 }, court);
  b.props = P; b.show = show; b.gloss = new Gloss(fig);
  b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Jog_Fwd_Loop';
  b.idle = 'Idle_FoldArms_Loop'; b.loop('Idle_FoldArms_Loop');
  b.faceTarget = f.player;
  face(fig, 'smug', 0.01);
  return b;
}
