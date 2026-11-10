// THE TENANT: a 1960s Hollywood housewife in porcelain, at home in your head. Lilac silk housecoat, pearls, a
// champagne bouffant with a pink roller forgotten in it, a coupe she never puts down and your keys on her wrist.
// She strolls and never runs; she arrives through doors and leaves through walls (her portraits). She doesn't
// flinch when you hit her. She flinches when you break her things.
import * as THREE from 'three';
import { buildFigurine, EXPRESSIONS } from '../../game/figurine.js';
import { ACCESSORIES } from '../../game/figurine/accessories.js';
import { Boss } from '../../game/boss.js';
import { paintedFigureTexture } from './paint.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const placeM = (p, e = [0, 0, 0], s = 1) => new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2], 'YXZ')), new THREE.Vector3(s, s, s));
const lathe = (pts, seg = 40) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.computeVertexNormals(); return g; };
const mesh = (g, m, n = '') => { const o = new THREE.Mesh(g, m); o.name = n; o.castShadow = true; o.receiveShadow = true; return o; };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// one mesh from several placed pieces (the figurine kit fractures every mesh it shatters: few meshes, few shards)
function merged(parts, m, name = '') {
  const gs = parts.map((o) => { o.updateMatrix(); const g = o.geometry.clone().applyMatrix4(o.matrix); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g.index ? g : g; });
  return mesh(mergeGeometries(gs, false), m, name);
}

// ---------------------------------------------------------------------------------------------- her faces
const N0 = EXPRESSIONS.neutral;
Object.assign(EXPRESSIONS, {
  tenantHome: { ...N0, smileL: 0.6, smileR: 0.32, lidT: 0.55, lidB: 0.16, browIL: 0.12, browOL: 0.6, browIR: -0.05, browOR: 0.12, cheek: 0.28, gazeY: -0.04, pupil: 0.95 },
  tenantDarling: { ...N0, pucker: 0.95, pout: 0.7, smileL: 0.15, smileR: 0.05, lidT: 0.48, lidB: 0.1, browIL: 0.4, browOL: 0.5, browIR: 0.25, browOR: 0.2, cheek: 0.3 },
  tenantHaha: { ...N0, jaw: 0.62, smileL: 1.0, smileR: 1.0, cheek: 1.0, lidT: 1.0, lidB: 0.6, happy: 1.0, browIL: 0.6, browOL: 0.35, browIR: 0.6, browOR: 0.35 },
  tenantMine: { ...N0, jaw: 0.24, smileL: 1.0, smileR: 1.0, lidT: -0.1, lidB: 0.0, browIL: 0.5, browOL: 0.85, browIR: 0.5, browOR: 0.85, cheek: 0.65, iris: 1.06, pupil: 0.75 },
  tenantEvicted: { ...EXPRESSIONS.shock, jaw: 0.7, pucker: 0.5 },
  tenantSleep: { ...N0, lidT: 1.05, lidB: 0.45, smileL: 0.45, smileR: 0.3, cheek: 0.3 },
});

// ---------------------------------------------------------------------------------------------- her props
// her bouffant is glazed by the kit (it cracks, it breaks off at a notch, it shatters); the small props wear plain
// physical materials so the shatter planner (which has a shard budget) leaves them out: they vanish in the burst
let PM = null;
const pm = () => PM || (PM = {
  glass: new THREE.MeshPhysicalMaterial({ color: '#f6eeff', roughness: 0.08, clearcoat: 1, transmission: 0, opacity: 0.92, transparent: true, sheen: 0.4, sheenColor: new THREE.Color('#ffd6f6') }),
  gold: new THREE.MeshPhysicalMaterial({ color: '#e9b949', metalness: 1, roughness: 0.22 }),
  brass: new THREE.MeshPhysicalMaterial({ color: '#d8a85a', metalness: 1, roughness: 0.3 }),
  pink: new THREE.MeshPhysicalMaterial({ color: '#ff5aa8', roughness: 0.12, clearcoat: 1 }),
  cherry: new THREE.MeshPhysicalMaterial({ color: '#a0081c', roughness: 0.15, clearcoat: 1 }),
  fluff: new THREE.MeshStandardMaterial({ color: '#fff4f8', roughness: 0.9 }),
  roller: new THREE.MeshPhysicalMaterial({ color: '#f59bc3', roughness: 0.2, clearcoat: 1 }),
  lilac: new THREE.MeshPhysicalMaterial({ color: '#c86aff', roughness: 0.2, clearcoat: 1 }),
  set: new THREE.MeshPhysicalMaterial({ color: '#eadbb8', metalness: 0.35, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.4, iridescenceIOR: 1.5, sheen: 0.3, sheenColor: new THREE.Color('#ffd8e8') }),
});
const SET_QUARTERS = ['setBL', 'setBR', 'setFL', 'setFR'];
function setQuarter(ctx, o, k) {
  const { I } = ctx;
  const m = pm().set;
  const g = new THREE.Group();
  // a quarter of the bouffant dome: the crown volume of a perfect set
  const phi0 = [Math.PI, Math.PI * 1.5, Math.PI * 0.5, 0][k];
  const dome = mesh(new THREE.SphereGeometry(1, 20, 12, phi0, Math.PI / 2, 0, Math.PI * 0.55), m, 'set');
  dome.scale.set(0.112, 0.092, 0.122);
  g.add(dome);
  const at = V3(I.headC.x, I.headC.y + 0.045, I.headC.z - 0.02);
  return { root: g, bone: 'Head', bind: placeM(at) };
}
ACCESSORIES.tenantSetBL = (ctx, o) => setQuarter(ctx, o, 0);
ACCESSORIES.tenantSetBR = (ctx, o) => setQuarter(ctx, o, 1);
ACCESSORIES.tenantSetFL = (ctx, o) => setQuarter(ctx, o, 2);
ACCESSORIES.tenantSetFR = (ctx, o) => setQuarter(ctx, o, 3);

ACCESSORIES.tenantRoller = (ctx) => {
  const { I } = ctx;
  const g = new THREE.Group();
  const r = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.07, 18), pm().roller, 'roller'); r.rotation.z = Math.PI / 2; g.add(r);
  const pin = mesh(new THREE.BoxGeometry(0.004, 0.004, 0.06), pm().gold, 'pin');
  pin.position.set(I.side * -0.07, 0.03, 0.1); pin.rotation.x = 0.4; g.add(pin);
  return { root: g, bone: 'Head', bind: placeM(V3(I.headC.x + I.side * 0.03, I.headC.y + 0.06, I.headC.z - 0.105), [0.2, 0, 0]) };
};
ACCESSORIES.tenantCoupe = (ctx) => {
  const { I } = ctx;
  const g = new THREE.Group();
  const glass = pm().glass, gold = pm().gold, pink = pm().pink;
  const cup = mesh(lathe([[0.004, 0], [0.026, 0.0], [0.028, 0.004], [0.006, 0.01], [0.004, 0.07], [0.014, 0.076], [0.05, 0.086], [0.062, 0.098], [0.0605, 0.1], [0.012, 0.081], [0, 0.08]]), glass, 'coupe');
  g.add(cup);
  const rim = mesh(new THREE.TorusGeometry(0.061, 0.0025, 8, 40), gold, 'rim'); rim.rotation.x = Math.PI / 2; rim.position.y = 0.099; g.add(rim);
  const liquid = mesh(new THREE.CylinderGeometry(0.052, 0.012, 0.012, 32), pink, 'drink'); liquid.position.y = 0.09; g.add(liquid);
  const cherry = mesh(new THREE.SphereGeometry(0.011, 12, 10), pm().cherry, 'cherry'); cherry.position.set(0.02, 0.098, 0.01); g.add(cherry);
  // held at the fingers, upright
  const h = I.J.hand_r;
  return { root: g, bone: 'hand_r', bind: placeM(V3(h.x - I.side * 0.075, h.y - 0.02, h.z + 0.035), [0, 0, 0]) };
};
ACCESSORIES.tenantKeys = (ctx) => {
  const { I } = ctx;
  const g = new THREE.Group();
  const gold = pm().gold, brass = pm().brass;
  const ring = mesh(new THREE.TorusGeometry(0.045, 0.0035, 8, 40), gold, 'keyring'); ring.rotation.y = Math.PI / 2; g.add(ring);
  const keys = new THREE.Group(); keys.name = 'keys'; g.add(keys);
  const brassP = [], goldP = [];
  for (let i = 0; i < 6; i++) {
    const long = i === 3, L = long ? goldP : brassP;
    const a = (i / 6) * Math.PI * 2;
    const k = new THREE.Group(); k.position.set(0, Math.cos(a) * 0.045 - 0.012, Math.sin(a) * 0.045); k.rotation.x = Math.sin(a) * 0.4; k.updateMatrix();
    const pieces = [new THREE.Mesh(new THREE.TorusGeometry(long ? 0.012 : 0.009, 0.0028, 6, 16))];
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.004, long ? 0.07 : 0.04, 0.004)); sh.position.y = -(long ? 0.047 : 0.03); pieces.push(sh);
    for (let t = 0; t < 2; t++) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.01)); tooth.position.set(0, -(long ? 0.07 : 0.042) + t * 0.012, 0.006); pieces.push(tooth); }
    for (const p of pieces) { p.updateMatrix(); p.matrix.premultiply(k.matrix); p.matrix.decompose(p.position, p.quaternion, p.scale); L.push(p); }
  }
  keys.add(merged(brassP, brass, 'brasskeys')); keys.add(merged(goldP, gold, 'sparekey'));
  const h = I.J.hand_l;
  return { root: g, bone: 'hand_l', bind: placeM(V3(h.x - I.side * 0.0, h.y, h.z)) };
};
ACCESSORIES.tenantCuffs = (ctx) => {
  const { I } = ctx;
  const fluff = pm().fluff;
  const out = [];
  for (const s of ['l', 'r']) {
    const a = I.J['lowerarm_' + s], b = I.J['hand_' + s];
    const p = a.clone().lerp(b, 0.42);
    const g = new THREE.Group();
    const tg = new THREE.TorusGeometry(0.05, 0.024, 12, 30); const pa = tg.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) { const n = 1 + 0.18 * Math.sin(pa[i] * 260) * Math.sin(pa[i + 1] * 210 + pa[i + 2] * 170); pa[i] *= n; pa[i + 1] *= n; pa[i + 2] *= n; } tg.computeVertexNormals();
    const t = mesh(tg, fluff, 'marabou'); t.rotation.y = Math.PI / 2; t.scale.set(1, 1.05, 1.15); g.add(t);
    out.push({ root: g, bone: 'lowerarm_' + s, bind: placeM(p) });
  }
  return { root: new THREE.Group(), multi: out };
};
ACCESSORIES.tenantBow = (ctx) => {
  const { I } = ctx;
  const gold = pm().gold;
  const g = new THREE.Group(), parts = [];
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 24)); l.position.set(s * 0.032, 0.01, 0); l.rotation.y = Math.PI / 2 + s * 0.4; l.scale.set(1, 0.7, 1); parts.push(l); }
  for (const s of [-1, 1]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.006)); tl.position.set(s * 0.018, -0.07, 0.004); tl.rotation.z = s * 0.25; parts.push(tl); }
  parts.push(new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8)));
  g.add(merged(parts, gold, 'bow'));
  const zf = I.zMid(I.Y.waist) + 0.07;
  return { root: g, bone: 'pelvis', bind: placeM(V3(I.side * 0.1, I.Y.waist - 0.01, zf), [0, I.side * 0.5, 0]) };
};
ACCESSORIES.tenantPhone = (ctx) => {
  const { I } = ctx;
  const lil = pm().lilac;
  const g = new THREE.Group(), parts = [];
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.12, 4, 10)); body.rotation.z = Math.PI / 2; parts.push(body);
  for (const s of [-1, 1]) { const cup = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8)); cup.position.set(s * 0.075, -0.012, 0); cup.scale.set(1, 0.6, 1); parts.push(cup); }
  g.add(merged(parts, lil, 'handset'));
  const h = I.J.hand_l;
  return { root: g, bone: 'hand_l', bind: placeM(V3(h.x + I.side * 0.07, h.y - 0.025, h.z + 0.02)) };
};

// ---------------------------------------------------------------------------------------------- the figurine
export const SPEC = {
  name: 'THE TENANT', body: 'female', scale: 1.22, porcelain: 0xf7e4df, gold: 0xe9b949,
  skin: { roughness: 0.25, coatRough: 0.06, translucency: 0.25 },
  layers: [
    { kind: 'top', neckline: 'scoop', sleeves: null, color: 0xf6c1b0, finish: 'satin', trim: { color: 0xffffff, width: 0.006, relief: 0.0004 } },
    { kind: 'top', neckline: 'plunge', depth: 0.17, width: 0.11, sleeves: 'forearm', legs: 'calf', color: 0xc86aff, finish: 'gloss', trim: { color: 'gold', width: 0.016, relief: 0.0009 }, shell: { thickness: 0.009, smooth: 6 } },
    { kind: 'belt', at: 'waist', width: 0.07, color: 0xe9b949, finish: 'gold' },
  ],
  hair: { style: 'parted', color: 0xeadbb8, finish: 'pearl', gild: 0.55, relief: 1.2 },
  face: {
    brows: { color: '#1c1210', shape: 'arch', thick: 0.75, lift: 0.35 },
    liner: { color: '#0b0706', thick: 1.45, wing: 1.7 },
    lashes: { color: '#0b0706', n: 11, len: 1.25, lower: 0.25 },
    shadow: { color: '#a46ad8', amount: 0.75 },
    lips: { color: '#c0102a', shape: 'heart', line: 0.45, gloss: 0.85 },
    blush: { color: '#f2b9be', amount: 0.42 },
    marks: [{ at: 'lip', side: -1, r: 0.0017 }],
  },
  eyes: { iris: 0x6b3fa0, iris2: 0x3a1d60, white: 0.35 },
  accessories: [
    { type: 'pearls', strands: 3, size: 0.0068 },
    { type: 'skirt', from: 'waist', to: 'knee', flare: 1.12, color: 0xc86aff, finish: 'gloss', trim: { hem: 0.018, waist: 0.0, gold: true } },
    { type: 'shoes', from: 'ankle', color: 0xc86aff, toe: 'round', smooth: 10 },
    { type: 'tenantSetBL', name: 'setBL' }, { type: 'tenantSetBR', name: 'setBR' }, { type: 'tenantSetFL', name: 'setFL' }, { type: 'tenantSetFR', name: 'setFR' },
    { type: 'tenantRoller', name: 'roller' },
    { type: 'tenantCoupe', name: 'coupe' },
    { type: 'tenantKeys', name: 'keys' },
    { type: 'tenantCuffs', name: 'cuffs' },
    { type: 'tenantBow', name: 'bow' },
    { type: 'tenantPhone', name: 'phone' },
  ],
  // the notches: the pearls, the back-left of her set (her head is hollow and lit inside), her right hand
  breaks: ['pearls', 'setBL', 'hand_r'],
};

// ---------------------------------------------------------------------------------------------- the boss
// direct hits land honestly (cracks, chips, the bar) but she doesn't flinch; a claim's thread is what moves her
export class TenantBoss extends Boss {
  takeHit(info) {
    if (info.kind === 'claim') {
      const was = this.intangible; this.intangible = false;
      const r = super.takeHit(info); this.intangible = was;
      return r;
    }
    // behind the crawlspace lattice your blades meet wood (rings and gold still go through its gaps)
    if (this.tenant && this.tenant.lattice && info.kind === 'strike') { this.emit('deflect', info); return { landed: false, deflected: true }; }
    const r = super.takeHit(info);
    if (r.landed) { this.flinchK = 0; this.tenant && this.tenant.directHit(info, r); }
    return r;
  }
}

export async function buildTenant(f, kit) {
  const fig = await buildFigurine(kit, SPEC);
  f.scene.add(fig.root);
  const b = new TenantBoss({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE TENANT', hp: 5500, notches: [0.75, 0.5, 0.25], pieces: SPEC.breaks, radius: 0.7 });
  b.idle = 'Idle_Talking_Loop'; b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Walk_Formal_Loop';
  b.loop('Idle_Talking_Loop');
  b.faceTarget = f.player;
  b.behaveOpts = { r: 6, rMin: 4.5, rMax: 7, speed: 1.7, dir: 1 };
  // no flinch from a direct hit: 40 ms of her pose held, the crack, the chips
  const hitAt = fig.hitAt.bind(fig);
  fig.hitAt = (p, d, o = {}) => { const f0 = fig.rig.flinch; const r = hitAt(p, d, o); if (!b.tenant || !b.tenant._flinchNext) { fig.rig.flinch = f0; fig.rig.hitStop(0.04); } if (b.tenant) b.tenant._flinchNext = false; return r; };
  const phone = fig.acc.find((a) => a.name === 'phone'); if (phone) for (const o of phone.objects) o.visible = false;
  await fig.prepare(f.app.renderer, f.cam.cam, f.scene);
  return { fig, boss: b };
}

// ---------------------------------------------------------------------------------------------- her brain
// Modes: free (her habits run: keep her distance, the backhand reflex, the frame-walk reflex), script (a scripted
// move owns her), lounge (seated on a claim), frame (painted into her portraits), evicted (on the floor, open),
// floor (in the floorboards), gone (walked out). Every timed step checks a generation so a rewind cancels it.
export class Tenant {
  constructor(f, boss, fig, hooks = {}) {
    this.f = f; this.b = boss; this.fig = fig; this.hooks = hooks;
    boss.tenant = this;
    this.mode = 'free'; this.gen = 0; this.until = 0; this.seat = null; this.frame = null;
    this.expr = 'tenantHome'; this.exprUntil = 0;
    this.near = 0; this.hits = []; this.slapLock = 0; this.reflexLock = 0;
    this.portraits = () => [];          // the track hands in the standing portraits
    this.wrecked = false;
    this.lookDown = 0;
    this.painted = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.68), new THREE.MeshBasicMaterial({ map: paintedFigureTexture(), transparent: true, depthWrite: false }));
    this.painted.visible = false; this.painted.renderOrder = 4; f.scene.add(this.painted);
    this.keysObj = null; fig.root.traverse((o) => { if (o.name === 'keys') this.keysObj = o; });
    // her coupe stays upright in her hand (she never spills a drop) and your keys hang from her wrist
    const coupe = fig.acc.find((a) => a.name === 'coupe');
    this.upright = [{ acc: coupe, obj: coupe && coupe.objects[0], swing: 0 }, { acc: fig.acc.find((a) => a.name === 'keys'), obj: this.keysObj, swing: 1 }].filter((u) => u.obj);
    this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._e = new THREE.Euler();
    fig.setExpression('tenantHome', { fade: 0.01 });
  }
  get t() { return this.f.t; }
  get beat() { return this.f.beat; }
  get free() { return this.mode === 'free' && this.t >= this.until && this.b.state !== 'stagger'; }
  // a scripted move owns her from now to t1
  own(t1) { if (this.reflex && !this._ownReflex) this.dropReflex(); this.until = Math.max(this.until, t1); if (this.mode === 'free') this.mode = 'script'; }
  release() { if (this.mode === 'script') this.mode = 'free'; }
  later(t, fn) { const g = this.gen; this.f.at(t, (ff) => { if (g === this.gen) fn(ff); }); }

  face(name, beats = 0) {
    if (this.wrecked && name === 'tenantHome') name = 'tenantEvicted';
    this.fig.setExpression(name, { fade: 0.1 });
    this.exprUntil = beats > 0 ? this.t + beats * this.beat : 0;
  }
  // she strolls; she never runs (1.7 m/s, or what it takes to arrive on the beat, up to 3)
  stroll(x, z, arrive = null, { easing = 'inOut' } = {}) {
    const b = this.b, d = Math.hypot(x - b.x, z - b.z);
    const dur = arrive !== null ? Math.max(0.2, arrive - this.t) : Math.max(0.2, d / 1.7);
    b.moveTo(x, z, dur, { easing, now: this.t });
    return this.t + dur;
  }
  perform(clip, at, o = {}) { this.b.perform(clip, { duration: Math.max(0.15, at - this.t), ...o }); }
  // hold a loop (conducting, seated) until song time t1: her walk/idle picking stays out of it
  hold(clip, t1, fade = 0.2) { const b = this.b; b.rig.play(clip, { fade }); b._locoClip = ''; b.busyUntil = Math.max(b.busyUntil || 0, t1); }
  upper(clip, o = {}) { this.fig.rig.upperOnce(clip, o); }

  // ---------- reacting
  directHit(info, r) {
    this.hits.push(this.t);
    this.lookDown = 0.45;
  }
  // a claim's thread lands on her: the only real flinch
  lashed(c, at, from) {
    const f = this.f, b = this.b, fig = this.fig;
    const head = from.y > 1.6;
    const evict = c.occupant === 'boss' && (this.mode === 'lounge' || this.mode === 'frame') && (this.seat === c || this.frame === c || (this.frame && this.frame.dst === c) || (this.frame && this.frame.src === c));
    if (evict) this.evict(c);
    this._flinchNext = true;
    const dir = new THREE.Vector3(b.x - from.x, 0, b.z - from.z).normalize();
    if (b.targetable || evict) fig.hitAt(new THREE.Vector3(b.x, head ? 1.9 : 1.45, b.z), dir, { power: 1.3 });
    this._flinchNext = false;
    b.takeHit({ dmg: c.value + (evict ? 10 * 11 : 0), kind: 'claim', heavy: true, x: from.x, z: from.z, onBeat: false });
    if (this.mode === 'free' || this.mode === 'script') this.upper(head ? 'Hit_Head' : 'Hit_Chest', { duration: 0.42, from: 0.05, to: 0.75 });
    fig.rig.flinch = 1; fig.rig.flinchDir.copy(dir);
    this.face('tenantEvicted', 1);
    f.fx.sparks(b.x, 1.5, b.z, new THREE.Color(3.4, 2.2, 0.6), 16);
    this.hooks.lashed && this.hooks.lashed(c, evict);
  }
  // thrown out of the claim she was using: on the floor 1.5 bars, open to everything
  evict(c) {
    const f = this.f, b = this.b;
    this.gen++;
    const wasFrame = this.mode === 'frame';
    this.painted.visible = false;
    this.mode = 'evicted'; this.seat = null; this.frame = null;
    b.intangible = false; b.root.visible = true; b.root.scale.setScalar(1);
    b.move = null; b.root.position.y = 0;      // (thrown off a seat or your bed: onto the floor)
    if (wasFrame) { const p = this.hooks.floorBelow ? this.hooks.floorBelow(c) : { x: c.x, z: c.z + 1.2 }; b.place(p.x, p.z, Math.atan2(f.player.x - p.x, f.player.z - p.z)); }
    else { const a = Math.atan2(b.x - c.x, b.z - c.z) || 0; b.place(c.x + Math.sin(a) * 1.1, c.z + Math.cos(a) * 1.1); }
    const t0 = this.t, bt = this.beat;
    b.perform('Hit_Knockback', { duration: bt * 1.3, then: null }); b.busyUntil = t0 + bt * 2.05;
    this.later(t0 + bt * 2, () => b.perform('LayToIdle', { duration: bt * 3.5, then: 'idle' }));
    if (b.hp > 0) { b.state = 'perform'; b.open(bt * 6); }
    this.until = t0 + bt * 6;
    this.later(t0 + bt * 6, () => { if (this.mode === 'evicted') this.mode = 'free'; });
    this.face('tenantEvicted', 4);
    this.hooks.evicted && this.hooks.evicted(c);
  }

  // ---------- her moves
  // BLOWN KISS: n sends on the pet name's beat R, one at YOU and the rest either side square to her line of sight;
  // all arrive together on R + 2 beats, a row of lipstick circles across where you stand
  kiss(n = 1, opts = {}) {
    const f = this.f, b = this.b, pl = f.player;
    if (this.mode === 'frame' || this.mode === 'gone') return;
    const R = this.t, end = R + 2 * this.beat;
    const ax = pl.x - b.x, az = pl.z - b.z, al = Math.hypot(ax, az) || 1;
    const px = -az / al, pz = ax / al;
    const off = [0, 1.7, -1.7, 3.4, -3.4, 5.1, -5.1].slice(0, n);
    if (!this.busyAnim()) { b.faceNow(pl.x, pl.z); this.upper('Spell_Simple_Shoot', { duration: 0.42, from: 0.25, to: 0.75 }); }
    this.face('tenantDarling', 2);
    for (const o of off) {
      const at = { x: clampX(f, pl.x + px * o), z: clampZ(f, pl.z + pz * o) };
      f.pat.lob(f, { from: opts.from || { x: b.x, z: b.z }, fromY: opts.fromY ?? 1.95, at, end, r: 0.9, shape: opts.shape || 'kiss', size: opts.size ?? 0.42, back: 24, peak: opts.peak ?? 1.1, silentCue: o !== 0 });
    }
    this.hooks.kissed && this.hooks.kissed(n, opts);
  }
  busyAnim() { return this.mode === 'lounge' || this.mode === 'evicted' || this.mode === 'floor'; }

  // BACKHAND: a pink cone toward YOU, fill B -> B + 2 beats; again if YOU is still there. Parry it: she's open a bar.
  // As a reflex it yields to the script: if one of her scripted attacks puts its shape down while the slap is still
  // filling, the slap is dropped (the design: her reflexes never fire inside a scripted attack's telegraph).
  backhand(B, opts = {}) {
    const f = this.f, b = this.b, bt = this.beat;
    if (this.mode === 'frame' || this.mode === 'gone' || this.mode === 'floor') return;
    const pl = f.player;
    const tgt = opts.at || pl;
    const ang = Math.atan2(tgt.x - b.x, tgt.z - b.z);
    const end = B + (opts.beats ?? 2) * bt;
    this._ownReflex = true; this.own(end + bt); this._ownReflex = false;
    const sh = { shape: 'cone', x: b.x, z: b.z, angle: ang, w: 2.8, h: 2.8, param: 0.95 };
    const start = f.encoreMode ? end - (end - B) * 0.72 : B;
    const g = f.tele.add({ ...sh, kind: 'pink', start, end });
    f.cue('pink', sh);
    const R = { g, end, reflex: !!opts.reflex, dropped: false, gen: this.gen };
    if (R.reflex) this.reflex = R;
    f.at(end, () => {
      // (a scripted attack that starts in the very frame the slap lands still wins)
      // (and one that would land a breath before a scripted attack starts)
      if (R.dropped || (R.reflex && (R.gen !== this.gen || (this.hooks.scriptLive && this.hooks.scriptLive(R.g)) || (this.hooks.scriptAhead && this.hooks.scriptAhead(this.t, 0.12))))) { R.dropped = true; R.g.dead = true; if (this.reflex === R) this.reflex = null; this.b.lockFacing = false; return; }
      const hit = f.resolveArea(sh, { kind: 'pink', damage: 1, melee: true });
      if (hit === 'parried') this.parried(); else if (hit === 'hit') this.face('tenantHaha', 2);
      f.sfx.impactArea && f.sfx.impactArea('pink', f.pan(sh.x), hit);
    });
    this.later(B, () => { if (R.dropped) return; b.faceNow(tgt.x, tgt.z); b.lockFacing = true; this.perform(opts.second ? 'Sword_Regular_B' : 'Sword_Regular_A', end + 0.18, { from: 0.0, to: 0.85 }); this.hooks.swish && this.hooks.swish(b.x); });
    this.later(end + 0.05, () => { b.lockFacing = false; if (!R.dropped) this.release(); });
    if (opts.again) this.later(end, () => { if (!R.dropped && Math.hypot(pl.x - b.x, pl.z - b.z) < 3.2 && b.state !== 'open' && !(this.hooks.scriptLive && this.hooks.scriptLive(null))) this.backhand(end, { second: true, reflex: R.reflex }); });
  }
  // a reflex slap gives way to the script: its shape goes, no hit, she lowers her hand
  dropReflex() {
    const R = this.reflex; if (!R || R.dropped) return;
    R.dropped = true; R.g.dead = true; this.reflex = null;
    this.b.lockFacing = false;
    if (this.t < R.end - this.beat * 0.6) this.b.rig.upperStop && this.b.rig.upperStop(0.15);
  }
  parried() {
    const b = this.b;
    this.gen++;
    b.lockFacing = false;
    b.perform('Hit_Chest', { duration: 0.5 });
    if (b.hp > 0) { b.state = 'perform'; b.open(this.beat * 4); }
    this.until = this.t + this.beat * 4;
    this.face('tenantEvicted', 2);
    this._flinchNext = true; this.fig.rig.flinch = 1; this._flinchNext = false;
    this.later(this.t + this.beat * 4, () => this.release());
    this.mode = 'script';
  }

  // FRAME-WALK: on F she reaches into a portrait and is painted into it; her painted self walks out of its edge and
  // into the destination (its eyes glint on F+2); on F+4 she hops out onto the floor in front of it.
  // beats: [reach, inSrc, inDst] scaled for the slow first one
  frameWalk(F, src, dst, { slow = false } = {}) {
    const f = this.f, b = this.b, bt = this.beat;
    if (!src || !src.alive || this.wrecked) return false;
    const k = slow ? 1.5 : 1;
    const tIn = F + bt * k, tDst = F + 2 * bt * k, tOut = F + 4 * bt * k;
    this.gen++; const g = this.gen;
    this.mode = 'script'; this.until = tOut + bt;
    const at = this.hooks.floorBelow(src);
    b.moveTo(at.x, at.z, Math.max(0.2, F - this.t), { now: this.t });
    this.later(F, () => { b.faceNow(src.x, src.z - 3); b.perform('Interact', { duration: bt * k * 1.1 }); this.hooks.silk && this.hooks.silk(src); });
    this.later(tIn, () => {
      this.mode = 'frame'; this.frame = { src, dst, t0: tIn, t1: tOut, phase: 'src' };
      src.occupant = 'boss';
      b.intangible = true; b.root.visible = false;
      f.fx.glitter(b.x, 1.6, b.z, new THREE.Color(3, 1.4, 3.4), 30, 0.6);
      this.paintIn(src, tIn, tDst, -1);
    });
    this.later(tDst, () => {
      if (this.mode !== 'frame') return;
      let d = this.frame.dst;
      if (!d || !d.alive) { const alt = this.portraits().filter((p) => p.alive && p !== src); d = alt.sort((a, c) => Math.hypot(c.x - f.player.x, c.z - f.player.z) - Math.hypot(a.x - f.player.x, a.z - f.player.z))[0] || null; }
      src.occupant = null;
      if (!d) { this.hopOut(src, tOut); return; }
      this.frame.dst = d; this.frame.phase = 'dst'; d.occupant = 'boss';
      const p = this.hooks.floorBelow(d); b.x = p.x; b.z = p.z;
      this.paintIn(d, tDst, tOut, 1);
      this.hooks.glint && this.hooks.glint(d);
    });
    this.later(tOut, () => { if (this.mode === 'frame') this.hopOut(this.frame.dst || src, tOut); });
    return true;
  }
  paintIn(c, t0, t1, dir) {
    const p = c.data.canvasPos; if (!p) return;
    this.painted.visible = true;
    this.painted.position.copy(p.pos); this.painted.quaternion.copy(p.quat);
    this.paintAnim = { c, t0, t1, dir, pos: p.pos.clone(), right: p.right.clone() };
  }
  hopOut(c, t) {
    const f = this.f, b = this.b, bt = this.beat;
    this.painted.visible = false; this.paintAnim = null;
    c.occupant = null;
    const p = this.hooks.floorBelow(c);
    b.place(p.x, p.z, Math.atan2(f.player.x - p.x, f.player.z - p.z));
    b.intangible = false; b.root.visible = true;
    b.perform('NinjaJump_Land', { duration: bt * 1.2 });
    f.fx.glitter(p.x, 1.4, p.z, new THREE.Color(3, 1.4, 3.4), 24, 0.8);
    this.hooks.hop && this.hooks.hop(p);
    this.mode = 'script'; this.frame = null;
    this.until = Math.max(this.until, t + bt);
    this.later(t + bt, () => this.release());
  }

  // LOUNGE: she sits on a claim (her chaise, a chair she's claimed); she doesn't attack while seated
  lounge(seat, sitAt, standAt, { face = 0 } = {}) {
    const f = this.f, b = this.b, bt = this.beat;
    if (!seat || !seat.alive || this.wrecked) return false;
    this.outOfFrame();
    this.gen++;
    this.mode = 'script'; this.until = standAt + bt;
    const p = seat.data.sit || { x: seat.x, z: seat.z, face: 0 };
    b.moveTo(p.x, p.z, Math.max(0.25, sitAt - bt - this.t), { now: this.t });
    this.later(sitAt - bt, () => { b.place(p.x, p.z, p.face); b.lockFacing = true; b.perform('Sitting_Enter', { duration: bt * 1.2, then: 'Sitting_Idle_Loop' }); });
    this.later(sitAt, () => { this.mode = 'lounge'; this.seat = seat; seat.occupant = 'boss'; this.face('tenantHome'); this.hold('Sitting_Idle_Loop', standAt, 0.3); });
    for (let s = sitAt + bt * 4; s < standAt - bt; s += bt * 8) this.later(s, () => { if (this.mode === 'lounge') this.upper('Consume', { duration: bt * 2.2, from: 0.1, to: 0.9 }); });
    this.later(standAt, () => this.stand());
    return true;
  }
  // she sits in something of YOURS (your bed, your armchair by the fire): no eviction from it
  sitOn(p, sitAt, standAt, { clip = 'Sitting_Idle_Loop', y = 0 } = {}) {
    const b = this.b, bt = this.beat;
    this.outOfFrame();
    this.gen++;
    this.mode = 'script'; this.until = standAt + bt;
    b.moveTo(p.x, p.z, Math.max(0.25, sitAt - bt - this.t), { now: this.t });
    this.later(sitAt - bt, () => { b.place(p.x, p.z, p.face); b.lockFacing = true; b.perform('Sitting_Enter', { duration: bt * 1.2 }); });
    this.later(sitAt, () => { this.mode = 'lounge'; this.seat = null; b.root.position.y = y; this.hold(clip, standAt, 0.3); });
    this.later(standAt, () => { b.root.position.y = 0; this.stand(); });
  }
  // if she's painted into a portrait when a scripted move needs her body, she steps straight out of it (otherwise the
  // move's new generation cancels her hop-out and she'd sit there invisible)
  outOfFrame() {
    if (this.mode !== 'frame') return;
    const b = this.b, fr = this.frame;
    if (fr) { if (fr.src) fr.src.occupant = null; if (fr.dst) fr.dst.occupant = null; }
    this.painted.visible = false; this.paintAnim = null; this.frame = null;
    b.root.visible = true; b.intangible = false; this.mode = 'script';
    this.f.fx.glitter(b.x, 1.4, b.z, new THREE.Color(3, 1.4, 3.4), 18, 0.6);
  }
  stand() {
    const b = this.b;
    if (this.mode !== 'lounge') return;
    if (this.seat) this.seat.occupant = null;
    this.seat = null; this.mode = 'script'; b.lockFacing = false; b.busyUntil = 0;
    b.perform('Sitting_Exit', { duration: this.beat * 1.2 });
    this.until = this.t + this.beat * 1.2;
    this.later(this.t + this.beat * 1.2, () => this.release());
  }

  // ---------- every frame
  update(dt) {
    const f = this.f, b = this.b, fig = this.fig, t = this.t, pl = f.player;
    // her death scene has her (death.js): her habits, her faces and her reflexes stand down; her keys still hang true
    if (b.scene) { this._hang(t, 0); this.near = 0; return; }
    if (this.exprUntil && t >= this.exprUntil) { this.exprUntil = 0; fig.setExpression(this.wrecked ? 'tenantEvicted' : 'tenantHome', { fade: 0.25 }); }
    // the painted self walking through her canvases
    if (this.paintAnim) {
      const A = this.paintAnim, k = Math.min(1, Math.max(0, (t - A.t0) / Math.max(0.01, A.t1 - A.t0)));
      const off = A.dir < 0 ? -k * 0.75 : (1 - Math.min(1, k * 1.6)) * 0.75;
      this.painted.position.copy(A.pos).addScaledVector(A.right, off);
      this.painted.scale.setScalar(1);
      this.painted.visible = A.dir < 0 ? k < 0.95 : true;
      if (!A.c.alive) { this.painted.visible = false; }
    }
    // the keys swing as she moves; a jingle on her steps (how you know where she is in the dark)
    this._hang(t, Math.min(1, (b._speed || 0) / 1.7));
    if (b.root.visible && (b._speed || 0) > 0.4) { this._walked = (this._walked || 0) + (b._speed || 0) * dt; if (this._walked > 0.85) { this._walked = 0; this.hooks.step && this.hooks.step(b.x); } }
    // a reflex slap still filling yields to any scripted attack that puts its shape down meanwhile
    // (or when a scripted move takes her over, or she's due to rest)
    if (this.reflex) { const R = this.reflex; if (R.dropped || t >= R.end) this.reflex = null; else if (R.gen !== this.gen || (this.hooks.reflexOk && !this.hooks.reflexOk(t)) || (this.hooks.scriptLive && this.hooks.scriptLive(R.g))) this.dropReflex(); }
    // she glances at a fresh crack
    if (this.lookDown > 0) { this.lookDown -= dt; if (fig.rig.lookTarget) fig.rig.lookTarget.set(b.x + Math.sin(b.facing) * 0.4, 0.6, b.z + Math.cos(b.facing) * 0.4); }
    if (this.mode === 'script' && t >= this.until) this.release();
    // her habits while she's free: keep her distance, slap you if you crowd her, leave through a wall if you get greedy
    b.behave = this.free ? 'keep' : 'hold';
    if (!this.free) { this.near = 0; return; }
    const dx = pl.x - b.x, dz = pl.z - b.z, d = Math.hypot(dx, dz);
    const inFront = Math.abs(angDiff(Math.atan2(dx, dz), b.facing)) < 1.1;
    this.near = d < 2.6 && inFront && pl.state !== 'dead' ? this.near + dt : 0;
    this.hits = this.hits.filter((h) => t - h < this.beat * 8);
    if (this.hooks.reflexOk && !this.hooks.reflexOk(t)) return;
    // her reflexes never fire inside a scripted attack's telegraph
    if (this.hooks.scriptLive && this.hooks.scriptLive(null)) return;
    if (this.near >= this.beat * 2 && t >= this.slapLock) {
      const nb = f.bm.nearest(t, 1); const B = nb.time > t + 0.02 ? nb.time : nb.time + this.beat;
      this.near = 0; this.slapLock = B + this.beat * 5;
      this.backhand(B, { again: true, reflex: true });
      return;
    }
    if (this.hits.length >= 3 && t >= this.reflexLock && !this.wrecked) {
      const ps = this.portraits().filter((p) => p.alive);
      // she's out of play from the next downbeat F to F + 4 beats: only if nothing scripted is due before she's back
      const bar0 = f.bm.barAt(t), F0 = f.bm.timeOfBar(bar0.bar + 1, 1);
      if (ps.length && !(this.hooks.scriptAhead && this.hooks.scriptAhead(t, F0 + this.beat * 5 - t))) {
        const far = ps.sort((a, c) => Math.hypot(c.x - pl.x, c.z - pl.z) - Math.hypot(a.x - pl.x, a.z - pl.z));
        const near = ps.slice().sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
        const dst = far[0] === near && far[1] ? far[1] : far[0];
        const bar = f.bm.barAt(t); const F = f.bm.timeOfBar(bar.bar + 1, 1);
        this.hits.length = 0; this.reflexLock = F + this.beat * 12;
        if (near !== dst || ps.length === 1) this.frameWalk(F, near, ps.length === 1 ? near : dst);
      }
    }
  }
  // her coupe stays upright in her hand and your keys hang from her wrist, swinging with her stride (sp 0..1)
  _hang(t, sp) {
    const b = this.b;
    for (const u of this.upright) {
      if (u.acc && u.acc.broken) continue;
      const par = u.obj.parent; if (!par) continue;
      par.getWorldQuaternion(this._q);
      this._e.set(u.swing ? Math.sin(t * 9) * 0.35 * sp + Math.sin(t * 2.3) * 0.06 : 0, b.facing, u.swing ? Math.sin(t * 7.1) * 0.12 * sp : 0, 'YXZ');
      this._q2.setFromEuler(this._e);
      u.obj.quaternion.copy(this._q.invert().multiply(this._q2));
    }
  }
  // put her back as she is at a section line
  reset(x, z, facing) {
    const b = this.b;
    this.gen++; this.mode = 'free'; this.until = 0; this.seat = null; this.frame = null; this.paintAnim = null;
    if (this.reflex) { this.reflex.dropped = true; this.reflex.g.dead = true; this.reflex = null; }
    this.painted.visible = false; this.near = 0; this.hits.length = 0; this.slapLock = 0; this.reflexLock = 0; this.lattice = false;
    b.root.position.y = 0; b.busyUntil = 0;
    b.intangible = false; b.root.visible = true; b.lockFacing = false; b.move = null;
    if (x !== undefined) b.place(x, z, facing);
    b.rig.upperStop(0.05);
    b.loop(b.idleClip || 'Idle_Talking_Loop');
    this.fig.setExpression(this.wrecked ? 'tenantEvicted' : 'tenantHome', { fade: 0.05 });
  }
}

const clampX = (f, x) => Math.max(f.bounds.minX + 0.8, Math.min(f.bounds.maxX - 0.8, x));
const clampZ = (f, z) => Math.max(f.bounds.minZ + 0.8, Math.min(f.bounds.maxZ - 0.8, z));
export { clampX, clampZ };
