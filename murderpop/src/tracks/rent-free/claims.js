// THE RULE: everything she claims, you can break back. Anything of hers is glossy lilac porcelain with gold leaf
// and her red kiss on it. It cracks on each hit (a tink, a crackle), bursts on the last, and a gold lease-thread
// whips from it to her and lashes her body: that's the only time she flinches. Your things are matte and never
// break (a strike gives a dull thud and a puff of dust). Break a claim while she's using it and she's evicted.
import * as THREE from 'three';
import { kissTexture, crackTexture } from './paint.js';

export const U = 11;                       // fight damage per design unit (a strike A is 1.0 = 11)
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------------------------------------------------------------------------------------------- materials
let MATS = null;
export function mats() {
  if (MATS) return MATS;
  const glaze = new THREE.MeshPhysicalMaterial({ color: '#c86aff', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.035, sheen: 0.4, sheenColor: new THREE.Color('#ffd2f2'), sheenRoughness: 0.45, envMapIntensity: 1.25 });
  const deep = glaze.clone(); deep.color.set('#9a4ad8');
  const gold = new THREE.MeshPhysicalMaterial({ color: '#e9b949', metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
  const kiss = new THREE.MeshPhysicalMaterial({ map: kissTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  const cracked = [1, 2].map((l) => { const m = glaze.clone(); m.map = crackTexture(l); return m; });
  const crackedDeep = [1, 2].map((l) => { const m = deep.clone(); m.map = crackTexture(l); return m; });
  // the inside of her porcelain: unglazed white bisque
  const bisque = new THREE.MeshStandardMaterial({ color: '#fffdf8', roughness: 0.9 });
  MATS = { glaze, deep, gold, kiss, cracked, crackedDeep, bisque };
  return MATS;
}

// a kiss decal (a small quad) placed on a claim: pos and normal in the claim's frame
export function kissDecal(size = 0.3, pos = [0, 0, 0], normal = [0, 0, 1]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.8), mats().kiss);
  m.position.set(...pos); m.lookAt(_v.set(pos[0] + normal[0], pos[1] + normal[1], pos[2] + normal[2]));
  m.renderOrder = 3; m.userData.decal = true;
  return m;
}

// crack textures need white paper under them: the crack canvases are lines on transparent, so composite once
function crackOnWhite(level) {
  const src = crackTexture(level).image;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(src, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------------------------------------------------------------------------------------------- shards
// 3D porcelain shards and gold flakes from a burst: a small pool, simple physics on the floor plane
class ShardPool {
  constructor(scene, n = 180) {
    const g = new THREE.TetrahedronGeometry(1, 0); g.scale(1, 0.35, 0.8);
    const M = mats();
    this.meshes = [new THREE.InstancedMesh(g, M.glaze, n), new THREE.InstancedMesh(g, M.gold, Math.round(n * 0.4)), new THREE.InstancedMesh(g, M.bisque, Math.round(n * 0.3))];
    this.items = this.meshes.map(() => []);
    for (const m of this.meshes) { m.count = 0; m.frustumCulled = false; m.castShadow = false; scene.add(m); }
    this.scene = scene;
  }
  burst(x, y, z, n = 26, power = 1, k = [0.62, 0.22, 0.16]) {
    for (let j = 0; j < 3; j++) {
      const L = this.items[j], cap = this.meshes[j].instanceMatrix.count;
      const nn = Math.round(n * k[j]);
      for (let i = 0; i < nn; i++) {
        if (L.length >= cap) L.shift();
        const a = Math.random() * Math.PI * 2, sp = (1.5 + Math.random() * 3.5) * power;
        L.push({ x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3, z: z + (Math.random() - 0.5) * 0.3, vx: Math.cos(a) * sp, vy: 2 + Math.random() * 4 * power, vz: Math.sin(a) * sp,
          rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, w: (Math.random() - 0.5) * 18, s: (0.03 + Math.random() * 0.07) * (j === 1 ? 0.6 : 1), age: 0, life: 1.4 + Math.random() * 1.4 });
      }
    }
  }
  update(dt) {
    for (let j = 0; j < 3; j++) {
      const L = this.items[j], mesh = this.meshes[j];
      let n = 0;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i]; p.age += dt;
        if (p.age > p.life) { L.splice(i, 1); continue; }
        p.vy -= 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < p.s * 0.4) { p.y = p.s * 0.4; p.vy = Math.abs(p.vy) * 0.3; p.vx *= 0.6; p.vz *= 0.6; p.w *= 0.6; }
        p.rx += p.w * dt; p.rz += p.w * 0.7 * dt;
      }
      for (const p of L) {
        const sc = p.s * Math.min(1, (p.life - p.age) / 0.35);
        _e.set(p.rx, p.ry, p.rz); _q.setFromEuler(_e); _s.set(sc, sc, sc);
        _m.compose(_v.set(p.x, p.y, p.z), _q, _s); mesh.setMatrixAt(n++, _m);
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
    }
  }
  clear() { for (const L of this.items) L.length = 0; for (const m of this.meshes) m.count = 0; }
  dispose() { for (const m of this.meshes) this.scene.remove(m); }
}

// ---------------------------------------------------------------------------------------------- the lease-thread
// a gold thread that whips from a broken claim to her and lashes her body: cause and effect, drawn
class Threads {
  constructor(scene) {
    this.scene = scene; this.list = [];
    this.N = 24;
    this.mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.1, 0.55), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
  }
  add(from, getTo, dur, onArrive) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(this.N * 2 * 3); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const idx = []; for (let i = 0; i < this.N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    const m = new THREE.Mesh(g, this.mat.clone()); m.frustumCulled = false; m.renderOrder = 7;
    this.scene.add(m);
    this.list.push({ m, from: from.clone(), getTo, t: 0, dur, onArrive, arrived: false, seed: Math.random() * 10 });
  }
  update(dt, cam) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const L = this.list[i]; L.t += dt;
      const to = L.getTo();
      const k = Math.min(1, L.t / L.dur);
      if (k >= 1 && !L.arrived) { L.arrived = true; L.onArrive && L.onArrive(to); }
      const fade = L.t < L.dur ? 1 : Math.max(0, 1 - (L.t - L.dur) / 0.38);
      if (fade <= 0) { this.scene.remove(L.m); L.m.geometry.dispose(); L.m.material.dispose(); this.list.splice(i, 1); continue; }
      L.m.material.opacity = fade;
      const P = L.m.geometry.attributes.position.array;
      const dx = to.x - L.from.x, dy = to.y - L.from.y, dz = to.z - L.from.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      // the side vector: across the view
      const vx = cam ? cam.position.x - L.from.x : 0, vy = cam ? cam.position.y - L.from.y : 1, vz = cam ? cam.position.z - L.from.z : 0;
      let sx = dy * vz - dz * vy, sy = dz * vx - dx * vz, sz = dx * vy - dy * vx; const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
      const lash = L.t > L.dur ? Math.sin((L.t - L.dur) * 40) * 0.25 * fade : 0;
      for (let j = 0; j < this.N; j++) {
        const u = j / (this.N - 1);
        const shown = Math.min(u, k);                  // the head travels; the tail stays at the claim
        const wave = Math.sin(shown * 9 + L.seed + L.t * 30) * 0.12 * (1 - shown) * (1 - k * 0.6) + lash * Math.sin(u * Math.PI);
        const arc = Math.sin(shown / Math.max(1e-3, k) * Math.PI) * 0.35 * len * 0.08;
        const x = L.from.x + dx * shown + sx * wave, y = L.from.y + dy * shown + arc + sy * wave, z = L.from.z + dz * shown + sz * wave;
        const w = 0.035 * (0.6 + 0.4 * Math.sin(u * Math.PI)) * (1 + (1 - fade));
        P[j * 6] = x + sx * w; P[j * 6 + 1] = y + sy * w; P[j * 6 + 2] = z + sz * w;
        P[j * 6 + 3] = x - sx * w; P[j * 6 + 4] = y - sy * w; P[j * 6 + 5] = z - sz * w;
      }
      L.m.geometry.attributes.position.needsUpdate = true;
      L.m.geometry.computeBoundingSphere();
    }
  }
  clear() { for (const L of this.list) { this.scene.remove(L.m); L.m.geometry.dispose(); } this.list.length = 0; }
}

// ---------------------------------------------------------------------------------------------- claims
export class Claims {
  // f: the fight; hooks: { onBreak(c), onThread(c, to), onEvict(c), sound(kind, x, o) }
  constructor(f, hooks = {}) {
    this.f = f; this.hooks = hooks;
    this.group = new THREE.Group(); this.group.name = 'claims'; f.scene.add(this.group);
    this.list = []; this.byId = new Map();
    this.shards = new ShardPool(f.scene);
    this.threads = new Threads(f.scene);
    this.rings = new Map();
    const M = mats();
    this.crackW = [crackOnWhite(1), crackOnWhite(2)];
    this.crackMats = new Map();
    // a visible speck that compiles the cracked variant before the first frame of play
    const warm = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), this._cracked(M.glaze, 1)); warm.position.set(0, -40, 0); this.group.add(warm);
  }
  _cracked(base, level) {
    const key = base.uuid + level;
    if (!this.crackMats.has(key)) { const m = base.clone(); m.map = this.crackW[level - 1]; this.crackMats.set(key, m); }
    return this.crackMats.get(key);
  }

  // o: { id, obj, x, z, y, r | box: {hw, hd, rot}, hits, value (design units), solid, under, occupant, oneShot,
  //      onBreak, onHit, wall (wall-mounted: doesn't jitter), noThread, tags }
  add(o) {
    if (o.id && this.byId.has(o.id)) this.remove(o.id);
    const obj = o.obj || new THREE.Group();
    obj.position.x = o.x; obj.position.z = o.z;
    this.group.add(obj);
    const glazed = [];
    obj.traverse((m) => { if (m.isMesh && !m.userData.decal && !m.userData.yours) { m.castShadow = true; m.receiveShadow = true; if (m.material === mats().glaze || m.material === mats().deep) glazed.push({ m, base: m.material }); } });
    const c = { id: o.id || 'c' + Math.random().toString(36).slice(2, 8), kind: o.kind || '', obj, x: o.x, z: o.z, y: o.y ?? 0.6,
      shape: o.box ? { type: 'box', hw: o.box.hw, hd: o.box.hd, rot: o.box.rot || 0 } : { type: 'circle', r: o.r ?? 0.6 },
      hits: o.hits ?? 2, hp: o.hits ?? 2, value: (o.value ?? 2) * U, solid: !!o.solid, alive: true, glazed, under: o.under || null,
      occupant: o.occupant || null, oneShot: !!o.oneShot, onBreak: o.onBreak || null, onHit: o.onHit || null, wall: !!o.wall, noThread: !!o.noThread,
      jit: 0, home: obj.position.clone(), crack: 0, data: o.data || {}, fragile: !!o.fragile, dormant: !!o.dormant };
    if (c.under) c.under.visible = false;
    this.list.push(c); this.byId.set(c.id, c);
    this.hooks.made && this.hooks.made(c);
    return c;
  }
  get(id) { return this.byId.get(id); }
  alive(id) { const c = this.byId.get(id); return !!(c && c.alive); }
  remove(id) { const c = this.byId.get(id); if (!c) return; this.group.remove(c.obj); this.list = this.list.filter((x) => x !== c); this.byId.delete(id); }
  clear(filter = null) { for (const c of [...this.list]) if (!filter || filter(c)) this.remove(c.id); }
  // move a claim (a dropped piece of furniture, a crate sliding)
  place(c, x, z) { c.x = x; c.z = z; c.obj.position.x = x; c.obj.position.z = z; c.home.x = x; c.home.z = z; }

  // closest point of a claim's footprint to (x, z): distance and the point
  _closest(c, x, z) {
    if (c.shape.type === 'circle') { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz); return { d: Math.max(0, d - c.shape.r), px: d > 1e-6 ? c.x + dx / d * c.shape.r : c.x, pz: d > 1e-6 ? c.z + dz / d * c.shape.r : c.z }; }
    const a = c.shape.rot, ca = Math.cos(a), sa = Math.sin(a);
    const lx = (x - c.x) * ca - (z - c.z) * sa, lz = (x - c.x) * sa + (z - c.z) * ca;
    const qx = Math.max(-c.shape.hw, Math.min(c.shape.hw, lx)), qz = Math.max(-c.shape.hd, Math.min(c.shape.hd, lz));
    return { d: Math.hypot(lx - qx, lz - qz), px: c.x + qx * ca + qz * sa, pz: c.z - qx * sa + qz * ca };
  }

  // YOU's strike: everything of hers inside the arc takes a hit (a showstopper counts three)
  strike(x, z, ang, range, arc, s) {
    let any = false;
    for (const c of this.list) {
      if (!c.alive || c.dormant) continue;
      const q = this._closest(c, x, z);
      if (q.d > range * 0.85) continue;
      const a = Math.atan2(q.px - x, q.pz - z);
      if (Math.abs(angDiff(a, ang)) > arc && q.d > 0.8) continue;
      this.hit(c, this.f.spotUntil > 0 ? 3 : 1, { ang, x: q.px, z: q.pz });
      any = true;
    }
    return any;
  }

  // per frame: rings and gold returns against her things; shards; threads
  update(dt) {
    const f = this.f, pl = f.player;
    // rings: a pass (out, the hang, back) hits each claim once; a ring breaks a portrait on its own
    if (pl && pl.rings) for (const r of pl.rings) {
      let st = this.rings.get(r);
      if (!st) { st = { state: r.state, t: r.t, hit: new Set() }; this.rings.set(r, st); }
      if (r.state !== st.state || (r.state === 'out' && r.t < st.t)) { st.hit.clear(); st.state = r.state; }
      st.t = r.t;
      if (r.state === 'hand') continue;
      for (const c of this.list) {
        if (!c.alive || c.dormant || st.hit.has(c)) continue;
        if (this._closest(c, r.pos.x, r.pos.z).d < 0.55) { st.hit.add(c); this.hit(c, c.oneShot ? c.hp : 1, { ang: Math.atan2(c.x - pl.x, c.z - pl.z), x: r.pos.x, z: r.pos.z, ring: true }); }
      }
    }
    // gold returns: spent on the first thing of hers they touch (three hits; a portrait breaks)
    for (const p of f.proj.list) {
      if (p.dead || p.owner === 'boss' || p.owner === 'deco') continue;
      for (const c of this.list) {
        if (!c.alive || c.dormant) continue;
        if (this._closest(c, p.x, p.z).d < p.radius + 0.15) { this.hit(c, c.oneShot ? c.hp : 3, { ang: p.angle, x: p.x, z: p.z, gold: true }); p.dead = true; break; }
      }
    }
    // hit jitter decays
    for (const c of this.list) {
      if (c.jit > 0) { c.jit = Math.max(0, c.jit - dt); const k = c.jit / 0.12; c.obj.position.x = c.home.x + Math.sin(c.jit * 140) * 0.05 * k * Math.cos(c.jitA); c.obj.position.z = c.home.z + Math.sin(c.jit * 140) * 0.05 * k * Math.sin(c.jitA); }
    }
    this.shards.update(dt);
    this.threads.update(dt, f.cam && f.cam.cam);
  }

  hit(c, n = 1, o = {}) {
    if (!c.alive) return;
    const f = this.f;
    if (c.fragile) n = c.hp;
    c.hp -= n;
    c.onHit && c.onHit(c, o);
    const lilac = new THREE.Color(2.4, 1.0, 3.0);
    f.fx.chips(o.x ?? c.x, c.y, o.z ?? c.z, lilac, 9, o.ang);
    f.fx.sparks(o.x ?? c.x, c.y, o.z ?? c.z, new THREE.Color(3.2, 2.2, 1.0), 6, o.ang);
    if (!c.wall) { c.jit = 0.12; c.jitA = Math.atan2(Math.cos(o.ang || 0), Math.sin(o.ang || 0)); }
    if (c.hp <= 0) { this.break(c, o); return; }
    // the glaze cracks: a tink, then a crackle
    const lvl = c.hp / c.hits < 0.5 ? 2 : 1;
    if (lvl !== c.crack) { c.crack = lvl; for (const g of c.glazed) g.m.material = this._cracked(g.base, lvl); }
    this.hooks.sound && this.hooks.sound(c.hits - c.hp <= 1 ? 'tink' : 'crackle', c.x, { c });
    f._good && f._good(15);
  }

  break(c, o = {}) {
    if (!c.alive) return;
    const f = this.f;
    c.alive = false;
    if (c.under) { c.under.visible = true; c.obj.traverse((m) => { if (m.isMesh && !m.userData.yours) m.visible = false; }); }
    else c.obj.visible = false;
    c.obj.position.copy(c.home);
    this.shards.burst(c.x, c.y, c.z, 30 + Math.min(40, c.value / U * 4), 1);
    f.fx.chips(c.x, c.y, c.z, new THREE.Color(2.6, 1.1, 3.2), 30);
    f.fx.glitter(c.x, c.y + 0.2, c.z, new THREE.Color(3.4, 2.3, 0.7), 22, 1.0);
    f.cam.shake(0.35, 0.12);
    this.hooks.sound && this.hooks.sound('burst', c.x, { c });
    f._good && f._good(90);
    c.onBreak && c.onBreak(c, o);
    this.hooks.onBreak && this.hooks.onBreak(c, o);
    if (!c.noThread) this.thread(c);
  }

  // the gold thread from a broken claim to her: when it lands, her bar drops and she flinches for real
  thread(c) {
    const f = this.f, b = f.boss;
    if (!b) return;
    const from = new THREE.Vector3(c.x, c.y, c.z);
    const to = () => { const p = b.root.position; return _v2.set(p.x, 1.55, p.z); };
    const d = from.distanceTo(to());
    this.hooks.sound && this.hooks.sound('thread', c.x, { c, toX: b.x });
    this.threads.add(from, to, Math.min(0.22, 0.06 + d * 0.012), (at) => { this.hooks.onThread && this.hooks.onThread(c, at.clone(), from); });
  }

  // movement: solid claims push circles out
  resolve(x, z, r) {
    for (const c of this.list) {
      if (!c.alive || !c.solid || c.dormant) continue;
      if (c.shape.type === 'circle') {
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.shape.r + r;
        if (d < m && d > 1e-5) { x = c.x + dx / d * m; z = c.z + dz / d * m; }
      } else {
        const a = c.shape.rot, ca = Math.cos(a), sa = Math.sin(a);
        let lx = (x - c.x) * ca - (z - c.z) * sa, lz = (x - c.x) * sa + (z - c.z) * ca;
        const hw = c.shape.hw + r, hd = c.shape.hd + r;
        if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
          if (hw - Math.abs(lx) < hd - Math.abs(lz)) lx = Math.sign(lx || 1) * hw; else lz = Math.sign(lz || 1) * hd;
          x = c.x + lx * ca + lz * sa; z = c.z - lx * sa + lz * ca;
        }
      }
    }
    return { x, z };
  }
  // is a point inside any solid claim (for placing things)
  blocked(x, z, r = 0.3) { for (const c of this.list) if (c.alive && c.solid && this._closest(c, x, z).d < r) return true; return false; }

  snapshot() { const o = {}; for (const c of this.list) o[c.id] = c.alive ? c.hp : 0; return o; }
  // put claims back as a snapshot had them (missing ids: as new)
  restore(snap) {
    for (const c of this.list) {
      const hp = snap ? snap[c.id] : undefined;
      if (hp === undefined) continue;
      if (hp <= 0) { c.alive = false; if (c.under) { c.under.visible = true; c.obj.traverse((m) => { if (m.isMesh && !m.userData.yours) m.visible = false; }); } else c.obj.visible = false; }
      else { c.hp = hp; const lvl = hp < c.hits ? (hp / c.hits < 0.5 ? 2 : 1) : 0; c.crack = lvl; for (const g of c.glazed) g.m.material = lvl ? this._cracked(g.base, lvl) : g.base; }
    }
  }
  clearFx() { this.shards.clear(); this.threads.clear(); }
  dispose() { this.f.scene.remove(this.group); this.shards.dispose(); this.threads.clear(); }
}
