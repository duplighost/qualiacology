// Porcelain extras, cheap: a base body posed once on the CPU into a static mesh, then instanced. The jury of gym
// moms (teal tracksuits, sweatbands; their heads turn together to follow her and flinch at the gavel), the press
// with flash cameras, the gallery, and the HALL OF JUSTICE's eight blindfolded statues with swords (two poses:
// raised and struck, swapped on the slam).
import * as THREE from 'three';
import { LAYER } from '../../game/arena.js';

const _v = new THREE.Vector3();
// a static, posed copy of a skinned gltf: { body, head } geometries (head = the vertices that ride the head bone),
// in the model's space at the given scale, with vertex colours painted by region of the bind pose
export function posed(kit, gltf, clip, time, o = {}) {
  const model = kit.instance(gltf);
  const mixer = new THREE.AnimationMixer(model);
  if (clip && kit.clips[clip]) { const a = mixer.clipAction(kit.clips[clip]); a.play(); mixer.update(time); }
  if (o.pose) o.pose(model);
  model.updateMatrixWorld(true);
  let sm = null; model.traverse((m) => { if (m.isSkinnedMesh && (!sm || m.geometry.attributes.position.count > sm.geometry.attributes.position.count) && !m.name.startsWith('Eye')) sm = m; });
  const g = sm.geometry, P = g.attributes.position, n = P.count;
  const headIdx = sm.skeleton.bones.findIndex((b) => b.name === 'Head'), neckIdx = sm.skeleton.bones.findIndex((b) => b.name === 'neck_01');
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), isHead = new Uint8Array(n);
  let minY = 9, maxY = -9; for (let i = 0; i < n; i++) { const y = P.getY(i); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const paint = o.paint || (() => [1, 1, 1]);
  for (let i = 0; i < n; i++) {
    _v.fromBufferAttribute(P, i); const bindY = (_v.y - minY) / (maxY - minY), bindX = _v.x;
    sm.applyBoneTransform(i, _v); _v.applyMatrix4(sm.matrixWorld);
    pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
    let hw = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k); if (b === headIdx || (o.neckToo && b === neckIdx)) hw += sw.getComponent(i, k); }
    isHead[i] = hw > 0.5 ? 1 : 0;
    const c = paint(bindY, bindX); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  const index = g.index.array;
  const split = (want) => {
    const tri = []; for (let t = 0; t < index.length; t += 3) { const a = index[t], b = index[t + 1], c = index[t + 2]; const h = isHead[a] + isHead[b] + isHead[c] >= 2 ? 1 : 0; if (h === want) tri.push(a, b, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3)); geo.setAttribute('color', new THREE.BufferAttribute(col.slice(), 3)); geo.setIndex(tri); geo.computeVertexNormals();
    return geo;
  };
  // the head's pivot: the neck joint
  const headBone = sm.skeleton.bones[headIdx]; const pivot = headBone ? headBone.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.5, 0);
  return { body: o.split === false ? split(0).copy(split(0)) : split(0), head: split(1), pivot, all: o.split === false ? null : null };
}

const porcelain = () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 });

export class Crowd {
  constructor(f, kit, gltf) {
    this.f = f; this.group = new THREE.Group(); this.group.name = 'ppg:crowd'; f.scene.add(this.group);
    const skin = [0.97, 0.94, 0.91];
    const teal = [0.06, 0.32, 0.3], white = [0.92, 0.92, 0.95], band = [0.98, 0.4, 0.6], black = [0.05, 0.04, 0.05], gold = [0.85, 0.62, 0.25], cream = [0.93, 0.88, 0.8];
    // the jury: gym moms in teal tracksuits with white stripes, pink sweatbands
    const jurySit = posed(kit, gltf, 'Sitting_Idle_Loop', 0.5, { paint: (y, x) => (y > 0.86 ? (y > 0.95 && y < 0.965 ? band : skin) : y < 0.05 ? white : Math.abs(Math.abs(x) - 0.1) < 0.012 && y < 0.5 ? white : teal) });
    const mat = porcelain();
    this.jury = this._instanced(jurySit, mat, 12, (i) => { const row = i < 6 ? 0 : 1; const z = -5.4 + (i % 6) * 1.25; const x = row ? -12.75 : -11.85; const y = row ? 0.86 : 0.42; return { x, y: y - 0.42, z, ry: Math.PI / 2, s: 1.12 }; });
    // the press: standing paparazzi in black with flash cameras up
    const pressStand = posed(kit, gltf, 'Idle_Loop', 0.3, { paint: (y) => (y > 0.86 ? skin : y < 0.05 ? black : [0.08, 0.07, 0.09]) });
    this.press = this._instanced(pressStand, porcelain(), 6, (i) => ({ x: i < 3 ? 11.85 : 12.75, y: i < 3 ? 0.3 : 0.7, z: -5.6 + (i % 3) * 2.3 + (i >= 3 ? 1.1 : 0), ry: -Math.PI / 2, s: 1.1 }));
    const camGeo = new THREE.BoxGeometry(0.22, 0.16, 0.14), camMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.4 });
    this.pressCams = new THREE.InstancedMesh(camGeo, camMat, 6); this.group.add(this.pressCams);
    // the gallery: spectators in the pews (cream and gold)
    const gal = posed(kit, gltf, 'Sitting_Idle_Loop', 1.4, { paint: (y) => (y > 0.86 ? skin : y < 0.05 ? black : y > 0.5 ? cream : gold) });
    const seats = []; for (let r = 0; r < 4; r++) for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { if ((r + k) % 3 === 2 && r > 0) continue; seats.push({ x: side * (2.6 + k * 2.6 + (r % 2) * 0.9), z: 8.15 + r * 1.1 - 0.05 }); }
    this.gallery = this._instanced(gal, porcelain(), seats.length, (i) => ({ x: seats[i].x, y: 0.0, z: seats[i].z, ry: Math.PI, s: 1.08 }));
    this.flashes = [];
    // flash sprites (the press box and the gallery cameras)
    const fc = document.createElement('canvas'); fc.width = fc.height = 64; const fg = fc.getContext('2d'); const gr = fg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,240,216,0.8)'); gr.addColorStop(1, 'rgba(255,240,216,0)'); fg.fillStyle = gr; fg.fillRect(0, 0, 64, 64);
    this.flashTex = new THREE.CanvasTexture(fc);
    this.pool = [];
    for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flashTex, color: 0xfff0d8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.visible = false; s.scale.setScalar(1.4); this.group.add(s); this.pool.push({ s, t0: -9 }); }
    this.flinchT = -9;
  }
  _instanced(pz, mat, n, at) {
    const body = new THREE.InstancedMesh(pz.body, mat, n), head = new THREE.InstancedMesh(pz.head, mat, n);
    body.castShadow = head.castShadow = false;   // nothing real-time stands under them: no shadow pass
    body.layers.set(LAYER.NO_REFLECT); head.layers.set(LAYER.NO_REFLECT);   // and the floor doesn't mirror the stands
    const items = [];
    for (let i = 0; i < n; i++) { const p = at(i); items.push(p); }
    this.group.add(body, head);
    const rec = { body, head, items, pivot: pz.pivot, n };
    this._place(rec, 0, null);
    return rec;
  }
  _place(rec, t, look, flinch = 0) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    const hm = new THREE.Matrix4(), toP = new THREE.Matrix4(), fromP = new THREE.Matrix4();
    rec.items.forEach((it, i) => {
      const bob = Math.sin(t * 1.3 + i * 1.7) * 0.01 + flinch * 0.06;
      p.set(it.x, it.y + bob, it.z); q.setFromEuler(e.set(0, it.ry, 0)); s.setScalar(it.s);
      m.compose(p, q, s); rec.body.setMatrixAt(i, m);
      // the head turns toward her (yaw in the body's frame, clamped), pivoting at the neck
      let yaw = 0;
      if (look) { const wa = Math.atan2(look.x - it.x, look.z - it.z); yaw = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(wa - it.ry), Math.cos(wa - it.ry)))); }
      toP.makeTranslation(-rec.pivot.x, -rec.pivot.y, -rec.pivot.z); fromP.makeTranslation(rec.pivot.x, rec.pivot.y, rec.pivot.z);
      hm.makeRotationFromEuler(e.set(-flinch * 0.25, yaw, 0)).premultiply(fromP).multiply(toP);
      rec.head.setMatrixAt(i, m.clone().multiply(hm));
    });
    rec.body.instanceMatrix.needsUpdate = true; rec.head.instanceMatrix.needsUpdate = true;
  }
  flinch(t) { this.flinchT = t; }
  // a camera flash at (x, y, z)
  pop(x, y, z, t) { const f = this.pool.find((q) => t - q.t0 > 0.25) || this.pool[0]; f.t0 = t; f.s.position.set(x, y, z); f.s.visible = true; }
  update(t, boss) {
    const fl = Math.exp(-Math.max(0, t - this.flinchT) * 7) * (t >= this.flinchT ? 1 : 0);
    const look = t > 3.534 ? boss : null;
    this._place(this.jury, t, look, fl);
    this._place(this.gallery, t, boss, fl * 0.6);
    this._place(this.press, t, boss, 0);
    // the press hold their cameras up at their faces
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    this.press.items.forEach((it, i) => { p.set(it.x - 0.35, it.y + 1.85, it.z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.ry); m.compose(p, q, s); this.pressCams.setMatrixAt(i, m); });
    this.pressCams.instanceMatrix.needsUpdate = true;
    for (const q2 of this.pool) { const k = t - q2.t0; q2.s.visible = k >= 0 && k < 0.22; if (q2.s.visible) { q2.s.material.opacity = 1 - k / 0.22; q2.s.scale.setScalar(1.1 + k * 4); } }
  }
  pressPop(t, quiet = false) { const it = this.press.items[Math.floor(Math.random() * 6)]; this.pop(it.x - 0.45, it.y + 1.85, it.z, t); if (!quiet) this.f.ppg.snd.play('shutter', { pan: this.f.pan(it.x), gain: 0.18, gate: 0.05 }); }
  galleryPop(t) { const it = this.gallery.items[Math.floor(Math.random() * this.gallery.items.length)]; this.pop(it.x, it.y + 1.5, it.z - 0.2, t); }
  dispose() { this.f.scene.remove(this.group); }
}

// ------------------------------------------------------------------------------------------ the HALL OF JUSTICE
// white marble statues of Lady Justice in niches (x = +-10.8, z = -5, -1.5, 2, 5.5), 3.2 m, blindfolded, scales in one
// hand and a sword in the other; white marble columns with gold capitals between them. They fly in at 121.215.
export class Hall {
  constructor(f, kit, gltf, reach) {
    this.f = f; this.group = new THREE.Group(); this.group.name = 'ppg:hall'; f.scene.add(this.group);
    const marble = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 });
    const paint = (y) => (y > 0.93 && y < 0.955 ? [0.85, 0.62, 0.25] : [0.95, 0.93, 0.9]);
    // two poses: the sword raised high, and struck down
    const pose = (k) => (model) => {
      const b = {}; model.traverse((o) => { if (o.isBone) b[o.name] = o; });
      model.updateMatrixWorld(true);
      const S = b.upperarm_r.getWorldPosition(new THREE.Vector3());
      const tgt = k ? S.clone().add(new THREE.Vector3(-0.05, -0.25, 0.55)) : S.clone().add(new THREE.Vector3(-0.1, 0.62, 0.05));
      reach(b.upperarm_r, b.lowerarm_r, b.hand_r, tgt, S.clone().add(new THREE.Vector3(0, -0.5, -0.5)));
      const L = b.upperarm_l.getWorldPosition(new THREE.Vector3());
      reach(b.upperarm_l, b.lowerarm_l, b.hand_l, L.clone().add(new THREE.Vector3(0.25, 0.1, 0.35)), L.clone().add(new THREE.Vector3(0.5, -0.6, -0.3)));
      model.updateMatrixWorld(true);
      this['hand' + k] = b.hand_r.getWorldPosition(new THREE.Vector3());
      this['dir' + k] = b.hand_r.getWorldPosition(new THREE.Vector3()).sub(b.lowerarm_r.getWorldPosition(new THREE.Vector3())).normalize();
      this['handL'] = b.hand_l.getWorldPosition(new THREE.Vector3());
    };
    const A = posed(kit, gltf, 'Idle_Loop', 0.2, { paint, pose: pose(0) });
    const B = posed(kit, gltf, 'Idle_Loop', 0.2, { paint, pose: pose(1) });
    const merge = (pz) => { const g = pz.body.clone(); const hi = pz.head.index.array; const bi = g.index.array; const ni = new Uint32Array(bi.length + hi.length); ni.set(bi); ni.set(hi, bi.length); g.setIndex(new THREE.BufferAttribute(ni, 1)); g.computeVertexNormals(); return g; };
    const ga = merge(A), gb = merge(B);
    this.spots = [];
    for (const s of [-1, 1]) for (const z of [-5, -1.5, 2, 5.5]) this.spots.push({ x: s * 10.8, z, s });
    const n = this.spots.length;
    this.A = new THREE.InstancedMesh(ga, marble, n); this.B = new THREE.InstancedMesh(gb, marble, n);
    this.A.castShadow = this.B.castShadow = false;
    this.group.add(this.A, this.B);
    // swords and scales, gold (two swords: raised and struck)
    const gold = new THREE.MeshPhysicalMaterial({ color: 0xd8a443, metalness: 1, roughness: 0.25 });
    const sword = new THREE.CylinderGeometry(0.025, 0.04, 1.3, 6); sword.translate(0, 0.65, 0);
    this.swA = new THREE.InstancedMesh(sword, gold, n); this.swB = new THREE.InstancedMesh(sword, gold, n);
    const scale = new THREE.TorusGeometry(0.16, 0.02, 6, 18); this.scales = new THREE.InstancedMesh(scale, gold, n * 2);
    this.group.add(this.swA, this.swB, this.scales);
    // columns between the niches
    const shaft = new THREE.CylinderGeometry(0.36, 0.42, 6.5, 20); shaft.translate(0, 3.25, 0);
    const cap = new THREE.CylinderGeometry(0.62, 0.42, 0.45, 20); cap.translate(0, 6.7, 0);
    const colM = new THREE.MeshPhysicalMaterial({ color: 0xf1ede7, roughness: 0.3, clearcoat: 0.4 });
    const cols = []; for (const s of [-1, 1]) for (const z of [-6.6, -3.25, 0.25, 3.75, 6.9]) cols.push({ x: s * 11.4, z });
    this.cols = new THREE.InstancedMesh(shaft, colM, cols.length); this.caps = new THREE.InstancedMesh(cap, gold, cols.length);
    const m = new THREE.Matrix4(); cols.forEach((c, i) => { m.makeTranslation(c.x, 0, c.z); this.cols.setMatrixAt(i, m); this.caps.setMatrixAt(i, m); });
    this.group.add(this.cols, this.caps);
    this.colList = cols;
    this.slamT = { '1': 122.770, '-1': 125.849 };
    this.k = 0;
  }
  update(t) {
    // fly in 121.215 (over a bar), out with the breath (135.138)
    const ein = Math.min(1, Math.max(0, (t - 121.215) / 1.2)), eout = Math.min(1, Math.max(0, (t - 135.138) / 1.0));
    const k = t < 121.215 ? 0 : t < 135.138 ? ein * ein * (3 - 2 * ein) : 1 - eout;
    this.group.visible = k > 0.002;
    if (!this.group.visible) return;
    const y = (1 - k) * 9;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1.8, 1.8, 1.8), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const ms = new THREE.Matrix4(), qs = new THREE.Quaternion();
    this.spots.forEach((sp, i) => {
      const struck = t >= this.slamT[String(sp.s)] && t < 135.138;
      // the chant: they face the centre (127.414 on)
      const face = t >= 126.2 ? Math.atan2(-sp.x, -sp.z) * 0.5 + (sp.s > 0 ? -Math.PI / 2 : Math.PI / 2) * 0.5 : (sp.s > 0 ? -Math.PI / 2 : Math.PI / 2);
      q.setFromAxisAngle(up, face); p.set(sp.x, y, sp.z);
      m.compose(p, q, s);
      const hide = new THREE.Matrix4().makeScale(0, 0, 0);
      this.A.setMatrixAt(i, struck ? hide : m); this.B.setMatrixAt(i, struck ? m : hide);
      // the sword in the hand, along the forearm
      const hand = (struck ? this.hand1 : this.hand0).clone().multiplyScalar(1.8).applyQuaternion(q).add(p);
      const dir = (struck ? this.dir1 : this.dir0).clone().applyQuaternion(q);
      qs.setFromUnitVectors(up, dir); ms.compose(hand, qs, new THREE.Vector3(1.6, 1.6, 1.6));
      this.swA.setMatrixAt(i, struck ? hide : ms); this.swB.setMatrixAt(i, struck ? ms : hide);
      const hl = this.handL.clone().multiplyScalar(1.8).applyQuaternion(q).add(p);
      ms.compose(hl.clone().add(new THREE.Vector3(0, -0.5, 0)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1.5, 1.5, 1.5));
      this.scales.setMatrixAt(i * 2, ms);
      const tilt = t > 127.4 && t < 135.1 ? Math.sin(t * 8) * 0.15 : 0;
      ms.compose(hl.clone().add(new THREE.Vector3(0.25, -0.45 + tilt, 0)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1.5, 1.5, 1.5));
      this.scales.setMatrixAt(i * 2 + 1, ms);
    });
    for (const im of [this.A, this.B, this.swA, this.swB, this.scales]) im.instanceMatrix.needsUpdate = true;
    this.colList.forEach((c, i) => { m.makeTranslation(c.x, y, c.z); this.cols.setMatrixAt(i, m); this.caps.setMatrixAt(i, m); });
    this.cols.instanceMatrix.needsUpdate = true; this.caps.instanceMatrix.needsUpdate = true;
  }
  dispose() { this.f.scene.remove(this.group); }
}
