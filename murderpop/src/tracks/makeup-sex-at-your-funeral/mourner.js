// THE MOURNER: a glazed porcelain figurine in her dead boyfriend's brother's suit worn as a dress, a pillbox hat
// and birdcage veil, a blunt jet bob, perfect calligraphic mascara streaks. Her beauty sceptre (a chrome selfie
// stick, a phone at the top, a giant mascara brush at the bottom) is her weapon and her camera.
// Also here: the Boss she is (pose holds take x1.5 and don't flinch; she drifts to her marks on a soft spring
// with a drunk weave and SNAPS into poses; she faces YOU except when she turns her back for a shot).
import * as THREE from 'three';
import { CharacterKit } from '../../engine/character.js';
import { buildFigurine } from '../../game/figurine.js';
import { paintFace } from '../../game/figurine/face.js';
import { Boss } from '../../game/boss.js';

export const BLACK = 0x0b090d, SATIN = 0x16121a, GOLD = 0xe0b04c, RED = 0xc8102e, BISQUE = 0xefe8dc, PEARL = 0xf7f3ee;

const FACE = {
  brows: { color: '#0b090d', shape: 'thin', thick: 0.75, lift: 0.35 },
  liner: { color: '#060408', thick: 1.6, wing: 1.9 },
  lashes: { color: '#060408', n: 10, len: 1.25, lower: 0.55 },
  shadow: { color: '#b98a3c', amount: 0.5 },
  lips: { color: '#c8102e', shape: 'full', line: 0.4, gloss: 0.85 },
  blush: { color: '#f0b4be', amount: 0.34 },
  streaks: { color: '#08060a', n: 1, len: 2.3 },
  marks: [{ at: 'eye', side: 1, r: 0.0022 }],
};
// after notch 1 the streaks run (more, longer, dripping); wrecked: to the collarbone (as far as the face goes)
const FACE_RUN = { ...FACE, streaks: { color: '#08060a', n: 3, len: 3.0 } };
const FACE_WRECK = { ...FACE, streaks: { color: '#08060a', n: 4, len: 3.6 }, lips: { ...FACE.lips, shape: 'overdrawn' } };

export const SPEC = {
  name: 'THE MOURNER', body: 'female', scale: 1.22, porcelain: 0xf4ede9, gold: GOLD,
  skin: { roughness: 0.2, coatRough: 0.04, translucency: 0.7 },
  layers: [
    // sheer black stockings: black at the silhouette, porcelain through them face-on
    { kind: 'bottom', from: 'hips', hem: 'ankle', color: 0x1c1620, finish: 'satin', translucency: 0.62 },
    // his jacket, worn as a dress: a plunging V to one gold button at the navel, sleeves to the knuckles
    { kind: 'top', from: 'hips', neckline: 'plunge', width: 0.1, sleeves: 'knuckle', color: BLACK, finish: 'lacquer', trim: { color: 'gold', width: 0.006, relief: 0.0006 }, shell: { thickness: 0.011, smooth: 7 } },
    // wide satin peak lapels piped in gold
    { kind: 'lapels', of: { neckline: 'plunge', width: 0.1 }, width: 0.072, collar: 0.03, color: SATIN, finish: 'satin', trim: { color: 'gold', width: 0.004, relief: 0.0005 } },
  ],
  hair: { style: 'crop', color: 0x0a0a10, finish: 'lacquer', relief: 1.1 },
  face: FACE,
  eyes: { iris: 0x0b0a10, iris2: 0x6a4a9e, ring: true },
  accessories: [
    { type: 'hat', brim: 0.096, crown: 0.09, height: 0.062, color: SATIN, finish: 'satin', band: 'gold', tilt: -16, roll: 12, pin: true, jewel: PEARL },
    { type: 'veil', length: 0.1, color: 0x050405, cells: 34 },
    { type: 'skirt', from: 'waist', to: 'midthigh', color: BLACK, finish: 'lacquer', flare: 1.14, trim: { hem: 0.01, waist: 0.0, gold: true } },
    { type: 'shoes', from: 'ankle', color: 0x060507, finish: 'lacquer', toe: 'point', smooth: 12 },
  ],
  breaks: ['hat', 'shoulder_r', 'hand_r'],
};

// ------------------------------------------------------------------------------------------------ her props
const _v = new THREE.Vector3();
function physical(o) { return new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, ...o }); }
const M = {
  chrome: () => physical({ color: 0xf2f4f8, metalness: 1, roughness: 0.08, clearcoat: 0 }),
  gold: () => physical({ color: GOLD, metalness: 1, roughness: 0.22, clearcoat: 0 }),
  glass: () => physical({ color: 0x050408, roughness: 0.05, metalness: 0.2 }),
  pink: () => physical({ color: 0xff7fb0, roughness: 0.25, metalness: 0.4 }),
  black: () => physical({ color: 0x0c0a0e, roughness: 0.35 }),
  silver: () => physical({ color: 0xd8dade, metalness: 1, roughness: 0.18, clearcoat: 0 }),
  red: () => physical({ color: RED, roughness: 0.08 }),
  white: () => physical({ color: 0xf6f3ee, roughness: 0.5, clearcoat: 0.2 }),
  diamond: () => physical({ color: 0xff9ac6, roughness: 0.02, metalness: 0.1, transmission: 0, emissive: new THREE.Color(0x401020) }),
};
function mesh(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; }

// the beauty sceptre, built along +Y from the grip (y = 0): the brush end below, the phone 0.95 m up
function sceptre() {
  const g = new THREE.Group(); g.name = 'sceptre';
  const chrome = M.chrome(), gold = M.gold();
  const stick = mesh(new THREE.CylinderGeometry(0.011, 0.013, 1.12, 14), chrome); stick.position.y = 0.4; g.add(stick);
  for (const y of [0.0, 0.33, 0.62, 0.92]) { const r = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.026, 16), gold); r.position.y = y; g.add(r); }
  // the phone in its clamp at the top, screen toward her (local -z), camera and LED facing +z
  const head = new THREE.Group(); head.position.y = 0.99; g.add(head);
  const clamp = mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), chrome); clamp.position.y = -0.02; head.add(clamp);
  const phone = new THREE.Group(); phone.position.y = 0.05; head.add(phone);
  const body = mesh(new THREE.BoxGeometry(0.086, 0.168, 0.011), M.pink()); phone.add(body);
  const glass = mesh(new THREE.BoxGeometry(0.078, 0.158, 0.012), M.glass()); phone.add(glass);
  // the screen (her last photo), on the back face toward her
  const scrMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.3, 0.4) });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.148), scrMat); screen.position.z = -0.0065; screen.rotation.y = Math.PI; phone.add(screen);
  for (let i = 0; i < 3; i++) { const lens = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.006, 16), M.black()); lens.rotation.x = Math.PI / 2; lens.position.set(-0.022 + (i % 2) * 0.016, 0.06 - Math.floor(i / 2) * 0.016, 0.008); phone.add(lens); }
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.4, 1.3) });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), ledMat); led.position.set(0.018, 0.064, 0.008); phone.add(led);
  // the mascara brush below the hand: a gold collar, a bristled spiral
  const collar = mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.04, 18), gold); collar.position.y = -0.13; g.add(collar);
  const bristle = new THREE.Group(); bristle.position.y = -0.22; g.add(bristle);
  const core = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 8), M.black()); bristle.add(core);
  const tufts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.004, 0.052), M.black(), 54); tufts.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 54; i++) { const t = i / 53, a = t * Math.PI * 2 * 6; q.setFromEuler(new THREE.Euler(0, a, 0)); m4.compose(new THREE.Vector3(0, -0.072 + t * 0.144, 0), q, new THREE.Vector3(1, 1, 0.6 + 0.4 * Math.sin(t * Math.PI))); tufts.setMatrixAt(i, m4); }
  bristle.add(tufts);
  return { g, phone, led, ledMat, screen, scrMat };
}
function flask() {
  const g = new THREE.Group(); g.name = 'flask';
  const shape = new THREE.Shape(); const w = 0.045, h = 0.07; shape.moveTo(-w, -h); shape.lineTo(w, -h); shape.quadraticCurveTo(w + 0.012, 0, w, h); shape.lineTo(-w, h); shape.quadraticCurveTo(-w - 0.012, 0, -w, -h);
  const body = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 8 }), M.silver()); body.position.z = -0.011; g.add(body);
  const cap = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 14), M.gold()); cap.position.y = h + 0.012; g.add(cap);
  return g;
}
function heart(r, depth) {
  const s = new THREE.Shape();
  s.moveTo(0, -r); s.bezierCurveTo(r * 0.6, -r * 0.45, r * 1.05, -r * 0.05, r * 0.95, r * 0.35); s.bezierCurveTo(r * 0.85, r * 0.85, r * 0.2, r * 0.95, 0, r * 0.45);
  s.bezierCurveTo(-r * 0.2, r * 0.95, -r * 0.85, r * 0.85, -r * 0.95, r * 0.35); s.bezierCurveTo(-r * 1.05, -r * 0.05, -r * 0.6, -r * 0.45, 0, -r);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: r * 0.12, bevelThickness: r * 0.15, bevelSegments: 3, curveSegments: 12 });
  geo.translate(0, 0, -depth / 2); return geo;
}
export { heart };
function locket() {
  const g = new THREE.Group(); g.name = 'locket';
  const gold = M.gold(); gold.emissive = new THREE.Color(0x2a1a04);
  const h = mesh(heart(0.026, 0.008), gold); g.add(h);
  return { g, mat: gold };
}
function rose() {
  const g = new THREE.Group(); g.name = 'rose';
  const red = M.red();
  for (let i = 0; i < 7; i++) { const p = mesh(new THREE.SphereGeometry(0.018 - i * 0.0015, 10, 8), red); const a = i * 2.4; p.position.set(Math.cos(a) * 0.008 * (i > 0), Math.sin(a) * 0.008 * (i > 0), i * 0.002); p.scale.set(1, 1, 0.55); g.add(p); }
  return g;
}
function pocketSquare() { const g = mesh(new THREE.ConeGeometry(0.02, 0.03, 3), M.white()); g.rotation.z = Math.PI; return g; }
function ring() { const g = new THREE.Group(); const band = mesh(new THREE.TorusGeometry(0.011, 0.0025, 6, 16), M.gold()); g.add(band); const d = mesh(new THREE.OctahedronGeometry(0.011), M.diamond()); d.position.y = 0.013; g.add(d); return g; }

// put a prop under a bone at a world-space offset and rotation in the bone's frame (metres, not bone units)
function hang(fig, boneName, obj, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const bone = fig.bones[boneName]; if (!bone) { console.warn('mourner: no bone', boneName); return obj; }
  fig.root.updateWorldMatrix(true, true);
  const ws = bone.getWorldScale(_v).x || 1;
  const holder = new THREE.Group(); holder.name = 'hold:' + boneName;
  holder.scale.setScalar(1 / ws);
  holder.position.set(pos[0] / ws, pos[1] / ws, pos[2] / ws);
  holder.rotation.set(rot[0], rot[1], rot[2]);
  holder.add(obj); bone.add(holder);
  return holder;
}

// where her props ride (bone frame: +y along the bone); tuned on close-up renders
export const HOLD = {
  sceptre: { bone: 'hand_l', pos: [0.0, 0.07, 0.015], rot: [0, 0, 0] },     // re-aimed in world space every frame (aimSceptre)
  flask: { bone: 'hand_r', pos: [0.0, 0.08, 0.03], rot: [0, Math.PI / 2, 0] },
  locket: { bone: 'neck_01', pos: [0.0, -0.06, 0.11], rot: [0.3, 0, 0] },
  rose: { bone: 'spine_03', pos: [0.085, 0.13, 0.115], rot: [0.2, 0.3, 0] },
  square: { bone: 'spine_03', pos: [-0.09, 0.1, 0.125], rot: [0.15, -0.3, 0] },
  ring: { bone: 'hand_r', pos: [0.0, 0.07, 0.0], rot: [0, 0, 0] },
};

// the sceptre in world space: 'shoulder' leans it back over her left shoulder (the strut), 'up' holds the phone
// high on its stick in front of her (a shot), 'swipe' the brush end out (the mascara swipes); blends with k
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _m4 = new THREE.Matrix4();
export function aimSceptre(fig, facing, mode = 'shoulder', dt = 1 / 60) {
  const h = fig.props && fig.props.sceptre; if (!h) return;
  const fx = Math.sin(facing), fz = Math.cos(facing), rx = Math.cos(facing), rz = -Math.sin(facing);   // forward, her left
  if (mode === 'up') _d.set(fx * 0.32 + rx * 0.08, 1, fz * 0.32 + rz * 0.08);
  else if (mode === 'swipe') _d.set(fx * 0.9 + rx * 0.2, -0.25, fz * 0.9 + rz * 0.2);
  else if (mode === 'low') _d.set(fx * 0.2 + rx * 0.35, -1, fz * 0.2 + rz * 0.35);
  else _d.set(-fx * 0.42 + rx * 0.2, 1, -fz * 0.42 + rz * 0.2);
  _d.normalize();
  // +y of the sceptre along _d, its phone's camera (+z) facing forward (toward where she looks)
  const fwd = new THREE.Vector3(fx, 0, fz); const side = new THREE.Vector3().crossVectors(_d, fwd).normalize(); const zz = new THREE.Vector3().crossVectors(side, _d).normalize();
  _m4.makeBasis(side, _d, zz); _q.setFromRotationMatrix(_m4);
  h.parent.getWorldQuaternion(_qp).invert();
  _q2.copy(_qp).multiply(_q);
  const k = 1 - Math.exp(-dt * 16);
  h.quaternion.slerp(_q2, k);
}

let kit = null;
export const getKit = () => kit;
export async function buildMourner(f) {
  if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
  const fig = await buildFigurine(kit, SPEC);
  f.scene.add(fig.root);
  fig.rig.play('Idle_TalkingPhone_Loop', { fade: 0 });
  fig.rig.update(0);
  const S = sceptre(), L = locket();
  const props = {
    sceptre: hang(fig, HOLD.sceptre.bone, S.g, HOLD.sceptre.pos, HOLD.sceptre.rot),
    flask: hang(fig, HOLD.flask.bone, flask(), HOLD.flask.pos, HOLD.flask.rot),
    locket: hang(fig, HOLD.locket.bone, L.g, HOLD.locket.pos, HOLD.locket.rot),
    rose: hang(fig, HOLD.rose.bone, rose(), HOLD.rose.pos, HOLD.rose.rot),
    square: hang(fig, HOLD.square.bone, pocketSquare(), HOLD.square.pos, HOLD.square.rot),
    ring: hang(fig, HOLD.ring.bone, ring(), HOLD.ring.pos, HOLD.ring.rot),
    phone: S.phone, led: S.led, ledMat: S.ledMat, screen: S.screen, scrMat: S.scrMat, locketMat: L.mat,
  };
  fig.props = props;
  if (fig.prepare) await fig.prepare(f.app.renderer, f.cam.cam, f.scene);
  return fig;
}

// ------------------------------------------------------------------------------------------------ the boss
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export class Mourner extends Boss {
  constructor(body, opts) {
    super(body, opts);
    this.pose = null;           // { until, kind } a held pose: x1.5, no flinch, no turning to YOU
    this.mark = null;           // where she drifts to (the Xanax lag)
    this.vel = new THREE.Vector2();
    this.omega = 6;             // spring stiffness (rad/s); a snap stiffens it for a moment
    this.snapUntil = 0;
    this.weave = 0.15;          // drunk weave (m), gone after notch 3
    this.sober = false;
    this.backTo = null;         // a point she keeps her back to (a shot), or null
    this.onPoseHit = null;      // (info) -> void
    this.walkClip = 'Walk_Formal_Loop'; this.runClip = 'Jog_Fwd_Loop';
    this.radius = 0.6;
  }
  get posing() { return !!(this.pose && (this._now ?? 0) < this.pose.until); }
  // moves are timed on the song clock, even before her first update (a start in the middle of the song)
  moveTo(x, z, dur, o = {}) { return super.moveTo(x, z, dur, { now: this.clock ? this.clock() : (this._now ?? 0), ...o }); }
  takeHit(info) {
    if (this.dmgMul !== undefined && this.dmgMul !== 1) info = { ...info, dmg: info.dmg * this.dmgMul };
    if (this.posing && !this.guard && this.state !== 'desperate') {
      const r = super.takeHit({ ...info, dmg: info.dmg * 1.5 });
      if (r.landed) { this.flinchK = 0; this.onPoseHit && this.onPoseHit(info); }
      return r;
    }
    return super.takeHit(info);
  }
  // drift toward the mark on a spring; snap() stiffens it for 0.1 s
  setMark(x, z, { snap = false } = {}) { this.mark = { x, z }; if (snap) this.snap(); }
  snap(sec = 0.1) { this.snapUntil = (this._now ?? 0) + sec; }
  update(dt, now, beat, player) {
    this._now = now;
    // her death scene moves her (death.js): no drift to her mark, no turning her back for a shot
    if (this.scene) { this.vel.set(0, 0); this.pose = null; this.backTo = null; this.lockFacing = false; super.update(dt, now, beat, player); return; }
    if (this.posing) { this.flinchK = 0; if (this.rig) this.rig.flinch = Math.min(this.rig.flinch, 0.1); }
    if (this.mark && !this.move && (this.state === 'perform' || this.state === 'open' || this.state === 'desperate') && dt > 0) {
      const w = now < this.snapUntil ? 40 : (this.sober ? 9 : this.omega);
      const wx = this.sober ? 0 : Math.sin(now * Math.PI * 2 * 0.25) * this.weave, wz = this.sober ? 0 : Math.cos(now * Math.PI * 2 * 0.19) * this.weave * 0.6;
      const tx = this.mark.x + wx, tz = this.mark.z + wz;
      // critically damped spring, semi-implicit
      const ax = w * w * (tx - this.x) - 2 * w * this.vel.x, az = w * w * (tz - this.z) - 2 * w * this.vel.y;
      this.vel.x += ax * dt; this.vel.y += az * dt;
      const sp = this.vel.length(), cap = now < this.snapUntil ? 30 : 7;
      if (sp > cap) this.vel.multiplyScalar(cap / sp);
      let nx = this.x + this.vel.x * dt, nz = this.z + this.vel.y * dt;
      if (this.arena) { const r = this.arena.resolve(nx, nz, this.radius * 0.7); nx = r.x; nz = r.z; }
      this.x = nx; this.z = nz;
    } else this.vel.set(0, 0);
    // her back to a point (a shot): turn away from it, fast
    if (this.backTo && this.state !== 'stagger') {
      this.lockFacing = true;
      const want = Math.atan2(this.x - this.backTo.x, this.z - this.backTo.z);
      const d = angDiff(want, this.facing), m = 14 * dt;
      this.facing += Math.abs(d) <= m ? d : Math.sign(d) * m;
    } else if (this.keepFacing) this.lockFacing = true;
    else if (this.lockFacing && !this.posing) this.lockFacing = false;
    super.update(dt, now, beat, player);
  }
  restore(s) { super.restore(s); this.pose = null; this.backTo = null; this.lockFacing = false; this.vel.set(0, 0); this.busyUntil = 0; }
}

// the face: perfect, running (after notch 1), wrecked (the empty bar)
export function repaintFace(fig, which) {
  const spec = which === 'run' ? FACE_RUN : which === 'wreck' ? FACE_WRECK : FACE;
  const face = paintFace(fig.I, spec);
  const old = fig.face;
  fig.face = face; fig.bodyU.fFaceTex.value = face.texture;
  if (old && old !== face && old.texture) old.texture.dispose();
}
