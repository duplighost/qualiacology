// What YOU has taken off each of them so far, worn as charms: the price tag, the spare key, the gavel, the locket, the
// headlight, the teddy bear... Every fight she walks into, she's wearing the ones before it. They hang from a gold
// clasp on her belt at each hip, a little behind the side (the camera is behind her, and the belt runs over her coat
// there), each on its own short chain, hung by the end you'd hang it by (the key by its ring, the bear by its head).
// They swing: with gravity, against the way she moves, out on a spin, and off her hips and thighs.
// It's the record's through line without a word: she goes down the track list and keeps something from each.
// (The credits' plastic bag is where they all end up.)
// (Alex, 10 Nov 2026: "They just look stuck to her". They were pinned flat round the front of her hips.)
import * as THREE from 'three';
import { makeKeepsake } from '../ui/keepsakes.js';

// how big each is worn (its longest side, metres)
const WORN = { tag: 0.095, key: 0.095, gavel: 0.085, locket: 0.07, headlight: 0.08, teddy: 0.12, giltkey: 0.12, star: 0.08, pin: 0.06, prize: 0.05 };
// they're built lying flat, face up, for the record's grooves: [the axis toward the end it hangs by, the way its face
// looks], in its own model space; and how far in from that end the chain takes hold (between the bear's ears, the
// dip of the heart)
const HANG = { tag: ['-x', '+y'], key: ['+z', '+y'], gavel: ['+x', '+y'], locket: ['-z', '+y'], headlight: ['-z', '+y'], teddy: ['+y', '+z'],
  giltkey: ['+z', '+y'], star: ['-z', '+y'], pin: ['-x', '+y'], prize: ['-y', '+z'] };
const HOLD_IN = { teddy: 0.025, locket: 0.017 };
// (the locket's own chain and the gavel's snapped one: worn, they hang from hers)
const OWN_CHAIN = { locket: 0.07, gavel: 0.045 };
// all of it is placed in her hip frame: at the pelvis bone, square to her as she stands (x her left, y up, z her front)
const CLASP = { a: 1.85, h: 0.065, r: 0.176 };        // each hip, ~106 degrees round from her front, on the belt
// each side's chains in the order they fill: along the bar from its middle (radians round her), and how long
const DROPS = [[0, 0.055], [0.12, 0.09], [-0.12, 0.035], [0.06, 0.125], [-0.06, 0.07]];
// her body, to rest against and be knocked by: her hips (an ellipsoid in the hip frame) and her thighs (hip to knee)
const HIPS = { c: [0, -0.06, -0.01], r: [0.2, 0.2, 0.165] };
const THIGH_R = 0.09;
const G = 9.8, DAMP = 3.2, LINK = 0.009;

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _v = new THREE.Vector3(), _u = new THREE.Vector3(), _n = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3();
const _P = new THREE.Vector3(), _A = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _w = new THREE.Matrix4(), _s1 = new THREE.Vector3(1, 1, 1);
const _inv = new THREE.Matrix4(), _rootInv = new THREE.Matrix4(), _link = new THREE.Vector3(1, 1.45, 1), _pos = new THREE.Vector3(), _sc = new THREE.Vector3();
const AXIS = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };
const gold = () => (gold.m ||= new THREE.MeshStandardMaterial({ color: 0xe0b04a, roughness: 0.28, metalness: 0.9 }));

// a keepsake made to hang: its hold point at the group's origin, hanging down (-y), its face out (+z)
function charm(kind) {
  const m = makeKeepsake(kind);
  if (OWN_CHAIN[kind]) for (const o of [...m.children]) if (o.geometry && o.geometry.type === 'TorusGeometry' && o.geometry.parameters.radius >= OWN_CHAIN[kind]) m.remove(o);
  const [ua, fa] = HANG[kind] || ['+z', '+y'];
  const u = new THREE.Vector3(...AXIS[ua]), fc = new THREE.Vector3(...AXIS[fa]), rc = new THREE.Vector3().crossVectors(u, fc);
  // its extent, and the end it hangs by (the points furthest along u, averaged: a ring's top, a ribbon's end)
  m.updateMatrixWorld(true);
  const box = new THREE.Box3(), p = new THREE.Vector3(); let best = -1e9; const ends = [];
  m.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); box.expandByPoint(p); const d = p.dot(u); if (d > best + 0.002) { best = d; ends.length = 0; } if (d > best - 0.002) ends.push(p.clone()); }
  });
  const hold = ends.reduce((s, e) => s.add(e), new THREE.Vector3()).divideScalar(Math.max(1, ends.length)).addScaledVector(u, -(HOLD_IN[kind] || 0));
  const size = box.getSize(new THREE.Vector3()), s = (WORN[kind] || 0.08) / Math.max(size.x, size.y, size.z);
  const mid = box.getCenter(new THREE.Vector3());
  // model -> hang frame: u up, its face out
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(rc, u, fc).transpose());
  m.scale.setScalar(s); m.quaternion.copy(q); m.position.copy(hold).multiplyScalar(-s).applyQuaternion(q);
  m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.renderOrder = 2; } });
  const g = new THREE.Group(); g.add(m);
  // from the hold point to its middle (its swing), and how far it stands off her (its depth)
  const half = Math.max(0.01, (hold.dot(u) - mid.dot(u)) * s), depth = Math.abs(size.dot(new THREE.Vector3(Math.abs(fc.x), Math.abs(fc.y), Math.abs(fc.z)))) * s;
  return { g, half, rad: Math.max(0.012, depth * 0.5 + 0.004) };
}

export class Trophies {
  constructor(heroine) {
    this.h = heroine; this.items = []; this.kinds = ''; this.hip = null; this.links = null; this.extra = [];
    const B = heroine.rig.bones;
    this.bone = B.pelvis || B.spine_01 || null;
    this.legs = [[B.thigh_l, B.calf_l], [B.thigh_r, B.calf_r]].filter(([a, b]) => a && b);
  }
  _clear() {
    for (const it of this.items) { it.g.removeFromParent(); it.g.traverse((c) => { if (c.isMesh) c.geometry.dispose(); }); }
    for (const o of this.extra) { o.removeFromParent(); o.traverse((c) => { if (c.isMesh) c.geometry.dispose(); }); }
    if (this.hip) this.hip.removeFromParent();
    this.items.length = 0; this.extra.length = 0; this.hip = null; this.links = null;
  }
  // kinds: the keepsakes she has (in the order she took them)
  set(kinds) {
    const key = kinds.join(',');
    if (key === this.kinds) return;
    this.kinds = key;
    this._clear();
    if (!this.bone || !kinds.length) return;
    const root = this.h.root; root.updateWorldMatrix(true, true);
    // her hip frame, riding the pelvis from now on
    const hip = this.hip = new THREE.Group();
    this.bone.getWorldPosition(hip.position); root.getWorldQuaternion(hip.quaternion);
    hip.updateMatrixWorld(true); this.bone.attach(hip);
    const at = (a, h, r) => new THREE.Vector3(Math.sin(a) * r, h, Math.cos(a) * r);
    // the clasps: a gold plate on the belt, a short bar under it the chains hang from
    for (const side of [1, -1]) {
      const n = kinds.filter((k, i) => (i % 2 === 0 ? 1 : -1) === side).length; if (!n) continue;
      const a = side * CLASP.a, out = at(a, 0, 1), c = new THREE.Group();
      c.position.copy(at(a, CLASP.h, CLASP.r)); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.006, 20), gold());
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 6), gold()); boss.position.y = 0.004;
      c.add(plate, boss); hip.add(c); this.extra.push(c);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.052, 8), gold());
      bar.position.copy(at(a, CLASP.h - 0.013, CLASP.r + 0.004)); bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), at(a + Math.PI / 2, 0, 1));
      hip.add(bar); this.extra.push(bar);
      for (const o of [plate, boss, bar]) { o.castShadow = true; o.renderOrder = 2; }
    }
    kinds.forEach((kind, i) => {
      const side = i % 2 === 0 ? 1 : -1, [da, L] = DROPS[Math.floor(i / 2) % DROPS.length];
      const { g, half, rad } = charm(kind);
      root.add(g);
      const pivot = at(side * (CLASP.a + da), CLASP.h - 0.015, CLASP.r + 0.006);
      this.items.push({ kind, g, half, rad, L, reach: L + half, pivot, C: new THREE.Vector3(), Cp: new THREE.Vector3(), P: new THREE.Vector3(), f: new THREE.Vector3(), live: false, nLinks: Math.max(2, Math.ceil(L / LINK)) });
    });
    // the chains: little gold links, all of them one instanced mesh (they move every frame: never culled)
    const total = this.items.reduce((s, it) => s + it.nLinks, 0);
    const links = this.links = new THREE.InstancedMesh(new THREE.TorusGeometry(0.0042, 0.0011, 4, 10), gold(), total);
    links.frustumCulled = false; links.renderOrder = 2; root.add(links); this.extra.push(links);
    // hung now, not at her feet until the first frame
    this.update(1 / 60);
  }

  // her body pushes a charm out (and takes most of the push off its speed: it rests on her, it doesn't bounce off)
  _push(it, x, y, z) { it.C.x += x; it.C.y += y; it.C.z += z; it.Cp.x += x * 0.85; it.Cp.y += y * 0.85; it.Cp.z += z * 0.85; }
  _body(it, HW) {
    const q = _v.copy(it.C).applyMatrix4(_inv), R = HIPS.r, c = HIPS.c;
    const ex = (q.x - c[0]) / (R[0] + it.rad), ey = (q.y - c[1]) / (R[1] + it.rad), ez = (q.z - c[2]) / (R[2] + it.rad), d2 = ex * ex + ey * ey + ez * ez;
    if (d2 < 1) {
      const k = 1 / Math.sqrt(Math.max(1e-8, d2));
      q.set(c[0] + ex * k * (R[0] + it.rad), c[1] + ey * k * (R[1] + it.rad), c[2] + ez * k * (R[2] + it.rad)).applyMatrix4(HW);
      this._push(it, q.x - it.C.x, q.y - it.C.y, q.z - it.C.z);
    }
    for (const [A, B] of this._thighs) {
      _u.subVectors(B, A); const t = Math.max(0, Math.min(1, _n.subVectors(it.C, A).dot(_u) / Math.max(1e-6, _u.lengthSq())));
      _f.copy(A).addScaledVector(_u, t); _r.subVectors(it.C, _f); const d = _r.length(), want = THIGH_R + it.rad;
      if (d < want && d > 1e-6) { _r.multiplyScalar((want - d) / d); this._push(it, _r.x, _r.y, _r.z); }
    }
  }
  // the chain: never longer than it is (it can go slack)
  _chain(it, P) { _v.subVectors(it.C, P); const d = _v.length(); if (d > it.reach) it.C.copy(P).addScaledVector(_v, it.reach / d); }

  update(dt) {
    if (!this.items.length || !this.hip || dt <= 0) return;
    const root = this.h.root; root.updateWorldMatrix(true, false); this.hip.updateWorldMatrix(true, false);
    const HW = this.hip.matrixWorld; _inv.copy(HW).invert(); _rootInv.copy(root.matrixWorld).invert();
    this._thighs = this._thighs || this.legs.map(() => [new THREE.Vector3(), new THREE.Vector3()]);
    this.legs.forEach(([a, b], i) => { a.getWorldPosition(this._thighs[i][0]); b.getWorldPosition(this._thighs[i][1]); });
    const steps = Math.min(4, Math.ceil(dt / (1 / 120))), h = dt / steps, damp = Math.exp(-DAMP * h);
    let li = 0;
    for (const it of this.items) {
      const P = _P.copy(it.pivot).applyMatrix4(HW);
      // first frame, or she was put somewhere else (a rewind, a new section; not a dash): hanging straight down, still
      if (!it.live || P.distanceToSquared(it.P) > 1.44) { it.C.copy(P); it.C.y -= it.reach; it.Cp.copy(it.C); it.live = true; it.f.set(0, 0, 1).transformDirection(HW); }
      it.P.copy(P);
      for (let s = 0; s < steps; s++) {
        _v.subVectors(it.C, it.Cp).multiplyScalar(damp);
        it.Cp.copy(it.C); it.C.add(_v); it.C.y -= G * h * h;
        this._chain(it, P); this._body(it, HW); this._chain(it, P);
      }
      // hanging along its chain, its face turned out from her
      const up = _u.subVectors(P, it.C); up.divideScalar(Math.max(1e-6, up.length()));
      _v.copy(it.C).applyMatrix4(_inv); _n.set(_v.x, 0, _v.z); if (_n.lengthSq() < 1e-8) _n.set(0, 0, 1); _n.normalize().transformDirection(HW);
      _f.copy(_n).addScaledVector(up, -_n.dot(up));
      if (_f.lengthSq() > 1e-6) it.f.lerp(_f.normalize(), Math.min(1, dt * 25));
      _f.copy(it.f).addScaledVector(up, -it.f.dot(up)); if (_f.lengthSq() < 1e-8) _f.set(1, 0, 0).addScaledVector(up, -up.x); _f.normalize();
      _r.crossVectors(up, _f).normalize();
      _q.setFromRotationMatrix(_m.makeBasis(_r, up, _f));
      _A.copy(it.C).addScaledVector(up, it.half);
      _w.compose(_A, _q, _s1).premultiply(_rootInv).decompose(it.g.position, it.g.quaternion, _sc);
      // its chain, link by link from the clasp's bar to its hold point, every other one turned a quarter
      for (let j = 0; j < it.nLinks; j++) {
        _pos.lerpVectors(P, _A, (j + 0.5) / it.nLinks);
        if (j % 2) _m.makeBasis(_f, up, _b.copy(_r).negate()); else _m.makeBasis(_r, up, _f);
        _q.setFromRotationMatrix(_m);
        this.links.setMatrixAt(li++, _w.compose(_pos, _q, _link).premultiply(_rootInv));
      }
    }
    this.links.instanceMatrix.needsUpdate = true;
  }
}
