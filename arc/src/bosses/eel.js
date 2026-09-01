// THE EEL — chapter III. Surfaces every 8 s, rearing: the back climbs out of the water in
// a long arc to the head, which is the highest point. Its back is a LIVING RAIL that runs
// up to the head. Three lanterns down its length (head, neck, back). Call before it dives
// or you go in with it. A hit makes it plunge early and come up somewhere else.
//
// Cost: the body tube is written IN PLACE into one preallocated BufferGeometry every sim
// step (no allocation, no dispose, no index re-upload); nothing is built while it is
// inactive and under the water.
import * as THREE from 'three';
import { Boss, VIOLET } from './base.js';
import { Rail } from '../rail.js';

const _v = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Vector3(), _tan = new THREE.Vector3(), _nrm = new THREE.Vector3(), _bin = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const smooth = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

export class Eel extends Boss {
  constructor(ctx, { x, z }) {
    super(ctx, { tag: 'eel', x, z });
    const g = this.group;
    this.skin = new THREE.MeshStandardMaterial({ color: 0x1e2450, roughness: 0.5, metalness: 0.25, emissive: 0x2a1f60, emissiveIntensity: 0.5 });
    this.bodyMats = [this.skin];
    // the spine, in group-local space (the group never rotates; world = local + position)
    this.N = 40;
    this.spine = Array.from({ length: this.N }, () => new THREE.Vector3());
    // one tube geometry, written in place
    this.S = 56; this.R = 9;
    const nv = (this.S + 1) * (this.R + 1);
    this.tubePos = new Float32Array(nv * 3); this.tubeNor = new Float32Array(nv * 3);
    const idx = new Uint16Array(this.S * this.R * 6);
    let o = 0;
    for (let i = 0; i < this.S; i++) for (let j = 0; j < this.R; j++) {
      const a = i * (this.R + 1) + j, b = a + this.R + 1;
      idx[o++] = a; idx[o++] = b; idx[o++] = a + 1; idx[o++] = b; idx[o++] = b + 1; idx[o++] = a + 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.tubePos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.tubeNor, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 260);
    this.tube = new THREE.Mesh(geo, this.skin); this.tube.frustumCulled = false; g.add(this.tube);
    // head
    this.head = new THREE.Group(); g.add(this.head);
    this.headInner = new THREE.Group(); this.head.add(this.headInner);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(8.5, 14, 10), this.skin); skull.scale.set(1, 0.8, 1.5); this.headInner.add(skull);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(6.5, 10, 8), this.skin); jaw.scale.set(0.9, 0.5, 1.4); jaw.position.set(0, -3.5, -4); this.headInner.add(jaw);
    const eyeMat = new THREE.MeshBasicMaterial({ color: VIOLET, toneMapped: false }); this.eyeMat = eyeMat;
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 6), eyeMat); e.position.set(s * 5, 3, -6.5); this.headInner.add(e); }
    // fins along the back
    this.finMat = new THREE.MeshStandardMaterial({ color: 0x0f1230, roughness: 0.9, side: THREE.DoubleSide });
    this.fins = [];
    for (let i = 0; i < 12; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(2.6, 9, 4), this.finMat); g.add(f); this.fins.push(f); }
    // colliders down the body (locals rewritten each shape), then the head
    this.bodyColliders = [];
    for (let i = 0; i < 8; i++) this.bodyColliders.push(this.addCollider(new THREE.Vector3(), 7.5));
    this.headCollider = this.addCollider(new THREE.Vector3(), 10);
    // lanterns: head, neck, back (positions follow the spine)
    this.lanternHead = this.addLantern(new THREE.Vector3(0, 0, 0), 2.6);
    this.lanternMid = this.addLantern(new THREE.Vector3(0, 0, 0), 2.6);
    this.lanternTail = this.addLantern(new THREE.Vector3(0, 0, 0), 2.6);
    // the living rail along its back
    this.rail = new Rail(ctx.scene, { maxPoints: 64, width: 0.9 });
    this.rail.mat.uniforms.uColor.value.setHex(0xb59cff); this.rail.matMirror.uniforms.uColor.value.setHex(0xb59cff);
    this.rail.mat.uniforms.uIntensity.value = 0.7; this.rail.matMirror.uniforms.uIntensity.value = 0.5;
    this.rail.tag = 'eel-back';
    this.cycle = 0; this.period = 8; this.arcLen = 120; this.height = 26; this.heading = 0;
    this.surfaced = false; this.hurry = 0; this.kneel = 0; this.headYawDead = 0;
    this.railPts = Array.from({ length: 30 }, () => new THREE.Vector3());
    this.up = 0;
    this.shapeMs = 0;       // last _shape cost, for the tests
    this._setVisible(false);
    this._shape(0);
  }

  _setVisible(v) {
    this.tube.visible = v; this.head.visible = v;
    for (const f of this.fins) f.visible = v;
    for (const l of this.lanterns) l.mesh.visible = v;
  }

  // Catmull-Rom on the spine, t in [0,1]
  _spineAt(t, out) {
    const N = this.N, u = THREE.MathUtils.clamp(t, 0, 1) * (N - 1), i = Math.min(N - 2, Math.floor(u)), f = u - i;
    const p0 = this.spine[Math.max(0, i - 1)], p1 = this.spine[i], p2 = this.spine[i + 1], p3 = this.spine[Math.min(N - 1, i + 2)];
    const f2 = f * f, f3 = f2 * f;
    const c0 = -0.5 * f3 + f2 - 0.5 * f, c1 = 1.5 * f3 - 2.5 * f2 + 1, c2 = -1.5 * f3 + 2 * f2 + 0.5 * f, c3 = 0.5 * f3 - 0.5 * f2;
    return out.set(c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x, c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y, c0 * p0.z + c1 * p1.z + c2 * p2.z + c3 * p3.z);
  }
  _radiusAt(t) { return 6.5 * (0.25 + 0.75 * smooth(0, 0.2, t)) * (1 - 0.3 * smooth(0.86, 1, t)); }

  // The arc: the body climbs out of the water from t=0.3 to the head at t=1 (the crest).
  // k in [0,1] is where in the surfacing cycle we are; `up` is how far out it is.
  _shape(k) {
    const t0 = performance.now();
    const N = this.N;
    const up = this.up = Math.sin(k * Math.PI);
    const along = (k - 0.5) * this.arcLen;     // the whole arc slides forward through the cycle
    const ang = this.heading, ca = Math.cos(ang), sa = Math.sin(ang);
    const lift = (this.height + 22) * up * (1 - this.kneel * 0.4);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const s = (t - 0.5) * 200 + along * 0.6;
      const climb = smooth(0.3, 0.86, t) * (1 - 0.06 * smooth(0.9, 1, t));  // the neck arches forward a little
      const y = -22 + lift * climb;
      const wiggle = Math.sin(t * 9 + this.time * 2.5) * 5 * (1 - climb * 0.8);
      this.spine[i].set(ca * s - sa * wiggle, y, sa * s + ca * wiggle);
    }
    // the tube, in place
    const S = this.S, R = this.R, pos = this.tubePos, nor = this.tubeNor;
    for (let i = 0; i <= S; i++) {
      const t = i / S;
      this._spineAt(t, _p); this._spineAt(Math.min(1, t + 0.012), _q); _tan.subVectors(_q, _p);
      if (_tan.lengthSq() < 1e-8) _tan.set(1, 0, 0); _tan.normalize();
      _nrm.crossVectors(_tan, UP); if (_nrm.lengthSq() < 1e-4) _nrm.set(1, 0, 0); _nrm.normalize();
      _bin.crossVectors(_nrm, _tan);
      const r = this._radiusAt(t);
      for (let j = 0; j <= R; j++) {
        const a = (j / R) * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
        const nx = cs * _nrm.x + sn * _bin.x, ny = cs * _nrm.y + sn * _bin.y, nz = cs * _nrm.z + sn * _bin.z;
        const o = (i * (R + 1) + j) * 3;
        pos[o] = _p.x + nx * r; pos[o + 1] = _p.y + ny * r; pos[o + 2] = _p.z + nz * r;
        nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
      }
    }
    this.tube.geometry.attributes.position.needsUpdate = true; this.tube.geometry.attributes.normal.needsUpdate = true;
    // head at the front (the last point), looking along the spine
    const hp = this.spine[N - 1], hq = this.spine[N - 3];
    this.head.position.copy(hp);
    // Object3D.lookAt points +z at the target; the snout is at -z, so look at the point behind
    _v.subVectors(hp, hq).normalize();
    _p.copy(hp).sub(_v).add(this.group.position);
    this.head.lookAt(_p);
    this.headInner.rotation.y = this.headYawDead;
    const at = (f) => this._spineAt(f, _v);
    this.lanternHead.mesh.position.copy(at(0.985)).y += 7;
    this.lanternMid.mesh.position.copy(at(0.84)).y += 6.5;
    this.lanternTail.mesh.position.copy(at(0.68)).y += 6.5;
    for (let i = 0; i < this.lanterns.length; i++) this.lanterns[i].collider.local.copy(this.lanterns[i].mesh.position);
    for (let c = 0; c < 8; c++) this._spineAt(0.25 + c * 0.1, this.bodyColliders[c].local);
    this.headCollider.local.copy(hp);
    for (const [i, f] of this.fins.entries()) { at(0.3 + i * 0.06); f.position.copy(_v); f.position.y += this._radiusAt(0.3 + i * 0.06) + 3; }
    // the back rail: from the first point that is 4 m clear of the water up to the head
    const wy = this.ctx.world.waterY - this.group.position.y;
    if (!this.dead) {
      let tStart = -1;
      for (let i = 0; i < N; i++) if (this.spine[i].y > wy + 4.5) { tStart = i / (N - 1); break; }
      if (tStart >= 0 && tStart < 0.9) {
        for (let i = 0; i < 30; i++) { const t = tStart + (i / 29) * (0.975 - tStart); this._spineAt(t, this.railPts[i]); this.railPts[i].y += this._radiusAt(t) + 0.4; this.railPts[i].add(this.group.position); }
        this.rail.setPoints(this.railPts);
        this.rail.mesh.visible = this.rail.mirror.visible = true;
      } else if (this.rail.live) this.rail.vanish();
    } else if (this.rail.live) this.rail.vanish();
    this.shapeMs = performance.now() - t0;
  }

  onLantern(l) {
    this.dimBody();
    // it plunges: the cycle hurries to the dive, the head shakes
    if (this.cycle < 0.8) this.hurry = 1;
    this.ctx.fx.emit(this.head.getWorldPosition(new THREE.Vector3()), { n: 40, color: 0x9fb4ff, speed: 8, life: 0.9, size: 0.3, grav: 8, spread: 1.5 });
  }
  onDeath() { this.rail.vanish(); this.hurry = 0; }

  update(dt, rider) {
    super.update(dt, rider);
    if (this.active && !this.dead) {
      if (!this.tube.visible) this._setVisible(true);
      const rate = 1 + this.hurry * 3;
      const prev = this.cycle;
      this.cycle = (this.cycle + (dt / this.period) * rate) % 1;
      const k = this.cycle;
      // the new heading is taken under the water, at the wrap: nothing teleports
      if (k < prev && this.headingNext !== undefined) { this.heading = this.headingNext; this.headingNext = undefined; }
      if (this.hurry > 0 && k > 0.86) this.hurry = 0;
      if (k > 0.12 && k < 0.5 && !this.surfaced) { this.surfaced = true; this.ctx.events.emit('surface', { t: this.ctx.time }); this.ctx.camera.shake(0.2); this.ctx.fx.emit(this.head.getWorldPosition(new THREE.Vector3()).setY(this.ctx.world.waterY + 0.5), { n: 70, color: 0x9fb4ff, speed: 9, life: 1.1, size: 0.3, grav: 10, spread: 1.5 }); }
      if (k > 0.8 && this.surfaced) { this.surfaced = false; this.ctx.events.emit('dive', { t: this.ctx.time }); this.headingNext = this.heading + 0.9; this.ctx.fx.emit(this.head.getWorldPosition(new THREE.Vector3()).setY(this.ctx.world.waterY + 0.5), { n: 70, color: 0x9fb4ff, speed: 9, life: 1.1, size: 0.3, grav: 10, spread: 1.5 }); }
      this._shape(k);
    } else if (this.dead) {
      // it settles: the arc sinks to a low loop, the head stays up and turns north, eyes warm
      this.kneel = Math.min(1, this.kneel + dt * 0.15);
      this.headYawDead += (Math.PI - this.headYawDead) * (1 - Math.exp(-0.5 * dt));
      this.eyeMat.color.lerp(new THREE.Color(0xffb24a), 1 - Math.exp(-0.8 * dt));
      this._shape(0.5);
    }
    this.rail.update(dt, this.time);
    // the rider on the back rail goes with it when it drops below 3 m or the rail is gone
    if (rider.state === 'rail' && rider.rail === this.rail) {
      if (rider.pos.y < this.ctx.world.waterY + 3 || !this.rail.live) rider.leaveRail();
    }
  }
}
