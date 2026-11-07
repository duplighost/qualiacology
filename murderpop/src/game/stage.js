// The stage: real-time set pieces on top of an arena's baked set. Pieces move on the song's beats (walls fly,
// doors swing, racks roll), carry colliders that join the arena's, and breakables shatter when you strike them
// (or when her attacks hit them) with a payoff you see and hear.
import * as THREE from 'three';

const E = { inOut: (k) => k * k * (3 - 2 * k), out: (k) => 1 - Math.pow(1 - k, 3), in: (k) => k * k * k, back: (k) => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }, linear: (k) => k };

export class Stage {
  constructor(f, arena) {
    this.f = f; this.arena = arena; this.group = new THREE.Group(); f.scene.add(this.group);
    this.pieces = []; this.tweens = [];
    // chain the arena's collision with ours
    const base = arena.resolve.bind(arena);
    arena.resolve = (x, z, r) => { const p = base(x, z, r); return this.resolve(p.x, p.z, r); };
    const prevArc = arena.strikeArc ? arena.strikeArc.bind(arena) : null;
    arena.strikeArc = (x, z, ang, range, arc, s, ff) => { prevArc && prevArc(x, z, ang, range, arc, s, ff); this.strikeArc(x, z, ang, range, arc, s); };
  }

  // add a piece: obj (Object3D), collider {type:'circle', r} | {type:'box', w, d} (in the piece's own frame),
  // breakable {hp, chips: Color, onBreak(piece)}, solid (blocks you), tag
  add(obj, o = {}) {
    this.group.add(obj);
    const p = { obj, col: o.collider || null, solid: o.solid ?? !!o.collider, hp: o.breakable ? (o.breakable.hp ?? 1) : 0, brk: o.breakable || null, tag: o.tag || '', alive: true, home: { p: obj.position.clone(), q: obj.quaternion.clone(), s: obj.scale.clone(), v: obj.visible } };
    this.pieces.push(p);
    return p;
  }
  byTag(tag) { return this.pieces.filter((p) => p.tag === tag); }

  // move a piece to a transform starting at song time `at` over `dur` seconds
  tween(p, to, at, dur, easing = 'inOut') {
    const o = p.obj || p;
    this.tweens.push({ o, from: null, to, at, dur: Math.max(0.01, dur), e: E[easing] || E.inOut });
  }

  resolve(x, z, r) {
    for (const p of this.pieces) {
      if (!p.alive || !p.solid || !p.col || !p.obj.visible) continue;
      const o = p.obj, ox = o.position.x, oz = o.position.z;
      if (p.col.type === 'circle') {
        const dx = x - ox, dz = z - oz, d = Math.hypot(dx, dz), m = p.col.r + r;
        if (d < m && d > 1e-5) { x = ox + dx / d * m; z = oz + dz / d * m; }
      } else {
        // box in the piece's yaw frame
        const a = -o.rotation.y, ca = Math.cos(a), sa = Math.sin(a);
        let lx = (x - ox) * ca - (z - oz) * sa, lz = (x - ox) * sa + (z - oz) * ca;
        const hw = p.col.w / 2 + r, hd = p.col.d / 2 + r;
        if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
          const px = hw - Math.abs(lx), pz = hd - Math.abs(lz);
          if (px < pz) lx = Math.sign(lx || 1) * hw; else lz = Math.sign(lz || 1) * hd;
          x = ox + lx * ca + lz * sa; z = oz - lx * sa + lz * ca;
        }
      }
    }
    return { x, z };
  }

  strikeArc(x, z, ang, range, arc, s) {
    for (const p of this.pieces) {
      if (!p.alive || !p.brk || !p.obj.visible) continue;
      const dx = p.obj.position.x - x, dz = p.obj.position.z - z, d = Math.hypot(dx, dz);
      const reach = range + (p.col ? (p.col.r || Math.max(p.col.w, p.col.d) / 2) : 0.5);
      if (d > reach) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > 0.9) continue;
      this.hit(p, s && s.heavy ? 2 : 1, ang);
    }
  }
  // something hit a breakable (your strike, or her attack)
  hit(p, dmg = 1, ang = 0) {
    if (!p.alive || !p.brk) return;
    p.hp -= dmg;
    const f = this.f, o = p.obj;
    const c = p.brk.chips || new THREE.Color(2, 1.9, 1.8);
    f.fx.chips(o.position.x, 1.0, o.position.z, c, 8, ang);
    if (p.hp <= 0) {
      p.alive = false;
      f.fx.chips(o.position.x, 1.0, o.position.z, c, 34);
      f.fx.glitter(o.position.x, 1.1, o.position.z, p.brk.glitter || new THREE.Color(3, 2.2, 0.8), 14, 0.8);
      f.cam.shake(0.4, 0.12);
      f.sfx.breakProp ? f.sfx.breakProp(f.pan(o.position.x), p.brk.sound) : (f.sfx.break && f.sfx.break(f.pan(o.position.x)));
      o.visible = false;
      f._good && f._good(60);
      p.brk.onBreak && p.brk.onBreak(p);
    } else {
      o.position.x += Math.sin(ang) * 0.05; o.position.z += Math.cos(ang) * 0.05;
      f.sfx.hitProp && f.sfx.hitProp(f.pan(o.position.x), p.brk.sound);
    }
  }

  update(t) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const w = this.tweens[i];
      if (t < w.at) continue;
      if (!w.from) w.from = { p: w.o.position.clone(), r: w.o.rotation.clone(), s: w.o.scale.clone() };
      const k = w.e(Math.min(1, (t - w.at) / w.dur));
      if (w.to.p) w.o.position.lerpVectors(w.from.p, w.to.p, k);
      if (w.to.r) w.o.rotation.set(w.from.r.x + (w.to.r.x - w.from.r.x) * k, w.from.r.y + (w.to.r.y - w.from.r.y) * k, w.from.r.z + (w.to.r.z - w.from.r.z) * k);
      if (w.to.s) w.o.scale.lerpVectors(w.from.s, w.to.s, k);
      if (w.to.visible !== undefined && k >= 1) w.o.visible = w.to.visible;
      if (k >= 1) this.tweens.splice(i, 1);
    }
  }

  // rewinds: put every piece back to its state at time t (pieces that broke after t come back)
  reset() {
    this.tweens.length = 0;
    for (const p of this.pieces) { p.obj.position.copy(p.home.p); p.obj.quaternion.copy(p.home.q); p.obj.scale.copy(p.home.s); p.obj.visible = p.home.v; p.alive = true; p.hp = p.brk ? (p.brk.hp ?? 1) : 0; }
  }
  dispose() { this.f.scene.remove(this.group); }
}
