// THE PRIZE INSIDE: a porcelain cereal-box mascot (Quaternius Superhero_Female at 1.3) who quotes the record's
// other bosses in cereal colours. Her figurine spec, her quote costumes (repainted in one frame by THE CUT), her
// props (spoon, gavel, selfie stick, phone, match, mini box, ring-light halo, pigtails), her faces, and PrizeBoss:
// PRETTY reflects, a gold return proves her GUILTY, the spotlight blinds her through PRETTY.
import * as THREE from 'three';
import { CharacterKit } from '../../engine/character.js';
import { buildFigurine } from '../../game/figurine.js';
import { Boss } from '../../game/boss.js';
import { paintFace } from '../../game/figurine/face.js';
import { FINISH } from '../../game/figurine/glaze.js';
import * as P from './paint.js';

// ---------------------------------------------------------------- the figurine
const GOLD = 0xf0c860, COBALT = 0x3a6aff, RED = 0xe8202e, CREAM = 0xfff6ee;
const GINGHAM = { type: 'plaid', color2: CREAM, period: 0.05, duty: 0 };
const L = {
  socks: { kind: 'boots', from: 'knee', color: 0xfdfcf8, finish: 'gloss', trim: { color: COBALT, width: 0.024, relief: 0.0007 } },
  gloves: { kind: 'gloves', from: 'forearm', color: 0xffffff, finish: 'satin', trim: 'gold' },
  sleeves: { kind: 'top', from: 'hips', neckline: 'high', sleeves: 'cap', color: RED, finish: 'gloss', pattern: GINGHAM, trim: 'gold' },
  bodice: { kind: 'top', from: 'hips', neckline: 'high', sleeves: null, color: 0xffd21a, finish: 'gloss', trim: 'gold' },
  barcode: { kind: 'belt', at: 'waist', width: 0.036, color: 0x101012, finish: 'gloss', pattern: { type: 'stripes', color2: 0xffffff, period: 0.011, duty: 0.5, dir: 'v' } },
  suit: { kind: 'top', from: 'hips', neckline: 'v', depth: 0.13, width: 0.07, sleeves: 'wrist', color: 0xff3a5a, finish: 'lacquer', trim: 'gold' },
  band: { kind: 'belt', at: 'bust', width: 0.075, color: RED, finish: 'gloss', trim: 'gold' },
  jacket: { kind: 'top', from: 'hips', neckline: 'plunge', depth: 0.24, width: 0.1, sleeves: 'knuckle', color: 0x0b0a0d, finish: 'satin', trim: 'gold', shell: { thickness: 0.009, smooth: 6 } },
};
const LAYERS = [L.socks, L.gloves, L.sleeves, L.bodice, L.barcode, L.suit, L.band, L.jacket];
const FACE_SELF = {
  brows: { color: '#2a52d8', shape: 'arch', thick: 0.75, lift: 0.25 },
  liner: { color: '#0b0706', thick: 1.1, wing: 0.9 },
  lashes: { color: '#0b0706', n: 9, len: 1.35, lower: 0.35 },
  shadow: { color: '#7aa0ff', amount: 0.35 },
  lips: { color: '#e8202e', shape: 'full', line: 0.25, gloss: 0.7 },
  blush: { color: '#ff8aa0', amount: 0.55 },
  marks: [{ at: 'eye', side: -1, r: 0.0022 }],
};
const FACE_MOURNER = { ...FACE_SELF, lips: { color: '#8a0f1e', shape: 'full', line: 0.4, gloss: 0.8 }, streaks: { color: '#0b0706', n: 2, len: 1.0 }, shadow: { color: '#3a2a3a', amount: 0.6 } };

export const SPEC = {
  name: 'THE PRIZE INSIDE', body: 'female', scale: 1.3, porcelain: 0xfbf6ef, gold: GOLD,
  skin: { roughness: 0.26, coatRough: 0.03, translucency: 0.7 },
  layers: LAYERS,
  hair: { style: 'buns', color: COBALT, finish: 'gloss' },
  face: FACE_SELF,
  eyes: { iris: 0x2a5aff, iris2: 0x0a1a6a, white: 0.25 },
  accessories: [
    { type: 'skirt', from: 'waist', to: 'midthigh', flare: 1.75, color: RED, finish: 'gloss', pattern: { ...GINGHAM, u: 28, v: 7 }, trim: { hem: 0.014, waist: 0.006, gold: true } },
    { type: 'shoes', from: 'ankle', color: 0xd8101e },
    { type: 'cuffs', at: 'wrist', finish: 'chrome', radius: 0.042, tube: 0.006 },
  ],
  // the notch pieces: the left pigtail and the halo are props (broken by the track); the third is her face
  breaks: ['pigtail', 'halo', 'face'],
};

// her faces: the face system's channels; the lip-sync opens the jaw on top
const EXPR = {
  grin: { jaw: 0.08, smileL: 1, smileR: 1, pucker: 0, browIL: 0.55, browOL: 0.5, browIR: 0.55, browOR: 0.5, sneer: 0, pout: 0, cheek: 0.85, lidT: 0.02, lidB: 0, happy: 0, iris: 1.06, pupil: 1.05, gazeY: 0.04 },
  wink: { jaw: 0.02, smileL: 0.95, smileR: 0.65, pucker: 0, browIL: 0.1, browOL: 0.9, browIR: -0.15, browOR: 0.05, sneer: 0, pout: 0, cheek: 0.8, lidT: 0.66, lidB: 0.34, happy: 0.6, iris: 1, pupil: 1, gazeY: 0.03 },
  smug: { jaw: 0.0, smileL: 0.85, smileR: 0.15, pucker: 0, browIL: 0.1, browOL: 0.75, browIR: -0.25, browOR: 0.1, sneer: 0.05, pout: 0, cheek: 0.3, lidT: 0.52, lidB: 0.2, happy: 0, iris: 1, pupil: 0.9, gazeY: -0.05 },
  laugh: { jaw: 0.6, smileL: 1, smileR: 1, pucker: 0, browIL: 0.5, browOL: 0.3, browIR: 0.5, browOR: 0.3, sneer: 0, pout: 0, cheek: 1, lidT: 1, lidB: 0.55, happy: 1, iris: 1, pupil: 1, gazeY: 0 },
  ow: { jaw: 0.32, smileL: 0.2, smileR: 0.2, pucker: 0.2, browIL: 1, browOL: 0.8, browIR: 1, browOR: 0.8, sneer: 0, pout: 0, cheek: 0, lidT: -0.12, lidB: 0, happy: 0, iris: 0.9, pupil: 0.5, gazeY: 0 },
};
export function setExpr(fig, name, fade = 0.12) { const e = EXPR[name]; if (!e || !fig) return; fig.exprName = name; fig.exprTarget = { ...e }; fig.exprFade = fade; }

// ---------------------------------------------------------------- the quote costumes
const normTrim = (t) => (!t ? null : t === 'gold' ? { color: 'gold', width: 0.011, relief: 0.0006, double: false } : { color: t.color ?? 'gold', width: t.width ?? 0.011, relief: t.relief ?? 0.0006, double: !!t.double });
const PDEF = { stripes: { period: 0.05, duty: 0.5, dir: 1 }, polka: { period: 0.05, duty: 0.2 }, sequins: { period: 0.011, duty: 1 }, plaid: { period: 0.11, duty: 1 }, pinstripe: { period: 0.02, duty: 0.08, dir: 0 } };
const normPat = (p) => { if (!p) return null; const D = PDEF[p.type] || {}; return { type: p.type, color2: p.color2 ?? 0xffffff, period: p.period ?? D.period, duty: p.duty ?? D.duty, dir: p.dir === 'v' ? 0 : p.dir === 'h' ? 1 : p.dir === 'd' ? 0.5 : (p.dir ?? D.dir ?? 0), seed: p.seed ?? 0 }; };
const PATTERN_ID = { stripes: 1, polka: 2, sequins: 3, plaid: 4, pinstripe: 5 };
const SEQ = { type: 'sequins', color2: 0xffb0c0, period: 0.011, duty: 1, seed: 3 };
export const COSTUMES = {
  self: { layers: [L.socks, L.gloves, L.sleeves, L.bodice, L.barcode, null, L.band, null], skirt: { color: RED, finish: 'gloss', pattern: GINGHAM }, face: 'self', cuffs: false, prop: 'spoon', tape: '#ffd21a' },
  defendant: { layers: [L.socks, L.gloves, null, { ...L.bodice, color: 0x0a0506, finish: 'lacquer' }, null, L.suit, null, null], skirt: { color: 0xff3a5a, finish: 'lacquer' }, face: 'self', cuffs: true, prop: 'gavel', tape: '#ff2a3a' },
  mourner: { layers: [{ ...L.socks, color: 0x141016, trim: 'gold' }, L.gloves, null, null, null, null, null, L.jacket], skirt: { color: 0x0b0a0d, finish: 'satin' }, face: 'mourner', cuffs: false, prop: 'stick', tape: '#141014', tape2: '#f0c860' },
  ex: { layers: [L.socks, L.gloves, null, { ...L.bodice, color: 0xd81838, finish: 'gloss', pattern: SEQ }, null, null, null, { ...L.jacket, color: 0x2a4aa8, finish: 'satin', pattern: { type: 'plaid', color2: 0xf4f6ff, period: 0.07, duty: 0 } }], skirt: { color: 0xd81838, finish: 'gloss', pattern: SEQ }, face: 'self', cuffs: false, prop: 'phone', tape: '#3a6aff' },
};

// ---------------------------------------------------------------- props (built in world metres: +y along the
// long axis, the grip at the origin), hung on her bones in her bind space
const chrome = () => new THREE.MeshPhysicalMaterial({ color: 0xdfe5ec, metalness: 0.55, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 });
const glaze = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.rough ?? 0.22, clearcoat: 1, clearcoatRoughness: 0.04, metalness: o.metal ?? 0, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1, envMapIntensity: 1.1 });
const goldM = () => new THREE.MeshPhysicalMaterial({ color: 0xf0c860, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 });
const M = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };

function spoon() {
  const g = new THREE.Group(), m = chrome();
  const h = M(new THREE.BoxGeometry(0.075, 1.0, 0.022), m); h.position.y = 0.25; g.add(h);
  const end = M(new THREE.SphereGeometry(0.06, 20, 12), m); end.scale.set(1, 1.5, 0.35); end.position.y = -0.24; g.add(end);
  const bowl = M(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), m);
  bowl.scale.set(1, 1.45, 0.42); bowl.rotation.x = -Math.PI / 2; bowl.position.set(0, 0.98, 0.0); g.add(bowl);
  const neck = M(new THREE.CylinderGeometry(0.03, 0.045, 0.2, 12), m); neck.position.y = 0.78; g.add(neck);
  return g;
}
function gavel() {
  const g = new THREE.Group(), red = glaze(0xd81830, { rough: 0.16 }), gold = goldM();
  const h = M(new THREE.CylinderGeometry(0.028, 0.034, 0.62, 16), glaze(0x7a1010)); h.position.y = 0.16; g.add(h);
  const head = M(new THREE.CylinderGeometry(0.095, 0.095, 0.34, 24), red); head.rotation.x = Math.PI / 2; head.position.y = 0.52; g.add(head);
  for (const z of [-0.12, 0.12]) { const b = M(new THREE.CylinderGeometry(0.099, 0.099, 0.035, 24), gold); b.rotation.x = Math.PI / 2; b.position.set(0, 0.52, z); g.add(b); }
  return g;
}
function selfieStick() {
  const g = new THREE.Group();
  const rod = M(new THREE.CylinderGeometry(0.014, 0.018, 1.2, 10), chrome()); rod.position.y = 0.5; g.add(rod);
  const cam = new THREE.Group(); cam.position.y = 1.12; g.add(cam);
  cam.add(M(new THREE.BoxGeometry(0.17, 0.12, 0.09), glaze(0xffd21a)));
  const lens = M(new THREE.CylinderGeometry(0.04, 0.045, 0.05, 20), glaze(0xe8202e)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.06; cam.add(lens);
  const cube = M(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2, roughness: 0.1, clearcoat: 1 }));
  cube.position.set(0.03, 0.09, 0); cam.add(cube); g.userData.flash = cube.material; g.userData.cam = cam;
  return g;
}
function phone() {
  const g = new THREE.Group();
  g.add(M(new THREE.BoxGeometry(0.09, 0.17, 0.014), glaze(0x15121a)));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.15), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 1.8) }));
  scr.position.z = 0.0075; g.add(scr);
  g.position.y = 0.06;
  const w = new THREE.Group(); w.add(g); return w;
}
function match() {
  const g = new THREE.Group();
  const [c, x] = P.canvas(16, 128); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ffffff' : '#e8202e'; x.fillRect(0, i * 16, 16, 16); }
  const st = M(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), new THREE.MeshPhysicalMaterial({ map: P.tex(c), roughness: 0.4, clearcoat: 0.6 })); st.position.y = 0.12; g.add(st);
  const head = M(new THREE.SphereGeometry(0.03, 16, 10), glaze(0xc8101e)); head.scale.set(1, 1.5, 1); head.position.y = 0.345; g.add(head);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.2, 0.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  fl.scale.set(0.8, 1.7, 0.8); fl.position.y = 0.42; fl.visible = false; g.add(fl); g.userData.flame = fl;
  return g;
}
function miniBox() {
  const t = P.miniBox();
  const side = new THREE.MeshPhysicalMaterial({ color: 0xffd21a, roughness: 0.35, clearcoat: 0.6 });
  const front = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 0.6 });
  const b = M(new THREE.BoxGeometry(0.25, 0.35, 0.09), [side, side, side, side, front, front]);
  b.position.y = 0.16; const g = new THREE.Group(); g.add(b); return g;
}
function blueCheck() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshPhysicalMaterial({ map: P.badgeTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.2, clearcoat: 1 }));
  m.position.y = 0.32; g.add(m); return g;
}
// the ring-light halo: a 0.95 m diffuser torus with a bright inner ring, and a real light on her face
function halo() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.475, 0.05, 16, 72), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, transmission: 0, emissive: 0xffffff, emissiveIntensity: 0.55, clearcoat: 1 })));
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.014, 8, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.8, 4.4) }));
  g.add(inner); g.userData.inner = inner.material;
  return g;
}
// a rigid pigtail: a tapered porcelain tail from under a bun, ending in a cartoon curl, tied with a red bow
function pigtail(side) {
  const g = new THREE.Group();
  const pts = [[0, 0, 0], [0.035 * side, -0.07, -0.02], [0.07 * side, -0.16, -0.035], [0.085 * side, -0.25, -0.03], [0.07 * side, -0.31, -0.005], [0.04 * side, -0.33, 0.01], [0.03 * side, -0.305, 0.03]].map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 40, 1, 12, false);
  const pos = geo.attributes.position, n = 41, ring = 13;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), r = 0.034 * (1 - k * 0.72), c = curve.getPointAt(k);
    for (let j = 0; j < ring; j++) { const v = i * ring + j; const x = pos.getX(v) - c.x, y = pos.getY(v) - c.y, z = pos.getZ(v) - c.z; pos.setXYZ(v, c.x + x * r, c.y + y * r, c.z + z * r); }
  }
  geo.computeVertexNormals();
  const tail = M(geo, glaze(COBALT, { rough: 0.15 })); g.add(tail);
  const red = glaze(0xe8202e, { rough: 0.15 });
  for (const s of [-1, 1]) { const lobe = M(new THREE.SphereGeometry(0.03, 14, 10), red); lobe.scale.set(1.3, 0.75, 0.55); lobe.position.set(0.034 * s, -0.012, 0.02); lobe.rotation.z = 0.5 * s; g.add(lobe); }
  const knot = M(new THREE.SphereGeometry(0.016, 12, 8), red); knot.position.set(0, -0.012, 0.022); g.add(knot);
  return g;
}

function brooch() {
  const sh = new THREE.Shape(), n = 14;
  for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? 0.055 : 0.085; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.Group();
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }), glaze(COBALT, { rough: 0.12 }));
  g.add(star);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.006, 8, 48), goldM()); rim.position.z = 0.008; g.add(rim);
  return g;
}
// the front of her body at (x, y) in bind space
function surfaceZ(I, x, y) { let z = -9; for (let v = 0; v < I.nv; v++) { if (Math.abs(I.pos[v * 3] - x) < 0.014 && Math.abs(I.pos[v * 3 + 1] - y) < 0.014) z = Math.max(z, I.pos[v * 3 + 2]); } return z > -9 ? z : 0.12; }
function bindPos(fig, name) { return new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(fig.boneInverse(name)).invert()); }
// hang obj on a bone: pos (bind space), its +y along yAxis, its +z toward zHint; world size = its own metres
function hang(fig, bone, obj, pos, yAxis, zHint, worldScale = true) {
  const y = yAxis.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, zHint).normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  const s = worldScale ? 1 / fig.scale : 1;
  const m = new THREE.Matrix4().makeBasis(x.multiplyScalar(s), y.multiplyScalar(s), z.multiplyScalar(s)).setPosition(pos);
  const local = fig.boneLocal(bone, m);
  const holder = new THREE.Group(); holder.name = 'prop:' + bone;
  local.decompose(holder.position, holder.quaternion, holder.scale);
  holder.add(obj); fig.bones[bone].add(holder);
  holder.userData.home = { parent: fig.bones[bone], p: holder.position.clone(), q: holder.quaternion.clone(), s: holder.scale.clone() };
  return holder;
}

// ---------------------------------------------------------------- the boss
// in the darks she's mint in her box, and the box is what YOU beats on: what lands on it counts for this much
export const BOXED = { dmg: 0.4, air: 1.5 };
export class PrizeBoss extends Boss {
  constructor(body, opts) {
    super(body, opts);
    this.costume = 'self';
    this.frozen = false;          // the freeze-frame (164.81): the commercial pauses
    this.returnMult = 2.1;        // her generosity is her weakness: a gold return is worth about three strikes
    this.onGuilty = null;
    this.boxed = false;           // in her window, behind the cellophane (set.js _box)
  }
  // how high she is, as YOU's strikes and rings read it: in her box she's up in its window, so a ring thrown from
  // across the table flies to the pane, and a cut made in the air goes up to it (the fight's own juggle height otherwise)
  get airY() { return this.boxed ? BOXED.air : this._airY || 0; }
  set airY(v) { this._airY = v || 0; }
  takeHit(info) {
    if (!this.targetable) return { landed: false };
    if (this.boxed) info = { ...info, dmg: info.dmg * BOXED.dmg, boxed: true };
    else if (info.kind === 'return') info = { ...info, dmg: info.dmg * this.returnMult, heavy: true };
    // between her openings the glaze is hard: strikes and rings land for less; open, staggered or blinded, full
    else if (this.state === 'perform' && !this.blinded) info = { ...info, dmg: info.dmg * 0.6 };
    if (this.guard === 'pretty' && (info.kind === 'return' || this.blinded)) {
      this.guard = null;
      if (info.kind === 'return' && this.onGuilty) this.onGuilty(info);
    }
    return super.takeHit(info);
  }
  update(dt, now, beat, player) { super.update(this.frozen ? 0 : dt, now, beat, this.lookAt || player); }
}

// everything about her body, costumes and props, built once
export class Prize {
  static async build(f) {
    if (!Prize.kit) { Prize.kit = new CharacterKit('assets/characters/'); await Prize.kit.init(); }
    const fig = await buildFigurine(Prize.kit, SPEC);
    return new Prize(f, fig);
  }
  constructor(f, fig) {
    this.f = f; this.fig = fig;
    f.scene.add(fig.root);
    const b = this.boss = new PrizeBoss({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE PRIZE INSIDE', hp: 3000, radius: 1.0, notches: [0.75, 0.5, 0.25], pieces: [null, null, 'face'] });
    b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop'); b.faceTarget = f.player;
    b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Jog_Fwd_Loop';
    // layer modes as built, so a costume can switch a layer off and back on
    const U = fig.bodyU;
    this.modes = U.fLayMode.value.map((v, i) => [v.clone(), U.fLayMode2.value[i].clone()]);
    this.faces = { self: fig.face.texture, mourner: paintFace(fig.I, FACE_MOURNER).texture };
    this.skirt = fig.acc.find((a) => a.type === 'skirt');
    this.cuffs = fig.acc.find((a) => a.type === 'cuffs');
    this.shell = fig.shells.find((m) => m.userData.figShell && m.userData.figShell.layer === 7) || null;
    this._props();
    this.dress('self');
    setExpr(fig, 'grin', 0.01);
    this.falling = [];
  }

  _props() {
    const fig = this.fig, bp = (n) => bindPos(fig, n);
    // a fist: the grip across the palm, the long axis out past the thumb, the face toward the knuckles
    const grip = (s) => {
      const hand = bp('hand_' + s), mid = bp('middle_01_' + s), idx = bp('index_01_' + s), pin = bp('pinky_01_' + s), arm = bp('lowerarm_' + s);
      const at = hand.clone().lerp(mid, 0.78);
      const fwd = mid.clone().sub(hand).normalize();
      const palm = new THREE.Vector3().crossVectors(fwd, idx.clone().sub(pin)).multiplyScalar(s === 'r' ? 1 : -1).normalize();
      at.addScaledVector(palm, 0.022);
      return { at, axis: idx.clone().sub(pin).normalize(), fwd, palm, arm };
    };
    const R = grip('r'), Lh = grip('l');
    this.props = {
      spoon: hang(fig, 'hand_r', spoon(), R.at, R.axis, R.fwd),
      gavel: hang(fig, 'hand_r', gavel(), R.at, R.axis, R.fwd),
      stick: hang(fig, 'hand_r', selfieStick(), R.at, R.axis, R.fwd),
      phone: hang(fig, 'hand_l', phone(), Lh.at, Lh.fwd, Lh.palm.clone().negate()),
      match: hang(fig, 'hand_r', match(), R.at, R.axis, R.fwd),
      mini: hang(fig, 'hand_l', miniBox(), Lh.at, Lh.axis, Lh.palm.clone().negate()),
      check: hang(fig, 'hand_l', blueCheck(), Lh.at, Lh.axis, Lh.palm.clone().negate()),
    };
    const I = fig.I, top = I.top ?? (I.headC.y + 0.12);
    this.props.halo = hang(fig, 'Head', halo(), new THREE.Vector3(0, I.headC.y + 0.035, I.headC.z - 0.2), new THREE.Vector3(0, Math.cos(0.21), -Math.sin(0.21)), new THREE.Vector3(0, Math.sin(0.21), Math.cos(0.21)));
    this.tails = [1, -1].map((s) => hang(fig, 'Head', pigtail(s), new THREE.Vector3(0.082 * s, top - 0.055, I.headC.z - 0.03), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), false));
    this.props.pigtail = this.tails[0];   // her left (the first to go)
    { const bx = 0.07 * (I.side || 1), by = (I.Y.chest ?? I.Y.bust + 0.05) + 0.01; this.props.brooch = hang(fig, 'spine_03', brooch(), new THREE.Vector3(bx, by, surfaceZ(I, bx, by) + 0.01), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)); }
    this.haloLight = { intensity: 0 };   // the halo is emissive; a real light per halo cost every lit pixel
    for (const k of ['gavel', 'stick', 'phone', 'match', 'mini', 'check']) this.props[k].visible = false;
  }
  show(name, on) { const p = this.props[name]; if (p) p.visible = !!on && !p.userData.broken; }
  get stickCam() { return this.props.stick.children[0].userData.cam; }

  // repaint her in one frame
  dress(name) {
    const fig = this.fig, C = COSTUMES[name]; if (!C) return;
    this.costume = this.boss.costume = name;
    const U = fig.bodyU;
    C.layers.forEach((l, i) => {
      if (!l) { U.fLayMode.value[i].set(2, -1, 0, 0); return; }
      U.fLayMode.value[i].copy(this.modes[i][0]); U.fLayMode2.value[i].copy(this.modes[i][1]);
      fig._layerUniforms(i, { ...l, trim: normTrim(l.trim), pattern: normPat(l.pattern) });
    });
    if (this.shell) this.shell.visible = !!C.layers[7];
    U.fFaceTex.value = this.faces[C.face] || this.faces.self;
    if (this.skirt) {
      const fin = FINISH[C.skirt.finish] || FINISH.gloss, pat = normPat(C.skirt.pattern);
      this.skirt.objects[0].traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material, u = m.userData.figUniforms;
        m.color.set(C.skirt.color); m.roughness = fin.rough; m.clearcoat = fin.coat; m.clearcoatRoughness = fin.coatRough;
        if (u && u.fAccStyle) { if (pat) { u.fAccStyle.value.set(PATTERN_ID[pat.type] || 0, pat.type === 'sequins' ? 60 : 28, pat.type === 'sequins' ? 16 : 7, pat.duty); u.fAccCol2.value.set(pat.color2); } else u.fAccStyle.value.set(0, 0, 0, 0); }
      });
    }
    if (this.cuffs) for (const o of this.cuffs.objects) o.visible = C.cuffs;
    for (const k of ['spoon', 'gavel', 'stick', 'phone']) this.show(k, k === C.prop);
    if (this.props.brooch) this.props.brooch.visible = name === 'self';
    this.show('match', false); this.show('mini', false); this.show('check', false);
  }

  // the matte of GUILTY (sheen gone, cold) and the lacquer of PRETTY
  sheen(pretty) {
    const fig = this.fig, U = fig.bodyU;
    if (this._sheen === pretty) return; this._sheen = pretty;
    U.fSkinMat.value.y = pretty ? 1 : 0.15; U.fSkinMat.value.x = pretty ? 0.26 : 0.55;
    for (let i = 0; i < 8; i++) { const m = U.fLayMat.value[i]; if (m._base === undefined) { m._base = m.y; m._baseR = m.x; } m.y = pretty ? m._base : m._base * 0.15; m.x = pretty ? m._baseR : Math.min(0.85, m._baseR + 0.35); }
  }
  // a red-lacquer highlight sweeping over her (PRETTY, once a beat), or a white ripple from a contact
  ripple(color = 0xff3a5a, k = 0.35, at = null) {
    const fig = this.fig, I = fig.I;
    fig.U.fFlashColor.value.set(color).multiplyScalar(k);
    if (at) fig.U.fFlash.value.set(at.x, at.y, at.z, 0); else fig.U.fFlash.value.set(0, I.Y.bust, 0.06, 0);
    fig.flashAge = 0;
  }

  // ---------------------------------------------------------------- notch pieces
  breakProp(name) {
    const p = name === 'pigtail' ? this.tails[0] : this.props[name];
    if (!p || p.userData.broken) return;
    p.userData.broken = true;
    p.updateWorldMatrix(true, true);
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    p.matrixWorld.decompose(pos, q, s);
    this.f.scene.attach(p);
    const away = pos.clone().sub(new THREE.Vector3(this.boss.x, pos.y, this.boss.z)).setY(0).normalize();
    this.falling.push({ o: p, v: away.multiplyScalar(1.4).add(new THREE.Vector3(0, 2.2, 0)), w: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3), name });
    if (name === 'halo') this.haloLight.intensity = 0;
  }
  restoreProps(broken) {
    const want = { pigtail: broken >= 1, halo: broken >= 2 };
    for (const name of ['pigtail', 'halo']) {
      const p = name === 'pigtail' ? this.tails[0] : this.props[name];
      if (!want[name] && p.userData.broken) {
        p.userData.broken = false; const h = p.userData.home;
        h.parent.add(p); p.position.copy(h.p); p.quaternion.copy(h.q); p.scale.copy(h.s); p.visible = true;
        this.falling = this.falling.filter((x) => x.o !== p);
      } else if (want[name] && !p.userData.broken) { p.userData.broken = true; p.visible = false; p.parent && p.parent.remove(p); }
    }
  }
  update(dt) {
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const b = this.falling[i];
      b.v.y -= 16 * dt; b.o.position.addScaledVector(b.v, dt);
      b.o.rotation.x += b.w.x * dt; b.o.rotation.y += b.w.y * dt; b.o.rotation.z += b.w.z * dt;
      if (b.o.position.y < 0.15) {
        // it shatters where it lands
        const at = b.o.position.clone();
        const col = b.name === 'halo' ? new THREE.Color(2.4, 2.4, 2.4) : new THREE.Color(0.5, 0.8, 2.6);
        this.f.fx.chips(at.x, 0.3, at.z, col, 26); this.f.fx.glitter(at.x, 0.4, at.z, new THREE.Color(3, 2.2, 0.7), 18, 0.8);
        this.f.sfx.s && this.f.sfx.s.shatter ? this.f.sfx.s.breakOff({ pan: this.f.pan(at.x), intensity: 0.6 }) : null;
        b.o.parent && b.o.parent.remove(b.o); b.o.visible = false;
        this.falling.splice(i, 1);
      }
    }
  }
}
