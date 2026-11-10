// THE CLERK: the display mannequin from the front window, now working the back room. A glazed porcelain figurine
// (src/game/figurine.js) in a black catsuit and an orange store vest, cat ears on buns, a name tag, a measuring tape,
// gold shears or an orange price gun in her right hand. Five painted plates (SERVICE SALE NO CRACK HELL), a hinged
// jaw (the lip-sync), and her signature: she only moves on the band's hits, and freezes in every silence.
import * as THREE from 'three';
import { EXPRESSIONS } from '../../game/figurine.js';
import { paintFace } from '../../game/figurine/face.js';
import * as M from './moves.js';

export const SPEC = {
  name: 'THE CLERK', body: 'female', scale: 1.3, porcelain: 0xf4ece4, gold: 0xe2ae4c,
  skin: { roughness: 0.3, coatRough: 0.08 },
  layers: [
    // fishnets from the hip to the ankle: porcelain under a black net (it reads as a fine dark weave from above)
    { kind: 'bottom', from: 'hips', hem: 'ankle', color: 0xe8ddd4, finish: 'gloss', pattern: { type: 'stripes', color2: 0x0e080b, period: 0.028, duty: 0.22, dir: 'd' } },
    // the catsuit: black glaze, wet, to the wrists
    { kind: 'top', neckline: 'turtle', sleeves: 'wrist', color: 0x0e080b, finish: 'lacquer', trim: { color: 'gold', width: 0.006 } },
    // the store vest: a fitted waistcoat in store orange, a deep V to the sternum, gold piping
    { kind: 'top', from: 0.975, neckline: 'v', depth: 0.15, width: 0.09, sleeves: null, color: 0xff6a13, finish: 'gloss', trim: { color: 'gold', width: 0.007, relief: 0.0005 }, shell: { thickness: 0.007, smooth: 6 } },
  ],
  seams: ['neck', 'elbow', 'wrist', 'knee'],
  hair: { style: 'buns', color: 0x2a0710, finish: 'gloss', gild: 0.15 },
  face: {
    liner: { thick: 1.4, wing: 1.6 }, lashes: { n: 9, len: 1.1, lower: 0.25 },
    lips: { color: '#2a0710', shape: 'natural', gloss: 0.6 }, brows: { shape: 'thin', color: '#0e080b', thick: 0.75, lift: 0.25 },
    shadow: { color: '#4a2a3e', amount: 0.55 }, blush: { color: '#efb7b0', amount: 0.3 },
    marks: [{ at: 'cheek', side: 1, r: 0.0018 }],
  },
  eyes: { iris: 0xd99a2b, iris2: 0x6a3a04, slit: true, ring: true },
  accessories: [
    { type: 'catEars', color: 0x0e080b, inner: 0xe2ae4c },
    { type: 'nametag', text: 'TRAUMA RETAIL\nSPECIALIST', header: 'HELLO, MY NAME IS', band: '#ff6a13' },
    { type: 'tape', color: '#f2d04a' },
    { type: 'shoes', from: 'calf', color: 0x0a0a0c, toe: 'point', smooth: 10 },
  ],
  breaks: ['catEars', 'chest', 'forearm_l', 'face'],
};
export const PIECES = ['catEars', 'chest', 'forearm_l'];

// the five plates, painted (they swap with a tink, they don't blend)
const P = {
  service: { ...EXPRESSIONS.smug, smileL: 0.95, smileR: 0.75, lidT: 0.45, browOL: 0.2, browIR: 0.1 },
  sale: { ...EXPRESSIONS.shock, jaw: 0.85, smileL: 0.3, smileR: 0.3, pucker: 0.1 },
  no: { ...EXPRESSIONS.fury, jaw: 0.05, pucker: 0.7, pout: 0.6 },
  crack: { ...EXPRESSIONS.hurt, jaw: 0.3 },
  hell: { ...EXPRESSIONS.delight, jaw: 0.5, smileL: 1.0, smileR: 1.0, lidT: -0.1, lidB: 0.0, happy: 0, iris: 1.9, pupil: 3.5, browIL: -0.6, browIR: -0.6 },
};

const deg = Math.PI / 180;
const B_IN = 18.15;     // she's in the centre booth from "ROOM" to "One"
// her free-hit windows (the design's breaths): nothing unscheduled lands in them
const BREATH = [[12.0, 13.0], [44.0, 45.4], [56.6, 57.4], [62.3, 65.4], [79.5, 84.0], [85.31, 86.66], [115.9, 118.7], [135.0, 137.1], [179.9, 182.7], [188.3, 191.8],
  [57.3, 61.2]];      // (and her arm's whole flight, out, hanging and back, which has no shape on the floor while it flies)
// gold shears and an orange price gun, in her right hand (one at a time; the swap is a beat and a sound)
function buildProps(fig) {
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe2ae4c, metalness: 1, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  const orange = new THREE.MeshPhysicalMaterial({ color: 0xff6a13, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0e080b, roughness: 0.2, clearcoat: 1 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf4ece4, roughness: 0.4 });
  const s = 1 / fig.scale;     // bone space is the body's unscaled metres
  // shears: two long blades crossed at a pivot, two finger loops
  const shears = new THREE.Group();
  const blade = (side) => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.011, 0.02); sh.lineTo(0.004, 0.3); sh.lineTo(-0.004, 0.31); sh.lineTo(-0.009, 0.02); sh.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0012, bevelSegments: 1 });
    const m = new THREE.Mesh(g, gold); m.rotation.z = side * 4 * deg; m.position.z = side * 0.003; return m;
  };
  shears.add(blade(1), blade(-1));
  for (const sd of [1, -1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 8, 24), gold); loop.position.set(sd * 0.022, -0.04, 0); shears.add(loop); }
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.014, 12), gold); pivot.rotation.x = Math.PI / 2; shears.add(pivot);
  shears.scale.setScalar(s * 1.3);
  // the price gun: an orange body, a grip, a roll of white tags on top
  const gun = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.16), orange); body.position.set(0, 0.04, 0.06); gun.add(body);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.045), black); grip.position.set(0, -0.02, 0); grip.rotation.x = -15 * deg; gun.add(grip);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 20), white); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.09, 0.08); gun.add(roll);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), black); nose.position.set(0, 0.03, 0.15); gun.add(nose);
  gun.scale.setScalar(s * 1.3);
  for (const g of [shears, gun]) g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  const hand = fig.bones.hand_r;
  // the hand's frame: Quaternius hands point along +y of the hand bone; the palm faces -x (right hand)
  const hold = new THREE.Group(); hold.position.set(0.0, 0.09 * s * 1.3, 0.02 * s * 1.3); hand.add(hold);
  shears.rotation.set(0, 0, 0); shears.position.set(0, 0, 0);
  hold.add(shears, gun);
  gun.visible = false;
  return { shears, gun, hold };
}

// the counter (the arena's collider: centre (0, -6.05), 6.3 m by 1 m, 0.99 m high), a little wider for her body, and
// the points round its ends she walks by. She goes up on it only when the script hops her there.
const COUNTER = { x0: -3.4, x1: 3.4, z0: -6.58, z1: -5.36 };      // (the aisle behind it is narrow: no margin there)
const ROUND = [[-3.9, -5.0], [3.9, -5.0], [-3.9, -6.95], [3.9, -6.95]];
const inCounter = (x, z) => x > COUNTER.x0 && x < COUNTER.x1 && z > COUNTER.z0 && z < COUNTER.z1;
function clearOfCounter(x0, z0, x1, z1) {
  const n = Math.max(4, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.12));
  for (let i = 0; i <= n; i++) { const k = i / n; if (inCounter(x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)) return false; }
  return true;
}
// the shortest way from (x0, z0) to (x1, z1) that stays off the counter: straight, by one point round an end, or by two
// (round the end, behind to front). A target on the counter itself is moved to its nearest side first.
export function routeRoundCounter(x0, z0, x1, z1) {
  if (inCounter(x1, z1)) {
    // the side she's coming from (in front, behind, or the end she's beside); from inside, the nearest side
    const mid = (COUNTER.z0 + COUNTER.z1) / 2;
    if (x0 <= COUNTER.x0 || x0 >= COUNTER.x1) x1 = x0 <= COUNTER.x0 ? COUNTER.x0 - 0.35 : COUNTER.x1 + 0.35;
    else if (!inCounter(x0, z0)) z1 = z0 >= mid ? COUNTER.z1 + 0.35 : COUNTER.z0 - 0.04;
    else z1 = z1 >= mid ? COUNTER.z1 + 0.35 : COUNTER.z0 - 0.04;
  }
  if (inCounter(x0, z0) || clearOfCounter(x0, z0, x1, z1)) return [[x1, z1]];
  const len = (pts) => { let px = x0, pz = z0, L = 0; for (const [x, z] of pts) { L += Math.hypot(x - px, z - pz); px = x; pz = z; } return L; };
  let best = null, bl = 1e9;
  for (const c of ROUND) if (clearOfCounter(x0, z0, c[0], c[1]) && clearOfCounter(c[0], c[1], x1, z1)) { const p = [c, [x1, z1]], l = len(p); if (l < bl) { bl = l; best = p; } }
  if (!best) for (const a of ROUND) for (const c of ROUND) {
    if (a === c || a[0] !== c[0]) continue;
    if (clearOfCounter(x0, z0, a[0], a[1]) && clearOfCounter(a[0], a[1], c[0], c[1]) && clearOfCounter(c[0], c[1], x1, z1)) { const p = [a, c, [x1, z1]], l = len(p); if (l < bl) { bl = l; best = p; } }
  }
  return best || [[x1, z1]];
}

export class Clerk {
  constructor(f, boss, fig) {
    this.f = f; this.b = boss; this.fig = fig;
    this.plate = 'service'; this.plateUntil = 0; this.basePlate = 'service';
    this.freezes = [];            // [t0, t1) song times she stands frozen in (the stops)
    this.holds = [];              // the same, scheduled by the script
    this.hug = 0; this.scratchCool = 0;
    this.snaps = [];              // song times of the band's stabs she snaps to (the intro)
    this.snapUntil = -1;          // before this, she only moves on snaps
    this.y = 0; this.yT = 0;
    this.props = buildProps(fig);
    this.hand = 'shears';
    // the CRACK plate: the same face with a tear running from the left eye
    try {
      this.faceCalm = fig.face.texture;
      this.faceTear = paintFace(fig.I, { ...SPEC.face, streaks: { color: '#14070a', n: 1, len: 1.0 } }).texture;
    } catch (e) { this.faceTear = null; }
    this._wrapHits();
    this._wrapMoves();
    try { this._wearTag(); } catch (e) { console.warn('clerk tag', e.message); }
  }

  // every walk of hers on the floor goes round the counter, never through it: the same arrival time, split over the
  // legs by length (a later walk cancels the legs still to come). On the counter, or hopping onto it, she goes as told.
  _wrapMoves() {
    const b = this.b, f = this.f, move = b.moveTo.bind(b);
    let seq = 0;
    b.moveTo = (x, z, dur, o = {}) => {
      const my = ++seq;
      // (stunned or in the air: the boss keeps the move as asked, and it comes back through here when she's free)
      if (b.pinned || b.dazed) return move(x, z, dur, o);
      if (o.through || this.y > 0.3 || this.yT > 0.3 || this.inBooth) {
        // (asked for in the middle of going over the counter: she stays up for as long as she's still over it)
        if (!o.through && !this.up && !this.inBooth) this.vaultUntil = Math.max(this.vaultUntil || 0, (o.now ?? b._now ?? f.t) + dur);
        return move(x, z, dur, o);
      }
      // a spot on the open floor that's inside a rack, a dress form or the room's edge is the floor beside it (round
      // the counter she goes where she's told: that's hers)
      if (z > COUNTER.z1 + 0.1 && f.arena && f.arena.resolve) { const q = f.arena.resolve(x, z, 0.45); x = q.x; z = Math.max(COUNTER.z1 + 0.12, q.z); }
      const legs = routeRoundCounter(b.x, b.z, x, z);
      if (legs.length === 1) return move(legs[0][0], legs[0][1], dur, o);
      let px = b.x, pz = b.z, L = 0; const seg = legs.map(([lx, lz]) => { const d = Math.hypot(lx - px, lz - pz); px = lx; pz = lz; L += d; return d; });
      // no time to go round: she goes over it, a hop up and down the other side
      if (L / Math.max(0.01, dur) > 7.5 && !o.noVault && !clearOfCounter(b.x, b.z, x, z) && !inCounter(x, z)) {
        this.vaultUntil = (o.now ?? b._now ?? f.t) + dur;
        if (!b.busy) b.perform('NinjaJump_Start', { duration: Math.max(0.2, Math.min(dur, 0.6)), from: 0.1, to: 0.85, then: 'idle' });
        return move(x, z, dur, { ...o, through: true });
      }
      const now = o.now ?? b._now ?? f.t;
      let t = now;
      legs.forEach(([lx, lz], i) => {
        const d = dur * seg[i] / Math.max(1e-3, L), at = t;
        const go = () => { if (my === seq) move(lx, lz, Math.max(0.05, d), { ...o, now: at, easing: legs.length > 1 ? 'linear' : o.easing }); };
        if (i === 0) move(lx, lz, Math.max(0.05, d), { ...o, now: at, easing: 'linear' }); else f.at(at, go);
        t += d;
      });
      return now + dur;
    };
  }

  // a plate for n beats (then back to the base plate), or for good
  say(name, beats = 0) {
    const f = this.f;
    if (beats > 0) this.plateUntil = f.t + beats * f.beat; else { this.basePlate = name; this.plateUntil = 0; }
    this._show(name);
  }
  _show(name) {
    // wrecked, the selling smile is gone: what's left of her face cries (HELL still comes on "ready for hell")
    if (name === 'service' && this.b.hp <= 0) name = 'crack';
    if (this.plate === name) return;
    this.plate = name;
    const fig = this.fig, e = P[name] || P.service;
    fig.exprName = name; fig.exprTarget = { ...e }; fig.exprFade = 0.03;         // a swap, not a blend
    if (this.faceTear) fig.bodyU.fFaceTex.value = name === 'crack' ? this.faceTear : this.faceCalm;
    fig.eyeU.fIrisCol.value.set(name === 'hell' ? 0x050203 : SPEC.eyes.iris);
    fig.eyeU.fIrisCol2.value.set(name === 'hell' ? 0x050203 : SPEC.eyes.iris2);
    const a = this.f.audio; if (a && a.tone && this.f.state === 'play') a.tone(3200, { type: 'sine', a: 0.001, d: 0.05, peak: 0.035 });     // (a faint tink: it happens often)
  }

  // the right hand: 'shears' | 'gun' | null (a swap is a beat: holster slap, draw)
  draw(what) {
    if (this.hand === what) return;
    this.hand = what;
    this.props.shears.visible = what === 'shears';
    this.props.gun.visible = what === 'gun';
    const a = this.f.audio; if (a && a.noiseBurst && this.f.state === 'play') { const out = a.pan(this.f.pan(this.b.x)); a.noiseBurst({ peak: 0.32, d: 0.05, f: 1800, q: 2, out }); a.tone(what === 'gun' ? 520 : 1900, { a: 0.001, d: 0.06, peak: what === 'gun' ? 0.12 : 0.07, type: 'triangle', out }); }
  }

  // a clip whose contact (fraction `hit` of the window [from, to]) lands on song time `at`, at its own speed
  // unless `dur` is given; squeezed if there's no time to wind up
  strike(clip, at, { from = 0, to = 1, hit = 0.5, dur, then } = {}) {
    const f = this.f, b = this.b;
    const c = b.rig.kit.clips[clip]; if (!c) return;
    let d = dur ?? c.duration * (to - from), start = at - hit * d;
    if (start < f.t) { d = Math.max(0.12, (at - f.t) / Math.max(0.05, hit)); start = f.t; }
    const go = () => b.perform(clip, { from, to, duration: d, then: then || 'idle' });
    if (start <= f.t + 0.01) go(); else f.at(start, go);
  }
  // the whole body plays a clip for `dur` seconds from song time `at`
  play(clip, at, dur, o = {}) {
    const f = this.f, b = this.b;
    const go = () => b.perform(clip, { from: o.from ?? 0, to: o.to ?? 1, duration: dur, then: o.then || 'idle' });
    if (at <= f.t + 0.01) go(); else f.at(at, go);
  }
  loop(clip, at, speed = 1) { const f = this.f; const go = () => { this.b.idle = clip; this.b.loop(clip, { speed }); }; if (at <= f.t + 0.01) go(); else f.at(at, go); }

  // up onto the counter / down
  onCounter(on) { this.up = on; this.yT = on ? 1.05 : 0; }

  // a return of hers hit her: the NO plate for two beats
  returned() {}

  _wrapHits() {
    const b = this.b, orig = b.takeHit.bind(b);
    b.takeHit = (info) => {
      const f = this.f, R = f.room;
      // in the booth behind a closed curtain: a strike cuts the velvet, not her (returns and rings go through and cut it)
      if (this.inBooth && R && R.curt.centre.open < 0.5) {
        if (info.kind === 'strike') { R.curt.cut('strike'); return { landed: false }; }
        if (info.kind === 'return' || info.kind === 'ring') R.curt.cut(info.kind);
      }
      // the zipper: in the bridge her back is the weak point
      if (info.kind === 'strike' && f.t >= 129.33 && f.t < 142.67 && info.from) {
        const a = Math.atan2(info.from.x - b.x, info.from.z - b.z);
        if (Math.abs(Math.atan2(Math.sin(a - b.facing), Math.cos(a - b.facing))) > Math.PI * 2 / 3) { info = { ...info, dmg: info.dmg * 2, heavy: true }; }
      }
      const r = orig(info);
      if (r && r.landed && info.kind === 'return') this.say('no', 2);
      if (r && r.landed && this.onHit) this.onHit(info, r);
      return r;
    };
  }

  // a hop up onto the counter (or down): NinjaJump on t0, landing on t1
  hop(x, z, t0, t1, up = true) {
    const f = this.f, b = this.b;
    const jump = () => {
      const dur = Math.max(0.15, t1 - f.t);
      b.moveTo(x, z, dur, { easing: 'inOut', through: true });
      // (stunned as the song asked for it: she makes the hop when she's back, and goes up then, not where she stands)
      if (b.moveHeld) { b._wait = null; this._hopWant = { up, x, z }; return; }
      b.perform('NinjaJump_Start', { duration: dur, from: 0.1, to: 0.85, then: 'idle' }); this.onCounter(up);
    };
    const go = () => {
      b.behave = 'hold';
      // from across the room she comes to the counter's front on her feet first, and rises over the last of it
      const fx = Math.max(COUNTER.x0 + 0.5, Math.min(COUNTER.x1 - 0.5, x)), fz = COUNTER.z1 + 0.9, d1 = Math.hypot(fx - b.x, fz - b.z);
      if (up && this.y < 0.3 && d1 > 2.2 && !inCounter(b.x, b.z)) {
        const d2 = Math.hypot(x - fx, z - fz), T = Math.max(0.3, t1 - f.t), T1 = T * d1 / (d1 + d2 + 0.8);
        b.moveTo(fx, fz, T1, { easing: 'in' });
        f.at(f.t + T1, jump);
      } else jump();
    };
    if (t0 <= f.t + 0.01) go(); else f.at(t0, go);
  }
  // the huge grinning smiley mask of the charge: a printed grin over her face (placed in bind space, like her accessories)
  mask(on) {
    if (!this.maskMesh) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
      c.fillStyle = '#ffd61a'; c.beginPath(); c.arc(128, 128, 124, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#c89a10'; c.lineWidth = 8; c.stroke();
      c.fillStyle = '#120a04'; for (const x of [84, 172]) { c.beginPath(); c.ellipse(x, 98, 16, 30, 0, 0, Math.PI * 2); c.fill(); }
      c.lineWidth = 16; c.lineCap = 'round'; c.strokeStyle = '#120a04'; c.beginPath(); c.arc(128, 128, 82, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      // a cap of a sphere (three.js puts phi = 0 on -x: turn it to face +z, the way her face looks in bind space)
      const g = new THREE.SphereGeometry(0.15, 32, 16, -0.8, 1.6, 0.85, 1.45); g.rotateY(Math.PI / 2); g.translate(0, 0, -0.1);
      const uv = g.attributes.uv, pz = g.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + pz.getX(i) / 0.27, 0.5 + pz.getY(i) / 0.27);
      const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: tx, roughness: 0.25, clearcoat: 1, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
      const I = this.fig.I;
      const bind = new THREE.Matrix4().makeTranslation(0, I.EYE.l.c.y - 0.03, I.headC.z + 0.075);
      m.matrixAutoUpdate = false; m.matrix.copy(this.fig.boneLocal('Head', bind));
      m.castShadow = true;
      this.fig.bones.Head.add(m); this.maskMesh = m;
    }
    this.maskMesh.visible = on;
    if (!on) { const f = this.f, b = this.b; f.fx.chips(b.x, 2.0, b.z, new THREE.Color(2.6, 2.2, 0.6), 20); f.room && f.room.snd.porcelain(b.x); }
  }
  // her right stiletto snaps on the big hit
  heel() { const f = this.f, b = this.b; this.limp = true; f.fx.chips(b.x + 0.15, 0.1, b.z, new THREE.Color(2.4, 1.8, 0.6), 10); f.room && f.room.snd.porcelain(b.x); }
  // the last pose: a catalogue "ta-da"
  taDa() { const b = this.b; b.behave = 'hold'; b.faceNow(this.f.player.x, this.f.player.z); b.perform('Spell_Simple_Enter', { duration: 0.3, from: 0, to: 0.9, then: 'Spell_Simple_Idle_Loop' }); this.say('service'); }
  // her detachable forearm (the part's mask hides it while it flies)
  armGone() { return this.b.broken >= 3; }
  armOff(off) { if (this.armGone()) return; const u = this.fig.U.fOff.value; u.y = off ? 1 : 0; }
  // the gaslight paints over every crack YOU made: they turn gold
  gild() { this.fig.U.fKintsugi.value = 6; }
  // where she stands at a section's start (a start anywhere; rewinds restore her from the checkpoint)
  placeAt(t) {
    const b = this.b, P = [[0, [0, -6.85, Math.PI]], [22.66, [-6.5, -0.5]], [33.33, [-6.1, -1.0]], [54.66, [-2.0, -3.0]], [76.01, [-3.0, -2.0]], [86.65, [-7.2, -4.4]],
      [107.99, [0, -6.05]], [118.66, [0, -1]], [129.33, [0, -1]], [142.67, [0, -6.05]], [169.33, [0, -3]], [182.66, [1.8, -6.85]]];
    let p = P[0][1]; for (const [tt, q] of P) if (t >= tt - 0.01) p = q;
    b.place(p[0], p[1], p[2] ?? 0);
    if (t >= 107.99 && t < 115.99) this.onCounter(true), this.y = 1.05;
    if (t >= 142.67 && t < 146.5) this.onCounter(true), this.y = 1.05;
  }

  // a pose held for a while (the dip, beside the mirror): free hits
  hold(t0, t1) { this.holds.push([t0, t1]); }

  // where she is in the song at time t (a rewind, a start anywhere): plate, hand, height
  reset(t) {
    this.holds = []; this.hug = 0; this.scratchCool = 0;
    if (this.tag) this.tag.visible = true;
    this.plateUntil = 0;
    this.basePlate = t >= 197.16 ? 'hell' : (t >= 118.28 && t < 141.99) ? 'crack' : 'service';
    this.plate = ''; this._show(this.basePlate);
    const HAND = [[0, null], [5.3, 'shears'], [59.65, 'gun'], [62.3, 'shears'], [107.99, 'gun'], [115.99, 'shears'], [130.32, null], [141.99, 'shears'], [155.16, 'gun'], [158.66, 'shears'], [182.66, null], [203.99, 'shears'], [210.99, 'gun'], [212.66, 'shears']];
    let hand = null; for (const [tt, h] of HAND) if (t >= tt - 0.01) hand = h;
    this.hand = '?'; this.draw(hand);
    this.inBooth = t >= B_IN && t < 22.28;
    this.yT = this.y = 0; this.up = false; this._hopWant = null; this._booth = null; this.b.root.position.y = 0; this.vaultUntil = 0;
    this.b.lockFacing = false;
    this.slowTurn = t >= 129.33 && t < 141.99; this.tied = false; this.limp = t >= 137.32;
    this.fig.U.fKintsugi.value = t >= 64.83 ? 6 : 1;
    if (t >= 118.28 && t < 121.0) this.mask(true); else if (this.maskMesh) this.maskMesh.visible = false;
    const u = this.fig.U.fOff.value; if (!this.armGone()) u.y = 0;
    if (t >= 107.99 && t < 115.99) { this.yT = this.y = 1.05; }
    if (t >= 142.67 && t < 146.5) { this.yT = this.y = 1.05; }
    this.b.walkClip = this.b.state === 'desperate' ? 'Zombie_Walk_Fwd_Loop' : 'Walk_Formal_Loop';
    if (t < 1) { this.b.idle = 'PickUp_Table'; this.b.loop('PickUp_Table'); }
  }
  onBreak(i) {
    const f = this.f;
    this.say('no', 2);
    if (i === 1) this.fig.breakPiece('nametag');                        // the vest goes, and the name tag drops face up
    if (i === 2 && this.hand === 'gun') this.draw('shears');
    // (under the shared break's crash: a low body to it, not a second boom)
    f.audio && f.state === 'play' && f.audio.tone(70, { type: 'sine', a: 0.004, d: 0.5, peak: 0.125 });
  }
  // the black wave reaches her too: what's left of her store orange goes black lacquer
  black(k) {
    const v = this.fig.bodyU.fLayCol.value[2]; if (!v) return;
    this._orange ||= v.clone();
    v.set(this._orange.x * (1 - 0.97 * k), this._orange.y * (1 - 0.97 * k), this._orange.z * (1 - 0.97 * k), this._orange.w);
  }
  onEmpty() { this.fig.breakPiece('face'); this.basePlate = 'crack'; this._show('crack'); this.b.walkClip = 'Zombie_Walk_Fwd_Loop'; }
  // the shatter: her price tag lands whole at YOU's feet, the first thing YOU took out of the shop (the keepsake)
  onFinish() {
    const f = this.f, R = f.room, pl = f.player;
    if (this.tag) this.tag.visible = false;
    const k = this._tagMesh(1.9);
    const from = this.fig.bones.neck_01 ? this.fig.bones.neck_01.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(this.b.x, 2, this.b.z);
    const fy = (pl.y || 0) + 0.012;      // (YOU may be up on the counter: death.js)
    const to = new THREE.Vector3(pl.x + Math.sin(pl.facing) * 0.7, fy, pl.z + Math.cos(pl.facing) * 0.7);
    let a = 0;
    R.keep(k, 1e9, { tick: (t, dt) => {
      a += dt || 1 / 60; const u = Math.min(1, a / 0.9);
      k.position.lerpVectors(from, to, u); k.position.y = from.y * (1 - u) + fy * u + 1.6 * u * (1 - u) * 2;
      k.rotation.set(-Math.PI / 2 + (1 - u) * 6, 0, (1 - u) * 9 + 0.3);
      if (u >= 1 && !k.userData.landed) { k.userData.landed = true; f.fx.glitter(to.x, 0.2, to.z, new THREE.Color(3, 2.2, 0.8), 18, 0.4); R.snd.porcelain(to.x); }
    } });
  }
  // the price tag: a white card with a gold-foil edge, $29.99 in price-gun type, on a black string
  _tagMesh(s = 1) {
    if (!this._tagTex) {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 192; const c = cv.getContext('2d');
      c.fillStyle = '#f6f1e8'; c.fillRect(0, 0, 128, 192); c.strokeStyle = '#e2ae4c'; c.lineWidth = 10; c.strokeRect(5, 5, 118, 182);
      c.fillStyle = '#0e080b'; c.beginPath(); c.arc(64, 26, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#16100c'; c.font = 'bold 40px "Courier New", monospace'; c.textAlign = 'center'; c.fillText('$29', 64, 100); c.fillText('.99', 64, 146);
      this._tagTex = new THREE.CanvasTexture(cv); this._tagTex.colorSpace = THREE.SRGBColorSpace;
    }
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.06 * s, 0.002 * s), new THREE.MeshStandardMaterial({ map: this._tagTex, roughness: 0.5, emissive: 0xffffff, emissiveMap: this._tagTex, emissiveIntensity: 0.25 }));
    m.castShadow = true;
    return m;
  }
  _wearTag() {
    const fig = this.fig, I = fig.I, bone = fig.bones.neck_01 || fig.bones.spine_03;
    if (!bone || !I || !I.Y) return;
    const y0 = (I.Y.neckBase ?? 1.48) - 0.045;
    let z = -9; for (let v = 0; v < I.nv; v++) { if (I.region && I.region[v] !== 0) continue; const x = I.pos[v * 3], y = I.pos[v * 3 + 1]; if (Math.abs(x) < 0.02 && Math.abs(y - y0) < 0.015) z = Math.max(z, I.pos[v * 3 + 2]); }
    if (z < -5) return;
    const g = new THREE.Group();
    const card = this._tagMesh(1); card.position.y = -0.03; g.add(card);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.03, 4), new THREE.MeshBasicMaterial({ color: 0x0a0608 })); g.add(str);
    g.matrixAutoUpdate = false; g.matrix.copy(fig.boneLocal(bone.name, new THREE.Matrix4().makeTranslation(0, y0, z + 0.008)));
    bone.add(g); this.tag = g;
  }
  onEncore() { this.b.walkClip = 'Walk_Formal_Loop'; }

  // the cat scratch: her close-range swipe when YOU hugs her. If YOU stays in her face for four beats, a pink cone
  // fills for two beats to the next beat. The only unscheduled attack, so it keeps out of the way of the song's: never
  // in S1 (under the hem is the answer) or S8 (behind her is), never landing in a silence, a breath or a held pose, and
  // never near anything of hers already drawn or about to be (her script's next moves), so every attack that lands on
  // a word still lands alone on it. At most one every eight beats.
  _scratch(dt) {
    const f = this.f, b = this.b, t = f.t, pl = f.player, beat = f.beat;
    const d = Math.hypot(pl.x - b.x, pl.z - b.z);
    const quietAt = (tt) => (tt >= 22.66 && tt < 33.33) || (tt >= 129.33 && tt < 142.67) || tt < 10 || tt > 212.3
      || BREATH.some(([a, z]) => tt >= a && tt < z) || this.freezes.some(([a, z]) => tt >= a - 0.1 && tt < z + 0.1) || this.holds.some(([a, z]) => tt >= a && tt < z);
    const busy = this.frozen || f.suppress || b.state !== 'perform' || b.busy || b.move || this.y > 0.5 || this.inBooth
      || f.proj.list.some((p) => p.owner === 'boss' && !p.dead);
    if (d < 2.7 && !busy && !quietAt(t)) this.hug += dt; else this.hug = Math.max(0, this.hug - dt * 2);
    if (this.hug < 4 * beat || t < this.scratchCool) return;
    const nb = f.bm.nearest(t + 2 * beat, 1), t1 = nb.time > t + 1.6 * beat ? nb.time : f.bm.timeOf(nb.beat + 1);
    // (her script's next move must not start while the swipe fills, and nothing of hers may be on the floor already)
    const T = f.T, next = T.events[T.cursor];
    const clear = !quietAt(t1) && !(next && next.t <= t1 + beat)
      && !f.tele.list.some((g) => !g.dead && g.end > t - 0.05 && g.kind !== 'gold');
    if (!clear) { this.scratchCool = t + beat; return; }
    this.hug = 0; this.scratchCool = t1 + 8 * beat;
    b.faceNow(pl.x, pl.z);
    this.strike('Zombie_Scratch', t1, { from: 0.2, to: 0.75, hit: 0.55 });
    this.say('no', 2);
    M.cone(f, { start: t, end: t1, w: 2.9, param: 1.0, kind: 'pink', onImpact: (hit) => { if (hit === 'parried') { this.say('no', 2); b.open(1.5 * f.beat); } } });
  }

  update(dt) {
    const f = this.f, b = this.b, t = f.t, rig = b.rig;
    if (f.state === 'play') this._scratch(dt);
    // plates time out back to the base
    if (this.plateUntil && t >= this.plateUntil) { this.plateUntil = 0; this._show(this.basePlate); }
    // her death scene moves her (death.js)
    if (b.scene) { rig.timeScale = 1; b.lockFacing = false; this.frozen = false; return; }
    // frozen in a silence; in the intro, still between the stabs
    let frozen = false;
    for (const [a, z] of this.freezes) if (t >= a && t < z) { frozen = true; break; }
    if (!frozen) for (const [a, z] of this.holds) if (t >= a && t < z) { frozen = true; break; }
    let snap = 1;
    if (t < this.snapUntil) {
      let last = -9; for (const s of this.snaps) if (s <= t) last = s; else break;
      const since = t - last;
      snap = since < 0.12 ? 5 : 0;         // a jerk to the next pose, then still
    }
    rig.timeScale = frozen ? 0 : snap;
    b.lockFacing = frozen || (t < this.snapUntil && snap === 0) || this.slowTurn;
    // the bridge: she turns to face YOU at 90 degrees a beat, slowly, so YOU can circle her
    if (this.slowTurn && !frozen && !b.move) { const want = Math.atan2(f.player.x - b.x, f.player.z - b.z); const d = Math.atan2(Math.sin(want - b.facing), Math.cos(want - b.facing)); const m = (Math.PI / 2) / f.beat * dt; b.facing += Math.abs(d) <= m ? d : Math.sign(d) * m; }
    this.frozen = frozen;
    // a hop the song asked for while she was stunned: made when she's back (to the counter's front on her feet first)
    if (this._hopWant && !b.dazed && !b.pinned && !b.move && b.state !== 'stagger') { const w = this._hopWant; this._hopWant = null; this.hop(w.x, w.z, t, t + 0.6, w.up); }
    // the fitting room: to its front on her feet, in through the open curtain, and she's in it once she's there (on
    // the song's word, or late if a stun kept her)
    if (this._booth && t < 22.0) {
      if (this._booth === 'walk' && b.near(-8.3, 0.0, 0.9)) { this._booth = 'in'; b.moveTo(-10.0, 0.0, Math.max(0.25, this.boothAt - t), { through: true, easing: 'out' }); }
      else if (this._booth === 'in' && t >= this.boothAt && b.near(-10.0, 0.0, 0.9)) { this._booth = null; this.boothEnter && this.boothEnter(); }
    }
    // standing in a rack or a dress form (pushed there, put there): the open floor beside it. Her walks go round
    // them on their own (Boss.moveTo), so this never fights a walk
    if (f.room && this.y < 0.3 && !this.inBooth && !b.move && b.state !== 'finished') { const r = f.room.stage.resolve(b.x, b.z, 0.42); if (Math.abs(r.x - b.x) + Math.abs(r.z - b.z) > 1e-4) { b.x = r.x; b.z = r.z; b._sync(); } }
    // going over it: up while she's over the counter, down the other side
    const vaulting = this.vaultUntil && t < this.vaultUntil + 0.05;
    if (vaulting) this.yT = inCounter(b.x, b.z) || Math.abs(b.z + 5.97) < 1.0 && Math.abs(b.x) < 3.6 ? 1.05 : 0;
    else if (this.vaultUntil) { this.vaultUntil = 0; this.yT = this.up ? 1.05 : 0; }      // (down, wherever the vault left her: she's only up there when the song hops her up)
    // and never stands inside the counter on the floor (anything that put her there, a push, a place): out the nearer side
    if (!vaulting && this.y < 0.3 && this.yT < 0.3 && !this.inBooth && !b.move && b.state !== 'finished' && inCounter(b.x, b.z)) {
      const [[x, z]] = routeRoundCounter(b.x, b.z, b.x, b.z); b.x = x; b.z = z; b._sync();
    }
    // height: up on the counter, down on the floor (a hop is quick; a vault quicker)
    // (hopping down, she stays up until she's clear of it)
    const yWant = this.yT < 0.3 && b.move && inCounter(b.x, b.z) ? 1.05 : this.yT;
    this.y += (yWant - this.y) * Math.min(1, dt * (vaulting ? 26 : 14));
    // (a jump the shared code gave her, out from between things: on top of that)
    const mv = b.move, kk = mv && mv.arc ? Math.min(1, Math.max(0, (t - mv.t0) / mv.dur)) : 0;
    b.root.position.y = this.y + (mv && mv.arc ? 4 * mv.arc * kk * (1 - kk) : 0);
    // behind the counter her ring would show on the floor in front of it (Alex, 7 Nov: she looked to be inside "the
    // stage"): it fades while she's back there, and comes back as she comes out
    const behind = this.y < 0.3 && b.z < COUNTER.z1 - 0.05 && Math.abs(b.x) < COUNTER.x1 + 0.6;
    b.markK = (b.markK ?? 1) + ((behind ? 0 : 1) - (b.markK ?? 1)) * Math.min(1, dt * 10);
  }
}
