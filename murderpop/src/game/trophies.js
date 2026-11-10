// What YOU has taken off each of them so far, on her belt: the price tag, the spare key, the gavel, the locket, the
// headlight, the teddy bear... Every fight she walks into, she's wearing the ones before it, and they swing when she
// moves. It's the record's through line without a word: she goes down the track list and keeps something from each.
// (The credits' plastic bag is where they all end up.)
import * as THREE from 'three';
import { makeKeepsake, KEEPSAKE_SIZE } from '../ui/keepsakes.js';

// where each hangs round her hips (angle from straight ahead, radians: none dead centre in front), how big it's worn
// (her coat is open at the front: they hang there, on the hips, where they show)
const SLOTS = [0.95, -0.95, 0.55, -0.55, 1.35, -1.35, 1.7, -1.7, 0.2, -0.2];
const WORN = { tag: 0.14, key: 0.13, gavel: 0.14, locket: 0.11, headlight: 0.17, teddy: 0.24, giltkey: 0.17, star: 0.13, pin: 0.09, prize: 0.1 };

export class Trophies {
  constructor(heroine) {
    this.h = heroine; this.items = []; this.kinds = '';
    this.bone = heroine.rig.bones.pelvis || heroine.rig.bones.spine_01 || null;
    this._p = new THREE.Vector3(); this._last = new THREE.Vector3(); this._v = new THREE.Vector3(); this._q = new THREE.Quaternion();
  }
  // kinds: the keepsakes she has (in the order she took them)
  set(kinds) {
    const key = kinds.join(',');
    if (key === this.kinds) return;
    this.kinds = key;
    for (const it of this.items) it.hang.parent && it.hang.parent.remove(it.hang);
    this.items.length = 0;
    if (!this.bone) return;
    const root = this.h.root; root.updateWorldMatrix(true, true);
    const pw = this.bone.getWorldPosition(new THREE.Vector3()), yaw = root.rotation.y;
    kinds.forEach((kind, i) => {
      const a = SLOTS[i % SLOTS.length], R = 0.185;
      const hang = new THREE.Group(), m = makeKeepsake(kind);
      const s = (WORN[kind] || 0.12) / (KEEPSAKE_SIZE[kind] || 0.12);
      m.scale.setScalar(s);
      // it hangs from a short loop: the thing itself a little below the belt, turned to lie against her
      m.rotation.set(Math.PI / 2, 0, 0); m.position.set(0, -(WORN[kind] || 0.12) * 0.55 - 0.03, 0);
      // (drawn with her, after the see-through pass: they're hers, not something she's hidden behind)
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.renderOrder = 2; } });
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 12), new THREE.MeshStandardMaterial({ color: 0xc98a4a, metalness: 0.9, roughness: 0.3 }));
      loop.position.y = -0.012; loop.renderOrder = 2; hang.add(loop, m);
      // placed in the world round her hips, facing out, then handed to the pelvis (so it rides every move she makes)
      const wa = yaw + a;
      hang.position.set(pw.x + Math.sin(wa) * R, pw.y + 0.02, pw.z + Math.cos(wa) * R);
      hang.rotation.set(0, wa, 0);
      root.parent ? root.parent.add(hang) : root.add(hang);
      this.bone.attach(hang);
      this.items.push({ hang, kind, rest: hang.quaternion.clone(), sx: 0, sz: 0, vx: 0, vz: 0, a });
    });
    this.bone.getWorldPosition(this._last);
  }
  // they swing: against the way her hips just moved, and settle
  update(dt) {
    if (!this.items.length || !this.bone || dt <= 0) return;
    this.bone.getWorldPosition(this._p);
    const yaw = this.h.root.rotation.y;
    this._v.copy(this._p).sub(this._last).divideScalar(Math.max(1e-3, dt)); this._last.copy(this._p);
    // her hips' velocity in her own frame
    const c = Math.cos(-yaw), s = Math.sin(-yaw), vx = this._v.x * c + this._v.z * s, vz = -this._v.x * s + this._v.z * c, vy = this._v.y;
    for (const it of this.items) {
      const ca = Math.cos(it.a), sa = Math.sin(it.a);
      // outward and sideways, for where it hangs
      const out = -(vx * sa + vz * ca) * 0.05 - Math.max(-3, Math.min(3, vy)) * 0.03, side = -(vx * ca - vz * sa) * 0.05;
      it.vx += ((out - it.sx) * 90 - it.vx * 9) * dt; it.vz += ((side - it.sz) * 90 - it.vz * 9) * dt;
      it.sx = Math.max(-1.1, Math.min(1.1, it.sx + it.vx * dt)); it.sz = Math.max(-1.1, Math.min(1.1, it.sz + it.vz * dt));
      it.hang.quaternion.copy(it.rest).multiply(this._q.setFromEuler(_e.set(-it.sx, 0, it.sz)));
    }
  }
}
const _e = new THREE.Euler();
